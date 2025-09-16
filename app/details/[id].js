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
  const [showSwapTutorial, setShowSwapTutorial] = useState(false);
  const [clearedTiles, setClearedTiles] = useState(new Set());
  const [swapMode, setSwapMode] = useState(false);
  const [firstSwapTile, setFirstSwapTile] = useState(null);

  useEffect(() => {
    loadLevel();
  }, [level]);

  const loadLevel = () => {
    const board = generateBoard(level, true); // 强制生成新的棋盘
    setCurrentBoard(board);
    setClearedTiles(new Set());
    setSwapMode(false);
    setFirstSwapTile(null);
  };

  const handleTileClick = (row, col) => {
    if (!swapMode || !currentBoard) return;

    const index = row * currentBoard.width + col;
    const tileValue = currentBoard.tiles[index];
    
    // 只能点击有数字的方块
    if (tileValue === 0) return;

    if (!firstSwapTile) {
      // 选择第一个方块
      setFirstSwapTile({ row, col, index, value: tileValue });
    } else {
      // 选择第二个方块，执行交换
      if (firstSwapTile.index === index) {
        // 点击同一个方块，取消选择
        setFirstSwapTile(null);
        return;
      }

      // 执行交换
      const newTiles = [...currentBoard.tiles];
      newTiles[firstSwapTile.index] = tileValue;
      newTiles[index] = firstSwapTile.value;

      const updatedBoard = { ...currentBoard, tiles: newTiles };
      setCurrentBoard(updatedBoard);

      // 重置交换状态
      setSwapMode(false);
      setFirstSwapTile(null);

    }
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
        'You need Change items to swap tile positions. Complete more levels to earn items!',
        [{ text: 'OK' }]
      );
      return;
    }

    // 检查是否是第一次使用交换道具
    const hasUsedSwapBefore = gameData?.hasUsedSwapBefore || false;
    
    if (!hasUsedSwapBefore) {
      // 第一次使用，显示教程
      setShowSwapTutorial(true);
    } else {
      // 非第一次使用，直接进入交换模式
      updateGameData({ changeItems: currentItems - 1 });
      setSwapMode(true);
      setFirstSwapTile(null);
    }
  };

  const handleTutorialConfirm = () => {
    const currentItems = gameData?.changeItems || 0;
    updateGameData({ 
      changeItems: currentItems - 1,
      hasUsedSwapBefore: true 
    });
    setShowSwapTutorial(false);
    setSwapMode(true);
    setFirstSwapTile(null);
  };

  const handleRestart = () => {
    Alert.alert(
      'Reset Level',
      'Are you sure you want to restart this level?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: () => {
            loadLevel(); // 重新生成棋盘
          }
        }
      ]
    );
  };

  const handleNextLevel = () => {
    setShowSuccess(false);
    router.replace(`/details/${level + 1}`);
  };

  const handleBackToLevels = () => {
    router.replace('/(tabs)');
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
          onPress={() => router.replace('/(tabs)')}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.levelTitle}>Level {level}</Text>
          <Text style={styles.stageName} numberOfLines={1}>
            {levelInfo.stageName}
          </Text>
        </View>
        
        <View style={styles.headerRight}>
          <View style={styles.changeCounter}>
            <Ionicons name="swap-horizontal" size={16} color="#666" />
            <Text style={styles.changeCountText}>{changeItems}</Text>
          </View>
        </View>
      </View>


      {/* Game Board */}
      <View style={styles.gameContainer}>
        <GameBoard 
          board={currentBoard}
          onTilesClear={handleTilesClear}
          onTileClick={handleTileClick}
          swapMode={swapMode}
          firstSwapTile={firstSwapTile}
        />
      </View>

      {/* Change Button - Left Bottom */}
      <TouchableOpacity 
        style={[
          styles.itemButton,
          changeItems <= 0 && styles.changeButtonDisabled
        ]}
        onPress={handleUseChange}
        activeOpacity={0.7}
        disabled={changeItems <= 0}
      >
        <Ionicons 
          name="swap-horizontal" 
          size={24} 
          color={changeItems <= 0 ? "#999" : "white"} 
        />
      </TouchableOpacity>

      {/* Reset Button - Right Bottom */}
      <TouchableOpacity 
        style={[styles.resetButton, swapMode && styles.resetButtonDisabled]}
        onPress={handleRestart}
        activeOpacity={0.7}
        disabled={swapMode}
      >
        <Ionicons name="refresh" size={24} color="white" />
      </TouchableOpacity>

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
              <Text style={styles.rewardText}>+1 Change Item Earned!</Text>
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

      {/* Swap Tutorial Modal */}
      <Modal
        visible={showSwapTutorial}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.tutorialModal}>
            <Ionicons name="swap-horizontal" size={60} color="#FF9800" />
            <Text style={styles.tutorialTitle}>How to Use Change Item</Text>
            
            <View style={styles.tutorialSteps}>
              <View style={styles.tutorialStep}>
                <Text style={styles.stepNumber}>1</Text>
                <Text style={styles.stepText}>All number tiles show orange dashed borders and shake</Text>
              </View>
              
              <View style={styles.tutorialStep}>
                <Text style={styles.stepNumber}>2</Text>
                <Text style={styles.stepText}>Tap the first tile to swap (shows green highlight)</Text>
              </View>
              
              <View style={styles.tutorialStep}>
                <Text style={styles.stepNumber}>3</Text>
                <Text style={styles.stepText}>Tap the second tile to complete the swap</Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.tutorialButton}
              onPress={handleTutorialConfirm}
            >
              <Text style={styles.tutorialButtonText}>Start Swapping</Text>
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
  headerRight: {
    alignItems: 'flex-end',
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
  gameContainer: {
    flex: 1,
  },
  itemButton: {
    position: 'absolute',
    bottom: 30,
    left: 20,
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
    zIndex: 10,
  },
  changeButtonDisabled: {
    backgroundColor: '#ccc',
  },
  changeButtonTextDisabled: {
    color: '#999',
  },
  resetButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: '#2196F3',
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
    zIndex: 10,
  },
  resetButtonDisabled: {
    backgroundColor: '#ccc',
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
  tutorialModal: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    width: '85%',
    maxWidth: 400,
  },
  tutorialTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  tutorialSteps: {
    alignSelf: 'stretch',
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
    backgroundColor: '#FF9800',
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 24,
    marginRight: 12,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  tutorialButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
  },
  tutorialButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});