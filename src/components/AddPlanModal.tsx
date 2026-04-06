import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { TextInput, Button, Portal, Dialog, List, Text, Divider, Searchbar, Checkbox, useTheme, Surface } from 'react-native-paper';
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
  const theme = useTheme();
  
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
  const [markAsPaid, setMarkAsPaid] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadData();
      setSearchQuery('');
      if (initialPlan) {
        setStep(3);
        setDeposit(initialPlan.deposit.toString());
        setMonths(initialPlan.total_months.toString());
        setMarkAsPaid(false);
      } else if (initialCustomerId) {
        setStep(2);
      } else {
        setStep(1);
        setSelectedCustomer(null);
        setSelectedItem(null);
        setDeposit('');
        setMonths('12');
        setMarkAsPaid(false);
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
    const m = parseInt(months || '1');
    return (remaining / (m > 0 ? m : 1)).toFixed(2);
  };

  const handleSave = async () => {
    if (!selectedCustomer || !selectedItem) return;
    setLoading(true);
    try {
      const totalPrice = selectedItem.base_price * (1 + selectedItem.profit_percentage / 100);
      const monthlyInstallment = parseFloat(calculateInstallment());
      
      const planData = {
        customer_id: selectedCustomer.id!,
        item_id: selectedItem.id!,
        total_price: totalPrice,
        deposit: parseFloat(deposit || '0'),
        monthly_installment_amount: monthlyInstallment,
        total_months: parseInt(months),
        months_paid: initialPlan ? initialPlan.months_paid : (markAsPaid ? 1 : 0),
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
        <Dialog.Title style={styles.dialogTitle}>
          {step === 1 && t('customers')}
          {step === 2 && t('items')}
          {step === 3 && (initialPlan ? t('editInstallment') : t('addInstallment'))}
        </Dialog.Title>
        <Dialog.ScrollArea style={styles.scrollArea}>
          {step === 1 && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              <Searchbar
                placeholder={t('search')}
                onChangeText={setSearchQuery}
                value={searchQuery}
                style={styles.searchBar}
              />
              <View style={styles.list}>
                {filteredCustomers.map(c => (
                  <List.Item
                    key={c.id}
                    title={c.name}
                    onPress={() => { setSelectedCustomer(c); setStep(2); setSearchQuery(''); }}
                    left={props => <List.Icon {...props} icon="account" />}
                  />
                ))}
                {filteredCustomers.length === 0 && <Text style={styles.emptyText}>{t('noCustomers')}</Text>}
              </View>
            </ScrollView>
          )}
          
          {step === 2 && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              <Searchbar
                placeholder={t('search')}
                onChangeText={setSearchQuery}
                value={searchQuery}
                style={styles.searchBar}
              />
              <View style={styles.list}>
                {filteredItems.map(i => (
                  <List.Item
                    key={i.id}
                    title={i.name}
                    description={`${currency} ${(i.base_price * (1 + i.profit_percentage / 100)).toLocaleString()}`}
                    onPress={() => { setSelectedItem(i); setStep(3); }}
                    left={props => <List.Icon {...props} icon="package-variant" />}
                  />
                ))}
                {filteredItems.length === 0 && <Text style={styles.emptyText}>{t('noItems')}</Text>}
              </View>
            </ScrollView>
          )}

          {step === 3 && selectedItem && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              <Surface style={[styles.selectionSurface, { backgroundColor: theme.colors.elevation.level1 }]} elevation={1}>
                <View style={styles.selectionItem}>
                  <Text variant="labelSmall" style={styles.selectionLabel}>{t('customers')}</Text>
                  <Text variant="titleMedium" numberOfLines={1}>{selectedCustomer?.name}</Text>
                </View>
                <View style={[styles.verticalDivider, { backgroundColor: theme.colors.outlineVariant }]} />
                <View style={styles.selectionItem}>
                  <Text variant="labelSmall" style={styles.selectionLabel}>{t('items')}</Text>
                  <Text variant="titleMedium" numberOfLines={1}>{selectedItem.name}</Text>
                </View>
              </Surface>
              
              <View style={styles.inputContainer}>
                <TextInput
                  label={t('deposit')}
                  value={deposit}
                  onChangeText={setDeposit}
                  keyboardType="numeric"
                  mode="outlined"
                  style={styles.input}
                  left={<TextInput.Affix text={`${currency} `} />}
                />
                <TextInput
                  label={t('months')}
                  value={months}
                  onChangeText={setMonths}
                  keyboardType="numeric"
                  mode="outlined"
                  style={styles.input}
                  right={<TextInput.Affix text={` ${t('months')}`} />}
                />

                {!initialPlan && (
                  <Checkbox.Item
                    label={t('markDepositAsInstallment')}
                    status={markAsPaid ? 'checked' : 'unchecked'}
                    onPress={() => setMarkAsPaid(!markAsPaid)}
                    position="leading"
                    labelStyle={styles.checkboxLabel}
                    style={styles.checkboxItem}
                  />
                )}
              </View>
              
              <Surface style={[styles.summarySurface, { backgroundColor: theme.colors.primaryContainer }]} elevation={2}>
                <View style={styles.summaryHeader}>
                  <Text variant="labelSmall" style={[styles.summaryLabel, { color: theme.colors.onPrimaryContainer }]}>{t('totalPrice')}</Text>
                  <Text variant="titleMedium" style={{ color: theme.colors.onPrimaryContainer }}>
                    {currency} {(selectedItem.base_price * (1 + selectedItem.profit_percentage / 100)).toLocaleString()}
                  </Text>
                </View>
                
                <Divider style={[styles.summaryDivider, { backgroundColor: theme.colors.onPrimaryContainer, opacity: 0.2 }]} />
                
                <View style={styles.installmentMain}>
                  <Text variant="labelMedium" style={[styles.summaryLabel, { color: theme.colors.onPrimaryContainer }]}>{t('monthlyInstallment')}</Text>
                  <Text variant="headlineMedium" style={[styles.installmentValue, { color: theme.colors.primary }]}>
                    {currency} {calculateInstallment()}
                  </Text>
                </View>
              </Surface>
            </ScrollView>
          )}
        </Dialog.ScrollArea>
        <Dialog.Actions>
          {step > 1 && !initialPlan && (
            <Button onPress={() => { setStep(step - 1); setSearchQuery(''); }}>
              {t('back')}
            </Button>
          )}
          <Button onPress={onDismiss}>{t('cancel')}</Button>
          {step === 3 && (
            <Button mode="contained" onPress={handleSave} loading={loading} disabled={loading} style={styles.saveBtn}>
              {t('save')}
            </Button>
          )}
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  dialog: {
    maxHeight: '90%',
    borderRadius: 24,
  },
  dialogTitle: {
    textAlign: 'center',
    paddingTop: 16,
    paddingBottom: 8,
  },
  scrollArea: {
    paddingHorizontal: 0,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchBar: {
    marginBottom: 12,
    elevation: 0,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  list: {
    marginBottom: 8,
  },
  selectionSurface: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  selectionItem: {
    flex: 1,
  },
  selectionLabel: {
    opacity: 0.6,
    marginBottom: 2,
  },
  verticalDivider: {
    width: 1,
    height: '100%',
    marginHorizontal: 12,
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  checkboxItem: {
    paddingHorizontal: 0,
    marginVertical: 4,
  },
  checkboxLabel: {
    fontSize: 14,
    textAlign: 'left',
  },
  summarySurface: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    opacity: 0.8,
  },
  summaryDivider: {
    marginVertical: 12,
  },
  installmentMain: {
    alignItems: 'center',
  },
  installmentValue: {
    fontWeight: '900',
    marginTop: 4,
  },
  saveBtn: {
    paddingHorizontal: 16,
  },
  emptyText: {
    textAlign: 'center',
    marginVertical: 30,
    opacity: 0.5,
  },
});

export default AddPlanModal;
