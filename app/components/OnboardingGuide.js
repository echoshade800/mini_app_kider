import React, { useRef } from 'react';
import {
  View,
  Text,
  ImageBackground,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  Animated,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const BACK_W = 48; // 与游戏页面返回按钮尺寸一致

const OnboardingGuide = ({ visible, onClose }) => {
  const insets = useSafeAreaInsets();
  const backButtonScale = useRef(new Animated.Value(1)).current;

  if (!visible) return null;

  const handleBackPressIn = () => {
    // 触觉反馈
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // 缩放动画
    Animated.spring(backButtonScale, {
      toValue: 0.9,
      friction: 3,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const handleBackPressOut = () => {
    // 恢复动画
    Animated.spring(backButtonScale, {
      toValue: 1,
      friction: 3,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const handleBackPress = () => {
    onClose();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground
        source={{ uri: 'https://dzdbhsix5ppsc.cloudfront.net/monster/numberkids/one.webp' }}
        style={styles.backgroundImage}
        resizeMode="contain" // 改为contain以保持图片比例
      >
        {/* 图片缩放容器 */}
        <View style={styles.imageContainer}>
          {/* 返回按钮 - 与游戏页面样式一致 */}
          <Pressable
            onPress={handleBackPress}
            onPressIn={handleBackPressIn}
            onPressOut={handleBackPressOut}
            style={[styles.backButton, { top: insets.top + 20 + (72 - BACK_W) / 2 - 80, left: 14 - 10 }]} // 向上移动80px（10+20+30+10+10），向左移动10px（5+5）
            accessibilityLabel="返回主页面"
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Animated.View style={[styles.backButtonContainer, { transform: [{ scale: backButtonScale }] }]}>
              <Ionicons name="arrow-back" size={24} color="#8B4513" />
            </Animated.View>
          </Pressable>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    backgroundColor: '#000',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    width: '90%', // 缩小到90%宽度
    height: '90%', // 缩小到90%高度
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    // left 位置在组件中动态设置
  },
  backButtonContainer: {
    width: BACK_W,
    height: BACK_W,
    borderRadius: 12,
    backgroundColor: '#FFD54F', // 与游戏页面一致
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
});

export default OnboardingGuide;
