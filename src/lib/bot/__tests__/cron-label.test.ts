import { describe, it, expect, vi } from 'vitest';
import { describeCron } from '../cron-label';

vi.mock('@/lib/bot/runner', () => ({ BOT_DIR: '/bot' }));
vi.mock('@/lib/bot/jobs', () => ({ startJob: vi.fn(), jobs: new Map() }));

describe('describeCron (upstream #27)', () => {
  it.each([
    ['0 */8 * * *', 'Alle 8 Stunden'],
    ['0 6 * * *', 'Täglich 6:00'],
    ['0 0,8,16 * * *', 'Täglich 0:00, 8:00, 16:00'],
    ['0 8 */3 * *', 'Alle 3 Tage 8:00'],
    ['0 8 1,4 * *', 'Am 1., 4. des Monats 8:00'],
    ['0 12 * * 1', 'Montags 12:00'],
    ['0 8 * * 0', 'Sonntags 8:00'],
    ['*/15 * * * *', '*/15 * * * *'],
    ['0 8 1 6 *', '0 8 1 6 *'],
  ])('%s -> %s', (expr, label) => {
    expect(describeCron(expr)).toBe(label);
  });
});

describe('getNextRun (upstream #27)', () => {
  it('handles step, list and day-of-month expressions without Invalid time value', async () => {
    const { getNextRun } = await import('../scheduler');
    for (const e of ['0 */8 * * *', '0 */12 * * *', '0 8 */3 * *', '0 8 1,4 * *', '0 0,8,16 * * *', '0 8 * * 1']) {
      const next = getNextRun(e);
      expect(next, e).toBeDefined();
      expect(new Date(next!).getTime()).toBeGreaterThan(Date.now());
    }
  });

  it('returns undefined for an invalid expression', async () => {
    const { getNextRun } = await import('../scheduler');
    expect(getNextRun('not a cron')).toBeUndefined();
  });
});
