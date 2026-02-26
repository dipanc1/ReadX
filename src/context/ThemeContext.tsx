import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppTheme, ThemeMode } from '../types';

const THEME_KEY = '@readx_theme';

const lightTheme: AppTheme = {
  mode: 'light',
  colors: {
    background: '#F8FAFC',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    text: '#0F172A',
    textSecondary: '#64748B',
    primary: '#6366F1',
    primaryLight: '#EEF2FF',
    border: '#E2E8F0',
    error: '#EF4444',
    accent: '#F59E0B',
    modalOverlay: 'rgba(15, 23, 42, 0.5)',
  },
};

const darkTheme: AppTheme = {
  mode: 'dark',
  colors: {
    background: '#0F172A',
    surface: '#1E293B',
    card: '#1E293B',
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    primary: '#818CF8',
    primaryLight: 'rgba(129, 140, 248, 0.12)',
    border: '#334155',
    error: '#F87171',
    accent: '#FBBF24',
    modalOverlay: 'rgba(0, 0, 0, 0.75)',
  },
};

interface ThemeContextType {
  theme: AppTheme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>('light');

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((saved) => {
      if (saved === 'dark' || saved === 'light') {
        setMode(saved);
      }
    });
  }, []);

  const toggleTheme = () => {
    const next = mode === 'light' ? 'dark' : 'light';
    setMode(next);
    AsyncStorage.setItem(THEME_KEY, next);
  };

  const theme = mode === 'light' ? lightTheme : darkTheme;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
