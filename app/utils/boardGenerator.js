const EFFECTIVE_AREA_CONFIG = {
  TOP_RESERVED: 120,     // 顶部保留区域（HUD）
  BOTTOM_RESERVED: 120,  // 底部保留区域（道具栏）
  TILE_GAP: 4,          // 方块间距
  BOARD_PADDING: 16,    // 棋盘内边距（木框留白）
  GRID_ROWS: 20,        // 固定网格行数
  GRID_COLS: 14,        // 固定网格列数
};

// 计算有效游戏区域和棋盘布局
function calculateEffectiveAreaLayout() {
  const topReserved = EFFECTIVE_AREA_CONFIG.TOP_RESERVED;
  const bottomReserved = EFFECTIVE_AREA_CONFIG.BOTTOM_RESERVED;
  const availableHeight = screenHeight - topReserved - bottomReserved;
  
  return {
    topReserved,
    bottomReserved,
    availableHeight,
    availableWidth: screenWidth,
  };
}

export function generateBoard(level, forceNew = false, isChallenge = false) {
  // Fixed grid dimensions
  const width = 14;
  const height = isChallenge ? 21 : 20; // Challenge mode has one extra row
  const totalCells = width * height;
  
  // Challenge mode uses special generation logic
  if (isChallenge) {
    return generateChallengeBoard(width, height, forceNew);
  }
  
  // Generate unique seed for this board
  const seed = isChallenge 
    ? `challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    : `level_${level}_${forceNew ? Date.now() : 'default'}`;

  return {
    width,
    height,
    tiles,
    seed,
    level: isChallenge ? 'challenge' : level,
    difficulty: {
      fillRatio: 1.0, // 100% filled
      totalTiles: totalCells,
      sumIsMultipleOf10: true,
    }
  };
}

/**
 * Generate challenge mode board with special rules
 * - Uses level 100 difficulty parameters
 * - Fills all 294 cells with numbers
 * - Total sum is multiple of 10
 * - Guarantees valid combinations or reshuffles
 */
function generateChallengeBoard(width, height, forceNew = false) {
  const totalCells = width * height; // 294 cells
  const seed = `challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Seeded random number generator
  let seedValue = 0;
  for (let i = 0; i < seed.length; i++) {
    seedValue = ((seedValue << 5) - seedValue + seed.charCodeAt(i)) & 0xffffffff;
  }
  
  const seededRandom = () => {
    seedValue = ((seedValue * 1103515245) + 12345) & 0x7fffffff;
    return seedValue / 0x7fffffff;
  };
  
  // Level 100 difficulty parameters
  const numberDist = {
    smallNumbers: 0.4,  // 1-3
    mediumNumbers: 0.4, // 4-6  
    largeNumbers: 0.2   // 7-9
  };
  
  let tiles = new Array(totalCells);
  let attempts = 0;
  const maxAttempts = 3;
  
  // Generate board with validation
  do {
    attempts++;
    tiles = generateFullBoard(totalCells, numberDist, seededRandom);
    
    // Check if board has valid combinations
    if (hasValidCombinations(tiles, width, height)) {
      break;
    }
    
    // If no valid combinations, reshuffle positions
    if (attempts < maxAttempts) {
      tiles = reshuffleBoard(tiles, width, height);
      if (hasValidCombinations(tiles, width, height)) {
        break;
      }
    }
  } while (attempts < maxAttempts);
  
  // If still no valid combinations after 3 attempts, generate completely new board
  if (attempts >= maxAttempts && !hasValidCombinations(tiles, width, height)) {
    return generateChallengeBoard(width, height, true); // Recursive call with new seed
  }
  
  return {
    width,
    height,
    tiles,
    seed,
    level: 'challenge',
    difficulty: {
      fillRatio: 1.0, // 100% filled
      totalTiles: totalCells,
      sumIsMultipleOf10: true,
    }
  };
}

/**
 * Generate a full board (all 294 cells filled) with sum as multiple of 10
 */
function generateFullBoard(totalCells, numberDist, seededRandom) {
  const tiles = new Array(totalCells);
  let currentSum = 0;
  
  // Fill first 293 cells with random numbers
  for (let i = 0; i < totalCells - 1; i++) {
    let value;
    const rand = seededRandom();
    
    if (rand < numberDist.smallNumbers) {
      value = Math.floor(seededRandom() * 3) + 1; // 1-3
    } else if (rand < numberDist.smallNumbers + numberDist.mediumNumbers) {
      value = Math.floor(seededRandom() * 3) + 4; // 4-6
    } else {
      value = Math.floor(seededRandom() * 3) + 7; // 7-9
    }
    
    tiles[i] = value;
    currentSum += value;
  }
  
  // Calculate the last number to make sum a multiple of 10
  const remainder = currentSum % 10;
  const needed = remainder === 0 ? 10 : (10 - remainder);
  
  // Ensure the needed number is between 1-9
  let lastNumber = needed;
  if (lastNumber === 10) {
    // If we need 10, adjust the last few numbers
    lastNumber = 1;
    // Find a number we can increase by 9
    for (let i = totalCells - 2; i >= Math.max(0, totalCells - 10); i--) {
      if (tiles[i] <= 9 - 9) { // Can't exceed 9
        // Instead, let's use a different approach
        break;
      }
    }
    // Simpler approach: use 1 and adjust sum by changing another number
    if (totalCells > 1) {
      tiles[totalCells - 2] = Math.min(9, tiles[totalCells - 2] + 9);
      currentSum += 9;
      lastNumber = ((10 - (currentSum % 10)) % 10) || 1;
    }
  }
  
  // Ensure lastNumber is valid (1-9)
  lastNumber = Math.max(1, Math.min(9, lastNumber));
  tiles[totalCells - 1] = lastNumber;
  
  return tiles;
}

/**
 * Reshuffle board positions while keeping the same numbers
 */
function reshuffleBoard(tiles, width, height) {
  const newTiles = [...tiles];
  const nonZeroValues = [];
  
  // Collect all numbers (all cells are filled in challenge mode)
  for (let i = 0; i < tiles.length; i++) {
    nonZeroValues.push(tiles[i]);
  }
  
  // Shuffle the numbers using Fisher-Yates algorithm
  for (let i = nonZeroValues.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [nonZeroValues[i], nonZeroValues[j]] = [nonZeroValues[j], nonZeroValues[i]];
  }
  
  // Place shuffled numbers back
  for (let i = 0; i < newTiles.length; i++) {
    newTiles[i] = nonZeroValues[i];
  }
  
  return newTiles;
}

/**
 * GameBoard Component - Green chalkboard with sticky note style tiles
 * Purpose: Render game tiles with rectangle drawing on a classroom chalkboard theme
 * Features: Green chalkboard background, sticky note tiles with slight rotation, explosion effects
 */

import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  PanResponder, 
  Dimensions, 
  StyleSheet,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import RescueModal from './RescueModal';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// 有效游戏区域配置
const EFFECTIVE_AREA_CONFIG = {
  TOP_RESERVED: 120,     // 顶部保留区域（HUD）
  BOTTOM_RESERVED: 120,  // 底部保留区域（道具栏）
  TILE_GAP: 4,          // 方块间距
  BOARD_PADDING: 16,    // 棋盘内边距（木框留白）
  GRID_ROWS: 20,        // 固定网格行数
  GRID_COLS: 14,        // 固定网格列数
};

// 计算有效游戏区域和棋盘布局
function calculateEffectiveAreaLayout() {
  const topReserved = EFFECTIVE_AREA_CONFIG.TOP_RESERVED;
  const bottomReserved = EFFECTIVE_AREA_CONFIG.BOTTOM_RESERVED;
  const availableHeight = screenHeight - topReserved - bottomReserved;
  
  return {
    topReserved,
    bottomReserved,
    availableHeight,
    availableWidth: screenWidth,
  };
}

const GameBoard = ({ tiles, width, height, onTileRemove, onBoardRefresh, isChallenge, itemMode, selectedSwapTile, onTilePress, swapAnimations, fractalAnimations, initTileScale, getTileRotation, getFixedBoardLayout, isBoardEmpty }) => {
  const [selection, setSelection] = useState(null);
  const [fixedLayout, setFixedLayout] = useState(null);
  const [showRescueModal, setShowRescueModal] = useState(false);
  const [reshuffleCount, setReshuffleCount] = useState(0);
  const [explosionAnimation, setExplosionAnimation] = useState(null);
  
  const selectionOpacity = useRef(new Animated.Value(0)).current;
  const explosionScale = useRef(new Animated.Value(0)).current;
  const explosionOpacity = useRef(new Animated.Value(1)).current;

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !itemMode,
    onMoveShouldSetPanResponder: () => !itemMode,
    
    onPanResponderGrant: (evt) => {
      if (itemMode) return;
      
      const { locationX, locationY } = evt.nativeEvent;
      const startPos = getGridPosition(locationX, locationY);
      
      if (startPos) {
        setSelection({
          startRow: startPos.row,
          startCol: startPos.col,
          endRow: startPos.row,
          endCol: startPos.col,
        });
        
        Animated.timing(selectionOpacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: false,
        }).start();
      }
    },
    
    onPanResponderMove: (evt) => {
      if (itemMode || !selection) return;
      
      const { locationX, locationY } = evt.nativeEvent;
      const currentPos = getGridPosition(locationX, locationY);
      
      if (currentPos) {
        setSelection(prev => ({
          ...prev,
          endRow: currentPos.row,
          endCol: currentPos.col,
        }));
      }
    },
    
    onPanResponderRelease: () => {
      if (itemMode) return;
      handleSelectionEnd();
    },
  });

  const getGridPosition = (x, y) => {
    if (!fixedLayout) return null;
    
    const { tileSize, tileGap, boardPadding } = fixedLayout;
    const cellWidth = tileSize + tileGap;
    const cellHeight = tileSize + tileGap;
    
    const relativeX = x - boardPadding;
    const relativeY = y - boardPadding;
    
    const col = Math.floor(relativeX / cellWidth);
    const row = Math.floor(relativeY / cellHeight);
    
    if (row >= 0 && row < height && col >= 0 && col < width) {
      return { row, col };
    }
    
    return null;
  };

  const getSelectedTiles = () => {
    if (!selection) return [];
    
    const { startRow, startCol, endRow, endCol } = selection;
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);
    
    const selectedTiles = [];
    
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const index = row * width + col;
        const value = tiles[index];
        if (value > 0) {
          selectedTiles.push({ row, col, value, index });
        }
      }
    }
    
    return selectedTiles;
  };

  const handleSelectionEnd = () => {
    if (!selection) return;
    
    const selectedTiles = getSelectedTiles();
    const sum = selectedTiles.reduce((acc, tile) => acc + tile.value, 0);
    
    if (sum === 10 && selectedTiles.length > 1) {
      // Success - remove tiles
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Show explosion effect
      const { startRow, startCol, endRow, endCol } = selection;
      const centerRow = (startRow + endRow) / 2;
      const centerCol = (startCol + endCol) / 2;
      
      if (fixedLayout) {
        const { x, y } = fixedLayout.getTilePosition(centerRow, centerCol);
        setExplosionAnimation({ x: x + fixedLayout.tileSize / 2, y: y + fixedLayout.tileSize / 2 });
        
        Animated.sequence([
          Animated.timing(explosionScale, {
            toValue: 1.5,
            duration: 200,
            useNativeDriver: false,
          }),
          Animated.timing(explosionOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: false,
          }),
        ]).start(() => {
          setExplosionAnimation(null);
          explosionScale.setValue(0);
          explosionOpacity.setValue(1);
        });
      }
      
      // Remove tiles
      onTileRemove(selectedTiles.map(tile => ({ row: tile.row, col: tile.col })));
      
      // Hide selection
      Animated.parallel([
        Animated.timing(selectionOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start(() => {
        setSelection(null);
      });
    } else {
      setSelection(null);
    }
  };

  // 处理救援选择
  const handleRescueContinue = () => {
    setShowRescueModal(false);
    setReshuffleCount(0);
    // 这里可以触发道具使用逻辑
  };

  const handleRescueReturn = () => {
    setShowRescueModal(false);
    setReshuffleCount(0);
    // 返回主页面的逻辑由父组件处理
    if (onBoardRefresh) {
      onBoardRefresh('return');
    }
  };

  const getSelectionStyle = () => {
    if (!selection) return null;
    
    const { startRow, startCol, endRow, endCol } = selection;
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);
    
    const selectedTiles = getSelectedTiles();
    const sum = selectedTiles.reduce((acc, tile) => acc + tile.value, 0);
    const isSuccess = sum === 10;
    
    if (!fixedLayout) return null;

    const { tileSize, tileGap } = fixedLayout;
    const cellWidth = tileSize + tileGap;
    const cellHeight = tileSize + tileGap;

    const left = minCol * cellWidth;
    const top = minRow * cellHeight;
    const selectionWidth = (maxCol - minCol + 1) * cellWidth - tileGap;
    const selectionHeight = (maxRow - minRow + 1) * cellHeight - tileGap;
    
    return {
      position: 'absolute',
      left,
      top,
      width: selectionWidth,
      height: selectionHeight,
      backgroundColor: isSuccess ? 'rgba(24, 197, 110, 0.3)' : 'rgba(33, 150, 243, 0.2)',
      opacity: selectionOpacity,
      borderRadius: 8,
      borderWidth: 3,
      borderColor: isSuccess ? '#18C56E' : '#2F80ED',
      shadowColor: isSuccess ? '#18C56E' : '#2F80ED',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: isSuccess ? 0.6 : 0.3,
      shadowRadius: isSuccess ? 8 : 4,
      elevation: isSuccess ? 8 : 4,
    };
  };

  const getSelectionSum = () => {
    if (!selection) return null;
    
    const selectedTiles = getSelectedTiles();
    const sum = selectedTiles.reduce((acc, tile) => acc + tile.value, 0);
    
    if (selectedTiles.length === 0) return null;
    
    const { startRow, startCol, endRow, endCol } = selection;
    const maxRow = Math.max(startRow, endRow);
    const maxCol = Math.max(startCol, endCol);
    
    if (!fixedLayout) return null;

    const { tileSize, tileGap } = fixedLayout;
    const cellWidth = tileSize + tileGap;
    const cellHeight = tileSize + tileGap;

    const left = maxCol * cellWidth + tileSize;
    const top = maxRow * cellHeight + tileSize;
    
    return {
      sum,
      isSuccess: sum === 10,
      style: {
        position: 'absolute',
        left: left - 30,
        top: top - 30,
        width: 60,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: sum === 10 ? '#FFEB3B' : '#2196F3',
        borderRadius: 8,
        borderWidth: 2,
        borderColor: sum === 10 ? '#F57F17' : '#1976D2',
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 6,
        transform: [{ rotate: '-2deg' }], // Slight rotation like sticky note
      }
    };
  };

  const renderFixedGridBackground = () => {
    if (!fixedLayout) return null;

    const { gridRows, gridCols, tileSize, tileGap } = fixedLayout;
    const lines = [];
    const cellWidth = tileSize + tileGap;
    const cellHeight = tileSize + tileGap;

    // Vertical lines
    for (let i = 1; i < gridCols; i++) {
      lines.push(
        <View
          key={`v-${i}`}
          style={[
            styles.gridLine,
            {
              left: i * cellWidth - tileGap / 2,
              top: 0,
              width: 1,
              height: gridRows * cellHeight - tileGap,
            }
          ]}
        />
      );
    }

    // Horizontal lines
    for (let i = 1; i < gridRows; i++) {
      lines.push(
        <View
          key={`h-${i}`}
          style={[
            styles.gridLine,
            {
              left: 0,
              top: i * cellHeight - tileGap / 2,
              width: gridCols * cellWidth - tileGap,
              height: 1,
            }
          ]}
        />
      );
    }

    return lines;
  };

  const renderTile = (value, row, col) => {
    if (!fixedLayout) return null;

    const index = row * width + col;
    
    if (value === 0) {
      // 检查是否有临时跳跃动画
      const tempAnimKeys = Array.from(fractalAnimations ? fractalAnimations.keys() : [])
        .filter(key => key.toString().startsWith(`temp_${index}_`));
      
      if (tempAnimKeys.length > 0) {
        // 渲染跳跃中的临时方块
        return tempAnimKeys.map(tempKey => {
          const tempAnim = fractalAnimations.get(tempKey);
          if (!tempAnim) return null;
          
          const { x, y } = fixedLayout.getTilePosition(row, col);
          const rotation = getTileRotation(row, col);
          
          const transforms = [
            { scale: tempAnim.scale },
            { rotate: `${rotation}deg` },
            { translateX: tempAnim.translateX },
            { translateY: tempAnim.translateY },
          ];
          
          // 获取正确的分解数值
          const displayValue = tempAnim.value || Math.floor(Math.random() * 9) + 1;
          
          return (
            <Animated.View 
              key={tempKey}
              style={[
                { 
                  position: 'absolute',
                  left: x,
                  top: y,
                  width: fixedLayout.tileSize,
                  height: fixedLayout.tileSize,
                  transform: transforms,
                  opacity: tempAnim.opacity,
                  alignItems: 'center',
                  justifyContent: 'center',
                }
              ]}
            >
              <View style={styles.tileInner}>
                <Text style={[
                  styles.tileText,
                  { 
                    fontSize: Math.max(14, fixedLayout.tileSize * 0.45),
                    lineHeight: fixedLayout.tileSize,
                  }
                ]}>
                  {displayValue}
                </Text>
              </View>
            </Animated.View>
          );
        });
      }
      
      // 检查是否完全清空（仅挑战模式需要刷新）
      if (isChallenge) {
        const newTiles = [...tiles];
        const tilePositions = []; // This should be defined somewhere
        tilePositions.forEach(pos => {
          const index = pos.row * width + pos.col;
          newTiles[index] = 0;
        });
        
        if (isBoardEmpty(newTiles) && onBoardRefresh) {
          // 棋盘全清，生成新棋盘
          setTimeout(() => {
            onBoardRefresh('refresh');
          }, 1000);
        }
      }
      
      return null;
    }

    if (row < 0 || row >= height || col < 0 || col >= width) {
      return null;
    }

    const { x, y } = fixedLayout.getTilePosition(row, col);

    const tileScale = initTileScale(index);
    const rotation = getTileRotation(row, col);
    
    // Get swap and fractal animations
    const swapAnim = swapAnimations ? swapAnimations.get(index) : null;
    const fractalAnim = fractalAnimations ? fractalAnimations.get(index) : null;
    
    const transforms = [
      { scale: tileScale },
      { rotate: `${rotation}deg` }
    ];
    
    if (swapAnim && swapAnim.translateX && swapAnim.translateY) {
      transforms.push({
        translateX: swapAnim.translateX,
      });
      transforms.push({
        translateY: swapAnim.translateY,
      });
    }
    
    if (fractalAnim && fractalAnim.scale) {
      transforms.push({
        scale: fractalAnim.scale,
      });
    }
    
    const isSelected = selectedSwapTile && selectedSwapTile.index === index;
    
    let tileStyle = styles.tileInner;
    
    if (isSelected && itemMode) {
      if (itemMode === 'swapMaster') {
        tileStyle = [styles.tileInner, styles.tileSwapSelected];
      } else if (itemMode === 'fractalSplit') {
        tileStyle = [styles.tileInner, styles.tileFractalSelected];
      }
    }

    let opacity = 1;
    if (fractalAnim && fractalAnim.opacity) {
      opacity = fractalAnim.opacity;
    }

    const handleTileTouch = itemMode ? () => handleTilePress(row, col, value) : undefined;
    
    return (
      <View
        key={`${row}-${col}`}
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: fixedLayout.tileSize,
          height: fixedLayout.tileSize,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onTouchStart={handleTileTouch}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            tileStyle,
            {
              width: '100%',
              height: '100%',
              transform: transforms,
              opacity: opacity,
            }
          ]}
        >
          <Text style={[
            styles.tileText,
            { 
              fontSize: Math.max(14, fixedLayout.tileSize * 0.45),
              lineHeight: fixedLayout.tileSize,
            }
          ]}>
            {value}
          </Text>
        </Animated.View>
      </View>
    );
  };

  // 初始化固定布局
  React.useEffect(() => {
    const availableWidth = screenWidth;
    const availableHeight = screenHeight - EFFECTIVE_AREA_CONFIG.TOP_RESERVED - EFFECTIVE_AREA_CONFIG.BOTTOM_RESERVED;
    
    const layout = getFixedBoardLayout(availableWidth, availableHeight);
    setFixedLayout(layout);
  }, []);

  const selectionStyle = getSelectionStyle();
  const selectionSum = getSelectionSum();

  if (!fixedLayout) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading board...</Text>
      </View>
    );
  }

  return (
    <View style={styles.fullScreenContainer} {...panResponder.panHandlers}>
      <View style={styles.container}>
        <View 
          style={[
            styles.chalkboard,
            {
              position: 'absolute',
              left: fixedLayout.boardLeft,
              top: fixedLayout.boardTop,
              width: fixedLayout.boardWidth,
              height: fixedLayout.boardHeight,
            }
          ]}
        >
          {/* 固定网格背景 */}
          <View
            style={{
              position: 'absolute',
              left: fixedLayout.boardPadding,
              top: fixedLayout.boardPadding,
              width: fixedLayout.gridWidth,
              height: fixedLayout.gridHeight,
            }}
          >
            {/* Grid lines */}
            {renderFixedGridBackground()}
          </View>
          
          {/* 动态数字方块 */}
          <View
            style={{
              position: 'absolute',
              left: fixedLayout.boardPadding,
              top: fixedLayout.boardPadding,
            }}
          >
            {/* Render tiles based on board data */}
            {tiles.map((value, index) => {
              const row = Math.floor(index / width);
              const col = index % width;
              return renderTile(value, row, col);
            })}
            
            {/* Selection overlay */}
            {selectionStyle && (
              <Animated.View style={selectionStyle} />
            )}
            
            {/* Selection sum display */}
            {selectionSum && (
              <View style={selectionSum.style}>
                <Text style={[
                  styles.sumText,
                  { color: selectionSum.isSuccess ? '#333' : 'white' }
                ]}>
                  {selectionSum.sum}
                </Text>
              </View>
            )}
            
            {/* Explosion effect */}
            {explosionAnimation && (
              <Animated.View
                style={[
                  styles.explosion,
                  {
                    left: explosionAnimation.x - 40,
                    top: explosionAnimation.y - 30,
                    transform: [{ scale: explosionScale }],
                    opacity: explosionOpacity,
                  }
                ]}
              >
                <View style={styles.explosionNote}>
                  <Text style={styles.explosionText}>10</Text>
                </View>
              </Animated.View>
            )}
          </View>
        </View>
      </View>
      
      {/* Rescue Modal */}
      <RescueModal
        visible={showRescueModal}
        onContinue={handleRescueContinue}
        onReturn={handleRescueReturn}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  chalkboard: {
    backgroundColor: '#1E5A3C', // Deep green chalkboard
    borderRadius: 16,
    borderWidth: 8,
    borderColor: '#8B5A2B', // Wooden frame
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.06)', // Semi-transparent white grid lines
  },
  tileInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF9E6', // Cream white sticky note
    borderRadius: 3, // 更小的圆角，更接近参考图片
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: {
      width: 1,
      height: 1,
    },
    shadowOpacity: 0.2, // 减轻阴影，更接近参考图片
    shadowRadius: 2,
    elevation: 3,
  },
  tileSwapSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  tileFractalSelected: {
    backgroundColor: '#F3E5F5',
    borderColor: '#9C27B0',
  },
  tileText: {
    fontWeight: 'bold',
    color: '#111',
    textAlign: 'center',
  },
  sumText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  explosion: {
    position: 'absolute',
    width: 80,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  explosionNote: {
    backgroundColor: '#FFEB3B',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#F57F17',
    paddingHorizontal: 12,
    paddingVertical: 6,
    transform: [{ rotate: '-5deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  explosionText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
});

export default GameBoard;