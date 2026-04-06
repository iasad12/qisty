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
import SortModal from '../components/SortModal';

type SortCriteria = 'name' | 'collected' | 'remaining';
type SortOrder = 'asc' | 'desc';

const InstallmentsScreen = () => {
  const { t } = useTranslation();
  const { currency } = useCurrency();
  const navigation = useNavigation<any>();
  const [searchQuery, setSearchQuery] = useState('');
  const [plans, setPlans] = useState<PlanWithDetails[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [sortCriteria, setSortCriteria] = useState<SortCriteria>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [addPlanVisible, setAddPlanVisible] = useState(false);

  const loadPlans = async () => {
    const data = await dbService.getPlans();
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

    filtered.sort((a, b) => {
      let comparison = 0;
      const aCollected = a.deposit + (a.months_paid * a.monthly_installment_amount);
      const bCollected = b.deposit + (b.months_paid * b.monthly_installment_amount);
      const aRemaining = a.total_months - a.months_paid;
      const bRemaining = b.total_months - b.months_paid;

      switch (sortCriteria) {
        case 'name':
          comparison = a.customer_name.localeCompare(b.customer_name);
          break;
        case 'collected':
          comparison = aCollected - bCollected;
          break;
        case 'remaining':
          comparison = aRemaining - bRemaining;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  };

  const filteredPlans = getFilteredPlans();

  const handleSortSave = (criteria: string, order: 'asc' | 'desc') => {
    setSortCriteria(criteria as SortCriteria);
    setSortOrder(order);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Searchbar
          placeholder={t('installments')}
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
        <IconButton
          icon="sort-variant"
          mode="contained-tonal"
          onPress={() => setSortModalVisible(true)}
          style={styles.sortBtn}
        />
      </View>
      
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
            title={() => (
              <View style={styles.titleRow}>
                <Text variant="titleMedium">{item.customer_name}</Text>
                {(item.customer_plan_count || 0) > 1 && (
                  <Text style={styles.planCountBadge}>
                    ({item.customer_plan_count} {t('activePlans')})
                  </Text>
                )}
              </View>
            )}
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

      <SortModal
        visible={sortModalVisible}
        onDismiss={() => setSortModalVisible(false)}
        onSave={handleSortSave}
        initialCriteria={sortCriteria}
        initialOrder={sortOrder}
        options={[
          { label: t('sortName'), value: 'name' },
          { label: t('sortCollected'), value: 'collected' },
          { label: t('sortMonthsRemaining'), value: 'remaining' },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchBar: {
    flex: 1,
  },
  sortBtn: {
    marginLeft: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  chip: {
    marginRight: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planCountBadge: {
    fontSize: 12,
    opacity: 0.6,
    marginLeft: 8,
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
