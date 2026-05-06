import React, { useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import useAuthStore from '../../context/authStore';
import api from '../../services/api';

const C = {
  green:'#0A8F58',teal:'#0D9488',amber:'#D97706',red:'#E11D48',blue:'#2563EB',purple:'#7C3AED',
  card:'#0E1620',input:'#141E2B',hover:'#1A2535',border:'#1E2F42',
  text:'#F0F4F8',muted:'#8BA0B5',dim:'#4E657A',
};
const fmt = n => Number(n||0).toLocaleString('fr-CI');
const fmtDate = d => d ? new Date(d).toLocaleDateString('fr-CI',{day:'numeric',month:'short',year:'numeric'}) : '—';

const assAPI = {
  dossiers: () => api.get('/assurances'),
  valider:  id  => api.put(`/assurances/${id}/valider`),
  rejeter:  (id,motif) => api.put(`/assurances/${id}/rejeter`,{motif_rejet:motif}),
};

const Badge = ({ children,color='gray' }) => {
  const m = { green:[C.green,'rgba(10,143,88,.15)'],teal:[C.teal,'rgba(13,148,136,.15)'],amber:[C.amber,'rgba(217,119,6,.15)'],red:[C.red,'rgba(225,29,72,.15)'],blue:[C.blue,'rgba(37,99,235,.15)'],purple:[C.purple,'rgba(124,58,237,.15)'],gray:[C.muted,'rgba(255,255,255,.08)'] };
  const [text,bg] = m[color]||m.gray;
  return <span style={{ background:bg,color:text,fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:20 }}>{children}</span>;
};
const Card = ({ label,value,icon,color=C.green,sub,onClick }) => (
  <div onClick={onClick} style={{ background:C.input,border:`1.5px solid ${C.border}`,borderRadius:14,padding:'18px 16px',cursor:onClick?'pointer':'default' }}
    onMouseOver={e=>onClick&&(e.currentTarget.style.borderColor=color)} onMouseOut={e=>onClick&&(e.currentTarget.style.borderColor=C.border)}>
    <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:10 }}>{icon&&<span style={{ fontSize:18 }}>{icon}</span>}<span style={{ fontSize:11,textTransform:'uppercase',letterSpacing:'.5px',color:C.dim,fontWeight:700 }}>{label}</span></div>
    <div style={{ fontSize:26,fontWeight:900,color }}>{value}</div>
    {sub&&<div style={{ fontSize:12,color:C.muted,marginTop:3 }}>{sub}</div>}
  </div>
);
const Panel = ({ title,children,actions,style:s={} }) => (
  <div style={{ background:C.input,border:`1.5px solid ${C.border}`,borderRadius:14,padding:20,...s }}>
    {(title||actions)&&<div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16 }}>{title&&<h3 style={{ fontSize:14,fontWeight:700,color:C.text,margin:0 }}>{title}</h3>}{actions&&<div style={{ display:'flex',gap:8 }}>{actions}</div>}</div>}
    {children}
  </div>
);
const Modal = ({ open,onClose,title,children,width=500 }) => {
  if(!open)return null;
  return <div onClick={onClose} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16 }}><div onClick={e=>e.stopPropagation()} style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:28,width,maxWidth:'95vw',maxHeight:'90vh',overflowY:'auto' }}><div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20 }}><h2 style={{ fontSize:17,fontWeight:700,color:C.text,margin:0 }}>{title}</h2><button onClick={onClose} style={{ background:'none',border:'none',color:C.muted,cursor:'pointer',fontSize:20 }}>✕</button></div>{children}</div></div>;
};
const Btn = ({ children,onClick,variant='primary',loading,disabled,style:s={} }) => {
  const v = { primary:{background:`linear-gradient(135deg,${C.green},${C.teal})`,color:'#fff',border:'none'},outline:{background:'transparent',color:C.muted,border:`1.5px solid ${C.border}`},danger:{background:'rgba(225,29,72,.1)',color:C.red,border:'1.5px solid rgba(225,29,72,.25)'},amber:{background:C.amber,color:'#fff',border:'none'} };
  return <button onClick={onClick} disabled={loading||disabled} style={{ borderRadius:9,padding:'9px 18px',fontSize:13,fontWeight:700,cursor:(loading||disabled)?'not-allowed':'pointer',opacity:(loading||disabled)?.65:1,fontFamily:'inherit',...v[variant]||v.primary,...s }}>{loading?'⏳…':children}</button>;
};
const Grid = ({ cols=2,gap=16,children,style:s={} }) => <div style={{ display:'grid',gridTemplateColumns:`repeat(${cols},1fr)`,gap,...s }}>{children}</div>;
const Loader = () => <div style={{ textAlign:'center',padding:48,color:C.dim }}>⏳ Chargement…</div>;
const Empty = ({ icon,title,subtitle }) => <div style={{ textAlign:'center',padding:'36px 20px',color:C.dim }}><div style={{ fontSize:38,marginBottom:10 }}>{icon}</div>{title&&<div style={{ fontSize:15,fontWeight:700,color:C.muted,marginBottom:4 }}>{title}</div>}{subtitle&&<div style={{ fontSize:13 }}>{subtitle}</div>}</div>;
const PageHeader = ({ title,subtitle,actions }) => (
  <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:24 }}>
    <div><h1 style={{ fontSize:22,fontWeight:800,color:C.text,margin:'0 0 4px' }}>{title}</h1>{subtitle&&<p style={{ fontSize:13,color:C.muted,margin:0 }}>{subtitle}</p>}</div>
    {actions&&<div style={{ display:'flex',gap:10 }}>{actions}</div>}
  </div>
);

// ═══════════════════════════════════════════════════════════════════
// HOME ASSUREUR
// ═══════════════════════════════════════════════════════════════════
function PageHome() {
  const { user } = useAuthStore();
  const nav = useNavigate();
  const { data, isLoading } = useQuery({ queryKey:['ass-dossiers'], queryFn:()=>assAPI.dossiers().then(r=>r.data.data||[]), retry:1 });
  const dossiers = data||[];
  const soumis  = dossiers.filter(d=>['soumis','en_attente'].includes(d.statut));
  const valides = dossiers.filter(d=>d.statut==='valide');
  const totalMontant = valides.reduce((s,d)=>s+(+d.montant_assur||0),0);

  return (
    <div>
      <div style={{ background:'linear-gradient(135deg,rgba(37,99,235,.12),rgba(13,148,136,.06))',border:'1px solid rgba(37,99,235,.2)',borderRadius:16,padding:24,marginBottom:24 }}>
        <div style={{ fontSize:22,fontWeight:800,color:C.text,marginBottom:4 }}>🛡️ {user?.prenom} {user?.nom}</div>
        <div style={{ fontSize:13,color:C.muted }}>Espace Assureur — Tiers-payant MediConnect Africa</div>
      </div>

      <Grid cols={4} gap={14} style={{ marginBottom:24 }}>
        <Card label="Total dossiers" value={dossiers.length} icon="📁" color={C.blue} onClick={()=>nav('dossiers')}/>
        <Card label="En attente" value={soumis.length} icon="⏳" color={C.amber} sub="À traiter" onClick={()=>nav('dossiers')}/>
        <Card label="Validés" value={valides.length} icon="✅" color={C.green}/>
        <Card label="Montant remboursé" value={`${fmt(totalMontant)} F`} icon="💰" color={C.green}/>
      </Grid>

      <Panel title="⏳ Dossiers en attente" actions={<Btn style={{ padding:'6px 14px',fontSize:12 }} onClick={()=>nav('dossiers')}>Tout voir →</Btn>}>
        {isLoading ? <Loader/> : soumis.length===0 ? <Empty icon="✅" title="Aucun dossier en attente"/> :
          soumis.slice(0,5).map(d=>(
            <div key={d.id} style={{ display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:`1px solid ${C.border}` }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13,fontWeight:700,color:C.text }}>{d.patient_nom||'—'}</div>
                <div style={{ fontSize:11,color:C.muted }}>{d.compagnie||'—'} · {d.reference||'—'}</div>
              </div>
              <span style={{ fontSize:14,fontWeight:800,color:C.blue }}>{fmt(d.montant_total)} F</span>
              <Badge color="amber">En attente</Badge>
            </div>
          ))
        }
      </Panel>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// DOSSIERS TIERS-PAYANT
// ═══════════════════════════════════════════════════════════════════
function PageDossiers() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('soumis');
  const [selected, setSelected] = useState(null);
  const [motifRejet, setMotifRejet] = useState('');
  const [showRejet, setShowRejet] = useState(null);

  const { data, isLoading } = useQuery({ queryKey:['ass-dossiers'], queryFn:()=>assAPI.dossiers().then(r=>r.data.data||[]) });
  const dossiers = data||[];

  const validerMut = useMutation({
    mutationFn: id => assAPI.valider(id),
    onSuccess: () => { toast.success('✅ Dossier validé !'); qc.invalidateQueries(['ass-dossiers']); setSelected(null); },
    onError: () => toast.error('Erreur'),
  });
  const rejeterMut = useMutation({
    mutationFn: ({id,motif}) => assAPI.rejeter(id,motif),
    onSuccess: () => { toast.success('Dossier rejeté'); qc.invalidateQueries(['ass-dossiers']); setShowRejet(null); setSelected(null); },
    onError: () => toast.error('Erreur'),
  });

  const tabDefs = [
    { key:'soumis',    label:'En attente' },
    { key:'valide',    label:'Validés' },
    { key:'rejete',    label:'Rejetés' },
    { key:'',          label:'Tous' },
  ];
  const filtered = tab ? dossiers.filter(d=>d.statut===tab) : dossiers;
  const statusColor = { soumis:'blue',en_attente:'amber',valide:'green',rejete:'red' };

  return (
    <div>
      <PageHeader title="📁 Dossiers tiers-payant" subtitle={`${dossiers.length} dossier(s) · ${dossiers.filter(d=>d.statut==='soumis'||d.statut==='en_attente').length} en attente`}/>

      <div style={{ display:'flex',gap:4,background:C.input,borderRadius:10,padding:4,marginBottom:20 }}>
        {tabDefs.map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)}
            style={{ flex:1,background:tab===t.key?C.hover:'transparent',border:'none',borderRadius:8,padding:'8px',cursor:'pointer',fontFamily:'inherit',color:tab===t.key?C.text:C.muted,fontSize:12,fontWeight:tab===t.key?700:400 }}>
            {t.label} ({tab===t.key?filtered.length:t.key?dossiers.filter(d=>d.statut===t.key).length:dossiers.length})
          </button>
        ))}
      </div>

      {isLoading ? <Loader/> : filtered.length===0 ? <Empty icon="📁" title="Aucun dossier" subtitle="Les dossiers apparaîtront ici"/> :
        filtered.map(d=>(
          <div key={d.id} style={{ background:C.input,border:`1.5px solid ${C.border}`,borderRadius:14,padding:20,marginBottom:14,cursor:'pointer',transition:'border-color .15s' }}
            onMouseOver={e=>e.currentTarget.style.borderColor=C.blue} onMouseOut={e=>e.currentTarget.style.borderColor=C.border}
            onClick={()=>setSelected(d)}>
            <div style={{ display:'flex',alignItems:'flex-start',gap:14 }}>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:6 }}>
                  <h3 style={{ fontSize:14,fontWeight:700,color:C.text,margin:0 }}>{d.patient_nom||'—'}</h3>
                  <Badge color={statusColor[d.statut]||'gray'}>{d.statut}</Badge>
                </div>
                <div style={{ fontSize:12,color:C.muted,marginBottom:3 }}>🛡️ {d.compagnie||'—'} · N° {d.numero_police||'—'}</div>
                <div style={{ fontSize:11,color:C.dim }}>Réf: {d.reference||'—'} · {fmtDate(d.created_at)}</div>
                {d.diagnostic&&<div style={{ fontSize:12,color:C.muted,marginTop:4 }}>📋 {d.diagnostic}</div>}
                {d.motif_rejet&&<div style={{ fontSize:12,color:C.red,marginTop:4 }}>❌ Motif: {d.motif_rejet}</div>}
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:16,fontWeight:800,color:C.text,marginBottom:4 }}>{fmt(d.montant_total)} F</div>
                <div style={{ fontSize:12,color:C.green }}>Assur: {fmt(d.montant_assur)} F</div>
                <div style={{ fontSize:11,color:C.muted }}>Ticket: {fmt(d.ticket_moder)} F</div>
                {d.taux_couverture&&<div style={{ fontSize:11,color:C.teal }}>Couv: {d.taux_couverture}%</div>}
              </div>
            </div>
          </div>
        ))
      }

      {/* Modal détail dossier */}
      <Modal open={!!selected} onClose={()=>setSelected(null)} title={`📁 Dossier — ${selected?.patient_nom}`} width={540}>
        {selected&&(
          <div>
            <Grid cols={2} gap={12} style={{ marginBottom:16 }}>
              {[['Patient',selected.patient_nom],['Compagnie',selected.compagnie],['N° Police',selected.numero_police],['Référence',selected.reference],['Montant total',`${fmt(selected.montant_total)} F`],['Part assurance',`${fmt(selected.montant_assur)} F`],['Ticket modérateur',`${fmt(selected.ticket_moder)} F`],['Taux couverture',`${selected.taux_couverture||80}%`]].map(([k,v])=>(
                <div key={k} style={{ background:C.hover,borderRadius:8,padding:'9px 12px' }}>
                  <div style={{ fontSize:10,color:C.dim,fontWeight:700,textTransform:'uppercase',marginBottom:2 }}>{k}</div>
                  <div style={{ fontSize:13,color:C.text,fontWeight:600 }}>{v||'—'}</div>
                </div>
              ))}
            </Grid>
            {selected.diagnostic&&<div style={{ background:C.hover,borderRadius:10,padding:14,marginBottom:16,fontSize:13,color:C.muted }}><strong style={{ color:C.text }}>Diagnostic :</strong> {selected.diagnostic}</div>}

            {(selected.statut==='soumis'||selected.statut==='en_attente')&&(
              <div style={{ display:'flex',gap:10 }}>
                <Btn variant="danger" style={{ flex:1 }} onClick={()=>{setShowRejet(selected);setSelected(null);}}>❌ Rejeter</Btn>
                <Btn style={{ flex:2 }} loading={validerMut.isPending} onClick={()=>validerMut.mutate(selected.id)}>✅ Valider le remboursement</Btn>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal rejet */}
      <Modal open={!!showRejet} onClose={()=>setShowRejet(null)} title="❌ Motif de rejet">
        {showRejet&&(
          <div>
            <div style={{ fontSize:13,color:C.muted,marginBottom:14 }}>Dossier : <strong style={{ color:C.text }}>{showRejet.patient_nom}</strong></div>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block',fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',marginBottom:5 }}>Motif de rejet *</label>
              <textarea value={motifRejet} onChange={e=>setMotifRejet(e.target.value)} rows={4} placeholder="Documents incomplets, hors couverture, délai dépassé…"
                style={{ width:'100%',background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:9,padding:'10px 14px',color:C.text,fontSize:14,resize:'none',outline:'none',fontFamily:'inherit',boxSizing:'border-box' }}/>
            </div>
            <div style={{ display:'flex',gap:10 }}>
              <Btn variant="outline" style={{ flex:1 }} onClick={()=>setShowRejet(null)}>Annuler</Btn>
              <Btn variant="danger" style={{ flex:2 }} loading={rejeterMut.isPending} onClick={()=>{if(!motifRejet.trim()){toast.error('Motif requis');return;}rejeterMut.mutate({id:showRejet.id,motif:motifRejet});}}>Confirmer le rejet</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STATISTIQUES
// ═══════════════════════════════════════════════════════════════════
function PageStats() {
  const { data, isLoading } = useQuery({ queryKey:['ass-dossiers'], queryFn:()=>assAPI.dossiers().then(r=>r.data.data||[]) });
  const dossiers = data||[];
  const valides = dossiers.filter(d=>d.statut==='valide');
  const rejetes = dossiers.filter(d=>d.statut==='rejete');
  const total = dossiers.reduce((s,d)=>s+(+d.montant_total||0),0);
  const paye  = valides.reduce((s,d)=>s+(+d.montant_assur||0),0);
  const tauxValid = dossiers.length>0?Math.round(valides.length/dossiers.length*100):0;

  const parCompagnie = dossiers.reduce((acc,d)=>{
    const k=d.compagnie||'Inconnue';
    if(!acc[k])acc[k]={total:0,valide:0,montant:0};
    acc[k].total++; if(d.statut==='valide'){acc[k].valide++;acc[k].montant+=(+d.montant_assur||0);}
    return acc;
  },{});

  return(
    <div>
      <PageHeader title="📊 Statistiques assurance" subtitle="Performance & analyses des remboursements"/>
      {isLoading?<Loader/>:(
        <>
          <Grid cols={4} gap={14} style={{ marginBottom:20 }}>
            <Card label="Total dossiers" value={dossiers.length} icon="📁" color={C.blue}/>
            <Card label="Taux validation" value={`${tauxValid}%`} icon="✅" color={tauxValid>=70?C.green:C.amber}/>
            <Card label="Montant total traité" value={`${fmt(total)} F`} icon="💰" color={C.text}/>
            <Card label="Remboursé" value={`${fmt(paye)} F`} icon="💸" color={C.green}/>
          </Grid>

          <Panel title="🏢 Répartition par compagnie">
            {Object.entries(parCompagnie).map(([nom,stats])=>(
              <div key={nom} style={{ display:'flex',alignItems:'center',gap:14,padding:'12px 0',borderBottom:`1px solid ${C.border}` }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13,fontWeight:700,color:C.text }}>{nom}</div>
                  <div style={{ fontSize:11,color:C.muted }}>{stats.total} dossier(s) · {stats.valide} validé(s)</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:15,fontWeight:800,color:C.green }}>{fmt(stats.montant)} F</div>
                  <div style={{ fontSize:11,color:C.muted }}>remboursé</div>
                </div>
                <Badge color={stats.valide===stats.total?'green':stats.valide>0?'teal':'amber'}>
                  {stats.total>0?Math.round(stats.valide/stats.total*100):0}%
                </Badge>
              </div>
            ))}
            {Object.keys(parCompagnie).length===0&&<Empty icon="📊" title="Aucune donnée"/>}
          </Panel>
        </>
      )}
    </div>
  );
}

export default function Dashboard() {
  return (
    <Routes>
      <Route index          element={<PageHome/>}/>
      <Route path="dossiers" element={<PageDossiers/>}/>
      <Route path="stats"   element={<PageStats/>}/>
      <Route path="*"       element={<PageHome/>}/>
    </Routes>
  );
}
