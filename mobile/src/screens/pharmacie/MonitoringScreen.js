import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Alert, StyleSheet, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PharmacieAPI } from '../../config/api';
import { useAuthStore } from '../../store/authStore';
import { C, Badge, ScreenHeader, Empty, Loader, fmtDate, fmtMontant } from '../../components/UI';

// Statuts avec couleurs
const STATUTS = {
  en_attente: { label: 'En attente',  color: 'amber',  icon: '⏳', action: 'Valider devis' },
  confirmee:  { label: 'Devis validé',color: 'green',  icon: '✅', action: 'Débiter patient' },
  en_cours:   { label: 'En livraison',color: 'purple', icon: '🛵', action: null },
  livre:      { label: 'Livrée',      color: 'teal',   icon: '📦', action: null },
  annulee:    { label: 'Annulée',     color: 'red',    icon: '❌', action: null },
};

export default function PharmacieMonitoring() {
  const { user, logout } = useAuthStore();
  const qc = useQueryClient();
  const [filtre, setFiltre] = useState('en_attente');
  const [processing, setProcessing] = useState(null);

  const { data: commandes, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['pharma-cmds', filtre],
    queryFn:  () => PharmacieAPI.commandes(filtre === 'all' ? null : filtre).then(r => r.data || []),
    refetchInterval: 20000,
  });

  const { data: stats } = useQuery({
    queryKey: ['pharma-stats'],
    queryFn:  PharmacieAPI.stats,
    refetchInterval: 30000,
  });

  const validerDevis = async (cmd) => {
    Alert.alert(
      '✅ Valider le devis',
      `Confirmer la commande de ${cmd.patient_nom || 'ce patient'} ?\n\nMontant : ${fmtMontant(cmd.frais_livraison || 1500)}`,
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Valider', onPress: async () => {
            setProcessing(cmd.id);
            try {
              const res = await PharmacieAPI.validerCommande(cmd.id);
              if (res.success) {
                qc.invalidateQueries(['pharma-cmds']);
                qc.invalidateQueries(['pharma-stats']);
                Alert.alert('✅ Devis validé', 'La commande est prête pour la livraison.');
              } else Alert.alert('Erreur', res.message);
            } catch(e) { Alert.alert('Erreur', e.message); }
            setProcessing(null);
          }
        }
      ]
    );
  };

  const debiterPatient = async (cmd) => {
    Alert.alert(
      '💳 Débiter le patient',
      `Facturer ${cmd.patient_nom || 'ce patient'} pour ${fmtMontant(cmd.frais_livraison || 1500)} ?\n\nCette action attribuera la commande à un livreur.`,
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Confirmer le débit', onPress: async () => {
            setProcessing(cmd.id);
            try {
              const res = await PharmacieAPI.debiterPatient(cmd.id);
              if (res.success) {
                qc.invalidateQueries(['pharma-cmds']);
                qc.invalidateQueries(['pharma-stats']);
                Alert.alert('✅ Patient débité', 'La commande est en cours de livraison.');
              } else Alert.alert('Erreur', res.message);
            } catch(e) { Alert.alert('Erreur', e.message); }
            setProcessing(null);
          }
        }
      ]
    );
  };

  const annulerCommande = (cmd) => {
    Alert.alert(
      '❌ Annuler la commande',
      'Êtes-vous sûr(e) de vouloir annuler cette commande ?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Annuler', style: 'destructive', onPress: async () => {
            try {
              await PharmacieAPI.annuler(cmd.id, 'Annulée par la pharmacie');
              qc.invalidateQueries(['pharma-cmds']);
              qc.invalidateQueries(['pharma-stats']);
            } catch(e) { Alert.alert('Erreur', e.message); }
          }
        }
      ]
    );
  };

  const FILTRES = [
    { k: 'en_attente', l: 'En attente', n: stats?.en_attente },
    { k: 'confirmee',  l: 'Validées',   n: stats?.confirmees },
    { k: 'en_cours',   l: 'Livraison',  n: stats?.en_cours },
    { k: 'livre',      l: 'Livrées',    n: stats?.livrees },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Header pharmacie */}
      <View style={s.header}>
        <View>
          <Text style={s.headerNom}>{user?.prenom || 'Pharmacie'}</Text>
          <Text style={s.headerRole}>💊 Espace Pharmacie</Text>
        </View>
        <TouchableOpacity onPress={logout} style={s.logoutBtn}>
          <Text style={{ fontSize: 16 }}>⏻</Text>
        </TouchableOpacity>
      </View>

      {/* Alertes */}
      {stats?.en_attente > 0 && (
        <View style={s.alertBanner}>
          <Text style={{ fontSize: 18 }}>🔔</Text>
          <Text style={s.alertText}>
            {stats.en_attente} commande(s) en attente de validation
          </Text>
          <TouchableOpacity onPress={() => setFiltre('en_attente')}>
            <Text style={s.alertAction}>Traiter →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Filtres */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filtresScroll} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {FILTRES.map(f => (
          <TouchableOpacity
            key={f.k}
            style={[s.filtreChip, filtre === f.k && { borderColor: C.green, backgroundColor: 'rgba(10,143,88,.15)' }]}
            onPress={() => setFiltre(f.k)}
          >
            <Text style={[s.filtreText, filtre === f.k && { color: C.greenL }]}>{f.l}</Text>
            {f.n > 0 && (
              <View style={s.filtreCount}><Text style={s.filtreCountText}>{f.n}</Text></View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={C.green} />}
      >
        {isLoading && <Loader text="Chargement des commandes…" />}

        {!isLoading && !commandes?.length && (
          <Empty icon={STATUTS[filtre]?.icon || '📦'} title={`Aucune commande "${STATUTS[filtre]?.label || filtre}"`} subtitle="Toutes les commandes de ce statut apparaîtront ici." />
        )}

        {(commandes || []).map(cmd => {
          const st = STATUTS[cmd.statut] || STATUTS.en_attente;
          return (
            <View key={cmd.id} style={s.cmdCard}>
              {/* Ligne supérieure */}
              <View style={s.cmdTop}>
                <View style={[s.cmdIconBox, { backgroundColor: cmd.statut === 'en_attente' ? 'rgba(217,119,6,.12)' : 'rgba(10,143,88,.12)' }]}>
                  <Text style={{ fontSize: 22 }}>{st.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cmdPatient}>{cmd.patient_nom || cmd.patient_nom_full || 'Patient'}</Text>
                  <Text style={s.cmdDate}>{fmtDate(cmd.created_at)}</Text>
                </View>
                <Badge label={st.label} color={st.color} />
              </View>

              {/* Infos */}
              <View style={s.cmdInfos}>
                <View style={s.cmdInfoItem}>
                  <Text style={s.cmdInfoLbl}>Articles</Text>
                  <Text style={s.cmdInfoVal}>{cmd.nombre_articles || 1}</Text>
                </View>
                <View style={s.cmdInfoItem}>
                  <Text style={s.cmdInfoLbl}>Livraison</Text>
                  <Text style={[s.cmdInfoVal, { color: C.amberL }]}>{fmtMontant(cmd.frais_livraison || 1500)}</Text>
                </View>
                <View style={s.cmdInfoItem}>
                  <Text style={s.cmdInfoLbl}>Contact</Text>
                  <Text style={s.cmdInfoVal}>{cmd.contact || cmd.patient_tel || '—'}</Text>
                </View>
              </View>

              {cmd.adresse_livraison && (
                <Text style={s.cmdAdresse}>📍 {cmd.adresse_livraison}</Text>
              )}

              {/* Actions selon statut */}
              {cmd.statut === 'en_attente' && (
                <View style={s.actions}>
                  <TouchableOpacity
                    style={[s.actionBtn, s.btnDanger]}
                    onPress={() => annulerCommande(cmd)}
                  >
                    <Text style={s.btnDangerText}>❌ Refuser</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.actionBtn, s.btnPrimary, processing === cmd.id && { opacity: 0.6 }]}
                    onPress={() => validerDevis(cmd)}
                    disabled={processing === cmd.id}
                  >
                    <Text style={s.btnPrimaryText}>✅ Valider le devis</Text>
                  </TouchableOpacity>
                </View>
              )}

              {cmd.statut === 'confirmee' && (
                <TouchableOpacity
                  style={[s.fullBtn, processing === cmd.id && { opacity: 0.6 }]}
                  onPress={() => debiterPatient(cmd)}
                  disabled={processing === cmd.id}
                >
                  <Text style={s.fullBtnText}>💳 Débiter le patient · Envoyer en livraison</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 12 },
  headerNom:   { fontSize: 18, fontWeight: '800', color: C.text },
  headerRole:  { fontSize: 12, color: C.dim, marginTop: 2 },
  logoutBtn:   { width: 36, height: 36, borderRadius: 18, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  alertBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(217,119,6,.1)', borderRadius: C.r, marginHorizontal: 16, marginBottom: 10, padding: 12, borderWidth: 1, borderColor: 'rgba(217,119,6,.25)' },
  alertText:   { flex: 1, fontSize: 13, color: C.amberL, fontWeight: '500' },
  alertAction: { fontSize: 13, color: C.amberL, fontWeight: '700' },
  filtresScroll:{ marginBottom: 8 },
  filtreChip:  { borderRadius: 20, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.card },
  filtreText:  { fontSize: 12, color: C.muted, fontWeight: '500' },
  filtreCount: { backgroundColor: C.red, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  filtreCountText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  cmdCard:     { backgroundColor: C.card, borderRadius: C.rL, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  cmdTop:      { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  cmdIconBox:  { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cmdPatient:  { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 2 },
  cmdDate:     { fontSize: 11, color: C.dim },
  cmdInfos:    { flexDirection: 'row', backgroundColor: C.card2, borderRadius: C.r, overflow: 'hidden', marginBottom: 10 },
  cmdInfoItem: { flex: 1, padding: 10, alignItems: 'center' },
  cmdInfoLbl:  { fontSize: 10, color: C.dim, textTransform: 'uppercase', marginBottom: 3 },
  cmdInfoVal:  { fontSize: 13, fontWeight: '700', color: C.text },
  cmdAdresse:  { fontSize: 12, color: C.muted, marginBottom: 12 },
  actions:     { flexDirection: 'row', gap: 10 },
  actionBtn:   { flex: 1, borderRadius: C.r, paddingVertical: 12, alignItems: 'center' },
  btnDanger:   { backgroundColor: 'rgba(225,29,72,.12)', borderWidth: 1, borderColor: 'rgba(225,29,72,.3)' },
  btnDangerText: { fontSize: 13, color: C.red, fontWeight: '700' },
  btnPrimary:  { backgroundColor: C.green },
  btnPrimaryText: { fontSize: 13, color: '#fff', fontWeight: '700' },
  fullBtn:     { backgroundColor: C.teal, borderRadius: C.r, paddingVertical: 13, alignItems: 'center' },
  fullBtnText: { fontSize: 13, color: '#fff', fontWeight: '700' },
});
