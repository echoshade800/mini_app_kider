/**
 * Challenge Mode Screen - Immersive full-board gameplay
 * Purpose: 60-second immersive challenge with full-screen board
 * Features: Full-screen mode, dense grid, no refill, board refresh on clear
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  Modal,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useGameStore } from '../store/gameStore';
import { UnifiedGameBoard } from '../components/UnifiedGameBoard';
import { generateChallengeBoard } from '../utils/boardGenerator';

const CHALLENGE_DURATION = 60; // 60 seconds

export default function ChallengeScreen() {
  const { gameData, updateGameData } = useGameStore();
  const [gameState, setGameState] = useState('ready'); // ready, playing, finished
  const [currentIQ, setCurrentIQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(CHALLENGE_DURATION);
  const [currentBoard, setCurrentBoard] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // 道具状态
  const [itemMode, setItemMode] = useState(null); // 'swapMaster' | 'fractalSplit' | null
  const [selectedSwapTile, setSelectedSwapTile] = useState(null);
  
  // 动画状态
  const swapAnimationsRef = useRef(new Map());
  const fractalAnimationsRef = useRef(new Map());
  const [animationTrigger, setAnimationTrigger] = useState(0);
  
  // Animations
  const progressAnim = useRef(new Animated.Value(1)).current;
  
  const timerRef = useRef();

  useEffect(() => {
    if (gameState === 'playing') {
      startTimer();
      startProgressAnimation();
    }
    
    // Auto-generate board when component mounts
    if (!currentBoard) {
      generateNewBoard();
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [gameState, currentBoard]);

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          endChallenge();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startProgressAnimation = () => {
    progressAnim.setValue(1);
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: CHALLENGE_DURATION * 1000,
      useNativeDriver: false,
    }).start();
  };

  const startChallenge = () => {
    setGameState('playing');
    setCurrentIQ(0);
    setTimeLeft(CHALLENGE_DURATION);
    generateNewBoard();
  };

  const endChallenge = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setGameState('finished');
    
    // Update best score if improved
    const currentBest = gameData?.maxScore || 0;
    if (currentIQ > currentBest) {
      updateGameData({ maxScore: currentIQ });
    }
    
    setShowResults(true);
  };

  const generateNewBoard = () => {
    const board = generateChallengeBoard();
    setCurrentBoard(board);
  };

  const handleTilesClear = (clearedPositions) => {
    if (gameState !== 'playing') return;
    
    // 每次消除获得3分IQ积分
    setCurrentIQ(prev => prev + 3);
    
    // 触感反馈
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      // 触感不可用，静默继续
    }
    
    // 更新棋盘，清除方块
    const newTiles = [...currentBoard.tiles];
    clearedPositions.forEach(pos => {
      const index = pos.row * Math.ceil(Math.sqrt(currentBoard.tiles.length)) + pos.col;
      newTiles[index] = 0;
    });
    
    setCurrentBoard(prev => ({ ...prev, tiles: newTiles }));
    
    // 检查棋盘是否完全清空
    const hasRemainingTiles = newTiles.some(tile => tile > 0);
    if (!hasRemainingTiles) {
      // Board cleared, generate new full board
      setTimeout(() => {
        generateNewBoard();
      }, 1000);
    }
  };

  // 处理道具使用
  const handleUseSwapMaster = () => {
    if (gameData?.swapMasterItems <= 0) return;
    setItemMode('swapMaster');
    setSelectedSwapTile(null);
  };

  const handleUseFractalSplit = () => {
    if (gameData?.fractalSplitItems <= 0) return;
    setItemMode('fractalSplit');
    setSelectedSwapTile(null);
  };

  const handleCancelItem = () => {
    setItemMode(null);
    setSelectedSwapTile(null);
  };

  const handleTileClick = (row, col, value) => {
    if (!itemMode || value === 0 || !currentBoard) return;
    
    const estimatedCols = Math.ceil(Math.sqrt(currentBoard.tiles.length));
    const index = row * estimatedCols + col;
    const clickedTile = { row, col, value, index };
    
    if (itemMode === 'swapMaster') {
      if (!selectedSwapTile) {
        setSelectedSwapTile(clickedTile);
      } else if (selectedSwapTile.index === index) {
        setSelectedSwapTile(null);
      } else {
        // 执行交换逻辑（简化版）
        const newTiles = [...currentBoard.tiles];
        const temp = newTiles[selectedSwapTile.index];
        newTiles[selectedSwapTile.index] = newTiles[clickedTile.index];
        newTiles[clickedTile.index] = temp;
        
        setCurrentBoard(prev => ({ ...prev, tiles: newTiles }));
        updateGameData({ swapMasterItems: (gameData?.swapMasterItems || 0) - 1 });
        setItemMode(null);
        setSelectedSwapTile(null);
      }
    } else if (itemMode === 'fractalSplit') {
      if (value >= 2) {
        // 简化的分裂逻辑
        const newTiles = [...currentBoard.tiles];
        const emptyPositions = [];
        for (let i = 0; i < newTiles.length; i++) {
          if (newTiles[i] === 0) emptyPositions.push(i);
        }
        
        if (emptyPositions.length >= 2) {
          const splitValues = value === 2 ? [1, 1] : 
                             value === 3 ? [1, 2] :
                             value === 4 ? [1, 3] :
                             value === 5 ? [2, 3] :
                             value === 6 ? [2, 4] :
                             value === 7 ? [3, 4] :
                             value === 8 ? [3, 5] :
                             [4, 5]; // value === 9
          
          newTiles[index] = 0;
          newTiles[emptyPositions[0]] = splitValues[0];
          newTiles[emptyPositions[1]] = splitValues[1];
          
          setCurrentBoard(prev => ({ ...prev, tiles: newTiles }));
          updateGameData({ fractalSplitItems: (gameData?.fractalSplitItems || 0) - 1 });
          setItemMode(null);
          setSelectedSwapTile(null);
        }
      }
    }
  };

  const handleReturn = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setShowResults(false);
    setGameState('ready');
    router.replace('/(tabs)');
  };

  const handleAgain = () => {
    setShowResults(false);
    startChallenge();
  };

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

  const handleBoardRefresh = (action) => {
    if (action === 'refresh') {
      // 棋盘全清，生成新棋盘
      generateNewBoard();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HUD */}
      <View style={[styles.hud, { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000 }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleReturn}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.hudCenter}>
          <Text style={styles.iqText}>IQ: {currentIQ}</Text>
          <View style={styles.progressContainer}>
            <Animated.View 
              style={[
                styles.progressBar,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%']
                  })
                }
              ]} 
            />
          </View>
          <Text style={styles.timeText}>{timeLeft}s</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => setShowSettings(true)}
        >
          <Ionicons name="settings" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Game Board - Full Screen */}
      {(gameState === 'ready' || gameState === 'playing') && (
        <>
          {gameState === 'ready' && (
            <View style={styles.readyOverlay}>
              <View style={styles.readyContent}>
                <Text style={styles.readyTitle}>Challenge Mode</Text>
                <Text style={styles.readySubtitle}>60 seconds of intense puzzle action!</Text>
                <TouchableOpacity style={styles.startButton} onPress={startChallenge}>
                  <Text style={styles.startButtonText}>START CHALLENGE</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          
          {currentBoard && (
            <UnifiedGameBoard 
              board={currentBoard}
              onTilesClear={handleTilesClear}
              onTileClick={handleTileClick}
              itemMode={itemMode}
              selectedSwapTile={selectedSwapTile}
              swapAnimations={swapAnimationsRef.current}
              fractalAnimations={fractalAnimationsRef.current}
              disabled={gameState !== 'playing'}
            />
          )}
        </>
      )}

      {gameState === 'finished' && currentBoard && (
        <UnifiedGameBoard 
          board={currentBoard}
          onTileClick={handleTileClick}
          itemMode={itemMode}
          selectedSwapTile={selectedSwapTile}
          swapAnimations={swapAnimationsRef.current}
          fractalAnimations={fractalAnimationsRef.current}
          disabled={true}
        />
      )}

      {/* 底部道具栏 - 固定在屏幕最底部 */}
      {gameState === 'playing' && (
        <View style={styles.itemsBar}>
          <TouchableOpacity 
            style={[
              styles.itemButton,
              itemMode === 'swapMaster' ? styles.itemButtonActive : styles.swapMasterButton,
              (gameData?.swapMasterItems || 0) <= 0 && itemMode !== 'swapMaster' && styles.itemButtonDisabled
            ]}
            onPress={itemMode === 'swapMaster' ? handleCancelItem : handleUseSwapMaster}
            disabled={(gameData?.swapMasterItems || 0) <= 0 && itemMode !== 'swapMaster'}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={itemMode === 'swapMaster' ? "close" : "shuffle"} 
              size={24} 
              color="white" 
            />
            {itemMode !== 'swapMaster' && (
              <View style={styles.itemBadge}>
                <Text style={styles.itemBadgeText}>{gameData?.swapMasterItems || 0}</Text>
              </View>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.itemButton,
              itemMode === 'fractalSplit' ? styles.itemButtonActive : styles.fractalSplitButton,
              (gameData?.fractalSplitItems || 0) <= 0 && itemMode !== 'fractalSplit' && styles.itemButtonDisabled
            ]}
            onPress={itemMode === 'fractalSplit' ? handleCancelItem : handleUseFractalSplit}
            disabled={(gameData?.fractalSplitItems || 0) <= 0 && itemMode !== 'fractalSplit'}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={itemMode === 'fractalSplit' ? "close" : "git-branch"} 
              size={24} 
              color="white" 
            />
            {itemMode !== 'fractalSplit' && (
              <View style={styles.itemBadge}>
                <Text style={styles.itemBadgeText}>{gameData?.fractalSplitItems || 0}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Results Modal */}
      <Modal visible={showResults} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.resultsModal}>
            <Text style={styles.resultsTitle}>Challenge Complete!</Text>
            <Text style={styles.finalIQ}>Final IQ: {currentIQ}</Text>
            <Text style={styles.iqTitle}>{getIQTitle(currentIQ)}</Text>
            
            {currentIQ > (gameData?.maxScore || 0) && (
              <Text style={styles.newRecord}>🎉 New Record!</Text>
            )}
            
            <View style={styles.resultsButtons}>
              <TouchableOpacity style={styles.againButton} onPress={handleAgain}>
                <Text style={styles.againButtonText}>AGAIN</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.returnButton} onPress={handleReturn}>
                <Text style={styles.returnButtonText}>RETURN</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={showSettings} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.settingsModal}>
            <Text style={styles.settingsTitle}>Challenge Settings</Text>
            <Text style={styles.settingsInfo}>
              • 60-second time limit{'\n'}
              • Dense grid layout{'\n'}
              • No tile refill{'\n'}
              • Board refreshes when cleared{'\n'}
              • 3 IQ points per clear
            </Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowSettings(false)}
            >
              <Text style={styles.closeButtonText}>CLOSE</Text>
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
    backgroundColor: '#1a1a2e',
  },
  fullScreenBoard: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  hud: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingTop: 50, // 为状态栏留出空间
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  backButton: {
    padding: 8,
  },
  settingsButton: {
    padding: 8,
  },
  hudCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 20,
  },
  iqText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  progressContainer: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    marginBottom: 5,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  timeText: {
    color: '#fff',
    fontSize: 14,
  },
  readyScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  readyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(26, 26, 46, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  readyContent: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  readyTitle: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  readySubtitle: {
    color: '#ccc',
    fontSize: 16,
    marginBottom: 40,
    textAlign: 'center',
  },
  startButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  gameArea: {
    // 移除，使用统一组件
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsModal: {
    backgroundColor: '#2d2d44',
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    minWidth: 300,
  },
  resultsTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  finalIQ: {
    color: '#4CAF50',
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  iqTitle: {
    color: '#ccc',
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  newRecord: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  resultsButtons: {
    flexDirection: 'row',
    gap: 15,
  },
  againButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 20,
  },
  againButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  returnButton: {
    backgroundColor: '#666',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 20,
  },
  returnButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  settingsModal: {
    backgroundColor: '#2d2d44',
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    minWidth: 300,
  },
  settingsTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  settingsInfo: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 25,
  },
  closeButton: {
    backgroundColor: '#666',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 20,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemsBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 30, // 为底部安全区域留出空间
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    gap: 20,
  },
  itemButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    position: 'relative',
  },
  swapMasterButton: {
    backgroundColor: '#2196F3',
  },
  fractalSplitButton: {
    backgroundColor: '#9C27B0',
  },
  itemButtonActive: {
    backgroundColor: '#f44336',
  },
  itemButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  itemBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#f44336',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  itemBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});