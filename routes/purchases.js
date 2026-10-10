'use strict';

const router = require('express').Router();
const { randomUUID: uuidv4 } = require('crypto');
const sql = require('../db/index');
const { requireAuth } = require('../middleware/auth');
const { audit } = require('../utils/audit');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolve or automatically create a category by UUID or Name
 */
async function resolveCategoryId(categoryInput) {
  if (!categoryInput) return null;
  const val = String(categoryInput).trim();
  if (!val) return null;

  if (UUID_REGEX.test(val)) {
    const rows = await sql`SELECT id FROM categories WHERE id = ${val}`;
    if (rows.length) return rows[0].id;
  }

  // Case-insensitive lookup by name
  const existing = await sql`
    SELECT id FROM categories WHERE LOWER(name) = LOWER(${val}) LIMIT 1`;
  if (existing.length) return existing[0].id;

  // Insert new category dynamically
  const newId = uuidv4();
  await sql`
    INSERT INTO categories (id, name, is_active)
    VALUES (${newId}, ${val.slice(0, 100)}, TRUE)`;
  return newId;
}

// ── Handler for creating on-behalf purchase with multiple items ───────────────
async function handleCreatePurchase(req, res) {
  const { description, expense_date, notes, items } = req.body;

  if (!description || !expense_date) {
    return res.status(400).json({ error: 'description and expense_date are required' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'At least one item is required' });
  }

  const uid = req.session.userId;
  const hid = req.session.householdId;

  // 1. Fetch valid household members up front for validation (AUD-05)
  const householdMembers = await sql`
    SELECT user_id FROM household_members
    WHERE  household_id = ${hid} AND is_active = TRUE`;
  const validMemberIds = new Set(householdMembers.map(m => m.user_id));

  // 2. Validate all items before inserting anything into the database
  let totalPaise = 0;
  for (const item of items) {
    if (!item.description || !item.beneficiary_id) {
      return res.status(400).json({ error: 'Each item needs a description and beneficiary_id' });
    }
    if (!UUID_REGEX.test(item.beneficiary_id) || !validMemberIds.has(item.beneficiary_id)) {
      return res.status(400).json({ error: 'Beneficiary must be an active member of this household' });
    }
    if (!Number.isInteger(item.amount_paise) || item.amount_paise <= 0 || item.amount_paise > 1000000000) {
      return res.status(400).json({ error: 'Each item amount_paise must be a positive integer within valid limits' });
    }
    totalPaise += item.amount_paise;
  }

  const eid = uuidv4();

  try {
    await sql`
      INSERT INTO expenses
        (id, household_id, created_by, expense_type, description, amount_paise, paid_by, expense_date, notes)
      VALUES
        (${eid}, ${hid}, ${uid}, 'on_behalf', ${description.trim().slice(0, 255)}, ${totalPaise}, ${uid}, ${expense_date}, ${notes ? notes.trim().slice(0, 1000) : null})`;

    for (const item of items) {
      const iid = uuidv4();
      const resolvedCatId = await resolveCategoryId(item.category_id || item.category);

      await sql`
        INSERT INTO expense_items (id, expense_id, description, amount_paise, category_id)
        VALUES (${iid}, ${eid}, ${item.description.trim().slice(0, 255)}, ${item.amount_paise}, ${resolvedCatId})`;

      await sql`
        INSERT INTO expense_shares (id, expense_id, expense_item_id, user_id, amount_paise, share_type)
        VALUES (${uuidv4()}, ${eid}, ${iid}, ${item.beneficiary_id}, ${item.amount_paise}, 'on_behalf')`;
    }

    await audit(uid, hid, 'expense', eid, 'create', null, {
      type: 'on_behalf', amount_paise: totalPaise, item_count: items.length,
    });

    res.status(201).json({ id: eid });
  } catch (err) {
    console.error('[purchases POST /]', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// ── POST /api/purchases ───────────────────────────────────────────────────────
router.post('/', requireAuth, handleCreatePurchase);
router.post('/on-behalf', requireAuth, handleCreatePurchase);

// ── GET /api/purchases/made-by-me ────────────────────────────────────────────
// Optimized batch query (AUD-11)
router.get('/made-by-me', requireAuth, async (req, res) => {
  const uid = req.session.userId;
  const hid = req.session.householdId;

  try {
    const expenses = await sql`
      SELECT e.*, u.full_name AS paid_by_name
      FROM   expenses e
      LEFT   JOIN users u ON u.id = e.paid_by
      WHERE  e.household_id = ${hid}
        AND  e.expense_type = 'on_behalf'
        AND  e.paid_by      = ${uid}
        AND  e.is_deleted   = FALSE
      ORDER  BY e.expense_date DESC, e.created_at DESC`;

    if (!expenses.length) return res.json([]);

    const expIds = expenses.map(e => e.id);

    // Batch fetch all items and shares in a single query (replaces N+1 loops)
    const allItems = await sql`
      SELECT ei.*, es.user_id AS beneficiary_id, u2.full_name AS beneficiary_name, es.id AS share_id,
             c.name AS category_name
      FROM   expense_items  ei
      LEFT   JOIN categories c ON c.id = ei.category_id
      JOIN   expense_shares es ON es.expense_item_id = ei.id
      JOIN   users          u2 ON u2.id = es.user_id
      WHERE  ei.expense_id = ANY(${expIds})`;

    const itemsByExpense = {};
    for (const item of allItems) {
      if (!itemsByExpense[item.expense_id]) itemsByExpense[item.expense_id] = [];
      itemsByExpense[item.expense_id].push(item);
    }

    // Batch fetch confirmed settlements
    const settlementRows = await sql`
      SELECT s.expense_share_id, es.expense_id, COALESCE(SUM(s.amount_paise), 0) AS total_paid
      FROM   settlements s
      JOIN   expense_shares es ON es.id = s.expense_share_id
      WHERE  es.expense_id = ANY(${expIds})
        AND  s.status = 'confirmed'
      GROUP  BY s.expense_share_id, es.expense_id`;

    const settledByExpense = {};
    for (const r of settlementRows) {
      settledByExpense[r.expense_id] = (settledByExpense[r.expense_id] || 0) + parseInt(r.total_paid, 10);
    }

    const result = expenses.map(exp => ({
      ...exp,
      items: itemsByExpense[exp.id] || [],
      confirmed_paid_paise: settledByExpense[exp.id] || 0,
    }));

    res.json(result);
  } catch (err) {
    console.error('[purchases GET /made-by-me]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/purchases/made-for-me ───────────────────────────────────────────
// Optimized batch query (AUD-11)
router.get('/made-for-me', requireAuth, async (req, res) => {
  const uid = req.session.userId;
  const hid = req.session.householdId;

  try {
    const expenses = await sql`
      SELECT DISTINCT e.*, u.full_name AS paid_by_name
      FROM   expenses       e
      JOIN   expense_shares es ON es.expense_id = e.id
      LEFT   JOIN users      u ON u.id = e.paid_by
      WHERE  e.household_id = ${hid}
        AND  e.expense_type = 'on_behalf'
        AND  es.user_id     = ${uid}
        AND  e.paid_by     != ${uid}
        AND  e.is_deleted   = FALSE
      ORDER  BY e.expense_date DESC, e.created_at DESC`;

    if (!expenses.length) return res.json([]);

    const expIds = expenses.map(e => e.id);

    // Batch fetch my items
    const myItems = await sql`
      SELECT ei.*, es.amount_paise AS my_share, es.id AS share_id,
             c.name AS category_name
      FROM   expense_items  ei
      LEFT   JOIN categories c ON c.id = ei.category_id
      JOIN   expense_shares es ON es.expense_item_id = ei.id
      WHERE  ei.expense_id  = ANY(${expIds})
        AND  es.user_id     = ${uid}`;

    const itemsByExpense = {};
    for (const item of myItems) {
      if (!itemsByExpense[item.expense_id]) itemsByExpense[item.expense_id] = [];
      itemsByExpense[item.expense_id].push(item);
    }

    // Batch fetch confirmed settlements
    const settlementRows = await sql`
      SELECT es.expense_id, COALESCE(SUM(s.amount_paise), 0) AS total_paid
      FROM   settlements    s
      JOIN   expense_shares es ON es.id = s.expense_share_id
      WHERE  es.expense_id = ANY(${expIds})
        AND  es.user_id    = ${uid}
        AND  s.status      = 'confirmed'
      GROUP  BY es.expense_id`;

    const settledByExpense = {};
    for (const r of settlementRows) {
      settledByExpense[r.expense_id] = (settledByExpense[r.expense_id] || 0) + parseInt(r.total_paid, 10);
    }

    const result = expenses.map(exp => {
      const items = itemsByExpense[exp.id] || [];
      const myTotal = items.reduce((s, i) => s + parseInt(i.my_share, 10), 0);
      return {
        ...exp,
        my_items:           items,
        my_total_paise:     myTotal,
        my_confirmed_paise: settledByExpense[exp.id] || 0,
      };
    });

    res.json(result);
  } catch (err) {
    console.error('[purchases GET /made-for-me]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
