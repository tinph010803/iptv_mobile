import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

const GANGAME_LOGO = 'https://res.cloudinary.com/df2amyjzw/image/upload/v1775745095/ganhgame_g8zdu4.png';
const GANGAME_BACKGROUND = 'https://res.cloudinary.com/df2amyjzw/image/upload/v1775745095/background_ganhgame_bowmpp.jpg';

export default function GanhGameScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.safeArea}>
            <LinearGradient colors={['#120A24', '#0D1026', '#060814']} style={styles.container}>
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}>
                        <ChevronLeft size={20} color="#F4ECFF" />
                    </Pressable>
                    <Text style={styles.headerTitle}>GanhGame</Text>
                    <View style={styles.headerSpacer} />
                </View>

                <View style={styles.heroWrap}>
                    <Image source={{ uri: GANGAME_BACKGROUND }} style={styles.heroBackground} contentFit="cover" />
                    <LinearGradient colors={['rgba(5,8,20,0.16)', 'rgba(5,8,20,0.72)', '#060814']} style={styles.heroShade} />

                    <View style={styles.heroContent}>
                        <View style={styles.logoCard}>
                            <Image source={{ uri: GANGAME_LOGO }} style={styles.logo} contentFit="contain" />
                        </View>

                        <Text style={styles.heroTitle}>Khu giải trí GanhGame</Text>
                        <Text style={styles.heroText}>
                            Giao diện riêng cho nổ hũ, tài xỉu và các nội dung giải trí tốc độ cao trên di động.
                        </Text>

                        <View style={styles.badgeRow}>
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>NỔ HŨ</Text>
                            </View>
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>TÀI XỈU</Text>
                            </View>
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>MOBILE UI</Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>Đang hoàn thiện</Text>
                    <Text style={styles.infoText}>
                        Trang này là điểm vào riêng cho GanhGame. Nếu bạn muốn, tôi có thể làm tiếp phần menu, phòng chơi hoặc luồng xác minh tuổi.
                    </Text>
                </View>
            </LinearGradient>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#060814',
    },
    container: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 18,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    backBtnPressed: {
        opacity: 0.82,
    },
    headerTitle: {
        color: '#F4ECFF',
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    headerSpacer: {
        width: 40,
        height: 40,
    },
    heroWrap: {
        flex: 1,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        marginBottom: 14,
        backgroundColor: '#0A0D1C',
        minHeight: 420,
    },
    heroBackground: {
        ...StyleSheet.absoluteFill,
        width: '100%',
        height: '100%',
    },
    heroShade: {
        ...StyleSheet.absoluteFill,
    },
    heroContent: {
        flex: 1,
        justifyContent: 'flex-end',
        padding: 16,
        gap: 12,
    },
    logoCard: {
        alignSelf: 'flex-start',
        width: '78%',
        maxWidth: 280,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 18,
        backgroundColor: 'rgba(7, 10, 25, 0.68)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    logo: {
        width: '100%',
        height: 68,
    },
    heroTitle: {
        color: '#FFF6FF',
        fontSize: 28,
        lineHeight: 34,
        fontWeight: '900',
    },
    heroText: {
        color: '#D8D3F2',
        fontSize: 15,
        lineHeight: 22,
        maxWidth: '96%',
    },
    badgeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    badge: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.16)',
    },
    badgeText: {
        color: '#F7E9FF',
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.4,
    },
    infoCard: {
        borderRadius: 18,
        padding: 16,
        backgroundColor: 'rgba(16, 20, 42, 0.92)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    infoTitle: {
        color: '#F4ECFF',
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 6,
    },
    infoText: {
        color: '#C8C3E4',
        fontSize: 14,
        lineHeight: 21,
    },
});