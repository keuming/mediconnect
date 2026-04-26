import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { patientAPI } from '../../services/api';
import { Card, Panel, ListItem, Avatar, Grid, PageHeader, Badge, Loader, Empty, Btn } from '../../components/common/UI';
import toast from 'react-hot-toast';
import useAuthStore from '../../context/authStore';

const fmt = (n) => Number(n||0).toLocaleString('fr-CI');

function DashboardHome() {
  const { user } = useAuthStore();
  const { data: profil } = useQuery({ queryKey: ['pat-profil'], queryFn: () => patientAPI.profil().then(r => r.data.data) });
  const { data: rdvs } = useQuery({ queryKey: ['pat-rdvs'], queryFn: () => patientAPI.rdvs().then(r => r.data.data || []) });
  const p = profil || {};
  return (
    <div>
      <PageHeader title={`👋 Bonjour, ${user?.prenom} !`} subtitle="Votre espace santé MediConnect" />
      {p.code_secret && (
        <div style={{ background: 'rgba(10,143,88,.08)', border: '1.5px solid rgba(10,143,88,.3)', borderRadius: 14, padding: '16px 24px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 36 }}>🔑</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: '#8BA0B5', marginBottom: 4 }}>Votre code secret patient — partagez-le avec votre médecin pour accéder à votre dossier</div>
            <div style={{ fontSize: 24, fontWeight: 900, fontFamily: 'monospace', color: '#0A8F58', letterSpacing: 4 }}>{p.code_secret}</div>
          </div>
          <Btn variant="outline" onClick={() => { navigator.clipboard.writeText(p.code_secret); toast.success('Code copié !'); }}>📋 Copier</Btn>
        </div>
      )}
      <Grid cols={3} gap={14} style={{ marginBottom: 20 }}>
        <Card label="Groupe sanguin" value={p.groupe_sanguin || '—'} icon="🩸" color="#E11D48" />
        <Card label="RDV à venir" value={(rdvs||[]).filter(r => r.statut !== 'termine' && r.statut !== 'annule').length} icon="📅" color="#0A8F58" />
        <Card label="Allergies" value={(p.allergies||[]).length || 0} icon="⚠️" color="#D97706" />
      </Grid>
      <Grid cols={2} gap={20}>
        <Panel title="📅 Mes prochains RDV">
          {(rdvs||[]).length === 0 ? <Empty icon="📅" title="Aucun rendez-vous" subtitle="Contactez votre clinique pour prendre un RDV" /> :
            (rdvs||[]).slice(0, 5).map(r => (
              <ListItem key={r.id}
                left={<div style={{ fontSize: 11, fontFamily: 'monospace', color: '#4E657A', width: 44 }}>{r.heure_rdv?.slice(0,5)}</div>}
                center={<><div style={{ fontSize: 13, fontWeight: 700 }}>{r.date_rdv}</div><div style={{ fontSize: 11, color: '#8BA0B5' }}>{r.medecin_nom || '—'} · {r.motif}</div></>}
                right={<Badge color={r.statut === 'confirme' ? 'green' : r.statut === 'en_cours' ? 'teal' : r.statut === 'annule' ? 'red' : 'amber'}>{r.statut}</Badge>}
              />
            ))}
        </Panel>
        <Panel title="🩺 Mes informations de santé">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
            {[['Poids', p.poids ? `${p.poids} kg` : '—'], ['Taille', p.taille ? `${p.taille} cm` : '—'], ['Groupe sanguin', p.groupe_sanguin || '—'], ['Sexe', p.sexe === 'M' ? 'Masculin' : p.sexe === 'F' ? 'Féminin' : '—']].map(([k,v]) => (
              <div key={k} style={{ background: '#1A2535', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: '#4E657A', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.5px' }}>{k}</div>
                <div style={{ fontWeight: 700, color: '#F0F4F8' }}>{v}</div>
              </div>
            ))}
          </div>
          {p.allergies?.length > 0 && (
            <div style={{ marginTop: 12, background: 'rgba(225,29,72,.07)', border: '1px solid rgba(225,29,72,.2)', borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#E11D48', marginBottom: 4 }}>⚠️ Allergies connues</div>
              <div style={{ fontSize: 12, color: '#F0F4F8' }}>{p.allergies.join(', ')}</div>
            </div>
          )}
        </Panel>
      </Grid>
    </div>
  );
}

function PageRdvs() {
  const { data } = useQuery({ queryKey: ['pat-rdvs'], queryFn: () => patientAPI.rdvs().then(r => r.data.data || []) });
  const rdvs = data || [];
  return (
    <div>
      <PageHeader title="📅 Mes Rendez-vous" subtitle={`${rdvs.length} rendez-vous`} />
      <Panel>
        {rdvs.length === 0 ? <Empty icon="📅" title="Aucun rendez-vous" /> : rdvs.map(r => (
          <ListItem key={r.id}
            left={<div style={{ textAlign: 'center', minWidth: 60 }}><div style={{ fontSize: 14, fontWeight: 800, color: '#0A8F58' }}>{r.heure_rdv?.slice(0,5)}</div><div style={{ fontSize: 11, color: '#4E657A' }}>{r.date_rdv}</div></div>}
            center={<><div style={{ fontSize: 13, fontWeight: 700 }}>{r.clinique_nom || 'Clinique'}</div><div style={{ fontSize: 11, color: '#8BA0B5' }}>{r.medecin_nom || '—'} · {r.motif}</div><div style={{ fontSize: 11, color: '#8BA0B5' }}>{r.assurance ? `🛡️ ${r.assurance}` : 'Sans assurance'}</div></>}
            right={<Badge color={r.statut === 'confirme' ? 'green' : r.statut === 'en_cours' ? 'teal' : r.statut === 'annule' ? 'red' : 'amber'}>{r.statut}</Badge>}
          />
        ))}
      </Panel>
    </div>
  );
}

function PageOrdonnances() {
  const { data } = useQuery({ queryKey: ['pat-ordos'], queryFn: () => patientAPI.ordonnances().then(r => r.data.data || []) });
  const ordos = data || [];
  return (
    <div>
      <PageHeader title="💊 Mes Ordonnances" subtitle={`${ordos.length} ordonnances actives`} />
      <Panel>
        {ordos.length === 0 ? <Empty icon="💊" title="Aucune ordonnance active" /> : ordos.map(o => (
          <ListItem key={o.id}
            left={<span style={{ fontSize: 28 }}>💊</span>}
            center={<><div style={{ fontSize: 14, fontWeight: 700, color: '#F0F4F8' }}>{o.medicament}</div><div style={{ fontSize: 12, color: '#8BA0B5' }}>Posologie : {o.posologie}</div><div style={{ fontSize: 11, color: '#8BA0B5' }}>Durée : {o.duree} · {o.medecin_nom ? `Prescrit par Dr. ${o.medecin_nom}` : ''}</div></>}
            right={<><Badge color={o.statut === 'active' ? 'green' : 'gray'}>{o.statut}</Badge>{o.renouvellements > 0 && <Badge color="blue">{o.renouvellements} renouv.</Badge>}</>}
          />
        ))}
      </Panel>
    </div>
  );
}

function PageDossier() {
  const { data: profil } = useQuery({ queryKey: ['pat-profil'], queryFn: () => patientAPI.profil().then(r => r.data.data) });
  const { data: cons } = useQuery({ queryKey: ['pat-cons'], queryFn: () => patientAPI.consultations().then(r => r.data.data || []) });
  const p = profil || {};
  return (
    <div>
      <PageHeader title="📋 Mon Dossier Médical" subtitle="Historique des consultations et code secret" />
      {p.code_secret && (
        <div style={{ background: 'rgba(10,143,88,.08)', border: '1.5px solid rgba(10,143,88,.3)', borderRadius: 14, padding: '20px 24px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 36 }}>🔑</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#F0F4F8', marginBottom: 4 }}>Votre code secret patient</div>
            <div style={{ fontSize: 11, color: '#8BA0B5', marginBottom: 8 }}>Partagez ce code avec votre médecin pour qu'il accède à votre dossier complet</div>
            <div style={{ fontSize: 28, fontWeight: 900, fontFamily: 'monospace', color: '#0A8F58', letterSpacing: 6 }}>{p.code_secret}</div>
          </div>
          <Btn variant="outline" onClick={() => { navigator.clipboard.writeText(p.code_secret); toast.success('Code copié !'); }}>📋 Copier</Btn>
        </div>
      )}
      <Panel title={`📋 Historique des consultations (${(cons||[]).length})`}>
        {(cons||[]).length === 0 ? <Empty icon="🩺" title="Aucune consultation enregistrée" /> : (cons||[]).map(c => (
          <div key={c.id} style={{ padding: '14px 0', borderBottom: '1px solid #0E1620' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#F0F4F8' }}>{c.date_consult} — {c.medecin_nom || c.clinique_nom}</div>
              <Badge color="green">Finalisée</Badge>
            </div>
            <div style={{ fontSize: 12, color: '#8BA0B5', marginBottom: 4 }}>🔍 Motif : {c.motif}</div>
            <div style={{ fontSize: 12, color: '#F0F4F8', marginBottom: 4 }}>📋 Diagnostic : {c.diagnostic}</div>
            {c.ordonnance?.length > 0 && <div style={{ fontSize: 12, color: '#0A8F58' }}>💊 {c.ordonnance.map(o => `${o.medicament} (${o.posologie})`).join(' · ')}</div>}
            {c.note_finale && <div style={{ fontSize: 11, color: '#D97706', marginTop: 4 }}>📝 {c.note_finale}</div>}
          </div>
        ))}
      </Panel>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Routes>
      <Route index element={<DashboardHome />} />
      <Route path="rdv" element={<PageRdvs />} />
      <Route path="ordonnances" element={<PageOrdonnances />} />
      <Route path="dossier" element={<PageDossier />} />
      <Route path="*" element={<div style={{ textAlign: 'center', padding: 60, color: '#4E657A' }}><div style={{ fontSize: 40, marginBottom: 12 }}>🚧</div><div>Section en développement</div></div>} />
    </Routes>
  );
}
