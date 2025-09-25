import React from 'react';
import {
  View,
  Text,
  ImageBackground,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const OnboardingGuide = ({ visible, onClose }) => {
  if (!visible) return null;

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground
        source={{ uri: 'https://dzdbhsix5ppsc.cloudfront.net/monster/numberkids/one.webp' }}
        style={styles.backgroundImage}
        resizeMode="contain" // 改为contain以保持图片比例
      >
        {/* 图片缩放容器 */}
        <View style={styles.imageContainer}>
          {/* 返回按钮 */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={onClose}
            accessibilityLabel="返回主页面"
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
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
    top: 50,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    // 立体感效果
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    // 边框效果
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
});

export default OnboardingGuide;
