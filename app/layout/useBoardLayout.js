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

function pickRowsCols(tileCount, usableW, usableH) {
  const targetRatio = usableH / usableW;
  let best = { rows: 1, cols: tileCount, diff: Infinity };
  for (let r = 1; r <= tileCount; r++) {
    const c = Math.ceil(tileCount / r);
    const ratio = r / c;
    const diff = Math.abs(ratio - targetRatio);
    if (diff < best.diff || (diff === best.diff && r * c < best.rows * best.cols)) {
      best = { rows: r, cols: c, diff };
    }
  }
  return { rows: best.rows, cols: best.cols };
}

export function computeBoardLayout(usableW, usableH, tileCount) {
  let { rows, cols } = pickRowsCols(tileCount, usableW, usableH);

  let foundGap = null;
  for (let gap = GAP_MAX; gap >= GAP_MIN; gap--) {
    if (canFit(usableW, usableH, rows, cols, gap)) { foundGap = gap; break; }
  }

  while (foundGap === null) {
    const targetRatio = usableH / usableW;
    const r1 = rows + 1, c1 = Math.ceil(tileCount / r1);
    const r2 = rows,     c2 = cols + 1;
    const d1 = Math.abs((r1 / c1) - targetRatio);
    const d2 = Math.abs((r2 / c2) - targetRatio);
    if (d1 <= d2) { rows = r1; cols = c1; } else { cols = c2; }
    for (let gap = GAP_MAX; gap >= GAP_MIN; gap--) {
      if (canFit(usableW, usableH, rows, cols, gap)) { foundGap = gap; break; }
    }
  }

  const gap = foundGap;
  const padding = gap + PADDING_EXTRA;

  const boardW = cols * TILE_SIZE + (cols - 1) * gap + 2 * padding;
  const boardH = rows * TILE_SIZE + (rows - 1) * gap + 2 * padding;

  const offsetX = Math.floor((usableW - boardW) / 2);
  const offsetY = Math.floor((usableH - boardH) / 2);

  const slots = [];
  const startX = padding; // 相对于棋盘容器的坐标
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

  return { rows, cols, gap, padding, boardW, boardH, offsetX, offsetY, slots, tileCount };
}

export function useBoardLayout(usableW, usableH, tileCount) {
  return useMemo(() => {
    console.log('🎯 useBoardLayout called with:', { usableW, usableH, tileCount });
    if (usableW <= 0 || usableH <= 0 || tileCount <= 0) return null;
    const layout = computeBoardLayout(usableW, usableH, tileCount);
    console.log('📐 Layout computed:', {
      rows: layout.rows,
      cols: layout.cols,
      gap: layout.gap,
      boardW: layout.boardW,
      boardH: layout.boardH,
      slotsCount: layout.slots.length
    });
    return layout;
  }, [usableW, usableH, tileCount]);
}