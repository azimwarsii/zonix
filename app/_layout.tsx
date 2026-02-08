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
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import 'react-native-reanimated';

import CustomDrawerContent from '@/components/CustomDrawerContent';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '../context/AuthContext';

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

  useEffect(() => {
    // Initialize RevenueCat
    Purchases.setLogLevel(LOG_LEVEL.VERBOSE);

    const iosApiKey = 'test_MlPRLBjvIJNMYolhzdIiSRrtnmz';


    //const iosApiKey = 'appl_eAvndgscosrWeRfQhjEnNEIROOX'; //need change
    const androidApiKey = 'test_MlPRLBjvIJNMYolhzdIiSRrtnmz';

    if (Platform.OS === 'ios') {
      Purchases.configure({ apiKey: iosApiKey });
    } else if (Platform.OS === 'android') {
      Purchases.configure({ apiKey: androidApiKey });
    }
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
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
            <Drawer.Screen name="profile" options={{ headerShown: false, drawerLabel: 'Profile' }} />
          </Drawer>
          <StatusBar style="auto" />
        </ThemeProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
