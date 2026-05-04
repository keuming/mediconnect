import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../theme';

// Auth screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Patient screens
import PatientHomeScreen from '../screens/patient/HomeScreen';
import PrendreRDVScreen from '../screens/patient/PrendreRDVScreen';
import MesRDVScreen from '../screens/patient/MesRDVScreen';
import DossierMedicalScreen from '../screens/patient/DossierMedicalScreen';
import ConfirmationScreen from '../screens/patient/ConfirmationScreen';

// Médecin screens
import MedecinHomeScreen from '../screens/medecin/HomeScreen';
import PatientsScreen from '../screens/medecin/PatientsScreen';
import DossierPatientScreen from '../screens/medecin/DossierPatientScreen';

// Livreur screens
import LivreurHomeScreen from '../screens/livreur/HomeScreen';
import MesLivraisonsScreen from '../screens/livreur/MesLivraisonsScreen';
import DetailLivraisonScreen from '../screens/livreur/DetailLivraisonScreen';

const Stack = createStackNavigator();

const screenOptions = {
  headerShown: false,
  cardStyle: { backgroundColor: COLORS.background },
};

function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function PatientNavigator() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Home" component={PatientHomeScreen} />
      <Stack.Screen name="PrendreRDV" component={PrendreRDVScreen} />
      <Stack.Screen name="MesRDV" component={MesRDVScreen} />
      <Stack.Screen name="DossierMedical" component={DossierMedicalScreen} />
      <Stack.Screen name="Confirmation" component={ConfirmationScreen} />
    </Stack.Navigator>
  );
}

function MedecinNavigator() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Home" component={MedecinHomeScreen} />
      <Stack.Screen name="Patients" component={PatientsScreen} />
      <Stack.Screen name="DossierPatient" component={DossierPatientScreen} />
    </Stack.Navigator>
  );
}

function LivreurNavigator() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Home" component={LivreurHomeScreen} />
      <Stack.Screen name="MesLivraisons" component={MesLivraisonsScreen} />
      <Stack.Screen name="DetailLivraison" component={DetailLivraisonScreen} />
    </Stack.Navigator>
  );
}


export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!user ? (
        <AuthNavigator />
      ) : user.role === 'medecin' ? (
        <MedecinNavigator />
      ) : user.role === 'livreur' ? (
        <LivreurNavigator />
      ) : (
        <PatientNavigator />
      )}
    </NavigationContainer>
  );
}
