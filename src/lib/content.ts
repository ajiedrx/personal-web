import type {
  Project,
  CertificationEntry,
  ExperienceEntry,
  ImpactItem,
  SocialLink,
} from '../content/types';

/**
 * Content validation, filtering, and sorting helpers (pure logic).
 *
 * These functions drive the "omit invalid record, keep the rest" behavior for
 * projects (Req 12.4), the featured-only filter for certifications
 * (Req 14.4, 14.7), the most-recent-first experience timeline (Req 11.1, 11.3),
 * certification detail visibility (Req 14.6), and the impact counter's
 * reduced-motion display value (Req 13.3).
 *
 * All functions are pure and side-effect free apart from `validProjects`, which
 * logs a build-time warning for omitted records without failing the build.
 * They back the property-based tests for Correctness Properties 4–8.
 *
 * _Requirements: 11.1, 11.3, 12.1, 12.3, 12.4, 13.3, 14.4, 14.6, 14.7_
 */

/** Lower bound (inclusive) for a project's tech-stack chip count (Req 12.3). */
export const MIN_TECH_STACK = 1;

/** Upper bound (inclusive) for a project's tech-stack chip count (Req 12.3). */
export const MAX_TECH_STACK = 10;

/** True when a value is a non-empty, non-whitespace string. */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * True only when all required Project_Card fields are present and well-formed:
 * a non-empty title, a non-empty selling description, a repository link, and
 * between 1 and 10 tech-stack chips (Req 12.3, 12.4).
 *
 * Acts as a type guard so callers narrow `Partial<Project>` to `Project`.
 */
export function isValidProject(p: Partial<Project>): p is Project {
  if (p === null || typeof p !== 'object') return false;
  if (!isNonEmptyString(p.title)) return false;
  if (!isNonEmptyString(p.description)) return false;
  if (!isNonEmptyString(p.repoUrl)) return false;

  const { techStack } = p;
  if (!Array.isArray(techStack)) return false;
  if (techStack.length < MIN_TECH_STACK || techStack.length > MAX_TECH_STACK) {
    return false;
  }

  return true;
}

/**
 * Keep only valid projects, preserving source order (Req 12.1, 12.4).
 *
 * Invalid records are dropped rather than rendered partially or broken. A
 * build-time warning lists any omitted records so the owner can fix the data,
 * without failing the build (Property 4).
 */
export function validProjects(all: Partial<Project>[]): Project[] {
  const kept: Project[] = [];
  const omitted: Partial<Project>[] = [];

  for (const candidate of all) {
    if (isValidProject(candidate)) {
      kept.push(candidate);
    } else {
      omitted.push(candidate);
    }
  }

  if (omitted.length > 0) {
    const labels = omitted.map((p) => {
      const title = typeof p?.title === 'string' ? p.title : '(untitled)';
      return `"${title}"`;
    });
    // eslint-disable-next-line no-console
    console.warn(
      `[content] Omitted ${omitted.length} invalid project record(s): ${labels.join(', ')}`,
    );
  }

  return kept;
}

/**
 * Featured certifications only, regardless of active/expired status
 * (Req 14.4, 14.7). Every record whose `featured` flag is set is kept — active
 * or expired — and every non-featured record is excluded. Source order is
 * preserved (Property 5).
 */
export function featuredCertifications(all: CertificationEntry[]): CertificationEntry[] {
  return all.filter((c) => c.featured === true);
}

/** Parse an ISO 'YYYY-MM' / 'YYYY' start date into a comparable number. */
function startDateRank(entry: ExperienceEntry): number {
  const parsed = Date.parse(entry.startDate);
  // Fall back to -Infinity so unparseable dates sort last (oldest); a valid
  // date always compares as more recent than an unparseable one.
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
}

/**
 * Timeline sorted most-recent-first (Req 11.1, 11.3).
 *
 * Returns a permutation of the input (same multiset of entries) ordered so that
 * start dates are non-increasing. An open-ended entry (`endDate === null`,
 * "Present") is treated as most recent, so it is ordered no earlier than any
 * entry it would otherwise tie with. The sort is stable, preserving the input
 * order among entries with an equal ranking (Property 7).
 */
export function sortExperienceDesc(entries: ExperienceEntry[]): ExperienceEntry[] {
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => {
      // "Present" (open-ended) entries rank as most recent.
      const aPresent = a.entry.endDate === null;
      const bPresent = b.entry.endDate === null;
      if (aPresent !== bPresent) {
        return aPresent ? -1 : 1;
      }

      // Then by start date, most-recent-first.
      const rankDelta = startDateRank(b.entry) - startDateRank(a.entry);
      if (rankDelta !== 0) {
        return rankDelta > 0 ? 1 : -1;
      }

      // Stable: preserve original relative order on ties.
      return a.index - b.index;
    })
    .map(({ entry }) => entry);
}

/**
 * Visible certification detail fields, computed from the record's `showDetails`
 * opt-in (Req 14.6).
 *
 * When `showDetails` is not enabled, `expiryDate` and `credentialId` are always
 * excluded. When enabled, present values for those fields are included; absent
 * (undefined) values remain omitted (Property 6).
 */
export interface VisibleCertificationDetails {
  expiryDate?: string;
  credentialId?: string;
}

export function visibleCertificationDetails(
  cert: CertificationEntry,
): VisibleCertificationDetails {
  if (cert.showDetails !== true) {
    return {};
  }

  const details: VisibleCertificationDetails = {};
  if (cert.expiryDate !== undefined) {
    details.expiryDate = cert.expiryDate;
  }
  if (cert.credentialId !== undefined) {
    details.credentialId = cert.credentialId;
  }
  return details;
}

/**
 * Resolve an impact item's display value for the current motion preference
 * (Req 13.3).
 *
 * When reduced motion is requested, the counter must show its final value
 * immediately, so this returns exactly the item's `value`. When motion is
 * allowed, animation starts from `0` and counts up to `value` (Property 8).
 */
export function impactDisplayValue(item: ImpactItem, prefersReducedMotion: boolean): number {
  return prefersReducedMotion ? item.value : 0;
}

/**
 * Contact value resolution (Req 15.1, 15.3, 15.4).
 *
 * Contact fields in `profile.json` may still hold placeholder data while the
 * owner fills in real details later (Req 22.4). A placeholder value must render
 * as inert text — never a broken link target — and the `mailto` CTA must only
 * be wired when a real email is present (Req 15.4).
 *
 * The `SocialLink` model carries an explicit `isPlaceholder` flag, but the
 * scalar `email`/`linkedin` fields do not. These helpers recognize the common
 * placeholder shapes seeded in `profile.json` (empty/whitespace, the
 * `example.com` example domain, and `.../placeholder` URLs) so the owner can
 * drop in real values with no markup edits (Req 22.5).
 */

/** True when a value is a non-empty, non-whitespace string. */
function present(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * True when an email string is a real, wire-able address rather than a
 * placeholder. Recognizes the seeded `example.com` example domain and any
 * empty/whitespace value as placeholders (Req 15.3, 15.4).
 */
export function isRealEmail(email: string | undefined | null): boolean {
  if (!present(email)) return false;
  const value = email.trim();
  // Must look like an address and not use a reserved example domain.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return false;
  if (/@(example\.(com|org|net)|placeholder(\.[^\s@]+)?)$/i.test(value)) {
    return false;
  }
  return true;
}

/**
 * True when a URL string is a real, wire-able target rather than a placeholder.
 * Recognizes empty/whitespace values and the seeded `.../placeholder` URLs as
 * placeholders (Req 15.4).
 */
export function isRealUrl(url: string | undefined | null): boolean {
  if (!present(url)) return false;
  const value = url.trim();
  if (!/^https?:\/\/\S+$/i.test(value)) return false;
  if (/\/placeholder\/?$/i.test(value) || /example\.(com|org|net)/i.test(value)) {
    return false;
  }
  return true;
}

/** True when a social link is a real, wire-able target (Req 15.1, 15.4). */
export function isRealSocial(social: SocialLink): boolean {
  if (social.isPlaceholder === true) return false;
  return isRealUrl(social.url);
}
