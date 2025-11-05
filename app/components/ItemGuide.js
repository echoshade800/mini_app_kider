import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ItemDemoBoard from './ItemDemoBoard';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const ItemGuide = ({ visible, onClose, itemButtonPosition, onItemUsed, itemType = 'swapMaster', onStepChange, currentStep: externalStep }) => {
  const [currentStep, setCurrentStep] = useState(1); // 1: 点击按钮, 2: 点击方块
  const [fadeAnim] = useState(new Animated.Value(0));
  const [pulseAnim] = useState(new Animated.Value(1));
  const [isDemoPlaying, setIsDemoPlaying] = useState(false);
  const demoResetTimeout = useRef(null);

  // 同步外部步骤变化
  useEffect(() => {
    if (externalStep !== undefined && externalStep !== currentStep) {
      setCurrentStep(externalStep);
    }
  }, [externalStep]);

  // 通知父组件步骤变化
  useEffect(() => {
    if (onStepChange) {
      onStepChange(currentStep);
    }
  }, [currentStep, onStepChange]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.1,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
          ])
        ),
      ]).start();
      
      // 开始播放演示动画
      setIsDemoPlaying(true);
    } else {
      fadeAnim.setValue(0);
      pulseAnim.setValue(1);
      setIsDemoPlaying(false);
      setCurrentStep(1); // 重置步骤
      if (demoResetTimeout.current) {
        clearTimeout(demoResetTimeout.current);
      }
    }
  }, [visible]);

  // 监听步骤变化，重置演示动画
  useEffect(() => {
    if (!visible) {
      setIsDemoPlaying(false);
      setCurrentStep(1); // 重置步骤
      return;
    }
    
    if (currentStep === 2) {
      // Step 2时，停止演示动画，显示点击方块的提示
      setIsDemoPlaying(false);
    } else if (currentStep === 1) {
      // Step 1时，重新开始演示动画
      setIsDemoPlaying(true);
    }
  }, [currentStep, visible]);

  if (!visible || !itemButtonPosition || !itemButtonPosition.x) return null;

  // 根据步骤获取文字说明
  const getGuideText = () => {
    if (currentStep === 1) {
      return {
        title: 'Use Item',
        description: 'Tap the item button below to activate it.',
        hint: itemType === 'swapMaster' 
          ? 'SwapMaster: Swap two tiles to create better combinations'
          : 'Split: Break a tile into smaller parts (e.g., 7 → 2+3+2)',
      };
    } else {
      return {
        title: 'Select a Tile',
        description: 'Now tap any number tile on the board to use the item.',
        hint: 'Watch the animation above to see how it works!',
      };
    }
  };

  const guideText = getGuideText();

  return (
    <Modal visible={visible} transparent={true} animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]} pointerEvents="box-none">
        {/* 半透明遮罩 - 不阻挡点击 */}
        <View style={styles.overlay} pointerEvents="none" />

        {/* 遮罩区域 - 保留道具按钮和游戏板区域可见，但使用pointerEvents="none"让点击穿透 */}
        <View style={[styles.maskSection, { top: 0, left: 0, right: 0, height: itemButtonPosition.y - 15 }]} pointerEvents="none" />
        <View style={[styles.maskSection, { top: itemButtonPosition.y - 15, left: 0, width: itemButtonPosition.x - 15, height: itemButtonPosition.height + 30 }]} pointerEvents="none" />
        <View style={[styles.maskSection, { top: itemButtonPosition.y - 15, left: itemButtonPosition.x + itemButtonPosition.width + 15, right: 0, height: itemButtonPosition.height + 30 }]} pointerEvents="none" />
        <View style={[styles.maskSection, { top: itemButtonPosition.y + itemButtonPosition.height + 15, left: 0, right: 0, bottom: 0 }]} pointerEvents="none" />

        {/* 高亮道具按钮 */}
        <Animated.View
          style={[
            styles.spotlightContainer,
            {
              left: itemButtonPosition.x - 10,
              top: itemButtonPosition.y - 10,
              width: itemButtonPosition.width + 20,
              height: itemButtonPosition.height + 20,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <View style={styles.spotlightGlow} />
          <View style={styles.spotlightBorder} />
        </Animated.View>

        {/* 文字说明卡片 - 居中显示 */}
        <View style={[styles.textCard, { 
          top: SCREEN_HEIGHT / 2 - 150, // 屏幕中间，减去卡片高度的一半（现在卡片更高了）
          left: SCREEN_WIDTH / 2, // 水平居中起点
        }]} pointerEvents="auto">
          <View style={styles.arrowContainer}>
            <View style={styles.arrowDown} />
          </View>
          <Text style={styles.title}>{guideText.title}</Text>
          
          {/* 演示动画区域 - 只在Step 1显示 */}
          {currentStep === 1 && (
            <ItemDemoBoard itemType={itemType} isPlaying={isDemoPlaying} />
          )}
          
          <Text style={styles.description}>
            {guideText.description}
          </Text>
          <Text style={styles.hint}>
            {guideText.hint}
          </Text>
        </View>

        {/* 跳过按钮 */}
        <TouchableOpacity style={styles.skipButton} onPress={onClose}>
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10000,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  maskSection: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  spotlightContainer: {
    position: 'absolute',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spotlightGlow: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 28,
    backgroundColor: 'rgba(255, 193, 7, 0.3)',
  },
  spotlightBorder: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 26,
    borderWidth: 3,
    borderColor: '#FFD700',
    borderStyle: 'dashed',
  },
  textCard: {
    position: 'absolute',
    width: 320, // 稍微加宽以容纳演示动画
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    alignItems: 'center',
    transform: [{ translateX: -160 }], // 水平居中：减去卡片宽度的一半
  },
  arrowContainer: {
    marginBottom: 12,
    marginTop: 0,
  },
  arrowDown: {
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderTopWidth: 20,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FFFFFF',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 4,
  },
  skipButton: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#8B4513',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B4513',
  },
});

export default ItemGuide;

