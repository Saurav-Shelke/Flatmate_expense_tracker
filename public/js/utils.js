'use strict';

/**
 * Money and formatting utilities
 */
const paise = (rupees) => Math.round(parseFloat(rupees || 0) * 100);
const rupees = (p) => (parseInt(p || 0, 10) / 100).toFixed(2);
const fmt = (p) => '₹' + (parseInt(p || 0, 10) / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
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
window.fmt = fmt;
window.paise = paise;
window.rupees = rupees;
window.esc = esc;
window.el = el;
window.badgeHtml = badgeHtml;
window.memberName = memberName;
window.memberOptions = memberOptions;
window.getCategoryName = getCategoryName;
window.categoryDatalistOptions = categoryDatalistOptions;
window.updateCategoryDatalists = updateCategoryDatalists;
window.resolveCategoryInput = resolveCategoryInput;

/**
 * Render responsive skeleton layout based on page type
 * @param {string} pageType
 * @returns {string} HTML string of responsive skeleton
 */
function renderPageSkeleton(pageType) {
  if (pageType === 'dashboard') {
    return `
      <div class="skeleton-page">
        <div class="skeleton-header">
          <div>
            <div class="skeleton skeleton-title" style="width:160px;height:28px;"></div>
            <div class="skeleton skeleton-sub" style="width:120px;height:14px;margin-top:6px;"></div>
          </div>
          <div class="skeleton skeleton-btn" style="width:140px;height:38px;"></div>
        </div>
        <div class="skeleton skeleton-banner" style="height:64px;border-radius:var(--radius-lg);margin-bottom:18px;"></div>
        <div class="stats-grid">
          ${Array(6).fill(0).map(() => `
            <div class="card skeleton-card">
              <div class="skeleton" style="width:40%;height:14px;margin-bottom:12px;"></div>
              <div class="skeleton" style="width:65%;height:28px;margin-bottom:8px;"></div>
              <div class="skeleton" style="width:50%;height:12px;"></div>
            </div>
          `).join('')}
        </div>
        <div class="card" style="margin-top:20px;">
          <div class="skeleton" style="width:200px;height:18px;margin-bottom:16px;"></div>
          <div class="skeleton-table">
            ${Array(4).fill(0).map(() => `
              <div class="skeleton-row">
                <div class="skeleton" style="width:20%;height:16px;"></div>
                <div class="skeleton" style="width:30%;height:16px;"></div>
                <div class="skeleton" style="width:25%;height:16px;"></div>
                <div class="skeleton" style="width:15%;height:16px;"></div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  if (pageType === 'balances') {
    return `
      <div class="skeleton-page">
        <div class="skeleton-header">
          <div class="skeleton skeleton-title" style="width:140px;height:28px;"></div>
          <div class="skeleton skeleton-btn" style="width:120px;height:38px;"></div>
        </div>
        <div class="stats-grid" style="grid-template-columns:1fr 1fr;margin-bottom:20px;">
          <div class="card skeleton-card"><div class="skeleton" style="height:50px;"></div></div>
          <div class="card skeleton-card"><div class="skeleton" style="height:50px;"></div></div>
        </div>
        <div class="card">
          <div class="skeleton" style="width:180px;height:18px;margin-bottom:16px;"></div>
          ${Array(4).fill(0).map(() => `
            <div class="skeleton-row" style="margin-bottom:12px;">
              <div class="skeleton" style="width:40%;height:18px;"></div>
              <div class="skeleton" style="width:25%;height:18px;"></div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  if (pageType === 'purchases-made' || pageType === 'purchases-for-me') {
    return `
      <div class="skeleton-page">
        <div class="skeleton-header">
          <div class="skeleton skeleton-title" style="width:220px;height:28px;"></div>
          ${pageType === 'purchases-made' ? '<div class="skeleton skeleton-btn" style="width:130px;height:38px;"></div>' : ''}
        </div>
        ${Array(3).fill(0).map(() => `
          <div class="card mb-4 skeleton-card">
            <div class="flex items-center justify-between mb-3">
              <div style="flex:1;">
                <div class="skeleton" style="width:45%;height:18px;margin-bottom:6px;"></div>
                <div class="skeleton" style="width:30%;height:12px;"></div>
              </div>
              <div class="skeleton" style="width:80px;height:24px;"></div>
            </div>
            <div class="skeleton-table">
              <div class="skeleton-row mb-2">
                <div class="skeleton" style="width:35%;height:14px;"></div>
                <div class="skeleton" style="width:25%;height:14px;"></div>
                <div class="skeleton" style="width:20%;height:14px;"></div>
              </div>
              <div class="skeleton-row">
                <div class="skeleton" style="width:40%;height:14px;"></div>
                <div class="skeleton" style="width:20%;height:14px;"></div>
                <div class="skeleton" style="width:25%;height:14px;"></div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Default table-based skeleton (personal, common, repayments, etc.)
  return `
    <div class="skeleton-page">
      <div class="skeleton-header">
        <div class="skeleton skeleton-title" style="width:200px;height:28px;"></div>
        <div class="skeleton skeleton-btn" style="width:130px;height:38px;"></div>
      </div>
      <div class="card">
        <div class="skeleton-table">
          <div class="skeleton-row skeleton-header-row mb-3">
            <div class="skeleton" style="width:15%;height:16px;"></div>
            <div class="skeleton" style="width:40%;height:16px;"></div>
            <div class="skeleton" style="width:20%;height:16px;"></div>
            <div class="skeleton" style="width:15%;height:16px;"></div>
          </div>
          ${Array(5).fill(0).map(() => `
            <div class="skeleton-row mb-3">
              <div class="skeleton" style="width:12%;height:14px;"></div>
              <div class="skeleton" style="width:45%;height:14px;"></div>
              <div class="skeleton" style="width:18%;height:14px;"></div>
              <div class="skeleton" style="width:15%;height:14px;"></div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}
window.renderPageSkeleton = renderPageSkeleton;

