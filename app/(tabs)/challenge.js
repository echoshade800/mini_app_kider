/**
 * Challenge Mode Screen - 60-second IQ sprint with enhanced layout
 * Purpose: Timed gameplay with IQ scoring and centered board layout
 * Features: Fixed tile sizes, centered board, chalkboard header, countdown timer
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  Alert,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GameBoard } from '../components/GameBoard';
import { ChalkboardHeader } from '../components/ChalkboardHeader';
import { useGameStore } from '../store/gameStore';
import { generateBoard } from '../utils/boardGenerator';

const { width: screenWidth } = Dimensions.get('window');

export default function ChallengeScreen() {
  const { gameData, updateGameData } = useGameStore();
  const [board, setBoard] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [score, setScore] = useState(0);
  const [clearedCount, setClearedCount] = useState(0);
  
  const timerRef = useRef(null);
  const gameStartTime = useRef(null);

  // 生成挑战棋盘
  const generateChallengeBoard = () => {
    // 挑战模式使用高难度关卡的生成逻辑
    const challengeLevel = 100 + Math.floor(Math.random() * 50);
    return generateBoard(challengeLevel, true); // forceNewSeed = true
  };

  // 开始游戏
  const startGame = () => {
    setIsPlaying(true);
    setTimeLeft(60);
    setScore(0);
    setClearedCount(0);
    gameStartTime.current = Date.now();
    
    // 生成第一个棋盘
    const newBoard = generateChallengeBoard();
    setBoard(newBoard);
    
    // 启动计时器
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // 结束游戏
  const endGame = async () => {
    setIsPlaying(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // 计算最终IQ分数
    const finalIQ = score;
    const currentBestIQ = gameData?.maxScore || 0;
    const isNewRecord = finalIQ > currentBestIQ;

    // 更新最高分
    if (isNewRecord) {
      await updateGameData({ maxScore: finalIQ });
    }

    // 显示结果
    Alert.alert(
      '挑战结束！',
      `本次IQ: ${finalIQ}\n` +
      `清除次数: ${clearedCount}\n` +
      `最高IQ: ${Math.max(finalIQ, currentBestIQ)}` +
      (isNewRecord ? '\n🎉 新纪录！' : ''),
      [
        { text: '再来一次', onPress: startGame },
        { text: '返回', onPress: () => router.back() }
      ]
    );
  };

  // 处理方块清除
  const handleTilesClear = (clearedPositions) => {
    if (!isPlaying) return;

    // 增加分数 (+3 IQ per clear)
    const newScore = score + 3;
    setScore(newScore);
    setClearedCount(prev => prev + 1);

    // 立即生成新棋盘
    setTimeout(() => {
      const newBoard = generateChallengeBoard();
      setBoard(newBoard);
    }, 500); // 短暂延迟让爆炸动画播放
  };

  // 返回按钮
  const handleBack = () => {
    if (isPlaying) {
      Alert.alert(
        '确认退出',
        '游戏正在进行中，确定要退出吗？',
        [
          { text: '取消', style: 'cancel' },
          { text: '退出', onPress: () => {
            if (timerRef.current) {
              clearInterval(timerRef.current);
            }
            router.back();
          }}
        ]
      );
    } else {
      router.back();
    }
  };

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const getIQTitle = (iq) => {
    if (iq >= 145) return 'Cosmic Genius';
    if (iq >= 130) return 'Puzzle Master';
    if (iq >= 115) return 'Rising Star';
    if (iq >= 100) return 'Everyday Scholar';
    if (iq >= 85) return 'Hardworking Student';
    if (iq >= 70) return 'Slow but Steady';
    if (iq >= 65) return 'Little Explorer';
    if (iq >= 55) return 'Learning Hatchling';
    if (iq >= 40) return 'Tiny Adventurer';
    return 'Newborn Dreamer';
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 顶部栏 */}
      <View style={styles.topBar}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBack}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <View style={styles.scoreContainer}>
          {isPlaying && (
            <>
              <View style={styles.scoreItem}>
                <Ionicons name="timer" size={16} color="#FF5722" />
                <Text style={[styles.scoreText, { color: '#D32F2F' }]}>
                  {formatTime(timeLeft)}
                </Text>
              </View>
              <View style={styles.scoreItem}>
                <Ionicons name="trophy" size={16} color="#FF9800" />
                <Text style={styles.scoreText}>{score}</Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* 黑板头部 */}
      <ChalkboardHeader 
        level="Challenge" 
        stageName={isPlaying ? `IQ Sprint - ${getIQTitle(score)}` : "60-Second IQ Sprint"} 
      />

      {/* 游戏区域 - 居中布局 */}
      <View style={styles.gameArea}>
        {!isPlaying && !board ? (
          // 开始界面
          <View style={styles.startContainer}>
            <View style={styles.instructionCard}>
              <Ionicons name="flash" size={48} color="#FF5722" />
              <Text style={styles.instructionTitle}>60秒IQ挑战</Text>
              <Text style={styles.instructionText}>
                在60秒内尽可能多地清除方块{'\n'}
                每次清除获得 +3 IQ分数{'\n'}
                清除后立即出现新棋盘
              </Text>
              <Text style={styles.bestScore}>
                最高IQ: {gameData?.maxScore || 0} ({getIQTitle(gameData?.maxScore || 0)})
              </Text>
            </View>
          </View>
        ) : (
          // 游戏棋盘
          board && (
            <GameBoard
              board={board}
              onTilesClear={handleTilesClear}
              disabled={!isPlaying}
            />
          )
        )}
      </View>

      {/* 底部按钮 */}
      <View style={styles.bottomBar}>
        {!isPlaying ? (
          <TouchableOpacity 
            style={styles.startButton}
            onPress={startGame}
          >
            <Ionicons name="play" size={24} color="white" />
            <Text style={styles.startButtonText}>开始挑战</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.stopButton}
            onPress={endGame}
          >
            <Ionicons name="stop" size={20} color="white" />
            <Text style={styles.stopButtonText}>结束挑战</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f8ff',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E65100',
    marginLeft: 4,
  },
  gameArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  startContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    maxWidth: 300,
  },
  instructionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 16,
  },
  instructionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  bestScore: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '600',
    textAlign: 'center',
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF5722',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f44336',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  stopButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
});