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
          splitItems: 2, // Split 道具数量
          lastPlayedLevel: 1,
          hasSeenSimpleRules: false, // 是否已看过简约规则介绍
        };
        await StorageUtils.setData(gameData);
      }

      // Load settings
      let settings = await StorageUtils.getSettings();
      if (!settings) {
        // 尝试加载昨天的设置
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD格式
        
        const yesterdaySettings = await StorageUtils.getSettingsByDate(yesterdayStr);
        if (yesterdaySettings) {
          settings = yesterdaySettings;
          await StorageUtils.setSettings(settings);
        } else {
          settings = {
            soundEnabled: true,
            hapticsEnabled: true,
          };
          await StorageUtils.setSettings(settings);
        }
      }

      set({ 
        userData, 
        gameData, 
        settings, 
        isLoading: false,
        error: null
      });
    } catch (error) {
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
      set({ error: error.message });
    }
  },

  markSimpleRulesSeen: async () => {
    try {
      const currentData = get().gameData || {};
      const updatedData = { ...currentData, hasSeenSimpleRules: true };
      await StorageUtils.setData(updatedData);
      set({ gameData: updatedData });
    } catch (error) {
      set({ error: error.message });
    }
  },

  resetDemoData: async () => {
    try {
      // Reset game data
      const resetGameData = {
        maxLevel: 1,
        maxScore: 0,
        swapMasterItems: 3,
        splitItems: 2,
        lastPlayedLevel: 1,
        hasSeenSimpleRules: false, // 重置简约规则状态
        hasSeenOnboarding: false, // 重置新手引导状态
        hasSeenButtonGuide: false, // 重置按钮引导状态
        hasSeenItemGuide: false, // 重置道具引导状态
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
      set({ error: error.message });
    }
  },

  clearError: () => set({ error: null }),

  // 加载指定日期的设置
  loadSettingsFromDate: async (date) => {
    try {
      const success = await StorageUtils.loadSettingsFromDate(date);
      if (success) {
        // 重新加载设置到状态中
        const settings = await StorageUtils.getSettings();
        set({ settings });
        return true;
      }
      return false;
    } catch (error) {
      set({ error: error.message });
      return false;
    }
  },

  // 保存当前设置到指定日期
  saveSettingsToDate: async (date) => {
    try {
      const currentSettings = get().settings;
      if (currentSettings) {
        const success = await StorageUtils.setSettingsByDate(date, currentSettings);
        return success;
      }
      return false;
    } catch (error) {
      set({ error: error.message });
      return false;
    }
  },

  // 获取所有保存的日期
  getAllSavedDates: async () => {
    try {
      return await StorageUtils.getAllSavedDates();
    } catch (error) {
      set({ error: error.message });
      return [];
    }
  },
}));