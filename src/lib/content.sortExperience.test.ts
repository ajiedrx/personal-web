// Feature: personal-portfolio-web, Property 7: Experience timeline is sorted most-recent-first and lossless
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { sortExperienceDesc } from './content';
import type { ExperienceEntry } from '../content/types';

/**
 * Property 7: Experience timeline is sorted most-recent-first and lossless.
 *
 * For any list of experience entries, `sortExperienceDesc(list)` returns a
 * permutation of the input (same multiset of entries) ordered so that start
 * dates are non-increasing, with an open-ended (`endDate === null`, "Present")
 * entry ordered no earlier than any entry it precedes by start date.
 *
 * **Validates: Requirements 11.1, 11.3**
 */

// A 'YYYY-MM' start date; also emit some free-form / unparseable strings so the
// generator explores the input space intelligently (valid ISO months plus edge
// cases the sort must tolerate).
const startDateArb: fc.Arbitrary<string> = fc.oneof(
  fc
    .record({
      year: fc.integer({ min: 1990, max: 2035 }),
      month: fc.integer({ min: 1, max: 12 }),
    })
    .map(({ year, month }) => `${year}-${String(month).padStart(2, '0')}`),
  // Plain year strings (Date.parse handles these).
  fc.integer({ min: 1990, max: 2035 }).map((y) => String(y)),
  // Unparseable strings must sort last (oldest) without throwing.
  fc.constantFrom('', 'not-a-date', 'Present', 'TBD'),
);

// endDate is a 'YYYY-MM'-ish string or null ("Present").
const endDateArb: fc.Arbitrary<string | null> = fc.oneof(
  fc.constant(null),
  fc
    .record({
      year: fc.integer({ min: 1990, max: 2035 }),
      month: fc.integer({ min: 1, max: 12 }),
    })
    .map(({ year, month }) => `${year}-${String(month).padStart(2, '0')}`),
);

const experienceEntryArb: fc.Arbitrary<ExperienceEntry> = fc.record({
  role: fc.string(),
  organization: fc.string(),
  startDate: startDateArb,
  endDate: endDateArb,
  highlights: fc.array(fc.string(), { maxLength: 4 }),
});

const experienceListArb: fc.Arbitrary<ExperienceEntry[]> = fc.array(
  experienceEntryArb,
  { maxLength: 12 },
);

/** Comparable rank for a start date; unparseable => -Infinity (oldest). */
function startRank(entry: ExperienceEntry): number {
  const parsed = Date.parse(entry.startDate);
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
}

/** Stable multiset key so we can compare input vs output ignoring order. */
function multisetKey(entry: ExperienceEntry): string {
  return JSON.stringify([
    entry.role,
    entry.organization,
    entry.startDate,
    entry.endDate,
    entry.highlights,
  ]);
}

function toSortedKeyCounts(entries: ExperienceEntry[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    const key = multisetKey(entry);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

describe('Property 7: Experience timeline is sorted most-recent-first and lossless', () => {
  it('returns a permutation of the input (same multiset of entries)', () => {
    fc.assert(
      fc.property(experienceListArb, (list) => {
        const sorted = sortExperienceDesc(list);

        // Same length.
        expect(sorted).toHaveLength(list.length);

        // Same multiset: every entry appears the same number of times.
        const inputCounts = toSortedKeyCounts(list);
        const outputCounts = toSortedKeyCounts(sorted);
        expect(outputCounts).toEqual(inputCounts);

        // Lossless: each output element is one of the original object references.
        const inputRefs = new Set(list);
        for (const entry of sorted) {
          expect(inputRefs.has(entry)).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('orders open-ended ("Present") entries no earlier than start-date-ordered entries', () => {
    fc.assert(
      fc.property(experienceListArb, (list) => {
        const sorted = sortExperienceDesc(list);

        for (let i = 0; i < sorted.length - 1; i += 1) {
          const current = sorted[i]!;
          const next = sorted[i + 1]!;

          const currentPresent = current.endDate === null;
          const nextPresent = next.endDate === null;

          // A "Present" entry never comes after a closed entry.
          if (!currentPresent && nextPresent) {
            throw new Error('closed entry ordered before an open-ended entry');
          }

          // Within the same open/closed group, start dates are non-increasing.
          if (currentPresent === nextPresent) {
            expect(startRank(current)).toBeGreaterThanOrEqual(startRank(next));
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});
