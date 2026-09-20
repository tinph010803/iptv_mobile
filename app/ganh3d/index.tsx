import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import { Image } from 'expo-image';
import { ChevronLeft, RefreshCw, X } from 'lucide-react-native';

const GANH3D_SOURCES: Record<string, string> = {
  hoathinh3d: 'https://bit.ly/hh3d',
  hhpanda: 'https://hhpanda.st',
  yanhh3d: 'https://bit.ly/yanhh3d',
};
const DEFAULT_SOURCE = 'hoathinh3d';
const GANH3D_LOGO = 'https://res.cloudinary.com/df2amyjzw/image/upload/v1775824346/ganh3d-removebg-preview_x3cw8x.png';
const FULLSCREEN_BRIDGE_SCRIPT = `
(() => {
  const HIDE_SELECTORS = [
    '.badge-settings-float-button',
    '.um-notification-b.right[data-show-always="1"]',
    '#bp-better-messages-mini-mobile-open',
  ];

  const hideIntrusiveUI = () => {
    HIDE_SELECTORS.forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => {
        if (!(el instanceof HTMLElement)) return;
        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('visibility', 'hidden', 'important');
        el.style.setProperty('opacity', '0', 'important');
        el.style.setProperty('pointer-events', 'none', 'important');
      });
    });
  };

  hideIntrusiveUI();
  setInterval(hideIntrusiveUI, 700);

  try {
    const obs = new MutationObserver(() => hideIntrusiveUI());
    obs.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'id'],
    });
  } catch {
    // Ignore DOM observe errors on restricted pages.
  }

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

  let lastFullscreen = false;

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

  const syncFullscreenState = () => {
    const isFullscreen = readFullscreenState();
    if (isFullscreen === lastFullscreen) return;
    lastFullscreen = isFullscreen;
    post(isFullscreen ? 'fullscreen-enter' : 'fullscreen-exit');
  };

  setInterval(syncFullscreenState, 300);
  window.addEventListener('resize', syncFullscreenState, true);

  const hasFullscreenIntent = (element) => {
    if (!element || !(element instanceof Element)) return false;

    const label = [
      element.getAttribute('aria-label'),
      element.getAttribute('title'),
      element.getAttribute('data-title'),
      element.textContent,
      element.className,
      element.id,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return label.includes('fullscreen') || label.includes('full screen') || label.includes('phóng to') || label.includes('mở rộng') || label.includes('expand');
  };

  document.addEventListener(
    'click',
    (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const candidate = target?.closest('button, [role="button"], a, div, span, i, svg');
      if (!candidate) return;

      if (hasFullscreenIntent(candidate) || hasFullscreenIntent(target)) {
        // Sync actual state after UI toggles instead of forcing "enter" on every click.
        setTimeout(syncFullscreenState, 100);
        setTimeout(syncFullscreenState, 350);
        setTimeout(syncFullscreenState, 700);
      }
    },
    true
  );

  const patchMethod = (object, name, onCall) => {
    try {
      if (!object || typeof object[name] !== 'function') return;
      const original = object[name];
      object[name] = function() {
        onCall();
        return original.apply(this, arguments);
      };
    } catch {
      // Ignore patch errors from locked browser objects.
    }
  };

  patchMethod(Element.prototype, 'requestFullscreen', () => post('fullscreen-enter'));
  patchMethod(Element.prototype, 'webkitRequestFullscreen', () => post('fullscreen-enter'));
  patchMethod(Element.prototype, 'mozRequestFullScreen', () => post('fullscreen-enter'));
  patchMethod(Element.prototype, 'msRequestFullscreen', () => post('fullscreen-enter'));

  patchMethod(HTMLVideoElement && HTMLVideoElement.prototype, 'webkitEnterFullscreen', () => post('fullscreen-enter'));

  patchMethod(Document.prototype, 'exitFullscreen', () => post('fullscreen-exit'));
  patchMethod(Document.prototype, 'webkitExitFullscreen', () => post('fullscreen-exit'));
  patchMethod(Document.prototype, 'mozCancelFullScreen', () => post('fullscreen-exit'));
  patchMethod(Document.prototype, 'msExitFullscreen', () => post('fullscreen-exit'));
})();
true;
`;

export default function Ganh3dScreen() {
  const router = useRouter();
  const webViewRef = useRef<WebView>(null);
  const params = useLocalSearchParams<{ user?: string }>();
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const sourceKey = typeof params.user === 'string' ? params.user.trim().toLowerCase() : '';
  const webUrl = GANH3D_SOURCES[sourceKey] ?? GANH3D_SOURCES[DEFAULT_SOURCE];

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




  const handleExitToIntro = useCallback(() => {
    router.replace('/intro' as any);
  }, [router]);

  const handleExitToPrevious = useCallback(() => {
    router.back();
  }, [router]);



  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const onHardwareBack = () => {
      if (isExpanded) {
        setIsExpanded(false);
        lockPortrait().catch(() => { });
        return true;
      }

      if (canGoBack) {
        webViewRef.current?.goBack();
        return true;
      }

      handleExitToPrevious();
      return true;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    return () => sub.remove();
  }, [canGoBack, handleExitToPrevious, isExpanded]);

  useEffect(() => {
    return () => {
      lockPortrait().catch(() => { });
    };
  }, []);

  const handleWebMessage = (event: any) => {
    const raw = event?.nativeEvent?.data;
    if (!raw) return;

    try {
      const msg = JSON.parse(raw);
      if (msg?.type === 'fullscreen-enter') {
        setIsExpanded(true);
        lockLandscape().catch(() => { });
      } else if (msg?.type === 'fullscreen-exit') {
        setIsExpanded(false);
        lockPortrait().catch(() => { });
      }
    } catch {
      // Ignore non-JSON messages from page scripts.
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        {!isExpanded ? (
          <View style={styles.header}>
            <Pressable
              onPress={() => webViewRef.current?.goBack()}
              disabled={!canGoBack}
              style={({ pressed }) => [styles.headerBtn, !canGoBack && styles.headerBtnDisabled, pressed && canGoBack && styles.headerBtnPressed]}
            >
              <ChevronLeft size={18} color={canGoBack ? '#E7EEFF' : '#8EA2D8'} />
            </Pressable>

            <Image source={{ uri: GANH3D_LOGO }} style={styles.headerLogo} contentFit="contain" />

            <View style={styles.headerActions}>
              <Pressable
                onPress={() => webViewRef.current?.reload()}
                style={({ pressed }) => [styles.headerBtn, pressed && styles.headerBtnPressed]}
              >
                <RefreshCw size={17} color="#E7EEFF" />
              </Pressable>

              <Pressable
                onPress={handleExitToIntro}
                style={({ pressed }) => [styles.headerBtn, pressed && styles.headerBtnPressed]}
              >
                <X size={17} color="#E7EEFF" />
              </Pressable>
            </View>
          </View>
        ) : null}

        <View style={[styles.webviewWrap, isExpanded && styles.webviewWrapExpanded]}>
          <WebView
            ref={webViewRef}
            key={webUrl}
            source={{ uri: webUrl }}
            injectedJavaScriptBeforeContentLoaded={FULLSCREEN_BRIDGE_SCRIPT}
            injectedJavaScriptBeforeContentLoadedForMainFrameOnly
            startInLoadingState
            originWhitelist={['*']}
            setSupportMultipleWindows={false}
            javaScriptEnabled
            domStorageEnabled
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
            renderLoading={() => (
              <View style={styles.loaderWrap}>
                <ActivityIndicator size="large" color="#E7C85A" />
              </View>
            )}
          />
          {loading ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator size="large" color="#E7C85A" />
            </View>
          ) : null}
        </View>
      </View>
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
    backgroundColor: '#0A1436',
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
    width: 118,
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
  webviewWrapExpanded: {
    backgroundColor: '#000000',
  },
  loaderWrap: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A1436',
  },
});
