import { getStore } from '@netlify/blobs';
import crypto from 'node:crypto';

/* ------------------------------------------------------------------ */
/*  Storage (Netlify Blobs)                                            */
/* ------------------------------------------------------------------ */
export const store = () => getStore({ name: 'inmobiliaria', consistency: 'strong' });

/* ------------------------------------------------------------------ */
/*  Respuestas / errores                                               */
/* ------------------------------------------------------------------ */
export class Pub extends Error {            // error con mensaje apto para mostrar al usuario
  constructor(msg, status = 400) { super(msg); this.publico = true; this.status = status; }
}

export const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra },
  });

/* ------------------------------------------------------------------ */
/*  Sesión: token firmado con HMAC en cookie HttpOnly                  */
/* ------------------------------------------------------------------ */
export const COOKIE = 'sch_admin';
export const DURACION_SESION = 3 * 24 * 3600 * 1000;   // 3 días

function secreto() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 24) throw new Pub('AUTH_SECRET ' + (s ? 'es muy corto (' + s.length + ' caracteres, mínimo 24)' : 'no está definido en este deploy'), 500);
  return s;
}

export function firmar(payload) {
  const cuerpo = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const firma = crypto.createHmac('sha256', secreto()).update(cuerpo).digest('base64url');
  return cuerpo + '.' + firma;
}

export function verificar(token) {
  if (!token || token.indexOf('.') < 0) return null;
  const [cuerpo, firma] = token.split('.');
  const esperada = crypto.createHmac('sha256', secreto()).update(cuerpo).digest('base64url');
  const a = Buffer.from(firma), b = Buffer.from(esperada);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(cuerpo, 'base64url').toString());
    return p.exp > Date.now() ? p : null;
  } catch { return null; }
}

export function leerCookie(req) {
  const c = (req.headers.get('cookie') || '').split(/;\s*/).find((x) => x.startsWith(COOKIE + '='));
  return c ? c.slice(COOKIE.length + 1) : '';
}

export const cookieSesion = (valor, maxAgeSeg) =>
  `${COOKIE}=${valor}; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAgeSeg}`;

/* ------------------------------------------------------------------ */
/*  Credenciales                                                       */
/*  - Al inicio valen ADMIN_USER / ADMIN_PASSWORD (variables de Netlify)*/
/*  - Si el cliente cambia la clave desde el panel, se guarda el hash   */
/*    (scrypt) en Blobs y pasa a tener prioridad.                       */
/* ------------------------------------------------------------------ */
const hash = (txt) => crypto.createHash('sha256').update(String(txt)).digest();
const igual = (a, b) => crypto.timingSafeEqual(hash(a), hash(b));

export async function claveValida(usuario, clave) {
  usuario = String(usuario || ''); clave = String(clave || '');
  if (!usuario || !clave) return false;
  const cred = await store().get('credenciales', { type: 'json' });
  if (cred) {
    const h = crypto.scryptSync(clave, Buffer.from(cred.salt, 'hex'), 64);
    return igual(usuario, cred.usuario) && crypto.timingSafeEqual(h, Buffer.from(cred.hash, 'hex'));
  }
  const u = process.env.ADMIN_USER || '', p = process.env.ADMIN_PASSWORD || '';
  if (!u || !p) return false;
  return igual(usuario, u) && igual(clave, p);
}

export async function guardarClave(usuario, clave) {
  const salt = crypto.randomBytes(16);
  const h = crypto.scryptSync(clave, salt, 64);
  await store().setJSON('credenciales', { usuario, salt: salt.toString('hex'), hash: h.toString('hex') });
}

/* ------------------------------------------------------------------ */
/*  Propiedades: lectura / escritura / validación                      */
/* ------------------------------------------------------------------ */
export async function leer(st) {
  const d = await st.get('propiedades', { type: 'json' });
  return d
    ? { inicializado: true, nextId: d.nextId || 1, items: d.items || [] }
    : { inicializado: false, nextId: 1, items: [] };
}
export const guardar = (st, d) => st.setJSON('propiedades', { nextId: d.nextId, items: d.items });

export async function borrarImgs(st, keys) {
  for (const k of keys || []) {
    try { await st.delete('img:' + k); await st.delete('thumb:' + k); } catch { /* ya no existía */ }
  }
}

export const KEY_RE = /^[a-z0-9-]{2,60}$/;
export const keyValida = (k) => KEY_RE.test(k) && !k.endsWith('-m');

export const hoy = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });

const TIPOS = ['casa', 'departamento', 'terreno', 'local', 'campo', 'otro'];
const ICONOS = ['dorm', 'bano', 'sup', 'ok'];
const CONOCIDOS = new Set(['id', 'op', 'tipo', 'titulo', 'ubic', 'ciudad', 'barrio', 'dorm', 'precio', 'moneda',
  'datos', 'desc', 'mapa', 'imgs', 'fotos', 'activa', 'fecha']);

export const str = (v, n) => String(v ?? '').replace(/[\u0000-\u0008\u000b-\u001f]/g, ' ').replace(/[\r\n\t]+/g, ' ').trim().slice(0, n);
const entero = (v, min, max) => Math.min(max, Math.max(min, parseInt(v, 10) || 0));

/** Valida y normaliza una propiedad. No asigna id ni fecha (lo hace quien llama). */
export function limpiar(b) {
  if (!b || typeof b !== 'object') throw new Pub('Datos inválidos');
  const r = {};
  r.op = b.op === 'alquiler' ? 'alquiler' : 'venta';
  r.tipo = TIPOS.includes(b.tipo) ? b.tipo : 'casa';
  r.titulo = str(b.titulo, 120);
  if (!r.titulo) throw new Pub('Falta el título de la propiedad');
  r.ciudad = str(b.ciudad, 60);
  r.barrio = str(b.barrio, 60);
  r.ubic = str(b.ubic, 150) || [r.barrio, r.ciudad].filter(Boolean).join(', ');
  r.dorm = entero(b.dorm, 0, 30);
  r.precio = entero(b.precio, 0, 9999999999);
  r.moneda = b.moneda === 'ARS' ? 'ARS' : 'USD';
  r.datos = (Array.isArray(b.datos) ? b.datos : []).slice(0, 12)
    .map((d) => [ICONOS.includes(d?.[0]) ? d[0] : 'ok', str(d?.[1], 40)]).filter((d) => d[1]);
  r.desc = String(b.desc ?? '').replace(/\r/g, '').replace(/[\u0000-\u0008\u000b-\u001f]/g, ' ').trim().slice(0, 4000);
  r.mapa = str(b.mapa, 200);
  r.imgs = (Array.isArray(b.imgs) ? b.imgs : []).filter((k) => typeof k === 'string' && KEY_RE.test(k)).slice(0, 24);
  r.fotos = r.imgs.length;
  r.activa = b.activa !== false;
  // Campos extra que ya existieran en tus datos (se conservan tal cual si son valores simples)
  for (const k of Object.keys(b)) {
    if (CONOCIDOS.has(k) || !/^[A-Za-z][A-Za-z0-9_]{0,29}$/.test(k)) continue;
    const v = b[k];
    if (typeof v === 'boolean' || (typeof v === 'number' && isFinite(v))) r[k] = v;
    else if (typeof v === 'string') r[k] = v.slice(0, 500);
  }
  return r;
}
