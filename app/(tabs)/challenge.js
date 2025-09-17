/**
 * Challenge Mode Screen - Immersive full-board gameplay
 * Purpose: 60-second immersive challenge with full-screen board
 * Features: Full-screen mode, dense grid, no refill, board refresh on clear
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  Modal,
  Dimensions,
  Animated,
  PanResponder
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useGameStore } from '../store/gameStore';
import { GameBoard } from '../components/GameBoard';
import { generateBoard } from '../utils/boardGenerator';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const CHALLENGE_DURATION = 60; // 60 seconds

// Check if any rectangle sums to 10
function hasValidCombinations(tiles, width, height) {
  const size = width * height;
  
  for (let pos1 = 0; pos1 < size; pos1++) {
    if (tiles[pos1] === 0) continue;
    
    for (let pos2 = pos1; pos2 < size; pos2++) {
      if (tiles[pos2] === 0) continue;
      
      const row1 = Math.floor(pos1 / width);
      const col1 = pos1 % width;
      const row2 = Math.floor(pos2 / width);
      const col2 = pos2 % width;
      
      const minRow = Math.min(row1, row2);
      const maxRow = Math.max(row1, row2);
      const minCol = Math.min(col1, col2);
      const maxCol = Math.max(col1, col2);
      
      let sum = 0;
      for (let row = minRow; row <= maxRow; row++) {
        for (let col = minCol; col <= maxCol; col++) {
          const index = row * width + col;
          sum += tiles[index];
        }
      }
      
      if (sum === 10) {
        return true;
      }
    }
  }
  
  return false;
}

// Reshuffle remaining tiles
function reshuffleBoard(tiles, width, height) {
  const newTiles = [...tiles];
  const nonZeroValues = [];
  const nonZeroPositions = [];
  
  for (let i = 0; i < tiles.length; i++) {
    if (tiles[i] > 0) {
      nonZeroValues.push(tiles[i]);
      nonZeroPositions.push(i);
    }
  }
  
  // Shuffle values
  for (let i = nonZeroValues.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [nonZeroValues[i], nonZeroValues[j]] = [nonZeroValues[j], nonZeroValues[i]];
  }
  
  // Place shuffled values back
  for (let i = 0; i < nonZeroPositions.length; i++) {
    newTiles[nonZeroPositions[i]] = nonZeroValues[i];
  }
  
  return newTiles;
}

export default function ChallengeScreen() {
  const { gameData, updateGameData } = useGameStore();
  const [gameState, setGameState] = useState('ready'); // ready, playing, finished
  const [currentIQ, setCurrentIQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(CHALLENGE_DURATION);
  const [currentBoard, setCurrentBoard] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [reshuffleCount, setReshuffleCount] = useState(0);
  const [showNoSolution, setShowNoSolution] = useState(false);
  const [noSolutionMessage, setNoSolutionMessage] = useState('');
  
  // Selection state
  const [selection, setSelection] = useState(null);
  const [hoveredTiles, setHoveredTiles] = useState(new Set());
  
  // Animations
  const progressAnim = useRef(new Animated.Value(1)).current;
  const selectionOpacity = useRef(new Animated.Value(0)).current;
  const explosionScale = useRef(new Animated.Value(0)).current;
  const explosionOpacity = useRef(new Animated.Value(0)).current;
  const [explosionAnimation, setExplosionAnimation] = useState(null);
  
  const timerRef = useRef();

  const noSolutionMessages = [
    "Brain Freeze!",
    "Out of Juice!",
    "No Ten, No Win!",
    "All Out of Moves!"
  ];

  useEffect(() => {
    if (gameState === 'playing') {
      startTimer();
      startProgressAnimation();
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [gameState]);

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          endChallenge();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startProgressAnimation = () => {
    progressAnim.setValue(1);
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: CHALLENGE_DURATION * 1000,
      useNativeDriver: false,
    }).start();
  };

  const startChallenge = () => {
    setGameState('playing');
    setCurrentIQ(0);
    setTimeLeft(CHALLENGE_DURATION);
    setReshuffleCount(0);
    generateNewBoard();
  };

  const endChallenge = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setGameState('finished');
    
    // Update best score if improved
    const currentBest = gameData?.maxScore || 0;
    if (currentIQ > currentBest) {
      updateGameData({ maxScore: currentIQ });
    }
    
    setShowResults(true);
  };

  const generateNewBoard = () => {
    // 使用28关的棋盘配置（9x6布局）
    const board = generateBoard(28, true, true); // forceNewSeed=true, isChallengeMode=true
    setCurrentBoard(board);
    setReshuffleCount(0);
  };

  const checkForRescue = () => {
    if (!currentBoard || gameState !== 'playing') return;
    
    const { tiles, width, height } = currentBoard;
    
    if (!hasValidCombinations(tiles, width, height)) {
      if (reshuffleCount < 3) {
        // Auto reshuffle
        const newTiles = reshuffleBoard(tiles, width, height);
        const newBoard = { ...currentBoard, tiles: newTiles };
        
        if (hasValidCombinations(newTiles, width, height)) {
          setCurrentBoard(newBoard);
          setReshuffleCount(0);
        } else {
          setCurrentBoard(newBoard);
          setReshuffleCount(prev => prev + 1);
          
          if (reshuffleCount + 1 >= 3) {
            // Show no solution message
            const message = noSolutionMessages[Math.floor(Math.random() * noSolutionMessages.length)];
            setNoSolutionMessage(message);
            setShowNoSolution(true);
            
            setTimeout(() => {
              setShowNoSolution(false);
              generateNewBoard(); // Generate new full board
            }, 2000);
          }
        }
      }
    }
  };

  const handleTilesClear = (clearedPositions) => {
    if (gameState !== 'playing') return;
    
    // 每次消除获得3分IQ积分
    setCurrentIQ(prev => prev + 3);
    
    // 触感反馈
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      // 触感不可用，静默继续
    }
    
    // 更新棋盘，清除方块
    const newTiles = [...currentBoard.tiles];
    clearedPositions.forEach(pos => {
      const index = pos.row * currentBoard.width + pos.col;
      newTiles[index] = 0;
    });
    
    setCurrentBoard(prev => ({ ...prev, tiles: newTiles }));
    
    // 检查棋盘是否完全清空
    const hasRemainingTiles = newTiles.some(tile => tile > 0);
    if (!hasRemainingTiles) {
      // Board cleared, generate new full board
      setTimeout(() => {
        generateNewBoard();
      }, 1000);
    } else {
      // 延迟检查是否有有效组合
      setTimeout(() => {
        checkForRescue();
      }, 500);
    }
  };

  const handleReturn = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setShowResults(false);
    setGameState('ready');
    router.replace('/');
  };

  const handleAgain = () => {
    setShowResults(false);
    startChallenge();
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

  const handleBoardRefresh = (action) => {
    if (action === 'return') {
      // 救援选择返回主页
      handleReturn();
    } else if (typeof action === 'object') {
      // 重排后的棋盘
      setCurrentBoard(action);
    } else if (action === 'refresh') {
      // 棋盘全清，生成新棋盘
      generateNewBoard();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HUD */}
      <View style={styles.hud}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleReturn}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.hudCenter}>
          <Text style={styles.iqText}>IQ: {currentIQ}</Text>
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
          <Text style={styles.timeText}>{timeLeft}s</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => setShowSettings(true)}
        >
          <Ionicons name="settings" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Game Board */}
      {gameState === 'ready' && (
        <View style={styles.readyScreen}>
          <Text style={styles.readyTitle}>Challenge Mode</Text>
          <Text style={styles.readySubtitle}>60 seconds of intense puzzle action!</Text>
          <TouchableOpacity style={styles.startButton} onPress={startChallenge}>
            <Text style={styles.startButtonText}>START CHALLENGE</Text>
          </TouchableOpacity>
        </View>
      )}

      {gameState === 'playing' && currentBoard && (
        <GameBoard 
          board={currentBoard}
          onTilesClear={handleTilesClear}
          onBoardRefresh={handleBoardRefresh}
          disabled={gameState !== 'playing'}
          isChallenge={true}
          maxBoardHeight={screenHeight - 200} // 为顶部HUD和底部留空间
        />
      )}

      {/* No Solution Overlay */}
      {showNoSolution && (
        <View style={styles.noSolutionOverlay}>
          <Text style={styles.noSolutionText}>{noSolutionMessage}</Text>
        </View>
      )}

      {/* Results Modal */}
      <Modal visible={showResults} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.resultsModal}>
            <Text style={styles.resultsTitle}>Challenge Complete!</Text>
            <Text style={styles.finalIQ}>Final IQ: {currentIQ}</Text>
            <Text style={styles.iqTitle}>{getIQTitle(currentIQ)}</Text>
            
            {currentIQ > (gameData?.maxScore || 0) && (
              <Text style={styles.newRecord}>🎉 New Record!</Text>
            )}
            
            <View style={styles.resultsButtons}>
              <TouchableOpacity style={styles.againButton} onPress={handleAgain}>
                <Text style={styles.againButtonText}>AGAIN</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.returnButton} onPress={handleReturn}>
                <Text style={styles.returnButtonText}>RETURN</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={showSettings} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.settingsModal}>
            <Text style={styles.settingsTitle}>Challenge Settings</Text>
            <Text style={styles.settingsInfo}>
              • 60-second time limit{'\n'}
              • Dense grid layout{'\n'}
              • No tile refill{'\n'}
              • Board refreshes when cleared{'\n'}
              • 3 IQ points per clear
            </Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowSettings(false)}
            >
              <Text style={styles.closeButtonText}>CLOSE</Text>
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
    backgroundColor: '#1a1a2e',
  },
  hud: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  backButton: {
    padding: 8,
  },
  settingsButton: {
    padding: 8,
  },
  hudCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 20,
  },
  iqText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  progressContainer: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    marginBottom: 5,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  timeText: {
    color: '#fff',
    fontSize: 14,
  },
  readyScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  readyTitle: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  readySubtitle: {
    color: '#ccc',
    fontSize: 16,
    marginBottom: 40,
    textAlign: 'center',
  },
  startButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  gameArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noSolutionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noSolutionText: {
    color: '#ff6b6b',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsModal: {
    backgroundColor: '#2d2d44',
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    minWidth: 300,
  },
  resultsTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  finalIQ: {
    color: '#4CAF50',
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  iqTitle: {
    color: '#ccc',
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  newRecord: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  resultsButtons: {
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
  settingsModal: {
    backgroundColor: '#2d2d44',
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    minWidth: 300,
  },
  settingsTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  settingsInfo: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 25,
  },
  closeButton: {
    backgroundColor: '#666',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 20,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});