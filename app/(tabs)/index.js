/**
 * Home Dashboard Screen - Main game dashboard with quick access
 * Purpose: Show game overview, quick play options, and navigation
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
import { STAGE_NAMES, getStageGroup } from '../utils/stageNames';

export default function HomeScreen() {
  const { gameData, userData } = useGameStore();

  const handlePlayLevel = (level) => {
    router.push(`/details/${level}`);
  };

  const handleLevelMode = () => {
    router.push('/(tabs)/levels');
  };

  const handleChallengeMode = () => {
    router.push('/(tabs)/challenge');
  };

  const handleAbout = () => {
    router.push('/about');
  };

  const currentLevel = gameData?.lastPlayedLevel || 1;
  const maxLevel = gameData?.maxLevel || 1;
  const changeItems = gameData?.changeItems || 0;
  const bestScore = gameData?.maxScore || 0;

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
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.welcomeText}>Welcome back!</Text>
            <Text style={styles.playerName}>{userData?.userName || 'Player'}</Text>
          </View>
          <TouchableOpacity 
            style={styles.aboutButton}
            onPress={handleAbout}
          >
            <Ionicons name="information-circle" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="school" size={24} color="#4CAF50" />
            <Text style={styles.statValue}>Level {maxLevel}</Text>
            <Text style={styles.statLabel}>Best Level</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="timer" size={24} color="#FF9800" />
            <Text style={styles.statValue}>{bestScore}</Text>
            <Text style={styles.statLabel}>Best IQ</Text>
            <Text style={styles.statSubtitle}>{getIQTitle(bestScore)}</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="swap-horizontal" size={24} color="#2196F3" />
            <Text style={styles.statValue}>{changeItems}</Text>
            <Text style={styles.statLabel}>Change Items</Text>
          </View>
        </View>

        {/* Continue Playing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Continue Playing</Text>
          <TouchableOpacity 
            style={styles.continueCard}
            onPress={() => handlePlayLevel(currentLevel)}
          >
            <View style={styles.continueContent}>
              <View style={styles.continueInfo}>
                <Text style={styles.continueLevel}>Level {currentLevel}</Text>
                <Text style={styles.continueName}>
                  {STAGE_NAMES[currentLevel] || `Level ${currentLevel}`}
                </Text>
                <Text style={styles.continueGroup}>
                  {getStageGroup(currentLevel)}
                </Text>
              </View>
              <Ionicons name="play-circle" size={48} color="#4CAF50" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Game Modes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Game Modes</Text>
          
          <TouchableOpacity 
            style={styles.modeCard}
            onPress={handleLevelMode}
          >
            <View style={styles.modeIcon}>
              <Ionicons name="school" size={32} color="#4CAF50" />
            </View>
            <View style={styles.modeContent}>
              <Text style={styles.modeTitle}>Level Mode</Text>
              <Text style={styles.modeDescription}>
                Progress through 200+ educational stages
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.modeCard}
            onPress={handleChallengeMode}
          >
            <View style={styles.modeIcon}>
              <Ionicons name="timer" size={32} color="#FF9800" />
            </View>
            <View style={styles.modeContent}>
              <Text style={styles.modeTitle}>Challenge Mode</Text>
              <Text style={styles.modeDescription}>
                60-second IQ sprint with instant boards
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>
        </View>

        {/* How to Play */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How to Play</Text>
          <View style={styles.howToPlayCard}>
            <View style={styles.instruction}>
              <Text style={styles.instructionNumber}>1</Text>
              <Text style={styles.instructionText}>
                Draw rectangles by dragging your finger across tiles
              </Text>
            </View>
            
            <View style={styles.instruction}>
              <Text style={styles.instructionNumber}>2</Text>
              <Text style={styles.instructionText}>
                Make sure the sum equals exactly 10 to clear tiles
              </Text>
            </View>
            
            <View style={styles.instruction}>
              <Text style={styles.instructionNumber}>3</Text>
              <Text style={styles.instructionText}>
                Use Change items to swap any two tiles when stuck
              </Text>
            </View>
          </View>
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
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
  },
  headerContent: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
  },
  playerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  aboutButton: {
    padding: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statSubtitle: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  continueCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  continueContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  continueInfo: {
    flex: 1,
  },
  continueLevel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  continueName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 4,
  },
  continueGroup: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  modeContent: {
    flex: 1,
  },
  modeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  modeDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  howToPlayCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  instruction: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 24,
    marginRight: 12,
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
});