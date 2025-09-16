/**
 * GameBoard Component - Enhanced interactive puzzle board with swap mode
 * Purpose: Render game tiles with touch interactions, explosion animations, and swap functionality
 * Features: Rectangle drawing, tile swapping, shake animations, explosion effects
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
  onSwapTiles,
  disabled = false 
export function GameBoard({ 
  board, 
  onTilesClear, 
  onTileClick, 
  swapMode = false, 
  firstSwapTile = null, 
  disabled = false 
export function GameBoard({ 
  board, 
  onTilesClear, 
  onTileClick, 
  swapMode = false, 
  firstSwapTile = null, 
  disabled = false 
}) {
  const { settings } = useGameStore();
  const [selection, setSelection] = useState(null);
  const [explosionAnimation, setExplosionAnimation] = useState(null);
  const [swapAnimations, setSwapAnimations] = useState(new Map());
  
  const selectionOpacity = useRef(new Animated.Value(0)).current;
  const explosionScale = useRef(new Animated.Value(0)).current;
  const explosionOpacity = useRef(new Animated.Value(0)).current;
  const tileScales = useRef({}).current;
  const tileShakeAnimations = useRef({}).current;

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
  
  // 计算格子大小，数字方块更小
  const cellSize = Math.min(
    (screenWidth - 80) / actualWidth, 
    (screenHeight - 300) / actualHeight,
    50
  );
  
  // 数字方块的实际大小（比格子小，留出间距）
  const tileSize = cellSize * 0.7;
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

  // 初始化tile晃动动画
  const initTileShake = (index) => {
    if (!tileShakeAnimations[index]) {
      tileShakeAnimations[index] = new Animated.Value(0);
    }
    return tileShakeAnimations[index];
  };

  // 开始所有数字方块的晃动动画
  const startShakeAnimation = () => {
    const animations = [];
    
    for (let i = 0; i < tiles.length; i++) {
      if (tiles[i] > 0) {
        const shakeAnim = initTileShake(i);
        const shakeAnimation = Animated.loop(
          Animated.sequence([
            Animated.timing(shakeAnim, {
              toValue: 1,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(shakeAnim, {
              toValue: -1,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(shakeAnim, {
              toValue: 0,
              duration: 100,
              useNativeDriver: true,
            }),
          ])
        );
        animations.push(shakeAnimation);
        shakeAnimation.start();
      }
    }
  };

  // 停止所有晃动动画
  const stopShakeAnimation = () => {
    Object.values(tileShakeAnimations).forEach(anim => {
      anim.stopAnimation();
      anim.setValue(0);
    });
  };

  // 开始交换模式时启动晃动
  React.useEffect(() => {
    if (swapMode) {
      startShakeAnimation();
    } else {
      stopShakeAnimation();
    }
    
    return () => {
      stopShakeAnimation();
    };
  }, [swapMode]);

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

  // 检查触摸点是否在棋盘网格区域内
  const isInsideGridArea = (pageX, pageY) => {
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
    const col = Math.floor(relativeX / cellSize) + bounds.minCol;
    const row = Math.floor(relativeY / cellSize) + bounds.minRow;
    
    return row >= bounds.minRow && row <= bounds.maxRow &&
           col >= bounds.minCol && col <= bounds.maxCol;
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
      // 交换模式下不允许画框
      if (swapMode) return false;
      
      const { pageX, pageY } = evt.nativeEvent;
      // 只有在网格区域内才允许启动画框
      return !disabled && isInsideGridArea(pageX, pageY);
    },
    onMoveShouldSetPanResponder: (evt) => {
      // 交换模式下不允许画框
      if (swapMode) return false;
      
      const { pageX, pageY } = evt.nativeEvent;
      return !disabled && isInsideGridArea(pageX, pageY);
    },

    onPanResponderGrant: (evt) => {
      const { pageX, pageY } = evt.nativeEvent;
      
      // 双重检查：确保在网格区域内
      if (!isInsideGridArea(pageX, pageY)) return;
      
      // 计算棋盘在屏幕上的位置
      const boardCenterX = screenWidth / 2;
      const boardCenterY = screenHeight / 2;
      const boardLeft = boardCenterX - boardWidth / 2;
      const boardTop = boardCenterY - boardHeight / 2;
      
      // 转换为相对于棋盘的坐标
      const relativeX = pageX - boardLeft - 10;
      const relativeY = pageY - boardTop - 10;
      
      // 转换为网格坐标
      const startCol = Math.floor(relativeX / cellSize) + bounds.minCol;
      const startRow = Math.floor(relativeY / cellSize) + bounds.minRow;
      
      setSelection({
        startRow,
        startCol,
        endRow: startRow,
        endCol: startCol,
      });
      
      // 开始选择动画
      Animated.timing(selectionOpacity, {
        toValue: 0.5,
        duration: 80,
        useNativeDriver: false,
      }).start();
    },

    onPanResponderMove: (evt) => {
      if (!selection) return;
      
      const { pageX, pageY } = evt.nativeEvent;
      
      // 计算棋盘在屏幕上的位置
      const boardCenterX = screenWidth / 2;
      const boardCenterY = screenHeight / 2;
      const boardLeft = boardCenterX - boardWidth / 2;
      const boardTop = boardCenterY - boardHeight / 2;
      
      // 检查移动点是否在棋盘区域内
      if (pageX < boardLeft + 10 || pageX > boardLeft + boardWidth - 10 ||
          pageY < boardTop + 10 || pageY > boardTop + boardHeight - 10) {
        // 如果移动到棋盘外，保持当前选择不变
        return;
      }
      
      const relativeX = pageX - boardLeft - 10;
      const relativeY = pageY - boardTop - 10;
      
      // 检查是否在有效的网格区域内
      if (relativeX < 0 || relativeX >= actualWidth * cellSize ||
          relativeY < 0 || relativeY >= actualHeight * cellSize) {
        return; // 不在有效网格区域内，保持当前选择
      }
      
      const endCol = Math.floor(relativeX / cellSize) + bounds.minCol;
      const endRow = Math.floor(relativeY / cellSize) + bounds.minRow;
      
      // 确保网格坐标在有效范围内
      if (endRow < bounds.minRow || endRow > bounds.maxRow ||
          endCol < bounds.minCol || endCol > bounds.maxCol) {
        return; // 网格坐标超出范围，保持当前选择
      }
      
      setSelection(prev => ({
        ...prev,
        endRow,
        endCol,
      }));

      // 更新悬停的tiles
      const newSelection = { ...selection, endRow, endCol };
      const newSelectedTiles = getSelectedTilesForSelection(newSelection);
      const newHoveredSet = new Set(newSelectedTiles.map(tile => tile.index));
      
      // 只有被框选中的数字方块才变大
      newSelectedTiles.forEach(tile => {
        if (!hoveredTiles.has(tile.index)) {
          scaleTile(tile.index, 1.2); // 被选中时放大
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
      
      // 清除选择状态
      Animated.timing(selectionOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start(() => {
        setSelection(null);
      });
    },
    
    // 允许其他组件终止画框（按钮优先）
    onPanResponderTerminationRequest: () => true,
    
    // 被其他组件拒绝时清理状态
    onPanResponderReject: () => {
      resetSelection();
    },
  });

  // 处理数字方块点击（交换模式）
  const handleTilePress = (row, col, value) => {
    if (!swapMode || disabled || value === 0) return;
    
    const index = row * width + col;
    
    if (!firstSwapTile) {
      // 选择第一个方块
      if (onTileClick) {
        onTileClick(row, col, value);
      }
      scaleTile(index, 1.3); // 放大选中的方块
      
      if (settings?.hapticsEnabled !== false) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } else if (firstSwapTile.index === index) {
      // 取消选择
      if (onTileClick) {
        onTileClick(row, col, value);
      }
      scaleTile(index, 1);
    } else {
      // 选择第二个方块，执行交换
      const secondTile = { row, col, value, index };
      performSwapAnimation(firstSwapTile, secondTile);
    }
  };

  // 执行交换动画
  const performSwapAnimation = (tile1, tile2) => {
    if (settings?.hapticsEnabled !== false) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }

    // 计算两个方块的屏幕位置
    const tile1RelativeRow = tile1.row - bounds.minRow;
    const tile1RelativeCol = tile1.col - bounds.minCol;
    const tile1X = tile1RelativeCol * cellSize + cellSize / 2 + 10;
    const tile1Y = tile1RelativeRow * cellSize + cellSize / 2 + 10;

    const tile2RelativeRow = tile2.row - bounds.minRow;
    const tile2RelativeCol = tile2.col - bounds.minCol;
    const tile2X = tile2RelativeCol * cellSize + cellSize / 2 + 10;
    const tile2Y = tile2RelativeRow * cellSize + cellSize / 2 + 10;

    // 创建交换动画
      x: new Animated.Value(0),
      y: new Animated.Value(0),
    };
    const tile2Anim = {
      x: new Animated.Value(0),
      y: new Animated.Value(0),
    };

    setSwapAnimations(new Map([
      [tile1.index, { ...tile1Anim, targetX: tile2X - tile1X, targetY: tile2Y - tile1Y }],
      [tile2.index, { ...tile2Anim, targetX: tile1X - tile2X, targetY: tile1Y - tile2Y }],
    ]));

    // 执行动画
    Animated.parallel([
      Animated.timing(tile1Anim.x, {
        toValue: tile2X - tile1X,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(tile1Anim.y, {
        toValue: tile2Y - tile1Y,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(tile2Anim.x, {
        toValue: tile1X - tile2X,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(tile2Anim.y, {
        toValue: tile1Y - tile2Y,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // 动画完成后清理状态并通知父组件
      setSwapAnimations(new Map());
      scaleTile(tile1.index, 1);
      scaleTile(tile2.index, 1);
      
      // 通知父组件执行交换
      if (onSwapTiles) {
        onSwapTiles(tile1, tile2);
      }
    });
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
      const explosionX = (centerCol - bounds.minCol) * cellSize + cellSize / 2 + 10;
      const explosionY = (centerRow - bounds.minRow) * cellSize + cellSize / 2 + 10;
      
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
    
    const left = (minCol - bounds.minCol) * cellSize + 10;
    const top = (minRow - bounds.minRow) * cellSize + 10;
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
    
    const left = (centerCol - bounds.minCol) * cellSize + 10;
    const top = (centerRow - bounds.minRow) * cellSize + 10;
    
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
    
    // 只渲染实际内容区域内的方块
    if (row < bounds.minRow || row > bounds.maxRow || 
        col < bounds.minCol || col > bounds.maxCol || value === 0) {
      return null;
    }

    const relativeRow = row - bounds.minRow;
    const relativeCol = col - bounds.minCol;
    const left = relativeCol * cellSize + 10 + tileMargin;
    const top = relativeRow * cellSize + 10 + tileMargin;

    const tileScale = initTileScale(index);
    const tileShake = initTileShake(index);
    const swapAnim = swapAnimations.get(index);
    
    // 计算变换
    const transforms = [{ scale: tileScale }];
    
    if (swapMode && !swapAnim) {
      // 交换模式下的晃动效果
      transforms.push({
        translateX: tileShake.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [-2, 0, 2],
        }),
      });
    }
    
    if (swapAnim) {
      // 交换动画
      transforms.push(
        { translateX: swapAnim.x },
        { translateY: swapAnim.y }
      );
    }
    
    // 检查是否是选中的第一个交换方块
    const isFirstSwapSelected = firstSwapTile && firstSwapTile.index === index;

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
            backgroundColor: isFirstSwapSelected ? '#FFE082' : '#FFF8E1',
            borderWidth: isFirstSwapSelected ? 3 : 0,
            borderColor: isFirstSwapSelected ? '#FF9800' : 'transparent',
          }
        ]}
      >
        <Text style={[
          styles.tileText,
          { fontSize: tileSize * 0.5 }
        ]}>
          {value}
        </Text>
      </Animated.View>
    );
    
    // 如果是交换模式，包装成可点击的组件
    if (swapMode) {
      return (
        <TouchableOpacity
          key={`${row}-${col}`}
          style={{ position: 'absolute', left, top, width: tileSize, height: tileSize }}
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
                <Text style={styles.explosionText}>💥</Text>
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