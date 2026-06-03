import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, StyleSheet, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PatientAPI } from '../../config/api';
import { C, Badge, ScreenHeader, Empty, Loader, fmtDate, fmtHeure } from '../../components/UI';

export default function RdvScreen({ navigation }) {
  const qc = useQueryClient();
  const { data: rdvs, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['p-rdvs'],
    queryFn:  () => PatientAPI.mesRdvs().then(r => r.data || []),
  });

  const annulerMut = useMutation({
    mutationFn: (id) => PatientAPI.annulerRdv(id),
    onSuccess:  () => { qc.invalidateQueries(['p-rdvs']); Alert.alert('✅', 'Rendez-vous annulé.'); },
    onError:    (e) => Alert.alert('Erreur', e.message),
  });

  const confirmAnnuler = (rdv) => Alert.alert(
    'Annuler le RDV ?',
    `RDV du ${fmtDate(rdv.date_rdv)} à ${fmtHeure(rdv.heure_rdv)}`,
    [
      { text: 'Non', style: 'cancel' },
      { text: 'Annuler le RDV', style: 'destructive', onPress: () => annulerMut.mutate(rdv.id) },
    ]
  );

  const actifs  = rdvs?.filter(r => !['annule','termine'].includes(r.statut)) || [];
  const passes  = rdvs?.filter(r =>  ['annule','termine'].includes(r.statut)) || [];

  const statusColor = { en_attente: 'amber', confirme: 'green', annule: 'red', termine: 'gray' };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScreenHeader
        title="Mes rendez-vous"
        subtitle={`${actifs.length} à venir`}
        rightIcon="＋"
        onRight={() => navigation.navigate('RdvForm')}
      />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={C.green} />}
      >
        {isLoading && <Loader text="Chargement des rendez-vous…" />}

        {!isLoading && !rdvs?.length && (
          <Empty
            icon="📅"
            title="Aucun rendez-vous"
            subtitle="Prenez votre premier rendez-vous en appuyant sur ＋"
          />
        )}

        {actifs.length > 0 && (
          <>
            <Text style={s.sectionLbl}>À venir</Text>
            {actifs.map(rdv => (
              <View key={rdv.id} style={s.rdvCard}>
                <View style={s.rdvTop}>
                  <View style={s.rdvDateBox}>
                    <Text style={s.rdvJour}>{new Date(rdv.date_rdv).toLocaleDateString('fr-CI', { day: 'numeric' })}</Text>
                    <Text style={s.rdvMois}>{new Date(rdv.date_rdv).toLocaleDateString('fr-CI', { month: 'short' })}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.rdvMedecin}>Dr. {rdv.medecin_nom || 'Médecin'}</Text>
                    <Text style={s.rdvMotif} numberOfLines={1}>{rdv.motif || 'Consultation générale'}</Text>
                    <Text style={s.rdvHeure}>🕐 {fmtHeure(rdv.heure_rdv)}</Text>
                  </View>
                  <Badge label={rdv.statut === 'en_attente' ? 'En attente' : 'Confirmé'} color={statusColor[rdv.statut] || 'gray'} />
                </View>
                {rdv.statut !== 'annule' && (
                  <TouchableOpacity
                    style={s.annulerBtn}
                    onPress={() => confirmAnnuler(rdv)}
                    disabled={annulerMut.isPending}
                  >
                    <Text style={s.annulerText}>Annuler ce RDV</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </>
        )}

        {passes.length > 0 && (
          <>
            <Text style={[s.sectionLbl, { marginTop: 16 }]}>Historique</Text>
            {passes.slice(0, 5).map(rdv => (
              <View key={rdv.id} style={[s.rdvCard, { opacity: 0.6 }]}>
                <View style={s.rdvTop}>
                  <View style={s.rdvDateBox}>
                    <Text style={s.rdvJour}>{new Date(rdv.date_rdv).toLocaleDateString('fr-CI', { day: 'numeric' })}</Text>
                    <Text style={s.rdvMois}>{new Date(rdv.date_rdv).toLocaleDateString('fr-CI', { month: 'short' })}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.rdvMedecin}>{rdv.medecin_nom || 'Médecin'}</Text>
                    <Text style={s.rdvMotif}>{rdv.motif || 'Consultation'}</Text>
                  </View>
                  <Badge label={rdv.statut === 'annule' ? 'Annulé' : 'Terminé'} color={rdv.statut === 'annule' ? 'red' : 'gray'} />
                </View>
              </View>
            ))}
          </>
        )}

        {/* FAB */}
        <TouchableOpacity
          style={s.fab}
          onPress={() => navigation.navigate('RdvForm')}
          activeOpacity={0.85}
        >
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>＋ Prendre un RDV</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  sectionLbl: { fontSize: 12, fontWeight: '700', color: C.dim, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  rdvCard:    { backgroundColor: C.card, borderRadius: C.rL, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  rdvTop:     { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  rdvDateBox: { width: 48, height: 52, borderRadius: 12, backgroundColor: 'rgba(10,143,88,.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(10,143,88,.2)' },
  rdvJour:    { fontSize: 18, fontWeight: '800', color: C.greenL, lineHeight: 20 },
  rdvMois:    { fontSize: 10, color: C.green, fontWeight: '700', textTransform: 'uppercase' },
  rdvMedecin: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 3 },
  rdvMotif:   { fontSize: 12, color: C.muted, marginBottom: 4 },
  rdvHeure:   { fontSize: 12, color: C.green, fontWeight: '600' },
  annulerBtn: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border, alignItems: 'center' },
  annulerText:{ fontSize: 13, color: C.red, fontWeight: '600' },
  fab:        { backgroundColor: C.green, borderRadius: C.rL, padding: 16, alignItems: 'center', marginTop: 16, shadowColor: C.green, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12 },
});
