/**
 * Challenge Mode Screen - 60-second timed puzzle challenge
 * Purpose: Fast-paced gameplay with IQ scoring and leaderboards
 * Features: Timer, score tracking, dynamic board generation, item usage
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  Alert,
  Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import GameBoard from '../components/GameBoard';
import RescueModal from '../components/RescueModal';
import { useGameStore } from '../store/gameStore';
import { generateChallengeBoard } from '../utils/boardGenerator';
import { getIQTitle } from '../utils/gameLogic';

const CHALLENGE_TIME = 60; // 60 seconds

export default function ChallengeScreen() {
  const { gameData, updateGameData, settings } = useGameStore();
  
  const [gameState, setGameState] = useState('ready'); // ready, playing, finished
  const [timeLeft, setTimeLeft] = useState(CHALLENGE_TIME);
  const [currentScore, setCurrentScore] = useState(0);
  const [board, setBoard] = useState(null);
  const [itemMode, setItemMode] = useState(null);
  const [selectedSwapTile, setSelectedSwapTile] = useState(null);
  const [swapAnimations, setSwapAnimations] = useState(new Map());
  const [fractalAnimations, setFractalAnimations] = useState(new Map());
  const [showRescueModal, setShowRescueModal] = useState(false);
  const [reshuffleCount, setReshuffleCount] = useState(0);
  
  const tileScales = useRef(new Map()).current;
  const timerRef = useRef(null);

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

  // Generate challenge board with 100% fill rate
  const generateFullBoard = () => {
    const width = 14;
    const height = 21;
    const size = width * height; // 294 tiles
    const tiles = new Array(size);
    
    // Target pairs that sum to 10
    const targetPairs = [
      [1, 9], [2, 8], [3, 7], [4, 6], [5, 5]
    ];
    
    // Place guaranteed pairs (15% of tiles = ~44 pairs = 88 tiles)
    const guaranteedPairs = Math.floor(size * 0.15 / 2);
    const placedPositions = new Set();
    
    for (let i = 0; i < guaranteedPairs; i++) {
      const pairType = targetPairs[Math.floor(Math.random() * targetPairs.length)];
      const [val1, val2] = pairType;
      
      // Find two random positions
      let pos1, pos2;
      do {
        pos1 = Math.floor(Math.random() * size);
      } while (placedPositions.has(pos1));
      
      do {
        pos2 = Math.floor(Math.random() * size);
      } while (placedPositions.has(pos2));
      
      tiles[pos1] = val1;
      tiles[pos2] = val2;
      placedPositions.add(pos1);
      placedPositions.add(pos2);
    }
    
    // Fill remaining positions with random numbers (85% of tiles)
    for (let i = 0; i < size; i++) {
      if (!placedPositions.has(i)) {
        // Weighted distribution for challenge
        const rand = Math.random();
        if (rand < 0.3) {
          tiles[i] = Math.floor(Math.random() * 3) + 1; // 1-3
        } else if (rand < 0.6) {
          tiles[i] = Math.floor(Math.random() * 3) + 4; // 4-6
        } else {
          tiles[i] = Math.floor(Math.random() * 3) + 7; // 7-9
        }
      }
    }
    
    return {
      width,
      height,
      tiles,
      seed: `challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  };

  // Start game
  const handleStartGame = () => {
    const newBoard = generateFullBoard();
    setBoard(newBoard);
    setGameState('playing');
    setTimeLeft(CHALLENGE_TIME);
    setCurrentScore(0);
    setItemMode(null);
    setSelectedSwapTile(null);
    
    // Start timer
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleGameEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // End game
  const handleGameEnd = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setGameState('finished');
    
    // Update best score
    const newMaxScore = Math.max(gameData?.maxScore || 0, currentScore);
    updateGameData({
      maxScore: newMaxScore,
    });
    
    if (settings?.hapticsEnabled !== false) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  // Handle tiles cleared
  const handleTilesClear = (clearedPositions) => {
    if (gameState !== 'playing') return;
    
    // Add 3 points per clear
    setCurrentScore(prev => prev + 3);
    
    // Create new board with cleared tiles
    const newTiles = [...board.tiles];
    clearedPositions.forEach(pos => {
      const index = pos.row * board.width + pos.col;
      newTiles[index] = 0;
    });
    
    // Check if we need to refresh the board
    const remainingTiles = newTiles.filter(tile => tile > 0).length;
    const totalTiles = board.width * board.height;
    
    if (remainingTiles < totalTiles * 0.2) {
      // Less than 20% tiles remaining, generate new board
      setTimeout(() => {
        const newBoard = generateFullBoard();
        setBoard(newBoard);
      }, 500);
    } else {
      // Update board with cleared tiles
      setBoard(prev => ({ ...prev, tiles: newTiles }));
    }
  };

  // Handle tile click for items
  const handleTileClick = (row, col, value) => {
    if (!itemMode || gameState !== 'playing') return;
    
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
        
        // Deduct item
        updateGameData({
          swapMasterItems: Math.max(0, (gameData?.swapMasterItems || 0) - 1),
        });
      }
    }
  };

  // Use SwapMaster item
  const handleUseSwapMaster = () => {
    if ((gameData?.swapMasterItems || 0) <= 0) {
      Alert.alert('No Items', 'You don\'t have any SwapMaster items.');
      return;
    }
    
    setItemMode('swapMaster');
    setSelectedSwapTile(null);
  };

  // Use Split item
  const handleUseSplit = () => {
    if ((gameData?.splitItems || 0) <= 0) {
      Alert.alert('No Items', 'You don\'t have any Split items.');
      return;
    }
    
    setItemMode('fractalSplit');
    setSelectedSwapTile(null);
  };

  // Back to home
  const handleBack = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    router.replace('/');
  };

  // Restart game
  const handleRestart = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    handleStartGame();
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const bestScore = gameData?.maxScore || 0;
  const bestTitle = getIQTitle(bestScore);

  if (gameState === 'ready') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.readyContainer}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBack}
          >
            <Ionicons name="arrow-back" size={24} color="#666" />
          </TouchableOpacity>

          <View style={styles.readyContent}>
            <Ionicons name="timer" size={80} color="#FF9800" />
            <Text style={styles.readyTitle}>Challenge Mode</Text>
            <Text style={styles.readySubtitle}>60-Second IQ Sprint</Text>
            
            <View style={styles.rulesContainer}>
              <Text style={styles.rulesTitle}>How to Play:</Text>
              <Text style={styles.ruleText}>• Draw rectangles that sum to 10</Text>
              <Text style={styles.ruleText}>• Each clear = +3 IQ points</Text>
              <Text style={styles.ruleText}>• 60 seconds on the clock</Text>
              <Text style={styles.ruleText}>• Beat your best score!</Text>
            </View>
            
            <View style={styles.statsContainer}>
              <Text style={styles.bestScoreLabel}>Your Best IQ</Text>
              <Text style={styles.bestScore}>{bestScore}</Text>
              <Text style={styles.bestTitle}>{bestTitle}</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.startButton}
              onPress={handleStartGame}
            >
              <Text style={styles.startButtonText}>Start Challenge</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (gameState === 'finished') {
    const isNewRecord = currentScore > bestScore;
    const currentTitle = getIQTitle(currentScore);
    
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
            <Text style={styles.finalScoreLabel}>Your IQ Score</Text>
            <Text style={styles.finalScore}>{currentScore}</Text>
            <Text style={styles.finalTitle}>{currentTitle}</Text>
            
            {!isNewRecord && (
              <>
                <Text style={styles.bestScoreLabel}>Best: {bestScore}</Text>
                <Text style={styles.bestTitle}>{bestTitle}</Text>
              </>
            )}
          </View>
          
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={handleBack}
            >
              <Text style={styles.secondaryButtonText}>Home</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={handleRestart}
            >
              <Text style={styles.primaryButtonText}>Play Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Playing state
  return (
    <SafeAreaView style={styles.container}>
      {/* HUD */}
      <View style={styles.hud}>
        <TouchableOpacity 
          style={styles.hudButton}
          onPress={handleBack}
        >
          <Ionicons name="arrow-back" size={20} color="#666" />
        </TouchableOpacity>

        <View style={styles.gameInfo}>
          <View style={styles.timerContainer}>
            <Ionicons name="timer" size={20} color="#FF9800" />
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

        <TouchableOpacity 
          style={styles.hudButton}
          onPress={handleRestart}
        >
          <Ionicons name="refresh" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Game Board */}
      {board && (
        <GameBoard
          tiles={board.tiles}
          width={board.width}
          height={board.height}
          onTilesClear={handleTilesClear}
          disabled={false}
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
          showRescueModal={showRescueModal}
          setShowRescueModal={setShowRescueModal}
          reshuffleCount={reshuffleCount}
          setReshuffleCount={setReshuffleCount}
        />
      )}

      {/* Item Bar */}
      <View style={styles.itemBar}>
        <TouchableOpacity 
          style={[
            styles.itemButton,
            itemMode === 'swapMaster' && styles.itemButtonActive
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
            itemMode === 'fractalSplit' && styles.itemButtonActive
          ]}
          onPress={handleUseSplit}
          disabled={itemMode !== null && itemMode !== 'fractalSplit'}
        >
          <Ionicons name="cut" size={20} color="#9C27B0" />
          <Text style={styles.itemButtonText}>Split</Text>
          <Text style={styles.itemCount}>{gameData?.splitItems || 0}</Text>
        </TouchableOpacity>
      </View>

      {/* Rescue Modal */}
      <RescueModal
        visible={showRescueModal}
        onContinue={() => setShowRescueModal(false)}
        onReturn={handleBack}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f8ff',
  },
  readyContainer: {
    flex: 1,
    padding: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: 8,
    marginBottom: 20,
  },
  readyContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readyTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  readySubtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 30,
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
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
    lineHeight: 24,
  },
  statsContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  bestScoreLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  bestScore: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FF9800',
    marginBottom: 4,
  },
  bestTitle: {
    fontSize: 14,
    color: '#999',
  },
  startButton: {
    backgroundColor: '#FF9800',
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
    fontWeight: '600',
  },
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
    marginBottom: 40,
  },
  finalScoreLabel: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  finalScore: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FF9800',
    marginBottom: 8,
  },
  finalTitle: {
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 16,
  },
  primaryButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'white',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF9800',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  secondaryButtonText: {
    color: '#FF9800',
    fontSize: 16,
    fontWeight: '600',
  },
  hud: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  hudButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  timerWarning: {
    color: '#f44336',
  },
  scoreLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    textAlign: 'center',
  },
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
});