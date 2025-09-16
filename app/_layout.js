/**
 * GameBoard Component - 优化版游戏棋盘
 * 需求1: 解决画框与按钮冲突 - 严格限制事件区域，分层穿透设计
 * 需求2: 固定格子尺寸 - 不随关卡缩放，保持手感一致性
 */

import React, { useState, useRef, useCallback } from 'react';
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

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// 需求2: 固定格子尺寸常量
const FIXED_TILE_SIZE = 48; // 固定格子大小
const TILE_GAP = 4; // 格子间距
const BOARD_PADDING = 12; // 棋盘内边距

export function GameBoard({ 
  board, 
  onTilesClear, 
  onTileClick, 
  swapMode = false, 
  firstSwapTile = null, 
  disabled = false 
}) {
  const { settings } = useGameStore();
  
  // 选择状态管理
  const [isSelecting, setIsSelecting] = useState(false);
  const [anchorPoint, setAnchorPoint] = useState(null);
  const [currentPoint, setCurrentPoint] = useState(null);
  const [selectionSum, setSelectionSum] = useState(0);
  
  // 动画引用
  const explosionAnimation = useRef(null);
  const explosionScale = useRef(new Animated.Value(0)).current;
  const explosionOpacity = useRef(new Animated.Value(0)).current;
  const selectionOpacity = useRef(new Animated.Value(0)).current;

  if (!board) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading board...</Text>
      </View>
    );
  }

  const { width, height, tiles } = board;
  
  // 计算实际内容边界
  const getActualBounds = useCallback(() => {
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
  }, [tiles, width, height]);

  const bounds = getActualBounds();
  const actualWidth = bounds.maxCol - bounds.minCol + 1;
  const actualHeight = bounds.maxRow - bounds.minRow + 1;
  
  // 需求2: 固定尺寸计算
  const boardWidth = actualWidth * (FIXED_TILE_SIZE + TILE_GAP) - TILE_GAP + BOARD_PADDING * 2;
  const boardHeight = actualHeight * (FIXED_TILE_SIZE + TILE_GAP) - TILE_GAP + BOARD_PADDING * 2;

  // 需求1: 棋盘区域边界计算（用于事件限制）
  const boardRect = {
    x: (screenWidth - boardWidth) / 2,
    y: 0, // 将由父组件定位
    width: boardWidth,
    height: boardHeight
  };

  // 需求1: 屏幕坐标转网格坐标
  const getGridPosition = useCallback((pageX, pageY, boardY) => {
    const relativeX = pageX - boardRect.x - BOARD_PADDING;
    const relativeY = pageY - boardY - BOARD_PADDING;
    
    const col = Math.floor(relativeX / (FIXED_TILE_SIZE + TILE_GAP)) + bounds.minCol;
    const row = Math.floor(relativeY / (FIXED_TILE_SIZE + TILE_GAP)) + bounds.minRow;
    
    return { row, col };
  }, [boardRect.x, bounds.minCol, bounds.minRow]);

  // 需求1: 检查是否在棋盘区域内
  const isInsideBoard = useCallback((pageX, pageY, boardY) => {
    return pageX >= boardRect.x && 
           pageX < boardRect.x + boardRect.width &&
           pageY >= boardY && 
           pageY < boardY + boardRect.height;
  }, [boardRect]);

  // 更新选择区域
  const updateSelection = useCallback((anchor, current) => {
    if (!anchor || !current) return;

    const minRow = Math.min(anchor.row, current.row);
    const maxRow = Math.max(anchor.row, current.row);
    const minCol = Math.min(anchor.col, current.col);
    const maxCol = Math.max(anchor.col, current.col);

    const newSelectedTiles = [];
    let sum = 0;

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        if (row >= 0 && row < height && col >= 0 && col < width) {
          const index = row * width + col;
          const value = tiles[index];
          if (value > 0) {
            newSelectedTiles.push({ row, col, value, index });
            sum += value;
          }
        }
      }
    }

    setSelectedTiles(newSelectedTiles);
    setSelectionSum(sum);
  }, [tiles, width, height]);

  // 重置选择状态
  const resetSelection = useCallback(() => {
    setIsSelecting(false);
    setAnchorPoint(null);
    setCurrentPoint(null);
    setSelectedTiles([]);
    setSelectionSum(0);
    
    Animated.timing(selectionOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [selectionOpacity]);

  // 处理选择完成
  const handleSelectionComplete = useCallback(async () => {
    if (selectedTiles.length === 0) {
      resetSelection();
      return;
    }

    const isSuccess = selectionSum === 10;
    
    if (isSuccess) {
      // 成功：长振动 + 爆炸动画
      if (settings?.hapticsEnabled !== false) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
      
      // 计算爆炸位置
      const centerRow = (anchorPoint.row + currentPoint.row) / 2;
      const centerCol = (anchorPoint.col + currentPoint.col) / 2;
      const explosionX = (centerCol - bounds.minCol) * (FIXED_TILE_SIZE + TILE_GAP) + FIXED_TILE_SIZE / 2 + BOARD_PADDING;
      const explosionY = (centerRow - bounds.minRow) * (FIXED_TILE_SIZE + TILE_GAP) + FIXED_TILE_SIZE / 2 + BOARD_PADDING;
      
      explosionAnimation.current = { x: explosionX, y: explosionY };
      
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
        explosionAnimation.current = null;
      });

      // 成功动画
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
        const tilePositions = selectedTiles.map(tile => ({ row: tile.row, col: tile.col }));
        resetSelection();
        onTilesClear(tilePositions);
      });

    } else {
      // 失败：短振动 + 蓝色反馈
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
        resetSelection();
      });
    }
  }, [selectedTiles, selectionSum, anchorPoint, currentPoint, bounds, settings, resetSelection, onTilesClear]);

  // 需求1: 严格限制事件区域的PanResponder
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: (evt) => {
      if (disabled) return false;
      // 只有在棋盘区域内才响应
      return isInsideBoard(evt.nativeEvent.pageX, evt.nativeEvent.pageY, boardRect.y);
    },
    
    onMoveShouldSetPanResponder: (evt) => {
      if (disabled) return false;
      return isInsideBoard(evt.nativeEvent.pageX, evt.nativeEvent.pageY, boardRect.y);
    },

    onPanResponderGrant: (evt) => {
      const { pageX, pageY } = evt.nativeEvent;
      const gridPos = getGridPosition(pageX, pageY, boardRect.y);
      
      // 检查是否点击到有效格子
      if (gridPos.row >= 0 && gridPos.row < height && 
          gridPos.col >= 0 && gridPos.col < width) {
        const index = gridPos.row * width + gridPos.col;
        if (tiles[index] > 0) {
          setIsSelecting(true);
          setAnchorPoint(gridPos);
          setCurrentPoint(gridPos);
          
          Animated.timing(selectionOpacity, {
            toValue: 0.5,
            duration: 80,
            useNativeDriver: false,
          }).start();
        }
      }
    },

    onPanResponderMove: (evt) => {
      if (!isSelecting || !anchorPoint) return;
      
      const { pageX, pageY } = evt.nativeEvent;
      const gridPos = getGridPosition(pageX, pageY, boardRect.y);
      
      setCurrentPoint(gridPos);
      updateSelection(anchorPoint, gridPos);
    },

    onPanResponderRelease: () => {
      if (isSelecting) {
        handleSelectionComplete();
      }
    },
  });

  // 获取选择框样式
  const getSelectionStyle = () => {
    if (!isSelecting || !anchorPoint || !currentPoint) return null;
    
    const minRow = Math.min(anchorPoint.row, currentPoint.row);
    const maxRow = Math.max(anchorPoint.row, currentPoint.row);
    const minCol = Math.min(anchorPoint.col, currentPoint.col);
    const maxCol = Math.max(anchorPoint.col, currentPoint.col);
    
    const isSuccess = selectionSum === 10;
    
    const left = (minCol - bounds.minCol) * (FIXED_TILE_SIZE + TILE_GAP) + BOARD_PADDING;
    const top = (minRow - bounds.minRow) * (FIXED_TILE_SIZE + TILE_GAP) + BOARD_PADDING;
    const width = (maxCol - minCol + 1) * (FIXED_TILE_SIZE + TILE_GAP) - TILE_GAP;
    const height = (maxRow - minRow + 1) * (FIXED_TILE_SIZE + TILE_GAP) - TILE_GAP;
    
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

  // 获取和值显示样式
  const getSumDisplayStyle = () => {
    if (!isSelecting || !anchorPoint || !currentPoint || selectedTiles.length === 0) return null;
    
    const minRow = Math.min(anchorPoint.row, currentPoint.row);
    const maxRow = Math.max(anchorPoint.row, currentPoint.row);
    const minCol = Math.min(anchorPoint.col, currentPoint.col);
    const maxCol = Math.max(anchorPoint.col, currentPoint.col);
    
    const centerCol = (minCol + maxCol) / 2;
    const centerRow = (minRow + maxRow) / 2;
    
    const left = (centerCol - bounds.minCol) * (FIXED_TILE_SIZE + TILE_GAP) + BOARD_PADDING;
    const top = (centerRow - bounds.minRow) * (FIXED_TILE_SIZE + TILE_GAP) + BOARD_PADDING;
    
    const isSuccess = selectionSum === 10;
    
    return {
      sum: selectionSum,
      isSuccess,
      style: {
        position: 'absolute',
        left: left - 25,
        top: top - 25,
        width: 50,
        height: 50,
        backgroundColor: isSuccess ? '#FFD700' : '#2196F3',
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: isSuccess ? '#FFA000' : '#1976D2',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 8,
      }
    };
  };

  // 渲染单个格子
  const renderTile = (value, row, col) => {
    const index = row * width + col;
    
    if (row < bounds.minRow || row > bounds.maxRow || 
        col < bounds.minCol || col > bounds.maxCol || value === 0) {
      return null;
    }

    const relativeRow = row - bounds.minRow;
    const relativeCol = col - bounds.minCol;
    const left = relativeCol * (FIXED_TILE_SIZE + TILE_GAP) + BOARD_PADDING;
    const top = relativeRow * (FIXED_TILE_SIZE + TILE_GAP) + BOARD_PADDING;

    return (
      <View 
        key={`${row}-${col}`}
        style={[
          styles.tile,
          { 
            position: 'absolute',
            left,
            top,
            width: FIXED_TILE_SIZE, 
            height: FIXED_TILE_SIZE,
          }
        ]}
      >
        <Text style={[
          styles.tileText,
          { fontSize: FIXED_TILE_SIZE * 0.4 }
        ]}>
          {value}
        </Text>
      </View>
    );
  };

  const selectionStyle = getSelectionStyle();
  const sumDisplay = getSumDisplayStyle();

  return (
    <View 
      style={[styles.boardContainer, { width: boardWidth, height: boardHeight }]}
      {...panResponder.panHandlers}
    >
      <View style={styles.board}>
        {/* 渲染格子 */}
        {tiles.map((value, index) => {
          const row = Math.floor(index / width);
          const col = index % width;
          return renderTile(value, row, col);
        })}
        
        {/* 选择框 */}
        {selectionStyle && (
          <Animated.View style={selectionStyle} />
        )}
        
        {/* 和值显示 */}
        {sumDisplay && (
          <View style={sumDisplay.style}>
            <Text style={[
              styles.sumText,
              { color: sumDisplay.isSuccess ? '#333' : 'white' }
            ]}>
              {sumDisplay.sum}
            </Text>
          </View>
        )}

        {/* 爆炸效果 */}
        {explosionAnimation.current && (
          <Animated.View
            style={[
              styles.explosion,
              {
                left: explosionAnimation.current.x - 30,
                top: explosionAnimation.current.y - 30,
                transform: [{ scale: explosionScale }],
                opacity: explosionOpacity,
              }
            ]}
          >
            <View style={styles.explosionCenter}>
              <Text style={styles.explosionText}>10</Text>
            </View>
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
  );
}

const styles = StyleSheet.create({
  boardContainer: {
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
    padding: BOARD_PADDING,
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
    width: '100%',
    height: '100%',
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