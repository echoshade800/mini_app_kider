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

const ItemGuide = ({ visible, onClose, itemButtonPosition, splitButtonPosition, onItemUsed, onStartGame }) => {
  const [currentStep, setCurrentStep] = useState(1); // 1: SwapMaster演示, 2: Split演示, 3: 消除演示, 4: 开始游戏
  const [fadeAnim] = useState(new Animated.Value(0));
  const [pulseAnim] = useState(new Animated.Value(1));
  const [isDemoPlaying, setIsDemoPlaying] = useState(false);
  const demoResetTimeout = useRef(null);
  
  // 根据步骤获取当前应该高亮的按钮位置
  const getCurrentButtonPosition = () => {
    if (currentStep === 1) {
      return itemButtonPosition; // SwapMaster按钮
    } else if (currentStep === 2) {
      return splitButtonPosition; // Split按钮
    }
    return null; // Step 3和4不显示高亮
  };

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
      setCurrentStep(1);
      return;
    }
    
    if (currentStep === 1 || currentStep === 2 || currentStep === 3) {
      // Step 1-3时，播放对应道具的演示动画
      setIsDemoPlaying(true);
    } else if (currentStep === 4) {
      // Step 4时，停止演示动画，显示开始按钮
      setIsDemoPlaying(false);
    }
  }, [currentStep, visible]);

  // Step 1需要SwapMaster按钮位置，Step 2需要Split按钮位置
  const currentButtonPos = getCurrentButtonPosition();
  if (!visible || (currentStep <= 2 && (!currentButtonPos || !currentButtonPos.x))) return null;

  // 根据步骤获取文字说明和道具类型
  const getGuideText = () => {
    if (currentStep === 1) {
      return {
        title: 'SwapMaster Item',
        description: 'Swap two tiles to create better combinations.',
        hint: 'Watch the animation above to see how it works!',
        itemType: 'swapMaster',
      };
    } else if (currentStep === 2) {
      return {
        title: 'Split Item',
        description: 'Break a tile into smaller parts.',
        hint: 'For example: 3+4=7',
        itemType: 'split',
      };
    } else if (currentStep === 3) {
      return {
        title: 'Elimination',
        description: 'Draw rectangles around numbers that add up to 10 to clear them.',
        hint: 'For example: 3 + 7 = 10',
        itemType: 'elimination',
      };
    } else {
      return {
        title: 'Ready to Play!',
        description: 'You\'ve learned how to use items. Now let\'s start the game!',
        hint: 'Tap the button below to begin Level 1.',
        itemType: null,
      };
    }
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleStartGame = () => {
    if (onStartGame) {
      onStartGame();
    }
    onClose();
  };

  const guideText = getGuideText();

  return (
    <Modal visible={visible} transparent={true} animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]} pointerEvents="box-none">
        {/* 半透明遮罩 - 不阻挡点击 */}
        <View style={styles.overlay} pointerEvents="none" />

        {/* 遮罩区域 - 根据当前步骤高亮的按钮动态调整 */}
        {currentButtonPos && (
          <>
            <View style={[styles.maskSection, { top: 0, left: 0, right: 0, height: currentButtonPos.y - 15 }]} pointerEvents="none" />
            <View style={[styles.maskSection, { top: currentButtonPos.y - 15, left: 0, width: currentButtonPos.x - 15, height: currentButtonPos.height + 30 }]} pointerEvents="none" />
            <View style={[styles.maskSection, { top: currentButtonPos.y - 15, left: currentButtonPos.x + currentButtonPos.width + 15, right: 0, height: currentButtonPos.height + 30 }]} pointerEvents="none" />
            <View style={[styles.maskSection, { top: currentButtonPos.y + currentButtonPos.height + 15, left: 0, right: 0, bottom: 0 }]} pointerEvents="none" />
          </>
        )}

        {/* 高亮道具按钮 - Step 1显示SwapMaster按钮，Step 2显示Split按钮 */}
        {currentButtonPos && (currentStep === 1 || currentStep === 2) && (
          <Animated.View
            style={[
              styles.spotlightContainer,
              {
                left: currentButtonPos.x - 10,
                top: currentButtonPos.y - 10,
                width: currentButtonPos.width + 20,
                height: currentButtonPos.height + 20,
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <View style={styles.spotlightGlow} />
            <View style={styles.spotlightBorder} />
          </Animated.View>
        )}

        {/* 文字说明卡片 - 居中显示 */}
        <View style={[styles.textCard, { 
          top: SCREEN_HEIGHT / 2 - 150, // 屏幕中间，减去卡片高度的一半（现在卡片更高了）
          left: SCREEN_WIDTH / 2, // 水平居中起点
        }]} pointerEvents="auto">
          <View style={styles.arrowContainer}>
            <View style={styles.arrowDown} />
          </View>
          <Text style={styles.title}>{guideText.title}</Text>
          
          {/* 演示动画区域 - Step 1-3显示对应道具的演示 */}
          {(currentStep === 1 || currentStep === 2 || currentStep === 3) && (
            <ItemDemoBoard itemType={guideText.itemType} isPlaying={isDemoPlaying} />
          )}
          
          <Text style={styles.description}>
            {guideText.description}
          </Text>
          <Text style={styles.hint}>
            {guideText.hint}
          </Text>
          
          {/* Step 4时在文字框内显示Start按钮 */}
          {currentStep === 4 && (
            <TouchableOpacity style={styles.textCardStartButton} onPress={handleStartGame}>
              <Text style={styles.textCardStartButtonText}>Start</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Next按钮 - 右上角，Step 1-3显示 */}
        {currentStep < 4 && (
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
        )}
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
  nextButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#388E3C',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10001,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  startButton: {
    position: 'absolute',
    backgroundColor: '#e77e2c',
    borderRadius: 22,
    borderWidth: 6,
    borderColor: '#a7591e',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
    zIndex: 10001,
  },
  startButtonText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  textCardStartButton: {
    marginTop: 16,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#388E3C',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    width: '100%',
    alignItems: 'center',
  },
  textCardStartButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});

export default ItemGuide;


