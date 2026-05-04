import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import { COLORS, SPACING, RADIUS } from '../../theme';

export default function RegisterScreen({ navigation }) {
  const { login } = useAuth();
  const [form, setForm] = useState({ nom: '', prenom: '', email: '', password: '', role: 'patient' });
  const [loading, setLoading] = useState(false);

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleRegister = async () => {
    if (!form.nom || !form.prenom || !form.email || !form.password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }
    setLoading(true);
    try {
      const res = await authAPI.register(form);
      await login(res.data.user, res.data.token);
    } catch (e) {
      Alert.alert('Erreur', e.response?.data?.message || 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { key: 'patient', label: 'Patient', icon: '🧑‍⚕️' },
    { key: 'medecin', label: 'Médecin', icon: '👨‍⚕️' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Text style={styles.backText}>← Retour</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Créer un compte</Text>
      <Text style={styles.subtitle}>Rejoignez MediConnect</Text>

      {/* Choix du rôle */}
      <Text style={styles.label}>JE SUIS</Text>
      <View style={styles.roleRow}>
        {roles.map(r => (
          <TouchableOpacity
            key={r.key}
            style={[styles.roleBtn, form.role === r.key && styles.roleBtnActive]}
            onPress={() => update('role', r.key)}
          >
            <Text style={styles.roleIcon}>{r.icon}</Text>
            <Text style={[styles.roleLabel, form.role === r.key && styles.roleLabelActive]}>{r.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>NOM</Text>
      <TextInput style={styles.input} placeholder="Votre nom" placeholderTextColor={COLORS.textSecondary}
        value={form.nom} onChangeText={v => update('nom', v)} />

      <Text style={styles.label}>PRÉNOM</Text>
      <TextInput style={styles.input} placeholder="Votre prénom" placeholderTextColor={COLORS.textSecondary}
        value={form.prenom} onChangeText={v => update('prenom', v)} />

      <Text style={styles.label}>EMAIL</Text>
      <TextInput style={styles.input} placeholder="votre@email.com" placeholderTextColor={COLORS.textSecondary}
        value={form.email} onChangeText={v => update('email', v)} keyboardType="email-address" autoCapitalize="none" />

      <Text style={styles.label}>MOT DE PASSE</Text>
      <TextInput style={styles.input} placeholder="••••••••" placeholderTextColor={COLORS.textSecondary}
        value={form.password} onChangeText={v => update('password', v)} secureTextEntry />

      <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Créer mon compte</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.loginLink}>Déjà un compte ? <Text style={styles.loginLinkBold}>Se connecter</Text></Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingTop: 60 },
  backBtn: { marginBottom: SPACING.lg },
  backText: { color: COLORS.primary, fontSize: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: COLORS.text, marginBottom: 6 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: SPACING.xl },
  label: { fontSize: 11, color: COLORS.textSecondary, letterSpacing: 1, marginBottom: 6, marginTop: SPACING.md },
  input: {
    backgroundColor: COLORS.inputBg, borderWidth: 1, borderColor: COLORS.cardBorder,
    borderRadius: RADIUS.md, padding: SPACING.md, color: COLORS.text, fontSize: 15, marginBottom: 4,
  },
  roleRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  roleBtn: {
    flex: 1, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder,
    borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center',
  },
  roleBtnActive: { borderColor: COLORS.primary, backgroundColor: '#0A8F5820' },
  roleIcon: { fontSize: 28, marginBottom: 4 },
  roleLabel: { color: COLORS.textSecondary, fontSize: 13 },
  roleLabelActive: { color: COLORS.primary, fontWeight: 'bold' },
  btn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    padding: SPACING.md, alignItems: 'center', marginTop: SPACING.lg, marginBottom: SPACING.md,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  loginLink: { textAlign: 'center', color: COLORS.textSecondary, fontSize: 14 },
  loginLinkBold: { color: COLORS.primary, fontWeight: 'bold' },
});
