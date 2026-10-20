/* Variables de entorno de la app a partir de plantillas del archivo de configuración:
     "{campos.pto}" "{db.usuario}" "{db.clave}" "{db.puerto}" "{db.nombre}" "{puertoWeb}" "{datos}" "{aleatorio.hex32}" (estable: se guarda) */
const crypto = require('crypto');
function resolverEntorno(cfg, ctx) {
  const salida = {};
  const val = (ruta) => {
    if (ruta === 'puertoWeb') return cfg.puertoWeb || 3010;
    if (ruta === 'datos') return ctx.datos;
    if (ruta.startsWith('campos.')) return (ctx.campos || {})[ruta.slice(7)];
    if (ruta.startsWith('db.')) return ctx.db ? ctx.db[ruta.slice(3)] : undefined;
    const m = ruta.match(/^aleatorio\.hex(\d+)$/);
    if (m) { // estable por instalación: se deriva del secreto guardado
      return crypto.createHmac('sha256', (ctx.secretos && ctx.secretos.rootClave) || 'x').update('aleatorio.' + ruta).digest('hex').slice(0, Number(m[1]) * 2 > 64 ? 64 : Number(m[1]) * 2);
    }
    return undefined;
  };
  for (const [k, plantilla] of Object.entries(cfg.entorno || {})) {
    salida[k] = String(plantilla).replace(/\{([^}]+)\}/g, (_, r) => { const v = val(r.trim()); return v === undefined || v === null ? '' : String(v); });
  }
  return salida;
}
module.exports = { resolverEntorno };
