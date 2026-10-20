import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth/middleware', () => ({
  getCurrentUser: vi.fn(),
}));

import { getCurrentUser } from '@/lib/auth/middleware';
import { POST } from '../route';
import { DELETE } from '../../templates/[slug]/route';

let ws: string;

const baseAd = {
  type: 'OFFER',
  title: 'Ein Test Artikel',
  description: 'Eine ausreichend lange Beschreibung',
  shipping_type: 'PICKUP',
  price: 10,
  price_type: 'FIXED',
  category: '161/176',
  contact_name: 'Max',
  contact_zipcode: '12345',
  contact_location: 'Berlin',
};

function postAd(extra: Record<string, unknown>): Promise<Response> {
  const req = new NextRequest('http://localhost/api/ads', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...baseAd, ...extra }),
  });
  return POST(req);
}

beforeEach(() => {
  ws = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ads-path-')));
  vi.mocked(getCurrentUser).mockResolvedValue({ workspace: ws } as never);
});

afterEach(() => {
  fs.rmSync(ws, { recursive: true, force: true });
});

describe('POST /api/ads path safety', () => {
  it.each(['../evil', 'a/b', '..', 'a\\b'])('rejects template slug %j with 400 and writes nothing', async (slug) => {
    const res = await postAd({ _template_slug: slug, images: ['a.jpg'] });
    expect(res.status).toBe(400);
    expect(fs.existsSync(path.join(ws, 'ads'))).toBe(false);
  });

  it.each(['../secret.jpg', 'sub/a.jpg', '/etc/passwd'])('rejects image name %j with 400 and writes nothing', async (img) => {
    const res = await postAd({ _template_slug: 'tpl', images: [img] });
    expect(res.status).toBe(400);
    expect(fs.existsSync(path.join(ws, 'ads'))).toBe(false);
  });

  it('copies template images for a valid slug', async () => {
    const tplDir = path.join(ws, 'ads', 'templates', 'tpl_good');
    fs.mkdirSync(tplDir, { recursive: true });
    fs.writeFileSync(path.join(tplDir, 'a.jpg'), 'x');
    const res = await postAd({ _template_slug: 'good', images: ['a.jpg'] });
    expect(res.status).toBe(200);
    expect(fs.existsSync(path.join(ws, 'ads', 'ad_ein_test_artikel', 'a.jpg'))).toBe(true);
  });

  it('fails with 400 before creating the ad directory when a template path escapes via symlink', async () => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'ads-outside-'));
    try {
      const templates = path.join(ws, 'ads', 'templates');
      fs.mkdirSync(templates, { recursive: true });
      fs.symlinkSync(outside, path.join(templates, 'tpl_evil'));
      const res = await postAd({ _template_slug: 'evil', images: ['a.jpg'] });
      expect(res.status).toBe(400);
      expect(fs.existsSync(path.join(ws, 'ads', 'ad_ein_test_artikel'))).toBe(false);
    } finally {
      fs.rmSync(outside, { recursive: true, force: true });
    }
  });
});

describe('DELETE /api/templates/[slug] path safety', () => {
  it('does not delete anything outside the templates dir for a traversal slug', async () => {
    const victim = path.join(ws, 'ads', 'victim');
    fs.mkdirSync(victim, { recursive: true });
    fs.writeFileSync(path.join(victim, 'victim.yaml'), 'x');
    fs.mkdirSync(path.join(ws, 'ads', 'tpl_victim'), { recursive: true });

    const req = new NextRequest('http://localhost/api/templates/x', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ slug: '../tpl_victim' }) });

    expect(res.status).toBe(404);
    expect(fs.existsSync(path.join(ws, 'ads', 'tpl_victim'))).toBe(true);
    expect(fs.existsSync(path.join(victim, 'victim.yaml'))).toBe(true);
  });
});
