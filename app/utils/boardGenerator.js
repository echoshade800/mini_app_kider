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
  
  // 关卡模式：前几关保证可完全消除，后续渐进式增长
  if (level >= 1 && level <= 10) {
    // 前10关：使用较少方块，确保可完全消除
    return Math.floor(8 + level * 1.5); // 9.5-23个方块，向下取整为9-22个
  }
  if (level >= 11 && level <= 20) {
    return Math.floor(25 + (level - 10) * 2.5); // 27.5-50个方块
  }
  if (level >= 21 && level <= 30) {
    return Math.floor(50 + (level - 20) * 3); // 53-80个方块
  }
  if (level >= 31 && level <= 50) {
    return Math.floor(80 + (level - 30) * 2.5); // 82.5-130个方块
  }
  if (level >= 51 && level <= 80) {
    return Math.floor(130 + (level - 50) * 2); // 132-190个方块
  }
  if (level >= 81 && level <= 120) {
    return Math.floor(190 + (level - 80) * 1.5); // 191.5-250个方块
  }
  if (level >= 121 && level <= 200) {
    return Math.floor(250 + (level - 120) * 1); // 251-330个方块
  }
  
  // 200关以后继续增长
  return Math.floor(330 + (level - 200) * 0.5);
}

// Get number distribution strategy based on level
function getNumberDistribution(level) {
  // 挑战模式使用特殊的数字分布
  if (level === -1) { // 挑战模式标识
    return {
      smallNumbers: 0.15,  // 大幅减少1-2的比例 (原来0.4)
      mediumNumbers: 0.65, // 大幅增加3-6的比例 (原来0.4) 
      largeNumbers: 0.20   // 略微增加7-9的比例 (原来0.2)
    };
  }
  
  // 前5关：极简分布，主要是互补数字
  if (level <= 5) {
    return {
      smallNumbers: 0.8,  // 80% 1-3的比例，主要是1,2,3
      mediumNumbers: 0.2, // 20% 4-6的比例，主要是4,5,6  
      largeNumbers: 0.0   // 0% 7-9的比例，避免复杂组合
    };
  }
  
  // 6-15关：逐步增加复杂度
  if (level <= 15) {
    return {
      smallNumbers: 0.7,  // 70% 1-3的比例
      mediumNumbers: 0.25, // 25% 4-6的比例
      largeNumbers: 0.05   // 5% 7-9的比例
    };
  }
  
  // 16-30关：标准简单分布
  if (level <= 30) {
    return {
      smallNumbers: 0.6,  // 60% 1-3的比例
      mediumNumbers: 0.3, // 30% 4-6的比例
      largeNumbers: 0.1   // 10% 7-9的比例
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
  
  // 计算实际数字方块数量和矩形尺寸
  const actualTileCount = Math.min(tileCount, totalSlots);
  const actualTileRows = Math.ceil(Math.sqrt(actualTileCount));
  const actualTileCols = Math.ceil(actualTileCount / actualTileRows);
  
  // 确保矩形不超出棋盘边界
  const maxTileRows = Math.min(actualTileRows, rows);
  const maxTileCols = Math.min(actualTileCols, cols);
  const finalTileCount = maxTileRows * maxTileCols;
  
  // 计算数字方块矩形在棋盘中的起始位置（居中）
  const startRow = Math.floor((rows - maxTileRows) / 2);
  const startCol = Math.floor((cols - maxTileCols) / 2);
  
  // Initialize empty board
  const tiles = new Array(totalSlots).fill(0);
  
  // 创建数字方块数组（用于生成数字）
  const numberTiles = new Array(finalTileCount).fill(0);
  
  // Get difficulty parameters
  const distribution = getNumberDistribution(isChallenge ? -1 : level);
  
  // Target pairs that sum to 10
  const targetPairs = [
    [1, 9], [2, 8], [3, 7], [4, 6], [5, 5]
  ];
  
  // 确定目标配对的比例 - 前几关保证高比例的有效配对
  let targetPairRatio = 0.9; // 前几关：90%都是有效配对
  
  if (level <= 5) {
    targetPairRatio = 0.95; // 前5关：95%有效配对，几乎可以完全消除
  } else if (level <= 10) {
    targetPairRatio = 0.85; // 6-10关：85%有效配对
  } else if (level <= 20) {
    targetPairRatio = 0.7;  // 11-20关：70%有效配对
  } else if (level <= 40) {
    targetPairRatio = 0.6;  // 21-40关：60%有效配对
  } else if (level <= 80) {
    targetPairRatio = 0.4;  // 41-80关：40%有效配对
  } else {
    targetPairRatio = 0.25; // 81+关：25%有效配对，高难度
  }
  
  const pairCount = Math.floor((finalTileCount / 2) * targetPairRatio);
  const placedPositions = new Set();
  let pairsPlaced = 0;
  
  // Place target pairs
  while (pairsPlaced < pairCount) {
    const pairType = targetPairs[Math.floor(random() * targetPairs.length)];
    const [val1, val2] = pairType;
    
    const availablePositions = [];
    for (let i = 0; i < finalTileCount; i++) {
      if (!placedPositions.has(i)) {
        availablePositions.push(i);
      }
    }
    
    if (availablePositions.length >= 2) {
      const pos1 = availablePositions[Math.floor(random() * availablePositions.length)];
      const remainingPositions = availablePositions.filter(p => p !== pos1);
      const pos2 = remainingPositions[Math.floor(random() * remainingPositions.length)];
      
      numberTiles[pos1] = val1;
      numberTiles[pos2] = val2;
      placedPositions.add(pos1);
      placedPositions.add(pos2);
      pairsPlaced++;
    } else {
      break;
    }
  }
  
  // Fill remaining spots with random numbers based on distribution
  const remainingCount = finalTileCount - (pairsPlaced * 2);
  const availablePositions = [];
  for (let i = 0; i < finalTileCount; i++) {
    if (!placedPositions.has(i) && numberTiles[i] === 0) {
      availablePositions.push(i);
    }
  }
  
  // Calculate current sum from placed pairs
  let currentSum = 0;
  for (let i = 0; i < actualTileCount; i++) {
    if (numberTiles[i] > 0) {
      currentSum += numberTiles[i];
    }
  }
  
  // Calculate target sum to make total sum a multiple of 10
  const remainingTilesToPlace = Math.min(remainingCount, availablePositions.length);
  let targetRemainingSum = 0;
  
  if (remainingTilesToPlace > 0) {
    // 前几关：优先确保总和是10的倍数，便于完全消除
    if (level <= 10) {
      // 简单策略：直接计算需要的总和
      const minPossibleSum = currentSum + remainingTilesToPlace; // All 1s
      const maxPossibleSum = currentSum + remainingTilesToPlace * 6; // 限制最大为6，避免过大数字
      
      // 找到范围内最接近的10的倍数
      let targetTotalSum = Math.ceil(minPossibleSum / 10) * 10;
      if (targetTotalSum > maxPossibleSum) {
        targetTotalSum = Math.floor(maxPossibleSum / 10) * 10;
      }
      
      targetRemainingSum = targetTotalSum - currentSum;
    } else {
      // 后续关卡：使用原有逻辑
      const minPossibleSum = currentSum + remainingTilesToPlace; // All 1s
      const maxPossibleSum = currentSum + remainingTilesToPlace * 9; // All 9s
      
      // Find the closest multiple of 10 within range
      let targetTotalSum = Math.ceil(minPossibleSum / 10) * 10;
      if (targetTotalSum > maxPossibleSum) {
        targetTotalSum = Math.floor(maxPossibleSum / 10) * 10;
      }
      
      targetRemainingSum = targetTotalSum - currentSum;
    }
  }
  
  // Generate remaining tiles to achieve target sum
  const remainingTiles = [];
  for (let i = 0; i < Math.min(remainingCount, availablePositions.length); i++) {
    remainingTiles.push(0); // Placeholder
  }
  
  // Fill remaining tiles to achieve target sum
  if (remainingTiles.length > 0) {
    if (level <= 10) {
      // 前10关：使用简单数字，主要是1-6
      const avgValue = Math.max(1, Math.min(6, Math.round(targetRemainingSum / remainingTiles.length)));
      
      for (let i = 0; i < remainingTiles.length; i++) {
        remainingTiles[i] = avgValue;
      }
      
      // 微调以达到精确的目标总和
      let currentRemainingSum = remainingTiles.reduce((sum, val) => sum + val, 0);
      let difference = targetRemainingSum - currentRemainingSum;
      
      let attempts = 0;
      while (difference !== 0 && attempts < 50) {
        for (let i = 0; i < remainingTiles.length && difference !== 0; i++) {
          if (difference > 0 && remainingTiles[i] < 6) { // 限制最大为6
            remainingTiles[i]++;
            difference--;
          } else if (difference < 0 && remainingTiles[i] > 1) {
            remainingTiles[i]--;
            difference++;
          }
        }
        attempts++;
      }
      
      // 添加少量随机性，但保持总和
      for (let i = 0; i < remainingTiles.length - 1; i++) {
        if (random() < 0.2) { // 20%概率进行调整
          const maxIncrease = Math.min(6 - remainingTiles[i], remainingTiles[i + 1] - 1);
          const maxDecrease = Math.min(remainingTiles[i] - 1, 6 - remainingTiles[i + 1]);
          
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
    } else if (isChallenge) {
      // 挑战模式使用特殊的数字生成策略
      // 根据分布比例生成数字
      const smallCount = Math.floor(remainingTiles.length * distribution.smallNumbers);
      const mediumCount = Math.floor(remainingTiles.length * distribution.mediumNumbers);
      const largeCount = remainingTiles.length - smallCount - mediumCount;
      
      let index = 0;
      
      // 生成少量小数字 (1-2)
      for (let i = 0; i < smallCount; i++) {
        remainingTiles[index++] = Math.floor(random() * 2) + 1; // 1-2
      }
      
      // 生成大量中等数字 (3-6)
      for (let i = 0; i < mediumCount; i++) {
        remainingTiles[index++] = Math.floor(random() * 4) + 3; // 3-6
      }
      
      // 生成一些大数字 (7-9)
      for (let i = 0; i < largeCount; i++) {
        remainingTiles[index++] = Math.floor(random() * 3) + 7; // 7-9
      }
      
      // 调整总和为10的倍数
      let currentSum = remainingTiles.reduce((sum, val) => sum + val, 0) + currentSum;
      let targetSum = Math.ceil(currentSum / 10) * 10;
      let difference = targetSum - currentSum;
      
      // 微调数字以达到目标总和
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
    } else {
      // 关卡模式保持原有逻辑
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
  }
  
  // Place the calculated remaining tiles
  for (let i = 0; i < remainingTiles.length; i++) {
    const pos = availablePositions[i];
    numberTiles[pos] = remainingTiles[i];
  }
  
  // 将数字方块矩形放置到棋盘的居中位置
  for (let tileRow = 0; tileRow < maxTileRows; tileRow++) {
    for (let tileCol = 0; tileCol < maxTileCols; tileCol++) {
      const tileIndex = tileRow * maxTileCols + tileCol;
      if (tileIndex < finalTileCount) {
        const boardRow = startRow + tileRow;
        const boardCol = startCol + tileCol;
        const boardIndex = boardRow * cols + boardCol;
        tiles[boardIndex] = numberTiles[tileIndex];
      }
    }
  }
  
  // Verify the sum is a multiple of 10 (for debugging)
  const finalSum = numberTiles.reduce((sum, val) => sum + val, 0);
  if (finalSum % 10 !== 0) {
    console.warn(`Number tiles sum ${finalSum} is not a multiple of 10 for level ${level}`);
  }
    
  
  return {
    seed,
    width: cols,  // 棋盘总宽度
    height: rows, // 棋盘总高度
    tiles,
    layoutConfig, // 包含完整的布局信息
  };
}