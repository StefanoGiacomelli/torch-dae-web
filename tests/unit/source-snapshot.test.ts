import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveLocalSource, type SourceLock } from '../../src/data/ingest/source';

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
  const lock: SourceLock = { repository: 'fixture/source', ref: 'v1.0.0', resolvedCommitSha: releaseCommit };
  return { root, repository, project, releaseCommit, lock };
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
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
    expect(() => resolveLocalSource(fixture.project, missing, fixture.repository)).toThrow(
      /TORCH_DAE_SOURCE=github.*will not fetch or mutate/,
    );
  });
});
