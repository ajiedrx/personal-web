import type { Locale } from '../i18n/locale';

/**
 * Base-path helpers so internal links, anchors, and asset URLs resolve
 * correctly under the GitHub Pages project subpath (`base: '/personal-web'`).
 *
 * Astro exposes the configured base as `import.meta.env.BASE_URL`. Depending on
 * config it may or may not carry a trailing slash, so these helpers normalize
 * joins to avoid missing or doubled slashes.
 *
 * _Requirements: 1.5, 4.2, 6.2_
 */

/** The configured base path, e.g. `/personal-web/` or `/`. */
const BASE = import.meta.env.BASE_URL;

/** Strip trailing slashes from a segment. */
function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

/** Strip leading slashes from a segment. */
function trimLeadingSlash(value: string): string {
  return value.replace(/^\/+/, '');
}

/**
 * Prefix an internal href/anchor/asset path with the configured base path.
 *
 * - Root (`/`) resolves to the base itself (with a single trailing slash).
 * - Pure hash links (`#anchor`) are returned unchanged; they resolve relative
 *   to the current document and must not be base-prefixed.
 * - Absolute URLs (`http://`, `https://`, `mailto:`, `//`) are returned
 *   unchanged.
 * - Otherwise the path is joined to the base with exactly one separating slash.
 *
 * @param path An internal path such as `/`, `/id/`, `assets/og.png`, or `#projects`.
 * @returns The base-prefixed path.
 */
export function withBase(path: string): string {
  // Leave in-page anchors and external/protocol-relative URLs untouched.
  if (path.startsWith('#') || /^([a-z][a-z0-9+.-]*:|\/\/)/i.test(path)) {
    return path;
  }

  const base = trimTrailingSlash(BASE);
  const cleanPath = trimLeadingSlash(path);

  if (cleanPath === '') {
    // Root path: keep a single trailing slash off the base.
    return `${base}/`;
  }

  return `${base}/${cleanPath}`;
}

/**
 * Build the base-prefixed route for a locale, with an optional anchor.
 *
 * English is served at `/` and Indonesian at `/id/` (both base-prefixed).
 *
 * @param locale The target locale.
 * @param hash Optional anchor, with or without a leading `#` (e.g. `contact` or `#contact`).
 * @returns The base-prefixed locale path, e.g. `/personal-web/` or `/personal-web/id/#contact`.
 */
export function localePath(locale: Locale, hash = ''): string {
  const route = locale === 'id' ? withBase('/id/') : withBase('/');

  if (hash === '') {
    return route;
  }

  const anchor = hash.startsWith('#') ? hash : `#${hash}`;
  return `${route}${anchor}`;
}
