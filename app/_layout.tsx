import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { Colors } from '@/constants/colors';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { getHomeMovies } from '@/lib/ophim';
import * as NavigationBar from 'expo-navigation-bar';
import { Platform, StatusBar as RNStatusBar } from 'react-native';

export default function RootLayout() {
  useFrameworkReady();

  useEffect(() => {
    // Warm cache in background
    getHomeMovies().catch(() => {});
    // Set Android navigation bar color
    if (Platform.OS === 'android') {
      RNStatusBar.setTranslucent(true);
      RNStatusBar.setBackgroundColor('transparent');
      NavigationBar.setStyle('inverted');
    }
  }, []);

  return (
    <AuthProvider>
    <ToastProvider>
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: 'none',
        }}
      >
        <Stack.Screen name="index" options={{ animation: 'none' }} />
        <Stack.Screen name="intro" options={{ animation: 'none' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
        <Stack.Screen name="movie/[id]" />
        <Stack.Screen name="movie/player" options={{ animation: 'none' }} />
        <Stack.Screen name="category/[slug]" />
        <Stack.Screen name="favorites" />
        <Stack.Screen name="profile-edit" />
        <Stack.Screen name="watch-history" />
        <Stack.Screen name="admin/featured" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="light" />
    </SafeAreaProvider>
    </ToastProvider>
    </AuthProvider>
  );
}
