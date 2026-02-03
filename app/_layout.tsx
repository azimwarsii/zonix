import {
  Antonio_100Thin,
  Antonio_300Light,
  Antonio_400Regular,
  useFonts,
} from '@expo-google-fonts/antonio';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Drawer } from 'expo-router/drawer';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import CustomDrawerContent from '@/components/CustomDrawerContent';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    Antonio_100Thin,
    Antonio_300Light,
    Antonio_400Regular,
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Drawer
          drawerContent={(props) => <CustomDrawerContent {...props} />}
          screenOptions={{
            headerShown: false,
            drawerStyle: {
              backgroundColor: '#0a0a0a',
              width: 280,
            },
            drawerType: 'front',
            overlayColor: 'rgba(0,0,0,0.8)',
          }}
        >
          <Drawer.Screen name="(tabs)" options={{ headerShown: false, drawerLabel: 'Home' }} />
          <Drawer.Screen name="feed" options={{ headerShown: false, drawerLabel: 'Feed' }} />
          <Drawer.Screen name="community" options={{ headerShown: false, drawerLabel: 'Community' }} />
          <Drawer.Screen name="profile" options={{ headerShown: false, drawerLabel: 'Profile' }} />
        </Drawer>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
