
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Drawer } from 'expo-router/drawer';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { LogBox, Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import 'react-native-reanimated';

LogBox.ignoreLogs([
  'Text strings must be rendered within a <Text> component',
]);

import AnimatedSplashScreen from '@/components/AnimatedSplashScreen';
import CustomDrawerContent from '@/components/CustomDrawerContent';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../context/AuthContext';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [appIsReady, setAppIsReady] = useState(false);
  const [splashAnimationFinished, setSplashAnimationFinished] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Pre-load fonts, make any API calls you need to do here
        // await Font.loadAsync({ ... });

        // Artificially delay for one second to simulate preparation
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (e) {
        console.warn(e);
      } finally {
        // Tell the application to render
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    if (appIsReady) {
      SplashScreen.hideAsync().catch(() => { });
    }
  }, [appIsReady]);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      await SplashScreen.hideAsync().catch(() => { });
    }
  }, [appIsReady]);

  useEffect(() => {
    // Initialize RevenueCat
    Purchases.setLogLevel(LOG_LEVEL.VERBOSE);

    const iosApiKey = 'appl_eAvndgscosrWeRfQhjEnNEIROOX';

    //const iosApiKey = 'test_MlPRLBjvIJNMYolhzdIiSRrtnmz';
    const androidApiKey = 'goog_wklPZQCeqRvPgHDvmEZWOxByWEz';

    if (Platform.OS === 'ios') {
      Purchases.configure({ apiKey: iosApiKey });
    } else if (Platform.OS === 'android') {
      Purchases.configure({ apiKey: androidApiKey });
    }
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <SafeAreaProvider>
        <AuthProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <View style={{ flex: 1 }}>
              {appIsReady && (
                <Drawer
                  drawerContent={(props) => <CustomDrawerContent {...props} />}
                  screenOptions={{
                    headerShown: false,
                    drawerType: 'front',
                  }}
                >
                  <Drawer.Screen name="(tabs)" options={{ headerShown: false, drawerLabel: 'Home' }} />
                  <Drawer.Screen name="feed" options={{ headerShown: false, drawerLabel: 'Feed' }} />
                  <Drawer.Screen name="profile" options={{ headerShown: false, drawerLabel: 'Profile' }} />
                </Drawer>
              )}

              {!splashAnimationFinished && (
                <AnimatedSplashScreen
                  onAnimationFinish={() => setSplashAnimationFinished(true)}
                />
              )}
            </View>
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} translucent backgroundColor="transparent" />
          </ThemeProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
