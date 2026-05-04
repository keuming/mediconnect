import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { COLORS, SPACING, RADIUS } from '../../theme';

const TABS = ['En cours', 'Assignées', 'Livrées'];

const LIVRAISONS_DEMO = [
  { id: 1001, client: 'Aya Konan', adresse: 'Cocody, Rue des Jardins, Abidjan', medicaments: 'Amlodipine 5mg x30', distance: '2.3 km', statut: 'en_cours', pharmacie: 'Pharmacie du Centre', telephone: '+2250700000001' },
  { id: 1002, client: 'Moussa Diallo', adresse: 'Plateau, Avenue Chardy, Abidjan', medicaments: 'Paracétamol 1g x20', distance: '4.1 km', statut: 'assignee', pharmacie: 'Pharmacie Moderne', telephone: '+2250700000002' },
  { id: 1003, client: 'Fatou Bamba', adresse: 'Marcory, Abidjan', medicaments: 'Metformine 500mg x60', distance: '6.5 km', statut: 'livree', pharmacie: 'Pharmacie du Bonheur', telephone: '+2250700000003' },
  { id: 1004, client: 'Koffi Assi', adresse: 'Yopougon, Abidjan', medicaments: 'Amoxicilline 500mg x21', distance: '8.2 km', statut: 'livree', pharmacie: 'Pharmacie Centrale', telephone: '+2250700000004' },
];

const statutConfig = {
  assignee: { label: 'À récupérer', color: '#F59E0B' },
  en_cours: { label: 'En livraison', color: COLORS.primary },
  livree: { label: 'Livrée', color: '#3B82F6' },
};

export default function MesLivraisonsScreen({ navigation }) {
  const [tab, setTab] = useState(0);

  const filtered = LIVRAISONS_DEMO.filter(l => {
    if (tab === 0) return l.statut === 'en_cours';
    if (tab === 1) return l.statut === 'assignee';
    return l.statut === 'livree';
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes Livraisons</Text>
        <View style={{ width: 30 }} />
      </View>

      <View style={styles.tabRow}>
        {TABS.map((t, i) => (
          <TouchableOpacity key={i} style={[styles.tab, tab === i && styles.tabActive]} onPress={() => setTab(i)}>
            <Text style={[styles.tabText, tab === i && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.list}>
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyText}>Aucune livraison ici</Text>
          </View>
        ) : filtered.map((l, i) => {
          const sc = statutConfig[l.statut];
          return (
            <TouchableOpacity
              key={i}
              style={styles.card}
              onPress={() => navigation.navigate('DetailLivraison', { livraison: l })}
            >
              <View style={styles.cardTop}>
                <Text style={styles.cardId}>#{l.id}</Text>
                <View style={[styles.badge, { backgroundColor: sc.color + '20' }]}>
                  <Text style={[styles.badgeText, { color: sc.color }]}>{sc.label}</Text>
                </View>
              </View>
              <Text style={styles.client}>👤 {l.client}</Text>
              <Text style={styles.adresse}>📍 {l.adresse}</Text>
              <Text style={styles.medicaments}>💊 {l.medicaments}</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.distance}>📏 {l.distance}</Text>
                <Text style={styles.arrow}>›</Text>
              </View>
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg, paddingTop: 55 },
  backText: { color: COLORS.primary, fontSize: 24 },
  headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
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
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  cardId: { color: COLORS.primary, fontWeight: 'bold' },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 2 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  client: { color: COLORS.text, fontWeight: 'bold', fontSize: 15, marginBottom: 4 },
  adresse: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 2 },
  medicaments: { color: COLORS.textSecondary, fontSize: 13, marginBottom: SPACING.sm },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: COLORS.cardBorder, paddingTop: SPACING.sm },
  distance: { color: COLORS.textSecondary, fontSize: 13 },
  arrow: { color: COLORS.primary, fontSize: 20 },
});
