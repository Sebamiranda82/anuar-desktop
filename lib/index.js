/* anuar-desktop — convierte una app Node (+ MariaDB opcional) en un programa de escritorio.
   Uso en la app (archivo launcher.js que el armador genera solo):
       require('./desktop').iniciar(require('./desktop.config.json'));
   Todo lo que cambia (base, configuración, registros) vive en  %LOCALAPPDATA%\<id>-datos  : actualizar el programa no lo toca. */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { spawn } = require('child_process');
const { pedirConfig } = require('./formulario');
const { prepararDB } = require('./mariadb');
const { resolverEntorno } = require('./entorno');

const dormir = ms => new Promise(r => setTimeout(r, ms));

function abrirNavegador(url) {
  try {
    const p = process.platform === 'win32' ? spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' })
      : spawn(process.platform === 'darwin' ? 'open' : 'xdg-open', [url], { detached: true, stdio: 'ignore' });
    p.on('error', () => {}); p.unref();
  } catch (_) {}
}

async function iniciar(cfg, opts) {
  opts = opts || {};
  const APP = opts.appDir || process.cwd();
  const base = process.env.LOCALAPPDATA || path.join(process.env.HOME || '.', '.local', 'share');
  const DATOS = opts.datosDir || path.join(base, cfg.id + '-datos');
  const LOGS = path.join(DATOS, 'logs'), CFG = path.join(DATOS, 'config.json');
  fs.mkdirSync(LOGS, { recursive: true });
  const log = (...a) => { const l = new Date().toISOString() + ' ' + a.join(' '); console.log(l); try { fs.appendFileSync(path.join(LOGS, 'app.log'), l + '\n'); } catch (_) {} };
  const hijos = [];
  const salir = c => { for (const h of hijos) { try { h.kill(); } catch (_) {} } setTimeout(() => process.exit(c || 0), 1500); };
  process.on('SIGINT', () => salir(0)); process.on('SIGTERM', () => salir(0));

  try {
    console.log(cfg.nombre + ' — no cierres esta ventana mientras uses el programa.');
    let guardado = null;
    try { guardado = JSON.parse(fs.readFileSync(CFG, 'utf8')); } catch (_) {}
    if (!guardado) {
      const campos = (cfg.campos && cfg.campos.length) ? await pedirConfig(cfg, { abrir: abrirNavegador, log, puerto: cfg.puertoConfig || 3998 }) : {};
      guardado = { campos, secretos: { dbClave: crypto.randomBytes(12).toString('hex'), rootClave: crypto.randomBytes(12).toString('hex') } };
      fs.mkdirSync(DATOS, { recursive: true });
      fs.writeFileSync(CFG, JSON.stringify(guardado, null, 2));
    }
    const db = cfg.baseDatos ? Object.assign({ puerto: cfg.puertoDb || 3307, usuario: cfg.id.replace(/[^a-z0-9_]/gi, '_').slice(0, 16) }, cfg.baseDatos) : null;
    if (db) {
      const r = await prepararDB({ db, secretos: guardado.secretos, app: APP, datos: DATOS, logs: LOGS, log, bin: opts.mariadbBin || path.join(APP, 'mariadb', 'bin'), hijos });
      db.clave = guardado.secretos.dbClave; void r;
    }
    const env = resolverEntorno(cfg, { campos: guardado.campos, db, secretos: guardado.secretos, datos: DATOS });
    const out = fs.openSync(path.join(LOGS, 'servidor.log'), 'a');
    const srv = spawn(process.execPath, [cfg.entrada || 'server.js'], { cwd: APP, env: Object.assign({}, process.env, env), stdio: ['ignore', out, out] });
    hijos.push(srv); srv.on('exit', c => { log('La app se detuvo (código ' + c + ')'); salir(c ? 1 : 0); });
    const puerto = cfg.puertoWeb || 3010, url = 'http://localhost:' + puerto;
    let ok = false;
    for (let i = 0; i < 45 && !ok; i++) { try { const r = await fetch('http://127.0.0.1:' + puerto + (cfg.listo || '/')); ok = r.status < 500; } catch (_) {} if (!ok) await dormir(1000); }
    if (!ok) { log('La app no respondió. Mirá', path.join(LOGS, 'servidor.log')); return salir(1); }
    log('Listo.'); abrirNavegador(url + (cfg.abrir || '/'));
    return { url, salir };
  } catch (e) {
    log('ERROR:', e.message); console.log('\nNo se pudo iniciar. Mandá la carpeta: ' + LOGS); setTimeout(() => salir(1), 60000);
  }
}
module.exports = { iniciar };
