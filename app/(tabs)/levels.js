/**
 * Level Mode Screen - Browse and select levels to play
 * Purpose: Show level list with filtering, navigate to level details
 * Extend: Add search, favorites, difficulty indicators, or completion stats
 */

import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  ScrollView,
  FlatList,
  Animated
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGameStore } from '../store/gameStore';
import { STAGE_NAMES, STAGE_GROUPS, getStageGroup } from '../utils/stageNames';
import * as Haptics from 'expo-haptics';

const FILTER_CHIPS = [
  { id: 'all', label: 'All Levels', range: [1, 200] },
  { id: 'daycare', label: 'Daycare', range: [1, 5] },
  { id: 'kindergarten', label: 'Kindergarten', range: [6, 10] },
  { id: 'elementary', label: 'Elementary', range: [11, 30] },
  { id: 'middle', label: 'Middle School', range: [31, 45] },
  { id: 'high', label: 'High School', range: [46, 65] },
  { id: 'college', label: 'College', range: [66, 85] },
  { id: 'graduate', label: 'Graduate', range: [86, 95] },
  { id: 'professor', label: 'Professor', range: [96, 100] },
  { id: 'career', label: 'Career', range: [101, 150] },
  { id: 'life', label: 'Life Stages', range: [151, 180] },
  { id: 'beyond', label: 'Beyond Reality', range: [181, 200] },
];

export default function LevelsScreen() {
  const { gameData } = useGameStore();
  const [selectedFilter, setSelectedFilter] = useState('all');
  const insets = useSafeAreaInsets();
  
  const maxLevel = gameData?.maxLevel || 1; // 至少可以玩第1关
  const lastPlayedLevel = gameData?.lastPlayedLevel || 1;

  const getFilteredLevels = () => {
    const filter = FILTER_CHIPS.find(f => f.id === selectedFilter);
    if (!filter) return [];
    
    const levels = [];
    for (let i = filter.range[0]; i <= filter.range[1]; i++) {
      levels.push({
        id: i,
        level: i,
        stageName: STAGE_NAMES[i] || `Level ${i}`,
        group: getStageGroup(i),
        isUnlocked: i <= Math.max(maxLevel + 1, 1), // 至少第1关是解锁的
        isUnlocked: true, // 开放所有关卡用于测试
        isCompleted: i <= maxLevel,
        isLastPlayed: i === lastPlayedLevel,
      });
    }
    return levels;
  };

  const handleLevelPress = (level) => {
    if (level.isUnlocked) {
      router.push(`/details/${level.level}`);
    }
  };

  const renderFilterChip = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.filterChip,
        selectedFilter === item.id && styles.filterChipActive
      ]}
      onPress={() => setSelectedFilter(item.id)}
    >
      <Text style={[
        styles.filterChipText,
        selectedFilter === item.id && styles.filterChipTextActive
      ]}>
        {item.label}
      </Text>
    </TouchableOpacity>
  );

  const renderLevelCard = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.levelCard,
        !item.isUnlocked && styles.levelCardLocked,
        item.isLastPlayed && styles.levelCardCurrent
      ]}
      onPress={() => handleLevelPress(item)}
      disabled={!item.isUnlocked}
    >
      <View style={styles.levelCardHeader}>
        <Text style={[
          styles.levelNumber,
          !item.isUnlocked && styles.levelNumberLocked
        ]}>
          {item.level}
        </Text>
        {item.isCompleted && (
          <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
        )}
        {!item.isUnlocked && (
          <Ionicons name="lock-closed" size={20} color="#ccc" />
        )}
      </View>
      <Text style={[
        styles.levelName,
        !item.isUnlocked && styles.levelNameLocked
      ]} numberOfLines={2}>
        {item.stageName}
      </Text>
      <Text style={[
        styles.levelGroup,
        !item.isUnlocked && styles.levelGroupLocked
      ]}>
        {item.group}
      </Text>
    </TouchableOpacity>
  );

  const filteredLevels = getFilteredLevels();

  return (
    <SafeAreaView style={styles.container}>
      {/* 返回按钮 */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.replace('/')}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.placeholder} />
      </View>
      
      <View style={styles.header}>
        <Text style={styles.title}>Level Mode</Text>
        <Text style={styles.subtitle}>Choose your stage</Text>
      </View>

      {/* Filter Chips */}
      <View style={styles.filtersContainer}>
        <FlatList
          data={FILTER_CHIPS}
          renderItem={renderFilterChip}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
        />
      </View>

      {/* Levels Grid */}
      <FlatList
        data={filteredLevels}
        renderItem={renderLevelCard}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        contentContainerStyle={styles.levelsContent}
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'white',
  },
  backButton: {
    padding: 8,
  },
  placeholder: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  filtersContainer: {
    backgroundColor: 'white',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filtersContent: {
    paddingHorizontal: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#4CAF50',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: 'white',
  },
  levelsContent: {
    padding: 16,
  },
  levelCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    margin: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  levelCardLocked: {
    backgroundColor: '#f8f8f8',
    opacity: 0.6,
  },
  levelCardCurrent: {
    borderWidth: 2,
    borderColor: '#FF9800',
  },
  levelCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  levelNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  levelNumberLocked: {
    color: '#ccc',
  },
  levelName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    minHeight: 36,
  },
  levelNameLocked: {
    color: '#999',
  },
  levelGroup: {
    fontSize: 12,
    color: '#666',
  },
  levelGroupLocked: {
    color: '#ccc',
  },
});