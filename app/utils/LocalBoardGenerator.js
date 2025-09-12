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

export function generateBoard(level) {
  const seed = `level_${level}`;
  const random = seededRandom(seed);
  const { width, height } = getBoardDimensions(level);
  const size = width * height;
  
  // Initialize empty board
  const tiles = new Array(size).fill(0);
  
  // Determine difficulty parameters
  let targetPairRatio = 0.6; // Easy levels
  let adjacentRatio = 0.6;
  let fillRatio = 0.7;
  
  if (level > 40) {
    targetPairRatio = 0.4; // Medium levels
    adjacentRatio = 0.3;
    fillRatio = 0.75;
  }
  
  if (level > 90) {
    targetPairRatio = 0.25; // Hard levels  
    adjacentRatio = 0.15;
    fillRatio = 0.8;
  }
  
  // Generate target pairs that sum to 10
  const targetPairs = [
    [1, 9], [2, 8], [3, 7], [4, 6], [5, 5]
  ];
  
  // Calculate number of filled tiles
  const filledCount = Math.floor(size * fillRatio);
  const pairCount = Math.floor(filledCount / 2);
  
  // Place target pairs
  const placedPositions = new Set();
  let pairsPlaced = 0;
  
  // Place adjacent pairs (easy to find)
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
  
  // Place remaining pairs randomly
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
  
  // Fill remaining spots with random numbers (add difficulty)
  const remainingCount = filledCount - (pairsPlaced * 2);
  const availablePositions = [];
  for (let i = 0; i < size; i++) {
    if (!placedPositions.has(i)) {
      availablePositions.push(i);
    }
  }
  
  for (let i = 0; i < Math.min(remainingCount, availablePositions.length); i++) {
    const pos = availablePositions[i];
    
    // Add interference numbers based on difficulty
    if (level > 90) {
      // Hard levels: lots of 5s and other interference
      tiles[pos] = random() < 0.4 ? 5 : Math.floor(random() * 9) + 1;
    } else if (level > 40) {
      // Medium levels: some interference  
      tiles[pos] = random() < 0.2 ? 5 : Math.floor(random() * 9) + 1;
    } else {
      // Easy levels: minimal interference
      tiles[pos] = Math.floor(random() * 9) + 1;
    }
  }
  
  return {
    seed,
    width,
    height,
    tiles,
  };
}

export function generateChallengeBoard() {
  // Generate challenge board (high difficulty, similar to level 130+)
  const challengeLevel = 130 + Math.floor(Math.random() * 20);
  const board = generateBoard(challengeLevel);
  
  // Override seed for uniqueness
  board.seed = `challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  return board;
}