/**
 * GameBoard Component - Enhanced interactive puzzle board with swap mode
 * Purpose: Render game tiles with rectangle drawing and item click interactions
 * Features: Rectangle drawing for normal mode, click selection for item modes, explosion effects
 */

import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  PanResponder, 
  Dimensions, 
  StyleSheet,
  Animated,
  TouchableOpacity
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useGameStore } from '../store/gameStore';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export function GameBoard({ 
  board, 
  onTilesClear, 
  onTileClick, 
  itemMode = null, // 'swapMaster' | 'fractalSplit' | null - changes interaction from rectangle drawing to click selection
  selectedSwapTile = null,
  disabled = false,
  swapAnimations,
  fractalAnimations
}) {
  const { settings } = useGameStore();
  const [selection, setSelection] = useState(null);
  const [hoveredTiles, setHoveredTiles] = useState(new Set());
  const [explosionAnimation, setExplosionAnimation] = useState(null);
  
  const selectionOpacity = useRef(new Animated.Value(0)).current;
  const explosionScale = useRef(new Animated.Value(0)).current;
  const explosionOpacity = useRef(new Animated.Value(0)).current;
  const tileScales = useRef({}).current;

  // Cleanup function for animations
  React.useEffect(() => {
    return () => {
      // Stop all animations when component unmounts
      Object.values(tileScales).forEach(anim => {
        if (anim && anim.stopAnimation) {
          anim.stopAnimation();
        }
      });
    };
  }, []);

  if (!board) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading board...</Text>
      </View>
    );
  }

  const { width, height, tiles } = board;
  
  // 简化坐标系统，直接使用棋盘的完整尺寸
  const actualWidth = width;
  const actualHeight = height;
  
  // Calculate cell size for consistent layout
  const cellSize = Math.min(
    (screenWidth - 80) / actualWidth, 
    (screenHeight - 300) / actualHeight,
    50
  );
  
  // Actual tile size with margin
  const tileSize = cellSize * 0.7;
  const tileMargin = (cellSize - tileSize) / 2;
  
  // Board background size
  const boardWidth = actualWidth * cellSize + 20;
  const boardHeight = actualHeight * cellSize + 20;

  // Initialize tile scale animation
  const initTileScale = (index) => {
    if (!tileScales[index]) {
      tileScales[index] = new Animated.Value(1);
    }
    return tileScales[index];
  };

  // Scale tile animation
  const scaleTile = (index, scale) => {
    const tileScale = initTileScale(index);
    if (tileScale) {
      Animated.spring(tileScale, {
        toValue: scale,
        useNativeDriver: true,
        tension: 400,
        friction: 8,
      }).start();
    }
  };

  // 检查触摸点是否在棋盘网格区域内
  const isInsideGridArea = (pageX, pageY) => {
    // 先检查是否在禁止画框的区域
    if (isInRestrictedArea(pageY)) return false;
    
    // 计算棋盘在屏幕上的位置
    const boardCenterX = screenWidth / 2;
    const boardCenterY = screenHeight / 2;
    const boardLeft = boardCenterX - boardWidth / 2;
    const boardTop = boardCenterY - boardHeight / 2;
    
    // 检查是否在棋盘边界内
    if (pageX < boardLeft + 10 || pageX > boardLeft + boardWidth - 10 ||
        pageY < boardTop + 10 || pageY > boardTop + boardHeight - 10) {
      return false;
    }
    
    // 转换为相对于棋盘的坐标
    const relativeX = pageX - boardLeft - 10;
    const relativeY = pageY - boardTop - 10;
    
    // 检查是否在有效的网格区域内
    if (relativeX < 0 || relativeX >= actualWidth * cellSize ||
        relativeY < 0 || relativeY >= actualHeight * cellSize) {
      return false;
    }
    
    // 转换为网格坐标并检查范围
    const col = Math.floor(relativeX / cellSize);
    const row = Math.floor(relativeY / cellSize);
    
    return row >= 0 && row < height && col >= 0 && col < width;
  };

  // 检查是否在禁止画框的区域（顶部和底部）
  const isInRestrictedArea = (pageY) => {
    const topRestrictedHeight = 200; // 顶部200像素禁止画框
    const bottomRestrictedHeight = 200; // 底部200像素禁止画框
    
    return pageY < topRestrictedHeight || 
           pageY > screenHeight - bottomRestrictedHeight;
  };

  const getSelectedTilesForSelection = (sel) => {
    if (!sel) return [];
    
    const { startRow, startCol, endRow, endCol } = sel;
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);
    
    const selectedTiles = [];
    
    // 计算框内所有有数字的方块（支持线条选择）
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

  const getSelectedTiles = () => {
    return getSelectedTilesForSelection(selection);
  };

  const resetSelection = () => {
    setSelection(null);
    selectionOpacity.setValue(0);
    // 恢复所有tile的缩放
    hoveredTiles.forEach(index => {
      scaleTile(index, 1);
    });
    setHoveredTiles(new Set());
  };

  // 全屏触摸响应器
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: (evt) => {
      // Disable rectangle drawing in item mode
      if (itemMode) return false;
      
      // Check if in restricted area
      if (isInRestrictedArea(evt.nativeEvent.pageY)) return false;
      
      const { pageX, pageY } = evt.nativeEvent;
      // Only allow rectangle drawing in grid area
      return !disabled && isInsideGridArea(pageX, pageY);
    },
    onMoveShouldSetPanResponder: (evt) => {
      // Disable rectangle drawing in item mode
      if (itemMode) return false;
      
      // Check if in restricted area
      if (isInRestrictedArea(evt.nativeEvent.pageY)) return false;
      
      const { pageX, pageY } = evt.nativeEvent;
      return !disabled && isInsideGridArea(pageX, pageY);
    },

    onPanResponderGrant: (evt) => {
      const { pageX, pageY } = evt.nativeEvent;
      
      // Double check: ensure in grid area
      if (!isInsideGridArea(pageX, pageY)) return;
      
      // Calculate board position on screen
      const boardCenterX = screenWidth / 2;
      const boardCenterY = screenHeight / 2;
      const boardLeft = boardCenterX - boardWidth / 2;
      const boardTop = boardCenterY - boardHeight / 2;
      
      // Convert to board-relative coordinates
      const relativeX = pageX - boardLeft - 10;
      const relativeY = pageY - boardTop - 10;
      
      // Convert to grid coordinates
      const startCol = Math.floor(relativeX / cellSize);
      const startRow = Math.floor(relativeY / cellSize);
      
      setSelection({
        startRow,
        startCol,
        endRow: startRow,
        endCol: startCol,
      });
      
      // Start selection animation
      Animated.timing(selectionOpacity, {
        toValue: 0.5,
        duration: 80,
        useNativeDriver: false,
      }).start();
    },

    onPanResponderMove: (evt) => {
      if (!selection) return;
      
      const { pageX, pageY } = evt.nativeEvent;
      
      // Calculate board position on screen
      const boardCenterX = screenWidth / 2;
      const boardCenterY = screenHeight / 2;
      const boardLeft = boardCenterX - boardWidth / 2;
      const boardTop = boardCenterY - boardHeight / 2;
      
      // Check if move point is within board area
      if (pageX < boardLeft + 10 || pageX > boardLeft + boardWidth - 10 ||
          pageY < boardTop + 10 || pageY > boardTop + boardHeight - 10) {
        // If moved outside board, keep current selection
        return;
      }
      
      const relativeX = pageX - boardLeft - 10;
      const relativeY = pageY - boardTop - 10;
      
      // Check if in valid grid area
      if (relativeX < 0 || relativeX >= actualWidth * cellSize ||
          relativeY < 0 || relativeY >= actualHeight * cellSize) {
        return; // Not in valid grid area, keep current selection
      }
      
      const endCol = Math.floor(relativeX / cellSize);
      const endRow = Math.floor(relativeY / cellSize);
      
      // Ensure grid coordinates are in valid range
      if (endRow < 0 || endRow >= height || endCol < 0 || endCol >= width) {
        return; // Grid coordinates out of range, keep current selection
      }
      
      setSelection(prev => ({
        ...prev,
        endRow,
        endCol,
      }));

      // Update hovered tiles
      const newSelection = { ...selection, endRow, endCol };
      const newSelectedTiles = getSelectedTilesForSelection(newSelection);
      const newHoveredSet = new Set(newSelectedTiles.map(tile => tile.index));
      
      // Only selected tiles scale up
      newSelectedTiles.forEach(tile => {
        if (!hoveredTiles.has(tile.index)) {
          scaleTile(tile.index, 1.2); // Scale up when selected
        }
      });
      
      // Restore tiles no longer hovered to original size
      hoveredTiles.forEach(index => {
        if (!newHoveredSet.has(index)) {
          scaleTile(index, 1);
        }
      });
      
      setHoveredTiles(newHoveredSet);
    },

    onPanResponderRelease: () => {
      if (selection && !disabled) {
        handleSelectionComplete();
      }
      
      // Restore all tile scaling
      hoveredTiles.forEach(index => {
        scaleTile(index, 1);
      });
      setHoveredTiles(new Set());
      
      // Clear selection state
      Animated.timing(selectionOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start(() => {
        setSelection(null);
      });
    },
    
    // Allow other components to terminate rectangle drawing (buttons have priority)
    onPanResponderTerminationRequest: (evt) => {
      // If touch point is in button area, give priority to buttons
      const { pageX, pageY } = evt.nativeEvent;
      const buttonAreaBottom = screenHeight - 10; // Bottom button area
      const buttonAreaTop = screenHeight - 200; // Button area top
      const topRestrictedHeight = 200; // Top restricted area
      
      // If touch is in button area or restricted area, let other components handle
      if ((pageY >= buttonAreaTop && pageY <= buttonAreaBottom) || 
          pageY < topRestrictedHeight) {
        return true;
      }
      
      return true;
    },
    
    // Clean up state when rejected by other components
    onPanResponderReject: () => {
      resetSelection();
    },
  });

  // Handle tile click in item mode
  const handleTilePress = (row, col, value) => {
    if (!itemMode || disabled || value === 0) return;
    
    if (onTileClick) {
      onTileClick(row, col, value);
    }
    
    if (settings?.hapticsEnabled !== false) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleSelectionComplete = async () => {
    if (!selection) return;

    const selectedTiles = getSelectedTiles();
    const sum = selectedTiles.reduce((acc, tile) => acc + tile.value, 0);
    const tilePositions = selectedTiles.map(tile => ({ row: tile.row, col: tile.col }));

    if (sum === 10 && selectedTiles.length > 0) {
      // Success - create explosion effect
      if (settings?.hapticsEnabled !== false) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
      
      // Calculate explosion center position
      const { startRow, startCol, endRow, endCol } = selection;
      const centerRow = (startRow + endRow) / 2;
      const centerCol = (startCol + endCol) / 2;
      const explosionX = centerCol * cellSize + cellSize / 2 + 10;
      const explosionY = centerRow * cellSize + cellSize / 2 + 10;
      
      setExplosionAnimation({ x: explosionX, y: explosionY });
      
      // Explosion animation
      explosionScale.setValue(0);
      explosionOpacity.setValue(1);
      
      Animated.parallel([
        Animated.timing(explosionScale, {
          toValue: 2.5,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(explosionOpacity, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setExplosionAnimation(null);
      });

      // Selection box animation
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
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      
      Animated.sequence([
        Animated.timing(selectionOpacity, {
          toValue: 0.5,
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
    } else {
      // No tiles selected
      setSelection(null);
    }
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
    
    const left = minCol * cellSize + 10;
    const top = minRow * cellSize + 10;
    const width = (maxCol - minCol + 1) * cellSize;
    const height = (maxRow - minRow + 1) * cellSize;
    
    return {
      position: 'absolute',
      left,
      top,
      width,
      height,
      backgroundColor: isSuccess ? '#4CAF50' : '#2196F3',
      opacity: selectionOpacity,
      borderRadius: 8,
      borderWidth: 3,
      borderColor: isSuccess ? '#45a049' : '#1976D2',
    };
  };

  const getSelectionSum = () => {
    if (!selection) return null;
    
    const selectedTiles = getSelectedTiles();
    const sum = selectedTiles.reduce((acc, tile) => acc + tile.value, 0);
    
    if (selectedTiles.length === 0) return null;
    
    const { startRow, startCol, endRow, endCol } = selection;
    const centerRow = (startRow + endRow) / 2;
    const centerCol = (startCol + endCol) / 2;
    
    const left = centerCol * cellSize + 10;
    const top = centerRow * cellSize + 10;
    
    return {
      sum,
      isSuccess: sum === 10,
      style: {
        position: 'absolute',
        left: left - 25,
        top: top - 25,
        width: 50,
        height: 50,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: sum === 10 ? '#FFD700' : '#2196F3',
        borderRadius: 25,
        borderWidth: 3,
        borderColor: sum === 10 ? '#FFA000' : '#1976D2',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 8,
      }
    };
  };

  const renderTile = (value, row, col) => {
    const index = row * width + col;
    
    // Only render tiles within valid range and with values
    if (row < 0 || row >= height || col < 0 || col >= width || value === 0) {
      return null;
    }

    // Unified position calculation - item mode and normal mode are identical
    const left = col * cellSize + 10 + tileMargin;
    const top = row * cellSize + 10 + tileMargin;

    const tileScale = initTileScale(index);
    
    // Get swap and fractal animations
    const swapAnim = swapAnimations ? swapAnimations.get(index) : null;
    const fractalAnim = fractalAnimations ? fractalAnimations.get(index) : null;
    
    // Calculate transforms - only scaling and special animations
    const transforms = [{ scale: tileScale }];
    
    // If swap animation exists, add position transform
    if (swapAnim && swapAnim.translateX && swapAnim.translateY) {
      transforms.push({
        translateX: swapAnim.translateX,
      });
      transforms.push({
        translateY: swapAnim.translateY,
      });
    }
    
    // If fractal animation exists, add scale transform
    if (fractalAnim && fractalAnim.scale) {
      transforms.push({
        scale: fractalAnim.scale,
      });
    }
    
    // Check if this is the selected swap tile
    const isSelected = selectedSwapTile && selectedSwapTile.index === index;
    
    // Normal mode and item mode use same base styles
    let selectedBgColor = '#FFF8E1'; // Default background
    let selectedBorderColor = '#E0E0E0'; // Default border
    let selectedTextColor = '#333'; // Default text color
    
    // Only change style when selected
    if (isSelected) {
      if (itemMode === 'swapMaster') {
        selectedBgColor = '#E3F2FD';
        selectedBorderColor = '#2196F3';
        selectedTextColor = '#0D47A1';
      } else if (itemMode === 'fractalSplit') {
        selectedBgColor = '#E1F5FE';
        selectedBorderColor = '#9C27B0';
        selectedTextColor = '#4A148C';
      }
    }

    // Calculate opacity
    let opacity = 1;
    if (fractalAnim && fractalAnim.opacity) {
      opacity = fractalAnim.opacity;
    }

    const tileComponent = (
      <Animated.View 
        key={`${row}-${col}`}
        style={[
          styles.tile,
          { 
            position: 'absolute',
            left,
            top,
            width: tileSize, 
            height: tileSize,
            transform: transforms,
            opacity: opacity,
            backgroundColor: selectedBgColor,
            borderWidth: isSelected ? 3 : 2,
            borderColor: selectedBorderColor,
          }
        ]}
      >
        <Text style={[
          styles.tileText,
          { 
            fontSize: tileSize * 0.5,
            color: selectedTextColor
          }
        ]}>
          {value}
        </Text>
      </Animated.View>
    );
    
    // If in item mode, wrap as clickable component
    if (itemMode) {
      return (
        <TouchableOpacity
          key={`${row}-${col}`}
          style={{ 
            position: 'absolute', 
            left, 
            top, 
            width: tileSize, 
            height: tileSize,
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onPress={() => handleTilePress(row, col, value)}
          activeOpacity={0.8}
        >
          {tileComponent}
        </TouchableOpacity>
      );
    }
    
    return tileComponent;
  };

  const selectionStyle = getSelectionStyle();
  const selectionSum = getSelectionSum();

  return (
    <View style={styles.fullScreenContainer} {...panResponder.panHandlers}>
      <View style={styles.container}>
        <View 
          style={[
            styles.board,
            {
              width: boardWidth,
              height: boardHeight,
            }
          ]}
        >
          {/* Render all tiles */}
          {tiles.map((value, index) => {
            const row = Math.floor(index / width);
            const col = index % width;
            return renderTile(value, row, col);
          })}
          
          {/* Selection overlay */}
          {selectionStyle && (
            <Animated.View style={selectionStyle} />
          )}
          
          {/* Selection sum display */}
          {selectionSum && (
            <View style={selectionSum.style}>
              <Text style={[
                styles.sumText,
                { color: selectionSum.isSuccess ? '#333' : 'white' }
              ]}>
                {selectionSum.sum}
              </Text>
            </View>
          )}

          {/* Explosion effect for successful clears */}
          {explosionAnimation && (
            <Animated.View
              style={[
                styles.explosion,
                {
                  left: explosionAnimation.x - 30,
                  top: explosionAnimation.y - 30,
                  transform: [{ scale: explosionScale }],
                  opacity: explosionOpacity,
                }
              ]}
            >
              <View style={styles.explosionCenter}>
                <Text style={styles.explosionText}>💥</Text>
              </View>
              {/* Explosion particle effects */}
              {[...Array(12)].map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.explosionParticle,
                    {
                      transform: [
                        { rotate: `${i * 30}deg` },
                        { translateY: -25 }
                      ],
                    }
                  ]}
                />
              ))}
            </Animated.View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
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
  board: {
    backgroundColor: '#2E7D32',
    padding: 10,
    borderRadius: 12,
    borderWidth: 4,
    borderColor: '#8D6E63',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    position: 'relative',
  },
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  tileText: {
    fontWeight: 'bold',
    color: '#333',
  },
  sumText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  explosion: {
    position: 'absolute',
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  explosionCenter: {
    width: 50,
    height: 50,
    backgroundColor: '#FFD700',
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFA000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  explosionText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  explosionParticle: {
    position: 'absolute',
    width: 8,
    height: 8,
    backgroundColor: '#FF6B35',
    borderRadius: 4,
  },
});