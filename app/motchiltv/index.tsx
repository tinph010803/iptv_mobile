import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { Image } from 'expo-image';
import * as ScreenOrientation from 'expo-screen-orientation';
import { ChevronLeft, RefreshCw, X } from 'lucide-react-native';

const MOTCHILLTV_BOOT_URL = 'https://motchilltv.me/';
const MOTCHILLTV_LOGO = 'https://res.cloudinary.com/df2amyjzw/image/upload/v1775905558/logo_mx7bjo.png';

const MOTCHILLTV_DISCOVERY_SCRIPT = `
(function() {
    const inputValue = document.querySelector('input[readonly]')?.value || '';

    const result = {
        status: "success",
        timestamp: new Date().toISOString(),
        inputValue: inputValue || null,
        recommendedLink: inputValue,
        note: "Ưu tiên dùng inputValue vì nó thường chứa link thật"
    };

    console.log("%c🔥 MOTCHILLTTV - INPUT VALUE", "color:#00ff88; font-size:16px; font-weight:bold");
    console.log(JSON.stringify(result, null, 2));

    try {
        if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'motchilltv-discovery', payload: result }));
        }
    } catch {
        // Ignore bridge issues.
    }

    return result;
})();
true;
`;

const MOTCHILLTV_FULLSCREEN_SCRIPT = `
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

export default function MotchilltvScreen() {
    const router = useRouter();
    const webViewRef = useRef<WebView>(null);
    const discoveryRetryRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [canGoBack, setCanGoBack] = useState(false);
    const [loading, setLoading] = useState(true);
    const [currentUrl, setCurrentUrl] = useState(MOTCHILLTV_BOOT_URL);
    const [resolved, setResolved] = useState(false);

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

        return () => {
            if (discoveryRetryRef.current) {
                clearInterval(discoveryRetryRef.current);
                discoveryRetryRef.current = null;
            }

            if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current);
                loadingTimeoutRef.current = null;
            }

            unlockOrientation().catch(() => {});
        };
    }, []);

    const clearLoadingGuards = () => {
        if (discoveryRetryRef.current) {
            clearInterval(discoveryRetryRef.current);
            discoveryRetryRef.current = null;
        }

        if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
            loadingTimeoutRef.current = null;
        }
    };

    const startDiscoveryGuards = () => {
        clearLoadingGuards();

        loadingTimeoutRef.current = setTimeout(() => {
            setLoading(false);
            clearLoadingGuards();
        }, 12000);

        discoveryRetryRef.current = setInterval(() => {
            if (resolved || currentUrl !== MOTCHILLTV_BOOT_URL) {
                clearLoadingGuards();
                return;
            }

            webViewRef.current?.injectJavaScript(MOTCHILLTV_DISCOVERY_SCRIPT);
        }, 1200);
    };

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

            if (msg?.type !== 'motchilltv-discovery') return;

            const link = String(msg?.payload?.recommendedLink || '').trim();
            const nextUrl = /^https?:\/\//i.test(link) ? link : currentUrl;

            if (!resolved) {
                setResolved(true);
                clearLoadingGuards();
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

        webViewRef.current?.injectJavaScript(MOTCHILLTV_FULLSCREEN_SCRIPT);

        if (!resolved && currentUrl === MOTCHILLTV_BOOT_URL) {
            webViewRef.current?.injectJavaScript(MOTCHILLTV_DISCOVERY_SCRIPT);
            startDiscoveryGuards();
        } else {
            clearLoadingGuards();
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

                <Image source={{ uri: MOTCHILLTV_LOGO }} style={styles.headerLogo} contentFit="contain" />

                <View style={styles.headerActions}>
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
                    onLoadStart={() => {
                        setLoading(true);
                        if (!resolved && currentUrl === MOTCHILLTV_BOOT_URL) {
                            startDiscoveryGuards();
                        }
                    }}
                    onLoadProgress={({ nativeEvent }) => {
                        if (nativeEvent.progress > 0.35) {
                            setLoading(false);
                        }
                    }}
                    onError={() => {
                        setLoading(false);
                        clearLoadingGuards();
                    }}
                    onHttpError={() => {
                        setLoading(false);
                        clearLoadingGuards();
                    }}
                    onNavigationStateChange={(state) => setCanGoBack(state.canGoBack)}
                    onMessage={handleDiscoveryMessage}
                    userAgent={userAgent}
                />

                {loading ? (
                    <View style={styles.loaderOverlay}>
                        <ActivityIndicator size="large" color="#F3D061" />
                        <Text style={styles.loaderText}>Đang tải MotchillTV...</Text>
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