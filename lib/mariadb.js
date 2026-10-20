/* MariaDB portable: crea la base la primera vez, la arranca, carga el esquema y crea el usuario de la app. Solo escucha en 127.0.0.1. */
const fs = require('fs'), path = require('path');
const { spawn, spawnSync } = require('child_process');
const dormir = ms => new Promise(r => setTimeout(r, ms));
const EXE = process.platform === 'win32' ? '.exe' : '';

// Convierte un volcado de MySQL 8 a algo que MariaDB entienda
function limpiarSql(sql) {
  return sql.replace(/utf8mb4_0900_ai_ci/g, 'utf8mb4_general_ci').replace(/utf8mb4_0900_bin/g, 'utf8mb4_bin').replace(/utf8mb3/g, 'utf8');
}
function sentencias(sql) {
  return limpiarSql(sql).split(/;\s*\n/).map(s => s.trim()).filter(t => t && !(/^(--|\/\*!4)/.test(t) && !/CREATE/i.test(t)));
}
async function conectar(db, usuario, clave, bd, socket) {
  const mysql = require('mysql2/promise');
  const base = socket ? { socketPath: socket } : null;
  if (base) return mysql.createConnection(Object.assign({ user: usuario, password: clave, database: bd }, base));
  for (const host of ['127.0.0.1', 'localhost']) {
    try { return await mysql.createConnection({ host, port: db.puerto, user: usuario, password: clave, database: bd }); } catch (e) { if (host === 'localhost') throw e; }
  }
}
async function prepararDB({ db, secretos, app, datos, logs, log, bin, hijos }) {
  const dir = path.join(datos, 'db');
  if (!fs.existsSync(path.join(dir, 'mysql'))) {
    log('Creando la base de datos local…');
    const r = spawnSync(path.join(bin, 'mariadb-install-db' + EXE), ['--datadir=' + dir, '--password=' + secretos.rootClave], { encoding: 'utf8' });
    if (r.status !== 0) { log('Error al crear la base:', r.stderr || r.stdout); throw new Error('No se pudo crear la base de datos local.'); }
  }
  log('Iniciando la base de datos…');
  const out = fs.openSync(path.join(logs, 'mariadb.log'), 'a');
  const p = spawn(path.join(bin, 'mariadbd' + EXE), ['--datadir=' + dir, '--port=' + db.puerto, '--bind-address=127.0.0.1', '--character-set-server=utf8mb4', '--collation-server=utf8mb4_general_ci', '--sql-mode='], { stdio: ['ignore', out, out] });
  hijos.push(p); p.on('exit', c => log('MariaDB se detuvo (código ' + c + ')'));
  let root = null;
  for (let i = 0; i < 60 && !root; i++) { await dormir(1000); try { root = await conectar(db, 'root', secretos.rootClave); } catch (_) {} }
  if (!root) throw new Error('La base de datos no arrancó. Mirá ' + path.join(logs, 'mariadb.log'));
  const [ya] = await root.query('SELECT COUNT(*) c FROM information_schema.schemata WHERE schema_name=?', [db.nombre]);
  if (!ya[0].c) {
    await root.query('CREATE DATABASE `' + db.nombre + '` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci');
    if (db.esquema) {
      log('Cargando la estructura de tablas…');
      await root.query('USE `' + db.nombre + '`');
      let malos = 0;
      for (const st of sentencias(fs.readFileSync(path.join(app, db.esquema), 'utf8'))) { try { await root.query(st); } catch (e) { malos++; log('SQL omitido:', e.message.slice(0, 140)); } }
      log('Estructura cargada (' + malos + ' sentencias omitidas).');
    }
  }
  for (const h of ['localhost', '127.0.0.1']) {
    await root.query("CREATE USER IF NOT EXISTS '" + db.usuario + "'@'" + h + "' IDENTIFIED BY '" + secretos.dbClave + "'");
    await root.query("ALTER USER '" + db.usuario + "'@'" + h + "' IDENTIFIED BY '" + secretos.dbClave + "'");
    await root.query('GRANT ALL ON `' + db.nombre + '`.* TO \'' + db.usuario + "'@'" + h + "'");
  }
  await root.end();
}
module.exports = { prepararDB, limpiarSql, sentencias };
