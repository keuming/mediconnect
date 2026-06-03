import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuthStore } from '../store/authStore';
import LoginScreen from '../screens/auth/LoginScreen';
import PatientNavigator  from './PatientNavigator';
import LivreurNavigator  from './LivreurNavigator';
import PharmaNavigator   from './PharmaNavigator';

const Stack = createStackNavigator();

const ROLE_NAV = {
  patient:   'Patient',
  pharmacie: 'Pharmacie',
  livreur:   'Livreur',
};

export default function RootNavigator() {
  const { user, isAuthenticated } = useAuthStore();
  const authed  = isAuthenticated();
  const navName = authed ? (ROLE_NAV[user?.role] || 'Login') : 'Login';

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animationEnabled: true }}>
      {!authed ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          <Stack.Screen name="Patient"  component={PatientNavigator} />
          <Stack.Screen name="Livreur"  component={LivreurNavigator} />
          <Stack.Screen name="Pharmacie" component={PharmaNavigator} />
        </>
      )}
    </Stack.Navigator>
  );
}
