import React from 'react';
import { Routes, Route } from 'react-router-dom';
import useAuthStore from '../../context/authStore';

function Home() {
  const { user } = useAuthStore();
  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#F0F4F8', marginBottom: 6 }}>
        💊 Espace Pharmacie &mdash; {user?.prenom} {user?.nom}
      </h1>
      <p style={{ color: '#8BA0B5', fontSize: 13, marginBottom: 28 }}>
        Connecté en tant que <strong style={{ color: '#0A8F58' }}>{user?.email}</strong>
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }}>
        {['Section 1','Section 2','Section 3','Section 4'].map((f,i) => (
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
  return <Routes><Route index element={<Home />} /><Route path="*" element={<Home />} /></Routes>;
}
