/**
 * Board Generator - Generate game boards with target pairs and difficulty scaling
 * Purpose: Create solvable puzzles with guaranteed 10-sum combinations
 * Features: Level-based activation rectangles, centered placement, difficulty progression
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

// 默认棋盘格配置 - 独立于组件
const DEFAULT_BOARD_CONFIG = {
  gridCols: 14,
  gridRows: 21,
  maxCapacity: 294, // 14 * 21
  getTilePosition: (row, col) => ({
    x: col * 36, // 默认方块尺寸 + 间距
    y: row * 36
  })
};

// 获取棋盘配置 - 优先使用动态配置，否则使用默认配置
function getBoardConfig() {
  // 尝试获取动态配置
  if (typeof global !== 'undefined' && global.calculateEffectiveAreaLayout) {
    try {
      const dynamicLayout = global.calculateEffectiveAreaLayout();
      return {
        gridCols: dynamicLayout.gridCols,
        gridRows: dynamicLayout.gridRows,
        maxCapacity: dynamicLayout.gridCols * dynamicLayout.gridRows,
        getTilePosition: dynamicLayout.getTilePosition
      };
    } catch (error) {
      console.warn('Failed to get dynamic board config, using default:', error);
    }
  }
  
  // 使用默认配置
  return DEFAULT_BOARD_CONFIG;
}

// 重新设计的难度系统 - 基于棋盘格容量限制
function getTileFillCount(level) {
  const config = getBoardConfig();
  const maxCount = config.maxCapacity;
  
  // 1-200关的数字方块数量递进表
  if (level >= 1 && level <= 5) {
    return Math.floor(maxCount * 0.15); // ~44格 (新手引导)
  }
  if (level >= 6 && level <= 10) {
    return Math.floor(maxCount * 0.20); // ~59格 (幼儿园)
  }
  if (level >= 11 && level <= 20) {
    return Math.floor(maxCount * 0.25); // ~74格 (小学低年级)
  }
  if (level >= 21 && level <= 30) {
    return Math.floor(maxCount * 0.35); // ~103格 (小学高年级)
  }
  if (level >= 31 && level <= 45) {
    return Math.floor(maxCount * 0.45); // ~132格 (中学)
  }
  if (level >= 46 && level <= 65) {
    return Math.floor(maxCount * 0.55); // ~162格 (高中)
  }
  if (level >= 66 && level <= 85) {
    return Math.floor(maxCount * 0.65); // ~191格 (大学)
  }
  if (level >= 86 && level <= 100) {
    return Math.floor(maxCount * 0.75); // ~221格 (研究生/教授)
  }
  if (level >= 101 && level <= 150) {
    return Math.floor(maxCount * 0.85); // ~250格 (职业生涯)
  }
  if (level >= 151 && level <= 200) {
    return maxCount; // 294格 (人生阶段/超现实 - 最大填充)
  }
  
  // 200关以后保持最大填充
  return maxCount;
}

// 根据目标填充数量计算最佳矩形尺寸（在棋盘格限制内）
function calculateOptimalRect(targetCount) {
  const config = getBoardConfig();
  const maxCols = config.gridCols;
  const maxRows = config.gridRows;
  
  // 如果目标数量超过最大容量，返回最大尺寸
  if (targetCount >= maxCols * maxRows) {
    return { rows: maxRows, cols: maxCols };
  }
  
  let bestCols = 1;
  let bestRows = 1;
  let bestDiff = Math.abs(1 - targetCount);
  
  // 寻找最接近目标数量的矩形尺寸
  for (let cols = 1; cols <= maxCols; cols++) {
    for (let rows = 1; rows <= maxRows; rows++) {
      const actualCount = cols * rows;
      const diff = Math.abs(actualCount - targetCount);
      
      if (diff < bestDiff || (diff === bestDiff && actualCount <= targetCount)) {
        bestCols = cols;
        bestRows = rows;
        bestDiff = diff;
      }
      
      // 如果找到完全匹配，提前退出
      if (actualCount === targetCount) {
        return { rows, cols };
      }
    }
  }
  
  return { rows: bestRows, cols: bestCols };
}

// Get number distribution based on level difficulty
function getNumberDistribution(level) {
  if (level <= 30) {
    return {
      smallNumbers: 0.6,  // 1-3的比例
      mediumNumbers: 0.3, // 4-6的比例
      largeNumbers: 0.1   // 7-9的比例
    };
  } else if (level <= 80) {
    return {
      smallNumbers: 0.5,
      mediumNumbers: 0.4,
      largeNumbers: 0.1
    };
  } else {
    return {
      smallNumbers: 0.4,
      mediumNumbers: 0.4,
      largeNumbers: 0.2
    };
  }
}

// Get target combinations that sum to 10 based on level difficulty
function getTargetCombinations(level) {
  const combinations = {
    pairs: [[1, 9], [2, 8], [3, 7], [4, 6], [5, 5]],
    triples: [
      [1, 2, 7], [1, 3, 6], [1, 4, 5], [2, 3, 5],
      [1, 1, 8], [2, 2, 6], [3, 3, 4], [1, 2, 7]
    ],
    quads: [
      [1, 1, 1, 7], [1, 1, 2, 6], [1, 1, 3, 5], [1, 1, 4, 4],
      [1, 2, 2, 5], [1, 2, 3, 4], [2, 2, 2, 4], [2, 2, 3, 3]
    ]
  };

  // Determine which combinations to use based on level
  if (level <= 30) {
    return { pairs: combinations.pairs }; // Only pairs
  } else if (level <= 80) {
    return { 
      pairs: combinations.pairs,
      triples: combinations.triples.slice(0, 4) // First 4 triples
    };
  } else if (level <= 150) {
    return {
      pairs: combinations.pairs,
      triples: combinations.triples,
      quads: combinations.quads.slice(0, 4) // First 4 quads
    };
  } else {
    return combinations; // All combinations
  }
}

// Get minimum distance between numbers in a combination based on level
function getMinDistance(level) {
  if (level <= 50) return 1;  // Adjacent allowed
  if (level <= 100) return 2; // At least 1 tile apart
  if (level <= 150) return 3; // At least 2 tiles apart
  return 4; // At least 3 tiles apart
}

// Calculate Manhattan distance between two positions
function getManhattanDistance(pos1, pos2, width) {
  const row1 = Math.floor(pos1 / width);
  const col1 = pos1 % width;
  const row2 = Math.floor(pos2 / width);
  const col2 = pos2 % width;
  return Math.abs(row1 - row2) + Math.abs(col1 - col2);
}

// Check if positions meet minimum distance requirement
function checkDistanceRequirement(positions, minDistance, width) {
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      if (getManhattanDistance(positions[i], positions[j], width) < minDistance) {
        return false;
      }
    }
  }
  return true;
}

// Calculate centered position for activation rectangle
function getActivationOffset(boardHeight, boardWidth, activeRows, activeCols) {
  const rowOffset = Math.floor((boardHeight - activeRows) / 2);
  const colOffset = Math.floor((boardWidth - activeCols) / 2);
  return { rowOffset, colOffset };
}

// 检查位置是否在激活矩形内（整齐四边形区域）
function isInRectangularActivationArea(row, col, rowOffset, colOffset, activeRows, activeCols) {
  return row >= rowOffset && 
         row < rowOffset + activeRows && 
         col >= colOffset && 
         col < colOffset + activeCols;
}

// Generate a game board for the specified level
export function generateBoard(level, ensureSolvable = true, isChallenge = false) {
  const seed = isChallenge ? 
    `challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : 
    `level_${level}`;
  
  const random = seededRandom(seed);
  
  // 获取棋盘配置
  const config = getBoardConfig();
  const width = config.gridCols;
  const height = config.gridRows;
  
  let activeRows, activeCols, activeSize;
  
  if (isChallenge) {
    // 挑战模式：直接使用最大填充（整个棋盘）
    activeRows = height;
    activeCols = width;
    activeSize = width * height;
  } else {
    // 关卡模式：根据关卡获取目标填充数量，然后计算最佳矩形
    const targetFillCount = getTileFillCount(level);
    const optimalRect = calculateOptimalRect(targetFillCount);
    activeRows = optimalRect.rows;
    activeCols = optimalRect.cols;
    activeSize = activeRows * activeCols;
  }
  
  // Calculate centered position
  const { rowOffset, colOffset } = getActivationOffset(height, width, activeRows, activeCols);
  const size = width * height;
  
  // Initialize empty board
  const tiles = new Array(size).fill(0);
  
  // Get difficulty parameters  
  const distribution = getNumberDistribution(level);
  const targetCombinations = getTargetCombinations(level);
  const minDistance = getMinDistance(level);
  
  // 填充整个激活矩形区域（现在activeSize就是我们想要的填充数量）
  const actualFillCount = activeSize;
  
  // Calculate number of target combinations (pairs/triples/quads that sum to 10)
  const combinationRatio = level <= 50 ? 0.4 : level <= 100 ? 0.35 : 0.3;
  const combinationCount = Math.floor(actualFillCount * combinationRatio / 2.5); // Average combination size
  
  const placedPositions = new Set();
  let combinationsPlaced = 0;
  
  // Place target combinations
  while (combinationsPlaced < combinationCount) {
    // Choose combination type based on availability
    const availableTypes = Object.keys(targetCombinations);
    const chosenType = availableTypes[Math.floor(random() * availableTypes.length)];
    const combinations = targetCombinations[chosenType];
    const combination = combinations[Math.floor(random() * combinations.length)];
    
    // Get available positions within the centered rectangular activation area
    const availablePositions = [];
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const index = row * width + col;
        if (!placedPositions.has(index) && 
            isInRectangularActivationArea(row, col, rowOffset, colOffset, activeRows, activeCols)) {
          availablePositions.push(index);
        }
      }
    }
    
    if (availablePositions.length >= combination.length) {
      // Try to find positions that meet distance requirement
      let attempts = 0;
      let validPositions = null;
      
      while (attempts < 100 && !validPositions) {
        const positions = [];
        const tempAvailable = [...availablePositions];
        
        // Select positions for this combination
        for (let i = 0; i < combination.length; i++) {
          if (tempAvailable.length === 0) break;
          const randomIndex = Math.floor(random() * tempAvailable.length);
          positions.push(tempAvailable[randomIndex]);
          tempAvailable.splice(randomIndex, 1);
        }
        
        // Check if positions meet distance requirement
        if (positions.length === combination.length && 
            checkDistanceRequirement(positions, minDistance, width)) {
          validPositions = positions;
        }
        
        attempts++;
      }
      
      // Place the combination if valid positions found
      if (validPositions) {
        for (let i = 0; i < combination.length; i++) {
          tiles[validPositions[i]] = combination[i];
          placedPositions.add(validPositions[i]);
        }
        combinationsPlaced++;
      }
    } else {
      break;
    }
  }
  
  // Fill remaining spots in the centered rectangular activation area with random numbers
  const totalPlacedTiles = Array.from(placedPositions).length;
  const remainingCount = Math.max(0, actualFillCount - totalPlacedTiles);
  
  const availablePositions = [];
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const index = row * width + col;
      if (!placedPositions.has(index) && 
          isInRectangularActivationArea(row, col, rowOffset, colOffset, activeRows, activeCols)) {
        availablePositions.push(index);
      }
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
    activationRect: {
      rows: activeRows,
      cols: activeCols,
      rowOffset,
      colOffset,
      activeSize,
      targetFillCount: isChallenge ? activeSize : getTileFillCount(level),
      actualFillCount
    }
  };
}