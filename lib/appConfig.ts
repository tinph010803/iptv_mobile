import { supabase } from './supabase';

const APP_SETTINGS_TABLE = 'app_settings';

export const RO1_DEFAULT_URL = 'https://cobephim.com';
export const RO2_DEFAULT_URL = 'https://rophim.stream';
export const SPORTS_DEFAULT_URL = 'https://demnaylive.my/';
export const ONFLIX_DEFAULT_URL = 'https://520-1314.onflix.run/';
export const ROPHIM_API_DEFAULT_URL = 'https://cobephim.com/baseapi/api/v1';

export function normalizeHttpUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export async function getAppSettingValue(settingKey: string, fallbackValue: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from(APP_SETTINGS_TABLE)
      .select('setting_value')
      .eq('setting_key', settingKey)
      .maybeSingle();

    if (!error && data?.setting_value) {
      const normalized = normalizeHttpUrl(data.setting_value);
      if (normalized) {
        return normalized;
      }
    }
  } catch {
    // Ignore missing table/network errors and use the fallback below.
  }

  return fallbackValue;
}

export async function saveAppSettings(
  entries: Array<{ settingKey: string; settingValue: string; description?: string }>,
): Promise<void> {
  const keys = entries.map((entry) => entry.settingKey);

  if (keys.length > 0) {
    const { error: deleteError } = await supabase
      .from(APP_SETTINGS_TABLE)
      .delete()
      .in('setting_key', keys);

    if (deleteError) {
      throw new Error(deleteError.message);
    }
  }

  const payload = entries
    .map((entry) => {
      const normalized = normalizeHttpUrl(entry.settingValue);
      if (!normalized) return null;

      return {
        setting_key: entry.settingKey,
        setting_value: normalized,
        description: entry.description ?? null,
      };
    })
    .filter((entry): entry is { setting_key: string; setting_value: string; description: string | null } => entry !== null);

  if (payload.length > 0) {
    const { error: insertError } = await supabase
      .from(APP_SETTINGS_TABLE)
      .insert(payload);

    if (insertError) {
      throw new Error(insertError.message);
    }
  }
}

export function loadSportsUrl(fallbackValue: string): Promise<string> {
  return getAppSettingValue('sports_url', fallbackValue);
}

export function loadTruyenUrl(fallbackValue: string): Promise<string> {
  return getAppSettingValue('truyen_url', fallbackValue);
}

export function loadRo1Url(fallbackValue: string): Promise<string> {
  return getAppSettingValue('ro1_url', fallbackValue);
}

export function loadRo2Url(fallbackValue: string): Promise<string> {
  return getAppSettingValue('ro2_url', fallbackValue);
}

export function loadRophimApiUrl(fallbackValue: string): Promise<string> {
  return getAppSettingValue('rophim_api_url', fallbackValue);
}

export function loadOnflixUrl(fallbackValue: string): Promise<string> {
  return getAppSettingValue('onflix_url', fallbackValue);
}