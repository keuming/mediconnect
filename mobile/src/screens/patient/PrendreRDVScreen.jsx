import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { patientAPI } from '../../services/api';
import { COLORS, SPACING, RADIUS } from '../../theme';

const STEPS = ['Spécialité', 'Médecin', 'Créneau', 'Confirmation'];

export default function PrendreRDVScreen({ navigation }) {
  const [step, setStep] = useState(0);
  const [specialites, setSpecialites] = useState([]);
  const [medecins, setMedecins] = useState([]);
  const [creneaux, setCreneaux] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    specialite: null, ville: 'Abidjan',
    medecin: null, date: '', creneau: null, motif: '',
  });

  useEffect(() => { fetchSpecialites(); }, []);

  const fetchSpecialites = async () => {
    try {
      const res = await patientAPI.getSpecialites();
      setSpecialites(res.data || []);
    } catch { setSpecialites(SPECIALITES_DEMO); }
  };

  const fetchMedecins = async () => {
    setLoading(true);
    try {
      const res = await patientAPI.getMedecins({ specialite: form.specialite?.id, ville: form.ville });
      setMedecins(res.data || []);
    } catch { setMedecins(MEDECINS_DEMO); }
    finally { setLoading(false); }
  };

  const fetchCreneaux = async () => {
    setLoading(true);
    try {
      const res = await patientAPI.getCreneaux(form.medecin?.id, form.date);
      setCreneaux(res.data || []);
    } catch { setCreneaux(CRENEAUX_DEMO); }
    finally { setLoading(false); }
  };

  const nextStep = () => {
    if (step === 0 && !form.specialite) { Alert.alert('', 'Choisissez une spécialité'); return; }
    if (step === 1 && !form.medecin) { Alert.alert('', 'Choisissez un médecin'); return; }
    if (step === 2 && !form.creneau) { Alert.alert('', 'Choisissez un créneau'); return; }
    if (step === 1) fetchCreneaux();
    if (step === 0) fetchMedecins();
    setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await patientAPI.prendreRDV({
        medecinId: form.medecin.id, specialite: form.specialite.nom,
        date: form.date, heure: form.creneau, motif: form.motif,
      });
      navigation.navigate('Confirmation', { rdv: form });
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de créer le RDV');
    } finally { setLoading(false); }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => step > 0 ? setStep(s => s - 1) : navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Prendre RDV</Text>
        <View style={{ width: 30 }} />
      </View>

      {/* Progress */}
      <View style={styles.progressRow}>
        {STEPS.map((s, i) => (
          <View key={i} style={styles.progressItem}>
            <View style={[styles.progressDot, i <= step && styles.progressDotActive]}>
              <Text style={styles.progressDotText}>{i + 1}</Text>
            </View>
            <Text style={[styles.progressLabel, i === step && styles.progressLabelActive]}>{s}</Text>
          </View>
        ))}
      </View>

      <ScrollView style={styles.content}>
        {/* Step 0 - Spécialité */}
        {step === 0 && (
          <View>
            <Text style={styles.stepTitle}>Quelle spécialité ?</Text>
            <TextInput style={styles.input} placeholder="Ville" placeholderTextColor={COLORS.textSecondary}
              value={form.ville} onChangeText={v => setForm(f => ({ ...f, ville: v }))} />
            <View style={styles.grid}>
              {specialites.map((s, i) => (
                <TouchableOpacity key={i} style={[styles.specCard, form.specialite?.id === s.id && styles.specCardActive]}
                  onPress={() => setForm(f => ({ ...f, specialite: s }))}>
                  <Text style={styles.specIcon}>{s.icon || '🩺'}</Text>
                  <Text style={styles.specName}>{s.nom}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Step 1 - Médecin */}
        {step === 1 && (
          <View>
            <Text style={styles.stepTitle}>Choisir un médecin</Text>
            {loading ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: 30 }} /> :
              medecins.map((m, i) => (
                <TouchableOpacity key={i} style={[styles.medecinCard, form.medecin?.id === m.id && styles.medecinCardActive]}
                  onPress={() => setForm(f => ({ ...f, medecin: m }))}>
                  <View style={styles.medecinAvatar}>
                    <Text style={styles.medecinAvatarText}>{m.prenom?.[0]}{m.nom?.[0]}</Text>
                  </View>
                  <View style={styles.medecinInfo}>
                    <Text style={styles.medecinName}>Dr. {m.prenom} {m.nom}</Text>
                    <Text style={styles.medecinSpec}>{m.specialite}</Text>
                    <Text style={styles.medecinVille}>📍 {m.ville}</Text>
                  </View>
                  {form.medecin?.id === m.id && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              ))
            }
            <Text style={styles.label}>DATE SOUHAITÉE</Text>
            <TextInput style={styles.input} placeholder="jj/mm/aaaa" placeholderTextColor={COLORS.textSecondary}
              value={form.date} onChangeText={v => setForm(f => ({ ...f, date: v }))} />
          </View>
        )}

        {/* Step 2 - Créneau */}
        {step === 2 && (
          <View>
            <Text style={styles.stepTitle}>Choisir un créneau</Text>
            {loading ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: 30 }} /> : (
              <View style={styles.creneauxGrid}>
                {creneaux.map((c, i) => (
                  <TouchableOpacity key={i} style={[styles.creneauBtn, form.creneau === c && styles.creneauBtnActive]}
                    onPress={() => setForm(f => ({ ...f, creneau: c }))}>
                    <Text style={[styles.creneauText, form.creneau === c && styles.creneauTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <Text style={styles.label}>MOTIF (optionnel)</Text>
            <TextInput style={[styles.input, styles.textArea]} placeholder="Décrivez votre motif..."
              placeholderTextColor={COLORS.textSecondary} multiline numberOfLines={4}
              value={form.motif} onChangeText={v => setForm(f => ({ ...f, motif: v }))} />
          </View>
        )}

        {/* Step 3 - Récap */}
        {step === 3 && (
          <View>
            <Text style={styles.stepTitle}>Confirmez votre RDV</Text>
            <View style={styles.recapCard}>
              {[
                { label: 'Médecin', value: `Dr. ${form.medecin?.prenom} ${form.medecin?.nom}` },
                { label: 'Spécialité', value: form.specialite?.nom },
                { label: 'Date', value: form.date },
                { label: 'Heure', value: form.creneau },
                { label: 'Motif', value: form.motif || 'Non précisé' },
              ].map((r, i) => (
                <View key={i} style={styles.recapRow}>
                  <Text style={styles.recapLabel}>{r.label}</Text>
                  <Text style={styles.recapValue}>{r.value}</Text>
                </View>
              ))}
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>✓ Gratuit  ·  ✓ Sans inscription  ·  ✓ Confirmé en 60s</Text>
            </View>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Footer button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.nextBtn}
          onPress={step === 3 ? handleSubmit : nextStep}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> :
            <Text style={styles.nextBtnText}>
              {step === 3 ? '✓ Confirmer le RDV' : 'Continuer →'}
            </Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Données demo si l'API n'est pas dispo
const SPECIALITES_DEMO = [
  { id: 1, nom: 'Médecine générale', icon: '🩺' },
  { id: 2, nom: 'Cardiologie', icon: '❤️' },
  { id: 3, nom: 'Pédiatrie', icon: '👶' },
  { id: 4, nom: 'Gynécologie', icon: '🌸' },
  { id: 5, nom: 'Dermatologie', icon: '🧴' },
  { id: 6, nom: 'Ophtalmologie', icon: '👁️' },
];

const MEDECINS_DEMO = [
  { id: 1, nom: 'Konan', prenom: 'Aya', specialite: 'Médecine générale', ville: 'Abidjan' },
  { id: 2, nom: 'Diallo', prenom: 'Moussa', specialite: 'Cardiologie', ville: 'Abidjan' },
];

const CRENEAUX_DEMO = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '14:00', '14:30', '15:00'];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg, paddingTop: 55 },
  backText: { color: COLORS.primary, fontSize: 24 },
  headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  progressRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg },
  progressItem: { alignItems: 'center' },
  progressDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  progressDotActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  progressDotText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  progressLabel: { color: COLORS.textSecondary, fontSize: 10 },
  progressLabelActive: { color: COLORS.primary, fontWeight: 'bold' },
  content: { flex: 1, paddingHorizontal: SPACING.lg },
  stepTitle: { color: COLORS.text, fontSize: 20, fontWeight: 'bold', marginBottom: SPACING.md },
  label: { color: COLORS.textSecondary, fontSize: 11, letterSpacing: 1, marginBottom: 6, marginTop: SPACING.md },
  input: { backgroundColor: COLORS.inputBg, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.md, padding: SPACING.md, color: COLORS.text, marginBottom: 4 },
  textArea: { height: 100, textAlignVertical: 'top' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  specCard: { width: '47%', backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center' },
  specCardActive: { borderColor: COLORS.primary, backgroundColor: '#0A8F5820' },
  specIcon: { fontSize: 28, marginBottom: 6 },
  specName: { color: COLORS.text, fontSize: 12, textAlign: 'center' },
  medecinCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm },
  medecinCardActive: { borderColor: COLORS.primary },
  medecinAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md },
  medecinAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  medecinInfo: { flex: 1 },
  medecinName: { color: COLORS.text, fontWeight: 'bold', fontSize: 15 },
  medecinSpec: { color: COLORS.textSecondary, fontSize: 13 },
  medecinVille: { color: COLORS.textSecondary, fontSize: 12 },
  checkmark: { color: COLORS.primary, fontSize: 20, fontWeight: 'bold' },
  creneauxGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md },
  creneauBtn: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.sm },
  creneauBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  creneauText: { color: COLORS.text, fontSize: 14 },
  creneauTextActive: { color: '#fff', fontWeight: 'bold' },
  recapCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.md },
  recapRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder },
  recapLabel: { color: COLORS.textSecondary, fontSize: 14 },
  recapValue: { color: COLORS.text, fontSize: 14, fontWeight: '500', maxWidth: '60%', textAlign: 'right' },
  infoBox: { backgroundColor: '#0A8F5815', borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center' },
  infoText: { color: COLORS.primary, fontSize: 13 },
  footer: { padding: SPACING.lg, paddingBottom: 34 },
  nextBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center' },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
