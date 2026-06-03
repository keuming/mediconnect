import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { C } from '../components/UI';
import PharmacieMonitoring from '../screens/pharmacie/MonitoringScreen';
import PharmacieOrdonnances from '../screens/pharmacie/OrdonnancesScreen';
import PharmacieStats       from '../screens/pharmacie/StatsScreen';

const Tab = createBottomTabNavigator();
const TABS = [
  { name: 'Monitoring',   icon: '📊', component: PharmacieMonitoring },
  { name: 'Ordonnances',  icon: '💊', component: PharmacieOrdonnances },
  { name: 'Statistiques', icon: '📈', component: PharmacieStats },
];

export default function PharmaNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const tab = TABS.find(t => t.name === route.name);
        return {
          headerShown: false,
          tabBarStyle: {
            backgroundColor: C.card, borderTopColor: C.border, height: 68, paddingBottom: 8, paddingTop: 6,
          },
          tabBarLabel: ({ focused }) => (
            <Text style={{ fontSize: 10, color: focused ? C.teal : C.dim, fontWeight: focused ? '700' : '400', marginTop: 2 }}>
              {route.name}
            </Text>
          ),
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.45 }}>{tab?.icon}</Text>
          ),
        };
      }}
    >
      {TABS.map(t => <Tab.Screen key={t.name} name={t.name} component={t.component} />)}
    </Tab.Navigator>
  );
}
