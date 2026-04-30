import React, { useState, useRef } from 'react';
import { Routes, Route } from 'react-router-dom';
import useAuthStore from '../../context/authStore';
import { Card, Grid, PageHeader, Panel, Empty, Badge, ListItem } from '../../components/common/UI';
import PageFacturation from '../facturation/Facturation';

const ANALYSES_DEMO = [
  { id: 'LAB-001', type: 'NFS', patient: 'Aya Konan', emetteur: 'Polyclinique du Sud', date: '30/04/2026', fichier: 'nfs_konan.pdf', statut: 'nouveau', note: 'Numération Formule Sanguine complète' },
  { id: 'LAB-002', type: 'Glycémie', patient: 'Moussa Diallo', emetteur: 'Patient', date: '29/04/2026', fichier: 'glycemie_diallo.pdf', statut: 'traite', note: 'Glycémie à jeun + HbA1c' },
  { id: 'LAB-003', type: 'Bilan lipidique', patient: 'Fatou Bamba', emetteur: 'CHU Cocody', date: '28/04/2026', fichier: 'lipides_bamba.pdf', statut: 'nouveau', note: 'Cholestérol total, HDL, LDL, TG' },
];

function DashboardHome() {
  const { user } = useAuthStore();
  return (
    <div>
      <PageHeader title="🧪 Espace Laboratoire" subtitle={`Connecté en tant que ${user?.email}`} />
      <Grid cols={3} gap={14} style={{ marginBottom:20 }}>
        <Card label="Bulletins reçus" value={ANALYSES_DEMO.length} icon="🔬" color="#0D9488" />
        <Card label="En attente" value={ANALYSES_DEMO.filter(b=>b.statut==='nouveau').length} icon="⏳" color="#F59E0B" />
        <Card label="Traités" value={ANALYSES_DEMO.filter(b=>b.statut==='traite').length} icon="✅" color="#0A8F58" />
      </Grid>
      <Panel title="📥 Dernières demandes d'analyses">
        {ANALYSES_DEMO.map((b,i)=>(
          <ListItem key={i}
            left={<span style={{ fontSize:28 }}>🧪</span>}
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

function PageBulletinsLabo() {
  const [tab, setTab] = useState('recus');
  const fileRef = useRef();
  const [fichier, setFichier] = useState(null);
  const [resultat, setResultat] = useState('');
  const [loading, setLoading] = useState(false);
  const [succes, setSucces] = useState(false);

  const handleEnvoyer = () => {
    if (!fichier && !resultat) return;
    setLoading(true);
    setTimeout(()=>{ setLoading(false); setSucces(true); setTimeout(()=>setSucces(false),2000); },1500);
  };

  return (
    <div>
      <PageHeader title="🔬 Bulletins d'analyses" subtitle="Gestion des demandes et résultats d'analyses" />
      <div style={{ display:'flex', gap:4, background:'#0E1620', borderRadius:12, padding:4, marginBottom:24, width:'fit-content' }}>
        {[['recus','📥 Demandes reçues'],['envoyer','📤 Envoyer résultats']].map(([v,l])=>(
          <button key={v} onClick={()=>setTab(v)}
            style={{ background:tab===v?'#0D9488':'none', border:'none', borderRadius:8, padding:'8px 20px', color:tab===v?'#fff':'#8BA0B5', fontSize:13, fontWeight:tab===v?700:400, cursor:'pointer' }}>
            {l}
          </button>
        ))}
      </div>

      {tab==='recus' && (
        <Panel title={`Demandes reçues (${ANALYSES_DEMO.length})`}>
          {ANALYSES_DEMO.map((b,i)=>(
            <ListItem key={i}
              left={<span style={{ fontSize:24 }}>🧪</span>}
              center={<>
                <div style={{ fontSize:13, fontWeight:700 }}>{b.type} — {b.patient}</div>
                <div style={{ fontSize:11, color:'#8BA0B5' }}>De : {b.emetteur} · {b.date}</div>
                <div style={{ fontSize:11, color:'#8BA0B5' }}>{b.note}</div>
              </>}
              right={<div style={{ display:'flex', flexDirection:'column', gap:6, alignItems:'flex-end' }}>
                <Badge color={b.statut==='nouveau'?'blue':'green'}>{b.statut==='nouveau'?'En attente':'Traité'}</Badge>
                <button style={{ background:'rgba(13,148,136,.1)', border:'1px solid rgba(13,148,136,.3)', borderRadius:8, padding:'4px 10px', color:'#0D9488', fontSize:11, cursor:'pointer' }}>📄 Voir</button>
              </div>}
            />
          ))}
        </Panel>
      )}

      {tab==='envoyer' && (
        <div style={{ maxWidth:600 }}>
          {succes ? (
            <div style={{ textAlign:'center', padding:'60px', background:'#141E2B', borderRadius:16, border:'1px solid rgba(13,148,136,.3)' }}>
              <div style={{ fontSize:60, marginBottom:12 }}>✅</div>
              <div style={{ fontSize:18, fontWeight:800, color:'#F0F4F8' }}>Résultats envoyés !</div>
            </div>
          ) : (
            <div style={{ background:'#141E2B', border:'1px solid #1E2F42', borderRadius:16, padding:24 }}>
              <div style={{ fontSize:14, fontWeight:700, color:'#F0F4F8', marginBottom:16 }}>📤 Envoyer des résultats d'analyses</div>
              <div onClick={()=>fileRef.current?.click()}
                style={{ border:`2px dashed ${fichier?'#0D9488':'#1E2F42'}`, borderRadius:12, padding:'30px', textAlign:'center', cursor:'pointer', marginBottom:16, background:fichier?'rgba(13,148,136,.05)':'transparent' }}>
                <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e=>setFichier(e.target.files?.[0])} style={{ display:'none' }} />
                {fichier ? (
                  <div><div style={{ fontSize:32, marginBottom:8 }}>📄</div><div style={{ color:'#0D9488', fontWeight:700 }}>{fichier.name}</div></div>
                ) : (
                  <div><div style={{ fontSize:40, marginBottom:8 }}>📁</div><div style={{ color:'#8BA0B5' }}>Joindre le fichier de résultats</div></div>
                )}
              </div>
              <label style={{ fontSize:11, color:'#4E657A', display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:'.5px' }}>Interprétation / Commentaire</label>
              <textarea value={resultat} onChange={e=>setResultat(e.target.value)} placeholder="Interprétation des résultats..." rows={5}
                style={{ width:'100%', background:'#0E1620', border:'1px solid #1E2F42', borderRadius:10, padding:12, color:'#F0F4F8', fontSize:14, resize:'vertical', boxSizing:'border-box', marginBottom:16 }} />
              <button onClick={handleEnvoyer} disabled={loading}
                style={{ width:'100%', background:'linear-gradient(135deg,#0D9488,#0A8F58)', border:'none', borderRadius:12, padding:14, color:'#fff', fontSize:15, fontWeight:800, cursor:'pointer' }}>
                {loading?'⏳ Envoi...':'📤 Envoyer les résultats'}
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
      <Route path="bulletins"  element={<PageBulletinsLabo />} />
      <Route path="analyses"   element={<PageBulletinsLabo />} />
      <Route path="abonnement" element={<PageFacturation role="laboratoire" tarif={5000} service="Abonnement Laboratoire MediConnect" />} />
      <Route path="*" element={<div style={{ textAlign:'center', padding:60, color:'#4E657A' }}><div style={{ fontSize:40, marginBottom:12 }}>🚧</div><div>Section en développement</div></div>} />
    </Routes>
  );
}
