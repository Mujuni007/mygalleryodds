const PHONE_RE = /^\d{9}$/;

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidPhoneNumber(phone) {
  return PHONE_RE.test(phone.trim());
}

export function buildPhoneNumber(countryCode, phone) {
  return `${countryCode}${phone.trim()}`;
}

/**
 * A "secure" password: at least 8 characters, one uppercase, one lowercase,
 * and one digit. Kept intentionally readable so the rule can be shown to
 * the user, matched by the two page-level components that need it.
 */
export function passwordIssues(password) {
  const issues = [];
  if (password.length < 8) issues.push("at least 8 characters");
  if (!/[A-Z]/.test(password)) issues.push("one uppercase letter");
  if (!/[a-z]/.test(password)) issues.push("one lowercase letter");
  if (!/[0-9]/.test(password)) issues.push("one number");
  return issues;
}

export function isSecurePassword(password) {
  return passwordIssues(password).length === 0;
}
