import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Image, I18nManager } from 'react-native';
import { Searchbar, FAB, Text, Card, Title, Paragraph, IconButton, List } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../context/CurrencyContext';
import { dbService } from '../services/dbService';
import { Item } from '../types';
import AddItemModal from '../components/AddItemModal';
import SortModal from '../components/SortModal';
import { useNavigation } from '@react-navigation/native';

type SortCriteria = 'name' | 'price';
type SortOrder = 'asc' | 'desc';

const ItemsScreen = () => {
  const { t } = useTranslation();
  const { currency } = useCurrency();
  const navigation = useNavigation<any>();
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isListView, setIsListView] = useState(true);
  const [sortCriteria, setSortCriteria] = useState<SortCriteria>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [sortModalVisible, setSortModalVisible] = useState(false);

  const [addItemVisible, setAddItemVisible] = useState(false);

  const loadItems = async () => {
    const data = await dbService.getItems();
    setItems(data);
    applyFilters(data, searchQuery, sortCriteria, sortOrder);
  };

  useEffect(() => {
    loadItems();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadItems();
    setRefreshing(false);
  };

  const applyFilters = (data: Item[], query: string, criteria: SortCriteria, order: SortOrder) => {
    let filtered = data.filter(i => i.name.toLowerCase().includes(query.toLowerCase()));

    filtered.sort((a, b) => {
      let comparison = 0;
      const aFinalPrice = a.base_price * (1 + a.profit_percentage / 100);
      const bFinalPrice = b.base_price * (1 + b.profit_percentage / 100);

      switch (criteria) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'price':
          comparison = aFinalPrice - bFinalPrice;
          break;
      }
      return order === 'asc' ? comparison : -comparison;
    });

    setFilteredItems(filtered);
  };

  const onChangeSearch = (query: string) => {
    setSearchQuery(query);
    applyFilters(items, query, sortCriteria, sortOrder);
  };

  const handleSortSave = (criteria: string, order: 'asc' | 'desc') => {
    setSortCriteria(criteria as SortCriteria);
    setSortOrder(order);
    applyFilters(items, searchQuery, criteria as SortCriteria, order);
  };

  const renderItem = ({ item }: { item: Item }) => {
    const finalPrice = item.base_price * (1 + item.profit_percentage / 100);
    
    if (isListView) {
      return (
        <Card 
          style={styles.listCard} 
          onPress={() => navigation.navigate('ItemDetail', { itemId: item.id })}
        >
          <List.Item
            title={item.name}
            titleStyle={{ fontWeight: 'bold' }}
            description={() => (
              <View>
                <Text variant="bodySmall">
                  {t('basePrice')}: {currency} {item.base_price.toLocaleString()}
                </Text>
                <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>
                  {t('totalPrice')}: {currency} {finalPrice.toLocaleString()}
                </Text>
                <Text style={styles.profitText}>+{item.profit_percentage}% Profit</Text>
              </View>
            )}
            left={() => (
              <View style={styles.listImageContainer}>
                {item.image_uri ? (
                  <Image source={{ uri: item.image_uri }} style={styles.listImage} />
                ) : (
                  <View style={styles.listPlaceholderImage}>
                    <Text variant="titleMedium">{item.name[0]}</Text>
                  </View>
                )}
              </View>
            )}
            right={props => <List.Icon {...props} icon={I18nManager.isRTL ? "chevron-left" : "chevron-right"} />}
          />
        </Card>
      );
    }

    return (
      <Card 
        style={styles.card} 
        onPress={() => navigation.navigate('ItemDetail', { itemId: item.id })}
      >
        {item.image_uri ? (
          <Card.Cover source={{ uri: item.image_uri }} style={styles.cardCover} />
        ) : (
          <View style={styles.gridPlaceholderImage}>
            <Text variant="headlineMedium">{item.name[0]}</Text>
          </View>
        )}
        <Card.Content>
          <Title numberOfLines={1}>{item.name}</Title>
          <Text variant="bodySmall">
            {t('basePrice')}: {currency} {item.base_price.toLocaleString()}
          </Text>
          <Paragraph style={{ fontWeight: 'bold' }}>
            {t('totalPrice')}: {currency} {finalPrice.toLocaleString()}
          </Paragraph>
          <Paragraph style={styles.profitText}>+{item.profit_percentage}% Profit</Paragraph>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <Searchbar
          placeholder={t('items')}
          onChangeText={onChangeSearch}
          value={searchQuery}
          style={styles.searchBar}
        />
        <IconButton
          icon="sort-variant"
          mode="contained-tonal"
          onPress={() => setSortModalVisible(true)}
          style={styles.toggleBtn}
        />
        <IconButton
          icon={isListView ? "view-grid" : "view-list"}
          mode="contained-tonal"
          onPress={() => setIsListView(!isListView)}
          style={styles.toggleBtn}
        />
      </View>

      <FlatList
        key={isListView ? 'list' : 'grid'}
        data={filteredItems}
        keyExtractor={(item) => item.id!.toString()}
        numColumns={isListView ? 1 : 2}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>{t('noItems')}</Text>}
      />

      <FAB
        icon="package-variant-closed-plus"
        style={styles.fab}
        onPress={() => setAddItemVisible(true)}
      />

      <AddItemModal
        visible={addItemVisible}
        onDismiss={() => setAddItemVisible(false)}
        onSuccess={loadItems}
      />

      <SortModal
        visible={sortModalVisible}
        onDismiss={() => setSortModalVisible(false)}
        onSave={handleSortSave}
        initialCriteria={sortCriteria}
        initialOrder={sortOrder}
        options={[
          { label: t('sortName'), value: 'name' },
          { label: t('sortPrice'), value: 'price' },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchBar: {
    flex: 1,
  },
  toggleBtn: {
    marginLeft: 8,
  },
  listContent: {
    padding: 8,
    paddingBottom: 80,
  },
  card: {
    flex: 1,
    margin: 8,
    maxWidth: '46%',
  },
  listCard: {
    marginHorizontal: 8,
    marginVertical: 4,
  },
  cardCover: {
    height: 120,
  },
  gridPlaceholderImage: {
    height: 120,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  listPlaceholderImage: {
    width: 50,
    height: 50,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  listImageContainer: {
    justifyContent: 'center',
    marginRight: 8,
    marginLeft: 8,
  },
  listImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  profitText: {
    color: '#4CAF50',
    fontSize: 12,
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

export default ItemsScreen;
