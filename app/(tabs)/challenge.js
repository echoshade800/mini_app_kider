/**
 * Challenge Mode Screen - 60-second timed gameplay with IQ scoring
 * Purpose: Fast-paced gameplay with continuous board generation and scoring
 * Features: Timer, score tracking, board refresh, item usage
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
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Dimensions, Animated } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { GameBoard } from '../components/GameBoard';
import { generateBoard } from '../utils/boardGenerator';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function ChallengeScreen() {
  const { gameData, updateGameData } = useGameStore();
  const [currentBoard, setCurrentBoard] = useState(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [currentScore, setCurrentScore] = useState(0);
  const [isGameActive, setIsGameActive] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [itemMode, setItemMode] = useState(null);
  const [selectedSwapTile, setSelectedSwapTile] = useState(null);
  
  const swapAnimationsRef = useRef(new Map());
  const fractalAnimationsRef = useRef(new Map());
  const [animationTrigger, setAnimationTrigger] = useState(0);
  const timerRef = useRef(null);

  const swapMasterItems = gameData?.swapMasterItems || 0;
  const fractalSplitItems = gameData?.fractalSplitItems || 0;
  const bestScore = gameData?.maxScore || 0;

  // Generate new challenge board
  const generateNewBoard = () => {
    try {
      const board = generateBoard(1, false, true); // 挑战模式
      setCurrentBoard(board);
    } catch (error) {
      console.error('Failed to generate challenge board:', error);
      Alert.alert('错误', '无法生成挑战棋盘，请重试');
    }
  };

  // Initialize game
  useEffect(() => {
    generateNewBoard();
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Timer logic
  useEffect(() => {
    if (isGameActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsGameActive(false);
            setShowResults(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isGameActive, timeLeft]);

  const handleStartGame = () => {
    setIsGameActive(true);
    setCurrentScore(0);
    setTimeLeft(60);
    generateNewBoard();
  };

  const handleTilesClear = (clearedPositions) => {
    if (!isGameActive) return;
    
    // Award points for successful clear
    const newScore = currentScore + 3;
    setCurrentScore(newScore);
    
    // Generate new board immediately
    setTimeout(() => {
      generateNewBoard();
    }, 500);
  };

  const handleGameEnd = () => {
    setIsGameActive(false);
    setShowResults(true);
    
    // Update best score
    const newBestScore = Math.max(bestScore, currentScore);
    updateGameData({
      maxScore: newBestScore
    });
  };

  const handleBackToHome = () => {
    router.replace('/(tabs)');
  };

  const handlePlayAgain = () => {
    setShowResults(false);
    setTimeLeft(60);
    setCurrentScore(0);
    generateNewBoard();
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
        setSelectedSwapTile(clickedTile);
      } else if (selectedSwapTile.index === index) {
        setSelectedSwapTile(null);
      } else {
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

    const cellSize = 27; // 固定方块大小
    
    const row1 = Math.floor(tile1.index / currentBoard.width);
    const col1 = tile1.index % currentBoard.width;
    const row2 = Math.floor(tile2.index / currentBoard.width);
    const col2 = tile2.index % currentBoard.width;
    
    const deltaX = (col2 - col1) * (cellSize + 4);
    const deltaY = (row2 - row1) * (cellSize + 4);
    
    const swapAnim1 = {
      translateX: new Animated.Value(0),
      translateY: new Animated.Value(0),
    };
    const swapAnim2 = {
      translateX: new Animated.Value(0),
      translateY: new Animated.Value(0),
    };
    
    swapAnimationsRef.current.set(tile1.index, swapAnim1);
    swapAnimationsRef.current.set(tile2.index, swapAnim2);
    setAnimationTrigger(prev => prev + 1);
    
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
      const newTiles = [...currentBoard.tiles];
      const temp = newTiles[tile1.index];
      newTiles[tile1.index] = newTiles[tile2.index];
      newTiles[tile2.index] = temp;

      const updatedBoard = { ...currentBoard, tiles: newTiles };
      setCurrentBoard(updatedBoard);
      
      swapAnimationsRef.current.delete(tile1.index);
      swapAnimationsRef.current.delete(tile2.index);
      setAnimationTrigger(prev => prev + 1);
      
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

    const generateSplitCombination = (num) => {
      const combinations = [];
      
      for (let a = 1; a <= 9; a++) {
        const b = num - a;
        if (b >= 1 && b <= 9 && a !== b) {
          combinations.push([a, b]);
        }
      }
      
      for (let a = 1; a <= 9; a++) {
        for (let b = a + 1; b <= 9; b++) {
          const c = num - a - b;
          if (c >= 1 && c <= 9 && c !== a && c !== b) {
            if (c > b) {
              combinations.push([a, b, c]);
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
    
    const sortedCombinations = possibleCombinations.sort((a, b) => b.length - a.length);
    const selectedCombination = sortedCombinations[Math.floor(Math.random() * Math.min(3, sortedCombinations.length))];
    
    const combinationSum = selectedCombination.reduce((sum, num) => sum + num, 0);
    if (combinationSum !== value) {
      console.error(`分解错误: ${value} != ${combinationSum}`, selectedCombination);
      Alert.alert('分解错误', '数字分解计算有误，请重试');
      return;
    }
    
    const splitCount = selectedCombination.length;

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
    
    newTiles[index] = 0;
    
    const selectedEmptyPositions = emptyPositions.slice(0, splitCount);
    selectedEmptyPositions.forEach((pos, i) => {
      newTiles[pos] = selectedCombination[i];
    });

    const cellSize = 27; // 固定方块大小
    
    selectedEmptyPositions.forEach((targetPos, i) => {
      const targetRow = Math.floor(targetPos / currentBoard.width);
      const targetCol = targetPos % currentBoard.width;
      
      const deltaX = (targetCol - col) * (cellSize + 4);
      const deltaY = (targetRow - row) * (cellSize + 4);
      
      const jumpAnim = {
        translateX: new Animated.Value(0),
        translateY: new Animated.Value(0),
        scale: new Animated.Value(0.3),
        opacity: new Animated.Value(1),
        value: selectedCombination[i],
      };
      
      const tempIndex = `temp_${index}_${i}`;
      fractalAnimationsRef.current.set(tempIndex, jumpAnim);
      
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

    const fractalAnim = {
      scale: new Animated.Value(1),
      opacity: new Animated.Value(1),
    };
    
    fractalAnimationsRef.current.set(index, fractalAnim);
    setAnimationTrigger(prev => prev + 1);
    
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
    
    Promise.all([explodePromise, ...animationPromises]).then(() => {
      setTimeout(() => {
        setCurrentBoard(prev => ({ ...prev, tiles: newTiles }));
      }, 100);
      
      fractalAnimationsRef.current.delete(index);
      setAnimationTrigger(prev => prev + 1);
      
      const newFractalSplitItems = Math.max(0, fractalSplitItems - 1);
      updateGameData({ fractalSplitItems: newFractalSplitItems });
      setItemMode(null);
      setSelectedSwapTile(null);
    });
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
          <Text style={styles.loadingText}>Loading challenge...</Text>
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
          onPress={handleBackToHome}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <View style={styles.gameInfo}>
          <View style={styles.timerContainer}>
            <Ionicons name="timer" size={20} color={timeLeft <= 10 ? "#f44336" : "#FF9800"} />
            <Text style={[
              styles.timerText,
              timeLeft <= 10 && styles.timerWarning
            ]}>
              {timeLeft}s
            </Text>
          </View>
          
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreLabel}>IQ</Text>
            <Text style={styles.scoreValue}>{currentScore}</Text>
          </View>
        </View>
        
        <View style={styles.itemsContainer}>
          <Ionicons name="shuffle" size={16} color="#2196F3" />
          <Text style={styles.itemText}>{swapMasterItems}</Text>
          <Ionicons name="git-branch" size={16} color="#9C27B0" style={styles.itemIcon} />
          <Text style={styles.itemText}>{fractalSplitItems}</Text>
        </View>
      </View>

      {/* Game Board */}
      {isGameActive ? (
        <GameBoard 
          board={currentBoard}
          onTilesClear={handleTilesClear}
          onTileClick={handleSwapTileClick}
          itemMode={itemMode}
          selectedSwapTile={selectedSwapTile}
          swapAnimations={swapAnimationsRef.current}
          fractalAnimations={fractalAnimationsRef.current}
          isChallenge={true}
        />
      ) : (
        <View style={styles.startContainer}>
          <Ionicons name="timer" size={80} color="#FF9800" />
          <Text style={styles.challengeTitle}>60-Second Challenge</Text>
          <Text style={styles.challengeDescription}>
            Clear as many rectangles as possible in 60 seconds!
            Each successful clear awards +3 IQ points.
          </Text>
          
          <View style={styles.bestScoreContainer}>
            <Text style={styles.bestScoreLabel}>Best IQ Score</Text>
            <Text style={styles.bestScoreValue}>{bestScore}</Text>
            <Text style={styles.bestScoreTitle}>{getIQTitle(bestScore)}</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.startButton}
            onPress={handleStartGame}
          >
            <Text style={styles.startButtonText}>Start Challenge</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Floating Action Buttons */}
      {isGameActive && (
        <View style={styles.floatingButtons}>
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
              size={20} 
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
              size={20} 
              color="white" 
            />
            {itemMode !== 'fractalSplit' && (
              <View style={styles.floatingButtonBadge}>
                <Text style={styles.floatingButtonBadgeText}>{fractalSplitItems}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Results Modal */}
      <Modal
        visible={showResults}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.resultsModal}>
            <Ionicons name="trophy" size={60} color="#FFD700" />
            <Text style={styles.resultsTitle}>Challenge Complete!</Text>
            
            <View style={styles.finalScoreContainer}>
              <Text style={styles.finalScoreLabel}>Final IQ Score</Text>
              <Text style={styles.finalScoreValue}>{currentScore}</Text>
              <Text style={styles.finalScoreTitle}>{getIQTitle(currentScore)}</Text>
            </View>
            
            {currentScore > bestScore && (
              <Text style={styles.newRecordText}>🎉 New Personal Best!</Text>
            )}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalButton}
                onPress={handleBackToHome}
              >
                <Text style={styles.modalButtonText}>Back to Home</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.primaryModalButton]}
                onPress={handlePlayAgain}
              >
                <Text style={[styles.modalButtonText, styles.primaryModalButtonText]}>
                  Play Again
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
  gameInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  timerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF9800',
    marginLeft: 6,
  },
  timerWarning: {
    color: '#f44336',
  },
  scoreContainer: {
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#666',
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  itemsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  itemIcon: {
    marginLeft: 8,
  },
  itemText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginLeft: 4,
  },
  startContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  challengeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 16,
  },
  challengeDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  bestScoreContainer: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bestScoreLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  bestScoreValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF9800',
    marginBottom: 4,
  },
  bestScoreTitle: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  startButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
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
    width: 50,
    height: 50,
    borderRadius: 25,
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
    fontSize: 10,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsModal: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    width: '80%',
    maxWidth: 350,
  },
  resultsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 20,
  },
  finalScoreContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  finalScoreLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  finalScoreValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FF9800',
    marginBottom: 4,
  },
  finalScoreTitle: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  newRecordText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
    marginBottom: 20,
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
    borderColor: '#FF9800',
  },
  primaryModalButton: {
    backgroundColor: '#FF9800',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF9800',
  },
  primaryModalButtonText: {
    color: 'white',
  },
});