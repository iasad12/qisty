import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, I18nManager } from 'react-native';
import { Button, Text, List, IconButton, Divider, Avatar, ActivityIndicator, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../context/CurrencyContext';
import { useFocusEffect, useRoute, useNavigation } from '@react-navigation/native';
import { dbService } from '../services/dbService';
import { Customer, PlanWithDetails } from '../types';
import AddCustomerModal from '../components/AddCustomerModal';
import AddPlanModal from '../components/AddPlanModal';

const CustomerDetailScreen = () => {
  const { t } = useTranslation();
  const { currency } = useCurrency();
  const route = useRoute();
  const navigation = useNavigation<any>();
  const { customerId } = route.params as { customerId: number };

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [plans, setPlans] = useState<PlanWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [editCustomerVisible, setEditCustomerVisible] = useState(false);
  const [addPlanVisible, setAddPlanVisible] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const allCustomers = await dbService.getCustomers();
    const foundCustomer = allCustomers.find(c => c.id === customerId);
    if (foundCustomer) {
      setCustomer(foundCustomer);
      const customerPlans = await dbService.getPlansByCustomer(customerId);
      setPlans(customerPlans);
    }
    setLoading(false);
  }, [customerId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const theme = useTheme();

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
      </View>
      );
      }

      if (!customer) {
      return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text>{t('noCustomers')}</Text>
      </View>
    );
  }

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
            await dbService.deleteCustomer(customer.id!);
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
          {customer.image_uri ? (
            <Avatar.Image size={60} source={{ uri: customer.image_uri }} />
          ) : (
            <Avatar.Text size={60} label={customer.name.substring(0, 1)} />
          )}
          <View style={styles.headerInfo}>
            <Text variant="headlineSmall">{customer.name}</Text>
            <Text variant="bodyLarge" style={styles.subText}>{customer.phone}</Text>
          </View>
        </View>

        <Divider style={styles.divider} />

        <View style={styles.plansHeader}>
          <Text variant="titleMedium">{t('linkedInstallments')}</Text>
          <Button icon="plus" onPress={() => setAddPlanVisible(true)}>{t('addInstallment')}</Button>
        </View>

        {plans.length === 0 ? (
          <Text style={styles.emptyText}>{t('noItems')}</Text>
        ) : (
          plans.map((plan) => (
            <List.Item
              key={plan.id}
              title={plan.item_name}
              description={`${currency} ${plan.monthly_installment_amount.toLocaleString()} - ${plan.months_paid}/${plan.total_months}`}
              onPress={() => navigation.navigate('InstallmentDetail', { planId: plan.id })}
              left={props => <List.Icon {...props} icon={plan.status === 'completed' ? 'check-circle' : 'clock-outline'} color={plan.status === 'completed' ? '#4CAF50' : '#2196F3'} />}
              right={props => <List.Icon {...props} icon={I18nManager.isRTL ? "chevron-left" : "chevron-right"} />}
            />
          ))
        )}

        <View style={styles.footerButtons}>
          <Button icon="pencil" mode="outlined" onPress={() => setEditCustomerVisible(true)} style={styles.footerBtn}>
            {t('editCustomer')}
          </Button>
          <Button icon="delete" mode="outlined" textColor="#F44336" onPress={handleDelete} style={styles.footerBtn}>
            {t('delete')}
          </Button>
        </View>
      </ScrollView>

      <AddCustomerModal
        visible={editCustomerVisible}
        onDismiss={() => setEditCustomerVisible(false)}
        onSuccess={loadData}
        initialCustomer={customer}
      />

      <AddPlanModal
        visible={addPlanVisible}
        onDismiss={() => setAddPlanVisible(false)}
        onSuccess={loadData}
        initialCustomerId={customer.id}
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
    alignItems: 'center',
    marginBottom: 16,
  },
  headerInfo: {
    marginLeft: 16,
  },
  subText: {
    opacity: 0.7,
  },
  divider: {
    marginVertical: 12,
  },
  plansHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyText: {
    opacity: 0.6,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 12,
  },
  footerButtons: {
    marginTop: 24,
    gap: 12,
    paddingBottom: 24,
  },
  footerBtn: {
    flex: 1,
  },
});

export default CustomerDetailScreen;
