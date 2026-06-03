import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Alert, StyleSheet, RefreshControl, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PatientAPI } from '../../config/api';
import { C, Badge, ScreenHeader, Empty, Loader, fmtDate, fmtMontant, STATUT_CMD } from '../../components/UI';

export default function PatientPharmacieScreen({ navigation }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState('commandes'); // 'commandes' | 'garde'

  const { data: commandes, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['p-cmds'],
    queryFn:  () => PatientAPI.mesCommandes().then(r => r.data || []),
  });

  const annulerMut = useMutation({
    mutationFn: (id) => PatientAPI.annulerCommande(id),
    onSuccess:  () => { qc.invalidateQueries(['p-cmds']); Alert.alert('✅', 'Commande annulée.'); },
    onError:    (e) => Alert.alert('Erreur', e.message),
  });

  const actives  = commandes?.filter(c => !['annulee','livre'].includes(c.statut)) || [];
  const livrees  = commandes?.filter(c => c.statut === 'livre') || [];

  // Pharmacies de garde fictives (en attente de la route dédiée)
  const GARDES = [
    { nom: 'Pharmacie du Plateau',     ville: 'Plateau, Abidjan',  tel: '+225 27 20 00 00 00', garde: true },
    { nom: 'Pharmacie Cocody 2000',    ville: 'Cocody, Abidjan',   tel: '+225 27 22 40 00 00', garde: true },
    { nom: 'Pharmacie Treichville',    ville: 'Treichville, Abidjan', tel: '+225 27 21 00 00 00', garde: false },
    { nom: 'Pharmacie Adjamé Santé',   ville: 'Adjamé, Abidjan',   tel: '+225 27 23 00 00 00', garde: true },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScreenHeader
        title="Pharmacie"
        subtitle="Commandes & Gardes"
        rightIcon="＋"
        onRight={() => navigation.navigate('CommandeForm')}
      />

      {/* Onglets */}
      <View style={s.tabs}>
        {[
          { k: 'commandes', l: 'Mes commandes', count: actives.length },
          { k: 'garde',     l: 'Pharmacies de garde', count: null },
        ].map(t => (
          <TouchableOpacity
            key={t.k}
            style={[s.tab, tab === t.k && s.tabActive]}
            onPress={() => setTab(t.k)}
          >
            <Text style={[s.tabText, tab === t.k && s.tabTextActive]}>{t.l}</Text>
            {t.count > 0 && (
              <View style={s.tabBadge}><Text style={s.tabBadgeText}>{t.count}</Text></View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={C.green} />}
      >

        {/* ── ONGLET : Commandes ── */}
        {tab === 'commandes' && (
          <>
            {isLoading && <Loader text="Chargement des commandes…" />}

            {!isLoading && !commandes?.length && (
              <Empty icon="💊" title="Aucune commande" subtitle="Passez votre première commande de médicaments en appuyant sur ＋" />
            )}

            {actives.length > 0 && (
              <>
                <Text style={s.sectionLbl}>En cours ({actives.length})</Text>
                {actives.map(cmd => {
                  const statut = STATUT_CMD[cmd.statut] || STATUT_CMD.en_attente;
                  return (
                    <View key={cmd.id} style={s.cmdCard}>
                      <View style={s.cmdTop}>
                        <Text style={{ fontSize: 26 }}>{statut.icon}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={s.cmdRef}>Commande #{cmd.id?.slice(-6).toUpperCase()}</Text>
                          <Text style={s.cmdDate}>{fmtDate(cmd.created_at)}</Text>
                        </View>
                        <Badge label={statut.label} color={statut.color} />
                      </View>
                      <View style={s.cmdInfo}>
                        <Text style={s.cmdInfoText}>📦 {cmd.nombre_articles || 1} article(s)</Text>
                        <Text style={s.cmdInfoText}>💰 {fmtMontant(cmd.frais_livraison)} livraison</Text>
                      </View>
                      {cmd.adresse_livraison && (
                        <Text style={s.cmdAdresse}>📍 {cmd.adresse_livraison}</Text>
                      )}
                      {['en_attente'].includes(cmd.statut) && (
                        <TouchableOpacity
                          style={s.annulerBtn}
                          onPress={() => Alert.alert('Annuler ?', 'Annuler cette commande ?', [
                            { text: 'Non', style: 'cancel' },
                            { text: 'Oui', style: 'destructive', onPress: () => annulerMut.mutate(cmd.id) },
                          ])}
                        >
                          <Text style={s.annulerText}>Annuler la commande</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </>
            )}

            {livrees.length > 0 && (
              <>
                <Text style={[s.sectionLbl, { marginTop: 16 }]}>Historique ({livrees.length})</Text>
                {livrees.slice(0, 5).map(cmd => (
                  <View key={cmd.id} style={[s.cmdCard, { opacity: 0.65 }]}>
                    <View style={s.cmdTop}>
                      <Text style={{ fontSize: 22 }}>📦</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={s.cmdRef}>Commande #{cmd.id?.slice(-6).toUpperCase()}</Text>
                        <Text style={s.cmdDate}>{fmtDate(cmd.updated_at)}</Text>
                      </View>
                      <Badge label="Livrée" color="teal" />
                    </View>
                  </View>
                ))}
              </>
            )}

            {/* FAB Commander */}
            <TouchableOpacity
              style={s.fab}
              onPress={() => navigation.navigate('CommandeForm')}
              activeOpacity={0.85}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>💊 Commander des médicaments</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── ONGLET : Pharmacies de garde ── */}
        {tab === 'garde' && (
          <>
            <View style={s.gardeAlert}>
              <Text style={{ fontSize: 18, marginRight: 10 }}>🚨</Text>
              <Text style={s.gardeAlertText}>
                Pharmacies ouvertes 24h/24 · Actualisé en temps réel
              </Text>
            </View>
            {GARDES.map((p, i) => (
              <View key={i} style={s.gardeCard}>
                <View style={s.gardeLeft}>
                  <View style={[s.gardeIconBox, { backgroundColor: p.garde ? 'rgba(10,143,88,.15)' : 'rgba(255,255,255,.05)' }]}>
                    <Text style={{ fontSize: 24 }}>💊</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <Text style={s.gardeNom}>{p.nom}</Text>
                      {p.garde && <Badge label="GARDE" color="green" size="sm" />}
                    </View>
                    <Text style={s.gardeVille}>{p.ville}</Text>
                    <Text style={s.gardeTel}>{p.tel}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={s.appelBtn}
                  onPress={() => Alert.alert('Appel', `Appeler ${p.nom} ?`)}
                >
                  <Text style={{ color: C.greenL, fontSize: 18 }}>📞</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  tabs:         { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  tab:          { flex: 1, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 20, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  tabActive:    { backgroundColor: 'rgba(10,143,88,.15)', borderColor: C.green },
  tabText:      { fontSize: 12, color: C.muted, fontWeight: '500' },
  tabTextActive:{ color: C.greenL, fontWeight: '700' },
  tabBadge:     { backgroundColor: C.red, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  tabBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  sectionLbl:   { fontSize: 12, fontWeight: '700', color: C.dim, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  cmdCard:      { backgroundColor: C.card, borderRadius: C.rL, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  cmdTop:       { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  cmdRef:       { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 2 },
  cmdDate:      { fontSize: 11, color: C.dim },
  cmdInfo:      { flexDirection: 'row', gap: 16, marginBottom: 6 },
  cmdInfoText:  { fontSize: 12, color: C.muted },
  cmdAdresse:   { fontSize: 12, color: C.dim, marginTop: 4 },
  annulerBtn:   { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border, alignItems: 'center' },
  annulerText:  { fontSize: 13, color: C.red, fontWeight: '600' },
  fab:          { backgroundColor: C.green, borderRadius: C.rL, padding: 16, alignItems: 'center', marginTop: 16, shadowColor: C.green, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12 },
  gardeAlert:   { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(225,29,72,.1)', borderRadius: C.r, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(225,29,72,.25)' },
  gardeAlertText:{ fontSize: 13, color: '#FDA4AF', flex: 1, lineHeight: 18 },
  gardeCard:    { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: C.r, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  gardeLeft:    { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  gardeIconBox: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  gardeNom:     { fontSize: 14, fontWeight: '700', color: C.text },
  gardeVille:   { fontSize: 12, color: C.muted, marginBottom: 2 },
  gardeTel:     { fontSize: 12, color: C.dim },
  appelBtn:     { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(10,143,88,.15)', alignItems: 'center', justifyContent: 'center' },
});
