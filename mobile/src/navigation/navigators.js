// ══════════════════════════════════════════════════════════════════
// MEDICONNECT MOBILE v4 — Navigateurs
// Patient · Livreur · Pharmacie · Médecin Conseil · Médecin Résident
// ══════════════════════════════════════════════════════════════════
import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator }     from '@react-navigation/stack';
import { useAuthStore }             from '../store/authStore';
import { C }                        from '../components/UI';

// ── Auth screens ──────────────────────────────────────────────────
import LoginScreen    from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// ── Patient screens ───────────────────────────────────────────────
import PatientAccueil     from '../screens/patient/AccueilScreen';
import PatientRdv         from '../screens/patient/RdvScreen';
import PatientRdvForm     from '../screens/patient/RdvFormScreen';
import PatientPharmacie   from '../screens/patient/PharmacieScreen';
import PatientCmdForm     from '../screens/patient/CommandeFormScreen';
import ClinicDetail       from '../screens/patient/ClinicDetailScreen';
import MediConnectCard    from '../screens/patient/MediConnectCardScreen';
import FileAttente       from '../screens/patient/FileAttenteScreen';
import { DossierScreen, PlusScreen } from '../screens/patient/DossierPlusScreens';

// ── Livreur screens ───────────────────────────────────────────────
import LivreurCommandes  from '../screens/livreur/CommandesScreen';
import LivreurGains      from '../screens/livreur/GainsScreen';
import LivreurHistorique from '../screens/livreur/HistoriqueScreen';

// ── Pharmacie screens ─────────────────────────────────────────────
import PharmaMonitoring  from '../screens/pharmacie/MonitoringScreen';
import PharmaOrdonnances from '../screens/pharmacie/OrdonnancesScreen';
import PharmaStats       from '../screens/pharmacie/StatsScreen';

// ── Médecin screens ───────────────────────────────────────────────
import {
  AccueilMedecinScreen,
  PlanningScreen,
  MesPatientsScreen,
  ConsultationsScreen,
  NouvelleConsultationScreen,
  OrdonnancesMedecinScreen,
} from '../screens/medecin/MedecinScreens';

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

// ── Helpers ───────────────────────────────────────────────────────
const tabBarOptions = {
  tabBarStyle: { backgroundColor: C.card, borderTopColor: C.border, height: 68, paddingBottom: 8, paddingTop: 6 },
  tabBarLabel: ({ focused, children }) => (
    <Text style={{ fontSize: 10, color: focused ? C.greenL : C.dim, fontWeight: focused ? '700' : '400', marginTop: 2 }}>{children}</Text>
  ),
  tabBarIcon: ({ focused, icon }) => (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.4 }}>{icon}</Text>
  ),
};

const mkTab = (icon) => ({ focused }) => (
  <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.4 }}>{icon}</Text>
);

// ══════════════════════════════════════════════════════════════════
// 1. PATIENT NAVIGATOR
// ══════════════════════════════════════════════════════════════════
function AccueilStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AccueilMain"   component={PatientAccueil} />
      <Stack.Screen name="ClinicDetail"  component={ClinicDetail} />
    </Stack.Navigator>
  );
}
function RdvStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="RdvList" component={PatientRdv} />
      <Stack.Screen name="RdvForm" component={PatientRdvForm} />
    </Stack.Navigator>
  );
}
function PharmacieStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PharmacieMain" component={PatientPharmacie} />
      <Stack.Screen name="CommandeForm"  component={PatientCmdForm} />
    </Stack.Navigator>
  );
}
function PlusStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PlusMain"     component={PlusScreen} />
      <Stack.Screen name="Card"         component={MediConnectCard} />
      <Stack.Screen name="FileAttente"   component={FileAttente} options={{title:'File d\'attente'}} />
      <Stack.Screen name="Dossier"      component={DossierScreen} />
      <Stack.Screen name="Ordonnances"  component={PatientRdv} />
      <Stack.Screen name="Consultations"component={PatientRdv} />
      <Stack.Screen name="Factures"     component={PatientRdv} />
      <Stack.Screen name="MedecinsPrives" component={PatientRdv} />
      <Stack.Screen name="Cliniques"    component={PatientRdv} />
      <Stack.Screen name="Assurances"   component={PatientRdv} />
    </Stack.Navigator>
  );
}

export function PatientNavigator() {
  const TABS = [
    { name:'Accueil',    icon:'🏠', component: AccueilStack },
    { name:'Mes RDV',    icon:'📅', component: RdvStack },
    { name:'Dossier',    icon:'📋', component: DossierScreen },
    { name:'Pharmacie',  icon:'💊', component: PharmacieStack },
    { name:'Plus',       icon:'⋯',  component: PlusStack },
  ];
  return (
    <Tab.Navigator screenOptions={({ route }) => {
      const tab = TABS.find(t => t.name === route.name);
      return {
        headerShown: false,
        tabBarStyle: { backgroundColor: C.card, borderTopColor: C.border, height: 68, paddingBottom: 8, paddingTop: 6 },
        tabBarLabel: ({ focused }) => (
          <Text style={{ fontSize: 10, color: focused ? C.greenL : C.dim, fontWeight: focused ? '700' : '400', marginTop: 2 }}>{route.name}</Text>
        ),
        tabBarIcon: ({ focused }) => (
          <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.4 }}>{tab?.icon}</Text>
        ),
      };
    }}>
      {TABS.map(t => <Tab.Screen key={t.name} name={t.name} component={t.component} />)}
    </Tab.Navigator>
  );
}

// ══════════════════════════════════════════════════════════════════
// 2. LIVREUR NAVIGATOR
// ══════════════════════════════════════════════════════════════════
export function LivreurNavigator() {
  const TABS = [
    { name:'Commandes',  icon:'📦', component: LivreurCommandes },
    { name:'Gains',      icon:'💰', component: LivreurGains },
    { name:'Historique', icon:'📋', component: LivreurHistorique },
  ];
  return (
    <Tab.Navigator screenOptions={({ route }) => {
      const tab = TABS.find(t => t.name === route.name);
      return {
        headerShown: false,
        tabBarStyle: { backgroundColor: C.card, borderTopColor: C.border, height: 68, paddingBottom: 8, paddingTop: 6 },
        tabBarLabel: ({ focused }) => (
          <Text style={{ fontSize: 10, color: focused ? C.greenL : C.dim, fontWeight: focused ? '700' : '400', marginTop: 2 }}>{route.name}</Text>
        ),
        tabBarIcon: ({ focused }) => (
          <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.4 }}>{tab?.icon}</Text>
        ),
      };
    }}>
      {TABS.map(t => <Tab.Screen key={t.name} name={t.name} component={t.component} />)}
    </Tab.Navigator>
  );
}

// ══════════════════════════════════════════════════════════════════
// 3. PHARMACIE NAVIGATOR
// ══════════════════════════════════════════════════════════════════
export function PharmaNavigator() {
  const TABS = [
    { name:'Monitoring',  icon:'📊', component: PharmaMonitoring },
    { name:'Ordonnances', icon:'💊', component: PharmaOrdonnances },
    { name:'Statistiques',icon:'📈', component: PharmaStats },
  ];
  return (
    <Tab.Navigator screenOptions={({ route }) => {
      const tab = TABS.find(t => t.name === route.name);
      return {
        headerShown: false,
        tabBarStyle: { backgroundColor: C.card, borderTopColor: C.border, height: 68, paddingBottom: 8, paddingTop: 6 },
        tabBarLabel: ({ focused }) => (
          <Text style={{ fontSize: 10, color: focused ? C.greenL : C.dim, fontWeight: focused ? '700' : '400', marginTop: 2 }}>{route.name}</Text>
        ),
        tabBarIcon: ({ focused }) => (
          <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.4 }}>{tab?.icon}</Text>
        ),
      };
    }}>
      {TABS.map(t => <Tab.Screen key={t.name} name={t.name} component={t.component} />)}
    </Tab.Navigator>
  );
}

// ══════════════════════════════════════════════════════════════════
// 4. MÉDECIN NAVIGATOR (Conseil + Résident)
// ══════════════════════════════════════════════════════════════════
function MedecinTabNav() {
  const TABS = [
    { name:'Accueil',       icon:'🏠', component: AccueilMedecinScreen },
    { name:'Planning',      icon:'📅', component: PlanningScreen },
    { name:'Patients',      icon:'👥', component: MesPatientsScreen },
    { name:'Ordonnances',   icon:'💊', component: OrdonnancesMedecinScreen },
  ];
  return (
    <Tab.Navigator screenOptions={({ route }) => {
      const tab = TABS.find(t => t.name === route.name);
      return {
        headerShown: false,
        tabBarStyle: { backgroundColor: C.card, borderTopColor: C.border, height: 68, paddingBottom: 8, paddingTop: 6 },
        tabBarLabel: ({ focused }) => (
          <Text style={{ fontSize: 10, color: focused ? C.greenL : C.dim, fontWeight: focused ? '700' : '400', marginTop: 2 }}>{route.name}</Text>
        ),
        tabBarIcon: ({ focused }) => (
          <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.4 }}>{tab?.icon}</Text>
        ),
      };
    }}>
      {TABS.map(t => <Tab.Screen key={t.name} name={t.name} component={t.component} />)}
    </Tab.Navigator>
  );
}

export function MedecinNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MedecinTabs"          component={MedecinTabNav} />
      <Stack.Screen name="Consultations"         component={ConsultationsScreen} />
      <Stack.Screen name="NouvelleConsultation"  component={NouvelleConsultationScreen} />
    </Stack.Navigator>
  );
}

// ══════════════════════════════════════════════════════════════════
// ROOT NAVIGATOR
// ══════════════════════════════════════════════════════════════════
const ROLE_NAV = {
  patient:             'Patient',
  pharmacie:           'Pharmacie',
  livreur:             'Livreur',
  medecin_independant: 'Medecin',
  medecin_conseil:     'Medecin',
  medecin_prive:       'Medecin',
  medecin:             'Medecin',
};

export function RootNavigator() {
  const { user, isAuthenticated } = useAuthStore();
  const authed  = isAuthenticated();

  // Déterminer l'écran initial selon le rôle
  const getInitialRoute = () => {
    if (!authed) return 'Login';
    return ROLE_NAV[user?.role] || 'Patient';
  };

  return (
    <Stack.Navigator
      initialRouteName={getInitialRoute()}
      screenOptions={{ headerShown: false, animationEnabled: true }}
    >
      {/* Auth */}
      <Stack.Screen name="Login"    component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      {/* Profils */}
      <Stack.Screen name="Patient"  component={PatientNavigator} />
      <Stack.Screen name="Livreur"  component={LivreurNavigator} />
      <Stack.Screen name="Pharmacie" component={PharmaNavigator} />
      <Stack.Screen name="Medecin"  component={MedecinNavigator} />
    </Stack.Navigator>
  );
}
