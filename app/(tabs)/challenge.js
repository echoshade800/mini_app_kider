/**
 * Challenge Mode Screen - 60-second IQ challenge with dense number grid
 * Purpose: Timed gameplay with scoring and leaderboard
 * Features: 12x11 grid, variable fill rate, bomb timer, item usage
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  Animated,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import GameBoard from '../components/GameBoard';
import { useGameStore } from '../store/gameStore';
import { generateChallengeBoard } from '../utils/boardGenerator';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function ChallengeScreen() {
  const { gameData, updateGameData, settings } = useGameStore();
  
  const [gameState, setGameState] = useState('ready'); // ready, playing, finished
  const [board, setBoard] = useState(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [score, setScore] = useState(0);
  const [itemMode, setItemMode] = useState(null);
  const [selectedSwapTile, setSelectedSwapTile] = useState(null);
  const [swapAnimations, setSwapAnimations] = useState(new Map());
  const [fractalAnimations, setFractalAnimations] = useState(new Map());
  
  const tileScales = useRef(new Map()).current;
  const bombShake = useRef(new Animated.Value(0)).current;
  const fuseWidth = useRef(new Animated.Value(100)).current;

  const initTileScale = (index) => {
    if (!tileScales.has(index)) {
      tileScales.set(index, new Animated.Value(1));
    }
    return tileScales.get(index);
  };

  const scaleTile = (index, scale) => {
    const tileScale = initTileScale(index);
    Animated.timing(tileScale, {
      toValue: scale,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  const getTileRotation = (row, col) => {
    const seed = row * 13 + col * 7;
    return (seed % 7) - 3; // -3 to 3 degrees
  };

  // Timer effect
  useEffect(() => {
    if (gameState !== 'playing') return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameState('finished');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState]);

  // Bomb shake animation for last 10 seconds
  useEffect(() => {
    if (gameState === 'playing' && timeLeft <= 10 && timeLeft > 0) {
      Animated.sequence([
        Animated.timing(bombShake, {
          toValue: 3,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(bombShake, {
          toValue: -3,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(bombShake, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [timeLeft, gameState]);

  // Fuse burning animation
  useEffect(() => {
    if (gameState === 'playing') {
      const progress = (timeLeft / 60) * 100;
      Animated.timing(fuseWidth, {
        toValue: progress,
        duration: 1000,
        useNativeDriver: false,
      }).start();
    }
  }, [timeLeft, gameState]);

  const startGame = () => {
    const newBoard = generateChallengeBoard();
    setBoard(newBoard);
    setGameState('playing');
    setTimeLeft(60);
    setScore(0);
    setItemMode(null);
    setSelectedSwapTile(null);
    
    // Reset fuse animation
    fuseWidth.setValue(100);
  };

  const handleTilesClear = (clearedPositions) => {
    if (!board) return;
    
    // Award points
    const points = clearedPositions.length * 3;
    setScore(prev => prev + points);
    
    // Create new board with cleared tiles
    const newTiles = [...board.tiles];
    clearedPositions.forEach(pos => {
      const index = pos.row * board.width + pos.col;
      newTiles[index] = 0;
    });
    
    // Check if we need to refresh the board (less than 20% tiles remaining)
    const remainingTiles = newTiles.filter(tile => tile > 0).length;
    const totalTiles = newTiles.length;
    
    if (remainingTiles < totalTiles * 0.2) {
      // Generate fresh board
      const freshBoard = generateChallengeBoard();
      setBoard(freshBoard);
    } else {
      // Update current board
      setBoard(prev => ({ ...prev, tiles: newTiles }));
    }
  };

  const handleTileClick = (row, col, value) => {
    if (!itemMode || !board) return;
    
    const index = row * board.width + col;
    
    if (itemMode === 'swapMaster') {
      if (!selectedSwapTile) {
        setSelectedSwapTile({ row, col, value, index });
      } else if (selectedSwapTile.index === index) {
        setSelectedSwapTile(null);
      } else {
        // Swap tiles
        const newTiles = [...board.tiles];
        newTiles[selectedSwapTile.index] = value;
        newTiles[index] = selectedSwapTile.value;
        
        setBoard(prev => ({ ...prev, tiles: newTiles }));
        setSelectedSwapTile(null);
        setItemMode(null);
        
        if (settings?.hapticsEnabled !== false) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      }
    }
  };

  const handleUseSwapMaster = () => {
    if ((gameData?.swapMasterItems || 0) <= 0) return;
    
    setItemMode('swapMaster');
    setSelectedSwapTile(null);
    
    updateGameData({
      swapMasterItems: (gameData?.swapMasterItems || 0) - 1,
    });
  };

  const handleUseSplit = () => {
    if ((gameData?.splitItems || 0) <= 0) return;
    
    setItemMode('fractalSplit');
    
    updateGameData({
      splitItems: (gameData?.splitItems || 0) - 1,
    });
  };

  const handleFinish = () => {
    // Update best score if needed
    const currentBest = gameData?.maxScore || 0;
    if (score > currentBest) {
      updateGameData({
        maxScore: score,
      });
    }
    
    router.back();
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

  if (gameState === 'ready') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.readyContainer}>
          <Text style={styles.readyTitle}>Challenge Mode</Text>
          <Text style={styles.readySubtitle}>60-Second IQ Sprint</Text>
          
          <View style={styles.rulesContainer}>
            <Text style={styles.rulesTitle}>Rules</Text>
            <Text style={styles.ruleText}>• Draw rectangles that sum to 10</Text>
            <Text style={styles.ruleText}>• Each clear awards +3 IQ points</Text>
            <Text style={styles.ruleText}>• Board refreshes when 80% cleared</Text>
            <Text style={styles.ruleText}>• Use items to help when stuck</Text>
          </View>
          
          <View style={styles.bestScoreContainer}>
            <Text style={styles.bestScoreLabel}>Best IQ Score</Text>
            <Text style={styles.bestScoreValue}>{gameData?.maxScore || 0}</Text>
            <Text style={styles.bestScoreTitle}>{getIQTitle(gameData?.maxScore || 0)}</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.startButton}
            onPress={startGame}
          >
            <Text style={styles.startButtonText}>Start Challenge</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (gameState === 'finished') {
    const isNewRecord = score > (gameData?.maxScore || 0);
    
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.finishedContainer}>
          <Ionicons 
            name={isNewRecord ? "trophy" : "medal"} 
            size={80} 
            color={isNewRecord ? "#FFD700" : "#C0C0C0"} 
          />
          
          <Text style={styles.finishedTitle}>
            {isNewRecord ? "New Record!" : "Challenge Complete!"}
          </Text>
          
          <View style={styles.scoreContainer}>
            <Text style={styles.finalScoreLabel}>Final IQ Score</Text>
            <Text style={styles.finalScoreValue}>{score}</Text>
            <Text style={styles.finalScoreTitle}>{getIQTitle(score)}</Text>
          </View>
          
          {isNewRecord && (
            <Text style={styles.recordText}>
              Previous best: {gameData?.maxScore || 0}
            </Text>
          )}
          
          <View style={styles.finishedButtons}>
            <TouchableOpacity 
              style={styles.playAgainButton}
              onPress={startGame}
            >
              <Text style={styles.playAgainButtonText}>Play Again</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.homeButton}
              onPress={handleFinish}
            >
              <Text style={styles.homeButtonText}>Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Playing state
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.timerHUD}>
        <View style={styles.bombContainer}>
          <Animated.View 
            style={[
              styles.bombIcon,
              { transform: [{ translateX: bombShake }] }
            ]}
          >
            <Text style={styles.bombEmoji}>💣</Text>
          </Animated.View>
          
          <View style={styles.fuseContainer}>
            <Animated.View 
              style={[
                styles.fuse,
                { 
                  width: fuseWidth.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                    extrapolate: 'clamp'
                  })
                }
              ]}
            />
          </View>
          
          <Text style={styles.timerText}>{timeLeft}s</Text>
        </View>
        
        <View style={styles.scoreDisplay}>
          <Text style={styles.scoreLabel}>IQ</Text>
          <Text style={styles.scoreValue}>{score}</Text>
        </View>
      </View>

      {board && (
        <GameBoard
          tiles={board.tiles}
          width={board.width}
          height={board.height}
          onTilesClear={handleTilesClear}
          disabled={itemMode !== null}
          settings={settings}
          itemMode={itemMode}
          onTileClick={handleTileClick}
          selectedSwapTile={selectedSwapTile}
          swapAnimations={swapAnimations}
          fractalAnimations={fractalAnimations}
          initTileScale={initTileScale}
          getTileRotation={getTileRotation}
          scaleTile={scaleTile}
          isChallenge={true}
        />
      )}

      <View style={styles.itemBar}>
        <TouchableOpacity 
          style={[
            styles.itemButton,
            itemMode === 'swapMaster' && styles.itemButtonActive,
            (gameData?.swapMasterItems || 0) <= 0 && styles.itemButtonDisabled
          ]}
          onPress={handleUseSwapMaster}
          disabled={itemMode !== null && itemMode !== 'swapMaster'}
        >
          <Ionicons name="swap-horizontal" size={20} color="#2196F3" />
          <Text style={styles.itemButtonText}>SwapMaster</Text>
          <Text style={styles.itemCount}>{gameData?.swapMasterItems || 0}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.itemButton,
            itemMode === 'fractalSplit' && styles.itemButtonActive,
            (gameData?.splitItems || 0) <= 0 && styles.itemButtonDisabled
          ]}
          onPress={handleUseSplit}
          disabled={itemMode !== null && itemMode !== 'fractalSplit'}
        >
          <Ionicons name="cut" size={20} color="#9C27B0" />
          <Text style={styles.itemButtonText}>Split</Text>
          <Text style={styles.itemCount}>{gameData?.splitItems || 0}</Text>
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
  
  // Ready State
  readyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  readyTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  readySubtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 40,
  },
  rulesContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rulesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  ruleText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    lineHeight: 20,
  },
  bestScoreContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  bestScoreLabel: {
    fontSize: 16,
    color: '#666',
  },
  bestScoreValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginVertical: 4,
  },
  bestScoreTitle: {
    fontSize: 14,
    color: '#999',
  },
  startButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
  },
  backButtonText: {
    color: '#666',
    fontSize: 16,
  },
  
  // Playing State
  timerHUD: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  bombContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bombIcon: {
    marginRight: 12,
  },
  bombEmoji: {
    fontSize: 24,
  },
  fuseContainer: {
    flex: 1,
    height: 6,
    backgroundColor: '#ddd',
    borderRadius: 3,
    marginRight: 12,
    overflow: 'hidden',
  },
  fuse: {
    height: '100%',
    backgroundColor: '#FF5722',
    borderRadius: 3,
  },
  timerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    minWidth: 40,
  },
  scoreDisplay: {
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
  
  // Item Bar
  itemBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 20,
  },
  itemButton: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    minWidth: 100,
  },
  itemButtonActive: {
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  itemButtonDisabled: {
    opacity: 0.5,
  },
  itemButtonText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  itemCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
    marginTop: 2,
  },
  
  // Finished State
  finishedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  finishedTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 20,
    marginBottom: 30,
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  finalScoreLabel: {
    fontSize: 16,
    color: '#666',
  },
  finalScoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginVertical: 8,
  },
  finalScoreTitle: {
    fontSize: 16,
    color: '#999',
  },
  recordText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 30,
  },
  finishedButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  playAgainButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  playAgainButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  homeButton: {
    backgroundColor: 'white',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4CAF50',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  homeButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
  },
});