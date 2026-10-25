const crypto = require('crypto');
const config = require('../config');
const Payment = require('../models/Payment');

const razorpayConfigured = () => Boolean(config.razorpayKeyId && config.razorpayKeySecret);

exports.getPlan = (req, res) => {
  res.json({
    isPremium: req.user.hasPremium(),
    premiumUntil: req.user.premiumUntil,
    price: config.premiumPriceInr,
    days: config.premiumDays,
    freeLimit: config.freeMaxItems,
    keyId: config.razorpayKeyId,
    paymentsEnabled: razorpayConfigured()
  });
};
exports.createOrder = async (req, res) => {
  if (!razorpayConfigured()) {
    return res.status(503).json({ error: 'Payments are not configured yet. Add Razorpay keys to the server .env file.' });
  }
  try {
    const amount = config.premiumPriceInr * 100;
    const basic = Buffer.from(`${config.razorpayKeyId}:${config.razorpayKeySecret}`).toString('base64');
    const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${basic}` },
      body: JSON.stringify({
        amount,
        currency: 'INR',
        receipt: `prem_${String(req.user._id).slice(-8)}_${Date.now()}`,
        notes: { userId: String(req.user._id) }
      })
    });
    const order = await rzpRes.json();
    if (!rzpRes.ok) {
      return res.status(502).json({ error: (order.error && order.error.description) || 'Could not create the payment order' });
    }
    await Payment.create({ user: req.user._id, orderId: order.id, amount, currency: 'INR' });
    res.json({ orderId: order.id, amount, currency: 'INR', keyId: config.razorpayKeyId });
  } catch {
    res.status(500).json({ error: 'Could not start the payment' });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment details' });
    }

    const payment = await Payment.findOne({ orderId: razorpay_order_id, user: req.user._id });
    if (!payment) return res.status(404).json({ error: 'Order not found' });
    if (payment.status === 'paid') return res.json({ user: req.user.toSafe() }); 

    const expected = crypto
      .createHmac('sha256', config.razorpayKeySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const a = Buffer.from(expected);
    const b = Buffer.from(String(razorpay_signature));
    const valid = a.length === b.length && crypto.timingSafeEqual(a, b);

    if (!valid) {
      payment.status = 'failed';
      await payment.save();
      return res.status(400).json({ error: 'Payment verification failed' });
    }

    payment.status = 'paid';
    payment.paymentId = razorpay_payment_id;
    await payment.save();

    const base = req.user.hasPremium() && req.user.premiumUntil ? req.user.premiumUntil : new Date();
    req.user.isPremium = true;
    req.user.premiumUntil = new Date(base.getTime() + config.premiumDays * 24 * 60 * 60 * 1000);
    await req.user.save();

    res.json({ user: req.user.toSafe() });
  } catch {
    res.status(500).json({ error: 'Could not verify the payment' });
  }
};