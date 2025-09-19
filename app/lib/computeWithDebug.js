// computeWithDebug.js —— 在你现有 computeLayout 外包一层：打日志 + 可选自动修正
import { PixelRatio } from 'react-native';
import { measureInWindowAsync, makeDiagnosis } from './DebugProbe';

const R = (v) => PixelRatio.roundToNearestPixel(v);

/**
 * @param {Object} args —— 你的 computeLayout 的入参 + 额外字段
 * @param {React.RefObject} args.boardRef  // 棋盘容器 ref（用于 measureInWindow）
 * @param {React.RefObject} args.sampleRef // 任意一个已渲染 tile 的 ref（用于 measureInWindow）
 * @param {Object} args.safeInsets         // useSafeAreaInsets() 结果（可选）
 * @param {boolean} args.autoOriginFix     // 自动加原点修正量，便于继续验证
 * @param {Function} args.computeLayout    // 你原来的 computeLayout
 * @returns {Promise<{ layout, originOffset }>} layout = 原 computeLayout 结果；originOffset 用来给所有 tile 追加 left/top
 */
export async function computeWithDebug(args) {
  const {
    boardRef, sampleRef, safeInsets, autoOriginFix = false, computeLayout, ...rest
  } = args;

  // 1) 先计算（期望值）
  const layout = computeLayout(rest);

  // 2) 实测（棋盘与样本 tile）
  let boardWin = null;
  let sampleWin = null;
  try {
    boardWin  = await measureInWindowAsync(boardRef);
    sampleWin = await measureInWindowAsync(sampleRef);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('measureInWindow failed:', e?.message);
  }

  if (boardWin && sampleWin) {
    const diag = makeDiagnosis({
      expected: {
        boardLayout: {
          x: R(rest.board.left), y: R(rest.board.top),
          width: R(rest.board.width), height: R(rest.board.height),
        },
        boardInner: layout.inner,
        startX: layout.startX, startY: layout.startY,
        tile: layout.tile, gap: layout.gap,
        rows: rest.rows, cols: rest.cols,
        sampleTile: layout.tiles[0], // 用第一个 tile 当样本
      },
      actual: { boardWin, sampleWin },
      insets: safeInsets || {},
    });

    // 3) 自动修正（仅调试用）：如果看到是稳定的整体偏移，就把修正量加到所有 tile 上
    const originOffset = (autoOriginFix)
      ? { dx: -diag.originDx, dy: -diag.originDy }
      : { dx: 0, dy: 0 };

    return { layout, originOffset };
  }

  return { layout, originOffset: { dx: 0, dy: 0 } };
}