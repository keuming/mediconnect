import React, { useState, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useAuthStore from '../../context/authStore';
import useThemeStore from '../../context/themeStore';
import api from '../../services/api';
import toast from 'react-hot-toast';

const PALETTE_DARK = {
  bg:'#060C12', card:'#0E1620', card2:'#111D2B', border:'#1E2F42',
  text:'#F0F4F8', muted:'#8BA0B5', dim:'#4E657A',
  green:'#0A8F58', greenL:'#4ade80', teal:'#0D9488',
  amber:'#D97706', amberL:'#FCD34D', blue:'#2563EB', blueL:'#93C5FD',
  red:'#E11D48', purple:'#7C3AED', indigo:'#4F46E5',
};
const PALETTE_LIGHT = {
  bg:'#F5F7FA', card:'#FFFFFF', card2:'#F0F3F6', border:'#DCE3EA',
  text:'#0E1720', muted:'#4D5B68', dim:'#75808B',
  green:'#0A8F58', greenL:'#4ade80', teal:'#0D9488',
  amber:'#B45309', amberL:'#FCD34D', blue:'#2563EB', blueL:'#93C5FD',
  red:'#DC2626', purple:'#7C3AED', indigo:'#4F46E5',
};
// eslint-disable-next-line prefer-const
const C = { ...PALETTE_DARK };
const fmt = n => Number(n||0).toLocaleString('fr-CI');
const s = (obj) => ({ ...obj });

// ── Composants UI ─────────────────────────────────────────────────
const Card = ({ children, style }) => (
  <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:20, ...style }}>
    {children}
  </div>
);

const Badge = ({ label, color = C.greenL }) => (
  <span style={{ background:`${color}20`, color, borderRadius:6, padding:'2px 8px', fontSize:11, fontWeight:700 }}>
    {label}
  </span>
);

const Btn = ({ onClick, children, color = C.green, small, style }) => (
  <button onClick={onClick} style={{
    background: color, color:'#fff', border:'none', borderRadius:8,
    padding: small ? '6px 14px' : '10px 20px',
    fontSize: small ? 12 : 13, fontWeight:700, cursor:'pointer', ...style
  }}>{children}</button>
);

const Input = ({ label, value, onChange, type='text', placeholder, required, style }) => (
  <div style={{ marginBottom:12 }}>
    {label && <div style={{ fontSize:12, color:C.muted, marginBottom:4, fontWeight:600 }}>{label}{required&&<span style={{color:C.red}}> *</span>}</div>}
    <input type={type} value={value||''} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{ width:'100%', background:C.card2, border:`1px solid ${C.border}`, borderRadius:8,
        padding:'10px 12px', color:C.text, fontSize:13, outline:'none', boxSizing:'border-box', ...style }} />
  </div>
);

const Select = ({ label, value, onChange, options, required }) => (
  <div style={{ marginBottom:12 }}>
    {label && <div style={{ fontSize:12, color:C.muted, marginBottom:4, fontWeight:600 }}>{label}{required&&<span style={{color:C.red}}> *</span>}</div>}
    <select value={value||''} onChange={e=>onChange(e.target.value)}
      style={{ width:'100%', background:C.card2, border:`1px solid ${C.border}`, borderRadius:8,
        padding:'10px 12px', color:C.text, fontSize:13, outline:'none' }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const StatCard = ({ icon, label, value, sub, color = C.greenL }) => (
  <Card style={{ position:'relative', overflow:'hidden' }}>
    <div style={{ fontSize:28, marginBottom:6 }}>{icon}</div>
    <div style={{ fontSize:22, fontWeight:800, color }}>{value}</div>
    <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>{label}</div>
    {sub && <div style={{ fontSize:11, color:C.dim, marginTop:4 }}>{sub}</div>}
  </Card>
);

const Modal = ({ title, onClose, children, width = 600 }) => (
  <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
    <div style={{ background:C.card, borderRadius:16, width:'100%', maxWidth:width, maxHeight:'90vh', overflow:'auto', padding:28 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <h3 style={{ color:C.text, margin:0, fontSize:16 }}>{title}</h3>
        <button onClick={onClose} style={{ background:'none', border:'none', color:C.muted, fontSize:20, cursor:'pointer' }}>✕</button>
      </div>
      {children}
    </div>
  </div>
);

// ── Tableau ───────────────────────────────────────────────────────
const Table = ({ cols, rows, onRow }) => (
  <div style={{ overflowX:'auto' }}>
    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
      <thead>
        <tr style={{ borderBottom:`1px solid ${C.border}` }}>
          {cols.map(c => <th key={c.key} style={{ padding:'10px 12px', color:C.muted, textAlign:'left', fontWeight:600, fontSize:11, textTransform:'uppercase', letterSpacing:.5 }}>{c.label}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && (
          <tr><td colSpan={cols.length} style={{ padding:32, textAlign:'center', color:C.dim }}>Aucune donnée</td></tr>
        )}
        {rows.map((row, i) => (
          <tr key={row.id||i} onClick={() => onRow && onRow(row)}
            style={{ borderBottom:`1px solid ${C.border}20`, cursor:onRow?'pointer':'default',
              transition:'background .15s', background: i%2===0 ? 'transparent' : `${C.border}10` }}
            onMouseOver={e => e.currentTarget.style.background = `${C.border}30`}
            onMouseOut={e => e.currentTarget.style.background = i%2===0 ? 'transparent' : `${C.border}10`}>
            {cols.map(c => (
              <td key={c.key} style={{ padding:'10px 12px', color:C.text, verticalAlign:'middle' }}>
                {c.render ? c.render(row[c.key], row) : row[c.key] || '—'}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ══════════════════════════════════════════════════════════════════
// PAGES
// ══════════════════════════════════════════════════════════════════

// ── 1. TABLEAU DE BORD ────────────────────────────────────────────
function PageDashboard() {
  const { data: stats } = useQuery({ queryKey: ['optique-stats'], queryFn: () => api.get('/optique/stats') });
  const d = stats?.data || {};
  return (
    <div>
      <h2 style={{ color:C.text, fontSize:20, fontWeight:800, marginBottom:4 }}>🔭 Cabinet Optique</h2>
      <p style={{ color:C.muted, marginBottom:24, fontSize:13 }}>Tableau de bord — Vision Plus Optique</p>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:16, marginBottom:28 }}>
        <StatCard icon="💰" label="CA aujourd'hui" value={`${fmt(d.ca_aujourd_hui)} F`} color={C.greenL} />
        <StatCard icon="📈" label="CA ce mois" value={`${fmt(d.ca_ce_mois)} F`} color={C.blueL} />
        <StatCard icon="🛒" label="Ventes ce mois" value={d.ventes_ce_mois||0} color={C.amberL} />
        <StatCard icon="⚠️" label="Alertes stock" value={d.alertes_stock||0} color={d.alertes_stock>0?C.red:C.greenL} />
        <StatCard icon="👤" label="Nouveaux patients" value={d.nouveaux_patients||0} color={C.greenL} />
        <StatCard icon="⏳" label="Commandes en cours" value={d.commandes_en_cours||0} color={C.amberL} />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        <Card>
          <h4 style={{ color:C.text, marginBottom:16, fontSize:14 }}>⚡ Accès rapides</h4>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {[
              { label:'Nouvelle vente', path:'/optique/ventes/nouvelle', color:C.green },
              { label:'Nouveau patient', path:'/optique/patients', color:C.blue },
              { label:'Stock montures', path:'/optique/stock', color:C.amber },
              { label:'Factures', path:'/optique/factures', color:C.teal },
            ].map(a => (
              <a key={a.path} href={a.path} style={{ background:`${a.color}20`, border:`1px solid ${a.color}40`,
                borderRadius:8, padding:12, textAlign:'center', color:a.color,
                fontSize:12, fontWeight:700, textDecoration:'none', display:'block' }}>{a.label}</a>
            ))}
          </div>
        </Card>
        <Card>
          <h4 style={{ color:C.text, marginBottom:16, fontSize:14 }}>📊 Répartition ventes</h4>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {[
              { label:'Patients assurés', pct:62, color:C.blue },
              { label:'Patients non assurés', pct:38, color:C.amber },
            ].map(r => (
              <div key={r.label}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:12, color:C.muted }}>{r.label}</span>
                  <span style={{ fontSize:12, color:r.color, fontWeight:700 }}>{r.pct}%</span>
                </div>
                <div style={{ height:6, background:`${C.border}`, borderRadius:3, overflow:'hidden' }}>
                  <div style={{ width:`${r.pct}%`, height:'100%', background:r.color, borderRadius:3 }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── 2. PATIENTS ───────────────────────────────────────────────────
function PagePatients() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({});
  const f = (k) => (v) => setForm(p => ({...p, [k]:v}));

  const { data } = useQuery({ queryKey: ['optique-patients', search], queryFn: () => api.get(`/optique/patients?q=${search}`) });
  const patients = data?.data || [];

  const create = useMutation({
    mutationFn: (d) => api.post('/optique/patients', d),
    onSuccess: () => { qc.invalidateQueries(['optique-patients']); setModal(false); setForm({}); toast.success('Patient ajouté !'); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h2 style={{ color:C.text, fontSize:18, fontWeight:800, margin:0 }}>👤 Patients</h2>
          <p style={{ color:C.muted, fontSize:13, margin:0 }}>{patients.length} patient(s)</p>
        </div>
        <Btn onClick={() => setModal(true)}>+ Nouveau patient</Btn>
      </div>
      <Card style={{ marginBottom:16 }}>
        <Input value={search} onChange={setSearch} placeholder="Rechercher par nom, prénom, téléphone..." />
      </Card>
      <Card>
        <Table
          cols={[
            { key:'nom', label:'Nom', render:(v,r) => `${r.prenom} ${v}` },
            { key:'telephone', label:'Téléphone' },
            { key:'assurance', label:'Assurance', render:(v) => v ? <Badge label={v} color={C.blueL} /> : <span style={{color:C.dim}}>Non assuré</span> },
            { key:'od_sphere', label:'OD/OG', render:(v,r) => v ? `${v>0?'+':''}${v} / ${r.og_sphere>0?'+':''}${r.og_sphere}` : '—' },
            { key:'created_at', label:'Depuis', render:(v) => new Date(v).toLocaleDateString('fr-FR') },
          ]}
          rows={patients}
        />
      </Card>
      {modal && (
        <Modal title="Nouveau patient" onClose={() => setModal(false)} width={700}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <Input label="Prénom" value={form.prenom} onChange={f('prenom')} required />
            <Input label="Nom" value={form.nom} onChange={f('nom')} required />
            <Input label="Téléphone" value={form.telephone} onChange={f('telephone')} />
            <Input label="Email" value={form.email} onChange={f('email')} type="email" />
            <Input label="Date de naissance" value={form.date_naissance} onChange={f('date_naissance')} type="date" />
            <Input label="Ville" value={form.ville} onChange={f('ville')} />
          </div>
          <h4 style={{ color:C.text, marginTop:8, marginBottom:12, fontSize:13 }}>🛡️ Assurance</h4>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16 }}>
            <Input label="Compagnie d'assurance" value={form.assurance} onChange={f('assurance')} />
            <Input label="N° police" value={form.numero_police} onChange={f('numero_police')} />
            <Input label="Taux prise en charge (%)" value={form.taux_prise_en_charge} onChange={f('taux_prise_en_charge')} type="number" />
          </div>
          <h4 style={{ color:C.text, marginTop:8, marginBottom:12, fontSize:13 }}>👁️ Dernière correction</h4>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
            <Input label="OD Sphère" value={form.od_sphere} onChange={f('od_sphere')} type="number" placeholder="ex: -2.50" />
            <Input label="OD Cylindre" value={form.od_cylindre} onChange={f('od_cylindre')} type="number" />
            <Input label="OD Axe" value={form.od_axe} onChange={f('od_axe')} type="number" placeholder="0-180" />
            <Input label="Addition" value={form.addition} onChange={f('addition')} type="number" />
            <Input label="OG Sphère" value={form.og_sphere} onChange={f('og_sphere')} type="number" />
            <Input label="OG Cylindre" value={form.og_cylindre} onChange={f('og_cylindre')} type="number" />
            <Input label="OG Axe" value={form.og_axe} onChange={f('og_axe')} type="number" />
            <Input label="Écart pupillaire" value={form.ecart_pupillaire} onChange={f('ecart_pupillaire')} type="number" placeholder="mm" />
          </div>
          <Input label="Notes" value={form.notes} onChange={f('notes')} placeholder="Observations particulières..." />
          <div style={{ display:'flex', gap:12, justifyContent:'flex-end', marginTop:16 }}>
            <Btn onClick={() => setModal(false)} color={C.border} style={{ color:C.text }}>Annuler</Btn>
            <Btn onClick={() => create.mutate(form)} color={C.green}>Enregistrer</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── 3. STOCK ──────────────────────────────────────────────────────
function PageStock() {
  const [onglet, setOnglet] = useState('montures');
  const [modalMonture, setModalMonture] = useState(false);
  const [modalVerre, setModalVerre] = useState(false);
  const [formM, setFormM] = useState({});
  const [formV, setFormV] = useState({});
  const qc = useQueryClient();

  const { data: montures } = useQuery({ queryKey: ['stock-montures'], queryFn: () => api.get('/optique/stock/montures') });
  const { data: verres }   = useQuery({ queryKey: ['stock-verres'],   queryFn: () => api.get('/optique/stock/verres') });
  const { data: access }   = useQuery({ queryKey: ['stock-access'],   queryFn: () => api.get('/optique/stock/accessoires') });

  const addMonture = useMutation({
    mutationFn: d => api.post('/optique/stock/montures', d),
    onSuccess: () => { qc.invalidateQueries(['stock-montures']); setModalMonture(false); setFormM({}); toast.success('Monture ajoutée !'); },
  });
  const addVerre = useMutation({
    mutationFn: d => api.post('/optique/stock/verres', d),
    onSuccess: () => { qc.invalidateQueries(['stock-verres']); setModalVerre(false); setFormV({}); toast.success('Verre ajouté !'); },
  });

  const tabs = [
    { key:'montures', label:'🕶️ Montures', count: montures?.data?.length },
    { key:'verres',   label:'🔬 Verres',    count: verres?.data?.length },
    { key:'access',   label:'📦 Accessoires', count: access?.data?.length },
  ];

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <h2 style={{ color:C.text, fontSize:18, fontWeight:800, margin:0 }}>📦 Gestion du Stock</h2>
        <div style={{ display:'flex', gap:10 }}>
          {onglet==='montures' && <Btn onClick={() => setModalMonture(true)} small>+ Monture</Btn>}
          {onglet==='verres'   && <Btn onClick={() => setModalVerre(true)} small>+ Verre</Btn>}
        </div>
      </div>
      {/* Onglets */}
      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setOnglet(t.key)} style={{
            padding:'8px 16px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight:700,
            background: onglet===t.key ? C.green : C.card2, color: onglet===t.key ? '#fff' : C.muted,
          }}>{t.label} {t.count!==undefined && <span style={{ opacity:.7 }}>({t.count||0})</span>}</button>
        ))}
      </div>

      {onglet==='montures' && (
        <Card>
          <Table
            cols={[
              { key:'marque', label:'Marque / Modèle', render:(v,r) => `${v} ${r.modele||''}` },
              { key:'couleur', label:'Couleur' },
              { key:'genre', label:'Genre', render:(v) => v || '—' },
              { key:'quantite', label:'Qté', render:(v,r) => (
                <span style={{ color: v<=r.seuil_alerte ? C.red : C.greenL, fontWeight:700 }}>{v}</span>
              )},
              { key:'prix_vente', label:'Prix vente', render:(v) => `${fmt(v)} F` },
              { key:'fournisseur', label:'Fournisseur' },
            ]}
            rows={montures?.data || []}
          />
        </Card>
      )}

      {onglet==='verres' && (
        <Card>
          <Table
            cols={[
              { key:'marque', label:'Marque' },
              { key:'type_verre', label:'Type', render:(v) => <Badge label={v} color={C.blueL} /> },
              { key:'indice', label:'Indice' },
              { key:'traitement', label:'Traitement' },
              { key:'quantite', label:'Qté', render:(v,r) => (
                <span style={{ color: v<=r.seuil_alerte ? C.red : C.greenL, fontWeight:700 }}>{v}</span>
              )},
              { key:'prix_vente_paire', label:'Prix/paire', render:(v) => `${fmt(v)} F` },
            ]}
            rows={verres?.data || []}
          />
        </Card>
      )}

      {onglet==='access' && (
        <Card>
          <Table
            cols={[
              { key:'nom', label:'Produit' },
              { key:'categorie', label:'Catégorie' },
              { key:'quantite', label:'Qté', render:(v,r) => (
                <span style={{ color: v<=r.seuil_alerte ? C.red : C.greenL, fontWeight:700 }}>{v}</span>
              )},
              { key:'prix_vente', label:'Prix', render:(v) => `${fmt(v)} F` },
            ]}
            rows={access?.data || []}
          />
        </Card>
      )}

      {/* Modal Monture */}
      {modalMonture && (
        <Modal title="Ajouter une monture" onClose={() => setModalMonture(false)}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <Input label="Marque" value={formM.marque} onChange={v=>setFormM(p=>({...p,marque:v}))} required />
            <Input label="Modèle" value={formM.modele} onChange={v=>setFormM(p=>({...p,modele:v}))} />
            <Input label="Référence" value={formM.reference} onChange={v=>setFormM(p=>({...p,reference:v}))} />
            <Input label="Couleur" value={formM.couleur} onChange={v=>setFormM(p=>({...p,couleur:v}))} />
            <Input label="Taille" value={formM.taille} onChange={v=>setFormM(p=>({...p,taille:v}))} />
            <Select label="Matériau" value={formM.materiau} onChange={v=>setFormM(p=>({...p,materiau:v}))} options={[
              {value:'',label:'Choisir...'},{value:'acetate',label:'Acétate'},
              {value:'metal',label:'Métal'},{value:'titane',label:'Titane'},{value:'plastique',label:'Plastique'}
            ]} />
            <Select label="Genre" value={formM.genre} onChange={v=>setFormM(p=>({...p,genre:v}))} options={[
              {value:'mixte',label:'Mixte'},{value:'homme',label:'Homme'},
              {value:'femme',label:'Femme'},{value:'enfant',label:'Enfant'}
            ]} />
            <Input label="Quantité" value={formM.quantite} onChange={v=>setFormM(p=>({...p,quantite:v}))} type="number" />
            <Input label="Seuil alerte" value={formM.seuil_alerte} onChange={v=>setFormM(p=>({...p,seuil_alerte:v}))} type="number" />
            <Input label="Prix achat (F)" value={formM.prix_achat} onChange={v=>setFormM(p=>({...p,prix_achat:v}))} type="number" />
            <Input label="Prix vente (F)" value={formM.prix_vente} onChange={v=>setFormM(p=>({...p,prix_vente:v}))} type="number" required />
            <Input label="Fournisseur" value={formM.fournisseur} onChange={v=>setFormM(p=>({...p,fournisseur:v}))} />
          </div>
          <div style={{ display:'flex', gap:12, justifyContent:'flex-end', marginTop:16 }}>
            <Btn onClick={() => setModalMonture(false)} color={C.border} style={{color:C.text}}>Annuler</Btn>
            <Btn onClick={() => addMonture.mutate(formM)}>Enregistrer</Btn>
          </div>
        </Modal>
      )}

      {/* Modal Verre */}
      {modalVerre && (
        <Modal title="Ajouter des verres" onClose={() => setModalVerre(false)}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <Input label="Marque" value={formV.marque} onChange={v=>setFormV(p=>({...p,marque:v}))} required />
            <Select label="Type" value={formV.type_verre} onChange={v=>setFormV(p=>({...p,type_verre:v}))} required options={[
              {value:'',label:'Choisir...'},{value:'unifocal',label:'Unifocal'},
              {value:'bifocal',label:'Bifocal'},{value:'progressif',label:'Progressif'},{value:'degressif',label:'Dégressif'}
            ]} />
            <Select label="Indice" value={formV.indice} onChange={v=>setFormV(p=>({...p,indice:v}))} options={[
              {value:'1.50',label:'1.50'},{value:'1.60',label:'1.60'},
              {value:'1.67',label:'1.67'},{value:'1.74',label:'1.74'}
            ]} />
            <Input label="Traitement" value={formV.traitement} onChange={v=>setFormV(p=>({...p,traitement:v}))} placeholder="antireflet, photochromique..." />
            <Input label="Gamme sphère min" value={formV.gamme_sphere_min} onChange={v=>setFormV(p=>({...p,gamme_sphere_min:v}))} type="number" placeholder="-20.00" />
            <Input label="Gamme sphère max" value={formV.gamme_sphere_max} onChange={v=>setFormV(p=>({...p,gamme_sphere_max:v}))} type="number" placeholder="+20.00" />
            <Input label="Quantité (paires)" value={formV.quantite} onChange={v=>setFormV(p=>({...p,quantite:v}))} type="number" />
            <Input label="Prix vente/paire (F)" value={formV.prix_vente_paire} onChange={v=>setFormV(p=>({...p,prix_vente_paire:v}))} type="number" required />
            <Input label="Prix achat/paire (F)" value={formV.prix_achat} onChange={v=>setFormV(p=>({...p,prix_achat:v}))} type="number" />
            <Input label="Fournisseur" value={formV.fournisseur} onChange={v=>setFormV(p=>({...p,fournisseur:v}))} />
          </div>
          <div style={{ display:'flex', gap:12, justifyContent:'flex-end', marginTop:16 }}>
            <Btn onClick={() => setModalVerre(false)} color={C.border} style={{color:C.text}}>Annuler</Btn>
            <Btn onClick={() => addVerre.mutate(formV)}>Enregistrer</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── 4. VENTES ─────────────────────────────────────────────────────
function PageVentes() {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ est_assure: false, pose_prix: 5000 });
  const qc = useQueryClient();
  const f = k => v => setForm(p => ({...p, [k]:v}));

  const { data } = useQuery({ queryKey: ['optique-ventes'], queryFn: () => api.get('/optique/ventes') });
  const { data: montures } = useQuery({ queryKey: ['stock-montures'], queryFn: () => api.get('/optique/stock/montures') });
  const { data: verres }   = useQuery({ queryKey: ['stock-verres'],   queryFn: () => api.get('/optique/stock/verres') });
  const ventes = data?.data || [];

  // Calcul automatique des montants
  const monturePrix = montures?.data?.find(m => m.id === form.monture_id)?.prix_vente || 0;
  const verrePrix   = (verres?.data?.find(v => v.id === form.verre_od_id)?.prix_vente_paire || 0);
  const total = +monturePrix + +verrePrix + +(form.pose_prix || 0);
  const assurMontant = form.est_assure ? Math.round(total * (form.taux_prise_en_charge || 0) / 100) : 0;
  const patientMontant = total - assurMontant;

  const create = useMutation({
    mutationFn: d => api.post('/optique/ventes', d),
    onSuccess: () => { qc.invalidateQueries(['optique-ventes']); setModal(false); setForm({ est_assure:false, pose_prix:5000 }); toast.success('Vente enregistrée !'); },
    onError: e => toast.error(e.message),
  });

  const statutColor = { en_cours:C.amber, pret:C.blue, livre:C.green, annule:C.red };

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h2 style={{ color:C.text, fontSize:18, fontWeight:800, margin:0 }}>🛒 Ventes</h2>
          <p style={{ color:C.muted, fontSize:13, margin:0 }}>{ventes.length} vente(s)</p>
        </div>
        <Btn onClick={() => setModal(true)}>+ Nouvelle vente</Btn>
      </div>
      <Card>
        <Table
          cols={[
            { key:'reference', label:'Réf.', render:v => <span style={{color:C.greenL, fontWeight:700, fontSize:11}}>{v}</span> },
            { key:'patient_nom', label:'Patient' },
            { key:'montant_net', label:'Montant', render:v => `${fmt(v)} F` },
            { key:'est_assure', label:'Assurance', render:v => v ? <Badge label="Assuré" color={C.blueL}/> : <Badge label="Non assuré" color={C.amber}/> },
            { key:'statut_paiement', label:'Paiement', render:v => <Badge label={v} color={v==='solde'?C.green:v==='partiel'?C.amber:C.red}/> },
            { key:'statut', label:'Statut', render:v => <Badge label={v} color={statutColor[v]||C.muted}/> },
            { key:'created_at', label:'Date', render:v => new Date(v).toLocaleDateString('fr-FR') },
          ]}
          rows={ventes}
        />
      </Card>

      {modal && (
        <Modal title="Nouvelle vente" onClose={() => setModal(false)} width={750}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <Input label="Nom du patient" value={form.patient_nom} onChange={f('patient_nom')} required />
            <Input label="Date livraison prévue" value={form.date_livraison_prevue} onChange={f('date_livraison_prevue')} type="date" />
          </div>

          <h4 style={{ color:C.text, fontSize:13, marginBottom:12 }}>🕶️ Équipement</h4>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <Select label="Monture" value={form.monture_id} onChange={v => { f('monture_id')(v); f('monture_desc')(montures?.data?.find(m=>m.id===v)?.marque + ' ' + (montures?.data?.find(m=>m.id===v)?.modele||'')); f('monture_prix')(montures?.data?.find(m=>m.id===v)?.prix_vente||0)(); }} options={[
              {value:'',label:'Sélectionner une monture...'},
              ...(montures?.data||[]).map(m => ({value:m.id, label:`${m.marque} ${m.modele||''} — ${fmt(m.prix_vente)} F`}))
            ]} />
            <Select label="Verres (paire OD+OG)" value={form.verre_od_id} onChange={v => f('verre_od_id')(v)} options={[
              {value:'',label:'Sélectionner des verres...'},
              ...(verres?.data||[]).map(v => ({value:v.id, label:`${v.marque} ${v.type_verre} ind.${v.indice} — ${fmt(v.prix_vente_paire)} F/paire`}))
            ]} />
            <Input label="Prix pose (F)" value={form.pose_prix} onChange={f('pose_prix')} type="number" />
            <Input label="Remise (F)" value={form.remise_montant} onChange={f('remise_montant')} type="number" />
          </div>

          <div style={{ background:C.card2, borderRadius:8, padding:16, marginBottom:16 }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, textAlign:'center' }}>
              <div><div style={{ fontSize:11, color:C.muted }}>Monture</div><div style={{ color:C.text, fontWeight:700 }}>{fmt(monturePrix)} F</div></div>
              <div><div style={{ fontSize:11, color:C.muted }}>Verres</div><div style={{ color:C.text, fontWeight:700 }}>{fmt(verrePrix)} F</div></div>
              <div><div style={{ fontSize:11, color:C.muted }}>Pose</div><div style={{ color:C.text, fontWeight:700 }}>{fmt(form.pose_prix||0)} F</div></div>
              <div><div style={{ fontSize:11, color:C.muted }}>TOTAL</div><div style={{ color:C.greenL, fontWeight:800, fontSize:16 }}>{fmt(total)} F</div></div>
            </div>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
            <input type="checkbox" checked={form.est_assure||false} onChange={e => f('est_assure')(e.target.checked)} id="assure" />
            <label htmlFor="assure" style={{ color:C.text, fontSize:13, cursor:'pointer' }}>Patient assuré</label>
          </div>

          {form.est_assure && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16, marginBottom:16 }}>
              <Input label="Compagnie" value={form.assurance} onChange={f('assurance')} />
              <Input label="N° police" value={form.numero_police} onChange={f('numero_police')} />
              <Input label="Taux PEC (%)" value={form.taux_prise_en_charge} onChange={f('taux_prise_en_charge')} type="number" />
            </div>
          )}

          {form.est_assure && (
            <div style={{ background:`${C.blue}15`, borderRadius:8, padding:12, marginBottom:16, display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div><span style={{ fontSize:12, color:C.muted }}>Part assurance : </span><span style={{ color:C.blueL, fontWeight:700 }}>{fmt(assurMontant)} F</span></div>
              <div><span style={{ fontSize:12, color:C.muted }}>Part patient : </span><span style={{ color:C.amberL, fontWeight:700 }}>{fmt(patientMontant)} F</span></div>
            </div>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <Select label="Mode de paiement" value={form.mode_paiement} onChange={f('mode_paiement')} options={[
              {value:'Espèces',label:'Espèces'},{value:'Wave',label:'Wave'},
              {value:'Orange Money',label:'Orange Money'},{value:'MTN MoMo',label:'MTN MoMo'},
              {value:'Assurance',label:'Assurance (tiers-payant)'}
            ]} />
            <Input label="Acompte versé (F)" value={form.acompte_verse} onChange={f('acompte_verse')} type="number" />
          </div>
          <Input label="Notes" value={form.notes} onChange={f('notes')} placeholder="Observations, spécifications particulières..." />

          <div style={{ display:'flex', gap:12, justifyContent:'flex-end', marginTop:16 }}>
            <Btn onClick={() => setModal(false)} color={C.border} style={{color:C.text}}>Annuler</Btn>
            <Btn onClick={() => create.mutate({
              ...form,
              monture_prix: monturePrix,
              verres_prix: verrePrix,
              montant_total: total,
              montant_assurance: assurMontant,
              montant_patient: patientMontant,
            })}>Enregistrer la vente</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── 5. FACTURES ───────────────────────────────────────────────────
function PageFactures() {
  const { data } = useQuery({ queryKey: ['optique-factures'], queryFn: () => api.get('/optique/factures') });
  const factures = data?.data || [];
  const qc = useQueryClient();

  const updateFacture = useMutation({
    mutationFn: ({ id, ...d }) => api.put(`/optique/factures/${id}`, d),
    onSuccess: () => { qc.invalidateQueries(['optique-factures']); toast.success('Facture mise à jour'); },
  });

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h2 style={{ color:C.text, fontSize:18, fontWeight:800, margin:0 }}>🧾 Factures</h2>
          <p style={{ color:C.muted, fontSize:13, margin:0 }}>{factures.length} facture(s)</p>
        </div>
      </div>
      <Card>
        <Table
          cols={[
            { key:'reference', label:'Référence', render:v => <span style={{color:C.greenL,fontWeight:700,fontSize:11}}>{v}</span> },
            { key:'patient_nom', label:'Patient' },
            { key:'montant_total', label:'Total', render:v => `${fmt(v)} F` },
            { key:'montant_assurance', label:'Assurance', render:v => +v > 0 ? <span style={{color:C.blueL}}>{fmt(v)} F</span> : '—' },
            { key:'montant_paye', label:'Payé', render:v => <span style={{color:C.greenL}}>{fmt(v)} F</span> },
            { key:'statut', label:'Statut', render:(v,r) => (
              <select value={v} onChange={e => updateFacture.mutate({id:r.id, statut:e.target.value})}
                style={{ background:C.card2, border:`1px solid ${C.border}`, borderRadius:6, padding:'4px 8px', color:C.text, fontSize:12 }}>
                <option value="emise">Émise</option>
                <option value="payee">Payée</option>
                <option value="partiellement_payee">Partielle</option>
                <option value="annulee">Annulée</option>
              </select>
            )},
            { key:'created_at', label:'Date', render:v => new Date(v).toLocaleDateString('fr-FR') },
          ]}
          rows={factures}
        />
      </Card>
    </div>
  );
}

// ── 6. PATIENTS ASSURÉS ───────────────────────────────────────────
function PageAssures() {
  const { data } = useQuery({ queryKey: ['optique-assures'], queryFn: () => api.get('/optique/patients-assures') });
  const patients = data?.data || [];

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <h2 style={{ color:C.text, fontSize:18, fontWeight:800, margin:0 }}>🛡️ Patients assurés</h2>
        <p style={{ color:C.muted, fontSize:13, margin:0 }}>{patients.length} patient(s) avec assurance</p>
      </div>
      <Card>
        <Table
          cols={[
            { key:'prenom', label:'Patient', render:(v,r) => `${v} ${r.nom}` },
            { key:'assurance', label:'Compagnie', render:v => <Badge label={v} color={C.blueL} /> },
            { key:'numero_police', label:'N° Police' },
            { key:'taux_prise_en_charge', label:'Taux PEC', render:v => `${v}%` },
            { key:'nb_ventes', label:'Achats', render:v => v || 0 },
            { key:'total_assurance', label:'Total assuré', render:v => <span style={{color:C.blueL}}>{fmt(v)} F</span> },
            { key:'telephone', label:'Téléphone' },
          ]}
          rows={patients}
        />
      </Card>
    </div>
  );
}

// ── 7. STATISTIQUES ───────────────────────────────────────────────
function PageStats() {
  const { data } = useQuery({ queryKey: ['optique-statistiques'], queryFn: () => api.get('/optique/statistiques') });
  const d = data?.data || {};

  return (
    <div>
      <h2 style={{ color:C.text, fontSize:18, fontWeight:800, marginBottom:20 }}>📊 Statistiques</h2>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        <Card>
          <h4 style={{ color:C.text, fontSize:14, marginBottom:16 }}>📈 CA Mensuel</h4>
          {(d.ca_mensuel||[]).map(m => (
            <div key={m.mois} style={{ display:'flex', justifyContent:'space-between', marginBottom:8, padding:'6px 0', borderBottom:`1px solid ${C.border}` }}>
              <span style={{ color:C.muted, fontSize:13 }}>{m.mois_label}</span>
              <span style={{ color:C.greenL, fontWeight:700 }}>{fmt(m.ca)} F</span>
              <span style={{ color:C.dim, fontSize:12 }}>{m.nb_ventes} ventes</span>
            </div>
          ))}
          {!d.ca_mensuel?.length && <p style={{color:C.dim,textAlign:'center'}}>Aucune donnée</p>}
        </Card>
        <Card>
          <h4 style={{ color:C.text, fontSize:14, marginBottom:16 }}>🕶️ Top Montures</h4>
          {(d.top_montures||[]).map((m,i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', marginBottom:8, padding:'6px 0', borderBottom:`1px solid ${C.border}` }}>
              <span style={{ color:C.text, fontSize:13 }}>{m.monture_desc}</span>
              <span style={{ color:C.amberL, fontWeight:700 }}>{m.nb} ventes</span>
            </div>
          ))}
          {!d.top_montures?.length && <p style={{color:C.dim,textAlign:'center'}}>Aucune donnée</p>}
        </Card>
        <Card>
          <h4 style={{ color:C.text, fontSize:14, marginBottom:16 }}>👁️ Types de correction</h4>
          {(d.corrections||[]).map((c,i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
              <span style={{ color:C.muted, fontSize:13 }}>{c.type_correction}</span>
              <Badge label={`${c.nb} ordonnances`} color={C.blueL} />
            </div>
          ))}
          {!d.corrections?.length && <p style={{color:C.dim,textAlign:'center'}}>Aucune donnée</p>}
        </Card>
        <Card>
          <h4 style={{ color:C.text, fontSize:14, marginBottom:16 }}>🛡️ Assuré vs Non assuré</h4>
          {(d.repartition_assurance||[]).map((r,i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', marginBottom:8, padding:'6px 0', borderBottom:`1px solid ${C.border}` }}>
              <span style={{ color:C.muted, fontSize:13 }}>{r.est_assure ? 'Assuré' : 'Non assuré'}</span>
              <span style={{ color:r.est_assure?C.blueL:C.amber, fontWeight:700 }}>{r.nb} ventes</span>
              <span style={{ color:C.greenL }}>{fmt(r.ca)} F</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

// ── NAVIGATION ────────────────────────────────────────────────────
const NAV = [
  { path:'/optique',          label:'Tableau de bord', icon:'📊' },
  { path:'/optique/patients', label:'Patients',         icon:'👤' },
  { path:'/optique/stock',    label:'Stock',            icon:'📦' },
  { path:'/optique/ventes',   label:'Ventes',           icon:'🛒' },
  { path:'/optique/factures', label:'Factures',         icon:'🧾' },
  { path:'/optique/assures',  label:'Patients assurés', icon:'🛡️' },
  { path:'/optique/stats',    label:'Statistiques',     icon:'📈' },
];

// ── EXPORT PRINCIPAL ──────────────────────────────────────────────
export default function DashboardOptique() {
  const mode = useThemeStore(s => s.mode);
  Object.assign(C, mode === 'light' ? PALETTE_LIGHT : PALETTE_DARK);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuthStore();

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:C.bg }}>
      {/* Sidebar */}
      <div style={{ width:220, background:C.card, borderRight:`1px solid ${C.border}`, padding:'24px 12px', flexShrink:0, display:'flex', flexDirection:'column' }}>
        <div style={{ marginBottom:24, padding:'0 8px' }}>
          <div style={{ fontSize:22 }}>🔭</div>
          <div style={{ color:C.text, fontWeight:800, fontSize:15 }}>Cabinet Optique</div>
          <div style={{ color:C.muted, fontSize:11 }}>Vision Plus Optique</div>
        </div>
        {NAV.map(n => {
          const active = location.pathname === n.path || (n.path !== '/optique' && location.pathname.startsWith(n.path));
          return (
            <button key={n.path} onClick={() => navigate(n.path)} style={{
              width:'100%', textAlign:'left', padding:'10px 12px', borderRadius:8,
              border:'none', cursor:'pointer', marginBottom:4, display:'flex', alignItems:'center', gap:10,
              background: active ? `${C.green}20` : 'transparent',
              color: active ? C.greenL : C.muted,
              fontWeight: active ? 700 : 400, fontSize:13,
            }}>
              <span>{n.icon}</span> {n.label}
            </button>
          );
        })}
        <div style={{ marginTop:'auto', paddingTop:16, borderTop:`1px solid ${C.border}` }}>
          <button onClick={() => { logout(); navigate('/login'); }} style={{
            width:'100%', textAlign:'left', padding:'10px 12px', borderRadius:8,
            border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:10,
            background:'transparent', color:C.red, fontWeight:700, fontSize:13,
          }}>
            <span>🚪</span> Déconnexion
          </button>
        </div>
      </div>

      {/* Contenu */}
      <div style={{ flex:1, padding:28, overflowY:'auto' }}>
        <Routes>
          <Route index element={<PageDashboard />} />
          <Route path="patients" element={<PagePatients />} />
          <Route path="stock" element={<PageStock />} />
          <Route path="ventes/*" element={<PageVentes />} />
          <Route path="factures" element={<PageFactures />} />
          <Route path="assures" element={<PageAssures />} />
          <Route path="stats" element={<PageStats />} />
          <Route path="*" element={<PageDashboard />} />
        </Routes>
      </div>
    </div>
  );
}
