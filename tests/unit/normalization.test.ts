import { describe, expect, it } from 'vitest';
import { normalizeCatalogue } from '../../src/data/normalize/normalize';
import {
  createFixtureTechnicalCard,
  fixtureModels,
  fixtureTechnicalCards,
} from '../fixtures/catalogue-fixture';

const metadata = {
  sourceRepository: 'fixture/repository',
  sourceMode: 'local' as const,
  requestedRef: 'v-test',
  resolvedCommitSha: 'abc123',
  generatedAt: '2026-01-01T00:00:00Z',
  licenseIdentifier: 'Apache-2.0',
};

describe('normalizeCatalogue', () => {
  it('creates deterministic one-to-many joins and preserves contexts', () => {
    const catalogue = normalizeCatalogue(fixtureModels, fixtureTechnicalCards, metadata);
    expect(catalogue.metadata).toMatchObject({ modelCount: 2, technicalCardCount: 3 });
    expect(catalogue.models[0]?.technicalCardIds).toEqual(['tc-a1', 'tc-a2']);
    expect(catalogue.technicalCards.map((card) => card.context.executionContextFingerprint)).toEqual([
      'context-a', 'context-b', 'context-a',
    ]);
  });

  it('keeps missing energy distinct from zero', () => {
    const catalogue = normalizeCatalogue(fixtureModels, fixtureTechnicalCards, metadata);
    const partial = catalogue.technicalCards.find((card) => card.id === 'tc-a2');
    expect(partial?.energy.availability).toBe('partial');
    expect(partial?.energy.measurementKind).toBe('hardware_measured');
    expect(partial?.energy.totalEnergyKwh).toBeNull();
  });

  it('preserves unavailable and software-estimated energy semantics independently', () => {
    const cards = [
      { card: createFixtureTechnicalCard('tc-unavailable', 'model-a', 'context-a', { kind: 'unavailable' }), path: 'technical_cards/model-a/tc-unavailable.json' },
      { card: createFixtureTechnicalCard('tc-estimated', 'model-a', 'context-b', { kind: 'software_estimated' }), path: 'technical_cards/model-a/tc-estimated.json' },
    ];
    const catalogue = normalizeCatalogue([fixtureModels[0]!], cards, metadata);
    expect(catalogue.technicalCards.find((card) => card.id === 'tc-unavailable')?.energy).toMatchObject({
      measurementKind: 'unavailable', availability: 'unavailable', totalEnergyKwh: null,
    });
    expect(catalogue.technicalCards.find((card) => card.id === 'tc-estimated')?.energy).toMatchObject({
      measurementKind: 'software_estimated', availability: 'complete', totalEnergyKwh: 0.002,
    });
  });

  it('preserves accelerator memory surface identity', () => {
    const cuda = createFixtureTechnicalCard('tc-cuda', 'model-a', 'context-a');
    cuda.accelerator_memory = {
      backend: 'cuda', cuda_peak_allocated_bytes: 512, cuda_current_allocated_bytes: 256,
    };
    const mps = createFixtureTechnicalCard('tc-mps', 'model-a', 'context-b');
    mps.accelerator_memory = {
      backend: 'mps', mps_current_allocated_bytes: 384, mps_driver_allocated_bytes: 768,
      unified_memory_note: 'Unified memory surfaces are not summed.',
    };
    const catalogue = normalizeCatalogue([fixtureModels[0]!], [
      { card: cuda, path: 'technical_cards/model-a/tc-cuda.json' },
      { card: mps, path: 'technical_cards/model-a/tc-mps.json' },
    ], metadata);
    expect(catalogue.technicalCards[0]?.memory.accelerator?.observations).toEqual([
      { kind: 'cuda_current_allocated', bytes: 256 },
      { kind: 'cuda_peak_allocated', bytes: 512 },
    ]);
    expect(catalogue.technicalCards[1]?.memory.accelerator?.observations).toEqual([
      { kind: 'mps_current_allocated', bytes: 384 },
      { kind: 'mps_driver_allocated', bytes: 768 },
    ]);
  });

  it('allows a valid Model Card with zero linked Technical Cards', () => {
    const catalogue = normalizeCatalogue([fixtureModels[0]!], [], metadata);
    expect(catalogue.models[0]?.technicalCardIds).toEqual([]);
    expect(catalogue.metadata.technicalCardCount).toBe(0);
  });

  it('rejects a Technical Card that references an unknown model', () => {
    const broken = structuredClone(fixtureTechnicalCards);
    if (broken[0]) broken[0].card.model.model_card_id = 'missing-model';
    expect(() => normalizeCatalogue(fixtureModels, broken, metadata)).toThrow(/unknown model/);
  });

  it('rejects duplicate canonical IDs', () => {
    expect(() => normalizeCatalogue([...fixtureModels, fixtureModels[0]!], fixtureTechnicalCards, metadata)).toThrow(/Duplicate Model Card ID/);
  });
});
