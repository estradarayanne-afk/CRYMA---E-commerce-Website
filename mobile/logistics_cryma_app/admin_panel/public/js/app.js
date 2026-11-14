/**
 * Setup navbar with navigation and logout
 */
function setupNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  const token = localStorage.getItem('adminToken');
  const isLoginPage = window.location.pathname === '/' || window.location.pathname.endsWith('index.html');

  if (!token && !isLoginPage) {
    // Not logged in and not on login page - redirect
    window.location.href = '/index.html';
    return;
  }

  if (token && isLoginPage) {
    // Logged in and on login page - redirect to dashboard
    window.location.href = '/dashboard.html';
    return;
  }

  if (!token) {
    // Login page - no navbar
    return;
  }

  // Build navbar
  const currentPage = window.location.pathname;
  navbar.innerHTML = `
    <div class="navbar-content">
      <div class="navbar-brand">
        <h2>CRYMA Admin</h2>
      </div>
      <ul class="navbar-menu">
        <li><a href="/dashboard.html" class="nav-link ${currentPage.includes('dashboard') ? 'active' : ''}">Dashboard</a></li>
        <li><a href="/riders.html" class="nav-link ${currentPage.includes('riders.html') ? 'active' : ''}">Pending Riders</a></li>
        <li><a href="/audit.html" class="nav-link ${currentPage.includes('audit.html') ? 'active' : ''}">Audit Log</a></li>
      </ul>
      <button id="logoutBtn" class="btn btn-secondary btn-small">Logout</button>
    </div>
  `;

  document.getElementById('logoutBtn').addEventListener('click', logout);
}

/**
 * Logout and redirect to login
 */
function logout() {
  if (confirm('Are you sure you want to logout?')) {
    localStorage.removeItem('adminToken');
    window.location.href = '/index.html';
  }
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
  const toastContainer = document.getElementById('toastContainer') || createToastContainer();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  toastContainer.appendChild(toast);

  // Auto-remove after 3 seconds
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

/**
 * Create toast container if it doesn't exist
 */
function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toastContainer';
  container.className = 'toast-container';
  document.body.appendChild(container);
  return container;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Format date to readable string
 */
function formatDate(dateString) {
  try {
    return new Date(dateString).toLocaleString();
  } catch {
    return dateString;
  }
}

/**
 * Redirect to login if not authenticated
 */
function ensureAuthenticated() {
  const token = localStorage.getItem('adminToken');
  if (!token) {
    window.location.href = '/index.html';
  }
}

/**
 * Show modal dialog with title, message, and buttons
 */
function showModal(title, message, buttons = []) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'dynamicModal';

  let buttonHtml = '';
  buttons.forEach((btn) => {
    buttonHtml += `<button class="btn btn-${btn.class || 'primary'}" data-action="${btn.id}">${btn.label}</button>`;
  });

  modal.innerHTML = `
    <div class="modal-content">
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(message)}</p>
      <div class="modal-buttons">
        ${buttonHtml}
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Handle button clicks
  buttons.forEach((btn) => {
    const btnEl = modal.querySelector(`[data-action="${btn.id}"]`);
    if (btnEl && btn.onClick) {
      btnEl.addEventListener('click', () => {
        modal.remove();
        btn.onClick();
      });
    }
  });

  // Close on overlay click if no cancel button
  if (!buttons.find((b) => b.id === 'cancel')) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }
}

/**
 * Show confirmation dialog
 */
function showConfirm(title, message, onConfirm, onCancel = null) {
  showModal(title, message, [
    {
      id: 'confirm',
      label: 'Confirm',
      class: 'success',
      onClick: onConfirm,
    },
    {
      id: 'cancel',
      label: 'Cancel',
      class: 'secondary',
      onClick: onCancel || (() => {}),
    },
  ]);
}

/**
 * Show form modal with textarea for reason
 */
function showReasonModal(title, message, onSubmit, onCancel = null) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'reasonModal';

  modal.innerHTML = `
    <div class="modal-content">
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(message)}</p>
      <div class="form-group">
        <label for="reasonText">Reason</label>
        <textarea id="reasonText" class="reason-textarea" placeholder="Enter reason (5-500 characters)" minlength="5" maxlength="500"></textarea>
        <div class="char-counter" id="charCounter">0/500</div>
      </div>
      <div class="modal-buttons">
        <button class="btn btn-success" id="submitReasonBtn">Submit</button>
        <button class="btn btn-secondary" id="cancelReasonBtn">Cancel</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const textarea = modal.querySelector('#reasonText');
  const charCounter = modal.querySelector('#charCounter');
  const submitBtn = modal.querySelector('#submitReasonBtn');
  const cancelBtn = modal.querySelector('#cancelReasonBtn');

  // Update character counter
  textarea.addEventListener('input', () => {
    charCounter.textContent = `${textarea.value.length}/500`;
  });

  // Submit handler
  submitBtn.addEventListener('click', () => {
    const reason = textarea.value.trim();
    if (reason.length < 5) {
      showToast('Reason must be at least 5 characters', 'error');
      return;
    }
    modal.remove();
    onSubmit(reason);
  });

  // Cancel handler
  cancelBtn.addEventListener('click', () => {
    modal.remove();
    if (onCancel) onCancel();
  });

  // Auto-focus
  textarea.focus();
}

/**
 * Close modal if it exists
 */
function closeModal() {
  const modal = document.getElementById('dynamicModal');
  if (modal) modal.remove();
}

