import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image, I18nManager } from 'react-native';
import { Button, Text, List, IconButton, Divider, ActivityIndicator, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../context/CurrencyContext';
import { useFocusEffect, useRoute, useNavigation } from '@react-navigation/native';
import { dbService } from '../services/dbService';
import { Item, PlanWithDetails } from '../types';
import AddItemModal from '../components/AddItemModal';

const ItemDetailScreen = () => {
  const { t } = useTranslation();
  const { currency } = useCurrency();
  const route = useRoute();
  const navigation = useNavigation<any>();
  const { itemId } = route.params as { itemId: number };

  const [item, setItem] = useState<Item | null>(null);
  const [plans, setPlans] = useState<PlanWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [editItemVisible, setEditItemVisible] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const allItems = await dbService.getItems();
    const foundItem = allItems.find(i => i.id === itemId);
    if (foundItem) {
      setItem(foundItem);
      const itemPlans = await dbService.getPlansByItem(itemId);
      setPlans(itemPlans);
    }
    setLoading(false);
  }, [itemId]);

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

  if (!item) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text>{t('noItems')}</Text>
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
            await dbService.deleteItem(item.id!);
            navigation.goBack();
          } 
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {item.image_uri ? (
          <Image source={{ uri: item.image_uri }} style={styles.image} />
        ) : (
          <View style={[styles.placeholderImage, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Text variant="headlineLarge">{item.name[0]}</Text>
          </View>
        )}
        
        <View style={styles.header}>
          <Text variant="headlineSmall">{item.name}</Text>
          <Text variant="bodyLarge" style={styles.successText}>+{item.profit_percentage}% Profit</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text variant="labelSmall" style={styles.statLabel}>{t('basePrice')}</Text>
            <Text variant="bodyLarge">{currency} {item.base_price.toLocaleString()}</Text>
          </View>
        </View>

        <Divider style={styles.divider} />

        <Text variant="titleMedium" style={styles.sectionTitle}>{t('linkedInstallments')}</Text>

        {plans.length === 0 ? (
          <Text style={styles.emptyText}>{t('noItems')}</Text>
        ) : (
          plans.map((plan) => (
            <List.Item
              key={plan.id}
              title={plan.customer_name}
              description={`${currency} ${plan.monthly_installment_amount.toLocaleString()} - ${plan.months_paid}/${plan.total_months}`}
              onPress={() => navigation.navigate('InstallmentDetail', { planId: plan.id })}
              left={props => <List.Icon {...props} icon={plan.status === 'completed' ? 'check-circle' : 'clock-outline'} color={plan.status === 'completed' ? '#4CAF50' : '#2196F3'} />}
              right={props => <List.Icon {...props} icon={I18nManager.isRTL ? "chevron-left" : "chevron-right"} />}
            />
          ))
        )}

        <View style={styles.footerButtons}>
          <Button icon="pencil" mode="outlined" onPress={() => setEditItemVisible(true)} style={styles.footerBtn}>
            {t('editItem')}
          </Button>
          <Button icon="delete" mode="outlined" textColor="#F44336" onPress={handleDelete} style={styles.footerBtn}>
            {t('delete')}
          </Button>
        </View>
      </ScrollView>

      <AddItemModal
        visible={editItemVisible}
        onDismiss={() => setEditItemVisible(false)}
        onSuccess={loadData}
        initialItem={item}
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
  image: {
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
  },
  placeholderImage: {
    height: 200,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  header: {
    marginBottom: 12,
  },
  successText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    opacity: 0.6,
    marginBottom: 2,
  },
  divider: {
    marginVertical: 12,
  },
  sectionTitle: {
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

export default ItemDetailScreen;
