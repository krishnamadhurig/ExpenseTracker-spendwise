const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');

const app = express();
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: config.clientUrl }));
app.use(express.json({ limit: '100kb' }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/items', require('./routes/items'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/premium', require('./routes/premium'));
app.use('/api/ai', require('./routes/ai'));
app.get('/api/meta', (req, res) => res.json({ categories: config.categories, pageSize: config.pageSize }));
app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});

async function start() {
  if (!process.env.JWT_SECRET) console.warn('Warning: JWT_SECRET is not set; using an insecure development default.');
  await mongoose.connect(config.mongoUri);
  console.log('MongoDB connected');
  app.listen(config.port, () => console.log(`API running on http://localhost:${config.port}`));
}

if (require.main === module) {
  start().catch((err) => {
    console.error('Failed to start:', err.message);
    process.exit(1);
  });
}

module.exports = app;