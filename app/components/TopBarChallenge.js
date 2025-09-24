/**
 * TopBarChallenge - 挑战模式顶部UI组件
 * 实现动态炸弹引线、火焰动画、渐变背景、IQ动效与提示气泡
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOPBAR_HEIGHT = Platform.OS === 'ios' ? 88 : 72;
const PADDING_H = 16;
const HEADER_SPACING = 10;

// 素材URL
const BOMB_ICON = 'https://dzdbhsix5ppsc.cloudfront.net/monster/numberkids/bomb.webp';
const DUCK_NEUTRAL = 'https://dzdbhsix5ppsc.cloudfront.net/monster/numberkids/duck1.webp';
const DUCK_HAPPY = 'https://dzdbhsix5ppsc.cloudfront.net/monster/numberkids/duck_excited.webp';
const DUCK_SAD = 'https://dzdbhsix5ppsc.cloudfront.net/monster/numberkids/duck_sad.webp';

// 提示语
const ENCOURAGEMENT_TIPS = [
  "Hurry up!",
  "Go go go!", 
  "You can do it!",
  "Almost there!",
  "Nice combo!"
];

export default function TopBarChallenge({
  timeRemainingMs = 60000,
  totalTimeMs = 60000,
  iqScore = 0,
  iqDelta = 0,
  isPaused = false,
  onBack,
}) {
  // 安全区域
  const insets = useSafeAreaInsets();
  const topBarHeight = TOPBAR_HEIGHT + insets.top;
  
  // 状态
  const [encouragementTip, setEncouragementTip] = useState('');
  const [showEncouragement, setShowEncouragement] = useState(false);
  const [duckExpression, setDuckExpression] = useState('neutral');
  
  // 动画引用
  const flameRotation = useRef(new Animated.Value(0)).current;
  const flameOffsetY = useRef(new Animated.Value(0)).current;
  const iqScale = useRef(new Animated.Value(1)).current;
  const duckScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.6)).current;
  const backgroundOpacity = useRef(new Animated.Value(0.18)).current;
  const encouragementOpacity = useRef(new Animated.Value(0)).current;
  const encouragementTranslateY = useRef(new Animated.Value(-8)).current;
  
  // 进度条特效动画
  const progressBarShake = useRef(new Animated.Value(0)).current;
  const progressBarOpacity = useRef(new Animated.Value(1)).current;
  const progressBarScale = useRef(new Animated.Value(1)).current;
  
  // 引用
  const animationFrameRef = useRef(null);
  const lastUpdateTime = useRef(Date.now());
  const lastEncouragementTime = useRef(0);
  const lastIQScore = useRef(iqScore);
  
  // 计算进度和位置
  const progress = Math.max(0, Math.min(1, timeRemainingMs / totalTimeMs));
  const fuseTrackWidth = SCREEN_WIDTH - PADDING_H * 2 - 40; // 减去炸弹宽度和间距
  const fuseVisibleWidth = fuseTrackWidth * progress;
  const flameX = PADDING_H + 40 + fuseVisibleWidth; // 炸弹宽度40px
  
  // 火焰摆动动画
  const updateFlameAnimation = useCallback(() => {
    if (isPaused) return;
    
    const now = Date.now();
    const time = now * 0.012; // 500ms周期
    
    // 旋转摆动 ±8度
    Animated.timing(flameRotation, {
      toValue: Math.sin(time) * 8,
      duration: 16,
      useNativeDriver: true,
    }).start();
    
    // Y轴随机抖动
    const randomOffset = (Math.random() - 0.5) * 4; // ±2px
    Animated.timing(flameOffsetY, {
      toValue: randomOffset,
      duration: 150 + Math.random() * 150, // 150-300ms
      useNativeDriver: true,
    }).start();
  }, [isPaused, flameRotation, flameOffsetY]);
  
  // 进度条紧张特效
  const updateProgressBarEffects = useCallback(() => {
    if (isPaused) return;
    
    const lowTime = timeRemainingMs <= 10000;
    const criticalTime = timeRemainingMs <= 5000;
    
    if (criticalTime) {
      // 最后5秒：强烈颤抖和闪烁
      const shakeIntensity = 3 + (5000 - timeRemainingMs) / 5000 * 2; // 3-5px
      const shakeX = (Math.random() - 0.5) * shakeIntensity;
      
      Animated.timing(progressBarShake, {
        toValue: shakeX,
        duration: 50,
        useNativeDriver: true,
      }).start();
      
      // 闪烁效果
      const flickerAlpha = 0.3 + Math.random() * 0.7;
      Animated.timing(progressBarOpacity, {
        toValue: flickerAlpha,
        duration: 100,
        useNativeDriver: true,
      }).start();
      
      // 缩放颤抖
      const scaleValue = 0.95 + Math.random() * 0.1;
      Animated.timing(progressBarScale, {
        toValue: scaleValue,
        duration: 80,
        useNativeDriver: true,
      }).start();
      
    } else if (lowTime) {
      // 最后10秒：轻微颤抖
      const shakeIntensity = 1 + (10000 - timeRemainingMs) / 10000 * 2; // 1-3px
      const shakeX = (Math.random() - 0.5) * shakeIntensity;
      
      Animated.timing(progressBarShake, {
        toValue: shakeX,
        duration: 200,
        useNativeDriver: true,
      }).start();
      
      // 轻微闪烁
      const flickerAlpha = 0.7 + Math.random() * 0.3;
      Animated.timing(progressBarOpacity, {
        toValue: flickerAlpha,
        duration: 300,
        useNativeDriver: true,
      }).start();
      
    } else {
      // 正常状态：重置动画
      Animated.timing(progressBarShake, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
      
      Animated.timing(progressBarOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      
      Animated.timing(progressBarScale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isPaused, timeRemainingMs, progressBarShake, progressBarOpacity, progressBarScale]);
  
  // 光晕效果
  const updateGlowEffect = useCallback(() => {
    if (isPaused) return;
    
    const lowTime = timeRemainingMs <= 10000;
    const glowProgress = Math.max(0, (10000 - timeRemainingMs) / 10000);
    
    // 颜色插值：黄色 -> 红色
    const baseAlpha = 0.4 + glowProgress * 0.45; // 0.4 -> 0.85
    
    if (lowTime) {
      // 最后10秒闪烁
      const freq = 1 + glowProgress * 2; // 1Hz -> 3Hz
      const time = Date.now() * freq * 0.001;
      const flickerAlpha = baseAlpha * (0.6 + 0.4 * (0.5 + 0.5 * Math.sin(time)));
      
      Animated.timing(glowOpacity, {
        toValue: flickerAlpha,
        duration: 16,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(glowOpacity, {
        toValue: baseAlpha,
        duration: 16,
        useNativeDriver: false,
      }).start();
    }
  }, [isPaused, timeRemainingMs, glowOpacity]);
  
  // 背景渐变
  const updateBackgroundGradient = useCallback(() => {
    if (isPaused) return;
    
    const gradientProgress = 1 - progress;
    const alpha = 0.18 + gradientProgress * 0.1; // 0.18 -> 0.28
    
    Animated.timing(backgroundOpacity, {
      toValue: alpha,
      duration: 16,
      useNativeDriver: false,
    }).start();
  }, [isPaused, progress, backgroundOpacity]);
  
  // IQ动效
  const updateIQEffects = useCallback(() => {
    if (iqScore !== lastIQScore.current) {
      const delta = iqScore - lastIQScore.current;
      
      // 数字轻微弹跳：95%→105%→100%
      Animated.sequence([
        Animated.timing(iqScale, {
          toValue: 0.95,
          duration: 70,
          useNativeDriver: true,
        }),
        Animated.spring(iqScale, {
          toValue: 1.05,
          friction: 4,
          useNativeDriver: true,
        }),
        Animated.timing(iqScale, {
          toValue: 1,
          duration: 90,
          useNativeDriver: true,
        }),
      ]).start();
      
      // 表情切换
      let newExpression = 'neutral';
      if (delta > 0) newExpression = 'happy';
      else if (delta < 0) newExpression = 'sad';
      
      setDuckExpression(newExpression);
      
      // 表情pop效果
      Animated.sequence([
        Animated.timing(duckScale, {
          toValue: 0.9,
          duration: 60,
          useNativeDriver: true,
        }),
        Animated.timing(duckScale, {
          toValue: 1.0,
          duration: 60,
          useNativeDriver: true,
        }),
      ]).start();
      
      // 600ms后恢复neutral
      setTimeout(() => {
        setDuckExpression('neutral');
      }, 600);
      
      lastIQScore.current = iqScore;
    }
  }, [iqScore, iqScale, duckScale]);
  
  // 随机提示气泡
  const updateEncouragementTip = useCallback(() => {
    if (isPaused) return;
    
    const now = Date.now();
    const timeSinceLastTip = now - lastEncouragementTime.current;
    
    // 6-12秒随机间隔
    if (timeSinceLastTip >= 6000 && Math.random() < 0.1) {
      const tip = ENCOURAGEMENT_TIPS[Math.floor(Math.random() * ENCOURAGEMENT_TIPS.length)];
      setEncouragementTip(tip);
      setShowEncouragement(true);
      lastEncouragementTime.current = now;
      
      // 出现动画
      Animated.parallel([
        Animated.timing(encouragementOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(encouragementTranslateY, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
      
      // 1.6秒后淡出
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(encouragementOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(encouragementTranslateY, {
            toValue: -8,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setShowEncouragement(false);
        });
      }, 1600);
    }
  }, [isPaused, encouragementOpacity, encouragementTranslateY]);
  
  // 主更新循环
  const update = useCallback(() => {
    const now = Date.now();
    const dt = now - lastUpdateTime.current;
    lastUpdateTime.current = now;
    
    if (!isPaused) {
      updateFlameAnimation();
      updateProgressBarEffects();
      updateGlowEffect();
      updateBackgroundGradient();
      updateIQEffects();
      updateEncouragementTip();
    }
    
    animationFrameRef.current = requestAnimationFrame(update);
  }, [
    isPaused,
    updateFlameAnimation,
    updateProgressBarEffects,
    updateGlowEffect,
    updateBackgroundGradient,
    updateIQEffects,
    updateEncouragementTip,
  ]);
  
  // 生命周期
  useEffect(() => {
    update();
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [update]);
  
  // 获取鸭子表情图片
  const getDuckImage = () => {
    switch (duckExpression) {
      case 'happy': return DUCK_HAPPY;
      case 'sad': return DUCK_SAD;
      default: return DUCK_NEUTRAL;
    }
  };
  
  // 获取光晕颜色
  const getGlowColor = () => {
    const glowProgress = Math.max(0, (10000 - timeRemainingMs) / 10000);
    if (glowProgress < 0.5) return '#FFD24D';
    if (glowProgress < 0.8) return '#FF8A3D';
    return '#FF3B30';
  };
  
  // 获取背景颜色 - 与棋盘格背景颜色一致
  const getBackgroundColor = () => {
    // 使用与棋盘格相同的颜色 #2D6B4A，但添加透明度
    return `rgba(45, 107, 74, ${backgroundOpacity._value})`;
  };
  
  return (
    <View style={[styles.container, { height: topBarHeight, top: 30 }]}>
      {/* 背景层 - 与棋盘格背景颜色一致 */}
      <View style={[styles.bgOverlay, { backgroundColor: getBackgroundColor() }]} />
      
      {/* 精致容器 */}
      <LinearGradient
        colors={['rgba(86, 100, 122, 0.12)', 'rgba(63, 74, 90, 0.08)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerCard}
      >
        {/* Header行 */}
        <View style={[styles.headerRow, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
          
          <View style={styles.iqPill}>
            <Text style={styles.iqLabel}>IQ</Text>
            <Animated.Text style={[styles.iqValue, { transform: [{ scale: iqScale }] }]}>
              {iqScore.toString().padStart(2, '0')}
            </Animated.Text>
            <Animated.Image
              source={{ uri: getDuckImage() }}
              style={[styles.duckIcon, { transform: [{ scale: duckScale }] }]}
              resizeMode="contain"
            />
          </View>
        </View>
        
        {/* 引线行 */}
        <View style={styles.fuseRow}>
          <Image source={{ uri: BOMB_ICON }} style={styles.bombIcon} resizeMode="contain" />
          
          <Animated.View 
            style={[
              styles.fuseTrack,
              {
                transform: [
                  { translateX: progressBarShake },
                  { scale: progressBarScale },
                ],
                opacity: progressBarOpacity,
              },
            ]}
          >
            {/* 引线轨道 - 黄棕色内部 */}
            <View style={[styles.fuseTrackBg, { width: fuseTrackWidth }]} />
            
            {/* 未燃烧部分 - 红色 */}
            <View style={[styles.fuseUnburnedMask, { width: fuseTrackWidth - fuseVisibleWidth }]} />
            
            {/* 光晕效果 */}
            <Animated.View
              style={[
                styles.glowEffect,
                {
                  width: fuseTrackWidth,
                  backgroundColor: getGlowColor(),
                  opacity: glowOpacity,
                },
              ]}
            />
          </Animated.View>
          
          {/* 火焰 */}
          <Animated.View
            style={[
              styles.flameContainer,
              {
                left: flameX - PADDING_H - 40,
                transform: [
                  { rotate: flameRotation.interpolate({
                    inputRange: [-8, 8],
                    outputRange: ['-8deg', '8deg'],
                  }) },
                  { translateY: flameOffsetY },
                ],
              },
            ]}
          >
            <View style={styles.flameIcon} />
          </Animated.View>
        </View>
      </LinearGradient>
      
      {/* 鼓励提示气泡 */}
      {showEncouragement && (
        <Animated.View
          style={[
            styles.encouragementBubble,
            {
              top: insets.top + 80,
              opacity: encouragementOpacity,
              transform: [{ translateY: encouragementTranslateY }],
            },
          ]}
        >
          <Text style={styles.encouragementText}>{encouragementTip}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  bgOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  headerCard: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginHorizontal: 8,
    marginTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 8,
    height: 40,
  },
  backButton: {
    padding: 8,
    backgroundColor: '#FFD700',
    borderRadius: 8,
    marginRight: 12,
  },
  iqPill: {
    backgroundColor: '#121417',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  duckIcon: {
    width: 24,
    height: 24,
  },
  fuseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 4,
    height: 32,
  },
  bombIcon: {
    width: 40,
    height: 32,
    opacity: 0.3, // 设置为半透明
  },
  fuseTrack: {
    position: 'relative',
    marginLeft: 8,
    height: 8,
  },
  fuseTrackBg: {
    height: '100%',
    backgroundColor: '#D4AF37', // 黄棕色内部
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#B8860B', // 深黄棕色边框
  },
  fuseUnburnedMask: {
    position: 'absolute',
    top: 0,
    right: 0,
    height: '100%',
    backgroundColor: '#FF4444', // 红色未燃烧部分
    borderRadius: 4,
  },
  glowEffect: {
    position: 'absolute',
    top: -5,
    left: 0,
    height: 18,
    borderRadius: 9,
    opacity: 0.6,
  },
  flameContainer: {
    position: 'absolute',
    width: 20,
    height: 20,
    zIndex: 5,
  },
  flameIcon: {
    width: 20,
    height: 20,
    backgroundColor: '#FF6B35',
    borderRadius: 10,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  encouragementBubble: {
    position: 'absolute',
    right: PADDING_H + 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#FFD700',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 1001,
  },
  encouragementText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
});
