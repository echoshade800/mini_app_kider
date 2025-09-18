/**
 * Challenge Mode Screen - 60-second timed gameplay with IQ scoring
 * Purpose: Fast-paced puzzle solving with score tracking
 * Features: Timer, dynamic boards, IQ calculation, leaderboard
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

export default function ChallengeScreen() {
  const { gameData, updateGameData, settings } = useGameStore();
  
  const [board, setBoard] = useState(null);
  const [gameState, setGameState] = useState('ready'); // ready, playing, completed
  const [timeLeft, setTimeLeft] = useState(60);
  const [currentIQ, setCurrentIQ] = useState(0);
  const [showRescueModal, setShowRescueModal] = useState(false);
  const [reshuffleCount, setReshuffleCount] = useState(0);
  
  const timerRef = useRef(null);
  const tileScales = useRef(new Map()).current;

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

  // Generate new challenge board
  const generateNewBoard = () => {
    const newBoard = generateChallengeBoard();
    setBoard(newBoard);
  };

  // Start game
  const startGame = () => {
    setGameState('playing');
    setTimeLeft(60);
    setCurrentIQ(0);
    generateNewBoard();
    
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
  };

  // End game
  const endGame = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setGameState('completed');
    
    // Update best score
    const newMaxScore = Math.max(gameData?.maxScore || 0, currentIQ);
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
    
    // Award IQ points
    const points = clearedPositions.length * 3;
    setCurrentIQ(prev => prev + points);
    
    // Generate new board immediately
    setTimeout(() => {
      generateNewBoard();
    }, 500);
  };

  // Handle back button
  const handleBack = () => {
    if (gameState === 'playing') {
      Alert.alert(
        'End Game?',
        'Are you sure you want to end the current game?',
        [
          { text: 'Continue', style: 'cancel' },
          { 
            text: 'End Game', 
            style: 'destructive',
            onPress: () => {
              endGame();
              router.back();
            }
          }
        ]
      );
    } else {
      router.back();
    }
  };

  // Handle restart
  const handleRestart = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    startGame();
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentIQTitle = getIQTitle(currentIQ);
  const bestIQ = gameData?.maxScore || 0;
  const bestIQTitle = getIQTitle(bestIQ);

  if (gameState === 'ready') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.readyContainer}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBack}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>

          <View style={styles.readyContent}>
            <Ionicons name="timer" size={80} color="#FF9800" />
            <Text style={styles.readyTitle}>Challenge Mode</Text>
            <Text style={styles.readySubtitle}>60-Second IQ Sprint</Text>
            
            <View style={styles.rulesContainer}>
              <Text style={styles.rulesTitle}>How to Play:</Text>
              <Text style={styles.ruleText}>• Draw rectangles that sum to 10</Text>
              <Text style={styles.ruleText}>• Each clear awards +3 IQ points</Text>
              <Text style={styles.ruleText}>• New boards appear instantly</Text>
              <Text style={styles.ruleText}>• Beat your best IQ score!</Text>
            </View>

            <View style={styles.statsContainer}>
              <Text style={styles.statsTitle}>Your Best</Text>
              <Text style={styles.bestIQ}>{bestIQ} IQ</Text>
              <Text style={styles.bestTitle}>{bestIQTitle}</Text>
            </View>

            <TouchableOpacity 
              style={styles.startButton}
              onPress={startGame}
            >
              <Text style={styles.startButtonText}>Start Challenge</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (gameState === 'completed') {
    const isNewRecord = currentIQ > bestIQ;
    
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.completedContainer}>
          <Ionicons 
            name={isNewRecord ? "trophy" : "medal"} 
            size={80} 
            color={isNewRecord ? "#FFD700" : "#C0C0C0"} 
          />
          <Text style={styles.completedTitle}>
            {isNewRecord ? "New Record!" : "Challenge Complete!"}
          </Text>
          
          <View style={styles.scoreContainer}>
            <Text style={styles.finalIQ}>{currentIQ} IQ</Text>
            <Text style={styles.finalTitle}>{currentIQTitle}</Text>
            {isNewRecord && (
              <Text style={styles.recordText}>Personal Best!</Text>
            )}
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={handleBack}
            >
              <Text style={styles.secondaryButtonText}>Back</Text>
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

        <View style={styles.timerContainer}>
          <Text style={[
            styles.timer,
            timeLeft <= 10 && styles.timerWarning
          ]}>
            {formatTime(timeLeft)}
          </Text>
        </View>

        <View style={styles.iqContainer}>
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
          disabled={false}
          settings={settings}
          itemMode={null}
          onTileClick={null}
          selectedSwapTile={null}
          swapAnimations={new Map()}
          fractalAnimations={new Map()}
          initTileScale={initTileScale}
          getTileRotation={getTileRotation}
          scaleTile={scaleTile}
          isChallenge={true}
          onBoardRefresh={null}
          showRescueModal={showRescueModal}
          setShowRescueModal={setShowRescueModal}
          reshuffleCount={reshuffleCount}
          setReshuffleCount={setReshuffleCount}
        />
      )}

      {/* Progress Info */}
      <View style={styles.progressBar}>
        <Text style={styles.progressText}>
          Current: {currentIQTitle}
        </Text>
        <Text style={styles.progressBest}>
          Best: {bestIQ} IQ ({bestIQTitle})
        </Text>
      </View>
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
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  readyContent: {
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
    alignSelf: 'stretch',
  },
  rulesTitle: {
    fontSize: 16,
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
  statsContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  statsTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  bestIQ: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF9800',
    marginBottom: 4,
  },
  bestTitle: {
    fontSize: 16,
    color: '#666',
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
  completedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  completedTitle: {
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
  finalIQ: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FF9800',
    marginBottom: 8,
  },
  finalTitle: {
    fontSize: 20,
    color: '#666',
    marginBottom: 8,
  },
  recordText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
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
  timerContainer: {
    alignItems: 'center',
  },
  timer: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  timerWarning: {
    color: '#f44336',
  },
  iqContainer: {
    alignItems: 'center',
  },
  iqLabel: {
    fontSize: 12,
    color: '#666',
  },
  iqValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  progressBar: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  progressText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  progressBest: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});