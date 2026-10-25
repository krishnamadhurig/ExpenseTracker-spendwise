const Item = require('../models/Item');
const User = require('../models/User');

exports.getLeaderboard = async (req, res) => {
  try {
    const premium = req.user.hasPremium();
    const rows = await Item.aggregate([
      { $group: { _id: '$user', count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: 100 }
    ]);

    const users = await User.find({ _id: { $in: rows.map((r) => r._id) } })
      .select('name isPremium premiumUntil')
      .lean();
    const byId = Object.fromEntries(users.map((u) => [String(u._id), u]));

    const ranked = rows.map((r, i) => {
      const u = byId[String(r._id)];
      return {
        rank: i + 1,
        name: u ? u.name.split(' ')[0] : 'User',
        count: r.count,
        premium: Boolean(u && u.isPremium && (!u.premiumUntil || u.premiumUntil > new Date())),
        you: String(r._id) === String(req.user._id)
      };
    });

    res.json({
      leaderboard: ranked.slice(0, premium ? 10 : 3),
      me: ranked.find((r) => r.you) || null,
      limitedView: !premium
    });
  } catch {
    res.status(500).json({ error: 'Could not load the leaderboard' });
  }
};