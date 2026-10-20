#!/usr/bin/env node
/* Arma la carpeta del programa (stage) y el script del instalador a partir de  desktop.config.json  de la app.
   Uso (en la carpeta de la app):  node ruta/a/anuar-desktop/bin/armar.js [--salida stage]
   Lo usa el flujo de GitHub; también sirve para probar en tu PC. */
const fs = require('fs'), path = require('path');
const LIB = path.resolve(__dirname, '..');
const arg = n => { const i = process.argv.indexOf('--' + n); return i > -1 ? process.argv[i + 1] : null; };
const APP = process.cwd(), SAL = path.resolve(APP, arg('salida') || 'stage');
const die = m => { console.error('ERROR: ' + m); process.exit(1); };

if (!fs.existsSync(path.join(APP, 'desktop.config.json'))) die('no encuentro desktop.config.json en ' + APP);
const cfg = JSON.parse(fs.readFileSync(path.join(APP, 'desktop.config.json'), 'utf8'));
for (const k of ['id', 'nombre']) if (!cfg[k]) die('desktop.config.json: falta "' + k + '"');
if (!/^[a-z0-9][a-z0-9-]*$/.test(cfg.id)) die('"id" solo minúsculas, números y guiones');
const entrada = cfg.entrada || 'server.js';
if (!fs.existsSync(path.join(APP, entrada))) die('no existe la entrada "' + entrada + '"');
if (cfg.baseDatos) {
  if (!fs.existsSync(path.join(APP, 'node_modules', 'mysql2'))) die('la app usa base de datos: agregá "mysql2" a sus dependencias');
  if (cfg.baseDatos.esquema && !fs.existsSync(path.join(APP, cfg.baseDatos.esquema))) die('no existe el esquema "' + cfg.baseDatos.esquema + '"');
}

const rx = g => new RegExp('^' + g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/\\\\]*') + '$');
const excl = (cfg.excluir || ['*backup*']).map(rx);
const excluido = n => excl.some(r => r.test(n));
function copiar(origen, destino) {
  const st = fs.statSync(origen);
  if (st.isDirectory()) { fs.mkdirSync(destino, { recursive: true }); for (const f of fs.readdirSync(origen)) if (!excluido(f)) copiar(path.join(origen, f), path.join(destino, f)); }
  else fs.copyFileSync(origen, destino);
}
fs.rmSync(SAL, { recursive: true, force: true }); fs.mkdirSync(SAL, { recursive: true });
let n = 0;
for (const pat of cfg.incluir || ['*.js', 'package.json', 'public', 'node_modules']) {
  if (pat.includes('*')) { for (const f of fs.readdirSync(APP)) if (rx(pat).test(f) && !excluido(f) && fs.statSync(path.join(APP, f)).isFile()) { copiar(path.join(APP, f), path.join(SAL, f)); n++; } }
  else { if (!fs.existsSync(path.join(APP, pat))) die('"incluir" menciona algo que no existe: ' + pat); copiar(path.join(APP, pat), path.join(SAL, pat)); n++; }
}
if (cfg.baseDatos && cfg.baseDatos.esquema) copiar(path.join(APP, cfg.baseDatos.esquema), path.join(SAL, cfg.baseDatos.esquema));
copiar(path.join(LIB, 'lib'), path.join(SAL, 'desktop'));
fs.copyFileSync(path.join(APP, 'desktop.config.json'), path.join(SAL, 'desktop.config.json'));
fs.writeFileSync(path.join(SAL, 'launcher.js'), "require('./desktop').iniciar(require('./desktop.config.json'), { appDir: __dirname });\n");
fs.mkdirSync(path.join(SAL, 'node'), { recursive: true });
fs.copyFileSync(process.execPath, path.join(SAL, 'node', process.platform === 'win32' ? 'node.exe' : 'node'));
const sust = t => t.replace(/\{\{(\w+)\}\}/g, (_, k) => ({ nombre: cfg.nombre, id: cfg.id, version: cfg.version || '1.0', editor: cfg.editor || '', stage: path.basename(SAL) }[k] || ''));
fs.writeFileSync(path.join(SAL, 'iniciar.bat'), sust(fs.readFileSync(path.join(LIB, 'plantillas', 'iniciar.bat'), 'utf8')).replace(/\r?\n/g, '\r\n'));
fs.writeFileSync(path.join(path.dirname(SAL), 'app.iss'), sust(fs.readFileSync(path.join(LIB, 'plantillas', 'app.iss'), 'utf8')));
console.log('Carpeta lista: ' + SAL + ' (' + n + ' elementos de "incluir")' + (cfg.baseDatos ? ' · falta agregar mariadb\\ (lo hace el flujo de GitHub)' : ''));
