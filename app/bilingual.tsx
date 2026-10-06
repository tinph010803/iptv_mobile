import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { MovieCard } from '@/components/MovieCard';
import { getBilingualMoviesPaged } from '@/lib/bilingualMovies';
import { Movie } from '@/types/movie';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_W = (SCREEN_WIDTH - 32 - 16) / 3;

export default function BilingualScreen() {
  const router = useRouter();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getBilingualMoviesPaged(page)
      .then((result) => {
        if (cancelled) return;
        setMovies(result.movies);
        setTotalPages(result.totalPages);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Phim Chất Lượng Cao</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <Text style={styles.emptyText}>Đang tải...</Text>
        ) : movies.length === 0 ? (
          <Text style={styles.emptyText}>Chưa có phim song ngữ</Text>
        ) : (
          <>
            <View style={styles.grid}>
              {movies.map((m) => (
                <View key={m.slug || m.id} style={{ width: CARD_W }}>
                  <MovieCard movie={m} width={CARD_W} hideEpisodeBadges />
                </View>
              ))}
            </View>
            <View style={styles.pagination}>
              <TouchableOpacity
                style={[styles.pageButton, page === 1 && styles.pageButtonDisabled]}
                onPress={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page === 1 || loading}
              >
                <ChevronLeft size={18} color={page === 1 ? Colors.textSecondary : Colors.text} />
                <Text style={styles.pageButtonText}>Trước</Text>
              </TouchableOpacity>
              <Text style={styles.pageLabel}>Trang {page} / {totalPages}</Text>
              <TouchableOpacity
                style={[styles.pageButton, page >= totalPages && styles.pageButtonDisabled]}
                onPress={() => setPage((current) => current + 1)}
                disabled={page >= totalPages || loading}
              >
                <Text style={styles.pageButtonText}>Sau</Text>
                <ChevronRight size={18} color={page >= totalPages ? Colors.textSecondary : Colors.text} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10 },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, gap: 12 },
  pageButton: { minWidth: 92, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 9, borderRadius: 8, backgroundColor: Colors.cardBackground },
  pageButtonDisabled: { opacity: 0.45 },
  pageButtonText: { color: Colors.text, fontSize: 13, fontWeight: '700' },
  pageLabel: { color: Colors.textSecondary, fontSize: 13, fontWeight: '700' },
  emptyText: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center', paddingVertical: 40 },
});