import { describe, it, expect, vi } from 'vitest';
import type { Schedule } from '@/types/bot';

vi.mock('@/lib/bot/runner', () => ({ BOT_DIR: '/bot' }));
vi.mock('@/lib/bot/jobs', () => ({ startJob: vi.fn(), jobs: new Map() }));
vi.mock('@/lib/yaml/users', () => ({
  getUserWorkspace: vi.fn((id: string) => (id === 'solo' ? '/bot' : `/bot/users/${id}`)),
}));

import { getWorkspaceForSchedule } from '../scheduler';

const schedule = (created_by?: string): Schedule => ({ created_by } as Schedule);

describe('getWorkspaceForSchedule', () => {
  it('runs system schedules in BOT_DIR', () => {
    expect(getWorkspaceForSchedule(schedule('system'))).toBe('/bot');
    expect(getWorkspaceForSchedule(schedule(undefined))).toBe('/bot');
  });

  it('delegates user schedules to getUserWorkspace (single-user fallback to BOT_DIR, upstream #24)', () => {
    expect(getWorkspaceForSchedule(schedule('solo'))).toBe('/bot');
    expect(getWorkspaceForSchedule(schedule('alice'))).toBe('/bot/users/alice');
  });
});
