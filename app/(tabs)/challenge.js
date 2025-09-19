/**
 * Challenge Mode Screen - 60-second timed gameplay with IQ scoring
 * Purpose: Fast-paced puzzle solving with automatic board refresh
 * Features: Timer, IQ scoring, continuous board generation, rescue system
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  Alert,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGameStore } from '../store/gameStore';
import { generateBoard } from '../utils/boardGenerator';
import GameBoard from '../components/GameBoard';
import RescueModal from '../components/RescueModal';

const CHALLENGE_TIME = 60; // 60 seconds
const POINTS_PER_CLEAR = 3; // +3 IQ per clear

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
  const [gameState, setGameState] = useState('start'); // 'start', 'playing', 'finished'
  const [timeLeft, setTimeLeft] = useState(CHALLENGE_TIME);
  const [currentIQ, setCurrentIQ] = useState(0);
  const [board, setBoard] = useState(null);
  const [showRescueModal, setShowRescueModal] = useState(false);
  const [reshuffleCount, setReshuffleCount] = useState(0);
  const [hasInitialCheck, setHasInitialCheck] = useState(false);
  
  // Refs
  const timerRef = useRef(null);
  const gameStartTimeRef = useRef(null);

  // Initialize board
  useEffect(() => {
    if (gameState === 'playing' && !board) {
      generateNewBoard();
    }
  }, [gameState]);

  // Timer logic
  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleGameEnd();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [gameState, timeLeft]);

  const generateNewBoard = () => {
    const newBoard = generateBoard(100, true, true); // 挑战模式：高数量方块
    setBoard(newBoard);
    setHasInitialCheck(false); // 重置初始检查状态
  };

  const handleStartGame = () => {
    setGameState('playing');
    setTimeLeft(CHALLENGE_TIME);
    setCurrentIQ(0);
    setReshuffleCount(0);
    gameStartTimeRef.current = Date.now();
    generateNewBoard();
  };

  const handleTilesClear = (clearedPositions) => {
    // 奖励分数
    const newIQ = currentIQ + POINTS_PER_CLEAR;
    setCurrentIQ(newIQ);
    
    // 成功消除后重置重排计数
    setReshuffleCount(0);

    // 更新棋盘：移除被清除的方块
    if (board) {
      const newTiles = [...board.tiles];
      clearedPositions.forEach(pos => {
        const index = pos.row * board.width + pos.col;
        newTiles[index] = 0;
      });
      
      // 检查棋盘是否完全清空
      const remainingTiles = newTiles.filter(tile => tile > 0).length;
      
      if (remainingTiles === 0) {
        // 棋盘完全清空 - 短暂延迟后生成新棋盘（挑战模式特有）
        setTimeout(() => {
          generateNewBoard();
        }, 500);
      } else {
        // 更新当前棋盘状态
        setBoard(prev => ({
          ...prev,
          tiles: newTiles
        }));
        
        // 重置校准计数（挑战模式消除成功后）
        setReshuffleCount(0);
      }
    }
  };

  const handleGameEnd = () => {
    setGameState('finished');
    
    // Clear timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Update best score if needed
    const currentBest = gameData?.maxScore || 0;
    if (currentIQ > currentBest) {
      updateGameData({ maxScore: currentIQ });
    }
  };

  const handleBackToHome = () => {
    // Clear timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    router.replace('/');
  };

  const handlePlayAgain = () => {
    setGameState('start');
    setBoard(null);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Start screen
  if (gameState === 'start') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBackToHome}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Challenge Mode</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.startContainer}>
          <View style={styles.challengeIcon}>
            <Ionicons name="timer" size={80} color="#FF9800" />
          </View>
          
          <Text style={styles.challengeTitle}>60-Second IQ Challenge</Text>
          <Text style={styles.challengeDescription}>
            Clear as many rectangles as possible in 60 seconds!{'\n\n'}
            • Each clear awards +3 IQ points{'\n'}
            • Boards refresh automatically when cleared{'\n'}
            • Beat your best IQ score!
          </Text>
          
          <View style={styles.bestScoreContainer}>
            <Text style={styles.bestScoreLabel}>Your Best IQ</Text>
            <Text style={styles.bestScoreValue}>{gameData?.maxScore || 0}</Text>
            <Text style={styles.bestScoreTitle}>
              {getIQTitle(gameData?.maxScore || 0)}
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.startButton}
            onPress={handleStartGame}
          >
            <Ionicons name="play" size={24} color="white" />
            <Text style={styles.startButtonText}>Start Challenge</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Game screen
  if (gameState === 'playing') {
    return (
      <SafeAreaView style={styles.container}>
        {/* HUD */}
        <View style={styles.hud}>
          <View style={styles.hudLeft}>
            <TouchableOpacity 
              style={styles.pauseButton}
              onPress={handleBackToHome}
            >
              <Ionicons name="pause" size={20} color="#666" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.hudCenter}>
            <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
            <Text style={styles.iqText}>IQ: {currentIQ}</Text>
          </View>
          
          <View style={styles.hudRight}>
            <Text style={styles.targetText}>Target: 10</Text>
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
            isChallenge={true}
            reshuffleCount={reshuffleCount}
            setReshuffleCount={setReshuffleCount}
            onRescueNeeded={() => setShowRescueModal(true)}
            layoutConfig={board.layoutConfig}
          />
        )}

        {/* Rescue Modal */}
        <RescueModal
          visible={showRescueModal}
          onContinue={() => {
            setShowRescueModal(false);
            generateNewBoard(); // Generate new board as rescue
          }}
          onReturn={() => {
            setShowRescueModal(false);
            handleBackToHome();
          }}
        />
      </SafeAreaView>
    );
  }

  // Results screen
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.resultsContainer}>
        <View style={styles.resultsIcon}>
          <Ionicons name="trophy" size={80} color="#FFD700" />
        </View>
        
        <Text style={styles.resultsTitle}>Challenge Complete!</Text>
        
        <View style={styles.scoreCard}>
          <Text style={styles.finalIQLabel}>Final IQ Score</Text>
          <Text style={styles.finalIQValue}>{currentIQ}</Text>
          <Text style={styles.finalIQTitle}>{getIQTitle(currentIQ)}</Text>
          
          {currentIQ > (gameData?.maxScore || 0) && (
            <View style={styles.newRecordBadge}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={styles.newRecordText}>New Record!</Text>
            </View>
          )}
        </View>
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Best IQ</Text>
            <Text style={styles.statValue}>
              {Math.max(currentIQ, gameData?.maxScore || 0)}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Clears</Text>
            <Text style={styles.statValue}>{Math.floor(currentIQ / POINTS_PER_CLEAR)}</Text>
          </View>
        </View>
        
        <View style={styles.resultsButtons}>
          <TouchableOpacity 
            style={styles.playAgainButton}
            onPress={handlePlayAgain}
          >
            <Ionicons name="refresh" size={20} color="white" />
            <Text style={styles.playAgainButtonText}>Play Again</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.homeButton}
            onPress={handleBackToHome}
          >
            <Ionicons name="home" size={20} color="#666" />
            <Text style={styles.homeButtonText}>Home</Text>
          </TouchableOpacity>
        </View>
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
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  startContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  challengeIcon: {
    marginBottom: 20,
  },
  challengeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  challengeDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  bestScoreContainer: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bestScoreLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  bestScoreValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF9800',
    marginBottom: 4,
  },
  bestScoreTitle: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9800',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    gap: 8,
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  hud: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  hudLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  hudCenter: {
    flex: 2,
    alignItems: 'center',
  },
  hudRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  pauseButton: {
    padding: 8,
  },
  timerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  iqText: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  targetText: {
    fontSize: 14,
    color: '#666',
  },
  resultsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  resultsIcon: {
    marginBottom: 20,
  },
  resultsTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 30,
  },
  scoreCard: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    minWidth: 280,
  },
  finalIQLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  finalIQValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FF9800',
    marginBottom: 8,
  },
  finalIQTitle: {
    fontSize: 18,
    color: '#333',
    fontWeight: '600',
    marginBottom: 12,
  },
  newRecordBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  newRecordText: {
    fontSize: 14,
    color: '#E65100',
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 30,
  },
  statItem: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    minWidth: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  resultsButtons: {
    gap: 12,
    alignItems: 'center',
  },
  playAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  playAgainButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 8,
  },
  homeButtonText: {
    color: '#666',
    fontSize: 16,
  },
});