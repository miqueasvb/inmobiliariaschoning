import { store } from '../lib/util.mjs';

/**
 * Reemplaza a js/propiedades-data.js: entrega la lista pública como un <script>.
 * Mientras no se haya importado nada al panel, sigue sirviendo el archivo estático
 * original (así el sitio no se queda vacío durante la migración).
 */
export default async (req) => {
  const headers = {
    'Content-Type': 'application/javascript; charset=utf-8',
    'Cache-Control': 'public, max-age=0, must-revalidate',
  };
  const d = await store().get('propiedades', { type: 'json' });

  if (!d) {
    try {
      const r = await fetch(new URL('/js/propiedades-data.js', req.url));
      if (r.ok) return new Response(await r.text(), { headers });
    } catch { /* sin archivo estático */ }
    return new Response('window.SCH_PROPIEDADES=[];', { headers });
  }

  const publicas = (d.items || []).filter((p) => p.activa !== false).map(({ activa, ...resto }) => resto);
  const js = 'window.SCH_PROPIEDADES=' + JSON.stringify(publicas).replace(/</g, '\\u003c') + ';';
  return new Response(js, { headers });
};

export const config = { path: '/api/propiedades.js' };
