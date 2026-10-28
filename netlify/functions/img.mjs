import { store } from '../lib/util.mjs';

/**
 * Sirve las fotos subidas desde el panel.
 * Netlify solo llega acá cuando NO existe un archivo estático con ese nombre
 * (por eso las fotos viejas de /img/propiedades siguen funcionando igual).
 */
export default async (req) => {
  const f = new URL(req.url).searchParams.get('f') || '';
  const m = f.match(/^([a-z0-9-]{2,60}?)(-m)?\.jpg$/);
  if (!m) return new Response('No encontrada', { status: 404 });

  const data = await store().get((m[2] ? 'thumb:' : 'img:') + m[1], { type: 'arrayBuffer' });
  if (!data) return new Response('No encontrada', { status: 404, headers: { 'Cache-Control': 'public, max-age=60' } });

  return new Response(data, {
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
};
