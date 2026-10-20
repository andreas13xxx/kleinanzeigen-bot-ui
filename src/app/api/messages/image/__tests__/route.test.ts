import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ACCESS_COOKIE } from '@/lib/auth/cookies';

vi.mock('@/lib/yaml/users', () => ({
  loadUsers: vi.fn(),
  ensureJwtSecret: vi.fn(),
}));
vi.mock('@/lib/auth/jwt', () => ({
  decodeJwt: vi.fn(),
}));

import { loadUsers, ensureJwtSecret } from '@/lib/yaml/users';
import { decodeJwt } from '@/lib/auth/jwt';
import { GET } from '../route';

const fetchMock = vi.fn();

function makeRequest(url: string | null, withCookie = true): NextRequest {
  const base = 'http://localhost/api/messages/image';
  const full = url === null ? base : `${base}?url=${encodeURIComponent(url)}`;
  return new NextRequest(full, {
    headers: withCookie ? { cookie: `${ACCESS_COOKIE}=token` } : {},
  });
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.mocked(loadUsers).mockResolvedValue({} as never);
  vi.mocked(ensureJwtSecret).mockResolvedValue('secret' as never);
  vi.mocked(decodeJwt).mockResolvedValue({} as never);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GET /api/messages/image', () => {
  it.each([
    ['missing url', null],
    ['foreign host', 'https://evil.example.com/a.jpg'],
    ['suffix lookalike', 'https://evilkleinanzeigen.de/a.jpg'],
    ['plain http', 'http://img.kleinanzeigen.de/a.jpg'],
    ['not a url', 'not a url'],
    ['loopback address', 'https://127.0.0.1/a.jpg'],
  ])('rejects %s with 400 and does not fetch', async (_name, url) => {
    const res = await GET(makeRequest(url));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns 401 without a token and does not fetch', async () => {
    const res = await GET(makeRequest('https://img.kleinanzeigen.de/a.jpg', false));
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fetches allowed hosts without following redirects, with a timeout signal', async () => {
    fetchMock.mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { 'content-type': 'image/png' } }),
    );
    const res = await GET(makeRequest('https://img.kleinanzeigen.de/a.jpg'));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
    const [, init] = fetchMock.mock.calls[0];
    expect(init.redirect).toBe('manual');
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('accepts the bare kleinanzeigen.de host', async () => {
    fetchMock.mockResolvedValue(new Response(new Uint8Array([1]), { status: 200 }));
    const res = await GET(makeRequest('https://kleinanzeigen.de/a.jpg'));
    expect(res.status).toBe(200);
  });

  it('serves the placeholder PNG for a redirect response instead of following it', async () => {
    fetchMock.mockResolvedValue(
      new Response(null, { status: 302, headers: { location: 'http://internal.example/secret' } }),
    );
    const res = await GET(makeRequest('https://img.kleinanzeigen.de/a.jpg'));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
