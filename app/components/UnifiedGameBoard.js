/**
 * UnifiedGameBoard - 统一的游戏棋盘组件
 * 用于闯关模式和挑战模式，使用函数式布局确保方块始终在棋盘内
 */

import React, { useState, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  PanResponder, 
  StyleSheet,
  Animated
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useBoardLayout } from '../layout/useBoardLayout';
import { useGameStore } from '../store/gameStore';

export function UnifiedGameBoard({ 
  board, 
  onTilesClear, 
  onTileClick, 
  itemMode = null,
  selectedSwapTile = null,
  disabled = false,
  swapAnimations = new Map(),
  fractalAnimations = new Map(),
  containerHeight = 600
}) {
  const { settings } = useGameStore();
  const [containerSize, setContainerSize] = useState({ width: 350, height: 600 }); // 设置合理的默认值
  const [selection, setSelection] = useState(null);
  const [hoveredTiles, setHoveredTiles] = useState(new Set());
  
  const selectionOpacity = useRef(new Animated.Value(0)).current;
  const tileScales = useRef({}).current;

  // 计算可用区域
  const usableWidth = Math.max(containerSize.width, 350); // 最小宽度350
  const usableHeight = Math.max(containerSize.height - 240, 400); // 扣除安全区域，最小高度400
  const tileCount = board?.tiles?.length || 0;
  const layout = useBoardLayout(usableWidth, usableHeight, tileCount);

  const onContainerLayout = useCallback((event) => {
    const { width, height } = event.nativeEvent.layout;
    console.log('🔍 Container layout:', { 
      width, 
      height, 
      containerHeight, 
      usableWidth: Math.max(width, 350), 
      usableHeight: Math.max(height - 240, 400) 
    });
    setContainerSize({ width, height });
  }, []);

  // 获取方块旋转角度（稳定的随机值）
  const getTileRotation = (row, col) => {
    const seed = row * 1000 + col;
    const random = (seed * 9301 + 49297) % 233280;
    return ((random / 233280) - 0.5) * 2.4; // -1.2° to +1.2°
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

  // 检查点是否在棋盘内
  const isInsideBoardArea = (localX, localY) => {
    if (!layout) return false;
    
    return localX >= 0 && localX <= layout.boardW && 
           localY >= 0 && localY <= layout.boardH;
  };

  // 根据坐标获取槽位
  const getSlotFromCoord = (localX, localY) => {
    if (!layout || !isInsideBoardArea(localX, localY)) return null;
    
    const relativeX = localX - layout.padding;
    const relativeY = localY - layout.padding;
    
    if (relativeX < 0 || relativeY < 0) return null;
    
    const cellWidth = 30 + layout.gap; // TILE_SIZE + gap
    const cellHeight = 30 + layout.gap;
    
    const col = Math.floor(relativeX / cellWidth);
    const row = Math.floor(relativeY / cellHeight);
    
    const slot = layout.slots.find(s => s.row === row && s.col === col && s.filled);
    return slot;
  };

  // 获取选中的方块
  const getSelectedTiles = () => {
    if (!selection || !layout || !board) return [];
    
    const { startRow, startCol, endRow, endCol } = selection;
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);
    
    const selectedTiles = [];
    
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const slot = layout.slots.find(s => s.row === row && s.col === col && s.filled);
        if (slot && slot.index < board.tiles.length) {
          const value = board.tiles[slot.index];
          if (value > 0) {
            selectedTiles.push({ row, col, value, index: slot.index });
          }
        }
      }
    }
    
    return selectedTiles;
  };

  // 处理选择完成
  const handleSelectionComplete = () => {
    if (!selection) return;

    const selectedTiles = getSelectedTiles();
    const sum = selectedTiles.reduce((acc, tile) => acc + tile.value, 0);
    const tilePositions = selectedTiles.map(tile => ({ row: tile.row, col: tile.col }));

    if (sum === 10 && selectedTiles.length > 0) {
      // 成功消除
      if (settings?.hapticsEnabled !== false) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      // 成功动画
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

  // 手势响应器
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !itemMode && !disabled,
    onMoveShouldSetPanResponder: () => !itemMode && !disabled,

    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      const slot = getSlotFromCoord(locationX, locationY);
      
      if (slot) {
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
      }
    },

    onPanResponderMove: (evt) => {
      if (!selection) return;
      
      const { locationX, locationY } = evt.nativeEvent;
      const slot = getSlotFromCoord(locationX, locationY);
      
      if (slot) {
        setSelection(prev => ({
          ...prev,
          endRow: slot.row,
          endCol: slot.col,
        }));

        // 更新悬停效果
        const selectedTiles = getSelectedTiles();
        const newHoveredSet = new Set(selectedTiles.map(tile => tile.index));
        
        const sum = selectedTiles.reduce((acc, tile) => acc + tile.value, 0);
        const targetScale = sum === 10 ? 1.1 : 1.05;
        
        selectedTiles.forEach(tile => {
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
  });

  // 处理方块点击（道具模式）
  const handleTilePress = (slot, value) => {
    if (!itemMode || disabled || value === 0) return;
    
    if (onTileClick) {
      onTileClick(slot.row, slot.col, value);
    }
    
    if (settings?.hapticsEnabled !== false) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // 获取选择框样式
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
    
    const cellWidth = 30 + layout.gap;
    const cellHeight = 30 + layout.gap;

    const left = layout.padding + minCol * cellWidth;
    const top = layout.padding + minRow * cellHeight;
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

  // 渲染方块
  const renderTile = (slot) => {
    if (!slot.filled || !board || slot.index >= board.tiles.length) return null;
    
    const value = board.tiles[slot.index];
    if (value === 0) return null;

    const tileScale = initTileScale(slot.index);
    const rotation = getTileRotation(slot.row, slot.col);
    
    // 获取动画
    const swapAnim = swapAnimations.get(slot.index);
    const fractalAnim = fractalAnimations.get(slot.index);
    
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
    
    const isSelected = selectedSwapTile && selectedSwapTile.index === slot.index;
    
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

    return (
      <View
        key={`${slot.row}-${slot.col}`}
        style={{
          position: 'absolute',
          left: slot.x,
          top: slot.y,
          width: slot.w,
          height: slot.h,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onTouchStart={itemMode ? () => handleTilePress(slot, value) : undefined}
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
          <Text style={styles.tileText}>{value}</Text>
        </Animated.View>
      </View>
    );
  };

  if (!board || !layout) {
    console.log('❌ Board or layout missing:', { 
      hasBoard: !!board, 
      hasLayout: !!layout, 
      containerSize,
      boardTiles: board?.tiles?.length,
      usableHeight: containerSize.height > 0 ? containerSize.height - 240 : 400
    });
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading board...</Text>
      </View>
    );
  }

  console.log('✅ Rendering board with layout:', { 
    boardTiles: board.tiles?.length, 
    layoutSlots: layout.slots?.length,
    containerSize,
    usableHeight,
    layoutDetails: {
      rows: layout.rows,
      cols: layout.cols,
      boardW: layout.boardW,
      boardH: layout.boardH
    }
  });

  const selectionStyle = getSelectionStyle();

  return (
    <View style={[styles.container, { minWidth: 350, minHeight: 600 }]} onLayout={onContainerLayout}>
      <View 
        style={[
          styles.boardContainer,
          {
            width: layout.boardW,
            height: layout.boardH,
            left: layout.offsetX,
            top: layout.offsetY,
          }
        ]}
        {...panResponder.panHandlers}
      >
        {/* 渲染所有方块 */}
        {layout.slots.map((slot) => renderTile(slot))}
        
        {/* 选择框 */}
        {selectionStyle && (
          <Animated.View style={selectionStyle} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    minWidth: 350,
    minHeight: 600,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  boardContainer: {
    position: 'absolute',
    backgroundColor: '#1E5A3C', // 深绿色棋盘
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111',
    textAlign: 'center',
  },
});