/**
 * GameBoard Component - 自适应棋盘组件
 * Purpose: 使用统一的自适应布局系统渲染游戏棋盘
 */

import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  PanResponder, 
  StyleSheet,
  Animated,
  TouchableOpacity
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useGameStore } from '../store/gameStore';
import { useBoardMetrics } from '../hooks/useBoardMetrics';
import { hasValidCombinations, reshuffleBoard } from '../utils/gameLogic';
import { RescueModal } from './RescueModal';

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
  isChallenge = false
}) {
  const { settings } = useGameStore();
  const [selection, setSelection] = useState(null);
  const [hoveredTiles, setHoveredTiles] = useState(new Set());
  const [explosionAnimation, setExplosionAnimation] = useState(null);
  const [reshuffleCount, setReshuffleCount] = useState(0);
  const [showRescueModal, setShowRescueModal] = useState(false);
  
  const selectionOpacity = useRef(new Animated.Value(0)).current;
  const explosionScale = useRef(new Animated.Value(0)).current;
  const explosionOpacity = useRef(new Animated.Value(0)).current;
  const tileScales = useRef({}).current;

  if (!board) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading board...</Text>
      </View>
    );
  }

  const { width, height, tiles } = board;
  
  // 使用自适应布局计算
  const metrics = useBoardMetrics({ 
    rows: height, 
    cols: width,
    safeTop: isChallenge ? 120 : 80,
    safeBottom: isChallenge ? 140 : 80,
    safeHorizontalPadding: 20
  });

  // 生成稳定的方块旋转角度
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

  // 检查点击是否在棋盘区域内
  const isInsideBoard = (pageX, pageY) => {
    const { boardX, boardY, boardWidth, boardHeight } = metrics;
    return pageX >= boardX && pageX <= boardX + boardWidth &&
           pageY >= boardY && pageY <= boardY + boardHeight;
  };

  // 获取点击位置对应的行列
  const getGridPosition = (pageX, pageY) => {
    const { boardX, boardY, padding, tileSize, gap } = metrics;
    
    const relativeX = pageX - boardX - padding;
    const relativeY = pageY - boardY - padding;
    
    const cellWidth = tileSize + gap;
    const cellHeight = tileSize + gap;
    
    const col = Math.floor(relativeX / cellWidth);
    const row = Math.floor(relativeY / cellHeight);
    
    if (row >= 0 && row < height && col >= 0 && col < width) {
      return { row, col };
    }
    
    return null;
  };

  // 获取选中区域的方块
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

  // 手势响应器
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: (evt) => {
      if (itemMode || disabled) return false;
      const { pageX, pageY } = evt.nativeEvent;
      return isInsideBoard(pageX, pageY);
    },
    onMoveShouldSetPanResponder: (evt) => {
      if (itemMode || disabled) return false;
      const { pageX, pageY } = evt.nativeEvent;
      return isInsideBoard(pageX, pageY);
    },

    onPanResponderGrant: (evt) => {
      const { pageX, pageY } = evt.nativeEvent;
      const gridPos = getGridPosition(pageX, pageY);
      
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
      const gridPos = getGridPosition(pageX, pageY);
      
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
  });

  // 处理选择完成
  const handleSelectionComplete = async () => {
    if (!selection) return;

    const selectedTiles = getSelectedTiles();
    const sum = selectedTiles.reduce((acc, tile) => acc + tile.value, 0);
    const tilePositions = selectedTiles.map(tile => ({ row: tile.row, col: tile.col }));

    if (sum === 10 && selectedTiles.length > 0) {
      // 成功 - 创建爆炸效果
      setReshuffleCount(0);
      
      if (settings?.hapticsEnabled !== false) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      // 计算爆炸中心位置
      const { startRow, startCol, endRow, endCol } = selection;
      const centerRow = (startRow + endRow) / 2;
      const centerCol = (startCol + endCol) / 2;
      const centerPos = metrics.getTilePosition(centerRow, centerCol);
      
      setExplosionAnimation({ 
        x: centerPos.x + metrics.tileSize / 2, 
        y: centerPos.y + metrics.tileSize / 2 
      });
      
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

  // 渲染方块
  const renderTile = (value, row, col) => {
    if (value === 0) return null;
    
    const index = row * width + col;
    const position = metrics.getTilePosition(row, col);
    const tileScale = initTileScale(index);
    const rotation = getTileRotation(row, col);
    
    // 获取动画状态
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
    
    let tileStyle = [styles.tileInner, { 
      width: metrics.tileSize, 
      height: metrics.tileSize * 0.9 // 纸片感
    }];
    
    if (isSelected && itemMode) {
      if (itemMode === 'swapMaster') {
        tileStyle.push(styles.tileSwapSelected);
      } else if (itemMode === 'fractalSplit') {
        tileStyle.push(styles.tileFractalSelected);
      }
    }

    let opacity = 1;
    if (fractalAnim && fractalAnim.opacity) {
      opacity = fractalAnim.opacity;
    }

    const handleTileTouch = itemMode ? () => handleTilePress(row, col, value) : undefined;
    
    return (
      <TouchableOpacity
        key={`${row}-${col}`}
        style={{
          position: 'absolute',
          left: position.x,
          top: position.y,
          width: metrics.tileSize,
          height: metrics.tileSize,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onPress={handleTileTouch}
        activeOpacity={itemMode ? 0.7 : 1}
        disabled={!itemMode}
      >
        <Animated.View
          style={[
            tileStyle,
            {
              transform: transforms,
              opacity: opacity,
            }
          ]}
        >
          <Text style={[
            styles.tileText,
            { fontSize: metrics.fontSize }
          ]}>
            {value}
          </Text>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  // 获取选择框样式
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
    
    const startPos = metrics.getTilePosition(minRow, minCol);
    const selectionWidth = (maxCol - minCol + 1) * (metrics.tileSize + metrics.gap) - metrics.gap;
    const selectionHeight = (maxRow - minRow + 1) * (metrics.tileSize + metrics.gap) - metrics.gap;
    
    return {
      position: 'absolute',
      left: startPos.x,
      top: startPos.y,
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

  // 获取选择和显示
  const getSelectionSum = () => {
    if (!selection) return null;
    
    const selectedTiles = getSelectedTiles();
    const sum = selectedTiles.reduce((acc, tile) => acc + tile.value, 0);
    
    if (selectedTiles.length === 0) return null;
    
    const { startRow, startCol, endRow, endCol } = selection;
    const maxRow = Math.max(startRow, endRow);
    const maxCol = Math.max(startCol, endCol);
    
    const maxPos = metrics.getTilePosition(maxRow, maxCol);
    
    return {
      sum,
      isSuccess: sum === 10,
      style: {
        position: 'absolute',
        left: maxPos.x + metrics.tileSize - 30,
        top: maxPos.y + metrics.tileSize - 30,
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

  const selectionStyle = getSelectionStyle();
  const selectionSum = getSelectionSum();

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {/* 棋盘容器 */}
      <View
        style={[
          styles.chalkboard,
          {
            position: 'absolute',
            left: metrics.boardX,
            top: metrics.boardY,
            width: metrics.boardWidth,
            height: metrics.boardHeight,
          }
        ]}
      >
        {/* 渲染所有方块 */}
        {tiles.map((value, index) => {
          const row = Math.floor(index / width);
          const col = index % width;
          return renderTile(value, row, col);
        })}
        
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
      
      {/* 救援弹窗 */}
      <RescueModal
        visible={showRescueModal}
        onContinue={() => setShowRescueModal(false)}
        onReturn={() => {
          setShowRescueModal(false);
          if (onBoardRefresh) onBoardRefresh('return');
        }}
        hasItems={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
  tileInner: {
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
    backgroundColor: '#FFEB3B',
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