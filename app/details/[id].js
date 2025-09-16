/**
 * GameBoard Component - Enhanced interactive puzzle board with advanced visual effects
 * Purpose: Render game tiles with enhanced touch interactions and explosion animations
 * Features: Flexible touch gestures, tile scaling, explosion effects, improved responsiveness
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  PanResponder, 
  Dimensions, 
  StyleSheet,
  Animated,
  TouchableOpacity
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useGameStore } from '../store/gameStore';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export function GameBoard({ 
  board, 
  onTilesClear, 
  onTileClick, 
  swapMode = false, 
  firstSwapTile = null, 
  disabled = false 
}) {
  const [shakeAnimations, setShakeAnimations] = useState({});
  const [selection, setSelection] = useState(null);
export function GameBoard({ 
  board, 
  onTilesClear, 
  onTileClick, 
  swapMode = false, 
  firstSwapTile = null, 
  disabled = false 
}) {
  const { settings } = useGameStore();
  
  const selectionOpacity = useRef(new Animated.Value(0)).current;
  const tileScales = useRef({}).current;
  const explosionScale = useRef(new Animated.Value(0)).current;
  const explosionOpacity = useRef(new Animated.Value(0)).current;

  if (!board) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading board...</Text>
      </View>
    );
  }

  const { width, height, tiles } = board;
  // 计算格子大小
  const cellSize = Math.min(
    (screenWidth - 60) / width, 
    (screenHeight - 280) / height,
    50
  );
  const [explosionAnimation, setExplosionAnimation] = useState(null);