import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { 
  DefaultTheme as NavDefaultTheme, 
  DarkTheme as NavDarkTheme 
} from '@react-navigation/native';

const fonts = {
  regular: { fontFamily: 'System', fontWeight: '400' },
  medium: { fontFamily: 'System', fontWeight: '500' },
  light: { fontFamily: 'System', fontWeight: '300' },
  thin: { fontFamily: 'System', fontWeight: '100' },
} as any;

export const lightTheme = {
  ...MD3LightTheme,
  ...NavDefaultTheme,
  fonts: {
    ...MD3LightTheme.fonts,
    ...fonts,
  },
  colors: {
    ...MD3LightTheme.colors,
    ...NavDefaultTheme.colors,
    primary: '#2196F3',
    secondary: '#03DAC6',
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  ...NavDarkTheme,
  fonts: {
    ...MD3DarkTheme.fonts,
    ...fonts,
  },
  colors: {
    ...MD3DarkTheme.colors,
    ...NavDarkTheme.colors,
    primary: '#90CAF9',
    secondary: '#03DAC6',
    background: '#000000', // AMOLED Black
    surface: '#121212',
  },
};
