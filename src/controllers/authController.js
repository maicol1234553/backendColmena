const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { asyncHandler } = require('../middleware/error');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const signToken = (user) =>
  jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES || '7d',
  });

const publicUser = (u) => ({ id: u.id, email: u.email, displayName: u.display_name });

/** POST /api/auth/register */
exports.register = asyncHandler(async (req, res) => {
  const { email, password, displayName } = req.body || {};
  if (!EMAIL_RE.test(email || '')) return res.status(400).json({ error: 'Correo inválido' });
  if ((password || '').length < 8)
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });

  const [exists] = await db.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
  if (exists.length) return res.status(409).json({ error: 'Ese correo ya está registrado' });

  const hash = await bcrypt.hash(password, 10);
  const [result] = await db.query(
    'INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)',
    [email.toLowerCase(), hash, displayName || null]
  );

  // Alta de las 15 colmenas por defecto del usuario
  const colors = ['#E8A33D', '#D98B2B', '#C97F1E', '#B98A4F', '#A98C5E'];
  const rows = Array.from({ length: 15 }, (_, i) => [
    result.insertId,
    `Colmena ${i + 1}`,
    colors[i % colors.length],
  ]);
  await db.query('INSERT INTO hives (user_id, name, color) VALUES ?', [rows]);

  const user = { id: result.insertId, email: email.toLowerCase(), display_name: displayName };
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

/** POST /api/auth/login */
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [(email || '').toLowerCase()]);
  const user = rows[0];
  if (!user) return res.status(401).json({ error: 'Credenciales incorrectas' });

  const ok = await bcrypt.compare(password || '', user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Credenciales incorrectas' });

  res.json({ token: signToken(user), user: publicUser(user) });
});

/** GET /api/auth/me  (requiere token) */
exports.me = asyncHandler(async (req, res) => {
  const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({ user: publicUser(rows[0]) });
});
