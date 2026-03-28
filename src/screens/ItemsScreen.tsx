import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Image, I18nManager } from 'react-native';
import { Searchbar, FAB, Text, Card, Title, Paragraph, IconButton, List } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../context/CurrencyContext';
import { dbService } from '../services/dbService';
import { Item } from '../types';
import AddItemModal from '../components/AddItemModal';
import { useNavigation } from '@react-navigation/native';

const ItemsScreen = () => {
  const { t } = useTranslation();
  const { currency } = useCurrency();
  const navigation = useNavigation<any>();
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isListView, setIsListView] = useState(true);

  const [addItemVisible, setAddItemVisible] = useState(false);

  const loadItems = async () => {
    const data = await dbService.getItems();
    setItems(data);
    setFilteredItems(data);
  };

  useEffect(() => {
    loadItems();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadItems();
    setRefreshing(false);
  };

  const onChangeSearch = (query: string) => {
    setSearchQuery(query);
    const filtered = items.filter(i => i.name.toLowerCase().includes(query.toLowerCase()));
    setFilteredItems(filtered);
  };

  const renderItem = ({ item }: { item: Item }) => {
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
                <Text>{currency} {item.base_price.toLocaleString()}</Text>
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
          <Paragraph>{currency} {item.base_price.toLocaleString()}</Paragraph>
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
