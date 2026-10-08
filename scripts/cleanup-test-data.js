/**
 * Elimina los usuarios de prueba creados por smoke-test.js y sus datos.
 * Uso: node scripts/cleanup-test-data.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

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
    // Solo toca usuarios de prueba (correo test-…@evieland.dev)
    const [users] = await conn.query(
      "SELECT id, email FROM users WHERE email LIKE 'test-%@evieland.dev'"
    );
    if (!users.length) {
      console.log('No hay usuarios de prueba que limpiar.');
      return;
    }
    console.log('Usuarios de prueba a eliminar:');
    users.forEach((u) => console.log(`  #${u.id} ${u.email}`));
    const ids = users.map((u) => u.id);

    await conn.beginTransaction();
    await conn.query('DELETE FROM checkups WHERE user_id IN (?)', [ids]);
    await conn.query('DELETE FROM harvests WHERE user_id IN (?)', [ids]);
    await conn.query('DELETE FROM hives WHERE user_id IN (?)', [ids]);
    await conn.query('DELETE FROM users WHERE id IN (?)', [ids]);
    await conn.commit();

    const [[c]] = await conn.query(
      'SELECT (SELECT COUNT(*) FROM users) AS users, (SELECT COUNT(*) FROM hives) AS hives, (SELECT COUNT(*) FROM checkups) AS checkups, (SELECT COUNT(*) FROM harvests) AS harvests'
    );
    console.log('\nLimpiado. Estado actual de la base:');
    console.log(`  users=${c.users} hives=${c.hives} checkups=${c.checkups} harvests=${c.harvests}`);
  } catch (e) {
    await conn.rollback();
    console.error('✖', e.message);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
})();
