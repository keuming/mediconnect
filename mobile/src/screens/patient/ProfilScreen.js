import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { patientAPI } from '../../services/api';

// ─── Données géographiques ────────────────────────────────────────
const PAYS = [
  { code:'CI', nom:'Côte d\'Ivoire' }, { code:'SN', nom:'Sénégal' },
  { code:'CM', nom:'Cameroun' },       { code:'ML', nom:'Mali' },
  { code:'BF', nom:'Burkina Faso' },   { code:'GN', nom:'Guinée' },
  { code:'TG', nom:'Togo' },           { code:'BJ', nom:'Bénin' },
  { code:'NE', nom:'Niger' },          { code:'CD', nom:'RD Congo' },
  { code:'CG', nom:'Congo' },          { code:'GA', nom:'Gabon' },
  { code:'MG', nom:'Madagascar' },     { code:'MR', nom:'Mauritanie' },
  { code:'GH', nom:'Ghana' },          { code:'NG', nom:'Nigéria' },
  { code:'MA', nom:'Maroc' },          { code:'TN', nom:'Tunisie' },
  { code:'DZ', nom:'Algérie' },        { code:'FR', nom:'France' },
];

const VILLES_PAR_PAYS = {
  CI: ['Abidjan','Bouaké','Daloa','Yamoussoukro','San Pedro','Korhogo','Man','Gagnoa','Abengourou','Divo'],
  SN: ['Dakar','Thiès','Touba','Kaolack','Ziguinchor','Saint-Louis','Mbour','Rufisque'],
  CM: ['Douala','Yaoundé','Bafoussam','Bamenda','Garoua','Maroua','Ngaoundéré'],
  ML: ['Bamako','Sikasso','Mopti','Ségou','Kayes','Gao','Tombouctou'],
  BF: ['Ouagadougou','Bobo-Dioulasso','Koudougou','Ouahigouya','Banfora'],
  GN: ['Conakry','Labé','Kankan','Kindia','N\'Zérékoré'],
  TG: ['Lomé','Sokodé','Kara','Atakpamé','Kpalimé'],
  BJ: ['Cotonou','Porto-Novo','Parakou','Abomey','Bohicon'],
  CD: ['Kinshasa','Lubumbashi','Mbuji-Mayi','Kananga','Kisangani'],
  GH: ['Accra','Kumasi','Tamale','Sekondi-Takoradi'],
  MA: ['Casablanca','Rabat','Marrakech','Fès','Tanger','Agadir'],
  FR: ['Paris','Marseille','Lyon','Toulouse','Nice','Bordeaux','Nantes'],
};
const getVilles = (code) => VILLES_PAR_PAYS[code] || [];

const GROUPES_SANGUINS = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];

const MALADIES_LISTE = [
  'Hypertension artérielle','Diabète type 1','Diabète type 2',
  'Asthme','Insuffisance cardiaque','Insuffisance rénale chronique',
  'VIH/SIDA','Hépatite B','Hépatite C','Tuberculose',
  'Drépanocytose','Épilepsie','Dépression','Anxiété',
  'Hypothyroïdie','Hyperthyroïdie','Lupus','Polyarthrite rhumatoïde',
  'Maladie de Crohn','Cancer (en rémission)','Autre',
];

// ─── Calcul IMC ───────────────────────────────────────────────────
const calcIMC = (poids, taille) => {
  if (!poids || !taille || +taille === 0) return null;
  return Math.round((+poids / Math.pow(+taille / 100, 2)) * 10) / 10;
};
const labelIMC = (imc) => {
  if (!imc) return null;
  if (imc < 18.5) return { label: 'Insuffisance pondérale', color: '#60A5FA' };
  if (imc < 25)   return { label: 'Poids normal',           color: '#34D399' };
  if (imc < 30)   return { label: 'Surpoids',               color: '#FCD34D' };
  if (imc < 35)   return { label: 'Obésité modérée',        color: '#F97316' };
  return               { label: 'Obésité sévère',        color: '#F87171' };
};

// ─── Styles locaux ────────────────────────────────────────────────
const P = {
  bg:'#060E18', card:'#0D1B2A', input:'#0A1520', border:'#1a2d42',
  text:'#F0F6FF', muted:'#8BA3B8', dim:'#5A7A94', faint:'#2A3F55',
  green:'#0A8F58', greenL:'#34D399', r:12,
};
const INP = {
  backgroundColor:P.input, borderRadius:10, paddingHorizontal:14,
  paddingVertical:12, color:P.text, fontSize:14,
  borderWidth:1, borderColor:P.border, marginBottom:14,
};
const LBL = {
  fontSize:10, fontWeight:'700', color:P.dim,
  textTransform:'uppercase', letterSpacing:0.5, marginBottom:6,
};
const SECTION = {
  backgroundColor:P.card, borderRadius:16, padding:18,
  borderWidth:1, borderColor:P.border, marginBottom:14,
};

// ─── Composant Sélecteur Modal ────────────────────────────────────
function ModalPicker({ label, value, options, onSelect, placeholder, searchable }) {
  const [visible, setVisible] = useState(false);
  const [search,  setSearch]  = useState('');
  const filtered = searchable
    ? options.filter(o => (o.nom||o).toLowerCase().includes(search.toLowerCase()))
    : options;
  const display = options.find(o => (o.code||o) === value)?.nom || value || placeholder || 'Sélectionner...';
  return (
    <View style={{ marginBottom:14 }}>
      <Text style={LBL}>{label}</Text>
      <TouchableOpacity onPress={() => setVisible(true)}
        style={[INP, { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:0 }]}>
        <Text style={{ color: value ? P.text : P.faint, fontSize:14 }}>{display}</Text>
        <Text style={{ color:P.dim }}>▼</Text>
      </TouchableOpacity>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex:1, backgroundColor:P.bg }}>
          <View style={{ flexDirection:'row', alignItems:'center', padding:16, borderBottomWidth:1, borderBottomColor:P.border, gap:12 }}>
            <TouchableOpacity onPress={() => { setVisible(false); setSearch(''); }}>
              <Text style={{ color:P.muted, fontSize:22 }}>←</Text>
            </TouchableOpacity>
            <Text style={{ color:P.text, fontSize:16, fontWeight:'800', flex:1 }}>{label}</Text>
          </View>
          {searchable && (
            <View style={{ padding:12 }}>
              <TextInput value={search} onChangeText={setSearch} placeholder="Rechercher..."
                placeholderTextColor={P.faint}
                style={[INP, { marginBottom:0 }]} />
            </View>
          )}
          <FlatList
            data={filtered}
            keyExtractor={(item,i) => String(item.code||item||i)}
            renderItem={({ item }) => {
              const val = item.code||item; const lbl = item.nom||item;
              return (
                <TouchableOpacity onPress={() => { onSelect(val); setVisible(false); setSearch(''); }}
                  style={{ paddingHorizontal:16, paddingVertical:14, borderBottomWidth:1, borderBottomColor:`${P.border}60`, backgroundColor: value===val ? `${P.green}15` : 'transparent' }}>
                  <Text style={{ color: value===val ? P.greenL : P.text, fontSize:14, fontWeight: value===val ? '700':'400' }}>{lbl}</Text>
                </TouchableOpacity>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

// ─── Composant sélection maladies ────────────────────────────────
function MaladiesSelector({ selected, onChange }) {
  const [visible, setVisible] = useState(false);
  const toggle = (m) => {
    const arr = selected || [];
    onChange(arr.includes(m) ? arr.filter(x => x !== m) : [...arr, m]);
  };
  return (
    <View style={{ marginBottom:14 }}>
      <Text style={LBL}>Maladies chroniques</Text>
      <TouchableOpacity onPress={() => setVisible(true)}
        style={[INP, { minHeight:44, flexDirection:'row', flexWrap:'wrap', gap:6, marginBottom:0, alignItems:'center' }]}>
        {(selected||[]).length === 0
          ? <Text style={{ color:P.faint, fontSize:14 }}>Sélectionner...</Text>
          : (selected||[]).map(m => (
              <View key={m} style={{ backgroundColor:`${P.green}20`, borderRadius:20, paddingHorizontal:10, paddingVertical:4, borderWidth:1, borderColor:`${P.green}40` }}>
                <Text style={{ color:P.greenL, fontSize:11, fontWeight:'700' }}>{m}</Text>
              </View>
            ))
        }
      </TouchableOpacity>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex:1, backgroundColor:P.bg }}>
          <View style={{ flexDirection:'row', alignItems:'center', padding:16, borderBottomWidth:1, borderBottomColor:P.border, gap:12 }}>
            <TouchableOpacity onPress={() => setVisible(false)}>
              <Text style={{ color:P.muted, fontSize:22 }}>←</Text>
            </TouchableOpacity>
            <Text style={{ color:P.text, fontSize:16, fontWeight:'800', flex:1 }}>Maladies chroniques</Text>
            <Text style={{ color:P.dim, fontSize:12 }}>{(selected||[]).length} sélectionnée(s)</Text>
          </View>
          <ScrollView contentContainerStyle={{ padding:12 }}>
            {MALADIES_LISTE.map(m => {
              const checked = (selected||[]).includes(m);
              return (
                <TouchableOpacity key={m} onPress={() => toggle(m)}
                  style={{ flexDirection:'row', alignItems:'center', padding:14, borderRadius:12, marginBottom:8,
                    backgroundColor: checked ? `${P.green}15` : P.card,
                    borderWidth:1, borderColor: checked ? P.green : P.border }}>
                  <View style={{ width:22, height:22, borderRadius:6, borderWidth:2,
                    borderColor: checked ? P.green : P.border,
                    backgroundColor: checked ? P.green : 'transparent',
                    alignItems:'center', justifyContent:'center', marginRight:12 }}>
                    {checked && <Text style={{ color:'#fff', fontSize:13, fontWeight:'900' }}>✓</Text>}
                  </View>
                  <Text style={{ color: checked ? P.greenL : P.text, fontSize:14, fontWeight: checked ? '700':'400', flex:1 }}>{m}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

// ─── Écran Principal ──────────────────────────────────────────────
export default function ProfilScreen({ navigation }) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: profil, isLoading } = useQuery({
    queryKey: ['p-profil'],
    queryFn:  () => patientAPI.getProfil(user?.token).then(r => r.data),
  });

  const [prenom,    setPrenom]    = useState('');
  const [nom,       setNom]       = useState('');
  const [email,     setEmail]     = useState('');
  const [telephone, setTelephone] = useState('');
  const [adresse,   setAdresse]   = useState('');
  const [dob,       setDob]       = useState('');
  const [pays,      setPays]      = useState('CI');
  const [ville,     setVille]     = useState('');
  const [groupe,    setGroupe]    = useState('');
  const [taille,    setTaille]    = useState('');
  const [poids,     setPoids]     = useState('');
  const [maladies,  setMaladies]  = useState([]);
  const [tension,   setTension]   = useState('');
  const [bpm,       setBpm]       = useState('');

  // Pré-remplir quand le profil charge
  useEffect(() => {
    if (!profil) return;
    setPrenom(profil.prenom || '');
    setNom(profil.nom || '');
    setEmail(profil.email || '');
    setTelephone(profil.telephone || '');
    setAdresse(profil.adresse || '');
    setDob(profil.date_naissance ? profil.date_naissance.split('T')[0] : '');
    setPays(profil.pays_code || 'CI');
    setVille(profil.ville || '');
    setGroupe(profil.groupe_sanguin || '');
    setTaille(profil.taille ? String(profil.taille) : '');
    setPoids(profil.poids  ? String(profil.poids)  : '');
    setMaladies(profil.maladies_chroniques || []);
    setTension(profil.tension_du_jour || '');
    setBpm(profil.bpm_du_jour ? String(profil.bpm_du_jour) : '');
  }, [profil]);

  const imc = calcIMC(poids, taille);
  const imcInfo = labelIMC(imc);

  const { mutate: sauvegarder, isPending: saving } = useMutation({
    mutationFn: (data) => patientAPI.updateProfil(user?.token, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p-profil'] });
      queryClient.invalidateQueries({ queryKey: ['p-carte'] });
      Alert.alert('✅ Enregistré', 'Votre profil a été mis à jour.');
    },
    onError: (e) => Alert.alert('Erreur', e.message),
  });

  const handleSave = () => {
    if (!prenom || !nom) { Alert.alert('Requis', 'Prénom et nom obligatoires.'); return; }
    if (!ville)          { Alert.alert('Requis', 'Sélectionnez votre ville.'); return; }
    sauvegarder({
      prenom, nom, email, telephone, adresse,
      date_naissance: dob || null,
      pays_code: pays, ville,
      groupe_sanguin: groupe || null,
      taille: taille ? parseFloat(taille) : null,
      poids:  poids  ? parseFloat(poids)  : null,
      maladies_chroniques: maladies,
      tension_du_jour: tension || null,
      bpm_du_jour: bpm ? parseInt(bpm) : null,
    });
  };

  if (isLoading) return (
    <SafeAreaView style={{ flex:1, backgroundColor:P.bg, alignItems:'center', justifyContent:'center' }}>
      <ActivityIndicator color={P.greenL} size="large" />
    </SafeAreaView>
  );

  const villesDisponibles = getVilles(pays);

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:P.bg }}>
      <View style={{ flexDirection:'row', alignItems:'center', padding:16, borderBottomWidth:1, borderBottomColor:P.border, gap:12 }}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ color:P.muted, fontSize:22 }}>←</Text>
        </TouchableOpacity>
        <Text style={{ color:P.text, fontSize:17, fontWeight:'900', flex:1 }}>Mon profil</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}
          style={{ backgroundColor: saving ? '#1E2F42' : P.green, borderRadius:10, paddingHorizontal:16, paddingVertical:8 }}>
          {saving
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={{ color:'#fff', fontWeight:'800', fontSize:14 }}>Enregistrer</Text>
          }
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex:1 }}>
        <ScrollView contentContainerStyle={{ padding:16, paddingBottom:60 }} showsVerticalScrollIndicator={false}>

          {/* ── Identité ── */}
          <View style={SECTION}>
            <Text style={{ color:P.text, fontWeight:'800', fontSize:14, marginBottom:18 }}>🪪 Identité</Text>
            <View style={{ flexDirection:'row', gap:10 }}>
              <View style={{ flex:1 }}><Text style={LBL}>Prénom *</Text><TextInput value={prenom} onChangeText={setPrenom} placeholder="Adjoua" placeholderTextColor={P.faint} style={INP} /></View>
              <View style={{ flex:1 }}><Text style={LBL}>Nom *</Text><TextInput value={nom} onChangeText={setNom} placeholder="Koné" placeholderTextColor={P.faint} style={INP} /></View>
            </View>
            <Text style={LBL}>Date de naissance</Text>
            <TextInput value={dob} onChangeText={setDob} placeholder="AAAA-MM-JJ" placeholderTextColor={P.faint} style={INP} />
            <ModalPicker label="Groupe sanguin" value={groupe} options={GROUPES_SANGUINS} onSelect={setGroupe} placeholder="Sélectionner..." />
          </View>

          {/* ── Contact ── */}
          <View style={SECTION}>
            <Text style={{ color:P.text, fontWeight:'800', fontSize:14, marginBottom:18 }}>📞 Contact</Text>
            <Text style={LBL}>Email</Text>
            <TextInput value={email} onChangeText={setEmail} placeholder="votre@email.com" placeholderTextColor={P.faint} keyboardType="email-address" autoCapitalize="none" style={INP} />
            <Text style={LBL}>Téléphone</Text>
            <TextInput value={telephone} onChangeText={setTelephone} placeholder="+225 07 00 00 00" placeholderTextColor={P.faint} keyboardType="phone-pad" style={INP} />
            <Text style={LBL}>Adresse</Text>
            <TextInput value={adresse} onChangeText={setAdresse} placeholder="Quartier, Rue..." placeholderTextColor={P.faint} style={INP} />
          </View>

          {/* ── Localisation ── */}
          <View style={SECTION}>
            <Text style={{ color:P.text, fontWeight:'800', fontSize:14, marginBottom:18 }}>🌍 Localisation</Text>
            <ModalPicker label="Pays *" value={pays} options={PAYS} onSelect={(v) => { setPays(v); setVille(''); }} placeholder="Sélectionner..." searchable />
            <ModalPicker label="Ville / Commune *" value={ville}
              options={villesDisponibles.length ? villesDisponibles : ['Autre']}
              onSelect={setVille} placeholder="Sélectionner une ville..." searchable />
          </View>

          {/* ── Données médicales ── */}
          <View style={SECTION}>
            <Text style={{ color:P.text, fontWeight:'800', fontSize:14, marginBottom:18 }}>⚕️ Données médicales</Text>
            <View style={{ flexDirection:'row', gap:10 }}>
              <View style={{ flex:1 }}>
                <Text style={LBL}>Taille (cm)</Text>
                <TextInput value={taille} onChangeText={setTaille} placeholder="Ex: 175" placeholderTextColor={P.faint} keyboardType="numeric" style={INP} />
              </View>
              <View style={{ flex:1 }}>
                <Text style={LBL}>Poids (kg)</Text>
                <TextInput value={poids} onChangeText={setPoids} placeholder="Ex: 70" placeholderTextColor={P.faint} keyboardType="numeric" style={INP} />
              </View>
            </View>

            {/* Tension + BPM du jour */}
            <View style={{ backgroundColor:`${P.faint}15`, borderRadius:12, padding:12, borderWidth:1, borderColor:`${P.border}`, marginBottom:14 }}>
              <Text style={{ color:P.dim, fontSize:11, marginBottom:10 }}>📋 Mesures du jour — mises à jour depuis le profil</Text>
              <View style={{ flexDirection:'row', gap:10 }}>
                <View style={{ flex:1 }}>
                  <Text style={LBL}>Tension artérielle</Text>
                  <TextInput value={tension} onChangeText={setTension} placeholder="Ex: 120/80 mmHg" placeholderTextColor={P.faint} style={INP} />
                </View>
                <View style={{ flex:1 }}>
                  <Text style={LBL}>Battements / min</Text>
                  <TextInput value={bpm} onChangeText={setBpm} placeholder="Ex: 72" placeholderTextColor={P.faint} keyboardType="numeric" style={INP} />
                </View>
              </View>
            </View>

            {/* IMC calculé */}
            {imc && imcInfo && (
              <View style={{ backgroundColor:`${imcInfo.color}12`, borderRadius:12, padding:14, borderWidth:1, borderColor:`${imcInfo.color}30`, marginBottom:14 }}>
                <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
                  <Text style={{ color:P.dim, fontSize:12 }}>Indice de masse corporelle (IMC)</Text>
                  <View style={{ backgroundColor:`${imcInfo.color}20`, borderRadius:20, paddingHorizontal:10, paddingVertical:4 }}>
                    <Text style={{ color:imcInfo.color, fontSize:11, fontWeight:'700' }}>{imcInfo.label}</Text>
                  </View>
                </View>
                <Text style={{ color:imcInfo.color, fontSize:26, fontWeight:'900', marginTop:6 }}>{imc}</Text>
                <Text style={{ color:P.dim, fontSize:11, marginTop:2 }}>Norme : 18.5 – 24.9</Text>
              </View>
            )}

            <MaladiesSelector selected={maladies} onChange={setMaladies} />
          </View>

          {/* Bouton sauvegarde bas */}
          <TouchableOpacity onPress={handleSave} disabled={saving} activeOpacity={0.85}
            style={{ backgroundColor: saving ? '#1E2F42' : P.green, borderRadius:14, padding:16, alignItems:'center', marginTop:4 }}>
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={{ color:'#fff', fontWeight:'800', fontSize:15 }}>Enregistrer le profil</Text>
            }
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
