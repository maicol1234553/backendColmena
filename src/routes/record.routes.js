const router = require('express').Router();
const { createCheckup, createHarvest, history, remove } = require('../controllers/recordController');
const { exportExcel } = require('../controllers/exportController');
const { auth } = require('../middleware/auth');

router.use(auth);
router.post('/checkup', createCheckup);
router.post('/harvest', createHarvest);
router.get('/history', history);
router.get('/export', exportExcel); // GET /api/records/export?hiveId=&from=&to=
router.delete('/:kind/:id', remove);

module.exports = router;
