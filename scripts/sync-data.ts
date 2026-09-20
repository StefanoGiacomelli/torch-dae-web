import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCatalogue } from '../src/data/ingest/pipeline';
import { resolveSource } from '../src/data/ingest/source';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolveSource(projectRoot);
const catalogue = buildCatalogue(source);
const output = resolve(projectRoot, 'src/generated/catalogue.json');
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(catalogue, null, 2)}\n`);

console.log(
  `Synced ${catalogue.metadata.modelCount} Model Cards and ${catalogue.metadata.technicalCardCount} Technical Cards from ${source.requestedRef} (${source.resolvedCommitSha}).`,
);
