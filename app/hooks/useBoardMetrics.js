/**
 * Board Metrics Hook - 使用新的统一布局系统
 * Purpose: 提供基于新布局算法的棋盘度量数据
 */

import { useMemo } from 'react';
import { Dimensions } from 'react-native';
import { getCompleteLayout, getTilePosition } from '../utils/layout';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export function useBoardMetrics({ 
  rows, 
  cols, 
  isChallenge = false,
  level = 1,
  topUsed = 100,
  bottomUsed = 120
}) {
  return useMemo(() => {
    // 使用新的统一布局算法
    const layout = getCompleteLayout(
      screenWidth, 
      screenHeight, 
      level, 
      isChallenge, 
      topUsed, 
      bottomUsed
    );
    
    // 方块位置计算函数
    const getTilePositionForGrid = (row, col) => {
      return getTilePosition(row, col, layout.tileSize, layout.gap, layout.padding);
    };
    
    return {
      // 基础尺寸
      tileSize: layout.tileSize,
      tileWidth: layout.tileSize,
      tileHeight: layout.tileSize,
      gap: layout.gap,
      padding: layout.padding,
      
      // 棋盘尺寸和位置
      boardWidth: layout.boardWidth,
      boardHeight: layout.boardHeight,
      boardX: layout.boardX,
      boardY: layout.boardY,
      
      // 网格信息
      rows: layout.rows,
      cols: layout.cols,
      
      // 可用区域
      usableWidth: layout.usableArea.width,
      usableHeight: layout.usableArea.height,
      
      // 安全区域
      safeTop: topUsed,
      safeBottom: bottomUsed,
      safeHorizontal: 20,
      
      // 工具函数
      getTilePosition: getTilePositionForGrid,
      
      // 调试信息
      debug: layout.debug
    };
  }, [rows, cols, isChallenge, level, topUsed, bottomUsed]);
}