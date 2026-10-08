const router = require('express').Router();
const { list, create, remove } = require('../controllers/hiveController');
const { auth } = require('../middleware/auth');

router.use(auth);
router.get('/', list);
router.post('/', create);
router.delete('/:id', remove);

module.exports = router;
