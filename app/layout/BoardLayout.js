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
 * 使用坐标系方法：以棋盘中心为原点(0,0)，数字方块矩形居中在坐标轴上
 */
export function layoutTiles(rows, cols, tileSize, tilesRectWidth, tilesRectHeight, contentWidth, contentHeight, gap = TILE_GAP, padding = BOARD_PADDING) {
  // 🎯 坐标系方法：以棋盘中心为原点(0,0)建立坐标系
  
  // 第一步：确定坐标系原点（棋盘中心点）
  const boardCenterX = contentWidth / 2;
  const boardCenterY = contentHeight / 2;
  
  console.log('🎯 坐标系建立:');
  console.log(`   内容区尺寸: ${contentWidth} × ${contentHeight}px`);
  console.log(`   坐标系原点: (${boardCenterX.toFixed(2)}, ${boardCenterY.toFixed(2)})`);
  
  // 第二步：计算数字方块矩形的实际尺寸
  const actualTilesRectWidth = cols * tileSize + (cols - 1) * gap;
  const actualTilesRectHeight = rows * tileSize + (rows - 1) * gap;
  
  console.log(`   数字方块矩形尺寸: ${actualTilesRectWidth} × ${actualTilesRectHeight}px`);
  console.log(`   棋盘格规格: ${rows}行 × ${cols}列，方块尺寸: ${tileSize}px`);
  
  // 第三步：在坐标系中定义数字方块矩形的边界
  // 数字方块矩形在坐标系中的范围：从负半宽到正半宽
  const rectHalfWidth = actualTilesRectWidth / 2;
  const rectHalfHeight = actualTilesRectHeight / 2;
  
  console.log('📐 坐标系中的数字方块矩形:');
  console.log(`   X轴范围: [-${rectHalfWidth.toFixed(2)}, +${rectHalfWidth.toFixed(2)}]`);
  console.log(`   Y轴范围: [-${rectHalfHeight.toFixed(2)}, +${rectHalfHeight.toFixed(2)}]`);
  
  // 第四步：计算每个方块在坐标系中的位置
  // 方块索引到坐标系坐标的映射
  function getCoordinatePosition(row, col) {
    // 计算方块在矩形中的相对位置（从左上角开始）
    const relativeX = col * (tileSize + gap);
    const relativeY = row * (tileSize + gap);
    
    // 转换为坐标系坐标（以矩形中心为基准）
    const coordX = relativeX - rectHalfWidth + tileSize / 2;
    const coordY = relativeY - rectHalfHeight + tileSize / 2;
    
    return { coordX, coordY };
  }
  
  // 验证中心方块是否在坐标系原点
  const centerRow = (rows - 1) / 2;
  const centerCol = (cols - 1) / 2;
  const centerCoord = getCoordinatePosition(centerRow, centerCol);
  
  console.log('🎯 坐标系验证:');
  console.log(`   矩形中心方块位置: [${centerRow}, ${centerCol}]`);
  console.log(`   在坐标系中的坐标: (${centerCoord.coordX.toFixed(4)}, ${centerCoord.coordY.toFixed(4)})`);
  
  if (Math.abs(centerCoord.coordX) < 0.01 && Math.abs(centerCoord.coordY) < 0.01) {
    console.log('   ✅ 数字方块矩形完美居中在坐标系原点！');
  } else {
    console.log('   ❌ 数字方块矩形未居中，需要调整');
  }
  
  // 验证边界对称性
  const leftBoundary = -rectHalfWidth;
  const rightBoundary = +rectHalfWidth;
  const topBoundary = -rectHalfHeight;
  const bottomBoundary = +rectHalfHeight;
  
  console.log('📏 坐标系边界对称性:');
  console.log(`   X轴对称性: ${Math.abs(Math.abs(leftBoundary) - Math.abs(rightBoundary)).toFixed(4)}px 差异`);
  console.log(`   Y轴对称性: ${Math.abs(Math.abs(topBoundary) - Math.abs(bottomBoundary)).toFixed(4)}px 差异`);
  
  // 返回位置计算函数
  return function getTilePosition(row, col) {
    if (row < 0 || row >= rows || col < 0 || col >= cols) {
      return null;
    }
    
    // 🎯 坐标系方法：
    // 1. 获取方块在坐标系中的坐标
    const { coordX, coordY } = getCoordinatePosition(row, col);
    
    // 2. 转换为屏幕坐标（坐标系坐标 + 原点位置 - 方块中心偏移）
    const x = boardCenterX + coordX - tileSize / 2;
    const y = boardCenterY + coordY - tileSize / 2;
    
    // 调试信息：关键方块的坐标转换过程
    if ((row === 0 && col === 0) || (row === rows - 1 && col === cols - 1)) {
      console.log(`📍 方块 [${row},${col}] 坐标转换:`);
      console.log(`   坐标系坐标: (${coordX.toFixed(2)}, ${coordY.toFixed(2)})`);
      console.log(`   最终位置: (${x.toFixed(2)}, ${y.toFixed(2)})px`);
    }
    
    // 特别验证中心方块
    if (Math.abs(row - centerRow) < 0.01 && Math.abs(col - centerCol) < 0.01) {
      console.log(`🎯 中心方块 [${row},${col}] 验证:`);
      console.log(`   坐标系坐标: (${coordX.toFixed(4)}, ${coordY.toFixed(4)})`);
      console.log(`   屏幕位置: (${x.toFixed(2)}, ${y.toFixed(2)})`);
      console.log(`   应该在原点附近: (${boardCenterX.toFixed(2)}, ${boardCenterY.toFixed(2)})`);
    }
    
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
  
  // 🎯 调试信息：最终布局配置
  console.log('🏗️  最终布局配置:');
  console.log(`   数字方块数量: ${N}`);
  console.log(`   关卡等级: ${level || '未指定'}`);
  console.log(`   目标宽高比: ${targetAspect || '自动'}`);
  console.log(`   最终行列数: ${layout.rows} × ${layout.cols}`);
  console.log(`   方块尺寸: ${layout.tileSize}px`);
  console.log(`   棋盘总尺寸: ${layout.boardWidth} × ${layout.boardHeight}px`);
  console.log(`   棋盘位置: (${layout.boardLeft}, ${layout.boardTop})`);
  console.log(`   有效游戏区域: ${layout.gameArea.width} × ${layout.gameArea.height}px`);
  console.log(`   布局有效性: ${layout.isValid ? '✅ 有效' : '❌ 无效'}`);
  console.log('🏗️  ========================');
  
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