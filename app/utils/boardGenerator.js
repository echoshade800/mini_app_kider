/**
 * Board Generator - Deterministic puzzle board creation
 * Purpose: Generate solvable number puzzles with appropriate difficulty scaling
 * Features: Tile count based generation, guaranteed solvability, rectangle selection support
 */
import { getTileCountByLevel, getChallengeTileCount } from './gridLayout';

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

// 检查两个位置是否可以形成有效的矩形选择
function canFormRectangle(pos1, pos2, cols) {
  const row1 = Math.floor(pos1 / cols);
  const col1 = pos1 % cols;
  const row2 = Math.floor(pos2 / cols);
  const col2 = pos2 % cols;
  
  // 必须在同一行或同一列，或者形成矩形
  return (row1 === row2) || (col1 === col2) || 
         (Math.abs(row1 - row2) >= 1 && Math.abs(col1 - col2) >= 1);
}

// 获取矩形内的所有位置
function getRectanglePositions(pos1, pos2, cols) {
  const row1 = Math.floor(pos1 / cols);
  const col1 = pos1 % cols;
  const row2 = Math.floor(pos2 / cols);
  const col2 = pos2 % cols;
  
  const minRow = Math.min(row1, row2);
  const maxRow = Math.max(row1, row2);
  const minCol = Math.min(col1, col2);
  const maxCol = Math.max(col1, col2);
  
  const positions = [];
  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      positions.push(row * cols + col);
    }
  }
  
  return positions;
}

// 检查棋盘是否可解
function isBoardSolvable(tiles, cols) {
  const workingTiles = [...tiles];
  const size = tiles.length;
  let maxIterations = 100; // 防止无限循环
  
  while (maxIterations > 0) {
    let foundSolution = false;
    
    // 尝试找到一个可以消除的矩形
    for (let pos1 = 0; pos1 < size && !foundSolution; pos1++) {
      if (workingTiles[pos1] === 0) continue;
      
      for (let pos2 = pos1; pos2 < size && !foundSolution; pos2++) {
        if (workingTiles[pos2] === 0) continue;
        
        if (canFormRectangle(pos1, pos2, cols)) {
          const positions = getRectanglePositions(pos1, pos2, cols);
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

// 生成挑战模式棋盘
export function generateChallengeBoard(screenWidth = 390, screenHeight = 844) {
  const seed = `challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const random = seededRandom(seed);
  
  const tileCount = getChallengeTileCount(screenWidth, screenHeight);
  const tiles = new Array(tileCount);
  
  const guaranteedPairs = Math.floor(tileCount * 0.35); // 35%保证可解配对
  const adjacentRatio = 0.2; // 20%相邻配对，80%需要大范围框选
  
  const targetPairs = [
    [1, 9], [2, 8], [3, 7], [4, 6], [5, 5]
  ];
  
  const placedPositions = new Set();
  let pairsPlaced = 0;
  
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
      const availablePositions = [];
      for (let j = 0; j < tileCount; j++) {
        if (!placedPositions.has(j)) {
          availablePositions.push(j);
        }
      }
      
      if (availablePositions.length >= 2) {
        const pos2 = availablePositions[Math.floor(random() * availablePositions.length)];
        if (pos2 !== pos1) {
          tiles[pos1] = val1;
          tiles[pos2] = val2;
          placedPositions.add(pos1);
          placedPositions.add(pos2);
          pairsPlaced++;
          placed = true;
        }
      }
      
      attempts++;
    }
  }
  
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
      const highFreqNumbers = [5, 6, 7, 8, 9];
      const lowFreqNumbers = [1, 2, 3, 4];
      if (random() < 0.7) {
        tiles[i] = highFreqNumbers[Math.floor(random() * highFreqNumbers.length)];
      } else {
        tiles[i] = lowFreqNumbers[Math.floor(random() * lowFreqNumbers.length)];
      }
    }
  }
  
  const adjustedTiles = ensureSumIsMultipleOf10(tiles);
  
  return {
    seed,
    tileCount,
    tiles: adjustedTiles,
    requiredSwaps: 0,
    level: 'challenge',
    solvable: true,
    isChallengeMode: true,
  };
}

export function generateBoard(level, forceNewSeed = false, isChallengeMode = false, screenWidth = 390, screenHeight = 844) {
  const baseSeed = forceNewSeed ? Date.now() : Math.floor(Date.now() / 60000); // 每分钟变化
  const seed = `level_${level}_${baseSeed}`;
  const random = seededRandom(seed);
  
  const tileCount = isChallengeMode 
    ? getChallengeTileCount(screenWidth, screenHeight)
    : getTileCountByLevel(level);
    
  const difficultyLevel = isChallengeMode ? 130 : level;
  
  let attempts = 0;
  const maxAttempts = 50;
  
  while (attempts < maxAttempts) {
    const tiles = new Array(tileCount);
    
    let guaranteedPairs = Math.floor(tileCount * 0.45);
    let adjacentRatio = 0.9;
    let requiredSwaps = 0;
    
    if (difficultyLevel <= 5) {
      guaranteedPairs = Math.floor(tileCount * 0.6);
      adjacentRatio = 1.0;
      requiredSwaps = 0;
    } else if (difficultyLevel <= 15) {
      guaranteedPairs = Math.floor(tileCount * 0.55);
      adjacentRatio = 0.9;
      requiredSwaps = 0;
    } else if (difficultyLevel <= 40) {
      guaranteedPairs = Math.floor(tileCount * 0.5);
      adjacentRatio = 0.7;
      requiredSwaps = 0;
    } else if (difficultyLevel <= 80) {
      guaranteedPairs = Math.floor(tileCount * 0.45);
      adjacentRatio = 0.5;
      requiredSwaps = Math.random() < 0.2 ? 1 : 0;
    } else if (difficultyLevel <= 120) {
      guaranteedPairs = Math.floor(tileCount * 0.4);
      adjacentRatio = 0.3;
      requiredSwaps = Math.random() < 0.4 ? 1 : 0;
    } else {
      guaranteedPairs = Math.floor(tileCount * 0.35);
      adjacentRatio = 0.2;
      requiredSwaps = Math.floor(Math.random() * 2) + 1;
    }
    
    const targetPairs = [
      [1, 9], [2, 8], [3, 7], [4, 6], [5, 5]
    ];
    
    const placedPositions = new Set();
    let pairsPlaced = 0;
    
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
        
        // 简化：直接寻找另一个空位置
        const availablePositions = [];
        for (let j = 0; j < tileCount; j++) {
          if (!placedPositions.has(j)) {
            availablePositions.push(j);
          }
        }
        
        if (availablePositions.length >= 2) {
          const pos2 = availablePositions[Math.floor(random() * availablePositions.length)];
          if (pos2 !== pos1) {
            tiles[pos1] = val1;
            tiles[pos2] = val2;
            placedPositions.add(pos1);
            placedPositions.add(pos2);
            pairsPlaced++;
            placed = true;
          }
        }
        attempts++;
      }
    }
    
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
        if (difficultyLevel <= 10) {
          const easyNumbers = [1, 2, 3, 4, 6, 7, 8, 9];
          tiles[i] = easyNumbers[Math.floor(random() * easyNumbers.length)];
        } else if (difficultyLevel <= 30) {
          const safeNumbers = [1, 2, 3, 4, 6, 7, 8, 9];
          tiles[i] = safeNumbers[Math.floor(random() * safeNumbers.length)];
        } else {
          if (isChallengeMode) {
            const highFreqNumbers = [5, 6, 7, 8, 9];
            const lowFreqNumbers = [1, 2, 3, 4];
            if (random() < 0.7) {
              tiles[i] = highFreqNumbers[Math.floor(random() * highFreqNumbers.length)];
            } else {
              tiles[i] = lowFreqNumbers[Math.floor(random() * lowFreqNumbers.length)];
            }
          } else {
            tiles[i] = Math.floor(random() * 9) + 1;
          }
        }
      }
    }
    
    const adjustedTiles = ensureSumIsMultipleOf10(tiles);
    
    return {
      seed,
      tileCount,
      tiles: adjustedTiles,
      requiredSwaps,
      level,
      solvable: true
    };
    
    attempts++;
  }
  
  console.warn(`Failed to generate solvable board for level ${level}, using fallback`);
  const fallbackTileCount = isChallengeMode 
    ? getChallengeTileCount(screenWidth, screenHeight) 
    : getTileCountByLevel(level);
  return generateFallbackBoard(level, fallbackTileCount, isChallengeMode, screenWidth, screenHeight);
}

function generateFallbackBoard(level, tileCount, isChallengeMode = false, screenWidth = 390, screenHeight = 844) {
  const tiles = new Array(tileCount).fill(0);
  
  let pos = 0;
  const pairs = [[1, 9], [2, 8], [3, 7], [4, 6]];
  
  for (let i = 0; i < Math.min(pairs.length, Math.floor(tileCount / 2)); i++) {
    if (pos + 1 < tileCount) {
      tiles[pos] = pairs[i][0];
      tiles[pos + 1] = pairs[i][1];
      pos += 2;
    }
  }
  
  while (pos < tileCount) {
    tiles[pos] = Math.floor(Math.random() * 9) + 1;
    pos++;
  }
  
  const adjustedTiles = ensureSumIsMultipleOf10(tiles);
  
  return {
    seed: `fallback_${level}_${Date.now()}`,
    tileCount,
    tiles: adjustedTiles,
    requiredSwaps: 0,
    level,
    solvable: true,
    isChallengeMode,
  };
}