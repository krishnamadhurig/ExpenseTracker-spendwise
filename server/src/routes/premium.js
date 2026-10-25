const express = require('express');
const { auth } = require('../middleware/auth');
const { getPlan, createOrder, verifyPayment } = require('../controllers/premiumController');

const router = express.Router();
router.use(auth);

router.get('/plan', getPlan);
router.post('/order', createOrder);
router.post('/verify', verifyPayment);

module.exports = router;