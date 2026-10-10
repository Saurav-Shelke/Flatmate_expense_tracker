'use strict';

/**
 * Render Dashboard tab
 * @param {HTMLElement} c - Container element
 */
async function renderDashboard(c) {
  const [balances, settlements] = await Promise.all([
    api('GET', '/balances'),
    api('GET', '/settlements')
  ]);

  const recentSettlements = (settlements || []).slice(0, 5);

  c.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Dashboard</h1>
      <span class="text-muted text-sm">${new Date().toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })}</span>
    </div>

    <div class="stats-grid">
      <div class="card">
        <div class="card-title">My Spending</div>
        <div class="stat-value font-mono">${fmt(balances.personalSpending)}</div>
        <div class="stat-sub">Personal expenses</div>
      </div>
      <div class="card">
        <div class="card-title">Common Share</div>
        <div class="stat-value font-mono">${fmt(balances.commonShare)}</div>
        <div class="stat-sub">My share of common expenses</div>
      </div>
      <div class="card">
        <div class="card-title">Owed to Me</div>
        <div class="stat-value font-mono text-pos">${fmt(balances.owedToMe)}</div>
        <div class="stat-sub">Others owe me</div>
      </div>
      <div class="card">
        <div class="card-title">I Owe</div>
        <div class="stat-value font-mono text-neg">${fmt(balances.owedByMe)}</div>
        <div class="stat-sub">I need to pay back</div>
      </div>
      <div class="card">
        <div class="card-title">Advanced for Others</div>
        <div class="stat-value font-mono">${fmt(balances.advancedForOthers)}</div>
        <div class="stat-sub">Paid on behalf (total)</div>
      </div>
      <div class="card">
        <div class="card-title">Common Paid by Me</div>
        <div class="stat-value font-mono">${fmt(balances.commonPaid)}</div>
        <div class="stat-sub">Common expenses I paid</div>
      </div>
    </div>

    ${balances.owedByMe > 0 && balances.myDebts.length ? `
    <div class="card mb-4">
      <div class="card-title">I Owe — Quick Summary</div>
      ${balances.myDebts.map(d => `
        <div class="balance-row">
          <span>To ${esc(d.creditorName)}</span>
          <div class="flex items-center gap-2">
            <span class="font-mono text-neg font-semibold">${fmt(d.outstanding)}</span>
            <button class="btn btn-primary btn-sm" onclick="openPayModal('${d.creditorId}','',${d.outstanding})">Pay</button>
          </div>
        </div>`).join('')}
    </div>` : ''}

    ${balances.owedToMe > 0 && balances.pairwise.length ? `
    <div class="card mb-4">
      <div class="card-title">Owed to Me — Quick Summary</div>
      ${balances.pairwise.map(p => `
        <div class="balance-row">
          <span>${esc(p.debtorName)} owes me</span>
          <span class="font-mono text-pos font-semibold">${fmt(p.outstanding)}</span>
        </div>`).join('')}
    </div>` : ''}

    <div class="card">
      <div class="card-title" style="margin-bottom:12px;">Recent Settlement Activity</div>
      ${recentSettlements.length === 0 ? '<div class="text-muted text-sm">No recent activity</div>' : `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>From</th>
              <th>To</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${recentSettlements.map(s => `<tr>
              <td>${esc(s.payer_name)}</td>
              <td>${esc(s.recipient_name)}</td>
              <td class="amount-cell font-mono">${fmt(s.amount_paise)}</td>
              <td>${esc(s.method)}</td>
              <td>${badgeHtml(s.status)}</td>
              <td class="text-muted text-sm">${new Date(s.created_at).toLocaleDateString('en-IN')}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`}
    </div>`;
}
