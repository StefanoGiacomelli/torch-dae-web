import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';

export interface SourceLock {
  repository: string;
  ref: string;
  resolvedCommitSha: string;
}

export interface ResolvedSource {
  root: string;
  mode: 'local' | 'github';
  repository: string;
  requestedRef: string;
  resolvedCommitSha: string;
}

export interface SourceOptions {
  mode?: 'local' | 'github';
  repositoryPath?: string;
  requestedRef?: string;
}

function git(args: string[], cwd?: string): string {
  return execFileSync('git', cwd ? ['-C', cwd, ...args] : args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

export function loadSourceLock(projectRoot: string): SourceLock {
  return JSON.parse(readFileSync(resolve(projectRoot, 'catalogue-source.json'), 'utf8')) as SourceLock;
}

function gitObjectExists(repositoryRoot: string, commit: string): boolean {
  try {
    git(['cat-file', '-e', `${commit}^{commit}`], repositoryRoot);
    return true;
  } catch {
    return false;
  }
}

function resolveLocalCommit(repositoryRoot: string, lock: SourceLock, requestedRef: string): string {
  let resolvedCommitSha: string | null = null;
  try {
    resolvedCommitSha = git(['rev-parse', '--verify', `${requestedRef}^{commit}`], repositoryRoot);
  } catch {
    if (requestedRef === lock.ref && gitObjectExists(repositoryRoot, lock.resolvedCommitSha)) {
      resolvedCommitSha = git(['rev-parse', '--verify', `${lock.resolvedCommitSha}^{commit}`], repositoryRoot);
    }
  }
  if (!resolvedCommitSha) {
    throw new Error(
      `Local Git object for ${requestedRef} is unavailable in ${repositoryRoot}. Use TORCH_DAE_SOURCE=github or provide a read-only clone containing that ref; this sync will not fetch or mutate the source repository.`,
    );
  }
  if (requestedRef === lock.ref && resolvedCommitSha !== lock.resolvedCommitSha) {
    throw new Error(
      `Resolved ${requestedRef} to ${resolvedCommitSha}, but catalogue-source.json locks ${lock.resolvedCommitSha}.`,
    );
  }
  return resolvedCommitSha;
}

function materializeSnapshot(projectRoot: string, repositoryRoot: string, commit: string): string {
  const snapshotsRoot = resolve(projectRoot, '.cache', 'torch-dae-snapshots');
  const snapshotRoot = join(snapshotsRoot, commit);
  const markerPath = join(snapshotRoot, '.torch-dae-snapshot.json');
  if (existsSync(markerPath)) {
    const marker = JSON.parse(readFileSync(markerPath, 'utf8')) as { commit?: string };
    if (marker.commit !== commit) throw new Error(`Invalid immutable snapshot marker at ${markerPath}.`);
    return snapshotRoot;
  }

  mkdirSync(snapshotsRoot, { recursive: true });
  const temporaryRoot = mkdtempSync(join(snapshotsRoot, `${commit}.tmp-`));
  const archivePath = join(temporaryRoot, 'snapshot.tar');
  const extractedRoot = join(temporaryRoot, 'tree');
  mkdirSync(extractedRoot);
  try {
    execFileSync('git', ['-C', repositoryRoot, 'archive', '--format=tar', '-o', archivePath, commit], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    execFileSync('tar', ['-xf', archivePath, '-C', extractedRoot], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    unlinkSync(archivePath);
    writeFileSync(
      join(extractedRoot, '.torch-dae-snapshot.json'),
      `${JSON.stringify({ commit, materialization: 'git-archive' }, null, 2)}\n`,
    );
    renameSync(extractedRoot, snapshotRoot);
    rmSync(temporaryRoot, { recursive: true });
  } catch (error) {
    rmSync(temporaryRoot, { recursive: true, force: true });
    throw new Error(`Failed to materialize immutable Git snapshot ${commit}: ${String(error)}`);
  }
  return snapshotRoot;
}

export function resolveLocalSource(
  projectRoot: string,
  lock: SourceLock,
  repositoryPath = process.env.TORCH_DAE_REPO_PATH,
  requestedRef = process.env.TORCH_DAE_REF ?? lock.ref,
): ResolvedSource {
  if (!repositoryPath) {
    throw new Error('Local source mode requires TORCH_DAE_REPO_PATH or --repo-path.');
  }
  const repositoryRoot = resolve(repositoryPath);
  if (!existsSync(repositoryRoot)) {
    throw new Error(
      `Canonical local checkout not found at ${repositoryRoot}. Set TORCH_DAE_REPO_PATH or TORCH_DAE_SOURCE=github.`,
    );
  }
  const resolvedCommitSha = resolveLocalCommit(repositoryRoot, lock, requestedRef);
  const root = materializeSnapshot(projectRoot, repositoryRoot, resolvedCommitSha);
  return { root, mode: 'local', repository: lock.repository, requestedRef, resolvedCommitSha };
}

export function resolveGithubSource(
  projectRoot: string,
  lock: SourceLock,
  requestedRef = process.env.TORCH_DAE_REF ?? lock.ref,
  repositoryUrl = `https://github.com/${lock.repository}.git`,
): ResolvedSource {
  const cacheParent = resolve(projectRoot, '.cache');
  const cacheKey = requestedRef.replaceAll(/[^a-zA-Z0-9._-]/g, '-');
  const cacheRoot = resolve(cacheParent, `torch-dae-${cacheKey}`);
  mkdirSync(cacheParent, { recursive: true });
  if (existsSync(cacheRoot)) {
    try {
      git(['rev-parse', '--is-inside-work-tree'], cacheRoot);
    } catch {
      rmSync(cacheRoot, { recursive: true, force: true });
    }
  }
  if (!existsSync(cacheRoot)) {
    const temporaryRoot = mkdtempSync(join(cacheParent, `torch-dae-${cacheKey}.tmp-`));
    try {
      git([
        'clone',
        '--depth',
        '1',
        '--branch',
        requestedRef,
        repositoryUrl,
        temporaryRoot,
      ]);
      renameSync(temporaryRoot, cacheRoot);
    } catch (error) {
      rmSync(temporaryRoot, { recursive: true, force: true });
      throw new Error(`Failed to obtain GitHub release ${lock.repository}@${requestedRef}: ${String(error)}`);
    }
  }
  const resolvedCommitSha = git(['rev-parse', 'HEAD'], cacheRoot);
  if (requestedRef === lock.ref && resolvedCommitSha !== lock.resolvedCommitSha) {
    throw new Error(
      `GitHub ${requestedRef} resolved to ${resolvedCommitSha}, expected locked ${lock.resolvedCommitSha}.`,
    );
  }
  const root = materializeSnapshot(projectRoot, cacheRoot, resolvedCommitSha);
  return {
    root,
    mode: 'github',
    repository: lock.repository,
    requestedRef,
    resolvedCommitSha,
  };
}

export function resolveSource(projectRoot: string, options: SourceOptions = {}): ResolvedSource {
  const lock = loadSourceLock(projectRoot);
  const mode = options.mode ?? process.env.TORCH_DAE_SOURCE ?? 'github';
  const requestedRef = options.requestedRef ?? process.env.TORCH_DAE_REF ?? lock.ref;
  if (mode === 'local') {
    return resolveLocalSource(
      projectRoot,
      lock,
      options.repositoryPath ?? process.env.TORCH_DAE_REPO_PATH,
      requestedRef,
    );
  }
  if (mode === 'github') return resolveGithubSource(projectRoot, lock, requestedRef);
  throw new Error(`Unsupported TORCH_DAE_SOURCE=${mode}; expected local or github.`);
}
