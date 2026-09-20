import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { WebView } from 'react-native-webview';
import { ChevronLeft, RefreshCw, Server } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
/* ------------------------------------------------------------------ */
/*  Cấu hình                                                           */
/* ------------------------------------------------------------------ */

const SITE = 'https://film4k.net/';
const API_BASE = 'https://film4k.net/api/sports';
const WEB_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

// Giá trị cookie "session" của tài khoản clone (chỉ phần value, không kèm "session=")
// Hết hạn khoảng 26/09/2026: khi đó thay giá trị mới hoặc dùng nút "Đăng nhập" trong app
const FILM4K_SESSION =
  'eyJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6Im5ob3hjdXRodW9pQGdtYWlsLmNvbSIsIm5hbWUiOm51bGwsImltYWdlIjpudWxsLCJzdWIiOiI2YTg5MGYyMWVhZTYxMDEwYzNlYmM2YmMiLCJpYXQiOjE3ODc4MzA2NzYsImV4cCI6MTc5MDQyMjY3Nn0.kEV3eaNfs9A8BXQ5FSD86vtVEhL8Pk_TjX4B_DBFy4c';

// Chạy trước khi trang load để WebView coi như đã đăng nhập
const COOKIE_SCRIPT = `
  try {
    document.cookie = 'session=${FILM4K_SESSION}; path=/; max-age=2592000; secure; samesite=lax';
  } catch (e) {}
  true;
`;

class AuthError extends Error {}

/* ------------------------------------------------------------------ */
/*  WebView phiên film4k: gọi API bên trong trang để mang theo cookie   */
/* ------------------------------------------------------------------ */

function useSiteBridge() {
  const webRef = useRef<WebView>(null);
  const loadedRef = useRef(false);
  const waitersRef = useRef<(() => void)[]>([]);
  const idRef = useRef(0);
  const pendingRef = useRef(new Map<number, (r: { status: number; body: string }) => void>());

  const onLoadEnd = useCallback(() => {
    loadedRef.current = true;
    waitersRef.current.splice(0).forEach((fn) => fn());
  }, []);

  const onMessage = useCallback((e: any) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      const done = pendingRef.current.get(msg.id);
      if (done) {
        pendingRef.current.delete(msg.id);
        done(msg);
      }
    } catch {
      /* bỏ qua tin nhắn lạ */
    }
  }, []);

  // Quay về trang chủ film4k (sau khi đăng nhập xong) để fetch cùng origin
  const goHome = useCallback(() => {
    loadedRef.current = false;
    webRef.current?.injectJavaScript(`window.location.href = ${JSON.stringify(SITE)}; true;`);
  }, []);

  const get = useCallback(async (path: string): Promise<any> => {
    if (!loadedRef.current) {
      await new Promise<void>((r) => waitersRef.current.push(r));
    }
    const id = ++idRef.current;
    const result = await new Promise<{ status: number; body: string }>((resolve) => {
      pendingRef.current.set(id, resolve);
      setTimeout(() => {
        if (pendingRef.current.delete(id)) resolve({ status: 0, body: 'timeout' });
      }, 20000);
      webRef.current?.injectJavaScript(`
        fetch(${JSON.stringify(path)}, { credentials: 'include', headers: { Accept: 'application/json' } })
          .then(function (r) {
            return r.text().then(function (t) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ id: ${id}, status: r.status, body: t }));
            });
          })
          .catch(function (e) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ id: ${id}, status: 0, body: String(e) }));
          });
        true;
      `);
    });

    let json: any = null;
    try {
      json = JSON.parse(result.body);
    } catch {
      /* không phải JSON */
    }

    const needAuth =
      result.status === 401 ||
      result.status === 403 ||
      (json && typeof json.error === 'string' && /sign in|log in|login/i.test(json.error));
    if (needAuth) throw new AuthError('Cần đăng nhập');
    if (result.status < 200 || result.status >= 300 || json === null) {
      throw new Error(`HTTP ${result.status}`);
    }
    return json;
  }, []);

  return { webRef, get, goHome, onLoadEnd, onMessage };
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Match = {
  slug: string;
  home: string;
  away: string;
  homeFlag: string;
  awayFlag: string;
  homeScore: number;
  awayScore: number;
  league: string;
  leagueFlag: string;
  timestamp: number;
  time: string;
  isLive: boolean;
};

type Section = { title: string; data: Match[] };

type StreamServer = {
  key: string;
  label: string;
  url: string;
};

const matchTitle = (m: Match) => (m.away ? `${m.home} vs ${m.away}` : m.home);

/* ------------------------------------------------------------------ */
/*  Parse dữ liệu                                                      */
/* ------------------------------------------------------------------ */

const str = (v: any): string => (typeof v === 'string' ? v.trim() : '');

function pickStr(obj: any, keys: string[]): string {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'object' && v) {
      const inner = str(v.name) || str(v.title);
      if (inner) return inner;
    }
  }
  return '';
}

function formatTime(raw: any): string {
  if (!raw) return '';
  let d: Date | null = null;
  if (typeof raw === 'number') d = new Date(raw > 1e12 ? raw : raw * 1000);
  else if (typeof raw === 'string') {
    const n = Number(raw);
    d = Number.isFinite(n) && n > 0 ? new Date(n > 1e12 ? n : n * 1000) : new Date(raw);
  }
  if (!d || isNaN(d.getTime())) return typeof raw === 'string' ? raw : '';
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${hh}:${mi} · ${dd}/${mm}`;
}

function normalizeMatch(raw: any): Match {
  return {
    slug: str(raw?.slug),
    home: str(raw?.home),
    away: str(raw?.away),
    homeFlag: str(raw?.homeFlag),
    awayFlag: str(raw?.awayFlag),
    homeScore: Number(raw?.homeScore) || 0,
    awayScore: Number(raw?.awayScore) || 0,
    league: str(raw?.league),
    leagueFlag: str(raw?.leagueFlag),
    timestamp: Number(raw?.time) || 0,
    time: formatTime(raw?.time),
    isLive: raw?.live === true,
  };
}

// Trận LIVE lên đầu, phần còn lại gom theo ngày (giờ máy)
function parseHome(json: any): Section[] {
  const seen = new Set<string>();
  const uniq = (arr: any): Match[] =>
    (Array.isArray(arr) ? arr : [])
      .map(normalizeMatch)
      .filter((m) => {
        if (!m.slug || seen.has(m.slug)) return false;
        seen.add(m.slug);
        return true;
      });

  const sections: Section[] = [];

  const live = uniq(json?.live);
  if (live.length) sections.push({ title: 'Đang trực tiếp', data: live });

  const all = (json?.groups ?? []).flatMap((g: any) => g?.matches ?? []);
  const rest = uniq(all).sort((a, b) => a.timestamp - b.timestamp);

  const byDay = new Map<string, Match[]>();
  for (const m of rest) {
    const d = new Date(m.timestamp);
    const key = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(m);
  }
  byDay.forEach((data, key) => sections.push({ title: `Ngày ${key}`, data }));

  return sections;
}

const URL_KEY = /(url|link|src|embed|stream|m3u8|iframe|hls)/i;
const NAME_KEYS = ['name', 'title', 'label', 'server', 'serverName', 'source', 'quality'];

// Dự phòng: duyệt toàn bộ JSON, gom mọi link stream kèm tên server
function collectStreams(node: any, out: StreamServer[] = [], seen = new Set<string>()): StreamServer[] {
  if (!node) return out;
  if (Array.isArray(node)) {
    node.forEach((n) => collectStreams(n, out, seen));
    return out;
  }
  if (typeof node !== 'object') return out;

  for (const [k, v] of Object.entries(node)) {
    if (typeof v === 'string' && /^https?:\/\//i.test(v) && URL_KEY.test(k)) {
      // bỏ ảnh
      if (/\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(v)) continue;
      if (seen.has(v)) continue;
      seen.add(v);
      const label = pickStr(node, NAME_KEYS) || `Server ${out.length + 1}`;
      out.push({ key: `${out.length}:${v}`, label, url: v });
    }
  }
  Object.values(node).forEach((v) => {
    if (v && typeof v === 'object') collectStreams(v, out, seen);
  });
  return out;
}

function toAbsolute(u: string): string {
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith('//')) return `https:${u}`;
  return SITE.replace(/\/$/, '') + (u.startsWith('/') ? u : `/${u}`);
}

// Đọc channels[] của /live/{slug}: [{ label, url }], url có thể là đường dẫn tương đối
function parseStreams(json: any): StreamServer[] {
  if (!Array.isArray(json?.channels)) return collectStreams(json);

  const seen = new Set<string>();
  const out: StreamServer[] = [];
  json.channels.forEach((c: any, i: number) => {
    const raw = str(c?.url) || str(c?.link) || str(c?.src);
    if (!raw) return;
    const url = toAbsolute(raw);
    if (seen.has(url)) return;
    seen.add(url);
    out.push({
      key: `${i}:${url}`,
      label: str(c?.label) || str(c?.name) || `Server ${out.length + 1}`,
      url,
    });
  });
  return out;
}

/* ------------------------------------------------------------------ */
/*  Player                                                             */
/* ------------------------------------------------------------------ */

function buildSource(url: string) {
  if (/\.m3u8(\?|$)/i.test(url)) {
    const html = `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body{margin:0;height:100%;background:#000}video{width:100%;height:100%;background:#000}</style>
<script src="https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js"></script>
</head><body>
<video id="v" controls autoplay playsinline></video>
<script>
  var v = document.getElementById('v');
  var src = ${JSON.stringify(url)};
  if (window.Hls && Hls.isSupported()) {
    var hls = new Hls({ lowLatencyMode: true, liveSyncDurationCount: 3, maxBufferLength: 30 });
    hls.loadSource(src);
    hls.attachMedia(v);
    hls.on(Hls.Events.MANIFEST_PARSED, function () { v.play().catch(function () {}); });
    hls.on(Hls.Events.ERROR, function (_, d) {
      if (!d.fatal) return;
      if (d.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
      else if (d.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
      else hls.destroy();
    });
  } else {
    v.src = src;
    v.play().catch(function () {});
  }
</script>
</body></html>`;
    return { html, baseUrl: SITE };
  }
  return { uri: url };
}

// Player duy nhất: m3u8 -> hls.js trong WebView, link khác (trang embed) -> mở thẳng trong WebView
// Script chạy trong trang: báo về app khi video vào/thoát fullscreen
const FULLSCREEN_SCRIPT = `
  (function () {
    function post(on) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ fs: on }));
    }
    function check() {
      post(!!(document.fullscreenElement || document.webkitFullscreenElement));
    }
    document.addEventListener('fullscreenchange', check);
    document.addEventListener('webkitfullscreenchange', check);
    var v = document.querySelector('video');
    if (v) {
      v.addEventListener('webkitbeginfullscreen', function () { post(true); });
      v.addEventListener('webkitendfullscreen', function () { post(false); });
    }
  })();
  true;
`;

// Player duy nhất: m3u8 -> hls.js trong WebView, link khác (trang embed) -> mở thẳng trong WebView
function WebPlayer({ url }: { url: string }) {
  const source = useMemo(() => buildSource(url), [url]);
  const [loading, setLoading] = useState(true);

  const onMessage = useCallback((e: any) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (typeof msg.fs === 'boolean') {
        ScreenOrientation.lockAsync(
          msg.fs
            ? ScreenOrientation.OrientationLock.LANDSCAPE
            : ScreenOrientation.OrientationLock.PORTRAIT_UP
        ).catch(() => {});
      }
    } catch {
      /* bỏ qua tin nhắn lạ */
    }
  }, []);

  // Rời màn hình thì trả về dọc
  useEffect(
    () => () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    },
    []
  );

  return (
    <View style={styles.playerBox}>
      <WebView
        key={url}
        source={source as any}
        style={styles.webview}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        allowsFullscreenVideo
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        mixedContentMode="always"
        setSupportMultipleWindows={false}
        injectedJavaScript={FULLSCREEN_SCRIPT}
        onMessage={onMessage}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
      />
      {loading ? (
        <View style={styles.playerLoading}>
          <ActivityIndicator size="large" color="#E7C85A" />
        </View>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Màn hình chính                                                     */
/* ------------------------------------------------------------------ */

export function StandingsScreen() {
  const router = useRouter();
  const site = useSiteBridge();
  const [showLogin, setShowLogin] = useState(false);
  const [needLogin, setNeedLogin] = useState(false);

  const [sections, setSections] = useState<Section[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const [selected, setSelected] = useState<Match | null>(null);
  const [servers, setServers] = useState<StreamServer[]>([]);
  const [serverIdx, setServerIdx] = useState(0);
  const [streamLoading, setStreamLoading] = useState(false);
  const [streamError, setStreamError] = useState('');
  const reqRef = useRef(0);

  const loadMatches = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setListLoading(true);
      setListError('');
      setNeedLogin(false);
      try {
        // kiểm tra phiên trước, tránh nhầm lỗi mạng với chưa đăng nhập
        const me = await site.get('https://film4k.net/api/auth/me').catch((e) => {
          if (e instanceof AuthError) throw e;
          return null;
        });
        if (me && !me.user) throw new AuthError('Cần đăng nhập');

        const json = await site.get(`${API_BASE}/home`);
        const list = parseHome(json);
        setSections(list);
        if (list.length === 0) setListError('Hiện chưa có trận nào.');
      } catch (e: any) {
        if (e instanceof AuthError) {
          setNeedLogin(true);
          setListError('Bạn cần đăng nhập film4k.net để xem trực tiếp.');
        } else {
          setListError(`Không tải được danh sách trận (${e?.message ?? 'lỗi mạng'}).`);
        }
      } finally {
        setListLoading(false);
        setRefreshing(false);
      }
    },
    [site.get]
  );

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  const openMatch = useCallback(
    async (m: Match) => {
      const reqId = ++reqRef.current;
      setSelected(m);
      setServers([]);
      setServerIdx(0);
      setStreamError('');
      setStreamLoading(true);
      try {
        const json = await site.get(`${API_BASE}/live/${encodeURIComponent(m.slug)}`);
        if (reqId !== reqRef.current) return;
        const list = parseStreams(json);
        setServers(list);
        if (list.length === 0) setStreamError('Trận này chưa có link phát.');
      } catch (e: any) {
        if (reqId !== reqRef.current) return;
        if (e instanceof AuthError) {
          setNeedLogin(true);
          setStreamError('Bạn cần đăng nhập film4k.net để xem trận này.');
        } else {
          setStreamError(`Không tải được stream (${e?.message ?? 'lỗi mạng'}).`);
        }
      } finally {
        if (reqId === reqRef.current) setStreamLoading(false);
      }
    },
    [site.get]
  );

  const closeMatch = useCallback(() => {
    reqRef.current++;
    setSelected(null);
    setServers([]);
    setStreamError('');
  }, []);

  const onBack = () => {
    if (showLogin) setShowLogin(false);
    else if (selected) closeMatch();
    else router.back();
  };

  const renderMatch = ({ item }: { item: Match }) => {
    const showScore = !!item.away && (item.isLive || item.homeScore > 0 || item.awayScore > 0);
    return (
      <Pressable
        onPress={() => openMatch(item)}
        style={({ pressed }) => [styles.matchCard, pressed && styles.pressed]}
      >
        <View style={styles.matchMeta}>
          {!!item.leagueFlag && (
            <Image source={{ uri: item.leagueFlag }} style={styles.leagueIcon} contentFit="contain" />
          )}
          <Text style={styles.cardLeague} numberOfLines={1}>
            {item.league}
          </Text>
          <Text style={styles.matchTime}>{item.time}</Text>
          {item.isLive ? (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.teamRow}>
          {!!item.homeFlag && (
            <Image source={{ uri: item.homeFlag }} style={styles.teamLogo} contentFit="contain" />
          )}
          <Text style={styles.teamName} numberOfLines={1}>
            {item.home}
          </Text>
          {showScore ? <Text style={styles.teamScore}>{item.homeScore}</Text> : null}
        </View>

        {!!item.away && (
          <View style={styles.teamRow}>
            {!!item.awayFlag && (
              <Image source={{ uri: item.awayFlag }} style={styles.teamLogo} contentFit="contain" />
            )}
            <Text style={styles.teamName} numberOfLines={1}>
              {item.away}
            </Text>
            {showScore ? <Text style={styles.teamScore}>{item.awayScore}</Text> : null}
          </View>
        )}
      </Pressable>
    );
  };

  const currentServer = servers[serverIdx];

  return (
    <SafeAreaView style={styles.wrapper} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.iconBtn}>
          <ChevronLeft size={22} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {selected ? matchTitle(selected) : 'Thể thao trực tiếp'}
        </Text>
        {selected ? (
          <View style={styles.iconBtn} />
        ) : (
          <Pressable onPress={() => loadMatches(true)} style={styles.iconBtn}>
            <RefreshCw size={18} color="#fff" />
          </Pressable>
        )}
      </View>

      {selected ? (
        <ScrollView contentContainerStyle={styles.detailContent}>
          {streamLoading ? (
            <View style={[styles.playerBox, styles.center]}>
              <ActivityIndicator size="large" color="#E7C85A" />
            </View>
          ) : currentServer ? (
            <WebPlayer url={currentServer.url} />
          ) : (
            <View style={[styles.playerBox, styles.center]}>
              <Text style={styles.placeholderText}>{streamError || 'Không có stream.'}</Text>
              {needLogin ? (
                <Pressable onPress={() => setShowLogin(true)} style={styles.loginBtn}>
                  <Text style={styles.loginBtnText}>Đăng nhập</Text>
                </Pressable>
              ) : null}
            </View>
          )}

          {servers.length > 1 ? (
            <View style={styles.serverSection}>
              <View style={styles.serverTitleRow}>
                <Server size={15} color="rgba(255,255,255,0.6)" />
                <Text style={styles.serverTitle}>Chọn server</Text>
              </View>
              <View style={styles.serverWrap}>
                {servers.map((s, idx) => {
                  const active = idx === serverIdx;
                  return (
                    <Pressable
                      key={s.key}
                      onPress={() => setServerIdx(idx)}
                      style={[styles.serverChip, active && styles.serverChipActive]}
                    >
                      <Text style={[styles.serverChipText, active && styles.serverChipTextActive]}>
                        {s.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          <View style={styles.detailInfo}>
            <Text style={styles.detailTitle}>{matchTitle(selected)}</Text>
            {!!selected.league && <Text style={styles.matchLeague}>{selected.league}</Text>}
            {!!selected.time && <Text style={styles.matchTime}>{selected.time}</Text>}
          </View>
        </ScrollView>
      ) : listLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#E7C85A" />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(m) => m.slug}
          renderItem={renderMatch}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadMatches(true)} tintColor="#E7C85A" />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.placeholderText}>{listError || 'Hiện chưa có trận nào.'}</Text>
              {needLogin ? (
                <Pressable onPress={() => setShowLogin(true)} style={styles.loginBtn}>
                  <Text style={styles.loginBtnText}>Đăng nhập film4k</Text>
                </Pressable>
              ) : null}
            </View>
          }
        />
      )}

      {/* WebView phiên film4k: ẩn khi chạy nền, hiện toàn màn hình khi cần đăng nhập */}
      <View
        style={showLogin ? styles.loginOverlay : styles.bridgeHidden}
        pointerEvents={showLogin ? 'auto' : 'none'}
      >
        {showLogin ? (
          <View style={styles.header}>
            <Pressable onPress={() => setShowLogin(false)} style={styles.iconBtn}>
              <ChevronLeft size={22} color="#fff" />
            </Pressable>
            <Text style={styles.headerTitle}>Đăng nhập film4k</Text>
            <Pressable
              onPress={() => {
                setShowLogin(false);
                site.goHome();
                loadMatches();
              }}
              style={styles.doneBtn}
            >
              <Text style={styles.doneBtnText}>Xong</Text>
            </Pressable>
          </View>
        ) : null}
        <WebView
          ref={site.webRef}
          source={{ uri: SITE }}
          style={styles.webview}
          userAgent={WEB_UA}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          injectedJavaScriptBeforeContentLoaded={COOKIE_SCRIPT}
          injectedJavaScriptBeforeContentLoadedForMainFrameOnly
          setSupportMultipleWindows={false}
          onLoadEnd={site.onLoadEnd}
          onMessage={site.onMessage}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#0A0A0F' },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  placeholderText: { color: '#8A8A93', fontSize: 13, textAlign: 'center' },
  pressed: { opacity: 0.85 },

  // Danh sách
  listContent: { paddingHorizontal: 12, paddingBottom: 24, flexGrow: 1 },
  sectionHeader: { color: '#fff', fontSize: 15, fontWeight: '800', paddingTop: 14, paddingBottom: 8 },
  matchCard: {
    backgroundColor: '#14141C',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 12,
    marginBottom: 10,
    gap: 10,
  },
  matchMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  leagueIcon: { width: 16, height: 16 },
  cardLeague: { flex: 1, color: '#8A8A93', fontSize: 12 },
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  teamLogo: { width: 26, height: 26 },
  teamName: { flex: 1, color: '#fff', fontSize: 15, fontWeight: '700' },
  teamScore: { color: '#fff', fontSize: 16, fontWeight: '800', minWidth: 24, textAlign: 'right' },
  matchLeague: { color: '#8A8A93', fontSize: 12 },
  matchTime: { color: '#E7C85A', fontSize: 12, fontWeight: '600' },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(229,9,26,0.18)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#e5091a' },
  liveText: { color: '#ff4d5a', fontSize: 11, fontWeight: '800' },

  // Chi tiết trận
  detailContent: { paddingBottom: 24 },
  playerBox: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' },
  webview: { flex: 1, backgroundColor: '#000' },
  playerLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  serverSection: { paddingHorizontal: 12, paddingTop: 14, gap: 10 },
  serverTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  serverTitle: { color: '#fff', fontSize: 14, fontWeight: '700' },
  serverWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  serverChip: {
    backgroundColor: '#1A2134',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  serverChipActive: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  serverChipText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '700' },
  serverChipTextActive: { color: '#102114' },
  detailInfo: { paddingHorizontal: 12, paddingTop: 16, gap: 4 },
  detailTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },

  // Đăng nhập
  loginBtn: {
    marginTop: 14,
    backgroundColor: '#E7C85A',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  loginBtnText: { color: '#1A2550', fontSize: 14, fontWeight: '800' },
  loginOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0A0A0F', zIndex: 20 },  bridgeHidden: { position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden' },
  doneBtn: { paddingHorizontal: 12, height: 36, alignItems: 'center', justifyContent: 'center' },
  doneBtnText: { color: '#E7C85A', fontSize: 15, fontWeight: '800' },
});

export default StandingsScreen;