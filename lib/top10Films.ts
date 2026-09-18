import { supabase } from './supabase';
import { getMoviesByType, getMovieBySlug } from './ophim';
import { Movie } from '@/types/movie';

export const HARDCODED_TOP10_SLUGS: string[] = [
  'ngay-tan-cua-pho-oak',
  'doraemon-nobita-va-lau-dai-duoi-day-bien-phien-ban-moi',
  'nguoi-nhen-khoi-dau-moi',
  'phi-phong-quy-mau-rung-thieng',
  'tau-buon-nguoi',
  'con-ke-ba-nghe',
  'anh-hung-2026',
  'tham-tu-lung-danh-conan-thien-than-sa-nga-tren-xa-lo',
  'mot-dem-duy-nhat',
  'lang-khat-mau'
];

export async function loadTop10Slugs(): Promise<string[] | null> {
  try {
    const { data, error } = await supabase
      .from('top10_films')
      .select('slug, sort_order')
      .order('sort_order');
    if (!error && data && data.length > 0) {
      return data.map((r: any) => r.slug as string);
    }
  } catch {}
  return null; // null = dùng API fallback
}

export async function saveTop10Slugs(slugs: string[]): Promise<void> {
  // Xoá tất cả rồi insert lại theo thứ tự mới
  await supabase.from('top10_films').delete().neq('slug', '__none__');
  if (slugs.length > 0) {
    await supabase.from('top10_films').insert(
      slugs.map((slug, i) => ({ slug, sort_order: i }))
    );
  }
}

export async function getTop10Films(): Promise<Movie[]> {
  try {
    const slugs = HARDCODED_TOP10_SLUGS.length > 0
      ? HARDCODED_TOP10_SLUGS
      : await loadTop10Slugs();
    if (slugs && slugs.length > 0) {
      const results = await Promise.all(slugs.map((s) => getMovieBySlug(s)));
      const movies = results.filter(Boolean) as Movie[];
      if (movies.length > 0) {
        return movies;
      }
    }
  } catch {}
  // Fallback: 10 phim lẻ mới nhất
  try {
    const movies = await getMoviesByType('phim-le');
    return movies.slice(0, 10);
  } catch {
    return [];
  }
}
