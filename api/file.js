import { readIndex, auth } from '../lib/store.js';

export default async function handler(req, res) {
  if (!auth(req, res)) return;
  try {
    const items = await readIndex();
    const it = items.find((i) => i.id === req.query.id);
    if (!it) return res.status(404).send('Not found');
    const r = await fetch(it.url);
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type', it.type === 'pdf' ? 'application/pdf' : 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.status(200).send(buf);
  } catch (e) {
    res.status(500).send(e.message);
  }
}
