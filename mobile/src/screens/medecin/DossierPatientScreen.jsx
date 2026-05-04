import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, TextInput, Alert,
} from 'react-native';
import { medecinAPI } from '../../services/api';
import { COLORS, SPACING, RADIUS } from '../../theme';

const TABS = ['Résumé', 'Antécédents', 'Ordonnances', 'Analyses', 'Notes'];

export default function DossierPatientScreen({ navigation, route }) {
  const { patient } = route.params;
  const [tab, setTab] = useState(0);
  const [dossier, setDossier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => { fetchDossier(); }, []);

  const fetchDossier = async () => {
    try {
      const res = await medecinAPI.getDossierPatient(patient.id);
      setDossier(res.data || DOSSIER_DEMO);
    } catch { setDossier(DOSSIER_DEMO); }
    finally { setLoading(false); }
  };

  const saveNote = async () => {
    if (!note.trim()) return;
    setSavingNote(true);
    try {
      await medecinAPI.updateDossier(patient.id, { note });
      Alert.alert('Succès', 'Note enregistrée');
      setNote('');
      fetchDossier();
    } catch { Alert.alert('Erreur', 'Impossible d\'enregistrer la note'); }
    finally { setSavingNote(false); }
  };

  if (loading) return (
    <View style={styles.loading}>
      <ActivityIndicator color={COLORS.primary} size="large" />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dossier Patient</Text>
        <View style={styles.secureBadge}>
          <Text style={styles.secureText}>🔒</Text>
        </View>
      </View>

      {/* Carte patient */}
      <View style={styles.patientCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{patient.prenom?.[0]}{patient.nom?.[0]}</Text>
        </View>
        <View style={styles.patientInfo}>
          <Text style={styles.patientName}>{patient.prenom} {patient.nom}</Text>
          <Text style={styles.patientMeta}>{patient.age} ans · {patient.sexe} · {dossier?.groupe_sanguin || patient.groupe_sanguin}</Text>
        </View>
      </View>

      {/* Vitaux */}
      <View style={styles.vitauxRow}>
        {[
          { label: 'Taille', value: dossier?.vitaux?.taille, unit: 'cm' },
          { label: 'Poids', value: dossier?.vitaux?.poids, unit: 'kg' },
          { label: 'IMC', value: dossier?.vitaux?.imc },
          { label: 'Tension', value: dossier?.vitaux?.tension },
        ].map((v, i) => (
          <View key={i} style={styles.vitauCard}>
            <Text style={styles.vitauValue}>{v.value}<Text style={styles.vitauUnit}>{v.unit || ''}</Text></Text>
            <Text style={styles.vitauLabel}>{v.label}</Text>
          </View>
        ))}
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
        {TABS.map((t, i) => (
          <TouchableOpacity key={i} style={[styles.tab, tab === i && styles.tabActive]} onPress={() => setTab(i)}>
            <Text style={[styles.tabText, tab === i && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.content}>
        {/* Résumé */}
        {tab === 0 && (
          <View>
            <InfoCard title="🚨 Allergies" items={dossier?.allergies} color={COLORS.error} />
            <InfoCard title="🏥 Maladies chroniques" items={dossier?.maladies_chroniques} color='#F59E0B' />
            <InfoCard title="💊 Traitements en cours" items={dossier?.traitements_en_cours} color='#3B82F6' />
          </View>
        )}

        {/* Antécédents */}
        {tab === 1 && dossier?.antecedents?.map((a, i) => (
          <View key={i} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemTitle}>{a.titre}</Text>
              <Text style={styles.itemDate}>{a.date}</Text>
            </View>
            <Text style={styles.itemDesc}>{a.description}</Text>
          </View>
        ))}

        {/* Ordonnances */}
        {tab === 2 && (
          <View>
            <TouchableOpacity style={styles.newOrdBtn}>
              <Text style={styles.newOrdBtnText}>+ Nouvelle ordonnance</Text>
            </TouchableOpacity>
            {dossier?.ordonnances?.map((o, i) => (
              <View key={i} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle}>{o.date}</Text>
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
        {tab === 3 && dossier?.analyses?.map((a, i) => (
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

        {/* Notes médecin */}
        {tab === 4 && (
          <View>
            <Text style={styles.noteLabel}>AJOUTER UNE NOTE</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="Observations, prescriptions, remarques..."
              placeholderTextColor={COLORS.textSecondary}
              multiline numberOfLines={5}
              value={note}
              onChangeText={setNote}
            />
            <TouchableOpacity style={styles.saveBtn} onPress={saveNote} disabled={savingNote}>
              <Text style={styles.saveBtnText}>{savingNote ? 'Enregistrement...' : 'Enregistrer la note'}</Text>
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>Notes précédentes</Text>
            {dossier?.notes?.map((n, i) => (
              <View key={i} style={styles.noteCard}>
                <Text style={styles.noteDate}>{n.date}</Text>
                <Text style={styles.noteText}>{n.contenu}</Text>
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
    {items?.map((item, i) => <Text key={i} style={styles.infoCardItem}>• {item}</Text>)}
  </View>
);

const DOSSIER_DEMO = {
  groupe_sanguin: 'A+',
  vitaux: { taille: 165, poids: 62, imc: 22.8, tension: '120/80' },
  allergies: ['Pénicilline', 'Arachides'],
  maladies_chroniques: ['Hypertension légère'],
  traitements_en_cours: ['Amlodipine 5mg/j'],
  antecedents: [
    { titre: 'Appendicite', date: 'Mars 2019', description: 'Appendicectomie réalisée avec succès.' },
  ],
  ordonnances: [
    { date: '15/04/2026', medicaments: [{ nom: 'Amlodipine', dosage: '5mg', duree: '30 jours' }] },
  ],
  analyses: [
    { type: 'NFS', date: '10/04/2026', resultat: 'Hémoglobine 12.5 g/dL', normal: true },
    { type: 'Glycémie', date: '10/04/2026', resultat: '1.25 g/L (élevée)', normal: false },
  ],
  notes: [
    { date: '15/04/2026', contenu: 'Patiente stable. Renouvellement traitement anti-hypertenseur. Contrôle dans 1 mois.' },
  ],
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loading: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg, paddingTop: 55 },
  backText: { color: COLORS.primary, fontSize: 24 },
  headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  secureBadge: { backgroundColor: COLORS.primary + '20', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  secureText: { fontSize: 16 },
  patientCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: SPACING.lg, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  patientInfo: { flex: 1 },
  patientName: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  patientMeta: { color: COLORS.textSecondary, fontSize: 13 },
  vitauxRow: { flexDirection: 'row', marginHorizontal: SPACING.lg, gap: SPACING.sm, marginBottom: SPACING.sm },
  vitauCard: { flex: 1, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.md, padding: SPACING.sm, alignItems: 'center' },
  vitauValue: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },
  vitauUnit: { fontSize: 11, color: COLORS.textSecondary },
  vitauLabel: { color: COLORS.textSecondary, fontSize: 11 },
  tabScroll: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.sm },
  tab: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, marginRight: SPACING.sm, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.cardBorder },
  tabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { color: COLORS.textSecondary, fontSize: 13 },
  tabTextActive: { color: '#fff', fontWeight: 'bold' },
  content: { flex: 1, paddingHorizontal: SPACING.lg },
  infoCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderLeftWidth: 4, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm },
  infoCardTitle: { color: COLORS.text, fontWeight: 'bold', fontSize: 14, marginBottom: 6 },
  infoCardItem: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 2 },
  itemCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  itemTitle: { color: COLORS.text, fontWeight: 'bold', fontSize: 14 },
  itemDate: { color: COLORS.textSecondary, fontSize: 13 },
  itemDesc: { color: COLORS.textSecondary, fontSize: 13 },
  medicament: { borderTopWidth: 1, borderTopColor: COLORS.cardBorder, paddingTop: 6, marginTop: 6 },
  medicamentNom: { color: COLORS.text, fontSize: 13, fontWeight: '500' },
  medicamentDosage: { color: COLORS.textSecondary, fontSize: 12 },
  analyseStatus: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 2, marginTop: 6 },
  analyseStatusText: { fontSize: 12, fontWeight: '600' },
  newOrdBtn: { backgroundColor: COLORS.primary + '20', borderWidth: 1, borderColor: COLORS.primary, borderRadius: RADIUS.md, padding: SPACING.sm, alignItems: 'center', marginBottom: SPACING.sm },
  newOrdBtnText: { color: COLORS.primary, fontWeight: 'bold' },
  noteLabel: { color: COLORS.textSecondary, fontSize: 11, letterSpacing: 1, marginBottom: 6 },
  noteInput: { backgroundColor: COLORS.inputBg, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.md, padding: SPACING.md, color: COLORS.text, height: 120, textAlignVertical: 'top', marginBottom: SPACING.sm },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: SPACING.sm, alignItems: 'center', marginBottom: SPACING.lg },
  saveBtnText: { color: '#fff', fontWeight: 'bold' },
  sectionTitle: { color: COLORS.text, fontSize: 15, fontWeight: 'bold', marginBottom: SPACING.sm },
  noteCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm },
  noteDate: { color: COLORS.primary, fontSize: 12, marginBottom: 4 },
  noteText: { color: COLORS.text, fontSize: 14 },
});
