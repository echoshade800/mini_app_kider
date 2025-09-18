/**
 * Levels Screen - Level selection and progression
 * Purpose: Display available levels with unlock progression
 * Features: Grid layout, progress tracking, stage grouping
 */

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  ScrollView,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGameStore } from '../store/gameStore';
import { STAGE_NAMES, STAGE_GROUPS, getStageGroup } from '../utils/stageNames';

const { width: screenWidth } = Dimensions.get('window');

export default function LevelsScreen() {
  const { gameData } = useGameStore();
  const [selectedGroup, setSelectedGroup] = useState('All');
  
  const maxLevel = gameData?.maxLevel || 1;
  const currentLevel = Math.min(maxLevel + 1, 201); // Next level to play

  const handleLevelPress = (level) => {
    if (level <= maxLevel + 1) {
      router.push(`/details/${level}`);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const getFilteredLevels = () => {
    const levels = [];
    const maxDisplay = Math.max(maxLevel + 1, 10); // Show at least first 10 levels
    
    for (let i = 1; i <= Math.min(maxDisplay, 200); i++) {
      if (selectedGroup === 'All' || getStageGroup(i) === selectedGroup) {
        levels.push(i);
      }
    }
    
    return levels;
  };

  const getLevelStatus = (level) => {
    if (level < currentLevel) return 'completed';
    if (level === currentLevel) return 'current';
    return 'locked';
  };

  const getLevelStyle = (level) => {
    const status = getLevelStatus(level);
    
    switch (status) {
      case 'completed':
        return [styles.levelButton, styles.levelCompleted];
      case 'current':
        return [styles.levelButton, styles.levelCurrent];
      default:
        return [styles.levelButton, styles.levelLocked];
    }
  };

  const getLevelIcon = (level) => {
    const status = getLevelStatus(level);
    
    switch (status) {
      case 'completed':
        return 'checkmark-circle';
      case 'current':
        return 'play-circle';
      default:
        return 'lock-closed';
    }
  };

  const getLevelIconColor = (level) => {
    const status = getLevelStatus(level);
    
    switch (status) {
      case 'completed':
        return '#4CAF50';
      case 'current':
        return '#FF9800';
      default:
        return '#ccc';
    }
  };

  const renderLevel = (level) => {
    const stageName = STAGE_NAMES[level] || `Level ${level}`;
    const status = getLevelStatus(level);
    const isPlayable = level <= maxLevel + 1;

    return (
      <TouchableOpacity
        key={level}
        style={getLevelStyle(level)}
        onPress={() => handleLevelPress(level)}
        disabled={!isPlayable}
        activeOpacity={isPlayable ? 0.7 : 1}
      >
        <View style={styles.levelHeader}>
          <Text style={styles.levelNumber}>{level}</Text>
          <Ionicons 
            name={getLevelIcon(level)} 
            size={20} 
            color={getLevelIconColor(level)} 
          />
        </View>
        <Text style={styles.levelName} numberOfLines={2}>
          {stageName}
        </Text>
        {status === 'current' && (
          <Text style={styles.levelStatus}>Next Level</Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderGroupFilter = () => {
    const groups = ['All', ...Object.keys(STAGE_GROUPS)];
    
    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {groups.map((group) => (
          <TouchableOpacity
            key={group}
            style={[
              styles.filterButton,
              selectedGroup === group && styles.filterButtonActive
            ]}
            onPress={() => setSelectedGroup(group)}
          >
            <Text style={[
              styles.filterButtonText,
              selectedGroup === group && styles.filterButtonTextActive
            ]}>
              {group}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const filteredLevels = getFilteredLevels();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBack}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Levels</Text>
          <Text style={styles.subtitle}>
            Progress: {maxLevel}/200+ levels
          </Text>
        </View>
        
        <View style={styles.placeholder} />
      </View>

      {/* Group Filter */}
      {renderGroupFilter()}

      {/* Levels Grid */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.levelsGrid}>
          {filteredLevels.map(renderLevel)}
        </View>
        
        {maxLevel >= 200 && (
          <View style={styles.infiniteSection}>
            <Text style={styles.infiniteSectionTitle}>Infinite Levels</Text>
            <Text style={styles.infiniteSectionText}>
              You've completed all 200 named levels! Continue with procedurally generated levels beyond Level 200.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f8ff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  placeholder: {
    width: 40,
  },
  filterContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#4CAF50',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  levelsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  levelButton: {
    width: (screenWidth - 48) / 2, // 2 columns with margins
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
  levelCompleted: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  levelCurrent: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    backgroundColor: '#FFF8E1',
  },
  levelLocked: {
    opacity: 0.6,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  levelNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  levelName: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
    minHeight: 36, // Ensure consistent height
  },
  levelStatus: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '600',
    marginTop: 4,
  },
  infiniteSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infiniteSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  infiniteSectionText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});