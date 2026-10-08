/**
 * Simula la forma en que Vercel invoca la función serverless:
 *   - recibe (req, res) del runtime Node http
 *   - la URL que llega es la ruta ORIGINAL completa (/api/auth/login)
 *     tras el rewrite de vercel.json
 * Uso: node scripts/test-serverless.js
 */
const http = require('http');

// El mismo módulo que Vercel carga desde api/index.js
const handler = require('../../api/index.js');

const server = http.createServer(handler);

const call = (path, opts = {}) =>
  new Promise((resolve, reject) => {
    const req = http.request(
      { host: '127.0.0.1', port: 4100, path, method: opts.method || 'GET',
        headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) } },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve({ status: res.statusCode, body }));
      }
    );
    req.on('error', reject);
    if (opts.body) req.write(JSON.stringify(opts.body));
    req.end();
  });

(async () => {
  await new Promise((r) => server.listen(4100, r));
  console.log('Handler serverless escuchando en :4100 (simulando Vercel)\n');

  const email = `svl-${Date.now()}@evieland.dev`;
  let token = null;
  let fails = 0;

  const step = async (n, msg, fn) => {
    process.stdout.write(`[${n}] ${msg} … `);
    try {
      const r = await fn();
      if (r.status >= 200 && r.status < 300) { console.log(`✔ ${r.status}`); return r; }
      console.log(`✖ ${r.status} ${r.body.slice(0, 160)}`); fails++; return r;
    } catch (e) { console.log(`✖ ${e.message}`); fails++; return null; }
  };

  // 1. Salud
  await step(1, 'GET /api/health', () => call('/api/health'));

  // 2. Registro (la URL llega completa tras el rewrite)
  const r2 = await step(2, 'POST /api/auth/register', () =>
    call('/api/auth/register', { method: 'POST', body: { email, password: 'secreto123' } })
  );
  if (r2?.body) { try { token = JSON.parse(r2.body).token; } catch { /* ignore */ } }

  // 3. Ruta protegida con Bearer (verifica el middleware de auth)
  await step(3, 'GET /api/hives (con token)', () =>
    call('/api/hives', { headers: { Authorization: `Bearer ${token}` } })
  );

  // 4. Ruta protegida SIN token -> debe ser 401, no 500
  {
    process.stdout.write('[4] GET /api/hives sin token (esperado 401) … ');
    const r = await call('/api/hives');
    if (r.status === 401) console.log('✔ 401');
    else { console.log(`✖ ${r.status}`); fails++; }
  }

  // 5. Ruta inexistente bajo /api -> 401/404 del manejador, no crash
  {
    process.stdout.write('[5] GET /api/que-existe (esperado 404) … ');
    const r = await call('/api/que-existe', { headers: { Authorization: `Bearer ${token}` } });
    if (r.status === 404) console.log('✔ 404');
    else { console.log(`✖ ${r.status}`); fails++; }
  }

  server.close();
  console.log(`\n${fails ? `✖ ${fails} fallo(s)` : '✔ El handler serverless responde correctamente'}`);
  process.exitCode = fails ? 1 : 0;
})();
