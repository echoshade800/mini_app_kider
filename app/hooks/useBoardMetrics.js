/**
 * Board Metrics Hook - 棋盘居中布局计算，确保不超出安全边界
 * Purpose: 计算棋盘在屏幕中的居中位置，避免与状态栏和道具栏重叠
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
  isChallenge = false
}) {
  return useMemo(() => {
    // 根据模式设置安全区域
    const safeTop = isChallenge ? 120 : 100; // 状态栏/HUD安全区域
    const safeBottom = isChallenge ? 140 : 120; // 道具栏安全区域
    const safeHorizontal = 20; // 左右安全边距
    
    // 计算可用区域
    const usableWidth = screenWidth - 2 * safeHorizontal;
    const usableHeight = screenHeight - safeTop - safeBottom;
    
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
    
    // 计算棋盘位置 - 优先居中，超出时贴边
    let boardX, boardY;
    let isCentered = true;
    
    if (fitsInScreen) {
      // 棋盘适合屏幕，完美居中
      boardX = safeHorizontal + (usableWidth - boardWidth) / 2;
      boardY = safeTop + (usableHeight - boardHeight) / 2;
    } else {
      // 棋盘过大，贴边显示
      isCentered = false;
      
      // 水平方向：优先居中，超出时贴边
      if (boardWidth <= usableWidth) {
        boardX = safeHorizontal + (usableWidth - boardWidth) / 2;
      } else {
        boardX = safeHorizontal; // 贴左边
      }
      
      // 垂直方向：优先居中，超出时贴顶部
      if (boardHeight <= usableHeight) {
        boardY = safeTop + (usableHeight - boardHeight) / 2;
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
        totalCells: rows * cols,
        fixedTileSize: FIXED_TILE_SIZE,
        calculatedBoardSize: `${Math.round(boardWidth)}×${Math.round(boardHeight)}`,
        screenSize: `${screenWidth}×${screenHeight}`,
        usableArea: `${Math.round(usableWidth)}×${Math.round(usableHeight)}`,
        safeArea: `top:${safeTop} bottom:${safeBottom} sides:${safeHorizontal}`,
        fitsInScreen,
        boardPosition: `(${Math.round(boardX)}, ${Math.round(boardY)})`,
        isCentered,
      }
    };
  }, [rows, cols, isChallenge]);
}