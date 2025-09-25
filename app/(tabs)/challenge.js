/**
 * Challenge Mode Screen - 60-second timed gameplay with IQ scoring
 * Purpose: Fast-paced puzzle solving with automatic board refresh
 * Features: Timer, IQ scoring, continuous board generation, rescue system
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  Alert,
  Modal,
  Animated,
  Image,
  ImageBackground,
  Pressable,
  PanResponder
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGameStore } from '../store/gameStore';
import { generateBoard } from '../utils/boardGenerator';
import { hasValidCombinations } from '../utils/gameLogic';
import GameBoard from '../components/GameBoard';
import RescueModal from '../components/RescueModal';
import { Audio } from 'expo-av';

const CHALLENGE_TIME = 60; // 60 seconds
const POINTS_PER_CLEAR = 3; // +3 IQ per clear

// 结算页图片URL
const RESULT_IMAGE_URL = 'https://dzdbhsix5ppsc.cloudfront.net/monster/numberkids/changeend1.webp';

// 两个按钮热区的固定位置
const HOTSPOT_LEFT = { left: '8%',  top: '78%', width: '44%', height: '11%'  }; // Return
const HOTSPOT_RIGHT= { left: '52%', top: '78%', width: '40%', height: '11%'  }; // Play again

const IQ_TITLES = {
  0: 'Newborn Dreamer',
  40: 'Tiny Adventurer', 
  55: 'Learning Hatchling',
  65: 'Little Explorer',
  70: 'Slow but Steady',
  85: 'Hardworking Student',
  100: 'Everyday Scholar',
  115: 'Rising Star',
  130: 'Puzzle Master',
  145: 'Cosmic Genius',
};

function getIQTitle(iq) {
  const thresholds = Object.keys(IQ_TITLES)
    .map(Number)
    .sort((a, b) => b - a);
  
  for (let threshold of thresholds) {
    if (iq >= threshold) {
      return IQ_TITLES[threshold];
    }
  }
  
  return IQ_TITLES[0];
}

export default function ChallengeScreen() {
  const { gameData, updateGameData, settings } = useGameStore();
  
  // Game state
  const [gameState, setGameState] = useState('playing'); // 'playing', 'finished'
  const [timeLeft, setTimeLeft] = useState(CHALLENGE_TIME);
  const [currentIQ, setCurrentIQ] = useState(0);
  const [iqDelta, setIqDelta] = useState(0);
  const [board, setBoard] = useState(null);
  const [showRescueModal, setShowRescueModal] = useState(false);
  const [boardKey, setBoardKey] = useState(0); // 用于强制重新生成棋盘
  
  // GameBoard ref
  const gameBoardRef = useRef(null);
  
  // 音效引用
  const endSoundRef = useRef(null);
  
  // 加载结束音效
  useEffect(() => {
    const loadEndSound = async () => {
      try {
        console.log('🎵 挑战模式加载结束音效: end.mp3');
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false
        });
        
        const { sound: endSound } = await Audio.Sound.createAsync(
          { uri: 'https://dzdbhsix5ppsc.cloudfront.net/monster/numberkids/end.mp3' }
        );
        endSoundRef.current = endSound;
        console.log('✅ 挑战模式结束音效加载成功');
      } catch (error) {
        console.warn('⚠️ 挑战模式结束音效加载失败:', error);
      }
    };
    
    loadEndSound();
    
    return () => {
      if (endSoundRef.current) {
        endSoundRef.current.unloadAsync();
      }
    };
  }, []);
  
  // 播放结束音效
  const playEndSound = async () => {
    try {
      // 检查音效设置
      if (!settings?.soundEnabled) {
        console.log('🔇 音效已禁用，跳过播放');
        return;
      }
      
      if (endSoundRef.current) {
        console.log('🎵 挑战模式播放结束音效...');
        await endSoundRef.current.replayAsync();
        console.log('✅ 挑战模式结束音效播放成功');
      } else {
        console.warn('⚠️ 挑战模式结束音效未加载');
      }
    } catch (error) {
      console.error('❌ 挑战模式结束音效播放失败:', error);
    }
  };
  
  
  
  // Refs
  const timerRef = useRef(null);
  const gameStartTimeRef = useRef(null);
  
  // IQ数字弹跳动画引用
  const iqScaleAnimation = useRef(new Animated.Value(1)).current;
  
  // 进度紧张度动画引用（已移除）
  // const progressGlowAnimation = useRef(new Animated.Value(0)).current;
  
  // 对角线高光动画引用（已移除）
  // const highlightAnimation = useRef(new Animated.Value(0)).current;
  
  // 鸭鸭跳跃动画引用
  const duckJump = useRef(new Animated.Value(0)).current;
  const duckLeft = useRef(new Animated.Value(0)).current;
  
  // 进度条容器引用
  const progressBarRef = useRef(null);
  const [barWidth, setBarWidth] = useState(0);
  
  // 热区位置状态
  const [hotspotLeft, setHotspotLeft] = useState(HOTSPOT_LEFT);
  const [hotspotRight, setHotspotRight] = useState(HOTSPOT_RIGHT);
  
  // 按钮按压状态
  const [returnButtonPressed, setReturnButtonPressed] = useState(false);
  const [nextButtonPressed, setNextButtonPressed] = useState(false);
  
  // 返回按钮压感反馈动画引用
  const backButtonScaleAnimation = useRef(new Animated.Value(1)).current;
  
  // 分数动画引用
  const scoreScaleAnimation = useRef(new Animated.Value(0.8)).current;
  const scoreOpacityAnimation = useRef(new Animated.Value(0)).current;
  
  // 粒子效果引用
  const sparkleParticles = useRef([]);
  const particleAnimations = useRef(new Map()).current;
  const particleOpacityAnimation = useRef(new Animated.Value(1)).current;
  
  // 生成闪光粒子效果
  const generateSparkleParticles = () => {
    const particles = [];
    for (let i = 0; i < 15; i++) {
      particles.push({
        id: i,
        x: Math.random() * 300 - 150, // -150 到 150
        y: Math.random() * 200 - 100, // -100 到 100
        scale: Math.random() * 0.8 + 0.2, // 0.2 到 1.0
        opacity: Math.random() * 0.8 + 0.2, // 0.2 到 1.0
        rotation: Math.random() * 360,
        delay: Math.random() * 1000, // 0 到 1000ms 延迟
      });
    }
    sparkleParticles.current = particles;
  };

  // 启动分数弹跳动画
  const startScoreAnimation = () => {
    // 分数弹跳登场
    Animated.sequence([
      Animated.spring(scoreScaleAnimation, {
        toValue: 1.2,
        tension: 100,
        friction: 3,
        useNativeDriver: true,
      }),
      Animated.spring(scoreScaleAnimation, {
        toValue: 1,
        tension: 100,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();
    
    Animated.timing(scoreOpacityAnimation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    // 生成粒子效果
    generateSparkleParticles();
  };

  // 循环播放粒子动画（只影响粒子，不影响分数）
  const startParticleLoop = () => {
    const createLoopAnimation = () => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(particleOpacityAnimation, {
            toValue: 0.3,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(particleOpacityAnimation, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      );
    };
    
    const loopAnimation = createLoopAnimation();
    loopAnimation.start();
    
    return loopAnimation;
  };

  // Initialize board and start game automatically
  useEffect(() => {
    console.log('🎯 挑战模式：useEffect 触发', { gameState, hasBoard: !!board });
    if (gameState === 'playing' && !board) {
      console.log('🎯 挑战模式：开始自动启动游戏');
      // Auto-start the game when component mounts
      setTimeLeft(CHALLENGE_TIME);
      setCurrentIQ(0);
      gameStartTimeRef.current = Date.now();
      generateNewBoard();
    }
  }, [gameState]);



  // 鸭鸭位置更新（进度变化时）
  useEffect(() => {
    if (barWidth > 0) {
      const progress = timeLeft / CHALLENGE_TIME;
      updateDuck(progress, barWidth);
    }
  }, [timeLeft, barWidth]);

  // Timer logic
  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(prev => {
          const newTime = prev - 1;
          
          // 进度条动画现在由TopBarChallenge处理
          
          if (newTime <= 0) {
            handleGameEnd();
            return 0;
          }
          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [gameState, timeLeft]);

  const generateNewBoard = () => {
    console.log('🎯 挑战模式：开始生成新棋盘');
    const newBoard = generateBoard(100, true, true); // 挑战模式：高数量方块
    console.log('🎯 挑战模式：棋盘生成结果', newBoard ? '成功' : '失败');
    
    if (newBoard) {
      console.log('🎯 挑战模式：棋盘数据', {
        tiles: newBoard.tiles?.length || 0,
        width: newBoard.width,
        height: newBoard.height,
        hasLayoutConfig: !!newBoard.layoutConfig
      });
      
      // 确保布局配置存在
      if (!newBoard.layoutConfig) {
        console.error('🎯 挑战模式：布局配置缺失，重新生成');
        // 重新生成棋盘
        const retryBoard = generateBoard(100, true, true);
        if (retryBoard && retryBoard.layoutConfig) {
          setBoardKey(prev => prev + 1);
          setBoard(retryBoard);
          return;
        }
      }
      
      // 检查是否有可消除的组合
      const hasValidMoves = hasValidCombinations(newBoard.tiles, newBoard.width, newBoard.height);
      console.log('🎯 挑战模式：可消除组合检测', hasValidMoves ? '有解' : '无解');
      
      if (!hasValidMoves) {
        console.log('🎯 挑战模式：检测到无解情况，自动重新生成');
        // 延迟500ms后重新生成，避免过于频繁
        setTimeout(() => {
          generateNewBoard();
        }, 500);
        return;
      }
    } else {
      console.error('🎯 挑战模式：棋盘生成失败');
    }
    
    setBoardKey(prev => prev + 1); // 更新key强制重新渲染
    setBoard(newBoard);
  };

  // 页面获得焦点时的处理（重置游戏状态）
  useFocusEffect(
    useCallback(() => {
      console.log('🎯 挑战模式：useFocusEffect 触发');
      // 每次进入页面时重置游戏状态
      setBoard(null);
      setCurrentIQ(0);
      setTimeLeft(CHALLENGE_TIME);
      setBoardKey(prev => prev + 1);
      // 立即生成新棋盘
      console.log('🎯 挑战模式：useFocusEffect 中生成新棋盘');
      const newBoard = generateBoard(100, true, true);
      console.log('🎯 挑战模式：useFocusEffect 棋盘生成结果', newBoard ? '成功' : '失败');
      
      if (newBoard && newBoard.layoutConfig) {
        // 检查是否有可消除的组合
        const hasValidMoves = hasValidCombinations(newBoard.tiles, newBoard.width, newBoard.height);
        console.log('🎯 挑战模式：useFocusEffect 可消除组合检测', hasValidMoves ? '有解' : '无解');
        
        if (!hasValidMoves) {
          console.log('🎯 挑战模式：useFocusEffect 检测到无解情况，自动重新生成');
          // 延迟500ms后重新生成
          setTimeout(() => {
            const retryBoard = generateBoard(100, true, true);
            if (retryBoard && retryBoard.layoutConfig) {
              setBoard(retryBoard);
            }
          }, 500);
        } else {
          setBoard(newBoard);
        }
      } else {
        console.error('🎯 挑战模式：useFocusEffect 中棋盘生成失败');
        // 尝试重新生成
        const retryBoard = generateBoard(100, true, true);
        if (retryBoard && retryBoard.layoutConfig) {
          setBoard(retryBoard);
        }
      }
    }, [])
  );


  const handleTilesClear = (clearedPositions) => {
    // 奖励分数
    const newIQ = currentIQ + POINTS_PER_CLEAR;
    const delta = POINTS_PER_CLEAR;
    setCurrentIQ(newIQ);
    setIqDelta(delta);
    
    // IQ数字弹跳动画：95%→105%→100%
    Animated.sequence([
      Animated.timing(iqScaleAnimation, {
        toValue: 0.95,
        duration: 70,
        useNativeDriver: true,
      }),
      Animated.spring(iqScaleAnimation, {
        toValue: 1.05,
        friction: 4,
        useNativeDriver: true,
      }),
      Animated.timing(iqScaleAnimation, {
        toValue: 1,
        duration: 90,
        useNativeDriver: true,
      }),
    ]).start();

    // 🎯 最后10秒时间奖励机制
    if (timeLeft <= 10) {
      const newTimeLeft = Math.min(timeLeft + 1, CHALLENGE_TIME); // 最多不超过60秒
      setTimeLeft(newTimeLeft);
      
      
      // 调试日志已移除
    }

    // 更新棋盘：移除被清除的方块
    if (board) {
      const newTiles = [...board.tiles];
      clearedPositions.forEach(pos => {
        const index = pos.row * board.width + pos.col;
        newTiles[index] = 0;
      });
      
      // 检查棋盘是否完全清空
      const remainingTiles = newTiles.filter(tile => tile > 0).length;
      
      if (remainingTiles === 0) {
        // 棋盘完全清空 - 短暂延迟后生成新棋盘（挑战模式特有）
        // 调试日志已移除
        setTimeout(() => {
          generateNewBoard();
        }, 500);
      } else {
        // 检查是否还有可消除的组合
        const hasValidCombos = hasValidCombinations(newTiles, board.width, board.height);
        
        if (!hasValidCombos) {
          // 没有可消除的组合 - 生成新棋盘
          console.log('🎯 挑战模式：消除后检测到无解情况，自动重新生成');
          setTimeout(() => {
            generateNewBoard();
          }, 500);
        } else {
          // 更新当前棋盘状态
          setBoard(prev => ({
            ...prev,
            tiles: newTiles
          }));
        }
      }
    }
  };

  const handleGameEnd = () => {
    // 同步执行：设置游戏状态和播放音效
    setGameState('finished');
    playEndSound();
    
    // Clear timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Update best score if needed
    const currentBest = gameData?.maxScore || 0;
    if (currentIQ > currentBest) {
      updateGameData({ maxScore: currentIQ });
    }
    
    // 启动分数动画和粒子循环
    setTimeout(() => {
      startScoreAnimation();
      startParticleLoop();
    }, 500);
  };

  // 获取进度条颜色（暖色调渐变）
  const getProgressColor = (progress) => {
    if (progress >= 0.6) return '#FF6B35'; // 暖橙色
    if (progress >= 0.3) return '#FF8C42'; // 暖黄色
    return '#FF4444'; // 红色
  };

  // 炸弹鸭更新函数
  const updateDuck = (progress, barWidth) => {
    const DUCK_SIZE = 72; // 放大0.5倍：48 * 1.5 = 72
    // 让炸弹鸭的右边缘与进度条的右边缘保持一致
    const progressFillWidth = progress * barWidth;
    const targetLeft = progressFillWidth - DUCK_SIZE;

    // 使用 translateX 而不是 left
    Animated.timing(duckLeft, { 
      toValue: Math.max(0, targetLeft), // 确保不会超出左边界
      duration: 180, 
      useNativeDriver: true 
    }).start();

    // 轻微跳跃：-4 → 0
    Animated.sequence([
      Animated.timing(duckJump, { 
        toValue: -4, 
        duration: 90, 
        useNativeDriver: true 
      }),
      Animated.timing(duckJump, { 
        toValue: 0, 
        duration: 120, 
        useNativeDriver: true 
      }),
    ]).start();
  };

  // 热区拖拽处理函数（简化版）
  const handleHotspotTouchMove = (type, event) => {
    const { pageX, pageY } = event.nativeEvent;
    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;
    
    const leftPercent = (pageX / screenWidth) * 100;
    const topPercent = (pageY / screenHeight) * 100;
    
    if (type === 'left') {
      setHotspotLeft({
        left: `${Math.max(0, Math.min(90, leftPercent))}%`,
        top: `${Math.max(0, Math.min(90, topPercent))}%`,
        width: '44%',
        height: '11%',
      });
    } else if (type === 'right') {
      setHotspotRight({
        left: `${Math.max(0, Math.min(90, leftPercent))}%`,
        top: `${Math.max(0, Math.min(90, topPercent))}%`,
        width: '40%',
        height: '11%',
      });
    }
  };


  const handleBackToHome = () => {
    console.log('🏠 挑战模式：返回按钮被点击');
    
    // 返回按钮压感反馈动画
    Animated.sequence([
      Animated.timing(backButtonScaleAnimation, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(backButtonScaleAnimation, {
        toValue: 1,
        friction: 3,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Clear timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    console.log('🏠 挑战模式：准备导航到主页面');
    router.replace('/(tabs)/');
  };

  const handlePlayAgain = () => {
    setGameState('playing');
    setBoard(null);
    setTimeLeft(CHALLENGE_TIME);
    setCurrentIQ(0);
    gameStartTimeRef.current = Date.now();
    generateNewBoard();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };


  // Game screen
  if (gameState === 'playing') {
    return (
      <SafeAreaView style={styles.container}>
        {/* HUD - Back Button + Progress Bar + IQ */}
        <View style={styles.hud}>
          {/* 顶部微遮罩 */}
          <View style={styles.headerOverlay} />
          
          <View style={styles.hudLeft}>
            <Animated.View style={{ transform: [{ scale: backButtonScaleAnimation }] }}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={handleBackToHome}
              >
                <Ionicons name="arrow-back" size={24} color="black" />
              </TouchableOpacity>
            </Animated.View>
          </View>
          
          <View style={styles.hudCenter}>
            <View style={styles.iqPill}>
              <Text style={styles.iqLabel}>IQ</Text>
              <Animated.Text style={[styles.iqValue, { transform: [{ scale: iqScaleAnimation }] }]}>
                {currentIQ.toString().padStart(2, '0')}
              </Animated.Text>
            </View>
            <View style={styles.progressContainer}>
              <View style={styles.progressBarWrapper}>
                <View 
                  ref={progressBarRef}
                  style={styles.progressBar}
                  onLayout={(event) => {
                    const { width } = event.nativeEvent.layout;
                    setBarWidth(width);
                  }}
                >
                  <Animated.View
                    style={[
                      styles.progressFill,
                      {
                        width: `${(timeLeft / CHALLENGE_TIME) * 100}%`,
                        backgroundColor: getProgressColor(timeLeft / CHALLENGE_TIME),
                      },
                    ]}
                  />
                </View>
                
                {/* 炸弹鸭头像层 */}
                <Animated.Image
                  source={{ uri: 'https://dzdbhsix5ppsc.cloudfront.net/monster/numberkids/bombduck1.webp' }}
                  style={[
                    styles.duck,
                    {
                      transform: [
                        { translateX: duckLeft },
                        { translateY: duckJump }
                      ],
                    },
                  ]}
                  resizeMode="contain"
                />
              </View>
              
              {/* 倒计时小框 */}
              <View style={styles.timerBox}>
                <Text style={styles.timerText}>{timeLeft}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Game Board */}
        {board && board.layoutConfig && (
          <GameBoard
            ref={gameBoardRef}
            key={boardKey}
            tiles={board.tiles}
            width={board.width}
            height={board.height}
            onTilesClear={handleTilesClear}
            disabled={false}
            settings={settings}
            isChallenge={true}
            layoutConfig={{
              ...board.layoutConfig,
              boardTop: board.layoutConfig.boardTop + 30, // 向下移动30px
            }}
          />
        )}

        {/* Rescue Modal */}
        <RescueModal
          visible={showRescueModal}
          onContinue={() => {
            setShowRescueModal(false);
            generateNewBoard(); // Generate new board as rescue
          }}
          onReturn={() => {
            setShowRescueModal(false);
            handleBackToHome();
          }}
        />
      </SafeAreaView>
    );
  }

  // Results screen
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.wrap}>
        <ImageBackground
          source={{ uri: RESULT_IMAGE_URL }}
          resizeMode="contain"
          style={styles.bg}
          imageStyle={styles.bgImage}
          accessible
          accessibilityRole="image"
          accessibilityLabel="Challenge result poster"
          pointerEvents="box-none"
        >
          {/* 分数遮挡层 */}
          <View style={styles.scoreMask}>
            <Animated.View
              style={{
                opacity: scoreOpacityAnimation,
                transform: [{ scale: scoreScaleAnimation }],
              }}
            >
              <Text style={styles.scoreText}>{currentIQ}</Text>
            </Animated.View>
            
            {/* 闪光粒子效果 */}
            {sparkleParticles.current.map((particle) => (
              <Animated.View
                key={particle.id}
                style={{
                  position: 'absolute',
                  left: particle.x,
                  top: particle.y,
                  opacity: Animated.multiply(particle.opacity, particleOpacityAnimation),
                  transform: [
                    { scale: particle.scale },
                    { rotate: `${particle.rotation}deg` },
                  ],
                }}
              >
                <Text style={styles.sparkleText}>✨</Text>
              </Animated.View>
            ))}
          </View>

          {/* 返回主页面按钮 */}
          <TouchableOpacity 
            style={[
              styles.returnButton,
              returnButtonPressed && styles.returnButtonPressed
            ]}
            onPress={() => router.replace('/(tabs)/')}
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
          
          {/* 重新开始按钮 */}
          <TouchableOpacity 
            style={[
              styles.nextButton,
              nextButtonPressed && styles.nextButtonPressed
            ]}
            onPress={handlePlayAgain}
            onPressIn={() => setNextButtonPressed(true)}
            onPressOut={() => setNextButtonPressed(false)}
          >
            <LinearGradient
              colors={nextButtonPressed ? ['#42A5F5', '#1565C0'] : ['#1565C0', '#0D47A1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.nextButtonText}>Play Again</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ImageBackground>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F2E9',
  },
  // HUD样式
  hud: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#2D6B4A', // 与棋盘格背景颜色一致
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    position: 'relative',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.1)', // 10% 透明度深色蒙层
    zIndex: 1,
    pointerEvents: 'none', // 允许触摸事件穿透
  },
  hudLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
  },
  hudCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 20,
    zIndex: 2,
  },
  backButton: {
    padding: 8,
    backgroundColor: '#FFD700',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.8)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 4,
  },
  iqText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  iqPill: {
    backgroundColor: '#121417',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    marginLeft: 30, // 向右移动30px
  },
  iqLabel: {
    color: '#9AA3AF',
    fontSize: 14,
    fontWeight: '600',
  },
  iqValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  // 倒计时小框样式
  timerBox: {
    backgroundColor: '#000000',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  bombIcon: {
    width: 30,
    height: 30,
    marginRight: 8,
  },
  // 进度条包装器样式
  progressBarWrapper: {
    flex: 1,
    position: 'relative',
    alignItems: 'flex-start',
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF4444',
    borderRadius: 4,
  },
  // 炸弹鸭头像样式
  duck: {
    position: 'absolute',
    bottom: -20, // 调整位置让炸弹鸭与进度条重叠
    width: 72, // 放大0.5倍：48 * 1.5 = 72
    height: 72, // 放大0.5倍：48 * 1.5 = 72
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  wrap: {
    width: '100%',
    alignItems: 'center',
    flex: 1,
  },
  bg: {
    width: '100%',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F2E9',
  },
  bgImage: {
    resizeMode: 'contain',
  },
  hotspot: {
    position: 'absolute',
    borderRadius: 20,
    zIndex: 10,
  },
  // 左热区样式
  hotspotLeft: {
    backgroundColor: 'rgba(255, 0, 0, 0.3)', // 半透明红色
    borderWidth: 2,
    borderColor: '#FF0000',
  },
  // 右热区样式
  hotspotRight: {
    backgroundColor: 'rgba(0, 255, 0, 0.3)', // 半透明绿色
    borderWidth: 2,
    borderColor: '#00FF00',
  },
  // 热区内部Pressable样式
  hotspotPressable: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  // 分数遮挡层
  scoreMask: {
    position: 'absolute',
    top: '50%', // 向下移动10px (48% -> 50%)
    alignSelf: 'center',
    width: '36%',
    height: 60,
    backgroundColor: 'transparent', // 背景透明
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  scoreText: {
    color: '#000', // 文字颜色改为黑色
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  // 闪光粒子文字样式
  sparkleText: {
    fontSize: 20,
    color: '#FFD700', // 金色粒子
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#6B7B8A', // 与闯关模式保持一致的灰蓝色背景
    borderBottomWidth: 1,
    borderBottomColor: '#5A6B7A', // 稍微深一点的灰蓝色边框
  },
  backButton: {
    padding: 8,
    backgroundColor: '#FFD700', // 黄色背景
    borderRadius: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: 'white', // 改为白色，在灰蓝色背景下更清晰
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  hud: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#6B7B8A', // 与闯关模式保持一致的灰蓝色背景
    borderBottomWidth: 1,
    borderBottomColor: '#5A6B7A', // 稍微深一点的灰蓝色边框
  },
  hudLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  hudCenter: {
    flex: 2,
    alignItems: 'flex-start',
    marginLeft: 0,
  },
  backButton: {
    padding: 8,
    backgroundColor: '#FFD700', // 黄色背景
    borderRadius: 8,
  },
  iqText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    marginLeft: -10,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -50,
  },
  bombIcon: {
    width: 48,
    height: 48,
    marginRight: 8,
    backgroundColor: 'transparent',
  },
  progressBar: {
    width: 200,
    height: 12,
    backgroundColor: 'transparent', // 透明外框
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF4444', // 红色填充
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#FFD700', // 黄色内框
  },
});