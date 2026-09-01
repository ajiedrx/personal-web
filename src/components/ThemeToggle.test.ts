import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import ThemeToggle from './ThemeToggle.astro';
import { readStoredTheme, type StorageLike, type Theme } from '../lib/storage';
import { LOCALES, type Locale } from '../i18n/locale';

/**
 * Unit tests for the ThemeToggle island's defaults and reduced-motion behavior
 * (Task 9.2).
 *
 * Validates:
 *   - Requirement 7.8: with no stored Theme_Preference, the dark theme is the
 *     applied default.
 *   - Requirement 7.9: under `prefers-reduced-motion: reduce` the theme switch
 *     produces no ripple / reveal animation.
 *
 * The interactive behavior lives in the component's client `<script>` block,
 * which Astro bundles for the browser and is therefore not importable here.
 * These tests instead pin the *observable contracts* the island depends on,
 * across the three artifacts that actually ship:
 *
 *   1. The server-rendered markup (via `experimental_AstroContainer`) reflects
 *      the dark default and carries no ripple overlay at rest.
 *   2. The pure `readStoredTheme` helper — which the island calls on load to
 *      pick the applied theme — resolves "no / invalid preference" to `null`,
 *      the signal that drives the dark default.
 *   3. The shared `motion.css` reduced-motion guard disables the ripple /
 *      reveal animation the island triggers, so a switch under reduced motion
 *      renders instantly with no animation.
 */

/** Render ThemeToggle for a locale to its HTML string. */
async function renderThemeToggle(locale?: Locale): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(ThemeToggle, {
    props: locale ? { locale } : {},
  });
}

/** Read the value of an attribute from the (single) rendered `<button>`. */
function buttonAttr(html: string, attr: string): string | null {
  const re = new RegExp(
    `<button[^>]*\\b${attr}="([^"]*)"[^>]*>`,
    'i',
  );
  const match = html.match(re);
  return match ? match[1] : null;
}

describe('ThemeToggle dark default (Req 7.8)', () => {
  const rendered: Record<Locale, string> = { en: '', id: '' };

  beforeAll(async () => {
    rendered.en = await renderThemeToggle('en');
    rendered.id = await renderThemeToggle('id');
  });

  it.each(LOCALES)(
    'server-renders in the dark-active state (aria-pressed="false") for %s',
    (locale) => {
      // `aria-pressed` reflects "light is on"; dark default → false (Req 7.8).
      expect(buttonAttr(rendered[locale], 'aria-pressed')).toBe('false');
    },
  );

  it.each(LOCALES)(
    'default accessible label offers switching to light (dark is active) for %s',
    (locale) => {
      const html = rendered[locale];
      const label = buttonAttr(html, 'aria-label');
      // With dark active by default, the action offered is "switch to light".
      expect(label).toBe(buttonAttr(html, 'data-label-to-light'));
      // And it is distinct from the "switch to dark" label.
      expect(label).not.toBe(buttonAttr(html, 'data-label-to-dark'));
    },
  );

  it('defaults the locale to English when no locale prop is passed', async () => {
    const html = await renderThemeToggle();
    // English "switch to light" label proves the EN default path (Req 7.1).
    expect(buttonAttr(html, 'aria-label')).toBe('Switch to light theme');
  });

  it('renders no ripple overlay in the initial markup (Req 7.9 at rest)', () => {
    for (const locale of LOCALES) {
      expect(rendered[locale]).not.toContain('theme-ripple-overlay');
    }
  });
});

describe('readStoredTheme resolves to the dark default signal (Req 7.8)', () => {
  /** In-memory storage seeded with an optional raw stored value. */
  function memoryStorage(seed?: string | null): StorageLike {
    const store = new Map<string, string>();
    if (typeof seed === 'string') store.set('theme', seed);
    return {
      getItem: (key) => (store.has(key) ? (store.get(key) as string) : null),
      setItem: (key, value) => {
        store.set(key, value);
      },
    };
  }

  it('returns null when no preference is stored (→ apply dark)', () => {
    expect(readStoredTheme(memoryStorage())).toBeNull();
  });

  it('returns null for a stored value that is not a valid theme (→ apply dark)', () => {
    for (const bogus of ['', 'DARK', 'blue', 'system', 'null']) {
      expect(readStoredTheme(memoryStorage(bogus))).toBeNull();
    }
  });

  it('returns null when the storage read throws (→ apply dark)', () => {
    const throwingStorage: StorageLike = {
      getItem() {
        throw new Error('read blocked');
      },
      setItem() {
        /* unused */
      },
    };
    expect(readStoredTheme(throwingStorage)).toBeNull();
  });

  it('returns the stored theme only when a valid preference exists', () => {
    for (const theme of ['dark', 'light'] as Theme[]) {
      expect(readStoredTheme(memoryStorage(theme))).toBe(theme);
    }
  });
});

describe('reduced-motion suppresses the theme ripple/reveal (Req 7.9)', () => {
  let motionCss = '';

  beforeAll(() => {
    motionCss = readFileSync(
      fileURLToPath(new URL('../styles/motion.css', import.meta.url)),
      'utf8',
    );
  });

  /** Extract the body of the `@media (prefers-reduced-motion: reduce)` block. */
  function reducedMotionBlock(rawCss: string): string {
    // Strip `/* … */` comments first: motion.css mentions
    // "prefers-reduced-motion: reduce" in a header comment, which would
    // otherwise be matched instead of the real at-rule.
    const css = rawCss.replace(/\/\*[\s\S]*?\*\//g, '');
    const start = css.search(/@media\s*\(prefers-reduced-motion:\s*reduce\)/i);
    expect(start, 'expected a prefers-reduced-motion guard in motion.css').toBeGreaterThanOrEqual(0);
    // Walk braces from the block's opening `{` to find its matching close.
    const open = css.indexOf('{', start);
    let depth = 0;
    for (let i = open; i < css.length; i += 1) {
      if (css[i] === '{') depth += 1;
      else if (css[i] === '}') {
        depth -= 1;
        if (depth === 0) return css.slice(open + 1, i);
      }
    }
    throw new Error('unterminated @media block in motion.css');
  }

  it('defines the theme crossfade transition outside reduced motion (baseline)', () => {
    // The theme switch is a color crossfade: while `data-theme-switching` is set
    // on <html>, color-bearing properties transition to the new theme's values
    // (see motion.css + ThemeToggle). Assert that switch transition exists and
    // eases color/background-color over the theme-duration token.
    const switchRule = motionCss.match(
      /html\[data-theme-switching\][^{]*\{([^}]*)\}/,
    );
    expect(switchRule, 'expected an html[data-theme-switching] transition rule').not.toBeNull();
    expect(switchRule![1]).toMatch(/transition:/);
    expect(switchRule![1]).toMatch(/color/);
    expect(switchRule![1]).toMatch(/background-color/);
    expect(switchRule![1]).toMatch(/--motion-duration-theme/);
    // The old ripple overlay/clone machinery must be fully removed.
    expect(motionCss).not.toMatch(/theme-ripple-overlay/);
    expect(motionCss).not.toMatch(/theme-ripple-clone/);
    expect(motionCss).not.toMatch(/@keyframes\s+ripple-scale/);
  });

  it('collapses the crossfade transition under reduced motion (Req 7.9)', () => {
    const guard = reducedMotionBlock(motionCss);
    // Under reduced motion the switch transition must be effectively instant.
    const switchRule = guard.match(
      /html\[data-theme-switching\][^{]*\{([^}]*)\}/,
    );
    expect(switchRule, 'expected a reduced-motion switch override in the guard').not.toBeNull();
    expect(switchRule![1]).toMatch(/transition-duration:\s*0\.01ms\s*!important/);
  });

  it('collapses all animation/transition durations under reduced motion', () => {
    const guard = reducedMotionBlock(motionCss);
    // Global belt-and-braces: non-essential motion is effectively instant.
    expect(guard).toMatch(/animation-duration:\s*0\.01ms\s*!important/);
    expect(guard).toMatch(/transition-duration:\s*0\.01ms\s*!important/);
  });
});
