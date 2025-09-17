/**
 * Challenge Mode Screen - 60-second timed gameplay
 * Purpose: Fast-paced IQ challenge with scoring
 * Features: 60s countdown, IQ scoring, level 170 difficulty
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGameStore } from '../store/gameStore';
import { GameBoard } from '../components/GameBoard';
import { generateBoard } from '../utils/boardGenerator';

const CHALLENGE_DURATION = 60; // 60 seconds

export default function ChallengeScreen() {
  const { gameData, updateGameData } = useGameStore();
  const [gameState, setGameState] = useState('ready'); // ready, playing, finished
  const [currentIQ, setCurrentIQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(CHALLENGE_DURATION);
  const [currentBoard, setCurrentBoard] = useState(null);
  const [showResults, setShowResults] = useState(false);
  
  const timerRef = useRef();

  useEffect(() => {
    if (gameState === 'playing') {
      startTimer();
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

  const startChallenge = () => {
    setGameState('playing');
    setCurrentIQ(0);
    setTimeLeft(CHALLENGE_DURATION);
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
    // Use level 170 configuration for challenge mode
    const board = generateBoard(170, true, true);
    setCurrentBoard(board);
  };

  const handleTilesClear = (clearedPositions) => {
    if (gameState !== 'playing') return;
    
    // Award 3 IQ points per clear
    setCurrentIQ(prev => prev + 3);
    
    // Update board with cleared tiles
    const newTiles = [...currentBoard.tiles];
    clearedPositions.forEach(pos => {
      const index = pos.row * currentBoard.width + pos.col;
      newTiles[index] = 0;
    });
    
    setCurrentBoard(prev => ({ ...prev, tiles: newTiles }));
  };

  const handleBoardRefresh = (action) => {
    if (action === 'refresh') {
      // Generate new board when current board is cleared
      generateNewBoard();
    } else if (action === 'return') {
      // Return to home from rescue modal
      handleReturn();
    } else if (typeof action === 'object') {
      // Updated board from reshuffle
      setCurrentBoard(action);
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

  if (gameState === 'ready') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.readyContainer}>
          <Ionicons name="timer" size={80} color="#FF5722" />
          <Text style={styles.readyTitle}>Challenge Mode</Text>
          <Text style={styles.readySubtitle}>
            60 seconds to maximize your IQ score!
          </Text>
          <Text style={styles.readyDescription}>
            Clear rectangles that sum to 10. Each clear awards +3 IQ points.
            New boards appear when current board is completely cleared.
          </Text>
          
          <TouchableOpacity 
            style={styles.startButton}
            onPress={startChallenge}
          >
            <Text style={styles.startButtonText}>Start Challenge</Text>
          </TouchableOpacity>
          
          <View style={styles.bestScore}>
            <Text style={styles.bestScoreLabel}>Best IQ:</Text>
            <Text style={styles.bestScoreValue}>{gameData?.maxScore || 0}</Text>
            <Text style={styles.bestScoreTitle}>{getIQTitle(gameData?.maxScore || 0)}</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header with Timer and IQ */}
      <View style={styles.gameHeader}>
        <View style={styles.timerContainer}>
          <Ionicons name="time" size={24} color="#FF5722" />
          <Text style={styles.timerText}>{timeLeft}s</Text>
        </View>
        
        <View style={styles.iqContainer}>
          <Text style={styles.iqText}>IQ: {currentIQ}</Text>
        </View>
      </View>

      {/* Game Board */}
      {currentBoard && (
        <GameBoard 
          board={currentBoard}
          onTilesClear={handleTilesClear}
          onBoardRefresh={handleBoardRefresh}
          disabled={gameState !== 'playing'}
          isChallenge={true}
        />
      )}

      {/* Results Modal */}
      <Modal
        visible={showResults}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.resultsModal}>
            <Ionicons name="time" size={60} color="#FF5722" />
            <Text style={styles.resultsTitle}>Time Out!</Text>
            
            <View style={styles.finalScore}>
              <Text style={styles.finalIQ}>IQ: {currentIQ}</Text>
              <Text style={styles.finalTitle}>{getIQTitle(currentIQ)}</Text>
              
              {currentIQ > (gameData?.maxScore || 0) && (
                <Text style={styles.newRecord}>🎉 New Personal Best!</Text>
              )}
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalButton}
                onPress={handleReturn}
              >
                <Text style={styles.modalButtonText}>Return</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.primaryModalButton]}
                onPress={handleAgain}
              >
                <Text style={[styles.modalButtonText, styles.primaryModalButtonText]}>
                  Again
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
  readyContainer: {
    flex: 1, 
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  readyTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 12,
  },
  readySubtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  readyDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  startButton: {
    backgroundColor: '#FF5722',
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
  bestScore: {
    alignItems: 'center',
    marginTop: 40,
  },
  bestScoreLabel: {
    fontSize: 16,
    color: '#666',
  },
  bestScoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF9800',
    marginTop: 4,
  },
  bestScoreTitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  timerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF5722',
    marginLeft: 8,
  },
  iqContainer: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  iqText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976D2',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  resultsTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF5722',
    marginTop: 16,
    marginBottom: 24,
  },
  finalScore: {
    alignItems: 'center',
    marginBottom: 30,
  },
  finalIQ: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 8,
  },
  finalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  newRecord: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF5722',
    minWidth: 100,
    alignItems: 'center',
  },
  primaryModalButton: {
    backgroundColor: '#FF5722',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF5722',
  },
  primaryModalButtonText: {
    color: 'white',
  },
});