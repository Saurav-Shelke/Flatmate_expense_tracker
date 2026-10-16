import bcrypt from 'bcryptjs';

/**
 * Hash a password using bcrypt (pure JS, 100% serverless safe).
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Verify a plain text password against a hash.
 */
export async function verifyPassword(hash?: string | null, password?: string | null): Promise<boolean> {
  if (!hash || !password) return false;
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}
