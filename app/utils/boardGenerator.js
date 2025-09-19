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

// 根据关卡获取数字方块数量 - 修复后的版本
function getTileCount(level, isChallenge = false) {
  if (isChallenge) {
    // 挑战模式：固定矩形数量 8x10 = 80
    return 80;
  }
  
  // 关卡模式：确保数量能组成完美矩形
  if (level >= 1 && level <= 10) {
    // 1-10关：小矩形，方块尺寸较大
    const rectangleSizes = [12, 15, 16, 20, 20, 24, 24, 25, 30, 30]; // 3x4, 3x5, 4x4, 4x5, 4x5, 4x6, 4x6, 5x5, 5x6, 5x6
    return rectangleSizes[level - 1];
  }
  if (level >= 11 && level <= 20) {
    // 11-20关：中等矩形
    const rectangleSizes = [35, 36, 40, 42, 45, 48, 49, 54, 56, 60]; // 5x7, 6x6, 5x8, 6x7, 5x9, 6x8, 7x7, 6x9, 7x8, 6x10
    return rectangleSizes[level - 11];
  }
  if (level >= 21 && level <= 30) {
    // 21-30关：较大矩形
    const rectangleSizes = [63, 64, 70, 72, 77, 80, 81, 88, 90, 96]; // 7x9, 8x8, 7x10, 8x9, 7x11, 8x10, 9x9, 8x11, 9x10, 8x12
    return rectangleSizes[level - 21];
  }
  if (level >= 31 && level <= 50) {
    // 31-50关：大矩形
    const rectangleSizes = [
      99, 100, 104, 108, 110, 112, 117, 120, 121, 126, // 31-40关：9x11, 10x10, 8x13, 9x12, 10x11, 8x14, 9x13, 10x12, 11x11, 9x14
      130, 132, 135, 140, 143, 144, 150, 154, 156, 160  // 41-50关：10x13, 11x12, 9x15, 10x14, 11x13, 12x12, 10x15, 11x14, 12x13, 10x16
    ];
    return rectangleSizes[level - 31];
  }
  if (level >= 51 && level <= 100) {
    // 51-100关：超大矩形，但控制在合理范围
    const baseSize = 160;
    const increment = Math.floor((level - 50) / 5) * 12; // 每5关增加12个方块
    const targetSize = baseSize + increment;
    
    // 确保是矩形数量：找到最接近的矩形
    return findNearestRectangleSize(targetSize);
  }
  
  // 100关以后：固定最大矩形 12x16 = 192
  return 192;
}

// 找到最接近目标数量的矩形尺寸
function findNearestRectangleSize(target) {
  let bestSize = target;
  let minDiff = Infinity;
  
  // 尝试不同的矩形比例
  for (let width = 8; width <= 16; width++) {
    for (let height = 8; height <= 16; height++) {
      const size = width * height;
      const diff = Math.abs(size - target);
      
      if (diff < minDiff) {
        minDiff = diff;
        bestSize = size;
      }
    }
  }
  
  return bestSize;
}

// Get number distribution strategy based on level
function getNumberDistribution(level) {
  // 挑战模式使用特殊的数字分布
  if (level === -1) { // 挑战模式标识
    return {
      smallNumbers: 0.15,  // 少量1-2
      mediumNumbers: 0.55, // 大量3-6
      largeNumbers: 0.30   // 适量7-9
    };
  }
  
  // 前5关：极简分布，主要是互补数字
  if (level <= 5) {
    return {
      smallNumbers: 0.8,  // 80% 1-3的比例
      mediumNumbers: 0.2, // 20% 4-6的比例  
      largeNumbers: 0.0   // 0% 7-9的比例
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
  
  // 31-50关：平衡分布
  if (level <= 50) {
    return {
      smallNumbers: 0.5,
      mediumNumbers: 0.4,
      largeNumbers: 0.1
    };
  }
  
  // 51-100关：减少小数字，增加大数字
  if (level <= 100) {
    return {
      smallNumbers: 0.3,  // 减少1-3
      mediumNumbers: 0.4, // 保持4-6
      largeNumbers: 0.3   // 增加7-9
    };
  }
  
  // 101关以后：更具挑战性的分布
  return {
    smallNumbers: 0.2,  // 更少1-3
    mediumNumbers: 0.4, // 保持4-6
    largeNumbers: 0.4   // 更多7-9
  };
}

// Generate a game board for the specified level
export function generateBoard(level, ensureSolvable = true, isChallenge = false) {
  const seed = isChallenge ? 
    `challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : 
    `level_${level}`;
  
  const random = seededRandom(seed);
  
  // 获取数字方块数量
  const tileCount = getTileCount(level, isChallenge);
  
  // 获取布局配置 - 统一使用前端布局系统
  const layoutConfig = getBoardLayoutConfig(tileCount, null, level);
  
  const rows = layoutConfig.rows;
  const cols = layoutConfig.cols;
  const totalSlots = rows * cols;
  
  // 确保方块数量不超过可用格子数的80%
  const maxTiles = Math.floor(totalSlots * 0.8);
  const actualTileCount = Math.min(tileCount, maxTiles);
  
  // 计算数字方块在棋盘中的分布区域
  const tileRows = Math.ceil(Math.sqrt(actualTileCount * (rows / cols)));
  const tileCols = Math.ceil(actualTileCount / tileRows);
  
  // 确保不超出棋盘边界
  const finalTileRows = Math.min(tileRows, rows);
  const finalTileCols = Math.min(tileCols, cols);
  const finalTileCount = Math.min(actualTileCount, finalTileRows * finalTileCols);
  
  // 计算数字方块区域在棋盘中的起始位置（居中）
  const startRow = Math.floor((rows - finalTileRows) / 2);
  const startCol = Math.floor((cols - finalTileCols) / 2);
  
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
  
  // 确定目标配对的比例 - 平滑的难度曲线
  let targetPairRatio = 0.85; // 默认85%有效配对
  let adjacentPairRatio = 0.7; // 默认70%的配对是相邻的
  
  if (level <= 5) {
    targetPairRatio = 0.95; // 前5关：95%有效配对
    adjacentPairRatio = 0.9; // 90%的配对是相邻的
  } else if (level <= 15) {
    targetPairRatio = 0.85; // 6-15关：85%有效配对
    adjacentPairRatio = 0.8; // 80%的配对是相邻的
  } else if (level <= 30) {
    targetPairRatio = 0.75; // 16-30关：75%有效配对
    adjacentPairRatio = 0.7; // 70%的配对是相邻的
  } else if (level <= 50) {
    targetPairRatio = 0.65; // 31-50关：65%有效配对
    adjacentPairRatio = 0.6; // 60%的配对是相邻的
  } else if (level <= 100) {
    targetPairRatio = 0.55; // 51-100关：55%有效配对
    adjacentPairRatio = 0.4; // 40%的配对是相邻的
  } else {
    targetPairRatio = 0.45; // 100+关：45%有效配对
    adjacentPairRatio = 0.3; // 30%的配对是相邻的
  }
  
  const pairCount = Math.floor((finalTileCount / 2) * targetPairRatio);
  const adjacentPairCount = Math.floor(pairCount * adjacentPairRatio);
  const placedPositions = new Set();
  let pairsPlaced = 0;
  
  // 首先放置相邻的目标配对（容易找到的）
  let adjacentPairsPlaced = 0;
  while (adjacentPairsPlaced < adjacentPairCount && pairsPlaced < pairCount) {
    const pairType = targetPairs[Math.floor(random() * targetPairs.length)];
    const [val1, val2] = pairType;
    
    // 寻找相邻位置
    let attempts = 0;
    let placed = false;
    
    while (attempts < 100 && !placed) {
      const pos1 = Math.floor(random() * finalTileCount);
      const row1 = Math.floor(pos1 / finalTileCols);
      const col1 = pos1 % finalTileCols;
      
      if (placedPositions.has(pos1)) {
        attempts++;
        continue;
      }
      
      // 尝试四个相邻方向：右、下、左、上
      const directions = [
        [0, 1],  // 右
        [1, 0],  // 下
        [0, -1], // 左
        [-1, 0]  // 上
      ];
      
      for (const [dr, dc] of directions) {
        const row2 = row1 + dr;
        const col2 = col1 + dc;
        
        if (row2 >= 0 && row2 < finalTileRows && col2 >= 0 && col2 < finalTileCols) {
          const pos2 = row2 * finalTileCols + col2;
          
          if (!placedPositions.has(pos2)) {
            numberTiles[pos1] = val1;
            numberTiles[pos2] = val2;
            placedPositions.add(pos1);
            placedPositions.add(pos2);
            adjacentPairsPlaced++;
            pairsPlaced++;
            placed = true;
            break;
          }
        }
      }
      
      attempts++;
    }
    
    if (!placed) {
      // 如果找不到相邻位置，跳出循环
      break;
    }
  }
  
  // 然后放置剩余的非相邻目标配对
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
  
  // Generate remaining tiles to achieve target sum (multiple of 10)
  const remainingTilesToPlace = Math.min(remainingCount, availablePositions.length);
  const remainingTiles = [];
  for (let i = 0; i < remainingTilesToPlace; i++) {
    remainingTiles.push(0); // Placeholder
  }
  
  // Calculate current sum from placed pairs
  let currentSum = 0;
  for (let i = 0; i < finalTileCount; i++) {
    if (numberTiles[i] > 0) {
      currentSum += numberTiles[i];
    }
  }
  
  // Fill remaining tiles to achieve target sum (multiple of 10)
  if (remainingTiles.length > 0) {
    // 前几关：优先确保总和是10的倍数，便于完全消除
    if (level <= 15 && !isChallenge) {
      // 计算需要的剩余总和使整体是10的倍数
      const minPossibleSum = currentSum + remainingTiles.length; // All 1s
      const maxPossibleSum = currentSum + remainingTiles.length * 6; // 限制最大为6
      
      // 找到范围内最接近的10的倍数
      let targetTotalSum = Math.ceil(minPossibleSum / 10) * 10;
      if (targetTotalSum > maxPossibleSum) {
        targetTotalSum = Math.floor(maxPossibleSum / 10) * 10;
      }
      
      const targetRemainingSum = targetTotalSum - currentSum;
      
      // 确保目标剩余总和是合理的
      if (targetRemainingSum >= remainingTiles.length && targetRemainingSum <= remainingTiles.length * 6) {
        // 使用平均值填充
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
            if (difference > 0 && remainingTiles[i] < 6) {
              remainingTiles[i]++;
              difference--;
            } else if (difference < 0 && remainingTiles[i] > 1) {
              remainingTiles[i]--;
              difference++;
            }
          }
          attempts++;
        }
        
        console.log(`🎯 Level ${level}: 配对总和=${currentSum}, 剩余总和=${remainingTiles.reduce((sum, val) => sum + val, 0)}, 目标总和=${targetTotalSum}`);
      } else {
        // 如果目标剩余总和不合理，使用简单填充
        console.warn(`⚠️ Level ${level}: 目标剩余总和不合理 (${targetRemainingSum}), 使用随机填充`);
        for (let i = 0; i < remainingTiles.length; i++) {
          remainingTiles[i] = Math.floor(random() * 6) + 1; // 1-6
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
      let currentTotalSum = remainingTiles.reduce((sum, val) => sum + val, 0) + currentSum;
      let targetSum = Math.ceil(currentTotalSum / 10) * 10;
      let difference = targetSum - currentTotalSum;
      
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
      // 关卡模式：确保总和是10的倍数
      const minPossibleSum = currentSum + remainingTiles.length; // All 1s
      const maxPossibleSum = currentSum + remainingTiles.length * 9; // All 9s
      
      // Find the closest multiple of 10 within range
      let targetTotalSum = Math.ceil(minPossibleSum / 10) * 10;
      if (targetTotalSum > maxPossibleSum) {
        targetTotalSum = Math.floor(maxPossibleSum / 10) * 10;
      }
      
      const targetRemainingSum = targetTotalSum - currentSum;
      
      // 确保目标剩余总和是合理的
      if (targetRemainingSum >= remainingTiles.length && targetRemainingSum <= remainingTiles.length * 9) {
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
        
        console.log(`🎯 Level ${level}: 配对总和=${currentSum}, 剩余总和=${remainingTiles.reduce((sum, val) => sum + val, 0)}, 目标总和=${targetTotalSum}`);
      } else {
        // 如果目标剩余总和不合理，使用简单填充但确保10的倍数
        console.warn(`⚠️ Level ${level}: 目标剩余总和不合理 (${targetRemainingSum}), 使用备用方案`);
        
        // 简单填充为1，然后调整最后几个数字使总和为10的倍数
        for (let i = 0; i < remainingTiles.length; i++) {
          remainingTiles[i] = 1;
        }
        
        const currentTotal = currentSum + remainingTiles.length;
        const targetTotal = Math.ceil(currentTotal / 10) * 10;
        let needed = targetTotal - currentTotal;
        
        // 在最后几个位置添加需要的数值
        for (let i = remainingTiles.length - 1; i >= 0 && needed > 0; i--) {
          const canAdd = Math.min(8, needed); // 最多加到9
          remainingTiles[i] += canAdd;
          needed -= canAdd;
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
  for (let tileRow = 0; tileRow < finalTileRows; tileRow++) {
    for (let tileCol = 0; tileCol < finalTileCols; tileCol++) {
      const tileIndex = tileRow * finalTileCols + tileCol;
      if (tileIndex < finalTileCount) {
        const boardRow = startRow + tileRow;
        const boardCol = startCol + tileCol;
        const boardIndex = boardRow * cols + boardCol;
        tiles[boardIndex] = numberTiles[tileIndex];
      }
    }
  }
  
  // Verify the sum is a multiple of 10 (for debugging)
  const finalSum = numberTiles.filter(val => val > 0).reduce((sum, val) => sum + val, 0);
  if (finalSum % 10 !== 0) {
    console.warn(`❌ Level ${level}: 总和 ${finalSum} 不是10的倍数！`);
  } else {
    console.log(`✅ Level ${level}: 总和 = ${finalSum} (${finalSum/10} × 10)`);
  }
    
  
  return {
    seed,
    width: cols,  // 棋盘总宽度
    height: rows, // 棋盘总高度
    tiles,
    layoutConfig, // 包含完整的布局信息
  };
}