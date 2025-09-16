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
  itemMode = null, // 'swap' | 'swapMaster' | 'fractalSplit' | null
  selectedTile = null,
  disabled = false,
  animationsProp = new Map()
}) {
  const { settings } = useGameStore();
  const [selection, setSelection] = useState(null);
  const [hoveredTiles, setHoveredTiles] = useState(new Set());
  const [explosionAnimation, setExplosionAnimation] = useState(null);
  
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
  
  // 使用完整的棋盘尺寸，不随数字方块消除而改变
  const bounds = { minRow: 0, maxRow: height - 1, minCol: 0, maxCol: width - 1 };
  const actualWidth = width;
  const actualHeight = height;
  
  // 计算格子大小，数字方块更小
  const cellSize = Math.min(
    (screenWidth - 80) / actualWidth, 
    (screenHeight - 300) / actualHeight,
    50
  );
  
  // 数字方块的实际大小（恢复到之前的设置）
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
    for (let i = 0; i < tiles.length; i++) {
      if (tiles[i] > 0) {
        const shakeAnim = initTileShake(i);
        Animated.loop(
          Animated.sequence([
            Animated.timing(shakeAnim, {
              toValue: 1,
              duration: 150,
              useNativeDriver: true,
            }),
            Animated.timing(shakeAnim, {
              toValue: -1,
              duration: 150,
              useNativeDriver: true,
            }),
            Animated.timing(shakeAnim, {
              toValue: 0,
              duration: 150,
              useNativeDriver: true,
            }),
          ])
        ).start();
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

  // 开始道具模式时启动晃动
  React.useEffect(() => {
    if (itemMode) {
      startShakeAnimation();
    } else {
      stopShakeAnimation();
    }
    
    return () => {
      stopShakeAnimation();
    };
  }, [itemMode]);

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
    const col = Math.floor(relativeX / cellSize) + bounds.minCol;
    const row = Math.floor(relativeY / cellSize) + bounds.minRow;
    
    return row >= bounds.minRow && row <= bounds.maxRow &&
           col >= bounds.minCol && col <= bounds.maxCol;
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
      // 道具模式下不允许画框
      if (itemMode) return false;
      
      // 检查是否在禁止画框的区域
      if (isInRestrictedArea(evt.nativeEvent.pageY)) return false;
      
      // 道具模式下不允许画框
      if (itemMode) return false;
      
      const { pageX, pageY } = evt.nativeEvent;
      // 只有在网格区域内才允许启动画框
      return !disabled && isInsideGridArea(pageX, pageY);
    },
    onMoveShouldSetPanResponder: (evt) => {
      // 道具模式下不允许画框
      if (itemMode) return false;
      
      // 检查是否在禁止画框的区域
      if (isInRestrictedArea(evt.nativeEvent.pageY)) return false;
      
      // 道具模式下不允许画框
      if (itemMode) return false;
      
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
    onPanResponderTerminationRequest: (evt) => {
      // 如果触摸点在按钮区域，优先给按钮处理
      const { pageX, pageY } = evt.nativeEvent;
      const buttonAreaBottom = screenHeight - 10; // 底部按钮区域
      const buttonAreaTop = screenHeight - 200; // 按钮区域顶部
      const topRestrictedHeight = 200; // 顶部限制区域
      
      // 如果触摸在按钮区域或限制区域，让其他组件优先处理
      if ((pageY >= buttonAreaTop && pageY <= buttonAreaBottom) || 
          pageY < topRestrictedHeight) {
        return true;
      }
      
      return true;
    },
    
    // 被其他组件拒绝时清理状态
    onPanResponderReject: () => {
      resetSelection();
    },
  });

  // 处理数字方块点击（道具模式）
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

    const left = (col - bounds.minCol) * cellSize + 10 + tileMargin;
    const top = (row - bounds.minRow) * cellSize + 10 + tileMargin;

    const tileScale = initTileScale(index);
    const tileShake = initTileShake(index);
    const itemAnim = animationsProp.get(index);
    
    // 计算变换 - 修复transform错误
    const transforms = [{ scale: tileScale }];
    
    if (itemMode) {
      // 道具模式下的晃动效果 - 分别添加translateX和translateY
      transforms.push({
        translateX: tileShake.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [-2, 0, 2],
        }),
      });
      transforms.push({
        translateY: tileShake.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [-1, 0, 1],
        }),
      });
    }
    
    // 如果有道具动画，添加位置变换
    if (itemAnim) {
      transforms.push({
        translateX: itemAnim.translateX,
      });
      transforms.push({
        translateY: itemAnim.translateY,
      });
    }
    
    // 检查是否是选中的方块
    const isSelected = selectedTile && selectedTile.index === index;
    
    // 根据道具模式设置不同的选中样式
    let selectedBgColor = '#FFF8E1';
    let selectedBorderColor = '#E0E0E0';
    let selectedTextColor = '#333';
    
    if (isSelected) {
      if (itemMode === 'swap') {
        selectedBgColor = '#FFE082';
        selectedBorderColor = '#FF9800';
        selectedTextColor = '#E65100';
      } else if (itemMode === 'swapMaster') {
        selectedBgColor = '#E3F2FD';
        selectedBorderColor = '#2196F3';
        selectedTextColor = '#0D47A1';
      } else if (itemMode === 'fractalSplit') {
        selectedBgColor = '#E1F5FE';
        selectedBorderColor = '#9C27B0';
        selectedTextColor = '#4A148C';
      }
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
    
    // 如果是道具模式，包装成可点击的组件
    if (itemMode) {
      return (
        <TouchableOpacity
          key={`${row}-${col}`}
          style={{ 
            position: 'absolute', 
            left: left - tileMargin, 
            top: top - tileMargin, 
            width: cellSize, 
            height: cellSize,
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