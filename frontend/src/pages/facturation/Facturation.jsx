import React, { useState } from 'react';

// ═══════════════════════════════════════════════
// MOBILE PAY - Interface de paiement multi-canal
// ═══════════════════════════════════════════════
const MOYENS_PAIEMENT = [
  { id: 'wave',     label: 'Wave',          icon: '🌊', color: '#1DA6F2', bg: '#1DA6F220' },
  { id: 'orange',   label: 'Orange Money',  icon: '🟠', color: '#FF6600', bg: '#FF660020' },
  { id: 'moov',     label: 'Moov Money',    icon: '🔵', color: '#0066CC', bg: '#0066CC20' },
  { id: 'mtn',      label: 'MTN MoMo',      icon: '🟡', color: '#FFCC00', bg: '#FFCC0020' },
  { id: 'visa',     label: 'Visa',          icon: '💳', color: '#1A1F71', bg: '#1A1F7120' },
  { id: 'mastercard',label: 'Mastercard',   icon: '🔴', color: '#EB001B', bg: '#EB001B20' },
];

const fmt = (n) => Number(n || 0).toLocaleString('fr-CI');

// Interface de paiement Mobile Pay
export function MobilePayModal({ facture, onClose, onSuccess }) {
  const [moyen, setMoyen] = useState(null);
  const [telephone, setTelephone] = useState('');
  const [step, setStep] = useState(1); // 1=choix, 2=saisie, 3=confirmation
  const [loading, setLoading] = useState(false);

  const handlePayer = () => {
    if (!telephone && moyen !== 'visa' && moyen !== 'mastercard') return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep(3);
      if (onSuccess) onSuccess();
    }, 2000);
  };

  const moyenInfo = MOYENS_PAIEMENT.find(m => m.id === moyen);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#0E1620', border: '1px solid #1E2F42', borderRadius: 20, width: '100%', maxWidth: 480, overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#0A8F58,#0D9488)', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', marginBottom: 4 }}>Mobile Pay · Paiement sécurisé</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#fff' }}>{fmt(facture?.montant)} FCFA</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.8)' }}>Facture #{facture?.numero}</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,.2)', border: 'none', borderRadius: '50%', width: 32, height: 32, color: '#fff', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        <div style={{ padding: 24 }}>

          {/* Step 1 - Choix moyen */}
          {step === 1 && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#F0F4F8', marginBottom: 16 }}>Choisir un moyen de paiement</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                {MOYENS_PAIEMENT.map(m => (
                  <button key={m.id} onClick={() => { setMoyen(m.id); setStep(2); }}
                    style={{ background: m.bg, border: `2px solid ${m.color}40`, borderRadius: 12, padding: '14px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', transition: 'all .15s' }}
                    onMouseOver={e => e.currentTarget.style.borderColor = m.color}
                    onMouseOut={e => e.currentTarget.style.borderColor = m.color+'40'}>
                    <span style={{ fontSize: 24 }}>{m.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: m.color }}>{m.label}</span>
                  </button>
                ))}
              </div>
              <div style={{ textAlign: 'center', fontSize: 11, color: '#4E657A' }}>🔒 Paiement 100% sécurisé par Mobile Pay</div>
            </div>
          )}

          {/* Step 2 - Saisie */}
          {step === 2 && moyenInfo && (
            <div>
              <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: '#0A8F58', cursor: 'pointer', fontSize: 14, marginBottom: 16, padding: 0 }}>← Retour</button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, padding: '12px 16px', background: moyenInfo.bg, borderRadius: 12, border: `1px solid ${moyenInfo.color}40` }}>
                <span style={{ fontSize: 28 }}>{moyenInfo.icon}</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: moyenInfo.color }}>{moyenInfo.label}</span>
              </div>

              {(moyen === 'visa' || moyen === 'mastercard') ? (
                <div>
                  <label style={{ fontSize: 11, color: '#4E657A', display: 'block', marginBottom: 6 }}>NUMÉRO DE CARTE</label>
                  <input placeholder="1234 5678 9012 3456" style={{ width: '100%', background: '#141E2B', border: '1px solid #1E2F42', borderRadius: 10, padding: '12px', color: '#F0F4F8', fontSize: 15, marginBottom: 12, boxSizing: 'border-box' }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                    <div>
                      <label style={{ fontSize: 11, color: '#4E657A', display: 'block', marginBottom: 6 }}>EXPIRATION</label>
                      <input placeholder="MM/AA" style={{ width: '100%', background: '#141E2B', border: '1px solid #1E2F42', borderRadius: 10, padding: '12px', color: '#F0F4F8', fontSize: 15, boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: '#4E657A', display: 'block', marginBottom: 6 }}>CVV</label>
                      <input placeholder="123" style={{ width: '100%', background: '#141E2B', border: '1px solid #1E2F42', borderRadius: 10, padding: '12px', color: '#F0F4F8', fontSize: 15, boxSizing: 'border-box' }} />
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label style={{ fontSize: 11, color: '#4E657A', display: 'block', marginBottom: 6 }}>NUMÉRO DE TÉLÉPHONE</label>
                  <input
                    placeholder={moyen === 'wave' ? '+225 07 XX XX XX XX' : '+225 XX XX XX XX XX'}
                    value={telephone}
                    onChange={e => setTelephone(e.target.value)}
                    style={{ width: '100%', background: '#141E2B', border: '1px solid #1E2F42', borderRadius: 10, padding: '12px', color: '#F0F4F8', fontSize: 15, marginBottom: 20, boxSizing: 'border-box' }}
                  />
                </div>
              )}

              <div style={{ background: '#141E2B', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#8BA0B5', marginBottom: 6 }}>
                  <span>Facture #{facture?.numero}</span>
                  <span>{facture?.service}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800, color: '#F0F4F8' }}>
                  <span>Total à payer</span>
                  <span style={{ color: '#0A8F58' }}>{fmt(facture?.montant)} FCFA</span>
                </div>
              </div>

              <button onClick={handlePayer} disabled={loading}
                style={{ width: '100%', background: `linear-gradient(135deg,${moyenInfo.color},${moyenInfo.color}CC)`, border: 'none', borderRadius: 12, padding: '14px', color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>
                {loading ? '⏳ Traitement en cours...' : `💳 Payer ${fmt(facture?.montant)} FCFA`}
              </button>
            </div>
          )}

          {/* Step 3 - Succès */}
          {step === 3 && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ width: 72, height: 72, background: 'linear-gradient(135deg,#0A8F58,#0D9488)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 16px', boxShadow: '0 16px 40px rgba(10,143,88,.4)' }}>✅</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#F0F4F8', marginBottom: 8 }}>Paiement réussi !</div>
              <div style={{ fontSize: 14, color: '#8BA0B5', marginBottom: 24 }}>Facture #{facture?.numero} — {fmt(facture?.montant)} FCFA</div>
              <div style={{ background: 'rgba(10,143,88,.1)', border: '1px solid rgba(10,143,88,.2)', borderRadius: 10, padding: '12px', fontSize: 13, color: '#0A8F58', marginBottom: 20 }}>
                Un reçu vous a été envoyé par SMS
              </div>
              <button onClick={onClose} style={{ background: '#0A8F58', border: 'none', borderRadius: 10, padding: '12px 32px', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                Fermer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// COMPOSANT FACTURE - Réutilisable partout
// ═══════════════════════════════════════════════
export function FactureCard({ facture, onPayer }) {
  const estEcheante = facture.statut === 'en_attente';
  const estPayee    = facture.statut === 'payee';

  const statutColor = estPayee ? '#0A8F58' : estEcheante ? '#E11D48' : '#F59E0B';
  const statutLabel = estPayee ? '✓ Payée' : estEcheante ? '⚠ En attente' : '⏳ À venir';

  return (
    <div style={{ background: '#141E2B', border: `1px solid ${estEcheante ? '#E11D4840' : '#1E2F42'}`, borderRadius: 14, padding: '18px', marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 12, color: '#4E657A', marginBottom: 4 }}>Facture #{facture.numero}</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#F0F4F8' }}>{fmt(facture.montant)} FCFA</div>
          <div style={{ fontSize: 12, color: '#8BA0B5' }}>{facture.service} · {facture.periode}</div>
        </div>
        <div style={{ background: statutColor+'20', color: statutColor, fontSize: 12, fontWeight: 700, borderRadius: 20, padding: '4px 12px' }}>
          {statutLabel}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #1E2F42', paddingTop: 12 }}>
        <div style={{ fontSize: 12, color: '#4E657A' }}>
          Échéance : <span style={{ color: estEcheante ? '#E11D48' : '#8BA0B5', fontWeight: estEcheante ? 700 : 400 }}>{facture.echeance}</span>
        </div>
        {estEcheante && (
          <button onClick={() => onPayer(facture)}
            style={{ background: 'linear-gradient(135deg,#0A8F58,#0D9488)', border: 'none', borderRadius: 10, padding: '8px 20px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(10,143,88,.3)' }}>
            💳 Payer maintenant
          </button>
        )}
        {estPayee && (
          <button style={{ background: 'rgba(10,143,88,.1)', border: '1px solid rgba(10,143,88,.2)', borderRadius: 10, padding: '8px 16px', color: '#0A8F58', fontSize: 12, cursor: 'pointer' }}>
            📄 Télécharger reçu
          </button>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// PAGE FACTURATION UTILISATEUR
// ═══════════════════════════════════════════════
export default function PageFacturation({ role, tarif, service }) {
  const [factureActive, setFactureActive] = useState(null);
  const [showPaiement, setShowPaiement] = useState(false);

  // Calcul date d'adhésion simulée (25 jours écoulés)
  const dateAdhesion = new Date();
  dateAdhesion.setDate(dateAdhesion.getDate() - 25);

  const FACTURES_DEMO = [
    {
      numero: 'MC-2026-001',
      montant: tarif || 3000,
      service: service || 'Abonnement MediConnect',
      periode: 'Mai 2026',
      echeance: new Date(dateAdhesion.getTime() + 25 * 86400000).toLocaleDateString('fr-CI'),
      statut: 'en_attente',
      date: dateAdhesion.toLocaleDateString('fr-CI'),
    },
    {
      numero: 'MC-2026-000',
      montant: tarif || 3000,
      service: service || 'Abonnement MediConnect',
      periode: 'Avril 2026',
      echeance: '30/03/2026',
      statut: 'payee',
      date: '05/03/2026',
    },
  ];

  const factureEnAttente = FACTURES_DEMO.find(f => f.statut === 'en_attente');

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#F0F4F8', marginBottom: 4 }}>💳 Mes Factures</h1>
        <p style={{ fontSize: 14, color: '#8BA0B5' }}>Abonnement MediConnect · Facturation mensuelle</p>
      </div>

      {/* Alerte facture en attente */}
      {factureEnAttente && (
        <div style={{ background: 'rgba(225,29,72,.08)', border: '2px solid rgba(225,29,72,.3)', borderRadius: 14, padding: '18px 20px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#E11D48', marginBottom: 4 }}>⚠ Facture en attente de paiement</div>
            <div style={{ fontSize: 13, color: '#8BA0B5' }}>Facture #{factureEnAttente.numero} · {fmt(factureEnAttente.montant)} FCFA · Échéance : {factureEnAttente.echeance}</div>
          </div>
          <button onClick={() => { setFactureActive(factureEnAttente); setShowPaiement(true); }}
            style={{ background: 'linear-gradient(135deg,#0A8F58,#0D9488)', border: 'none', borderRadius: 12, padding: '12px 24px', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 8px 24px rgba(10,143,88,.4)' }}>
            💳 Payer maintenant
          </button>
        </div>
      )}

      {/* Info abonnement */}
      <div style={{ background: 'rgba(10,143,88,.06)', border: '1px solid rgba(10,143,88,.2)', borderRadius: 14, padding: '18px 20px', marginBottom: 24, display: 'flex', gap: 32 }}>
        <div>
          <div style={{ fontSize: 11, color: '#4E657A', marginBottom: 4 }}>ABONNEMENT</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#F0F4F8' }}>{service || 'MediConnect Standard'}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#4E657A', marginBottom: 4 }}>TARIF MENSUEL</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0A8F58' }}>{fmt(tarif || 3000)} FCFA</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#4E657A', marginBottom: 4 }}>DATE D'ADHÉSION</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#F0F4F8' }}>{dateAdhesion.toLocaleDateString('fr-CI')}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#4E657A', marginBottom: 4 }}>PROCHAINE FACTURE</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#F59E0B' }}>Dans 5 jours</div>
        </div>
      </div>

      {/* Liste factures */}
      <div style={{ fontSize: 14, fontWeight: 700, color: '#F0F4F8', marginBottom: 16 }}>Historique des factures</div>
      {FACTURES_DEMO.map(f => (
        <FactureCard key={f.numero} facture={f} onPayer={(fac) => { setFactureActive(fac); setShowPaiement(true); }} />
      ))}

      {/* Moyens de paiement acceptés */}
      <div style={{ background: '#141E2B', border: '1px solid #1E2F42', borderRadius: 14, padding: '18px 20px', marginTop: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#F0F4F8', marginBottom: 14 }}>Moyens de paiement acceptés</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {MOYENS_PAIEMENT.map(m => (
            <div key={m.id} style={{ background: m.bg, border: `1px solid ${m.color}40`, borderRadius: 10, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 18 }}>{m.icon}</span>
              <span style={{ fontSize: 12, color: m.color, fontWeight: 600 }}>{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Modal paiement */}
      {showPaiement && factureActive && (
        <MobilePayModal
          facture={factureActive}
          onClose={() => setShowPaiement(false)}
          onSuccess={() => console.log('Paiement réussi')}
        />
      )}
    </div>
  );
}
