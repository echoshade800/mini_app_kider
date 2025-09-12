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
  
  // 初始化棋盘
  const tiles = new Array(size);
  
  // 确定难度参数和所需道具数量
  let targetPairRatio = 0.9; // 保证大部分都是可消除的配对
  let adjacentRatio = 0.7;   // 相邻配对比例
  let guaranteedSolvable = true; // 保证可解
  
  if (level > 20) {
    targetPairRatio = 0.8; // 中等难度
    adjacentRatio = 0.5;
  }
  
  if (level > 60) {
    targetPairRatio = 0.7; // 困难关卡
    adjacentRatio = 0.3;
  }
  
  // 生成目标配对（和为10）
  const targetPairs = [
    [1, 9], [2, 8], [3, 7], [4, 6], [5, 5]
  ];
  
  // 计算填充的格子数量（不是全部填满）
  let fillRatio = 1.0; // 100%的格子都有数字，填满整个棋盘
  
  const filledCount = Math.floor(size * fillRatio);
  const pairCount = Math.floor(filledCount * targetPairRatio / 2);
  const singleCount = filledCount - (pairCount * 2);
  
  // 放置目标配对
  const placedPositions = new Set();
  let pairsPlaced = 0;
  
  // 放置相邻配对（容易找到）
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
  
  // 放置剩余配对
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
  
  // 填充单个数字（需要道具交换才能消除）
  const availablePositions = [];
  for (let i = 0; i < size; i++) {
    if (!placedPositions.has(i)) {
      availablePositions.push(i);
    }
  }
  
  // 计算需要的道具数量
  let requiredSwaps = 0;
  if (level > 30) requiredSwaps = 1;
  if (level > 60) requiredSwaps = 2;
  if (level > 100) requiredSwaps = 3;
  if (level > 150) requiredSwaps = Math.floor(level / 50);
  
  // 放置需要交换的单个数字
  for (let i = 0; i < Math.min(singleCount, availablePositions.length); i++) {
    const pos = availablePositions[i];
    
    if (i < requiredSwaps * 2) {
      // 放置需要交换的数字对
      const pairType = targetPairs[Math.floor(random() * targetPairs.length)];
      tiles[pos] = pairType[i % 2];
    } else {
      // 放置其他数字
      if (level <= 20) {
        // 简单关卡：避免太多干扰
        const safeNumbers = [1, 2, 3, 4, 6, 7, 8, 9];
        tiles[pos] = safeNumbers[Math.floor(random() * safeNumbers.length)];
      } else {
        // 高级关卡：添加一些干扰数字
        tiles[pos] = Math.floor(random() * 9) + 1;
      }
    }
  }
  
  // 填满剩余所有位置
  for (let i = 0; i < size; i++) {
    if (tiles[i] === undefined || tiles[i] === 0) {
      // 填充随机数字，确保棋盘完全填满
      if (level <= 20) {
        // 简单关卡：避免太多干扰
        const safeNumbers = [1, 2, 3, 4, 6, 7, 8, 9];
        tiles[i] = safeNumbers[Math.floor(random() * safeNumbers.length)];
      } else {
        // 高级关卡：添加一些干扰数字
        tiles[i] = Math.floor(random() * 9) + 1;
      }
    }
  }
  
  return {
    seed,
    width,
    height,
    tiles,
    requiredSwaps, // 返回建议的道具使用次数
  };
}