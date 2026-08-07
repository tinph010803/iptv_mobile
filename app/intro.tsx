import { useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ArrowRight } from 'lucide-react-native';
import { WebView } from 'react-native-webview';

type FeatureCardProps = {
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    description: string;
    action: string;
    backgroundImage: string;
    imageFit?: 'cover' | 'contain';
    fullBackground?: boolean;
    disabled?: boolean;
    onPress?: () => void;
};

function FeatureCard({
    title,
    subtitle,
    description,
    action,
    backgroundImage,
    imageFit = 'cover',
    fullBackground = false,
    disabled,
    onPress,
}: FeatureCardProps) {
    const showArrow = action.toLowerCase().includes('xem ngay');

    return (
        <Pressable
            style={({ pressed }) => [
                styles.featureCard,
                disabled && styles.featureCardDisabled,
                pressed && !disabled && styles.featureCardPressed,
            ]}
            onPress={onPress}
            disabled={disabled}
        >
            <View style={[styles.featureCardSurface, disabled && styles.featureCardSurfaceDisabled]}>
                <View style={[styles.cardMediaRight, fullBackground && styles.cardMediaFull]}>
                    <Image source={{ uri: backgroundImage }} style={styles.cardMediaImage} contentFit={imageFit} contentPosition="right" />
                </View>

                <LinearGradient
                    colors={['#1A2347', 'rgba(26,35,71,0.92)', 'rgba(26,35,71,0.58)', 'rgba(26,35,71,0.08)']}
                    locations={[0, 0.48, 0.75, 1]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.cardShade}
                />

                <View style={styles.featureCardContent}>
                    <View style={styles.cardTopRow}>
                        <View style={styles.cardTitleWrap}>
                            {title}
                            {subtitle ?? null}
                        </View>
                    </View>

                    <Text style={styles.featureDescription}>{description}</Text>

                    <View style={styles.featureActionRow}>
                        <View style={[styles.featureActionPill, disabled && styles.featureActionPillDisabled]}>
                            <Text style={[styles.featureAction, disabled && styles.featureActionDisabled]}>{action}</Text>
                            {showArrow ? <ArrowRight size={16} color="#EBF1FF" /> : null}
                        </View>
                    </View>
                </View>
            </View>
        </Pressable>
    );
}

const LOGOS = {
    ganhGiaiTri: 'https://img.upanhnhanh.com/d8d7ada8c26081ef68c5f6af04d61982',
    ganhPhim: 'https://res.cloudinary.com/df2amyjzw/image/upload/v1775885578/ganhcinema_lwwhwy.png',
    // ganhPhim: 'https://res.cloudinary.com/df2amyjzw/image/upload/v1786077846/upflix-removebg-preview_dsnd1z.png',
    // ganhPhim2: 'https://res.cloudinary.com/df2amyjzw/image/upload/v1775885578/ganhcinema_lwwhwy.png',
    ganhPhim2: 'https://res.cloudinary.com/df2amyjzw/image/upload/v1786077846/upflix-removebg-preview_dsnd1z.png',
    onflix: 'https://res.cloudinary.com/df2amyjzw/image/upload/v1775905493/logoonflix_bg8k3v.png',
    motchilltv: 'https://res.cloudinary.com/df2amyjzw/image/upload/v1775905558/logo_mx7bjo.png',
    ganhTruyen: 'https://res.cloudinary.com/df2amyjzw/image/upload/v1780205428/pZCZJ-removebg-preview_zfcdpg.png',
    thanhGanhManga: 'https://img.upanhnhanh.com/c1b2b67d909a03f92e233092ed4b56fd',
    ganhTheThao: 'https://eascore.io/wp-content/uploads/2026/05/cropped-logo-socolive-tv.png',
    ganh3d: 'https://res.cloudinary.com/df2amyjzw/image/upload/v1775824346/ganh3d-removebg-preview_x3cw8x.png',
};

const BACKGROUNDS = {
    ganhPhim: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&h=500&fit=crop',
    ganhTruyen: 'https://res.cloudinary.com/df2amyjzw/image/upload/v1775745095/background_ganhgame_bowmpp.jpg',
    thanhGanhManga: 'https://res.cloudinary.com/df2amyjzw/image/upload/v1775825068/backgrond_ganhmanga_wi9yd4.png',
    ganhTheThao: 'https://play-lh.googleusercontent.com/T6oxu6MrpMrn0i8YftSZdl7LMG1YOWPZ6T8k7ly4ElJ0oWKGTNSzBcIrEyFmu4Lqk38=w526-h296-rw',
    ganh3d: 'https://res.cloudinary.com/df2amyjzw/image/upload/v1775825490/background_ganh3d_gcgb3g.jpg',
};

const SPORTS_GATE_IMAGE = 'https://img.upanhnhanh.com/9ecfcd2828e9c2b6ba2084d1ebe86e56';
const GANH3D_LOCKED_USER_KEY = '@ganh3d_locked_user_v1';

const GANH3D_PROFILES = [
    {
        id: 'son-tuong',
        name: 'Sơn Tường Xem Tivi [T]',
        username: 'teophan370',
        avatar: 'https://res.cloudinary.com/df2amyjzw/image/upload/v1775823230/photo-1-17168606131071257137350-1717299704114-17172997052861912201322_sgflfc.jpg',
    },
    {
        id: 'dach-5-cu',
        name: 'Dách 5 Củ [H]',
        username: 'teophan371',
        avatar: 'https://res.cloudinary.com/df2amyjzw/image/upload/v1775823229/jack--17345360331611347307406_uftcan.webp',
    },
    {
        id: 'trinh-ai-cham',
        name: 'Trình Ai Chấm [N]',
        username: 'teophan372',
        avatar: 'https://res.cloudinary.com/df2amyjzw/image/upload/v1775823230/HIEUTHUHAI-3-scaled_c1w8x2.jpg',
    },
] as const;

const CINEMA_PROFILES = [
    {
        id: 'ganh-phim',
        name: 'Upflix',
        logo: LOGOS.ganhPhim2,
        active: true,
    },
    {
        id: 'onflix',
        name: 'Onflix',
        logo: LOGOS.onflix,
        active: true,
    },
    {
        id: 'motchilltv',
        name: 'MotchillTV',
        logo: LOGOS.motchilltv,
        active: false,
    },
] as const;

export default function IntroScreen() {
    const router = useRouter();
    const scrollRef = useRef<ScrollView>(null);
    const [activeTab, setActiveTab] = useState<'home' | 'terms' | 'license'>('home');
    const [openDocId, setOpenDocId] = useState<'good-standing' | 'business' | null>(null);
    const [showSportsGate, setShowSportsGate] = useState(false);
    const [sportsTermsAccepted, setSportsTermsAccepted] = useState(false);
    const [showCinemaGate, setShowCinemaGate] = useState(false);
    const [showGanh18Gate, setShowGanh18Gate] = useState(false);
    const [lockedGanh3dUser, setLockedGanh3dUser] = useState<string | null>(null);
    const currentDate = useMemo(() => {
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        return `${day}/${month}/${year}`;
    }, []);

    const stars = useMemo(
        () =>
            Array.from({ length: 36 }, (_, i) => ({
                id: i,
                left: 12 + ((i * 23) % 300),
                top: 8 + ((i * 37) % 180),
                opacity: 0.2 + ((i * 11) % 7) * 0.1,
            })),
        []
    );

    const handleContinueToSports = () => {
        if (!sportsTermsAccepted) return;

        setShowSportsGate(false);
        router.push('/ganhthethao' as any);
    };

    const handleSelectCinemaProfile = (profileId: string) => {
        setShowCinemaGate(false);

        if (profileId === 'ganh-phim') {
            router.replace('/(tabs)' as any);
            return;
        }


        if (profileId === 'onflix') {
            router.push('/onflix' as any);
            return;
        }

        if (profileId === 'motchilltv') {
            router.push('/motchiltv' as any);
        }
    };

    const handleSelectGanh3dProfile = (username: string) => {
        setShowGanh18Gate(false);
        setLockedGanh3dUser(username);
        AsyncStorage.setItem(GANH3D_LOCKED_USER_KEY, username).catch(() => {});
        router.push({
            pathname: '/ganh3d' as any,
            params: { user: username },
        });
    };

    useEffect(() => {
        AsyncStorage.getItem(GANH3D_LOCKED_USER_KEY)
            .then((value) => {
                if (value) setLockedGanh3dUser(value);
            })
            .catch(() => {});
    }, []);

    const handleTabChange = (tab: 'home' | 'terms' | 'license') => {
        setActiveTab(tab);
        requestAnimationFrame(() => {
            scrollRef.current?.scrollTo({ y: 0, animated: true });
        });
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <LinearGradient
                colors={['#0A1436', '#0A1A47', '#0B1F56']}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={styles.container}
            >
                <ScrollView ref={scrollRef} style={styles.scrollArea} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <View style={styles.header}>
                        <Image source={{ uri: LOGOS.ganhGiaiTri }} style={styles.brandImage} contentFit="contain" contentPosition="left" />
                    </View>

                    {activeTab === 'home' ? (
                        <>
                            <View style={styles.heroWrap}>
                                <LinearGradient
                                    colors={['#2D3A76', '#2A346D']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.hero}
                                >
                                    {stars.map((s) => (
                                        <View
                                            key={s.id}
                                            style={[
                                                styles.star,
                                                {
                                                    left: s.left,
                                                    top: s.top,
                                                    opacity: s.opacity,
                                                },
                                            ]}
                                        />
                                    ))}

                                    <View style={styles.heroBadge}>
                                        <Text style={styles.heroBadgeText}>{currentDate}</Text>
                                    </View>

                                    <Text style={styles.heroTitle}>Giải trí miễn phí không giới hạn cùng Gánh Giải Trí</Text>
                                    <Text style={styles.heroText}>
                                        Gánh Giải Trí tổng hợp phim, anime, thể thao và nội dung hot cập nhật liên tục.
                                        Tối ưu cho điện thoại để thao tác nhanh và gọn.
                                    </Text>
                                </LinearGradient>
                            </View>

                            <Text style={styles.sectionTitle}>Chọn chuyên mục</Text>

                            <View style={styles.cardsContainer}>
                                <FeatureCard
                                    title={<Image source={{ uri: LOGOS.ganhPhim }} style={styles.cardTitleLogo} contentFit="contain" contentPosition="left" />}
                                    description="Gánh Cinema là nơi tổng hợp nhiều nguồn phim khác nhau, cập nhật liên tục và tối ưu cho trải nghiệm."
                                    action="Xem ngay"
                                    backgroundImage={BACKGROUNDS.ganhPhim}
                                    onPress={() => setShowCinemaGate(true)}
                                />
                                <FeatureCard
                                    title={<Image source={{ uri: LOGOS.ganh3d }} style={styles.cardTitleLogo} contentFit="contain" contentPosition="left" />}
                                    description="Chuyên mục phim 3D tu tiên nổi bật, giao diện gọn nhẹ và tối ưu cho mobile."
                                    action="Xem ngay"
                                    backgroundImage={BACKGROUNDS.ganh3d}
                                    imageFit="contain"
                                    fullBackground
                                    onPress={() => setShowGanh18Gate(true)}
                                />
                                <FeatureCard
                                    title={<Image source={{ uri: LOGOS.ganhTheThao }} style={styles.cardTitleLogo} contentFit="contain" contentPosition="left" />}
                                    subtitle={<Text style={styles.featureSubtitle}>KHÔNG NÊN CỜ BẠC</Text>}
                                    description="Không gian tổng hợp thông tin thể thao mang tính giải trí và cập nhật nhanh."
                                    action="Xem ngay"
                                    backgroundImage={BACKGROUNDS.ganhTheThao}
                                    onPress={() => setShowSportsGate(true)}
                                />

                                <FeatureCard
                                    title={<Image source={{ uri: LOGOS.ganhTruyen }} style={styles.cardTitleLogo} contentFit="contain" contentPosition="left" />}
                                    description="Khu giải trí GanhTruyen với giao diện riêng và nền hình nổi bật trên mobile."
                                    action="Xem ngay"
                                    backgroundImage={BACKGROUNDS.ganhTruyen}
                                    onPress={() => router.push('/ganhtruyen' as any)}
                                />

                                <FeatureCard
                                    title={<Image source={{ uri: LOGOS.thanhGanhManga }} style={styles.cardTitleLogo} contentFit="contain" contentPosition="left" />}
                                    description="Kho anime và hoạt hình chọn lọc với điều hướng đơn giản, mượt mà."
                                    action="Sắp ra mắt"
                                    backgroundImage={BACKGROUNDS.thanhGanhManga}
                                    disabled
                                />




                            </View>
                        </>
                    ) : activeTab === 'terms' ? (
                        <View style={styles.termsWrap}>
                            <Text style={styles.termsTitle}>Điều khoản sử dụng</Text>

                            <View style={styles.termsBlock}>
                                <Text style={styles.termsBlockTitle}>1. Điều khoản chung</Text>
                                <Text style={styles.termsText}>
                                    Khi truy cập và sử dụng dịch vụ của GanhGiaiTri, bạn đồng ý tuân thủ các điều khoản và điều kiện được quy định dưới đây. Nếu bạn không đồng ý với bất kỳ điều khoản nào, vui lòng không sử dụng dịch vụ của chúng tôi.
                                </Text>
                                <Text style={styles.termsText}>
                                    GanhGiaiTri có quyền thay đổi, chỉnh sửa hoặc cập nhật các điều khoản này bất kỳ lúc nào mà không cần thông báo trước.
                                </Text>
                            </View>

                            <View style={styles.termsBlock}>
                                <Text style={styles.termsBlockTitle}>2. Quyền sở hữu trí tuệ</Text>
                                <Text style={styles.termsText}>
                                    Tất cả nội dung trên GanhGiaiTri bao gồm nhưng không giới hạn: video, hình ảnh, văn bản, giao diện, logo đều thuộc quyền sở hữu hoặc được cấp phép cho GanhGiaiTri.
                                </Text>
                                <Text style={styles.termsText}>
                                    Người dùng không được sao chép, phân phối, chỉnh sửa hoặc sử dụng bất kỳ nội dung nào trên trang web cho mục đích thương mại.
                                </Text>
                            </View>

                            <View style={styles.termsBlock}>
                                <Text style={styles.termsBlockTitle}>3. Quy định về nội dung</Text>
                                <Text style={styles.termsText}>
                                    GanhGiaiTri cung cấp nhiều loại nội dung khác nhau, bao gồm chuyên mục phim 3D tu tiên (GANH3D).
                                </Text>
                                <Text style={styles.termsText}>
                                    Nội dung mang tính giải trí, người dùng cần tự cân nhắc tính phù hợp trước khi truy cập.
                                </Text>
                            </View>

                            <View style={styles.termsBlock}>
                                <Text style={styles.termsBlockTitle}>4. Giới hạn trách nhiệm</Text>
                                <Text style={styles.termsText}>
                                    GanhGiaiTri cung cấp dịch vụ trên cơ sở "nguyên trạng" và không đưa ra bất kỳ cam kết hay bảo đảm nào.
                                </Text>
                                <Text style={styles.termsText}>
                                    Chúng tôi không chịu trách nhiệm cho bất kỳ thiệt hại trực tiếp hoặc gián tiếp nào phát sinh từ việc sử dụng dịch vụ.
                                </Text>
                            </View>

                            <View style={styles.termsBlock}>
                                <Text style={styles.termsBlockTitle}>5. Quyền riêng tư</Text>
                                <Text style={styles.termsText}>
                                    GanhGiaiTri tôn trọng quyền riêng tư của người dùng. Chúng tôi không thu thập thông tin cá nhân khi bạn sử dụng dịch vụ trừ khi bạn tự nguyện cung cấp.
                                </Text>
                                <Text style={styles.termsText}>
                                    Mọi thông tin thu thập được sẽ chỉ được sử dụng để cải thiện trải nghiệm người dùng.
                                </Text>
                            </View>

                            <View style={styles.termsBlock}>
                                <Text style={styles.termsBlockTitle}>6. Liên hệ</Text>
                                <Text style={styles.termsText}>
                                    Nếu bạn có bất kỳ câu hỏi nào về các điều khoản sử dụng, vui lòng liên hệ với chúng tôi qua trang Liên hệ.
                                </Text>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.licenseSection}>
                            <Text style={styles.licenseTitle}>Giấy phép kinh doanh</Text>
                            <Text style={styles.licenseSubtitle}>Tài liệu pháp lý của 3 DOT MOVIES PTE. LTD.</Text>

                            <View style={styles.licenseCardWrap}>
                                <View style={styles.licenseCard}>
                                    <View style={styles.licenseCardTextWrap}>
                                        <Text style={styles.licenseCardTitle}>Certificate of Good Standing</Text>
                                        <Text style={styles.licenseCardDesc}>Chứng nhận tình trạng pháp lý tốt của công ty</Text>
                                    </View>
                                    <Pressable
                                        onPress={() => setOpenDocId(openDocId === 'good-standing' ? null : 'good-standing')}
                                        style={({ pressed }) => [styles.licenseBtn, styles.licenseBtnGreen, pressed && styles.licenseBtnPressed]}
                                    >
                                        <Text style={[styles.licenseBtnText, styles.licenseBtnTextGreen]}>
                                            {openDocId === 'good-standing' ? 'Ẩn tài liệu' : 'Xem tài liệu'}
                                        </Text>
                                    </Pressable>
                                </View>

                                {openDocId === 'good-standing' ? (
                                    <View style={styles.docViewerWrap}>
                                        <WebView
                                            source={{
                                                uri: 'https://docs.google.com/gview?url=https%3A%2F%2Fblobs.vusercontent.net%2Fblob%2FCertificate-of-Good-Standing-RHg6FKqbt21TmPF9c1ujzlIY5WCo3c.pdf&embedded=true',
                                            }}
                                            style={styles.docViewer}
                                        />
                                    </View>
                                ) : null}
                            </View>

                            <View style={styles.licenseCardWrap}>
                                <View style={styles.licenseCard}>
                                    <View style={styles.licenseCardTextWrap}>
                                        <Text style={styles.licenseCardTitle}>Business Profile (Co)</Text>
                                        <Text style={styles.licenseCardDesc}>Hồ sơ kinh doanh công ty</Text>
                                    </View>
                                    <Pressable
                                        onPress={() => setOpenDocId(openDocId === 'business' ? null : 'business')}
                                        style={({ pressed }) => [styles.licenseBtn, styles.licenseBtnBlue, pressed && styles.licenseBtnPressed]}
                                    >
                                        <Text style={[styles.licenseBtnText, styles.licenseBtnTextBlue]}>
                                            {openDocId === 'business' ? 'Ẩn tài liệu' : 'Xem tài liệu'}
                                        </Text>
                                    </Pressable>
                                </View>

                                {openDocId === 'business' ? (
                                    <View style={styles.docViewerWrap}>
                                        <WebView
                                            source={{
                                                uri: 'https://docs.google.com/gview?url=https%3A%2F%2Fblobs.vusercontent.net%2Fblob%2FBusiness%2520Profile-xzpZAQLsciE2Vuegzohee27cUfguVs.pdf&embedded=true',
                                            }}
                                            style={styles.docViewer}
                                        />
                                    </View>
                                ) : null}
                            </View>
                        </View>
                    )}
                </ScrollView>

                <View style={styles.bottomMenu}>
                    <Pressable
                        onPress={() => handleTabChange('home')}
                        style={({ pressed }) => [
                            styles.menuItem,
                            activeTab === 'home' && styles.menuItemActive,
                            pressed && styles.menuItemPressed,
                        ]}
                    >
                        <Text style={[styles.menuText, activeTab === 'home' && styles.menuTextActive]}>Trang chủ</Text>
                    </Pressable>

                    <Pressable
                        onPress={() => handleTabChange('terms')}
                        style={({ pressed }) => [
                            styles.menuItem,
                            activeTab === 'terms' && styles.menuItemActive,
                            pressed && styles.menuItemPressed,
                        ]}
                    >
                        <Text style={[styles.menuText, activeTab === 'terms' && styles.menuTextActive]}>Điều khoản</Text>
                    </Pressable>

                    <Pressable
                        onPress={() => handleTabChange('license')}
                        style={({ pressed }) => [
                            styles.menuItem,
                            activeTab === 'license' && styles.menuItemActive,
                            pressed && styles.menuItemPressed,
                        ]}
                    >
                        <Text style={[styles.menuText, activeTab === 'license' && styles.menuTextActive]}>Giấy phép</Text>
                    </Pressable>
                </View>

                {showSportsGate ? (
                    <View style={styles.sportsGateOverlay}>
                        <View style={styles.sportsGateCard}>
                            <Pressable
                                onPress={() => setShowSportsGate(false)}
                                style={({ pressed }) => [styles.sportsGateCloseBtn, pressed && styles.sportsGateCloseBtnPressed]}
                            >
                                <Text style={styles.sportsGateCloseText}>X</Text>
                            </Pressable>

                            <Image source={{ uri: SPORTS_GATE_IMAGE }} style={styles.sportsGateImage} contentFit="contain" />

                            <Pressable
                                onPress={() => setSportsTermsAccepted((prev) => !prev)}
                                style={({ pressed }) => [styles.sportsGateTermsRow, pressed && styles.sportsGateTermsRowPressed]}
                            >
                                <View style={[styles.sportsGateCheckbox, sportsTermsAccepted && styles.sportsGateCheckboxChecked]}>
                                    {sportsTermsAccepted ? <Text style={styles.sportsGateCheckboxMark}>✓</Text> : null}
                                </View>
                                <Text style={styles.sportsGateTermsText}>Tôi đồng ý với</Text>
                                <Pressable
                                    onPress={() => {
                                        setShowSportsGate(false);
                                        setActiveTab('terms');
                                    }}
                                >
                                    <Text style={styles.sportsGateTermsLink}>điều khoản của hệ thống</Text>
                                </Pressable>
                            </Pressable>

                            <Pressable
                                onPress={handleContinueToSports}
                                disabled={!sportsTermsAccepted}
                                style={({ pressed }) => [
                                    styles.sportsGateContinueBtn,
                                    !sportsTermsAccepted && styles.sportsGateContinueBtnDisabled,
                                    pressed && sportsTermsAccepted && styles.sportsGateContinueBtnPressed,
                                ]}
                            >
                                <Text style={[styles.sportsGateContinueText, !sportsTermsAccepted && styles.sportsGateContinueTextDisabled]}>
                                    Tiếp tục
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                ) : null}

                {showCinemaGate ? (
                    <View style={styles.cinemaGateOverlay}>
                        <View style={styles.cinemaGateCard}>
                            <Pressable
                                onPress={() => setShowCinemaGate(false)}
                                style={({ pressed }) => [styles.cinemaGateCloseBtn, pressed && styles.cinemaGateCloseBtnPressed]}
                            >
                                <Text style={styles.cinemaGateCloseText}>X</Text>
                            </Pressable>

                            <Text style={styles.cinemaGateTitle}>Gánh Cinema</Text>
                            <Text style={styles.cinemaGateSubtitle}>
                                Gánh Cinema là nơi tổng hợp nhiều nguồn phim khác nhau, cập nhật liên tục và tối ưu cho trải nghiệm.
                            </Text>

                            <View style={styles.cinemaProfilesRow}>
                                {CINEMA_PROFILES.map((profile) => (
                                    <Pressable
                                        key={profile.id}
                                        onPress={() => handleSelectCinemaProfile(profile.id)}
                                        disabled={!profile.active}
                                        style={({ pressed }) => [
                                            styles.cinemaProfileItem,
                                            !profile.active && styles.cinemaProfileItemDisabled,
                                            pressed && profile.active && styles.cinemaProfileItemPressed,
                                        ]}
                                    >
                                        <View style={[styles.cinemaProfileLogoWrap, !profile.active && styles.cinemaProfileLogoWrapDisabled]}>
                                            <Image source={{ uri: profile.logo }} style={styles.cinemaProfileLogo} contentFit="contain" />
                                        </View>
                                        <Text style={[styles.cinemaProfileName, !profile.active && styles.cinemaProfileNameDisabled]}>
                                            {profile.name}
                                            {!profile.active ? ' (Soon)' : ''}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>

                            <Pressable
                                onPress={() => setShowCinemaGate(false)}
                                style={({ pressed }) => [styles.cinemaGateContinueBtn, pressed && styles.cinemaGateContinueBtnPressed]}
                            >
                                <Text style={styles.cinemaGateContinueText}>Đóng</Text>
                            </Pressable>
                        </View>
                    </View>
                ) : null}

                {showGanh18Gate ? (
                    <View style={styles.ganh18GateOverlay}>
                        <View style={styles.ganh18GateCard}>
                            <Pressable
                                onPress={() => setShowGanh18Gate(false)}
                                style={({ pressed }) => [styles.ganh18GateCloseBtn, pressed && styles.ganh18GateCloseBtnPressed]}
                            >
                                <Text style={styles.ganh18GateCloseText}>X</Text>
                            </Pressable>

                            <Text style={styles.ganh18GateTitle}>Ai đang xem?</Text>

                            {lockedGanh3dUser ? (
                                <Text style={styles.ganh18GateLockedHint}>
                                    Đang khóa theo: {GANH3D_PROFILES.find((profile) => profile.username === lockedGanh3dUser)?.name ?? lockedGanh3dUser}
                                </Text>
                            ) : null}

                            <View style={styles.ganh3dProfilesRow}>
                                {GANH3D_PROFILES.map((profile) => (
                                    <Pressable
                                        key={profile.id}
                                        onPress={() => handleSelectGanh3dProfile(profile.username)}
                                        disabled={lockedGanh3dUser !== null && lockedGanh3dUser !== profile.username}
                                        style={({ pressed }) => [
                                            styles.ganh3dProfileItem,
                                            lockedGanh3dUser !== null && lockedGanh3dUser !== profile.username && styles.ganh3dProfileItemDisabled,
                                            pressed && lockedGanh3dUser === null && styles.ganh3dProfileItemPressed,
                                        ]}
                                    >
                                        <Image
                                            source={{ uri: profile.avatar }}
                                            style={styles.ganh3dProfileAvatar}
                                            contentFit="cover"
                                        />
                                        <Text style={styles.ganh3dProfileName}>{profile.name}</Text>
                                    </Pressable>
                                ))}
                            </View>

                            <Pressable
                                onPress={() => setShowGanh18Gate(false)}
                                style={({ pressed }) => [styles.ganh18GateContinueBtn, pressed && styles.ganh18GateContinueBtnPressed]}
                            >
                                <Text style={styles.ganh18GateContinueText}>Đóng</Text>
                            </Pressable>
                        </View>
                    </View>
                ) : null}
            </LinearGradient>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#0A1436',
    },
    container: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 20,
    },
    scrollArea: {
        flex: 1,
    },
    header: {
        marginBottom: 12,
    },
    brandImage: {
        width: 288,
        height: 78,
        alignSelf: 'flex-start',
    },
    brandSubImage: {
        marginTop: 2,
        width: 196,
        height: 36,
        opacity: 0.8,
        alignSelf: 'flex-start',
    },
    heroWrap: {
        marginBottom: 14,
    },
    hero: {
        minHeight: 260,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#32457E',
        overflow: 'hidden',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    star: {
        position: 'absolute',
        width: 3,
        height: 3,
        borderRadius: 20,
        backgroundColor: '#FFF8B6',
    },
    heroBadge: {
        alignSelf: 'flex-end',
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: 'rgba(78, 209, 177, 0.18)',
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#53CDAE',
    },
    heroBadgeText: {
        color: '#A8F5DE',
        fontSize: 12,
        fontWeight: '700',
    },
    heroTitle: {
        marginTop: 25,
        color: '#F3F7FF',
        fontSize: 24,
        lineHeight: 35,
        fontWeight: '800',
    },
    heroText: {
        marginTop: 14,
        color: '#C7D0ED',
        fontSize: 15,
        lineHeight: 22,
        maxWidth: '95%',
    },
    sectionTitle: {
        color: '#EAF0FF',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 10,
    },
    cardsContainer: {
        gap: 10,
    },
    featureCard: {
        minHeight: 162,
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#2E3E74',
    },
    featureCardDisabled: {
        opacity: 0.78,
    },
    featureCardPressed: {
        transform: [{ scale: 0.99 }],
    },
    featureCardSurface: {
        flex: 1,
        backgroundColor: '#1A2347',
    },
    featureCardSurfaceDisabled: {
        backgroundColor: '#172041',
    },
    cardMediaRight: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: '50%',
    },
    cardMediaFull: {
        left: 0,
        width: '100%',
    },
    cardMediaImage: {
        width: '100%',
        height: '100%',
    },
    cardShade: {
        ...StyleSheet.absoluteFillObject,
    },
    featureCardContent: {
        zIndex: 2,
        paddingHorizontal: 10,
        paddingVertical: 12,
    },
    cardTopRow: {
        justifyContent: 'flex-start',
    },
    cardTitleWrap: {
        width: '100%',
        alignItems: 'flex-start',
    },
    featureTitle: {
        color: '#F4F7FF',
        fontSize: 22,
        fontWeight: '800',
    },
    cardTitleLogo: {
        width: '100%',
        maxWidth: 220,
        height: 50,
        alignSelf: 'flex-start',
    },
    featureSubtitle: {
        marginTop: 1,
        color: '#EB3E44',
        fontSize: 12,
        fontWeight: '500',
    },
    featureDescription: {
        marginTop: 10,
        color: '#D7DEEF',
        fontSize: 14,
        lineHeight: 20,
        maxWidth: '72%',
    },
    featureActionRow: {
        marginTop: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    featureActionPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: 'rgba(235, 241, 255, 0.14)',
        backgroundColor: 'rgba(23, 33, 66, 0.72)',
        paddingHorizontal: 14,
        paddingVertical: 9,
    },
    featureActionPillDisabled: {
        borderColor: 'rgba(170, 182, 210, 0.2)',
        backgroundColor: 'rgba(20, 30, 58, 0.75)',
    },
    featureAction: {
        color: '#EBF1FF',
        fontSize: 15,
        fontWeight: '700',
    },
    featureActionDisabled: {
        color: '#9FAACC',
    },
    termsWrap: {
        gap: 10,
        paddingBottom: 8,
    },
    termsTitle: {
        color: '#F2F6FF',
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 2,
    },
    termsBlock: {
        borderWidth: 1,
        borderColor: '#2E3E74',
        backgroundColor: 'rgba(19, 34, 82, 0.86)',
        borderRadius: 14,
        padding: 12,
        gap: 8,
    },
    termsBlockTitle: {
        color: '#F2F6FF',
        fontSize: 16,
        fontWeight: '700',
    },
    termsText: {
        color: '#BFC9E8',
        fontSize: 14,
        lineHeight: 21,
    },
    licenseSection: {
        marginTop: 4,
        gap: 10,
        paddingBottom: 8,
    },
    licenseTitle: {
        color: '#F2F6FF',
        fontSize: 22,
        fontWeight: '800',
    },
    licenseSubtitle: {
        color: '#8FA2D5',
        fontSize: 13,
        marginBottom: 4,
    },
    licenseCard: {
        borderWidth: 1,
        borderColor: '#2E3E74',
        backgroundColor: 'rgba(20, 31, 71, 0.92)',
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
    },
    licenseCardWrap: {
        borderWidth: 1,
        borderColor: '#2E3E74',
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: 'rgba(20, 31, 71, 0.92)',
    },
    licenseCardTextWrap: {
        flex: 1,
        paddingRight: 8,
    },
    licenseCardTitle: {
        color: '#EEF3FF',
        fontSize: 16,
        fontWeight: '700',
    },
    licenseCardDesc: {
        color: '#A2B2DE',
        fontSize: 13,
        marginTop: 2,
    },
    licenseBtn: {
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    licenseBtnGreen: {
        backgroundColor: '#123A24',
    },
    licenseBtnBlue: {
        backgroundColor: '#142C55',
    },
    licenseBtnPressed: {
        opacity: 0.8,
    },
    licenseBtnText: {
        fontSize: 14,
        fontWeight: '700',
    },
    licenseBtnTextGreen: {
        color: '#49E08C',
    },
    licenseBtnTextBlue: {
        color: '#4CA8FF',
    },
    docViewerWrap: {
        height: 520,
        borderTopWidth: 1,
        borderTopColor: '#2E3E74',
        backgroundColor: '#0F1A42',
    },
    docViewer: {
        flex: 1,
        backgroundColor: '#0F1A42',
    },
    bottomMenu: {
        borderTopWidth: 1,
        borderTopColor: '#243770',
        backgroundColor: '#0E1D4D',
        flexDirection: 'row',
        gap: 10,
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 12,
    },
    menuItem: {
        flex: 1,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#2E3E74',
        alignItems: 'center',
        paddingVertical: 10,
        backgroundColor: '#132658',
    },
    menuItemActive: {
        borderColor: '#D9BE54',
        backgroundColor: '#2A2F57',
    },
    menuItemPressed: {
        opacity: 0.85,
    },
    menuText: {
        color: '#AAB7DC',
        fontSize: 15,
        fontWeight: '600',
    },
    menuTextActive: {
        color: '#F2D35F',
    },
    sportsGateOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(4, 10, 28, 0.76)',
        paddingHorizontal: 18,
        justifyContent: 'center',
    },
    sportsGateCard: {
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#425EA5',
        backgroundColor: '#0D1D4E',
        padding: 12,
    },
    sportsGateCloseBtn: {
        alignSelf: 'flex-end',
        width: 30,
        height: 30,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#203A7B',
        marginBottom: 8,
    },
    sportsGateCloseBtnPressed: {
        opacity: 0.82,
    },
    sportsGateCloseText: {
        color: '#EEF3FF',
        fontSize: 15,
        fontWeight: '800',
    },
    sportsGateImage: {
        width: '100%',
        height: 380,
        borderRadius: 14,
        backgroundColor: '#0A173E',
    },
    sportsGateTermsRow: {
        marginTop: 14,
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
    },
    sportsGateTermsRowPressed: {
        opacity: 0.9,
    },
    sportsGateCheckbox: {
        width: 20,
        height: 20,
        borderWidth: 1,
        borderColor: '#7E93C9',
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#13295E',
    },
    sportsGateCheckboxChecked: {
        borderColor: '#F0D56A',
        backgroundColor: '#324062',
    },
    sportsGateCheckboxMark: {
        color: '#F8DF7A',
        fontSize: 12,
        fontWeight: '800',
        lineHeight: 14,
    },
    sportsGateTermsText: {
        color: '#C6D1EE',
        fontSize: 14,
    },
    sportsGateTermsLink: {
        color: '#8BC3FF',
        fontSize: 14,
        textDecorationLine: 'underline',
        fontWeight: '600',
    },
    sportsGateContinueBtn: {
        marginTop: 14,
        backgroundColor: '#E7C85A',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
    },
    sportsGateContinueBtnDisabled: {
        backgroundColor: '#46537A',
    },
    sportsGateContinueBtnPressed: {
        opacity: 0.88,
    },
    sportsGateContinueText: {
        color: '#1A2550',
        fontSize: 15,
        fontWeight: '800',
    },
    sportsGateContinueTextDisabled: {
        color: '#A6B2D2',
    },
    cinemaGateOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(4, 10, 28, 0.76)',
        paddingHorizontal: 18,
        justifyContent: 'center',
    },
    cinemaGateCard: {
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#425EA5',
        backgroundColor: '#0D1D4E',
        padding: 14,
        gap: 12,
    },
    cinemaGateCloseBtn: {
        alignSelf: 'flex-end',
        width: 30,
        height: 30,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#203A7B',
    },
    cinemaGateCloseBtnPressed: {
        opacity: 0.82,
    },
    cinemaGateCloseText: {
        color: '#EEF3FF',
        fontSize: 15,
        fontWeight: '800',
    },
    cinemaGateTitle: {
        color: '#F1F3F8',
        fontSize: 24,
        lineHeight: 30,
        fontWeight: '800',
        textAlign: 'center',
    },
    cinemaGateSubtitle: {
        color: '#B8C4E4',
        fontSize: 13,
        lineHeight: 19,
        textAlign: 'center',
        marginTop: -4,
    },
    cinemaProfilesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        justifyContent: 'flex-start',
    },
    cinemaProfileItem: {
        width: '30%',
        alignItems: 'center',
        marginRight: '1.67%',
    },
    cinemaProfileItemPressed: {
        opacity: 0.84,
    },
    cinemaProfileItemDisabled: {
        opacity: 0.5,
    },
    cinemaProfileLogoWrap: {
        width: '100%',
        minHeight: 84,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#333948',
        backgroundColor: '#111A31',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8,
        paddingVertical: 10,
    },
    cinemaProfileLogoWrapDisabled: {
        borderColor: 'rgba(51, 57, 72, 0.5)',
        backgroundColor: '#0a0f1f',
    },
    cinemaProfileLogo: {
        width: '100%',
        height: 42,
    },
    cinemaProfileName: {
        marginTop: 8,
        color: '#F1F3F8',
        fontSize: 14,
        fontWeight: '700',
        textAlign: 'center',
    },
    cinemaProfileNameDisabled: {
        color: '#8a93a8',
    },
    cinemaGateContinueBtn: {
        marginTop: 2,
        backgroundColor: '#171922',
        borderWidth: 1,
        borderColor: '#3A3F4F',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
    },
    cinemaGateContinueBtnPressed: {
        opacity: 0.88,
    },
    cinemaGateContinueText: {
        color: '#D0D5E2',
        fontSize: 15,
        fontWeight: '700',
    },
    ganh18GateOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(4, 10, 28, 0.76)',
        paddingHorizontal: 18,
        justifyContent: 'center',
    },
    ganh18GateCard: {
        borderRadius: 18,
        borderWidth: 1.2,
        borderColor: '#2E323E',
        backgroundColor: '#0C0D11',
        padding: 16,
        gap: 14,
    },
    ganh18GateCloseBtn: {
        alignSelf: 'flex-end',
        width: 30,
        height: 30,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1B1E26',
        marginBottom: 4,
    },
    ganh18GateCloseBtnPressed: {
        opacity: 0.82,
    },
    ganh18GateCloseText: {
        color: '#F1F3F8',
        fontSize: 15,
        fontWeight: '800',
    },
    ganh18GateTitle: {
        color: '#F1F3F8',
        fontSize: 34,
        lineHeight: 40,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 2,
    },
    ganh3dProfilesRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 10,
    },
    ganh3dProfileItem: {
        flex: 1,
        alignItems: 'center',
    },
    ganh3dProfileItemPressed: {
        opacity: 0.84,
    },
    ganh3dProfileItemDisabled: {
        opacity: 0.35,
    },
    ganh3dProfileAvatar: {
        width: 96,
        height: 96,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#333948',
        backgroundColor: '#151922',
    },
    ganh3dProfileName: {
        marginTop: 8,
        color: '#A5ACBA',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
    ganh18GateLockedHint: {
        color: '#B6C1DD',
        fontSize: 13,
        lineHeight: 18,
        textAlign: 'center',
        marginTop: -6,
        marginBottom: 2,
    },
    ganh18GateContinueBtn: {
        marginTop: 8,
        backgroundColor: '#171922',
        borderWidth: 1,
        borderColor: '#3A3F4F',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
    },
    ganh18GateContinueBtnPressed: {
        opacity: 0.88,
    },
    ganh18GateContinueText: {
        color: '#D0D5E2',
        fontSize: 15,
        fontWeight: '700',
    },
});