import { describe, expect, it } from 'vitest';
import { normalizeCatalogue } from '../../src/data/normalize/normalize';
import { getReferenceRuntimeContext } from '../../src/data/derive/referenceContext';
import { getModelWaveformVisual } from '../../src/data/derive/modelVisual';
import { buildRepositoryFileUrl, buildRepositoryRawUrl, formatSourceIdentity } from '../../src/data/derive/provenance';
import { formatEnergyJoules } from '../../src/data/derive/format';
import { getEvidencedVerificationBackends } from '../../src/data/derive/verification';
import { createFixtureTechnicalCard, fixtureModels } from '../fixtures/catalogue-fixture';

const metadata = {
  sourceRepository: 'fixture/repository',
  sourceMode: 'local' as const,
  requestedRef: 'v-test',
  resolvedCommitSha: 'abc123',
  generatedAt: '2026-01-01T00:00:00Z',
  modelCount: 1,
  technicalCardCount: 1,
  schemaVersions: { modelCards: ['1.0.0'], technicalCards: ['1.0.0'] },
  licenseIdentifier: 'Apache-2.0',
};

describe('getReferenceRuntimeContext', () => {
  it('selects the unambiguous CPU native_default canonical condition', () => {
    const cards = [
      { card: createFixtureTechnicalCard('tc-native', 'model-a', 'native_default'), path: 'technical_cards/model-a/tc-native.json' },
      { card: createFixtureTechnicalCard('tc-single', 'model-a', 'single_thread'), path: 'technical_cards/model-a/tc-single.json' },
    ];
    const catalogue = normalizeCatalogue([fixtureModels[0]!], cards, metadata);
    const reference = getReferenceRuntimeContext(catalogue.models[0]!, catalogue);
    expect(reference?.technicalCard.id).toBe('tc-native');
    expect(reference?.condition.batchSize).toBe(1);
  });

  it('returns null when no unambiguous native_default CPU context exists', () => {
    const cards = [
      { card: createFixtureTechnicalCard('tc-single-a', 'model-a', 'single_thread'), path: 'technical_cards/model-a/tc-single-a.json' },
    ];
    const catalogue = normalizeCatalogue([fixtureModels[0]!], cards, metadata);
    expect(getReferenceRuntimeContext(catalogue.models[0]!, catalogue)).toBeNull();
  });

  it('returns null when two candidate CPU native_default cards exist (ambiguous)', () => {
    const cards = [
      { card: createFixtureTechnicalCard('tc-native-1', 'model-a', 'native_default'), path: 'technical_cards/model-a/tc-native-1.json' },
      { card: createFixtureTechnicalCard('tc-native-2', 'model-a', 'native_default'), path: 'technical_cards/model-a/tc-native-2.json' },
    ];
    const catalogue = normalizeCatalogue([fixtureModels[0]!], cards, metadata);
    expect(getReferenceRuntimeContext(catalogue.models[0]!, catalogue)).toBeNull();
  });
});

describe('getModelWaveformVisual', () => {
  it('is deterministic for the same model id', () => {
    const first = getModelWaveformVisual('panns-cnn14-16k-map-0438', 'PANNs');
    const second = getModelWaveformVisual('panns-cnn14-16k-map-0438', 'PANNs');
    expect(first).toEqual(second);
  });

  it('differs across model ids', () => {
    const a = getModelWaveformVisual('model-a', 'PANNs');
    const b = getModelWaveformVisual('model-b', 'PANNs');
    expect(a.bars).not.toEqual(b.bars);
  });

  it('keeps every bar within the normalized range', () => {
    const { bars } = getModelWaveformVisual('model-a', 'PANNs');
    for (const bar of bars) {
      expect(bar).toBeGreaterThanOrEqual(0.08);
      expect(bar).toBeLessThanOrEqual(1);
    }
  });
});

describe('provenance link builders', () => {
  it('builds a commit-pinned blob URL', () => {
    expect(buildRepositoryFileUrl(metadata, 'model_cards/fixtures/model-a.json')).toBe(
      'https://github.com/fixture/repository/blob/abc123/model_cards/fixtures/model-a.json',
    );
  });

  it('builds a commit-pinned raw URL', () => {
    expect(buildRepositoryRawUrl(metadata, 'evidence/tc-a1.npz')).toBe(
      'https://raw.githubusercontent.com/fixture/repository/abc123/evidence/tc-a1.npz',
    );
  });

  it('returns null for a missing path rather than fabricating a link', () => {
    expect(buildRepositoryFileUrl(metadata, undefined)).toBeNull();
    expect(buildRepositoryRawUrl(metadata, null)).toBeNull();
  });
});

describe('formatSourceIdentity', () => {
  it('renders a GitHub file source as a short "owner/repo · path" label, not a raw URL', () => {
    const identity = formatSourceIdentity({
      id: 'implementation',
      kind: 'repository',
      url: 'https://github.com/qiuqiangkong/audioset_tagging_cnn',
      package: null,
      revision: '58d0e624a2055fb1f2b5fb06369ecd726cfe64e0',
      path: 'pytorch/models.py',
      evidenceStatus: 'officially_reported',
    });
    expect(identity).toEqual({
      label: 'qiuqiangkong/audioset_tagging_cnn · pytorch/models.py',
      href: 'https://github.com/qiuqiangkong/audioset_tagging_cnn/blob/58d0e624a2055fb1f2b5fb06369ecd726cfe64e0/pytorch/models.py',
    });
  });

  it('renders a GitHub repository source without a path as "owner/repo @ shortsha"', () => {
    const identity = formatSourceIdentity({
      id: 'official-repository',
      kind: 'repository',
      url: 'https://github.com/qiuqiangkong/audioset_tagging_cnn',
      package: null,
      revision: '58d0e624a2055fb1f2b5fb06369ecd726cfe64e0',
      path: null,
      evidenceStatus: 'officially_reported',
    });
    expect(identity).toEqual({
      label: 'qiuqiangkong/audioset_tagging_cnn @ 58d0e62',
      href: 'https://github.com/qiuqiangkong/audioset_tagging_cnn/tree/58d0e624a2055fb1f2b5fb06369ecd726cfe64e0',
    });
  });

  it('returns null rather than a raw URL when the source has no url', () => {
    expect(
      formatSourceIdentity({
        id: 'wrapper',
        kind: 'local',
        url: null,
        package: null,
        revision: null,
        path: 'src/torch_dae/models/panns/model.py',
        evidenceStatus: 'observed',
      }),
    ).toBeNull();
  });
});

describe('formatEnergyJoules', () => {
  it('renders sub-kilojoule totals in joules', () => {
    expect(formatEnergyJoules(0.0001)).toBe('360.0 J');
  });

  it('renders larger totals in kilojoules', () => {
    expect(formatEnergyJoules(0.001)).toBe('3.60 kJ');
  });
});

describe('getEvidencedVerificationBackends', () => {
  it('keeps a self-declared locally-verified backend when a successful Technical Card evidences it', () => {
    const cards = [{ card: createFixtureTechnicalCard('tc-cpu', 'model-a', 'native_default'), path: 'technical_cards/model-a/tc-cpu.json' }];
    const catalogue = normalizeCatalogue([fixtureModels[0]!], cards, metadata);
    const evidenced = getEvidencedVerificationBackends(catalogue.models[0]!, catalogue);
    expect(evidenced).toContainEqual({ backend: 'cpu', status: 'locally_verified' });
  });

  it('downgrades a self-declared locally-verified backend to upstream-declared when no Technical Card evidences it', () => {
    const modelWithMpsClaim = structuredClone(fixtureModels[0]!);
    modelWithMpsClaim.card.device_support.locally_tested = ['cpu', 'mps'];
    const cards = [{ card: createFixtureTechnicalCard('tc-cpu', 'model-a', 'native_default'), path: 'technical_cards/model-a/tc-cpu.json' }];
    const catalogue = normalizeCatalogue([modelWithMpsClaim], cards, metadata);

    // Sanity check: the Model Card itself claims mps was locally tested.
    expect(catalogue.models[0]!.verificationBackends).toContainEqual({ backend: 'mps', status: 'locally_verified' });

    const evidenced = getEvidencedVerificationBackends(catalogue.models[0]!, catalogue);
    expect(evidenced).toContainEqual({ backend: 'mps', status: 'upstream_declared' });
    expect(evidenced).toContainEqual({ backend: 'cpu', status: 'locally_verified' });
  });

  it('never upgrades a backend the Model Card did not claim was locally tested', () => {
    const cards = [{ card: createFixtureTechnicalCard('tc-cpu', 'model-a', 'native_default'), path: 'technical_cards/model-a/tc-cpu.json' }];
    const catalogue = normalizeCatalogue([fixtureModels[0]!], cards, metadata);
    const evidenced = getEvidencedVerificationBackends(catalogue.models[0]!, catalogue);
    // The fixture model declares cuda as upstream-only; no amount of Technical Card evidence for
    // other backends should promote it.
    expect(evidenced).toContainEqual({ backend: 'cuda', status: 'upstream_declared' });
  });

  it('matches the real canonical v0.2.0 catalogue rendering (regression guard)', async () => {
    const catalogue = (await import('../../src/generated/catalogue.json')).default as import(
      '../../src/data/types/catalogue'
    ).CatalogueIndex;
    for (const model of catalogue.models) {
      const evidenced = getEvidencedVerificationBackends(model, catalogue);
      expect(evidenced).toEqual(model.verificationBackends);
    }
  });
});
