import { en, type TKey } from './en';
import { el } from './el';

export type { TKey };
export type Dict = Record<TKey, string>;

export const LOCALES = ['en', 'el'] as const;
export type Locale = (typeof LOCALES)[number];

const dicts: Record<Locale, Dict> = { en, el };

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

export function getDict(locale: Locale): Dict {
  return dicts[locale];
}

export type TVars = Record<string, string | number>;

/** Looks up `key` and fills `{placeholders}`; unknown placeholders are left as-is. */
export function translate(dict: Dict, key: TKey, vars?: TVars): string {
  const template = dict[key] ?? en[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

/** Picks a supported locale from an Accept-Language header (default: en). */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return 'en';
  for (const part of header.split(',')) {
    const tag = part.split(';')[0].trim().toLowerCase();
    const base = tag.split('-')[0];
    if (isLocale(base)) return base;
  }
  return 'en';
}

export type TFunction = (key: TKey, vars?: TVars) => string;

export function makeT(locale: Locale): TFunction {
  const dict = getDict(locale);
  return (key, vars) => translate(dict, key, vars);
}
