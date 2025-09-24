/**
 * Board Generator - 使用新的自适应布局系统
 * Purpose: 根据难度生成数字方块，布局由BoardLayout统一管理
 * Features: 只负责数字生成，不涉及布局计算
 */

import { getBoardLayoutConfig } from '../layout/BoardLayout';
import { hasValidCombinations } from './gameLogic';

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

// 根据关卡获取数字方块数量（现在基于白色方格数量计算）
function getTileCount(level, isChallenge = false) {
  if (isChallenge) {
    // 挑战模式：使用与第130关相同的配置（8×15棋盘，144个白色方格）
    return 144;
  }
  
  // 关卡模式：基于白色方格数量计算数字方块数量
  // 白色方格数量 = (width + 1) × (height + 1)
  // 数字方块数量 = 白色方格数量
  
  if (level >= 1 && level <= 10) {
    // 前10关：3×3到4×6的棋盘
    const gridSizes = [
      { rows: 3, cols: 3 }, // 第1关：16个白色方格
      { rows: 3, cols: 4 }, // 第2关：20个白色方格
      { rows: 3, cols: 4 }, // 第3关：20个白色方格
      { rows: 3, cols: 5 }, // 第4关：24个白色方格
      { rows: 3, cols: 5 }, // 第5关：24个白色方格
      { rows: 4, cols: 5 }, // 第6关：30个白色方格
      { rows: 3, cols: 6 }, // 第7关：28个白色方格
      { rows: 4, cols: 5 }, // 第8关：30个白色方格
      { rows: 3, cols: 7 }, // 第9关：32个白色方格
      { rows: 4, cols: 6 }, // 第10关：35个白色方格
    ];
    const grid = gridSizes[level - 1];
    return (grid.rows + 1) * (grid.cols + 1);
  }
  
  if (level >= 11 && level <= 20) {
    // 11-20关：3×9到5×10的棋盘
    const gridSizes = [
      { rows: 3, cols: 9 }, // 第11关：40个白色方格
      { rows: 5, cols: 6 }, // 第12关：42个白色方格
      { rows: 4, cols: 8 }, // 第13关：45个白色方格
      { rows: 5, cols: 7 }, // 第14关：48个白色方格
      { rows: 4, cols: 9 }, // 第15关：50个白色方格
      { rows: 5, cols: 8 }, // 第16关：54个白色方格
      { rows: 6, cols: 7 }, // 第17关：56个白色方格
      { rows: 5, cols: 9 }, // 第18关：60个白色方格
      { rows: 4, cols: 12 }, // 第19关：65个白色方格
      { rows: 5, cols: 10 }, // 第20关：66个白色方格
    ];
    const grid = gridSizes[level - 11];
    return (grid.rows + 1) * (grid.cols + 1);
  }
  
  if (level >= 21 && level <= 30) {
    // 21-30关：5×11到8×10的棋盘
    const gridSizes = [
      { rows: 5, cols: 11 }, // 第21关：72个白色方格
      { rows: 7, cols: 8 }, // 第22关：72个白色方格
      { rows: 6, cols: 10 }, // 第23关：77个白色方格
      { rows: 6, cols: 11 }, // 第24关：84个白色方格
      { rows: 5, cols: 13 }, // 第25关：84个白色方格
      { rows: 7, cols: 10 }, // 第26关：88个白色方格
      { rows: 6, cols: 12 }, // 第27关：91个白色方格
      { rows: 7, cols: 11 }, // 第28关：96个白色方格
      { rows: 7, cols: 11 }, // 第29关：96个白色方格
      { rows: 8, cols: 10 }, // 第30关：99个白色方格
    ];
    const grid = gridSizes[level - 21];
    return (grid.rows + 1) * (grid.cols + 1);
  }
  
  if (level >= 31 && level <= 50) {
    // 31-50关：8×11到8×15的棋盘
    const gridSizes = [
      { rows: 8, cols: 11 }, // 第31关：108个白色方格
      { rows: 7, cols: 13 }, // 第32关：112个白色方格
      { rows: 7, cols: 13 }, // 第33关：112个白色方格
      { rows: 8, cols: 12 }, // 第34关：117个白色方格
      { rows: 8, cols: 12 }, // 第35关：117个白色方格
      { rows: 8, cols: 12 }, // 第36关：117个白色方格
      { rows: 8, cols: 13 }, // 第37关：126个白色方格
      { rows: 8, cols: 13 }, // 第38关：126个白色方格
      { rows: 8, cols: 13 }, // 第39关：126个白色方格
      { rows: 8, cols: 14 }, // 第40关：135个白色方格
      { rows: 8, cols: 14 }, // 第41关：135个白色方格
      { rows: 8, cols: 14 }, // 第42关：135个白色方格
      { rows: 8, cols: 14 }, // 第43关：135个白色方格
      { rows: 8, cols: 15 }, // 第44关：144个白色方格
      { rows: 8, cols: 15 }, // 第45关：144个白色方格
      { rows: 8, cols: 15 }, // 第46关：144个白色方格
      { rows: 8, cols: 15 }, // 第47关：144个白色方格
      { rows: 8, cols: 15 }, // 第48关：144个白色方格
      { rows: 8, cols: 15 }, // 第49关：144个白色方格
      { rows: 8, cols: 15 }, // 第50关：144个白色方格
    ];
    const grid = gridSizes[level - 31];
    return (grid.rows + 1) * (grid.cols + 1);
  }
  
  // 51关以后：使用第50关的棋盘布局（8×15棋盘，144个白色方格）
  if (level >= 51) {
    // 第50关：8×15棋盘，144个白色方格
    return 144;
  }
}

// Get number distribution strategy based on level
function getNumberDistribution(level) {
  // 挑战模式使用与第130关相同的数字分布
  if (level === -1) { // 挑战模式标识
    return {
      smallNumbers: 0.2,  // 20% 1-3
      mediumNumbers: 0.4, // 40% 4-6
      largeNumbers: 0.4   // 40% 7-9，需要复杂组合
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
  const maxAttempts = isChallenge ? 10 : 3; // 挑战模式最多尝试10次，普通模式3次
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    const board = generateSingleBoard(level, ensureSolvable, isChallenge);
    if (board && (!ensureSolvable || hasValidCombinations(board.tiles, board.width, board.height))) {
      return board;
    }
    attempts++;
  }
  
  // 如果所有尝试都失败，返回最后一次生成的棋盘（即使无解）
  return generateSingleBoard(level, false, isChallenge);
}

// 生成单个棋盘的内部函数
function generateSingleBoard(level, ensureSolvable = true, isChallenge = false) {
  const seed = isChallenge ? 
    `challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : 
    `level_${level}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const random = seededRandom(seed);
  
  // 获取数字方块数量和布局
  let tileCount, rows, cols;
  
  if (isChallenge) {
    // 挑战模式：使用与第130关相同的配置（8×15棋盘，120个数字方块）
    rows = 8;
    cols = 15;
    tileCount = 120; // 8×15 = 120个数字方块
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
  
  // 数字方块数量应该等于白色方格数量（即整个棋盘）
  const finalTileCount = totalSlots; // 使用整个棋盘作为数字方块数量
  const maxTileRows = rows;
  const maxTileCols = cols;
  
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
  
  // Target triplets that sum to 10 (for level 1)
  const targetTriplets = [
    [1, 2, 7], [1, 3, 6], [1, 4, 5], [2, 2, 6], [2, 3, 5], [2, 4, 4], [3, 3, 4]
  ];
  
  // 确定目标配对的比例 - 前几关保证高比例的有效配对
  let targetPairRatio = 0.85; // 默认85%有效配对
  let adjacentPairRatio = 0.7; // 默认70%的配对是相邻的
  
  if (level === 1) {
    // 第一关：使用3个数字组合，更容易消除
    targetPairRatio = 0.0; // 不使用2个数字配对
    adjacentPairRatio = 0.0;
  } else if (level <= 5) {
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
  
  // 第一关特殊处理：生成3个数字组合
  if (level === 1) {
    const tripletCount = Math.floor(finalTileCount / 3); // 生成尽可能多的3个数字组合
    
    for (let i = 0; i < tripletCount; i++) {
      const tripletType = targetTriplets[Math.floor(random() * targetTriplets.length)];
      const [val1, val2, val3] = tripletType;
      
      // 寻找3个相邻位置（L形或直线形）
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
        
        // 尝试L形组合：右+下 或 下+右
        const lShapes = [
          [[0, 1], [1, 0]], // 右+下
          [[1, 0], [0, 1]]  // 下+右
        ];
        
        for (const shape of lShapes) {
          const [dir1, dir2] = shape;
          const row2 = row1 + dir1[0];
          const col2 = col1 + dir1[1];
          const row3 = row1 + dir2[0];
          const col3 = col1 + dir2[1];
          
          if (row2 >= 0 && row2 < maxTileRows && col2 >= 0 && col2 < maxTileCols &&
              row3 >= 0 && row3 < maxTileRows && col3 >= 0 && col3 < maxTileCols) {
            const pos2 = row2 * maxTileCols + col2;
            const pos3 = row3 * maxTileCols + col3;
            
            if (!placedPositions.has(pos2) && !placedPositions.has(pos3)) {
              numberTiles[pos1] = val1;
              numberTiles[pos2] = val2;
              numberTiles[pos3] = val3;
              placedPositions.add(pos1);
              placedPositions.add(pos2);
              placedPositions.add(pos3);
              placed = true;
              break;
            }
          }
        }
        
        attempts++;
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
    if (level <= 10 && !isChallenge) {
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
      
    } else if (!isChallenge) {
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
        
        for (let i = 0; i < remainingTiles.length && difference !== 0; i++) {
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
        
      } else {
        // 如果目标剩余总和不合理，使用简单填充但确保10的倍数
        
        // 简单填充为1，然后调整最后几个数字使总和为10的倍数
        for (let i = 0; i < remainingTiles.length; i++) {
          remainingTiles[i] = 1;
        }
        
        const currentTotal = currentSum + remainingTiles.length;
        const targetTotal = Math.ceil(currentTotal / 10) * 10;
        const needed = targetTotal - currentTotal;
        
        // 在最后几个位置添加需要的数值
        for (let i = remainingTiles.length - 1; i >= 0 && needed > 0; i--) {
          const canAdd = Math.min(8, needed); // 最多加到9
          remainingTiles[i] += canAdd;
          needed -= canAdd;
        }
      }
    } else {
      // 挑战模式的逻辑保持不变
      // ... (挑战模式代码)
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
  
  // 将数字方块直接放置到棋盘上（填满整个棋盘）
  for (let i = 0; i < finalTileCount; i++) {
    tiles[i] = numberTiles[i];
  }
  
    
  
  return {
    seed,
    width: cols,  // 棋盘总宽度
    height: rows, // 棋盘总高度
    tiles,
    layoutConfig, // 包含完整的布局信息
  };
}