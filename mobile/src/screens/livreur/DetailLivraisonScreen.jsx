import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, Linking,
} from 'react-native';
import { COLORS, SPACING, RADIUS } from '../../theme';

export default function DetailLivraisonScreen({ navigation, route }) {
  const { livraison } = route.params;
  const [statut, setStatut] = useState(livraison.statut);

  const handleStatut = (nouveauStatut) => {
    Alert.alert(
      nouveauStatut === 'en_cours' ? 'Démarrer la livraison ?' : 'Confirmer la livraison ?',
      nouveauStatut === 'en_cours'
        ? 'Confirmez que vous avez récupéré le colis.'
        : 'Confirmez que le colis a été livré au client.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Confirmer', onPress: () => setStatut(nouveauStatut) },
      ]
    );
  };

  const openMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(livraison.adresse)}`;
    Linking.openURL(url);
  };

  const callClient = () => {
    if (livraison.telephone) {
      Linking.openURL(`tel:${livraison.telephone}`);
    }
  };

  const statutConfig = {
    assignee: { label: 'À récupérer', color: '#F59E0B', next: 'en_cours', nextLabel: '🛵 Démarrer la livraison' },
    en_cours: { label: 'En livraison', color: COLORS.primary, next: 'livree', nextLabel: '✓ Confirmer la livraison' },
    livree: { label: 'Livrée', color: '#3B82F6', next: null, nextLabel: null },
  };

  const sc = statutConfig[statut] || statutConfig.assignee;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Livraison #{livraison.id}</Text>
        <View style={[styles.statusBadge, { backgroundColor: sc.color + '20' }]}>
          <Text style={[styles.statusText, { color: sc.color }]}>{sc.label}</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Client */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>👤 Client</Text>
          <Text style={styles.clientName}>{livraison.client}</Text>
          {livraison.telephone && (
            <TouchableOpacity style={styles.callBtn} onPress={callClient}>
              <Text style={styles.callBtnText}>📞 Appeler le client</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Adresse */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📍 Adresse de livraison</Text>
          <Text style={styles.adresse}>{livraison.adresse}</Text>
          <Text style={styles.distance}>Distance : {livraison.distance}</Text>
          <TouchableOpacity style={styles.mapsBtn} onPress={openMaps}>
            <Text style={styles.mapsBtnText}>🗺️ Ouvrir dans Google Maps</Text>
          </TouchableOpacity>
        </View>

        {/* Pharmacie */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🏪 Pharmacie de départ</Text>
          <Text style={styles.pharmacie}>{livraison.pharmacie || 'Pharmacie du Centre'}</Text>
        </View>

        {/* Médicaments */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💊 Médicaments à livrer</Text>
          <Text style={styles.medicaments}>{livraison.medicaments}</Text>
          <View style={styles.alertBox}>
            <Text style={styles.alertText}>⚠️ Manipuler avec précaution — médicaments fragiles</Text>
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📋 Instructions</Text>
          <Text style={styles.instruction}>• Vérifier l'identité du client avant remise</Text>
          <Text style={styles.instruction}>• Ne pas laisser le colis sans signature</Text>
          <Text style={styles.instruction}>• En cas d'absence, contacter le dispatcher</Text>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Bouton action */}
      {sc.next && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: sc.color }]}
            onPress={() => handleStatut(sc.next)}
          >
            <Text style={styles.actionBtnText}>{sc.nextLabel}</Text>
          </TouchableOpacity>
        </View>
      )}

      {statut === 'livree' && (
        <View style={styles.footer}>
          <View style={styles.successBox}>
            <Text style={styles.successText}>✓ Livraison complétée avec succès !</Text>
          </View>
          <TouchableOpacity style={styles.retourBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.retourBtnText}>Retour aux livraisons</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg, paddingTop: 55 },
  backText: { color: COLORS.primary, fontSize: 24 },
  headerTitle: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },
  content: { flex: 1, paddingHorizontal: SPACING.lg },
  card: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm },
  cardTitle: { color: COLORS.textSecondary, fontSize: 12, letterSpacing: 1, marginBottom: SPACING.sm, fontWeight: '600' },
  clientName: { color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginBottom: SPACING.sm },
  callBtn: { backgroundColor: COLORS.primary + '20', borderRadius: RADIUS.sm, padding: SPACING.sm, alignItems: 'center' },
  callBtnText: { color: COLORS.primary, fontWeight: 'bold' },
  adresse: { color: COLORS.text, fontSize: 15, marginBottom: 6 },
  distance: { color: COLORS.textSecondary, fontSize: 13, marginBottom: SPACING.sm },
  mapsBtn: { backgroundColor: '#3B82F620', borderRadius: RADIUS.sm, padding: SPACING.sm, alignItems: 'center' },
  mapsBtnText: { color: '#3B82F6', fontWeight: 'bold' },
  pharmacie: { color: COLORS.text, fontSize: 15 },
  medicaments: { color: COLORS.text, fontSize: 15, marginBottom: SPACING.sm },
  alertBox: { backgroundColor: '#F59E0B20', borderRadius: RADIUS.sm, padding: SPACING.sm },
  alertText: { color: '#F59E0B', fontSize: 13 },
  instruction: { color: COLORS.textSecondary, fontSize: 14, marginBottom: 4 },
  footer: { padding: SPACING.lg, paddingBottom: 34, gap: SPACING.sm },
  actionBtn: { borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  successBox: { backgroundColor: COLORS.primary + '20', borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center' },
  successText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 16 },
  retourBtn: { borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center' },
  retourBtnText: { color: COLORS.textSecondary, fontSize: 15 },
});
