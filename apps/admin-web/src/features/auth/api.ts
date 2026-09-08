export interface LoginResult {
  requiresOtp: boolean;
  message?: string;
}

async function parseJsonSafe(res: Response): Promise<Record<string, unknown>> {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

/** Passe par la route Next.js (jamais l'API directement) pour que les tokens restent en cookies httpOnly. */
export async function loginAdmin(email: string, password: string, deviceId: string): Promise<LoginResult> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, deviceId }),
    credentials: 'include',
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error((data.message as string) ?? 'Identifiants invalides');
  }
  return data as unknown as LoginResult;
}

export async function verifyAdminOtp(email: string, code: string, deviceId: string): Promise<void> {
  const res = await fetch('/api/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, deviceId }),
    credentials: 'include',
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error((data.message as string) ?? 'Code invalide ou expiré');
  }
}

export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
}
