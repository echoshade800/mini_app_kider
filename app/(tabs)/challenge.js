import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  Alert,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGameStore } from '../store/gameStore';
import { generateBoard } from '../utils/boardGenerator';
import GameBoard from '../components/GameBoard';

export default function ChallengeScreen() {
  const { gameData, updateGameData } = useGameStore();
  const [board, setBoard] = useState(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentScore, setCurrentScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  // 生成新棋盘
  const generateNewBoard = () => {
    const newBoard = generateBoard(100, true, true); // 挑战模式：高数量方块
    
    // 🎯 调试命令：计算并记录棋盘格尺寸数据
    if (newBoard && newBoard.layoutConfig) {
      console.log('🎯 挑战模式棋盘格尺寸数据:');
      console.log(`- 棋盘总尺寸: ${newBoard.layoutConfig.boardWidth}px × ${newBoard.layoutConfig.boardHeight}px`);
      console.log(`- 行数: ${newBoard.layoutConfig.rows}, 列数: ${newBoard.layoutConfig.cols}`);
      console.log(`- 方块尺寸: ${newBoard.layoutConfig.tileSize}px`);
      console.log(`- 数字方块矩形: ${newBoard.layoutConfig.tilesRectWidth}px × ${newBoard.layoutConfig.tilesRectHeight}px`);
      console.log(`- 内容区尺寸: ${newBoard.layoutConfig.contentWidth}px × ${newBoard.layoutConfig.contentHeight}px`);
    }
    
    setBoard(newBoard);
  };

  // 开始游戏
  const startGame = () => {
    setIsPlaying(true);
    setGameStarted(true);
    setTimeLeft(60);
    setCurrentScore(0);
    generateNewBoard();
  };

  // 计时器
  useEffect(() => {
    let timer;
    if (isPlaying && timeLeft > 0) {
      timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0 && isPlaying) {
      // 游戏结束
      setIsPlaying(false);
      setShowResult(true);
      
      // 更新最高分
      const currentBest = gameData?.maxScore || 0;
      if (currentScore > currentBest) {
        updateGameData({ maxScore: currentScore });
      }
    }
    
    return () => clearTimeout(timer);
  }, [isPlaying, timeLeft, currentScore, gameData, updateGameData]);

  // 处理方块清除
  const handleTilesClear = (clearedPositions) => {
    // 每次清除获得3分
    const points = 3;
    setCurrentScore(prev => prev + points);
    
    // 立即生成新棋盘
    setTimeout(() => {
      generateNewBoard();
    }, 500);
  };

  // 获取IQ等级标题
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

  // 重新开始
  const handleRestart = () => {
    setShowResult(false);
    setGameStarted(false);
    setIsPlaying(false);
    setCurrentScore(0);
    setTimeLeft(60);
    setBoard(null);
  };

  // 返回主页
  const handleGoHome = () => {
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleGoHome}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Challenge Mode</Text>
          {gameStarted && (
            <View style={styles.gameInfo}>
              <Text style={styles.timeText}>⏱ {timeLeft}s</Text>
              <Text style={styles.scoreText}>IQ: {currentScore}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.placeholder} />
      </View>

      {/* 游戏区域 */}
      <View style={styles.gameArea}>
        {!gameStarted ? (
          // 开始界面
          <View style={styles.startContainer}>
            <Ionicons name="timer" size={80} color="#FF9800" />
            <Text style={styles.startTitle}>60-Second Challenge</Text>
            <Text style={styles.startDescription}>
              Clear as many rectangles as possible in 60 seconds!{'\n'}
              Each successful clear awards +3 IQ points.
            </Text>
            
            <View style={styles.bestScoreContainer}>
              <Text style={styles.bestScoreLabel}>Your Best IQ</Text>
              <Text style={styles.bestScoreValue}>{gameData?.maxScore || 0}</Text>
              <Text style={styles.bestScoreTitle}>
                {getIQTitle(gameData?.maxScore || 0)}
              </Text>
            </View>
            
            <TouchableOpacity 
              style={styles.startButton}
              onPress={startGame}
            >
              <Text style={styles.startButtonText}>Start Challenge</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // 游戏界面
          <View style={styles.gameContainer}>
            {/* Game Board */}
            {board && (
              <GameBoard
                tiles={board.tiles}
                width={board.width}
                height={board.height}
                layoutConfig={board.layoutConfig}
                onTilesClear={handleTilesClear}
                showItemButtons={false}
              />
            )}
          </View>
        )}
      </View>

      {/* 结果弹窗 */}
      <Modal 
        visible={showResult} 
        transparent 
        animationType="fade"
        onRequestClose={handleRestart}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.resultModal}>
            <Ionicons name="trophy" size={60} color="#FFD700" />
            
            <Text style={styles.resultTitle}>Challenge Complete!</Text>
            
            <View style={styles.resultStats}>
              <Text style={styles.resultLabel}>Final IQ Score</Text>
              <Text style={styles.resultScore}>{currentScore}</Text>
              <Text style={styles.resultTitle}>{getIQTitle(currentScore)}</Text>
              
              {currentScore > (gameData?.maxScore || 0) && (
                <Text style={styles.newRecordText}>🎉 New Personal Best!</Text>
              )}
            </View>
            
            <View style={styles.resultButtons}>
              <TouchableOpacity 
                style={[styles.resultButton, styles.restartButton]}
                onPress={handleRestart}
              >
                <Ionicons name="refresh" size={20} color="white" />
                <Text style={styles.resultButtonText}>Try Again</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.resultButton, styles.homeButton]}
                onPress={handleGoHome}
              >
                <Ionicons name="home" size={20} color="white" />
                <Text style={styles.resultButtonText}>Home</Text>
              </TouchableOpacity>
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
    backgroundColor: '#f0f8ff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  gameInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 16,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF9800',
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  placeholder: {
    width: 40,
  },
  gameArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startContainer: {
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  startTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 16,
  },
  startDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  bestScoreContainer: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 200,
  },
  bestScoreLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  bestScoreValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF9800',
    marginBottom: 4,
  },
  bestScoreTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  startButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  gameContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  resultModal: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
    minWidth: 300,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 20,
  },
  resultStats: {
    alignItems: 'center',
    marginBottom: 30,
  },
  resultLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  resultScore: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FF9800',
    marginBottom: 8,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  newRecordText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
  resultButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  resultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  restartButton: {
    backgroundColor: '#4CAF50',
  },
  homeButton: {
    backgroundColor: '#FF9800',
  },
  resultButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});