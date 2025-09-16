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

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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
export function GameBoard({ 
  board, 
  onTilesClear, 
  onTileClick, 
  swapMode = false, 
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
export function GameBoard({ 
  board, 
  onTilesClear, 
  onTileClick, 
  swapMode = false, 
  firstSwapTile = null, 
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
}) {
}) {
  const [hoveredTiles, setHoveredTiles] = useState(new Set());
  const [explosionAnimation, setExplosionAnimation] = useState(null);
  const tileScales = useRef({}).current;
  const explosionScale = useRef(new Animated.Value(0)).current;
  const explosionOpacity = useRef(new Animated.Value(0)).current;

  if (!board) {
    return (
    // 第一步：必须在棋盘内部区域（排除边框）
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

  const isInsideBoardOnly = (pageX, pageY) => {
    // 计算棋盘在屏幕上的位置
    const boardCenterX = screenWidth / 2;
    const boardCenterY = screenHeight / 2;
    const boardX = boardCenterX - boardWidth / 2;
    const boardY = boardCenterY - boardHeight / 2;
    const boardW = boardWidth;
    const boardH = boardHeight;
    
    // 严格检查：必须在棋盘内部区域（排除边框）
    const margin = 10; // 棋盘内边距
    const insideBoard = pageX >= boardX + margin && pageX < boardX + boardW - margin && 
                       pageY >= boardY + margin && pageY < boardY + boardH - margin;
    
    // 第二步：不能在任何按钮区域内
    if (!insideBoard) return false;
    if (isInsideButtonArea(pageX, pageY)) return false;
    
    return true;
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
      const { pageX, pageY } = evt.nativeEvent;
      // 严格检查：只有在纯棋盘区域内才允许启动画框
      return !disabled && isInsideBoardOnly(pageX, pageY);
    },
    onMoveShouldSetPanResponder: (evt) => {
      const { pageX, pageY } = evt.nativeEvent;
      // 移动过程中也要持续检查区域
      return !disabled && isInsideBoardOnly(pageX, pageY);
    },

    onPanResponderGrant: (evt) => {
      const { pageX, pageY } = evt.nativeEvent;
      
      // 双重检查：确保在棋盘区域内
      if (!isInsideBoardOnly(pageX, pageY)) return;
      
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
      
      // 如果移动到棋盘外，终止选择
      if (!isInsideBoardOnly(pageX, pageY)) {
        resetSelection();
        return;
      }
      
      // 计算棋盘在屏幕上的位置
      const boardCenterX = screenWidth / 2;
      const boardCenterY = screenHeight / 2;
      const boardLeft = boardCenterX - boardWidth / 2;
      const boardTop = boardCenterY - boardHeight / 2;
      
      const relativeX = pageX - boardLeft - 10;
      const relativeY = pageY - boardTop - 10;
      
      const endCol = Math.floor(relativeX / cellSize) + bounds.minCol;
      const endRow = Math.floor(relativeY / cellSize) + bounds.minRow;
      
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
    },
    
    // 允许其他组件终止画框（按钮优先）
    onPanResponderTerminationRequest: () => true,
    
    // 被其他组件拒绝时清理状态
    onPanResponderReject: () => {
      resetSelection();
    },
  });

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

    return (
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
            transform: [{ scale: tileScale }],
            backgroundColor: '#FFF8E1',
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

// 按钮区域收集组件
function ButtonAreaCollector({ onButtonAreasUpdate }) {
  const [backButtonLayout, setBackButtonLayout] = useState(null);
  const [changeButtonLayout, setChangeButtonLayout] = useState(null);

  useEffect(() => {
    // 收集所有按钮区域
    const areas = [];
    if (backButtonLayout) {
      areas.push({
        name: 'backButton',
        x: backButtonLayout.x,
        y: backButtonLayout.y,
        width: backButtonLayout.width,
        height: backButtonLayout.height
      });
    }
    if (changeButtonLayout) {
      areas.push({
        name: 'changeButton', 
        x: changeButtonLayout.x,
        y: changeButtonLayout.y,
        width: changeButtonLayout.width,
      });
    }
    onButtonAreasUpdate(areas);
  }, [backButtonLayout, changeButtonLayout, onButtonAreasUpdate]);

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