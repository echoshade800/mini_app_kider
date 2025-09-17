/**
 * Level Grid System - 关卡棋盘增长规则和自适应布局
 * Purpose: 实现1-200关的棋盘尺寸增长和方块大小自适应
 */

// UI 常量（dp）
const TILE_IDEAL = 36;     // 理想边长：36dp（观感适中）
const TILE_MIN   = 30;     // 不得小于：30dp（再小会难点）
const TILE_MAX   = 42;     // 不得大于：42dp（再大显拥挤）
const GAP        = 6;      // 方块间距
const BOARD_PAD  = 12;     // 棋盘内边距

/**
 * 根据关卡获取棋盘行列数
 * @param {number} level 关卡数 (1-200+)
 * @returns {{rows: number, cols: number}}
 */
export function getGridByLevel(level) {
  // 关卡 → 行列增长表（1–200）
  if (level >= 1 && level <= 10) {
    return { rows: 4, cols: 4 };
  }
  if (level >= 11 && level <= 20) {
    return { rows: 5, cols: 5 };
  }
  if (level >= 21 && level <= 30) {
    return { rows: 6, cols: 6 };
  }
  if (level >= 31 && level <= 40) {
    return { rows: 6, cols: 7 };  // 开始使用矩形布局
  }
  if (level >= 41 && level <= 50) {
    return { rows: 7, cols: 8 };
  }
  if (level >= 51 && level <= 60) {
    return { rows: 8, cols: 9 };
  }
  if (level >= 61 && level <= 80) {
    return { rows: 9, cols: 10 };
  }
  if (level >= 81 && level <= 100) {
    return { rows: 10, cols: 10 };
  }
  if (level >= 101 && level <= 120) {
    return { rows: 11, cols: 10 };
  }
  if (level >= 121 && level <= 200) {
    return { rows: 12, cols: 10 };  // 最大网格
  }
  
  // 200关以后继续使用 12×10
  return { rows: 12, cols: 10 };
}

/**
 * 计算方块尺寸和布局参数
 * @param {Object} params
 * @param {number} params.rows 行数
 * @param {number} params.cols 列数
 * @param {number} params.areaWidth 可用宽度
 * @param {number} params.areaHeight 可用高度
 * @param {number} params.topHUDHeight 顶部HUD高度（可选）
 * @returns {{tileSize: number, gap: number, boardPadding: number, boardWidth: number, boardHeight: number}}
 */
export function computeTileSize({ rows, cols, areaWidth, areaHeight, topHUDHeight = 0 }) {
  // 计算可用区域（减去HUD和安全区域）
  const availableWidth = areaWidth - 40; // 左右各20px页面边距
  const availableHeight = areaHeight - topHUDHeight - 40; // 上下边距
  
  // 计算内部可用空间（减去棋盘内边距和方块间距）
  const innerW = availableWidth - BOARD_PAD * 2 - GAP * (cols - 1);
  const innerH = availableHeight - BOARD_PAD * 2 - GAP * (rows - 1);
  
  // 根据宽度和高度限制计算方块尺寸
  const sizeByW = innerW / cols;
  const sizeByH = innerH / rows;
  let tileSize = Math.min(sizeByW, sizeByH);
  
  // 贴合理想尺寸并做夹取
  if (Math.abs(tileSize - TILE_IDEAL) <= 4) {
    tileSize = TILE_IDEAL;
  }
  tileSize = Math.max(TILE_MIN, Math.min(TILE_MAX, tileSize));
  
  // 计算实际棋盘尺寸
  const boardWidth = cols * tileSize + (cols - 1) * GAP + BOARD_PAD * 2;
  const boardHeight = rows * tileSize + (rows - 1) * GAP + BOARD_PAD * 2;
  
  return {
    tileSize: Math.floor(tileSize),
    gap: GAP,
    boardPadding: BOARD_PAD,
    boardWidth: Math.floor(boardWidth),
    boardHeight: Math.floor(boardHeight)
  };
}

/**
 * 获取关卡的完整布局信息
 * @param {number} level 关卡数
 * @param {number} screenWidth 屏幕宽度
 * @param {number} screenHeight 屏幕高度
 * @param {number} topHUDHeight 顶部HUD高度
 * @returns {Object} 完整的布局信息
 */
export function getLevelLayout(level, screenWidth, screenHeight, topHUDHeight = 120) {
  const { rows, cols } = getGridByLevel(level);
  const layoutParams = computeTileSize({
    rows,
    cols,
    areaWidth: screenWidth,
    areaHeight: screenHeight,
    topHUDHeight
  });
  
  return {
    level,
    rows,
    cols,
    ...layoutParams
  };
}

/**
 * 检查布局是否需要调整（处理极小屏幕情况）
 * @param {Object} layout 布局信息
 * @param {number} level 关卡数
 * @returns {Object} 调整后的布局信息
 */
export function adjustLayoutForSmallScreen(layout, level) {
  const { rows, cols, tileSize } = layout;
  
  // 如果方块尺寸被压到最小值，尝试调整
  if (tileSize <= TILE_MIN) {
    // 61-80关之前：优先延长为横向矩形
    if (level < 81 && cols < 10) {
      const newCols = Math.min(cols + 1, 10);
      const newRows = Math.max(rows - 1, 4);
      return {
        ...layout,
        rows: newRows,
        cols: newCols
      };
    }
    
    // 81关之后：列维持10，允许降低行数1-2
    if (level >= 81 && rows > 10) {
      const minRows = level >= 121 ? 14 : (level >= 101 ? 12 : 10);
      const newRows = Math.max(rows - 1, minRows);
      return {
        ...layout,
        rows: newRows
      };
    }
  }
  
  return layout;
}