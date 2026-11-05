import { SITE, urlFoto, propiedadesPublicas } from '../lib/util.mjs';

/** /propiedades.json: listado público en JSON limpio, pensado para agentes y buscadores de IA. */
export default async () => {
  let props = []; try { props = await propiedadesPublicas(); } catch { /* sin datos todavía */ }
  const items = props.map((p) => ({
    id: p.id, url: `${SITE}/propiedad.html?id=${p.id}`, titulo: p.titulo,
    operacion: p.op === 'alquiler' ? 'alquiler' : 'venta', tipo: p.tipo,
    precio: p.precio || null, moneda: p.precio ? p.moneda : null, ubicacion: p.ubic, ciudad: p.ciudad, barrio: p.barrio,
    dormitorios: p.dorm || 0, caracteristicas: (p.datos || []).map((d) => d[1]), descripcion: p.desc || '',
    fotos: (p.imgs?.length ? p.imgs : (p.fotos ? Array.from({ length: p.fotos }, (_, i) => 'prop-' + p.id + (i ? '-' + (i + 1) : '')) : [])).map((k) => urlFoto(k)),
    publicada: p.fecha,
  }));
  return new Response(JSON.stringify({ inmobiliaria: 'Schöning Negocios Inmobiliarios', sitio: SITE, total: items.length, propiedades: items }, null, 1), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=300', 'Access-Control-Allow-Origin': '*' },
  });
};
export const config = { path: '/propiedades.json' };
