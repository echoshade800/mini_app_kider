/**
 * GameBoard Component - 使用新的自适应布局系统
 * Purpose: 渲染自适应棋盘，所有布局由BoardLayout统一管理
 * Features: 完全响应式、最小28px方块、棋盘比矩形大一圈
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  PanResponder, 
  StyleSheet,
  Animated,
  PixelRatio,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { hasValidCombinations } from '../utils/gameLogic';
import RescueModal from './RescueModal';
import { computeLayout } from '../layout/layoutEngine';

const R = (v) => PixelRatio.roundToNearestPixel(v);

const GameBoard = ({ 
  tiles, 
  width, 
  height, 
  onTilesClear, 
  disabled, 
  itemMode, 
  onTileClick,
  selectedSwapTile,
  swapAnimations,
  fractalAnimations,
  settings,
  isChallenge,
  reshuffleCount,
  setReshuffleCount,
  onRescueNeeded,
  layoutConfig, // 新增：布局配置
}) => {
  const [selection, setSelection] = useState(null);
  const [hoveredTiles, setHoveredTiles] = useState(new Set());
  const [explosionAnimation, setExplosionAnimation] = useState(null);
  const [boardRect, setBoardRect] = useState(null);
  const [layoutResult, setLayoutResult] = useState(null);
  
  const selectionOpacity = useRef(new Animated.Value(0)).current;
  const explosionScale = useRef(new Animated.Value(0)).current;
  const explosionOpacity = useRef(new Animated.Value(0)).current;
  const tileScales = useRef(new Map()).current;

  // 棋盘容器布局回调 - 唯一坐标系来源
  const handleBoardLayout = (event) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    const newBoardRect = { left: x, top: y, width, height };
    setBoardRect(newBoardRect);
    
    // 计算精确布局
    if (layoutConfig && width > 0 && height > 0) {
      const result = computeLayout({
        board: newBoardRect,
        frame: layoutConfig.woodFrameWidth || 8,
        pad: layoutConfig.boardPadding || 5,
        rows: height,
        cols: width,
        gap: layoutConfig.tileGap || 4,
        minTile: layoutConfig.minTileSize || 28,
        maxTile: 32, // 固定32px
        lockTile: true, // 固定方块尺寸
      });
      setLayoutResult(result);
    }
  };

  // 如果没有布局结果，显示加载状态
  if (!layoutResult) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading board...</Text>
      </View>
    );
  }

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
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const getTileRotation = (row, col) => {
    const seed = row * 31 + col * 17;
    return ((seed % 7) - 3) * 0.8;
  };

  const resetSelection = () => {
    setSelection(null);
    hoveredTiles.forEach(index => {
      // 直接调用父组件的清除回调，不做任何额外处理
      if (onTilesClear) {
        onTilesClear(clearedPositions);
      }
    });
    setHoveredTiles(new Set());
    
    Animated.timing(selectionOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const isInsideBoard = (pageX, pageY) => {
    const { boardLeft, boardTop, boardWidth, boardHeight } = layoutConfig;
    
    return pageX >= boardLeft && 
           pageX <= boardLeft + boardWidth && 
           pageY >= boardTop && 
           pageY <= boardTop + boardHeight;
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
      // Success - create explosion effect with yellow "10" note
      if (settings?.hapticsEnabled !== false) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      // Calculate explosion center position
      const { startRow, startCol, endRow, endCol } = selection;
      const centerRow = (startRow + endRow) / 2;
      const centerCol = (startCol + endCol) / 2;

      const centerTilePos = layoutConfig.getTilePosition(Math.floor(centerRow), Math.floor(centerCol));
      if (centerTilePos) {
        const explosionX = centerTilePos.x + centerTilePos.width / 2;
        const explosionY = centerTilePos.y + centerTilePos.height / 2;
        
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
      }

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
  }

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: (evt) => {
      if (itemMode) return false;
      const { pageX, pageY } = evt.nativeEvent;
      return !disabled && isInsideBoard(pageX, pageY);
    },
    onMoveShouldSetPanResponder: (evt) => {
      if (itemMode) return false;
      const { pageX, pageY } = evt.nativeEvent;
      return !disabled && isInsideBoard(pageX, pageY);
    },

    onPanResponderGrant: (evt) => {
      const { pageX, pageY } = evt.nativeEvent;
      
      if (!isInsideBoard(pageX, pageY)) return;
      
      // 🎯 精确触摸检测：遍历所有方块位置
      let startRow = -1, startCol = -1;
      
      for (const tile of layoutResult.tiles) {
        if (pageX >= tile.left && pageX < tile.left + tile.size &&
            pageY >= tile.top  && pageY < tile.top  + tile.size) {
          startRow = tile.row;
          startCol = tile.col;
          break;
        }
      }
      
      if (startRow !== -1 && startCol !== -1) {
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
      }
    },

    onPanResponderMove: (evt) => {
      if (!selection) return;
      
      const { pageX, pageY } = evt.nativeEvent;
      
      // 精确触摸检测
      let endRow = -1, endCol = -1;
      
      for (const tile of layoutResult.tiles) {
        if (pageX >= tile.left && pageX < tile.left + tile.size &&
            pageY >= tile.top  && pageY < tile.top  + tile.size) {
          endRow = tile.row;
          endCol = tile.col;
          break;
        }
      }
      
      if (endRow !== -1 && endCol !== -1) {
        setSelection(prev => ({
          ...prev,
          endRow,
          endCol,
        }));
        
        // Get current selected tiles for this selection
        const currentSelectedTiles = getSelectedTilesForSelection({
          startRow: selection.startRow,
          startCol: selection.startCol,
          endRow,
          endCol,
        });
        
        // Create set of currently hovered tile indices
        const newHoveredSet = new Set(currentSelectedTiles.map(tile => tile.index));
        
        // Scale up selected tiles (sum = 10) or normal scale (sum ≠ 10)
        const sum = currentSelectedTiles.reduce((acc, tile) => acc + tile.value, 0);
        const targetScale = sum === 10 ? 1.1 : 1.05;
        
        currentSelectedTiles.forEach(tile => {
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

  // Handle tile click in item mode
  const handleTilePress = (row, col, value) => {
    console.log('🎯 GameBoard: Tile pressed:', { row, col, value, itemMode });
    
    if (!itemMode || disabled) return;
    
    if (onTileClick) {
      console.log('🎯 GameBoard: Calling onTileClick');
      onTileClick(row, col, value);
    } else {
      console.log('❌ GameBoard: onTileClick is null');
    }
    
    if (settings?.hapticsEnabled !== false) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    
    const { tile, gap } = layoutResult;
    const cellWidth = tile + gap;
    const cellHeight = tile + gap;

    const left = R(layoutResult.startX - layoutResult.inner.left + minCol * cellWidth);
    const top = R(layoutResult.startY - layoutResult.inner.top + minRow * cellHeight);
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
      borderWidth: 2,
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
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);
    
    // 计算选择框的中心位置
    const centerRow = (minRow + maxRow) / 2;
    const centerCol = (minCol + maxCol) / 2;
    
    const { tile, gap } = layoutResult;
    const cellWidth = tile + gap;
    const cellHeight = tile + gap;

    // 计算中心位置的坐标
    const centerX = R(layoutResult.startX - layoutResult.inner.left + centerCol * cellWidth + tile / 2);
    const centerY = R(layoutResult.startY - layoutResult.inner.top + centerRow * cellHeight + tile / 2);
    
    return {
      sum,
      isSuccess: sum === 10,
      style: {
        position: 'absolute',
        left: centerX - 25,
        top: centerY - 20,
        width: 50,
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
        transform: [{ rotate: '0deg' }],
      }
    };
  };

  const renderTile = (value, row, col) => {
    const index = row * width + col;
    
    // 只有非零值才显示数字方块，值为0时不显示任何内容
    if (value === 0) {
      return null; // 空位不渲染任何内容
    }

    // 从布局结果中找到对应的方块位置
    const tileLayout = layoutResult.tiles.find(t => t.row === row && t.col === col);
    if (!tileLayout) return null;

    const tileScale = initTileScale(index);
    const rotation = getTileRotation(row, col);
    
    // Get swap and fractal animations
    const swapAnim = swapAnimations ? swapAnimations.get(index) : null;
    const fractalAnim = fractalAnimations ? fractalAnimations.get(index) : null;
    
    // Check if this tile is in the current selection
    const isInSelection = hoveredTiles.has(index);
    
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
          left: tileLayout.left - layoutResult.inner.left,
          top: tileLayout.top - layoutResult.inner.top,
          width: tileLayout.size,
          height: tileLayout.size,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onStartShouldSetResponder={itemMode ? () => true : () => false}
        onResponderGrant={itemMode ? () => handleTilePress(row, col, value) : undefined}
        pointerEvents={itemMode ? "auto" : "box-none"}
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
              fontSize: Math.max(12, tileLayout.size * 0.5),
              fontWeight: isInSelection ? 'bold' : 'normal',
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
    <View style={styles.fullScreenContainer} pointerEvents="box-none">
      <View style={styles.container}>
        <View 
          style={[
            styles.chalkboard,
            {
              width: layoutConfig?.boardWidth || 300,
              height: layoutConfig?.boardHeight || 300,
            }
          ]}
          onLayout={handleBoardLayout}
          pointerEvents="auto"
        >
          {/* 数字方块内容区 */}
          <View
            {...panResponder.panHandlers}
            style={{
              position: 'absolute',
              left: layoutConfig?.woodFrameWidth + layoutConfig?.boardPadding,
              top: layoutConfig?.woodFrameWidth + layoutConfig?.boardPadding,
              width: (layoutConfig?.contentWidth || 300) - (layoutConfig?.boardPadding * 2 || 10),
              height: (layoutConfig?.contentHeight || 300) - (layoutConfig?.boardPadding * 2 || 10),
            }}
            pointerEvents={itemMode ? "auto" : "auto"}
          >
            {/* 🎯 数字方块容器 - 使用像素级精确定位 */}
            <View
              style={{
                width: '100%',
                height: '100%',
                position: 'relative',
              }}
            >
              {/* 渲染所有方块 */}
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
                    { color: '#000' }
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
          
          {/* 🐛 Debug: 显示内容区边界（开发时启用） */}
          {__DEV__ && layoutResult && false && (
            <>
              {/* 内容区边界 */}
              <View
                style={{
                  position: 'absolute',
                  left: layoutResult.inner.left - boardRect?.left,
                  top: layoutResult.inner.top - boardRect?.top,
                  width: layoutResult.inner.width,
                  height: layoutResult.inner.height,
                  borderWidth: 1,
                  borderColor: 'red',
                  borderStyle: 'dashed',
                  pointerEvents: 'none',
                }}
              />
              {/* 网格起点十字线 */}
              <View
                style={{
                  position: 'absolute',
                  left: layoutResult.startX - boardRect?.left - 5,
                  top: layoutResult.startY - boardRect?.top,
                  width: 10,
                  height: 1,
                  backgroundColor: 'blue',
                  pointerEvents: 'none',
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  left: layoutResult.startX - boardRect?.left,
                  top: layoutResult.startY - boardRect?.top - 5,
                  width: 1,
                  height: 10,
                  backgroundColor: 'blue',
                  pointerEvents: 'none',
                }}
              />
            </>
          )}
        </View>
      </View>
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
  tileInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF9E6', // Cream white sticky note
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: {
      width: 0.5,
      height: 0.5,
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
    fontWeight: 'normal',
    color: '#111',
    textAlign: 'center',
  },
  sumText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
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