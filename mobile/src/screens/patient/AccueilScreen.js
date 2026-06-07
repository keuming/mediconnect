import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, Modal, TextInput, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, FlatList, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { patientAPI } from '../../services/api';
import { C, Badge, SectionTitle, fmtDate, fmtHeure } from '../../components/UI';

// ─── Helpers ──────────────────────────────────────────────────────────────
const calcAge = (d) => {
  if (!d) return null;
  return Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
};
const validerMembre = (statut, dob) => {
  if (statut === 'pere' || statut === 'mere') return { ok: true };
  const age = calcAge(dob);
  if (age === null) return { ok: false, msg: 'Date de naissance requise' };
  if (age > 18) return { ok: false, msg: `Un enfant doit avoir 18 ans ou moins (âge : ${age} ans)` };
  return { ok: true };
};
const STATUTS_FAM = [
  { value: 'pere', label: 'Père', icon: '👨' },
  { value: 'mere', label: 'Mère', icon: '👩' },
  { value: 'enfant', label: 'Enfant', icon: '👧' },
];
const INP = { backgroundColor: '#0A1520', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: '#F0F6FF', fontSize: 14, borderWidth: 1, borderColor: '#1a2d42', marginBottom: 14 };
const LBL = { fontSize: 10, fontWeight: '700', color: '#5A7A94', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 };

// ─── Carte MediConnect ────────────────────────────────────────────────────
const labelIMC = (imc) => {
  if (!imc) return null;
  if (imc < 18.5) return { label: 'Insuffisance', color: '#60A5FA' };
  if (imc < 25)   return { label: 'Normal',        color: '#34D399' };
  if (imc < 30)   return { label: 'Surpoids',      color: '#FCD34D' };
  return               { label: 'Obésité',     color: '#F97316' };
};

function MediConnectCard({ carte }) {
  if (!carte) return null;
  const imc     = carte.imc || (carte.poids && carte.taille ? Math.round(carte.poids / Math.pow(carte.taille/100,2) * 10)/10 : null);
  const imcInfo = labelIMC(imc);
  return (
    <View style={s.mcCard}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={s.mcBrand}><Text style={{ color: '#34D399' }}>Medi</Text>Connect Card</Text>
        <View style={s.mcChip} />
      </View>
      <Text style={s.mcNum}>•••• •••• •••• {String(carte.numero || '0000').slice(-4)}</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 12, marginBottom: 12 }}>
        <View><Text style={s.mcLabel}>Titulaire</Text><Text style={s.mcValue}>{(carte.nom_complet || '').toUpperCase()}</Text></View>
        <View><Text style={s.mcLabel}>Validité</Text><Text style={s.mcValue}>{carte.validite || '—'}</Text></View>
        <View style={[s.mcBadge, carte.statut === 'active' ? s.mcBadgeActive : s.mcBadgePending]}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: carte.statut === 'active' ? '#34D399' : '#FCD34D' }}>
            {carte.statut === 'active' ? '✓ Active' : '⏳ En cours'}
          </Text>
        </View>
      </View>
      {/* Données médicales */}
      <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 10, gap: 0 }}>
        {carte.taille && (
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 }}>Taille</Text>
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', marginTop: 2 }}>{carte.taille} cm</Text>
          </View>
        )}
        {carte.poids && (
          <View style={{ flex: 1, alignItems: 'center', borderLeftWidth: carte.taille ? 1 : 0, borderLeftColor: 'rgba(255,255,255,0.1)' }}>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 }}>Poids</Text>
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', marginTop: 2 }}>{carte.poids} kg</Text>
          </View>
        )}
        {imc && imcInfo && (
          <View style={{ flex: 1, alignItems: 'center', borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.1)' }}>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 }}>IMC</Text>
            <Text style={{ color: imcInfo.color, fontSize: 14, fontWeight: '700', marginTop: 2 }}>{imc}</Text>
            <Text style={{ color: imcInfo.color, fontSize: 9, fontWeight: '700' }}>{imcInfo.label}</Text>
          </View>
        )}
        {carte.groupe_sanguin && (
          <View style={{ flex: 1, alignItems: 'center', borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.1)' }}>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 }}>Groupe</Text>
            <Text style={{ color: '#F87171', fontSize: 14, fontWeight: '900', marginTop: 2 }}>{carte.groupe_sanguin}</Text>
          </View>
        )}
      </View>
      <Text style={s.mcWatermark}>+</Text>
    </View>
  );
}

// ─── Bloc Famille ─────────────────────────────────────────────────────────
function FamilleBlock({ membres, onAjouter }) {
  if (!membres?.length) return (
    <TouchableOpacity style={s.famEmpty} onPress={onAjouter} activeOpacity={0.8}>
      <Text style={{ fontSize: 20 }}>👨‍👩‍👧</Text>
      <Text style={{ color: '#5A7A94', fontSize: 13 }}>Lier des membres de famille</Text>
      <Text style={{ color: '#34D399', fontSize: 13, fontWeight: '700' }}>+</Text>
    </TouchableOpacity>
  );
  return (
    <View style={s.familleCard}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={s.familleTitle}>Famille — {membres.length} carte{membres.length > 1 ? 's' : ''}</Text>
      </View>
      {membres.map((m, i) => {
        const age = calcAge(m.date_naissance);
        const sf = STATUTS_FAM.find(x => x.value === m.statut_famille) || STATUTS_FAM[2];
        return (
          <View key={m.id || i} style={[s.famMember, i === membres.length - 1 && { borderBottomWidth: 0 }]}>
            <View style={[s.famAvatar, { backgroundColor: '#0A8F5820' }]}><Text style={{ fontSize: 20 }}>{sf.icon}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.famName}>{m.prenom} {m.nom}</Text>
              <Text style={s.famRole}>{sf.label}{age !== null ? ` · ${age} ans` : ''}{m.numero_carte ? ` · #${String(m.numero_carte).slice(-4)}` : ''}</Text>
            </View>
            <View style={[s.famStatus, m.carte_active ? s.famStatusActive : s.famStatusPending]}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: m.carte_active ? '#34D399' : '#FCD34D' }}>{m.carte_active ? 'Active' : 'En cours'}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── Modal Menu ───────────────────────────────────────────────────────────
function ModalMenu({ visible, onClose, onAction }) {
  const ITEMS = [
    { icon: '👤', label: 'Mon profil',               key: 'profil' },
    { icon: '💳', label: 'Ajouter une carte famille', key: 'carte' },
    { icon: '💰', label: 'Payer mon abonnement',     key: 'abonnement' },
    { icon: '⭐', label: 'Demande médecin conseil',  key: 'medecin_conseil' },
    { icon: '🛡️', label: 'Souscrire une assurance',  key: 'assurance' },
    { icon: '🌐', label: 'Qui sommes nous ?',         key: 'about' },
  ];
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <TouchableOpacity style={s.menuOverlay} activeOpacity={1} onPress={onClose}>
        <View style={s.menuBox}>
          <Text style={s.menuTitle}>Menu</Text>
          {ITEMS.map(item => (
            <TouchableOpacity key={item.key} style={s.menuItem} onPress={() => { onClose(); onAction(item.key); }}>
              <Text style={{ fontSize: 20 }}>{item.icon}</Text>
              <Text style={s.menuItemLabel}>{item.label}</Text>
              <Text style={{ color: '#2A3F55', fontSize: 16 }}>›</Text>
            </TouchableOpacity>
          ))}
          {/* Séparateur */}
          <View style={{ height: 1, backgroundColor: '#1a2d42', marginHorizontal: 10, marginVertical: 4 }} />
          {/* Copyright */}
          <View style={{ paddingHorizontal: 14, paddingVertical: 10 }}>
            <Text style={{ color: '#2A3F55', fontSize: 10, textAlign: 'center', lineHeight: 16 }}>
              © MediConnect Africa{'\n'}
              <Text style={{ color: '#1a2d42', fontWeight: '700' }}>Powered by Inteligence Database</Text>
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Modal Ajouter Membre Famille ─────────────────────────────────────────
function ModalAjouterMembre({ visible, onClose, onConfirm, loading }) {
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [dob, setDob] = useState('');
  const [statut, setStatut] = useState('');
  const [email, setEmail] = useState('');
  const reset = () => { setPrenom(''); setNom(''); setDob(''); setStatut(''); setEmail(''); };
  const age = calcAge(dob);
  const confirm = () => {
    if (!prenom || !nom || !statut) { Alert.alert('Champs requis', 'Renseignez prénom, nom et statut.'); return; }
    if (statut === 'enfant' && !dob) { Alert.alert('Date requise', 'La date de naissance est obligatoire pour un enfant.'); return; }
    const v = validerMembre(statut, dob);
    if (!v.ok) { Alert.alert('Règle famille', v.msg); return; }
    onConfirm({ prenom, nom, date_naissance: dob, statut_famille: statut, email });
    reset();
  };
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#060E18' }}>
        <View style={s.modalHeader}>
          <TouchableOpacity onPress={() => { reset(); onClose(); }}><Text style={{ color: '#5A7A94', fontSize: 22 }}>←</Text></TouchableOpacity>
          <Text style={s.modalTitle}>Ajouter un membre</Text>
          <View style={{ width: 30 }} />
        </View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <Text style={LBL}>Statut familial *</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18 }}>
              {STATUTS_FAM.map(sf => (
                <TouchableOpacity key={sf.value} onPress={() => setStatut(sf.value)}
                  style={{ flex: 1, borderRadius: 10, padding: 12, alignItems: 'center', gap: 4, backgroundColor: statut === sf.value ? 'rgba(10,143,88,0.15)' : '#0D1B2A', borderWidth: 1.5, borderColor: statut === sf.value ? '#0A8F58' : '#1a2d42' }}>
                  <Text style={{ fontSize: 22 }}>{sf.icon}</Text>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: statut === sf.value ? '#34D399' : '#5A7A94' }}>{sf.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {statut === 'enfant' && (
              <View style={{ backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)', marginBottom: 14 }}>
                <Text style={{ color: '#FCD34D', fontSize: 12, lineHeight: 18 }}>⚠️ Un enfant doit avoir 18 ans ou moins.</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><Text style={LBL}>Prénom *</Text><TextInput value={prenom} onChangeText={setPrenom} placeholder="Aya" placeholderTextColor="#2A3F55" style={INP} /></View>
              <View style={{ flex: 1 }}><Text style={LBL}>Nom *</Text><TextInput value={nom} onChangeText={setNom} placeholder="Koné" placeholderTextColor="#2A3F55" style={INP} /></View>
            </View>
            <Text style={LBL}>Date de naissance {statut === 'enfant' ? '*' : ''}</Text>
            <TextInput value={dob} onChangeText={setDob} placeholder="AAAA-MM-JJ" placeholderTextColor="#2A3F55" style={INP} />
            {dob.length === 10 && age !== null && (
              <View style={{ backgroundColor: '#0D1B2A', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#1a2d42', marginBottom: 14 }}>
                <Text style={{ color: '#8BA3B8', fontSize: 12 }}>Âge calculé : <Text style={{ color: age > 18 && statut === 'enfant' ? '#F87171' : '#34D399', fontWeight: '700' }}>{age} ans{age > 18 && statut === 'enfant' ? ' — ⚠️ trop âgé' : ''}</Text></Text>
              </View>
            )}
            <Text style={LBL}>Email (optionnel)</Text>
            <TextInput value={email} onChangeText={setEmail} placeholder="membre@famille.ci" placeholderTextColor="#2A3F55" keyboardType="email-address" autoCapitalize="none" style={INP} />
            <TouchableOpacity style={[s.btnPrimary, loading && { opacity: 0.6 }]} onPress={confirm} disabled={loading} activeOpacity={0.85}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnPrimaryText}>Ajouter ce membre</Text>}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Modal Commander Carte ────────────────────────────────────────────────
function ModalCommanderCarte({ visible, onClose, onConfirm, loading }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#060E18' }}>
        <View style={s.modalHeader}>
          <TouchableOpacity onPress={onClose}><Text style={{ color: '#5A7A94', fontSize: 22 }}>←</Text></TouchableOpacity>
          <Text style={s.modalTitle}>Commander une carte</Text>
          <View style={{ width: 30 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <View style={s.modalInfoCard}>
            <Text style={{ fontSize: 40, textAlign: 'center', marginBottom: 12 }}>💳</Text>
            <Text style={s.modalInfoTitle}>MediConnect Card</Text>
            <Text style={s.modalInfoSub}>Accédez à tous les soins du réseau MediConnect pour vous et votre famille.</Text>
          </View>
          {[['🏥','Accès réseau cliniques & hôpitaux'],['💊','Paiement pharmacies partenaires'],['👨‍👩‍👧','Cartes famille liées'],['🛡️','Couverture assurance maladie'],['📱','QR code & mobile money']].map(([icon, text], i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <Text style={{ fontSize: 20 }}>{icon}</Text>
              <Text style={{ color: '#8BA3B8', fontSize: 13, flex: 1, lineHeight: 18 }}>{text}</Text>
            </View>
          ))}
          <TouchableOpacity style={[s.btnPrimary, { marginTop: 12 }, loading && { opacity: 0.6 }]} onPress={onConfirm} disabled={loading} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnPrimaryText}>Confirmer la commande</Text>}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Modal Ajouter Ordonnance ─────────────────────────────────────────────
function ModalOrdonnance({ visible, onClose, onConfirm, loading }) {
  const [medicament, setMedicament] = useState('');
  const [posologie,  setPosologie]  = useState('');
  const [duree,      setDuree]      = useState('');
  const [note,       setNote]       = useState('');
  const reset = () => { setMedicament(''); setPosologie(''); setDuree(''); setNote(''); };
  const confirm = () => {
    if (!medicament) { Alert.alert('Champ requis', 'Renseignez au moins le médicament.'); return; }
    onConfirm({ medicament, posologie, duree, note });
    reset();
  };
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#060E18' }}>
        <View style={s.modalHeader}>
          <TouchableOpacity onPress={() => { reset(); onClose(); }}><Text style={{ color: '#5A7A94', fontSize: 22 }}>←</Text></TouchableOpacity>
          <Text style={s.modalTitle}>Ajouter une ordonnance</Text>
          <View style={{ width: 30 }} />
        </View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <Text style={LBL}>Médicament *</Text>
            <TextInput value={medicament} onChangeText={setMedicament} placeholder="Ex: Paracétamol 500mg" placeholderTextColor="#2A3F55" style={INP} />
            <Text style={LBL}>Posologie</Text>
            <TextInput value={posologie} onChangeText={setPosologie} placeholder="Ex: 1 comprimé 3x/jour" placeholderTextColor="#2A3F55" style={INP} />
            <Text style={LBL}>Durée</Text>
            <TextInput value={duree} onChangeText={setDuree} placeholder="Ex: 7 jours" placeholderTextColor="#2A3F55" style={INP} />
            <Text style={LBL}>Notes du médecin</Text>
            <TextInput value={note} onChangeText={setNote} placeholder="Notes additionnelles..." placeholderTextColor="#2A3F55" multiline numberOfLines={4} style={[INP, { height: 100, textAlignVertical: 'top' }]} />
            <TouchableOpacity style={[s.btnPrimary, loading && { opacity: 0.6 }]} onPress={confirm} disabled={loading} activeOpacity={0.85}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnPrimaryText}>Enregistrer l'ordonnance</Text>}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Modal Commander Médicament ───────────────────────────────────────────
function ModalMedicaments({ visible, onClose, medicaments, onCommander }) {
  const [search, setSearch] = useState('');
  const filtered = (medicaments || []).filter(m => m.nom?.toLowerCase().includes(search.toLowerCase()));
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#060E18' }}>
        <View style={s.modalHeader}>
          <TouchableOpacity onPress={onClose}><Text style={{ color: '#5A7A94', fontSize: 22 }}>←</Text></TouchableOpacity>
          <Text style={s.modalTitle}>Médicaments</Text>
          <View style={{ width: 30 }} />
        </View>
        <View style={{ padding: 12 }}>
          <TextInput value={search} onChangeText={setSearch} placeholder="Rechercher un médicament..." placeholderTextColor="#2A3F55" style={[INP, { marginBottom: 0 }]} />
        </View>
        <FlatList
          data={filtered}
          keyExtractor={(item, i) => String(item.id || i)}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          ListEmptyComponent={<Text style={{ color: '#5A7A94', textAlign: 'center', marginTop: 40 }}>Aucun médicament trouvé</Text>}
          renderItem={({ item }) => (
            <View style={{ backgroundColor: '#0D1B2A', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#1a2d42', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 22 }}>💊</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#F0F6FF', fontWeight: '700', fontSize: 14 }}>{item.nom}</Text>
                <Text style={{ color: '#5A7A94', fontSize: 12, marginTop: 2 }}>{item.forme || ''} · {item.dosage || ''}</Text>
                <Text style={{ color: '#34D399', fontWeight: '700', fontSize: 13, marginTop: 4 }}>{item.prix ? `${item.prix} FCFA` : 'Prix sur demande'}</Text>
              </View>
              <TouchableOpacity onPress={() => onCommander(item)} style={s.btnCmd}>
                <Text style={s.btnCmdText}>Commander</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

// ─── Modal Pharmacies de Garde ────────────────────────────────────────────
function ModalGarde({ visible, onClose, pharmacies }) {
  const [pays,   setPays]   = useState('CI');
  const [search, setSearch] = useState('');
  const filtered = (pharmacies || []).filter(p =>
    (p.pays_code === pays || !pays) &&
    (p.nom?.toLowerCase().includes(search.toLowerCase()) || p.ville?.toLowerCase().includes(search.toLowerCase()))
  );
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#060E18' }}>
        <View style={s.modalHeader}>
          <TouchableOpacity onPress={onClose}><Text style={{ color: '#5A7A94', fontSize: 22 }}>←</Text></TouchableOpacity>
          <Text style={s.modalTitle}>Pharmacies de garde</Text>
          <View style={{ width: 30 }} />
        </View>
        <View style={{ padding: 12, gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {['CI','SN','CM','ML','BF'].map(p => (
              <TouchableOpacity key={p} onPress={() => setPays(p)}
                style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: pays === p ? '#0A8F58' : '#0D1B2A', borderWidth: 1, borderColor: pays === p ? '#0A8F58' : '#1a2d42' }}>
                <Text style={{ color: pays === p ? '#fff' : '#5A7A94', fontSize: 12, fontWeight: '700' }}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput value={search} onChangeText={setSearch} placeholder="Ville ou nom de pharmacie..." placeholderTextColor="#2A3F55" style={[INP, { marginBottom: 0 }]} />
        </View>
        <FlatList
          data={filtered}
          keyExtractor={(item, i) => String(item.id || i)}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          ListEmptyComponent={<Text style={{ color: '#5A7A94', textAlign: 'center', marginTop: 40 }}>Aucune pharmacie de garde trouvée</Text>}
          renderItem={({ item }) => (
            <View style={{ backgroundColor: '#0D1B2A', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#1a2d42' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <Text style={{ fontSize: 20 }}>🏪</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#F0F6FF', fontWeight: '700', fontSize: 14 }}>{item.nom}</Text>
                  <Text style={{ color: '#5A7A94', fontSize: 12 }}>{item.ville} · {item.pays_code}</Text>
                </View>
                <View style={{ backgroundColor: 'rgba(10,143,88,0.15)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(10,143,88,0.3)' }}>
                  <Text style={{ color: '#34D399', fontSize: 10, fontWeight: '700' }}>Garde</Text>
                </View>
              </View>
              {item.telephone && <Text style={{ color: '#8BA3B8', fontSize: 12 }}>📞 {item.telephone}</Text>}
              {item.adresse && <Text style={{ color: '#5A7A94', fontSize: 11, marginTop: 2 }}>📍 {item.adresse}</Text>}
            </View>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

// ─── Modal Mon Dossier ────────────────────────────────────────────────────
function ModalDossier({ visible, onClose, dossier, onAjouterNote, loading }) {
  const [tab,         setTab]         = useState('notes');
  const [noteText,    setNoteText]    = useState('');
  const [noteType,    setNoteType]    = useState('consultation');
  const [showForm,    setShowForm]    = useState(false);
  const NOTE_TYPES = [
    { value: 'consultation', label: 'Consultation', icon: '📋' },
    { value: 'traitement',   label: 'Traitement',   icon: '💊' },
    { value: 'examen',       label: 'Examen',       icon: '🩻' },
    { value: 'analyse',      label: 'Analyse',      icon: '🧪' },
  ];
  const TABS = [
    { key: 'notes',      label: 'Notes',      icon: '📋' },
    { key: 'traitements',label: 'Traitements',icon: '💊' },
    { key: 'examens',    label: 'Examens',    icon: '🩻' },
  ];
  const confirm = () => {
    if (!noteText.trim()) { Alert.alert('Requis', 'Rédigez une note.'); return; }
    onAjouterNote({ type: noteType, contenu: noteText, date: new Date().toISOString() });
    setNoteText(''); setShowForm(false);
  };
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#060E18' }}>
        <View style={s.modalHeader}>
          <TouchableOpacity onPress={onClose}><Text style={{ color: '#5A7A94', fontSize: 22 }}>←</Text></TouchableOpacity>
          <Text style={s.modalTitle}>Mon dossier médical</Text>
          <TouchableOpacity onPress={() => setShowForm(!showForm)}>
            <Text style={{ color: '#34D399', fontSize: 22 }}>+</Text>
          </TouchableOpacity>
        </View>
        {/* Tabs */}
        <View style={{ flexDirection: 'row', padding: 12, gap: 8 }}>
          {TABS.map(t => (
            <TouchableOpacity key={t.key} onPress={() => setTab(t.key)}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 10, backgroundColor: tab === t.key ? '#0A8F58' : '#0D1B2A', borderWidth: 1, borderColor: tab === t.key ? '#0A8F58' : '#1a2d42' }}>
              <Text style={{ fontSize: 12 }}>{t.icon}</Text>
              <Text style={{ color: tab === t.key ? '#fff' : '#5A7A94', fontSize: 11, fontWeight: '700' }}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {/* Formulaire ajout note */}
          {showForm && (
            <View style={{ backgroundColor: '#0D1B2A', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#1a2d42', marginBottom: 16 }}>
              <Text style={[LBL, { marginBottom: 10 }]}>Type de note</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                {NOTE_TYPES.map(nt => (
                  <TouchableOpacity key={nt.value} onPress={() => setNoteType(nt.value)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: noteType === nt.value ? 'rgba(10,143,88,0.2)' : '#0A1520', borderWidth: 1, borderColor: noteType === nt.value ? '#0A8F58' : '#1a2d42' }}>
                    <Text style={{ fontSize: 14 }}>{nt.icon}</Text>
                    <Text style={{ color: noteType === nt.value ? '#34D399' : '#5A7A94', fontSize: 12, fontWeight: '700' }}>{nt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={LBL}>Contenu de la note</Text>
              <TextInput value={noteText} onChangeText={setNoteText} placeholder="Saisissez la note médicale..." placeholderTextColor="#2A3F55" multiline numberOfLines={5} style={[INP, { height: 120, textAlignVertical: 'top' }]} />
              <TouchableOpacity style={[s.btnPrimary, loading && { opacity: 0.6 }]} onPress={confirm} disabled={loading} activeOpacity={0.85}>
                {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnPrimaryText}>Enregistrer</Text>}
              </TouchableOpacity>
            </View>
          )}
          {/* Liste notes */}
          {(dossier?.[tab] || []).length === 0
            ? <Text style={{ color: '#5A7A94', textAlign: 'center', marginTop: 40 }}>Aucune entrée pour cette catégorie</Text>
            : (dossier?.[tab] || []).map((n, i) => (
              <View key={i} style={{ backgroundColor: '#0D1B2A', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#1a2d42', marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ color: '#34D399', fontSize: 11, fontWeight: '700' }}>{n.medecin || 'Dr. —'}</Text>
                  <Text style={{ color: '#5A7A94', fontSize: 11 }}>{fmtDate(n.date)}</Text>
                </View>
                <Text style={{ color: '#F0F6FF', fontSize: 13, lineHeight: 20 }}>{n.contenu}</Text>
              </View>
            ))
          }
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Modal Médecin Conseil ────────────────────────────────────────────────
function ModalMedecinConseil({ visible, onClose, medecins, onDemander, loading }) {
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState(null);
  const [message,  setMessage]  = useState('');
  const filtered = (medecins || []).filter(m =>
    `${m.prenom} ${m.nom} ${m.specialite}`.toLowerCase().includes(search.toLowerCase())
  );
  const confirm = () => {
    if (!selected) { Alert.alert('Requis', 'Sélectionnez un médecin conseil.'); return; }
    onDemander({ medecin_id: selected.id, message });
  };
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#060E18' }}>
        <View style={s.modalHeader}>
          <TouchableOpacity onPress={onClose}><Text style={{ color: '#5A7A94', fontSize: 22 }}>←</Text></TouchableOpacity>
          <Text style={s.modalTitle}>Médecin Conseil</Text>
          <View style={{ width: 30 }} />
        </View>
        <View style={{ padding: 12 }}>
          <TextInput value={search} onChangeText={setSearch} placeholder="Rechercher par nom ou spécialité..." placeholderTextColor="#2A3F55" style={[INP, { marginBottom: 0 }]} />
        </View>
        <FlatList
          data={filtered}
          keyExtractor={(item, i) => String(item.id || i)}
          contentContainerStyle={{ padding: 16, paddingBottom: 200, gap: 10 }}
          ListEmptyComponent={<Text style={{ color: '#5A7A94', textAlign: 'center', marginTop: 40 }}>Aucun médecin trouvé</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => setSelected(item)}
              style={{ backgroundColor: selected?.id === item.id ? 'rgba(10,143,88,0.15)' : '#0D1B2A', borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: selected?.id === item.id ? '#0A8F58' : '#1a2d42', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(124,58,237,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 22 }}>⭐</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#F0F6FF', fontWeight: '700', fontSize: 14 }}>Dr. {item.prenom} {item.nom}</Text>
                <Text style={{ color: '#5A7A94', fontSize: 12, marginTop: 2 }}>{item.specialite || 'Médecine générale'}</Text>
                {item.tarif && <Text style={{ color: '#34D399', fontSize: 12, marginTop: 2 }}>{item.tarif} FCFA / consultation</Text>}
              </View>
              {selected?.id === item.id && <Text style={{ color: '#34D399', fontSize: 20 }}>✓</Text>}
            </TouchableOpacity>
          )}
          ListFooterComponent={selected ? (
            <View style={{ marginTop: 16 }}>
              <Text style={LBL}>Message (optionnel)</Text>
              <TextInput value={message} onChangeText={setMessage} placeholder="Présentez votre situation..." placeholderTextColor="#2A3F55" multiline numberOfLines={4} style={[INP, { height: 100, textAlignVertical: 'top' }]} />
              <TouchableOpacity style={[s.btnPrimary, loading && { opacity: 0.6 }]} onPress={confirm} disabled={loading} activeOpacity={0.85}>
                {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnPrimaryText}>Envoyer la demande</Text>}
              </TouchableOpacity>
            </View>
          ) : null}
        />
      </SafeAreaView>
    </Modal>
  );
}

// ─── Modal Assurances ─────────────────────────────────────────────────────
function ModalAssurances({ visible, onClose, assurances, onQuotation, loading }) {
  const [selected, setSelected] = useState(null);
  const [message,  setMessage]  = useState('');
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#060E18' }}>
        <View style={s.modalHeader}>
          <TouchableOpacity onPress={onClose}><Text style={{ color: '#5A7A94', fontSize: 22 }}>←</Text></TouchableOpacity>
          <Text style={s.modalTitle}>Assurances partenaires</Text>
          <View style={{ width: 30 }} />
        </View>
        <FlatList
          data={assurances || []}
          keyExtractor={(item, i) => String(item.id || i)}
          contentContainerStyle={{ padding: 16, paddingBottom: 200, gap: 10 }}
          ListEmptyComponent={<Text style={{ color: '#5A7A94', textAlign: 'center', marginTop: 40 }}>Aucune assurance disponible</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => setSelected(item)}
              style={{ backgroundColor: selected?.id === item.id ? 'rgba(245,158,11,0.12)' : '#0D1B2A', borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: selected?.id === item.id ? '#F59E0B' : '#1a2d42' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <Text style={{ fontSize: 26 }}>🛡️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#F0F6FF', fontWeight: '700', fontSize: 14 }}>{item.nom}</Text>
                  <Text style={{ color: '#5A7A94', fontSize: 12 }}>{item.type || 'Assurance maladie'}</Text>
                </View>
                {selected?.id === item.id && <Text style={{ color: '#FCD34D', fontSize: 20 }}>✓</Text>}
              </View>
              {item.couvertures && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {item.couvertures.map((c, ci) => (
                    <View key={ci} style={{ backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)' }}>
                      <Text style={{ color: '#FCD34D', fontSize: 10 }}>{c}</Text>
                    </View>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          )}
          ListFooterComponent={selected ? (
            <View style={{ marginTop: 16 }}>
              <View style={{ backgroundColor: '#0D1B2A', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#1a2d42', marginBottom: 14 }}>
                <Text style={{ color: '#F0F6FF', fontWeight: '800', fontSize: 14, marginBottom: 4 }}>Demande de quotation</Text>
                <Text style={{ color: '#5A7A94', fontSize: 12, lineHeight: 18 }}>Vous allez envoyer une demande de devis à <Text style={{ color: '#FCD34D', fontWeight: '700' }}>{selected.nom}</Text> en vue d'une souscription.</Text>
              </View>
              <Text style={LBL}>Message (optionnel)</Text>
              <TextInput value={message} onChangeText={setMessage} placeholder="Informations complémentaires..." placeholderTextColor="#2A3F55" multiline numberOfLines={4} style={[INP, { height: 100, textAlignVertical: 'top' }]} />
              <TouchableOpacity style={[s.btnPrimary, { backgroundColor: '#B45309' }, loading && { opacity: 0.6 }]} onPress={() => onQuotation({ assureur_id: selected.id, message })} disabled={loading} activeOpacity={0.85}>
                {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnPrimaryText}>Demander une quotation</Text>}
              </TouchableOpacity>
            </View>
          ) : null}
        />
      </SafeAreaView>
    </Modal>
  );
}

// ─── Écran Principal ──────────────────────────────────────────────────────
export default function PatientAccueil({ navigation }) {
  const { user, logout } = useAuthStore();
  const queryClient      = useQueryClient();

  const [modalMenu,     setModalMenu]     = useState(false);
  const [modalCarte,    setModalCarte]    = useState(false);
  const [modalFamille,  setModalFamille]  = useState(false);
  const [modalOrd,      setModalOrd]      = useState(false);
  const [modalMeds,     setModalMeds]     = useState(false);
  const [modalGarde,    setModalGarde]    = useState(false);
  const [modalDossier,  setModalDossier]  = useState(false);
  const [modalConseil,  setModalConseil]  = useState(false);
  const [modalAssur,    setModalAssur]    = useState(false);

  const token = user?.token;

  const { data: rdvs,       refetch: refRdv, isFetching: ldRdv } = useQuery({ queryKey: ['p-rdvs'],    queryFn: () => patientAPI.getRDV(token).then(r => r.data || []) });
  const { data: cmds,       refetch: refCmd }                     = useQuery({ queryKey: ['p-cmds'],    queryFn: () => patientAPI.getCommandes?.(token).then(r => r.data || []) ?? Promise.resolve([]) });
  const { data: carteData }                                        = useQuery({ queryKey: ['p-carte'],   queryFn: () => patientAPI.getCarte?.(token).then(r => r.data) ?? Promise.resolve(null) });
  const { data: familleData }                                      = useQuery({ queryKey: ['p-famille'], queryFn: () => patientAPI.getFamille?.(token).then(r => r.data || []) ?? Promise.resolve([]) });
  const { data: medicaments }                                      = useQuery({ queryKey: ['medicaments'], queryFn: () => patientAPI.getMedicaments?.(token).then(r => r.data || []) ?? Promise.resolve([]) });
  const { data: pharmaciesGarde }                                  = useQuery({ queryKey: ['garde'],    queryFn: () => patientAPI.getPharmaciesGarde?.(token).then(r => r.data || []) ?? Promise.resolve([]) });
  const { data: dossierData }                                      = useQuery({ queryKey: ['p-dossier'],queryFn: () => patientAPI.getDossier(token).then(r => r.data) ?? Promise.resolve(null) });
  const { data: medecinsConseil }                                  = useQuery({ queryKey: ['med-conseils'], queryFn: () => patientAPI.getMedecinsConseil?.(token).then(r => r.data || []) ?? Promise.resolve([]) });
  const { data: assurances }                                       = useQuery({ queryKey: ['assurances'], queryFn: () => patientAPI.getAssurances?.(token).then(r => r.data || []) ?? Promise.resolve([]) });

  const inv = (key) => queryClient.invalidateQueries({ queryKey: [key] });

  const { mutate: commanderCarte,  isPending: ldCommanderCarte }  = useMutation({ mutationFn: () => patientAPI.commanderCarte?.(token), onSuccess: () => { inv('p-carte'); setModalCarte(false); Alert.alert('Commande envoyée', 'Votre carte est en cours de traitement.'); }, onError: e => Alert.alert('Erreur', e.message) });
  const { mutate: ajouterMembre,   isPending: ldMembre }          = useMutation({ mutationFn: d => patientAPI.ajouterMembreFamille?.(token, d), onSuccess: () => { inv('p-famille'); setModalFamille(false); Alert.alert('Membre ajouté', 'La carte du membre est en cours de création.'); }, onError: e => Alert.alert('Erreur', e.message) });
  const { mutate: ajouterOrd,      isPending: ldOrd }             = useMutation({ mutationFn: d => patientAPI.ajouterOrdonnance?.(token, d), onSuccess: () => { setModalOrd(false); Alert.alert('Enregistré', 'Ordonnance ajoutée à votre dossier.'); }, onError: e => Alert.alert('Erreur', e.message) });
  const { mutate: commanderMed,    isPending: ldMed }             = useMutation({ mutationFn: d => patientAPI.commanderMedicament?.(token, d), onSuccess: () => { setModalMeds(false); Alert.alert('Commande', 'Votre commande est envoyée à la pharmacie.'); }, onError: e => Alert.alert('Erreur', e.message) });
  const { mutate: ajouterNote,     isPending: ldNote }            = useMutation({ mutationFn: d => patientAPI.ajouterNoteDossier?.(token, d), onSuccess: () => { inv('p-dossier'); Alert.alert('Note ajoutée', 'La note a été enregistrée.'); }, onError: e => Alert.alert('Erreur', e.message) });
  const { mutate: demanderConseil, isPending: ldConseil }         = useMutation({ mutationFn: d => patientAPI.demanderMedecinConseil?.(token, d), onSuccess: () => { setModalConseil(false); Alert.alert('Demande envoyée', 'Le médecin conseil recevra votre demande.'); }, onError: e => Alert.alert('Erreur', e.message) });
  const { mutate: demanderQuote,   isPending: ldQuote }           = useMutation({ mutationFn: d => patientAPI.demanderQuotationAssurance?.(token, d), onSuccess: () => { setModalAssur(false); Alert.alert('Demande envoyée', 'L\'assureur vous contactera pour votre devis.'); }, onError: e => Alert.alert('Erreur', e.message) });

  const handleMenu = (key) => {
    if (key === 'profil')         navigation.navigate('Profil');  // → ProfilScreen
    if (key === 'carte')          setModalCarte(true);
    if (key === 'abonnement')     navigation.navigate('Abonnement');
    if (key === 'medecin_conseil')setModalConseil(true);
    if (key === 'assurance')      setModalAssur(true);
    if (key === 'about')          Linking.openURL('https://mediconnect4africa.com/mediconnect.html');
  };

  const refresh      = () => { refRdv(); refCmd(); };
  const prochainRdv  = rdvs?.find(r => !['annule','termine'].includes(r.statut));
  const cmdEnCours   = cmds?.filter(c => ['en_cours','confirmee'].includes(c.statut)) || [];
  const aUneCarte    = !!carteData;
  const membres      = familleData || [];

  const MODULES = [
    { icon: '📅', label: 'Prendre RDV',     color: C.green,  action: () => navigation.navigate('Mes RDV', { screen: 'RdvForm' }) },
    { icon: '🏥', label: 'Cliniques',        color: C.blue,   action: () => navigation.navigate('Plus') },
    { icon: '💊', label: 'Médicaments',      color: C.teal,   action: () => setModalMeds(true) },
    { icon: '📋', label: 'Mon dossier',      color: C.purple, action: () => setModalDossier(true) },
    { icon: '📄', label: 'Ordonnances',      color: '#10B981',action: () => setModalOrd(true) },
    { icon: '🏪', label: 'Pharmacies garde', color: C.red,    action: () => setModalGarde(true) },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={ldRdv} onRefresh={refresh} tintColor={C.green} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── En-tête ── */}
        <View style={s.topBar}>
          <View>
            <Text style={s.greeting}>Bonjour 👋</Text>
            <Text style={s.userName}>{user?.prenom || 'Patient'} {user?.nom || ''}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity onPress={logout} style={s.iconBtn}><Text style={{ fontSize: 18 }}>⏻</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setModalMenu(true)} style={s.iconBtn}><Text style={{ fontSize: 18 }}>☰</Text></TouchableOpacity>
          </View>
        </View>

        {/* ── Carte MediConnect ── */}
        {aUneCarte
          ? <MediConnectCard carte={carteData} />
          : (
            <TouchableOpacity style={s.noCard} onPress={() => setModalCarte(true)} activeOpacity={0.85}>
              <View style={s.noCardIcon}><Text style={{ fontSize: 26 }}>💳</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.noCardTitle}>Pas encore de carte MediConnect</Text>
                <Text style={s.noCardSub}>Accédez aux soins, gérez votre famille et payez sans cash.</Text>
              </View>
              <View style={s.btnCmd}><Text style={s.btnCmdText}>Commander</Text></View>
            </TouchableOpacity>
          )
        }

        {/* ── Famille ── */}
        {aUneCarte && <FamilleBlock membres={membres} onAjouter={() => setModalFamille(true)} />}

        {/* ── Alertes RDV ── */}
        {prochainRdv && (
          <TouchableOpacity style={s.rdvAlert} onPress={() => navigation.navigate('Mes RDV')} activeOpacity={0.85}>
            <View style={s.rdvAlertLeft}>
              <Text style={s.rdvAlertIcon}>📅</Text>
              <View>
                <Text style={s.rdvAlertTitle}>Prochain rendez-vous</Text>
                <Text style={s.rdvAlertDate}>{fmtDate(prochainRdv.date_rdv)} à {fmtHeure(prochainRdv.heure_rdv)}</Text>
                {prochainRdv.medecin_nom && <Text style={s.rdvAlertMedecin}>Dr. {prochainRdv.medecin_nom}</Text>}
              </View>
            </View>
            <Text style={{ color: C.greenL, fontSize: 18 }}>→</Text>
          </TouchableOpacity>
        )}
        {cmdEnCours.length > 0 && (
          <TouchableOpacity style={[s.rdvAlert, { borderColor: 'rgba(217,119,6,.3)', backgroundColor: 'rgba(217,119,6,.08)' }]} onPress={() => setModalMeds(true)} activeOpacity={0.85}>
            <View style={s.rdvAlertLeft}>
              <Text style={s.rdvAlertIcon}>🛵</Text>
              <View>
                <Text style={[s.rdvAlertTitle, { color: C.amberL }]}>Livraison en cours</Text>
                <Text style={s.rdvAlertDate}>{cmdEnCours.length} commande(s) en route</Text>
              </View>
            </View>
            <Text style={{ color: C.amberL, fontSize: 18 }}>→</Text>
          </TouchableOpacity>
        )}

        {/* ── Modules ── */}
        <SectionTitle title="Services" icon="✨" style={{ marginTop: 8 }} />
        <View style={s.grid}>
          {MODULES.map(m => (
            <TouchableOpacity key={m.label} style={[s.moduleCard, { borderColor: m.color + '30', backgroundColor: m.color + '10' }]} onPress={m.action} activeOpacity={0.8}>
              <Text style={{ fontSize: 28, marginBottom: 8 }}>{m.icon}</Text>
              <Text style={[s.moduleLabel, { color: m.color }]}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── RDV récents ── */}
        {rdvs?.length > 0 && (
          <>
            <SectionTitle title="Mes rendez-vous" icon="📅" action="Voir tout" onAction={() => navigation.navigate('Mes RDV')} style={{ marginTop: 8 }} />
            {rdvs.slice(0, 3).map(rdv => (
              <View key={rdv.id} style={s.rdvCard}>
                <View style={s.rdvCardLeft}>
                  <Text style={s.rdvCardDate}>{fmtDate(rdv.date_rdv)}</Text>
                  <Text style={s.rdvCardHeure}>{fmtHeure(rdv.heure_rdv)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.rdvCardMed}>{rdv.medecin_nom || 'Médecin'}</Text>
                  <Text style={s.rdvCardMotif} numberOfLines={1}>{rdv.motif || 'Consultation'}</Text>
                </View>
                <Badge label={rdv.statut === 'en_attente' ? 'En attente' : rdv.statut === 'termine' ? 'Terminé' : 'Confirmé'} color={rdv.statut === 'en_attente' ? 'amber' : rdv.statut === 'termine' ? 'gray' : 'green'} />
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* ── Modals ── */}
      <ModalMenu            visible={modalMenu}    onClose={() => setModalMenu(false)}    onAction={handleMenu} />
      <ModalCommanderCarte  visible={modalCarte}   onClose={() => setModalCarte(false)}   onConfirm={commanderCarte} loading={ldCommanderCarte} />
      <ModalAjouterMembre   visible={modalFamille} onClose={() => setModalFamille(false)} onConfirm={ajouterMembre}  loading={ldMembre} />
      <ModalOrdonnance      visible={modalOrd}     onClose={() => setModalOrd(false)}     onConfirm={ajouterOrd}     loading={ldOrd} />
      <ModalMedicaments     visible={modalMeds}    onClose={() => setModalMeds(false)}    medicaments={medicaments}  onCommander={commanderMed} />
      <ModalGarde           visible={modalGarde}   onClose={() => setModalGarde(false)}   pharmacies={pharmaciesGarde} />
      <ModalDossier         visible={modalDossier} onClose={() => setModalDossier(false)} dossier={dossierData}      onAjouterNote={ajouterNote} loading={ldNote} />
      <ModalMedecinConseil  visible={modalConseil} onClose={() => setModalConseil(false)} medecins={medecinsConseil} onDemander={demanderConseil} loading={ldConseil} />
      <ModalAssurances      visible={modalAssur}   onClose={() => setModalAssur(false)}   assurances={assurances}    onQuotation={demanderQuote} loading={ldQuote} />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  scroll:           { padding: 20, paddingBottom: 40 },
  topBar:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting:         { fontSize: 13, color: C.dim, marginBottom: 2 },
  userName:         { fontSize: 20, fontWeight: '800', color: C.text },
  iconBtn:          { width: 40, height: 40, borderRadius: 20, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  mcCard:           { borderRadius: 18, padding: 20, marginBottom: 14, overflow: 'hidden', backgroundColor: '#0A3D2E', borderWidth: 1, borderColor: '#0A8F58' },
  mcBrand:          { fontSize: 14, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  mcChip:           { width: 32, height: 24, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  mcNum:            { fontSize: 17, fontWeight: '700', color: '#fff', letterSpacing: 4, marginVertical: 4 },
  mcLabel:          { fontSize: 9, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  mcValue:          { fontSize: 12, color: '#fff', fontWeight: '600' },
  mcBadge:          { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  mcBadgeActive:    { backgroundColor: 'rgba(52,211,153,0.15)', borderWidth: 1, borderColor: 'rgba(52,211,153,0.3)' },
  mcBadgePending:   { backgroundColor: 'rgba(252,211,77,0.15)', borderWidth: 1, borderColor: 'rgba(252,211,77,0.3)' },
  mcWatermark:      { position: 'absolute', right: -8, bottom: -20, fontSize: 100, color: 'rgba(255,255,255,0.04)', fontWeight: '900' },
  noCard:           { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: 14, padding: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: C.border, marginBottom: 14 },
  noCardIcon:       { width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(10,143,88,0.12)', borderWidth: 1, borderColor: 'rgba(10,143,88,0.25)', alignItems: 'center', justifyContent: 'center' },
  noCardTitle:      { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 3 },
  noCardSub:        { fontSize: 11, color: C.dim, lineHeight: 15 },
  btnCmd:           { backgroundColor: C.green, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  btnCmdText:       { fontSize: 11, fontWeight: '700', color: '#fff' },
  familleCard:      { backgroundColor: C.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.border, marginBottom: 14 },
  familleTitle:     { fontSize: 12, fontWeight: '700', color: C.dim, textTransform: 'uppercase', letterSpacing: 0.5 },
  famEmpty:         { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderRadius: 14, padding: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: C.border, marginBottom: 14 },
  famMember:        { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(26,45,66,0.6)' },
  famAvatar:        { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  famName:          { fontSize: 13, fontWeight: '700', color: C.text },
  famRole:          { fontSize: 10, color: C.dim, marginTop: 1 },
  famStatus:        { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  famStatusActive:  { backgroundColor: 'rgba(10,143,88,0.15)', borderColor: 'rgba(10,143,88,0.25)' },
  famStatusPending: { backgroundColor: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.25)' },
  rdvAlert:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(10,143,88,.1)', borderRadius: C.r, padding: 14, borderWidth: 1, borderColor: 'rgba(10,143,88,.25)', marginBottom: 14 },
  rdvAlertLeft:     { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  rdvAlertIcon:     { fontSize: 26 },
  rdvAlertTitle:    { fontSize: 13, fontWeight: '700', color: C.greenL, marginBottom: 2 },
  rdvAlertDate:     { fontSize: 14, fontWeight: '800', color: C.text },
  rdvAlertMedecin:  { fontSize: 12, color: C.muted, marginTop: 2 },
  grid:             { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  moduleCard:       { width: '30.5%', aspectRatio: 1, borderRadius: C.r, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  moduleLabel:      { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  rdvCard:          { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: C.r, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  rdvCardLeft:      { width: 60, alignItems: 'center' },
  rdvCardDate:      { fontSize: 11, color: C.dim, textAlign: 'center', marginBottom: 2 },
  rdvCardHeure:     { fontSize: 14, fontWeight: '800', color: C.green },
  rdvCardMed:       { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 2 },
  rdvCardMotif:     { fontSize: 12, color: C.muted },
  menuOverlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 80, paddingRight: 16 },
  menuBox:          { backgroundColor: '#0D1B2A', borderRadius: 16, padding: 8, borderWidth: 1, borderColor: '#1a2d42', minWidth: 240 },
  menuTitle:        { color: '#5A7A94', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, padding: 10, paddingBottom: 6 },
  menuItem:         { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 10 },
  menuItemLabel:    { color: '#F0F6FF', fontSize: 14, fontWeight: '600', flex: 1 },
  modalHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1a2d42' },
  modalTitle:       { fontSize: 16, fontWeight: '800', color: '#F0F6FF' },
  modalInfoCard:    { backgroundColor: '#0D1B2A', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#1a2d42', marginBottom: 20, alignItems: 'center' },
  modalInfoTitle:   { fontSize: 18, fontWeight: '800', color: '#F0F6FF', marginBottom: 8, textAlign: 'center' },
  modalInfoSub:     { fontSize: 13, color: '#5A7A94', textAlign: 'center', lineHeight: 20 },
  btnPrimary:       { backgroundColor: '#0A8F58', borderRadius: 12, padding: 16, alignItems: 'center' },
  btnPrimaryText:   { color: '#fff', fontWeight: '800', fontSize: 15 },
});
