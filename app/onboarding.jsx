import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  SafeAreaView 
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GameBoard } from './components/GameBoard';

const TUTORIAL_BOARD = {
  width: 4,
  height: 4,
  tiles: [
    1, 9, 0, 0,
    2, 8, 0, 0,
    0, 0, 3, 7,
    0, 0, 4, 6
  ]
};

export default function OnboardingScreen() {
  const [step, setStep] = useState(1);
  const [completedSelections, setCompletedSelections] = useState([]);

  const handleTilesClear = (tilePositions) => {
    setCompletedSelections(prev => [...prev, tilePositions]);
    
    if (completedSelections.length >= 3) {
      // Tutorial complete
      setTimeout(() => {
        setStep(2);
      }, 1000);
    }
  };

  const handleGetStarted = () => {
    router.replace('/');
  };

  if (step === 2) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.completionContainer}>
          <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
          <Text style={styles.completionTitle}>Great Job!</Text>
          <Text style={styles.completionText}>
            You've mastered the basics! Now you're ready to begin your educational journey.
          </Text>
          <Text style={styles.motivationalText}>
            From daycare to college graduation, level up step by step! 🚀 Careers, life stages, sci-fi adventures, and cosmic challenges await—endless surprises to experience!
          </Text>
          <TouchableOpacity 
            style={styles.getStartedButton}
            onPress={handleGetStarted}
          >
            <Text style={styles.getStartedText}>Get Started</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Learn to Play</Text>
        <TouchableOpacity 
          style={styles.helpButton}
          onPress={() => {/* Show rules modal */}}
        >
          <Ionicons name="information-circle" size={24} color="#4a90e2" />
        </TouchableOpacity>
      </View>

      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionTitle}>Draw Rectangles to Clear Tiles</Text>
        <Text style={styles.instruction}>
          1. Draw a rectangle by dragging your finger
        </Text>
        <Text style={styles.instruction}>
          2. The sum appears at the bottom-right of your selection
        </Text>
        <Text style={styles.instruction}>
          3. If the sum equals 10, tiles will turn green and clear!
        </Text>
        <Text style={styles.instruction}>
          4. If not, they'll turn blue briefly and stay
        </Text>
        <Text style={styles.ruleText}>
          ⚠️ Remember: You can only draw axis-aligned rectangles!
        </Text>
      </View>

      <GameBoard 
        board={TUTORIAL_BOARD}
        onTilesClear={handleTilesClear}
      />

      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>
          Clear {Math.max(0, 4 - completedSelections.length)} more rectangles to continue
        </Text>
        <View style={styles.progressDots}>
          {[0, 1, 2, 3].map((i) => (
            <View 
              key={i}
              style={[
                styles.dot,
                completedSelections.length > i && styles.dotCompleted
              ]} 
            />
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f8ff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  helpButton: {
    padding: 8,
  },
  instructionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  instructionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  instruction: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
    lineHeight: 24,
  },
  ruleText: {
    fontSize: 14,
    color: '#FF5722',
    marginTop: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  progressContainer: {
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  progressText: {
    fontSize: 16,
    color: '#4a90e2',
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  progressDots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ddd',
  },
  dotCompleted: {
    backgroundColor: '#4CAF50',
  },
  completionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  completionTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 20,
    marginBottom: 16,
  },
  completionText: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 20,
  },
  motivationalText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    fontStyle: 'italic',
  },
  getStartedButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  getStartedText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});