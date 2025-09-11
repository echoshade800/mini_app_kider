import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export function FuseTimer({ duration, onComplete, isPaused = false }) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const animationRef = useRef();

  useEffect(() => {
    if (isPaused) {
      if (animationRef.current) {
        animationRef.current.stop();
      }
      return;
    }

    animationRef.current = Animated.timing(animatedValue, {
      toValue: 1,
      duration: duration,
      useNativeDriver: false,
    });

    animationRef.current.start(({ finished }) => {
      if (finished && onComplete) {
        onComplete();
      }
    });

    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, [duration, isPaused, onComplete]);

  const fuseWidth = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['100%', '0%'],
    extrapolate: 'clamp',
  });

  const fuseColor = animatedValue.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: ['#4CAF50', '#FF9800', '#F44336'],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <Ionicons name="time" size={32} color="#FF5722" />
      <View style={styles.fuseContainer}>
        <Animated.View
          style={[
            styles.fuse,
            {
              width: fuseWidth,
              backgroundColor: fuseColor,
            },
          ]}
        />
      </View>
      <View style={styles.spark} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  fuseContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#FFCCBC',
    borderRadius: 4,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  fuse: {
    height: '100%',
    borderRadius: 4,
  },
  spark: {
    width: 6,
    height: 6,
    backgroundColor: '#FFC107',
    borderRadius: 3,
    shadowColor: '#FFC107',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 5,
  },
});