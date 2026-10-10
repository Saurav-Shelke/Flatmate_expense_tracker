'use strict';

const router = require('express').Router();
const { randomUUID: uuidv4 } = require('crypto');
const sql = require('../db/index');
const { requireAuth } = require('../middleware/auth');

// ── GET /api/categories ──────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const rows = await sql`
      SELECT id, name, expense_type
      FROM   categories
      WHERE  is_active = TRUE
      ORDER  BY name`;
    res.json(rows);
  } catch (err) {
    console.error('[categories GET /]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/categories ─────────────────────────────────────────────────────
// Create a new category or return existing if name matches case-insensitively
router.post('/', requireAuth, async (req, res) => {
  const { name, expense_type } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Category name is required' });
  }

  const trimmed = name.trim().slice(0, 100);

  try {
    const existing = await sql`
      SELECT id, name, expense_type
      FROM   categories
      WHERE  LOWER(name) = LOWER(${trimmed})
      LIMIT  1`;

    if (existing.length) {
      return res.json(existing[0]);
    }

    const id = uuidv4();
    await sql`
      INSERT INTO categories (id, name, expense_type, is_active)
      VALUES (${id}, ${trimmed}, ${expense_type || null}, TRUE)`;

    res.status(201).json({ id, name: trimmed, expense_type: expense_type || null });
  } catch (err) {
    console.error('[categories POST /]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
