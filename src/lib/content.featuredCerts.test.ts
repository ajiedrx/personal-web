import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { featuredCertifications } from './content';
import type { CertificationEntry, CertStatus } from '../content/types';

// Feature: personal-portfolio-web, Property 5: Featured-only certification filtering, independent of status
//
// For any list of certification records with arbitrary active/expired statuses,
// featuredCertifications(list) returns exactly the records whose `featured` flag
// is set — including every featured record regardless of status and excluding
// every non-featured record.
//
// Validates: Requirements 14.4, 14.7

const certStatusArb: fc.Arbitrary<CertStatus> = fc.constantFrom<CertStatus>(
  'active',
  'expired',
);

/**
 * Generate a certification record with random `featured` flags and random
 * active/expired status. Optional detail fields are randomized too so the
 * filter is exercised against fully-populated and minimal records alike.
 */
const certificationArb: fc.Arbitrary<CertificationEntry> = fc.record({
  title: fc.string(),
  issuer: fc.string(),
  issuedDate: fc.string(),
  expiryDate: fc.option(fc.string(), { nil: undefined }),
  credentialId: fc.option(fc.string(), { nil: undefined }),
  skills: fc.option(fc.array(fc.string()), { nil: undefined }),
  featured: fc.boolean(),
  status: certStatusArb,
  showDetails: fc.option(fc.boolean(), { nil: undefined }),
});

const certificationListArb = fc.array(certificationArb, { maxLength: 30 });

describe('Property 5: Featured-only certification filtering, independent of status', () => {
  it('returns exactly the featured records, regardless of active/expired status', () => {
    fc.assert(
      fc.property(certificationListArb, (list) => {
        const result = featuredCertifications(list);

        // Every kept record is featured (excludes non-featured records).
        expect(result.every((c) => c.featured === true)).toBe(true);

        // Every featured record from the input is kept, whatever its status.
        const expected = list.filter((c) => c.featured === true);
        expect(result).toEqual(expected);

        // No non-featured record leaks through, and count matches exactly.
        expect(result.length).toBe(expected.length);
      }),
      { numRuns: 100 },
    );
  });

  it('keeps featured records independent of status (active and expired alike)', () => {
    fc.assert(
      fc.property(certificationListArb, (list) => {
        const result = featuredCertifications(list);

        // Status distribution among featured records is preserved: filtering is
        // driven solely by `featured`, never by `status`.
        const featuredActive = list.filter(
          (c) => c.featured === true && c.status === 'active',
        ).length;
        const featuredExpired = list.filter(
          (c) => c.featured === true && c.status === 'expired',
        ).length;

        expect(result.filter((c) => c.status === 'active').length).toBe(
          featuredActive,
        );
        expect(result.filter((c) => c.status === 'expired').length).toBe(
          featuredExpired,
        );
      }),
      { numRuns: 100 },
    );
  });
});
