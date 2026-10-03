// app/ht-movies.tsx
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { getMovieBySlug } from '@/lib/ophim';
import { Movie } from '@/types/movie';
import { MovieCard } from '@/components/MovieCard';
import { Colors } from '@/constants/colors';
import { HT_LOCAL_MOVIES } from '@/lib/htLocalSources';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_COLUMNS = 3;
const HORIZONTAL_PADDING = 16;
const GAP = 8;
// Trừ đi marginRight=10 mà MovieCard tự thêm vào
const CARD_WIDTH =
  (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS - 10;

export default function HTMoviesScreen() {
  const router = useRouter();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('ht_servers')
          .select('movie_slug')
          .order('created_at', { ascending: false });

        const slugs = [...new Set([
          ...(data ?? []).map((r) => r.movie_slug),
          ...Object.keys(HT_LOCAL_MOVIES),
        ])];
        if (!slugs.length) return;

        const fetched: Movie[] = [];
        for (let i = 0; i < slugs.length; i += 5) {
          const batch = slugs.slice(i, i + 5);
          const results = await Promise.allSettled(batch.map((slug) => getMovieBySlug(slug)));
          results.forEach((r) => {
            if (r.status === 'fulfilled' && r.value) fetched.push(r.value);
          });
        }

        setMovies(fetched);
      } catch (e) {
        console.error('HTMoviesScreen error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Phim chất lượng cao</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.loadingText}>Đang tải phim...</Text>
        </View>
      ) : (
        <FlatList
          data={movies}
          keyExtractor={(item) => item.slug || item.id}
          numColumns={NUM_COLUMNS}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.cardWrap}>
              {/* Badge VIP góc trên phải */}
              <View style={styles.vipBadge}>
                <Text style={styles.vipText}>VIP</Text>
              </View>
              <MovieCard movie={item} width={CARD_WIDTH} hideEpisodeBadges />
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>Chưa có phim nào</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  htBadge: {
    backgroundColor: '#6B21A8',
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  htBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
    flexShrink: 1,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  listContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingBottom: 32,
  },
  row: {
    gap: GAP,
    marginBottom: 16,
  },

  // Wrap để đặt badge VIP lên trên MovieCard
  cardWrap: {
    position: 'relative',
  },
  vipBadge: {
    position: 'absolute',
    top: 6,
    right: 16, // MovieCard có marginRight:10, cộng thêm 6px padding
    backgroundColor: '#1a1a1a',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    zIndex: 10,
    borderWidth: 1,
    borderColor: '#F5C518',
  },
  vipText: {
    color: '#F5C518',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },

  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  emptyWrap: {
    paddingTop: 60,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
});