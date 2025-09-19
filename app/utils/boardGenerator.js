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

/**
 * 生成游戏棋盘
 * @param {number} level - 关卡等级或数字方块数量
 * @param {boolean} isChallenge - 是否为挑战模式
 * @param {boolean} useHighCount - 是否使用高数量方块
 * @returns {Object} 棋盘数据
 */
export function generateBoard(level, isChallenge = false, useHighCount = false) {
  let tileCount;
  
  if (isChallenge || useHighCount) {
    // 挑战模式：使用固定高数量
    tileCount = 120;
  } else {
    // 关卡模式：根据等级计算数量
    tileCount = getTileCount(level, false);
  }
  
  // 使用固定的16行×9列布局
  const layoutConfig = getBoardLayoutConfig(tileCount, null, level, 16, 9);
  
  // 生成数字方块数据
  const tiles = generateTileData(tileCount, layoutConfig.rows, layoutConfig.cols, level);
  
  return {
    width: layoutConfig.cols,
    height: layoutConfig.rows,
    tiles: tiles,
    layoutConfig: layoutConfig,
    level: level,
    isChallenge: isChallenge,
    tileCount: tileCount
  };
}

/**
 * 生成数字方块数据
 * @param {number} tileCount - 数字方块数量
 * @param {number} rows - 行数
 * @param {number} cols - 列数
 * @param {number} level - 关卡等级
 * @returns {Array} 方块数据数组
 */
function generateTileData(tileCount, rows, cols, level) {
  const totalCells = rows * cols;
  const tiles = new Array(totalCells).fill(0);
  
  // 生成目标对 (sum = 10)
  const targetPairs = [
    [1, 9], [2, 8], [3, 7], [4, 6], [5, 5]
  ];
  
  // 计算要放置的对数
  const pairCount = Math.floor(tileCount / 2);
  const remainingCount = tileCount - (pairCount * 2);
  
  // 随机放置目标对
  const usedPositions = new Set();
  let placedPairs = 0;
  
  // 使用简单的随机数生成器
  const random = () => Math.random();
  
  while (placedPairs < pairCount) {
    const pairType = targetPairs[Math.floor(random() * targetPairs.length)];
    const [val1, val2] = pairType;
    
    // 找两个空位置
    const availablePositions = [];
    for (let i = 0; i < totalCells; i++) {
      if (!usedPositions.has(i)) {
        availablePositions.push(i);
      }
    }
    
    if (availablePositions.length >= 2) {
      const pos1 = availablePositions[Math.floor(random() * availablePositions.length)];
      const remainingPositions = availablePositions.filter(p => p !== pos1);
      const pos2 = remainingPositions[Math.floor(random() * remainingPositions.length)];
      
      tiles[pos1] = val1;
      tiles[pos2] = val2;
      usedPositions.add(pos1);
      usedPositions.add(pos2);
      placedPairs++;
    } else {
      break;
    }
  }
  
  // 放置剩余的单个方块
  const availablePositions = [];
  for (let i = 0; i < totalCells; i++) {
    if (!usedPositions.has(i)) {
      availablePositions.push(i);
    }
  }
  
  for (let i = 0; i < Math.min(remainingCount, availablePositions.length); i++) {
    const pos = availablePositions[i];
    tiles[pos] = Math.floor(random() * 9) + 1;
  }
  
  // 应用大数字分离规则
  applyLargeNumberSeparation(tiles, rows, cols);
  
  return tiles;
}

/**
 * 应用大数字分离规则 - 让相同的大数字(7,8,9)尽量不相邻
 * @param {Array} tiles - 方块数组
 * @param {number} rows - 行数
 * @param {number} cols - 列数
 */
function applyLargeNumberSeparation(tiles, rows, cols) {
  const largeNumbers = [7, 8, 9];
  const maxAttempts = 50;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let hasImprovement = false;
    
    for (let i = 0; i < tiles.length; i++) {
      const value = tiles[i];
      
      // 只处理大数字
      if (!largeNumbers.includes(value)) continue;
      
      // 检查是否与相同数字相邻
      if (hasAdjacentSameNumber(tiles, i, rows, cols, value)) {
        // 尝试找一个不相邻的位置交换
        const betterPos = findNonAdjacentPosition(tiles, i, rows, cols, value);
        if (betterPos !== -1) {
          // 交换位置
          const temp = tiles[i];
          tiles[i] = tiles[betterPos];
          tiles[betterPos] = temp;
          hasImprovement = true;
        }
      }
    }
    
    // 如果没有改善，提前结束
    if (!hasImprovement) break;
  }
}

/**
 * 检查指定位置是否与相同数字相邻
 * @param {Array} tiles - 方块数组
 * @param {number} pos - 位置索引
 * @param {number} rows - 行数
 * @param {number} cols - 列数
 * @param {number} value - 数字值
 * @returns {boolean} 是否相邻
 */
function hasAdjacentSameNumber(tiles, pos, rows, cols, value) {
  const row = Math.floor(pos / cols);
  const col = pos % cols;
  
  // 检查四个方向
  const directions = [
    [-1, 0], [1, 0], [0, -1], [0, 1] // 上、下、左、右
  ];
  
  for (const [dr, dc] of directions) {
    const newRow = row + dr;
    const newCol = col + dc;
    
    if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < cols) {
      const newPos = newRow * cols + newCol;
      if (tiles[newPos] === value) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * 寻找一个不与相同数字相邻的位置
 * @param {Array} tiles - 方块数组
 * @param {number} currentPos - 当前位置
 * @param {number} rows - 行数
 * @param {number} cols - 列数
 * @param {number} value - 数字值
 * @returns {number} 更好的位置索引，-1表示没找到
 */
function findNonAdjacentPosition(tiles, currentPos, rows, cols, value) {
  for (let i = 0; i < tiles.length; i++) {
    if (i === currentPos) continue;
    
    // 检查这个位置交换后是否会改善情况
    const tempValue = tiles[i];
    
    // 模拟交换
    tiles[i] = value;
    tiles[currentPos] = tempValue;
    
    // 检查新位置是否不相邻
    const isGoodPosition = !hasAdjacentSameNumber(tiles, i, rows, cols, value);
    
    // 恢复原状
    tiles[currentPos] = value;
    tiles[i] = tempValue;
    
    if (isGoodPosition) {
      return i;
    }
  }
  
  return -1;
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
  
  // 策略a: 尝试在有效区域内放大棋盘
  let layout = computeTileSize(gameArea.width, gameArea.height, rows, cols);
  
  if (layout.isValid) {
    // 计算棋盘在有效区域内的居中位置
    const boardLeft = (gameArea.width - layout.boardWidth) / 2;
    const boardTop = gameArea.top + (gameArea.height - layout.boardHeight) / 2;
    
    return {
      ...layout,
      rows,
      cols,
      boardLeft,
      boardTop,
      gameArea,
    };
  }
  
  // 策略b: 调整 (R, C) 比例
  const alternatives = [];
  for (let r = 1; r <= N; r++) {
    const c = Math.ceil(N / r);
    if (r * c >= N && (r !== rows || c !== cols)) {
      const testLayout = computeTileSize(gameArea.width, gameArea.height, r, c);
      if (testLayout.isValid) {
        alternatives.push({ rows: r, cols: c, ...testLayout });
      }
    }
  }
  
  if (alternatives.length > 0) {
    // 选择方块尺寸最大的方案
    const bestAlt = alternatives.reduce((best, current) => 
      current.tileSize > best.tileSize ? current : best
    );
    
    const boardLeft = (gameArea.width - bestAlt.boardWidth) / 2;
    const boardTop = gameArea.top + (gameArea.height - bestAlt.boardHeight) / 2;
    
    return {
      ...bestAlt,
      boardLeft,
      boardTop,
      gameArea,
    };
  }
  
  // 策略c: 使用最小尺寸，允许N向上取整
  const finalRows = Math.ceil(Math.sqrt(N));
  const finalCols = Math.ceil(N / finalRows);
  
  // 强制使用最小尺寸
  const forcedTileSize = MIN_TILE_SIZE;
  const forcedTilesRectWidth = finalCols * forcedTileSize + (finalCols - 1) * TILE_GAP;
  const forcedTilesRectHeight = finalRows * forcedTileSize + (finalRows - 1) * TILE_GAP;
  const forcedContentWidth = forcedTilesRectWidth + 2 * BOARD_PADDING;
  const forcedContentHeight = forcedTilesRectHeight + 2 * BOARD_PADDING;
  const forcedBoardWidth = forcedContentWidth + WOOD_FRAME_WIDTH * 2;
  const forcedBoardHeight = forcedContentHeight + WOOD_FRAME_WIDTH * 2;
  
  const boardLeft = (gameArea.width - forcedBoardWidth) / 2;
  const boardTop = gameArea.top + (gameArea.height - forcedBoardHeight) / 2;
  
  return {
    tileSize: forcedTileSize,
    tilesRectWidth: forcedTilesRectWidth,
    tilesRectHeight: forcedTilesRectHeight,
    boardWidth: forcedBoardWidth,
    boardHeight: forcedBoardHeight,
    contentWidth: forcedContentWidth,
    contentHeight: forcedContentHeight,
    rows: finalRows,
    cols: finalCols,
    boardLeft,
    boardTop,
    gameArea,
    isValid: true,
  };
}

/**
 * 计算每个方块的位置
 * @param {number} rows - 行数
 * @param {number} cols - 列数
 * @param {number} tileSize - 方块尺寸
 * @param {number} tilesRectWidth - 数字方块矩形宽度
 * @param {number} tilesRectHeight - 数字方块矩形高度
 * @param {number} contentWidth - 棋盘内容区宽度
 * @param {number} contentHeight - 棋盘内容区高度
 * @param {number} gap - 间距
 * @param {number} padding - 内边距
 * @returns {Function} 位置计算函数
 */
export function layoutTiles(rows, cols, tileSize, tilesRectWidth, tilesRectHeight, contentWidth, contentHeight, gap = TILE_GAP, padding = BOARD_PADDING) {
  return function getTilePosition(row, col) {
    if (row < 0 || row >= rows || col < 0 || col >= cols) {
      return null;
    }
    
    // 计算数字方块矩形在内容区中的居中偏移
    const offsetX = (contentWidth - tilesRectWidth) / 2;
    const offsetY = (contentHeight - tilesRectHeight) / 2;
    
    // 计算方块位置（相对于内容区左上角）
    const x = col * (tileSize + gap);
    const y = row * (tileSize + gap);
    
    return {
      x,
      y,
      width: tileSize,
      height: tileSize,
    };
  };
}

/**
 * 获取完整的棋盘布局配置
 * @param {number} N - 数字方块数量
 * @param {number} targetAspect - 期望宽高比（可选）
 * @param {number} level - 关卡等级（可选）
 * @returns {Object} 完整布局配置
 */
export function getBoardLayoutConfig(N, targetAspect = null, level = null) {
  const layout = computeAdaptiveLayout(N, targetAspect, level);
  const getTilePosition = layoutTiles(
    layout.rows, 
    layout.cols, 
    layout.tileSize, 
    layout.tilesRectWidth, 
    layout.tilesRectHeight, 
    layout.contentWidth, 
    layout.contentHeight
  );
  
  return {
    ...layout,
    getTilePosition,
    // 布局常量
    tileGap: TILE_GAP,
    boardPadding: BOARD_PADDING,
    woodFrameWidth: WOOD_FRAME_WIDTH,
    minTileSize: MIN_TILE_SIZE,
  };
}