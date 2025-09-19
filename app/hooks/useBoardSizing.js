import { useState, useEffect } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Hook for measurement-driven board sizing calculations
 * Ensures integer pixels and perfect fit on any device
 */
export function useBoardSizing(N, headerHeight = 120) {
  const { width: windowW, height: windowH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  
  // Constants for board layout
  const GAP = 4;
  const BOARD_PAD = 8;
  const FRAME = 8;
  
  const [sizing, setSizing] = useState({
    boardOuter: 0,
    boardInner: 0,
    cellSize: 0,
    fontSize: 0,
    slack: { right: 0, bottom: 0 }
  });

  useEffect(() => {
    // Step 1: Compute usable height accounting for safe areas and header
    const usableH = windowH - insets.top - insets.bottom - headerHeight;
    
    // Step 2: Compute integer square boardOuter (minimum of width/height)
    const boardOuter = Math.floor(Math.min(windowW, usableH));
    
    // Step 3: Compute boardInner
    const boardInner = boardOuter - FRAME * 2 - BOARD_PAD * 2;
    
    // Step 4: Compute cellSize with no fractional pixels
    const cellSize = Math.floor((boardInner - GAP * (N - 1)) / N);
    
    // Step 5: Slack handling for perfect fit
    const totalCellSpace = cellSize * N + GAP * (N - 1);
    const slackTotal = boardInner - totalCellSpace;
    
    // Distribute slack as padding
    const slack = {
      right: Math.floor(slackTotal / 2),
      bottom: Math.floor(slackTotal / 2)
    };
    
    // Step 7: Text safety - fontSize calculation
    const fontSize = Math.floor(cellSize * 0.52);
    
    setSizing({
      boardOuter,
      boardInner,
      cellSize,
      fontSize,
      slack
    });
  }, [windowW, windowH, insets.top, insets.bottom, N, headerHeight]);

  return {
    ...sizing,
    constants: { GAP, BOARD_PAD, FRAME }
  };
}