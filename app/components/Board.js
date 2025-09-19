import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  PanResponder, 
  StyleSheet,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useBoardSizing } from '../hooks/useBoardSizing';

/**
 * Overflow-proof Board component using measurement-driven math
 * Pure flex layout with no absolute positioning
 */
const Board = ({ 
  tiles, 
  width, 
  height, 
  onTilesClear, 
  disabled = false,
  itemMode = null,
  onTileClick = null,
  selectedSwapTile = null,
  settings = {},
  headerHeight = 120
}) => {
  const N = Math.max(width, height); // Use larger dimension for square board
  const { boardOuter, boardInner, cellSize, fontSize, slack, constants } = useBoardSizing(N, headerHeight);
  const { GAP, BOARD_PAD, FRAME } = constants;
  
  const [selection, setSelection] = useState(null);
  const [hoveredTiles, setHoveredTiles] = useState(new Set());
  const [explosionAnimation, setExplosionAnimation] = useState(null);
  
  const selectionOpacity = useRef(new Animated.Value(0)).current;
  const explosionScale = useRef(new Animated.Value(0)).current;
  const explosionOpacity = useRef(new Animated.Value(0)).current;
  const tileScales = useRef(new Map()).current;

  // Early return if sizing not ready
  if (!cellSize || !boardOuter) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading board...</Text>
      </View>
    );
  }

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
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handleTilePress = (row, col, value) => {
    console.log('🎯 handleTilePress called:', { row, col, value, disabled, itemMode });
    
    if (disabled || value === 0) return;
    
    if (itemMode && onTileClick) {
      console.log('🎯 Calling onTileClick with:', { row, col, value });
      onTileClick(row, col, value);
    }
    
    if (settings?.hapticsEnabled !== false) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleSelectionComplete = () => {
    if (!selection) return;

    const selectedTiles = getSelectedTiles();
    const sum = selectedTiles.reduce((acc, tile) => acc + tile.value, 0);
    const tilePositions = selectedTiles.map(tile => ({ row: tile.row, col: tile.col }));

    console.log('🎯 Selection complete:', { selectedTiles: selectedTiles.length, sum });

    if (sum === 10 && selectedTiles.length > 0) {
      // Success - create explosion effect
      if (settings?.hapticsEnabled !== false) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      // Calculate explosion center position
      const { startRow, startCol, endRow, endCol } = selection;
      const centerRow = (startRow + endRow) / 2;
      const centerCol = (startCol + endCol) / 2;
      
      // Convert grid position to pixel position
      const centerX = centerCol * (cellSize + GAP) + cellSize / 2;
      const centerY = centerRow * (cellSize + GAP) + cellSize / 2;
      
      console.log('🎯 Explosion at:', { centerX, centerY });
      setExplosionAnimation({ x: centerX, y: centerY });
      
      // Explosion animation - yellow "10" note
      explosionScale.setValue(0.5);
      explosionOpacity.setValue(1);
      
      Animated.parallel([
        Animated.timing(explosionScale, {
          toValue: 2.0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(explosionOpacity, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setExplosionAnimation(null);
      });
      
      // Selection box animation - bright green glow
      Animated.sequence([
        Animated.timing(selectionOpacity, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(selectionOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: false,
        }),
      ]).start(() => {
        setSelection(null);
        onTilesClear(tilePositions);
      });
      
    } else if (selectedTiles.length > 0) {
      // Failure - blue feedback
      if (settings?.hapticsEnabled !== false) {
        Haptics.selectionAsync();
      }
      
      Animated.sequence([
        Animated.timing(selectionOpacity, {
          toValue: 0.4,
          duration: 150,
          useNativeDriver: false,
        }),
        Animated.timing(selectionOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start(() => {
        setSelection(null);
      });
    } else {
      setSelection(null);
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
        if (row >= 0 && row < height && col >= 0 && col < width) {
          const index = row * width + col;
          const value = tiles[index];
          if (value > 0) {
            selectedTiles.push({ row, col, value, index });
          }
        }
      }
    }
    return selectedTiles;
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !itemMode && !disabled,
    onMoveShouldSetPanResponder: () => !itemMode && !disabled,

    onPanResponderGrant: (evt) => {
      if (itemMode) return; // 道具模式下不处理拖拽
      
      const { locationX, locationY } = evt.nativeEvent;
      
      console.log('🎯 Touch Start Debug:', {
        locationX, locationY,
        cellSize, GAP,
        boardDimensions: { width, height }
      });
      
      // 计算相对于棋盘内容区的坐标
      const relativeX = locationX;
      const relativeY = locationY;
      
      // 转换为网格位置
      const col = Math.floor(relativeX / (cellSize + GAP));
      const row = Math.floor(relativeY / (cellSize + GAP));
      
      console.log('🎯 Grid Calculation:', {
        relativeX, relativeY,
        calculatedRow: row, calculatedCol: col,
        cellPlusGap: cellSize + GAP,
        boardSize: { width, height }
      });
      
      if (row >= 0 && row < height && col >= 0 && col < width) {
        setSelection({
          startRow: row,
          startCol: col,
          endRow: row,
          endCol: col,
        });
        
        Animated.timing(selectionOpacity, {
          toValue: 0.6,
          duration: 80,
          useNativeDriver: false,
        }).start();
      }
    },

    onPanResponderMove: (evt) => {
      if (!selection) return;
      if (itemMode) return; // 道具模式下不处理拖拽
      
      const { locationX, locationY } = evt.nativeEvent;
      
      // 计算相对于棋盘内容区的坐标
      const relativeX = locationX;
      const relativeY = locationY;
      
      // 转换为网格位置
      const col = Math.floor(relativeX / (cellSize + GAP));
      const row = Math.floor(relativeY / (cellSize + GAP));
      
      if (row >= 0 && row < height && col >= 0 && col < width) {
        setSelection(prev => ({
          ...prev,
          endRow: row,
          endCol: col,
        }));
        
        // Update hovered tiles
        const currentSelectedTiles = getSelectedTiles();
        const newHoveredSet = new Set(currentSelectedTiles.map(tile => tile.index));
        
        const sum = currentSelectedTiles.reduce((acc, tile) => acc + tile.value, 0);
        const targetScale = sum === 10 ? 1.1 : 1.05;
        
        currentSelectedTiles.forEach(tile => {
          if (!hoveredTiles.has(tile.index)) {
            scaleTile(tile.index, targetScale);
          }
        });
        
        hoveredTiles.forEach(index => {
          if (!newHoveredSet.has(index)) {
            scaleTile(index, 1);
          }
        });
        
        setHoveredTiles(newHoveredSet);
      }
    },

    onPanResponderRelease: () => {
      if (selection && !disabled) {
        handleSelectionComplete();
      }
      
      hoveredTiles.forEach(index => {
        scaleTile(index, 1);
      });
      setHoveredTiles(new Set());
    },
  });

  const renderTile = (value, row, col) => {
    const index = row * width + col;
    
    // 空位不渲染任何内容
    if (value === 0) {
      return (
        <View 
          key={`${row}-${col}`}
          style={[
            styles.cell,
            {
              width: cellSize,
              height: cellSize,
            }
          ]}
        />
      );
    }

    const tileScale = initTileScale(index);
    const isSelected = selectedSwapTile && selectedSwapTile.index === index;
    const isInSelection = hoveredTiles.has(index);
    
    let cellStyle = [
      styles.cell,
      styles.tileCell,
      {
        width: cellSize,
        height: cellSize,
      }
    ];
    
    if (isSelected && itemMode) {
      if (itemMode === 'swapMaster') {
        cellStyle.push(styles.tileSwapSelected);
      } else if (itemMode === 'fractalSplit') {
        cellStyle.push(styles.tileFractalSelected);
      }
    }

    return (
      <Animated.View
        key={`${row}-${col}`}
        style={[
          cellStyle,
          {
            transform: [{ scale: tileScale }],
          }
        ]}
        onStartShouldSetResponder={itemMode ? () => true : () => false}
        onResponderGrant={itemMode ? () => {
          console.log('🎯 Tile touch granted:', { row, col, value, itemMode });
          handleTilePress(row, col, value);
        } : undefined}
        pointerEvents={itemMode ? "auto" : "box-none"}
      >
        <Text 
          style={[
            styles.tileText,
            { 
              fontSize: Math.max(12, fontSize),
              fontWeight: isInSelection ? 'bold' : 'normal',
            }
          ]}
          allowFontScaling={false}
          maxFontSizeMultiplier={1}
          includeFontPadding={false}
        >
          {value}
        </Text>
      </Animated.View>
    );
  };

  const renderRow = (rowIndex) => {
    const rowTiles = [];
    for (let col = 0; col < width; col++) {
      const index = rowIndex * width + col;
      const value = tiles[index] || 0;
      rowTiles.push(renderTile(value, rowIndex, col));
    }

    return (
      <View key={rowIndex} style={[styles.row, { gap: GAP }]}>
        {rowTiles}
      </View>
    );
  };

  const rows = [];
  for (let row = 0; row < height; row++) {
    rows.push(renderRow(row));
  }

  // Selection overlay calculation
  let selectionOverlay = null;
  let selectionSum = null;
  
  if (selection) {
    const { startRow, startCol, endRow, endCol } = selection;
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);
    
    const selectedTiles = getSelectedTiles();
    const sum = selectedTiles.reduce((acc, tile) => acc + tile.value, 0);
    const isSuccess = sum === 10;
    
    const overlayLeft = minCol * (cellSize + GAP);
    const overlayTop = minRow * (cellSize + GAP);
    const overlayWidth = (maxCol - minCol + 1) * cellSize + (maxCol - minCol) * GAP;
    const overlayHeight = (maxRow - minRow + 1) * cellSize + (maxRow - minRow) * GAP;
    
    selectionOverlay = (
      <Animated.View
        style={[
          styles.selectionOverlay,
          {
            left: overlayLeft,
            top: overlayTop,
            width: overlayWidth,
            height: overlayHeight,
            backgroundColor: isSuccess ? 'rgba(24, 197, 110, 0.3)' : 'rgba(33, 150, 243, 0.2)',
            borderColor: isSuccess ? '#18C56E' : '#2F80ED',
            opacity: selectionOpacity,
          }
        ]}
        pointerEvents="none"
      />
    );
    
    // Selection sum display
    if (selectedTiles.length > 0) {
      const centerX = overlayLeft + overlayWidth / 2;
      const centerY = overlayTop + overlayHeight / 2;
      
      selectionSum = (
        <View
          style={[
            styles.selectionSum,
            {
              left: centerX - 25,
              top: centerY - 20,
              backgroundColor: isSuccess ? '#FFEB3B' : '#2196F3',
              borderColor: isSuccess ? '#F57F17' : '#1976D2',
            }
          ]}
          pointerEvents="none"
        >
          <Text style={[
            styles.sumText,
            { color: isSuccess ? '#333' : '#fff' }
          ]}>
            {sum}
          </Text>
        </View>
      );
    }
  }

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.boardFrame,
          {
            width: boardOuter,
            height: boardOuter,
          }
        ]}
      >
        <View
          {...panResponder.panHandlers}
          style={[
            styles.boardContent,
            {
              margin: FRAME + BOARD_PAD,
              paddingRight: slack.right,
              paddingBottom: slack.bottom,
              gap: GAP,
            }
          ]}
        >
          {rows}
          {selectionOverlay}
          {selectionSum}
          
          {/* Explosion effect */}
          {explosionAnimation && (
            <Animated.View
              style={[
                styles.explosion,
                {
                  left: explosionAnimation.x - 40,
                  top: explosionAnimation.y - 30,
                  transform: [{ scale: explosionScale }],
                  opacity: explosionOpacity,
                }
              ]}
              pointerEvents="none"
            >
              <View style={styles.explosionNote}>
                <Text style={styles.explosionText}>10</Text>
              </View>
            </Animated.View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  boardFrame: {
    backgroundColor: '#1E5A3C', // Deep green chalkboard
    borderRadius: 16,
    borderWidth: 8,
    borderColor: '#8B5A2B', // Wooden frame
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },
  boardContent: {
    flex: 1,
    flexDirection: 'column',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    overflow: 'hidden',
  },
  tileCell: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF9E6', // Cream white sticky note
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: {
      width: 0.5,
      height: 0.5,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  tileSwapSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  tileFractalSelected: {
    backgroundColor: '#F3E5F5',
    borderColor: '#9C27B0',
  },
  tileText: {
    fontWeight: 'normal',
    color: '#111',
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  selectionOverlay: {
    position: 'absolute',
    borderRadius: 8,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  selectionSum: {
    position: 'absolute',
    width: 50,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  sumText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  explosion: {
    position: 'absolute',
    width: 80,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  explosionNote: {
    width: 80,
    height: 60,
    backgroundColor: '#FFEB3B', // Yellow sticky note
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#F57F17',
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  explosionText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
});

export default Board;