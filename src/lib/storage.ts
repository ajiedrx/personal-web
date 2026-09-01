import type { Locale } from '../i18n/locale';
import { isLocale } from '../i18n/locale';

/**
 * Preference-persistence helpers for the theme and language toggles.
 *
 * The site is static and read-mostly; these helpers wrap `localStorage` so that
 * a storage failure (private mode, disabled storage, quota) never throws and
 * never breaks the page:
 *
 * - Writes are wrapped in try/catch and swallow failures, so the selected
 *   theme/language is still applied for the current session (Req 7.6).
 * - Reads are wrapped in try/catch; a read that throws is treated as "no stored
 *   preference" (returns `null`), so the dark default applies (Req 7.8).
 *
 * Every function accepts an optional `storage` backend (defaulting to
 * `globalThis.localStorage`) so property tests can inject a throwing stub
 * without touching the real DOM.
 *
 * _Requirements: 6.3, 6.4, 7.5, 7.6, 7.7, 7.8_
 */

/** A color theme for the site. */
export type Theme = 'dark' | 'light';

/**
 * The subset of the Web Storage API these helpers depend on. Declaring it
 * explicitly (rather than requiring a full `Storage`) keeps the injectable
 * test stubs minimal.
 */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** `localStorage` key under which the theme preference is stored. */
export const THEME_STORAGE_KEY = 'theme';

/** `localStorage` key under which the language preference is stored. */
export const LANGUAGE_STORAGE_KEY = 'lang';

/**
 * Resolve the storage backend to use, preferring an explicitly injected one and
 * otherwise falling back to `globalThis.localStorage`. Returns `null` when no
 * storage is available (e.g. server-side rendering) so callers degrade to the
 * session-only / no-preference path instead of throwing.
 */
function resolveStorage(storage?: StorageLike | null): StorageLike | null {
  if (storage !== undefined) return storage;
  try {
    return globalThis.localStorage ?? null;
  } catch {
    // Accessing `localStorage` can itself throw in some locked-down contexts.
    return null;
  }
}

/** Type guard: true when the given value is a supported {@link Theme}. */
function isTheme(value: unknown): value is Theme {
  return value === 'dark' || value === 'light';
}

/**
 * Persist the selected theme.
 *
 * Any storage failure is swallowed so the choice still applies for the current
 * session (Req 7.5, 7.6).
 *
 * @param theme The theme the visitor selected.
 * @param storage Optional storage backend; defaults to `globalThis.localStorage`.
 */
export function persistTheme(theme: Theme, storage?: StorageLike | null): void {
  const backend = resolveStorage(storage);
  if (backend === null) return;
  try {
    backend.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Write failed (private mode, quota, disabled storage): apply for session only.
  }
}

/**
 * Read the stored theme preference.
 *
 * Returns `null` when no valid preference is stored, when storage is
 * unavailable, or when the read throws — all of which are treated as "no
 * preference" so the caller can apply the dark default (Req 7.7, 7.8).
 *
 * @param storage Optional storage backend; defaults to `globalThis.localStorage`.
 * @returns The stored theme, or `null` when there is no valid stored preference.
 */
export function readStoredTheme(storage?: StorageLike | null): Theme | null {
  const backend = resolveStorage(storage);
  if (backend === null) return null;
  try {
    const value = backend.getItem(THEME_STORAGE_KEY);
    return isTheme(value) ? value : null;
  } catch {
    // Read threw: treat as no stored preference.
    return null;
  }
}

/**
 * Persist the selected language.
 *
 * Any storage failure is swallowed so the choice still applies for the current
 * session (Req 6.3, mirroring the theme write semantics).
 *
 * @param locale The locale the visitor selected.
 * @param storage Optional storage backend; defaults to `globalThis.localStorage`.
 */
export function persistLanguage(locale: Locale, storage?: StorageLike | null): void {
  const backend = resolveStorage(storage);
  if (backend === null) return;
  try {
    backend.setItem(LANGUAGE_STORAGE_KEY, locale);
  } catch {
    // Write failed: apply for session only.
  }
}

/**
 * Read the stored language preference.
 *
 * Returns `null` when no valid preference is stored, when storage is
 * unavailable, or when the read throws — all treated as "no preference"
 * (Req 6.4).
 *
 * @param storage Optional storage backend; defaults to `globalThis.localStorage`.
 * @returns The stored locale, or `null` when there is no valid stored preference.
 */
export function readStoredLanguage(storage?: StorageLike | null): Locale | null {
  const backend = resolveStorage(storage);
  if (backend === null) return null;
  try {
    const value = backend.getItem(LANGUAGE_STORAGE_KEY);
    return isLocale(value) ? value : null;
  } catch {
    // Read threw: treat as no stored preference.
    return null;
  }
}
