/**
 * GameBoard Component - Green chalkboard with sticky note style tiles
 * Purpose: Render game tiles with rectangle drawing on a classroom chalkboard theme
 * Features: Unified coordinate system, green chalkboard background, sticky note tiles
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
import { 
  computeBoardLayout, 
  getTilePositionFromSlot, 
  getSlotIndexFromScreenCoord,
  SAFE_TOP,
  SAFE_BOTTOM 
} from '../utils/gridLayout';
import { RescueModal } from './RescueModal';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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
  const [layout, setLayout] = useState(null);
  
  const selectionOpacity = useRef(new Animated.Value(0)).current;
  const explosionScale = useRef(new Animated.Value(0)).current;
  const explosionOpacity = useRef(new Animated.Value(0)).current;
  const tileScales = useRef({}).current;

  // 生成稳定的方块旋转角度
  const getTileRotation = (row, col) => {
    const seed = row * 1000 + col;
    const random = (seed * 9301 + 49297) % 233280;
    return ((random / 233280) - 0.5) * 2.4;
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

  // 计算统一布局
  React.useEffect(() => {
    if (board) {
      const usableWidth = screenWidth;
      const usableHeight = screenHeight - SAFE_TOP - SAFE_BOTTOM;
      const tileCount = board.tileCount || board.tiles.length;
      
      const newLayout = computeBoardLayout(usableWidth, usableHeight, tileCount);
      setLayout(newLayout);
    }
  }, [board, isChallenge]);

  if (!board) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading board...</Text>
      </View>
    );
  }

  const { tiles, tileCount } = board;
  const actualTileCount = tileCount || tiles.length;

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
    if (!layout || isInRestrictedArea(pageY)) return false;
    
    // 检查是否在棋盘有效区域内
    const boardLeft = layout.offsetX + layout.padding;
    const boardTop = SAFE_TOP + layout.offsetY + layout.padding;
    const boardRight = boardLeft + layout.cols * (layout.tileSize + layout.gap) - layout.gap;
    const boardBottom = boardTop + layout.rows * (layout.tileSize + layout.gap) - layout.gap;
    
    return pageX >= boardLeft && pageX <= boardRight && 
           pageY >= boardTop && pageY <= boardBottom;
  };

  const getSlotFromScreenCoord = (pageX, pageY) => {
    if (!layout) return null;
    
    const boardLeft = layout.offsetX + layout.padding;
    const boardTop = SAFE_TOP + layout.offsetY + layout.padding;
    
    const relativeX = pageX - boardLeft;
    const relativeY = pageY - boardTop;
    
    const cellWidth = layout.tileSize + layout.gap;
    const cellHeight = layout.tileSize + layout.gap;
    
    const col = Math.floor(relativeX / cellWidth);
    const row = Math.floor(relativeY / cellHeight);
    
    if (row >= 0 && row < layout.rows && col >= 0 && col < layout.cols) {
      return { row, col, index: row * layout.cols + col };
    }
    
    return null;
  };

  const isInRestrictedArea = (pageY) => {
    return pageY < SAFE_TOP || pageY > screenHeight - SAFE_BOTTOM;
  };

  const getSelectedTilesForSelection = (sel) => {
    if (!sel || !layout) return [];
    
    const { startRow, startCol, endRow, endCol } = sel;
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);
    
    const selectedTiles = [];
    
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        if (row >= 0 && row < layout.rows && col >= 0 && col < layout.cols) {
          const index = row * layout.cols + col;
          const value = index < tiles.length ? tiles[index] : 0;
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
      
      const slot = getSlotFromScreenCoord(pageX, pageY);
      if (!slot) return;
      
      setSelection({
        startRow: slot.row,
        startCol: slot.col,
        endRow: slot.row,
        endCol: slot.col,
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
      
      if (!isInsideGridArea(pageX, pageY)) return;
      
      const slot = getSlotFromScreenCoord(pageX, pageY);
      if (!slot) return;
      
      setSelection(prev => ({
        ...prev,
        endRow: slot.row,
        endCol: slot.col,
      }));

      // 更新悬停效果
      const newSelection = { ...selection, endRow: slot.row, endCol: slot.col };
      const newSelectedTiles = getSelectedTilesForSelection(newSelection);
      const newHoveredSet = new Set(newSelectedTiles.map(tile => tile.index));
      
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
      const buttonAreaBottom = screenHeight - 80;
      const buttonAreaTop = screenHeight - 160;
      
      if ((pageY >= buttonAreaTop && pageY <= buttonAreaBottom) || 
          pageY < SAFE_TOP) {
        return true;
      }
      
      return true;
    },
    
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
      setReshuffleCount(0);
      
      if (settings?.hapticsEnabled !== false) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      // 计算爆炸中心位置
      const { startRow, startCol, endRow, endCol } = selection;
      const centerRow = (startRow + endRow) / 2;
      const centerCol = (startCol + endCol) / 2;

      if (!layout) return;

      const cellWidth = layout.tileSize + layout.gap;
      const cellHeight = layout.tileSize + layout.gap;

      const explosionX = layout.offsetX + layout.padding + centerCol * cellWidth + layout.tileSize / 2;
      const explosionY = SAFE_TOP + layout.offsetY + layout.padding + centerRow * cellHeight + layout.tileSize / 2;
      
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
      // 失败反馈
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
    if (!selection || !layout) return null;
    
    const { startRow, startCol, endRow, endCol } = selection;
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);
    
    const selectedTiles = getSelectedTiles();
    const sum = selectedTiles.reduce((acc, tile) => acc + tile.value, 0);
    const isSuccess = sum === 10;
    
    const cellWidth = layout.tileSize + layout.gap;
    const cellHeight = layout.tileSize + layout.gap;

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
    if (!selection || !layout) return null;
    
    const selectedTiles = getSelectedTiles();
    const sum = selectedTiles.reduce((acc, tile) => acc + tile.value, 0);
    
    if (selectedTiles.length === 0) return null;
    
    const { startRow, startCol, endRow, endCol } = selection;
    const maxRow = Math.max(startRow, endRow);
    const maxCol = Math.max(startCol, endCol);
    
    const cellWidth = layout.tileSize + layout.gap;
    const cellHeight = layout.tileSize + layout.gap;

    const left = maxCol * cellWidth + layout.tileSize;
    const top = maxRow * cellHeight + layout.tileSize;
    
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

  const renderGridLines = () => {
    if (!layout) return null;

    const lines = [];
    const cellWidth = layout.tileSize + layout.gap;
    const cellHeight = layout.tileSize + layout.gap;

    // 垂直线
    for (let i = 1; i < layout.cols; i++) {
      lines.push(
        <View
          key={`v-${i}`}
          style={[
            styles.gridLine,
            {
              left: i * cellWidth - layout.gap / 2,
              top: 0,
              width: 1,
              height: layout.rows * cellHeight - layout.gap,
            }
          ]}
        />
      );
    }

    // 水平线
    for (let i = 1; i < layout.rows; i++) {
      lines.push(
        <View
          key={`h-${i}`}
          style={[
            styles.gridLine,
            {
              left: 0,
              top: i * cellHeight - layout.gap / 2,
              width: layout.cols * cellWidth - layout.gap,
              height: 1,
            }
          ]}
        />
      );
    }

    return lines;
  };

  const renderTile = (value, slotIndex) => {
    if (!layout || slotIndex >= layout.slots.length) return null;

    const slot = layout.slots[slotIndex];
    
    if (value === 0) {
      // 检查是否有临时跳跃动画
      const tempAnimKeys = Array.from(fractalAnimations ? fractalAnimations.keys() : [])
        .filter(key => key.toString().startsWith(`temp_${slotIndex}_`));
      
      if (tempAnimKeys.length > 0) {
        // 渲染跳跃中的临时方块
        return tempAnimKeys.map(tempKey => {
          const tempAnim = fractalAnimations.get(tempKey);
          if (!tempAnim) return null;
          
          const rotation = getTileRotation(slot.row, slot.col);
          
          const transforms = [
            { scale: tempAnim.scale },
            { rotate: `${rotation}deg` },
            { translateX: tempAnim.translateX },
            { translateY: tempAnim.translateY },
          ];
          
          const displayValue = tempAnim.value || Math.floor(Math.random() * 9) + 1;
          
          return (
            <Animated.View 
              key={tempKey}
              style={[
                { 
                  position: 'absolute',
                  left: slot.x,
                  top: slot.y,
                  width: slot.w,
                  height: slot.h,
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
                    fontSize: Math.max(14, slot.w * 0.45),
                    lineHeight: slot.h,
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

    const tileScale = initTileScale(slotIndex);
    const rotation = getTileRotation(slot.row, slot.col);
    
    // 获取交换和分裂动画
    const swapAnim = swapAnimations ? swapAnimations.get(slotIndex) : null;
    const fractalAnim = fractalAnimations ? fractalAnimations.get(slotIndex) : null;
    
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
    
    const isSelected = selectedSwapTile && selectedSwapTile.index === slotIndex;
    
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

    const handleTileTouch = itemMode ? () => handleTilePress(slot.row, slot.col, value) : undefined;
    
    return (
      <View
        key={`slot-${slotIndex}`}
        style={{
          position: 'absolute',
          left: slot.x,
          top: slot.y,
          width: slot.w,
          height: slot.h,
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
              fontSize: Math.max(14, slot.w * 0.45),
              lineHeight: slot.h,
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

  // 计算棋盘容器样式
  const getBoardContainerStyle = () => {
    if (!layout) return {};
    
    return {
      position: 'absolute',
      left: layout.offsetX,
      top: SAFE_TOP + layout.offsetY,
      width: layout.boardWidth,
      height: layout.boardHeight,
    };
  };

  return (
    <View style={styles.fullScreenContainer} {...panResponder.panHandlers}>
      <View style={styles.container}>
        {layout && (
          <View style={[styles.chalkboard, getBoardContainerStyle()]}>
            <View
              style={{
                position: 'absolute',
                left: layout.padding,
                top: layout.padding,
                width: layout.cols * (layout.tileSize + layout.gap) - layout.gap,
                height: layout.rows * (layout.tileSize + layout.gap) - layout.gap,
              }}
            >
              {/* 网格线 */}
              {renderGridLines()}
              
              {/* 渲染所有方块 */}
              {tiles.map((value, index) => renderTile(value, index))}
              
              {/* 选择框覆盖层 */}
              {selectionStyle && (
                <Animated.View style={selectionStyle} />
              )}
              
              {/* 选择和显示 */}
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
                      left: explosionAnimation.x - layout.offsetX - layout.padding - 40,
                      top: explosionAnimation.y - SAFE_TOP - layout.offsetY - layout.padding - 30,
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
          </View>
        )}
      </View>
      
      {/* 救援弹窗 */}
      <RescueModal
        visible={showRescueModal}
        onContinue={handleRescueContinue}
        onReturn={handleRescueReturn}
        hasItems={true}
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
    backgroundColor: '#1E5A3C', // 深绿色黑板
    borderRadius: 16,
    borderWidth: 8,
    borderColor: '#8B5A2B', // 木框边框
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
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
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
      return false;
    }

    const relativeX = pageX - boardLeft - boardPadding;
    const relativeY = pageY - boardTop - boardPadding;

    const cellWidth = layout.tileSize + layout.gap;
    const cellHeight = layout.tileSize + layout.gap;

    if (relativeX < 0 || relativeX >= layout.cols * cellWidth - layout.gap ||
        relativeY < 0 || relativeY >= layout.rows * cellHeight - layout.gap) {
      return false;
    }

    const col = Math.floor(relativeX / cellWidth);
    const row = Math.floor(relativeY / cellHeight);

    return row >= 0 && row < layout.rows && col >= 0 && col < layout.cols;
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
        if (row >= 0 && row < layout.rows && col >= 0 && col < layout.cols) {
          const index = row * layout.cols + col;
          const value = index < tiles.length ? tiles[index] : 0;
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
      
      const { offsetX, offsetY, boardPadding } = layout;

      const boardLeft = offsetX;
      const boardTop = offsetY;

      const relativeX = pageX - boardLeft - boardPadding;
      const relativeY = pageY - boardTop - boardPadding;

      const cellWidth = layout.tileSize + layout.gap;
      const cellHeight = layout.tileSize + layout.gap;

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
      
      const { offsetX, offsetY, boardPadding } = layout;

      const boardLeft = offsetX;
      const boardTop = offsetY;

      if (pageX < boardLeft + boardPadding || pageX > boardLeft + boardWidth - boardPadding ||
          pageY < boardTop + boardPadding || pageY > boardTop + boardHeight - boardPadding) {
        return;
      }
      
      const relativeX = pageX - boardLeft - boardPadding;
      const relativeY = pageY - boardTop - boardPadding;

      const cellWidth = layout.tileSize + layout.gap;
      const cellHeight = layout.tileSize + layout.gap;

      if (relativeX < 0 || relativeX >= layout.cols * cellWidth - layout.gap ||
          relativeY < 0 || relativeY >= layout.rows * cellHeight - layout.gap) {
        return;
      }
      
      const endCol = Math.floor(relativeX / cellWidth);
      const endRow = Math.floor(relativeY / cellHeight);
      
      if (endRow < 0 || endRow >= layout.rows || endCol < 0 || endCol >= layout.cols) {
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

      if (!layout) return;

      const cellWidth = layout.tileSize + layout.gap;
      const cellHeight = layout.tileSize + layout.gap;

      const explosionX = centerCol * cellWidth + layout.tileSize / 2;
      const explosionY = centerRow * cellHeight + layout.tileSize / 2;
      
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
    
    if (!layout) return null;

    const cellWidth = layout.tileSize + layout.gap;
    const cellHeight = layout.tileSize + layout.gap;

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
    
    if (!layout) return null;

    const cellWidth = layout.tileSize + layout.gap;
    const cellHeight = layout.tileSize + layout.gap;

    const left = maxCol * cellWidth + layout.tileSize;
    const top = maxRow * cellHeight + layout.tileSize;
    
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

  const renderGridLines = () => {
    if (!layout) return null;

    const lines = [];
    const cellWidth = layout.tileSize + layout.gap;
    const cellHeight = layout.tileSize + layout.gap;

    // Vertical lines
    for (let i = 1; i < layout.cols; i++) {
      lines.push(
        <View
          key={`v-${i}`}
          style={[
            styles.gridLine,
            {
              left: i * cellWidth - layout.gap / 2,
              top: 0,
              width: 1,
              height: layout.rows * cellHeight - layout.gap,
            }
          ]}
        />
      );
    }

    // Horizontal lines
    for (let i = 1; i < layout.rows; i++) {
      lines.push(
        <View
          key={`h-${i}`}
          style={[
            styles.gridLine,
            {
              left: 0,
              top: i * cellHeight - layout.gap / 2,
              width: layout.cols * cellWidth - layout.gap,
              height: 1,
            }
          ]}
        />
      );
    }

    return lines;
  };

  const renderTile = (value, row, col) => {
    if (!layout) return null;

    const index = row * layout.cols + col;
    
    if (value === 0) {
      // 检查是否有临时跳跃动画
      const tempAnimKeys = Array.from(fractalAnimations ? fractalAnimations.keys() : [])
        .filter(key => key.toString().startsWith(`temp_${index}_`));
      
      if (tempAnimKeys.length > 0) {
        // 渲染跳跃中的临时方块
        return tempAnimKeys.map(tempKey => {
          const tempAnim = fractalAnimations.get(tempKey);
          if (!tempAnim) return null;
          
          const { x, y } = getTilePosition(row, col, layout);
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
                  width: layout.tileSize,
                  height: layout.tileSize,
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
                    fontSize: Math.max(14, layout.tileSize * 0.45),
                    lineHeight: layout.tileSize,
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

    if (row < 0 || row >= layout.rows || col < 0 || col >= layout.cols) {
      return null;
    }

    const { x, y } = getTilePosition(row, col, layout);

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

  // 挑战模式使用全屏尺寸，闯关模式使用固定尺寸
  const boardContainerStyle = isChallenge 
    ? {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      } 
    : {
        width: 320,
        height: 400,
      };

  return (
    <View style={styles.fullScreenContainer} {...panResponder.panHandlers}>
      <View style={styles.container}>
        <View 
          style={[styles.chalkboard, boardContainerStyle]}
        >
          {layout && (
            <View
              style={{
                position: 'absolute',
                width: layout.boardWidth,
                height: layout.boardHeight,
                left: layout.offsetX,
                top: layout.offsetY,
              }}
            >
              {/* Grid lines */}
              {renderGridLines()}
              
              {/* Render all tiles */}
              {Array.from({ length: actualTileCount }, (_, index) => {
                const row = Math.floor(index / layout.cols);
                const col = index % layout.cols;
                const value = index < tiles.length ? tiles[index] : 0;
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