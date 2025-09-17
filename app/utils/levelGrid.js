/**
 * Level Grid System - 固定30px方块的棋盘布局系统
 * Purpose: 实现1-200关的棋盘尺寸增长和固定方块大小布局
 */

// 固定常量
const TILE_SIZE = 30;      // 固定方块大小：30px
const MIN_GAP = 3;         // 最小间距：3px
const MAX_GAP = 8;         // 最大间距：8px
const BOARD_PADDING = 12;  // 棋盘内边距

/**
 * 根据关卡获取棋盘行列数
 * @param {number} level 关卡数 (1-200+)
 * @returns {{rows: number, cols: number}}
 */
export function getGridByLevel(level) {
  // 关卡 → 行列增长表（1–200）
  if (level >= 1 && level <= 10) {
    return { rows: 4, cols: 4 };    // 新手引导
  }
  if (level >= 11 && level <= 20) {
    return { rows: 5, cols: 5 };
  }
  if (level >= 21 && level <= 30) {
    return { rows: 6, cols: 6 };
  }
  if (level >= 31 && level <= 40) {
    return { rows: 7, cols: 7 };
  }
  if (level >= 41 && level <= 50) {
    return { rows: 8, cols: 8 };
  }
  if (level >= 51 && level <= 60) {
    return { rows: 9, cols: 9 };
  }
  if (level >= 61 && level <= 80) {
    return { rows: 10, cols: 10 };
  }
  if (level >= 81 && level <= 100) {
    return { rows: 12, cols: 10 };  // 开始使用矩形布局
  }
  if (level >= 101 && level <= 120) {
    return { rows: 14, cols: 10 };
  }
  if (level >= 121 && level <= 200) {
    return { rows: 16, cols: 10 };  // 最大规格
  }
  
  // 200关以后继续使用最大规格
  return { rows: 16, cols: 10 };
}

/**
 * 计算棋盘布局参数
 * @param {Object} params
 * @param {number} params.rows 行数
 * @param {number} params.cols 列数
 * @param {number} params.availableWidth 可用宽度
 * @param {number} params.availableHeight 可用高度
 * @returns {{tileSize: number, gap: number, boardWidth: number, boardHeight: number, padding: number}}
 */
export function computeBoardLayout({ rows, cols, availableWidth, availableHeight }) {
  const tileSize = TILE_SIZE; // 固定30px
  
  // 计算理想间距（基于可用空间）
  const maxBoardWidth = availableWidth - 40; // 左右边距
  const maxBoardHeight = availableHeight - 40; // 上下边距
  
  // 计算可用于间距的空间
  const widthForGaps = maxBoardWidth - (cols * tileSize) - (BOARD_PADDING * 2);
  const heightForGaps = maxBoardHeight - (rows * tileSize) - (BOARD_PADDING * 2);
  
  // 计算间距（水平和垂直取较小值保证一致性）
  const gapByWidth = widthForGaps / (cols - 1);
  const gapByHeight = heightForGaps / (rows - 1);
  const idealGap = Math.min(gapByWidth, gapByHeight);
  
  // 限制间距范围
  const gap = Math.max(MIN_GAP, Math.min(MAX_GAP, idealGap));
  
  // 计算实际棋盘尺寸
  const boardWidth = cols * tileSize + (cols - 1) * gap + BOARD_PADDING * 2;
  const boardHeight = rows * tileSize + (rows - 1) * gap + BOARD_PADDING * 2;
  
  return {
    tileSize,
    gap: Math.floor(gap),
    boardWidth: Math.floor(boardWidth),
    boardHeight: Math.floor(boardHeight),
    padding: BOARD_PADDING
  };
}

/**
 * 获取关卡的完整布局信息
 * @param {number} level 关卡数
 * @param {number} screenWidth 屏幕宽度
 * @param {number} screenHeight 屏幕高度
 * @param {number} topReserved 顶部保留高度
 * @param {number} bottomReserved 底部保留高度
 * @returns {Object} 完整的布局信息
 */
export function getLevelLayout(level, screenWidth, screenHeight, topReserved = 120, bottomReserved = 120) {
  const { rows, cols } = getGridByLevel(level);
  const availableHeight = screenHeight - topReserved - bottomReserved;
  
  const layoutParams = computeBoardLayout({
    rows,
    cols,
    availableWidth: screenWidth,
    availableHeight
  });
  
  return {
    level,
    rows,
    cols,
    ...layoutParams
  };
}

/**
 * 获取挑战模式布局（使用最大规格）
 * @param {number} screenWidth 屏幕宽度
 * @param {number} screenHeight 屏幕高度
 * @param {number} topReserved 顶部保留高度
 * @param {number} bottomReserved 底部保留高度
 * @returns {Object} 挑战模式布局信息
 */
export function getChallengeLayout(screenWidth, screenHeight, topReserved = 120, bottomReserved = 120) {
  const rows = 16; // 最大行数
  const cols = 10; // 最大列数
  const availableHeight = screenHeight - topReserved - bottomReserved;
  
  const layoutParams = computeBoardLayout({
    rows,
    cols,
    availableWidth: screenWidth,
    availableHeight
  });
  
  return {
    level: 'challenge',
    rows,
    cols,
    ...layoutParams
  };
}

/**
 * 计算方块位置
 * @param {number} row 行索引
 * @param {number} col 列索引
 * @param {Object} layout 布局参数
 * @returns {{x: number, y: number}}
 */
export function getTilePosition(row, col, layout) {
  const { tileSize, gap, padding } = layout;
  
  return {
    x: padding + col * (tileSize + gap),
    y: padding + row * (tileSize + gap)
  };
}