// src/ui/TopHUD.js
import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, Pressable, Animated, Dimensions, Image, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_W } = Dimensions.get('window');
const SAFE_H = 72;           // 顶部 HUD 目标高度（可调）
const PADDING_H = 14;        // 左右安全边距
const BAR_H = 11;            // 进度条可视高度（22的一半）
const DUCK_W = 64;           // 小鸭目标宽度（会按高自适配）
const BOOK_W = 94.5; // 126 * 0.75 = 94.5
const BACK_W = 48;

export default function TopHUD({
  progress = 0,                 // 0..1
  gradeText = '一年级',
  nextLevelText = '下一关',     // 下一关关卡名称
  onBack,
  onFinished,                   // progress===1 到达右边回调（触发结算）
}) {
  const insets = useSafeAreaInsets();
  const anim = React.useRef(new Animated.Value(progress)).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: progress, duration: 250, useNativeDriver: false }).start(({ finished }) => {
      if (finished && progress >= 1 && onFinished) onFinished();
    });
  }, [progress]);

  // 计算布局宽度
  const HUD_W = SCREEN_W - PADDING_H * 2;

  // 可移动范围：进度条左边缘 到 书本左缘
  const leftStop = BACK_W + 12 - 30 + 10;            // 返回按钮后面预留，向左移动30px，再向右移动10px
  const rightStop = HUD_W - BOOK_W - 6 + 10;         // 书本前预留减少，让书本正好在进度条右端，再向右移动10px
  const duckLeft = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [leftStop, rightStop],
  });

  // 进度条宽度 - 扩大长度
  const barLeft = BACK_W + 12 + 10;                  // 向右移动10px
  const barRight = HUD_W - BOOK_W - 6 + 10;          // 减少右边距，扩大进度条长度，再向右移动10px
  const barWidth = barRight - barLeft;

  const fillWidth = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, barWidth],
  });

  return (
    <View style={[styles.wrap, { width: HUD_W, height: SAFE_H, marginTop: insets.top }]}>
      {/* 背条（也可以用底图） */}
      <View style={[styles.base, { left: 0, right: 0, height: SAFE_H }]} />
      {/* 返回按钮 */}
      <Pressable onPress={onBack} style={[styles.abs, { left: 0, top: (SAFE_H - BACK_W) / 2 }]}>
        <View style={styles.backButtonContainer}>
          <Ionicons name="arrow-back" size={24} color="#8B4513" />
        </View>
      </Pressable>

      {/* 右侧书本 */}
      <View style={[styles.abs, { right: 10, top: (SAFE_H - BOOK_W) / 2 + 10 }]}>
        <View style={styles.bookContainer}>
          <Image
            source={{ uri: 'https://dzdbhsix5ppsc.cloudfront.net/monster/numberkids/book.webp' }}
            style={styles.bookImage}
            resizeMode="contain"
          />
        </View>
        {/* 下一关关卡名称 */}
        <View style={styles.nextLevelTextContainer}>
          <Text style={styles.nextLevelText}>{nextLevelText}</Text>
        </View>
      </View>

      {/* 进度条底槽 */}
      <View style={[styles.barTrack, { left: barLeft, width: barWidth, height: BAR_H, top: SAFE_H - BAR_H - 8 }]} />

      {/* 进度条填充 */}
      <Animated.View style={[styles.barFill, { left: barLeft, width: fillWidth, height: BAR_H, top: SAFE_H - BAR_H - 8 }]} />

      {/* 小鸭（随进度移动） */}
      <Animated.View style={[styles.abs, { top: 6, transform: [{ translateX: duckLeft }] }]}>
        <View style={styles.duckContainer}>
          <Image
            source={{ uri: 'https://dzdbhsix5ppsc.cloudfront.net/monster/numberkids/duck1.webp' }}
            style={styles.duckImage}
            resizeMode="contain"
          />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: PADDING_H,
    marginTop: 20, // 向下移动20px
    alignSelf: 'center',
  },
  abs: { position: 'absolute' },
  base: {
    position: 'absolute',
    borderRadius: 16,
    backgroundColor: '#6B7B8A', // 游戏页面的灰蓝色背景
  },
  barTrack: {
    position: 'absolute',
    borderRadius: BAR_H / 2,
    backgroundColor: '#2C2C2C',          // 深灰黑色外框
    borderWidth: 1,
    borderColor: '#1A1A1A',              // 更深的边框
  },
  barFill: {
    position: 'absolute',
    borderRadius: BAR_H / 2,
    backgroundColor: '#4CAF50',          // 绿色进度
  },
  backButtonContainer: {
    width: BACK_W,
    height: BACK_W,
    borderRadius: 12,
    backgroundColor: '#FFD54F',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  bookContainer: {
    width: BOOK_W,
    height: BOOK_W,
    borderRadius: 8,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  bookImage: {
    width: 67.5, // 90 * 0.75 = 67.5
    height: 67.5, // 90 * 0.75 = 67.5
  },
  duckContainer: {
    width: DUCK_W,
    height: DUCK_W,
    borderRadius: DUCK_W / 2,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  duckImage: {
    width: 96, // 48 * 2 = 96
    height: 96, // 48 * 2 = 96
  },
  nextLevelTextContainer: {
    position: 'absolute',
    top: BOOK_W - 36, // 书本图标下方，再向下移动5px
    left: '50%',
    transform: [{ translateX: -30 }], // 居中对齐
    backgroundColor: '#000000',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10, // 确保在书本图标上方
  },
  nextLevelText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
