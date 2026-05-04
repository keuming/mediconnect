import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { patientAPI } from '../../services/api';
import { COLORS, SPACING, RADIUS } from '../../theme';

const TABS = ['À venir', 'Passés', 'Annulés'];

export default function MesRDVScreen({ navigation }) {
  const [tab, setTab] = useState(0);
  const [rdvs, setRdvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchRDVs(); }, []);

  const fetchRDVs = async () => {
    try {
      const res = await patientAPI.getMesRDV();
      setRdvs(res.data || RDV_DEMO);
    } catch { setRdvs(RDV_DEMO); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const handleAnnuler = (rdvId) => {
    Alert.alert('Annuler ce RDV ?', 'Cette action est irréversible.', [
      { text: 'Non', style: 'cancel' },
      { text: 'Oui, annuler', style: 'destructive', onPress: async () => {
        try {
          await patientAPI.annulerRDV(rdvId);
          fetchRDVs();
        } catch { Alert.alert('Erreur', 'Impossible d\'annuler ce RDV'); }
      }},
    ]);
  };

  const filtered = rdvs.filter(r => {
    if (tab === 0) return r.statut === 'confirme' || r.statut === 'en_attente';
    if (tab === 1) return r.statut === 'termine';
    return r.statut === 'annule';
  });

  const statusConfig = {
    confirme: { label: '✓ Confirmé', color: COLORS.primary },
    en_attente: { label: '⏳ En attente', color: '#F59E0B' },
    annule: { label: '✗ Annulé', color: COLORS.error },
    termine: { label: '✓ Terminé', color: COLORS.textSecondary },
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes RDV</Text>
        <TouchableOpacity onPress={() => navigation.navigate('PrendreRDV')} style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ Nouveau</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {TABS.map((t, i) => (
          <TouchableOpacity key={i} style={[styles.tab, tab === i && styles.tabActive]} onPress={() => setTab(i)}>
            <Text style={[styles.tabText, tab === i && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} /> : (
        <ScrollView
          style={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRDVs(); }} tintColor={COLORS.primary} />}
        >
          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📅</Text>
              <Text style={styles.emptyText}>Aucun RDV dans cette catégorie</Text>
            </View>
          ) : filtered.map((rdv, i) => {
            const sc = statusConfig[rdv.statut] || statusConfig.en_attente;
            return (
              <View key={i} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{rdv.medecin?.[0] || 'M'}</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardMedecin}>Dr. {rdv.medecin}</Text>
                    <Text style={styles.cardSpec}>{rdv.specialite}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: sc.color + '20' }]}>
                    <Text style={[styles.statusText, { color: sc.color }]}>{sc.label}</Text>
                  </View>
                </View>
                <View style={styles.cardBottom}>
                  <Text style={styles.cardDate}>📅 {rdv.date} à {rdv.heure}</Text>
                  {rdv.motif && <Text style={styles.cardMotif}>💬 {rdv.motif}</Text>}
                </View>
                {(rdv.statut === 'confirme' || rdv.statut === 'en_attente') && (
                  <TouchableOpacity style={styles.annulerBtn} onPress={() => handleAnnuler(rdv.id)}>
                    <Text style={styles.annulerText}>Annuler ce RDV</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
          <View style={{ height: 20 }} />
        </ScrollView>
      )}
    </View>
  );
}

const RDV_DEMO = [
  { id: 1, medecin: 'Konan Aya', specialite: 'Médecine générale', date: '05/05/2026', heure: '09:00', statut: 'confirme', motif: 'Consultation générale' },
  { id: 2, medecin: 'Diallo Moussa', specialite: 'Cardiologie', date: '12/05/2026', heure: '14:30', statut: 'en_attente', motif: 'Bilan cardiaque' },
  { id: 3, medecin: 'Bamba Fatou', specialite: 'Pédiatrie', date: '01/04/2026', heure: '10:00', statut: 'termine', motif: '' },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg, paddingTop: 55 },
  backText: { color: COLORS.primary, fontSize: 24 },
  headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  addBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm, paddingVertical: 4 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  tabRow: { flexDirection: 'row', marginHorizontal: SPACING.lg, marginBottom: SPACING.md, backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: 4 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: RADIUS.sm },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { color: COLORS.textSecondary, fontSize: 13 },
  tabTextActive: { color: '#fff', fontWeight: 'bold' },
  list: { flex: 1, paddingHorizontal: SPACING.lg },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: SPACING.md },
  emptyText: { color: COLORS.textSecondary, fontSize: 15 },
  card: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.sm },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  cardInfo: { flex: 1 },
  cardMedecin: { color: COLORS.text, fontWeight: 'bold', fontSize: 15 },
  cardSpec: { color: COLORS.textSecondary, fontSize: 13 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  statusText: { fontSize: 11, fontWeight: '600' },
  cardBottom: { borderTopWidth: 1, borderTopColor: COLORS.cardBorder, paddingTop: SPACING.sm },
  cardDate: { color: COLORS.text, fontSize: 14, marginBottom: 4 },
  cardMotif: { color: COLORS.textSecondary, fontSize: 13 },
  annulerBtn: { marginTop: SPACING.sm, borderWidth: 1, borderColor: COLORS.error, borderRadius: RADIUS.sm, padding: SPACING.sm, alignItems: 'center' },
  annulerText: { color: COLORS.error, fontSize: 13, fontWeight: '500' },
});
