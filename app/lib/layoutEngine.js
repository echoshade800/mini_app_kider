/**
 * 像素级精确布局引擎 - 彻底解决棋盘偏差问题
 * Purpose: 单一坐标系、像素对齐、断言检查、回退策略
 */

import { PixelRatio } from 'react-native';

const R = (v) => PixelRatio.roundToNearestPixel(v);

/**
 * 计算棋盘布局 - 唯一真相源
 * @param {Object} p
 * @param {{left:number, top:number, width:number, height:number}} p.board // onLayout(棋盘容器)得到
 * @param {number} p.frame   // 木框厚度 eg 12
 * @param {number} p.pad     // 内边距(绿板留白) eg 6
 * @param {number} p.rows
 * @param {number} p.cols
 * @param {number} p.gap     // 格间距(初始建议 6~10)
 * @param {number} p.minTile // 最小方块 28
 * @param {number} p.maxTile // 最大方块 40 或固定 32
 * @param {boolean} p.lockTile // true=强制固定 tile，不够就减 gap，仍不够就居中放不满
 */
export function computeLayout(p) {
  // 🎯 步骤1: 计算内容区 - 扣掉木框与内边距
  const inner = {
    left:   R(p.board.left   + p.frame + p.pad),
    top:    R(p.board.top    + p.frame + p.pad),
    width:  R(p.board.width  - 2 * (p.frame + p.pad)),
    height: R(p.board.height - 2 * (p.frame + p.pad)),
  };

  // 🎯 步骤2: 计算方块尺寸和间距
  let tile = p.maxTile;
  let gap = p.gap;

  const needW = (t, g) => p.cols * t + (p.cols - 1) * g;
  const needH = (t, g) => p.rows * t + (p.rows - 1) * g;
  const fit = () => (needW(tile, gap) <= inner.width && needH(tile, gap) <= inner.height);

  if (p.lockTile) {
    // 固定 tile，优先减 gap
    while (!fit() && gap > 2) gap--;
    // 仍不 fit 就保持 gap，居中摆不满（四周自然留白）
  } else {
    // 允许缩放 tile，clamp 到 minTile..maxTile，gap 不变
    const tileW = Math.floor((inner.width  - (p.cols - 1) * gap) / p.cols);
    const tileH = Math.floor((inner.height - (p.rows - 1) * gap) / p.rows);
    tile = Math.max(p.minTile, Math.min(p.maxTile, Math.min(tileW, tileH)));
  }

  // 🎯 步骤3: 计算网格起点 - 强制整数像素
  const gridW = needW(tile, gap);
  const gridH = needH(tile, gap);
  const startX = R(inner.left + (inner.width  - gridW) / 2);
  const startY = R(inner.top  + (inner.height - gridH) / 2);

  // 🎯 步骤4: 生成所有方块位置
  const tiles = [];
  for (let r = 0; r < p.rows; r++) {
    for (let c = 0; c < p.cols; c++) {
      tiles.push({
        id: `${r}-${c}`,
        row: r,
        col: c,
        left: R(startX + c * (tile + gap)),
        top:  R(startY + r * (tile + gap)),
        size: tile,
      });
    }
  }

  // 🎯 步骤5: 断言检查 - 开发期检测越界
  if (__DEV__) {
    const over = tiles.find(t =>
      t.left < inner.left - 0.5 ||
      t.top  < inner.top  - 0.5 ||
      t.left + tile > inner.left + inner.width  + 0.5 ||
      t.top  + tile > inner.top  + inner.height + 0.5
    );
    if (over) {
      console.warn('🚨 Tile overflow detected:', {
        inner,
        tile,
        gap,
        gridW,
        gridH,
        overflow: over,
        boardRect: p.board
      });
    }
  }

  return {
    inner,
    tile,
    gap,
    startX,
    startY,
    gridW,
    gridH,
    tiles,
    // 调试信息
    debug: {
      boardRect: p.board,
      innerRect: inner,
      gridSize: { width: gridW, height: gridH },
      tileCount: tiles.length
    }
  };
}