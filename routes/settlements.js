'use strict';

const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const sql = require('../db/index');
const { requireAuth } = require('../middleware/auth');
const { rateLimitClaim } = require('../middleware/rateLimiter');
const { audit } = require('../utils/audit');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── GET /api/settlements ─────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  const uid = req.session.userId;
  const hid = req.session.householdId;

  try {
    const rows = await sql`
      SELECT s.*,
             p.full_name  AS payer_name,
             r.full_name  AS recipient_name,
             cb.full_name AS confirmed_by_name
      FROM   settlements s
      JOIN   users p  ON p.id  = s.payer_id
      JOIN   users r  ON r.id  = s.recipient_id
      LEFT   JOIN users cb ON cb.id = s.confirmed_by
      WHERE  s.household_id = ${hid}
        AND  (s.payer_id = ${uid} OR s.recipient_id = ${uid})
      ORDER  BY s.created_at DESC`;

    res.json(rows);
  } catch (err) {
    console.error('[settlements GET /]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/settlements  (payer records a claim) ───────────────────────────
router.post('/', requireAuth, rateLimitClaim, async (req, res) => {
  const { recipient_id, amount_paise, method, transaction_reference, note, expense_share_id } = req.body;

  if (!recipient_id || !amount_paise || !method) {
    return res.status(400).json({ error: 'recipient_id, amount_paise, and method are required' });
  }
  if (!UUID_REGEX.test(recipient_id)) {
    return res.status(400).json({ error: 'Invalid recipient_id' });
  }
  if (!Number.isInteger(amount_paise) || amount_paise <= 0 || amount_paise > 1000000000) {
    return res.status(400).json({ error: 'amount_paise must be a positive integer within valid limits' });
  }
  if (!['cash', 'upi'].includes(method)) {
    return res.status(400).json({ error: 'method must be "cash" or "upi"' });
  }
  if (expense_share_id && !UUID_REGEX.test(expense_share_id)) {
    return res.status(400).json({ error: 'Invalid expense_share_id' });
  }

  const uid = req.session.userId;
  const hid = req.session.householdId;

  if (uid === recipient_id) {
    return res.status(400).json({ error: 'You cannot pay yourself' });
  }

  try {
    // Verify recipient is an active member in the same household
    const recipientRows = await sql`
      SELECT u.full_name, mup.upi_id
      FROM   users u
      JOIN   household_members hm ON hm.user_id = u.id
      LEFT   JOIN member_upi_profiles mup ON mup.user_id = u.id
      WHERE  u.id = ${recipient_id}
        AND  hm.household_id = ${hid}
        AND  hm.is_active = TRUE`;

    if (!recipientRows.length) {
      return res.status(404).json({ error: 'Recipient not found in this household' });
    }

    const recip = recipientRows[0];
    const sid   = uuidv4();

    await sql`
      INSERT INTO settlements
        (id, household_id, payer_id, recipient_id, amount_paise, method, status,
         transaction_reference, note, recipient_name_snapshot, recipient_upi_snapshot, expense_share_id)
      VALUES
        (${sid}, ${hid}, ${uid}, ${recipient_id}, ${amount_paise}, ${method},
         'verification_pending', ${transaction_reference ? transaction_reference.trim().slice(0, 100) : null},
         ${note ? note.trim().slice(0, 500) : null},
         ${recip.full_name}, ${recip.upi_id || null}, ${expense_share_id || null})`;

    await audit(uid, hid, 'settlement', sid, 'claim', null, { amount_paise, method, recipient_id });

    res.status(201).json({ id: sid });
  } catch (err) {
    console.error('[settlements POST /]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/settlements/:id/confirm  (recipient only - atomic state transition) ──
router.post('/:id/confirm', requireAuth, async (req, res) => {
  const { id } = req.params;
  const uid = req.session.userId;
  const hid = req.session.householdId;

  if (!UUID_REGEX.test(id)) return res.status(400).json({ error: 'Invalid ID' });

  try {
    const checkRows = await sql`SELECT * FROM settlements WHERE id = ${id} AND household_id = ${hid}`;
    if (!checkRows.length) return res.status(404).json({ error: 'Not found' });
    const s = checkRows[0];

    if (s.recipient_id !== uid) {
      return res.status(403).json({ error: 'Only the recipient can confirm this payment' });
    }
    if (s.status === 'confirmed') return res.json({ ok: true }); // idempotent

    // Atomic conditional update prevents concurrent race conditions
    const updated = await sql`
      UPDATE settlements
      SET    status       = 'confirmed',
             confirmed_at = NOW(),
             confirmed_by = ${uid},
             updated_at   = NOW()
      WHERE  id = ${id}
        AND  recipient_id = ${uid}
        AND  status IN ('pending', 'verification_pending')
      RETURNING *`;

    if (!updated.length) {
      return res.status(409).json({ error: 'Settlement is no longer in a pending status' });
    }

    await audit(uid, hid, 'settlement', id, 'confirm', { status: s.status }, { status: 'confirmed' });

    res.json({ ok: true });
  } catch (err) {
    console.error('[settlements POST /:id/confirm]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/settlements/:id/reject  (recipient only - atomic state transition) ───
router.post('/:id/reject', requireAuth, async (req, res) => {
  const { id } = req.params;
  const uid = req.session.userId;
  const hid = req.session.householdId;

  if (!UUID_REGEX.test(id)) return res.status(400).json({ error: 'Invalid ID' });

  try {
    const checkRows = await sql`SELECT * FROM settlements WHERE id = ${id} AND household_id = ${hid}`;
    if (!checkRows.length) return res.status(404).json({ error: 'Not found' });
    const s = checkRows[0];

    if (s.recipient_id !== uid) {
      return res.status(403).json({ error: 'Only the recipient can reject this payment' });
    }

    // Atomic conditional update prevents race conditions
    const updated = await sql`
      UPDATE settlements
      SET    status = 'rejected', updated_at = NOW()
      WHERE  id = ${id}
        AND  recipient_id = ${uid}
        AND  status IN ('pending', 'verification_pending')
      RETURNING *`;

    if (!updated.length) {
      return res.status(409).json({ error: 'Settlement is no longer in a pending status' });
    }

    await audit(uid, hid, 'settlement', id, 'reject', { status: s.status }, { status: 'rejected' });

    res.json({ ok: true });
  } catch (err) {
    console.error('[settlements POST /:id/reject]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/settlements/:id/cancel  (payer only - atomic state transition) ─────
router.post('/:id/cancel', requireAuth, async (req, res) => {
  const { id } = req.params;
  const uid = req.session.userId;
  const hid = req.session.householdId;

  if (!UUID_REGEX.test(id)) return res.status(400).json({ error: 'Invalid ID' });

  try {
    const checkRows = await sql`SELECT * FROM settlements WHERE id = ${id} AND household_id = ${hid}`;
    if (!checkRows.length) return res.status(404).json({ error: 'Not found' });
    const s = checkRows[0];

    if (s.payer_id !== uid) {
      return res.status(403).json({ error: 'Only the payer can cancel this payment claim' });
    }

    // Atomic conditional update prevents race conditions
    const updated = await sql`
      UPDATE settlements
      SET    status = 'cancelled', updated_at = NOW()
      WHERE  id = ${id}
        AND  payer_id = ${uid}
        AND  status IN ('pending', 'verification_pending')
      RETURNING *`;

    if (!updated.length) {
      return res.status(409).json({ error: 'Settlement is no longer in a pending status' });
    }

    await audit(uid, hid, 'settlement', id, 'cancel', { status: s.status }, { status: 'cancelled' });

    res.json({ ok: true });
  } catch (err) {
    console.error('[settlements POST /:id/cancel]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
