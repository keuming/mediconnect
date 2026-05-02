import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '../../context/authStore';

const NAVS = {
  patient:   [
    { path: '/patient',                 icon: '📊', label: 'Dashboard' },
    { path: '/patient/rdv',             icon: '📅', label: 'Mes RDV' },
    { path: '/patient/ordonnances',     icon: '💊', label: 'Ordonnances' },
    { path: '/patient/bulletins',       icon: '🔬', label: 'Bulletins médicaux', badge: 'NEW' },
    { path: '/patient/medecins-prives', icon: '👨‍⚕️', label: 'Médecins Privés', badge: 'NEW' },
    { path: '/patient/commandes',       icon: '🛵', label: 'Commandes' },
    { path: '/patient/assurance',       icon: '🛡️', label: 'Assurance' },
    { path: '/patient/dossier',         icon: '📋', label: 'Mon dossier' },
    { path: '/patient/facturation',     icon: '🧾', label: 'Mes Factures' },
  ],
  clinique:  [
    { path: '/clinique',                  icon: '📊', label: 'Dashboard' },
    { path: '/clinique/planning',         icon: '📅', label: 'Planning & RDV' },
    { path: '/clinique/emr',              icon: '👤', label: 'Dossiers patients' },
    { path: '/clinique/bulletins',        icon: '🔬', label: 'Bulletins médicaux', badge: 'NEW' },
    { path: '/clinique/consultation',     icon: '🩺', label: 'Consultation', badge: 'NEW' },
    { path: '/clinique/caisse',           icon: '💰', label: 'Caisse', badge: 'NEW' },
    { path: '/clinique/facturation',      icon: '🧾', label: 'Facturation' },
    { path: '/clinique/medecins',         icon: '👨‍⚕️', label: 'Médecins & RH' },
    { path: '/clinique/stock',            icon: '💊', label: 'Stock' },
    { path: '/clinique/assurance',        icon: '🛡️', label: 'Assurances v2' },
    { path: '/clinique/dossiers-ass',     icon: '📁', label: 'Dossiers ass.' },
    { path: '/clinique/stats',            icon: '📈', label: 'Statistiques' },
    { path: '/clinique/abonnement',       icon: '💳', label: 'Mon Abonnement' },
  ],
  pharmacie: [
    { path: '/pharmacie',             icon: '📊', label: 'Dashboard' },
    { path: '/pharmacie/ordonnances', icon: '📋', label: 'Ordonnances' },
    { path: '/pharmacie/commandes',   icon: '📦', label: 'Commandes' },
    { path: '/pharmacie/stock',       icon: '💊', label: 'Stock' },
    { path: '/pharmacie/stats',       icon: '📈', label: 'Statistiques' },
    { path: '/pharmacie/abonnement',  icon: '💳', label: 'Mon Abonnement' },
  ],
  livreur:   [
    { path: '/livreur',              icon: '📊', label: 'Dashboard' },
    { path: '/livreur/missions',     icon: '🗂️', label: 'Missions' },
    { path: '/livreur/en-cours',     icon: '🛵', label: 'En cours' },
    { path: '/livreur/historique',   icon: '📜', label: 'Historique' },
    { path: '/livreur/gains',        icon: '💵', label: 'Gains' },
    { path: '/livreur/abonnement',   icon: '💳', label: 'Mon Abonnement' },
  ],
  imagerie:  [
    { path: '/imagerie',             icon: '📊', label: 'Dashboard' },
    { path: '/imagerie/bulletins',   icon: '🩻', label: 'Bulletins reçus' },
    { path: '/imagerie/rapports',    icon: '📄', label: 'Mes rapports' },
    { path: '/imagerie/patients',    icon: '👤', label: 'Patients' },
    { path: '/imagerie/abonnement',  icon: '💳', label: 'Mon Abonnement' },
  ],
  laboratoire: [
    { path: '/laboratoire',             icon: '📊', label: 'Dashboard' },
    { path: '/laboratoire/bulletins',   icon: '🔬', label: 'Bulletins reçus' },
    { path: '/laboratoire/analyses',    icon: '🧪', label: 'Mes analyses' },
    { path: '/laboratoire/patients',    icon: '👤', label: 'Patients' },
    { path: '/laboratoire/abonnement',  icon: '💳', label: 'Mon Abonnement' },
  ],
  medecin_prive: [
    { path: '/medecin-prive',            icon: '📊', label: 'Dashboard' },
    { path: '/medecin-prive/demandes',   icon: '📋', label: 'Demandes patients', badge: 'NEW' },
    { path: '/medecin-prive/patients',   icon: '👥', label: 'Mes patients' },
    { path: '/medecin-prive/abonnement', icon: '💳', label: 'Mon Abonnement' },
  ],
  admin:     [
    { path: '/admin',                    icon: '📊', label: 'Dashboard' },
    { path: '/admin/etablissements',     icon: '🏥', label: 'Établissements' },
    { path: '/admin/assureurs',          icon: '🛡️', label: 'Assureurs API' },
    { path: '/admin/patients',           icon: '👤', label: 'Patients' },
    { path: '/admin/livreurs',           icon: '🛵', label: 'Livreurs' },
    { path: '/admin/rdv-patients',       icon: '📅', label: 'Gestion RDV' },
    { path: '/admin/medecins-prives',    icon: '👨‍⚕️', label: 'Médecins Privés', badge: 'NEW' },
    { path: '/admin/facturation',        icon: '💳', label: 'Facturation', badge: 'NEW' },
    { path: '/admin/rapports',           icon: '📈', label: 'Rapports' },
  ],
  assureur:  [
    { path: '/assureur',              icon: '📊', label: 'Dashboard' },
    { path: '/assureur/dossiers',     icon: '📁', label: 'Dossiers' },
    { path: '/assureur/conventions',  icon: '🤝', label: 'Conventions' },
    { path: '/assureur/stats',        icon: '📈', label: 'Statistiques' },
    { path: '/assureur/abonnement',   icon: '💳', label: 'Mon Abonnement' },
  ],
};

const ROLE_LABELS = {
  patient: 'Espace Patient', clinique: 'Espace Clinique',
  pharmacie: 'Espace Pharmacie', livreur: 'Espace Livreur',
  admin: 'Administration', assureur: 'Espace Assureur',
  imagerie: 'Espace Imagerie', laboratoire: 'Espace Laboratoire',
  medecin_prive: 'Médecin Indépendant',
};

export default function AppLayout({ role, children }) {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate  = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    if (window.confirm('Se déconnecter de MediConnect ?')) {
      logout();
      toast.success('Déconnexion réussie');
      navigate('/login');
    }
  };

  const navItems = NAVS[role] || [];
  const initials = user ? (user.prenom?.[0] || '') + (user.nom?.[0] || '') : '?';

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#060C12', fontFamily: "'Sora', sans-serif" }}>

      {/* Sidebar */}
      <aside style={{
        width: 240, flexShrink: 0, background: '#0E1620', borderRight: '1px solid #1E2F42',
        display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto',
        position: 'relative', zIndex: 100,
        transform: sidebarOpen || window.innerWidth > 768 ? 'none' : 'translateX(-100%)',
        transition: 'transform .25s ease',
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 16px', borderBottom: '1px solid #1E2F42', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, background: '#0A8F58', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: 18 }}>+</div>
          <span style={{ fontWeight: 800, fontSize: 16, color: '#F0F4F8' }}>Medi<span style={{ color: '#0A8F58' }}>Connect</span></span>
        </div>

        {/* Rôle label */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid #1E2F42' }}>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: '#4E657A' }}>
            {ROLE_LABELS[role]}
          </span>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>
          {navItems.map(item => {
            const active = location.pathname === item.path || (item.path !== '/'+role && location.pathname.startsWith(item.path));
            return (
              <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
                  color: active ? '#0A8F58' : '#8BA0B5', textDecoration: 'none', fontSize: 13, fontWeight: active ? 700 : 400,
                  background: active ? 'rgba(10,143,88,.1)' : 'transparent',
                  borderLeft: active ? '3px solid #0A8F58' : '3px solid transparent',
                  transition: 'all .15s', borderRadius: '0 8px 8px 0', marginRight: 8,
                }}
                onMouseOver={e => { if (!active) e.currentTarget.style.background='rgba(255,255,255,.04)'; }}
                onMouseOut={e => { if (!active) e.currentTarget.style.background='transparent'; }}
              >
                <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge && (
                  <span style={{ background: item.badge === 'NEW' ? '#0A8F58' : '#E11D48', color: '#fff', fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '.3px' }}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User info + logout */}
        <div style={{ padding: 16, borderTop: '1px solid #1E2F42' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 36, height: 36, background: '#0A8F58', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: 13 }}>{initials.toUpperCase()}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#F0F4F8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.prenom} {user?.nom}
              </div>
              <div style={{ fontSize: 11, color: '#4E657A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
            </div>
          </div>
          <button onClick={handleLogout} style={{ width: '100%', background: 'rgba(225,29,72,.1)', border: '1px solid rgba(225,29,72,.2)', borderRadius: 8, padding: '8px', color: '#E11D48', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            ← Se déconnecter
          </button>
        </div>
      </aside>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 99 }} />
      )}

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <header style={{ height: 56, background: '#0E1620', borderBottom: '1px solid #1E2F42', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16, flexShrink: 0 }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'none', border: 'none', color: '#8BA0B5', cursor: 'pointer', fontSize: 20, display: window.innerWidth > 768 ? 'none' : 'block' }}>☰</button>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 12, color: '#4E657A' }}>{new Date().toLocaleDateString('fr-CI', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px', background: '#060C12' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
