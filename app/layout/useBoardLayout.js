// app/layout/useBoardLayout.js
import { useMemo } from 'react';

const TILE_SIZE = 30;      // 固定方块边长
const GAP_MIN = 6;         // 最小方块间距
const GAP_MAX = 14;        // 最大方块间距
const PADDING_EXTRA = 6;   // 边距 = gap + PADDING_EXTRA

function canFit(usableW, usableH, rows, cols, gap) {
  const padding = gap + PADDING_EXTRA;
  const needW = cols * TILE_SIZE + (cols - 1) * gap + 2 * padding;
  const needH = rows * TILE_SIZE + (rows - 1) * gap + 2 * padding;
  return needW <= usableW && needH <= usableH;
}

function pickRowsCols(tileCount) {
  // 预定义的行列组合
  const combinations = [
    { rows: 4, cols: 4 },   // 16 tiles
    { rows: 4, cols: 5 },   // 20 tiles
    { rows: 5, cols: 5 },   // 25 tiles
    { rows: 6, cols: 5 },   // 30 tiles
    { rows: 6, cols: 6 },   // 36 tiles
    { rows: 7, cols: 6 },   // 42 tiles
    { rows: 7, cols: 7 },   // 49 tiles
    { rows: 8, cols: 7 },   // 56 tiles
    { rows: 8, cols: 8 },   // 64 tiles
    { rows: 9, cols: 8 },   // 72 tiles
    { rows: 9, cols: 9 },   // 81 tiles
    { rows: 10, cols: 9 },  // 90 tiles
    { rows: 10, cols: 10 }, // 100 tiles
    { rows: 11, cols: 10 }, // 110 tiles
    { rows: 12, cols: 10 }, // 120 tiles
  ];
  
  // 找到最接近的组合
  for (const combo of combinations) {
    if (combo.rows * combo.cols >= tileCount) {
      return combo;
    }
  }
  
  // 如果没找到，使用最大的
  return combinations[combinations.length - 1];
}

export function computeBoardLayout(usableW, usableH, tileCount) {
  try {
    let { rows, cols } = pickRowsCols(tileCount);

    let foundGap = null;
    for (let gap = GAP_MAX; gap >= GAP_MIN; gap--) {
      if (canFit(usableW, usableH, rows, cols, gap)) { 
        foundGap = gap; 
        break; 
      }
    }

    // 如果找不到合适的间距，增加列数
    let attempts = 0;
    while (foundGap === null && attempts < 5) {
      cols = cols + 1;
      for (let gap = GAP_MAX; gap >= GAP_MIN; gap--) {
        if (canFit(usableW, usableH, rows, cols, gap)) { 
          foundGap = gap; 
          break; 
        }
      }
      attempts++;
    }

    // 如果还是找不到，使用最小间距
    if (foundGap === null) {
      foundGap = GAP_MIN;
    }

    const gap = foundGap;
    const padding = gap + PADDING_EXTRA;

    const boardW = cols * TILE_SIZE + (cols - 1) * gap + 2 * padding;
    const boardH = rows * TILE_SIZE + (rows - 1) * gap + 2 * padding;

    const offsetX = Math.floor((usableW - boardW) / 2);
    const offsetY = Math.floor((usableH - boardH) / 2);

    const slots = [];
    const startX = padding;
    const startY = padding;
    let placed = 0;
    
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = startX + c * (TILE_SIZE + gap);
        const y = startY + r * (TILE_SIZE + gap);
        slots.push({ 
          x, y, w: TILE_SIZE, h: TILE_SIZE, 
          row: r, col: c, index: placed,
          filled: placed < tileCount 
        });
        placed++;
      }
    }

    return { 
      rows, cols, gap, padding, boardW, boardH, offsetX, offsetY, slots, tileCount 
    };
  } catch (error) {
    console.error('❌ Layout computation failed:', error);
    
    // 返回一个简单的后备布局
    const fallbackRows = 4;
    const fallbackCols = 4;
    const fallbackGap = GAP_MIN;
    const fallbackPadding = fallbackGap + PADDING_EXTRA;
    
    const fallbackSlots = [];
    for (let r = 0; r < fallbackRows; r++) {
      for (let c = 0; c < fallbackCols; c++) {
        const x = fallbackPadding + c * (TILE_SIZE + fallbackGap);
        const y = fallbackPadding + r * (TILE_SIZE + fallbackGap);
        fallbackSlots.push({ 
          x, y, w: TILE_SIZE, h: TILE_SIZE, 
          row: r, col: c, index: r * fallbackCols + c,
          filled: (r * fallbackCols + c) < Math.min(tileCount, 16)
        });
      }
    }
    
    return {
      rows: fallbackRows,
      cols: fallbackCols,
      gap: fallbackGap,
      padding: fallbackPadding,
      boardW: fallbackCols * TILE_SIZE + (fallbackCols - 1) * fallbackGap + 2 * fallbackPadding,
      boardH: fallbackRows * TILE_SIZE + (fallbackRows - 1) * fallbackGap + 2 * fallbackPadding,
      offsetX: 0,
      offsetY: 0,
      slots: fallbackSlots,
      tileCount: Math.min(tileCount, 16)
    };
  }
}

export function useBoardLayout(usableW, usableH, tileCount) {
  return useMemo(() => {
    // 确保有合理的默认值
    const safeUsableW = Math.max(usableW || 350, 350);
    const safeUsableH = Math.max(usableH || 400, 400);
    const safeTileCount = Math.max(tileCount || 16, 1);
    
    if (safeTileCount <= 0) {
      return null;
    }
    
    const layout = computeBoardLayout(safeUsableW, safeUsableH, safeTileCount);
    return layout;
  }, [usableW, usableH, tileCount]);
}