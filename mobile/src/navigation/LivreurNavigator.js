import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { C } from '../components/UI';
import LivreurCommandes  from '../screens/livreur/CommandesScreen';
import LivreurHistorique from '../screens/livreur/HistoriqueScreen';
import LivreurGains      from '../screens/livreur/GainsScreen';

const Tab = createBottomTabNavigator();
const TABS = [
  { name: 'Commandes',  icon: '📦', component: LivreurCommandes },
  { name: 'Historique', icon: '📜', component: LivreurHistorique },
  { name: 'Mes gains',  icon: '💰', component: LivreurGains },
];

export default function LivreurNavigator() {
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
            <Text style={{ fontSize: 10, color: focused ? C.amberL : C.dim, fontWeight: focused ? '700' : '400', marginTop: 2 }}>
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
