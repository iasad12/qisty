import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CurrencyContextType {
  currency: string;
  setCurrency: (currency: string) => void;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState('PKR');

  useEffect(() => {
    const loadCurrency = async () => {
      try {
        const savedCurrency = await AsyncStorage.getItem('settings.currency');
        if (savedCurrency) {
          setCurrencyState(savedCurrency);
        }
      } catch (e) {
        console.warn('AsyncStorage error loading currency:', e);
      }
    };
    loadCurrency();
  }, []);

  const setCurrency = async (newCurrency: string) => {
    setCurrencyState(newCurrency);
    try {
      await AsyncStorage.setItem('settings.currency', newCurrency);
    } catch (e) {
      console.warn('AsyncStorage error saving currency:', e);
    }
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error('useCurrency must be used within CurrencyProvider');
  return context;
};
