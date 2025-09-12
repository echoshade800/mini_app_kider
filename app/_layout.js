/**
 * Root Layout - App initialization and navigation setup
 * Purpose: Bootstrap the app, initialize storage, and set up navigation structure
 * Extend: Add global providers, error boundaries, or app-wide configurations
 */

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useGameStore } from './store/gameStore';

export default function RootLayout() {
  const { initializeApp } = useGameStore();

  useEffect(() => {
    // 确保应用启动时初始化
    const initialize = async () => {
      try {
        await initializeApp();
      } catch (error) {
        console.error('App initialization failed:', error);
      }
    };
    
    initialize();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="details/[id]" />
        <Stack.Screen name="about" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </GestureHandlerRootView>
  );
}