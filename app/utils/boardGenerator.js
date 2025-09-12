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
  // 使用时间戳确保每次都不同，但保持相同难度
  const timestamp = Date.now();
  const seed = `level_${level}_${timestamp}`;
  const random = seededRandom(seed);
  const { width, height } = getBoardDimensions(level);
  const size = width * height;
  
  // 初始化棋盘，填满所有位置
  const tiles = new Array(size);
  
  // 确定难度参数和所需道具数量
  let targetPairRatio = 1.0; // 前5关100%可消除配对
  let adjacentRatio = 0.8;   // 相邻配对比例
  let requiredSwaps = 0;     // 前5关不需要道具
  
  if (level > 5) {
    targetPairRatio = 0.9; // 90%可消除配对
    adjacentRatio = 0.6;
  }
  
  if (level > 30) {
    targetPairRatio = 0.8; // 80%可消除配对
    adjacentRatio = 0.4;
    requiredSwaps = 1;
  }
  
  if (level > 60) {
    targetPairRatio = 0.7; // 70%可消除配对
    adjacentRatio = 0.3;
    requiredSwaps = 2;
  }
  
  if (level > 100) {
    targetPairRatio = 0.6; // 60%可消除配对
    adjacentRatio = 0.2;
    requiredSwaps = 3;
  }
  
  if (level > 150) {
    targetPairRatio = 0.5; // 50%可消除配对
    adjacentRatio = 0.1;
    requiredSwaps = Math.floor(level / 50);
  }
  
  // 生成目标配对（和为10）
  const targetPairs = [
    [1, 9], [2, 8], [3, 7], [4, 6], [5, 5]
  ];
  
  // 计算配对数量
  const pairCount = Math.floor(size * targetPairRatio / 2);
  const singleCount = size - (pairCount * 2);
  
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
      
      // Try adjacent positions (including single line selections)
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
  
  // 填满剩余所有位置
  for (let i = 0; i < size; i++) {
    if (!placedPositions.has(i)) {
      // 填充随机数字，确保棋盘完全填满
      if (level <= 5) {
        // 前5关：只使用容易配对的数字
        const easyNumbers = [1, 2, 3, 4, 6, 7, 8, 9];
        tiles[i] = easyNumbers[Math.floor(random() * easyNumbers.length)];
      } else if (level <= 20) {
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