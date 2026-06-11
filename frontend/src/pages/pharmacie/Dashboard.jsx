import React, { useState } from 'react';
import PageOrdonnancesPharmacie from "./PageOrdonnancesPharmacie";
import { PageLivraisonPharmacie } from "../shared/PageLivraison";
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import useAuthStore from '../../context/authStore';
import api from '../../services/api';

const C = {
  green:'#0A8F58',teal:'#0D9488',amber:'#D97706',red:'#E11D48',blue:'#2563EB',
  bg:'#060C12',card:'#0E1620',input:'#141E2B',hover:'#1A2535',border:'#1E2F42',
  text:'#F0F4F8',muted:'#8BA0B5',dim:'#4E657A',
};
const fmt = n => Number(n||0).toLocaleString('fr-CI');
const fmtDate = d => d ? new Date(d).toLocaleDateString('fr-CI',{day:'numeric',month:'short',year:'numeric'}) : '—';

const phAPI = {
  commandes: () => api.get('/pharmacie/commandes').catch(() => api.get('/commandes')),
  updCommande: (id, d) => api.put(`/pharmacie/commandes/${id}`, d),
  stock: () => api.get('/stock/clinique').catch(() => api.get('/stock')),
  addStock: d => api.post('/stock', d),
  updStock: (id, d) => api.put(`/stock/${id}`, d),
  delStock: id => api.delete(`/stock/${id}`),
};

const Badge = ({ children, color='gray' }) => {
  const m = { green:[C.green,'rgba(10,143,88,.15)'],teal:[C.teal,'rgba(13,148,136,.15)'],amber:[C.amber,'rgba(217,119,6,.15)'],red:[C.red,'rgba(225,29,72,.15)'],blue:[C.blue,'rgba(37,99,235,.15)'],gray:[C.muted,'rgba(255,255,255,.08)'] };
  const [text,bg] = m[color]||m.gray;
  return <span style={{ background:bg,color:text,fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:20 }}>{children}</span>;
};
const Card = ({ label,value,icon,color=C.green,sub,onClick }) => (
  <div onClick={onClick} style={{ background:C.input,border:`1.5px solid ${C.border}`,borderRadius:14,padding:'18px 16px',cursor:onClick?'pointer':'default',transition:'border-color .15s' }}
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
  const v = { primary:{background:`linear-gradient(135deg,${C.green},${C.teal})`,color:'#fff',border:'none'},outline:{background:'transparent',color:C.muted,border:`1.5px solid ${C.border}`},danger:{background:'rgba(225,29,72,.1)',color:C.red,border:'1.5px solid rgba(225,29,72,.25)'} };
  return <button onClick={onClick} disabled={loading||disabled} style={{ borderRadius:9,padding:'9px 18px',fontSize:13,fontWeight:700,cursor:(loading||disabled)?'not-allowed':'pointer',opacity:(loading||disabled)?.65:1,fontFamily:'inherit',...v[variant]||v.primary,...s }}>{loading?'⏳…':children}</button>;
};
const Inp = ({ label,value,onChange,type='text',placeholder,required,style:s={} }) => (
  <div style={{ marginBottom:14,...s }}>
    {label&&<label style={{ display:'block',fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:'.5px',marginBottom:5 }}>{label}{required&&' *'}</label>}
    <input type={type} value={value||''} onChange={onChange} placeholder={placeholder} required={required} style={{ width:'100%',background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:9,padding:'10px 14px',color:C.text,fontSize:14,outline:'none',fontFamily:'inherit',boxSizing:'border-box' }} onFocus={e=>e.target.style.borderColor=C.green} onBlur={e=>e.target.style.borderColor=C.border}/>
  </div>
);
const Loader = () => <div style={{ textAlign:'center',padding:48,color:C.dim }}>⏳ Chargement…</div>;
const Empty = ({ icon,title,subtitle }) => <div style={{ textAlign:'center',padding:'36px 20px',color:C.dim }}><div style={{ fontSize:38,marginBottom:10 }}>{icon}</div>{title&&<div style={{ fontSize:15,fontWeight:700,color:C.muted,marginBottom:4 }}>{title}</div>}{subtitle&&<div style={{ fontSize:13 }}>{subtitle}</div>}</div>;
const Grid = ({ cols=2,gap=16,children,style:s={} }) => <div style={{ display:'grid',gridTemplateColumns:`repeat(${cols},1fr)`,gap,...s }}>{children}</div>;
const PageHeader = ({ title,subtitle,actions }) => (
  <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:24 }}>
    <div><h1 style={{ fontSize:22,fontWeight:800,color:C.text,margin:'0 0 4px' }}>{title}</h1>{subtitle&&<p style={{ fontSize:13,color:C.muted,margin:0 }}>{subtitle}</p>}</div>
    {actions&&<div style={{ display:'flex',gap:10 }}>{actions}</div>}
  </div>
);

// ═══════════════════════════════════════════════════════════════════
// HOME PHARMACIE
// ═══════════════════════════════════════════════════════════════════
function PageHome() {
  const { user } = useAuthStore();
  const nav = useNavigate();
  const { data:cmdsData } = useQuery({ queryKey:['ph-cmds'], queryFn:()=>phAPI.commandes().then(r=>r.data.data||[]), retry:1 });
  const { data:stockData } = useQuery({ queryKey:['ph-stock'], queryFn:()=>phAPI.stock().then(r=>r.data.data||[]), retry:1 });
  const cmds = cmdsData||[];
  const stock = stockData||[];
  const alertes = stock.filter(s=>s.quantite<=s.seuil_alerte);
  const enAttente = cmds.filter(c=>c.statut==='en_attente');

  return (
    <div>
      <div style={{ background:'linear-gradient(135deg,rgba(10,143,88,.12),rgba(13,148,136,.06))',border:'1px solid rgba(10,143,88,.2)',borderRadius:16,padding:24,marginBottom:24 }}>
        <div style={{ fontSize:22,fontWeight:800,color:C.text,marginBottom:4 }}>💊 {user?.prenom} {user?.nom}</div>
        <div style={{ fontSize:13,color:C.muted }}>Espace Pharmacie MediConnect Africa</div>
      </div>

      <Grid cols={4} gap={14} style={{ marginBottom:24 }}>
        <Card label="Commandes" value={cmds.length} icon="📦" color={C.blue} sub={`${enAttente.length} en attente`} onClick={()=>nav('commandes')}/>
        <Card label="Alertes stock" value={alertes.length} icon="⚠️" color={alertes.length>0?C.red:C.green} sub="Produits sous seuil" onClick={()=>nav('stock')}/>
        <Card label="Produits en stock" value={stock.length} icon="💊" color={C.green} onClick={()=>nav('stock')}/>
        <Card label="Livraisons ce mois" value={cmds.filter(c=>c.statut==='livree').length} icon="✅" color={C.teal}/>
      </Grid>

      {/* Commandes urgentes */}
      <Panel title="📦 Commandes en attente" actions={<Btn style={{ padding:'6px 14px',fontSize:12 }} onClick={()=>nav('commandes')}>Tout voir →</Btn>}>
        {enAttente.length===0 ? <Empty icon="📦" title="Aucune commande en attente"/> :
          enAttente.slice(0,5).map(c=>(
            <div key={c.id} style={{ display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:`1px solid ${C.border}` }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13,fontWeight:700,color:C.text }}>{c.patient_nom||'Patient'}</div>
                <div style={{ fontSize:11,color:C.muted }}>📍 {c.adresse_livraison||'—'} · {c.patient_tel||c.telephone||'—'}</div>
              </div>
              <Badge color="amber">En attente</Badge>
            </div>
          ))
        }
      </Panel>

      {/* Stock alertes */}
      {alertes.length>0&&(
        <Panel title={`⚠️ Alertes stock (${alertes.length})`} style={{ marginTop:16 }}>
          {alertes.slice(0,5).map(s=>(
            <div key={s.id} style={{ display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:`1px solid ${C.border}` }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13,fontWeight:700,color:C.text }}>{s.nom}</div>
                <div style={{ fontSize:11,color:C.muted }}>{s.categorie||'Médicament'}</div>
              </div>
              <span style={{ fontSize:13,fontWeight:800,color:C.red }}>{s.quantite} {s.unite||'unités'}</span>
              <Badge color="red">Alerte</Badge>
            </div>
          ))}
        </Panel>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// COMMANDES / ORDONNANCES
// ═══════════════════════════════════════════════════════════════════
function PageCommandes() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('en_attente');
  const { data, isLoading } = useQuery({ queryKey:['ph-cmds'], queryFn:()=>phAPI.commandes().then(r=>r.data.data||[]) });
  const cmds = data||[];
  const updMut = useMutation({
    mutationFn: ({id,statut}) => phAPI.updCommande(id,{statut}),
    onSuccess: () => { toast.success('Commande mise à jour'); qc.invalidateQueries(['ph-cmds']); },
  });

  const tabs = [
    { key:'en_attente', label:`En attente (${cmds.filter(c=>c.statut==='en_attente').length})` },
    { key:'confirmee',  label:`Confirmées (${cmds.filter(c=>c.statut==='confirmee').length})` },
    { key:'livree',     label:`Livrées (${cmds.filter(c=>c.statut==='livree').length})` },
    { key:'',           label:`Toutes (${cmds.length})` },
  ];
  const filtered = tab ? cmds.filter(c=>c.statut===tab) : cmds;

  return (
    <div>
      <PageHeader title="📦 Commandes & Ordonnances" subtitle={`${cmds.length} commande(s) au total`}/>

      <div style={{ display:'flex',gap:4,background:C.input,borderRadius:10,padding:4,marginBottom:20,flexWrap:'wrap' }}>
        {tabs.map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)}
            style={{ flex:1,minWidth:120,background:tab===t.key?C.hover:'transparent',border:'none',borderRadius:8,padding:'8px',cursor:'pointer',fontFamily:'inherit',color:tab===t.key?C.text:C.muted,fontSize:12,fontWeight:tab===t.key?700:400 }}>
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? <Loader/> : filtered.length===0 ? <Empty icon="📦" title="Aucune commande" subtitle="Les commandes apparaîtront ici"/> :
        filtered.map(c=>(
          <div key={c.id} style={{ background:C.input,border:`1.5px solid ${c.statut==='en_attente'?'rgba(217,119,6,.3)':C.border}`,borderRadius:14,padding:20,marginBottom:14 }}>
            <div style={{ display:'flex',alignItems:'flex-start',gap:14,marginBottom:14 }}>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:6 }}>
                  <h3 style={{ fontSize:14,fontWeight:700,color:C.text,margin:0 }}>Commande #{c.id?.slice(-8).toUpperCase()}</h3>
                  <Badge color={{ en_attente:'amber',confirmee:'blue',en_cours:'teal',livree:'green',annulee:'red' }[c.statut]||'gray'}>{c.statut||'—'}</Badge>
                </div>
                <div style={{ fontSize:12,color:C.muted,marginBottom:3 }}>👤 {c.patient_nom||'Patient'} · 📞 {c.patient_tel||c.telephone||'—'}</div>
                <div style={{ fontSize:12,color:C.muted,marginBottom:3 }}>📍 {c.adresse_livraison||'—'}</div>
                <div style={{ fontSize:11,color:C.dim }}>📅 {fmtDate(c.created_at)}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:16,fontWeight:800,color:C.teal }}>1 500 FCFA</div>
                <div style={{ fontSize:11,color:C.dim }}>livraison</div>
              </div>
            </div>

            {/* Ordonnance attachée */}
            <div style={{ background:'rgba(10,143,88,.07)',border:'1px solid rgba(10,143,88,.2)',borderRadius:10,padding:'10px 14px',marginBottom:12,fontSize:12,color:C.muted }}>
              📋 <strong style={{ color:C.text }}>Ordonnance :</strong> Transmise via le numéro de commande — Médicaments à préparer selon prescription médicale
            </div>

            {c.statut==='en_attente'&&(
              <div style={{ display:'flex',gap:10 }}>
                <Btn style={{ flex:2,padding:'8px',fontSize:12 }} loading={updMut.isPending} onClick={()=>updMut.mutate({id:c.id,statut:'confirmee'})}>✅ Confirmer la commande</Btn>
                <Btn variant="danger" style={{ flex:1,padding:'8px',fontSize:12 }} onClick={()=>updMut.mutate({id:c.id,statut:'annulee'})}>✕ Annuler</Btn>
              </div>
            )}
            {c.statut==='confirmee'&&(
              <Btn style={{ width:'100%',padding:'8px',fontSize:12 }} loading={updMut.isPending} onClick={()=>updMut.mutate({id:c.id,statut:'en_cours'})}>🛵 Marquer en cours de livraison</Btn>
            )}
            {c.statut==='en_cours'&&(
              <Btn style={{ width:'100%',padding:'8px',fontSize:12 }} loading={updMut.isPending} onClick={()=>updMut.mutate({id:c.id,statut:'livree'})}>✅ Marquer livrée</Btn>
            )}
          </div>
        ))
      }
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STOCK
// ═══════════════════════════════════════════════════════════════════
function PageStock() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ nom:'',categorie:'Médicament',quantite:0,unite:'boite',seuil_alerte:10,prix_unitaire:'',fournisseur:'' });
  const { data, isLoading } = useQuery({ queryKey:['ph-stock'], queryFn:()=>phAPI.stock().then(r=>r.data.data||[]) });
  const stock = (data||[]).filter(s=>!search||s.nom.toLowerCase().includes(search.toLowerCase()));

  const addMut = useMutation({
    mutationFn: d => phAPI.addStock(d),
    onSuccess: () => { toast.success('Produit ajouté !'); qc.invalidateQueries(['ph-stock']); setShowAdd(false); },
  });
  const delMut = useMutation({
    mutationFn: id => phAPI.delStock(id),
    onSuccess: () => { toast.success('Produit supprimé'); qc.invalidateQueries(['ph-stock']); },
  });

  const f = k => e => setForm(p=>({...p,[k]:e.target.value}));
  const alertes = stock.filter(s=>s.quantite<=s.seuil_alerte);

  return (
    <div>
      <PageHeader title="💊 Gestion du stock" subtitle={`${stock.length} produit(s) · ${alertes.length} alerte(s)`}
        actions={<Btn onClick={()=>setShowAdd(true)}>+ Ajouter produit</Btn>}/>

      <Grid cols={3} gap={14} style={{ marginBottom:20 }}>
        <Card label="Total produits" value={stock.length} icon="💊" color={C.green}/>
        <Card label="Alertes stock" value={alertes.length} icon="⚠️" color={alertes.length>0?C.red:C.green}/>
        <Card label="Valeur stock" value={`${fmt(stock.reduce((s,p)=>s+(+p.prix_unitaire||0)*(+p.quantite||0),0))} F`} icon="💰" color={C.teal}/>
      </Grid>

      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Rechercher un médicament…"
        style={{ width:'100%',background:C.input,border:`1px solid ${C.border}`,borderRadius:9,padding:'10px 14px',color:C.text,fontSize:13,outline:'none',fontFamily:'inherit',marginBottom:16,boxSizing:'border-box' }}
        onFocus={e=>e.target.style.borderColor=C.green} onBlur={e=>e.target.style.borderColor=C.border}/>

      {isLoading ? <Loader/> : stock.length===0 ? <Empty icon="💊" title="Stock vide" subtitle="Ajoutez vos premiers produits"/> :
        <Panel>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%',borderCollapse:'collapse',fontSize:13 }}>
              <thead><tr style={{ borderBottom:`1px solid ${C.border}` }}>
                {['Produit','Catégorie','Quantité','Seuil','Prix unitaire','Fournisseur','Action'].map(h=>(
                  <th key={h} style={{ textAlign:'left',padding:'8px 12px',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'.5px',color:C.dim }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {stock.map(s=>(
                  <tr key={s.id} style={{ borderBottom:`1px solid ${C.border}` }} onMouseOver={e=>e.currentTarget.style.background=C.hover} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{ padding:'10px 12px',fontWeight:700,color:C.text }}>{s.nom}</td>
                    <td style={{ padding:'10px 12px',color:C.muted }}>{s.categorie||'—'}</td>
                    <td style={{ padding:'10px 12px' }}>
                      <span style={{ fontWeight:800,color:s.quantite<=(s.seuil_alerte||10)?C.red:C.green }}>{s.quantite}</span>
                      <span style={{ color:C.dim,fontSize:11 }}> {s.unite||'unités'}</span>
                    </td>
                    <td style={{ padding:'10px 12px',color:C.dim }}>{s.seuil_alerte||10}</td>
                    <td style={{ padding:'10px 12px',color:C.teal }}>{s.prix_unitaire?`${fmt(s.prix_unitaire)} F`:'—'}</td>
                    <td style={{ padding:'10px 12px',color:C.muted,fontSize:12 }}>{s.fournisseur||'—'}</td>
                    <td style={{ padding:'10px 12px' }}>
                      <Btn variant="danger" style={{ padding:'4px 10px',fontSize:11 }} onClick={()=>window.confirm('Supprimer ?')&&delMut.mutate(s.id)}>✕</Btn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      }

      <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="💊 Ajouter un produit">
        <Inp label="Nom du produit *" required value={form.nom} onChange={f('nom')} placeholder="Amoxicilline 500mg"/>
        <Grid cols={2} gap={12}>
          <div style={{ marginBottom:14 }}>
            <label style={{ display:'block',fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:'.5px',marginBottom:5 }}>Catégorie</label>
            <select value={form.categorie} onChange={f('categorie')} style={{ width:'100%',background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:9,padding:'10px 14px',color:C.text,fontSize:14,outline:'none',fontFamily:'inherit' }}>
              {['Médicament','Dispositif médical','Consommable','Vaccin','Autre'].map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <Inp label="Unité" value={form.unite} onChange={f('unite')} placeholder="boite, flacon, comprimé…"/>
          <Inp label="Quantité *" required type="number" value={form.quantite} onChange={f('quantite')} placeholder="100"/>
          <Inp label="Seuil d'alerte" type="number" value={form.seuil_alerte} onChange={f('seuil_alerte')} placeholder="10"/>
          <Inp label="Prix unitaire (FCFA)" type="number" value={form.prix_unitaire} onChange={f('prix_unitaire')} placeholder="1500"/>
          <Inp label="Fournisseur" value={form.fournisseur} onChange={f('fournisseur')} placeholder="Laborex, CERP…"/>
        </Grid>
        <div style={{ display:'flex',gap:10 }}>
          <Btn variant="outline" style={{ flex:1 }} onClick={()=>setShowAdd(false)}>Annuler</Btn>
          <Btn style={{ flex:2 }} loading={addMut.isPending} onClick={()=>{if(!form.nom){toast.error('Nom requis');return;}addMut.mutate(form);}}>Ajouter au stock</Btn>
        </div>
      </Modal>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Routes>
      <Route path="ordonnances" element={<PageOrdonnancesPharmacie/>
      <Route path="livraison" element={<PageLivraisonPharmacie/>}/>}/>
      <Route index           element={<PageHome/>}/>
      <Route path="commandes" element={<PageCommandes/>}/>
      <Route path="stock"    element={<PageStock/>}/>
      <Route path="*"        element={<PageHome/>}/>
    </Routes>
  );
}
