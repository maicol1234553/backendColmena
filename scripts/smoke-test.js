/**
 * Prueba de extremo a extremo de la API de Evieland.
 * Uso: node scripts/smoke-test.js
 */
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const stamp = Date.now();
let token = null;

const call = async (method, path, body, raw = false) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (raw) return { status: res.status, blob: await res.blob() };
  let data = null;
  try { data = await res.json(); } catch { /* sin cuerpo */ }
  return { status: res.status, data };
};

const step = (n, msg) => console.log(`\n[${n}] ${msg}`);
const ok = (msg) => console.log(`    ✔ ${msg}`);
const fail = (msg, extra) => { console.log(`    ✖ ${msg}`, extra ?? ''); process.exitCode = 1; };

(async () => {
  console.log(`Probando API en ${BASE}`);

  step(1, 'Health check');
  {
    const { status, data } = await call('GET', '/api/health');
    status === 200 ? ok(`200 ${JSON.stringify(data)}`) : fail(`status ${status}`);
  }

  const email = `test-${stamp}@evieland.dev`;
  const password = 'secreto123';

  step(2, `Registro de usuario ${email}`);
  {
    const { status, data } = await call('POST', '/api/auth/register', { email, password, displayName: 'Apiario Test' });
    if (status === 201 && data.token) { token = data.token; ok(`201 · token JWT recibido · usuario #${data.user.id}`); }
    else fail(`status ${status}`, data);
  }

  step(3, 'Login con las mismas credenciales');
  {
    const { status, data } = await call('POST', '/api/auth/login', { email, password });
    if (status === 200 && data.token) { token = data.token; ok('200 · login correcto'); }
    else fail(`status ${status}`, data);
  }

  step(4, 'GET /api/auth/me');
  {
    const { status, data } = await call('GET', '/api/auth/me');
    status === 200 ? ok(`200 · ${data.user.email}`) : fail(`status ${status}`, data);
  }

  step(5, 'Listado de colmenas (deben ser 15 por defecto)');
  {
    const { status, data } = await call('GET', '/api/hives');
    if (status === 200) {
      ok(`200 · ${data.hives.length} colmenas · KPIs ${JSON.stringify(data.kpis)}`);
      console.log('      primeras 3:', data.hives.slice(0, 3).map((h) => h.name).join(', '));
    } else fail(`status ${status}`, data);
  }

  let hiveId = null;
  step(6, 'Crear una colmena extra');
  {
    const { status, data } = await call('POST', '/api/hives', { name: `Colmena Extra ${stamp}`, color: '#4F7A52' });
    if (status === 201) { hiveId = data.id; ok(`201 · id ${hiveId}`); }
    else fail(`status ${status}`, data);
  }

  step(7, 'Guardar un chequeo general');
  {
    const { status, data } = await call('POST', '/api/records/checkup', {
      hiveId: 1,
      date: '2026-10-08',
      super: 2,
      frame: 5,
      temperament: 'Manso',
      population: 'Alta',
      presence: { honey: true, beeBread: true, sealedBrood: true, openBrood: false },
      framePercentage: 75,
      queenStatus: 'Vista',
      foodReserve: 'Excelente',
      artificialFeed: false,
      hygiene: 'Bueno',
      health: 'Varroa',
      notes: 'Se observan ácaros en cuadros centrales.',
    });
    status === 201 ? ok(`201 · chequeo id ${data.id}`) : fail(`status ${status}`, data);
  }

  step(8, 'Guardar una cosecha');
  {
    const { status, data } = await call('POST', '/api/records/harvest', {
      hiveId: 1,
      date: '2026-10-07',
      super: 1,
      frame: 3,
      method: 'Centrífuga',
      replacementFrame: 'Con cera',
      missingFrames: 'Sin cera',
    });
    status === 201 ? ok(`201 · cosecha id ${data.id}`) : fail(`status ${status}`, data);
  }

  step(9, 'Historial de la colmena 1 (con filtro de fechas)');
  {
    const { status, data } = await call('GET', '/api/records/history?hiveId=1&from=2026-10-01&to=2026-10-31');
    if (status === 200) {
      ok(`200 · ${data.records.length} registros`);
      data.records.forEach((r) =>
        console.log(`      ${r.kind.padEnd(8)} ${r.date} alza ${r.super_} cuadro ${r.frame}`)
      );
    } else fail(`status ${status}`, data);
  }

  step(10, 'Exportar historial a Excel');
  {
    const { status, blob } = await call('GET', '/api/records/export?hiveId=1', null, true);
    if (status === 200 && blob.size > 0) {
      const buf = Buffer.from(await blob.arrayBuffer());
      const isXlsx = buf.slice(0, 2).toString() === 'PK'; // firma ZIP del .xlsx
      ok(`200 · ${buf.length} bytes · firma xlsx ${isXlsx ? 'correcta' : 'incorrecta'}`);
      const out = require('path').join(__dirname, 'export-test.xlsx');
      require('fs').writeFileSync(out, buf);
      console.log(`      guardado en ${out}`);
    } else fail(`status ${status}`);
  }

  console.log('\n──────────────────────────────');
  console.log(process.exitCode ? ' Hay fallos (ver ✖ arriba)' : ' Todas las pruebas pasaron');
})();
