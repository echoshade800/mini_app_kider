/**
 * Challenge Mode Screen - 60-second timed gameplay with IQ scoring
 * Purpose: Fast-paced number elimination with score tracking
 * Features: Timer, IQ calculation, high score tracking, board refresh
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
import { useGameStore } from '../store/gameStore';
import { generateChallengeBoard } from '../utils/boardGenerator';

const CHALLENGE_TIME = 60; // 60 seconds
const POINTS_PER_CLEAR = 3; // IQ points per successful clear

export default function ChallengeScreen() {
  const { gameData, updateGameData, settings } = useGameStore();
  
  const [gameState, setGameState] = useState('ready'); // ready, playing, finished
  const [timeLeft, setTimeLeft] = useState(CHALLENGE_TIME);
  const [currentIQ, setCurrentIQ] = useState(0);
  const [board, setBoard] = useState(null);
  const [clearsCount, setClearsCount] = useState(0);
  
  const timerRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Generate challenge board
  const generateNewBoard = () => {
    const newBoard = generateChallengeBoard();
    return newBoard;
  };

  const startGame = () => {
    setGameState('playing');
    setTimeLeft(CHALLENGE_TIME);
    setCurrentIQ(0);
    setClearsCount(0);
    setBoard(generateNewBoard());
    
    // Start timer
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Start pulse animation for timer
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const endGame = () => {
    setGameState('finished');
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);

    // Update high score if needed
    const newMaxScore = Math.max(gameData?.maxScore || 0, currentIQ);
    if (newMaxScore > (gameData?.maxScore || 0)) {
      updateGameData({ maxScore: newMaxScore });
      
      if (settings?.hapticsEnabled !== false) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  };

  const handleTilesClear = (clearedPositions) => {
    // Award points
    const newIQ = currentIQ + POINTS_PER_CLEAR;
    setCurrentIQ(newIQ);
    setClearsCount(prev => prev + 1);
    
    // Generate new board immediately
    setTimeout(() => {
      setBoard(generateNewBoard());
    }, 300);
  };

  const handleRestart = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    startGame();
  };

  const handleBack = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  if (gameState === 'ready') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBack}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Challenge Mode</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.readyContainer}>
          <Ionicons name="timer" size={80} color="#E74C3C" />
          <Text style={styles.readyTitle}>60-Second Challenge</Text>
          <Text style={styles.readyDescription}>
            Clear as many rectangles as possible in 60 seconds. Each clear awards +3 IQ points!
          </Text>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Best IQ</Text>
              <Text style={styles.statValue}>{gameData?.maxScore || 0}</Text>
              <Text style={styles.statTitle}>{getIQTitle(gameData?.maxScore || 0)}</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.startButton}
            onPress={startGame}
          >
            <Text style={styles.startButtonText}>Start Challenge</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (gameState === 'finished') {
    const isNewRecord = currentIQ > (gameData?.maxScore || 0);
    
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBack}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Challenge Complete</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.resultsContainer}>
          <Ionicons 
            name={isNewRecord ? "trophy" : "checkmark-circle"} 
            size={80} 
            color={isNewRecord ? "#FFD700" : "#4CAF50"} 
          />
          
          {isNewRecord && (
            <Text style={styles.newRecordText}>🎉 New Record!</Text>
          )}
          
          <Text style={styles.finalIQ}>{currentIQ}</Text>
          <Text style={styles.iqTitle}>{getIQTitle(currentIQ)}</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{clearsCount}</Text>
              <Text style={styles.statLabel}>Clears</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{gameData?.maxScore || 0}</Text>
              <Text style={styles.statLabel}>Best IQ</Text>
            </View>
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
          style={styles.pauseButton}
          onPress={() => {
            Alert.alert(
              'Pause Game',
              'Game will end if you leave. Continue playing?',
              [
                { text: 'End Game', onPress: endGame },
                { text: 'Continue', style: 'cancel' }
              ]
            );
          }}
        >
          <Ionicons name="pause" size={20} color="#666" />
        </TouchableOpacity>

        <Animated.View style={[styles.timerContainer, { transform: [{ scale: pulseAnim }] }]}>
          <Text style={[
            styles.timer,
            timeLeft <= 10 && styles.timerUrgent
          ]}>
            {timeLeft}s
          </Text>
        </Animated.View>

        <View style={styles.scoreContainer}>
          <Text style={styles.iqLabel}>IQ</Text>
          <Text style={styles.iqValue}>{currentIQ}</Text>
        </View>
      </View>

      {/* Game Board */}
      {board && (
        <GameBoard
          tiles={board.tiles}
          width={board.width}
          height={board.height}
          onTilesClear={handleTilesClear}
          isChallenge={true}
          settings={settings}
        />
      )}

      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        <Text style={styles.clearsText}>{clearsCount} clears</Text>
      </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
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
    marginBottom: 16,
  },
  readyDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  statsContainer: {
    alignSelf: 'stretch',
    marginBottom: 40,
  },
  statItem: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E74C3C',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    color: '#999',
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
    fontWeight: '600',
    textAlign: 'center',
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
  pauseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerContainer: {
    alignItems: 'center',
  },
  timer: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E74C3C',
  },
  timerUrgent: {
    color: '#FF4444',
  },
  scoreContainer: {
    alignItems: 'center',
  },
  iqLabel: {
    fontSize: 12,
    color: '#666',
  },
  iqValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  progressContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  clearsText: {
    fontSize: 14,
    color: '#666',
  },
  resultsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  newRecordText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
    marginTop: 16,
    marginBottom: 8,
  },
  finalIQ: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#E74C3C',
    marginTop: 16,
  },
  iqTitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 30,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 40,
  },
  statBox: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    minWidth: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 16,
  },
  primaryButton: {
    backgroundColor: '#E74C3C',
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
    borderColor: '#E74C3C',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  secondaryButtonText: {
    color: '#E74C3C',
    fontSize: 16,
    fontWeight: '600',
  },
});