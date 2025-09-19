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
  const [hasInitialCheck, setHasInitialCheck] = useState(false);
  
  const selectionOpacity = useRef(new Animated.Value(0)).current;
  const explosionScale = useRef(new Animated.Value(0)).current;
  const explosionOpacity = useRef(new Animated.Value(0)).current;
  const tileScales = useRef(new Map()).current;

  // 重置初始检查状态当关卡改变时
  useEffect(() => {
    console.log('🔍 [CALIBRATION] useEffect triggered:', { 
      hasInitialCheck, 
      tilesLength: tiles?.length, 
      width, 
      height, 
      hasLayoutConfig: !!layoutConfig 
    });
    
    if (!hasInitialCheck && tiles && width && height && layoutConfig) {
      console.log('🔍 [CALIBRATION] Setting hasInitialCheck to true, scheduling check...');
      setHasInitialCheck(true);
      // 延迟检查，确保组件完全渲染
      setTimeout(() => {
        console.log('🔍 [CALIBRATION] Executing delayed checkForValidCombinations...');
        checkForValidCombinations();
      }, 500);
    } else {
      console.log('🔍 [CALIBRATION] Skipping initial check:', {
        hasInitialCheck,
        hasTiles: !!tiles,
        hasWidth: !!width,
        hasHeight: !!height,
        hasLayoutConfig: !!layoutConfig
      });
    }
  }, [tiles, width, height, layoutConfig, hasInitialCheck]);

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
  const checkForValidCombinations = async () => {
    console.log('🔍 [CALIBRATION] checkForValidCombinations called');
      console.log('❌ [CALIBRATION] Missing required data:', { 
        hasTiles: !!tiles, 
        width, 
        height 
      });
    
    if (!tiles || !width || !height) return;
    
    console.log('🔍 [CALIBRATION] Checking for valid combinations...');
    console.log('🔍 [CALIBRATION] Board state:', {
      tilesLength: tiles.length,
      nonZeroTiles: tiles.filter(t => t > 0).length,
      calibrationAttempts,
      tiles: tiles.slice(0, Math.min(20, tiles.length)) // 只显示前20个方块
    });
    
    const hasValidMoves = hasValidCombinations(tiles, width, height);
    console.log('🔍 [CALIBRATION] hasValidCombinations result:', hasValidMoves);
    
    if (!hasValidMoves) {
      // 没有可消除组合，尝试重排
      if (calibrationAttempts < 3) {
        console.log(`🔧 [CALIBRATION] 校准尝试 ${calibrationAttempts + 1}/3`);
        setCalibrationAttempts(prev => prev + 1);
        await performReshuffleAnimation();
      } else {
        // 已经尝试3次，显示救援弹窗
        console.log('🚨 [CALIBRATION] Maximum calibration attempts reached, showing rescue modal');
        if (onRescueNeeded) {
          console.log('🚨 [CALIBRATION] Calling onRescueNeeded...');
          onRescueNeeded();
        } else {
          console.log('❌ [CALIBRATION] onRescueNeeded is not available');
        }
      }
    } else {
      console.log('✅ [CALIBRATION] Board has valid combinations, no calibration needed');
    }
  };

  // 执行重排列动画
  const performReshuffleAnimation = async () => {
    console.log('🔄 [CALIBRATION] performReshuffleAnimation started');
    setIsCalibrating(true);
    
    console.log('🔄 [CALIBRATION] Starting reshuffle animation...');
    
    // 获取所有非零数字的位置和值
    const nonZeroTiles = [];
    for (let i = 0; i < tiles.length; i++) {
      if (tiles[i] > 0) {
        const row = Math.floor(i / width);
        const col = i % width;
        nonZeroTiles.push({
          index: i,
          row,
          col,
          value: tiles[i],
          currentPos: layoutConfig.getTilePosition(row, col)
        });
      }
    }
    
    console.log('🔄 [CALIBRATION] Found non-zero tiles:', nonZeroTiles.length);
    
    // 生成新的排列（只重排数字，位置保持不变）
    const newTiles = reshuffleBoard(tiles, width, height);
    console.log('🔄 [CALIBRATION] Generated new tiles arrangement');
    
    const newNonZeroTiles = [];
    for (let i = 0; i < newTiles.length; i++) {
      if (newTiles[i] > 0) {
        const row = Math.floor(i / width);
        const col = i % width;
        newNonZeroTiles.push({
          index: i,
          row,
          col,
          value: newTiles[i],
          targetPos: layoutConfig.getTilePosition(row, col)
        });
      }
    }
    
    console.log('🔄 [CALIBRATION] Prepared new tile positions:', newNonZeroTiles.length);
    
    // 创建重排列动画
    await createReshuffleAnimations(nonZeroTiles, newNonZeroTiles, newTiles);
    
    console.log('🔄 [CALIBRATION] performReshuffleAnimation completed');
    setIsCalibrating(false);
  };

  // 创建重排列动画
  const createReshuffleAnimations = (oldTiles, newTiles, newTilesData) => {
    return new Promise((resolve) => {
      console.log(`🎬 [CALIBRATION] Creating reshuffle animation for ${oldTiles.length} tiles`);
      
      const animations = new Map();
      const animationPromises = [];
      
      // 为每个方块创建移动动画
      oldTiles.forEach((oldTile, index) => {
        if (index < newTiles.length) {
          const newTile = newTiles[index];
          
          if (oldTile.currentPos && newTile.targetPos) {
            // 计算移动距离
            const deltaX = newTile.targetPos.x - oldTile.currentPos.x;
            const deltaY = newTile.targetPos.y - oldTile.currentPos.y;
            
            // 只有位置发生变化才创建动画
            if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
              console.log(`🎬 [CALIBRATION] Animating tile from (${oldTile.row},${oldTile.col}) to (${newTile.row},${newTile.col})`);
              
              // 创建动画值
              const translateX = new Animated.Value(0);
              const translateY = new Animated.Value(0);
              
              animations.set(oldTile.index, { 
                translateX, 
                translateY,
                newValue: newTile.value
              });
              
              // 创建移动动画
              const animation = Animated.parallel([
                Animated.timing(translateX, {
                  toValue: deltaX,
                  duration: 1000,
                  useNativeDriver: true,
                }),
                Animated.timing(translateY, {
                  toValue: deltaY,
                  duration: 1000,
                  useNativeDriver: true,
                }),
              ]);
              
              animationPromises.push(animation);
            }
          }
        }
      });
      
      // 设置动画状态
      setCalibrationAnimations(animations);
      
      // 执行所有动画
      if (animationPromises.length > 0) {
        console.log(`🎬 [CALIBRATION] Starting ${animationPromises.length} animations`);
        Animated.parallel(animationPromises).start(() => {
          console.log('✅ [CALIBRATION] Reshuffle animation completed');
          
          // 动画完成后更新棋盘数据
          if (onTilesClear) {
            console.log('🔄 [CALIBRATION] Calling onTilesClear with new tiles data');
            onTilesClear([], newTilesData);
          } else {
            console.log('❌ [CALIBRATION] onTilesClear is not available');
          }
          
          // 清理动画状态
          setTimeout(() => {
            console.log('🧹 [CALIBRATION] Cleaning up animation state');
            setCalibrationAnimations(new Map());
            resolve();
          }, 200);
        });
      } else {
        console.log('📝 [CALIBRATION] No animations needed, updating data directly');
        // 没有动画需要执行，直接更新数据
        if (onTilesClear) {
          console.log('🔄 [CALIBRATION] Calling onTilesClear with new tiles data (no animation)');
          onTilesClear([], newTilesData);
        } else {
          console.log('❌ [CALIBRATION] onTilesClear is not available');
        }
        setCalibrationAnimations(new Map());
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
    
    const { tileSize, tileGap } = layoutConfig;
    const cellWidth = tileSize + tileGap;
    const cellHeight = tileSize + tileGap;

    // 计算中心位置的坐标
    const centerX = centerCol * cellWidth + tileSize / 2;
    const centerY = centerRow * cellHeight + tileSize / 2;
    
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

    const tilePos = layoutConfig.getTilePosition(row, col);
    if (!tilePos) return null;

    const tileScale = initTileScale(index);
    const rotation = getTileRotation(row, col);
    
    // Get swap and fractal animations
    const swapAnim = swapAnimations ? swapAnimations.get(index) : null;
    const fractalAnim = fractalAnimations ? fractalAnimations.get(index) : null;
    const calibrationAnim = calibrationAnimations ? calibrationAnimations.get(index) : null;
    
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
              fontSize: Math.max(12, tilePos.width * 0.5),
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
              position: 'absolute',
              left: layoutConfig.boardLeft,
              top: layoutConfig.boardTop,
              width: layoutConfig.boardWidth,
              height: layoutConfig.boardHeight,
            }
          ]}
          pointerEvents="auto"
        >
          {/* 数字方块内容区 */}
          <View
            {...panResponder.panHandlers}
            style={{
              position: 'absolute',
              left: layoutConfig.woodFrameWidth + layoutConfig.boardPadding,
              top: layoutConfig.woodFrameWidth + layoutConfig.boardPadding,
              width: layoutConfig.contentWidth - layoutConfig.boardPadding * 2,
              height: layoutConfig.contentHeight - layoutConfig.boardPadding * 2,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            pointerEvents={itemMode ? "auto" : "auto"}
          >
            {/* 数字方块容器 - 居中显示 */}
            <View
              style={{
                width: layoutConfig.tilesRectWidth,
                height: layoutConfig.tilesRectHeight,
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