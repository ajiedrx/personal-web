// Feature: personal-portfolio-web, Property 9: Language preference round-trip
//
// Property 9 (design.md): For any language in {en, id}, calling
// persistLanguage(lang) then readStoredLanguage() returns the same language.
//
// Validates: Requirements 6.3, 6.4

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import { persistLanguage, readStoredLanguage, type StorageLike } from './storage';
import type { Locale } from '../i18n/locale';

/**
 * An in-memory {@link StorageLike} stub backed by a `Map`, so the round-trip is
 * exercised without touching the real DOM `localStorage`.
 */
function createMemoryStorage(): StorageLike {
  const store = new Map<string, string>();
  return {
    getItem: (key) => (store.has(key) ? (store.get(key) as string) : null),
    setItem: (key, value) => {
      store.set(key, value);
    },
  };
}

/** Arbitrary over the supported locales. */
const locale: fc.Arbitrary<Locale> = fc.constantFrom<Locale>('en', 'id');

describe('persistLanguage / readStoredLanguage round-trip (Property 9)', () => {
  it('reads back exactly the language that was persisted', () => {
    fc.assert(
      fc.property(locale, (lang) => {
        const storage = createMemoryStorage();
        persistLanguage(lang, storage);
        expect(readStoredLanguage(storage)).toBe(lang);
      }),
      { numRuns: 100 },
    );
  });
});
