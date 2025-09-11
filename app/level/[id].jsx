import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  SafeAreaView,
  Alert,
  Modal
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGameStore } from '../store/gameStore';
import { TopBar } from '../components/TopBar';
import { GameBoard } from '../components/GameBoard';
import { SettingsModal } from '../components/SettingsModal';

export default function LevelScreen() {
  const { id } = useLocalSearchParams();
  const level = parseInt(id);
  
  const { 
    loadBoard, 
    completeLevel, 
    useChangeItem,
    progress,
    currentBoard,
    isLoading 
  } = useGameStore();
  
  const [showSettings, setShowSettings] = useState(false);
  const [showLevelComplete, setShowLevelComplete] = useState(false);
  const [gameBoard, setGameBoard] = useState(null);
  const [clearedTiles, setClearedTiles] = useState(new Set());

  useEffect(() => {
    loadLevel();
  }, [level]);

  const loadLevel = async () => {
    try {
      const board = await loadBoard(level);
      setGameBoard(board);
      setClearedTiles(new Set());
    } catch (error) {
      Alert.alert('Error', 'Failed to load level');
    }
  };

  const handleTilesClear = (tilePositions) => {
    if (!gameBoard) return;

    // Create new board with cleared tiles
    const newTiles = [...gameBoard.tiles];
    const newClearedSet = new Set(clearedTiles);
    
    tilePositions.forEach(({ row, col }) => {
      const index = row * gameBoard.width + col;
      newTiles[index] = 0;
      newClearedSet.add(index);
    });

    const updatedBoard = { ...gameBoard, tiles: newTiles };
    setGameBoard(updatedBoard);
    setClearedTiles(newClearedSet);

    // Check if level is complete (no non-zero tiles remaining)
    const hasRemainingTiles = newTiles.some(tile => tile > 0);
    
    if (!hasRemainingTiles) {
      setTimeout(() => {
        setShowLevelComplete(true);
      }, 500);
    }
  };

  const handleUseChange = async () => {
    if (progress.changeItems <= 0) {
      Alert.alert('No Change Items', 'You need change items to use this feature. Complete more levels to earn them!');
      return;
    }

    const success = await useChangeItem();
    if (success) {
      // Here you would implement the tile swapping logic
      Alert.alert('Change Used', 'Select two tiles to swap their positions.');
    } else {
      Alert.alert('Failed', 'Could not use change item. Try again.');
    }
  };

  const handleNextLevel = async () => {
    try {
      await completeLevel(level);
      setShowLevelComplete(false);
      router.replace(`/level/${level + 1}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to save progress');
    }
  };

  const handleTryAgain = () => {
    router.back();
  };

  const getLevelName = () => {
    if (level <= 200) {
      return `Level ${level}`;
    }
    return `Level 200+${level - 200}`;
  };

  const getStageName = () => {
    if (level <= 200) {
      // This should come from API, but showing placeholder for now
      return 'Adventure Stage';
    }
    return `The Last Horizon+${level - 200}`;
  };

  const getProgressPercent = () => {
    if (level <= 10) return (level / 10) * 100;
    if (level <= 50) return ((level - 10) / 40) * 100;
    if (level <= 100) return ((level - 50) / 50) * 100;
    return Math.min(((level - 100) / 100) * 100, 100);
  };

  if (isLoading || !gameBoard) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading level {level}...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TopBar
        onSettingsPress={() => setShowSettings(true)}
        title={`${getLevelName()} | ${getStageName()}`}
        subtitle={`Change: ${progress.changeItems}`}
        showProgress
        progressPercent={getProgressPercent()}
        rightText={level > 200 ? 'Beyond' : `Grade ${Math.ceil(level / 20)}`}
      />

      <GameBoard 
        board={gameBoard}
        onTilesClear={handleTilesClear}
      />

      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={[
            styles.changeButton,
            progress.changeItems <= 0 && styles.changeButtonDisabled
          ]}
          onPress={handleUseChange}
          disabled={progress.changeItems <= 0}
        >
          <Ionicons name="swap-horizontal" size={20} color="white" />
          <Text style={styles.changeButtonText}>
            Change ({progress.changeItems})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Level Complete Modal */}
      <Modal
        visible={showLevelComplete}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.completeModal}>
            <Ionicons name="trophy" size={60} color="#FFD700" />
            <Text style={styles.completeTitle}>
              {getLevelName()} Cleared!
            </Text>
            <Text style={styles.completeSubtitle}>
              Excellent work! Ready for the next challenge?
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.nextButton}
                onPress={handleNextLevel}
              >
                <Text style={styles.nextButtonText}>Next Level</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <SettingsModal 
        visible={showSettings}
        onClose={() => setShowSettings(false)}
      />
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
  actionsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  changeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  changeButtonDisabled: {
    backgroundColor: '#ccc',
  },
  changeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeModal: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    width: '80%',
    maxWidth: 300,
  },
  completeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  completeSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    width: '100%',
  },
  nextButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  nextButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});