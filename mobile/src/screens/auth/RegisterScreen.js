import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
  Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { C } from '../../components/UI';
import { PAYS_LISTE, getVillesByPays } from '../../utils/geoAfrique';

const ROLES = [
  { value:'patient',             label:'Patient',           icon:'👤', desc:'Prendre des RDV, gérer mes soins' },
  { value:'medecin_independant', label:'Médecin Conseil',   icon:'⭐', desc:'Médecin de famille & suivi privé' },
  { value:'medecin',             label:'Médecin Résident',  icon:'🩺', desc:'Médecin employé de clinique' },
  { value:'pharmacie',           label:'Pharmacie',         icon:'💊', desc:'Ordonnances & livraisons' },
  { value:'livreur',             label:'Livreur',           icon:'🛵', desc:'Missions de livraison' },
  { value:'clinique',            label:'Clinique / Hôpital',icon:'🏥', desc:'Gestion planning & patients' },
  { value:'assureur',            label:'Assureur',          icon:'🛡️', desc:'Dossiers tiers-payant' },
  { value:'imagerie',            label:'Imagerie',          icon:'🩻', desc:'Radiologie, IRM, Scanner' },
  { value:'laboratoire',         label:'Laboratoire',       icon:'🧪', desc:'Analyses biologiques' },
  { value:'optique',             label:'Cabinet Optique',   icon:'🔭', desc:'Ventes & stock optique' },
];

const Inp = ({ label, value, onChange, placeholder, keyboardType, secure }) => (
  <View style={{ marginBottom: 14 }}>
    <Text style={{ fontSize: 11, fontWeight: '700', color: C.dim, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{label}</Text>
    <TextInput
      value={value || ''}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={C.dim}
      secureTextEntry={secure}
      keyboardType={keyboardType || 'default'}
      style={{ backgroundColor: C.input, borderRadius: C.r, paddingHorizontal: 14, paddingVertical: 12, color: C.text, fontSize: 14, borderWidth: 1, borderColor: C.border }}
    />
  </View>
);

// Sélecteur modal (pour pays et villes avec beaucoup d'options)
const ModalSelector = ({ label, value, options, onSelect, placeholder }) => {
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState('');
  const filtered = options.filter(o =>
    (o.label || o).toLowerCase().includes(search.toLowerCase())
  );
  const displayLabel = options.find(o => (o.value || o) === value)?.label || value || placeholder;

  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: C.dim, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{label}</Text>
      <TouchableOpacity onPress={() => setVisible(true)}
        style={{ backgroundColor: C.input, borderRadius: C.r, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: C.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: value ? C.text : C.dim, fontSize: 14 }}>{displayLabel}</Text>
        <Text style={{ color: C.dim }}>▼</Text>
      </TouchableOpacity>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: C.border, gap: 12 }}>
            <TouchableOpacity onPress={() => { setVisible(false); setSearch(''); }}>
              <Text style={{ color: C.muted, fontSize: 22 }}>←</Text>
            </TouchableOpacity>
            <Text style={{ color: C.text, fontSize: 16, fontWeight: '800', flex: 1 }}>{label}</Text>
          </View>
          <View style={{ padding: 12 }}>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Rechercher..."
              placeholderTextColor={C.dim}
              style={{ backgroundColor: C.input, borderRadius: C.r, paddingHorizontal: 14, paddingVertical: 10, color: C.text, fontSize: 14, borderWidth: 1, borderColor: C.border }}
            />
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(item, i) => String(item.value || item || i)}
            renderItem={({ item }) => {
              const val = item.value || item;
              const lbl = item.label || item;
              return (
                <TouchableOpacity onPress={() => { onSelect(val); setVisible(false); setSearch(''); }}
                  style={{ paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: `${C.border}60`, backgroundColor: value === val ? `${C.green}15` : 'transparent' }}>
                  <Text style={{ color: value === val ? C.greenL : C.text, fontSize: 14, fontWeight: value === val ? '700' : '400' }}>{lbl}</Text>
                </TouchableOpacity>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
};

export default function RegisterScreen({ navigation }) {
  const { doRegister, loading } = useAuthStore();
  const [step, setStep]   = useState(1);
  const [role, setRole]   = useState('');
  const [pays, setPays]   = useState('CI');
  const [ville, setVille] = useState('');
  const [form, setForm]   = useState({ prenom:'', nom:'', email:'', password:'', telephone:'' });
  const [extra, setExtra] = useState({});
  const f = k => v => setForm(p => ({...p, [k]: v}));
  const e = k => v => setExtra(p => ({...p, [k]: v}));

  const paysOptions = PAYS_LISTE.map(p => ({ value: p.code, label: p.nom }));
  const villesOptions = getVillesByPays(pays);

  const handleRegister = async () => {
    if (!form.prenom || !form.nom || !form.email || !form.password) {
      Alert.alert('Champs requis', 'Remplissez tous les champs obligatoires');
      return;
    }
    if (form.password.length < 6) {
      Alert.alert('Mot de passe', 'Le mot de passe doit faire au moins 6 caractères');
      return;
    }
    if (!ville) {
      Alert.alert('Ville requise', 'Veuillez sélectionner votre ville');
      return;
    }
    const payload = { ...form, ...extra, role, pays_code: pays, ville };
    const res = await doRegister(payload);
    if (!res.success) Alert.alert('Erreur', res.message);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 12 }}>
            <TouchableOpacity onPress={() => step > 1 ? setStep(1) : navigation?.goBack?.()}>
              <Text style={{ color: C.muted, fontSize: 22 }}>←</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.text, fontSize: 20, fontWeight: '900' }}>
                {step === 1 ? 'Choisir un profil' : 'Créer mon compte'}
              </Text>
              <Text style={{ color: C.dim, fontSize: 12, marginTop: 2 }}>
                {step === 1 ? 'Étape 1 / 2 — Sélectionnez votre rôle' : `Étape 2 / 2 — ${ROLES.find(r=>r.value===role)?.icon} ${ROLES.find(r=>r.value===role)?.label}`}
              </Text>
            </View>
          </View>

          {/* ÉTAPE 1 : Sélection rôle */}
          {step === 1 && (
            <>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
                {ROLES.map(r => (
                  <TouchableOpacity key={r.value} onPress={() => setRole(r.value)}
                    style={{
                      width: '47%', backgroundColor: role === r.value ? `${C.green}18` : C.card,
                      borderRadius: 14, padding: 14, borderWidth: 1.5,
                      borderColor: role === r.value ? C.green : C.border,
                    }}>
                    <Text style={{ fontSize: 26, marginBottom: 6 }}>{r.icon}</Text>
                    <Text style={{ color: role === r.value ? C.greenL : C.text, fontWeight: '700', fontSize: 13, marginBottom: 3 }}>{r.label}</Text>
                    <Text style={{ color: C.dim, fontSize: 11, lineHeight: 16 }}>{r.desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity onPress={() => { if (!role) { Alert.alert('Requis', 'Sélectionnez votre profil'); return; } setStep(2); }}
                style={{ backgroundColor: role ? C.green : '#1E2F42', borderRadius: C.r, padding: 16, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Continuer →</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation?.navigate?.('Login')} style={{ marginTop: 16, alignItems: 'center' }}>
                <Text style={{ color: C.dim, fontSize: 13 }}>Déjà un compte ? <Text style={{ color: C.greenL }}>Se connecter</Text></Text>
              </TouchableOpacity>
            </>
          )}

          {/* ÉTAPE 2 : Informations */}
          {step === 2 && (
            <>
              {/* Infos personnelles */}
              <View style={{ backgroundColor: C.card, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.border }}>
                <Text style={{ color: C.text, fontWeight: '800', fontSize: 14, marginBottom: 14 }}>🪪 Informations personnelles</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Inp label="Prénom *" value={form.prenom} onChange={f('prenom')} placeholder="Adjoua" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Inp label="Nom *" value={form.nom} onChange={f('nom')} placeholder="Koné" />
                  </View>
                </View>
                <Inp label="Email *" value={form.email} onChange={f('email')} placeholder="email@exemple.com" keyboardType="email-address" />
                <Inp label="Mot de passe *" value={form.password} onChange={f('password')} placeholder="Minimum 6 caractères" secure />
                <Inp label="Téléphone" value={form.telephone} onChange={f('telephone')} placeholder="+225 07 00 00 00" keyboardType="phone-pad" />
              </View>

              {/* Géographie */}
              <View style={{ backgroundColor: C.card, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.border }}>
                <Text style={{ color: C.text, fontWeight: '800', fontSize: 14, marginBottom: 14 }}>🌍 Localisation</Text>
                <ModalSelector
                  label="Pays *"
                  value={pays}
                  options={paysOptions}
                  onSelect={v => { setPays(v); setVille(''); }}
                  placeholder="Sélectionner un pays..."
                />
                <ModalSelector
                  label="Ville / Commune *"
                  value={ville}
                  options={villesOptions}
                  onSelect={setVille}
                  placeholder={pays ? 'Sélectionner une ville...' : 'Choisissez d\'abord un pays'}
                />
              </View>

              {/* Champs spécifiques par rôle */}
              {(role === 'clinique') && (
                <View style={{ backgroundColor: C.card, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.border }}>
                  <Text style={{ color: C.text, fontWeight: '800', fontSize: 14, marginBottom: 14 }}>🏥 Informations clinique</Text>
                  <Inp label="Nom de la clinique *" value={extra.nom_clinique} onChange={e('nom_clinique')} placeholder="Polyclinique du Sud..." />
                  <Inp label="Adresse" value={extra.adresse} onChange={e('adresse')} placeholder="Quartier, Rue..." />
                </View>
              )}
              {(role === 'medecin_independant' || role === 'medecin') && (
                <View style={{ backgroundColor: C.card, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.border }}>
                  <Text style={{ color: C.text, fontWeight: '800', fontSize: 14, marginBottom: 14 }}>🩺 Informations médicales</Text>
                  <Inp label="Spécialité" value={extra.specialite} onChange={e('specialite')} placeholder="Médecine générale, Cardiologie..." />
                  <Inp label="Numéro d'ordre" value={extra.numero_ordre} onChange={e('numero_ordre')} placeholder="Ordre des médecins..." />
                </View>
              )}
              {role === 'pharmacie' && (
                <View style={{ backgroundColor: C.card, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.border }}>
                  <Text style={{ color: C.text, fontWeight: '800', fontSize: 14, marginBottom: 14 }}>💊 Informations pharmacie</Text>
                  <Inp label="Nom de la pharmacie *" value={extra.nom_pharmacie} onChange={e('nom_pharmacie')} placeholder="Pharmacie Centrale..." />
                  <Inp label="Adresse" value={extra.adresse} onChange={e('adresse')} placeholder="Quartier, Rue..." />
                </View>
              )}
              {role === 'optique' && (
                <View style={{ backgroundColor: C.card, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.border }}>
                  <Text style={{ color: C.text, fontWeight: '800', fontSize: 14, marginBottom: 14 }}>🔭 Cabinet optique</Text>
                  <Inp label="Nom du cabinet *" value={extra.nom_optique} onChange={e('nom_optique')} placeholder="Vision Plus Optique..." />
                </View>
              )}
              {(role === 'imagerie' || role === 'laboratoire') && (
                <View style={{ backgroundColor: C.card, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.border }}>
                  <Text style={{ color: C.text, fontWeight: '800', fontSize: 14, marginBottom: 14 }}>🏥 Établissement</Text>
                  <Inp label="Nom de l'établissement *" value={extra.nom_etab} onChange={e('nom_etab')} placeholder="Centre d'Imagerie..." />
                </View>
              )}
              {role === 'assureur' && (
                <View style={{ backgroundColor: C.card, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.border }}>
                  <Text style={{ color: C.text, fontWeight: '800', fontSize: 14, marginBottom: 14 }}>🛡️ Compagnie d'assurance</Text>
                  <Inp label="Nom de la compagnie *" value={extra.nom_assureur} onChange={e('nom_assureur')} placeholder="NSIA Assurances..." />
                </View>
              )}

              <TouchableOpacity onPress={handleRegister} disabled={loading}
                style={{ backgroundColor: loading ? '#1E2F42' : C.green, borderRadius: C.r, padding: 16, alignItems: 'center', marginBottom: 12 }}>
                {loading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Créer mon compte ✓</Text>
                }
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
