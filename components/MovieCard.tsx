import { memo, useCallback } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Movie } from '@/types/movie';
import { Colors } from '@/constants/colors';
import { useRouter } from 'expo-router';
import { prefetchMovieBySlug, seedMovieDetailCache } from '@/lib/ophim';

interface MovieCardProps {
  movie: Movie;
  width?: number;
  hideEpisodeBadges?: boolean;
}

const LT_PATTERN = /lồng tiếng|lồng\s*tiếng|long\s*tieng|dubbed/i;
const TM_PATTERN = /thuyết minh|thuyet\s*minh/i;
const SUB_PATTERN = /vietsub|phụ đề|phu\s*de/i;
const parseEpisodeNumber = (value?: string | number): number => {
  const match = String(value ?? '').match(/\d+/);
  return match ? Number(match[0]) : 0;
};

export const MovieCard = memo(function MovieCard({
  movie,
  width = 150,
  hideEpisodeBadges = false,
}: MovieCardProps) {
  const router = useRouter();

  const handlePress = useCallback(() => {
    const targetId = movie.slug || movie.id;
    if (!targetId) return;
    router.push({
      pathname: '/movie/[id]',
      params: { id: targetId },
    });
  }, [movie.slug, movie.id]);

  const handlePressIn = useCallback(() => {
    const targetId = movie.slug || movie.id;
    if (!targetId) return;
    seedMovieDetailCache(movie);
    prefetchMovieBySlug(targetId);
  }, [movie.slug, movie.id]);

  const isTrailer = movie.status === 'trailer';

  const total = movie.episodes;
  const isSeries = total > 1;

  const dubbedServer = movie.servers?.find(s => LT_PATTERN.test(s.name));
  const thuyetMinhServer = movie.servers?.find(s => TM_PATTERN.test(s.name));
  const subbedServer = movie.servers?.find(s => !LT_PATTERN.test(s.name) && !TM_PATTERN.test(s.name));
  const dubbedLast = movie.last_episodes?.find(ep => LT_PATTERN.test(ep.server_name));
  const thuyetMinhLast = movie.last_episodes?.find(ep => TM_PATTERN.test(ep.server_name));
  const subbedLast = movie.last_episodes?.find(ep => !LT_PATTERN.test(ep.server_name) && !TM_PATTERN.test(ep.server_name));

  // Detect dubbed when server_data not populated (list/home view)
  const hasLangLt = !!(movie.lang_key?.includes('lt') || LT_PATTERN.test(movie.lang ?? ''));
  const hasLangTm = !!(movie.lang_key?.includes('tm') || TM_PATTERN.test(movie.lang ?? ''));
  const hasLangSub = !!(movie.lang_key?.includes('vs') || SUB_PATTERN.test(movie.lang ?? ''));
  const hasLT = !!dubbedServer || hasLangLt || !!dubbedLast;
  const hasTM = !!thuyetMinhServer || hasLangTm || !!thuyetMinhLast;
  const hasAltAudio = hasLT || hasTM;
  const hasSubbed = !!subbedServer || !!subbedLast || hasLangSub;

  const subbedEps = subbedServer?.episodes?.length ?? 0;
  const dubbedEps = dubbedServer?.episodes?.length ?? 0;
  const thuyetMinhEps = thuyetMinhServer?.episodes?.length ?? 0;
  const subbedLastCount = parseEpisodeNumber(subbedLast?.name);
  const dubbedLastCount = parseEpisodeNumber(dubbedLast?.name);
  const thuyetMinhLastCount = parseEpisodeNumber(thuyetMinhLast?.name);
  const subbedCount = subbedEps > 0 ? subbedEps : (subbedLastCount || movie.current_episode);
  const dubbedCount = dubbedEps > 0 ? dubbedEps : (dubbedLastCount || movie.current_episode);
  const thuyetMinhCount = thuyetMinhEps > 0 ? thuyetMinhEps : (thuyetMinhLastCount || movie.current_episode);
  const audioCount = hasTM ? thuyetMinhCount : dubbedCount;

  const subbedText = isSeries ? `PĐ.${subbedCount}` : 'PĐ.';
  const dubbedText = isSeries ? `TM.${audioCount}` : 'TM.';

  return (
    <TouchableOpacity
      style={[styles.container, { width }]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      activeOpacity={0.7}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: movie.thumb_url }}
          style={styles.poster}
          resizeMode="cover"
          fadeDuration={0}
        />
        {!!movie.imdb_rating && movie.imdb_rating > 0 && (
          <View style={styles.imdbBadge}>
            <Text style={styles.imdbText}>IMDb {movie.imdb_rating}</Text>
          </View>
        )}
        <View style={styles.badgesContainer}>
          {isTrailer ? (
            <View style={[styles.badge, styles.trailerBadge]}>
              <Text style={styles.badgeText}>Sắp Chiếu</Text>
            </View>
          ) : (
            <>
              {!hideEpisodeBadges && hasAltAudio && (
                <View style={[styles.badge, styles.ltBadge]}>
                  <Text style={styles.badgeText}>{dubbedText}</Text>
                </View>
              )}
              {!hideEpisodeBadges && (hasSubbed || !hasAltAudio) && (
                <View style={[styles.badge, styles.episodeBadge]}>
                  <Text style={styles.badgeText}>{subbedText}</Text>
                </View>
              )}
            </>
          )}
        </View>
        {!hideEpisodeBadges && !isTrailer && movie.is_series && movie.current_episode < movie.episodes && (
          <View style={[styles.statusBadge, styles.updatingBadge]}>
            <Text style={styles.statusText}>TM.{movie.current_episode}</Text>
          </View>
        )}
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {movie.title}
      </Text>
      <Text style={styles.titleEn} numberOfLines={1}>
        {movie.title_en}
      </Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    marginRight: 10,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Colors.cardBackground,
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  imdbBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#F5C518',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  imdbText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '800',
  },
  badgesContainer: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  episodeBadge: {
    backgroundColor: 'rgba(77, 85, 118, 0.95)',
  },
  ltBadge: {
    backgroundColor: 'rgba(230, 126, 34, 0.95)',
  },
  trailerBadge: {
    backgroundColor: 'rgba(77, 85, 118, 0.95)',
  },
  badgeText: {
    color: Colors.text,
    fontSize: 9,
    fontWeight: '600',
  },
  statusBadge: {
    position: 'absolute',
    bottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
    paddingVertical: 4,
    borderRadius: 999,
  },
  updatingBadge: {
    backgroundColor: '#35D68D',
  },
  statusText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 7,
  },
  titleEn: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 3,
  },
});

