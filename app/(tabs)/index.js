/**
 * Home Screen - Main dashboard with level and challenge mode access
 * Purpose: Central hub for game navigation and progress display
 * Features: Simple two-button layout, progress tracking, settings access
 */

import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGameStore } from '../store/gameStore';

export default function HomeScreen() {
  const { gameData } = useGameStore();
  
  const maxLevel = gameData?.maxLevel || 1;
  const maxScore = gameData?.maxScore || 0;
  const swapMasterItems = gameData?.swapMasterItems || 0;

  const handleLevelsPress = () => {
    router.push('/levels');
  };

  const handleChallengePress = () => {
    router.push('/challenge');
  };

  const handleHelpPress = () => {
    router.push('/about');
  };

  const handleSettingsPress = () => {
    router.push('/profile');
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appTitle}>Daycare Number Elimination</Text>
          <Text style={styles.appSubtitle}>Draw rectangles to make 10</Text>
        </View>

        {/* Progress Card */}
        <View style={styles.progressCard}>
          <View style={styles.progressRow}>
            <View style={styles.progressItem}>
              <Text style={styles.progressLabel}>Current Level</Text>
              <Text style={styles.progressValue}>{maxLevel}</Text>
            </View>
            <View style={styles.progressItem}>
              <Text style={styles.progressLabel}>Best IQ Score</Text>
              <Text style={styles.progressValue}>{maxScore}</Text>
              <Text style={styles.progressSubtext}>{getIQTitle(maxScore)}</Text>
            </View>
          </View>
          
          <View style={styles.itemsRow}>
            <View style={styles.itemDisplay}>
              <Ionicons name="swap-horizontal" size={16} color="#2196F3" />
              <Text style={styles.itemText}>SwapMaster: {swapMasterItems}</Text>
            </View>
          </View>
        </View>

        {/* Main Buttons */}
        <View style={styles.mainButtons}>
          <TouchableOpacity 
            style={[styles.mainButton, styles.levelsButton]}
            onPress={handleLevelsPress}
            activeOpacity={0.8}
          >
            <Ionicons name="school" size={40} color="white" />
            <Text style={styles.mainButtonTitle}>LEVELS</Text>
            <Text style={styles.mainButtonSubtitle}>200+ Educational Stages</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.mainButton, styles.challengeButton]}
            onPress={handleChallengePress}
            activeOpacity={0.8}
          >
            <Ionicons name="timer" size={40} color="white" />
            <Text style={styles.mainButtonTitle}>CHALLENGE</Text>
            <Text style={styles.mainButtonSubtitle}>60-Second IQ Sprint</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Tools */}
        <View style={styles.bottomTools}>
          <TouchableOpacity 
            style={styles.toolButton}
            onPress={handleHelpPress}
          >
            <Ionicons name="help-circle" size={24} color="#666" />
            <Text style={styles.toolButtonText}>Help</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.toolButton}
            onPress={handleSettingsPress}
          >
            <Ionicons name="settings" size={24} color="#666" />
            <Text style={styles.toolButtonText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f8ff',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  appSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  progressCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  progressItem: {
    flex: 1,
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  progressValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  progressSubtext: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  itemsRow: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  itemDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  mainButtons: {
    gap: 16,
    marginBottom: 40,
  },
  mainButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  levelsButton: {
    backgroundColor: '#4CAF50',
  },
  challengeButton: {
    backgroundColor: '#FF9800',
  },
  mainButtonTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 12,
    marginBottom: 4,
  },
  mainButtonSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  bottomTools: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 20,
  },
  toolButton: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  toolButtonText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});