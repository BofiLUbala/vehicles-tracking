/**
 * Normalizes a phone number to E.164 format.
 * Default country code: +243 (DR Congo / Kinshasa)
 */
export function normalizePhoneNumber(raw: string, defaultCountryCode = '+243'): string {
  // Strip all whitespace, dashes, dots, parentheses
  let cleaned = raw.replace(/[\s\-\.\(\)]/g, '');

  // If already starts with '+', return as is
  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  // If starts with '00', replace with '+'
  if (cleaned.startsWith('00')) {
    return `+${cleaned.slice(2)}`;
  }

  // If starts with leading '0' (local format ex. 0812345678)
  if (cleaned.startsWith('0')) {
    return `${defaultCountryCode}${cleaned.slice(1)}`;
  }

  // If starts with country code without plus (ex. 243812345678)
  if (cleaned.startsWith('243') && cleaned.length >= 12) {
    return `+${cleaned}`;
  }

  return `${defaultCountryCode}${cleaned}`;
}

export function isValidPhoneNumber(phone: string): boolean {
  if (!phone || !phone.trim()) return false;
  const normalized = normalizePhoneNumber(phone);
  // Basic E.164 validation: starts with +, followed by 8 to 15 digits
  return /^\+[1-9]\d{7,14}$/.test(normalized);
}

export function isValidEmail(email: string): boolean {
  if (!email || !email.trim()) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim().toLowerCase());
}

export function maskPhoneNumber(phone: string): string {
  if (!phone) return '';
  const normalized = normalizePhoneNumber(phone);
  if (normalized.length <= 6) return normalized;
  const prefix = normalized.slice(0, 4); // e.g. +243
  const suffix = normalized.slice(-4); // last 4 digits
  const dots = '•'.repeat(Math.max(3, normalized.length - 8));
  return `${prefix}${dots}${suffix}`;
}

export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.trim().toLowerCase().split('@');
  if (local.length <= 2) {
    return `${local.charAt(0)}***@${domain}`;
  }
  const firstChar = local.charAt(0);
  return `${firstChar}***@${domain}`;
}

