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
      <div>
        <h1 class="page-title">Dashboard</h1>
        <span class="text-muted text-sm">${new Date().toLocaleDateString('en-IN', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })}</span>
      </div>
      <button class="btn btn-primary btn-voice-header" onclick="openVoiceAssistant()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" width="16" height="16">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
        Voice Add Expense
      </button>
    </div>

    <!-- AI Voice Hero Banner -->
    <div class="card mb-4 voice-hero-banner" onclick="openVoiceAssistant()">
      <div class="voice-hero-left">
        <div class="voice-hero-mic-circle">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="22" height="22">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        </div>
        <div>
          <div class="voice-hero-title">
            <span>Speak to Log Expenses</span>
            <span class="voice-hero-badge">Gemini AI</span>
          </div>
          <div class="voice-hero-sub">“Paid 450 for groceries split with everyone” · “Medicine for Rahul 250”</div>
        </div>
      </div>
      <div class="voice-hero-right">
        <span class="btn btn-sm btn-primary">Tap to Speak</span>
      </div>
    </div>

    ${window.currentUser?.mustChangePassword ? `
    <div class="card mb-4" style="background:linear-gradient(135deg,rgba(245,158,11,0.12) 0%,rgba(217,119,6,0.06) 100%);border:1px solid rgba(245,158,11,0.35);padding:14px 18px;border-radius:var(--radius);">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:36px;height:36px;border-radius:10px;background:rgba(245,158,11,0.2);display:flex;align-items:center;justify-content:center;color:#fbbf24;flex-shrink:0;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="20" height="20">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
          </div>
          <div>
            <div style="font-weight:700;color:#fbbf24;font-size:14px;">Action Required: Update Initial Password</div>
            <div style="color:var(--text);font-size:13px;margin-top:2px;">You are currently logged in with default credentials. Please set your new password.</div>
          </div>
        </div>
        <button class="btn btn-sm btn-primary" onclick="showChangePwModal()" style="font-weight:600;padding:8px 16px;">Change Password Now</button>
      </div>
    </div>
    ` : ''}

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
