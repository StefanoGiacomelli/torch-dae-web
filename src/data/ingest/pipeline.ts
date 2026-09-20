import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { normalizeCatalogue } from '../normalize/normalize';
import type { CatalogueIndex } from '../types/catalogue';
import type { RawModelCard, RawTechnicalCard } from '../types/raw';
import type { ResolvedSource } from './source';
import { assertValid, canonicalSchemaDirectory, createCanonicalValidators } from './validation';

function jsonFiles(directory: string): string[] {
  return readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => resolve(entry.parentPath, entry.name))
    .sort((a, b) => a.localeCompare(b));
}

function sourceRelative(sourceRoot: string, path: string): string {
  return relative(sourceRoot, path).split(sep).join('/');
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8')) as unknown;
}

/** Reads the SPDX license identifier from the source snapshot's own `pyproject.toml`. */
export function readLicenseIdentifier(sourceRoot: string): string | null {
  const pyprojectPath = resolve(sourceRoot, 'pyproject.toml');
  if (!existsSync(pyprojectPath)) return null;
  const contents = readFileSync(pyprojectPath, 'utf8');
  const match = /^\s*license\s*=\s*"([^"]+)"/m.exec(contents);
  return match?.[1] ?? null;
}

export function buildCatalogue(source: ResolvedSource, generatedAt = new Date().toISOString()): CatalogueIndex {
  const modelDirectory = resolve(source.root, 'model_cards');
  const technicalDirectory = resolve(source.root, 'technical_cards');
  if (!existsSync(modelDirectory) || !existsSync(technicalDirectory)) {
    throw new Error(`Canonical card directories are missing under ${source.root}.`);
  }

  const validators = createCanonicalValidators(canonicalSchemaDirectory(source.root));
  const models = jsonFiles(modelDirectory).map((path) => {
    const value = readJson(path);
    assertValid(validators.modelCard, value, 'Model Card', path);
    return { card: value as RawModelCard, path: sourceRelative(source.root, path) };
  });
  const technicalCards = jsonFiles(technicalDirectory).map((path) => {
    const value = readJson(path);
    assertValid(validators.technicalCard, value, 'Technical Card', path);
    const card = value as RawTechnicalCard;
    const rawPath = resolve(path, '..', card.raw_measurements.path);
    if (!existsSync(rawPath)) {
      throw new Error(`Technical Card ${card.identity.technical_card_id} raw NPZ is missing: ${rawPath}`);
    }
    return { card, path: sourceRelative(source.root, path) };
  });

  if (models.length === 0) throw new Error('No canonical Model Cards were discovered.');

  return normalizeCatalogue(models, technicalCards, {
    sourceRepository: source.repository,
    sourceMode: source.mode,
    requestedRef: source.requestedRef,
    resolvedCommitSha: source.resolvedCommitSha,
    generatedAt,
    licenseIdentifier: readLicenseIdentifier(source.root),
  });
}
