import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Maximize, Pause, Play, RotateCw } from 'lucide-react-native';

type Props = {
  url: string;
  headers?: Record<string, string>;
  onReady?: () => void;
  onError?: (message: string) => void;
  // Gọi khi player native không phát được -> chuyển sang trình phát web (hls.js trong WebView)
  onFallback?: () => void;
};

const HIDE_DELAY = 3500;
const LOAD_TIMEOUT = 10000;

/* ------------------------------------------------------------------ */
/* Wrapper: quản lý lỗi, thử lại và fallback                           */
/* ------------------------------------------------------------------ */
export default function SportsPlayer({ url, headers, onReady, onError, onFallback }: Props) {
  const [reload, setReload] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const retry = () => {
    setError(null);
    setReload((value) => value + 1);
  };

  const handleError = (message: string) => {
    // console.log('[SportsPlayer] native lỗi ->', message, url);
    onError?.(message);
    if (onFallback) {
      onFallback(); // tự chuyển sang hls.js (WebView)
      return;
    }
    setError(message);
  };

  if (error) {
    return (
      <View style={styles.error}>
        <Text style={styles.errorTitle}>Không thể phát trận này</Text>
        <Text style={styles.errorText} numberOfLines={3}>
          {error}
        </Text>
        <Pressable style={styles.retry} onPress={retry}>
          <RotateCw size={16} color="#fff" />
          <Text style={styles.retryText}>Thử lại</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SportsVideo
      key={reload}
      url={url}
      headers={headers}
      contentType="hls"
      onReady={onReady}
      onError={handleError}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Player thật                                                         */
/* ------------------------------------------------------------------ */
type VideoProps = {
  url: string;
  headers?: Record<string, string>;
  contentType?: 'hls';
  onReady?: () => void;
  onError: (message: string) => void;
};

function SportsVideo({ url, headers, contentType, onReady, onError }: VideoProps) {
  const [visible, setVisible] = useState(true);
  const [trackWidth, setTrackWidth] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<VideoView>(null);
  const failedRef = useRef(false);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  onReadyRef.current = onReady;
  onErrorRef.current = onError;

  const headersKey = JSON.stringify(headers ?? {});
  const source = useMemo(() => {
    const h = JSON.parse(headersKey) as Record<string, string>;
    return { uri: url, headers: Object.keys(h).length ? h : undefined, contentType };
  }, [url, headersKey, contentType]);

  const player = useVideoPlayer(source, (instance) => {
    // Mặc định timeUpdate KHÔNG phát sự kiện (interval = 0) -> thời gian/thanh tua đứng yên
    instance.timeUpdateEventInterval = 0.5;
    instance.play();
  });

  const { status, error } = useEvent(player, 'statusChange', { status: player.status });
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const time = useEvent(player, 'timeUpdate', {
    currentTime: 0,
    currentLiveTimestamp: null,
    currentOffsetFromLive: null,
    bufferedPosition: 0,
  });

  const position = time?.currentTime ?? 0;
  const duration = Number.isFinite(player.duration) && player.duration > 0 ? player.duration : 0;
  const liveOffset = time?.currentOffsetFromLive;
  const isLive = duration <= 0;
  const atLiveEdge =
    typeof liveOffset === 'number' && Number.isFinite(liveOffset)
      ? Math.abs(liveOffset) <= 1.5
      : isLive;
  const progress = duration > 0 ? Math.min(1, position / duration) : 0;
  const loading = status === 'loading' || status === 'idle';

  function fail(message: string) {
    if (failedRef.current) return;
    failedRef.current = true;
    onErrorRef.current(message);
  }

  function clearTimer() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }

  function reveal() {
    setVisible(true);
    clearTimer();
    timer.current = setTimeout(() => setVisible(false), HIDE_DELAY);
  }

  function toggleControls() {
    if (visible) {
      setVisible(false);
      clearTimer();
    } else {
      reveal();
    }
  }

  useEffect(() => {
    if (status === 'readyToPlay') {
      onReadyRef.current?.();
      reveal();
    }
    if (status === 'error') {
      // console.log('[SportsPlayer] lỗi:', url, error?.message);
      fail(error?.message || 'Không thể phát trận này');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, error]);

  // Quá thời gian chờ mà chưa phát được -> báo lỗi (và fallback) thay vì quay mãi
  useEffect(() => {
    if (status === 'readyToPlay' || status === 'error') return;
    const t = setTimeout(() => fail('Hết thời gian chờ, luồng không phản hồi'), LOAD_TIMEOUT);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => clearTimer, []);

  function togglePlay() {
    if (player.playing) player.pause();
    else player.play();
    reveal();
  }

  function seekTo(x: number) {
    if (trackWidth > 0 && duration > 0) {
      player.currentTime = Math.max(0, Math.min(duration, (x / trackWidth) * duration));
    }
    reveal();
  }

  function goLive() {
    // Luôn tua TIẾN tới mép live, không phụ thuộc offset âm hay dương
    if (typeof liveOffset === 'number' && Number.isFinite(liveOffset) && Math.abs(liveOffset) > 0) {
      player.seekBy(Math.abs(liveOffset));
    } else if (duration > 0) {
      player.currentTime = duration;
    }
    player.play();
    reveal();
  }

  function timeText(value: number) {
    const seconds = Math.max(0, Math.floor(value));
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const mm = m.toString().padStart(2, '0');
    const ss = s.toString().padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  }

  return (
    <View style={styles.container}>
      <VideoView
        ref={videoRef}
        style={styles.video}
        player={player}
        contentFit="contain"
        nativeControls={isFullscreen}
        onFullscreenEnter={() => setIsFullscreen(true)}
        onFullscreenExit={() => setIsFullscreen(false)}
      />
      <Pressable style={StyleSheet.absoluteFill} onPress={toggleControls} />

      {loading && (
        <View style={styles.loading} pointerEvents="none">
          <ActivityIndicator color="#fff" size="large" />
          <Text style={styles.loadingText}>Đang mở trận đấu...</Text>
        </View>
      )}

      {visible && !loading && (
        <View style={styles.controls} pointerEvents="box-none">
          <View style={styles.center} pointerEvents="box-none">
            <Pressable style={styles.playButton} onPress={togglePlay}>
              {isPlaying ? (
                <Pause size={24} color="#17171c" fill="#17171c" />
              ) : (
                <Play size={24} color="#17171c" fill="#17171c" />
              )}
            </Pressable>
          </View>

          <View style={styles.bottom}>
            {!isLive && (
              <>
                <Pressable
                  style={styles.trackHit}
                  onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
                  onPress={(event) => seekTo(event.nativeEvent.locationX)}
                >
                  <View style={styles.track} pointerEvents="none">
                    <View style={[styles.value, { width: `${progress * 100}%` }]} />
                  </View>
                </Pressable>
                <View style={styles.times}>
                  <Text style={styles.time}>{timeText(position)}</Text>
                  <Text style={styles.time}>{timeText(duration)}</Text>
                </View>
              </>
            )}

            <View style={styles.actions}>
              <Pressable style={styles.action} onPress={togglePlay}>
                {isPlaying ? (
                  <Pause size={20} color="#fff" fill="#fff" />
                ) : (
                  <Play size={20} color="#fff" fill="#fff" />
                )}
              </Pressable>
              <Pressable style={[styles.liveButton, atLiveEdge && styles.liveButtonActive]} onPress={goLive}>
                <Text style={styles.liveButtonText}>LIVE</Text>
              </Pressable>
              <View style={styles.spacer} />
              <Pressable style={styles.action} onPress={() => videoRef.current?.enterFullscreen()}>
                <Maximize size={20} color="#fff" />
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  video: { flex: 1 },
  loading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#000',
  },
  loadingText: { color: '#fff', fontSize: 13 },
  controls: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },  
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', paddingBottom: 18 },  playButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 6,
    backgroundColor: 'rgba(0,0,0,.56)',
  },
  trackHit: { height: 16, justifyContent: 'center' },
  track: { height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,.45)', overflow: 'hidden' },
  value: { height: 3, backgroundColor: '#fff' },
  times: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  time: { color: 'rgba(255,255,255,.9)', fontSize: 10 },
  spacer: { flex: 1 },
  actions: { flexDirection: 'row', alignItems: 'center' },
  action: { minWidth: 32, minHeight: 28, alignItems: 'center', justifyContent: 'center' },
  liveButton: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,.16)',
  },
  liveButtonActive: { backgroundColor: '#dc2626' },
  liveButtonText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  error: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
    backgroundColor: '#050505',
  },
  errorTitle: { color: '#fff', fontSize: 15, fontWeight: '800' },
  errorText: { color: '#d6d6dc', fontSize: 12, textAlign: 'center' },
  retry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#0284c7',
  },
  retryText: { color: '#fff', fontWeight: '700' },
});