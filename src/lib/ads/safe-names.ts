import path from 'path';

const SLUG_RE = /^[A-Za-z0-9_-]+$/;

/** True if `slug` is a plain template slug (no separators, no dots). */
export function isSafeSlug(slug: string): boolean {
  return SLUG_RE.test(slug);
}

/** True if `name` is a bare file name (no directory parts, no traversal). */
export function isSafeFileName(name: string): boolean {
  return (
    name.length > 0 &&
    name !== '.' &&
    name !== '..' &&
    !name.includes('\0') &&
    path.basename(name) === name &&
    path.win32.basename(name) === name
  );
}

/** Join `name` onto `baseDir`, throwing if the result escapes `baseDir`. */
export function joinInside(baseDir: string, name: string): string {
  const base = path.resolve(baseDir);
  const full = path.resolve(base, name);
  if (full !== base && !full.startsWith(base + path.sep)) {
    throw new Error(`Path escapes base directory: ${name}`);
  }
  return full;
}
