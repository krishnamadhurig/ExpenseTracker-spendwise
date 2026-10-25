const express = require('express');
const { auth, requirePremium } = require('../middleware/auth');
const {
  listItems,
  getSummary,
  createItem,
  updateItem,
  deleteItem,
  exportCsv
} = require('../controllers/itemController');

const router = express.Router();
router.use(auth); 

router.get('/', listItems);
router.get('/summary', getSummary);
router.get('/export/csv', requirePremium, exportCsv);
router.post('/', createItem);
router.put('/:id', updateItem);
router.delete('/:id', deleteItem);

module.exports = router;