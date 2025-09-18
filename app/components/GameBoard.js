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

const GameBoard = ({ 
  tiles, 
  width, 
  height, 
  onTilesClear, 
  disabled = false, 
  itemMode = null, 
  onTileClick = null,
  selectedSwapTile = null,
  swapAnimations = null,
  fractalAnimations = null,
  onBoardRefresh = null,
  isChallenge = false,
  settings = {}
}) => {
  const [selection, setSelection] = useState(null);
  const [hoveredTiles, setHoveredTiles] = useState(new Set());
  const [explosionAnimation, setExplosionAnimation] = useState(null);
  const [fixedLayout, setFixedLayout] = useState(null);
  const [showRescueModal, setShowRescueModal] = useState(false);
  const [reshuffleCount, setReshuffleCount] = useState(0);

  const selectionOpacity = useRef(new Animated.Value(0)).current;
  const explosionScale = useRef(new Animated.Value(0)).current;
  const explosionOpacity = useRef(new Animated.Value(0)).current;
  const tileScales = useRef(new Map()).current;

  const initTileScale = (index) => {
    if (!tileScales.has(index)) {
      tileScales.set(index, new Animated.Value(1));
    }
    return tileScales.get(index);
  };

  const scaleTile = (index, scale) => {
    const tileScale = initTileScale(index);
    Animated.timing(tileScale, {
      toValue: scale,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  const getTileRotation = (row, col) => {
    const seed = row * 13 + col * 7;
    return (seed % 7) - 3; // -3 to 3 degrees
  };

  const getFixedBoardLayout = (availableWidth, availableHeight) => {
    const { TILE_GAP, BOARD_PADDING } = EFFECTIVE_AREA_CONFIG;
    
    // 使用实际的棋盘尺寸而不是固定的网格
    const actualWidth = width;
    const actualHeight = height;
    
    const innerWidth = availableWidth - BOARD_PADDING * 2;
    const innerHeight = availableHeight - BOARD_PADDING * 2;
    
    // 计算方块大小，确保数字方块区域紧凑
    const tileWidth = (innerWidth * 0.8 - (actualWidth - 1) * TILE_GAP) / actualWidth;
    const tileHeight = (innerHeight * 0.8 - (actualHeight - 1) * TILE_GAP) / actualHeight;
    const tileSize = Math.min(tileWidth, tileHeight, 35); // 限制最大尺寸
    
    // 计算数字方块区域的实际大小
    const gameAreaWidth = actualWidth * (tileSize + TILE_GAP) - TILE_GAP;
    const gameAreaHeight = actualHeight * (tileSize + TILE_GAP) - TILE_GAP;
    
    // 计算整个棋盘（包含边框）的大小
    const boardWidth = gameAreaWidth + BOARD_PADDING * 2;
    const boardHeight = gameAreaHeight + BOARD_PADDING * 2;
    
    const boardLeft = (screenWidth - boardWidth) / 2;
    const boardTop = (availableHeight - boardHeight) / 2 + EFFECTIVE_AREA_CONFIG.TOP_RESERVED;
    
    // 数字方块区域在棋盘中居中
    const gameAreaLeft = (boardWidth - gameAreaWidth) / 2;
    const gameAreaTop = (boardHeight - gameAreaHeight) / 2;
    
    return {
      tileSize,
      tileGap: TILE_GAP,
      boardPadding: BOARD_PADDING,
      boardWidth,
      boardHeight,
      boardLeft,
      boardTop,
      gameAreaWidth,
      gameAreaHeight,
      gameAreaLeft,
      gameAreaTop,
      gridRows: actualHeight,
      gridCols: actualWidth,
      getTilePosition: (row, col) => ({
        x: gameAreaLeft + col * (tileSize + TILE_GAP),
        y: gameAreaTop + row * (tileSize + TILE_GAP),
      }),
    };
  };

  const isBoardEmpty = (boardTiles) => {
    return boardTiles.every(tile => tile === 0);
  };

  const handleTilePress = (row, col, value) => {
    if (disabled || !itemMode) return;
    
    const index = row * width + col;
    
    if (itemMode === 'swapMaster') {
      if (onTileClick) {
        onTileClick(row, col, value, index);
      }
    } else if (itemMode === 'fractalSplit') {
      if (onTileClick) {
        onTileClick(row, col, value, index);
      }
    }
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
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled && !itemMode,
    onMoveShouldSetPanResponder: () => !disabled && !itemMode,
    
    onPanResponderGrant: (evt) => {
      if (disabled || itemMode) return;
      
      if (!fixedLayout) return;
      
      const { locationX, locationY } = evt.nativeEvent;
      const { gameAreaLeft, gameAreaTop, tileSize, tileGap } = fixedLayout;
      
      const adjustedX = locationX - gameAreaLeft;
      const adjustedY = locationY - gameAreaTop;
      
      if (adjustedX < 0 || adjustedY < 0) return;
      
      const cellWidth = tileSize + tileGap;
      const cellHeight = tileSize + tileGap;
      
      const col = Math.floor(adjustedX / cellWidth);
      const row = Math.floor(adjustedY / cellHeight);
      
      if (row >= 0 && row < height && col >= 0 && col < width) {
        const index = row * width + col;
        if (tiles[index] > 0) {
          setSelection({
            startRow: row,
            startCol: col,
            endRow: row,
            endCol: col,
          });
          
          Animated.timing(selectionOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: false,
          }).start();
        }
      }
    },
    
    onPanResponderMove: (evt) => {
      if (disabled || itemMode || !selection || !fixedLayout) return;
      
      const { locationX, locationY } = evt.nativeEvent;
      const { gameAreaLeft, gameAreaTop, tileSize, tileGap } = fixedLayout;
      
      const adjustedX = locationX - gameAreaLeft;
      const adjustedY = locationY - gameAreaTop;
      
      if (adjustedX < 0 || adjustedY < 0) return;
      
      const cellWidth = tileSize + tileGap;
      const cellHeight = tileSize + tileGap;
      
      const col = Math.floor(adjustedX / cellWidth);
      const row = Math.floor(adjustedY / cellHeight);
      
      if (row >= 0 && row < height && col >= 0 && col < width) {
        setSelection(prev => ({
          ...prev,
          endRow: row,
          endCol: col,
        }));
      }
    },
    
    onPanResponderRelease: () => {
      if (disabled || itemMode) return;
      
      const selectedTiles = getSelectedTiles();
      const sum = selectedTiles.reduce((acc, tile) => acc + tile.value, 0);
      
      if (sum === 10 && selectedTiles.length > 0) {
        // Success - trigger explosion and clear tiles
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Calculate explosion position
        const { startRow, startCol, endRow, endCol } = selection;
        const centerRow = (startRow + endRow) / 2;
        const centerCol = (startCol + endCol) / 2;
        
        if (fixedLayout) {
          const { x, y } = fixedLayout.getTilePosition(centerRow, centerCol);
          const explosionX = x + fixedLayout.tileSize / 2;
          const explosionY = y + fixedLayout.tileSize / 2;
          
          setExplosionAnimation({ x: explosionX, y: explosionY });
          
          // Animate explosion
          Animated.parallel([
            Animated.timing(explosionScale, {
              toValue: 1,
              duration: 300,
              useNativeDriver: false,
            }),
            Animated.timing(explosionOpacity, {
              toValue: 1,
              duration: 150,
              useNativeDriver: false,
            }),
          ]).start(() => {
            Animated.parallel([
              Animated.timing(explosionScale, {
                toValue: 0,
                duration: 200,
                useNativeDriver: false,
              }),
              Animated.timing(explosionOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: false,
              }),
            ]).start(() => {
              setExplosionAnimation(null);
            });
          });
        }
        
        // Clear tiles
        if (onTilesClear) {
          onTilesClear(selectedTiles);
        }
        
        // Animate selection fade out
        Animated.timing(selectionOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }).start(() => {
          setSelection(null);
        });
      } else if (selectedTiles.length > 0) {
        // Failed selection - shake and fade out
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        
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
    },
  });

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

    const { gridRows, gridCols, tileSize, tileGap, gameAreaLeft, gameAreaTop } = fixedLayout;
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
              left: gameAreaLeft + i * cellWidth - tileGap / 2,
              top: gameAreaTop,
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
              left: gameAreaLeft,
              top: gameAreaTop + i * cellHeight - tileGap / 2,
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
              alignItems: 'center',
              justifyContent: 'center',
            }
          ]}
        >
          <Text style={[
            styles.tileText,
            { 
              fontSize: Math.max(14, fixedLayout.tileSize * 0.45),
              textAlign: 'center',
              textAlignVertical: 'center',
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
          {/* Grid lines */}
          {renderFixedGridBackground()}
          
          {/* 动态数字方块 */}
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
    includeFontPadding: false,
    lineHeight: undefined, // 让系统自动计算行高
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