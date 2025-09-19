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
  // 🎯 调试信息：布局参数
  console.log('📐 布局参数信息:');
  console.log(`   棋盘格: ${rows}行 × ${cols}列`);
  console.log(`   方块尺寸: ${tileSize}px`);
  console.log(`   方块间距: ${gap}px`);
  console.log(`   内容区尺寸: ${contentWidth} × ${contentHeight}px`);
  console.log(`   数字方块矩形尺寸: ${tilesRectWidth} × ${tilesRectHeight}px`);
  
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
    
    // 🎯 调试信息：中心点对齐验证（只在第一个方块时输出）
    if (row === 0 && col === 0) {
      console.log('🎯 中心点对齐验证:');
      console.log(`   内容区中心点: (${contentCenterX.toFixed(2)}, ${contentCenterY.toFixed(2)})`);
      console.log(`   数字方块矩形中心点: (${tileRectCenterX.toFixed(2)}, ${tileRectCenterY.toFixed(2)})`);
      console.log(`   数字方块矩形左上角: (${tileRectStartX.toFixed(2)}, ${tileRectStartY.toFixed(2)})`);
      
      // 验证中心点是否对齐
      const actualRectCenterX = tileRectStartX + tileRectCenterX;
      const actualRectCenterY = tileRectStartY + tileRectCenterY;
      console.log(`   实际矩形中心点: (${actualRectCenterX.toFixed(2)}, ${actualRectCenterY.toFixed(2)})`);
      
      const centerOffsetX = Math.abs(actualRectCenterX - contentCenterX);
      const centerOffsetY = Math.abs(actualRectCenterY - contentCenterY);
      console.log(`   中心点偏移: X=${centerOffsetX.toFixed(4)}px, Y=${centerOffsetY.toFixed(4)}px`);
      
      if (centerOffsetX < 0.01 && centerOffsetY < 0.01) {
        console.log('   ✅ 中心点完美对齐！');
      } else {
        console.log('   ⚠️  中心点存在偏移');
      }
      
      // 计算留白信息
      const leftMargin = tileRectStartX;
      const rightMargin = contentWidth - (tileRectStartX + tilesRectWidth);
      const topMargin = tileRectStartY;
      const bottomMargin = contentHeight - (tileRectStartY + tilesRectHeight);
      
      console.log('📏 留白分布:');
      console.log(`   左边距: ${leftMargin.toFixed(2)}px`);
      console.log(`   右边距: ${rightMargin.toFixed(2)}px`);
      console.log(`   上边距: ${topMargin.toFixed(2)}px`);
      console.log(`   下边距: ${bottomMargin.toFixed(2)}px`);
      
      const horizontalSymmetry = Math.abs(leftMargin - rightMargin);
      const verticalSymmetry = Math.abs(topMargin - bottomMargin);
      console.log(`   水平对称性: ${horizontalSymmetry.toFixed(4)}px 差异`);
      console.log(`   垂直对称性: ${verticalSymmetry.toFixed(4)}px 差异`);
      
      if (horizontalSymmetry < 0.01 && verticalSymmetry < 0.01) {
        console.log('   ✅ 留白完美对称！');
      } else {
        console.log('   ⚠️  留白存在不对称');
      }
      
      console.log('🎯 ========================');
    }
    
    // 🎯 计算单个方块位置（相对于数字方块矩形左上角）
    const relativeX = col * (tileSize + gap);
    const relativeY = row * (tileSize + gap);
    
    // 🎯 最终位置：数字方块矩形起始位置 + 方块相对位置
    const x = tileRectStartX + relativeX;
    const y = tileRectStartY + relativeY;
    
    // 🎯 调试信息：特定方块位置（可选择性输出）
    if ((row === 0 && col === 0) || (row === rows - 1 && col === cols - 1)) {
      console.log(`📍 方块位置 [${row},${col}]:`, {
        相对位置: `(${relativeX}, ${relativeY})`,
        绝对位置: `(${x.toFixed(2)}, ${y.toFixed(2)})`,
        方块尺寸: `${tileSize} × ${tileSize}px`
      });
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