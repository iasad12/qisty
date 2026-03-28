import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, I18nManager } from 'react-native';
import { Searchbar, FAB, List, Text, Card, Avatar, IconButton } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { dbService } from '../services/dbService';
import { Customer } from '../types';
import AddCustomerModal from '../components/AddCustomerModal';
import { useNavigation } from '@react-navigation/native';

const CustomersScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const [addCustomerVisible, setAddCustomerVisible] = useState(false);

  const loadCustomers = async () => {
    const data = await dbService.getCustomers();
    setCustomers(data);
    setFilteredCustomers(data);
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCustomers();
    setRefreshing(false);
  };

  const onChangeSearch = (query: string) => {
    setSearchQuery(query);
    const filtered = customers.filter(c => 
      c.name.toLowerCase().includes(query.toLowerCase()) || 
      c.phone.includes(query)
    );
    setFilteredCustomers(filtered);
  };

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder={t('customers')}
        onChangeText={onChangeSearch}
        value={searchQuery}
        style={styles.searchBar}
      />
      
      <FlatList
        data={filteredCustomers}
        keyExtractor={(item) => item.id!.toString()}
        renderItem={({ item }) => (
          <List.Item
            title={item.name}
            description={item.phone}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBar: {
    margin: 16,
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
