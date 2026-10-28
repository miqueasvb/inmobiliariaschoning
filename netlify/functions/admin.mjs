import {
  store, json, Pub, firmar, verificar, leerCookie, cookieSesion, DURACION_SESION,
  claveValida, guardarClave, leer, guardar, borrarImgs, keyValida, limpiar, hoy, str,
} from '../lib/util.mjs';

const MAX_INTENTOS = 8;
const BLOQUEO_MS = 15 * 60 * 1000;
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function login(req, context) {
  const st = store();
  const ip = String(context?.ip || req.headers.get('x-nf-client-connection-ip') || 'desconocida').replace(/[^a-zA-Z0-9]/g, '_');
  const kRate = 'rate:' + ip;
  const rate = (await st.get(kRate, { type: 'json' })) || { n: 0, t: 0 };
  if (rate.n >= MAX_INTENTOS && Date.now() - rate.t < BLOQUEO_MS) {
    throw new Pub('Demasiados intentos. Esperá unos minutos y volvé a probar.', 429);
  }
  const b = await req.json().catch(() => ({}));
  if (!(await claveValida(b.usuario, b.clave))) {
    await st.setJSON(kRate, { n: (Date.now() - rate.t < BLOQUEO_MS ? rate.n : 0) + 1, t: Date.now() });
    await espera(700);
    throw new Pub('Usuario o contraseña incorrectos', 401);
  }
  if (rate.n) await st.delete(kRate);
  const token = firmar({ u: str(b.usuario, 60), exp: Date.now() + DURACION_SESION });
  return json({ ok: true }, 200, { 'Set-Cookie': cookieSesion(token, DURACION_SESION / 1000) });
}

export default async (req, context) => {
  const url = new URL(req.url);
  const ruta = url.pathname.replace(/^\/api\/admin\/?/, '').replace(/\/$/, '');
  const metodo = req.method;

  try {
    // Protección CSRF: toda escritura debe traer este encabezado (un sitio ajeno no puede enviarlo)
    if (metodo !== 'GET' && metodo !== 'HEAD' && req.headers.get('x-requested-with') !== 'panel') {
      throw new Pub('Solicitud no válida');
    }

    if (ruta === 'login' && metodo === 'POST') return await login(req, context);
    if (ruta === 'logout' && metodo === 'POST') return json({ ok: true }, 200, { 'Set-Cookie': cookieSesion('', 0) });

    const sesion = verificar(leerCookie(req));
    if (!sesion) throw new Pub('Sesión no iniciada', 401);
    const st = store();

    if (ruta === 'me' && metodo === 'GET') return json({ ok: true, usuario: sesion.u });

    /* ---------- Propiedades ---------- */
    if (ruta === 'props' && metodo === 'GET') return json(await leer(st));

    if (ruta === 'props' && metodo === 'POST') {            // crear
      const d = await leer(st);
      const item = limpiar(await req.json());
      item.id = d.nextId;
      item.fecha = hoy();
      d.items.push(item);
      d.nextId += 1;
      await guardar(st, d);
      return json({ item }, 201);
    }

    if (ruta === 'props/import' && metodo === 'POST') {     // importar las propiedades que ya tenías en js/propiedades-data.js
      const d = await leer(st);
      if (d.items.length) throw new Pub('Ya hay propiedades cargadas en el panel');
      const b = await req.json();
      const vistos = new Set(); let max = 0; const items = [];
      for (const x of (Array.isArray(b.items) ? b.items.slice(0, 1000) : [])) {
        const id = parseInt(x?.id, 10);
        if (!id || vistos.has(id)) continue;
        vistos.add(id); max = Math.max(max, id);
        const it = limpiar({ ...x, titulo: x.titulo || 'Propiedad ' + id });
        it.id = id; it.fecha = str(x.fecha, 20) || hoy();
        items.push(it);
      }
      await guardar(st, { nextId: max + 1, items });
      return json({ ok: true, importadas: items.length });
    }

    const m = ruta.match(/^props\/(\d+)$/);
    if (m) {
      const id = parseInt(m[1], 10);
      const d = await leer(st);
      const i = d.items.findIndex((p) => p.id === id);
      if (i < 0) throw new Pub('La propiedad no existe', 404);
      const prev = d.items[i];

      if (metodo === 'PUT') {                                // editar
        const item = limpiar(await req.json());
        item.id = id; item.fecha = prev.fecha;
        d.items[i] = item;
        await guardar(st, d);
        await borrarImgs(st, (prev.imgs || []).filter((k) => !item.imgs.includes(k)));
        return json({ item });
      }
      if (metodo === 'DELETE') {                             // eliminar
        d.items.splice(i, 1);
        await guardar(st, d);
        await borrarImgs(st, prev.imgs);
        return json({ ok: true });
      }
    }

    /* ---------- Fotos (ya vienen reducidas desde el navegador) ---------- */
    if (ruta === 'img' && metodo === 'POST') {
      const k = url.searchParams.get('k') || '';
      const miniatura = url.searchParams.get('m') === '1';
      if (!keyValida(k)) throw new Pub('Nombre de foto inválido');
      const buf = await req.arrayBuffer();
      const u8 = new Uint8Array(buf);
      if (buf.byteLength < 200 || buf.byteLength > 2_500_000) throw new Pub('La foto es demasiado pesada o está vacía', 413);
      if (!(u8[0] === 0xff && u8[1] === 0xd8 && u8[2] === 0xff)) throw new Pub('La foto debe ser JPG');
      await st.set((miniatura ? 'thumb:' : 'img:') + k, buf);
      return json({ ok: true });
    }

    /* ---------- Cambiar contraseña ---------- */
    if (ruta === 'password' && metodo === 'POST') {
      const b = await req.json().catch(() => ({}));
      if (!(await claveValida(sesion.u, b.actual))) throw new Pub('La contraseña actual no es correcta', 403);
      const nueva = String(b.nueva || '');
      if (nueva.length < 8) throw new Pub('La nueva contraseña debe tener al menos 8 caracteres');
      await guardarClave(sesion.u, nueva);
      return json({ ok: true });
    }

    throw new Pub('No encontrado', 404);
  } catch (e) {
    if (!e.publico) console.error(e);
    return json({ error: e.publico ? e.message : 'Error del servidor' }, e.publico ? e.status : 500);
  }
};

export const config = { path: '/api/admin/*' };
