// utils/layout.js
export function computeBoardLayout({
  availWidth,    // 可用宽（扣掉头/尾）
  availHeight,   // 可用高（扣掉头/尾）
  rows,
  cols,
}) {
  // 输入保护
  rows = Math.max(1, rows|0);
  cols = Math.max(1, cols|0);

  // 1) 先用最大目标估一个"理想间距/外边距"的尝试值
  const T_MAX = 44, T_MIN = 28;
  const even = v => (v & ~1); // 向下取偶
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const G_try = T_MAX * 0.18;
  const P_try = G_try * 1.5;

  const T_w = (availWidth  - 2*P_try - (cols - 1) * G_try) / cols;
  const T_h = (availHeight - 2*P_try - (rows - 1) * G_try) / rows;

  let T = even(Math.floor(Math.min(T_w, T_h)));
  T = clamp(T, T_MIN, T_MAX);

  // 2) 基于最终方块边长反推间距/外边距
  let G = Math.round(T * 0.18);
  G = even(G); // 偶数像素
  let P = Math.max(G + 2, Math.round(G * 1.5));

  // 3) 计算最终棋盘尺寸（不含木框视觉厚度）
  const boardWidth  = cols * T + (cols - 1) * G + 2 * P;
  const boardHeight = rows * T + (rows - 1) * G + 2 * P;

  // 4) 居中偏移
  const offsetX = Math.floor((availWidth  - boardWidth)  / 2);
  const offsetY = Math.floor((availHeight - boardHeight) / 2);

  // 5) 预生成每个格子的像素矩形（供命中/绘制）
  const slots = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = offsetX + P + c * (T + G);
      const y = offsetY + P + r * (T + G);
      slots.push({ x, y, w: T, h: T, r, c, index: r*cols + c });
    }
  }

  // 6) 木框厚度（仅用于显示）
  const borderWidth = Math.max(6, Math.round(T * 0.2));

  return {
    tileSize: T, 
    gap: G, 
    padding: P,
    borderWidth,
    boardWidth, 
    boardHeight,
    offsetX, 
    offsetY,
    slots,
  };
}

// 根据关卡获取行列数的推荐曲线
export function getGridByLevel(level) {
  if (level >= 1 && level <= 10) {
    return { rows: 5, cols: 8 };    // 8×5
  }
  if (level >= 11 && level <= 20) {
    return { rows: 6, cols: 9 };    // 9×6
  }
  if (level >= 21 && level <= 30) {
    return { rows: 6, cols: 10 };   // 10×6
  }
  if (level >= 31 && level <= 40) {
    return { rows: 7, cols: 11 };   // 11×7
  }
  if (level >= 41 && level <= 50) {
    return { rows: 8, cols: 12 };   // 12×8
  }
  if (level >= 51 && level <= 60) {
    return { rows: 8, cols: 13 };   // 13×8
  }
  if (level >= 61 && level <= 80) {
    return { rows: 9, cols: 14 };   // 14×9
  }
  if (level >= 81 && level <= 120) {
    return { rows: 9, cols: 15 };   // 15×9
  }
  if (level >= 121 && level <= 200) {
    return { rows: 10, cols: 16 };  // 16×10（顶格）
  }
  
  // 200关以后继续使用 16×10
  return { rows: 10, cols: 16 };
}