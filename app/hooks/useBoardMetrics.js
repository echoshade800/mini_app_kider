/**
 * Board Metrics Hook - 自适应棋盘布局计算
 * Purpose: 统一计算棋盘尺寸、方块大小、定位等布局参数
 */

import { useMemo } from 'react';
import { Dimensions, PixelRatio } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// 像素对齐函数
function roundPx(value) {
  return PixelRatio.roundToNearestPixel(value);
}

export function useBoardMetrics({ 
  rows, 
  cols, 
  safeTop = 120, 
  safeBottom = 140, 
  safeHorizontalPadding = 20 
}) {
  return useMemo(() => {
    // 计算可用区域
    const usableWidth = screenWidth - 2 * safeHorizontalPadding;
    const usableHeight = screenHeight - safeTop - safeBottom;
    
    // 统一边距与间距
    let padding = 12;
    let gap = 8;
    
    // 超大网格启用紧凑模式
    if (rows > 16 || cols > 10) {
      padding = Math.max(8, padding * 0.85);
      gap = Math.max(6, gap * 0.85);
    }
    
    padding = roundPx(padding);
    gap = roundPx(gap);
    
    // 计算方块尺寸
    const tileSizeW = (usableWidth - 2 * padding - (cols - 1) * gap) / cols;
    const tileSizeH = (usableHeight - 2 * padding - (rows - 1) * gap) / rows;
    let tileSize = Math.floor(Math.min(tileSizeW, tileSizeH));
    
    // 保证最小可读性
    const minTileSize = 28;
    if (tileSize < minTileSize) {
      tileSize = minTileSize;
    }
    
    tileSize = roundPx(tileSize);
    
    // 计算棋盘尺寸
    const boardWidth = roundPx(cols * tileSize + (cols - 1) * gap + 2 * padding);
    const boardHeight = roundPx(rows * tileSize + (rows - 1) * gap + 2 * padding);
    
    // 计算棋盘定位（居中）
    const boardX = roundPx((screenWidth - boardWidth) / 2);
    const boardY = roundPx(safeTop + (usableHeight - boardHeight) / 2);
    
    // 计算方块定位函数
    const getTilePosition = (row, col) => ({
      x: roundPx(padding + col * (tileSize + gap)),
      y: roundPx(padding + row * (tileSize + gap)),
    });
    
    // 计算字体大小
    const fontSize = Math.max(14, Math.floor(tileSize * 0.45));
    
    return {
      // 基础参数
      tileSize,
      padding,
      gap,
      fontSize,
      
      // 棋盘尺寸
      boardWidth,
      boardHeight,
      
      // 棋盘定位
      boardX,
      boardY,
      
      // 工具函数
      getTilePosition,
      
      // 调试信息
      debug: {
        screenWidth,
        screenHeight,
        usableWidth,
        usableHeight,
        safeTop,
        safeBottom,
        rows,
        cols,
      }
    };
  }, [rows, cols, safeTop, safeBottom, safeHorizontalPadding]);
}