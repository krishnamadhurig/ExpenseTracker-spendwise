const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');

async function auth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Please log in' });

    const { id } = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(id);
    if (!user) return res.status(401).json({ error: 'Account no longer exists' });

    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Session expired. Please log in again.' });
  }
}

function requirePremium(req, res, next) {
  if (!req.user.hasPremium()) {
    return res.status(403).json({ error: 'This is a Premium feature', code: 'PREMIUM_REQUIRED' });
  }
  next();
}

module.exports = { auth, requirePremium };