import AsyncStorage from '@react-native-async-storage/async-storage';

export class StorageUtils {
  static async getUserData() {
    try {
      const value = await AsyncStorage.getItem('userData');
      return value ? JSON.parse(value) : null;
    } catch (e) {
      console.error('Failed to get user data:', e);
      return null;
    }
  }

  static async setUserData(obj) {
    try {
      await AsyncStorage.setItem('userData', JSON.stringify(obj || {}));
    } catch (e) {
      console.error('Failed to set user data:', e);
    }
  }

  static async getSettings() {
    try {
      const value = await AsyncStorage.getItem('settings');
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
      await AsyncStorage.setItem('settings', JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to set settings:', e);
    }
  }

  static async clearAll() {
    try {
      await AsyncStorage.clear();
    } catch (e) {
      console.error('Failed to clear storage:', e);
    }
  }
}