/**
 * Board Generator - Deterministic puzzle board creation
 * Purpose: Generate solvable number puzzles with appropriate difficulty scaling
 * Features: Fixed board size per level, guaranteed solvability, line selection support
 */
import { getGridByLevel, getLevelLayout } from '../utils/levelGrid';

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

// 闯关模式：使用新的关卡增长规则
function getBoardDimensions(level, screenWidth = 390, screenHeight = 844) {
  // 使用新的关卡增长规则
  const { rows, cols } = getGridByLevel(level);
  return { width: cols, height: rows };
}

// 固定棋盘配置 - 与GameBoard组件保持一致
const FIXED_BOARD_CONFIG = {
  GRID_ROWS: 20,
  GRID_COLS: 14,
};

// 检查两个位置是否可以形成有效的矩形选择（包括线条）
function canFormRectangle(pos1, pos2, width, height) {
  const row1 = Math.floor(pos1 / width);
  const col1 = pos1 % width;
  const row2 = Math.floor(pos2 / width);
  const col2 = pos2 % width;
  
  // 必须在同一行或同一列，或者形成矩形
  return (row1 === row2) || (col1 === col2) || 
         (Math.abs(row1 - row2) >= 1 && Math.abs(col1 - col2) >= 1);
}

// 获取矩形内的所有位置（包括线条选择）
function getRectanglePositions(pos1, pos2, width, height) {
  const row1 = Math.floor(pos1 / width);
  const col1 = pos1 % width;
  const row2 = Math.floor(pos2 / width);
  const col2 = pos2 % width;
  
  const minRow = Math.min(row1, row2);
  const maxRow = Math.max(row1, row2);
  const minCol = Math.min(col1, col2);
  const maxCol = Math.max(col1, col2);
  
  const positions = [];
  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      positions.push(row * width + col);
    }
  }
  
  return positions;
}

// 检查棋盘是否可解（所有数字都能通过矩形选择消除）
function isBoardSolvable(tiles, width, height) {
  const workingTiles = [...tiles];
  const size = width * height;
  let maxIterations = 100; // 防止无限循环
  
  while (maxIterations > 0) {
    let foundSolution = false;
    
    // 尝试找到一个可以消除的矩形
    for (let pos1 = 0; pos1 < size && !foundSolution; pos1++) {
      if (workingTiles[pos1] === 0) continue;
      
      for (let pos2 = pos1; pos2 < size && !foundSolution; pos2++) {
        if (workingTiles[pos2] === 0) continue;
        
        if (canFormRectangle(pos1, pos2, width, height)) {
          const positions = getRectanglePositions(pos1, pos2, width, height);
          const sum = positions.reduce((acc, pos) => acc + workingTiles[pos], 0);
          
          if (sum === 10) {
            // 找到可消除的矩形，清除这些位置
            positions.forEach(pos => workingTiles[pos] = 0);
            foundSolution = true;
          }
        }
      }
    }
    
    if (!foundSolution) {
      // 检查是否还有剩余数字
      const hasRemainingNumbers = workingTiles.some(tile => tile > 0);
      return !hasRemainingNumbers; // 如果没有剩余数字，则可解
    }
    
    maxIterations--;
  }
  
  return false; // 超过最大迭代次数，认为不可解
}

// 确保棋盘总和为10的倍数
function ensureSumIsMultipleOf10(tiles) {
  const nonZeroTiles = tiles.filter(tile => tile > 0);
  const currentSum = nonZeroTiles.reduce((acc, tile) => acc + tile, 0);
  const remainder = currentSum % 10;
  
  if (remainder === 0) {
    return tiles; // 已经是10的倍数，无需调整
  }
  
  const adjustment = 10 - remainder;
  const newTiles = [...tiles];
  
  // 找到第一个非零数字进行调整
  for (let i = 0; i < newTiles.length; i++) {
    if (newTiles[i] > 0) {
      // 尝试调整这个数字
      const newValue = newTiles[i] + adjustment;
      if (newValue >= 1 && newValue <= 9) {
        newTiles[i] = newValue;
        return newTiles;
      }
      
      // 如果调整后超出范围，尝试减少
      const newValueDown = newTiles[i] - (10 - adjustment);
      if (newValueDown >= 1 && newValueDown <= 9) {
        newTiles[i] = newValueDown;
        return newTiles;
      }
    }
  }
  
  // 如果单个数字调整不行，尝试调整多个数字
  let remainingAdjustment = adjustment;
  for (let i = 0; i < newTiles.length && remainingAdjustment > 0; i++) {
    if (newTiles[i] > 0) {
      const maxIncrease = Math.min(9 - newTiles[i], remainingAdjustment);
      if (maxIncrease > 0) {
        newTiles[i] += maxIncrease;
        remainingAdjustment -= maxIncrease;
      }
    }
  }
  
  // 如果还有剩余调整量，尝试减少一些数字
  if (remainingAdjustment > 0) {
    for (let i = 0; i < newTiles.length && remainingAdjustment > 0; i++) {
      if (newTiles[i] > 1) {
        const maxDecrease = Math.min(newTiles[i] - 1, remainingAdjustment);
        newTiles[i] -= maxDecrease;
        remainingAdjustment -= maxDecrease;
      }
    }
  }
  
  return newTiles;
}

// 根据模式和关卡生成动态数字方块
function generateDynamicTiles(level, isChallengeMode, random) {
  if (isChallengeMode) {
    // 挑战模式：需要画大框才能消除
    const { GRID_ROWS, GRID_COLS } = FIXED_BOARD_CONFIG;
    const totalCells = GRID_ROWS * GRID_COLS;
    const tiles = new Array(totalCells);
    
    // 80%填充率，需要画大框消除
    const fillCount = Math.floor(totalCells * 0.8);
    
    // 填充数字：80%小数字(1-3)，20%中等数字(4-5)
    for (let i = 0; i < fillCount; i++) {
      if (random() < 0.8) {
        tiles[i] = Math.floor(random() * 3) + 1; // 1-3
      } else {
        tiles[i] = Math.floor(random() * 2) + 4; // 4-5
      }
    }
    
    // 剩余位置填0
    for (let i = fillCount; i < totalCells; i++) {
      tiles[i] = 0;
    }
    
    // 随机打乱位置
    for (let i = tiles.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }
    
    return {
      width: GRID_COLS,
      height: GRID_ROWS,
      tiles,
    };
  } else {
    // 闯关模式：根据关卡动态调整数字方块数量
    const { width, height } = getBoardDimensions(level);
    const size = width * height;
    const tiles = new Array(size).fill(0);
    
    // 根据关卡调整填充率
    let fillRatio = 0.6;
    if (level > 50) fillRatio = 0.7;
    if (level > 100) fillRatio = 0.8;
    
    const fillCount = Math.floor(size * fillRatio);
    
    // 生成数字
    for (let i = 0; i < fillCount; i++) {
      tiles[i] = Math.floor(random() * 9) + 1;
    }
    
    // 随机打乱位置
    for (let i = tiles.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }
    
    return {
      width,
      height,
      tiles,
    };
  }
}

export function generateBoard(level, forceNewSeed = false, isChallengeMode = false) {
  // 使用时间戳或固定种子，根据需要生成不同的棋盘
  const baseSeed = forceNewSeed ? Date.now() : Math.floor(Date.now() / 60000); // 每分钟变化
  const seed = `level_${level}_${baseSeed}`;
  const random = seededRandom(seed);
  
  // 生成动态数字方块
  const boardData = generateDynamicTiles(level, isChallengeMode, random);
  
  return {
    seed,
    ...boardData,
    requiredSwaps: 0,
    level: isChallengeMode ? 'challenge' : level,
    solvable: true,
    isChallengeMode,
  };
}

// 生成后备的简单可解棋盘
function generateFallbackBoard(level, width, height, isChallengeMode = false, screenWidth = 390, screenHeight = 844) {
  const size = width * height;
  const tiles = new Array(size).fill(0);
  
  // 简单地放置一些1-9和9-1的配对
  let pos = 0;
  const pairs = [[1, 9], [2, 8], [3, 7], [4, 6]];
  
  for (let i = 0; i < Math.min(pairs.length, Math.floor(size / 2)); i++) {
    if (pos + 1 < size) {
      tiles[pos] = pairs[i][0];
      tiles[pos + 1] = pairs[i][1];
      pos += 2;
    }
  }
  
  // 填充剩余位置
  while (pos < size) {
    tiles[pos] = Math.floor(Math.random() * 9) + 1;
    pos++;
  }
  
  // 确保后备棋盘的总和也是10的倍数
  const adjustedTiles = ensureSumIsMultipleOf10(tiles);
  
  return {
    seed: `fallback_${level}_${Date.now()}`,
    width,
    height,
    tiles: adjustedTiles,
    requiredSwaps: 0,
    level,
    solvable: true,
    isChallengeMode,
  };
}