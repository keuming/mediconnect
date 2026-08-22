import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { V, hexToRgba } from '../theme';

const API = (process.env.REACT_APP_API_URL || 'https://mediconnect-backend-v2.vercel.app').replace(/\/+$/, '') + '/api';

const inputStyle = {
  width: '100%', background: V.input, border: `1.5px solid ${V.border}`, borderRadius: 12,
  padding: '13px 16px', color: V.text, fontSize: 15, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
};
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 700, color: V.muted, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 };

export default function Presence() {
  const { cliniqueId } = useParams();
  const navigate = useNavigate();

  const [clinique, setClinique] = useState(null);
  const [chargementClinique, setChargementClinique] = useState(true);
  const [etape, setEtape] = useState('choix'); // choix | recherche | inscription | resultat
  const [envoi, setEnvoi] = useState(false);

  // Recherche patient existant
  const [terme, setTerme] = useState('');
  const [resultats, setResultats] = useState([]);
  const [patientChoisi, setPatientChoisi] = useState(null);

  // Inscription nouveau patient
  const [form, setForm] = useState({ prenom: '', nom: '', telephone: '' });

  // Resultat final
  const [resultat, setResultat] = useState(null); // { rang, codeSecret }

  useEffect(() => {
    if (!cliniqueId) { setChargementClinique(false); return; }
    fetch(`${API}/public/cliniques/${cliniqueId}`)
      .then(r => r.json())
      .then(d => setClinique(d?.data || null))
      .catch(() => {})
      .finally(() => setChargementClinique(false));
  }, [cliniqueId]);

  const rechercher = useCallback((valeur) => {
    setTerme(valeur);
    setPatientChoisi(null);
    if (valeur.trim().length < 2) { setResultats([]); return; }
    fetch(`${API}/public/patients/recherche-nom?q=${encodeURIComponent(valeur.trim())}`)
      .then(r => r.json())
      .then(d => setResultats(d?.data || []))
      .catch(() => setResultats([]));
  }, []);

  const rejoindreAvecPatientExistant = async () => {
    if (!patientChoisi) { toast.error('Sélectionnez votre nom dans la liste'); return; }
    setEnvoi(true);
    try {
      const resp = await fetch(`${API}/public/file-attente/rejoindre`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinique_id: cliniqueId, patient_id: patientChoisi.id }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) throw new Error(data.message || 'Erreur');
      setResultat({ rang: data.data.rang, codeSecret: null });
      setEtape('resultat');
    } catch (e) {
      toast.error(e.message || "Impossible de rejoindre la file d'attente");
    } finally { setEnvoi(false); }
  };

  const rejoindreNouveauPatient = async () => {
    if (!form.prenom.trim() || !form.nom.trim()) { toast.error('Prénom et nom requis'); return; }
    setEnvoi(true);
    try {
      const resp = await fetch(`${API}/public/file-attente/rejoindre`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinique_id: cliniqueId, nouveau_patient: form }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) throw new Error(data.message || 'Erreur');
      setResultat({ rang: data.data.rang, codeSecret: data.code_secret || null });
      setEtape('resultat');
    } catch (e) {
      toast.error(e.message || "Impossible de rejoindre la file d'attente");
    } finally { setEnvoi(false); }
  };

  if (chargementClinique) {
    return (
      <div style={{ background: V.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: V.muted }}>
        Chargement…
      </div>
    );
  }

  return (
    <div style={{ background: V.bg, minHeight: '100vh', fontFamily: "'Plus Jakarta Sans', sans-serif", padding: '40px 5%' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>

        {/* En-tête clinique */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, background: `linear-gradient(135deg,${V.green},${V.teal})`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 16px' }}>🏥</div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, color: V.text, fontWeight: 400, marginBottom: 6 }}>
            {clinique?.nom || 'Bienvenue'}
          </h1>
          <p style={{ color: V.muted, fontSize: 14 }}>Prise de rang à l'accueil</p>
        </div>

        {/* Étape : choix */}
        {etape === 'choix' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <button onClick={() => setEtape('recherche')} style={{ background: V.input, border: `1.5px solid ${V.border}`, borderRadius: 14, padding: 20, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: V.text, marginBottom: 4 }}>✅ J'ai déjà un compte MediConnect</div>
              <div style={{ fontSize: 13, color: V.muted }}>Je recherche mon nom pour prendre mon rang</div>
            </button>
            <button onClick={() => setEtape('inscription')} style={{ background: `linear-gradient(135deg,${hexToRgba(V.green,.1)},${hexToRgba(V.teal,.1)})`, border: `1.5px solid ${hexToRgba(V.green,.3)}`, borderRadius: 14, padding: 20, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: V.text, marginBottom: 4 }}>🆕 Première visite dans cette clinique</div>
              <div style={{ fontSize: 13, color: V.muted }}>Je crée mon dossier et je prends mon rang</div>
            </button>
          </div>
        )}

        {/* Étape : recherche patient existant */}
        {etape === 'recherche' && (
          <div>
            <label style={labelStyle}>Votre nom</label>
            <input autoFocus value={terme} onChange={e => rechercher(e.target.value)} placeholder="Tapez votre nom et prénom" style={{ ...inputStyle, marginBottom: 10 }} />
            {resultats.length > 0 && (
              <div style={{ background: V.card, border: `1px solid ${V.border}`, borderRadius: 12, marginBottom: 14, overflow: 'hidden' }}>
                {resultats.map(p => (
                  <div key={p.id} onClick={() => { setPatientChoisi(p); setTerme(`${p.prenom} ${p.nom}`); setResultats([]); }}
                    style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: `1px solid ${V.hover}`, background: patientChoisi?.id === p.id ? hexToRgba(V.green, .08) : 'transparent' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: V.text }}>{p.prenom} {p.nom}</div>
                    {p.telephone && <div style={{ fontSize: 12, color: V.dim }}>{p.telephone}</div>}
                  </div>
                ))}
              </div>
            )}
            {patientChoisi && (
              <div style={{ background: hexToRgba(V.green, .08), border: `1px solid ${hexToRgba(V.green,.3)}`, borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 13, color: V.text }}>
                ✓ Sélectionné : <strong>{patientChoisi.prenom} {patientChoisi.nom}</strong>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setEtape('choix')} style={{ flex: 1, background: hexToRgba(V.text,.06), color: V.text, border: `1px solid ${hexToRgba(V.text,.1)}`, borderRadius: 12, padding: 13, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>← Retour</button>
              <button onClick={rejoindreAvecPatientExistant} disabled={!patientChoisi || envoi}
                style={{ flex: 2, background: `linear-gradient(135deg,${V.green},${V.teal})`, color: '#fff', border: 'none', borderRadius: 12, padding: 13, fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: (!patientChoisi||envoi)?.6:1 }}>
                {envoi ? 'Enregistrement…' : 'Prendre mon rang'}
              </button>
            </div>
          </div>
        )}

        {/* Étape : inscription nouveau patient */}
        {etape === 'inscription' && (
          <div>
            <label style={labelStyle}>Prénom *</label>
            <input value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))} placeholder="Votre prénom" style={{ ...inputStyle, marginBottom: 12 }} />
            <label style={labelStyle}>Nom *</label>
            <input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="Votre nom" style={{ ...inputStyle, marginBottom: 12 }} />
            <label style={labelStyle}>Téléphone</label>
            <input value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} placeholder="07 00 00 00 00" style={{ ...inputStyle, marginBottom: 20 }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setEtape('choix')} style={{ flex: 1, background: hexToRgba(V.text,.06), color: V.text, border: `1px solid ${hexToRgba(V.text,.1)}`, borderRadius: 12, padding: 13, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>← Retour</button>
              <button onClick={rejoindreNouveauPatient} disabled={envoi}
                style={{ flex: 2, background: `linear-gradient(135deg,${V.green},${V.teal})`, color: '#fff', border: 'none', borderRadius: 12, padding: 13, fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: envoi?.6:1 }}>
                {envoi ? 'Création…' : 'Créer mon dossier et prendre mon rang'}
              </button>
            </div>
          </div>
        )}

        {/* Étape : résultat */}
        {etape === 'resultat' && resultat && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 72, height: 72, background: `linear-gradient(135deg,${V.green},${V.teal})`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 20px', boxShadow: '0 16px 40px rgba(10,143,88,.4)' }}>✅</div>
            {resultat.codeSecret && (
              <div style={{ background: 'rgba(37,99,235,.08)', border: '2px solid rgba(37,99,235,.3)', borderRadius: 14, padding: '14px 20px', marginBottom: 20 }}>
                <div style={{ fontSize: 13, color: V.text, fontWeight: 700, marginBottom: 6 }}>🎉 Votre compte MediConnect a été créé avec succès !</div>
                <div style={{ fontSize: 11, color: V.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>Votre code secret patient</div>
                <div style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 900, color: '#2563EB', letterSpacing: 3 }}>{resultat.codeSecret}</div>
              </div>
            )}
            <div style={{ background: hexToRgba(V.green, .08), border: `2px solid ${hexToRgba(V.green, .3)}`, borderRadius: 16, padding: '24px 20px', marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: V.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>Votre rang aujourd'hui</div>
              <div style={{ fontSize: 56, fontWeight: 900, color: V.green, lineHeight: 1 }}>{resultat.rang}</div>
            </div>
            <p style={{ fontSize: 13, color: V.muted, lineHeight: 1.7 }}>
              Patientez dans la salle d'attente, votre nom sera appelé lorsque votre tour sera arrivé.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
