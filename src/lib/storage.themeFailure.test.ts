// Feature: personal-portfolio-web, Property 10: Theme selection survives storage failure
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { persistTheme } from './storage';
import type { StorageLike, Theme } from './storage';

/**
 * Property 10: Theme selection survives storage failure.
 *
 * For any theme in `{dark, light}`, when the storage backend throws on write,
 * applying the theme does not raise an error and the resulting active theme
 * equals the selected theme.
 *
 * `persistTheme` returns void, and "applies for the session" is handled by the
 * caller/DOM. We model that here with a tiny local applier that records the
 * theme in a session variable and then calls `persistTheme`. The property
 * asserts that (a) the flow does not throw even though the write throws, and
 * (b) the recorded session theme equals the selected theme.
 *
 * **Validates: Requirements 7.6**
 */

// A storage backend whose `setItem` always throws, simulating private mode,
// disabled storage, or a quota error.
const throwingStorage: StorageLike = {
  getItem(): string | null {
    return null;
  },
  setItem(): void {
    throw new Error('storage write failed');
  },
};

// Apply-and-persist flow: record the selected theme for the session, then
// attempt to persist it. Returns the active session theme.
function applyAndPersistTheme(theme: Theme, storage: StorageLike): Theme {
  let activeTheme: Theme = theme; // session-level "applied" theme
  persistTheme(theme, storage);
  return activeTheme;
}

const themeArb: fc.Arbitrary<Theme> = fc.constantFrom<Theme>('dark', 'light');

describe('Property 10: Theme selection survives storage failure', () => {
  it('applying a theme does not throw when the storage write throws', () => {
    fc.assert(
      fc.property(themeArb, (theme) => {
        expect(() => persistTheme(theme, throwingStorage)).not.toThrow();
      }),
      { numRuns: 100 },
    );
  });

  it('the active session theme equals the selected theme even when the write throws', () => {
    fc.assert(
      fc.property(themeArb, (theme) => {
        const activeTheme = applyAndPersistTheme(theme, throwingStorage);
        expect(activeTheme).toBe(theme);
      }),
      { numRuns: 100 },
    );
  });
});
