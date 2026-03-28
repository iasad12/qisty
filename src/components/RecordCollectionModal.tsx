import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Alert, Modal, SafeAreaView } from 'react-native';
import { TextInput, Button, Portal, Dialog, List, Text, Divider, useTheme, Avatar } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../context/CurrencyContext';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { dbService } from '../services/dbService';
import { PlanWithDetails, Collection, Customer } from '../types';

interface RecordCollectionModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSuccess: () => void;
  initialPlan?: PlanWithDetails | null;
}

const RecordCollectionModal: React.FC<RecordCollectionModalProps> = ({ visible, onDismiss, onSuccess, initialPlan }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { currency } = useCurrency();
  const [plans, setPlans] = useState<PlanWithDetails[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<PlanWithDetails | null>(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const receiptRef = useRef<any>(null);

  useEffect(() => {
    if (visible) {
      if (initialPlan) {
        setSelectedPlan(initialPlan);
        setAmount(initialPlan.monthly_installment_amount.toString());
        loadCollections(initialPlan.id!);
        loadCustomer(initialPlan.customer_id);
      } else {
        loadPlans();
      }
    } else {
      setSelectedPlan(null);
      setAmount('');
      setShowReceipt(false);
      setCollections([]);
      setCustomer(null);
    }
  }, [visible, initialPlan]);

  const loadPlans = async () => {
    const p = await dbService.getPlans();
    setPlans(p.filter(plan => plan.status === 'active'));
  };

  const loadCollections = async (planId: number) => {
    const colls = await dbService.getCollectionsByPlan(planId);
    setCollections(colls);
  };

  const loadCustomer = async (customerId: number) => {
    const allCustomers = await dbService.getCustomers();
    const found = allCustomers.find(c => c.id === customerId);
    if (found) setCustomer(found);
  };

  const handleSave = async () => {
    if (!selectedPlan || !amount) return;
    setLoading(true);
    try {
      const newCollection = {
        plan_id: selectedPlan.id!,
        amount_collected: parseFloat(amount),
        collection_date: new Date().toISOString(),
      };
      await dbService.addCollection(newCollection);
      
      // Refresh collections to include the new one for the receipt
      await loadCollections(selectedPlan.id!);
      
      setShowReceipt(true);
      onSuccess();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to record collection');
    } finally {
      setLoading(false);
    }
  };

  const shareReceipt = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Media library permission is required to save the receipt');
        return;
      }

      if (!receiptRef.current) return;
      const uri = await receiptRef.current.capture();

      await MediaLibrary.saveToLibraryAsync(uri);
      await Sharing.shareAsync(uri);
      onDismiss();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to generate receipt');
    }
  };

  // Calculate cumulative values for the receipt
  const cumulativeCollected = selectedPlan ? selectedPlan.deposit + collections.reduce((sum, c) => sum + c.amount_collected, 0) : 0;
  const remaining = selectedPlan ? Math.max(0, selectedPlan.total_price - cumulativeCollected) : 0;

  if (showReceipt && selectedPlan) {
    return (
      <Modal visible={visible} onRequestClose={onDismiss} animationType="slide">
        <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
          <View style={styles.headerRow}>
            <Text variant="titleLarge" style={styles.headerTitle}>{t('receipt') || 'Receipt'}</Text>
          </View>
          <ScrollView style={styles.flex} contentContainerStyle={styles.receiptContainer} showsVerticalScrollIndicator={false}>
            <ViewShot ref={receiptRef} options={{ format: 'png', quality: 1 }}>
              <View collapsable={false} style={[styles.receiptView, { backgroundColor: theme.colors.surfaceVariant }]}>
                <Text style={styles.receiptTitle}>QISTY RECEIPT</Text>
                
                <View style={styles.customerHeader}>
                  {customer?.image_uri ? (
                    <Avatar.Image size={50} source={{ uri: customer.image_uri }} style={styles.avatar} />
                  ) : (
                    <Avatar.Text size={50} label={selectedPlan.customer_name.substring(0, 1)} style={styles.avatar} />
                  )}
                  <View style={styles.customerInfo}>
                    <Text variant="titleMedium" style={styles.bold}>{selectedPlan.customer_name}</Text>
                    <Text variant="bodySmall" style={styles.subText}>{selectedPlan.customer_phone}</Text>
                  </View>
                </View>

                <Divider style={styles.receiptDivider} />
                
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>{t('items')}:</Text>
                  <Text style={styles.receiptValue}>{selectedPlan.item_name}</Text>
                </View>

                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>{t('amount')}:</Text>
                  <Text style={styles.receiptValue}>{currency} {parseFloat(amount).toLocaleString()}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>{t('date')}:</Text>
                  <Text style={styles.receiptValue}>
                    {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </Text>
                </View>

                <Divider style={styles.receiptDivider} />

                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>{t('months')}:</Text>
                  <Text style={styles.receiptValue}>{collections.length} / {selectedPlan.total_months}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>{t('totalCollected')}:</Text>
                  <Text style={styles.receiptValue}>{currency} {cumulativeCollected.toLocaleString()}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>{t('totalRemaining')}:</Text>
                  <Text style={[styles.receiptValue, { color: '#FF9800' }]}>
                    {currency} {remaining.toLocaleString()}
                  </Text>
                </View>

                <Divider style={styles.receiptDivider} />
                <Text style={styles.receiptFooter}>Thank you for your business!</Text>
              </View>
            </ViewShot>
          </ScrollView>
          <View style={styles.actions}>
            <Button onPress={onDismiss}>{t('finish')}</Button>
            <Button onPress={shareReceipt} icon="share-variant">{t('share')}</Button>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title>{t('recordCollection')}</Dialog.Title>
        <Dialog.Content>
          {!selectedPlan ? (
            <ScrollView style={styles.list}>
              {plans.map(p => (
                <List.Item
                  key={p.id}
                  title={p.customer_name}
                  description={`${p.item_name} - ${currency} ${p.monthly_installment_amount}`}
                  onPress={() => {
                    setSelectedPlan(p);
                    setAmount(p.monthly_installment_amount.toString());
                    loadCollections(p.id!);
                    loadCustomer(p.customer_id);
                  }}
                  left={props => <List.Icon {...props} icon="calendar-clock" />}
                />
              ))}
              {plans.length === 0 && <Text>{t('noItems')}</Text>}
            </ScrollView>
          ) : (
            <View>
              <Text variant="titleMedium">{selectedPlan.customer_name}</Text>
              <Text variant="bodyMedium">{selectedPlan.item_name}</Text>
              <Divider style={styles.divider} />
              
              <TextInput
                label={t('amount')}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                mode="outlined"
                style={styles.input}
              />
              <Text variant="bodySmall">
                {t('months')}: {selectedPlan.months_paid} / {selectedPlan.total_months}
              </Text>
            </View>
          )}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>{t('cancel')}</Button>
          {selectedPlan && (
            <Button onPress={handleSave} loading={loading} disabled={loading}>{t('save')}</Button>
          )}
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  headerRow: {
    padding: 16,
    paddingTop: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
  },
  dialog: {
    maxHeight: '80%',
  },
  list: {
    maxHeight: 300,
  },
  input: {
    marginBottom: 12,
  },
  divider: {
    marginVertical: 12,
  },
  receiptContainer: {
    alignItems: 'center',
    padding: 20,
    paddingBottom: 40,
  },
  receiptView: {
    width: '100%',
    padding: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
  },
  receiptTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: '#2196F3',
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    marginRight: 12,
  },
  customerInfo: {
    flex: 1,
  },
  bold: {
    fontWeight: 'bold',
  },
  subText: {
    opacity: 0.7,
  },
  receiptDivider: {
    marginVertical: 12,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  receiptLabel: {
    fontWeight: 'bold',
    opacity: 0.7,
  },
  receiptValue: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  receiptFooter: {
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
    opacity: 0.6,
  },
});

export default RecordCollectionModal;
