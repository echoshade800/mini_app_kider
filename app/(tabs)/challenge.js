/**
 * Challenge Mode Screen - 60-second timed gameplay with continuous board refresh
 * Purpose: Fast-paced elimination with IQ scoring and automatic board generation
 * Features: Timer, score tracking, continuous board refresh, final settlement
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  Dimensions,
  Alert,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useGameStore } from '../store/gameStore';
import { generateBoard } from '../utils/boardGenerator';
import GameBoard from '../components/GameBoard';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const CHALLENGE_DURATION = 60; // 60 seconds
const POINTS_PER_CLEAR = 3; // +3 IQ per successful clear

const IQ_TITLES = {
  0: 'Newborn Dreamer',
  40: 'Tiny Adventurer', 
  55: 'Learning Hatchling',
  65: 'Little Explorer',
  70: 'Slow but Steady',
  85: 'Hardworking Student',
  100: 'Everyday Scholar',
  115: 'Rising Star',
  130: 'Puzzle Master',
  145: 'Cosmic Genius',
};

function getIQTitle(iq) {
  const thresholds = Object.keys(IQ_TITLES)
    .map(Number)
    .sort((a, b) => b - a);
  
  for (let threshold of thresholds) {
    if (iq >= threshold) {
      return IQ_TITLES[threshold];
    }
  }
  
  return IQ_TITLES[0];
}

export default function ChallengeScreen() {
  const { gameData, updateGameData, settings } = useGameStore();
  
  // Game state
  const [board, setBoard] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [timeLeft, setTimeLeft] = useState(CHALLENGE_DURATION);
  const [currentIQ, setCurrentIQ] = useState(0);
  const [clearsCount, setClearsCount] = useState(0);
  const [showSettlement, setShowSettlement] = useState(false);
  
  // Refs
  const timerRef = useRef(null);
  const gameStartedRef = useRef(false);

  // Reset game state when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('Challenge screen focused - resetting game');
      
      // Reset all game state
      setBoard(null);
      setGameStarted(false);
      setGameEnded(false);
      setTimeLeft(CHALLENGE_DURATION);
      setCurrentIQ(0);
      setClearsCount(0);
      setShowSettlement(false);
      gameStartedRef.current = false;
      
      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Generate initial board
      generateNewBoard();
    }, [])
  );

  const generateNewBoard = () => {
    console.log('Generating new challenge board');
    const newBoard = generateBoard(130 + Math.floor(Math.random() * 20), false, true);
    setBoard(newBoard);
  };

  const startGame = () => {
    if (gameStartedRef.current) return;
    
    console.log('Starting challenge game');
    setGameStarted(true);
    gameStartedRef.current = true;
    
    // Start countdown timer
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Time's up!
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const endGame = async () => {
    console.log('Ending challenge game');
    setGameEnded(true);
    gameStartedRef.current = false;
    
    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Update best score if needed
    const bestIQ = Math.max(gameData?.maxScore || 0, currentIQ);
    if (currentIQ > (gameData?.maxScore || 0)) {
      await updateGameData({ maxScore: currentIQ });
    }
    
    // Show settlement modal
    setTimeout(() => {
      setShowSettlement(true);
    }, 500);
  };

  const handleTilesClear = (clearedPositions) => {
    if (!gameStarted || gameEnded) return;
    
    console.log('Challenge tiles cleared:', clearedPositions.length);
    
    // Add points
    const newIQ = currentIQ + POINTS_PER_CLEAR;
    setCurrentIQ(newIQ);
    setClearsCount(prev => prev + 1);
    
    // Haptic feedback
    if (settings?.hapticsEnabled !== false) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    // Check if board is completely cleared
    const newTiles = [...board.tiles];
    clearedPositions.forEach(pos => {
      const index = pos.row * board.width + pos.col;
      newTiles[index] = 0;
    });
    
    const remainingTiles = newTiles.filter(tile => tile > 0);
    if (remainingTiles.length === 0) {
      // Board completely cleared - generate new board immediately
      console.log('Board cleared! Generating new board...');
      setTimeout(() => {
        if (gameStarted && !gameEnded) {
          generateNewBoard();
        }
      }, 800); // Small delay for visual feedback
    } else {
      // Update current board
      setBoard({ ...board, tiles: newTiles });
    }
  };

  const handleBackToHome = () => {
    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    router.replace('/');
  };

  const handlePlayAgain = () => {
    setShowSettlement(false);
    // Reset will happen automatically due to useFocusEffect
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!board) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Preparing Challenge...</Text>
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
          <Text style={styles.modeTitle}>Challenge Mode</Text>
          <View style={styles.statsRow}>
            <Text style={styles.timer}>
              ⏱️ {formatTime(timeLeft)}
            </Text>
            <Text style={styles.score}>
              🧠 IQ: {currentIQ}
            </Text>
            <Text style={styles.clears}>
              🎯 Clears: {clearsCount}
            </Text>
          </View>
        </View>
        
        <View style={styles.headerRight} />
      </View>

      {/* Game Board */}
      <GameBoard
        tiles={board.tiles}
        width={board.width}
        height={board.height}
        onTilesClear={handleTilesClear}
        disabled={!gameStarted || gameEnded}
        settings={settings}
        isChallenge={true}
      />

      {/* Start Game Overlay */}
      {!gameStarted && !gameEnded && (
        <View style={styles.startOverlay}>
          <View style={styles.startCard}>
            <Ionicons name="timer" size={60} color="#FF9800" />
            <Text style={styles.startTitle}>Challenge Mode</Text>
            <Text style={styles.startDescription}>
              You have 60 seconds to clear as many rectangles as possible!
            </Text>
            <Text style={styles.startRules}>
              • Each clear = +3 IQ points{'\n'}
              • Boards refresh automatically when cleared{'\n'}
              • Aim for the highest IQ score!
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

      {/* Settlement Modal */}
      <Modal 
        visible={showSettlement} 
        transparent 
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.settlementModal}>
            <Ionicons name="trophy" size={60} color="#FFD700" />
            <Text style={styles.settlementTitle}>Challenge Complete!</Text>
            
            <View style={styles.finalStats}>
              <Text style={styles.finalIQ}>Final IQ: {currentIQ}</Text>
              <Text style={styles.finalTitle}>{getIQTitle(currentIQ)}</Text>
              <Text style={styles.finalClears}>Total Clears: {clearsCount}</Text>
              
              {currentIQ > (gameData?.maxScore || 0) && (
                <Text style={styles.newRecord}>🎉 New Personal Best!</Text>
              )}
            </View>
            
            <View style={styles.settlementButtons}>
              <TouchableOpacity 
                style={styles.playAgainButton}
                onPress={handlePlayAgain}
              >
                <Text style={styles.playAgainButtonText}>Play Again</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.homeButton}
                onPress={handleBackToHome}
              >
                <Text style={styles.homeButtonText}>Back to Home</Text>
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
  modeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF9800',
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timer: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E91E63',
  },
  score: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  clears: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
  },
  headerRight: {
    width: 60,
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
  startCard: {
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
  startTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 12,
  },
  startDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  startRules: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  startButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 16,
    paddingHorizontal: 32,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  settlementModal: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    minWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  settlementTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 20,
  },
  finalStats: {
    alignItems: 'center',
    marginBottom: 30,
  },
  finalIQ: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  finalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF9800',
    marginBottom: 12,
  },
  finalClears: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  newRecord: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E91E63',
    marginTop: 8,
  },
  settlementButtons: {
    flexDirection: 'row',
    gap: 12,
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