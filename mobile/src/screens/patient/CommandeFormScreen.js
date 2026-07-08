import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Alert, Image, ActivityIndicator, StyleSheet, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PatientAPI } from '../../config/api';
import { C, Btn, Loader } from '../../components/UI';

const STEPS = ['Ordonnance', 'Pharmacie', 'Livraison', 'Confirmation'];

export default function CommandeFormScreen({ navigation }) {
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [image, setImage] = useState(null);
  const [ordonnanceId, setOrdonnanceId] = useState(null);
  const [pharmacie, setPharmacie] = useState(null);
  const [adresse, setAdresse] = useState('');
  const [notes, setNotes] = useState('');

  const { data: pharmacies, isLoading: ldPh } = useQuery({
    queryKey: ['pharmacies-toutes'],
    queryFn:  () => PatientAPI.pharmaciesToutes().then(r => r.data || []),
    enabled: step === 2,
  });

  const pickImage = async (fromCamera) => {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission requise', "Autorisez l'acces pour continuer.");
      return;
    }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.5 })
      : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.5 });
    if (!result.canceled && result.assets && result.assets[0]) {
      const a = result.assets[0];
      setImage({
        uri: a.uri,
        base64: a.base64,
        mimeType: a.mimeType || 'image/jpeg',
        fileName: a.fileName || 'ordonnance.jpg',
      });
    }
  };

  const uploadMut = useMutation({
    mutationFn: () => PatientAPI.uploaderOrdonnance({
      fichier_data: `data:${image.mimeType};base64,${image.base64}`,
      fichier_type: image.mimeType,
      fichier_nom: image.fileName,
    }),
    onSuccess: (r) => {
      if (r.success) { setOrdonnanceId(r.data.id); setStep(2); }
      else Alert.alert('Erreur', r.message);
    },
    onError: (e) => Alert.alert('Erreur', e.message),
  });

  const commandeMut = useMutation({
    mutationFn: () => PatientAPI.commanderMedicament({
      ordonnance_id: ordonnanceId,
      pharmacie_id: pharmacie ? pharmacie.id : null,
      pharmacie_nom: pharmacie ? pharmacie.nom : null,
      adresse_livraison: adresse,
      notes,
    }),
    onSuccess: (r) => {
      if (r.success) {
        qc.invalidateQueries(['p-cmds']);
        Alert.alert(
          'Commande envoyee !',
          'Votre pharmacie va preparer votre facture proforma. Vous pouvez la consulter dans le suivi de votre commande.',
          [{ text: 'Voir la facture', onPress: () => navigation.replace('FactureProforma', { commandeId: r.data.commande.id }) }]
        );
      } else Alert.alert('Erreur', r.message);
    },
    onError: (e) => Alert.alert('Erreur', e.message),
  });

  const back = () => step > 1 ? setStep(function(s){ return s - 1; }) : navigation.goBack();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={s.header}>
        <TouchableOpacity onPress={back} style={{ marginRight: 12 }}>
          <Text style={{ fontSize: 22, color: C.muted }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Commander des medicaments</Text>
          <Text style={s.headerSub}>Etape {step} / {STEPS.length} — {STEPS[step - 1]}</Text>
        </View>
      </View>
      <View style={s.progressBar}>
        {STEPS.map((_, i) => (
          <View key={i} style={[s.progressStep, { backgroundColor: i < step ? C.green : C.border }]} />
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">

        {step === 1 && (
          <View>
            <Text style={s.stTitle}>Envoyez une photo de votre ordonnance</Text>
            <Text style={s.stSub}>La pharmacie utilisera cette ordonnance pour preparer votre commande et etablir la facture proforma.</Text>

            {image ? (
              <View style={s.imgPreviewBox}>
                <Image source={{ uri: image.uri }} style={s.imgPreview} resizeMode="cover" />
                <TouchableOpacity style={s.imgRemove} onPress={() => setImage(null)}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Changer</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                <TouchableOpacity style={s.pickBtn} onPress={() => pickImage(true)}>
                  <Text style={{ fontSize: 28, marginBottom: 6 }}>Camera</Text>
                  <Text style={s.pickBtnText}>Prendre une photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.pickBtn} onPress={() => pickImage(false)}>
                  <Text style={{ fontSize: 28, marginBottom: 6 }}>Galerie</Text>
                  <Text style={s.pickBtnText}>Choisir depuis la galerie</Text>
                </TouchableOpacity>
              </View>
            )}

            {image && (
              <Btn
                label="Envoyer l'ordonnance"
                onPress={() => uploadMut.mutate()}
                loading={uploadMut.isPending}
                style={{ marginTop: 20 }}
              />
            )}
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={s.stTitle}>Choisissez une pharmacie</Text>
            {ldPh && <Loader text="Chargement des pharmacies…" />}
            {!ldPh && !(pharmacies && pharmacies.length) && (
              <Text style={{ color: C.dim, textAlign: 'center', padding: 20 }}>Aucune pharmacie disponible pour le moment.</Text>
            )}
            {(pharmacies || []).map(ph => (
              <TouchableOpacity
                key={ph.id}
                style={[s.listCard, { borderColor: pharmacie && pharmacie.id === ph.id ? C.green : C.border, backgroundColor: pharmacie && pharmacie.id === ph.id ? 'rgba(10,143,88,.1)' : C.card }]}
                onPress={() => { setPharmacie(ph); setStep(3); }}
              >
                <View style={s.listIcon}><Text style={{ fontSize: 22 }}>Rx</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.listTitle}>{ph.nom}</Text>
                  <Text style={s.listSub}>{ph.ville || '—'}</Text>
                  {ph.est_garde && <Text style={{ color: C.greenL, fontSize: 11, fontWeight: '700', marginTop: 2 }}>Pharmacie de garde</Text>}
                </View>
                {pharmacie && pharmacie.id === ph.id && <Text style={{ color: C.greenL, fontSize: 20 }}>OK</Text>}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {step === 3 && (
          <View>
            <Text style={s.stTitle}>Adresse de livraison</Text>
            <TextInput
              value={adresse}
              onChangeText={setAdresse}
              placeholder="Ex : Cocody Angre, Rue des Jardins, Villa 12"
              placeholderTextColor={C.dim}
              multiline
              numberOfLines={3}
              style={s.textArea}
            />
            <Text style={[s.stTitle, { marginTop: 20 }]}>Notes complementaires (optionnel)</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Ex : Appartement au 2e etage, code portail 1234"
              placeholderTextColor={C.dim}
              multiline
              numberOfLines={2}
              style={s.textArea}
            />
            <Btn
              label="Suivant"
              onPress={() => adresse.trim() ? setStep(4) : Alert.alert('Adresse requise', 'Merci de saisir une adresse de livraison.')}
              style={{ marginTop: 20 }}
            />
          </View>
        )}

        {step === 4 && (
          <View>
            <Text style={s.stTitle}>Confirmez votre commande</Text>
            <View style={s.confirmCard}>
              {[
                ['Ordonnance', image ? 'Fichier joint' : '—'],
                ['Pharmacie',  pharmacie ? pharmacie.nom : '—'],
                ['Adresse',    adresse || '—'],
                ['Notes',      notes || 'Aucune'],
              ].map(function(pair){
                const l = pair[0], v = pair[1];
                return (
                  <View key={l} style={s.confirmRow}>
                    <Text style={s.confirmLabel}>{l}</Text>
                    <Text style={s.confirmValue}>{v}</Text>
                  </View>
                );
              })}
            </View>
            <View style={s.confirmNote}>
              <Text style={s.confirmNoteText}>
                Apres validation, la pharmacie etablira une facture proforma que vous pourrez consulter avant paiement.
              </Text>
            </View>
            <Btn
              label="Confirmer la commande"
              onPress={() => commandeMut.mutate()}
              loading={commandeMut.isPending}
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
  headerTitle:  { fontSize: 17, fontWeight: '800', color: C.text },
  headerSub:    { fontSize: 11, color: C.dim, marginTop: 1 },
  progressBar:  { flexDirection: 'row', gap: 4, paddingHorizontal: 16, marginBottom: 4 },
  progressStep: { flex: 1, height: 3, borderRadius: 2 },
  stTitle:      { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 10 },
  stSub:        { fontSize: 13, color: C.muted, marginBottom: 18, lineHeight: 19 },
  pickBtn:      { backgroundColor: C.card, borderRadius: C.rL, borderWidth: 1, borderColor: C.border, padding: 24, alignItems: 'center' },
  pickBtnText:  { color: C.text, fontWeight: '700', fontSize: 14 },
  imgPreviewBox:{ borderRadius: C.rL, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  imgPreview:   { width: '100%', height: 260, backgroundColor: C.card },
  imgRemove:    { position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(0,0,0,.6)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  listCard:     { flexDirection: 'row', alignItems: 'center', borderRadius: C.r, padding: 14, borderWidth: 1, marginBottom: 10 },
  listIcon:     { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(10,143,88,.15)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  listTitle:    { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 3 },
  listSub:      { fontSize: 12, color: C.muted },
  textArea:     { backgroundColor: C.input, borderRadius: C.r, padding: 14, color: C.text, fontSize: 14, borderWidth: 1, borderColor: C.border, minHeight: 80, textAlignVertical: 'top' },
  confirmCard:  { backgroundColor: C.card, borderRadius: C.rL, padding: 20, borderWidth: 1, borderColor: 'rgba(10,143,88,.25)', borderLeftWidth: 4, borderLeftColor: C.green, marginBottom: 14 },
  confirmRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  confirmLabel: { fontSize: 12, color: C.dim, flex: 1 },
  confirmValue: { fontSize: 13, fontWeight: '600', color: C.text, flex: 2, textAlign: 'right' },
  confirmNote:  { backgroundColor: 'rgba(37,99,235,.1)', borderRadius: C.r, padding: 12, borderWidth: 1, borderColor: 'rgba(37,99,235,.2)' },
  confirmNoteText: { fontSize: 12, color: '#93C5FD', lineHeight: 18 },
});
