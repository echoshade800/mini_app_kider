/**
 * 棋盘自适应布局系统 - 唯一布局规则来源
 * Purpose: 根据数字方块数量动态计算棋盘尺寸和布局
 * Features: 自适应尺寸、最小28px限制、棋盘比矩形大一圈
 */

import { Dimensions } from 'react-native';

// 根据关卡获取数字方块数量（现在基于白色方格数量计算）
function getTileCount(level, isChallenge = false) {
  if (isChallenge) {
    // 挑战模式：使用与第130关相同的配置（8×15棋盘，144个白色方格）
    return 144;
  }
  
  // 关卡模式：基于白色方格数量计算数字方块数量
  // 白色方格数量 = (width + 1) × (height + 1)
  // 数字方块数量 = 白色方格数量
  
  if (level >= 1 && level <= 10) {
    // 前10关：3×3到4×6的棋盘
    const gridSizes = [
      { rows: 3, cols: 3 }, // 第1关：16个白色方格
      { rows: 3, cols: 4 }, // 第2关：20个白色方格
      { rows: 3, cols: 4 }, // 第3关：20个白色方格
      { rows: 3, cols: 5 }, // 第4关：24个白色方格
      { rows: 3, cols: 5 }, // 第5关：24个白色方格
      { rows: 4, cols: 5 }, // 第6关：30个白色方格
      { rows: 3, cols: 6 }, // 第7关：28个白色方格
      { rows: 4, cols: 5 }, // 第8关：30个白色方格
      { rows: 3, cols: 7 }, // 第9关：32个白色方格
      { rows: 4, cols: 6 }, // 第10关：35个白色方格
    ];
    const grid = gridSizes[level - 1];
    return (grid.rows + 1) * (grid.cols + 1);
  }
  
  if (level >= 11 && level <= 20) {
    // 11-20关：3×9到5×10的棋盘
    const gridSizes = [
      { rows: 3, cols: 9 }, // 第11关：40个白色方格
      { rows: 5, cols: 6 }, // 第12关：42个白色方格
      { rows: 4, cols: 8 }, // 第13关：45个白色方格
      { rows: 5, cols: 7 }, // 第14关：48个白色方格
      { rows: 4, cols: 9 }, // 第15关：50个白色方格
      { rows: 5, cols: 8 }, // 第16关：54个白色方格
      { rows: 6, cols: 7 }, // 第17关：56个白色方格
      { rows: 5, cols: 9 }, // 第18关：60个白色方格
      { rows: 4, cols: 12 }, // 第19关：65个白色方格
      { rows: 5, cols: 10 }, // 第20关：66个白色方格
    ];
    const grid = gridSizes[level - 11];
    return (grid.rows + 1) * (grid.cols + 1);
  }
  
  if (level >= 21 && level <= 30) {
    // 21-30关：5×11到8×10的棋盘
    const gridSizes = [
      { rows: 5, cols: 11 }, // 第21关：72个白色方格
      { rows: 7, cols: 8 }, // 第22关：72个白色方格
      { rows: 6, cols: 10 }, // 第23关：77个白色方格
      { rows: 6, cols: 11 }, // 第24关：84个白色方格
      { rows: 5, cols: 13 }, // 第25关：84个白色方格
      { rows: 7, cols: 10 }, // 第26关：88个白色方格
      { rows: 6, cols: 12 }, // 第27关：91个白色方格
      { rows: 7, cols: 11 }, // 第28关：96个白色方格
      { rows: 7, cols: 11 }, // 第29关：96个白色方格
      { rows: 8, cols: 10 }, // 第30关：99个白色方格
    ];
    const grid = gridSizes[level - 21];
    return (grid.rows + 1) * (grid.cols + 1);
  }
  
  if (level >= 31 && level <= 50) {
    // 31-50关：8×11到8×15的棋盘
    const gridSizes = [
      { rows: 8, cols: 11 }, // 第31关：108个白色方格
      { rows: 7, cols: 13 }, // 第32关：112个白色方格
      { rows: 7, cols: 13 }, // 第33关：112个白色方格
      { rows: 8, cols: 12 }, // 第34关：117个白色方格
      { rows: 8, cols: 12 }, // 第35关：117个白色方格
      { rows: 8, cols: 12 }, // 第36关：117个白色方格
      { rows: 8, cols: 13 }, // 第37关：126个白色方格
      { rows: 8, cols: 13 }, // 第38关：126个白色方格
      { rows: 8, cols: 13 }, // 第39关：126个白色方格
      { rows: 8, cols: 14 }, // 第40关：135个白色方格
      { rows: 8, cols: 14 }, // 第41关：135个白色方格
      { rows: 8, cols: 14 }, // 第42关：135个白色方格
      { rows: 8, cols: 14 }, // 第43关：135个白色方格
      { rows: 8, cols: 15 }, // 第44关：144个白色方格
      { rows: 8, cols: 15 }, // 第45关：144个白色方格
      { rows: 8, cols: 15 }, // 第46关：144个白色方格
      { rows: 8, cols: 15 }, // 第47关：144个白色方格
      { rows: 8, cols: 15 }, // 第48关：144个白色方格
      { rows: 8, cols: 15 }, // 第49关：144个白色方格
      { rows: 8, cols: 15 }, // 第50关：144个白色方格
    ];
    const grid = gridSizes[level - 31];
    return (grid.rows + 1) * (grid.cols + 1);
  }
  
  // 51关以后：使用第50关的棋盘布局（8×15棋盘，144个白色方格）
  if (level >= 51) {
    // 第50关：8×15棋盘，144个白色方格
    return 144;
  }
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// 布局常量
const MIN_TILE_SIZE = 28; // 最小方块尺寸 - 保持28px
const TILE_GAP = 4; // 方块间距
const BOARD_PADDING = 5; // 棋盘内边距（方块矩形到木框的留白）
const WOOD_FRAME_WIDTH = 8; // 木框厚度

// 有效游戏区域配置
const EFFECTIVE_AREA = {
  TOP_RESERVED: 120,     // 顶部保留区域（HUD）
  BOTTOM_RESERVED: 100,  // 底部保留区域（道具栏）- 减少到100px
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
    
    // 🎯 统一中心点计算：内容区的几何中心
    const contentCenterX = contentWidth / 2;
    const contentCenterY = contentHeight / 2;
    
    // 🎯 数字方块矩形的几何中心
    const tileRectCenterX = tilesRectWidth / 2;
    const tileRectCenterY = tilesRectHeight / 2;
    
    // 🎯 计算数字方块矩形左上角位置，使其中心与内容区中心重合
    const tileRectStartX = contentCenterX - tileRectCenterX;
    const tileRectStartY = contentCenterY - tileRectCenterY;
    
    // 🎯 计算单个方块位置（相对于数字方块矩形左上角）
    const relativeX = col * (tileSize + gap);
    const relativeY = row * (tileSize + gap);
    
    // 🎯 最终位置：数字方块矩形起始位置 + 方块相对位置
    const x = tileRectStartX + relativeX;
    const y = tileRectStartY + relativeY;
    
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