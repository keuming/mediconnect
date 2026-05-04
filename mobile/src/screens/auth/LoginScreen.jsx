import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, ScrollView, Image,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import { COLORS, SPACING, RADIUS } from '../../theme';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }
    setLoading(true);
    try {
      const res = await authAPI.login(email, password);
      await login(res.data.user, res.data.token);
    } catch (e) {
      Alert.alert('Erreur', e.response?.data?.message || 'Email ou mot de passe incorrect');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <View style={styles.logoIcon}>
          <Text style={styles.logoIconText}>+</Text>
        </View>
        <Text style={styles.logoText}>
          <Text style={styles.logoMedi}>Medi</Text>
          <Text style={styles.logoConnect}>Connect</Text>
        </Text>
      </View>

      <Text style={styles.title}>Connexion 👋</Text>
      <Text style={styles.subtitle}>Accédez à votre espace MediConnect</Text>

      {/* Formulaire */}
      <View style={styles.form}>
        <Text style={styles.label}>EMAIL</Text>
        <TextInput
          style={styles.input}
          placeholder="votre@email.com"
          placeholderTextColor={COLORS.textSecondary}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>MOT DE PASSE</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="••••••••"
            placeholderTextColor={COLORS.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
            <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Se connecter</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Accès démo rapide */}
      <Text style={styles.demoTitle}>ACCÈS DÉMO RAPIDE</Text>
      <View style={styles.demoGrid}>
        {[
          { label: 'Patient', icon: '🧑‍⚕️', role: 'patient', email: 'patient@demo.ci', pass: 'demo123' },
          { label: 'Médecin', icon: '👨‍⚕️', role: 'medecin', email: 'medecin@demo.ci', pass: 'demo123' },
          { label: 'Livreur', icon: '🛵', role: 'livreur', email: 'livreur@demo.ci', pass: 'demo123' },
        ].map((d) => (
          <TouchableOpacity
            key={d.role}
            style={styles.demoBtn}
            onPress={() => { setEmail(d.email); setPassword(d.pass); }}
          >
            <Text style={styles.demoIcon}>{d.icon}</Text>
            <Text style={styles.demoLabel}>{d.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.registerLink}>
          Pas de compte ? <Text style={styles.registerLinkBold}>Créer un compte</Text>
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingTop: 60 },
  logoContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.xl },
  logoIcon: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  logoIconText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  logoText: { fontSize: 22 },
  logoMedi: { color: COLORS.text, fontWeight: 'bold' },
  logoConnect: { color: COLORS.primary, fontWeight: 'bold' },
  title: { fontSize: 28, fontWeight: 'bold', color: COLORS.text, marginBottom: 6 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: SPACING.xl },
  form: { marginBottom: SPACING.lg },
  label: { fontSize: 11, color: COLORS.textSecondary, letterSpacing: 1, marginBottom: 6, marginTop: SPACING.md },
  input: {
    backgroundColor: COLORS.inputBg, borderWidth: 1, borderColor: COLORS.cardBorder,
    borderRadius: RADIUS.md, padding: SPACING.md, color: COLORS.text, fontSize: 15,
  },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.inputBg, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.md },
  passwordInput: { flex: 1, padding: SPACING.md, color: COLORS.text, fontSize: 15 },
  eyeBtn: { padding: SPACING.md },
  eyeText: { fontSize: 18 },
  btn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    padding: SPACING.md, alignItems: 'center', marginTop: SPACING.lg,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  demoTitle: { fontSize: 11, color: COLORS.textSecondary, letterSpacing: 1, marginBottom: SPACING.sm, textAlign: 'center' },
  demoGrid: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  demoBtn: {
    flex: 1, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder,
    borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center',
  },
  demoIcon: { fontSize: 28, marginBottom: 4 },
  demoLabel: { color: COLORS.text, fontSize: 12, fontWeight: '500' },
  registerLink: { textAlign: 'center', color: COLORS.textSecondary, fontSize: 14 },
  registerLinkBold: { color: COLORS.primary, fontWeight: 'bold' },
});
