/**
 * Board Generator - Deterministic puzzle board creation
 * Purpose: Generate solvable number puzzles with appropriate difficulty scaling
 * Features: Seeded RNG, difficulty progression, guaranteed solvability
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
  // 降低初期难度，从更小的棋盘开始
  if (level <= 5) return { width: 3, height: 3 };   // 前5关用3x3
  if (level <= 15) return { width: 4, height: 4 };  // 6-15关用4x4
  if (level <= 30) return { width: 5, height: 4 };  // 16-30关用5x4长方形
  if (level <= 50) return { width: 6, height: 5 };  // 31-50关用6x5长方形
  if (level <= 80) return { width: 7, height: 6 };  // 51-80关用7x6长方形
  if (level <= 120) return { width: 8, height: 7 }; // 81-120关用8x7长方形
  if (level <= 160) return { width: 9, height: 8 }; // 121-160关用9x8长方形
  if (level <= 200) return { width: 10, height: 9 }; // 161-200关用10x9长方形
  return { width: 11, height: 10 }; // 200关后用11x10长方形
}

export function generateBoard(level) {
  const seed = `level_${level}`;
  const random = seededRandom(seed);
  const { width, height } = getBoardDimensions(level);
  const size = width * height;
  
  // 初始化棋盘，确保形成完整长方形
  const tiles = new Array(size);
  
  // Determine difficulty parameters
  let targetPairRatio = 0.8; // 更多的目标配对，降低难度
  let adjacentRatio = 0.8;   // 更多相邻配对，更容易找到
  let fillRatio = 1.0;       // 填满整个长方形
  
  if (level > 20) {
    targetPairRatio = 0.6; // Medium levels
    adjacentRatio = 0.6;
    fillRatio = 1.0;
  }
  
  if (level > 60) {
    targetPairRatio = 0.4; // Hard levels  
    adjacentRatio = 0.4;
    fillRatio = 1.0;
  }
  
  // Generate target pairs that sum to 10
  const targetPairs = [
    [1, 9], [2, 8], [3, 7], [4, 6], [5, 5]
  ];
  
  // 填满整个长方形
  const filledCount = size;
  const pairCount = Math.floor(filledCount / 2);
  
  // Place target pairs
  const placedPositions = new Set();
  let pairsPlaced = 0;
  
  // Place adjacent pairs (easy to find)
  const adjacentPairsToPlace = Math.floor(pairCount * adjacentRatio);
  
  for (let i = 0; i < adjacentPairsToPlace && pairsPlaced < pairCount; i++) {
    const pairType = targetPairs[Math.floor(random() * targetPairs.length)];
    const [val1, val2] = pairType;
    
    // Find adjacent positions
    let attempts = 0;
    while (attempts < 50) {
      const pos1 = Math.floor(random() * size);
      const row1 = Math.floor(pos1 / width);
      const col1 = pos1 % width;
      
      // Try adjacent positions
      const adjacentOffsets = [
        [0, 1], [1, 0], [0, -1], [-1, 0] // right, down, left, up
      ];
      
      for (const [dr, dc] of adjacentOffsets) {
        const row2 = row1 + dr;
        const col2 = col1 + dc;
        const pos2 = row2 * width + col2;
        
        if (row2 >= 0 && row2 < height && col2 >= 0 && col2 < width &&
            !placedPositions.has(pos1) && !placedPositions.has(pos2)) {
          
          tiles[pos1] = val1;
          tiles[pos2] = val2;
          placedPositions.add(pos1);
          placedPositions.add(pos2);
          pairsPlaced++;
          break;
        }
      }
      
      if (placedPositions.has(pos1)) break;
      attempts++;
    }
  }
  
  // Place remaining pairs randomly
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
  
  // 填充剩余位置，确保没有空位
  for (let i = 0; i < size; i++) {
    if (!placedPositions.has(i)) {
      // 根据难度添加干扰数字
      if (level <= 10) {
        // 简单关卡：主要使用容易配对的数字
        const easyNumbers = [1, 2, 3, 4, 6, 7, 8, 9];
        tiles[i] = easyNumbers[Math.floor(random() * easyNumbers.length)];
      } else if (level <= 40) {
        // 中等关卡：少量5作为干扰
        tiles[i] = random() < 0.1 ? 5 : Math.floor(random() * 9) + 1;
      } else {
        // 困难关卡：更多5和其他干扰数字
        tiles[i] = random() < 0.3 ? 5 : Math.floor(random() * 9) + 1;
      }
    }
  }
  
  return {
    seed,
    width,
    height,
    tiles,
  };
}