import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGameStore } from '../store/gameStore';
import { generateBoard } from '../utils/boardGenerator';
import { STAGE_NAMES } from '../utils/stageNames';
import GameBoard from '../components/GameBoard';
import RescueModal from '../components/RescueModal';

export default function LevelDetailScreen() {
  const { id } = useLocalSearchParams();
  const level = parseInt(id);
  const { gameData, updateGameData } = useGameStore();
  
  const [board, setBoard] = useState(null);
  const [showRescue, setShowRescue] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // 获取关卡名称
  const getStageName = (level) => {
    if (level > 200) {
      return `The Last Horizon+${level - 200}`;
    }
    return STAGE_NAMES[level] || `Level ${level}`;
  };

  // 生成棋盘
  const generateNewBoard = () => {
    const newBoard = generateBoard(level, false, false);
    
    // 🎯 调试命令：计算并记录棋盘格尺寸数据
    if (newBoard && newBoard.layoutConfig) {
      console.log(`🎯 关卡${level}棋盘格尺寸数据:`);
      console.log(`- 棋盘总尺寸: ${newBoard.layoutConfig.boardWidth}px × ${newBoard.layoutConfig.boardHeight}px`);
      console.log(`- 行数: ${newBoard.layoutConfig.rows}, 列数: ${newBoard.layoutConfig.cols}`);
      console.log(`- 方块尺寸: ${newBoard.layoutConfig.tileSize}px`);
      console.log(`- 数字方块矩形: ${newBoard.layoutConfig.tilesRectWidth}px × ${newBoard.layoutConfig.tilesRectHeight}px`);
      console.log(`- 内容区尺寸: ${newBoard.layoutConfig.contentWidth}px × ${newBoard.layoutConfig.contentHeight}px`);
    }
    
    setBoard(newBoard);
  };

  // 初始化
  useEffect(() => {
    if (level && level > 0) {
      generateNewBoard();
    }
  }, [level]);

  // 处理方块清除
  const handleTilesClear = (clearedPositions) => {
    // 检查是否完成关卡
    const remainingTiles = board.tiles.filter(tile => tile > 0);
    const clearedCount = clearedPositions.length;
    
    if (remainingTiles.length === clearedCount) {
      // 关卡完成
      setIsCompleted(true);
      
      // 更新进度
      const currentMaxLevel = gameData?.maxLevel || 1;
      const currentSwapMasterItems = gameData?.swapMasterItems || 0;
      
      if (level >= currentMaxLevel) {
        updateGameData({
          maxLevel: level + 1,
          lastPlayedLevel: level,
          swapMasterItems: currentSwapMasterItems + 1, // 完成关卡获得1个SwapMaster道具
        });
      }
      
      // 显示完成提示
      setTimeout(() => {
        Alert.alert(
          '🎉 Level Complete!',
          `Congratulations! You completed ${getStageName(level)}.\n\n+1 SwapMaster item earned!`,
          [
            {
              text: 'Next Level',
              onPress: () => {
                if (level < 200) {
                  router.replace(`/details/${level + 1}`);
                } else {
                  router.replace('/');
                }
              }
            },
            {
              text: 'Home',
              onPress: () => router.replace('/'),
              style: 'cancel'
            }
          ]
        );
      }, 1000);
    }
  };

  // 处理救援
  const handleRescue = () => {
    setShowRescue(false);
    generateNewBoard();
  };

  // 返回主页
  const handleGoHome = () => {
    router.replace('/');
  };

  if (!level || level < 1) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Invalid level</Text>
          <TouchableOpacity style={styles.homeButton} onPress={handleGoHome}>
            <Text style={styles.homeButtonText}>Go Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
          <Text style={styles.headerTitle}>{getStageName(level)}</Text>
          <Text style={styles.headerSubtitle}>Level {level}</Text>
        </View>
        
        <View style={styles.placeholder} />
      </View>

      {/* 游戏区域 */}
      <View style={styles.gameArea}>
        {board && (
          <GameBoard
            tiles={board.tiles}
            width={board.width}
            height={board.height}
            layoutConfig={board.layoutConfig}
            onTilesClear={handleTilesClear}
            showItemButtons={true}
            onNoValidMoves={() => setShowRescue(true)}
          />
        )}
      </View>

      {/* 救援弹窗 */}
      <RescueModal
        visible={showRescue}
        onContinue={handleRescue}
        onReturn={handleGoHome}
      />
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
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  placeholder: {
    width: 40,
  },
  gameArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#f44336',
    marginBottom: 20,
  },
  homeButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  homeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});