import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  SafeAreaView,
  Alert 
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGameStore } from './store/gameStore';
import { Badge } from './components/Badge';
import { SettingsModal } from './components/SettingsModal';

export default function HomeScreen() {
  const { 
    user, 
    progress, 
    challenge, 
    initializeUser, 
    isLoading 
  } = useGameStore();
  
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    initializeUser();
  }, []);

  const handleStartLevel = () => {
    if (!user) {
      router.push('/onboarding');
      return;
    }
    
    const nextLevel = progress.bestLevel + 1;
    router.push(`/level/${nextLevel}`);
  };

  const handleStartChallenge = () => {
    if (!user) {
      router.push('/onboarding');
      return;
    }
    
    router.push('/challenge');
  };

  const getLevelName = (level) => {
    if (level <= 200) {
      return `Level ${level}`;
    }
    return `Level 200+${level - 200}`;
  };

  const getStageName = (level) => {
    if (level <= 200) {
      // This would typically come from the API, but for display we'll show a placeholder
      return level > 0 ? 'Adventure Awaits' : 'Start Your Journey';
    }
    return `The Last Horizon+${level - 200}`;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Top bar with settings */}
      <View style={styles.topBar}>
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => setShowSettings(true)}
        >
          <Ionicons name="settings" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Badges */}
      <View style={styles.badgesContainer}>
        <Badge
          title={getLevelName(progress.bestLevel)}
          subtitle={getStageName(progress.bestLevel)}
          backgroundColor="#4CAF50"
        />
        <Badge
          title={`IQ ${challenge.bestIQ}`}
          subtitle={challenge.bestIQTitle || 'Not Challenged Yet'}
          backgroundColor="#FF9800"
        />
      </View>

      {/* Main content */}
      <View style={styles.content}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Daycare Number Elimination</Text>
          <Text style={styles.subtitle}>
            Clear tiles by drawing rectangles summing to 10 — climb 200+ school-life levels or sprint in a 60s IQ Challenge.
          </Text>
        </View>

        <View style={styles.buttonsContainer}>
          <TouchableOpacity 
            style={[styles.mainButton, styles.levelButton]}
            onPress={handleStartLevel}
          >
            <Ionicons name="school" size={32} color="white" />
            <Text style={styles.buttonText}>Start Level Mode</Text>
            <Text style={styles.buttonSubtext}>
              Continue your educational journey
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.mainButton, styles.challengeButton]}
            onPress={handleStartChallenge}
          >
            <Ionicons name="timer" size={32} color="white" />
            <Text style={styles.buttonText}>Start Challenge Mode</Text>
            <Text style={styles.buttonSubtext}>
              60-second IQ sprint
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <SettingsModal 
        visible={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f8ff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  settingsButton: {
    padding: 12,
  },
  badgesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginVertical: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  buttonsContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 20,
  },
  mainButton: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  levelButton: {
    backgroundColor: '#4CAF50',
  },
  challengeButton: {
    backgroundColor: '#FF5722',
  },
  buttonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  buttonSubtext: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    textAlign: 'center',
  },
});