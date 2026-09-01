import { describe, it, expect, beforeAll } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import Contact from './Contact.astro';
import profileData from '../content/profile.json';
import type { Profile } from '../content/types';
import { LOCALES, type Locale } from '../i18n/locale';
import { isRealEmail, isRealUrl, isRealSocial } from '../lib/content';

// Structural tests for the Contact Section (Task 18.3).
//
// Validates: Requirements 15.2, 15.3, 15.4
//
// Rendering strategy: Contact.astro is a section component that sources its
// contact values from the Content_Store (`profile.json`). Astro's
// `experimental_AstroContainer` renders it to an HTML string in-process, so we
// assert on the *real* produced markup rather than re-deriving it.
//
// The seeded `profile.json` intentionally carries placeholder scalars (an
// `example.com` email and a `.../placeholder` LinkedIn URL) alongside the
// verified GitHub profile, so the rendered document exercises both the
// "verified real link" path (GitHub, Req 15.2) and the "placeholder renders
// inert, never a broken target" path (Req 15.4) at once. The "real email wires
// a working mailto CTA" branch (Req 15.3) cannot be shown by the placeholder
// seed data, so that branch is pinned against the same placeholder-detection
// helpers the component uses (independent-logic oracle) rather than editing the
// shared content file.

const VERIFIED_GITHUB = 'https://github.com/ajiedrx';

/** Render Contact for a locale to its HTML string. */
async function renderContact(locale: Locale): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(Contact, { props: { locale } });
}

/** Collect the `href` value of every anchor in the rendered markup. */
function anchorHrefs(html: string): string[] {
  const hrefs: string[] = [];
  const re = /<a\b[^>]*\bhref="([^"]*)"[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    hrefs.push(match[1]);
  }
  return hrefs;
}

const profile = profileData as Profile;

describe('Contact section rendered markup (container rendering)', () => {
  const rendered: Record<Locale, string> = { en: '', id: '' };

  beforeAll(async () => {
    rendered.en = await renderContact('en');
    rendered.id = await renderContact('id');
  });

  it.each(LOCALES)(
    'renders the verified GitHub profile link https://github.com/ajiedrx for %s (Req 15.2)',
    (locale) => {
      const html = rendered[locale];
      // The verified GitHub URL must be present as a real, wire-able anchor.
      expect(anchorHrefs(html)).toContain(VERIFIED_GITHUB);
      // Sanity: the seed data being rendered is the verified profile itself.
      expect(profile.contact.github).toBe(VERIFIED_GITHUB);
      expect(isRealUrl(profile.contact.github)).toBe(true);
    },
  );

  it.each(LOCALES)(
    'wires a working mailto CTA only when the email is real, else renders it inert for %s (Req 15.3, 15.4)',
    (locale) => {
      const html = rendered[locale];
      const ctaMatch = html.match(/<(a|span)\b[^>]*\bdata-contact-cta\b[^>]*>/i);
      expect(ctaMatch, 'expected a contact CTA control').not.toBeNull();
      const ctaTag = ctaMatch![0];

      if (isRealEmail(profile.contact.email)) {
        // Real email → the CTA is an anchor opening a mailto to that address.
        expect(ctaTag.startsWith('<a')).toBe(true);
        expect(anchorHrefs(html)).toContain(`mailto:${profile.contact.email}`);
      } else {
        // Placeholder email (seeded default) → the CTA is rendered inert: no
        // anchor, no href, and marked aria-disabled (Req 15.4).
        expect(ctaTag.startsWith('<span')).toBe(true);
        expect(ctaTag).toMatch(/aria-disabled="true"/);
        expect(anchorHrefs(html).some((h) => h.startsWith('mailto:'))).toBe(false);
      }
    },
  );

  it.each(LOCALES)(
    'never emits a broken link target for placeholder values for %s (Req 15.4)',
    (locale) => {
      const html = rendered[locale];

      // No anchor may point at a broken/empty target.
      for (const href of anchorHrefs(html)) {
        expect(href.trim().length).toBeGreaterThan(0);
        expect(href).not.toBe('#');
        expect(href.toLowerCase()).not.toBe('undefined');
        expect(href.toLowerCase()).not.toBe('null');
        // A placeholder value must never leak into a real href.
        expect(href).not.toContain('example.com');
        expect(href).not.toMatch(/\/placeholder\/?(?:["#?]|$)/i);
      }

      // The seeded LinkedIn is a placeholder: it must render inert (no anchor
      // carrying its URL), not as a broken/half link.
      if (!isRealUrl(profile.contact.linkedin)) {
        expect(anchorHrefs(html)).not.toContain(profile.contact.linkedin);
        expect(html).toMatch(/contact__value--inert[^>]*aria-disabled="true"|aria-disabled="true"[^>]*contact__value--inert/);
      }
    },
  );

  it.each(LOCALES)('renders the section landmark with an #contact anchor for %s', (locale) => {
    const html = rendered[locale];
    expect(html).toMatch(/<section\b[^>]*\bid="contact"/i);
  });
});

// The placeholder-detection helpers back the component's real-vs-inert
// decision. Rendering the seeded profile only exercises the placeholder-email
// branch, so pin the "real email → wired mailto" contract (Req 15.3) directly.
describe('Contact CTA wiring logic (Req 15.3, 15.4)', () => {
  it('treats a real email as wire-able and a placeholder email as inert', () => {
    // Real, wire-able address.
    expect(isRealEmail('ajie@ajiedrx.dev')).toBe(true);
    // Placeholder shapes seeded in profile.json.
    expect(isRealEmail('hello@example.com')).toBe(false);
    expect(isRealEmail('')).toBe(false);
    expect(isRealEmail('   ')).toBe(false);
    expect(isRealEmail(undefined)).toBe(false);
    // Malformed values are inert, never a broken mailto target.
    expect(isRealEmail('not-an-email')).toBe(false);
  });

  it('treats a real profile URL as wire-able and placeholder URLs as inert', () => {
    expect(isRealUrl('https://github.com/ajiedrx')).toBe(true);
    expect(isRealUrl('https://www.linkedin.com/in/placeholder')).toBe(false);
    expect(isRealUrl('https://example.com/me')).toBe(false);
    expect(isRealUrl('')).toBe(false);
    expect(isRealUrl(undefined)).toBe(false);
  });

  it('honors the explicit isPlaceholder flag on social links (Req 15.4)', () => {
    expect(isRealSocial({ label: 'Mastodon', url: 'https://mas.to/@ajiedrx' })).toBe(true);
    expect(
      isRealSocial({ label: 'Mastodon', url: 'https://mas.to/@ajiedrx', isPlaceholder: true }),
    ).toBe(false);
    expect(isRealSocial({ label: 'X', url: 'https://example.com/x' })).toBe(false);
  });
});
