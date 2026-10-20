import { describe, it, expect } from 'vitest';
import { isSafeSlug, isSafeFileName, joinInside } from '../safe-names';

describe('isSafeSlug', () => {
  it('accepts plain slugs', () => {
    expect(isSafeSlug('my_template-1')).toBe(true);
  });
  it('rejects traversal and separators', () => {
    for (const s of ['', '..', '../x', 'a/b', 'a\\b', 'a.b', 'a\0b']) expect(isSafeSlug(s)).toBe(false);
  });
});

describe('isSafeFileName', () => {
  it('accepts bare names', () => {
    expect(isSafeFileName('bild 1.jpg')).toBe(true);
  });
  it('rejects paths and traversal', () => {
    for (const s of ['', '.', '..', '../a.jpg', 'a/b.jpg', 'a\\b.jpg', '/etc/passwd', 'a\0.jpg']) {
      expect(isSafeFileName(s)).toBe(false);
    }
  });
});

describe('joinInside', () => {
  it('joins inside base', () => {
    expect(joinInside('/tmp/base', 'a.jpg')).toBe('/tmp/base/a.jpg');
  });
  it('throws on escape', () => {
    expect(() => joinInside('/tmp/base', '../x')).toThrow();
    expect(() => joinInside('/tmp/base', '/etc/passwd')).toThrow();
  });
});
