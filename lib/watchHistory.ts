/**
 * Watch history — hybrid storage:
 *  • Logged-in user  → Supabase (synced across devices, no backend needed)
 *  • Guest           → AsyncStorage (local only)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

const STORAGE_KEY = '@watch_history_v1';
const MAX_ITEMS = 50;

export interface WatchHistoryEntry {
  movieId: string;       // gtavn _id (or ophim slug if gtavn id not available)
  movieSlug: string;     // ophim slug for navigation
  movieTitle: string;
  posterUrl: string;
  episodeName: string;   // "Tập 1" or "1"
  serverLabel: string;   // server name
  time: number;          // current position in seconds
  duration: number;      // total duration in seconds
  updatedAt: string;     // ISO timestamp
}

// ─── AsyncStorage helpers (guest / offline) ────────────────

async function localGet(): Promise<WatchHistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as WatchHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

async function localSet(list: WatchHistoryEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(list.slice(0, MAX_ITEMS))
    );
  } catch {}
}

function entryKey(entry: Pick<WatchHistoryEntry, 'movieSlug' | 'episodeName'>): string {
  return `${entry.movieSlug}::${entry.episodeName || 'Tập 1'}`;
}

// ─── Supabase helpers (logged-in, cross-device) ────────────

async function remoteGet(userId: string): Promise<WatchHistoryEntry[]> {
  const { data, error } = await supabase
    .from('watch_history')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(MAX_ITEMS);
  if (error || !data) return [];
  return data.map((row: any) => ({
    movieId: row.movie_id,
    movieSlug: row.movie_slug,
    movieTitle: row.movie_title,
    posterUrl: row.poster_url,
    episodeName: row.episode_name,
    serverLabel: row.server_label,
    time: Number(row.time) ?? 0,
    duration: Number(row.duration) ?? 0,
    updatedAt: row.updated_at,
  }));
}

async function remoteSave(
  userId: string,
  entry: Omit<WatchHistoryEntry, 'updatedAt'>
): Promise<void> {
  const now = new Date().toISOString();

  // Use movieSlug as stable key (movieId can vary between gtavn _id and slug)
  const { data: updated, error: updateErr } = await supabase
    .from('watch_history')
    .update({
      movie_id: entry.movieId,
      time: entry.time,
      duration: entry.duration,
      movie_title: entry.movieTitle,
      poster_url: entry.posterUrl,
      episode_name: entry.episodeName,
      server_label: entry.serverLabel,
      updated_at: now,
    })
    .eq('user_id', userId)
    .eq('movie_slug', entry.movieSlug)
    .select('id');

  if (updateErr) {
    console.error('[WatchHistory] UPDATE error:', updateErr.message);
  }

  // If no existing record found → INSERT
  if (!updated || updated.length === 0) {
    const { error: insertErr } = await supabase.from('watch_history').insert({
      user_id: userId,
      movie_id: entry.movieId,
      movie_slug: entry.movieSlug,
      movie_title: entry.movieTitle,
      poster_url: entry.posterUrl,
      episode_name: entry.episodeName,
      server_label: entry.serverLabel,
      time: entry.time,
      duration: entry.duration,
      updated_at: now,
    });
    if (insertErr) {
      console.error('[WatchHistory] INSERT error:', insertErr.message);
    }
  }
}

async function remoteRemove(
  userId: string,
  movieSlug: string,
): Promise<void> {
  await supabase
    .from('watch_history')
    .delete()
    .eq('user_id', userId)
    .eq('movie_slug', movieSlug);
}

async function remoteClear(userId: string): Promise<void> {
  await supabase
    .from('watch_history')
    .delete()
    .eq('user_id', userId);
}

// ─── Public API ────────────────────────────────────────────

/**
 * Fetch watch history.
 * Pass userId (non-empty string) to fetch from Supabase.
 */
export async function getWatchHistory(
  userId?: string
): Promise<WatchHistoryEntry[]> {
  if (userId) {
    try {
      const items = await remoteGet(userId);
      // Also merge local-only entries not yet on server
      const local = await localGet();
      const merged = new Map<string, WatchHistoryEntry>();
      [...items, ...local].forEach((entry) => {
        const key = entryKey(entry);
        const existing = merged.get(key);
        if (!existing || new Date(entry.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
          merged.set(key, entry);
        }
      });
      return Array.from(merged.values())
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, MAX_ITEMS);
    } catch {
      return localGet();
    }
  }
  return localGet();
}

/**
 * Save / update watch progress.
 * Pass userId to also sync to Supabase.
 */
export async function saveWatchProgress(
  entry: Omit<WatchHistoryEntry, 'updatedAt'>,
  userId?: string
): Promise<void> {
  // Always persist locally for fast offline reads
  try {
    const list = await localGet();
    // Keep progress separately for each episode of a movie.
    const idx = list.findIndex((e) => entryKey(e) === entryKey(entry));
    const updated: WatchHistoryEntry = {
      ...entry,
      updatedAt: new Date().toISOString(),
    };
    if (idx >= 0) {
      list[idx] = updated;
    } else {
      list.unshift(updated);
    }
    list.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    await localSet(list);
  } catch {}

  // Sync to Supabase if logged in
  if (userId) {
    try {
      await remoteSave(userId, entry);
    } catch (e: any) {
      console.error('[WatchHistory] remoteSave exception:', e?.message);
    }
  }
}

/**
 * Remove a specific episode (or all entries for a movie) from history.
 */
export async function removeWatchEntry(
  movieId: string,
  episodeName?: string,
  userId?: string
): Promise<void> {
  if (userId) {
    try {
      // movieId here may be slug or gtavn id — use movieId as movieSlug fallback
      await remoteRemove(userId, movieId);
    } catch {}
  }
  try {
    const list = await localGet();
    const filtered = list.filter(
      (e) => e.movieSlug !== movieId && e.movieId !== movieId
    );
    await localSet(filtered);
  } catch {}
}

/**
 * Clear all watch history.
 */
export async function clearWatchHistory(userId?: string): Promise<void> {
  if (userId) {
    try {
      await remoteClear(userId);
    } catch {}
  }
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {}
}

/** Format seconds → "mm:ss" or "h:mm:ss" */
export function formatTime(secs: number): string {
  if (!secs || isNaN(secs)) return '0:00';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  const pad = (n: number) => (n < 10 ? '0' + n : '' + n);
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

