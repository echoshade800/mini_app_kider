/**
 * GameBoard Component - 使用新的自适应布局系统
 * Purpose: 渲染自适应棋盘，所有布局由BoardLayout统一管理
 * Features: 完全响应式、最小28px方块、棋盘比矩形大一圈
 */

import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  PanResponder, 
  StyleSheet,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { hasValidCombinations, reshuffleBoard } from '../utils/gameLogic';
import RescueModal from './RescueModal';

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
  layoutConfig // 新增：布局配置
}) => {
  const [selection, setSelection] = useState(null);
  const [hoveredTiles, setHoveredTiles] = useState(new Set());
  const [explosionAnimation, setExplosionAnimation] = useState(null);
  const [calibrationAttempts, setCalibrationAttempts] = useState(0);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationAnimations, setCalibrationAnimations] = useState(new Map());
  
  const selectionOpacity = useRef(new Animated.Value(0)).current;
  const explosionScale = useRef(new Animated.Value(0)).current;
  const explosionOpacity = useRef(new Animated.Value(0)).current;
  const tileScales = useRef(new Map()).current;

  // 如果没有布局配置，显示加载状态
  if (!layoutConfig) {
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
      // 重置重排计数
      setReshuffleCount(0);
      setCalibrationAttempts(0);
      
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
  };

  // 检查是否有可消除的组合，如果没有则进行校准
  const checkForValidCombinations = async (currentTiles = tiles, currentWidth = width, currentHeight = height) => {
    if (!currentTiles || !currentWidth || !currentHeight) return;
    
    const hasValidMoves = hasValidCombinations(currentTiles, currentWidth, currentHeight);
    
    if (!hasValidMoves) {
      // 没有可消除组合，尝试重排
      if (calibrationAttempts < 3) {
        console.log(`校准尝试 ${calibrationAttempts + 1}/3`);
        await performCalibrationWithAnimation(currentTiles, currentWidth, currentHeight);
      } else {
        // 已经尝试3次，显示救援弹窗
        console.log('已达到最大校准次数，显示救援弹窗');
        if (onRescueNeeded) {
          onRescueNeeded();
        }
      }
    } else {
      console.log('棋盘有可消除组合，无需校准');
    }
  };

  // 执行带动画的校准过程
  const performCalibrationWithAnimation = async (currentTiles, currentWidth, currentHeight) => {
    setIsCalibrating(true);
    
    console.log('开始校准动画...');
    
    // 生成新的排列
    const newTiles = reshuffleBoard(currentTiles, currentWidth, currentHeight);
    
    // 创建交换动画
    await createSwapAnimations(currentTiles, newTiles, currentWidth, currentHeight);
    
    // 等待动画完成后更新棋盘
    setTimeout(() => {
      // 通知父组件更新棋盘
      if (onTilesClear) {
        // 创建一个特殊的更新信号，传递新的tiles数据
        onTilesClear([], newTiles);
      }
    }, 100);
    
    // 检查新排列是否有解
    const hasValidMovesAfterShuffle = hasValidCombinations(newTiles, currentWidth, currentHeight);
    
    if (hasValidMovesAfterShuffle) {
      // 重排后有解，更新棋盘
      console.log('校准成功，找到可消除组合');
      setCalibrationAttempts(0);
    } else {
      // 重排后仍无解，增加尝试次数
      console.log('校准失败，继续尝试');
      setCalibrationAttempts(prev => prev + 1);
      
      if (calibrationAttempts + 1 >= 3) {
        // 三次校准都失败，显示救援弹窗
        console.log('三次校准都失败，显示救援弹窗');
        if (onRescueNeeded) {
          onRescueNeeded();
        }
      } else {
        // 继续尝试重排
        setTimeout(() => {
          checkForValidCombinations(currentTiles, currentWidth, currentHeight);
        }, 1000);
      }
    }
    
    setIsCalibrating(false);
  };

  // 创建数字方块交换动画
  const createSwapAnimations = (oldTiles, newTiles, boardWidth, boardHeight) => {
    return new Promise((resolve) => {
      console.log('创建交换动画...');
      const animations = new Map();
      
      // 找出所有需要交换的位置
      const swapPairs = [];
      const processed = new Set();
      
      for (let i = 0; i < oldTiles.length; i++) {
        if (oldTiles[i] !== newTiles[i] && oldTiles[i] > 0 && !processed.has(i)) {
          // 找到这个数字在新排列中的位置
          for (let j = i + 1; j < newTiles.length; j++) {
            if (newTiles[j] === oldTiles[i] && oldTiles[j] === newTiles[i] && !processed.has(j)) {
              swapPairs.push([i, j]);
              processed.add(i);
              processed.add(j);
              break;
            }
          }
        }
      }
      
      console.log(`找到 ${swapPairs.length} 个交换对`);
      
      // 为每个交换对创建动画
      const animationPromises = [];
      
      swapPairs.forEach(([pos1, pos2]) => {
        const row1 = Math.floor(pos1 / boardWidth);
        const col1 = pos1 % boardWidth;
        const row2 = Math.floor(pos2 / boardWidth);
        const col2 = pos2 % boardWidth;
        
        const pos1Layout = layoutConfig.getTilePosition(row1, col1);
        const pos2Layout = layoutConfig.getTilePosition(row2, col2);
        
        if (pos1Layout && pos2Layout) {
          console.log(`创建动画: (${row1},${col1}) <-> (${row2},${col2})`);
          
          // 计算移动距离
          const deltaX = pos2Layout.x - pos1Layout.x;
          const deltaY = pos2Layout.y - pos1Layout.y;
          
          // 创建动画值
          const translateX1 = new Animated.Value(0);
          const translateY1 = new Animated.Value(0);
          const translateX2 = new Animated.Value(0);
          const translateY2 = new Animated.Value(0);
          
          animations.set(pos1, { translateX: translateX1, translateY: translateY1 });
          animations.set(pos2, { translateX: translateX2, translateY: translateY2 });
          
          // 创建交换动画
          const animation1 = Animated.parallel([
            Animated.timing(translateX1, {
              toValue: deltaX,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(translateY1, {
              toValue: deltaY,
              duration: 800,
              useNativeDriver: true,
            }),
          ]);
          
          const animation2 = Animated.parallel([
            Animated.timing(translateX2, {
              toValue: -deltaX,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(translateY2, {
              toValue: -deltaY,
              duration: 800,
              useNativeDriver: true,
            }),
          ]);
          
          animationPromises.push(animation1);
          animationPromises.push(animation2);
        }
      });
      
      // 设置动画状态
      setCalibrationAnimations(animations);
      
      // 执行所有动画
      if (animationPromises.length > 0) {
        console.log(`开始执行 ${animationPromises.length} 个动画`);
        Animated.parallel(animationPromises).start(() => {
          console.log('动画执行完成');
          // 动画完成后清理
          setCalibrationAnimations(new Map());
          resolve();
        });
      } else {
        console.log('没有需要执行的动画');
        resolve();
      }
    });
  };
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
      
      const { boardLeft, boardTop, boardPadding, tileSize, tileGap, woodFrameWidth } = layoutConfig;

      const contentLeft = boardLeft + woodFrameWidth + boardPadding;
      const contentTop = boardTop + woodFrameWidth + boardPadding;

      const relativeX = pageX - contentLeft;
      const relativeY = pageY - contentTop;

      const cellWidth = tileSize + tileGap;
      const cellHeight = tileSize + tileGap;

      const startCol = Math.floor(relativeX / cellWidth);
      const startRow = Math.floor(relativeY / cellHeight);
      
      if (startRow >= 0 && startRow < height && startCol >= 0 && startCol < width) {
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
      const { boardLeft, boardTop, boardPadding, tileSize, tileGap, woodFrameWidth } = layoutConfig;

      const contentLeft = boardLeft + woodFrameWidth + boardPadding;
      const contentTop = boardTop + woodFrameWidth + boardPadding;

      const relativeX = pageX - contentLeft;
      const relativeY = pageY - contentTop;

      const cellWidth = tileSize + tileGap;
      const cellHeight = tileSize + tileGap;

      const endCol = Math.floor(relativeX / cellWidth);
      const endRow = Math.floor(relativeY / cellHeight);
      
      if (endRow >= 0 && endRow < height && endCol >= 0 && endCol < width) {
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
    if (!itemMode || disabled) return;
    
    if (onTileClick) {
      onTileClick(row, col, value);
    }
    
    if (settings?.hapticsEnabled !== false) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // 处理救援选择
  const handleRescueContinue = () => {
    setCalibrationAttempts(0);
  };

  const handleRescueReturn = () => {
    setCalibrationAttempts(0);
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
    
    const { tileSize, tileGap } = layoutConfig;
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
    
    const { tileSize, tileGap } = layoutConfig;
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

  const renderTile = (value, row, col) => {
    const index = row * width + col;
    
    // 只有非零值才显示数字方块，值为0时不显示任何内容
    if (value === 0) {
      return null; // 空位不渲染任何内容
    }

    const tilePos = layoutConfig.getTilePosition(row, col);
    if (!tilePos) return null;

    const tileScale = initTileScale(index);
    const rotation = getTileRotation(row, col);
    
    // Get swap and fractal animations
    const swapAnim = swapAnimations ? swapAnimations.get(index) : null;
    const fractalAnim = fractalAnimations ? fractalAnimations.get(index) : null;
    const calibrationAnim = calibrationAnimations ? calibrationAnimations.get(index) : null;
    
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
    
    if (calibrationAnim && calibrationAnim.translateX && calibrationAnim.translateY) {
      transforms.push({
        translateX: calibrationAnim.translateX,
      });
      transforms.push({
        translateY: calibrationAnim.translateY,
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
          left: tilePos.x,
          top: tilePos.y,
          width: tilePos.width,
          height: tilePos.height,
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
              fontSize: Math.max(12, tilePos.width * 0.5),
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
              left: layoutConfig.boardLeft,
              top: layoutConfig.boardTop,
              width: layoutConfig.boardWidth,
              height: layoutConfig.boardHeight,
            }
          ]}
        >
          {/* 数字方块内容区 */}
          <View
            style={{
              position: 'absolute',
              left: layoutConfig.woodFrameWidth + layoutConfig.boardPadding,
              top: layoutConfig.woodFrameWidth + layoutConfig.boardPadding,
              width: layoutConfig.contentWidth - layoutConfig.boardPadding * 2,
              height: layoutConfig.contentHeight - layoutConfig.boardPadding * 2,
            }}
          >
            {/* 渲染所有方块 */}
            {tiles.map((value, index) => {
              const row = Math.floor(index / width);
              const col = index % width;
              return renderTile(value, row, col);
            })}
            
            {/* 校准状态提示 */}
            {isCalibrating && (
              <View style={styles.calibrationOverlay}>
                <Text style={styles.calibrationText}>Calibrating...</Text>
              </View>
            )}
            
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
  calibrationOverlay: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 152, 0, 0.9)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  calibrationText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default GameBoard;