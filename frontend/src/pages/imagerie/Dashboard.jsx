import React, { useState, useRef } from 'react';
import { Routes, Route } from 'react-router-dom';
import useAuthStore from '../../context/authStore';
import { Card, Grid, PageHeader, Panel, Empty, Badge, ListItem } from '../../components/common/UI';
import PageFacturation from '../facturation/Facturation';

const BULLETINS_DEMO = [
  { id: 'IMG-001', type: 'Radiologie', patient: 'Aya Konan', emetteur: 'Polyclinique du Sud', date: '30/04/2026', fichier: 'radio_thorax_konan.pdf', statut: 'nouveau', note: 'RX thorax face et profil' },
  { id: 'IMG-002', type: 'IRM', patient: 'Moussa Diallo', emetteur: 'Patient', date: '29/04/2026', fichier: 'irm_cerveau_diallo.pdf', statut: 'traite', note: 'IRM cérébrale' },
  { id: 'IMG-003', type: 'Scanner', patient: 'Fatou Bamba', emetteur: 'CHU Cocody', date: '28/04/2026', fichier: 'scanner_abdo_bamba.pdf', statut: 'nouveau', note: 'Scanner abdominal' },
];

function DashboardHome() {
  const { user } = useAuthStore();
  return (
    <div>
      <PageHeader title="🩻 Espace Imagerie Médicale" subtitle={`Connecté en tant que ${user?.email}`} />
      <Grid cols={3} gap={14} style={{ marginBottom: 20 }}>
        <Card label="Bulletins reçus" value={BULLETINS_DEMO.length} icon="🩻" color="#8B5CF6" />
        <Card label="Non traités" value={BULLETINS_DEMO.filter(b=>b.statut==='nouveau').length} icon="⏳" color="#F59E0B" />
        <Card label="Traités" value={BULLETINS_DEMO.filter(b=>b.statut==='traite').length} icon="✅" color="#0A8F58" />
      </Grid>
      <Panel title="📥 Derniers bulletins reçus">
        {BULLETINS_DEMO.map((b,i) => (
          <ListItem key={i}
            left={<span style={{ fontSize:28 }}>🩻</span>}
            center={<>
              <div style={{ fontSize:13, fontWeight:700, color:'#F0F4F8' }}>{b.type} — {b.patient}</div>
              <div style={{ fontSize:11, color:'#8BA0B5' }}>De : {b.emetteur} · {b.date}</div>
              <div style={{ fontSize:11, color:'#8BA0B5' }}>{b.note}</div>
            </>}
            right={<Badge color={b.statut==='nouveau'?'blue':'green'}>{b.statut==='nouveau'?'Nouveau':'Traité'}</Badge>}
          />
        ))}
      </Panel>
    </div>
  );
}

function PageBulletinsImagerie() {
  const [tab, setTab] = useState('recus');
  const fileRef = useRef();
  const [fichier, setFichier] = useState(null);
  const [rapport, setRapport] = useState('');
  const [loading, setLoading] = useState(false);
  const [succes, setSucces] = useState(false);

  const handleEnvoyer = () => {
    if (!fichier && !rapport) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); setSucces(true); setTimeout(() => setSucces(false), 2000); }, 1500);
  };

  return (
    <div>
      <PageHeader title="🩻 Bulletins d'imagerie" subtitle="Gestion des bulletins reçus et rapports envoyés" />
      <div style={{ display:'flex', gap:4, background:'#0E1620', borderRadius:12, padding:4, marginBottom:24, width:'fit-content' }}>
        {[['recus','📥 Bulletins reçus'],['envoyer','📤 Envoyer un rapport']].map(([v,l])=>(
          <button key={v} onClick={()=>setTab(v)}
            style={{ background:tab===v?'#8B5CF6':'none', border:'none', borderRadius:8, padding:'8px 20px', color:tab===v?'#fff':'#8BA0B5', fontSize:13, fontWeight:tab===v?700:400, cursor:'pointer' }}>
            {l}
          </button>
        ))}
      </div>

      {tab==='recus' && (
        <Panel title={`Bulletins reçus (${BULLETINS_DEMO.length})`}>
          {BULLETINS_DEMO.map((b,i)=>(
            <ListItem key={i}
              left={<span style={{ fontSize:24 }}>🩻</span>}
              center={<>
                <div style={{ fontSize:13, fontWeight:700 }}>{b.type} — {b.patient}</div>
                <div style={{ fontSize:11, color:'#8BA0B5' }}>De : {b.emetteur} · {b.date}</div>
                <div style={{ fontSize:11, color:'#8BA0B5' }}>{b.note}</div>
              </>}
              right={<div style={{ display:'flex', flexDirection:'column', gap:6, alignItems:'flex-end' }}>
                <Badge color={b.statut==='nouveau'?'blue':'green'}>{b.statut==='nouveau'?'Nouveau':'Traité'}</Badge>
                <button style={{ background:'rgba(37,99,235,.1)', border:'1px solid rgba(37,99,235,.3)', borderRadius:8, padding:'4px 10px', color:'#2563EB', fontSize:11, cursor:'pointer' }}>📄 Voir</button>
              </div>}
            />
          ))}
        </Panel>
      )}

      {tab==='envoyer' && (
        <div style={{ maxWidth:600 }}>
          {succes ? (
            <div style={{ textAlign:'center', padding:'60px', background:'#141E2B', borderRadius:16, border:'1px solid rgba(139,92,246,.3)' }}>
              <div style={{ fontSize:60, marginBottom:12 }}>✅</div>
              <div style={{ fontSize:18, fontWeight:800, color:'#F0F4F8' }}>Rapport envoyé !</div>
            </div>
          ) : (
            <div style={{ background:'#141E2B', border:'1px solid #1E2F42', borderRadius:16, padding:24 }}>
              <div style={{ fontSize:14, fontWeight:700, color:'#F0F4F8', marginBottom:16 }}>📤 Envoyer un rapport d'imagerie</div>
              <div onClick={()=>fileRef.current?.click()}
                style={{ border:`2px dashed ${fichier?'#8B5CF6':'#1E2F42'}`, borderRadius:12, padding:'30px', textAlign:'center', cursor:'pointer', marginBottom:16, background:fichier?'rgba(139,92,246,.05)':'transparent' }}>
                <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.dcm" onChange={e=>setFichier(e.target.files?.[0])} style={{ display:'none' }} />
                {fichier ? (
                  <div><div style={{ fontSize:32, marginBottom:8 }}>📄</div><div style={{ color:'#8B5CF6', fontWeight:700 }}>{fichier.name}</div></div>
                ) : (
                  <div><div style={{ fontSize:40, marginBottom:8 }}>📁</div><div style={{ color:'#8BA0B5' }}>Cliquez pour joindre le fichier d'imagerie</div></div>
                )}
              </div>
              <label style={{ fontSize:11, color:'#4E657A', display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:'.5px' }}>Rapport / Compte-rendu</label>
              <textarea value={rapport} onChange={e=>setRapport(e.target.value)} placeholder="Rédigez votre compte-rendu d'imagerie..." rows={5}
                style={{ width:'100%', background:'#0E1620', border:'1px solid #1E2F42', borderRadius:10, padding:12, color:'#F0F4F8', fontSize:14, resize:'vertical', boxSizing:'border-box', marginBottom:16 }} />
              <button onClick={handleEnvoyer} disabled={loading}
                style={{ width:'100%', background:'linear-gradient(135deg,#8B5CF6,#6D28D9)', border:'none', borderRadius:12, padding:14, color:'#fff', fontSize:15, fontWeight:800, cursor:'pointer' }}>
                {loading?'⏳ Envoi...':'📤 Envoyer le rapport'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  return (
    <Routes>
      <Route index element={<DashboardHome />} />
      <Route path="bulletins"  element={<PageBulletinsImagerie />} />
      <Route path="rapports"   element={<PageBulletinsImagerie />} />
      <Route path="abonnement" element={<PageFacturation role="imagerie" tarif={5000} service="Abonnement Imagerie MediConnect" />} />
      <Route path="*" element={<div style={{ textAlign:'center', padding:60, color:'#4E657A' }}><div style={{ fontSize:40, marginBottom:12 }}>🚧</div><div>Section en développement</div></div>} />
    </Routes>
  );
}
