import { useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { Image } from 'expo-image';
import * as ScreenOrientation from 'expo-screen-orientation';
import { ChevronLeft, CircleUserRound, RefreshCw, X } from 'lucide-react-native';
import { loadOnflixUrl, ONFLIX_DEFAULT_URL } from '@/lib/appConfig';

const ONFLIX_LOGO = 'https://res.cloudinary.com/df2amyjzw/image/upload/v1775905493/logoonflix_bg8k3v.png';
const ONFLIX_GUIDE_SUPPRESS_KEY = '@onflix_guide_suppress_v1';
const ONFLIX_GUIDE_STEPS = [
    {
        title: 'Đây là icon tài khoản login',
        description: 'Bấm vào icon người để mở thông tin tài khoản hỗ trợ đăng nhập.',
        pointerRight: 104,
    },
    {
        title: 'Đây là nút F5',
        description: 'Nếu web bị chậm hoặc đứng, bấm F5 để tải lại nhanh trang hiện tại.',
        pointerRight: 60,
    },
    {
        title: 'Đây là nút thoát',
        description: 'Bấm dấu X để thoát Onflix và quay về màn hình chọn nguồn phim.',
        pointerRight: 16,
    },
] as const;

const ONFLIX_DISCOVERY_SCRIPT = `
(function() {
    const input = document.querySelector('input#domain, input[type="url"], input[aria-label*="Nhập"], input[placeholder*="onflix"]');
    const inputValue = input ? input.value.trim() : '';
    const pageLink = (window.location && window.location.origin ? window.location.origin + '/' : window.location.href) || '${ONFLIX_DEFAULT_URL}';

    const result = {
        status: "success",
        timestamp: new Date().toISOString(),
        inputValue: inputValue || null,
        recommendedLink: inputValue || pageLink,
        note: "Ưu tiên dùng inputValue vì nó thường chứa link thật"
    };

    console.log("%c🔥 ONFLIX - INPUT VALUE", "color:#00ff88; font-size:16px; font-weight:bold");
    console.log(JSON.stringify(result, null, 2));

    try {
        if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'onflix-discovery', payload: result }));
        }
    } catch {
        // Ignore bridge issues.
    }

    return result;
})();
true;
`;

const ONFLIX_FULLSCREEN_SCRIPT = `
(() => {
    const post = (type) => {
        try {
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type }));
            }
        } catch {
            // Ignore WebView bridge errors.
        }
    };

    const emitFullscreenState = () => {
        const isFullscreen = !!(
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement
        );
        post(isFullscreen ? 'fullscreen-enter' : 'fullscreen-exit');
    };

    document.addEventListener('fullscreenchange', emitFullscreenState, true);
    document.addEventListener('webkitfullscreenchange', emitFullscreenState, true);
    document.addEventListener('mozfullscreenchange', emitFullscreenState, true);
    document.addEventListener('MSFullscreenChange', emitFullscreenState, true);

    document.addEventListener('webkitbeginfullscreen', () => post('fullscreen-enter'), true);
    document.addEventListener('webkitendfullscreen', () => post('fullscreen-exit'), true);
})();
true;
`;

export default function OnflixScreen() {
    const router = useRouter();
    const webViewRef = useRef<WebView>(null);
    const [canGoBack, setCanGoBack] = useState(false);
    const [loading, setLoading] = useState(true);
    const [currentUrl, setCurrentUrl] = useState(ONFLIX_DEFAULT_URL);
    const [resolved, setResolved] = useState(false);
    const [showAccountInfo, setShowAccountInfo] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [guideStep, setGuideStep] = useState(0);
    const [guideShown, setGuideShown] = useState(false);
    const [suppressGuide, setSuppressGuide] = useState(false);
    const [guidePreferenceLoaded, setGuidePreferenceLoaded] = useState(false);

    const userAgent = useMemo(
        () =>
            Platform.OS === 'android'
                ? 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36'
                : 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        []
    );

    const lockPortrait = async () => {
        try {
            await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        } catch {
            // Ignore if orientation APIs are unavailable.
        }
    };

    const unlockOrientation = async () => {
        try {
            await ScreenOrientation.unlockAsync();
        } catch {
            // Ignore if orientation APIs are unavailable.
        }
    };

    const lockLandscape = async () => {
        try {
            await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        } catch {
            // Ignore if orientation APIs are unavailable.
        }
    };

    useEffect(() => {
        lockPortrait().catch(() => {});

        let cancelled = false;

        (async () => {
            const url = await loadOnflixUrl(ONFLIX_DEFAULT_URL);
            if (!cancelled) {
                setCurrentUrl(url);
            }
        })();

        AsyncStorage.getItem(ONFLIX_GUIDE_SUPPRESS_KEY)
            .then((value) => setSuppressGuide(value === '1'))
            .catch(() => {})
            .finally(() => setGuidePreferenceLoaded(true));

        return () => {
            cancelled = true;
            unlockOrientation().catch(() => {});
        };
    }, []);

    useEffect(() => {
        if (!guidePreferenceLoaded || suppressGuide || guideShown || showGuide) return;
        if (!resolved || currentUrl === ONFLIX_DEFAULT_URL || loading) return;

        setGuideShown(true);
        setGuideStep(0);
        setTimeout(() => setShowGuide(true), 280);
    }, [guidePreferenceLoaded, suppressGuide, guideShown, showGuide, resolved, currentUrl, loading]);

    const handleDiscoveryMessage = (event: WebViewMessageEvent) => {
        const raw = event.nativeEvent.data;
        if (!raw) return;

        try {
            const msg = JSON.parse(raw);
            if (msg?.type === 'fullscreen-enter') {
                lockLandscape().catch(() => {});
                return;
            }

            if (msg?.type === 'fullscreen-exit') {
                lockPortrait().catch(() => {});
                return;
            }

            if (msg?.type !== 'onflix-discovery') return;

            const link = String(msg?.payload?.recommendedLink || '').trim();
            const nextUrl = /^https?:\/\//i.test(link) ? link : currentUrl;

            if (!resolved) {
                setResolved(true);
                if (nextUrl !== currentUrl) {
                    setLoading(true);
                    setCurrentUrl(nextUrl);
                }
            }
        } catch {
            // Ignore non-JSON messages from third-party scripts.
        }
    };

    const handleLoadEnd = () => {
        setLoading(false);

        webViewRef.current?.injectJavaScript(ONFLIX_FULLSCREEN_SCRIPT);

        if (!resolved && currentUrl === ONFLIX_DEFAULT_URL) {
            webViewRef.current?.injectJavaScript(ONFLIX_DISCOVERY_SCRIPT);
        }

    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
            <View style={styles.header}>
                <Pressable
                    onPress={() => webViewRef.current?.goBack()}
                    disabled={!canGoBack}
                    style={({ pressed }) => [styles.headerBtn, !canGoBack && styles.headerBtnDisabled, pressed && canGoBack && styles.headerBtnPressed]}
                >
                    <ChevronLeft size={18} color={canGoBack ? '#E7EEFF' : '#8EA2D8'} />
                </Pressable>

                <Image source={{ uri: ONFLIX_LOGO }} style={styles.headerLogo} contentFit="contain" />

                <View style={styles.headerActions}>
                    <Pressable
                        onPress={() => setShowAccountInfo((prev) => !prev)}
                        style={({ pressed }) => [styles.headerBtn, styles.accountBtn, pressed && styles.headerBtnPressed]}
                    >
                        <CircleUserRound size={17} color="#E7EEFF" />
                        <View style={styles.accountBadgeDot} />
                    </Pressable>

                    <Pressable
                        onPress={() => {
                            setLoading(true);
                            webViewRef.current?.reload();
                        }}
                        style={({ pressed }) => [styles.headerBtn, pressed && styles.headerBtnPressed]}
                    >
                        <RefreshCw size={17} color="#E7EEFF" />
                    </Pressable>

                    <Pressable
                        onPress={() => router.replace('/intro' as any)}
                        style={({ pressed }) => [styles.headerBtn, pressed && styles.headerBtnPressed]}
                    >
                        <X size={17} color="#E7EEFF" />
                    </Pressable>
                </View>
            </View>

            {showAccountInfo ? (
                <>
                    <Pressable style={styles.accountBackdrop} onPress={() => setShowAccountInfo(false)} />
                    <View style={styles.accountInfoCard}>
                        <Text style={styles.accountInfoTitle}>Tài khoản hỗ trợ login</Text>
                        <Text style={styles.accountInfoText}>Tài khoản: nhoxcuthuoi</Text>
                        <Text style={styles.accountInfoText}>Mật khẩu: 425453600</Text>
                    </View>
                </>
            ) : null}

            {showGuide ? (
                <View style={styles.guideOverlay}>
                    <View style={styles.guideCard}>
                        <View style={[styles.guidePointer, { right: ONFLIX_GUIDE_STEPS[guideStep].pointerRight }]} />

                        <View style={styles.guideTopRow}>
                            <Text style={styles.guideCounter}>{guideStep + 1} / {ONFLIX_GUIDE_STEPS.length}</Text>
                            <Pressable onPress={() => setShowGuide(false)} style={({ pressed }) => [styles.guideCloseBtn, pressed && styles.headerBtnPressed]}>
                                <X size={16} color="#D8ECFF" />
                            </Pressable>
                        </View>

                        <Text style={styles.guideTitle}>{ONFLIX_GUIDE_STEPS[guideStep].title}</Text>
                        <Text style={styles.guideDesc}>{ONFLIX_GUIDE_STEPS[guideStep].description}</Text>

                        <View style={styles.guideDotsRow}>
                            {ONFLIX_GUIDE_STEPS.map((_, i) => (
                                <View key={String(i)} style={[styles.guideDot, i === guideStep && styles.guideDotActive]} />
                            ))}
                        </View>

                        {guideStep === ONFLIX_GUIDE_STEPS.length - 1 ? (
                            <Pressable
                                onPress={() => {
                                    const next = !suppressGuide;
                                    setSuppressGuide(next);
                                    if (next) {
                                        AsyncStorage.setItem(ONFLIX_GUIDE_SUPPRESS_KEY, '1').catch(() => {});
                                    } else {
                                        AsyncStorage.removeItem(ONFLIX_GUIDE_SUPPRESS_KEY).catch(() => {});
                                    }
                                }}
                                style={({ pressed }) => [styles.guideCheckRow, pressed && styles.headerBtnPressed]}
                            >
                                <View style={[styles.guideCheckbox, suppressGuide && styles.guideCheckboxChecked]}>
                                    {suppressGuide ? <Text style={styles.guideCheckboxMark}>✓</Text> : null}
                                </View>
                                <Text style={styles.guideCheckText}>Không nhắc lại</Text>
                            </Pressable>
                        ) : null}

                        <View style={styles.guideActions}>
                            <Pressable
                                onPress={() => setGuideStep((prev) => Math.max(0, prev - 1))}
                                disabled={guideStep === 0}
                                style={({ pressed }) => [styles.guideGhostBtn, guideStep === 0 && styles.guideGhostBtnDisabled, pressed && guideStep !== 0 && styles.headerBtnPressed]}
                            >
                                <Text style={[styles.guideGhostText, guideStep === 0 && styles.guideGhostTextDisabled]}>Quay lại</Text>
                            </Pressable>

                            <Pressable
                                onPress={() => {
                                    if (guideStep >= ONFLIX_GUIDE_STEPS.length - 1) {
                                        setShowGuide(false);
                                        return;
                                    }
                                    setGuideStep((prev) => prev + 1);
                                }}
                                style={({ pressed }) => [styles.guidePrimaryBtn, pressed && styles.headerBtnPressed]}
                            >
                                <Text style={styles.guidePrimaryText}>{guideStep >= ONFLIX_GUIDE_STEPS.length - 1 ? 'Xong' : 'Tiếp theo'}</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            ) : null}

            <View style={styles.webviewWrap}>
                <WebView
                    ref={webViewRef}
                    source={{ uri: currentUrl }}
                    style={styles.webview}
                    originWhitelist={['*']}
                    setSupportMultipleWindows={false}
                    javaScriptEnabled
                    domStorageEnabled
                    startInLoadingState={false}
                    allowsFullscreenVideo
                    allowsInlineMediaPlayback
                    mediaPlaybackRequiresUserAction={false}
                    mixedContentMode="always"
                    thirdPartyCookiesEnabled
                    onLoadEnd={handleLoadEnd}
                    onLoadProgress={({ nativeEvent }) => {
                        if (nativeEvent.progress > 0.35) {
                            setLoading(false);
                        }
                    }}
                    onNavigationStateChange={(state) => setCanGoBack(state.canGoBack)}
                    onMessage={handleDiscoveryMessage}
                    userAgent={userAgent}
                />

                {loading ? (
                    <View style={styles.loaderOverlay}>
                        <ActivityIndicator size="large" color="#F3D061" />
                        <Text style={styles.loaderText}>Đang tải Onflix...</Text>
                    </View>
                ) : null}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#091532',
    },
    header: {
        height: 52,
        backgroundColor: '#0F1F4D',
        borderBottomWidth: 1,
        borderBottomColor: '#243A7A',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
    },
    headerLogo: {
        width: 140,
        height: 34,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    accountBtn: {
        position: 'relative',
    },
    accountBadgeDot: {
        position: 'absolute',
        top: 7,
        right: 7,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FF4D5E',
        borderWidth: 1,
        borderColor: '#0F1F4D',
    },
    accountBackdrop: {
        ...StyleSheet.absoluteFill,
        zIndex: 20,
        backgroundColor: 'transparent',
    },
    accountInfoCard: {
        position: 'absolute',
        top: 58,
        right: 12,
        zIndex: 21,
        backgroundColor: '#12285D',
        borderWidth: 1,
        borderColor: '#2A4C99',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        minWidth: 220,
        gap: 4,
    },
    accountInfoTitle: {
        color: '#F3D061',
        fontSize: 13,
        fontWeight: '700',
    },
    accountInfoText: {
        color: '#EAF0FF',
        fontSize: 13,
        fontWeight: '600',
    },
    guideOverlay: {
        ...StyleSheet.absoluteFill,
        zIndex: 24,
        backgroundColor: 'rgba(6, 22, 44, 0.2)',
    },
    guideCard: {
        position: 'absolute',
        top: 80,
        right: 10,
        width: 250,
        borderRadius: 14,
        backgroundColor: '#0E2748',
        borderWidth: 1,
        borderColor: '#2F5E94',
        paddingVertical: 10,
        paddingHorizontal: 11,
        gap: 8,
    },
    guidePointer: {
        position: 'absolute',
        top: -6,
        width: 12,
        height: 12,
        backgroundColor: '#0E2748',
        borderTopWidth: 1,
        borderLeftWidth: 1,
        borderColor: '#2F5E94',
        transform: [{ rotate: '45deg' }],
    },
    guideTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    guideCounter: {
        color: '#A8CBEA',
        fontSize: 12,
        fontWeight: '600',
    },
    guideCloseBtn: {
        width: 26,
        height: 26,
        borderRadius: 7,
        alignItems: 'center',
        justifyContent: 'center',
    },
    guideTitle: {
        color: '#E8F5FF',
        fontSize: 17,
        fontWeight: '700',
    },
    guideDesc: {
        color: '#C8DDF0',
        fontSize: 13,
        lineHeight: 19,
        fontWeight: '500',
    },
    guideDotsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    guideDot: {
        width: 8,
        height: 8,
        borderRadius: 999,
        backgroundColor: '#4D6C8A',
    },
    guideDotActive: {
        width: 22,
        borderRadius: 8,
        backgroundColor: '#4AA3FF',
    },
    guideActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 1,
    },
    guideCheckRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 2,
    },
    guideCheckbox: {
        width: 18,
        height: 18,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#5D8AB5',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    guideCheckboxChecked: {
        backgroundColor: '#4AA3FF',
        borderColor: '#4AA3FF',
    },
    guideCheckboxMark: {
        color: '#F4FAFF',
        fontSize: 12,
        fontWeight: '800',
        lineHeight: 12,
    },
    guideCheckText: {
        color: '#D6EAFB',
        fontSize: 12,
        fontWeight: '600',
    },
    guideGhostBtn: {
        height: 34,
        borderRadius: 10,
        paddingHorizontal: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    guideGhostBtnDisabled: {
        opacity: 0.45,
    },
    guideGhostText: {
        color: '#D6EAFB',
        fontSize: 13,
        fontWeight: '700',
    },
    guideGhostTextDisabled: {
        color: '#7E9AB4',
    },
    guidePrimaryBtn: {
        minWidth: 106,
        height: 34,
        borderRadius: 10,
        backgroundColor: '#2E88E6',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
    },
    guidePrimaryText: {
        color: '#F4FAFF',
        fontSize: 13,
        fontWeight: '700',
    },
    headerBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#152A62',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerBtnDisabled: {
        backgroundColor: '#132350',
    },
    headerBtnPressed: {
        opacity: 0.8,
    },
    webviewWrap: {
        flex: 1,
        position: 'relative',
    },
    webview: {
        flex: 1,
        backgroundColor: '#091532',
    },
    loaderOverlay: {
        ...StyleSheet.absoluteFill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(8, 16, 40, 0.45)',
        gap: 10,
    },
    loaderText: {
        color: '#EAF0FF',
        fontSize: 14,
        fontWeight: '600',
    },
});
