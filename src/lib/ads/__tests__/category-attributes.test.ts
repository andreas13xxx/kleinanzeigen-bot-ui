import { describe, it, expect } from 'vitest';
import { resolveAttributes, isOptionalAttr, setAttrValue } from '../category-attributes';
import type { CategoryEntry, SharedAttributeDef } from '../category-attributes';

function makeShared(opts: string[]): SharedAttributeDef {
  return { options: opts.map((v) => ({ value: v, text: v })) };
}

describe('resolveAttributes', () => {
  it('returns single attribute when only one shared ref exists', () => {
    const shared: Record<string, SharedAttributeDef> = {
      'pferde.art_s': makeShared(['Reitpferd', 'Fohlen']),
    };
    const entry: CategoryEntry = { attributes: [], shared: ['pferde.art_s'] };
    const result = resolveAttributes(entry, shared, '130/139/grosspferde');

    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('pferde.art_s');
    expect(result[0].options).toHaveLength(2);
  });

  it('deduplicates shared refs with same short key, preferring category-matching namespace', () => {
    const shared: Record<string, SharedAttributeDef> = {
      'zubehoer.art_s': makeShared(['Sattel', 'Halfter']),
      'pferde.art_s': makeShared(['Reitpferd', 'Fohlen']),
      'fische.art_s': makeShared(['Koi', 'Goldfisch']),
    };
    const entry: CategoryEntry = {
      attributes: [],
      shared: ['zubehoer.art_s', 'pferde.art_s', 'fische.art_s'],
    };

    const result = resolveAttributes(entry, shared, '130/313/pferde');
    const artAttrs = result.filter((a) => a.key.endsWith('art_s'));
    expect(artAttrs).toHaveLength(1);
    expect(artAttrs[0].key).toBe('pferde.art_s');
    expect(artAttrs[0].options?.map((o) => o.value)).toEqual(['Reitpferd', 'Fohlen']);
  });

  it('prefers fische.art_s for category ending in fische', () => {
    const shared: Record<string, SharedAttributeDef> = {
      'zubehoer.art_s': makeShared(['Sattel']),
      'pferde.art_s': makeShared(['Reitpferd']),
      'fische.art_s': makeShared(['Koi', 'Goldfisch']),
    };
    const entry: CategoryEntry = {
      attributes: [],
      shared: ['zubehoer.art_s', 'pferde.art_s', 'fische.art_s'],
    };

    const result = resolveAttributes(entry, shared, '130/313/fische');
    const artAttrs = result.filter((a) => a.key.endsWith('art_s'));
    expect(artAttrs).toHaveLength(1);
    expect(artAttrs[0].key).toBe('fische.art_s');
  });

  it('keeps first ref when category slug matches none', () => {
    const shared: Record<string, SharedAttributeDef> = {
      'zubehoer.art_s': makeShared(['Sattel']),
      'pferde.art_s': makeShared(['Reitpferd']),
      'fische.art_s': makeShared(['Koi']),
    };
    const entry: CategoryEntry = {
      attributes: [],
      shared: ['zubehoer.art_s', 'pferde.art_s', 'fische.art_s'],
    };

    const result = resolveAttributes(entry, shared, '130/313/sonstiges');
    const artAttrs = result.filter((a) => a.key.endsWith('art_s'));
    expect(artAttrs).toHaveLength(1);
    expect(artAttrs[0].key).toBe('zubehoer.art_s');
  });

  it('does not deduplicate attributes with different short keys', () => {
    const shared: Record<string, SharedAttributeDef> = {
      'pferde.art_s': makeShared(['Reitpferd']),
      'pferde.condition_s': makeShared(['Neu', 'Gebraucht']),
    };
    const entry: CategoryEntry = {
      attributes: [],
      shared: ['pferde.art_s', 'pferde.condition_s'],
    };

    const result = resolveAttributes(entry, shared, '130/313/pferde');
    expect(result).toHaveLength(2);
  });

  it('handles inline attributes alongside shared refs', () => {
    const shared: Record<string, SharedAttributeDef> = {
      'pferde.art_s': makeShared(['Reitpferd']),
    };
    const entry: CategoryEntry = {
      attributes: [{ attribute_key: 'farbe_s', options: [{ value: 'schwarz', text: 'Schwarz' }] }],
      shared: ['pferde.art_s'],
    };

    const result = resolveAttributes(entry, shared, '130/313/pferde');
    expect(result).toHaveLength(2);
    expect(result.map((a) => a.key)).toContain('pferde.art_s');
    expect(result.map((a) => a.key)).toContain('farbe_s');
  });
});

describe('isOptionalAttr', () => {
  it('treats only condition_s as optional (also with category prefix)', () => {
    expect(isOptionalAttr('condition_s')).toBe(true);
    expect(isOptionalAttr('kleidung.condition_s')).toBe(true);
    expect(isOptionalAttr('art_s')).toBe(false);
    expect(isOptionalAttr('brand_s')).toBe(false);
  });
});

describe('setAttrValue', () => {
  it('sets a value under the short key', () => {
    expect(setAttrValue({ art_s: 'a' }, 'cat.condition_s', 'ok')).toEqual({ art_s: 'a', condition_s: 'ok' });
  });

  it('removes the key on empty value instead of writing an empty string', () => {
    const next = setAttrValue({ art_s: 'a', condition_s: 'ok' }, 'condition_s', '');
    expect(next).toEqual({ art_s: 'a' });
    expect('condition_s' in next).toBe(false);
  });

  it('removes both full and short key forms and does not mutate the input', () => {
    const input = { 'cat.condition_s': 'ok', condition_s: 'ok' };
    expect(setAttrValue(input, 'cat.condition_s', '')).toEqual({});
    expect(input).toEqual({ 'cat.condition_s': 'ok', condition_s: 'ok' });
  });

  it('does not add a key when clearing an unset attribute', () => {
    expect(setAttrValue({}, 'condition_s', '')).toEqual({});
  });
});
