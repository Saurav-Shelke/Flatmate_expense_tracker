'use strict';

const sql = require('../db/index');

/**
 * Require a valid, active, authenticated session.
 * Blocks all operations except password change if mustChangePassword is true. (AUD-03, AUD-06)
 */
async function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // If user must change password, restrict mutating operations until password is changed
  if (req.session.mustChangePassword) {
    const isAllowedAuthPath =
      req.baseUrl === '/api/auth' &&
      ['/change-password', '/logout', '/session'].includes(req.path);

    if (!isAllowedAuthPath && req.method !== 'GET') {
      return res.status(403).json({
        error: 'Password change required before performing actions',
        mustChangePassword: true,
      });
    }
  }

  // For write requests (POST, PUT, DELETE), verify user account is still active in DB (AUD-06)
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    try {
      const rows = await sql`
        SELECT u.is_active, hm.is_active AS member_active
        FROM   users u
        JOIN   household_members hm ON hm.user_id = u.id AND hm.household_id = ${req.session.householdId}
        WHERE  u.id = ${req.session.userId}`;

      if (!rows.length || !rows[0].is_active || !rows[0].member_active) {
        req.session.destroy(() => {});
        return res.status(403).json({ error: 'Account has been deactivated' });
      }
    } catch (err) {
      console.error('[auth guard check]', err);
    }
  }

  next();
}

/**
 * Require the authenticated user to be an admin in their household.
 */
function requireAdmin(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  if (req.session.mustChangePassword && req.method !== 'GET') {
    return res.status(403).json({
      error: 'Password change required before performing admin actions',
      mustChangePassword: true,
    });
  }
  if (req.session.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
