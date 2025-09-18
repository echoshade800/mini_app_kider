/**
 * Onboarding Screen - Welcome and tutorial for new users
 * Purpose: Introduce game mechanics with guided demo
 * Extend: Add more tutorial steps, video demos, or interactive guides
 */

import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { UnifiedGameBoard } from './components/UnifiedGameBoard';

// Tutorial board with easy 10-pairs
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
  const [completedClears, setCompletedClears] = useState(0);

  const handleTilesClear = (clearedPositions) => {
    setCompletedClears(prev => prev + 1);
    
    // After 3 successful clears, move to completion
    if (completedClears >= 2) {
      setTimeout(() => {
        setStep(3);
      }, 1000);
    }
  };

  const handleGetStarted = () => {
    router.replace('/');
  };

  const handleSkip = () => {
    router.replace('/');
  };

  if (step === 1) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.welcomeContainer}>
            <Ionicons name="school" size={80} color="#4CAF50" />
            <Text style={styles.welcomeTitle}>Welcome to</Text>
            <Text style={styles.appTitle}>Daycare Number Elimination</Text>
            
            <Text style={styles.valueProposition}>
              Draw rectangles to make 10—clear the board, climb 200+ named levels, 
              or sprint for IQ in 60 seconds.
            </Text>
            
            <View style={styles.features}>
              <View style={styles.feature}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.featureText}>200+ named educational stages</Text>
              </View>
              <View style={styles.feature}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.featureText}>60-second IQ challenge mode</Text>
              </View>
              <View style={styles.feature}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.featureText}>Tactile rectangle drawing gameplay</Text>
              </View>
              <View style={styles.feature}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.featureText}>Local storage - no internet required</Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={() => setStep(2)}
            >
              <Text style={styles.primaryButtonText}>Learn How to Play</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={handleSkip}
            >
              <Text style={styles.secondaryButtonText}>Skip Tutorial</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (step === 2) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.tutorialHeader}>
          <Text style={styles.tutorialTitle}>Interactive Tutorial</Text>
          <TouchableOpacity onPress={handleSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.tutorialContent}>
          <Text style={styles.instructionTitle}>How to Play</Text>
          
          <View style={styles.instructions}>
            <View style={styles.instruction}>
              <Text style={styles.instructionNumber}>1</Text>
              <Text style={styles.instructionText}>
                Draw a rectangle by dragging your finger across tiles
              </Text>
            </View>
            
            <View style={styles.instruction}>
              <Text style={styles.instructionNumber}>2</Text>
              <Text style={styles.instructionText}>
                The sum appears at the bottom-right of your selection
              </Text>
            </View>
            
            <View style={styles.instruction}>
              <Text style={styles.instructionNumber}>3</Text>
              <Text style={styles.instructionText}>
                If the sum equals 10, tiles turn green and clear with celebration!
              </Text>
            </View>
            
            <View style={styles.instruction}>
              <Text style={styles.instructionNumber}>4</Text>
              <Text style={styles.instructionText}>
                If not 10, tiles show blue feedback and remain on the board
              </Text>
            </View>
          </View>

          <Text style={styles.tryItTitle}>Try it yourself!</Text>
          <Text style={styles.tryItSubtitle}>
            Clear {3 - completedClears} more rectangles to continue
          </Text>

          <GameBoard 
            board={TUTORIAL_BOARD}
            onTilesClear={handleTilesClear}
            containerHeight={400}
          />

          <View style={styles.progressDots}>
            {[0, 1, 2].map((i) => (
              <View 
                key={i}
                style={[
                  styles.dot,
                  completedClears > i && styles.dotCompleted
                ]} 
              />
            ))}
          </View>

          <View style={styles.ruleBox}>
            <Ionicons name="information-circle" size={20} color="#FF9800" />
            <Text style={styles.ruleText}>
              Remember: You can only draw axis-aligned rectangles (no L-shapes)!
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Step 3 - Completion
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.completionContainer}>
        <Ionicons name="trophy" size={80} color="#FFD700" />
        <Text style={styles.completionTitle}>Excellent!</Text>
        <Text style={styles.completionText}>
          You've mastered the basics! Now you're ready to begin your educational journey.
        </Text>
        
        <View style={styles.journeyPreview}>
          <Text style={styles.journeyTitle}>Your Journey Awaits</Text>
          <Text style={styles.journeyText}>
            🍼 Start in Daycare with simple puzzles
          </Text>
          <Text style={styles.journeyText}>
            🎓 Progress through school stages
          </Text>
          <Text style={styles.journeyText}>
            💼 Advance to career challenges
          </Text>
          <Text style={styles.journeyText}>
            🚀 Reach cosmic adventures beyond reality!
          </Text>
        </View>
        
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={handleGetStarted}
        >
          <Text style={styles.primaryButtonText}>Start Your Journey</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f8ff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  welcomeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingVertical: 40,
  },
  welcomeTitle: {
    fontSize: 24,
    color: '#666',
    marginTop: 20,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  valueProposition: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 30,
  },
  features: {
    alignSelf: 'stretch',
    marginBottom: 40,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
  },
  secondaryButtonText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
  tutorialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tutorialTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  skipText: {
    fontSize: 16,
    color: '#4a90e2',
  },
  tutorialContent: {
    padding: 20,
  },
  instructionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  instructions: {
    marginBottom: 30,
  },
  instruction: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 24,
    marginRight: 12,
  },
  instructionText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  tryItTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  tryItSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 20,
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
  ruleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
  },
  ruleText: {
    flex: 1,
    fontSize: 14,
    color: '#E65100',
    marginLeft: 12,
    lineHeight: 20,
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
    marginBottom: 30,
  },
  journeyPreview: {
    alignSelf: 'stretch',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  journeyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  journeyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
    lineHeight: 24,
  },
});