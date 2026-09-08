import { useRef, useState } from 'react';
import { Dimensions, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BarChart3, Calendar, ChevronDown, ChevronLeft, Filter, Menu, Search, Trophy } from 'lucide-react-native';

const EPL_LOGO = 'https://assets.football-logos.cc/logos/england/512x512/english-premier-league.b597f797.png';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.82;
const CARD_SPACING = 12;
const SIDE_PADDING = 14;

const MATCHES = [
    { id: '1', image: 'https://i.ibb.co/TD8dPNDL/Vd2rk.jpg' },
    { id: '2', image: 'https://i.ibb.co/FLh85YwR/OKqm-Q.jpg' },
    { id: '3', image: 'https://i.ibb.co/tMMJ4HHp/ZGfw-O.jpg' },
];

function TabPill({ label, icon, active, hot, onPress }: {
    label: string; icon?: React.ReactNode; active?: boolean; hot?: boolean; onPress: () => void;
}) {
    if (hot && active) {
        return (
            <Pressable onPress={onPress}>
                <LinearGradient
                    colors={['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#B14DFF']}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.tabPillHot}
                >
                    {icon}
                    <Text style={styles.tabPillTextActive}>{label}</Text>
                    <View style={styles.hotBadge}>
                        <Text style={styles.hotBadgeText}>HOT</Text>
                    </View>
                </LinearGradient>
            </Pressable>
        );
    }
    return (
        <Pressable onPress={onPress} style={[styles.tabPill, active && styles.tabPillActive]}>
            {icon}
            <Text style={[styles.tabPillText, active && styles.tabPillTextActive]}>{label}</Text>
        </Pressable>
    );
}

function MatchCardCarousel() {
    const listRef = useRef<FlatList>(null);

    return (
        <FlatList
            ref={listRef}
            data={MATCHES}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_WIDTH + CARD_SPACING}
            decelerationRate="fast"
            snapToAlignment="start"
            contentContainerStyle={{ paddingHorizontal: SIDE_PADDING }}
            ItemSeparatorComponent={() => <View style={{ width: CARD_SPACING }} />}
            renderItem={({ item }) => (
                <Pressable style={styles.card}>
                    <Image source={{ uri: item.image }} style={styles.cardImage} contentFit="cover" />
                </Pressable>
            )}
        />
    );
}

export function SportsHeader() {
    const router = useRouter();
    const [tab, setTab] = useState<'tong-hop' | 'epl' | 'vleague'>('epl');

    return (
        <View style={styles.wrapper}>
            <SafeAreaView edges={['top']} style={styles.safeArea}>
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} style={styles.iconBtn}>
                        <ChevronLeft size={22} color="#fff" />
                    </Pressable>
                    <Text style={styles.headerTitle}>Thể thao</Text>
                    <Pressable style={styles.iconBtn}>
                        <Search size={20} color="#fff" />
                    </Pressable>
                </View>

                <View style={styles.tabsRow}>
                    <TabPill
                        label="Tổng hợp"
                        icon={<Text style={styles.tabPillEmoji}>🏸</Text>}
                        active={tab === 'tong-hop'}
                        onPress={() => setTab('tong-hop')}
                    />
                    <TabPill
                        label="Ngoại hạng Anh"
                        icon={<Image source={{ uri: EPL_LOGO }} style={styles.tabPillLogo} contentFit="contain" />}
                        hot
                        active={tab === 'epl'}
                        onPress={() => setTab('epl')}
                    />
                    <TabPill
                        label="V.League"
                        icon={<Trophy size={13} color="#FF4D4D" fill="#FF4D4D" />}
                        active={tab === 'vleague'}
                        onPress={() => setTab('vleague')}
                    />
                    <Pressable style={styles.menuBtn}>
                        <Menu size={18} color="#fff" />
                    </Pressable>
                </View>
            </SafeAreaView>

            {/* 👇 carousel mới, nằm ngay dưới hàng tab có nút Menu */}
            <View style={styles.carouselWrap}>
                <MatchCardCarousel />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: { backgroundColor: '#0A1642' },
    safeArea: { backgroundColor: 'transparent' },

    header: {
        height: 52,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
    },
    headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
    iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

    tabsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8, paddingBottom: 10 },
    tabPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: '#152A62',
    },
    tabPillActive: { backgroundColor: '#22347A' },
    tabPillHot: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        paddingRight: 14,
        borderRadius: 16,
    },
    tabPillEmoji: { fontSize: 12 },
    tabPillLogo: { width: 16, height: 16, borderRadius: 8 },
    tabPillText: { color: '#AFC0EE', fontSize: 12, fontWeight: '600' },
    tabPillTextActive: { color: '#fff', fontSize: 12, fontWeight: '700' },
    hotBadge: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: '#FF4D4D',
        borderRadius: 6,
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderWidth: 1,
        borderColor: '#0F1F4D',
    },
    hotBadgeText: { color: '#fff', fontSize: 8, fontWeight: '800' },
    menuBtn: { marginLeft: 'auto', width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },

    carouselWrap: { paddingTop: 8, paddingBottom: 12 },
    card: {
        width: CARD_WIDTH,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#152A62',
    },
    cardImage: {
        width: '100%',
        aspectRatio: 375 / 220,
    },
});

export default SportsHeader;