import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '../../context/authStore';
import useThemeStore from '../../context/themeStore';

/* TAILLES_POLICE_AUGMENTEES_30_POURCENT */
const PALETTE_DARK = {
  green:"#0A8F58", teal:"#0D9488", amber:"#D97706", red:"#E11D48",
  blue:"#2563EB", purple:"#7C3AED", bg:"#060C12", card:"#0E1620",
  border:"#1E2F42", text:"#F0F4F8", muted:"#8BA0B5", dim:"#4E657A",
};
const PALETTE_LIGHT = {
  green:"#0A8F58", teal:"#0D9488", amber:"#B45309", red:"#DC2626",
  blue:"#2563EB", purple:"#7C3AED", bg:"#F5F7FA", card:"#FFFFFF",
  // Texte assombri de 15%, meme correctif que clinique/Dashboard.jsx.
  border:"#DCE3EA", text:"#0E1720", muted:"#4D5B68", dim:"#75808B",
};
// eslint-disable-next-line prefer-const
let C = { ...PALETTE_DARK };

// ── Navigation par rôle ───────────────────────────────────────────
const NAV = {
  patient: [
    { path:'/patient',                 icon:'🏠', label:'Accueil' },
    { path:'/patient/rdvs',            icon:'📅', label:'Mes RDV' },
    { path:'/patient/dossier',         icon:'📋', label:'Mon dossier' },
    { path:'/patient/ordonnances',     icon:'💊', label:'Ordonnances' },
    { path:'/patient/pharmacie',        icon:'🏪', label:'Pharmacie', badge:'NEW' },
    { path:'/patient/livraison',        icon:'🛵', label:'Mes livraisons', badge:'NEW' },
    { path:'/patient/consultations',   icon:'🩺', label:'Consultations' },
    { path:'/patient/factures',        icon:'🧾', label:'Mes factures' },
    { path:'/patient/commandes',       icon:'🛵', label:'Commander médicaments', badge:'NEW' },
    { path:'/patient/medecins-prives', icon:'⭐', label:'Médecins privés' },
    { path:'/patient/recherche',       icon:'🔍', label:'Trouver un médecin' },
    { path:'/patient/feedback',        icon:'💬', label:'Feedback' },
    { path:'/patient/card',            icon:'💳', label:'MediConnect Card', badge:'NEW' },
  ],
  clinique: [
    { path:'/clinique',              icon:'📊', label:'Dashboard' },
    { path:'/clinique/planning',     icon:'📅', label:'Planning & RDV' },
    { path:'/clinique/dossiers',     icon:'👤', label:'Dossiers patients' },
    { path:'/clinique/consultation', icon:'🩺', label:'Consultation',   badge:'NEW' },
    { path:'/clinique/caisse',       icon:'💰', label:'Caisse',         badge:'NEW' },
    { path:'/clinique/facturation',  icon:'📄', label:'Facturation' },
    { path:'/clinique/specialites',  icon:'🩺', label:'Spécialités',    badge:'NEW' },
    { path:'/clinique/medecins',     icon:'👨‍⚕️', label:'Médecins & RH' },
    { path:'/clinique/stock',        icon:'💊', label:'Stock' },
    { path:'/clinique/assurance',    icon:'🛡️', label:'Assurances' },
    { path:'/clinique/dossiers-ass', icon:'📋', label:'Dossiers assurance' },
    { path:'/clinique/stats',        icon:'📈', label:'Statistiques' },
    { path:'/clinique/resultats-examens', icon:'🔬', label:'Résultats d\'examens' },
  ],
  pharmacie: [
    { path:'/pharmacie',            icon:'📊', label:'Dashboard' },
    { path:'/pharmacie/stock',      icon:'💊', label:'Stock' },
    { path:'/pharmacie/commandes',  icon:'📦', label:'Commandes' },
    { path:'/pharmacie/ordonnances',icon:'📄', label:'Ordonnances' },
    { path:'/pharmacie/livraison',   icon:'🚚', label:'Livraisons', badge:'NEW' },
    { path:'/pharmacie/administration', icon:'👤', label:'Administration' },
  ],
  livreur: [
    { path:'/livreur/missions',  icon:'🛵', label:'Missions', badge:'NEW' },
    { path:'/livreur',              icon:'📊', label:'Dashboard' },
    { path:'/livreur/missions',     icon:'📦', label:'Missions' },
    { path:'/livreur/en-cours',     icon:'🛵', label:'En cours' },
    { path:'/livreur/historique',   icon:'📋', label:'Historique' },
    { path:'/livreur/gains',        icon:'💰', label:'Gains' },
  ],
  admin: [
    { path:'/admin',                         icon:'📊', label:'Dashboard' },
    { path:'/admin/monetisation',            icon:'💰', label:'Monétisation' },
    { path:'/admin/utilisateurs',            icon:'👥', label:'Utilisateurs' },
    { path:'/admin/cliniques',               icon:'🏥', label:'Cliniques' },
    { path:'/admin/medecins',                icon:'🩺', label:'Médecins' },
    { path:'/admin/medecins-independants',   icon:'⭐', label:'Médecins indép.',      badge:'NEW' },
    { path:'/admin/compagnies-assurance',    icon:'🛡️', label:'Cies assurance',       badge:'NEW' },
    { path:'/admin/factures',                icon:'💸', label:'Factures',             badge:'NEW' },
    { path:'/admin/caisse',                  icon:'🏦', label:'Caisse',               badge:'NEW' },
    { path:'/admin/paiements',               icon:'💳', label:'Paiements reçus',      badge:'NEW' },
    { path:'/admin/livreurs',                icon:'🛵', label:'Livreurs' },
    { path:'/admin/assurances',              icon:'📁', label:'Assurances (DME)' },
    { path:'/admin/statistiques',            icon:'📊', label:'Statistiques' },
    { path:'/admin/configuration',           icon:'⚙️', label:'Configuration' },
    { path:'/admin/ministere',               icon:'🏛️', label:'Ministère Santé',      badge:'NEW' },
    { path:'/admin/mediconnect-card',        icon:'💳', label:'MediConnect Card',     badge:'NEW' },
  ],
  ministere: [
    { path:'/ministere',              icon:'🏛️', label:"Vue d'ensemble" },
    { path:'/ministere/pathologies',  icon:'🦠', label:'Morbidité' },
    { path:'/ministere/medicaments',  icon:'💊', label:'Médicaments' },
    { path:'/ministere/demographics', icon:'👥', label:'Démographie' },
    { path:'/ministere/geo',          icon:'🗺️', label:'Géographie' },
  ],
  // ── ASSUREUR — mis à jour v3.1.0 ─────────────────────────────
  assureur: [
    { path:'/assureur',              icon:'📊', label:'Dashboard' },
    { path:'/assureur/facturation',  icon:'💰', label:'Facturation',      badge:'LIVE' },
    { path:'/assureur/offres',       icon:'📋', label:'Mes offres',       badge:'NEW' },
    { path:'/assureur/tiers-payant', icon:'🏥', label:'Tiers-Payant',     badge:'NEW' },
    { path:'/assureur/souscriptions',icon:'👥', label:'Souscriptions',    badge:'NEW' },
    { path:'/assureur/stats',        icon:'📈', label:'Statistiques' },
    { path:'/assureur/administration', icon:'👤', label:'Administration' },
  ],
  // ── BUSINESS DEVELOPER — nouveau rôle v3.1.0 ─────────────────
  business_developer: [
    { path:'/bd',              icon:'📊', label:'Dashboard' },
    { path:'/bd/reseau',       icon:'🏢', label:'Mon réseau' },
    { path:'/bd/commissions',  icon:'💸', label:'Commissions' },
    { path:'/bd/notifications',icon:'🔔', label:'Notifications' },
  ],
  medecin_independant: [
    { path:'/medecin/independant',               icon:'🏠', label:'Tableau de bord' },
    { path:'/medecin/independant/rdvs',          icon:'📅', label:'Mes RDV patients', badge:'NEW' },
    { path:'/medecin/independant/planning',      icon:'🗓️', label:'Mon planning' },
    { path:'/medecin/independant/patients',      icon:'👤', label:'Mes patients' },
    { path:'/medecin/independant/facturation',   icon:'💰', label:'Facturation' },
    { path:'/medecin/independant/consultations', icon:'🩺', label:'Consultations' },
    { path:'/medecin/independant/ordonnances',   icon:'💊', label:'Ordonnances' },
    { path:'/medecin/independant/stats',         icon:'📊', label:'Statistiques' },
  ],
  imagerie: [
    { path:'/imagerie',           icon:'🩻', label:'Tableau de bord' },
    { path:'/imagerie/bulletins', icon:'📥', label:'Bulletins reçus' },
    { path:'/imagerie/rapports',  icon:'📤', label:'Envoyer rapport' },
    { path:'/imagerie/administration', icon:'👤', label:'Administration' },
  ],
  laboratoire: [
    { path:'/laboratoire',            icon:'🧪', label:'Tableau de bord' },
    { path:'/laboratoire/bulletins',  icon:'📥', label:'Demandes reçues' },
    { path:'/laboratoire/analyses',   icon:'📤', label:'Envoyer résultats' },
    { path:'/laboratoire/administration', icon:'👤', label:'Administration' },
  ],
};

const ROLE_LABELS = {
  patient:            'Espace Patient',
  clinique:           'Espace Clinique',
  medecin:            'Espace Médecin',
  medecin_independant:'Médecin Conseil',
  pharmacie:          'Espace Pharmacie',
  livreur:            'Espace Livreur',
  admin:              'Administration',
  assureur:           'Espace Assureur',
  imagerie:           'Imagerie Médicale',
  laboratoire:        'Laboratoire',
  ministere:          'Ministère Santé',
  business_developer: 'Business Developer',
};

const ROLE_COLORS = {
  patient:            C.teal,
  clinique:           C.green,
  pharmacie:          '#0891B2',
  livreur:            '#D97706',
  admin:              C.green,
  assureur:           '#2563EB',
  imagerie:           '#0891B2',
  laboratoire:        '#0D9488',
  ministere:          '#7C3AED',
  medecin_independant:'#7C3AED',
  business_developer: '#7C3AED',
};

export default function AppLayout({ children }) {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const nav = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const mode = useThemeStore(s => s.mode);
  const toggleTheme = useThemeStore(s => s.toggleTheme);
  Object.assign(C, mode === 'light' ? PALETTE_LIGHT : PALETTE_DARK);

  if (!user) return null;

  const role      = user.role || 'patient';
  // Filtrage du menu clinique par sous_role du personnel. sous_role absent
  // = compte historique/proprietaire = menu complet, comportement inchange
  // pour tous les autres roles systeme (labo, imagerie, patient...).
  const VISIBILITE_SOUS_ROLE = {
    bureau_entrees: ['/clinique', '/clinique/planning', '/clinique/dossiers', '/clinique/caisse', '/clinique/facturation', '/clinique/specialites', '/clinique/stock', '/clinique/resultats-examens'],
    medecin:        ['/clinique', '/clinique/planning', '/clinique/dossiers', '/clinique/consultation', '/clinique/specialites', '/clinique/medecins', '/clinique/stock', '/clinique/stats', '/clinique/resultats-examens'],
    finance:        ['/clinique', '/clinique/caisse', '/clinique/facturation', '/clinique/assurance', '/clinique/dossiers-ass', '/clinique/stats'],
    rh:             ['/clinique', '/clinique/medecins'],
  };
  const navItemsBrutes = NAV[role] || [];
  const navItems = (role === 'clinique' && user.sous_role && VISIBILITE_SOUS_ROLE[user.sous_role])
    ? navItemsBrutes.filter(item => VISIBILITE_SOUS_ROLE[user.sous_role].includes(item.path))
    : navItemsBrutes;
  const roleColor = ROLE_COLORS[role] || C.green;

  const handleLogout = () => { logout(); nav('/login'); };

  return (
    <div style={{ display:'flex',minHeight:'100vh',background:C.bg,fontFamily:"'Plus Jakarta Sans', -apple-system, sans-serif" }}>

      {/* ── SIDEBAR ─────────────────────────────────────────────── */}
      <aside style={{
        width: sidebarOpen ? 224 : 68,
        background: C.card,
        borderRight: `1px solid ${C.border}`,
        display: 'flex', flexDirection: 'column',
        transition: 'width .25s ease',
        position: 'fixed', top:0, left:0, bottom:0,
        zIndex: 50, overflowX: 'hidden',
      }}>
        {/* Logo */}
        <div style={{ padding:'20px 16px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:10 }}>
          <div style={{ width:36,height:36,background:`linear-gradient(135deg,${roleColor},${C.teal})`,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,color:'#fff',fontSize:23,flexShrink:0 }}>+</div>
          {sidebarOpen&&(
            <div>
              <div style={{ fontFamily:"'DM Serif Display', serif",fontSize:20,color:C.text,fontWeight:400,lineHeight:1.2 }}>Medi<span style={{ color:roleColor }}>Connect</span></div>
              <div style={{ fontSize:12,color:C.dim,fontWeight:700,textTransform:'uppercase',letterSpacing:'.5px' }}>{ROLE_LABELS[role]}</div>
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav style={{ flex:1,padding:'12px 8px',overflowY:'auto' }}>
          <div style={{ fontSize:12,fontWeight:700,color:C.dim,textTransform:'uppercase',letterSpacing:'.5px',padding:'4px 8px 8px',display:sidebarOpen?'block':'none' }}>
            {ROLE_LABELS[role]}
          </div>
          {navItems.map(item => {
            const isActive = location.pathname === item.path || (item.path !== `/${role}` && item.path !== '/bd' && location.pathname.startsWith(item.path));
            return (
              <Link key={item.path} to={item.path}
                style={{
                  display:'flex',alignItems:'center',gap:10,padding:'10px 10px',
                  borderRadius:10,marginBottom:2,textDecoration:'none',
                  background: isActive ? `rgba(10,143,88,.15)` : 'transparent',
                  border: `1px solid ${isActive ? 'rgba(10,143,88,.3)' : 'transparent'}`,
                  transition:'all .15s',
                }}
                onMouseOver={e=>{ if(!isActive) e.currentTarget.style.background='rgba(255,255,255,.05)'; }}
                onMouseOut={e =>{ if(!isActive) e.currentTarget.style.background='transparent'; }}>
                <span style={{ fontSize:21,flexShrink:0 }}>{item.icon}</span>
                {sidebarOpen&&(
                  <>
                    <span style={{ fontSize:17,fontWeight:isActive?700:500,color:isActive?roleColor:C.muted,flex:1 }}>{item.label}</span>
                    {item.badge&&<span style={{ background:roleColor,color:'#fff',fontSize:12,fontWeight:800,padding:'2px 6px',borderRadius:8 }}>{item.badge}</span>}
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User info + logout */}
        <div style={{ padding:'12px 8px',borderTop:`1px solid ${C.border}` }}>
          <div style={{ display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:10,marginBottom:6 }}>
            <div style={{ width:32,height:32,borderRadius:'50%',background:`linear-gradient(135deg,${roleColor},${C.teal})`,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,color:'#fff',fontSize:16,flexShrink:0 }}>
              {user.prenom?.[0]}{user.nom?.[0]}
            </div>
            {sidebarOpen&&(
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:16,fontWeight:700,color:C.text,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{user.prenom} {user.nom}</div>
                <div style={{ fontSize:13,color:C.dim,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{user.email}</div>
              </div>
            )}
          </div>
          <button onClick={handleLogout}
            style={{ display:'flex',alignItems:'center',gap:8,width:'100%',padding:'8px 10px',background:'rgba(225,29,72,.08)',border:'1px solid rgba(225,29,72,.2)',borderRadius:10,color:'#E11D48',fontSize:16,fontWeight:700,cursor:'pointer',fontFamily:'inherit' }}>
            <span>←</span>
            {sidebarOpen&&'Se déconnecter'}
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ────────────────────────────────────────── */}
      <main style={{ flex:1,marginLeft:sidebarOpen?224:68,transition:'margin-left .25s ease',display:'flex',flexDirection:'column',minHeight:'100vh' }}>

        {/* Topbar */}
        <header style={{ background:C.card,borderBottom:`1px solid ${C.border}`,padding:'0 24px',height:60,display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:40 }}>
          <div style={{ display:'flex',alignItems:'center',gap:16 }}>
            <button onClick={()=>setSidebarOpen(o=>!o)}
              style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:'6px 10px',cursor:'pointer',fontSize:18,color:C.muted }}>
              {sidebarOpen?'←':'→'}
            </button>
            <div style={{ fontSize:16,color:C.dim }}>
              {new Date().toLocaleDateString('fr-CI',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
            </div>
          </div>

          <div style={{ display:'flex',alignItems:'center',gap:12 }}>
            <button onClick={toggleTheme} title={mode==='dark'?'Passer au thème clair':'Passer au thème sombre'}
              style={{ display:'flex',alignItems:'center',gap:6,background:mode==='light'?'#F0F3F6':'rgba(255,255,255,.06)',border:`1px solid ${C.border}`,borderRadius:20,padding:'6px 12px',cursor:'pointer',fontSize:16,fontWeight:700,color:C.muted,fontFamily:'inherit' }}>
              <span>{mode==='dark'?'🌙':'☀️'}</span>
              {mode==='dark'?'Sombre':'Clair'}
            </button>
            {role==='medecin'&&(
              <div style={{ display:'flex',alignItems:'center',gap:6,background:'rgba(124,58,237,.1)',border:'1px solid rgba(124,58,237,.3)',borderRadius:8,padding:'5px 12px',fontSize:14,color:'#7C3AED',fontWeight:700 }}>
                <span style={{ width:6,height:6,background:'#7C3AED',borderRadius:'50%',animation:'pulse 2s infinite' }}/>
                Planning synchronisé
              </div>
            )}
            {role==='business_developer'&&(
              <div style={{ display:'flex',alignItems:'center',gap:6,background:'rgba(124,58,237,.1)',border:'1px solid rgba(124,58,237,.3)',borderRadius:8,padding:'5px 12px',fontSize:14,color:'#7C3AED',fontWeight:700 }}>
                💼 Business Developer
              </div>
            )}
            <div style={{ fontSize:17,color:C.muted }}>{user.prenom} {user.nom}</div>
            <div style={{ width:32,height:32,borderRadius:'50%',background:`linear-gradient(135deg,${roleColor},${C.teal})`,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,color:'#fff',fontSize:16 }}>
              {user.prenom?.[0]}{user.nom?.[0]}
            </div>
          </div>
        </header>

        {/* Page content */}
        <div key={mode} style={{ flex:1,padding:28,maxWidth:1400,width:'100%',margin:'0 auto',boxSizing:'border-box' }}>
          {children}
        </div>
      </main>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.6;transform:scale(1.3)} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: ${C.card}; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 2px; }
      `}</style>
    </div>
  );
}
