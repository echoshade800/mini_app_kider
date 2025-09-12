/**
 * About & Help Screen - App information, rules, and support
 * Purpose: Provide game rules, FAQ, version info, and help resources
 * Features: Game rules, IQ title tiers, FAQ, support links
 */

import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  ScrollView,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const IQ_TIERS = [
  { min: 145, title: 'Cosmic Genius', color: '#9C27B0' },
  { min: 130, title: 'Puzzle Master', color: '#673AB7' },
  { min: 115, title: 'Rising Star', color: '#3F51B5' },
  { min: 100, title: 'Everyday Scholar', color: '#2196F3' },
  { min: 85, title: 'Hardworking Student', color: '#03A9F4' },
  { min: 70, title: 'Slow but Steady', color: '#00BCD4' },
  { min: 65, title: 'Little Explorer', color: '#009688' },
  { min: 55, title: 'Learning Hatchling', color: '#4CAF50' },
  { min: 40, title: 'Tiny Adventurer', color: '#8BC34A' },
  { min: 0, title: 'Newborn Dreamer', color: '#CDDC39' },
];

const FAQ_ITEMS = [
  {
    question: 'How do I clear tiles?',
    answer: 'Draw a rectangle by dragging your finger across tiles. If the sum equals 10, the tiles will clear with a green celebration effect.'
  },
  {
    question: 'What are Change items?',
    answer: 'Change items allow you to swap any two tiles on the board. You earn +1 Change item for each level you complete.'
  },
  {
    question: 'How does Challenge Mode work?',
    answer: 'You have 60 seconds to clear as many rectangles as possible. Each clear awards +3 IQ points. New boards appear instantly after each clear.'
  },
  {
    question: 'Can I only draw rectangles?',
    answer: 'Yes! You can only select axis-aligned rectangles (no L-shapes or irregular selections). This is a core game constraint.'
  },
  {
    question: 'How many levels are there?',
    answer: 'There are 200+ named levels spanning from Daycare to Beyond Reality, plus infinite procedurally generated levels beyond Level 200.'
  },
  {
    question: 'Is internet required?',
    answer: 'No! All data is stored locally on your device. You can play completely offline.'
  }
];

export default function AboutScreen() {
  const handleBack = () => {
    router.back();
  };

  const handleSupport = () => {
    // In a real app, this would open email or support system
    Linking.openURL('mailto:support@example.com?subject=Daycare Number Elimination Support');
  };

  const renderFAQItem = (item, index) => (
    <View key={index} style={styles.faqItem}>
      <Text style={styles.faqQuestion}>{item.question}</Text>
      <Text style={styles.faqAnswer}>{item.answer}</Text>
    </View>
  );

  const renderIQTier = (tier, index) => (
    <View key={index} style={styles.tierItem}>
      <View style={[styles.tierColor, { backgroundColor: tier.color }]} />
      <View style={styles.tierContent}>
        <Text style={styles.tierTitle}>{tier.title}</Text>
        <Text style={styles.tierRange}>
          {tier.min}+ IQ Points
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBack}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>About & Help</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView}>
        {/* App Info */}
        <View style={styles.section}>
          <View style={styles.appInfo}>
            <Ionicons name="school" size={60} color="#4CAF50" />
            <Text style={styles.appName}>Daycare Number Elimination</Text>
            <Text style={styles.appVersion}>Version 1.0.0</Text>
            <Text style={styles.appDescription}>
              Draw rectangles to make 10—clear the board, climb 200+ named levels, 
              or sprint for IQ in 60 seconds.
            </Text>
          </View>
        </View>

        {/* Game Rules */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Game Rules</Text>
          <View style={styles.rulesContainer}>
            <View style={styles.rule}>
              <Ionicons name="finger-print" size={20} color="#4CAF50" />
              <Text style={styles.ruleText}>
                Draw rectangles by dragging your finger across tiles
              </Text>
            </View>
            <View style={styles.rule}>
              <Ionicons name="calculator" size={20} color="#4CAF50" />
              <Text style={styles.ruleText}>
                Rectangle sum must equal exactly 10 to clear tiles
              </Text>
            </View>
            <View style={styles.rule}>
              <Ionicons name="square" size={20} color="#4CAF50" />
              <Text style={styles.ruleText}>
                Only axis-aligned rectangles allowed (no L-shapes)
              </Text>
            </View>
            <View style={styles.rule}>
              <Ionicons name="swap-horizontal" size={20} color="#4CAF50" />
              <Text style={styles.ruleText}>
                Use Change items to swap any two tiles
              </Text>
            </View>
            <View style={styles.rule}>
              <Ionicons name="trophy" size={20} color="#4CAF50" />
              <Text style={styles.ruleText}>
                Earn +1 Change item for each completed level
              </Text>
            </View>
          </View>
        </View>

        {/* IQ Title Tiers */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Challenge Mode IQ Tiers</Text>
          <View style={styles.tiersContainer}>
            {IQ_TIERS.map(renderIQTier)}
          </View>
        </View>

        {/* FAQ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          <View style={styles.faqContainer}>
            {FAQ_ITEMS.map(renderFAQItem)}
          </View>
        </View>

        {/* Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <TouchableOpacity 
            style={styles.supportButton}
            onPress={handleSupport}
          >
            <Ionicons name="mail" size={20} color="#4a90e2" />
            <Text style={styles.supportButtonText}>Contact Support</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
          
          <View style={styles.privacyNote}>
            <Ionicons name="shield-checkmark" size={16} color="#4CAF50" />
            <Text style={styles.privacyText}>
              All data is stored locally on your device. No personal information is collected or transmitted.
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Made with ❤️ for puzzle enthusiasts
          </Text>
          <Text style={styles.copyright}>
            © 2024 Daycare Number Elimination
          </Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
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
  appInfo: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  appDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  rulesContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rule: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  ruleText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
    lineHeight: 20,
  },
  tiersContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tierItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tierColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  tierContent: {
    flex: 1,
  },
  tierTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  tierRange: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  faqContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  faqItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  supportButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E8F5E8',
    padding: 12,
    borderRadius: 8,
  },
  privacyText: {
    flex: 1,
    fontSize: 12,
    color: '#2E7D32',
    marginLeft: 8,
    lineHeight: 16,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  copyright: {
    fontSize: 12,
    color: '#999',
  },
});