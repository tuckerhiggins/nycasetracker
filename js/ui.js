/**
 * NYC Case Tracker - UI Module
 * Toast notifications, modal management, and rendering utilities
 */

// ============================================================================
// TOAST NOTIFICATIONS
// ============================================================================

/**
 * Show a toast notification
 * @param {string} message - Message to display
 * @param {string} type - 'success', 'error', 'warning', or 'info'
 * @param {number} duration - Duration in milliseconds (default 3000)
 */
export function showToast(message, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  const colors = {
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6'
  };

  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '2rem',
    right: '2rem',
    padding: '1rem 1.5rem',
    borderRadius: '8px',
    background: colors[type] || colors.info,
    color: 'white',
    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
    zIndex: '10000',
    maxWidth: '400px',
    fontSize: '0.9rem',
    fontWeight: '500',
    opacity: '0',
    transform: 'translateY(1rem)',
    transition: 'opacity 0.3s ease, transform 0.3s ease'
  });

  document.body.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  // Remove after duration
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(1rem)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ============================================================================
// LOADING STATES
// ============================================================================

/**
 * Set loading state on a button
 */
export function setLoadingState(element, loading) {
  if (!element) return;

  if (loading) {
    element.disabled = true;
    element.dataset.originalText = element.textContent;
    element.innerHTML = '<span class="spinner"></span> Loading...';
    element.style.opacity = '0.7';
  } else {
    element.disabled = false;
    element.textContent = element.dataset.originalText || element.textContent;
    element.style.opacity = '1';
  }
}

// ============================================================================
// MODAL UTILITIES
// ============================================================================

/**
 * Close a modal by ID
 */
export function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'none';
  }
}

/**
 * Open a modal by ID
 */
export function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'flex';
  }
}

// ============================================================================
// TAG/BADGE ELEMENTS
// ============================================================================

/**
 * Create a charge level tag element
 */
export function chargeTagElement(level) {
  const span = document.createElement('span');
  span.className = 'tag';
  switch (level) {
    case 'felony':
      span.classList.add('tag-felony');
      span.textContent = 'Felony';
      break;
    case 'classA':
      span.classList.add('tag-a');
      span.textContent = 'Class A Misd';
      break;
    case 'classB':
      span.classList.add('tag-b');
      span.textContent = 'Class B Misd';
      break;
    case 'violation':
      span.classList.add('tag-v');
      span.textContent = 'Violation';
      break;
    default:
      span.textContent = '';
  }
  return span;
}

/**
 * Create a badge element
 */
export function createBadge(text, className = '') {
  const badge = document.createElement('span');
  badge.className = `badge ${className}`;
  badge.textContent = text;
  return badge;
}

// ============================================================================
// FILE DOWNLOAD UTILITIES
// ============================================================================

/**
 * Trigger a file download
 */
export function downloadFile(content, filename, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================================
// CONFIRMATION DIALOGS
// ============================================================================

/**
 * Show a styled confirmation dialog
 * (Falls back to native confirm for now, can be enhanced later)
 */
export function confirmAction(message) {
  return confirm(message);
}

// ============================================================================
// INPUT FOCUS UTILITIES
// ============================================================================

/**
 * Focus an input by ID
 */
export function focusInput(inputId) {
  const input = document.getElementById(inputId);
  if (input) {
    input.focus();
  }
}
