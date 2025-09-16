/**
 * ChalkboardHeader Component - 需求3: 黑板风格关卡名称显示
 * 特点: 褐色木质边框 + 深色板面 + 粉笔字体效果
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function ChalkboardHeader({ level, stageName }) {
  if (!stageName) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.levelText}>Level {level}</Text>
      <View style={styles.chalkboard}>
        <Text style={styles.stageNameText} numberOfLines={1}>
          {stageName}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  levelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  chalkboard: {
    backgroundColor: '#1F2A24', // 深绿黑板色
    borderWidth: 3,
    borderColor: '#7B4D2A', // 褐色木质边框
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    // 模拟黑板纹理
    shadowInset: true,
  },
  stageNameText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F3F3F3', // 粉笔白色
    textAlign: 'center',
    // 粉笔字效果
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
    textShadowColor: 'rgba(255,255,255,0.2)',
    // 如果需要手写字体，可以添加 fontFamily
    // fontFamily: 'Caveat', // 需要先安装字体
  },
});