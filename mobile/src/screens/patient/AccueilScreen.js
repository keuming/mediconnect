import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { PatientAPI } from '../../config/api';
import { C, Card, Badge, SectionTitle, fmtDate, fmtHeure, STATUT_CMD } from '../../components/UI';

export default function PatientAccueil({ navigation }) {
  const { user, logout } = useAuthStore();

  const { data: rdvs,    refetch: refRdv,  isFetching: ldRdv  } = useQuery({ queryKey: ['p-rdvs'],    queryFn: () => PatientAPI.mesRdvs().then(r => r.data || []) });
  const { data: cmds,    refetch: refCmd                        } = useQuery({ queryKey: ['p-cmds'],    queryFn: () => PatientAPI.mesCommandes().then(r => r.data || []) });
  const { data: cliniques                                        } = useQuery({ queryKey: ['cliniques'], queryFn: () => PatientAPI.cliniques().then(r => r.data || []) });

  const refresh = () => { refRdv(); refCmd(); };
  const prochainRdv  = rdvs?.find(r => !['annule','termine'].includes(r.statut));
  const cmdEnCours   = cmds?.filter(c => ['en_cours','confirmee'].includes(c.statut)) || [];

  // Modules rapides
  const MODULES = [
    { icon: '📅', label: 'Prendre RDV',    color: C.green,  action: () => navigation.navigate('Mes RDV', { screen: 'RdvForm' }) },
    { icon: '🏥', label: 'Cliniques',       color: C.blue,   action: () => navigation.navigate('Plus') },
    { icon: '💊', label: 'Médicaments',     color: C.teal,   action: () => navigation.navigate('Pharmacie') },
    { icon: '📋', label: 'Mon dossier',     color: C.purple, action: () => navigation.navigate('Dossier') },
    { icon: '🛡️', label: 'Assurances',      color: C.amber,  action: () => navigation.navigate('Plus') },
    { icon: '🏪', label: 'Pharmacies garde',color: C.red,    action: () => navigation.navigate('Pharmacie') },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={ldRdv} onRefresh={refresh} tintColor={C.green} />}
        showsVerticalScrollIndicator={false}
      >
        {/* En-tête */}
        <View style={s.topBar}>
          <View>
            <Text style={s.greeting}>Bonjour 👋</Text>
            <Text style={s.userName}>{user?.prenom || 'Patient'} {user?.nom || ''}</Text>
          </View>
          <TouchableOpacity onPress={logout} style={s.logoutBtn}>
            <Text style={{ fontSize: 18 }}>⏻</Text>
          </TouchableOpacity>
        </View>

        {/* Alerte prochain RDV */}
        {prochainRdv && (
          <TouchableOpacity
            style={s.rdvAlert}
            onPress={() => navigation.navigate('Mes RDV')}
            activeOpacity={0.85}
          >
            <View style={s.rdvAlertLeft}>
              <Text style={s.rdvAlertIcon}>📅</Text>
              <View>
                <Text style={s.rdvAlertTitle}>Prochain rendez-vous</Text>
                <Text style={s.rdvAlertDate}>
                  {fmtDate(prochainRdv.date_rdv)} à {fmtHeure(prochainRdv.heure_rdv)}
                </Text>
                {prochainRdv.medecin_nom && (
                  <Text style={s.rdvAlertMedecin}>Dr. {prochainRdv.medecin_nom}</Text>
                )}
              </View>
            </View>
            <Text style={{ color: C.greenL, fontSize: 18 }}>→</Text>
          </TouchableOpacity>
        )}

        {/* Alerte livraison en cours */}
        {cmdEnCours.length > 0 && (
          <TouchableOpacity
            style={[s.rdvAlert, { borderColor: 'rgba(217,119,6,.3)', backgroundColor: 'rgba(217,119,6,.08)' }]}
            onPress={() => navigation.navigate('Pharmacie')}
            activeOpacity={0.85}
          >
            <View style={s.rdvAlertLeft}>
              <Text style={s.rdvAlertIcon}>🛵</Text>
              <View>
                <Text style={[s.rdvAlertTitle, { color: C.amberL }]}>Livraison en cours</Text>
                <Text style={s.rdvAlertDate}>{cmdEnCours.length} commande(s) en route</Text>
              </View>
            </View>
            <Text style={{ color: C.amberL, fontSize: 18 }}>→</Text>
          </TouchableOpacity>
        )}

        {/* Grille modules */}
        <SectionTitle title="Services" icon="✨" style={{ marginTop: 8 }} />
        <View style={s.grid}>
          {MODULES.map(m => (
            <TouchableOpacity
              key={m.label}
              style={[s.moduleCard, { borderColor: m.color + '30', backgroundColor: m.color + '10' }]}
              onPress={m.action}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 28, marginBottom: 8 }}>{m.icon}</Text>
              <Text style={[s.moduleLabel, { color: m.color }]}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Cliniques partenaires */}
        <SectionTitle title="Cliniques partenaires" icon="🏥" action="Voir tout" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, paddingHorizontal: 20 }}>
          {(cliniques || []).slice(0, 8).map(cl => (
            <TouchableOpacity
              key={cl.id}
              style={s.cliniqueCard}
              onPress={() => navigation.navigate('ClinicDetail', { clinique: cl })}
              activeOpacity={0.8}
            >
              <View style={s.cliniqueIcon}>
                <Text style={{ fontSize: 24 }}>🏥</Text>
              </View>
              <Text style={s.cliniqueName} numberOfLines={2}>{cl.nom}</Text>
              <Text style={s.cliniqueVille} numberOfLines={1}>{cl.ville || '—'}</Text>
              <View style={s.cliniqueTag}>
                <Text style={s.cliniqueTagText}>{cl.type || 'Clinique'}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* RDV récents */}
        {rdvs?.length > 0 && (
          <>
            <SectionTitle title="Mes rendez-vous" icon="📅" action="Voir tout" onAction={() => navigation.navigate('Mes RDV')} style={{ marginTop: 8 }} />
            {rdvs.slice(0, 3).map(rdv => (
              <View key={rdv.id} style={s.rdvCard}>
                <View style={s.rdvCardLeft}>
                  <Text style={s.rdvCardDate}>{fmtDate(rdv.date_rdv)}</Text>
                  <Text style={s.rdvCardHeure}>{fmtHeure(rdv.heure_rdv)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.rdvCardMed}>{rdv.medecin_nom || 'Médecin'}</Text>
                  <Text style={s.rdvCardMotif} numberOfLines={1}>{rdv.motif || 'Consultation'}</Text>
                </View>
                <Badge
                  label={rdv.statut === 'en_attente' ? 'En attente' : rdv.statut === 'termine' ? 'Terminé' : 'Confirmé'}
                  color={rdv.statut === 'en_attente' ? 'amber' : rdv.statut === 'termine' ? 'gray' : 'green'}
                />
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  scroll:          { padding: 20, paddingBottom: 40 },
  topBar:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting:        { fontSize: 13, color: C.dim, marginBottom: 2 },
  userName:        { fontSize: 20, fontWeight: '800', color: C.text },
  logoutBtn:       { width: 40, height: 40, borderRadius: 20, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  rdvAlert:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(10,143,88,.1)', borderRadius: C.r, padding: 14, borderWidth: 1, borderColor: 'rgba(10,143,88,.25)', marginBottom: 14 },
  rdvAlertLeft:    { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  rdvAlertIcon:    { fontSize: 26 },
  rdvAlertTitle:   { fontSize: 13, fontWeight: '700', color: C.greenL, marginBottom: 2 },
  rdvAlertDate:    { fontSize: 14, fontWeight: '800', color: C.text },
  rdvAlertMedecin: { fontSize: 12, color: C.muted, marginTop: 2 },
  grid:            { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  moduleCard:      { width: '30.5%', aspectRatio: 1, borderRadius: C.r, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  moduleLabel:     { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  cliniqueCard:    { width: 130, backgroundColor: C.card, borderRadius: C.r, padding: 14, marginRight: 10, borderWidth: 1, borderColor: C.border },
  cliniqueIcon:    { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(29,78,216,.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  cliniqueName:    { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 3, lineHeight: 17 },
  cliniqueVille:   { fontSize: 11, color: C.dim, marginBottom: 8 },
  cliniqueTag:     { backgroundColor: 'rgba(29,78,216,.15)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  cliniqueTagText: { fontSize: 10, color: '#93C5FD', fontWeight: '600' },
  rdvCard:         { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: C.r, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  rdvCardLeft:     { width: 60, alignItems: 'center' },
  rdvCardDate:     { fontSize: 11, color: C.dim, textAlign: 'center', marginBottom: 2 },
  rdvCardHeure:    { fontSize: 14, fontWeight: '800', color: C.green },
  rdvCardMed:      { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 2 },
  rdvCardMotif:    { fontSize: 12, color: C.muted },
});
