import AsyncStorage from '@react-native-async-storage/async-storage';
import { Channel, PlaylistSource } from '@/types/iptv';

const SOURCES_KEY = '@rophim_iptv_sources';
const FAVORITES_KEY = '@rophim_iptv_favorites';

export async function getIptvSources(): Promise<PlaylistSource[]> {
  try { return JSON.parse((await AsyncStorage.getItem(SOURCES_KEY)) || '[]'); } catch { return []; }
}
export async function saveIptvSource(name: string, url: string): Promise<PlaylistSource[]> {
  const sources = await getIptvSources();
  const next = [...sources.filter((source) => source.url !== url), { id: `iptv-${Date.now()}`, name, url }];
  await AsyncStorage.setItem(SOURCES_KEY, JSON.stringify(next)); return next;
}
export async function removeIptvSource(id: string): Promise<PlaylistSource[]> {
  const next = (await getIptvSources()).filter((source) => source.id !== id);
  await AsyncStorage.setItem(SOURCES_KEY, JSON.stringify(next)); return next;
}
export async function getIptvFavorites(): Promise<string[]> {
  try { return JSON.parse((await AsyncStorage.getItem(FAVORITES_KEY)) || '[]'); } catch { return []; }
}

export async function isIptvFavorite(channelUrl: string): Promise<boolean> {
  return (await getIptvFavorites()).includes(channelUrl);
}
export async function toggleIptvFavorite(channel: Channel): Promise<string[]> {
  const favorites = await getIptvFavorites();
  const next = favorites.includes(channel.url) ? favorites.filter((url) => url !== channel.url) : [...favorites, channel.url];
  await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(next)); return next;
}
