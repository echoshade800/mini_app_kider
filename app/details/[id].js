/**
 * Level Detail Screen - Individual level gameplay with board and controls
 * Purpose: Play specific levels with progress tracking and item usage
 * Features: Board generation, swap mode, progress saving, item management
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  Alert,
  Modal,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GameBoard } from '../components/GameBoard';
import { useGameStore } from '../store/gameStore';
import { generateBoard } from '../utils/boardGenerator';
import { STAGE_NAMES } from '../utils/stageNames';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function LevelDetailScreen() {
  const { id } = useLocalSearchParams();
  const level = parseInt(id);
  
  const { gameData, updateGameData } = useGameStore();
  const [board, setBoard] = useState(null);
  const [swapMode, setSwapMode] = useState(false);
  const [firstSwapTile, setFirstSwapTile] = useState(null);
  const [showVictory, setShowVictory] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [buttonAreas, setButtonAreas] = useState([]);
  
  // Refs for button layout tracking
  const backButtonRef = useRef(null);
  const changeButtonRef = useRef(null);

  useEffect(() => {
    if (level && level > 0) {
      const generatedBoard = generateBoard(level);
      setBoard(generatedBoard);
      setIsCompleted(level <= (gameData?.maxLevel || 0));
    }
  }, [level, gameData?.maxLevel]);

  // Track button layouts
  const handleBackButtonLayout = (event) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    backButtonRef.current?.measureInWindow((pageX, pageY, width, height) => {
      const newButtonAreas = buttonAreas.filter(area => area.name !== 'backButton');
      newButtonAreas.push({
        name: 'backButton',
        x: pageX,
        y: pageY,
        width,
        height
      });
      setButtonAreas(newButtonAreas);
    });
  };

  const handleChangeButtonLayout = (event) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    changeButtonRef.current?.measureInWindow((pageX, pageY, width, height) => {
      const newButtonAreas = buttonAreas.filter(area => area.name !== 'changeButton');
      newButtonAreas.push({
        name: 'changeButton',
        x: pageX,
        y: pageY,
        width,
        height
      });
      setButtonAreas(newButtonAreas);
    });
  };

  const handleTilesClear = async (clearedPositions) => {
    if (!board) return;

    // Create new board with cleared tiles
    const newTiles = [...board.tiles];
    clearedPositions.forEach(pos => {
      const index = pos.row * board.width + pos.col;
      newTiles[index] = 0;
    });

    const updatedBoard = { ...board, tiles: newTiles };
    setBoard(updatedBoard);

    // Check if level is completed (all tiles cleared)
    const hasRemainingTiles = newTiles.some(tile => tile > 0);
    
    if (!hasRemainingTiles) {
      // Level completed!
      const newMaxLevel = Math.max(gameData?.maxLevel || 0, level);
      const newChangeItems = (gameData?.changeItems || 0) + 1;
      
      await updateGameData({
        maxLevel: newMaxLevel,
        changeItems: newChangeItems,
        lastPlayedLevel: level,
      });
      
      setShowVictory(true);
      setIsCompleted(true);
    }
  };

  const handleTileClick = (row, col) => {
    if (!swapMode || !board) return;

    const clickedTile = { row, col, value: board.tiles[row * board.width + col] };

    if (!firstSwapTile) {
      // First tile selection
      if (clickedTile.value === 0) return; // Can't select empty tile
      setFirstSwapTile(clickedTile);
    } else {
      // Second tile selection - perform swap
      if (clickedTile.value === 0) return; // Can't select empty tile
      
      if (firstSwapTile.row === clickedTile.row && firstSwapTile.col === clickedTile.col) {
        // Clicked same tile, cancel selection
        setFirstSwapTile(null);
        return;
      }

      // Perform the swap
      const newTiles = [...board.tiles];
      const firstIndex = firstSwapTile.row * board.width + firstSwapTile.col;
      const secondIndex = clickedTile.row * board.width + clickedTile.col;
      
      // Swap the values
      const temp = newTiles[firstIndex];
      newTiles[firstIndex] = newTiles[secondIndex];
      newTiles[secondIndex] = temp;

      setBoard({ ...board, tiles: newTiles });
      setFirstSwapTile(null);
      setSwapMode(false);
    }
  };

  const handleUseChangeItem = async () => {
    const currentChangeItems = gameData?.changeItems || 0;
    
    if (currentChangeItems <= 0) {
      Alert.alert('No Change Items', 'You need Change items to swap tiles. Complete levels to earn more!');
      return;
    }

    if (swapMode) {
      // Cancel swap mode
      setSwapMode(false);
      setFirstSwapTile(null);
    } else {
      // Enter swap mode and deduct item
      await updateGameData({
        changeItems: currentChangeItems - 1,
      });
      setSwapMode(true);
      setFirstSwapTile(null);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleNextLevel = () => {
    const nextLevel = level + 1;
    router.replace(`/details/${nextLevel}`);
  };

  const handleRestart = () => {
    const newBoard = generateBoard(level, true); // Force new seed
    setBoard(newBoard);
    setSwapMode(false);
    setFirstSwapTile(null);
    setShowVictory(false);
  };

  if (!board) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading level {level}...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const stageName = STAGE_NAMES[level] || `Level ${level}`;
  const currentChangeItems = gameData?.changeItems || 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          ref={backButtonRef}
          style={styles.backButton}
          onPress={handleBack}
          onLayout={handleBackButtonLayout}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <View style={styles.levelInfo}>
          <Text style={styles.levelNumber}>Level {level}</Text>
          <Text style={styles.stageName} numberOfLines={1}>{stageName}</Text>
        </View>
        
        <View style={styles.placeholder} />
      </View>

      {/* Game Board */}
      <View style={styles.gameContainer}>
        <GameBoard 
          board={board}
          onTilesClear={handleTilesClear}
          onTileClick={handleTileClick}
          swapMode={swapMode}
          firstSwapTile={firstSwapTile}
          buttonAreas={buttonAreas}
        />
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity 
          ref={changeButtonRef}
          style={[
            styles.changeButton,
            swapMode && styles.changeButtonActive,
            currentChangeItems <= 0 && styles.changeButtonDisabled
          ]}
          onPress={handleUseChangeItem}
          onLayout={handleChangeButtonLayout}
          disabled={currentChangeItems <= 0 && !swapMode}
        >
          <Ionicons 
            name="swap-horizontal" 
            size={20} 
            color={swapMode ? 'white' : (currentChangeItems <= 0 ? '#ccc' : '#4CAF50')} 
          />
          <Text style={[
            styles.changeButtonText,
            swapMode && styles.changeButtonTextActive,
            currentChangeItems <= 0 && styles.changeButtonTextDisabled
          ]}>
            {swapMode ? 'Cancel' : 'Change'}
          </Text>
          <Text style={[
            styles.changeItemCount,
            swapMode && styles.changeItemCountActive,
            currentChangeItems <= 0 && styles.changeItemCountDisabled
          ]}>
            {currentChangeItems}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.restartButton}
          onPress={handleRestart}
        >
          <Ionicons name="refresh" size={20} color="#FF9800" />
          <Text style={styles.restartButtonText}>Restart</Text>
        </TouchableOpacity>
      </View>

      {/* Victory Modal */}
      <Modal
        visible={showVictory}
        transparent
        animationType="fade"
        onRequestClose={() => setShowVictory(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.victoryModal}>
            <Ionicons name="trophy" size={60} color="#FFD700" />
            <Text style={styles.victoryTitle}>Level Complete!</Text>
            <Text style={styles.victoryText}>
              Congratulations! You've completed {stageName}
            </Text>
            <Text style={styles.rewardText}>
              +1 Change Item earned!
            </Text>
            
            <View style={styles.victoryButtons}>
              <TouchableOpacity 
                style={styles.nextButton}
                onPress={handleNextLevel}
              >
                <Text style={styles.nextButtonText}>Next Level</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.backToMenuButton}
                onPress={() => {
                  setShowVictory(false);
                  router.back();
                }}
              >
                <Text style={styles.backToMenuButtonText}>Back to Menu</Text>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  levelInfo: {
    flex: 1,
    alignItems: 'center',
  },
  levelNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  stageName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  placeholder: {
    width: 40,
  },
  gameContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 16,
  },
  changeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#4CAF50',
    backgroundColor: 'white',
  },
  changeButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#45a049',
  },
  changeButtonDisabled: {
    borderColor: '#ccc',
    backgroundColor: '#f5f5f5',
  },
  changeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
    marginLeft: 8,
    marginRight: 8,
  },
  changeButtonTextActive: {
    color: 'white',
  },
  changeButtonTextDisabled: {
    color: '#ccc',
  },
  changeItemCount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 24,
    textAlign: 'center',
  },
  changeItemCountActive: {
    color: '#4CAF50',
    backgroundColor: 'white',
  },
  changeItemCountDisabled: {
    color: '#ccc',
    backgroundColor: '#f0f0f0',
  },
  restartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FF9800',
    backgroundColor: 'white',
  },
  restartButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF9800',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  victoryModal: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  victoryTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 16,
    marginBottom: 8,
  },
  victoryText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  rewardText: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '600',
    marginBottom: 24,
  },
  victoryButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  nextButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  backToMenuButton: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backToMenuButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
});