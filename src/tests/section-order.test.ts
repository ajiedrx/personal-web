import { describe, it, expect, beforeAll } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import EnPage from '../pages/index.astro';
import IdPage from '../pages/id/index.astro';
import { LOCALES, type Locale } from '../i18n/locale';

// Structural test for locale-page section order and anchors (Task 19.2).
//
// Validates: Requirements 3.2, 3.3, 5.5
//
// Rendering strategy: the locale pages (`src/pages/index.astro` for EN and
// `src/pages/id/index.astro` for ID) each compose the nine sections inside
// BaseLayout. Astro's `experimental_AstroContainer` renders a page component to
// a full HTML string in-process — the same approach BaseLayout.test.ts uses for
// the whole `<html>` document — so these assertions run against the *real*
// produced markup rather than re-deriving the composition. Rendering the pages
// (not the individual sections) is what proves the canonical order is actually
// wired in the pages, and that both locales wire the identical order.
//
// The nine sections in their fixed canonical order (Req 3.2). Eight are
// navigable `<section>` landmarks that each own a unique anchor id (Req 3.3);
// the closing Footer is a `<footer>` landmark with no navigable anchor id, so
// it is represented here as a positional marker rather than an anchor.
const NAVIGABLE_SECTION_IDS = [
  'hero',
  'about',
  'expertise',
  'experience',
  'projects',
  'impact',
  'education',
  'contact',
] as const;

/** Render a locale page component to its full HTML string. */
async function renderPage(locale: Locale): Promise<string> {
  const container = await AstroContainer.create();
  const Page = locale === 'en' ? EnPage : IdPage;
  return container.renderToString(Page);
}

/**
 * Extract the `id` of every `<section id="…">` in document order. This mirrors
 * the "navigable Section" landmark the sections render (`<section id="…">`); the
 * Footer uses `<footer>` and is intentionally excluded.
 */
function sectionIdsInOrder(html: string): string[] {
  const ids: string[] = [];
  const re = /<section\b[^>]*\bid="([^"]*)"[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    ids.push(match[1]);
  }
  return ids;
}

/** True when a `<footer …>` landmark is present in the rendered markup. */
function hasFooterLandmark(html: string): boolean {
  return /<footer\b[^>]*>/i.test(html);
}

describe('Locale page section order and anchors (container rendering)', () => {
  const rendered: Record<Locale, string> = { en: '', id: '' };

  beforeAll(async () => {
    rendered.en = await renderPage('en');
    rendered.id = await renderPage('id');
  });

  it.each(LOCALES)(
    'renders the navigable sections in the fixed canonical order (Req 3.2) for %s',
    (locale) => {
      const ids = sectionIdsInOrder(rendered[locale]);
      expect(ids).toEqual([...NAVIGABLE_SECTION_IDS]);
    },
  );

  it.each(LOCALES)(
    'renders the closing Footer landmark after the last section (Req 3.2) for %s',
    (locale) => {
      const html = rendered[locale];
      expect(hasFooterLandmark(html)).toBe(true);
      // Footer must come after the final navigable section (#contact).
      const lastSectionIdx = html.lastIndexOf('id="contact"');
      const footerIdx = html.search(/<footer\b[^>]*>/i);
      expect(lastSectionIdx).toBeGreaterThanOrEqual(0);
      expect(footerIdx).toBeGreaterThan(lastSectionIdx);
    },
  );

  it.each(LOCALES)(
    'assigns a unique anchor id to each navigable section (Req 3.3) for %s',
    (locale) => {
      const ids = sectionIdsInOrder(rendered[locale]);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.length).toBe(NAVIGABLE_SECTION_IDS.length);
    },
  );

  it('renders the identical section order across both locales (Req 5.5)', () => {
    expect(sectionIdsInOrder(rendered.en)).toEqual(sectionIdsInOrder(rendered.id));
  });
});
