import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import Navbar from './Navbar.astro';
import { scrollBehaviorFor } from './Navbar';
import { LOCALES, type Locale } from '../i18n/locale';

/**
 * Unit tests for the Navbar's navigation behavior (Task 11.2).
 *
 * Validates:
 *   - Requirement 4.1: the Navbar displays anchor links to each navigable
 *     Section — asserted here as exactly one link per section, each with a
 *     unique in-page anchor target.
 *   - Requirement 4.2: activating an anchor link scrolls smoothly to the
 *     corresponding Section (`smooth` behavior in the normal case).
 *   - Requirement 4.5: under `prefers-reduced-motion: reduce`, anchor
 *     navigation happens without smooth-scroll animation (`auto` / instant).
 *
 * Two artifacts are exercised:
 *   1. The server-rendered markup (via `experimental_AstroContainer`) — the
 *      real `<a data-nav-link href="#…">` set the browser receives, which pins
 *      the one-link-per-section / unique-anchor contract (Req 4.1).
 *   2. The pure `scrollBehaviorFor` helper the client script calls to choose
 *      between smooth and instant scroll (Req 4.2, 4.5). The click handler
 *      itself lives in the bundled `<script>` and is not importable, so we also
 *      assert the source wires that helper through `prefersReducedMotion()`.
 */

/** The navigable sections the navbar links to, in source order (Navbar.astro). */
const NAV_SECTION_IDS = [
  'about',
  'expertise',
  'experience',
  'projects',
  'impact',
  'education',
  'contact',
] as const;

/** Render Navbar for a locale to its HTML string. */
async function renderNavbar(locale: Locale): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(Navbar, { props: { locale } });
}

/** Collect the `href` of every `<a data-nav-link …>` in the rendered markup. */
function navLinkHrefs(html: string): string[] {
  const hrefs: string[] = [];
  // Attribute order is not guaranteed, so match any <a> carrying data-nav-link
  // and pull its href out of the same tag.
  const anchorRe = /<a\b[^>]*\bdata-nav-link\b[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = anchorRe.exec(html)) !== null) {
    const hrefMatch = match[0].match(/\bhref="([^"]*)"/i);
    if (hrefMatch) hrefs.push(hrefMatch[1]);
  }
  return hrefs;
}

describe('Navbar links: one per section with unique anchors (Req 4.1)', () => {
  const rendered: Record<Locale, string> = { en: '', id: '' };

  beforeAll(async () => {
    rendered.en = await renderNavbar('en');
    rendered.id = await renderNavbar('id');
  });

  it.each(LOCALES)('renders exactly one nav link per navigable section for %s', (locale) => {
    const hrefs = navLinkHrefs(rendered[locale]);
    expect(hrefs).toHaveLength(NAV_SECTION_IDS.length);
  });

  it.each(LOCALES)('targets every navigable section by its in-page anchor for %s', (locale) => {
    const hrefs = navLinkHrefs(rendered[locale]);
    const expected = NAV_SECTION_IDS.map((id) => `#${id}`);
    // Order and membership both matter: the navbar lists sections in a fixed
    // order and each href is the section's in-page anchor.
    expect(hrefs).toEqual(expected);
  });

  it.each(LOCALES)('gives each link a unique anchor target for %s', (locale) => {
    const hrefs = navLinkHrefs(rendered[locale]);
    // No two links point at the same section.
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it.each(LOCALES)('uses plain in-page hashes (no base prefix) for %s', (locale) => {
    // In-page anchors resolve against the current document, so they must be
    // bare `#id` hashes, never base-prefixed paths.
    for (const href of navLinkHrefs(rendered[locale])) {
      expect(href.startsWith('#')).toBe(true);
      expect(href).not.toContain('/');
    }
  });
});

describe('scrollBehaviorFor: smooth normally, instant under reduced motion (Req 4.2, 4.5)', () => {
  it('resolves to "smooth" when reduced motion is not requested (Req 4.2)', () => {
    expect(scrollBehaviorFor(false)).toBe('smooth');
  });

  it('resolves to "auto" (instant) when reduced motion is requested (Req 4.5)', () => {
    expect(scrollBehaviorFor(true)).toBe('auto');
  });

  it('maps the reduced-motion flag one-to-one onto the two behaviors', () => {
    // Only these two values are valid ScrollBehavior outcomes for anchor nav.
    expect(new Set([scrollBehaviorFor(true), scrollBehaviorFor(false)])).toEqual(
      new Set(['auto', 'smooth']),
    );
  });
});

describe('Navbar.ts wires scroll behavior through the reduced-motion check', () => {
  let source = '';

  beforeAll(() => {
    source = readFileSync(
      fileURLToPath(new URL('./Navbar.ts', import.meta.url)),
      'utf8',
    );
  });

  it('drives scrollIntoView behavior from scrollBehaviorFor(prefersReducedMotion())', () => {
    // The click handler must select behavior via the reduced-motion-aware
    // helper rather than hard-coding "smooth" (guards Req 4.5 in the handler).
    expect(source).toMatch(/behavior:\s*scrollBehaviorFor\(prefersReducedMotion\(\)\)/);
  });

  it('reads the reduced-motion preference via the reduce media query', () => {
    expect(source).toMatch(/prefers-reduced-motion:\s*reduce/);
  });
});
