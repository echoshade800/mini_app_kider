/**
 * GameBoard Component - Interactive puzzle board with touch selection
 * Purpose: Render game tiles and handle rectangle selection gestures
 * Features: Touch gestures, visual feedback, sum calculation, tile clearing
 */

import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  PanResponder, 
  Dimensions, 
  StyleSheet,
  Animated 
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useGameStore } from '../store/gameStore';

const { width: screenWidth } = Dimensions.get('window');
const BOARD_PADDING = 20;
const BOARD_WIDTH = screenWidth - BOARD_PADDING * 2;

export function GameBoard({ board, onTilesClear, disabled = false }) {
  const { settings } = useGameStore();
  const [selection, setSelection] = useState(null);
  const [animatingTiles, setAnimatingTiles] = useState(new Set());
  const boardRef = useRef();
  const selectionOpacity = useRef(new Animated.Value(0)).current;

  if (!board || !board.tiles) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading board...</Text>
      </View>
    );
  }

  const { width, height, tiles } = board;
  const cellSize = Math.min(
    (BOARD_WIDTH - 40) / width, 
    40
  );
  const boardPixelWidth = width * cellSize;
  const boardPixelHeight = height * cellSize;

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled,
    onMoveShouldSetPanResponder: () => !disabled,

    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      const startCol = Math.floor(locationX / cellSize);
      const startRow = Math.floor(locationY / cellSize);
      
      if (startCol >= 0 && startCol < width && startRow >= 0 && startRow < height) {
        setSelection({
          startRow,
          startCol,
          endRow: startRow,
          endCol: startCol,
        });
        
        Animated.timing(selectionOpacity, {
          toValue: 0.3,
          duration: 100,
          useNativeDriver: false,
        }).start();
      }
    },

    onPanResponderMove: (evt) => {
      if (!selection) return;
      
      const { locationX, locationY } = evt.nativeEvent;
      const endCol = Math.max(0, Math.min(width - 1, Math.floor(locationX / cellSize)));
      const endRow = Math.max(0, Math.min(height - 1, Math.floor(locationY / cellSize)));
      
      setSelection(prev => ({
        ...prev,
        endRow,
        endCol,
      }));
    },

    onPanResponderRelease: () => {
      if (selection && !disabled) {
        handleSelectionComplete();
      }
    },
  });

  const handleSelectionComplete = async () => {
    if (!selection) return;

    const selectedTiles = getSelectedTiles();
    const sum = selectedTiles.reduce((acc, tile) => acc + tile.value, 0);
    const tilePositions = selectedTiles.map(tile => ({ row: tile.row, col: tile.col }));

    if (sum === 10) {
      // Success - green highlight and clear
      if (settings?.hapticsEnabled !== false) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      
      // Animate success
      Animated.sequence([
        Animated.timing(selectionOpacity, {
          toValue: 0.6,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(selectionOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start(() => {
        setSelection(null);
        onTilesClear(tilePositions);
      });

    } else {
      // Failure - blue highlight and vibrate
      if (settings?.hapticsEnabled !== false) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      
      Animated.sequence([
        Animated.timing(selectionOpacity, {
          toValue: 0.4,
          duration: 150,
          useNativeDriver: false,
        }),
        Animated.timing(selectionOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: false,
        }),
      ]).start(() => {
        setSelection(null);
      });
    }
  };

  const getSelectedTiles = () => {
    if (!selection) return [];
    
    const { startRow, startCol, endRow, endCol } = selection;
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);
    
    const selectedTiles = [];
    
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const index = row * width + col;
        const value = tiles[index];
        if (value > 0) {
          selectedTiles.push({ row, col, value, index });
        }
      }
    }
    
    return selectedTiles;
  };

  const getSelectionStyle = () => {
    if (!selection) return null;
    
    const { startRow, startCol, endRow, endCol } = selection;
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);
    
    const selectedTiles = getSelectedTiles();
    const sum = selectedTiles.reduce((acc, tile) => acc + tile.value, 0);
    const isSuccess = sum === 10;
    
    return {
      position: 'absolute',
      left: minCol * cellSize,
      top: minRow * cellSize,
      width: (maxCol - minCol + 1) * cellSize,
      height: (maxRow - minRow + 1) * cellSize,
      backgroundColor: isSuccess ? '#4CAF50' : '#2196F3',
      opacity: selectionOpacity,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: isSuccess ? '#45a049' : '#1976D2',
    };
  };

  const getSelectionSum = () => {
    if (!selection) return null;
    
    const selectedTiles = getSelectedTiles();
    const sum = selectedTiles.reduce((acc, tile) => acc + tile.value, 0);
    
    if (selectedTiles.length === 0) return null;
    
    const { startRow, startCol, endRow, endCol } = selection;
    const maxRow = Math.max(startRow, endRow);
    const maxCol = Math.max(startCol, endCol);
    
    return {
      sum,
      style: {
        position: 'absolute',
        left: maxCol * cellSize + cellSize - 20,
        top: maxRow * cellSize + cellSize - 20,
        backgroundColor: sum === 10 ? '#4CAF50' : '#2196F3',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        minWidth: 20,
        alignItems: 'center',
      }
    };
  };

  const renderTile = (value, row, col) => {
    const index = row * width + col;
    const isAnimating = animatingTiles.has(index);
    
    if (value === 0) {
      return (
        <View 
          key={`${row}-${col}`}
          style={[
            styles.cell,
            { width: cellSize, height: cellSize }
          ]} 
        />
      );
    }

    return (
      <View 
        key={`${row}-${col}`}
        style={[
          styles.cell,
          styles.tile,
          { 
            width: cellSize, 
            height: cellSize,
            opacity: isAnimating ? 0.5 : 1,
            transform: isAnimating ? [{ scale: 1.1 }] : [{ scale: 1 }]
          }
        ]}
      >
        <Text style={[
          styles.tileText,
          { fontSize: cellSize * 0.4 }
        ]}>
          {value}
        </Text>
      </View>
    );
  };

  const selectionStyle = getSelectionStyle();
  const selectionSum = getSelectionSum();

  return (
    <View style={styles.container}>
      <View 
        style={[
          styles.board,
          {
            width: boardPixelWidth,
            height: boardPixelHeight,
          }
        ]}
        ref={boardRef}
        {...panResponder.panHandlers}
      >
        {/* Render tiles */}
        {tiles.map((value, index) => {
          const row = Math.floor(index / width);
          const col = index % width;
          return renderTile(value, row, col);
        })}
        
        {/* Selection overlay */}
        {selectionStyle && (
          <Animated.View style={selectionStyle} />
        )}
        
        {/* Selection sum */}
        {selectionSum && (
          <View style={selectionSum.style}>
            <Text style={styles.sumText}>{selectionSum.sum}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingContainer: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  board: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#2E7D32',
    padding: 8,
    borderRadius: 8,
    borderWidth: 4,
    borderColor: '#8D6E63',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cell: {
    margin: 1,
    borderRadius: 4,
  },
  tile: {
    backgroundColor: '#FFF9C4',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  tileText: {
    fontWeight: 'bold',
    color: '#333',
  },
  sumText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});