import { Router, Request, Response } from 'express';
import sql from '../db/index';
import { requireAuth } from '../middleware/auth';

const router = Router();

// ── GET /api/activity ────────────────────────────────────────────────────────
// Returns the current user's own activity log (last 50 entries).
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const session = (req as any).session;
  const hid = session.householdId;
  const uid = session.userId;

  try {
    const limitNum = Math.min(50, Math.max(1, parseInt(String(req.query.limit), 10) || 50));
    const rows = await sql`
      SELECT al.*, u.full_name AS actor_name
      FROM   activity_logs al
      LEFT   JOIN users u ON u.id = al.actor_user_id
      WHERE  al.household_id    = ${hid}
        AND  al.actor_user_id   = ${uid}
      ORDER  BY al.created_at DESC
      LIMIT  ${limitNum}`;

    res.json(rows);
  } catch (err) {
    console.error('[activity GET /]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
