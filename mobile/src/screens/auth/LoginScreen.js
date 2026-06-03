import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView,
  Platform, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { C } from '../../components/UI';

const DEMOS = [
  { role: 'patient',   email: 'patient@demo.ci',    icon: '👤', label: 'Patient',   color: C.green },
  { role: 'pharmacie', email: 'pharmacie@demo.ci',  icon: '💊', label: 'Pharmacie', color: C.teal },
  { role: 'livreur',   email: 'livreur@demo.ci',    icon: '🛵', label: 'Livreur',   color: C.amber },
];

export default function LoginScreen() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const { doLogin, loading }    = useAuthStore();

  const handleLogin = async (e = email, p = password) => {
    if (!e || !p) { Alert.alert('Champs requis', 'Entrez votre email et mot de passe.'); return; }
    const res = await doLogin(e, p);
    if (!res.success) Alert.alert('Connexion échouée', res.message);
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={s.header}>
            <View style={s.logoBox}>
              <Text style={s.logoPlus}>+</Text>
            </View>
            <Text style={s.logoText}>
              <Text style={{ color: C.greenL }}>Medi</Text>Connect
            </Text>
            <Text style={s.logoSub}>AFRICA</Text>
            <Text style={s.tagline}>La santé numérique pour l'Afrique</Text>
          </View>

          {/* Bannière info */}
          <View style={s.infoBanner}>
            <Text style={s.infoIcon}>📱</Text>
            <Text style={s.infoText}>
              Application mobile en accès anticipé. Toutes les fonctionnalités sont disponibles sur{' '}
              <Text style={{ color: C.greenL, fontWeight: '700' }}>mediconnect4africa.cloud</Text>
            </Text>
          </View>

          {/* Formulaire */}
          <View style={s.form}>
            <Text style={s.formTitle}>Connexion</Text>

            <Text style={s.label}>Adresse email</Text>
            <TextInput
              style={s.input}
              value={email}
              onChangeText={setEmail}
              placeholder="votre@email.com"
              placeholderTextColor={C.dim}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={s.label}>Mot de passe</Text>
            <View style={s.pwdRow}>
              <TextInput
                style={[s.input, { flex: 1, marginBottom: 0 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={C.dim}
                secureTextEntry={!showPwd}
              />
              <TouchableOpacity
                style={s.eyeBtn}
                onPress={() => setShowPwd(!showPwd)}
              >
                <Text style={{ fontSize: 20 }}>{showPwd ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[s.btnPrimary, (loading) && { opacity: 0.6 }]}
              onPress={() => handleLogin()}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnText}>Se connecter →</Text>
              }
            </TouchableOpacity>
          </View>

          {/* Démos rapides */}
          <View style={s.demoSection}>
            <View style={s.demoSep}>
              <View style={s.sepLine} />
              <Text style={s.sepText}>Accès démo</Text>
              <View style={s.sepLine} />
            </View>
            <View style={s.demoGrid}>
              {DEMOS.map(d => (
                <TouchableOpacity
                  key={d.role}
                  style={s.demoBtn}
                  onPress={() => handleLogin(d.email, 'demo1234')}
                  activeOpacity={0.75}
                >
                  <View style={[s.demoIconBox, { backgroundColor: d.color + '20', borderColor: d.color + '40' }]}>
                    <Text style={{ fontSize: 24 }}>{d.icon}</Text>
                  </View>
                  <Text style={s.demoLabel}>{d.label}</Text>
                  <Text style={s.demoPass}>demo1234</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Text style={s.footer}>MediConnect Africa · v3.0 · UEMOA + CEMAC</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: C.bg },
  scroll:     { padding: 24, paddingBottom: 40 },
  header:     { alignItems: 'center', marginBottom: 24, marginTop: 12 },
  logoBox:    { width: 60, height: 60, borderRadius: 18, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center', marginBottom: 12, shadowColor: C.green, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12 },
  logoPlus:   { color: '#fff', fontSize: 32, fontWeight: '800', lineHeight: 38 },
  logoText:   { fontSize: 28, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  logoSub:    { fontSize: 10, fontWeight: '700', letterSpacing: 4, color: C.dim, marginTop: 2 },
  tagline:    { fontSize: 12, color: C.muted, marginTop: 6, textAlign: 'center' },
  infoBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: 'rgba(10,143,88,.1)', borderRadius: C.r, padding: 14, marginBottom: 22, borderWidth: 1, borderColor: 'rgba(10,143,88,.2)' },
  infoIcon:   { fontSize: 18 },
  infoText:   { flex: 1, fontSize: 12, color: C.muted, lineHeight: 18 },
  form:       { backgroundColor: C.card, borderRadius: C.rL, padding: 20, borderWidth: 1, borderColor: C.border, marginBottom: 24 },
  formTitle:  { fontSize: 20, fontWeight: '800', color: C.text, marginBottom: 20 },
  label:      { fontSize: 11, fontWeight: '700', color: C.dim, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  input:      { backgroundColor: C.input, borderRadius: C.r, paddingHorizontal: 14, paddingVertical: 12, color: C.text, fontSize: 14, borderWidth: 1, borderColor: C.border, marginBottom: 14 },
  pwdRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 },
  eyeBtn:     { padding: 8 },
  btnPrimary: { backgroundColor: C.green, borderRadius: C.r, paddingVertical: 14, alignItems: 'center', shadowColor: C.green, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8 },
  btnText:    { color: '#fff', fontWeight: '800', fontSize: 15 },
  demoSection:{ marginBottom: 24 },
  demoSep:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  sepLine:    { flex: 1, height: 1, backgroundColor: C.border },
  sepText:    { fontSize: 11, color: C.dim, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  demoGrid:   { flexDirection: 'row', gap: 10 },
  demoBtn:    { flex: 1, alignItems: 'center', backgroundColor: C.card, borderRadius: C.r, padding: 14, borderWidth: 1, borderColor: C.border },
  demoIconBox:{ width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8, borderWidth: 1 },
  demoLabel:  { fontSize: 12, fontWeight: '700', color: C.text, marginBottom: 4 },
  demoPass:   { fontSize: 10, color: C.dim },
  footer:     { textAlign: 'center', fontSize: 11, color: C.dim },
});
