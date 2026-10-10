'use strict';

const router = require('express').Router();
const sql = require('../db/index');
const { requireAuth } = require('../middleware/auth');

// ── GET /api/members ─────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const rows = await sql`
      SELECT u.id, u.full_name, u.username, hm.role, u.is_active
      FROM   users u
      JOIN   household_members hm ON hm.user_id = u.id
      WHERE  hm.household_id = ${req.session.householdId}
        AND  hm.is_active = TRUE
      ORDER  BY u.full_name`;
    res.json(rows);
  } catch (err) {
    console.error('[members]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
