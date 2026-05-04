import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { patientAPI } from '../../services/api';
import { COLORS, SPACING, RADIUS } from '../../theme';

export default function PatientHomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [rdvs, setRdvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchRDVs(); }, []);

  const fetchRDVs = async () => {
    try {
      const res = await patientAPI.getMesRDV();
      setRdvs(res.data?.slice(0, 3) || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const actions = [
    { icon: '📅', label: 'Prendre\nRDV', screen: 'PrendreRDV', color: COLORS.primary },
    { icon: '📋', label: 'Mes\nRDV', screen: 'MesRDV', color: '#3B82F6' },
    { icon: '🗂️', label: 'Dossier\nMédical', screen: 'DossierMedical', color: '#8B5CF6' },
  ];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRDVs(); }} tintColor={COLORS.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Bonjour 👋</Text>
          <Text style={styles.userName}>{user?.prenom} {user?.nom}</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Déconnexion</Text>
        </TouchableOpacity>
      </View>

      {/* Banner */}
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>La santé numérique</Text>
        <Text style={styles.bannerSub}>pour l'Afrique 🌍</Text>
        <Text style={styles.bannerDesc}>Disponible 24h/24 — 7j/7</Text>
      </View>

      {/* Actions rapides */}
      <Text style={styles.sectionTitle}>Actions rapides</Text>
      <View style={styles.actionsRow}>
        {actions.map(a => (
          <TouchableOpacity
            key={a.screen}
            style={[styles.actionCard, { borderColor: a.color + '50' }]}
            onPress={() => navigation.navigate(a.screen)}
          >
            <Text style={styles.actionIcon}>{a.icon}</Text>
            <Text style={styles.actionLabel}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Prochains RDV */}
      <Text style={styles.sectionTitle}>Prochains RDV</Text>
      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
      ) : rdvs.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>📅</Text>
          <Text style={styles.emptyText}>Aucun RDV à venir</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('PrendreRDV')}>
            <Text style={styles.emptyBtnText}>Prendre un RDV</Text>
          </TouchableOpacity>
        </View>
      ) : (
        rdvs.map((rdv, i) => (
          <View key={i} style={styles.rdvCard}>
            <View style={styles.rdvLeft}>
              <Text style={styles.rdvDate}>{rdv.date}</Text>
              <Text style={styles.rdvHeure}>{rdv.heure}</Text>
            </View>
            <View style={styles.rdvRight}>
              <Text style={styles.rdvMedecin}>Dr. {rdv.medecin}</Text>
              <Text style={styles.rdvSpec}>{rdv.specialite}</Text>
              <View style={[styles.rdvStatus, { backgroundColor: rdv.statut === 'confirme' ? COLORS.primary + '30' : '#F59E0B30' }]}>
                <Text style={[styles.rdvStatusText, { color: rdv.statut === 'confirme' ? COLORS.primary : '#F59E0B' }]}>
                  {rdv.statut === 'confirme' ? '✓ Confirmé' : '⏳ En attente'}
                </Text>
              </View>
            </View>
          </View>
        ))
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.lg, paddingTop: 55 },
  greeting: { color: COLORS.textSecondary, fontSize: 14 },
  userName: { color: COLORS.text, fontSize: 20, fontWeight: 'bold' },
  logoutBtn: { padding: SPACING.sm },
  logoutText: { color: COLORS.error, fontSize: 13 },
  banner: {
    margin: SPACING.lg, marginTop: 0, backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  bannerTitle: { color: COLORS.text, fontSize: 22, fontWeight: 'bold' },
  bannerSub: { color: COLORS.primary, fontSize: 20, fontWeight: 'bold', fontStyle: 'italic' },
  bannerDesc: { color: COLORS.textSecondary, fontSize: 13, marginTop: 6 },
  sectionTitle: { color: COLORS.text, fontSize: 16, fontWeight: 'bold', marginHorizontal: SPACING.lg, marginBottom: SPACING.sm },
  actionsRow: { flexDirection: 'row', gap: SPACING.sm, marginHorizontal: SPACING.lg, marginBottom: SPACING.lg },
  actionCard: {
    flex: 1, backgroundColor: COLORS.card, borderWidth: 1,
    borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center',
  },
  actionIcon: { fontSize: 28, marginBottom: 6 },
  actionLabel: { color: COLORS.text, fontSize: 11, textAlign: 'center', fontWeight: '500' },
  emptyCard: {
    margin: SPACING.lg, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder,
    borderRadius: RADIUS.lg, padding: SPACING.xl, alignItems: 'center',
  },
  emptyIcon: { fontSize: 40, marginBottom: SPACING.sm },
  emptyText: { color: COLORS.textSecondary, fontSize: 14, marginBottom: SPACING.md },
  emptyBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm },
  emptyBtnText: { color: '#fff', fontWeight: 'bold' },
  rdvCard: {
    flexDirection: 'row', marginHorizontal: SPACING.lg, marginBottom: SPACING.sm,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.md, padding: SPACING.md,
  },
  rdvLeft: { marginRight: SPACING.md, alignItems: 'center', justifyContent: 'center', minWidth: 60 },
  rdvDate: { color: COLORS.primary, fontSize: 13, fontWeight: 'bold', textAlign: 'center' },
  rdvHeure: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },
  rdvRight: { flex: 1 },
  rdvMedecin: { color: COLORS.text, fontSize: 15, fontWeight: 'bold' },
  rdvSpec: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 6 },
  rdvStatus: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 2 },
  rdvStatusText: { fontSize: 12, fontWeight: '600' },
});
