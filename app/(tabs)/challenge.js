/**
 * Challenge Mode Screen - 60-second timed puzzle challenge
 * Purpose: Fast-paced gameplay with IQ scoring and board refreshing
 * Features: Timer, score tracking, automatic board generation, item usage
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  Dimensions,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useGameStore } from '../store/gameStore';
import { generateBoard } from '../utils/boardGenerator';
import { hasValidCombinations } from '../utils/gameLogic';
import GameBoard from '../components/GameBoard';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function ChallengeScreen() {
  const { gameData, updateGameData, settings } = useGameStore();
  
  // Game state
  const [board, setBoard] = useState(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isGameActive, setIsGameActive] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [bestScore, setBestScore] = useState(gameData?.maxScore || 0);
  
  // Item states
  const [swapMasterItems, setSwapMasterItems] = useState(gameData?.swapMasterItems || 0);
  const [splitItems, setSplitItems] = useState(gameData?.splitItems || 0);
  const [itemMode, setItemMode] = useState(null);
  const [selectedSwapTile, setSelectedSwapTile] = useState(null);
  
  // Animation states
  const [swapAnimations, setSwapAnimations] = useState(new Map());
  const [fractalAnimations, setFractalAnimations] = useState(new Map());
  
  const timerRef = useRef(null);

  // Reset game state when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('Challenge screen focused - resetting game');
      
      // Clear any existing timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Reset all game state
      setBoard(null);
      setScore(0);
      setTimeLeft(60);
      setIsGameActive(false);
      setIsGameOver(false);
      setItemMode(null);
      setSelectedSwapTile(null);
      setSwapAnimations(new Map());
      setFractalAnimations(new Map());
      
      // Load fresh data
      const currentGameData = gameData || {};
      setBestScore(currentGameData.maxScore || 0);
      setSwapMasterItems(currentGameData.swapMasterItems || 0);
      setSplitItems(currentGameData.splitItems || 0);
      
      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
    }, [gameData])
  );

  // Generate initial board
  useEffect(() => {
    if (!board && !isGameOver) {
      console.log('Generating initial challenge board');
      const newBoard = generateBoard(1, true, true);
      setBoard(newBoard);
    }
  }, [board, isGameOver]);

  // Timer logic
  useEffect(() => {
    if (isGameActive && timeLeft > 0 && !isGameOver) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsGameActive(false);
            setIsGameOver(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isGameActive, timeLeft, isGameOver]);

  // Handle game over
  useEffect(() => {
    if (isGameOver && score > 0) {
      handleGameEnd();
    }
  }, [isGameOver]);

  const startGame = () => {
    console.log('Starting challenge game');
    if (!board) {
      const newBoard = generateBoard(1, true, true);
      setBoard(newBoard);
    }
    setIsGameActive(true);
    setIsGameOver(false);
  };

  const handleGameEnd = async () => {
    console.log('Game ended with score:', score);
    
    if (score > bestScore) {
      setBestScore(score);
      await updateGameData({ maxScore: score });
      
      if (settings?.hapticsEnabled !== false) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  };

  const handleTilesClear = (clearedPositions) => {
    if (!isGameActive) return;
    
    console.log('Tiles cleared:', clearedPositions.length);
    
    // Update score (+3 IQ per clear)
    const newScore = score + 3;
    setScore(newScore);
    
    // Update board - clear the tiles
    const newTiles = [...board.tiles];
    clearedPositions.forEach(pos => {
      const index = pos.row * board.width + pos.col;
      newTiles[index] = 0;
    });
    
    const updatedBoard = { ...board, tiles: newTiles };
    setBoard(updatedBoard);
    
    // Check if board needs refresh after animation
    setTimeout(() => {
      console.log('Checking if board needs refresh...');
      const hasValidMoves = hasValidCombinations(updatedBoard.tiles, updatedBoard.width, updatedBoard.height);
      console.log('Has valid combinations:', hasValidMoves);
      
      if (!hasValidMoves) {
        console.log('No valid combinations found, generating new board');
        const newBoard = generateBoard(1, true, true);
        setBoard(newBoard);
      }
    }, 800);
  };

  const handleItemUse = (itemType) => {
    if (itemType === 'swapMaster' && swapMasterItems > 0) {
      setItemMode(itemMode === 'swapMaster' ? null : 'swapMaster');
      setSelectedSwapTile(null);
    } else if (itemType === 'fractalSplit' && splitItems > 0) {
      setItemMode(itemMode === 'fractalSplit' ? null : 'fractalSplit');
      setSelectedSwapTile(null);
    }
  };

  const handleTileClick = (row, col, value) => {
    if (!itemMode || !isGameActive) return;
    
    const index = row * board.width + col;
    
    if (itemMode === 'swapMaster') {
      if (!selectedSwapTile) {
        setSelectedSwapTile({ row, col, value, index });
      } else if (selectedSwapTile.index !== index) {
        // Perform swap
        performSwap(selectedSwapTile, { row, col, value, index });
      } else {
        setSelectedSwapTile(null);
      }
    } else if (itemMode === 'fractalSplit') {
      performFractalSplit(row, col, value, index);
    }
  };

  const performSwap = (tile1, tile2) => {
    const newTiles = [...board.tiles];
    newTiles[tile1.index] = tile2.value;
    newTiles[tile2.index] = tile1.value;
    
    setBoard({ ...board, tiles: newTiles });
    setSwapMasterItems(prev => prev - 1);
    setItemMode(null);
    setSelectedSwapTile(null);
    
    updateGameData({ swapMasterItems: swapMasterItems - 1 });
  };

  const performFractalSplit = (row, col, value, index) => {
    if (value <= 1) return;
    
    const newTiles = [...board.tiles];
    const splitValue = Math.floor(value / 2);
    const remainder = value - splitValue;
    
    newTiles[index] = splitValue;
    
    // Find empty spot for remainder
    const emptyIndex = newTiles.findIndex(tile => tile === 0);
    if (emptyIndex !== -1) {
      newTiles[emptyIndex] = remainder;
    }
    
    setBoard({ ...board, tiles: newTiles });
    setSplitItems(prev => prev - 1);
    setItemMode(null);
    
    updateGameData({ splitItems: splitItems - 1 });
  };

  const handleRestart = () => {
    const newBoard = generateBoard(1, true, true);
    setBoard(newBoard);
    setScore(0);
    setTimeLeft(60);
    setIsGameActive(false);
    setIsGameOver(false);
    setItemMode(null);
    setSelectedSwapTile(null);
  };

  const handleBackToHome = () => {
    router.replace('/');
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

  if (!board) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading Challenge...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header HUD */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBackToHome}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <View style={styles.gameInfo}>
          <Text style={styles.timerText}>
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </Text>
          <Text style={styles.scoreText}>IQ: {score}</Text>
          <Text style={styles.bestText}>Best: {bestScore}</Text>
        </View>
        
        <View style={styles.headerRight}>
          <Text style={styles.titleText}>
            {getIQTitle(score)}
          </Text>
        </View>
      </View>

      {/* Game Board */}
      <GameBoard
        tiles={board.tiles}
        width={board.width}
        height={board.height}
        onTilesClear={handleTilesClear}
        disabled={!isGameActive}
        itemMode={itemMode}
        onTileClick={handleTileClick}
        selectedSwapTile={selectedSwapTile}
        swapAnimations={swapAnimations}
        fractalAnimations={fractalAnimations}
        isChallenge={true}
        settings={settings}
      />

      {/* Game Over Overlay */}
      {isGameOver && (
        <View style={styles.gameOverOverlay}>
          <View style={styles.gameOverModal}>
            <Text style={styles.gameOverTitle}>Time's Up!</Text>
            <Text style={styles.finalScoreText}>Final IQ: {score}</Text>
            <Text style={styles.titleText}>{getIQTitle(score)}</Text>
            
            {score > bestScore && (
              <Text style={styles.newRecordText}>🎉 New Best Score!</Text>
            )}
            
            <View style={styles.gameOverButtons}>
              <TouchableOpacity 
                style={styles.playAgainButton}
                onPress={handleRestart}
              >
                <Text style={styles.playAgainButtonText}>Play Again</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.homeButton}
                onPress={handleBackToHome}
              >
                <Text style={styles.homeButtonText}>Home</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Start Game Overlay */}
      {!isGameActive && !isGameOver && (
        <View style={styles.startOverlay}>
          <View style={styles.startModal}>
            <Text style={styles.challengeTitle}>Challenge Mode</Text>
            <Text style={styles.challengeDescription}>
              Clear as many rectangles as possible in 60 seconds!
            </Text>
            <Text style={styles.challengeRules}>
              • Each clear = +3 IQ points{'\n'}
              • New boards appear when stuck{'\n'}
              • Use items to help yourself
            </Text>
            
            <TouchableOpacity 
              style={styles.startButton}
              onPress={startGame}
            >
              <Text style={styles.startButtonText}>Start Challenge</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Bottom Item Bar */}
      <View style={styles.itemBar}>
        <TouchableOpacity
          style={[
            styles.itemButton,
            itemMode === 'swapMaster' && styles.itemButtonActive,
            swapMasterItems === 0 && styles.itemButtonDisabled
          ]}
          onPress={() => handleItemUse('swapMaster')}
          disabled={swapMasterItems === 0}
        >
          <Ionicons 
            name="swap-horizontal" 
            size={20} 
            color={swapMasterItems === 0 ? '#ccc' : (itemMode === 'swapMaster' ? '#fff' : '#2196F3')} 
          />
          <Text style={[
            styles.itemButtonText,
            itemMode === 'swapMaster' && styles.itemButtonTextActive,
            swapMasterItems === 0 && styles.itemButtonTextDisabled
          ]}>
            Swap
          </Text>
          <View style={[
            styles.itemCount,
            swapMasterItems === 0 && styles.itemCountDisabled
          ]}>
            <Text style={[
              styles.itemCountText,
              swapMasterItems === 0 && styles.itemCountTextDisabled
            ]}>
              {swapMasterItems}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.itemButton,
            itemMode === 'fractalSplit' && styles.itemButtonActive,
            splitItems === 0 && styles.itemButtonDisabled
          ]}
          onPress={() => handleItemUse('fractalSplit')}
          disabled={splitItems === 0}
        >
          <Ionicons 
            name="cut" 
            size={20} 
            color={splitItems === 0 ? '#ccc' : (itemMode === 'fractalSplit' ? '#fff' : '#9C27B0')} 
          />
          <Text style={[
            styles.itemButtonText,
            itemMode === 'fractalSplit' && styles.itemButtonTextActive,
            splitItems === 0 && styles.itemButtonTextDisabled
          ]}>
            Split
          </Text>
          <View style={[
            styles.itemCount,
            splitItems === 0 && styles.itemCountDisabled
          ]}>
            <Text style={[
              styles.itemCountText,
              splitItems === 0 && styles.itemCountTextDisabled
            ]}>
              {splitItems}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    height: 80,
  },
  backButton: {
    padding: 8,
    width: 60,
  },
  gameInfo: {
    flex: 1,
    alignItems: 'center',
  },
  timerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E74C3C',
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  bestText: {
    fontSize: 12,
    color: '#666',
  },
  headerRight: {
    width: 100,
    alignItems: 'flex-end',
  },
  titleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9C27B0',
    textAlign: 'right',
  },
  itemBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
    height: 80,
  },
  itemButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    minWidth: 80,
    position: 'relative',
  },
  itemButtonActive: {
    backgroundColor: '#4CAF50',
  },
  itemButtonDisabled: {
    backgroundColor: '#f0f0f0',
    opacity: 0.6,
  },
  itemButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginTop: 4,
  },
  itemButtonTextActive: {
    color: 'white',
  },
  itemButtonTextDisabled: {
    color: '#ccc',
  },
  itemCount: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF9800',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemCountDisabled: {
    backgroundColor: '#ddd',
  },
  itemCountText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  itemCountTextDisabled: {
    color: '#999',
  },
  startOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  startModal: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  challengeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#E74C3C',
    marginBottom: 12,
  },
  challengeDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  challengeRules: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  startButton: {
    backgroundColor: '#E74C3C',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
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
  gameOverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  gameOverModal: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  gameOverTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#E74C3C',
    marginBottom: 16,
  },
  finalScoreText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  newRecordText: {
    fontSize: 16,
    color: '#FF9800',
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 16,
  },
  gameOverButtons: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 20,
  },
  playAgainButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  playAgainButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  homeButton: {
    backgroundColor: '#666',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  homeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});