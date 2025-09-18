/**
 * Board Generator - Generate game boards for different levels
 * Purpose: Create solvable puzzles with appropriate difficulty scaling
 * Features: Deterministic generation, guaranteed solutions, difficulty progression
 */

import { getTileFillRatio, getNumberDistribution } from './levelGrid';

/**
 * Deterministic random number generator using seed
 * @param {string} seed - Seed string for reproducible randomness
 * @returns {function} Random function that returns 0-1
 */
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
 * Get board dimensions based on level
 * @param {number} level - Level number
 * @returns {Object} Width and height
 */
function getBoardDimensions(level) {
  if (level <= 10) return { width: 4, height: 4 };
  if (level <= 20) return { width: 5, height: 5 };
  if (level <= 40) return { width: 6, height: 6 };
  if (level <= 60) return { width: 7, height: 7 };
  if (level <= 90) return { width: 8, height: 8 };
  if (level <= 120) return { width: 9, height: 9 };
  if (level <= 150) return { width: 10, height: 10 };
  if (level <= 180) return { width: 11, height: 11 };
  return { width: 12, height: 11 }; // Cap at 132 cells
}

/**
 * Generate a game board for a specific level
 * @param {number} level - Level number (1-200+)
 * @returns {Object} Board data with tiles, dimensions, and metadata
 */
export function generateBoard(level) {
  const seed = `level_${level}`;
  const random = seededRandom(seed);
  const { width, height } = getBoardDimensions(level);
  const size = width * height;
  
  // Initialize empty board
  const tiles = new Array(size).fill(0);
  
  // Get level-specific parameters
  const fillRatio = getTileFillRatio(level);
  const distribution = getNumberDistribution(level);
  
  // Calculate number of filled tiles
  const filledCount = Math.floor(size * fillRatio);
  
  // Generate target pairs that sum to 10
  const targetPairs = [
    [1, 9], [2, 8], [3, 7], [4, 6], [5, 5]
  ];
  
  // Determine how many guaranteed pairs to place
  const guaranteedPairRatio = Math.max(0.3, 0.8 - (level * 0.005)); // Decreases with level
  const guaranteedPairs = Math.floor((filledCount / 2) * guaranteedPairRatio);
  
  // Place guaranteed pairs
  const placedPositions = new Set();
  let pairsPlaced = 0;
  
  // Place some adjacent pairs for easier discovery (early levels)
  const adjacentPairRatio = level <= 30 ? 0.4 : (level <= 80 ? 0.2 : 0.1);
  const adjacentPairsToPlace = Math.floor(guaranteedPairs * adjacentPairRatio);
  
  for (let i = 0; i < adjacentPairsToPlace && pairsPlaced < guaranteedPairs; i++) {
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
  
  // Place remaining guaranteed pairs randomly
  while (pairsPlaced < guaranteedPairs) {
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
  
  // Fill remaining spots with numbers based on distribution
  const remainingCount = filledCount - (pairsPlaced * 2);
  const availablePositions = [];
  for (let i = 0; i < size; i++) {
    if (!placedPositions.has(i)) {
      availablePositions.push(i);
    }
  }
  
  for (let i = 0; i < Math.min(remainingCount, availablePositions.length); i++) {
    const pos = availablePositions[i];
    
    // Generate number based on distribution
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
    level,
    fillRatio,
    guaranteedPairs: pairsPlaced,
  };
}

/**
 * Generate a challenge mode board (high difficulty)
 * @returns {Object} Challenge board data
 */
export function generateChallengeBoard() {
  // Use high difficulty similar to level 130+
  const challengeLevel = 130 + Math.floor(Math.random() * 20);
  const board = generateBoard(challengeLevel);
  
  // Override seed for uniqueness
  board.seed = `challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  return board;
}

/**
 * Validate if a board has at least one valid solution
 * @param {Array} tiles - Board tiles array
 * @param {number} width - Board width
 * @param {number} height - Board height
 * @returns {boolean} True if board has valid solutions
 */
export function validateBoard(tiles, width, height) {
  // Check all possible rectangles for sum = 10
  for (let startRow = 0; startRow < height; startRow++) {
    for (let startCol = 0; startCol < width; startCol++) {
      for (let endRow = startRow; endRow < height; endRow++) {
        for (let endCol = startCol; endCol < width; endCol++) {
          let sum = 0;
          let hasNonZero = false;
          
          // Calculate sum of rectangle
          for (let row = startRow; row <= endRow; row++) {
            for (let col = startCol; col <= endCol; col++) {
              const index = row * width + col;
              const value = tiles[index];
              if (value > 0) {
                sum += value;
                hasNonZero = true;
              }
            }
          }
          
          // Found a valid solution
          if (hasNonZero && sum === 10) {
            return true;
          }
        }
      }
    }
  }
  
  return false;
}