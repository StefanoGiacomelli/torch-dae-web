import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCatalogue } from '../src/data/ingest/pipeline';
import { parseSourceOptions } from '../src/data/ingest/cli';
import { resolveSource } from '../src/data/ingest/source';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolveSource(projectRoot, parseSourceOptions(process.argv.slice(2)));
const catalogue = buildCatalogue(source);

console.log(
  `Validated ${catalogue.metadata.modelCount} Model Cards, ${catalogue.metadata.technicalCardCount} Technical Cards, and all deterministic joins.`,
);
