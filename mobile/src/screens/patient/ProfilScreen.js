import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { PatientAPI } from '../../config/api';
import { C, Card, Btn, ScreenHeader } from '../../components/UI';
import { getPaysInfo } from '../../utils/geoAfrique';
import { useNavigation } from '@react-navigation/native';

const fmtMontant = n => Number(n || 0).toLocaleString('fr-CI') + ' FCFA';

export default function ProfilScreen() {
  const { user, logout } = useAuthStore();
  const navigation = useNavigation();
  const [compte, setCompte] = useState(null);
  const [loading, setLoading] = useState(true);
  const paysInfo = getPaysInfo(user?.pays_code || 'CI');

  useEffect(() => { chargerCard(); }, []);

  const chargerCard = async () => {
    setLoading(true);
    try {
      const d = await PatientAPI.monCompteCard();
      if (d.success) setCompte(d.data);
    } catch(e) {}
    setLoading(false);
  };

  const INFOS = [
    { label: 'Email',     value: user?.email },
    { label: 'Téléphone', value: user?.telephone },
    { label: 'Pays',      value: paysInfo?.nom || user?.pays_code },
    { label: 'Ville',     value: user?.ville },
    { label: 'Rôle',      value: user?.role },
  ].filter(i => i.value);

  const MENU = [
    { icon: '💳', label: 'MediConnect Card', sub: compte ? `Solde: ${fmtMontant(compte.solde)}` : 'Lier ma carte', action: () => navigation.navigate('Card'), color: C.green },
    { icon: '📋', label: 'Mon dossier médical', sub: 'Historique, allergies, antécédents', action: () => navigation.navigate('Dossier'), color: C.blue },
    { icon: '💊', label: 'Mes ordonnances', sub: 'Ordonnances actives', action: () => navigation.navigate('Ordonnances'), color: C.teal },
    { icon: '🩺', label: 'Mes consultations', sub: 'Historique des consultations', action: () => navigation.navigate('Consultations'), color: C.purple },
    { icon: '🧾', label: 'Mes factures', sub: 'Historique des paiements', action: () => navigation.navigate('Factures'), color: C.amber },
    { icon: '🌐', label: 'Version web complète', sub: 'mediconnect4africa.cloud', action: () => Linking.openURL('https://mediconnect4africa.cloud'), color: C.muted },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScreenHeader title="Mon Profil" subtitle="Paramètres & informations" />
      <ScrollView contentContainerStyle={{ padding: 16 }}>

        {/* Avatar + infos */}
        <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: C.border, marginBottom: 12, alignItems: 'center' }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: `${C.green}20`, borderWidth: 2, borderColor: C.green, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 30 }}>👤</Text>
          </View>
          <Text style={{ color: C.text, fontSize: 18, fontWeight: '800' }}>{user?.prenom} {user?.nom}</Text>
          <Text style={{ color: C.greenL, fontSize: 12, fontWeight: '700', marginTop: 4 }}>
            {paysInfo?.nom || user?.pays_code} {user?.ville ? `· ${user.ville}` : ''}
          </Text>
        </View>

        {/* Card MediConnect */}
        {!loading && (
          <TouchableOpacity onPress={() => navigation.navigate('Card')}
            style={{ backgroundColor: compte ? '#071A12' : C.card, borderRadius: 16, padding: 18, borderWidth: 1.5, borderColor: compte ? C.green : C.border, marginBottom: 12 }}>
            {compte ? (
              <>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <View>
                    <Text style={{ color: C.greenL, fontSize: 10, fontWeight: '700', letterSpacing: 2 }}>MEDICONNECT CARD</Text>
                    <Text style={{ color: C.dim, fontSize: 9 }}>UEMOA · CEMAC</Text>
                  </View>
                  <Text style={{ fontSize: 24 }}>💳</Text>
                </View>
                <Text style={{ color: C.greenL, fontSize: 15, fontWeight: '900', letterSpacing: 2, fontFamily: 'monospace', marginBottom: 3 }}>{compte.numero_carte || '—'}</Text>
                <Text style={{ color: C.dim, fontSize: 10, marginBottom: 12 }}>{compte.numero_compte}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: C.text, fontSize: 13, fontWeight: '700' }}>{compte.prenom} {compte.nom}</Text>
                  <Text style={{ color: C.greenL, fontSize: 17, fontWeight: '900' }}>{fmtMontant(compte.solde)}</Text>
                </View>
              </>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <Text style={{ fontSize: 32 }}>💳</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, fontWeight: '700', fontSize: 14 }}>Lier ma MediConnect Card</Text>
                  <Text style={{ color: C.dim, fontSize: 12, marginTop: 2 }}>Accédez aux réductions chez tous les prestataires</Text>
                </View>
                <Text style={{ color: C.green, fontSize: 18 }}>→</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Infos profil */}
        <View style={{ backgroundColor: C.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.border, marginBottom: 12 }}>
          <Text style={{ color: C.text, fontWeight: '800', marginBottom: 12 }}>📄 Informations</Text>
          {INFOS.map(({ label, value }) => (
            <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: `${C.border}60` }}>
              <Text style={{ color: C.muted, fontSize: 13 }}>{label}</Text>
              <Text style={{ color: C.text, fontSize: 13, fontWeight: '600', maxWidth: '60%', textAlign: 'right' }}>{value}</Text>
            </View>
          ))}
        </View>

        {/* Menu navigation */}
        <View style={{ backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, marginBottom: 16, overflow: 'hidden' }}>
          {MENU.map((item, i) => (
            <TouchableOpacity key={item.label} onPress={item.action}
              style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: i < MENU.length-1 ? 1 : 0, borderBottomColor: `${C.border}60` }}>
              <Text style={{ fontSize: 22, marginRight: 12 }}>{item.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontWeight: '600', fontSize: 14 }}>{item.label}</Text>
                {item.sub && <Text style={{ color: C.dim, fontSize: 11, marginTop: 1 }}>{item.sub}</Text>}
              </View>
              <Text style={{ color: item.color || C.muted, fontSize: 16 }}>→</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Déconnexion */}
        <TouchableOpacity onPress={() => Alert.alert('Déconnexion', 'Confirmer la déconnexion ?', [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Déconnecter', style: 'destructive', onPress: logout }
        ])}
          style={{ backgroundColor: `${C.red}15`, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: `${C.red}30`, marginBottom: 30 }}>
          <Text style={{ color: C.red, fontWeight: '700', fontSize: 14 }}>🚪 Déconnexion</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
