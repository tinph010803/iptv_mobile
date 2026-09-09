import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { RotateCw, X } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as NavigationBar from 'expo-navigation-bar';
import { Channel } from '@/types/iptv';
import TvNativePlayer from '@/components/TvNativePlayer';
import { createIptvPlayerHtml } from '@/utils/iptvPlayerHtml';

type Props = { channel: Channel; onClose: () => void };

export default function TvPlayer({ channel, onClose }: Props) {
	const [reload, setReload] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const [nativeFailed, setNativeFailed] = useState(false);
	const [chromeVisible, setChromeVisible] = useState(true);
	const html = createIptvPlayerHtml(channel);

	useEffect(() => {
		if (Platform.OS === 'web') return;
		ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
		if (Platform.OS === 'android') NavigationBar.setVisibilityAsync('hidden').catch(() => {});
		return () => {
			ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
			if (Platform.OS === 'android') NavigationBar.setVisibilityAsync('visible').catch(() => {});
		};
	}, []);

	useEffect(() => {
		const timer = setTimeout(() => setChromeVisible(false), 3500);
		return () => clearTimeout(timer);
	}, [reload]);

	const useNative = Platform.OS !== 'web' && !channel.drm && !nativeFailed;
	const retry = () => {
		setError(null);
		setNativeFailed(false);
		setReload((value) => value + 1);
	};

	const handleMessage = (event: { nativeEvent: { data: string } }) => {
		try {
			const data = JSON.parse(event.nativeEvent.data);
			if (data.type === 'error') setError(data.msg || 'Không thể phát kênh');
			if (data.type === 'controls_visibility') setChromeVisible(data.msg === 'true');
		} catch {}
	};

	return <View style={styles.container}>
		<StatusBar hidden />
		<View style={styles.video}>
			{error ? <View style={styles.error}>
				<Text style={styles.errorTitle}>Không thể phát kênh</Text>
				<Text style={styles.errorText}>{error}</Text>
				<Pressable style={styles.retry} onPress={retry}><RotateCw size={17} color="#fff" /><Text style={styles.retryText}>Thử lại</Text></Pressable>
			</View> : useNative ? <TvNativePlayer
				key={reload}
				channel={channel}
				onReady={() => setError(null)}
				onError={() => setNativeFailed(true)}
				onVisibilityChange={setChromeVisible}
				onFullscreen={() => {}}
			/> : <WebView
				key={reload}
				style={styles.webview}
				source={{ html, baseUrl: channel.url }}
				allowsInlineMediaPlayback
				mediaPlaybackRequiresUserAction={false}
				allowsFullscreenVideo
				javaScriptEnabled
				domStorageEnabled
				originWhitelist={['*']}
				mixedContentMode="always"
				onMessage={handleMessage}
				onError={() => setError('Không thể tải player')}
			/>}
		</View>
		{chromeVisible && <>
			<View style={styles.topBar}>
				<Pressable style={styles.iconButton} onPress={onClose}><X size={22} color="#fff" /></Pressable>
				<Text style={styles.title} numberOfLines={1}>{channel.name}</Text>
				<View style={styles.headerSpacer} />
			</View>
			<View style={styles.badge}><Text style={styles.badgeText}>{channel.drm ? 'DRM' : 'LIVE'}</Text></View>
		</>}
	</View>;
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#000' },
	video: { flex: 1 },
	webview: { flex: 1, backgroundColor: '#000' },
	topBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 58, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,.2)', zIndex: 5 },
	iconButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
	title: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '800', textAlign: 'left', marginLeft: 4 },
	headerSpacer: { width: 42 },
	badge: { position: 'absolute', top: 18, right: 18, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5, backgroundColor: 'rgba(255,255,255,.16)' },
	badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
	error: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12, backgroundColor: '#050505' },
	errorTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
	errorText: { color: '#d6d6dc', textAlign: 'center' },
	retry: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, paddingHorizontal: 17, paddingVertical: 10, borderRadius: 8, backgroundColor: '#0284c7' },
	retryText: { color: '#fff', fontWeight: '700' },
});
