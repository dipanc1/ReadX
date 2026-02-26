import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { HomeScreen } from '../screens/HomeScreen';
import { PdfViewerScreen } from '../screens/PdfViewerScreen';
import { BookmarksScreen } from '../screens/BookmarksScreen';
import { PdfDocument } from '../types';

// ─── Type Definitions ───────────────────────────────────────
export type RootStackParamList = {
  HomeTabs: undefined;
  PdfViewer: { pdf: PdfDocument };
};

type TabParamList = {
  Home: undefined;
  Bookmarks: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// ─── Bottom Tabs ────────────────────────────────────────────
const HomeTabs: React.FC = () => {
  const { theme } = useTheme();
  const colors = theme.colors;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 10,
          paddingTop: 8,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.3,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Library',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 22, color }}>📚</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Bookmarks"
        component={BookmarksScreen}
        options={{
          tabBarLabel: 'Vocabulary',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 22, color }}>⭐</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// ─── Root Stack ─────────────────────────────────────────────
export const AppNavigator: React.FC = () => {
  const { theme } = useTheme();
  const colors = theme.colors;

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen
          name="HomeTabs"
          component={HomeTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="PdfViewer"
          component={PdfViewerScreen}
          options={({ route }) => ({
            title: route.params.pdf.name.replace('.pdf', ''),
            headerBackTitle: 'Back',
            headerTitleStyle: { fontWeight: '700', fontSize: 16, letterSpacing: 0.2 },
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
