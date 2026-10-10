'use strict';

/**
 * Money and formatting utilities
 */
const paise = (rupees) => Math.round(parseFloat(rupees || 0) * 100);
const rupees = (p) => (parseInt(p || 0, 10) / 100).toFixed(2);
/**
 * Capture current date from the user's device in local YYYY-MM-DD format
 */
const today = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Format a YYYY-MM-DD or ISO date string into a user-friendly local date string (e.g. 11 Oct 2026)
 */
function formatDate(d) {
  if (!d) return '';
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)) {
    const [year, month, day] = d.split('T')[0].split('-');
    const localDate = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    return localDate.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
  const dateObj = new Date(d);
  return isNaN(dateObj.getTime())
    ? String(d)
    : dateObj.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
}

/**
 * HTML sanitization escaping special characters including quotes (AUD-08)
 */
const esc = (s) => String(s || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const el = (id) => document.getElementById(id);

/**
 * Render standard badge for expense / settlement statuses
 */
function badgeHtml(status) {
  const cls = {
    confirmed: 'badge-confirmed',
    pending: 'badge-pending',
    verification_pending: 'badge-pending',
    rejected: 'badge-rejected',
    cancelled: 'badge-cancelled',
    active: 'badge-active',
    personal: 'badge-personal',
    on_behalf: 'badge-on-behalf',
    common: 'badge-common',
  }[status] || 'badge-personal';
  const label = { verification_pending: 'Pending Verification' }[status] || (status ? status.replace(/_/g, ' ') : '');
  return `<span class="badge ${cls}">${esc(label)}</span>`;
}

/**
 * Lookup member full name by ID
 */
function memberName(id) {
  const m = (window.members || []).find(m => m.id === id);
  return m ? m.full_name : id;
}

/**
 * HTML <option> list for members
 */
function memberOptions(selectedId, includeSelf = true) {
  const list = window.members || [];
  const current = window.currentUser || {};
  return list
    .filter(m => includeSelf || m.id !== current.id)
    .map(m => `<option value="${m.id}" ${m.id === selectedId ? 'selected' : ''}>${esc(m.full_name)}</option>`)
    .join('');
}

/**
 * Lookup category name by ID
 */
function getCategoryName(id) {
  if (!id) return '';
  const c = (window.categories || []).find(cat => cat.id === id);
  return c ? c.name : id;
}

/**
 * HTML <option> list for categories datalist
 */
function categoryDatalistOptions() {
  const list = window.categories || [];
  return list.map(c => `<option value="${esc(c.name)}"></option>`).join('');
}

/**
 * Sync the global <datalist id="category-datalist"> with current window.categories
 */
function updateCategoryDatalists() {
  const dl = el('category-datalist');
  if (dl) {
    dl.innerHTML = categoryDatalistOptions();
  }
}

/**
 * Resolve or dynamically create category from combobox input
 * @param {string} inputVal - The typed text or selected category name / UUID
 * @returns {Promise<string|null>} - Returns resolved category UUID, or null if empty
 */
async function resolveCategoryInput(inputVal) {
  if (!inputVal) return null;
  const val = String(inputVal).trim();
  if (!val) return null;

  const list = window.categories || [];

  // Match by ID
  const byId = list.find(c => c.id === val);
  if (byId) return byId.id;

  // Match by Name (case-insensitive)
  const byName = list.find(c => c.name.toLowerCase() === val.toLowerCase());
  if (byName) return byName.id;

  // If new category typed, create via API so it's persisted and cached immediately
  try {
    const created = await api('POST', '/categories', { name: val });
    if (created && created.id) {
      if (!list.some(c => c.id === created.id)) {
        list.push(created);
        window.categories = list;
        updateCategoryDatalists();
      }
      return created.id;
    }
  } catch (err) {
    console.warn('[resolveCategoryInput] API create fallback to server resolution:', err);
  }

  // Fallback to the raw string if API call fails
  return val;
}

/**
 * HTML <option> list for categories (legacy fallback)
 */
function categoryOptions(selectedId) {
  const list = window.categories || [];
  return `<option value="">— None —</option>` +
    list.map(c => `<option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
}

/**
 * Toggle password visibility between text and password type
 * @param {string} inputId
 * @param {HTMLElement} btn
 */
function togglePasswordVisibility(inputId, btn) {
  const input = el(inputId);
  if (!input) return;
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';

  if (btn) {
    const eye = btn.querySelector('.eye-icon');
    const eyeOff = btn.querySelector('.eye-off-icon');
    if (eye && eyeOff) {
      if (isPassword) {
        eye.classList.add('hidden');
        eyeOff.classList.remove('hidden');
        btn.setAttribute('aria-label', 'Hide password');
      } else {
        eye.classList.remove('hidden');
        eyeOff.classList.add('hidden');
        btn.setAttribute('aria-label', 'Show password');
      }
    }
  }
}
window.togglePasswordVisibility = togglePasswordVisibility;
window.today = today;
window.formatDate = formatDate;
