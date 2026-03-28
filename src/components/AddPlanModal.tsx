import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { TextInput, Button, Portal, Dialog, List, Text, Divider, Searchbar } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../context/CurrencyContext';
import { dbService } from '../services/dbService';
import { Customer, Item, PlanWithDetails } from '../types';

interface AddPlanModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSuccess: () => void;
  initialPlan?: PlanWithDetails | null;
  initialCustomerId?: number;
}

const AddPlanModal: React.FC<AddPlanModalProps> = ({ 
  visible, 
  onDismiss, 
  onSuccess, 
  initialPlan, 
  initialCustomerId 
}) => {
  const { t } = useTranslation();
  const { currency } = useCurrency();
  
  // Selection state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [step, setStep] = useState(1); // 1: Select Customer, 2: Select Item, 3: Configure Plan

  // Plan configuration
  const [deposit, setDeposit] = useState('');
  const [months, setMonths] = useState('12');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadData();
      setSearchQuery('');
      if (initialPlan) {
        setStep(3);
        setDeposit(initialPlan.deposit.toString());
        setMonths(initialPlan.total_months.toString());
      } else if (initialCustomerId) {
        setStep(2);
      } else {
        setStep(1);
        setSelectedCustomer(null);
        setSelectedItem(null);
        setDeposit('');
        setMonths('12');
      }
    }
  }, [visible, initialPlan, initialCustomerId]);

  const loadData = async () => {
    const c = await dbService.getCustomers();
    const i = await dbService.getItems();
    setCustomers(c);
    setItems(i);

    if (initialPlan) {
      const cust = c.find(curr => curr.id === initialPlan.customer_id);
      const item = i.find(curr => curr.id === initialPlan.item_id);
      if (cust) setSelectedCustomer(cust);
      if (item) setSelectedItem(item);
    } else if (initialCustomerId) {
      const cust = c.find(curr => curr.id === initialCustomerId);
      if (cust) setSelectedCustomer(cust);
    }
  };

  const calculateInstallment = () => {
    if (!selectedItem) return 0;
    const totalPrice = selectedItem.base_price * (1 + selectedItem.profit_percentage / 100);
    const remaining = totalPrice - parseFloat(deposit || '0');
    return (remaining / parseInt(months || '1')).toFixed(2);
  };

  const handleSave = async () => {
    if (!selectedCustomer || !selectedItem) return;
    setLoading(true);
    try {
      const totalPrice = selectedItem.base_price * (1 + selectedItem.profit_percentage / 100);
      const monthlyInstallment = parseFloat(calculateInstallment().toString());
      
      const planData = {
        customer_id: selectedCustomer.id!,
        item_id: selectedItem.id!,
        total_price: totalPrice,
        deposit: parseFloat(deposit || '0'),
        monthly_installment_amount: monthlyInstallment,
        total_months: parseInt(months),
        months_paid: initialPlan ? initialPlan.months_paid : 0,
        start_date: initialPlan ? initialPlan.start_date : new Date().toISOString(),
        status: initialPlan ? initialPlan.status : 'active' as const,
      };

      if (initialPlan) {
        await dbService.updatePlan({ ...planData, id: initialPlan.id });
      } else {
        await dbService.addPlan(planData);
      }

      onSuccess();
      onDismiss();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredItems = items.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title>
          {step === 1 && t('customers')}
          {step === 2 && t('items')}
          {step === 3 && (initialPlan ? t('editInstallment') : t('addInstallment'))}
        </Dialog.Title>
        <Dialog.Content>
          {step === 1 && (
            <View>
              <Searchbar
                placeholder={t('search')}
                onChangeText={setSearchQuery}
                value={searchQuery}
                style={styles.searchBar}
              />
              <ScrollView style={styles.list}>
                {filteredCustomers.map(c => (
                  <List.Item
                    key={c.id}
                    title={c.name}
                    onPress={() => { setSelectedCustomer(c); setStep(2); setSearchQuery(''); }}
                    left={props => <List.Icon {...props} icon="account" />}
                  />
                ))}
                {filteredCustomers.length === 0 && <Text>{t('noCustomers')}</Text>}
              </ScrollView>
            </View>
          )}
          
          {step === 2 && (
            <View>
              <Searchbar
                placeholder={t('search')}
                onChangeText={setSearchQuery}
                value={searchQuery}
                style={styles.searchBar}
              />
              <ScrollView style={styles.list}>
                {filteredItems.map(i => (
                  <List.Item
                    key={i.id}
                    title={i.name}
                    description={`${currency} ${i.base_price}`}
                    onPress={() => { setSelectedItem(i); setStep(3); }}
                    left={props => <List.Icon {...props} icon="package-variant" />}
                  />
                ))}
                {filteredItems.length === 0 && <Text>{t('noItems')}</Text>}
              </ScrollView>
            </View>
          )}

          {step === 3 && selectedItem && (
            <View>
              <Text variant="titleMedium">{selectedCustomer?.name}</Text>
              <Text variant="bodyMedium">{selectedItem.name}</Text>
              <Divider style={styles.divider} />
              
              <TextInput
                label={t('deposit')}
                value={deposit}
                onChangeText={setDeposit}
                keyboardType="numeric"
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label={t('months')}
                value={months}
                onChangeText={setMonths}
                keyboardType="numeric"
                mode="outlined"
                style={styles.input}
              />
              
              <View style={styles.summary}>
                <Text>{t('totalPrice')}: {currency} {(selectedItem.base_price * (1 + selectedItem.profit_percentage / 100)).toLocaleString()}</Text>
                <Text variant="titleLarge" style={styles.installmentText}>
                  {t('monthlyInstallment')}: {currency} {calculateInstallment()}
                </Text>
              </View>
            </View>
          )}
        </Dialog.Content>
        <Dialog.Actions>
          {step > 1 && <Button onPress={() => { setStep(step - 1); setSearchQuery(''); }}>{t('cancel')}</Button>}
          {step === 1 && <Button onPress={onDismiss}>{t('cancel')}</Button>}
          {step === 3 && (
            <Button onPress={handleSave} loading={loading} disabled={loading}>{t('save')}</Button>
          )}
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  dialog: {
    maxHeight: '80%',
  },
  searchBar: {
    marginBottom: 8,
  },
  list: {
    maxHeight: 250,
  },
  input: {
    marginBottom: 12,
  },
  divider: {
    marginVertical: 12,
  },
  summary: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  installmentText: {
    marginTop: 8,
    color: '#2196F3',
  },
});

export default AddPlanModal;
