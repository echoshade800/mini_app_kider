/**
 * 统一棋盘布局计算 - 基于参考图的视觉规范
 * 目标：闯关模式和挑战模式使用相同的布局算法和视觉样式
 */

/**
 * 计算棋盘布局参数
 * @param {Object} params
 * @param {number} params.availableWidth - 可用宽度（扣除安全区和UI元素）
 * @param {number} params.availableHeight - 可用高度（扣除安全区和UI元素）
 * @param {number} params.rows - 行数
 * @param {number} params.cols - 列数
 * @param {boolean} params.isChallenge - 是否为挑战模式（影响密集度）
 * @returns {Object} 布局参数
 */
export function computeBoardLayout({ availableWidth, availableHeight, rows, cols, isChallenge = false }) {
  // 输入保护
  rows = Math.max(1, Math.floor(rows));
  cols = Math.max(1, Math.floor(cols));
  
  // 基础参数设定
  const TILE_MIN = 20;  // 方块最小尺寸
  const TILE_MAX = 52;  // 方块最大尺寸
  const GAP_MIN = 6;    // 最小间距
  const GAP_MAX = 12;   // 最大间距
  
  // 挑战模式使用更紧密的布局
  const baseGap = isChallenge ? GAP_MIN : 8;
  
  // 1. 初步估算方块尺寸
  let gap = baseGap;
  let boardPadding = Math.ceil(gap * 1.5); // 外圈留白 > 间距
  
  // 计算内部可用空间
  const innerWidth = availableWidth - 2 * boardPadding;
  const innerHeight = availableHeight - 2 * boardPadding;
  
  // 按宽度和高度分别计算可能的方块尺寸
  const tileSizeCandidateW = (innerWidth - (cols - 1) * gap) / cols;
  const tileSizeCandidateH = (innerHeight - (rows - 1) * gap) / rows;
  
  let tileSize = Math.floor(Math.min(tileSizeCandidateW, tileSizeCandidateH));
  
  // 2. 约束方块尺寸到合理范围
  if (tileSize > TILE_MAX) {
    tileSize = TILE_MAX;
  } else if (tileSize < TILE_MIN) {
    // 如果方块太小，尝试减小间距
    gap = Math.max(GAP_MIN, gap - 2);
    boardPadding = Math.ceil(gap * 1.5);
    
    const newInnerWidth = availableWidth - 2 * boardPadding;
    const newInnerHeight = availableHeight - 2 * boardPadding;
    
    const newTileSizeCandidateW = (newInnerWidth - (cols - 1) * gap) / cols;
    const newTileSizeCandidateH = (newInnerHeight - (rows - 1) * gap) / rows;
    
    tileSize = Math.floor(Math.min(newTileSizeCandidateW, newTileSizeCandidateH));
    tileSize = Math.max(TILE_MIN, tileSize);
  }
  
  // 3. 最终调整间距以优化布局
  if (tileSize >= 40 && gap < GAP_MAX && !isChallenge) {
    gap = Math.min(GAP_MAX, gap + 2);
    boardPadding = Math.ceil(gap * 1.5);
  }
  
  // 4. 计算最终棋盘尺寸
  const boardWidth = cols * tileSize + (cols - 1) * gap + 2 * boardPadding;
  const boardHeight = rows * tileSize + (rows - 1) * gap + 2 * boardPadding;
  
  // 5. 计算棋盘在可用区域内的居中位置
  const boardLeft = Math.floor((availableWidth - boardWidth) / 2);
  const boardTop = Math.floor((availableHeight - boardHeight) / 2);
  
  // 6. 生成每个方块的精确坐标
  const slots = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = boardLeft + boardPadding + col * (tileSize + gap);
      const y = boardTop + boardPadding + row * (tileSize + gap);
      slots.push({
        x,
        y,
        width: tileSize,
        height: tileSize,
        row,
        col,
        index: row * cols + col
      });
    }
  }
  
  return {
    tileSize,
    gap,
    boardPadding,
    boardWidth,
    boardHeight,
    boardLeft,
    boardTop,
    slots,
    // 用于渲染的样式参数
    styles: {
      boardContainer: {
        width: boardWidth,
        height: boardHeight,
        left: boardLeft,
        top: boardTop,
      },
      tile: {
        width: tileSize,
        height: tileSize,
        fontSize: Math.floor(tileSize * 0.55), // 字号约为方块尺寸的55%
      }
    }
  };
}

/**
 * 根据关卡获取行列数配置
 * @param {number} level - 关卡数
 * @returns {Object} 行列数配置
 */
export function getLevelGridConfig(level) {
  // 高密度配置：优先增加列/行数
  if (level <= 5) return { rows: 6, cols: 6, timeLimit: 60 };
  if (level <= 10) return { rows: 7, cols: 7, timeLimit: 60 };
  if (level <= 20) return { rows: 8, cols: 8, timeLimit: 75 };
  if (level <= 30) return { rows: 9, cols: 9, timeLimit: 75 };
  if (level <= 40) return { rows: 10, cols: 10, timeLimit: 90 };
  if (level <= 60) return { rows: 11, cols: 11, timeLimit: 90 };
  if (level <= 80) return { rows: 12, cols: 12, timeLimit: 105 };
  if (level <= 120) return { rows: 13, cols: 13, timeLimit: 105 };
  // 121-200关及以上：顶格高密度配置
  return { rows: 14, cols: 16, timeLimit: 120 };
}

/**
 * 获取挑战模式的行列数配置（高密度）
 * @returns {Object} 行列数配置
 */
export function getChallengeGridConfig() {
  console.log('🎯 [DEBUG] getChallengeGridConfig called');
  // 挑战模式使用高密度配置
  const config = { rows: 12, cols: 18, timeLimit: 60 };
  console.log('🎯 [DEBUG] Challenge grid config:', config);
  return config;
}