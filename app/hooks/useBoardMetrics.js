@@ .. @@
   // 计算方块尺寸
   const tileSizeW = (usableWidth - 2 * padding - (cols - 1) * gap) / cols;
   const tileSizeH = (usableHeight - 2 * padding - (rows - 1) * gap) / rows;
-  let tileSize = Math.floor(Math.min(tileSizeW, tileSizeH));
+  let tileSize = Math.max(MIN_TILE_SIZE, Math.floor(Math.min(tileSizeW, tileSizeH)));
   
   // 紧凑模式：超大网格时减小边距和间距
   if (rows * cols > 100) {
@@ .. @@
   
   // 计算棋盘尺寸
-  const boardWidth = cols * tileSize + (cols - 1) * gap + 2 * padding;
-  const boardHeight = rows * tileSize + (rows - 1) * gap + 2 * padding;
+  const innerWidth = cols * tileSize + (cols - 1) * gap;
+  const innerHeight = rows * tileSize + (rows - 1) * gap;
+  const boardWidth = innerWidth + 2 * padding;
+  const boardHeight = innerHeight + 2 * padding;
   
   // 居中定位
   const boardX = (screenWidth - boardWidth) / 2;
@@ .. @@
   
   return {
     tileSize,
+    tileWidth: tileSize,
+    tileHeight: Math.floor(tileSize * 0.9), // 纸片效果
     gap,
     padding,
     boardWidth,
@@ .. @@
     boardX,
     boardY,
+    innerWidth,
+    innerHeight,
     // 计算方块位置的辅助函数
     getTilePosition: (row, col) => ({
       x: padding + col * (tileSize + gap),
       y: padding + row * (tileSize + gap),
     }),
   };
 }