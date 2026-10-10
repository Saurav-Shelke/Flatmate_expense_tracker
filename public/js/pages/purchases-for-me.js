'use strict';

/**
 * Render Purchases Made for Me tab
 * @param {HTMLElement} c - Container element
 */
async function renderPurchasesForMe(c) {
  const purchases = await api('GET', '/purchases/made-for-me');

  c.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Purchases Made for Me</h1>
    </div>
    ${purchases.length === 0 ? '<div class="card"><div class="empty">No one has made purchases for you yet.</div></div>' :
      purchases.map(p => {
        const outstanding = p.my_total_paise - p.my_confirmed_paise;
        return `
        <div class="card mb-4">
          <div class="flex items-center" style="justify-content:space-between;margin-bottom:8px;">
            <div>
              <div class="font-semibold">${esc(p.description)}</div>
              <div class="text-muted text-xs">${formatDate(p.expense_date)} · Paid by ${esc(p.paid_by_name)}</div>
            </div>
            <div class="text-right">
              <div class="text-sm text-muted">I owe</div>
              <div class="font-semibold ${outstanding > 0 ? 'text-neg' : 'text-muted'} font-mono">${fmt(Math.max(0, outstanding))}</div>
            </div>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Category</th>
                  <th class="text-right">My Share</th>
                </tr>
              </thead>
              <tbody>
                ${(p.my_items || []).map(i => `<tr>
                  <td>${esc(i.description)}</td>
                  <td class="text-muted text-sm">${esc(i.category_name || '—')}</td>
                  <td class="amount-cell text-right font-mono">${fmt(i.my_share)}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
          <div class="flex items-center gap-2" style="margin-top:8px;">
            <span class="text-sm text-muted">Total I owe: <strong class="font-mono">${fmt(p.my_total_paise)}</strong> · Paid: <strong class="font-mono">${fmt(p.my_confirmed_paise)}</strong></span>
            ${outstanding > 0 ? `<button class="btn btn-primary btn-sm" onclick="openPayModal('${p.paid_by}','',${outstanding})">Pay ${fmt(outstanding)}</button>` : `<span class="badge badge-confirmed">Settled</span>`}
          </div>
        </div>`;
      }).join('')}`;
}
