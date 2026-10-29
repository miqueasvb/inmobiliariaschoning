import { store } from '../lib/util.mjs';

/** Sirve las fotos subidas desde el panel en /media/<clave>.jpg (o <clave>-m.jpg = miniatura). */
export default async (req) => {
  const f = decodeURIComponent(new URL(req.url).pathname.split('/').pop() || '');
  const m = f.match(/^([a-z0-9-]{2,60}?)(-m)?\.jpg$/);
  if (!m) return new Response('No encontrada', { status: 404 });
  const data = await store().get((m[2] ? 'thumb:' : 'img:') + m[1], { type: 'arrayBuffer' });
  if (!data) return new Response('No encontrada', { status: 404, headers: { 'Cache-Control': 'public, max-age=30' } });
  return new Response(data, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable' } });
};

export const config = { path: '/media/*' };
