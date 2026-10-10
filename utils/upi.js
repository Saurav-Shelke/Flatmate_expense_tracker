'use strict';

/**
 * Normalize a UPI ID: trim whitespace and lowercase.
 * @param {string} upiId
 * @returns {string}
 */
function normalizeUPI(upiId) {
  return upiId.trim().toLowerCase();
}

/**
 * Validate UPI ID syntax: <handle>@<bank/provider>
 * Does NOT verify the ID actually exists.
 * @param {string} upiId
 * @returns {boolean}
 */
function validateUPI(upiId) {
  return /^[a-zA-Z0-9._\-+]{2,}@[a-zA-Z]{2,}$/.test(upiId);
}

/**
 * Build a UPI payment URI.
 * @param {string} upiId
 * @param {string} displayName
 * @param {number|null} amountPaise - amount in paise (integer), or null for open amount
 * @returns {string}
 */
function buildUpiUri(upiId, displayName, amountPaise = null) {
  let uri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(displayName)}&cu=INR`;
  if (amountPaise != null && Number.isInteger(amountPaise) && amountPaise > 0) {
    const rupees = (amountPaise / 100).toFixed(2);
    uri += `&am=${rupees}`;
  }
  return uri;
}

module.exports = { normalizeUPI, validateUPI, buildUpiUri };
