/**
 * Game Store - Global state management using Zustand
 * Purpose: Manage user data, game progress, settings, and app state
 * Features: Local storage persistence, progress tracking, settings management
 */

import { create } from 'zustand';
import StorageUtils from '../utils/StorageUtils';

export const useGameStore = create((set, get) => ({
  // State
  userData: null,
  gameData: null,
  settings: null,
  isLoading: false,
  error: null,

  // Actions
  initializeApp: async () => {
    set({ isLoading: true });
    try {
      // Load user data
      let userData = await StorageUtils.getUserData();
      if (!userData) {
        // Create default user
        userData = {
          id: Date.now(),
          uid: `user_${Date.now()}`,
          userName: 'Player',
          email: null,
          avatar: null,
          vipLevel: 0,
          passId: null,
          availableAmount: 0,
          country: null,
          city: null,
          createTime: Date.now(),
        };
        await StorageUtils.saveUserData(userData);
      }

      // Load game data
      let gameData = await StorageUtils.getData();
      if (!gameData) {
        // Initialize default game data
        gameData = {
          maxLevel: 1,
          maxScore: 0,
          swapMasterItems: 3, // SwapMaster 道具数量
          fractalSplitItems: 2, // FractalSplit 道具数量
          lastPlayedLevel: 1,
        };
        await StorageUtils.setData(gameData);
      }

      // Load settings
      let settings = await StorageUtils.getSettings();
      if (!settings) {
        settings = {
          soundEnabled: true,
          hapticsEnabled: true,
        };
        await StorageUtils.setSettings(settings);
      }

      set({ 
        userData, 
        gameData, 
        settings, 
        isLoading: false,
        error: null
      });
    } catch (error) {
      console.error('Failed to initialize app:', error);
      set({ 
        error: error.message, 
        isLoading: false 
      });
    }
  },

  updateGameData: async (newData) => {
    try {
      const success = await StorageUtils.setData(newData);
      if (success) {
        const currentData = get().gameData || {};
        const updatedData = { ...currentData, ...newData };
        set({ gameData: updatedData });
      }
    } catch (error) {
      console.error('Failed to update game data:', error);
      set({ error: error.message });
    }
  },

  updateSettings: async (newSettings) => {
    try {
      const success = await StorageUtils.setSettings(newSettings);
      if (success) {
        const currentSettings = get().settings || {};
        const updatedSettings = { ...currentSettings, ...newSettings };
        set({ settings: updatedSettings });
      }
    } catch (error) {
      console.error('Failed to update settings:', error);
      set({ error: error.message });
    }
  },

  resetDemoData: async () => {
    try {
      // Reset game data
      const resetGameData = {
        maxLevel: 0,
        maxScore: 0,
        swapMasterItems: 0,
        fractalSplitItems: 0,
        lastPlayedLevel: 1,
      };
      
      // Reset settings
      const resetSettings = {
        soundEnabled: true,
        hapticsEnabled: true,
      };

      await StorageUtils.setData(resetGameData);
      await StorageUtils.setSettings(resetSettings);
      
      set({ 
        gameData: resetGameData, 
        settings: resetSettings 
      });
    } catch (error) {
      console.error('Failed to reset demo data:', error);
      set({ error: error.message });
    }
  },

  clearError: () => set({ error: null }),
}));