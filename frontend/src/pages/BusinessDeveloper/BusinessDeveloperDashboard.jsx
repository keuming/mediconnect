import React, { useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import useAuthStore from '../../context/authStore';
import useThemeStore from '../../context/themeStore';
import api from '../../services/api';

const PALETTE_DARK = {
  green:'#0A8F58',teal:'#0D9488',amber:'#D97706',red:'#E11D48',blue:'#2563EB',purple:'#7C3AED',
  card:'#0E1620',input:'#141E2B',hover:'#1A2535',border:'#1E2F42',
  text:'#F0F4F8',muted:'#8BA0B5',dim:'#4E657A',
};
const PALETTE_LIGHT = {
  green:'#0A8F58',teal:'#0D9488',amber:'#B45309',red:'#DC2626',blue:'#2563EB',purple:'#7C3AED',
  card:'#FFFFFF',input:'#FFFFFF',hover:'#F0F3F6',border:'#DCE3EA',
  text:'#0E1720',muted:'#4D5B68',dim:'#75808B',
};
// eslint-disable-next-line prefer-const
const C = { ...PALETTE_DARK };
const fmt     = n => Number(n||0).toLocaleString('fr-CI');
const fmtDate = d => d ? new Date(d).toLocaleDateString('fr-CI',{day:'numeric',month:'short',year:'numeric'}) : '—';

// ── API ──────────────────────────────────────────────────────────
const BD = {
  dashboard:  ()          => api.get('/business-developer/dashboard'),
  prestataires:()         => api.get('/business-developer/prestataires'),
  commissions: (p)        => api.get(`/business-developer/commissions${p?`?${new URLSearchParams(p)}`:''}` ),
  resume:      ()         => api.get('/business-developer/commissions/resume'),
  recruter:    id         => api.post('/business-developer/recruter',{ prestataire_id:id }),
  notifications:()        => api.get('/business-developer/notifications'),
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
    purple:{ background:C.purple,color:'#fff',border:'none' },
  };
  return <button onClick={onClick} disabled={loading||disabled} style={{ borderRadius:9,padding:'9px 18px',fontSize:13,fontWeight:700,cursor:(loading||disabled)?'not-allowed':'pointer',opacity:(loading||disabled)?.65:1,fontFamily:'inherit',...v[variant]||v.primary,...s }}>{loading?'⏳…':children}</button>;
};
const Grid = ({ cols=2,gap=16,children,style:s={} }) => <div style={{ display:'grid',gridTemplateColumns:`repeat(${cols},1fr)`,gap,...s }}>{children}</div>;
const Loader = () => <div style={{ textAlign:'center',padding:48,color:C.dim }}>⏳ Chargement…</div>;
const Empty  = ({ icon,title,subtitle,children }) => (
  <div style={{ textAlign:'center',padding:'36px 20px',color:C.dim }}>
    <div style={{ fontSize:38,marginBottom:10 }}>{icon}</div>
    {title&&<div style={{ fontSize:15,fontWeight:700,color:C.muted,marginBottom:4 }}>{title}</div>}
    {subtitle&&<div style={{ fontSize:13,marginBottom:12 }}>{subtitle}</div>}
    {children}
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

const roleLabel = r => ({ medecin:'Médecin',medecin_independant:'MC',clinique:'Clinique',pharmacie:'Pharmacie',livreur:'Livreur',assureur:'Assureur',imagerie:'Imagerie',laboratoire:'Laboratoire',optique:'Optique' }[r]||r);
const roleColor = r => ({ medecin:'teal',medecin_independant:'teal',clinique:'blue',pharmacie:'green',livreur:'amber',assureur:'purple',imagerie:'blue',laboratoire:'teal',optique:'green' }[r]||'gray');
const commColor = s => ({ en_attente:'amber',validee:'teal',payee:'green',annulee:'red' }[s]||'gray');
const commLabel = s => ({ en_attente:'En attente',validee:'Validée',payee:'Payée',annulee:'Annulée' }[s]||s);
const typeColor = t => ({ recrutement:'purple',mensuel:'blue',patient:'green' }[t]||'gray');
const typeLabel = t => ({ recrutement:'Recrutement',mensuel:'Mensuel',patient:'Patient' }[t]||t);

// ═══════════════════════════════════════════════════════════════════
// HOME — Vue d'ensemble
// ═══════════════════════════════════════════════════════════════════
function PageHome() {
  const { user } = useAuthStore();
  const nav = useNavigate();

  const { data, isLoading } = useQuery({ queryKey:['bd-dashboard'], queryFn:()=>BD.dashboard().then(r=>r.data.dashboard), retry:1 });
  const { data:resumeData } = useQuery({ queryKey:['bd-resume'],    queryFn:()=>BD.resume().then(r=>r.data.resume||[]) });

  const d = data||{};
  const p = d.prestataires||{};
  const c = d.commissions||{};
  const tauxActivation = p.total>0 ? Math.round(p.total_actifs/p.total*100) : 0;

  // Grouper le résumé par mois pour mini sparkline
  const resume = (resumeData||[]).slice(0,6);
  const totalParMois = resume.reduce((acc,r)=>{
    const mois = new Date(r.mois).toLocaleDateString('fr-CI',{month:'short',year:'2-digit'});
    acc[mois] = (acc[mois]||0)+(+r.total_fcfa||0);
    return acc;
  },{});
  const moisKeys = Object.keys(totalParMois);
  const maxMois = Math.max(...Object.values(totalParMois),1);

  return (
    <div>
      {/* Header hero */}
      <div style={{ background:'linear-gradient(135deg,rgba(124,58,237,.15),rgba(10,143,88,.08))',border:'1px solid rgba(124,58,237,.25)',borderRadius:16,padding:24,marginBottom:24 }}>
        <div style={{ display:'flex',alignItems:'center',gap:16 }}>
          <div style={{ width:52,height:52,background:`linear-gradient(135deg,${C.purple},${C.green})`,borderRadius:14,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24 }}>💼</div>
          <div>
            <div style={{ fontSize:22,fontWeight:800,color:C.text }}>{user?.prenom} {user?.nom}</div>
            <div style={{ fontSize:13,color:C.muted }}>Business Developer · MediConnect Africa</div>
          </div>
          <div style={{ marginLeft:'auto',background:'rgba(124,58,237,.15)',border:'1px solid rgba(124,58,237,.3)',borderRadius:10,padding:'10px 18px',textAlign:'center' }}>
            <div style={{ fontSize:20,fontWeight:900,color:C.purple }}>{fmt(c.a_percevoir||0)} F</div>
            <div style={{ fontSize:11,color:C.muted }}>à percevoir</div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <Grid cols={4} gap={14} style={{ marginBottom:24 }}>
        <Card label="Prestataires recrutés" value={p.total||0} icon="🏢" color={C.purple} sub={`${p.total_actifs||0} actifs`} onClick={()=>nav('reseau')}/>
        <Card label="Taux activation" value={`${tauxActivation}%`} icon="📈" color={tauxActivation>=70?C.green:C.amber} sub={`${p.ce_mois||0} ce mois`}/>
        <Card label="Commissions perçues" value={`${fmt(c.total_percu||0)} F`} icon="💸" color={C.green} onClick={()=>nav('commissions')}/>
        <Card label="En attente" value={`${fmt(c.en_attente||0)} F`} icon="⏳" color={C.amber} onClick={()=>nav('commissions')}/>
      </Grid>

      <Grid cols={2} gap={16} style={{ marginBottom:16 }}>
        {/* Graphique commissions par mois */}
        <Panel title="📊 Commissions — 6 derniers mois">
          {moisKeys.length===0 ? <Empty icon="📊" title="Aucune commission" subtitle="Commencez à recruter des prestataires"/> : (
            <div>
              <div style={{ display:'flex',alignItems:'flex-end',gap:8,height:80,marginBottom:12 }}>
                {moisKeys.map(mois=>(
                  <div key={mois} style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4 }}>
                    <div style={{ width:'100%',background:`linear-gradient(0deg,${C.purple},${C.green})`,borderRadius:4,height:`${Math.round(totalParMois[mois]/maxMois*70)}px`,minHeight:4,transition:'height .3s' }}/>
                    <span style={{ fontSize:9,color:C.dim }}>{mois}</span>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex',justifyContent:'space-between',borderTop:`1px solid ${C.border}`,paddingTop:10 }}>
                <span style={{ fontSize:12,color:C.muted }}>Total 6 mois</span>
                <span style={{ fontSize:13,fontWeight:800,color:C.green }}>{fmt(Object.values(totalParMois).reduce((a,b)=>a+b,0))} F</span>
              </div>
            </div>
          )}
        </Panel>

        {/* Répartition commissions */}
        <Panel title="💰 Répartition commissions">
          {[
            ['🎯 Recrutement','recrutement',25000,'Par prestataire recruté',C.purple],
            ['📅 Mensuel','mensuel',2000,'Par prestataire actif/mois',C.blue],
            ['👤 Patient','patient',50,'Par patient actif/mois',C.green],
          ].map(([icon,type,montant,desc,color])=>(
            <div key={type} style={{ display:'flex',alignItems:'center',gap:12,padding:'12px 0',borderBottom:`1px solid ${C.border}` }}>
              <div style={{ width:38,height:38,background:`${color}22`,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18 }}>{icon.split(' ')[0]}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13,fontWeight:700,color:C.text }}>{typeLabel(type)}</div>
                <div style={{ fontSize:11,color:C.muted }}>{desc}</div>
              </div>
              <div style={{ fontSize:15,fontWeight:900,color }}>{fmt(montant)} F</div>
            </div>
          ))}
        </Panel>
      </Grid>

      {/* Accès rapide */}
      <Panel title="⚡ Actions rapides">
        <Grid cols={3} gap={12}>
          {[
            ['🏢 Recruter un prestataire','Liez un nouveau prestataire à votre réseau',()=>nav('reseau'),C.purple],
            ['💸 Mes commissions','Historique et statut de vos paiements',()=>nav('commissions'),C.green],
            ['🔔 Notifications','Alertes recrutements et paiements',()=>nav('notifications'),C.amber],
          ].map(([title,desc,action,color])=>(
            <div key={title} onClick={action} style={{ background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:12,padding:16,cursor:'pointer' }}
              onMouseOver={e=>e.currentTarget.style.borderColor=color} onMouseOut={e=>e.currentTarget.style.borderColor=C.border}>
              <div style={{ fontSize:16,marginBottom:6 }}>{title.split(' ')[0]}</div>
              <div style={{ fontSize:13,fontWeight:700,color:C.text,marginBottom:4 }}>{title.slice(3)}</div>
              <div style={{ fontSize:11,color:C.muted }}>{desc}</div>
            </div>
          ))}
        </Grid>
      </Panel>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MON RÉSEAU
// ═══════════════════════════════════════════════════════════════════
function PageReseau() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [showRecruter, setShowRecruter] = useState(false);
  const [prestataireId, setPrestataireId] = useState('');
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');

  const { data, isLoading } = useQuery({ queryKey:['bd-prestataires'], queryFn:()=>BD.prestataires().then(r=>r.data.prestataires||[]) });
  const prestataires = data||[];

  const recruterMut = useMutation({
    mutationFn: ()=>BD.recruter(prestataireId),
    onSuccess: () => { toast.success('✅ Prestataire recruté ! Commission de 25 000 FCFA générée.'); qc.invalidateQueries(['bd-prestataires']); qc.invalidateQueries(['bd-dashboard']); setShowRecruter(false); setPrestataireId(''); },
    onError: e => toast.error(e.response?.data?.error||'Erreur lors du recrutement'),
  });

  const filtered = prestataires.filter(p=>{
    const matchSearch = !search || `${p.prenom} ${p.nom} ${p.email}`.toLowerCase().includes(search.toLowerCase());
    const matchRole   = !filterRole || p.role===filterRole;
    return matchSearch && matchRole;
  });

  const roles = [...new Set(prestataires.map(p=>p.role))];
  const totalCommissions = prestataires.reduce((s,p)=>s+(+p.commissions_generees||0),0);

  return (
    <div>
      <PageHeader title="🏢 Mon Réseau" subtitle={`${prestataires.length} prestataire(s) recrutés`}
        actions={<Btn onClick={()=>setShowRecruter(true)}>+ Recruter</Btn>}/>

      {/* Stats réseau */}
      <Grid cols={3} gap={14} style={{ marginBottom:20 }}>
        <Card label="Total recrutés" value={prestataires.length} icon="🏢" color={C.purple}/>
        <Card label="Actifs" value={prestataires.filter(p=>p.is_active).length} icon="✅" color={C.green} sub={`${Math.round(prestataires.filter(p=>p.is_active).length/(prestataires.length||1)*100)}% taux activation`}/>
        <Card label="Commissions générées" value={`${fmt(totalCommissions)} F`} icon="💰" color={C.green}/>
      </Grid>

      {/* Filtres */}
      <div style={{ display:'flex',gap:10,marginBottom:16,flexWrap:'wrap' }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Rechercher…"
          style={{ flex:1,minWidth:200,background:C.input,border:`1.5px solid ${C.border}`,borderRadius:9,padding:'9px 14px',color:C.text,fontSize:13,outline:'none',fontFamily:'inherit' }}/>
        <select value={filterRole} onChange={e=>setFilterRole(e.target.value)}
          style={{ background:C.input,border:`1.5px solid ${C.border}`,borderRadius:9,padding:'9px 14px',color:C.text,fontSize:13,outline:'none',fontFamily:'inherit' }}>
          <option value="">Tous les rôles</option>
          {roles.map(r=><option key={r} value={r}>{roleLabel(r)}</option>)}
        </select>
      </div>

      {isLoading ? <Loader/> : filtered.length===0 ? (
        <Panel><Empty icon="🏢" title="Aucun prestataire" subtitle="Recrutez vos premiers prestataires pour générer des commissions">
          <Btn style={{ marginTop:10 }} onClick={()=>setShowRecruter(true)}>+ Recruter un prestataire</Btn>
        </Empty></Panel>
      ) : (
        <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
          {filtered.map(p=>(
            <div key={p.id} style={{ background:C.input,border:`1.5px solid ${C.border}`,borderRadius:12,padding:18 }}>
              <div style={{ display:'flex',alignItems:'center',gap:14 }}>
                <div style={{ width:44,height:44,background:`linear-gradient(135deg,${C.purple}33,${C.green}33)`,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:800,color:C.text }}>
                  {(p.prenom||'?')[0]}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:4 }}>
                    <span style={{ fontSize:14,fontWeight:700,color:C.text }}>{p.prenom} {p.nom}</span>
                    <Badge color={roleColor(p.role)}>{roleLabel(p.role)}</Badge>
                    <Badge color={p.is_active?'green':'red'}>{p.is_active?'Actif':'Inactif'}</Badge>
                  </div>
                  <div style={{ fontSize:11,color:C.muted }}>{p.email} · {p.telephone||'—'} · {p.ville||'—'}</div>
                  <div style={{ fontSize:11,color:C.dim,marginTop:2 }}>Recruté le {fmtDate(p.created_at)}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:15,fontWeight:800,color:C.green }}>{fmt(p.commissions_generees||0)} F</div>
                  <div style={{ fontSize:11,color:C.muted }}>commissions générées</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal recruter */}
      <Modal open={showRecruter} onClose={()=>setShowRecruter(false)} title="🏢 Recruter un prestataire">
        <div style={{ background:'rgba(124,58,237,.08)',border:'1px solid rgba(124,58,237,.2)',borderRadius:10,padding:14,marginBottom:20,fontSize:13,color:C.muted }}>
          💡 Pour recruter un prestataire, il doit déjà avoir un compte sur MediConnect Africa. Entrez son ID utilisateur ci-dessous.
        </div>
        <div style={{ marginBottom:16 }}>
          <label style={{ display:'block',fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',marginBottom:6 }}>ID Prestataire *</label>
          <input value={prestataireId} onChange={e=>setPrestataireId(e.target.value)} placeholder="UUID du prestataire"
            style={{ width:'100%',background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:9,padding:'10px 14px',color:C.text,fontSize:14,outline:'none',fontFamily:'inherit',boxSizing:'border-box' }}/>
          <div style={{ fontSize:11,color:C.dim,marginTop:6 }}>Le prestataire peut trouver son ID dans son profil MediConnect</div>
        </div>
        <div style={{ background:C.hover,borderRadius:10,padding:14,marginBottom:20 }}>
          <div style={{ fontSize:12,fontWeight:700,color:C.muted,marginBottom:8 }}>Commissions générées :</div>
          {[['Recrutement','25 000 FCFA one-shot',C.purple],['Mensuel','2 000 FCFA/mois si actif',C.blue],['Par patient','50 FCFA/patient actif',C.green]].map(([k,v,c])=>(
            <div key={k} style={{ display:'flex',justifyContent:'space-between',marginBottom:4 }}>
              <span style={{ fontSize:12,color:C.muted }}>{k}</span>
              <span style={{ fontSize:12,fontWeight:700,color:c }}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{ display:'flex',gap:10 }}>
          <Btn variant="outline" style={{ flex:1 }} onClick={()=>setShowRecruter(false)}>Annuler</Btn>
          <Btn style={{ flex:2 }} loading={recruterMut.isPending}
            onClick={()=>{ if(!prestataireId.trim()){toast.error('ID requis');return;} recruterMut.mutate(); }}>
            ✅ Recruter & générer commission
          </Btn>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// COMMISSIONS
// ═══════════════════════════════════════════════════════════════════
function PageCommissions() {
  const [filterStatut, setFilterStatut] = useState('');
  const [filterType,   setFilterType]   = useState('');

  const params = {};
  if(filterStatut) params.statut = filterStatut;
  if(filterType)   params.type_commission = filterType;

  const { data, isLoading } = useQuery({
    queryKey:['bd-commissions',filterStatut,filterType],
    queryFn: ()=>BD.commissions(Object.keys(params).length?params:null).then(r=>r.data.commissions||[])
  });
  const { data:resumeData } = useQuery({ queryKey:['bd-resume'], queryFn:()=>BD.resume().then(r=>r.data.resume||[]) });

  const commissions = data||[];
  const resume      = resumeData||[];

  const totalPercu    = commissions.filter(c=>c.statut==='payee').reduce((s,c)=>s+(+c.montant||0),0);
  const totalAttente  = commissions.filter(c=>c.statut==='en_attente').reduce((s,c)=>s+(+c.montant||0),0);
  const totalValidee  = commissions.filter(c=>c.statut==='validee').reduce((s,c)=>s+(+c.montant||0),0);

  const exportCSV = () => {
    const headers = ['Type','Prestataire','Montant (FCFA)','Statut','Date'];
    const rows = commissions.map(c=>[typeLabel(c.type_commission),c.prestataire_nom||'—',c.montant,commLabel(c.statut),fmtDate(c.created_at)]);
    const csv = [headers,...rows].map(r=>r.join(',')).join('\n');
    const blob = new Blob([csv],{type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='commissions_bd.csv'; a.click();
  };

  return (
    <div>
      <PageHeader title="💸 Mes Commissions" subtitle={`${commissions.length} transaction(s)`}
        actions={<Btn variant="outline" onClick={exportCSV}>⬇ Export CSV</Btn>}/>

      <Grid cols={3} gap={14} style={{ marginBottom:20 }}>
        <Card label="Perçu" value={`${fmt(totalPercu)} F`} icon="✅" color={C.green}/>
        <Card label="Validé (à percevoir)" value={`${fmt(totalValidee)} F`} icon="🔜" color={C.teal}/>
        <Card label="En attente" value={`${fmt(totalAttente)} F`} icon="⏳" color={C.amber}/>
      </Grid>

      {/* Résumé mensuel */}
      {resume.length>0&&(
        <Panel title="📅 Résumé mensuel" style={{ marginBottom:16 }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%',borderCollapse:'collapse',fontSize:13 }}>
              <thead>
                <tr style={{ borderBottom:`2px solid ${C.border}` }}>
                  {['Mois','Type','Nb','Total','Perçu','En attente'].map(h=>(
                    <th key={h} style={{ padding:'8px 12px',textAlign:'left',fontSize:11,color:C.dim,fontWeight:700,textTransform:'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {resume.map((r,i)=>(
                  <tr key={i} style={{ borderBottom:`1px solid ${C.border}` }}>
                    <td style={{ padding:'10px 12px',color:C.muted }}>{new Date(r.mois).toLocaleDateString('fr-CI',{month:'long',year:'numeric'})}</td>
                    <td style={{ padding:'10px 12px' }}><Badge color={typeColor(r.type_commission)}>{typeLabel(r.type_commission)}</Badge></td>
                    <td style={{ padding:'10px 12px',color:C.text,fontWeight:700 }}>{r.nb}</td>
                    <td style={{ padding:'10px 12px',color:C.text,fontWeight:800 }}>{fmt(r.total_fcfa)} F</td>
                    <td style={{ padding:'10px 12px',color:C.green,fontWeight:700 }}>{fmt(r.percu||0)} F</td>
                    <td style={{ padding:'10px 12px',color:C.amber,fontWeight:700 }}>{fmt(r.en_attente||0)} F</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* Filtres */}
      <div style={{ display:'flex',gap:10,marginBottom:16 }}>
        <select value={filterStatut} onChange={e=>setFilterStatut(e.target.value)}
          style={{ background:C.input,border:`1.5px solid ${C.border}`,borderRadius:9,padding:'9px 14px',color:C.text,fontSize:13,outline:'none',fontFamily:'inherit' }}>
          <option value="">Tous les statuts</option>
          {['en_attente','validee','payee','annulee'].map(s=><option key={s} value={s}>{commLabel(s)}</option>)}
        </select>
        <select value={filterType} onChange={e=>setFilterType(e.target.value)}
          style={{ background:C.input,border:`1.5px solid ${C.border}`,borderRadius:9,padding:'9px 14px',color:C.text,fontSize:13,outline:'none',fontFamily:'inherit' }}>
          <option value="">Tous les types</option>
          {['recrutement','mensuel','patient'].map(t=><option key={t} value={t}>{typeLabel(t)}</option>)}
        </select>
      </div>

      {isLoading ? <Loader/> : commissions.length===0 ? (
        <Panel><Empty icon="💸" title="Aucune commission" subtitle="Les commissions apparaîtront ici après vos recrutements"/></Panel>
      ) : (
        <Panel>
          {commissions.map(c=>(
            <div key={c.id} style={{ display:'flex',alignItems:'center',gap:14,padding:'12px 0',borderBottom:`1px solid ${C.border}` }}>
              <div style={{ width:38,height:38,background:C.hover,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18 }}>
                {{ recrutement:'🎯', mensuel:'📅', patient:'👤' }[c.type_commission]||'💰'}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:3 }}>
                  <span style={{ fontSize:13,fontWeight:700,color:C.text }}>{c.prestataire_nom||'Prestataire'}</span>
                  <Badge color={roleColor(c.prestataire_role)}>{roleLabel(c.prestataire_role||'')}</Badge>
                </div>
                <div style={{ display:'flex',gap:8 }}>
                  <Badge color={typeColor(c.type_commission)}>{typeLabel(c.type_commission)}</Badge>
                  <span style={{ fontSize:11,color:C.dim }}>{fmtDate(c.created_at)}</span>
                </div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:16,fontWeight:900,color:C.green }}>{fmt(c.montant)} F</div>
                <Badge color={commColor(c.statut)}>{commLabel(c.statut)}</Badge>
              </div>
            </div>
          ))}
        </Panel>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════
function PageNotifications() {
  const { data, isLoading } = useQuery({ queryKey:['bd-notifs'], queryFn:()=>BD.notifications().then(r=>r.data.notifications||[]) });
  const notifs = data||[];

  const icon = type => ({ sms:'📱', email:'📧', in_app:'🔔' }[type]||'🔔');
  const statColor = s => ({ en_attente:'amber', envoye:'teal', echoue:'red', lu:'gray' }[s]||'gray');

  return (
    <div>
      <PageHeader title="🔔 Notifications" subtitle={`${notifs.length} notification(s)`}/>
      {isLoading ? <Loader/> : notifs.length===0 ? (
        <Panel><Empty icon="🔔" title="Aucune notification" subtitle="Les alertes de recrutement et de paiement apparaîtront ici"/></Panel>
      ) : (
        <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
          {notifs.map(n=>(
            <div key={n.id} style={{ background:n.statut==='lu'?C.input:C.hover,border:`1.5px solid ${n.statut==='lu'?C.border:'rgba(10,143,88,.25)'}`,borderRadius:12,padding:16 }}>
              <div style={{ display:'flex',alignItems:'flex-start',gap:12 }}>
                <span style={{ fontSize:20 }}>{icon(n.type)}</span>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:4 }}>
                    <span style={{ fontSize:13,fontWeight:700,color:C.text }}>{n.titre||'Notification'}</span>
                    <Badge color={statColor(n.statut)}>{n.statut}</Badge>
                  </div>
                  <div style={{ fontSize:13,color:C.muted,marginBottom:4 }}>{n.contenu}</div>
                  <div style={{ fontSize:11,color:C.dim }}>{fmtDate(n.created_at)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════
export default function BusinessDeveloperDashboard() {
  const mode = useThemeStore(s => s.mode);
  Object.assign(C, mode === 'light' ? PALETTE_LIGHT : PALETTE_DARK);
  return (
    <Routes>
      <Route index              element={<PageHome/>}/>
      <Route path="reseau"      element={<PageReseau/>}/>
      <Route path="commissions" element={<PageCommissions/>}/>
      <Route path="notifications" element={<PageNotifications/>}/>
      <Route path="*"           element={<PageHome/>}/>
    </Routes>
  );
}
