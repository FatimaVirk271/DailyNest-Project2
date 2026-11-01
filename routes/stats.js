// routes/stats.js - GET /api/stats
// Application logic on the server: the progress numbers are worked out here,
// and the page just displays them.
const express = require('express');
const store = require('../store');
const { CATEGORIES } = require('../validators');

const router = express.Router();

router.get('/', (req, res) => {
  const all = store.all();
  const total = all.length;
  const done = all.filter((t) => t.done).length;

  const byCategory = {};
  for (const category of CATEGORIES) {
    const inCategory = all.filter((t) => t.category === category);
    byCategory[category] = {
      total: inCategory.length,
      done: inCategory.filter((t) => t.done).length,
    };
  }

  res.status(200).json({
    success: true,
    data: {
      total,
      done,
      remaining: total - done,
      percent: total === 0 ? 0 : Math.round((done / total) * 100),
      byCategory,
    },
  });
});

module.exports = router;
