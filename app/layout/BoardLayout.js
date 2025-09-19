/**
 * 棋盘布局系统 - 全新设计
 * Purpose: 固定32px方块，棋盘铺满有效区域，数字方块矩形居中
 * Features: 自适应屏幕、固定方块尺寸、居中对齐、2px间距
 */

import { Dimensions } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// 布局常量
const TILE_SIZE = 32;           // 固定方块尺寸
const TILE_GAP = 2;             // 方块间距
const FRAME_PADDING = 2;        // 数字方块矩形与木框的间距
const WOOD_FRAME_WIDTH = 8;     // 木框厚度

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
 * 根据关卡获取数字方块数量
 */
function getTileCount(level, isChallenge = false) {
  if (isChallenge) {
    return 120; // 挑战模式固定数量
  }
  
  // 关卡模式：渐进式增长
  if (level >= 1 && level <= 10) {
    return Math.floor(12 + level * 2); // 14-32个方块
  }
  if (level >= 11 && level <= 20) {
    return Math.floor(30 + (level - 10) * 3); // 33-60个方块
  }
  if (level >= 21 && level <= 30) {
    return Math.floor(60 + (level - 20) * 4); // 64-100个方块
  }
  if (level >= 31 && level <= 50) {
    return Math.floor(100 + (level - 30) * 3); // 103-160个方块
  }
  if (level >= 51 && level <= 80) {
    return Math.floor(160 + (level - 50) * 2); // 162-220个方块
  }
  if (level >= 81 && level <= 120) {
    return Math.floor(220 + (level - 80) * 1.5); // 221-280个方块
  }
  if (level >= 121 && level <= 200) {
    return Math.floor(280 + (level - 120) * 1); // 281-360个方块
  }
  
  // 200关以后继续增长
  return Math.floor(360 + (level - 200) * 0.5);
}

/**
 * 计算数字方块矩形的最佳行列数
 */
function calculateTileGrid(tileCount, availableWidth, availableHeight) {
  // 计算可用空间（减去木框和间距）
  const usableWidth = availableWidth - WOOD_FRAME_WIDTH * 2 - FRAME_PADDING * 2;
  const usableHeight = availableHeight - WOOD_FRAME_WIDTH * 2 - FRAME_PADDING * 2;
  
  // 计算最大可能的行列数
  const maxCols = Math.floor((usableWidth + TILE_GAP) / (TILE_SIZE + TILE_GAP));
  const maxRows = Math.floor((usableHeight + TILE_GAP) / (TILE_SIZE + TILE_GAP));
  const maxTiles = maxRows * maxCols;
  
  // 如果方块数量超过最大容量，使用最大容量
  const actualTileCount = Math.min(tileCount, maxTiles);
  
  // 寻找最佳的行列组合（尽量接近正方形）
  let bestRows = 1, bestCols = actualTileCount;
  let bestRatio = Infinity;
  
  for (let rows = 1; rows <= maxRows; rows++) {
    const cols = Math.ceil(actualTileCount / rows);
    if (cols <= maxCols && rows * cols >= actualTileCount) {
      const ratio = Math.abs(cols / rows - 1); // 越接近1越好（正方形）
      if (ratio < bestRatio) {
        bestRatio = ratio;
        bestRows = rows;
        bestCols = cols;
      }
    }
  }
  
  return {
    rows: bestRows,
    cols: bestCols,
    actualTileCount,
    maxTiles
  };
}

/**
 * 计算完整的棋盘布局
 */
export function getBoardLayoutConfig(N, targetAspect = null, level = null) {
  const gameArea = getEffectiveGameArea();
  const tileCount = N || getTileCount(level || 1, level === null);
  
  // 棋盘铺满有效游戏区域
  const boardWidth = gameArea.width;
  const boardHeight = gameArea.height;
  const boardLeft = gameArea.left;
  const boardTop = gameArea.top;
  
  // 计算数字方块矩形的行列数
  const gridInfo = calculateTileGrid(tileCount, boardWidth, boardHeight);
  const { rows, cols, actualTileCount } = gridInfo;
  
  // 计算数字方块矩形的实际尺寸
  const tilesRectWidth = cols * TILE_SIZE + (cols - 1) * TILE_GAP;
  const tilesRectHeight = rows * TILE_SIZE + (rows - 1) * TILE_GAP;
  
  // 计算数字方块矩形在棋盘中的居中位置
  const contentWidth = boardWidth - WOOD_FRAME_WIDTH * 2;
  const contentHeight = boardHeight - WOOD_FRAME_WIDTH * 2;
  
  const tilesRectLeft = (contentWidth - tilesRectWidth) / 2;
  const tilesRectTop = (contentHeight - tilesRectHeight) / 2;
  
  console.log('🎯 新布局系统计算结果:');
  console.log(`   屏幕尺寸: ${screenWidth}x${screenHeight}`);
  console.log(`   有效游戏区域: ${gameArea.width}x${gameArea.height}`);
  console.log(`   棋盘尺寸: ${boardWidth}x${boardHeight}`);
  console.log(`   数字方块网格: ${rows}行 x ${cols}列`);
  console.log(`   数字方块矩形: ${tilesRectWidth}x${tilesRectHeight}`);
  console.log(`   矩形位置: (${tilesRectLeft.toFixed(1)}, ${tilesRectTop.toFixed(1)})`);
  console.log(`   实际方块数: ${actualTileCount}/${tileCount}`);
  
  return {
    // 棋盘信息
    boardWidth,
    boardHeight,
    boardLeft,
    boardTop,
    
    // 数字方块网格信息
    rows,
    cols,
    tileSize: TILE_SIZE,
    tileGap: TILE_GAP,
    
    // 数字方块矩形信息
    tilesRectWidth,
    tilesRectHeight,
    tilesRectLeft,
    tilesRectTop,
    
    // 布局常量
    woodFrameWidth: WOOD_FRAME_WIDTH,
    framePadding: FRAME_PADDING,
    
    // 游戏区域信息
    gameArea,
    
    // 验证信息
    isValid: true,
    actualTileCount,
    maxTiles: gridInfo.maxTiles,
  };
}

/**
 * 计算每个方块的位置
 */
export function layoutTiles(layoutConfig) {
  const { 
    rows, 
    cols, 
    tileSize, 
    tileGap, 
    tilesRectLeft, 
    tilesRectTop,
    woodFrameWidth 
  } = layoutConfig;
  
  return function getTilePosition(row, col) {
    if (row < 0 || row >= rows || col < 0 || col >= cols) {
      return null;
    }
    
    // 计算方块在数字方块矩形中的相对位置
    const relativeX = col * (tileSize + tileGap);
    const relativeY = row * (tileSize + tileGap);
    
    // 计算方块在棋盘内容区域中的绝对位置
    const x = tilesRectLeft + relativeX;
    const y = tilesRectTop + relativeY;
    
    return {
      x,
      y,
      width: tileSize,
      height: tileSize,
    };
  };
}

/**
 * 获取完整的棋盘布局配置（兼容旧接口）
 */
export function computeAdaptiveLayout(N, targetAspect = null, level = null) {
  return getBoardLayoutConfig(N, targetAspect, level);
}

/**
 * 计算网格行列数（兼容旧接口）
 */
export function computeGridRC(N, targetAspect = null) {
  const gameArea = getEffectiveGameArea();
  const gridInfo = calculateTileGrid(N, gameArea.width, gameArea.height);
  return { rows: gridInfo.rows, cols: gridInfo.cols };
}