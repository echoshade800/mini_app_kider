/**
 * Challenge Mode Screen - 60-second timed gameplay
 * Purpose: Fast-paced IQ challenge with scoring
 * Features: 60s countdown, IQ scoring, consistent with level mode UI/UX
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  Modal,
  Dimensions,
  Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGameStore } from '../store/gameStore';
import { GameBoard } from '../components/GameBoard';
import { generateBoard } from '../utils/boardGenerator';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const CHALLENGE_DURATION = 60; // 60 seconds

export default function ChallengeScreen() {
  const { gameData, updateGameData } = useGameStore();
  const [gameState, setGameState] = useState('ready'); // ready, playing, finished
  const [currentIQ, setCurrentIQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(CHALLENGE_DURATION);
  const [currentBoard, setCurrentBoard] = useState(null);
  const [showResults, setShowResults] = useState(false);
  
  // 道具状态 - 与闯关模式一致
  const [itemMode, setItemMode] = useState(null); // 'swapMaster' | 'fractalSplit' | null
  const [selectedSwapTile, setSelectedSwapTile] = useState(null);
  
  // 动画状态 - 与闯关模式一致
  const swapAnimationsRef = useRef(new Map());
  const fractalAnimationsRef = useRef(new Map());
  const [animationTrigger, setAnimationTrigger] = useState(0);
  
  // 倒计时进度条动画（导火索样式）
  const progressAnim = useRef(new Animated.Value(1)).current;
  
  const timerRef = useRef();
  const swapMasterItems = gameData?.swapMasterItems || 0;
  const fractalSplitItems = gameData?.fractalSplitItems || 0;

  useEffect(() => {
    if (gameState === 'playing') {
      startTimer();
      startProgressAnimation();
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [gameState]);

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
    // 使用170关配置，但确保棋盘尺寸适合屏幕
    const board = generateBoard(170, true, true);
    setCurrentBoard(board);
  };

  const handleTilesClear = (clearedPositions) => {
    if (gameState !== 'playing') return;
    
    // Award 3 IQ points per clear
    setCurrentIQ(prev => prev + 3);
    
    // Update board with cleared tiles
    const newTiles = [...currentBoard.tiles];
    clearedPositions.forEach(pos => {
      const index = pos.row * currentBoard.width + pos.col;
      newTiles[index] = 0;
    });
    
    setCurrentBoard(prev => ({ ...prev, tiles: newTiles }));
  };

  const handleBoardRefresh = (action) => {
    if (action === 'refresh') {
      // Generate new board when current board is cleared
      generateNewBoard();
    } else if (action === 'return') {
      // Return to home from rescue modal
      handleReturn();
    } else if (typeof action === 'object') {
      // Updated board from reshuffle
      setCurrentBoard(action);
    }
  };

  // 道具使用逻辑 - 与闯关模式一致
  const handleUseSwapMaster = () => {
    if (swapMasterItems <= 0 || gameState !== 'playing') return;
    setItemMode('swapMaster');
    setSelectedSwapTile(null);
  };

  const handleUseFractalSplit = () => {
    if (fractalSplitItems <= 0 || gameState !== 'playing') return;
    setItemMode('fractalSplit');
    setSelectedSwapTile(null);
  };

  const handleSwapTileClick = (row, col, value) => {
    if (!itemMode || value === 0 || gameState !== 'playing') return;
    
    const index = row * currentBoard.width + col;
    const clickedTile = { row, col, value, index };
    
    if (itemMode === 'swapMaster') {
      if (!selectedSwapTile) {
        setSelectedSwapTile(clickedTile);
      } else if (selectedSwapTile.index === index) {
        setSelectedSwapTile(null);
      } else {
        performSwap(selectedSwapTile, clickedTile);
      }
    } else if (itemMode === 'fractalSplit') {
      if (value >= 2) {
        performFractalSplit(clickedTile);
      }
    }
  };

  const performSwap = (tile1, tile2) => {
    // 交换逻辑与闯关模式一致
    const newTiles = [...currentBoard.tiles];
    const temp = newTiles[tile1.index];
    newTiles[tile1.index] = newTiles[tile2.index];
    newTiles[tile2.index] = temp;

    setCurrentBoard(prev => ({ ...prev, tiles: newTiles }));
    
    // 消耗道具
    const newSwapMasterItems = Math.max(0, swapMasterItems - 1);
    updateGameData({ swapMasterItems: newSwapMasterItems });
    
    setItemMode(null);
    setSelectedSwapTile(null);
  };

  const performFractalSplit = (tile) => {
    // 分裂逻辑与闯关模式一致（简化版）
    const { value, index } = tile;
    const newTiles = [...currentBoard.tiles];
    
    // 简单分裂：将数字分解为两个较小的数字
    const val1 = Math.floor(value / 2);
    const val2 = value - val1;
    
    newTiles[index] = val1;
    
    // 找一个空位放置第二个数字
    const emptyIndex = newTiles.findIndex(tile => tile === 0);
    if (emptyIndex !== -1) {
      newTiles[emptyIndex] = val2;
    }
    
    setCurrentBoard(prev => ({ ...prev, tiles: newTiles }));
    
    // 消耗道具
    const newFractalSplitItems = Math.max(0, fractalSplitItems - 1);
    updateGameData({ fractalSplitItems: newFractalSplitItems });
    
    setItemMode(null);
    setSelectedSwapTile(null);
  };

  const handleCancelSwap = () => {
    setItemMode(null);
    setSelectedSwapTile(null);
  };

  const handleReturn = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setShowResults(false);
    setGameState('ready');
    router.replace('/');
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

  if (gameState === 'ready') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.readyContainer}>
          <Ionicons name="timer" size={80} color="#FF5722" />
          <Text style={styles.readyTitle}>Challenge Mode</Text>
          <Text style={styles.readySubtitle}>
            60 seconds to maximize your IQ score!
          </Text>
          <Text style={styles.readyDescription}>
            与闯关模式相比，挑战模式唯一不同：玩家需要在限定时间内尽可能多地框选并消除和为 10 的数字方块，以提升"智商值"或积分。
          </Text>
          <Text style={styles.readyDescription}>
            其他设置（UI 布局、交互逻辑、道具设置、动画效果）与闯关模式完全一致。
          </Text>
          
          <TouchableOpacity 
            style={styles.startButton}
            onPress={startChallenge}
          >
            <Text style={styles.startButtonText}>Start Challenge</Text>
          </TouchableOpacity>
          
          <View style={styles.bestScore}>
            <Text style={styles.bestScoreLabel}>Best IQ:</Text>
            <Text style={styles.bestScoreValue}>{gameData?.maxScore || 0}</Text>
            <Text style={styles.bestScoreTitle}>{getIQTitle(gameData?.maxScore || 0)}</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 顶部智商值显示与倒计时进度条（导火索样式） */}
      <View style={styles.gameHeader}>
        <View style={styles.iqContainer}>
          <Text style={styles.iqText}>IQ: {currentIQ}</Text>
        </View>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBackground}>
            <Animated.View 
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%']
                  })
                }
              ]} 
            />
            <View style={styles.progressSpark} />
          </View>
          <Text style={styles.timerText}>{timeLeft}s</Text>
        </View>
      </View>

      {/* Game Board - 与闯关模式完全一致 */}
      {currentBoard && (
        <GameBoard 
          board={currentBoard}
          onTilesClear={handleTilesClear}
          onBoardRefresh={handleBoardRefresh}
          onTileClick={handleSwapTileClick}
          itemMode={itemMode}
          selectedSwapTile={selectedSwapTile}
          swapAnimations={swapAnimationsRef.current}
          fractalAnimations={fractalAnimationsRef.current}
          disabled={gameState !== 'playing'}
          isChallenge={true}
          maxBoardHeight={screenHeight - 200} // 限制棋盘高度，为顶部和底部留空间
          maxBoardHeight={screenHeight - 200}
        />
      )}

      {/* 道具按钮 - 与闯关模式完全一致 */}
      <View style={styles.floatingButtons}>
        <TouchableOpacity 
          style={[
            styles.floatingButton,
            itemMode === 'swapMaster' ? styles.cancelButton : styles.swapMasterButton,
            swapMasterItems <= 0 && itemMode !== 'swapMaster' && styles.floatingButtonDisabled
          ]}
          onPress={itemMode === 'swapMaster' ? handleCancelSwap : handleUseSwapMaster}
          disabled={swapMasterItems <= 0 && itemMode !== 'swapMaster'}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={itemMode === 'swapMaster' ? "close" : "shuffle"} 
            size={24} 
            color="white" 
          />
          {itemMode !== 'swapMaster' && (
            <View style={styles.floatingButtonBadge}>
              <Text style={styles.floatingButtonBadgeText}>{swapMasterItems}</Text>
            </View>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.floatingButton,
            itemMode === 'fractalSplit' ? styles.cancelButton : styles.fractalSplitButton,
            fractalSplitItems <= 0 && itemMode !== 'fractalSplit' && styles.floatingButtonDisabled
          ]}
          onPress={itemMode === 'fractalSplit' ? handleCancelSwap : handleUseFractalSplit}
          disabled={fractalSplitItems <= 0 && itemMode !== 'fractalSplit'}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={itemMode === 'fractalSplit' ? "close" : "git-branch"} 
            size={24} 
            color="white" 
          />
          {itemMode !== 'fractalSplit' && (
            <View style={styles.floatingButtonBadge}>
              <Text style={styles.floatingButtonBadgeText}>{fractalSplitItems}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Results Modal */}
      <Modal
        visible={showResults}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.resultsModal}>
            <Ionicons name="time" size={60} color="#FF5722" />
            <Text style={styles.resultsTitle}>Time Out!</Text>
            
            <View style={styles.finalScore}>
              <Text style={styles.finalIQ}>IQ: {currentIQ}</Text>
              <Text style={styles.finalTitle}>{getIQTitle(currentIQ)}</Text>
              
              {currentIQ > (gameData?.maxScore || 0) && (
                <Text style={styles.newRecord}>🎉 New Personal Best!</Text>
              )}
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalButton}
                onPress={handleReturn}
              >
                <Text style={styles.modalButtonText}>Return</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.primaryModalButton]}
                onPress={handleAgain}
              >
                <Text style={[styles.modalButtonText, styles.primaryModalButtonText]}>
                  Again
                </Text>
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
  readyContainer: {
    flex: 1, 
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  readyTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 12,
  },
  readySubtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  readyDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  startButton: {
    backgroundColor: '#FF5722',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    marginTop: 20,
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  bestScore: {
    alignItems: 'center',
    marginTop: 40,
  },
  bestScoreLabel: {
    fontSize: 16,
    color: '#666',
  },
  bestScoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF9800',
    marginTop: 4,
  },
  bestScoreTitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  iqContainer: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  iqText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 20,
  },
  progressBackground: {
    flex: 1,
    height: 8,
    backgroundColor: '#FFEBEE',
    borderRadius: 4,
    marginRight: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF5722',
    borderRadius: 4,
  },
  progressSpark: {
    position: 'absolute',
    right: -2,
    top: -2,
    width: 12,
    height: 12,
    backgroundColor: '#FFD54F',
    borderRadius: 6,
    shadowColor: '#FFD54F',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  timerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF5722',
    minWidth: 35,
  },
  // 道具按钮样式 - 与闯关模式一致
  floatingButtons: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    elevation: 1000,
    gap: 20,
  },
  floatingButton: {
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
  cancelButton: {
    backgroundColor: '#f44336',
  },
  floatingButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  floatingButtonBadge: {
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
  floatingButtonBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsModal: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    width: '80%',
    maxWidth: 350,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  resultsTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF5722',
    marginTop: 16,
    marginBottom: 24,
  },
  finalScore: {
    alignItems: 'center',
    marginBottom: 30,
  },
  finalIQ: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 8,
  },
  finalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  newRecord: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF5722',
    minWidth: 100,
    alignItems: 'center',
  },
  primaryModalButton: {
    backgroundColor: '#FF5722',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF5722',
  },
  primaryModalButtonText: {
    color: 'white',
  },
});