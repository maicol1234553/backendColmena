/**
 * Verifica que las dos ramas del UNION del historial tienen el mismo nº de columnas.
 * Uso: node scripts/check-union.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const NULLS = `NULL, NULL, 0, 0, 0, 0, 0, NULL, NULL, 0, NULL, NULL, NULL`;

const CHECKUP = `
  SELECT 'checkup' AS kind, c.id, c.check_date AS date,
         c.super_, c.frame, c.temperament, c.population,
         c.has_honey, c.has_bee_bread, c.has_sealed_brood, c.has_open_brood,
         c.frame_percentage, c.queen_status, c.food_reserve,
         c.artificial_feed, c.hygiene_behavior, c.health_status, c.notes,
         NULL AS method, NULL AS replacement_frame, NULL AS missing_frames
    FROM checkups c WHERE 1 = 0`;

const HARVEST = `
  SELECT 'harvest' AS kind, s.id, s.harvest_date AS date,
         s.super_, s.frame, ${NULLS},
         s.method, s.replacement_frame, s.missing_frames
    FROM harvests s WHERE 1 = 0`;

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 4000),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL ? JSON.parse(process.env.DB_SSL) : undefined,
    database: process.env.DB_NAME,
    dateStrings: true,
  });

  try {
    // mysql2 devuelve campos de resultado aunque no haya filas: es la forma
    // fiable de contar columnas de cada rama por separado.
    const [ra, fa] = await conn.query(CHECKUP);
    const [rb, fb] = await conn.query(HARVEST);
    const ca = fa.length;
    const cb = fb.length;

    console.log(`columnas rama checkup : ${ca}`);
    console.log(`columnas rama harvest : ${cb}`);
    console.log(`orden checkup: ${fa.map((f) => f.name).join(', ')}`);
    console.log(`orden harvest: ${fb.map((f) => f.name).join(', ')}`);
    void ra; void rb;

    // Ejecutar el UNION real, que es lo que fallaba
    const [, rows] = await conn.query(`(${CHECKUP}) UNION ALL (${HARVEST})`);
    console.log(`\nUNION ejecutado sin error ✔ (${rows.length} columnas en el resultado)`);

    if (ca === cb && ca > 0) console.log(' Coincidencia de columnas correcta.');
    else { console.log('\n ✖ Siguen sin coincidir.'); process.exitCode = 1; }
  } catch (e) {
    console.error('✖', e.message);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
})();
