'use strict';

const router = require('express').Router();
const sql = require('../db/index');
const { requireAuth } = require('../middleware/auth');

// ── GET /api/balances ────────────────────────────────────────────────────────
// Computes canonical household balances across personal, common, and on-behalf expenses (AUD-01)
router.get('/', requireAuth, async (req, res) => {
  const uid = req.session.userId;
  const hid = req.session.householdId;

  try {
    // 1. Personal spending (sum of user's personal expenses)
    const [personalRow] = await sql`
      SELECT COALESCE(SUM(amount_paise), 0) AS total
      FROM   expenses
      WHERE  household_id  = ${hid}
        AND  expense_type  = 'personal'
        AND  paid_by       = ${uid}
        AND  is_deleted    = FALSE`;

    // 2. Common share (my allocated portion of common expenses)
    const [commonShareRow] = await sql`
      SELECT COALESCE(SUM(es.amount_paise), 0) AS total
      FROM   expense_shares es
      JOIN   expenses        e  ON e.id = es.expense_id
      WHERE  e.household_id = ${hid}
        AND  e.expense_type = 'common'
        AND  es.user_id     = ${uid}
        AND  e.is_deleted   = FALSE`;

    // 3. Common paid by me (as payer)
    const [commonPaidRow] = await sql`
      SELECT COALESCE(SUM(amount_paise), 0) AS total
      FROM   expenses
      WHERE  household_id = ${hid}
        AND  expense_type = 'common'
        AND  paid_by      = ${uid}
        AND  is_deleted   = FALSE`;

    // 4. I advanced for others (shares I covered across BOTH on_behalf and common expenses)
    const [advancedRow] = await sql`
      SELECT COALESCE(SUM(es.amount_paise), 0) AS total
      FROM   expense_shares es
      JOIN   expenses        e ON e.id = es.expense_id
      WHERE  e.household_id = ${hid}
        AND  e.expense_type IN ('on_behalf', 'common')
        AND  e.paid_by      = ${uid}
        AND  es.user_id    != ${uid}
        AND  e.is_deleted   = FALSE`;

    // ── Pairwise: who owes ME (on-behalf + common shares where I paid) ──────
    const theyOweRows = await sql`
      SELECT es.user_id AS debtor_id, u.full_name AS debtor_name,
             COALESCE(SUM(es.amount_paise), 0) AS gross_owed
      FROM   expense_shares es
      JOIN   expenses        e  ON e.id  = es.expense_id
      JOIN   users           u  ON u.id  = es.user_id
      WHERE  e.household_id = ${hid}
        AND  e.expense_type IN ('on_behalf', 'common')
        AND  e.paid_by      = ${uid}
        AND  es.user_id    != ${uid}
        AND  e.is_deleted   = FALSE
      GROUP  BY es.user_id, u.full_name`;

    const receivedByPayer = await sql`
      SELECT payer_id, COALESCE(SUM(amount_paise), 0) AS confirmed_paid
      FROM   settlements
      WHERE  household_id = ${hid}
        AND  recipient_id = ${uid}
        AND  status       = 'confirmed'
      GROUP  BY payer_id`;

    const receivedMap = Object.fromEntries(
      receivedByPayer.map(r => [r.payer_id, parseInt(r.confirmed_paid, 10)])
    );

    const pairwise = theyOweRows
      .map(r => {
        const gross = parseInt(r.gross_owed, 10);
        const paid  = receivedMap[r.debtor_id] || 0;
        return {
          debtorId:      r.debtor_id,
          debtorName:    r.debtor_name,
          grossOwed:     gross,
          confirmedPaid: paid,
          outstanding:   Math.max(0, gross - paid),
        };
      })
      .filter(r => r.outstanding > 0);

    // ── Pairwise: what I OWE others (on-behalf + common shares where they paid) ─
    const myDebtRows = await sql`
      SELECT e.paid_by AS creditor_id, u.full_name AS creditor_name,
             COALESCE(SUM(es.amount_paise), 0) AS gross_owe
      FROM   expense_shares es
      JOIN   expenses        e  ON e.id  = es.expense_id
      JOIN   users           u  ON u.id  = e.paid_by
      WHERE  e.household_id = ${hid}
        AND  e.expense_type IN ('on_behalf', 'common')
        AND  es.user_id     = ${uid}
        AND  e.paid_by     != ${uid}
        AND  e.is_deleted   = FALSE
      GROUP  BY e.paid_by, u.full_name`;

    const paidToCreditor = await sql`
      SELECT recipient_id, COALESCE(SUM(amount_paise), 0) AS confirmed_paid
      FROM   settlements
      WHERE  household_id = ${hid}
        AND  payer_id     = ${uid}
        AND  status       = 'confirmed'
      GROUP  BY recipient_id`;

    const paidMap = Object.fromEntries(
      paidToCreditor.map(r => [r.recipient_id, parseInt(r.confirmed_paid, 10)])
    );

    const myDebts = myDebtRows
      .map(r => {
        const gross = parseInt(r.gross_owe, 10);
        const paid  = paidMap[r.creditor_id] || 0;
        return {
          creditorId:    r.creditor_id,
          creditorName:  r.creditor_name,
          grossOwe:      gross,
          confirmedPaid: paid,
          outstanding:   Math.max(0, gross - paid),
        };
      })
      .filter(r => r.outstanding > 0);

    const totalOwedToMe = pairwise.reduce((acc, p) => acc + p.outstanding, 0);
    const totalOwedByMe = myDebts.reduce((acc, d) => acc + d.outstanding, 0);

    res.json({
      personalSpending:  parseInt(personalRow.total, 10),
      commonShare:       parseInt(commonShareRow.total, 10),
      commonPaid:        parseInt(commonPaidRow.total, 10),
      advancedForOthers: parseInt(advancedRow.total, 10),
      owedToMe:          totalOwedToMe,
      owedByMe:          totalOwedByMe,
      pairwise,
      myDebts,
    });
  } catch (err) {
    console.error('[balances GET /]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
