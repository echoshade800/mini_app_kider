/**
 * Level Detail Screen - Individual level gameplay with swap functionality
 * Purpose: Play specific levels with Change item usage and board reset
 * Features: Level info, game board, swap mode, progress tracking
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
  const [swapMode, setSwapMode] = useState(false);
  const [firstSwapTile, setFirstSwapTile] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const changeItems = gameData?.changeItems || 0;
  const stageName = STAGE_NAMES[level] || `Level ${level}`;

  useEffect(() => {
    if (level && level > 0) {
      const board = generateBoard(level);
      setCurrentBoard(board);
    }
  }, [level]);

  const handleBack = () => {
    router.back();
  };

  const handleTilesClear = (clearedPositions) => {
    if (!currentBoard) return;
    
    // Create new board with cleared tiles
    const newTiles = [...currentBoard.tiles];
    clearedPositions.forEach(pos => {
      const index = pos.row * currentBoard.width + pos.col;
      newTiles[index] = 0;
    });
    
    setCurrentBoard({
      ...currentBoard,
      tiles: newTiles
    });
    
    // Check if level is complete (all tiles cleared)
    const hasRemainingTiles = newTiles.some(tile => tile > 0);
    if (!hasRemainingTiles) {
      handleLevelComplete();
    }
  };

  const handleLevelComplete = () => {
    // Update progress
    const newMaxLevel = Math.max(gameData?.maxLevel || 0, level);
    const newChangeItems = (gameData?.changeItems || 0) + 1; // Award 1 change item
    
    updateGameData({
      maxLevel: newMaxLevel,
      changeItems: newChangeItems,
      lastPlayedLevel: level
    });
    
    setShowSuccess(true);
  };

  const handleUseChange = () => {
    if (changeItems <= 0) {
      Alert.alert('No Change Items', 'You need Change items to swap tiles. Complete levels to earn more!');
      return;
    }
    
    console.log('Entering swap mode');
    setSwapMode(true);
    setFirstSwapTile(null);
  };

  const handleCancelSwap = () => {
    console.log('Canceling swap mode');
    setSwapMode(false);
    setFirstSwapTile(null);
  };

  const handleTileClick = (row, col, value) => {
    if (!swapMode) return;
    
    const tileData = { row, col, value, index: row * currentBoard.width + col };
    
    if (!firstSwapTile) {
      console.log('Selected first tile:', tileData);
      setFirstSwapTile(tileData);
    } else if (firstSwapTile.index === tileData.index) {
      // Deselect the same tile
      console.log('Deselected tile');
      setFirstSwapTile(null);
    } else {
      // This will be handled by onSwapTiles
      console.log('Selected second tile for swap:', tileData);
    }
  };

  const handleSwapTiles = (tile1, tile2) => {
    if (!currentBoard) return;
    
    console.log('Executing swap:', tile1, tile2);
    
    // Create new board with swapped tiles
    const newTiles = [...currentBoard.tiles];
    newTiles[tile1.index] = tile2.value;
    newTiles[tile2.index] = tile1.value;
    
    setCurrentBoard({
      ...currentBoard,
      tiles: newTiles
    });
    
    // Consume change item
    const newChangeItems = Math.max(0, changeItems - 1);
    updateGameData({ changeItems: newChangeItems });
    
    // Exit swap mode
    setSwapMode(false);
    setFirstSwapTile(null);
    
    console.log('Swap completed, exiting swap mode');
  };

  const handleReset = () => {
    if (swapMode) return; // Don't allow reset during swap mode
    
    Alert.alert(
      'Reset Level',
      'This will reset the board to its original state. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: () => {
            const board = generateBoard(level);
            setCurrentBoard(board);
          }
        }
      ]
    );
  };

  const handleNextLevel = () => {
    setShowSuccess(false);
    const nextLevel = level + 1;
    router.replace(`/details/${nextLevel}`);
  };

  const handleBackToLevels = () => {
    setShowSuccess(false);
    router.replace('/(tabs)/levels');
  };

  if (!currentBoard) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading level...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.levelTitle}>Level {level}</Text>
          <Text style={styles.stageName}>{stageName}</Text>
        </View>
        <View style={styles.changeItemsContainer}>
          <Ionicons name="swap-horizontal" size={20} color="#FF9800" />
          <Text style={styles.changeItemsText}>{changeItems}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonsContainer}>
        {swapMode ? (
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={handleCancelSwap}
          >
            <Ionicons name="close" size={20} color="white" />
            <Text style={styles.buttonText}>Cancel Swap</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity 
              style={[
                styles.changeButton,
                changeItems <= 0 && styles.disabledButton
              ]}
              onPress={handleUseChange}
              disabled={changeItems <= 0}
            >
              <Ionicons name="swap-horizontal" size={20} color="white" />
              <Text style={styles.buttonText}>Use Change ({changeItems})</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.resetButton}
              onPress={handleReset}
            >
              <Ionicons name="refresh" size={20} color="white" />
              <Text style={styles.buttonText}>Reset</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Game Board */}
      <GameBoard 
        board={currentBoard}
        onTilesClear={handleTilesClear}
        onTileClick={handleTileClick}
        swapMode={swapMode}
        firstSwapTile={firstSwapTile}
        onSwapTiles={handleSwapTiles}
        disabled={false}
      />

      {/* Success Modal */}
      <Modal
        visible={showSuccess}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModal}>
            <Ionicons name="trophy" size={60} color="#FFD700" />
            <Text style={styles.successTitle}>Level Complete!</Text>
            <Text style={styles.successText}>
              You earned +1 Change item!
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.nextButton}
                onPress={handleNextLevel}
              >
                <Text style={styles.nextButtonText}>Next Level</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.backToLevelsButton}
                onPress={handleBackToLevels}
              >
                <Text style={styles.backToLevelsButtonText}>Back to Levels</Text>
              </TouchableOpacity>
            </View>
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
  levelTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  stageName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  changeItemsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  changeItemsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF9800',
    marginLeft: 4,
  },
  buttonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  changeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  resetButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f44336',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successModal: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    width: '80%',
    maxWidth: 350,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  successText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  nextButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  backToLevelsButton: {
    backgroundColor: '#666',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backToLevelsButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});