import React, { createContext, useContext, ReactNode } from 'react';
import type { AppTheme } from '../types';

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
}

const ThemeContext = createContext<ThemeContextType>({
  theme: darkTheme,
});

export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  return (
    <ThemeContext.Provider value={{ theme: darkTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
