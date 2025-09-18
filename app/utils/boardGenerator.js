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
    
    // Get available positions
    const availablePositions = [];
    for (let i = 0; i < size; i++) {
      if (!placedPositions.has(i)) {
        availablePositions.push(i);
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
  
  // Fill remaining spots with random numbers based on distribution
  const totalPlacedTiles = Array.from(placedPositions).length;
  const targetFillCount = Math.floor(size * 0.6); // 60% fill rate
  const remainingCount = Math.max(0, targetFillCount - totalPlacedTiles);
  
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