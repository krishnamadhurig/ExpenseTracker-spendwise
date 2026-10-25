const mongoose = require('mongoose');
const config = require('../config');
const Item = require('../models/Item');
const { suggestCategory } = require('../services/ai');

const isId = (id) => mongoose.Types.ObjectId.isValid(id);

exports.listItems = async (req, res) => {
  try {
    const filter = { user: req.user._id };
    if (req.query.category) filter.category = req.query.category;
    if (req.query.q) {
      const safe = String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.name = new RegExp(safe, 'i');
    }

    const total = await Item.countDocuments(filter);
    const totalPages = Math.max(Math.ceil(total / config.pageSize), 1);
    const requested = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const page = Math.min(requested, totalPages);

    const items = await Item.find(filter)
      .sort({ date: -1, _id: -1 })
      .skip((page - 1) * config.pageSize)
      .limit(config.pageSize)
      .lean();

    res.json({
      items,
      pagination: { page, pageSize: config.pageSize, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 }
    });
  } catch {
    res.status(500).json({ error: 'Could not load items' });
  }
};

exports.getSummary = async (req, res) => {
  try {
    const [byCategory, count] = await Promise.all([
      Item.aggregate([
        { $match: { user: req.user._id } },
        { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } }
      ]),
      Item.countDocuments({ user: req.user._id })
    ]);
    const total = byCategory.reduce((s, c) => s + c.total, 0);
    res.json({
      total,
      count,
      byCategory: byCategory.map((c) => ({ category: c._id, total: c.total, count: c.count })),
      limit: req.user.hasPremium() ? null : config.freeMaxItems
    });
  } catch {
    res.status(500).json({ error: 'Could not load summary' });
  }
};

exports.createItem = async (req, res) => {
  try {
    const { name, amount, category, date } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'Item name is required' });
    if (!(Number(amount) > 0)) return res.status(400).json({ error: 'Amount must be greater than 0' });

    if (!req.user.hasPremium()) {
      const count = await Item.countDocuments({ user: req.user._id });
      if (count >= config.freeMaxItems) {
        return res.status(403).json({
          error: `Free plan allows up to ${config.freeMaxItems} items. Upgrade to Premium to add more.`,
          code: 'LIMIT_REACHED'
        });
      }
    }

    let finalCategory = category;
    if (!finalCategory || finalCategory === 'auto') finalCategory = await suggestCategory(name);

    const item = await Item.create({
      user: req.user._id,
      name: String(name).trim(),
      amount: Number(amount),
      category: finalCategory,
      date: date ? new Date(date) : new Date()
    });
    res.status(201).json({ item });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Could not add item' });
  }
};

exports.updateItem = async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const update = {};
    for (const k of ['name', 'amount', 'category', 'date']) if (req.body[k] !== undefined) update[k] = req.body[k];
    if (update.amount !== undefined && !(Number(update.amount) > 0)) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }
    const item = await Item.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, update, {
      new: true,
      runValidators: true
    });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json({ item });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Could not update item' });
  }
};

exports.deleteItem = async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const result = await Item.deleteOne({ _id: req.params.id, user: req.user._id });
    if (!result.deletedCount) return res.status(404).json({ error: 'Item not found' });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Could not delete item' });
  }
};

exports.exportCsv = async (req, res) => {
  try {
    const items = await Item.find({ user: req.user._id }).sort({ date: -1 }).lean();
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = ['Date,Item,Category,Amount'];
    for (const i of items) {
      lines.push([esc(new Date(i.date).toISOString().slice(0, 10)), esc(i.name), esc(i.category), i.amount].join(','));
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="expenses.csv"');
    res.send(lines.join('\n'));
  } catch {
    res.status(500).json({ error: 'Could not export' });
  }
};