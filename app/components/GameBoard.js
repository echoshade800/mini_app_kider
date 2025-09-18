/**
 * GameBoard Component - 基于有效游戏区域的固定棋盘背景
 * Purpose: 实现固定绿色木框棋盘背景 + 动态数字方块
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
import { useGameStore } from '../store/gameStore';
import { hasValidCombinations, reshuffleBoard, isBoardEmpty } from '../utils/gameLogic';
import { RescueModal } from './RescueModal';

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
function calculateEffectiveAreaLayout(isChallenge = false) {
  const { TOP_RESERVED, BOTTOM_RESERVED, TILE_GAP, BOARD_PADDING, GRID_ROWS, GRID_COLS } = EFFECTIVE_AREA_CONFIG;
  
  // 计算有效游戏区域
  const effectiveAreaTop = TOP_RESERVED;
  const effectiveAreaHeight = screenHeight - TOP_RESERVED - BOTTOM_RESERVED;
  const effectiveAreaWidth = screenWidth;
  
  let boardWidth, boardHeight, boardLeft, boardTop, tileSize;
  
  if (isChallenge) {
    // 挑战模式：棋盘铺满有效游戏区域
    boardWidth = effectiveAreaWidth;
    boardHeight = effectiveAreaHeight;
    boardLeft = 0;
    boardTop = effectiveAreaTop;
    
    // 计算方块尺寸以适应铺满的棋盘
    const availableWidth = boardWidth - BOARD_PADDING * 2 - TILE_GAP * (GRID_COLS - 1);
    const availableHeight = boardHeight - BOARD_PADDING * 2 - TILE_GAP * (GRID_ROWS - 1);
    
    const tileSizeByWidth = availableWidth / GRID_COLS;
    const tileSizeByHeight = availableHeight / GRID_ROWS;
    tileSize = Math.floor(Math.min(tileSizeByWidth, tileSizeByHeight));
  } else {
    // 闯关模式：固定尺寸棋盘，在有效区域内居中
    tileSize = 28; // 固定方块尺寸
    boardWidth = GRID_COLS * tileSize + (GRID_COLS - 1) * TILE_GAP + BOARD_PADDING * 2;
    boardHeight = GRID_ROWS * tileSize + (GRID_ROWS - 1) * TILE_GAP + BOARD_PADDING * 2;
    
    // 在有效游戏区域内居中
    boardLeft = (effectiveAreaWidth - boardWidth) / 2;
    boardTop = effectiveAreaTop + (effectiveAreaHeight - boardHeight) / 2;
  }
  
  return {
    // 有效游戏区域
    effectiveAreaTop,
    effectiveAreaHeight,
    effectiveAreaWidth,
    
    // 棋盘布局
    boardWidth,
    boardHeight,
    boardLeft,
    boardTop,
    tileSize,
    tileGap: TILE_GAP,
    boardPadding: BOARD_PADDING,
    gridRows: GRID_ROWS,
    gridCols: GRID_COLS,
    
    // 计算方块位置
    getTilePosition: (row, col) => ({
      x: BOARD_PADDING + col * (tileSize + TILE_GAP),
      y: BOARD_PADDING + row * (tileSize + TILE_GAP),
    }),
  };
}

// 根据触摸点获取网格位置
function getGridPositionFromTouch(pageX, pageY, layout, boardWidth, boardHeight) {
  const { boardLeft, boardTop, boardPadding, tileSize, tileGap, gridRows, gridCols } = layout;
  
  // 检查是否在棋盘范围内
  if (pageX < boardLeft || pageX > boardLeft + boardWidth ||
      pageY < boardTop || pageY > boardTop + boardHeight) {
    return null;
  }
  
  // 计算相对于棋盘内部的坐标
  const relativeX = pageX - boardLeft - boardPadding;
  const relativeY = pageY - boardTop - boardPadding;
  
  // 计算网格位置
  const cellWidth = tileSize + tileGap;
  const cellHeight = tileSize + tileGap;
  
  const col = Math.floor(relativeX / cellWidth);
  const row = Math.floor(relativeY / cellHeight);
  
  // 检查是否在有效网格范围内
  if (row >= 0 && row < gridRows && col >= 0 && col < gridCols) {
    return { row, col };
  }
  
  return null;
}

export function GameBoard({ 
  board, 
  onTilesClear, 
  onBoardRefresh,
  onTileClick,
  itemMode,
  selectedSwapTile,
  swapAnimations,
  fractalAnimations,
  disabled = false,
  isChallenge = false
}) {
  const { settings } = useGameStore();
  const [layout, setLayout] = useState(null);
  const [selection, setSelection] = useState(null);
  const [hoveredTiles, setHoveredTiles] = useState(new Set());
  const [showRescueModal, setShowRescueModal] = useState(false);
  const [reshuffleCount, setReshuffleCount] = useState(0);
  
  // 动画状态
  const tileScales = useRef({}).current;
  const selectionOpacity = useRef(new Animated.Value(0)).current;
  const explosionScale = useRef(new Animated.Value(0)).current;
  const explosionOpacity = useRef(new Animated.Value(0)).current;
  const [explosionAnimation, setExplosionAnimation] = useState(null);

  // 检查是否需要救援
  const checkForRescue = React.useCallback(() => {
    if (!board || itemMode || disabled) return;
    
    const { tiles, width, height } = board;
    
    if (!hasValidCombinations(tiles, width, height)) {
      if (reshuffleCount < 3) {
        // 自动重排
        const newTiles = reshuffleBoard(tiles, width, height);
        const newBoard = { ...board, tiles: newTiles };
        
        if (hasValidCombinations(newTiles, width, height)) {
          if (onBoardRefresh) {
            onBoardRefresh(newBoard);
          }
          setReshuffleCount(0);
        } else {
          setReshuffleCount(prev => prev + 1);
          if (reshuffleCount + 1 >= 3) {
            setTimeout(() => {
              setShowRescueModal(true);
            }, 500);
          }
        }
      }
    }
  }, [board, disabled, reshuffleCount, onBoardRefresh, itemMode]);

  // 监听棋盘变化，检查是否需要救援
  React.useEffect(() => {
    if (board && !itemMode) {
      const timer = setTimeout(() => {
        checkForRescue();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [board, itemMode, checkForRescue]);

  // 初始化布局
  React.useEffect(() => {
    const calculatedLayout = calculateEffectiveAreaLayout(isChallenge);
    setLayout(calculatedLayout);
  }, [isChallenge]);

  if (!board || !layout) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading board...</Text>
      </View>
    );
  }

  const { width, height, tiles } = board;

  // 检查触摸点是否在有效游戏区域内
  const isInEffectiveArea = (pageY) => {
    return pageY >= layout.effectiveAreaTop && 
           pageY <= layout.effectiveAreaTop + layout.effectiveAreaHeight;
  };

  // 初始化方块缩放动画
  const initTileScale = (index) => {
    if (!tileScales[index]) {
      tileScales[index] = new Animated.Value(1);
    }
    return tileScales[index];
  };

  // 方块缩放动画
  const scaleTile = (index, scale) => {
    const tileScale = initTileScale(index);
    if (tileScale) {
      Animated.spring(tileScale, {
        toValue: scale,
        useNativeDriver: true,
        tension: 400,
        friction: 8,
      }).start();
    }
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

  const getSelectedTiles = () => {
    return getSelectedTilesForSelection(selection);
  };

  const resetSelection = () => {
    setSelection(null);
    selectionOpacity.setValue(0);
    hoveredTiles.forEach(index => {
      scaleTile(index, 1);
    });
    setHoveredTiles(new Set());
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: (evt) => {
      if (itemMode || disabled) return false;
      const { pageY } = evt.nativeEvent;
      return isInEffectiveArea(pageY);
    },
    onMoveShouldSetPanResponder: (evt) => {
      if (itemMode || disabled) return false;
      const { pageY } = evt.nativeEvent;
      return isInEffectiveArea(pageY);
    },

    onPanResponderGrant: (evt) => {
      const { pageX, pageY } = evt.nativeEvent;
      const gridPos = getGridPositionFromTouch(pageX, pageY, layout, layout.boardWidth, layout.boardHeight);
      
      if (gridPos) {
        setSelection({
          startRow: gridPos.row,
          startCol: gridPos.col,
          endRow: gridPos.row,
          endCol: gridPos.col,
        });
        
        Animated.timing(selectionOpacity, {
          toValue: 0.6,
          duration: 80,
          useNativeDriver: false,
        }).start();
      }
    },

    onPanResponderMove: (evt) => {
      if (!selection) return;
      
      const { pageX, pageY } = evt.nativeEvent;
      const gridPos = getGridPositionFromTouch(pageX, pageY, layout, layout.boardWidth, layout.boardHeight);
      
      if (gridPos) {
        setSelection(prev => ({
          ...prev,
          endRow: gridPos.row,
          endCol: gridPos.col,
        }));

        // 更新悬停方块的缩放效果
        const newSelection = { ...selection, endRow: gridPos.row, endCol: gridPos.col };
        const newSelectedTiles = getSelectedTilesForSelection(newSelection);
        const newHoveredSet = new Set(newSelectedTiles.map(tile => tile.index));
        
        // 根据总和决定缩放比例
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
      }
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
    
    onPanResponderTerminationRequest: () => true,
    onPanResponderReject: () => {
      resetSelection();
    },
  });

  // 处理方块点击（道具模式）
  const handleTilePress = (row, col, value) => {
    if (!itemMode || disabled || value === 0) return;
    
    if (onTileClick) {
      onTileClick(row, col, value);
    }
    
    if (settings?.hapticsEnabled !== false) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleSelectionComplete = async () => {
    if (!selection) return;

    const selectedTiles = getSelectedTiles();
    const sum = selectedTiles.reduce((acc, tile) => acc + tile.value, 0);
    const tilePositions = selectedTiles.map(tile => ({ row: tile.row, col: tile.col }));

    if (sum === 10 && selectedTiles.length > 0) {
      // 重置重排计数
      setReshuffleCount(0);
      
      // 成功 - 创建爆炸效果
      if (settings?.hapticsEnabled !== false) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      // 计算爆炸中心位置
      const { startRow, startCol, endRow, endCol } = selection;
      const centerRow = (startRow + endRow) / 2;
      const centerCol = (startCol + endCol) / 2;

      const { tileSize, tileGap } = layout;
      const cellWidth = tileSize + tileGap;
      const cellHeight = tileSize + tileGap;

      const explosionX = centerCol * cellWidth + tileSize / 2;
      const explosionY = centerRow * cellHeight + tileSize / 2;
      
      setExplosionAnimation({ x: explosionX, y: explosionY });
      
      // 爆炸动画
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

      // 选择框动画
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
      // 失败 - 蓝色反馈
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

  // 处理救援选择
  const handleRescueContinue = () => {
    setShowRescueModal(false);
    setReshuffleCount(0);
  };

  const handleRescueReturn = () => {
    setShowRescueModal(false);
    setReshuffleCount(0);
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
    
    const { tileSize, tileGap } = layout;
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
    
    const { tileSize, tileGap } = layout;
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
        transform: [{ rotate: '-2deg' }],
      }
    };
  };

  const renderFixedGridBackground = () => {
    const { gridRows, gridCols, tileSize, tileGap } = layout;
    const lines = [];
    const cellWidth = tileSize + tileGap;
    const cellHeight = tileSize + tileGap;

    // 垂直线
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

    // 水平线
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

  const getTileRotation = (row, col) => {
    // 基于位置的轻微旋转，模拟便签纸效果
    const seed = row * 7 + col * 3;
    return ((seed % 7) - 3) * 0.5; // -1.5° 到 1.5°
  };

  const renderTile = (value, row, col) => {
    if (value === 0) return null;
    if (row < 0 || row >= height || col < 0 || col >= width) return null;

    const index = row * width + col;
    const { x, y } = layout.getTilePosition(row, col);

    const tileScale = initTileScale(index);
    const rotation = getTileRotation(row, col);
    
    // 获取交换和分裂动画
    const swapAnim = swapAnimations ? swapAnimations.get(index) : null;
    const fractalAnim = fractalAnimations ? fractalAnimations.get(index) : null;
    
    const transforms = [
      { scale: tileScale },
      { rotate: `${rotation}deg` }
    ];
    
    if (swapAnim && swapAnim.translateX && swapAnim.translateY) {
      transforms.push({ translateX: swapAnim.translateX });
      transforms.push({ translateY: swapAnim.translateY });
    }
    
    if (fractalAnim && fractalAnim.scale) {
      transforms.push({ scale: fractalAnim.scale });
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
          width: layout.tileSize,
          height: layout.tileSize,
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
              fontSize: Math.max(14, layout.tileSize * 0.45),
              lineHeight: layout.tileSize,
            }
          ]}>
            {value}
          </Text>
        </Animated.View>
      </View>
    );
  };

  const selectionStyle = getSelectionStyle();
  const selectionSum = getSelectionSum();

  return (
    <View style={styles.fullScreenContainer} {...panResponder.panHandlers}>
      <View style={styles.container}>
        <View 
          style={[
            styles.chalkboard,
            {
              position: 'absolute',
              left: layout.boardLeft,
              top: layout.boardTop,
              width: layout.boardWidth,
              height: layout.boardHeight,
            }
          ]}
        >
          {/* 固定网格背景 */}
          <View
            style={{
              position: 'absolute',
              left: layout.boardPadding,
              top: layout.boardPadding,
              width: layout.gridCols * (layout.tileSize + layout.tileGap) - layout.tileGap,
              height: layout.gridRows * (layout.tileSize + layout.tileGap) - layout.tileGap,
            }}
          >
            {renderFixedGridBackground()}
          </View>
          
          {/* 动态数字方块 */}
          <View
            style={{
              position: 'absolute',
              left: layout.boardPadding,
              top: layout.boardPadding,
            }}
          >
            {/* 渲染数字方块 */}
            {tiles.map((value, index) => {
              const row = Math.floor(index / width);
              const col = index % width;
              return renderTile(value, row, col);
            })}
            
            {/* 选择框覆盖层 */}
            {selectionStyle && (
              <Animated.View style={selectionStyle} />
            )}
            
            {/* 选择总和显示 */}
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
            
            {/* 爆炸效果 */}
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

      {/* 救援弹窗 */}
      <RescueModal
        visible={showRescueModal}
        onContinue={handleRescueContinue}
        onReturn={handleRescueReturn}
        hasItems={false}
      />
    </View>
  );
}

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
    backgroundColor: '#1E5A3C', // 深绿色棋盘背景
    borderRadius: 16,
    borderWidth: 8,
    borderColor: '#8B5A2B', // 木质边框
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
    backgroundColor: 'rgba(255, 255, 255, 0.06)', // 半透明白色网格线
  },
  tileInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF9E6', // 奶白色便签纸
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: {
      width: 1,
      height: 1,
    },
    shadowOpacity: 0.2,
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
    textAlignVertical: 'center',
    includeFontPadding: false,
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
    backgroundColor: '#FFEB3B', // 黄色便签纸
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