import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { C } from '../../components/UI';

const DEMOS = [
  { role:'patient',             email:'patient@demo.ci',        pwd:'demo1234',      icon:'👤', label:'Patient',         color:C.green },
  { role:'medecin_independant', email:'medecin.indep@demo.ci',  pwd:'demo1234',      icon:'⭐', label:'Méd. Conseil',    color:C.purple },
  { role:'medecin',             email:'clinique@demo.ci',       pwd:'demo1234',      icon:'🩺', label:'Méd. Résident',   color:C.teal },
  { role:'pharmacie',           email:'pharmacie@demo.ci',      pwd:'demo1234',      icon:'💊', label:'Pharmacie',       color:C.teal },
  { role:'livreur',             email:'livreur@demo.ci',        pwd:'demo1234',      icon:'🛵', label:'Livreur',         color:C.amber },
  { role:'optique',             email:'optique@demo.ci',        pwd:'demo1234',      icon:'🔭', label:'Optique',         color:'#6366F1' },
  { role:'ministere',           email:'ministere@sante.ci',     pwd:'MinistereCI2024',icon:'🏛️',label:'Ministère',       color:C.green },
];

export default function LoginScreen({ navigation }) {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const { doLogin, loading }    = useAuthStore();

  const handleLogin = async (e = email, p = password) => {
    if (!e || !p) { Alert.alert('Champs requis', 'Entrez votre email et mot de passe.'); return; }
    const res = await doLogin(e, p);
    if (!res.success) Alert.alert('Connexion échouée', res.message || 'Email ou mot de passe incorrect');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Logo */}
          <View style={{ alignItems: 'center', marginVertical: 32 }}>
            <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: `${C.green}20`, borderWidth: 2, borderColor: C.green, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 32 }}>+</Text>
            </View>
            <Text style={{ fontSize: 26, fontWeight: '900', color: C.text }}>
              <Text style={{ color: C.greenL }}>Medi</Text>Connect
            </Text>
            <Text style={{ color: C.green, fontSize: 11, fontWeight: '800', letterSpacing: 4, marginTop: 2 }}>AFRICA</Text>
            <Text style={{ color: C.dim, fontSize: 12, marginTop: 6 }}>La santé numérique pour l'Afrique</Text>
          </View>

          {/* Formulaire */}
          <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: C.border, marginBottom: 16 }}>
            <Text style={{ color: C.text, fontWeight: '800', fontSize: 15, marginBottom: 16 }}>Connexion</Text>

            <Text style={{ fontSize: 11, fontWeight: '700', color: C.dim, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Email</Text>
            <TextInput
              value={email} onChangeText={setEmail} placeholder="votre@email.com"
              placeholderTextColor={C.dim} keyboardType="email-address" autoCapitalize="none"
              style={{ backgroundColor: C.input, borderRadius: C.r, paddingHorizontal: 14, paddingVertical: 12, color: C.text, fontSize: 14, borderWidth: 1, borderColor: C.border, marginBottom: 14 }}
            />

            <Text style={{ fontSize: 11, fontWeight: '700', color: C.dim, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Mot de passe</Text>
            <View style={{ position: 'relative', marginBottom: 20 }}>
              <TextInput
                value={password} onChangeText={setPassword} placeholder="••••••••"
                placeholderTextColor={C.dim} secureTextEntry={!showPwd}
                style={{ backgroundColor: C.input, borderRadius: C.r, paddingHorizontal: 14, paddingVertical: 12, color: C.text, fontSize: 14, borderWidth: 1, borderColor: C.border, paddingRight: 46 }}
              />
              <TouchableOpacity onPress={() => setShowPwd(!showPwd)}
                style={{ position: 'absolute', right: 12, top: 12 }}>
                <Text style={{ fontSize: 18, color: C.dim }}>{showPwd ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => handleLogin()} disabled={loading}
              style={{ backgroundColor: loading ? '#1E2F42' : C.green, borderRadius: C.r, padding: 15, alignItems: 'center' }}>
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Se connecter</Text>
              }
            </TouchableOpacity>
          </View>

          {/* Créer un compte */}
          <TouchableOpacity onPress={() => navigation?.navigate?.('Register')}
            style={{ backgroundColor: 'transparent', borderRadius: C.r, padding: 14, alignItems: 'center', borderWidth: 1.5, borderColor: C.border, marginBottom: 24 }}>
            <Text style={{ color: C.muted, fontSize: 14, fontWeight: '600' }}>
              Pas de compte ? <Text style={{ color: C.greenL }}>Créer un compte</Text>
            </Text>
          </TouchableOpacity>

          {/* Comptes démo */}
          <Text style={{ color: C.dim, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center', marginBottom: 12 }}>
            Accès démo rapide
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {DEMOS.map(d => (
              <TouchableOpacity key={d.role} onPress={() => handleLogin(d.email, d.pwd)} disabled={loading}
                style={{
                  backgroundColor: `${d.color}18`,
                  borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9,
                  borderWidth: 1, borderColor: `${d.color}40`,
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  minWidth: '28%',
                }}>
                <Text style={{ fontSize: 16 }}>{d.icon}</Text>
                <Text style={{ color: d.color, fontSize: 11, fontWeight: '700' }}>{d.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
