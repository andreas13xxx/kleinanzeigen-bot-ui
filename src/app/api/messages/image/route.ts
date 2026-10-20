import { NextRequest, NextResponse } from 'next/server';
import { loadUsers, ensureJwtSecret } from '@/lib/yaml/users';
import { decodeJwt } from '@/lib/auth/jwt';
import { ACCESS_COOKIE } from '@/lib/auth/cookies';

const MAX_REDIRECTS = 3;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 10_000;

/** Strict allowlist to prevent open proxy abuse / SSRF: https, default port, kleinanzeigen.de only. */
function isAllowedImageUrl(url: URL): boolean {
  const { hostname } = url;
  return (
    url.protocol === 'https:' &&
    (url.port === '' || url.port === '443') &&
    (hostname === 'kleinanzeigen.de' || hostname.endsWith('.kleinanzeigen.de'))
  );
}

function placeholderResponse(): NextResponse {
  // Transparent 1×1 PNG instead of an error to avoid browser console errors
  // for expired/deleted ad images (common for old conversations)
  const placeholder = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64'
  );
  return new NextResponse(placeholder, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=300',
    },
  });
}

/**
 * Fetch following redirects manually; every hop is re-validated against the
 * allowlist so a redirect can never leave kleinanzeigen.de.
 * Returns null if a redirect is invalid, missing its target, or exceeds the hop limit.
 */
async function fetchAllowed(start: URL, signal: AbortSignal): Promise<Response | null> {
  let current = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const response = await fetch(current.toString(), {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      redirect: 'manual',
      signal,
    });
    if (response.status < 300 || response.status >= 400) return response;

    const location = response.headers.get('location');
    if (!location) return null;
    let next: URL;
    try {
      next = new URL(location, current);
    } catch {
      return null;
    }
    if (!isAllowedImageUrl(next)) return null;
    current = next;
  }
  return null;
}

/** Read the body up to MAX_IMAGE_BYTES; null if it is larger. */
async function readLimited(response: Response): Promise<Uint8Array | null> {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_IMAGE_BYTES) return null;
  if (!response.body) return new Uint8Array(0);

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_IMAGE_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

/**
 * Proxy for Kleinanzeigen ad images.
 * Avoids CORS/mixed-content issues by serving images through our domain.
 * Auth via httpOnly kb_token cookie (sent automatically by browser) or Authorization header.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');

    let parsedUrl: URL | null = null;
    try {
      parsedUrl = imageUrl ? new URL(imageUrl) : null;
    } catch { /* invalid URL */ }
    if (!parsedUrl || !isAllowedImageUrl(parsedUrl)) {
      return new NextResponse(null, { status: 400 });
    }

    // Authenticate via httpOnly access cookie or Authorization header
    const jwtToken =
      request.cookies.get(ACCESS_COOKIE)?.value ??
      request.headers.get('authorization')?.slice(7) ??
      null;

    if (!jwtToken) {
      return new NextResponse(null, { status: 401 });
    }

    const data = await loadUsers();
    if (!data) return new NextResponse(null, { status: 401 });
    const secret = await ensureJwtSecret(data);
    await decodeJwt(jwtToken, secret);

    let response: Response | null;
    let body: Uint8Array | null = null;
    try {
      response = await fetchAllowed(parsedUrl, AbortSignal.timeout(FETCH_TIMEOUT_MS));
      if (response?.ok) body = await readLimited(response);
    } catch (error) {
      // Timeout / network error: same UX as an expired image, but leave a trace for debugging
      console.warn('[messages/image] upstream fetch failed:', error instanceof Error ? error.message : error);
      return placeholderResponse();
    }

    const contentType = response?.headers.get('content-type') || 'image/jpeg';
    if (!response?.ok || body === null || !contentType.toLowerCase().startsWith('image/')) {
      return placeholderResponse();
    }

    return new NextResponse(body as BodyInit, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}
