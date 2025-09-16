/**
 * GameBoard Component - 固定左上角锚点的画框选取功能
 * Purpose: 实现点击处固定为左上顶点、拖动只向右下扩展的画框操作
 * Features: 二维前缀和优化、震动反馈、爆炸动画
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
  const { settings } = useGameStore();
  
  // 状态管理
  const [shakeAnimations, setShakeAnimations] = useState({});
  const [selection, setSelection] = useState(null);
  const [anchorPoint, setAnchorPoint] = useState(null);
  const [prefixSum, setPrefixSum] = useState([]);
  const [explosionAnimation, setExplosionAnimation] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  
  // 动画引用
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
  
  // 棋盘背景大小
  const boardWidth = width * cellSize + 20;
  const boardHeight = height * cellSize + 20;

  // 计算二维前缀和
  useEffect(() => {
    if (!tiles || tiles.length === 0) return;
    
    const newPrefixSum = Array(height + 1).fill(null).map(() => Array(width + 1).fill(0));
    
    for (let r = 1; r <= height; r++) {
      for (let c = 1; c <= width; c++) {
        const tileIndex = (r - 1) * width + (c - 1);
        const tileValue = tiles[tileIndex] || 0;
        newPrefixSum[r][c] = tileValue + 
                            newPrefixSum[r-1][c] + 
                            newPrefixSum[r][c-1] - 
                            newPrefixSum[r-1][c-1];
      }
    }
    
    setPrefixSum(newPrefixSum);
  }, [tiles, width, height]);

  // 使用前缀和计算区域总和 O(1)
  const calculateRangeSum = (r1, c1, r2, c2) => {
    if (!prefixSum.length || r1 < 0 || c1 < 0 || r2 >= height || c2 >= width) return 0;
    
    // 转换为前缀和数组的索引（1-based）
    const pr1 = r1 + 1, pc1 = c1 + 1, pr2 = r2 + 1, pc2 = c2 + 1;
    
    return prefixSum[pr2][pc2] - 
           prefixSum[pr1-1][pc2] - 
           prefixSum[pr2][pc1-1] + 
           prefixSum[pr1-1][pc1-1];
  };

  // 初始化tile动画
  const initTileScale = (index) => {
    if (!tileScales[index]) {
      tileScales[index] = new Animated.Value(1);
    }
    return tileScales[index];
  };

  // 停止所有晃动动画
  const stopAllShakeAnimations = () => {
    Object.keys(shakeAnimations).forEach(index => {
      if (shakeAnimations[index]) {
        shakeAnimations[index].stopAnimation();
        shakeAnimations[index].setValue(0);
      }
    });
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

  // 当进入交换模式时开始晃动
  useEffect(() => {
    if (swapMode) {
      tiles.forEach((value, index) => {
        if (value > 0) {
          startShakeAnimation(index);
        }
      });
    } else {
      stopAllShakeAnimations();
    }
    
    return () => {
      stopAllShakeAnimations();
    };
  }, [swapMode]);

  // 坐标转换：屏幕坐标 -> 网格坐标
  const screenToGrid = (screenX, screenY) => {
    const relativeX = screenX - 10; // 减去棋盘内边距
    const relativeY = screenY - 10;
    
    const col = Math.floor(relativeX / cellSize);
    const row = Math.floor(relativeY / cellSize);
    
    return {
      row: Math.max(0, Math.min(height - 1, row)),
      col: Math.max(0, Math.min(width - 1, col))
    };
  };

  // 检查点击是否在棋盘范围内
  const isInBoardRange = (screenX, screenY) => {
    return screenX >= 10 && screenX <= boardWidth - 10 && 
           screenY >= 10 && screenY <= boardHeight - 10;
  };

  // 全屏触摸响应器
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled && !swapMode && !isLocked,
    onMoveShouldSetPanResponder: () => !disabled && !swapMode && !isLocked,

    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      
      // 判断点击是否在棋盘范围内
      if (!isInBoardRange(locationX, locationY)) {
        return;
      }
      
      // 将点击位置换算成对应的行列，记录为锚点
      const gridPos = screenToGrid(locationX, locationY);
      setAnchorPoint(gridPos);
      
      // 初始化选区为锚点到锚点（1x1）
      setSelection({
        startRow: gridPos.row,
        startCol: gridPos.col,
        endRow: gridPos.row,
        endCol: gridPos.col,
      });
      
      // 立即显示选择框
      Animated.timing(selectionOpacity, {
        toValue: 0.6,
        duration: 50,
        useNativeDriver: false,
      }).start();
    },

    onPanResponderMove: (evt) => {
      if (!anchorPoint || !selection) return;
      
      const { locationX, locationY } = evt.nativeEvent;
      
      // 计算当前指针位置的行列
      const currentPos = screenToGrid(locationX, locationY);
      
      // 固定锚点为左上角，只向右下方向扩展
      const endRow = Math.max(anchorPoint.row, currentPos.row);
      const endCol = Math.max(anchorPoint.col, currentPos.col);
      
      setSelection({
        startRow: anchorPoint.row,
        startCol: anchorPoint.col,
        endRow: endRow,
        endCol: endCol,
      });
    },

    onPanResponderRelease: () => {
      handleSelectionComplete();
    },
  });

  const handleTilePress = (row, col) => {
    if (swapMode && onTileClick) {
      onTileClick(row, col);
      // 交换完成后停止所有晃动动画
      setTimeout(() => {
        stopAllShakeAnimations();
      }, 100);
    }
  };

  const getSelectedTiles = () => {
    if (!selection) return [];
    
    const { startRow, startCol, endRow, endCol } = selection;
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

  const handleSelectionComplete = async () => {
    if (!selection) return;

    const selectedTiles = getSelectedTiles();
    const { startRow, startCol, endRow, endCol } = selection;
    
    // 使用前缀和快速计算总和
    const sum = calculateRangeSum(startRow, startCol, endRow, endCol);
    const tilePositions = selectedTiles.map(tile => ({ row: tile.row, col: tile.col }));

    if (sum === 10 && selectedTiles.length > 0) {
      // 成功 - 锁定棋盘并播放动画
      setIsLocked(true);
      
      // 长震动反馈
      if (settings?.hapticsEnabled !== false) {
        try {
          // 连续震动模拟长震动
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 100);
          setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 200);
        } catch (error) {
          console.log('Haptics not available');
        }
      }
      
      // 计算爆炸中心位置
      const centerRow = (startRow + endRow) / 2;
      const centerCol = (startCol + endCol) / 2;
      const explosionX = centerCol * cellSize + cellSize / 2 + 10;
      const explosionY = centerRow * cellSize + cellSize / 2 + 10;
      
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
        setIsLocked(false);
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
        setAnchorPoint(null);
        if (onTilesClear) {
          onTilesClear(tilePositions);
        }
      });

    } else if (selectedTiles.length > 0) {
      // 失败 - 短震动反馈
      if (settings?.hapticsEnabled !== false) {
        try {
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
        setSelection(null);
        setAnchorPoint(null);
      });
    } else {
      // 没有选择任何方块
      setSelection(null);
      setAnchorPoint(null);
    }
  };

  const getSelectionStyle = () => {
    if (!selection) return null;
    
    const { startRow, startCol, endRow, endCol } = selection;
    const selectedTiles = getSelectedTiles();
    const sum = calculateRangeSum(startRow, startCol, endRow, endCol);
    const isSuccess = sum === 10;
    
    const left = startCol * cellSize + 10;
    const top = startRow * cellSize + 10;
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
    
    const { startRow, startCol, endRow, endCol } = selection;
    const sum = calculateRangeSum(startRow, startCol, endRow, endCol);
    
    if (sum === 0) return null;
    
    const centerRow = (startRow + endRow) / 2;
    const centerCol = (startCol + endCol) / 2;
    
    const left = centerCol * cellSize + 10;
    const top = centerRow * cellSize + 10;
    
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

    const left = col * cellSize + 10 + tileMargin;
    const top = row * cellSize + 10 + tileMargin;

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
        { translateX: shakeX },
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
    backgroundColor: '#2E7D32', // 深绿色背景
    padding: 10,
    borderRadius: 12,
    borderWidth: 6,
    borderColor: '#8D6E63', // 棕色边框
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