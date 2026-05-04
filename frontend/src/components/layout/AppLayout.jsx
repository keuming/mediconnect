import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '../../context/authStore';

const C = {
  green:"#0A8F58", teal:"#0D9488", bg:"#060C12", card:"#0E1620",
  border:"#1E2F42", text:"#F0F4F8", muted:"#8BA0B5", dim:"#4E657A",
};

// ── Navigation par rôle ───────────────────────────────────────────
const NAV = {
  patient: [
    { path:'/patient',              icon:'🏠', label:'Accueil' },
    { path:'/patient/rdv',          icon:'📅', label:'Mes RDV' },
    { path:'/patient/ordonnances',  icon:'💊', label:'Ordonnances' },
    { path:'/patient/dossier',      icon:'📋', label:'Mon dossier' },
  ],
  clinique: [
    { path:'/clinique',             icon:'📊', label:'Dashboard' },
    { path:'/clinique/planning',    icon:'📅', label:'Planning & RDV' },
    { path:'/clinique/dossiers',    icon:'👤', label:'Dossiers patients' },
    { path:'/clinique/consultation',icon:'🩺', label:'Consultation',   badge:'NEW' },
    { path:'/clinique/caisse',      icon:'💰', label:'Caisse',         badge:'NEW' },
    { path:'/clinique/facturation', icon:'📄', label:'Facturation' },
    { path:'/clinique/medecins',    icon:'👨‍⚕️', label:'Médecins & RH' },
    { path:'/clinique/stock',       icon:'💊', label:'Stock' },
    { path:'/clinique/assurance',   icon:'🛡️', label:'Assurances v2' },
    { path:'/clinique/dossiers-ass',icon:'📁', label:'Dossiers ass.' },
    { path:'/clinique/qualite',     icon:'📋', label:'Qualité & Docs' },
    { path:'/clinique/stats',       icon:'📊', label:'Statistiques' },
  ],
  medecin: [
    { path:'/medecin',              icon:'🏠', label:'Tableau de bord' },
    { path:'/medecin/planning',     icon:'📅', label:'Mon planning' },
    { path:'/medecin/patients',     icon:'👤', label:'Mes patients' },
    { path:'/medecin/statistiques', icon:'📊', label:'Statistiques' },
  ],
  pharmacie: [
    { path:'/pharmacie',            icon:'📊', label:'Dashboard' },
    { path:'/pharmacie/stock',      icon:'💊', label:'Stock' },
    { path:'/pharmacie/commandes',  icon:'📦', label:'Commandes' },
    { path:'/pharmacie/ordonnances',icon:'📄', label:'Ordonnances' },
  ],
  livreur: [
    { path:'/livreur',              icon:'📊', label:'Dashboard' },
    { path:'/livreur/missions',     icon:'📦', label:'Missions' },
    { path:'/livreur/en-cours',     icon:'🛵', label:'En cours' },
    { path:'/livreur/historique',   icon:'📋', label:'Historique' },
    { path:'/livreur/gains',        icon:'💰', label:'Gains' },
  ],
  admin: [
    { path:'/admin',                icon:'🏛️', label:'Dashboard' },
    { path:'/admin/monetisation',   icon:'💰', label:'Monétisation' },
    { path:'/admin/cliniques',      icon:'🏥', label:'Cliniques' },
    { path:'/admin/patients',       icon:'👤', label:'Patients' },
    { path:'/admin/livreurs',       icon:'🛵', label:'Livreurs' },
    { path:'/admin/utilisateurs',   icon:'👥', label:'Utilisateurs' },
    { path:'/admin/statistiques',   icon:'📊', label:'Statistiques' },
  ],
  assureur: [
    { path:'/assureur',             icon:'📊', label:'Dashboard' },
    { path:'/assureur/dossiers',    icon:'📁', label:'Dossiers' },
  ],
};

const ROLE_LABELS = {
  patient:'Espace Patient', clinique:'Espace Clinique', medecin:'Espace Médecin',
  pharmacie:'Espace Pharmacie', livreur:'Espace Livreur', admin:'Administration', assureur:'Espace Assureur',
};

const ROLE_COLORS = {
  patient: C.teal, clinique: C.green, medecin: '#7C3AED',
  pharmacie: '#0891B2', livreur: '#D97706', admin: C.green, assureur: '#2563EB',
};

export default function AppLayout({ children }) {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const nav = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (!user) return null;

  const role    = user.role || 'patient';
  const navItems= NAV[role] || [];
  const roleColor = ROLE_COLORS[role] || C.green;

  const handleLogout = () => {
    logout();
    nav('/login');
  };

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:C.bg, fontFamily:"'Plus Jakarta Sans', -apple-system, sans-serif" }}>

      {/* ── SIDEBAR ──────────────────────────────────────────────── */}
      <aside style={{
        width: sidebarOpen ? 224 : 68,
        background: C.card,
        borderRight: `1px solid ${C.border}`,
        display: 'flex', flexDirection: 'column',
        transition: 'width .25s ease',
        position: 'fixed', top: 0, left: 0, bottom: 0,
        zIndex: 50, overflowX: 'hidden',
      }}>
        {/* Logo */}
        <div style={{ padding:'20px 16px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:36, height:36, background:`linear-gradient(135deg,${roleColor},${C.teal})`, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, color:'#fff', fontSize:18, flexShrink:0 }}>+</div>
          {sidebarOpen && (
            <div>
              <div style={{ fontFamily:"'DM Serif Display', serif", fontSize:15, color:C.text, fontWeight:400, lineHeight:1.2 }}>Medi<span style={{ color:roleColor }}>Connect</span></div>
              <div style={{ fontSize:9, color:C.dim, fontWeight:700, textTransform:'uppercase', letterSpacing:'.5px' }}>{ROLE_LABELS[role]}</div>
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav style={{ flex:1, padding:'12px 8px', overflowY:'auto' }}>
          <div style={{ fontSize:9, fontWeight:700, color:C.dim, textTransform:'uppercase', letterSpacing:'.5px', padding:'4px 8px 8px', display:sidebarOpen?'block':'none' }}>
            {ROLE_LABELS[role]}
          </div>
          {navItems.map(item => {
            const isActive = location.pathname === item.path || (item.path !== `/${role}` && location.pathname.startsWith(item.path));
            return (
              <Link key={item.path} to={item.path}
                style={{
                  display:'flex', alignItems:'center', gap:10, padding:'10px 10px',
                  borderRadius:10, marginBottom:2, textDecoration:'none',
                  background: isActive ? `rgba(${role==='medecin'?'124,58,237':role==='admin'?'10,143,88':'10,143,88'},.15)` : 'transparent',
                  border: `1px solid ${isActive ? (role==='medecin'?'rgba(124,58,237,.3)':'rgba(10,143,88,.3)') : 'transparent'}`,
                  transition:'all .15s',
                }}
                onMouseOver={e => { if(!isActive) e.currentTarget.style.background = 'rgba(255,255,255,.05)'; }}
                onMouseOut={e  => { if(!isActive) e.currentTarget.style.background = 'transparent'; }}>
                <span style={{ fontSize:16, flexShrink:0 }}>{item.icon}</span>
                {sidebarOpen && (
                  <>
                    <span style={{ fontSize:13, fontWeight:isActive?700:500, color:isActive?roleColor:C.muted, flex:1 }}>{item.label}</span>
                    {item.badge && <span style={{ background:roleColor, color:'#fff', fontSize:9, fontWeight:800, padding:'2px 6px', borderRadius:8 }}>{item.badge}</span>}
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User info + logout */}
        <div style={{ padding:'12px 8px', borderTop:`1px solid ${C.border}` }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:10, marginBottom:6 }}>
            <div style={{ width:32, height:32, borderRadius:'50%', background:`linear-gradient(135deg,${roleColor},${C.teal})`, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, color:'#fff', fontSize:12, flexShrink:0 }}>
              {user.prenom?.[0]}{user.nom?.[0]}
            </div>
            {sidebarOpen && (
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:700, color:C.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{user.prenom} {user.nom}</div>
                <div style={{ fontSize:10, color:C.dim, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{user.email}</div>
              </div>
            )}
          </div>
          <button onClick={handleLogout}
            style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'8px 10px', background:'rgba(225,29,72,.08)', border:'1px solid rgba(225,29,72,.2)', borderRadius:10, color:'#E11D48', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            <span>←</span>
            {sidebarOpen && 'Se déconnecter'}
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ──────────────────────────────────────────── */}
      <main style={{ flex:1, marginLeft: sidebarOpen ? 224 : 68, transition:'margin-left .25s ease', display:'flex', flexDirection:'column', minHeight:'100vh' }}>

        {/* Topbar */}
        <header style={{ background:C.card, borderBottom:`1px solid ${C.border}`, padding:'0 24px', height:60, display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:40 }}>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <button onClick={() => setSidebarOpen(o=>!o)}
              style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:'6px 10px', cursor:'pointer', fontSize:14, color:C.muted }}>
              {sidebarOpen ? '←' : '→'}
            </button>
            <div style={{ fontSize:12, color:C.dim }}>
              {new Date().toLocaleDateString('fr-CI', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
            </div>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            {/* Indicateur rôle médecin */}
            {role === 'medecin' && (
              <div style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(124,58,237,.1)', border:'1px solid rgba(124,58,237,.3)', borderRadius:8, padding:'5px 12px', fontSize:11, color:'#7C3AED', fontWeight:700 }}>
                <span style={{ width:6, height:6, background:'#7C3AED', borderRadius:'50%', animation:'pulse 2s infinite' }} />
                Planning synchronisé
              </div>
            )}
            <div style={{ fontSize:13, color:C.muted }}>
              {user.prenom} {user.nom}
            </div>
            <div style={{ width:32, height:32, borderRadius:'50%', background:`linear-gradient(135deg,${roleColor},${C.teal})`, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, color:'#fff', fontSize:12 }}>
              {user.prenom?.[0]}{user.nom?.[0]}
            </div>
          </div>
        </header>

        {/* Page content */}
        <div style={{ flex:1, padding:28, maxWidth:1400, width:'100%', margin:'0 auto', boxSizing:'border-box' }}>
          {children}
        </div>
      </main>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.6;transform:scale(1.3)} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: #0E1620; }
        ::-webkit-scrollbar-thumb { background: #1E2F42; border-radius: 2px; }
      `}</style>
    </div>
  );
}
