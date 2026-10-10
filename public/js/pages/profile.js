'use strict';

/**
 * Render Profile & UPI Settings tab
 * @param {HTMLElement} c - Container element
 */
async function renderProfile(c) {
  const upiProfile = await api('GET', '/profile/upi');

  let qrHtml = '';
  if (upiProfile) {
    try {
      const qr = await api('GET', `/upi/qr?userId=${currentUser.id}`);
      qrHtml = `<div style="margin-top:16px;text-align:center;">
        <div style="display:inline-block;padding:10px;background:#ffffff;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.35);">
          <img src="${qr.qrDataUrl}" alt="My UPI QR" style="width:140px;height:140px;display:block;" />
        </div>
        <div class="text-xs text-muted mt-2 font-semibold">Your UPI QR Code</div>
        <div class="text-xs text-muted">Not independently verified</div>
      </div>`;
    } catch {
      // Ignore QR load failure
    }
  }

  c.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Profile &amp; UPI Settings</h1>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      <div class="card">
        <div class="card-title" style="margin-bottom:12px;">My Account</div>
        <div class="mb-2"><strong>Name:</strong> ${esc(currentUser.fullName)}</div>
        <div class="mb-2"><strong>Username:</strong> ${esc(currentUser.username)}</div>
        <div class="mb-4"><strong>Role:</strong> <span style="text-transform:capitalize;">${esc(currentUser.role)}</span></div>
        <button class="btn btn-secondary" onclick="openChangePwModal()">Change Password</button>
      </div>

      <div class="card">
        <div class="card-title" style="margin-bottom:12px;">UPI Profile</div>
        ${upiProfile ? `
          <div class="mb-2"><strong>UPI ID:</strong> <span class="font-mono">${esc(upiProfile.upi_id)}</span></div>
          <div class="mb-2"><strong>Display Name:</strong> ${esc(upiProfile.display_name)}</div>
          <div class="mb-4 text-xs text-muted">Last updated: ${new Date(upiProfile.updated_at).toLocaleString('en-IN')}</div>
          <div class="alert alert-info text-xs mb-4">UPI ID is not independently verified. Others are advised to confirm manually.</div>
          ${qrHtml}
          <div class="flex gap-2 mt-4">
            <button class="btn btn-secondary" onclick="openUpiModal(true)">Edit</button>
            <button class="btn btn-danger" onclick="deleteUpi()">Remove</button>
          </div>` : `
          <div class="text-muted text-sm mb-4">No UPI ID set. Add one so flatmates can pay you easily.</div>
          <button class="btn btn-primary" onclick="openUpiModal(false)">Add UPI ID</button>`}
      </div>
    </div>`;
}

function openUpiModal(isEdit) {
  openModal(isEdit ? 'Edit UPI Profile' : 'Add UPI ID', `
    <div id="upi-error" class="alert alert-error hidden"></div>
    <div class="form-group">
      <label class="form-label">UPI ID *</label>
      <input class="form-control font-mono" id="upi-id" type="text" placeholder="name@bank" />
      <div class="form-hint">Format: name@upihandle (e.g. virendra@oksbi, 9876543210@paytm)</div>
    </div>
    <div class="form-group">
      <label class="form-label">Confirm UPI ID *</label>
      <input class="form-control font-mono" id="upi-id-confirm" type="text" placeholder="name@bank" />
    </div>
    <div class="form-group">
      <label class="form-label">Display Name *</label>
      <input class="form-control" id="upi-name" type="text" placeholder="Your name as on UPI" value="${esc(currentUser.fullName)}" />
    </div>
    <div class="alert alert-info text-sm">This UPI ID is NOT independently verified. Flatmates should confirm with you before paying.</div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="saveUpi()">Save</button>
  `);
}

async function saveUpi() {
  const upiId = el('upi-id').value.trim();
  const confirmVal = el('upi-id-confirm').value.trim();
  const name = el('upi-name').value.trim();
  const errEl = el('upi-error');
  errEl.classList.add('hidden');

  if (!upiId || !name) {
    errEl.textContent = 'Fill in all required fields';
    errEl.classList.remove('hidden');
    return;
  }
  if (upiId !== confirmVal) {
    errEl.textContent = 'UPI IDs do not match';
    errEl.classList.remove('hidden');
    return;
  }

  try {
    await api('PUT', '/profile/upi', { upi_id: upiId, display_name: name });
    closeModal();
    toast('UPI profile saved', 'success');
    navigate('profile');
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  }
}

async function deleteUpi() {
  if (!confirm('Remove your UPI ID? Existing payment claims will retain their snapshot.')) return;
  try {
    await api('DELETE', '/profile/upi');
    toast('UPI profile removed');
    navigate('profile');
  } catch (err) {
    toast(err.message, 'error');
  }
}

function openChangePwModal() {
  openModal('Change Password', `
    <div id="cpw2-error" class="alert alert-error hidden"></div>
    <div class="form-group">
      <label class="form-label" for="cpw2-current">Current Password</label>
      <div class="password-input-wrap">
        <input class="form-control" id="cpw2-current" type="password" autocomplete="current-password" placeholder="Enter current password" />
        <button type="button" class="password-toggle-btn" onclick="togglePasswordVisibility('cpw2-current', this)" aria-label="Show password" title="Toggle password visibility">
          <svg class="eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          <svg class="eye-off-icon hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
        </button>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label" for="cpw2-new">New Password</label>
      <div class="password-input-wrap">
        <input class="form-control" id="cpw2-new" type="password" minlength="6" autocomplete="new-password" placeholder="At least 6 characters" />
        <button type="button" class="password-toggle-btn" onclick="togglePasswordVisibility('cpw2-new', this)" aria-label="Show password" title="Toggle password visibility">
          <svg class="eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          <svg class="eye-off-icon hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
        </button>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label" for="cpw2-confirm">Confirm New Password</label>
      <div class="password-input-wrap">
        <input class="form-control" id="cpw2-confirm" type="password" minlength="6" autocomplete="new-password" placeholder="Re-enter new password" />
        <button type="button" class="password-toggle-btn" onclick="togglePasswordVisibility('cpw2-confirm', this)" aria-label="Show password" title="Toggle password visibility">
          <svg class="eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          <svg class="eye-off-icon hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
        </button>
      </div>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="doChangePw()">Change Password</button>
  `);
}

async function doChangePw() {
  const cur = el('cpw2-current').value;
  const nw = el('cpw2-new').value;
  const cf = el('cpw2-confirm').value;
  const errEl = el('cpw2-error');
  errEl.classList.add('hidden');

  if (!cur || !nw || !cf) {
    errEl.textContent = 'Fill in all password fields';
    errEl.classList.remove('hidden');
    return;
  }
  if (nw !== cf) {
    errEl.textContent = 'Passwords do not match';
    errEl.classList.remove('hidden');
    return;
  }
  if (nw.length < 6) {
    errEl.textContent = 'Password must be at least 6 characters';
    errEl.classList.remove('hidden');
    return;
  }

  try {
    await api('POST', '/auth/change-password', { currentPassword: cur, newPassword: nw });
    if (currentUser) currentUser.mustChangePassword = false;
    if (window.currentUser) window.currentUser.mustChangePassword = false;
    closeModal();
    toast('Password changed successfully', 'success');
    navigate('profile');
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  }
}
