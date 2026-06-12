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
const fmt     = n => Number(n||0).toLocaleString('fr-CI');
const fmtDate = d => d ? new Date(d).toLocaleDateString('fr-CI',{day:'numeric',month:'short',year:'numeric'}) : '—';
const pct     = (a,b) => b>0 ? Math.round(a/b*100) : 0;

// ── API calls ────────────────────────────────────────────────────
const A = {
  // Anciennes routes dossiers_assurance (dashboard clinique)
  dossiers:       ()         => api.get('/assurances'),
  valider:        id         => api.put(`/assurances/${id}/valider`),
  rejeter:        (id,motif) => api.put(`/assurances/${id}/rejeter`,{motif_rejet:motif}),
  // Nouvelles routes assurance (migration v3.1.0)
  offres:         ()         => api.get('/assurance/offres'),
  mesOffres:      ()         => api.get('/assurance/mes-offres'),
  createOffre:    data       => api.post('/assurance/offres', data),
  updateOffre:    (id,data)  => api.patch(`/assurance/offres/${id}`, data),
  souscriptions:  ()         => api.get('/assurance/mes-souscriptions'),
  dossiersTp:     (s)        => api.get(`/assurance/dossiers-tp${s?`?statut=${s}`:''}`),
  traiterTp:      (id,data)  => api.patch(`/assurance/dossiers-tp/${id}`, data),
  validerSouscr:  (id,data)  => api.patch(`/assurance/souscriptions/${id}`, data),
  // Nouvelles routes facturation temps réel
  factures:       (params)   => api.get(`/assurance/factures${params||''}`),
  solde:          ()         => api.get('/assurance/solde'),
  soldeParPrest:  ()         => api.get('/assurance/solde-par-prestataire'),
  patients:       ()         => api.get('/assurance/patients'),
  traiterFa:      (id,data)  => api.patch(`/assurance/factures/${id}`, data),
};

// ── Composants UI ────────────────────────────────────────────────
const Badge = ({ children,color='gray' }) => {
  const m = { green:[C.green,'rgba(10,143,88,.15)'],teal:[C.teal,'rgba(13,148,136,.15)'],amber:[C.amber,'rgba(217,119,6,.15)'],red:[C.red,'rgba(225,29,72,.15)'],blue:[C.blue,'rgba(37,99,235,.15)'],purple:[C.purple,'rgba(124,58,237,.15)'],gray:[C.muted,'rgba(255,255,255,.08)'] };
  const [text,bg] = m[color]||m.gray;
  return <span style={{ background:bg,color:text,fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:20 }}>{children}</span>;
};
const Card = ({ label,value,icon,color=C.green,sub,onClick }) => (
  <div onClick={onClick} style={{ background:C.input,border:`1.5px solid ${C.border}`,borderRadius:14,padding:'18px 16px',cursor:onClick?'pointer':'default' }}
    onMouseOver={e=>onClick&&(e.currentTarget.style.borderColor=color)} onMouseOut={e=>onClick&&(e.currentTarget.style.borderColor=C.border)}>
    <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:10 }}>
      {icon&&<span style={{ fontSize:18 }}>{icon}</span>}
      <span style={{ fontSize:11,textTransform:'uppercase',letterSpacing:'.5px',color:C.dim,fontWeight:700 }}>{label}</span>
    </div>
    <div style={{ fontSize:26,fontWeight:900,color }}>{value}</div>
    {sub&&<div style={{ fontSize:12,color:C.muted,marginTop:3 }}>{sub}</div>}
  </div>
);
const Panel = ({ title,children,actions,style:s={} }) => (
  <div style={{ background:C.input,border:`1.5px solid ${C.border}`,borderRadius:14,padding:20,...s }}>
    {(title||actions)&&<div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16 }}>
      {title&&<h3 style={{ fontSize:14,fontWeight:700,color:C.text,margin:0 }}>{title}</h3>}
      {actions&&<div style={{ display:'flex',gap:8 }}>{actions}</div>}
    </div>}
    {children}
  </div>
);
const Modal = ({ open,onClose,title,children,width=500 }) => {
  if(!open) return null;
  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:28,width,maxWidth:'95vw',maxHeight:'90vh',overflowY:'auto' }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20 }}>
          <h2 style={{ fontSize:17,fontWeight:700,color:C.text,margin:0 }}>{title}</h2>
          <button onClick={onClose} style={{ background:'none',border:'none',color:C.muted,cursor:'pointer',fontSize:20 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
};
const Btn = ({ children,onClick,variant='primary',loading,disabled,style:s={} }) => {
  const v = {
    primary:{ background:`linear-gradient(135deg,${C.green},${C.teal})`,color:'#fff',border:'none' },
    outline:{ background:'transparent',color:C.muted,border:`1.5px solid ${C.border}` },
    danger:{ background:'rgba(225,29,72,.1)',color:C.red,border:'1.5px solid rgba(225,29,72,.25)' },
    amber:{ background:C.amber,color:'#fff',border:'none' },
    blue:{ background:C.blue,color:'#fff',border:'none' },
  };
  return <button onClick={onClick} disabled={loading||disabled} style={{ borderRadius:9,padding:'9px 18px',fontSize:13,fontWeight:700,cursor:(loading||disabled)?'not-allowed':'pointer',opacity:(loading||disabled)?.65:1,fontFamily:'inherit',...v[variant]||v.primary,...s }}>{loading?'⏳…':children}</button>;
};
const Grid = ({ cols=2,gap=16,children,style:s={} }) => <div style={{ display:'grid',gridTemplateColumns:`repeat(${cols},1fr)`,gap,...s }}>{children}</div>;
const Loader = () => <div style={{ textAlign:'center',padding:48,color:C.dim }}>⏳ Chargement…</div>;
const Empty = ({ icon,title,subtitle }) => (
  <div style={{ textAlign:'center',padding:'36px 20px',color:C.dim }}>
    <div style={{ fontSize:38,marginBottom:10 }}>{icon}</div>
    {title&&<div style={{ fontSize:15,fontWeight:700,color:C.muted,marginBottom:4 }}>{title}</div>}
    {subtitle&&<div style={{ fontSize:13 }}>{subtitle}</div>}
  </div>
);
const PageHeader = ({ title,subtitle,actions }) => (
  <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:24 }}>
    <div>
      <h1 style={{ fontSize:22,fontWeight:800,color:C.text,margin:'0 0 4px' }}>{title}</h1>
      {subtitle&&<p style={{ fontSize:13,color:C.muted,margin:0 }}>{subtitle}</p>}
    </div>
    {actions&&<div style={{ display:'flex',gap:10 }}>{actions}</div>}
  </div>
);
const Input = ({ label,value,onChange,type='text',placeholder,required,style:s={} }) => (
  <div style={{ marginBottom:14,...s }}>
    {label&&<label style={{ display:'block',fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',marginBottom:5 }}>{label}{required&&<span style={{ color:C.red }}> *</span>}</label>}
    <input type={type} value={value} onChange={onChange} placeholder={placeholder}
      style={{ width:'100%',background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:9,padding:'10px 14px',color:C.text,fontSize:14,outline:'none',fontFamily:'inherit',boxSizing:'border-box' }}/>
  </div>
);
const Textarea = ({ label,value,onChange,rows=3,placeholder }) => (
  <div style={{ marginBottom:14 }}>
    {label&&<label style={{ display:'block',fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',marginBottom:5 }}>{label}</label>}
    <textarea value={value} onChange={onChange} rows={rows} placeholder={placeholder}
      style={{ width:'100%',background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:9,padding:'10px 14px',color:C.text,fontSize:14,resize:'vertical',outline:'none',fontFamily:'inherit',boxSizing:'border-box' }}/>
  </div>
);

// Statuts TP
const statutTpColor = s => ({ soumis:'amber',en_cours:'blue',valide:'teal',rembourse:'green',rejete:'red',litige:'purple' }[s]||'gray');
const statutTpLabel = s => ({ soumis:'Soumis',en_cours:'En cours',valide:'Validé',rembourse:'Remboursé',rejete:'Rejeté',litige:'Litige' }[s]||s);
const statutSouscColor = s => ({ en_attente:'amber',active:'green',suspendue:'red',resiliee:'gray' }[s]||'gray');
const statutSouscLabel = s => ({ en_attente:'En attente',active:'Active',suspendue:'Suspendue',resiliee:'Résiliée' }[s]||s);

// ═══════════════════════════════════════════════════════════════════
// PAGE HOME
// ═══════════════════════════════════════════════════════════════════
function PageHome() {
  const { user } = useAuthStore();
  const nav = useNavigate();

  const { data:offresData } = useQuery({ queryKey:['ass-mes-offres'], queryFn:()=>A.mesOffres().then(r=>r.data.offres||[]), retry:1 });
  const { data:tpData }     = useQuery({ queryKey:['ass-tp-all'],     queryFn:()=>A.dossiersTp().then(r=>r.data.dossiers||[]), retry:1 });

  const offres  = offresData||[];
  const tpList  = tpData||[];
  const tpEnAttente = tpList.filter(d=>d.statut==='soumis');
  const tpValides   = tpList.filter(d=>d.statut==='valide');
  const tpRembourses= tpList.filter(d=>d.statut==='rembourse');
  const totalRembourse = tpRembourses.reduce((s,d)=>s+(+d.montant_pris_en_charge||0),0);
  const totalSouscriptions = offres.reduce((s,o)=>s+(+o.nb_souscriptions||0),0);

  return (
    <div>
      <div style={{ background:'linear-gradient(135deg,rgba(37,99,235,.12),rgba(13,148,136,.06))',border:'1px solid rgba(37,99,235,.2)',borderRadius:16,padding:24,marginBottom:24 }}>
        <div style={{ fontSize:22,fontWeight:800,color:C.text,marginBottom:4 }}>🛡️ {user?.prenom} {user?.nom}</div>
        <div style={{ fontSize:13,color:C.muted }}>Espace Assureur — MediConnect Africa · Tiers-payant & Offres santé</div>
      </div>

      <Grid cols={4} gap={14} style={{ marginBottom:24 }}>
        <Card label="Mes offres" value={offres.length} icon="📋" color={C.blue} onClick={()=>nav('offres')} sub={`${offres.filter(o=>o.actif).length} actives`}/>
        <Card label="Souscriptions" value={totalSouscriptions} icon="👥" color={C.teal} onClick={()=>nav('souscriptions')}/>
        <Card label="Dossiers TP en attente" value={tpEnAttente.length} icon="⏳" color={C.amber} sub="À traiter" onClick={()=>nav('tiers-payant')}/>
        <Card label="Montant remboursé" value={`${fmt(totalRembourse)} F`} icon="💰" color={C.green}/>
      </Grid>

      <Grid cols={2} gap={16} style={{ marginBottom:16 }}>
        {/* Dossiers TP urgents */}
        <Panel title="⚡ Dossiers TP à traiter" actions={<Btn style={{ padding:'6px 14px',fontSize:12 }} onClick={()=>nav('tiers-payant')}>Tout voir →</Btn>}>
          {tpEnAttente.length===0 ? <Empty icon="✅" title="Aucun dossier en attente"/> :
            tpEnAttente.slice(0,5).map(d=>(
              <div key={d.id} style={{ display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:`1px solid ${C.border}` }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13,fontWeight:700,color:C.text }}>{d.patient_nom||'Patient'}</div>
                  <div style={{ fontSize:11,color:C.muted }}>Réf: {d.reference||'—'} · {fmtDate(d.date_soumission)}</div>
                </div>
                <span style={{ fontSize:14,fontWeight:800,color:C.blue }}>{fmt(d.montant_total)} F</span>
                <Badge color="amber">Soumis</Badge>
              </div>
            ))
          }
        </Panel>

        {/* Top offres */}
        <Panel title="📋 Mes offres actives" actions={<Btn style={{ padding:'6px 14px',fontSize:12 }} onClick={()=>nav('offres')}>Gérer →</Btn>}>
          {offres.length===0 ? <Empty icon="📋" title="Aucune offre" subtitle="Créez votre première offre"/> :
            offres.filter(o=>o.actif).slice(0,5).map(o=>(
              <div key={o.id} style={{ display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:`1px solid ${C.border}` }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13,fontWeight:700,color:C.text }}>{o.nom}</div>
                  <div style={{ fontSize:11,color:C.muted }}>{fmt(o.prix_mensuel)} FCFA/mois · {o.nb_souscriptions||0} souscription(s)</div>
                </div>
                <Badge color="green">Active</Badge>
              </div>
            ))
          }
        </Panel>
      </Grid>

      {/* Barre stats TP */}
      <Panel title="📊 Vue d'ensemble tiers-payant">
        <Grid cols={4} gap={12}>
          {[
            ['Soumis',tpList.filter(d=>d.statut==='soumis').length,C.amber],
            ['En cours',tpList.filter(d=>d.statut==='en_cours').length,C.blue],
            ['Validés',tpValides.length,C.teal],
            ['Remboursés',tpRembourses.length,C.green],
          ].map(([label,val,color])=>(
            <div key={label} style={{ background:C.hover,borderRadius:10,padding:'12px 14px',textAlign:'center' }}>
              <div style={{ fontSize:22,fontWeight:900,color }}>{val}</div>
              <div style={{ fontSize:11,color:C.muted,marginTop:2 }}>{label}</div>
            </div>
          ))}
        </Grid>
      </Panel>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// GESTION OFFRES (CRUD)
// ═══════════════════════════════════════════════════════════════════
const COUVERTURES_DEFAUT = { hospitalisation:80, pharmacie:70, consultation:90, urgences:100, imagerie:0, laboratoire:0, specialiste:0, rapatriement:0 };

function PageOffres() {
  const qc = useQueryClient();
  const [showForm, setShowForm]   = useState(false);
  const [editOffre, setEditOffre] = useState(null);
  const [detailOffre, setDetailOffre] = useState(null);

  const { data, isLoading } = useQuery({ queryKey:['ass-mes-offres'], queryFn:()=>A.mesOffres().then(r=>r.data.offres||[]) });
  const offres = data||[];

  const initForm = { nom:'', description:'', prix_mensuel:'', franchise:'', plafond_annuel:'', delai_remboursement:72, couverture_details:{...COUVERTURES_DEFAUT} };
  const [form, setForm] = useState(initForm);

  const openCreate = () => { setForm(initForm); setEditOffre(null); setShowForm(true); };
  const openEdit   = o  => {
    setForm({ nom:o.nom, description:o.description||'', prix_mensuel:o.prix_mensuel, franchise:o.franchise||0, plafond_annuel:o.plafond_annuel||'', delai_remboursement:o.delai_remboursement||72, couverture_details:{...COUVERTURES_DEFAUT,...(o.couverture_details||{})} });
    setEditOffre(o); setShowForm(true);
  };

  const createMut = useMutation({
    mutationFn: ()=>A.createOffre({ ...form, prix_mensuel:+form.prix_mensuel, franchise:+form.franchise||0, plafond_annuel:+form.plafond_annuel||null }),
    onSuccess: () => { toast.success('✅ Offre créée !'); qc.invalidateQueries(['ass-mes-offres']); setShowForm(false); },
    onError: e => toast.error(e.response?.data?.error||'Erreur'),
  });
  const updateMut = useMutation({
    mutationFn: ()=>A.updateOffre(editOffre.id, { ...form, prix_mensuel:+form.prix_mensuel, franchise:+form.franchise||0, plafond_annuel:+form.plafond_annuel||null }),
    onSuccess: () => { toast.success('✅ Offre mise à jour !'); qc.invalidateQueries(['ass-mes-offres']); setShowForm(false); },
    onError: e => toast.error(e.response?.data?.error||'Erreur'),
  });
  const toggleMut = useMutation({
    mutationFn: o=>A.updateOffre(o.id, { actif:!o.actif }),
    onSuccess: (_,o) => { toast.success(o.actif?'Offre désactivée':'Offre activée'); qc.invalidateQueries(['ass-mes-offres']); },
  });

  const setCouv = (k,v) => setForm(f=>({ ...f, couverture_details:{...f.couverture_details,[k]:+v} }));

  return (
    <div>
      <PageHeader title="📋 Gestion des Offres" subtitle={`${offres.length} offre(s) · ${offres.filter(o=>o.actif).length} active(s)`}
        actions={<Btn onClick={openCreate}>+ Nouvelle offre</Btn>}/>

      {isLoading ? <Loader/> : offres.length===0 ? (
        <Panel><Empty icon="📋" title="Aucune offre" subtitle="Créez votre première offre d'assurance santé">
          <Btn style={{ marginTop:14 }} onClick={openCreate}>+ Créer une offre</Btn>
        </Empty></Panel>
      ) : (
        <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
          {offres.map(o=>(
            <div key={o.id} style={{ background:C.input,border:`1.5px solid ${o.actif?C.border:'rgba(225,29,72,.2)'}`,borderRadius:14,padding:20 }}>
              <div style={{ display:'flex',alignItems:'flex-start',gap:16 }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:6 }}>
                    <span style={{ fontSize:16,fontWeight:800,color:C.text }}>{o.nom}</span>
                    <Badge color={o.actif?'green':'red'}>{o.actif?'Active':'Inactive'}</Badge>
                  </div>
                  <div style={{ fontSize:13,color:C.muted,marginBottom:10 }}>{o.description||'—'}</div>
                  <Grid cols={4} gap={10}>
                    <div style={{ background:C.hover,borderRadius:8,padding:'8px 12px' }}>
                      <div style={{ fontSize:10,color:C.dim,fontWeight:700,textTransform:'uppercase' }}>Prix/mois</div>
                      <div style={{ fontSize:15,fontWeight:800,color:C.green }}>{fmt(o.prix_mensuel)} F</div>
                    </div>
                    <div style={{ background:C.hover,borderRadius:8,padding:'8px 12px' }}>
                      <div style={{ fontSize:10,color:C.dim,fontWeight:700,textTransform:'uppercase' }}>Franchise</div>
                      <div style={{ fontSize:15,fontWeight:800,color:C.text }}>{fmt(o.franchise||0)} F</div>
                    </div>
                    <div style={{ background:C.hover,borderRadius:8,padding:'8px 12px' }}>
                      <div style={{ fontSize:10,color:C.dim,fontWeight:700,textTransform:'uppercase' }}>Plafond/an</div>
                      <div style={{ fontSize:15,fontWeight:800,color:C.text }}>{o.plafond_annuel?`${fmt(o.plafond_annuel)} F`:'Illimité'}</div>
                    </div>
                    <div style={{ background:C.hover,borderRadius:8,padding:'8px 12px' }}>
                      <div style={{ fontSize:10,color:C.dim,fontWeight:700,textTransform:'uppercase' }}>Souscriptions</div>
                      <div style={{ fontSize:15,fontWeight:800,color:C.blue }}>{o.nb_souscriptions||0}</div>
                    </div>
                  </Grid>
                  {/* Badges couvertures */}
                  {o.couverture_details&&(
                    <div style={{ display:'flex',flexWrap:'wrap',gap:6,marginTop:10 }}>
                      {Object.entries(o.couverture_details).filter(([,v])=>v>0).map(([k,v])=>(
                        <span key={k} style={{ background:'rgba(13,148,136,.15)',color:C.teal,fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:20 }}>
                          {k} {v}%
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
                  <Btn style={{ padding:'7px 14px',fontSize:12 }} onClick={()=>setDetailOffre(o)}>🔍 Détail</Btn>
                  <Btn variant="outline" style={{ padding:'7px 14px',fontSize:12 }} onClick={()=>openEdit(o)}>✏️ Modifier</Btn>
                  <Btn variant={o.actif?'danger':'amber'} style={{ padding:'7px 14px',fontSize:12 }} onClick={()=>toggleMut.mutate(o)}>
                    {o.actif?'⏸ Désactiver':'▶ Activer'}
                  </Btn>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal créer/modifier offre */}
      <Modal open={showForm} onClose={()=>setShowForm(false)} title={editOffre?'✏️ Modifier l\'offre':'+ Nouvelle offre'} width={600}>
        <Input label="Nom de l'offre" value={form.nom} onChange={e=>setForm(f=>({...f,nom:e.target.value}))} placeholder="Pack Santé Essentiel CI" required/>
        <Textarea label="Description" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Décrivez les avantages de cette offre…"/>
        <Grid cols={2} gap={12}>
          <Input label="Prix mensuel (FCFA)" type="number" value={form.prix_mensuel} onChange={e=>setForm(f=>({...f,prix_mensuel:e.target.value}))} placeholder="5000" required/>
          <Input label="Franchise (FCFA)" type="number" value={form.franchise} onChange={e=>setForm(f=>({...f,franchise:e.target.value}))} placeholder="10000"/>
        </Grid>
        <Grid cols={2} gap={12}>
          <Input label="Plafond annuel (FCFA)" type="number" value={form.plafond_annuel} onChange={e=>setForm(f=>({...f,plafond_annuel:e.target.value}))} placeholder="2000000"/>
          <Input label="Délai remboursement (h)" type="number" value={form.delai_remboursement} onChange={e=>setForm(f=>({...f,delai_remboursement:+e.target.value}))} placeholder="72"/>
        </Grid>

        {/* Curseurs couvertures */}
        <div style={{ marginBottom:14 }}>
          <label style={{ display:'block',fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',marginBottom:10 }}>Taux de couverture (%)</label>
          <Grid cols={2} gap={10}>
            {Object.entries(form.couverture_details).map(([k,v])=>(
              <div key={k} style={{ background:C.hover,borderRadius:9,padding:'10px 14px' }}>
                <div style={{ display:'flex',justifyContent:'space-between',marginBottom:6 }}>
                  <span style={{ fontSize:12,fontWeight:700,color:C.text,textTransform:'capitalize' }}>{k}</span>
                  <span style={{ fontSize:12,fontWeight:900,color:v>0?C.teal:C.dim }}>{v}%</span>
                </div>
                <input type="range" min="0" max="100" step="5" value={v} onChange={e=>setCouv(k,e.target.value)}
                  style={{ width:'100%',accentColor:C.teal }}/>
              </div>
            ))}
          </Grid>
        </div>

        <div style={{ display:'flex',gap:10,marginTop:4 }}>
          <Btn variant="outline" style={{ flex:1 }} onClick={()=>setShowForm(false)}>Annuler</Btn>
          <Btn style={{ flex:2 }} loading={createMut.isPending||updateMut.isPending}
            onClick={()=>{ if(!form.nom||!form.prix_mensuel){toast.error('Nom et prix requis');return;} editOffre?updateMut.mutate():createMut.mutate(); }}>
            {editOffre?'💾 Enregistrer':'✅ Créer l\'offre'}
          </Btn>
        </div>
      </Modal>

      {/* Modal détail offre */}
      <Modal open={!!detailOffre} onClose={()=>setDetailOffre(null)} title={`🔍 ${detailOffre?.nom}`} width={560}>
        {detailOffre&&(
          <div>
            <Grid cols={2} gap={10} style={{ marginBottom:16 }}>
              {[
                ['Prix mensuel',`${fmt(detailOffre.prix_mensuel)} FCFA`],
                ['Souscriptions',detailOffre.nb_souscriptions||0],
                ['Franchise',`${fmt(detailOffre.franchise||0)} FCFA`],
                ['Plafond annuel',detailOffre.plafond_annuel?`${fmt(detailOffre.plafond_annuel)} FCFA`:'Illimité'],
                ['Délai remboursement',`${detailOffre.delai_remboursement||72}h`],
                ['Statut',detailOffre.actif?'Active':'Inactive'],
              ].map(([k,v])=>(
                <div key={k} style={{ background:C.hover,borderRadius:8,padding:'9px 12px' }}>
                  <div style={{ fontSize:10,color:C.dim,fontWeight:700,textTransform:'uppercase',marginBottom:2 }}>{k}</div>
                  <div style={{ fontSize:14,color:C.text,fontWeight:700 }}>{v}</div>
                </div>
              ))}
            </Grid>
            {detailOffre.description&&<div style={{ background:C.hover,borderRadius:10,padding:14,marginBottom:16,fontSize:13,color:C.muted }}>{detailOffre.description}</div>}
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:12,fontWeight:700,color:C.muted,textTransform:'uppercase',marginBottom:10 }}>Couvertures</div>
              {detailOffre.couverture_details&&Object.entries(detailOffre.couverture_details).filter(([,v])=>v>0).map(([k,v])=>(
                <div key={k} style={{ display:'flex',alignItems:'center',gap:10,marginBottom:8 }}>
                  <span style={{ fontSize:12,color:C.text,textTransform:'capitalize',width:120 }}>{k}</span>
                  <div style={{ flex:1,background:C.hover,borderRadius:99,height:8,overflow:'hidden' }}>
                    <div style={{ width:`${v}%`,background:`linear-gradient(90deg,${C.green},${C.teal})`,height:'100%',borderRadius:99 }}/>
                  </div>
                  <span style={{ fontSize:12,fontWeight:800,color:C.teal,width:36,textAlign:'right' }}>{v}%</span>
                </div>
              ))}
            </div>
            <div style={{ display:'flex',gap:10 }}>
              <Btn variant="outline" style={{ flex:1 }} onClick={()=>setDetailOffre(null)}>Fermer</Btn>
              <Btn style={{ flex:1 }} onClick={()=>{ openEdit(detailOffre); setDetailOffre(null); }}>✏️ Modifier</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TIERS-PAYANT (nouvelle API v3.1.0)
// ═══════════════════════════════════════════════════════════════════
function PageTiersPayant() {
  const qc = useQueryClient();
  const [tab, setTab]         = useState('soumis');
  const [selected, setSelected] = useState(null);
  const [showTraiter, setShowTraiter] = useState(null);
  const [traitForm, setTraitForm]     = useState({ statut:'valide', montant_pris_en_charge:'', motif_rejet:'' });

  const { data, isLoading } = useQuery({ queryKey:['ass-tp',tab], queryFn:()=>A.dossiersTp(tab==='tous'?null:tab).then(r=>r.data.dossiers||[]) });
  const dossiers = data||[];

  const traiterMut = useMutation({
    mutationFn: ()=>A.traiterTp(showTraiter.id, { statut:traitForm.statut, montant_pris_en_charge:traitForm.montant_pris_en_charge?+traitForm.montant_pris_en_charge:undefined, motif_rejet:traitForm.motif_rejet||undefined }),
    onSuccess: () => { toast.success('✅ Dossier mis à jour !'); qc.invalidateQueries(['ass-tp']); setShowTraiter(null); setSelected(null); },
    onError: e => toast.error(e.response?.data?.error||'Erreur'),
  });

  const TABS = [['soumis','⏳ Soumis'],['en_cours','🔄 En cours'],['valide','✅ Validés'],['rembourse','💸 Remboursés'],['rejete','❌ Rejetés'],['tous','📁 Tous']];

  return (
    <div>
      <PageHeader title="🏥 Tiers-Payant" subtitle="Traitement des dossiers de remboursement"/>

      {/* Onglets */}
      <div style={{ display:'flex',gap:6,marginBottom:20,flexWrap:'wrap' }}>
        {TABS.map(([key,label])=>(
          <button key={key} onClick={()=>setTab(key)}
            style={{ padding:'8px 16px',borderRadius:99,fontSize:12,fontWeight:700,cursor:'pointer',border:'none',
              background:tab===key?`linear-gradient(135deg,${C.green},${C.teal})`:'rgba(255,255,255,.06)',
              color:tab===key?'#fff':C.muted }}>
            {label}
          </button>
        ))}
      </div>

      {isLoading ? <Loader/> : dossiers.length===0 ? <Panel><Empty icon="📭" title="Aucun dossier" subtitle={`Aucun dossier "${tab}" pour le moment`}/></Panel> : (
        <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
          {dossiers.map(d=>(
            <div key={d.id} style={{ background:C.input,border:`1.5px solid ${C.border}`,borderRadius:12,padding:18,cursor:'pointer' }}
              onClick={()=>setSelected(d)}
              onMouseOver={e=>e.currentTarget.style.borderColor=C.teal}
              onMouseOut={e=>e.currentTarget.style.borderColor=C.border}>
              <div style={{ display:'flex',alignItems:'center',gap:14 }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:4 }}>
                    <span style={{ fontSize:14,fontWeight:700,color:C.text }}>{d.patient_nom||'Patient'}</span>
                    <Badge color={statutTpColor(d.statut)}>{statutTpLabel(d.statut)}</Badge>
                  </div>
                  <div style={{ fontSize:11,color:C.muted }}>Réf: {d.reference||'—'} · {fmtDate(d.date_soumission)}</div>
                  {d.motif_rejet&&<div style={{ fontSize:12,color:C.red,marginTop:4 }}>❌ {d.motif_rejet}</div>}
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:16,fontWeight:800,color:C.text }}>{fmt(d.montant_total)} F</div>
                  {d.montant_pris_en_charge&&<div style={{ fontSize:12,color:C.green }}>Pris en charge: {fmt(d.montant_pris_en_charge)} F</div>}
                  {d.montant_patient&&<div style={{ fontSize:11,color:C.muted }}>Patient: {fmt(d.montant_patient)} F</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal détail + actions */}
      <Modal open={!!selected} onClose={()=>setSelected(null)} title={`📁 Dossier TP — ${selected?.reference}`} width={560}>
        {selected&&(
          <div>
            <Grid cols={2} gap={10} style={{ marginBottom:16 }}>
              {[
                ['Patient',selected.patient_nom||'—'],
                ['Téléphone',selected.patient_tel||'—'],
                ['Référence',selected.reference||'—'],
                ['Date soumission',fmtDate(selected.date_soumission)],
                ['Montant total',`${fmt(selected.montant_total)} F`],
                ['Pris en charge',selected.montant_pris_en_charge?`${fmt(selected.montant_pris_en_charge)} F`:'—'],
                ['Reste patient',selected.montant_patient?`${fmt(selected.montant_patient)} F`:'—'],
                ['Statut',statutTpLabel(selected.statut)],
              ].map(([k,v])=>(
                <div key={k} style={{ background:C.hover,borderRadius:8,padding:'9px 12px' }}>
                  <div style={{ fontSize:10,color:C.dim,fontWeight:700,textTransform:'uppercase',marginBottom:2 }}>{k}</div>
                  <div style={{ fontSize:13,color:C.text,fontWeight:600 }}>{v}</div>
                </div>
              ))}
            </Grid>
            {selected.motif_rejet&&<div style={{ background:'rgba(225,29,72,.08)',border:'1px solid rgba(225,29,72,.2)',borderRadius:10,padding:14,marginBottom:16,fontSize:13,color:C.red }}>❌ Motif rejet: {selected.motif_rejet}</div>}
            {['soumis','en_cours'].includes(selected.statut)&&(
              <div style={{ display:'flex',gap:10 }}>
                <Btn variant="outline" style={{ flex:1 }} onClick={()=>setSelected(null)}>Fermer</Btn>
                <Btn style={{ flex:2 }} onClick={()=>{ setShowTraiter(selected); setTraitForm({statut:'valide',montant_pris_en_charge:'',motif_rejet:''}); setSelected(null); }}>⚡ Traiter ce dossier</Btn>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal traitement */}
      <Modal open={!!showTraiter} onClose={()=>setShowTraiter(null)} title="⚡ Traiter le dossier" width={500}>
        {showTraiter&&(
          <div>
            <div style={{ background:C.hover,borderRadius:10,padding:14,marginBottom:16,fontSize:13,color:C.muted }}>
              Patient: <strong style={{ color:C.text }}>{showTraiter.patient_nom}</strong> · Montant: <strong style={{ color:C.text }}>{fmt(showTraiter.montant_total)} F</strong>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block',fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',marginBottom:8 }}>Décision *</label>
              <div style={{ display:'flex',gap:8 }}>
                {[['valide','✅ Valider'],['en_cours','🔄 En cours'],['rejete','❌ Rejeter']].map(([val,label])=>(
                  <button key={val} onClick={()=>setTraitForm(f=>({...f,statut:val}))}
                    style={{ flex:1,padding:'10px',borderRadius:9,fontSize:12,fontWeight:700,cursor:'pointer',
                      border:`2px solid ${traitForm.statut===val?C.green:C.border}`,
                      background:traitForm.statut===val?'rgba(10,143,88,.15)':C.hover,
                      color:traitForm.statut===val?C.green:C.muted }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {traitForm.statut==='valide'&&(
              <Input label="Montant pris en charge (FCFA)" type="number" value={traitForm.montant_pris_en_charge}
                onChange={e=>setTraitForm(f=>({...f,montant_pris_en_charge:e.target.value}))}
                placeholder={`Max: ${fmt(showTraiter.montant_total)} F`}/>
            )}
            {traitForm.statut==='rejete'&&(
              <Textarea label="Motif de rejet *" value={traitForm.motif_rejet}
                onChange={e=>setTraitForm(f=>({...f,motif_rejet:e.target.value}))}
                placeholder="Documents incomplets, hors couverture, délai dépassé…"/>
            )}
            <div style={{ display:'flex',gap:10,marginTop:8 }}>
              <Btn variant="outline" style={{ flex:1 }} onClick={()=>setShowTraiter(null)}>Annuler</Btn>
              <Btn style={{ flex:2 }} loading={traiterMut.isPending} onClick={()=>{
                if(traitForm.statut==='rejete'&&!traitForm.motif_rejet.trim()){toast.error('Motif requis');return;}
                traiterMut.mutate();
              }}>Confirmer</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SOUSCRIPTIONS
// ═══════════════════════════════════════════════════════════════════
function PageSouscriptions() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState(null);

  // On récupère toutes les souscriptions via les offres de l'assureur
  const { data:offresData, isLoading } = useQuery({ queryKey:['ass-mes-offres'], queryFn:()=>A.mesOffres().then(r=>r.data.offres||[]) });
  const offres = offresData||[];
  const totalSouscriptions = offres.reduce((s,o)=>s+(+o.nb_souscriptions||0),0);

  const validerMut = useMutation({
    mutationFn: id=>A.validerSouscr(id,{statut:'active'}),
    onSuccess: () => { toast.success('✅ Souscription activée !'); qc.invalidateQueries(['ass-mes-offres']); setSelected(null); },
  });

  return (
    <div>
      <PageHeader title="👥 Souscriptions" subtitle={`${totalSouscriptions} souscription(s) totales`}/>

      {isLoading ? <Loader/> : (
        <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
          {offres.map(o=>(
            <Panel key={o.id} title={`${o.nom} — ${o.nb_souscriptions||0} souscription(s)`}
              actions={<Badge color={o.actif?'green':'red'}>{o.actif?'Active':'Inactive'}</Badge>}>
              <Grid cols={3} gap={10}>
                <div style={{ background:C.hover,borderRadius:8,padding:'8px 12px',textAlign:'center' }}>
                  <div style={{ fontSize:10,color:C.dim,fontWeight:700,textTransform:'uppercase' }}>Prix/mois</div>
                  <div style={{ fontSize:16,fontWeight:800,color:C.green }}>{fmt(o.prix_mensuel)} F</div>
                </div>
                <div style={{ background:C.hover,borderRadius:8,padding:'8px 12px',textAlign:'center' }}>
                  <div style={{ fontSize:10,color:C.dim,fontWeight:700,textTransform:'uppercase' }}>Souscriptions</div>
                  <div style={{ fontSize:16,fontWeight:800,color:C.blue }}>{o.nb_souscriptions||0}</div>
                </div>
                <div style={{ background:C.hover,borderRadius:8,padding:'8px 12px',textAlign:'center' }}>
                  <div style={{ fontSize:10,color:C.dim,fontWeight:700,textTransform:'uppercase' }}>Revenu/mois</div>
                  <div style={{ fontSize:16,fontWeight:800,color:C.teal }}>{fmt((o.nb_souscriptions||0)*o.prix_mensuel)} F</div>
                </div>
              </Grid>
            </Panel>
          ))}
          {offres.length===0&&<Panel><Empty icon="👥" title="Aucune offre créée"/></Panel>}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STATISTIQUES
// ═══════════════════════════════════════════════════════════════════
function PageStats() {
  const { data:tpData,  isLoading } = useQuery({ queryKey:['ass-tp-stats'], queryFn:()=>A.dossiersTp().then(r=>r.data.dossiers||[]) });
  const { data:ofData }             = useQuery({ queryKey:['ass-mes-offres'], queryFn:()=>A.mesOffres().then(r=>r.data.offres||[]) });

  const dossiers = tpData||[];
  const offres   = ofData||[];
  const valides   = dossiers.filter(d=>d.statut==='valide');
  const rembourses= dossiers.filter(d=>d.statut==='rembourse');
  const rejetes   = dossiers.filter(d=>d.statut==='rejete');
  const totalMontant  = dossiers.reduce((s,d)=>s+(+d.montant_total||0),0);
  const totalRembourse= rembourses.reduce((s,d)=>s+(+d.montant_pris_en_charge||0),0);
  const totalSouscriptions = offres.reduce((s,o)=>s+(+o.nb_souscriptions||0),0);
  const revenuMensuel = offres.reduce((s,o)=>s+((+o.nb_souscriptions||0)*(+o.prix_mensuel||0)),0);

  return (
    <div>
      <PageHeader title="📊 Statistiques" subtitle="Performance & analyses"/>
      {isLoading?<Loader/>:(
        <>
          <Grid cols={4} gap={14} style={{ marginBottom:20 }}>
            <Card label="Souscriptions actives" value={totalSouscriptions} icon="👥" color={C.blue}/>
            <Card label="Revenu mensuel estimé" value={`${fmt(revenuMensuel)} F`} icon="💰" color={C.green}/>
            <Card label="Dossiers TP traités" value={valides.length+rembourses.length} icon="✅" color={C.teal}/>
            <Card label="Total remboursé" value={`${fmt(totalRembourse)} F`} icon="💸" color={C.green}/>
          </Grid>

          <Grid cols={2} gap={16}>
            <Panel title="📁 Tiers-Payant par statut">
              {[
                ['Soumis',dossiers.filter(d=>d.statut==='soumis').length,C.amber],
                ['En cours',dossiers.filter(d=>d.statut==='en_cours').length,C.blue],
                ['Validés',valides.length,C.teal],
                ['Remboursés',rembourses.length,C.green],
                ['Rejetés',rejetes.length,C.red],
              ].map(([label,val,color])=>(
                <div key={label} style={{ display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:`1px solid ${C.border}` }}>
                  <div style={{ flex:1,fontSize:13,fontWeight:700,color:C.text }}>{label}</div>
                  <div style={{ fontSize:15,fontWeight:800,color }}>{val}</div>
                  <div style={{ fontSize:11,color:C.muted }}>{pct(val,dossiers.length)}%</div>
                </div>
              ))}
            </Panel>

            <Panel title="📋 Performance par offre">
              {offres.map(o=>(
                <div key={o.id} style={{ display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:`1px solid ${C.border}` }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13,fontWeight:700,color:C.text }}>{o.nom}</div>
                    <div style={{ fontSize:11,color:C.muted }}>{fmt(o.prix_mensuel)} F/mois</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:14,fontWeight:800,color:C.blue }}>{o.nb_souscriptions||0} souscrip.</div>
                    <div style={{ fontSize:11,color:C.green }}>{fmt((o.nb_souscriptions||0)*o.prix_mensuel)} F/mois</div>
                  </div>
                </div>
              ))}
              {offres.length===0&&<Empty icon="📊" title="Aucune donnée"/>}
            </Panel>
          </Grid>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════
// PAGE FACTURATION TEMPS RÉEL — v2
// ════════════════════════════════════════════════════════════════════
const TYPE_CFG = {
  clinique:    { label:'Cliniques & Hôpitaux', icon:'🏥', color:'#0A8F58', bg:'rgba(10,143,88,.1)',  border:'rgba(10,143,88,.25)'  },
  pharmacie:   { label:'Pharmacies',           icon:'💊', color:'#2563EB', bg:'rgba(37,99,235,.1)', border:'rgba(37,99,235,.25)'  },
  laboratoire: { label:'Laboratoires',         icon:'🔬', color:'#7C3AED', bg:'rgba(124,58,237,.1)',border:'rgba(124,58,237,.25)' },
  imagerie:    { label:'Imagerie médicale',    icon:'🩻', color:'#D97706', bg:'rgba(217,119,6,.1)', border:'rgba(217,119,6,.25)'  },
  medecin:     { label:'Médecins indépendants',icon:'🩺', color:'#0D9488', bg:'rgba(13,148,136,.1)',border:'rgba(13,148,136,.25)' },
};
const STATUT_CFG2 = {
  en_attente:{ label:'En attente', color:'#D97706', bg:'rgba(217,119,6,.1)' },
  validee:   { label:'Validée',    color:'#0A8F58', bg:'rgba(10,143,88,.1)' },
  rejetee:   { label:'Rejetée',    color:'#E11D48', bg:'rgba(225,29,72,.1)' },
  payee:     { label:'Payée',      color:'#0D9488', bg:'rgba(13,148,136,.1)' },
};

function PageFacturationTempsReel() {
  const qc = useQueryClient();
  const [categorie, setCategorie] = useState(null); // null = vue catégories
  const [selectedPresta, setSelectedPresta] = useState(null); // prestataire sélectionné
  const [modalType, setModalType] = useState(null); // 'listing' | 'factures'
  const [dateDebut, setDateDebut] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10));
  const [dateFin, setDateFin]   = useState(() => new Date().toISOString().slice(0,10));

  // Solde global
  const { data:solde={}, refetch:refetchSolde } = useQuery({
    queryKey:['ass-solde'], queryFn:()=>A.solde().then(r=>r.data||{}),
    refetchInterval:30000, staleTime:0,
  });
  // Répartition par prestataire
  const { data:prestList=[], refetch:refetchPrest } = useQuery({
    queryKey:['ass-prest'], queryFn:()=>A.soldeParPrest().then(r=>r.data||[]),
    refetchInterval:30000, staleTime:0,
  });
  // Factures
  const [filtreStatut, setFiltreStatut] = useState('');
  const { data:factures=[], isLoading:loadFa, refetch:refetchFa } = useQuery({
    queryKey:['ass-factures', filtreStatut, selectedPresta?.prestataire_nom, dateDebut, dateFin],
    queryFn:()=>{
      const p=[];
      if(filtreStatut) p.push(`statut=${filtreStatut}`);
      if(selectedPresta) p.push(`prestataire=${encodeURIComponent(selectedPresta.prestataire_nom)}`);
      if(dateDebut) p.push(`date_debut=${dateDebut}`);
      if(dateFin) p.push(`date_fin=${dateFin}T23:59:59`);
      return A.factures(p.length?`?${p.join('&')}`:'').then(r=>r.data||[]);
    },
    refetchInterval:15000, staleTime:0,
  });
  // Patients assurés
  const { data:patients=[] } = useQuery({
    queryKey:['ass-patients', selectedPresta?.prestataire_nom],
    queryFn:()=>A.patients(selectedPresta?.prestataire_nom ? `?prestataire=${encodeURIComponent(selectedPresta.prestataire_nom)}` : '').then(r=>r.data||[]),
    staleTime:0,
  });

  const traiterMut = useMutation({
    mutationFn:({id,statut})=>A.traiterFa(id,{statut}),
    onSuccess:()=>{ toast.success('Facture mise à jour !'); qc.invalidateQueries(['ass-factures']); qc.invalidateQueries(['ass-solde']); qc.invalidateQueries(['ass-prest']); },
    onError:()=>toast.error('Erreur'),
  });

  // Grouper prestataires par catégorie
  const byCategorie = {};
  prestList.forEach(p => {
    const t = p.type_prestataire || 'clinique';
    if(!byCategorie[t]) byCategorie[t] = { actes:0, total:0, assure:0, attente:0, prestataires:[] };
    byCategorie[t].actes    += Number(p.nb_actes||0);
    byCategorie[t].total    += Number(p.total_prestations||0);
    byCategorie[t].assure   += Number(p.total_assure||0);
    byCategorie[t].attente  += Number(p.en_attente||0);
    byCategorie[t].prestataires.push(p);
  });
  // Ajouter catégories vides pour l'affichage
  ['clinique','pharmacie','laboratoire','imagerie','medecin'].forEach(t => {
    if(!byCategorie[t]) byCategorie[t] = { actes:0, total:0, assure:0, attente:0, prestataires:[] };
  });

  const f = n => Number(n||0).toLocaleString('fr-CI');

  // ── VUE CATÉGORIES ────────────────────────────────────────────────
  if (!categorie) return (
    <div>
      {/* Header solde global */}
      <div style={{background:'linear-gradient(135deg,#0A8F58,#0D9488)',borderRadius:16,padding:24,margin:'0 0 20px',boxShadow:'0 8px 32px rgba(10,143,88,.2)'}}>
        <div style={{fontSize:11,color:'rgba(255,255,255,.7)',textTransform:'uppercase',letterSpacing:1,marginBottom:4}}>
          SOLDE GÉNÉRAL — ENGAGEMENTS ASSURANCE
          <span style={{marginLeft:8,background:'rgba(255,255,255,.2)',padding:'2px 8px',borderRadius:20,fontSize:10}}>⏱ Live</span>
        </div>
        <div style={{fontSize:32,fontWeight:900,color:'#fff',marginBottom:16}}>{f(solde.total_a_rembourser||0)} FCFA</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
          {[
            {label:'En attente',  val:solde.total_en_attente||0, col:'rgba(255,255,255,.9)'},
            {label:'Validé',      val:solde.total_valide||0,     col:'#A7F3D0'},
            {label:'Payé',        val:solde.total_paye||0,       col:'#6EE7B7'},
            {label:'Nb. factures',val:solde.nb_factures||0,      col:'rgba(255,255,255,.8)', nb:true},
          ].map(s=>(
            <div key={s.label} style={{background:'rgba(255,255,255,.1)',borderRadius:10,padding:'10px 14px'}}>
              <div style={{fontSize:10,color:'rgba(255,255,255,.6)',textTransform:'uppercase',marginBottom:3}}>{s.label}</div>
              <div style={{fontSize:16,fontWeight:800,color:s.col}}>{s.nb ? s.val : f(s.val)+' F'}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Grille catégories */}
      <div style={{fontSize:13,fontWeight:700,color:'#8BA0B5',textTransform:'uppercase',letterSpacing:1,marginBottom:12}}>
        Catégories de prestataires
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:14}}>
        {Object.entries(TYPE_CFG).map(([type, cfg])=>{
          const cat = byCategorie[type]||{actes:0,assure:0,attente:0,prestataires:[]};
          return (
            <div key={type} onClick={()=>setCategorie(type)}
              style={{background:'#0E1620',border:`1.5px solid ${cat.assure>0?cfg.border:'#1E2F42'}`,
                borderRadius:14,padding:20,cursor:'pointer',transition:'all .15s'}}
              onMouseOver={e=>{e.currentTarget.style.borderColor=cfg.color;e.currentTarget.style.background='#141E2B'}}
              onMouseOut={e=>{e.currentTarget.style.borderColor=cat.assure>0?cfg.border:'#1E2F42';e.currentTarget.style.background='#0E1620'}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
                <div style={{width:44,height:44,background:cfg.bg,border:`1px solid ${cfg.border}`,borderRadius:10,
                  display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>{cfg.icon}</div>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:'#F0F4F8'}}>{cfg.label}</div>
                  <div style={{fontSize:11,color:'#8BA0B5',marginTop:2}}>{cat.prestataires.length} prestataire(s)</div>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <div style={{background:'#1A2535',borderRadius:8,padding:'8px 10px'}}>
                  <div style={{fontSize:10,color:'#4E657A',fontWeight:700,textTransform:'uppercase',marginBottom:2}}>Actes</div>
                  <div style={{fontSize:16,fontWeight:800,color:'#F0F4F8'}}>{cat.actes}</div>
                </div>
                <div style={{background:'#1A2535',borderRadius:8,padding:'8px 10px'}}>
                  <div style={{fontSize:10,color:'#4E657A',fontWeight:700,textTransform:'uppercase',marginBottom:2}}>Engagé</div>
                  <div style={{fontSize:14,fontWeight:800,color:cfg.color}}>{f(cat.assure)} F</div>
                </div>
              </div>
              {cat.attente>0&&(
                <div style={{marginTop:8,fontSize:11,color:'#D97706',fontWeight:600}}>
                  ⏳ {f(cat.attente)} F en attente
                </div>
              )}
              <div style={{marginTop:12,fontSize:11,color:cfg.color,fontWeight:600,display:'flex',alignItems:'center',gap:4}}>
                Voir les prestataires →
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── VUE PRESTATAIRES D'UNE CATÉGORIE ─────────────────────────────
  const cfg = TYPE_CFG[categorie];
  const cat = byCategorie[categorie]||{prestataires:[]};

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20}}>
        <button onClick={()=>{setCategorie(null);setSelectedPresta(null);setModalType(null);}}
          style={{background:'transparent',border:'none',color:'#8BA0B5',cursor:'pointer',fontSize:13,padding:'6px 12px',
            borderRadius:9,display:'flex',alignItems:'center',gap:6,fontFamily:'inherit'}}>
          ← Catégories
        </button>
        <div style={{color:'#4E657A'}}>›</div>
        <div style={{fontSize:13,fontWeight:700,color:'#F0F4F8'}}>{cfg.icon} {cfg.label}</div>
      </div>

      {/* Solde catégorie */}
      <div style={{background:`${cfg.bg}`,border:`1px solid ${cfg.border}`,borderRadius:12,padding:'14px 20px',marginBottom:20,
        display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <div style={{fontSize:11,color:cfg.color,fontWeight:700,textTransform:'uppercase',marginBottom:4}}>
            {cfg.label} — Solde catégorie
          </div>
          <div style={{fontSize:24,fontWeight:900,color:'#F0F4F8'}}>{f(cat.assure)} FCFA</div>
          <div style={{fontSize:12,color:'#8BA0B5',marginTop:2}}>{cat.actes} acte(s) · {cat.prestataires.length} prestataire(s)</div>
        </div>
        {cat.attente>0&&(
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:11,color:'#D97706',fontWeight:700}}>EN ATTENTE</div>
            <div style={{fontSize:18,fontWeight:800,color:'#D97706'}}>{f(cat.attente)} F</div>
          </div>
        )}
      </div>

      {/* Grille prestataires */}
      {cat.prestataires.length===0 ? (
        <div style={{textAlign:'center',padding:'48px 20px',color:'#8BA0B5'}}>
          <div style={{fontSize:40,marginBottom:10}}>{cfg.icon}</div>
          <div>Aucun acte enregistré pour cette catégorie</div>
        </div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:14,marginBottom:20}}>
          {cat.prestataires.map((p,i)=>(
            <div key={i} style={{background:'#0E1620',border:`1.5px solid ${cfg.border}`,borderRadius:14,padding:18}}>
              {/* Entête */}
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
                <div style={{width:40,height:40,background:cfg.bg,border:`1px solid ${cfg.border}`,borderRadius:10,
                  display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>
                  {cfg.icon}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:14,fontWeight:700,color:'#F0F4F8',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {p.prestataire_nom}
                  </div>
                  <div style={{fontSize:11,color:'#8BA0B5'}}>{p.type_prestataire}</div>
                </div>
              </div>
              {/* Stats */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
                <div style={{background:'#1A2535',borderRadius:8,padding:'8px 10px'}}>
                  <div style={{fontSize:10,color:'#4E657A',fontWeight:700,textTransform:'uppercase',marginBottom:2}}>Actes</div>
                  <div style={{fontSize:16,fontWeight:800,color:'#F0F4F8'}}>{p.nb_actes}</div>
                </div>
                <div style={{background:'#1A2535',borderRadius:8,padding:'8px 10px'}}>
                  <div style={{fontSize:10,color:'#4E657A',fontWeight:700,textTransform:'uppercase',marginBottom:2}}>Engagé</div>
                  <div style={{fontSize:14,fontWeight:800,color:cfg.color}}>{f(p.total_assure)} F</div>
                </div>
                <div style={{background:'#1A2535',borderRadius:8,padding:'8px 10px'}}>
                  <div style={{fontSize:10,color:'#4E657A',fontWeight:700,textTransform:'uppercase',marginBottom:2}}>Total actes</div>
                  <div style={{fontSize:13,color:'#8BA0B5'}}>{f(p.total_prestations)} F</div>
                </div>
                <div style={{background:'#1A2535',borderRadius:8,padding:'8px 10px'}}>
                  <div style={{fontSize:10,color:'#4E657A',fontWeight:700,textTransform:'uppercase',marginBottom:2}}>En attente</div>
                  <div style={{fontSize:13,color:Number(p.en_attente||0)>0?'#D97706':'#8BA0B5'}}>
                    {Number(p.en_attente||0)>0 ? f(p.en_attente)+' F' : '—'}
                  </div>
                </div>
              </div>
              {/* Actions */}
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>{setSelectedPresta(p);setModalType('listing');}}
                  style={{flex:1,padding:'8px',borderRadius:9,background:'transparent',
                    border:`1.5px solid ${cfg.border}`,color:cfg.color,cursor:'pointer',
                    fontSize:12,fontWeight:700,fontFamily:'inherit'}}>
                  👥 Listing patients
                </button>
                <button onClick={()=>{setSelectedPresta(p);setModalType('factures');}}
                  style={{flex:1,padding:'8px',borderRadius:9,
                    background:cfg.bg,border:`1.5px solid ${cfg.border}`,
                    color:cfg.color,cursor:'pointer',fontSize:12,fontWeight:700,fontFamily:'inherit'}}>
                  📋 Factures
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Listing patients */}
      {modalType==='listing'&&selectedPresta&&(
        <div onClick={()=>setModalType(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.8)',
          display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'#0E1620',border:`1px solid ${cfg.border}`,
            borderRadius:18,width:600,maxWidth:'95vw',maxHeight:'85vh',overflowY:'auto',padding:28}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <div>
                <div style={{fontSize:16,fontWeight:800,color:'#F0F4F8'}}>👥 Patients — {selectedPresta.prestataire_nom}</div>
                <div style={{fontSize:12,color:'#8BA0B5',marginTop:3}}>Bénéficiaires ayant eu des soins chez ce prestataire</div>
              </div>
              <button onClick={()=>setModalType(null)} style={{background:'rgba(255,255,255,.1)',border:'none',
                borderRadius:'50%',width:32,height:32,color:'#F0F4F8',cursor:'pointer',fontSize:18}}>✕</button>
            </div>
            {patients.filter(p=>p.presta_nom===selectedPresta.prestataire_nom||true).length===0 ? (
              <div style={{textAlign:'center',padding:32,color:'#8BA0B5'}}>Aucun patient trouvé</div>
            ) : (
              <div>
                {patients.slice(0,20).map((p,i)=>(
                  <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',
                    padding:'10px 14px',background:'#141E2B',borderRadius:10,marginBottom:8}}>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <div style={{width:36,height:36,background:cfg.bg,borderRadius:'50%',
                        display:'flex',alignItems:'center',justifyContent:'center',
                        fontSize:13,fontWeight:700,color:cfg.color,flexShrink:0}}>
                        {(p.nom_complet||p.prenom_patient||'?').slice(0,2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{fontSize:13,fontWeight:700,color:'#F0F4F8'}}>{p.nom_complet||p.prenom_patient||'—'}</div>
                        <div style={{fontSize:11,color:'#8BA0B5'}}>Assurance : {p.assurance||'—'}</div>
                      </div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div style={{fontSize:13,fontWeight:700,color:cfg.color}}>{f(p.total_rembourse||0)} F</div>
                      <div style={{fontSize:10,color:'#8BA0B5'}}>{p.nb_actes||0} acte(s)</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Factures par période */}
      {modalType==='factures'&&selectedPresta&&(
        <div onClick={()=>setModalType(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.8)',
          display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'#0E1620',border:`1px solid ${cfg.border}`,
            borderRadius:18,width:640,maxWidth:'95vw',maxHeight:'90vh',overflowY:'auto',padding:28}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div>
                <div style={{fontSize:16,fontWeight:800,color:'#F0F4F8'}}>📋 Factures — {selectedPresta.prestataire_nom}</div>
                <div style={{fontSize:12,color:'#8BA0B5',marginTop:3}}>Sélectionnez la période de facturation</div>
              </div>
              <button onClick={()=>setModalType(null)} style={{background:'rgba(255,255,255,.1)',border:'none',
                borderRadius:'50%',width:32,height:32,color:'#F0F4F8',cursor:'pointer',fontSize:18}}>✕</button>
            </div>

            {/* Sélection période */}
            <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:16,
              background:'#141E2B',borderRadius:10,padding:'12px 14px',flexWrap:'wrap'}}>
              <span style={{fontSize:12,color:'#8BA0B5',fontWeight:700}}>Période :</span>
              <div style={{display:'flex',gap:8,alignItems:'center',flex:1,flexWrap:'wrap'}}>
                <input type="date" value={dateDebut} onChange={e=>setDateDebut(e.target.value)}
                  style={{background:'#1A2535',border:'1px solid #1E2F42',borderRadius:8,padding:'6px 10px',
                    color:'#F0F4F8',fontSize:13,outline:'none',fontFamily:'inherit'}}/>
                <span style={{color:'#8BA0B5',fontSize:12}}>au</span>
                <input type="date" value={dateFin} onChange={e=>setDateFin(e.target.value)}
                  style={{background:'#1A2535',border:'1px solid #1E2F42',borderRadius:8,padding:'6px 10px',
                    color:'#F0F4F8',fontSize:13,outline:'none',fontFamily:'inherit'}}/>
                <select value={filtreStatut} onChange={e=>setFiltreStatut(e.target.value)}
                  style={{background:'#1A2535',border:'1px solid #1E2F42',borderRadius:8,padding:'6px 10px',
                    color:'#F0F4F8',fontSize:12,outline:'none',fontFamily:'inherit',cursor:'pointer'}}>
                  <option value=''>Tous statuts</option>
                  <option value='en_attente'>En attente</option>
                  <option value='validee'>Validées</option>
                  <option value='rejetee'>Rejetées</option>
                  <option value='payee'>Payées</option>
                </select>
              </div>
              {/* Raccourcis période */}
              <div style={{display:'flex',gap:6,width:'100%',marginTop:6}}>
                {[['Ce mois',0],['Mois dernier',1],['3 mois',3],['6 mois',6]].map(([label,months])=>(
                  <button key={label} onClick={()=>{
                    const now=new Date();
                    const start=new Date(now.getFullYear(),now.getMonth()-months,1);
                    setDateDebut(start.toISOString().slice(0,10));
                    setDateFin(now.toISOString().slice(0,10));
                  }} style={{padding:'4px 10px',borderRadius:20,border:`1px solid #1E2F42`,
                    background:'transparent',color:'#8BA0B5',cursor:'pointer',fontSize:11,fontFamily:'inherit'}}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Résumé période */}
            {factures.length>0&&(
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:16}}>
                {[
                  {label:'Total actes',  val:factures.reduce((s,f)=>s+Number(f.montant_total||0),0)},
                  {label:'Part assureur',val:factures.reduce((s,f)=>s+Number(f.montant_assure||0),0), color:cfg.color},
                  {label:'En attente',   val:factures.filter(f=>f.statut==='en_attente').reduce((s,f)=>s+Number(f.montant_assure||0),0), color:'#D97706'},
                ].map(s=>(
                  <div key={s.label} style={{background:'#141E2B',borderRadius:8,padding:'10px 12px'}}>
                    <div style={{fontSize:10,color:'#4E657A',fontWeight:700,textTransform:'uppercase',marginBottom:3}}>{s.label}</div>
                    <div style={{fontSize:16,fontWeight:800,color:s.color||'#F0F4F8'}}>{f(s.val)} F</div>
                  </div>
                ))}
              </div>
            )}

            {/* Liste factures */}
            {loadFa ? (
              <div style={{textAlign:'center',padding:32,color:'#8BA0B5'}}>⏳ Chargement…</div>
            ) : factures.length===0 ? (
              <div style={{textAlign:'center',padding:32,color:'#8BA0B5'}}>
                <div style={{fontSize:32,marginBottom:8}}>📋</div>
                <div>Aucune facture sur cette période</div>
              </div>
            ) : factures.map(fa=>{
              const st = STATUT_CFG2[fa.statut]||STATUT_CFG2.en_attente;
              return (
                <div key={fa.id} style={{background:'#141E2B',border:'1px solid #1E2F42',
                  borderRadius:12,padding:14,marginBottom:10}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                    <div>
                      <div style={{fontSize:12,fontFamily:'monospace',color:'#F0F4F8',fontWeight:700}}>{fa.reference}</div>
                      <div style={{fontSize:11,color:'#8BA0B5',marginTop:2}}>
                        {new Date(fa.created_at).toLocaleDateString('fr-CI',{day:'numeric',month:'short',year:'numeric'})} · {fa.type_prestation}
                      </div>
                      <div style={{fontSize:11,color:'#8BA0B5'}}>Patient : {fa.patient_nom}</div>
                      <div style={{fontSize:11,color:'#4E657A',marginTop:2}}>{fa.description?.slice(0,50)}</div>
                    </div>
                    <div style={{textAlign:'right',flexShrink:0,marginLeft:12}}>
                      <div style={{fontSize:16,fontWeight:800,color:cfg.color}}>{f(fa.montant_assure||0)} F</div>
                      <div style={{fontSize:10,color:'#8BA0B5'}}>TM : {f(fa.ticket_moderateur||0)} F</div>
                      <span style={{background:st.bg,color:st.color,fontSize:10,fontWeight:700,
                        padding:'3px 8px',borderRadius:20,marginTop:4,display:'inline-block'}}>{st.label}</span>
                    </div>
                  </div>
                  {fa.statut==='en_attente'&&(
                    <div style={{display:'flex',gap:8}}>
                      <button disabled={traiterMut.isPending}
                        onClick={()=>traiterMut.mutate({id:fa.id,statut:'validee'})}
                        style={{flex:2,padding:'8px',borderRadius:8,
                          background:'rgba(10,143,88,.15)',border:'1px solid rgba(10,143,88,.3)',
                          color:'#0A8F58',cursor:'pointer',fontSize:12,fontWeight:700,fontFamily:'inherit'}}>
                        ✅ Valider — {f(fa.montant_assure||0)} F
                      </button>
                      <button disabled={traiterMut.isPending}
                        onClick={()=>traiterMut.mutate({id:fa.id,statut:'rejetee'})}
                        style={{flex:1,padding:'8px',borderRadius:8,
                          background:'rgba(225,29,72,.08)',border:'1px solid rgba(225,29,72,.2)',
                          color:'#E11D48',cursor:'pointer',fontSize:12,fontWeight:700,fontFamily:'inherit'}}>
                        ✕ Rejeter
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}


export default function Dashboard() {
  return (
    <Routes>
      <Route index               element={<PageHome/>}/>
      <Route path="offres"       element={<PageOffres/>}/>
      <Route path="tiers-payant" element={<PageTiersPayant/>}/>
      <Route path="souscriptions" element={<PageSouscriptions/>}/>
      <Route path="stats"        element={<PageStats/>}/>
      <Route path="facturation"  element={<PageFacturationTempsReel/>}/>
      <Route path="*"            element={<PageHome/>}/>
    </Routes>
  );
}
