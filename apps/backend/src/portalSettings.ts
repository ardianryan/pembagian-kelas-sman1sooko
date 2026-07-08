import { db } from './db/index.js';
import * as schema from './db/schema.js';
import { eq } from 'drizzle-orm';

export const PORTAL_CONFIG_KEYS = {
  classmatesVisible: 'CLASSMATES_VISIBLE',
} as const;

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

function parseBooleanConfig(value: string, fallback = true): boolean {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
  return fallback;
}

export async function getPortalSettings() {
  const classmatesValue = await getConfigValue(PORTAL_CONFIG_KEYS.classmatesVisible, 'true');
  return {
    classmatesVisible: parseBooleanConfig(classmatesValue, true),
  };
}

export async function savePortalSettings(settings: { classmatesVisible?: boolean }) {
  if (typeof settings.classmatesVisible === 'boolean') {
    await setConfigValue(
      PORTAL_CONFIG_KEYS.classmatesVisible,
      settings.classmatesVisible ? 'true' : 'false'
    );
  }

  return getPortalSettings();
}