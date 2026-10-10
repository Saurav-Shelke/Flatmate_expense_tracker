'use strict';

/**
 * Display a temporary floating toast notification
 * @param {string} msg
 * @param {'success'|'error'|''} [type='']
 */
function toast(msg, type = '') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const item = document.createElement('div');
  item.className = 'toast' + (type ? ' toast-' + type : '');
  item.textContent = msg;
  container.appendChild(item);

  setTimeout(() => {
    item.remove();
  }, 3500);
}
