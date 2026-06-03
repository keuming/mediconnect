import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PatientAPI } from '../../config/api';
import { C, Btn, ScreenHeader, Loader } from '../../components/UI';

const HEURES = [
  '07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00',
  '11:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00',
];
const MOTIFS = [
  'Consultation générale','Suivi médical','Renouvellement ordonnance',
  'Résultats d\'analyses','Urgence médicale','Visite de contrôle',
  'Pédiatrie','Gynécologie','Dermatologie','Autre',
];

const STEPS = ['Type','Prestataire','Médecin','Date & Heure','Confirmation'];

export default function RdvFormScreen({ navigation }) {
  const qc = useQueryClient();
  const [step,     setStep]     = useState(1);
  const [type,     setType]     = useState(null);     // 'clinique' | 'mc'
  const [clinique, setClinique] = useState(null);
  const [medecin,  setMedecin]  = useState(null);
  const [date,     setDate]     = useState('');
  const [heure,    setHeure]    = useState('');
  const [motif,    setMotif]    = useState('');

  const { data: cliniques, isLoading: ldCl } = useQuery({
    queryKey: ['cliniques'],
    queryFn:  () => PatientAPI.cliniques().then(r => r.data || []),
  });
  const { data: medecins, isLoading: ldMed } = useQuery({
    queryKey: ['medecins', type, clinique?.id],
    queryFn:  () => type === 'mc'
      ? PatientAPI.medecinsMC().then(r => r.data || [])
      : PatientAPI.medecinsClinique(clinique?.id).then(r => r.data || []),
    enabled: step === 3,
  });

  const rdvMut = useMutation({
    mutationFn: () => PatientAPI.prendreRdv({
      patient_nom: 'Patient',
      clinique_id: clinique?.id || null,
      medecin_id:  medecin?.id  || null,
      medecin_nom: medecin ? `${medecin.prenom} ${medecin.nom}` : null,
      date_rdv:    date,
      heure_rdv:   heure,
      motif,
      source:      'mobile',
    }),
    onSuccess: (r) => {
      if (r.success) {
        qc.invalidateQueries(['p-rdvs']);
        Alert.alert('✅ RDV confirmé !',
          `Référence : ${r.data?.reference || 'N/A'}\n\nVous recevrez un rappel SMS avant votre rendez-vous.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Erreur', r.message);
      }
    },
    onError: e => Alert.alert('Erreur', e.message),
  });

  const back = () => step > 1 ? setStep(s => s - 1) : navigation.goBack();

  // Générer les 14 prochains jours
  const prochains14Jours = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    return {
      val:    d.toISOString().split('T')[0],
      label:  d.toLocaleDateString('fr-CI', { weekday: 'short', day: 'numeric', month: 'short' }),
      jour:   d.toLocaleDateString('fr-CI', { weekday: 'long' }),
    };
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Header avec barre de progression */}
      <View style={s.header}>
        <TouchableOpacity onPress={back} style={s.backBtn}>
          <Text style={{ color: C.muted, fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Prendre un RDV</Text>
          <Text style={s.headerSub}>Étape {step} / {STEPS.length} — {STEPS[step - 1]}</Text>
        </View>
      </View>
      <View style={s.progressBar}>
        {STEPS.map((_, i) => (
          <View key={i} style={[s.progressStep, { backgroundColor: i < step ? C.green : C.border }]} />
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">

        {/* ── ÉTAPE 1 : Type de médecin ── */}
        {step === 1 && (
          <View>
            <Text style={s.stTitle}>Quel type de médecin ?</Text>
            {[
              { v: 'clinique', icon: '🏥', t: 'Médecin de clinique', d: 'Consultez dans un établissement partenaire MediConnect', color: C.blue },
              { v: 'mc',       icon: '⭐', t: 'Médecin Conseil',     d: 'Médecin de famille indépendant — suivi personnalisé',    color: C.green },
            ].map(o => (
              <TouchableOpacity
                key={o.v}
                style={[s.typeCard, { borderColor: type === o.v ? o.color : C.border, backgroundColor: type === o.v ? o.color + '12' : C.card }]}
                onPress={() => { setType(o.v); setClinique(null); setMedecin(null); setStep(o.v === 'mc' ? 3 : 2); }}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 36, marginBottom: 10 }}>{o.icon}</Text>
                <Text style={[s.typeTitle, { color: type === o.v ? o.color : C.text }]}>{o.t}</Text>
                <Text style={s.typeDesc}>{o.d}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── ÉTAPE 2 : Choisir clinique ── */}
        {step === 2 && (
          <View>
            <Text style={s.stTitle}>Sélectionnez une clinique</Text>
            {ldCl && <Loader text="Chargement des cliniques…" />}
            {(cliniques || []).map(cl => (
              <TouchableOpacity
                key={cl.id}
                style={[s.listCard, { borderColor: clinique?.id === cl.id ? C.green : C.border, backgroundColor: clinique?.id === cl.id ? 'rgba(10,143,88,.1)' : C.card }]}
                onPress={() => { setClinique(cl); setMedecin(null); setStep(3); }}
                activeOpacity={0.8}
              >
                <View style={s.listLeft}>
                  <View style={s.listIcon}><Text style={{ fontSize: 22 }}>🏥</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.listTitle}>{cl.nom}</Text>
                    <Text style={s.listSub}>{cl.ville || '—'} · {cl.type || 'Clinique'}</Text>
                    {cl.telephone && <Text style={s.listSub}>📞 {cl.telephone}</Text>}
                  </View>
                </View>
                {clinique?.id === cl.id && <Text style={{ color: C.greenL, fontSize: 20 }}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── ÉTAPE 3 : Choisir médecin ── */}
        {step === 3 && (
          <View>
            <Text style={s.stTitle}>
              {type === 'mc' ? 'Choisissez un Médecin Conseil' : `Médecins de ${clinique?.nom || 'la clinique'}`}
            </Text>
            {ldMed && <Loader text="Chargement des médecins…" />}
            {!ldMed && !medecins?.length && (
              <View style={s.emptyBox}>
                <Text style={{ fontSize: 36, marginBottom: 10 }}>👨‍⚕️</Text>
                <Text style={{ color: C.dim, textAlign: 'center' }}>Aucun médecin disponible</Text>
              </View>
            )}
            {(medecins || []).map(m => (
              <TouchableOpacity
                key={m.id}
                style={[s.listCard, { borderColor: medecin?.id === m.id ? C.purple : C.border, backgroundColor: medecin?.id === m.id ? 'rgba(124,58,237,.1)' : C.card }]}
                onPress={() => { setMedecin(m); setStep(4); }}
                activeOpacity={0.8}
              >
                <View style={[s.listIcon, { backgroundColor: 'rgba(124,58,237,.15)' }]}>
                  <Text style={{ fontSize: 22 }}>👨‍⚕️</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.listTitle}>Dr. {m.prenom} {m.nom}</Text>
                  <Text style={s.listSub}>{m.specialite}</Text>
                  {m.tarif && <Text style={[s.listSub, { color: C.greenL }]}>💰 {m.tarif} FCFA / consultation</Text>}
                  {m.note_moyenne && <Text style={s.listSub}>⭐ {m.note_moyenne}/5</Text>}
                </View>
                {medecin?.id === m.id && <Text style={{ color: C.purpleL, fontSize: 20 }}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── ÉTAPE 4 : Date & Heure ── */}
        {step === 4 && (
          <View>
            <Text style={s.stTitle}>Choisissez la date</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20, marginHorizontal: -20, paddingHorizontal: 20 }}>
              {prochains14Jours.map(d => (
                <TouchableOpacity
                  key={d.val}
                  style={[s.dateChip, { borderColor: date === d.val ? C.green : C.border, backgroundColor: date === d.val ? 'rgba(10,143,88,.15)' : C.card }]}
                  onPress={() => setDate(d.val)}
                >
                  <Text style={[s.dateChipDay, { color: date === d.val ? C.green : C.dim }]}>
                    {d.label.split(' ')[0]}
                  </Text>
                  <Text style={[s.dateChipNum, { color: date === d.val ? C.greenL : C.text }]}>
                    {d.label.split(' ')[1]}
                  </Text>
                  <Text style={[s.dateChipMois, { color: date === d.val ? C.green : C.dim }]}>
                    {d.label.split(' ')[2]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {date && (
              <>
                <Text style={s.stTitle}>Choisissez l'heure</Text>
                <View style={s.heuresGrid}>
                  {HEURES.map(h => (
                    <TouchableOpacity
                      key={h}
                      style={[s.heureChip, { borderColor: heure === h ? C.green : C.border, backgroundColor: heure === h ? C.green : C.card }]}
                      onPress={() => setHeure(h)}
                    >
                      <Text style={[s.heureText, { color: heure === h ? '#fff' : C.muted, fontWeight: heure === h ? '700' : '400' }]}>{h}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {heure && (
                  <>
                    <Text style={[s.stTitle, { marginTop: 16 }]}>Motif de consultation</Text>
                    <View style={s.motifGrid}>
                      {MOTIFS.map(m => (
                        <TouchableOpacity
                          key={m}
                          style={[s.motifChip, { borderColor: motif === m ? C.teal : C.border, backgroundColor: motif === m ? 'rgba(13,148,136,.15)' : C.card }]}
                          onPress={() => setMotif(m)}
                        >
                          <Text style={[s.motifText, { color: motif === m ? '#5EEAD4' : C.muted }]}>{m}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <Btn
                      label="Suivant →"
                      onPress={() => setStep(5)}
                      style={{ marginTop: 16 }}
                    />
                  </>
                )}
              </>
            )}
          </View>
        )}

        {/* ── ÉTAPE 5 : Confirmation ── */}
        {step === 5 && (
          <View>
            <Text style={s.stTitle}>Confirmation du rendez-vous</Text>
            <View style={s.confirmCard}>
              {[
                ['Type',     type === 'mc' ? '⭐ Médecin Conseil' : '🏥 Médecin de clinique'],
                ['Clinique', clinique?.nom || 'Médecin Conseil indépendant'],
                ['Médecin',  medecin ? `Dr. ${medecin.prenom} ${medecin.nom}` : '—'],
                ['Spécialité', medecin?.specialite || '—'],
                ['Date',     date ? new Date(date).toLocaleDateString('fr-CI', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—'],
                ['Heure',    heure],
                ['Motif',    motif || 'Non précisé'],
              ].map(([l, v]) => (
                <View key={l} style={s.confirmRow}>
                  <Text style={s.confirmLabel}>{l}</Text>
                  <Text style={s.confirmValue}>{v}</Text>
                </View>
              ))}
            </View>
            <View style={s.confirmNote}>
              <Text style={s.confirmNoteText}>
                📱 Vous recevrez un SMS de confirmation sur le numéro lié à votre compte.
              </Text>
            </View>
            <Btn
              label="🎉 Confirmer le rendez-vous"
              onPress={() => rdvMut.mutate()}
              loading={rdvMut.isPending}
              style={{ marginTop: 16 }}
            />
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  backBtn:      { marginRight: 12, padding: 4 },
  headerTitle:  { fontSize: 17, fontWeight: '800', color: C.text },
  headerSub:    { fontSize: 11, color: C.dim, marginTop: 1 },
  progressBar:  { flexDirection: 'row', gap: 4, paddingHorizontal: 16, marginBottom: 4 },
  progressStep: { flex: 1, height: 3, borderRadius: 2 },
  stTitle:      { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 16 },
  typeCard:     { borderRadius: C.rL, padding: 20, borderWidth: 1.5, marginBottom: 12, alignItems: 'center' },
  typeTitle:    { fontSize: 16, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  typeDesc:     { fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 18 },
  listCard:     { flexDirection: 'row', alignItems: 'center', borderRadius: C.r, padding: 14, borderWidth: 1, marginBottom: 10 },
  listLeft:     { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  listIcon:     { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(29,78,216,.15)', alignItems: 'center', justifyContent: 'center' },
  listTitle:    { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 3 },
  listSub:      { fontSize: 12, color: C.muted, lineHeight: 17 },
  emptyBox:     { alignItems: 'center', padding: 40, backgroundColor: C.card, borderRadius: C.r, borderWidth: 1, borderColor: C.border },
  dateChip:     { width: 62, borderRadius: C.r, borderWidth: 1, padding: 10, marginRight: 8, alignItems: 'center' },
  dateChipDay:  { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  dateChipNum:  { fontSize: 20, fontWeight: '800', lineHeight: 22 },
  dateChipMois: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', marginTop: 2 },
  heuresGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  heureChip:    { borderRadius: C.rS, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 9 },
  heureText:    { fontSize: 13 },
  motifGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  motifChip:    { borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 7 },
  motifText:    { fontSize: 12, fontWeight: '500' },
  confirmCard:  { backgroundColor: C.card, borderRadius: C.rL, padding: 20, borderWidth: 1, borderColor: 'rgba(10,143,88,.25)', borderLeftWidth: 4, borderLeftColor: C.green, marginBottom: 14 },
  confirmRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  confirmLabel: { fontSize: 12, color: C.dim, flex: 1 },
  confirmValue: { fontSize: 13, fontWeight: '600', color: C.text, flex: 2, textAlign: 'right' },
  confirmNote:  { backgroundColor: 'rgba(37,99,235,.1)', borderRadius: C.r, padding: 12, borderWidth: 1, borderColor: 'rgba(37,99,235,.2)' },
  confirmNoteText: { fontSize: 12, color: '#93C5FD', lineHeight: 18 },
});
