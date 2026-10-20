// node prueba/test.js  — pruebas de las piezas que no dependen de Windows
const assert = require('assert');
const { resolverEntorno } = require('../lib/entorno');
const { limpiarSql, sentencias } = require('../lib/mariadb');
const cfg = { puertoWeb: 3010, entorno: { A: '{campos.x}-{db.usuario}:{db.puerto}', K: '{aleatorio.hex32}', H: '{aleatorio.hex16}', P: '{puertoWeb}', N: '{noexiste}' } };
const ctx = { campos: { x: 'uno' }, db: { usuario: 'u', puerto: 3307 }, secretos: { rootClave: 'abc' }, datos: '/d' };
const e = resolverEntorno(cfg, ctx);
assert.strictEqual(e.A, 'uno-u:3307'); assert.strictEqual(e.P, '3010'); assert.strictEqual(e.N, '');
assert.strictEqual(e.K.length, 64); assert.strictEqual(e.H.length, 32);
assert.strictEqual(resolverEntorno(cfg, ctx).K, e.K, 'el valor aleatorio debe ser estable');
assert.notStrictEqual(resolverEntorno(cfg, { ...ctx, secretos: { rootClave: 'otra' } }).K, e.K);
const sql = '/*!40101 SET x=1 */;\nCREATE TABLE `a` (`n` varchar(5) COLLATE utf8mb4_0900_ai_ci) DEFAULT CHARSET=utf8mb3;\n-- c\nCREATE TABLE `b` (`i` int);\n';
const s = sentencias(sql);
assert.strictEqual(s.length, 2); assert(!/0900|utf8mb3/.test(s.join()));
console.log('todo ok');
