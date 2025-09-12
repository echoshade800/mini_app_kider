/**
 * Home Screen - Main dashboard with overview and quick actions
 * Purpose: Show user progress, provide quick access to game modes
 * Extend: Add daily challenges, achievements, or social features
 */

import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  SafeAreaView,
  Modal
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGameStore } from '../store/gameStore';
import { STAGE_NAMES, getStageGroup } from '../utils/stageNames';

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

  // 确保应用初始化
  useEffect(() => {
    // 如果没有用户数据，创建默认用户
    if (!userData && !isLoading) {
      // 触发重新初始化
      const { initializeApp } = useGameStore.getState();
      initializeApp();
    }
  }, [userData, isLoading]);
  const handleStartLevel = () => {
    // 直接进入关卡选择页面
    router.push('/(tabs)/levels');
  };

  const handleStartChallenge = () => {
    // 直接进入挑战模式
    router.push('/(tabs)/challenge');
  };

  const handleResetData = () => {
    resetDemoData();
    setShowSettings(false);
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
    <SafeAreaView style={styles.container}>
      {/* Header with Settings */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => setShowSettings(true)}
        >
          <Ionicons name="settings" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Progress Badges */}
      <View style={styles.badgesContainer}>
        <View style={[styles.badge, { backgroundColor: '#4CAF50' }]}>
          <Text style={styles.badgeTitle}>{bestLevel.title}</Text>
          <Text style={styles.badgeSubtitle}>{bestLevel.subtitle}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: '#FF9800' }]}>
          <Text style={styles.badgeTitle}>{bestChallenge.title}</Text>
          <Text style={styles.badgeSubtitle}>{bestChallenge.subtitle}</Text>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Daycare Number Elimination</Text>
          <Text style={styles.subtitle}>
            Draw rectangles to make 10—clear the board, climb 200+ named levels, or sprint for IQ in 60 seconds.
          </Text>
        </View>

        <View style={styles.buttonsContainer}>
          <TouchableOpacity 
            style={[styles.mainButton, styles.levelButton]}
            onPress={handleStartLevel}
          >
            <Ionicons name="school" size={32} color="white" />
            <Text style={styles.buttonText}>Start Level Mode</Text>
            <Text style={styles.buttonSubtext}>
              Progress through 200+ named stages
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.mainButton, styles.challengeButton]}
            onPress={handleStartChallenge}
          >
            <Ionicons name="timer" size={32} color="white" />
            <Text style={styles.buttonText}>Start Challenge Mode</Text>
            <Text style={styles.buttonSubtext}>
              60-second IQ sprint
            </Text>
          </TouchableOpacity>
        </View>
      </View>

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
                style={styles.resetButton}
                onPress={handleResetData}
              >
                <Text style={styles.resetButtonText}>Reset Demo Data</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f8ff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  settingsButton: {
    padding: 12,
  },
  badgesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginVertical: 20,
    gap: 12,
  },
  badge: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  badgeSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  buttonsContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 20,
  },
  mainButton: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  levelButton: {
    backgroundColor: '#4CAF50',
  },
  challengeButton: {
    backgroundColor: '#FF5722',
  },
  buttonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  buttonSubtext: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    textAlign: 'center',
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