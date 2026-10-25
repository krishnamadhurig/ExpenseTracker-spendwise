const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');

const sign = (user) =>
  jwt.sign(
    { id: user._id },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.signup = async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({
        error: 'Name, email and password are required'
      });
    }

    if (!emailRe.test(email)) {
      return res.status(400).json({
        error: 'Enter a valid email address'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters'
      });
    }

    const normalizedEmail = email.toLowerCase();

    if (await User.findOne({ email: normalizedEmail })) {
      return res.status(409).json({
        error: 'An account with this email already exists. Please log in.'
      });
    }

    const user = await User.create({
      name,
      email: normalizedEmail,
      password
    });

    res.status(201).json({
      user: user.toSafe(),
      message: 'Account created. Please log in.'
    });

  } catch (err) {
    console.error('[authController signup]', err);

    res.status(500).json({
      error: 'Could not create your account'
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required'
      });
    }

    const user = await User.findOne({
      email: String(email).toLowerCase()
    }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        error: 'Incorrect email or password'
      });
    }

    res.json({
      token: sign(user),
      user: user.toSafe()
    });

  } catch (err) {
    console.error('[authController login]', err);

    res.status(500).json({
      error: 'Login failed'
    });
  }
};

exports.me = (req, res) => {
  res.json({
    user: req.user.toSafe()
  });
};