import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { IconButton, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View } from 'react-native';

import HomeScreen from '../screens/HomeScreen';
import InstallmentsScreen from '../screens/InstallmentsScreen';
import CustomersScreen from '../screens/CustomersScreen';
import ItemsScreen from '../screens/ItemsScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import InstallmentDetailScreen from '../screens/InstallmentDetailScreen';
import CustomerDetailScreen from '../screens/CustomerDetailScreen';
import ItemDetailScreen from '../screens/ItemDetailScreen';
import OnboardingScreen from '../screens/OnboardingScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TabNavigator = () => {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName: any;
          if (route.name === 'Home') iconName = 'home';
          else if (route.name === 'Installments') iconName = 'format-list-bulleted';
          else if (route.name === 'Customers') iconName = 'account-group';
          else if (route.name === 'Items') iconName = 'package-variant-closed';
          else if (route.name === 'Analytics') iconName = 'chart-bar';
          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
        headerRight: () => (
          route.name !== 'Settings' ? (
            <IconButton 
              icon="cog" 
              onPress={() => navigation.navigate('Settings')} 
            />
          ) : null
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: t('home') }} />
      <Tab.Screen name="Installments" component={InstallmentsScreen} options={{ title: t('installments') }} />
      <Tab.Screen name="Customers" component={CustomersScreen} options={{ title: t('customers') }} />
      <Tab.Screen name="Items" component={ItemsScreen} options={{ title: t('items') }} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} options={{ title: t('analytics') }} />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen} 
        options={{ 
          title: t('settings'),
          tabBarItemStyle: { display: 'none' }, // Fully hides the item from the layout
        }} 
      />
    </Tab.Navigator>
  );
};

const MainNavigator = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [isFirstTime, setIsFirstTime] = useState(true);

  useEffect(() => {
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    try {
      const completed = await AsyncStorage.getItem('settings.hasCompletedOnboarding');
      if (completed === 'true') {
        setIsFirstTime(false);
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (isFirstTime) {
    return <OnboardingScreen onComplete={() => setIsFirstTime(false)} />;
  }

  return (
    <Stack.Navigator>
      <Stack.Screen name="MainTabs" component={TabNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="InstallmentDetail" component={InstallmentDetailScreen} options={{ title: t('installmentDetails') }} />
      <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} options={{ title: t('customerDetails') }} />
      <Stack.Screen name="ItemDetail" component={ItemDetailScreen} options={{ title: t('itemDetails') }} />
    </Stack.Navigator>
  );
};

export default MainNavigator;
