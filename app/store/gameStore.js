/**
 * Game Store - Zustand state management for game data
 * Purpose: Manage user data, game progress, and settings with local storage
 */

import { create } from 'zustand';
import StorageUtils from '../utils/StorageUtils';

const useGameStore = create((set, get) => ({
  // State
  userData: null,
  gameData: {
    maxLevel: 1,
    maxScore: 0,
    changeItems: 0,
    lastPlayedLevel: 1,
  },
  settings: {
    soundEnabled: true,
    hapticsEnabled: true,
  },
  isLoading: false,

  // Actions
  initializeStore: async () => {
    try {
      set({ isLoading: true });
      
      // Load user data
      const userData = await StorageUtils.getUserData();
      
      // Load game data
      const gameData = await StorageUtils.getData();
      
      // Load settings
      const settings = await StorageUtils.getSettings();
      
      set({
        userData: userData || {
          id: Date.now(),
          uid: `user_${Date.now()}`,
          userName: 'Player',
          email: null,
          avatar: null,
          vipLevel: 0,
          passId: null,
          availableAmount: 0,
          country: 'US',
          city: 'Unknown',
          createTime: Date.now(),
        },
        gameData: gameData || {
          maxLevel: 1,
          maxScore: 0,
          changeItems: 0,
          lastPlayedLevel: 1,
        },
        settings: settings || {
          soundEnabled: true,
          hapticsEnabled: true,
        },
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to initialize store:', error);
      set({ isLoading: false });
    }
  },

  updateGameData: async (newData) => {
    try {
      const currentData = get().gameData;
      const updatedData = { ...currentData, ...newData };
      
      await StorageUtils.setData(updatedData);
      set({ gameData: updatedData });
    } catch (error) {
      console.error('Failed to update game data:', error);
    }
  },

  updateSettings: async (newSettings) => {
    try {
      const currentSettings = get().settings;
      const updatedSettings = { ...currentSettings, ...newSettings };
      
      await StorageUtils.setSettings(updatedSettings);
      set({ settings: updatedSettings });
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  },

  resetDemoData: async () => {
    try {
      const defaultGameData = {
        maxLevel: 1,
        maxScore: 0,
        changeItems: 0,
        lastPlayedLevel: 1,
      };
      
      const defaultSettings = {
        soundEnabled: true,
        hapticsEnabled: true,
      };
      
      await StorageUtils.setData(defaultGameData);
      await StorageUtils.setSettings(defaultSettings);
      
      set({
        gameData: defaultGameData,
        settings: defaultSettings,
      });
    } catch (error) {
      console.error('Failed to reset demo data:', error);
    }
  },
}));

export { useGameStore };