/**
 * Home Screen - Main dashboard with overview and quick actions
 * Purpose: Show user progress, provide quick access to game modes
 * Extend: Add daily challenges, achievements, or social features
 */

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  Modal,
  Alert,
  ImageBackground,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGameStore } from '../store/gameStore';
import { STAGE_NAMES, getStageGroup } from '../utils/stageNames';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function HomeScreen() {
  const { 
    userData, 
    gameData, 
    settings, 
    updateSettings, 
    resetDemoData,
    isLoading 
  } = useGameStore();
  
  const [showSettings, setShowSettings] = useState(false);

  const handleStartLevel = () => {
    try {
      router.replace('/(tabs)/levels');
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('导航错误', '无法进入关卡选择页面，请重试');
    }
  };

  const handleStartChallenge = () => {
    try {
      router.replace('/(tabs)/challenge');
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('导航错误', '无法进入挑战模式，请重试');
    }
  };

  const handleAboutPress = () => {
    router.push('/about');
  };

  const handleResetData = () => {
    Alert.alert(
      '重置数据',
      '这将删除所有进度和设置，确定要重置吗？',
      [
        { text: '取消', style: 'cancel' },
        { 
          text: '确定', 
          style: 'destructive',
          onPress: () => {
            resetDemoData();
            setShowSettings(false);
            Alert.alert('成功', '数据已重置');
          }
        }
      ]
    );
  };

  const getBestLevelDisplay = () => {
    const level = gameData?.maxLevel || 0;
    if (level === 0) return { title: 'Not Started', subtitle: 'Begin Your Journey' };
    if (level > 200) {
      return { 
        title: `Level 200+${level - 200}`, 
        subtitle: `The Last Horizon+${level - 200}` 
      };
    }
    return { 
      title: `Level ${level}`, 
      subtitle: STAGE_NAMES[level] || `Level ${level}` 
    };
  };

  const getBestChallengeDisplay = () => {
    const score = gameData?.maxScore || 0;
    const title = getIQTitle(score);
    return { 
      title: `IQ ${score}`, 
      subtitle: title 
    };
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

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const bestLevel = getBestLevelDisplay();
  const bestChallenge = getBestChallengeDisplay();

  return (
    <View style={styles.container}>
      <ImageBackground
        source={{ uri: 'https://twycptozlvvvqxufzhik.supabase.co/storage/v1/object/public/kider1/daycare_dash_stroller_under_1mb.jpg' }}
        style={styles.backgroundImage}
        resizeMode="contain"
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Settings Button - Top Right */}
          <View style={styles.topBar}>
            <View style={styles.topLeft}>
              {/* Progress Info */}
              <View style={styles.progressInfo}>
                <Text style={styles.progressText}>Level {gameData?.maxLevel || 0}</Text>
                <Text style={styles.progressSubtext}>IQ {gameData?.maxScore || 0}</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.settingsButton}
              onPress={() => setShowSettings(true)}
            >
              <Ionicons name="settings" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Invisible buttons overlaying the image buttons */}
          <View style={styles.buttonOverlays}>
            {/* Level Mode Button - Left side */}
            <TouchableOpacity 
              style={styles.levelModeOverlay}
              onPress={handleStartLevel}
              activeOpacity={0.7}
            >
              <Text style={styles.debugText}>闯关模式</Text>
            </TouchableOpacity>
            
            {/* Challenge Mode Button - Right side */}
            <TouchableOpacity 
              style={styles.challengeModeOverlay}
              onPress={handleStartChallenge}
              activeOpacity={0.7}
            >
              <Text style={styles.debugText}>挑战模式</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </ImageBackground>

      {/* Settings Modal */}
      <Modal
        visible={showSettings}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.settingsModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Settings</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowSettings(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Sound Effects</Text>
                <TouchableOpacity
                  style={[styles.toggle, settings?.soundEnabled && styles.toggleActive]}
                  onPress={() => updateSettings({ soundEnabled: !settings?.soundEnabled })}
                >
                  <View style={[styles.toggleThumb, settings?.soundEnabled && styles.toggleThumbActive]} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Haptic Feedback</Text>
                <TouchableOpacity
                  style={[styles.toggle, settings?.hapticsEnabled && styles.toggleActive]}
                  onPress={() => updateSettings({ hapticsEnabled: !settings?.hapticsEnabled })}
                >
                  <View style={[styles.toggleThumb, settings?.hapticsEnabled && styles.toggleThumbActive]} />
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity 
                style={styles.aboutButton}
                onPress={handleAboutPress}
              >
                <Ionicons name="information-circle" size={20} color="#4a90e2" />
                <Text style={styles.aboutButtonText}>About & Help</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.resetButton}
                onPress={handleResetData}
              >
                <Text style={styles.resetButtonText}>Reset Demo Data</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  topLeft: {
    flex: 1,
  },
  progressInfo: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  progressText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  progressSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  settingsButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 10,
    borderRadius: 20,
  },
  buttonOverlays: {
    flex: 1,
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
  },
  levelModeOverlay: {
    flex: 1,
    height: 200,
    marginRight: 20,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  challengeModeOverlay: {
    flex: 1,
    height: 200,
    marginLeft: 20,
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 152, 0, 0.3)',
  },
  debugText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsModal: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ccc',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: '#4CAF50',
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  aboutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  aboutButtonText: {
    fontSize: 16,
    color: '#4a90e2',
    marginLeft: 12,
  },
  resetButton: {
    backgroundColor: '#f44336',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 20,
    alignItems: 'center',
  },
  resetButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});