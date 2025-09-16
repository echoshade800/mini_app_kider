import { useEffect } from 'react';
import { useGameStore } from '../app/store/gameStore';

export function useFrameworkReady() {
  const { initializeApp, isLoading } = useGameStore();

  useEffect(() => {
    // Initialize the app when the framework is ready
    initializeApp();
  }, [initializeApp]);

  return { isLoading };
}