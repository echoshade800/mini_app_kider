// DraggableLevelNamePlacers.js
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View, ImageBackground, Text, StyleSheet, PanResponder, Alert, Pressable
} from 'react-native';

const POSTER_URI = 'https://dzdbhsix5ppsc.cloudfront.net/monster/numberkids/levelstart.webp';

const initBoxes = [
  // 顶部胶囊（上一关/本关取决于你需求，这里先设 current）
  { id: 'topBadge',   type: 'current', leftPct: 0.60, topPct: 0.155, widthPct: 0.24, heightPct: 0.055 },
  // 台阶左侧（current）
  { id: 'leftStep',   type: 'current', leftPct: 0.30, topPct: 0.765, widthPct: 0.28, heightPct: 0.07 },
  // 台阶右侧（next）
  { id: 'rightStep',  type: 'next',    leftPct: 0.70, topPct: 0.745, widthPct: 0.28, heightPct: 0.072 },
  // 预留一个（current），你可拖到任意位置
  { id: 'spare',      type: 'current', leftPct: 0.12, topPct: 0.18,  widthPct: 0.28, heightPct: 0.055 },
];

// 颜色映射（按类型/ID）
const typeFill = {
  current: 'rgba(30, 144, 255, 0.35)',   // 蓝色半透明
  next:    'rgba(255, 140,   0, 0.35)',  // 橙色半透明
};

// 给不同 ID 再细分不同颜色，让 3 个 current 更容易区分
const idFill = {
  topBadge:  'rgba(46, 204, 113, 0.40)', // 绿色
  leftStep:  'rgba(52, 152, 219, 0.40)', // 蓝色
  spare:     'rgba(155, 89, 182, 0.40)', // 紫色
  rightStep: 'rgba(255, 140, 0, 0.40)',  // 橙色（next）
};

export default function DraggableLevelNamePlacers({
  currentLevelName = 'Level 1',
  nextLevelName = 'Level 2',
}) {
  const [boxes, setBoxes] = useState(initBoxes);
  const [editing, setEditing] = useState(true);
  const [bgSize, setBgSize] = useState({ w: 0, h: 0 });

  const onBgLayout = useCallback((e) => {
    const { width, height } = e.nativeEvent.layout;
    setBgSize({ w: width, h: height });
  }, []);

  const updateBox = useCallback((id, dLeftPx, dTopPx) => {
    setBoxes(prev =>
      prev.map(b => {
        if (b.id !== id) return b;
        const leftPx = b.leftPct * bgSize.w + dLeftPx;
        const topPx  = b.topPct  * bgSize.h + dTopPx;
        return {
          ...b,
          leftPct: Math.max(0, Math.min(1 - b.widthPct,  leftPx / bgSize.w)),
          topPct:  Math.max(0, Math.min(1 - b.heightPct, topPx  / bgSize.h)),
        };
      })
    );
  }, [bgSize.w, bgSize.h]);

  const responders = useRef({}).current;

  boxes.forEach(box => {
    if (responders[box.id]) return;
    let startX = 0, startY = 0;
    responders[box.id] = PanResponder.create({
      onStartShouldSetPanResponder: () => editing,
      onPanResponderGrant: (_, g) => { startX = g.x0; startY = g.y0; },
      onPanResponderMove: (_, g) => {
        const dx = g.moveX - startX;
        const dy = g.moveY - startY;
        updateBox(box.id, dx, dy);
        startX = g.moveX; startY = g.moveY;
      },
      onPanResponderRelease: () => {},
    });
  });

  const exportJSON = useCallback(() => {
    const data = boxes.map(({ id, type, leftPct, topPct, widthPct, heightPct }) => ({
      id, type, leftPct: +leftPct.toFixed(4), topPct: +topPct.toFixed(4),
      widthPct: +widthPct.toFixed(4), heightPct: +heightPct.toFixed(4),
    }));
    const txt = JSON.stringify(data, null, 2);
    console.log('PLACEMENTS', txt);
    Alert.alert('Exported JSON (see console)', txt);
  }, [boxes]);

  const getLabel = useCallback((type) => {
    return type === 'next' ? nextLevelName : currentLevelName;
  }, [currentLevelName, nextLevelName]);

  return (
    <View style={styles.wrap}>
      <ImageBackground
        source={{ uri: POSTER_URI }}
        resizeMode="contain"
        style={styles.bg}
        onLayout={onBgLayout}
      >
        {bgSize.w > 0 && boxes.map(b => {
          const left   = b.leftPct * bgSize.w;
          const top    = b.topPct  * bgSize.h;
          const width  = b.widthPct * bgSize.w;
          const height = b.heightPct * bgSize.h;

          // 选颜色：先按 ID 覆盖，没有则按类型
          const fillColor = idFill[b.id] ?? typeFill[b.type];
          const borderCol = b.type === 'next' ? '#FF8C00' : '#1E90FF';

          return (
            <View
              key={b.id}
              style={[
                styles.box,
                { left, top, width, height },
                editing ? {
                  backgroundColor: fillColor,
                  borderWidth: 3,
                  borderColor: borderCol,
                  borderStyle: 'dashed',
                  zIndex: 10,
                  // 阴影/投影，保证任何底图上都清晰
                  shadowColor: '#000',
                  shadowOpacity: 0.35,
                  shadowRadius: 6,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 6,
                } : {
                  backgroundColor: 'transparent',
                  borderWidth: 0,
                }
              ]}
              {...(responders[b.id]?.panHandlers || {})}
              // 放大可点击区域，拖拽更好点到
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={[
                  styles.text,
                  editing ? { textShadowColor: '#000', textShadowRadius: 2, textShadowOffset: { width: 0, height: 1 } } : null
                ]}
              >
                {getLabel(b.type)}
              </Text>

              {editing && (
                <>
                  {/* 角标显示类型 */}
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{b.type.toUpperCase()}</Text>
                  </View>
                  {/* 十字准星，帮助对位 */}
                  <View style={styles.crosshair}>
                    <View style={styles.crossH} />
                    <View style={styles.crossV} />
                  </View>
                </>
              )}
            </View>
          );
        })}
      </ImageBackground>

      <View style={styles.toolbar}>
        <Pressable style={[styles.btn, { backgroundColor: editing ? '#444' : '#1e90ff' }]}
                   onPress={() => setEditing(e => !e)}>
          <Text style={styles.btnText}>{editing ? 'Preview' : 'Edit'}</Text>
        </Pressable>
        <Pressable style={[styles.btn, { backgroundColor: '#ff7f50' }]}
                   onPress={exportJSON}>
          <Text style={styles.btnText}>Export JSON</Text>
        </Pressable>
        <Pressable style={[styles.btn, { backgroundColor: '#888' }]}
                   onPress={() => setBoxes(initBoxes)}>
          <Text style={styles.btnText}>Reset</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', alignItems: 'center' },
  bg:   { width: '92%', aspectRatio: 768/1152, alignSelf: 'center' },

  box: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderRadius: 10,
  },
  text: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 18,
  },
  tag: {
    position: 'absolute',
    top: -18,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  // 十字准星
  crosshair: {
    position: 'absolute',
    width: 18, height: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  crossH: { position: 'absolute', width: 18, height: 2, backgroundColor: 'rgba(255,255,255,0.9)' },
  crossV: { position: 'absolute', width: 2, height: 18, backgroundColor: 'rgba(255,255,255,0.9)' },

  toolbar: {
    flexDirection: 'row', gap: 10, marginTop: 12, marginBottom: 6,
  },
  btn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  btnText: { color: '#fff', fontWeight: '700' },
});
