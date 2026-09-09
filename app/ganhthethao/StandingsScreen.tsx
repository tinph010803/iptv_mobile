import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { Pressable } from 'react-native';
import { useRouter } from 'expo-router';

/* =========================================================
   STANDINGS SCREEN (Bảng xếp hạng)

   File riêng cho màn "Bảng xếp hạng" — hiện là placeholder,
   sau này thiết kế bảng xếp hạng (logo đội, điểm, thắng/hòa/
   thua...) thì chỉ cần sửa trong file này, không ảnh hưởng
   các màn khác.
========================================================= */

export function StandingsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.wrapper} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <ChevronLeft size={22} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Bảng xếp hạng</Text>
        <View style={styles.iconBtn} />
      </View>

      <View style={styles.content}>
        <Text style={styles.placeholderText}>
          Giao diện bảng xếp hạng đang được xây dựng...
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },

  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },

  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },

  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  placeholderText: {
    color: '#8A8A93',
    fontSize: 13,
    textAlign: 'center',
  },
});

export default StandingsScreen;