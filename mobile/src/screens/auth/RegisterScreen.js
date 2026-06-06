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

// ── Tous les profils disponibles ──────────────────────────────────
const ROLES = [
  {
    value: 'patient',
    label: 'Patient',
    icon:  '👤',
    color: C.green,
    desc:  'Prendre des RDV, gérer mes ordonnances & soins',
    badge: null,
  },
  {
    value: 'medecin_independant',
    label: 'Médecin Conseil',
    icon:  '⭐',
    color: '#7C3AED',
    desc:  'Médecin de famille · Suivi privé · Consultations indépendantes',
    badge: 'MC',
  },
  {
    value: 'medecin',
    label: 'Médecin Résident',
    icon:  '🩺',
    color: C.teal,
    desc:  'Médecin employé d'une clinique ou d'un hôpital',
    badge: 'MR',
  },
  {
    value: 'pharmacie',
    label: 'Pharmacie',
    icon:  '💊',
    color: C.teal,
    desc:  'Gestion ordonnances, commandes & livraisons',
    badge: null,
  },
  {
    value: 'livreur',
    label: 'Livreur',
    icon:  '🛵',
    color: C.amber,
    desc:  'Gérer mes missions de livraison de médicaments',
    badge: null,
  },
  {
    value: 'clinique',
    label: 'Clinique / Hôpital',
    icon:  '🏥',
    color: C.blue,
    desc:  'Gérer planning, dossiers médicaux, facturation',
    badge: null,
  },
  {
    value: 'assureur',
    label: 'Assureur',
    icon:  '🛡️',
    color: C.amber,
    desc:  'Traiter les dossiers de remboursement tiers-payant',
    badge: null,
  },
  {
    value: 'imagerie',
    label: 'Imagerie Médicale',
    icon:  '🩻',
    color: '#8B5CF6',
    desc:  'Radiologie, IRM, Scanner, Échographie',
    badge: null,
  },
  {
    value: 'laboratoire',
    label: 'Laboratoire',
    icon:  '🧪',
    color: C.teal,
    desc:  'Analyses biologiques & résultats médicaux',
    badge: null,
  },
  {
    value: 'optique',
    label: 'Cabinet Optique',
    icon:  '🔭',
    color: '#6366F1',
    desc:  'Gestion stock montures, verres, ventes & ordonnances',
    badge: null,
  },
];

// ── Champs spécifiques par rôle ──────────────────────────────────
const EXTRA_FIELDS = {
  medecin_independant: [
    { key:'specialite',    label:'Spécialité *',          placeholder:'Médecine générale, Cardiologie...', required: true },
    { key:'numero_ordre',  label:'N° Ordre des médecins', placeholder:'OM-CI-2024-00001...' },
    { key:'tarif',         label:'Tarif consultation (FCFA)', placeholder:'Ex: 5000', keyboard:'numeric' },
  ],
  medecin: [
    { key:'specialite',    label:'Spécialité *',          placeholder:'Médecine générale, Chirurgie...', required: true },
    { key:'nom_clinique',  label:'Nom clinique employeur',placeholder:'Polyclinique Sainte Marie...' },
    { key:'numero_ordre',  label:'N° Ordre des médecins', placeholder:'OM-CI-2024-00001...' },
  ],
  pharmacie: [
    { key:'nom_pharmacie', label:'Nom de la pharmacie *', placeholder:'Pharmacie Centrale...', required: true },
    { key:'adresse',       label:'Adresse',               placeholder:'Quartier, Rue...' },
    { key:'num_autorisation', label:'N° Autorisation',    placeholder:'MSHP-2024-...' },
  ],
  clinique: [
    { key:'nom_clinique',  label:'Nom de la clinique *',  placeholder:'Polyclinique du Sud...', required: true },
    { key:'type_clinique', label:'Type d'établissement', placeholder:'Clinique, Hôpital, Cabinet...' },
    { key:'adresse',       label:'Adresse',               placeholder:'Quartier, Rue...' },
  ],
  assureur: [
    { key:'nom_assureur',  label:'Nom de la compagnie *', placeholder:'NSIA Assurances CI...', required: true },
    { key:'num_agrement',  label:'N° Agrément',           placeholder:'CIMA-2024-...' },
  ],
  imagerie: [
    { key:'nom_etab',      label:'Nom de l'établissement *', placeholder:'Centre d'Imagerie...', required: true },
    { key:'adresse',       label:'Adresse',               placeholder:'Quartier, Rue...' },
  ],
  laboratoire: [
    { key:'nom_etab',      label:'Nom du laboratoire *',  placeholder:'Laboratoire MediLab...', required: true },
    { key:'adresse',       label:'Adresse',               placeholder:'Quartier, Rue...' },
  ],
  optique: [
    { key:'nom_optique',   label:'Nom du cabinet *',      placeholder:'Vision Plus Optique...', required: true },
    { key:'adresse',       label:'Adresse',               placeholder:'Quartier, Rue...' },
  ],
  livreur: [
    { key:'num_permis',    label:'N° Permis de conduire', placeholder:'CI-2024-...' },
    { key:'type_vehicule', label:'Type de véhicule',      placeholder:'Moto, Voiture, Vélo...' },
  ],
};

const Inp = ({ label, value, onChange, placeholder, keyboardType, secure, required }) => (
  <View style={{ marginBottom: 14 }}>
    <Text style={{ fontSize: 11, fontWeight: '700', color: C.dim, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
      {label}{required && <Text style={{ color: C.red }}> *</Text>}
    </Text>
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

const ModalSelector = ({ label, value, options, onSelect, placeholder }) => {
  const [visible, setVisible] = useState(false);
  const [search,  setSearch]  = useState('');
  const filtered = options.filter(o => (o.label || o).toLowerCase().includes(search.toLowerCase()));
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
            <TextInput value={search} onChangeText={setSearch} placeholder="Rechercher..."
              placeholderTextColor={C.dim}
              style={{ backgroundColor: C.input, borderRadius: C.r, paddingHorizontal: 14, paddingVertical: 10, color: C.text, fontSize: 14, borderWidth: 1, borderColor: C.border }} />
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
  const [step,  setStep]  = useState(1);
  const [role,  setRole]  = useState('');
  const [pays,  setPays]  = useState('CI');
  const [ville, setVille] = useState('');
  const [form,  setForm]  = useState({ prenom:'', nom:'', email:'', password:'', confirm:'', telephone:'' });
  const [extra, setExtra] = useState({});
  const f = k => v => setForm(p => ({...p, [k]: v}));
  const e = k => v => setExtra(p => ({...p, [k]: v}));

  const roleInfo    = ROLES.find(r => r.value === role);
  const extraFields = EXTRA_FIELDS[role] || [];
  const paysOptions = PAYS_LISTE.map(p => ({ value: p.code, label: p.nom }));
  const villesOptions = getVillesByPays(pays);

  const handleRegister = async () => {
    if (!form.prenom || !form.nom || !form.email || !form.password) {
      Alert.alert('Champs requis', 'Remplissez prénom, nom, email et mot de passe'); return;
    }
    if (form.password.length < 6) {
      Alert.alert('Mot de passe', 'Minimum 6 caractères'); return;
    }
    if (form.password !== form.confirm) {
      Alert.alert('Mots de passe', 'Les mots de passe ne correspondent pas'); return;
    }
    if (!ville) {
      Alert.alert('Ville requise', 'Sélectionnez votre ville'); return;
    }
    // Vérifier champs requis spécifiques
    for (const field of extraFields) {
      if (field.required && !extra[field.key]) {
        Alert.alert('Champ requis', field.label.replace(' *', '')); return;
      }
    }
    const { confirm, ...formData } = form;
    const payload = { ...formData, ...extra, role, pays_code: pays, ville };
    const res = await doRegister(payload);
    if (!res.success) Alert.alert('Erreur inscription', res.message);
  };

  // ── ÉTAPE 1 : Choix du profil ────────────────────────────────
  if (step === 1) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: C.border, gap: 12 }}>
        <TouchableOpacity onPress={() => navigation?.goBack?.()}>
          <Text style={{ color: C.muted, fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={{ color: C.text, fontSize: 17, fontWeight: '900' }}>Créer un compte</Text>
          <Text style={{ color: C.dim, fontSize: 11, marginTop: 1 }}>Étape 1/2 — Choisissez votre profil</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
        <Text style={{ color: C.muted, fontSize: 13, marginBottom: 16, lineHeight: 20 }}>
          Sélectionnez le profil qui correspond à votre situation. Ce choix détermine vos accès et fonctionnalités.
        </Text>
        {ROLES.map(r => (
          <TouchableOpacity key={r.value} onPress={() => setRole(r.value)}
            style={{
              backgroundColor: role === r.value ? `${r.color}18` : C.card,
              borderRadius: 14, padding: 16, marginBottom: 10,
              borderWidth: 1.5, borderColor: role === r.value ? r.color : C.border,
              flexDirection: 'row', alignItems: 'center', gap: 14,
            }}>
            <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: `${r.color}20`, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 24 }}>{r.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <Text style={{ color: role === r.value ? r.color : C.text, fontWeight: '800', fontSize: 15 }}>{r.label}</Text>
                {r.badge && (
                  <View style={{ backgroundColor: `${r.color}25`, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ color: r.color, fontSize: 10, fontWeight: '800' }}>{r.badge}</Text>
                  </View>
                )}
              </View>
              <Text style={{ color: C.dim, fontSize: 12, lineHeight: 17 }}>{r.desc}</Text>
            </View>
            <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: role === r.value ? r.color : C.border, backgroundColor: role === r.value ? r.color : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
              {role === r.value && <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900' }}>✓</Text>}
            </View>
          </TouchableOpacity>
        ))}
        <TouchableOpacity onPress={() => { if (!role) { Alert.alert('Requis', 'Sélectionnez votre profil'); return; } setStep(2); }}
          style={{ backgroundColor: role ? (roleInfo?.color || C.green) : '#1E2F42', borderRadius: C.r, padding: 16, alignItems: 'center', marginTop: 8 }}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
            {role ? `Continuer avec ${roleInfo?.label} →` : 'Continuer →'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation?.navigate?.('Login')} style={{ marginTop: 14, alignItems: 'center' }}>
          <Text style={{ color: C.dim, fontSize: 13 }}>Déjà un compte ? <Text style={{ color: C.greenL }}>Se connecter</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );

  // ── ÉTAPE 2 : Informations du compte ────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: C.border, gap: 12 }}>
        <TouchableOpacity onPress={() => setStep(1)}>
          <Text style={{ color: C.muted, fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.text, fontSize: 17, fontWeight: '900' }}>Créer un compte</Text>
          <Text style={{ color: roleInfo?.color || C.greenL, fontSize: 11, marginTop: 1, fontWeight: '700' }}>
            Étape 2/2 — {roleInfo?.icon} {roleInfo?.label}
          </Text>
        </View>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

          {/* Infos personnelles */}
          <View style={{ backgroundColor: C.card, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.border }}>
            <Text style={{ color: C.text, fontWeight: '800', fontSize: 14, marginBottom: 14 }}>🪪 Informations personnelles</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Inp label="Prénom" value={form.prenom} onChange={f('prenom')} placeholder="Adjoua" required />
              </View>
              <View style={{ flex: 1 }}>
                <Inp label="Nom" value={form.nom} onChange={f('nom')} placeholder="Koné" required />
              </View>
            </View>
            <Inp label="Email" value={form.email} onChange={f('email')} placeholder="email@exemple.com" keyboardType="email-address" required />
            <Inp label="Mot de passe" value={form.password} onChange={f('password')} placeholder="Minimum 6 caractères" secure required />
            <Inp label="Confirmer le mot de passe" value={form.confirm} onChange={f('confirm')} placeholder="Répétez le mot de passe" secure required />
            <Inp label="Téléphone" value={form.telephone} onChange={f('telephone')} placeholder="+225 07 00 00 00" keyboardType="phone-pad" />
          </View>

          {/* Localisation */}
          <View style={{ backgroundColor: C.card, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.border }}>
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
              placeholder={pays ? 'Sélectionner une ville...' : 'Choisissez d'abord un pays'}
            />
          </View>

          {/* Champs spécifiques selon le rôle */}
          {extraFields.length > 0 && (
            <View style={{ backgroundColor: C.card, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: `${roleInfo?.color || C.border}40` }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Text style={{ fontSize: 18 }}>{roleInfo?.icon}</Text>
                <Text style={{ color: roleInfo?.color || C.text, fontWeight: '800', fontSize: 14 }}>
                  Informations {roleInfo?.label}
                </Text>
                {roleInfo?.badge && (
                  <View style={{ backgroundColor: `${roleInfo.color}25`, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ color: roleInfo.color, fontSize: 10, fontWeight: '800' }}>{roleInfo.badge}</Text>
                  </View>
                )}
              </View>
              {extraFields.map(field => (
                <Inp
                  key={field.key}
                  label={field.label}
                  value={extra[field.key]}
                  onChange={e(field.key)}
                  placeholder={field.placeholder}
                  keyboardType={field.keyboard}
                  required={field.required}
                />
              ))}
              {/* Message spécifique MC vs MR */}
              {role === 'medecin_independant' && (
                <View style={{ backgroundColor: `${C.purple}10`, borderRadius: 10, padding: 10, marginTop: 4 }}>
                  <Text style={{ color: '#C4B5FD', fontSize: 12, lineHeight: 18 }}>
                    ⭐ En tant que Médecin Conseil (MC), votre profil sera visible publiquement. Les patients pourront vous contacter directement pour des consultations privées.
                  </Text>
                </View>
              )}
              {role === 'medecin' && (
                <View style={{ backgroundColor: `${C.teal}10`, borderRadius: 10, padding: 10, marginTop: 4 }}>
                  <Text style={{ color: '#5EEAD4', fontSize: 12, lineHeight: 18 }}>
                    🏥 En tant que Médecin Résident (MR), vous serez rattaché à une clinique. Votre planning sera géré par l'établissement employeur.
                  </Text>
                </View>
              )}
            </View>
          )}

          <TouchableOpacity onPress={handleRegister} disabled={loading}
            style={{ backgroundColor: loading ? '#1E2F42' : (roleInfo?.color || C.green), borderRadius: C.r, padding: 16, alignItems: 'center', marginBottom: 12 }}>
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Créer mon compte ✓</Text>
            }
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
