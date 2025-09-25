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
  Pressable
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGameStore } from '../store/gameStore';

const HERO_URL = 'https://dzdbhsix5ppsc.cloudfront.net/monster/numberkids/maintable.webp';

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

  // 检测首次启动
  useEffect(() => {
    if (gameData && !gameData.hasSeenSimpleRules) {
      setShowSimpleRules(true);
    }
  }, [gameData]);

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
        const level = info?.maxLevel || 1;
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

  return (
    <SafeAreaView style={styles.container}>
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
        {/* Level Mode 按钮 - 红色 */}
        <TouchableOpacity
          style={styles.levelModeButton}
          onPress={() => {
            console.log('Level Mode button pressed, navigating to:', `/details/${currentLevel}`);
            press(`/details/${currentLevel}`);
          }}
          accessibilityRole="button"
          accessibilityLabel="Level Mode"
        >
          <Text style={styles.gameModeButtonText}>Level Mode</Text>
        </TouchableOpacity>
        
        {/* Challenge Mode 按钮 - 蓝色 */}
        <TouchableOpacity
          style={styles.challengeModeButton}
          onPress={() => {
            console.log('Challenge Mode button pressed, navigating to:', '/(tabs)/challenge');
            press('/(tabs)/challenge');
          }}
          accessibilityRole="button"
          accessibilityLabel="Challenge Mode"
        >
          <Text style={styles.gameModeButtonText}>Challenge Mode</Text>
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
              {Array.from({ length: currentLevel }, (_, i) => i + 1).map((level) => (
                <TouchableOpacity
                  key={level}
                  style={styles.levelButton}
                  onPress={() => {
                    setShowLevelsList(false);
                    router.push(`/details/${level}`);
                  }}
                >
                  <Text style={styles.levelButtonText}>{level}</Text>
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
    borderRadius: 22,
    backgroundColor: 'rgba(139, 195, 74, 0.9)', // 柔和的绿色背景
    borderWidth: 2,
    borderColor: '#8BC34A', // 绿色边框
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  topButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32', // 深绿色文字，与绿色背景协调
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
    bottom: 100,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 1000,
  },
  // Level Mode 按钮 - 红色
  levelModeButton: {
    flex: 1,
    backgroundColor: '#FF4444',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  // Challenge Mode 按钮 - 蓝色
  challengeModeButton: {
    flex: 1,
    backgroundColor: '#4444FF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginLeft: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  // 游戏模式按钮文字
  gameModeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // 关卡列表按钮样式
  levelListButton: {
    position: 'absolute',
    width: 50,
    height: 50,
    bottom: 20,
    right: 20,
    borderRadius: 25,
    backgroundColor: 'rgba(139, 195, 74, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  // 汉堡菜单图标样式
  hamburgerIcon: {
    width: 20,
    height: 16,
    justifyContent: 'space-between',
  },
  // 汉堡菜单线条样式
  hamburgerLine: {
    width: 20,
    height: 3,
    backgroundColor: '#2E7D32', // 深绿色
    borderRadius: 1.5,
  },
  // 弹窗样式
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
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
  // 简约规则弹窗样式
  simpleRulesModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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