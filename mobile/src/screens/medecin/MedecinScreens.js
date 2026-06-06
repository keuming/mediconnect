// ══════════════════════════════════════════════════════════════════
// MÉDECIN CONSEIL & RÉSIDENT — Écrans
// ══════════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  RefreshControl, Alert, TextInput, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { MedecinAPI } from '../../config/api';
import { C, Card, Badge, SectionTitle, ScreenHeader, StatCard, Empty, Loader, fmtDate, fmtMontant } from '../../components/UI';

// ── Accueil Médecin ───────────────────────────────────────────────
export function AccueilMedecinScreen({ navigation }) {
  const { user, logout } = useAuthStore();
  const today = new Date().toISOString().split('T')[0];

  const { data: statsData, refetch: refStats, isFetching } = useQuery({
    queryKey: ['medecin-stats'],
    queryFn:  () => MedecinAPI.stats(),
  });
  const { data: rdvsData, refetch: refRdvs } = useQuery({
    queryKey: ['medecin-rdvs-today', today],
    queryFn:  () => MedecinAPI.mesRdvs(today),
  });

  const stats = statsData?.data || {};
  const rdvsAujourdHui = rdvsData?.data || [];
  const refresh = () => { refStats(); refRdvs(); };

  const ACTIONS = [
    { icon:'📅', label:'Mon planning',   color:C.green,  screen:'Planning' },
    { icon:'👥', label:'Mes patients',   color:C.blue,   screen:'Patients' },
    { icon:'📝', label:'Consultations',  color:C.purple, screen:'Consultations' },
    { icon:'💊', label:'Ordonnances',    color:C.teal,   screen:'Ordonnances' },
  ];

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:C.bg }}>
      <ScrollView
        contentContainerStyle={{ padding:16 }}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refresh} tintColor={C.green} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <View>
            <Text style={{ color:C.dim, fontSize:12 }}>Bonjour Dr.</Text>
            <Text style={{ color:C.text, fontSize:20, fontWeight:'900' }}>{user?.prenom} {user?.nom}</Text>
            <Text style={{ color:C.greenL, fontSize:11, fontWeight:'700', marginTop:2 }}>
              {user?.role === 'medecin' ? '🏥 Médecin Résident' : '⭐ Médecin Conseil'}
            </Text>
          </View>
          <TouchableOpacity onPress={logout} style={{ backgroundColor:`${C.red}15`, borderRadius:10, padding:8 }}>
            <Text style={{ fontSize:18 }}>⏻</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={{ flexDirection:'row', gap:10, marginBottom:16 }}>
          <StatCard icon="📅" value={stats.rdv_aujourd_hui || 0}     label="RDV aujourd'hui" color={C.greenL} style={{flex:1}}/>
          <StatCard icon="📆" value={stats.rdv_ce_mois || 0}         label="Ce mois"          color={C.blueL}  style={{flex:1}}/>
          <StatCard icon="🩺" value={stats.consultations_total || 0} label="Consultations"    color={C.purple} style={{flex:1}}/>
        </View>

        {/* Actions rapides */}
        <SectionTitle title="Actions rapides" icon="⚡" />
        <View style={{ flexDirection:'row', flexWrap:'wrap', gap:10, marginBottom:20 }}>
          {ACTIONS.map(a => (
            <TouchableOpacity key={a.screen} onPress={() => navigation.navigate(a.screen)}
              style={{ width:'47%', backgroundColor:`${a.color}15`, borderRadius:12, padding:14, borderWidth:1, borderColor:`${a.color}30` }}>
              <Text style={{ fontSize:24, marginBottom:6 }}>{a.icon}</Text>
              <Text style={{ color:a.color, fontWeight:'700', fontSize:13 }}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* RDV du jour */}
        <SectionTitle title={`RDV d'aujourd'hui (${rdvsAujourdHui.length})`} icon="📅" />
        {rdvsAujourdHui.length === 0
          ? <Empty icon="📅" title="Aucun RDV aujourd'hui" subtitle="Votre agenda est libre" />
          : rdvsAujourdHui.map(rdv => (
            <Card key={rdv.id} style={{ marginBottom:10 }} onPress={() => navigation.navigate('NouvelleConsultation', { rdv })}>
              <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start' }}>
                <View style={{ flex:1 }}>
                  <Text style={{ color:C.text, fontWeight:'700', fontSize:14 }}>{rdv.patient_nom || 'Patient'}</Text>
                  <Text style={{ color:C.muted, fontSize:12, marginTop:2 }}>🕐 {rdv.heure_rdv?.slice(0,5)}</Text>
                  {rdv.motif && <Text style={{ color:C.dim, fontSize:11, marginTop:2 }}>{rdv.motif}</Text>}
                </View>
                <View style={{ alignItems:'flex-end', gap:6 }}>
                  <Badge label={rdv.statut} color={rdv.statut==='en_attente'?'amber':rdv.statut==='confirme'?'green':'gray'} size="sm"/>
                  {rdv.statut !== 'termine' && (
                    <Text style={{ color:C.greenL, fontSize:11, fontWeight:'700' }}>→ Consulter</Text>
                  )}
                </View>
              </View>
            </Card>
          ))
        }
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Planning / Disponibilités ─────────────────────────────────────
export function PlanningScreen() {
  const now = new Date();
  const [mois, setMois]     = useState(now.getMonth() + 1);
  const [annee, setAnnee]   = useState(now.getFullYear());
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm]     = useState({ date:'', heure_debut:'', heure_fin:'17:00' });
  const qc = useQueryClient();

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['planning', mois, annee],
    queryFn:  () => MedecinAPI.disponibilites(mois, annee),
  });
  const dispos = data?.data || [];

  const addMut = useMutation({
    mutationFn: (d) => MedecinAPI.ajouterDispo(d),
    onSuccess: () => { qc.invalidateQueries(['planning']); setShowAdd(false); setForm({date:'',heure_debut:'',heure_fin:'17:00'}); Alert.alert('✅','Créneau ajouté !'); },
    onError: (e) => Alert.alert('Erreur', e.message),
  });
  const delMut = useMutation({
    mutationFn: (id) => MedecinAPI.supprimerDispo(id),
    onSuccess: () => qc.invalidateQueries(['planning']),
  });

  const MOIS_FR = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:C.bg }}>
      <ScreenHeader title="📅 Mon Planning" subtitle={`${MOIS_FR[mois-1]} ${annee}`}
        rightIcon="➕" onRight={() => setShowAdd(true)} />

      {/* Navigation mois */}
      <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'center', gap:20, padding:12, borderBottomWidth:1, borderBottomColor:C.border }}>
        <TouchableOpacity onPress={() => { if (mois===1){setMois(12);setAnnee(a=>a-1);}else setMois(m=>m-1); }}>
          <Text style={{ color:C.muted, fontSize:22 }}>‹</Text>
        </TouchableOpacity>
        <Text style={{ color:C.text, fontWeight:'700', fontSize:15, minWidth:100, textAlign:'center' }}>{MOIS_FR[mois-1]} {annee}</Text>
        <TouchableOpacity onPress={() => { if (mois===12){setMois(1);setAnnee(a=>a+1);}else setMois(m=>m+1); }}>
          <Text style={{ color:C.muted, fontSize:22 }}>›</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding:16 }} showsVerticalScrollIndicator={false}>
        {isFetching && <Loader text="Chargement planning..." />}
        {!isFetching && dispos.length === 0 &&
          <Empty icon="📅" title="Aucun créneau ce mois" subtitle="Appuyez sur ➕ pour ajouter des disponibilités" />
        }
        {dispos.map(d => (
          <Card key={d.id} style={{ marginBottom:10 }}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
              <View style={{ flex:1 }}>
                <Text style={{ color:C.text, fontWeight:'700', fontSize:14 }}>{fmtDate(d.date)}</Text>
                <Text style={{ color:C.muted, fontSize:12, marginTop:2 }}>
                  🕐 {d.heure_debut?.slice(0,5)} – {d.heure_fin?.slice(0,5)}
                </Text>
                {d.rdv_id && (
                  <View style={{ marginTop:6 }}>
                    <Badge label="RDV pris" color="amber" size="sm" />
                    {d.patient_nom && <Text style={{ color:C.muted, fontSize:11, marginTop:3 }}>👤 {d.patient_nom}</Text>}
                  </View>
                )}
              </View>
              <View style={{ alignItems:'flex-end', gap:6 }}>
                <Badge label={d.rdv_id ? 'Réservé' : 'Disponible'} color={d.rdv_id ? 'amber' : 'green'} size="sm" />
                {!d.rdv_id && (
                  <TouchableOpacity onPress={() => Alert.alert('Supprimer','Supprimer ce créneau ?',[{text:'Annuler',style:'cancel'},{text:'Supprimer',style:'destructive',onPress:()=>delMut.mutate(d.id)}])}
                    style={{ backgroundColor:`${C.red}15`, borderRadius:8, padding:6 }}>
                    <Text style={{ color:C.red, fontSize:12 }}>🗑️</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </Card>
        ))}
      </ScrollView>

      {/* Modal ajout créneau */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex:1, backgroundColor:C.bg }}>
          <View style={{ flexDirection:'row', alignItems:'center', padding:16, borderBottomWidth:1, borderBottomColor:C.border, gap:12 }}>
            <TouchableOpacity onPress={()=>setShowAdd(false)}>
              <Text style={{ color:C.muted, fontSize:22 }}>←</Text>
            </TouchableOpacity>
            <Text style={{ color:C.text, fontSize:16, fontWeight:'800' }}>Nouveau créneau</Text>
          </View>
          <ScrollView contentContainerStyle={{ padding:20 }}>
            {[
              ['Date (AAAA-MM-JJ) *', 'date',        'default', `${annee}-${String(mois).padStart(2,'0')}-01`],
              ['Heure début *',       'heure_debut', 'default', '08:00'],
              ['Heure fin *',         'heure_fin',   'default', '17:00'],
            ].map(([label, key, kbType, ph]) => (
              <View key={key} style={{ marginBottom:14 }}>
                <Text style={{ color:C.dim, fontSize:11, fontWeight:'700', textTransform:'uppercase', letterSpacing:0.5, marginBottom:6 }}>{label}</Text>
                <TextInput value={form[key]||''} onChangeText={v=>setForm(p=>({...p,[key]:v}))} placeholder={ph}
                  placeholderTextColor={C.dim} keyboardType={kbType}
                  style={{ backgroundColor:C.input, borderRadius:C.r, paddingHorizontal:14, paddingVertical:12, color:C.text, fontSize:14, borderWidth:1, borderColor:C.border }} />
              </View>
            ))}
            <TouchableOpacity onPress={() => addMut.mutate(form)} disabled={addMut.isPending}
              style={{ backgroundColor:C.green, borderRadius:C.r, padding:15, alignItems:'center', marginTop:8 }}>
              {addMut.isPending
                ? <Text style={{ color:'#fff', fontWeight:'700' }}>Enregistrement...</Text>
                : <Text style={{ color:'#fff', fontWeight:'800', fontSize:15 }}>Ajouter le créneau</Text>
              }
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ── Mes Patients ──────────────────────────────────────────────────
export function MesPatientsScreen({ navigation }) {
  const { data, isFetching, refetch } = useQuery({
    queryKey: ['medecin-patients'],
    queryFn:  () => MedecinAPI.mesPatients(),
  });
  const patients = data?.data || [];

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:C.bg }}>
      <ScreenHeader title="👥 Mes Patients" subtitle={`${patients.length} patient(s) suivi(s)`} />
      <ScrollView
        contentContainerStyle={{ padding:16 }}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={C.green} />}
        showsVerticalScrollIndicator={false}
      >
        {patients.length === 0 && <Empty icon="👥" title="Aucun patient" subtitle="Vos patients apparaîtront ici après consultation" />}
        {patients.map(p => (
          <Card key={p.id} style={{ marginBottom:10 }}>
            <View style={{ flexDirection:'row', alignItems:'center', gap:12 }}>
              <View style={{ width:44, height:44, borderRadius:22, backgroundColor:`${C.blue}20`, alignItems:'center', justifyContent:'center' }}>
                <Text style={{ fontSize:20 }}>👤</Text>
              </View>
              <View style={{ flex:1 }}>
                <Text style={{ color:C.text, fontWeight:'700', fontSize:14 }}>{p.prenom} {p.nom}</Text>
                {p.telephone && <Text style={{ color:C.muted, fontSize:12, marginTop:1 }}>📞 {p.telephone}</Text>}
                {p.groupe_sanguin && <Text style={{ color:C.dim, fontSize:11, marginTop:1 }}>🩸 {p.groupe_sanguin}</Text>}
              </View>
              {p.assurance && <Badge label={p.assurance} color="blue" size="sm"/>}
            </View>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Consultations ─────────────────────────────────────────────────
export function ConsultationsScreen({ navigation }) {
  const { data, isFetching, refetch } = useQuery({
    queryKey: ['medecin-consultations'],
    queryFn:  () => MedecinAPI.mesConsultations(),
  });
  const consults = data?.data || [];

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:C.bg }}>
      <ScreenHeader title="🩺 Consultations" subtitle={`${consults.length} consultation(s)`}
        rightIcon="➕" onRight={() => navigation.navigate('NouvelleConsultation', {})} />
      <ScrollView
        contentContainerStyle={{ padding:16 }}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={C.green} />}
        showsVerticalScrollIndicator={false}
      >
        {consults.length === 0 && <Empty icon="🩺" title="Aucune consultation" subtitle="Appuyez sur ➕ pour saisir une consultation" />}
        {consults.map(c => (
          <Card key={c.id} style={{ marginBottom:10 }}>
            <Text style={{ color:C.text, fontWeight:'700', fontSize:14, marginBottom:4 }}>
              {c.diagnostic?.slice(0,60)}{c.diagnostic?.length>60?'...':''}
            </Text>
            <Text style={{ color:C.muted, fontSize:12, marginBottom:6 }}>{fmtDate(c.created_at)}</Text>
            <View style={{ flexDirection:'row', gap:8, flexWrap:'wrap' }}>
              {c.pathologie && <Badge label={c.pathologie} color="purple" size="sm"/>}
              {c.gravite && <Badge label={c.gravite} color={c.gravite==='grave'?'red':c.gravite==='modere'?'amber':'green'} size="sm"/>}
              {c.tension_arterielle && <Badge label={`TA: ${c.tension_arterielle}`} color="blue" size="sm"/>}
            </View>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Nouvelle Consultation ─────────────────────────────────────────
export function NouvelleConsultationScreen({ route, navigation }) {
  const rdv = route?.params?.rdv || null;
  const qc  = useQueryClient();
  const [form, setForm] = useState({
    diagnostic: '', traitement: '', notes: '', pathologie: '',
    tension_arterielle: '', temperature: '', poids: '', taille: '',
    age_patient: '', sexe_patient: 'Masculin', gravite: 'modere',
    patient_nom: rdv?.patient_nom || '', patient_id: rdv?.patient_id || '',
  });
  const f = k => v => setForm(p => ({...p, [k]:v}));

  const addMut = useMutation({
    mutationFn: (d) => MedecinAPI.ajouterConsult(d),
    onSuccess: () => {
      qc.invalidateQueries(['medecin-consultations']);
      qc.invalidateQueries(['medecin-stats']);
      Alert.alert('✅', 'Consultation enregistrée !', [{ text:'OK', onPress:()=>navigation.goBack() }]);
    },
    onError: (e) => Alert.alert('Erreur', e.message),
  });

  const Inp2 = ({label, k, ph, kbType}) => (
    <View style={{ marginBottom:12 }}>
      <Text style={{ color:C.dim, fontSize:11, fontWeight:'700', textTransform:'uppercase', letterSpacing:0.5, marginBottom:5 }}>{label}</Text>
      <TextInput value={form[k]||''} onChangeText={f(k)} placeholder={ph} placeholderTextColor={C.dim} keyboardType={kbType||'default'}
        style={{ backgroundColor:C.input, borderRadius:C.r, paddingHorizontal:14, paddingVertical:10, color:C.text, fontSize:14, borderWidth:1, borderColor:C.border }} />
    </View>
  );

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:C.bg }}>
      <ScreenHeader title="🩺 Nouvelle Consultation" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding:16 }} showsVerticalScrollIndicator={false}>

        {rdv && (
          <View style={{ backgroundColor:`${C.green}12`, borderRadius:12, padding:12, marginBottom:14, borderWidth:1, borderColor:`${C.green}30` }}>
            <Text style={{ color:C.greenL, fontWeight:'700', fontSize:13 }}>📅 RDV : {rdv.patient_nom}</Text>
            <Text style={{ color:C.muted, fontSize:11, marginTop:3 }}>{fmtDate(rdv.date_rdv)} à {rdv.heure_rdv?.slice(0,5)}</Text>
          </View>
        )}

        <Card style={{ marginBottom:12 }}>
          <Text style={{ color:C.text, fontWeight:'800', marginBottom:12 }}>👤 Patient</Text>
          <Inp2 label="Nom du patient *" k="patient_nom" ph="Nom complet" />
          <View style={{ flexDirection:'row', gap:10 }}>
            <View style={{ flex:1 }}><Inp2 label="Âge" k="age_patient" ph="Ex: 35" kbType="numeric" /></View>
            <View style={{ flex:1 }}>
              <Text style={{ color:C.dim, fontSize:11, fontWeight:'700', textTransform:'uppercase', letterSpacing:0.5, marginBottom:5 }}>Sexe</Text>
              <View style={{ flexDirection:'row', gap:8 }}>
                {['Masculin','Féminin'].map(s => (
                  <TouchableOpacity key={s} onPress={()=>setForm(p=>({...p,sexe_patient:s}))}
                    style={{ flex:1, backgroundColor:form.sexe_patient===s?`${C.green}20`:C.input, borderRadius:8, padding:10, borderWidth:1, borderColor:form.sexe_patient===s?C.green:C.border, alignItems:'center' }}>
                    <Text style={{ color:form.sexe_patient===s?C.greenL:C.muted, fontSize:12, fontWeight:'700' }}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </Card>

        <Card style={{ marginBottom:12 }}>
          <Text style={{ color:C.text, fontWeight:'800', marginBottom:12 }}>🩺 Diagnostic & traitement</Text>
          <Inp2 label="Diagnostic *" k="diagnostic" ph="Ex: Paludisme simple, Hypertension..." />
          <Inp2 label="Pathologie / CIM-10" k="pathologie" ph="Ex: Paludisme, HTA..." />
          <Inp2 label="Traitement prescrit" k="traitement" ph="Ex: Coartem 6cp, Paracétamol..." />
          <Text style={{ color:C.dim, fontSize:11, fontWeight:'700', textTransform:'uppercase', letterSpacing:0.5, marginBottom:5 }}>Gravité</Text>
          <View style={{ flexDirection:'row', gap:8, marginBottom:12 }}>
            {[['leger','Léger','green'],['modere','Modéré','amber'],['grave','Grave','red']].map(([val,lab,col]) => (
              <TouchableOpacity key={val} onPress={()=>setForm(p=>({...p,gravite:val}))}
                style={{ flex:1, backgroundColor:form.gravite===val?`${C[col] || C.green}20`:C.input, borderRadius:8, padding:10, borderWidth:1, borderColor:form.gravite===val?C[col]||C.green:C.border, alignItems:'center' }}>
                <Text style={{ color:form.gravite===val?C.text:C.muted, fontSize:12, fontWeight:'700' }}>{lab}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Inp2 label="Notes" k="notes" ph="Observations particulières..." />
        </Card>

        <Card style={{ marginBottom:12 }}>
          <Text style={{ color:C.text, fontWeight:'800', marginBottom:12 }}>📊 Constantes</Text>
          <View style={{ flexDirection:'row', gap:10 }}>
            <View style={{ flex:1 }}><Inp2 label="Tension (mmHg)" k="tension_arterielle" ph="Ex: 120/80" /></View>
            <View style={{ flex:1 }}><Inp2 label="Température (°C)" k="temperature" ph="Ex: 37.5" kbType="decimal-pad" /></View>
          </View>
          <View style={{ flexDirection:'row', gap:10 }}>
            <View style={{ flex:1 }}><Inp2 label="Poids (kg)" k="poids" ph="Ex: 65" kbType="decimal-pad" /></View>
            <View style={{ flex:1 }}><Inp2 label="Taille (cm)" k="taille" ph="Ex: 170" kbType="decimal-pad" /></View>
          </View>
        </Card>

        <TouchableOpacity onPress={() => { if (!form.diagnostic) { Alert.alert('Requis','Diagnostic obligatoire'); return; } addMut.mutate({...form, rdv_id: rdv?.id}); }}
          disabled={addMut.isPending}
          style={{ backgroundColor:addMut.isPending?'#1E2F42':C.green, borderRadius:C.r, padding:16, alignItems:'center', marginBottom:30 }}>
          {addMut.isPending
            ? <Text style={{ color:'#fff', fontWeight:'700' }}>Enregistrement...</Text>
            : <Text style={{ color:'#fff', fontWeight:'800', fontSize:15 }}>✓ Enregistrer la consultation</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Ordonnances Médecin ───────────────────────────────────────────
export function OrdonnancesMedecinScreen({ navigation }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ patient_nom:'', patient_id:'', medicaments:'', posologie:'', duree:'' });
  const qc = useQueryClient();
  const f = k => v => setForm(p=>({...p,[k]:v}));

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['medecin-ordonnances'],
    queryFn:  () => MedecinAPI.mesOrdonnances(),
  });
  const ordonnances = data?.data || [];

  const addMut = useMutation({
    mutationFn: (d) => MedecinAPI.ajouterOrdonnance(d),
    onSuccess: () => { qc.invalidateQueries(['medecin-ordonnances']); setShowAdd(false); setForm({patient_nom:'',patient_id:'',medicaments:'',posologie:'',duree:''}); Alert.alert('✅','Ordonnance créée !'); },
    onError: (e) => Alert.alert('Erreur', e.message),
  });

  const Inp2 = ({label, k, ph, multiline}) => (
    <View style={{ marginBottom:12 }}>
      <Text style={{ color:C.dim, fontSize:11, fontWeight:'700', textTransform:'uppercase', letterSpacing:0.5, marginBottom:5 }}>{label}</Text>
      <TextInput value={form[k]||''} onChangeText={f(k)} placeholder={ph} placeholderTextColor={C.dim} multiline={multiline} numberOfLines={multiline?3:1}
        style={{ backgroundColor:C.input, borderRadius:C.r, paddingHorizontal:14, paddingVertical:10, color:C.text, fontSize:14, borderWidth:1, borderColor:C.border, textAlignVertical:multiline?'top':'center', minHeight:multiline?80:undefined }} />
    </View>
  );

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:C.bg }}>
      <ScreenHeader title="💊 Ordonnances" subtitle={`${ordonnances.length} ordonnance(s)`}
        rightIcon="➕" onRight={() => setShowAdd(true)} />
      <ScrollView contentContainerStyle={{ padding:16 }}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={C.green} />}
        showsVerticalScrollIndicator={false}>
        {ordonnances.length === 0 && <Empty icon="💊" title="Aucune ordonnance" subtitle="Appuyez sur ➕ pour créer une ordonnance" />}
        {ordonnances.map(o => (
          <Card key={o.id} style={{ marginBottom:10 }}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:6 }}>
              <Text style={{ color:C.text, fontWeight:'700', fontSize:14 }}>{o.patient_nom || 'Patient'}</Text>
              <Badge label={o.statut||'active'} color={o.statut==='active'?'green':o.statut==='terminee'?'gray':'amber'} size="sm"/>
            </View>
            <Text style={{ color:C.muted, fontSize:12, marginBottom:4 }}>{o.medicaments?.slice(0,80)}{o.medicaments?.length>80?'...':''}</Text>
            {o.posologie && <Text style={{ color:C.dim, fontSize:11 }}>📋 {o.posologie}</Text>}
            {o.duree && <Text style={{ color:C.dim, fontSize:11, marginTop:1 }}>⏱ {o.duree}</Text>}
            <Text style={{ color:C.dim, fontSize:10, marginTop:6 }}>{fmtDate(o.created_at)}</Text>
          </Card>
        ))}
      </ScrollView>

      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex:1, backgroundColor:C.bg }}>
          <View style={{ flexDirection:'row', alignItems:'center', padding:16, borderBottomWidth:1, borderBottomColor:C.border, gap:12 }}>
            <TouchableOpacity onPress={()=>setShowAdd(false)}><Text style={{ color:C.muted, fontSize:22 }}>←</Text></TouchableOpacity>
            <Text style={{ color:C.text, fontSize:16, fontWeight:'800' }}>Nouvelle Ordonnance</Text>
          </View>
          <ScrollView contentContainerStyle={{ padding:20 }}>
            <Inp2 label="Nom du patient *" k="patient_nom" ph="Nom complet du patient" />
            <Inp2 label="Médicaments *" k="medicaments" ph="Ex: Coartem 6cp, Paracétamol 500mg..." multiline />
            <Inp2 label="Posologie" k="posologie" ph="Ex: 1 cp matin & soir pendant 5 jours" multiline />
            <Inp2 label="Durée" k="duree" ph="Ex: 7 jours, 1 semaine..." />
            <TouchableOpacity onPress={() => { if (!form.medicaments) { Alert.alert('Requis','Médicaments obligatoires'); return; } addMut.mutate(form); }}
              disabled={addMut.isPending}
              style={{ backgroundColor:C.green, borderRadius:C.r, padding:15, alignItems:'center', marginTop:8 }}>
              {addMut.isPending
                ? <Text style={{ color:'#fff' }}>Enregistrement...</Text>
                : <Text style={{ color:'#fff', fontWeight:'800', fontSize:15 }}>Créer l'ordonnance</Text>
              }
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
