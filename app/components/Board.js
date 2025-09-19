import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  PanResponder,
  StyleSheet,
} from 'react-native';
import { useBoardSizing, BOARD_CONSTANTS } from '../hooks/useBoardSizing';

const Board = ({ 
  tiles = [], 
  onTilesClear,
  headerHeight = 120,
}) => {
  const sizing = useBoardSizing(headerHeight);
  const [selection, setSelection] = useState(null);
  const [dragStart, setDragStart] = useState(null);

  // Wait for sizing calculations
  if (!sizing) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading board...</Text>
      </View>
    );
  }

  const { boardOuter, boardInner, cellSize, fontSize, slack } = sizing;
  const { N, GAP, BOARD_PAD, FRAME } = BOARD_CONSTANTS;

  // Generate sample tiles if none provided
  const boardTiles = tiles.length >= N * N ? tiles : 
    Array.from({ length: N * N }, (_, i) => Math.floor(Math.random() * 9) + 1);

  // Pan responder for drag selection
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    
    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      const startPos = getGridPosition(locationX, locationY);
      if (startPos) {
        setDragStart(startPos);
        setSelection({ start: startPos, end: startPos });
      }
    },
    
    onPanResponderMove: (evt) => {
      if (!dragStart) return;
      const { locationX, locationY } = evt.nativeEvent;
      const endPos = getGridPosition(locationX, locationY);
      if (endPos) {
        setSelection({ start: dragStart, end: endPos });
      }
    },
    
    onPanResponderRelease: () => {
      if (selection) {
        handleSelectionComplete();
      }
      setDragStart(null);
      setSelection(null);
    },
  });

  const getGridPosition = (x, y) => {
    // Account for frame and padding
    const contentX = x - FRAME - BOARD_PAD;
    const contentY = y - FRAME - BOARD_PAD;
    
    if (contentX < 0 || contentY < 0) return null;
    
    const col = Math.floor(contentX / (cellSize + GAP));
    const row = Math.floor(contentY / (cellSize + GAP));
    
    if (row >= 0 && row < N && col >= 0 && col < N) {
      return { row, col };
    }
    return null;
  };

  const handleSelectionComplete = () => {
    if (!selection || !onTilesClear) return;
    
    const { start, end } = selection;
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);
    
    const selectedTiles = [];
    let sum = 0;
    
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const index = row * N + col;
        const value = boardTiles[index];
        if (value > 0) {
          selectedTiles.push({ row, col, value });
          sum += value;
        }
      }
    }
    
    if (sum === 10 && selectedTiles.length > 0) {
      onTilesClear(selectedTiles.map(tile => ({ row: tile.row, col: tile.col })));
    }
  };

  const isSelected = (row, col) => {
    if (!selection) return false;
    const { start, end } = selection;
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);
    
    return row >= minRow && row <= maxRow && col >= minCol && col <= maxCol;
  };

  const renderGrid = () => {
    const rows = [];
    
    for (let row = 0; row < N; row++) {
      const cells = [];
      
      for (let col = 0; col < N; col++) {
        const index = row * N + col;
        const value = boardTiles[index];
        const selected = isSelected(row, col);
        
        cells.push(
          <View
            key={`${row}-${col}`}
            style={[
              styles.cell,
              {
                width: cellSize,
                height: cellSize,
                backgroundColor: selected ? '#4CAF50' : '#FFF9E6',
                borderColor: selected ? '#2E7D32' : '#333',
              }
            ]}
          >
            {value > 0 && (
              <Text
                style={[
                  styles.cellText,
                  {
                    fontSize,
                    lineHeight: cellSize,
                  }
                ]}
                allowFontScaling={false}
                maxFontSizeMultiplier={1}
              >
                {value}
              </Text>
            )}
          </View>
        );
        
        // Add gap between cells (except last column)
        if (col < N - 1) {
          cells.push(
            <View key={`gap-${row}-${col}`} style={{ width: GAP }} />
          );
        }
      }
      
      rows.push(
        <View key={row} style={styles.row}>
          {cells}
          {/* Apply slack to last cell's right padding */}
          {row === N - 1 && slack > 0 && (
            <View style={{ width: slack }} />
          )}
        </View>
      );
      
      // Add gap between rows (except last row)
      if (row < N - 1) {
        rows.push(
          <View key={`row-gap-${row}`} style={{ height: GAP }} />
        );
      }
    }
    
    // Apply slack to bottom padding of last row
    if (slack > 0) {
      rows.push(
        <View key="bottom-slack" style={{ height: slack }} />
      );
    }
    
    return rows;
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.board,
          {
            width: boardOuter,
            height: boardOuter,
          }
        ]}
        {...panResponder.panHandlers}
      >
        <View
          style={[
            styles.boardInner,
            {
              margin: FRAME,
              padding: BOARD_PAD,
              width: boardInner,
              height: boardInner,
            }
          ]}
        >
          {renderGrid()}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  board: {
    backgroundColor: '#8B5A2B', // Wooden frame
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  boardInner: {
    backgroundColor: '#1E5A3C', // Green chalkboard
    borderRadius: 8,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 3,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0.5, height: 0.5 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  cellText: {
    fontWeight: 'bold',
    color: '#111',
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
});

export default Board;