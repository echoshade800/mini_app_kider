/**
 * 棋盘布局系统 - 以数字方块矩形为基准，外扩2px得到棋盘背景
 * Purpose: 先确定数字方块位置，再由其外扩得到棋盘格背景
 * Features: 单一真源布局，避免冲突，确保方块在棋盘内
 */

import { Dimensions } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// 布局常量
const MIN_TILE_SIZE = 28; // 最小方块尺寸
const DEFAULT_TILE_GAP = 8; // 默认方块间距
const BOARD_MARGIN = 2; // 棋盘外扩边距（方块矩形到棋盘边框的距离）
const MIN_TILE_GAP = 2; // 最小方块间距

// 有效游戏区域配置
const EFFECTIVE_AREA = {
  TOP_RESERVED: 120,     // 顶部保留区域（HUD）
  BOTTOM_RESERVED: 120,  // 底部保留区域（道具栏）
};

/**
 * 获取有效游戏区域
 */
function getEffectiveArea() {
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
 */
export function computeGridRC(N, targetAspect = null) {
  if (N <= 0) return { rows: 1, cols: 1 };
  
  const gameArea = getEffectiveArea();
  const defaultAspect = targetAspect || (gameArea.width / gameArea.height);
  
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
 * 单一计算函数：以数字方块为基准的布局计算
 * @param {Object} effectiveArea - 有效游戏区域
 * @param {number} rows - 行数
 * @param {number} cols - 列数
 * @param {number} minTile - 最小方块尺寸
 * @param {number} prefGap - 首选间距
 * @param {number} margin - 棋盘外扩边距
 * @returns {Object} 完整布局信息
 */
function layoutBoard(effectiveArea, rows, cols, minTile = MIN_TILE_SIZE, prefGap = DEFAULT_TILE_GAP, margin = BOARD_MARGIN) {
  let tileSize = minTile;
  let gap = prefGap;
  
  // 计算在给定间距下的最大方块尺寸
  const maxTileWidth = (effectiveArea.width - (cols - 1) * gap - 2 * margin) / cols;
  const maxTileHeight = (effectiveArea.height - (rows - 1) * gap - 2 * margin) / rows;
  const maxTileSize = Math.floor(Math.min(maxTileWidth, maxTileHeight));
  
  if (maxTileSize >= minTile) {
    // 可以使用首选间距
    tileSize = maxTileSize;
  } else {
    // 需要收紧间距
    let currentGap = gap;
    while (currentGap >= MIN_TILE_GAP) {
      const testTileWidth = (effectiveArea.width - (cols - 1) * currentGap - 2 * margin) / cols;
      const testTileHeight = (effectiveArea.height - (rows - 1) * currentGap - 2 * margin) / rows;
      const testTileSize = Math.floor(Math.min(testTileWidth, testTileHeight));
      
      if (testTileSize >= minTile) {
        tileSize = testTileSize;
        gap = currentGap;
        break;
      }
      currentGap--;
    }
    
    // 如果收紧间距后仍然无法满足最小尺寸，使用最小尺寸
    if (tileSize < minTile) {
      tileSize = minTile;
      gap = MIN_TILE_GAP;
    }
  }
  
  // 计算数字方块矩形尺寸
  const tilesRectWidth = cols * tileSize + (cols - 1) * gap;
  const tilesRectHeight = rows * tileSize + (rows - 1) * gap;
  
  // 计算数字方块矩形在有效区域中的居中位置
  const tilesRectX = effectiveArea.left + (effectiveArea.width - tilesRectWidth) / 2;
  const tilesRectY = effectiveArea.top + (effectiveArea.height - tilesRectHeight) / 2;
  
  const tilesRect = {
    x: tilesRectX,
    y: tilesRectY,
    width: tilesRectWidth,
    height: tilesRectHeight,
  };
  
  // 棋盘背景由数字方块矩形外扩得到
  const boardRect = {
    x: tilesRect.x - margin,
    y: tilesRect.y - margin,
    width: tilesRect.width + 2 * margin,
    height: tilesRect.height + 2 * margin,
  };
  
  console.log('🎯 数字方块为基准的布局系统:');
  console.log(`   有效区域: ${effectiveArea.width} × ${effectiveArea.height}px`);
  console.log(`   数字方块矩形: ${tilesRectWidth} × ${tilesRectHeight}px`);
  console.log(`   方块尺寸: ${tileSize}px，间距: ${gap}px`);
  console.log(`   棋盘背景: ${boardRect.width} × ${boardRect.height}px (外扩${margin}px)`);
  console.log(`   数字方块位置: (${tilesRect.x}, ${tilesRect.y})`);
  console.log(`   棋盘背景位置: (${boardRect.x}, ${boardRect.y})`);
  console.log('🎯 ========================');
  
  return {
    tileSize,
    gap,
    tilesRect,
    boardRect,
    rows,
    cols,
    effectiveArea,
  };
}

/**
 * 计算每个方块的位置
 * @param {Object} layoutParams - 布局参数
 * @returns {Function} 位置计算函数
 */
export function createTilePositionCalculator(layoutParams) {
  const { tilesRect, tileSize, gap, rows, cols } = layoutParams;
  
  return function getTilePosition(row, col) {
    if (row < 0 || row >= rows || col < 0 || col >= cols) {
      return null;
    }
    
    const x = tilesRect.x + col * (tileSize + gap);
    const y = tilesRect.y + row * (tileSize + gap);
    
    return {
      x,
      y,
      width: tileSize,
      height: tileSize,
    };
  };
}

/**
 * 根据关卡获取数字方块数量
 */
function getTileCount(level, isChallenge = false) {
  if (isChallenge) {
    return 120; // 挑战模式固定数量
  }
  
  // 关卡模式渐进式增长
  if (level >= 1 && level <= 10) {
    return Math.floor(8 + level * 1.5);
  }
  if (level >= 11 && level <= 20) {
    return Math.floor(25 + (level - 10) * 2.5);
  }
  if (level >= 21 && level <= 30) {
    return Math.floor(50 + (level - 20) * 3);
  }
  if (level >= 31 && level <= 50) {
    return Math.floor(80 + (level - 30) * 2.5);
  }
  
  return 120; // 51关以后固定数量
}

/**
 * 获取完整的棋盘布局配置
 * @param {number} N - 数字方块数量
 * @param {number} targetAspect - 期望宽高比（可选）
 * @param {number} level - 关卡等级（可选）
 * @param {boolean} isChallenge - 是否为挑战模式
 * @returns {Object} 完整布局配置
 */
export function getBoardLayoutConfig(N, targetAspect = null, level = null, isChallenge = false) {
  const effectiveArea = getEffectiveArea();
  
  // 如果没有提供N，根据关卡计算
  if (!N) {
    N = getTileCount(level || 1, isChallenge);
  }
  
  const { rows, cols } = computeGridRC(N, targetAspect);
  const layoutParams = layoutBoard(effectiveArea, rows, cols);
  const getTilePosition = createTilePositionCalculator(layoutParams);
  
  return {
    ...layoutParams,
    getTilePosition,
    // 兼容性属性
    boardLeft: layoutParams.boardRect.x,
    boardTop: layoutParams.boardRect.y,
    boardWidth: layoutParams.boardRect.width,
    boardHeight: layoutParams.boardRect.height,
    contentWidth: layoutParams.tilesRect.width,
    contentHeight: layoutParams.tilesRect.height,
    // 布局常量
    tileGap: layoutParams.gap,
    boardPadding: BOARD_MARGIN,
    woodFrameWidth: 0, // 不再使用木框概念
    minTileSize: MIN_TILE_SIZE,
  };
}