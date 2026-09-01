import { describe, it, expect, beforeAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { LOCALES, type Locale } from '../i18n/locale';
import {
  buildTitle,
  buildDescription,
  buildOgTags,
  buildPersonJsonLd,
  OWNER,
} from '../lib/seo';

/**
 * SEO / build-output and no-JS tests (Task 21.3).
 *
 * Validates:
 *   - Requirement 20.1: a `<title>` and meta description per locale.
 *   - Requirement 20.2: Open Graph metadata per locale.
 *   - Requirement 20.3: the Build_System generates a sitemap.
 *   - Requirement 20.4: valid Person structured data describing the owner.
 *   - Requirements 1.4 / 19.4: interactive JS ships only for the designated
 *     island components; purely static sections contribute no client script.
 *
 * Rendering strategy — assert against the BUILT output.
 * ----------------------------------------------------
 * Unlike the component-level tests (which use `experimental_AstroContainer` to
 * render a single `.astro` file in-process), this task's requirements are
 * properties of the *whole built site*: the emitted `<head>` for each locale
 * page, the generated sitemap files, and — critically — *which* client scripts
 * Astro actually ships. Only a real `astro build` produces the sitemap and the
 * final set of module scripts (islands), so the test runs the build once in
 * `beforeAll` and asserts on the files under `dist/`.
 *
 * The build is idempotent and fast (~1s here); it writes only to `dist/`, which
 * is build output (never source), so running it from a test is safe and does
 * not touch any `src/` file another task may be editing.
 *
 * SEO content is asserted against the pure `seo.ts` builders (independent
 * oracle) rather than hard-coded strings, so the test tracks the I18n_Store and
 * the canonical URL shape per locale exactly as BaseLayout renders them.
 */

// ---------------------------------------------------------------------------
// Paths + one-time build
// ---------------------------------------------------------------------------

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const distDir = resolve(projectRoot, 'dist');

/** Absolute path to a locale's built HTML entry point (`/` vs `/id/`). */
function localeHtmlPath(locale: Locale): string {
  return locale === 'en'
    ? resolve(distDir, 'index.html')
    : resolve(distDir, locale, 'index.html');
}

/**
 * Strip HTML comments before scanning for `<script>` tags.
 *
 * Some component markup (e.g. the Navbar) contains explanatory comments that
 * mention the word "script"; removing comments first keeps the script scan
 * from matching commented-out or descriptive text.
 */
function stripComments(html: string): string {
  return html.replace(/<!--[\s\S]*?-->/g, '');
}

/** A parsed `<script>` occurrence from the built HTML. */
interface ScriptTag {
  /** Raw attribute string of the opening tag. */
  attrs: string;
  /** `type` attribute value, if any. */
  type: string | null;
  /** `src` attribute value, if any (external module). */
  src: string | null;
  /** Inline body (empty for external scripts). */
  body: string;
}

/** Enumerate every `<script>` tag (attributes + body) in a built page. */
function scriptTags(html: string): ScriptTag[] {
  const cleaned = stripComments(html);
  const tags: ScriptTag[] = [];
  const re = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(cleaned)) !== null) {
    const attrs = match[1];
    const typeMatch = attrs.match(/\btype="([^"]*)"/i);
    const srcMatch = attrs.match(/\bsrc="([^"]*)"/i);
    tags.push({
      attrs,
      type: typeMatch ? typeMatch[1] : null,
      src: srcMatch ? srcMatch[1] : null,
      body: match[2],
    });
  }
  return tags;
}

/** Read a `<meta property="…" content="…">` value from built HTML. */
function ogContent(html: string, property: string): string | null {
  const re = new RegExp(
    `<meta[^>]*property="${property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*content="([^"]*)"[^>]*>`,
    'i',
  );
  const match = html.match(re);
  return match ? match[1] : null;
}

const builtHtml: Record<Locale, string> = { en: '', id: '' };

beforeAll(() => {
  // Produce the real deployable output. `--silent` keeps the vitest log clean;
  // a non-zero exit throws and fails the suite (the build must succeed for the
  // output assertions to be meaningful).
  execFileSync('npx', ['astro', 'build', '--silent'], {
    cwd: projectRoot,
    stdio: 'pipe',
  });

  for (const locale of LOCALES) {
    const path = localeHtmlPath(locale);
    expect(existsSync(path), `expected built page at ${path}`).toBe(true);
    builtHtml[locale] = readFileSync(path, 'utf8');
  }
}, 120_000);

// ---------------------------------------------------------------------------
// Req 20.1 — per-locale <title> and meta description
// ---------------------------------------------------------------------------

describe('per-locale <title> and meta description (Req 20.1)', () => {
  it.each(LOCALES)('emits the per-locale <title> for %s', (locale) => {
    const titleMatch = builtHtml[locale].match(/<title>([\s\S]*?)<\/title>/i);
    expect(titleMatch, 'expected a <title> element').not.toBeNull();
    expect(titleMatch![1].trim()).toBe(buildTitle(locale));
  });

  it.each(LOCALES)('emits the per-locale meta description for %s', (locale) => {
    const descMatch = builtHtml[locale].match(
      /<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i,
    );
    expect(descMatch, 'expected a meta description').not.toBeNull();
    expect(descMatch![1]).toBe(buildDescription(locale));
  });

  it('emits distinct titles/descriptions where the I18n_Store differs per locale', () => {
    // The two locales must each resolve their own SEO content; this guards
    // against a single hard-coded title/description leaking across locales.
    const enTitle = buildTitle('en');
    const idTitle = buildTitle('id');
    expect(builtHtml.en).toContain(`<title>${enTitle}</title>`);
    expect(builtHtml.id).toContain(`<title>${idTitle}</title>`);
  });
});

// ---------------------------------------------------------------------------
// Req 20.2 — Open Graph tags per locale
// ---------------------------------------------------------------------------

describe('Open Graph metadata per locale (Req 20.2)', () => {
  it.each(LOCALES)('emits every Open Graph tag for %s', (locale) => {
    for (const tag of buildOgTags(locale)) {
      expect(ogContent(builtHtml[locale], tag.property), `og tag ${tag.property}`).toBe(
        tag.content,
      );
    }
  });

  it('emits a locale-specific og:url and og:locale per locale', () => {
    expect(ogContent(builtHtml.en, 'og:url')).toBe(
      'https://ajiedrx.github.io/personal-web/',
    );
    expect(ogContent(builtHtml.id, 'og:url')).toBe(
      'https://ajiedrx.github.io/personal-web/id/',
    );
    expect(ogContent(builtHtml.en, 'og:locale')).toBe('en_US');
    expect(ogContent(builtHtml.id, 'og:locale')).toBe('id_ID');
  });
});

// ---------------------------------------------------------------------------
// Req 20.3 — sitemap generated at build
// ---------------------------------------------------------------------------

describe('sitemap generation (Req 20.3)', () => {
  it('generates sitemap-index.xml referencing the URL set', () => {
    const indexPath = resolve(distDir, 'sitemap-index.xml');
    expect(existsSync(indexPath), 'expected dist/sitemap-index.xml').toBe(true);
    const xml = readFileSync(indexPath, 'utf8');
    expect(xml).toContain('<sitemapindex');
    expect(xml).toContain('sitemap-0.xml');
  });

  it('generates sitemap-0.xml listing both locale URLs under the base path', () => {
    const urlSetPath = resolve(distDir, 'sitemap-0.xml');
    expect(existsSync(urlSetPath), 'expected dist/sitemap-0.xml').toBe(true);
    const xml = readFileSync(urlSetPath, 'utf8');
    expect(xml).toContain('<urlset');
    // Both the EN root and the ID locale route must be listed (Req 5.1, 5.2).
    expect(xml).toContain('<loc>https://ajiedrx.github.io/personal-web/</loc>');
    expect(xml).toContain('<loc>https://ajiedrx.github.io/personal-web/id/</loc>');
  });
});

// ---------------------------------------------------------------------------
// Req 20.4 — valid Person JSON-LD
// ---------------------------------------------------------------------------

describe('Person structured data (Req 20.4)', () => {
  /** Extract + JSON.parse the `application/ld+json` block from a page. */
  function extractJsonLd(html: string): Record<string, unknown> {
    const match = stripComments(html).match(
      /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i,
    );
    expect(match, 'expected a JSON-LD script block').not.toBeNull();
    // Core of Req 20.4: the block must parse as valid JSON.
    return JSON.parse(match![1]) as Record<string, unknown>;
  }

  it.each(LOCALES)('emits valid, JSON-parseable Person JSON-LD for %s', (locale) => {
    const jsonLd = extractJsonLd(builtHtml[locale]);
    expect(jsonLd['@context']).toBe('https://schema.org');
    expect(jsonLd['@type']).toBe('Person');
    expect(jsonLd.name).toBe(OWNER.name);
    expect(jsonLd.jobTitle).toBe('Full-Stack Mobile Engineer');
    // The rendered structured data must match the builder for the locale.
    expect(jsonLd).toEqual(JSON.parse(JSON.stringify(buildPersonJsonLd(locale))));
  });
});

// ---------------------------------------------------------------------------
// Req 1.4 / 19.4 — JS ships only for designated islands
// ---------------------------------------------------------------------------

describe('client JS ships only for designated islands (Req 1.4, 19.4)', () => {
  /**
   * The designated interactive islands for the two locale pages, identified by
   * a stable token their bundled script contains:
   *   - ThemeToggle   → wires buttons marked `[data-theme-toggle]`
   *   - Navbar        → scroll-spy uses the `[data-navbar]` root selector
   *   - ImpactCounter → animates elements marked `[data-impact-number]`
   *   - ScrollReveal  → adds the `is-revealed` marker class as sections enter
   *     the viewport; mounted once in BaseLayout so it ships on every page.
   * LanguageToggle is a plain anchor (no script), so it contributes no module
   * script.
   *
   * Tokens are chosen to be minifier-stable: they are dataset attribute names
   * or literal class names the island's script references literally, so
   * bundling/quote-normalization does not change them.
   */
  const ISLAND_MARKERS: Array<{ name: string; token: string }> = [
    { name: 'ThemeToggle', token: 'data-theme-toggle' },
    { name: 'Navbar scroll-spy', token: 'data-navbar' },
    { name: 'ImpactCounter', token: 'data-impact-number' },
    { name: 'ScrollReveal', token: 'is-revealed' },
  ];

  /** Markers proving purely static sections rendered (they must ship no JS). */
  const STATIC_SECTION_MARKERS = ['id="about"', 'id="expertise"', 'id="experience"'];

  it.each(LOCALES)('ships exactly the designated island module scripts for %s', (locale) => {
    const moduleScripts = scriptTags(builtHtml[locale]).filter(
      (s) => s.type === 'module',
    );

    // One module script per designated island — no more, no fewer.
    expect(moduleScripts.length).toBe(ISLAND_MARKERS.length);

    // Each designated island is represented exactly once.
    for (const island of ISLAND_MARKERS) {
      const matching = moduleScripts.filter((s) => s.body.includes(island.token));
      expect(matching.length, `expected one module script for ${island.name}`).toBe(1);
    }

    // Every module script belongs to a designated island (nothing stray).
    for (const script of moduleScripts) {
      const owned = ISLAND_MARKERS.some((i) => script.body.includes(i.token));
      expect(owned, `unexpected module script: ${script.body.slice(0, 80)}`).toBe(true);
    }
  });

  it.each(LOCALES)(
    'renders static sections without them contributing any client JS for %s',
    (locale) => {
      const html = builtHtml[locale];
      // The static sections are present in the output...
      for (const marker of STATIC_SECTION_MARKERS) {
        expect(html, `expected static section marker ${marker}`).toContain(marker);
      }
      // ...yet the only module scripts are the three island bundles, so those
      // static sections shipped no JS of their own.
      const moduleScripts = scriptTags(html).filter((s) => s.type === 'module');
      expect(moduleScripts.length).toBe(ISLAND_MARKERS.length);
    },
  );

  it.each(LOCALES)(
    'emits only the pre-paint theme init and JSON-LD as non-module inline scripts for %s',
    (locale) => {
      const nonModule = scriptTags(builtHtml[locale]).filter(
        (s) => s.type !== 'module',
      );
      // Exactly two: the inline pre-paint theme script (sets data-theme before
      // first paint) and the JSON-LD block. Neither is island hydration JS.
      const jsonLd = nonModule.filter((s) => s.type === 'application/ld+json');
      const prePaint = nonModule.filter(
        (s) => s.type === null && s.body.includes("setAttribute('data-theme'"),
      );
      expect(jsonLd.length, 'one JSON-LD block').toBe(1);
      expect(prePaint.length, 'one inline pre-paint theme script').toBe(1);
      expect(nonModule.length).toBe(2);
    },
  );

  it.each(LOCALES)('does not reference any external island JS bundle for %s', (locale) => {
    // Astro inlines these small island scripts; assert none are pulled in as an
    // external `src` module (guards against an unexpected extra JS payload).
    const external = scriptTags(builtHtml[locale]).filter((s) => s.src !== null);
    expect(external.length, 'expected no external <script src> bundles').toBe(0);
  });
});
