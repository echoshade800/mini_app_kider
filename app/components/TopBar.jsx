import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export function TopBar({ 
  onSettingsPress, 
  title, 
  subtitle, 
  showProgress = false, 
  progressPercent = 0,
  rightText = null
}) {
  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.settingsButton} 
        onPress={onSettingsPress}
      >
        <Ionicons name="settings" size={24} color="#666" />
      </TouchableOpacity>
      
      <View style={styles.centerContent}>
        {showProgress && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[styles.progressFill, { width: `${progressPercent}%` }]} 
              />
            </View>
            <Ionicons name="person" size={16} color="#4a90e2" style={styles.personIcon} />
            <Ionicons name="book" size={16} color="#4a90e2" />
          </View>
        )}
        
        {title && (
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        )}
        
        {subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      
      <View style={styles.rightContent}>
        {rightText && (
          <Text style={styles.rightText} numberOfLines={1}>
            {rightText}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    minHeight: 60,
  },
  settingsButton: {
    padding: 8,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressBar: {
    width: 100,
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    marginRight: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4a90e2',
    borderRadius: 3,
  },
  personIcon: {
    marginRight: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 2,
  },
  rightContent: {
    minWidth: 60,
    alignItems: 'flex-end',
  },
  rightText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4a90e2',
  },
});