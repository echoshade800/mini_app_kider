/**
 * Level Detail Screen - Individual level gameplay
 * Purpose: Play a specific level with board generation and progress tracking
 * Extend: Add level-specific hints, time tracking, or move counting
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
import { STAGE_NAMES, getStageGroup } from '../utils/stageNames';

export default function LevelDetailScreen() {
  const { id } = useLocalSearchParams();
  const level = parseInt(id);
  
  const { gameData, updateGameData } = useGameStore();
  const [currentBoard, setCurrentBoard] = useState(null);
  const [swapMode, setSwapMode] = useState(false);
  const [firstSwapTile, setFirstSwapTile] = useState(null);
  const [showVictory, setShowVictory] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (level && !isNaN(level)) {
      generateNewBoard();
    }
  }, [level]);

  const generateNewBoard = () => {
    try {
      setIsLoading(true);
      const board = generateBoard(level);
      setCurrentBoard(board);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to generate board:', error);
      Alert.alert('错误', '无法生成棋盘，请重试');
      setIsLoading(false);
    }
  };

  const handleTilesClear = (clearedPositions) => {
    if (!currentBoard) return;
    
    // 创建新棋盘，清除指定位置的方块
    const newTiles = [...currentBoard.tiles];
    clearedPositions.forEach(({ row, col }) => {
      const index = row * currentBoard.width + col;
      newTiles[index] = 0;
    });
    
    const updatedBoard = { ...currentBoard, tiles: newTiles };
    setCurrentBoard(updatedBoard);
    
    // 检查是否所有数字方块都被消除
    const hasRemainingTiles = newTiles.some(tile => tile > 0);
    
    if (!hasRemainingTiles) {
      // 关卡完成
      setTimeout(() => {
        handleLevelComplete();
      }, 1000);
    }
  };

  const handleLevelComplete = () => {
    // 更新游戏数据
    const newMaxLevel = Math.max(gameData?.maxLevel || 0, level);
    const newChangeItems = (gameData?.changeItems || 0) + 1; // 完成关卡获得1个交换道具
    
    updateGameData({
      maxLevel: newMaxLevel,
      changeItems: newChangeItems,
      lastPlayedLevel: level
    });
    
    setShowVictory(true);
  };

  const handleNextLevel = () => {
    setShowVictory(false);
    const nextLevel = level + 1;
    router.replace(`/details/${nextLevel}`);
  };

  const handleRestart = () => {
    setShowVictory(false);
    generateNewBoard();
  };

  const handleBackToLevels = () => {
    router.replace('/(tabs)/levels');
  };

  const handleSwapModeToggle = () => {
    if (swapMode) {
      // 退出交换模式
      setSwapMode(false);
      setFirstSwapTile(null);
    } else {
      // 进入交换模式
      if ((gameData?.changeItems || 0) > 0) {
        setSwapMode(true);
        setFirstSwapTile(null);
      } else {
        Alert.alert('道具不足', '你没有交换道具了！完成关卡可以获得更多道具。');
      }
    }
  };

  const handleTileClick = (row, col) => {
    if (!swapMode || !currentBoard) return;
    
    const index = row * currentBoard.width + col;
    const value = currentBoard.tiles[index];
    
    // 只能选择有数字的方块
    if (value === 0) return;
    
    if (!firstSwapTile) {
      // 选择第一个方块
      setFirstSwapTile({ row, col, index, value });
    } else {
      // 选择第二个方块，执行交换
      if (firstSwapTile.index === index) {
        // 点击同一个方块，取消选择
        setFirstSwapTile(null);
        return;
      }
      
      // 执行交换
      const newTiles = [...currentBoard.tiles];
      newTiles[firstSwapTile.index] = value;
      newTiles[index] = firstSwapTile.value;
      
      setCurrentBoard({ ...currentBoard, tiles: newTiles });
      
      // 消耗道具
      updateGameData({
        changeItems: (gameData?.changeItems || 0) - 1
      });
      
      // 退出交换模式
      setSwapMode(false);
      setFirstSwapTile(null);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const stageName = STAGE_NAMES[level] || `Level ${level}`;
  const stageGroup = getStageGroup(level);
  const progress = Math.min(level / 200, 1); // 进度条基于200关

  return (
    <SafeAreaView style={styles.container}>
      {/* 顶部栏 */}
      <View style={styles.topBar}>
        {/* 左侧设置按钮 */}
        <TouchableOpacity style={styles.settingsButton}>
          <View style={styles.settingsIcon}>
            <Ionicons name="settings" size={24} color="#333" />
          </View>
        </TouchableOpacity>
        
        {/* 中间进度区域 */}
        <View style={styles.progressArea}>
          {/* 头像 */}
          <View style={styles.avatar}>
            <Text style={styles.avatarEmoji}>👶</Text>
          </View>
          
          {/* 进度条 */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
            {/* 阶段标签 */}
            <View style={styles.stageLabel}>
              <Text style={styles.stageLabelText}>{stageGroup}</Text>
            </View>
          </View>
        </View>
        
        {/* 右侧关卡数字 */}
        <View style={styles.levelNumber}>
          <Text style={styles.levelNumberText}>{level}</Text>
        </View>
      </View>

      {/* 游戏棋盘 */}
      {currentBoard && (
        <GameBoard 
          board={currentBoard}
          onTilesClear={handleTilesClear}
          onTileClick={handleTileClick}
          swapMode={swapMode}
          firstSwapTile={firstSwapTile}
        />
      )}

      {/* 底部交换按钮 */}
      <View style={styles.bottomControls}>
        <TouchableOpacity 
          style={[styles.swapButton, swapMode && styles.swapButtonActive]}
          onPress={handleSwapModeToggle}
        >
          <Ionicons 
            name="swap-horizontal" 
            size={24} 
            color={swapMode ? "white" : "#666"} 
          />
          <Text style={[styles.swapButtonText, swapMode && styles.swapButtonTextActive]}>
            交换 ({gameData?.changeItems || 0})
          </Text>
        </TouchableOpacity>
      </View>

      {/* 胜利弹窗 */}
      <Modal
        visible={showVictory}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.victoryModal}>
            <Ionicons name="trophy" size={60} color="#FFD700" />
            <Text style={styles.victoryTitle}>关卡完成！</Text>
            <Text style={styles.victorySubtitle}>{stageName}</Text>
            <Text style={styles.rewardText}>获得 1 个交换道具！</Text>
            
            <View style={styles.victoryButtons}>
              <TouchableOpacity 
                style={styles.restartButton}
                onPress={handleRestart}
              >
                <Text style={styles.restartButtonText}>重新开始</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.nextButton}
                onPress={handleNextLevel}
              >
                <Text style={styles.nextButtonText}>下一关</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={styles.backButton}
              onPress={handleBackToLevels}
            >
              <Text style={styles.backButtonText}>返回关卡选择</Text>
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
    backgroundColor: '#8FA8B2', // 灰蓝色背景
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  settingsButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#FFD700', // 黄色背景
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFB74D',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarEmoji: {
    fontSize: 20,
  },
  progressBarContainer: {
    flex: 1,
    position: 'relative',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  stageLabel: {
    position: 'absolute',
    right: 0,
    top: -25,
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stageLabelText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  levelNumber: {
    width: 50,
    alignItems: 'center',
  },
  levelNumberText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 30,
    left: 20,
  },
  swapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  swapButtonActive: {
    backgroundColor: '#FF9800',
  },
  swapButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  swapButtonTextActive: {
    color: 'white',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  victoryModal: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    width: '80%',
    maxWidth: 350,
  },
  victoryTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  victorySubtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  rewardText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
    marginBottom: 24,
  },
  victoryButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  restartButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  restartButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  backButtonText: {
    color: '#666',
    fontSize: 14,
  },
});