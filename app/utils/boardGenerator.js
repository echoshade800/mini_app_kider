/**
 * Board Generator - Generate game boards for different levels
 * Purpose: Create solvable puzzle boards with appropriate difficulty scaling
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

/**
 * 根据关卡获取棋盘尺寸
 * @param {number} level 关卡数
 * @param {boolean} isChallenge 是否为挑战模式
 * @returns {Object} 棋盘尺寸 {width, height}
 */
export function getBoardDimensions(level, isChallenge = false) {
  if (isChallenge) {
    // 挑战模式使用固定的大尺寸
    return { width: 16, height: 24 };
  }
  
  // 普通模式根据关卡渐进增加
  if (level <= 20) return { width: 12, height: 16 };
  if (level <= 50) return { width: 13, height: 18 };
  if (level <= 100) return { width: 14, height: 20 };
  return { width: 15, height: 22 };
}

/**
 * 根据关卡获取数字方块填充率
 * @param {number} level 关卡数 (1-200+)
 * @returns {number} 填充率 (0-1)
 */
export function getTileFillRatio(level) {
  // 关卡 → 填充率增长表（1–200）
  if (level >= 1 && level <= 10) {
    return 0.3;    // 新手引导，方块少
  }
  if (level >= 11 && level <= 20) {
    return 0.4;    // 逐步增加
  }
  if (level >= 21 && level <= 30) {
    return 0.5;
  }
  if (level >= 31 && level <= 50) {
    return 0.6;
  }
  if (level >= 51 && level <= 80) {
    return 0.7;    // 中期稳态
  }
  if (level >= 81 && level <= 120) {
    return 0.75;
  }
  if (level >= 121 && level <= 200) {
    return 0.8;    // 高难度
  }
  
  // 200关以后继续使用高填充率
  return 0.8;
}

/**
 * 根据关卡获取数字分布策略
 * @param {number} level 关卡数
 * @returns {Object} 数字分布配置
 */
export function getNumberDistribution(level) {
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

/**
 * 生成游戏棋盘
 * @param {number} level 关卡数
 * @param {boolean} isChallenge 是否为挑战模式
 * @param {boolean} ensureSolvable 是否确保可解
 * @returns {Object} 棋盘数据
 */
export function generateBoard(level, isChallenge = false, ensureSolvable = true) {
  const seed = isChallenge ? 
    `challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : 
    `level_${level}`;
  
  const random = seededRandom(seed);
  const { width, height } = getBoardDimensions(level, isChallenge);
  const size = width * height;
  
  // 初始化空棋盘
  const tiles = new Array(size).fill(0);
  
  // 获取难度参数
  const fillRatio = getTileFillRatio(level);
  const distribution = getNumberDistribution(level);
  
  // 计算填充数量
  const filledCount = Math.floor(size * fillRatio);
  
  // 生成目标配对（和为10）
  const targetPairs = [
    [1, 9], [2, 8], [3, 7], [4, 6], [5, 5]
  ];
  
  // 确定配对数量
  let pairCount = Math.floor(filledCount * 0.4); // 40%的方块用于配对
  if (ensureSolvable) {
    pairCount = Math.max(pairCount, Math.floor(filledCount * 0.3)); // 至少30%配对
  }
  
  const placedPositions = new Set();
  let pairsPlaced = 0;
  
  // 放置配对方块
  while (pairsPlaced < pairCount) {
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
  
  // 填充剩余位置
  const remainingCount = filledCount - (pairsPlaced * 2);
  const availablePositions = [];
  for (let i = 0; i < size; i++) {
    if (!placedPositions.has(i)) {
      availablePositions.push(i);
    }
  }
  
  for (let i = 0; i < Math.min(remainingCount, availablePositions.length); i++) {
    const pos = availablePositions[i];
    
    // 根据分布策略生成数字
    const rand = random();
    let value;
    
    if (rand < distribution.smallNumbers) {
      value = Math.floor(random() * 3) + 1; // 1-3
    } else if (rand < distribution.smallNumbers + distribution.mediumNumbers) {
      value = Math.floor(random() * 3) + 4; // 4-6
    } else {
      value = Math.floor(random() * 3) + 7; // 7-9
    }
    
    tiles[pos] = value;
  }
  
  return {
    seed,
    width,
    height,
    tiles,
    level: isChallenge ? 'challenge' : level,
    isChallenge
  };
}