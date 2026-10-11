'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// VOICE ASSISTANT COMPONENT (Powered by Google Gemini AI)
// ─────────────────────────────────────────────────────────────────────────────

let recognition = null;
let isListening = false;
let currentVoiceTranscript = '';
let lastParsedExpense = null;

/**
 * Check if the browser supports Speech Recognition
 */
function isSpeechSupported() {
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/**
 * Initialize Speech Recognition instance
 */
function initSpeechRecognition() {
  const SpeechClass = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechClass) return null;

  try {
    const rec = new SpeechClass();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'en-IN'; // Optimized for Indian English names and accent

    rec.onstart = () => {
      isListening = true;
      updateVoiceModalState('listening');
    };

    rec.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        if (item.isFinal) {
          final += item[0].transcript;
        } else {
          interim += item[0].transcript;
        }
      }

      const text = (final || interim).trim();
      if (text) {
        currentVoiceTranscript = text;
        const transcriptEl = el('voice-transcript-text');
        if (transcriptEl) transcriptEl.value = text;
      }
    };

    rec.onerror = (event) => {
      console.warn('[Voice Recognition Error]', event.error);
      isListening = false;
      const statusEl = el('voice-status-text');
      if (statusEl) {
        if (event.error === 'not-allowed') {
          statusEl.textContent = 'Microphone access denied. You can type below instead.';
        } else if (event.error === 'no-speech') {
          statusEl.textContent = 'No speech detected. Tap mic to try again.';
        } else {
          statusEl.textContent = `Speech error (${event.error}). You can type below.`;
        }
      }
      updateVoiceModalState('idle');
    };

    rec.onend = () => {
      isListening = false;
      // If we captured spoken text, auto-parse or show ready state
      if (currentVoiceTranscript && currentVoiceTranscript.trim().length > 3) {
        updateVoiceModalState('ready-to-parse');
      } else {
        updateVoiceModalState('idle');
      }
    };

    return rec;
  } catch (err) {
    console.warn('[Speech Recognition Init Failed]', err);
    return null;
  }
}

/**
 * Open the Voice Assistant modal
 * @param {string} [initialText='']
 */
function openVoiceAssistant(initialText = '') {
  currentVoiceTranscript = initialText || '';
  lastParsedExpense = null;

  const modalBackdrop = el('voice-modal-backdrop');
  if (!modalBackdrop) return;

  modalBackdrop.classList.remove('hidden');

  const transcriptInput = el('voice-transcript-text');
  if (transcriptInput) transcriptInput.value = currentVoiceTranscript;

  // Initialize or check speech recognition
  if (!recognition) {
    recognition = initSpeechRecognition();
  }

  // Switch to input/recording screen
  el('voice-step-record').classList.remove('hidden');
  el('voice-step-review').classList.add('hidden');

  if (initialText) {
    updateVoiceModalState('ready-to-parse');
  } else {
    updateVoiceModalState('idle');
    // Start listening automatically on click for effortless 1-tap UX
    startVoiceRecording();
  }
}

/**
 * Close the Voice Assistant modal
 */
function closeVoiceAssistant() {
  stopVoiceRecording();
  const modalBackdrop = el('voice-modal-backdrop');
  if (modalBackdrop) modalBackdrop.classList.add('hidden');
}

/**
 * Start speech listening
 */
function startVoiceRecording() {
  if (isListening) return;

  if (!recognition) {
    recognition = initSpeechRecognition();
  }

  if (!recognition) {
    const statusEl = el('voice-status-text');
    if (statusEl) {
      statusEl.textContent = 'Voice recognition is not supported in this browser. Please type below.';
    }
    updateVoiceModalState('idle');
    return;
  }

  try {
    currentVoiceTranscript = '';
    const transcriptEl = el('voice-transcript-text');
    if (transcriptEl) transcriptEl.value = '';

    recognition.start();
  } catch (err) {
    console.debug('[Voice start error]', err);
    // If recognition was already started, stop and restart
    try {
      recognition.stop();
      setTimeout(() => recognition.start(), 200);
    } catch {
      // Ignore
    }
  }
}

/**
 * Stop speech listening
 */
function stopVoiceRecording() {
  if (recognition && isListening) {
    try {
      recognition.stop();
    } catch {
      // Ignore
    }
  }
  isListening = false;
}

/**
 * Update the UI visual state of the voice recording modal
 * @param {'idle' | 'listening' | 'ready-to-parse' | 'processing'} state
 */
function updateVoiceModalState(state) {
  const micBtn = el('voice-mic-btn');
  const micRipple = el('voice-mic-ripple');
  const statusEl = el('voice-status-text');
  const parseBtn = el('voice-parse-btn');
  const soundWave = el('voice-soundwave');

  if (!micBtn) return;

  switch (state) {
    case 'listening':
      micBtn.classList.add('is-listening');
      if (micRipple) micRipple.classList.remove('hidden');
      if (soundWave) soundWave.classList.remove('hidden');
      if (statusEl) statusEl.textContent = 'Listening... Speak naturally (English or Hinglish)';
      if (parseBtn) {
        parseBtn.disabled = true;
        parseBtn.textContent = 'Listening…';
      }
      break;

    case 'processing':
      micBtn.classList.remove('is-listening');
      if (micRipple) micRipple.classList.add('hidden');
      if (soundWave) soundWave.classList.add('hidden');
      if (statusEl) statusEl.textContent = 'Gemini AI is analyzing your expense...';
      if (parseBtn) {
        parseBtn.disabled = true;
        parseBtn.innerHTML = '<span class="loading-spinner-inline"></span> Analyzing with Gemini…';
      }
      break;

    case 'ready-to-parse':
      micBtn.classList.remove('is-listening');
      if (micRipple) micRipple.classList.add('hidden');
      if (soundWave) soundWave.classList.add('hidden');
      if (statusEl) statusEl.textContent = 'Voice captured! Tap below to analyze with AI, or edit text.';
      if (parseBtn) {
        parseBtn.disabled = false;
        parseBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="16" height="16">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
          Parse with Gemini AI
        `;
      }
      break;

    case 'idle':
    default:
      micBtn.classList.remove('is-listening');
      if (micRipple) micRipple.classList.add('hidden');
      if (soundWave) soundWave.classList.add('hidden');
      if (statusEl) {
        statusEl.textContent = currentVoiceTranscript
          ? 'Tap mic to record again or click "Parse with Gemini AI"'
          : 'Tap microphone to speak your expense';
      }
      if (parseBtn) {
        const hasText = Boolean(currentVoiceTranscript && currentVoiceTranscript.trim());
        parseBtn.disabled = !hasText;
        parseBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="16" height="16">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
          Parse with Gemini AI
        `;
      }
      break;
  }
}

/**
 * Send transcript to Gemini AI backend
 */
async function submitVoiceTranscriptForParsing() {
  stopVoiceRecording();

  const transcriptInput = el('voice-transcript-text');
  const text = transcriptInput ? transcriptInput.value.trim() : currentVoiceTranscript.trim();

  if (!text) {
    toast('Please speak or type an expense first', 'error');
    return;
  }

  updateVoiceModalState('processing');

  try {
    const res = await api('POST', '/ai/parse-expense', {
      transcript: text,
      clientDate: today(),
    });

    if (!res || !res.parsed) {
      throw new Error(res.error || 'Could not parse expense details.');
    }

    lastParsedExpense = res.parsed;
    renderSmartReview(res.parsed, text);
  } catch (err) {
    console.error('[Voice Parsing Error]', err);
    toast(err.message || 'Gemini parsing failed. Please try again.', 'error');
    updateVoiceModalState('ready-to-parse');
  }
}

/**
 * Render the AI Smart Review Screen
 * @param {object} p - Parsed expense object
 * @param {string} originalTranscript
 */
function renderSmartReview(p, originalTranscript) {
  el('voice-step-record').classList.add('hidden');
  el('voice-step-review').classList.remove('hidden');

  const typeLabels = {
    personal:  'Personal Expense',
    on_behalf: 'Purchase for Flatmate(s)',
    common:    'Common Shared Expense',
  };

  const typeBadges = {
    personal:  'badge-personal',
    on_behalf: 'badge-on-behalf',
    common:    'badge-common',
  };

  const currentType = p.expense_type || 'personal';
  const amountRupeesVal = (p.amount_paise / 100).toFixed(2);

  // Render HTML for splits or items
  let dynamicSectionHtml = '';

  if (currentType === 'on_behalf') {
    const items = p.items || [];
    dynamicSectionHtml = `
      <div class="ai-review-section">
        <div class="ai-section-title">Itemized Purchases for Flatmates</div>
        <div class="ai-items-list" id="ai-items-container">
          ${items.map((it, idx) => `
            <div class="ai-item-row" data-item-idx="${idx}">
              <div class="form-group mb-0" style="flex:2;">
                <label class="form-label text-xs">Item Description</label>
                <input class="form-control form-control-sm" id="ai-item-desc-${idx}" value="${esc(it.description)}" />
              </div>
              <div class="form-group mb-0" style="flex:2;">
                <label class="form-label text-xs">Beneficiary</label>
                <select class="form-control form-control-sm" id="ai-item-ben-${idx}">
                  ${members.map(m => `
                    <option value="${m.id}" ${m.id === it.beneficiary_id ? 'selected' : ''}>
                      ${esc(m.full_name)}
                    </option>`).join('')}
                </select>
              </div>
              <div class="form-group mb-0" style="flex:1.5;">
                <label class="form-label text-xs">Amount (₹)</label>
                <input class="form-control form-control-sm font-mono text-right" id="ai-item-amt-${idx}" type="number" step="0.01" value="${rupees(it.amount_paise)}" onchange="recalculateAiOnBehalfTotal()" />
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } else if (currentType === 'common') {
    const shares = p.shares || [];
    dynamicSectionHtml = `
      <div class="ai-review-section">
        <div class="flex items-center justify-between mb-2">
          <div class="ai-section-title mb-0">Flatmate Shares (${p.split_method === 'equal' ? 'Equal Split' : 'Custom Split'})</div>
          <span class="text-xs text-muted">Paid by: ${esc(p.paid_by_name || currentUser.fullName)}</span>
        </div>
        <div class="ai-shares-list" id="ai-shares-container">
          ${shares.map((sh, idx) => `
            <div class="ai-share-row">
              <span class="ai-share-name">${esc(sh.user_name)}</span>
              <span class="font-mono font-semibold text-sm">${fmt(sh.amount_paise)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } else {
    dynamicSectionHtml = `
      <div class="ai-personal-notice">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
        <span>This is your personal expense. It will only be tracked in your personal spending.</span>
      </div>
    `;
  }

  el('voice-step-review').innerHTML = `
    <div class="ai-review-header">
      <div class="flex items-center gap-2">
        <span class="badge ${typeBadges[currentType] || 'badge-personal'}">${typeLabels[currentType] || 'Expense'}</span>
        <span class="text-xs text-muted flex items-center gap-1">
          <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12" style="color:#60a5fa;">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
          </svg>
          Gemini Parsed
        </span>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="backToVoiceRecording()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
          <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
        </svg>
        Re-speak
      </button>
    </div>

    <div class="ai-original-quote">
      <span class="text-muted text-xs">“${esc(originalTranscript)}”</span>
    </div>

    <div id="ai-review-error" class="alert alert-error hidden"></div>

    <div class="form-group">
      <label class="form-label">Expense Description *</label>
      <input class="form-control" id="ai-desc" value="${esc(p.description || '')}" />
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Total Amount (₹) *</label>
        <input class="form-control font-mono font-semibold" id="ai-amount" type="number" step="0.01" min="0.01" value="${amountRupeesVal}" />
      </div>
      <div class="form-group">
        <label class="form-label">Date *</label>
        <input class="form-control" id="ai-date" type="date" value="${p.expense_date || today()}" />
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Category</label>
        <input class="form-control" id="ai-category" list="category-datalist" value="${esc(p.category || 'General')}" autocomplete="off" />
      </div>
      <div class="form-group">
        <label class="form-label">Expense Type</label>
        <select class="form-control" id="ai-type-select" onchange="changeAiExpenseType(this.value)">
          <option value="personal" ${currentType === 'personal' ? 'selected' : ''}>Personal</option>
          <option value="on_behalf" ${currentType === 'on_behalf' ? 'selected' : ''}>Purchase for Flatmates</option>
          <option value="common" ${currentType === 'common' ? 'selected' : ''}>Common Shared</option>
        </select>
      </div>
    </div>

    ${dynamicSectionHtml}

    <div class="form-group mt-3">
      <label class="form-label">Notes (Optional)</label>
      <input class="form-control" id="ai-notes" placeholder="Optional notes" value="${esc(p.notes || '')}" />
    </div>

    <div class="modal-footer" style="padding:16px 0 0 0;border-top:1px solid var(--border);margin-top:16px;">
      <button class="btn btn-secondary" onclick="closeVoiceAssistant()">Cancel</button>
      <button class="btn btn-primary" id="ai-save-btn" onclick="saveParsedAiExpense()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Confirm &amp; Save Expense
      </button>
    </div>
  `;
}

/**
 * Return from review step back to recording step
 */
function backToVoiceRecording() {
  el('voice-step-review').classList.add('hidden');
  el('voice-step-record').classList.remove('hidden');
  updateVoiceModalState('idle');
}

/**
 * Handle user switching expense type manually in review card
 */
function changeAiExpenseType(newType) {
  if (!lastParsedExpense) return;
  lastParsedExpense.expense_type = newType;
  renderSmartReview(lastParsedExpense, el('voice-transcript-text').value);
}

/**
 * Recalculate on_behalf total from individual item inputs
 */
function recalculateAiOnBehalfTotal() {
  const container = el('ai-items-container');
  if (!container) return;

  const itemRows = container.querySelectorAll('.ai-item-row');
  let total = 0;
  itemRows.forEach((row, idx) => {
    const amtEl = el(`ai-item-amt-${idx}`);
    if (amtEl) {
      total += parseFloat(amtEl.value) || 0;
    }
  });

  const mainAmountEl = el('ai-amount');
  if (mainAmountEl && total > 0) {
    mainAmountEl.value = total.toFixed(2);
  }
}

/**
 * Save the verified AI expense into PostgreSQL database
 */
async function saveParsedAiExpense() {
  const saveBtn = el('ai-save-btn');
  const errEl = el('ai-review-error');
  if (errEl) errEl.classList.add('hidden');

  const desc = el('ai-desc').value.trim();
  const amtVal = parseFloat(el('ai-amount').value);
  const date = el('ai-date').value;
  const catInput = el('ai-category').value.trim();
  const notes = el('ai-notes').value.trim();
  const type = el('ai-type-select').value;

  if (!desc || isNaN(amtVal) || amtVal <= 0 || !date) {
    if (errEl) {
      errEl.textContent = 'Please provide a valid description, amount, and date.';
      errEl.classList.remove('hidden');
    }
    return;
  }

  const amountPaise = paise(amtVal);

  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="loading-spinner-inline"></span> Saving…';
  }

  try {
    const categoryId = await resolveCategoryInput(catInput);

    if (type === 'personal') {
      await api('POST', '/expenses/personal', {
        description: desc,
        amount_paise: amountPaise,
        category_id: categoryId || null,
        expense_date: date,
        notes: notes || null,
      });
    } else if (type === 'on_behalf') {
      // Build items array from UI
      const container = el('ai-items-container');
      const itemRows = container ? container.querySelectorAll('.ai-item-row') : [];
      let items = [];

      if (itemRows.length > 0) {
        itemRows.forEach((row, idx) => {
          const itemDesc = (el(`ai-item-desc-${idx}`)?.value || desc).trim();
          const benId = el(`ai-item-ben-${idx}`)?.value;
          const itemAmt = parseFloat(el(`ai-item-amt-${idx}`)?.value || '0');
          if (benId && itemAmt > 0) {
            items.push({
              description: itemDesc,
              beneficiary_id: benId,
              amount_paise: paise(itemAmt),
              category: catInput || 'General',
            });
          }
        });
      }

      // If no valid items parsed from inputs, default to 1 item for current user or first flatmate
      if (items.length === 0) {
        items = [{
          description: desc,
          beneficiary_id: currentUser.id,
          amount_paise: amountPaise,
          category: catInput || 'General',
        }];
      }

      await api('POST', '/purchases', {
        description: desc,
        expense_date: date,
        notes: notes || null,
        items,
      });
    } else if (type === 'common') {
      // Common expense
      const rawShares = lastParsedExpense?.shares || [];
      let shares = [];

      if (rawShares.length > 0) {
        shares = rawShares.map(s => ({
          user_id: s.user_id,
          amount_paise: s.amount_paise,
        }));
      } else {
        // Equal split across all active members
        const count = members.length;
        const baseShare = Math.floor(amountPaise / count);
        let remainder = amountPaise % count;
        shares = members.map(m => {
          const sPaise = baseShare + (remainder > 0 ? 1 : 0);
          if (remainder > 0) remainder--;
          return { user_id: m.id, amount_paise: sPaise };
        });
      }

      // Adjust shares sum if amount changed
      const totalShares = shares.reduce((sum, s) => sum + s.amount_paise, 0);
      if (totalShares !== amountPaise && shares.length > 0) {
        shares[0].amount_paise += (amountPaise - totalShares);
      }

      await api('POST', '/expenses/common', {
        description: desc,
        amount_paise: amountPaise,
        category_id: categoryId || null,
        expense_date: date,
        paid_by: lastParsedExpense?.paid_by_id || currentUser.id,
        split_method: lastParsedExpense?.split_method || 'equal',
        notes: notes || null,
        shares,
      });
    }

    closeVoiceAssistant();
    toast('Expense recorded successfully via Gemini AI!', 'success');

    // Refresh active page
    const pageEl = el('page-' + currentPage);
    if (pageEl) {
      renderPage(currentPage, pageEl);
    }
  } catch (err) {
    console.error('[Save AI Expense Error]', err);
    if (errEl) {
      errEl.textContent = err.message || 'Failed to save expense.';
      errEl.classList.remove('hidden');
    }
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Confirm &amp; Save Expense
      `;
    }
  }
}

/**
 * Global Keyboard Shortcut: Press Ctrl+M or Cmd+M to trigger Voice Input
 */
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'm') {
    e.preventDefault();
    if (window.currentUser) {
      openVoiceAssistant();
    }
  }
});
