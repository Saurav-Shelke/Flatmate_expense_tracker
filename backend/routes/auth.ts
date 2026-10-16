import { Router, Request, Response } from 'express';
import { verifyPassword, hashPassword } from '../utils/password';
import sql from '../db/index';
import { requireAuth } from '../middleware/auth';
import { rateLimitLogin, rateLimitPassword } from '../middleware/rateLimiter';

const router = Router();

// ── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', rateLimitLogin, async (req: Request, res: Response) => {
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

    const session = (req as any).session;
    const setSessionData = () => {
      session.userId             = user.id;
      session.username           = user.username;
      session.fullName           = user.full_name;
      session.role               = user.role;
      session.householdId        = user.household_id;
      session.mustChangePassword = user.must_change_password; // AUD-03

      session.save((saveErr: any) => {
        if (saveErr) {
          console.error('[auth/login] session save error:', saveErr);
        }
        const userPayload = {
          id:                 user.id,
          fullName:           user.full_name,
          username:           user.username,
          role:               user.role,
          householdId:        user.household_id,
          mustChangePassword: user.must_change_password,
        };
        res.json({
          success: true,
          user: userPayload,
          ...userPayload,
        });
      });
    };

    if (typeof session.regenerate === 'function') {
      session.regenerate((err: any) => {
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
router.post('/logout', (req: Request, res: Response) => {
  const session = (req as any).session;
  session?.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

// ── GET /api/auth/session & /api/auth/me ──────────────────────────────────────
router.get(['/session', '/me'], (req: Request, res: Response) => {
  const session = (req as any).session;
  if (!session?.userId) {
    return res.json({ authenticated: false });
  }
  const user = {
    id:                 session.userId,
    fullName:           session.fullName,
    username:           session.username,
    role:               session.role,
    householdId:        session.householdId,
    mustChangePassword: !!session.mustChangePassword, // AUD-03
  };
  res.json({
    authenticated: true,
    user,
    ...user,
  });
});

// ── POST /api/auth/change-password ───────────────────────────────────────────
router.post('/change-password', requireAuth, rateLimitPassword, async (req: Request, res: Response) => {
  const session = (req as any).session;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'currentPassword and newPassword are required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  try {
    const rows = await sql`SELECT password_hash FROM users WHERE id = ${session.userId}`;
    if (!rows.length) return res.status(404).json({ error: 'User not found' });

    const valid = await verifyPassword(rows[0].password_hash, currentPassword);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const hash = await hashPassword(newPassword);
    await sql`
      UPDATE users
      SET    password_hash = ${hash}, must_change_password = FALSE, updated_at = NOW()
      WHERE  id = ${session.userId}`;

    session.mustChangePassword = false;
    session.save(() => {
      res.json({ ok: true });
    });
  } catch (err) {
    console.error('[auth/change-password]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
