import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Linking, Alert, Modal, SafeAreaView, I18nManager } from 'react-native';
import { Text, FAB, Card, List, Button, IconButton, Avatar, Portal, Dialog, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../context/CurrencyContext';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AddCustomerModal from '../components/AddCustomerModal';
import AddItemModal from '../components/AddItemModal';
import AddPlanModal from '../components/AddPlanModal';
import RecordCollectionModal from '../components/RecordCollectionModal';
import { dbService } from '../services/dbService';
import { PlanWithDetails, Customer, CollectionWithDetails } from '../types';

const HomeScreen = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { currency } = useCurrency();
  const navigation = useNavigation<any>();
  const [stats, setStats] = useState({ totalCollected: 0, neededThisMonth: 0, totalRemaining: 0 });
  const [urgentPlans, setUrgentPlans] = useState<PlanWithDetails[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [monthCollections, setMonthCollections] = useState<CollectionWithDetails[]>([]);
  const [pendingPlans, setPendingPlans] = useState<PlanWithDetails[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);

  // Modal states
  const [addCustomerVisible, setAddCustomerVisible] = useState(false);
  const [addItemVisible, setAddItemVisible] = useState(false);
  const [addPlanVisible, setAddPlanVisible] = useState(false);
  const [recordCollectionVisible, setRecordCollectionVisible] = useState(false);
  const [monthCollectionsVisible, setMonthCollectionsVisible] = useState(false);
  const [pendingPlansVisible, setPendingPlansVisible] = useState(false);

  const [selectedPlan, setSelectedPlan] = useState<PlanWithDetails | null>(null);

  const loadData = async () => {
    const s = await dbService.getDashboardStats();
    const p = await dbService.getUrgentPlans();
    const c = await dbService.getCustomers();
    const mc = await dbService.getCollectionsThisMonth();
    const pp = await dbService.getPendingCollectionsThisMonth();
    setStats(s);
    setUrgentPlans(p);
    setCustomers(c);
    setMonthCollections(mc);
    setPendingPlans(pp);
  };
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const sendAction = (plan: PlanWithDetails, type: 'whatsapp' | 'call') => {
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
      currency: currency
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

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.dashboard}>
          <View style={styles.statsRow}>
            <Card style={styles.statCard} onPress={() => setMonthCollectionsVisible(true)}>
              <Card.Content style={styles.statContent}>
                <Text variant="labelMedium" style={styles.statLabel}>{t('totalCollectedThisMonth')}</Text>
                <Text variant="titleLarge" style={styles.successText}>{currency} {stats.totalCollected.toLocaleString()}</Text>
              </Card.Content>
            </Card>
            <Card style={styles.statCard} onPress={() => setPendingPlansVisible(true)}>
              <Card.Content style={styles.statContent}>
                <Text variant="labelMedium" style={styles.statLabel}>{t('neededThisMonth')}</Text>
                <Text variant="titleLarge" style={styles.warningText}>{currency} {stats.neededThisMonth.toLocaleString()}</Text>
              </Card.Content>
            </Card>
          </View>
        </View>

        <Text style={styles.sectionTitle} variant="titleLarge">
          {t('urgentCollections')}
        </Text>

        {urgentPlans.length === 0 ? (
          <Text style={styles.emptyText}>{t('noItems')}</Text>
        ) : (
          urgentPlans.map((plan) => {
            const collected = plan.deposit + (plan.months_paid * plan.monthly_installment_amount);
            const remaining = Math.max(0, plan.total_price - collected);
            
            return (
              <Card 
                key={plan.id} 
                style={styles.planCard} 
                onPress={() => navigation.navigate('InstallmentDetail', { planId: plan.id })}
              >
                <Card.Title
                  title={plan.customer_name}
                  subtitle={`${plan.item_name} - ${currency} ${plan.monthly_installment_amount}`}
                  left={(props) => {
                    const customer = customers.find(c => c.id === plan.customer_id);
                    if (customer?.image_uri) {
                      return <Avatar.Image {...props} size={40} source={{ uri: customer.image_uri }} />;
                    }
                    return <Avatar.Text {...props} size={40} label={plan.customer_name.substring(0, 1)} />;
                  }}
                />
                <Card.Content>
                  <Text variant="bodySmall">{t('months')}: {plan.months_paid} / {plan.total_months}</Text>
                  <View style={styles.planStats}>
                    <Text variant="bodySmall" style={styles.planStatText}>
                      {t('planCollected', { amount: collected.toLocaleString(), currency })}
                    </Text>
                    <Text variant="bodySmall" style={styles.planStatText}>
                      {t('planRemaining', { amount: remaining.toLocaleString(), currency })}
                    </Text>
                  </View>
                </Card.Content>
                <Card.Actions>
                  <IconButton icon="whatsapp" iconColor="#25D366" onPress={() => sendAction(plan, 'whatsapp')} />
                  <IconButton icon="phone" iconColor="#2196F3" onPress={() => sendAction(plan, 'call')} />
                  <Button mode="contained" onPress={() => {
                    setSelectedPlan(plan);
                    setRecordCollectionVisible(true);
                  }}>
                    {t('recordCollection')}
                  </Button>
                </Card.Actions>
              </Card>
            );
          })
        )}
      </ScrollView>

      <FAB.Group
        open={fabOpen}
        visible={true}
        icon={fabOpen ? 'close' : 'plus'}
        actions={[
          { icon: 'account-plus', label: t('addCustomer'), onPress: () => setAddCustomerVisible(true) },
          { icon: 'package-variant-closed-plus', label: t('addItem'), onPress: () => setAddItemVisible(true) },
          { icon: 'calendar-plus', label: t('addInstallment'), onPress: () => setAddPlanVisible(true) },
          { icon: 'cash-plus', label: t('recordCollection'), onPress: () => {
            setSelectedPlan(null);
            setRecordCollectionVisible(true);
          }},
        ]}
        onStateChange={({ open }) => setFabOpen(open)}
        style={styles.fab}
      />

      <AddCustomerModal 
        visible={addCustomerVisible} 
        onDismiss={() => setAddCustomerVisible(false)} 
        onSuccess={loadData} 
      />
      <AddItemModal 
        visible={addItemVisible} 
        onDismiss={() => setAddItemVisible(false)} 
        onSuccess={loadData} 
      />
      <AddPlanModal 
        visible={addPlanVisible} 
        onDismiss={() => setAddPlanVisible(false)} 
        onSuccess={loadData} 
      />
      <RecordCollectionModal
        visible={recordCollectionVisible}
        onDismiss={() => {
          setRecordCollectionVisible(false);
          setSelectedPlan(null);
        }}
        onSuccess={loadData}
        initialPlan={selectedPlan}
      />

      <Portal>
        <Modal 
          visible={pendingPlansVisible} 
          onRequestClose={() => setPendingPlansVisible(false)}
          animationType="slide"
        >
          <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
            <View style={styles.modalHeader}>
              <IconButton icon="close" onPress={() => setPendingPlansVisible(false)} />
              <Text variant="titleLarge" style={styles.modalTitle}>{t('neededThisMonth')}</Text>
              <View style={{ width: 48 }} /> 
            </View>
            <ScrollView style={styles.flex}>
              {pendingPlans.length === 0 ? (
                <Text style={styles.emptyText}>{t('noItems')}</Text>
              ) : (
                pendingPlans.map((plan) => (
                  <List.Item
                    key={plan.id}
                    title={plan.customer_name}
                    description={`${plan.item_name}\n${t('amount')}: ${currency} ${plan.monthly_installment_amount.toLocaleString()}`}
                    descriptionNumberOfLines={3}
                    onPress={() => {
                      setPendingPlansVisible(false);
                      navigation.navigate('InstallmentDetail', { planId: plan.id });
                    }}
                    left={props => (
                      <View style={{ justifyContent: 'center', marginLeft: 8 }}>
                        {plan.customer_image_uri ? (
                          <Avatar.Image size={40} source={{ uri: plan.customer_image_uri }} />
                        ) : (
                          <Avatar.Text size={40} label={plan.customer_name.substring(0, 1)} />
                        )}
                      </View>
                    )}
                    right={props => (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <IconButton icon="whatsapp" iconColor="#25D366" onPress={() => sendAction(plan, 'whatsapp')} />
                        <IconButton icon="phone" iconColor="#2196F3" onPress={() => sendAction(plan, 'call')} />
                      </View>
                    )}
                  />
                ))
              )}
            </ScrollView>
          </SafeAreaView>
        </Modal>

        <Modal 
          visible={monthCollectionsVisible} 
          onRequestClose={() => setMonthCollectionsVisible(false)}
          animationType="slide"
        >
          <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
            <View style={styles.modalHeader}>
              <IconButton icon="close" onPress={() => setMonthCollectionsVisible(false)} />
              <Text variant="titleLarge" style={styles.modalTitle}>{t('totalCollectedThisMonth')}</Text>
              <View style={{ width: 48 }} /> 
            </View>
            <ScrollView style={styles.flex}>
              {monthCollections.length === 0 ? (
                <Text style={styles.emptyText}>{t('noItems')}</Text>
              ) : (
                monthCollections.map((col) => (
                  <List.Item
                    key={col.id}
                    title={col.customer_name}
                    description={`${col.item_name}\n${currency} ${col.amount_collected.toLocaleString()} - ${new Date(col.collection_date).toLocaleDateString()} ${new Date(col.collection_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
                    descriptionNumberOfLines={3}
                    onPress={() => {
                      setMonthCollectionsVisible(false);
                      navigation.navigate('InstallmentDetail', { planId: col.plan_id });
                    }}
                    left={props => <List.Icon {...props} icon="cash-check" />}
                    right={props => <List.Icon {...props} icon={I18nManager.isRTL ? "chevron-left" : "chevron-right"} />}
                  />
                ))
              )}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  dashboard: {
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 0.48,
  },
  statContent: {
    paddingHorizontal: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  statLabel: {
    marginBottom: 4,
    opacity: 0.7,
    textAlign: 'center',
  },
  card: {
    marginBottom: 12,
  },
  planCard: {
    marginBottom: 12,
  },
  planStats: {
    flexDirection: 'column',
    marginTop: 8,
    gap: 4,
  },
  planStatText: {
    opacity: 0.8,
  },
  sectionTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    opacity: 0.6,
  },
  successText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  warningText: {
    color: '#FF9800',
    fontWeight: 'bold',
  },
  fab: {
    paddingBottom: 0,
  },
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontWeight: 'bold',
  },
});

export default HomeScreen;
