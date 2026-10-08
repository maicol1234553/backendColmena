const ExcelJS = require('exceljs');
const db = require('../config/db');
const { asyncHandler } = require('../middleware/error');

const HEADERS = {
  checkup: [
    'Colmena', 'Fecha', 'Alza', 'Cuadro', 'Temperamento', 'Población',
    'Presencia en el cuadro', '% Cuadro', 'Reina', 'Reserva de alimento',
    'Alimentación artificial', 'Comportamiento higiénico', 'Estado sanitario', 'Observaciones',
  ],
  harvest: [
    'Colmena', 'Fecha', 'Alza', 'Cuadro', 'Método',
    'Cuadro de reemplazo', 'Cuadros faltantes',
  ],
};

const PRESENCE = (r) =>
  [
    r.has_honey ? 'Miel' : null,
    r.has_bee_bread ? 'Pan de abeja' : null,
    r.has_sealed_brood ? 'Cría operculada' : null,
    r.has_open_brood ? 'Cría abierta' : null,
  ]
    .filter(Boolean)
    .join(', ');

/** GET /api/records/export?hiveId=&from=&to=  → .xlsx descargable */
exports.exportExcel = asyncHandler(async (req, res) => {
  const { hiveId, from, to } = req.query;

  const [checkups] = await db.query(
    `SELECT h.name, c.* FROM checkups c JOIN hives h ON h.id = c.hive_id
      WHERE c.user_id = ?
        AND (? IS NULL OR c.hive_id = ?)
        AND (? IS NULL OR c.check_date >= ?) AND (? IS NULL OR c.check_date <= ?)
      ORDER BY c.check_date DESC`,
    [req.user.id, hiveId || null, hiveId || null, from || null, from || null, to || null, to || null]
  );

  const [harvests] = await db.query(
    `SELECT h.name, s.* FROM harvests s JOIN hives h ON h.id = s.hive_id
      WHERE s.user_id = ?
        AND (? IS NULL OR s.hive_id = ?)
        AND (? IS NULL OR s.harvest_date >= ?) AND (? IS NULL OR s.harvest_date <= ?)
      ORDER BY s.harvest_date DESC`,
    [req.user.id, hiveId || null, hiveId || null, from || null, from || null, to || null, to || null]
  );

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Evieland';
  wb.created = new Date();

  const ink = 'FF1B1917';

  const styleSheet = (sheet, headers, rows, mapper) => {
    sheet.columns = headers.map((h) => ({ header: h, key: h, width: h.length + 6 }));

    // Fila de encabezado
    const head = sheet.getRow(1);
    head.height = 26;
    head.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Inter' };
    head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ink } };
    head.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };

    rows.forEach((r, i) => {
      const row = sheet.addRow(mapper(r));
      row.eachCell((cell) => {
        cell.border = { bottom: { style: 'hair', color: { argb: 'FFE7E1D5' } } };
        cell.alignment = { vertical: 'middle', wrapText: false };
      });
      if (i % 2 === 1) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF9EF' } };
    });

    // Realce de alertas sanitarias
    const healthCol = headers.indexOf('Estado sanitario') + 1;
    if (healthCol > 0) {
      for (let r = 2; r <= sheet.rowCount; r++) {
        const v = sheet.getCell(r, healthCol).value;
        if (v && v !== 'Sano')
          sheet.getCell(r, healthCol).font = { bold: true, color: { argb: 'FFC4462F' } };
      }
    }
  };

  if (checkups.length) {
    styleSheet(wb.addWorksheet('Chequeos'), HEADERS.checkup, checkups, (r) => [
      r.name, r.check_date, r.super_, r.frame, r.temperament, r.population,
      PRESENCE(r), `${r.frame_percentage}%`, r.queen_status, r.food_reserve,
      r.artificial_feed ? 'Sí' : 'No', r.hygiene_behavior, r.health_status, r.notes || '',
    ]);
  }

  if (harvests.length) {
    styleSheet(wb.addWorksheet('Cosechas'), HEADERS.harvest, harvests, (r) => [
      r.name, r.harvest_date, r.super_, r.frame, r.method,
      r.replacement_frame, r.missing_frames,
    ]);
  }

  if (!checkups.length && !harvests.length) {
    wb.addWorksheet('Sin registros').addRow('No hay registros para los filtros seleccionados.');
  }

  const stamp = new Date().toISOString().slice(0, 10);
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', `attachment; filename="evieland-historial-${stamp}.xlsx"`);

  await wb.xlsx.write(res);
  res.end();
});
