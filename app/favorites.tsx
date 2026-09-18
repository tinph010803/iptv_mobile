import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { apiGetFavorites, apiRemoveFavorite, FavoriteItem } from '@/lib/authApi';
import { getLocalFavoriteItems, LocalFavoriteItem, removeFavorite as removeLocalFavorite } from '@/lib/favorites';

function getPosterUrl(poster: Record<string, string> | undefined): string {
  if (!poster) return '';
  const values = Object.values(poster);
  return values[values.length - 1] || values[0] || '';
}

// Returns [{label, value}] — up to 2 episode badges
function getEpisodeBadges(
  ep: string | Record<string, string> | undefined
): { label: string; value: string }[] {
  if (!ep) return [];
  if (typeof ep === 'string') return [{ label: '', value: ep }];
  const KNOWN: Record<string, string> = {
    'ph': 'PD',
    'th': 'TM',
    'lồ': 'LT', 'lo': 'LT',
  };
  return Object.entries(ep)
    .slice(0, 2)
    .map(([k, v]) => {
      const lower = k.toLowerCase().slice(0, 2);
      const label = KNOWN[lower] ?? '';
      return { label, value: v };
    });
}

export default function FavoritesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [items, setItems] = useState<Array<FavoriteItem | LocalFavoriteItem>>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  const loadFavorites = useCallback(async () => {
    try {
      setLoading(true);
      if (user) {
        const res = await apiGetFavorites();
        setItems(res.items);
      } else {
        setItems(await getLocalFavoriteItems());
      }
    } catch (e: any) {
      showToast(e?.message || 'Không tải được danh sách yêu thích', 'error');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const handleRemove = async (item: FavoriteItem) => {
    try {
      setRemoving(item.id);
      if (user) {
        await apiRemoveFavorite(item.movie._id);
      } else {
        await removeLocalFavorite(item.movie.slug);
      }
      setItems((prev) => prev.filter((f) => f.id !== item.id));
      showToast('Đã xoá khỏi Yêu thích', 'success');
    } catch (e: any) {
      showToast(e?.message || 'Xoá thất bại', 'error');
    } finally {
      setRemoving(null);
    }
  };

  const handlePress = (slug: string) => {
    router.push({ pathname: '/movie/[id]', params: { id: slug } });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
          <ChevronLeft size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Yêu thích</Text>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Chưa có phim yêu thích</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => {
            const m = item.movie;
            const posterUrl = getPosterUrl(m.poster) || getPosterUrl(m.thumb);
            const epBadges = getEpisodeBadges(m.episode_current);
            const isRemoving = removing === item.id;
            return (
              <View style={styles.card}>
                {/* v-thumbnail — poster, tap → movie detail */}
                <TouchableOpacity
                  style={styles.posterWrap}
                  onPress={() => handlePress(m.slug)}
                  activeOpacity={0.85}
                >
                  <Image
                    source={{ uri: posterUrl }}
                    style={styles.poster}
                    resizeMode="cover"
                  />

                  {/* X button — inside poster, top-right, white bg */}
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => handleRemove(item)}
                    activeOpacity={0.7}
                    disabled={isRemoving}
                  >
                    {isRemoving
                      ? <ActivityIndicator size={10} color="#333" />
                      : <X size={11} color="#333" strokeWidth={2.5} />}
                  </TouchableOpacity>

                  {epBadges.length > 0 && (
                    <View style={styles.epRow}>
                      {epBadges.map((b, i) => (
                        <View
                          key={i}
                          style={[
                            styles.epBadge,
                            i > 0 && { marginLeft: 4, backgroundColor: '#35D68D' },
                          ]}
                        >
                          <Text style={styles.epText}>
                            {b.label ? `${b.label}. ` : ''}{b.value}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </TouchableOpacity>

                {/* info — tap → movie detail */}
                <TouchableOpacity
                  style={styles.info}
                  onPress={() => handlePress(m.slug)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.movieTitle} numberOfLines={2}>
                    {m.name}
                  </Text>
                  <Text style={styles.movieTitleEn} numberOfLines={1}>
                    {m.origin_name}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const CARD_GAP = 8;
const CARD_WIDTH = '31%';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  backBtn: { padding: 4 },
  headerTitle: { color: Colors.text, fontSize: 18, fontWeight: '700' },

  emptyText: { color: Colors.textSecondary, fontSize: 15 },

  grid: { paddingHorizontal: 12, paddingBottom: 32, paddingTop: 8 },
  row: { justifyContent: 'space-between', marginBottom: CARD_GAP },

  card: { width: CARD_WIDTH },

  removeBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  posterWrap: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: Colors.cardBackground,
    position: 'relative',
  },
  poster: { width: '100%', height: '100%' },

  epRow: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  epBadge: {
    backgroundColor: 'rgba(77, 85, 118, 0.95)',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  epText: { color: '#fff', fontSize: 10, fontWeight: '600' },

  info: { paddingTop: 5 },
  movieTitle: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  movieTitleEn: {
    color: Colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
});
