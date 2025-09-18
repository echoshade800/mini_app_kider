import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Modal,
  StyleSheet 
} from 'react-native';

const RescueModal = ({ visible, onContinue, onReturn }) => {
  return (
    <Modal 
      visible={visible} 
      transparent 
      animationType="fade"
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Need Help?</Text>
          <Text style={styles.modalText}>
            No valid moves found. You can use items to help or return to menu.
          </Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.continueButton}
              onPress={onContinue}
            >
              <Text style={styles.continueButtonText}>Use Items</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.returnButton}
              onPress={onReturn}
            >
              <Text style={styles.returnButtonText}>Return to Menu</Text>
            </TouchableOpacity>
          </View>
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
    padding: 24,
  },
  modalContent: {
    width: '90%',
    borderRadius: 20,
    backgroundColor: '#FFF8DC',
    borderWidth: 3,
    borderColor: '#D2691E',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#8B4513',
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  continueButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#388E3C',
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  returnButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#FF8C42',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E67E22',
    alignItems: 'center',
  },
  returnButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default RescueModal;