import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import useAuthStore from '../../context/authStore';
import { Card, Grid, PageHeader, Panel, Badge, ListItem, Empty } from '../../components/common/UI';
import PageFacturation from '../facturation/Facturation';

const fmt = (n) => Number(n || 0).toLocaleString('fr-CI');

// ── Données démo ──────────────────────────────────────────────────
const DEMANDES_DEMO = [
  { id: 'DEM-001', patient: 'Aya Konan', age: 32, ville: 'Cocody, Abidjan', motif: 'Suivi hypertension et diabète', date: '01/05/2026', statut: 'en_attente', paiement: 'paye' },
  { id: 'DEM-002', patient: 'Moussa Diallo', age: 45, ville: 'Plateau, Abidjan', motif: 'Médecin de famille', date: '30/04/2026', statut: 'accepte', paiement: 'paye' },
  { id: 'DEM-003', patient: 'Fatou Bamba', age: 28, ville: 'Marcory, Abidjan', motif: 'Suivi grossesse', date: '29/04/2026', statut: 'refuse', paiement: 'paye' },
];

const PATIENTS_SUIVI = DEMANDES_DEMO.filter(d => d.statut === 'accepte');

// ── Page Accueil ──────────────────────────────────────────────────
function DashboardHome() {
  const { user } = useAuthStore();
  return (
    <div>
      <PageHeader title={`👨‍⚕️ Dr. ${user?.prenom} ${user?.nom}`} subtitle="Espace Médecin Indépendant MediConnect" />

      {/* Alerte setup non payé */}
      <div style={{ background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.3)', borderRadius: 14, padding: '14px 20px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#F59E0B', marginBottom: 4 }}>⚠️ Frais de mise en service</div>
          <div style={{ fontSize: 13, color: '#8BA0B5' }}>Payez vos frais de création de compte (10 000 FCFA) pour activer votre profil</div>
        </div>
        <a href="/medecin-prive/abonnement" style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)', border: 'none', borderRadius: 10, padding: '10px 20px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', textDecoration: 'none' }}>
          💳 Payer maintenant
        </a>
      </div>

      <Grid cols={3} gap={14} style={{ marginBottom: 20 }}>
        <Card label="Demandes en attente" value={DEMANDES_DEMO.filter(d => d.statut === 'en_attente').length} icon="⏳" color="#F59E0B" />
        <Card label="Patients suivis" value={PATIENTS_SUIVI.length} icon="👥" color="#0A8F58" />
        <Card label="Revenus du mois" value={fmt(PATIENTS_SUIVI.length * 1000) + ' F'} icon="💰" color="#0D9488" />
      </Grid>

      {/* Demandes récentes */}
      <Panel title="📋 Dernières demandes de suivi">
        {DEMANDES_DEMO.slice(0, 3).map((d, i) => (
          <ListItem key={i}
            left={<div style={{ width: 40, height: 40, background: '#0A8F5820', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>👤</div>}
            center={<>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#F0F4F8' }}>{d.patient} · {d.age} ans</div>
              <div style={{ fontSize: 12, color: '#8BA0B5' }}>{d.motif}</div>
              <div style={{ fontSize: 11, color: '#4E657A' }}>{d.ville} · {d.date}</div>
            </>}
            right={<Badge color={d.statut === 'accepte' ? 'green' : d.statut === 'refuse' ? 'red' : 'amber'}>
              {d.statut === 'accepte' ? '✓ Accepté' : d.statut === 'refuse' ? '✗ Refusé' : '⏳ En attente'}
            </Badge>}
          />
        ))}
      </Panel>
    </div>
  );
}

// ── Page Demandes ─────────────────────────────────────────────────
function PageDemandes() {
  const [demandes, setDemandes] = useState(DEMANDES_DEMO);
  const [tab, setTab] = useState('en_attente');

  const handleAction = (id, action) => {
    setDemandes(prev => prev.map(d => d.id === id ? { ...d, statut: action } : d));
  };

  const filtered = demandes.filter(d => d.statut === tab);

  return (
    <div>
      <PageHeader title="📋 Demandes de suivi" subtitle="Gérez les demandes de patients" />

      <div style={{ display: 'flex', gap: 4, background: '#0E1620', borderRadius: 12, padding: 4, marginBottom: 24, width: 'fit-content' }}>
        {[['en_attente', `⏳ En attente (${demandes.filter(d => d.statut === 'en_attente').length})`],
          ['accepte', `✓ Acceptées (${demandes.filter(d => d.statut === 'accepte').length})`],
          ['refuse', `✗ Refusées (${demandes.filter(d => d.statut === 'refuse').length})`]
        ].map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)}
            style={{ background: tab === v ? '#0A8F58' : 'none', border: 'none', borderRadius: 8, padding: '8px 16px', color: tab === v ? '#fff' : '#8BA0B5', fontSize: 13, fontWeight: tab === v ? 700 : 400, cursor: 'pointer' }}>
            {l}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Empty icon="📋" title="Aucune demande dans cette catégorie" />
      ) : (
        <div>
          {filtered.map((d, i) => (
            <div key={i} style={{ background: '#141E2B', border: `1px solid ${d.statut === 'en_attente' ? '#F59E0B40' : '#1E2F42'}`, borderRadius: 14, padding: '18px', marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#F0F4F8', marginBottom: 4 }}>👤 {d.patient} · {d.age} ans</div>
                  <div style={{ fontSize: 13, color: '#8BA0B5', marginBottom: 4 }}>📍 {d.ville}</div>
                  <div style={{ fontSize: 13, color: '#F0F4F8', marginBottom: 4 }}>💬 {d.motif}</div>
                  <div style={{ fontSize: 12, color: '#4E657A' }}>#{d.id} · {d.date}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                  <Badge color={d.paiement === 'paye' ? 'green' : 'red'}>
                    {d.paiement === 'paye' ? '✓ 1 000 F payé' : '⚠ Non payé'}
                  </Badge>
                  <Badge color={d.statut === 'accepte' ? 'green' : d.statut === 'refuse' ? 'red' : 'amber'}>
                    {d.statut === 'accepte' ? '✓ Accepté' : d.statut === 'refuse' ? '✗ Refusé' : '⏳ En attente'}
                  </Badge>
                </div>
              </div>

              {d.statut === 'en_attente' && d.paiement === 'paye' && (
                <div style={{ display: 'flex', gap: 10, borderTop: '1px solid #1E2F42', paddingTop: 12 }}>
                  <button onClick={() => handleAction(d.id, 'accepte')}
                    style={{ flex: 1, background: 'linear-gradient(135deg,#0A8F58,#0D9488)', border: 'none', borderRadius: 10, padding: '10px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    ✓ Accepter & devenir médecin référent
                  </button>
                  <button onClick={() => handleAction(d.id, 'refuse')}
                    style={{ flex: 1, background: 'rgba(225,29,72,.1)', border: '1px solid rgba(225,29,72,.3)', borderRadius: 10, padding: '10px', color: '#E11D48', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    ✗ Refuser
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page Patients suivis ──────────────────────────────────────────
function PagePatients() {
  return (
    <div>
      <PageHeader title="👥 Mes patients" subtitle={`${PATIENTS_SUIVI.length} patient(s) sous suivi privé`} />
      {PATIENTS_SUIVI.length === 0 ? (
        <Empty icon="👥" title="Aucun patient sous suivi" subtitle="Acceptez des demandes pour voir vos patients ici" />
      ) : (
        PATIENTS_SUIVI.map((p, i) => (
          <div key={i} style={{ background: '#141E2B', border: '1px solid #1E2F42', borderRadius: 14, padding: '18px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 50, height: 50, background: '#0A8F5820', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>👤</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#F0F4F8', marginBottom: 4 }}>{p.patient} · {p.age} ans</div>
              <div style={{ fontSize: 13, color: '#8BA0B5', marginBottom: 2 }}>📍 {p.ville}</div>
              <div style={{ fontSize: 13, color: '#8BA0B5' }}>💬 {p.motif}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Badge color="green">✓ Suivi actif</Badge>
              <button style={{ background: 'rgba(37,99,235,.1)', border: '1px solid rgba(37,99,235,.3)', borderRadius: 8, padding: '6px 14px', color: '#2563EB', fontSize: 12, cursor: 'pointer' }}>
                📋 Dossier
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ── Router ────────────────────────────────────────────────────────
export default function Dashboard() {
  return (
    <Routes>
      <Route index element={<DashboardHome />} />
      <Route path="demandes" element={<PageDemandes />} />
      <Route path="patients" element={<PagePatients />} />
      <Route path="abonnement" element={<PageFacturation role="medecin_prive" tarif={1000} service="Abonnement Médecin Indépendant MediConnect" setupFrais={10000} />} />
      <Route path="*" element={<div style={{ textAlign: 'center', padding: 60, color: '#4E657A' }}><div style={{ fontSize: 40, marginBottom: 12 }}>🚧</div><div>Section en développement</div></div>} />
    </Routes>
  );
}
