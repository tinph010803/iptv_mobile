import { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, PackageOpen } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { getTMDBSchedule, resolveSlugForItem, ScheduleItem } from '@/lib/tmdbSchedule';/* ------------------------------------------------------------------ */
/*  Tabs                                                               */
/* ------------------------------------------------------------------ */

type TabKey = 'topics' | 'schedule';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'topics', label: 'Tất cả chủ đề' },
  { key: 'schedule', label: 'Lịch chiếu' },
];

/* ------------------------------------------------------------------ */
/*  Mục 1: Tất cả chủ đề                                               */
/* ------------------------------------------------------------------ */

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const H_PAD = 16;
const GAP = 8;
const CARD_WIDTH = Math.floor((SCREEN_WIDTH - H_PAD * 2 - GAP) / 2);
const CARD_HEIGHT = Math.round(CARD_WIDTH * 0.62);

const TOPICS = [
  { slug: 'hot-ran-ran', name: 'Hot Rần Rần', color: '#e5091a', thumbnail: 'https://sf-static.onflixcdn.com/images/pic/1788018470_2d403c2ce2a4ce0d04f3ceb1d341eb7b.webp', filter: { sort_by: 'views', status: 'ongoing' } },
  { slug: 'dang-chieu-phat', name: 'Đang Chiếu', color: '#b5420a', thumbnail: 'https://sf-static.onflixcdn.com/images/pic/1776085351_url.webp', filter: { status: 'ongoing' } },
  { slug: 'phim-truyen-hinh-trung-quoc-dai-luc', name: 'Trung Quốc', color: '#1a6b3a', thumbnail: 'https://sf-static.onflixcdn.com/images/pic/1767009807_url.webp', filter: { country_code: 'trung-quoc', type: 'phim-bo' } },
  { slug: 'hoat-hinh-chon-loc', name: 'Hoạt hình', color: '#1a3a6b', thumbnail: 'https://sf-static.onflixcdn.com/images/default/1778608695_gemini-1778608685086.webp', filter: { q: 'hoạt hình' } },
  { slug: 'phim-hanh-dong', name: 'Hành Động', color: '#8b1a1a', thumbnail: 'https://sf-static.onflixcdn.com/images/vi_content_cdn/1784281496_url.jpg', filter: { genre_ids: 'hanh-dong', sort_by: 'release_date' } },
  { slug: 'phim-co-trang', name: 'Cổ Trang', color: '#4a2a0a', thumbnail: 'https://sf-static.onflixcdn.com/images/pic/1776085351_url.webp', filter: { genre_ids: 'co-trang', sort_by: 'release_date' } },
  { slug: 'phim-han-quoc', name: 'Hàn Quốc', color: '#1a2a5c', thumbnail: 'https://sf-static.onflixcdn.com/images/chinh_1749641594_6849697aaf31d.webp', filter: { country_code: 'han-quoc' } },
  { slug: 'thanh-xuan', name: 'Thanh xuân', color: '#0a2a4a', thumbnail: 'https://sf-static.onflixcdn.com/images/1752561742_url.webp', filter: { q: 'thanh xuân' } },
  { slug: 'chua-lanh-tam-hon', name: 'Chữa Lành', color: '#5c1a1a', thumbnail: 'https://sf-static.onflixcdn.com/images/pic/1755686803_url.webp', filter: { q: 'chữa lành' } },
  { slug: 'phim-tinh-cam', name: 'Tình Cảm', color: '#6b1a3a', thumbnail: 'https://sf-static.onflixcdn.com/images/default/1778696072_url.webp', filter: { genre_ids: 'tinh-cam', sort_by: 'release_date' } },
  { slug: 'phim-4k', name: 'Phim 4K', color: '#1a1a1a', thumbnail: 'https://sf-static.onflixcdn.com/images/1754045028_url.webp', filter: { quality: '4K' } },
  { slug: 'phim-cong-so', name: 'Công Sở', color: '#0a1a2a', thumbnail: 'https://sf-static.onflixcdn.com/images/default/1767962758_url.webp', filter: { q: 'công sở' } },
  { slug: 'phim-hinh-su', name: 'Hình Sự', color: '#0a1a3a', thumbnail: 'https://sf-static.onflixcdn.com/images/pic/1755774476_url.webp', filter: { genre_ids: 'hinh-su', sort_by: 'release_date' } },
  { slug: 'phim-kinh-di', name: 'Kinh Dị', color: '#1a0a2a', thumbnail: 'https://sf-static.onflixcdn.com/images/default/1785152512_url.jpg', filter: { genre_ids: 'kinh-di', sort_by: 'release_date' } },
  { slug: 'dien-anh-au-my', name: 'Điện ảnh Âu Mỹ', color: '#5c1a1a', thumbnail: 'https://sf-static.onflixcdn.com/images/pic/1769359827_iron.webp', filter: { country_code: 'au-my', type: 'phim-le' } },
];

type Topic = typeof TOPICS[number];

function TopicsTab() {
  const router = useRouter();

  const renderItem = ({ item }: { item: Topic }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: item.color }]}
      activeOpacity={0.82}
      onPress={() =>
        router.push({
          pathname: '/category/[slug]',
          params: { slug: item.slug, title: item.name, filter: JSON.stringify(item.filter) },
        })
      }
    >
      {/* thumb bên phải */}
      <Image source={{ uri: item.thumbnail }} style={styles.cardThumb} resizeMode="cover" fadeDuration={0} />
      {/* overlay gradient ngang: màu → trong suốt */}
      <LinearGradient
        colors={[item.color, `${item.color}1a`, `${item.color}00`]}
        locations={[0, 0.35, 0.62]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill as any}
      />
      {/* glow dưới */}
      <LinearGradient
        colors={['transparent', `${item.color}cc`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.cardGlow}
      />
      {/* tên */}
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.name}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={TOPICS}
      keyExtractor={(item) => item.slug}
      renderItem={renderItem}
      numColumns={2}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.topicList}
      showsVerticalScrollIndicator={false}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Mục 2: Lịch chiếu                                                  */
/* ------------------------------------------------------------------ */

const WINDOW_SIZE = 15;
const DAY_NAMES = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function buildInitialDays(from: Date, count: number): Date[] {
  const result: Date[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(from);
    d.setDate(from.getDate() + i);
    result.push(d);
  }
  return result;
}

function isSameday(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

type ShowtimeItem = ScheduleItem;

function ScheduleTab() {
  const router = useRouter();
  const today = useRef(new Date()).current;
  const [days, setDays] = useState<Date[]>(() => buildInitialDays(today, WINDOW_SIZE));
  const [selectedDay, setSelectedDay] = useState<Date>(today);
  const [items, setItems] = useState<ShowtimeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const dateBarRef = useRef<ScrollView>(null);
  const requestIdRef = useRef(0);

  const fetchSchedule = useCallback(async (date: Date) => {
    const reqId = ++requestIdRef.current; // tránh dữ liệu ngày cũ ghi đè khi bấm đổi ngày nhanh
    setLoading(true);
    setItems([]);
    try {
      const data = await getTMDBSchedule(toDateStr(date));
      if (reqId === requestIdRef.current) setItems(data);
    } catch {
      if (reqId === requestIdRef.current) setItems([]);
    } finally {
      if (reqId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedule(selectedDay);
  }, [selectedDay, fetchSchedule]);

  useEffect(() => {
    const idx = days.findIndex((d) => isSameday(d, selectedDay));
    if (idx >= 0 && dateBarRef.current) {
      dateBarRef.current.scrollTo({ x: Math.max(0, idx * 68 - 16), animated: true });
    }
  }, [selectedDay, days]);

  const handleSelectDay = (day: Date) => {
    setSelectedDay(day);
    const lastDay = days[days.length - 1];
    if (isSameday(day, lastDay)) {
      const next = new Date(lastDay);
      next.setDate(lastDay.getDate() + 1);
      setDays((prev) => [...prev, ...buildInitialDays(next, WINDOW_SIZE)]);
    }
  };

  const renderDateItem = (day: Date, idx: number) => {
    const isSelected = isSameday(day, selectedDay);
    const isToday = isSameday(day, today);
    const dayName = isToday ? 'Hôm nay' : DAY_NAMES[day.getDay()];
    const dd = String(day.getDate()).padStart(2, '0');
    const mm = String(day.getMonth() + 1).padStart(2, '0');
    return (
      <TouchableOpacity
        key={idx}
        style={[styles.dateItem, isSelected && styles.dateItemActive]}
        onPress={() => handleSelectDay(day)}
        activeOpacity={0.75}
      >
        <Text style={[styles.dateNum, isSelected && styles.dateNumActive]}>{dd}/{mm}</Text>
        <Text style={[styles.dateName, isSelected && styles.dateNameActive]}>{dayName}</Text>
      </TouchableOpacity>
    );
  };

  const openMovie = useCallback(async (item: ShowtimeItem) => {
    const slug = item.slug || (await resolveSlugForItem(item));
    if (!slug) console.log('[Schedule] không tìm thấy trong kho:', item.name, item.titles, item.year); 
    if (!slug) {
      Alert.alert('Chưa có phim', `"${item.name}" hiện chưa có trong kho phim của app.`);
      return;
    }
    router.push({ pathname: '/movie/[id]', params: { id: slug } } as any);
  }, [router]);

  const renderItem = useCallback(({ item }: { item: ShowtimeItem }) => (
    <TouchableOpacity
      style={styles.movieCard}
      activeOpacity={0.75}
      onPress={() => openMovie(item)}
    >
      <Image
        source={{ uri: item.poster }} style={styles.movieThumb}
        resizeMode="cover"
      />
      <View style={styles.movieInfo}>
        <Text style={styles.movieName} numberOfLines={2}>{item.name}</Text>
        {!!item.originalName && item.originalName !== item.name && (
          <Text style={styles.movieOrigin} numberOfLines={1}>{item.originalName}</Text>
        )}
        <Text style={[styles.movieEpisode, !item.episode && { opacity: 0.5 }]}>
          {item.episode || 'Đang cập nhật tập'}
        </Text>
      </View>
    </TouchableOpacity>
  ), [openMovie]);
  const keyExtractor = useCallback((item: ShowtimeItem) => String(item.id), []);

  return (
    <View style={styles.flex}>
      <View style={styles.dateBarWrapper}>
        <ScrollView
          ref={dateBarRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateBarContent}
        >
          {days.map((day, idx) => renderDateItem(day, idx))}
        </ScrollView>
        <View style={styles.dateBarBorder} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <PackageOpen size={48} color={Colors.textSecondary} style={styles.emptyIcon} />
          <Text style={styles.emptyText}>
            {isSameday(selectedDay, today)
              ? 'Hôm nay không có lịch chiếu nào!'
              : 'Ngày này không có lịch chiếu nào!'}
          </Text>
        </View>
      ) : (
        <FlatList
          style={styles.flex}
          data={items}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scheduleList}
        />
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Màn hình chính: 2 mục                                              */
/* ------------------------------------------------------------------ */

export default function ExploreScreen() {
  const router = useRouter();
  // Có thể mở thẳng mục lịch chiếu bằng: router.push('/explore?tab=schedule')
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const initialTab: TabKey = tab === 'schedule' ? 'schedule' : 'topics';

  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  // Chỉ mount Lịch chiếu khi bấm vào lần đầu, sau đó giữ nguyên để không mất ngày đã chọn
  const [scheduleMounted, setScheduleMounted] = useState(initialTab === 'schedule');

  const switchTab = (key: TabKey) => {
    setActiveTab(key);
    if (key === 'schedule') setScheduleMounted(true);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <ChevronLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Khám phá</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Thanh chuyển mục */}
      <View style={styles.tabBar}>
        {TABS.map((t) => {
          const active = t.key === activeTab;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabItem, active && styles.tabItemActive]}
              onPress={() => switchTab(t.key)}
              activeOpacity={0.75}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.flex}>
        <View style={[styles.flex, activeTab !== 'topics' && styles.hidden]}>
          <TopicsTab />
        </View>
        {scheduleMounted && (
          <View style={[styles.flex, activeTab !== 'schedule' && styles.hidden]}>
            <ScheduleTab />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  hidden: {
    display: 'none',
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  /* header + tab bar */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    marginBottom: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: '800',
  },

  /* chủ đề */
  topicList: {
    paddingHorizontal: H_PAD,
    paddingBottom: 24,
    gap: GAP,
  },
  row: {
    gap: GAP,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardThumb: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '65%',
  },
  cardGlow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 40,
  },
  cardBody: {
    position: 'absolute',
    left: 12,
    bottom: 10,
    right: '55%',
  },
  cardTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 19,
    zIndex: 1,
  },

  /* lịch chiếu */
  dateBarWrapper: {
    height: 56,
  },
  dateBarContent: {
    paddingHorizontal: 8,
  },
  dateBarBorder: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  dateItem: {
    width: 68,
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  dateItemActive: {
    borderBottomColor: Colors.primary,
  },
  dateNum: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 3,
  },
  dateNumActive: {
    color: Colors.primary,
    fontWeight: '800',
  },
  dateName: {
    color: Colors.textSecondary,
    fontSize: 11,
  },
  dateNameActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  scheduleList: {
    paddingTop: 4,
    paddingBottom: 20,
  },
  movieCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  movieThumb: {
    width: 130,
    height: 85,
    borderRadius: 8,
    backgroundColor: Colors.cardBackground,
  },
  movieInfo: {
    flex: 1,
    gap: 8,
  },
  movieName: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  movieOrigin: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: -4,
  },
  movieEpisode: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyIcon: {
    marginBottom: 4,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
});
