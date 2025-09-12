/**
 * Challenge Mode Screen - 60-second timed gameplay
 * Purpose: Fast-paced IQ challenge with scoring and leaderboard
 * Features: Timer, bomb animation, IQ scoring, settlement dialog
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  SafeAreaView,
  Modal,
  Animated
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGameStore } from '../store/gameStore';
import { GameBoard } from '../components/GameBoard';
import { generateBoard } from '../utils/boardGenerator';

const CHALLENGE_DURATION = 60000; // 60 seconds

export default function ChallengeScreen() {
  const { gameData, updateGameData } = useGameStore();
  const [gameState, setGameState] = useState('ready'); // ready, playing, finished
  const [currentIQ, setCurrentIQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(CHALLENGE_DURATION);
  const [currentBoard, setCurrentBoard] = useState(null);
  const [showResults, setShowResults] = useState(false);
  
  const timerRef = useRef();
  const fuseAnimation = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (gameState === 'playing') {
      startTimer();
      startFuseAnimation();
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
        if (prev <= 1000) {
          endChallenge();
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);
  };

  const startFuseAnimation = () => {
    Animated.timing(fuseAnimation, {
      toValue: 0,
      duration: CHALLENGE_DURATION,
      useNativeDriver: false,
    }).start();
  };

  const startChallenge = () => {
    setGameState('playing');
    setCurrentIQ(0);
    setTimeLeft(CHALLENGE_DURATION);
    fuseAnimation.setValue(1);
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
    // Use high difficulty (level 130+)
    const challengeLevel = 130 + Math.floor(Math.random() * 20);
    const board = generateBoard(challengeLevel);
    setCurrentBoard(board);
  };

  const handleTilesClear = (clearedPositions) => {
    if (gameState !== 'playing') return;
    
    // Award 3 IQ points per clear
    setCurrentIQ(prev => prev + 3);
    
    // Generate new board immediately
    generateNewBoard();
  };

  const handleBackToHome = () => {
    setShowResults(false);
    setGameState('ready');
    router.push('/');
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

  const formatTime = (milliseconds) => {
    const seconds = Math.ceil(milliseconds / 1000);
    return `${seconds}s`;
  };

  const fuseWidth = fuseAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const fuseColor = fuseAnimation.interpolate({
    inputRange: [0, 0.3, 0.7, 1],
    outputRange: ['#F44336', '#FF9800', '#FFC107', '#4CAF50'],
  });

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
            New boards appear instantly after each clear.
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
      {/* Game Header */}
      <View style={styles.gameHeader}>
        {/* Bomb and Fuse */}
        <View style={styles.bombContainer}>
          <Ionicons name="radio-button-on" size={32} color="#333" />
          <View style={styles.fuseContainer}>
            <Animated.View
              style={[
                styles.fuse,
                {
                  width: fuseWidth,
                  backgroundColor: fuseColor,
                },
              ]}
            />
          </View>
          <View style={styles.spark} />
        </View>
        
        {/* IQ Score */}
        <View style={styles.scoreContainer}>
          <Text style={styles.iqLabel}>IQ:</Text>
          <Text style={styles.iqScore}>{currentIQ}</Text>
        </View>
      </View>

      {/* Timer */}
      <View style={styles.timerContainer}>
        <Text style={styles.timerText}>
          {formatTime(timeLeft)}
        </Text>
      </View>

      {/* Game Board */}
      {currentBoard && (
        <GameBoard 
          board={currentBoard}
          onTilesClear={handleTilesClear}
          disabled={gameState !== 'playing'}
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
            <Text style={styles.resultsTitle}>Time's Up!</Text>
            
            <View style={styles.finalScore}>
              <Text style={styles.finalIQ}>Final IQ: {currentIQ}</Text>
              <Text style={styles.finalTitle}>{getIQTitle(currentIQ)}</Text>
              
              {currentIQ > (gameData?.maxScore || 0) && (
                <Text style={styles.newRecord}>🎉 New Personal Best!</Text>
              )}
            </View>
            
            <TouchableOpacity 
              style={styles.okButton}
              onPress={handleBackToHome}
            >
              <Text style={styles.okButtonText}>OK</Text>
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
    backgroundColor: '#f0f8ff',
  },
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
  fuseContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#FFCCBC',
    borderRadius: 4,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  fuse: {
    height: '100%',
    borderRadius: 4,
  },
  spark: {
    width: 6,
    height: 6,
    backgroundColor: '#FFC107',
    borderRadius: 3,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF5722',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  iqLabel: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  iqScore: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  timerContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  timerText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF5722',
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
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
    color: '#FF5722',
    marginBottom: 8,
  },
  finalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4a90e2',
    textAlign: 'center',
  },
  newRecord: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 12,
  },
  okButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  okButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});