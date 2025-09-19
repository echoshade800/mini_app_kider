/**
 * Board Generator - 使用新的固定32px布局系统
 * Purpose: 生成数字方块，支持后期3-4个方块凑10的难度
 * Features: 固定方块尺寸、平衡的数字分布、渐进式难度
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

// Get number distribution strategy based on level
function getNumberDistribution(level, isChallenge = false) {
  // 挑战模式使用特殊的数字分布
  if (isChallenge) {
    return {
      smallNumbers: 0.15,  // 少量1-3，需要更大框组合
      mediumNumbers: 0.45, // 中等数字4-6
      largeNumbers: 0.40,  // 大量7-9，需要复杂组合
      requireMultipleTiles: true, // 需要多方块组合
      minTilesForTen: Math.random() < 0.5 ? 3 : 4 // 随机需要3或4个方块
    };
  }
  
  // 后期关卡：需要3-4个方块凑10
  if (level > 150) {
    return {
      smallNumbers: 0.15,  // 更少小数字
      mediumNumbers: 0.35, // 中等数字
      largeNumbers: 0.50,  // 大量大数字，需要多个方块组合
      requireMultipleTiles: true, // 标记需要多方块组合
      minTilesForTen: Math.random() < 0.5 ? 3 : 4 // 随机需要3或4个方块
    };
  }
  
  if (level > 100) {
    return {
      smallNumbers: 0.20,
      mediumNumbers: 0.40,
      largeNumbers: 0.40,
      requireMultipleTiles: Math.random() < 0.3, // 30%概率需要多方块
      minTilesForTen: 3
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
  
  // 使用新的布局系统
  const layoutConfig = getBoardLayoutConfig(null, null, isChallenge ? null : level);
  rows = layoutConfig.rows;
  cols = layoutConfig.cols;
  tileCount = layoutConfig.actualTileCount;
    
  const totalSlots = rows * cols;
  const finalTileCount = tileCount;
  
  // Initialize empty board
  const tiles = new Array(totalSlots).fill(0);
  
  // Get difficulty parameters
  const distribution = getNumberDistribution(level, isChallenge);
  
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
  
  // 后期关卡的特殊处理：生成需要多个方块的组合
  if (distribution.requireMultipleTiles) {
    const minTiles = distribution.minTilesForTen || 3;
    console.log(`🎯 Level ${level}: 需要${minTiles}个方块凑10`);
    
    // 生成一些需要多方块的组合
    const multiTileCombinations = [
      [1, 1, 8], [1, 2, 7], [1, 3, 6], [1, 4, 5],
      [2, 2, 6], [2, 3, 5], [2, 4, 4], [3, 3, 4],
      [1, 1, 1, 7], [1, 1, 2, 6], [1, 1, 3, 5], [1, 1, 4, 4],
      [1, 2, 2, 5], [1, 2, 3, 4], [2, 2, 2, 4], [2, 2, 3, 3]
    ];
    
    const suitableCombos = multiTileCombinations.filter(combo => combo.length >= minTiles);
    const multiTileCount = Math.floor(finalTileCount * 0.3); // 30%使用多方块组合
    
    for (let i = 0; i < multiTileCount && suitableCombos.length > 0; i++) {
      const combo = suitableCombos[Math.floor(random() * suitableCombos.length)];
      const availablePositions = [];
      
      for (let j = 0; j < finalTileCount; j++) {
        if (!placedPositions.has(j)) {
          availablePositions.push(j);
        }
      }
      
      if (availablePositions.length >= combo.length) {
        for (let k = 0; k < combo.length; k++) {
          const pos = availablePositions[k];
          tiles[pos] = combo[k];
          placedPositions.add(pos);
        }
      }
    }
  }
  
  // 首先放置相邻的目标配对（容易找到的）
  let adjacentPairsPlaced = 0;
  while (adjacentPairsPlaced < adjacentPairCount && pairsPlaced < pairCount) {
    const pairType = targetPairs[Math.floor(random() * targetPairs.length)];
    const [val1, val2] = pairType;
    
    // 寻找相邻位置
    let attempts = 0;
    let placed = false;
    
    while (attempts < 50 && !placed) {
      const pos1 = Math.floor(random() * finalTileCount);
      const row1 = Math.floor(pos1 / cols);
      const col1 = pos1 % cols;
      
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
        
        if (row2 >= 0 && row2 < rows && col2 >= 0 && col2 < cols) {
          const pos2 = row2 * cols + col2;
          
          if (!placedPositions.has(pos2)) {
            tiles[pos1] = val1;
            tiles[pos2] = val2;
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
  const remainingCount = finalTileCount - (pairsPlaced * 2);
  const availablePositions = [];
  for (let i = 0; i < totalSlots; i++) {
    if (!placedPositions.has(i) && tiles[i] === 0) {
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
    if (tiles[i] > 0) {
      currentSum += tiles[i];
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
    tiles[pos] = remainingTiles[i];
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
  
  // 直接在网格中放置方块（不需要额外的矩形映射）
  for (let i = 0; i < finalTileCount; i++) {
    if (tiles[i] === 0) {
      // 根据分布生成随机数字
      if (random() < distribution.smallNumbers) {
        tiles[i] = Math.floor(random() * 3) + 1; // 1-3
      } else if (random() < distribution.smallNumbers + distribution.mediumNumbers) {
        tiles[i] = Math.floor(random() * 3) + 4; // 4-6
      } else {
        tiles[i] = Math.floor(random() * 3) + 7; // 7-9
      }
    }
  }
  
  // 验证总和是否为10的倍数
  const finalSum = tiles.filter(val => val > 0).reduce((sum, val) => sum + val, 0);
  if (finalSum % 10 !== 0) {
    console.warn(`⚠️ Level ${level}: 总和 ${finalSum} 不是10的倍数`);
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