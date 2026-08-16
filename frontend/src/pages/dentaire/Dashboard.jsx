import React, { useState } from 'react';
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

const Btn = ({ onClick, children, color = C.green, small, style, disabled }) => (
  <button onClick={onClick} disabled={disabled} style={{
    background: disabled ? C.dim : color, color:'#fff', border:'none', borderRadius:8,
    padding: small ? '6px 14px' : '10px 20px',
    fontSize: small ? 12 : 13, fontWeight:700, cursor: disabled ? 'not-allowed' : 'pointer', ...style
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
              background: i%2===0 ? 'transparent' : `${C.border}10` }}>
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

const Bientot = ({ titre }) => (
  <div>
    <h2 style={{ color:C.text, fontSize:20, marginBottom:20 }}>{titre}</h2>
    <Card style={{ textAlign:'center', padding:48 }}>
      <div style={{ fontSize:40, marginBottom:12 }}>🚧</div>
      <div style={{ color:C.muted, fontSize:14 }}>Ce module est en cours de construction.</div>
    </Card>
  </div>
);

function PageDashboard() {
  const { data: d } = useQuery({ queryKey:['dentaire-stats'], queryFn:()=>api.get('/dentaire/stats').then(r=>r.data.data||{}) });
  const stats = d || {};
  return (
    <div>
      <h2 style={{ color:C.text, fontSize:20, marginBottom:20 }}>🦷 Tableau de bord</h2>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:16 }}>
        <StatCard icon="👤" label="Patients" value={fmt(stats.total_patients)} color={C.greenL} />
        <StatCard icon="🦷" label="Actes ce mois" value={fmt(stats.actes_ce_mois)} color={C.blueL} />
        <StatCard icon="💰" label="Chiffre d'affaires (mois)" value={`${fmt(stats.ca_ce_mois)} F`} color={C.amberL} />
        <StatCard icon="🧾" label="Factures en attente" value={fmt(stats.factures_en_attente)} color={C.red} />
      </div>
    </div>
  );
}

function PagePatients() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ prenom:'', nom:'', telephone:'', email:'', date_naissance:'', allergies:'' });

  const { data, isLoading } = useQuery({ queryKey:['dentaire-patients', q], queryFn:()=>api.get(`/dentaire/patients${q?`?q=${encodeURIComponent(q)}`:''}`).then(r=>r.data.data||[]) });

  const addMut = useMutation({
    mutationFn: () => api.post('/dentaire/patients', form),
    onSuccess: () => { toast.success('Patient ajouté !'); qc.invalidateQueries(['dentaire-patients']); setShowAdd(false); setForm({ prenom:'', nom:'', telephone:'', email:'', date_naissance:'', allergies:'' }); },
    onError: e => toast.error(e?.response?.data?.message || 'Erreur'),
  });

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <h2 style={{ color:C.text, fontSize:20, margin:0 }}>👤 Patients</h2>
        <Btn onClick={()=>setShowAdd(true)}>+ Nouveau patient</Btn>
      </div>
      <Input value={q} onChange={setQ} placeholder="Rechercher un patient (nom, téléphone)…" />
      {isLoading ? <p style={{color:C.muted}}>Chargement…</p> : (
        <Table
          cols={[
            { key:'prenom', label:'Prénom' },
            { key:'nom', label:'Nom' },
            { key:'telephone', label:'Téléphone' },
            { key:'allergies', label:'Allergies', render:v=>v?<Badge label={v} color={C.red}/>:'—' },
          ]}
          rows={data||[]}
        />
      )}
      {showAdd && (
        <Modal title="Nouveau patient" onClose={()=>setShowAdd(false)} width={520}>
          <Input label="Prénom" required value={form.prenom} onChange={v=>setForm(f=>({...f,prenom:v}))} />
          <Input label="Nom" required value={form.nom} onChange={v=>setForm(f=>({...f,nom:v}))} />
          <Input label="Téléphone" value={form.telephone} onChange={v=>setForm(f=>({...f,telephone:v}))} />
          <Input label="Email" value={form.email} onChange={v=>setForm(f=>({...f,email:v}))} />
          <Input label="Date de naissance" type="date" value={form.date_naissance} onChange={v=>setForm(f=>({...f,date_naissance:v}))} />
          <Input label="Allergies connues" value={form.allergies} onChange={v=>setForm(f=>({...f,allergies:v}))} placeholder="Pénicilline, latex…" />
          <Btn style={{width:'100%', marginTop:8}} disabled={addMut.isPending} onClick={()=>{
            if(!form.prenom||!form.nom){ toast.error('Prénom et nom requis'); return; }
            addMut.mutate();
          }}>Créer le patient</Btn>
        </Modal>
      )}
    </div>
  );
}

const NAV = [
  { path:'/dentaire',           label:'Tableau de bord', icon:'📊' },
  { path:'/dentaire/patients',  label:'Patients',        icon:'👤' },
  { path:'/dentaire/actes',     label:'Actes',           icon:'🦷' },
  { path:'/dentaire/factures',  label:'Factures',        icon:'🧾' },
  { path:'/dentaire/assurances',label:'Assurances',      icon:'🛡️' },
  { path:'/dentaire/stats',     label:'Statistiques',    icon:'📈' },
];

export default function DashboardDentaire() {
  const mode = useThemeStore(s => s.mode);
  Object.assign(C, mode === 'light' ? PALETTE_LIGHT : PALETTE_DARK);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuthStore();

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:C.bg }}>
      <div style={{ width:220, background:C.card, borderRight:`1px solid ${C.border}`, padding:'24px 12px', flexShrink:0, display:'flex', flexDirection:'column' }}>
        <div style={{ marginBottom:24, padding:'0 8px' }}>
          <div style={{ fontSize:22 }}>🦷</div>
          <div style={{ color:C.text, fontWeight:800, fontSize:15 }}>Cabinet Dentaire</div>
        </div>
        {NAV.map(n => {
          const active = location.pathname === n.path || (n.path !== '/dentaire' && location.pathname.startsWith(n.path));
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

      <div style={{ flex:1, padding:28, overflowY:'auto' }}>
        <Routes>
          <Route index element={<PageDashboard />} />
          <Route path="patients" element={<PagePatients />} />
          <Route path="actes" element={<Bientot titre="🦷 Actes dentaires" />} />
          <Route path="factures" element={<Bientot titre="🧾 Factures" />} />
          <Route path="assurances" element={<Bientot titre="🛡️ Assurances" />} />
          <Route path="stats" element={<Bientot titre="📈 Statistiques" />} />
          <Route path="*" element={<PageDashboard />} />
        </Routes>
      </div>
    </div>
  );
}
