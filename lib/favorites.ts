import AsyncStorage from '@react-native-async-storage/async-storage';
import { Movie } from '@/types/movie';
import { supabase } from '@/lib/supabase';

const FAVORITES_KEY = '@ganh18_favorites';

export interface LocalFavoriteItem {
  id: string;
  movie: {
    _id: string;
    name: string;
    slug: string;
    origin_name: string;
    poster: Record<string, string>;
    thumb: Record<string, string>;
    episode_current?: string;
  };
}

export async function getSupabaseFavoriteItems(userId: string): Promise<LocalFavoriteItem[]> {
  const { data, error } = await supabase
    .from('favorites')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: any) => ({
    id: row.id,
    movie: {
      _id: row.movie_id || row.movie_slug,
      name: row.movie_name,
      slug: row.movie_slug,
      origin_name: row.origin_name,
      poster: row.poster || {},
      thumb: row.thumb || {},
      episode_current: row.episode_current,
    },
  }));
}

export async function toggleSupabaseFavorite(userId: string, movie: Movie): Promise<boolean> {
  const slug = movie.slug || movie.id;
  const { data: existing, error: findError } = await supabase
    .from('favorites').select('id').eq('user_id', userId).eq('movie_slug', slug).maybeSingle();
  if (findError) throw new Error(findError.message);
  if (existing) {
    const { error } = await supabase.from('favorites').delete().eq('id', existing.id);
    if (error) throw new Error(error.message);
    return false;
  }
  const { error } = await supabase.from('favorites').insert({
    user_id: userId,
    movie_id: movie.id || slug,
    movie_slug: slug,
    movie_name: movie.title,
    origin_name: movie.title_en,
    poster: movie.poster_url ? { default: movie.poster_url } : {},
    thumb: movie.thumb_url ? { default: movie.thumb_url } : {},
    episode_current: movie.current_episode ? String(movie.current_episode) : null,
  });
  if (error) throw new Error(error.message);
  return true;
}

export async function removeSupabaseFavorite(userId: string, movieSlug: string): Promise<void> {
  const { error } = await supabase.from('favorites').delete().eq('user_id', userId).eq('movie_slug', movieSlug);
  if (error) throw new Error(error.message);
}

async function getStoredItems(): Promise<LocalFavoriteItem[]> {
  try {
    const data = await AsyncStorage.getItem(FAVORITES_KEY);
    const parsed = data ? JSON.parse(data) : [];
    if (!Array.isArray(parsed)) return [];
    if (parsed.length === 0 || typeof parsed[0] !== 'string') return parsed;
    return parsed.map((slug: string) => ({
      id: slug,
      movie: {
        _id: slug,
        name: slug,
        slug,
        origin_name: '',
        poster: {},
        thumb: {},
      },
    }));
  } catch {
    return [];
  }
}

export async function getLocalFavoriteItems(): Promise<LocalFavoriteItem[]> {
  return getStoredItems();
}

export async function saveLocalFavorite(movie: Movie): Promise<void> {
  const slug = movie.slug || movie.id;
  if (!slug) return;
  const favorites = await getStoredItems();
  if (favorites.some((item) => item.movie.slug === slug)) return;
  favorites.unshift({
    id: slug,
    movie: {
      _id: movie.id || slug,
      name: movie.title,
      slug,
      origin_name: movie.title_en,
      poster: movie.poster_url ? { default: movie.poster_url } : {},
      thumb: movie.thumb_url ? { default: movie.thumb_url } : {},
      episode_current: movie.current_episode ? String(movie.current_episode) : undefined,
    },
  });
  await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}

export async function getFavorites(): Promise<string[]> {
  try {
    const favorites = await getStoredItems();
    return favorites.map((item) => item.movie.slug);
  } catch (error) {
    console.error('Error getting favorites:', error);
    return [];
  }
}

export async function addFavorite(movieSlug: string): Promise<void> {
  try {
    const favorites = await getStoredItems();
    if (favorites.some((item) => item.movie.slug === movieSlug)) return;
    favorites.push({
      id: movieSlug,
      movie: { _id: movieSlug, name: movieSlug, slug: movieSlug, origin_name: '', poster: {}, thumb: {} },
    });
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  } catch (error) {
    console.error('Error adding favorite:', error);
  }
}

export async function removeFavorite(movieSlug: string): Promise<void> {
  try {
    const favorites = await getStoredItems();
    const updated = favorites.filter((item) => item.movie.slug !== movieSlug);
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error removing favorite:', error);
  }
}

export async function toggleFavorite(movieSlug: string): Promise<boolean> {
  try {
    const favorites = await getFavorites();
    const isFavorited = favorites.includes(movieSlug);
    if (isFavorited) {
      await removeFavorite(movieSlug);
      return false;
    } else {
      await addFavorite(movieSlug);
      return true;
    }
  } catch (error) {
    console.error('Error toggling favorite:', error);
    return false;
  }
}

export async function isFavorite(movieSlug: string): Promise<boolean> {
  try {
    const favorites = await getStoredItems();
    return favorites.some((item) => item.movie.slug === movieSlug);
  } catch (error) {
    console.error('Error checking favorite:', error);
    return false;
  }
}
