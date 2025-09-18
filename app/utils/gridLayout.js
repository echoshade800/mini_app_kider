/**
 * 统一棋盘坐标系与数字方块排布系统 - 单一布局来源
 * Purpose: 提供统一的网格布局计算，确保数字方块始终在棋盘内且等距
 */

// 统一常量 - 全局唯一来源
export const TILE_SIZE = 30;        // px，固定，不随关卡缩放
export const GAP_MIN = 6;           // px，最小间距
export const GAP_MAX = 14;          // px，最大间距
export const PADDING_EXTRA = 6;     // padding 相对 gap 的额外值
export const SAFE_TOP = 120;        // 顶部安全区域（状态栏+HUD）
export const SAFE_BOTTOM = 120;     // 底部安全区域（道具栏+安全区）

/**
 * 核心布局计算函数 - 唯一布局来源
 * @param {number} usableWidth 可用宽度（扣除状态栏后）
 * @param {number} usableHeight 可用高度（扣除状态栏/道具栏后）
 * @param {number} tileCount 数字方块总数
 * @returns {Object} 布局参数
 */
export function computeBoardLayout(usableWidth, usableHeight, tileCount) {
  // 1. 寻找最优行列组合
  const { rows, cols } = findOptimalRowsCols(tileCount, usableWidth, usableHeight);
  
  // 2. 计算最大可行间距
  const gap = calculateMaxFeasibleGap(rows, cols, usableWidth, usableHeight);
  
  // 3. 计算边距
  const padding = gap + PADDING_EXTRA;
  
  // 4. 计算棋盘实际尺寸
  const boardWidth = cols * TILE_SIZE + (cols - 1) * gap + 2 * padding;
  const boardHeight = rows * TILE_SIZE + (rows - 1) * gap + 2 * padding;
  
  // 5. 计算居中偏移
  const offsetX = Math.max(0, (usableWidth - boardWidth) / 2);
  const offsetY = Math.max(0, (usableHeight - boardHeight) / 2);
  
  // 6. 生成槽位坐标
  const slots = generateSlots(rows, cols, padding, padding, gap);
  
  return {
    rows,
    cols,
    gap,
    padding,
    offsetX,
    offsetY,
    boardWidth,
    boardHeight,
    slots,
    tileSize: TILE_SIZE,
  };
}

/**
 * 寻找最优行列组合
 * @param {number} tileCount 方块数量
 * @param {number} usableWidth 可用宽度
 * @param {number} usableHeight 可用高度
 * @returns {Object} {rows, cols}
 */
function findOptimalRowsCols(tileCount, usableWidth, usableHeight) {
  const targetRatio = usableHeight / usableWidth;
  let bestRows = 1;
  let bestCols = tileCount;
  let bestRatioDiff = Infinity;
  
  // 遍历所有可能的行数
  for (let rows = 1; rows <= tileCount; rows++) {
    const cols = Math.ceil(tileCount / rows);
    const currentRatio = rows / cols;
    const ratioDiff = Math.abs(currentRatio - targetRatio);
    
    // 优先选择比值接近的组合，如果比值相同则选择总格子数更小的
    if (ratioDiff < bestRatioDiff || 
        (ratioDiff === bestRatioDiff && rows * cols < bestRows * bestCols)) {
      bestRatioDiff = ratioDiff;
      bestRows = rows;
      bestCols = cols;
    }
  }
  
  return { rows: bestRows, cols: bestCols };
}

/**
 * 计算最大可行间距
 * @param {number} rows 行数
 * @param {number} cols 列数
 * @param {number} usableWidth 可用宽度
 * @param {number} usableHeight 可用高度
 * @returns {number} 最优间距
 */
function calculateMaxFeasibleGap(rows, cols, usableWidth, usableHeight) {
  // 尝试从最大间距开始，找到第一个可行的间距
  for (let gap = GAP_MAX; gap >= GAP_MIN; gap--) {
    const padding = gap + PADDING_EXTRA;
    
    // 检查水平方向是否可行
    const requiredWidth = cols * TILE_SIZE + (cols - 1) * gap + 2 * padding;
    
    // 检查垂直方向是否可行
    const requiredHeight = rows * TILE_SIZE + (rows - 1) * gap + 2 * padding;
    
    if (requiredWidth <= usableWidth && requiredHeight <= usableHeight) {
      return gap;
    }
  }
  
  // 如果最小间距仍不可行，返回最小间距（后续会增加行列数）
  return GAP_MIN;
}

/**
 * 生成槽位坐标
 * @param {number} rows 行数
 * @param {number} cols 列数
 * @param {number} startX 起始X坐标
 * @param {number} startY 起始Y坐标
 * @param {number} gap 间距
 * @returns {Array} 槽位坐标数组
 */
function generateSlots(rows, cols, startX, startY, gap) {
  const slots = [];
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = startX + col * (TILE_SIZE + gap);
      const y = startY + row * (TILE_SIZE + gap);
      
      slots.push({
        x,
        y,
        w: TILE_SIZE,
        h: TILE_SIZE,
        row,
        col,
        index: row * cols + col,
      });
    }
  }
  
  return slots;
}

/**
 * 根据关卡获取方块数量（闯关模式）
 * @param {number} level 关卡数
 * @returns {number} 方块数量
 */
export function getTileCountByLevel(level) {
  if (level <= 5) return 16;     // 4x4 - 新手关卡
  if (level <= 10) return 20;    // 5x4 - 简单关卡
  if (level <= 20) return 25;    // 5x5 - 初级关卡
  if (level <= 30) return 30;    // 6x5 - 进阶关卡
  if (level <= 40) return 36;    // 6x6 - 中级关卡
  if (level <= 60) return 42;    // 7x6 - 中高级关卡
  if (level <= 80) return 49;    // 7x7 - 高级关卡
  if (level <= 100) return 56;   // 8x7 - 专家关卡
  if (level <= 120) return 64;   // 8x8 - 大师关卡
  if (level <= 150) return 72;   // 9x8 - 宗师关卡
  if (level <= 180) return 81;   // 9x9 - 传奇关卡
  if (level <= 200) return 90;   // 10x9 - 史诗关卡
  
  // 200关以后继续增加
  return 90 + Math.floor((level - 200) / 10) * 6;
}

/**
 * 获取挑战模式方块数量
 * @param {number} containerWidth 容器宽度
 * @param {number} containerHeight 容器高度
 * @returns {number} 方块数量
 */
export function getChallengeTileCount(containerWidth, containerHeight) {
  // 挑战模式使用高密度布局
  const usableWidth = containerWidth;
  const usableHeight = containerHeight - SAFE_TOP - SAFE_BOTTOM;
  
  // 使用最小间距估算最大容量
  const padding = GAP_MIN + PADDING_EXTRA;
  const maxCols = Math.floor((usableWidth - 2 * padding + GAP_MIN) / (TILE_SIZE + GAP_MIN));
  const maxRows = Math.floor((usableHeight - 2 * padding + GAP_MIN) / (TILE_SIZE + GAP_MIN));
  
  // 返回约85%的容量，确保有足够间距和良好体验
  return Math.floor(maxCols * maxRows * 0.85);
}

/**
 * 获取方块在槽位中的坐标（用于渲染）
 * @param {number} slotIndex 槽位索引
 * @param {Object} layout 布局参数
 * @returns {Object} {x, y} 或 null
 */
export function getTilePositionFromSlot(slotIndex, layout) {
  if (!layout.slots || slotIndex >= layout.slots.length) {
    return null;
  }
  
  const slot = layout.slots[slotIndex];
  return {
    x: slot.x,
    y: slot.y,
  };
}

/**
 * 根据屏幕坐标获取槽位索引（用于交互）
 * @param {number} screenX 屏幕X坐标
 * @param {number} screenY 屏幕Y坐标
 * @param {Object} layout 布局参数
 * @returns {number} 槽位索引，-1表示未命中
 */
export function getSlotIndexFromScreenCoord(screenX, screenY, layout) {
  if (!layout.slots) return -1;
  
  for (let i = 0; i < layout.slots.length; i++) {
    const slot = layout.slots[i];
    if (screenX >= slot.x && screenX <= slot.x + slot.w &&
        screenY >= slot.y && screenY <= slot.y + slot.h) {
      return i;
    }
  }
  
  return -1;
}