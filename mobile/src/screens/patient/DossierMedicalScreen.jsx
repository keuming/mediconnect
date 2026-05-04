import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { patientAPI } from '../../services/api';
import { COLORS, SPACING, RADIUS } from '../../theme';

const SECTIONS = ['Résumé', 'Antécédents', 'Ordonnances', 'Analyses'];

export default function DossierMedicalScreen({ navigation }) {
  const [section, setSection] = useState(0);
  const [dossier, setDossier] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDossier(); }, []);

  const fetchDossier = async () => {
    try {
      const res = await patientAPI.getDossierMedical();
      setDossier(res.data || DOSSIER_DEMO);
    } catch { setDossier(DOSSIER_DEMO); }
    finally { setLoading(false); }
  };

  if (loading) return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator color={COLORS.primary} size="large" />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dossier Médical</Text>
        <View style={styles.secureBadge}>
          <Text style={styles.secureText}>🔒 Sécurisé</Text>
        </View>
      </View>

      {/* Carte patient */}
      <View style={styles.patientCard}>
        <View style={styles.patientAvatar}>
          <Text style={styles.patientAvatarText}>{dossier?.patient?.prenom?.[0]}{dossier?.patient?.nom?.[0]}</Text>
        </View>
        <View style={styles.patientInfo}>
          <Text style={styles.patientName}>{dossier?.patient?.prenom} {dossier?.patient?.nom}</Text>
          <Text style={styles.patientMeta}>
            {dossier?.patient?.age} ans · {dossier?.patient?.sexe} · {dossier?.patient?.groupe_sanguin}
          </Text>
        </View>
      </View>

      {/* Stats vitaux */}
      <View style={styles.vitauxRow}>
        {[
          { label: 'Taille', value: dossier?.vitaux?.taille, unit: 'cm' },
          { label: 'Poids', value: dossier?.vitaux?.poids, unit: 'kg' },
          { label: 'IMC', value: dossier?.vitaux?.imc, unit: '' },
          { label: 'Tension', value: dossier?.vitaux?.tension, unit: '' },
        ].map((v, i) => (
          <View key={i} style={styles.vitauCard}>
            <Text style={styles.vitauValue}>{v.value}<Text style={styles.vitauUnit}>{v.unit}</Text></Text>
            <Text style={styles.vitauLabel}>{v.label}</Text>
          </View>
        ))}
      </View>

      {/* Tabs sections */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
        {SECTIONS.map((s, i) => (
          <TouchableOpacity key={i} style={[styles.tab, section === i && styles.tabActive]} onPress={() => setSection(i)}>
            <Text style={[styles.tabText, section === i && styles.tabTextActive]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.content}>
        {/* Résumé */}
        {section === 0 && (
          <View>
            <InfoCard title="Allergies 🚨" items={dossier?.allergies} color={COLORS.error} />
            <InfoCard title="Maladies chroniques" items={dossier?.maladies_chroniques} color='#F59E0B' />
            <InfoCard title="Médecin traitant" items={[dossier?.medecin_traitant]} color={COLORS.primary} />
          </View>
        )}

        {/* Antécédents */}
        {section === 1 && (
          <View>
            {dossier?.antecedents?.map((a, i) => (
              <View key={i} style={styles.itemCard}>
                <Text style={styles.itemTitle}>{a.titre}</Text>
                <Text style={styles.itemDate}>{a.date}</Text>
                <Text style={styles.itemDesc}>{a.description}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Ordonnances */}
        {section === 2 && (
          <View>
            {dossier?.ordonnances?.map((o, i) => (
              <View key={i} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle}>{o.medecin}</Text>
                  <Text style={styles.itemDate}>{o.date}</Text>
                </View>
                {o.medicaments?.map((m, j) => (
                  <View key={j} style={styles.medicament}>
                    <Text style={styles.medicamentNom}>💊 {m.nom}</Text>
                    <Text style={styles.medicamentDosage}>{m.dosage} · {m.duree}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Analyses */}
        {section === 3 && (
          <View>
            {dossier?.analyses?.map((a, i) => (
              <View key={i} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle}>{a.type}</Text>
                  <Text style={styles.itemDate}>{a.date}</Text>
                </View>
                <Text style={styles.itemDesc}>{a.resultat}</Text>
                <View style={[styles.analyseStatus, { backgroundColor: a.normal ? COLORS.primary + '20' : COLORS.error + '20' }]}>
                  <Text style={[styles.analyseStatusText, { color: a.normal ? COLORS.primary : COLORS.error }]}>
                    {a.normal ? '✓ Normal' : '⚠ Anormal'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const InfoCard = ({ title, items, color }) => (
  <View style={[styles.infoCard, { borderLeftColor: color }]}>
    <Text style={styles.infoCardTitle}>{title}</Text>
    {items?.map((item, i) => (
      <Text key={i} style={styles.infoCardItem}>• {item}</Text>
    ))}
  </View>
);

const DOSSIER_DEMO = {
  patient: { prenom: 'Aya', nom: 'Konan', age: 32, sexe: 'F', groupe_sanguin: 'A+' },
  vitaux: { taille: 165, poids: 62, imc: 22.8, tension: '120/80' },
  allergies: ['Pénicilline', 'Arachides'],
  maladies_chroniques: ['Hypertension légère'],
  medecin_traitant: 'Dr. Diallo Moussa',
  antecedents: [
    { titre: 'Appendicite', date: 'Mars 2019', description: 'Appendicectomie réalisée avec succès.' },
    { titre: 'Fracture poignet droit', date: 'Juin 2021', description: 'Traitement orthopédique, guérison complète.' },
  ],
  ordonnances: [
    {
      medecin: 'Dr. Diallo Moussa', date: '15/04/2026',
      medicaments: [
        { nom: 'Amlodipine', dosage: '5mg', duree: '30 jours' },
        { nom: 'Paracétamol', dosage: '1g', duree: '7 jours' },
      ],
    },
  ],
  analyses: [
    { type: 'Numération Formule Sanguine', date: '10/04/2026', resultat: 'Hémoglobine 12.5 g/dL', normal: true },
    { type: 'Glycémie à jeun', date: '10/04/2026', resultat: '1.25 g/L (élevée)', normal: false },
  ],
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg, paddingTop: 55 },
  backText: { color: COLORS.primary, fontSize: 24 },
  headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  secureBadge: { backgroundColor: COLORS.primary + '20', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  secureText: { color: COLORS.primary, fontSize: 12 },
  patientCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: SPACING.lg, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md },
  patientAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md },
  patientAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  patientName: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  patientMeta: { color: COLORS.textSecondary, fontSize: 13 },
  patientInfo: { flex: 1 },
  vitauxRow: { flexDirection: 'row', marginHorizontal: SPACING.lg, gap: SPACING.sm, marginBottom: SPACING.md },
  vitauCard: { flex: 1, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.md, padding: SPACING.sm, alignItems: 'center' },
  vitauValue: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  vitauUnit: { fontSize: 12, color: COLORS.textSecondary },
  vitauLabel: { color: COLORS.textSecondary, fontSize: 11 },
  tabScroll: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.sm },
  tab: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, marginRight: SPACING.sm, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.cardBorder },
  tabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { color: COLORS.textSecondary, fontSize: 14 },
  tabTextActive: { color: '#fff', fontWeight: 'bold' },
  content: { flex: 1, paddingHorizontal: SPACING.lg },
  infoCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderLeftWidth: 4, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm },
  infoCardTitle: { color: COLORS.text, fontWeight: 'bold', fontSize: 15, marginBottom: 6 },
  infoCardItem: { color: COLORS.textSecondary, fontSize: 14, marginBottom: 2 },
  itemCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  itemTitle: { color: COLORS.text, fontWeight: 'bold', fontSize: 15 },
  itemDate: { color: COLORS.textSecondary, fontSize: 13 },
  itemDesc: { color: COLORS.textSecondary, fontSize: 14 },
  medicament: { borderTopWidth: 1, borderTopColor: COLORS.cardBorder, paddingTop: 6, marginTop: 6 },
  medicamentNom: { color: COLORS.text, fontSize: 14, fontWeight: '500' },
  medicamentDosage: { color: COLORS.textSecondary, fontSize: 13 },
  analyseStatus: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 2, marginTop: 6 },
  analyseStatusText: { fontSize: 12, fontWeight: '600' },
});
