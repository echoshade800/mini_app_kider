/**
 * Button Guide Component - Step-by-step button introduction
 * Purpose: Guide new users to understand Level Mode and Challenge Mode buttons
 * Features: Spotlight effect, step-by-step guide, state persistence
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Modal,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const ButtonGuide = ({ visible, onClose, levelButtonPosition, challengeButtonPosition, levelListButtonPosition }) => {
  const [currentStep, setCurrentStep] = useState(1); // 1: Level Mode, 2: Challenge Mode, 3: Level List
  const [fadeAnim] = useState(new Animated.Value(0));
  const [spotlightAnim] = useState(new Animated.Value(1));

  // 按钮位置信息（使用传入的位置或默认值）
  const getButtonPosition = (step) => {
    // 默认位置（基于已知的按钮布局）
    const defaultLevelButton = {
      x: SCREEN_WIDTH / 2 - 149.5, // 按钮宽度的一半
      y: SCREEN_HEIGHT / 2 - 80 - 77 - 14, // 居中位置减去按钮高度和间距
      width: 299,
      height: 77,
    };

    const defaultChallengeButton = {
      x: SCREEN_WIDTH / 2 - 149.5,
      y: SCREEN_HEIGHT / 2 - 80, // 居中位置减去按钮高度的一半
      width: 299,
      height: 77,
    };

    const defaultLevelListButton = {
      x: SCREEN_WIDTH / 2 - 149.5,
      y: SCREEN_HEIGHT / 2 + 120, // Level按钮位置
      width: 299,
      height: 77,
    };

    if (step === 1) {
      return levelButtonPosition || defaultLevelButton;
    } else if (step === 2) {
      return challengeButtonPosition || defaultChallengeButton;
    } else {
      return levelListButtonPosition || defaultLevelListButton;
    }
  };

  React.useEffect(() => {
    if (visible) {
      // 淡入动画
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Spotlight 脉冲动画
      Animated.loop(
        Animated.sequence([
          Animated.timing(spotlightAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(spotlightAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      fadeAnim.setValue(0);
      spotlightAnim.setValue(1);
    }
  }, [visible]);

  const handleGotIt = () => {
    if (currentStep === 1) {
      // 进入第二步：挑战模式
      setCurrentStep(2);
    } else if (currentStep === 2) {
      // 进入第三步：关卡列表
      setCurrentStep(3);
    } else {
      // 引导结束，重置步骤
      setCurrentStep(1);
      onClose();
    }
  };

  // 当 visible 变为 false 时，重置步骤
  React.useEffect(() => {
    if (!visible) {
      setCurrentStep(1);
    }
  }, [visible]);

  if (!visible) return null;

  const buttonPos = getButtonPosition(currentStep);
  
  // 如果位置还未准备好，不显示引导
  if (!buttonPos || !buttonPos.x || !buttonPos.y) {
    return null;
  }

  // 计算文字卡片位置，确保不与按钮和"Got it"按钮重合
  // "Got it"按钮在底部60px处，高度约50px，文字卡片高度约200px
  // 所以文字卡片底部应该在距离屏幕底部至少120px以上（60 + 50 + 10间距）
  const gotItButtonTop = SCREEN_HEIGHT - 60 - 50; // Got it按钮的顶部位置
  const textCardHeight = 200; // 文字卡片预估高度
  const minTop = gotItButtonTop - textCardHeight - 20; // 最小top值，确保有20px间距
  
  // 根据步骤计算文字卡片top值
  let textCardTop;
  if (currentStep === 1) {
    // Level Mode按钮下方，但确保不与Got it按钮重合
    textCardTop = Math.min(buttonPos.y + 180, minTop);
  } else if (currentStep === 2) {
    // Challenge Mode按钮下方，但确保不与Got it按钮重合
    textCardTop = Math.min(buttonPos.y + 110, minTop);
  } else {
    // Level List按钮：优先放在按钮上方，但如果按钮位置太低，则放在按钮下方
    const textCardTopAbove = buttonPos.y - textCardHeight - 20; // 文字框在按钮上方，底部距离按钮顶部20px
    const textCardTopBelow = buttonPos.y + buttonPos.height + 20; // 文字框在按钮下方，顶部距离按钮底部20px
    
    // 如果放在按钮上方会导致文字框顶部超出屏幕，或者与Got it按钮重叠，则放在按钮下方
    if (textCardTopAbove < 0 || textCardTopAbove + textCardHeight > minTop) {
      textCardTop = Math.min(textCardTopBelow, minTop); // 放在按钮下方，但确保不与Got it按钮重合
    } else {
      textCardTop = textCardTopAbove; // 放在按钮上方
    }
  }

  const guideText = currentStep === 1
    ? {
        title: 'Level Mode',
        description: 'Progress through 200+ educational stages from "Baby Steps" to "Beyond Reality". Complete each level to earn SwapMaster items!',
      }
    : currentStep === 2
    ? {
        title: 'Challenge Mode',
        description: 'Race against a 60-second timer on a huge board! Clear as many 10s as possible and beat your best IQ score!',
      }
    : {
        title: 'Level List',
        description: 'Browse and select any level you want to play. Jump to any stage and challenge yourself!',
      };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        style={[
          styles.container,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        {/* 分区域遮罩层 - 实现镂空效果，让按钮显示原本颜色 */}
        {/* 顶部遮罩 */}
        <View
          style={[
            styles.maskSection,
            {
              top: 0,
              left: 0,
              right: 0,
              height: buttonPos.y - 10, // 到按钮上方10px
            },
          ]}
        />
        
        {/* 左侧遮罩 */}
        <View
          style={[
            styles.maskSection,
            {
              top: buttonPos.y - 10,
              left: 0,
              width: buttonPos.x - 10, // 到按钮左侧10px
              height: buttonPos.height + 20,
            },
          ]}
        />
        
        {/* 右侧遮罩 */}
        <View
          style={[
            styles.maskSection,
            {
              top: buttonPos.y - 10,
              left: buttonPos.x + buttonPos.width + 10,
              right: 0,
              height: buttonPos.height + 20,
            },
          ]}
        />
        
        {/* 底部遮罩 */}
        <View
          style={[
            styles.maskSection,
            {
              top: buttonPos.y + buttonPos.height + 10,
              left: 0,
              right: 0,
              bottom: 0,
            },
          ]}
        />

        {/* Spotlight 高亮效果 - 按钮周围的边框和光晕 */}
        <Animated.View
          style={[
            styles.spotlightContainer,
            {
              left: buttonPos.x - 10,
              top: buttonPos.y - 10,
              width: buttonPos.width + 20,
              height: buttonPos.height + 20,
              transform: [{ scale: spotlightAnim }],
            },
          ]}
        >
          {/* 光晕边框 */}
          <View style={styles.spotlightGlow} />
          {/* 内层边框 */}
          <View style={styles.spotlightBorder} />
        </Animated.View>

        {/* 文字说明卡片 */}
        <View
          style={[
            styles.textCard,
            {
              top: textCardTop,
              left: SCREEN_WIDTH / 2 - 150, // 居中
            },
          ]}
        >
          {/* 箭头指向按钮（根据步骤调整方向） */}
          <View style={styles.arrowContainer}>
            {currentStep === 3 ? (
              // Level List：如果文字框在按钮上方，箭头向下；如果在下方，箭头向上
              textCardTop < buttonPos.y ? (
                <View style={styles.arrowDown} />
              ) : (
                <View style={styles.arrowUp} />
              )
            ) : (
              <View style={styles.arrowUp} />
            )}
          </View>
          
          <Text style={styles.title}>{guideText.title}</Text>
          <Text style={styles.description}>{guideText.description}</Text>
        </View>

        {/* Got it 按钮 */}
        <TouchableOpacity
          style={styles.gotItButton}
          onPress={handleGotIt}
          activeOpacity={0.8}
        >
          <Text style={styles.gotItButtonText}>Got it</Text>
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
  maskSection: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  spotlightContainer: {
    position: 'absolute',
    borderRadius: 28, // 按钮圆角22 + 小边距
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10001,
  },
  spotlightGlow: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 28, // 与容器一致
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 25,
    elevation: 15,
  },
  spotlightBorder: {
    position: 'absolute',
    width: '90%',
    height: '90%',
    borderRadius: 26, // 稍微小一点的内层圆角
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  textCard: {
    position: 'absolute',
    width: 300,
    backgroundColor: '#FFF8DC',
    borderRadius: 16,
    padding: 20,
    borderWidth: 3,
    borderColor: '#D2691E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    textAlign: 'center',
  },
  arrowContainer: {
    alignItems: 'center',
    marginTop: 0, // 箭头在顶部
    marginBottom: 12, // 箭头和文字之间的间距
  },
  arrowUp: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 15, // 改为底部边框，箭头向上
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#8B4513',
  },
  arrowDown: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 15, // 顶部边框，箭头向下
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#8B4513',
  },
  gotItButton: {
    position: 'absolute',
    bottom: 60,
    alignSelf: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  gotItButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default ButtonGuide;

