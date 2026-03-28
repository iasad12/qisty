import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, Alert, Image, ScrollView, Modal, SafeAreaView } from 'react-native';
import { Button, Text, Divider, useTheme, Avatar } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../context/CurrencyContext';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dbService } from '../services/dbService';
import { PlanWithDetails, Collection, Customer } from '../types';

interface ShareReceiptModalProps {
  visible: boolean;
  onDismiss: () => void;
  plan: PlanWithDetails | null;
  collection?: Collection | null;
  collections?: Collection[];
}

const ShareReceiptModal: React.FC<ShareReceiptModalProps> = ({ visible, onDismiss, plan, collection, collections = [] }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { currency } = useCurrency();
  const receiptRef = useRef<any>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [businessName, setBusinessName] = useState('');

  useEffect(() => {
    if (visible && plan) {
      loadCustomer();
      loadSettings();
    }
  }, [visible, plan]);

  const loadSettings = async () => {
    try {
      const name = await AsyncStorage.getItem('settings.businessName');
      if (name) setBusinessName(name);
    } catch (e) {
      console.warn('Error loading settings:', e);
    }
  };

  const loadCustomer = async () => {
    if (!plan) return;
    const allCustomers = await dbService.getCustomers();
    const foundCustomer = allCustomers.find(c => c.id === plan.customer_id);
    if (foundCustomer) {
      setCustomer(foundCustomer);
    }
  };

  if (!plan) return null;

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

  const isFullSummary = !collection;

  // Calculate cumulative values for single collection receipt
  let cumulativeCollected = plan.deposit;
  let monthsAtThatTime = 0;
  if (collection) {
    const sortedColls = collections
      .slice()
      .sort((a, b) => new Date(a.collection_date).getTime() - new Date(b.collection_date).getTime());
    
    for (const coll of sortedColls) {
      cumulativeCollected += coll.amount_collected;
      monthsAtThatTime++;
      if (coll.id === collection.id) break;
    }
  }

  return (
    <Modal visible={visible} onRequestClose={onDismiss} animationType="slide" transparent={false}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <View style={styles.headerRow}>
          <Text variant="titleLarge" style={styles.headerTitle}>{t('receipt') || 'Receipt'}</Text>
        </View>
        <ScrollView style={styles.dialogContent} contentContainerStyle={styles.receiptContainer} showsVerticalScrollIndicator={false}>
          <ViewShot ref={receiptRef} options={{ format: 'png', quality: 1 }}>
            <View collapsable={false} style={[styles.receiptView, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Text style={styles.receiptTitle}>
                {businessName ? businessName.toUpperCase() : 'QISTY RECEIPT'}
              </Text>
                
                <View style={styles.customerHeader}>
                  {customer?.image_uri ? (
                    <Avatar.Image size={50} source={{ uri: customer.image_uri }} style={styles.avatar} />
                  ) : (
                    <Avatar.Text size={50} label={plan.customer_name.substring(0, 1)} style={styles.avatar} />
                  )}
                  <View style={styles.customerInfo}>
                    <Text variant="titleMedium" style={styles.bold}>{plan.customer_name}</Text>
                    <Text variant="bodySmall" style={styles.subText}>{plan.customer_phone}</Text>
                  </View>
                </View>

                <Divider style={styles.receiptDivider} />
                
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>{t('items')}:</Text>
                  <Text style={styles.receiptValue}>{plan.item_name}</Text>
                </View>

                {isFullSummary ? (
                  <>
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>{t('totalPrice')}:</Text>
                      <Text style={styles.receiptValue}>{currency} {plan.total_price.toLocaleString()}</Text>
                    </View>
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>{t('deposit')}:</Text>
                      <Text style={styles.receiptValue}>{currency} {plan.deposit.toLocaleString()}</Text>
                    </View>
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>{t('months')}:</Text>
                      <Text style={styles.receiptValue}>{plan.months_paid} / {plan.total_months}</Text>
                    </View>

                    {collections.length > 0 && (
                      <>
                        <Divider style={styles.receiptDivider} />
                        <Text style={[styles.receiptLabel, { marginBottom: 8 }]}>{t('installmentHistory') || 'Installment History'}:</Text>
                        {collections
                          .slice()
                          .sort((a, b) => new Date(a.collection_date).getTime() - new Date(b.collection_date).getTime())
                          .map((col, index) => (
                            <View key={col.id || index} style={styles.receiptRow}>
                              <Text style={styles.subText}>
                                {new Date(col.collection_date).toLocaleDateString()} {new Date(col.collection_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </Text>
                              <Text style={styles.receiptValue}>{currency} {col.amount_collected.toLocaleString()}</Text>
                            </View>
                          ))}
                      </>
                    )}

                    <Divider style={styles.receiptDivider} />
                    
                    <View style={styles.receiptRowStack}>
                      <Text style={styles.receiptLabel}>{t('totalRemaining')}:</Text>
                      <Text style={[styles.receiptValue, { color: '#FF9800' }]}>
                        {currency} {Math.max(0, plan.total_price - (plan.deposit + (plan.months_paid * plan.monthly_installment_amount))).toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>{t('status') || 'Status'}:</Text>
                      <Text style={[styles.receiptValue, { color: plan.status === 'completed' ? '#4CAF50' : '#2196F3' }]}>
                        {plan.status === 'completed' ? t('filterCompleted') : t('filterActive')}
                      </Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>{t('amount')}:</Text>
                      <Text style={styles.receiptValue}>{currency} {collection.amount_collected.toLocaleString()}</Text>
                    </View>
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>{t('date')}:</Text>
                      <Text style={styles.receiptValue}>
                        {new Date(collection.collection_date).toLocaleDateString()} {new Date(collection.collection_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </Text>
                    </View>

                    <Divider style={styles.receiptDivider} />

                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>{t('months')}:</Text>
                      <Text style={styles.receiptValue}>{monthsAtThatTime} / {plan.total_months}</Text>
                    </View>
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>{t('totalCollected')}:</Text>
                      <Text style={styles.receiptValue}>{currency} {cumulativeCollected.toLocaleString()}</Text>
                    </View>
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>{t('totalRemaining')}:</Text>
                      <Text style={[styles.receiptValue, { color: '#FF9800' }]}>
                        {currency} {Math.max(0, plan.total_price - cumulativeCollected).toLocaleString()}
                      </Text>
                    </View>
                  </>
                )}

                <Divider style={styles.receiptDivider} />
                <Text style={styles.receiptFooter}>Thank you for your business!</Text>
            </View>
          </ViewShot>
        </ScrollView>
        <View style={styles.actions}>
          <Button onPress={onDismiss}>{t('cancel')}</Button>
          <Button onPress={shareReceipt} icon="share-variant">{t('share')}</Button>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
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
  dialogContent: {
    flex: 1,
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
  receiptRowStack: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  receiptLabel: {
    fontWeight: 'bold',
    opacity: 0.7,
    marginBottom: 2,
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

export default ShareReceiptModal;
