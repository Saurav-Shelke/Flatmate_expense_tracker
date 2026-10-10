'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL APPLICATION STATE
// ─────────────────────────────────────────────────────────────────────────────
let currentUser = null;
let members = [];
let categories = [];
let currentPage = 'dashboard';

// Expose state to window for page modularity
window.currentUser = currentUser;
window.members = members;
window.categories = categories;

// ─────────────────────────────────────────────────────────────────────────────
// AUTHENTICATION & SESSION
// ─────────────────────────────────────────────────────────────────────────────
async function checkSession() {
  try {
    const data = await api('GET', '/auth/session');
    if (data && data.authenticated && data.id) {
      currentUser = data;
      window.currentUser = currentUser;
      await loadStaticData();
      showApp();
      if (currentUser.mustChangePassword) {
        navigate('dashboard');
        showChangePwModal();
      } else {
        navigate(currentPage);
      }
    } else {
      currentUser = null;
      window.currentUser = null;
      showLogin();
    }
  } catch {
    showLogin();
  }
}

function showLogin() {
  el('login-page').classList.remove('hidden');
  el('app-shell').classList.add('hidden');
}

function showApp() {
  el('login-page').classList.add('hidden');
  el('app-shell').classList.remove('hidden');
  
  // Desktop sidebar user info
  if (el('sidebar-user-name')) el('sidebar-user-name').textContent = currentUser.fullName;
  if (el('sidebar-user-role')) el('sidebar-user-role').textContent = currentUser.role;

  // Mobile header avatar & drawer info
  const initial = (currentUser.fullName || 'U').charAt(0).toUpperCase();
  if (el('mobile-user-avatar')) el('mobile-user-avatar').textContent = initial;
  if (el('drawer-user-name')) el('drawer-user-name').textContent = currentUser.fullName;
  if (el('drawer-user-role')) el('drawer-user-role').textContent = currentUser.role;
}

function toggleMobileDrawer(forceState) {
  const drawer = el('mobile-drawer-backdrop');
  if (!drawer) return;
  if (typeof forceState === 'boolean') {
    if (forceState) drawer.classList.remove('hidden');
    else drawer.classList.add('hidden');
  } else {
    drawer.classList.toggle('hidden');
  }
}

async function logout() {
  try {
    await api('POST', '/auth/logout');
  } catch {
    // Ignore error on logout
  }
  currentUser = null;
  window.currentUser = null;
  showLogin();
}

function showChangePwModal() {
  el('change-pw-modal').classList.remove('hidden');
}

// ─────────────────────────────────────────────────────────────────────────────
// STATIC DATA LOADER
// ─────────────────────────────────────────────────────────────────────────────
async function loadStaticData() {
  const [mList, cList] = await Promise.all([
    api('GET', '/members'),
    api('GET', '/categories'),
  ]);
  members = mList || [];
  categories = cList || [];
  window.members = members;
  window.categories = categories;
  updateCategoryDatalists();
}

// ─────────────────────────────────────────────────────────────────────────────
// NAVIGATION & PAGE ROUTING
// ─────────────────────────────────────────────────────────────────────────────
function navigate(page) {
  currentPage = page;

  // Close mobile drawer if open
  toggleMobileDrawer(false);

  // Update active sidebar desktop nav button
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.page === page);
  });

  // Update active mobile bottom bar button
  document.querySelectorAll('.mobile-nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.page === page);
  });

  // Scroll to top smoothly
  window.scrollTo({ top: 0, behavior: 'instant' });

  // Hide all page containers
  document.querySelectorAll('[id^="page-"]').forEach(p => {
    p.classList.add('hidden');
    p.classList.remove('page-enter');
  });

  const pageEl = el('page-' + page);
  if (pageEl) {
    pageEl.classList.remove('hidden');
    pageEl.classList.add('page-enter');
    renderPage(page, pageEl);
  }
}

async function renderPage(page, container) {
  container.innerHTML = '<div class="page-loading"><div class="loading-spinner"></div><br>Loading…</div>';
  try {
    switch (page) {
      case 'dashboard':
        await renderDashboard(container);
        break;
      case 'personal':
        await renderPersonal(container);
        break;
      case 'purchases-made':
        await renderPurchasesMade(container);
        break;
      case 'purchases-for-me':
        await renderPurchasesForMe(container);
        break;
      case 'common':
        await renderCommon(container);
        break;
      case 'balances':
        await renderBalances(container);
        break;
      case 'repayments':
        await renderRepayments(container);
        break;
      case 'profile':
        await renderProfile(container);
        break;
      default:
        container.innerHTML = '<div class="alert alert-error">Page not found</div>';
    }
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">Failed to load: ${esc(err.message)}</div>`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENT HANDLERS
// ─────────────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Login form handler
  const loginForm = el('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = el('login-btn');
      btn.disabled = true;
      btn.textContent = 'Signing in…';
      el('login-error').classList.add('hidden');

      try {
        const data = await api('POST', '/auth/login', {
          username: el('login-username').value.trim(),
          password: el('login-password').value,
        });
        currentUser = data;
        window.currentUser = currentUser;
        await loadStaticData();
        showApp();
        navigate('dashboard');
        if (data.mustChangePassword) {
          showChangePwModal();
        }
      } catch (err) {
        el('login-error').textContent = err.message;
        el('login-error').classList.remove('hidden');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Sign In';
      }
    });
  }

  // Change password on first login form handler
  const changePwForm = el('changepw-form');
  if (changePwForm) {
    changePwForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const cur = el('cpw-current').value;
      const nw = el('cpw-new').value;
      const cf = el('cpw-confirm').value;

      el('changepw-error').classList.add('hidden');
      if (nw !== cf) {
        el('changepw-error').textContent = 'Passwords do not match';
        el('changepw-error').classList.remove('hidden');
        return;
      }

      try {
        await api('POST', '/auth/change-password', { currentPassword: cur, newPassword: nw });
        el('change-pw-modal').classList.add('hidden');
        if (currentUser) currentUser.mustChangePassword = false;
        if (window.currentUser) window.currentUser.mustChangePassword = false;
        toast('Password changed successfully', 'success');
        navigate('dashboard');
      } catch (err) {
        el('changepw-error').textContent = err.message;
        el('changepw-error').classList.remove('hidden');
      }
    });
  }

  // Boot application
  checkSession();

  // Register service worker for PWA / mobile standalone mode
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.debug('ServiceWorker registration skipped:', err);
      });
    });
  }
});
