import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Dimensions,
  Switch,
} from 'react-native';
import { MovieCard } from '@/components/MovieCard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { getMovieBySlug } from '@/lib/ophim';
import { supabase } from '@/lib/supabase';
import { Movie } from '@/types/movie';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  apiGetGtavnMovieId,
  apiCheckFavorite,
  apiToggleFavorite,
} from '@/lib/authApi';
import {
  ChevronLeft,
  Play,
  Heart,
  Plus,
  Share2,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  RefreshCw,
  Monitor,
  Mic,
  Server,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path as SvgPath } from 'react-native-svg';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { CastMember, getTMDBCast, searchTMDB } from '@/lib/tmdb';
import { WebView } from 'react-native-webview';
import { stashPlayerServers } from '@/lib/playerSession';
import { getCachedMovieBySlug } from '@/lib/ophim';


const { width: SCREEN_WIDTH } = Dimensions.get('window');
const POSTER_WIDTH = SCREEN_WIDTH * 0.44;
const POSTER_HEIGHT = POSTER_WIDTH * 1.5;
const EPISODE_CHUNK_SIZE = 100;
const TABS = ['Tập phim', 'Gallery', 'Trailer', 'Diễn viên', 'Đề xuất'];

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function stripProviderTag(serverName: string): string {
  return serverName.replace(/\s*\[(KK|NC|HT)\]\s*/gi, '').trim();
}
function toSlug(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}
function detectProvider(serverName: string): 'OP' | 'KK' | 'NC' | 'HT' {
  if (/\[HT\]/i.test(serverName)) return 'HT';
  if (/\[NC\]/i.test(serverName)) return 'NC';
  if (/\[KK\]/i.test(serverName)) return 'KK';
  return 'OP';
}

function extractMachineBaseName(serverName: string): string {
  const clean = stripProviderTag(serverName);
  const withoutParenLang = clean.replace(/\((vietsub|thuyet\s*minh|thuyết\s*minh)\)/i, '').trim();
  const withoutPrefixLang = withoutParenLang.replace(/^(vietsub|thuyet\s*minh|thuyết\s*minh)\s*/i, '').trim();
  return withoutPrefixLang || clean;
}

function detectAudioType(serverName: string): 'vietsub' | 'thuyet-minh' | 'default' {
  const plain = stripProviderTag(serverName).toLowerCase();
  if (plain.includes('thuyết minh') || plain.includes('thuyet minh')) return 'thuyet-minh';
  if (plain.includes('lồng tiếng') || plain.includes('long tieng')) return 'thuyet-minh';
  if (plain.includes('vietsub')) return 'vietsub';
  return 'default';
}

type ServerMachine = {
  key: string;
  label: string;
  displayName: string;
  provider: 'OP' | 'KK' | 'NC' | 'HT';
  serverIndexes: number[];
};
export default function MovieDetailScreen() {
  const router = useRouter();
  const { id, resumeTime, resumeEpisode, resumeServer } = useLocalSearchParams<{
    id: string;
    resumeTime?: string;
    resumeEpisode?: string;
    resumeServer?: string;
  }>();
  const { user, tokens } = useAuth();
  const { showToast } = useToast();
  const cachedMovie = id ? getCachedMovieBySlug(id) : null;
  const didAutoResume = useRef(false);
  const [movie, setMovie] = useState<Movie | null>(cachedMovie);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const gtavnMovieIdRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(!cachedMovie);
  const [playerParams, setPlayerParams] = useState<{ url: string; title: string; episode: string; movieId: string; movieSlug: string; serverLabel: string; poster: string; initialTime?: string; serversKey?: string } | null>(null);
  const [infoExpanded, setInfoExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('Tập phim');
  const [selectedServerIdx, setSelectedServerIdx] = useState(0);
  const [selectedMachineIdx, setSelectedMachineIdx] = useState(0);
  const [selectedEpisodeChunkIdx, setSelectedEpisodeChunkIdx] = useState(0);
  const [serverDropdownOpen, setServerDropdownOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [spoiler, setSpoiler] = useState(false);
  const [commentTab, setCommentTab] = useState<'Bình luận' | 'Đánh giá'>('Bình luận');
  const [cast, setCast] = useState<CastMember[]>([]);
  const [castLoading, setCastLoading] = useState(false);
  const [castFetched, setCastFetched] = useState(false);
  const [gallery, setGallery] = useState<{ type: string; file_path: string; aspect_ratio: number }[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryFetched, setGalleryFetched] = useState(false);
  const [suggested, setSuggested] = useState<any[]>([]);
  const [suggestedLoading, setSuggestedLoading] = useState(false);
  const [suggestedFetched, setSuggestedFetched] = useState(false);
  const [upcomingShowtime, setUpcomingShowtime] = useState<{
    date: string;
    time: string | null;
    episodes: string[];
  } | null>(null);
  const [htServers, setHtServers] = useState<any[]>([]);
  const didInitSourceSelection = useRef(false);

  useEffect(() => {
    if (!movie?.slug) return;
    supabase
      .from('ht_servers')
      .select('*')
      .eq('movie_slug', movie.slug)
      .then(({ data }) => {
        if (data && data.length > 0) setHtServers(data);
      });
  }, [movie?.slug]);

  // Khi quay về từ player, reset
  useFocusEffect(useCallback(() => { setPlayerParams(null); }, []));

  // Fetch cast from TMDB when Diễn viên tab is selected
  useEffect(() => {
    if (activeTab !== 'Diễn viên' || !movie || castFetched) return;
    setCastFetched(true);
    setCastLoading(true);
    (async () => {
      try {
        let id = movie.tmdb_id;
        let type = movie.tmdb_type ?? 'movie';
        if (!id) {
          const found = await searchTMDB(movie.title_en || movie.title, movie.year);
          if (found) { id = found.id; type = found.type; }
        }
        if (id) {
          const members = await getTMDBCast(id, type);
          setCast(members);
        }
      } catch { /* ignore */ } finally {
        setCastLoading(false);
      }
    })();
  }, [activeTab, movie, castFetched]);

  // fetch gallery from TMDB when Gallery tab is selected
  useEffect(() => {
    if (activeTab !== 'Gallery' || !movie || galleryFetched) return;
    setGalleryFetched(true);
    setGalleryLoading(true);
    fetch(`https://ophim1.com/v1/api/phim/${movie.slug || id}/images`)
      .then(r => r.json())
      .then(json => {
        if (json?.data?.images) setGallery(json.data.images);
      })
      .catch(() => { })
      .finally(() => setGalleryLoading(false));
  }, [activeTab, movie, galleryFetched]);

  useEffect(() => {
    if (activeTab !== 'Đề xuất' || !movie || suggestedFetched) return;
    setSuggestedFetched(true);
    setSuggestedLoading(true);

    const firstGenreSlug = toSlug(movie.genres?.[0] ?? ''); if (!firstGenreSlug) { setSuggestedLoading(false); return; }

    fetch(`https://ophim1.com/v1/api/the-loai/${firstGenreSlug}?sort_field=modified.time&sort_type=desc&limit=20`)
      .then(r => r.json())
      .then(json => {
        const items: any[] = json?.data?.items ?? [];
        const parseModifiedTime = (value: any): number => {
          const raw = value?.modified?.time ?? value?.modified?.date ?? value?.updated_at;
          if (typeof raw === 'number' && Number.isFinite(raw)) {
            return raw > 1e12 ? raw : raw * 1000;
          }
          if (typeof raw === 'string') {
            const asNum = Number(raw);
            if (Number.isFinite(asNum)) {
              return asNum > 1e12 ? asNum : asNum * 1000;
            }
            const parsed = Date.parse(raw);
            if (Number.isFinite(parsed)) return parsed;
          }
          return 0;
        };
        const filtered = items
          .filter(m => m.slug !== (movie.slug || id))
          .sort((a, b) => parseModifiedTime(b) - parseModifiedTime(a))
          .slice(0, 9);
        setSuggested(filtered.map((item: any) => ({
          ...item,
          title: item.name,
          title_en: item.origin_name ?? '',
          thumb_url: item.thumb_url?.startsWith('http')
            ? item.thumb_url
            : `https://img.ophim.live/uploads/movies/${item.thumb_url}`,
          is_series: item.episode_total > 1,
          episodes: Number(item.episode_total) || 1,
          current_episode: Number(item.episode_current) || 0,
          imdb_rating: 0,
        })));
      })
      .catch(() => { })
      .finally(() => setSuggestedLoading(false));
  }, [activeTab, movie, suggestedFetched]);

  // Lock orientation WHILE showing black screen, THEN navigate → no rotation flash
  useEffect(() => {
    if (!playerParams) return;
    let cancelled = false;
    const go = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const SO = require('expo-screen-orientation');
        await SO.lockAsync(SO.OrientationLock.LANDSCAPE);
      } catch (_) { }
      if (!cancelled) {
        router.push({
          pathname: '/movie/player',
          params: playerParams,
        } as any);
      }
    };
    go();
    return () => { cancelled = true; };
  }, [playerParams]);

  useEffect(() => {
    if (id) {
      loadMovie();
    }
  }, [id]);

  useEffect(() => {
    if (!movie) return;
    checkUpcomingSchedule(movie.slug || id);
  }, [movie]);

  useEffect(() => {
    didInitSourceSelection.current = false;
  }, [movie?.id]);

  useEffect(() => {
    if (movie?.slug !== 'tho-oi') return;
    const htIdx = serverMachines.findIndex(m => m.provider === 'HT');
    if (htIdx !== -1) {
      setSelectedMachineIdx(htIdx);
      setSelectedServerIdx(serverMachines[htIdx].serverIndexes[0] ?? 0);
    }
  }, [movie?.slug]);

  useEffect(() => {
    if (!movie || serverMachines.length === 0) return;

    if (didInitSourceSelection.current) return;

    const preferredMachineIdx = (() => {
      const kkIdx = serverMachines.findIndex((machine) => machine.provider === 'KK');
      if (kkIdx !== -1) return kkIdx;

      const multiSourceIdx = serverMachines.findIndex((machine) => machine.serverIndexes.length > 1);
      if (multiSourceIdx !== -1) return multiSourceIdx;

      const opIdx = serverMachines.findIndex((machine) => machine.provider === 'OP');
      if (opIdx !== -1) return opIdx;

      return 0;
    })();

    setSelectedMachineIdx(preferredMachineIdx);
    setSelectedServerIdx(serverMachines[preferredMachineIdx]?.serverIndexes[0] ?? 0);
    setSelectedEpisodeChunkIdx(0);
    setServerDropdownOpen(false);
    didInitSourceSelection.current = true;
  }, [movie, id, serverMachines]);

  useEffect(() => {
    if (movie?.slug !== 'tho-oi' && movie?.slug !== 'cuu-2026') return;
    const htIdx = serverMachines.findIndex(m => m.provider === 'HT');
    if (htIdx !== -1) {
      setSelectedMachineIdx(htIdx);
      setSelectedServerIdx(serverMachines[htIdx].serverIndexes[0] ?? 0);
    }
  }, [movie?.slug]);


  // const movieServers = useMemo(
  //   () => ((movie?.servers?.length ?? 0) > 0 ? movie!.servers! : [{ name: 'Vietsub #1', episodes: movie?.episodes_data ?? [] }]),
  //   [movie]
  // );

  // ADD FIM THỎ ƠI
  const movieServers = useMemo(() => {
    const base = (movie?.servers?.length ?? 0) > 0
      ? movie!.servers!
      : [{ name: 'Server #1', episodes: movie?.episodes_data ?? [] }];

    if (htServers.length === 0) return base;

    // Group các episode theo server_name
    const grouped = new Map<string, any[]>();
    for (const row of htServers) {
      if (!grouped.has(row.server_name)) grouped.set(row.server_name, []);
      grouped.get(row.server_name)!.push({
        name: row.episode_name,
        slug: row.episode_slug,
        filename: '',
        link_embed: row.link_embed ?? '',
        link_m3u8: row.link_m3u8 ?? '',
      });
    }

    const htServerList = Array.from(grouped.entries()).map(([name, episodes]) => ({
      name,
      episodes,
    }));

    return [...base, ...htServerList];
  }, [movie, htServers]);

  // End
  const serverMachines = useMemo<ServerMachine[]>(() => {
    const grouped = new Map<string, { provider: 'OP' | 'KK' | 'NC' | 'HT'; serverIndexes: number[] }>();

    movieServers.forEach((srv, index) => {
      const provider = detectProvider(srv.name || '');
      const baseName = extractMachineBaseName(srv.name || `Server ${index + 1}`);
      const key = `${provider}:${baseName.toLowerCase()}`;
      const found = grouped.get(key);
      if (found) {
        found.serverIndexes.push(index);
      } else {
        grouped.set(key, { provider, serverIndexes: [index] });
      }
    });

    return Array.from(grouped.entries()).map(([key, value], idx) => ({
      key,
      provider: value.provider,
      label: `Máy chủ ${idx + 1} (${value.provider})`,
      displayName: extractMachineBaseName(movieServers[value.serverIndexes[0]]?.name || `Server ${idx + 1}`),
      serverIndexes: value.serverIndexes,
    }));
  }, [movieServers]);

  useEffect(() => {
    if (id && user && movie) {
      loadGtavnIdAndCheckFavorite();
    } else {
      setIsFavorite(false);
    }
  }, [id, user, movie]);

  // Auto-resume: open player directly when navigated from watch history
  useEffect(() => {
    if (!movie || didAutoResume.current || !resumeTime) return;
    didAutoResume.current = true;
    const servers = (movie.servers?.length ?? 0) > 0
      ? movie.servers!
      : [{ name: 'Vietsub #1', episodes: movie.episodes_data ?? [] }];

    // Find the matching episode across all servers
    let targetUrl = '';
    let targetEpisode = resumeEpisode ?? '';
    let targetServer = resumeServer ?? '';

    outer: for (const srv of servers) {
      if (targetServer && srv.name !== targetServer) continue;
      for (const ep of srv.episodes) {
        if (ep.name === targetEpisode) {
          const preferEmbed = /\[(NC|HT)\]/i.test(srv.name || '');
          targetUrl = preferEmbed
            ? (ep.link_embed || ep.link_m3u8)
            : (ep.link_m3u8 || ep.link_embed);
          targetServer = srv.name;
          break outer;
        }
      }
    }
    // Fallback: first episode if nothing matched
    if (!targetUrl) {
      const firstSrv = servers[0];
      const preferEmbed = /\[(NC|HT)\]/i.test(firstSrv?.name || '');
      targetUrl = preferEmbed
        ? (firstSrv?.episodes?.[0]?.link_embed || firstSrv?.episodes?.[0]?.link_m3u8 || movie.stream_url || '')
        : (firstSrv?.episodes?.[0]?.link_m3u8 || firstSrv?.episodes?.[0]?.link_embed || movie.stream_url || '');
      targetEpisode = firstSrv?.episodes?.[0]?.name ?? '';
      targetServer = firstSrv?.name ?? '';
    }
    if (!targetUrl) return;

    const serversKey = stashPlayerServers(servers as any);

    setPlayerParams({
      url: targetUrl,
      title: movie.title ?? '',
      episode: targetEpisode,
      movieId: gtavnMovieIdRef.current ?? id ?? '',
      movieSlug: id ?? '',
      serverLabel: targetServer,
      poster: movie.thumb_url ?? '',
      serversKey,
      initialTime: String(Math.floor(Number(resumeTime) || 0)),
    });
  }, [movie, resumeTime, resumeEpisode, resumeServer]);

  const checkUpcomingSchedule = async (slug: string) => {
    const today = new Date();
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return d;
    });
    try {
      const results = await Promise.all(
        dates.map((d) => {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return fetch(`https://rophimm.info/baseapi/api/v1/showtimes/by-date/${y}-${m}-${day}`)
            .then((r) => (r.ok ? r.json() : []))
            .catch(() => []);
        })
      );
      for (let i = 0; i < results.length; i++) {
        const matches = (results[i] as any[]).filter((item: any) => item.movie?.slug === slug);
        if (matches.length > 0) {
          const d = dates[i];
          const y = d.getFullYear();
          const mo = String(d.getMonth() + 1).padStart(2, '0');
          const dy = String(d.getDate()).padStart(2, '0');
          setUpcomingShowtime({
            date: `${dy}-${mo}-${y}`,
            time: matches[0].show_time ?? null,
            episodes: matches.map((m: any) => m.episode).filter(Boolean),
          });
          return;
        }
      }
    } catch { }
  };

  const loadMovie = async () => {
    try {
      const ophimMovie = await getMovieBySlug(id);

      if (ophimMovie) {
        setMovie(ophimMovie);
        return;
      }

      if (isUuid(id)) {
        const { data } = await supabase
          .from('movies')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        setMovie(data);
      }
    } catch (error) {
      console.error('Error loading movie:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGtavnIdAndCheckFavorite = async () => {
    try {
      if (!user || !movie) return;
      // Get gtavn movie _id by normalized slug
      let gtavnId = gtavnMovieIdRef.current;
      if (!gtavnId) {
        gtavnId = await apiGetGtavnMovieId(movie.slug || id);
        gtavnMovieIdRef.current = gtavnId;
      }
      if (!gtavnId) return;
      const fav = await apiCheckFavorite(gtavnId);
      setIsFavorite(fav);
    } catch { }
  };

  const openPlayer = (url: string, episodeName?: string, srvLabel?: string, startTime?: number, embedUrl?: string) => {
    console.log('openPlayer called:', { url, embedUrl, srvLabel }); // ← thêm dòng này

    if (!url && !embedUrl) return;

    const isHT = srvLabel?.includes('[HT]') ?? false;
    const isNC = srvLabel?.includes('[NC]') ?? false;
    const shouldPreferEmbed = isHT || isNC;

    let finalUrl = url;
    if (shouldPreferEmbed && embedUrl) {
      finalUrl = embedUrl;
      console.log('finalUrl:', finalUrl);
    } else if (shouldPreferEmbed) {
      // fallback: tìm embed từ movieServers nếu không truyền trực tiếp
      for (const srv of movieServers) {
        if (!srv.name) continue;
        if (isHT && !srv.name.includes('[HT]')) continue;
        if (isNC && !srv.name.includes('[NC]')) continue;
        const ep = srv.episodes?.find(e =>
          e.name === episodeName || e.link_m3u8 === url || e.link_embed === url
        );
        if (ep?.link_embed) {
          finalUrl = ep.link_embed;
          break;
        }
      }
    }

    const srvData = (movie?.servers?.length ?? 0) > 0
      ? movie!.servers!
      : (movie?.episodes_data ? [{ name: srvLabel || 'Vietsub #1', episodes: movie.episodes_data }] : []);

    const serversKey = stashPlayerServers(srvData as any);

    setPlayerParams({
      url: finalUrl,
      title: movie?.title ?? '',
      episode: episodeName ?? '',
      movieId: gtavnMovieIdRef.current ?? id ?? '',
      movieSlug: id ?? '',
      serverLabel: srvLabel ?? '',
      poster: movie?.thumb_url ?? '',
      serversKey,
      ...(startTime && startTime > 0 ? { initialTime: String(Math.floor(startTime)) } : {}),
    });
  };

  const toggleFavorite = async () => {
    if (!user) {
      showToast('Vui lòng đăng nhập để yêu thích phim', 'error');
      return;
    }
    if (favoriteLoading) return;
    try {
      setFavoriteLoading(true);
      const movieSlug = movie?.slug || id;
      let gtavnId = gtavnMovieIdRef.current;
      if (!gtavnId) {
        gtavnId = await apiGetGtavnMovieId(movieSlug);
        gtavnMovieIdRef.current = gtavnId;
      }
      if (!gtavnId) {
        showToast('Không tìm thấy phim trong hệ thống', 'error');
        return;
      }
      const nowFav = await apiToggleFavorite(gtavnId);
      setIsFavorite(nowFav);
      showToast(
        nowFav ? 'Đã thêm vào Yêu thích' : 'Đã xoá khỏi Yêu thích',
        'success'
      );
    } catch (e: any) {
      showToast(e?.message || 'Có lỗi xảy ra', 'error');
    } finally {
      setFavoriteLoading(false);
    }
  };

  const firstServerName = movie?.servers?.[0]?.name ?? '';
  const firstEpisode = movie?.episodes_data?.[0];
  const firstEpisodePreferEmbed = /\[(NC|HT)\]/i.test(firstServerName);
  const firstEpisodeUrl = firstEpisodePreferEmbed
    ? (firstEpisode?.link_embed || firstEpisode?.link_m3u8 || movie?.stream_url || '')
    : (firstEpisode?.link_m3u8 || firstEpisode?.link_embed || movie?.stream_url || '');
  const firstEpisodeName = movie?.episodes_data?.[0]?.name || '';

  const selectedMachine = serverMachines[selectedMachineIdx] ?? serverMachines[0];
  const providerVariantIndexes = serverMachines
    .filter((machine) => machine.provider === (selectedMachine?.provider ?? serverMachines[0]?.provider))
    .flatMap((machine) => machine.serverIndexes);
  const variantIndexes = providerVariantIndexes.length > 0 ? providerVariantIndexes : (selectedMachine?.serverIndexes ?? [0]);
  const effectiveServerIdx =
    variantIndexes.includes(selectedServerIdx) ? selectedServerIdx : (variantIndexes[0] ?? 0);
  const currentEps = movieServers[effectiveServerIdx]?.episodes ?? [];

  const episodeChunks = useMemo(() => {
    if (currentEps.length === 0) return [] as { label: string; episodes: any[] }[];
    const chunks: { label: string; episodes: any[] }[] = [];
    for (let start = 0; start < currentEps.length; start += EPISODE_CHUNK_SIZE) {
      const end = Math.min(start + EPISODE_CHUNK_SIZE, currentEps.length);
      chunks.push({
        label: `${String(start + 1).padStart(2, '0')} - ${String(end).padStart(2, '0')}`,
        episodes: currentEps.slice(start, end),
      });
    }
    return chunks;
  }, [currentEps]);

  const clampedChunkIdx = Math.min(selectedEpisodeChunkIdx, Math.max(episodeChunks.length - 1, 0));
  const visibleEpisodes = episodeChunks.length > 0
    ? (episodeChunks[clampedChunkIdx]?.episodes ?? [])
    : currentEps;

  useEffect(() => {
    setSelectedEpisodeChunkIdx(0);
  }, [effectiveServerIdx]);

  if (playerParams) {
    return <View style={{ flex: 1, backgroundColor: '#000' }} />;
  }

  if (loading || !movie) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[1]}>

        {/* ── Hero section ── */}
        <View style={styles.hero}>
          {/* Blurred BG poster */}
          <Image source={{ uri: movie.poster_url }} style={styles.heroBg} blurRadius={25} />
          <View style={styles.heroDimmer} />

          {/* Back button */}
          <SafeAreaView edges={['top']} style={styles.backWrap}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
              <ChevronLeft size={22} color="#fff" />
            </TouchableOpacity>
          </SafeAreaView>

          {/* Centered poster */}
          <View style={styles.posterWrap}>
            <Image source={{ uri: movie.thumb_url }} style={styles.poster} resizeMode="cover" />
          </View>

          {/* Title block */}
          <Text style={styles.title}>{movie.title}</Text>
          <Text style={styles.titleEn}>{movie.title_en}</Text>

          {/* Thông tin phim toggle */}
          <TouchableOpacity
            style={styles.infoToggle}
            onPress={() => setInfoExpanded((v) => !v)}
            activeOpacity={0.7}
          >
            <Text style={styles.infoToggleText}>Thông tin phim</Text>
            {infoExpanded
              ? <ChevronUp size={14} color="#F5C518" />
              : <ChevronDown size={14} color="#F5C518" />}
          </TouchableOpacity>

          {/* Expandable info */}
          {infoExpanded && (
            <View style={styles.infoBox}>
              <View style={styles.infoBadges}>
                {movie.imdb_rating > 0 && (
                  <View style={[styles.infoBadge, styles.imdbBadge]}>
                    <Text style={styles.imdbText}>IMDb</Text>
                    <Text style={styles.imdbRating}>{movie.imdb_rating}</Text>
                  </View>
                )}
                <View style={styles.infoBadge}><Text style={styles.infoBadgeText}>{movie.year}</Text></View>
                {movie.is_series && (
                  <View style={styles.infoBadge}>
                    <Text style={styles.infoBadgeText}>Tập {movie.current_episode}</Text>
                  </View>
                )}
              </View>

              {(movie.genres?.length ?? 0) > 0 && (
                <View style={styles.genreRow}>
                  {movie.genres!.map((g) => (
                    <View key={g} style={styles.genreTag}>
                      <Text style={styles.genreTagText}>{g}</Text>
                    </View>
                  ))}
                </View>
              )}

              {movie.is_series && (() => {
                const s = movie.status;
                const statusLabel = s === 'completed' ? 'Hoàn tất' : s === 'trailer' ? 'Sắp chiếu' : 'Đang chiếu';
                const statusColor = s === 'completed' ? '#35D68D' : s === 'trailer' ? '#aaa' : '#F5C518';
                return (
                  <View style={styles.statusRow}>
                    <RefreshCw size={13} color={statusColor} />
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {statusLabel}: {movie.current_episode} / {movie.episodes} tập
                    </Text>
                  </View>
                );
              })()}

              <Text style={styles.infoHeading}>Giới thiệu:</Text>
              <Text style={styles.infoBody}>{movie.description}</Text>

              {!!movie.duration_text && (
                <Text style={styles.infoMeta}>
                  <Text style={styles.infoMetaLabel}>Thời lượng: </Text>{movie.duration_text}
                </Text>
              )}
              {!!movie.country && (
                <Text style={styles.infoMeta}>
                  <Text style={styles.infoMetaLabel}>Quốc gia: </Text>{movie.country}
                </Text>
              )}
              {!!movie.director && (
                <Text style={styles.infoMeta}>
                  <Text style={styles.infoMetaLabel}>Đạo diễn: </Text>{movie.director}
                </Text>
              )}
            </View>
          )}

          {/* Upcoming schedule banner */}
          {upcomingShowtime && (
            <LinearGradient
              colors={['#6B21A8', '#DB2777']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.scheduleBanner}
            >
              <Image
                source={{ uri: 'https://thiaphim.net/images/alarm.gif' }}
                style={styles.alarmIcon}
              />
              <Text style={styles.scheduleText}>
                <Text style={styles.scheduleBold}>{movie.title}</Text>
                {(upcomingShowtime.episodes ?? []).length > 0
                  ? ` — ${(upcomingShowtime.episodes ?? []).join(' & ')}`
                  : ''}{' sẽ phát sóng'}
                {upcomingShowtime.time ? ` ${upcomingShowtime.time}` : ''}{' ngày '}
                <Text style={styles.scheduleBold}>{upcomingShowtime.date}</Text>
                {'. Các bạn nhớ đón xem nhé 😘'}
              </Text>
            </LinearGradient>
          )}

          {/* Big watch button */}
          <TouchableOpacity
            style={[styles.watchBtnLarge, movie.status === 'trailer' && { opacity: 0.4 }]}
            activeOpacity={movie.status === 'trailer' ? 1 : 0.85}
            disabled={movie.status === 'trailer'}
            onPress={() => openPlayer(firstEpisodeUrl, firstEpisodeName, movie.servers?.[0]?.name ?? '')}
          >
            <LinearGradient
              colors={['#FECF59', '#FFF09A']}
              start={{ x: 0, y: 1 }}
              end={{ x: 1, y: 0 }}
              style={styles.watchBtnGradient}
            >
              <Play size={18} color="#1a1a1a" fill="#1a1a1a" strokeWidth={0} />
              <Text style={styles.watchBtnText}>Xem Ngay</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Action icons */}
          <View style={styles.actionRow}>
            {/* Yêu thích */}
            <TouchableOpacity style={styles.actionItem} onPress={toggleFavorite} activeOpacity={0.7}>
              <Svg width={22} height={22} viewBox="0 0 20 20">
                <SvgPath
                  d="M10 18.1432L1.55692 9.82794C0.689275 8.97929 0.147406 7.85276 0.0259811 6.64517C-0.0954433 5.43759 0.211298 4.22573 0.892612 3.22133C4.99987 -2.24739 10 4.10278 10 4.10278C10 4.10278 15.0001 -2.24739 19.1074 3.22133C19.7887 4.22573 19.974 5.43759 19.8526 7.85276 19.3107 8.97929 18.4431 9.82794 10 18.1432L10 18.1432Z"
                  fill={isFavorite ? '#e53e3e' : '#fff'}
                />
              </Svg>
              <Text style={styles.actionLabel}>Yêu thích</Text>
            </TouchableOpacity>

            {/* Thêm vào */}
            <TouchableOpacity style={styles.actionItem} activeOpacity={0.7}>
              <Svg width={22} height={22} viewBox="0 0 100 100">
                <SvgPath
                  d="M89.7273 41.6365H58.3635V10.2727C58.3635 6.81018 55.5534 4 52.0908 4H47.9092C44.4466 4 41.6365 6.81018 41.6365 10.2727V41.6365H10.2727C6.81018 41.6365 4 44.4466 4 47.9092V52.0908C4 55.5534 6.81018 58.3635 10.2727 58.3635H41.6365V89.7273C41.6365 93.1898 44.4466 96 47.9092 96H52.0908C55.5534 96 58.3635 93.1898 58.3635 89.7273V58.3635H89.7273C93.1898 58.3635 96 55.5534 96 52.0908V47.9092C96 44.4466 93.1898 41.6365 89.7273 41.6365Z"
                  fill="#fff"
                />
              </Svg>
              <Text style={styles.actionLabel}>Thêm vào</Text>
            </TouchableOpacity>

            {/* Chia sẻ */}
            <TouchableOpacity style={styles.actionItem} activeOpacity={0.7}>
              <Svg width={22} height={22} viewBox="0 0 17 17">
                <SvgPath
                  d="M16.3628 0.651489C15.946 0.223669 15.3291 0.0642849 14.7538 0.232058L1.34002 4.13277C0.733102 4.30139 0.302926 4.78541 0.187045 5.4003C0.0686637 6.02609 0.482166 6.82049 1.02239 7.15268L5.2166 9.73051C5.6678 9.99475 6.20201 9.92848 6.55799 9.56945L11.3608 4.73676C11.6083 4.4851 12.0027 4.4851 12.2445 4.73676C12.4862 4.98003 12.4862 5.37429 12.2445 5.62595L7.43334 10.4595C7.07653 10.8177 7.00984 11.3755 7.27245 11.8084L9.83516 16.0446C10.1353 16.548 10.6522 16.8332 11.2191 16.8332C11.2858 16.8332 11.3608 16.8332 11.4275 16.8248C12.0777 16.7409 12.5946 16.2963 12.7864 15.6671L16.763 2.2705C16.9381 1.70007 16.7797 1.07931 16.3628 0.651489Z"
                  fill="#fff"
                />
              </Svg>
              <Text style={styles.actionLabel}>Chia sẻ</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Tab bar (sticky) ── */}
        <View style={styles.tabBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarContent}>
            {TABS.map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── Tab content ── */}
        <View style={styles.tabContent}>
          {/* Ngoại trừ phim THỎ ƠI */}
          {activeTab === 'Tập phim' && (movie.status !== 'trailer' || movie.slug === 'tho-oi') && (() => {
            return (
              <View>
                {/* Server dropdown */}
                {/* Tầng 1: Provider chips */}
                {(() => {
                  const providers = Array.from(new Set(serverMachines.map(m => m.provider)));
                  const activeMachine = serverMachines[selectedMachineIdx] ?? serverMachines[0];
                  const activeProvider = activeMachine?.provider ?? providers[0];

                  return (
                    <View>
                      <View style={styles.serverRow}>
                        <Server size={15} color="rgba(255,255,255,0.5)" />
                        <Text style={styles.serverLabel}>MÁY CHỦ :</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.machineChipRow}>
                          {providers.map((provider) => {
                            const isActive = provider === activeProvider;
                            return (
                              <TouchableOpacity
                                key={provider}
                                style={[styles.machineChip, isActive && styles.machineChipActive]}
                                onPress={() => {
                                  // Tìm machine đầu tiên của provider này
                                  const firstMachineIdx = serverMachines.findIndex(m => m.provider === provider);
                                  if (firstMachineIdx !== -1) {
                                    setSelectedMachineIdx(firstMachineIdx);
                                    setSelectedServerIdx(serverMachines[firstMachineIdx].serverIndexes[0] ?? 0);
                                  }
                                }}
                                activeOpacity={0.75}
                              >
                                <Text style={[styles.machineChipText, isActive && styles.machineChipTextActive]}>
                                  {provider}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>
                    </View>
                  );
                })()}

                {/* Source chips in selected machine */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.sourceRow}
                >
                  {variantIndexes.map((srvIdx) => {
                    const server = movieServers[srvIdx];
                    const audioType = detectAudioType(server?.name || '');
                    const isActive = srvIdx === effectiveServerIdx;
                    const displayName = stripProviderTag(server?.name || `Server ${srvIdx + 1}`);
                    return (
                      <TouchableOpacity
                        key={srvIdx}
                        style={[styles.sourceChip, isActive && styles.sourceChipActive]}
                        onPress={() => setSelectedServerIdx(srvIdx)}
                        activeOpacity={0.75}
                      >
                        {audioType === 'thuyet-minh'
                          ? <Mic size={14} color={isActive ? '#fff' : 'rgba(255,255,255,0.7)'} />
                          : <Monitor size={14} color={isActive ? '#fff' : 'rgba(255,255,255,0.7)'} />}
                        <Text style={[styles.sourceChipText, isActive && styles.sourceChipTextActive]}>{displayName}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>


                {/* Thông báo cho server KK - Text đơn giản */}
                {(selectedMachine?.provider === 'KK' || selectedMachine?.provider === 'NC') && (
                  <Text style={styles.kkWarningText}>
                    {selectedMachine?.provider === 'KK'
                      ? '⚠️ KK có quảng cáo giữa phim (15p,...). Shop sẽ khắc phục sớm. Mong thông cảm!'
                      : '⚠️ NC có quảng cáo mặc định lúc ~2 phút đầu video. Mong bạn thông cảm!'}
                  </Text>
                )}

                {episodeChunks.length > 1 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chunkRow}
                  >
                    {episodeChunks.map((chunk, idx) => {
                      const isActive = idx === clampedChunkIdx;
                      return (
                        <TouchableOpacity
                          key={`${effectiveServerIdx}:${chunk.label}:${idx}`}
                          style={[styles.chunkChip, isActive && styles.chunkChipActive]}
                          onPress={() => setSelectedEpisodeChunkIdx(idx)}
                          activeOpacity={0.75}
                        >
                          <Text style={[styles.chunkChipText, isActive && styles.chunkChipTextActive]}>{chunk.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}

                {/* Episode grid */}
                {currentEps.length > 0 ? (
                  <View style={styles.episodeGrid}>
                    {visibleEpisodes.map((ep, idx) => (
                      <TouchableOpacity
                        key={`${effectiveServerIdx}:${clampedChunkIdx}:${idx}:${ep.slug || ep.name}`}
                        style={styles.episodeBtn}
                        activeOpacity={0.75}
                        onPress={() => openPlayer(
                          ep.link_m3u8 || ep.link_embed,
                          ep.name,
                          movieServers[effectiveServerIdx]?.name ?? '',
                          undefined,
                          ep.link_embed  // truyền thêm embedUrl
                        )}                      >
                        <Play size={10} color="#fff" fill="#fff" />
                        <Text style={styles.episodeBtnText}>{!isNaN(Number(ep.name)) ? 'Tập ' + ep.name : ep.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <View style={styles.episodeGrid}>
                    <TouchableOpacity
                      style={styles.episodeBtn}
                      activeOpacity={0.75}
                      onPress={() => openPlayer(firstEpisodeUrl, 'Tập 1', movieServers?.[effectiveServerIdx]?.name ?? '')}
                    >
                      <Play size={10} color="#fff" fill="#fff" />
                      <Text style={styles.episodeBtnText}>Tập 1</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })()}




          {activeTab === 'Diễn viên' && (
            <View>
              <Text style={styles.castSectionTitle}>Diễn viên</Text>
              {castLoading ? (
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyText}>Đang tải diễn viên...</Text>
                </View>
              ) : cast.length > 0 ? (
                <View style={styles.castGrid}>
                  {cast.map((member) => (
                    <View key={member.id} style={styles.castCard}>
                      {member.profile_url ? (
                        <Image source={{ uri: member.profile_url }} style={styles.castPhoto} resizeMode="cover" />
                      ) : (
                        <View style={[styles.castPhoto, styles.castPhotoPlaceholder]}>
                          <Text style={styles.castPhotoPlaceholderText}>{member.name.charAt(0)}</Text>
                        </View>
                      )}
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.75)']}
                        style={styles.castOverlay}
                      >
                        <Text style={styles.castName} numberOfLines={2}>{member.name}</Text>
                        {!!member.character && (
                          <Text style={styles.castCharacter} numberOfLines={1}>{member.character}</Text>
                        )}
                      </LinearGradient>
                    </View>
                  ))}
                </View>
              ) : (movie.actors?.length ?? 0) > 0 ? (
                <View style={styles.castGrid}>
                  {movie.actors!.map((a) => (
                    <View key={a} style={styles.castCard}>
                      <View style={[styles.castPhoto, styles.castPhotoPlaceholder]}>
                        <Text style={styles.castPhotoPlaceholderText}>{a.charAt(0)}</Text>
                      </View>
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.75)']}
                        style={styles.castOverlay}
                      >
                        <Text style={styles.castName} numberOfLines={2}>{a}</Text>
                      </LinearGradient>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyText}>Chưa có thông tin diễn viên</Text>
                </View>
              )}
            </View>
          )}


          {activeTab === 'Gallery' && (
            <View>
              {galleryLoading ? (
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyText}>Đang tải ảnh...</Text>
                </View>
              ) : gallery.length > 0 ? (
                <View style={styles.castGrid}>
                  {gallery.slice(0, 5).map((img, idx) => {
                    const baseUrl = img.aspect_ratio > 1
                      ? 'https://image.tmdb.org/t/p/w780'
                      : 'https://image.tmdb.org/t/p/w342';
                    const isLandscape = img.aspect_ratio > 1;
                    return (
                      <View
                        key={idx}
                        style={[
                          styles.castCard,
                          isLandscape && { width: '100%', aspectRatio: img.aspect_ratio }
                        ]}
                      >
                        <Image
                          source={{ uri: baseUrl + img.file_path }}
                          style={isLandscape
                            ? { width: '100%', aspectRatio: img.aspect_ratio, borderRadius: 8 }
                            : styles.castPhoto
                          }
                          resizeMode="cover"
                        />

                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyText}>Chưa có ảnh</Text>
                </View>
              )}
            </View>
          )}

          {/* {activeTab === 'Trailer' && (
            <View>
              {movie.trailer_url ? (() => {
                // Extract YouTube video ID
                const match = movie.trailer_url.match(
                  /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/
                );
                const videoId = match?.[1];
                if (!videoId) return (
                  <View style={styles.emptyWrap}>
                    <Text style={styles.emptyText}>Không hỗ trợ định dạng trailer này</Text>
                  </View>
                );
                return (
                  <View style={styles.trailerWrap}>
                    <YoutubePlayer
                      height={220}
                      play={false}
                      videoId={videoId}
                    />
                  </View>
                );
              })() : (
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyText}>Chưa có trailer</Text>
                </View>
              )}
            </View>
          )} */}


          {activeTab === 'Đề xuất' && (
            <View>
              {suggestedLoading ? (
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyText}>Đang tải...</Text>
                </View>
              ) : suggested.length > 0 ? (
                <View style={styles.suggestGrid}>
                  {suggested.map((item) => (
                    <View key={item.slug} style={styles.suggestCardWrap}>
                      <MovieCard
                        movie={item}
                        width={(SCREEN_WIDTH - 32 - 16) / 3} />
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyText}>Không có đề xuất</Text>
                </View>
              )}
            </View>
          )}
          {/* ── Comment section ── */}
          <View style={styles.commentSection}>
            <View style={styles.commentHeader}>
              <Svg width={21} height={21} viewBox="0 0 21 21">
                <SvgPath
                  d="M14.499 0.5H6.50109C3.19363 0.5 0.502686 3.19095 0.502686 6.4984V11.1638C0.502686 14.3596 3.01468 16.9796 6.16784 17.1532V19.9338C6.16784 20.2461 6.42244 20.5 7.13358 20.337L7.75875 19.7085C9.40031 18.0666 11.5834 17.1622 13.9054 17.1622H14.499C17.8064 17.1622 20.4974 14.4713 20.4974 11.1638V6.4984C20.4974 3.19095 17.8064 0.5 14.499 0.5ZM6.16784 10.1641C5.4327 10.1641 4.83486 9.56625 4.83486 8.83111C4.83486 8.09597 5.43211 7.49813 6.16784 7.49813C6.90358 7.49813 7.50082 8.09597 7.50082 8.83111C7.50082 9.56625 6.90265 10.1641 6.16784 10.1641ZM10.5 10.1641C9.76488 10.1641 9.16704 9.56625 9.16704 8.83111C9.16704 8.09597 9.76488 7.49813 10.5 7.49813C11.2348 7.49813 11.833 8.09597 11.833 8.83111C11.833 9.56625 11.2352 10.1641 10.5 10.1641ZM14.8322 10.1641C14.0971 10.1641 13.4992 9.56625 13.4992 8.83111C13.4992 8.09597 14.0971 7.49813 14.8322 7.49813C15.5673 7.49813 16.1652 8.09597 16.1652 8.83111C16.1652 9.56625 15.567 10.1641 14.8322 10.1641Z"
                  fill="#fff"
                />
              </Svg>
              <Text style={styles.commentTitle}>Bình luận</Text>
              <View style={styles.commentTabs}>
                {(['Bình luận', 'Đánh giá'] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.commentTabBtn, commentTab === t && styles.commentTabBtnActive]}
                    onPress={() => setCommentTab(t)}
                  >
                    <Text style={[styles.commentTabText, commentTab === t && styles.commentTabTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Text style={styles.loginPrompt}>
              Vui lòng <Text style={styles.loginLink}>đăng nhập</Text> để tham gia bình luận.
            </Text>

            <View style={styles.inputWrap}>
              <Text style={styles.charCount}>{comment.length} / 1000</Text>
              <TextInput
                style={styles.commentInput}
                placeholder="Viết bình luận"
                placeholderTextColor="rgba(255,255,255,0.3)"
                multiline
                maxLength={1000}
                value={comment}
                onChangeText={setComment}
              />
              <View style={styles.inputFooter}>
                <View style={styles.spoilerRow}>
                  <Switch
                    value={spoiler}
                    onValueChange={setSpoiler}
                    trackColor={{ true: Colors.primary, false: '#333' }}
                    thumbColor="#fff"
                    style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                  />
                  <Text style={styles.spoilerLabel}>Tiết lộ?</Text>
                </View>
                <TouchableOpacity style={styles.sendBtn} activeOpacity={0.8}>
                  <Text style={styles.sendBtnText}>Gửi</Text>
                  <Share2 size={14} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Empty comments */}
            <View style={styles.noComments}>
              <MessageCircle size={44} color="rgba(255,255,255,0.2)" />
              <Text style={styles.noCommentsText}>Chưa có bình luận nào</Text>
            </View>
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: Colors.textSecondary, fontSize: 14 },

  // Hero
  hero: { minHeight: 420 },
  heroBg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', opacity: 0.45 },
  heroDimmer: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(7,17,58,0.72)' },
  backWrap: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  backBtn: {
    margin: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  posterWrap: {
    alignSelf: 'center',
    marginTop: 80,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
  },
  poster: { width: POSTER_WIDTH, height: POSTER_HEIGHT },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
  },
  titleEn: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 4,
    paddingHorizontal: 20,
  },

  // Info toggle
  infoToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    marginBottom: 4,
  },
  infoToggleText: { color: '#F5C518', fontSize: 13, fontWeight: '600' },

  // Info box
  infoBox: { paddingHorizontal: 18, paddingBottom: 4 },
  infoBadges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 10 },
  infoBadge: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  infoBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  imdbBadge: { backgroundColor: '#F5C518', borderColor: '#F5C518', flexDirection: 'row', gap: 4, alignItems: 'center' },
  imdbText: { color: '#1a1a1a', fontSize: 11, fontWeight: '800' },
  imdbRating: { color: '#1a1a1a', fontSize: 11, fontWeight: '700' },
  genreRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  genreTag: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  genreTagText: { color: '#fff', fontSize: 12 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  statusText: { color: '#F5C518', fontSize: 13 },
  infoHeading: { color: '#fff', fontWeight: '700', fontSize: 14, marginBottom: 4 },
  infoBody: { color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 20, marginBottom: 10 },
  infoMeta: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 4 },
  infoMetaLabel: { color: '#fff', fontWeight: '700' },

  // Schedule banner
  scheduleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 18,
    marginBottom: 10,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  alarmIcon: {
    width: 36,
    height: 36,
  },
  scheduleText: {
    flex: 1,
    color: '#fff',
    fontSize: 12,
    lineHeight: 18,
  },
  scheduleBold: {
    fontWeight: '700',
  },

  // Watch button
  watchBtnLarge: {
    marginHorizontal: 18,
    marginTop: 12,
    marginBottom: 16,
    borderRadius: 32,
    overflow: 'hidden',
  },
  watchBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 32,
  },
  watchBtnText: { color: '#1a1a1a', fontSize: 16, fontWeight: '800' },

  // Action row
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
    paddingBottom: 20,
  },
  actionItem: { alignItems: 'center', gap: 6 },
  actionLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },

  // Tab bar
  tabBar: { backgroundColor: Colors.background, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  tabBarContent: { paddingHorizontal: 14 },
  tabItem: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabItemActive: { borderBottomColor: '#F5C518' },
  tabText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#F5C518' },

  // Tab content
  tabContent: { paddingHorizontal: 16, paddingTop: 14 },
  serverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  serverLabel: {
    color: '#fff',        // trắng nổi hơn
    fontSize: 14,         // to hơn
    fontWeight: '700',
  },
  machineChip: {
    backgroundColor: '#1A2134',
    borderRadius: 6,      // vuông hơn, đổi từ 20 xuống 6
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  machineChipRow: {
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },

  machineChipActive: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  machineChipText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    fontWeight: '700',
  },
  machineChipTextActive: {
    color: '#1a1a1a',
  },
  sourceRow: {
    gap: 8,
    paddingBottom: 10,
  },
  sourceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1A2134',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sourceChipActive: {
    backgroundColor: '#222B42',
    borderColor: 'rgba(255,255,255,0.3)',
  },
  sourceChipText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '700',
  },
  sourceChipTextActive: {
    color: '#fff',
  },
  chunkRow: {
    gap: 8,
    paddingBottom: 10,
  },
  chunkChip: {
    backgroundColor: '#1A2134',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chunkChipActive: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  chunkChipText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '700',
  },
  chunkChipTextActive: {
    color: '#102114',
  },

  episodeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  episodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.cardBackground,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    width: (SCREEN_WIDTH - 32 - 16) / 3,
    justifyContent: 'center',
  },
  episodeBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  // Cast grid
  castSectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
  },
  castGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 16,
  },
  castCard: {
    width: (SCREEN_WIDTH - 32 - 24) / 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  castPhoto: {
    width: '100%',
    aspectRatio: 2 / 3,
  },
  castPhotoPlaceholder: {
    backgroundColor: Colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  castPhotoPlaceholderText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 24,
    fontWeight: '700',
  },
  castOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 6,
    paddingTop: 18,
    paddingBottom: 6,
    alignItems: 'center',
  },
  castName: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
    textAlign: 'center',
  },
  castCharacter: {
    color: '#F5A623',
    fontSize: 10,
    textAlign: 'center',
  },
  emptyWrap: { paddingVertical: 30, alignItems: 'center' },
  emptyText: { color: Colors.textSecondary, fontSize: 14 },

  // Comments
  commentSection: { marginTop: 28, paddingBottom: 32 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  commentTitle: { color: '#fff', fontSize: 16, fontWeight: '700', flex: 1 },
  commentTabs: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  commentTabBtn: { paddingHorizontal: 12, paddingVertical: 5 },
  commentTabBtnActive: { backgroundColor: 'rgba(255,255,255,0.15)' },
  commentTabText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  commentTabTextActive: { color: '#fff' },
  loginPrompt: { color: Colors.textSecondary, fontSize: 13, marginBottom: 12 },
  loginLink: { color: '#F5C518', fontWeight: '600' },
  inputWrap: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: 20,
  },
  charCount: { color: 'rgba(255,255,255,0.3)', fontSize: 11, textAlign: 'right', paddingTop: 8, paddingRight: 12 },
  commentInput: {
    color: '#fff',
    fontSize: 14,
    padding: 12,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  spoilerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  spoilerLabel: { color: Colors.textSecondary, fontSize: 13 },
  sendBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sendBtnText: { color: Colors.primary, fontSize: 14, fontWeight: '700' },
  noComments: { alignItems: 'center', gap: 10, paddingVertical: 24 },
  noCommentsText: { color: 'rgba(255,255,255,0.35)', fontSize: 13 },
  // Warning KK có quang cáo giữa phim
  kkWarningText: {
    color: '#F5C518',
    fontSize: 12.5,
    fontWeight: '500',
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
    lineHeight: 18,
  },
  suggestGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 16,
  },
  suggestCardWrap: {
    width: (SCREEN_WIDTH - 32 - 16) / 3,
    overflow: 'hidden',
  },
  suggestCard: {
    width: (SCREEN_WIDTH - 32 - 8) / 2,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: Colors.cardBackground,
  },
  suggestThumb: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  suggestOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingTop: 24,
    paddingBottom: 8,
  },
  suggestYearBadge: {
    backgroundColor: 'rgba(245,197,24,0.9)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  suggestYearText: {
    color: '#1a1a1a',
    fontSize: 10,
    fontWeight: '700',
  },
  suggestTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  suggestOrigin: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 10,
    marginTop: 2,
  },
  trailerWrap: {
    width: '100%',
    height: 220,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#000',
  },
  trailerPlayer: {
    flex: 1,
    backgroundColor: '#000',
  },
});
