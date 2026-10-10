'use strict';

const bcrypt = require('bcryptjs');

/**
 * Hash a password using bcrypt (pure JS, 100% serverless safe).
 * @param {string} password
 * @returns {Promise<string>}
 */
async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

/**
 * Verify a plain text password against a hash.
 * @param {string} hash
 * @param {string} password
 * @returns {Promise<boolean>}
 */
async function verifyPassword(hash, password) {
  if (!hash || !password) return false;
  try {
    return await bcrypt.compare(password, hash);
  } catch (err) {
    return false;
  }
}

module.exports = { hashPassword, verifyPassword };
