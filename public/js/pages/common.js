'use strict';

let commonShares = [];

/**
 * Render Common Expenses tab
 * @param {HTMLElement} c - Container element
 */
async function renderCommon(c) {
  const expenses = await api('GET', '/expenses?type=common&limit=50');

  c.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Common Expenses</h1>
      ${currentUser.role === 'admin' ? `<button class="btn btn-primary" onclick="openAddCommonModal()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        Add Common Expense
      </button>` : '<span class="text-muted text-sm">Admin adds common expenses</span>'}
    </div>
    <div class="card">
      ${expenses.length === 0 ? '<div class="empty">No common expenses recorded yet.</div>' : `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th>Paid By</th>
              <th>Split</th>
              <th class="text-right">Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${expenses.map(e => `<tr>
              <td class="text-muted text-sm">${formatDate(e.expense_date)}</td>
              <td>${esc(e.description)}</td>
              <td class="text-muted text-sm">${esc(e.category_name || '—')}</td>
              <td>${esc(e.paid_by_name)}</td>
              <td class="text-muted text-sm">${esc(e.split_method || '—')}</td>
              <td class="amount-cell text-right font-mono font-semibold">${fmt(e.amount_paise)}</td>
              <td class="text-right">
                <button class="btn btn-secondary btn-sm" onclick="viewCommonExpense('${e.id}')">View</button>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`}
    </div>`;
}

async function viewCommonExpense(id) {
  const exp = await api('GET', '/expenses/' + id);
  const sharesHtml = (exp.shares || []).map(s => `
    <div class="split-preview-row">
      <span>${esc(s.full_name)}</span>
      <span class="font-mono">${fmt(s.amount_paise)}</span>
    </div>`).join('');

  openModal(esc(exp.description), `
    <div class="text-muted text-sm mb-4">${formatDate(exp.expense_date)} · Paid by ${esc(exp.paid_by_name)} · ${esc(exp.split_method)}</div>
    <div class="card-title">Amount Shares</div>
    ${sharesHtml}
    ${exp.notes ? `<div class="text-muted text-sm mt-4">Notes: ${esc(exp.notes)}</div>` : ''}
  `, `<button class="btn btn-secondary" onclick="closeModal()">Close</button>`);
}

async function openAddCommonModal() {
  commonShares = members.map(m => ({ userId: m.id, name: m.full_name, amount: 0, included: true }));
  renderCommonModal();
}

function renderCommonModal() {
  openModal('Add Common Expense', `
    <div id="ce-error" class="alert alert-error hidden"></div>
    <div class="form-group">
      <label class="form-label">Description *</label>
      <input class="form-control" id="ce-desc" type="text" placeholder="e.g. Electricity bill — October" />
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Total Amount (₹) *</label>
        <input class="form-control font-mono" id="ce-amount" type="number" min="0.01" step="0.01" inputmode="decimal" placeholder="0.00" oninput="computeCommonSplit()" />
      </div>
      <div class="form-group">
        <label class="form-label">Date *</label>
        <input class="form-control" id="ce-date" type="date" value="${today()}" />
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Paid By *</label>
        <select class="form-control" id="ce-paidby">${memberOptions(currentUser.id)}</select>
      </div>
      <div class="form-group">
        <label class="form-label">Category</label>
        <input class="form-control" id="ce-cat" list="category-datalist" placeholder="Select or type a category..." autocomplete="off" />
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Split Method *</label>
      <select class="form-control" id="ce-split" onchange="computeCommonSplit()">
        <option value="equal">Equal</option>
        <option value="custom">Custom Amounts</option>
        <option value="percentage">Percentage</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Participants</label>
      <div id="ce-participants"></div>
    </div>
    <div id="ce-split-inputs"></div>
    <div id="ce-split-summary" style="margin-top:8px;padding:8px 12px;background:var(--surface2);border-radius:4px;font-size:13px;"></div>
    <div class="form-group mt-2">
      <label class="form-label">Notes</label>
      <input class="form-control" id="ce-notes" type="text" placeholder="Optional" />
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="submitCommonExpense()">Save</button>
  `);
  renderCommonParticipants();
  computeCommonSplit();
}

function renderCommonParticipants() {
  const cont = el('ce-participants');
  if (!cont) return;
  cont.innerHTML = commonShares.map((s, i) => `
    <label style="display:inline-flex;align-items:center;gap:6px;margin-right:12px;font-size:13px;cursor:pointer;">
      <input type="checkbox" ${s.included ? 'checked' : ''} onchange="commonShares[${i}].included=this.checked;computeCommonSplit()" />
      ${esc(s.name)}
    </label>`).join('');
}

function computeCommonSplit() {
  const method = el('ce-split') ? el('ce-split').value : 'equal';
  const totalRupees = parseFloat(el('ce-amount') ? el('ce-amount').value : 0) || 0;
  const totalPaise = paise(totalRupees);
  const included = commonShares.filter(s => s.included);
  const splitInputsCont = el('ce-split-inputs');
  const summary = el('ce-split-summary');

  if (!splitInputsCont) return;

  if (method === 'equal') {
    if (included.length > 0 && totalPaise > 0) {
      const base = Math.floor(totalPaise / included.length);
      let remainder = totalPaise - base * included.length;
      for (const s of commonShares) {
        if (s.included) {
          s.amount = base + (remainder-- > 0 ? 1 : 0);
        } else {
          s.amount = 0;
        }
      }
    } else {
      commonShares.forEach(s => s.amount = 0);
    }
    splitInputsCont.innerHTML = '';
    if (summary) {
      const per = included.length > 0 ? (totalPaise / included.length).toFixed(0) : 0;
      summary.innerHTML = `Equal split: ~${fmt(per)} per person among ${included.length} members`;
    }
  } else if (method === 'custom') {
    splitInputsCont.innerHTML = `<div class="card-title" style="margin-bottom:8px;">Custom Amounts (₹)</div>` +
      included.map(s => {
        const globalIdx = commonShares.indexOf(s);
        return `<div class="form-row" style="margin-bottom:4px;">
          <label class="form-label" style="align-self:center;">${esc(s.name)}</label>
          <input class="form-control font-mono" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0.00"
            value="${s.amount ? (s.amount / 100).toFixed(2) : ''}"
            oninput="commonShares[${globalIdx}].amount=paise(parseFloat(this.value)||0);updateCustomSummary()" />
        </div>`;
      }).join('');
    updateCustomSummary();
  } else if (method === 'percentage') {
    splitInputsCont.innerHTML = `<div class="card-title" style="margin-bottom:8px;">Percentages (must total 100%)</div>` +
      included.map(s => {
        const globalIdx = commonShares.indexOf(s);
        return `<div class="form-row" style="margin-bottom:4px;">
          <label class="form-label" style="align-self:center;">${esc(s.name)}</label>
          <input class="form-control font-mono" type="number" min="0" max="100" step="0.01" placeholder="0"
            oninput="updatePercentageSplit(${globalIdx}, parseFloat(this.value)||0)" />
        </div>`;
      }).join('');
    if (summary) summary.textContent = '';
  }
}

function updateCustomSummary() {
  const totalPaise = paise(parseFloat(el('ce-amount') ? el('ce-amount').value : 0) || 0);
  const allocated = commonShares.filter(s => s.included).reduce((sum, s) => sum + s.amount, 0);
  const diff = totalPaise - allocated;
  const s = el('ce-split-summary');
  if (!s) return;
  s.innerHTML = `Allocated: ${fmt(allocated)} / ${fmt(totalPaise)}
    ${diff !== 0 ? `&nbsp;· <span class="text-neg">${diff > 0 ? 'Remaining: ' : 'Over by: '}${fmt(Math.abs(diff))}</span>` : '&nbsp;· <span class="text-pos">✓ Balanced</span>'}`;
}

function updatePercentageSplit(globalIdx, pct) {
  const totalPaise = paise(parseFloat(el('ce-amount') ? el('ce-amount').value : 0) || 0);
  commonShares[globalIdx].pct = pct;
  const included = commonShares.filter(s => s.included);
  const totalPct = included.reduce((sum, s) => sum + (s.pct || 0), 0);

  const base = included.map(s => ({ s, amtF: totalPaise * (s.pct || 0) / 100 }));
  base.forEach(b => { b.s.amount = Math.floor(b.amtF); });
  let remainder = totalPaise - base.reduce((sum, b) => sum + b.s.amount, 0);

  base.sort((a, b) => (b.amtF % 1) - (a.amtF % 1));
  for (let i = 0; i < remainder; i++) {
    base[i].s.amount++;
  }
  const s = el('ce-split-summary');
  if (!s) return;
  s.innerHTML = `Percentages total: <strong>${totalPct.toFixed(2)}%</strong>
    ${Math.abs(totalPct - 100) < 0.01 ? '&nbsp;· <span class="text-pos">✓ Balanced</span>' : `&nbsp;· <span class="text-neg">Must total 100%</span>`}`;
}

async function submitCommonExpense() {
  const desc = el('ce-desc').value.trim();
  const amt = parseFloat(el('ce-amount').value);
  const date = el('ce-date').value || today();
  const paidBy = el('ce-paidby').value;
  const method = el('ce-split').value;
  const catInput = el('ce-cat').value.trim();
  const notes = el('ce-notes').value.trim();
  const errEl = el('ce-error');
  errEl.classList.add('hidden');

  if (!desc || !amt || !date || !paidBy) {
    errEl.textContent = 'Fill in required fields';
    errEl.classList.remove('hidden');
    return;
  }

  const totalPaise = paise(amt);
  const shareList = commonShares
    .filter(s => s.included && s.amount > 0)
    .map(s => ({ user_id: s.userId, amount_paise: s.amount }));
  const shareTotal = shareList.reduce((sum, s) => sum + s.amount_paise, 0);

  if (shareTotal !== totalPaise) {
    errEl.textContent = `Share total (${fmt(shareTotal)}) must equal expense (${fmt(totalPaise)}). Check allocations.`;
    errEl.classList.remove('hidden');
    return;
  }
  if (shareList.length === 0) {
    errEl.textContent = 'At least one participant required';
    errEl.classList.remove('hidden');
    return;
  }

  try {
    const catId = await resolveCategoryInput(catInput);

    await api('POST', '/expenses/common', {
      description: desc,
      amount_paise: totalPaise,
      category_id: catId || null,
      expense_date: date,
      paid_by: paidBy,
      split_method: method,
      notes: notes || null,
      shares: shareList,
    });
    closeModal();
    toast('Common expense added', 'success');
    navigate('common');
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  }
}
