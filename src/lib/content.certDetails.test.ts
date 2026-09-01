import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { visibleCertificationDetails } from './content';
import type { CertificationEntry, CertStatus } from '../content/types';

// Feature: personal-portfolio-web, Property 6: Certification detail fields hidden unless enabled
//
// Validates: Requirements 14.6
//
// Property 6 (design.md): For any certification record, the set of visible detail fields excludes
// `expiryDate` and `credentialId` when `showDetails` is not enabled; when `showDetails` is enabled,
// present `expiryDate` and `credentialId` values are included.
//
// Generators produce arbitrary certification records with `showDetails` randomly true / false /
// undefined and with `expiryDate` / `credentialId` each independently present or absent, so both
// branches (opt-in disabled vs enabled) and the present/absent field combinations are exercised.

/** Optional string field: sometimes present, sometimes absent (undefined). */
const optionalString = fc.option(fc.string(), { nil: undefined });

/** `showDetails` may be true, false, or omitted (undefined) per the type. */
const showDetailsArb = fc.constantFrom<boolean | undefined>(true, false, undefined);

const certStatusArb = fc.constantFrom<CertStatus>('active', 'expired');

const certificationArb: fc.Arbitrary<CertificationEntry> = fc.record({
  title: fc.string(),
  issuer: fc.string(),
  issuedDate: fc.string(),
  expiryDate: optionalString,
  credentialId: optionalString,
  skills: fc.option(fc.array(fc.string()), { nil: undefined }),
  featured: fc.boolean(),
  status: certStatusArb,
  showDetails: showDetailsArb,
});

describe('Property 6: Certification detail fields hidden unless enabled', () => {
  it('excludes expiryDate/credentialId unless showDetails is enabled, then includes present values', () => {
    fc.assert(
      fc.property(certificationArb, (cert) => {
        const visible = visibleCertificationDetails(cert);

        if (cert.showDetails === true) {
          // Enabled: present values are included; absent values remain omitted.
          if (cert.expiryDate !== undefined) {
            expect(visible.expiryDate).toBe(cert.expiryDate);
          } else {
            expect('expiryDate' in visible).toBe(false);
          }

          if (cert.credentialId !== undefined) {
            expect(visible.credentialId).toBe(cert.credentialId);
          } else {
            expect('credentialId' in visible).toBe(false);
          }
        } else {
          // Not enabled (false or undefined): both detail fields are always excluded,
          // regardless of whether the record carries values for them.
          expect('expiryDate' in visible).toBe(false);
          expect('credentialId' in visible).toBe(false);
          expect(visible).toEqual({});
        }
      }),
      { numRuns: 100 },
    );
  });
});
