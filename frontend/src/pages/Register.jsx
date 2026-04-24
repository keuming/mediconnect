import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '../context/authStore';

const ROLES = [
  { value: 'patient',   label: 'Patient',         icon: '👤', desc: 'Prendre des RDV, gérer mes ordonnances' },
  { value: 'clinique',  label: 'Clinique / Hôpital', icon: '🏥', desc: 'Gérer planning, EMR, facturation' },
  { value: 'pharmacie', label: 'Pharmacie',        icon: '💊', desc: 'Ordonnances, devis, livraisons' },
  { value: 'livreur',   label: 'Livreur',          icon: '🛵', desc: 'Gérer mes missions de livraison' },
  { value: 'assureur',  label: 'Assureur',         icon: '🛡️', desc: 'Traiter les dossiers tiers-payant' },
];

export default function Register() {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState('');
  const [form, setForm] = useState({ prenom: '', nom: '', email: '', telephone: '', ville: 'Abidjan', pays_code: 'CI', password: '', confirm: '' });
  const [extraForm, setExtra] = useState({ nom_etab: '', type_etab: 'Clinique', agrement: '', nom_ph: '', vehicule: 'Moto', nom_ass: '' });
  const [show, setShow] = useState(false);
  const { register, loading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (form.password !== form.confirm) { toast.error('Les mots de passe ne correspondent pas.'); return; }
    if (form.password.length < 8) { toast.error('Mot de passe minimum 8 caractères.'); return; }
    const payload = { ...form, role, ...extraForm };
    delete payload.confirm;
    const res = await register(payload);
    if (res.success) { toast.success('Compte créé avec succès ! Bienvenue 🎉'); navigate('/app'); }
    else toast.error(res.message);
  };

  const inp = (label, key, props = {}) => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#8BA0B5', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>{label}</label>
      <input value={form[key] || ''} onChange={e => setForm({ ...form, [key]: e.target.value })} {...props}
        style={{ width: '100%', background: '#141E2B', border: '1.5px solid #1E2F42', borderRadius: 9, padding: '10px 14px', color: '#F0F4F8', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#060C12', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 560, background: '#0E1620', borderRadius: 20, padding: 40, border: '1px solid #1E2F42' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div style={{ width: 40, height: 40, background: '#0A8F58', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: 20 }}>+</div>
          <span style={{ fontWeight: 800, fontSize: 18, color: '#F0F4F8' }}>Medi<span style={{ color: '#0A8F58' }}>Connect</span></span>
        </div>

        {/* Steps indicator */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
          {[1,2,3].map(s => (
            <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: step >= s ? '#0A8F58' : '#1E2F42', transition: 'background .3s' }} />
          ))}
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#F0F4F8', marginBottom: 4 }}>
          {step === 1 ? 'Choisissez votre profil' : step === 2 ? 'Vos informations' : 'Finaliser le compte'}
        </h2>
        <p style={{ color: '#8BA0B5', fontSize: 13, marginBottom: 24 }}>Étape {step} / 3</p>

        {/* STEP 1 : Choix du rôle */}
        {step === 1 && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {ROLES.map(r => (
                <div key={r.value} onClick={() => setRole(r.value)}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 12, border: `2px solid ${role === r.value ? '#0A8F58' : '#1E2F42'}`, background: role === r.value ? 'rgba(10,143,88,.08)' : '#141E2B', cursor: 'pointer', transition: 'all .15s' }}>
                  <span style={{ fontSize: 24 }}>{r.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, color: '#F0F4F8', fontSize: 14 }}>{r.label}</div>
                    <div style={{ fontSize: 12, color: '#8BA0B5', marginTop: 2 }}>{r.desc}</div>
                  </div>
                  {role === r.value && <span style={{ marginLeft: 'auto', color: '#0A8F58', fontWeight: 700 }}>✓</span>}
                </div>
              ))}
            </div>
            <button disabled={!role} onClick={() => setStep(2)} style={{ width: '100%', background: role ? '#0A8F58' : '#1E2F42', color: '#fff', border: 'none', borderRadius: 10, padding: 14, fontSize: 14, fontWeight: 700, cursor: role ? 'pointer' : 'not-allowed' }}>
              Continuer →
            </button>
          </>
        )}

        {/* STEP 2 : Infos générales */}
        {step === 2 && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>{inp('Prénom *', 'prenom', { placeholder: 'Konan', required: true })}</div>
              <div>{inp('Nom *', 'nom', { placeholder: 'Jean', required: true })}</div>
            </div>
            {inp('Email *', 'email', { type: 'email', placeholder: 'votre@email.com', required: true })}
            {inp('Téléphone', 'telephone', { type: 'tel', placeholder: '+225 07 00 00 00 00' })}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#8BA0B5', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>Pays</label>
                <select value={form.pays_code} onChange={e => setForm({ ...form, pays_code: e.target.value })} style={{ width: '100%', background: '#141E2B', border: '1.5px solid #1E2F42', borderRadius: 9, padding: '10px 14px', color: '#F0F4F8', fontSize: 13, outline: 'none' }}>
                  {[['CI','🇨🇮 Côte d\'Ivoire'],['SN','🇸🇳 Sénégal'],['BF','🇧🇫 Burkina Faso'],['GH','🇬🇭 Ghana'],['ML','🇲🇱 Mali'],['TG','🇹🇬 Togo'],['BJ','🇧🇯 Bénin'],['GN','🇬🇳 Guinée']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>{inp('Ville', 'ville', { placeholder: 'Abidjan' })}</div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button onClick={() => setStep(1)} style={{ flex: 1, background: 'transparent', border: '1.5px solid #1E2F42', borderRadius: 10, padding: 12, color: '#8BA0B5', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>← Retour</button>
              <button onClick={() => { if (!form.prenom || !form.nom || !form.email) { toast.error('Prénom, nom et email obligatoires.'); return; } setStep(3); }} style={{ flex: 2, background: '#0A8F58', border: 'none', borderRadius: 10, padding: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Continuer →</button>
            </div>
          </>
        )}

        {/* STEP 3 : Spécifique rôle + mot de passe */}
        {step === 3 && (
          <>
            {role === 'clinique' && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#8BA0B5', textTransform: 'uppercase', marginBottom: 10 }}>🏥 Informations de l'établissement</div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#8BA0B5', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>Nom de l'établissement *</label>
                  <input value={extraForm.nom_etab} onChange={e => setExtra({ ...extraForm, nom_etab: e.target.value })} placeholder="Ex: Polyclinique du Sud" style={{ width: '100%', background: '#141E2B', border: '1.5px solid #1E2F42', borderRadius: 9, padding: '10px 14px', color: '#F0F4F8', fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 14 }} />
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#8BA0B5', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>N° Agrément Santé</label>
                  <input value={extraForm.agrement} onChange={e => setExtra({ ...extraForm, agrement: e.target.value })} placeholder="AGR-2024-XXXXX" style={{ width: '100%', background: '#141E2B', border: '1.5px solid #1E2F42', borderRadius: 9, padding: '10px 14px', color: '#F0F4F8', fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 14 }} />
                </div>
              </>
            )}
            {role === 'pharmacie' && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#8BA0B5', textTransform: 'uppercase', marginBottom: 10 }}>💊 Informations de la pharmacie</div>
                <input value={extraForm.nom_ph} onChange={e => setExtra({ ...extraForm, nom_ph: e.target.value })} placeholder="Nom de la pharmacie *" style={{ width: '100%', background: '#141E2B', border: '1.5px solid #1E2F42', borderRadius: 9, padding: '10px 14px', color: '#F0F4F8', fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 14 }} />
              </>
            )}
            <div style={{ fontSize: 11, fontWeight: 700, color: '#8BA0B5', textTransform: 'uppercase', marginBottom: 10 }}>🔒 Sécurité</div>
            <div style={{ position: 'relative', marginBottom: 14 }}>
              <input type={show ? 'text' : 'password'} placeholder="Mot de passe (min. 8 caractères)" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} style={{ width: '100%', background: '#141E2B', border: '1.5px solid #1E2F42', borderRadius: 9, padding: '10px 44px 10px 14px', color: '#F0F4F8', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              <button type="button" onClick={() => setShow(!show)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#4E657A', cursor: 'pointer' }}>{show ? '🙈' : '👁'}</button>
            </div>
            <input type="password" placeholder="Confirmer le mot de passe" value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} style={{ width: '100%', background: '#141E2B', border: '1.5px solid #1E2F42', borderRadius: 9, padding: '10px 14px', color: '#F0F4F8', fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 20 }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(2)} style={{ flex: 1, background: 'transparent', border: '1.5px solid #1E2F42', borderRadius: 10, padding: 12, color: '#8BA0B5', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>← Retour</button>
              <button onClick={handleSubmit} disabled={loading} style={{ flex: 2, background: '#0A8F58', border: 'none', borderRadius: 10, padding: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? .7 : 1 }}>
                {loading ? 'Création…' : '✓ Créer mon compte'}
              </button>
            </div>
          </>
        )}

        <p style={{ textAlign: 'center', fontSize: 13, color: '#8BA0B5', marginTop: 20 }}>
          Déjà un compte ? <Link to="/login" style={{ color: '#0A8F58', fontWeight: 700, textDecoration: 'none' }}>Se connecter</Link>
        </p>
      </div>
    </div>
  );
}
