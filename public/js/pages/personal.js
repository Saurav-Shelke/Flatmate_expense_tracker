'use strict';

/**
 * Render My Personal Expenses tab
 * @param {HTMLElement} c - Container element
 */
async function renderPersonal(c) {
  const expenses = await api('GET', '/expenses?type=personal&limit=50');

  c.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">My Personal Expenses</h1>
      <button class="btn btn-primary" onclick="openAddPersonalModal()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        Add Expense
      </button>
    </div>
    <div class="card">
      ${expenses.length === 0 ? '<div class="empty">No personal expenses yet.</div>' : `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th class="text-right">Amount</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${expenses.map(e => `<tr>
              <td class="text-muted text-sm">${e.expense_date}</td>
              <td>
                ${esc(e.description)}
                ${e.notes ? `<br><span class="text-xs text-muted">${esc(e.notes)}</span>` : ''}
              </td>
              <td class="text-muted text-sm">${esc(e.category_name || '—')}</td>
              <td class="amount-cell text-right font-mono font-semibold">${fmt(e.amount_paise)}</td>
              <td class="text-right">
                <button class="btn btn-secondary btn-sm" onclick="deletePersonalExpense('${e.id}')">Delete</button>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`}
    </div>`;
}

function openAddPersonalModal() {
  openModal('Add Personal Expense', `
    <div id="pe-error" class="alert alert-error hidden"></div>
    <div class="form-group">
      <label class="form-label">Description *</label>
      <input class="form-control" id="pe-desc" type="text" placeholder="What did you spend on?" />
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Amount (₹) *</label>
        <input class="form-control font-mono" id="pe-amount" type="number" min="0.01" step="0.01" inputmode="decimal" placeholder="0.00" />
      </div>
      <div class="form-group">
        <label class="form-label">Date *</label>
        <input class="form-control" id="pe-date" type="date" value="${today()}" />
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Category</label>
      <input class="form-control" id="pe-cat" list="category-datalist" placeholder="Select or type a category..." autocomplete="off" />
    </div>
    <div class="form-group">
      <label class="form-label">Notes</label>
      <input class="form-control" id="pe-notes" type="text" placeholder="Optional notes" />
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="submitPersonalExpense()">Save</button>
  `);
}

async function submitPersonalExpense() {
  const desc = el('pe-desc').value.trim();
  const amt = parseFloat(el('pe-amount').value);
  const date = el('pe-date').value;
  const catInput = el('pe-cat').value.trim();
  const notes = el('pe-notes').value.trim();

  const errEl = el('pe-error');
  errEl.classList.add('hidden');

  if (!desc || !amt || !date) {
    errEl.textContent = 'Fill in required fields';
    errEl.classList.remove('hidden');
    return;
  }
  if (amt <= 0) {
    errEl.textContent = 'Amount must be positive';
    errEl.classList.remove('hidden');
    return;
  }

  try {
    const catId = await resolveCategoryInput(catInput);

    await api('POST', '/expenses/personal', {
      description: desc,
      amount_paise: paise(amt),
      category_id: catId || null,
      expense_date: date,
      notes: notes || null,
    });
    closeModal();
    toast('Expense added', 'success');
    navigate('personal');
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  }
}

async function deletePersonalExpense(id) {
  if (!confirm('Delete this expense?')) return;
  try {
    await api('DELETE', '/expenses/' + id);
    toast('Deleted', 'success');
    navigate('personal');
  } catch (err) {
    toast(err.message, 'error');
  }
}
