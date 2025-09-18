/**
 * Game Logic Utilities - Core game mechanics and validation
 * Purpose: Provide game logic functions for tile validation, scoring, and board state management
 * Features: Rectangle validation, sum calculation, move validation
 */

/**
 * Check if a selection forms a valid rectangle
 * @param {Object} selection - Selection object with startRow, startCol, endRow, endCol
 * @returns {boolean} True if selection is a valid rectangle
 */
export function isValidRectangle(selection) {
  if (!selection) return false;
  
  const { startRow, startCol, endRow, endCol } = selection;
  
  // Must have valid coordinates
  if (startRow < 0 || startCol < 0 || endRow < 0 || endCol < 0) {
    return false;
  }
  
  // Rectangle must have area > 0
  if (startRow === endRow && startCol === endCol) {
    return false;
  }
  
  return true;
}

/**
 * Get tiles within a rectangular selection
 * @param {Array} tiles - Board tiles array
 * @param {number} width - Board width
 * @param {number} height - Board height
 * @param {Object} selection - Selection coordinates
 * @returns {Array} Array of selected tile objects
 */
export function getSelectedTiles(tiles, width, height, selection) {
  if (!selection || !tiles) return [];
  
  const { startRow, startCol, endRow, endCol } = selection;
  const minRow = Math.min(startRow, endRow);
  const maxRow = Math.max(startRow, endRow);
  const minCol = Math.min(startCol, endCol);
  const maxCol = Math.max(startCol, endCol);
  
  const selectedTiles = [];
  
  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      if (row >= 0 && row < height && col >= 0 && col < width) {
        const index = row * width + col;
        const value = tiles[index];
        if (value > 0) {
          selectedTiles.push({ row, col, value, index });
        }
      }
    }
  }
  
  return selectedTiles;
}

/**
 * Calculate sum of selected tiles
 * @param {Array} selectedTiles - Array of tile objects
 * @returns {number} Sum of tile values
 */
export function calculateSum(selectedTiles) {
  if (!selectedTiles || selectedTiles.length === 0) return 0;
  return selectedTiles.reduce((sum, tile) => sum + tile.value, 0);
}

/**
 * Check if a move is valid (sum equals 10)
 * @param {Array} selectedTiles - Array of selected tile objects
 * @returns {boolean} True if sum equals 10
 */
export function isValidMove(selectedTiles) {
  const sum = calculateSum(selectedTiles);
  return sum === 10 && selectedTiles.length > 0;
}

/**
 * Clear tiles from board
 * @param {Array} tiles - Current board tiles
 * @param {Array} positions - Array of {row, col} positions to clear
 * @param {number} width - Board width
 * @returns {Array} New tiles array with cleared positions
 */
export function clearTiles(tiles, positions, width) {
  const newTiles = [...tiles];
  
  positions.forEach(pos => {
    const index = pos.row * width + pos.col;
    if (index >= 0 && index < newTiles.length) {
      newTiles[index] = 0;
    }
  });
  
  return newTiles;
}

/**
 * Check if board is completely empty
 * @param {Array} tiles - Board tiles array
 * @returns {boolean} True if all tiles are 0
 */
export function isBoardEmpty(tiles) {
  return tiles.every(tile => tile === 0);
}

/**
 * Check if board has any valid moves remaining
 * @param {Array} tiles - Board tiles array
 * @param {number} width - Board width
 * @param {number} height - Board height
 * @returns {boolean} True if valid moves exist
 */
export function hasValidMoves(tiles, width, height) {
  // Check all possible rectangles
  for (let startRow = 0; startRow < height; startRow++) {
    for (let startCol = 0; startCol < width; startCol++) {
      for (let endRow = startRow; endRow < height; endRow++) {
        for (let endCol = startCol; endCol < width; endCol++) {
          const selection = { startRow, startCol, endRow, endCol };
          const selectedTiles = getSelectedTiles(tiles, width, height, selection);
          
          if (isValidMove(selectedTiles)) {
            return true;
          }
        }
      }
    }
  }
  
  return false;
}

/**
 * Get hint for next valid move
 * @param {Array} tiles - Board tiles array
 * @param {number} width - Board width
 * @param {number} height - Board height
 * @returns {Object|null} Selection object for hint, or null if no moves
 */
export function getHint(tiles, width, height) {
  // Find first valid move
  for (let startRow = 0; startRow < height; startRow++) {
    for (let startCol = 0; startCol < width; startCol++) {
      for (let endRow = startRow; endRow < height; endRow++) {
        for (let endCol = startCol; endCol < width; endCol++) {
          const selection = { startRow, startCol, endRow, endCol };
          const selectedTiles = getSelectedTiles(tiles, width, height, selection);
          
          if (isValidMove(selectedTiles)) {
            return selection;
          }
        }
      }
    }
  }
  
  return null;
}

/**
 * Calculate score based on tiles cleared and level
 * @param {number} tilesCleared - Number of tiles cleared
 * @param {number} level - Current level
 * @returns {number} Score points earned
 */
export function calculateScore(tilesCleared, level = 1) {
  const baseScore = tilesCleared * 10;
  const levelMultiplier = Math.floor(level / 10) + 1;
  return baseScore * levelMultiplier;
}

/**
 * Swap two tiles on the board
 * @param {Array} tiles - Current board tiles
 * @param {number} index1 - First tile index
 * @param {number} index2 - Second tile index
 * @returns {Array} New tiles array with swapped values
 */
export function swapTiles(tiles, index1, index2) {
  if (index1 < 0 || index1 >= tiles.length || index2 < 0 || index2 >= tiles.length) {
    return tiles;
  }
  
  const newTiles = [...tiles];
  const temp = newTiles[index1];
  newTiles[index1] = newTiles[index2];
  newTiles[index2] = temp;
  
  return newTiles;
}

/**
 * Get IQ title based on score
 * @param {number} iq - IQ score
 * @returns {string} IQ title
 */
export function getIQTitle(iq) {
  if (iq >= 145) return 'Cosmic Genius';
  if (iq >= 130) return 'Puzzle Master';
  if (iq >= 115) return 'Rising Star';
  if (iq >= 100) return 'Everyday Scholar';
  if (iq >= 85) return 'Hardworking Student';
  if (iq >= 70) return 'Slow but Steady';
  if (iq >= 65) return 'Little Explorer';
  if (iq >= 55) return 'Learning Hatchling';
  if (iq >= 40) return 'Tiny Adventurer';
  return 'Newborn Dreamer';
}