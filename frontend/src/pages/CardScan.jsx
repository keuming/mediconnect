import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const API = 'https://mediconnect-backend-v2.vercel.app/api';

const C = {
  bg: '#060E18', card: '#0D1B2A', border: '#1a2d42',
  text: '#F0F6FF', muted: '#8BA3B8', dim: '#5A7A94',
  green: '#0A8F58', greenL: '#34D399', red: '#EF4444',
};

export default function CardScan() {
  const { numero } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API}/card/public/scan/${numero}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setData(d.data);
        else setError(d.message || 'Carte introuvable');
      })
      .catch(() => setError('Erreur de connexion au serveur'))
      .finally(() => setLoading(false));
  }, [numero]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: C.muted, fontSize: 14 }}>Chargement…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 32, textAlign: 'center', maxWidth: 380 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <div style={{ color: C.text, fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Carte introuvable</div>
          <div style={{ color: C.muted, fontSize: 13 }}>{error || 'Cette carte MediConnect n\'existe pas ou n\'est pas encore active.'}</div>
        </div>
      </div>
    );
  }

  if (!data.liee) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 32, textAlign: 'center', maxWidth: 380 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💳</div>
          <div style={{ color: C.text, fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Carte non activée</div>
          <div style={{ color: C.muted, fontSize: 13 }}>{data.message || 'Cette carte n\'est pas encore liée à un compte.'}</div>
        </div>
      </div>
    );
  }

  const p = data.patient || {};
  const contacts = data.contacts_urgence || [];

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '32px 16px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(10,143,88,0.2)', border: `1.5px solid ${C.green}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: C.greenL }}>+</div>
            <span style={{ fontSize: 18, fontWeight: 800, color: C.text }}>Medi<span style={{ color: C.greenL }}>Connect</span></span>
          </div>
          <div style={{ color: C.dim, fontSize: 12 }}>Fiche d'urgence médicale</div>
        </div>

        {/* Alerte urgence */}
        <div style={{ background: 'rgba(239,68,68,0.1)', border: `1px solid rgba(239,68,68,0.3)`, borderRadius: 14, padding: 16, marginBottom: 20, textAlign: 'center' }}>
          <div style={{ color: '#FCA5A5', fontWeight: 700, fontSize: 14 }}>🚨 En cas d'urgence médicale</div>
          <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>Contactez immédiatement les numéros ci-dessous</div>
        </div>

        {/* Identite */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 22, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: 28, background: 'rgba(10,143,88,0.15)', border: `2px solid ${C.green}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800, color: C.greenL, overflow: 'hidden' }}>
              {p.photo_url ? <img src={p.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (p.prenom?.[0] || '?')}
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{p.prenom} {p.nom}</div>
              {p.membre_famille && <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>Membre famille de {p.compte_principal_nom}</div>}
              {p.ville && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>📍 {p.ville}</div>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {p.groupe_sanguin && (
              <div style={{ background: C.bg, borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: C.dim, marginBottom: 3 }}>GROUPE SANGUIN</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#F87171' }}>{p.groupe_sanguin}</div>
              </div>
            )}
            {p.telephone && (
              <div style={{ background: C.bg, borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: C.dim, marginBottom: 3 }}>TÉLÉPHONE</div>
                <a href={`tel:${p.telephone}`} style={{ fontSize: 13, fontWeight: 700, color: C.greenL, textDecoration: 'none' }}>{p.telephone}</a>
              </div>
            )}
          </div>

          {p.allergies && (
            <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, padding: '10px 12px', marginTop: 10 }}>
              <div style={{ fontSize: 10, color: '#FCD34D', marginBottom: 3, fontWeight: 700 }}>⚠️ ALLERGIES CONNUES</div>
              <div style={{ fontSize: 13, color: C.text }}>{p.allergies}</div>
            </div>
          )}
        </div>

        {/* Contacts urgence */}
        {contacts.length > 0 && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 }}>
              🆘 Contacts d'urgence ({contacts.length})
            </div>
            {contacts.map((c, i) => (
              <a key={i} href={`tel:${c.telephone}`} style={{
                display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none',
                background: C.bg, borderRadius: 12, padding: 14,
                marginBottom: i < contacts.length - 1 ? 8 : 0,
                border: c.est_principal ? `1px solid ${C.green}` : `1px solid ${C.border}`,
              }}>
                <div style={{ width: 38, height: 38, borderRadius: 19, background: c.est_principal ? 'rgba(10,143,88,0.2)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: c.est_principal ? C.greenL : C.muted, fontSize: 14 }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
                    {c.prenom} {c.nom} {c.est_principal && <span style={{ color: C.greenL, fontSize: 11 }}>(Principal)</span>}
                  </div>
                  <div style={{ fontSize: 12, color: C.dim, marginTop: 1 }}>{c.relation || 'Contact'}</div>
                </div>
                <div style={{ color: C.greenL, fontSize: 14, fontWeight: 700 }}>{c.telephone} 📞</div>
              </a>
            ))}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 24, color: C.dim, fontSize: 11 }}>
          Carte n° {numero} · mediconnect4africa.cloud
        </div>
      </div>
    </div>
  );
}
