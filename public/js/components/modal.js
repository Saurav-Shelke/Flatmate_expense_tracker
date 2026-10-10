'use strict';

/**
 * Open the shared application modal
 * @param {string} title
 * @param {string} bodyHtml
 * @param {string} [footerHtml='']
 */
function openModal(title, bodyHtml, footerHtml = '') {
  const titleEl = document.getElementById('modal-title');
  const bodyEl = document.getElementById('modal-body');
  const footerEl = document.getElementById('modal-footer');
  const modalEl = document.getElementById('modal');

  if (titleEl) titleEl.textContent = title;
  if (bodyEl) bodyEl.innerHTML = bodyHtml;
  if (footerEl) footerEl.innerHTML = footerHtml;
  if (modalEl) modalEl.classList.remove('hidden');
}

/**
 * Close the shared application modal
 */
function closeModal() {
  const modalEl = document.getElementById('modal');
  if (modalEl) modalEl.classList.add('hidden');
}
