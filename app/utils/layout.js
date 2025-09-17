/**
 * 统一布局算法 - 固定30px方块与动态间距系统
 * Purpose: 提供统一的棋盘布局计算，支持关卡增长和挑战模式
 */

// 布局常量
const TILE_SIZE = 30;              // 数字方块固定尺寸
const MIN_GAP   = 6;               // 最小间距（挑战模式优先用更小间距）
const MAX_GAP   = 24;              // 早期关卡可以更松
const BOARD_PAD = 12;              // 棋盘四周内边距
const MAX_ROWS  = 16;
const MAX_COLS  = 10;

/**
 * 计算可用区域（排除顶部与底部）
 * @param {number} screenW 屏幕宽度
 * @param {number} screenH 屏幕高度
 * @param {number} topUsed 顶部栏高度
 * @param {number} bottomUsed 底部道具栏高度
 * @param {Object} safeInsets 安全区域
 * @returns {Object} 可用区域尺寸
 */
export function getUsableArea(screenW, screenH, topUsed, bottomUsed, safeInsets = {}) {
  const { left = 20, right = 20, top = 0, bottom = 0 } = safeInsets;
  const width  = screenW - (left + right);
  const height = screenH - (topUsed + bottomUsed + top + bottom);
  return { width, height };
}

/**
 * 根据目标行列数，等间距求解 gap、棋盘宽高、起点
 * @param {number} usableW 可用宽度
 * @param {number} usableH 可用高度
 * @param {number} rows 行数
 * @param {number} cols 列数
 * @param {Object} options 配置选项
 * @returns {Object} 布局计算结果
 */
export function computeGridLayout(usableW, usableH, rows, cols, options = {}) {
  const {
    tile = TILE_SIZE,
    pad = BOARD_PAD,
    minGap = MIN_GAP,
    maxGap = MAX_GAP,
    preferTight = false
  } = options;

  // 先算不含padding的内区尺寸
  const innerW = usableW - pad * 2;
  const innerH = usableH - pad * 2;

  // gapX / gapY 需相等 → 先用宽高各自的上限，再取两者中的"可行最小值"
  const gapXMax = cols > 1 ? (innerW - cols * tile) / (cols - 1) : 0;
  const gapYMax = rows > 1 ? (innerH - rows * tile) / (rows - 1) : 0;
  let gap = Math.min(gapXMax, gapYMax);

  // 约束到 [minGap, maxGap]；挑战模式 preferTight=true 则靠近 minGap
  gap = Math.max(minGap, Math.min(maxGap, gap));
  
  // 挑战模式优先使用较小间距
  if (preferTight) {
    gap = Math.max(minGap, Math.min(gap, minGap + 2));
  }

  // 实际棋盘渲染大小
  const boardW = cols * tile + (cols - 1) * gap + pad * 2;
  const boardH = rows * tile + (rows - 1) * gap + pad * 2;

  // 水平/垂直居中放入可用区域
  const offsetX = Math.max(0, (usableW - boardW) / 2);
  const offsetY = Math.max(0, (usableH - boardH) / 2);

  return { 
    gap: Math.round(gap), 
    boardW: Math.round(boardW), 
    boardH: Math.round(boardH), 
    offsetX: Math.round(offsetX), 
    offsetY: Math.round(offsetY), 
    pad,
    tileSize: tile
  };
}

/**
 * 获取关卡对应的行列数
 * @param {number} level 关卡数
 * @returns {Object} 行列数配置
 */
export function getLevelGridSize(level) {
  // 早期（正方形为主，便于上手）
  if (level >= 1 && level <= 10) return { rows: 4, cols: 4 };
  if (level >= 11 && level <= 20) return { rows: 5, cols: 5 };
  if (level >= 21 && level <= 30) return { rows: 6, cols: 6 };
  if (level >= 31 && level <= 40) return { rows: 7, cols: 7 };
  if (level >= 41 && level <= 50) return { rows: 8, cols: 8 };
  if (level >= 51 && level <= 60) return { rows: 9, cols: 9 };
  if (level >= 61 && level <= 70) return { rows: 10, cols: 10 };
  
  // 过渡到长方形（向 16×10 逼近）
  if (level >= 71 && level <= 80) return { rows: 11, cols: 9 };
  if (level >= 81 && level <= 90) return { rows: 12, cols: 9 };
  if (level >= 91 && level <= 100) return { rows: 12, cols: 10 };
  if (level >= 101 && level <= 110) return { rows: 13, cols: 10 };
  if (level >= 111 && level <= 120) return { rows: 14, cols: 10 };
  if (level >= 121 && level <= 130) return { rows: 15, cols: 10 };
  if (level >= 131 && level <= 160) return { rows: 16, cols: 10 };
  
  // 上限阶段（继续加难，但行列固定）
  if (level >= 161 && level <= 200) return { rows: 16, cols: 10 };
  
  // 200关以后继续使用最大网格
  return { rows: 16, cols: 10 };
}

/**
 * 获取关卡对应的默认间距
 * @param {number} level 关卡数
 * @returns {number} 默认间距
 */
export function getLevelDefaultGap(level) {
  if (level >= 1 && level <= 20) return 24;
  if (level >= 21 && level <= 60) return 20;
  if (level >= 61 && level <= 100) return 16;
  if (level >= 101 && level <= 140) return 12;
  if (level >= 141 && level <= 160) return 10;
  
  // Lv 161–200：gap 线性 18 → 8
  if (level >= 161 && level <= 200) {
    const progress = (level - 161) / (200 - 161); // 0 到 1
    return Math.round(18 - progress * 10); // 18 递减到 8
  }
  
  return 8; // 200关以后保持最小间距
}

/**
 * 获取挑战模式的网格配置
 * @returns {Object} 挑战模式网格配置
 */
export function getChallengeGridSize() {
  return { rows: MAX_ROWS, cols: MAX_COLS }; // 16×10
}

/**
 * 计算方块在棋盘中的位置
 * @param {number} row 行索引
 * @param {number} col 列索引
 * @param {number} tileSize 方块大小
 * @param {number} gap 间距
 * @param {number} pad 内边距
 * @returns {Object} 方块位置
 */
export function getTilePosition(row, col, tileSize, gap, pad) {
  return {
    x: pad + col * (tileSize + gap),
    y: pad + row * (tileSize + gap)
  };
}

/**
 * 获取完整的布局配置
 * @param {number} screenW 屏幕宽度
 * @param {number} screenH 屏幕高度
 * @param {number} level 关卡数（可选，挑战模式不需要）
 * @param {boolean} isChallenge 是否为挑战模式
 * @param {number} topUsed 顶部占用高度
 * @param {number} bottomUsed 底部占用高度
 * @returns {Object} 完整布局配置
 */
export function getCompleteLayout(screenW, screenH, level = 1, isChallenge = false, topUsed = 100, bottomUsed = 120) {
  // 获取网格配置
  const { rows, cols } = isChallenge ? getChallengeGridSize() : getLevelGridSize(level);
  
  // 计算可用区域
  const usableArea = getUsableArea(screenW, screenH, topUsed, bottomUsed);
  
  // 获取默认间距
  const defaultGap = isChallenge ? MIN_GAP : getLevelDefaultGap(level);
  
  // 计算布局
  const layout = computeGridLayout(usableArea.width, usableArea.height, rows, cols, {
    minGap: MIN_GAP,
    maxGap: isChallenge ? MIN_GAP + 2 : Math.max(defaultGap, MIN_GAP),
    preferTight: isChallenge
  });
  
  // 计算最终棋盘位置（加上顶部偏移）
  const finalX = layout.offsetX;
  const finalY = topUsed + layout.offsetY;
  
  return {
    rows,
    cols,
    tileSize: layout.tileSize,
    gap: layout.gap,
    padding: layout.pad,
    boardWidth: layout.boardW,
    boardHeight: layout.boardH,
    boardX: finalX,
    boardY: finalY,
    usableArea,
    debug: {
      level: isChallenge ? 'Challenge' : level,
      gridSize: `${rows}×${cols}`,
      tileCount: rows * cols,
      gap: `${layout.gap}px`,
      boardSize: `${layout.boardW}×${layout.boardH}`,
      position: `(${finalX}, ${finalY})`,
      usableArea: `${usableArea.width}×${usableArea.height}`,
      fitsInScreen: layout.boardW <= usableArea.width && layout.boardH <= usableArea.height,
      isCentered: layout.offsetX > 0 && layout.offsetY > 0
    }
  };
}