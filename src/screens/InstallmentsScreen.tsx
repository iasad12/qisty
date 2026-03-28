import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, I18nManager } from 'react-native';
import { Searchbar, List, Text, Chip, IconButton, FAB } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../context/CurrencyContext';
import { useFocusEffect } from '@react-navigation/native';
import { dbService } from '../services/dbService';
import { PlanWithDetails } from '../types';
import { useNavigation } from '@react-navigation/native';
import AddPlanModal from '../components/AddPlanModal';

const InstallmentsScreen = () => {
  const { t } = useTranslation();
  const { currency } = useCurrency();
  const navigation = useNavigation<any>();
  const [searchQuery, setSearchQuery] = useState('');
  const [plans, setPlans] = useState<PlanWithDetails[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [addPlanVisible, setAddPlanVisible] = useState(false);

  const loadPlans = async () => {
    console.log('Loading plans...');
    const data = await dbService.getPlans();
    console.log('Plans loaded:', data.length);
    setPlans(data);
  };

  useFocusEffect(
    useCallback(() => {
      loadPlans();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPlans();
    setRefreshing(false);
  };

  const getFilteredPlans = () => {
    let filtered = plans.filter(p => 
      p.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.item_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (filter !== 'all') {
      filtered = filtered.filter(p => p.status === filter);
    }
    return filtered;
  };

  const filteredPlans = getFilteredPlans();

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder={t('installments')}
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />
      
      <View style={styles.filterContainer}>
        <Chip 
          selected={filter === 'all'} 
          onPress={() => setFilter('all')}
          style={styles.chip}
        >{t('filterAll')}</Chip>
        <Chip 
          selected={filter === 'active'} 
          onPress={() => setFilter('active')}
          style={styles.chip}
        >{t('filterActive')}</Chip>
        <Chip 
          selected={filter === 'completed'} 
          onPress={() => setFilter('completed')}
          style={styles.chip}
        >{t('filterCompleted')}</Chip>
      </View>

      <FlatList
        data={filteredPlans}
        keyExtractor={(item) => item.id!.toString()}
        renderItem={({ item }) => (
          <List.Item
            title={item.customer_name}
            description={`${item.item_name} - ${currency} ${item.monthly_installment_amount}`}
            onPress={() => navigation.navigate('InstallmentDetail', { planId: item.id })}
            left={props => <List.Icon {...props} icon={item.status === 'completed' ? 'check-circle' : 'clock-outline'} color={item.status === 'completed' ? '#4CAF50' : '#2196F3'} />}
            right={() => (
              <View style={styles.itemRight}>
                <Text variant="bodySmall">{item.months_paid}/{item.total_months}</Text>
                <IconButton icon={I18nManager.isRTL ? "chevron-left" : "chevron-right"} onPress={() => navigation.navigate('InstallmentDetail', { planId: item.id })} />
              </View>
            )}
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.emptyText}>{t('noItems')}</Text>}
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => setAddPlanVisible(true)}
      />

      <AddPlanModal
        visible={addPlanVisible}
        onDismiss={() => setAddPlanVisible(false)}
        onSuccess={loadPlans}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBar: {
    margin: 16,
    marginBottom: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  chip: {
    marginRight: 8,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    opacity: 0.6,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default InstallmentsScreen;
