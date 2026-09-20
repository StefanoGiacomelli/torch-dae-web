import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import Ajv2020, { type ErrorObject, type ValidateFunction } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import type { JsonObject } from '../types/raw';

export interface CanonicalValidators {
  modelCard: ValidateFunction;
  technicalCard: ValidateFunction;
}

function formatErrors(errors: ErrorObject[] | null | undefined): string {
  return (errors ?? [])
    .map((error) => `${error.instancePath || '/'} ${error.message ?? 'is invalid'}`)
    .join('; ');
}

export function createCanonicalValidators(schemaDirectory: string): CanonicalValidators {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const schemas = readdirSync(schemaDirectory)
    .filter((name) => name.endsWith('.schema.json'))
    .map((name) => JSON.parse(readFileSync(join(schemaDirectory, name), 'utf8')) as JsonObject);
  for (const schema of schemas) ajv.addSchema(schema);

  const modelCard = ajv.getSchema('https://torch-dae.local/schemas/model-card.schema.json');
  const technicalCard = ajv.getSchema('https://torch-dae.local/schemas/technical-card.schema.json');
  if (!modelCard || !technicalCard) throw new Error('Required canonical schemas could not be compiled.');
  return { modelCard, technicalCard };
}

export function assertValid(
  validator: ValidateFunction,
  value: unknown,
  kind: string,
  path: string,
): void {
  if (!validator(value)) {
    throw new Error(`${kind} schema validation failed for ${path}: ${formatErrors(validator.errors)}`);
  }
}

export function canonicalSchemaDirectory(sourceRoot: string): string {
  return resolve(sourceRoot, 'schemas');
}
