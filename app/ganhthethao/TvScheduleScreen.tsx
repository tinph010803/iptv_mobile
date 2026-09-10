import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Image, Modal, Platform, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import { ChevronLeft, Heart, LockKeyhole, Plus, Search, Tv, X } from 'lucide-react-native';
import { Channel, PlaylistSource } from '@/types/iptv';
import { parseM3U } from '@/utils/m3uParser';
import { getIptvFavorites, getIptvSources, saveIptvSource, toggleIptvFavorite } from '@/utils/iptvStorage';

export function TvScheduleScreen() {
  const router = useRouter();
  const [sources, setSources] = useState<PlaylistSource[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('Tất cả');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'web') return;

      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP
      ).catch(() => {});

      if (Platform.OS === 'android') {
        NavigationBar.setVisibilityAsync('visible').catch(() => {});
      }
    }, [])
  );

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const saved = await getIptvSources();
    setSources(saved);
    setFavorites(await getIptvFavorites());
    const activeSourceId = selectedSourceId && saved.some((source) => source.id === selectedSourceId)
      ? selectedSourceId
      : saved[0]?.id ?? null;
    setSelectedSourceId(activeSourceId);
    if (!activeSourceId) {
      setChannels([]);
      setLoading(false);
      return;
    }
    const source = saved.find((item) => item.id === activeSourceId);
    try {
      const res = await fetch(source!.url);
      if (!res.ok) throw new Error(`${source!.name}: HTTP ${res.status}`);
      setChannels(parseM3U(await res.text()));
    } catch (error) {
      setChannels([]);
      setLoadError(error instanceof Error ? error.message : 'Không thể tải playlist');
    }
    setGroup('Tất cả');
    setLoading(false);
  }, [selectedSourceId]);
  useEffect(() => { load(); }, []);
  const groups = useMemo(() => ['Tất cả', ...Array.from(new Set(channels.map((channel) => channel.group))).sort()], [channels]);
  const filtered = useMemo(() => channels.filter((channel) => (group === 'Tất cả' || channel.group === group) && channel.name.toLowerCase().includes(query.toLowerCase())), [channels, group, query]);
  const addSource = async () => { if (!name.trim() || !url.trim()) return; const saved = await saveIptvSource(name.trim(), url.trim()); setName(''); setUrl(''); setModal(false); setSources(saved); setSelectedSourceId(saved[saved.length - 1]?.id ?? null); };

  return <SafeAreaView style={styles.wrapper} edges={['top']}>
    <StatusBar style="light" hidden={false} />
    <View style={styles.header}><Pressable onPress={() => router.back()}><ChevronLeft size={24} color="#fff" /></Pressable><View style={styles.heading}><Tv size={20} color="#7dd3fc" /><Text style={styles.headerTitle}>Truyền hình</Text></View><Pressable onPress={() => setModal(true)}><Plus size={23} color="#fff" /></Pressable></View>
    <View style={styles.search}><Search size={18} color="#888894" /><TextInput value={query} onChangeText={setQuery} placeholder="Tìm kênh truyền hình" placeholderTextColor="#777784" style={styles.input} /></View>
    {sources.length > 0 && <FlatList style={styles.chipList} horizontal data={sources} keyExtractor={(item) => item.id} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sources} renderItem={({ item }) => <Pressable onPress={() => setSelectedSourceId(item.id)} style={[styles.source, item.id === selectedSourceId && styles.activeSource]}><Tv size={14} color={item.id === selectedSourceId ? '#fff' : '#7dd3fc'} /><Text style={[styles.sourceText, item.id === selectedSourceId && styles.activeSourceText]} numberOfLines={1}>{item.name}</Text></Pressable>} />}
    <FlatList style={styles.chipList} horizontal data={groups} keyExtractor={(item) => item} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.groups} renderItem={({ item }) => <Pressable onPress={() => setGroup(item)} style={[styles.group, item === group && styles.activeGroup]}><Text style={[styles.groupText, item === group && styles.activeGroupText]}>{item}</Text></Pressable>} />
    {loadError && <View style={styles.errorBanner}><Text style={styles.errorText}>{loadError}</Text></View>}
    <FlatList data={filtered} numColumns={2} keyExtractor={(item) => item.id} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor="#7dd3fc" />} contentContainerStyle={styles.grid} columnWrapperStyle={styles.row} ListEmptyComponent={<View style={styles.empty}><Tv size={42} color="#555563" /><Text style={styles.emptyText}>{loading ? 'Đang tải kênh...' : loadError ? 'Playlist không tải được' : 'Chưa có nguồn phát'}</Text>{!loading && !loadError && <><Text style={styles.emptyHint}>Dán link playlist M3U để bắt đầu xem</Text><Pressable style={styles.emptyButton} onPress={() => setModal(true)}><Plus size={17} color="#fff" /><Text style={styles.emptyButtonText}>Thêm nguồn phát</Text></Pressable></>}</View>} renderItem={({ item }) => <Pressable style={styles.card} onPress={() => router.push({ pathname: '/ganhthethao/iptv-player', params: { channel: JSON.stringify(item) } })}><View style={styles.logoWrap}>{item.logo ? <Image source={{ uri: item.logo }} style={styles.logo} resizeMode="contain" /> : <Tv size={34} color="#6e6e7b" />}{item.drm && <View style={styles.drmBadge}><LockKeyhole size={12} color="#bbf7d0" /><Text style={styles.drmText}>DRM</Text></View>}</View><View style={styles.caption}><Text style={styles.channelName} numberOfLines={1}>{item.name}</Text><Pressable hitSlop={8} onPress={async () => setFavorites(await toggleIptvFavorite(item))}><Heart size={17} color={favorites.includes(item.url) ? '#fb7185' : '#8b8b98'} fill={favorites.includes(item.url) ? '#fb7185' : 'transparent'} /></Pressable></View></Pressable>} />
    <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}><View style={styles.backdrop}><View style={styles.modal}><View style={styles.modalHead}><Text style={styles.modalTitle}>Thêm playlist M3U</Text><Pressable onPress={() => setModal(false)}><X size={22} color="#fff" /></Pressable></View><TextInput value={name} onChangeText={setName} placeholder="Tên danh sách" placeholderTextColor="#777784" style={styles.field} /><TextInput value={url} onChangeText={setUrl} placeholder="https://.../playlist.m3u" placeholderTextColor="#777784" autoCapitalize="none" style={styles.field} /><Pressable style={styles.addButton} onPress={addSource}><Text style={styles.addText}>Thêm danh sách</Text></Pressable></View></View></Modal>
  </SafeAreaView>;
}

const styles = StyleSheet.create({ wrapper: { flex: 1, backgroundColor: '#0a0a0f' }, header: { height: 64, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, heading: { flexDirection: 'row', alignItems: 'center', gap: 8 }, headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' }, search: { marginHorizontal: 16, marginTop: 8, marginBottom: 10, height: 48, borderRadius: 13, backgroundColor: '#181820', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, gap: 9 }, input: { flex: 1, color: '#fff', fontSize: 14 }, chipList: { height: 48, flexGrow: 0 }, sources: { paddingHorizontal: 16, alignItems: 'center', gap: 8 }, source: { height: 34, maxWidth: 220, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#17232b' }, activeSource: { backgroundColor: '#0e7490' }, sourceText: { color: '#a9dff0', fontSize: 12, fontWeight: '600' }, activeSourceText: { color: '#fff' }, groups: { paddingHorizontal: 16, alignItems: 'center', gap: 8 }, group: { height: 32, justifyContent: 'center', paddingHorizontal: 13, borderRadius: 17, backgroundColor: '#171720' }, activeGroup: { backgroundColor: '#0e7490' }, groupText: { color: '#9d9da8', fontSize: 12 }, activeGroupText: { color: '#fff', fontWeight: '700' }, errorBanner: { marginHorizontal: 16, marginBottom: 10, padding: 10, borderRadius: 8, backgroundColor: '#3a1d25' }, errorText: { color: '#ffc4ce', fontSize: 12 }, grid: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 30, flexGrow: 1 }, row: { gap: 12, marginBottom: 12 }, card: { flex: 1, minWidth: 0, backgroundColor: '#191923', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#252532' }, logoWrap: { height: 112, alignItems: 'center', justifyContent: 'center', backgroundColor: '#22222c', position: 'relative' }, logo: { width: '78%', height: '78%' }, drmBadge: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6, backgroundColor: '#166534' }, drmText: { color: '#bbf7d0', fontSize: 10, fontWeight: '800' }, caption: { minHeight: 48, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }, channelName: { flex: 1, color: '#f1f1f4', fontSize: 13, fontWeight: '700' }, empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 24, gap: 13 }, emptyText: { color: '#777784', fontSize: 13, textAlign: 'center' }, emptyHint: { color: '#555563', fontSize: 12, textAlign: 'center' }, emptyButton: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#0891b2', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 9 }, emptyButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' }, backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.65)' }, modal: { backgroundColor: '#171720', padding: 18, borderTopLeftRadius: 20, borderTopRightRadius: 20, gap: 12 }, modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, modalTitle: { color: '#fff', fontSize: 18, fontWeight: '800' }, field: { color: '#fff', backgroundColor: '#242430', borderRadius: 10, paddingHorizontal: 13, height: 46 }, addButton: { height: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0891b2' }, addText: { color: '#fff', fontWeight: '800' } });

export default TvScheduleScreen;