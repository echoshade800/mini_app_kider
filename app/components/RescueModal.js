/**
 * Rescue Modal Component - No combos left rescue interface
 * Purpose: Provide rescue options when no valid combinations exist
 */

import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export function RescueModal({ 
  visible, 
  onContinue, 
  onReturn,
  hasItems = false 
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
    >
      <View style={styles.modalOverlay}>
        <View style={styles.rescueModal}>
          <Ionicons name="warning" size={60} color="#FF9800" />
          <Text style={styles.rescueTitle}>No Combos Left!</Text>
          
          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={[
                styles.modalButton,
                styles.continueButton,
                !hasItems && styles.disabledButton
              ]}
              onPress={onContinue}
              disabled={!hasItems}
            >
              <Text style={[
                styles.modalButtonText,
                styles.continueButtonText,
                !hasItems && styles.disabledButtonText
              ]}>
                Continue
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalButton, styles.returnButton]}
              onPress={onReturn}
            >
              <Text style={[styles.modalButtonText, styles.returnButtonText]}>
                Return
              </Text>
            </TouchableOpacity>
          </View>
          
          {!hasItems && (
            <Text style={styles.noItemsText}>
              No items available to continue
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rescueModal: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    width: '80%',
    maxWidth: 350,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  rescueTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  continueButton: {
    backgroundColor: '#4CAF50',
  },
  returnButton: {
    backgroundColor: '#f44336',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  continueButtonText: {
    color: 'white',
  },
  returnButtonText: {
    color: 'white',
  },
  disabledButtonText: {
    color: '#999',
  },
  noItemsText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
});