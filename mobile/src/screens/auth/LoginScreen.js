import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';

const P = {
  bg:     '#060E18',
  card:   '#0D1B2A',
  input:  '#0A1520',
  border: '#1a2d42',
  text:   '#F0F6FF',
  muted:  '#8BA3B8',
  dim:    '#5A7A94',
  faint:  '#2A3F55',
  green:  '#0A8F58',
  greenL: '#34D399',
  r:      12,
};

export default function LoginScreen({ navigation }) {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [focused,  setFocused]  = useState('');
  const { doLogin, loading }    = useAuthStore();

  const handleLogin = async () => {
    if (!email || !password) { Alert.alert('Champs requis', 'Entrez votre email et mot de passe.'); return; }
    const res = await doLogin(email, password);
    if (!res.success) Alert.alert('Connexion échouée', res.message || 'Email ou mot de passe incorrect');
  };

  const inputStyle = (name) => ({
    backgroundColor: P.input,
    borderRadius: P.r,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: P.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: focused === name ? P.green : P.border,
    marginBottom: 14,
  });

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: P.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex:1 }}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Hero ── */}
          <View style={{ alignItems:'center', paddingTop: 48, paddingBottom: 32 }}>
            <View style={{
              width: 72, height: 72, borderRadius: 22,
              backgroundColor: `${P.green}20`,
              borderWidth: 1.5, borderColor: P.green,
              alignItems:'center', justifyContent:'center',
              marginBottom: 16,
            }}>
              <Text style={{ fontSize: 32, color: P.greenL, fontWeight: '300' }}>+</Text>
            </View>

            <Text style={{ fontSize: 26, fontWeight: '900', color: P.text, letterSpacing: -0.5 }}>
              <Text style={{ color: P.greenL }}>Medi</Text>Connect
            </Text>
            <Text style={{ color: P.green, fontSize: 10, fontWeight: '800', letterSpacing: 5, marginTop: 3 }}>
              AFRICA
            </Text>

            {/* Tagline enrichie */}
            <Text style={{ color: P.muted, fontSize: 13, marginTop: 10, textAlign:'center', lineHeight: 21, paddingHorizontal: 10 }}>
              La santé numérique pour l'Afrique —{'\n'}
              <Text style={{ color: P.greenL, fontWeight: '700' }}>consultations · ordonnances · livraisons</Text>
            </Text>

            {/* Bandeau urgence */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              marginTop: 16,
              backgroundColor: `${P.green}12`,
              borderRadius: 30,
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderWidth: 1,
              borderColor: `${P.green}30`,
            }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: P.greenL }} />
              <Text style={{ color: P.greenL, fontSize: 12, fontWeight: '700' }}>
                MediConnect For Africa
              </Text>
              <Text style={{ color: P.dim, fontSize: 11 }}>
                — urgence médicale préventive 24h/24
              </Text>
            </View>
          </View>

          {/* ── Formulaire ── */}
          <View style={{
            backgroundColor: P.card, borderRadius: 18,
            borderWidth: 1, borderColor: P.border,
            padding: 22, marginBottom: 12,
          }}>
            <Text style={{ color: P.text, fontWeight: '800', fontSize: 16, marginBottom: 20 }}>
              Connexion
            </Text>

            <Text style={{ fontSize: 10, fontWeight: '700', color: P.dim, textTransform:'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
              Email
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="votre@email.com"
              placeholderTextColor={P.faint}
              keyboardType="email-address"
              autoCapitalize="none"
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused('')}
              style={inputStyle('email')}
            />

            <Text style={{ fontSize: 10, fontWeight: '700', color: P.dim, textTransform:'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
              Mot de passe
            </Text>
            <View style={{ position:'relative', marginBottom: 6 }}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={P.faint}
                secureTextEntry={!showPwd}
                onFocus={() => setFocused('pwd')}
                onBlur={() => setFocused('')}
                style={[inputStyle('pwd'), { paddingRight: 48, marginBottom: 0 }]}
              />
              <TouchableOpacity
                onPress={() => setShowPwd(!showPwd)}
                style={{ position:'absolute', right: 14, top: 13 }}
              >
                <Text style={{ fontSize: 17, color: P.dim }}>{showPwd ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={{ alignSelf:'flex-end', marginBottom: 22, marginTop: 6 }}>
              <Text style={{ fontSize: 12, color: P.dim }}>Mot de passe oublié ?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
              style={{
                backgroundColor: loading ? '#1E2F42' : P.green,
                borderRadius: P.r,
                padding: 15,
                alignItems:'center',
                shadowColor: P.green,
                shadowOpacity: 0.3,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 4 },
                elevation: 4,
              }}
            >
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={{ color:'#fff', fontWeight:'800', fontSize: 15 }}>Se connecter</Text>
              }
            </TouchableOpacity>
          </View>

          {/* ── Créer un compte ── */}
          <TouchableOpacity
            onPress={() => navigation?.navigate?.('Register')}
            activeOpacity={0.8}
            style={{
              backgroundColor:'transparent',
              borderRadius: P.r,
              padding: 14,
              alignItems:'center',
              borderWidth: 1,
              borderColor: P.border,
            }}
          >
            <Text style={{ color: P.muted, fontSize: 14, fontWeight: '600' }}>
              Pas de compte ?{'  '}
              <Text style={{ color: P.greenL, fontWeight: '700' }}>Créer un compte</Text>
            </Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
