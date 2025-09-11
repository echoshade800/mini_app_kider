import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  SafeAreaView,
  Modal
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGameStore } from './store/gameStore';
import { GameBoard } from './components/GameBoard';
import { FuseTimer } from './components/FuseTimer';

const CHALLENGE_DURATION = 60000; // 60 seconds

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
  const { 
    loadChallengeBoard, 
    completeChallenge,
    currentBoard 
  } = useGameStore();
  
  const [gameState, setGameState] = useState('loading'); // loading, playing, finished
  const [currentIQ, setCurrentIQ] = useState(0);
  const [gameBoard, setGameBoard] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [timeLeft, setTimeLeft] = useState(CHALLENGE_DURATION);
  
  const timerRef = useRef();

  useEffect(() => {
    startChallenge();
  }, []);

  useEffect(() => {
    if (gameState === 'playing') {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1000) {
            endChallenge();
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [gameState]);

  const startChallenge = async () => {
    try {
      const board = await loadChallengeBoard();
      setGameBoard(board);
      setCurrentIQ(0);
      setGameState('playing');
      setTimeLeft(CHALLENGE_DURATION);
    } catch (error) {
      console.error('Failed to start challenge:', error);
    }
  };

  const endChallenge = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    setGameState('finished');
    
    try {
      await completeChallenge(currentIQ);
    } catch (error) {
      console.warn('Failed to save challenge result:', error);
    }
    
    setShowResults(true);
  };

  const handleTilesClear = async (tilePositions) => {
    if (gameState !== 'playing') return;
    
    // Award 3 IQ points for each successful clear
    const newIQ = currentIQ + 3;
    setCurrentIQ(newIQ);

    // Generate new board after each clear
    try {
      const newBoard = await loadChallengeBoard();
      setGameBoard(newBoard);
    } catch (error) {
      console.error('Failed to load new challenge board:', error);
    }
  };

  const handleBackToHome = () => {
    router.replace('/');
  };

  const formatTime = (milliseconds) => {
    const seconds = Math.ceil(milliseconds / 1000);
    return `${seconds}s`;
  };

  if (gameState === 'loading' || !gameBoard) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Preparing challenge...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <FuseTimer 
          duration={CHALLENGE_DURATION}
          onComplete={endChallenge}
          isPaused={gameState !== 'playing'}
        />
        <View style={styles.scoreContainer}>
          <Text style={styles.iqLabel}>IQ:</Text>
          <Text style={styles.iqScore}>{currentIQ}</Text>
        </View>
      </View>

      <View style={styles.timerContainer}>
        <Text style={styles.timerText}>
          {formatTime(timeLeft)}
        </Text>
      </View>

      <GameBoard 
        board={gameBoard}
        onTilesClear={handleTilesClear}
        disabled={gameState !== 'playing'}
      />

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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