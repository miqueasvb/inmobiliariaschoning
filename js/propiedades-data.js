/* ====== PROPIEDADES — editá acá datos, precios, fechas y fotos ======
   Lo usan propiedades.html (listado) y propiedad.html (ficha de cada propiedad).
   ⚠ Los PRECIOS Y FECHAS de abajo son de EJEMPLO: reemplazalos por los reales.
   op: 'venta' | 'alquiler'   moneda: 'USD' | 'ARS'   precio: número (0 = "Consultar")
   fecha: 'AAAA-MM-DD' de carga (para "Más recientes")   dorm: cantidad   datos: [icono, texto]

   Campos OPCIONALES para la ficha:
   fotos: cantidad de fotos (por defecto 1). Se llaman img/propiedades/prop-N.jpg, prop-N-2.jpg, prop-N-3.jpg…
   desc:  descripción larga (si no la ponés, no se muestra ese bloque)
   mapa:  'lat,lng' o una dirección para el mapa (si falta, usa "ubic")  */
window.SCH_PROPIEDADES = [
        { id: 1, op: 'venta',    tipo: 'casa',         titulo: 'Casa con patio y galería',          ciudad: 'Sáenz Peña', barrio: 'Centro',      ubic: 'Centro, Sáenz Peña',        precio: 95000,  moneda: 'USD', fecha: '2026-10-24', dorm: 3, datos: [['dorm','3 dorm.'], ['bano','2 baños'], ['sup','180 m²']] },
        { id: 2, op: 'alquiler', tipo: 'departamento', titulo: 'Departamento de 2 ambientes',       ciudad: 'Sáenz Peña', barrio: 'Zona norte',  ubic: 'Zona norte, Sáenz Peña',    precio: 450000, moneda: 'ARS', fecha: '2026-10-22', dorm: 1, datos: [['dorm','1 dorm.'], ['bano','1 baño'], ['sup','55 m²']] },
        { id: 3, op: 'venta',    tipo: 'terreno',      titulo: 'Terreno en esquina para construir', ciudad: 'Sáenz Peña', barrio: 'Zona sur',    ubic: 'Zona sur, Sáenz Peña',      precio: 38000,  moneda: 'USD', fecha: '2026-10-18', dorm: 0, datos: [['sup','450 m²'], ['ok','Con servicios']] },
        { id: 4, op: 'alquiler', tipo: 'local',        titulo: 'Local comercial sobre avenida',     ciudad: 'Sáenz Peña', barrio: 'Centro',      ubic: 'Centro, Sáenz Peña',        precio: 900000, moneda: 'ARS', fecha: '2026-10-12', dorm: 0, datos: [['sup','90 m²'], ['bano','1 baño']] },
        { id: 5, op: 'alquiler', tipo: 'casa',         titulo: 'Casa de 3 dormitorios con cochera', ciudad: 'Sáenz Peña', barrio: 'Zona este',   ubic: 'Zona este, Sáenz Peña',     precio: 700000, moneda: 'ARS', fecha: '2026-10-26', dorm: 3, datos: [['dorm','3 dorm.'], ['bano','2 baños'], ['sup','150 m²']] },
        { id: 6, op: 'venta',    tipo: 'campo',        titulo: 'Quinta con casa y arboleda',        ciudad: 'Sáenz Peña', barrio: 'Alrededores', ubic: 'Alrededores de Sáenz Peña', precio: 120000, moneda: 'USD', fecha: '2026-10-05', dorm: 2, datos: [['sup','2 ha'], ['dorm','2 dorm.']] }
];
