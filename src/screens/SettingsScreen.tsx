import React, { useLayoutEffect, useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, I18nManager, Linking, Platform } from 'react-native';
import { List, Divider, Text, RadioButton, IconButton, TextInput, Button, Portal, Dialog } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SettingsScreen = () => {
  const { t, i18n } = useTranslation();
  const { setThemeMode, themeMode } = useAppTheme();
  const { currency, setCurrency } = useCurrency();
  const navigation = useNavigation<any>();
  const [businessName, setBusinessName] = useState('');
  const [businessNameDialogVisible, setBusinessNameDialogVisible] = useState(false);
  const [tempBusinessName, setTempBusinessName] = useState('');
  const [currencyDialogVisible, setCurrencyDialogVisible] = useState(false);
  const [tempCurrency, setTempCurrency] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const name = await AsyncStorage.getItem('settings.businessName');
      if (name) setBusinessName(name);
      // Currency is now loaded by context, but we might want to sync if needed.
    } catch (e) {
      console.warn('Error loading settings:', e);
    }
  };

  const saveBusinessName = async () => {
    try {
      await AsyncStorage.setItem('settings.businessName', tempBusinessName);
      setBusinessName(tempBusinessName);
      setBusinessNameDialogVisible(false);
    } catch (e) {
      console.warn('Error saving business name:', e);
    }
  };

  const saveCurrencyToContext = async () => {
    setCurrency(tempCurrency);
    setCurrencyDialogVisible(false);
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <IconButton 
          icon={I18nManager.isRTL ? "arrow-right" : "arrow-left"} 
          onPress={() => navigation.navigate('Home')} 
        />
      ),
    });
  }, [navigation]);

  const changeLanguage = async (newLang: string) => {
    if (i18n.language === newLang) return;
    
    await i18n.changeLanguage(newLang);
    
    // Handle RTL
    const isRTL = newLang === 'ur';
    if (I18nManager.isRTL !== isRTL) {
      I18nManager.forceRTL(isRTL);
      Alert.alert(
        newLang === 'en' ? 'Restart Required' : 'دوبارہ شروع کرنا ضروری ہے',
        newLang === 'en' 
          ? 'Please restart the app to apply the layout changes correctly.' 
          : 'براہ کرم لے آؤٹ کی تبدیلیوں کو صحیح طریقے سے لاگو کرنے کے لیے ایپ کو دوبارہ شروع کریں۔'
      );
    }
    
    try {
      await AsyncStorage.setItem('settings.lang', newLang);
    } catch (e) {
      console.warn('Error saving language:', e);
    }
  };

  const exportBackup = async () => {
    try {
      const dbDir = `${FileSystem.documentDirectory}SQLite/`;
      const dbPath = `${dbDir}qisty.db`;
      const exists = await FileSystem.getInfoAsync(dbPath);
      
      if (!exists.exists) {
        Alert.alert('Error', 'Database file not found. Have you added any data yet?');
        return;
      }
      
      // On Android, use StorageAccessFramework to let user choose a directory
      if (Platform.OS === 'android') {
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          const fileName = `qisty_backup_${Date.now()}.db`;
          const base64Data = await FileSystem.readAsStringAsync(dbPath, { encoding: FileSystem.EncodingType.Base64 });
          
          const uri = await FileSystem.StorageAccessFramework.createFileAsync(permissions.directoryUri, fileName, 'application/octet-stream');
          await FileSystem.StorageAccessFramework.writeAsStringAsync(uri, base64Data, { encoding: FileSystem.EncodingType.Base64 });
          
          Alert.alert('Success', 'Backup saved successfully to your device.');
        } else {
          Alert.alert('Error', 'Permission to access storage was denied.');
        }
      } else {
        // Fallback for other platforms (iOS)
        const backupPath = `${FileSystem.cacheDirectory}qisty_backup_${Date.now()}.db`;
        await FileSystem.copyAsync({ from: dbPath, to: backupPath });
        
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(backupPath);
        }
      }
    } catch (error) {
      console.error('Export Error:', error);
      Alert.alert('Error', 'Failed to export backup. Please check storage permissions.');
    }
  };

  const importBackup = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        const selectedFile = result.assets[0];
        const dbDir = `${FileSystem.documentDirectory}SQLite/`;
        const dbPath = `${dbDir}qisty.db`;

        const dirInfo = await FileSystem.getInfoAsync(dbDir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(dbDir, { intermediates: true });
        }

        await FileSystem.copyAsync({
          from: selectedFile.uri,
          to: dbPath,
        });

        Alert.alert('Success', 'Backup restored successfully. Please restart the app for changes to take effect.', [
          { text: 'OK' }
        ]);
      }
    } catch (error) {
      console.error('Import Error:', error);
      Alert.alert('Error', 'Failed to import backup.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <ScrollView style={styles.container}>
        <List.Section>
          <List.Subheader>{t('theme')}</List.Subheader>
          <RadioButton.Group onValueChange={value => setThemeMode(value as any)} value={themeMode}>
            <List.Item
              title={t('themeSystem')}
              onPress={() => setThemeMode('system')}
              left={() => <RadioButton value="system" />}
            />
            <List.Item
              title={t('themeLight')}
              onPress={() => setThemeMode('light')}
              left={() => <RadioButton value="light" />}
            />
            <List.Item
              title={t('themeDark')}
              onPress={() => setThemeMode('dark')}
              left={() => <RadioButton value="dark" />}
            />
          </RadioButton.Group>

          <Divider />
          <List.Subheader>{t('businessName')}</List.Subheader>
          <List.Item
            title={businessName || t('enterBusinessName')}
            onPress={() => {
              setTempBusinessName(businessName);
              setBusinessNameDialogVisible(true);
            }}
            left={() => <List.Icon icon="storefront-outline" />}
          />

          <Divider />
          <List.Subheader>{t('currency')}</List.Subheader>
          <List.Item
            title={currency}
            onPress={() => {
              setTempCurrency(currency);
              setCurrencyDialogVisible(true);
            }}
            left={() => <List.Icon icon="cash-multiple" />}
          />

          <Divider />
          <List.Subheader>{t('language')}</List.Subheader>
          <RadioButton.Group onValueChange={value => changeLanguage(value)} value={i18n.language}>
            <List.Item
              title="English"
              onPress={() => changeLanguage('en')}
              left={() => <RadioButton value="en" />}
            />
            <List.Item
              title="اردو"
              onPress={() => changeLanguage('ur')}
              left={() => <RadioButton value="ur" />}
            />
          </RadioButton.Group>

          <Divider />
          <List.Subheader>{t('backupRestore')}</List.Subheader>
          <List.Item
            title={t('exportDB')}
            left={() => <List.Icon icon="database-export" />}
            onPress={exportBackup}
          />
          <List.Item
            title={t('importDB')}
            left={() => <List.Icon icon="database-import" />}
            onPress={importBackup}
          />
        </List.Section>
        <View style={styles.footer}>
          <Text variant="bodySmall">
            {t('creditsPart1')}
            <Text 
              style={styles.link} 
              onPress={() => Linking.openURL('https://asadimran.pages.dev')}
            >
              {t('creditsPart2')}
            </Text>
            {t('creditsPart3')}
          </Text>
        </View>
      </ScrollView>

      <Portal>
        <Dialog visible={businessNameDialogVisible} onDismiss={() => setBusinessNameDialogVisible(false)}>
          <Dialog.Title>{t('setBusinessName')}</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label={t('businessName')}
              value={tempBusinessName}
              onChangeText={setTempBusinessName}
              mode="outlined"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setBusinessNameDialogVisible(false)}>{t('cancel')}</Button>
            <Button onPress={saveBusinessName}>{t('save')}</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={currencyDialogVisible} onDismiss={() => setCurrencyDialogVisible(false)}>
          <Dialog.Title>{t('setCurrency')}</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label={t('currency')}
              placeholder={t('enterCurrency')}
              value={tempCurrency}
              onChangeText={setTempCurrency}
              mode="outlined"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCurrencyDialogVisible(false)}>{t('cancel')}</Button>
            <Button onPress={saveCurrencyToContext}>{t('save')}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    marginTop: 40,
  },
  link: {
    color: '#2196F3',
    textDecorationLine: 'underline',
  },
});

export default SettingsScreen;
