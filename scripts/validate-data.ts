import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCatalogue } from '../src/data/ingest/pipeline';
import { resolveSource } from '../src/data/ingest/source';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolveSource(projectRoot);
const catalogue = buildCatalogue(source);

console.log(
  `Validated ${catalogue.metadata.modelCount} Model Cards, ${catalogue.metadata.technicalCardCount} Technical Cards, and all deterministic joins.`,
);
