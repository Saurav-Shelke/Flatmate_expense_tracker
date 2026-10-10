'use strict';

let currentPaymentShareId = null;

/**
 * Render Repayments tab
 * @param {HTMLElement} c - Container element
 */
async function renderRepayments(c) {
  const settlements = await api('GET', '/settlements');

  const pending = (settlements || []).filter(s => ['pending', 'verification_pending'].includes(s.status));
  const history = (settlements || []).filter(s => !['pending', 'verification_pending'].includes(s.status));

  c.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Repayments</h1>
      <button class="btn btn-primary" onclick="openPayModalGeneral()">Record Payment</button>
    </div>

    ${pending.length > 0 ? `
    <div class="card mb-4">
      <div class="card-title" style="margin-bottom:12px;">Pending / Awaiting Confirmation</div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>From</th>
              <th>To</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Ref</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${pending.map(s => `<tr>
              <td>${esc(s.payer_name)}</td>
              <td>${esc(s.recipient_name)}</td>
              <td class="amount-cell font-mono">${fmt(s.amount_paise)}</td>
              <td>${esc(s.method)}</td>
              <td class="text-muted text-sm">${esc(s.transaction_reference || '—')}</td>
              <td>${badgeHtml(s.status)}</td>
              <td>
                ${s.recipient_id === currentUser.id ? `
                  <button class="btn btn-primary btn-sm" onclick="confirmSettlement('${s.id}')">Confirm</button>
                  <button class="btn btn-danger btn-sm" onclick="rejectSettlement('${s.id}')">Reject</button>` : ''}
                ${s.payer_id === currentUser.id ? `
                  <button class="btn btn-secondary btn-sm" onclick="cancelSettlement('${s.id}')">Cancel</button>` : ''}
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>` : ''}

    <div class="card">
      <div class="card-title" style="margin-bottom:12px;">Payment History</div>
      ${history.length === 0 ? '<div class="empty">No payment history yet.</div>' : `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>From</th>
              <th>To</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Status</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            ${history.map(s => `<tr>
              <td class="text-muted text-sm">${new Date(s.created_at).toLocaleDateString('en-IN')}</td>
              <td>${esc(s.payer_name)}</td>
              <td>${esc(s.recipient_name)}</td>
              <td class="amount-cell font-mono">${fmt(s.amount_paise)}</td>
              <td>${esc(s.method)}</td>
              <td>${badgeHtml(s.status)}</td>
              <td class="text-muted text-sm">${esc(s.note || s.transaction_reference || '—')}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`}
    </div>`;
}

function openPayModalGeneral() {
  openPayModal('', '', 0, null);
}

async function loadPayQr(recipientId, amountPaise) {
  const container = el('pay-qr-container');
  if (!container) return;
  if (!recipientId) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = '<div class="text-xs text-muted" style="text-align:center;padding:8px;">Loading UPI info…</div>';
  try {
    const qr = await api('GET', `/upi/qr?userId=${recipientId}&amount=${amountPaise || 0}`);
    container.innerHTML = `
      <div class="alert alert-info mb-4" style="justify-content:space-between;">
        <div><strong>UPI:</strong> <span class="font-mono font-semibold" style="letter-spacing:0.02em;">${esc(qr.upiId)}</span></div>
        <button class="btn btn-secondary btn-sm" onclick="navigator.clipboard.writeText('${esc(qr.upiId)}').then(()=>toast('Copied!'))">Copy</button>
      </div>
      <div style="text-align:center;margin-bottom:18px;">
        <div style="display:inline-block;padding:10px;background:#ffffff;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.35);">
          <img src="${qr.qrDataUrl}" alt="UPI QR Code" style="width:140px;height:140px;display:block;" />
        </div>
        <div class="text-xs text-muted mt-2 font-semibold">Scan to pay ${esc(qr.displayName)}</div>
        <div class="text-xs text-muted">Confirm receipt manually with recipient.</div>
      </div>`;
  } catch {
    container.innerHTML = `<div class="alert alert-info mb-4">No UPI profile set by recipient. Pay via cash.</div>`;
  }
}

async function openPayModal(recipientId, recipientName, amountPaise, expenseShareId = null) {
  currentPaymentShareId = expenseShareId || null;

  openModal('Record Payment', `
    <div id="pay-error" class="alert alert-error hidden"></div>
    <div id="pay-qr-container"></div>
    <div class="form-group">
      <label class="form-label">Paying To *</label>
      <select class="form-control" id="pay-recipient" onchange="loadPayQr(this.value, paise(el('pay-amount').value))">
        <option value="">— Select recipient —</option>
        ${members.filter(m => m.id !== currentUser.id).map(m => `<option value="${m.id}" ${m.id === recipientId ? 'selected' : ''}>${esc(m.full_name)}</option>`).join('')}
      </select>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Amount (₹) *</label>
        <input class="form-control font-mono" id="pay-amount" type="number" min="0.01" step="0.01" inputmode="decimal"
          value="${amountPaise ? (amountPaise / 100).toFixed(2) : ''}"
          oninput="loadPayQr(el('pay-recipient').value, paise(this.value))" />
      </div>
      <div class="form-group">
        <label class="form-label">Method *</label>
        <select class="form-control" id="pay-method">
          <option value="upi">UPI</option>
          <option value="cash">Cash</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">UTR / Reference Number</label>
      <input class="form-control" id="pay-ref" type="text" placeholder="Transaction reference (optional)" />
    </div>
    <div class="form-group">
      <label class="form-label">Note</label>
      <input class="form-control" id="pay-note" type="text" placeholder="Optional note" />
    </div>
    <div class="alert alert-info text-sm">
      After clicking "I've Paid", the payment will be <strong>pending confirmation</strong> by the recipient. Your balance will only update after they confirm receipt.
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="submitPayment()">I've Paid →</button>
  `);

  if (recipientId) {
    loadPayQr(recipientId, amountPaise);
  }
}

async function submitPayment() {
  const recipientId = el('pay-recipient').value;
  const amt = parseFloat(el('pay-amount').value);
  const method = el('pay-method').value;
  const ref = el('pay-ref').value.trim();
  const note = el('pay-note').value.trim();
  const errEl = el('pay-error');
  errEl.classList.add('hidden');

  if (!recipientId) {
    errEl.textContent = 'Select a recipient';
    errEl.classList.remove('hidden');
    return;
  }
  if (!amt || amt <= 0) {
    errEl.textContent = 'Enter a valid amount';
    errEl.classList.remove('hidden');
    return;
  }

  try {
    await api('POST', '/settlements', {
      recipient_id: recipientId,
      amount_paise: paise(amt),
      method,
      transaction_reference: ref || null,
      note: note || null,
      expense_share_id: currentPaymentShareId || null,
    });
    closeModal();
    toast('Payment recorded — awaiting recipient confirmation', 'success');
    navigate('repayments');
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  }
}

async function confirmSettlement(id) {
  if (!confirm('Confirm that you received this payment?')) return;
  try {
    await api('POST', '/settlements/' + id + '/confirm');
    toast('Payment confirmed', 'success');
    navigate('repayments');
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function rejectSettlement(id) {
  if (!confirm('Reject this payment claim?')) return;
  try {
    await api('POST', '/settlements/' + id + '/reject');
    toast('Payment rejected', 'success');
    navigate('repayments');
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function cancelSettlement(id) {
  if (!confirm('Cancel this payment claim?')) return;
  try {
    await api('POST', '/settlements/' + id + '/cancel');
    toast('Payment cancelled');
    navigate('repayments');
  } catch (err) {
    toast(err.message, 'error');
  }
}
