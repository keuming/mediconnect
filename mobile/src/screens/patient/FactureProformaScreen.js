import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { PatientAPI } from '../../config/api';
import { C, Loader, Empty, fmtMontant, fmtDate } from '../../components/UI';

export default function FactureProformaScreen({ navigation, route }) {
  const params = route.params || {};
  const commandeId = params.commandeId;

  const { data, isLoading } = useQuery({
    queryKey: ['facture-proforma', commandeId],
    queryFn:  () => PatientAPI.factureProforma(commandeId).then(function(r){ return r.data; }),
    enabled: !!commandeId,
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={s.header}>
        <TouchableOpacity onPress={navigation.goBack} style={{ marginRight: 12 }}>
          <Text style={{ fontSize: 22, color: C.muted }}>{'<-'}</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Facture proforma</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {isLoading && <Loader text="Chargement de la facture..." />}

        {!isLoading && !data && (
          <Empty icon="🧾" title="Facture en preparation" subtitle="La pharmacie n'a pas encore etabli la facture proforma. Revenez d'ici quelques minutes." />
        )}

        {data && (
          <View style={s.card}>
            <View style={s.topRow}>
              <Text style={s.ref}>Ref. {data.reference}</Text>
              <Text style={s.date}>{fmtDate(data.created_at)}</Text>
            </View>
            <Text style={s.pharma}>{data.pharmacie_nom}</Text>

            <View style={s.divider} />

            <Text style={s.sectionLbl}>Articles</Text>
            {(data.lignes_json || []).map(function(a, i){
              return (
                <View key={i} style={s.ligne}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.ligneNom}>{a.nom}</Text>
                    <Text style={s.ligneQte}>Qte : {a.quantite || 1}</Text>
                  </View>
                  <Text style={s.lignePrix}>{fmtMontant((a.prix_estime || 0) * (a.quantite || 1))}</Text>
                </View>
              );
            })}

            <View style={s.divider} />

            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Sous-total articles</Text>
              <Text style={s.totalValue}>{fmtMontant(data.montant_articles)}</Text>
            </View>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Frais de livraison</Text>
              <Text style={s.totalValue}>{fmtMontant(data.frais_livraison)}</Text>
            </View>
            <View style={[s.totalRow, { marginTop: 8, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10 }]}>
              <Text style={s.totalLabelBig}>Total a payer</Text>
              <Text style={s.totalValueBig}>{fmtMontant(data.montant_total)}</Text>
            </View>

            <View style={s.note}>
              <Text style={s.noteText}>Ceci est une facture proforma (estimation). Le montant definitif peut varier legerement selon la disponibilite des produits.</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { fontSize: 17, fontWeight: '800', color: C.text },
  card:        { backgroundColor: C.card, borderRadius: C.rL, padding: 20, borderWidth: 1, borderColor: C.border },
  topRow:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  ref:         { fontSize: 14, fontWeight: '800', color: C.greenL },
  date:        { fontSize: 12, color: C.dim },
  pharma:      { fontSize: 14, color: C.muted, marginBottom: 14 },
  divider:     { height: 1, backgroundColor: C.border, marginVertical: 14 },
  sectionLbl:  { fontSize: 11, fontWeight: '700', color: C.dim, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  ligne:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  ligneNom:    { fontSize: 14, color: C.text, fontWeight: '600' },
  ligneQte:    { fontSize: 12, color: C.dim, marginTop: 2 },
  lignePrix:   { fontSize: 13, color: C.text, fontWeight: '700' },
  totalRow:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  totalLabel:  { fontSize: 13, color: C.muted },
  totalValue:  { fontSize: 13, color: C.text, fontWeight: '600' },
  totalLabelBig: { fontSize: 15, color: C.text, fontWeight: '800' },
  totalValueBig: { fontSize: 17, color: C.greenL, fontWeight: '800' },
  note:        { backgroundColor: 'rgba(37,99,235,.1)', borderRadius: C.r, padding: 12, marginTop: 18, borderWidth: 1, borderColor: 'rgba(37,99,235,.2)' },
  noteText:    { fontSize: 12, color: '#93C5FD', lineHeight: 18 },
});
