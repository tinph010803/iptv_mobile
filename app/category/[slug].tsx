import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Dimensions, ScrollView, Modal, Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, SlidersHorizontal, X, ChevronDown, ChevronUp } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { GENRES, COUNTRIES, MOVIE_TYPES, SORT_OPTIONS, YEARS } from '@/constants/filters';
import { getMoviesFilteredPaged, searchMoviesWithFilters } from '@/lib/ophim';
import { Movie } from '@/types/movie';
import { MovieCard } from '@/components/MovieCard';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const H_PADDING = 16;
const CARD_INTERNAL_MARGIN = 10;
const CARD_WIDTH = Math.floor((SCREEN_WIDTH - H_PADDING * 2 - CARD_INTERNAL_MARGIN * 3) / 3);

type FilterState = {
  movieType: string;
  country: string;
  genre: string;
  year: number | null;
  sort: string;
};

function initFilter(slug: string, type: string, sort?: string): FilterState {
  const base: FilterState = { movieType: '', country: '', genre: '', year: null, sort: sort || '' };
  if (type === 'list') base.movieType = slug;
  else if (type === 'genre') base.genre = slug;
  else base.country = slug;
  return base;
}

function countActive(f: FilterState, init: FilterState): number {
  return [
    f.movieType !== init.movieType,
    f.country !== init.country,
    f.genre !== init.genre,
    f.year != null,
    f.sort !== init.sort,
  ].filter(Boolean).length;
}

// ─── Collapsible Section ─────────────────────────────────────────────────────
function CollapsibleSection({
  label, badge, children,
}: { label: string; badge?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={fm.section}>
      <TouchableOpacity style={fm.sectionHeader} onPress={() => setOpen((v) => !v)} activeOpacity={0.7}>
        <Text style={fm.sectionTitle}>{label}</Text>
        <View style={fm.sectionRight}>
          {!!badge && !open && <Text style={fm.sectionBadge}>{badge}</Text>}
          {open ? <ChevronUp size={15} color={Colors.primary} /> : <ChevronDown size={15} color={Colors.textSecondary} />}
        </View>
      </TouchableOpacity>
      {open && <View style={{ marginTop: 10 }}>{children}</View>}
    </View>
  );
}

// ─── Filter Modal ──────────────────────────────────────────────────────────────
function FilterModal({
  visible, filters, onApply, onClose,
}: {
  visible: boolean;
  filters: FilterState;
  onApply: (f: FilterState) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<FilterState>(filters);
  const EMPTY: FilterState = { movieType: '', country: '', genre: '', year: null, sort: '' };

  useEffect(() => { if (visible) setDraft(filters); }, [visible]);

  // Selecting movieType/genre/country clears the other two (mutually exclusive endpoints)
  const setExclusive = (key: 'movieType' | 'country' | 'genre', slug: string) =>
    setDraft((d) => ({
      ...d,
      movieType: key === 'movieType' ? (d.movieType === slug ? '' : slug) : '',
      country:   key === 'country'   ? (d.country === slug   ? '' : slug) : '',
      genre:     key === 'genre'     ? (d.genre === slug     ? '' : slug) : '',
    }));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={fm.overlay}>
        <Pressable style={fm.backdrop} onPress={onClose} />
        <View style={[fm.sheet, { maxHeight: SCREEN_HEIGHT * 0.82, paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={fm.handle} />
          <View style={fm.titleRow}>
            <Text style={fm.title}>Bộ lọc</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={20} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
            {/* Loại phim */}
            <CollapsibleSection label="Loại phim" badge={draft.movieType ? MOVIE_TYPES.find(t => t.slug === draft.movieType)?.name : 'Tất cả'}>
              <View style={fm.pillWrap}>
                {MOVIE_TYPES.map((t) => {
                  const active = draft.movieType === t.slug;
                  return (
                    <TouchableOpacity key={t.slug} style={[fm.pill, active && fm.pillActive]}
                      onPress={() => setExclusive('movieType', t.slug)}>
                      <Text style={[fm.pillText, active && fm.pillTextActive]}>{t.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </CollapsibleSection>

            {/* Thể loại */}
            <CollapsibleSection label="Thể loại" badge={draft.genre ? GENRES.find(g => g.slug === draft.genre)?.name : 'Tất cả'}>
              <View style={fm.pillWrap}>
                {GENRES.map((g) => {
                  const active = draft.genre === g.slug;
                  return (
                    <TouchableOpacity key={g.slug} style={[fm.pill, active && fm.pillActive]}
                      onPress={() => setExclusive('genre', g.slug)}>
                      <Text style={[fm.pillText, active && fm.pillTextActive]}>{g.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </CollapsibleSection>

            {/* Quốc gia */}
            <CollapsibleSection label="Quốc gia" badge={draft.country ? COUNTRIES.find(c => c.slug === draft.country)?.name : 'Tất cả'}>
              <View style={fm.pillWrap}>
                {COUNTRIES.map((c) => {
                  const active = draft.country === c.slug;
                  return (
                    <TouchableOpacity key={c.slug} style={[fm.pill, active && fm.pillActive]}
                      onPress={() => setExclusive('country', c.slug)}>
                      <Text style={[fm.pillText, active && fm.pillTextActive]}>{c.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </CollapsibleSection>

            {/* Năm */}
            <CollapsibleSection label="Năm sản xuất" badge={draft.year ? String(draft.year) : 'Tất cả'}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={fm.pillRow}>
                {YEARS.map((y) => {
                  const active = draft.year === y;
                  return (
                    <TouchableOpacity key={y} style={[fm.pill, active && fm.pillActive]}
                      onPress={() => setDraft((d) => ({ ...d, year: d.year === y ? null : y }))}>
                      <Text style={[fm.pillText, active && fm.pillTextActive]}>{y}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </CollapsibleSection>

            {/* Sắp xếp */}
            <CollapsibleSection label="Sắp xếp" badge={draft.sort ? SORT_OPTIONS.find(s => s.value === draft.sort)?.name : 'Mới nhất'}>
              <View style={fm.pillWrap}>
                {SORT_OPTIONS.map((s) => {
                  const active = draft.sort === s.value;
                  return (
                    <TouchableOpacity key={s.value} style={[fm.pill, active && fm.pillActive]}
                      onPress={() => setDraft((d) => ({ ...d, sort: d.sort === s.value ? '' : s.value }))}>
                      <Text style={[fm.pillText, active && fm.pillTextActive]}>{s.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </CollapsibleSection>
          </ScrollView>

          <View style={fm.btnRow}>
            <TouchableOpacity style={fm.resetBtn} onPress={() => setDraft(EMPTY)} activeOpacity={0.7}>
              <Text style={fm.resetText}>Đặt lại</Text>
            </TouchableOpacity>
            <TouchableOpacity style={fm.applyBtn} onPress={() => onApply(draft)} activeOpacity={0.85}>
              <Text style={fm.applyText}>Áp dụng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Category Screen ───────────────────────────────────────────────────────────
export default function CategoryScreen() {
  const router = useRouter();
  const { slug, title, type, sort: sortParam, filter: filterParam } = useLocalSearchParams<{
    slug: string; title: string; type: string; sort?: string; filter?: string;
  }>();

  // Topic filter mode: when a filter JSON is passed from topic cards
  const topicFilter = useMemo(() => {
    if (!filterParam) return null;
    try { return JSON.parse(filterParam) as Record<string, string>; } catch { return null; }
  }, [filterParam]);

  const initialFilter = initFilter(slug ?? '', type ?? 'country', sortParam);

  const [filter, setFilter] = useState<FilterState>(initialFilter);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showFilter, setShowFilter] = useState(false);

  const activeCount = countActive(filter, initialFilter);

  const fetchMovies = useCallback(async (f: FilterState, pageNum: number) => {
    setLoading(true);
    try {
      if (topicFilter) {
        // Topic mode: use searchMoviesWithFilters with topic's filter fields
        const movies = await searchMoviesWithFilters({
          keyword: topicFilter.q,
          country: topicFilter.country_code,
          genre: topicFilter.genre_ids,
          type: topicFilter.type,
          sort: 'modified.time',
        });
        setMovies(movies);
        setTotalPages(1);
      } else {
        const result = await getMoviesFilteredPaged({
          movieType: f.movieType || undefined,
          country: f.country || undefined,
          genre: f.genre || undefined,
          year: f.year,
          sort: f.sort || undefined,
        }, pageNum);
        setMovies(result.movies);
        setTotalPages(result.totalPages);
      }
    } catch {
      setMovies([]);
    } finally {
      setLoading(false);
    }
  }, [topicFilter]);

  useEffect(() => { setPage(1); fetchMovies(filter, 1); }, [filter, fetchMovies]);

  const handlePageChange = useCallback((newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === page) return;
    setPage(newPage);
    fetchMovies(filter, newPage);
  }, [page, totalPages, filter, fetchMovies]);

  // Build active chips from current filter
  const activeChips: { label: string; key: keyof FilterState }[] = [];
  if (filter.movieType) {
    const t = MOVIE_TYPES.find((x) => x.slug === filter.movieType);
    if (t) activeChips.push({ label: t.name, key: 'movieType' });
  }
  if (filter.genre) {
    const g = GENRES.find((x) => x.slug === filter.genre);
    if (g) activeChips.push({ label: g.name, key: 'genre' });
  }
  if (filter.country && filter.country !== initialFilter.country) {
    const c = COUNTRIES.find((x) => x.slug === filter.country);
    if (c) activeChips.push({ label: c.name, key: 'country' });
  }
  if (filter.year) activeChips.push({ label: String(filter.year), key: 'year' });
  if (filter.sort) {
    const s = SORT_OPTIONS.find((x) => x.value === filter.sort);
    if (s) activeChips.push({ label: s.name, key: 'sort' });
  }

  const removeChip = useCallback((key: keyof FilterState) => {
    setFilter((prev) => ({ ...prev, [key]: key === 'year' ? null : '' }));
  }, []);

  const renderItem = useCallback(({ item }: { item: Movie }) => <MovieCard movie={item} width={CARD_WIDTH} />, []);
  const keyExtractor = useCallback((item: Movie) => item.id, []);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ChevronLeft size={26} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        <TouchableOpacity
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() => setShowFilter(true)}
          style={styles.filterIconBtn}
        >
          <SlidersHorizontal size={22} color={activeCount > 0 ? Colors.primary : Colors.text} />
          {activeCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Active chips */}
      {activeChips.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeChipsRow}>
          {activeChips.map((chip) => (
            <TouchableOpacity key={chip.key} style={styles.activeChip}
              onPress={() => removeChip(chip.key)} activeOpacity={0.75}>
              <Text style={styles.activeChipText}>{chip.label}</Text>
              <X size={11} color={Colors.background} />
            </TouchableOpacity>
          ))}
          {activeChips.length > 1 && (
            <TouchableOpacity style={styles.clearChip} onPress={() => setFilter(initialFilter)} activeOpacity={0.75}>
              <Text style={styles.clearChipText}>Xóa tất cả</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {/* Movie Grid */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.text} />
        </View>
      ) : (
        <FlatList
          data={movies}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          numColumns={3}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Pagination */}
      {!loading && movies.length > 0 && (
        <View style={styles.pagination}>
          <TouchableOpacity onPress={() => handlePageChange(page - 1)} disabled={page === 1}
            style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}>
            <Text style={styles.pageBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.pageInfo}>
            Trang <Text style={styles.pageNum}>{page}</Text> / {totalPages}
          </Text>
          <TouchableOpacity onPress={() => handlePageChange(page + 1)} disabled={page === totalPages}
            style={[styles.pageBtn, page === totalPages && styles.pageBtnDisabled]}>
            <Text style={styles.pageBtnText}>→</Text>
          </TouchableOpacity>
        </View>
      )}

      <FilterModal
        visible={showFilter}
        filters={filter}
        onApply={(f) => { setShowFilter(false); setFilter(f); }}
        onClose={() => setShowFilter(false)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 12,
  },
  headerTitle: { flex: 1, color: Colors.text, fontSize: 18, fontWeight: '700' },
  filterIconBtn: { padding: 4, position: 'relative' },
  filterBadge: {
    position: 'absolute', top: -2, right: -4,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  filterBadgeText: { color: '#07113A', fontSize: 9, fontWeight: '800' },
  activeChipsRow: {
    paddingHorizontal: 16, paddingBottom: 10, gap: 8,
    flexDirection: 'row', alignItems: 'center',
  },
  activeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.primary,
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5,
  },
  activeChipText: { color: Colors.background, fontSize: 12, fontWeight: '600' },
  clearChip: {
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5,
  },
  clearChipText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: H_PADDING, paddingBottom: 16, rowGap: 12 },
  row: {},
  pagination: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, paddingHorizontal: 20, gap: 24,
    borderTopWidth: 1, borderTopColor: Colors.cardBackground,
  },
  pageBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8, backgroundColor: Colors.cardBackground },
  pageBtnDisabled: { opacity: 0.35 },
  pageBtnText: { color: Colors.text, fontSize: 18, fontWeight: '600' },
  pageInfo: { color: Colors.textSecondary, fontSize: 15 },
  pageNum: { color: Colors.text, fontWeight: '700' },
});

const fm = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: {
    backgroundColor: '#0e1535',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 16, paddingTop: 8,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center', marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 16,
  },
  title: { color: '#fff', fontSize: 17, fontWeight: '700' },
  section: { marginBottom: 4 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  sectionRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionBadge: { color: Colors.primary, fontSize: 13, fontWeight: '600' },
  sectionTitle: {
    color: Colors.text, fontSize: 15, fontWeight: '600',
  },
  pillRow: { flexDirection: 'row', gap: 8, paddingRight: 8 },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    paddingHorizontal: 13, paddingVertical: 7, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  pillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  pillText: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '500' },
  pillTextActive: { color: '#07113A', fontWeight: '700' },
  btnRow: {
    flexDirection: 'row', gap: 12, marginTop: 12, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
  },
  resetBtn: {
    flex: 1, height: 46, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  resetText: { color: 'rgba(255,255,255,0.65)', fontSize: 15, fontWeight: '600' },
  applyBtn: { flex: 2, height: 46, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.primary },
  applyText: { color: '#07113A', fontSize: 15, fontWeight: '700' },
});

