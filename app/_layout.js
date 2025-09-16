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
  swapMode = false, 
  firstSwapTile = null, 
  disabled = false 
}) {
  const [shakeAnimations, setShakeAnimations] = useState({});
  const [selection, setSelection] = useState(null);
  const [hoveredTiles, setHoveredTiles] = useState(new Set());
  const [explosionAnimation, setExplosionAnimation] = useState(null);
  const [swapAnimation, setSwapAnimation] = useState(null);
  const [swapAnimations, setSwapAnimations] = useState({});
  const { settings } = useGameStore();
  
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
  
  // 使用完整的棋盘尺寸，不根据数字分布调整
  const actualWidth = width;
  const actualHeight = height;
  
  // 计算格子大小
  const cellSize = Math.min(
    (screenWidth - 60) / actualWidth, 
    (screenHeight - 280) / actualHeight,
    50
  );
  
  // 数字方块的实际大小（比格子稍小，留出间距）
  const tileSize = cellSize * 0.85;
  const tileMargin = (cellSize - tileSize) / 2;
  
  // 棋盘背景大小
  const boardWidth = actualWidth * cellSize + 20;
  const boardHeight = actualHeight * cellSize + 20;

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
      tension: 400,
      friction: 8,
    }).start();
  };

  // 全屏触摸响应器
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled && !swapMode,
    onMoveShouldSetPanResponder: (evt) => {
      if (disabled || swapMode) return false;
      
      // 检查触摸点是否在按钮区域内，如果是则不拦截
      const { pageX, pageY } = evt.nativeEvent;
      
      // 左下角Change按钮区域 (假设按钮大小约100x60，距离底部和左边各30px)
      const changeButtonArea = {
        left: 20,
        right: 120,
        top: screenHeight - 90,
        bottom: screenHeight - 30
      };
      
      // 右下角Reset按钮区域 (假设按钮大小56x56，距离底部和右边各30px)
      const resetButtonArea = {
        left: screenWidth - 86,
        right: screenWidth - 20,
        top: screenHeight - 86,
        bottom: screenHeight - 30
      };
      
      // 如果触摸点在按钮区域内，不拦截触摸事件
      if ((pageX >= changeButtonArea.left && pageX <= changeButtonArea.right &&
           pageY >= changeButtonArea.top && pageY <= changeButtonArea.bottom) ||
          (pageX >= resetButtonArea.left && pageX <= resetButtonArea.right &&
           pageY >= resetButtonArea.top && pageY <= resetButtonArea.bottom)) {
        return false;
      }
      
      return true;
    },

    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      
      // 直接使用相对于棋盘的坐标，减去棋盘内边距
      const relativeX = locationX - 10;
      const relativeY = locationY - 10;
      
      // 转换为网格坐标
      const startCol = Math.floor(relativeX / cellSize);
      const startRow = Math.floor(relativeY / cellSize);
      
      // 确保坐标在有效范围内
      const clampedStartCol = Math.max(0, Math.min(width - 1, startCol));
      const clampedStartRow = Math.max(0, Math.min(height - 1, startRow));
      
      setSelection({
        startRow: clampedStartRow,
        startCol: clampedStartCol,
        endRow: clampedStartRow,
        endCol: clampedStartCol,
      });
      
      // 开始选择动画
      Animated.timing(selectionOpacity, {
        toValue: 0.5,
        duration: 100,
        useNativeDriver: false,
      }).start();
    },

    onPanResponderMove: (evt) => {
      if (!selection) return;
      
      const { locationX, locationY } = evt.nativeEvent;
      
      // 直接使用相对于棋盘的坐标，减去棋盘内边距
      const relativeX = locationX - 10;
      const relativeY = locationY - 10;
      
      const endCol = Math.floor(relativeX / cellSize);
      const endRow = Math.floor(relativeY / cellSize);
      
      // 确保坐标在有效范围内
      const clampedEndCol = Math.max(0, Math.min(width - 1, endCol));
      const clampedEndRow = Math.max(0, Math.min(height - 1, endRow));
      
      setSelection(prev => ({
        ...prev,
        endRow: clampedEndRow,
        endCol: clampedEndCol,
      }));

      // 更新悬停的tiles
      const newSelection = { ...selection, endRow: clampedEndRow, endCol: clampedEndCol };
      const selectedTiles = getSelectedTilesForSelection(newSelection);
      const newHoveredSet = new Set(selectedTiles.map(tile => tile.index));
      
      // 只有被框选中的数字方块才变大
      selectedTiles.forEach(tile => {
        if (!hoveredTiles.has(tile.index)) {
          scaleTile(tile.index, 1.4); // 被选中时放大
        }
      });
      
      // 恢复不再悬停的tiles到原始大小
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
  
  const handleTilePress = (row, col) => {
    if (swapMode && onTileClick) {
      const index = row * width + col;
      const tileValue = tiles[index];
      
      // 只能点击有数字的方块
      if (tileValue === 0) return;
      
      if (!firstSwapTile) {
        // 选择第一个方块
        onTileClick(row, col);
      } else {
        // 选择第二个方块，执行交换动画
        if (firstSwapTile.index === index) {
          // 点击同一个方块，取消选择
          onTileClick(row, col);
          return;
        }
        
        // 执行交换动画
        performSwapAnimation(firstSwapTile, { row, col, index, value: tileValue });
      }
    }
  };
  
  const performSwapAnimation = (tile1, tile2) => {
    // 计算两个方块的位置
    const tile1Row = Math.floor(tile1.index / width);
    const tile1Col = tile1.index % width;
    const tile2Row = Math.floor(tile2.index / width);
    const tile2Col = tile2.index % width;
    
    // 计算移动距离
    const deltaX = (tile2Col - tile1Col) * cellSize;
    const deltaY = (tile2Row - tile1Row) * cellSize;
    
    // 创建动画值
    const tile1Animation = {
      x: new Animated.Value(0),
      y: new Animated.Value(0)
    };
    const tile2Animation = {
      x: new Animated.Value(0),
      y: new Animated.Value(0)
    };
    
    setSwapAnimations({
      [tile1.index]: tile1Animation,
      [tile2.index]: tile2Animation
    });
    
    setSwapAnimation({ tile1, tile2 });
    
    // 执行交换动画
    Animated.parallel([
      Animated.timing(tile1Animation.x, {
        toValue: deltaX,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(tile1Animation.y, {
        toValue: deltaY,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(tile2Animation.x, {
        toValue: -deltaX,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(tile2Animation.y, {
        toValue: -deltaY,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // 动画完成后清理状态并执行实际交换
      setSwapAnimation(null);
      setSwapAnimations({});
      onTileClick(tile2.row, tile2.col);
    });
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

  const handleSelectionComplete = async () => {
    if (!selection) return;

    const selectedTiles = getSelectedTiles();
    const sum = selectedTiles.reduce((acc, tile) => acc + tile.value, 0);
    const tilePositions = selectedTiles.map(tile => ({ row: tile.row, col: tile.col }));

    if (sum === 10 && selectedTiles.length > 0) {
      // Success - 创建爆炸效果
      if (settings?.hapticsEnabled !== false) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
      
      // 计算爆炸中心位置
      const { startRow, startCol, endRow, endCol } = selection;
      const centerRow = (startRow + endRow) / 2;
      const centerCol = (startCol + endCol) / 2;
      const explosionX = centerCol * cellSize + cellSize / 2 + 10;
      const explosionY = centerRow * cellSize + cellSize / 2 + 10;
      
      setExplosionAnimation({ x: explosionX, y: explosionY });
      
      // 爆炸动画
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

    } else if (selectedTiles.length > 0) {
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
        backgroundColor: sum === 10 ? '#FFD700' : '#2196F3',
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
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
    
    // 渲染所有位置的格子，但只有非零值才显示数字
    if (row < 0 || row >= height || col < 0 || col >= width) {
      return null;
    }

    const left = col * cellSize + 10 + tileMargin;
    const top = row * cellSize + 10 + tileMargin;

    const tileScale = initTileScale(index);

    // 检查是否是交换模式中被选中的方块
    const isFirstSwapTile = swapMode && firstSwapTile && firstSwapTile.index === index;
    // 检查是否在交换模式中且是数字方块
    const isSwapModeNumberTile = swapMode && value > 0;
    
    // 根据是否有数字选择样式
    let tileStyle;
    if (value === 0) {
      tileStyle = styles.emptyTile; // 空格子样式
    } else if (isFirstSwapTile) {
      tileStyle = styles.selectedSwapTile; // 被选中的交换方块
    } else if (isSwapModeNumberTile) {
      tileStyle = styles.swapModeNumberTile; // 交换模式中的数字方块（虚线边框）
    } else {
      tileStyle = styles.tile; // 普通数字方块
    }
    
    // 检查是否有交换动画
    const hasSwapAnimation = swapAnimation && 
      (swapAnimation.tile1.index === index || swapAnimation.tile2.index === index);
    
    let animatedStyle = {};
    if (hasSwapAnimation && swapAnimations[index]) {
      animatedStyle = {
        transform: [
          { translateX: swapAnimations[index].x },
          { translateY: swapAnimations[index].y },
          { scale: tileScale }
        ]
      };
    } else {
      animatedStyle = {
        transform: [{ scale: tileScale }]
      };
    }
    
    return (
      <Animated.View 
        key={`${row}-${col}`}
        style={[
          tileStyle,
          { 
            position: 'absolute',
            left,
            top,
            width: tileSize, 
            height: tileSize,
          },
          animatedStyle
        ]}
      >
        <TouchableOpacity
          style={styles.tileButton}
          onPress={() => handleTilePress(row, col)}
          disabled={!swapMode || value === 0}
        >
          {value > 0 && (
            <Text style={[
              styles.tileText,
              { fontSize: tileSize * 0.5 },
              isFirstSwapTile && styles.selectedSwapTileText
            ]}>
              {value}
            </Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const selectionStyle = getSelectionStyle();
  const selectionSum = getSelectionSum();

  return (
    <View style={styles.fullScreenContainer}>
      <View style={styles.container}>
        <View 
          style={[
            styles.board,
            {
              width: boardWidth,
              height: boardHeight,
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
                {[...Array(12)].map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.explosionParticle,
                      {
                        transform: [
                          { rotate: `${i * 30}deg` },
                          { translateY: -25 }
                        ]
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
    flex: 1,
  },
  touchableArea: {
    flex: 1,
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
    backgroundColor: '#FFF9C4',
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
  emptyTile: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  selectedSwapTile: {
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 3,
    borderColor: '#2196F3',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  swapModeNumberTile: {
    backgroundColor: '#FFF9C4',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FF9800',
    borderStyle: 'dashed',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  tileButton: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileText: {
    fontWeight: 'bold',
    color: '#333',
    fontSize: 18,
  },
  selectedSwapTileText: {
    color: '#4CAF50',
    fontWeight: 'bold',
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