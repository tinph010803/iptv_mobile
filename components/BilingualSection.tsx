import { memo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Languages, ArrowRight } from 'lucide-react-native'; import { Colors } from '@/constants/colors';
import { Movie } from '@/types/movie';
import { prefetchMovieBySlug, seedMovieDetailCache } from '@/lib/ophim';

const CARD_W = 130;

const BilingualCard = memo(function BilingualCard({ item }: { item: Movie }) {
    const router = useRouter();
    const targetId = item.slug || item.id;
    const subText = item.is_series ? `PĐ.${item.current_episode}` : 'PĐ.';

    const onPressIn = useCallback(() => {
        if (!targetId) return;
        seedMovieDetailCache(item);
        prefetchMovieBySlug(targetId);
    }, [targetId, item]);

    const onPress = useCallback(() => {
        if (targetId) router.push({ pathname: '/movie/[id]', params: { id: targetId } });
    }, [targetId]);

    return (
        <TouchableOpacity style={styles.card} activeOpacity={0.75} onPressIn={onPressIn} onPress={onPress}>
            <View style={styles.posterWrap}>
                <Image source={{ uri: item.thumb_url }} style={styles.poster} resizeMode="cover" fadeDuration={0} />
                <View style={styles.dualBadge}>
                    <Languages size={10} color="#fff" />
                    <Text style={styles.dualBadgeText}>Song Ngữ</Text>
                </View>
                <View style={styles.subBadge}>
                    <Text style={styles.subBadgeText}>{subText}</Text>
                </View>
            </View>
            <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.titleEn} numberOfLines={1}>{item.title_en}</Text>
        </TouchableOpacity>
    );
});
export const BilingualSection = memo(function BilingualSection({ movies }: { movies: Movie[] }) {
    const router = useRouter();
    if (!movies.length) return null;
    return (
        <View style={styles.wrap}>
            {/* Banner */}
            <View style={styles.banner}>
                <Image
                    source={{ uri: 'https://png.pngtree.com/thumb_back/fh260/background/20260428/pngtree-football-field-grass-sports-sky-sports-background-image_21751104.webp' }}
                    style={styles.bannerBg}
                    resizeMode="cover"
                />
                <Image
                    source={{ uri: 'https://www.rophim.soy/images/event_304/hero.png' }}
                    style={styles.bannerHero}
                    resizeMode="contain"
                />
                <Image
                    source={{ uri: 'https://res.cloudinary.com/df2amyjzw/image/upload/v1790659770/0HheF-Photoroom_c215to.png' }}
                    style={styles.bannerLogo}
                    resizeMode="contain"
                />
                <TouchableOpacity
                    style={styles.bannerArrow}
                    activeOpacity={0.85}
                    onPress={() => router.push('/bilingual' as any)}
                >
                    <ArrowRight size={18} color="#111" />
                </TouchableOpacity>
            </View>

            {/* Danh sách (giữ nguyên) */}
            <View style={styles.listWrap}>
                <View style={styles.listBox}>
                    <FlatList
                        horizontal
                        data={movies}
                        keyExtractor={(m) => m.slug || m.id}
                        renderItem={({ item }) => <BilingualCard item={item} />}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.listContent}
                        nestedScrollEnabled
                    />
                </View>
            </View>

        </View>
    );
});

const styles = StyleSheet.create({
    wrap: {
        marginHorizontal: 12,
        marginBottom: 20,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    banner: { height: 200, width: '100%', position: 'relative', overflow: 'hidden' },
    bannerBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
    bannerHero: { position: 'absolute', left: 0, bottom: 0, width: '65%', height: '90%' },
    bannerLogo: { position: 'absolute', top: 12, right: 12, width: 120, height: 90 },
    bannerArrow: {
        position: 'absolute',
        right: 12,
        bottom: 12,
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    listWrap: { padding: 12 },
    moreBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#C8281E',
        paddingVertical: 16,
    },
    moreText: { color: '#fff', fontSize: 15, fontWeight: '800' },
    heading: { color: '#fff', fontSize: 24, fontWeight: '800' },
    headingSub: { fontSize: 24, fontWeight: '800', marginTop: 2 },
    hlYellow: { color: '#F5C518' },
    hlMint: { color: '#8EF0D0' },
    desc: { color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 20, marginTop: 12 },
    seeAllBtn: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 999,
        marginTop: 16,
    },
    seeAllText: { color: '#111', fontSize: 14, fontWeight: '800' },
    listBox: {
        marginTop: 16,
        marginHorizontal: -6,
        borderRadius: 16,
        backgroundColor: 'rgba(0,0,0,0.25)',
        paddingVertical: 12,
    },
    listContent: { paddingHorizontal: 12, gap: 12 },
    card: { width: CARD_W },
    posterWrap: {
        width: '100%',
        aspectRatio: 2 / 3,
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: Colors.cardBackground,
    },
    poster: { width: '100%', height: '100%' },
    dualBadge: {
        position: 'absolute',
        top: 6,
        left: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(139,92,246,0.95)',
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 6,
    },
    dualBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
    subBadge: {
        position: 'absolute',
        bottom: 6,
        left: 6,
        backgroundColor: 'rgba(77,85,118,0.95)',
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 999,
    },
    subBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
    title: { color: '#fff', fontSize: 13, fontWeight: '700', marginTop: 6 },
    titleEn: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 },
});