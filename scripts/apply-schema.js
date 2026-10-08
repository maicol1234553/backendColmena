/**
 * Aplica database/schema.sql contra la instancia de TiDB configurada en .env.
 * Uso:  node scripts/apply-schema.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

(async () => {
  const schemaPath = path.join(__dirname, '..', '..', 'database', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 4000),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL ? JSON.parse(process.env.DB_SSL) : undefined,
    multipleStatements: true,
    dateStrings: true,
    charset: 'utf8mb4',
  });

  try {
    console.log(' Conectando a TiDB…');
    await conn.ping();
    console.log(' Conexión OK. Aplicando esquema…\n');

    // El esquema usa IF NOT EXISTS, así que es seguro re-ejecutarlo.
    const [result] = await conn.query(sql);
    const messages = Array.isArray(result) ? result : [result];
    messages.forEach((r, i) => {
      if (r?.constructor?.name === 'OkPacket' || r?.affectedRows !== undefined) {
        console.log(`  ✔ sentencia ${i + 1}: OK`);
      } else if (r?.constructor?.name === 'ResultSetHeader') {
        console.log(`  ✔ sentencia ${i + 1}: OK`);
      }
    });

    // Verificación: listar tablas y vistas creadas
    const [tables] = await conn.query(
      "SELECT TABLE_NAME AS name, TABLE_TYPE AS type FROM information_schema.tables WHERE TABLE_SCHEMA = ? ORDER BY type, name",
      [process.env.DB_NAME]
    );
    console.log('\nObjetos en el esquema:');
    tables.forEach((t) => console.log(`  ${t.type === 'VIEW' ? '👁 ' : '▦  '} ${t.name}`));

    const [cols] = await conn.query(
      'SELECT COUNT(*) AS n FROM information_schema.columns WHERE TABLE_SCHEMA = ?',
      [process.env.DB_NAME]
    );
    console.log(`\nTotal columnas: ${cols[0].n}`);
    console.log('\n Esquema aplicado correctamente.');
  } catch (err) {
    console.error('\n✖ Error aplicando el esquema:');
    console.error(' ', err.message);
    if (err.code === 'ER_NOT_SUPPORTED_AUTH_MODE') {
      console.error('  → TiDB Cloud requiere TLS. Revisa DB_SSL en .env');
    }
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
})();
