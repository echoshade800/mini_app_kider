/**
 * Profile & Settings Screen - User preferences and app settings
 * Purpose: Manage user profile, app settings, and data
 * Extend: Add themes, export/import, achievements, or social features
 */

import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  ScrollView,
  Alert,
  ImageBackground,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGameStore } from '../store/gameStore';

export default function ProfileScreen() {
  const { 
    userData, 
    gameData, 
    settings, 
    updateSettings, 
    resetDemoData,
    loadSettingsFromDate,
    saveSettingsToDate
  } = useGameStore();


  const handleResetData = () => {
    Alert.alert(
      'Reset Demo Data',
      'This will permanently delete all your progress, scores, and settings. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: () => {
            resetDemoData();
            Alert.alert('Success', 'Demo data has been reset.');
          }
        }
      ]
    );
  };

  const handleAboutPress = () => {
    router.push('/about');
  };

  const handleLoadYesterdaySettings = async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD格式
    
    Alert.alert(
      'Load Yesterday Settings',
      `Do you want to load settings saved on ${yesterdayStr}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Load', 
          onPress: async () => {
            const success = await loadSettingsFromDate(yesterdayStr);
            if (success) {
              Alert.alert('Success', 'Yesterday\'s settings have been loaded!');
            } else {
              Alert.alert('Notice', 'No settings found for yesterday, using default settings.');
            }
          }
        }
      ]
    );
  };

  const handleSaveTodaySettings = async () => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD格式
    
    Alert.alert(
      'Save Today Settings',
      `Do you want to save current settings to ${todayStr}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Save', 
          onPress: async () => {
            const success = await saveSettingsToDate(todayStr);
            if (success) {
              Alert.alert('Success', 'Today\'s settings have been saved!');
            } else {
              Alert.alert('Error', 'Failed to save settings, please try again.');
            }
          }
        }
      ]
    );
  };

  const getIQTitle = (iq) => {
    if (iq >= 145) return 'Cosmic Genius';
    if (iq >= 130) return 'Puzzle Master';
    if (iq >= 115) return 'Rising Star';
    if (iq >= 100) return 'Everyday Scholar';
    if (iq >= 85) return 'Hardworking Student';
    if (iq >= 70) return 'Slow but Steady';
    if (iq >= 65) return 'Little Explorer';
    if (iq >= 55) return 'Learning Hatchling';
    if (iq >= 40) return 'Tiny Adventurer';
    return 'Newborn Dreamer';
  };

  // 自定义Toggle组件，匹配参考图风格
  const renderToggle = (value, onPress) => (
    <TouchableOpacity
      style={[styles.customToggle, value && styles.customToggleActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.customToggleThumb, value && styles.customToggleThumbActive]} />
    </TouchableOpacity>
  );


  return (
    <SafeAreaView style={styles.container}>
        {/* Header with Back Button */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#8B4513" />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Ionicons name="settings" size={28} color="#FFD700" style={styles.titleIcon} />
            <Text style={styles.title}>Settings</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        {/* 设置内容区域 - 覆盖在背景图上 */}
        <View style={styles.settingsOverlay}>
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

        {/* User Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Progress</Text>
          
          <View style={styles.statCard}>
            <View style={styles.statRow}>
              <Ionicons name="school" size={24} color="#4CAF50" />
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Best Level</Text>
                <Text style={styles.statValue}>
                  {gameData?.maxLevel > 200 
                    ? `Level 200+${gameData.maxLevel - 200}` 
                    : `Level ${gameData?.maxLevel || 0}`
                  }
                </Text>
              </View>
            </View>
            
            <View style={styles.statRow}>
              <Ionicons name="timer" size={24} color="#FF9800" />
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Best Challenge IQ</Text>
                <Text style={styles.statValue}>{gameData?.maxScore || 0}</Text>
                <Text style={styles.statSubtitle}>
                  {getIQTitle(gameData?.maxScore || 0)}
                </Text>
              </View>
            </View>
            
            <View style={styles.statRow}>
              <Ionicons name="shuffle" size={24} color="#2196F3" />
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>SwapMaster Items</Text>
                <Text style={styles.statValue}>{gameData?.swapMasterItems || 0}</Text>
              </View>
            </View>
            
            <View style={styles.statRow}>
              <Ionicons name="cut" size={24} color="#9C27B0" />
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Split Items</Text>
                <Text style={styles.statValue}>{gameData?.splitItems || 0}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Settings - 匹配参考图风格 */}
        <View style={styles.settingsSection}>
          <View style={styles.settingsCard}>
            {/* Sound Effects */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="volume-high" size={24} color="#8B4513" />
                <Text style={styles.settingLabel}>Sound Effects</Text>
              </View>
              {renderToggle(
                settings?.soundEnabled,
                () => {
                  console.log('🔊 Sound Effects toggle clicked, current state:', settings?.soundEnabled);
                  updateSettings({ soundEnabled: !settings?.soundEnabled });
                }
              )}
            </View>
            
            {/* Music */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="musical-notes" size={24} color="#8B4513" />
                <Text style={styles.settingLabel}>Music</Text>
              </View>
              {renderToggle(
                settings?.musicEnabled || false,
                () => updateSettings({ musicEnabled: !(settings?.musicEnabled || false) })
              )}
            </View>
            
            {/* Haptic Feedback */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="phone-portrait" size={24} color="#8B4513" />
                <Text style={styles.settingLabel}>Haptic Feedback</Text>
              </View>
              {renderToggle(
                settings?.hapticsEnabled,
                () => updateSettings({ hapticsEnabled: !settings?.hapticsEnabled })
              )}
            </View>
            
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleAboutPress}
          >
            <Ionicons name="information-circle" size={20} color="#4a90e2" />
            <Text style={styles.actionButtonText}>About & Help</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleLoadYesterdaySettings}
          >
            <Ionicons name="time" size={20} color="#FF9800" />
            <Text style={styles.actionButtonText}>Load Yesterday Settings</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleSaveTodaySettings}
          >
            <Ionicons name="save" size={20} color="#4CAF50" />
            <Text style={styles.actionButtonText}>Save Today Settings</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.dangerButton]}
            onPress={handleResetData}
          >
            <Ionicons name="refresh" size={20} color="#f44336" />
            <Text style={[styles.actionButtonText, styles.dangerButtonText]}>
              Reset Demo Data
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <View style={styles.appInfo}>
            <Text style={styles.appName}>KiderCrash</Text>
            <Text style={styles.appVersion}>Version 1.0.0</Text>
            <Text style={styles.appDescription}>
              Draw rectangles to make 10—clear the board, climb 200+ named levels, 
              or sprint for IQ in 60 seconds.
            </Text>
          </View>
        </View>
          </ScrollView>
        </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F2E9', // 设置页面背景色
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF', // 纯白色背景
    borderBottomWidth: 2,
    borderBottomColor: '#8B4513', // 使用棕色边框
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleIcon: {
    marginRight: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8B4513', // 使用主页面的棕色
    textAlign: 'center',
  },
  placeholder: {
    width: 44,
  },
  settingsOverlay: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  settingsSection: {
    marginTop: 20,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
    alignItems: 'center', // 确保内容居中
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8B4513', // 使用主页面的棕色
    marginBottom: 12,
  },
  statCard: {
    backgroundColor: '#FFFFFF', // 更透明的背景，让背景图显示
    borderRadius: 16,
    padding: 20,
    borderWidth: 3,
    borderColor: '#8B4513', // 使用棕色边框
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    width: '100%',
    maxWidth: 400,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16, // 增加垂直内边距
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(210, 105, 30, 0.2)', // 使用半透明棕色分隔线
    marginBottom: 4, // 增加底部间距
  },
  statContent: {
    flex: 1,
    marginLeft: 12,
  },
  statLabel: {
    fontSize: 15, // 稍微增大字体
    color: '#8B4513', // 使用主页面的棕色
    fontWeight: '500', // 增加字重
  },
  statValue: {
    fontSize: 20, // 增大数值字体
    fontWeight: 'bold', // 使用粗体
    color: '#D2691E', // 使用主页面的深棕色
    marginTop: 4, // 增加顶部间距
  },
  statSubtitle: {
    fontSize: 13, // 稍微增大字体
    color: '#8B4513', // 使用主页面的棕色
    marginTop: 4, // 增加顶部间距
    fontStyle: 'italic', // 添加斜体效果
  },
  settingsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)', // 更透明的背景，让背景图显示
    borderRadius: 16,
    padding: 20,
    borderWidth: 3,
    borderColor: '#8B4513', // 使用棕色边框
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    width: '100%',
    maxWidth: 400,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16, // 增加垂直内边距
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(210, 105, 30, 0.2)', // 使用半透明棕色分隔线
    marginBottom: 4, // 增加底部间距
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingLabel: {
    fontSize: 16, // 稍微增大字体
    color: '#8B4513', // 使用主页面的棕色
    marginLeft: 12,
    fontWeight: '500', // 增加字重
  },
  // 自定义Toggle样式，匹配参考图
  customToggle: {
    width: 60,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    paddingHorizontal: 2,
    borderWidth: 2,
    borderColor: '#BDBDBD',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  customToggleActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#388E3C',
  },
  customToggleThumb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  customToggleThumbActive: {
    alignSelf: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 3,
    borderColor: '#8B4513', // 使用棕色边框
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    width: '100%',
    maxWidth: 400,
  },
  dangerButton: {
    borderWidth: 2,
    borderColor: '#f44336', // 红色边框
  },
  actionButtonText: {
    flex: 1,
    fontSize: 17, // 稍微增大字体
    color: '#8B4513', // 使用主页面的棕色
    marginLeft: 12,
    fontWeight: '600', // 增加字重
  },
  dangerButtonText: {
    color: '#f44336',
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)', // 更透明的背景，让背景图显示
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#8B4513', // 使用棕色边框
    marginHorizontal: 20,
    marginTop: 20,
  },
  appName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8B4513', // 使用主页面的棕色
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 15, // 稍微增大字体
    color: '#8B4513', // 使用主页面的棕色
    marginBottom: 16, // 增加底部间距
    fontWeight: '500', // 增加字重
  },
  appDescription: {
    fontSize: 15, // 稍微增大字体
    color: '#8B4513', // 使用主页面的棕色
    textAlign: 'center',
    lineHeight: 22, // 增加行高
    paddingHorizontal: 10, // 减少水平内边距
    fontWeight: '400', // 设置字重
  },
});