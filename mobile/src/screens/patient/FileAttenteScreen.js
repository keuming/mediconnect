import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, TextInput, Modal, Vibration
} from 'react-native';
import { useAuthStore } from '../../store/authStore';

const API = 'https://mediconnect-backend-v2.vercel.app';

const C = {
  bg: '#060C12', card: '#0E1620', border: '#1E2F42',
  text: '#F0F4F8', muted: '#8BA0B5', dim: '#4E657A',
  green: '#0A8F58', greenL: '#34D399', teal: '#0D9488',
  amber: '#D97706', blue: '#2563EB', red: '#E11D48',
};

export default function FileAttenteScreen({ navigation, route }) {
  const { user, token } = useAuthStore();
  const cliniqueId = route?.params?.clinique_id;

  const [step, setStep] = useState(cliniqueId ? 'confirm' : 'mon-rang');
  const [clinique, setClinique] = useState(route?.params?.clinique || null);
  const [motif, setMotif] = useState('');
  const [loading, setLoading] = useState(false);
  const [ticket, setTicket] = useState(null);
  const [rang, setRang] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const ticketId = ticket?.id || null;

  // Charger le ticket existant depuis le store
  useEffect(() => {
    const savedTicketId = global.mc_ticket_id;
    if (savedTicketId && step === 'mon-rang') {
      fetchRang(savedTicketId);
    }
  }, []);

  // Auto-refresh rang toutes les 10 secondes
  useEffect(() => {
    if (step !== 'rang' || !ticketId) return;
    const iv = setInterval(() => fetchRang(ticketId), 10000);
    return () => clearInterval(iv);
  }, [step, ticketId]);

  const fetchRang = async (id) => {
    try {
      const r = await fetch(`${API}/api/file-attente/mon-rang/${id}`);
      const d = await r.json();
      if (d.success) {
        setRang(d.data);
        // Vibrer si appelé
        if (d.data.statut === 'appele') Vibration.vibrate([500, 300, 500]);
        setStep('rang');
      }
    } catch(e) {}
  };

  const handleRejoindre = async () => {
    if (!cliniqueId) return;
    setLoading(true);
    try {
      const body = {
        clinique_id: cliniqueId,
        motif: motif || null,
        patient_id: user?.patient_id || user?.id || null,
      };
      const r = await fetch(`${API}/api/file-attente/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const d = await r.json();
      if (d.success) {
        setTicket(d.data);
        global.mc_ticket_id = d.data.id;
        await fetchRang(d.data.id);
      } else {
        Alert.alert('Erreur', d.message || 'Impossible de rejoindre la file');
      }
    } catch(e) {
      Alert.alert('Erreur réseau', 'Vérifiez votre connexion et réessayez');
    }
    setLoading(false);
  };

  const handleTerminer = () => {
    global.mc_ticket_id = null;
    setTicket(null);
    setRang(null);
    setStep('mon-rang');
    navigation?.goBack?.();
  };

  const STATUT_CONFIG = {
    en_attente:      { icon:'⏳', color: C.amber,  label:'En attente', bg:'rgba(217,119,6,.12)' },
    appele:          { icon:'📣', color: C.blue,   label:'C\'est votre tour !', bg:'rgba(37,99,235,.12)' },
    en_consultation: { icon:'🩺', color: C.green,  label:'En consultation', bg:'rgba(10,143,88,.12)' },
    termine:         { icon:'✅', color: C.muted,  label:'Terminé', bg:'rgba(107,114,128,.12)' },
  };

  // ── ÉCRAN CONFIRMATION ────────────────────────────────────────
  if (step === 'confirm') return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.headerBox}>
          <Text style={s.headerIcon}>🏥</Text>
          <Text style={s.headerTitle}>{clinique?.nom || 'Clinique MediConnect'}</Text>
          <Text style={s.headerSub}>Rejoindre la file d'attente</Text>
        </View>

        {!user && (
          <View style={s.infoBox}>
            <Text style={s.infoText}>
              💡 Connectez-vous pour un meilleur suivi de votre rang en temps réel.
            </Text>
          </View>
        )}

        <View style={s.section}>
          <Text style={s.label}>MOTIF DE VISITE (optionnel)</Text>
          <TextInput
            value={motif}
            onChangeText={setMotif}
            placeholder="Ex: Consultation générale..."
            placeholderTextColor={C.dim}
            style={s.input}
          />
        </View>

        <TouchableOpacity
          style={[s.btn, loading && s.btnDisabled]}
          onPress={handleRejoindre}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff"/>
            : <Text style={s.btnText}>✓ Rejoindre la file d'attente</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  // ── ÉCRAN SANS TICKET ─────────────────────────────────────────
  if (step === 'mon-rang' && !rang) return (
    <View style={s.screen}>
      <View style={s.emptyBox}>
        <Text style={{fontSize:56,marginBottom:16}}>📱</Text>
        <Text style={s.emptyTitle}>Aucune file en cours</Text>
        <Text style={s.emptySub}>
          Scannez le QR Code à l'accueil d'une clinique MediConnect pour rejoindre la file d'attente.
        </Text>
        <TouchableOpacity
          style={[s.btn, {marginTop:24}]}
          onPress={() => navigation?.navigate?.('QRScanner', { mode: 'file-attente' })}
        >
          <Text style={s.btnText}>📷 Scanner le QR Code</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── ÉCRAN RANG ────────────────────────────────────────────────
  const statut = rang?.statut || 'en_attente';
  const cfg = STATUT_CONFIG[statut] || STATUT_CONFIG.en_attente;
  const isAppele = statut === 'appele';

  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={s.content}>
        {/* Rang principal */}
        <View style={[s.rangBox, isAppele && s.rangBoxAppele]}>
          <Text style={s.rangIcon}>{cfg.icon}</Text>
          <Text style={[s.rangNum, {color: cfg.color}]}>{rang?.rang}</Text>
          <Text style={s.rangLabel}>Votre numéro de rang</Text>
          <View style={[s.statutBadge, {backgroundColor: cfg.bg}]}>
            <Text style={[s.statutText, {color: cfg.color}]}>{cfg.label}</Text>
          </View>
          {rang?.message && (
            <Text style={s.message}>{rang.message}</Text>
          )}
        </View>

        {/* Alerte si appelé */}
        {isAppele && (
          <View style={s.alertBox}>
            <Text style={s.alertText}>📣 C'est votre tour ! Présentez-vous à l'accueil.</Text>
          </View>
        )}

        {/* Infos */}
        <View style={s.infoCard}>
          {[
            ['Clinique', rang?.clinique_nom || '—'],
            ['Patients devant vous', String(rang?.patients_devant ?? '—')],
            ['Médecin', rang?.medecin_nom || 'Premier disponible'],
          ].map(([label, val]) => (
            <View key={label} style={s.infoRow}>
              <Text style={s.infoLabel}>{label}</Text>
              <Text style={s.infoVal}>{val}</Text>
            </View>
          ))}
        </View>

        {/* Actions */}
        <TouchableOpacity
          style={s.refreshBtn}
          onPress={() => rang?.id && fetchRang(rang.id)}
        >
          <Text style={s.refreshText}>↻ Actualiser</Text>
        </TouchableOpacity>

        {statut === 'termine' && (
          <TouchableOpacity style={[s.btn, {marginTop:12}]} onPress={handleTerminer}>
            <Text style={s.btnText}>✓ Terminer et quitter</Text>
          </TouchableOpacity>
        )}

        <Text style={s.autoRefresh}>Mise à jour automatique toutes les 10 secondes</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex:1, backgroundColor:C.bg },
  content: { padding:20, paddingBottom:40 },
  headerBox: { alignItems:'center', backgroundColor:C.card, borderRadius:16, padding:24, marginBottom:20, borderWidth:1, borderColor:C.border },
  headerIcon: { fontSize:40, marginBottom:10 },
  headerTitle: { fontSize:18, fontWeight:'700', color:C.text, textAlign:'center', marginBottom:4 },
  headerSub: { fontSize:13, color:C.muted },
  infoBox: { backgroundColor:'rgba(217,119,6,.08)', borderRadius:10, padding:12, marginBottom:16, borderWidth:1, borderColor:'rgba(217,119,6,.2)' },
  infoText: { fontSize:12, color:C.amber, lineHeight:18 },
  section: { marginBottom:16 },
  label: { fontSize:11, color:C.muted, marginBottom:6, letterSpacing:0.5 },
  input: { backgroundColor:C.card, borderWidth:1, borderColor:C.border, borderRadius:10, padding:12, color:C.text, fontSize:14 },
  btn: { backgroundColor:C.green, borderRadius:12, padding:15, alignItems:'center', marginTop:8 },
  btnDisabled: { opacity:0.6 },
  btnText: { color:'#fff', fontWeight:'700', fontSize:15 },
  emptyBox: { flex:1, alignItems:'center', justifyContent:'center', padding:32 },
  emptyTitle: { fontSize:18, fontWeight:'700', color:C.text, marginBottom:8 },
  emptySub: { fontSize:13, color:C.muted, textAlign:'center', lineHeight:20 },
  rangBox: { backgroundColor:C.card, borderRadius:16, padding:28, alignItems:'center', marginBottom:16, borderWidth:1.5, borderColor:C.border },
  rangBoxAppele: { borderColor:C.blue },
  rangIcon: { fontSize:36, marginBottom:8 },
  rangNum: { fontSize:80, fontWeight:'900', lineHeight:88 },
  rangLabel: { fontSize:13, color:C.muted, marginBottom:12 },
  statutBadge: { borderRadius:20, paddingHorizontal:16, paddingVertical:6, marginBottom:12 },
  statutText: { fontSize:14, fontWeight:'700' },
  message: { fontSize:13, color:C.muted, textAlign:'center', lineHeight:20 },
  alertBox: { backgroundColor:'rgba(37,99,235,.1)', borderRadius:10, padding:14, marginBottom:16, borderWidth:1, borderColor:'rgba(37,99,235,.3)' },
  alertText: { color:C.blue, fontWeight:'700', fontSize:14, textAlign:'center' },
  infoCard: { backgroundColor:C.card, borderRadius:12, padding:16, marginBottom:12, borderWidth:1, borderColor:C.border },
  infoRow: { flexDirection:'row', justifyContent:'space-between', paddingVertical:8, borderBottomWidth:1, borderBottomColor:C.border },
  infoLabel: { fontSize:13, color:C.muted },
  infoVal: { fontSize:13, fontWeight:'600', color:C.text },
  refreshBtn: { backgroundColor:'transparent', borderRadius:10, padding:12, alignItems:'center', borderWidth:1, borderColor:C.border },
  refreshText: { color:C.muted, fontWeight:'600', fontSize:14 },
  autoRefresh: { fontSize:11, color:C.dim, textAlign:'center', marginTop:16 },
});
