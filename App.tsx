import React, { useState } from 'react';
import { ThemeProvider } from './src/context/ThemeContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { SplashScreen } from './src/components/SplashScreen';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <ThemeProvider>
      <AppNavigator />
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
    </ThemeProvider>
  );
}
