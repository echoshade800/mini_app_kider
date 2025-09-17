/**
 * Board Metrics Hook - 统一的棋盘布局计算
 * Purpose: 为闯关模式和挑战模式提供一致的自适应布局计算
 */

import { useMemo } from 'react';
import { Dimensions, PixelRatio } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// 布局常量
const MIN_TILE_SIZE = 28; // 最小可读方块尺寸
const IDEAL_TILE_SIZE = 36; // 理想方块尺寸
const MAX_TILE_SIZE = 42; // 最大方块尺寸

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
  isChallenge = false,
  fixedTileSize = 36 // 固定方块大小为36px
}) {
  return useMemo(() => {
    // 挑战模式使用更大的安全区域
    const actualSafeTop = isChallenge ? 120 : safeTop;
    const actualSafeBottom = isChallenge ? 140 : safeBottom;
    
    // 计算可用区域
    const usableWidth = screenWidth - 2 * safeHorizontalPadding;
    const usableHeight = screenHeight - actualSafeTop - actualSafeBottom;
    
    // 基础边距和间距
    let padding = 12;
    let gap = 8;
    
    // 超大网格启用紧凑模式
    const totalCells = rows * cols;
    if (totalCells > 100) {
      padding = Math.max(8, padding * 0.85);
      gap = Math.max(4, gap * 0.85);
    }
    
    // 使用固定方块大小
    const tileSize = fixedTileSize;
    
    // 像素对齐
    const tile = roundPx(tileSize);
    const gapPx = roundPx(gap);
    const paddingPx = roundPx(padding);
    
    // 方块尺寸（纸片效果）
    const tileWidth = tile;
    const tileHeight = roundPx(tile * 0.9);
    
    // 计算内容区域尺寸
    const innerWidth = cols * tileWidth + (cols - 1) * gapPx;
    const innerHeight = rows * tileHeight + (rows - 1) * gapPx;
    
    // 计算棋盘总尺寸
    const boardWidth = innerWidth + 2 * paddingPx;
    const boardHeight = innerHeight + 2 * paddingPx;
    
    // 居中定位 - 确保棋盘不超出屏幕
    let boardX = (screenWidth - boardWidth) / 2;
    let boardY = actualSafeTop + (usableHeight - boardHeight) / 2;
    
    // 边界检查 - 确保棋盘完全在屏幕内
    if (boardX < safeHorizontalPadding) {
      boardX = safeHorizontalPadding;
    }
    if (boardX + boardWidth > screenWidth - safeHorizontalPadding) {
      boardX = screenWidth - safeHorizontalPadding - boardWidth;
    }
    
    if (boardY < actualSafeTop) {
      boardY = actualSafeTop;
    }
    if (boardY + boardHeight > screenHeight - actualSafeBottom) {
      boardY = screenHeight - actualSafeBottom - boardHeight;
    }
    
    // 方块位置计算函数
    const getTilePosition = (row, col) => ({
      x: roundPx(col * (tileWidth + gapPx)),
      y: roundPx(row * (tileHeight + gapPx)),
    });
    
    return {
      tileSize: tile,
      tileWidth,
      tileHeight,
      gap: gapPx,
      padding: paddingPx,
      boardWidth: roundPx(boardWidth),
      boardHeight: roundPx(boardHeight),
      boardX: roundPx(boardX),
      boardY: roundPx(boardY),
      innerWidth: roundPx(innerWidth),
      innerHeight: roundPx(innerHeight),
      usableWidth: roundPx(usableWidth),
      usableHeight: roundPx(usableHeight),
      getTilePosition,
      // 添加调试信息
      debug: {
        rows,
        cols,
        totalCells,
        calculatedBoardSize: `${Math.round(boardWidth)}×${Math.round(boardHeight)}`,
        screenSize: `${screenWidth}×${screenHeight}`,
        fitsInScreen: boardWidth <= usableWidth && boardHeight <= usableHeight,
      }
    };
  }, [rows, cols, safeTop, safeBottom, safeHorizontalPadding, isChallenge]);
}