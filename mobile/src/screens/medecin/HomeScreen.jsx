import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { medecinAPI } from '../../services/api';
import { COLORS, SPACING, RADIUS } from '../../theme';

export default function MedecinHomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [rdvs, setRdvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const today = new Date().toLocaleDateString('fr-FR');

  useEffect(() => { fetchAgenda(); }, []);

  const fetchAgenda = async () => {
    try {
      const res = await medecinAPI.getAgenda(today);
      setRdvs(res.data || AGENDA_DEMO);
    } catch { setRdvs(AGENDA_DEMO); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const stats = [
    { label: "Aujourd'hui", value: rdvs.filter(r => r.statut !== 'annule').length, icon: '📅', color: COLORS.primary },
    { label: 'En attente', value: rdvs.filter(r => r.statut === 'en_attente').length, icon: '⏳', color: '#F59E0B' },
    { label: 'Confirmés', value: rdvs.filter(r => r.statut === 'confirme').length, icon: '✓', color: '#3B82F6' },
  ];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAgenda(); }} tintColor={COLORS.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Bonjour Dr. 👋</Text>
          <Text style={styles.userName}>{user?.prenom} {user?.nom}</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Déconnexion</Text>
        </TouchableOpacity>
      </View>

      {/* Date */}
      <View style={styles.dateBar}>
        <Text style={styles.dateText}>📅 {today}</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {stats.map((s, i) => (
          <View key={i} style={[styles.statCard, { borderColor: s.color + '40' }]}>
            <Text style={styles.statIcon}>{s.icon}</Text>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Agenda')}>
          <Text style={styles.actionIcon}>🗓️</Text>
          <Text style={styles.actionLabel}>Mon Agenda</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Patients')}>
          <Text style={styles.actionIcon}>👥</Text>
          <Text style={styles.actionLabel}>Mes Patients</Text>
        </TouchableOpacity>
      </View>

      {/* RDV du jour */}
      <Text style={styles.sectionTitle}>RDV du jour</Text>
      {loading ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} /> :
        rdvs.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🎉</Text>
            <Text style={styles.emptyText}>Aucun RDV aujourd'hui</Text>
          </View>
        ) : rdvs.map((rdv, i) => (
          <TouchableOpacity key={i} style={styles.rdvCard} onPress={() => navigation.navigate('DossierPatient', { patient: rdv.patient })}>
            <View style={styles.rdvTime}>
              <Text style={styles.rdvHeure}>{rdv.heure}</Text>
            </View>
            <View style={styles.rdvInfo}>
              <Text style={styles.rdvPatient}>{rdv.patient?.prenom} {rdv.patient?.nom}</Text>
              <Text style={styles.rdvMotif}>{rdv.motif || 'Consultation générale'}</Text>
            </View>
            <View style={styles.rdvActions}>
              {rdv.statut === 'en_attente' && (
                <TouchableOpacity style={styles.confirmBtn} onPress={async () => {
                  await medecinAPI.confirmerRDV(rdv.id);
                  fetchAgenda();
                }}>
                  <Text style={styles.confirmBtnText}>✓</Text>
                </TouchableOpacity>
              )}
              <View style={[styles.statusDot, { backgroundColor: rdv.statut === 'confirme' ? COLORS.primary : '#F59E0B' }]} />
            </View>
          </TouchableOpacity>
        ))
      }

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const AGENDA_DEMO = [
  { id: 1, heure: '08:30', patient: { id: 1, prenom: 'Aya', nom: 'Konan' }, motif: 'Suivi hypertension', statut: 'confirme' },
  { id: 2, heure: '09:00', patient: { id: 2, prenom: 'Moussa', nom: 'Diallo' }, motif: 'Consultation générale', statut: 'en_attente' },
  { id: 3, heure: '10:30', patient: { id: 3, prenom: 'Fatou', nom: 'Bamba' }, motif: 'Renouvellement ordonnance', statut: 'confirme' },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.lg, paddingTop: 55 },
  greeting: { color: COLORS.textSecondary, fontSize: 14 },
  userName: { color: COLORS.text, fontSize: 20, fontWeight: 'bold' },
  logoutBtn: { padding: SPACING.sm },
  logoutText: { color: COLORS.error, fontSize: 13 },
  dateBar: { marginHorizontal: SPACING.lg, backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.sm, marginBottom: SPACING.md, alignItems: 'center', borderWidth: 1, borderColor: COLORS.cardBorder },
  dateText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 15 },
  statsRow: { flexDirection: 'row', gap: SPACING.sm, marginHorizontal: SPACING.lg, marginBottom: SPACING.md },
  statCard: { flex: 1, backgroundColor: COLORS.card, borderWidth: 1, borderRadius: RADIUS.md, padding: SPACING.sm, alignItems: 'center' },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: 'bold' },
  statLabel: { color: COLORS.textSecondary, fontSize: 11, textAlign: 'center' },
  actionsRow: { flexDirection: 'row', gap: SPACING.sm, marginHorizontal: SPACING.lg, marginBottom: SPACING.lg },
  actionBtn: { flex: 1, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center' },
  actionIcon: { fontSize: 28, marginBottom: 6 },
  actionLabel: { color: COLORS.text, fontSize: 13, fontWeight: '500' },
  sectionTitle: { color: COLORS.text, fontSize: 16, fontWeight: 'bold', marginHorizontal: SPACING.lg, marginBottom: SPACING.sm },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyIcon: { fontSize: 40, marginBottom: SPACING.sm },
  emptyText: { color: COLORS.textSecondary, fontSize: 15 },
  rdvCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.md, padding: SPACING.md },
  rdvTime: { marginRight: SPACING.md, alignItems: 'center' },
  rdvHeure: { color: COLORS.primary, fontWeight: 'bold', fontSize: 16 },
  rdvInfo: { flex: 1 },
  rdvPatient: { color: COLORS.text, fontWeight: 'bold', fontSize: 15 },
  rdvMotif: { color: COLORS.textSecondary, fontSize: 13 },
  rdvActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  confirmBtn: { backgroundColor: COLORS.primary, borderRadius: 15, width: 30, height: 30, justifyContent: 'center', alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontWeight: 'bold' },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
});
