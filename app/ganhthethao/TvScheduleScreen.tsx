import { StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';

/* =========================================================
   TV SCHEDULE SCREEN (Truyền hình)

   File riêng cho màn "Truyền hình" — hiện là placeholder,
   sau này thiết kế lịch phát sóng (kênh, khung giờ, trận đấu
   trực tiếp...) thì chỉ cần sửa trong file này, không ảnh
   hưởng các màn khác.
========================================================= */

export function TvScheduleScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.wrapper} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <ChevronLeft size={22} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Truyền hình</Text>
        <View style={styles.iconBtn} />
      </View>

      <View style={styles.content}>
        <Text style={styles.placeholderText}>
          Giao diện lịch truyền hình đang được xây dựng...
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

export default TvScheduleScreen;