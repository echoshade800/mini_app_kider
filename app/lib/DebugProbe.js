// DebugProbe.js —— 诊断坐标偏差的工具
import { UIManager, findNodeHandle, PixelRatio } from 'react-native';

const R = (v) => PixelRatio.roundToNearestPixel(v);

/**
 * 测量某个 ref 的屏幕位置与尺寸
 * @param {React.RefObject} ref
 * @returns {Promise<{x:number,y:number,width:number,height:number}>}
 */
export function measureInWindowAsync(ref) {
  return new Promise((resolve, reject) => {
    const node = findNodeHandle(ref.current);
    if (!node) return reject(new Error('measure ref missing'));
    UIManager.measureInWindow(node, (x, y, width, height) => {
      resolve({ x: R(x), y: R(y), width: R(width), height: R(height) });
    });
  });
}

/**
 * 生成一次诊断报告
 * @param {Object} p
 * @param {{ // 期望值（计算出来的）
 *   boardLayout: {x:number,y:number,width:number,height:number}, // onLayout
 *   boardInner:  {left:number,top:number,width:number,height:number},
 *   startX:number,startY:number,tile:number,gap:number,cols:number,rows:number,
 *   sampleTile:  {left:number,top:number,size:number},
 * }} p.expected
 * @param {{ // 实测值（measureInWindow）
 *   boardWin: {x:number,y:number,width:number,height:number},
 *   sampleWin:{x:number,y:number,width:number,height:number},
 * }} p.actual
 * @param {{top:number,bottom:number,left:number,right:number}} p.insets // SafeAreaInsets（可选）
 * @returns {{ originDx:number, originDy:number, scaleX:number, scaleY:number, overflowX:number, overflowY:number }}
 */
export function makeDiagnosis({ expected, actual, insets = {} }) {
  const {
    boardLayout, boardInner, startX, startY, tile, gap, cols, rows, sampleTile,
  } = expected;
  const { boardWin, sampleWin } = actual;

  // 估算"原点"（父容器左上）在窗口坐标的偏移（理论值 vs 实测值）
  // 这里借用我们认为的 'startX/startY' 与 sampleTile 的 expected，倒推出父容器相对窗口的原点
  const expSampleWinX = sampleTile.left; // 我们计算用的是窗口系吗？——如果你渲染用的是绝对定位相对父容器，需要加上父容器在窗口中的左上
  const expSampleWinY = sampleTile.top;

  // 偏移 = 实测 - 期望
  const originDx = sampleWin.x - expSampleWinX;
  const originDy = sampleWin.y - expSampleWinY;

  // 缩放：比较棋盘宽高比（实测/期望）
  const scaleX = boardWin.width  / Math.max(1, boardLayout.width);
  const scaleY = boardWin.height / Math.max(1, boardLayout.height);

  // 越界/剩余空间：我们算出来的 grid 占用 vs inner
  const gridW = cols * tile + (cols - 1) * gap;
  const gridH = rows * tile + (rows - 1) * gap;
  const overflowX = gridW - boardInner.width;
  const overflowY = gridH - boardInner.height;

  // 统一输出日志
  // eslint-disable-next-line no-console
  console.table({
    '— EXPECTED —': { v: '' },
    boardLayout: { v: JSON.stringify(boardLayout) },
    boardInner:  { v: JSON.stringify(boardInner) },
    start:       { v: `(${startX}, ${startY})` },
    tile_gap_rc: { v: `tile=${tile}, gap=${gap}, ${rows}x${cols}` },
    sampleTile:  { v: JSON.stringify(sampleTile) },

    '— ACTUAL —': { v: '' },
    boardWin:    { v: JSON.stringify(boardWin) },
    sampleWin:   { v: JSON.stringify(sampleWin) },

    '— DIAG —': { v: '' },
    originDx:    { v: originDx.toFixed(2) },
    originDy:    { v: originDy.toFixed(2) },
    scaleX:      { v: scaleX.toFixed(4) },
    scaleY:      { v: scaleY.toFixed(4) },
    overflowX:   { v: overflowX.toFixed(2) },
    overflowY:   { v: overflowY.toFixed(2) },

    'safeInsets':{ v: JSON.stringify(insets) },
  });

  return { originDx, originDy, scaleX, scaleY, overflowX, overflowY };
}