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
  isChallenge = false 
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
    
    // 计算方块尺寸
    const tileSizeW = (usableWidth - 2 * padding - (cols - 1) * gap) / cols;
    const tileSizeH = (usableHeight - 2 * padding - (rows - 1) * gap) / rows;
    let tileSize = Math.max(MIN_TILE_SIZE, Math.floor(Math.min(tileSizeW, tileSizeH)));
    
    // 贴近理想尺寸
    if (Math.abs(tileSize - IDEAL_TILE_SIZE) <= 4) {
      tileSize = IDEAL_TILE_SIZE;
    }
    tileSize = Math.max(MIN_TILE_SIZE, Math.min(MAX_TILE_SIZE, tileSize));
    
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
    
    // 居中定位
    const boardX = (screenWidth - boardWidth) / 2;
    const boardY = actualSafeTop + (usableHeight - boardHeight) / 2;
    
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
    };
  }, [rows, cols, safeTop, safeBottom, safeHorizontalPadding, isChallenge]);
}