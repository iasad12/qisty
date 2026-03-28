import React, { useEffect, useState } from 'react';
import { I18nManager } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider, useAppTheme } from './src/context/ThemeContext';
import { lightTheme, darkTheme } from './src/theme';
import { initDatabase } from './src/database/db';
import MainNavigator from './src/navigation/MainNavigator';
import i18n from './src/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const AppContent = () => {
  const { isDark } = useAppTheme();
  const theme = isDark ? darkTheme : lightTheme;
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const prepare = async () => {
      try {
        await initDatabase();
        
        // Sync language
        const savedLang = await AsyncStorage.getItem('settings.lang');
        if (savedLang && i18n.language !== savedLang) {
          await i18n.changeLanguage(savedLang);
        }

        // Handle RTL for Urdu
        const currentLang = i18n.language;
        const isRTL = currentLang === 'ur';
        if (I18nManager.isRTL !== isRTL) {
          I18nManager.forceRTL(isRTL);
          // RTL changes require an app restart on some devices, 
          // but for Expo Go it often works after reload.
        }
      } catch (e) {
        console.warn('Init error:', e);
      } finally {
        setIsReady(true);
      }
    };
    prepare();
  }, []);

  if (!isReady) return null;

  return (
    <I18nextProvider i18n={i18n}>
      <PaperProvider theme={theme}>
        <StatusBar 
          barStyle={isDark ? 'light-content' : 'dark-content'} 
          backgroundColor={theme.colors.background}
        />
        <NavigationContainer theme={isDark ? darkTheme : lightTheme}>
          <MainNavigator />
        </NavigationContainer>
      </PaperProvider>
    </I18nextProvider>
  );
};

import { CurrencyProvider } from './src/context/CurrencyContext';

// Keep the existing providers but add CurrencyProvider
export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <CurrencyProvider>
          <AppContent />
        </CurrencyProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
