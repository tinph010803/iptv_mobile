import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import type { VideoTrack } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Pause, Play, Settings } from 'lucide-react-native';
import { Channel } from '@/types/iptv';

type Props = { channel: Channel; onReady: () => void; onError: (message: string) => void; onFullscreen: () => void; onVisibilityChange?: (visible: boolean) => void };

export default function TvNativePlayer({ channel, onReady, onError, onFullscreen, onVisibilityChange }: Props) {
  const [visible, setVisible] = useState(true);
  const [ready, setReady] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [liveOffset, setLiveOffset] = useState<number | null>(null);
  const [trackWidth, setTrackWidth] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [videoTracks, setVideoTracks] = useState<VideoTrack[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  onReadyRef.current = onReady;
  onErrorRef.current = onError;
  const headers: Record<string, string> = {};
  if (channel.userAgent) headers['User-Agent'] = channel.userAgent;
  if (channel.referer) headers.Referer = channel.referer;
  const player = useVideoPlayer({ uri: channel.url, headers: Object.keys(headers).length ? headers : undefined }, (instance) => instance.play());
  const { status, error } = useEvent(player, 'statusChange', { status: player.status });
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const time = useEvent(player, 'timeUpdate', { currentTime: 0, currentLiveTimestamp: null, currentOffsetFromLive: null, bufferedPosition: 0 });

  useEffect(() => {
    if (status === 'readyToPlay') { setReady(true); setVideoTracks([...player.availableVideoTracks]); onReadyRef.current(); reveal(); }
    if (status === 'error') onErrorRef.current(error?.message || 'Không thể phát kênh');
  }, [error, status]);
  useEffect(() => { setPosition(time?.currentTime || 0); setDuration(Number.isFinite(player.duration) ? player.duration : 0); setLiveOffset(time?.currentOffsetFromLive ?? null); }, [player, time?.currentTime, time?.currentOffsetFromLive]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function reveal() { setVisible(true); onVisibilityChange?.(true); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => { setVisible(false); setSettingsOpen(false); onVisibilityChange?.(false); }, 3500); }
  function hideControls() { setVisible(false); setSettingsOpen(false); onVisibilityChange?.(false); if (timer.current) clearTimeout(timer.current); }
  function toggleControls() { if (visible) hideControls(); else reveal(); }
  function togglePlay() { if (player.playing) player.pause(); else { player.play(); reveal(); } }
  function seek(seconds: number) { if (Number.isFinite(player.duration) && player.duration > 0) player.currentTime = Math.max(0, Math.min(player.duration, player.currentTime + seconds)); reveal(); }
  function seekTo(x: number) { if (trackWidth > 0 && Number.isFinite(player.duration) && player.duration > 0) player.currentTime = Math.max(0, Math.min(player.duration, (x / trackWidth) * player.duration)); reveal(); }
  function goLive() { if (Number.isFinite(liveOffset)) player.seekBy(-(liveOffset as number)); else if (Number.isFinite(player.duration) && player.duration > 0) player.currentTime = player.duration; player.play(); reveal(); }
  function timeText(value: number) { if (!Number.isFinite(value) || value <= 0) return 'LIVE'; const seconds = Math.floor(value); return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`; }
  const progress = Number.isFinite(duration) && duration > 0 ? Math.min(1, position / duration) : 0;

  const isLive = duration <= 0;
  const atLiveEdge = isLive && (liveOffset === null || liveOffset <= 1.5);

  return <View style={styles.container}>
    <VideoView style={styles.video} player={player} contentFit="contain" nativeControls={false} />
    <Pressable style={StyleSheet.absoluteFill} onPress={toggleControls} />
    {!ready && status !== 'error' && <View style={styles.loading} pointerEvents="none"><ActivityIndicator color="#fff" size="large" /><Text style={styles.loadingText}>Đang mở kênh...</Text></View>}
    {visible && <View style={styles.controls} pointerEvents="box-none"><View style={styles.center}><Pressable style={styles.playButton} onPress={togglePlay}>{isPlaying ? <Pause size={28} color="#17171c" fill="#17171c" /> : <Play size={28} color="#17171c" fill="#17171c" />}</Pressable></View>{settingsOpen && <View style={styles.qualityMenu}><Text style={styles.qualityTitle}>Chất lượng hình ảnh</Text><Pressable style={styles.qualityRow} onPress={() => setSettingsOpen(false)}><Text style={styles.qualityText}>Tự động</Text><Text style={styles.qualityCheck}>✓</Text></Pressable>{videoTracks.map((track) => <View style={styles.qualityRow} key={track.id}><Text style={styles.qualityText}>{track.size.height}p</Text></View>)}{videoTracks.length === 0 && <Text style={styles.qualityEmpty}>Kênh này không cung cấp nhiều mức chất lượng.</Text>}</View>}<View style={styles.bottom}><View style={styles.progressRow}>{!isLive && <Pressable style={styles.trackHit} onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)} onPress={(event) => seekTo(event.nativeEvent.locationX)}><View style={styles.track}><View style={[styles.value, { width: `${progress * 100}%` }]} /></View></Pressable>}</View><View style={styles.times}>{!isLive && <Text style={styles.time}>{timeText(position)}</Text>}<View style={styles.timeSpacer} />{!isLive && <Text style={styles.time}>{timeText(duration)}</Text>}</View><View style={styles.actions}><Pressable style={styles.action} onPress={togglePlay}>{isPlaying ? <Pause size={20} color="#fff" fill="#fff" /> : <Play size={20} color="#fff" fill="#fff" />}</Pressable><Pressable style={[styles.liveButton, atLiveEdge && styles.liveButtonActive]} onPress={goLive}><Text style={styles.liveButtonText}>LIVE</Text></Pressable><View style={styles.spacer} /><Pressable style={styles.action} onPress={() => { setSettingsOpen((open) => !open); reveal(); }}><Settings size={20} color="#fff" /></Pressable></View></View></View>}
  </View>;
}

const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: '#000' }, video: { flex: 1 }, loading: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#000' }, loadingText: { color: '#fff', fontSize: 13 }, controls: { ...StyleSheet.absoluteFill }, center: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', paddingBottom: 18 }, playButton: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }, qualityMenu: { position: 'absolute', right: 32, bottom: 58, minWidth: 220, padding: 12, borderRadius: 8, backgroundColor: 'rgba(20,20,24,.96)' }, qualityTitle: { color: '#fff', fontSize: 13, fontWeight: '800', marginBottom: 7 }, qualityRow: { minHeight: 32, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 }, qualityText: { color: '#fff', fontSize: 12 }, qualityCheck: { color: '#4ade80', marginLeft: 'auto', fontWeight: '800' }, qualityNote: { color: '#a1a1aa', fontSize: 10, marginLeft: 'auto' }, qualityEmpty: { color: '#a1a1aa', fontSize: 11, lineHeight: 16 }, bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 36, paddingTop: 6, paddingBottom: 9, backgroundColor: 'rgba(0,0,0,.56)' }, progressRow: { minHeight: 4 }, trackHit: { height: 14, justifyContent: 'center' }, track: { height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,.45)', overflow: 'hidden' }, value: { height: 3, backgroundColor: '#fff' }, times: { minHeight: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, time: { color: 'rgba(255,255,255,.9)', fontSize: 10 }, timeSpacer: { flex: 1 }, liveButton: { marginLeft: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5, backgroundColor: 'rgba(255,255,255,.16)' }, liveButtonActive: { backgroundColor: '#dc2626' }, liveButtonText: { color: '#fff', fontSize: 11, fontWeight: '800' }, actions: { flexDirection: 'row', alignItems: 'center', marginTop: 1 }, action: { minWidth: 32, minHeight: 28, alignItems: 'center', justifyContent: 'center' }, spacer: { flex: 1 } });
