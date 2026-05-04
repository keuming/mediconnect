import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../../theme';

export default function ConfirmationScreen({ navigation, route }) {
  const { rdv } = route.params || {};

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>✓</Text>
        </View>
        <Text style={styles.title}>RDV Confirmé !</Text>
        <Text style={styles.subtitle}>Votre rendez-vous a été enregistré avec succès</Text>

        <View style={styles.card}>
          {[
            { label: 'Médecin', value: `Dr. ${rdv?.medecin?.prenom} ${rdv?.medecin?.nom}` },
            { label: 'Spécialité', value: rdv?.specialite?.nom },
            { label: 'Date', value: rdv?.date },
            { label: 'Heure', value: rdv?.creneau },
          ].map((r, i) => (
            <View key={i} style={styles.row}>
              <Text style={styles.rowLabel}>{r.label}</Text>
              <Text style={styles.rowValue}>{r.value}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.info}>📱 Vous recevrez une confirmation par SMS</Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('MesRDV')}>
          <Text style={styles.btnText}>Voir mes RDV</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnSecondary} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.btnSecondaryText}>Retour à l'accueil</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.lg },
  icon: { color: '#fff', fontSize: 36, fontWeight: 'bold' },
  title: { color: COLORS.text, fontSize: 28, fontWeight: 'bold', marginBottom: SPACING.sm },
  subtitle: { color: COLORS.textSecondary, fontSize: 15, textAlign: 'center', marginBottom: SPACING.xl },
  card: { width: '100%', backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.lg },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder },
  rowLabel: { color: COLORS.textSecondary, fontSize: 14 },
  rowValue: { color: COLORS.text, fontSize: 14, fontWeight: '500' },
  info: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center' },
  footer: { padding: SPACING.lg, paddingBottom: 34, gap: SPACING.sm },
  btn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  btnSecondary: { borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center' },
  btnSecondaryText: { color: COLORS.textSecondary, fontSize: 16 },
});
