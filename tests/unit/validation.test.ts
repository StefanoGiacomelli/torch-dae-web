import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { assertValid, createCanonicalValidators } from '../../src/data/ingest/validation';

const validators = createCanonicalValidators(resolve('tests/fixtures/schemas'));

describe('canonical schema validation', () => {
  it('accepts a valid fixture', () => {
    expect(() => assertValid(validators.modelCard, { card_id: 'model-a' }, 'Model Card', 'fixture.json')).not.toThrow();
  });

  it('fails loudly with path and schema error', () => {
    expect(() => assertValid(validators.technicalCard, { identity: {} }, 'Technical Card', 'broken.json'))
      .toThrow(/broken\.json.*technical_card_id/);
  });
});
