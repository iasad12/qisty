import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform, I18nManager } from 'react-native';
import { Text, TextInput, Button, Card, Title, Paragraph, List, Divider, useTheme, Avatar, IconButton } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dbService } from '../services/dbService';
import { useCurrency } from '../context/CurrencyContext';

const OnboardingScreen = ({ onComplete }: { onComplete: () => void }) => {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { currency, setCurrency } = useCurrency();
  const [step, setStep] = useState(1); // 1: Language, 2: Business, 3: Customer, 4: Item, 5: Plan, 6: Success

  // Step 2: Business Info
  const [businessName, setBusinessName] = useState('');
  const [localCurrency, setLocalCurrency] = useState('PKR');

  // Step 3: Customer Info
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerId, setCustomerId] = useState<number | null>(null);

  // Step 4: Item Info
  const [itemName, setItemName] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [profitPercentage, setProfitPercentage] = useState('25');
  const [itemId, setItemId] = useState<number | null>(null);

  // Step 5: Plan Info
  const [deposit, setDeposit] = useState('');
  const [totalMonths, setTotalMonths] = useState('12');

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  const handleLanguageSelect = async (lang: string) => {
    if (i18n.language !== lang) {
      await i18n.changeLanguage(lang);
      const isRTL = lang === 'ur';
      if (I18nManager.isRTL !== isRTL) {
        I18nManager.forceRTL(isRTL);
        // On Expo Go, sometimes reload is needed, but we try to continue
      }
      await AsyncStorage.setItem('settings.lang', lang);
    }
    nextStep();
  };

  const handleStep2 = async () => {
    if (!businessName) {
      Alert.alert('Error', 'Please enter your business name');
      return;
    }
    await AsyncStorage.setItem('settings.businessName', businessName);
    await setCurrency(localCurrency);
    nextStep();
  };

  const handleStep3 = async () => {
    if (!customerName || !customerPhone) {
      Alert.alert('Error', 'Please enter customer name and phone');
      return;
    }
    try {
      const id = await dbService.addCustomer({ name: customerName, phone: customerPhone });
      setCustomerId(id);
      nextStep();
    } catch (e) {
      Alert.alert('Error', 'Failed to add customer');
    }
  };

  const handleStep4 = async () => {
    if (!itemName || !basePrice || !profitPercentage) {
      Alert.alert('Error', 'Please enter item details');
      return;
    }
    try {
      const id = await dbService.addItem({
        name: itemName,
        base_price: parseFloat(basePrice),
        profit_percentage: parseFloat(profitPercentage),
      });
      setItemId(id);
      nextStep();
    } catch (e) {
      Alert.alert('Error', 'Failed to add item');
    }
  };

  const handleStep5 = async () => {
    if (!deposit || !totalMonths || !customerId || !itemId) {
      Alert.alert('Error', 'Please enter installment details');
      return;
    }
    try {
      const price = parseFloat(basePrice) * (1 + parseFloat(profitPercentage) / 100);
      const monthlyAmount = (price - parseFloat(deposit)) / parseInt(totalMonths);

      await dbService.addPlan({
        customer_id: customerId,
        item_id: itemId,
        total_price: price,
        deposit: parseFloat(deposit),
        monthly_installment_amount: monthlyAmount,
        total_months: parseInt(totalMonths),
        months_paid: 0,
        status: 'active',
        start_date: new Date().toISOString(),
      });
      nextStep();
    } catch (e) {
      Alert.alert('Error', 'Failed to create plan');
    }
  };

  const finishOnboarding = async () => {
    await AsyncStorage.setItem('settings.hasCompletedOnboarding', 'true');
    onComplete();
  };

  const skipOnboarding = async () => {
    Alert.alert(
      t('skip'),
      'Are you sure you want to skip the setup wizard?',
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('confirm'), onPress: finishOnboarding }
      ]
    );
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Title style={styles.stepTitle}>Select Language / زبان منتخب کریں</Title>
            <Paragraph style={styles.stepDesc}>Choose your preferred language to continue.</Paragraph>
            <Button 
              mode="outlined" 
              onPress={() => handleLanguageSelect('en')} 
              style={styles.input}
              contentStyle={styles.langBtnContent}
            >
              English
            </Button>
            <Button 
              mode="outlined" 
              onPress={() => handleLanguageSelect('ur')} 
              style={styles.input}
              contentStyle={styles.langBtnContent}
            >
              اردو (Urdu)
            </Button>
          </View>
        );
      case 2:
        return (
          <View style={styles.stepContainer}>
            <Title style={styles.stepTitle}>{t('onboardingStep1Title')}</Title>
            <Paragraph style={styles.stepDesc}>{t('onboardingWelcomeDesc')}</Paragraph>
            <TextInput
              label={t('businessName')}
              value={businessName}
              onChangeText={setBusinessName}
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label={t('currency')}
              value={localCurrency}
              onChangeText={setLocalCurrency}
              mode="outlined"
              style={styles.input}
              placeholder="PKR, $, €"
            />
            <View style={styles.btnRow}>
              <Button mode="outlined" onPress={prevStep} style={styles.flexBtn}>{t('back')}</Button>
              <Button mode="contained" onPress={handleStep2} style={styles.flexBtn}>{t('next')}</Button>
            </View>
          </View>
        );
      case 3:
        return (
          <View style={styles.stepContainer}>
            <Title style={styles.stepTitle}>{t('onboardingStep2Title')}</Title>
            <Paragraph style={styles.stepDesc}>{t('onboardingStep2Desc')}</Paragraph>
            <TextInput
              label={t('name')}
              value={customerName}
              onChangeText={setCustomerName}
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label={t('phone')}
              value={customerPhone}
              onChangeText={setCustomerPhone}
              mode="outlined"
              keyboardType="phone-pad"
              style={styles.input}
            />
            <View style={styles.btnRow}>
              <Button mode="outlined" onPress={prevStep} style={styles.flexBtn}>{t('back')}</Button>
              <Button mode="contained" onPress={handleStep3} style={styles.flexBtn}>{t('next')}</Button>
            </View>
          </View>
        );
      case 4:
        return (
          <View style={styles.stepContainer}>
            <Title style={styles.stepTitle}>{t('onboardingStep3Title')}</Title>
            <Paragraph style={styles.stepDesc}>{t('onboardingStep3Desc')}</Paragraph>
            <TextInput
              label={t('name')}
              value={itemName}
              onChangeText={setItemName}
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label={t('basePrice')}
              value={basePrice}
              onChangeText={setBasePrice}
              mode="outlined"
              keyboardType="numeric"
              style={styles.input}
            />
            <TextInput
              label={t('profitPercentage')}
              value={profitPercentage}
              onChangeText={setProfitPercentage}
              mode="outlined"
              keyboardType="numeric"
              style={styles.input}
            />
            <View style={styles.btnRow}>
              <Button mode="outlined" onPress={prevStep} style={styles.flexBtn}>{t('back')}</Button>
              <Button mode="contained" onPress={handleStep4} style={styles.flexBtn}>{t('next')}</Button>
            </View>
          </View>
        );
      case 5:
        return (
          <View style={styles.stepContainer}>
            <Title style={styles.stepTitle}>{t('onboardingStep4Title')}</Title>
            <Paragraph style={styles.stepDesc}>{t('onboardingStep4Desc')}</Paragraph>
            <TextInput
              label={t('deposit')}
              value={deposit}
              onChangeText={setDeposit}
              mode="outlined"
              keyboardType="numeric"
              style={styles.input}
            />
            <TextInput
              label={t('months')}
              value={totalMonths}
              onChangeText={setTotalMonths}
              mode="outlined"
              keyboardType="numeric"
              style={styles.input}
            />
            <View style={styles.btnRow}>
              <Button mode="outlined" onPress={prevStep} style={styles.flexBtn}>{t('back')}</Button>
              <Button mode="contained" onPress={handleStep5} style={styles.flexBtn}>{t('next')}</Button>
            </View>
          </View>
        );
      case 6:
        return (
          <View style={styles.stepContainer}>
            <IconButton icon="check-circle" size={80} iconColor={theme.colors.primary} style={styles.icon} />
            <Title style={styles.stepTitle}>{t('onboardingSuccess')}</Title>
            <Paragraph style={[styles.stepDesc, { textAlign: 'center' }]}>{t('onboardingSuccessDesc')}</Paragraph>
            <Button mode="contained" onPress={finishOnboarding} style={styles.nextBtn}>
              {t('getStarted')}
            </Button>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Title style={styles.mainTitle}>Qisty</Title>
        {step < 6 && (
          <Button onPress={skipOnboarding} textColor={theme.colors.error}>
            {t('skip')}
          </Button>
        )}
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.card}>
          <Card.Content>
            {renderStep()}
          </Card.Content>
        </Card>
        <Text style={styles.stepIndicator}>Step {step} of 6</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  scrollContent: {
    padding: 24,
    flexGrow: 1,
    justifyContent: 'center',
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  card: {
    elevation: 4,
    borderRadius: 16,
  },
  stepContainer: {
    paddingVertical: 8,
  },
  stepTitle: {
    fontSize: 22,
    marginBottom: 8,
    lineHeight: 28,
  },
  stepDesc: {
    marginBottom: 24,
    opacity: 0.7,
  },
  input: {
    marginBottom: 16,
  },
  langBtnContent: {
    paddingVertical: 8,
  },
  nextBtn: {
    marginTop: 8,
    paddingVertical: 4,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  flexBtn: {
    flex: 1,
    paddingVertical: 4,
  },
  icon: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  stepIndicator: {
    textAlign: 'center',
    marginTop: 24,
    opacity: 0.5,
  },
});

export default OnboardingScreen;
