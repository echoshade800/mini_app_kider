/**
 * 棋盘自适应布局系统 - 唯一布局规则来源
 * Purpose: 根据数字方块数量动态计算棋盘尺寸和布局
 * Features: 自适应尺寸、最小28px限制、棋盘比矩形大一圈
 */

import { Dimensions } from 'react-native';

// 根据关卡获取数字方块数量（从boardGenerator复制过来避免循环依赖）
function getTileCount(level, isChallenge = false) {
  if (isChallenge) {
    // 挑战模式：使用高数量提供最大挑战
    return 200; // 固定高数量
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

/**
 * 自适应棋盘布局计算
 * @param {number} N - 数字方块数量
 * @param {number} targetAspect - 期望宽高比（可选）
 * @param {number} level - 关卡等级（用于特殊处理）
 * @returns {Object} 完整布局信息
 */
export function computeAdaptiveLayout(N, targetAspect = null, level = null) {
  const gameArea = getEffectiveGameArea();
  let { rows, cols } = computeGridRC(N, targetAspect);
  
  // 前35关：使用第35关的方块尺寸作为基准
  if (level && level <= 35) {
    const level35TileCount = getTileCount(35, false);
    const level35Layout = computeGridRC(level35TileCount, targetAspect);
    const level35TileSize = computeTileSize(
      gameArea.width, 
      gameArea.height, 
      level35Layout.rows, 
      level35Layout.cols
    );
    
    if (level35TileSize.isValid) {
      const targetTileSize = level35TileSize.tileSize;
      
      // 计算数字方块矩形尺寸
      const tilesRectWidth = cols * targetTileSize + (cols - 1) * TILE_GAP;
      const tilesRectHeight = rows * targetTileSize + (rows - 1) * TILE_GAP;
      
      // 计算棋盘内容区和总尺寸
      const contentWidth = tilesRectWidth + 2 * BOARD_PADDING;
      const contentHeight = tilesRectHeight + 2 * BOARD_PADDING;
      const boardWidth = contentWidth + WOOD_FRAME_WIDTH * 2;
      const boardHeight = contentHeight + WOOD_FRAME_WIDTH * 2;
      
      // 检查是否能放入有效区域
      if (boardWidth <= gameArea.width && boardHeight <= gameArea.height) {
        const boardLeft = (gameArea.width - boardWidth) / 2;
        const boardTop = gameArea.top + (gameArea.height - boardHeight) / 2;
        
        return {
          tileSize: targetTileSize,
          tilesRectWidth,
          tilesRectHeight,
          boardWidth,
          boardHeight,
          contentWidth,
          contentHeight,
          rows,
          cols,
          boardLeft,
          boardTop,
          gameArea,
          isValid: true,
        };
      }
    }
  }
  
  // 策略a: 尝试在有