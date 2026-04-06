import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, I18nManager } from 'react-native';
import { Searchbar, FAB, List, Text, Avatar, IconButton } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { dbService } from '../services/dbService';
import { Customer } from '../types';
import AddCustomerModal from '../components/AddCustomerModal';
import SortModal from '../components/SortModal';
import { useNavigation } from '@react-navigation/native';

type SortCriteria = 'name' | 'plans';
type SortOrder = 'asc' | 'desc';

const CustomersScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [sortCriteria, setSortCriteria] = useState<SortCriteria>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [sortModalVisible, setSortModalVisible] = useState(false);

  const [addCustomerVisible, setAddCustomerVisible] = useState(false);

  const loadCustomers = async () => {
    const data = await dbService.getCustomers();
    setCustomers(data);
    applyFilters(data, searchQuery, sortCriteria, sortOrder);
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCustomers();
    setRefreshing(false);
  };

  const applyFilters = (data: Customer[], query: string, criteria: SortCriteria, order: SortOrder) => {
    let filtered = data.filter(c => 
      c.name.toLowerCase().includes(query.toLowerCase()) || 
      c.phone.includes(query)
    );

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (criteria) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'plans':
          comparison = (a.plan_count || 0) - (b.plan_count || 0);
          break;
      }
      return order === 'asc' ? comparison : -comparison;
    });

    setFilteredCustomers(filtered);
  };

  const onChangeSearch = (query: string) => {
    setSearchQuery(query);
    applyFilters(customers, query, sortCriteria, sortOrder);
  };

  const handleSortSave = (criteria: string, order: 'asc' | 'desc') => {
    setSortCriteria(criteria as SortCriteria);
    setSortOrder(order);
    applyFilters(customers, searchQuery, criteria as SortCriteria, order);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Searchbar
          placeholder={t('customers')}
          onChangeText={onChangeSearch}
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
      
      <FlatList
        data={filteredCustomers}
        keyExtractor={(item) => item.id!.toString()}
        renderItem={({ item }) => (
          <List.Item
            title={item.name}
            description={`${item.phone} • ${item.plan_count || 0} ${t('activePlans')}`}
            onPress={() => navigation.navigate('CustomerDetail', { customerId: item.id })}
            left={props => (
              item.image_uri 
                ? <Avatar.Image {...props} size={40} source={{ uri: item.image_uri }} />
                : <Avatar.Text {...props} size={40} label={item.name.substring(0, 1)} />
            )}
            right={props => <IconButton {...props} icon={I18nManager.isRTL ? "chevron-left" : "chevron-right"} onPress={() => navigation.navigate('CustomerDetail', { customerId: item.id })} />}
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.emptyText}>{t('noCustomers')}</Text>}
      />

      <FAB
        icon="account-plus"
        style={styles.fab}
        onPress={() => setAddCustomerVisible(true)}
      />

      <AddCustomerModal
        visible={addCustomerVisible}
        onDismiss={() => setAddCustomerVisible(false)}
        onSuccess={loadCustomers}
      />

      <SortModal
        visible={sortModalVisible}
        onDismiss={() => setSortModalVisible(false)}
        onSave={handleSortSave}
        initialCriteria={sortCriteria}
        initialOrder={sortOrder}
        options={[
          { label: t('sortName'), value: 'name' },
          { label: t('sortInstallmentCount'), value: 'plans' },
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

export default CustomersScreen;
