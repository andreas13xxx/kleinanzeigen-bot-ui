import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ScheduleCalendar } from '../ScheduleCalendar';
import type { AdListItem } from '@/types/ad';

const ad = {
  file: 'ad_a.yaml',
  title: 'Verlaengert',
  active: true,
  id: 1,
  updated_on: '2026-09-10T00:00:00Z', // 60-day estimate: expires 2026-11-09
} as AdListItem;

const stats = (expires_at: string) => ({
  1: { views: 0, watchlist: 0, replies: 0, state: 'active', activated_at: null, expires_at },
});

describe('ScheduleCalendar expiry chips (#36)', () => {
  afterEach(() => vi.useRealTimers());

  it('shows the estimate-based expiry when no stats are known', () => {
    vi.useFakeTimers({ now: new Date('2026-11-08T12:00:00') });
    expect(renderToStaticMarkup(<ScheduleCalendar ads={[ad]} />)).toContain('Abl: Verlaengert');
  });

  it('does not show an already extended ad (real end date far away)', () => {
    vi.useFakeTimers({ now: new Date('2026-11-08T12:00:00') });
    const html = renderToStaticMarkup(<ScheduleCalendar ads={[ad]} stats={stats('09.01.2027')} />);
    expect(html).not.toContain('Abl:');
  });

  it('shows the ad on the real end date inside the window', () => {
    vi.useFakeTimers({ now: new Date('2026-11-08T12:00:00') });
    const html = renderToStaticMarkup(<ScheduleCalendar ads={[ad]} stats={stats('10.11.2026')} />);
    expect(html).toContain('Abl: Verlaengert');
  });
});
