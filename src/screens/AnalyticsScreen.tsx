import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, FlatList } from 'react-native';
import { Text, Card, Title, Paragraph, List, Divider, SegmentedButtons, useTheme, ActivityIndicator } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../context/CurrencyContext';
import { dbService } from '../services/dbService';
import { AnalyticsData, AnalyticsCollection } from '../types';
import { useNavigation } from '@react-navigation/native';

const PAGE_SIZE = 30;

const AnalyticsScreen = () => {
  const { t } = useTranslation();
  const { currency } = useCurrency();
  const theme = useTheme();
  const navigation = useNavigation<any>();
  
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [collections, setCollections] = useState<AnalyticsCollection[]>([]);
  const [totals, setTotals] = useState({ totalReceived: 0, totalProfit: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const loadData = useCallback(async (isRefreshing = false) => {
    const currentOffset = isRefreshing ? 0 : offset;
    const result = await dbService.getAnalyticsData(period, PAGE_SIZE, currentOffset);
    
    setTotals({ totalReceived: result.totalReceived, totalProfit: result.totalProfit });
    
    if (isRefreshing) {
      setCollections(result.collections);
      setHasMore(result.collections.length === PAGE_SIZE);
      setOffset(PAGE_SIZE);
    } else {
      setCollections(prev => [...prev, ...result.collections]);
      setHasMore(result.collections.length === PAGE_SIZE);
      setOffset(prev => prev + PAGE_SIZE);
    }
  }, [period, offset]);

  useEffect(() => {
    // Reset and load when period changes
    onRefresh();
  }, [period]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  };

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await loadData(false);
    setLoadingMore(false);
  };

  const renderCollectionItem = ({ item }: { item: AnalyticsCollection }) => {
    const baseAmount = item.amount_collected - item.profit;
    const dateObj = new Date(item.collection_date);
    const dateStr = dateObj.toLocaleDateString();
    const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <Card 
        style={styles.collectionCard} 
        mode="outlined"
        onPress={() => navigation.navigate('InstallmentDetail', { planId: item.plan_id })}
      >
        <Card.Content>
          <View style={styles.collectionHeader}>
            <View>
              <Text variant="titleMedium">{item.customer_name}</Text>
              <Text variant="bodySmall">{item.item_name}</Text>
            </View>
            <View style={styles.alignRight}>
              <Text variant="bodySmall">{dateStr}</Text>
              <Text variant="bodySmall">{timeStr}</Text>
            </View>
          </View>
          <Divider style={styles.collectionDivider} />
          <View style={styles.collectionDetails}>
            <View>
              <Text variant="labelSmall" style={styles.label}>{t('collectionAmount')}</Text>
              <Text variant="titleMedium">{currency} {item.amount_collected.toLocaleString()}</Text>
            </View>
            <View style={styles.alignCenter}>
              <Text variant="labelSmall" style={styles.label}>{t('baseAmount')}</Text>
              <Text variant="titleMedium">{currency} {Math.round(baseAmount).toLocaleString()}</Text>
            </View>
            <View style={styles.alignRight}>
              <Text variant="labelSmall" style={styles.label}>{t('profit')}</Text>
              <Text variant="titleMedium" style={styles.successText}>{currency} {Math.round(item.profit).toLocaleString()}</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SegmentedButtons
          value={period}
          onValueChange={value => setPeriod(value as any)}
          buttons={[
            { value: 'daily', label: t('daily') },
            { value: 'weekly', label: t('weekly') },
            { value: 'monthly', label: t('monthly') },
            { value: 'yearly', label: t('yearly') },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      <FlatList
        data={collections}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderItem={renderCollectionItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <View style={styles.content}>
            <View style={styles.statsRow}>
              <Card style={[styles.statCard, { flex: 1, marginRight: 8 }]}>
                <Card.Content>
                  <Text variant="labelMedium">{t('totalReceived')}</Text>
                  <Text variant="headlineSmall" style={styles.receivedText}>
                    {currency} {totals.totalReceived.toLocaleString()}
                  </Text>
                </Card.Content>
              </Card>
              <Card style={[styles.statCard, { flex: 1, marginLeft: 8 }]}>
                <Card.Content>
                  <Text variant="labelMedium">{t('totalProfit')}</Text>
                  <Text variant="headlineSmall" style={styles.successText}>
                    {currency} {Math.round(totals.totalProfit).toLocaleString()}
                  </Text>
                </Card.Content>
              </Card>
            </View>

            <Title style={styles.subtitle}>{t('profitPerCollection')}</Title>
          </View>
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={{ marginVertical: 16 }} />
          ) : !hasMore && collections.length > 0 ? (
            <Text style={styles.footerText}>No more entries</Text>
          ) : null
        }
        ListEmptyComponent={
          !refreshing ? (
            <View style={styles.emptyContainer}>
              <Text variant="bodyMedium" style={styles.emptyText}>{t('noCollectionsYet')}</Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    backgroundColor: 'transparent',
  },
  segmentedButtons: {
    marginBottom: 8,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  statCard: {
    elevation: 2,
  },
  receivedText: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  successText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 24,
  },
  collectionCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
  },
  collectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  collectionDivider: {
    marginVertical: 8,
  },
  collectionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    opacity: 0.7,
    marginBottom: 2,
  },
  alignRight: {
    alignItems: 'flex-end',
  },
  alignCenter: {
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    opacity: 0.5,
  },
  footerText: {
    textAlign: 'center',
    opacity: 0.3,
    marginVertical: 16,
    fontSize: 12,
  },
});

export default AnalyticsScreen;
