/**
 * GameBoard Component - 使用新的自适应布局系统
 * Purpose: 渲染自适应棋盘，所有布局由BoardLayout统一管理
 * Features: 完全响应式、最小28px方块、棋盘比矩形大一圈
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  PanResponder, 
  StyleSheet,
  Animated,
  PixelRatio,
  UIManager,
  findNodeHandle,
  InteractionManager
} from 'react-native';

const snap = v => PixelRatio.roundToNearestPixel(v);
const measureInWindowAsync = ref =>
  new Promise(r => ref?.current
    ? UIManager.measureInWindow(findNodeHandle(ref.current), (x,y,w,h)=>r({x,y,width:w,height:h}))
    : r(null));

function logDiff(tag, exp, mea, eps = 0.6) {
  if (!exp || !mea) return;
  const dx = +(mea.x - exp.x).toFixed(2);
  const dy = +(mea.y - exp.y).toFixed(2);
  const dw = +(mea.width - exp.width).toFixed(2);
  const dh = +(mea.height - exp.height).toFixed(2);
  const off = Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dw), Math.abs(dh));
  if (off > eps) {
    console.warn(`❗[${tag}] mismatch`, { dx, dy, dw, dh, exp, mea });
  } else {
    console.log(`✅[${tag}] ok`, { dx, dy, dw, dh });
  }
}

// 重试辅助：rAF → runAfterInteractions → setTimeout，最多 N 次
async function retryMeasure(fn, { attempts = 8, delay = 16 } = {}) {
  let last = null;
  for (let i = 0; i < attempts; i++) {
    // 等下一帧
    await new Promise(r => requestAnimationFrame(r));
    // 等交互/动画结束
    await new Promise(r => InteractionManager.runAfterInteractions(r));
    // 兜底 delay（iOS 上 measureInWindow 偶尔需要）
    await new Promise(r => setTimeout(r, delay));
    last = await fn();
    if (last) return last; // 一旦测到就返回
  }
  return last; // 可能是 null，外层再给出原因
}

const sleep = (ms)=> new Promise(r=>setTimeout(r, ms));

async function waitForStableTile(measureFn, {
  maxWaitMs = 4000,      // 最多等 4 秒
  sampleDelayMs = 32,     // 每次采样间隔（约 2 帧）
  stableFrames = 3,       // 连续 N 次几乎不变，判定稳定
  tol = 0.35,             // 容差（像素）
} = {}) {
  const deadline = Date.now() + maxWaitMs;
  let last = null, okStreak = 0;

  while (Date.now() < deadline) {
    // 等待一帧 + 交互/动画队列清空
    await new Promise(r => requestAnimationFrame(r));
    await new Promise(r => InteractionManager.runAfterInteractions(r));
    await sleep(sampleDelayMs);

    const rect = await measureFn();
    if (!rect || rect.width === 0 || rect.height === 0) {
      // 还没渲染好，继续等
      continue;
    }
    if (last) {
      const dx = Math.abs(rect.x - last.x);
      const dy = Math.abs(rect.y - last.y);
      const dw = Math.abs(rect.width  - last.width);
      const dh = Math.abs(rect.height - last.height);
      const moving = dx > tol || dy > tol || dw > tol || dh > tol;
      if (!moving) okStreak++; else okStreak = 0;
      if (okStreak >= stableFrames) {
        return rect; // 稳定，返回
      }
    }
    last = rect;
  }
  return last; // 超时就返回最后一次（并在日志里标注"未稳定"）
}
import * as Haptics from 'expo-haptics';
import { hasValidCombinations } from '../utils/gameLogic';
import RescueModal from './RescueModal';

// 仅开发环境开启
const __LOG_TILE_OFFSET__ = __DEV__;
const __fx = n => (Math.round(n * 100) / 100).toFixed(2);

// 生成 onLayout 回调，不改布局、不改样式
const __mkTileLayoutLogger = (id, row, col, exp) => e => {
  if (!__LOG_TILE_OFFSET__) return;
  const { x, y, width, height } = e.nativeEvent.layout; // 实渲染(相对父容器)
  const cx = x + width / 2, cy = y + height / 2;        // 实际中心
  const ex = exp.x + exp.width / 2, ey = exp.y + exp.height / 2; // 期望中心
  const dx = cx - ex, dy = cy - ey;                     // 偏移
  console.log(`Tile#${id} (r${row},c${col})  Δx=${dx>=0?'+':''}${__fx(dx)}  Δy=${dy>=0?'+':''}${__fx(dy)}`);
};

const GameBoard = ({ 
  tiles, 
  width, 
  height, 
  onTilesClear, 
  disabled, 
  itemMode, 
  onTileClick,
  selectedSwapTile,
  swapAnimations,
  fractalAnimations,
  settings,
  isChallenge,
  reshuffleCount,
  setReshuffleCount,
  onRescueNeeded,
  layoutConfig, // 新增：布局配置
}) => {
  const DEBUG = true;

  // 父容器 ref
  const boardRef = useRef(null);

  // 每个 tile 的 ref + onLayout 计数
  const tileRefs = useRef(new Map());
  const tileLaidOut = useRef(new Set());  // 记录哪些 id 已触发 onLayout
  const [allTilesLaidOut, setAllTilesLaidOut] = useState(false);

  const getTileRef = id => {
    let r = tileRefs.current.get(id);
    if (!r) tileRefs.current.set(id, r = React.createRef());
    return r;
  };

  const onTileLayout = (id) => {
    if (tileLaidOut.current.has(id)) return; // 只计一次
    tileLaidOut.current.add(id);
    if (tileLaidOut.current.size === tiles.length) {
      setAllTilesLaidOut(true);
    }
  };

  // —— 带重试的测量函数
  const measureAllOnce = async () => {
    const boardBox = await retryMeasure(() => measureInWindowAsync(boardRef));
    const measured = new Map();
    for (const t of tiles) {
      const m = await retryMeasure(() => measureInWindowAsync(tileRefs.current.get(t.id)));
      if (m) measured.set(t.id, m);
    }
    return { boardBox, measured };
  };

  // —— 诊断主流程（几乎不变，但不再"首块未测到"）
  const runDiagnostics = async (reason = 'onLayout') => {
    if (!DEBUG) return 0;
    console.log(`🧪 DIAG start (${reason})`);

    const { boardBox, measured } = await measureAllOnce();

    if (!tiles.length) {
      console.warn('⚠️ 无 tiles，跳过对比');
      console.log('🧪 DIAG end\n');
      return 0;
    }

    const p00 = layoutConfig.getTilePosition(0, 0);
    const stepX = width  > 1 ? layoutConfig.getTilePosition(0,1).x - p00.x : 0;
    const stepY = height > 1 ? layoutConfig.getTilePosition(1,0).y - p00.y : 0;

    console.table({
      boardBox: boardBox ? `(${boardBox.x.toFixed(1)},${boardBox.y.toFixed(1)}, ${boardBox.width}×${boardBox.height})` : 'null',
      p00: `(${p00.x},${p00.y}) ${p00.width}×${p00.height}`,
      stepX: stepX.toFixed(2),
      stepY: stepY.toFixed(2),
      tilesCount: tiles.length,
    });

    // 若仍测不到首块，给出明确原因提示
    const first = tiles[0];
    const exp0  = layoutConfig.getTilePosition(first.row, first.col);
    const mea0  = measured.get(first.id);
    if (!mea0) {
      console.warn('❗ 首块仍未测到：可能原因 = (1) 父容器/首块带 transform 且动画未结束 (2) 该 tile 暂未渲染 (3) 该 tile 在 ScrollView/FlatList 视窗外 (4) 该视图被 pointerEvents=none 拦截或透明度动画中');
      console.log('🧪 DIAG end\n');
      return 0;
    }

    // 推断父容器偏移，把期望(容器) → 期望(屏幕)
    const offsetX = mea0.x - exp0.x;
    const offsetY = mea0.y - exp0.y;
    console.log('📐 inferred container offset', { offsetX:+offsetX.toFixed(2), offsetY:+offsetY.toFixed(2) });

    let mismatches = 0;
    tiles.forEach(t => {
      const exp = layoutConfig.getTilePosition(t.row, t.col);
      const mea = measured.get(t.id);
      if (!exp || !mea) return;
      
      const dx = +(mea.x - (exp.x + offsetX)).toFixed(2);
      const dy = +(mea.y - (exp.y + offsetY)).toFixed(2);
      const dw = +(mea.width - exp.width).toFixed(2);
      const dh = +(mea.height - exp.height).toFixed(2);
      const off = Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dw), Math.abs(dh));
      
      if (off > 0.6) {
        mismatches++;
        console.warn(`❗[tile#${t.id} (${t.row},${t.col})] mismatch`, { dx, dy, dw, dh, exp, mea });
      } else {
        console.log(`✅[tile#${t.id} (${t.row},${t.col})] ok`, { dx, dy, dw, dh });
      }
    });

    console.log(`🧪 DIAG end (${reason}) mismatches=${mismatches}\n`);
    return mismatches;
  };

  // —— 稳定后诊断：等动画停稳再测
  async function runDiagnosticsWhenStable(reason='afterStable') {
    console.log(`🧪 DIAG(STABLE) wait -> ${reason}`);

    // 选一个"可见"的基准 tile（避免 tiles[0] 在屏外/为空）
    let baseTile = null;
    for (const t of tiles) { baseTile = t; break; }
    if (!baseTile) { console.warn('⚠️ 无 tiles'); return; }

    const baseRef = tileRefs.current.get(baseTile.id);
    if (!baseRef?.current) { console.warn('⚠️ 基准 tile ref 不可用'); return; }

    const measureBase = () => measureInWindowAsync(baseRef);

    const rect = await waitForStableTile(measureBase, { maxWaitMs: 5000 });
    if (!rect) {
      console.warn('❗ 基准 tile 始终测不到（5s 超时）。极可能在动画/未渲染/屏外。');
      return;
    }

    // 如果最后一次仍然在动（waitForStableTile 会返回 last），这里提示一下
    console.log('📏 基准 tile（稳定或超时）:', rect);

    // 稳定后再调用你已有的 runDiagnostics（它里头会遍历所有 tile 并输出 ok/mismatch）
    const mm = await runDiagnostics(reason);
    if (mm === 0) {
      console.log('✅ STABLE 后无偏移 → 高概率是动画/transform 未停造成的假偏移。');
    } else {
      console.warn('❗ STABLE 后仍有偏移 → 真正的坐标/步长问题，继续查 step/gap/父容器原点。');
    }
  }

  // 1) 父容器 onLayout 触发一次
  const onBoardLayout = () => {
    runDiagnostics('board.onLayout');         // 立即打一版
    runDiagnosticsWhenStable('board.stable'); // 动画稳定后再打一版
  };

  // 2) 等到"所有 tile 至少 onLayout 一次"后再跑一遍（实战最稳）
  useEffect(() => {
    if (DEBUG && allTilesLaidOut) {
      runDiagnostics('tiles.onLayout(all)');
      // 重置，避免无限触发（如果 tiles 会变动，可按需保留/重置）
      // setAllTilesLaidOut(false);
    }
  }, [DEBUG, allTilesLaidOut]);
  const [selection, setSelection] = useState(null);
  const [hoveredTiles, setHoveredTiles] = useState(new Set());
  const [explosionAnimation, setExplosionAnimation] = useState(null);
  
  const selectionOpacity = useRef(new Animated.Value(0)).current;
  const explosionScale = useRef(new Animated.Value(0)).current;
  const explosionOpacity = useRef(new Animated.Value(0)).current;
  const tileScales = useRef(new Map()).current;

  // 如果没有布局配置，显示加载状态
  if (!layoutConfig) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading board...</Text>
      </View>
    );
  }

  const initTileScale = (index) => {
    if (!tileScales.has(index)) {
      tileScales.set(index, new Animated.Value(1));
    }
    return tileScales.get(index);
  };

  const scaleTile = (index, scale) => {
    const tileScale = initTileScale(index);
    Animated.timing(tileScale, {
      toValue: scale,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const getTileRotation = (row, col) => {
    const seed = row * 31 + col * 17;
    return ((seed % 7) - 3) * 0.8;
  };

  const resetSelection = () => {
    setSelection(null);
    hoveredTiles.forEach(index => {
      // 直接调用父组件的清除回调，不做任何额外处理
      if (onTilesClear) {
        onTilesClear(clearedPositions);
      }
    });
    setHoveredTiles(new Set());
    
    Animated.timing(selectionOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const isInsideBoard = (pageX, pageY) => {
    const { boardLeft, boardTop, boardWidth, boardHeight } = layoutConfig;
    
    return pageX >= boardLeft && 
           pageX <= boardLeft + boardWidth && 
           pageY >= boardTop && 
           pageY <= boardTop + boardHeight;
  };

  const getSelectedTiles = () => {
    if (!selection) return [];
    return getSelectedTilesForSelection(selection);
  };

  const getSelectedTilesForSelection = (sel) => {
    if (!sel) return [];
    
    const { startRow, startCol, endRow, endCol } = sel;
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);
    
    const selectedTiles = [];
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        if (row >= 0 && row < height && col >= 0 && col < width) {
          const index = row * width + col;
          const value = tiles[index];
          if (value > 0) {
            selectedTiles.push({ row, col, value, index });
          }
        }
      }
    }
    return selectedTiles;
  };

  const handleSelectionComplete = async () => {
    if (!selection) return;

    const selectedTiles = getSelectedTiles();
    const sum = selectedTiles.reduce((acc, tile) => acc + tile.value, 0);
    const tilePositions = selectedTiles.map(tile => ({ row: tile.row, col: tile.col }));

    if (sum === 10 && selectedTiles.length > 0) {
      // Success - create explosion effect with yellow "10" note
      if (settings?.hapticsEnabled !== false) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      // Calculate explosion center position
      const { startRow, startCol, endRow, endCol } = selection;
      const centerRow = (startRow + endRow) / 2;
      const centerCol = (startCol + endCol) / 2;

      const centerTilePos = layoutConfig.getTilePosition(Math.floor(centerRow), Math.floor(centerCol));
      if (centerTilePos) {
        const explosionX = centerTilePos.x + centerTilePos.width / 2;
        const explosionY = centerTilePos.y + centerTilePos.height / 2;
        
        setExplosionAnimation({ x: explosionX, y: explosionY });
        
        // Explosion animation - yellow "10" note
        explosionScale.setValue(0.5);
        explosionOpacity.setValue(1);
        
        Animated.parallel([
          Animated.timing(explosionScale, {
            toValue: 2.0,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(explosionOpacity, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setExplosionAnimation(null);
        });
      }

      // Selection box animation - bright green glow
      Animated.sequence([
        Animated.timing(selectionOpacity, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(selectionOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: false,
        }),
      ]).start(() => {
        setSelection(null);
        onTilesClear(tilePositions);
      });

    } else if (selectedTiles.length > 0) {
      // Failure - blue feedback with short vibration
      if (settings?.hapticsEnabled !== false) {
        Haptics.selectionAsync();
      }
      
      Animated.sequence([
        Animated.timing(selectionOpacity, {
          toValue: 0.4,
          duration: 150,
          useNativeDriver: false,
        }),
        Animated.timing(selectionOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start(() => {
        setSelection(null);
      });
    } else {
      setSelection(null);
    }
  }

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: (evt) => {
      if (itemMode) return false;
      const { pageX, pageY } = evt.nativeEvent;
      return !disabled && isInsideBoard(pageX, pageY);
    },
    onMoveShouldSetPanResponder: (evt) => {
      if (itemMode) return false;
      const { pageX, pageY } = evt.nativeEvent;
      return !disabled && isInsideBoard(pageX, pageY);
    },

    onPanResponderGrant: (evt) => {
      const { pageX, pageY } = evt.nativeEvent;
      
      if (!isInsideBoard(pageX, pageY)) return;
      
      const { boardLeft, boardTop, boardPadding, tileSize, tileGap, woodFrameWidth } = layoutConfig;

      const contentLeft = boardLeft + woodFrameWidth + boardPadding;
      const contentTop = boardTop + woodFrameWidth + boardPadding;

      const relativeX = pageX - contentLeft;
      const relativeY = pageY - contentTop;

      const cellWidth = tileSize + tileGap;
      const cellHeight = tileSize + tileGap;

      const startCol = Math.floor(relativeX / cellWidth);
      const startRow = Math.floor(relativeY / cellHeight);
      
      if (startRow >= 0 && startRow < height && startCol >= 0 && startCol < width) {
        setSelection({
          startRow,
          startCol,
          endRow: startRow,
          endCol: startCol,
        });
        
        Animated.timing(selectionOpacity, {
          toValue: 0.6,
          duration: 80,
          useNativeDriver: false,
        }).start();
      }
    },

    onPanResponderMove: (evt) => {
      if (!selection) return;
      
      const { pageX, pageY } = evt.nativeEvent;
      const { boardLeft, boardTop, boardPadding, tileSize, tileGap, woodFrameWidth } = layoutConfig;

      const contentLeft = boardLeft + woodFrameWidth + boardPadding;
      const contentTop = boardTop + woodFrameWidth + boardPadding;

      const relativeX = pageX - contentLeft;
      const relativeY = pageY - contentTop;

      const cellWidth = tileSize + tileGap;
      const cellHeight = tileSize + tileGap;

      const endCol = Math.floor(relativeX / cellWidth);
      const endRow = Math.floor(relativeY / cellHeight);
      
      if (endRow >= 0 && endRow < height && endCol >= 0 && endCol < width) {
        setSelection(prev => ({
          ...prev,
          endRow,
          endCol,
        }));
        
        // Get current selected tiles for this selection
        const currentSelectedTiles = getSelectedTilesForSelection({
          startRow: selection.startRow,
          startCol: selection.startCol,
          endRow,
          endCol,
        });
        
        // Create set of currently hovered tile indices
        const newHoveredSet = new Set(currentSelectedTiles.map(tile => tile.index));
        
        // Scale up selected tiles (sum = 10) or normal scale (sum ≠ 10)
        const sum = currentSelectedTiles.reduce((acc, tile) => acc + tile.value, 0);
        const targetScale = sum === 10 ? 1.1 : 1.05;
        
        currentSelectedTiles.forEach(tile => {
          if (!hoveredTiles.has(tile.index)) {
            scaleTile(tile.index, targetScale);
          }
        });
        
        hoveredTiles.forEach(index => {
          if (!newHoveredSet.has(index)) {
            scaleTile(index, 1);
          }
        });
        
        setHoveredTiles(newHoveredSet);
      }
    },

    onPanResponderRelease: () => {
      if (selection && !disabled) {
        handleSelectionComplete();
      }
      
      hoveredTiles.forEach(index => {
        scaleTile(index, 1);
      });
      setHoveredTiles(new Set());
      
      Animated.timing(selectionOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start(() => {
        setSelection(null);
      });
    },
    
    onPanResponderTerminationRequest: () => true,
    onPanResponderReject: () => {
      resetSelection();
    },
  });

  // Handle tile click in item mode
  const handleTilePress = (row, col, value) => {
    
    if (!itemMode || disabled) return;
    
    if (onTileClick) {
      onTileClick(row, col, value);
    } else {
    }
    
    if (settings?.hapticsEnabled !== false) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const getSelectionStyle = () => {
    if (!selection) return null;
    
    const { startRow, startCol, endRow, endCol } = selection;
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);
    
    const selectedTiles = getSelectedTiles();
    const sum = selectedTiles.reduce((acc, tile) => acc + tile.value, 0);
    const isSuccess = sum === 10;
    
    const { tileSize, tileGap } = layoutConfig;
    const cellWidth = tileSize + tileGap;
    const cellHeight = tileSize + tileGap;

    const left = minCol * cellWidth;
    const top = minRow * cellHeight;
    const selectionWidth = (maxCol - minCol + 1) * cellWidth - tileGap;
    const selectionHeight = (maxRow - minRow + 1) * cellHeight - tileGap;
    
    return {
      position: 'absolute',
      left,
      top,
      width: selectionWidth,
      height: selectionHeight,
      backgroundColor: isSuccess ? 'rgba(24, 197, 110, 0.3)' : 'rgba(33, 150, 243, 0.2)',
      opacity: selectionOpacity,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: isSuccess ? '#18C56E' : '#2F80ED',
      shadowColor: isSuccess ? '#18C56E' : '#2F80ED',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: isSuccess ? 0.6 : 0.3,
      shadowRadius: isSuccess ? 8 : 4,
      elevation: isSuccess ? 8 : 4,
    };
  };

  const getSelectionSum = () => {
    if (!selection) return null;
    
    const selectedTiles = getSelectedTiles();
    const sum = selectedTiles.reduce((acc, tile) => acc + tile.value, 0);
    
    if (selectedTiles.length === 0) return null;
    
    const { startRow, startCol, endRow, endCol } = selection;
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);
    
    // 计算选择框的中心位置
    const centerRow = (minRow + maxRow) / 2;
    const centerCol = (minCol + maxCol) / 2;
    
    const { tileSize, tileGap } = layoutConfig;
    const cellWidth = tileSize + tileGap;
    const cellHeight = tileSize + tileGap;

    // 计算中心位置的坐标
    const centerX = centerCol * cellWidth + tileSize / 2;
    const centerY = centerRow * cellHeight + tileSize / 2;
    
    return {
      sum,
      isSuccess: sum === 10,
      style: {
        position: 'absolute',
        left: centerX - 25,
        top: centerY - 20,
        width: 50,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: sum === 10 ? '#FFEB3B' : '#2196F3',
        borderRadius: 8,
        borderWidth: 2,
        borderColor: sum === 10 ? '#F57F17' : '#1976D2',
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 6,
        transform: [{ rotate: '0deg' }],
      }
    };
  };

  const renderTile = (value, row, col) => {
    const index = row * width + col;
    
    // 只有非零值才显示数字方块，值为0时不显示任何内容
    if (value === 0) {
      return null; // 空位不渲染任何内容
    }

    const tilePos = layoutConfig.getTilePosition(row, col);
    if (!tilePos) return null;

    const tileScale = initTileScale(index);
    const rotation = getTileRotation(row, col);
    
    // Get swap and fractal animations
    const swapAnim = swapAnimations ? swapAnimations.get(index) : null;
    const fractalAnim = fractalAnimations ? fractalAnimations.get(index) : null;
    
    // Check if this tile is in the current selection
    const isInSelection = hoveredTiles.has(index);
    
    const transforms = [
      { scale: tileScale },
      { rotate: `${rotation}deg` }
    ];
    
    if (swapAnim && swapAnim.translateX && swapAnim.translateY) {
      transforms.push({
        translateX: swapAnim.translateX,
      });
      transforms.push({
        translateY: swapAnim.translateY,
      });
    }
    
    if (fractalAnim && fractalAnim.scale) {
      transforms.push({
        scale: fractalAnim.scale,
      });
    }
    
    const isSelected = selectedSwapTile && selectedSwapTile.index === index;
    
    let tileStyle = styles.tileInner;
    
    if (isSelected && itemMode) {
      if (itemMode === 'swapMaster') {
        tileStyle = [styles.tileInner, styles.tileSwapSelected];
      } else if (itemMode === 'fractalSplit') {
        tileStyle = [styles.tileInner, styles.tileFractalSelected];
      }
    }

    let opacity = 1;
    if (fractalAnim && fractalAnim.opacity) {
      opacity = fractalAnim.opacity;
    }

    const handleTileTouch = itemMode ? () => handleTilePress(row, col, value) : undefined;
    
    return (
      <View
        ref={getTileRef(`${row}-${col}`)}
        onLayout={(e) => {
          onTileLayout(`${row}-${col}`);
          __mkTileLayoutLogger(`${row}-${col}`, row, col, tilePos)(e);
        }}
        key={`${row}-${col}`}
        style={{
          position: 'absolute',
          left: tilePos.x,
          top: tilePos.y,
          width: tilePos.width,
          height: tilePos.height,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onStartShouldSetResponder={itemMode ? () => true : () => false}
        onResponderGrant={itemMode ? () => handleTilePress(row, col, value) : undefined}
        pointerEvents={itemMode ? "auto" : "box-none"}
      >
        <Animated.View
          style={[
            tileStyle,
            {
              width: '100%',
              height: '100%',
              transform: transforms,
              opacity: opacity,
            }
          ]}
        >
          <Text style={[
            styles.tileText,
            { 
              fontSize: Math.max(12, tilePos.width * 0.5),
              fontWeight: isInSelection ? 'bold' : 'normal',
            }
          ]}>
            {value}
          </Text>
        </Animated.View>
      </View>
    );
  };

  const selectionStyle = getSelectionStyle();
  const selectionSum = getSelectionSum();

  return (
    <View style={styles.fullScreenContainer} pointerEvents="box-none">
      <View style={styles.container}>
        <View 
          style={[
            styles.chalkboard,
            {
              position: 'absolute',
              left: layoutConfig.boardLeft,
              top: layoutConfig.boardTop,
              width: layoutConfig.boardWidth,
              height: layoutConfig.boardHeight,
            }
          ]}
          pointerEvents="auto"
        >
          {/* 数字方块内容区 */}
          <View
            {...panResponder.panHandlers}
            style={{
              position: 'absolute',
              left: layoutConfig.woodFrameWidth + layoutConfig.boardPadding,
              top: layoutConfig.woodFrameWidth + layoutConfig.boardPadding,
              width: layoutConfig.contentWidth - layoutConfig.boardPadding * 2,
              height: layoutConfig.contentHeight - layoutConfig.boardPadding * 2,
            }}
            pointerEvents={itemMode ? "auto" : "auto"}
          >
            {/* 🎯 数字方块容器 - 使用统一中心点精确定位 */}
            <View
              ref={boardRef}
              onLayout={onBoardLayout}
              style={{
                width: '100%',
                height: '100%',
                position: 'relative',
              }}
            >
            {/* ===== 计算与方块区域一致的"线容器"矩形 ===== */}
            {(() => {
              const p00 = layoutConfig.getTilePosition(0, 0); // 第一块
              const tileW = p00.width;
              const tileH = p00.height;

              // 如果只有一列/一行，用已知尺寸近似求步长
              const p01 = width  > 1 ? layoutConfig.getTilePosition(0, 1) : { x: p00.x + (layoutConfig.tileGap ?? tileW), y: p00.y };
              const p10 = height > 1 ? layoutConfig.getTilePosition(1, 0) : { x: p00.x, y: p00.y + (layoutConfig.tileGap ?? tileH) };

              const stepX = p01.x - p00.x;                       // = tileSize + gap
              const stepY = p10.y - p00.y;

              const gapX = layoutConfig.tileGap ?? (stepX - tileW);
              const gapY = layoutConfig.tileGap ?? (stepY - tileH);

              // 方块区域的左、上、右、下（不含外圈半个gap）
              const startX = p00.x;
              const startY = p00.y;
              const endX   = layoutConfig.getTilePosition(0, Math.max(0, width - 1)).x  + tileW;
              const endY   = layoutConfig.getTilePosition(Math.max(0, height - 1), 0).y + tileH;

              // "线容器"= 方块区域向四周各扩展半个gap，正好覆盖所有单元边界线
              const gridLeft   = Math.round(startX - gapX / 2);
              const gridTop    = Math.round(startY - gapY / 2);
              const gridWidth  = Math.round((endX - startX) + gapX);
              const gridHeight = Math.round((endY - startY) + gapY);

              return (
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: gridLeft,
                    top: gridTop,
                    width: gridWidth,
                    height: gridHeight,
                    // 如果需要跟绿板圆角一致，可加 borderRadius，但不影响对齐
                  }}
                >
                  {/* 垂直线：i = 0..width，线在容器坐标 i*stepX 处 */}
                  {Array.from({ length: width + 1 }, (_, i) => (
                    <View
                      key={`v-${i}`}
                      style={{
                        position: 'absolute',
                        left: Math.round(i * stepX),
                        top: 0,
                        width: StyleSheet.hairlineWidth,
                        height: '100%',
                        backgroundColor: 'rgba(255,255,255,0.3)',
                        borderStyle: 'dashed',
                        borderWidth: 0,
                        borderLeftWidth: StyleSheet.hairlineWidth,
                        borderLeftColor: 'rgba(255, 255, 255, 0.3)',
                      }}
                    />
                  ))}

                  {/* 水平线：j = 0..height，线在容器坐标 j*stepY 处 */}
                  {Array.from({ length: height + 1 }, (_, j) => (
                    <View
                      key={`h-${j}`}
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: Math.round(j * stepY),
                        width: '100%',
                        height: StyleSheet.hairlineWidth,
                        backgroundColor: 'rgba(255,255,255,0.3)',
                        borderStyle: 'dashed',
                        borderWidth: 0,
                        borderTopWidth: StyleSheet.hairlineWidth,
                        borderTopColor: 'rgba(255, 255, 255, 0.3)',
                      }}
                    />
                  ))}
                </View>
              );
            })()}
            
            {/* 渲染所有方块 */}
            {tiles.map((value, index) => {
              const row = Math.floor(index / width);
              const col = index % width;
              return renderTile(value, row, col);
            })}
            
            {/* Selection overlay */}
            {selectionStyle && (
              <Animated.View style={selectionStyle} />
            )}
            
            {/* Selection sum display */}
            {selectionSum && (
              <View style={selectionSum.style}>
                <Text style={[
                  styles.sumText,
                  { color: '#000' }
                ]}>
                  {selectionSum.sum}
                </Text>
              </View>
            )}
            
            {/* Explosion effect */}
            {explosionAnimation && (
              <Animated.View
                style={[
                  styles.explosion,
                  {
                    left: explosionAnimation.x - 40,
                    top: explosionAnimation.y - 30,
                    transform: [{ scale: explosionScale }],
                    opacity: explosionOpacity,
                  }
                ]}
              >
                <View style={styles.explosionNote}>
                  <Text style={styles.explosionText}>10</Text>
                </View>
              </Animated.View>
            )}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  chalkboard: {
    backgroundColor: '#2D6B4A', // 比原来更淡的绿色
    borderRadius: 16,
    borderWidth: 8,
    borderColor: '#8B5A2B', // 调整为参考图中的木质颜色
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8, // 增加阴影高度
    },
    shadowOpacity: 0.5, // 增加阴影透明度
    shadowRadius: 12, // 增加阴影半径
    elevation: 12, // 增加Android阴影
  },
  tileInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF9E6', // Cream white sticky note
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: {
      width: 0.5,
      height: 0.5,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  tileSwapSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  tileFractalSelected: {
    backgroundColor: '#F3E5F5',
    borderColor: '#9C27B0',
  },
  tileText: {
    fontWeight: 'normal',
    color: '#111',
    textAlign: 'center',
  },
  sumText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  explosion: {
    position: 'absolute',
    width: 80,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  explosionNote: {
    width: 80,
    height: 60,
    backgroundColor: '#FFEB3B', // Yellow sticky note
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#F57F17',
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  explosionText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
});

export default GameBoard;