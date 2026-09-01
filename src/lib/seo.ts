import type { Locale } from '../i18n/locale';
import { t } from '../i18n/locale';
import { localePath, withBase } from './withBase';

/**
 * SEO builders: pure functions that produce the per-locale `<head>` metadata
 * emitted by BaseLayout — the page `<title>`, meta description, Open Graph
 * tags, and a Person JSON-LD block describing the site owner.
 *
 * Everything here is a pure builder returning structured data (strings, an
 * array of tag objects, and a plain JSON-LD object) so that BaseLayout can
 * render it and tests can assert on it without a running Astro server.
 *
 * _Requirements: 20.1, 20.2, 20.4_
 */

/** Absolute origin of the deployed site (Astro `site` config). */
export const SITE_ORIGIN = 'https://ajiedrx.github.io';

/**
 * Static facts about the site owner. Used to build the Person JSON-LD and to
 * provide localized-title/description fallbacks when the i18n store has no
 * dedicated `seo.*` keys yet.
 */
export const OWNER = {
  name: 'Ajie Dibyo R.',
  role: 'Full-Stack Mobile Engineer',
  github: 'https://github.com/ajiedrx',
  location: 'Surabaya, Indonesia',
} as const;

/** Path (relative to the site) of the Open Graph preview image. */
const OG_IMAGE_PATH = 'og-image.png';

/** A single Open Graph / social meta tag as an attribute pair. */
export interface OgTag {
  /** The `property` attribute (e.g. `og:title`, `og:type`). */
  property: string;
  /** The tag's `content` value. */
  content: string;
}

/** Minimal schema.org Person JSON-LD shape describing the owner (Req 20.4). */
export interface PersonJsonLd {
  '@context': 'https://schema.org';
  '@type': 'Person';
  name: string;
  jobTitle: string;
  url: string;
  sameAs: string[];
  address: {
    '@type': 'PostalAddress';
    addressLocality: string;
    addressCountry: string;
  };
}

/** The full structured SEO payload for one locale (Req 20.1, 20.2, 20.4). */
export interface SeoData {
  /** Contents of the `<title>` element. */
  title: string;
  /** Contents of the meta description. */
  description: string;
  /** Canonical absolute URL for the current locale. */
  canonical: string;
  /** Open Graph tags to emit as `<meta property=… content=… />`. */
  ogTags: OgTag[];
  /** Person structured data to emit as `<script type="application/ld+json">`. */
  personJsonLd: PersonJsonLd;
}

/** BCP-47 language tags for the OG `og:locale` value, keyed by app locale. */
const OG_LOCALE: Record<Locale, string> = {
  en: 'en_US',
  id: 'id_ID',
};

/**
 * Resolve a fully-qualified URL for an already base-prefixed, origin-relative
 * path by prepending {@link SITE_ORIGIN}.
 *
 * The caller is responsible for base-prefixing: pass the result of
 * {@link localePath} (which already applies `withBase`) or wrap a raw asset
 * path in {@link withBase} first. This avoids applying the base path twice.
 */
function absoluteUrl(path: string): string {
  // `path` is expected to be an absolute (origin-relative) path like
  // `/personal-web/…`. Guard the join so a stray relative value still yields
  // a valid URL rather than concatenating without a separator.
  return `${SITE_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`;
}

/**
 * Build the `<title>` for a locale.
 *
 * Prefers a localized `seo.title` string; when absent (the i18n store has no
 * dedicated SEO keys yet), falls back to a stable `Name — Role` title so the
 * page is never left with an empty or key-echoing title.
 *
 * @param locale The active locale.
 * @returns The page title string.
 */
export function buildTitle(locale: Locale): string {
  const key = 'seo.title';
  const localized = t(locale, key);
  if (localized !== key) return localized;
  return `${OWNER.name} — ${OWNER.role}`;
}

/**
 * Build the meta description for a locale.
 *
 * Prefers a localized `seo.description` string; when absent, falls back to a
 * concise owner-and-role summary that mentions the location.
 *
 * @param locale The active locale.
 * @returns The meta description string.
 */
export function buildDescription(locale: Locale): string {
  const key = 'seo.description';
  const localized = t(locale, key);
  if (localized !== key) return localized;
  return `${OWNER.name}, ${OWNER.role} based in ${OWNER.location}.`;
}

/**
 * Build the Open Graph tag set for a locale (Req 20.2).
 *
 * Includes the title/description (reusing {@link buildTitle} /
 * {@link buildDescription}), the canonical page URL, an absolute preview image
 * URL, the site name, `og:type=website`, and the locale tag.
 *
 * @param locale The active locale.
 * @returns An ordered array of {@link OgTag} objects.
 */
export function buildOgTags(locale: Locale): OgTag[] {
  return [
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: OWNER.name },
    { property: 'og:title', content: buildTitle(locale) },
    { property: 'og:description', content: buildDescription(locale) },
    { property: 'og:url', content: absoluteUrl(localePath(locale)) },
    { property: 'og:image', content: absoluteUrl(withBase(OG_IMAGE_PATH)) },
    { property: 'og:locale', content: OG_LOCALE[locale] },
  ];
}

/**
 * Build the schema.org Person JSON-LD describing the owner (Req 20.4).
 *
 * The `url` points at the locale's canonical page and `sameAs` links the
 * owner's GitHub profile. Locale-invariant owner facts come from {@link OWNER}.
 *
 * @param locale The active locale.
 * @returns A plain object ready to `JSON.stringify` into a JSON-LD script.
 */
export function buildPersonJsonLd(locale: Locale): PersonJsonLd {
  const [addressLocality, addressCountry] = OWNER.location
    .split(',')
    .map((part) => part.trim());

  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: OWNER.name,
    jobTitle: OWNER.role,
    url: absoluteUrl(localePath(locale)),
    sameAs: [OWNER.github],
    address: {
      '@type': 'PostalAddress',
      addressLocality: addressLocality ?? OWNER.location,
      addressCountry: addressCountry ?? '',
    },
  };
}

/**
 * Build the full structured SEO payload for a locale in one call.
 *
 * Convenience aggregator so BaseLayout can destructure title/description/
 * canonical/ogTags/personJsonLd from a single source.
 *
 * @param locale The active locale.
 * @returns The complete {@link SeoData} for the locale.
 */
export function buildSeo(locale: Locale): SeoData {
  return {
    title: buildTitle(locale),
    description: buildDescription(locale),
    canonical: absoluteUrl(localePath(locale)),
    ogTags: buildOgTags(locale),
    personJsonLd: buildPersonJsonLd(locale),
  };
}
