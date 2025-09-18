/**
 * Level Detail Screen - Individual level gameplay
 * Purpose: Play specific levels with board generation and progress tracking
 * Features: Level-specific boards, item usage, progress saving
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  Dimensions,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useGameStore } from '../store/gameStore';
import { generateBoard } from '../utils/boardGenerator';
import { hasValidCombinations, reshuffleBoard } from '../utils/gameLogic';
import { STAGE_NAMES } from '../utils/stageNames';
import GameBoard from '../components/GameBoard';
import RescueModal from '../components/RescueModal';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function LevelDetailScreen() {
  const { id } = useLocalSearchParams();
  const level = parseInt(id);
  
  const { gameData, updateGameData, settings } = useGameStore();
  
  // Game state
  const [board, setBoard] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showRescueModal, setShowRescueModal] = useState(false);
  const [reshuffleCount, setReshuffleCount] = useState(0);
  
  // Item states
  const [swapMasterItems, setSwapMasterItems] = useState(gameData?.swapMasterItems || 0);
  const [splitItems, setSplitItems] = useState(gameData?.splitItems || 0);
  const [itemMode, setItemMode] = useState(null);
  const [selectedSwapTile, setSelectedSwapTile] = useState(null);
  
  // Animation states
  const [swapAnimations, setSwapAnimations] = useState(new Map());
  const [fractalAnimations, setFractalAnimations] = useState(new Map());

  // Reset game state when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('Level detail screen focused - resetting game');
      
      // Reset all game state
      setBoard(null);
      setIsCompleted(false);
      setShowRescueModal(false);
      setReshuffleCount(0);
      setItemMode(null);
      setSelectedSwapTile(null);
      setSwapAnimations(new Map());
      setFractalAnimations(new Map());
      
      // Load fresh data
      const currentGameData = gameData || {};
      setSwapMasterItems(currentGameData.swapMasterItems || 0);
      setSplitItems(currentGameData.splitItems || 0);
    }, [gameData])
  );

  // Generate board for this level
  useEffect(() => {
    if (!board && !isCompleted) {
      console.log('Generating board for level:', level);
      const newBoard = generateBoard(level, true, false);
      setBoard(newBoard);
    }
  }, [level, board, isCompleted]);

  const handleTilesClear = (clearedPositions) => {
    console.log('Tiles cleared:', clearedPositions.length);
    
    // Reset reshuffle count on successful clear
    setReshuffleCount(0);
    
    // Update board - clear the tiles
    const newTiles = [...board.tiles];
    clearedPositions.forEach(pos => {
      const index = pos.row * board.width + pos.col;
      newTiles[index] = 0;
    });
    
    const updatedBoard = { ...board, tiles: newTiles };
    setBoard(updatedBoard);
    
    // Check if level is completed
    const remainingTiles = newTiles.filter(tile => tile > 0);
    if (remainingTiles.length === 0) {
      handleLevelComplete();
    } else {
      // Check if board needs rescue after animation
      setTimeout(() => {
        console.log('Checking if board needs rescue...');
        const hasValidMoves = hasValidCombinations(updatedBoard.tiles, updatedBoard.width, updatedBoard.height);
        console.log('Has valid combinations:', hasValidMoves);
        
        if (!hasValidMoves) {
          console.log('No valid combinations found, incrementing reshuffle count');
          setReshuffleCount(prev => {
            const newCount = prev + 1;
            if (newCount >= 3) {
              console.log('Showing rescue modal after 3 reshuffles');
              setShowRescueModal(true);
            }
            return newCount;
          });
        }
      }, 800);
    }
  };

  const handleLevelComplete = async () => {
    console.log('Level completed:', level);
    setIsCompleted(true);
    
    if (settings?.hapticsEnabled !== false) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    // Update progress
    const newMaxLevel = Math.max(gameData?.maxLevel || 0, level);
    const newSwapMasterItems = (gameData?.swapMasterItems || 0) + 1;
    
    await updateGameData({
      maxLevel: newMaxLevel,
      swapMasterItems: newSwapMasterItems,
      lastPlayedLevel: level,
    });
    
    // Show completion message
    setTimeout(() => {
      Alert.alert(
        'Level Complete!',
        `Congratulations! You've completed ${STAGE_NAMES[level] || `Level ${level}`}.\n\n+1 SwapMaster item earned!`,
        [
          {
            text: 'Next Level',
            onPress: () => {
              if (level < 200) {
                router.replace(`/details/${level + 1}`);
              } else {
                router.replace('/');
              }
            }
          },
          {
            text: 'Back to Levels',
            onPress: () => router.replace('/(tabs)/levels')
          }
        ]
      );
    }, 1000);
  };

  const handleItemUse = (itemType) => {
    if (itemType === 'swapMaster' && swapMasterItems > 0) {
      setItemMode(itemMode === 'swapMaster' ? null : 'swapMaster');
      setSelectedSwapTile(null);
    } else if (itemType === 'fractalSplit' && splitItems > 0) {
      setItemMode(itemMode === 'fractalSplit' ? null : 'fractalSplit');
      setSelectedSwapTile(null);
    }
  };

  const handleTileClick = (row, col, value) => {
    if (!itemMode) return;
    
    const index = row * board.width + col;
    
    if (itemMode === 'swapMaster') {
      if (!selectedSwapTile) {
        setSelectedSwapTile({ row, col, value, index });
      } else if (selectedSwapTile.index !== index) {
        // Perform swap
        performSwap(selectedSwapTile, { row, col, value, index });
      } else {
        setSelectedSwapTile(null);
      }
    } else if (itemMode === 'fractalSplit') {
      performFractalSplit(row, col, value, index);
    }
  };

  const performSwap = (tile1, tile2) => {
    const newTiles = [...board.tiles];
    newTiles[tile1.index] = tile2.value;
    newTiles[tile2.index] = tile1.value;
    
    setBoard({ ...board, tiles: newTiles });
    setSwapMasterItems(prev => prev - 1);
    setItemMode(null);
    setSelectedSwapTile(null);
    
    updateGameData({ swapMasterItems: swapMasterItems - 1 });
  };

  const performFractalSplit = (row, col, value, index) => {
    if (value <= 1) return;
    
    const newTiles = [...board.tiles];
    const splitValue = Math.floor(value / 2);
    const remainder = value - splitValue;
    
    newTiles[index] = splitValue;
    
    // Find empty spot for remainder
    const emptyIndex = newTiles.findIndex(tile => tile === 0);
    if (emptyIndex !== -1) {
      newTiles[emptyIndex] = remainder;
    }
    
    setBoard({ ...board, tiles: newTiles });
    setSplitItems(prev => prev - 1);
    setItemMode(null);
    
    updateGameData({ splitItems: splitItems - 1 });
  };

  const handleRescueContinue = () => {
    setShowRescueModal(false);
    setReshuffleCount(0);
    // Player can continue using items
  };

  const handleRescueReturn = () => {
    setShowRescueModal(false);
    setReshuffleCount(0);
    router.replace('/(tabs)/levels');
  };

  const handleBackToLevels = () => {
    router.replace('/(tabs)/levels');
  };

  if (!board) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading Level {level}...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const stageName = STAGE_NAMES[level] || `Level ${level}`;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBackToLevels}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <View style={styles.levelInfo}>
          <Text style={styles.levelNumber}>Level {level}</Text>
          <Text style={styles.stageName}>{stageName}</Text>
        </View>
        
        <View style={styles.headerRight}>
          <Text style={styles.itemCount}>
            SwapMaster: {swapMasterItems}
          </Text>
        </View>
      </View>

      {/* Game Board */}
      <GameBoard
        tiles={board.tiles}
        width={board.width}
        height={board.height}
        onTilesClear={handleTilesClear}
        disabled={isCompleted}
        itemMode={itemMode}
        onTileClick={handleTileClick}
        selectedSwapTile={selectedSwapTile}
        swapAnimations={swapAnimations}
        fractalAnimations={fractalAnimations}
        settings={settings}
        reshuffleCount={reshuffleCount}
        setReshuffleCount={setReshuffleCount}
      />

      {/* Bottom Item Bar */}
      <View style={styles.itemBar}>
        <TouchableOpacity
          style={[
            styles.itemButton,
            itemMode === 'swapMaster' && styles.itemButtonActive,
            swapMasterItems === 0 && styles.itemButtonDisabled
          ]}
          onPress={() => handleItemUse('swapMaster')}
          disabled={swapMasterItems === 0}
        >
          <Ionicons 
            name="swap-horizontal" 
            size={20} 
            color={swapMasterItems === 0 ? '#ccc' : (itemMode === 'swapMaster' ? '#fff' : '#2196F3')} 
          />
          <Text style={[
            styles.itemButtonText,
            itemMode === 'swapMaster' && styles.itemButtonTextActive,
            swapMasterItems === 0 && styles.itemButtonTextDisabled
          ]}>
            Swap
          </Text>
          <View style={[
            styles.itemCount,
            swapMasterItems === 0 && styles.itemCountDisabled
          ]}>
            <Text style={[
              styles.itemCountText,
              swapMasterItems === 0 && styles.itemCountTextDisabled
            ]}>
              {swapMasterItems}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.itemButton,
            itemMode === 'fractalSplit' && styles.itemButtonActive,
            splitItems === 0 && styles.itemButtonDisabled
          ]}
          onPress={() => handleItemUse('fractalSplit')}
          disabled={splitItems === 0}
        >
          <Ionicons 
            name="cut" 
            size={20} 
            color={splitItems === 0 ? '#ccc' : (itemMode === 'fractalSplit' ? '#fff' : '#9C27B0')} 
          />
          <Text style={[
            styles.itemButtonText,
            itemMode === 'fractalSplit' && styles.itemButtonTextActive,
            splitItems === 0 && styles.itemButtonTextDisabled
          ]}>
            Split
          </Text>
          <View style={[
            styles.itemCount,
            splitItems === 0 && styles.itemCountDisabled
          ]}>
            <Text style={[
              styles.itemCountText,
              splitItems === 0 && styles.itemCountTextDisabled
            ]}>
              {splitItems}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Rescue Modal */}
      <RescueModal
        visible={showRescueModal}
        onContinue={handleRescueContinue}
        onReturn={handleRescueReturn}
        hasItems={swapMasterItems > 0 || splitItems > 0}
      />
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    height: 80,
  },
  backButton: {
    padding: 8,
    width: 60,
  },
  levelInfo: {
    flex: 1,
    alignItems: 'center',
  },
  levelNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  stageName: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  headerRight: {
    width: 100,
    alignItems: 'flex-end',
  },
  itemCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  itemBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
    height: 80,
  },
  itemButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    minWidth: 80,
    position: 'relative',
  },
  itemButtonActive: {
    backgroundColor: '#4CAF50',
  },
  itemButtonDisabled: {
    backgroundColor: '#f0f0f0',
    opacity: 0.6,
  },
  itemButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginTop: 4,
  },
  itemButtonTextActive: {
    color: 'white',
  },
  itemButtonTextDisabled: {
    color: '#ccc',
  },
  itemCount: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF9800',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemCountDisabled: {
    backgroundColor: '#ddd',
  },
  itemCountText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  itemCountTextDisabled: {
    color: '#999',
  },
});