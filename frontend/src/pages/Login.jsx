import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '../context/authStore';

const DEMOS = [
  { role: 'patient',            label: 'Patient',        icon: '👤', email: 'patient@demo.ci' },
  { role: 'clinique',           label: 'Clinique',       icon: '🏥', email: 'clinique@demo.ci' },
  { role: 'medecin_independant',label: 'Méd. Conseil',   icon: '⭐', email: 'medecin.indep@demo.ci' },
  { role: 'pharmacie',          label: 'Pharmacie',      icon: '💊', email: 'pharmacie@demo.ci' },
  { role: 'livreur',            label: 'Livreur',        icon: '🛵', email: 'livreur@demo.ci' },
  { role: 'assureur',           label: 'Assureur',       icon: '🛡️', email: 'assureur@demo.ci' },
  { role: 'imagerie',           label: 'Imagerie',       icon: '🩻', email: 'imagerie@demo.ci' },
  { role: 'laboratoire',        label: 'Laboratoire',    icon: '🧪', email: 'laboratoire@demo.ci' },
  { role: 'optique',            label: 'Optique',        icon: '🔭', email: 'optique@demo.ci' },
  { role: 'dentaire',           label: 'Dentaire',       icon: '🦷', email: 'dentaire@demo.ci' },
  { role: 'ministere',          label: 'Ministère',      icon: '🏛️', email: 'ministere@sante.ci', pwd: 'MinistereCI2024' },
  { role: 'business_developer', label: 'Business Dev',   icon: '💼', email: 'bd@demo.ci' },
];

// Acces demo Admin — visible UNIQUEMENT sur admin.mediconnect4africa.cloud
const ADMIN_DEMO = { role: 'admin', label: 'Admin', icon: '⚙️', email: 'admin@demo.ci' };

const ROLE_ROUTES = {
  patient:             '/patient',
  clinique:            '/clinique',
  medecin_independant: '/medecin/independant',
  medecin_conseil:     '/medecin/independant',
  medecin_prive:       '/medecin/independant',
  pharmacie:           '/pharmacie',
  livreur:             '/livreur',
  admin:               '/admin',
  assureur:            '/assureur',
  imagerie:            '/imagerie',
  laboratoire:         '/laboratoire',
  ministere:           '/ministere',
  optique:             '/optique',
  dentaire:            '/dentaire',
  business_developer:  '/bd',
};

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [show, setShow]  = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 860 : false);
  const { login, loading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminHost = typeof window !== 'undefined' && window.location.hostname === 'admin.mediconnect4africa.cloud';
  const demosAffiches = isAdminHost ? [ADMIN_DEMO] : DEMOS;

  // Responsive : bascule en layout vertical (formulaire prioritaire) sur petits ecrans / PWA mobile
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 860);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Auto-login si token passe en URL depuis la vitrine
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlToken = params.get('token');
    if (urlToken) {
      try {
        const payload = JSON.parse(atob(urlToken.split('.')[1]));
        const user = { id: payload.id, role: payload.role, patient_id: payload.patient_id };
        useAuthStore.setState({ token: urlToken, user });
        const dest = ROLE_ROUTES[payload.role] || '/patient';
        navigate(dest, { replace: true });
      } catch(e) {
        console.error('Token URL invalide', e);
      }
    }
  }, []);

  const redirectAfterLogin = (user) => {
    const dest = ROLE_ROUTES[user?.role] || '/app';
    navigate(dest, { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await login(form.email, form.password);
    if (res.success) {
      toast.success('Connexion réussie !');
      redirectAfterLogin(res.user);
    } else {
      toast.error(res.message || 'Identifiants incorrects');
    }
  };

  const quickLogin = async (email, pwd) => {
    const res = await login(email, pwd || 'demo1234');
    if (res.success) {
      toast.success('Accès démo !');
      redirectAfterLogin(res.user);
    } else {
      toast.error(res.message);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#060C12',
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      overflowX: 'hidden',
    }}>
      {/* Panneau gauche — texte marketing */}
      <div style={{
        flex: isMobile ? 'none' : 1,
        order: isMobile ? 2 : 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: isMobile ? '32px 24px' : '60px',
        background: 'linear-gradient(135deg,#0A1628 0%,#0D1F30 100%)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: isMobile ? 20 : 40 }}>
          <div style={{ width: 48, height: 48, background: '#0A8F58', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800, color: '#fff' }}>+</div>
          <span style={{ fontSize: 24, fontWeight: 800, color: '#F0F4F8' }}>Medi<span style={{ color: '#0A8F58' }}>Connect</span></span>
        </div>
        <h1 style={{ fontSize: isMobile ? 24 : 36, fontWeight: 800, color: '#F0F4F8', lineHeight: 1.2, marginBottom: 16 }}>
          La santé numérique pour<br /><span style={{ color: '#0A8F58' }}>l'Afrique de l'Ouest</span>
        </h1>
        <p style={{ color: '#8BA0B5', fontSize: isMobile ? 14 : 16, marginBottom: isMobile ? 20 : 40 }}>
          RDV médicaux · Assurances tiers-payant · Ordonnances · Livraison GPS · 8 pays
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {["🇨🇮 Côte d'Ivoire",'🇸🇳 Sénégal','🇧🇫 Burkina Faso','🇬🇭 Ghana','🇲🇱 Mali','🇹🇬 Togo','🇧🇯 Bénin','🇬🇳 Guinée'].map(p => (
            <span key={p} style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 20, padding: '4px 12px', fontSize: 12, color: '#8BA0B5' }}>{p}</span>
          ))}
        </div>
      </div>

      {/* Formulaire */}
      <div style={{
        width: isMobile ? '100%' : 480,
        order: isMobile ? 1 : 2,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: isMobile ? '32px 20px' : '60px 48px',
        background: '#0E1620',
        boxSizing: 'border-box',
      }}>
        <h2 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, color: '#F0F4F8', marginBottom: 6 }}>{isAdminHost ? 'Administration 🔐' : 'Connexion 👋'}</h2>
        <p style={{ color: '#8BA0B5', marginBottom: 32, fontSize: 14 }}>Accédez à votre espace MediConnect</p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#8BA0B5', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>Email</label>
            <input
              type="email" required
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="votre@email.com"
              style={{ width: '100%', background: '#141E2B', border: '1.5px solid #1E2F42', borderRadius: 10, padding: '12px 14px', color: '#F0F4F8', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#8BA0B5', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>Mot de passe</label>
            <div style={{ position: 'relative' }}>
              <input
                type={show ? 'text' : 'password'} required
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                style={{ width: '100%', background: '#141E2B', border: '1.5px solid #1E2F42', borderRadius: 10, padding: '12px 44px 12px 14px', color: '#F0F4F8', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
              />
              <button type="button" onClick={() => setShow(!show)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#4E657A', cursor: 'pointer', fontSize: 16 }}>
                {show ? '🙈' : '👁'}
              </button>
            </div>
          </div>
          <button
            type="submit" disabled={loading}
            style={{ width: '100%', background: '#0A8F58', color: '#fff', border: 'none', borderRadius: 10, padding: '14px', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? .7 : 1, marginBottom: 20 }}
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <div style={{ borderTop: '1px solid #1E2F42', paddingTop: 20, marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#4E657A', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 12 }}>{isAdminHost ? 'Accès administration' : 'Accès démo rapide'}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(80px,1fr))', gap: 8 }}>
            {demosAffiches.map(d => (
              <button key={d.role} onClick={() => quickLogin(d.email, d.pwd)} disabled={loading}
                style={{ background: '#141E2B', border: '1.5px solid #1E2F42', borderRadius: 10, padding: '10px 8px', cursor: 'pointer', textAlign: 'center', transition: 'border-color .15s' }}
                onMouseOver={e => e.currentTarget.style.borderColor='#0A8F58'}
                onMouseOut={e => e.currentTarget.style.borderColor='#1E2F42'}
              >
                <div style={{ fontSize: 20, marginBottom: 2 }}>{d.icon}</div>
                <div style={{ fontSize: 11, color: '#F0F4F8', fontWeight: 600 }}>{d.label}</div>
              </button>
            ))}
          </div>
        </div>

        {!isAdminHost && (
          <p style={{ textAlign: 'center', fontSize: 13, color: '#8BA0B5' }}>
            Pas de compte ?{' '}
            <Link to="/register" style={{ color: '#0A8F58', fontWeight: 700, textDecoration: 'none' }}>
              Créer un compte
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
