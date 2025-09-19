/**
 * Board Generator - 使用新的自适应布局系统
 * Purpose: 根据难度生成数字方块，布局由BoardLayout统一管理
 * Features: 只负责数字生成，不涉及布局计算
 */

import { getBoardLayoutConfig } from '../layout/BoardLayout';

// Deterministic random number generator for consistent board generation
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

// 根据关卡获取数字方块数量
function getTileCount(level, isChallenge = false) {
  if (isChallenge) {
    // 挑战模式：使用高数量提供最大挑战
    return 200; // 固定高数量
  }
  
  // 关卡模式：渐进式增长
  if (level >= 1 && level <= 10) {
    return Math.floor(12 + level * 2); // 14-32个方块
  }
  if (level >= 11 && level <= 20) {
    return Math.floor(30 + (level - 10) * 3); // 33-60个方块
  }
  if (level >= 21 && level <= 30) {
    return Math.floor(60 + (level - 20) * 4); // 64-100个方块
  }
  if (level >= 31 && level <= 50) {
    return Math.floor(100 + (level - 30) * 3); // 103-160个方块
  }
  if (level >= 51 && level <= 80) {
    return Math.floor(160 + (level - 50) * 2); // 162-220个方块
  }
  if (level >= 81 && level <= 120) {
    return Math.floor(220 + (level - 80) * 1.5); // 221-280个方块
  }
  if (level >= 121 && level <= 200) {
    return Math.floor(280 + (level - 120) * 1); // 281-360个方块
  }
  
  // 200关以后继续增长
  return Math.floor(360 + (level - 200) * 0.5);
}

// Get number distribution strategy based on level
function getNumberDistribution(level) {
  if (level <= 30) {
    return {
      smallNumbers: 0.6,  // 1-3的比例
      mediumNumbers: 0.3, // 4-6的比例
      largeNumbers: 0.1   // 7-9的比例
    };
  }
  
  if (level <= 80) {
    return {
      smallNumbers: 0.5,
      mediumNumbers: 0.4,
      largeNumbers: 0.1
    };
  }
  
  return {
    smallNumbers: 0.4,
    mediumNumbers: 0.4,
    largeNumbers: 0.2
  };
}

// Generate a game board for the specified level
export function generateBoard(level, ensureSolvable = true, isChallenge = false) {
  const seed = isChallenge ? 
    `challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : 
    `level_${level}`;
  
  const random = seededRandom(seed);
  
  // 获取数字方块数量和布局
  let tileCount, rows, cols;
  
  if (isChallenge) {
    // 挑战模式：固定14行11列
    rows = 14;
    cols = 11;
    tileCount = rows * cols; // 154个方块
  } else {
    // 关卡模式：使用原有逻辑
    tileCount = getTileCount(level, isChallenge);
    const layoutConfig = getBoardLayoutConfig(tileCount, null, level);
    rows = layoutConfig.rows;
    cols = layoutConfig.cols;
  }
  
  // 为挑战模式创建布局配置
  const layoutConfig = isChallenge ? 
    getBoardLayoutConfig(tileCount, cols / rows, null) : 
    getBoardLayoutConfig(tileCount, null, level);
    
  // 确保使用布局配置中的实际行列数
  rows = layoutConfig.rows;
  cols = layoutConfig.cols;
  const totalSlots = rows * cols;
  
  // Initialize empty board
  const tiles = new Array(totalSlots).fill(0);
  
  // Get difficulty parameters
  const distribution = getNumberDistribution(level);
  
  // Target pairs that sum to 10
  const targetPairs = [
    [1, 9], [2, 8], [3, 7], [4, 6], [5, 5]
  ];
  
  // Determine how many target pairs to place
  let targetPairRatio = 0.6; // Easy levels
  if (level > 40) {
    targetPairRatio = 0.4; // Medium levels
  }
  if (level > 90) {
    targetPairRatio = 0.25; // Hard levels
  }
  
  const pairCount = Math.floor((tileCount / 2) * targetPairRatio);
  const placedPositions = new Set();
  let pairsPlaced = 0;
  
  // Place target pairs
  while (pairsPlaced < pairCount) {
    const pairType = targetPairs[Math.floor(random() * targetPairs.length)];
    const [val1, val2] = pairType;
    
    const availablePositions = [];
    for (let i = 0; i < totalSlots; i++) {
      if (!placedPositions.has(i)) {
        availablePositions.push(i);
      }
    }
    
    if (availablePositions.length >= 2) {
      const pos1 = availablePositions[Math.floor(random() * availablePositions.length)];
      const remainingPositions = availablePositions.filter(p => p !== pos1);
      const pos2 = remainingPositions[Math.floor(random() * remainingPositions.length)];
      
      tiles[pos1] = val1;
      tiles[pos2] = val2;
      placedPositions.add(pos1);
      placedPositions.add(pos2);
      pairsPlaced++;
    } else {
      break;
    }
  }
  
  // Fill remaining spots with random numbers based on distribution
  const remainingCount = tileCount - (pairsPlaced * 2);
  const availablePositions = [];
  for (let i = 0; i < totalSlots; i++) {
    if (!placedPositions.has(i)) {
      availablePositions.push(i);
    }
  }
  
  // Calculate current sum from placed pairs
  let currentSum = 0;
  for (let i = 0; i < totalSlots; i++) {
    if (tiles[i] > 0) {
      currentSum += tiles[i];
    }
  }
  
  // Calculate target sum to make total sum a multiple of 10
  const remainingTilesToPlace = Math.min(remainingCount, availablePositions.length);
  let targetRemainingSum = 0;
  
  if (remainingTilesToPlace > 0) {
    // Find the next multiple of 10 that's achievable
    const minPossibleSum = currentSum + remainingTilesToPlace; // All 1s
    const maxPossibleSum = currentSum + remainingTilesToPlace * 9; // All 9s
    
    // Find the closest multiple of 10 within range
    let targetTotalSum = Math.ceil(minPossibleSum / 10) * 10;
    if (targetTotalSum > maxPossibleSum) {
      targetTotalSum = Math.floor(maxPossibleSum / 10) * 10;
    }
    
    targetRemainingSum = targetTotalSum - currentSum;
  }
  
  // Generate remaining tiles to achieve target sum
  const remainingTiles = [];
  for (let i = 0; i < Math.min(remainingCount, availablePositions.length); i++) {
    const pos = availablePositions[i];
    remainingTiles.push(0); // Placeholder
  }
  
  // Fill remaining tiles to achieve target sum
  if (remainingTiles.length > 0) {
    // Start with average distribution
    const avgValue = Math.max(1, Math.min(9, Math.round(targetRemainingSum / remainingTiles.length)));
    
    for (let i = 0; i < remainingTiles.length; i++) {
      remainingTiles[i] = avgValue;
    }
    
    // Adjust to match exact target sum
    let currentRemainingSum = remainingTiles.reduce((sum, val) => sum + val, 0);
    let difference = targetRemainingSum - currentRemainingSum;
    
    // Distribute the difference
    let attempts = 0;
    while (difference !== 0 && attempts < 100) {
      for (let i = 0; i < remainingTiles.length && difference !== 0; i++) {
        if (difference > 0 && remainingTiles[i] < 9) {
          remainingTiles[i]++;
          difference--;
        } else if (difference < 0 && remainingTiles[i] > 1) {
          remainingTiles[i]--;
          difference++;
        }
      }
      attempts++;
    }
    
    // Apply some randomization while maintaining sum
    for (let i = 0; i < remainingTiles.length - 1; i++) {
      if (random() < 0.3) { // 30% chance to randomize
        const maxIncrease = Math.min(9 - remainingTiles[i], remainingTiles[i + 1] - 1);
        const maxDecrease = Math.min(remainingTiles[i] - 1, 9 - remainingTiles[i + 1]);
        
        if (maxIncrease > 0 && random() < 0.5) {
          const change = Math.floor(random() * maxIncrease) + 1;
          remainingTiles[i] += change;
          remainingTiles[i + 1] -= change;
        } else if (maxDecrease > 0) {
          const change = Math.floor(random() * maxDecrease) + 1;
          remainingTiles[i] -= change;
          remainingTiles[i + 1] += change;
        }
      }
    }
  }
  
  // Place the calculated remaining tiles
  for (let i = 0; i < remainingTiles.length; i++) {
    const pos = availablePositions[i];
    tiles[pos] = remainingTiles[i];
  }
  
  // Verify the sum is a multiple of 10 (for debugging)
  const finalSum = tiles.reduce((sum, val) => sum + val, 0);
  if (finalSum % 10 !== 0) {
    console.warn(`Board sum ${finalSum} is not a multiple of 10 for level ${level}`);
  }
    
  
  return {
    seed,
    width: cols,
    height: rows,
    tiles,
    layoutConfig, // 包含完整的布局信息
  };
}