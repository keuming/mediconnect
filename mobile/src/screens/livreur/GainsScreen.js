import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { LivreurAPI } from '../../config/api';
import { C, Card, ScreenHeader, fmtMontant, fmtDate } from '../../components/UI';

export default function LivreurGains() {
  const [montantDecaissement, setMontantDecaissement] = useState('');
  const [showDecaissement, setShowDecaissement] = useState(false);

  const { data: historique } = useQuery({
    queryKey: ['livreur-historique'],
    queryFn:  () => LivreurAPI.historique().then(r => r.data || []),
  });

  const livrees      = historique || [];
  const totalGains   = livrees.length * 1000;
  const gains_mois   = livrees.filter(c => {
    const d = new Date(c.updated_at || c.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length * 1000;

  const demanderDecaissement = () => {
    const montant = Number(montantDecaissement);
    if (!montant || montant <= 0) { Alert.alert('Erreur', 'Entrez un montant valide.'); return; }
    if (montant > gains_mois) { Alert.alert('Solde insuffisant', `Votre solde disponible est de ${fmtMontant(gains_mois)}.`); return; }
    Alert.alert(
      '💰 Demande de décaissement',
      `Vous allez décaisser ${fmtMontant(montant)} sur votre compte Mobile Money.\n\nCette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: () => {
            setMontantDecaissement('');
            setShowDecaissement(false);
            Alert.alert(
              '✅ Demande envoyée !',
              `Votre décaissement de ${fmtMontant(montant)} a été soumis. Vous recevrez les fonds sur votre Mobile Money dans les 24 heures ouvrables.`
            );
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScreenHeader title="Mes gains" subtitle="Revenus & décaissements" />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>

        {/* Résumé financier */}
        <View style={s.resumeCard}>
          <View style={s.resumeTop}>
            <Text style={s.resumeTitle}>Solde disponible</Text>
            <View style={s.resumeGreen}>
              <Text style={s.resumeVal}>{fmtMontant(gains_mois)}</Text>
            </View>
          </View>
          <View style={s.resumeStats}>
            <View style={s.resumeStat}>
              <Text style={s.resumeStatVal}>{livrees.filter(c => {
                const d = new Date(c.updated_at || c.created_at);
                const now = new Date();
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
              }).length}</Text>
              <Text style={s.resumeStatLab}>livraisons ce mois</Text>
            </View>
            <View style={[s.resumeStat, { borderLeftWidth: 1, borderLeftColor: 'rgba(74,222,128,.2)' }]}>
              <Text style={s.resumeStatVal}>{fmtMontant(1000)}</Text>
              <Text style={s.resumeStatLab}>par livraison</Text>
            </View>
            <View style={[s.resumeStat, { borderLeftWidth: 1, borderLeftColor: 'rgba(74,222,128,.2)' }]}>
              <Text style={s.resumeStatVal}>{livrees.length}</Text>
              <Text style={s.resumeStatLab}>total livraisons</Text>
            </View>
          </View>
        </View>

        {/* Décaissement */}
        <View style={s.decaissSection}>
          <Text style={s.decaissTitre}>💳 Décaisser mes gains</Text>
          <Text style={s.decaissDesc}>
            Transfert instantané vers votre Mobile Money (Wave, Orange Money, MTN MoMo)
          </Text>
          {!showDecaissement ? (
            <TouchableOpacity
              style={s.decaissBtn}
              onPress={() => setShowDecaissement(true)}
              activeOpacity={0.8}
            >
              <Text style={s.decaissBtnText}>💰 Demander un décaissement</Text>
            </TouchableOpacity>
          ) : (
            <View style={s.decaissForm}>
              <Text style={s.decaissLabel}>Montant à décaisser (FCFA)</Text>
              <View style={s.decaissRow}>
                {[gains_mois / 2, gains_mois * 0.75, gains_mois].filter(Boolean).map(v => (
                  <TouchableOpacity
                    key={v}
                    style={[s.amountChip, montantDecaissement === String(Math.round(v)) && { borderColor: C.green, backgroundColor: 'rgba(10,143,88,.15)' }]}
                    onPress={() => setMontantDecaissement(String(Math.round(v)))}
                  >
                    <Text style={[s.amountChipText, montantDecaissement === String(Math.round(v)) && { color: C.greenL }]}>
                      {fmtMontant(Math.round(v))}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={s.amountInput}
                value={montantDecaissement}
                onChangeText={setMontantDecaissement}
                placeholder="Ou entrez un montant"
                placeholderTextColor={C.dim}
                keyboardType="numeric"
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  style={[s.decaissBtn, { flex: 1, backgroundColor: 'rgba(255,255,255,.06)', borderWidth: 1, borderColor: C.border }]}
                  onPress={() => setShowDecaissement(false)}
                >
                  <Text style={{ color: C.muted, fontWeight: '600', textAlign: 'center' }}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.decaissBtn, { flex: 2 }]}
                  onPress={demanderDecaissement}
                >
                  <Text style={s.decaissBtnText}>Confirmer le décaissement</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Historique des gains */}
        {livrees.length > 0 && (
          <>
            <Text style={s.histTitre}>Historique des livraisons</Text>
            {livrees.slice(0, 20).map(cmd => (
              <View key={cmd.id} style={s.histCard}>
                <View style={{ flex: 1 }}>
                  <Text style={s.histPatient}>{cmd.patient_nom || cmd.patient_nom_full || 'Patient'}</Text>
                  <Text style={s.histDate}>{fmtDate(cmd.updated_at || cmd.created_at)}</Text>
                  {cmd.adresse_livraison && (
                    <Text style={s.histAdresse} numberOfLines={1}>📍 {cmd.adresse_livraison}</Text>
                  )}
                </View>
                <View style={s.histGains}>
                  <Text style={s.histGainsVal}>+1 000</Text>
                  <Text style={s.histGainsLab}>FCFA</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  resumeCard:     { backgroundColor: 'rgba(10,143,88,.1)', borderRadius: C.rL, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(10,143,88,.25)' },
  resumeTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  resumeTitle:    { fontSize: 14, color: C.muted, fontWeight: '600' },
  resumeGreen:    { },
  resumeVal:      { fontSize: 28, fontWeight: '800', color: C.greenL },
  resumeStats:    { flexDirection: 'row' },
  resumeStat:     { flex: 1, alignItems: 'center', paddingVertical: 8 },
  resumeStatVal:  { fontSize: 18, fontWeight: '800', color: '#4ade80', marginBottom: 2 },
  resumeStatLab:  { fontSize: 10, color: 'rgba(74,222,128,.6)', textTransform: 'uppercase', textAlign: 'center' },
  decaissSection: { backgroundColor: C.card, borderRadius: C.rL, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: C.border },
  decaissTitre:   { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 6 },
  decaissDesc:    { fontSize: 13, color: C.muted, lineHeight: 18, marginBottom: 16 },
  decaissBtn:     { backgroundColor: C.green, borderRadius: C.r, paddingVertical: 13, alignItems: 'center' },
  decaissBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  decaissForm:    { gap: 12 },
  decaissLabel:   { fontSize: 12, color: C.dim, textTransform: 'uppercase', letterSpacing: 0.5 },
  decaissRow:     { flexDirection: 'row', gap: 8 },
  amountChip:     { flex: 1, borderRadius: C.rS, borderWidth: 1, borderColor: C.border, paddingVertical: 8, alignItems: 'center', backgroundColor: C.card },
  amountChipText: { fontSize: 11, color: C.muted, fontWeight: '600' },
  amountInput:    { backgroundColor: C.input, borderRadius: C.r, paddingHorizontal: 14, paddingVertical: 12, color: C.text, fontSize: 14, borderWidth: 1, borderColor: C.border },
  histTitre:      { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 12 },
  histCard:       { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: C.r, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  histPatient:    { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 2 },
  histDate:       { fontSize: 11, color: C.dim, marginBottom: 2 },
  histAdresse:    { fontSize: 11, color: C.muted },
  histGains:      { alignItems: 'flex-end' },
  histGainsVal:   { fontSize: 18, fontWeight: '800', color: C.greenL },
  histGainsLab:   { fontSize: 10, color: C.green, fontWeight: '600' },
});
