/**
 * GameBoard Component - Enhanced interactive puzzle board with advanced visual effects
 * Purpose: Render game tiles with enhanced touch interactions and explosion animations
 * Features: Flexible touch gestures, tile scaling, explosion effects, improved responsiveness
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  PanResponder, 
  Dimensions, 
  StyleSheet,
  Animated,
  TouchableOpacity
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useGameStore } from '../store/gameStore';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export function GameBoard({ 
  board, 
  onTilesClear, 
  onTileClick, 
  swapMode = false, 
  firstSwapTile = null, 
  disabled = false 
}) {
  const [shakeAnimations, setShakeAnimations] = useState({});
  const [selection, setSelection] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [anchorPoint, setAnchorPoint] = useState(null);
  const [currentPoint, setCurrentPoint] = useState(null);
  const [explosionAnimation, setExplosionAnimation] = useState(null);
  
  const { settings } = useGameStore();
  
  const selectionOpacity = useRef(new Animated.Value(0)).current;
  const tileScales = useRef({}).current;
  const explosionScale = useRef(new Animated.Value(0)).current;
  const explosionOpacity = useRef(new Animated.Value(0)).current;

  if (!board) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading board...</Text>
      </View>
    );
  }

  const { width, height, tiles } = board;
  
  // 计算格子大小
  const cellSize = Math.min(
    (screenWidth - 60) / width, 
    (screenHeight - 280) / height,
    50
  );
  
  // 数字方块的实际大小（比格子稍小，留出间距）
  const tileSize = cellSize * 0.85;
  const tileMargin = (cellSize - tileSize) / 2;
  
  // 棋盘背景大小 - 每边增加半个格子
  const boardPadding = cellSize / 2;
  const boardWidth = width * cellSize + boardPadding * 2;
  const boardHeight = height * cellSize + boardPadding * 2;
  
  // 数字方块在棋盘中的偏移量（居中显示）
  const boardOffsetX = boardPadding;
  const boardOffsetY = boardPadding;

  // 屏幕坐标转网格坐标
  const getGridPosition = (screenX, screenY) => {
    const relativeX = screenX - boardOffsetX;
    const relativeY = screenY - boardOffsetY;
    
    const col = Math.floor(relativeX / cellSize);
    const row = Math.floor(relativeY / cellSize);
    
    // 确保在有效范围内
    if (row >= 0 && row < height && col >= 0 && col < width) {
      return { row, col };
    }
    return null;
  };

  // 更新选择区域（支持全方向扩展）
  const updateSelection = (anchor, current) => {
    if (!anchor || !current) return;
    
    const minRow = Math.min(anchor.row, current.row);
    const maxRow = Math.max(anchor.row, current.row);
    const minCol = Math.min(anchor.col, current.col);
    const maxCol = Math.max(anchor.col, current.col);
    
    // 确保不超出边界
    const clampedMinRow = Math.max(0, minRow);
    const clampedMaxRow = Math.min(height - 1, maxRow);
    const clampedMinCol = Math.max(0, minCol);
    const clampedMaxCol = Math.min(width - 1, maxCol);
    
    const newSelection = {
      startRow: clampedMinRow,
      startCol: clampedMinCol,
      endRow: clampedMaxRow,
      endCol: clampedMaxCol,
    };
    
    setSelection(newSelection);
    
    // 显示选择框
    if (selectionOpacity._value === 0) {
      Animated.timing(selectionOpacity, {
        toValue: 0.6,
        duration: 50,
        useNativeDriver: false,
      }).start();
    }
  };

  // 重置选择状态
  const resetSelection = () => {
    setSelection(null);
    setIsSelecting(false);
    setAnchorPoint(null);
    setCurrentPoint(null);
    selectionOpacity.setValue(0);
  };

  // 初始化tile动画
  const initTileScale = (index) => {
    if (!tileScales[index]) {
      tileScales[index] = new Animated.Value(1);
    }
    return tileScales[index];
  };

  // 缩放tile
  const scaleTile = (index, scale) => {
    const tileScale = initTileScale(index);
    Animated.spring(tileScale, {
      toValue: scale,
      useNativeDriver: true,
      tension: 400,
      friction: 8,
    }).start();
  };

  // 晃动动画
  const startShakeAnimation = (index) => {
    if (!shakeAnimations[index]) {
      shakeAnimations[index] = new Animated.Value(0);
    }
    
    const shakeLoop = () => {
      Animated.sequence([
        Animated.timing(shakeAnimations[index], {
          toValue: 2,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnimations[index], {
          toValue: -2,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnimations[index], {
          toValue: 0,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.delay(700),
      ]).start(() => {
        if (swapMode) {
          shakeLoop();
        }
      });
    };
    
    shakeLoop();
  };

  // 停止晃动动画
  const stopShakeAnimation = (index) => {
    if (shakeAnimations[index]) {
      shakeAnimations[index].stopAnimation();
      shakeAnimations[index].setValue(0);
    }
  };

  // 停止所有晃动动画
  const stopAllShakeAnimations = () => {
    Object.keys(shakeAnimations).forEach(index => {
      stopShakeAnimation(parseInt(index));
    });
  };

  // 当进入交换模式时开始晃动
  useEffect(() => {
    if (swapMode) {
      tiles.forEach((value, index) => {
        if (value > 0) {
          startShakeAnimation(index);
        }
      });
    } else {
      // 退出交换模式时立即停止所有晃动
      stopAllShakeAnimations();
    }
    
    return () => {
      // 清理函数
      stopAllShakeAnimations();
    };
  }, [swapMode]);

  // 全屏触摸响应器
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled && !swapMode,
    onMoveShouldSetPanResponder: () => !disabled && !swapMode,

    onPanResponderGrant: (evt) => {
      if (isSelecting) return; // 防止重复开始
      
      const gridPos = getGridPosition(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
      if (!gridPos) return; // 点击在棋盘外
      
      // 设置锚点和当前点
      setAnchorPoint(gridPos);
      setCurrentPoint(gridPos);
      setIsSelecting(true);
      
      // 更新选择区域
      updateSelection(gridPos, gridPos);
    },

    onPanResponderMove: (evt) => {
      if (!isSelecting || !anchorPoint) return;
      
      const gridPos = getGridPosition(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
      if (!gridPos) return;
      
      setCurrentPoint(gridPos);
      updateSelection(anchorPoint, gridPos);
    },

    onPanResponderRelease: () => {
      if (isSelecting) {
        handleSelectionComplete();
      }
    },
  });

  const handleTilePress = (row, col) => {
    if (swapMode && onTileClick) {
      onTileClick(row, col);
    }
  };

  const getSelectedTilesForSelection = (sel) => {
    if (!sel) return [];
    
    const { startRow, startCol, endRow, endCol } = sel;
    const selectedTiles = [];
    
    // 计算框内所有有数字的方块
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
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

  const handleSelectionComplete = async () => {
    if (!selection) return;

    const selectedTiles = getSelectedTiles();
    const sum = selectedTiles.reduce((acc, tile) => acc + tile.value, 0);
    const tilePositions = selectedTiles.map(tile => ({ row: tile.row, col: tile.col }));

    const { startRow, startCol, endRow, endCol } = selection;

    if (sum === 10 && selectedTiles.length > 0) {
      // Success - 创建爆炸效果
      if (settings?.hapticsEnabled !== false) {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        } catch (error) {
          console.log('Haptics not available');
        }
      }
      
      // 计算爆炸中心位置
      const centerRow = (startRow + endRow) / 2;
      const centerCol = (startCol + endCol) / 2;
      const explosionX = centerCol * cellSize + cellSize / 2 + boardOffsetX;
      const explosionY = centerRow * cellSize + cellSize / 2 + boardOffsetY;
      
      setExplosionAnimation({ x: explosionX, y: explosionY });
      
      // 爆炸动画
      explosionScale.setValue(0);
      explosionOpacity.setValue(1);
      
      Animated.parallel([
        Animated.timing(explosionScale, {
          toValue: 2.5,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(explosionOpacity, {
          toValue: 0,
          duration: 800,
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
        resetSelection();
        if (onTilesClear) {
          onTilesClear(tilePositions);
        }
      });

    } else if (selectedTiles.length > 0) {
      // Failure - 蓝色反馈
      if (settings?.hapticsEnabled !== false) {
        try {
          // 短振动反馈
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (error) {
          console.log('Haptics not available');
        }
      }
      
      Animated.sequence([
        Animated.timing(selectionOpacity, {
          toValue: 0.5,
          duration: 150,
          useNativeDriver: false,
        }),
        Animated.timing(selectionOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: false,
        }),
      ]).start(() => {
        resetSelection();
      });
    } else {
      // No tiles selected
      resetSelection();
    }
  };

  const getSelectionStyle = () => {
    if (!selection) return null;
    
    const { startRow, startCol, endRow, endCol } = selection;
    const selectedTiles = getSelectedTiles();
    const sum = selectedTiles.reduce((acc, tile) => acc + tile.value, 0);
    const isSuccess = sum === 10;
    
    const left = startCol * cellSize + boardOffsetX;
    const top = startRow * cellSize + boardOffsetY;
    const selectionWidth = (endCol - startCol + 1) * cellSize;
    const selectionHeight = (endRow - startRow + 1) * cellSize;
    
    return {
      position: 'absolute',
      left,
      top,
      width: selectionWidth,
      height: selectionHeight,
      backgroundColor: isSuccess ? '#4CAF50' : '#2196F3',
      opacity: selectionOpacity,
      borderRadius: 8,
      borderWidth: 3,
      borderColor: isSuccess ? '#45a049' : '#1976D2',
    };
  };

  const getSelectionSum = () => {
    if (!selection) return null;
    
    const selectedTiles = getSelectedTiles();
    const sum = selectedTiles.reduce((acc, tile) => acc + tile.value, 0);
    
    if (selectedTiles.length === 0) return null;
    
    const { startRow, startCol, endRow, endCol } = selection;
    const centerRow = (startRow + endRow) / 2;
    const centerCol = (startCol + endCol) / 2;
    
    const left = centerCol * cellSize + boardOffsetX;
    const top = centerRow * cellSize + boardOffsetY;
    
    return {
      sum,
      isSuccess: sum === 10,
      style: {
        position: 'absolute',
        left: left - 20,
        top: top - 20,
        width: 40,
        height: 40,
        backgroundColor: sum === 10 ? '#FFD700' : '#2196F3',
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: sum === 10 ? '#FFA000' : '#1976D2',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 8,
      }
    };
  };

  const renderTile = (value, row, col) => {
    const index = row * width + col;
    
    if (row < 0 || row >= height || col < 0 || col >= width) {
      return null;
    }

    const left = col * cellSize + boardOffsetX + tileMargin;
    const top = row * cellSize + boardOffsetY + tileMargin;

    const tileScale = initTileScale(index);
    const shakeX = shakeAnimations[index] || new Animated.Value(0);

    // 检查是否是交换模式中被选中的方块
    const isFirstSwapTile = swapMode && firstSwapTile && firstSwapTile.index === index;
    // 检查是否在交换模式中且是数字方块
    const isSwapModeNumberTile = swapMode && value > 0;
    
    // 根据是否有数字选择样式
    let tileStyle;
    if (value === 0) {
      tileStyle = styles.emptyTile;
    } else if (isFirstSwapTile) {
      tileStyle = styles.selectedSwapTile;
    } else if (isSwapModeNumberTile) {
      tileStyle = styles.swapModeNumberTile;
    } else {
      tileStyle = styles.tile;
    }
    
    const animatedStyle = {
      transform: [
        { translateX: swapMode ? shakeX : 0 }, // 只在交换模式下晃动
        { scale: tileScale }
      ]
    };
    
    return (
      <Animated.View 
        key={`${row}-${col}`}
        style={[
          tileStyle,
          { 
            position: 'absolute',
            left,
            top,
            width: tileSize, 
            height: tileSize,
          },
          animatedStyle
        ]}
      >
        <TouchableOpacity
          style={styles.tileButton}
          onPress={() => handleTilePress(row, col)}
          disabled={!swapMode || value === 0}
        >
          {value > 0 && (
            <Text style={[
              styles.tileText,
              isFirstSwapTile && styles.selectedSwapTileText
            ]}>
              {value}
            </Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const selectionStyle = getSelectionStyle();
  const selectionSum = getSelectionSum();

  return (
    <View style={styles.fullScreenContainer}>
      <View style={styles.container}>
        <View 
          style={[
            styles.board,
            {
              width: boardWidth,
              height: boardHeight,
            }
          ]}
          {...panResponder.panHandlers}
        >
          {/* Render tiles */}
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
                  left: explosionAnimation.x - 30,
                  top: explosionAnimation.y - 30,
                  transform: [{ scale: explosionScale }],
                  opacity: explosionOpacity,
                }
              ]}
            >
              <View style={styles.explosionCenter}>
                <Text style={styles.explosionText}>10</Text>
              </View>
              {/* 爆炸粒子效果 */}
              {[...Array(12)].map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.explosionParticle,
                    {
                      transform: [
                        { rotate: `${i * 30}deg` },
                        { translateY: -25 }
                      ]
                    }
                  ]}
                />
              ))}
            </Animated.View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
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
  board: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 12,
    borderWidth: 6,
    borderColor: '#D4A574',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
    position: 'relative',
  },
  tile: {
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  emptyTile: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  selectedSwapTile: {
    backgroundColor: '#E8F5E8',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    borderWidth: 3,
    borderColor: '#4CAF50',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  swapModeNumberTile: {
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#FF9800',
    borderStyle: 'dashed',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tileButton: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileText: {
    fontWeight: 'bold',
    color: '#333',
    fontSize: 18,
  },
  selectedSwapTileText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  sumText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  explosion: {
    position: 'absolute',
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  explosionCenter: {
    width: 50,
    height: 50,
    backgroundColor: '#FFD700',
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFA000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  explosionText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  explosionParticle: {
    position: 'absolute',
    width: 8,
    height: 8,
    backgroundColor: '#FF6B35',
    borderRadius: 4,
  },
});