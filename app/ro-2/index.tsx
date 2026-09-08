import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { Image } from 'expo-image';
import { ChevronLeft, RefreshCw, X } from 'lucide-react-native';
import { Pressable, Text } from 'react-native';
import { RO2_DEFAULT_URL, loadRo2Url } from '@/lib/appConfig';

const RO_LOGO = 'https://img.upanhnhanh.com/59d8b08a46a15c8b4e1ca6f766fa8afa';
const OPEN_IN_SAME_WEBVIEW_SCRIPT = `
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

    const readFullscreenState = () => {
        const video = document.querySelector('video');
        return !!(
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement ||
            (video && video.webkitDisplayingFullscreen)
        );
    };

    let lastFullscreen = false;

    const syncFullscreenState = () => {
        const isFullscreen = readFullscreenState();
        if (isFullscreen === lastFullscreen) return;
        lastFullscreen = isFullscreen;
        post(isFullscreen ? 'fullscreen-enter' : 'fullscreen-exit');
    };

    const emitFullscreenState = () => {
        const isFullscreen = !!(
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement
        );
        lastFullscreen = isFullscreen;
        post(isFullscreen ? 'fullscreen-enter' : 'fullscreen-exit');
    };

    document.addEventListener('fullscreenchange', emitFullscreenState, true);
    document.addEventListener('webkitfullscreenchange', emitFullscreenState, true);
    document.addEventListener('mozfullscreenchange', emitFullscreenState, true);
    document.addEventListener('MSFullscreenChange', emitFullscreenState, true);

    document.addEventListener('webkitbeginfullscreen', () => post('fullscreen-enter'), true);
    document.addEventListener('webkitendfullscreen', () => post('fullscreen-exit'), true);

    setInterval(syncFullscreenState, 300);
    window.addEventListener('resize', syncFullscreenState, true);

    setTimeout(syncFullscreenState, 100);
    setTimeout(syncFullscreenState, 500);

    const go = (url) => {
        if (!url || typeof url !== 'string') return;
        try {
            const next = new URL(url, window.location.href);
            if (next.protocol === 'https:' || next.protocol === 'http:') {
                window.location.href = next.toString();
            }
        } catch {
            // Ignore malformed URLs from third-party scripts.
        }
    };

    window.open = function(url) {
        go(String(url || ''));
        return null;
    };

    document.addEventListener(
        'click',
        (event) => {
            const target = event.target instanceof Element ? event.target : null;
            const anchor = target?.closest('a[target="_blank"]');
            if (!anchor) return;

            const href = anchor.getAttribute('href') || '';
            if (!href) return;

            event.preventDefault();
            event.stopPropagation();
            go(href);
        },
        true
    );
})();
true;
`;

export default function Ro2Screen() {
    const router = useRouter();
    const webViewRef = useRef<WebView>(null);
    const [canGoBack, setCanGoBack] = useState(false);
    const [loading, setLoading] = useState(true);
    const [ro2Url, setRo2Url] = useState(RO2_DEFAULT_URL);

    const lockLandscape = async () => {
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const SO = require('expo-screen-orientation');
            await SO.lockAsync(SO.OrientationLock.LANDSCAPE);
        } catch {
            // Ignore if screen orientation module is unavailable.
        }
    };

    const lockPortrait = async () => {
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const SO = require('expo-screen-orientation');
            await SO.lockAsync(SO.OrientationLock.PORTRAIT_UP);
        } catch {
            // Ignore if screen orientation module is unavailable.
        }
    };

    useEffect(() => {
        if (Platform.OS !== 'android') return;

        const onHardwareBack = () => {
            if (canGoBack) {
                webViewRef.current?.goBack();
                return true;
            }

            router.back();
            return true;
        };

        const sub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
        return () => sub.remove();
    }, [canGoBack, router]);

    useEffect(() => {
        if (!loading) return;

        const t = setTimeout(() => setLoading(false), 8000);
        return () => clearTimeout(t);
    }, [loading]);

    useEffect(() => {
        return () => {
            lockPortrait().catch(() => {});
        };
    }, []);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            const url = await loadRo2Url(RO2_DEFAULT_URL);
            if (!cancelled) {
                setRo2Url(url);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    const handleWebMessage = (event: any) => {
        const raw = event?.nativeEvent?.data;
        if (!raw) return;

        try {
            const msg = JSON.parse(raw);
            if (msg?.type === 'fullscreen-enter') {
                lockLandscape().catch(() => {});
            } else if (msg?.type === 'fullscreen-exit') {
                lockPortrait().catch(() => {});
            }
        } catch {
            // Ignore non-JSON messages from page scripts.
        }
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <Pressable
                    onPress={() => webViewRef.current?.goBack()}
                    disabled={!canGoBack}
                    style={({ pressed }) => [styles.headerBtn, !canGoBack && styles.headerBtnDisabled, pressed && canGoBack && styles.headerBtnPressed]}
                >
                    <ChevronLeft size={18} color={canGoBack ? '#E7EEFF' : '#8EA2D8'} />
                </Pressable>

                <Image source={{ uri: RO_LOGO }} style={styles.headerLogo} contentFit="contain" />

                <View style={styles.headerActions}>
                    <Pressable
                        onPress={() => webViewRef.current?.reload()}
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
                    source={{ uri: ro2Url }}
                    style={styles.webview}
                    originWhitelist={['*']}
                    setSupportMultipleWindows={false}
                    injectedJavaScriptBeforeContentLoaded={OPEN_IN_SAME_WEBVIEW_SCRIPT}
                    injectedJavaScript={OPEN_IN_SAME_WEBVIEW_SCRIPT}
                    javaScriptEnabled
                    domStorageEnabled
                    startInLoadingState={false}
                    allowsFullscreenVideo
                    allowsInlineMediaPlayback
                    mediaPlaybackRequiresUserAction={false}
                    mixedContentMode="always"
                    thirdPartyCookiesEnabled
                    onLoadStart={() => setLoading(true)}
                    onLoadEnd={() => setLoading(false)}
                    onLoadProgress={({ nativeEvent }) => {
                        if (nativeEvent.progress > 0.3) {
                            setLoading(false);
                        }
                    }}
                    onNavigationStateChange={(state) => setCanGoBack(state.canGoBack)}
                    onMessage={handleWebMessage}
                    userAgent={
                        Platform.OS === 'android'
                            ? 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36'
                            : 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
                    }
                />

                {loading ? (
                    <View style={styles.loaderOverlay}>
                        <ActivityIndicator size="large" color="#F3D061" />
                        <Text style={styles.loaderText}>Đang tải...</Text>
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
        backgroundColor: '#000',
    },
    webview: {
        flex: 1,
        backgroundColor: '#000',
    },
    loaderOverlay: {
        ...StyleSheet.absoluteFill,
        backgroundColor: '#091532',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    loaderText: {
        color: '#AFC0EE',
        fontSize: 13,
        fontWeight: '600',
    },
});
