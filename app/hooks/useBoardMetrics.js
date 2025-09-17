/**
 * Board Metrics Hook - 动态间距系统，基于棋盘格大小和方块数量
 * Purpose: 根据关卡难度动态调整方块与棋盘边缘的间距
 */

import { useMemo } from 'react';
import { Dimensions, PixelRatio } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// 固定方块大小常量
const FIXED_TILE_SIZE = 36; // 固定方块大小 36px
const TILE_HEIGHT_RATIO = 0.9; // 纸片效果：高度为宽度的90%
const GAP_SIZE = 6; // 方块间固定间距

// 动态间距配置
const SPACING_CONFIG = {
  // 最大边距（简单关卡）
  MAX_MARGIN: 40,
  // 最小边距（困难关卡，但永远不为0）
  MIN_MARGIN: 8,
  // 间距衰减系数（关卡越高，间距越小）
  DECAY_FACTOR: 0.85,
  // 基础关卡（间距开始衰减的起点）
  BASE_LEVEL: 10
};

// 像素对齐函数
function roundPx(value) {
  return PixelRatio.roundToNearestPixel(value);
}

// 计算动态边距
function calculateDynamicMargin(rows, cols, level = 1, isChallenge = false) {
  const totalTiles = rows * cols;
  
  if (isChallenge) {
    // 挑战模式：使用较小的固定边距
    return SPACING_CONFIG.MIN_MARGIN + 4; // 12px
  }
  
  // 基于关卡的间距衰减
  let levelFactor = 1;
  if (level > SPACING_CONFIG.BASE_LEVEL) {
    const excessLevels = level - SPACING_CONFIG.BASE_LEVEL;
    levelFactor = Math.pow(SPACING_CONFIG.DECAY_FACTOR, excessLevels / 20);
  }
  
  // 基于方块数量的间距调整
  let tileFactor = 1;
  if (totalTiles <= 16) {
    tileFactor = 1.2; // 方块少时，间距更大
  } else if (totalTiles <= 36) {
    tileFactor = 1.0; // 中等方块数，标准间距
  } else if (totalTiles <= 64) {
    tileFactor = 0.8; // 方块多时，间距较小
  } else {
    tileFactor = 0.6; // 方块很多时，间距更小
  }
  
  // 计算最终边距
  const baseMargin = SPACING_CONFIG.MAX_MARGIN * levelFactor * tileFactor;
  const finalMargin = Math.max(SPACING_CONFIG.MIN_MARGIN, baseMargin);
  
  return Math.round(finalMargin);
}

export function useBoardMetrics({ 
  rows, 
  cols, 
  isChallenge = false,
  level = 1
}) {
  return useMemo(() => {
    // 根据模式设置基础安全区域
    const baseSafeTop = isChallenge ? 110 : 100;
    const baseSafeBottom = isChallenge ? 130 : 120;
    const safeHorizontal = 20; // 左右安全边距
    
    // 计算动态边距
    const dynamicMargin = calculateDynamicMargin(rows, cols, level, isChallenge);
    
    // 固定尺寸
    const tileWidth = FIXED_TILE_SIZE;
    const tileHeight = roundPx(FIXED_TILE_SIZE * TILE_HEIGHT_RATIO);
    const gap = GAP_SIZE;
    
    // 像素对齐
    const tileWidthPx = roundPx(tileWidth);
    const tileHeightPx = roundPx(tileHeight);
    const gapPx = roundPx(gap);
    const marginPx = roundPx(dynamicMargin);
    
    // 计算内容区域尺寸（方块实际占用的空间）
    const innerWidth = cols * tileWidthPx + (cols - 1) * gapPx;
    const innerHeight = rows * tileHeightPx + (rows - 1) * gapPx;
    
    // 计算棋盘总尺寸（包含动态边距）
    const boardWidth = innerWidth + 2 * marginPx;
    const boardHeight = innerHeight + 2 * marginPx;
    
    // 计算可用区域
    const usableWidth = screenWidth - 2 * safeHorizontal;
    const usableHeight = screenHeight - baseSafeTop - baseSafeBottom;
    
    // 检查棋盘是否适合屏幕
    const fitsInScreen = boardWidth <= usableWidth && boardHeight <= usableHeight;
    
    // 如果棋盘过大，动态调整安全区域
    let safeTop = baseSafeTop;
    let safeBottom = baseSafeBottom;
    
    if (!fitsInScreen) {
      // 棋盘过大时，适当减少安全区域
      const heightOverflow = boardHeight - usableHeight;
      if (heightOverflow > 0) {
        const reduction = Math.min(heightOverflow / 2, 20); // 最多减少20px
        safeTop = Math.max(baseSafeTop - reduction, baseSafeTop - 20);
        safeBottom = Math.max(baseSafeBottom - reduction, baseSafeBottom - 20);
      }
    }
    
    // 重新计算可用区域
    const finalUsableWidth = screenWidth - 2 * safeHorizontal;
    const finalUsableHeight = screenHeight - safeTop - safeBottom;
    const finalFitsInScreen = boardWidth <= finalUsableWidth && boardHeight <= finalUsableHeight;
    
    // 计算棋盘位置
    let boardX, boardY;
    let isCentered = true;
    
    if (finalFitsInScreen) {
      // 棋盘适合屏幕，完美居中
      boardX = safeHorizontal + (finalUsableWidth - boardWidth) / 2;
      boardY = safeTop + (finalUsableHeight - boardHeight) / 2;
    } else {
      // 棋盘过大，贴边显示
      isCentered = false;
      
      // 水平方向：优先居中，超出时贴边
      if (boardWidth <= finalUsableWidth) {
        boardX = safeHorizontal + (finalUsableWidth - boardWidth) / 2;
      } else {
        boardX = safeHorizontal; // 贴左边
      }
      
      // 垂直方向：优先居中，超出时贴顶部
      if (boardHeight <= finalUsableHeight) {
        boardY = safeTop + (finalUsableHeight - boardHeight) / 2;
      } else {
        boardY = safeTop; // 贴顶部
      }
    }
    
    // 最终边界检查 - 确保绝对不超出屏幕
    boardX = Math.max(safeHorizontal, Math.min(boardX, screenWidth - safeHorizontal - boardWidth));
    boardY = Math.max(safeTop, Math.min(boardY, screenHeight - safeBottom - boardHeight));
    
    // 方块位置计算函数
    const getTilePosition = (row, col) => ({
      x: roundPx(col * (tileWidthPx + gapPx)),
      y: roundPx(row * (tileHeightPx + gapPx)),
    });
    
    return {
      // 固定尺寸
      tileSize: FIXED_TILE_SIZE,
      tileWidth: tileWidthPx,
      tileHeight: tileHeightPx,
      gap: gapPx,
      padding: marginPx, // 现在是动态计算的边距
      
      // 计算尺寸
      boardWidth: roundPx(boardWidth),
      boardHeight: roundPx(boardHeight),
      boardX: roundPx(boardX),
      boardY: roundPx(boardY),
      innerWidth: roundPx(innerWidth),
      innerHeight: roundPx(innerHeight),
      
      // 可用区域
      usableWidth: roundPx(finalUsableWidth),
      usableHeight: roundPx(finalUsableHeight),
      
      // 安全区域
      safeTop,
      safeBottom,
      safeHorizontal,
      
      // 工具函数
      getTilePosition,
      
      // 调试信息
      debug: {
        rows,
        cols,
        level,
        totalCells: rows * cols,
        dynamicMargin: marginPx,
        marginRange: `${SPACING_CONFIG.MIN_MARGIN}px~${SPACING_CONFIG.MAX_MARGIN}px`,
        fixedTileSize: FIXED_TILE_SIZE,
        calculatedBoardSize: `${Math.round(boardWidth)}×${Math.round(boardHeight)}`,
        screenSize: `${screenWidth}×${screenHeight}`,
        usableArea: `${Math.round(finalUsableWidth)}×${Math.round(finalUsableHeight)}`,
        safeArea: `top:${safeTop} bottom:${safeBottom} sides:${safeHorizontal}`,
        fitsInScreen: finalFitsInScreen,
        boardPosition: `(${Math.round(boardX)}, ${Math.round(boardY)})`,
        isCentered,
        spacingInfo: `方块${rows * cols}个，关卡${level}，边距${marginPx}px`
      }
    };
  }, [rows, cols, isChallenge, level]);
}