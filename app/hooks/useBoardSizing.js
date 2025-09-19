import { useState, useEffect } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Board constants
export const BOARD_CONSTANTS = {
  N: 8, // Grid size (N x N)
  GAP: 4, // Gap between cells
  BOARD_PAD: 12, // Padding inside board
  FRAME: 8, // Frame thickness
};

export function useBoardSizing(headerHeight = 120) {
  const { width: windowW, height: windowH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [measurements, setMeasurements] = useState(null);

  useEffect(() => {
    // Step 1: Compute usable height
    const usableH = Math.floor(windowH - insets.top - insets.bottom - headerHeight);
    
    // Step 2: Compute square boardOuter (use minimum of width and usable height)
    const boardOuter = Math.floor(Math.min(windowW, usableH));
    
    // Step 3: Compute boardInner
    const boardInner = Math.floor(boardOuter - BOARD_CONSTANTS.FRAME * 2 - BOARD_CONSTANTS.BOARD_PAD * 2);
    
    // Step 4: Compute cellSize (no fractional pixels)
    const { N, GAP } = BOARD_CONSTANTS;
    const cellSize = Math.floor((boardInner - GAP * (N - 1)) / N);
    
    // Step 5: Compute slack for padding adjustment
    const usedSpace = cellSize * N + GAP * (N - 1);
    const slack = Math.floor(boardInner - usedSpace);
    
    // Step 6: Compute font size
    const fontSize = Math.floor(cellSize * 0.52);
    
    setMeasurements({
      boardOuter,
      boardInner,
      cellSize,
      fontSize,
      slack,
      usableH,
    });
  }, [windowW, windowH, insets.top, insets.bottom, headerHeight]);

  return measurements;
}