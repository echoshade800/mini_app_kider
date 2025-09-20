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
import { LinearGradient } from 'expo-linear-gradient';
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

// 生成随机渐变色
function generateRandomGradient() {
  const colors = [
    ['#FF6B6B', '#FF8E8E'], // 红到浅红
    ['#FFA502', '#FFB84D'], // 橙到浅橙
    ['#FECA57', '#FFE066'], // 黄到浅黄
    ['#FF6348', '#FF7A5C'], // 红橙到浅红橙
    ['#FF4757', '#FF6B9D'], // 红到粉
    ['#FF9F43', '#FFB366'], // 橙到浅橙
    ['#FF6B6B', '#FF9F9F'], // 红到浅红
    ['#FFA502', '#FFC947'], // 橙到金黄
    ['#FECA57', '#FFD93D'], // 黄到亮黄
    ['#FF6348', '#FF8A65'], // 红橙到浅红橙
  ];
  
  return colors[Math.floor(Math.random() * colors.length)];
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
  
<<<<<<< HEAD
  // 人物动画
  const characterPosition = useRef(new Animated.Value(0)).current;
=======
  // 人物动画状态
  const [characterPosition] = useState(new Animated.Value(0));
  const [characterScale] = useState(new Animated.Value(1));
  const [progressBarWidth, setProgressBarWidth] = useState(200); // 默认进度条宽度
  
  // 进度条渐变色状态
  const [progressGradient, setProgressGradient] = useState(['#FF6B6B', '#4ECDC4']);
>>>>>>> 5d89f88 (feat: 挑战模式进度条燃烧特效)

  // 生成新棋盘的函数
  const generateNewBoard = useCallback(() => {
    if (level && !isNaN(level)) {
      const newBoard = generateBoard(level);
      setBoard(newBoard);
      setBoardKey(prev => prev + 1); // 更新key强制重新渲染
      
      // 生成新的随机渐变色
      const newGradient = generateRandomGradient();
      setProgressGradient(newGradient);
      
      // 初始化进度条状态
      const initialTileCount = newBoard.tiles.filter(tile => tile > 0).length;
      setTotalTiles(initialTileCount);
      setClearedTiles(0);
      setProgress(0);
      
      // 重置人物状态
      characterPosition.setValue(0);
      characterScale.setValue(1);
      
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
      
<<<<<<< HEAD
      // 动画移动人物到新位置
      Animated.timing(characterPosition, {
        toValue: newProgress,
        duration: 500,
        useNativeDriver: false,
      }).start();
      
      console.log(`📊 进度更新: 清除${clearedPositions.length}个方块, 总计${newClearedCount}/${totalTiles}, 进度=${(newProgress * 100).toFixed(1)}%`);
=======
      // 更新人物位置和动画
      Animated.parallel([
        Animated.timing(characterPosition, {
          toValue: newProgress,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(characterScale, {
            toValue: 1.2,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(characterScale, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
      
>>>>>>> 5d89f88 (feat: 挑战模式进度条燃烧特效)
      
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
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        
<<<<<<< HEAD
        {/* 新的进度条设计 */}
        <View style={styles.newProgressContainer}>
          {/* 进度条背景 */}
          <View style={styles.progressTrack}>
            {/* 绿色进度填充 */}
            <View style={[styles.progressFillGreen, { width: `${progress * 100}%` }]} />
            
            {/* 人物角色 */}
=======
        <View style={styles.headerCenter}>
          {/* 进度条容器 */}
          <View style={styles.progressContainer}>
            <View 
              style={styles.progressBar}
              onLayout={(event) => {
                const { width } = event.nativeEvent.layout;
                setProgressBarWidth(width);
              }}
            >
              <LinearGradient
                colors={progressGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${progress * 100}%` }]}
              />
            </View>
            {/* 人物图片 - 在进度条上移动 */}
>>>>>>> 5d89f88 (feat: 挑战模式进度条燃烧特效)
            <Animated.View 
              style={[
                styles.characterContainer,
                {
<<<<<<< HEAD
                  left: characterPosition.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '85%'], // 不要到最右边，留空间给标签
                  })
=======
                  transform: [
                    { 
                      translateX: characterPosition.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, progressBarWidth], // 人物从当前位置开始移动到最右边
                        extrapolate: 'clamp',
                      })
                    },
                    { scale: characterScale },
                  ],
>>>>>>> 5d89f88 (feat: 挑战模式进度条燃烧特效)
                }
              ]}
            >
              <Image 
                source={{ uri: 'https://dzdbhsix5ppsc.cloudfront.net/monster/numberkids/monsterwalk.webp' }}
                style={styles.characterImage}
                resizeMode="contain"
              />
            </Animated.View>
<<<<<<< HEAD
          </View>
          
          {/* 关卡名称标签 */}
          <View style={styles.levelNameTag}>
            <Ionicons name="book" size={16} color="white" />
            <Text style={styles.levelNameTagText}>
              {displayLevelName}!
            </Text>
          </View>
=======
            
          </View>
        </View>
        
        <View style={styles.headerRight}>
          {/* 书本图标和关卡名称组合 */}
          {displayLevelName && (
            <View style={styles.levelNameWithBook}>
              <Image
                source={{ uri: 'https://dzdbhsix5ppsc.cloudfront.net/monster/numberkids/book.webp' }}
                style={styles.bookIcon}
                resizeMode="contain"
              />
              <View style={styles.levelNameContainer}>
                <Text style={styles.levelNameText}>
                  {displayLevelName}!
                </Text>
              </View>
            </View>
          )}
>>>>>>> 5d89f88 (feat: 挑战模式进度条燃烧特效)
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
              'white' // 改为白色
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
              'white' // 改为白色
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
    backgroundColor: '#6B7B8A', // 改为灰蓝色背景
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
    backgroundColor: '#6B7B8A', // 改为与背景一致的灰蓝色
    borderBottomWidth: 1,
    borderBottomColor: '#5A6B7A', // 稍微深一点的灰蓝色边框
  },
  backButton: {
    position: 'absolute',
    left: 16,
    top: 12,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'transparent', // 取消背景，只保留箭头
    borderRadius: 8,
    marginTop: -13, // 与人物保持平行（characterContainer的top值）
  },
<<<<<<< HEAD
  newProgressContainer: {
    marginTop: 8,
    marginHorizontal: 60, // 为返回按钮留空间
=======
  headerCenter: {
    flex: 2, // 保持2，让进度条占更多空间
    marginHorizontal: 16,
    justifyContent: 'center',
    marginTop: 1, // 向下移动1px
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
>>>>>>> 5d89f88 (feat: 挑战模式进度条燃烧特效)
    position: 'relative',
    height: 50,
    paddingLeft: 21, // 保持左padding
    paddingRight: 30, // 增加右padding，让进度条右端与书本位置重合
  },
<<<<<<< HEAD
  progressTrack: {
    height: 12,
    backgroundColor: '#E0E0E0',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#333',
    position: 'relative',
    overflow: 'visible',
=======
  progressBar: {
    flex: 1,
    height: 12, // 从16减小到12，缩小高度
    backgroundColor: '#E0E0E0',
    borderRadius: 6, // 相应调整圆角
    overflow: 'hidden',
>>>>>>> 5d89f88 (feat: 挑战模式进度条燃烧特效)
  },
  progressFillGreen: {
    height: '100%',
<<<<<<< HEAD
    backgroundColor: '#4CAF50',
    borderRadius: 4,
    transition: 'width 0.5s ease-out',
  },
  characterContainer: {
    position: 'absolute',
    top: -20,
    width: 40,
    height: 40,
=======
    borderRadius: 6, // 与progressBar保持一致
  },
  characterContainer: {
    position: 'absolute',
    top: -13, // 从-14调整到-13，向下移动1px
    left: -32, // 向左偏移32px，让人物与进度条最左边重叠
    width: 64, // 从56增加到64，放大一些
    height: 64, // 从56增加到64，放大一些
>>>>>>> 5d89f88 (feat: 挑战模式进度条燃烧特效)
    alignItems: 'center',
    justifyContent: 'center',
  },
  characterImage: {
<<<<<<< HEAD
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
=======
    width: 64, // 从56增加到64
    height: 64, // 从56增加到64
  },
  headerRight: {
    position: 'absolute',
    right: 20, // 距离屏幕右边缘20px
    top: 10, // 继续向下移动2px（从8改为10）
    flexDirection: 'row',
    alignItems: 'center',
    width: 120, // 进一步增加宽度到120px，确保关卡名称完整显示
    gap: 8, // 书本图标和文字之间的间距
    zIndex: 10, // 确保在进度条之上
  },
  levelNameWithBook: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 120, // 调整为与headerRight相同的宽度
  },
  bookIcon: {
    width: 50, // 稍微缩小书本，给关卡名称更多空间
    height: 50, // 稍微缩小书本，给关卡名称更多空间
    marginRight: -6, // 向右偏移6px，让书本覆盖到黑色框上
  },
  levelNameContainer: {
    flex: 1,
    minWidth: 0, // 允许收缩
    backgroundColor: '#000', // 黑色背景
    borderRadius: 4,
    paddingHorizontal: 6, // 减少padding，给文字更多空间
    paddingVertical: 4,
    marginLeft: -6, // 向左偏移6px，让书本和黑色框真正紧贴
  },
  levelNameText: {
    fontSize: 10, // 进一步缩小字体
    color: '#fff', // 白色文字
    fontWeight: 'bold',
    textAlign: 'left', // 改为左对齐，确保文字不被截断
    flexShrink: 0, // 防止文字被压缩
>>>>>>> 5d89f88 (feat: 挑战模式进度条燃烧特效)
  },
  bottomToolbar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 34, // 增加底部安全区域
    backgroundColor: '#6B7B8A', // 改为与背景一致的灰蓝色
    borderTopWidth: 1,
    borderTopColor: '#5A6B7A', // 稍微深一点的灰蓝色边框
    gap: 20,
    zIndex: 1000,
    elevation: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  bottomToolButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2D6B4A', // 绿色背景
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    minWidth: 120,
    justifyContent: 'center',
    borderWidth: 4, // 加粗木质边框
    borderColor: '#8B5A2B', // 木质边框
  },
  toolButtonActive: {
    backgroundColor: '#1B5E20', // 深绿色激活状态
    borderColor: '#8B5A2B',
  },
  toolButtonDisabled: {
    backgroundColor: '#4A4A4A', // 深灰色禁用状态
    borderColor: '#6B6B6B',
  },
  toolButtonText: {
    fontSize: 16,
    color: 'white', // 白色字体
    fontWeight: '500',
  },
  toolButtonTextActive: {
    color: 'white',
  },
  toolButtonTextDisabled: {
    color: '#BDBDBD', // 灰色禁用文字
  },
  toolButtonCount: {
    fontSize: 14,
    color: '#333', // 深色文字，在米色背景上更清晰
    backgroundColor: '#FFF9E6', // 与数字方块背景保持一致
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#333', // 添加边框，与数字方块样式一致
  },
  toolButtonCountActive: {
    backgroundColor: '#FFF9E6', // 保持米色背景
    color: '#333', // 深色文字
    borderColor: '#333',
  },
  toolButtonCountDisabled: {
    backgroundColor: '#F5F5F5', // 灰色禁用背景
    color: '#ccc',
    borderColor: '#ccc',
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