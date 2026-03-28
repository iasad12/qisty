import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Linking, Alert } from 'react-native';
import { Button, Text, List, IconButton, Divider, Chip, ActivityIndicator, useTheme, Avatar } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../context/CurrencyContext';
import { useFocusEffect, useRoute, useNavigation } from '@react-navigation/native';
import { dbService } from '../services/dbService';
import { PlanWithDetails, Collection } from '../types';
import RecordCollectionModal from '../components/RecordCollectionModal';
import AddPlanModal from '../components/AddPlanModal';
import ShareReceiptModal from '../components/ShareReceiptModal';

const InstallmentDetailScreen = () => {
  const { t } = useTranslation();
  const { currency } = useCurrency();
  const route = useRoute();
  const navigation = useNavigation<any>();
  const { planId } = route.params as { planId: number };

  const [plan, setPlan] = useState<PlanWithDetails | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [recordCollectionVisible, setRecordCollectionVisible] = useState(false);
  const [editPlanVisible, setEditPlanVisible] = useState(false);
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [receiptCollection, setReceiptCollection] = useState<Collection | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const allPlans = await dbService.getPlans();
    const foundPlan = allPlans.find(p => p.id === planId);
    if (foundPlan) {
      setPlan(foundPlan);
      const colls = await dbService.getCollectionsByPlan(planId);
      setCollections(colls);
    }
    setLoading(false);
  }, [planId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const theme = useTheme();

  if (loading && !plan) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!plan) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text>{t('noItems')}</Text>
      </View>
    );
  }

  const collected = plan.deposit + (plan.months_paid * plan.monthly_installment_amount);
  const remaining = Math.max(0, plan.total_price - collected);

  // Profit calculation helper
  const calculateProfit = (amount: number) => {
    return amount * (plan.item_profit_percentage / (100 + plan.item_profit_percentage));
  };

  const totalProfit = calculateProfit(collected);
  const baseRecovered = collected - totalProfit;

  const sendAction = (type: 'whatsapp' | 'call') => {
    if (type === 'call') {
      Linking.openURL(`tel:${plan.customer_phone}`);
      return;
    }

    const monthName = new Date().toLocaleString('default', { month: 'long' });
    const message = t('reminderMessage', { 
      name: plan.customer_name, 
      item: plan.item_name, 
      amount: plan.monthly_installment_amount,
      monthName: monthName,
      installmentNumber: plan.months_paid + 1,
      totalMonths: plan.total_months,
      currency
    });
    const url = `whatsapp://send?phone=${plan.customer_phone}&text=${encodeURIComponent(message)}`;
    
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('Error', 'WhatsApp is not installed');
      }
    });
  };

  const handleMarkAsCompleted = async () => {
    Alert.alert(
      t('confirm'),
      t('markAsCompletedConfirmation'),
      [
        { text: t('cancel'), style: 'cancel' },
        { 
          text: t('confirm'), 
          onPress: async () => {
            await dbService.markPlanAsCompleted(plan.id!);
            loadData();
          } 
        }
      ]
    );
  };

  const handleDelete = async () => {
    Alert.alert(
      t('delete'),
      t('deleteConfirmation'),
      [
        { text: t('cancel'), style: 'cancel' },
        { 
          text: t('delete'), 
          style: 'destructive',
          onPress: async () => {
            await dbService.deletePlan(plan.id!);
            navigation.goBack();
          } 
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {plan.customer_image_uri ? (
              <Avatar.Image size={50} source={{ uri: plan.customer_image_uri }} style={styles.avatar} />
            ) : (
              <Avatar.Text size={50} label={plan.customer_name.substring(0, 1)} style={styles.avatar} />
            )}
            <View>
              <Text variant="headlineSmall">{plan.customer_name}</Text>
              <Text variant="bodyLarge" style={styles.subText}>{plan.item_name}</Text>
              <Text variant="bodySmall" style={styles.subText}>
                {t('startedOn')}: {new Date(plan.start_date).toLocaleDateString()} {new Date(plan.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
          <Chip mode="outlined" selectedColor={plan.status === 'completed' ? '#4CAF50' : '#2196F3'}>
            {plan.status === 'completed' ? t('filterCompleted') : t('filterActive')}
          </Chip>
        </View>

        <Divider style={styles.divider} />

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text variant="labelSmall" style={styles.statLabel}>{t('totalPrice')}</Text>
            <Text variant="bodyLarge">{currency} {plan.total_price.toLocaleString()}</Text>
          </View>
          <View style={styles.statItem}>
            <Text variant="labelSmall" style={styles.statLabel}>{t('deposit')}</Text>
            <Text variant="bodyLarge">{currency} {plan.deposit.toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text variant="labelSmall" style={styles.statLabel}>{t('monthlyInstallment')}</Text>
            <Text variant="bodyLarge">{currency} {plan.monthly_installment_amount.toLocaleString()}</Text>
          </View>
          <View style={styles.statItem}>
            <Text variant="labelSmall" style={styles.statLabel}>{t('months')}</Text>
            <Text variant="bodyLarge">{plan.months_paid} / {plan.total_months}</Text>
          </View>
        </View>

        <View style={[styles.summaryRow, { backgroundColor: theme.colors.surfaceVariant }]}>
          <View style={styles.statItem}>
            <Text variant="labelSmall" style={styles.statLabel}>{t('totalCollected')}</Text>
            <Text variant="bodyLarge" style={styles.receivedText}>{currency} {collected.toLocaleString()}</Text>
          </View>
          <View style={styles.statItem}>
            <Text variant="labelSmall" style={styles.statLabel}>{t('totalRemaining')}</Text>
            <Text variant="bodyLarge" style={styles.warningText}>{currency} {remaining.toLocaleString()}</Text>
          </View>
        </View>

        <View style={[styles.summaryRow, { backgroundColor: theme.colors.surfaceVariant, marginTop: -8 }]}>
          <View style={styles.statItem}>
            <Text variant="labelSmall" style={styles.statLabel}>{t('totalProfit')}</Text>
            <Text variant="bodyLarge" style={styles.successText}>{currency} {Math.round(totalProfit).toLocaleString()}</Text>
          </View>
          <View style={styles.statItem}>
            <Text variant="labelSmall" style={styles.statLabel}>{t('baseAmount')}</Text>
            <Text variant="bodyLarge">{currency} {Math.round(baseRecovered).toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <IconButton icon="whatsapp" iconColor="#25D366" mode="contained-tonal" onPress={() => sendAction('whatsapp')} />
          <IconButton icon="phone" iconColor="#2196F3" mode="contained-tonal" onPress={() => sendAction('call')} />
          <Button mode="contained" onPress={() => setRecordCollectionVisible(true)} style={styles.flexBtn}>
            {t('recordCollection')}
          </Button>
        </View>

        <Divider style={styles.divider} />

        <Text variant="titleMedium" style={styles.historyTitle}>{t('installmentHistory')}</Text>
        {collections.length === 0 ? (
          <Text style={styles.emptyText}>{t('noCollectionsYet')}</Text>
        ) : (
          collections.map((item) => {
            const itemProfit = calculateProfit(item.amount_collected);
            const baseAmount = item.amount_collected - itemProfit;
            const dateObj = new Date(item.collection_date);
            const dateStr = dateObj.toLocaleDateString();
            const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            return (
              <List.Item
                key={item.id}
                title={`PKR ${item.amount_collected.toLocaleString()}`}
                description={`${t('profit')}: PKR ${Math.round(itemProfit).toLocaleString()}\n${t('baseAmount')}: PKR ${Math.round(baseAmount).toLocaleString()}\n${dateStr}\n${timeStr}`}
                descriptionNumberOfLines={6}
                left={props => <List.Icon {...props} icon="cash-check" />}
                right={props => (
                  <View style={[styles.historyActions, props.style]}>
                    <IconButton 
                      {...props} 
                      icon="receipt-text-outline" 
                      onPress={() => {
                        setReceiptCollection(item);
                        setReceiptModalVisible(true);
                      }} 
                    />
                    <IconButton 
                      {...props} 
                      icon="delete-outline" 
                      onPress={async () => {
                        await dbService.deleteCollection(item.id!);
                        loadData();
                      }} 
                    />
                  </View>
                )}
              />
            );
          })
        )}

        <View style={styles.footerButtons}>
          <Button icon="receipt-text-outline" mode="outlined" onPress={() => { setReceiptCollection(null); setReceiptModalVisible(true); }} style={styles.footerBtn}>
            {t('receipt')}
          </Button>
          <Button icon="pencil" mode="outlined" onPress={() => setEditPlanVisible(true)} style={styles.footerBtn}>
            {t('editInstallment')}
          </Button>
          <Button icon="delete" mode="outlined" textColor="#F44336" onPress={handleDelete} style={styles.footerBtn}>
            {t('delete')}
          </Button>
        </View>
        {plan.status !== 'completed' && (
          <View style={styles.footerRow}>
            <Button mode="contained" onPress={handleMarkAsCompleted} style={styles.flexBtn}>
              {t('finish')}
            </Button>
          </View>
        )}
      </ScrollView>

      <RecordCollectionModal
        visible={recordCollectionVisible}
        onDismiss={() => setRecordCollectionVisible(false)}
        onSuccess={loadData}
        initialPlan={plan}
      />

      <AddPlanModal
        visible={editPlanVisible}
        onDismiss={() => setEditPlanVisible(false)}
        onSuccess={loadData}
        initialPlan={plan}
      />

      <ShareReceiptModal
        visible={receiptModalVisible}
        onDismiss={() => setReceiptModalVisible(false)}
        plan={plan}
        collection={receiptCollection}
        collections={collections}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    marginRight: 12,
  },
  subText: {
    opacity: 0.7,
  },
  divider: {
    marginVertical: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    opacity: 0.6,
    marginBottom: 2,
  },
  receivedText: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  successText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  warningText: {
    color: '#FF9800',
    fontWeight: 'bold',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 8,
  },
  flexBtn: {
    flex: 1,
  },
  historyTitle: {
    marginBottom: 8,
  },
  emptyText: {
    opacity: 0.6,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 12,
  },
  historyActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerButtons: {
    marginTop: 24,
    gap: 12,
    paddingBottom: 24,
  },
  footerRow: {
    marginTop: -12,
    paddingBottom: 24,
  },
  footerBtn: {
    flex: 1,
  },
});

export default InstallmentDetailScreen;
