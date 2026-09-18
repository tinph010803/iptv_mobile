import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/colors';
import { getHomeMovies, getMoviesByCountry, getMoviesByType, prefetchMovieBySlug, seedMovieDetailCache } from '@/lib/ophim';
import { getTop10Films } from '@/lib/top10Films';
import { Movie } from '@/types/movie';
import { FeaturedCarousel } from '@/components/FeaturedCarousel';
import { MovieSection } from '@/components/MovieSection';
import { useRouter, useFocusEffect } from 'expo-router';
import { getWatchHistory, WatchHistoryEntry, formatTime } from '@/lib/watchHistory';
import { useAuth } from '@/context/AuthContext';
import { HTMoviesSection } from '@/components/HTMoviesSection';
import { runWhenIdle } from '@/utils/runWhenIdle';
import { Play } from 'lucide-react-native';

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
  const audioCount = hasTM ? thuyetMinhCount : dubbedCount;
  const subbedText = isSeries ? `PĐ.${subbedCount}` : 'PĐ.';
  const dubbedText = isSeries ? `TM.${audioCount}` : 'TM.';

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
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [featuredMovies, setFeaturedMovies] = useState<Movie[]>([]);
  const [top10Movies, setTop10Movies] = useState<Movie[]>([]);
  const [sectionMovies, setSectionMovies] = useState<Record<string, Movie[]>>({});
  const [watchHistory, setWatchHistory] = useState<WatchHistoryEntry[]>([]);
  const [homeReady, setHomeReady] = useState(false);
  const showTrailers = true;

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

  // Reload watch history every time screen is focused
  useFocusEffect(useCallback(() => {
    getWatchHistory(user?.id).then((items) => setWatchHistory(items.slice(0, 20)));
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

    const refreshTask = runWhenIdle(async () => {
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
  ), [fadeAnim, watchHistory, renderHistoryCard]);

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
    <SafeAreaView style={styles.container} edges={[]}>
      <LinearGradient
        colors={['rgba(255, 62, 30, 0.36)', 'rgba(255, 62, 30, 0.06)', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.heroGlow}
      />

      <View style={[styles.homeTopBar, { top: insets.top + 8 }]}>
          <Image
            source={{ uri: 'https://res.cloudinary.com/df2amyjzw/image/upload/v1786077846/upflix-removebg-preview_dsnd1z.png' }}
            style={styles.brandLogo}
            resizeMode="contain"
          />
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
  homeTopBar: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandLogo: {
    width: 72,
    height: 34,
  },
  searchControl: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(13, 1, 1, 0.04)',
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  searchTrigger: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  filterTrigger: {
    height: '100%',
    paddingHorizontal: 12,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.16)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  filterTriggerText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  searchTriggerText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 13,
  },
  scrollView: {
    flex: 1,
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
    fontSize: 9,
    fontWeight: '600',
  },
  top10BadgesContainer: {
    position: 'absolute',
    top: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
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
  searchMenu: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 28,
  },
  searchMenuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  searchMenuEyebrow: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  searchMenuTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  searchMenuClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchMenuOptions: {
    gap: 10,
  },
  searchMenuOption: {
    minHeight: 50,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchMenuOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  searchMenuOptionText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  searchMenuOptionTextActive: {
    color: Colors.background,
  },
  searchMenuArrow: {
    color: Colors.textSecondary,
    fontSize: 24,
    lineHeight: 24,
  },
  searchMenuArrowActive: {
    color: Colors.background,
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
