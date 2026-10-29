import { Pub } from './util.mjs';

const HOST = /(^|\.)(google\.com|goo\.gl|g\.co)$/i;
const N = '(-?\\d{1,3}\\.\\d+)';

/** Saca "lat,lng" (o el nombre del lugar) de cualquier link/texto de Google Maps. */
export function extraer(texto) {
  const t = String(texto).trim();
  let m = t.match(new RegExp('^' + N + '\\s*,\\s*' + N + '$'));
  if (m) return m[1] + ',' + m[2];
  let d; try { d = decodeURIComponent(t); } catch { d = t; }
  m = d.match(new RegExp('!3d' + N + '!4d' + N)) || d.match(new RegExp('@' + N + ',' + N)) ||
      d.match(new RegExp('[?&](?:q|query|ll|destination)=' + N + ',' + N));
  if (m) return m[1] + ',' + m[2];
  m = d.match(/[?&](?:q|query)=([^&]+)/) || d.match(/\/maps\/place\/([^/@?]+)/);
  return m ? m[1].replace(/\+/g, ' ').trim() : null;
}

/** Si es un link (incluidos los cortos maps.app.goo.gl) lo sigue y devuelve las coordenadas; si es texto lo deja igual. */
export async function resolverMapa(entrada) {
  const t = String(entrada || '').trim().slice(0, 600);
  if (!/^https?:\/\//i.test(t)) return { mapa: extraer(t) || t };
  let url = t;
  for (let i = 0; i < 6; i++) {
    const host = new URL(url).hostname;
    if (!HOST.test(host)) throw new Pub('Ese link no es de Google Maps');
    const corto = /goo\.gl|g\.co/i.test(host);
    const ex = !corto && extraer(url);
    if (ex) return { mapa: ex };
    const r = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(6000), headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36' } }).catch(() => null);
    const loc = r && r.headers.get('location');
    if (!loc) break;
    url = new URL(loc, url).href;
  }
  const ex = extraer(url);
  if (ex) return { mapa: ex };
  throw new Pub('No pude leer ese link. Probá copiarlo de nuevo, o escribí la dirección.');
}
