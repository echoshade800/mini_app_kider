/**
 * Level Detail Screen - Individual level gameplay with swap functionality
 * Purpose: Play specific levels with full game mechanics including tile swapping
 * Features: Board generation, tile clearing, swap mode, progress tracking
 */

import React, { useState, useEffect, useRef } from 'react';
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
import { Animated } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { UnifiedGameBoard } from '../components/UnifiedGameBoard';
import { generateBoard } from '../utils/boardGenerator';
import { STAGE_NAMES } from '../utils/stageNames';

export default function LevelDetailScreen() {
  const { id } = useLocalSearchParams();
  const level = parseInt(id);
  
  const { gameData, updateGameData } = useGameStore();
  const [currentBoard, setCurrentBoard] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [itemMode, setItemMode] = useState(null); // 'swapMaster' | 'fractalSplit' | null
  const [selectedSwapTile, setSelectedSwapTile] = useState(null);
  
  // 使用 useRef 来存储动画对象，避免重新渲染时丢失
  const swapAnimationsRef = useRef(new Map());
  const fractalAnimationsRef = useRef(new Map());
  const [animationTrigger, setAnimationTrigger] = useState(0); // 用于触发重新渲染

  const swapMasterItems = gameData?.swapMasterItems || 0;
  const fractalSplitItems = gameData?.fractalSplitItems || 0;
  const stageName = STAGE_NAMES[level] || `Level ${level}`;

  useEffect(() => {
    if (level && level > 0 && level <= 200) {
      try {
        console.log('🎮 Generating board for level:', level);
        const board = generateBoard(level);
        console.log('🎲 Generated board:', {
          level: board.level,
          tilesLength: board.tiles?.length,
          tileCount: board.tileCount,
          seed: board.seed
        });
        setCurrentBoard(board);
      } catch (error) {
        console.error('Failed to generate board:', error);
        // 生成一个简单的后备棋盘
        const fallbackBoard = {
          seed: `fallback_${level}`,
          tiles: [1, 9, 2, 8, 3, 7, 4, 6, 0, 0, 0, 0, 0, 0, 0, 0],
          level,
          tileCount: 16,
        };
        console.log('Using fallback board:', fallbackBoard);
        setCurrentBoard(fallbackBoard);
      }
    }
  }, [level]);

  const handleTilesClear = (clearedPositions) => {
    if (showSuccess) return;
    
    // Check if board is completely cleared
    const newTiles = [...currentBoard.tiles];
    clearedPositions.forEach(pos => {
      // 在统一布局中，需要根据行列计算索引
      // 这里简化处理，直接使用传入的位置信息
      const index = pos.row * Math.ceil(Math.sqrt(currentBoard.tiles.length)) + pos.col;
      newTiles[index] = 0;
    });
    
    const hasRemainingTiles = newTiles.some(tile => tile > 0);
    
    if (!hasRemainingTiles) {
      // Level completed!
      setShowSuccess(true);
      
      // Update progress
      const currentMaxLevel = gameData?.maxLevel || 0;
      const newMaxLevel = Math.max(currentMaxLevel, level);
      const newSwapMasterItems = swapMasterItems + 1; // Award 1 SwapMaster item
      const newFractalSplitItems = fractalSplitItems + 1; // Award 1 FractalSplit item
      
      updateGameData({
        maxLevel: newMaxLevel,
        swapMasterItems: newSwapMasterItems,
        fractalSplitItems: newFractalSplitItems,
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

  const handleUseSwapMaster = () => {
    if (swapMasterItems <= 0) return;
    
    setItemMode('swapMaster');
    setSelectedSwapTile(null);
  };

  const handleUseFractalSplit = () => {
    if (fractalSplitItems <= 0) return;
    
    setItemMode('fractalSplit');
    setSelectedSwapTile(null);
  };

  const handleSwapTileClick = (row, col, value) => {
    if (!itemMode || value === 0 || !currentBoard) return;
    
    // 简化索引计算
    const estimatedCols = Math.ceil(Math.sqrt(currentBoard.tiles.length));
    const index = row * estimatedCols + col;
    const clickedTile = { row, col, value, index };
    
    if (itemMode === 'swapMaster') {
      if (!selectedSwapTile) {
        // Select first tile
        setSelectedSwapTile(clickedTile);
      } else if (selectedSwapTile.index === index) {
        // Cancel selection (clicked same tile)
        setSelectedSwapTile(null);
      } else {
        // Select second tile and perform swap
        performSwap(selectedSwapTile, clickedTile);
      }
    } else if (itemMode === 'fractalSplit') {
      if (value >= 2) {
        performFractalSplit(clickedTile);
      } else {
        Alert.alert('无法分裂', '数字必须大于等于2才能进行分裂操作');
      }
    }
  };

  const performSwap = (tile1, tile2) => {
    if (!currentBoard) return;

    // 创建交换动画
    const swapAnim1 = {
      translateX: new Animated.Value(0),
      translateY: new Animated.Value(0),
    };
    const swapAnim2 = {
      translateX: new Animated.Value(0),
      translateY: new Animated.Value(0),
    };
    
    // 设置交换动画
    swapAnimationsRef.current.set(tile1.index, swapAnim1);
    swapAnimationsRef.current.set(tile2.index, swapAnim2);
    setAnimationTrigger(prev => prev + 1); // 触发重新渲染
    
    // 简化动画，不计算具体位移
    const deltaX = (tile2.col - tile1.col) * 40; // 估算位移
    const deltaY = (tile2.row - tile1.row) * 40;
    
    // 执行动画
    Animated.parallel([
      Animated.timing(swapAnim1.translateX, {
        toValue: deltaX,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(swapAnim1.translateY, {
        toValue: deltaY,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(swapAnim2.translateX, {
        toValue: -deltaX,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(swapAnim2.translateY, {
        toValue: -deltaY,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // 动画完成后更新数据并清除动画
      const newTiles = [...currentBoard.tiles];
      const temp = newTiles[tile1.index];
      newTiles[tile1.index] = newTiles[tile2.index];
      newTiles[tile2.index] = temp;

      const updatedBoard = { ...currentBoard, tiles: newTiles };
      setCurrentBoard(updatedBoard);
      
      // 清除动画状态
      swapAnimationsRef.current.delete(tile1.index);
      swapAnimationsRef.current.delete(tile2.index);
      setAnimationTrigger(prev => prev + 1);
      
      // 消耗道具并退出交换模式
      if (itemMode === 'swapMaster') {
        const newSwapMasterItems = Math.max(0, swapMasterItems - 1);
        updateGameData({ swapMasterItems: newSwapMasterItems });
      }
      
      setItemMode(null);
      setSelectedSwapTile(null);
    });
  };

  const performFractalSplit = (tile) => {
    if (!currentBoard) return;

    const { value, index, row, col } = tile;

    // 生成不同数字的分解方案，确保总和等于原数字
    const generateSplitCombination = (num) => {
      const combinations = [];
      
      // 2个不同数字的组合
      for (let a = 1; a <= 9; a++) {
        const b = num - a;
        if (b >= 1 && b <= 9 && a !== b) {
          combinations.push([a, b]);
        }
      }
      
      // 3个不同数字的组合
      for (let a = 1; a <= 9; a++) {
        for (let b = a + 1; b <= 9; b++) {
          const c = num - a - b;
          if (c >= 1 && c <= 9 && c !== a && c !== b) {
            // 确保c > b 以避免重复组合
            if (c > b) {
              combinations.push([a, b, c]);
            }
          }
        }
      }
      
      // 4个不同数字的组合
      for (let a = 1; a <= 9; a++) {
        for (let b = a + 1; b <= 9; b++) {
          for (let c = b + 1; c <= 9; c++) {
            const d = num - a - b - c;
            if (d >= 1 && d <= 9 && d !== a && d !== b && d !== c) {
              // 确保d > c 以避免重复组合
              if (d > c) {
                combinations.push([a, b, c, d]);
              }
            }
          }
        }
      }
      
      // 5个不同数字的组合
      for (let a = 1; a <= 9; a++) {
        for (let b = a + 1; b <= 9; b++) {
          for (let c = b + 1; c <= 9; c++) {
            for (let d = c + 1; d <= 9; d++) {
              const e = num - a - b - c - d;
              if (e >= 1 && e <= 9 && e !== a && e !== b && e !== c && e !== d) {
                if (e > d) {
                  combinations.push([a, b, c, d, e]);
                }
              }
            }
          }
        }
      }
      
      return combinations;
    };
    
    const possibleCombinations = generateSplitCombination(value);
    
    if (possibleCombinations.length === 0) {
      Alert.alert('无法分裂', '该数字无法分解为不同的数字组合');
      return;
    }
    
    // 随机选择一个组合，优先选择数字更多的组合
    const sortedCombinations = possibleCombinations.sort((a, b) => b.length - a.length);
    const selectedCombination = sortedCombinations[Math.floor(Math.random() * Math.min(3, sortedCombinations.length))];
    
    // 验证组合总和是否正确
    const combinationSum = selectedCombination.reduce((sum, num) => sum + num, 0);
    if (combinationSum !== value) {
      console.error(`分解错误: ${value} != ${combinationSum}`, selectedCombination);
      Alert.alert('分解错误', '数字分解计算有误，请重试');
      return;
    }
    
    const splitCount = selectedCombination.length;

    // 寻找足够的空位（需要splitCount个空位，因为原位置也会变空）
    const emptyPositions = [];
    for (let i = 0; i < currentBoard.tiles.length; i++) {
      if (currentBoard.tiles[i] === 0) {
        emptyPositions.push(i);
      }
    }

    if (emptyPositions.length < splitCount) {
      Alert.alert('空位不足', `需要${splitCount}个空位进行分裂，当前只有${emptyPositions.length}个空位`);
      return;
    }

    const newTiles = [...currentBoard.tiles];
    const animationPromises = [];
    
    // 原位置清空（因为原数字已经完全分解）
    newTiles[index] = 0;
    
    // 在空位放置所有分裂值
    const selectedEmptyPositions = emptyPositions.slice(0, splitCount);
    selectedEmptyPositions.forEach((pos, i) => {
      newTiles[pos] = selectedCombination[i];
    });

    // 创建分裂动画 - 显示正确的分解数值
    selectedEmptyPositions.forEach((targetPos, i) => {
      // 简化动画计算
      const deltaX = Math.random() * 100 - 50; // 随机位移
      const deltaY = Math.random() * 100 - 50;
      
      // 创建跳跃动画
      const jumpAnim = {
        translateX: new Animated.Value(0),
        translateY: new Animated.Value(0),
        scale: new Animated.Value(0.3),
        opacity: new Animated.Value(1),
        value: selectedCombination[i], // 存储对应的分解数值
      };
      
      // 设置临时动画状态
      const tempIndex = `temp_${index}_${i}`;
      fractalAnimationsRef.current.set(tempIndex, jumpAnim);
      
      // 执行跳跃动画
      const jumpPromise = new Promise((resolve) => {
        Animated.parallel([
          Animated.timing(jumpAnim.translateX, { toValue: deltaX, duration: 500, useNativeDriver: true }),
          Animated.timing(jumpAnim.translateY, { toValue: deltaY, duration: 500, useNativeDriver: true }),
          Animated.timing(jumpAnim.scale, { toValue: 1, duration: 500, useNativeDriver: true }),
        ]).start(() => {
          fractalAnimationsRef.current.delete(tempIndex);
          resolve();
        });
      });
      
      animationPromises.push(jumpPromise);
    });

    // 创建原位置爆裂动画（原数字消失）
    const fractalAnim = {
      scale: new Animated.Value(1),
      opacity: new Animated.Value(1),
    };
    
    // 设置分裂动画
    fractalAnimationsRef.current.set(index, fractalAnim);
    setAnimationTrigger(prev => prev + 1);
    
    // 同时执行爆裂动画和跳跃动画
    const explodePromise = new Promise((resolve) => {
      Animated.parallel([
        Animated.timing(fractalAnim.scale, {
          toValue: 2,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(fractalAnim.opacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start(resolve);
    });
    
    // 等待所有动画完成
    Promise.all([explodePromise, ...animationPromises]).then(() => {
      // 所有动画完成后更新棋盘
      setTimeout(() => {
        setCurrentBoard(prev => ({ ...prev, tiles: newTiles }));
      }, 100);
      
      // 清除动画状态
      fractalAnimationsRef.current.delete(index);
      setAnimationTrigger(prev => prev + 1);
      
      // 消耗道具并退出分裂模式
      const newFractalSplitItems = Math.max(0, fractalSplitItems - 1);
      updateGameData({ fractalSplitItems: newFractalSplitItems });
      setItemMode(null);
      setSelectedSwapTile(null);
    });
  };

  const handleRestart = () => {
    if (itemMode) return;
    
    Alert.alert(
      '重新开始',
      '确定要重新开始这一关吗？',
      [
        { text: '取消', style: 'cancel' },
        { 
          text: '确定', 
          onPress: () => {
            try {
              const board = generateBoard(level);
              setCurrentBoard(board);
              setShowSuccess(false);
            } catch (error) {
              console.error('Failed to restart level:', error);
              // 使用后备棋盘
              const fallbackBoard = {
                seed: `restart_${level}`,
                tiles: [1, 9, 2, 8, 3, 7, 4, 6, 0, 0, 0, 0, 0, 0, 0, 0],
                level,
                tileCount: 16,
              };
              setCurrentBoard(fallbackBoard);
            }
          }
        }
      ]
    );
  };

  const handleBackToLevels = () => {
    router.replace('/(tabs)/levels');
  };

  const handleBoardRefresh = (action) => {
    // 简化处理，不需要复杂的刷新逻辑
    console.log('Board refresh action:', action);
  };

  const handleNextLevel = () => {
    setShowSuccess(false);
    const nextLevel = level + 1;
    router.replace(`/details/${nextLevel}`);
  };

  const handleCancelSwap = () => {
    setItemMode(null);
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
        <View style={styles.itemsContainer}>
          <Ionicons name="shuffle" size={20} color="#2196F3" style={styles.itemIcon} />
          <Text style={styles.itemText}>{swapMasterItems}</Text>
          <Ionicons name="git-branch" size={20} color="#9C27B0" style={styles.itemIcon} />
          <Text style={styles.itemText}>{fractalSplitItems}</Text>
        </View>
      </View>

      {/* Game Board */}
      <UnifiedGameBoard 
        board={currentBoard}
        onTilesClear={handleTilesClear}
        onTileClick={handleSwapTileClick}
        itemMode={itemMode}
        selectedSwapTile={selectedSwapTile}
        swapAnimations={swapAnimationsRef.current}
        fractalAnimations={fractalAnimationsRef.current}
        disabled={false}
        containerHeight={600}
      />

      {/* 浮动道具按钮 */}
      <View style={[styles.floatingButtons, { position: 'absolute', bottom: 60, left: 0, right: 0, zIndex: 1000 }]}>
        <TouchableOpacity 
          style={[
            styles.floatingButton,
            itemMode === 'swapMaster' ? styles.cancelButton : styles.swapMasterButton,
            swapMasterItems <= 0 && itemMode !== 'swapMaster' && styles.floatingButtonDisabled
          ]}
          onPress={itemMode === 'swapMaster' ? handleCancelSwap : handleUseSwapMaster}
          disabled={swapMasterItems <= 0 && itemMode !== 'swapMaster'}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={itemMode === 'swapMaster' ? "close" : "shuffle"} 
            size={24} 
            color="white" 
          />
          {itemMode !== 'swapMaster' && (
            <View style={styles.floatingButtonBadge}>
              <Text style={styles.floatingButtonBadgeText}>{swapMasterItems}</Text>
            </View>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.floatingButton,
            itemMode === 'fractalSplit' ? styles.cancelButton : styles.fractalSplitButton,
            fractalSplitItems <= 0 && itemMode !== 'fractalSplit' && styles.floatingButtonDisabled
          ]}
          onPress={itemMode === 'fractalSplit' ? handleCancelSwap : handleUseFractalSplit}
          disabled={fractalSplitItems <= 0 && itemMode !== 'fractalSplit'}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={itemMode === 'fractalSplit' ? "close" : "git-branch"} 
            size={24} 
            color="white" 
          />
          {itemMode !== 'fractalSplit' && (
            <View style={styles.floatingButtonBadge}>
              <Text style={styles.floatingButtonBadgeText}>{fractalSplitItems}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* 成功弹窗 */}
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
              +1 SwapMaster & +1 FractalSplit Earned!
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
  itemsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  itemIcon: {
    marginLeft: 0,
  },
  itemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginLeft: 4,
    marginRight: 8,
  },
  floatingButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  floatingButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    position: 'relative',
  },
  swapMasterButton: {
    backgroundColor: '#2196F3',
  },
  fractalSplitButton: {
    backgroundColor: '#9C27B0',
  },
  cancelButton: {
    backgroundColor: '#f44336',
  },
  floatingButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  floatingButtonBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#f44336',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  floatingButtonBadgeText: {
    color: 'white',
    fontSize: 12,
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