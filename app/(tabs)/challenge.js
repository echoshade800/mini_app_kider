/**
 * Challenge Mode Screen - 60-second timed gameplay with IQ scoring
 * Purpose: Fast-paced gameplay with continuous board generation and scoring
 * Features: Timer, IQ calculation, item usage, board refresh
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
import { generateBoard } from '../utils/boardGenerator';
import { useGameStore } from '../store/gameStore';
import { hasValidCombinations, reshuffleBoard, isBoardEmpty } from '../utils/gameLogic';

const CHALLENGE_TIME = 60; // 60 seconds
const IQ_PER_CLEAR = 3; // +3 IQ per successful clear

export default function ChallengeScreen() {
  const { gameData, updateGameData, settings } = useGameStore();
  
  // Game state
  const [isGameActive, setIsGameActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(CHALLENGE_TIME);
  const [currentIQ, setCurrentIQ] = useState(0);
  const [currentBoard, setCurrentBoard] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  
  // Item system
  const [swapMasterItems, setSwapMasterItems] = useState(gameData?.swapMasterItems || 0);
  const [splitItems, setSplitItems] = useState(gameData?.splitItems || 0);
  const [itemMode, setItemMode] = useState(null);
  const [selectedSwapTile, setSelectedSwapTile] = useState(null);
  
  // Animations
  const [swapAnimations, setSwapAnimations] = useState(new Map());
  const [fractalAnimations, setFractalAnimations] = useState(new Map());
  
  // Rescue modal
  const [showRescueModal, setShowRescueModal] = useState(false);
  
  // Timer ref
  const timerRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Initialize first board
  useEffect(() => {
    if (!currentBoard) {
      const board = generateBoard(1, true, true); // Challenge mode
      setCurrentBoard(board);
    }
  }, []);

  // Timer logic
  useEffect(() => {
    if (isGameActive && timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isGameActive) {
      handleGameEnd();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isGameActive, timeLeft]);

  // Timer pulse animation
  useEffect(() => {
    if (timeLeft <= 10 && isGameActive) {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [timeLeft, isGameActive]);

  const startGame = () => {
    setIsGameActive(true);
    setGameStarted(true);
    setTimeLeft(CHALLENGE_TIME);
    setCurrentIQ(0);
    
    // Generate fresh board
    const board = generateBoard(1, true, true);
    setCurrentBoard(board);
    
    if (settings?.hapticsEnabled !== false) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handleGameEnd = async () => {
    setIsGameActive(false);
    
    if (settings?.hapticsEnabled !== false) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    // Update best score if improved
    const currentBest = gameData?.maxScore || 0;
    if (currentIQ > currentBest) {
      await updateGameData({ maxScore: currentIQ });
      
      Alert.alert(
        '🎉 New Record!',
        `Congratulations! You achieved ${currentIQ} IQ points, beating your previous best of ${currentBest}!`,
        [{ text: 'Awesome!', style: 'default' }]
      );
    } else {
      Alert.alert(
        '⏰ Time\'s Up!',
        `You scored ${currentIQ} IQ points! Your best is still ${currentBest}.`,
        [{ text: 'Try Again', style: 'default' }]
      );
    }
  };

  const handleTilesClear = (clearedPositions) => {
    // Award IQ points
    setCurrentIQ(prev => prev + IQ_PER_CLEAR);
    
    // Generate new board immediately
    setTimeout(() => {
      const newBoard = generateBoard(1, true, true);
      setCurrentBoard(newBoard);
    }, 600); // Wait for explosion animation
  };

  const handleSwapTileClick = (row, col, value) => {
    if (itemMode !== 'swapMaster') return;
    
    const index = row * currentBoard.width + col;
    
    if (!selectedSwapTile) {
      // Select first tile
      setSelectedSwapTile({ row, col, value, index });
    } else if (selectedSwapTile.index === index) {
      // Deselect same tile
      setSelectedSwapTile(null);
    } else {
      // Perform swap
      performSwap(selectedSwapTile, { row, col, value, index });
    }
  };

  const performSwap = (tile1, tile2) => {
    const newTiles = [...currentBoard.tiles];
    
    // Swap values
    newTiles[tile1.index] = tile2.value;
    newTiles[tile2.index] = tile1.value;
    
    // Create swap animations
    const newSwapAnimations = new Map();
    
    // Calculate positions for animation
    const tile1Row = Math.floor(tile1.index / currentBoard.width);
    const tile1Col = tile1.index % currentBoard.width;
    const tile2Row = Math.floor(tile2.index / currentBoard.width);
    const tile2Col = tile2.index % currentBoard.width;
    
    const deltaRow = tile2Row - tile1Row;
    const deltaCol = tile2Col - tile1Col;
    
    // Animate tile1 to tile2 position
    newSwapAnimations.set(tile1.index, {
      translateX: new Animated.Value(0),
      translateY: new Animated.Value(0),
    });
    
    // Animate tile2 to tile1 position  
    newSwapAnimations.set(tile2.index, {
      translateX: new Animated.Value(0),
      translateY: new Animated.Value(0),
    });
    
    setSwapAnimations(newSwapAnimations);
    
    // Start animations
    const tileSize = 24; // Approximate tile size
    const tileGap = 4;
    const cellSize = tileSize + tileGap;
    
    Animated.parallel([
      Animated.timing(newSwapAnimations.get(tile1.index).translateX, {
        toValue: deltaCol * cellSize,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(newSwapAnimations.get(tile1.index).translateY, {
        toValue: deltaRow * cellSize,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(newSwapAnimations.get(tile2.index).translateX, {
        toValue: -deltaCol * cellSize,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(newSwapAnimations.get(tile2.index).translateY, {
        toValue: -deltaRow * cellSize,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Update board after animation
      setCurrentBoard(prev => ({ ...prev, tiles: newTiles }));
      setSwapAnimations(new Map());
      setSelectedSwapTile(null);
      setItemMode(null);
      
      // Consume item
      setSwapMasterItems(prev => prev - 1);
      updateGameData({ swapMasterItems: swapMasterItems - 1 });
    });
  };

  const handleItemPress = (itemType) => {
    if (!isGameActive) return;
    
    if (itemType === 'swapMaster') {
      if (swapMasterItems <= 0) {
        Alert.alert('No Items', 'You don\'t have any SwapMaster items!');
        return;
      }
      
      setItemMode(itemMode === 'swapMaster' ? null : 'swapMaster');
      setSelectedSwapTile(null);
    } else if (itemType === 'fractalSplit') {
      if (splitItems <= 0) {
        Alert.alert('No Items', 'You don\'t have any Split items!');
        return;
      }
      
      setItemMode(itemMode === 'fractalSplit' ? null : 'fractalSplit');
    }
  };

  const handleBoardRefresh = (action) => {
    if (action === 'refresh') {
      // Generate new board
      const newBoard = generateBoard(1, true, true);
      setCurrentBoard(newBoard);
    } else if (action === 'return') {
      // End game early
      handleGameEnd();
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header HUD */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.replace('/')}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <View style={styles.gameInfo}>
          <Animated.Text style={[
            styles.timer,
            timeLeft <= 10 && { transform: [{ scale: pulseAnim }] },
            timeLeft <= 10 && { color: '#f44336' }
          ]}>
            {formatTime(timeLeft)}
          </Animated.Text>
          <Text style={styles.iqScore}>IQ: {currentIQ}</Text>
          <Text style={styles.iqTitle}>{getIQTitle(currentIQ)}</Text>
        </View>
        
        <View style={styles.bestScore}>
          <Text style={styles.bestLabel}>Best</Text>
          <Text style={styles.bestValue}>{gameData?.maxScore || 0}</Text>
        </View>
      </View>

      {/* Game Board */}
      {isGameActive ? (
        <GameBoard 
          tiles={currentBoard?.tiles || []}
          width={currentBoard?.width || 14}
          height={currentBoard?.height || 21}
          onTilesClear={handleTilesClear}
          disabled={!isGameActive}
          itemMode={itemMode}
          onTileClick={handleSwapTileClick}
          selectedSwapTile={selectedSwapTile}
          swapAnimations={swapAnimations}
          fractalAnimations={fractalAnimations}
          onBoardRefresh={handleBoardRefresh}
          isChallenge={true}
          settings={settings}
        />
      ) : (
        <View style={styles.startContainer}>
          <Ionicons name="timer" size={80} color="#FF9800" />
          <Text style={styles.startTitle}>Challenge Mode</Text>
          <Text style={styles.startDescription}>
            You have 60 seconds to clear as many rectangles as possible. 
            Each successful clear awards +3 IQ points!
          </Text>
          
          {gameStarted && (
            <View style={styles.finalScore}>
              <Text style={styles.finalScoreLabel}>Final Score</Text>
              <Text style={styles.finalScoreValue}>{currentIQ} IQ</Text>
              <Text style={styles.finalScoreTitle}>{getIQTitle(currentIQ)}</Text>
            </View>
          )}
          
          <TouchableOpacity 
            style={styles.startButton}
            onPress={startGame}
          >
            <Text style={styles.startButtonText}>
              {gameStarted ? 'Play Again' : 'Start Challenge'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom Item Bar */}
      {isGameActive && (
        <View style={styles.itemBar}>
          <TouchableOpacity
            style={[
              styles.itemButton,
              itemMode === 'swapMaster' && styles.itemButtonActive,
              swapMasterItems <= 0 && styles.itemButtonDisabled
            ]}
            onPress={() => handleItemPress('swapMaster')}
            disabled={swapMasterItems <= 0}
          >
            <Ionicons 
              name="swap-horizontal" 
              size={20} 
              color={swapMasterItems <= 0 ? '#ccc' : (itemMode === 'swapMaster' ? '#fff' : '#2196F3')} 
            />
            <Text style={[
              styles.itemButtonText,
              itemMode === 'swapMaster' && styles.itemButtonTextActive,
              swapMasterItems <= 0 && styles.itemButtonTextDisabled
            ]}>
              {swapMasterItems}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.itemButton,
              itemMode === 'fractalSplit' && styles.itemButtonActive,
              splitItems <= 0 && styles.itemButtonDisabled
            ]}
            onPress={() => handleItemPress('fractalSplit')}
            disabled={splitItems <= 0}
          >
            <Ionicons 
              name="cut" 
              size={20} 
              color={splitItems <= 0 ? '#ccc' : (itemMode === 'fractalSplit' ? '#fff' : '#9C27B0')} 
            />
            <Text style={[
              styles.itemButtonText,
              itemMode === 'fractalSplit' && styles.itemButtonTextActive,
              splitItems <= 0 && styles.itemButtonTextDisabled
            ]}>
              {splitItems}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Rescue Modal */}
      <RescueModal
        visible={showRescueModal}
        onContinue={() => setShowRescueModal(false)}
        onReturn={() => {
          setShowRescueModal(false);
          handleGameEnd();
        }}
        hasItems={swapMasterItems > 0 || splitItems > 0}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f8ff',
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
    zIndex: 10,
  },
  backButton: {
    padding: 8,
  },
  gameInfo: {
    alignItems: 'center',
    flex: 1,
  },
  timer: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  iqScore: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF9800',
    marginTop: 2,
  },
  iqTitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  bestScore: {
    alignItems: 'center',
  },
  bestLabel: {
    fontSize: 12,
    color: '#666',
  },
  bestValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  startContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  startTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 16,
  },
  startDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  finalScore: {
    alignItems: 'center',
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
  finalScoreLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  finalScoreValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF9800',
    marginBottom: 4,
  },
  finalScoreTitle: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
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
    textAlign: 'center',
  },
  itemBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 20,
    zIndex: 10,
  },
  itemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 80,
    justifyContent: 'center',
  },
  itemButtonActive: {
    backgroundColor: '#2196F3',
    borderColor: '#1976D2',
  },
  itemButtonDisabled: {
    backgroundColor: '#f0f0f0',
    opacity: 0.6,
  },
  itemButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  itemButtonTextActive: {
    color: 'white',
  },
  itemButtonTextDisabled: {
    color: '#ccc',
  },
});