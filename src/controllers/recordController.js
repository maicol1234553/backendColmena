const db = require('../config/db');
const { asyncHandler } = require('../middleware/error');

/** POST /api/records/checkup */
exports.createCheckup = asyncHandler(async (req, res) => {
  const b = req.body || {};
  const [result] = await db.query(
    `INSERT INTO checkups
      (hive_id, user_id, check_date, super_, frame, temperament, population,
       has_honey, has_bee_bread, has_sealed_brood, has_open_brood, frame_percentage,
       queen_status, food_reserve, artificial_feed, hygiene_behavior, health_status, notes)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      b.hiveId, req.user.id, b.date, b.super || 1, b.frame || 1,
      b.temperament || 'Manso', b.population || 'Media',
      b.presence?.honey ? 1 : 0,
      b.presence?.beeBread ? 1 : 0,
      b.presence?.sealedBrood ? 1 : 0,
      b.presence?.openBrood ? 1 : 0,
      b.framePercentage ?? 0,
      b.queenStatus || 'Vista', b.foodReserve || 'Buena',
      b.artificialFeed ? 1 : 0,
      b.hygiene || 'Bueno', b.health || 'Sano',
      b.notes || null,
    ]
  );
  res.status(201).json({ id: result.insertId, kind: 'checkup' });
});

/** POST /api/records/harvest */
exports.createHarvest = asyncHandler(async (req, res) => {
  const b = req.body || {};
  const [result] = await db.query(
    `INSERT INTO harvests
      (hive_id, user_id, harvest_date, super_, frame, method, replacement_frame, missing_frames)
     VALUES (?,?,?,?,?,?,?,?)`,
    [
      b.hiveId, req.user.id, b.date, b.super || 1, b.frame || 1,
      b.method || 'Centrífuga',
      b.replacementFrame || 'Con cera',
      b.missingFrames || 'Con cera',
    ]
  );
  res.status(201).json({ id: result.insertId, kind: 'harvest' });
});

/** GET /api/records/history?hiveId&from&to  — historial unificado y paginado */
exports.history = asyncHandler(async (req, res) => {
  const { hiveId, from, to, kind } = req.query;
  const showCheckup = kind !== 'harvest';
  const showHarvest = kind !== 'checkup';

  // IMPORTANTE: ambas ramas del UNION deben tener el mismo número de columnas,
  // en el mismo orden. El SELECT de cosechas reserva un NULL por cada columna
  // propia de los chequeos (temperament…notes) y luego las suyas.
  const checkupSQL = `
    SELECT 'checkup' AS kind, c.id, c.check_date AS date,
           c.super_, c.frame, c.temperament, c.population,
           c.has_honey, c.has_bee_bread, c.has_sealed_brood, c.has_open_brood,
           c.frame_percentage, c.queen_status, c.food_reserve,
           c.artificial_feed, c.hygiene_behavior, c.health_status, c.notes,
           NULL AS method, NULL AS replacement_frame, NULL AS missing_frames
      FROM checkups c
     WHERE c.hive_id = ? AND c.user_id = ?
       AND (? IS NULL OR c.check_date >= ?) AND (? IS NULL OR c.check_date <= ?)`;

  //                kind, id, date, super_, frame,
  const nulls1 = 'NULL, NULL, ' +                     // temperament, population
    '0, 0, 0, 0, ' +                                   // has_honey … has_open_brood
    '0, NULL, NULL, ' +                                // frame_percentage, queen, food
    '0, NULL, NULL, NULL';                             // artificial, hygiene, health, notes
  const harvestSQL = `
    SELECT 'harvest' AS kind, s.id, s.harvest_date AS date,
           s.super_, s.frame, ${nulls1},
           s.method, s.replacement_frame, s.missing_frames
      FROM harvests s
     WHERE s.hive_id = ? AND s.user_id = ?
       AND (? IS NULL OR s.harvest_date >= ?) AND (? IS NULL OR s.harvest_date <= ?)`;

  const dates = [from || null, from || null, to || null, to || null];
  const parts = [];
  const p = [];

  if (showCheckup) {
    parts.push(checkupSQL);
    p.push(hiveId, req.user.id, ...dates);
  }
  if (showHarvest) {
    parts.push(harvestSQL);
    p.push(hiveId, req.user.id, ...dates);
  }

  const sql = parts.join(' UNION ALL ') + ' ORDER BY date DESC, id DESC LIMIT 500';
  const [rows] = await db.query(sql, p);
  res.json({ records: rows });
});

/** DELETE /api/records/:kind/:id */
exports.remove = asyncHandler(async (req, res) => {
  const table = req.params.kind === 'harvest' ? 'harvests' : 'checkups';
  const [result] = await db.query(`DELETE FROM ${table} WHERE id = ? AND user_id = ?`, [
    req.params.id,
    req.user.id,
  ]);
  if (!result.affectedRows) return res.status(404).json({ error: 'Registro no encontrado' });
  res.json({ ok: true });
});
