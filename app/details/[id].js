/**
 * Level Detail Screen - Individual level gameplay with swap functionality
 * Purpose: Play specific levels with full game mechanics including tile swapping
 * Features: Board generation, tile clearing, swap mode, progress tracking
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
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSwapMode, setIsSwapMode] = useState(false);
  const [selectedSwapTile, setSelectedSwapTile] = useState(null);

  const changeItems = gameData?.changeItems || 0;
  const stageName = STAGE_NAMES[level] || `Level ${level}`;

  useEffect(() => {
    if (level && level > 0) {
      try {
        const board = generateBoard(level);
        setCurrentBoard(board);
      } catch (error) {
        console.error('Failed to generate board:', error);
        Alert.alert('错误', '无法生成棋盘，请重试');
      }
    }
  }, [level]);

  const handleTilesClear = (clearedPositions) => {
    if (showSuccess) return;
    
    // Check if board is completely cleared
    const newTiles = [...currentBoard.tiles];
    clearedPositions.forEach(pos => {
      const index = pos.row * currentBoard.width + pos.col;
      newTiles[index] = 0;
    });
    
    const hasRemainingTiles = newTiles.some(tile => tile > 0);
    
    if (!hasRemainingTiles) {
      // Level completed!
      setShowSuccess(true);
      
      // Update progress
      const currentMaxLevel = gameData?.maxLevel || 0;
      const newMaxLevel = Math.max(currentMaxLevel, level);
      const newChangeItems = changeItems + 1; // Award 1 change item
      
      updateGameData({
        maxLevel: newMaxLevel,
        changeItems: newChangeItems,
        lastPlayedLevel: level
      });
    } else {
      // Update board with cleared tiles
      setCurrentBoard(prev => ({
        ...prev,
        tiles: newTiles
      }));
    }
  };

  const handleUseChange = () => {
    if (changeItems <= 0) return;
    
    // 进入交换模式
    setIsSwapMode(true);
    setSelectedSwapTile(null);
  };

  const handleSwapTileClick = (row, col, value) => {
    if (!isSwapMode || value === 0) return;
    
    const index = row * currentBoard.width + col;
    const clickedTile = { row, col, value, index };
    
    if (!selectedSwapTile) {
      // 选择第一个方块
      setSelectedSwapTile(clickedTile);
    } else if (selectedSwapTile.index === index) {
      // 取消选择（点击同一个方块）
      setSelectedSwapTile(null);
    } else {
      // 选择第二个方块，执行交换
      performSwap(selectedSwapTile, clickedTile);
    }
  };

  const performSwap = (tile1, tile2) => {
    if (!currentBoard) return;

    // 创建新棋盘，交换两个方块的值
    const newTiles = [...currentBoard.tiles];
    const temp = newTiles[tile1.index];
    newTiles[tile1.index] = newTiles[tile2.index];
    newTiles[tile2.index] = temp;

    // 更新棋盘
    const updatedBoard = { ...currentBoard, tiles: newTiles };
    setCurrentBoard(updatedBoard);

    // 消耗一个道具
    const newChangeItems = Math.max(0, changeItems - 1);
    updateGameData({ changeItems: newChangeItems });

    // 退出交换模式
    setIsSwapMode(false);
    setSelectedSwapTile(null);
  };

  const handleRestart = () => {
    if (isSwapMode) return;
    
    Alert.alert(
      '重新开始',
      '确定要重新开始这一关吗？',
      [
        { text: '取消', style: 'cancel' },
        { 
          text: '确定', 
          onPress: () => {
            try {
              const board = generateBoard(level, true); // Force new board
              setCurrentBoard(board);
              setShowSuccess(false);
            } catch (error) {
              console.error('Failed to restart level:', error);
              Alert.alert('错误', '无法重新开始，请重试');
            }
          }
        }
      ]
    );
  };

  const handleBackToLevels = () => {
    router.replace('/(tabs)/levels');
  };

  const handleNextLevel = () => {
    setShowSuccess(false);
    const nextLevel = level + 1;
    router.replace(`/details/${nextLevel}`);
  };

  const handleCancelSwap = () => {
    setIsSwapMode(false);
    setSelectedSwapTile(null);
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
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBackToLevels}
        >
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

      {/* Game Board */}
      <GameBoard 
        board={currentBoard}
        onTilesClear={handleTilesClear}
        onTileClick={handleTileClick}
          onTileClick={handleSwapTileClick}
          isSwapMode={isSwapMode}
          selectedSwapTile={selectedSwapTile}
      />

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        {isSwapMode ? (
          <TouchableOpacity 
            style={[styles.bottomActionButton, styles.cancelButton]}
            onPress={handleCancelSwap}
          >
            <Ionicons name="close" size={20} color="white" />
            <Text style={styles.bottomActionButtonText}>Cancel Swap</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity 
              style={[
                styles.bottomActionButton, 
                styles.changeButton,
                changeItems <= 0 && styles.actionButtonDisabled
              ]}
              onPress={handleUseChange}
              disabled={changeItems <= 0}
            >
              <Ionicons name="swap-horizontal" size={20} color="white" />
              <Text style={[
                styles.bottomActionButtonText,
                changeItems <= 0 && { color: '#ccc' }]}>
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
          </>
        )}
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
            <Text style={styles.successMessage}>
              Congratulations! You've completed {stageName}
            </Text>
            <Text style={styles.rewardText}>
              +1 Change Item Earned!
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalButton}
                onPress={handleBackToLevels}
              >
                <Text style={styles.modalButtonText}>Back to Levels</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.primaryModalButton]}
                onPress={handleNextLevel}
              >
                <Text style={[styles.modalButtonText, styles.primaryModalButtonText]}>
                  Next Level
                </Text>
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
    fontWeight: '600',
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
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9800',
    marginLeft: 4,
  },
  bottomActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  bottomActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  changeButton: {
    backgroundColor: '#FF9800',
  },
  restartButton: {
    backgroundColor: '#2196F3',
  },
  cancelButton: {
    backgroundColor: '#f44336',
  },
  actionButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  bottomActionButtonText: {
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 16,
    marginBottom: 12,
  },
  successMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  rewardText: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '600',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  primaryModalButton: {
    backgroundColor: '#4CAF50',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  primaryModalButtonText: {
    color: 'white',
  },
});