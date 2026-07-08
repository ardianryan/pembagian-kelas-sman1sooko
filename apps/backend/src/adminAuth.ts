import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from './db/index.js';
import * as schema from './db/schema.js';

export const ADMIN_USERNAME = 'admin';
export const ADMIN_PASSWORD_CONFIG_KEY = 'ADMIN_PASSWORD_HASH';
export const DEFAULT_ADMIN_PASSWORD = 'adminpass@2026';
export const ADMIN_SESSION_TOKEN = 'admin-secret-session-token';

const SCRYPT_KEYLEN = 64;
const MIN_PASSWORD_LENGTH = 8;

async function getConfigValue(key: string, fallback = ''): Promise<string> {
  try {
    const record = await db
      .select()
      .from(schema.config)
      .where(eq(schema.config.key, key))
      .limit(1);

    if (record.length > 0) {
      return record[0].value;
    }
  } catch (err) {
    console.error(`Error fetching config key ${key}:`, err);
  }
  return fallback;
}

async function setConfigValue(key: string, value: string) {
  await db
    .insert(schema.config)
    .values({ key, value })
    .onConflictDoUpdate({
      target: schema.config.key,
      set: { value, updatedAt: new Date() },
    });
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;

  try {
    const hashBuffer = Buffer.from(hash, 'hex');
    const derived = scryptSync(password, salt, SCRYPT_KEYLEN);
    return timingSafeEqual(hashBuffer, derived);
  } catch {
    return false;
  }
}

async function getStoredPasswordHash(): Promise<string | null> {
  const value = await getConfigValue(ADMIN_PASSWORD_CONFIG_KEY, '');
  return value || null;
}

export async function verifyAdminCredentials(username: string, password: string): Promise<boolean> {
  if (username !== ADMIN_USERNAME) return false;

  const stored = await getStoredPasswordHash();
  if (!stored) {
    return password === DEFAULT_ADMIN_PASSWORD;
  }

  return verifyPassword(password, stored);
}

export async function changeAdminPassword(
  currentPassword: string,
  newPassword: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const current = String(currentPassword || '');
  const next = String(newPassword || '');

  if (!current) {
    return { ok: false, error: 'Password lama wajib diisi.' };
  }

  if (!next) {
    return { ok: false, error: 'Password baru wajib diisi.' };
  }

  if (next.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: `Password baru minimal ${MIN_PASSWORD_LENGTH} karakter.` };
  }

  const valid = await verifyAdminCredentials(ADMIN_USERNAME, current);
  if (!valid) {
    return { ok: false, error: 'Password lama salah.' };
  }

  if (current === next) {
    return { ok: false, error: 'Password baru harus berbeda dari password lama.' };
  }

  await setConfigValue(ADMIN_PASSWORD_CONFIG_KEY, hashPassword(next));
  return { ok: true };
}