/**
 * Board Metrics Hook - 固定方块大小的棋盘布局计算
 * Purpose: 为闯关模式和挑战模式提供固定方块大小的布局计算
 */

import { useMemo } from 'react';
import { Dimensions, PixelRatio } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// 固定方块大小常量
const FIXED_TILE_SIZE = 36; // 固定方块大小 36px
const TILE_HEIGHT_RATIO = 0.9; // 纸片效果：高度为宽度的90%
const GAP_SIZE = 6; // 固定间距
const BOARD_PADDING = 12; // 固定棋盘内边距

// 像素对齐函数
function roundPx(value) {
  return PixelRatio.roundToNearestPixel(value);
}

export function useBoardMetrics({ 
  rows, 
  cols, 
  safeTop = 80, 
  safeBottom = 80, 
  safeHorizontalPadding = 20,
  isChallenge = false
}) {
  return useMemo(() => {
    // 挑战模式和闯关模式的安全区域
    const actualSafeTop = isChallenge ? 140 : 100; // 为状态栏/HUD留出更多空间
    const actualSafeBottom = isChallenge ? 160 : 120; // 为道具栏留出更多空间
    
    // 计算可用区域
    const usableWidth = screenWidth - 2 * safeHorizontalPadding;
    const usableHeight = screenHeight - actualSafeTop - actualSafeBottom;
    
    // 固定尺寸
    const tileWidth = FIXED_TILE_SIZE;
    const tileHeight = roundPx(FIXED_TILE_SIZE * TILE_HEIGHT_RATIO);
    const gap = GAP_SIZE;
    const padding = BOARD_PADDING;
    
    // 像素对齐
    const tileWidthPx = roundPx(tileWidth);
    const tileHeightPx = roundPx(tileHeight);
    const gapPx = roundPx(gap);
    const paddingPx = roundPx(padding);
    
    // 计算内容区域尺寸（方块实际占用的空间）
    const innerWidth = cols * tileWidthPx + (cols - 1) * gapPx;
    const innerHeight = rows * tileHeightPx + (rows - 1) * gapPx;
    
    // 计算棋盘总尺寸（包含边距）
    const boardWidth = innerWidth + 2 * paddingPx;
    const boardHeight = innerHeight + 2 * paddingPx;
    
    // 检查棋盘是否超出可用区域
    const fitsInScreen = boardWidth <= usableWidth && boardHeight <= usableHeight;
    
    // 计算棋盘位置 - 优先居中，如果超出则贴边
    let boardX = (screenWidth - boardWidth) / 2;
    let boardY = actualSafeTop + (usableHeight - boardHeight) / 2;
    
    // 水平边界检查
    if (boardX < safeHorizontalPadding) {
      boardX = safeHorizontalPadding;
    }
    if (boardX + boardWidth > screenWidth - safeHorizontalPadding) {
      boardX = screenWidth - safeHorizontalPadding - boardWidth;
    }
    
    // 垂直边界检查 - 确保不与状态栏和道具栏重叠
    if (boardY < actualSafeTop) {
      boardY = actualSafeTop;
    }
    if (boardY + boardHeight > screenHeight - actualSafeBottom) {
      boardY = screenHeight - actualSafeBottom - boardHeight;
    }
    
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
      padding: paddingPx,
      
      // 计算尺寸
      boardWidth: roundPx(boardWidth),
      boardHeight: roundPx(boardHeight),
      boardX: roundPx(boardX),
      boardY: roundPx(boardY),
      innerWidth: roundPx(innerWidth),
      innerHeight: roundPx(innerHeight),
      
      // 可用区域
      usableWidth: roundPx(usableWidth),
      usableHeight: roundPx(usableHeight),
      
      // 工具函数
      getTilePosition,
      
      // 调试信息
      debug: {
        rows,
        cols,
        totalCells: rows * cols,
        fixedTileSize: FIXED_TILE_SIZE,
        calculatedBoardSize: `${Math.round(boardWidth)}×${Math.round(boardHeight)}`,
        screenSize: `${screenWidth}×${screenHeight}`,
        safeArea: `top:${actualSafeTop} bottom:${actualSafeBottom}`,
        fitsInScreen,
        boardPosition: `(${Math.round(boardX)}, ${Math.round(boardY)})`,
      }
    };
  }, [rows, cols, safeTop, safeBottom, safeHorizontalPadding, isChallenge]);
}