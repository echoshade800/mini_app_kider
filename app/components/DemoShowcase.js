/**
 * DemoShowcase - React Native版本的完整游戏演示动画
 * 功能：展示"框选→计算为10→消除→下落→加分"的全流程
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  Modal,
} from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// 演示动画的API接口类型（注释掉TypeScript类型）
// export interface BoardApi {
//   getGrid(): number[][];
//   getCellRect(r: number, c: number): { x: number; y: number; width: number; height: number };
//   highlight(cells: {r: number, c: number}[], on?: boolean): void;
//   removeCells(cells: {r: number, c: number}[]): Promise<void>;
//   applyGravity(): Promise<void>;
//   lockInput(on: boolean): void;
// }

// export interface IqApi {
//   add(points: number): Promise<void>;
// }

// 寻找和为10的组合（兜底实现）
function findAnySum10Group(grid) {
  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  
  // 优先找两格相邻的组合
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === 0) continue;
      
      // 检查右侧相邻
      if (c + 1 < cols && grid[r][c + 1] !== 0) {
        if (grid[r][c] + grid[r][c + 1] === 10) {
          return [{r, c}, {r, c: c + 1}];
        }
      }
      
      // 检查下方相邻
      if (r + 1 < rows && grid[r + 1][c] !== 0) {
        if (grid[r][c] + grid[r + 1][c] === 10) {
          return [{r, c}, {r: r + 1, c}];
        }
      }
    }
  }
  
  // 如果没找到两格组合，尝试三格组合
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      if (grid[r][c] === 0 || grid[r][c + 1] === 0 || grid[r + 1][c] === 0) continue;
      
      const sum = grid[r][c] + grid[r][c + 1] + grid[r + 1][c];
      if (sum === 10) {
        return [{r, c}, {r, c: c + 1}, {r: r + 1, c}];
      }
    }
  }
  
  return [];
}

// 等待指定时间
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 获取边界矩形
function getBoundingRect(rects) {
  if (rects.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  
  let minX = rects[0].x;
  let minY = rects[0].y;
  let maxX = rects[0].x + rects[0].width;
  let maxY = rects[0].y + rects[0].height;
  
  for (const rect of rects) {
    minX = Math.min(minX, rect.x);
    minY = Math.min(minY, rect.y);
    maxX = Math.max(maxX, rect.x + rect.width);
    maxY = Math.max(maxY, rect.y + rect.height);
  }
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

// 主要的演示动画组件
export default function DemoShowcase({ 
  visible, 
  onComplete, 
  onSkip,
  boardApi,
  iqApi 
}) {
  const [currentPhase, setCurrentPhase] = useState('highlight');
  const [targetCells, setTargetCells] = useState([]);
  const [targetRect, setTargetRect] = useState({ x: 0, y: 0, width: 0, height: 0 });
  
  // 动画值
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const rectangleAnim = useRef(new Animated.Value(0)).current;
  const bubbleAnim = useRef(new Animated.Value(0)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;
  const scoreAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      startDemo();
    }
  }, [visible]);

  const startDemo = async () => {
    try {
      // 如果没有提供API，使用模拟数据
      if (!boardApi || !iqApi) {
        // 模拟演示数据
        const mockCells = [{r: 0, c: 0}, {r: 0, c: 1}];
        const mockRect = { x: 50, y: 100, width: 120, height: 60 };
        
        setTargetCells(mockCells);
        setTargetRect(mockRect);
        
        await playMockAnimationSequence();
        return;
      }
      
      // 1. 锁定输入
      boardApi.lockInput(true);
      
      // 2. 寻找演示组合
      const grid = boardApi.getGrid();
      const cells = findAnySum10Group(grid);
      
      if (cells.length === 0) {
        console.log('No valid combination found for demo');
        boardApi.lockInput(false);
        onComplete();
        return;
      }
      
      setTargetCells(cells);
      
      // 3. 计算目标矩形
      const rects = cells.map(({r, c}) => boardApi.getCellRect(r, c));
      const rect = getBoundingRect(rects);
      setTargetRect(rect);
      
      // 4. 开始动画序列
      await playAnimationSequence();
      
    } catch (error) {
      console.error('Demo animation error:', error);
      if (boardApi) boardApi.lockInput(false);
      onComplete();
    }
  };

  const playMockAnimationSequence = async () => {
    try {
      // 模拟动画序列
      setCurrentPhase('highlight');
      
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      
      await wait(200);
      
      // 画虚线框
      setCurrentPhase('draw');
      Animated.timing(rectangleAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }).start();
      
      await wait(700);
      
      // 弹出 "=10!"
      setCurrentPhase('pop');
      Animated.timing(bubbleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }).start();
      
      await wait(350);
      
      // 消除动画
      setCurrentPhase('clear');
      Animated.timing(confettiAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      
      await wait(300);
      
      // 下落动画
      setCurrentPhase('gravity');
      await wait(500);
      
      // 加分动画
      setCurrentPhase('score');
      Animated.timing(scoreAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      
      await wait(200);
      
      // 完成
      setCurrentPhase('complete');
      
      // 淡出
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
      
      await wait(250);
      
      onComplete();
      
    } catch (error) {
      console.error('Mock animation sequence error:', error);
      onComplete();
    }
  };

  const playAnimationSequence = async () => {
    try {
      if (!boardApi || !iqApi) return;
      
      // 阶段1: 高亮目标格子 (t0-200ms)
      setCurrentPhase('highlight');
      boardApi.highlight(targetCells, true);
      
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      
      await wait(200);
      
      // 阶段2: 画虚线框 (t200-900ms)
      setCurrentPhase('draw');
      Animated.timing(rectangleAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }).start();
      
      await wait(700);
      
      // 阶段3: 弹出 "=10!" (t900-1000ms)
      setCurrentPhase('pop');
      Animated.timing(bubbleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }).start();
      
      await wait(350);
      
      // 阶段4: 消除动画 (t1400-1700ms)
      setCurrentPhase('clear');
      Animated.timing(confettiAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      
      await wait(300);
      
      // 执行消除
      await boardApi.removeCells(targetCells);
      
      // 阶段5: 下落动画 (t1700-2200ms)
      setCurrentPhase('gravity');
      await boardApi.applyGravity();
      await wait(500);
      
      // 阶段6: 加分动画 (t2200ms)
      setCurrentPhase('score');
      Animated.timing(scoreAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      
      await iqApi.add(10);
      await wait(200);
      
      // 阶段7: 完成
      setCurrentPhase('complete');
      
      // 清理
      boardApi.highlight(targetCells, false);
      
      // 淡出
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
      
      await wait(250);
      
      boardApi.lockInput(false);
      onComplete();
      
    } catch (error) {
      console.error('Animation sequence error:', error);
      if (boardApi) boardApi.lockInput(false);
      onComplete();
    }
  };

  const handleSkip = () => {
    if (boardApi) {
      boardApi.lockInput(false);
      boardApi.highlight(targetCells, false);
    }
    onSkip();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleSkip}
    >
      <Animated.View 
        style={[
          styles.demoMask,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* 跳过按钮 */}
        <TouchableOpacity 
          style={styles.skipButton}
          onPress={handleSkip}
          accessibilityLabel="Skip Demo"
        >
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>
        
        {/* 虚线矩形 */}
        <Animated.View 
          style={[
            styles.selectionRectangle,
            {
              left: targetRect.x,
              top: targetRect.y,
              width: targetRect.width,
              height: targetRect.height,
              opacity: rectangleAnim,
              transform: [{ scale: rectangleAnim }],
            },
          ]}
        />
        
        {/* "=10!" 泡泡 */}
        <Animated.View 
          style={[
            styles.bubble,
            {
              left: targetRect.x + targetRect.width / 2 - 26,
              top: targetRect.y - 28,
              opacity: bubbleAnim,
              transform: [{ scale: bubbleAnim }],
            },
          ]}
        >
          <Text style={styles.bubbleText}>= 10!</Text>
        </Animated.View>
        
        {/* 纸屑效果 */}
        <Animated.View 
          style={[
            styles.confetti,
            {
              left: targetRect.x + targetRect.width / 2,
              top: targetRect.y + targetRect.height / 2,
              opacity: confettiAnim,
            },
          ]}
        />
        
        {/* 分数动画 */}
        <Animated.View 
          style={[
            styles.scoreEffect,
            {
              left: targetRect.x + targetRect.width / 2 - 30,
              top: targetRect.y - 60,
              opacity: scoreAnim,
              transform: [{ scale: scoreAnim }],
            },
          ]}
        >
          <Text style={styles.scoreText}>+10 IQ!</Text>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  demoMask: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    zIndex: 1000,
  },
  skipButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  selectionRectangle: {
    position: 'absolute',
    borderWidth: 4,
    borderColor: '#fff',
    borderStyle: 'dashed',
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  bubble: {
    position: 'absolute',
    backgroundColor: '#2e7d32',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  bubbleText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  confetti: {
    position: 'absolute',
    width: 20,
    height: 20,
    backgroundColor: '#FFD700',
    borderRadius: 2,
  },
  scoreEffect: {
    position: 'absolute',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
  },
  scoreText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});