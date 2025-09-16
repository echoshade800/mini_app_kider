/**
 * Root Layout - Main app navigation structure
 * Purpose: Set up navigation stack and initialize app-wide providers
 */

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useGameStore } from './store/gameStore';

export default function RootLayout() {
  const { initializeStore } = useGameStore();

  useEffect(() => {
    // Initialize store on app start
    initializeStore();
  }, []);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="details/[id]" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="about" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}