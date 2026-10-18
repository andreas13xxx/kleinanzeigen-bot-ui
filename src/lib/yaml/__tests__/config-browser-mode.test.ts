import { describe, it, expect } from 'vitest';
import { BROWSER_DEFAULTS } from '../config';

describe('BROWSER_DEFAULTS', () => {
  // Was 'auto' (headless first). kleinanzeigen.de rejects headless logins, so a fresh install must
  // not start there — the default is the visible browser (desktop window / Xvnc in Docker).
  it('has mode default visible', () => {
    expect(BROWSER_DEFAULTS.mode).toBe('visible');
  });
});
