import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, TextInput,
} from 'react-native';
import { medecinAPI } from '../../services/api';
import { COLORS, SPACING, RADIUS } from '../../theme';

export default function PatientsScreen({ navigation }) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchPatients(); }, []);

  const fetchPatients = async () => {
    try {
      const res = await medecinAPI.getPatients();
      setPatients(res.data || PATIENTS_DEMO);
    } catch { setPatients(PATIENTS_DEMO); }
    finally { setLoading(false); }
  };

  const filtered = patients.filter(p =>
    `${p.prenom} ${p.nom}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes Patients</Text>
        <Text style={styles.count}>{patients.length}</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Rechercher un patient..."
          placeholderTextColor={COLORS.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} /> : (
        <ScrollView style={styles.list}>
          {filtered.map((p, i) => (
            <TouchableOpacity
              key={i}
              style={styles.patientCard}
              onPress={() => navigation.navigate('DossierPatient', { patient: p })}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{p.prenom?.[0]}{p.nom?.[0]}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{p.prenom} {p.nom}</Text>
                <Text style={styles.meta}>{p.age} ans · {p.sexe} · {p.groupe_sanguin}</Text>
                <Text style={styles.lastRdv}>Dernier RDV: {p.dernier_rdv || 'N/A'}</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          ))}
          <View style={{ height: 20 }} />
        </ScrollView>
      )}
    </View>
  );
}

const PATIENTS_DEMO = [
  { id: 1, prenom: 'Aya', nom: 'Konan', age: 32, sexe: 'F', groupe_sanguin: 'A+', dernier_rdv: '15/04/2026' },
  { id: 2, prenom: 'Moussa', nom: 'Diallo', age: 45, sexe: 'M', groupe_sanguin: 'O+', dernier_rdv: '10/04/2026' },
  { id: 3, prenom: 'Fatou', nom: 'Bamba', age: 28, sexe: 'F', groupe_sanguin: 'B+', dernier_rdv: '05/04/2026' },
  { id: 4, prenom: 'Koffi', nom: 'Assi', age: 55, sexe: 'M', groupe_sanguin: 'AB+', dernier_rdv: '01/04/2026' },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg, paddingTop: 55 },
  backText: { color: COLORS.primary, fontSize: 24 },
  headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  count: { backgroundColor: COLORS.primary, color: '#fff', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 2, fontSize: 14, fontWeight: 'bold' },
  searchContainer: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.md },
  searchInput: { backgroundColor: COLORS.inputBg, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.md, padding: SPACING.md, color: COLORS.text, fontSize: 15 },
  list: { flex: 1, paddingHorizontal: SPACING.lg },
  patientCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  info: { flex: 1 },
  name: { color: COLORS.text, fontWeight: 'bold', fontSize: 16 },
  meta: { color: COLORS.textSecondary, fontSize: 13 },
  lastRdv: { color: COLORS.textSecondary, fontSize: 12 },
  arrow: { color: COLORS.textSecondary, fontSize: 22 },
});
