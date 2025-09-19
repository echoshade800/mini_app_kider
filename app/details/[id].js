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
  Modal
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
  
  const { gameData, updateGameData, settings } = useGameStore();
  
  // Game state
  const [board, setBoard] = useState(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showRescueModal, setShowRescueModal] = useState(false);
  const [itemMode, setItemMode] = useState(null);
  const [selectedSwapTile, setSelectedSwapTile] = useState(null);
  const [swapAnimations, setSwapAnimations] = useState(new Map());
  const [fractalAnimations, setFractalAnimations] = useState(new Map());
  const [reshuffleCount, setReshuffleCount] = useState(0);

  // 重置初始检查状态当关卡改变时
  useEffect(() => {
    if (level && !isNaN(level)) {
      const newBoard = generateBoard(level);
      setBoard(newBoard);
    }
  }, [level]);

  const handleTilesClear = (clearedPositions, newTilesData = null) => {
    if (!board) return;

    // 处理校准更新
    if (newTilesData) {
      setBoard(prev => ({
        ...prev,
        tiles: newTilesData
      }));
      setReshuffleCount(0);
      return;
    }

    if (clearedPositions.length === 0) {
      // 空数组表示重排请求
      const { reshuffleBoard } = require('../utils/gameLogic');
      const newTiles = reshuffleBoard(board.tiles, board.width, board.height);
      setBoard(prev => ({
        ...prev,
        tiles: newTiles
      }));
      
      // 重置校准计数
      setReshuffleCount(0);
    } else {
      // 更新棋盘：将被清除的方块设为0（空位）
      const newTiles = [...board.tiles];
      clearedPositions.forEach(pos => {
        const index = pos.row * board.width + pos.col;
        newTiles[index] = 0;
      });

      // 检查棋盘是否完全清空（所有非零方块都被消除）
      const remainingTiles = newTiles.filter(tile => tile > 0).length;
      
      if (remainingTiles === 0) {
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

      // 成功消除后重置重排计数
      setReshuffleCount(0);
      
      // 校准检查现在由GameBoard组件内部处理
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
    console.log('🎯 handleTileClick called:', { row, col, value, itemMode, selectedSwapTile });
    
    if (!itemMode || !board || value === 0) return;

    const index = row * board.width + col;
    
    if (itemMode === 'swapMaster') {
      if (!selectedSwapTile) {
        // Select first tile
        console.log('🔵 Selecting first tile for swap:', { row, col, value, index });
        setSelectedSwapTile({ row, col, value, index });
      } else if (selectedSwapTile.index === index) {
        // Deselect same tile
        console.log('❌ Deselecting tile');
        setSelectedSwapTile(null);
      } else {
        // Swap tiles
        console.log('🔄 Swapping tiles:', selectedSwapTile, 'with', { row, col, value, index });
        const newTiles = [...board.tiles];
        newTiles[selectedSwapTile.index] = value;
        newTiles[index] = selectedSwapTile.value;
        
        setBoard(prev => ({ ...prev, tiles: newTiles }));
        setSelectedSwapTile(null);
        setItemMode(null);
        
        // Consume item
        const newSwapMasterItems = Math.max(0, (gameData?.swapMasterItems || 0) - 1);
        updateGameData({ swapMasterItems: newSwapMasterItems });
      }
    } else if (itemMode === 'fractalSplit') {
      // Split the selected tile into two tiles with value 1 and (value-1)
      console.log('✂️ Attempting to split tile:', { row, col, value });
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
          console.log('✅ Splitting tile: original becomes 1, new tile gets', value - 1, 'at index', emptyIndex);
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
    console.log('🔧 SwapMaster button clicked, current state:', { 
      itemMode, 
      swapMasterItems: gameData?.swapMasterItems 
    });
    
    if ((gameData?.swapMasterItems || 0) <= 0) {
      console.log('❌ No SwapMaster items available');
      Alert.alert('No Items', 'You don\'t have any SwapMaster items.');
      return;
    }
    
    const newMode = itemMode === 'swapMaster' ? null : 'swapMaster';
    console.log('🔧 Setting itemMode to:', newMode);
    setItemMode(newMode);
    setSelectedSwapTile(null);
    
    // 强制重新渲染
    console.log('🔧 ItemMode changed to:', newMode);
  };

  const handleUseFractalSplit = () => {
    console.log('✂️ FractalSplit button clicked, current state:', { 
      itemMode, 
      splitItems: gameData?.splitItems 
    });
    
    if ((gameData?.splitItems || 0) <= 0) {
      console.log('❌ No FractalSplit items available');
      Alert.alert('No Items', 'You don\'t have any Split items.');
      return;
    }
    
    const newMode = itemMode === 'fractalSplit' ? null : 'fractalSplit';
    console.log('✂️ Setting itemMode to:', newMode);
    setItemMode(newMode);
    setSelectedSwapTile(null);
    
    // 强制重新渲染
    console.log('✂️ ItemMode changed to:', newMode);
  };

  const stageName = STAGE_NAMES[level] || `Level ${level}`;

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
        
        <View style={styles.headerCenter}>
          <Text style={styles.levelTitle}>Level {level}</Text>
          <Text style={styles.stageName} numberOfLines={1}>{stageName}</Text>
        </View>
        
        <View style={styles.headerRight}>
          <Text style={styles.targetText}>Target: 10</Text>
        </View>
      </View>

      {/* 道具工具栏 - 确保在GameBoard之前渲染 */}
      {/* Game Board */}
      <GameBoard
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
        reshuffleCount={reshuffleCount}
        setReshuffleCount={setReshuffleCount}
        onRescueNeeded={() => setShowRescueModal(true)}
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
          onPressIn={() => console.log('🔧 BOTTOM SwapMaster button pressed IN')}
          onPressOut={() => console.log('🔧 BOTTOM SwapMaster button pressed OUT')}
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
          onPressIn={() => console.log('✂️ BOTTOM FractalSplit button pressed IN')}
          onPressOut={() => console.log('✂️ BOTTOM FractalSplit button pressed OUT')}
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
        hasItems={(gameData?.swapMasterItems || 0) > 0}
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
    marginHorizontal: 16,
  },
  levelTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  stageName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  targetText: {
    fontSize: 14,
    color: '#666',
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