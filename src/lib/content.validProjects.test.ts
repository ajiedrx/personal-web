// Feature: personal-portfolio-web, Property 4: Valid-project filtering preserves order and validity
//
// Property 4 (design.md): For any list of (possibly malformed) project records,
// validProjects(list) returns exactly those records that have a non-empty
// title, a non-empty selling description, a repository link, and between 1 and
// 10 tech-stack chips; it drops all others and preserves the source order of
// the kept records.
//
// Validates: Requirements 12.1, 12.3, 12.4

import { describe, expect, it, vi } from 'vitest';
import fc from 'fast-check';
import type { Project } from '../content/types';
import { MAX_TECH_STACK, MIN_TECH_STACK, isValidProject, validProjects } from './content';

/**
 * Independent oracle for validity, written from the acceptance criteria rather
 * than reusing the implementation's `isValidProject`. A record is valid iff it
 * is an object with a non-empty (non-whitespace) title, a non-empty
 * description, a non-empty repoUrl, and a tech-stack array whose length is in
 * the inclusive range [1, 10].
 */
function oracleIsValid(p: Partial<Project> | null | undefined): boolean {
  if (p === null || typeof p !== 'object') return false;
  const hasText = (v: unknown): boolean => typeof v === 'string' && v.trim().length > 0;
  if (!hasText(p.title)) return false;
  if (!hasText(p.description)) return false;
  if (!hasText(p.repoUrl)) return false;
  if (!Array.isArray(p.techStack)) return false;
  return p.techStack.length >= 1 && p.techStack.length <= 10;
}

/** A "good" text value: guaranteed non-empty and non-whitespace. */
const nonEmptyText = fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0);

/** A text value that fails the non-empty check: '' or whitespace-only. */
const emptyText = fc.constantFrom('', ' ', '   ', '\t', '\n', '  \t\n ');

/**
 * A well-formed, valid project record: non-empty title/description/repoUrl and
 * 1..10 chips.
 */
const validProjectArb: fc.Arbitrary<Partial<Project>> = fc.record({
  title: nonEmptyText,
  description: nonEmptyText,
  repoUrl: nonEmptyText,
  techStack: fc.array(fc.string(), { minLength: MIN_TECH_STACK, maxLength: MAX_TECH_STACK }),
});

/**
 * A malformed project record. Each generated record violates at least one rule:
 * missing/empty title, missing/empty description, missing/empty repoUrl, a
 * non-array techStack, or a chip count of 0 or >10. Fields are individually
 * randomized so many distinct failure shapes (and combinations) are covered.
 */
const malformedProjectArb: fc.Arbitrary<Partial<Project>> = fc
  .record(
    {
      title: fc.oneof(nonEmptyText, emptyText, fc.constant(undefined)),
      description: fc.oneof(nonEmptyText, emptyText, fc.constant(undefined)),
      repoUrl: fc.oneof(nonEmptyText, emptyText, fc.constant(undefined)),
      techStack: fc.oneof(
        // Out-of-range chip counts: 0, or 11..15.
        fc.array(fc.string(), { minLength: 0, maxLength: 0 }),
        fc.array(fc.string(), { minLength: MAX_TECH_STACK + 1, maxLength: 15 }),
        // In-range chip counts (so the *other* fields carry the violation).
        fc.array(fc.string(), { minLength: MIN_TECH_STACK, maxLength: MAX_TECH_STACK }),
        // Non-array techStack.
        fc.constant(undefined),
      ),
    },
    { withDeletedKeys: true },
  )
  // Keep only records the oracle rejects; discard accidental valid ones.
  .filter((p) => !oracleIsValid(p));

/** Any project record, valid or malformed, with random chip counts. */
const anyProjectArb: fc.Arbitrary<Partial<Project>> = fc.oneof(
  validProjectArb,
  malformedProjectArb,
);

describe('validProjects / valid-project filtering', () => {
  it('Property 4: keeps exactly the oracle-valid records and preserves their order', () => {
    fc.assert(
      fc.property(fc.array(anyProjectArb, { maxLength: 30 }), (all) => {
        // Suppress the build-time warning for omitted records during the run.
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        try {
          const kept = validProjects(all);
          const expected = all.filter(oracleIsValid);

          // Same records, same relative order (reference equality per element).
          expect(kept).toEqual(expected);
          expect(kept.length).toBe(expected.length);
          for (let i = 0; i < kept.length; i += 1) {
            expect(kept[i]).toBe(expected[i]);
          }

          // Every kept record is genuinely valid; nothing invalid slipped in.
          for (const project of kept) {
            expect(oracleIsValid(project)).toBe(true);
            expect(isValidProject(project)).toBe(true);
          }

          // Order preservation: the kept records appear as a subsequence of the
          // original list in the same order.
          let cursor = 0;
          for (const original of all) {
            if (cursor < kept.length && original === kept[cursor]) {
              cursor += 1;
            }
          }
          expect(cursor).toBe(kept.length);
        } finally {
          warnSpy.mockRestore();
        }
      }),
      { numRuns: 100 },
    );
  });

  it('Property 4: drops every malformed record (including chip counts 0 and >10)', () => {
    fc.assert(
      fc.property(fc.array(malformedProjectArb, { maxLength: 20 }), (bad) => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        try {
          expect(validProjects(bad)).toEqual([]);
        } finally {
          warnSpy.mockRestore();
        }
      }),
      { numRuns: 100 },
    );
  });

  it('Property 4: keeps every valid record unchanged and in order', () => {
    fc.assert(
      fc.property(fc.array(validProjectArb, { maxLength: 20 }), (good) => {
        expect(validProjects(good)).toEqual(good);
      }),
      { numRuns: 100 },
    );
  });

  it('Property 4: idempotent — filtering an already-filtered list is a no-op', () => {
    fc.assert(
      fc.property(fc.array(anyProjectArb, { maxLength: 30 }), (all) => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        try {
          const once = validProjects(all);
          const twice = validProjects(once);
          expect(twice).toEqual(once);
        } finally {
          warnSpy.mockRestore();
        }
      }),
      { numRuns: 100 },
    );
  });

  it('rejects a boundary chip count of exactly 11 and accepts exactly 10 / exactly 1', () => {
    const base = { title: 't', description: 'd', repoUrl: 'https://x' };
    expect(isValidProject({ ...base, techStack: Array(11).fill('c') })).toBe(false);
    expect(isValidProject({ ...base, techStack: Array(10).fill('c') })).toBe(true);
    expect(isValidProject({ ...base, techStack: ['c'] })).toBe(true);
    expect(isValidProject({ ...base, techStack: [] })).toBe(false);
  });
});
