'use strict';

const { v4: uuidv4 } = require('uuid');
const sql = require('../db/index');

/**
 * Write an entry to the activity_logs table.
 * Failures are logged to console but never thrown — audit must not break the
 * primary operation.
 *
 * @param {string} actorId    - User who performed the action
 * @param {string} householdId
 * @param {string} entityType - e.g. 'expense', 'settlement', 'upi_profile'
 * @param {string} entityId   - UUID of the affected entity
 * @param {string} action     - e.g. 'create', 'delete', 'confirm'
 * @param {object|null} before
 * @param {object|null} after
 */
async function audit(actorId, householdId, entityType, entityId, action, before, after) {
  try {
    await sql`
      INSERT INTO activity_logs
        (id, actor_user_id, household_id, entity_type, entity_id, action, before_state, after_state, created_at)
      VALUES
        (${uuidv4()}, ${actorId}, ${householdId}, ${entityType}, ${entityId}, ${action},
         ${JSON.stringify(before ?? null)}, ${JSON.stringify(after ?? null)}, NOW())`;
  } catch (err) {
    console.error('[audit] Failed to write log:', err.message);
  }
}

module.exports = { audit };
