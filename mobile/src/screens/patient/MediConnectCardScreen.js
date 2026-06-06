import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, ActivityIndicator, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const API = 'https://mediconnect-backend-v2.vercel.app/api';

// Couleurs
const C = {
  bg: '#060C12', card: '#0E1620', card2: '#111D2B', border: '#1E2F42',
  text: '#F0F4F8', muted: '#8BA0B5', dim: '#4E657A',
  green: '#0A8F58', greenL: '#4ade80', amber: '#D97706', red: '#E11D48',
  gold: '#F59E0B',
};

const fmt = n => Number(n || 0).toLocaleString('fr-CI');

// ── Composants ────────────────────────────────────────────────────
const Btn = ({ onPress, label, color = C.green, style, disabled, loading }) => (
  <TouchableOpacity onPress={onPress} disabled={disabled || loading}
    style={[{
      backgroundColor: disabled ? '#1E2F42' : color,
      borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8
    }, style]}>
    {loading
      ? <ActivityIndicator color="#fff" size="small" />
      : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>{label}</Text>
    }
  </TouchableOpacity>
);

const Inp = ({ label, value, onChangeText, placeholder, keyboardType, secureTextEntry, style }) => (
  <View style={{ marginBottom: 12 }}>
    {label && <Text style={{ color: C.muted, fontSize: 12, fontWeight: '700', marginBottom: 4 }}>{label}</Text>}
    <TextInput
      value={value} onChangeText={onChangeText} placeholder={placeholder}
      placeholderTextColor={C.dim} keyboardType={keyboardType || 'default'}
      secureTextEntry={secureTextEntry}
      style={[{
        backgroundColor: C.card2, borderWidth: 1, borderColor: C.border,
        borderRadius: 10, padding: 12, color: C.text, fontSize: 14,
      }, style]}
    />
  </View>
);

const Card = ({ children, style }) => (
  <View style={[{
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 14, padding: 16, marginBottom: 12
  }, style]}>{children}</View>
);

// ══════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════════════════════════
export default function MediConnectCardScreen({ navigation, route }) {
  const token = route?.params?.token;
  const [compte, setCompte] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onglet, setOnglet] = useState('carte'); // carte, contacts, recharger, transactions
  const [saving, setSaving] = useState(false);

  // Form linkage
  const [formLink, setFormLink] = useState({
    prenom: '', nom: '', telephone: '', email: '',
    adresse: '', ville: '', groupe_sanguin: '', allergies: '',
    numero_carte: '', date_naissance: '',
  });

  // Contacts d'urgence
  const [contacts, setContacts] = useState([]);
  const [formContact, setFormContact] = useState({ prenom: '', nom: '', telephone: '', relation: '' });
  const [showAddContact, setShowAddContact] = useState(false);

  // Recharge
  const [montantRecharge, setMontantRecharge] = useState('');
  const [modeRecharge, setModeRecharge] = useState('Wave');

  useEffect(() => { chargerCompte(); }, []);

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  const chargerCompte = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/card/mon-compte`, { headers });
      const d = await r.json();
      if (d.success && d.data) {
        setCompte(d.data);
        setContacts(d.data.contacts_urgence || []);
      }
    } catch(e) { console.log('Erreur chargement compte card:', e); }
    finally { setLoading(false); }
  };

  const lierCarte = async () => {
    if (!formLink.prenom || !formLink.nom || !formLink.numero_carte) {
      Alert.alert('Champs requis', 'Prénom, nom et numéro de carte sont obligatoires.');
      return;
    }
    setSaving(true);
    try {
      const r = await fetch(`${API}/card/lier-carte`, {
        method: 'POST', headers,
        body: JSON.stringify({ ...formLink, contacts_urgence: contacts }),
      });
      const d = await r.json();
      if (d.success) {
        Alert.alert('✅ Succès !', d.message || 'Carte liée avec succès !');
        chargerCompte();
      } else {
        Alert.alert('Erreur', d.message);
      }
    } catch(e) { Alert.alert('Erreur', 'Impossible de contacter le serveur'); }
    finally { setSaving(false); }
  };

  const ajouterContact = async () => {
    if (!formContact.prenom || !formContact.telephone) {
      Alert.alert('Requis', 'Prénom et téléphone obligatoires');
      return;
    }
    if (contacts.length >= 10) {
      Alert.alert('Limite', 'Maximum 10 contacts d\'urgence');
      return;
    }
    if (compte) {
      // Compte déjà créé → API
      try {
        const r = await fetch(`${API}/card/contacts-urgence`, {
          method: 'POST', headers,
          body: JSON.stringify(formContact),
        });
        const d = await r.json();
        if (d.success) {
          setContacts(prev => [...prev, d.data]);
          setFormContact({ prenom: '', nom: '', telephone: '', relation: '' });
          setShowAddContact(false);
        } else Alert.alert('Erreur', d.message);
      } catch(e) { Alert.alert('Erreur', 'Impossible d\'ajouter le contact'); }
    } else {
      // En cours de linkage → ajouter localement
      setContacts(prev => [...prev, { ...formContact, id: Date.now().toString(), ordre: prev.length + 1 }]);
      setFormContact({ prenom: '', nom: '', telephone: '', relation: '' });
      setShowAddContact(false);
    }
  };

  const supprimerContact = (id) => {
    Alert.alert('Supprimer', 'Supprimer ce contact d\'urgence ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: async () => {
          if (compte) {
            await fetch(`${API}/card/contacts-urgence/${id}`, { method: 'DELETE', headers });
          }
          setContacts(prev => prev.filter(c => c.id !== id));
        }
      }
    ]);
  };

  const recharger = async () => {
    const montant = +montantRecharge;
    if (!montant || montant < 1000) {
      Alert.alert('Montant invalide', 'Montant minimum : 1 000 FCFA');
      return;
    }
    setSaving(true);
    try {
      const r = await fetch(`${API}/card/recharger`, {
        method: 'POST', headers,
        body: JSON.stringify({ montant, mode_paiement: modeRecharge }),
      });
      const d = await r.json();
      if (d.success) {
        Alert.alert('✅ Recharge effectuée !', `Nouveau solde : ${fmt(d.data.solde)} FCFA`);
        setMontantRecharge('');
        chargerCompte();
      } else Alert.alert('Erreur', d.message);
    } catch(e) { Alert.alert('Erreur', 'Impossible d\'effectuer la recharge'); }
    finally { setSaving(false); }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={C.green} size="large" />
        <Text style={{ color: C.muted, marginTop: 12 }}>Chargement...</Text>
      </SafeAreaView>
    );
  }

  // ── VUE : PAS DE COMPTE → FORMULAIRE LINKAGE ──────────────────
  if (!compte) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: C.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {navigation?.goBack && (
            <TouchableOpacity onPress={navigation.goBack}>
              <Text style={{ color: C.muted, fontSize: 22 }}>←</Text>
            </TouchableOpacity>
          )}
          <Text style={{ color: C.text, fontSize: 18, fontWeight: '800' }}>💳 MediConnect Card</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          {/* Hero */}
          <View style={{
            backgroundColor: C.green, borderRadius: 20, padding: 24, marginBottom: 20,
            alignItems: 'center',
          }}>
            <Text style={{ fontSize: 40, marginBottom: 8 }}>💳</Text>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900', textAlign: 'center' }}>
              Lier ma MediConnect Card
            </Text>
            <Text style={{ color: 'rgba(255,255,255,.8)', fontSize: 13, textAlign: 'center', marginTop: 6 }}>
              Connectez votre carte prépayée pour accéder aux réductions chez tous les prestataires MediConnect
            </Text>
          </View>

          {/* Formulaire */}
          <Card>
            <Text style={{ color: C.text, fontWeight: '800', fontSize: 15, marginBottom: 16 }}>
              🪪 Informations personnelles
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Inp label="Prénom *" value={formLink.prenom} onChangeText={v => setFormLink(p => ({...p,prenom:v}))} placeholder="Adjoua" />
              </View>
              <View style={{ flex: 1 }}>
                <Inp label="Nom *" value={formLink.nom} onChangeText={v => setFormLink(p => ({...p,nom:v}))} placeholder="Koné" />
              </View>
            </View>
            <Inp label="Téléphone" value={formLink.telephone} onChangeText={v => setFormLink(p => ({...p,telephone:v}))} placeholder="+225 07 00 00 00" keyboardType="phone-pad" />
            <Inp label="Email" value={formLink.email} onChangeText={v => setFormLink(p => ({...p,email:v}))} placeholder="exemple@email.com" keyboardType="email-address" />
            <Inp label="Adresse" value={formLink.adresse} onChangeText={v => setFormLink(p => ({...p,adresse:v}))} placeholder="Quartier, Rue..." />
            <Inp label="Ville" value={formLink.ville} onChangeText={v => setFormLink(p => ({...p,ville:v}))} placeholder="Abidjan" />
            <Inp label="Groupe sanguin" value={formLink.groupe_sanguin} onChangeText={v => setFormLink(p => ({...p,groupe_sanguin:v}))} placeholder="A+, B-, O+..." />
            <Inp label="Allergies connues" value={formLink.allergies} onChangeText={v => setFormLink(p => ({...p,allergies:v}))} placeholder="Pénicilline, arachides..." />
          </Card>

          <Card>
            <Text style={{ color: C.text, fontWeight: '800', fontSize: 15, marginBottom: 8 }}>
              💳 Numéro de carte MediConnect
            </Text>
            <Text style={{ color: C.muted, fontSize: 12, marginBottom: 12 }}>
              Trouvez le numéro de carte sur le recto de votre carte (ex: MC-CI-2024-000001) ou scannez le QR code
            </Text>
            <Inp
              value={formLink.numero_carte}
              onChangeText={v => setFormLink(p => ({...p,numero_carte:v.toUpperCase()}))}
              placeholder="MC-CI-2024-000001"
              style={{ fontFamily: 'monospace', letterSpacing: 2, fontWeight: '700', color: C.greenL }}
            />
          </Card>

          {/* Contacts d'urgence */}
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ color: C.text, fontWeight: '800', fontSize: 15 }}>
                🆘 Contacts d'urgence ({contacts.length}/10)
              </Text>
              {contacts.length < 10 && (
                <TouchableOpacity onPress={() => setShowAddContact(!showAddContact)}
                  style={{ backgroundColor: `${C.green}20`, borderRadius: 8, padding: 6 }}>
                  <Text style={{ color: C.greenL, fontSize: 12, fontWeight: '700' }}>+ Ajouter</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={{ color: C.muted, fontSize: 12, marginBottom: 12 }}>
              Ces contacts seront accessibles à toute personne qui scanne le QR code de votre carte en cas d'urgence médicale.
            </Text>

            {showAddContact && (
              <View style={{ backgroundColor: C.card2, borderRadius: 10, padding: 12, marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Inp label="Prénom *" value={formContact.prenom} onChangeText={v => setFormContact(p => ({...p,prenom:v}))} placeholder="Marie" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Inp label="Nom" value={formContact.nom} onChangeText={v => setFormContact(p => ({...p,nom:v}))} placeholder="Koné" />
                  </View>
                </View>
                <Inp label="Téléphone *" value={formContact.telephone} onChangeText={v => setFormContact(p => ({...p,telephone:v}))} placeholder="+225 07 00 00 00" keyboardType="phone-pad" />
                <Inp label="Relation" value={formContact.relation} onChangeText={v => setFormContact(p => ({...p,relation:v}))} placeholder="Mère, Père, Conjoint(e)..." />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Btn onPress={() => setShowAddContact(false)} label="Annuler" color="#1E2F42" style={{ flex: 1 }} />
                  <Btn onPress={ajouterContact} label="Ajouter" style={{ flex: 2 }} />
                </View>
              </View>
            )}

            {contacts.map((c, i) => (
              <View key={c.id || i} style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                backgroundColor: C.card2, borderRadius: 10, padding: 12, marginBottom: 8
              }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, fontWeight: '700', fontSize: 13 }}>
                    {i+1}. {c.prenom} {c.nom}
                  </Text>
                  <Text style={{ color: C.muted, fontSize: 12 }}>{c.telephone}</Text>
                  {c.relation && <Text style={{ color: C.dim, fontSize: 11 }}>{c.relation}</Text>}
                </View>
                <TouchableOpacity onPress={() => supprimerContact(c.id || i)}
                  style={{ backgroundColor: `${C.red}20`, borderRadius: 8, padding: 8 }}>
                  <Text style={{ color: C.red, fontSize: 12 }}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            {contacts.length === 0 && (
              <Text style={{ color: C.dim, fontSize: 13, textAlign: 'center', padding: 12 }}>
                Aucun contact d'urgence ajouté
              </Text>
            )}
          </Card>

          <Btn onPress={lierCarte} label="💳 Lier ma carte MediConnect" loading={saving} style={{ marginBottom: 30 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── VUE : COMPTE EXISTANT ──────────────────────────────────────
  const TABS = [
    { key: 'carte',        icon: '💳', label: 'Ma Carte' },
    { key: 'contacts',     icon: '🆘', label: 'Urgences' },
    { key: 'recharger',    icon: '💰', label: 'Recharger' },
    { key: 'transactions', icon: '📋', label: 'Historique' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Header */}
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: C.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {navigation?.goBack && (
          <TouchableOpacity onPress={navigation.goBack}>
            <Text style={{ color: C.muted, fontSize: 22 }}>←</Text>
          </TouchableOpacity>
        )}
        <Text style={{ color: C.text, fontSize: 16, fontWeight: '800', flex: 1 }}>💳 MediConnect Card</Text>
        <View style={{ backgroundColor: compte.statut === 'actif' ? `${C.green}20` : `${C.red}20`, borderRadius: 8, padding: 6 }}>
          <Text style={{ color: compte.statut === 'actif' ? C.greenL : C.red, fontSize: 11, fontWeight: '700' }}>
            {compte.statut === 'actif' ? '● Actif' : '● Suspendu'}
          </Text>
        </View>
      </View>

      {/* Carte visuelle */}
      <View style={{
        margin: 16, borderRadius: 20, padding: 22,
        backgroundColor: '#071A12',
        borderWidth: 1, borderColor: C.green,
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <View>
            <Text style={{ color: C.greenL, fontSize: 11, fontWeight: '700', letterSpacing: 2 }}>MEDICONNECT CARD</Text>
            <Text style={{ color: C.text, fontSize: 8, color: C.dim }}>UEMOA · CEMAC</Text>
          </View>
          <Text style={{ fontSize: 28 }}>💳</Text>
        </View>
        <Text style={{ color: C.greenL, fontSize: 18, fontWeight: '900', letterSpacing: 3, fontFamily: 'monospace', marginBottom: 4 }}>
          {compte.numero_carte || '—'}
        </Text>
        <Text style={{ color: C.dim, fontSize: 11, marginBottom: 16 }}>
          N° Compte : {compte.numero_compte}
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View>
            <Text style={{ color: C.dim, fontSize: 10, marginBottom: 2 }}>TITULAIRE</Text>
            <Text style={{ color: C.text, fontSize: 14, fontWeight: '700' }}>
              {compte.prenom?.toUpperCase()} {compte.nom?.toUpperCase()}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: C.dim, fontSize: 10, marginBottom: 2 }}>SOLDE</Text>
            <Text style={{ color: C.greenL, fontSize: 20, fontWeight: '900' }}>
              {fmt(compte.solde)} F
            </Text>
          </View>
        </View>
        {compte.niveau && compte.niveau !== 'standard' && (
          <View style={{ marginTop: 10, backgroundColor: `${C.gold}20`, borderRadius: 6, padding: 4, alignSelf: 'flex-start' }}>
            <Text style={{ color: C.gold, fontSize: 10, fontWeight: '700' }}>
              ★ {compte.niveau.toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 16, marginBottom: 8 }}>
        {TABS.map(t => (
          <TouchableOpacity key={t.key} onPress={() => setOnglet(t.key)}
            style={{
              paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8,
              backgroundColor: onglet === t.key ? C.green : C.card,
              borderWidth: 1, borderColor: onglet === t.key ? C.green : C.border,
            }}>
            <Text style={{ color: onglet === t.key ? '#fff' : C.muted, fontSize: 13, fontWeight: '700' }}>
              {t.icon} {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={{ padding: 16 }}>

        {/* ── ONGLET MA CARTE ── */}
        {onglet === 'carte' && (
          <View>
            <Card>
              <Text style={{ color: C.text, fontWeight: '800', marginBottom: 12 }}>👤 Informations personnelles</Text>
              {[
                ['Téléphone', compte.telephone],
                ['Email', compte.email],
                ['Adresse', compte.adresse],
                ['Ville', compte.ville],
                ['Groupe sanguin', compte.groupe_sanguin],
                ['Allergies', compte.allergies],
              ].map(([label, value]) => value ? (
                <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: `${C.border}50` }}>
                  <Text style={{ color: C.muted, fontSize: 13 }}>{label}</Text>
                  <Text style={{ color: C.text, fontSize: 13, fontWeight: '600', maxWidth: '60%', textAlign: 'right' }}>{value}</Text>
                </View>
              ) : null)}
            </Card>
            <Card>
              <Text style={{ color: C.text, fontWeight: '800', marginBottom: 8 }}>📊 Statistiques</Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1, backgroundColor: C.card2, borderRadius: 10, padding: 12, alignItems: 'center' }}>
                  <Text style={{ color: C.greenL, fontSize: 20, fontWeight: '900' }}>{fmt(compte.solde)} F</Text>
                  <Text style={{ color: C.muted, fontSize: 11 }}>Solde disponible</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: C.card2, borderRadius: 10, padding: 12, alignItems: 'center' }}>
                  <Text style={{ color: C.gold, fontSize: 20, fontWeight: '900' }}>{compte.points_fidelite || 0}</Text>
                  <Text style={{ color: C.muted, fontSize: 11 }}>Points fidélité</Text>
                </View>
              </View>
            </Card>
          </View>
        )}

        {/* ── ONGLET CONTACTS URGENCE ── */}
        {onglet === 'contacts' && (
          <View>
            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ color: C.text, fontWeight: '800', fontSize: 15 }}>
                  🆘 Contacts d'urgence ({contacts.length}/10)
                </Text>
                {contacts.length < 10 && (
                  <TouchableOpacity onPress={() => setShowAddContact(!showAddContact)}
                    style={{ backgroundColor: `${C.green}20`, borderRadius: 8, padding: 8 }}>
                    <Text style={{ color: C.greenL, fontSize: 12, fontWeight: '700' }}>+ Ajouter</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={{ color: C.muted, fontSize: 12, marginBottom: 12 }}>
                Accessibles à toute personne scannant le QR code de votre carte en cas d'urgence.
              </Text>

              {showAddContact && (
                <View style={{ backgroundColor: C.card2, borderRadius: 10, padding: 12, marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Inp label="Prénom *" value={formContact.prenom} onChangeText={v => setFormContact(p => ({...p,prenom:v}))} placeholder="Marie" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Inp label="Nom" value={formContact.nom} onChangeText={v => setFormContact(p => ({...p,nom:v}))} placeholder="Koné" />
                    </View>
                  </View>
                  <Inp label="Téléphone *" value={formContact.telephone} onChangeText={v => setFormContact(p => ({...p,telephone:v}))} placeholder="+225 07 00 00 00" keyboardType="phone-pad" />
                  <Inp label="Relation" value={formContact.relation} onChangeText={v => setFormContact(p => ({...p,relation:v}))} placeholder="Mère, Père, Conjoint(e)..." />
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Btn onPress={() => setShowAddContact(false)} label="Annuler" color="#1E2F42" style={{ flex: 1 }} />
                    <Btn onPress={ajouterContact} label="Ajouter" style={{ flex: 2 }} />
                  </View>
                </View>
              )}

              {contacts.length === 0 && (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ fontSize: 32 }}>📋</Text>
                  <Text style={{ color: C.dim, marginTop: 8, textAlign: 'center' }}>Aucun contact d'urgence</Text>
                  <Text style={{ color: C.dim, fontSize: 12, textAlign: 'center', marginTop: 4 }}>Ajoutez jusqu'à 10 contacts</Text>
                </View>
              )}

              {contacts.map((c, i) => (
                <View key={c.id || i} style={{
                  backgroundColor: C.card2, borderRadius: 12, padding: 14, marginBottom: 8,
                  flexDirection: 'row', alignItems: 'center',
                }}>
                  <View style={{
                    width: 36, height: 36, borderRadius: 18,
                    backgroundColor: i === 0 ? `${C.red}30` : `${C.border}`,
                    justifyContent: 'center', alignItems: 'center', marginRight: 12
                  }}>
                    <Text style={{ color: i === 0 ? C.red : C.muted, fontWeight: '800', fontSize: 14 }}>{i+1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.text, fontWeight: '700', fontSize: 14 }}>
                      {c.prenom} {c.nom}
                      {i === 0 && <Text style={{ color: C.red, fontSize: 11 }}> (Principal)</Text>}
                    </Text>
                    <TouchableOpacity onPress={() => Linking.openURL(`tel:${c.telephone}`)}>
                      <Text style={{ color: C.greenL, fontSize: 13, marginTop: 2 }}>📞 {c.telephone}</Text>
                    </TouchableOpacity>
                    {c.relation && <Text style={{ color: C.dim, fontSize: 11, marginTop: 2 }}>{c.relation}</Text>}
                  </View>
                  <TouchableOpacity onPress={() => supprimerContact(c.id || i)}
                    style={{ backgroundColor: `${C.red}15`, borderRadius: 8, padding: 8 }}>
                    <Text style={{ color: C.red, fontSize: 12 }}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </Card>
          </View>
        )}

        {/* ── ONGLET RECHARGER ── */}
        {onglet === 'recharger' && (
          <View>
            <Card>
              <Text style={{ color: C.text, fontWeight: '800', fontSize: 15, marginBottom: 4 }}>💰 Recharger ma carte</Text>
              <Text style={{ color: C.muted, fontSize: 12, marginBottom: 16 }}>
                Solde actuel : <Text style={{ color: C.greenL, fontWeight: '700' }}>{fmt(compte.solde)} FCFA</Text>
              </Text>

              <Text style={{ color: C.muted, fontSize: 12, marginBottom: 8, fontWeight: '700' }}>Montant (FCFA) *</Text>
              <TextInput
                value={montantRecharge}
                onChangeText={setMontantRecharge}
                placeholder="Ex: 5000"
                placeholderTextColor={C.dim}
                keyboardType="numeric"
                style={{
                  backgroundColor: C.card2, borderWidth: 1, borderColor: C.border,
                  borderRadius: 10, padding: 14, color: C.greenL,
                  fontSize: 24, fontWeight: '900', textAlign: 'center', marginBottom: 16
                }}
              />

              {/* Montants rapides */}
              <Text style={{ color: C.muted, fontSize: 12, marginBottom: 8 }}>Montants rapides :</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {[1000, 2000, 5000, 10000, 20000, 50000].map(m => (
                  <TouchableOpacity key={m} onPress={() => setMontantRecharge(String(m))}
                    style={{
                      backgroundColor: montantRecharge === String(m) ? `${C.green}30` : C.card2,
                      borderWidth: 1, borderColor: montantRecharge === String(m) ? C.green : C.border,
                      borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
                    }}>
                    <Text style={{ color: montantRecharge === String(m) ? C.greenL : C.muted, fontWeight: '700', fontSize: 13 }}>
                      {fmt(m)} F
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={{ color: C.muted, fontSize: 12, marginBottom: 8, fontWeight: '700' }}>Mode de paiement :</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {['Wave', 'Orange Money', 'MTN MoMo', 'Espèces'].map(m => (
                  <TouchableOpacity key={m} onPress={() => setModeRecharge(m)}
                    style={{
                      flex: 1, padding: 10, borderRadius: 10, alignItems: 'center',
                      backgroundColor: modeRecharge === m ? `${C.green}20` : C.card2,
                      borderWidth: 1, borderColor: modeRecharge === m ? C.green : C.border,
                    }}>
                    <Text style={{ color: modeRecharge === m ? C.greenL : C.muted, fontSize: 11, fontWeight: '700', textAlign: 'center' }}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Btn onPress={recharger} label={`💳 Recharger ${montantRecharge ? fmt(+montantRecharge)+' FCFA' : ''}`} loading={saving} />
            </Card>
          </View>
        )}

        {/* ── ONGLET TRANSACTIONS ── */}
        {onglet === 'transactions' && (
          <View>
            <Card>
              <Text style={{ color: C.text, fontWeight: '800', fontSize: 15, marginBottom: 12 }}>📋 Historique des transactions</Text>
              {(compte.transactions_recentes || []).length === 0 && (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ fontSize: 32 }}>📭</Text>
                  <Text style={{ color: C.dim, marginTop: 8 }}>Aucune transaction</Text>
                </View>
              )}
              {(compte.transactions_recentes || []).map((t, i) => (
                <View key={t.id || i} style={{
                  flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                  paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: `${C.border}50`
                }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.text, fontSize: 13, fontWeight: '600' }}>
                      {t.type === 'recharge' ? '⬆️' : '⬇️'} {t.description || t.type}
                    </Text>
                    <Text style={{ color: C.dim, fontSize: 11, marginTop: 2 }}>
                      {new Date(t.created_at).toLocaleDateString('fr-FR')}
                    </Text>
                    {t.prestataire_nom && <Text style={{ color: C.dim, fontSize: 11 }}>{t.prestataire_nom}</Text>}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{
                      color: t.sens === 'credit' ? C.greenL : C.amber,
                      fontWeight: '800', fontSize: 15
                    }}>
                      {t.sens === 'credit' ? '+' : '-'}{fmt(t.montant)} F
                    </Text>
                    <Text style={{ color: C.dim, fontSize: 11 }}>Solde: {fmt(t.solde_apres)} F</Text>
                  </View>
                </View>
              ))}
            </Card>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}
