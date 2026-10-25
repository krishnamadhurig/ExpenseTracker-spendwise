const express = require('express');
const { auth, requirePremium } = require('../middleware/auth');
const { categorize, parse, insights } = require('../controllers/aiController');

const router = express.Router();
router.use(auth);

router.post('/categorize', categorize);
router.post('/parse', requirePremium, parse);
router.get('/insights', requirePremium, insights);

module.exports = router;