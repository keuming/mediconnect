import React, { useState, useRef } from 'react';

const fmt = (n) => Number(n || 0).toLocaleString('fr-CI');

const TYPES_BULLETIN = [
  { id: 'analyse',  label: 'Analyse de sang',   icon: '🩸' },
  { id: 'radio',    label: 'Radiologie / IRM',  icon: '🩻' },
  { id: 'echo',     label: 'Échographie',        icon: '📡' },
  { id: 'scanner',  label: 'Scanner',            icon: '🔬' },
  { id: 'autre',    label: 'Autre',              icon: '📄' },
];

const DESTINATAIRES = [
  { id: 'labo',     label: 'Laboratoire',        icon: '🧪' },
  { id: 'imagerie', label: 'Imagerie médicale',  icon: '🩻' },
  { id: 'medecin',  label: 'Mon médecin',        icon: '👨‍⚕️' },
  { id: 'clinique', label: 'Clinique',           icon: '🏥' },
];

export default function PageBulletins({ role = 'patient' }) {
  const [onglet, setOnglet] = useState('envoyer');
  const [fichier, setFichier] = useState(null);
  const [type, setType] = useState('');
  const [destinataire, setDestinataire] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [succes, setSucces] = useState(false);
  const fileRef = useRef();

  const handleFichier = (e) => {
    const f = e.target.files?.[0];
    if (f) setFichier(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) setFichier(f);
  };

  const handleEnvoyer = () => {
    if (!fichier || !type) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSucces(true);
      setTimeout(() => {
        setSucces(false);
        setFichier(null);
        setType('');
        setDestinataire('');
        setNote('');
        setOnglet('reçus');
      }, 2000);
    }, 1500);
  };

  const BULLETINS_RECUS = role === 'patient' ? [
    { id: 'BUL-003', type: 'Analyse', date: '30/04/2026', emetteur: 'Labo Moderne', fichier: 'nfs_avril.pdf', statut: 'nouveau' },
    { id: 'BUL-001', type: 'Radiologie', date: '15/04/2026', emetteur: 'Centre Imagerie Plateau', fichier: 'radio_thorax.pdf', statut: 'lu' },
  ] : [
    { id: 'BUL-005', type: 'Analyse', date: '30/04/2026', patient: 'Aya Konan', emetteur: 'Labo Moderne', fichier: 'nfs_konan.pdf', statut: 'nouveau' },
    { id: 'BUL-004', type: 'Radiologie', date: '28/04/2026', patient: 'Moussa Diallo', emetteur: 'Imagerie Cocody', fichier: 'radio_diallo.pdf', statut: 'lu' },
    { id: 'BUL-002', type: 'Échographie', date: '20/04/2026', patient: 'Fatou Bamba', emetteur: 'Patient', fichier: 'echo_bamba.pdf', statut: 'lu' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#F0F4F8', marginBottom: 4 }}>
          🔬 Bulletins médicaux
        </h1>
        <p style={{ fontSize: 14, color: '#8BA0B5' }}>
          {role === 'patient'
            ? 'Envoyez vos bulletins d\'analyse ou de radiologie à votre médecin ou laboratoire'
            : 'Gérez les bulletins médicaux de vos patients'}
        </p>
      </div>

      {/* Onglets */}
      <div style={{ display: 'flex', gap: 4, background: '#0E1620', borderRadius: 12, padding: 4, marginBottom: 24, width: 'fit-content' }}>
        {[['envoyer', '📤 Envoyer un bulletin'], ['reçus', `📥 Bulletins reçus (${BULLETINS_RECUS.length})`]].map(([v, l]) => (
          <button key={v} onClick={() => setOnglet(v)}
            style={{ background: onglet === v ? '#0A8F58' : 'none', border: 'none', borderRadius: 8, padding: '8px 20px', color: onglet === v ? '#fff' : '#8BA0B5', fontSize: 13, fontWeight: onglet === v ? 700 : 400, cursor: 'pointer' }}>
            {l}
          </button>
        ))}
      </div>

      {/* ONGLET ENVOYER */}
      {onglet === 'envoyer' && (
        <div style={{ maxWidth: 600 }}>
          {succes ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: '#141E2B', borderRadius: 20, border: '1px solid rgba(10,143,88,.3)' }}>
              <div style={{ fontSize: 60, marginBottom: 16 }}>✅</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#F0F4F8', marginBottom: 8 }}>Bulletin envoyé !</div>
              <div style={{ fontSize: 14, color: '#8BA0B5' }}>Votre bulletin a été transmis avec succès</div>
            </div>
          ) : (
            <div>
              {/* Zone upload */}
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${fichier ? '#0A8F58' : '#1E2F42'}`,
                  borderRadius: 16, padding: '40px 20px', textAlign: 'center',
                  cursor: 'pointer', marginBottom: 20, transition: 'all .2s',
                  background: fichier ? 'rgba(10,143,88,.05)' : '#141E2B',
                }}
              >
                <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.dcm" onChange={handleFichier} style={{ display: 'none' }} />
                {fichier ? (
                  <div>
                    <div style={{ fontSize: 40, marginBottom: 10 }}>📄</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#0A8F58', marginBottom: 4 }}>{fichier.name}</div>
                    <div style={{ fontSize: 12, color: '#8BA0B5' }}>{(fichier.size / 1024 / 1024).toFixed(2)} MB</div>
                    <button onClick={e => { e.stopPropagation(); setFichier(null); }}
                      style={{ marginTop: 10, background: 'none', border: '1px solid #E11D4840', borderRadius: 8, padding: '4px 14px', color: '#E11D48', fontSize: 12, cursor: 'pointer' }}>
                      Supprimer
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>📁</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#F0F4F8', marginBottom: 6 }}>Glissez votre fichier ici</div>
                    <div style={{ fontSize: 13, color: '#8BA0B5', marginBottom: 12 }}>ou cliquez pour sélectionner</div>
                    <div style={{ fontSize: 11, color: '#4E657A' }}>PDF, JPG, PNG, DICOM — max 20 MB</div>
                  </div>
                )}
              </div>

              {/* Type de bulletin */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, color: '#4E657A', display: 'block', marginBottom: 8, letterSpacing: '.5px', textTransform: 'uppercase' }}>Type de bulletin</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {TYPES_BULLETIN.map(t => (
                    <button key={t.id} onClick={() => setType(t.id)}
                      style={{ background: type === t.id ? '#0A8F5820' : '#141E2B', border: `1px solid ${type === t.id ? '#0A8F58' : '#1E2F42'}`, borderRadius: 10, padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 16 }}>{t.icon}</span>
                      <span style={{ fontSize: 12, color: type === t.id ? '#0A8F58' : '#8BA0B5', fontWeight: type === t.id ? 700 : 400 }}>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Destinataire */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, color: '#4E657A', display: 'block', marginBottom: 8, letterSpacing: '.5px', textTransform: 'uppercase' }}>Destinataire</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {DESTINATAIRES.map(d => (
                    <button key={d.id} onClick={() => setDestinataire(d.id)}
                      style={{ background: destinataire === d.id ? '#3B82F620' : '#141E2B', border: `1px solid ${destinataire === d.id ? '#3B82F6' : '#1E2F42'}`, borderRadius: 10, padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 16 }}>{d.icon}</span>
                      <span style={{ fontSize: 12, color: destinataire === d.id ? '#3B82F6' : '#8BA0B5', fontWeight: destinataire === d.id ? 700 : 400 }}>{d.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 11, color: '#4E657A', display: 'block', marginBottom: 8, letterSpacing: '.5px', textTransform: 'uppercase' }}>Note (optionnel)</label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Précisions sur ce bulletin..."
                  rows={3}
                  style={{ width: '100%', background: '#141E2B', border: '1px solid #1E2F42', borderRadius: 10, padding: '12px', color: '#F0F4F8', fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              <button onClick={handleEnvoyer} disabled={!fichier || !type || loading}
                style={{ width: '100%', background: fichier && type ? 'linear-gradient(135deg,#0A8F58,#0D9488)' : '#1E2F42', border: 'none', borderRadius: 12, padding: '14px', color: '#fff', fontSize: 15, fontWeight: 800, cursor: fichier && type ? 'pointer' : 'not-allowed', opacity: fichier && type ? 1 : 0.5 }}>
                {loading ? '⏳ Envoi en cours...' : '📤 Envoyer le bulletin'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ONGLET REÇUS */}
      {onglet === 'reçus' && (
        <div>
          {BULLETINS_RECUS.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', background: '#141E2B', borderRadius: 16, border: '1px solid #1E2F42' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
              <div style={{ fontSize: 16, color: '#8BA0B5' }}>Aucun bulletin reçu</div>
            </div>
          ) : (
            <div>
              {BULLETINS_RECUS.map((b, i) => (
                <div key={i} style={{ background: '#141E2B', border: `1px solid ${b.statut === 'nouveau' ? '#2563EB40' : '#1E2F42'}`, borderRadius: 14, padding: '18px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 48, height: 48, background: b.type === 'Analyse' ? '#3B82F620' : '#8B5CF620', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
                    {b.type === 'Analyse' ? '🩸' : b.type === 'Radiologie' ? '🩻' : '📡'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#F0F4F8' }}>{b.type}</span>
                      {b.statut === 'nouveau' && (
                        <span style={{ background: '#2563EB', color: '#fff', fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 20 }}>NOUVEAU</span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: '#8BA0B5' }}>
                      {role === 'patient' ? `De : ${b.emetteur}` : `Patient : ${b.patient} · De : ${b.emetteur}`}
                    </div>
                    <div style={{ fontSize: 12, color: '#4E657A', marginTop: 2 }}>#{b.id} · {b.date}</div>
                  </div>
                  <button style={{ background: 'rgba(37,99,235,.1)', border: '1px solid rgba(37,99,235,.3)', borderRadius: 10, padding: '8px 16px', color: '#2563EB', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    📄 Voir le fichier
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
