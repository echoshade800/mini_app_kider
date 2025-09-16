/**
 * Level Detail Screen - Individual level gameplay with board and controls
 * Purpose: Play specific levels with progress tracking and item usage
 * Extend: Add hints, level-specific challenges, or social sharing
 */

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  Alert,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGameStore } from '../store/gameStore';
import { GameBoard } from '../components/GameBoard';
import { generateBoard } from '../utils/boardGenerator';
import { STAGE_NAMES } from '../utils/stageNames';

export default function LevelDetailScreen() {
  const { id } = useLocalSearchParams();
  const level = parseInt(id);
  
  const { gameData, updateGameData } = useGameStore();
  const [currentBoard, setCurrentBoard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [swapMode, setSwapMode] = useState(false);
  const [firstSwapTile, setFirstSwapTile] = useState(null);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    initializeLevel();
  }, [level]);

  const initializeLevel = async () => {
    try {
      setIsLoading(true);
      const board = generateBoard(level);
      setCurrentBoard(board);
    } catch (error) {
      console.error('Failed to initialize level:', error);
      Alert.alert('Error', 'Failed to load level. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTilesClear = (clearedPositions) => {
    if (!currentBoard) return;
    
    // Create new board with cleared tiles
    const newTiles = [...currentBoard.tiles];
    clearedPositions.forEach(({ row, col }) => {
      const index = row * currentBoard.width + col;
      newTiles[index] = 0;
    });
    
    const updatedBoard = { ...currentBoard, tiles: newTiles };
    setCurrentBoard(updatedBoard);
    
    // Check if level is complete
    const hasRemainingTiles = newTiles.some(tile => tile > 0);
    
    if (!hasRemainingTiles) {
      // Level completed
      setTimeout(() => {
        handleLevelComplete();
      }, 1000);
    }
  };

  const handleLevelComplete = () => {
    const currentMaxLevel = gameData?.maxLevel || 0;
    const newMaxLevel = Math.max(currentMaxLevel, level);
    const changeItemsReward = level > currentMaxLevel ? 1 : 0;
    const currentChangeItems = gameData?.changeItems || 0;
    
    updateGameData({
      maxLevel: newMaxLevel,
      changeItems: currentChangeItems + changeItemsReward,
      lastPlayedLevel: level,
    });
    
    Alert.alert(
      'Level Complete!',
      `Congratulations! ${changeItemsReward > 0 ? `You earned ${changeItemsReward} Change item!` : ''}`,
      [
        {
          text: 'Next Level',
          onPress: () => {
            if (level < 200) {
              router.replace(`/details/${level + 1}`);
            } else {
              router.back();
            }
          }
        },
        {
          text: 'Back to Levels',
          onPress: () => router.back()
        }
      ]
    );
  };

  const handleTileClick = (row, col) => {
    if (!swapMode || !currentBoard) return;

    const index = row * currentBoard.width + col;
    const tileValue = currentBoard.tiles[index];
    
    // Only allow clicking on number tiles
    if (tileValue === 0) return;

    if (!firstSwapTile) {
      // Select first tile
      setFirstSwapTile({ row, col, index, value: tileValue });
    } else {
      // Select second tile and perform swap
      if (firstSwapTile.index === index) {
        // Clicking same tile, deselect
        setFirstSwapTile(null);
        return;
      }

      // Perform swap
      const newTiles = [...currentBoard.tiles];
      newTiles[firstSwapTile.index] = tileValue;
      newTiles[index] = firstSwapTile.value;

      const updatedBoard = { ...currentBoard, tiles: newTiles };
      setCurrentBoard(updatedBoard);

      // Reset swap state
      setSwapMode(false);
      setFirstSwapTile(null);
    }
  };

  const handleUseChange = () => {
    const currentItems = gameData?.changeItems || 0;
    if (currentItems <= 0) {
      Alert.alert('No Items', 'You don\'t have any Change items. Complete levels to earn more!');
      return;
    }

    // Check if this is the first time using swap
    const hasUsedSwapBefore = gameData?.hasUsedSwapBefore || false;
    
    if (!hasUsedSwapBefore) {
      // Show tutorial for first time
      setShowTutorial(true);
    } else {
      // Direct swap mode
      updateGameData({ changeItems: currentItems - 1 });
      setSwapMode(true);
      setFirstSwapTile(null);
    }
  };

  const handleTutorialComplete = () => {
    setShowTutorial(false);
    const currentItems = gameData?.changeItems || 0;
    updateGameData({ 
      changeItems: currentItems - 1,
      hasUsedSwapBefore: true 
    });
    setSwapMode(true);
    setFirstSwapTile(null);
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Level',
      'Are you sure you want to reset this level?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', onPress: initializeLevel }
      ]
    );
  };

  const handleBack = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading Level {level}...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const stageName = STAGE_NAMES[level] || `Level ${level}`;
  const currentChangeItems = gameData?.changeItems || 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.levelNumber}>Level {level}</Text>
          <Text style={styles.stageName}>{stageName}</Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      {/* Game Board */}
      {currentBoard && (
        <GameBoard 
          board={currentBoard}
          onTilesClear={handleTilesClear}
          onTileClick={handleTileClick}
          swapMode={swapMode}
          firstSwapTile={firstSwapTile}
        />
      )}

      {/* Game Controls */}
      <View style={styles.controls}>
        {/* Change Item Button */}
        <TouchableOpacity 
          style={[
            styles.itemButton,
            currentChangeItems <= 0 && styles.itemButtonDisabled
          ]}
          onPress={handleUseChange}
          disabled={currentChangeItems <= 0}
        >
          <Ionicons 
            name="swap-horizontal" 
            size={24} 
            color={currentChangeItems <= 0 ? "#999" : "white"} 
          />
          {currentChangeItems > 0 && (
            <Text style={styles.itemCount}>{currentChangeItems}</Text>
          )}
        </TouchableOpacity>

        {/* Reset Button */}
        <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
          <Ionicons name="refresh" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Tutorial Modal */}
      <Modal
        visible={showTutorial}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTutorial(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.tutorialModal}>
            <Text style={styles.tutorialTitle}>How to Use Change Item</Text>
            
            <View style={styles.tutorialSteps}>
              <View style={styles.tutorialStep}>
                <Text style={styles.stepNumber}>1</Text>
                <Text style={styles.stepText}>
                  All number tiles will shake and show orange dashed borders
                </Text>
              </View>
              
              <View style={styles.tutorialStep}>
                <Text style={styles.stepNumber}>2</Text>
                <Text style={styles.stepText}>
                  Tap the first tile you want to swap (it will turn green)
                </Text>
              </View>
              
              <View style={styles.tutorialStep}>
                <Text style={styles.stepNumber}>3</Text>
                <Text style={styles.stepText}>
                  Tap the second tile to complete the swap
                </Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.tutorialButton}
              onPress={handleTutorialComplete}
            >
              <Text style={styles.tutorialButtonText}>Got it!</Text>
            </TouchableOpacity>
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
  levelNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  stageName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  placeholder: {
    width: 40,
  },
  controls: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemButton: {
    backgroundColor: '#FF9800',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    position: 'relative',
  },
  itemButtonDisabled: {
    backgroundColor: '#ccc',
  },
  itemCount: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#f44336',
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    textAlign: 'center',
  },
  resetButton: {
    backgroundColor: '#f44336',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tutorialModal: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  tutorialTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  tutorialSteps: {
    marginBottom: 24,
  },
  tutorialStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stepNumber: {
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
  stepText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  tutorialButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  tutorialButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});