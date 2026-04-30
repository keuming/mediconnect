import React from 'react';
import { Routes, Route } from 'react-router-dom';
import useAuthStore from '../../context/authStore';
import { Card, Panel, Grid, PageHeader, Badge, Empty, ListItem } from '../../components/common/UI';
import PageFacturation from '../facturation/Facturation';
import PageBulletins from '../Pagebulletins/PageBulletins';

function DashboardHome() {
  const { user } = useAuthStore();
  return (
    <div>
      <PageHeader title={`🏥 Espace Clinique`} subtitle={`Connecté en tant que ${user?.email}`} />
      <Grid cols={4} gap={14} style={{ marginBottom: 20 }}>
        <Card label="RDV aujourd'hui" value="—" icon="📅" color="#0A8F58" />
        <Card label="Patients actifs" value="—" icon="👤" color="#0D9488" />
        <Card label="Médecins" value="—" icon="👨‍⚕️" color="#2563EB" />
        <Card label="Chiffre du mois" value="—" icon="💰" color="#D97706" />
      </Grid>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }}>
        {['Planning & RDV','Dossiers patients','Caisse','Statistiques'].map((f,i) => (
          <div key={i} style={{ background: '#141E2B', border: '1px solid #1E2F42', borderRadius: 14, padding: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🚧</div>
            <div style={{ color: '#8BA0B5', fontSize: 13 }}>{f} — en développement</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Routes>
      <Route index element={<DashboardHome />} />
      <Route path="bulletins"   element={<PageBulletins role="clinique" />} />
      <Route path="abonnement"  element={<PageFacturation role="clinique" tarif={3000} service="Abonnement Clinique MediConnect" />} />
      <Route path="*" element={<div style={{ textAlign:'center', padding:60, color:'#4E657A' }}><div style={{ fontSize:40, marginBottom:12 }}>🚧</div><div>Section en développement</div></div>} />
    </Routes>
  );
}
