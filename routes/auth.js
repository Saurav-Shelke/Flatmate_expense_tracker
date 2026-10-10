'use strict';

const router = require('express').Router();
const { verifyPassword, hashPassword } = require('../utils/password');
const sql = require('../db/index');
const { requireAuth } = require('../middleware/auth');
const { rateLimitLogin, rateLimitPassword } = require('../middleware/rateLimiter');

// ── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', rateLimitLogin, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const rows = await sql`
      SELECT u.id, u.full_name, u.username, u.password_hash, u.is_active,
             u.must_change_password, hm.role, hm.household_id
      FROM   users u
      JOIN   household_members hm ON hm.user_id = u.id
      WHERE  u.username = ${username.toLowerCase().trim()}`;

    const user = rows[0];

    // Generic error — do not reveal whether the user exists
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const valid = await verifyPassword(user.password_hash, password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const setSessionData = () => {
      req.session.userId             = user.id;
      req.session.username           = user.username;
      req.session.fullName           = user.full_name;
      req.session.role               = user.role;
      req.session.householdId        = user.household_id;
      req.session.mustChangePassword = user.must_change_password; // AUD-03

      req.session.save((saveErr) => {
        if (saveErr) {
          console.error('[auth/login] session save error:', saveErr);
        }
        res.json({
          id:                 user.id,
          fullName:           user.full_name,
          username:           user.username,
          role:               user.role,
          mustChangePassword: user.must_change_password,
        });
      });
    };

    if (typeof req.session.regenerate === 'function') {
      req.session.regenerate((err) => {
        if (err) {
          console.warn('[auth/login] regenerate session warning:', err.message);
        }
        setSessionData();
      });
    } else {
      setSessionData();
    }
  } catch (err) {
    console.error('[auth/login]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/auth/logout ────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

// ── GET /api/auth/session ────────────────────────────────────────────────────
router.get('/session', (req, res) => {
  if (!req.session?.userId) {
    return res.json({ authenticated: false });
  }
  res.json({
    authenticated:      true,
    id:                 req.session.userId,
    fullName:           req.session.fullName,
    username:           req.session.username,
    role:               req.session.role,
    householdId:        req.session.householdId,
    mustChangePassword: !!req.session.mustChangePassword, // AUD-03
  });
});

// ── POST /api/auth/change-password ───────────────────────────────────────────
router.post('/change-password', requireAuth, rateLimitPassword, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'currentPassword and newPassword are required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  try {
    const rows = await sql`SELECT password_hash FROM users WHERE id = ${req.session.userId}`;
    if (!rows.length) return res.status(404).json({ error: 'User not found' });

    const valid = await verifyPassword(rows[0].password_hash, currentPassword);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const hash = await hashPassword(newPassword);
    await sql`
      UPDATE users
      SET    password_hash = ${hash}, must_change_password = FALSE, updated_at = NOW()
      WHERE  id = ${req.session.userId}`;

    req.session.mustChangePassword = false;
    req.session.save(() => {
      res.json({ ok: true });
    });
  } catch (err) {
    console.error('[auth/change-password]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
