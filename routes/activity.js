'use strict';

const router = require('express').Router();
const sql = require('../db/index');
const { requireAuth } = require('../middleware/auth');

// ── GET /api/activity ────────────────────────────────────────────────────────
// Returns the current user's own activity log (last 50 entries).
router.get('/', requireAuth, async (req, res) => {
  const hid = req.session.householdId;
  const uid = req.session.userId;

  try {
    const rows = await sql`
      SELECT al.*, u.full_name AS actor_name
      FROM   activity_logs al
      LEFT   JOIN users u ON u.id = al.actor_user_id
      WHERE  al.household_id    = ${hid}
        AND  al.actor_user_id   = ${uid}
      ORDER  BY al.created_at DESC
      LIMIT  50`;

    res.json(rows);
  } catch (err) {
    console.error('[activity GET /]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
