/**
 * Featured Overrides — danh sách phim nổi bật hardcode
 * - Không gọi Supabase
 * - Có thể lưu local bằng AsyncStorage nếu cần
 * - Nguồn mặc định là mảng hardcode bên dưới
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface FeaturedOverride {
  slug: string;
  bg?: string;
  character?: string;
  titleImg?: string;
  trailerUrl?: string;
  /** Tỷ lệ width ảnh nhân vật so với màn hình (0–1), mặc định 0.60 */
  charW?: number;
  /** Tỷ lệ height ảnh nhân vật so với banner (0–1.5), mặc định 1.1 */
  charH?: number;
  /** Khoảng cách từ mép phải (px), mặc định -10 */
  charRight?: number;
  /** Khoảng cách từ mép dưới (px), mặc định 0 */
  charBottom?: number;
}

const CACHE_KEY = 'featured_overrides_cache_v2';

/** Dữ liệu mặc định — hardcode theo sort_order */
export const FEATURED_OVERRIDES: FeaturedOverride[] = [
  {
    slug: 'bon-ban-tay-hai-ban-sonata',
    titleImg: 'https://sf-static.onflixcdn.com/images/pic/1788018511_url.webp',
    trailerUrl: 'https://trailer.onflixcdn.com/trailer/29082026/8752c25b-7fbb-4637-88b5-c0590e3e9799.m3u8'
  },
  {
    slug: 'de-che-dai-han-phan-2',
    titleImg: 'https://sf-static.onflixcdn.com/images/pic/1788960708_MADE-IN-KOREA-2-9-9-2026.png',
    trailerUrl: 'https://trailer.onflixcdn.com/trailer/09092026/3c030e62-486f-4333-9ece-d692d6ce1554.m3u8'
  }
  
];

/**
 * Load featured overrides from local cache immediately.
 * No Supabase call.
 */
export async function loadFeaturedOverridesFromCache(): Promise<FeaturedOverride[]> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed: FeaturedOverride[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return FEATURED_OVERRIDES;
}

/**
 * Refresh featured overrides in background.
 * Since the source is hardcoded, this just returns the current data.
 */
export async function refreshFeaturedOverridesInBackground(): Promise<FeaturedOverride[]> {
  return loadFeaturedOverrides();
}

/**
 * Đọc featured overrides từ local cache, không gọi Supabase.
 */
export async function loadFeaturedOverrides(): Promise<FeaturedOverride[]> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed: FeaturedOverride[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}

  return FEATURED_OVERRIDES;
}

/**
 * Lưu local cache theo máy hiện tại.
 */
export async function saveFeaturedOverrides(list: FeaturedOverride[]): Promise<void> {
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(list));
}

/**
 * Reset về danh sách hardcode mặc định.
 */
export async function resetFeaturedOverrides(): Promise<void> {
  await AsyncStorage.removeItem(CACHE_KEY);
}

/** Chuyển mảng sang Record để dùng trong FeaturedCarousel */
export function overridesToRecord(
  list: FeaturedOverride[]
): Record<string, Omit<FeaturedOverride, 'slug'>> {
  return Object.fromEntries(list.map(({ slug, ...rest }) => [slug, rest]));
}
