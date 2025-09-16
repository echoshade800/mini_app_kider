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
  isSwapMode = false, 
  selectedSwapTile = null,
  disabled = false,
  onSwapAnimation
}) {
  const { settings } = useGameStore();
  const [selection, setSelection] = useState(null);
  const [hoveredTiles, setHoveredTiles] = useState(new Set());
  const [explosionAnimation, setExplosionAnimation] = useState(null);
  const [swapAnimations, setSwapAnimations] = useState(new Map());
  const [isSwapping, setIsSwapping] = useState(false);
  
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

  // 创建交换动画
  const createSwapAnimation = (fromIndex, toIndex) => {
    const fromRow = Math.floor(fromIndex / width);
    const fromCol = fromIndex % width;
    const toRow = Math.floor(toIndex / width);
    const toCol = toIndex % width;
    
    // 计算相对位置差
    const deltaRow = toRow - fromRow;
    const deltaCol = toCol - fromCol;
    const deltaX = deltaCol * cellSize;
    const deltaY = deltaRow * cellSize;
    
    // 创建动画值
    const animValue = new Animated.ValueXY({ x: 0, y: 0 });
    
    return {
      animValue,
      animation: Animated.timing(animValue, {
        toValue: { x: deltaX, y: deltaY },
        duration: 600,
        useNativeDriver: true,
      })
    };
  };

  // 执行交换动画
  const performSwapAnimation = (tile1, tile2, onComplete) => {
    setIsSwapping(true);
    stopShakeAnimation(); // 停止晃动
    
    // 创建两个方向的动画
    const swap1 = createSwapAnimation(tile1.index, tile2.index);
    const swap2 = createSwapAnimation(tile2.index, tile1.index);
    
    // 保存动画引用
    const newSwapAnimations = new Map(swapAnimations);
    newSwapAnimations.set(tile1.index, swap1.animValue);
    newSwapAnimations.set(tile2.index, swap2.animValue);
    setSwapAnimations(newSwapAnimations);
    
    // 同时执行两个动画
    Animated.parallel([
      swap1.animation,
      swap2.animation
    ]).start(() => {
      // 动画完成后清理
      const cleanedAnimations = new Map(swapAnimations);
      cleanedAnimations.delete(tile1.index);
      cleanedAnimations.delete(tile2.index);
      setSwapAnimations(cleanedAnimations);
      
      setIsSwapping(false);
      onComplete();
    });
  };

  // 开始所有数字方块的晃动动画
  const startShakeAnimation = () => {
    if (isSwapping) return; // 交换过程中不晃动
    
    const animations = [];
    
    for (let i = 0; i < tiles.length; i++) {
      if (tiles[i] > 0) {
        const shakeAnim = initTileShake(i);
        const shakeAnimation = Animated.loop(
          Animated.sequence([
            Animated.timing(shakeAnim, {
              toValue: 2,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(shakeAnim, {
              toValue: -2,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(shakeAnim, {
              toValue: 0,
              duration: 200,
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
    if (isSwapMode) {
      startShakeAnimation();
    } else {
      stopShakeAnimation();
    }
    
    return () => {
      stopShakeAnimation();
    };
  }, [isSwapMode]);

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
      if (isSwapMode) return false;
      
      const { pageX, pageY } = evt.nativeEvent;
      // 只有在网格区域内才允许启动画框
      return !disabled && isInsideGridArea(pageX, pageY);
    },
    onMoveShouldSetPanResponder: (evt) => {
      // 交换模式下不允许画框
      if (isSwapMode) return false;
      
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
    if (!isSwapMode || disabled || value === 0 || isSwapping) return;
    
    const index = row * width + col;
    const clickedTile = { row, col, value, index };
    
    // 如果是第二次点击且不是同一个方块，执行交换动画
    if (selectedSwapTile && selectedSwapTile.index !== index && onSwapAnimation) {
      performSwapAnimation(selectedSwapTile, clickedTile, () => {
        // 动画完成后通知父组件
        if (onTileClick) {
          onTileClick(row, col, value);
        }
      });
      return;
    }
    
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
    
    if (swapAnim) {
      // 交换动画中
      transforms.push({
        translateX: swapAnim.x,
      });
      transforms.push({
        translateY: swapAnim.y,
      });
    } else if (isSwapMode && !isSwapping) {
      // 交换模式下的晃动效果
      transforms.push({
        translateX: tileShake.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [-2, 0, 2],
        }),
      });
    }
    
    // 检查是否是选中的交换方块
    const isSwapSelected = selectedSwapTile && selectedSwapTile.index === index;

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
            backgroundColor: isSwapSelected ? '#FFE082' : '#FFF8E1',
            borderWidth: isSwapSelected ? 3 : 2,
            borderColor: isSwapSelected ? '#FF9800' : '#E0E0E0',
          }
        ]}
      >
        <Text style={[
          styles.tileText,
          { 
            fontSize: tileSize * 0.5,
            color: isSwapSelected ? '#E65100' : '#333'
          }
        ]}>
          {value}
        </Text>
      </Animated.View>
    );
    
    // 如果是交换模式，包装成可点击的组件
    if (isSwapMode) {
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
    <View style={styles.container}>
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
        onSwapAnimation={performSwapAnimation}
      </View>
    </View>
  );
}

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