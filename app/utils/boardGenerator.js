/**
 * Board Generator - 基于有效游戏区域的棋盘生成
 * Purpose: 在固定棋盘背景上生成动态数字方块
 */
import { getTileFillRatio, getNumberDistribution } from './levelGrid';

// 固定棋盘配置 - 与GameBoard组件保持一致
const FIXED_BOARD_CONFIG = {
  GRID_ROWS: 20,
  GRID_COLS: 14,
};

// Deterministic random number generator
function seededRandom(seed) {
  let state = 0;
  for (let i = 0; i < seed.length; i++) {
    state = ((state << 5) - state + seed.charCodeAt(i)) & 0xffffffff;
  }
  
  return function() {
    state = ((state * 1103515245) + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

// 生成数字方块分布
function generateTileDistribution(level, isChallengeMode, random) {
  const { GRID_ROWS, GRID_COLS } = FIXED_BOARD_CONFIG;
  const totalCells = GRID_ROWS * GRID_COLS;
  const tiles = new Array(totalCells).fill(0);
  
  let fillRatio, numberDist;
  
  if (isChallengeMode) {
    // 挑战模式：高密度，需要画大框
    fillRatio = 0.8;
    numberDist = {
      smallNumbers: 0.8,  // 80%小数字(1-3)
      mediumNumbers: 0.2, // 20%中等数字(4-5)
      largeNumbers: 0     // 不使用大数字
    };
  } else {
    // 闯关模式：根据关卡动态调整
    fillRatio = getTileFillRatio(level);
    numberDist = getNumberDistribution(level);
  }
  
  const fillCount = Math.floor(totalCells * fillRatio);
  
  // 生成数字
  for (let i = 0; i < fillCount; i++) {
    const rand = random();
    let value;
    
    if (rand < numberDist.smallNumbers) {
      value = Math.floor(random() * 3) + 1; // 1-3
    } else if (rand < numberDist.smallNumbers + numberDist.mediumNumbers) {
      value = Math.floor(random() * 3) + 4; // 4-6
    } else {
      value = Math.floor(random() * 3) + 7; // 7-9
    }
    
    tiles[i] = value;
  }
  
  // 随机打乱位置
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  
  return tiles;
}

export function generateBoard(level, forceNewSeed = false, isChallengeMode = false) {
  // 使用时间戳或固定种子
  const baseSeed = forceNewSeed ? Date.now() : Math.floor(Date.now() / 60000);
  const seed = `${isChallengeMode ? 'challenge' : 'level'}_${level}_${baseSeed}`;
  const random = seededRandom(seed);
  
  // 生成数字方块分布
  const tiles = generateTileDistribution(level, isChallengeMode, random);
  
  return {
    seed,
    width: FIXED_BOARD_CONFIG.GRID_COLS,
    height: FIXED_BOARD_CONFIG.GRID_ROWS,
    tiles,
    level: isChallengeMode ? 'challenge' : level,
    isChallengeMode,
  };
}