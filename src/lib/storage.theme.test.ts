// Feature: personal-portfolio-web, Property 3: Theme preference round-trip
//
// Property 3 (design.md): For any theme in {dark, light}, calling
// persistTheme(theme) and then readStoredTheme() returns the same theme.
//
// Validates: Requirements 7.5, 7.7

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { type StorageLike, type Theme, persistTheme, readStoredTheme } from './storage';

/**
 * A minimal, in-memory {@link StorageLike} backend for the round-trip test.
 *
 * Backing the getItem/setItem pair with a `Map` lets the property run entirely
 * in-process — no `localStorage`, no DOM — while still exercising the real
 * persist/read code paths (which delegate to the injected backend).
 */
function memoryStorage(): StorageLike {
  const store = new Map<string, string>();
  return {
    getItem: (key) => (store.has(key) ? (store.get(key) as string) : null),
    setItem: (key, value) => {
      store.set(key, value);
    },
  };
}

/** Arbitrary over the two supported themes. */
const themeArb: fc.Arbitrary<Theme> = fc.constantFrom<Theme>('dark', 'light');

describe('persistTheme / readStoredTheme round-trip', () => {
  it('Property 3: reading back a persisted theme returns the same theme', () => {
    fc.assert(
      fc.property(themeArb, (theme) => {
        // Fresh backend per case so no prior write can leak in.
        const storage = memoryStorage();
        persistTheme(theme, storage);
        expect(readStoredTheme(storage)).toBe(theme);
      }),
      { numRuns: 100 },
    );
  });
});
