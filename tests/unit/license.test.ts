import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { readLicenseIdentifier } from '../../src/data/ingest/pipeline';

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function fixtureRoot(pyprojectContents: string | null): string {
  const root = mkdtempSync(join(tmpdir(), 'torch-dae-license-fixture-'));
  temporaryRoots.push(root);
  if (pyprojectContents !== null) {
    writeFileSync(join(root, 'pyproject.toml'), pyprojectContents);
  }
  return root;
}

describe('readLicenseIdentifier', () => {
  it('reads the SPDX identifier from a PEP 621 license field', () => {
    const root = fixtureRoot('[project]\nname = "fixture"\nlicense = "Apache-2.0"\n');
    expect(readLicenseIdentifier(root)).toBe('Apache-2.0');
  });

  it('returns null rather than guessing when pyproject.toml is absent', () => {
    const root = fixtureRoot(null);
    expect(readLicenseIdentifier(root)).toBeNull();
  });

  it('returns null rather than guessing when no license field is present', () => {
    const root = fixtureRoot('[project]\nname = "fixture"\n');
    expect(readLicenseIdentifier(root)).toBeNull();
  });

  it('matches the synced canonical catalogue (regression guard against wrong footer copy)', async () => {
    // torch-dae's own pyproject.toml declares Apache-2.0, not MIT. The generated catalogue is
    // produced by `npm run sync:data` from the real canonical source, so asserting against it here
    // (rather than a hand-picked string) guards the footer against ever silently reverting to an
    // incorrect or guessed license.
    const catalogue = (await import('../../src/generated/catalogue.json')).default as {
      metadata: { licenseIdentifier: string | null };
    };
    expect(catalogue.metadata.licenseIdentifier).toBe('Apache-2.0');
    expect(catalogue.metadata.licenseIdentifier).not.toBe('MIT');
  });
});
