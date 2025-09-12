/**
 * GameBoard Component - Enhanced interactive puzzle board with advanced visual effects
 * Purpose: Render game tiles with enhanced touch interactions and explosion animations
 * Features: Flexible touch gestures, tile scaling, explosion effects, improved responsiveness
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
const TILE_MARGIN = 4;

export function GameBoard({ board, onTilesClear, disabled = false }) {
  const { settings } = useGameStore();
  const [selection, setSelection] = useState(null);
  const [hoveredTiles, setHoveredTiles] = useState(new Set());
  const [explosionAnimation, setExplosionAnimation] = useState(null);
  
  const selectionOpacity = useRef(new Animated.Value(0)).current;
  const tileScales = useRef({}).current;
  const explosionScale = useRef(new Animated.Value(0)).current;
  const explosionOpacity = useRef(new Animated.Value(0)).current;

  if (!board) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading board...</Text>
      </View>
    );
  }

  const { width, height, tiles } = board;
  
  // 计算实际有数字的区域边界
  const getActualBoardBounds = () => {
    let minRow = height, maxRow = -1, minCol = width, maxCol = -1;
    
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const index = row * width + col;
        if (tiles[index] > 0) {
          minRow = Math.min(minRow, row);
          maxRow = Math.max(maxRow, row);
          minCol = Math.min(minCol, col);
          maxCol = Math.max(maxCol, col);
        }
      }
    }
    
    return { minRow, maxRow, minCol, maxCol };
  };
  
  const bounds = getActualBoardBounds();
  const actualWidth = bounds.maxCol - bounds.minCol + 1;
  const actualHeight = bounds.maxRow - bounds.minRow + 1;
  
  // 根据实际内容计算格子大小
  const cellSize = Math.min(
    (BOARD_WIDTH - 40) / actualWidth, 
    (BOARD_WIDTH - 40) / actualHeight,
    60
  );
  
  const actualBoardWidth = actualWidth * cellSize;
  const actualBoardHeight = actualHeight * cellSize;

  // 初始化tile动画
  const initTileScale = (index) => {
    if (!tileScales[index]) {
      tileScales[index] = new Animated.Value(1);
    }
    return tileScales[index];
  };

  // 缩放tile
  const scaleTile = (index, scale) => {
    const tileScale = initTileScale(index);
    Animated.spring(tileScale, {
      toValue: scale,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled,
    onMoveShouldSetPanResponder: () => !disabled,

    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      
      // 转换为相对于棋盘的坐标
      const relativeX = locationX - TILE_MARGIN;
      const relativeY = locationY - TILE_MARGIN;
      
      const startCol = Math.floor(relativeX / cellSize) + bounds.minCol;
      const startRow = Math.floor(relativeY / cellSize) + bounds.minRow;
      
      // 允许从任意位置开始画框，不限制必须点击在数字方块上
      setSelection({
        startRow: Math.max(bounds.minRow, Math.min(bounds.maxRow, startRow)),
        startCol: Math.max(bounds.minCol, Math.min(bounds.maxCol, startCol)),
        endRow: Math.max(bounds.minRow, Math.min(bounds.maxRow, startRow)),
        endCol: Math.max(bounds.minCol, Math.min(bounds.maxCol, startCol)),
      });
      
      // 获取初始选择的方块并缩放
      const initialSelection = {
        startRow: Math.max(bounds.minRow, Math.min(bounds.maxRow, startRow)),
        startCol: Math.max(bounds.minCol, Math.min(bounds.maxCol, startCol)),
        endRow: Math.max(bounds.minRow, Math.min(bounds.maxRow, startRow)),
        endCol: Math.max(bounds.minCol, Math.min(bounds.maxCol, startCol)),
      };
      
      const initialTiles = getSelectedTilesForSelection(initialSelection);
      const initialHoveredSet = new Set(initialTiles.map(tile => tile.index));
      
      initialTiles.forEach(tile => {
        scaleTile(tile.index, 1.3);
      });
      
      setHoveredTiles(initialHoveredSet);
      
      Animated.timing(selectionOpacity, {
        toValue: 0.5,
        duration: 80,
        useNativeDriver: false,
      }).start();
    },

    onPanResponderMove: (evt) => {
      if (!selection) return;
      
      const { locationX, locationY } = evt.nativeEvent;
      
      const relativeX = locationX;
      const relativeY = locationY;
      
      const endCol = Math.max(bounds.minCol, Math.min(bounds.maxCol, 
        Math.floor(relativeX / cellSize) + bounds.minCol));
      const endRow = Math.max(bounds.minRow, Math.min(bounds.maxRow, 
        Math.floor(relativeY / cellSize) + bounds.minRow));
      
      setSelection(prev => ({
        ...prev,
        endRow,
        endCol,
      }));

      // 更新悬停的tiles
      const newSelection = { ...selection, endRow, endCol };
      const selectedTiles = getSelectedTilesForSelection(newSelection);
      const newHoveredSet = new Set(selectedTiles.map(tile => tile.index));
      
      // 缩放新悬停的tiles
      selectedTiles.forEach(tile => {
        if (!hoveredTiles.has(tile.index)) {
          scaleTile(tile.index, 1.2);
        }
      });
      
      // 恢复不再悬停的tiles
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
      
      // 恢复所有tile的缩放
      hoveredTiles.forEach(index => {
        scaleTile(index, 1);
      });
      setHoveredTiles(new Set());
    },
  });

  const getSelectedTilesForSelection = (sel) => {
    if (!sel) return [];
    
    const { startRow, startCol, endRow, endCol } = sel;
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

  const getSelectedTiles = () => {
    return getSelectedTilesForSelection(selection);
  };

  const handleSelectionComplete = async () => {
    if (!selection) return;

    const selectedTiles = getSelectedTiles();
    const sum = selectedTiles.reduce((acc, tile) => acc + tile.value, 0);
    const tilePositions = selectedTiles.map(tile => ({ row: tile.row, col: tile.col }));

    if (sum === 10) {
      // Success - 创建爆炸效果
      if (settings?.hapticsEnabled !== false) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
      
      // 计算爆炸中心位置
      const { startRow, startCol, endRow, endCol } = selection;
      const centerRow = (startRow + endRow) / 2;
      const centerCol = (startCol + endCol) / 2;
      const explosionX = (centerCol - bounds.minCol) * cellSize + cellSize / 2;
      const explosionY = (centerRow - bounds.minRow) * cellSize + cellSize / 2;
      
      setExplosionAnimation({ x: explosionX, y: explosionY });
      
      // 爆炸动画
      explosionScale.setValue(0);
      explosionOpacity.setValue(1);
      
      Animated.parallel([
        Animated.timing(explosionScale, {
          toValue: 2,
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

      // 选择框动画
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

    } else {
      // Failure - 蓝色反馈
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
    
    const left = (minCol - bounds.minCol) * cellSize;
    const top = (minRow - bounds.minRow) * cellSize;
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
    
    const left = (centerCol - bounds.minCol) * cellSize;
    const top = (centerRow - bounds.minRow) * cellSize;
    
    return {
      sum,
      isSuccess: sum === 10,
      style: {
        position: 'absolute',
        left: left - 20,
        top: top - 20,
        width: 40,
        height: 40,
        backgroundColor: sum === 10 ? '#FFD700' : '#2196F3',
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: sum === 10 ? '#FFA000' : '#1976D2',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
      }
    };
  };

  const renderTile = (value, row, col) => {
    const index = row * width + col;
    
    // 只渲染实际内容区域内的方块
    if (row < bounds.minRow || row > bounds.maxRow || 
        col < bounds.minCol || col > bounds.maxCol || value === 0) {
      return null;
    }

    const relativeRow = row - bounds.minRow;
    const relativeCol = col - bounds.minCol;
    const left = relativeCol * cellSize;
    const top = relativeRow * cellSize;

    const tileScale = initTileScale(index);

    return (
      <Animated.View 
        key={`${row}-${col}`}
        style={[
          styles.tile,
          { 
            position: 'absolute',
            left,
            top,
            width: cellSize, 
            height: cellSize,
            transform: [{ scale: tileScale }]
          }
        ]}
      >
        <Text style={[
          styles.tileText,
          { fontSize: cellSize * 0.4 }
        ]}>
          {value}
        </Text>
      </Animated.View>
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
            width: actualBoardWidth,
            height: actualBoardHeight,
          }
        ]}
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

        {/* Explosion effect */}
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
              <Text style={styles.explosionText}>10</Text>
            </View>
            {/* 爆炸粒子效果 */}
            {[...Array(8)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.explosionParticle,
                  {
                    transform: [
                      { rotate: `${i * 45}deg` },
                      { translateY: -20 }
                    ]
                  }
                ]}
              />
            ))}
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 20,
    flex: 1,
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
    padding: 8,
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
    backgroundColor: '#FFF9C4',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    margin: 2,
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
    fontSize: 16,
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
    width: 40,
    height: 40,
    backgroundColor: '#FFD700',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFA000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  explosionText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  explosionParticle: {
    position: 'absolute',
    width: 6,
    height: 6,
    backgroundColor: '#FF6B35',
    borderRadius: 3,
  },
});