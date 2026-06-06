// ══════════════════════════════════════════════════════════════════
// PATIENT — Dossier médical + Plus
// ══════════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { PatientAPI } from '../../config/api';
import { C, Card, Badge, ScreenHeader, Empty, Loader, fmtDate } from '../../components/UI';
import { getPaysInfo } from '../../utils/geoAfrique';

// ── Dossier Médical ───────────────────────────────────────────────
export function DossierScreen() {
  const { user } = useAuthStore();
  const { data, isFetching, refetch } = useQuery({
    queryKey: ['patient-dossier'],
    queryFn:  () => PatientAPI.monDossier(),
  });
  const { data: consultsData } = useQuery({
    queryKey: ['patient-consults'],
    queryFn:  () => PatientAPI.mesConsultations(),
  });
  const { data: ordsData } = useQuery({
    queryKey: ['patient-ordonnances'],
    queryFn:  () => PatientAPI.mesOrdonnances(),
  });

  const dossier  = data?.data || {};
  const consults = consultsData?.data || [];
  const ords     = ordsData?.data || [];
  const paysInfo = getPaysInfo(user?.pays_code || 'CI');

  const INFOS_VITALES = [
    ['🩸 Groupe sanguin', dossier.groupe_sanguin || user?.groupe_sanguin],
    ['⚠️ Allergies',      dossier.allergies || 'Aucune connue'],
    ['📋 Antécédents',    dossier.antecedents || 'Aucun renseigné'],
    ['🛡️ Assurance',      dossier.assurance || user?.assurance || 'Non renseignée'],
    ['🌍 Pays',           paysInfo?.nom || user?.pays_code],
    ['📍 Ville',          dossier.ville || user?.ville],
  ];

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:C.bg }}>
      <ScreenHeader title="📋 Mon Dossier" subtitle="Informations médicales & historique" />
      <ScrollView contentContainerStyle={{ padding:16 }}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={C.green} />}
        showsVerticalScrollIndicator={false}>

        {/* Infos vitales */}
        <Card style={{ marginBottom:12 }}>
          <Text style={{ color:C.text, fontWeight:'800', fontSize:14, marginBottom:12 }}>🏥 Informations vitales</Text>
          {INFOS_VITALES.map(([label, value]) => value && (
            <View key={label} style={{ flexDirection:'row', justifyContent:'space-between', paddingVertical:8, borderBottomWidth:1, borderBottomColor:`${C.border}40` }}>
              <Text style={{ color:C.muted, fontSize:13 }}>{label}</Text>
              <Text style={{ color:C.text, fontSize:13, fontWeight:'600', maxWidth:'55%', textAlign:'right' }}>{value}</Text>
            </View>
          ))}
        </Card>

        {/* Dernières consultations */}
        <Text style={{ color:C.text, fontWeight:'800', fontSize:14, marginBottom:10 }}>🩺 Dernières consultations</Text>
        {consults.length === 0
          ? <Empty icon="🩺" title="Aucune consultation" subtitle="Vos consultations apparaîtront ici" />
          : consults.slice(0,5).map(c => (
            <Card key={c.id} style={{ marginBottom:8 }}>
              <Text style={{ color:C.text, fontWeight:'600', fontSize:13 }}>{c.diagnostic?.slice(0,60)}</Text>
              <Text style={{ color:C.dim, fontSize:11, marginTop:3 }}>{fmtDate(c.created_at)}</Text>
              {c.traitement && <Text style={{ color:C.muted, fontSize:11, marginTop:2 }}>💊 {c.traitement?.slice(0,60)}</Text>}
            </Card>
          ))
        }

        {/* Ordonnances actives */}
        <Text style={{ color:C.text, fontWeight:'800', fontSize:14, marginBottom:10, marginTop:8 }}>💊 Ordonnances actives</Text>
        {ords.filter(o=>o.statut==='active').length === 0
          ? <Empty icon="💊" title="Aucune ordonnance active" subtitle="" />
          : ords.filter(o=>o.statut==='active').slice(0,3).map(o => (
            <Card key={o.id} style={{ marginBottom:8 }}>
              <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:4 }}>
                <Text style={{ color:C.greenL, fontWeight:'700', fontSize:12 }}>Active</Text>
                <Text style={{ color:C.dim, fontSize:11 }}>{fmtDate(o.created_at)}</Text>
              </View>
              <Text style={{ color:C.text, fontSize:13 }}>{o.medicaments?.slice(0,80)}</Text>
              {o.posologie && <Text style={{ color:C.muted, fontSize:11, marginTop:3 }}>📋 {o.posologie}</Text>}
            </Card>
          ))
        }
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Plus de services ──────────────────────────────────────────────
export function PlusScreen({ navigation }) {
  const { user, logout } = useAuthStore();
  const paysInfo = getPaysInfo(user?.pays_code || 'CI');

  const SERVICES = [
    { icon:'💳', label:'MediConnect Card',    sub:'Lier ma carte & gérer mon solde', screen:'Card',      color:C.green  },
    { icon:'⭐', label:'Médecins Indépendants',sub:'Trouvez votre médecin de famille', screen:'MedecinsPrives', color:C.purple },
    { icon:'🔍', label:'Trouver une clinique', sub:'Cliniques & spécialités',          screen:'Cliniques', color:C.blue   },
    { icon:'🛡️', label:'Mes assurances',       sub:'Dossiers tiers-payant',           screen:'Assurances',color:C.amber  },
    { icon:'🧾', label:'Mes factures',         sub:'Historique des paiements',         screen:'Factures',  color:C.teal   },
  ];

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:C.bg }}>
      <View style={{ paddingHorizontal:16, paddingTop:16, paddingBottom:12, borderBottomWidth:1, borderBottomColor:C.border }}>
        <Text style={{ color:C.text, fontSize:17, fontWeight:'800' }}>Plus de services</Text>
        <Text style={{ color:C.dim, fontSize:12, marginTop:2 }}>
          {paysInfo?.nom || user?.pays_code} {user?.ville ? `· ${user.ville}` : ''}
        </Text>
      </View>
      <ScrollView contentContainerStyle={{ padding:16 }}>

        {/* Profil rapide */}
        <View style={{ backgroundColor:C.card, borderRadius:14, padding:14, borderWidth:1, borderColor:C.border, flexDirection:'row', alignItems:'center', gap:12, marginBottom:16 }}>
          <View style={{ width:48, height:48, borderRadius:24, backgroundColor:`${C.green}20`, alignItems:'center', justifyContent:'center' }}>
            <Text style={{ fontSize:22 }}>👤</Text>
          </View>
          <View style={{ flex:1 }}>
            <Text style={{ color:C.text, fontWeight:'700', fontSize:14 }}>{user?.prenom} {user?.nom}</Text>
            <Text style={{ color:C.muted, fontSize:12, marginTop:1 }}>{user?.email}</Text>
            <Text style={{ color:C.greenL, fontSize:11, marginTop:1 }}>{paysInfo?.nom} {user?.ville?`· ${user.ville}`:''}</Text>
          </View>
        </View>

        {/* Services */}
        {SERVICES.map(s => (
          <TouchableOpacity key={s.screen} onPress={() => navigation.navigate(s.screen)}
            style={{ backgroundColor:C.card, borderRadius:12, padding:14, borderWidth:1, borderColor:C.border, flexDirection:'row', alignItems:'center', gap:12, marginBottom:10 }}>
            <View style={{ width:44, height:44, borderRadius:12, backgroundColor:`${s.color}18`, alignItems:'center', justifyContent:'center' }}>
              <Text style={{ fontSize:22 }}>{s.icon}</Text>
            </View>
            <View style={{ flex:1 }}>
              <Text style={{ color:C.text, fontWeight:'700', fontSize:14 }}>{s.label}</Text>
              <Text style={{ color:C.dim, fontSize:12, marginTop:1 }}>{s.sub}</Text>
            </View>
            <Text style={{ color:s.color, fontSize:16 }}>→</Text>
          </TouchableOpacity>
        ))}

        {/* Version web */}
        <TouchableOpacity onPress={() => Linking.openURL('https://mediconnect4africa.cloud')}
          style={{ backgroundColor:`${C.green}10`, borderRadius:12, padding:14, borderWidth:1, borderColor:`${C.green}25`, alignItems:'center', marginTop:4, marginBottom:16 }}>
          <Text style={{ color:C.greenL, fontWeight:'700', fontSize:13 }}>🌐 Accéder à la version web complète</Text>
          <Text style={{ color:C.dim, fontSize:11, marginTop:3 }}>mediconnect4africa.cloud</Text>
        </TouchableOpacity>

        {/* Déconnexion */}
        <TouchableOpacity onPress={logout}
          style={{ backgroundColor:`${C.red}12`, borderRadius:12, padding:14, borderWidth:1, borderColor:`${C.red}25`, alignItems:'center', marginBottom:30 }}>
          <Text style={{ color:C.red, fontWeight:'700', fontSize:13 }}>🚪 Déconnexion</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
