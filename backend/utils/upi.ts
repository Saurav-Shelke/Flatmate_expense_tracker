/**
 * Normalize a UPI ID: trim whitespace and lowercase.
 */
export function normalizeUPI(upiId: string): string {
  return upiId.trim().toLowerCase();
}

/**
 * Validate UPI ID syntax: <handle>@<bank/provider>
 * Does NOT verify the ID actually exists.
 */
export function validateUPI(upiId: string): boolean {
  return /^[a-zA-Z0-9._\-+]{2,}@[a-zA-Z]{2,}$/.test(upiId);
}

/**
 * Build a UPI payment URI.
 */
export function buildUpiUri(upiId: string, displayName: string, amountPaise: number | null = null): string {
  let uri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(displayName)}&cu=INR`;
  if (amountPaise != null && Number.isInteger(amountPaise) && amountPaise > 0) {
    const rupees = (amountPaise / 100).toFixed(2);
    uri += `&am=${rupees}`;
  }
  return uri;
}

export default { normalizeUPI, validateUPI, buildUpiUri };
