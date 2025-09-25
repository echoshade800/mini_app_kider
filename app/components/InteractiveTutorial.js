/**
 * InteractiveTutorial - 交互式教程关卡组件
 * 功能：在第一个关卡中实际体验，而不是纯文字说明
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  PanResponder,
} from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function InteractiveTutorial({ 
  visible, 
  onComplete, 
  onNext,
  currentStep = 0 
}) {
  const [tutorialStep, setTutorialStep] = useState(0);
  const [userAction, setUserAction] = useState(null);
  const [showHint, setShowHint] = useState(false);
  
  // 动画值
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const highlightAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;
  
  // 手势响应
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        if (tutorialStep === 0) {
          handleDrawStart(evt);
        }
      },
      onPanResponderMove: (evt) => {
        if (tutorialStep === 0) {
          handleDrawMove(evt);
        }
      },
      onPanResponderRelease: (evt) => {
        if (tutorialStep === 0) {
          handleDrawEnd(evt);
        }
      },
    })
  ).current;

  const tutorialSteps = [
    {
      id: 'draw',
      title: '🎯 Draw Rectangle to Select Numbers',
      description: 'Drag your finger to draw a rectangle, select numbers 3 and 7',
      hint: 'Start from number 3, drag to number 7',
      targetNumbers: [3, 7],
      action: 'draw',
    },
    {
      id: 'calculate',
      title: '🔢 Numbers Add Up to 10',
      description: '3 + 7 = 10, this is the correct combination!',
      hint: 'Look at the selected numbers: 3 + 7 = 10',
      targetNumbers: [3, 7],
      action: 'calculate',
    },
    {
      id: 'success',
      title: '✨ Clear and Earn Points',
      description: 'Complete the combination and earn 10 points!',
      hint: 'Congratulations! You learned the basic gameplay',
      targetNumbers: [3, 7],
      action: 'success',
    },
  ];

  useEffect(() => {
    if (visible) {
      startTutorial();
    }
  }, [visible]);

  useEffect(() => {
    if (tutorialStep < tutorialSteps.length) {
      playStepAnimation(tutorialStep);
    }
  }, [tutorialStep]);

  const startTutorial = () => {
    setTutorialStep(0);
    setUserAction(null);
    setShowHint(false);
    
    // 重置动画
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.9);
    highlightAnim.setValue(0);
    successAnim.setValue(0);
  };

  const playStepAnimation = (stepIndex) => {
    const step = tutorialSteps[stepIndex];
    
    // 淡入动画
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // 高亮目标数字
    if (step.targetNumbers) {
      setTimeout(() => {
        Animated.timing(highlightAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }).start();
      }, 1000);
    }

    // 显示提示
    setTimeout(() => {
      setShowHint(true);
    }, 2000);
  };

  const handleDrawStart = (evt) => {
    // 开始画矩形
    console.log('开始画矩形');
  };

  const handleDrawMove = (evt) => {
    // 拖拽过程中
    console.log('拖拽中');
  };

  const handleDrawEnd = (evt) => {
    // 结束画矩形
    console.log('结束画矩形');
    
    // 检查是否选择了正确的数字
    if (tutorialStep === 0) {
      // 模拟选择了数字3和7
      setUserAction('selected_3_7');
      
      // 延迟进入下一步
      setTimeout(() => {
        nextStep();
      }, 1000);
    }
  };

  const nextStep = () => {
    if (tutorialStep < tutorialSteps.length - 1) {
      setTutorialStep(tutorialStep + 1);
      setShowHint(false);
    } else {
      // 教程完成
      completeTutorial();
    }
  };

  const completeTutorial = () => {
    Animated.timing(successAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start(() => {
      if (onComplete) {
        onComplete();
      }
    });
  };

  const skipTutorial = () => {
    if (onNext) {
      onNext();
    }
  };

  if (!visible) return null;

  const currentStepData = tutorialSteps[tutorialStep];

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* 标题 */}
        <Text style={styles.title}>{currentStepData?.title}</Text>
        
        {/* 描述 */}
        <Text style={styles.description}>{currentStepData?.description}</Text>

        {/* 游戏演示区域 */}
        <View style={styles.demoArea} {...panResponder.panHandlers}>
          {/* 模拟游戏棋盘 */}
          <View style={styles.gameBoard}>
            {/* 数字3 */}
            <Animated.View 
              style={[
                styles.numberTile,
                styles.number3,
                {
                  backgroundColor: highlightAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['#4CAF50', '#FF6B6B'],
                  }),
                  transform: [
                    { scale: highlightAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.1],
                    })},
                  ],
                },
              ]}
            >
              <Text style={styles.numberText}>3</Text>
            </Animated.View>
            
            {/* 数字7 */}
            <Animated.View 
              style={[
                styles.numberTile,
                styles.number7,
                {
                  backgroundColor: highlightAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['#4CAF50', '#FF6B6B'],
                  }),
                  transform: [
                    { scale: highlightAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.1],
                    })},
                  ],
                },
              ]}
            >
              <Text style={styles.numberText}>7</Text>
            </Animated.View>
            
            {/* 其他数字 */}
            <View style={[styles.numberTile, styles.number2]}>
              <Text style={styles.numberText}>2</Text>
            </View>
            <View style={[styles.numberTile, styles.number5]}>
              <Text style={styles.numberText}>5</Text>
            </View>
            <View style={[styles.numberTile, styles.number8]}>
              <Text style={styles.numberText}>8</Text>
            </View>
            <View style={[styles.numberTile, styles.number1]}>
              <Text style={styles.numberText}>1</Text>
            </View>
            
            {/* 选择矩形 */}
            {userAction === 'selected_3_7' && (
              <Animated.View 
                style={[
                  styles.selectionRectangle,
                  {
                    opacity: successAnim,
                    transform: [{ scale: successAnim }],
                  },
                ]}
              />
            )}
            
            {/* 成功效果 */}
            {tutorialStep === 2 && (
              <Animated.View 
                style={[
                  styles.successEffect,
                  {
                    opacity: successAnim,
                    transform: [{ scale: successAnim }],
                  },
                ]}
              >
                <Text style={styles.successText}>✨ +10 Points!</Text>
              </Animated.View>
            )}
          </View>
        </View>

        {/* 提示信息 */}
        {showHint && (
          <Animated.View 
            style={[
              styles.hintContainer,
              {
                opacity: fadeAnim,
              },
            ]}
          >
            <Text style={styles.hintText}>💡 {currentStepData?.hint}</Text>
          </Animated.View>
        )}

        {/* 进度指示器 */}
        <View style={styles.progressContainer}>
          {tutorialSteps.map((_, index) => (
            <View 
              key={index}
              style={[
                styles.progressDot,
                index === tutorialStep && styles.progressDotActive,
                index < tutorialStep && styles.progressDotCompleted,
              ]}
            />
          ))}
        </View>

        {/* 按钮区域 */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.skipButton}
            onPress={skipTutorial}
          >
            <Text style={styles.skipButtonText}>Skip Tutorial</Text>
          </TouchableOpacity>
          
          {tutorialStep < tutorialSteps.length - 1 ? (
            <TouchableOpacity 
              style={styles.nextButton}
              onPress={nextStep}
            >
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.completeButton}
              onPress={completeTutorial}
            >
              <Text style={styles.completeButtonText}>Start Playing!</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: '#FFF8DC',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    maxWidth: '90%',
    borderWidth: 3,
    borderColor: '#D2691E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8B4513',
    textAlign: 'center',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: '#8B4513',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  demoArea: {
    width: 250,
    height: 250,
    marginBottom: 20,
  },
  gameBoard: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F0F0F0',
    borderRadius: 10,
    position: 'relative',
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 15,
  },
  numberTile: {
    width: 60,
    height: 60,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 8,
    borderWidth: 2,
    borderColor: '#45A049',
  },
  numberText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  number3: {
    position: 'absolute',
    top: 15,
    left: 15,
  },
  number7: {
    position: 'absolute',
    top: 15,
    right: 15,
  },
  number2: {
    position: 'absolute',
    top: 90,
    left: 15,
  },
  number5: {
    position: 'absolute',
    top: 90,
    right: 15,
  },
  number8: {
    position: 'absolute',
    bottom: 15,
    left: 15,
  },
  number1: {
    position: 'absolute',
    bottom: 15,
    right: 15,
  },
  selectionRectangle: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    height: 70,
    borderWidth: 3,
    borderColor: '#FF6B6B',
    borderRadius: 8,
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
  },
  successEffect: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -40 }, { translateY: -20 }],
    backgroundColor: '#FFD700',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#FFA500',
  },
  successText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  hintContainer: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 15,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  hintText: {
    fontSize: 16,
    color: '#1976D2',
    textAlign: 'center',
    fontWeight: '600',
  },
  progressContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#DDD',
    marginHorizontal: 6,
  },
  progressDotActive: {
    backgroundColor: '#4CAF50',
  },
  progressDotCompleted: {
    backgroundColor: '#8BC34A',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  skipButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
  },
  skipButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: '#2196F3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  completeButton: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: '#4CAF50',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
