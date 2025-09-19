/**
 * Level Detail Screen - Individual level gameplay
 * Purpose: Play specific levels with progress tracking and item usage
 * Features: Level-specific boards, item usage, progress saving, rescue system
 */

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  Alert,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGameStore } from '../store/gameStore';
import { GameBoard } from '../components/GameBoard';
import { generateBoard } from '../utils/boardGenerator';
import { hasValidCombinations, isBoardEmpty } from '../utils/gameLogic';
import { STAGE_NAMES } from '../utils/stageNames';
import RescueModal from '../components/RescueModal';

export default function LevelDetailScreen() {
  const { id } = useLocalSearchParams();
  const level = parseInt(id);
  
  const { gameData, updateGameData } = useGameStore();
  
  const [board, setBoard] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showRescue, setShowRescue] = useState(false);
  const [itemMode, setItemMode] = useState(null);
  const [selectedSwapTile, setSelectedSwapTile] = useState(null);
  const [swapAnimations, setSwapAnimations] = useState(new Map());
  const [fractalAnimations, setFractalAnimations] = useState(new Map());

  // Initialize board
  useEffect(() => {
    if (level && level > 0) {
      const newBoard = generateBoard(level, false, false);
      setBoard(newBoard);
      
      // 🎯 调试命令：计算并记录棋盘格尺寸数据
      if (newBoard && newBoard.layoutConfig) {
        console.log('📏 关卡模式棋盘格尺寸数据:');
        console.log(`  棋盘格行数: ${newBoard.layoutConfig.rows}`);
        console.log(`  棋盘格列数: ${newBoard.layoutConfig.cols}`);
        console.log(`  棋盘总宽度: ${newBoard.layoutConfig.boardWidth}px`);
        console.log(`  棋盘总高度: ${newBoard.layoutConfig.boardHeight}px`);
        console.log(`  单个方块尺寸: ${newBoard.layoutConfig.tileSize}px`);
        console.log(`  数字方块矩形宽度: ${newBoard.layoutConfig.tilesRectWidth}px`);
        console.log(`  数字方块矩形高度: ${newBoard.layoutConfig.tilesRectHeight}px`);
        console.log(`  棋盘格总数: ${newBoard.layoutConfig.rows * newBoard.layoutConfig.cols}`);
      }
    }
  }, [level]);

  const handleTilesClear = (clearedPositions) => {
    if (!board) return;

    // Create new tiles array with cleared positions set to 0
    const newTiles = [...board.tiles];
    clearedPositions.forEach(pos => {
      const index = pos.row * board.width + pos.col;
      newTiles[index] = 0;
    });

    // Update board
    const updatedBoard = { ...board, tiles: newTiles };
    setBoard(updatedBoard);

    // Check if level is completed
    if (isBoardEmpty(newTiles)) {
      setIsCompleted(true);
      
      // Update progress
      const newMaxLevel = Math.max(gameData?.maxLevel || 1, level + 1);
      const newSwapMasterItems = (gameData?.swapMasterItems || 0) + 1;
      
      updateGameData({
        maxLevel: newMaxLevel,
        swapMasterItems: newSwapMasterItems,
        lastPlayedLevel: level,
      });

      // Show completion message
      setTimeout(() => {
        Alert.alert(
          'Level Complete!',
          `Congratulations! You've completed ${STAGE_NAMES[level] || `Level ${level}`}.\n\n+1 SwapMaster item earned!`,
          [
            { text: 'Next Level', onPress: () => router.push(`/details/${level + 1}`) },
            { text: 'Back to Levels', onPress: () => router.back() }
          ]
        );
      }, 1000);
    } else {
      // Check if there are valid combinations left
      setTimeout(() => {
        if (!hasValidCombinations(newTiles, board.width, board.height)) {
          setShowRescue(true);
        }
      }, 500);
    }
  };

  const handleItemUse = (itemType) => {
    if (itemType === 'swapMaster') {
      if ((gameData?.swapMasterItems || 0) <= 0) {
        Alert.alert('No Items', 'You don\'t have any SwapMaster items.');
        return;
      }
      
      setItemMode('swapMaster');
      setSelectedSwapTile(null);
    } else if (itemType === 'fractalSplit') {
      if ((gameData?.splitItems || 0) <= 0) {
        Alert.alert('No Items', 'You don\'t have any Split items.');
        return;
      }
      
      setItemMode('fractalSplit');
    }
  };

  const handleTileClick = (row, col, value) => {
    if (itemMode === 'swapMaster') {
      if (!selectedSwapTile) {
        // Select first tile
        setSelectedSwapTile({ row, col, value });
      } else {
        // Swap with second tile
        const newTiles = [...board.tiles];
        const index1 = selectedSwapTile.row * board.width + selectedSwapTile.col;
        const index2 = row * board.width + col;
        
        // Perform swap
        const temp = newTiles[index1];
        newTiles[index1] = newTiles[index2];
        newTiles[index2] = temp;
        
        // Update board
        setBoard({ ...board, tiles: newTiles });
        
        // Consume item
        updateGameData({
          swapMasterItems: (gameData?.swapMasterItems || 0) - 1,
        });
        
        // Reset mode
        setItemMode(null);
        setSelectedSwapTile(null);
      }
    } else if (itemMode === 'fractalSplit') {
      if (value > 1) {
        // Split the number
        const newTiles = [...board.tiles];
        const index = row * board.width + col;
        
        // Replace with two smaller numbers that sum to original
        const half = Math.floor(value / 2);
        const remainder = value - half;
        
        newTiles[index] = half;
        
        // Find empty spot for remainder
        const emptyIndex = newTiles.findIndex(tile => tile === 0);
        if (emptyIndex !== -1) {
          newTiles[emptyIndex] = remainder;
        }
        
        // Update board
        setBoard({ ...board, tiles: newTiles });
        
        // Consume item
        updateGameData({
          splitItems: (gameData?.splitItems || 0) - 1,
        });
        
        // Reset mode
        setItemMode(null);
      } else {
        Alert.alert('Cannot Split', 'Cannot split a tile with value 1.');
      }
    }
  };

  const handleRescueContinue = () => {
    // Generate new board
    const newBoard = generateBoard(level, false, false);
    setBoard(newBoard);
    setShowRescue(false);
  };

  const handleRescueReturn = () => {
    setShowRescue(false);
    router.back();
  };

  const handleBack = () => {
    router.back();
  };

  const stageName = STAGE_NAMES[level] || `Level ${level}`;

  if (!board) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
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
          onPress={handleBack}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.levelTitle}>{stageName}</Text>
          <Text style={styles.levelNumber}>Level {level}</Text>
        </View>
        
        <View style={styles.placeholder} />
      </View>

      {/* Game Board */}
      {board && (
        <GameBoard
          tiles={board.tiles}
          width={board.width}
          height={board.height}
          onTilesClear={handleTilesClear}
          disabled={isCompleted}
          itemMode={itemMode}
          onTileClick={handleTileClick}
          selectedSwapTile={selectedSwapTile}
          swapAnimations={swapAnimations}
          fractalAnimations={fractalAnimations}
          layoutConfig={board.layoutConfig}
        />
      )}

      {/* Bottom Controls */}
      <View style={styles.bottomControls}>
        <View style={styles.itemsContainer}>
          <TouchableOpacity
            style={[
              styles.itemButton,
              itemMode === 'swapMaster' && styles.itemButtonActive
            ]}
            onPress={() => handleItemUse('swapMaster')}
            disabled={isCompleted}
          >
            <Ionicons name="swap-horizontal" size={20} color="#fff" />
            <Text style={styles.itemButtonText}>
              SwapMaster ({gameData?.swapMasterItems || 0})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.itemButton,
              styles.splitButton,
              itemMode === 'fractalSplit' && styles.itemButtonActive
            ]}
            onPress={() => handleItemUse('fractalSplit')}
            disabled={isCompleted}
          >
            <Ionicons name="cut" size={20} color="#fff" />
            <Text style={styles.itemButtonText}>
              Split ({gameData?.splitItems || 0})
            </Text>
          </TouchableOpacity>
        </View>
        
        {itemMode && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              setItemMode(null);
              setSelectedSwapTile(null);
            }}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Rescue Modal */}
      <RescueModal
        visible={showRescue}
        onContinue={handleRescueContinue}
        onReturn={handleRescueReturn}
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  levelTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  levelNumber: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  placeholder: {
    width: 40,
  },
  bottomControls: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  itemsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  itemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 140,
    justifyContent: 'center',
  },
  splitButton: {
    backgroundColor: '#9C27B0',
  },
  itemButtonActive: {
    backgroundColor: '#FF9800',
  },
  itemButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  cancelButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: '#f44336',
    borderRadius: 6,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});