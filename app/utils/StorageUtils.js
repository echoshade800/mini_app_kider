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
  static miniAppName = 'KidderCrushMiniApp';

  /** @returns {Promise<UserData|null>} */
  static async getUserData() {
    try {
      const raw = await AsyncStorage.getItem('userData');
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  /** @param {UserData} userData @returns {Promise<boolean>} */
  static async saveUserData(userData) {
    try {
      await AsyncStorage.setItem('userData', JSON.stringify(userData || {}));
      return true;
    } catch (error) {
      return false;
    }
  }

  /** @returns {Promise<GameData|null>} */
  static async getData() {
    try {
      const raw = await AsyncStorage.getItem(`${this.miniAppName}info`);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
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
      return false;
    }
  }

  /** @returns {Promise<Settings|null>} */
  static async getSettings() {
    try {
      const raw = await AsyncStorage.getItem(`${this.miniAppName}settings`);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
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
      return false;
    }
  }

  /** 按日期保存设置 @param {string} date 日期字符串 (YYYYMMDD) @param {Partial<Settings>} settings @returns {Promise<boolean>} */
  static async setSettingsByDate(date, settings) {
    try {
      const key = `${this.miniAppName}settings_${date}`;
      await AsyncStorage.setItem(key, JSON.stringify(settings || {}));
      return true;
    } catch (error) {
      return false;
    }
  }

  /** 按日期加载设置 @param {string} date 日期字符串 (YYYYMMDD) @returns {Promise<Settings|null>} */
  static async getSettingsByDate(date) {
    try {
      const key = `${this.miniAppName}settings_${date}`;
      const raw = await AsyncStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  /** 加载指定日期的设置并应用到当前设置 @param {string} date 日期字符串 (YYYYMMDD) @returns {Promise<boolean>} */
  static async loadSettingsFromDate(date) {
    try {
      const dateSettings = await this.getSettingsByDate(date);
      if (dateSettings) {
        return await this.setSettings(dateSettings);
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  /** 获取所有保存的日期设置 @returns {Promise<string[]>} */
  static async getAllSavedDates() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const dateKeys = keys.filter(key => key.startsWith(`${this.miniAppName}settings_`));
      return dateKeys.map(key => key.replace(`${this.miniAppName}settings_`, '')).sort();
    } catch (error) {
      return [];
    }
  }
}

export default StorageUtils;