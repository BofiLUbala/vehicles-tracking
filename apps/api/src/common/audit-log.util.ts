/** Clés à rédiger systématiquement avant toute écriture dans audit_logs. */
const SENSITIVE_KEYS = ['password', 'code', 'otp', 'token', 'refreshToken', 'accessToken', 'secret', 'codeHash', 'passwordHash'];

/** Retire récursivement les champs sensibles d'un objet avant journalisation. */
export function redactSensitive(payload: Record<string, unknown> | undefined | null): Record<string, unknown> {
  if (!payload) return {};
  const clone: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (SENSITIVE_KEYS.some((k) => key.toLowerCase().includes(k.toLowerCase()))) {
      clone[key] = '[REDACTED]';
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      clone[key] = redactSensitive(value as Record<string, unknown>);
    } else {
      clone[key] = value;
    }
  }
  return clone;
}
