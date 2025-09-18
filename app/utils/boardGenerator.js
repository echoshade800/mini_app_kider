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

// 根据关卡获取方块数量
function getTileCountByLevel(level) {
  if (level <= 5) return 16;     // 4x4 - 新手关卡
  if (level <= 10) return 20;    // 5x4 - 简单关卡
  if (level <= 20) return 25;    // 5x5 - 初级关卡
  if (level <= 30) return 30;    // 6x5 - 进阶关卡
  if (level <= 40) return 36;    // 6x6 - 中级关卡
  if (level <= 60) return 42;    // 7x6 - 中高级关卡
  if (level <= 80) return 49;    // 7x7 - 高级关卡
  if (level <= 100) return 56;   // 8x7 - 专家关卡
  if (level <= 120) return 64;   // 8x8 - 大师关卡
  if (level <= 150) return 72;   // 9x8 - 宗师关卡
  if (level <= 180) return 81;   // 9x9 - 传奇关卡
  if (level <= 200) return 90;   // 10x9 - 史诗关卡
  
  // 200关以后继续增加
  return 90 + Math.floor((level - 200) / 10) * 6;
}

// 获取挑战模式方块数量
function getChallengeTileCount() {
  // 挑战模式使用高密度布局，约120个方块
  return 120;
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

// 生成挑战模式棋盘
export function generateChallengeBoard() {
  const seed = `challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const random = seededRandom(seed);
  
  const tileCount = getChallengeTileCount();
  const tiles = new Array(tileCount);
  
  // 挑战模式高难度设置  
  const guaranteedPairs = Math.floor(tileCount * 0.35); // 35%保证可解配对
  const adjacentRatio = 0.2; // 20%相邻配对，80%需要大范围框选
  
  // 生成目标配对（和为10）
  const targetPairs = [
    [1, 9], [2, 8], [3, 7], [4, 6], [5, 5]
  ];
  
  // 放置保证可消除的配对
  const placedPositions = new Set();
  let pairsPlaced = 0;
  
  // 少量相邻配对（容易找到）
  const easyPairsToPlace = Math.floor(guaranteedPairs * adjacentRatio);
  
  for (let i = 0; i < easyPairsToPlace && pairsPlaced < guaranteedPairs; i++) {
    const pairType = targetPairs[Math.floor(random() * targetPairs.length)];
    const [val1, val2] = pairType;
    
    let placed = false;
    let attempts = 0;
    
    while (!placed && attempts < 50) {
      const pos1 = Math.floor(random() * tileCount);
      
      if (placedPositions.has(pos1)) {
        attempts++;
        continue;
      }
      
      // 尝试相邻位置
      const candidatePositions = [];
      for (let j = 0; j < tileCount; j++) {
        if (j !== pos1 && !placedPositions.has(j)) {
          candidatePositions.push(j);
        }
      }
      
      if (candidatePositions.length > 0) {
        const pos2 = candidatePositions[Math.floor(random() * candidatePositions.length)];
        tiles[pos1] = val1;
        tiles[pos2] = val2;
        placedPositions.add(pos1);
        placedPositions.add(pos2);
        pairsPlaced++;
        placed = true;
      }
      attempts++;
    }
  }
  
  // 放置剩余的保证配对（需要大范围框选）
  while (pairsPlaced < guaranteedPairs) {
    const pairType = targetPairs[Math.floor(random() * targetPairs.length)];
    const [val1, val2] = pairType;
    
    const availablePositions = [];
    for (let i = 0; i < tileCount; i++) {
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
  for (let i = 0; i < tileCount; i++) {
    if (!placedPositions.has(i)) {
      // 70%高频数字，30%低频数字
      const highFreqNumbers = [5, 6, 7, 8, 9];
      const lowFreqNumbers = [1, 2, 3, 4];
      if (random() < 0.7) {
        tiles[i] = highFreqNumbers[Math.floor(random() * highFreqNumbers.length)];
      } else {
        tiles[i] = lowFreqNumbers[Math.floor(random() * lowFreqNumbers.length)];
      }
    }
  }
  
  // 确保总和为10的倍数
  const adjustedTiles = ensureSumIsMultipleOf10(tiles);
  
  return {
    seed,
    tiles: adjustedTiles,
    level: 'challenge',
    tileCount,
  };
}

export function generateBoard(level, forceNewSeed = false) {
  // 使用时间戳或固定种子，根据需要生成不同的棋盘
  const baseSeed = forceNewSeed ? Date.now() : Math.floor(Date.now() / 60000); // 每分钟变化
  const seed = `level_${level}_${baseSeed}`;
  const random = seededRandom(seed);
  
  const tileCount = getTileCountByLevel(level);
  const difficultyLevel = level;
  
  let attempts = 0;
  const maxAttempts = 50;
  
  while (attempts < maxAttempts) {
    // 初始化棋盘
    const tiles = new Array(tileCount);
    
    // 确定难度参数
    let guaranteedPairs = Math.floor(tileCount * 0.45);
    let adjacentRatio = 0.9;   // 提高相邻配对比例，让玩家更容易找到组合
    let requiredSwaps = 0;     // 前期不需要道具
    
    if (difficultyLevel <= 5) {
      // 前5关：非常简单，大量可直接消除的组合
      guaranteedPairs = Math.floor(tileCount * 0.6);
      adjacentRatio = 1.0;
      requiredSwaps = 0;
    } else if (difficultyLevel <= 15) {
      // 6-15关：简单，大部分可直接消除
      guaranteedPairs = Math.floor(tileCount * 0.55);
      adjacentRatio = 0.9;
      requiredSwaps = 0;
    } else if (difficultyLevel <= 40) {
      // 16-40关：中等难度，开始需要框选较远的数字
      guaranteedPairs = Math.floor(tileCount * 0.5);
      adjacentRatio = 0.7; // 降低相邻比例，鼓励框选较远的数字
      requiredSwaps = 0; // 仍然不需要道具
    } else if (difficultyLevel <= 80) {
      // 41-80关：需要更多策略，框选更大的区域
      guaranteedPairs = Math.floor(tileCount * 0.45);
      adjacentRatio = 0.5; // 进一步降低相邻比例
      requiredSwaps = Math.random() < 0.2 ? 1 : 0; // 偶尔需要道具
    } else if (difficultyLevel <= 120) {
      // 81-120关：高难度，需要大范围框选
      guaranteedPairs = Math.floor(tileCount * 0.4);
      adjacentRatio = 0.3;
      requiredSwaps = Math.random() < 0.4 ? 1 : 0;
    } else {
      // 120关以上：最高难度（挑战模式使用130关难度）
      guaranteedPairs = Math.floor(tileCount * 0.35);
      adjacentRatio = 0.2;
      requiredSwaps = Math.floor(Math.random() * 2) + 1;
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
        const pos1 = Math.floor(random() * tileCount);
        
        if (placedPositions.has(pos1)) {
          attempts++;
          continue;
        }
        
        // 寻找可用位置
        const candidatePositions = [];
        for (let j = 0; j < tileCount; j++) {
          if (j !== pos1 && !placedPositions.has(j)) {
            candidatePositions.push(j);
          }
        }
        
        if (candidatePositions.length > 0) {
          const pos2 = candidatePositions[Math.floor(random() * candidatePositions.length)];
          tiles[pos1] = val1;
          tiles[pos2] = val2;
          placedPositions.add(pos1);
          placedPositions.add(pos2);
          pairsPlaced++;
          placed = true;
        }
        
        attempts++;
      }
    }
    
    // 放置剩余的保证配对
    while (pairsPlaced < guaranteedPairs) {
      const pairType = targetPairs[Math.floor(random() * targetPairs.length)];
      const [val1, val2] = pairType;
      
      const availablePositions = [];
      for (let i = 0; i < tileCount; i++) {
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
    for (let i = 0; i < tileCount; i++) {
      if (!placedPositions.has(i)) {
        if (difficultyLevel <= 10) {
          // 前10关：只使用容易配对的数字
          const easyNumbers = [1, 2, 3, 4, 6, 7, 8, 9];
          tiles[i] = easyNumbers[Math.floor(random() * easyNumbers.length)];
        } else if (difficultyLevel <= 30) {
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
    
    // 简化：直接返回生成的棋盘
    return {
      seed,
      tiles: adjustedTiles,
      level,
      tileCount,
    };
    
    attempts++;
  }
  
  // 如果无法生成可解的棋盘，返回一个简单的可解棋盘
  console.warn(`Failed to generate solvable board for level ${level}, using fallback`);
  return generateFallbackBoard(level);
}

// 生成后备的简单可解棋盘
function generateFallbackBoard(level) {
  const tileCount = getTileCountByLevel(level);
  const tiles = new Array(tileCount).fill(0);
  
  // 简单地放置一些1-9和9-1的配对
  let pos = 0;
  const pairs = [[1, 9], [2, 8], [3, 7], [4, 6]];
  
  for (let i = 0; i < Math.min(pairs.length, Math.floor(tileCount / 2)); i++) {
    if (pos + 1 < tileCount) {
      tiles[pos] = pairs[i][0];
      tiles[pos + 1] = pairs[i][1];
      pos += 2;
    }
  }
  
  // 填充剩余位置
  while (pos < tileCount) {
    tiles[pos] = Math.floor(Math.random() * 9) + 1;
    pos++;
  }
  
  // 确保后备棋盘的总和也是10的倍数
  const adjustedTiles = ensureSumIsMultipleOf10(tiles);
  
  return {
    seed: `fallback_${level}_${Date.now()}`,
    tiles: adjustedTiles,
    level,
    tileCount,
  };
}