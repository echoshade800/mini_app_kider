/**
 * Levels Screen - Level selection and progress tracking
 * Purpose: Display available levels with progress indicators and filtering
 * Features: Level grid, progress tracking, stage filtering, unlock system
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

const FILTER_OPTIONS = [
  { key: 'all', label: 'All Levels', color: '#4CAF50' },
  { key: 'daycare', label: 'Daycare', color: '#FFB74D' },
  { key: 'kindergarten', label: 'Kindergarten', color: '#81C784' },
  { key: 'elementary', label: 'Elementary', color: '#64B5F6' },
  { key: 'middle', label: 'Middle School', color: '#BA68C8' },
  { key: 'high', label: 'High School', color: '#F06292' },
  { key: 'college', label: 'College', color: '#4DB6AC' },
  { key: 'career', label: 'Career', color: '#A1C181' },
  { key: 'life', label: 'Life Stages', color: '#DDA0DD' },
  { key: 'beyond', label: 'Beyond Reality', color: '#87CEEB' },
];

export default function LevelsScreen() {
  const { gameData } = useGameStore();
  const [selectedFilter, setSelectedFilter] = useState('all');
  
  const maxLevel = gameData?.maxLevel || 1;
  const totalLevels = 200;

  const getFilteredLevels = () => {
    const levels = [];
    for (let i = 1; i <= totalLevels; i++) {
      const stageGroup = getStageGroup(i).toLowerCase().replace(' ', '');
      
      if (selectedFilter === 'all' || 
          selectedFilter === stageGroup ||
          (selectedFilter === 'middle' && stageGroup === 'middleschool') ||
          (selectedFilter === 'high' && stageGroup === 'highschool') ||
          (selectedFilter === 'life' && stageGroup === 'lifestages') ||
          (selectedFilter === 'beyond' && stageGroup === 'beyondreality')) {
        levels.push(i);
      }
    }
    return levels;
  };

  const getLevelStatus = (level) => {
    if (level <= maxLevel) return 'completed';
    if (level === maxLevel + 1) return 'current';
    return 'locked';
  };

  const getLevelColor = (level) => {
    const status = getLevelStatus(level);
    switch (status) {
      case 'completed': return '#4CAF50';
      case 'current': return '#FF9800';
      case 'locked': return '#BDBDBD';
      default: return '#BDBDBD';
    }
  };

  const getLevelIcon = (level) => {
    const status = getLevelStatus(level);
    switch (status) {
      case 'completed': return 'checkmark-circle';
      case 'current': return 'play-circle';
      case 'locked': return 'lock-closed';
      default: return 'lock-closed';
    }
  };

  const handleLevelPress = (level) => {
    if (level <= maxLevel + 1) {
      router.push(`/details/${level}`);
    }
  };

  const renderLevelItem = ({ item: level }) => {
    const status = getLevelStatus(level);
    const isPlayable = level <= maxLevel + 1;
    const stageName = STAGE_NAMES[level] || `Level ${level}`;
    
    return (
      <TouchableOpacity
        style={[
          styles.levelCard,
          { borderColor: getLevelColor(level) },
          !isPlayable && styles.levelCardDisabled
        ]}
        onPress={() => handleLevelPress(level)}
        disabled={!isPlayable}
        activeOpacity={0.7}
      >
        <View style={styles.levelHeader}>
          <Text style={[styles.levelNumber, { color: getLevelColor(level) }]}>
            {level}
          </Text>
          <Ionicons 
            name={getLevelIcon(level)} 
            size={20} 
            color={getLevelColor(level)} 
          />
        </View>
        
        <Text 
          style={[
            styles.levelName,
            !isPlayable && styles.levelNameDisabled
          ]}
          numberOfLines={2}
        >
          {stageName}
        </Text>
        
        <View style={styles.levelFooter}>
          <Text style={[styles.levelStatus, { color: getLevelColor(level) }]}>
            {status === 'completed' ? 'Completed' : 
             status === 'current' ? 'Play Now' : 'Locked'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFilterButton = (filter) => (
    <TouchableOpacity
      key={filter.key}
      style={[
        styles.filterButton,
        selectedFilter === filter.key && [
          styles.filterButtonActive,
          { backgroundColor: filter.color }
        ]
      ]}
      onPress={() => setSelectedFilter(filter.key)}
    >
      <Text style={[
        styles.filterButtonText,
        selectedFilter === filter.key && styles.filterButtonTextActive
      ]}>
        {filter.label}
      </Text>
    </TouchableOpacity>
  );

  const filteredLevels = getFilteredLevels();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.title}>Level Selection</Text>
          <Text style={styles.subtitle}>
            Progress: {maxLevel}/{totalLevels} levels
          </Text>
        </View>
        
        <View style={styles.placeholder} />
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill,
              { width: `${(maxLevel / totalLevels) * 100}%` }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          {Math.round((maxLevel / totalLevels) * 100)}% Complete
        </Text>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {FILTER_OPTIONS.map(renderFilterButton)}
      </ScrollView>

      <FlatList
        data={filteredLevels}
        renderItem={renderLevelItem}
        keyExtractor={(item) => item.toString()}
        numColumns={2}
        contentContainerStyle={styles.levelsContainer}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={styles.levelRow}
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
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  filterContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
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
  levelsContainer: {
    padding: 16,
  },
  levelRow: {
    justifyContent: 'space-between',
  },
  levelCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 4,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  levelCardDisabled: {
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
  },
  levelName: {
    fontSize: 14,
    color: '#333',
    lineHeight: 18,
    minHeight: 36,
  },
  levelNameDisabled: {
    color: '#999',
  },
  levelFooter: {
    marginTop: 8,
    alignItems: 'center',
  },
  levelStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
});