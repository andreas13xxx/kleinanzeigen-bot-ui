import fs from 'fs';
import path from 'path';

/**
 * True if `slug` is usable as a single path segment: non-empty, no path
 * separators, no NUL, not a dot segment. Dots, umlauts and spaces stay valid
 * because legacy/hand-made templates may use them.
 */
export function isSafeSlug(slug: string): boolean {
  return (
    slug.length > 0 &&
    slug !== '.' &&
    slug !== '..' &&
    !slug.includes('\0') &&
    !slug.includes('/') &&
    !slug.includes('\\')
  );
}

/** True if `name` is a bare file name on this platform (no directory parts, no traversal). */
export function isSafeFileName(name: string): boolean {
  return (
    name.length > 0 &&
    name !== '.' &&
    name !== '..' &&
    !name.includes('\0') &&
    path.basename(name) === name
  );
}

function isInside(base: string, target: string): boolean {
  const rel = path.relative(base, target);
  return rel === '' || (rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel));
}

/** Real path of the deepest existing ancestor of `p` (resolves symlinks). */
function realpathOfExistingAncestor(p: string): string {
  let current = p;
  for (;;) {
    try {
      return fs.realpathSync(current);
    } catch {
      const parent = path.dirname(current);
      if (parent === current) return current;
      current = parent;
    }
  }
}

/**
 * Join `name` onto `baseDir`, throwing if the result escapes `baseDir`,
 * either lexically (`..`, absolute names) or through a symlink.
 */
export function joinInside(baseDir: string, name: string): string {
  const base = path.resolve(baseDir);
  const full = path.resolve(base, name);
  if (!isInside(base, full)) {
    throw new Error(`Path escapes base directory: ${name}`);
  }
  if (!isInside(realpathOfExistingAncestor(base), realpathOfExistingAncestor(full))) {
    throw new Error(`Path escapes base directory via symlink: ${name}`);
  }
  return full;
}
