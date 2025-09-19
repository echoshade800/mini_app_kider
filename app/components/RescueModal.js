/**
 * Rescue Modal Component - Show rescue options when player is stuck
 * Purpose: Offer help options or return to menu when no valid moves available
 */

import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Modal,
  StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const RescueModal = ({ 
  visible, 
  onContinue, 
  onReturn
}) => {
  return (
    <Modal 
      visible={visible} 
      transparent 
      animationType="fade"
      onRequestClose={onReturn}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.iconContainer}>
            <Ionicons name="help-circle" size={60} color="#FF9800" />
          </View>
          
          <Text style={styles.title}>No Valid Moves</Text>
          <Text style={styles.message}>
            No valid combinations remain on the board. You can choose to:
          </Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.continueButton]}
              onPress={onContinue}
            >
              <Ionicons name="construct" size={20} color="white" />
              <Text style={styles.buttonText}>Generate New Board</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.returnButton]}
              onPress={onReturn}
            >
              <Ionicons name="home" size={20} color="white" />
              <Text style={styles.buttonText}>Return to Home</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={onReturn}
          >
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
    minWidth: 280,
    maxWidth: 320,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  continueButton: {
    backgroundColor: '#4CAF50',
  },
  returnButton: {
    backgroundColor: '#FF9800',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 8,
  },
});

export default RescueModal;