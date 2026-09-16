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
  const normalized = normalizePhoneNumber(phone);
  // Basic E.164 validation: starts with +, followed by 8 to 15 digits
  return /^\+[1-9]\d{7,14}$/.test(normalized);
}
