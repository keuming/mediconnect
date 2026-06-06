import React from 'react';
import { StatusBar, LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { RootNavigator } from './src/navigation/navigators';

LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'Warning: ReactNativeFiberHostComponent',
]);

const queryClient = new QueryClient({
  defaultOptions: {
    queries:   { retry: 2, staleTime: 30000, refetchOnWindowFocus: false },
    mutations: { retry: 0 },
  },
});

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar barStyle="light-content" backgroundColor="#060E18" />
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
        <Toast />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
