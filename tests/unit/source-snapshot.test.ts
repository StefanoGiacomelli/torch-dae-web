import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveGithubSource, resolveLocalSource, type SourceLock } from '../../src/data/ingest/source';
import { parseSourceOptions } from '../../src/data/ingest/cli';

const temporaryRoots: string[] = [];

function git(root: string, args: string[]): string {
  return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim();
}

function fixtureRepository() {
  const root = mkdtempSync(join(tmpdir(), 'torch-dae-source-fixture-'));
  temporaryRoots.push(root);
  const repository = join(root, 'source');
  const project = join(root, 'web');
  mkdirSync(repository);
  mkdirSync(project);
  git(repository, ['init', '-q']);
  git(repository, ['config', 'user.name', 'Fixture']);
  git(repository, ['config', 'user.email', 'fixture@example.test']);
  writeFileSync(join(repository, 'catalogue.txt'), 'release\n');
  git(repository, ['add', 'catalogue.txt']);
  git(repository, ['commit', '-q', '-m', 'release']);
  const releaseCommit = git(repository, ['rev-parse', 'HEAD']);
  git(repository, ['tag', 'v1.0.0', releaseCommit]);
  const lock: SourceLock = { repository: 'fixture/source', ref: 'v1.0.0', resolvedCommitSha: releaseCommit };
  return { root, repository, project, releaseCommit, lock };
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('immutable GitHub-style source snapshots', () => {
  it('uses the clone only as an object cache and excludes its dirty working tree', () => {
    const fixture = fixtureRepository();
    const first = resolveGithubSource(
      fixture.project,
      fixture.lock,
      fixture.lock.ref,
      fixture.repository,
    );
    const cacheRoot = join(fixture.project, '.cache', 'torch-dae-v1.0.0');

    expect(first.resolvedCommitSha).toBe(fixture.releaseCommit);
    expect(first.root).toBe(join(fixture.project, '.cache', 'torch-dae-snapshots', fixture.releaseCommit));
    expect(first.root).not.toBe(cacheRoot);
    expect(readFileSync(join(first.root, 'catalogue.txt'), 'utf8')).toBe('release\n');

    writeFileSync(join(cacheRoot, 'catalogue.txt'), 'dirty cached clone\n');
    rmSync(first.root, { recursive: true, force: true });
    const second = resolveGithubSource(
      fixture.project,
      fixture.lock,
      fixture.lock.ref,
      fixture.repository,
    );

    expect(git(cacheRoot, ['rev-parse', 'HEAD'])).toBe(fixture.releaseCommit);
    expect(git(cacheRoot, ['status', '--porcelain=v1'])).toContain('catalogue.txt');
    expect(second.root).toBe(join(fixture.project, '.cache', 'torch-dae-snapshots', fixture.releaseCommit));
    expect(readFileSync(join(second.root, 'catalogue.txt'), 'utf8')).toBe('release\n');
  });

  it('rejects a cloned ref whose resolved SHA differs from the release lock', () => {
    const fixture = fixtureRepository();
    const mismatchedLock = { ...fixture.lock, resolvedCommitSha: '0'.repeat(40) };

    expect(() =>
      resolveGithubSource(fixture.project, mismatchedLock, mismatchedLock.ref, fixture.repository),
    ).toThrow(/resolved to .* expected locked/);
  });
});

describe('immutable local source snapshots', () => {
  it('ignores uncommitted working-tree modifications without mutating the source repository', () => {
    const fixture = fixtureRepository();
    writeFileSync(join(fixture.repository, 'catalogue.txt'), 'dirty working tree\n');
    const statusBefore = git(fixture.repository, ['status', '--porcelain=v1']);
    const refsBefore = git(fixture.repository, ['show-ref', '--heads']);

    const source = resolveLocalSource(fixture.project, fixture.lock, fixture.repository);

    expect(source.resolvedCommitSha).toBe(fixture.releaseCommit);
    expect(readFileSync(join(source.root, 'catalogue.txt'), 'utf8')).toBe('release\n');
    expect(git(fixture.repository, ['status', '--porcelain=v1'])).toBe(statusBefore);
    expect(git(fixture.repository, ['show-ref', '--heads'])).toBe(refsBefore);
  });

  it('consumes the locked earlier commit while source HEAD is on a later commit', () => {
    const fixture = fixtureRepository();
    writeFileSync(join(fixture.repository, 'catalogue.txt'), 'later\n');
    git(fixture.repository, ['add', 'catalogue.txt']);
    git(fixture.repository, ['commit', '-q', '-m', 'later']);
    const laterHead = git(fixture.repository, ['rev-parse', 'HEAD']);

    const source = resolveLocalSource(fixture.project, fixture.lock, fixture.repository);

    expect(laterHead).not.toBe(fixture.releaseCommit);
    expect(git(fixture.repository, ['rev-parse', 'HEAD'])).toBe(laterHead);
    expect(source.resolvedCommitSha).toBe(fixture.releaseCommit);
    expect(readFileSync(join(source.root, 'catalogue.txt'), 'utf8')).toBe('release\n');
  });

  it('fails clearly when the requested local commit object does not exist', () => {
    const fixture = fixtureRepository();
    const missing = { ...fixture.lock, resolvedCommitSha: '0'.repeat(40) };
    expect(() => resolveLocalSource(fixture.project, missing, fixture.repository, 'missing-ref')).toThrow(
      /TORCH_DAE_SOURCE=github.*will not fetch or mutate/,
    );
  });
});

describe('production source CLI', () => {
  it('accepts an explicit ref and source without relying on a developer path', () => {
    expect(parseSourceOptions(['--source', 'github', '--ref', 'v0.2.0'])).toEqual({
      mode: 'github',
      requestedRef: 'v0.2.0',
    });
  });

  it('rejects unknown and incomplete source arguments', () => {
    expect(() => parseSourceOptions(['--ref'])).toThrow(/Unknown or incomplete/);
    expect(() => parseSourceOptions(['--source', 'fixture'])).toThrow(/Unknown or incomplete/);
  });

  it('requires an explicit path for local mode', () => {
    const fixture = fixtureRepository();
    expect(() => resolveLocalSource(fixture.project, fixture.lock, '')).toThrow(/requires TORCH_DAE_REPO_PATH/);
  });
});
