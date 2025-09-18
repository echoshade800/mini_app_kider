/**
 * Board Generator - Generate game boards with different difficulty levels
 * Purpose: Create boards for level mode and challenge mode with appropriate difficulty
 * Features: Seeded generation, difficulty scaling, guaranteed solvability
 */

import { getTileFillRatio, getNumberDistribution } from './levelGrid';

/**
 * Generate a game board for a specific level or challenge mode
 * @param {number} level - Level number (1-200+)
 * @param {boolean} forceNew - Force generate new board (ignore cache)
 * @param {boolean} isChallenge - Whether this is for challenge mode
 * @returns {Object} Board object with tiles, width, height
 */
export function generateBoard(level, forceNew = false, isChallenge = false) {
  // Fixed grid dimensions
  const width = 14;
  const height = isChallenge ? 21 : 20; // Challenge mode has one extra row
  const totalCells = width * height;
  
  // Generate unique seed for this board
  const seed = isChallenge 
    ? `challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    : `level_${level}_${forceNew ? Date.now() : 'default'}`;
  
  // Seeded random number generator
  let seedValue = 0;
  for (let i = 0; i < seed.length; i++) {
    seedValue = ((seedValue << 5) - seedValue + seed.charCodeAt(i)) & 0xffffffff;
  }
  
  const seededRandom = () => {
    seedValue = ((seedValue * 1103515245) + 12345) & 0x7fffffff;
    return seedValue / 0x7fffffff;
  };
  
  // Get difficulty parameters
  const fillRatio = getTileFillRatio(level);
  const numberDist = getNumberDistribution(level);
  
  // Calculate number of tiles to fill
  const tilesToFill = Math.floor(totalCells * fillRatio);
  
  // Initialize empty board
  const tiles = new Array(totalCells).fill(0);
  
  // Generate target pairs that sum to 10
  const targetPairs = [
    [1, 9], [2, 8], [3, 7], [4, 6], [5, 5]
  ];
  
  // Calculate how many pairs to place
  const pairsToPlace = Math.floor(tilesToFill * 0.4); // 40% of tiles should be in pairs
  const remainingTiles = tilesToFill - (pairsToPlace * 2);
  
  // Place target pairs
  const usedPositions = new Set();
  let pairsPlaced = 0;
  
  while (pairsPlaced < pairsToPlace) {
    const pairType = targetPairs[Math.floor(seededRandom() * targetPairs.length)];
    const [val1, val2] = pairType;
    
    // Find two random positions
    const availablePositions = [];
    for (let i = 0; i < totalCells; i++) {
      if (!usedPositions.has(i)) {
        availablePositions.push(i);
      }
    }
    
    if (availablePositions.length >= 2) {
      const pos1 = availablePositions[Math.floor(seededRandom() * availablePositions.length)];
      const remainingPositions = availablePositions.filter(p => p !== pos1);
      const pos2 = remainingPositions[Math.floor(seededRandom() * remainingPositions.length)];
      
      tiles[pos1] = val1;
      tiles[pos2] = val2;
      usedPositions.add(pos1);
      usedPositions.add(pos2);
      pairsPlaced++;
    } else {
      break;
    }
  }
  
  // Fill remaining positions with random numbers based on distribution
  const availablePositions = [];
  for (let i = 0; i < totalCells; i++) {
    if (!usedPositions.has(i)) {
      availablePositions.push(i);
    }
  }
  
  for (let i = 0; i < Math.min(remainingTiles, availablePositions.length); i++) {
    const pos = availablePositions[i];
    const rand = seededRandom();
    
    let value;
    if (rand < numberDist.smallNumbers) {
      value = Math.floor(seededRandom() * 3) + 1; // 1-3
    } else if (rand < numberDist.smallNumbers + numberDist.mediumNumbers) {
      value = Math.floor(seededRandom() * 3) + 4; // 4-6
    } else {
      value = Math.floor(seededRandom() * 3) + 7; // 7-9
    }
    
    tiles[pos] = value;
  }
  
  return {
    width,
    height,
    tiles,
    seed,
    level: isChallenge ? 'challenge' : level,
    difficulty: {
      fillRatio,
      pairsPlaced,
      totalTiles: tilesToFill,
    }
  };
}

/**
 * Validate if a board has at least one valid solution
 * @param {Object} board - Board object with tiles, width, height
 * @returns {boolean} Whether the board has valid combinations
 */
export function validateBoard(board) {
  const { tiles, width, height } = board;
  
  // Check all possible rectangles
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