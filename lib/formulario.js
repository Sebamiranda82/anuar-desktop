/* Pantalla de primera configuración generada desde  cfg.campos:
   [{ id, etiqueta, ayuda, defecto, patron (regex), error, secreto }]  — se muestra una sola vez en el navegador. */
const http = require('http');
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function pedirConfig(cfg, { abrir, log, puerto }) {
  const campos = cfg.campos;
  const reglas = campos.map(c => ({ id: c.id, patron: c.patron || null, error: c.error || ('Revisá "' + c.etiqueta + '".') }));
  const html = `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>${esc(cfg.nombre)}</title>
<style>body{margin:0;font:15px system-ui,Segoe UI,Arial;background:#10243b;display:flex;min-height:100vh;align-items:center;justify-content:center}.c{background:#fff;border-radius:10px;padding:26px;width:420px;max-width:94vw}
h2{margin:0 0 6px}p{color:#6b7785;margin:0 0 10px}label{display:block;font-size:11px;color:#6b7785;text-transform:uppercase;margin:10px 0 3px}input{width:100%;padding:9px;border:1px solid #d9e0e7;border-radius:6px;font:inherit;box-sizing:border-box}
button{margin-top:16px;width:100%;padding:11px;border:0;border-radius:6px;background:#0b6bcb;color:#fff;font:inherit;font-weight:600;cursor:pointer}#m{margin-top:10px;color:#c0392b}small{color:#6b7785}</style>
<div class=c><h2>${esc(cfg.nombre)}</h2><p>${esc(cfg.textoConfig || 'Estos datos se piden una sola vez.')}</p>
${campos.map(c => `<label>${esc(c.etiqueta)}</label><input id="f_${esc(c.id)}" value="${esc(c.defecto)}" ${c.secreto ? 'type=password' : ''} autocomplete=off>${c.ayuda ? '<small>' + esc(c.ayuda) + '</small>' : ''}`).join('')}
<button onclick=go()>Guardar y continuar</button><div id=m></div></div>
<script>const R=${JSON.stringify(reglas)};async function go(){const b={};for(const r of R){const v=document.getElementById('f_'+r.id).value.trim();
if(r.patron&&!new RegExp(r.patron).test(v))return m.textContent=r.error;b[r.id]=v}
const x=await fetch('/guardar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});const j=await x.json();
if(!j.ok)return m.textContent=j.error||'No se pudo guardar';document.body.innerHTML='<div class=c><h2>Listo</h2><p>Ya podés cerrar esta pestaña. El programa se abre solo en unos segundos.</p></div>'}</script>`;
  return new Promise(resolve => {
    const srv = http.createServer((q, s) => {
      if (q.method === 'POST' && q.url === '/guardar') {
        let b = ''; q.on('data', d => b += d); q.on('end', () => {
          try {
            const v = JSON.parse(b), out = {};
            for (const c of campos) {
              const x = String(v[c.id] == null ? '' : v[c.id]).trim();
              if (c.patron && !new RegExp(c.patron).test(x)) throw new Error(c.error || ('Revisá "' + c.etiqueta + '".'));
              out[c.id] = x;
            }
            s.setHeader('content-type', 'application/json'); s.end('{"ok":true}');
            setTimeout(() => { srv.close(); resolve(out); }, 300);
          } catch (e) { s.statusCode = 400; s.setHeader('content-type', 'application/json'); s.end(JSON.stringify({ ok: false, error: e.message })); }
        });
      } else { s.setHeader('content-type', 'text/html; charset=utf-8'); s.end(html); }
    }).listen(puerto, '127.0.0.1', () => { log('Primera configuración: abriendo el navegador…'); abrir('http://127.0.0.1:' + puerto + '/'); });
  });
}
module.exports = { pedirConfig };
