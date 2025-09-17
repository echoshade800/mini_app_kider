import React, { useEffect, useState } from 'react';
import { View, Text, ImageBackground, TouchableOpacity, Modal } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import StorageUtils from '../utils/StorageUtils';
import { STAGE_NAMES } from '../utils/stageNames';

const HERO_URL = 'https://dzdbhsix5ppsc.cloudfront.net/monster/20250917-173743.jpeg';

export default function Home() {
  const [latestLevelName, setLatestLevelName] = useState('新手上路');
  const [iq, setIq] = useState(0);
  const [maxLevel, setMaxLevel] = useState(1);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const info = await StorageUtils.getData();
        const currentLevel = info?.maxLevel || 1;
        const levelName = currentLevel > 200 
          ? `The Last Horizon+${currentLevel - 200}`
          : STAGE_NAMES[currentLevel] || `Level ${currentLevel}`;
        
        setLatestLevelName(levelName);
        setIq(info?.maxScore || 0);
        setMaxLevel(currentLevel);
      } catch (error) {
        console.error('Failed to load game data:', error);
      }
    })();
  }, []);

  return (
    <ImageBackground
      source={{ uri: HERO_URL }}
      resizeMode="cover"
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        {/* 顶部操作区 */}
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          paddingHorizontal: 16, 
          paddingTop: 4, 
          alignItems: 'center' 
        }}>
          <TouchableOpacity
            accessibilityLabel="新手引导"
            onPress={() => setShowGuide(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{ 
              width: 36, 
              height: 36, 
              borderRadius: 18, 
              backgroundColor: 'rgba(0,0,0,0.25)', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>I</Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityLabel="设置"
            onPress={() => router.push('/(tabs)/profile')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{ 
              width: 36, 
              height: 36, 
              borderRadius: 18, 
              backgroundColor: 'rgba(0,0,0,0.25)', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '800' }}>⚙︎</Text>
          </TouchableOpacity>
        </View>

        {/* 中部信息框 */}
        <View style={{ 
          flex: 1, 
          alignItems: 'center', 
          justifyContent: 'center', 
          paddingHorizontal: 24 
        }}>
          <View style={{ 
            paddingVertical: 14, 
            paddingHorizontal: 18, 
            borderRadius: 16, 
            backgroundColor: 'rgba(255,255,255,0.85)',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}>
            <Text style={{ 
              fontSize: 20, 
              fontWeight: '800', 
              color: '#5A3E12',
              textAlign: 'center'
            }}>
              {latestLevelName} · IQ：{iq}
            </Text>
          </View>
        </View>

        {/* 底部按钮 */}
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'center', 
          gap: 16, 
          paddingBottom: 28,
          paddingHorizontal: 20
        }}>
          <TouchableOpacity
            accessibilityLabel="闯关模式"
            onPress={() => router.push('/(tabs)/levels')}
            style={{ 
              minWidth: 140, 
              height: 60, 
              borderRadius: 999, 
              backgroundColor: '#F58B39', 
              alignItems: 'center', 
              justifyContent: 'center', 
              paddingHorizontal: 24, 
              shadowColor: '#000', 
              shadowOpacity: 0.2, 
              shadowRadius: 8, 
              elevation: 4 
            }}
          >
            <Text style={{ 
              color: '#fff', 
              fontSize: 18, 
              fontWeight: '800' 
            }}>
              LEVELS
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityLabel="挑战模式"
            onPress={() => router.push('/(tabs)/challenge')}
            style={{ 
              minWidth: 140, 
              height: 60, 
              borderRadius: 999, 
              backgroundColor: '#F26D21', 
              alignItems: 'center', 
              justifyContent: 'center', 
              paddingHorizontal: 24, 
              shadowColor: '#000', 
              shadowOpacity: 0.2, 
              shadowRadius: 8, 
              elevation: 4 
            }}
          >
            <Text style={{ 
              color: '#fff', 
              fontSize: 18, 
              fontWeight: '800' 
            }}>
              ARCADE
            </Text>
          </TouchableOpacity>
        </View>

        {/* 新手引导 Modal */}
        <Modal 
          visible={showGuide} 
          transparent 
          animationType="fade" 
          onRequestClose={() => setShowGuide(false)}
        >
          <View style={{ 
            flex: 1, 
            backgroundColor: 'rgba(0,0,0,0.45)', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: 24 
          }}>
            <View style={{ 
              width: '90%', 
              borderRadius: 16, 
              backgroundColor: '#fff', 
              padding: 20 
            }}>
              <Text style={{ 
                fontSize: 18, 
                fontWeight: '800', 
                marginBottom: 8,
                color: '#333'
              }}>
                🎉 Welcome to Daycare Dash!
              </Text>
              <Text style={{ 
                fontSize: 15, 
                lineHeight: 22, 
                color: '#333',
                marginBottom: 14
              }}>
                How to Play: Draw a box around numbers whose total equals 10 to clear them. You can connect numbers across rows and columns—be clever and quick!{'\n\n'}Level Mode: Tackle fun puzzles from easy to tricky, and watch your IQ rise as you conquer each stage.{'\n\n'}Challenge Mode: A huge board and a ticking timer—clear as many 10s as you can and smash your best IQ score!{'\n\n'}Get ready to sharpen your mind and become the ultimate Daycare Dash master! 🧩✨
              </Text>
              <View style={{ alignItems: 'flex-end' }}>
                <TouchableOpacity 
                  onPress={() => setShowGuide(false)} 
                  style={{ 
                    paddingVertical: 8, 
                    paddingHorizontal: 12,
                    minWidth: 44,
                    minHeight: 44,
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Text style={{ 
                    color: '#F26D21', 
                    fontWeight: '700' 
                  }}>
                    Got it!
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </ImageBackground>
  );
}