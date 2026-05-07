import React, { useState } from 'react';
import { PageHeader, Badge, Empty } from '../../components/common/UI';

const fmt = (n) => Number(n || 0).toLocaleString('fr-CI');

const MEDECINS_DEMO = [
  { id: 1, prenom: 'Kouassi', nom: 'Ange', specialite: 'Cardiologie', ville: 'Cocody, Abidjan', tarif: 20000, experience: 12, note: 4.8, patients: 45, disponible: true, photo: null },
  { id: 2, prenom: 'Bamba', nom: 'Mariame', specialite: 'Médecine générale', ville: 'Plateau, Abidjan', tarif: 12000, experience: 8, note: 4.6, patients: 120, disponible: true, photo: null },
  { id: 3, prenom: 'Diallo', nom: 'Seydou', specialite: 'Pédiatrie', ville: 'Marcory, Abidjan', tarif: 15000, experience: 15, note: 4.9, patients: 89, disponible: false, photo: null },
  { id: 4, prenom: 'Konan', nom: 'Adjoua', specialite: 'Gynécologie', ville: 'Yopougon, Abidjan', tarif: 18000, experience: 10, note: 4.7, patients: 67, disponible: true, photo: null },
];

const SPECIALITES = ['Toutes', 'Cardiologie', 'Médecine générale', 'Pédiatrie', 'Gynécologie', 'Dermatologie', 'Ophtalmologie'];

// Modal de demande de suivi
function DemandeModal({ medecin, onClose, onConfirm }) {
  const [motif, setMotif] = useState('');
  const [step, setStep] = useState(1); // 1=motif, 2=paiement, 3=succès

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#0E1620', border: '1px solid #1E2F42', borderRadius: 20, width: '100%', maxWidth: 480, overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#0A8F58,#0D9488)', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', marginBottom: 4 }}>Demande de suivi privé</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>Dr. {medecin.prenom} {medecin.nom}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.8)' }}>{medecin.specialite}</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,.2)', border: 'none', borderRadius: '50%', width: 32, height: 32, color: '#fff', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        <div style={{ padding: 24 }}>
          {/* Step 1 - Motif */}
          {step === 1 && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#F0F4F8', marginBottom: 16 }}>Pourquoi souhaitez-vous ce médecin ?</div>
              <textarea value={motif} onChange={e => setMotif(e.target.value)}
                placeholder="Ex: Suivi médical régulier, médecin de famille, suivi d'une pathologie chronique..."
                rows={4} style={{ width: '100%', background: '#141E2B', border: '1px solid #1E2F42', borderRadius: 10, padding: 12, color: '#F0F4F8', fontSize: 14, resize: 'vertical', boxSizing: 'border-box', marginBottom: 16 }} />

              <div style={{ background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#F59E0B', marginBottom: 4 }}>💳 Frais de mise en relation</div>
                <div style={{ fontSize: 13, color: '#8BA0B5' }}>Un paiement de <strong style={{ color: '#F0F4F8' }}>1 000 FCFA</strong> est requis avant que le médecin reçoive votre demande.</div>
              </div>

              <button onClick={() => { if (!motif.trim()) return; setStep(2); }} disabled={!motif.trim()}
                style={{ width: '100%', background: motif.trim() ? 'linear-gradient(135deg,#0A8F58,#0D9488)' : '#1E2F42', border: 'none', borderRadius: 12, padding: 14, color: '#fff', fontSize: 15, fontWeight: 800, cursor: motif.trim() ? 'pointer' : 'not-allowed' }}>
                Continuer → Payer 1 000 FCFA
              </button>
            </div>
          )}

          {/* Step 2 - Paiement */}
          {step === 2 && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#F0F4F8', marginBottom: 16 }}>💳 Payer les frais de mise en relation</div>

              <div style={{ background: '#141E2B', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: '#8BA0B5' }}>Frais de mise en relation</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: '#0A8F58' }}>1 000 FCFA</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                {[
                  { id: 'wave', label: 'Wave', icon: '🌊', color: '#1DA6F2' },
                  { id: 'orange', label: 'Orange Money', icon: '🟠', color: '#FF6600' },
                  { id: 'moov', label: 'Moov Money', icon: '🔵', color: '#0066CC' },
                  { id: 'mtn', label: 'MTN MoMo', icon: '🟡', color: '#FFCC00' },
                ].map(m => (
                  <button key={m.id} onClick={() => setStep(3)}
                    style={{ background: m.color + '15', border: `2px solid ${m.color}40`, borderRadius: 12, padding: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 20 }}>{m.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: m.color }}>{m.label}</span>
                  </button>
                ))}
              </div>

              <button onClick={() => setStep(1)} style={{ width: '100%', background: 'none', border: '1px solid #1E2F42', borderRadius: 10, padding: 10, color: '#8BA0B5', fontSize: 13, cursor: 'pointer' }}>
                ← Retour
              </button>
            </div>
          )}

          {/* Step 3 - Succès */}
          {step === 3 && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ width: 72, height: 72, background: 'linear-gradient(135deg,#0A8F58,#0D9488)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 16px', boxShadow: '0 16px 40px rgba(10,143,88,.4)' }}>✅</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#F0F4F8', marginBottom: 8 }}>Demande envoyée !</div>
              <div style={{ fontSize: 14, color: '#8BA0B5', marginBottom: 8 }}>Dr. {medecin.prenom} {medecin.nom} a reçu votre demande.</div>
              <div style={{ background: 'rgba(10,143,88,.1)', border: '1px solid rgba(10,143,88,.2)', borderRadius: 10, padding: '12px', fontSize: 13, color: '#0A8F58', marginBottom: 20 }}>
                Vous serez notifié par SMS dès que le médecin aura répondu.
              </div>
              <button onClick={onClose} style={{ background: '#0A8F58', border: 'none', borderRadius: 10, padding: '10px 32px', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                Fermer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PageMedecinsPrives() {
  const [specialite, setSpecialite] = useState('Toutes');
  const [search, setSearch] = useState('');
  const [medecinSelectionne, setMedecinSelectionne] = useState(null);

  const filtered = MEDECINS_DEMO.filter(m => {
    const matchSpec = specialite === 'Toutes' || m.specialite === specialite;
    const matchSearch = search === '' || `${m.prenom} ${m.nom} ${m.specialite} ${m.ville}`.toLowerCase().includes(search.toLowerCase());
    return matchSpec && matchSearch;
  });

  return (
    <div>
      <PageHeader title="👨‍⚕️ Médecins Indépendants" subtitle="Trouvez votre médecin privé ou médecin de famille" />

      {/* Barre de recherche */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Rechercher un médecin..."
          style={{ flex: 1, minWidth: 200, background: '#141E2B', border: '1px solid #1E2F42', borderRadius: 10, padding: '10px 14px', color: '#F0F4F8', fontSize: 14, outline: 'none' }} />
        <select value={specialite} onChange={e => setSpecialite(e.target.value)}
          style={{ background: '#141E2B', border: '1px solid #1E2F42', borderRadius: 10, padding: '10px 14px', color: '#F0F4F8', fontSize: 14, outline: 'none', cursor: 'pointer' }}>
          {SPECIALITES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Info frais */}
      <div style={{ background: 'rgba(37,99,235,.06)', border: '1px solid rgba(37,99,235,.2)', borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#8BA0B5' }}>
        💡 La mise en relation avec un médecin privé coûte <strong style={{ color: '#2563EB' }}>1 000 FCFA</strong>, payables avant l'envoi de votre demande.
      </div>

      {/* Liste médecins */}
      {filtered.length === 0 ? (
        <Empty icon="👨‍⚕️" title="Aucun médecin trouvé" subtitle="Modifiez vos critères de recherche" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {filtered.map((m, i) => (
            <div key={i} style={{ background: '#141E2B', border: '1px solid #1E2F42', borderRadius: 16, padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Header médecin */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 52, height: 52, background: 'linear-gradient(135deg,#0A8F58,#0D9488)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                  {m.prenom[0]}{m.nom[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#F0F4F8' }}>Dr. {m.prenom} {m.nom}</div>
                  <div style={{ fontSize: 13, color: '#0A8F58', fontWeight: 600 }}>{m.specialite}</div>
                  <div style={{ fontSize: 12, color: '#8BA0B5' }}>📍 {m.ville}</div>
                </div>
                <div style={{ background: m.disponible ? '#0A8F5820' : '#E11D4820', color: m.disponible ? '#0A8F58' : '#E11D48', fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '3px 10px' }}>
                  {m.disponible ? '● Disponible' : '○ Indisponible'}
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[
                  ['⭐', m.note, 'Note'],
                  ['👥', m.patients, 'Patients'],
                  ['🏥', m.experience + ' ans', 'Expérience'],
                ].map(([icon, val, label], j) => (
                  <div key={j} style={{ background: '#0E1620', borderRadius: 8, padding: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: 16 }}>{icon}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#F0F4F8' }}>{val}</div>
                    <div style={{ fontSize: 10, color: '#4E657A' }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Tarif + bouton */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #1E2F42', paddingTop: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#4E657A' }}>Consultation</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0A8F58' }}>{fmt(m.tarif)} FCFA</div>
                </div>
                <button
                  disabled={!m.disponible}
                  onClick={() => m.disponible && setMedecinSelectionne(m)}
                  style={{ background: m.disponible ? 'linear-gradient(135deg,#0A8F58,#0D9488)' : '#1E2F42', border: 'none', borderRadius: 10, padding: '10px 18px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: m.disponible ? 'pointer' : 'not-allowed', opacity: m.disponible ? 1 : 0.5 }}>
                  {m.disponible ? '+ Demander suivi' : 'Indisponible'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal demande */}
      {medecinSelectionne && (
        <DemandeModal
          medecin={medecinSelectionne}
          onClose={() => setMedecinSelectionne(null)}
          onConfirm={() => setMedecinSelectionne(null)}
        />
      )}
    </div>
  );
}
