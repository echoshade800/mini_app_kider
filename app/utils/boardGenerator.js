/**
 * Board Generator - 棋盘生成算法
 * Purpose: 为关卡模式和挑战模式生成合适的数字棋盘
 */

import { getLevelGridSize, getChallengeGridSize } from './layout';

// 确定性随机数生成器
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
 * 生成关卡棋盘
 * @param {number} level - 关卡等级
 * @param {boolean} forceNew - 是否强制生成新棋盘
 * @param {boolean} isChallenge - 是否为挑战模式
 * @returns {Object} 棋盘数据
 */
export function generateBoard(level, forceNew = false, isChallenge = false) {
  const seed = forceNew ? 
    `${isChallenge ? 'challenge' : 'level'}_${level}_${Date.now()}_${Math.random()}` :
    `${isChallenge ? 'challenge' : 'level'}_${level}`; // 关卡模式使用固定种子，挑战模式使用随机种子
  
  const random = seededRandom(seed);
  const { rows, cols } = isChallenge ? getChallengeGridSize() : getLevelGridSize(level);
  const size = rows * cols;
  
  // 初始化空棋盘
  const tiles = new Array(size).fill(0);
  
  // 根据关卡确定难度参数
  let targetPairRatio = 0.6; // 保证配对比例
  let adjacentRatio = 0.6;   // 相邻配对比例
  let fillRatio = 0.7;       // 填充比例
  
  if (level > 40 || isChallenge) {
    targetPairRatio = 0.4;
    adjacentRatio = 0.3;
    fillRatio = 0.75;
  }
  
  if (level > 90 || isChallenge) {
    targetPairRatio = 0.25;
    adjacentRatio = 0.15;
    fillRatio = 0.8;
  }
  
  // 挑战模式使用更高难度
  if (isChallenge) {
    targetPairRatio = 0.4; // 保证有足够的可消除组合
    adjacentRatio = 0.2;
    fillRatio = 0.85; // 更高的填充率
  }
  
  // 目标配对（和为10）
  const targetPairs = [
    [1, 9], [2, 8], [3, 7], [4, 6], [5, 5]
  ];
  
  // 计算填充的方块数量
  const filledCount = Math.floor(size * fillRatio);
  const pairCount = Math.floor(filledCount / 2);
  
  // 放置目标配对
  const placedPositions = new Set();
  let pairsPlaced = 0;
  
  // 放置相邻配对（容易找到）
  const adjacentPairsToPlace = Math.floor(pairCount * adjacentRatio);
  
  for (let i = 0; i < adjacentPairsToPlace && pairsPlaced < pairCount; i++) {
    const pairType = targetPairs[Math.floor(random() * targetPairs.length)];
    const [val1, val2] = pairType;
    
    // 寻找相邻位置
    let attempts = 0;
    while (attempts < 50) {
      const pos1 = Math.floor(random() * size);
      const row1 = Math.floor(pos1 / cols);
      const col1 = pos1 % cols;
      
      // 尝试相邻位置
      const adjacentOffsets = [
        [0, 1], [1, 0], [0, -1], [-1, 0] // 右、下、左、上
      ];
      
      for (const [dr, dc] of adjacentOffsets) {
        const row2 = row1 + dr;
        const col2 = col1 + dc;
        const pos2 = row2 * cols + col2;
        
        if (row2 >= 0 && row2 < rows && col2 >= 0 && col2 < cols &&
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
  
  // 放置剩余的随机配对
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
  
  // 填充剩余位置（增加难度）
  const remainingCount = filledCount - (pairsPlaced * 2);
  const availablePositions = [];
  for (let i = 0; i < size; i++) {
    if (!placedPositions.has(i)) {
      availablePositions.push(i);
    }
  }
  
  for (let i = 0; i < Math.min(remainingCount, availablePositions.length); i++) {
    const pos = availablePositions[i];
    
    // 根据难度添加干扰数字
    if (level > 90 || isChallenge) {
      // 高难度：更多5和其他干扰
      tiles[pos] = random() < 0.4 ? 5 : Math.floor(random() * 9) + 1;
    } else if (level > 40) {
      // 中等难度：一些干扰
      tiles[pos] = random() < 0.2 ? 5 : Math.floor(random() * 9) + 1;
    } else {
      // 简单难度：最少干扰
      tiles[pos] = Math.floor(random() * 9) + 1;
    }
  }
  
  return {
    seed,
    width: cols,
    height: rows,
    tiles,
  };
}

/**
 * 生成挑战模式棋盘
 * @returns {Object} 挑战模式棋盘数据
 */
export function generateChallengeBoard() {
  return generateBoard(130, true, true); // 使用高难度等级生成挑战模式棋盘
}