import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  ImageBackground, 
  TouchableOpacity, 
  Modal,
  StyleSheet,
  ScrollView,
  Dimensions,
  Platform,
  Pressable,
  SafeAreaView
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import OnboardingGuide from '../components/OnboardingGuide';
import { useGameStore } from '../store/gameStore';
import { STAGE_NAMES } from '../utils/stageNames';

const HERO_URL = 'https://dzdbhsix5ppsc.cloudfront.net/monster/numberkids/maintabletabl1end.webp';

const { height } = Dimensions.get('window');
const MAX_PANEL_H = Math.floor(height * 0.55); // 半屏左右

export default function Home() {
  const { gameData, markSimpleRulesSeen } = useGameStore();
  const [latestLevelName, setLatestLevelName] = useState('Baby Steps');
  const [iq, setIq] = useState(0);
  const [showGuide, setShowGuide] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [showLevelsList, setShowLevelsList] = useState(false);
  const [showSimpleRules, setShowSimpleRules] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // 文字自动适配功能
  const [buttonFontSizes, setButtonFontSizes] = useState({ level: 28, challenge: 28 });
  
  // 计算文字大小以适应按钮宽度
  const calculateFontSize = (text, maxWidth) => {
    const minFontSize = 20;
    const maxFontSize = 32;
    const step = 1;
    
    // 估算文字宽度（粗略计算）
    const estimatedWidth = text.length * 16; // 每个字符约16px宽度（28px字体）
    
    if (estimatedWidth <= maxWidth) {
      return Math.min(maxFontSize, 28);
    }
    
    // 如果文字太长，按比例缩小
    const ratio = maxWidth / estimatedWidth;
    const calculatedSize = Math.floor(28 * ratio);
    
    return Math.max(minFontSize, Math.min(maxFontSize, calculatedSize));
  };
  
  // 更新按钮文字大小
  useEffect(() => {
    const levelFontSize = calculateFontSize('Level', 260); // 299 - 39 (padding + border)
    const challengeFontSize = calculateFontSize('Challenge', 260);
    
    setButtonFontSizes({
      level: levelFontSize,
      challenge: challengeFontSize
    });
  }, []);

  // 处理简约规则弹窗关闭
  const handleSimpleRulesClose = async () => {
    setShowSimpleRules(false);
    await markSimpleRulesSeen();
  };


  // 热区点击处理
  const press = async (to) => {
    console.log('Press function called with:', to);
    try { 
      await Haptics.selectionAsync(); 
    } catch (e) {
      console.log('Haptics error:', e);
    }
    try {
      router.push(to);
      console.log('Navigation successful to:', to);
    } catch (e) {
      console.log('Navigation error:', e);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const info = await StorageUtils.getData();
        // 使用lastPlayedLevel而不是maxLevel，从上次停止的关卡开始
        const level = info?.lastPlayedLevel || 1;
        setCurrentLevel(level);
        const levelName = level > 200 
          ? `The Last Horizon+${level - 200}`
          : STAGE_NAMES[level] || `Level ${level}`;
        
        setLatestLevelName(levelName);
        setIq(info?.maxScore || 0);
      } catch (error) {
        // 静默处理错误
      }
    })();
  }, []);

  // 检测首次启动，显示简约规则弹窗
  useEffect(() => {
    if (gameData && !gameData.hasSeenSimpleRules) {
      setShowSimpleRules(true);
    }
  }, [gameData]);

  // 检查是否需要显示新手引导
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const data = await StorageUtils.getData();
        if (!data?.hasSeenOnboarding) {
          setShowOnboarding(true);
        }
      } catch (error) {
        console.log('Error checking onboarding status:', error);
        // 如果出错，默认显示新手引导
        setShowOnboarding(true);
      }
    };
    
    checkOnboardingStatus();
  }, []);

  // 处理新手引导关闭
  const handleOnboardingClose = async () => {
    setShowOnboarding(false);
    try {
      await StorageUtils.setData({ hasSeenOnboarding: true });
    } catch (error) {
      console.log('Error saving onboarding status:', error);
    }
  };

  // 监听gameData变化，更新页面顶部的进度和IQ显示
  useEffect(() => {
    if (gameData) {
      // 更新当前关卡
      const level = gameData.lastPlayedLevel || 1;
      setCurrentLevel(level);
      
      // 更新关卡名称
      const levelName = level > 200 
        ? `The Last Horizon+${level - 200}`
        : STAGE_NAMES[level] || `Level ${level}`;
      setLatestLevelName(levelName);
      
      // 更新IQ分数
      setIq(gameData.maxScore || 0);
    }
  }, [gameData]);


  return (
    <SafeAreaView style={styles.container}>
      {/* 新手引导界面 */}
      <OnboardingGuide 
        visible={showOnboarding} 
        onClose={handleOnboardingClose} 
      />
      
      {/* 背景层 - 禁用指针事件 */}
      <ImageBackground
        source={{ uri: HERO_URL }}
        style={styles.backgroundImage}
        imageStyle={styles.backgroundImageStyle}
        pointerEvents="none"
      />
      
      {/* 前景层容器 - 所有交互元素 */}
      <View style={styles.foregroundContainer} pointerEvents="auto">
        
        {/* 顶部栏 */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.topButton}
            onPress={() => setShowGuide(true)}
            accessibilityLabel="新手引导"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.topButtonText}>I</Text>
          </TouchableOpacity>
          
          <View style={styles.topCenter}>
            <Text style={styles.levelName}>{latestLevelName}</Text>
            <Text style={styles.iqText}>IQ：{iq}</Text>
          </View>
          
          <View style={styles.topRightButtons}>
            <TouchableOpacity
              style={styles.topButton}
              onPress={() => router.push('/(tabs)/profile')}
              accessibilityLabel="设置"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.topButtonText}>⚙</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 游戏模式按钮 */}
      <View style={styles.gameModeButtons}>
        {/* Level Mode 按钮 - 固定尺寸 */}
        <TouchableOpacity
          style={styles.duckBtn}
          onPress={async () => {
            // 确保从正确的进度开始：优先使用gameData，然后使用currentLevel作为fallback
            let startLevel = gameData?.lastPlayedLevel;
            
            // 如果gameData中没有lastPlayedLevel，尝试从本地存储获取
            if (!startLevel) {
              try {
                const info = await StorageUtils.getData();
                startLevel = info?.lastPlayedLevel || currentLevel || 1;
              } catch (error) {
                console.log('Error getting data from storage:', error);
                startLevel = currentLevel || 1;
              }
            }
            
            console.log('Level Mode button pressed, navigating to:', `/details/${startLevel}`);
            console.log('Game data:', gameData);
            console.log('Current level state:', currentLevel);
            console.log('Start level:', startLevel);
            press(`/details/${startLevel}`);
          }}
          accessibilityRole="button"
          accessibilityLabel="Level Mode"
        >
          <Text style={[styles.duckBtnLabel, { fontSize: buttonFontSizes.level }]}>Level</Text>
        </TouchableOpacity>
        
        {/* Challenge Mode 按钮 - 固定尺寸 */}
        <TouchableOpacity
          style={styles.duckBtnChallenge}
          onPress={() => {
            console.log('Challenge Mode button pressed, navigating to:', '/(tabs)/challenge');
            press('/(tabs)/challenge');
          }}
          accessibilityRole="button"
          accessibilityLabel="Challenge Mode"
        >
          <Text style={[styles.duckBtnLabel, { fontSize: buttonFontSizes.challenge }]}>Challenge</Text>
        </TouchableOpacity>
      </View>

      {/* 关卡列表按钮 */}
      <TouchableOpacity
        style={styles.levelListButton}
        onPress={() => setShowLevelsList(true)}
        accessibilityLabel="关卡列表"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <View style={styles.hamburgerIcon}>
          <View style={styles.hamburgerLine} />
          <View style={styles.hamburgerLine} />
          <View style={styles.hamburgerLine} />
        </View>
      </TouchableOpacity>

      <Modal
        visible={showGuide}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowGuide(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.guidePanel}>
            <View style={[styles.guideModal, { maxHeight: MAX_PANEL_H }]}>
              <ScrollView
                style={styles.guideScroll}
                contentContainerStyle={styles.guideScrollContent}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
              >
                <Text style={styles.guideTitle}>🎉 Welcome to KiderCrash!</Text>
                <Text style={styles.guideContent}>
                  🎯 <Text style={styles.guideBold}>How to Play:</Text> Draw rectangles around numbers that add up to exactly 10 to clear them! You can connect numbers across rows and columns—be strategic and quick!{'\n\n'}
                  
                  🏆 <Text style={styles.guideBold}>Level Mode:</Text> Progress through 200+ named levels from "Baby Steps" to "Beyond Reality". Each level completed earns you +1 SwapMaster item!{'\n\n'}
                  
                  ⚡ <Text style={styles.guideBold}>Challenge Mode:</Text> Race against a 60-second timer on a huge board! Clear as many 10s as possible and beat your best IQ score!{'\n\n'}
                  
                  🛠️ <Text style={styles.guideBold}>Power-ups:</Text>{'\n'}
                  • <Text style={styles.guideBold}>SwapMaster:</Text> Swap any two tiles to create better combinations{'\n'}
                  • <Text style={styles.guideBold}>Split:</Text> Break a tile into 3-4 smaller ones (e.g., 7 → 2+3+2){'\n\n'}
                  
                  📚 <Text style={styles.guideBold}>Multi-page Levels:</Text> Higher levels (80+) require clearing multiple boards to complete. Each page cleared brings you closer to victory!{'\n\n'}
                  
                  🎵 <Text style={styles.guideBold}>Settings:</Text> Customize sound effects and haptic feedback in your profile.{'\n\n'}
                  
                  🧠 <Text style={styles.guideBold}>IQ System:</Text> From "Newborn Dreamer" to "Cosmic Genius"—your intelligence grows with every clear!{'\n\n'}
                  
                  Get ready to sharpen your mind and become the ultimate KiderCrash master! 🧩✨
                </Text>
                <TouchableOpacity 
                  style={styles.guideCloseButton}
                  onPress={() => setShowGuide(false)}
                >
                  <Text style={styles.guideCloseButtonText}>Got it!</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      {/* 关卡列表面板 */}
      <Modal
        visible={showLevelsList}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLevelsList(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.levelsModal}>
            {/* 关闭按钮 - 左上角 */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowLevelsList(false)}
              accessibilityLabel="关闭关卡列表"
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            
            <Text style={styles.levelsTitle}>关卡列表</Text>
            
            {/* 可滚动的关卡网格 */}
            <ScrollView 
              style={styles.levelsScrollContainer}
              contentContainerStyle={styles.levelsGrid}
              showsVerticalScrollIndicator={true}
            >
              {Array.from({ length: Math.max(gameData?.maxLevel + 1 || 2, 2) }, (_, i) => i + 1).map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.levelButton,
                    level === currentLevel && styles.currentLevelButton,
                    level > (gameData?.maxLevel || 1) && styles.lockedLevelButton
                  ]}
                  onPress={() => {
                    // 只能点击已解锁的关卡
                    if (level <= (gameData?.maxLevel || 1) + 1) {
                      setShowLevelsList(false);
                      router.push(`/details/${level}`);
                    }
                  }}
                  disabled={level > (gameData?.maxLevel || 1) + 1}
                >
                  <Text style={[
                    styles.levelButtonText,
                    level === currentLevel && styles.currentLevelButtonText,
                    level > (gameData?.maxLevel || 1) && styles.lockedLevelButtonText
                  ]}>
                    {level}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 简约规则介绍弹窗 */}
      <Modal
        visible={showSimpleRules}
        transparent={true}
        animationType="fade"
        onRequestClose={handleSimpleRulesClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.simpleRulesModal}>
            <View style={styles.simpleRulesContent}>
              <Text style={styles.simpleRulesTitle}>🎉 Welcome to KiderCrash!</Text>
              
              <View style={styles.simpleRulesText}>
                <Text style={styles.simpleRulesItem}>🎯 Draw rectangles around numbers that add up to 10</Text>
                <Text style={styles.simpleRulesItem}>🏆 Complete levels to earn SwapMaster & Split items</Text>
                <Text style={styles.simpleRulesItem}>⚡ Challenge mode tests your speed and IQ</Text>
                <Text style={styles.simpleRulesItem}>🧠 Your intelligence grows with every clear!</Text>
              </View>
              
              <TouchableOpacity
                style={styles.simpleRulesButton}
                onPress={handleSimpleRulesClose}
              >
                <Text style={styles.simpleRulesButtonText}>Let's Play!</Text>
              </TouchableOpacity>
              
              <Text style={styles.simpleRulesNote}>
                💡 For detailed rules, tap the "I" icon on the main page
              </Text>
            </View>
          </View>
        </View>
      </Modal>


    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // 背景层样式
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  backgroundImageStyle: {
    resizeMode: 'cover',
  },
  // 前景层容器
  foregroundContainer: {
    flex: 1,
    justifyContent: 'space-between',
    zIndex: 1,
  },
  // 顶部栏
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 10,
  },
  topButton: {
    width: 44,
    height: 44,
    borderRadius: 8, // 圆角正方形，圆角半径为8
    backgroundColor: 'rgba(255, 193, 7, 0.9)', // 柔和的黄色背景
    borderWidth: 2,
    borderColor: '#FFC107', // 黄色边框
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  topButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E65100', // 深橙色文字，与黄色背景协调
  },
  topCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 20,
  },
  topRightButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  levelName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  iqText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  // 游戏模式按钮容器
  gameModeButtons: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: [{ translateX: -149.5 }, { translateY: -80 }], // 居中：-width/2, -height/2
    flexDirection: 'column',
    justifyContent: 'space-between',
    height: 160, // 两个按钮的高度加上间距
    zIndex: 1000,
  },
  // 新按钮样式 - 固定尺寸 + 立体感
  duckBtn: {
    width: 299, // 230 * 1.3 = 299px
    height: 77,  // 59 * 1.3 = 76.7，调整为77px
    borderRadius: 22, // 17 * 1.3 = 22.1，调整为22px
    paddingHorizontal: 18, // 14 * 1.3 = 18.2，调整为18px
    paddingVertical: 0,
    alignItems: 'center',
    justifyContent: 'center',
    // Level Mode 主题色 - 胡萝卜橙
    backgroundColor: '#e77e2c',
    borderWidth: 6, // 增加边框厚度
    borderColor: '#a7591e', // 深橙木边框
    // 增强立体感阴影
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 }, // 增加阴影偏移
    shadowOpacity: 0.25, // 增加阴影透明度
    shadowRadius: 12, // 增加阴影半径
    elevation: 12, // 增加Android阴影
    shadowRadius: 0,
    elevation: 8,
    // 环境阴影
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 9 }, // 7 * 1.3 = 9.1，调整为9px
    shadowOpacity: 0.18,
    shadowRadius: 17, // 13 * 1.3 = 16.9，调整为17px
    elevation: 8,
    marginBottom: 14, // 11 * 1.3 = 14.3，调整为14px
  },
  duckBtnChallenge: {
    width: 299, // 230 * 1.3 = 299px
    height: 77,  // 59 * 1.3 = 76.7，调整为77px
    borderRadius: 22, // 17 * 1.3 = 22.1，调整为22px
    paddingHorizontal: 18, // 14 * 1.3 = 18.2，调整为18px
    paddingVertical: 0,
    alignItems: 'center',
    justifyContent: 'center',
    // Challenge Mode 主题色 - 湖蓝
    backgroundColor: '#3c7bc1',
    borderWidth: 6, // 增加边框厚度
    borderColor: '#29598a', // 深蓝木边框
    // 增强立体感阴影
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 }, // 增加阴影偏移
    shadowOpacity: 0.25, // 增加阴影透明度
    shadowRadius: 12, // 增加阴影半径
    elevation: 12, // 增加Android阴影
    shadowRadius: 0,
    elevation: 8,
    // 环境阴影
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 9 }, // 7 * 1.3 = 9.1，调整为9px
    shadowOpacity: 0.18,
    shadowRadius: 17, // 13 * 1.3 = 16.9，调整为17px
    elevation: 8,
    marginBottom: 0, // 最后一个按钮不需要下边距
  },
  // 按钮文字样式 - 立体感 + 自动适配
  duckBtnLabel: {
    color: '#fff',
    fontSize: 26, // 20 * 1.3 = 26px
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.5, // 0.4 * 1.3 = 0.52，调整为0.5
    // 立体文字效果 - React Native只支持单个textShadow
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 }, // 保持1px
    textShadowRadius: 0,
    // 确保文字不换行
    numberOfLines: 1,
    ellipsizeMode: 'clip',
  },
  // 关卡列表按钮样式 - 木质纹理边框 + 浅米黄色
  levelListButton: {
    position: 'absolute',
    width: 42, // 32 * 1.3 = 41.6，调整为42px
    height: 42, // 32 * 1.3 = 41.6，调整为42px
    left: '50%',
    top: '50%',
    transform: [{ translateX: -21 }, { translateY: 100 }, { scale: 1.3 }], // 居中并放在主按钮下方
    borderRadius: 9, // 7 * 1.3 = 9.1，调整为9px
    backgroundColor: '#F7E4B3', // 浅米黄色
    alignItems: 'center',
    justifyContent: 'center',
    // 木质纹理边框 - 增强版
    borderWidth: 6, // 增加边框厚度
    borderColor: '#A0522D', // 深棕色木质纹理
    // 多层阴影增强立体感
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 4 }, // 增加阴影偏移
    shadowOpacity: 0.4, // 增加阴影透明度
    shadowRadius: 8, // 增加阴影半径
    elevation: 10, // 增加Android阴影
    // 整体投影
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 }, // 3 * 1.3 = 3.9，调整为4px
    shadowOpacity: 0.3,
    shadowRadius: 8, // 6 * 1.3 = 7.8，调整为8px
    elevation: 8,
    zIndex: 1000,
  },
  // 汉堡菜单图标样式 - 调整大小以适应按钮缩放
  hamburgerIcon: {
    width: 23, // 18 * 1.3 = 23.4，调整为23px
    height: 20, // 15 * 1.3 = 19.5，调整为20px
    justifyContent: 'space-between',
  },
  // 汉堡菜单线条样式 - 深棕色，调整大小以适应按钮缩放
  hamburgerLine: {
    width: 23, // 18 * 1.3 = 23.4，调整为23px
    height: 4, // 3 * 1.3 = 3.9，调整为4px
    backgroundColor: '#5B3A29', // 深棕色线条
    borderRadius: 1, // 保持1px
  },
  // 弹窗样式
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // 降低透明度，从0.6改为0.3
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  guidePanel: {
    flex: 1,
    justifyContent: 'center', // 居中展示半屏卡片
    paddingHorizontal: 18,
  },
  guideModal: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: '#FFF8DC',
    borderWidth: 3,
    borderColor: '#D2691E',
    paddingVertical: 12,
    // web 兜底：确保可滚
    ...(Platform.OS === 'web' ? { overflowY: 'auto' } : null),
    // 轻微阴影
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  guideTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#8B4513',
    textAlign: 'center',
  },
  guideContent: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
    marginBottom: 20,
  },
  guideBold: {
    fontWeight: 'bold',
    color: '#8B4513',
  },
  guideScroll: {
    flexGrow: 0, // 交给 maxHeight 控制高度
  },
  guideScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20, // 避免尾部被圆角裁切
  },
  guideCloseButton: {
    alignSelf: 'flex-end',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#FF8C42',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E67E22',
    minWidth: 80,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  guideCloseButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  // 关卡列表样式
  levelsModal: {
    width: '90%',
    height: '70%',
    borderRadius: 20,
    backgroundColor: '#FFF8DC',
    borderWidth: 3,
    borderColor: '#D2691E',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    left: 15,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  levelsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#8B4513',
    textAlign: 'center',
    marginTop: 10,
  },
  levelsScrollContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  levelsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    paddingBottom: 20,
  },
  levelButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FF8C42',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E67E22',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  levelButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // 当前关卡按钮样式
  currentLevelButton: {
    backgroundColor: '#FF9800', // 橙色突出显示当前关卡
    borderWidth: 3,
    borderColor: '#FF5722',
  },
  // 锁定关卡按钮样式
  lockedLevelButton: {
    backgroundColor: '#9E9E9E', // 灰色表示锁定
    opacity: 0.6,
  },
  // 当前关卡文字样式
  currentLevelButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // 锁定关卡文字样式
  lockedLevelButtonText: {
    color: '#BDBDBD',
    fontSize: 14,
    fontWeight: 'normal',
  },
  // 简约规则弹窗样式
  simpleRulesModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // 移除重复的黑色背景，让modalOverlay处理遮罩
  },
  simpleRulesContent: {
    backgroundColor: '#FFF8DC',
    borderRadius: 20,
    padding: 30,
    margin: 20,
    borderWidth: 3,
    borderColor: '#D2691E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
    alignItems: 'center',
    maxWidth: '90%',
  },
  simpleRulesTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8B4513',
    textAlign: 'center',
    marginBottom: 20,
  },
  simpleRulesText: {
    marginBottom: 25,
  },
  simpleRulesItem: {
    fontSize: 16,
    color: '#8B4513',
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 22,
  },
  simpleRulesButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  simpleRulesButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  simpleRulesNote: {
    fontSize: 14,
    color: '#8B4513',
    textAlign: 'center',
    fontStyle: 'italic',
    opacity: 0.8,
  },
});