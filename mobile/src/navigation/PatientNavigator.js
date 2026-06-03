import React from 'react';
import { Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { C } from '../components/UI';

// Screens
import PatientAccueil     from '../screens/patient/AccueilScreen';
import PatientRdv         from '../screens/patient/RdvScreen';
import PatientDossier     from '../screens/patient/DossierScreen';
import PatientPharmacie   from '../screens/patient/PharmacieScreen';
import PatientPlusScreen  from '../screens/patient/PlusScreen';
import RdvFormScreen      from '../screens/patient/RdvFormScreen';
import ClinicDetailScreen from '../screens/patient/ClinicDetailScreen';
import CommandeFormScreen from '../screens/patient/CommandeFormScreen';

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

// Stacks avec sous-écrans
function AccueilStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AccueilMain"    component={PatientAccueil} />
      <Stack.Screen name="ClinicDetail"   component={ClinicDetailScreen} />
    </Stack.Navigator>
  );
}

function RdvStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="RdvList"   component={PatientRdv} />
      <Stack.Screen name="RdvForm"   component={RdvFormScreen} />
    </Stack.Navigator>
  );
}

function PharmacieStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PharmacieMain"  component={PatientPharmacie} />
      <Stack.Screen name="CommandeForm"   component={CommandeFormScreen} />
    </Stack.Navigator>
  );
}

const TABS = [
  { name: 'Accueil',    icon: '🏠', component: AccueilStack },
  { name: 'Mes RDV',    icon: '📅', component: RdvStack },
  { name: 'Dossier',    icon: '📋', component: PatientDossier },
  { name: 'Pharmacie',  icon: '💊', component: PharmacieStack },
  { name: 'Plus',       icon: '⋯',  component: PatientPlusScreen },
];

export default function PatientNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const tab = TABS.find(t => t.name === route.name);
        return {
          headerShown: false,
          tabBarStyle: {
            backgroundColor: C.card,
            borderTopColor: C.border,
            height: 68,
            paddingBottom: 8,
            paddingTop: 6,
          },
          tabBarLabel: ({ focused }) => (
            <Text style={{
              fontSize: 10,
              color: focused ? C.green : C.dim,
              fontWeight: focused ? '700' : '400',
              marginTop: 2,
            }}>
              {route.name}
            </Text>
          ),
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.45 }}>
              {tab?.icon}
            </Text>
          ),
        };
      }}
    >
      {TABS.map(t => (
        <Tab.Screen key={t.name} name={t.name} component={t.component} />
      ))}
    </Tab.Navigator>
  );
}
