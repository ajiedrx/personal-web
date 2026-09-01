// Feature: personal-portfolio-web, Property 8: Impact counter final value under reduced motion
//
// Property 8 (design.md): For any impact item, resolving its display value with
// reduced motion enabled returns exactly the item's final `value`.
//
// Validates: Requirements 13.3

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import { impactDisplayValue } from './content';
import type { ImpactItem } from '../content/types';

/**
 * Arbitrary `ImpactItem` records: a finite numeric final value, an optional
 * suffix, and a label key. The value generator spans negatives, zero, and
 * large magnitudes so the property holds across the whole numeric input space.
 */
const impactItem: fc.Arbitrary<ImpactItem> = fc.record(
  {
    value: fc.oneof(
      fc.integer(),
      fc.double({ noNaN: true, noDefaultInfinity: true }),
    ),
    suffix: fc.option(fc.string(), { nil: undefined }),
    labelKey: fc.string(),
  },
  { requiredKeys: ['value', 'labelKey'] },
);

describe('impactDisplayValue / reduced-motion final value (Property 8)', () => {
  it('returns exactly the final value when reduced motion is enabled', () => {
    fc.assert(
      fc.property(impactItem, (item) => {
        expect(impactDisplayValue(item, true)).toBe(item.value);
      }),
      { numRuns: 100 },
    );
  });
});
