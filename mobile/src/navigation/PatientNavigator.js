import React from 'react';
import { Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { C } from '../components/UI';

// Screens principaux
import PatientAccueil            from '../screens/patient/AccueilScreen';
import PatientRdv                from '../screens/patient/RdvScreen';
import PatientPharmacie          from '../screens/patient/PharmacieScreen';
import RdvFormScreen             from '../screens/patient/RdvFormScreen';
import ClinicDetailScreen        from '../screens/patient/ClinicDetailScreen';
import CommandeFormScreen        from '../screens/patient/CommandeFormScreen';
import FactureProformaScreen     from '../screens/patient/FactureProformaScreen';
import SuiviCommandeScreen       from '../screens/patient/SuiviCommandeScreen';
import RechercheSpecialiteScreen from '../screens/patient/RechercheSpecialiteScreen';
import ProfilScreen              from '../screens/patient/ProfilScreen';
import MediConnectCardScreen     from '../screens/patient/MediConnectCardScreen';

// Dossier + Plus (versions completes, remplacent les anciens stubs)
import { DossierScreen, PlusScreen } from '../screens/patient/DossierPlusScreens';

// Stubs pour ecrans pas encore construits
import {
  MedecinsPrivesScreen, CliniquesScreen, AssurancesScreen,
  FacturesScreen, AbonnementScreen,
} from '../screens/patient/StubScreens';

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

// Ecrans partages, accessibles depuis plusieurs stacks (menu global de AccueilScreen)
const SHARED_SCREENS = (Nav) => (
  <>
    <Nav.Screen name="Profil"         component={ProfilScreen} />
    <Nav.Screen name="Card"           component={MediConnectCardScreen} />
    <Nav.Screen name="Abonnement"     component={AbonnementScreen} />
    <Nav.Screen name="MedecinsPrives" component={MedecinsPrivesScreen} />
    <Nav.Screen name="Cliniques"      component={CliniquesScreen} />
    <Nav.Screen name="Assurances"     component={AssurancesScreen} />
    <Nav.Screen name="Factures"       component={FacturesScreen} />
  </>
);

// Stacks avec sous-écrans
function AccueilStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AccueilMain"         component={PatientAccueil} />
      <Stack.Screen name="ClinicDetail"        component={ClinicDetailScreen} />
      <Stack.Screen name="RechercheSpecialite" component={RechercheSpecialiteScreen} />
      {SHARED_SCREENS(Stack)}
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
      <Stack.Screen name="PharmacieMain"   component={PatientPharmacie} />
      <Stack.Screen name="CommandeForm"    component={CommandeFormScreen} />
      <Stack.Screen name="FactureProforma" component={FactureProformaScreen} />
      <Stack.Screen name="SuiviCommande"   component={SuiviCommandeScreen} />
    </Stack.Navigator>
  );
}

function DossierStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DossierMain" component={DossierScreen} />
    </Stack.Navigator>
  );
}

function PlusStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PlusMain" component={PlusScreen} />
      {SHARED_SCREENS(Stack)}
    </Stack.Navigator>
  );
}

const TABS = [
  { name: 'Accueil',    icon: '🏠', component: AccueilStack },
  { name: 'Mes RDV',    icon: '📅', component: RdvStack },
  { name: 'Dossier',    icon: '📋', component: DossierStack },
  { name: 'Pharmacie',  icon: '💊', component: PharmacieStack },
  { name: 'Plus',       icon: '⋯',  component: PlusStack },
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
