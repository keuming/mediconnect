import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { PatientAPI } from '../../config/api';
import { C, Loader, Btn, fmtDate } from '../../components/UI';

const LABELS = {
  en_attente:   { label: 'Commande recue',        icon: '1' },
  preparation:  { label: 'En preparation',        icon: '2' },
  prete:        { label: 'Prete pour livraison',  icon: '3' },
  en_livraison: { label: 'En cours de livraison', icon: '4' },
  livree:       { label: 'Livree',                icon: '5' },
};

export default function SuiviCommandeScreen({ navigation, route }) {
  const params = route.params || {};
  const commandeId = params.commandeId;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['suivi-cmd', commandeId],
    queryFn:  () => PatientAPI.suiviCommande(commandeId).then(function(r){ return r.data; }),
    enabled: !!commandeId,
    refetchInterval: 15000,
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={s.header}>
        <TouchableOpacity onPress={navigation.goBack} style={{ marginRight: 12 }}>
          <Text style={{ fontSize: 22, color: C.muted }}>{'<-'}</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Suivi de la commande</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {isLoading && <Loader text="Chargement du suivi..." />}

        {data && data.annulee && (
          <View style={s.annuleeBox}>
            <Text style={s.annuleeText}>Cette commande a ete annulee</Text>
          </View>
        )}

        {data && !data.annulee && (
          <View>
            {data.etapes.map(function(etape, i){
              const done   = i <= data.etape_actuelle;
              const actuel = i === data.etape_actuelle;
              const info   = LABELS[etape];
              return (
                <View key={etape} style={s.stepRow}>
                  <View style={s.stepLeft}>
                    <View style={[s.stepDot, { backgroundColor: done ? C.green : C.border, borderColor: actuel ? C.greenL : 'transparent', borderWidth: actuel ? 2 : 0 }]}>
                      <Text style={{ fontSize: 12, color: '#fff', fontWeight: '700' }}>{info.icon}</Text>
                    </View>
                    {i < data.etapes.length - 1 && (
                      <View style={[s.stepLine, { backgroundColor: i < data.etape_actuelle ? C.green : C.border }]} />
                    )}
                  </View>
                  <View style={{ flex: 1, paddingBottom: 24 }}>
                    <Text style={[s.stepLabel, { color: done ? C.text : C.dim, fontWeight: actuel ? '800' : '600' }]}>
                      {info.label}
                    </Text>
                    {actuel && <Text style={s.stepNow}>Etape actuelle</Text>}
                  </View>
                </View>
              );
            })}

            <View style={s.card}>
              <Text style={s.sectionLbl}>Details</Text>
              <Text style={s.detail}>Adresse : {data.commande.adresse_livraison || '—'}</Text>
              <Text style={s.detail}>{data.commande.nombre_articles || 1} article(s)</Text>
              <Text style={s.detail}>Passee le {fmtDate(data.commande.created_at)}</Text>
            </View>

            <Btn
              label="Voir la facture proforma"
              variant="outline"
              onPress={function(){ navigation.navigate('FactureProforma', { commandeId: commandeId }); }}
              style={{ marginTop: 16 }}
            />
            <Btn
              label="Actualiser"
              variant="ghost"
              onPress={refetch}
              style={{ marginTop: 10 }}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { fontSize: 17, fontWeight: '800', color: C.text },
  stepRow:     { flexDirection: 'row' },
  stepLeft:    { alignItems: 'center', marginRight: 14 },
  stepDot:     { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  stepLine:    { width: 2, flex: 1, marginTop: 4 },
  stepLabel:   { fontSize: 14, marginTop: 4 },
  stepNow:     { fontSize: 11, color: C.greenL, fontWeight: '700', marginTop: 2 },
  card:        { backgroundColor: C.card, borderRadius: C.rL, padding: 16, borderWidth: 1, borderColor: C.border, marginTop: 8 },
  sectionLbl:  { fontSize: 11, fontWeight: '700', color: C.dim, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  detail:      { fontSize: 13, color: C.muted, marginBottom: 6 },
  annuleeBox:  { alignItems: 'center', padding: 40 },
  annuleeText: { fontSize: 15, color: C.red, fontWeight: '700' },
});
