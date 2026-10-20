require('http').createServer((q,s)=>{s.end('hola '+process.env.SALUDO+' pto='+process.env.PTO+' clave='+(process.env.CLAVE||'').length)}).listen(process.env.PORT);
