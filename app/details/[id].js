/**
 * Level Detail Screen - Individual level gameplay
 * Purpose: Play a specific level with board generation and progress tracking
 * Features: Level-specific board, completion tracking, item usage
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  Alert,
  Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import GameBoard from '../components/GameBoard';
import { useGameStore } from '../store/gameStore';
import { generateBoard } from '../utils/boardGenerator';
import { STAGE_NAMES } from '../utils/stageNames';

export default function LevelDetailScreen() {
  const { id } = useLocalSearchParams();
  const level = parseInt(id);
  
  const { gameData, updateGameData, settings } = useGameStore();
  
  const [board, setBoard] = useState(null);
  const [gameState, setGameState] = useState('playing'); // playing, completed, failed
  const [itemMode, setItemMode] = useState(null); // null, 'swapMaster', 'fractalSplit'
  const [selectedSwapTile, setSelectedSwapTile] = useState(null);
  const [swapAnimations, setSwapAnimations] = useState(new Map());
  const [fractalAnimations, setFractalAnimations] = useState(new Map());
  
  const tileScales = useRef(new Map()).current;

  const initTileScale = (index) => {
    if (!tileScales.has(index)) {
      tileScales.set(index, new Animated.Value(1));
    }
    return tileScales.get(index);
  };

  const scaleTile = (index, scale) => {
    const tileScale = initTileScale(index);
    Animated.timing(tileScale, {
      toValue: scale,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  const getTileRotation = (row, col) => {
    const seed = row * 13 + col * 7;
    return (seed % 7) - 3; // -3 to 3 degrees
  };

  // Generate board for this level
  useEffect(() => {
    if (level && level > 0) {
      const newBoard = generateBoard(level);
      setBoard(newBoard);
    }
  }, [level]);

  const handleTilesClear = (clearedPositions) => {
    if (!board) return;
    
    // Create new board with cleared tiles
    const newTiles = [...board.tiles];
    clearedPositions.forEach(pos => {
      const index = pos.row * board.width + pos.col;
      newTiles[index] = 0;
    });
    
    // Check if board is completely cleared
    const isEmpty = newTiles.every(tile => tile === 0);
    
    if (isEmpty) {
      // Level completed!
      setGameState('completed');
      
      // Update progress
      const newMaxLevel = Math.max(gameData?.maxLevel || 0, level);
      const newSwapMasterItems = (gameData?.swapMasterItems || 0) + 1;
      
      updateGameData({
        maxLevel: newMaxLevel,
        swapMasterItems: newSwapMasterItems,
        lastPlayedLevel: level,
      });
      
      if (settings?.hapticsEnabled !== false) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } else {
      // Update board with cleared tiles
      setBoard(prev => ({ ...prev, tiles: newTiles }));
    }
  };

  const handleTileClick = (row, col, value) => {
    if (!itemMode || !board) return;
    
    const index = row * board.width + col;
    
    if (itemMode === 'swapMaster') {
      if (!selectedSwapTile) {
        // Select first tile
        setSelectedSwapTile({ row, col, value, index });
      } else if (selectedSwapTile.index === index) {
        // Deselect same tile
        setSelectedSwapTile(null);
      } else {
        // Swap tiles
        const newTiles = [...board.tiles];
        newTiles[selectedSwapTile.index] = value;
        newTiles[index] = selectedSwapTile.value;
        
        setBoard(prev => ({ ...prev, tiles: newTiles }));
        setSelectedSwapTile(null);
        setItemMode(null);
        
        if (settings?.hapticsEnabled !== false) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      }
    }
  };

  const handleUseSwapMaster = () => {
    if ((gameData?.swapMasterItems || 0) <= 0) {
      Alert.alert('No Items', 'You don\'t have any SwapMaster items.');
      return;
    }
    
    setItemMode('swapMaster');
    setSelectedSwapTile(null);
    
    // Deduct item
    updateGameData({
      swapMasterItems: (gameData?.swapMasterItems || 0) - 1,
    });
  };

  const handleBack = () => {
    router.back();
  };

  const handleRestart = () => {
    if (level && level > 0) {
      const newBoard = generateBoard(level);
      setBoard(newBoard);
      setGameState('playing');
      setItemMode(null);
      setSelectedSwapTile(null);
    }
  };

  const handleNextLevel = () => {
    router.replace(`/details/${level + 1}`);
  };

  const stageName = STAGE_NAMES[level] || `Level ${level}`;

  if (!board) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading level...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (gameState === 'completed') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.completedContainer}>
          <Ionicons name="trophy" size={80} color="#FFD700" />
          <Text style={styles.completedTitle}>Level Complete!</Text>
          <Text style={styles.completedLevel}>{stageName}</Text>
          <Text style={styles.completedReward}>+1 SwapMaster Item</Text>
          
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={handleBack}
            >
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={handleNextLevel}
            >
              <Text style={styles.primaryButtonText}>Next Level</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* HUD */}
      <View style={styles.hud}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBack}
        >
          <Ionicons name="arrow-back" size={20} color="#666" />
        </TouchableOpacity>

        <View style={styles.levelInfo}>
          <Text style={styles.levelNumber}>Level {level}</Text>
          <Text style={styles.levelName}>{stageName}</Text>
        </View>

        <TouchableOpacity 
          style={styles.restartButton}
          onPress={handleRestart}
        >
          <Ionicons name="refresh" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Game Board */}
      <GameBoard
        tiles={board.tiles}
        width={board.width}
        height={board.height}
        onTilesClear={handleTilesClear}
        disabled={itemMode !== null}
        settings={settings}
        itemMode={itemMode}
        onTileClick={handleTileClick}
        selectedSwapTile={selectedSwapTile}
        swapAnimations={swapAnimations}
        fractalAnimations={fractalAnimations}
        initTileScale={initTileScale}
        getTileRotation={getTileRotation}
        scaleTile={scaleTile}
        isChallenge={false}
      />

      {/* Item Bar */}
      <View style={styles.itemBar}>
        <TouchableOpacity 
          style={[
            styles.itemButton,
            itemMode === 'swapMaster' && styles.itemButtonActive
          ]}
          onPress={handleUseSwapMaster}
          disabled={itemMode !== null && itemMode !== 'swapMaster'}
        >
          <Ionicons name="swap-horizontal" size={20} color="#2196F3" />
          <Text style={styles.itemButtonText}>SwapMaster</Text>
          <Text style={styles.itemCount}>{gameData?.swapMasterItems || 0}</Text>
        </TouchableOpacity>
      </View>
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
    fontSize: 16,
    color: '#666',
  },
  hud: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelInfo: {
    alignItems: 'center',
    flex: 1,
  },
  levelNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  levelName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  restartButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  itemButton: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    minWidth: 100,
  },
  itemButtonActive: {
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  itemButtonText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  itemCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
    marginTop: 2,
  },
  completedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  completedTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 20,
    marginBottom: 8,
  },
  completedLevel: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  completedReward: {
    fontSize: 16,
    color: '#FF9800',
    marginBottom: 40,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 16,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'white',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4CAF50',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  secondaryButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
  },
});