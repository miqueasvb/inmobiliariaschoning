import { SITE, propiedadesPublicas } from '../lib/util.mjs';

/** /sitemap.xml: páginas fijas + una URL por cada propiedad publicada (se actualiza sola). */
export default async () => {
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const fijas = [['/', 'weekly', '1.0'], ['/propiedades.html', 'daily', '0.9'], ['/nosotros.html', 'monthly', '0.5']];
  let props = []; try { props = await propiedadesPublicas(); } catch { /* sin datos todavía */ }
  const url = (loc, freq, prio, mod) => `  <url><loc>${esc(SITE + loc)}</loc>${mod ? `<lastmod>${esc(mod)}</lastmod>` : ''}<changefreq>${freq}</changefreq><priority>${prio}</priority></url>`;
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    [...fijas.map(([l, f, p]) => url(l, f, p)), ...props.map((p) => url('/propiedad.html?id=' + p.id, 'weekly', '0.8', /^\d{4}-\d{2}-\d{2}$/.test(p.fecha) ? p.fecha : ''))].join('\n') + '\n</urlset>\n';
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=600' } });
};
export const config = { path: '/sitemap.xml' };
