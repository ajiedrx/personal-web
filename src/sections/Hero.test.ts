import { describe, it, expect, beforeAll } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import Hero from './Hero.astro';
import { LOCALES, type Locale, t } from '../i18n/locale';

/**
 * Structural tests for the Hero section (Task 14.3).
 *
 * Validates:
 *   - Requirement 8.1: the Hero displays the owner name and the fixed role
 *     "Full-Stack Mobile Engineer".
 *   - Requirement 8.2: the Hero displays a short tagline sourced from the
 *     I18n_Store (`hero.tagline` via `t()`).
 *   - Requirement 8.3: the Hero displays a CTA link to the Featured Projects
 *     Section (`#projects`) and a CTA link to the Contact Section (`#contact`).
 *
 * Rendering strategy mirrors the other component/layout tests
 * (BaseLayout.test.ts, ThemeToggle.test.ts): Astro's
 * `experimental_AstroContainer` renders the `.astro` component to a real HTML
 * string in-process, so assertions run against the actually produced markup.
 *
 * The tagline is asserted against the `t()` helper (independent oracle) rather
 * than a hard-coded string, so the test tracks the I18n_Store per locale.
 */

/** A representative owner name used to assert Req 8.1 deterministically. */
const OWNER_NAME = 'Ajie Dibyo R.';

/** The fixed, non-localized role wording from Req 8.1. */
const ROLE = 'Full-Stack Mobile Engineer';

/** Render Hero for a locale (with an explicit owner name) to its HTML string. */
async function renderHero(locale: Locale): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(Hero, {
    props: { locale, ownerName: OWNER_NAME },
  });
}

/** Extract every `href` value from `<a …>` anchors in the rendered HTML. */
function anchorHrefs(html: string): string[] {
  const hrefs: string[] = [];
  const re = /<a\b[^>]*\bhref="([^"]*)"[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    hrefs.push(match[1]);
  }
  return hrefs;
}

describe('Hero section structural output (container rendering)', () => {
  const rendered: Record<Locale, string> = { en: '', id: '' };

  beforeAll(async () => {
    rendered.en = await renderHero('en');
    rendered.id = await renderHero('id');
  });

  it.each(LOCALES)('renders the owner name (Req 8.1) for %s', (locale) => {
    expect(rendered[locale]).toContain(OWNER_NAME);
  });

  it.each(LOCALES)(
    'renders the fixed role "Full-Stack Mobile Engineer" (Req 8.1) for %s',
    (locale) => {
      expect(rendered[locale]).toContain(ROLE);
    },
  );

  it.each(LOCALES)(
    'renders the tagline sourced from the I18n_Store (Req 8.2) for %s',
    (locale) => {
      const tagline = t(locale, 'hero.tagline');
      expect(tagline.length).toBeGreaterThan(0);
      expect(rendered[locale]).toContain(tagline);
    },
  );

  it.each(LOCALES)(
    'renders a CTA link targeting #projects (Req 8.3) for %s',
    (locale) => {
      expect(anchorHrefs(rendered[locale])).toContain('#projects');
    },
  );

  it.each(LOCALES)(
    'renders a CTA link targeting #contact (Req 8.3) for %s',
    (locale) => {
      expect(anchorHrefs(rendered[locale])).toContain('#contact');
    },
  );

  it.each(LOCALES)(
    'renders both CTAs with their localized labels (Req 8.2, 8.3) for %s',
    (locale) => {
      const html = rendered[locale];
      const projectsLabel = t(locale, 'hero.ctaProjects');
      const contactLabel = t(locale, 'hero.ctaContact');
      expect(html).toContain(projectsLabel);
      expect(html).toContain(contactLabel);
    },
  );
});
