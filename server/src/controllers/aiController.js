const Item = require('../models/Item');
const { suggestCategory, parseEntry, generateInsights } = require('../services/ai');

exports.categorize = async (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Item name is required' });
  res.json({ category: await suggestCategory(name) });
};

exports.parse = async (req, res) => {
  const { text } = req.body || {};
  if (!text || !String(text).trim()) return res.status(400).json({ error: 'Text is required' });
  const entry = await parseEntry(text);
  if (!entry) return res.status(422).json({ error: "I couldn't find an amount in that text" });
  res.json({ entry });
};

exports.insights = async (req, res) => {
  try {
    const rows = await Item.aggregate([
      { $match: { user: req.user._id } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ]);
    const total = rows.reduce((s, r) => s + r.total, 0);
    const count = rows.reduce((s, r) => s + r.count, 0);
    res.json(
      await generateInsights({
        total,
        count,
        byCategory: rows.map((r) => ({ category: r._id, total: r.total, count: r.count }))
      })
    );
  } catch {
    res.status(500).json({ error: 'Could not generate insights' });
  }
};