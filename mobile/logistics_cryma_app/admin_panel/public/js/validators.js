/**
 * Email validation
 */
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Text length validation (50 char limit for names)
 */
function validateTextLength(text, minLength = 0, maxLength = 50) {
  if (typeof text !== 'string') return false;
  const trimmed = text.trim();
  return trimmed.length >= minLength && trimmed.length <= maxLength;
}

/**
 * Reason validation (5-500 characters)
 */
function validateReason(text) {
  if (typeof text !== 'string') return false;
  const trimmed = text.trim();
  return trimmed.length >= 5 && trimmed.length <= 500;
}

/**
 * Password validation (minimum 8 characters)
 */
function validatePassword(password) {
  return typeof password === 'string' && password.length >= 8;
}

/**
 * Display inline validation error
 */
function showFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  if (!field) return;

  field.classList.add('field-error');
  let errorEl = field.nextElementSibling;

  if (!errorEl || !errorEl.classList.contains('field-error-message')) {
    errorEl = document.createElement('div');
    errorEl.className = 'field-error-message';
    field.parentNode.insertBefore(errorEl, field.nextSibling);
  }

  errorEl.textContent = message;
}

/**
 * Clear validation errors
 */
function clearFieldError(fieldId) {
  const field = document.getElementById(fieldId);
  if (!field) return;

  field.classList.remove('field-error');
  const errorEl = field.nextElementSibling;

  if (errorEl && errorEl.classList.contains('field-error-message')) {
    errorEl.remove();
  }
}
