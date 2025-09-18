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

// 关卡 → 激活矩形（行×列）映射表
function getActivationRect(level) {
  if (level >= 1 && level <= 10) return { rows: 6, cols: 4 };     // 24格
  if (level >= 11 && level <= 20) return { rows: 7, cols: 5 };    // 35格
  if (level >= 21 && level <= 30) return { rows: 8, cols: 6 };    // 48格
  if (level >= 31 && level <= 40) return { rows: 9, cols: 6 };    // 54格
  if (level >= 41 && level <= 50) return { rows: 9, cols: 7 };    // 63格
  if (level >= 51 && level <= 60) return { rows: 10, cols: 7 };   // 70格
  if (level >= 61 && level <= 70) return { rows: 10, cols: 8 };   // 80格
  if (level >= 71 && level <= 80) return { rows: 11, cols: 8 };   // 88格
  if (level >= 81 && level <= 90) return { rows: 11, cols: 9 };   // 99格
  if (level >= 91 && level <= 100) return { rows: 12, cols: 9 };  // 108格
  if (level >= 101 && level <= 110) return { rows: 12, cols: 10 }; // 120格
  if (level >= 111 && level <= 120) return { rows: 13, cols: 10 }; // 130格
  if (level >= 121 && level <= 130) return { rows: 13, cols: 11 }; // 143格
  if (level >= 131 && level <= 140) return { rows: 14, cols: 11 }; // 154格
  if (level >= 141 && level <= 150) return { rows: 14, cols: 12 }; // 168格
  if (level >= 151 && level <= 160) return { rows: 14, cols: 13 }; // 182格
  if (level >= 161 && level <= 170) return { rows: 14, cols: 14 }; // 196格
  if (level >= 171 && level <= 180) return { rows: 14, cols: 15 }; // 210格
  if (level >= 181 && level <= 190) return { rows: 14, cols: 17 }; // 238格
  if (level >= 191 && level <= 200) return { rows: 14, cols: 21 }; // 294格（满屏）
  
  // 200关以后继续使用满屏
  return { rows: 14, cols: 21 };
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

// 检查位置是否在激活矩形内
function isInActivationRect(row, col, rowOffset, colOffset, activeRows, activeCols) {
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
  
  // 统一使用 14×21格 棋盘
  const width = 14;
  const height = 21;
  
  // Get activation rectangle for this level
  const activationRect = getActivationRect(level);
  const activeRows = activationRect.rows;
  const activeCols = activationRect.cols;
  const activeSize = activeRows * activeCols;
  
  // Calculate centered position
  const { rowOffset, colOffset } = getActivationOffset(height, width, activeRows, activeCols);
  const size = width * height;
  
  // Initialize empty board
  const tiles = new Array(size).fill(0);
  
  // Get difficulty parameters  
  const distribution = getNumberDistribution(level);
  const targetCombinations = getTargetCombinations(level);
  const minDistance = getMinDistance(level);
  
  // Calculate number of combinations to place based on level
  let combinationCount;
  if (level <= 30) {
    combinationCount = Math.floor(size * 0.15); // 15% of board
  } else if (level <= 80) {
    combinationCount = Math.floor(size * 0.12); // 12% of board
  } else if (level <= 150) {
    combinationCount = Math.floor(size * 0.10); // 10% of board
  } else {
    combinationCount = Math.floor(size * 0.08); // 8% of board
  }
  
  const placedPositions = new Set();
  let combinationsPlaced = 0;
  // Place target combinations
  while (combinationsPlaced < combinationCount) {
    // Choose combination type based on availability
    const availableTypes = Object.keys(targetCombinations);
    const chosenType = availableTypes[Math.floor(random() * availableTypes.length)];
    const combinations = targetCombinations[chosenType];
    const combination = combinations[Math.floor(random() * combinations.length)];
    
    // Get available positions within activation rect only
    const availablePositions = [];
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const index = row * width + col;
        if (!placedPositions.has(index) && 
            isInActivationRect(row, col, rowOffset, colOffset, activeRows, activeCols)) {
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
  
  // Fill remaining spots in activation rect with random numbers
  const totalPlacedTiles = Array.from(placedPositions).length;
  const targetFillCount = Math.floor(activeSize * 0.6); // 60% of active area
  const remainingCount = Math.max(0, targetFillCount - totalPlacedTiles);
  
  const availablePositions = [];
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const index = row * width + col;
      if (!placedPositions.has(index) && 
          isInActivationRect(row, col, rowOffset, colOffset, activeRows, activeCols)) {
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
      activeSize
    }
  };
}