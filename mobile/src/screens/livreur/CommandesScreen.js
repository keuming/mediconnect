import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Alert, StyleSheet, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LivreurAPI } from '../../config/api';
import { useAuthStore } from '../../store/authStore';
import { C, Badge, ScreenHeader, Empty, Loader, fmtDate, fmtMontant } from '../../components/UI';

export default function LivreurCommandes() {
  const { user, logout } = useAuthStore();
  const qc = useQueryClient();
  const [processing, setProcessing] = useState(null);

  const { data: commandes, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['livreur-cmds'],
    queryFn:  () => LivreurAPI.commandes().then(r => r.data || []),
    refetchInterval: 30000,
  });

  const disponibles = commandes?.filter(c => c.statut === 'confirmee' && !c.livreur_id) || [];
  const enCours     = commandes?.filter(c => c.statut === 'en_cours')   || [];
  const total_jour  = (commandes?.filter(c => c.statut === 'livre') || []).length * 1000;

  const accepter = async (cmd) => {
    setProcessing(cmd.id);
    try {
      const res = await LivreurAPI.accepter(cmd.id, user?.id);
      if (res.success) {
        qc.invalidateQueries(['livreur-cmds']);
        Alert.alert('✅ Commande acceptée !', 'Rendez-vous à la pharmacie pour récupérer les médicaments.');
      } else {
        Alert.alert('Erreur', res.message);
      }
    } catch (e) { Alert.alert('Erreur', e.message); }
    setProcessing(null);
  };

  const confirmerLivraison = (cmd) => {
    Alert.alert(
      '📦 Confirmer la livraison',
      `Vous avez bien livré la commande à ${cmd.patient_nom || 'le patient'} ?\n\n+1 000 FCFA seront ajoutés à vos gains.`,
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, confirmée ✅',
          onPress: async () => {
            setProcessing(cmd.id);
            try {
              const res = await LivreurAPI.livrer(cmd.id);
              if (res.success) {
                qc.invalidateQueries(['livreur-cmds']);
                Alert.alert('🎉 Livraison confirmée !', '+1 000 FCFA ajoutés à vos gains du jour.');
              } else Alert.alert('Erreur', res.message);
            } catch (e) { Alert.alert('Erreur', e.message); }
            setProcessing(null);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Header avec infos livreur */}
      <View style={s.header}>
        <View>
          <Text style={s.headerName}>{user?.prenom} {user?.nom}</Text>
          <Text style={s.headerRole}>🛵 Livreur MediConnect</Text>
        </View>
        <View style={s.gainsBox}>
          <Text style={s.gainsLabel}>Gains du jour</Text>
          <Text style={s.gainsVal}>{fmtMontant(total_jour)}</Text>
        </View>
        <TouchableOpacity onPress={logout} style={s.logoutBtn}>
          <Text style={{ fontSize: 16 }}>⏻</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        {[
          { l: 'Disponibles', v: disponibles.length, c: C.green },
          { l: 'En cours',    v: enCours.length,     c: C.amber },
          { l: 'Livrées',     v: commandes?.filter(c => c.statut === 'livre').length || 0, c: C.teal },
        ].map(st => (
          <View key={st.l} style={s.statBox}>
            <Text style={[s.statVal, { color: st.c }]}>{st.v}</Text>
            <Text style={s.statLab}>{st.l}</Text>
          </View>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={C.green} />}
      >
        {isLoading && <Loader text="Chargement des commandes…" />}

        {/* En cours en premier */}
        {enCours.length > 0 && (
          <>
            <Text style={s.sectionLbl}>🚀 En cours de livraison</Text>
            {enCours.map(cmd => (
              <View key={cmd.id} style={[s.cmdCard, { borderColor: 'rgba(217,119,6,.3)', backgroundColor: 'rgba(217,119,6,.06)' }]}>
                <View style={s.cmdHeader}>
                  <Text style={s.cmdPatient}>{cmd.patient_nom || cmd.patient_nom_full || 'Patient'}</Text>
                  <Badge label="En livraison" color="amber" />
                </View>
                <View style={s.cmdDetails}>
                  <Text style={s.cmdDetail}>📍 {cmd.adresse_livraison || 'Adresse non précisée'}</Text>
                  <Text style={s.cmdDetail}>📞 {cmd.contact || cmd.patient_tel || '—'}</Text>
                  <Text style={s.cmdDetail}>📦 {cmd.nombre_articles || 1} article(s)</Text>
                </View>
                <View style={s.cmdActions}>
                  <TouchableOpacity
                    style={[s.actionBtn, s.actionBtnOutline]}
                    onPress={() => Alert.alert('Navigation', 'Intégration Google Maps disponible en production.')}
                  >
                    <Text style={s.actionBtnOutlineText}>🗺️ Naviguer</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.actionBtn, s.actionBtnPrimary, processing === cmd.id && { opacity: 0.6 }]}
                    onPress={() => confirmerLivraison(cmd)}
                    disabled={processing === cmd.id}
                  >
                    <Text style={s.actionBtnPrimaryText}>✅ Livré !</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

        {/* Disponibles */}
        {disponibles.length > 0 && (
          <>
            <Text style={[s.sectionLbl, enCours.length > 0 && { marginTop: 16 }]}>
              📦 Nouvelles commandes disponibles
            </Text>
            {disponibles.map(cmd => (
              <View key={cmd.id} style={s.cmdCard}>
                <View style={s.cmdHeader}>
                  <Text style={s.cmdPatient}>{cmd.patient_nom || cmd.patient_nom_full || 'Patient'}</Text>
                  <View style={s.commissionBadge}>
                    <Text style={s.commissionText}>+1 000 FCFA</Text>
                  </View>
                </View>
                <View style={s.cmdDetails}>
                  <Text style={s.cmdDetail}>📍 {cmd.adresse_livraison || 'Adresse non précisée'}</Text>
                  <Text style={s.cmdDetail}>📦 {cmd.nombre_articles || 1} article(s)</Text>
                  <Text style={s.cmdDetail}>🏥 Retrait en pharmacie</Text>
                </View>
                <TouchableOpacity
                  style={[s.acceptBtn, processing === cmd.id && { opacity: 0.6 }]}
                  onPress={() => accepter(cmd)}
                  disabled={processing === cmd.id}
                  activeOpacity={0.8}
                >
                  <Text style={s.acceptBtnText}>🛵 Accepter cette livraison</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        {!isLoading && !disponibles.length && !enCours.length && (
          <Empty
            icon="🛵"
            title="Aucune commande pour l'instant"
            subtitle="Les nouvelles commandes apparaîtront ici automatiquement. Revenez dans quelques minutes."
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:       { flexDirection: 'row', alignItems: 'center', padding: 20, paddingBottom: 14, gap: 12 },
  headerName:   { fontSize: 18, fontWeight: '800', color: C.text },
  headerRole:   { fontSize: 12, color: C.dim, marginTop: 2 },
  gainsBox:     { flex: 1, alignItems: 'flex-end' },
  gainsLabel:   { fontSize: 10, color: C.dim, textTransform: 'uppercase', letterSpacing: 0.5 },
  gainsVal:     { fontSize: 16, fontWeight: '800', color: C.amberL },
  logoutBtn:    { width: 36, height: 36, borderRadius: 18, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  statsRow:     { flexDirection: 'row', gap: 1, backgroundColor: C.border, marginHorizontal: 16, borderRadius: C.r, overflow: 'hidden', marginBottom: 8 },
  statBox:      { flex: 1, backgroundColor: C.card, padding: 12, alignItems: 'center' },
  statVal:      { fontSize: 20, fontWeight: '800', marginBottom: 2 },
  statLab:      { fontSize: 10, color: C.dim, textTransform: 'uppercase', letterSpacing: 0.3 },
  sectionLbl:   { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 12 },
  cmdCard:      { backgroundColor: C.card, borderRadius: C.rL, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  cmdHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cmdPatient:   { fontSize: 15, fontWeight: '700', color: C.text, flex: 1, marginRight: 8 },
  commissionBadge: { backgroundColor: 'rgba(74,222,128,.15)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(74,222,128,.3)' },
  commissionText: { fontSize: 12, fontWeight: '800', color: C.greenL },
  cmdDetails:   { gap: 6, marginBottom: 14 },
  cmdDetail:    { fontSize: 13, color: C.muted, lineHeight: 18 },
  cmdActions:   { flexDirection: 'row', gap: 10 },
  actionBtn:    { flex: 1, borderRadius: C.r, paddingVertical: 11, alignItems: 'center' },
  actionBtnOutline: { backgroundColor: 'rgba(255,255,255,.06)', borderWidth: 1, borderColor: C.border },
  actionBtnOutlineText: { fontSize: 13, color: C.muted, fontWeight: '600' },
  actionBtnPrimary: { backgroundColor: C.green },
  actionBtnPrimaryText: { fontSize: 13, color: '#fff', fontWeight: '700' },
  acceptBtn:    { backgroundColor: C.green, borderRadius: C.r, paddingVertical: 13, alignItems: 'center', shadowColor: C.green, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  acceptBtnText:{ fontSize: 14, fontWeight: '800', color: '#fff' },
});
