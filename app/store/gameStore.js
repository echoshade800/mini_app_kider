import { create } from 'zustand';
import { StorageUtils } from '../utils/StorageUtils';
import { apiClient } from '../services/api';

export const useGameStore = create((set, get) => ({
  // User state
  user: null,
  progress: { currentLevel: 1, bestLevel: 0, changeItems: 0 },
  challenge: { bestIQ: 0, bestIQTitle: '', lastIQ: 0 },
  settings: { soundEnabled: true, hapticsEnabled: true },

  // Game state
  currentBoard: null,
  isLoading: false,
  error: null,

  // Actions
  initializeUser: async () => {
    set({ isLoading: true });
    try {
      let userData = await StorageUtils.getUserData();
      const settings = await StorageUtils.getSettings();
      
      if (!userData) {
        // Create new user
        userData = {
          uid: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          email: null,
          nickname: null,
          meta: {},
        };
        await StorageUtils.setUserData(userData);
      }

      // Sync with backend
      try {
        const syncResult = await apiClient.syncUser(userData);
        if (syncResult.user) {
          userData = { ...userData, ...syncResult.user };
          await StorageUtils.setUserData(userData);
        }
      } catch (error) {
        console.warn('Failed to sync user with backend:', error);
      }

      set({ user: userData, settings, isLoading: false });
      get().loadUserProgress();
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  loadUserProgress: async () => {
    const { user } = get();
    if (!user) return;

    try {
      // Progress is loaded via user sync, but we can fetch fresh data here
      set({ isLoading: false });
    } catch (error) {
      console.warn('Failed to load user progress:', error);
    }
  },

  loadBoard: async (level) => {
    set({ isLoading: true });
    try {
      const board = await apiClient.getLevelBoard(level);
      set({ currentBoard: board, isLoading: false });
      return board;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  loadChallengeBoard: async () => {
    set({ isLoading: true });
    try {
      const board = await apiClient.getChallengeBoard();
      set({ currentBoard: board, isLoading: false });
      return board;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  completeLevel: async (level, usedChange = false) => {
    const { user } = get();
    if (!user) return;

    try {
      const result = await apiClient.settleProgress(
        user.uid, 
        level, 
        1 // +1 change item for completing level
      );
      
      if (result.progress) {
        set({ progress: result.progress });
      }
      
      return result;
    } catch (error) {
      console.warn('Failed to complete level:', error);
      throw error;
    }
  },

  completeChallenge: async (iq) => {
    const { user } = get();
    if (!user) return;

    try {
      const result = await apiClient.settleChallenge(user.uid, iq);
      
      if (result.challenge) {
        set({ challenge: result.challenge });
      }
      
      return result;
    } catch (error) {
      console.warn('Failed to complete challenge:', error);
      throw error;
    }
  },

  useChangeItem: async () => {
    const { user } = get();
    if (!user) return false;

    try {
      const result = await apiClient.useItem(user.uid, 'change');
      
      if (result.changeItems !== undefined) {
        set((state) => ({
          progress: { ...state.progress, changeItems: result.changeItems }
        }));
        return true;
      }
      
      return false;
    } catch (error) {
      console.warn('Failed to use change item:', error);
      return false;
    }
  },

  updateSettings: async (newSettings) => {
    try {
      await StorageUtils.setSettings(newSettings);
      set({ settings: newSettings });
    } catch (error) {
      console.warn('Failed to update settings:', error);
    }
  },

  resetData: async () => {
    try {
      await StorageUtils.clearAll();
      set({
        user: null,
        progress: { currentLevel: 1, bestLevel: 0, changeItems: 0 },
        challenge: { bestIQ: 0, bestIQTitle: '', lastIQ: 0 },
        settings: { soundEnabled: true, hapticsEnabled: true },
        currentBoard: null,
        error: null,
      });
    } catch (error) {
      console.warn('Failed to reset data:', error);
    }
  },

  clearError: () => set({ error: null }),
}));