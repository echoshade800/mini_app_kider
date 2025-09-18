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
  Modal,
  Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Dimensions, Animated } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { GameBoard } from '../components/GameBoard';
import { generateBoard } from '../utils/boardGenerator';
import { getLevelGridConfig } from '../utils/boardLayout';
import { STAGE_NAMES } from '../utils/stageNames';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function LevelDetailScreen() {
  const { id } = useLocalSearchParams();
  const level = parseInt(id);
  
  const { gameData, updateGameData } = useGameStore();
  const [currentBoard, setCurrentBoard] = useState(null);
  const [gameState, setGameState] = useState('ready'); // ready, playing, finished
  const [currentIQ, setCurrentIQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [itemMode, setItemMode] = useState(null); // 'swapMaster' | 'fractalSplit' | null
  const [selectedSwapTile, setSelectedSwapTile] = useState(null);
  const [levelConfig, setLevelConfig] = useState(null);
  
  // 使用 useRef 来存储动画对象，避免重新渲染时丢失
  const swapAnimationsRef = useRef(new Map());
  const fractalAnimationsRef = useRef(new Map());
  const [animationTrigger, setAnimationTrigger] = useState(0); // 用于触发重新渲染
  
  // 计时器相关
  const timerRef = useRef();
  const progressAnim = useRef(new Animated.Value(1)).current;

  const swapMasterItems = gameData?.swapMasterItems || 0;
  const fractalSplitItems = gameData?.fractalSplitItems || 0;
  const stageName = STAGE_NAMES[level] || `Level ${level}`;

  useEffect(() => {
    if (level && level > 0 && level <= 200) {
      try {
        const config = getLevelGridConfig(level);
        setLevelConfig(config);
        setTimeLeft(config.timeLimit);
        const board = generateBoard(level);
        setCurrentBoard(board);
      } catch (error) {
        console.error('Failed to generate board:', error);
        Alert.alert('错误', '无法生成棋盘，请重试');
      }
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [level]);

  const startGame = () => {
    setGameState('playing');
    setCurrentIQ(0);
    if (levelConfig) {
      setTimeLeft(levelConfig.timeLimit);
      startTimer();
      startProgressAnimation();
    }
  };

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startProgressAnimation = () => {
    if (!levelConfig) return;
    progressAnim.setValue(1);
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: levelConfig.timeLimit * 1000,
      useNativeDriver: false,
    }).start();
  };

  const endGame = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setGameState('finished');
    setShowSuccess(true);
    
    // 更新最佳成绩
    const currentBest = gameData?.maxScore || 0;
    if (currentIQ > currentBest) {
      updateGameData({ maxScore: currentIQ });
    }
  };

  const handleTilesClear = (clearedPositions) => {
    if (gameState !== 'playing') return;
    
    // 计算IQ积分：每次消除获得3分
    setCurrentIQ(prev => prev + 3);
    
    // Check if board is completely cleared
    const newTiles = [...currentBoard.tiles];
    clearedPositions.forEach(pos => {
      const index = pos.row * currentBoard.width + pos.col;
      newTiles[index] = 0;
    });
    
    const hasRemainingTiles = newTiles.some(tile => tile > 0);
    
    if (!hasRemainingTiles) {
      // 棋盘全清，生成新棋盘继续游戏
      setTimeout(() => {
        try {
          const board = generateBoard(level, true, false);
          setCurrentBoard(board);
        } catch (error) {
          console.error('Failed to generate new board:', error);
        }
      }, 800);
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
    if (!itemMode || value === 0) return;
    
    const index = row * currentBoard.width + col;
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

    // 计算单元格大小
    const cellSize = Math.min(
      (screenWidth - 80) / currentBoard.width, 
      (screenHeight - 300) / currentBoard.height,
      50
    );
    
    // 计算两个方块的位置
    const row1 = Math.floor(tile1.index / currentBoard.width);
    const col1 = tile1.index % currentBoard.width;
    const row2 = Math.floor(tile2.index / currentBoard.width);
    const col2 = tile2.index % currentBoard.width;
    
    const deltaX = (col2 - col1) * cellSize;
    const deltaY = (row2 - row1) * cellSize;
    
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

    const { value, index } = tile;
    const row = Math.floor(index / currentBoard.width);
    const col = index % currentBoard.width;

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
    const cellSize = Math.min(
      (screenWidth - 80) / currentBoard.width, 
      (screenHeight - 300) / currentBoard.height,
      35
    );
    
    selectedEmptyPositions.forEach((targetPos, i) => {
      const targetRow = Math.floor(targetPos / currentBoard.width);
      const targetCol = targetPos % currentBoard.width;
      
      // 计算跳跃距离
      const deltaX = (targetCol - col) * cellSize;
      const deltaY = (targetRow - row) * cellSize;
      
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
              const board = generateBoard(level, true, false, screenWidth, screenHeight); // Force new board
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

  const handleBoardRefresh = (action) => {
    if (action === 'return') {
      // 救援选择返回主页
      handleBackToLevels();
    } else if (typeof action === 'object') {
      // 重排后的棋盘
      setCurrentBoard(action);
    }
  };

  const handleNextLevel = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setShowSuccess(false);
    const nextLevel = level + 1;
    router.replace(`/details/${nextLevel}`);
  };

  const handleCancelSwap = () => {
    setItemMode(null);
    setSelectedSwapTile(null);
  };

  const getIQTitle = (iq) => {
    if (iq >= 145) return 'Cosmic Genius';
    if (iq >= 130) return 'Puzzle Master';
    if (iq >= 115) return 'Rising Star';
    if (iq >= 100) return 'Everyday Scholar';
    if (iq >= 85) return 'Hardworking Student';
    if (iq >= 70) return 'Slow but Steady';
    if (iq >= 65) return 'Little Explorer';
    if (iq >= 55) return 'Learning Hatchling';
    if (iq >= 40) return 'Tiny Adventurer';
    return 'Newborn Dreamer';
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
      <View style={styles.header} pointerEvents="box-none">
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBackToLevels}
          pointerEvents="auto"
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.iqText}>IQ: {currentIQ}</Text>
          {gameState === 'playing' && (
            <View style={styles.progressContainer}>
              <Animated.View 
                style={[
                  styles.progressBar,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%']
                    })
                  }
                ]} 
              />
            </View>
          )}
          <Text style={styles.timeText}>{timeLeft}s</Text>
        </View>
        
        <View style={styles.itemsContainer}>
          <Ionicons name="shuffle" size={20} color="#2196F3" style={styles.itemIcon} />
          <Text style={styles.itemText}>{swapMasterItems}</Text>
          <Ionicons name="git-branch" size={20} color="#9C27B0" style={styles.itemIcon} />
          <Text style={styles.itemText}>{fractalSplitItems}</Text>
        </View>
      </View>
      
      {/* Ready Overlay */}
      {gameState === 'ready' && (
        <View style={styles.readyOverlay}>
          <View style={styles.readyContent}>
            <Text style={styles.readyTitle}>{stageName}</Text>
            <Text style={styles.readySubtitle}>Time Limit: {levelConfig?.timeLimit || 60}s</Text>
            <TouchableOpacity style={styles.startButton} onPress={startGame}>
              <Text style={styles.startButtonText}>START</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Game Board */}
      <GameBoard 
        board={currentBoard}
        onTilesClear={handleTilesClear}
        onBoardRefresh={handleBoardRefresh}
        onTileClick={handleSwapTileClick}
        itemMode={itemMode}
        selectedSwapTile={selectedSwapTile}
        swapAnimations={swapAnimationsRef.current}
        fractalAnimations={fractalAnimationsRef.current}
        disabled={gameState !== 'playing'}
        availableWidth={screenWidth - 40}
        availableHeight={screenHeight - 200}
      />

      {/* Floating Action Buttons */}
      <View style={styles.floatingButtons}>
        {/* SwapMaster Button */}
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
        
        {/* FractalSplit Button */}
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

      {/* Success Modal */}
      <Modal
        visible={showSuccess}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModal}>
            <Ionicons name="timer" size={60} color="#4CAF50" />
            <Text style={styles.successTitle}>Time's Up!</Text>
            <Text style={styles.finalIQ}>Final IQ: {currentIQ}</Text>
            <Text style={styles.iqTitle}>{getIQTitle(currentIQ)}</Text>
            
            {currentIQ > (gameData?.maxScore || 0) && (
              <Text style={styles.newRecord}>🎉 New Record!</Text>
            )}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.againButton}
                onPress={() => {
                  setShowSuccess(false);
                  handleRestart();
                }}
              >
                <Text style={styles.againButtonText}>AGAIN</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.returnButton}
                onPress={handleBackToLevels}
              >
                <Text style={styles.returnButtonText}>BACK</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.nextButton}
                onPress={handleNextLevel}
              >
                <Text style={styles.nextButtonText}>NEXT</Text>
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
    paddingTop: 50,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    zIndex: 1000,
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 20,
  },
  iqText: {
    color: '#333',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  progressContainer: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 3,
    marginBottom: 5,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  timeText: {
    color: '#333',
    fontSize: 14,
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
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    elevation: 1000,
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 16,
    marginBottom: 12,
  },
  finalIQ: {
    color: '#4CAF50',
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  iqTitle: {
    color: '#666',
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  newRecord: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 15,
  },
  againButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 20,
  },
  againButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  returnButton: {
    backgroundColor: '#666',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 20,
  },
  returnButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  nextButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 20,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});