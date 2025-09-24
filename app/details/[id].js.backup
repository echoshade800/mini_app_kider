/**
 * Level Detail Screen - Individual level gameplay
 * Purpose: Play specific levels with completion tracking and item usage
 * Features: Level completion detection, next level navigation, item management
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  Alert,
  Modal,
  Image,
  Animated,
  PanResponder
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { generateBoard } from '../utils/boardGenerator';
import { STAGE_NAMES } from '../utils/stageNames';
import GameBoard from '../components/GameBoard';
import RescueModal from '../components/RescueModal';
import TopHUD from '../components/TopHUD';

// 提取关卡名称（去掉Grade前缀部分）
function extractLevelName(stageName) {
  if (!stageName) return '';
  
  // 如果包含破折号，取破折号后的部分
  const dashIndex = stageName.indexOf('–');
  if (dashIndex !== -1) {
    return stageName.substring(dashIndex + 1).trim();
  }
  
  // 如果包含普通破折号
  const hyphenIndex = stageName.indexOf('-');
  if (hyphenIndex !== -1) {
    return stageName.substring(hyphenIndex + 1).trim();
  }
  
  // 否则返回原名称
  return stageName;
}

// 生成随机渐变色
function generateRandomGradient() {
  const colors = [
    ['#FF6B6B', '#FF8E8E'], // 红到浅红
    ['#FFA502', '#FFB84D'], // 橙到浅橙
    ['#FECA57', '#FFE066'], // 黄到浅黄
    ['#FF6348', '#FF7A5C'], // 红橙到浅红橙
    ['#FF4757', '#FF6B9D'], // 红到粉
    ['#FF9F43', '#FFB366'], // 橙到浅橙
    ['#FF6B6B', '#FF9F9F'], // 红到浅红
    ['#FFA502', '#FFC947'], // 橙到金黄
    ['#FECA57', '#FFD93D'], // 黄到亮黄
    ['#FF6348', '#FF8A65'], // 红橙到浅红橙
  ];
  
  return colors[Math.floor(Math.random() * colors.length)];
}

export default function LevelDetailScreen() {
  const { id } = useLocalSearchParams();
  const level = parseInt(id);
  
  const { gameData, updateGameData, settings } = useGameStore();
  
  // Game state
  const [board, setBoard] = useState(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showRescueModal, setShowRescueModal] = useState(false);
  const [itemMode, setItemMode] = useState(null);
  const [selectedSwapTile, setSelectedSwapTile] = useState(null);
  const [swapAnimations, setSwapAnimations] = useState(new Map());
  const [fractalAnimations, setFractalAnimations] = useState(new Map());
  const [boardKey, setBoardKey] = useState(0); // 用于强制重新生成棋盘
  
  // GameBoard ref
  const gameBoardRef = useRef(null);
  
  // 进度条状态
  const [totalTiles, setTotalTiles] = useState(0);
  const [clearedTiles, setClearedTiles] = useState(0);
  const [progress, setProgress] = useState(0);
  
<<<<<<< HEAD
  // 人物动画
  const characterPosition = useRef(new Animated.Value(0)).current;
=======
  // 人物动画状态
  const [characterPosition] = useState(new Animated.Value(0));
  const [characterScale] = useState(new Animated.Value(1));
  const [progressBarWidth, setProgressBarWidth] = useState(200); // 默认进度条宽度
  
  // 进度条渐变色状态
  const [progressGradient, setProgressGradient] = useState(['#FF6B6B', '#4ECDC4']);
<<<<<<< HEAD
>>>>>>> 5d89f88 (feat: 挑战模式进度条燃烧特效)
=======
  
  // 多页游戏状态
  const [totalPages, setTotalPages] = useState(1);
  const [completedPages, setCompletedPages] = useState(0);
  
  // 关卡名称动画状态
  const [showLevelNameAnimation, setShowLevelNameAnimation] = useState(true);
  const levelNameAnimation = useRef(new Animated.Value(-300)).current; // 从左边开始
  
  // 文字框拖拽位置状态
  const [currentLevelPosition, setCurrentLevelPosition] = useState({ x: 0, y: 0 });
  const [nextLevelPosition, setNextLevelPosition] = useState({ x: 0, y: 0 });
  
  // 编辑模式状态
  const [editingMode, setEditingMode] = useState(true);
  
  // 按钮悬停状态
  const [returnButtonPressed, setReturnButtonPressed] = useState(false);
  const [nextButtonPressed, setNextButtonPressed] = useState(false);
  
  // 文字框动画状态
  const [textAnimationPhase, setTextAnimationPhase] = useState('initial'); // initial, currentBounce, currentExit, nextEnter, final
  const [textWidth, setTextWidth] = useState(0); // 文字宽度状态
  const currentTextScale = useRef(new Animated.Value(0)).current;
  const currentTextOpacity = useRef(new Animated.Value(0)).current;
  const currentTextRotation = useRef(new Animated.Value(0)).current;
  const nextTextScale = useRef(new Animated.Value(0)).current;
  const nextTextOpacity = useRef(new Animated.Value(0)).current;
  const nextTextTranslateY = useRef(new Animated.Value(50)).current;
  const sparkleParticles = useRef([]).current;
  
  // 箭头动画状态
  const arrowAnimation = useRef(new Animated.Value(0)).current;
  const arrowOpacity = useRef(new Animated.Value(1)).current;
  
  // 庆祝粒子状态 - 两个动画层
  const [celebrationParticles1, setCelebrationParticles1] = useState([]);
  const [celebrationParticles2, setCelebrationParticles2] = useState([]);
  
  // 生成庆祝粒子
  const generateCelebrationParticles = () => {
    // 第一层粒子 - 40个，较慢速度
    const particles1 = [];
    for (let i = 0; i < 40; i++) {
      const particleAnimation = new Animated.Value(0);
      particles1.push({
        id: `layer1-${i}`,
        x: Math.random() * 100, // 百分比位置
        y: -10, // 从顶部开始
        color: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FF9F43', '#6C5CE7'][Math.floor(Math.random() * 7)],
        size: Math.random() * 6 + 3, // 3-9px，稍小一些
        rotation: Math.random() * 360,
        duration: Math.random() * 3000 + 4000, // 4-7秒，较慢
        animation: particleAnimation,
        delay: Math.random() * 2000, // 随机延迟开始
      });
      
      // 启动循环下落动画
      const createLoopAnimation = () => {
        setTimeout(() => {
          Animated.timing(particleAnimation, {
            toValue: 1,
            duration: particleAnimation.duration || 5000,
            useNativeDriver: true,
          }).start(() => {
            // 动画完成后重置位置并重新开始
            particleAnimation.setValue(0);
            createLoopAnimation();
          });
        }, particleAnimation.delay);
      };
      
      createLoopAnimation();
    }
    
    // 第二层粒子 - 30个，较快速度
    const particles2 = [];
    for (let i = 0; i < 30; i++) {
      const particleAnimation = new Animated.Value(0);
      particles2.push({
        id: `layer2-${i}`,
        x: Math.random() * 100, // 百分比位置
        y: -10, // 从顶部开始
        color: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FF9F43', '#6C5CE7'][Math.floor(Math.random() * 7)],
        size: Math.random() * 10 + 5, // 5-15px，稍大一些
        rotation: Math.random() * 360,
        duration: Math.random() * 1500 + 2000, // 2-3.5秒，较快
        animation: particleAnimation,
        delay: Math.random() * 1500, // 随机延迟开始
      });
      
      // 启动循环下落动画
      const createLoopAnimation = () => {
        setTimeout(() => {
          Animated.timing(particleAnimation, {
            toValue: 1,
            duration: particleAnimation.duration || 3000,
            useNativeDriver: true,
          }).start(() => {
            // 动画完成后重置位置并重新开始
            particleAnimation.setValue(0);
            createLoopAnimation();
          });
        }, particleAnimation.delay);
      };
      
      createLoopAnimation();
    }
    
    setCelebrationParticles1(particles1);
    setCelebrationParticles2(particles2);
  };
  
  // 生成闪光粒子效果
  const generateSparkleParticles = () => {
    const particles = [];
    for (let i = 0; i < 8; i++) {
      const particleAnimation = new Animated.Value(0);
      particles.push({
        id: `sparkle-${i}`,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 4 + 2,
        color: ['#FFD700', '#FFA500', '#FF6B6B'][Math.floor(Math.random() * 3)],
        animation: particleAnimation,
        duration: Math.random() * 1000 + 500,
      });
      
      Animated.timing(particleAnimation, {
        toValue: 1,
        duration: particleAnimation.duration || 800,
        useNativeDriver: true,
      }).start();
    }
    sparkleParticles.current = particles;
  };

  // 文字框动画序列
  const startTextAnimation = () => {
    setTextAnimationPhase('initial');
    
    // 1. 当前关卡名称弹跳登场
    setTimeout(() => {
      setTextAnimationPhase('currentBounce');
      Animated.sequence([
        Animated.spring(currentTextScale, {
          toValue: 1.2,
          tension: 100,
          friction: 3,
          useNativeDriver: true,
        }),
        Animated.spring(currentTextScale, {
          toValue: 1,
          tension: 100,
          friction: 3,
          useNativeDriver: true,
        }),
      ]).start();
      
      Animated.timing(currentTextOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, 500);
    
    // 2. 停留1.5秒后，当前关卡名称跳动消失
    setTimeout(() => {
      setTextAnimationPhase('currentExit');
      Animated.sequence([
        Animated.timing(currentTextScale, {
          toValue: 1.1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(currentTextRotation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(currentTextOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }, 2000);
    
    // 3. 下一关卡名称萌趣进入
    setTimeout(() => {
      setTextAnimationPhase('nextEnter');
      generateSparkleParticles();
      
      Animated.parallel([
        Animated.spring(nextTextScale, {
          toValue: 1,
          tension: 80,
          friction: 4,
          useNativeDriver: true,
        }),
        Animated.timing(nextTextOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(nextTextTranslateY, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }, 2800);
    
    // 4. 最终停留
    setTimeout(() => {
      setTextAnimationPhase('final');
    }, 3500);
  };

  // 箭头动画效果和庆祝粒子
  useEffect(() => {
    if (showCompletionModal) {
      // 生成庆祝粒子
      generateCelebrationParticles();
      
      // 启动文字框动画
      startTextAnimation();
      
      // 摆动动画
      const swingAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(arrowAnimation, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(arrowAnimation, {
            toValue: -1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      
      // 闪烁动画
      const blinkAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(arrowOpacity, {
            toValue: 0.3,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(arrowOpacity, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      
      swingAnimation.start();
      blinkAnimation.start();
      
      return () => {
        swingAnimation.stop();
        blinkAnimation.stop();
        // 清理粒子动画
        setCelebrationParticles1([]);
        setCelebrationParticles2([]);
        // 重置文字框动画状态
        setTextAnimationPhase('initial');
        currentTextScale.setValue(0);
        currentTextOpacity.setValue(0);
        currentTextRotation.setValue(0);
        nextTextScale.setValue(0);
        nextTextOpacity.setValue(0);
        nextTextTranslateY.setValue(50);
      };
    }
  }, [showCompletionModal, arrowAnimation, arrowOpacity]);
  
  // 当前关卡文字框拖拽响应器
  const currentLevelPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      console.log('当前关卡文字框获得拖拽权限');
    },
    onPanResponderMove: (evt, gestureState) => {
      const newPosition = {
        x: gestureState.dx,
        y: gestureState.dy
      };
      console.log('当前关卡文字框移动中:', newPosition);
      setCurrentLevelPosition(newPosition);
    },
    onPanResponderRelease: (evt, gestureState) => {
      console.log('当前关卡文字框拖拽结束，位置:', { x: gestureState.dx, y: gestureState.dy });
    }
  });
  
  // 下一关文字框拖拽响应器
  const nextLevelPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      console.log('下一关文字框获得拖拽权限');
    },
    onPanResponderMove: (evt, gestureState) => {
      const newPosition = {
        x: gestureState.dx,
        y: gestureState.dy
      };
      console.log('下一关文字框移动中:', newPosition);
      setNextLevelPosition(newPosition);
    },
    onPanResponderRelease: (evt, gestureState) => {
      console.log('下一关文字框拖拽结束，位置:', { x: gestureState.dx, y: gestureState.dy });
    }
  });
  
  
  // 计算总页数
  const calculateTotalPages = useCallback((level) => {
    if (level < 80) return 1;
    else if (level < 130) return 2;
    else if (level < 200) return 3;
    else return 4;
  }, []);
>>>>>>> 2824516 (feature)

  // 生成新棋盘的函数
  const generateNewBoard = useCallback(() => {
    if (level && !isNaN(level)) {
      const newBoard = generateBoard(level);
      setBoard(newBoard);
      setBoardKey(prev => prev + 1); // 更新key强制重新渲染
      
      // 生成新的随机渐变色
      const newGradient = generateRandomGradient();
      setProgressGradient(newGradient);
      
      // 初始化进度条状态
      const initialTileCount = newBoard.tiles.filter(tile => tile > 0).length;
      setTotalTiles(initialTileCount);
      setClearedTiles(0);
      setProgress(0);
      
      // 重置人物状态
      characterPosition.setValue(0);
      characterScale.setValue(1);
      
      // 重置游戏状态
      setItemMode(null);
      setSelectedSwapTile(null);
      setSwapAnimations(new Map());
      setFractalAnimations(new Map());
      
      // 重置人物位置
      characterPosition.setValue(0);
    }
  }, [level]);

  // 初始化棋盘和多页游戏状态
  useEffect(() => {
    if (level && !isNaN(level)) {
      const tp = calculateTotalPages(level);
      setTotalPages(tp);
      setCompletedPages(0);
      generateNewBoard();
    }
  }, [level, calculateTotalPages, generateNewBoard]);

  // 页面获得焦点时刷新棋盘
  useFocusEffect(
    useCallback(() => {
      generateNewBoard();
    }, [generateNewBoard])
  );

  // 关卡名称动画效果
  useEffect(() => {
    if (showLevelNameAnimation) {
      // 动画序列：滑入 -> 停留3秒 -> 滑出
      Animated.sequence([
        // 滑入到屏幕中间
        Animated.timing(levelNameAnimation, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
        // 停留1.5秒
        Animated.delay(1500),
        // 滑出到右边
        Animated.timing(levelNameAnimation, {
          toValue: 300,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // 动画完成后隐藏
        setShowLevelNameAnimation(false);
      });
    }
  }, [showLevelNameAnimation, levelNameAnimation]);


  const handleTilesClear = (clearedPositions, newTilesData = null) => {
    if (!board) return;

    if (clearedPositions.length === 0) {
      // 空数组 - 暂时不处理
      return;
    } else {
      // 更新已清除方块数量
      const newClearedCount = clearedTiles + clearedPositions.length;
      setClearedTiles(newClearedCount);
      
      // 计算并更新进度
      const newProgress = Math.min(newClearedCount / totalTiles, 1);
      setProgress(newProgress);
      
<<<<<<< HEAD
      // 动画移动人物到新位置
      Animated.timing(characterPosition, {
        toValue: newProgress,
        duration: 500,
        useNativeDriver: false,
      }).start();
      
      console.log(`📊 进度更新: 清除${clearedPositions.length}个方块, 总计${newClearedCount}/${totalTiles}, 进度=${(newProgress * 100).toFixed(1)}%`);
=======
      // 更新人物位置和动画
      Animated.parallel([
        Animated.timing(characterPosition, {
          toValue: newProgress,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(characterScale, {
            toValue: 1.2,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(characterScale, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
      
>>>>>>> 5d89f88 (feat: 挑战模式进度条燃烧特效)
      
      // 更新棋盘：将被清除的方块设为0（空位）
      const newTiles = [...board.tiles];
      clearedPositions.forEach(pos => {
        const index = pos.row * board.width + pos.col;
        newTiles[index] = 0;
      });

      // 检查棋盘是否完全清空（所有非零方块都被消除）
      const remainingTiles = newTiles.filter(tile => tile > 0).length;
      
      if (remainingTiles === 0) {
        // 确保进度条达到100%
        setProgress(1);
        
        // 检查是否是多页游戏
        if (totalPages > 1) {
          // 多页游戏：完成当前页面
          const newCompletedPages = completedPages + 1;
          setCompletedPages(newCompletedPages);
          
          if (newCompletedPages < totalPages) {
            // 还有页面需要完成，生成新棋盘
            setTimeout(() => {
              generateNewBoard();
              // 重置当前页面进度
              setClearedTiles(0);
              setProgress(0);
              characterPosition.setValue(0);
            }, 500);
            return;
          } else {
            // 所有页面都完成了，显示完成弹窗
            setShowCompletionModal(true);
            
            // 播放结束音效
            if (gameBoardRef.current) {
              gameBoardRef.current.playEndSound();
            }
            
            // 更新进度
            const currentMaxLevel = gameData?.maxLevel || 0;
            const newMaxLevel = Math.max(currentMaxLevel, level);
            const newSwapMasterItems = (gameData?.swapMasterItems || 0) + 1;
            const newSplitItems = (gameData?.splitItems || 0) + 1;
            
            updateGameData({
              maxLevel: newMaxLevel,
              lastPlayedLevel: level,
              swapMasterItems: newSwapMasterItems,
              splitItems: newSplitItems,
            });
            return;
          }
        } else {
          // 单页游戏：直接显示完成弹窗
          setShowCompletionModal(true);
          
          // 播放结束音效
          if (gameBoardRef.current) {
            gameBoardRef.current.playEndSound();
          }
          
          // 更新进度
          const currentMaxLevel = gameData?.maxLevel || 0;
          const newMaxLevel = Math.max(currentMaxLevel, level);
          const newSwapMasterItems = (gameData?.swapMasterItems || 0) + 1;
          const newSplitItems = (gameData?.splitItems || 0) + 1;
          
          updateGameData({
            maxLevel: newMaxLevel,
            lastPlayedLevel: level,
            swapMasterItems: newSwapMasterItems,
            splitItems: newSplitItems,
          });
          return;
        }
      }

      // 更新当前棋盘状态（被清除的位置变为空位）
      setBoard(prev => ({
        ...prev,
        tiles: newTiles
      }));

    }
  };

  const handleNextLevel = () => {
    setShowCompletionModal(false);
    const nextLevel = level + 1;
    router.replace(`/details/${nextLevel}`);
  };

  const handleBackToLevels = () => {
    setShowCompletionModal(false);
    router.replace('/(tabs)/levels');
  };

  const handleBackPress = () => {
    router.replace('/(tabs)/');
  };

  const handleLevelComplete = () => {
    // 触发关卡完成逻辑
    setShowCompletionModal(true);
    
    // 播放结束音效
    if (gameBoardRef.current) {
      gameBoardRef.current.playEndSound();
    }
    
    // 更新进度
    const currentMaxLevel = gameData?.maxLevel || 0;
    const newMaxLevel = Math.max(currentMaxLevel, level);
    const newSwapMasterItems = (gameData?.swapMasterItems || 0) + 1;
    const newSplitItems = (gameData?.splitItems || 0) + 1;
    
    updateGameData({
      maxLevel: newMaxLevel,
      lastPlayedLevel: level,
      swapMasterItems: newSwapMasterItems,
      splitItems: newSplitItems,
    });
  };

  // 拆分算法：将数字拆分为3-4个小数字
  const splitValueIntoParts = (v) => {
    // k = 3 or 4, but must be <= v
    const k = Math.min(v, (v >= 7 ? (Math.random() < 0.5 ? 3 : 4) : 3));

    // 生成 k 个正整数，和为 v，且每个不超过 9
    let parts = Array(k).fill(1);
    let remain = v - k;

    // 均匀/随机分配剩余
    while (remain > 0) {
      const i = Math.floor(Math.random() * k);
      if (parts[i] < 9) { // 每项上限 9
        parts[i] += 1;
        remain -= 1;
      }
    }

    // 打散顺序，避免模式感
    return parts.sort(() => Math.random() - 0.5);
  };

  // 位置选择算法：优先远离原位置
  const pickTargetCells = ({ origin, emptyCells, k, rows, cols }) => {
    const dist = (a, b) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
    const tiers = [2, 1, 0]; // 首选距离≥2，其次≥1，最后≥0

    const chosen = [];
    const used = new Set(); // "r,c" 字符串

    // 分层收集候选
    for (const minD of tiers) {
      const candidates = emptyCells.filter(cell => 
        !used.has(`${cell.r},${cell.c}`) && dist(cell, origin) >= minD
      );

      // 洗牌，避免总是同一方向
      for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
      }

      while (candidates.length && chosen.length < k) {
        const cell = candidates.pop();
        chosen.push(cell);
        used.add(`${cell.r},${cell.c}`);
      }
      if (chosen.length === k) break;
    }

    return chosen; // 可能不足 k 个，由调用方兜底
  };

  // 获取空位集合
  const getEmptyCells = () => {
    const emptyCells = [];
    for (let r = 0; r < board.height; r++) {
      for (let c = 0; c < board.width; c++) {
        const index = r * board.width + c;
        if (board.tiles[index] === 0) {
          emptyCells.push({ r, c });
        }
      }
    }
    return emptyCells;
  };

  // 执行交换动画
  const performSwapAnimation = (tile1, tile2) => {
    // 计算两个方块之间的相对位置偏移
    const deltaX = (tile2.col - tile1.col) * board.layoutConfig.tileSize;
    const deltaY = (tile2.row - tile1.row) * board.layoutConfig.tileSize;

    // 创建动画值
    const tile1AnimX = new Animated.Value(0);
    const tile1AnimY = new Animated.Value(0);
    const tile2AnimX = new Animated.Value(0);
    const tile2AnimY = new Animated.Value(0);

    // 设置动画状态
    const newSwapAnimations = new Map();
    newSwapAnimations.set(tile1.index, {
      translateX: tile1AnimX,
      translateY: tile1AnimY
    });
    newSwapAnimations.set(tile2.index, {
      translateX: tile2AnimX,
      translateY: tile2AnimY
    });
    setSwapAnimations(newSwapAnimations);

    // 执行动画：两个方块互相滑动到对方位置
    Animated.parallel([
      Animated.timing(tile1AnimX, {
        toValue: deltaX,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(tile1AnimY, {
        toValue: deltaY,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(tile2AnimX, {
        toValue: -deltaX,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(tile2AnimY, {
        toValue: -deltaY,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // 使用setTimeout确保动画状态完全清除后再更新棋盘
      setTimeout(() => {
        // 先清除动画状态
        setSwapAnimations(new Map());
        
        // 强制重新渲染以确保动画状态清除
        setBoardKey(prev => prev + 1);
        
        // 然后更新棋盘状态
        const newTiles = [...board.tiles];
        newTiles[tile1.index] = tile2.value;
        newTiles[tile2.index] = tile1.value;
        
        setBoard(prev => ({ ...prev, tiles: newTiles }));
        setSelectedSwapTile(null);
        setItemMode(null);
        
        // Consume item
        const newSwapMasterItems = Math.max(0, (gameData?.swapMasterItems || 0) - 1);
        updateGameData({ swapMasterItems: newSwapMasterItems });

        // 触觉反馈
        if (settings?.hapticsEnabled) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      }, 50); // 给一个小的延迟确保动画状态清除
    });
  };

  const handleTileClick = (row, col, value) => {
    if (!itemMode || !board || value === 0) return;

    const index = row * board.width + col;
    
    if (itemMode === 'swapMaster') {
      if (!selectedSwapTile) {
        // Select first tile
        setSelectedSwapTile({ row, col, value, index });
      } else if (selectedSwapTile.index === index) {
        // Deselect same tile
        setSelectedSwapTile(null);
      } else {
        // 执行交换动画
        performSwapAnimation(selectedSwapTile, { row, col, value, index });
      }
    } else if (itemMode === 'fractalSplit') {
      // 新的分裂逻辑：拆分为3-4个小数字
      if (value <= 1) {
        Alert.alert('Cannot Split', 'Cannot split a tile with value 1.');
        return;
      }

      const parts = splitValueIntoParts(value);
      const k = parts.length;

      const emptyCells = getEmptyCells();
      const targets = pickTargetCells({ 
        origin: { r: row, c: col }, 
        emptyCells, 
        k, 
        rows: board.height, 
        cols: board.width 
      });

      // 兜底策略：允许用原格补1个
      if (targets.length < k) {
        if (!targets.some(c => c.r === row && c.c === col)) {
          targets.push({ r: row, c: col });
        }
      }

      if (targets.length < k) {
        Alert.alert('Not Enough Space', 'Not enough space to split this tile.');
        return;
      }

      // 执行分裂
      const newTiles = [...board.tiles];
      
      // 清空原位置（如果原位置不在目标中）
      const originUsed = targets.some(c => c.r === row && c.c === col);
      if (!originUsed) {
        newTiles[index] = 0;
      }

      // 在目标位置放置新数字
      for (let i = 0; i < targets.length; i++) {
        const target = targets[i];
        const targetIndex = target.r * board.width + target.c;
        newTiles[targetIndex] = parts[i];
      }

      // 更新总方块数（增加的分裂方块数）
      const newTotalTiles = totalTiles + (targets.length - 1);
      setTotalTiles(newTotalTiles);
      
      // 重新计算进度（保持已清除数量不变）
      const newProgress = Math.min(clearedTiles / newTotalTiles, 1);
      setProgress(newProgress);

      setBoard(prev => ({ ...prev, tiles: newTiles }));
      setItemMode(null);
      
      // Consume item
      const newSplitItems = Math.max(0, (gameData?.splitItems || 0) - 1);
      updateGameData({ splitItems: newSplitItems });

      // 触觉反馈
      if (settings?.hapticsEnabled) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }
  };

  const handleUseSwapMaster = () => {
    if ((gameData?.swapMasterItems || 0) <= 0) {
      Alert.alert('No Items', 'You don\'t have any SwapMaster items.');
      return;
    }
    
    const newMode = itemMode === 'swapMaster' ? null : 'swapMaster';
    setItemMode(newMode);
    setSelectedSwapTile(null);
  };

  const handleUseFractalSplit = () => {
    if ((gameData?.splitItems || 0) <= 0) {
      Alert.alert('No Items', 'You don\'t have any Split items.');
      return;
    }
    
    const newMode = itemMode === 'fractalSplit' ? null : 'fractalSplit';
    setItemMode(newMode);
    setSelectedSwapTile(null);
  };

  const stageName = STAGE_NAMES[level] || `Level ${level}`;
  const displayLevelName = extractLevelName(stageName);

  if (!board) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading level...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>

      {/* 关卡名称动画 */}
      {showLevelNameAnimation && (
        <Animated.View 
          style={[
            styles.levelNameAnimation,
            {
              transform: [{ translateX: levelNameAnimation }]
            }
          ]}
        >
<<<<<<< HEAD
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        
<<<<<<< HEAD
        {/* 新的进度条设计 */}
        <View style={styles.newProgressContainer}>
          {/* 进度条背景 */}
          <View style={styles.progressTrack}>
            {/* 绿色进度填充 */}
            <View style={[styles.progressFillGreen, { width: `${progress * 100}%` }]} />
            
            {/* 人物角色 */}
=======
        <View style={styles.headerCenter}>
          {/* 进度条容器 */}
          <View style={styles.progressContainer}>
            <View 
              style={styles.progressBar}
              onLayout={(event) => {
                const { width } = event.nativeEvent.layout;
                setProgressBarWidth(width);
              }}
            >
              <LinearGradient
                colors={progressGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${progress * 100}%` }]}
              />
            </View>
            {/* 人物图片 - 在进度条上移动 */}
>>>>>>> 5d89f88 (feat: 挑战模式进度条燃烧特效)
            <Animated.View 
              style={[
                styles.characterContainer,
                {
<<<<<<< HEAD
                  left: characterPosition.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '85%'], // 不要到最右边，留空间给标签
                  })
=======
                  transform: [
                    { 
                      translateX: characterPosition.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, progressBarWidth], // 人物从当前位置开始移动到最右边
                        extrapolate: 'clamp',
                      })
                    },
                    { scale: characterScale },
                  ],
>>>>>>> 5d89f88 (feat: 挑战模式进度条燃烧特效)
                }
              ]}
            >
              <Image 
                source={{ uri: 'https://dzdbhsix5ppsc.cloudfront.net/monster/numberkids/monsterwalk.webp' }}
                style={styles.characterImage}
                resizeMode="contain"
              />
            </Animated.View>
<<<<<<< HEAD
          </View>
          
          {/* 关卡名称标签 */}
          <View style={styles.levelNameTag}>
            <Ionicons name="book" size={16} color="white" />
            <Text style={styles.levelNameTagText}>
              {displayLevelName}!
            </Text>
          </View>
=======
            
          </View>
        </View>
        
        <View style={styles.headerRight}>
          {/* 书本图标和关卡名称组合 */}
          {displayLevelName && (
            <View style={styles.levelNameWithBook}>
              <Image
                source={{ uri: 'https://dzdbhsix5ppsc.cloudfront.net/monster/numberkids/book.webp' }}
                style={styles.bookIcon}
                resizeMode="contain"
              />
              <View style={styles.levelNameContainer}>
                <Text style={styles.levelNameText}>
                  {displayLevelName}!
                </Text>
              </View>
            </View>
          )}
>>>>>>> 5d89f88 (feat: 挑战模式进度条燃烧特效)
        </View>
      </View>
=======
          <Text style={styles.levelNameAnimationText}>
            {displayLevelName}
          </Text>
        </Animated.View>
      )}
      
      {/* 新的顶部HUD */}
      <TopHUD
        progress={progress}
        gradeText={displayLevelName}
        nextLevelText={STAGE_NAMES[level + 1] ? extractLevelName(STAGE_NAMES[level + 1]) : `Level ${level + 1}`}
        onBack={handleBackPress}
        onFinished={handleLevelComplete}
      />
>>>>>>> 2824516 (feature)

      {/* 道具工具栏 - 确保在GameBoard之前渲染 */}
      {/* Game Board */}
      <GameBoard
        ref={gameBoardRef}
        key={boardKey}
        tiles={board.tiles}
        width={board.width}
        height={board.height}
        onTilesClear={handleTilesClear}
        disabled={false}
        itemMode={itemMode}
        onTileClick={handleTileClick}
        selectedSwapTile={selectedSwapTile}
        swapAnimations={swapAnimations}
        fractalAnimations={fractalAnimations}
        settings={settings}
        isChallenge={false}
        layoutConfig={board.layoutConfig}
        currentPage={completedPages + 1}
        totalPages={totalPages}
      />

      {/* Bottom Toolbar - 移到GameBoard下方确保不被覆盖 */}
      <View style={styles.bottomToolbar}>
        <TouchableOpacity 
          style={[
            styles.bottomToolButton,
            itemMode === 'swapMaster' && styles.toolButtonActive,
            (gameData?.swapMasterItems || 0) <= 0 && styles.toolButtonDisabled
          ]}
          onPress={handleUseSwapMaster}
          disabled={(gameData?.swapMasterItems || 0) <= 0}
          activeOpacity={0.7}
          hitSlop={{ top: 30, bottom: 30, left: 30, right: 30 }}
        >
          <Ionicons 
            name="swap-horizontal" 
            size={20} 
            color={
              (gameData?.swapMasterItems || 0) <= 0 ? '#ccc' :
              'white' // 改为白色
            } 
          />
          <Text style={[
            styles.toolButtonText,
            itemMode === 'swapMaster' && styles.toolButtonTextActive,
            (gameData?.swapMasterItems || 0) <= 0 && styles.toolButtonTextDisabled
          ]}>
            Change
          </Text>
          <Text style={[
            styles.toolButtonCount,
            itemMode === 'swapMaster' && styles.toolButtonCountActive,
            (gameData?.swapMasterItems || 0) <= 0 && styles.toolButtonCountDisabled
          ]}>
            {gameData?.swapMasterItems || 0}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.bottomToolButton,
            itemMode === 'fractalSplit' && styles.toolButtonActive,
            (gameData?.splitItems || 0) <= 0 && styles.toolButtonDisabled
          ]}
          onPress={handleUseFractalSplit}
          disabled={(gameData?.splitItems || 0) <= 0}
          activeOpacity={0.7}
          hitSlop={{ top: 30, bottom: 30, left: 30, right: 30 }}
        >
          <Ionicons 
            name="cut" 
            size={20} 
            color={
              (gameData?.splitItems || 0) <= 0 ? '#ccc' :
              'white' // 改为白色
            } 
          />
          <Text style={[
            styles.toolButtonText,
            itemMode === 'fractalSplit' && styles.toolButtonTextActive,
            (gameData?.splitItems || 0) <= 0 && styles.toolButtonTextDisabled
          ]}>
            Split
          </Text>
          <Text style={[
            styles.toolButtonCount,
            itemMode === 'fractalSplit' && styles.toolButtonCountActive,
            (gameData?.splitItems || 0) <= 0 && styles.toolButtonCountDisabled
          ]}>
            {gameData?.splitItems || 0}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Completion Modal */}
      <Modal 
        visible={showCompletionModal} 
        transparent 
        animationType="fade"
        onRequestClose={() => setShowCompletionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.completionModal}>
            {/* 新的结算页面背景图片 */}
            <Image
              source={{ uri: 'https://dzdbhsix5ppsc.cloudfront.net/monster/numberkids/cg.jpeg' }}
              style={styles.completionBackground}
              resizeMode="cover"
              pointerEvents="none"
            />
            
            {/* 黑板区域文本框 */}
            <View style={styles.blackboardTextContainer}>
              <View style={styles.textContent}>
                {/* 当前关卡名称 - 带动画 */}
                {(textAnimationPhase === 'initial' || textAnimationPhase === 'currentBounce' || textAnimationPhase === 'currentExit') && (
                  <Animated.View
                    style={{
                      opacity: currentTextOpacity,
                      transform: [
                        { scale: currentTextScale },
                        { 
                          rotate: currentTextRotation.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0deg', '15deg'],
                          })
                        },
                      ],
                    }}
                  >
                    <Text style={styles.blackboardText}>{displayLevelName}!</Text>
                  </Animated.View>
                )}
                
                {/* 下一关卡名称 - 带动画 */}
                {(textAnimationPhase === 'nextEnter' || textAnimationPhase === 'final') && (
                  <Animated.View
                    style={{
                      opacity: nextTextOpacity,
                      transform: [
                        { scale: nextTextScale },
                        { translateY: nextTextTranslateY },
                      ],
                    }}
                  >
                    <Text 
                      style={styles.blackboardText}
                      onLayout={(event) => {
                        const { width } = event.nativeEvent.layout;
                        setTextWidth(width);
                      }}
                    >
                      {STAGE_NAMES[level + 1] ? extractLevelName(STAGE_NAMES[level + 1]) : `Level ${level + 1}`}!
                    </Text>
                    <View style={styles.doubleLines}>
                      <View style={[styles.line, { width: textWidth || 100 }]} />
                      <View style={[styles.line, { width: textWidth || 100 }]} />
                    </View>
                  </Animated.View>
                )}
                
                {/* 闪光粒子效果 */}
                {textAnimationPhase === 'nextEnter' && sparkleParticles.current.map((particle) => (
                  <Animated.View
                    key={particle.id}
                    style={{
                      position: 'absolute',
                      left: `${particle.x}%`,
                      top: `${particle.y}%`,
                      width: particle.size,
                      height: particle.size,
                      backgroundColor: particle.color,
                      borderRadius: particle.size / 2,
                      opacity: particle.animation.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0, 1, 0],
                      }),
                      transform: [
                        {
                          scale: particle.animation.interpolate({
                            inputRange: [0, 0.5, 1],
                            outputRange: [0, 1.5, 0],
                          }),
                        },
                      ],
                    }}
                  />
                ))}
              </View>
            </View>
            
            {/* 返回主页面按钮 */}
            <TouchableOpacity 
              style={[
                styles.returnButton,
                returnButtonPressed && styles.returnButtonPressed
              ]}
              onPress={() => {
                setShowCompletionModal(false);
                router.replace('/(tabs)/');
              }}
              onPressIn={() => setReturnButtonPressed(true)}
              onPressOut={() => setReturnButtonPressed(false)}
            >
              <LinearGradient
                colors={returnButtonPressed ? ['#FF8A65', '#FF7043'] : ['#FF7043', '#FF5722']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.returnButtonText}>Return</Text>
              </LinearGradient>
            </TouchableOpacity>
            
            {/* 下一关按钮 */}
            <TouchableOpacity 
              style={[
                styles.nextButton,
                nextButtonPressed && styles.nextButtonPressed
              ]}
              onPress={handleNextLevel}
              onPressIn={() => setNextButtonPressed(true)}
              onPressOut={() => setNextButtonPressed(false)}
            >
              <LinearGradient
                colors={nextButtonPressed ? ['#42A5F5', '#1565C0'] : ['#1565C0', '#0D47A1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.nextButtonText}>Next</Text>
              </LinearGradient>
            </TouchableOpacity>
            {/* 庆祝粒子效果 - 第一层（慢速小粒子） */}
            {celebrationParticles1.map((particle) => (
              <Animated.View
                key={particle.id}
                style={[
                  styles.celebrationParticle,
                  {
                    position: 'absolute',
                    left: `${particle.x}%`,
                    top: '-10%', // 固定起始位置
                    backgroundColor: particle.color,
                    width: particle.size,
                    height: particle.size,
                    borderRadius: particle.size / 2,
                    transform: [
                      { rotate: `${particle.rotation}deg` },
                      {
                        translateY: particle.animation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 120], // 从0到120%的下落距离
                        }),
                      },
                      {
                        translateX: particle.animation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, Math.random() * 30 - 15], // 较小的左右摆动
                        }),
                      },
                    ],
                    opacity: particle.animation.interpolate({
                      inputRange: [0, 0.9, 1],
                      outputRange: [0.8, 0.8, 0.8], // 稍微透明，营造层次感
                    }),
                  },
                ]}
              />
            ))}
            
            {/* 庆祝粒子效果 - 第二层（快速大粒子） */}
            {celebrationParticles2.map((particle) => (
              <Animated.View
                key={particle.id}
                style={[
                  styles.celebrationParticle,
                  {
                    position: 'absolute',
                    left: `${particle.x}%`,
                    top: '-10%', // 固定起始位置
                    backgroundColor: particle.color,
                    width: particle.size,
                    height: particle.size,
                    borderRadius: particle.size / 2,
                    transform: [
                      { rotate: `${particle.rotation}deg` },
                      {
                        translateY: particle.animation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 120], // 从0到120%的下落距离
                        }),
                      },
                      {
                        translateX: particle.animation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, Math.random() * 60 - 30], // 较大的左右摆动
                        }),
                      },
                    ],
                    opacity: particle.animation.interpolate({
                      inputRange: [0, 0.9, 1],
                      outputRange: [1, 1, 1], // 完全不透明，突出前景
                    }),
                  },
                ]}
              />
            ))}
            
          </View>
        </View>
      </Modal>

      {/* Rescue Modal */}
      <RescueModal
        visible={showRescueModal}
        onContinue={() => {
          setShowRescueModal(false);
          // Generate new board as rescue
          const newBoard = generateBoard(level);
          setBoard(newBoard);
        }}
        onReturn={() => {
          setShowRescueModal(false);
          handleBackPress();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#6B7B8A', // 改为灰蓝色背景
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#6B7B8A', // 改为与背景一致的灰蓝色
    borderBottomWidth: 1,
    borderBottomColor: '#5A6B7A', // 稍微深一点的灰蓝色边框
  },
  backButton: {
    position: 'absolute',
    left: 16,
    top: 12,
    zIndex: 10,
    padding: 8,
    backgroundColor: '#FFD700', // 黄色背景
    borderRadius: 8,
    marginTop: -13, // 与人物保持平行（characterContainer的top值）
  },
<<<<<<< HEAD
  newProgressContainer: {
    marginTop: 8,
    marginHorizontal: 60, // 为返回按钮留空间
=======
  headerCenter: {
    flex: 2, // 保持2，让进度条占更多空间
    marginHorizontal: 16,
    justifyContent: 'center',
    marginTop: 1, // 向下移动1px
  },
  pageProgressContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  pageProgressText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
>>>>>>> 5d89f88 (feat: 挑战模式进度条燃烧特效)
    position: 'relative',
    height: 50,
    paddingLeft: 21, // 保持左padding
    paddingRight: 30, // 增加右padding，让进度条右端与书本位置重合
  },
<<<<<<< HEAD
  progressTrack: {
    height: 12,
    backgroundColor: '#E0E0E0',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#333',
    position: 'relative',
    overflow: 'visible',
=======
  progressBar: {
    flex: 1,
    height: 12, // 从16减小到12，缩小高度
    backgroundColor: '#E0E0E0',
    borderRadius: 6, // 相应调整圆角
    overflow: 'hidden',
>>>>>>> 5d89f88 (feat: 挑战模式进度条燃烧特效)
  },
  progressFillGreen: {
    height: '100%',
<<<<<<< HEAD
    backgroundColor: '#4CAF50',
    borderRadius: 4,
    transition: 'width 0.5s ease-out',
  },
  characterContainer: {
    position: 'absolute',
    top: -20,
    width: 40,
    height: 40,
=======
    borderRadius: 6, // 与progressBar保持一致
  },
  characterContainer: {
    position: 'absolute',
    top: -13, // 从-14调整到-13，向下移动1px
    left: -32, // 向左偏移32px，让人物与进度条最左边重叠
    width: 64, // 从56增加到64，放大一些
    height: 64, // 从56增加到64，放大一些
>>>>>>> 5d89f88 (feat: 挑战模式进度条燃烧特效)
    alignItems: 'center',
    justifyContent: 'center',
  },
  characterImage: {
<<<<<<< HEAD
    width: 36,
    height: 36,
  },
  levelNameTag: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    right: -8,
    top: -8,
    backgroundColor: '#2196F3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
    gap: 4,
  },
  levelNameTagText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
    textShadowColor: '#FF5722',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
=======
    width: 64, // 从56增加到64
    height: 64, // 从56增加到64
  },
  headerRight: {
    position: 'absolute',
    right: 20, // 距离屏幕右边缘20px
    top: 10, // 继续向下移动2px（从8改为10）
    flexDirection: 'row',
    alignItems: 'center',
    width: 120, // 进一步增加宽度到120px，确保关卡名称完整显示
    gap: 8, // 书本图标和文字之间的间距
    zIndex: 10, // 确保在进度条之上
  },
  levelNameWithBook: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 120, // 调整为与headerRight相同的宽度
  },
  bookIcon: {
    width: 50, // 稍微缩小书本，给关卡名称更多空间
    height: 50, // 稍微缩小书本，给关卡名称更多空间
    marginRight: -6, // 向右偏移6px，让书本覆盖到黑色框上
  },
  levelNameContainer: {
    flex: 1,
    minWidth: 0, // 允许收缩
    backgroundColor: '#000', // 黑色背景
    borderRadius: 4,
    paddingHorizontal: 6, // 减少padding，给文字更多空间
    paddingVertical: 4,
    marginLeft: -6, // 向左偏移6px，让书本和黑色框真正紧贴
  },
  levelNameText: {
    fontSize: 10, // 进一步缩小字体
    color: '#fff', // 白色文字
    fontWeight: 'bold',
    textAlign: 'left', // 改为左对齐，确保文字不被截断
    flexShrink: 0, // 防止文字被压缩
>>>>>>> 5d89f88 (feat: 挑战模式进度条燃烧特效)
  },
  bottomToolbar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center', // 改为居中对齐
    alignItems: 'center',
    paddingHorizontal: 20, // 减少左右边距
    paddingVertical: 20,
    paddingBottom: 40, // 增加底部安全区域
    backgroundColor: 'transparent', // 改为透明背景
    gap: 30, // 添加两个按钮之间的间距
    zIndex: 1000,
    elevation: 1000,
  },
  bottomToolButton: {
    width: 64,
    height: 64,
    backgroundColor: '#2196F3', // 主蓝色背景
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  toolButtonActive: {
    backgroundColor: '#1976D2', // 深蓝色激活状态
    transform: [{ scale: 0.95 }], // 按压时稍微缩放
    shadowOpacity: 0.2, // 减弱阴影
  },
  toolButtonDisabled: {
    backgroundColor: '#B0BEC5', // 浅灰蓝色禁用状态
    shadowOpacity: 0, // 去除阴影
  },
  toolButtonText: {
    display: 'none', // 隐藏文字，只显示图标
  },
  toolButtonTextActive: {
    display: 'none',
  },
  toolButtonTextDisabled: {
    display: 'none',
  },
  toolButtonCount: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#000', // 黑色圆形背景
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 20,
    borderWidth: 2,
    borderColor: 'white', // 白色边框
  },
  toolButtonCountActive: {
    backgroundColor: '#000',
    color: 'white',
    borderColor: 'white',
  },
  toolButtonCountDisabled: {
    backgroundColor: '#666',
    color: 'white',
    borderColor: 'white',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  completionModal: {
    width: '90%',
    height: '75%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    backgroundColor: '#6B7B8A', // 游戏页面的灰色背景
    borderRadius: 20,
    overflow: 'hidden',
  },
  completionBackground: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  completionIcon: {
    marginBottom: 16,
  },
  completionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  completionMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  rewardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
    gap: 8,
  },
  rewardText: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '600',
  },
  completionButtons: {
    width: '100%',
    gap: 12,
  },
  nextLevelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  nextLevelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  backToLevelsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 8,
  },
  backToLevelsButtonText: {
    color: '#666',
    fontSize: 16,
  },
  returnButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden', // 确保渐变效果正确显示
  },
  returnButtonPressed: {
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
    transform: [{ scale: 0.95 }], // 轻微缩放效果
  },
  returnButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  nextButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden', // 确保渐变效果正确显示
  },
  nextButtonPressed: {
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
    transform: [{ scale: 0.95 }], // 轻微缩放效果
  },
  buttonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  currentLevelTextContainer: {
    position: 'absolute',
    top: '65%',
    left: '25%',
    backgroundColor: '#000000',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    maxWidth: '30%',
    zIndex: 1000,
    elevation: 1000,
  },
  nextLevelTextContainer: {
    position: 'absolute',
    top: '62.5%',
    right: '13%',
    backgroundColor: '#000000',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    maxWidth: '25%',
    zIndex: 1000,
    elevation: 1000,
  },
  levelText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    lineHeight: 16,
  },
  levelNameAnimation: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: -30 }], // 垂直居中偏移
  },
  levelNameAnimationText: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    color: '#FF0000', // 红色文字
    fontSize: 28,
    fontWeight: 'bold',
    paddingHorizontal: 50,
    paddingVertical: 25,
    borderRadius: 0, // 改为规整的长方形
    textAlign: 'center',
    borderWidth: 1, // 改为细线
    borderColor: '#FFFFFF', // 白色边框
    minWidth: 300,
    minHeight: 80,
    margin: 8, // 添加外边距，让白色线框与边缘有间距
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
  },
  
  // 编辑模式样式
  editingModeContainer: {
    backgroundColor: 'rgba(46, 204, 113, 0.40)', // 绿色半透明
    borderWidth: 3,
    borderColor: '#1E90FF',
    borderStyle: 'dashed',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  editingModeContainerNext: {
    backgroundColor: 'rgba(255, 140, 0, 0.40)', // 橙色半透明
    borderWidth: 3,
    borderColor: '#FF8C00',
    borderStyle: 'dashed',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  editingModeText: {
    textShadowColor: '#000',
    textShadowRadius: 2,
    textShadowOffset: { width: 0, height: 1 },
  },
  
  // 类型标签
  typeTag: {
    position: 'absolute',
    top: -18,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeTagText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  
  // 十字准星
  crosshair: {
    position: 'absolute',
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  crossH: {
    position: 'absolute',
    width: 18,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  crossV: {
    position: 'absolute',
    width: 2,
    height: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  
  // 黑板区域文本框样式
  blackboardTextContainer: {
    position: 'absolute',
    top: '39%', // 再向上移动20px (从42%改为39%)
    left: '50%',
    transform: [{ translateX: -120 }, { translateY: -60 }],
    alignItems: 'center',
    justifyContent: 'center',
    width: 240, // 增加宽度
    height: 120, // 增加高度
  },
  gradientBorder: {
    borderRadius: 12,
    padding: 8, // 进一步增加渐变边框的厚度
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    // 确保渐变边框在四周都显示
    borderWidth: 0,
  },
  textContent: {
    backgroundColor: 'transparent', // 透明背景
    borderRadius: 8,
    paddingHorizontal: 22, // 增加水平内边距（20+2）
    paddingVertical: 18, // 增加垂直内边距（16+2）
    alignItems: 'center',
    justifyContent: 'center',
    // 确保内容区域不会覆盖渐变边框
    flex: 1,
    width: '100%',
    minHeight: 84, // 增加最小高度（80+4）
    // 透明边缘
    borderWidth: 0,
  },
  blackboardText: {
    fontSize: 25, // 增加字体大小（20+5）
    fontWeight: 'bold',
    color: '#FFA500', // 改为橙黄色字体
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    marginVertical: 4,
    // 防止文字溢出
    flexWrap: 'wrap',
    maxWidth: '100%',
  },
  arrowIcon: {
    marginVertical: 8,
  },
  completedText: {
    textDecorationLine: 'line-through', // 添加删除线
    textDecorationColor: '#FF0000', // 红色删除线
    textDecorationStyle: 'solid',
  },
  celebrationParticle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  doubleLines: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    gap: 2,
  },
  line: {
    height: 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 2,
  },
});