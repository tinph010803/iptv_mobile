import { StyleSheet, View, Text, FlatList, TouchableOpacity, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Colors } from '@/constants/colors';

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

export default function TopicsScreen() {
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
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ChevronLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tất cả chủ đề</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={TOPICS}
        keyExtractor={(item) => item.slug}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  list: {
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
});
