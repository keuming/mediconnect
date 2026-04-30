import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const fmt = (n) => Number(n || 0).toLocaleString('fr-CI');
const fmtDate = (dt) => {
  if (!dt) return '—';
  const [d, t] = dt.split(' ');
  return new Date(d).toLocaleDateString('fr-CI', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ' à ' + t;
};

export default function Confirmation() {
  const navigate = useNavigate();
  const { state } = useLocation();

  useEffect(() => { if (!state) navigate('/'); }, [state, navigate]);
  if (!state) return null;

  const { clinique, medecin, creneau, patient, specialite, reference, code_secret } = state;

  return (
    <div style={{ background: '#060C12', minHeight: '100vh', fontFamily: "'Plus Jakarta Sans', sans-serif", padding: '40px 5%' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>

        {/* Succès */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ width: 72, height: 72, background: 'linear-gradient(135deg,#0A8F58,#0D9488)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 18px', boxShadow: '0 16px 40px rgba(10,143,88,.4)' }}>✅</div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 34, color: '#F0F4F8', fontWeight: 400, marginBottom: 8 }}>
            RDV <span style={{ color: '#0A8F58', fontStyle: 'italic' }}>confirmé !</span>
          </h1>
          <p style={{ color: '#8BA0B5', fontSize: 14, lineHeight: 1.7 }}>
            Votre rendez-vous a été enregistré avec succès.<br />
            Une confirmation vous sera envoyée par SMS.
          </p>
        </div>

        {/* Référence */}
        <div style={{ background: 'rgba(10,143,88,.08)', border: '2px solid rgba(10,143,88,.3)', borderRadius: 14, padding: '16px 24px', textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: '#4E657A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>Référence de réservation</div>
          <div style={{ fontFamily: 'monospace', fontSize: 24, fontWeight: 900, color: '#0A8F58', letterSpacing: 3, marginBottom: 4 }}>{reference || 'MC-RDV-DEMO'}</div>
          <div style={{ fontSize: 12, color: '#4E657A' }}>Conservez cette référence pour toute modification</div>
        </div>

        {/* Code secret patient (si nouveau compte créé) */}
        {code_secret && (
          <div style={{ background: 'rgba(37,99,235,.08)', border: '2px solid rgba(37,99,235,.3)', borderRadius: 14, padding: '16px 24px', textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: '#4E657A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>🔑 Votre code secret patient MediConnect</div>
            <div style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 900, color: '#2563EB', letterSpacing: 3, marginBottom: 6 }}>{code_secret}</div>
            <div style={{ fontSize: 12, color: '#8BA0B5', lineHeight: 1.6 }}>
              Communiquez ce code à votre médecin pour qu'il accède à votre dossier.<br />
              Gardez-le précieusement — il vous identifie sur MediConnect.
            </div>
          </div>
        )}

        {/* Détails RDV */}
        <div style={{ background: '#141E2B', border: '1px solid #1E2F42', borderRadius: 14, padding: 22, marginBottom: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0A8F58', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 14 }}>Détails du rendez-vous</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[['🏥 Établissement', clinique?.nom], ['📍 Adresse', clinique?.adresse || clinique?.ville], ['👨‍⚕️ Médecin', `Dr. ${medecin?.prenom} ${medecin?.nom}`], ['🩺 Spécialité', specialite], ['📅 Date & Heure', fmtDate(creneau)], ['💰 Tarif', `${fmt(medecin?.tarif)} FCFA`], ['👤 Patient', `${patient?.prenom} ${patient?.nom}`], ['📞 Téléphone', patient?.telephone]].map(([k,v]) => (
              <div key={k} style={{ borderBottom: '1px solid #1A2535', paddingBottom: 10 }}>
                <div style={{ fontSize: 10, color: '#4E657A', marginBottom: 2 }}>{k}</div>
                <div style={{ fontSize: 13, color: '#F0F4F8', fontWeight: 600 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div style={{ background: '#141E2B', border: '1px solid #1E2F42', borderRadius: 14, padding: 18, marginBottom: 22 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#F0F4F8', marginBottom: 12 }}>📋 Avant votre rendez-vous</div>
          {[
            "Présentez-vous 10 minutes avant l'heure",
            "Apportez une pièce d'identité et votre carnet de santé",
            patient?.assurance !== 'Aucune' ? `Apportez votre carte ${patient?.assurance}` : "Préparez le montant exact de la consultation",
            "En cas d'empêchement, annulez au moins 24h à l'avance",
            code_secret ? `Communiquez votre code secret (${code_secret}) à la réception` : "Donnez la référence " + (reference || '') + " à la réception",
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, fontSize: 13, color: '#8BA0B5' }}>
              <span style={{ color: '#0A8F58', fontWeight: 700, flexShrink: 0 }}>{i+1}.</span>
              <span>{item}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <button onClick={() => navigate('/')} style={{ flex: 1, background: 'rgba(255,255,255,.06)', color: '#F0F4F8', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, padding: 13, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            ← Accueil
          </button>
          <button onClick={() => navigate('/rdv')} style={{ flex: 1, background: 'linear-gradient(135deg,#0A8F58,#0D9488)', color: '#fff', border: 'none', borderRadius: 12, padding: 13, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            + Nouveau RDV
          </button>
        </div>

        {/* PWA hint */}
        <div style={{ textAlign: 'center', padding: '14px 18px', background: 'rgba(10,143,88,.05)', border: '1px solid rgba(10,143,88,.12)', borderRadius: 10 }}>
          <div style={{ fontSize: 13, color: '#8BA0B5' }}>
            📱 <strong style={{ color: '#F0F4F8' }}>Installez MediConnect RDV</strong> sur votre téléphone pour retrouver facilement vos rendez-vous.
          </div>
        </div>
      </div>
    </div>
  );
}
