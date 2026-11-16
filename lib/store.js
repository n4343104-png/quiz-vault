import { put, list } from '@vercel/blob';

const KEY = 'index.json';

export async function readIndex() {
  const { blobs } = await list({ prefix: KEY });
  const b = blobs.find((x) => x.pathname === KEY);
  if (!b) return [];
  const r = await fetch(b.url + '?t=' + Date.now());
  return r.ok ? await r.json() : [];
}

export async function writeIndex(items) {
  await put(KEY, JSON.stringify(items), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  });
}

export function auth(req, res) {
  const need = process.env.APP_PASSWORD;
  if (!need) return true;
  const got = req.headers['x-pass'] || (req.query && req.query.p);
  if (got === need) return true;
  res.status(401).json({ error: 'unauthorized' });
  return false;
}
