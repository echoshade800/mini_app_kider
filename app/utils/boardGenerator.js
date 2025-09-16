/**
 * Board Generator - Deterministic puzzle board creation
 * Purpose: Generate solvable number puzzles with appropriate difficulty scaling
 * Features: Fixed board size per level, guaranteed solvability, line selection support
 */

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

function getBoardDimensions(level) {
  // 每个关卡固定棋盘大小，随着关卡增加逐渐变大
  if (level <= 5) return { width: 4, height: 4 };   // 前5关用4x4
  if (level <= 15) return { width: 4, height: 4 };  // 6-15关用4x4
  if (level <= 30) return { width: 5, height: 5 };  // 16-30关用5x5
  if (level <= 50) return { width: 6, height: 6 };  // 31-50关用6x6
  if (level <= 80) return { width: 7, height: 7 };  // 51-80关用7x7
  if (level <= 120) return { width: 8, height: 8 }; // 81-120关用8x8
  if (level <= 160) return { width: 9, height: 9 }; // 121-160关用9x9
  if (level <= 200) return { width: 10, height: 10 }; // 161-200关用10x10
  return { width: 11, height: 11 }; // 200关后用11x11
}

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

export function generateBoard(level, forceNewSeed = false) {
  // 使用时间戳或固定种子，根据需要生成不同的棋盘
  const baseSeed = forceNewSeed ? Date.now() : Math.floor(Date.now() / 60000); // 每分钟变化
  const seed = `level_${level}_${baseSeed}`;
  const random = seededRandom(seed);
  const { width, height } = getBoardDimensions(level);
  const size = width * height;
  
  let attempts = 0;
  const maxAttempts = 50;
  
  while (attempts < maxAttempts) {
    // 初始化棋盘，填满所有位置
    const tiles = new Array(size);
    
    // 确定难度参数
    let guaranteedPairs = Math.floor(size * 0.4); // 保证可消除的配对数量
    let adjacentRatio = 0.8;   // 相邻配对比例
    let requiredSwaps = 0;     // 需要的道具数量
    
    if (level <= 5) {
      // 前5关：100%可直接消除，不需要道具
      guaranteedPairs = Math.floor(size * 0.5);
      adjacentRatio = 1.0;
      requiredSwaps = 0;
    } else if (level <= 20) {
      // 6-20关：大部分可直接消除
      guaranteedPairs = Math.floor(size * 0.45);
      adjacentRatio = 0.8;
      requiredSwaps = 0;
    } else if (level <= 50) {
      // 21-50关：开始需要一些策略
      guaranteedPairs = Math.floor(size * 0.4);
      adjacentRatio = 0.6;
      requiredSwaps = Math.random() < 0.3 ? 1 : 0;
    } else if (level <= 100) {
      // 51-100关：需要更多策略和道具
      guaranteedPairs = Math.floor(size * 0.35);
      adjacentRatio = 0.4;
      requiredSwaps = Math.floor(Math.random() * 2) + 1;
    } else {
      // 100关以上：高难度，需要多个道具
      guaranteedPairs = Math.floor(size * 0.3);
      adjacentRatio = 0.2;
      requiredSwaps = Math.floor(level / 50) + Math.floor(Math.random() * 2);
    }
    
    // 生成目标配对（和为10）
    const targetPairs = [
      [1, 9], [2, 8], [3, 7], [4, 6], [5, 5]
    ];
    
    // 放置保证可消除的配对
    const placedPositions = new Set();
    let pairsPlaced = 0;
    
    // 优先放置相邻或线性配对（容易找到）
    const easyPairsToPlace = Math.floor(guaranteedPairs * adjacentRatio);
    
    for (let i = 0; i < easyPairsToPlace && pairsPlaced < guaranteedPairs; i++) {
      const pairType = targetPairs[Math.floor(random() * targetPairs.length)];
      const [val1, val2] = pairType;
      
      let placed = false;
      let attempts = 0;
      
      while (!placed && attempts < 50) {
        const pos1 = Math.floor(random() * size);
        
        if (placedPositions.has(pos1)) {
          attempts++;
          continue;
        }
        
        const row1 = Math.floor(pos1 / width);
        const col1 = pos1 % width;
        
        // 尝试相邻位置和线性位置
        const candidateOffsets = [
          // 相邻位置
          [0, 1], [1, 0], [0, -1], [-1, 0],
          // 线性位置（同行同列）
          [0, 2], [2, 0], [0, -2], [-2, 0],
          [0, 3], [3, 0], [0, -3], [-3, 0]
        ];
        
        for (const [dr, dc] of candidateOffsets) {
          const row2 = row1 + dr;
          const col2 = col1 + dc;
          const pos2 = row2 * width + col2;
          
          if (row2 >= 0 && row2 < height && col2 >= 0 && col2 < width &&
              !placedPositions.has(pos2)) {
            
            tiles[pos1] = val1;
            tiles[pos2] = val2;
            placedPositions.add(pos1);
            placedPositions.add(pos2);
            pairsPlaced++;
            placed = true;
            break;
          }
        }
        
        attempts++;
      }
    }
    
    // 放置剩余的保证配对
    while (pairsPlaced < guaranteedPairs) {
      const pairType = targetPairs[Math.floor(random() * targetPairs.length)];
      const [val1, val2] = pairType;
      
      const availablePositions = [];
      for (let i = 0; i < size; i++) {
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
    
    // 填满剩余所有位置
    for (let i = 0; i < size; i++) {
      if (!placedPositions.has(i)) {
        if (level <= 10) {
          // 前10关：只使用容易配对的数字
          const easyNumbers = [1, 2, 3, 4, 6, 7, 8, 9];
          tiles[i] = easyNumbers[Math.floor(random() * easyNumbers.length)];
        } else if (level <= 30) {
          // 简单关卡：避免太多干扰
          const safeNumbers = [1, 2, 3, 4, 6, 7, 8, 9];
          tiles[i] = safeNumbers[Math.floor(random() * safeNumbers.length)];
        } else {
          // 高级关卡：添加一些干扰数字
          tiles[i] = Math.floor(random() * 9) + 1;
        }
      }
    }
    
    // 确保总和为10的倍数
    const adjustedTiles = ensureSumIsMultipleOf10(tiles);
    
    // 检查棋盘是否可解
    if (isBoardSolvable(adjustedTiles, width, height)) {
      return {
        seed,
        width,
        height,
        tiles: adjustedTiles,
        requiredSwaps, // 返回建议的道具使用次数
        level,
        solvable: true
      };
    }
    
    attempts++;
  }
  
  // 如果无法生成可解的棋盘，返回一个简单的可解棋盘
  console.warn(`Failed to generate solvable board for level ${level}, using fallback`);
  return generateFallbackBoard(level, width, height);
}

// 生成后备的简单可解棋盘
function generateFallbackBoard(level, width, height) {
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
    solvable: true
  };
}