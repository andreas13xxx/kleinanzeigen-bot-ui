import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { isSafeSlug, isSafeFileName, joinInside } from '../safe-names';

describe('isSafeSlug', () => {
  it('accepts plain and legacy slugs', () => {
    for (const s of ['my_template-1', 'my.template', 'größe m', 'a:b']) expect(isSafeSlug(s)).toBe(true);
  });
  it('rejects traversal, separators and NUL', () => {
    for (const s of ['', '.', '..', '../x', 'x/../../foo', 'a/b', 'a\\b', 'a\0b']) expect(isSafeSlug(s)).toBe(false);
  });
});

describe('isSafeFileName', () => {
  it('accepts bare names, including ones with colon or spaces', () => {
    for (const s of ['bild 1.jpg', 'a:b.jpg', '*.jpg']) expect(isSafeFileName(s)).toBe(true);
  });
  it('rejects paths and traversal', () => {
    for (const s of ['', '.', '..', '../a.jpg', 'a/b.jpg', '/etc/passwd', 'a\0.jpg']) {
      expect(isSafeFileName(s)).toBe(false);
    }
  });
});

describe('joinInside', () => {
  const dirs: string[] = [];
  const tmp = () => {
    const d = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'safe-names-')));
    dirs.push(d);
    return d;
  };
  afterEach(() => {
    for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
  });

  it('joins inside base', () => {
    const base = tmp();
    expect(joinInside(base, 'a.jpg')).toBe(path.join(base, 'a.jpg'));
  });
  it('throws on lexical escape', () => {
    const base = tmp();
    expect(() => joinInside(base, '../x')).toThrow();
    expect(() => joinInside(base, '/etc/passwd')).toThrow();
  });
  it('works when the base is the filesystem root', () => {
    expect(joinInside(path.parse(process.cwd()).root, 'tmp')).toBe(path.join(path.parse(process.cwd()).root, 'tmp'));
  });
  it('throws when a symlink points outside the base', () => {
    const base = tmp();
    const outside = tmp();
    fs.symlinkSync(outside, path.join(base, 'link'));
    expect(() => joinInside(base, 'link/secret.jpg')).toThrow(/symlink/);
  });
});
