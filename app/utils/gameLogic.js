/**
 * Game Logic Utils - Board analysis and manipulation
 * Purpose: Provide game logic functions for board state analysis and rescue mechanisms
 */

// 检查两个位置是否可以形成有效的矩形选择
function canFormRectangle(pos1, pos2, width, height) {
  const row1 = Math.floor(pos1 / width);
  const col1 = pos1 % width;
  const row2 = Math.floor(pos2 / width);
  const col2 = pos2 % width;
  
  // 必须能形成矩形（包括线条）
  return (row1 === row2) || (col1 === col2) || 
         (Math.abs(row1 - row2) >= 1 && Math.abs(col1 - col2) >= 1);
}

// 获取矩形内的所有位置
function getRectanglePositions(pos1, pos2, width, height) {
  const row1 = Math.floor(pos1 / width);
  const col1 = pos1 % width;
  const row2 = Math.floor(pos2 / width);
  const col2 = pos2 % width;
  
  const minRow = Math.min(row1, row2);
  const maxRow = Math.max(row1, row2);
  const minCol = Math.min(col1, col2);
  const maxCol = Math.max(col1, col2);
  
  const positions = [];
  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      positions.push(row * width + col);
    }
  }
  
  return positions;
}

// 检查棋盘是否有可消除的组合
export function hasValidCombinations(tiles, width, height) {
  console.log('🔍 [GAME_LOGIC] hasValidCombinations called:', { 
    tilesLength: tiles.length, 
    width, 
    height,
    nonZeroCount: tiles.filter(t => t > 0).length
  });
  
  const size = width * height;
  let combinationsChecked = 0;
  let validCombinationsFound = 0;
  
  // 遍历所有可能的矩形组合
  for (let pos1 = 0; pos1 < size; pos1++) {
    if (tiles[pos1] === 0) continue;
    
    for (let pos2 = pos1; pos2 < size; pos2++) {
      if (tiles[pos2] === 0) continue;
      
      if (canFormRectangle(pos1, pos2, width, height)) {
        combinationsChecked++;
        const positions = getRectanglePositions(pos1, pos2, width, height);
        const sum = positions.reduce((acc, pos) => {
          return acc + (tiles[pos] || 0);
        }, 0);
        
        if (sum === 10) {
          validCombinationsFound++;
          console.log('✅ [GAME_LOGIC] Found valid combination:', {
            pos1, pos2, positions, sum,
            tiles: positions.map(p => tiles[p])
          });
          return true; // 找到可消除的组合
        }
      }
    }
  }
  
  console.log('❌ [GAME_LOGIC] No valid combinations found:', {
    combinationsChecked,
    validCombinationsFound
  });
  return false; // 没有可消除的组合
}

// 重新排列棋盘数字位置（保持数字不变，只改变位置）
export function reshuffleBoard(tiles, width, height) {
  const newTiles = [...tiles];
  const nonZeroValues = [];
  const nonZeroPositions = [];
  
  // 收集所有非零数字和它们的位置
  for (let i = 0; i < tiles.length; i++) {
    if (tiles[i] > 0) {
      nonZeroValues.push(tiles[i]);
      nonZeroPositions.push(i);
    }
  }
  
  // 打乱数字顺序
  for (let i = nonZeroValues.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [nonZeroValues[i], nonZeroValues[j]] = [nonZeroValues[j], nonZeroValues[i]];
  }
  
  // 将打乱后的数字放回原位置
  for (let i = 0; i < nonZeroPositions.length; i++) {
    newTiles[nonZeroPositions[i]] = nonZeroValues[i];
  }
  
  return newTiles;
}

// 检查消除规则是否有效
export function checkEliminationRules(selectedTiles) {
  if (selectedTiles.length === 0) return false;
  
  const sum = selectedTiles.reduce((acc, tile) => acc + tile.value, 0);
  return sum === 10;
}

// 检查棋盘是否完全清空
export function isBoardEmpty(tiles) {
  return tiles.every(tile => tile === 0);
}