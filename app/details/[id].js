/**
 * Level Detail Screen - Individual level gameplay
 * Purpose: Play specific levels with completion tracking and item usage
 * Features: Level completion detection, next level navigation, item management
 */

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  Alert,
  Modal,
  Image,
  Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { generateBoard } from '../utils/boardGenerator';
import { STAGE_NAMES } from '../utils/stageNames';
import GameBoard from '../components/GameBoard';
import RescueModal from '../components/RescueModal';

// 提取关卡名称（去掉Grade前缀部分）
function extractLevelName(stageName) {
  if (!stageName) return '';
  
  // 如果包含破折号，取破折号后的部分
  const dashIndex = stageName.indexOf('–');
  if (dashIndex !== -1) {
    return stageName.substring(dashIndex + 1).trim();
  }
  
  // 如果包含普通破折号
  const hyphenIndex = stageName.indexOf('-');
  if (hyphenIndex !== -1) {
    return stageName.substring(hyphenIndex + 1).trim();
  }
  
  // 否则返回原名称
  return stageName;
}

export default function LevelDetailScreen() {
  const { id } = useLocalSearchParams();
  const level = parseInt(id);
  
  const { gameData, updateGameData, settings } = useGameStore();
  
  // Game state
  const [board, setBoard] = useState(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showRescueModal, setShowRescueModal] = useState(false);
  const [itemMode, setItemMode] = useState(null);
  const [selectedSwapTile, setSelectedSwapTile] = useState(null);
  const [swapAnimations, setSwapAnimations] = useState(new Map());
  const [fractalAnimations, setFractalAnimations] = useState(new Map());
  const [boardKey, setBoardKey] = useState(0); // 用于强制重新生成棋盘
  
  // 进度条状态
  const [totalTiles, setTotalTiles] = useState(0);
  const [clearedTiles, setClearedTiles] = useState(0);
  const [progress, setProgress] = useState(0);
  
  // 人物动画
  const characterPosition = useRef(new Animated.Value(0)).current;

  // 生成新棋盘的函数
  const generateNewBoard = useCallback(() => {
    if (level && !isNaN(level)) {
      console.log(`🔄 生成新棋盘 - 关卡 ${level}`);
      const newBoard = generateBoard(level);
      setBoard(newBoard);
      setBoardKey(prev => prev + 1); // 更新key强制重新渲染
      
      // 初始化进度条状态
      const initialTileCount = newBoard.tiles.filter(tile => tile > 0).length;
      setTotalTiles(initialTileCount);
      setClearedTiles(0);
      setProgress(0);
      console.log(`📊 进度条初始化: 总方块=${initialTileCount}, 已清除=0, 进度=0%`);
      
      // 重置游戏状态
      setItemMode(null);
      setSelectedSwapTile(null);
      setSwapAnimations(new Map());
      setFractalAnimations(new Map());
      
      // 重置人物位置
      characterPosition.setValue(0);
    }
  }, [level]);

  // 初始化棋盘
  useEffect(() => {
    generateNewBoard();
  }, [generateNewBoard]);

  // 页面获得焦点时刷新棋盘
  useFocusEffect(
    useCallback(() => {
      console.log(`📱 页面获得焦点 - 关卡 ${level}`);
      generateNewBoard();
    }, [generateNewBoard])
  );

  const handleTilesClear = (clearedPositions, newTilesData = null) => {
    if (!board) return;

    if (clearedPositions.length === 0) {
      // 空数组 - 暂时不处理
      return;
    } else {
      // 更新已清除方块数量
      const newClearedCount = clearedTiles + clearedPositions.length;
      setClearedTiles(newClearedCount);
      
      // 计算并更新进度
      const newProgress = Math.min(newClearedCount / totalTiles, 1);
      setProgress(newProgress);
      
      // 动画移动人物到新位置
      Animated.timing(characterPosition, {
        toValue: newProgress,
        duration: 500,
        useNativeDriver: false,
      }).start();
      
      console.log(`📊 进度更新: 清除${clearedPositions.length}个方块, 总计${newClearedCount}/${totalTiles}, 进度=${(newProgress * 100).toFixed(1)}%`);
      
      // 更新棋盘：将被清除的方块设为0（空位）
      const newTiles = [...board.tiles];
      clearedPositions.forEach(pos => {
        const index = pos.row * board.width + pos.col;
        newTiles[index] = 0;
      });

      // 检查棋盘是否完全清空（所有非零方块都被消除）
      const remainingTiles = newTiles.filter(tile => tile > 0).length;
      
      if (remainingTiles === 0) {
        // 确保进度条达到100%
        setProgress(1);
        console.log(`🎉 关卡完成! 进度条达到100%`);
        
        // 关卡完成！显示完成弹窗
        setShowCompletionModal(true);
        
        // 更新进度
        const currentMaxLevel = gameData?.maxLevel || 0;
        const newMaxLevel = Math.max(currentMaxLevel, level);
        const newSwapMasterItems = (gameData?.swapMasterItems || 0) + 1;
        const newSplitItems = (gameData?.splitItems || 0) + 1;
        
        updateGameData({
          maxLevel: newMaxLevel,
          lastPlayedLevel: level,
          swapMasterItems: newSwapMasterItems,
          splitItems: newSplitItems,
        });
        
        return; // 不更新棋盘，直接显示完成弹窗
      }

      // 更新当前棋盘状态（被清除的位置变为空位）
      setBoard(prev => ({
        ...prev,
        tiles: newTiles
      }));

    }
  };

  const handleNextLevel = () => {
    setShowCompletionModal(false);
    const nextLevel = level + 1;
    router.replace(`/details/${nextLevel}`);
  };

  const handleBackToLevels = () => {
    setShowCompletionModal(false);
    router.replace('/(tabs)/levels');
  };

  const handleBackPress = () => {
    router.replace('/(tabs)/levels');
  };

  const handleTileClick = (row, col, value) => {
    if (!itemMode || !board || value === 0) return;

    const index = row * board.width + col;
    
    if (itemMode === 'swapMaster') {
      if (!selectedSwapTile) {
        // Select first tile
        setSelectedSwapTile({ row, col, value, index });
      } else if (selectedSwapTile.index === index) {
        // Deselect same tile
        setSelectedSwapTile(null);
      } else {
        // Swap tiles
        const newTiles = [...board.tiles];
        newTiles[selectedSwapTile.index] = value;
        newTiles[index] = selectedSwapTile.value;
        
        // Split道具增加了一个新方块，更新总数
        const newTotalTiles = totalTiles + 1;
        setTotalTiles(newTotalTiles);
        
        // 重新计算进度（保持已清除数量不变）
        const newProgress = Math.min(clearedTiles / newTotalTiles, 1);
        setProgress(newProgress);
        
        console.log(`🔄 Split道具使用: 总方块数增加到${newTotalTiles}, 进度调整为${(newProgress * 100).toFixed(1)}%`);
        
        setBoard(prev => ({ ...prev, tiles: newTiles }));
        setSelectedSwapTile(null);
        setItemMode(null);
        
        // Consume item
        const newSwapMasterItems = Math.max(0, (gameData?.swapMasterItems || 0) - 1);
        updateGameData({ swapMasterItems: newSwapMasterItems });
      }
    } else if (itemMode === 'fractalSplit') {
      // Split the selected tile into two tiles with value 1 and (value-1)
      if (value > 1) {
        const newTiles = [...board.tiles];
        
        // Find an empty position for the new tile
        let emptyIndex = -1;
        for (let i = 0; i < newTiles.length; i++) {
          if (newTiles[i] === 0) {
            emptyIndex = i;
            break;
          }
        }
        
        if (emptyIndex !== -1) {
          // Split: original tile becomes 1, new tile gets (value-1)
          newTiles[index] = 1;
          newTiles[emptyIndex] = value - 1;
          
          setBoard(prev => ({ ...prev, tiles: newTiles }));
          setItemMode(null);
          
          // Consume item
          const newSplitItems = Math.max(0, (gameData?.splitItems || 0) - 1);
          updateGameData({ splitItems: newSplitItems });
        } else {
          Alert.alert('No Space', 'No empty space available for splitting.');
        }
      } else {
        Alert.alert('Cannot Split', 'Cannot split a tile with value 1.');
      }
    }
  };

  const handleUseSwapMaster = () => {
    if ((gameData?.swapMasterItems || 0) <= 0) {
      Alert.alert('No Items', 'You don\'t have any SwapMaster items.');
      return;
    }
    
    const newMode = itemMode === 'swapMaster' ? null : 'swapMaster';
    setItemMode(newMode);
    setSelectedSwapTile(null);
  };

  const handleUseFractalSplit = () => {
    if ((gameData?.splitItems || 0) <= 0) {
      Alert.alert('No Items', 'You don\'t have any Split items.');
      return;
    }
    
    const newMode = itemMode === 'fractalSplit' ? null : 'fractalSplit';
    setItemMode(newMode);
    setSelectedSwapTile(null);
  };

  const stageName = STAGE_NAMES[level] || `Level ${level}`;
  const displayLevelName = extractLevelName(stageName);

  if (!board) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading level...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBackPress}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        {/* 新的进度条设计 */}
        <View style={styles.newProgressContainer}>
          {/* 进度条背景 */}
          <View style={styles.progressTrack}>
            {/* 绿色进度填充 */}
            <View style={[styles.progressFillGreen, { width: `${progress * 100}%` }]} />
            
            {/* 人物角色 */}
            <Animated.View 
              style={[
                styles.characterContainer,
                {
                  left: characterPosition.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '85%'], // 不要到最右边，留空间给标签
                  })
                }
              ]}
            >
              <Image 
                source={{ uri: 'https://dzdbhsix5ppsc.cloudfront.net/monster/numberkids/monsterwalk.webp' }}
                style={styles.characterImage}
                resizeMode="contain"
              />
            </Animated.View>
          </View>
          
          {/* 关卡名称标签 */}
          <View style={styles.levelNameTag}>
            <Ionicons name="book" size={16} color="white" />
            <Text style={styles.levelNameTagText}>
              {displayLevelName}!
            </Text>
          </View>
        </View>
      </View>

      {/* 道具工具栏 - 确保在GameBoard之前渲染 */}
      {/* Game Board */}
      <GameBoard
        key={boardKey}
        tiles={board.tiles}
        width={board.width}
        height={board.height}
        onTilesClear={handleTilesClear}
        disabled={false}
        itemMode={itemMode}
        onTileClick={handleTileClick}
        selectedSwapTile={selectedSwapTile}
        swapAnimations={swapAnimations}
        fractalAnimations={fractalAnimations}
        settings={settings}
        isChallenge={false}
        layoutConfig={board.layoutConfig}
      />

      {/* Bottom Toolbar - 移到GameBoard下方确保不被覆盖 */}
      <View style={styles.bottomToolbar}>
        <TouchableOpacity 
          style={[
            styles.bottomToolButton,
            itemMode === 'swapMaster' && styles.toolButtonActive,
            (gameData?.swapMasterItems || 0) <= 0 && styles.toolButtonDisabled
          ]}
          onPress={handleUseSwapMaster}
          disabled={(gameData?.swapMasterItems || 0) <= 0}
          activeOpacity={0.7}
          hitSlop={{ top: 30, bottom: 30, left: 30, right: 30 }}
        >
          <Ionicons 
            name="swap-horizontal" 
            size={20} 
            color={
              (gameData?.swapMasterItems || 0) <= 0 ? '#ccc' :
              itemMode === 'swapMaster' ? 'white' : '#666'
            } 
          />
          <Text style={[
            styles.toolButtonText,
            itemMode === 'swapMaster' && styles.toolButtonTextActive,
            (gameData?.swapMasterItems || 0) <= 0 && styles.toolButtonTextDisabled
          ]}>
            Change
          </Text>
          <Text style={[
            styles.toolButtonCount,
            itemMode === 'swapMaster' && styles.toolButtonCountActive,
            (gameData?.swapMasterItems || 0) <= 0 && styles.toolButtonCountDisabled
          ]}>
            {gameData?.swapMasterItems || 0}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.bottomToolButton,
            itemMode === 'fractalSplit' && styles.toolButtonActive,
            (gameData?.splitItems || 0) <= 0 && styles.toolButtonDisabled
          ]}
          onPress={handleUseFractalSplit}
          disabled={(gameData?.splitItems || 0) <= 0}
          activeOpacity={0.7}
          hitSlop={{ top: 30, bottom: 30, left: 30, right: 30 }}
        >
          <Ionicons 
            name="cut" 
            size={20} 
            color={
              (gameData?.splitItems || 0) <= 0 ? '#ccc' :
              itemMode === 'fractalSplit' ? 'white' : '#666'
            } 
          />
          <Text style={[
            styles.toolButtonText,
            itemMode === 'fractalSplit' && styles.toolButtonTextActive,
            (gameData?.splitItems || 0) <= 0 && styles.toolButtonTextDisabled
          ]}>
            Split
          </Text>
          <Text style={[
            styles.toolButtonCount,
            itemMode === 'fractalSplit' && styles.toolButtonCountActive,
            (gameData?.splitItems || 0) <= 0 && styles.toolButtonCountDisabled
          ]}>
            {gameData?.splitItems || 0}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Completion Modal */}
      <Modal 
        visible={showCompletionModal} 
        transparent 
        animationType="fade"
        onRequestClose={() => setShowCompletionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.completionModal}>
            <View style={styles.completionIcon}>
              <Ionicons name="trophy" size={60} color="#FFD700" />
            </View>
            
            <Text style={styles.completionTitle}>🎉 Level Complete!</Text>
            <Text style={styles.completionMessage}>
              Excellent work! You've cleared all the tiles.
            </Text>
            
            <View style={styles.rewardInfo}>
              <Ionicons name="gift" size={20} color="#4CAF50" />
              <Text style={styles.rewardText}>+1 Change & +1 Split Item earned!</Text>
            </View>
            
            <View style={styles.completionButtons}>
              <TouchableOpacity 
                style={styles.nextLevelButton}
                onPress={handleNextLevel}
              >
                <Ionicons name="arrow-forward" size={20} color="white" />
                <Text style={styles.nextLevelButtonText}>Next Level</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.backToLevelsButton}
                onPress={handleBackToLevels}
              >
                <Ionicons name="list" size={20} color="#666" />
                <Text style={styles.backToLevelsButtonText}>Level List</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rescue Modal */}
      <RescueModal
        visible={showRescueModal}
        onContinue={() => {
          setShowRescueModal(false);
          // Generate new board as rescue
          const newBoard = generateBoard(level);
          setBoard(newBoard);
        }}
        onReturn={() => {
          setShowRescueModal(false);
          handleBackPress();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f8ff',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    top: 12,
    zIndex: 10,
    padding: 8,
    backgroundColor: '#FFD700',
    borderRadius: 8,
  },
  newProgressContainer: {
    marginTop: 8,
    marginHorizontal: 60, // 为返回按钮留空间
    position: 'relative',
  },
  progressTrack: {
    height: 12,
    backgroundColor: '#E0E0E0',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#333',
    position: 'relative',
    overflow: 'visible',
  },
  progressFillGreen: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
    transition: 'width 0.5s ease-out',
  },
  characterContainer: {
    position: 'absolute',
    top: -20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  characterImage: {
    width: 36,
    height: 36,
  },
  levelNameTag: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    right: -8,
    top: -8,
    backgroundColor: '#2196F3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
    gap: 4,
  },
  levelNameTagText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
    textShadowColor: '#FF5722',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bottomToolbar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 20,
    zIndex: 1000,
    elevation: 1000,
  },
  bottomToolButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    minWidth: 120,
    justifyContent: 'center',
  },
  toolButtonActive: {
    backgroundColor: '#2196F3',
  },
  toolButtonDisabled: {
    backgroundColor: '#f0f0f0',
  },
  toolButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  toolButtonTextActive: {
    color: 'white',
  },
  toolButtonTextDisabled: {
    color: '#ccc',
  },
  toolButtonCount: {
    fontSize: 14,
    color: '#999',
    backgroundColor: 'white',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    textAlign: 'center',
  },
  toolButtonCountActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    color: 'white',
  },
  toolButtonCountDisabled: {
    backgroundColor: '#f8f8f8',
    color: '#ccc',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  completionModal: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
    minWidth: 300,
  },
  completionIcon: {
    marginBottom: 16,
  },
  completionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  completionMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  rewardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
    gap: 8,
  },
  rewardText: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '600',
  },
  completionButtons: {
    width: '100%',
    gap: 12,
  },
  nextLevelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  nextLevelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  backToLevelsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 8,
  },
  backToLevelsButtonText: {
    color: '#666',
    fontSize: 16,
  },
});