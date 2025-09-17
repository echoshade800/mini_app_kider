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
  Animated
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useGameStore } from '../store/gameStore';
import { hasValidCombinations, reshuffleBoard, isBoardEmpty } from '../utils/gameLogic';
import { getLevelLayout, adjustLayoutForSmallScreen } from '../utils/levelGrid';
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
    if (!board || disabled) return;
    
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
  
  // 使用新的布局系统计算尺寸
  const topHUDHeight = isChallenge ? 80 : 120; // 挑战模式和闯关模式的HUD高度不同
  let layout = getLevelLayout(board.level || 1, screenWidth, screenHeight, topHUDHeight);
  
  // 处理极小屏幕情况
  layout = adjustLayoutForSmallScreen(layout, board.level || 1);
  
  const { tileSize, gap, boardPadding, boardWidth, boardHeight } = layout;
  
  // 方块尺寸
  const tileWidth = tileSize;
  const tileHeight = tileSize;

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
    if (isInRestrictedArea(pageY)) return false;
    
    const boardCenterX = screenWidth / 2;
    const boardCenterY = screenHeight / 2;
    const boardLeft = boardCenterX - boardWidth / 2;
    const boardTop = boardCenterY - boardHeight / 2;
    
    if (pageX < boardLeft + boardPadding || pageX > boardLeft + boardWidth - boardPadding ||
        pageY < boardTop + boardPadding || pageY > boardTop + boardHeight - boardPadding) {
      return false;
    }
    
    const relativeX = pageX - boardLeft - boardPadding;
    const relativeY = pageY - boardTop - boardPadding;
    
    // 计算在哪个方块上
    const totalTileWidth = tileSize + gap;
    const totalTileHeight = tileSize + gap;
    
    if (relativeX < 0 || relativeX >= width * totalTileWidth - gap ||
        relativeY < 0 || relativeY >= height * totalTileHeight - gap) {
      return false;
    }
    
    const col = Math.floor(relativeX / totalTileWidth);
    const row = Math.floor(relativeY / totalTileHeight);
    
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
      
      const boardCenterX = screenWidth / 2;
      const boardCenterY = screenHeight / 2;
      const boardLeft = boardCenterX - boardWidth / 2;
      const boardTop = boardCenterY - boardHeight / 2;
      
      const relativeX = pageX - boardLeft - boardPadding;
      const relativeY = pageY - boardTop - boardPadding;
      
      const totalTileWidth = tileSize + gap;
      const totalTileHeight = tileSize + gap;
      
      const startCol = Math.floor(relativeX / totalTileWidth);
      const startRow = Math.floor(relativeY / totalTileHeight);
      
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
      
      const boardCenterX = screenWidth / 2;
      const boardCenterY = screenHeight / 2;
      const boardLeft = boardCenterX - boardWidth / 2;
      const boardTop = boardCenterY - boardHeight / 2;
      
      if (pageX < boardLeft + boardPadding || pageX > boardLeft + boardWidth - boardPadding ||
          pageY < boardTop + boardPadding || pageY > boardTop + boardHeight - boardPadding) {
        return;
      }
      
      const relativeX = pageX - boardLeft - boardPadding;
      const relativeY = pageY - boardTop - boardPadding;
      
      const totalTileWidth = tileSize + gap;
      const totalTileHeight = tileSize + gap;
      
      if (relativeX < 0 || relativeX >= width * totalTileWidth - gap ||
          relativeY < 0 || relativeY >= height * totalTileHeight - gap) {
        return;
      }
      
      const endCol = Math.floor(relativeX / totalTileWidth);
      const endRow = Math.floor(relativeY / totalTileHeight);
      
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
      const explosionX = centerCol * cellSize + cellSize / 2 + boardPadding;
      const explosionY = centerRow * cellSize + cellSize / 2 + boardPadding;
      
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
    
    const left = minCol * cellSize + boardPadding;
    const top = minRow * cellSize + boardPadding;
    const selectionWidth = (maxCol - minCol + 1) * (tileSize + gap) - gap;
    const selectionHeight = (maxRow - minRow + 1) * (tileSize + gap) - gap;
    
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
    
    const left = maxCol * (tileSize + gap) + tileSize + boardPadding;
    const top = maxRow * (tileSize + gap) + tileSize + boardPadding;
    
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
    const lines = [];
    
    // Vertical lines
    for (let i = 1; i < width; i++) {
      lines.push(
        <View
          key={`v-${i}`}
          style={[
            styles.gridLine,
            {
              left: i * (tileSize + gap) - gap/2 + boardPadding,
              top: boardPadding,
              width: 1,
              height: height * (tileSize + gap) - gap,
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
              left: boardPadding,
              top: i * (tileSize + gap) - gap/2 + boardPadding,
              width: width * (tileSize + gap) - gap,
              height: 1,
            }
          ]}
        />
      );
    }
    
    return lines;
  };

  const renderTile = (value, row, col) => {
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
          
          const left = col * (tileSize + gap) + boardPadding;
          const top = row * (tileSize + gap) + boardPadding;
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
                styles.stickyNote,
                { 
                  position: 'absolute',
                  left,
                  top,
                  width: tileWidth, 
                  height: tileHeight,
                  transform: transforms,
                  opacity: tempAnim.opacity,
                  backgroundColor: '#FFF9E6',
                  borderColor: '#333',
                }
              ]}
            >
              <Text style={[
                styles.stickyNoteText,
                { 
                  fontSize: Math.min(tileWidth, tileHeight) * 0.4,
                  color: '#111'
                }
              ]}>
                {displayValue}
              </Text>
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

    const left = col * (tileSize + gap) + boardPadding;
    const top = row * (tileSize + gap) + boardPadding;

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
    
    let selectedBgColor = '#FFF9E6'; // Cream white sticky note
    let selectedBorderColor = '#333';
    let selectedTextColor = '#111';
    
    if (isSelected && itemMode) {
      if (itemMode === 'swapMaster') {
        selectedBgColor = '#E3F2FD';
        selectedBorderColor = '#2196F3';
        selectedTextColor = '#0D47A1';
      } else if (itemMode === 'fractalSplit') {
        selectedBgColor = '#F3E5F5';
        selectedBorderColor = '#9C27B0';
        selectedTextColor = '#4A148C';
      }
    }

    let opacity = 1;
    if (fractalAnim && fractalAnim.opacity) {
      opacity = fractalAnim.opacity;
    }

    const tileStyle = [
      styles.stickyNote,
      { 
        position: 'absolute',
        left,
        top,
        width: tileWidth, 
        height: tileHeight,
        transform: transforms,
        opacity: opacity,
        backgroundColor: selectedBgColor,
        borderColor: selectedBorderColor,
      }
    ];

    const handleTileTouch = itemMode ? () => handleTilePress(row, col, value) : undefined;
    
    return (
      <Animated.View 
        key={`${row}-${col}`}
        style={tileStyle}
        onTouchStart={handleTileTouch}
      >
        <Text style={[
          styles.stickyNoteText,
          { 
            fontSize: Math.min(tileWidth, tileHeight) * 0.4,
            color: selectedTextColor
          }
        ]}>
          {value}
        </Text>
      </Animated.View>
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
              width: boardWidth,
              height: boardHeight,
            }
          ]}
        >
          {/* Grid lines */}
          {renderGridLines()}
          
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
  stickyNote: {
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
  stickyNoteText: {
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
});