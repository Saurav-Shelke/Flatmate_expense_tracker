import { randomUUID as uuidv4 } from 'crypto';
import sql from '../db/index';

/**
 * Write an entry to the activity_logs table.
 * Failures are logged to console but never thrown — audit must not break the primary operation.
 */
export async function audit(
  actorId: string,
  householdId: string,
  entityType: string,
  entityId: string,
  action: string,
  before: any = null,
  after: any = null
): Promise<void> {
  try {
    await sql`
      INSERT INTO activity_logs
        (id, actor_user_id, household_id, entity_type, entity_id, action, before_state, after_state, created_at)
      VALUES
        (${uuidv4()}, ${actorId}, ${householdId}, ${entityType}, ${entityId}, ${action},
         ${JSON.stringify(before ?? null)}, ${JSON.stringify(after ?? null)}, NOW())`;
  } catch (err: any) {
    console.error('[audit] Failed to write log:', err.message);
  }
}

export default { audit };
