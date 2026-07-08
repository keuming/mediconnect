import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, StyleSheet, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { PatientAPI } from '../../config/api';
import { C, Badge, Loader, Empty } from '../../components/UI';

const SUGGESTIONS = ['Cardiologie', 'Pediatrie', 'Gynecologie', 'Dermatologie', 'Ophtalmologie', 'ORL', 'Dentisterie', 'Chirurgie'];

export default function RechercheSpecialiteScreen({ navigation }) {
  const [query, setQuery]   = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['recherche-specialite', search],
    queryFn:  () => PatientAPI.rechercheSpecialite(search).then(function(r){ return r.data; }),
    enabled: search.trim().length >= 2,
  });

  const cliniquesResult      = (data && data.cliniques_mediconnect) || [];
  const etablissementsResult = (data && data.etablissements_publics) || [];
  const total = cliniquesResult.length + etablissementsResult.length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={s.header}>
        <TouchableOpacity onPress={navigation.goBack} style={{ marginRight: 12 }}>
          <Text style={{ fontSize: 22, color: C.muted }}>{'<-'}</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Rechercher par specialite</Text>
      </View>

      <View style={{ padding: 16 }}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={function(){ setSearch(query); }}
          placeholder="Ex : Cardiologie, Pediatrie..."
          placeholderTextColor={C.dim}
          returnKeyType="search"
          style={s.input}
        />
        <View style={s.suggWrap}>
          {SUGGESTIONS.map(function(sug){
            return (
              <TouchableOpacity key={sug} style={s.suggChip} onPress={function(){ setQuery(sug); setSearch(sug); }}>
                <Text style={s.suggText}>{sug}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 0, paddingBottom: 40 }}>
        {search.trim().length < 2 && (
          <Empty icon="🔍" title="Recherchez une specialite" subtitle="Tapez le nom d'une specialite medicale pour voir les cliniques et hopitaux qui la pratiquent." />
        )}

        {(isLoading || isFetching) && search.trim().length >= 2 && <Loader text="Recherche en cours..." />}

        {!isLoading && search.trim().length >= 2 && total === 0 && (
          <Empty icon="😕" title="Aucun resultat" subtitle={"Aucun etablissement ne pratique '" + search + "' pour le moment."} />
        )}

        {cliniquesResult.length > 0 && (
          <View>
            <Text style={s.sectionLbl}>Cliniques MediConnect ({cliniquesResult.length})</Text>
            {cliniquesResult.map(function(c, i){
              return (
                <TouchableOpacity
                  key={c.id + '-' + i}
                  style={s.card}
                  onPress={function(){ navigation.navigate('ClinicDetail', { clinique: c }); }}
                >
                  <View style={s.cardTop}>
                    <View style={s.icon}><Text style={{ fontSize: 20 }}>C</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.cardTitle}>{c.nom}</Text>
                      <Text style={s.cardSub}>{c.ville || '—'}</Text>
                    </View>
                    <Badge label="MediConnect" color="green" size="sm" />
                  </View>
                  <View style={s.specBox}>
                    <Text style={s.specText}>{c.specialite}</Text>
                    {c.tarif_consultation && <Text style={s.tarifText}>{Number(c.tarif_consultation).toLocaleString('fr-CI')} FCFA</Text>}
                  </View>
                  {c.telephone && (
                    <TouchableOpacity style={s.callBtn} onPress={function(){ Linking.openURL('tel:' + c.telephone); }}>
                      <Text style={s.callText}>{c.telephone}</Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {etablissementsResult.length > 0 && (
          <View>
            <Text style={[s.sectionLbl, { marginTop: 16 }]}>Etablissements publics ({etablissementsResult.length})</Text>
            {etablissementsResult.map(function(e, i){
              return (
                <View key={e.id + '-' + i} style={s.card}>
                  <View style={s.cardTop}>
                    <View style={[s.icon, { backgroundColor: 'rgba(37,99,235,.15)' }]}><Text style={{ fontSize: 20 }}>P</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.cardTitle}>{e.nom}</Text>
                      <Text style={s.cardSub}>{(e.ville || '—') + ' · ' + (e.type || 'Etablissement')}</Text>
                    </View>
                    <Badge label="Public" color="blue" size="sm" />
                  </View>
                  <View style={s.specBox}>
                    <Text style={s.specText} numberOfLines={2}>{e.specialites}</Text>
                  </View>
                  {e.telephone && (
                    <TouchableOpacity style={s.callBtn} onPress={function(){ Linking.openURL('tel:' + e.telephone); }}>
                      <Text style={s.callText}>{e.telephone}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { fontSize: 17, fontWeight: '800', color: C.text },
  input:       { backgroundColor: C.input, borderRadius: C.r, paddingHorizontal: 14, paddingVertical: 12, color: C.text, fontSize: 14, borderWidth: 1, borderColor: C.border, marginBottom: 12 },
  suggWrap:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggChip:    { backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, paddingVertical: 6 },
  suggText:    { fontSize: 12, color: C.muted, fontWeight: '600' },
  sectionLbl:  { fontSize: 12, fontWeight: '700', color: C.dim, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  card:        { backgroundColor: C.card, borderRadius: C.rL, padding: 16, borderWidth: 1, borderColor: C.border, marginBottom: 12 },
  cardTop:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  icon:        { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(10,143,88,.15)', alignItems: 'center', justifyContent: 'center' },
  cardTitle:   { fontSize: 14, fontWeight: '700', color: C.text },
  cardSub:     { fontSize: 12, color: C.muted, marginTop: 2 },
  specBox:     { backgroundColor: 'rgba(255,255,255,.04)', borderRadius: C.rS, padding: 10, marginBottom: 8 },
  specText:    { fontSize: 13, color: C.text, fontWeight: '600' },
  tarifText:   { fontSize: 12, color: C.greenL, marginTop: 4 },
  callBtn:     { alignSelf: 'flex-start' },
  callText:    { fontSize: 13, color: C.greenL, fontWeight: '600' },
});
