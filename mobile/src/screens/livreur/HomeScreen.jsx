import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SPACING, RADIUS } from '../../theme';

export default function LivreurHomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [livraisons, setLivraisons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchLivraisons(); }, []);

  const fetchLivraisons = async () => {
    try {
      // const res = await livreurAPI.getMesLivraisons();
      // setLivraisons(res.data);
      setLivraisons(LIVRAISONS_DEMO);
    } catch { setLivraisons(LIVRAISONS_DEMO); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const stats = [
    { label: "Aujourd'hui", value: livraisons.filter(l => l.statut === 'en_cours' || l.statut === 'assignee').length, icon: '🛵', color: COLORS.primary },
    { label: 'En cours', value: livraisons.filter(l => l.statut === 'en_cours').length, icon: '📍', color: '#F59E0B' },
    { label: 'Livrées', value: livraisons.filter(l => l.statut === 'livree').length, icon: '✓', color: '#3B82F6' },
  ];

  const statutConfig = {
    assignee: { label: 'À récupérer', color: '#F59E0B' },
    en_cours: { label: 'En livraison', color: COLORS.primary },
    livree: { label: 'Livrée', color: '#3B82F6' },
    annulee: { label: 'Annulée', color: COLORS.error },
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchLivraisons(); }} tintColor={COLORS.primary} />}
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

      {/* Statut livreur */}
      <View style={styles.statutRow}>
        <View style={styles.statutOnline}>
          <View style={styles.statutDot} />
          <Text style={styles.statutText}>En ligne</Text>
        </View>
        <Text style={styles.statutSub}>Disponible pour livraisons</Text>
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
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('MesLivraisons')}>
          <Text style={styles.actionIcon}>📦</Text>
          <Text style={styles.actionLabel}>Mes Livraisons</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Carte')}>
          <Text style={styles.actionIcon}>🗺️</Text>
          <Text style={styles.actionLabel}>Carte GPS</Text>
        </TouchableOpacity>
      </View>

      {/* Livraisons du jour */}
      <Text style={styles.sectionTitle}>Livraisons assignées</Text>
      {loading ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} /> :
        livraisons.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🛵</Text>
            <Text style={styles.emptyText}>Aucune livraison assignée</Text>
          </View>
        ) : livraisons.filter(l => l.statut !== 'livree').map((l, i) => {
          const sc = statutConfig[l.statut] || statutConfig.assignee;
          return (
            <TouchableOpacity
              key={i}
              style={styles.livraisonCard}
              onPress={() => navigation.navigate('DetailLivraison', { livraison: l })}
            >
              <View style={styles.livraisonTop}>
                <View style={styles.livraisonId}>
                  <Text style={styles.livraisonIdText}>#{l.id}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: sc.color + '20' }]}>
                  <Text style={[styles.statusText, { color: sc.color }]}>{sc.label}</Text>
                </View>
              </View>
              <View style={styles.livraisonInfo}>
                <Text style={styles.livraisonClient}>👤 {l.client}</Text>
                <Text style={styles.livraisonAdresse}>📍 {l.adresse}</Text>
                <Text style={styles.livraisonMedicaments}>💊 {l.medicaments}</Text>
              </View>
              <View style={styles.livraisonFooter}>
                <Text style={styles.livraisonDist}>📏 {l.distance}</Text>
                <Text style={styles.livraisonArrow}>›</Text>
              </View>
            </TouchableOpacity>
          );
        })
      }
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const LIVRAISONS_DEMO = [
  { id: 1001, client: 'Aya Konan', adresse: 'Cocody, Rue des Jardins, Abidjan', medicaments: 'Amlodipine 5mg x30', distance: '2.3 km', statut: 'en_cours', pharmacie: 'Pharmacie du Centre' },
  { id: 1002, client: 'Moussa Diallo', adresse: 'Plateau, Avenue Chardy, Abidjan', medicaments: 'Paracétamol 1g x20, Amoxicilline 500mg', distance: '4.1 km', statut: 'assignee', pharmacie: 'Pharmacie Moderne' },
  { id: 1003, client: 'Fatou Bamba', adresse: 'Marcory, Abidjan', medicaments: 'Metformine 500mg x60', distance: '6.5 km', statut: 'livree', pharmacie: 'Pharmacie du Bonheur' },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.lg, paddingTop: 55 },
  greeting: { color: COLORS.textSecondary, fontSize: 14 },
  userName: { color: COLORS.text, fontSize: 20, fontWeight: 'bold' },
  logoutBtn: { padding: SPACING.sm },
  logoutText: { color: COLORS.error, fontSize: 13 },
  statutRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: SPACING.lg, backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.cardBorder },
  statutOnline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statutDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  statutText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 15 },
  statutSub: { color: COLORS.textSecondary, fontSize: 13 },
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
  emptyIcon: { fontSize: 48, marginBottom: SPACING.sm },
  emptyText: { color: COLORS.textSecondary, fontSize: 15 },
  livraisonCard: { marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.lg, padding: SPACING.md },
  livraisonTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  livraisonId: { backgroundColor: COLORS.primary + '20', borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 2 },
  livraisonIdText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 13 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 2 },
  statusText: { fontSize: 12, fontWeight: '600' },
  livraisonInfo: { marginBottom: SPACING.sm },
  livraisonClient: { color: COLORS.text, fontWeight: 'bold', fontSize: 15, marginBottom: 4 },
  livraisonAdresse: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 2 },
  livraisonMedicaments: { color: COLORS.textSecondary, fontSize: 13 },
  livraisonFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.cardBorder, paddingTop: SPACING.sm },
  livraisonDist: { color: COLORS.textSecondary, fontSize: 13 },
  livraisonArrow: { color: COLORS.primary, fontSize: 22 },
});
