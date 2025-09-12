// Use localStorage for web compatibility
const storage = {
  async getItem(key) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return localStorage.getItem(key);
      }
      return null;
    } catch (e) {
      console.error('Failed to get item from localStorage:', e);
      return null;
    }
  },
  async setItem(key, value) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(key, value);
      }
    } catch (e) {
      console.error('Failed to set item to localStorage:', e);
    }
  },
  async removeItem(key) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(key);
      }
    } catch (e) {
      console.error('Failed to remove item from localStorage:', e);
    }
  },
  async clear() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.clear();
      }
    } catch (e) {
      console.error('Failed to clear localStorage:', e);
    }
  }
};

export class StorageUtils {
  static async getUserData() {
    try {
      const value = await storage.getItem('userData');
      return value ? JSON.parse(value) : null;
    } catch (e) {
      console.error('Failed to get user data:', e);
      return null;
    }
  }

  static async setUserData(obj) {
    try {
      await storage.setItem('userData', JSON.stringify(obj || {}));
    } catch (e) {
      console.error('Failed to set user data:', e);
    }
  }

  static async getSettings() {
    try {
      const value = await storage.getItem('settings');
      return value ? JSON.parse(value) : {
        soundEnabled: true,
        hapticsEnabled: true,
      };
    } catch (e) {
      console.error('Failed to get settings:', e);
      return {
        soundEnabled: true,
        hapticsEnabled: true,
      };
    }
  }

  static async setSettings(settings) {
    try {
      await storage.setItem('settings', JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to set settings:', e);
    }
  }

  static async getProgress() {
    try {
      const value = await storage.getItem('progress');
      return value ? JSON.parse(value) : {
        currentLevel: 1,
        bestLevel: 0,
        changeItems: 0,
      };
    } catch (e) {
      console.error('Failed to get progress:', e);
      return {
        currentLevel: 1,
        bestLevel: 0,
        changeItems: 0,
      };
    }
  }

  static async setProgress(progress) {
    try {
      await storage.setItem('progress', JSON.stringify(progress));
    } catch (e) {
      console.error('Failed to set progress:', e);
    }
  }

  static async getChallenge() {
    try {
      const value = await storage.getItem('challenge');
      return value ? JSON.parse(value) : {
        bestIQ: 0,
        bestIQTitle: 'Newborn Dreamer',
        lastIQ: 0,
      };
    } catch (e) {
      console.error('Failed to get challenge:', e);
      return {
        bestIQ: 0,
        bestIQTitle: 'Newborn Dreamer',
        lastIQ: 0,
      };
    }
  }

  static async setChallenge(challenge) {
    try {
      await storage.setItem('challenge', JSON.stringify(challenge));
    } catch (e) {
      console.error('Failed to set challenge:', e);
    }
  }
  static async clearAll() {
    try {
      await storage.clear();
    } catch (e) {
      console.error('Failed to clear storage:', e);
    }
  }
}