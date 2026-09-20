import type { CatalogueMetadata, CatalogueSourceRecord } from '../types/catalogue';

/**
 * Builds a browsable GitHub URL for a canonical repository-relative path,
 * pinned to the resolved commit SHA that produced the current catalogue build.
 * Returns null when the path is absent so callers never fabricate a link.
 */
export function buildRepositoryFileUrl(
  metadata: CatalogueMetadata,
  path: string | null | undefined,
): string | null {
  if (!path) return null;
  const [owner, repo] = metadata.sourceRepository.split('/');
  if (!owner || !repo) return null;
  return `https://github.com/${owner}/${repo}/blob/${metadata.resolvedCommitSha}/${path}`;
}

/** Builds a direct raw-content URL (e.g. for an NPZ measurement asset). */
export function buildRepositoryRawUrl(
  metadata: CatalogueMetadata,
  path: string | null | undefined,
): string | null {
  if (!path) return null;
  const [owner, repo] = metadata.sourceRepository.split('/');
  if (!owner || !repo) return null;
  return `https://raw.githubusercontent.com/${owner}/${repo}/${metadata.resolvedCommitSha}/${path}`;
}

export interface SourceIdentity {
  /** Short, human-readable label — never a raw URL. */
  label: string;
  /** Where the label links to, or null when the source has no browsable URL. */
  href: string | null;
}

/**
 * Renders a canonical upstream source record (repository/implementation/checkpoint/wrapper) as a
 * short "owner/repo @ shortsha" (or "owner/repo · path" when a file path is present) label with a
 * separate browsable link, instead of printing the raw URL inline in a fact column.
 */
export function formatSourceIdentity(source: CatalogueSourceRecord): SourceIdentity | null {
  if (!source.url) return null;
  let host: URL;
  try {
    host = new URL(source.url);
  } catch {
    return { label: source.url, href: source.url };
  }

  const shortRevision = source.revision ? source.revision.slice(0, 7) : null;

  if (host.hostname === 'github.com') {
    const slug = host.pathname.replace(/^\/|\/$/g, '');
    if (source.path && source.revision) {
      return { label: `${slug} · ${source.path}`, href: `${source.url}/blob/${source.revision}/${source.path}` };
    }
    if (source.revision) {
      return { label: `${slug} @ ${shortRevision}`, href: `${source.url}/tree/${source.revision}` };
    }
    return { label: slug, href: source.url };
  }

  const label = shortRevision ? `${host.hostname}${host.pathname} @ ${shortRevision}` : `${host.hostname}${host.pathname}`;
  return { label, href: source.url };
}
