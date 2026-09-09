import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Channel } from '@/types/iptv';
import TvPlayer from '@/components/TvPlayer';

export default function IptvPlayerScreen() {
  const router = useRouter();
  const { channel: rawChannel } = useLocalSearchParams<{ channel?: string }>();
  let channel: Channel | null = null;

  try {
    channel = rawChannel ? JSON.parse(rawChannel) : null;
  } catch {
    channel = null;
  }

  if (!channel) {
    return (
      <View style={styles.error}>
        <Text style={styles.errorText}>Dữ liệu kênh không hợp lệ</Text>
        <Text style={styles.back} onPress={() => router.back()}>Quay lại</Text>
      </View>
    );
  }

  return <TvPlayer channel={channel} onClose={() => router.back()} />;
}

const styles = StyleSheet.create({
  error: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: '#09090d' },
  errorText: { color: '#fff', fontSize: 16 },
  back: { color: '#38bdf8', fontWeight: '700' },
});
