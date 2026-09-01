import { describe, it, expect, beforeAll } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import MentorshipEducation from './MentorshipEducation.astro';
import certificationsData from '../content/certifications.json';
import type { CertificationEntry } from '../content/types';
import { LOCALES, type Locale, t } from '../i18n/locale';
import { featuredCertifications, visibleCertificationDetails } from '../lib/content';

/**
 * Structural tests for the featured certifications group of the
 * Mentorship & Education Section (Task 17.3).
 *
 * Validates:
 *   - Requirement 14.5: for each featured Certification_Entry, the rendered
 *     markup shows the title, the issuing organization, and the issued year.
 *   - Requirement 14.6: the expiry date and credential identifier of a
 *     Certification_Entry are NOT displayed unless the Content_Store explicitly
 *     enables that display (`showDetails`).
 *
 * Rendering strategy mirrors the other section tests (Hero.test.ts,
 * Contact.test.ts, ProjectCard.test.ts): Astro's `experimental_AstroContainer`
 * renders the `.astro` component to a real HTML string in-process, so the
 * assertions run against the actually produced markup rather than re-deriving
 * it.
 *
 * The seeded `certifications.json` carries featured records whose `showDetails`
 * flag is unset — and at least one of those (the "iOS Developer Expert") also
 * carries an `expiryDate` — so rendering the real content exercises the
 * "hidden by default" branch of Req 14.6 directly. The complementary
 * "showDetails enabled → fields become visible" branch cannot be shown by the
 * seed data (no featured record opts in), so it is pinned against the same
 * `visibleCertificationDetails` helper the component uses (independent-logic
 * oracle) rather than editing the shared content file.
 */

const certifications = certificationsData as CertificationEntry[];
const featured = featuredCertifications(certifications);

/** Extract the issued year from an ISO 'YYYY-MM' / 'YYYY' date (mirrors the section). */
function yearOf(value: string): string {
  const match = /^(\d{4})/.exec(value.trim());
  return match ? match[1]! : value;
}

/** Render MentorshipEducation for a locale to its HTML string. */
async function renderSection(locale: Locale): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(MentorshipEducation, { props: { locale } });
}

describe('MentorshipEducation featured certifications rendered markup (container rendering)', () => {
  const rendered: Record<Locale, string> = { en: '', id: '' };

  beforeAll(async () => {
    rendered.en = await renderSection('en');
    rendered.id = await renderSection('id');
  });

  it('has at least one featured certification in the seed data (test precondition)', () => {
    expect(featured.length).toBeGreaterThan(0);
  });

  it.each(LOCALES)(
    'shows the title, issuer, and issued year for every featured certification for %s (Req 14.5)',
    (locale) => {
      const html = rendered[locale];
      for (const cert of featured) {
        expect(html).toContain(cert.title);
        expect(html).toContain(cert.issuer);
        expect(html).toContain(yearOf(cert.issuedDate));
      }
    },
  );

  it.each(LOCALES)(
    'renders the featured certifications under the localized group title for %s (Req 14.5)',
    (locale) => {
      const html = rendered[locale];
      expect(html).toContain(t(locale, 'education.certificationsTitle'));
    },
  );

  it.each(LOCALES)(
    'hides expiry date and credential id by default when showDetails is not enabled for %s (Req 14.6)',
    (locale) => {
      const html = rendered[locale];

      // Precondition: none of the seeded featured records opt into details, and
      // at least one carries an expiryDate that must therefore stay hidden.
      const optedIn = featured.filter((c) => c.showDetails === true);
      expect(optedIn.length).toBe(0);
      const withExpiry = featured.filter((c) => c.expiryDate !== undefined);
      expect(withExpiry.length).toBeGreaterThan(0);

      // The detail labels must not appear at all when nothing opts in.
      expect(html).not.toContain(t(locale, 'education.expiryLabel'));
      expect(html).not.toContain(t(locale, 'education.credentialLabel'));
      // The detail list container must not be emitted either.
      expect(html).not.toContain('education__cert-details');

      // No hidden expiry value or credential id may leak into the markup.
      for (const cert of featured) {
        if (cert.expiryDate !== undefined) {
          expect(html).not.toContain(`<dd>${cert.expiryDate}</dd>`);
        }
        if (cert.credentialId !== undefined) {
          expect(html).not.toContain(`<dd>${cert.credentialId}</dd>`);
        }
      }
    },
  );

  it.each(LOCALES)('renders the section landmark with an #education anchor for %s', (locale) => {
    const html = rendered[locale];
    expect(html).toMatch(/<section\b[^>]*\bid="education"/i);
  });
});

// Rendering the seed data only exercises the "hidden by default" branch of
// Req 14.6. Pin the complementary "showDetails enabled → present fields become
// visible, absent fields stay omitted" contract directly against the helper the
// section uses to compute visibility.
describe('certification detail visibility logic (Req 14.6)', () => {
  const base: CertificationEntry = {
    title: 'Example Cert',
    issuer: 'Example Issuer',
    issuedDate: '2024',
    featured: true,
    status: 'active',
  };

  it('omits expiry date and credential id when showDetails is not enabled', () => {
    const cert: CertificationEntry = {
      ...base,
      expiryDate: '2027',
      credentialId: 'ABC-123',
    };
    expect(visibleCertificationDetails(cert)).toEqual({});
    expect(visibleCertificationDetails({ ...cert, showDetails: false })).toEqual({});
  });

  it('exposes present expiry date and credential id when showDetails is enabled', () => {
    const cert: CertificationEntry = {
      ...base,
      expiryDate: '2027',
      credentialId: 'ABC-123',
      showDetails: true,
    };
    expect(visibleCertificationDetails(cert)).toEqual({
      expiryDate: '2027',
      credentialId: 'ABC-123',
    });
  });

  it('keeps absent detail fields omitted even when showDetails is enabled', () => {
    expect(visibleCertificationDetails({ ...base, showDetails: true })).toEqual({});
    expect(
      visibleCertificationDetails({ ...base, showDetails: true, expiryDate: '2027' }),
    ).toEqual({ expiryDate: '2027' });
  });
});
