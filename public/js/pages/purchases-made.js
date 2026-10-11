'use strict';

let purchaseItems = [];

/**
 * Render Purchases I Made (on-behalf) tab
 * @param {HTMLElement} c - Container element
 */
async function renderPurchasesMade(c) {
  const purchases = await api('GET', '/purchases/made-by-me');

  c.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Purchases I Made for Others</h1>
      <div class="flex items-center gap-2">
        <button class="btn btn-secondary" onclick="openVoiceAssistant()" title="Voice input with Gemini AI">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
          Voice Add
        </button>
        <button class="btn btn-primary" onclick="openAddPurchaseModal()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add Purchase
        </button>
      </div>
    </div>
    ${purchases.length === 0 ? '<div class="card"><div class="empty">No purchases recorded yet.</div></div>' :
      purchases.map(p => {
        const outstanding = p.amount_paise - p.confirmed_paid_paise;
        const others = (p.items || []).filter(i => i.beneficiary_id !== currentUser.id);
        return `
        <div class="card mb-4">
          <div class="flex items-center" style="justify-content:space-between;margin-bottom:8px;">
            <div>
              <div class="font-semibold">${esc(p.description)}</div>
              <div class="text-muted text-xs">${formatDate(p.expense_date)} · Total: ${fmt(p.amount_paise)}</div>
            </div>
            <div class="text-right">
              <div class="text-sm text-muted">Reimbursable outstanding</div>
              <div class="font-semibold ${outstanding > 0 ? 'text-pos' : 'text-muted'} font-mono">${fmt(Math.max(0, outstanding))}</div>
            </div>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Category</th>
                  <th>Beneficiary</th>
                  <th class="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${(p.items || []).map(i => `<tr>
                  <td>${esc(i.description)}</td>
                  <td class="text-muted text-sm">${esc(i.category_name || '—')}</td>
                  <td>${i.beneficiary_id === currentUser.id ? '<span class="text-muted">Me (personal)</span>' : esc(i.beneficiary_name)}</td>
                  <td class="amount-cell text-right font-mono">${fmt(i.amount_paise)}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
          ${others.length > 0 && outstanding > 0 ? `
          <div style="margin-top:8px;">
            <button class="btn btn-secondary btn-sm" onclick="navigate('repayments')">View Repayments →</button>
          </div>` : ''}
        </div>`;
      }).join('')}`;
}

function openAddPurchaseModal() {
  purchaseItems = [{ desc: '', amount: '', cat: '', benefId: currentUser.id }];
  renderPurchaseModal();
}

function renderPurchaseModal() {
  openModal('Add Purchase on Behalf', `
    <div class="ai-quick-tip-bar" onclick="closeModal(); openVoiceAssistant();">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="16" height="16">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="23"/>
        <line x1="8" y1="23" x2="16" y2="23"/>
      </svg>
      <span>Tired of typing all items? <strong>Tap to speak with Gemini AI</strong></span>
    </div>
    <div id="ob-error" class="alert alert-error hidden"></div>
    <div class="form-group">
      <label class="form-label">Shopping Trip Description *</label>
      <input class="form-control" id="ob-desc" type="text" placeholder="e.g. Big Bazaar run, 10 Oct" />
    </div>
    <div class="form-group">
      <label class="form-label">Date *</label>
      <input class="form-control" id="ob-date" type="date" value="${today()}" />
    </div>
    <div class="form-group">
      <label class="form-label">Notes</label>
      <input class="form-control" id="ob-notes" type="text" placeholder="Optional" />
    </div>
    <div style="border-top:1px solid var(--border);padding-top:12px;margin-top:4px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
        <label class="form-label" style="margin:0;">Line Items *</label>
        <button class="btn btn-secondary btn-sm" onclick="addPurchaseItem()">+ Add Item</button>
      </div>
      <div id="ob-items"></div>
      <div id="ob-summary" style="margin-top:8px;padding:8px 12px;background:var(--surface2);border-radius:4px;font-size:13px;"></div>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="submitPurchase()">Save Purchase</button>
  `);
  renderPurchaseItems();
}

function renderPurchaseItems() {
  const cont = el('ob-items');
  if (!cont) return;
  cont.innerHTML = purchaseItems.map((item, i) => `
    <div class="item-row">
      <div class="item-row-header">
        <span class="item-row-label">Item ${i + 1}</span>
        ${purchaseItems.length > 1 ? `<button class="btn btn-danger btn-sm" onclick="removePurchaseItem(${i})">Remove</button>` : ''}
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Description *</label>
          <input class="form-control" id="ob-item-desc-${i}" type="text" value="${esc(item.desc)}" placeholder="Item name" onchange="updatePurchaseItem(${i},'desc',this.value)" />
        </div>
        <div class="form-group">
          <label class="form-label">Amount (₹) *</label>
          <input class="form-control font-mono" id="ob-item-amt-${i}" type="number" min="0.01" step="0.01" inputmode="decimal" value="${item.amount}" placeholder="0.00" oninput="updatePurchaseItem(${i},'amount',this.value);updatePurchaseSummary()" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Beneficiary *</label>
          <select class="form-control" onchange="updatePurchaseItem(${i},'benefId',this.value)">
            ${members.map(m => `<option value="${m.id}" ${m.id === item.benefId ? 'selected' : ''}>${esc(m.full_name)}${m.id === currentUser.id ? ' (me)' : ''}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Category</label>
          <input class="form-control" list="category-datalist" placeholder="Select or type category..." autocomplete="off"
            value="${esc(item.cat || '')}"
            oninput="updatePurchaseItem(${i},'cat',this.value)" />
        </div>
      </div>
    </div>`).join('');
  updatePurchaseSummary();
}

function updatePurchaseItem(i, field, val) {
  purchaseItems[i][field] = val;
  if (field === 'amount') updatePurchaseSummary();
}

function addPurchaseItem() {
  purchaseItems.push({ desc: '', amount: '', cat: '', benefId: currentUser.id });
  renderPurchaseItems();
}

function removePurchaseItem(i) {
  purchaseItems.splice(i, 1);
  renderPurchaseItems();
}

function updatePurchaseSummary() {
  const s = el('ob-summary');
  if (!s) return;
  const total = purchaseItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const personal = purchaseItems.filter(i => i.benefId === currentUser.id).reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
  const reimbursable = total - personal;
  s.innerHTML = `Total: <strong class="font-mono">${'₹' + total.toFixed(2)}</strong>
    &nbsp;·&nbsp; Personal: <span class="font-mono">${'₹' + personal.toFixed(2)}</span>
    &nbsp;·&nbsp; Reimbursable: <strong class="font-mono text-pos">${'₹' + reimbursable.toFixed(2)}</strong>`;
}

async function submitPurchase() {
  const desc = el('ob-desc').value.trim();
  const date = el('ob-date').value || today();
  const notes = el('ob-notes').value.trim();
  const errEl = el('ob-error');
  errEl.classList.add('hidden');

  if (!desc || !date) {
    errEl.textContent = 'Fill in description and date';
    errEl.classList.remove('hidden');
    return;
  }
  if (purchaseItems.some(i => !i.desc || !i.amount || parseFloat(i.amount) <= 0)) {
    errEl.textContent = 'All items need a description and positive amount';
    errEl.classList.remove('hidden');
    return;
  }

  try {
    const items = await Promise.all(purchaseItems.map(async (i) => {
      const catId = await resolveCategoryInput(i.cat);
      return {
        description: i.desc.trim(),
        amount_paise: paise(parseFloat(i.amount)),
        category_id: catId || null,
        beneficiary_id: i.benefId,
      };
    }));

    await api('POST', '/purchases', {
      description: desc,
      expense_date: date,
      notes: notes || null,
      items,
    });
    closeModal();
    toast('Purchase recorded', 'success');
    navigate('purchases-made');
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  }
}
