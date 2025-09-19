/**
 * Board Generator - 使用以数字方块为基准的布局系统
 * Purpose: 根据难度生成数字方块，布局完全由数字方块矩形决定
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
    return 120; // 固定中等数量，通过复杂组合增加难度
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
  
  // 51关以后固定在120个方块，通过数字分布和组合复杂度增加难度
  return 120;
}

// Get number distribution strategy based on level
function getNumberDistribution(level) {
  // 挑战模式使用特殊的数字分布
  if (level === -1) { // 挑战模式标识
    return {
      smallNumbers: 0.10,  // 极少1-2，需要更大框组合
      mediumNumbers: 0.50, // 中等数字3-6
      largeNumbers: 0.40   // 大量7-9，需要复杂组合
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
  
  // 31-50关：平衡分布
  if (level <= 50) {
    return {
      smallNumbers: 0.5,
      mediumNumbers: 0.4,
      largeNumbers: 0.1
    };
  }
  
  // 51-100关：减少小数字，增加大数字，需要更大框
  if (level <= 100) {
    return {
      smallNumbers: 0.3,  // 减少1-3
      mediumNumbers: 0.4, // 保持4-6
      largeNumbers: 0.3   // 增加7-9，需要更复杂组合
    };
  }
  
  // 101-150关：进一步减少小数字
  if (level <= 150) {
    return {
      smallNumbers: 0.2,  // 更少1-3
      mediumNumbers: 0.4, // 保持4-6
      largeNumbers: 0.4   // 更多7-9
    };
  }
  
  // 151关以后：极端分布，主要是大数字
  return {
    smallNumbers: 0.1,  // 极少1-3
    mediumNumbers: 0.3, // 少量4-6
    largeNumbers: 0.6   // 大量7-9，需要非常大的框
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
    rows = 10;
    const layoutConfig = getBoardLayoutConfig(tileCount, null, null, isChallenge);
    tileCount = 120; // 固定120个方块
  } else {
    // 关卡模式：使用原有逻辑
    tileCount = getTileCount(level, isChallenge);
    const layoutConfig = getBoardLayoutConfig(tileCount, null, level, isChallenge);
    rows = layoutConfig.rows;
    cols = layoutConfig.cols;
  }
  
  // 创建最终布局配置
  const layoutConfig = getBoardLayoutConfig(tileCount, null, level, isChallenge);
    
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
  let targetPairRatio = 0.85; // 默认85%有效配对
  let adjacentPairRatio = 0.7; // 默认70%的配对是相邻的
  
  if (level <= 5) {
    targetPairRatio = 0.95; // 前5关：95%有效配对
    adjacentPairRatio = 0.9; // 90%的配对是相邻的，非常容易找到
  } else if (level <= 10) {
    targetPairRatio = 0.85; // 6-10关：85%有效配对
    adjacentPairRatio = 0.8; // 80%的配对是相邻的
  } else if (level <= 20) {
    targetPairRatio = 0.75; // 11-20关：75%有效配对
    adjacentPairRatio = 0.7; // 70%的配对是相邻的
  } else if (level <= 40) {
    targetPairRatio = 0.65; // 21-40关：65%有效配对
    adjacentPairRatio = 0.6; // 60%的配对是相邻的
  } else if (level <= 50) {
    targetPairRatio = 0.55; // 41-50关：55%有效配对
    adjacentPairRatio = 0.5; // 50%的配对是相邻的
  } else if (level <= 100) {
    targetPairRatio = 0.45; // 51-100关：45%有效配对
    adjacentPairRatio = 0.4; // 40%的配对是相邻的
  } else if (level <= 150) {
    targetPairRatio = 0.35; // 101-150关：35%有效配对
    adjacentPairRatio = 0.3; // 30%的配对是相邻的
  } else {
    targetPairRatio = 0.3;  // 151+关：30%有效配对，需要大框
    adjacentPairRatio = 0.25; // 25%的配对是相邻的，最低不低于25%
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
      const row1 = Math.floor(pos1 / maxTileCols);
      const col1 = pos1 % maxTileCols;
      
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
        
        if (row2 >= 0 && row2 < maxTileRows && col2 >= 0 && col2 < maxTileCols) {
          const pos2 = row2 * maxTileCols + col2;
          
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
    if (level <= 10) {
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
      } else {
        // 如果目标剩余总和不合理，使用简单填充
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
  
  // 应用大数字不相邻规则
  function applyLargeNumberSeparation(remainingTiles, availablePositions, width, height, tiles) {
    // 创建临时棋盘来模拟放置
    const tempTiles = [...tiles];
    
    // 先将所有剩余方块放到临时棋盘上
    for (let i = 0; i < remainingTiles.length; i++) {
      const pos = availablePositions[i];
      tempTiles[pos] = remainingTiles[i];
    }
    
    // 找出所有大数字的位置
    const largeNumberPositions = [];
    for (let i = 0; i < remainingTiles.length; i++) {
      const value = remainingTiles[i];
      if (value >= 7) { // 大数字：7、8、9
        largeNumberPositions.push({
          index: i,
          position: availablePositions[i],
          value: value
        });
      }
    }
    
    // 尝试重新排列大数字，避免相同数字相邻
    let maxAttempts = 50;
    let improved = true;
    
    while (improved && maxAttempts > 0) {
      improved = false;
      maxAttempts--;
      
      for (let i = 0; i < largeNumberPositions.length; i++) {
        const current = largeNumberPositions[i];
        const currentPos = current.position;
        
        // 检查当前位置是否与相同数字相邻
        if (hasAdjacentSameNumber(tempTiles, width, height, currentPos, current.value)) {
          // 尝试与其他大数字交换位置
          for (let j = i + 1; j < largeNumberPositions.length; j++) {
            const other = largeNumberPositions[j];
            const otherPos = other.position;
            
            // 模拟交换
            tempTiles[currentPos] = other.value;
            tempTiles[otherPos] = current.value;
            
            // 检查交换后是否改善了情况
            const currentImproved = !hasAdjacentSameNumber(tempTiles, width, height, currentPos, other.value);
            const otherImproved = !hasAdjacentSameNumber(tempTiles, width, height, otherPos, current.value);
            
            if (currentImproved || otherImproved) {
              // 交换成功，更新数组
              remainingTiles[current.index] = other.value;
              remainingTiles[other.index] = current.value;
              
              // 更新位置记录
              current.value = other.value;
              other.value = remainingTiles[other.index];
              
              improved = true;
              break;
            } else {
              // 撤销交换
              tempTiles[currentPos] = current.value;
              tempTiles[otherPos] = other.value;
            }
          }
        }
      }
    }
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
  const finalSum = numberTiles.filter(val => val > 0).reduce((sum, val) => sum + val, 0);
  if (finalSum % 10 !== 0) {
    console.warn(`Number tiles sum ${finalSum} is not a multiple of 10 for level ${level}`);
  } else {
    console.log(`✅ Level ${level}: Total sum = ${finalSum} (${finalSum/10} × 10)`);
  }
    
  
  return {
    seed,
    width: cols,  // 棋盘总宽度
    height: rows, // 棋盘总高度
    tiles,
    layoutConfig, // 包含完整的布局信息
  };
}