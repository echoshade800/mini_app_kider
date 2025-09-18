/**
 * 统一网格布局系统 - 单一布局来源
 * Purpose: 提供统一的网格布局计算，确保数字方块始终在棋盘内且等距
 */

// 统一常量 - 全局唯一来源
export const TILE_SIZE = 30;        // px，固定，不随关卡缩放
export const GAP_MIN = 8;           // px，最小间距
export const GAP_MAX = 24;          // px，最大间距
export const SAFE_TOP = 120;        // 顶部安全区域（状态栏+HUD）
export const SAFE_BOTTOM = 120;     // 底部安全区域（道具栏+安全区）

/**
 * 核心布局计算函数 - 唯一布局来源
 * @param {number} containerWidth 容器宽度
 * @param {number} containerHeight 容器高度
 * @param {number} tileCount 数字方块总数
 * @returns {Object} 布局参数
 */
export function computeGridLayout(containerWidth, containerHeight, tileCount) {
  // 1. 计算有效区域
  const usableWidth = containerWidth;
  const usableHeight = containerHeight - SAFE_TOP - SAFE_BOTTOM;
  
  // 2. 寻找最优行列组合
  const { rows, cols } = findOptimalGrid(tileCount, usableWidth, usableHeight);
  
  // 3. 计算最大可行间距
  const gap = calculateOptimalGap(rows, cols, usableWidth, usableHeight);
  
  // 4. 计算棋盘尺寸和偏移
  const boardWidth = cols * TILE_SIZE + (cols + 1) * gap;
  const boardHeight = rows * TILE_SIZE + (rows + 1) * gap;
  
  // 5. 居中偏移
  const offsetX = (containerWidth - boardWidth) / 2;
  const offsetY = SAFE_TOP + (usableHeight - boardHeight) / 2;
  
  return {
    rows,
    cols,
    gap,
    tileSize: TILE_SIZE,
    boardWidth,
    boardHeight,
    offsetX: Math.max(0, offsetX),
    offsetY: Math.max(SAFE_TOP, offsetY),
    boardPadding: gap, // 四边内边距等于gap
  };
}

/**
 * 寻找最优行列组合
 * @param {number} tileCount 方块数量
 * @param {number} usableWidth 可用宽度
 * @param {number} usableHeight 可用高度
 * @returns {Object} {rows, cols}
 */
function findOptimalGrid(tileCount, usableWidth, usableHeight) {
  const targetRatio = usableHeight / usableWidth;
  let bestRows = 1;
  let bestCols = tileCount;
  let bestRatioDiff = Infinity;
  
  // 遍历所有可能的行数
  for (let rows = 1; rows <= tileCount; rows++) {
    const cols = Math.ceil(tileCount / rows);
    const currentRatio = rows / cols;
    const ratioDiff = Math.abs(currentRatio - targetRatio);
    
    if (ratioDiff < bestRatioDiff) {
      bestRatioDiff = ratioDiff;
      bestRows = rows;
      bestCols = cols;
    }
  }
  
  return { rows: bestRows, cols: bestCols };
}

/**
 * 计算最优间距
 * @param {number} rows 行数
 * @param {number} cols 列数
 * @param {number} usableWidth 可用宽度
 * @param {number} usableHeight 可用高度
 * @returns {number} 最优间距
 */
function calculateOptimalGap(rows, cols, usableWidth, usableHeight) {
  // 水平方向可行间距：cols * TILE_SIZE + (cols + 1) * gap <= usableWidth
  const maxGapByWidth = (usableWidth - cols * TILE_SIZE) / (cols + 1);
  
  // 垂直方向可行间距：rows * TILE_SIZE + (rows + 1) * gap <= usableHeight
  const maxGapByHeight = (usableHeight - rows * TILE_SIZE) / (rows + 1);
  
  // 取两个方向的最小值，确保都能放下
  const maxGap = Math.min(maxGapByWidth, maxGapByHeight);
  
  // 在允许范围内取最大可行间距
  return Math.max(GAP_MIN, Math.min(GAP_MAX, Math.floor(maxGap)));
}

/**
 * 获取方块在网格中的位置
 * @param {number} row 行索引
 * @param {number} col 列索引
 * @param {Object} layout 布局参数
 * @returns {Object} {x, y}
 */
export function getTilePosition(row, col, layout) {
  const { gap, tileSize, boardPadding } = layout;
  
  return {
    x: boardPadding + col * (tileSize + gap),
    y: boardPadding + row * (tileSize + gap),
  };
}

/**
 * 根据关卡获取方块数量（闯关模式）
 * @param {number} level 关卡数
 * @returns {number} 方块数量
 */
export function getTileCountByLevel(level) {
  if (level <= 10) return 16;    // 4x4
  if (level <= 20) return 25;    // 5x5
  if (level <= 30) return 36;    // 6x6
  if (level <= 40) return 49;    // 7x7
  if (level <= 50) return 64;    // 8x8
  if (level <= 60) return 81;    // 9x9
  if (level <= 80) return 100;   // 10x10
  if (level <= 100) return 120;  // 12x10
  if (level <= 120) return 140;  // 14x10
  if (level <= 200) return 160;  // 16x10
  
  // 200关以后继续使用160个方块
  return 160;
}

/**
 * 获取挑战模式方块数量
 * @param {number} containerWidth 容器宽度
 * @param {number} containerHeight 容器高度
 * @returns {number} 方块数量
 */
export function getChallengeTileCount(containerWidth, containerHeight) {
  // 挑战模式使用高密度布局，方块数量基于屏幕大小
  const usableWidth = containerWidth;
  const usableHeight = containerHeight - SAFE_TOP - SAFE_BOTTOM;
  
  // 估算最大可容纳的方块数（使用最小间距）
  const maxCols = Math.floor((usableWidth - GAP_MIN) / (TILE_SIZE + GAP_MIN));
  const maxRows = Math.floor((usableHeight - GAP_MIN) / (TILE_SIZE + GAP_MIN));
  
  // 返回约80%的容量，确保有足够间距
  return Math.floor(maxCols * maxRows * 0.8);
}