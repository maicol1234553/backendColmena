const db = require('../config/db');
const { asyncHandler } = require('../middleware/error');

/** GET /api/hives — colmenas del usuario con KPIs */
exports.list = asyncHandler(async (req, res) => {
  const [hives] = await db.query(
    `SELECT id, name, color, status, total_checkups, total_harvests,
            last_activity, last_health
       FROM vw_hive_summary
      WHERE user_id = ? AND status = 'active'
      ORDER BY CAST(SUBSTRING_INDEX(name, ' ', -1) AS UNSIGNED), id`,
    [req.user.id]
  );
  const [kpis] = await db.query(
    `SELECT (SELECT COUNT(*) FROM hives    WHERE user_id = ? AND status='active') AS activeHives,
            (SELECT COUNT(*) FROM checkups WHERE user_id = ?)                    AS totalCheckups,
            (SELECT COUNT(*) FROM harvests WHERE user_id = ?)                    AS totalHarvests,
            (SELECT COUNT(*) FROM checkups WHERE user_id = ? AND health_status <> 'Sano'
               AND check_date >= CURDATE() - INTERVAL 30 DAY)                    AS alerts`,
    [req.user.id, req.user.id, req.user.id, req.user.id]
  );
  res.json({ hives, kpis: kpis[0] });
});

/** POST /api/hives — crear colmena */
exports.create = asyncHandler(async (req, res) => {
  const { name, color } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'El nombre es obligatorio' });

  const [dup] = await db.query('SELECT id FROM hives WHERE user_id = ? AND name = ?', [
    req.user.id,
    name.trim(),
  ]);
  if (dup.length) return res.status(409).json({ error: 'Ya existe una colmena con ese nombre' });

  const [result] = await db.query(
    'INSERT INTO hives (user_id, name, color) VALUES (?, ?, ?)',
    [req.user.id, name.trim(), color || '#E8A33D']
  );
  res.status(201).json({ id: result.insertId, name: name.trim(), color: color || '#E8A33D' });
});

/** DELETE /api/hives/:id — archivar colmena */
exports.remove = asyncHandler(async (req, res) => {
  const [result] = await db.query(
    "UPDATE hives SET status = 'inactive' WHERE id = ? AND user_id = ?",
    [req.params.id, req.user.id]
  );
  if (!result.affectedRows) return res.status(404).json({ error: 'Colmena no encontrada' });
  res.json({ ok: true });
});
