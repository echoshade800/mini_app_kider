/**
 * Local-only storage helper for this mini app using AsyncStorage
 * Purpose: Manage persistent data storage for user data, game progress, and settings
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * @typedef {Object} UserData
 * @property {number} id
 * @property {string} uid
 * @property {string} userName
 * @property {string} email
 * @property {string} avatar
 * @property {number} vipLevel
 * @property {string} passId
 * @property {number} availableAmount
 * @property {string} country
 * @property {string} city
 * @property {number} createTime
 */

/**
 * @typedef {Object} GameData
 * @property {number} maxLevel
 * @property {number} maxScore
 * @property {number} changeItems
 * @property {number} lastPlayedLevel
 */

/**
 * @typedef {Object} Settings
 * @property {boolean} soundEnabled
 * @property {boolean} hapticsEnabled
 */

class StorageUtils {
  /** namespace key prefix */
  static miniAppName = 'DaycareNumberElimination';

  /** @returns {Promise<UserData|null>} */
  static async getUserData() {
    try {
      const raw = await AsyncStorage.getItem('userData');
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.error('Failed to get user data:', error);
      return null;
    }
  }

  /** @param {UserData} userData @returns {Promise<boolean>} */
  static async saveUserData(userData) {
    try {
      await AsyncStorage.setItem('userData', JSON.stringify(userData || {}));
      return true;
    } catch (error) {
      console.error('Failed to save user data:', error);
      return false;
    }
  }

  /** @returns {Promise<GameData|null>} */
  static async getData() {
    try {
      const raw = await AsyncStorage.getItem(`${this.miniAppName}info`);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.error('Failed to get info blob:', error);
      return null;
    }
  }

  /** @param {Partial<GameData>} newData @returns {Promise<boolean>} */
  static async setData(newData) {
    try {
      const oldData = await this.getData();
      const merged = oldData ? { ...oldData, ...newData } : (newData || {});
      await AsyncStorage.setItem(`${this.miniAppName}info`, JSON.stringify(merged));
      return true;
    } catch (error) {
      console.error('Failed to set info blob:', error);
      return false;
    }
  }

  /** @returns {Promise<Settings|null>} */
  static async getSettings() {
    try {
      const raw = await AsyncStorage.getItem(`${this.miniAppName}settings`);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.error('Failed to get settings:', error);
      return null;
    }
  }

  /** @param {Partial<Settings>} settings @returns {Promise<boolean>} */
  static async setSettings(settings) {
    try {
      const oldSettings = await this.getSettings();
      const merged = oldSettings ? { ...oldSettings, ...settings } : (settings || {});
      await AsyncStorage.setItem(`${this.miniAppName}settings`, JSON.stringify(merged));
      return true;
    } catch (error) {
      console.error('Failed to set settings:', error);
      return false;
    }
  }
}

export default StorageUtils;