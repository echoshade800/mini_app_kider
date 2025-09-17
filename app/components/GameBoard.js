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
  PixelRatio
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useGameStore } from '../store/gameStore';
import { hasValidCombinations, reshuffleBoard, isBoardEmpty } from '../utils/gameLogic';
import { getLevelLayout, adjustLayoutForSmallScreen } from '../utils/levelGrid';
import { RescueModal } from './RescueModal';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// 统一尺寸计算常量
const GAP = 6;         // 方块间距
const PAD = 12;        // 棋盘内边距
const TILE_MIN = 30;
const TILE_IDEAL = 36;
const TILE_MAX = 42;

// 像素对齐函数
function roundPx(v) {
  return PixelRatio.roundToNearestPixel(v);
}

// 统一网格布局计算
function computeGridLayout({ rows, cols, boardWidth, boardHeight }) {
  const innerW = boardWidth - PAD * 2 - GAP * (cols - 1);
  const innerH = boardHeight - PAD * 2 - GAP * (rows - 1);

  // 按列和按行能容纳的最大 tile 尺寸
  let sizeByW = innerW / cols;
  let sizeByH = innerH / rows;

  // 取较小者并贴近理想值，再做区间夹取
  let tileSize = Math.min(sizeByW, sizeByH);
  if (Math.abs(tileSize - TILE_IDEAL) <= 4) tileSize = TILE_IDEAL;
  tileSize = Math.max(TILE_MIN, Math.min(TILE_MAX, tileSize));

  // 重新计算并四舍五入到像素
  const tile = roundPx(tileSize);
  const gap = roundPx(GAP);
  const pad = roundPx(PAD);

  return {
    tile,
    gap,
    pad,
    // 计算每个 cell 左上角坐标
    getXY: (r, c) => ({
      x: roundPx(pad + c * (tile + gap)),
      y: roundPx(pad + r * (tile + gap)),
    }),
    // 内层真实使用尺寸
    innerWidth: roundPx(pad * 2 + cols * tile + (cols - 1) * gap),
    innerHeight: roundPx(pad * 2 + rows * tile + (rows - 1) * gap),
  };
}

export function GameBoard({ 
  board, 
  onTilesClear, 
  onBoardRefresh,
  onTileClick, 
  itemMode = null,
  selectedSwapTile = null,
  disabled = false,
  swapAnimations,
  fractalAnimations,
  isChallenge = false,
  maxBoardHeight = null
}) {
  const { settings } = useGameStore();
  const [selection, setSelection] = useState(null);
  const [hoveredTiles, setHoveredTiles] = useState(new Set());
  const [explosionAnimation, setExplosionAnimation] = useState(null);
  const [reshuffleCount, setReshuffleCount] = useState(0);
  const [showRescueModal, setShowRescueModal] = useState(false);
  const [boardLayout, setBoardLayout] = useState(null);
  
  const selectionOpacity = useRef(new Animated.Value(0)).current;
  const explosionScale = useRef(new Animated.Value(0)).current;
  const explosionOpacity = useRef(new Animated.Value(0)).current;
  const tileScales = useRef({}).current;

  // Generate stable random rotation for each tile
  const getTileRotation = (row, col) => {
    const seed = row * 1000 + col;
    const random = (seed * 9301 + 49297) % 233280;
    return ((random / 233280) - 0.5) * 2.4; // -1.2° to +1.2°
  };

  React.useEffect(() => {
    return () => {
      Object.values(tileScales).forEach(anim => {
        if (anim && anim.stopAnimation) {
          anim.stopAnimation();
        }
      });
    };
  }, []);

  // 检查是否需要救援
  const checkForRescue = React.useCallback(() => {
  const { 
    tileSize, 
    tileWidth, 
    tileHeight, 
    gap, 
    padding, 
    boardWidth, 
    boardHeight, 
    boardX, 
    boardY, 
    innerWidth,
    innerHeight,
    getTilePosition 
  } = boardMetrics;
    
    const { tiles, width, height } = board;
    
    // 检查是否有可消除的组合
    if (!hasValidCombinations(tiles, width, height)) {
      if (reshuffleCount < 3) {
        // 自动重排
        const newTiles = reshuffleBoard(tiles, width, height);
        const newBoard = { ...board, tiles: newTiles };
        
        // 检查重排后是否有解
        if (hasValidCombinations(newTiles, width, height)) {
          setReshuffleCount(0);
          if (onBoardRefresh) {
            onBoardRefresh(newBoard);
          }
        } else {
          setReshuffleCount(prev => prev + 1);
          if (onBoardRefresh) {
            onBoardRefresh(newBoard);
          }
          
          // 如果重排3次后仍无解，显示救援界面
          if (reshuffleCount + 1 >= 3) {
            setTimeout(() => {
              setShowRescueModal(true);
            }, 500);
          }
        }
      }
    }
  }, [board, disabled, reshuffleCount, onBoardRefresh]);

  // 监听棋盘变化，检查是否需要救援
  React.useEffect(() => {
    if (board && !itemMode) {
      const timer = setTimeout(() => {
        checkForRescue();
      }, 1000); // 延迟检查，避免频繁触发
      
      return () => clearTimeout(timer);
    }
  }, [board, itemMode, checkForRescue]);

  if (!board) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading board...</Text>
      </View>
    );
  }

  const { width, height, tiles } = board;

  // Initialize tile scale animation
  const initTileScale = (index) => {
    if (!tileScales[index]) {
      tileScales[index] = new Animated.Value(1);
    }
    return tileScales[index];
  };

  // Scale tile animation
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

  const isInsideGridArea = (pageX, pageY) => {
    if (!boardLayout || isInRestrictedArea(pageY)) return false;

    const { boardLeft, boardTop, layout } = boardLayout;
    const { pad, innerWidth, innerHeight } = layout;

    const innerLeft = boardLeft + (boardLayout.boardWidth - innerWidth) / 2;
    const innerTop = boardTop + (boardLayout.boardHeight - innerHeight) / 2;

    if (pageX < innerLeft + pad || pageX > innerLeft + innerWidth - pad ||
        pageY < innerTop + pad || pageY > innerTop + innerHeight - pad) {
      return false;
    }

    const relativeX = pageX - innerLeft - pad;
    const relativeY = pageY - innerTop - pad;

    const cellWidth = layout.tile + layout.gap;
    const cellHeight = layout.tile + layout.gap;

    if (relativeX < 0 || relativeX >= width * cellWidth - layout.gap ||
        relativeY < 0 || relativeY >= height * cellHeight - layout.gap) {
      return false;
    }

    const col = Math.floor(relativeX / cellWidth);
    const row = Math.floor(relativeY / cellHeight);

    return row >= 0 && row < height && col >= 0 && col < width;
  };

  const isInRestrictedArea = (pageY) => {
    const topRestrictedHeight = 120; // 减少顶部限制区域
    const bottomRestrictedHeight = 120; // 减少底部限制区域
    
    return pageY < topRestrictedHeight || 
           pageY > screenHeight - bottomRestrictedHeight;
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
      
      const { boardLeft, boardTop, layout } = boardLayout;
      const { pad, innerWidth, innerHeight } = layout;

      const innerLeft = boardLeft + (boardLayout.boardWidth - innerWidth) / 2;
      const innerTop = boardTop + (boardLayout.boardHeight - innerHeight) / 2;

      const relativeX = pageX - innerLeft - pad;
      const relativeY = pageY - innerTop - pad;

      const cellWidth = layout.tile + layout.gap;
      const cellHeight = layout.tile + layout.gap;

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
      
      const { boardLeft, boardTop, layout } = boardLayout;
      const { pad, innerWidth, innerHeight } = layout;

      const innerLeft = boardLeft + (boardLayout.boardWidth - innerWidth) / 2;
      const innerTop = boardTop + (boardLayout.boardHeight - innerHeight) / 2;

      if (pageX < innerLeft + pad || pageX > innerLeft + innerWidth - pad ||
          pageY < innerTop + pad || pageY > innerTop + innerHeight - pad) {
        return;
      }
      
      const relativeX = pageX - innerLeft - pad;
      const relativeY = pageY - innerTop - pad;

      const cellWidth = layout.tile + layout.gap;
      const cellHeight = layout.tile + layout.gap;

      if (relativeX < 0 || relativeX >= width * cellWidth - layout.gap ||
          relativeY < 0 || relativeY >= height * cellHeight - layout.gap) {
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

      if (!boardLayout) return;

      const { layout } = boardLayout;
      const cellWidth = layout.tile + layout.gap;
      const cellHeight = layout.tile + layout.gap;

      const explosionX = centerCol * cellWidth + layout.tile / 2;
      const explosionY = centerRow * cellHeight + layout.tile / 2;
      
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
    
    const cellWidth = tileWidth + gap;
    const cellHeight = tileHeight + gap;
    const { layout } = boardLayout;
    const cellWidth = layout.tile + layout.gap;
    const cellHeight = layout.tile + layout.gap;

    const left = minCol * cellWidth;
    const top = minRow * cellHeight;
    const selectionWidth = (maxCol - minCol + 1) * cellWidth - layout.gap;
    const selectionHeight = (maxRow - minRow + 1) * cellHeight - layout.gap;
    
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
    
    const cellWidth = tileWidth + gap;
    const cellHeight = tileHeight + gap;
    const { layout } = boardLayout;
    const cellWidth = layout.tile + layout.gap;
    const cellHeight = layout.tile + layout.gap;

    const left = maxCol * cellWidth + tileWidth;
    const top = maxRow * cellHeight + tileHeight;
    
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

  const renderGridLines = (layout) => {
    if (!layout) return null;

    const lines = [];
    const cellWidth = layout.tile + layout.gap;
    const cellHeight = layout.tile + layout.gap;

    // Vertical lines
    for (let i = 1; i < width; i++) {
      lines.push(
        <View
          key={`v-${i}`}
          style={[
            styles.gridLine,
            {
              left: roundPx(i * cellWidth - layout.gap / 2),
              top: 0,
              width: 1,
              height: roundPx(height * cellHeight - layout.gap),
            }
          ]}
        />
      );
    }

    // Horizontal lines
    for (let i = 1; i < height; i++) {
      lines.push(
        <View
          key={`h-${i}`}
          style={[
            styles.gridLine,
            {
              left: 0,
              top: roundPx(i * cellHeight - layout.gap / 2),
              width: roundPx(width * cellWidth - layout.gap),
              height: 1,
            }
          ]}
        />
      );
    }

    return lines;
  };

  const renderTile = (value, row, col) => {
    if (!boardLayout) return null;

    const { layout } = boardLayout;
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
          
          const { x, y } = layout.getXY(row, col);
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
                  width: tileWidth,
                  height: tileHeight,
                { 
                  position: 'absolute',
                  left: x,
                  top: y,
                  width: layout.tile,
                  height: layout.tile,
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
                  { fontSize: Math.max(14, tileWidth * 0.45) }
                    fontSize: Math.max(14, layout.tile * 0.45),
                    lineHeight: layout.tile,
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

    const { x, y } = layout.getXY(row, col);

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
          width: tileWidth,
          height: tileHeight,

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
          width: layout.tile,
          height: layout.tile,
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
              fontSize: Math.max(14, tileWidth * 0.45),
              lineHeight: tileHeight,
            }
          ]}>
            {value}
          </Text>
        </Animated.View>
      </View>
    );
  };

  // 处理棋盘布局
  const handleBoardLayout = (event) => {
    const { width: boardWidth, height: boardHeight } = event.nativeEvent.layout;
    
    // 计算棋盘在屏幕中的位置（挑战模式使用全屏定位）
    const boardLeft = isChallenge ? 0 : screenWidth / 2 - boardWidth / 2;
    const boardTop = isChallenge ? 0 : screenHeight / 2 - boardHeight / 2;
    
    // 计算网格布局
    const layout = computeGridLayout({
      rows: height,
      cols: width,
      boardWidth,
      boardHeight,
    });
    
    setBoardLayout({
      boardWidth,
      boardHeight,
      boardLeft,
      boardTop,
      layout,
    });
  };

  const selectionStyle = getSelectionStyle();
  const selectionSum = getSelectionSum();

  // 挑战模式使用全屏尺寸，闯关模式使用固定尺寸
  const boardContainerStyle = isChallenge ? {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
              width: innerWidth,
              height: innerHeight,
              left: padding,
              top: padding,
    height: 400,
  };

  return (
    <View style={styles.fullScreenContainer} {...panResponder.panHandlers}>
      <View style={styles.container}>
        <View 
          style={[styles.chalkboard, boardContainerStyle]}
          onLayout={handleBoardLayout}
        >
          {boardLayout && (
            <View
              style={{
                position: 'absolute',
                width: boardLayout.layout.innerWidth,
                height: boardLayout.layout.innerHeight,
                left: (boardLayout.boardWidth - boardLayout.layout.innerWidth) / 2,
                top: (boardLayout.boardHeight - boardLayout.layout.innerHeight) / 2,
          {/* 棋盘内容区域 - 确保所有方块都在内部 */}
            >
              {/* Grid lines */}
              {renderGridLines(boardLayout.layout)}
              
              {/* Render all tiles */}
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

              {/* Explosion effect - Yellow "10" sticky note */}
              {explosionAnimation && (
                <Animated.View
                  style={[
                    styles.explosion,
                    {
                      left: explosionAnimation.x - 40,
                      top: explosionAnimation.y - 30,
                      transform: [
                        { scale: explosionScale },
                        { rotate: '5deg' }
                      ],
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
          )}
        </View>
      </View>
      
      {/* Rescue Modal */}
      <RescueModal
        visible={showRescueModal}
        onContinue={handleRescueContinue}
        onReturn={handleRescueReturn}
        hasItems={true} // 这里可以根据实际道具数量判断
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
    backgroundColor: '#1E5A3C', // Deep green chalkboard
    padding: 20, // 统一内边距，确保数字方块在棋盘中央
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
    position: 'relative',
    alignSelf: 'center',
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