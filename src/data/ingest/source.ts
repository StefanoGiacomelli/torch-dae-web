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
  repositoryPath = process.env.TORCH_DAE_REPO_PATH ?? '/Users/stefano/Documents/torch-dae',
  requestedRef = process.env.TORCH_DAE_REF ?? lock.ref,
): ResolvedSource {
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

function resolveGithub(projectRoot: string, lock: SourceLock): ResolvedSource {
  const requestedRef = process.env.TORCH_DAE_REF ?? lock.ref;
  const cacheRoot = resolve(projectRoot, '.cache', `torch-dae-${requestedRef.replaceAll('/', '-')}`);
  mkdirSync(resolve(projectRoot, '.cache'), { recursive: true });
  if (!existsSync(cacheRoot)) {
    git([
      'clone',
      '--depth',
      '1',
      '--branch',
      requestedRef,
      `https://github.com/${lock.repository}.git`,
      cacheRoot,
    ]);
  }
  const resolvedCommitSha = git(['rev-parse', 'HEAD'], cacheRoot);
  if (requestedRef === lock.ref && resolvedCommitSha !== lock.resolvedCommitSha) {
    throw new Error(
      `GitHub ${requestedRef} resolved to ${resolvedCommitSha}, expected locked ${lock.resolvedCommitSha}.`,
    );
  }
  return {
    root: cacheRoot,
    mode: 'github',
    repository: lock.repository,
    requestedRef,
    resolvedCommitSha,
  };
}

export function resolveSource(projectRoot: string): ResolvedSource {
  const lock = loadSourceLock(projectRoot);
  const mode = process.env.TORCH_DAE_SOURCE ?? 'local';
  if (mode === 'local') return resolveLocalSource(projectRoot, lock);
  if (mode === 'github') return resolveGithub(projectRoot, lock);
  throw new Error(`Unsupported TORCH_DAE_SOURCE=${mode}; expected local or github.`);
}
