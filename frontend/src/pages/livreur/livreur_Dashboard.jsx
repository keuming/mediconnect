import React from 'react';
import { Routes, Route } from 'react-router-dom';
import useAuthStore from '../../context/authStore';
import { Card, Grid, PageHeader } from '../../components/common/UI';
import PageFacturation from '../facturation/Facturation';

function DashboardHome() {
  const { user } = useAuthStore();
  return (
    <div>
      <PageHeader title="🛵 Espace Livreur" subtitle={`Connecté en tant que ${user?.email}`} />
      <Grid cols={3} gap={14} style={{ marginBottom: 20 }}>
        <Card label="Missions aujourd'hui" value="—" icon="🗂️" color="#0A8F58" />
        <Card label="En cours" value="—" icon="🛵" color="#D97706" />
        <Card label="Gains du mois" value="— F" icon="💵" color="#0D9488" />
      </Grid>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }}>
        {['Missions','En cours','Historique','Gains'].map((f,i) => (
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
      <Route path="abonnement" element={<PageFacturation role="livreur" tarif={1000} service="Abonnement Livreur MediConnect" />} />
      <Route path="*" element={<div style={{ textAlign:'center', padding:60, color:'#4E657A' }}><div style={{ fontSize:40, marginBottom:12 }}>🚧</div><div>Section en développement</div></div>} />
    </Routes>
  );
}
