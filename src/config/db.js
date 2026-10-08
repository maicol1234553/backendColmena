const mysql = require('mysql2/promise');

// TiDB Cloud es 100% compatible con el protocolo MySQL:
// basta con un pool de conexiones mysql2 y TLS activado.
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 4000),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL ? JSON.parse(process.env.DB_SSL) : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  dateStrings: true, // fechas como 'YYYY-MM-DD'
  timezone: 'Z',
});

module.exports = pool;
