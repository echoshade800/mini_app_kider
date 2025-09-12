import { create } from 'zustand';
import { StorageUtils } from '../utils/StorageUtils';
import { generateBoard, generateChallengeBoard } from '../utils/LocalBoardGenerator';
import { getLevelName } from '../utils/LocalLevels';

const IQ_TITLES = {
  0: 'Newborn Dreamer',
  40: 'Tiny Adventurer',
  55: 'Learning Hatchling',
  65: 'Little Explorer',
  70: 'Slow but Steady',
  85: 'Hardworking Student',
  100: 'Everyday Scholar',
  115: 'Rising Star',
  130: 'Puzzle Master',
  145: 'Cosmic Genius',
};

function getIQTitle(iq) {
  const thresholds = Object.keys(IQ_TITLES)
    .map(Number)
    .sort((a, b) => b - a);
  
  for (let threshold of thresholds) {
    if (iq >= threshold) {
      return IQ_TITLES[threshold];
    }
  }
  
  return IQ_TITLES[0];
}

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
      const progress = await StorageUtils.getProgress();
      const challenge = await StorageUtils.getChallenge();
      
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

      set({ 
        user: userData, 
        settings, 
        progress, 
        challenge, 
        isLoading: false 
      });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  loadBoard: async (level) => {
    set({ isLoading: true });
    try {
      const board = generateBoard(level);
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
      const board = generateChallengeBoard();
      set({ currentBoard: board, isLoading: false });
      return board;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  completeLevel: async (level, usedChange = false) => {
    const { progress } = get();

    try {
      const newProgress = {
        currentLevel: level + 1,
        bestLevel: Math.max(progress.bestLevel, level),
        changeItems: progress.changeItems + 1, // +1 change item for completing level
      };
      
      await StorageUtils.setProgress(newProgress);
      set({ progress: newProgress });
      
      return { updated: true, progress: newProgress };
    } catch (error) {
      console.warn('Failed to complete level:', error);
      throw error;
    }
  },

  completeChallenge: async (iq) => {
    const { challenge } = get();

    try {
      const iqTitle = getIQTitle(iq);
      const newBestIQ = Math.max(challenge.bestIQ, iq);
      const newBestTitle = newBestIQ > challenge.bestIQ ? iqTitle : challenge.bestIQTitle;
      
      const newChallenge = {
        bestIQ: newBestIQ,
        bestIQTitle: newBestTitle,
        lastIQ: iq,
      };
      
      await StorageUtils.setChallenge(newChallenge);
      set({ challenge: newChallenge });
      
      return { updated: true, challenge: newChallenge };
    } catch (error) {
      console.warn('Failed to complete challenge:', error);
      throw error;
    }
  },

  useChangeItem: async () => {
    const { progress } = get();
    if (progress.changeItems <= 0) return false;

    try {
      const newProgress = {
        ...progress,
        changeItems: progress.changeItems - 1,
      };
      
      await StorageUtils.setProgress(newProgress);
      set({ progress: newProgress });
      
      return true;
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