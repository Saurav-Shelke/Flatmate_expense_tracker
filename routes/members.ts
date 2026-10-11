import { Router, Request, Response } from 'express';
import sql from '../db/index';
import { requireAuth } from '../middleware/auth';

const router = Router();

// ── GET /api/members ─────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const session = (req as any).session;
  try {
    const rows = await sql`
      SELECT u.id, u.full_name, u.username, hm.role, u.is_active
      FROM   users u
      JOIN   household_members hm ON hm.user_id = u.id
      WHERE  hm.household_id = ${session.householdId}
        AND  hm.is_active = TRUE
      ORDER  BY u.full_name`;
    res.json(rows);
  } catch (err) {
    console.error('[members]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
