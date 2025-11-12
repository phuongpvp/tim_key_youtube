// src/services/userKey.ts
export const LS_KEY = 'user_api_key';

export function getUserApiKey(): string | null {
  try {
    const k = localStorage.getItem(LS_KEY);
    if (k && k.trim()) return k.trim();
  } catch {}
  // fallback dev nếu có để trong .env.local
  // @ts-ignore
  const envK = (import.meta.env?.GEMINI_API_KEY || '').trim?.() || '';
  return envK || null;
}

export function setUserApiKey(k: string) {
  localStorage.setItem(LS_KEY, k.trim());
}

export function clearUserApiKey() {
  localStorage.removeItem(LS_KEY);
}

/** Dùng ở service: ưu tiên key truyền vào → key người dùng → env */
export function resolveApiKey(userProvided?: string | null): string {
  if (userProvided?.trim()) return userProvided.trim();
  const k = getUserApiKey();
  if (k) return k;
  throw new Error('Thiếu API key. Hãy nhập API key để dùng tool.');
}
