/**
 * Level Details Screen - Individual level gameplay and metadata
 * Purpose: Show level info and provide gameplay interface
 * Extend: Add level statistics, hints, or social sharing features
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
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGameStore } from '../store/gameStore';
import { GameBoard } from '../components/GameBoard';
import { generateBoard } from '../utils/boardGenerator';
import { STAGE_NAMES, getStageGroup } from '../utils/stageNames';

export default function LevelDetailsScreen() {
  const { id } = useLocalSearchParams();
  const level = parseInt(id);
  
  const { gameData, updateGameData } = useGameStore();
  const [currentBoard, setCurrentBoard] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [clearedTiles, setClearedTiles] = useState(new Set());

  useEffect(() => {
    loadLevel();
  }, [level]);

  const loadLevel = () => {
    const board = generateBoard(level, true); // 强制生成新的棋盘
    setCurrentBoard(board);
    setClearedTiles(new Set());
  };

  const handleTilesClear = (clearedPositions) => {
    if (!currentBoard) return;

    // Create new board with cleared tiles
    const newTiles = [...currentBoard.tiles];
    const newClearedSet = new Set(clearedTiles);
    
    clearedPositions.forEach(({ row, col }) => {
      const index = row * currentBoard.width + col;
      newTiles[index] = 0;
      newClearedSet.add(index);
    });

    const updatedBoard = { ...currentBoard, tiles: newTiles };
    setCurrentBoard(updatedBoard);
    setClearedTiles(newClearedSet);

    // Check if level is complete
    const hasRemainingTiles = newTiles.some(tile => tile > 0);
    
    if (!hasRemainingTiles) {
      setTimeout(() => {
        handleLevelComplete();
      }, 500);
    }
  };

  const handleLevelComplete = () => {
    // Update progress
    const currentMax = gameData?.maxLevel || 0;
    const currentItems = gameData?.changeItems || 0;
    
    if (level > currentMax) {
      updateGameData({ 
        maxLevel: level,
        changeItems: currentItems + 1, // Award change item
        lastPlayedLevel: level + 1
      });
    }
    
    setShowSuccess(true);
  };

  const handleUseChange = () => {
    const currentItems = gameData?.changeItems || 0;
    if (currentItems <= 0) {
      Alert.alert(
        'No Change Items',
        'You need change items to swap tiles. Complete more levels to earn them!',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Use Change Item',
      'This feature allows you to swap any two tiles on the board. Would you like to use one change item?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Use Item', 
          onPress: () => {
            updateGameData({ changeItems: currentItems - 1 });
            Alert.alert('Change Item Used', 'Select two tiles to swap their positions.');
          }
        }
      ]
    );
  };

  const handleRestart = () => {
    loadLevel(); // 直接重新生成棋盘，不需要确认
  };

  const handleNextLevel = () => {
    setShowSuccess(false);
    router.replace(`/details/${level + 1}`);
  };

  const handleBackToLevels = () => {
    router.replace('/');
  };

  const getLevelInfo = () => {
    const stageName = level <= 200 ? STAGE_NAMES[level] : `The Last Horizon+${level - 200}`;
    const group = getStageGroup(level);
    const boardSize = getBoardSize(level);
    const difficulty = getDifficulty(level);
    
    return { stageName, group, boardSize, difficulty };
  };

  const getBoardSize = (level) => {
    if (level <= 10) return '4×4 (16 tiles)';
    if (level <= 20) return '5×5 (25 tiles)';
    if (level <= 40) return '6×6 (36 tiles)';
    if (level <= 60) return '7×7 (49 tiles)';
    if (level <= 90) return '8×8 (64 tiles)';
    if (level <= 120) return '9×9 (81 tiles)';
    if (level <= 150) return '10×10 (100 tiles)';
    if (level <= 180) return '11×11 (121 tiles)';
    return '12×11 (132 tiles)';
  };

  const getDifficulty = (level) => {
    if (level <= 40) return { label: 'Easy', color: '#4CAF50' };
    if (level <= 90) return { label: 'Intermediate', color: '#FF9800' };
    return { label: 'Hard', color: '#f44336' };
  };

  if (!currentBoard) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading level {level}...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const levelInfo = getLevelInfo();
  const isUnlocked = level <= (gameData?.maxLevel || 0) + 1;
  const changeItems = gameData?.changeItems || 0;

  if (!isUnlocked) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.lockedContainer}>
          <Ionicons name="lock-closed" size={80} color="#ccc" />
          <Text style={styles.lockedTitle}>Level Locked</Text>
          <Text style={styles.lockedText}>
            Complete previous levels to unlock this stage.
          </Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBackToLevels}
          >
            <Text style={styles.backButtonText}>Back to Levels</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.push('/')}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.levelTitle}>Level {level}</Text>
          <Text style={styles.stageName} numberOfLines={1}>
            {levelInfo.stageName}
          </Text>
          {currentBoard?.requiredSwaps > 0 && (
            <Text style={styles.swapHint}>
              建议使用 {currentBoard.requiredSwaps} 次交换
            </Text>
          )}
        </View>
        
        <View style={styles.changeCounter}>
          <Ionicons name="swap-horizontal" size={16} color="#666" />
          <Text style={styles.changeCountText}>{changeItems}</Text>
        </View>
      </View>


      {/* Game Board */}
      <GameBoard 
        board={currentBoard}
        onTilesClear={handleTilesClear}
      />

      {/* Bottom Actions - Fixed at bottom */}
      <View style={styles.bottomActionsContainer}>
        <TouchableOpacity 
          style={[
            styles.bottomActionButton,
            changeItems <= 0 && styles.actionButtonDisabled
          ]}
          onPress={handleUseChange}
          disabled={changeItems <= 0}
        >
          <Ionicons name="swap-horizontal" size={20} color="white" />
          <Text style={styles.bottomActionButtonText}>
            Use Change ({changeItems})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.bottomActionButton, styles.restartButton]}
          onPress={handleRestart}
        >
          <Ionicons name="refresh" size={20} color="white" />
          <Text style={styles.bottomActionButtonText}>Reset</Text>
        </TouchableOpacity>
      </View>

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
            <Text style={styles.successSubtitle}>
              {levelInfo.stageName}
            </Text>
            
            <View style={styles.rewards}>
              <Text style={styles.rewardText}>+1 Change Item earned!</Text>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.nextButton}
                onPress={handleNextLevel}
              >
                <Text style={styles.nextButtonText}>Next Level</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.backToLevelsButton}
                onPress={() => {
                  setShowSuccess(false);
                  handleBackToLevels();
                }}
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
  lockedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  lockedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 20,
    marginBottom: 12,
  },
  lockedText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
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
    marginHorizontal: 16,
  },
  levelTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  stageName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  swapHint: {
    fontSize: 12,
    color: '#FF9800',
    marginTop: 2,
    fontWeight: '500',
  },
  changeCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  changeCountText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
    fontWeight: '600',
  },
  bottomActionsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 32,
    backgroundColor: 'rgba(240, 248, 255, 0.95)',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  bottomActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9800',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  actionButtonDisabled: {
    backgroundColor: '#ccc',
  },
  restartButton: {
    backgroundColor: '#2196F3',
  },
  bottomActionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  backButtonText: {
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
  successSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  rewards: {
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 24,
  },
  rewardText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  modalActions: {
    width: '100%',
    gap: 12,
  },
  nextButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  backToLevelsButton: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  backToLevelsButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
});