/**
 * GameBoard Component - Interactive game board with tile selection
 * Purpose: Render game tiles, handle touch interactions, and manage game state
 * Features: Rectangle selection, visual feedback, item usage, animations
 */

import React, { useState, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  PanResponder,
  Dimensions,
  Animated
} from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// 布局常量
const MIN_TILE_SIZE = 28; // 最小方块尺寸
const TILE_GAP = 4; // 方块间距
const BOARD_PADDING = 5; // 棋盘内边距（方块矩形到木框的留白）
const WOOD_FRAME_WIDTH = 8; // 木框厚度

// 有效游戏区域配置
const EFFECTIVE_AREA = {
  TOP_RESERVED: 120,     // 顶部保留区域（HUD）
  BOTTOM_RESERVED: 120,  // 底部保留区域（道具栏）
};

/**
 * 获取有效游戏区域尺寸
 */
function getEffectiveGameArea() {
  const effectiveHeight = screenHeight - EFFECTIVE_AREA.TOP_RESERVED - EFFECTIVE_AREA.BOTTOM_RESERVED;
  const effectiveWidth = screenWidth;
  
  return {
    width: effectiveWidth,
    height: effectiveHeight,
    top: EFFECTIVE_AREA.TOP_RESERVED,
    left: 0,
  };
}

/**
 * 根据数字方块数量计算最佳矩形行列数
 * @param {number} N - 数字方块数量
 * @param {number} targetAspect - 期望宽高比（可选，默认根据屏幕比例）
 * @returns {Object} { rows, cols }
 */
export function computeGridRC(N, targetAspect = null) {
  if (N <= 0) return { rows: 1, cols: 1 };
  
  const gameArea = getEffectiveGameArea();
  const defaultAspect = targetAspect || (gameArea.width / gameArea.height);
  
  // 寻找最接近目标宽高比的 (R, C) 组合
  let bestR = 1, bestC = N;
  let bestDiff = Infinity;
  
  for (let r = 1; r <= N; r++) {
    const c = Math.ceil(N / r);
    if (r * c >= N) {
      const currentAspect = c / r;
      const diff = Math.abs(currentAspect - defaultAspect);
      
      if (diff < bestDiff) {
        bestDiff = diff;
        bestR = r;
        bestC = c;
      }
    }
  }
  
  return { rows: bestR, cols: bestC };
}

/**
 * 计算在给定容器内能放下的最大方块尺寸
 * @param {number} containerWidth - 容器宽度
 * @param {number} containerHeight - 容器高度
 * @param {number} rows - 行数
 * @param {number} cols - 列数
 * @param {number} gap - 方块间距
 * @param {number} padding - 内边距
 * @param {number} minTile - 最小方块尺寸
 * @returns {Object} 布局信息
 */
export function computeTileSize(containerWidth, containerHeight, rows, cols, gap = TILE_GAP, padding = BOARD_PADDING, minTile = MIN_TILE_SIZE) {
  // 计算可用空间（减去木框厚度和内边距）
  const availableWidth = containerWidth - WOOD_FRAME_WIDTH * 2 - padding * 2;
  const availableHeight = containerHeight - WOOD_FRAME_WIDTH * 2 - padding * 2;
  
  // 计算方块尺寸上限
  const tileW = (availableWidth - (cols - 1) * gap) / cols;
  const tileH = (availableHeight - (rows - 1) * gap) / rows;
  const tileSize = Math.floor(Math.min(tileW, tileH));
  
  // 计算数字方块矩形的实际尺寸
  const tilesRectWidth = cols * tileSize + (cols - 1) * gap;
  const tilesRectHeight = rows * tileSize + (rows - 1) * gap;
  
  // 计算棋盘内容区尺寸（数字方块矩形 + 内边距）
  const contentWidth = tilesRectWidth + 2 * padding;
  const contentHeight = tilesRectHeight + 2 * padding;
  
  // 棋盘总尺寸（内容区 + 木框）
  const boardWidth = contentWidth + WOOD_FRAME_WIDTH * 2;
  const boardHeight = contentHeight + WOOD_FRAME_WIDTH * 2;
  
  return {
    tileSize,
    tilesRectWidth,
    tilesRectHeight,
    boardWidth,
    boardHeight,
    contentWidth,
    contentHeight,
    isValid: tileSize >= minTile,
  };
}

export const GameBoard = ({ 
  tiles, 
  width, 
  height, 
  onTilesClear, 
  disabled = false,
  itemMode = null,
  onTileClick = null,
  selectedSwapTile = null,
  swapAnimations = new Map(),
  fractalAnimations = new Map(),
  settings = {},
  isChallenge = false,
  layoutConfig = null
}) => {
  const [selectedTiles, setSelectedTiles] = useState([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionSum, setSelectionSum] = useState(0);
  const [showSum, setShowSum] = useState(false);
  const [sumPosition, setSumPosition] = useState({ x: 0, y: 0 });
  
  // Animation values
  const sumOpacity = useRef(new Animated.Value(0)).current;
  const sumScale = useRef(new Animated.Value(0.8)).current;

  // 使用传入的layoutConfig或计算默认布局
  const gameArea = getEffectiveGameArea();
  const layout = layoutConfig || {
    rows: height,
    cols: width,
    tileSize: 34,
    boardWidth: 382,
    boardHeight: 582,
    boardLeft: (gameArea.width - 382) / 2,
    boardTop: gameArea.top + (gameArea.height - 582) / 2,
    getTilePosition: (row, col) => ({
      x: col * (34 + TILE_GAP),
      y: row * (34 + TILE_GAP),
      width: 34,
      height: 34,
    })
  };

  const getTileIndex = (row, col) => row * width + col;
  
  const getTilePosition = (row, col) => {
    if (layout.getTilePosition) {
      return layout.getTilePosition(row, col);
    }
    
    // 默认位置计算
    return {
      x: col * (layout.tileSize + TILE_GAP),
      y: row * (layout.tileSize + TILE_GAP),
      width: layout.tileSize,
      height: layout.tileSize,
    };
  };

  const getPositionFromTouch = (x, y) => {
    // 转换为相对于棋盘内容区的坐标
    const relativeX = x - layout.boardLeft - WOOD_FRAME_WIDTH - BOARD_PADDING;
    const relativeY = y - layout.boardTop - WOOD_FRAME_WIDTH - BOARD_PADDING;
    
    if (relativeX < 0 || relativeY < 0) return null;
    
    const col = Math.floor(relativeX / (layout.tileSize + TILE_GAP));
    const row = Math.floor(relativeY / (layout.tileSize + TILE_GAP));
    
    if (row >= 0 && row < height && col >= 0 && col < width) {
      return { row, col };
    }
    
    return null;
  };

  const getRectangleSelection = (startPos, endPos) => {
    if (!startPos || !endPos) return [];
    
    const minRow = Math.min(startPos.row, endPos.row);
    const maxRow = Math.max(startPos.row, endPos.row);
    const minCol = Math.min(startPos.col, endPos.col);
    const maxCol = Math.max(startPos.col, endPos.col);
    
    const selection = [];
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const index = getTileIndex(row, col);
        if (tiles[index] > 0) {
          selection.push({ row, col, value: tiles[index], index });
        }
      }
    }
    
    return selection;
  };

  const animateSum = (show, position = { x: 0, y: 0 }) => {
    if (show) {
      setSumPosition(position);
      setShowSum(true);
      
      Animated.parallel([
        Animated.timing(sumOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(sumScale, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(sumOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(sumScale, {
          toValue: 0.8,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowSum(false);
      });
    }
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled && !itemMode,
    onMoveShouldSetPanResponder: () => !disabled && !itemMode,
    
    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      const startPos = getPositionFromTouch(locationX, locationY);
      
      if (startPos) {
        setIsSelecting(true);
        const selection = getRectangleSelection(startPos, startPos);
        setSelectedTiles(selection);
        
        const sum = selection.reduce((acc, tile) => acc + tile.value, 0);
        setSelectionSum(sum);
        
        // Show sum near touch position
        animateSum(true, { x: locationX + 20, y: locationY - 30 });
      }
    },
    
    onPanResponderMove: (evt) => {
      if (!isSelecting) return;
      
      const { locationX, locationY } = evt.nativeEvent;
      const currentPos = getPositionFromTouch(locationX, locationY);
      
      if (currentPos && selectedTiles.length > 0) {
        const startPos = { row: selectedTiles[0].row, col: selectedTiles[0].col };
        const selection = getRectangleSelection(startPos, currentPos);
        setSelectedTiles(selection);
        
        const sum = selection.reduce((acc, tile) => acc + tile.value, 0);
        setSelectionSum(sum);
        
        // Update sum position
        setSumPosition({ x: locationX + 20, y: locationY - 30 });
      }
    },
    
    onPanResponderRelease: () => {
      if (!isSelecting) return;
      
      setIsSelecting(false);
      animateSum(false);
      
      if (selectedTiles.length > 0) {
        const sum = selectedTiles.reduce((acc, tile) => acc + tile.value, 0);
        
        if (sum === 10) {
          // Success - clear tiles
          const positions = selectedTiles.map(tile => ({ row: tile.row, col: tile.col }));
          onTilesClear?.(positions);
        }
      }
      
      // Clear selection after a short delay
      setTimeout(() => {
        setSelectedTiles([]);
        setSelectionSum(0);
      }, sum === 10 ? 500 : 200);
    },
  });

  const handleTilePress = (row, col, value) => {
    if (disabled || !itemMode || !onTileClick) return;
    onTileClick(row, col, value);
  };

  const renderTile = (row, col) => {
    const index = getTileIndex(row, col);
    const value = tiles[index];
    const position = getTilePosition(row, col);
    
    if (!position) return null;
    
    const isSelected = selectedTiles.some(tile => tile.row === row && tile.col === col);
    const isSwapSelected = selectedSwapTile && selectedSwapTile.row === row && selectedSwapTile.col === col;
    
    // 空位不渲染
    if (value === 0) return null;
    
    return (
      <View
        key={`${row}-${col}`}
        style={[
          styles.tile,
          {
            left: position.x,
            top: position.y,
            width: position.width,
            height: position.height,
          },
          isSelected && (selectionSum === 10 ? styles.tileSelectedSuccess : styles.tileSelectedDefault),
          isSwapSelected && styles.tileSwapSelected,
          itemMode === 'fractalSplit' && styles.tileFractalMode,
        ]}
        onTouchEnd={() => handleTilePress(row, col, value)}
      >
        <Text style={[
          styles.tileText,
          { fontSize: Math.max(12, position.width * 0.4) },
          isSelected && styles.tileTextSelected,
          isSwapSelected && styles.tileTextSwapSelected,
        ]}>
          {value}
        </Text>
      </View>
    );
  };

  const renderAllTiles = () => {
    const tileElements = [];
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const tile = renderTile(row, col);
        if (tile) {
          tileElements.push(tile);
        }
      }
    }
    return tileElements;
  };

  return (
    <View style={styles.container}>
      <View 
        style={[
          styles.gameBoard,
          {
            width: layout.boardWidth,
            height: layout.boardHeight,
            left: layout.boardLeft,
            top: layout.boardTop,
          }
        ]}
        {...panResponder.panHandlers}
      >
        {/* 绿色背景边界 */}
        <View style={[
          styles.greenBackground,
          {
            width: layout.contentWidth || layout.boardWidth - WOOD_FRAME_WIDTH * 2,
            height: layout.contentHeight || layout.boardHeight - WOOD_FRAME_WIDTH * 2,
          }
        ]} />
        
        {/* 数字方块容器 */}
        <View style={styles.tilesContainer}>
          {renderAllTiles()}
        </View>
        
        {/* 和值显示 */}
        {showSum && (
          <Animated.View
            style={[
              styles.sumDisplay,
              {
                left: sumPosition.x,
                top: sumPosition.y,
                opacity: sumOpacity,
                transform: [{ scale: sumScale }],
              },
              selectionSum === 10 ? styles.sumDisplaySuccess : styles.sumDisplayDefault,
            ]}
          >
            <Text style={[
              styles.sumText,
              selectionSum === 10 ? styles.sumTextSuccess : styles.sumTextDefault,
            ]}>
              {selectionSum}
            </Text>
          </Animated.View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  gameBoard: {
    position: 'absolute',
    backgroundColor: '#8B4513', // 棕色木框
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  greenBackground: {
    position: 'absolute',
    top: WOOD_FRAME_WIDTH,
    left: WOOD_FRAME_WIDTH,
    backgroundColor: '#1E5A3C', // 深绿色背景
    borderRadius: 4,
  },
  tilesContainer: {
    position: 'absolute',
    top: WOOD_FRAME_WIDTH + BOARD_PADDING,
    left: WOOD_FRAME_WIDTH + BOARD_PADDING,
  },
  tile: {
    position: 'absolute',
    backgroundColor: '#F5F5DC', // 米色
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#DDD',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  tileSelectedDefault: {
    backgroundColor: '#87CEEB', // 天蓝色
    borderColor: '#4682B4',
    borderWidth: 2,
  },
  tileSelectedSuccess: {
    backgroundColor: '#90EE90', // 浅绿色
    borderColor: '#32CD32',
    borderWidth: 2,
  },
  tileSwapSelected: {
    backgroundColor: '#FFD700', // 金色
    borderColor: '#FFA500',
    borderWidth: 2,
  },
  tileFractalMode: {
    borderColor: '#9C27B0',
    borderWidth: 2,
  },
  tileText: {
    fontWeight: 'bold',
    color: '#333',
  },
  tileTextSelected: {
    color: '#fff',
  },
  tileTextSwapSelected: {
    color: '#8B4513',
  },
  sumDisplay: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 1000,
  },
  sumDisplayDefault: {
    backgroundColor: 'rgba(70, 130, 180, 0.9)',
  },
  sumDisplaySuccess: {
    backgroundColor: 'rgba(50, 205, 50, 0.9)',
  },
  sumText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  sumTextDefault: {
    color: '#fff',
  },
  sumTextSuccess: {
    color: '#fff',
  },
});

export default GameBoard;