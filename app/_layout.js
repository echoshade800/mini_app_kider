/**
 * Root Layout - App initialization and navigation setup
 * Purpose: Bootstrap the app, initialize storage, and set up navigation structure
 * Extend: Add global providers, error boundaries, or app-wide configurations
 */

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, Text } from 'react-native';
import { useGameStore } from './lib/gameStore';

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { initializeApp, isLoading, error } = useGameStore();

  useEffect(() => {
    initializeApp();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      // Hide splash screen when app is ready
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f8ff' }}>
        <Text style={{ fontSize: 18, color: '#666' }}>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f8ff', padding: 20 }}>
        <Text style={{ fontSize: 18, color: '#f44336', textAlign: 'center', marginBottom: 20 }}>
          {`Failed to start: ${error}`}
        </Text>
        <Text style={{ fontSize: 14, color: '#666', textAlign: 'center' }}>
          Please restart the app
        </Text>
      </View>
    );
  }

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