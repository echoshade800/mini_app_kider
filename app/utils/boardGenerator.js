/**
 * Board Generator - Generate game boards for levels and challenge mode
 * Purpose: Create number grids with appropriate difficulty and tile distribution
 * Features: Level-based difficulty scaling, guaranteed solvable puzzles
 */

/**
 * Get board dimensions based on level
 * @param {number} level - Level number
 * @returns {Object} Board dimensions {width, height}
 */
export function getBoardDimensions(level) {
  if (level <= 5) return { width: 4, height: 4 };      // Daycare: 4x4
  if (level <= 10) return { width: 4, height: 4 };     // Kindergarten: 4x4
  if (level <= 20) return { width: 5, height: 5 };     // Early Elementary: 5x5
  if (level <= 30) return { width: 6, height: 6 };     // Late Elementary: 6x6
  if (level <= 50) return { width: 7, height: 7 };     // Middle School: 7x7
  if (level <= 80) return { width: 8, height: 8 };     // High School: 8x8
  if (level <= 120) return { width: 9, height: 9 };    // College: 9x9
  if (level <= 160) return { width: 10, height: 10 };  // Career: 10x10
  if (level <= 200) return { width: 11, height: 11 };  // Life Stages: 11x11
  return { width: 12, height: 11 };                    // Beyond Reality: 12x11
}

/**
 * Get tile fill ratio based on level
 * @param {number} level - Level number
 * @returns {number} Fill ratio (0-1)
 */
export function getTileFillRatio(level) {
  if (level <= 10) return 0.6;    // Easy start
  if (level <= 30) return 0.7;    // Gradual increase
  if (level <= 60) return 0.75;   // Medium difficulty
  if (level <= 100) return 0.8;   // High difficulty
  if (level <= 150) return 0.85;  // Very high
  return 0.9;                     // Maximum density
}

/**
 * Get number distribution strategy based on level
 * @param {number} level - Level number
 * @returns {Object} Distribution weights
 */
export function getNumberDistribution(level) {
  if (level <= 20) {
    return {
      pairs: 0.7,      // 70% target pairs (1+9, 2+8, etc.)
      singles: 0.2,    // 20% single numbers
      fives: 0.1       // 10% fives (5+5=10)
    };
  }
  
  if (level <= 60) {
    return {
      pairs: 0.6,
      singles: 0.3,
      fives: 0.1
    };
  }
  
  if (level <= 120) {
    return {
      pairs: 0.5,
      singles: 0.4,
      fives: 0.1
    };
  }
  
  return {
    pairs: 0.4,
    singles: 0.5,
    fives: 0.1
  };
}

/**
 * Generate a seeded random number generator
 * @param {string} seed - Seed string
 * @returns {Function} Random function
 */
function createSeededRandom(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return function() {
    hash = ((hash * 1103515245) + 12345) & 0x7fffffff;
    return hash / 0x7fffffff;
  };
}

/**
 * Generate board for a specific level
 * @param {number} level - Level number
 * @returns {Object} Board data
 */
export function generateLevelBoard(level) {
  const seed = `level_${level}`;
  const random = createSeededRandom(seed);
  const { width, height } = getBoardDimensions(level);
  const totalTiles = width * height;
  const fillRatio = getTileFillRatio(level);
  const distribution = getNumberDistribution(level);
  
  // Initialize empty board
  const tiles = new Array(totalTiles).fill(0);
  
  // Calculate number of tiles to fill
  const tilesToFill = Math.floor(totalTiles * fillRatio);
  
  // Generate target pairs (sum to 10)
  const targetPairs = [
    [1, 9], [2, 8], [3, 7], [4, 6], [5, 5]
  ];
  
  // Place tiles based on distribution
  const pairTiles = Math.floor(tilesToFill * distribution.pairs / 2) * 2;
  const singleTiles = Math.floor(tilesToFill * distribution.singles);
  const fiveTiles = Math.floor(tilesToFill * distribution.fives);
  
  let placedCount = 0;
  const availablePositions = Array.from({ length: totalTiles }, (_, i) => i);
  
  // Shuffle available positions
  for (let i = availablePositions.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [availablePositions[i], availablePositions[j]] = [availablePositions[j], availablePositions[i]];
  }
  
  // Place target pairs
  for (let i = 0; i < pairTiles / 2 && placedCount < tilesToFill - 1; i++) {
    const pairType = targetPairs[Math.floor(random() * targetPairs.length)];
    const [val1, val2] = pairType;
    
    if (availablePositions.length >= 2) {
      const pos1 = availablePositions.pop();
      const pos2 = availablePositions.pop();
      
      tiles[pos1] = val1;
      tiles[pos2] = val2;
      placedCount += 2;
    }
  }
  
  // Place fives
  for (let i = 0; i < fiveTiles && placedCount < tilesToFill; i++) {
    if (availablePositions.length > 0) {
      const pos = availablePositions.pop();
      tiles[pos] = 5;
      placedCount++;
    }
  }
  
  // Fill remaining with random singles
  while (placedCount < tilesToFill && availablePositions.length > 0) {
    const pos = availablePositions.pop();
    tiles[pos] = Math.floor(random() * 9) + 1;
    placedCount++;
  }
  
  return {
    width,
    height,
    tiles,
    level,
    seed
  };
}

/**
 * Generate board for challenge mode
 * @returns {Object} Challenge board data
 */
export function generateChallengeBoard() {
  const seed = `challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const random = createSeededRandom(seed);
  
  // Challenge mode uses maximum difficulty
  const width = 12;
  const height = 11;
  const totalTiles = width * height;
  const fillRatio = 0.85; // High density for challenge
  
  // Initialize empty board
  const tiles = new Array(totalTiles).fill(0);
  
  // Calculate number of tiles to fill
  const tilesToFill = Math.floor(totalTiles * fillRatio);
  
  // Generate target pairs (sum to 10)
  const targetPairs = [
    [1, 9], [2, 8], [3, 7], [4, 6], [5, 5]
  ];
  
  // Challenge mode distribution (harder)
  const pairTiles = Math.floor(tilesToFill * 0.4 / 2) * 2; // 40% pairs
  const singleTiles = Math.floor(tilesToFill * 0.5);        // 50% singles
  const fiveTiles = Math.floor(tilesToFill * 0.1);          // 10% fives
  
  let placedCount = 0;
  const availablePositions = Array.from({ length: totalTiles }, (_, i) => i);
  
  // Shuffle available positions
  for (let i = availablePositions.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [availablePositions[i], availablePositions[j]] = [availablePositions[j], availablePositions[i]];
  }
  
  // Place target pairs
  for (let i = 0; i < pairTiles / 2 && placedCount < tilesToFill - 1; i++) {
    const pairType = targetPairs[Math.floor(random() * targetPairs.length)];
    const [val1, val2] = pairType;
    
    if (availablePositions.length >= 2) {
      const pos1 = availablePositions.pop();
      const pos2 = availablePositions.pop();
      
      tiles[pos1] = val1;
      tiles[pos2] = val2;
      placedCount += 2;
    }
  }
  
  // Place fives
  for (let i = 0; i < fiveTiles && placedCount < tilesToFill; i++) {
    if (availablePositions.length > 0) {
      const pos = availablePositions.pop();
      tiles[pos] = 5;
      placedCount++;
    }
  }
  
  // Fill remaining with random singles
  while (placedCount < tilesToFill && availablePositions.length > 0) {
    const pos = availablePositions.pop();
    tiles[pos] = Math.floor(random() * 9) + 1;
    placedCount++;
  }
  
  return {
    width,
    height,
    tiles,
    seed,
    isChallenge: true
  };
}

/**
 * Validate if a board has valid moves
 * @param {Array} tiles - Board tiles
 * @param {number} width - Board width
 * @param {number} height - Board height
 * @returns {boolean} True if valid moves exist
 */
export function hasValidMoves(tiles, width, height) {
  // Check all possible rectangles for sum = 10
  for (let startRow = 0; startRow < height; startRow++) {
    for (let startCol = 0; startCol < width; startCol++) {
      for (let endRow = startRow; endRow < height; endRow++) {
        for (let endCol = startCol; endCol < width; endCol++) {
          let sum = 0;
          let hasNumbers = false;
          
          // Calculate sum of rectangle
          for (let row = startRow; row <= endRow; row++) {
            for (let col = startCol; col <= endCol; col++) {
              const index = row * width + col;
              const value = tiles[index];
              if (value > 0) {
                sum += value;
                hasNumbers = true;
              }
            }
          }
          
          if (hasNumbers && sum === 10) {
            return true;
          }
        }
      }
    }
  }
  
  return false;
}