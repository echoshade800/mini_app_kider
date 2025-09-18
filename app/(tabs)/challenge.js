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
  const availableHeight = screenHeight - EFFECTIVE_AREA_CONFIG.TOP_RESERVED - EFFECTIVE_AREA_CONFIG.BOTTOM_RESERVED;
  const availableWidth = screenWidth;
  
  const width = EFFECTIVE_AREA_CONFIG.GRID_COLS;
  const height = EFFECTIVE_AREA_CONFIG.GRID_ROWS;
  
  const maxTileWidth = (availableWidth - EFFECTIVE_AREA_CONFIG.BOARD_PADDING * 2 - (width - 1) * EFFECTIVE_AREA_CONFIG.TILE_GAP) / width;
  const maxTileHeight = (availableHeight - EFFECTIVE_AREA_CONFIG.BOARD_PADDING * 2 - (height - 1) * EFFECTIVE_AREA_CONFIG.TILE_GAP) / height;
  
  const tileSize = Math.floor(Math.min(maxTileWidth, maxTileHeight));
        
  const boardWidth = width * (tileSize + EFFECTIVE_AREA_CONFIG.TILE_GAP) - EFFECTIVE_AREA_CONFIG.TILE_GAP + EFFECTIVE_AREA_CONFIG.BOARD_PADDING * 2;
  const boardHeight = height * (tileSize + EFFECTIVE_AREA_CONFIG.TILE_GAP) - EFFECTIVE_AREA_CONFIG.TILE_GAP + EFFECTIVE_AREA_CONFIG.BOARD_PADDING * 2;
  
  const boardLeft = (screenWidth - boardWidth) / 2;
  const boardTop = (availableHeight - boardHeight) / 2 + EFFECTIVE_AREA_CONFIG.TOP_RESERVED;
  
  return {
    tileSize,
    tileGap: EFFECTIVE_AREA_CONFIG.TILE_GAP,
    boardPadding: EFFECTIVE_AREA_CONFIG.BOARD_PADDING,
    boardWidth,
    boardHeight,
    boardLeft,
    boardTop,
    gridRows: height,
    gridCols: width,
    getTilePosition: (row, col) => ({
      x: col * (tileSize + EFFECTIVE_AREA_CONFIG.TILE_GAP),
      y: row * (tileSize + EFFECTIVE_AREA_CONFIG.TILE_GAP),
    }),
  };
}

const GameBoard = ({ 
  tiles, 
  width, 
  height, 
  onTilesClear, 
  disabled, 
  itemMode, 
  selectedSwapTile, 
  onTileClick, 
  settings, 
  onBoardRefresh, 
  isChallenge,
  swapAnimations,
  fractalAnimations,
  initTileScale,
  scaleTile,
  getTileRotation
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

  const getFixedBoardLayout = (availableWidth, availableHeight) => {
    return calculateEffectiveAreaLayout();
  };

  const resetSelection = () => {
    setSelection(null);
    hoveredTiles.forEach(index => {
      scaleTile(index, 1);
    });
    setHoveredTiles(new Set());
    
    Animated.timing(selectionOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const isInsideGridArea = (pageX, pageY) => {
    if (!fixedLayout) return false;
    
    const { boardLeft, boardTop, boardWidth, boardHeight } = fixedLayout;
    
    return pageX >= boardLeft && 
           pageX <= boardLeft + boardWidth && 
           pageY >= boardTop && 
           pageY <= boardTop + boardHeight;
  };

  const isInRestrictedArea = (pageY) => {
    const topRestrictedHeight = EFFECTIVE_AREA_CONFIG.TOP_RESERVED;
    const bottomRestrictedHeight = screenHeight - EFFECTIVE_AREA_CONFIG.BOTTOM_RESERVED;
    
    return pageY < topRestrictedHeight || pageY > bottomRestrictedHeight;
  };

  const getSelectedTiles = () => {
    if (!selection) return [];
    return getSelectedTilesForSelection(selection);
  };

  const getSelectedTilesForSelection = (sel) => {
    if (!sel) return [];
    
    const { startRow, startCol, endRow, endCol } = sel;
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

  const handleSelectionComplete = async () => {
    if (!selection) return;

    const selectedTiles = getSelectedTiles();
    const sum = selectedTiles.reduce((acc, tile) => acc + tile.value, 0);
    const tilePositions = selectedTiles.map(tile => ({ row: tile.row, col: tile.col }));

    if (sum === 10 && selectedTiles.length > 0) {
      // 重置重排计数
      setReshuffleCount(0);
      
      // Success - create explosion effect with yellow "10" note
      if (settings?.hapticsEnabled !== false) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      // Calculate explosion center position
      const { startRow, startCol, endRow, endCol } = selection;
      const centerRow = (startRow + endRow) / 2;
      const centerCol = (startCol + endCol) / 2;

      if (!fixedLayout) return;

      const { tileSize, tileGap } = fixedLayout;
      const cellWidth = tileSize + tileGap;
      const cellHeight = tileSize + tileGap;

      const explosionX = centerCol * cellWidth + tileSize / 2;
      const explosionY = centerRow * cellHeight + tileSize / 2;
      
      setExplosionAnimation({ x: explosionX, y: explosionY });
      
      // Explosion animation - yellow "10" note
      explosionScale.setValue(0.5);
      explosionOpacity.setValue(1);
      
      Animated.parallel([
        Animated.timing(explosionScale, {
          toValue: 2.0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(explosionOpacity, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setExplosionAnimation(null);
      });

      // Selection box animation - bright green glow
      Animated.sequence([
        Animated.timing(selectionOpacity, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(selectionOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: false,
        }),
      ]).start(() => {
        setSelection(null);
        onTilesClear(tilePositions);
      });

    } else if (selectedTiles.length > 0) {
      // Failure - blue feedback with short vibration
      if (settings?.hapticsEnabled !== false) {
        Haptics.selectionAsync();
      }
      
      Animated.sequence([
        Animated.timing(selectionOpacity, {
          toValue: 0.4,
          duration: 150,
          useNativeDriver: false,
        }),
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

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: (evt) => {
      if (itemMode) return false;
      if (isInRestrictedArea(evt.nativeEvent.pageY)) return false;
      const { pageX, pageY } = evt.nativeEvent;
      return !disabled && isInsideGridArea(pageX, pageY);
    },
    onMoveShouldSetPanResponder: (evt) => {
      if (itemMode) return false;
      if (isInRestrictedArea(evt.nativeEvent.pageY)) return false;
      const { pageX, pageY } = evt.nativeEvent;
      return !disabled && isInsideGridArea(pageX, pageY);
    },

    onPanResponderGrant: (evt) => {
      const { pageX, pageY } = evt.nativeEvent;
      
      if (!isInsideGridArea(pageX, pageY)) return;
      
      const { boardLeft, boardTop, boardPadding, tileSize, tileGap } = fixedLayout;

      const innerLeft = boardLeft + boardPadding;
      const innerTop = boardTop + boardPadding;

      const relativeX = pageX - innerLeft;
      const relativeY = pageY - innerTop;

      const cellWidth = tileSize + tileGap;
      const cellHeight = tileSize + tileGap;

      const startCol = Math.floor(relativeX / cellWidth);
      const startRow = Math.floor(relativeY / cellHeight);
      
      setSelection({
        startRow,
        startCol,
        endRow: startRow,
        endCol: startCol,
      });
      
      Animated.timing(selectionOpacity, {
        toValue: 0.6,
        duration: 80,
        useNativeDriver: false,
      }).start();
    },

    onPanResponderMove: (evt) => {
      if (!selection) return;
      
      const { pageX, pageY } = evt.nativeEvent;
      
      const { boardLeft, boardTop, boardWidth, boardHeight, boardPadding, tileSize, tileGap } = fixedLayout;

      const innerLeft = boardLeft + boardPadding;
      const innerTop = boardTop + boardPadding;
      const innerWidth = boardWidth - boardPadding * 2;
      const innerHeight = boardHeight - boardPadding * 2;

      if (pageX < innerLeft || pageX > innerLeft + innerWidth ||
          pageY < innerTop || pageY > innerTop + innerHeight) {
        return;
      }
      
      const relativeX = pageX - innerLeft;
      const relativeY = pageY - innerTop;

      const cellWidth = tileSize + tileGap;
      const cellHeight = tileSize + tileGap;

      if (relativeX < 0 || relativeX >= width * cellWidth - tileGap ||
          relativeY < 0 || relativeY >= height * cellHeight - tileGap) {
        return;
      }
      
      const endCol = Math.floor(relativeX / cellWidth);
      const endRow = Math.floor(relativeY / cellHeight);
      
      if (endRow < 0 || endRow >= height || endCol < 0 || endCol >= width) {
        return;
      }
      
      setSelection(prev => ({
        ...prev,
        endRow,
        endCol,
      }));

      // Update hovered tiles with scaling effect
      const newSelection = { ...selection, endRow, endCol };
      const newSelectedTiles = getSelectedTilesForSelection(newSelection);
      const newHoveredSet = new Set(newSelectedTiles.map(tile => tile.index));
      
      // Scale up selected tiles (sum = 10) or normal scale (sum ≠ 10)
      const sum = newSelectedTiles.reduce((acc, tile) => acc + tile.value, 0);
      const targetScale = sum === 10 ? 1.1 : 1.05;
      
      newSelectedTiles.forEach(tile => {
        if (!hoveredTiles.has(tile.index)) {
          scaleTile(tile.index, targetScale);
        }
      });
      
      hoveredTiles.forEach(index => {
        if (!newHoveredSet.has(index)) {
          scaleTile(index, 1);
        }
      });
      
      setHoveredTiles(newHoveredSet);
    },

    onPanResponderRelease: () => {
      if (selection && !disabled) {
        handleSelectionComplete();
      }
      
      hoveredTiles.forEach(index => {
        scaleTile(index, 1);
      });
      setHoveredTiles(new Set());
      
      Animated.timing(selectionOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start(() => {
        setSelection(null);
      });
    },
    
    onPanResponderTerminationRequest: (evt) => {
      const { pageX, pageY } = evt.nativeEvent;
      const buttonAreaBottom = screenHeight - 80; // 底部道具栏区域
      const buttonAreaTop = screenHeight - 160;
      const topRestrictedHeight = 120; // 顶部HUD区域
      
      if ((pageY >= buttonAreaTop && pageY <= buttonAreaBottom) || 
          pageY < topRestrictedHeight) {
        return true;
      }
      
      return true;
    },
    
    onPanResponderReject: () => {
      resetSelection();
    },
  });

  // Handle tile click in item mode
  const handleTilePress = (row, col, value) => {
    if (!itemMode || disabled || value === 0) return;
    
    if (onTileClick) {
      onTileClick(row, col, value);
    }
    
    if (settings?.hapticsEnabled !== false) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
                  }
                ]}>
                  {displayValue}
                </Text>
              </View>
            </Animated.View>
          );
        });
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
    const availableHeight = isChallenge ? screenHeight - 240 : screenHeight - 200; // 为HUD和道具栏留空间
    
    const layout = getFixedBoardLayout(availableWidth, availableHeight);
    setFixedLayout(layout);
  }, [isChallenge, width, height]);

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
              width: fixedLayout.gridCols * (fixedLayout.tileSize + fixedLayout.tileGap) - fixedLayout.tileGap,
              height: fixedLayout.gridRows * (fixedLayout.tileSize + fixedLayout.tileGap) - fixedLayout.tileGap,
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
    width: 80,
    height: 60,
    backgroundColor: '#FFEB3B', // Yellow sticky note
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#F57F17',
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  explosionText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
});

export default GameBoard;