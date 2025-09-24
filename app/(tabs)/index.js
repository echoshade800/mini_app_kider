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
import StorageUtils from '../utils/StorageUtils';
import { STAGE_NAMES } from '../utils/stageNames';

const HERO_URL = 'https://dzdbhsix5ppsc.cloudfront.net/monster/numberkids/maintable.webp';

const { height } = Dimensions.get('window');
const MAX_PANEL_H = Math.floor(height * 0.55); // 半屏左右

// 可调百分比热区（基于图片内按钮的视觉位置）
const HITBOXES = {
  level:    { x: 0.00, y: 0.82, w: 0.45, h: 0.12 }, // 左按钮 - 延伸到屏幕左边缘
  challenge:{ x: 0.55, y: 0.82, w: 0.45, h: 0.12 }  // 右按钮 - 延伸到屏幕右边缘
};

export default function Home() {
  const [latestLevelName, setLatestLevelName] = useState('Baby Steps');
  const [iq, setIq] = useState(0);
  const [showGuide, setShowGuide] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [showLevelsList, setShowLevelsList] = useState(false);
  const [bgSize, setBgSize] = useState({ w: 0, h: 0 });

  // 背景图布局回调
  const onLayoutBG = useCallback(e => {
    const { width, height } = e.nativeEvent.layout;
    console.log('Background image size:', { width, height });
    setBgSize({ w: width, h: height });
  }, []);

  // 计算热区绝对像素位置
  const rect = (r) => {
    const result = {
      left:  Math.round(r.x * bgSize.w),
      top:   Math.round(r.y * bgSize.h),
      width: Math.round(r.w * bgSize.w),
      height:Math.round(r.h * bgSize.h),
    };
    console.log('Hitbox rect:', r, '->', result);
    return result;
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
        onLayout={onLayoutBG}
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

      {/* 透明热区 - 覆盖在背景图按钮上，独立于前景层 */}
      {bgSize.w > 0 && (
        <>
          {/* 左：Level Mode 热区（透明） */}
          <Pressable
            style={[styles.hit, rect(HITBOXES.level)]}
            android_ripple={{ color: 'rgba(255,255,255,0.15)', borderless: false }}
            onPressIn={() => {
              console.log('Level Mode onPressIn triggered');
            }}
            onPress={() => {
              console.log('Level Mode onPress triggered, navigating to:', `/details/${currentLevel}`);
              press(`/details/${currentLevel}`);
            }}
            onPressOut={() => {
              console.log('Level Mode onPressOut triggered');
            }}
            accessibilityRole="button"
            accessibilityLabel="Level Mode"
            hitSlop={12}
          />
          
          {/* 右：Challenge Mode 热区（透明） */}
          <Pressable
            style={[styles.hit, rect(HITBOXES.challenge)]}
            android_ripple={{ color: 'rgba(255,255,255,0.15)', borderless: false }}
            onPressIn={() => {
              console.log('Challenge Mode onPressIn triggered');
            }}
            onPress={() => {
              console.log('Challenge Mode onPress triggered, navigating to:', '/(tabs)/challenge');
              press('/(tabs)/challenge');
            }}
            onPressOut={() => {
              console.log('Challenge Mode onPressOut triggered');
            }}
            accessibilityRole="button"
            accessibilityLabel="Challenge Mode"
            hitSlop={12}
          />
        </>
      )}

      {/* 关卡列表按钮 - 位于闯关模式按钮右下方 */}
      {bgSize.w > 0 && (
        <TouchableOpacity
          style={[styles.levelListButton, {
            left: Math.round(0.45 * bgSize.w) - 25, // 闯关模式按钮右边缘，向左移动25px（10px + 5px + 10px）
            top: Math.round(0.94 * bgSize.h) - 115,  // 闯关模式按钮下方，向上移动115px（10px + 50px + 60px - 5px）
          }]}
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
      )}

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
                <Text style={styles.guideTitle}>🎉 Welcome to Daycare Dash!</Text>
                <Text style={styles.guideContent}>
                  🎯 <Text style={styles.guideBold}>How to Play:</Text> Draw rectangles around numbers that add up to exactly 10 to clear them! You can connect numbers across rows and columns—be strategic and quick!{'\n\n'}
                  
                  🏆 <Text style={styles.guideBold}>Level Mode:</Text> Progress through 200+ named levels from "Baby Steps" to "Beyond Reality". Each level completed earns you +1 SwapMaster item!{'\n\n'}
                  
                  ⚡ <Text style={styles.guideBold}>Challenge Mode:</Text> Race against a 60-second timer on a huge board! Clear as many 10s as possible and beat your best IQ score!{'\n\n'}
                  
                  🛠️ <Text style={styles.guideBold}>Power-ups:</Text>{'\n'}
                  • <Text style={styles.guideBold}>SwapMaster:</Text> Swap any two tiles to create better combinations{'\n'}
                  • <Text style={styles.guideBold}>Split:</Text> Break a tile into two smaller ones (e.g., 7 → 1 + 6){'\n\n'}
                  
                  🎵 <Text style={styles.guideBold}>Settings:</Text> Customize sound effects and haptic feedback in your profile.{'\n\n'}
                  
                  🧠 <Text style={styles.guideBold}>IQ System:</Text> From "Newborn Dreamer" to "Cosmic Genius"—your intelligence grows with every clear!{'\n\n'}
                  
                  Get ready to sharpen your mind and become the ultimate Daycare Dash master! 🧩✨
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
    paddingTop: 20,
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
  // 透明热区样式
  hit: {
    position: 'absolute',
    // 透明点击区；调试时可打开下面这一行看看是否对齐
    // backgroundColor: 'rgba(255,0,0,0.3)', // 临时启用红色背景用于调试
    borderRadius: 28,
    minHeight: 48,
    zIndex: 1000, // 确保热区在最上层
  },
  // 关卡列表按钮样式
  levelListButton: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 1001, // 确保在热区之上
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
});