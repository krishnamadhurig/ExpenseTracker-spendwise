require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/expense-tracker',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, ''), razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || '',
  premiumPriceInr: parseInt(process.env.PREMIUM_PRICE_INR || '199', 10),
  premiumDays: parseInt(process.env.PREMIUM_DAYS || '30', 10),
  anthropicKey: process.env.ANTHROPIC_API_KEY || '',
  anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
  freeMaxItems: parseInt(process.env.FREE_MAX_ITEMS || '15', 10),
  pageSize: 10,
  categories: ['Food', 'Groceries', 'Transport', 'Shopping', 'Bills', 'Rent', 'Entertainment', 'Health', 'Travel', 'Education', 'Other']

};