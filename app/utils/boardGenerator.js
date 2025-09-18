/**
 * Board Generator - Generate game boards with target pairs and difficulty scaling
 * Purpose: Create solvable puzzles with guaranteed 10-sum combinations
 * Features: Deterministic generation, difficulty progression, balanced distribution
 */

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

// Get tile fill ratio based on level difficulty
function getTileFillRatio(level) {
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
  
  // 统一使用 14×21格 棋盘
  const width = 14;
  const height = 21;
  const size = width * height;
  
  // Initialize empty board
  const tiles = new Array(size).fill(0);
  
  // Get difficulty parameters
  const fillRatio = getTileFillRatio(level);
  const distribution = getNumberDistribution(level);
  
  // Calculate number of filled tiles
  const filledCount = Math.floor(size * fillRatio);
  
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
  
  const pairCount = Math.floor((filledCount / 2) * targetPairRatio);
  const placedPositions = new Set();
  let pairsPlaced = 0;
  
  // Place target pairs
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
  
  // Fill remaining spots with random numbers based on distribution
  const remainingCount = filledCount - (pairsPlaced * 2);
  const availablePositions = [];
  for (let i = 0; i < size; i++) {
    if (!placedPositions.has(i)) {
      availablePositions.push(i);
    }
  }
  
  for (let i = 0; i < Math.min(remainingCount, availablePositions.length); i++) {
    const pos = availablePositions[i];
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
  };
}