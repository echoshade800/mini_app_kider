import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  ImageBackground, 
  TouchableOpacity, 
  Modal,
  StyleSheet
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import StorageUtils from '../utils/StorageUtils';
import { STAGE_NAMES } from '../utils/stageNames';

const HERO_URL = 'https://dzdbhsix5ppsc.cloudfront.net/monster/20250917-173743.jpeg';

export default function Home() {
  const [latestLevelName, setLatestLevelName] = useState('Baby Steps');
  const [iq, setIq] = useState(0);
  const [showGuide, setShowGuide] = useState(false);

  const handleChallengePress = () => {
    console.log('🎮 [DEBUG] Challenge button clicked');
    try {
      console.log('🎮 [DEBUG] Current route info:', router);
      console.log('🎮 [DEBUG] Navigating to challenge mode...');
      router.push('/(tabs)/challenge');
      console.log('🎮 [DEBUG] Navigation command executed');
    } catch (error) {
      console.error('🎮 [ERROR] Navigation failed:', error);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const info = await StorageUtils.getData();
        const currentLevel = info?.maxLevel || 1;
        const levelName = currentLevel > 200 
          ? `The Last Horizon+${currentLevel - 200}`
          : STAGE_NAMES[currentLevel] || `Level ${currentLevel}`;
        
        setLatestLevelName(levelName);
        setIq(info?.maxScore || 0);
      } catch (error) {
        console.error('Failed to load game data:', error);
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
          
          <TouchableOpacity
            style={styles.topButton}
            onPress={() => router.push('/(tabs)/profile')}
            accessibilityLabel="设置"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.topButtonText}>⚙</Text>
          </TouchableOpacity>
        </View>

        {/* 中间信息框 */}
        <View style={styles.centerInfoBox}>
          <Text style={styles.centerLevelName}>{latestLevelName}</Text>
          <Text style={styles.centerIqText}>IQ：{iq}</Text>
        </View>

        {/* 底部按钮栏 */}
        <View style={styles.bottomButtonBar}>
          <TouchableOpacity
            style={styles.mainButton}
            onPress={() => router.push('/(tabs)/levels')}
            accessibilityLabel="LEVELS 按钮"
            activeOpacity={0.8}
            pressRetentionOffset={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <Text style={styles.mainButtonText}>LEVELS</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.mainButton, styles.arcadeButton]}
            onPress={handleChallengePress}
            accessibilityLabel="ARCADE 按钮"
            activeOpacity={0.8}
            pressRetentionOffset={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <Text style={styles.mainButtonText}>ARCADE</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 新手引导弹窗 */}
      <Modal 
        visible={showGuide} 
        transparent 
        animationType="fade" 
        onRequestClose={() => setShowGuide(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.guideModal}>
            <Text style={styles.guideTitle}>🎉 Welcome to Daycare Dash!</Text>
            <Text style={styles.guideContent}>
              How to Play: Draw a box around numbers whose total equals 10 to clear them. You can connect numbers across rows and columns—be clever and quick!{'\n\n'}Level Mode: Tackle fun puzzles from easy to tricky, and watch your IQ rise as you conquer each stage.{'\n\n'}Challenge Mode: A huge board and a ticking timer—clear as many 10s as you can and smash your best IQ score!{'\n\n'}Get ready to sharpen your mind and become the ultimate Daycare Dash master! 🧩✨
            </Text>
            <TouchableOpacity 
              style={styles.guideCloseButton}
              onPress={() => setShowGuide(false)}
            >
              <Text style={styles.guideCloseButtonText}>Got it!</Text>
            </TouchableOpacity>
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
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  topButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  topCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 20,
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
  // 中间信息框
  centerInfoBox: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 248, 220, 0.95)',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 30,
    borderWidth: 3,
    borderColor: '#D2691E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 280,
    alignItems: 'center',
  },
  centerLevelName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B4513',
    textAlign: 'center',
    marginBottom: 8,
  },
  centerIqText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#5A3E12',
    textAlign: 'center',
  },
  // 底部按钮栏
  bottomButtonBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 40,
    gap: 20,
  },
  mainButton: {
    minWidth: 140,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FF8C42',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    borderWidth: 3,
    borderColor: '#E67E22',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  arcadeButton: {
    backgroundColor: '#E74C3C',
    borderColor: '#C0392B',
  },
  mainButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  // 弹窗样式
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  guideModal: {
    width: '90%',
    borderRadius: 20,
    backgroundColor: '#FFF8DC',
    borderWidth: 3,
    borderColor: '#D2691E',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
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
}
)