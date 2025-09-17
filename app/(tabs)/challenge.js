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

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const CHALLENGE_DURATION = 60; // 60 seconds

// Generate dense board for challenge mode
function generateChallengeBoard() {
  // Calculate optimal grid size for 70-85% screen width
  const boardWidth = screenWidth * 0.8;
  const cellSize = Math.min(boardWidth / 18, 35); // Target 16-20 columns
  const cols = Math.floor(boardWidth / cellSize);
  const rows = Math.floor((screenHeight * 0.6) / cellSize); // Use 60% of screen height
  
  const size = cols * rows;
  const tiles = new Array(size);
  
  // High difficulty distribution (like level 130+)
  const highFreqNumbers = [5, 6, 7, 8, 9]; // 70% probability
  const lowFreqNumbers = [1, 2, 3, 4];     // 30% probability
  
  // Fill board with scattered target pairs and interference
  const targetPairs = [[1, 9], [2, 8], [3, 7], [4, 6], [5, 5]];
  const guaranteedPairs = Math.floor(size * 0.25); // 25% guaranteed solvable pairs
  
  // Place guaranteed pairs scattered across board
  const placedPositions = new Set();
  for (let i = 0; i < guaranteedPairs; i++) {
    const pair = targetPairs[Math.floor(Math.random() * targetPairs.length)];
    const [val1, val2] = pair;
    
    // Find two random positions
    let pos1, pos2;
    do {
      pos1 = Math.floor(Math.random() * size);
    } while (placedPositions.has(pos1));
    
    do {
      pos2 = Math.floor(Math.random() * size);
    } while (placedPositions.has(pos2) || pos2 === pos1);
    
    tiles[pos1] = val1;
    tiles[pos2] = val2;
    placedPositions.add(pos1);
    placedPositions.add(pos2);
  }
  
  // Fill remaining positions with weighted random numbers
  for (let i = 0; i < size; i++) {
    if (!placedPositions.has(i)) {
      if (Math.random() < 0.7) {
        tiles[i] = highFreqNumbers[Math.floor(Math.random() * highFreqNumbers.length)];
      } else {
        tiles[i] = lowFreqNumbers[Math.floor(Math.random() * lowFreqNumbers.length)];
      }
    }
  }
  
  return {
    width: cols,
    height: rows,
    tiles,
    cellSize
  };
}

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
    const board = generateChallengeBoard();
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
    
    // Award 3 IQ points per clear
    setCurrentIQ(prev => prev + 3);
    
    // Haptic feedback
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      // Haptics not available, continue silently
    }
    
    // Update board with cleared tiles
    const newTiles = [...currentBoard.tiles];
    clearedPositions.forEach(pos => {
      const index = pos.row * currentBoard.width + pos.col;
      newTiles[index] = 0;
    });
    
    setCurrentBoard(prev => ({ ...prev, tiles: newTiles }));
    
    // Check if board is completely cleared
    const hasRemainingTiles = newTiles.some(tile => tile > 0);
    if (!hasRemainingTiles) {
      // Board cleared, generate new full board
      setTimeout(() => {
        generateNewBoard();
      }, 1000);
    } else {
      // Check for valid combinations after a delay
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

  // Pan responder for board interaction
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => gameState === 'playing' && currentBoard,
    onMoveShouldSetPanResponder: () => gameState === 'playing' && currentBoard,

    onPanResponderGrant: (evt) => {
      if (!currentBoard) return;
      
      const { pageX, pageY } = evt.nativeEvent;
      const boardContainer = getBoardContainer();
      
      if (pageX < boardContainer.left || pageX > boardContainer.right ||
          pageY < boardContainer.top || pageY > boardContainer.bottom) {
        return;
      }
      
      const relativeX = pageX - boardContainer.left;
      const relativeY = pageY - boardContainer.top;
      
      const startCol = Math.floor(relativeX / currentBoard.cellSize);
      const startRow = Math.floor(relativeY / currentBoard.cellSize);
      
      if (startRow >= 0 && startRow < currentBoard.height && 
          startCol >= 0 && startCol < currentBoard.width) {
        setSelection({
          startRow,
          startCol,
          endRow: startRow,
          endCol: startCol,
        });
        
        Animated.timing(selectionOpacity, {
          toValue: 0.6,
          duration: 80,
          useNativeDriver: false,
        }).start();
      }
    },

    onPanResponderMove: (evt) => {
      if (!selection || !currentBoard) return;
      
      const { pageX, pageY } = evt.nativeEvent;
      const boardContainer = getBoardContainer();
      
      if (pageX < boardContainer.left || pageX > boardContainer.right ||
          pageY < boardContainer.top || pageY > boardContainer.bottom) {
        return;
      }
      
      const relativeX = pageX - boardContainer.left;
      const relativeY = pageY - boardContainer.top;
      
      const endCol = Math.floor(relativeX / currentBoard.cellSize);
      const endRow = Math.floor(relativeY / currentBoard.cellSize);
      
      if (endRow >= 0 && endRow < currentBoard.height && 
          endCol >= 0 && endCol < currentBoard.width) {
        setSelection(prev => ({
          ...prev,
          endRow,
          endCol,
        }));
      }
    },

    onPanResponderRelease: () => {
      if (selection && currentBoard) {
        handleSelectionComplete();
      }
      
      Animated.timing(selectionOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start(() => {
        setSelection(null);
      });
    },
  });

  const getBoardContainer = () => {
    if (!currentBoard) return { left: 0, top: 0, right: 0, bottom: 0 };
    
    const boardWidth = currentBoard.width * currentBoard.cellSize;
    const boardHeight = currentBoard.height * currentBoard.cellSize;
    const left = (screenWidth - boardWidth) / 2;
    const top = 120; // Below HUD
    
    return {
      left,
      top,
      right: left + boardWidth,
      bottom: top + boardHeight
    };
  };

  const getSelectedTiles = () => {
    if (!selection || !currentBoard) return [];
    
    const { startRow, startCol, endRow, endCol } = selection;
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);
    
    const selectedTiles = [];
    
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        if (row >= 0 && row < currentBoard.height && col >= 0 && col < currentBoard.width) {
          const index = row * currentBoard.width + col;
          const value = currentBoard.tiles[index];
          if (value > 0) {
            selectedTiles.push({ row, col, value, index });
          }
        }
      }
    }
    
    return selectedTiles;
  };

  const handleSelectionComplete = () => {
    const selectedTiles = getSelectedTiles();
    
    if (selectedTiles.length === 0) return;
    
    const sum = selectedTiles.reduce((total, tile) => total + tile.value, 0);
    
    if (sum === 10) {
      handleTilesClear(selectedTiles);
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
        <View style={styles.gameArea} {...panResponder.panHandlers}>
          <View style={styles.board}>
            {currentBoard.tiles.map((value, index) => {
              const row = Math.floor(index / currentBoard.width);
              const col = index % currentBoard.width;
              const isSelected = selection && 
                row >= Math.min(selection.startRow, selection.endRow) &&
                row <= Math.max(selection.startRow, selection.endRow) &&
                col >= Math.min(selection.startCol, selection.endCol) &&
                col <= Math.max(selection.startCol, selection.endCol);
              
              return (
                <View
                  key={index}
                  style={[
                    styles.tile,
                    {
                      width: currentBoard.cellSize,
                      height: currentBoard.cellSize,
                      opacity: value === 0 ? 0 : 1,
                    },
                    isSelected && { backgroundColor: 'rgba(255, 255, 0, 0.6)' }
                  ]}
                >
                  {value > 0 && (
                    <Text style={[styles.tileText, { fontSize: currentBoard.cellSize * 0.4 }]}>
                      {value}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        </View>
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
  board: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  tile: {
    backgroundColor: '#2d2d44',
    margin: 1,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3d3d54',
  },
  tileText: {
    color: '#fff',
    fontWeight: 'bold',
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