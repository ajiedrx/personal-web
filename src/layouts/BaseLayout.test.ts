import { describe, it, expect, beforeAll } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import BaseLayout from './BaseLayout.astro';
import type { Locale } from '../i18n/locale';
import { LOCALES } from '../i18n/locale';
import { buildTitle, buildDescription, buildOgTags, buildPersonJsonLd, OWNER } from '../lib/seo';

// Output tests for BaseLayout `<head>` metadata and `<html lang>` (Task 8.3).
//
// Validates: Requirements 5.4, 20.1, 20.2, 20.4
//
// Rendering strategy: BaseLayout is a full `.astro` page component (it imports
// the CSS token/theme layer and emits a whole `<html>` document). Astro's
// `experimental_AstroContainer` renders it to an HTML string in-process, so we
// can assert on the *real* produced markup — the `<html lang>`, `<title>`, meta
// description, Open Graph `<meta property>` tags, and the Person JSON-LD script.
//
// The pure `seo.ts` builders own the per-locale content, so we assert the
// rendered document against those builders (independent oracle) rather than
// hard-coding locale strings here. A few builder-level assertions are kept
// alongside to pin the exact canonical/OG URL shape (single `/personal-web/`
// segment) that Task 8 fixed.

/** Render BaseLayout for a locale to its full HTML string. */
async function renderBaseLayout(locale: Locale): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(BaseLayout, { props: { locale } });
}

/** Extract the JSON-LD payload from the `application/ld+json` script block. */
function extractJsonLd(html: string): unknown {
  const match = html.match(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i,
  );
  expect(match, 'expected a JSON-LD script block in the rendered <head>').not.toBeNull();
  // The block must parse as valid JSON — this is the core of Req 20.4.
  return JSON.parse(match![1]);
}

/** Read the value of a `<meta property="…" content="…">` tag from HTML. */
function ogContent(html: string, property: string): string | null {
  // Meta tags render attributes in source order (property then content).
  const re = new RegExp(
    `<meta[^>]*property="${property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*content="([^"]*)"[^>]*>`,
    'i',
  );
  const match = html.match(re);
  return match ? match[1] : null;
}

describe('BaseLayout rendered <head> and lang (container rendering)', () => {
  const rendered: Record<Locale, string> = { en: '', id: '' };

  beforeAll(async () => {
    rendered.en = await renderBaseLayout('en');
    rendered.id = await renderBaseLayout('id');
  });

  it.each(LOCALES)('sets <html lang="%s"> for the locale (Req 5.4)', (locale) => {
    const html = rendered[locale];
    // `en` at `/`, `id` at `/id/` — the lang attribute must equal the locale.
    const langMatch = html.match(/<html[^>]*\blang="([^"]*)"/i);
    expect(langMatch, 'expected <html lang="…"> in output').not.toBeNull();
    expect(langMatch![1]).toBe(locale);
  });

  it.each(LOCALES)('renders the per-locale <title> (Req 20.1) for %s', (locale) => {
    const html = rendered[locale];
    const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
    expect(titleMatch, 'expected a <title> element').not.toBeNull();
    expect(titleMatch![1].trim()).toBe(buildTitle(locale));
  });

  it.each(LOCALES)('renders the per-locale meta description (Req 20.1) for %s', (locale) => {
    const html = rendered[locale];
    const descRe = /<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i;
    const match = html.match(descRe);
    expect(match, 'expected a meta description').not.toBeNull();
    expect(match![1]).toBe(buildDescription(locale));
  });

  it.each(LOCALES)('renders every Open Graph tag (Req 20.2) for %s', (locale) => {
    const html = rendered[locale];
    for (const tag of buildOgTags(locale)) {
      expect(ogContent(html, tag.property), `og tag ${tag.property}`).toBe(tag.content);
    }
  });

  it.each(LOCALES)('renders valid Person JSON-LD (Req 20.4) for %s', (locale) => {
    const html = rendered[locale];
    const jsonLd = extractJsonLd(html) as Record<string, unknown>;

    // Structured data must describe the owner as a schema.org Person.
    expect(jsonLd['@context']).toBe('https://schema.org');
    expect(jsonLd['@type']).toBe('Person');
    expect(jsonLd.name).toBe(OWNER.name);
    expect(jsonLd.jobTitle).toBe('Full-Stack Mobile Engineer');
    // The rendered JSON-LD must match the builder exactly for the locale.
    expect(jsonLd).toEqual(
      JSON.parse(JSON.stringify(buildPersonJsonLd(locale))),
    );
  });

  it.each(LOCALES)('emits a canonical link with exactly one /personal-web/ segment for %s', (locale) => {
    const html = rendered[locale];
    const match = html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]*)"[^>]*>/i);
    expect(match, 'expected a canonical <link>').not.toBeNull();
    const href = match![1];
    // Base path must appear once (Task 8 fix: no doubled `/personal-web/`).
    expect(href.match(/\/personal-web\//g)?.length ?? 0).toBe(1);
    expect(href.startsWith('https://ajiedrx.github.io/personal-web/')).toBe(true);
    if (locale === 'id') expect(href).toContain('/personal-web/id/');
  });
});

describe('SEO builders per-locale exactness (Req 20.1, 20.2, 20.4)', () => {
  it('builds distinct og:url per locale, each with a single /personal-web/ segment', () => {
    const enUrl = buildOgTags('en').find((t) => t.property === 'og:url')!.content;
    const idUrl = buildOgTags('id').find((t) => t.property === 'og:url')!.content;

    expect(enUrl).toBe('https://ajiedrx.github.io/personal-web/');
    expect(idUrl).toBe('https://ajiedrx.github.io/personal-web/id/');
    for (const url of [enUrl, idUrl]) {
      expect(url.match(/\/personal-web\//g)?.length ?? 0).toBe(1);
    }
  });

  it('builds og:image under the base with a single /personal-web/ segment', () => {
    for (const locale of LOCALES) {
      const image = buildOgTags(locale).find((t) => t.property === 'og:image')!.content;
      expect(image).toBe('https://ajiedrx.github.io/personal-web/og-image.png');
      expect(image.match(/\/personal-web\//g)?.length ?? 0).toBe(1);
    }
  });

  it('sets the correct og:locale per locale', () => {
    expect(buildOgTags('en').find((t) => t.property === 'og:locale')!.content).toBe('en_US');
    expect(buildOgTags('id').find((t) => t.property === 'og:locale')!.content).toBe('id_ID');
  });
});
