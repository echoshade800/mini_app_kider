/**
 * Levels Screen - Level selection and progress tracking
 * Purpose: Display available levels with unlock progression and stage grouping
 * Features: Level grid, progress indicators, stage filtering
 */

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  ScrollView,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGameStore } from '../store/gameStore';
import { STAGE_NAMES, STAGE_GROUPS, getStageGroup } from '../utils/stageNames';

export default function LevelsScreen() {
  const { gameData } = useGameStore();
  const [selectedGroup, setSelectedGroup] = useState('All');
  
  const maxLevel = gameData?.maxLevel || 1;
  const lastPlayedLevel = gameData?.lastPlayedLevel || 1;

  // Generate level data
  const generateLevels = () => {
    const levels = [];
    
    // Add levels 1-200 with names
    for (let i = 1; i <= 200; i++) {
      levels.push({
        level: i,
        name: STAGE_NAMES[i] || `Level ${i}`,
        group: getStageGroup(i),
        unlocked: i <= maxLevel,
        completed: i < maxLevel,
        current: i === lastPlayedLevel,
      });
    }
    
    // Add extra levels beyond 200 if unlocked
    if (maxLevel > 200) {
      for (let i = 201; i <= maxLevel + 5; i++) {
        levels.push({
          level: i,
          name: `The Last Horizon+${i - 200}`,
          group: 'Beyond Reality',
          unlocked: i <= maxLevel,
          completed: i < maxLevel,
          current: i === lastPlayedLevel,
        });
      }
    }
    
    return levels;
  };

  const levels = generateLevels();

  // Filter levels by selected group
  const filteredLevels = selectedGroup === 'All' 
    ? levels 
    : levels.filter(level => level.group === selectedGroup);

  const handleLevelPress = (level) => {
    if (level.unlocked) {
      router.push(`/details/${level.level}`);
    }
  };

  const renderLevelItem = ({ item }) => {
    const { level, name, unlocked, completed, current } = item;
    
    let backgroundColor = '#f5f5f5';
    let textColor = '#999';
    let borderColor = '#ddd';
    
    if (unlocked) {
      backgroundColor = completed ? '#E8F5E8' : '#fff';
      textColor = completed ? '#2E7D32' : '#333';
      borderColor = completed ? '#4CAF50' : '#ddd';
    }
    
    if (current) {
      backgroundColor = '#E3F2FD';
      borderColor = '#2196F3';
      textColor = '#1976D2';
    }

    return (
      <TouchableOpacity
        style={[
          styles.levelItem,
          { 
            backgroundColor, 
            borderColor,
            opacity: unlocked ? 1 : 0.5 
          }
        ]}
        onPress={() => handleLevelPress(item)}
        disabled={!unlocked}
      >
        <View style={styles.levelHeader}>
          <Text style={[styles.levelNumber, { color: textColor }]}>
            {level}
          </Text>
          {completed && (
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
          )}
          {current && (
            <Ionicons name="play-circle" size={16} color="#2196F3" />
          )}
        </View>
        
        <Text 
          style={[styles.levelName, { color: textColor }]}
          numberOfLines={2}
        >
          {name}
        </Text>
        
        {!unlocked && (
          <View style={styles.lockOverlay}>
            <Ionicons name="lock-closed" size={16} color="#999" />
          </View>
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
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
      <FlatList
        data={filteredLevels}
        renderItem={renderLevelItem}
        keyExtractor={(item) => item.level.toString()}
        numColumns={2}
        contentContainerStyle={styles.levelsContainer}
        showsVerticalScrollIndicator={false}
      />
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
  headerContent: {
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
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
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
  levelsContainer: {
    padding: 16,
  },
  levelItem: {
    flex: 1,
    margin: 6,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    minHeight: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  },
  levelName: {
    fontSize: 14,
    lineHeight: 18,
    flex: 1,
  },
  lockOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
});