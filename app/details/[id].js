/**
 * Level Detail Screen - Individual level gameplay
 * Purpose: Display specific level with game board and controls
 * Features: Level-specific board, progress tracking, item usage
 */

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import GameBoard from '../components/GameBoard';
import { useGameStore } from '../store/gameStore';
import { generateLevelBoard } from '../utils/boardGenerator';
import { STAGE_NAMES } from '../utils/stageNames';

export default function LevelDetailScreen() {
  const { id } = useLocalSearchParams();
  const level = parseInt(id);
  const { gameData, updateGameData, settings } = useGameStore();
  
  const [board, setBoard] = useState(null);
  const [itemMode, setItemMode] = useState(null);
  const [selectedSwapTile, setSelectedSwapTile] = useState(null);
  const [showRescueModal, setShowRescueModal] = useState(false);
  const [reshuffleCount, setReshuffleCount] = useState(0);

  useEffect(() => {
    if (level && level >= 1) {
      const newBoard = generateLevelBoard(level);
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
    
    // Check if level is complete (all tiles cleared)
    const remainingTiles = newTiles.filter(tile => tile > 0).length;
    
    if (remainingTiles === 0) {
      // Level completed!
      handleLevelComplete();
    } else {
      // Update board
      setBoard(prev => ({ ...prev, tiles: newTiles }));
    }
  };

  const handleLevelComplete = () => {
    const currentMaxLevel = gameData?.maxLevel || 0;
    const newMaxLevel = Math.max(currentMaxLevel, level);
    const swapMasterItemsGained = level > currentMaxLevel ? 1 : 0;
    
    updateGameData({
      maxLevel: newMaxLevel,
      swapMasterItems: (gameData?.swapMasterItems || 0) + swapMasterItemsGained,
      lastPlayedLevel: level,
    });

    Alert.alert(
      'Level Complete!',
      `Congratulations! You completed ${STAGE_NAMES[level] || `Level ${level}`}!${swapMasterItemsGained > 0 ? '\n\n+1 SwapMaster item earned!' : ''}`,
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
          text: 'Level Select',
          onPress: () => router.back()
        }
      ]
    );
  };

  const handleTileClick = (row, col, value) => {
    if (!itemMode || !board) return;
    
    const index = row * board.width + col;
    
    if (itemMode === 'swapMaster') {
      if (!selectedSwapTile) {
        setSelectedSwapTile({ row, col, value, index });
      } else if (selectedSwapTile.index === index) {
        setSelectedSwapTile(null);
      } else {
        // Swap tiles
        const newTiles = [...board.tiles];
        newTiles[selectedSwapTile.index] = value;
        newTiles[index] = selectedSwapTile.value;
        
        setBoard(prev => ({ ...prev, tiles: newTiles }));
        setSelectedSwapTile(null);
        setItemMode(null);
      }
    }
  };

  const handleUseSwapMaster = () => {
    if ((gameData?.swapMasterItems || 0) <= 0) return;
    
    setItemMode('swapMaster');
    setSelectedSwapTile(null);
    
    updateGameData({
      swapMasterItems: (gameData?.swapMasterItems || 0) - 1,
    });
  };

  const handleUseSplit = () => {
    if ((gameData?.splitItems || 0) <= 0) return;
    
    setItemMode('fractalSplit');
    
    updateGameData({
      splitItems: (gameData?.splitItems || 0) - 1,
    });
  };

  const handleBack = () => {
    router.back();
  };

  if (!board) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading level...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const stageName = STAGE_NAMES[level] || `Level ${level}`;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBack}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.levelNumber}>Level {level}</Text>
          <Text style={styles.stageName}>{stageName}</Text>
        </View>
        
        <View style={styles.placeholder} />
      </View>

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
        showRescueModal={showRescueModal}
        setShowRescueModal={setShowRescueModal}
        reshuffleCount={reshuffleCount}
        setReshuffleCount={setReshuffleCount}
        isChallenge={false}
      />

      <View style={styles.itemBar}>
        <TouchableOpacity 
          style={[
            styles.itemButton,
            itemMode === 'swapMaster' && styles.itemButtonActive,
            (gameData?.swapMasterItems || 0) <= 0 && styles.itemButtonDisabled
          ]}
          onPress={handleUseSwapMaster}
          disabled={itemMode !== null && itemMode !== 'swapMaster'}
        >
          <Ionicons name="swap-horizontal" size={20} color="#2196F3" />
          <Text style={styles.itemButtonText}>SwapMaster</Text>
          <Text style={styles.itemCount}>{gameData?.swapMasterItems || 0}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.itemButton,
            itemMode === 'fractalSplit' && styles.itemButtonActive,
            (gameData?.splitItems || 0) <= 0 && styles.itemButtonDisabled
          ]}
          onPress={handleUseSplit}
          disabled={itemMode !== null && itemMode !== 'fractalSplit'}
        >
          <Ionicons name="cut" size={20} color="#9C27B0" />
          <Text style={styles.itemButtonText}>Split</Text>
          <Text style={styles.itemCount}>{gameData?.splitItems || 0}</Text>
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
  itemBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 20,
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
  itemButtonDisabled: {
    opacity: 0.5,
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
});