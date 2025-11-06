/**
 * Item Demo Board Component - Mini game board for item demonstration
 * Purpose: Show animated demonstrations of item effects in the guide
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DEMO_BOARD_SIZE = 180; // 演示板尺寸
const GRID_SIZE = 3; // 3x3网格
const CELL_SIZE = DEMO_BOARD_SIZE / GRID_SIZE;
const TILE_SIZE = CELL_SIZE - 8; // 方块大小，留出间距

// SwapMaster 演示动画
const SwapMasterDemo = ({ isPlaying }) => {
  const tile1AnimX = useRef(new Animated.Value(0)).current;
  const tile1AnimY = useRef(new Animated.Value(0)).current;
  const tile2AnimX = useRef(new Animated.Value(0)).current;
  const tile2AnimY = useRef(new Animated.Value(0)).current;
  const highlightAnim = useRef(new Animated.Value(1)).current;
  const [tile1Value, setTile1Value] = useState(3);
  const [tile2Value, setTile2Value] = useState(7);
  const animationRef = useRef(null);

  useEffect(() => {
    if (!isPlaying) {
      // 停止动画并重置
      if (animationRef.current) {
        animationRef.current.stop();
      }
      tile1AnimX.setValue(0);
      tile1AnimY.setValue(0);
      tile2AnimX.setValue(0);
      tile2AnimY.setValue(0);
      highlightAnim.setValue(1);
      return;
    }

    const playAnimation = () => {
      // 重置动画值
      tile1AnimX.setValue(0);
      tile1AnimY.setValue(0);
      tile2AnimX.setValue(0);
      tile2AnimY.setValue(0);
      highlightAnim.setValue(1);

      // 高亮闪烁动画
      const highlightLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(highlightAnim, {
            toValue: 0.5,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(highlightAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
        { iterations: 2 }
      );

      // 交换动画
      const swapAnimation = Animated.parallel([
        Animated.timing(tile1AnimX, {
          toValue: CELL_SIZE * 2, // 移动到 (2, 2)
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(tile1AnimY, {
          toValue: CELL_SIZE * 2,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(tile2AnimX, {
          toValue: -CELL_SIZE * 2, // 移动到 (0, 0)
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(tile2AnimY, {
          toValue: -CELL_SIZE * 2,
          duration: 600,
          useNativeDriver: true,
        }),
      ]);

      // 动画序列
      const sequence = Animated.sequence([
        highlightLoop,
        Animated.delay(200),
        swapAnimation,
        Animated.delay(800),
      ]);

      animationRef.current = sequence;
      sequence.start(() => {
        // 交换值
        setTile1Value(prev => prev === 3 ? 7 : 3);
        setTile2Value(prev => prev === 7 ? 3 : 7);
        // 循环播放
        if (isPlaying) {
          setTimeout(playAnimation, 300);
        }
      });
    };

    playAnimation();
  }, [isPlaying]);

  return (
    <View style={styles.demoBoard}>
      {/* 网格背景 */}
      <View style={styles.grid}>
        {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
          const row = Math.floor(i / GRID_SIZE);
          const col = i % GRID_SIZE;
          return (
            <View
              key={i}
              style={[
                styles.cell,
                {
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  left: col * CELL_SIZE,
                  top: row * CELL_SIZE,
                },
              ]}
            />
          );
        })}
      </View>

      {/* 方块 */}
      <Animated.View
        style={[
          styles.tile,
          {
            left: 0 * CELL_SIZE + 4,
            top: 0 * CELL_SIZE + 4,
            width: TILE_SIZE,
            height: TILE_SIZE,
            transform: [
              { translateX: tile1AnimX },
              { translateY: tile1AnimY },
            ],
            opacity: highlightAnim,
          },
        ]}
      >
        <Text style={styles.tileText}>{tile1Value}</Text>
      </Animated.View>
      <Animated.View
        style={[
          styles.tile,
          {
            left: 2 * CELL_SIZE + 4,
            top: 2 * CELL_SIZE + 4,
            width: TILE_SIZE,
            height: TILE_SIZE,
            transform: [
              { translateX: tile2AnimX },
              { translateY: tile2AnimY },
            ],
            opacity: highlightAnim,
          },
        ]}
      >
        <Text style={styles.tileText}>{tile2Value}</Text>
      </Animated.View>
    </View>
  );
};

// Split 演示动画
const SplitDemo = ({ isPlaying }) => {
  const originalTileScale = useRef(new Animated.Value(1)).current;
  const originalTileOpacity = useRef(new Animated.Value(1)).current;
  const highlightAnim = useRef(new Animated.Value(1)).current;
  const [showOriginal, setShowOriginal] = useState(true);
  const [splitTiles, setSplitTiles] = useState([]);
  const animationRef = useRef(null);

  // 分裂方块的动画引用（只需要两个方块：3和4）
  const splitTile1AnimX = useRef(new Animated.Value(0)).current;
  const splitTile1AnimY = useRef(new Animated.Value(0)).current;
  const splitTile1Scale = useRef(new Animated.Value(0)).current;
  const splitTile2AnimX = useRef(new Animated.Value(0)).current;
  const splitTile2AnimY = useRef(new Animated.Value(0)).current;
  const splitTile2Scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isPlaying) {
      // 停止动画并重置
      if (animationRef.current) {
        animationRef.current.stop();
      }
      originalTileScale.setValue(1);
      originalTileOpacity.setValue(1);
      highlightAnim.setValue(1);
      setShowOriginal(true);
      setSplitTiles([]);
      splitTile1AnimX.setValue(0);
      splitTile1AnimY.setValue(0);
      splitTile1Scale.setValue(0);
      splitTile2AnimX.setValue(0);
      splitTile2AnimY.setValue(0);
      splitTile2Scale.setValue(0);
      return;
    }

    const playAnimation = () => {
      // 重置状态
      setShowOriginal(true);
      setSplitTiles([]);
      originalTileScale.setValue(1);
      originalTileOpacity.setValue(1);
      highlightAnim.setValue(1);
      splitTile1AnimX.setValue(0);
      splitTile1AnimY.setValue(0);
      splitTile1Scale.setValue(0);
      splitTile2AnimX.setValue(0);
      splitTile2AnimY.setValue(0);
      splitTile2Scale.setValue(0);

      // 高亮闪烁
      const highlightLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(highlightAnim, {
            toValue: 0.5,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(highlightAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
        { iterations: 2 }
      );

      // 分裂动画序列
      const sequence = Animated.sequence([
        highlightLoop,
        Animated.delay(200),
        // 原方块缩小消失
        Animated.parallel([
          Animated.timing(originalTileScale, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(originalTileOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ]);

      animationRef.current = sequence;
      sequence.start(() => {
        // 显示分裂方块：7分裂成3和4
        setShowOriginal(false);
        // 分裂后的方块：3在左侧格子(1, 0)，4在右侧格子(1, 2)
        setSplitTiles([
          { id: 1, row: 1, col: 0, value: 3 },
          { id: 2, row: 1, col: 2, value: 4 },
        ]);

        // 新方块从中心(1, 1)扩散到目标位置
        // 方块3：从中心向左移动到(1, 0)，需要向左移动-CELL_SIZE
        // 方块4：从中心向右移动到(1, 2)，需要向右移动CELL_SIZE
        Animated.parallel([
          Animated.timing(splitTile1AnimX, {
            toValue: -CELL_SIZE, // 从中心向左移动一个格子
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(splitTile1Scale, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(splitTile2AnimX, {
            toValue: CELL_SIZE, // 从中心向右移动一个格子
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(splitTile2Scale, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]).start(() => {
          // 延迟后循环播放
          if (isPlaying) {
            setTimeout(playAnimation, 800);
          }
        });
      });
    };

    playAnimation();
  }, [isPlaying]);

  return (
    <View style={styles.demoBoard}>
      {/* 网格背景 */}
      <View style={styles.grid}>
        {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
          const row = Math.floor(i / GRID_SIZE);
          const col = i % GRID_SIZE;
          return (
            <View
              key={i}
              style={[
                styles.cell,
                {
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  left: col * CELL_SIZE,
                  top: row * CELL_SIZE,
                },
              ]}
            />
          );
        })}
      </View>

      {/* 原方块 */}
      {showOriginal && (
        <Animated.View
          style={[
            styles.tile,
            {
              left: 1 * CELL_SIZE + 4,
              top: 1 * CELL_SIZE + 4,
              width: TILE_SIZE,
              height: TILE_SIZE,
              transform: [{ scale: originalTileScale }],
              opacity: Animated.multiply(originalTileOpacity, highlightAnim),
            },
          ]}
        >
          <Text style={styles.tileText}>7</Text>
        </Animated.View>
      )}

      {/* 分裂后的方块：3和4 */}
      {splitTiles.map((tile, index) => {
        let animX, animY, animScale;
        if (index === 0) {
          animX = splitTile1AnimX;
          animY = splitTile1AnimY;
          animScale = splitTile1Scale;
        } else {
          animX = splitTile2AnimX;
          animY = splitTile2AnimY;
          animScale = splitTile2Scale;
        }

        // 分裂方块从中心(1, 1)开始，通过translateX移动到目标位置
        // 方块3：从中心向左移动到(1, 0)
        // 方块4：从中心向右移动到(1, 2)
        return (
          <Animated.View
            key={tile.id}
            style={[
              styles.tile,
              {
                left: 1 * CELL_SIZE + 4, // 从中心位置(1, 1)开始
                top: 1 * CELL_SIZE + 4,  // 从中心位置(1, 1)开始
                width: TILE_SIZE,
                height: TILE_SIZE,
                transform: [
                  { translateX: animX }, // 通过translateX移动到目标列
                  { translateY: animY },
                  { scale: animScale },
                ],
              },
            ]}
          >
            <Text style={styles.tileText}>{tile.value}</Text>
          </Animated.View>
        );
      })}
    </View>
  );
};

// 消除演示动画 - 画框消除
const EliminationDemo = ({ isPlaying }) => {
  const tile1Opacity = useRef(new Animated.Value(1)).current;
  const tile2Opacity = useRef(new Animated.Value(1)).current;
  const highlightAnim = useRef(new Animated.Value(1)).current;
  const [showSelectionRect, setShowSelectionRect] = useState(false);
  const rectOpacity = useRef(new Animated.Value(0)).current;
  const rectScale = useRef(new Animated.Value(0.8)).current;
  const animationRef = useRef(null);

  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        animationRef.current.stop();
      }
      tile1Opacity.setValue(1);
      tile2Opacity.setValue(1);
      highlightAnim.setValue(1);
      rectOpacity.setValue(0);
      rectScale.setValue(0.8);
      setShowSelectionRect(false);
      return;
    }

    const playAnimation = () => {
      // 重置动画值
      tile1Opacity.setValue(1);
      tile2Opacity.setValue(1);
      highlightAnim.setValue(1);
      rectOpacity.setValue(0);
      rectScale.setValue(0.8);
      setShowSelectionRect(false);

      // 高亮闪烁动画
      const highlightLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(highlightAnim, {
            toValue: 0.5,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(highlightAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
        { iterations: 2 }
      );

      // 画框动画（选择框从无到有，包围两个方块）
      const drawRectAnimation = Animated.parallel([
        Animated.timing(rectOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(rectScale, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]);

      // 消除动画（两个方块缩小消失）
      const eliminateAnimation = Animated.parallel([
        Animated.timing(tile1Opacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(tile2Opacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(rectOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]);

      // 动画序列
      const sequence = Animated.sequence([
        highlightLoop,
        Animated.delay(200),
      ]);

      animationRef.current = sequence;
      sequence.start(() => {
        // 显示选择框
        setShowSelectionRect(true);
        drawRectAnimation.start(() => {
          Animated.delay(300).start(() => {
            eliminateAnimation.start(() => {
              // 延迟后循环播放
              if (isPlaying) {
                setTimeout(playAnimation, 800);
              }
            });
          });
        });
      });
    };

    playAnimation();
  }, [isPlaying]);

  return (
    <View style={styles.demoBoard}>
      {/* 网格背景 */}
      <View style={styles.grid}>
        {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
          const row = Math.floor(i / GRID_SIZE);
          const col = i % GRID_SIZE;
          return (
            <View
              key={i}
              style={[
                styles.cell,
                {
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  left: col * CELL_SIZE,
                  top: row * CELL_SIZE,
                },
              ]}
            />
          );
        })}
      </View>

      {/* 方块 */}
      <Animated.View
        style={[
          styles.tile,
          {
            left: 0 * CELL_SIZE + 4,
            top: 0 * CELL_SIZE + 4,
            width: TILE_SIZE,
            height: TILE_SIZE,
            opacity: Animated.multiply(tile1Opacity, highlightAnim),
          },
        ]}
      >
        <Text style={styles.tileText}>3</Text>
      </Animated.View>
      <Animated.View
        style={[
          styles.tile,
          {
            left: 2 * CELL_SIZE + 4,
            top: 0 * CELL_SIZE + 4,
            width: TILE_SIZE,
            height: TILE_SIZE,
            opacity: Animated.multiply(tile2Opacity, highlightAnim),
          },
        ]}
      >
        <Text style={styles.tileText}>7</Text>
      </Animated.View>

      {/* 选择框 - 包围两个方块 */}
      {showSelectionRect && (
        <Animated.View
          style={[
            styles.selectionRect,
            {
              left: 0 * CELL_SIZE + 4,
              top: 0 * CELL_SIZE + 4,
              width: 2 * CELL_SIZE + TILE_SIZE,
              height: TILE_SIZE,
              opacity: rectOpacity,
              transform: [{ scale: rectScale }],
            },
          ]}
        />
      )}
    </View>
  );
};

const ItemDemoBoard = ({ itemType, isPlaying }) => {
  if (itemType === 'swapMaster') {
    return <SwapMasterDemo isPlaying={isPlaying} />;
  } else if (itemType === 'split') {
    return <SplitDemo isPlaying={isPlaying} />;
  } else if (itemType === 'elimination') {
    return <EliminationDemo isPlaying={isPlaying} />;
  }
  return null;
};

const styles = StyleSheet.create({
  demoBoard: {
    width: DEMO_BOARD_SIZE,
    height: DEMO_BOARD_SIZE,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#DDD',
    marginVertical: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  grid: {
    position: 'absolute',
    width: DEMO_BOARD_SIZE,
    height: DEMO_BOARD_SIZE,
  },
  cell: {
    position: 'absolute',
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E0E0E0',
  },
  tile: {
    position: 'absolute',
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  tileText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  selectionRect: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: '#4CAF50',
    borderRadius: 4,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
});

export default ItemDemoBoard;

