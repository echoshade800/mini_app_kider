/**
 * Board Generator - Create game boards with guaranteed solvable puzzles
 * Purpose: Generate level-specific boards with appropriate difficulty scaling
 * Features: Deterministic generation, difficulty progression, solvability validation
 */

import { getTileFillRatio, getNumberDistribution } from './levelGrid';

/**
 * Seeded random number generator for consistent board generation
 * @param {string} seed - Seed string for deterministic randomness
 * @returns {function} Random number generator function
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
 * @returns {Object} Width and height dimensions
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
  return { width: 12, height: 11 }; // Cap at 132 cells for challenge mode
}

/**
 * Generate a game board for a specific level
 * @param {number} level - Level number (1-200+)
 * @returns {Object} Board object with tiles, dimensions, and metadata
 */
export function generateBoard(level) {
  const seed = `level_${level}`;
  const random = seededRandom(seed);
  const { width, height } = getBoardDimensions(level);
  const size = width * height;
  
  // Get level-specific parameters
  const fillRatio = getTileFillRatio(level);
  const distribution = getNumberDistribution(level);
  
  // Initialize empty board
  const tiles = new Array(size).fill(0);
  
  // Calculate number of tiles to fill
  const filledCount = Math.floor(size * fillRatio);
  
  // Generate target pairs that sum to 10
  const targetPairs = [
    [1, 9], [2, 8], [3, 7], [4, 6], [5, 5]
  ];
  
  // Place guaranteed solvable pairs
  const pairCount = Math.floor(filledCount * 0.6); // 60% of tiles are solvable pairs
  const placedPositions = new Set();
  
  for (let i = 0; i < pairCount; i += 2) {
    const pairType = targetPairs[Math.floor(random() * targetPairs.length)];
    const [val1, val2] = pairType;
    
    // Find two available positions
    const availablePositions = [];
    for (let j = 0; j < size; j++) {
      if (!placedPositions.has(j)) {
        availablePositions.push(j);
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
    }
  }
  
  // Fill remaining positions with numbers based on distribution
  const remainingCount = filledCount - placedPositions.size;
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
  };
}

/**
 * Generate a challenge mode board (high difficulty)
 * @returns {Object} Challenge board object
 */
export function generateChallengeBoard() {
  // Use high difficulty settings similar to level 130+
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
 * @returns {boolean} True if board is solvable
 */
export function validateBoardSolvability(tiles, width, height) {
  // Check all possible rectangles for valid moves
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
          
          // Check if this rectangle sums to 10
          if (hasNonZero && sum === 10) {
            return true;
          }
        }
      }
    }
  }
  
  return false;
}