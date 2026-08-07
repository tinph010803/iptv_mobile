import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  InteractionManager,
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/colors';
import { GENRES } from '@/constants/filters';
import { getHomeMovies, getMoviesByCountry, getMoviesByType } from '@/lib/ophim';
import { prefetchMovieBySlug, seedMovieDetailCache } from '@/lib/ophim';
import { getTop10Films } from '@/lib/top10Films';
import { Movie } from '@/types/movie';
import { FeaturedCarousel } from '@/components/FeaturedCarousel';
import { MovieSection } from '@/components/MovieSection';
import { ChevronDown, X, Play, Menu, Film } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { getWatchHistory, WatchHistoryEntry, formatTime } from '@/lib/watchHistory';
import { useAuth } from '@/context/AuthContext';
import { HTMoviesSection } from '@/components/HTMoviesSection';

const TOPICS_PREVIEW = 4;

const TOP10_CARD_WIDTH = 110;
const TOP10_CARD_MARGIN = 10;
const TOP10_ITEM_SIZE = TOP10_CARD_WIDTH + TOP10_CARD_MARGIN;
const TOP10_LIST_PADDING = 16;
const HOME_CACHE_KEY = '@home_screen_cache_v2';
const HOME_CACHE_TTL_MS = 15 * 60 * 1000;
const HOME_CACHE_MAX_STALE_MS = 2 * 60 * 60 * 1000;

type HomeCachePayload = {
  featuredMovies: Movie[];
  top10Movies: Movie[];
  sectionMovies: Record<string, Movie[]>;
  cachedAt: number;
};

type HomeCacheLoadResult = {
  payload: HomeCachePayload;
  isFresh: boolean;
};

const Top10Card = memo(function Top10Card({ item, index }: { item: Movie; index: number }) {
  const router = useRouter();
  const targetId = item.slug || item.id;

  const handlePressIn = useCallback(() => {
    if (!targetId) return;
    seedMovieDetailCache(item);
    prefetchMovieBySlug(targetId);
  }, [targetId, item]);

  const handlePress = useCallback(() => {
    if (targetId) router.push({ pathname: '/movie/[id]', params: { id: targetId } });
  }, [targetId]);
  const LT_PATTERN = /lồng tiếng|lồng\s*tiếng|long\s*tieng|dubbed/i;
  const TM_PATTERN = /thuyết minh|thuyet\s*minh/i;
  const SUB_PATTERN = /vietsub|phụ đề|phu\s*de/i;
  const parseEpisodeNumber = (value?: string | number): number => {
    const match = String(value ?? '').match(/\d+/);
    return match ? Number(match[0]) : 0;
  };
  const total = item.episodes;
  const isSeries = total > 1;
  const dubbedServer = item.servers?.find(s => LT_PATTERN.test(s.name));
  const thuyetMinhServer = item.servers?.find(s => TM_PATTERN.test(s.name));
  const subbedServer = item.servers?.find(s => !LT_PATTERN.test(s.name) && !TM_PATTERN.test(s.name));
  const dubbedLast = item.last_episodes?.find(ep => LT_PATTERN.test(ep.server_name));
  const thuyetMinhLast = item.last_episodes?.find(ep => TM_PATTERN.test(ep.server_name));
  const subbedLast = item.last_episodes?.find(ep => !LT_PATTERN.test(ep.server_name) && !TM_PATTERN.test(ep.server_name));
  const hasLangLt = !!(item.lang_key?.includes('lt') || LT_PATTERN.test(item.lang ?? ''));
  const hasLangTm = !!(item.lang_key?.includes('tm') || TM_PATTERN.test(item.lang ?? ''));
  const hasLangSub = !!(item.lang_key?.includes('vs') || SUB_PATTERN.test(item.lang ?? ''));
  const hasLT = !!dubbedServer || hasLangLt || !!dubbedLast;
  const hasTM = !!thuyetMinhServer || hasLangTm || !!thuyetMinhLast;
  const hasDubbed = hasLT || hasTM;
  const hasSubbed = !!subbedServer || !!subbedLast || hasLangSub;
  const subbedLastCount = parseEpisodeNumber(subbedLast?.name);
  const dubbedLastCount = parseEpisodeNumber(dubbedLast?.name);
  const thuyetMinhLastCount = parseEpisodeNumber(thuyetMinhLast?.name);
  const subbedCount = (subbedServer?.episodes?.length ?? 0) > 0 ? subbedServer!.episodes.length : (subbedLastCount || item.current_episode);
  const dubbedCount = (dubbedServer?.episodes?.length ?? 0) > 0 ? dubbedServer!.episodes.length : (dubbedLastCount || item.current_episode);
  const thuyetMinhCount = (thuyetMinhServer?.episodes?.length ?? 0) > 0 ? thuyetMinhServer!.episodes.length : (thuyetMinhLastCount || item.current_episode);
  const audioPrefix = hasTM ? 'TM' : 'LT';
  const audioCount = hasTM ? thuyetMinhCount : dubbedCount;
  const subbedText = isSeries ? `PĐ.${subbedCount}/${total}` : `PĐ.${subbedCount}`;
  const dubbedText = isSeries ? `${audioPrefix}.${audioCount}/${total}` : `${audioPrefix}.${audioCount}`;

  return (
    <TouchableOpacity
      style={styles.top10Card}
      activeOpacity={0.75}
      onPressIn={handlePressIn}
      onPress={handlePress}
    >
      <View style={styles.top10ImageWrap}>
        <Image source={{ uri: item.thumb_url }} style={styles.top10Poster} resizeMode="cover" fadeDuration={0} />
        {!!item.imdb_rating && item.imdb_rating > 0 && (
          <View style={styles.top10ImdbBadge}>
            <Text style={styles.top10ImdbText}>IMDb {item.imdb_rating}</Text>
          </View>
        )}
        <View style={styles.top10RankWrap}>
          <Text style={styles.top10Rank}>{index + 1}</Text>
        </View>
        {item.status === 'trailer' ? (
          <View style={styles.episodeBadgeSmall}>
            <Text style={styles.episodeBadgeSmallText}>Sắp Chiếu</Text>
          </View>
        ) : (
          <View style={styles.top10BadgesContainer}>
            {hasDubbed && (
              <View style={[styles.top10BadgeInner, styles.top10LtBadge]}>
                <Text style={styles.episodeBadgeSmallText}>{dubbedText}</Text>
              </View>
            )}
            {(hasSubbed || !hasDubbed) && (
              <View style={styles.top10BadgeInner}>
                <Text style={styles.episodeBadgeSmallText}>{subbedText}</Text>
              </View>
            )}
          </View>
        )}
      </View>
      <Text style={styles.top10Title} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.top10TitleEn} numberOfLines={1}>{item.title_en}</Text>
    </TouchableOpacity>
  );
});

const FILTER_OPTIONS = ['Đề xuất', 'Phim bộ', 'Phim lẻ', 'Thể loại'];

const TOPICS = [
  { slug: 'hot-ran-ran', name: 'Hot Rần Rần', color: '#e23341', thumbnail: 'https://sf-static.onflixcdn.pics/images/pic/1770999672_Sarah_onflix.webp', filter: { sort_by: 'views', status: 'ongoing' } },
  { slug: 'dang-chieu-phat', name: 'Đang Chiếu Phát', color: '#b5420a', thumbnail: 'https://img.upanhnhanh.com/545e7a4895048bd8fe1219cb09eb1e54', filter: { status: 'ongoing' } },
  { slug: 'phim-truyen-hinh-trung-quoc-dai-luc', name: 'Trung Quốc', color: '#1a6b3a', thumbnail: 'https://img.upanhnhanh.com/88c5903ca2638698c9a176e5d1effa1f', filter: { country_code: 'trung-quoc', type: 'phim-bo' } },
  { slug: 'hoat-hinh-chon-loc', name: 'Hoạt hình', color: '#1a3a6b', thumbnail: 'https://img.upanhnhanh.com/5f4e92805e8b87a3c539df9112ac7312', filter: { q: 'hoạt hình' } },
  { slug: 'phim-hanh-dong', name: 'Hành Động', color: '#8b1a1a', thumbnail: 'https://img.upanhnhanh.com/92b005dcea75c446ec09c7f334d6fe07', filter: { genre_ids: 'hanh-dong', sort_by: 'release_date' } },
  { slug: 'phim-co-trang', name: 'Cổ Trang', color: '#4a2a0a', thumbnail: 'https://img.upanhnhanh.com/a5e63f88be0d159bc0318c2fcb6623dc', filter: { genre_ids: 'co-trang', sort_by: 'release_date' } },
  { slug: 'phim-han-quoc', name: 'Hàn Quốc', color: '#1a2a5c', thumbnail: 'https://img.upanhnhanh.com/94571cba98cfe7b5468d2d99e213bb97', filter: { country_code: 'han-quoc' } },
  { slug: 'thanh-xuan', name: 'Thanh xuân', color: '#0a2a4a', thumbnail: 'https://img.upanhnhanh.com/cd87839b695dc11c3fccf59bc03cca6f', filter: { q: 'thanh xuân' } },
  { slug: 'chua-lanh-tam-hon', name: 'Chữa Lành', color: '#5c1a1a', thumbnail: 'https://img.upanhnhanh.com/bebf83030f11150f0153b14c794bc4d7', filter: { q: 'chữa lành' } },
  { slug: 'phim-tinh-cam', name: 'Tình Cảm', color: '#6b1a3a', thumbnail: 'https://img.upanhnhanh.com/91867964fa50f964b1445cbce6b95fb9', filter: { genre_ids: 'tinh-cam', sort_by: 'release_date' } },
  { slug: 'phim-4k', name: 'Phim 4K', color: '#1a1a1a', thumbnail: 'https://img.upanhnhanh.com/d8440580bcd377b6668c98c5f5038d29', filter: { quality: '4K' } },
  { slug: 'phim-cong-so', name: 'Công Sở', color: '#0a1a2a', thumbnail: 'https://img.upanhnhanh.com/255832b967f88f9009ddd08ecc90465b', filter: { q: 'công sở' } },
  { slug: 'phim-hinh-su', name: 'Hình Sự', color: '#0a1a3a', thumbnail: 'https://img.upanhnhanh.com/8cbe701c177f4ba1f34c791f4daa21f6', filter: { genre_ids: 'hinh-su', sort_by: 'release_date' } },
  { slug: 'phim-kinh-di', name: 'Kinh Dị', color: '#1a0a2a', thumbnail: 'https://img.upanhnhanh.com/1df553af88c75c5042a141828c78e6d3', filter: { genre_ids: 'kinh-di', sort_by: 'release_date' } },
  { slug: 'dien-anh-au-my', name: 'Điện ảnh Âu Mỹ', color: '#5c1a1a', thumbnail: 'https://img.upanhnhanh.com/341674e9ef645c10a9a5b86d7a572fd0', filter: { country_code: 'au-my', type: 'phim-le' } },
];

const TopicCard = memo(function TopicCard({ topic }: { topic: typeof TOPICS[number] }) {
  const router = useRouter();
  const handlePress = useCallback(() => {
    router.push({
      pathname: '/category/[slug]',
      params: { slug: topic.slug, title: topic.name, filter: JSON.stringify(topic.filter) },
    });
  }, [router, topic]);
  return (
    <TouchableOpacity style={[styles.topicCard, { backgroundColor: topic.color }]} activeOpacity={0.82} onPress={handlePress}>
      {/* tc-thumb: ảnh bên phải */}
      <Image
        source={{ uri: topic.thumbnail }}
        style={styles.topicThumb}
        resizeMode="cover"
        fadeDuration={0}
      />
      {/* tc-overlay: màu chủ đạo che trái, gradient mờ dần sang phải */}
      <LinearGradient
        colors={[topic.color, `${topic.color}cc`, `${topic.color}00`]}
        locations={[0, 0.35, 0.62]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.topicOverlay}
      />
      {/* tc-glow: ánh sáng dưới */}
      <LinearGradient
        colors={['transparent', `${topic.color}cc`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.topicGlow}
      />
      {/* tc-body: tên chủ đề */}
      <View style={styles.topicBody}>
        <Text style={styles.topicTitle} numberOfLines={2}>{topic.name}</Text>
      </View>
    </TouchableOpacity>
  );
});

type SectionConfig = {
  key: string;
  title: string;
  fetchFn: () => Promise<Movie[]>;
  navSlug: string;
  navType: 'country' | 'list';
};

const SECTION_CONFIGS: SectionConfig[] = [
  { key: 'korean', title: 'Phim Hàn Quốc mới', fetchFn: () => getMoviesByCountry('han-quoc'), navSlug: 'han-quoc', navType: 'country' },
  { key: 'chinese', title: 'Phim Trung Quốc mới', fetchFn: () => getMoviesByCountry('trung-quoc'), navSlug: 'trung-quoc', navType: 'country' },
  { key: 'western', title: 'Phim US-UK mới', fetchFn: () => getMoviesByCountry('au-my'), navSlug: 'au-my', navType: 'country' },
  { key: 'theater', title: 'Phim Điện Ảnh Mới Coóng', fetchFn: () => getMoviesByType('phim-le'), navSlug: 'phim-le', navType: 'list' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedFilter, setSelectedFilter] = useState('Đề xuất');
  const [featuredMovies, setFeaturedMovies] = useState<Movie[]>([]);
  const [top10Movies, setTop10Movies] = useState<Movie[]>([]);
  const [sectionMovies, setSectionMovies] = useState<Record<string, Movie[]>>({});
  const [genreModalVisible, setGenreModalVisible] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [genreSort, setGenreSort] = useState<'moi-nhat' | 'xem-nhieu'>('moi-nhat');
  const [watchHistory, setWatchHistory] = useState<WatchHistoryEntry[]>([]);
  const [homeReady, setHomeReady] = useState(false);
  const [showTrailers, setShowTrailers] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadHomeCache = useCallback(async (): Promise<HomeCacheLoadResult | null> => {
    try {
      const raw = await AsyncStorage.getItem(HOME_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as HomeCachePayload;
      if (!parsed || typeof parsed !== 'object') return null;
      if (typeof parsed.cachedAt !== 'number') return null;

      const age = Date.now() - parsed.cachedAt;
      if (age > HOME_CACHE_MAX_STALE_MS) {
        await AsyncStorage.removeItem(HOME_CACHE_KEY);
        return null;
      }

      return {
        payload: parsed,
        isFresh: age <= HOME_CACHE_TTL_MS,
      };
    } catch {
      return null;
    }
  }, []);

  const saveHomeCache = useCallback(async (payload: HomeCachePayload) => {
    try {
      await AsyncStorage.setItem(HOME_CACHE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore cache write failures.
    }
  }, []);

  // Load trailer preference from AsyncStorage
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('showTrailers');
        if (stored !== null) {
          setShowTrailers(stored === 'true');
        }
      } catch (e) {
        console.error('Error loading trailer preference:', e);
      }
    })();
  }, []);

  // Save trailer preference to AsyncStorage
  const toggleTrailers = useCallback(async () => {
    const newState = !showTrailers;
    setShowTrailers(newState);
    try {
      await AsyncStorage.setItem('showTrailers', String(newState));
    } catch (e) {
      console.error('Error saving trailer preference:', e);
    }
  }, [showTrailers]);

  // Reload watch history every time screen is focused
  useFocusEffect(useCallback(() => {
    if (!user) { setWatchHistory([]); return; }
    getWatchHistory(user.id).then((items) => setWatchHistory(items.slice(0, 20)));
  }, [user]));

  useEffect(() => {
    let cancelled = false;

    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();

    (async () => {
      // Hydrate from cache first so Home appears quickly.
      const cache = await loadHomeCache();
      if (!cancelled && cache) {
        setFeaturedMovies(cache.payload.featuredMovies ?? []);
        setTop10Movies(cache.payload.top10Movies ?? []);
        setSectionMovies(cache.payload.sectionMovies ?? {});
        setHomeReady(true);
      }
    })();

    const readinessTimer = setTimeout(() => {
      if (!cancelled) setHomeReady(true);
    }, 1200);

    const refreshTask = InteractionManager.runAfterInteractions(async () => {
      const tasks = [
        getHomeMovies(),
        getTop10Films(),
        ...SECTION_CONFIGS.map((section) => section.fetchFn()),
      ];

      const results = await Promise.allSettled(tasks);
      if (cancelled) return;

      const featured = results[0].status === 'fulfilled' ? results[0].value.slice(0, 8) : [];
      const top10 = results[1].status === 'fulfilled' ? results[1].value.slice(0, 10) : [];

      const nextSections: Record<string, Movie[]> = {};
      SECTION_CONFIGS.forEach((section, index) => {
        const res = results[index + 2];
        nextSections[section.key] = res.status === 'fulfilled' ? res.value.slice(0, 12) : [];
        if (res.status === 'rejected') {
          console.error(`Error loading section ${section.key}:`, res.reason);
        }
      });

      if (featured.length) setFeaturedMovies(featured);
      if (top10.length) setTop10Movies(top10);
      setSectionMovies(nextSections);

      const hasAnyData =
        featured.length > 0 ||
        top10.length > 0 ||
        Object.values(nextSections).some((items) => items.length > 0);

      if (hasAnyData) {
        saveHomeCache({
          featuredMovies: featured,
          top10Movies: top10,
          sectionMovies: nextSections,
          cachedAt: Date.now(),
        });
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(readinessTimer);
      refreshTask.cancel();
    };
  }, [fadeAnim, loadHomeCache, saveHomeCache]);

  const renderSection = useCallback(
    ({ item }: { item: SectionConfig }) => {
      const movies = sectionMovies[item.key];
      if (!movies?.length) return null;
      return (
        <MovieSection
          title={item.title}
          movies={movies}
          onSeeAll={() =>
            router.push({
              pathname: '/category/[slug]',
              params: { slug: item.navSlug, title: item.title, type: item.navType },
            })
          }
        />
      );
    },
    [sectionMovies, router],
  );

  const sectionKeyExtractor = useCallback((item: SectionConfig) => item.key, []);

  const handleFilterPress = useCallback((option: string) => {
    if (option === 'Phim bộ') {
      router.push({ pathname: '/category/[slug]', params: { slug: 'phim-bo', title: 'Phim bộ', type: 'list' } } as any);
    } else if (option === 'Phim lẻ') {
      router.push({ pathname: '/category/[slug]', params: { slug: 'phim-le', title: 'Phim lẻ', type: 'list' } } as any);
    } else if (option === 'Thể loại') {
      setSelectedGenres([]);
      setGenreSort('moi-nhat');
      setGenreModalVisible(true);
    } else {
      setSelectedFilter(option);
    }
  }, [router]);

  const handleGenreApply = useCallback(() => {
    setGenreModalVisible(false);
    const primary = selectedGenres[0];
    if (!primary) return;
    const genreObj = GENRES.find((g) => g.slug === primary);
    const genreNames = selectedGenres
      .map((s) => GENRES.find((g) => g.slug === s)?.name ?? s)
      .join(',');
    router.push({
      pathname: '/category/[slug]',
      params: {
        slug: primary,
        title: 'Thể loại',
        type: 'genre',
        genres: genreNames,
        sort: genreSort,
      },
    } as any);
  }, [selectedGenres, genreSort, router]);

  const renderTop10Card = useCallback(
    ({ item, index }: { item: Movie; index: number }) => <Top10Card item={item} index={index} />,
    []
  );

  const top10GetItemLayout = useCallback(
    (_: any, index: number) => ({
      length: TOP10_ITEM_SIZE,
      offset: TOP10_LIST_PADDING + index * TOP10_ITEM_SIZE,
      index,
    }),
    []
  );

  const renderHistoryCard = useCallback((entry: WatchHistoryEntry) => {
    const hasPlayableProgress = entry.time > 0 && entry.duration > 0;
    const isEmbedHistory = /\[(NC|HT)\]/i.test(entry.serverLabel || '') && !hasPlayableProgress;
    const progress = entry.duration > 0 ? Math.min(entry.time / entry.duration, 1) : 0;
    return (
      <TouchableOpacity
        key={entry.movieSlug}
        style={styles.historyCard}
        activeOpacity={0.8}
        onPress={() =>
          router.push({
            pathname: '/movie/[id]',
            params: {
              id: entry.movieSlug,
              resumeTime: String(entry.time),
              resumeEpisode: entry.episodeName,
              resumeServer: entry.serverLabel,
            },
          } as any)
        }
      >
        <View style={styles.historyPosterWrap}>
          <Image source={{ uri: entry.posterUrl }} style={styles.historyPoster} resizeMode="cover" />
          <View style={styles.historyPlayOverlay}>
            <Play size={20} color="#fff" fill="#fff" />
          </View>
          {progress > 0 && (
            <View style={styles.historyProgressBg}>
              <View style={[styles.historyProgressFill, { width: `${progress * 100}%` }]} />
            </View>
          )}
        </View>
        <Text style={styles.historyTitle} numberOfLines={2}>{entry.movieTitle}</Text>
        <Text style={styles.historyEp} numberOfLines={1}>
          {entry.episodeName ? `${entry.episodeName}` : 'Tập 1'}
        </Text>
        {hasPlayableProgress && !isEmbedHistory && (
          <Text style={styles.historyTime} numberOfLines={1}>
            {formatTime(entry.time)} / {formatTime(entry.duration)}
          </Text>
        )}
      </TouchableOpacity>
    );
  }, [router]);

  const listHeader = useMemo(() => (
    <Animated.View style={{ opacity: fadeAnim }}>
      {<FeaturedCarousel showTrailers={showTrailers} />}
      <View style={[styles.sectionContainer, { marginTop: 16 }]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Bạn đang quan tâm gì?</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topicScroll} nestedScrollEnabled>
          {TOPICS.slice(0, TOPICS_PREVIEW).map((topic) => (
            <TopicCard key={topic.slug} topic={topic} />
          ))}
          <TouchableOpacity
            style={[styles.topicCard, styles.topicSeeAll]}
            activeOpacity={0.8}
            onPress={() => router.push('/topics' as any)}
          >
            <Text style={styles.topicSeeAllCount}>+{TOPICS.length - TOPICS_PREVIEW}</Text>
            <Text style={styles.topicSeeAllText}>Xem tất cả</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {watchHistory.length > 0 && (
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tiếp tục xem</Text>
            <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/watch-history' as any)}>
              <Text style={styles.seeAllText}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.historyScrollContent} nestedScrollEnabled>
            {watchHistory.map(renderHistoryCard)}
          </ScrollView>
        </View>
      )}
    </Animated.View>
  ), [fadeAnim, watchHistory, renderHistoryCard, showTrailers]);

  const listFooter = useMemo(() => {
    return (
      <>
        <HTMoviesSection homeReady={homeReady} />
        {top10Movies.length > 0 && (
          <View style={[styles.sectionContainer, styles.footerPadding]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Top 10 Phim Lẻ Hay </Text>
            </View>
            <FlatList
              horizontal
              data={top10Movies}
              keyExtractor={(item) => item.id}
              renderItem={renderTop10Card}
              getItemLayout={top10GetItemLayout}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.top10ScrollContent}
              initialNumToRender={4}
              maxToRenderPerBatch={4}
              windowSize={3}
              removeClippedSubviews
              nestedScrollEnabled
              scrollEventThrottle={16}
            />
          </View>
        )}
      </>
    );
  }, [top10Movies, renderTop10Card, top10GetItemLayout]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={['rgba(255, 62, 30, 0.36)', 'rgba(255, 62, 30, 0.06)', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.heroGlow}
      />

      <View style={styles.header}>
        <View style={styles.logoContainer}>
          {/* <Image source={{ uri: 'https://i.ibb.co/dJ7CJ8Pf/logo-ganh-removebg-preview.png' }} style={styles.logo} /> */}
           <Image source={{ uri: 'https://res.cloudinary.com/df2amyjzw/image/upload/v1786077846/upflix-removebg-preview_dsnd1z.png' }} style={styles.logo} />
          <View>
            <Text style={styles.logoTitle}>Gánh Phim</Text>
            <Text style={styles.logoSubtitle}>Phim hay cả gánh</Text>
          </View>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity
            style={styles.iconButton}
            activeOpacity={0.7}
            onPress={toggleTrailers}
          >
            <Film size={20} color={showTrailers ? Colors.primary : Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            activeOpacity={0.7}
            onPress={() => router.replace('/intro' as any)}
          >
            <Menu size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollContent}>
          {FILTER_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option}
              style={[styles.filterButton, selectedFilter === option && styles.filterButtonActive]}
              onPress={() => handleFilterPress(option)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterButtonText, selectedFilter === option && styles.filterButtonTextActive]}>
                {option}
              </Text>
              {option === 'Thể loại' && (
                <ChevronDown size={14} color={selectedFilter === option ? Colors.background : Colors.text} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={SECTION_CONFIGS}
        keyExtractor={sectionKeyExtractor}
        renderItem={renderSection}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        removeClippedSubviews
        initialNumToRender={2}
        maxToRenderPerBatch={1}
        windowSize={5}
        style={styles.scrollView}
      />

      {/* Genre picker modal */}
      <Modal
        visible={genreModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setGenreModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setGenreModalVisible(false)} />
        <View style={styles.genreModal}>
          <View style={styles.genreModalHeader}>
            <Text style={styles.genreModalTitle}>Thể loại</Text>
            <TouchableOpacity onPress={() => setGenreModalVisible(false)}>
              <X size={20} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.genreChipWrap} showsVerticalScrollIndicator={false}>
            {GENRES.map((g) => {
              const active = selectedGenres.includes(g.slug);
              return (
                <TouchableOpacity
                  key={g.slug}
                  style={[styles.genreChip, active && styles.genreChipActive]}
                  onPress={() =>
                    setSelectedGenres((prev) =>
                      active ? prev.filter((s) => s !== g.slug) : [...prev, g.slug]
                    )
                  }
                  activeOpacity={0.75}
                >
                  <Text style={[styles.genreChipText, active && styles.genreChipTextActive]}>{g.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.genreSortRow}>
            {(['moi-nhat', 'xem-nhieu'] as const).map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.sortChip, genreSort === s && styles.sortChipActive]}
                onPress={() => setGenreSort(s)}
                activeOpacity={0.8}
              >
                <Text style={[styles.sortChipText, genreSort === s && styles.sortChipTextActive]}>
                  {s === 'moi-nhat' ? 'Mới nhất' : 'Xem nhiều'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.applyBtn, selectedGenres.length === 0 && styles.applyBtnDisabled]}
            onPress={handleGenreApply}
            activeOpacity={0.85}
            disabled={selectedGenres.length === 0}
          >
            <Text style={styles.applyBtnText}>Lọc kết quả</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  heroGlow: {
    position: 'absolute',
    top: -90,
    left: -80,
    right: -80,
    height: 360,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    width: 54,
    height: 54,
    resizeMode: 'contain',
  },
  logoTitle: {
    color: Colors.text,
    fontSize: 19,
    fontWeight: '800',
  },
  logoSubtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: -2,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(12, 23, 69, 0.6)',
  },
  scrollView: {
    flex: 1,
  },
  filterContainer: {
    paddingVertical: 8,
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1.4,
    borderColor: 'rgba(255,255,255,0.7)',
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  filterButtonActive: {
    backgroundColor: Colors.white,
    borderColor: Colors.white,
  },
  filterButtonText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: Colors.background,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  // Topic cards
  topicScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  topicCard: {
    width: 160,
    height: 88,
    borderRadius: 12,
    overflow: 'hidden',
  },
  topicThumb: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '65%',
  },
  topicOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  topicGlow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 40,
  },
  topicBody: {
    position: 'absolute',
    left: 12,
    bottom: 10,
    right: '55%',
  },
  topicTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  topicSeeAll: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  topicSeeAllCount: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },
  topicSeeAllText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontWeight: '600',
  },
  // Top 10
  top10ScrollContent: {
    paddingHorizontal: 16,
    gap: 0,
  },
  top10Card: {
    width: 110,
    marginRight: 10,
  },
  top10ImageWrap: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Colors.cardBackground,
  },
  top10Poster: {
    width: '100%',
    height: '100%',
  },
  top10ImdbBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#F5C518',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 2,
  },
  top10ImdbText: {
    color: '#000',
    fontSize: 9,
    fontWeight: '800',
  },
  top10RankWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 4,
    paddingLeft: 6,
  },
  top10Rank: {
    fontSize: 48,
    fontWeight: '900',
    color: Colors.white,
    lineHeight: 56,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 4,
  },
  episodeBadgeSmall: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(77, 85, 118, 0.95)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 999,
  },
  episodeBadgeSmallText: {
    color: Colors.text,
    fontSize: 10,
    fontWeight: '600',
  },
  top10BadgesContainer: {
    position: 'absolute',
    top: 6,
    left: 6,
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
  },
  top10BadgeInner: {
    backgroundColor: 'rgba(77, 85, 118, 0.95)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 999,
  },
  top10LtBadge: {
    backgroundColor: 'rgba(230, 126, 34, 0.95)',
  },
  top10Title: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
    lineHeight: 16,
  },
  top10TitleEn: {
    color: Colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  footerPadding: {
    paddingBottom: 24,
  },
  // Watch history
  historyScrollContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  historyCard: {
    width: 110,
  },
  historyPosterWrap: {
    width: 110,
    height: 160,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: Colors.cardBackground,
    position: 'relative',
  },
  historyPoster: {
    width: '100%',
    height: '100%',
  },
  historyPlayOverlay: {
    position: 'absolute',
    inset: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  historyProgressBg: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  historyProgressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  historyTitle: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
    lineHeight: 16,
  },
  historyEp: {
    color: Colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  historyTime: {
    color: Colors.primary,
    fontSize: 10,
    marginTop: 1,
    fontWeight: '600',
  },
  seeAllText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },

  // Genre modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  genreModal: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 28,
    maxHeight: '75%',
  },
  genreModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  genreModalTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  genreChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 12,
  },
  genreChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  genreChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  genreChipText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '500',
  },
  genreChipTextActive: {
    color: Colors.background,
    fontWeight: '700',
  },
  genreSortRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    marginBottom: 14,
  },
  sortChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  sortChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  sortChipText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  sortChipTextActive: {
    color: Colors.background,
    fontWeight: '700',
  },
  applyBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  applyBtnDisabled: {
    opacity: 0.4,
  },
  applyBtnText: {
    color: Colors.background,
    fontSize: 15,
    fontWeight: '700',
  },
});
