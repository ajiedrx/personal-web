import { describe, it, expect, beforeAll } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import EnPage from '../pages/index.astro';
import IdPage from '../pages/id/index.astro';
import type { Locale } from '../i18n/locale';
import { LOCALES } from '../i18n/locale';

/**
 * Structural + accessibility tests for the two locale pages (Task 21.4).
 *
 * Validates: Requirements 18.1, 18.4, 18.5, 18.6
 *
 * Strategy
 * --------
 * The two locale pages (`/` and `/id/`) are full Astro page components that
 * compose `BaseLayout` + all nine sections. `experimental_AstroContainer`
 * renders each to a real HTML string in-process (the same technique used by
 * `BaseLayout.test.ts`), so every assertion below runs against the *actual*
 * produced markup rather than a stub.
 *
 * The checks split into four deterministic, environment-independent groups plus
 * one axe smoke scan:
 *   1. Heading structure — exactly one <h1>, headings never skip a level
 *      (h1 -> h2 -> h3 monotonic) (Req 18.1).
 *   2. Semantic landmarks — <nav>, <main>, <footer> all present (Req 18.1).
 *   3. Keyboard operability — the toggles and nav/footer links are real
 *      <button>/<a> elements (native focusable + Enter/Space operable), never
 *      div click-handlers, and the global :focus-visible rule exists so focus is
 *      visible (Req 18.4, 18.5).
 *   4. Computed contrast — the light/dark theme token pairs from themes.css +
 *      tokens.css are resolved to hex and checked against WCAG AA: >=4.5:1 for
 *      normal text and >=3:1 for large text and the focus indicator (Req 18.6).
 *   5. axe-core smoke scan on both rendered pages (Req 18.4/18.6), when a jsdom
 *      DOM harness is available. If jsdom/axe cannot run in this environment the
 *      scan is skipped with a clear note; the deterministic checks above are the
 *      higher-value, always-on guarantees. Full WCAG AA conformance still
 *      requires manual testing with assistive technology.
 */

// --------------------------------------------------------------------------
// Rendering
// --------------------------------------------------------------------------

const PAGES = { en: EnPage, id: IdPage } as const;

/** Render a locale page to its full HTML string. */
async function renderPage(locale: Locale): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(PAGES[locale]);
}

// --------------------------------------------------------------------------
// Heading helpers
// --------------------------------------------------------------------------

/** Strip HTML comments so literal tag text inside comments isn't parsed as markup. */
function stripComments(html: string): string {
  return html.replace(/<!--[\s\S]*?-->/g, '');
}

/** Return the ordered list of heading levels (1..6) as they appear in the HTML. */
function headingLevels(html: string): number[] {
  const levels: number[] = [];
  const re = /<h([1-6])\b/gi;
  let m: RegExpExecArray | null;
  const source = stripComments(html);
  while ((m = re.exec(source)) !== null) {
    levels.push(Number(m[1]));
  }
  return levels;
}

/** Count opening tags for a given element name (landmark presence). */
function countTag(html: string, tag: string): number {
  const re = new RegExp(`<${tag}\\b`, 'gi');
  return (stripComments(html).match(re) ?? []).length;
}

// --------------------------------------------------------------------------
// Contrast helpers — sRGB relative luminance + WCAG contrast ratio
// --------------------------------------------------------------------------

/** Expand `#rgb` to `#rrggbb` and parse into 0..255 channels. */
function parseHex(hex: string): [number, number, number] {
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (!/^[0-9a-fA-F]{6}$/.test(h)) {
    throw new Error(`Not a hex color: "${hex}"`);
  }
  const int = parseInt(h, 16);
  return [(int >> 16) & 0xff, (int >> 8) & 0xff, int & 0xff];
}

/** WCAG sRGB relative luminance of an #rrggbb color (0..1). */
function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hex colors (1..21). */
function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

// --------------------------------------------------------------------------
// CSS token resolution — read tokens.css (palette) + themes.css (semantic)
// --------------------------------------------------------------------------

const stylesDir = new URL('../styles/', import.meta.url);
const tokensCss = readFileSync(fileURLToPath(new URL('tokens.css', stylesDir)), 'utf8');
const themesCss = readFileSync(fileURLToPath(new URL('themes.css', stylesDir)), 'utf8');
const globalCss = readFileSync(fileURLToPath(new URL('global.css', stylesDir)), 'utf8');

/** Parse the primitive palette `--palette-*: #hex;` declarations from tokens.css. */
function parsePalette(css: string): Record<string, string> {
  const palette: Record<string, string> = {};
  const re = /(--palette-[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,6})\s*;/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) {
    palette[m[1]] = m[2];
  }
  return palette;
}

/**
 * Extract the semantic token block for one theme selector from themes.css.
 * `:root, [data-theme="dark"] { ... }` is the dark block; `[data-theme="light"]`
 * is the light block.
 */
function themeBlock(css: string, selector: 'dark' | 'light'): string {
  // Find the selector list ending in `{` then capture up to the matching `}`.
  const marker =
    selector === 'dark' ? '[data-theme="dark"]' : '[data-theme="light"]';
  const idx = css.indexOf(marker);
  expect(idx, `expected ${marker} block in themes.css`).toBeGreaterThanOrEqual(0);
  const open = css.indexOf('{', idx);
  const close = css.indexOf('}', open);
  return css.slice(open + 1, close);
}

/** Parse `--color-*: var(--palette-*)` (or direct hex) declarations from a block. */
function parseThemeVars(block: string): Record<string, string> {
  const vars: Record<string, string> = {};
  const re = /(--color-[\w-]+)\s*:\s*([^;]+);/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    vars[m[1]] = m[2].trim();
  }
  return vars;
}

const palette = parsePalette(tokensCss);

/**
 * Resolve a token value to a hex color. Handles either a direct `#hex` or a
 * single `var(--palette-*)` reference into the primitive palette. A `var(...)`
 * with a comma fallback resolves the primary reference.
 */
function resolveColor(value: string): string {
  const v = value.trim();
  if (v.startsWith('#')) return v;
  const varMatch = v.match(/^var\(\s*(--[\w-]+)\s*(?:,[^)]*)?\)$/);
  if (varMatch) {
    const ref = varMatch[1];
    const resolved = palette[ref];
    if (!resolved) throw new Error(`Unresolved palette ref: ${ref} (from "${value}")`);
    return resolved;
  }
  throw new Error(`Cannot resolve color value: "${value}"`);
}

/** Build a `{ tokenName -> #hex }` map for a theme by resolving every --color-*. */
function resolvedThemeColors(selector: 'dark' | 'light'): Record<string, string> {
  const vars = parseThemeVars(themeBlock(themesCss, selector));
  const out: Record<string, string> = {};
  for (const [name, raw] of Object.entries(vars)) {
    try {
      out[name] = resolveColor(raw);
    } catch {
      // Non-color tokens (e.g. color-scheme is not a --color-* so it won't appear)
      // or values we intentionally don't check are skipped.
    }
  }
  return out;
}

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------

describe('Accessibility: page structure and landmarks (Req 18.1)', () => {
  const rendered: Record<Locale, string> = { en: '', id: '' };

  beforeAll(async () => {
    rendered.en = await renderPage('en');
    rendered.id = await renderPage('id');
  });

  it.each(LOCALES)('has exactly one <h1> on the %s page', (locale) => {
    const levels = headingLevels(rendered[locale]);
    const h1Count = levels.filter((l) => l === 1).length;
    expect(h1Count).toBe(1);
  });

  it.each(LOCALES)('never skips a heading level on the %s page', (locale) => {
    const levels = headingLevels(rendered[locale]);
    expect(levels.length).toBeGreaterThan(0);
    // The first heading must be the top-level <h1>.
    expect(levels[0]).toBe(1);
    // Each subsequent heading may go one level deeper at most (no skipped level),
    // and may climb back up any amount.
    let maxSeen = levels[0];
    for (let i = 1; i < levels.length; i++) {
      const level = levels[i];
      expect(level).toBeLessThanOrEqual(maxSeen + 1);
      maxSeen = Math.max(maxSeen, level);
    }
  });

  it.each(LOCALES)('renders the nav, main, and footer landmarks on the %s page', (locale) => {
    const html = rendered[locale];
    // At least one <nav> (primary navbar; the footer adds a second).
    expect(countTag(html, 'nav')).toBeGreaterThanOrEqual(1);
    // Exactly one <main> landmark.
    expect(countTag(html, 'main')).toBe(1);
    // Exactly one <footer> landmark.
    expect(countTag(html, 'footer')).toBe(1);
  });
});

describe('Accessibility: keyboard operability + visible focus (Req 18.4, 18.5)', () => {
  const rendered: Record<Locale, string> = { en: '', id: '' };

  beforeAll(async () => {
    rendered.en = await renderPage('en');
    rendered.id = await renderPage('id');
  });

  it.each(LOCALES)('renders the theme toggle as a native <button> on the %s page', (locale) => {
    const html = rendered[locale];
    // Native <button> => focusable + Enter/Space operable by default (Req 18.5).
    const match = html.match(/<button[^>]*data-theme-toggle[^>]*>/i);
    expect(match, 'expected a <button data-theme-toggle>').not.toBeNull();
    // Guard against a regression to a non-button (e.g. div) click handler.
    expect(/<div[^>]*data-theme-toggle/i.test(html)).toBe(false);
  });

  it.each(LOCALES)('renders the language toggle as a native <a> link on the %s page', (locale) => {
    const html = rendered[locale];
    const match = html.match(/<a\b[^>]*data-language-toggle[^>]*>/i);
    expect(match, 'expected an <a data-language-toggle>').not.toBeNull();
    // Anchors are keyboard operable; must carry an href to be focusable. The
    // attribute order is not guaranteed, so check the matched tag for an href.
    expect(/\bhref=/i.test(match![0])).toBe(true);
  });

  it.each(LOCALES)('renders nav links as real anchors with hrefs on the %s page', (locale) => {
    const html = rendered[locale];
    const navLinks = html.match(/<a[^>]*data-nav-link[^>]*>/gi) ?? [];
    expect(navLinks.length).toBeGreaterThan(0);
    for (const link of navLinks) {
      expect(/\bhref=/i.test(link)).toBe(true);
    }
  });

  it.each(LOCALES)('renders the mobile menu control as a native <button> on the %s page', (locale) => {
    const html = rendered[locale];
    expect(/<button[^>]*data-nav-toggle[^>]*>/i.test(html)).toBe(true);
  });

  it('defines a visible :focus-visible indicator in global.css (Req 18.4)', () => {
    // The base layer must render a visible ring for keyboard focus.
    expect(/:focus-visible\s*\{/.test(globalCss)).toBe(true);
    const rule = globalCss.slice(globalCss.indexOf(':focus-visible'));
    // Ring is drawn with an outline using the focus color token.
    expect(/outline:[^;]*var\(--color-focus/i.test(rule)).toBe(true);
  });
});

describe('Accessibility: computed contrast for both themes (Req 18.6)', () => {
  // Normal text pairs must be >= 4.5:1; large text and the focus indicator >= 3:1.
  const AA_NORMAL = 4.5;
  const AA_LARGE = 3;

  const themes: Array<'dark' | 'light'> = ['dark', 'light'];

  it('resolves every semantic --color-* token to a hex value for both themes', () => {
    for (const theme of themes) {
      const colors = resolvedThemeColors(theme);
      // Sanity: the core roles must all resolve.
      for (const role of ['--color-bg', '--color-text', '--color-focus']) {
        expect(colors[role], `${theme} ${role}`).toMatch(/^#[0-9a-fA-F]{3,6}$/);
      }
    }
  });

  it.each(themes)('meets AA for normal text on the background in the %s theme', (theme) => {
    const c = resolvedThemeColors(theme);
    const bg = c['--color-bg'];
    // These roles carry normal-size body text on the page background.
    for (const role of ['--color-text', '--color-text-muted', '--color-text-subtle']) {
      const ratio = contrastRatio(c[role], bg);
      expect(ratio, `${theme} ${role} on --color-bg = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(
        AA_NORMAL,
      );
    }
  });

  it.each(themes)('meets AA for link/accent text on the background in the %s theme', (theme) => {
    const c = resolvedThemeColors(theme);
    const bg = c['--color-bg'];
    // Link and accent text roles used for normal-size text.
    for (const role of ['--color-link', '--color-accent-text']) {
      const ratio = contrastRatio(c[role], bg);
      expect(ratio, `${theme} ${role} on --color-bg = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(
        AA_NORMAL,
      );
    }
  });

  it.each(themes)('meets AA for text over the accent fill in the %s theme', (theme) => {
    const c = resolvedThemeColors(theme);
    // Text placed on the orange accent fill (e.g. primary CTA).
    const ratio = contrastRatio(c['--color-text-on-accent'], c['--color-accent']);
    expect(
      ratio,
      `${theme} --color-text-on-accent on --color-accent = ${ratio.toFixed(2)}:1`,
    ).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it.each(themes)('meets the 3:1 focus-indicator contrast in the %s theme', (theme) => {
    const c = resolvedThemeColors(theme);
    // Focus ring must contrast >= 3:1 against the page background (Req 18.4).
    const ratio = contrastRatio(c['--color-focus'], c['--color-bg']);
    expect(
      ratio,
      `${theme} --color-focus on --color-bg = ${ratio.toFixed(2)}:1`,
    ).toBeGreaterThanOrEqual(AA_LARGE);
  });
});

// --------------------------------------------------------------------------
// axe-core smoke scan (Req 18.4 / 18.6)
//
// axe-core needs a real DOM. We inject the container-rendered HTML into a jsdom
// document and run axe against it. If jsdom or axe cannot be loaded/run in this
// environment, the scan is skipped with a clear note rather than failing the
// suite — the deterministic structural + contrast checks above are the
// authoritative, always-on guarantees. Full WCAG AA also needs manual testing.
// --------------------------------------------------------------------------

async function loadAxeHarness(): Promise<
  | { run: (html: string) => Promise<{ violations: Array<{ id: string; impact?: string; nodes: unknown[] }> }> }
  | null
> {
  try {
    const { JSDOM } = await import('jsdom');
    const axeModule = await import('axe-core');
    const axe = (axeModule as unknown as { default?: unknown }).default ?? axeModule;

    const axeInstance = axe as {
      run: (
        ctx: unknown,
        opts: unknown,
      ) => Promise<{ violations: Array<{ id: string; impact?: string; nodes: unknown[] }> }>;
    };

    return {
      async run(html: string) {
        const dom = new JSDOM(html, { pretendToBeVisual: true });
        const { window } = dom;
        try {
          // axe-core (loaded in a non-browser env) deduces its window/document
          // from the context element's `ownerDocument`, so we pass an Element
          // (`documentElement`) — passing the Document itself fails because its
          // `ownerDocument` is null.
          return await axeInstance.run(window.document.documentElement, {
            // Run the WCAG 2 A/AA rule sets relevant to structure + contrast.
            runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
            // Color-contrast needs layout/paint jsdom doesn't provide; the
            // deterministic contrast tests above cover Req 18.6 instead.
            rules: { 'color-contrast': { enabled: false } },
          });
        } finally {
          window.close();
        }
      },
    };
  } catch {
    return null;
  }
}

describe('Accessibility: axe-core smoke scan on both locale pages (Req 18.4/18.6)', () => {
  it('reports no serious/critical axe violations, or is skipped if no DOM harness', async () => {
    const harness = await loadAxeHarness();
    if (!harness) {
      // eslint-disable-next-line no-console
      console.warn(
        'axe smoke scan skipped: jsdom/axe-core DOM harness unavailable in this ' +
          'environment. Deterministic structural + contrast assertions still cover ' +
          'Req 18.1/18.4/18.5/18.6. Full WCAG AA needs manual assistive-tech testing.',
      );
      expect(true).toBe(true);
      return;
    }

    for (const locale of LOCALES) {
      const html = await renderPage(locale);
      const result = await harness.run(html);
      const serious = result.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical',
      );
      const summary = serious
        .map((v) => `${v.id} (${v.impact}, ${v.nodes.length} node(s))`)
        .join('; ');
      expect(serious, `axe serious/critical violations on ${locale}: ${summary}`).toHaveLength(0);
    }
  });
});
