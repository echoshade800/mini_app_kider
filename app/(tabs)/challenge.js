/**
 * Challenge Mode Screen - 60-second timed gameplay
 * Purpose: Fast-paced IQ challenge with scoring and leaderboard
 * Extend: Add power-ups, multipliers, or different time modes
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  Modal,
  Animated,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGameStore } from '../store/gameStore';
import { GameBoard } from '../components/GameBoard';
import { generateBoard } from '../utils/boardGenerator';

const CHALLENGE_DURATION = 60000; // 60 seconds

export default function ChallengeScreen() {
  const { gameData, updateGameData, settings, updateSettings } = useGameStore();
  const [gameState, setGameState] = useState('ready'); // ready, playing, finished
  const [currentIQ, setCurrentIQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(CHALLENGE_DURATION);
  const [currentBoard, setCurrentBoard] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
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
    try {
      setGameState('playing');
      setCurrentIQ(0);
      setTimeLeft(CHALLENGE_DURATION);
      fuseAnimation.setValue(1);
      generateChallengeBoard();
    } catch (error) {
      console.error('Failed to start challenge:', error);
      Alert.alert('Start Failed', 'Unable to start challenge mode, please try again');
    }
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

  const generateChallengeBoard = () => {
    // 使用高难度关卡生成棋盘，但确保铺满
    const challengeLevel = 100 + Math.floor(Math.random() * 50);
    const board = generateBoard(challengeLevel, true); // forceNewSeed = true
    setCurrentBoard(board);
  };

  const handleTilesClear = (clearedPositions) => {
    if (gameState !== 'playing') return;
    
    // Award 3 IQ points per clear
    setCurrentIQ(prev => prev + 3);
    
    // Update board with cleared tiles (same as level mode)
    const newTiles = [...currentBoard.tiles];
    clearedPositions.forEach(pos => {
      const index = pos.row * currentBoard.width + pos.col;
      newTiles[index] = 0;
    });
    
    // Check if board is completely cleared
    const hasRemainingTiles = newTiles.some(tile => tile > 0);
    
    if (!hasRemainingTiles) {
      // Board completely cleared - generate new board
      setTimeout(() => {
        generateChallengeBoard();
      }, 1000);
    } else {
      // Update board with cleared tiles
      setCurrentBoard(prev => ({ ...prev, tiles: newTiles }));
    }
  };

  const handleBackToHome = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setShowResults(false);
    setGameState('ready');
    router.replace('/');
  };

  const handleSettings = () => {
    setShowSettings(true);
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
      {/* Top Header with Settings and IQ */}
      <View style={styles.topHeader}>
        {/* Settings Button */}
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={handleSettings}
        >
          <View style={styles.settingsIcon}>
            <Ionicons name="settings" size={24} color="#333" />
          </View>
        </TouchableOpacity>
        
        {/* IQ Display with Burning Fuse */}
        <View style={styles.iqContainer}>
          <View style={styles.iqCapsule}>
            <Text style={styles.iqText}>IQ: {currentIQ}</Text>
          </View>
          
          {/* Burning Fuse Effect */}
          <View style={styles.fuseContainer}>
            <View style={styles.bomb}>
              <Ionicons name="radio-button-on" size={20} color="#333" />
            </View>
            <View style={styles.fuseTrack}>
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
            <View style={styles.spark}>
              <Ionicons name="flame" size={12} color="#FF5722" />
            </View>
          </View>
        </View>
      </View>

      {/* Back Button */}
      <View style={styles.backButtonContainer}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBackToHome}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Game Board - Same as Level Mode */}
      {currentBoard && (
        <GameBoard 
          board={currentBoard}
          onTilesClear={handleTilesClear}
          disabled={gameState !== 'playing'}
        />
      )}

      {/* Settings Modal */}
      <Modal
        visible={showSettings}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.settingsModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Settings</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowSettings(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Sound Effects</Text>
                <TouchableOpacity
                  style={[styles.toggle, settings?.soundEnabled && styles.toggleActive]}
                  onPress={() => updateSettings({ soundEnabled: !settings?.soundEnabled })}
                >
                  <View style={[styles.toggleThumb, settings?.soundEnabled && styles.toggleThumbActive]} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Haptic Feedback</Text>
                <TouchableOpacity
                  style={[styles.toggle, settings?.hapticsEnabled && styles.toggleActive]}
                  onPress={() => updateSettings({ hapticsEnabled: !settings?.hapticsEnabled })}
                >
                  <View style={[styles.toggleThumb, settings?.hapticsEnabled && styles.toggleThumbActive]} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

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
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    backgroundColor: 'white',
  },
  settingsButton: {
    marginTop: 4,
  },
  settingsIcon: {
    width: 48,
    height: 32,
    backgroundColor: '#FFD700',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  iqContainer: {
    alignItems: 'flex-end',
  },
  iqCapsule: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  iqText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  fuseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  bomb: {
    marginRight: 4,
  },
  fuseTrack: {
    width: 120,
    height: 6,
    backgroundColor: '#FFCCBC',
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: 4,
  },
  fuse: {
    height: '100%',
    borderRadius: 3,
  },
  spark: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonContainer: {
    position: 'absolute',
    top: 80,
    left: 16,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsModal: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ccc',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: '#4CAF50',
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
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