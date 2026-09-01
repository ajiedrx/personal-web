// Feature: personal-portfolio-web, Property 1: i18n key parity between locales
//
// Property 1 (design.md): For all leaf keys in either the English or the
// Indonesian dictionary, the key set of en.json equals the key set of id.json
// (every key present in one locale is present in the other).
//
// Validates: Requirements 5.5

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import en from './en.json';
import id from './id.json';
import { keysOf } from './locale';

type Dictionary = Record<string, unknown>;

/**
 * A leaf value for generated dictionaries. Kept simple (non-object primitives)
 * so `keysOf` treats each as a terminal dotted key.
 */
const leaf = fc.oneof(
  fc.string(),
  fc.integer(),
  fc.boolean(),
  fc.constant(null),
);

/**
 * Recursively generate a nested dictionary whose leaf keys are the union of
 * randomized names, deliberately mixing shallow leaves and nested objects
 * ("holes" of varying depth) to exercise `keysOf` enumeration.
 */
const dictionary: fc.Arbitrary<Dictionary> = fc.letrec<{ dict: Dictionary }>((tie) => ({
  dict: fc.dictionary(
    // Non-empty segment names without dots so paths stay unambiguous.
    fc.string({ minLength: 1, maxLength: 6 }).filter((s) => !s.includes('.')),
    fc.oneof({ maxDepth: 3 }, leaf, tie('dict')),
    { maxKeys: 6 },
  ),
})).dict;

describe('keysOf / i18n key parity', () => {
  it('Property 1: two locale dictionaries with an identical key set have equal keysOf sets', () => {
    fc.assert(
      fc.property(dictionary, (base) => {
        // Build a second locale dictionary that mirrors the exact structure of
        // `base` but with different leaf values (as a real translation would).
        // Parity must depend only on the key set, never on the values.
        const mirror = (node: Dictionary): Dictionary => {
          const out: Dictionary = {};
          for (const [name, value] of Object.entries(node)) {
            out[name] =
              value !== null && typeof value === 'object' && !Array.isArray(value)
                ? mirror(value as Dictionary)
                : `translated:${name}`;
          }
          return out;
        };

        const enKeys = new Set(keysOf(base));
        const idKeys = new Set(keysOf(mirror(base)));

        // Same key set regardless of leaf values.
        expect(idKeys).toEqual(enKeys);
        // Every key present in one locale is present in the other.
        for (const key of enKeys) expect(idKeys.has(key)).toBe(true);
        for (const key of idKeys) expect(enKeys.has(key)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('Property 1: introducing a hole (dropping a key) is detected as a parity violation', () => {
    fc.assert(
      fc.property(dictionary, (base) => {
        const enKeys = keysOf(base);
        // Only meaningful when there is at least one key to drop.
        fc.pre(enKeys.length > 0);

        // Remove one leaf key from a deep clone to simulate translation drift.
        const dropKey = enKeys[0]!;
        const clone: Dictionary = structuredClone(base);
        const segments = dropKey.split('.');
        let cursor: Dictionary = clone;
        for (let i = 0; i < segments.length - 1; i += 1) {
          cursor = cursor[segments[i]!] as Dictionary;
        }
        delete cursor[segments[segments.length - 1]!];

        const withHole = new Set(keysOf(clone));
        const full = new Set(enKeys);

        // The dropped key must no longer appear, so the sets differ: a hole is
        // observable, which is what the parity guard relies on.
        expect(withHole.has(dropKey)).toBe(false);
        expect(withHole).not.toEqual(full);
      }),
      { numRuns: 100 },
    );
  });

  it('the real en.json and id.json have identical key sets', () => {
    const enKeys = new Set(keysOf(en as Dictionary));
    const idKeys = new Set(keysOf(id as Dictionary));

    const missingInId = [...enKeys].filter((k) => !idKeys.has(k));
    const missingInEn = [...idKeys].filter((k) => !enKeys.has(k));

    expect(missingInId, `keys missing in id.json: ${missingInId.join(', ')}`).toEqual([]);
    expect(missingInEn, `keys missing in en.json: ${missingInEn.join(', ')}`).toEqual([]);
    expect(idKeys).toEqual(enKeys);
  });
});
