/**
 * Profile & Settings Screen - User preferences and app settings
 * Purpose: Manage user profile, app settings, and data
 * Extend: Add themes, export/import, achievements, or social features
 */

import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  ScrollView,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGameStore } from '../store/gameStore';

export default function ProfileScreen() {
  const { 
    userData, 
    gameData, 
    settings, 
    updateSettings, 
    resetDemoData 
  } = useGameStore();

  const handleResetData = () => {
    Alert.alert(
      'Reset Demo Data',
      'This will permanently delete all your progress, scores, and settings. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: () => {
            resetDemoData();
            Alert.alert('Success', 'Demo data has been reset.');
          }
        }
      ]
    );
  };

  const handleAboutPress = () => {
    router.push('/about');
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

  const renderToggle = (value, onPress) => (
    <TouchableOpacity
      style={[styles.toggle, value && styles.toggleActive]}
      onPress={onPress}
    >
      <View style={[styles.toggleThumb, value && styles.toggleThumbActive]} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile & Settings</Text>
        </View>

        {/* User Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Progress</Text>
          
          <View style={styles.statCard}>
            <View style={styles.statRow}>
              <Ionicons name="school" size={24} color="#4CAF50" />
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Best Level</Text>
                <Text style={styles.statValue}>
                  {gameData?.maxLevel > 200 
                    ? `Level 200+${gameData.maxLevel - 200}` 
                    : `Level ${gameData?.maxLevel || 0}`
                  }
                </Text>
              </View>
            </View>
            
            <View style={styles.statRow}>
              <Ionicons name="timer" size={24} color="#FF9800" />
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Best Challenge IQ</Text>
                <Text style={styles.statValue}>{gameData?.maxScore || 0}</Text>
                <Text style={styles.statSubtitle}>
                  {getIQTitle(gameData?.maxScore || 0)}
                </Text>
              </View>
            </View>
            
            <View style={styles.statRow}>
              <Ionicons name="swap-horizontal" size={24} color="#2196F3" />
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Change Items</Text>
                <Text style={styles.statValue}>{gameData?.changeItems || 0}</Text>
              </View>
            </View>
            
            <View style={styles.statRow}>
              <Ionicons name="shuffle" size={24} color="#2196F3" />
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>SwapMaster Items</Text>
                <Text style={styles.statValue}>{gameData?.swapMasterItems || 0}</Text>
              </View>
            </View>
            
            <View style={styles.statRow}>
              <Ionicons name="git-branch" size={24} color="#9C27B0" />
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>FractalSplit Items</Text>
                <Text style={styles.statValue}>{gameData?.fractalSplitItems || 0}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          
          <View style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="volume-high" size={20} color="#666" />
                <Text style={styles.settingLabel}>Sound Effects</Text>
              </View>
              {renderToggle(
                settings?.soundEnabled,
                () => updateSettings({ soundEnabled: !settings?.soundEnabled })
              )}
            </View>
            
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="phone-portrait" size={20} color="#666" />
                <Text style={styles.settingLabel}>Haptic Feedback</Text>
              </View>
              {renderToggle(
                settings?.hapticsEnabled,
                () => updateSettings({ hapticsEnabled: !settings?.hapticsEnabled })
              )}
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleAboutPress}
          >
            <Ionicons name="information-circle" size={20} color="#4a90e2" />
            <Text style={styles.actionButtonText}>About & Help</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.dangerButton]}
            onPress={handleResetData}
          >
            <Ionicons name="refresh" size={20} color="#f44336" />
            <Text style={[styles.actionButtonText, styles.dangerButtonText]}>
              Reset Demo Data
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <View style={styles.appInfo}>
            <Text style={styles.appName}>Daycare Number Elimination</Text>
            <Text style={styles.appVersion}>Version 1.0.0</Text>
            <Text style={styles.appDescription}>
              Draw rectangles to make 10—clear the board, climb 200+ named levels, 
              or sprint for IQ in 60 seconds.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f8ff',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statContent: {
    flex: 1,
    marginLeft: 12,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 2,
  },
  statSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  settingsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ccc',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: '#4CAF50',
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dangerButton: {
    borderWidth: 1,
    borderColor: '#ffebee',
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  dangerButtonText: {
    color: '#f44336',
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  appName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  appDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
});