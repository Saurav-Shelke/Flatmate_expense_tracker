'use strict';

/**
 * Render My Balances tab
 * @param {HTMLElement} c - Container element
 */
async function renderBalances(c) {
  const b = await api('GET', '/balances');

  c.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">My Balances</h1>
    </div>
    <div class="stats-grid">
      <div class="card">
        <div class="card-title">Personal Spending</div>
        <div class="stat-value font-mono">${fmt(b.personalSpending)}</div>
      </div>
      <div class="card">
        <div class="card-title">Common Share (my portion)</div>
        <div class="stat-value font-mono">${fmt(b.commonShare)}</div>
      </div>
      <div class="card">
        <div class="card-title">Advanced for Others</div>
        <div class="stat-value font-mono">${fmt(b.advancedForOthers)}</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;" class="mb-4">
      <div class="card">
        <div class="card-title" style="margin-bottom:12px;">They Owe Me</div>
        ${(b.pairwise || []).length === 0 ? '<div class="text-muted text-sm">No outstanding receivables</div>' :
          b.pairwise.map(p => `
          <div class="balance-row">
            <div>
              <div class="font-semibold">${esc(p.debtorName)}</div>
              <div class="text-xs text-muted">Total: ${fmt(p.grossOwed)} · Paid: ${fmt(p.confirmedPaid)}</div>
            </div>
            <div class="font-mono font-semibold text-pos">${fmt(p.outstanding)}</div>
          </div>`).join('')}
        ${(b.pairwise || []).length > 0 ? `<div class="split-preview-row" style="margin-top:8px;font-weight:600;">
          <span>Total Owed to Me</span>
          <span class="font-mono text-pos">${fmt(b.owedToMe)}</span>
        </div>` : ''}
      </div>
      <div class="card">
        <div class="card-title" style="margin-bottom:12px;">I Owe</div>
        ${(b.myDebts || []).length === 0 ? '<div class="text-muted text-sm">No outstanding debts</div>' :
          b.myDebts.map(d => `
          <div class="balance-row">
            <div>
              <div class="font-semibold">${esc(d.creditorName)}</div>
              <div class="text-xs text-muted">Total: ${fmt(d.grossOwe)} · Paid: ${fmt(d.confirmedPaid)}</div>
            </div>
            <div class="flex items-center gap-2">
              <span class="font-mono font-semibold text-neg">${fmt(d.outstanding)}</span>
              <button class="btn btn-primary btn-sm" onclick="openPayModal('${d.creditorId}','',${d.outstanding})">Pay</button>
            </div>
          </div>`).join('')}
        ${(b.myDebts || []).length > 0 ? `<div class="split-preview-row" style="margin-top:8px;font-weight:600;">
          <span>Total I Owe</span>
          <span class="font-mono text-neg">${fmt(b.owedByMe)}</span>
        </div>` : ''}
      </div>
    </div>`;
}
