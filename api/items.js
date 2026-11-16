import { put, del } from '@vercel/blob';
import { readIndex, writeIndex, auth } from '../lib/store.js';

export default async function handler(req, res) {
  if (!auth(req, res)) return;
  try {
    const items = await readIndex();

    if (req.method === 'GET') return res.json(items);

    if (req.method === 'POST') {
      const { subject, topic, title, type, filename, data } = req.body || {};
      if (!subject || !topic || !data)
        return res.status(400).json({ error: 'Subject, topic aur file zaroori hai' });
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const isPdf = type === 'pdf';
      const safe = (filename || 'file').replace(/[^\w.\-]+/g, '_');
      const buf = Buffer.from(data, 'base64');
      const blob = await put(`files/${id}-${safe}`, buf, {
        access: 'public',
        addRandomSuffix: false,
        contentType: isPdf ? 'application/pdf' : 'text/html; charset=utf-8',
      });
      const item = {
        id,
        subject: subject.trim(),
        topic: topic.trim(),
        title: (title || filename || 'Untitled').trim(),
        type: isPdf ? 'pdf' : 'quiz',
        url: blob.url,
        size: buf.length,
        created: Date.now(),
      };
      items.push(item);
      await writeIndex(items);
      return res.json(item);
    }

    if (req.method === 'PUT') {
      const b = req.body || {};
      if (b.scope === 'item') {
        const it = items.find((i) => i.id === b.id);
        if (!it) return res.status(404).json({ error: 'Nahi mila' });
        if (b.subject) it.subject = b.subject.trim();
        if (b.topic) it.topic = b.topic.trim();
        if (b.title) it.title = b.title.trim();
      } else if (b.scope === 'subject') {
        items.forEach((i) => { if (i.subject === b.from) i.subject = b.to.trim(); });
      } else if (b.scope === 'topic') {
        items.forEach((i) => {
          if (i.subject === b.subject && i.topic === b.from) i.topic = b.to.trim();
        });
      } else return res.status(400).json({ error: 'bad scope' });
      await writeIndex(items);
      return res.json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const { scope, id, subject, topic } = req.query;
      const gone = items.filter((i) =>
        scope === 'item' ? i.id === id
        : scope === 'subject' ? i.subject === subject
        : scope === 'topic' ? i.subject === subject && i.topic === topic
        : false
      );
      if (gone.length) await del(gone.map((g) => g.url));
      const keep = items.filter((i) => !gone.includes(i));
      await writeIndex(keep);
      return res.json({ ok: true, deleted: gone.length });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
        }
