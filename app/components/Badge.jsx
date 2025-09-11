import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function Badge({ title, subtitle, backgroundColor = '#4a90e2' }) {
  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      {subtitle && (
        <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 4,
    minWidth: 120,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  title: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    marginTop: 2,
  },
});