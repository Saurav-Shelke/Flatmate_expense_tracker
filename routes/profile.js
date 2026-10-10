'use strict';

const router  = require('express').Router();
const QRCode  = require('qrcode');
const sql     = require('../db/index');
const { requireAuth }    = require('../middleware/auth');
const { rateLimitUpi }   = require('../middleware/rateLimiter');
const { normalizeUPI, validateUPI, buildUpiUri } = require('../utils/upi');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── GET /api/profile/upi ─────────────────────────────────────────────────────
router.get('/upi', requireAuth, async (req, res) => {
  try {
    const rows = await sql`
      SELECT * FROM member_upi_profiles WHERE user_id = ${req.session.userId}`;
    res.json(rows[0] || null);
  } catch (err) {
    console.error('[profile GET /upi]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── PUT /api/profile/upi ─────────────────────────────────────────────────────
router.put('/upi', requireAuth, rateLimitUpi, async (req, res) => {
  const { upi_id, display_name } = req.body;

  if (!upi_id || !display_name) {
    return res.status(400).json({ error: 'upi_id and display_name are required' });
  }

  const normalized = normalizeUPI(upi_id);
  if (!validateUPI(normalized)) {
    return res.status(400).json({
      error: 'Invalid UPI ID format. Expected format: handle@provider (e.g. virendra@oksbi)',
    });
  }

  try {
    await sql`
      INSERT INTO member_upi_profiles (user_id, upi_id, display_name, updated_at)
      VALUES (${req.session.userId}, ${normalized}, ${display_name.trim()}, NOW())
      ON CONFLICT (user_id) DO UPDATE
        SET upi_id       = ${normalized},
            display_name = ${display_name.trim()},
            updated_at   = NOW()`;

    res.json({ ok: true, upi_id: normalized });
  } catch (err) {
    console.error('[profile PUT /upi]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── DELETE /api/profile/upi ──────────────────────────────────────────────────
router.delete('/upi', requireAuth, async (req, res) => {
  try {
    await sql`DELETE FROM member_upi_profiles WHERE user_id = ${req.session.userId}`;
    res.json({ ok: true });
  } catch (err) {
    console.error('[profile DELETE /upi]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Handler for QR Code generation (mounted on /upi/qr and /qr) ───────────────
async function handleQrRequest(req, res) {
  const { userId, amount } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  if (!UUID_REGEX.test(userId)) {
    return res.status(400).json({ error: 'Invalid userId format' });
  }

  const hid = req.session.householdId;

  try {
    // Ensure the target user is part of the same household
    const rows = await sql`
      SELECT mup.*, u.full_name
      FROM   member_upi_profiles mup
      JOIN   users u ON u.id = mup.user_id
      JOIN   household_members hm ON hm.user_id = u.id
      WHERE  mup.user_id = ${userId}
        AND  hm.household_id = ${hid}`;

    if (!rows.length) {
      return res.status(404).json({ error: 'No UPI profile found for this user' });
    }

    const profile     = rows[0];
    const amountPaise = amount && parseInt(amount, 10) > 0 ? parseInt(amount, 10) : null;
    const upiUri      = buildUpiUri(profile.upi_id, profile.display_name, amountPaise);
    const qrDataUrl   = await QRCode.toDataURL(upiUri, { errorCorrectionLevel: 'M', width: 200 });

    res.json({
      qrDataUrl,
      upiUri,
      upiId:       profile.upi_id,
      displayName: profile.display_name,
    });
  } catch (err) {
    console.error('[profile QR]', err);
    res.status(500).json({ error: 'Server error' });
  }
}

router.get('/upi/qr', requireAuth, handleQrRequest);
router.get('/qr',     requireAuth, handleQrRequest);

module.exports = router;
