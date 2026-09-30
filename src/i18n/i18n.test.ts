import { describe, expect, it } from 'vitest';
import { en } from './en';
import { el } from './el';
import { localeFromAcceptLanguage, makeT, translate } from './index';

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('dictionaries', () => {
  it('Greek defines every English key, non-empty', () => {
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(el[key], key).toBeTruthy();
    }
  });

  it('Greek has no keys English lacks', () => {
    expect(Object.keys(el).filter((k) => !(k in en))).toEqual([]);
  });

  it('placeholders match between languages', () => {
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(placeholders(el[key]), key).toEqual(placeholders(en[key]));
    }
  });
});

describe('translate', () => {
  it('fills placeholders and leaves unknown ones', () => {
    const dict = { ...en, 'app.name': 'Hi {name}, {other}' };
    expect(translate(dict, 'app.name', { name: 'Ana' })).toBe('Hi Ana, {other}');
  });

  it('makeT returns the right language', () => {
    expect(makeT('el')('nav.places')).toBe('Χώροι');
    expect(makeT('en')('nav.places')).toBe('Places');
  });
});

describe('localeFromAcceptLanguage', () => {
  it.each([
    [null, 'en'],
    ['el-GR,el;q=0.9,en;q=0.8', 'el'],
    ['en-US,en;q=0.9,el;q=0.8', 'en'],
    ['fr-FR,el;q=0.5', 'el'],
    ['de', 'en'],
  ])('%s → %s', (header, expected) => {
    expect(localeFromAcceptLanguage(header)).toBe(expected);
  });
});
