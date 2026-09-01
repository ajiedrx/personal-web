import en from './en.json';
import id from './id.json';

/** A language variant of the site content. */
export type Locale = 'en' | 'id';

/** The default locale, served at the root path `/`. */
export const DEFAULT_LOCALE: Locale = 'en';

/** All supported locales. */
export const LOCALES: readonly Locale[] = ['en', 'id'] as const;

type Dictionary = Record<string, unknown>;

const dictionaries: Record<Locale, Dictionary> = { en, id };

/** Type guard: true when the given value is a supported locale. */
export function isLocale(value: unknown): value is Locale {
  return value === 'en' || value === 'id';
}

/**
 * Normalize an arbitrary value into a supported {@link Locale}, defaulting to
 * English when the value is not a recognized locale.
 */
export function getLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** Return the dictionary backing a given locale. */
export const dictionaryFor = (locale: Locale): Dictionary => dictionaries[locale];

/**
 * Resolve a dotted key (e.g. `"hero.tagline"`) against a dictionary.
 * Returns `undefined` when any path segment is missing or when the resolved
 * value is not a leaf (i.e. still an object).
 */
function resolveKey(dict: Dictionary, key: string): unknown {
  const segments = key.split('.');
  let current: unknown = dict;
  for (const segment of segments) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment];
    if (current === undefined) return undefined;
  }
  // Only leaf (non-object) values are valid resolutions.
  if (current !== null && typeof current === 'object') return undefined;
  return current;
}

/**
 * Resolve a dotted key for a locale.
 *
 * Resolution order (Req 5.3, 5.6):
 *  1. The requested locale's dictionary.
 *  2. Fall back to the English dictionary.
 *  3. As a last resort, echo the key itself so a missing translation never
 *     renders blank or throws.
 */
export function t(locale: Locale, key: string): string {
  const fromLocale = resolveKey(dictionaries[locale], key);
  if (fromLocale !== undefined) return String(fromLocale);

  const fromEn = resolveKey(dictionaries.en, key);
  if (fromEn !== undefined) return String(fromEn);

  return key;
}

/**
 * Enumerate every dotted leaf key present in a dictionary. Used for parity
 * checks between locales (Req 5.5).
 */
export function keysOf(dict: Dictionary): string[] {
  const keys: string[] = [];

  const walk = (node: Dictionary, prefix: string): void => {
    for (const [name, value] of Object.entries(node)) {
      const path = prefix ? `${prefix}.${name}` : name;
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        walk(value as Dictionary, path);
      } else {
        keys.push(path);
      }
    }
  };

  walk(dict, '');
  return keys;
}
