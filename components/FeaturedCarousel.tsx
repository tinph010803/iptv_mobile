import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  ScrollView,
  InteractionManager,
  AppState,
  AppStateStatus,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Movie } from '@/types/movie';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { getMovieBySlug, prefetchMovieBySlug, seedMovieDetailCache } from '@/lib/ophim';
import { FeaturedOverride, FEATURED_OVERRIDES } from '@/lib/featuredOverrides';
import { Volume1, VolumeX } from 'lucide-react-native';

const { width: W, height: SCREEN_H } = Dimensions.get('window');
const BANNER_H = Math.round(Math.min(W * 0.60, SCREEN_H * 0.42));

interface SlideItem {
  slug: string;
  movie: Movie | null;
  ov: Omit<FeaturedOverride, 'slug'>;
}

function toDirectVideoUrl(raw: string): string {
  const url = raw.trim();
  if (!url) return '';
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'player.cloudinary.com') {
      const cloudName = parsed.searchParams.get('cloud_name');
      const publicId = parsed.searchParams.get('public_id');
      if (cloudName && publicId)
        return `https://res.cloudinary.com/${cloudName}/video/upload/${publicId}.mp4`;
    }
    if (parsed.hostname === 'res.cloudinary.com') return url;
  } catch { }
  return url;
}

function optimizeImageUrl(url: string | undefined, type: 'bg' | 'char' | 'title' = 'bg'): string {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    if (parsed.hostname?.includes('cloudinary.com')) {
      const sizes = { bg: 'w_800,q_75', char: 'w_600,q_80', title: 'w_400,q_85' };
      if (!parsed.pathname.includes('/c_'))
        return url.replace('/upload/', `/upload/${sizes[type]}/`);
    }
  } catch { }
  return url;
}

const TrailerVideo = memo(function TrailerVideo({
  videoUrl,
  active,
  muted,
}: {
  videoUrl: string;
  active: boolean;
  muted: boolean;
}) {
  const player = useVideoPlayer(videoUrl, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = muted;
  });

  useEffect(() => {
    if (active) {
      player.play();
    } else {
      player.pause();
      player.currentTime = 0;
    }
  }, [active, player]);

  useEffect(() => {
    player.muted = muted;
  }, [muted, player]);

  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      nativeControls={false}
    />
  );
});

const BannerSlide = memo(function BannerSlide({
  item,
  active,
  muted,
  onToggleMute,
  showTrailers = true,
}: {
  item: SlideItem;
  active: boolean;
  muted: boolean;
  onToggleMute: () => void;
  showTrailers?: boolean;
}) {
  const router = useRouter();
  const { slug, movie, ov } = item;

  const bgScale = useRef(new Animated.Value(1)).current;
  const charX   = useRef(new Animated.Value(50)).current;
  const charO   = useRef(new Animated.Value(0)).current;
  const titleO  = useRef(new Animated.Value(0)).current;
  const titleY  = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    if (!active) {
      bgScale.setValue(1); charX.setValue(50); charO.setValue(0);
      titleO.setValue(0); titleY.setValue(10);
      return;
    }
    Animated.timing(bgScale, { toValue: 1.05, duration: 3500, useNativeDriver: true }).start();
    Animated.parallel([
      Animated.timing(charX, { toValue: 0, duration: 500, useNativeDriver: true }),
      Animated.timing(charO, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
    Animated.parallel([
      Animated.timing(titleO, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(titleY, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [active]);

  const clean    = (v?: string) => (v && v !== 'EMPTY' ? v : undefined);
  const bgUri    = optimizeImageUrl(clean(ov.bg) ?? movie?.thumb_url ?? movie?.poster_url, 'bg');
  const charUri  = optimizeImageUrl(clean(ov.character), 'char');
  const titleUri = optimizeImageUrl(clean(ov.titleImg), 'title');
  const directVideoUrl = ov.trailerUrl ? toDirectVideoUrl(ov.trailerUrl) : '';
  const hasTrailer     = !!directVideoUrl && showTrailers;

  const handlePress = useCallback(() => {
    router.push({ pathname: '/movie/[id]', params: { id: slug } });
  }, [router, slug]);

  const handlePressIn = useCallback(() => {
    if (movie) seedMovieDetailCache(movie);
    prefetchMovieBySlug(slug);
  }, [slug, movie]);

  return (
    <TouchableOpacity activeOpacity={0.95} style={styles.slide} onPress={handlePress} onPressIn={handlePressIn}>

      {hasTrailer ? (
        <View style={StyleSheet.absoluteFill}>
          {bgUri && (
            <Animated.Image
              source={{ uri: bgUri }}
              style={{ width: W, height: BANNER_H }}
              resizeMode="cover"
              fadeDuration={0}
            />
          )}
          <TrailerVideo videoUrl={directVideoUrl} active={active} muted={muted} />
        </View>
      ) : (
        <Animated.View style={[styles.bg, { transform: [{ scale: bgScale }] }]}>
          {bgUri ? (
            <Animated.Image
              source={{ uri: bgUri }}
              style={{ width: W, height: BANNER_H }}
              resizeMode="cover"
              fadeDuration={0}
            />
          ) : null}
        </Animated.View>
      )}

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.65)']}
        locations={[0, 0.65, 1]}
        style={styles.gradBottom}
      />
      <LinearGradient colors={['rgba(0,0,0,0.5)', 'transparent']} style={styles.gradTop} />
      <LinearGradient
        colors={['rgba(0,0,0,0.85)', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.15)', 'transparent']}
        locations={[0, 0.35, 0.65, 1]}
        style={styles.gradLeft}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      />

      {active && charUri && !hasTrailer && (
        <Animated.View
          style={[styles.character, {
            width: W * (ov.charW ?? 0.60),
            height: BANNER_H * (ov.charH ?? 1.1),
            right: ov.charRight ?? -10,
            bottom: ov.charBottom ?? 0,
            opacity: charO,
            transform: [{ translateX: charX }],
          }]}
        >
          <Animated.Image
            source={{ uri: charUri }}
            style={StyleSheet.absoluteFill as any}
            resizeMode="contain"
            fadeDuration={0}
          />
        </Animated.View>
      )}

      <View style={styles.content}>
        {titleUri ? (
          <Animated.Image
            source={{ uri: titleUri }}
            style={[styles.titleImg, { opacity: titleO, transform: [{ translateY: titleY }] }]}
            resizeMode="contain"
          />
        ) : (
          <Animated.Text
            style={[styles.titleText, { opacity: titleO, transform: [{ translateY: titleY }] }]}
          >
            {movie?.title ?? slug}
          </Animated.Text>
        )}

        <View style={styles.badgeRow}>
          <View style={styles.top10Badge}>
            <Text style={styles.top10Text}>TOP 10</Text>
          </View>
          {movie && (
            <Text style={styles.badgeMeta}>
              {[movie.year, movie.country, movie.current_episode ? `Tập ${movie.current_episode}` : null]
                .filter(Boolean).join('  |  ')}
            </Text>
          )}
        </View>

        {movie?.genres && movie.genres.length > 0 && (
          <View style={styles.genreRow}>
            {movie.genres.slice(0, 3).map((g) => (
              <View key={g} style={styles.genreTag}>
                <Text style={styles.genreText}>{g}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Nút mute chỉ render ở slide active có trailer */}
      {hasTrailer && active && (
        <TouchableOpacity style={styles.muteBtn} onPress={onToggleMute} hitSlop={12}>
          {muted
            ? <VolumeX size={18} color="#fff" />
            : <Volume1 size={18} color="#fff" />
          }
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}, (prev, next) =>
  prev.active === next.active &&
  prev.item   === next.item   &&
  prev.muted  === next.muted  &&
  prev.showTrailers === next.showTrailers
);

export const FeaturedCarousel = memo(function FeaturedCarousel({ showTrailers = true }: { showTrailers?: boolean }) {
  const [slides] = useState<SlideItem[]>(() =>
    FEATURED_OVERRIDES.map(({ slug, ...ov }) => ({ slug, movie: null, ov }))
  );
  const [slideMovies, setSlideMovies] = useState<Record<string, Movie | null>>({});
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  // ── Mute state dùng chung, lift lên đây để control toàn carousel ────────
  const [muted, setMuted] = useState(true);
  const toggleMute = useCallback(() => setMuted((prev) => !prev), []);

  // Tự tắt tiếng khi app xuống background (kéo notification bar, alt-tab, v.v.)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state !== 'active') setMuted(true);
    });
    return () => sub.remove();
  }, []);

  // Tự tắt tiếng khi chuyển sang tab khác trong app
  useFocusEffect(
    useCallback(() => {
      return () => setMuted(true); // cleanup = màn hình mất focus
    }, [])
  );
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    InteractionManager.runAfterInteractions(() => {
      FEATURED_OVERRIDES.forEach(({ slug }) => {
        getMovieBySlug(slug)
          .then((movie) => {
            if (cancelled) return;
            setSlideMovies((prev) => ({ ...prev, [slug]: movie }));
          })
          .catch(() => {
            if (cancelled) return;
            setSlideMovies((prev) => ({ ...prev, [slug]: null }));
          });
      });
    });

    return () => { cancelled = true; };
  }, []);

  const slidesWithMovies = useMemo(
    () => slides.map((item) => ({ ...item, movie: slideMovies[item.slug] ?? null })),
    [slides, slideMovies]
  );

  const handleScroll = useCallback((e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / W);
    setActiveIndex(idx);
  }, []);

  useEffect(() => {
    const next = slidesWithMovies[(activeIndex + 1) % slidesWithMovies.length];
    if (!next) return;
    [next.ov.bg || next.movie?.thumb_url, next.ov.character, next.ov.titleImg]
      .filter(Boolean)
      .forEach((url) => url && require('react-native').Image.prefetch(url).catch(() => {}));
  }, [activeIndex, slidesWithMovies]);

  if (slidesWithMovies.length === 0) return null;

  return (
    <View style={[styles.container, { height: BANNER_H }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        disableIntervalMomentum
        bounces={false}
      >
        {slidesWithMovies.map((item, index) => (
          <BannerSlide
            key={item.slug}
            item={item}
            active={index === activeIndex}
            muted={muted}
            onToggleMute={toggleMute}
            showTrailers={showTrailers}
          />
        ))}
      </ScrollView>

      <View style={styles.dots} pointerEvents="none">
        {slidesWithMovies.map((_, i) => (
          <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { marginBottom: 0, overflow: 'hidden' },
  slide: { width: W, height: BANNER_H, overflow: 'hidden', backgroundColor: '#1a1a2e' },
  bg: { ...StyleSheet.absoluteFill },
  gradBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: BANNER_H * 0.55 },
  gradTop: { position: 'absolute', top: 0, left: 0, right: 0, height: BANNER_H * 0.18 },
  gradLeft: { position: 'absolute', top: 0, left: 0, bottom: 0, width: W * 0.58 },
  character: { position: 'absolute', right: 0, bottom: 0 },
  content: { position: 'absolute', left: 20, bottom: 14, right: W * 0.40 },
  titleImg: { width: '100%', height: 72, marginBottom: 10, alignSelf: 'flex-start' },
  titleText: {
    color: '#fff', fontSize: 26, fontWeight: '900', marginBottom: 10, lineHeight: 30,
    textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8,
  },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  top10Badge: { backgroundColor: '#22C55E', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6 },
  top10Text: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  badgeMeta: { color: '#D1D5DB', fontSize: 12, fontWeight: '500' },
  genreRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  genreTag: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.55)',
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  genreText: { color: '#fff', fontSize: 11, fontWeight: '500' },
  dots: { position: 'absolute', bottom: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 6, height: 5, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.35)' },
  dotActive: { width: 22, height: 5, backgroundColor: '#22C55E', borderRadius: 10 },
  muteBtn: {
    position: 'absolute',
    bottom: 180,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    padding: 8,
    borderRadius: 999,
  },
});