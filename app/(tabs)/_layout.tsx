import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { Fonts } from '@/constants/Fonts';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tabIconSelected,
        tabBarInactiveTintColor: colors.tabIconDefault,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          height: Platform.OS === 'ios' ? 88 : 60,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: Fonts.body,
          fontWeight: '500',
        },
      }}>
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "compass" : "compass-outline"} size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "chatbubble" : "chatbubble-outline"} size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Create',
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "add-circle" : "add-circle-outline"} size={26} color={color} />,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Ranks',
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "trophy" : "trophy-outline"} size={26} color={color} />,
        }}
      />
      <Tabs.Screen
        name="my-ai"
        options={{
          title: 'My AI',
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "sparkles" : "sparkles-outline"} size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          href: null, // Hide index from the tab bar
        }}
      />
    </Tabs>
  );
}
