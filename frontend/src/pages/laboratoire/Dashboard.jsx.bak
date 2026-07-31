import React, { useState, useRef } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import useAuthStore from '../../context/authStore';
import api from '../../services/api';

const C = {
  teal:'#0D9488',green:'#0A8F58',amber:'#D97706',red:'#E11D48',blue:'#2563EB',purple:'#7C3AED',
  card:'#0E1620',input:'#141E2B',hover:'#1A2535',border:'#1E2F42',
  text:'#F0F4F8',muted:'#8BA0B5',dim:'#4E657A',
};
const fmtDate = d => d ? new Date(d).toLocaleDateString('fr-CI',{day:'numeric',month:'short',year:'numeric'}) : '—';

const labAPI = {
  bulletins: () => api.get('/bulletins', { params:{ categorie:'laboratoire' } }).catch(()=>({ data:{ data:[] } })),
  addBulletin: d => api.post('/bulletins', d),
  updBulletin: (id,d) => api.put(`/bulletins/${id}`, d),
};

const Badge = ({ children,color='gray' }) => {
  const m={green:[C.green,'rgba(10,143,88,.15)'],teal:[C.teal,'rgba(13,148,136,.15)'],amber:[C.amber,'rgba(217,119,6,.15)'],blue:[C.blue,'rgba(37,99,235,.15)'],gray:[C.muted,'rgba(255,255,255,.08)']};
  const[text,bg]=m[color]||m.gray;
  return <span style={{ background:bg,color:text,fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:20 }}>{children}</span>;
};
const Panel = ({ title,children,actions,style:s={} }) => (
  <div style={{ background:C.input,border:`1.5px solid ${C.border}`,borderRadius:14,padding:20,...s }}>
    {(title||actions)&&<div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16 }}>{title&&<h3 style={{ fontSize:14,fontWeight:700,color:C.text,margin:0 }}>{title}</h3>}{actions&&<div>{actions}</div>}</div>}
    {children}
  </div>
);
const Card = ({ label,value,icon,color=C.teal,sub }) => (
  <div style={{ background:C.input,border:`1.5px solid ${C.border}`,borderRadius:14,padding:'18px 16px' }}>
    <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:10 }}>{icon&&<span style={{ fontSize:18 }}>{icon}</span>}<span style={{ fontSize:11,textTransform:'uppercase',letterSpacing:'.5px',color:C.dim,fontWeight:700 }}>{label}</span></div>
    <div style={{ fontSize:26,fontWeight:900,color }}>{value}</div>
    {sub&&<div style={{ fontSize:12,color:C.muted,marginTop:3 }}>{sub}</div>}
  </div>
);
const Loader = () => <div style={{ textAlign:'center',padding:48,color:C.dim }}>⏳ Chargement…</div>;
const Empty = ({ icon,title,subtitle }) => <div style={{ textAlign:'center',padding:'36px 20px',color:C.dim }}><div style={{ fontSize:38,marginBottom:10 }}>{icon}</div>{title&&<div style={{ fontSize:15,fontWeight:700,color:C.muted,marginBottom:4 }}>{title}</div>}{subtitle&&<div style={{ fontSize:13 }}>{subtitle}</div>}</div>;
const Grid = ({ cols=2,gap=16,children,style:s={} }) => <div style={{ display:'grid',gridTemplateColumns:`repeat(${cols},1fr)`,gap,...s }}>{children}</div>;
const PageHeader = ({ title,subtitle }) => (
  <div style={{ marginBottom:24 }}>
    <h1 style={{ fontSize:22,fontWeight:800,color:C.text,margin:'0 0 4px' }}>{title}</h1>
    {subtitle&&<p style={{ fontSize:13,color:C.muted,margin:0 }}>{subtitle}</p>}
  </div>
);

function PageHome() {
  const { user } = useAuthStore();
  const nav = useNavigate();
  const { data, isLoading } = useQuery({ queryKey:['lab-bulletins'], queryFn:()=>labAPI.bulletins().then(r=>r.data.data||[]), retry:1 });
  const bulletins = data||[];

  return (
    <div>
      <div style={{ background:'linear-gradient(135deg,rgba(13,148,136,.12),rgba(10,143,88,.06))',border:'1px solid rgba(13,148,136,.2)',borderRadius:16,padding:24,marginBottom:24 }}>
        <div style={{ fontSize:22,fontWeight:800,color:C.text,marginBottom:4 }}>🧪 {user?.prenom} {user?.nom}</div>
        <div style={{ fontSize:13,color:C.muted }}>Espace Laboratoire · MediConnect Africa</div>
      </div>

      <Grid cols={3} gap={14} style={{ marginBottom:24 }}>
        <Card label="Bulletins reçus" value={bulletins.length}                            icon="🔬" color={C.teal}/>
        <Card label="En attente"      value={bulletins.filter(b=>b.statut==='nouveau').length} icon="⏳" color={C.amber}/>
        <Card label="Traités"         value={bulletins.filter(b=>b.statut==='traite').length}  icon="✅" color={C.green}/>
      </Grid>

      <Panel title="📥 Dernières demandes d'analyses" actions={
        <button onClick={()=>nav('bulletins')} style={{ background:'none',border:`1px solid ${C.border}`,borderRadius:8,padding:'5px 12px',color:C.muted,cursor:'pointer',fontSize:12,fontFamily:'inherit' }}>Tout voir →</button>
      }>
        {isLoading?<Loader/>:bulletins.length===0?<Empty icon="🧪" title="Aucune demande reçue" subtitle="Les demandes d'analyses envoyées par les cliniques apparaîtront ici"/>:
          bulletins.slice(0,5).map((b,i)=>(
            <div key={b.id||i} style={{ display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:`1px solid ${C.border}` }}>
              <span style={{ fontSize:22 }}>🧪</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13,fontWeight:700,color:C.text }}>{b.type||'Analyse'} — {b.patient_nom||'Patient'}</div>
                <div style={{ fontSize:11,color:C.muted }}>De: {b.emetteur_nom||'—'} · {fmtDate(b.created_at)}</div>
                {b.notes&&<div style={{ fontSize:11,color:C.dim }}>{b.notes}</div>}
              </div>
              <Badge color={b.statut==='nouveau'?'blue':'green'}>{b.statut==='nouveau'?'En attente':'Traité'}</Badge>
            </div>
          ))
        }
      </Panel>
    </div>
  );
}

function PageBulletins() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('recus');
  const fileRef = useRef();
  const [fichier, setFichier] = useState(null);
  const [resultat, setResultat] = useState('');
  const [patientNom, setPatientNom] = useState('');
  const [type, setType] = useState('NFS');
  const [notes, setNotes] = useState('');
  const [succes, setSucces] = useState(false);

  const { data, isLoading } = useQuery({ queryKey:['lab-bulletins'], queryFn:()=>labAPI.bulletins().then(r=>r.data.data||[]) });
  const bulletins = data||[];

  const addMut = useMutation({
    mutationFn: d => labAPI.addBulletin(d),
    onSuccess: () => { qc.invalidateQueries(['lab-bulletins']); setSucces(true); setTimeout(()=>setSucces(false),2500); setResultat(''); setFichier(null); setPatientNom(''); setNotes(''); },
    onError: () => { toast.error('Erreur'); setSucces(true); setTimeout(()=>setSucces(false),2500); },
  });
  const updMut = useMutation({
    mutationFn: ({id,statut}) => labAPI.updBulletin(id,{statut}),
    onSuccess: () => { toast.success('Mis à jour'); qc.invalidateQueries(['lab-bulletins']); },
  });

  const TYPES_LAB = ['NFS','Glycémie','Bilan lipidique','Bilan hépatique','Bilan rénal','Sérologie','Hémoculture','Ionogramme','HbA1c','Urine ECBU','Frottis','PCR','Groupe sanguin','Autre'];

  return (
    <div>
      <PageHeader title="🔬 Bulletins d'analyses" subtitle="Gestion des demandes et résultats"/>

      <div style={{ display:'flex',gap:4,background:C.input,borderRadius:12,padding:4,marginBottom:24,width:'fit-content' }}>
        {[['recus','📥 Demandes reçues'],['envoyer','📤 Envoyer résultats']].map(([v,l])=>(
          <button key={v} onClick={()=>setTab(v)}
            style={{ background:tab===v?C.teal:'none',border:'none',borderRadius:8,padding:'8px 20px',color:tab===v?'#fff':C.muted,fontSize:13,fontWeight:tab===v?700:400,cursor:'pointer',fontFamily:'inherit' }}>
            {l}
          </button>
        ))}
      </div>

      {tab==='recus'&&(
        isLoading?<Loader/>:bulletins.length===0?<Empty icon="🧪" title="Aucune demande reçue" subtitle="Les demandes d'analyses apparaîtront ici"/>:
        <Panel title={`Demandes reçues (${bulletins.length})`}>
          {bulletins.map((b,i)=>(
            <div key={b.id||i} style={{ display:'flex',alignItems:'flex-start',gap:14,padding:'12px 0',borderBottom:`1px solid ${C.border}` }}>
              <span style={{ fontSize:22 }}>🧪</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13,fontWeight:700,color:C.text }}>{b.type||'Analyse'} — {b.patient_nom||'—'}</div>
                <div style={{ fontSize:11,color:C.muted }}>De: {b.emetteur_nom||'—'} · {fmtDate(b.created_at)}</div>
                {b.notes&&<div style={{ fontSize:11,color:C.dim,marginTop:2 }}>{b.notes}</div>}
                {b.rapport&&<div style={{ fontSize:12,color:C.teal,marginTop:4,fontStyle:'italic' }}>📋 Résultats: {b.rapport.slice(0,80)}…</div>}
              </div>
              <div style={{ display:'flex',flexDirection:'column',gap:6,alignItems:'flex-end' }}>
                <Badge color={b.statut==='nouveau'?'blue':'green'}>{b.statut==='nouveau'?'En attente':'Traité'}</Badge>
                {b.statut==='nouveau'&&(
                  <button onClick={()=>updMut.mutate({id:b.id,statut:'traite'})}
                    style={{ background:'rgba(13,148,136,.1)',border:'1px solid rgba(13,148,136,.3)',borderRadius:8,padding:'4px 10px',color:C.teal,fontSize:11,cursor:'pointer',fontFamily:'inherit' }}>
                    ✅ Marquer traité
                  </button>
                )}
              </div>
            </div>
          ))}
        </Panel>
      )}

      {tab==='envoyer'&&(
        <div style={{ maxWidth:600 }}>
          {succes?(
            <div style={{ textAlign:'center',padding:'60px',background:C.input,borderRadius:16,border:`1px solid rgba(13,148,136,.3)` }}>
              <div style={{ fontSize:60,marginBottom:12 }}>✅</div>
              <div style={{ fontSize:18,fontWeight:800,color:C.text }}>Résultats envoyés avec succès !</div>
              <div style={{ fontSize:13,color:C.muted,marginTop:8 }}>Les résultats sont disponibles dans le dossier patient.</div>
            </div>
          ):(
            <div style={{ background:C.input,border:`1px solid ${C.border}`,borderRadius:16,padding:24 }}>
              <div style={{ fontSize:14,fontWeight:700,color:C.text,marginBottom:16 }}>📤 Envoyer des résultats d'analyses</div>

              <div style={{ marginBottom:14 }}>
                <label style={{ display:'block',fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:'.5px',marginBottom:5 }}>Type d'analyse *</label>
                <select value={type} onChange={e=>setType(e.target.value)}
                  style={{ width:'100%',background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:9,padding:'10px 14px',color:C.text,fontSize:14,outline:'none',fontFamily:'inherit' }}>
                  {TYPES_LAB.map(t=><option key={t}>{t}</option>)}
                </select>
              </div>

              <div style={{ marginBottom:14 }}>
                <label style={{ display:'block',fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:'.5px',marginBottom:5 }}>Nom du patient</label>
                <input value={patientNom} onChange={e=>setPatientNom(e.target.value)} placeholder="Koné Adjoua"
                  style={{ width:'100%',background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:9,padding:'10px 14px',color:C.text,fontSize:14,outline:'none',fontFamily:'inherit',boxSizing:'border-box' }}
                  onFocus={e=>e.target.style.borderColor=C.teal} onBlur={e=>e.target.style.borderColor=C.border}/>
              </div>

              {/* Upload fichier résultats */}
              <div onClick={()=>fileRef.current?.click()}
                style={{ border:`2px dashed ${fichier?C.teal:C.border}`,borderRadius:12,padding:'24px',textAlign:'center',cursor:'pointer',marginBottom:16,background:fichier?'rgba(13,148,136,.05)':'transparent',transition:'all .15s' }}>
                <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e=>setFichier(e.target.files?.[0])} style={{ display:'none' }}/>
                {fichier?(
                  <div><div style={{ fontSize:32,marginBottom:8 }}>📄</div><div style={{ color:C.teal,fontWeight:700,fontSize:13 }}>{fichier.name}</div></div>
                ):(
                  <div><div style={{ fontSize:40,marginBottom:8 }}>📁</div><div style={{ color:C.muted,fontSize:13 }}>Joindre le fichier de résultats (PDF, image)</div></div>
                )}
              </div>

              {/* Résultats + interprétation */}
              <div style={{ marginBottom:14 }}>
                <label style={{ display:'block',fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:'.5px',marginBottom:5 }}>Résultats et interprétation *</label>
                <textarea value={resultat} onChange={e=>setResultat(e.target.value)} placeholder="Détaillez les résultats d'analyses et votre interprétation clinique…" rows={6}
                  style={{ width:'100%',background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:9,padding:'12px 14px',color:C.text,fontSize:13,resize:'vertical',boxSizing:'border-box',outline:'none',fontFamily:'inherit' }}
                  onFocus={e=>e.target.style.borderColor=C.teal} onBlur={e=>e.target.style.borderColor=C.border}/>
              </div>

              <div style={{ marginBottom:16 }}>
                <label style={{ display:'block',fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:'.5px',marginBottom:5 }}>Notes</label>
                <input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Valeurs de référence, commentaires…"
                  style={{ width:'100%',background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:9,padding:'10px 14px',color:C.text,fontSize:14,outline:'none',fontFamily:'inherit',boxSizing:'border-box' }}/>
              </div>

              <button
                onClick={()=>{ if(!resultat.trim()&&!fichier){toast.error('Joignez un fichier ou rédigez les résultats');return;} addMut.mutate({ type,categorie:'laboratoire',patient_nom:patientNom||null,rapport:resultat||null,fichier_nom:fichier?.name||null,notes:notes||null }); }}
                disabled={addMut.isPending}
                style={{ width:'100%',background:`linear-gradient(135deg,${C.teal},${C.green})`,border:'none',borderRadius:12,padding:14,color:'#fff',fontSize:15,fontWeight:800,cursor:addMut.isPending?'not-allowed':'pointer',opacity:addMut.isPending?.7:1 }}>
                {addMut.isPending?'⏳ Envoi en cours…':'📤 Envoyer les résultats'}
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
      <Route index          element={<PageHome/>}/>
      <Route path="bulletins" element={<PageBulletins/>}/>
      <Route path="analyses"  element={<PageBulletins/>}/>
      <Route path="*"         element={<PageHome/>}/>
    </Routes>
  );
}
