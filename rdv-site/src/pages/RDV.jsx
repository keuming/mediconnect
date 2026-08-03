import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';

const API = (process.env.REACT_APP_API_URL || 'https://mediconnect-backend-v2.vercel.app').replace(/\/+$/, '') + '/api';

const VILLES = ['Abidjan','Dakar','Ouagadougou','Accra','Bamako','Lomé','Cotonou','Conakry'];
const PAYS = [
  { code:'CI', label:"🇨🇮 Côte d'Ivoire", ville:'Abidjan' }, { code:'SN', label:'🇸🇳 Sénégal', ville:'Dakar' },
  { code:'BF', label:'🇧🇫 Burkina Faso', ville:'Ouagadougou' }, { code:'GH', label:'🇬🇭 Ghana', ville:'Accra' },
  { code:'ML', label:'🇲🇱 Mali', ville:'Bamako' }, { code:'TG', label:'🇹🇬 Togo', ville:'Lomé' },
  { code:'BJ', label:'🇧🇯 Bénin', ville:'Cotonou' }, { code:'GN', label:'🇬🇳 Guinée', ville:'Conakry' },
];
const SPECIALITES = ['Cardiologie','Pédiatrie','Gynécologie','Dermatologie','Neurologie','Médecine générale','Ophtalmologie','ORL','Orthopédie','Psychiatrie','Radiologie','Chirurgie'];
const ASSURANCES = ['Aucune','NSIA Assurances','Allianz CI','AXA CI','CNAM (CMU)','SANLAM','Saham Assurances','Atlantique Assurances'];
const RELATIONS = ['Parent','Conjoint(e)','Enfant','Frère/Sœur','Ami(e)','Tuteur','Autre'];

// Données de démo si API non disponible
const DEMO_CLINIQUES = [
  { id: 'demo-1', nom: 'Polyclinique du Sud', ville: 'Abidjan', adresse: 'Cocody, Abidjan', telephone: '+225 27 22 00 00 00', specialites: ['Cardiologie','Pédiatrie','Gynécologie','Médecine générale'], nb_medecins: 3 },
  { id: 'demo-2', nom: 'Clinique Sainte Marie', ville: 'Abidjan', adresse: 'Plateau, Abidjan', telephone: '+225 27 22 11 11 11', specialites: ['Neurologie','Dermatologie','ORL','Médecine générale'], nb_medecins: 2 },
  { id: 'demo-3', nom: 'Centre Médical Liberté', ville: 'Dakar', adresse: 'Liberté VI, Dakar', telephone: '+221 33 000 00 00', specialites: ['Médecine générale','Pédiatrie','Gynécologie'], nb_medecins: 4 },
];

const DEMO_MEDECINS = {
  'Cardiologie': [{ id: 'md-1', prenom: 'Alice', nom: 'Kouamé', specialite: 'Cardiologie', tarif: 25000, experience_ans: 12, statut: 'Disponible' }],
  'Pédiatrie': [{ id: 'md-2', prenom: 'Paul', nom: 'Traoré', specialite: 'Pédiatrie', tarif: 15000, experience_ans: 10, statut: 'Disponible' }],
  'Gynécologie': [{ id: 'md-3', prenom: 'Fatou', nom: 'Koné', specialite: 'Gynécologie', tarif: 22000, experience_ans: 15, statut: 'Disponible' }],
  'Médecine générale': [{ id: 'md-4', prenom: 'Jean', nom: 'Coulibaly', specialite: 'Médecine générale', tarif: 10000, experience_ans: 5, statut: 'Disponible' }],
  'Neurologie': [{ id: 'md-5', prenom: 'Koffi', nom: "N\'Guessan", specialite: 'Neurologie', tarif: 35000, experience_ans: 18, statut: 'Disponible' }],
};

const genDispo = () => {
  const slots = [];
  for (let d = 1; d <= 14; d++) {
    const date = new Date(); date.setDate(date.getDate() + d);
    if ([0,6].includes(date.getDay())) continue;
    const ds = date.toISOString().split('T')[0];
    ['08:00','08:30','09:00','09:30','10:00','10:30','14:00','14:30','15:00','15:30'].forEach(h => slots.push(`${ds} ${h}`));
  }
  return slots.slice(0, 40);
};

const fmt = (n) => Number(n||0).toLocaleString('fr-CI');
const fmtDate = (dt) => {
  if (!dt) return '—';
  const [d, t] = dt.split(' ');
  return `${new Date(d).toLocaleDateString('fr-CI', { weekday: 'short', day: 'numeric', month: 'long' })} à ${t}`;
};

export default function RDV() {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(1);
  const [pays, setPays] = useState('CI');
  // Etablissement deja choisi depuis la recherche reelle de Home.jsx :
  // on saute directement l'etape de recherche (redondante) et on va au
  // choix du medecin. Sans cette lecture, le patient revoyait un
  // formulaire de recherche identique juste apres en avoir rempli un.
  const preselection = location.state?.etablissementPreselectionne || null;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Données API
  const [cliniques, setCliniques] = useState([]);
  const [medecins, setMedecins] = useState([]);
  const [dispos, setDispos] = useState([]);

  // Sélections
  const [ville, setVille] = useState('Abidjan');
  const [specialite, setSpecialite] = useState('');
  const [clinique, setClinique] = useState(null);
  const [medecin, setMedecin] = useState(null);
  const [creneau, setCreneau] = useState('');

  // Patient
  const [statut, setStatut] = useState('patient');
  const [patient, setPatient] = useState({ prenom: '', nom: '', telephone: '', email: '', ville_residence: 'Abidjan', assurance: 'Aucune', numero_police: '', motif: '' });
  const [accomp, setAccomp] = useState({ prenom: '', nom: '', telephone: '', relation: 'Parent' });

  // Si une clinique a deja ete choisie via la recherche de Home.jsx,
  // on la recupere directement et on saute l'etape 1 -- pas besoin de
  // refaire une recherche deja faite.
  useEffect(() => {
    if (!preselection || preselection.type !== 'clinique') return;
    fetch(`${API}/public/cliniques/${preselection.id}`)
      .then(r => r.json())
      .then(d => {
        const c = d.success && d.data ? d.data : { id: preselection.id, nom: preselection.nom, ville: preselection.ville };
        setClinique(c);
        setStep(2);
      })
      .catch(() => {
        setClinique({ id: preselection.id, nom: preselection.nom, ville: preselection.ville });
        setStep(2);
      });
  }, []);

  // Charger cliniques (uniquement si pas de preselection : etape 1 reelle)
  useEffect(() => {
    if (preselection) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (ville) params.append('ville', ville);
    if (specialite) params.append('specialite', specialite);
    fetch(`${API}/public/cliniques?${params}`)
      .then(r => r.json())
      .then(d => setCliniques(d.success && d.data.length > 0 ? d.data : DEMO_CLINIQUES.filter(c => !ville || c.ville === ville)))
      .catch(() => setCliniques(DEMO_CLINIQUES.filter(c => !ville || c.ville === ville)))
      .finally(() => setLoading(false));
  }, [ville, specialite, preselection]);

  // Charger médecins quand clinique sélectionnée
  useEffect(() => {
    if (!clinique) return;
    if (clinique.id.startsWith('demo-')) {
      setMedecins(DEMO_MEDECINS[specialite] || Object.values(DEMO_MEDECINS)[0]);
      return;
    }
    fetch(`${API}/public/cliniques/${clinique.id}/medecins${specialite ? '?specialite=' + specialite : ''}`)
      .then(r => r.json())
      .then(d => setMedecins(d.data || []))
      .catch(() => setMedecins(DEMO_MEDECINS[specialite] || []));
  }, [clinique, specialite]);

  // Charger disponibilités quand médecin sélectionné
  useEffect(() => {
    if (!medecin) return;
    if (medecin.id.startsWith('md-')) {
      setDispos(genDispo());
      return;
    }
    fetch(`${API}/public/medecins/${medecin.id}/disponibilites`)
      .then(r => r.json())
      .then(d => setDispos(d.data || genDispo()))
      .catch(() => setDispos(genDispo()));
  }, [medecin]);

  const submitRDV = async () => {
    if (!patient.prenom || !patient.nom || !patient.telephone) {
      toast.error('Prénom, nom et téléphone obligatoires');
      return;
    }
    setSaving(true);
    try {
      const body = {
        clinique_id: clinique.id,
        medecin_id: medecin.id,
        date_rdv: creneau.split(' ')[0],
        heure_rdv: creneau.split(' ')[1],
        motif: patient.motif,
        assurance: patient.assurance !== 'Aucune' ? patient.assurance : null,
        patient_prenom: patient.prenom,
        patient_nom: patient.nom,
        patient_telephone: patient.telephone,
        patient_email: patient.email,
        patient_ville: patient.ville_residence,
        numero_police: patient.numero_police,
        statut_patient: statut,
        accompagnant_prenom: statut === 'accompagnant' ? accomp.prenom : null,
        accompagnant_nom: statut === 'accompagnant' ? accomp.nom : null,
        accompagnant_telephone: statut === 'accompagnant' ? accomp.telephone : null,
        accompagnant_relation: statut === 'accompagnant' ? accomp.relation : null,
      };

      // Si demo (id commence par demo-), simuler succès
      if (clinique.id.startsWith('demo-') || medecin.id.startsWith('md-')) {
        await new Promise(r => setTimeout(r, 1200));
        toast.success('RDV confirmé !');
        navigate('/confirmation', { state: { clinique, medecin, creneau, patient, specialite, reference: 'MC-RDV-' + Math.random().toString(36).slice(2,8).toUpperCase() } });
        return;
      }

      const resp = await fetch(`${API}/public/rdv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await resp.json();
      if (!data.success) throw new Error(data.message);
      toast.success('RDV confirmé !');
      navigate('/confirmation', { state: { clinique, medecin, creneau, patient, specialite, reference: data.data.reference, code_secret: data.data.code_secret } });
    } catch (err) {
      toast.error(err.message || 'Erreur. Réessayez.');
    } finally {
      setSaving(false);
    }
  };

  const inp = (label, key, obj, setObj, props = {}) => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#8BA0B5', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>{label}</label>
      <input value={obj[key]} onChange={e => setObj(p => ({ ...p, [key]: e.target.value }))} {...props}
        style={{ width: '100%', background: '#1A2535', border: '1.5px solid #1E2F42', borderRadius: 10, padding: '11px 14px', color: '#F0F4F8', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', ...props.style }}
        onFocus={e => e.target.style.borderColor = '#0A8F58'} onBlur={e => e.target.style.borderColor = '#1E2F42'} />
    </div>
  );

  const sel = (label, val, setVal, options) => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#8BA0B5', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>{label}</label>
      <select value={val} onChange={e => setVal(e.target.value)}
        style={{ width: '100%', background: '#1A2535', border: '1.5px solid #1E2F42', borderRadius: 10, padding: '11px 14px', color: '#F0F4F8', fontSize: 14, outline: 'none', fontFamily: 'inherit' }}>
        {options.map(o => typeof o === 'string' ? <option key={o}>{o}</option> : <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );

  const STEPS = ['Établissement','Médecin','Créneau','Informations','Confirmation'];

  return (
    <div style={{ background: '#060C12', minHeight: '100vh', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Header */}
      <div style={{ background: 'rgba(14,22,32,.97)', borderBottom: '1px solid rgba(255,255,255,.06)', padding: '0 5%', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <button onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer' }}>
          <div style={{ width: 32, height: 32, background: '#0A8F58', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: 16 }}>+</div>
          <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16, color: '#F0F4F8' }}>MediConnect <span style={{ color: '#0A8F58' }}>RDV</span></span>
        </button>
        <div style={{ fontSize: 12, color: '#4E657A' }}>Gratuit · Sans inscription · Confirmé en 60s</div>
      </div>

      {/* Stepper */}
      <div style={{ background: '#0E1620', borderBottom: '1px solid #1E2F42', padding: '14px 5%' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', gap: 4, alignItems: 'center' }}>
          {STEPS.map((l, i) => (
            <React.Fragment key={l}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: step > i+1 ? '#0A8F58' : step === i+1 ? '#0A8F58' : '#1A2535', border: `2px solid ${step >= i+1 ? '#0A8F58' : '#1E2F42'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: step >= i+1 ? '#fff' : '#4E657A', marginBottom: 3, transition: 'all .3s' }}>
                  {step > i+1 ? '✓' : i+1}
                </div>
                <div style={{ fontSize: 9, color: step === i+1 ? '#0A8F58' : step > i+1 ? '#8BA0B5' : '#4E657A', fontWeight: step === i+1 ? 700 : 400, whiteSpace: 'nowrap' }}>{l}</div>
              </div>
              {i < STEPS.length - 1 && <div style={{ height: 2, flex: 2, background: step > i+1 ? '#0A8F58' : '#1E2F42', marginBottom: 16, transition: 'background .3s', borderRadius: 1 }} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 5% 80px' }}>

        {/* STEP 1 — Établissement */}
        {step === 1 && (
          <div>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, color: '#F0F4F8', marginBottom: 6, fontWeight: 400 }}>Choisissez un établissement</h2>
            <p style={{ color: '#8BA0B5', marginBottom: 24, fontSize: 13 }}>Filtrez par ville et spécialité</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, background: '#141E2B', border: '1px solid #1E2F42', borderRadius: 12, padding: 18, marginBottom: 20 }}>
              {sel('Pays', pays, code => { setPays(code); const p = PAYS.find(x=>x.code===code); if (p) setVille(p.ville); }, PAYS.map(p=>p.code))}
              {sel('Ville', ville, setVille, VILLES)}
              {sel('Spécialité', specialite, setSpecialite, [{ v: '', l: 'Toutes les spécialités' }, ...SPECIALITES.map(s => ({ v: s, l: s }))])}
            </div>
            {loading && <div style={{ textAlign: 'center', padding: 32, color: '#4E657A' }}>⏳ Chargement des établissements…</div>}
            {!loading && <>
              <div style={{ fontSize: 12, color: '#4E657A', marginBottom: 14 }}>{cliniques.length} établissement(s) — données {cliniques[0]?.id?.startsWith('demo-') ? 'de démonstration' : 'en temps réel'}</div>
              {cliniques.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#4E657A' }}><div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div><div>Aucun établissement pour ces critères.</div></div>}
              {cliniques.map(c => (
                <div key={c.id} onClick={() => { setClinique(c); setMedecin(null); setCreneau(''); setStep(2); }}
                  style={{ background: '#141E2B', border: `1.5px solid ${clinique?.id === c.id ? '#0A8F58' : '#1E2F42'}`, borderRadius: 14, padding: 18, marginBottom: 10, cursor: 'pointer', transition: 'all .15s' }}
                  onMouseOver={e => e.currentTarget.style.borderColor = '#0A8F58'}
                  onMouseOut={e => e.currentTarget.style.borderColor = clinique?.id === c.id ? '#0A8F58' : '#1E2F42'}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <span style={{ fontSize: 22 }}>🏥</span>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#F0F4F8' }}>{c.nom}</div>
                      </div>
                      <div style={{ fontSize: 12, color: '#8BA0B5', marginBottom: 8 }}>📍 {c.adresse || c.quartier} · 📞 {c.telephone}</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {(c.specialites || []).filter(Boolean).map(s => (
                          <span key={s} style={{ background: specialite === s ? 'rgba(10,143,88,.2)' : 'rgba(255,255,255,.06)', color: specialite === s ? '#0A8F58' : '#8BA0B5', fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 500 }}>{s}</span>
                        ))}
                      </div>
                    </div>
                    <div style={{ flexShrink: 0, textAlign: 'right' }}>
                      <div style={{ background: 'rgba(10,143,88,.1)', border: '1px solid rgba(10,143,88,.2)', borderRadius: 8, padding: '5px 12px', fontSize: 11, color: '#0A8F58', fontWeight: 700, marginBottom: 4 }}>
                        {c.nb_medecins} médecin(s)
                      </div>
                      <div style={{ fontSize: 11, color: '#4E657A' }}>Sélectionner →</div>
                    </div>
                  </div>
                </div>
              ))}
            </>}
          </div>
        )}

        {/* STEP 2 — Médecin */}
        {step === 2 && (
          <div>
            <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: '#8BA0B5', cursor: 'pointer', fontSize: 13, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 6 }}>← Retour</button>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, color: '#F0F4F8', marginBottom: 6, fontWeight: 400 }}>Choisissez un médecin</h2>
            <div style={{ background: 'rgba(10,143,88,.07)', border: '1px solid rgba(10,143,88,.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#8BA0B5' }}>
              🏥 <strong style={{ color: '#F0F4F8' }}>{clinique?.nom}</strong> · {clinique?.ville || clinique?.adresse}
            </div>
            {sel('Spécialité', specialite, v => { setSpecialite(v); setMedecin(null); setCreneau(''); }, [{ v: '', l: '— Choisir une spécialité —' }, ...SPECIALITES.map(s => ({ v: s, l: s }))])}
            {!specialite && <div style={{ textAlign: 'center', padding: 32, color: '#4E657A', fontSize: 13 }}>Sélectionnez une spécialité pour voir les médecins disponibles.</div>}
            {specialite && medecins.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: '#4E657A' }}><div style={{ fontSize: 32, marginBottom: 10 }}>👨‍⚕️</div>Aucun médecin disponible pour cette spécialité.</div>}
            {medecins.map(m => (
              <div key={m.id} style={{ background: '#141E2B', border: `1.5px solid ${medecin?.id === m.id ? '#0A8F58' : '#1E2F42'}`, borderRadius: 14, padding: 18, marginBottom: 10, cursor: 'pointer', transition: 'all .15s' }}
                onMouseOver={e => e.currentTarget.style.borderColor = '#0A8F58'}
                onMouseOut={e => e.currentTarget.style.borderColor = medecin?.id === m.id ? '#0A8F58' : '#1E2F42'}
                onClick={() => { setMedecin(m); setCreneau(''); }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: medecin?.id === m.id ? 12 : 0 }}>
                  <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg,#0A8F58,#0D9488)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: 15, flexShrink: 0 }}>
                    {m.prenom[0]}{m.nom[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#F0F4F8' }}>Dr. {m.prenom} {m.nom}</div>
                    <div style={{ fontSize: 12, color: '#8BA0B5' }}>{m.specialite} · {m.experience_ans} ans d'expérience</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#0A8F58' }}>{fmt(m.tarif)} F</div>
                    <div style={{ fontSize: 10, color: '#4E657A' }}>consultation</div>
                  </div>
                </div>

                {medecin?.id === m.id && (
                  <div style={{ background: 'rgba(10,143,88,.06)', borderRadius: 10, padding: 14, marginTop: 4 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#0A8F58', marginBottom: 10 }}>📅 Créneaux disponibles</div>
                    {dispos.length === 0
                      ? <div style={{ color: '#4E657A', fontSize: 12 }}>Chargement des disponibilités…</div>
                      : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {dispos.slice(0, 16).map(d => (
                            <button key={d} onClick={e => { e.stopPropagation(); setCreneau(d); }}
                              style={{ background: creneau === d ? '#0A8F58' : 'rgba(255,255,255,.06)', color: creneau === d ? '#fff' : '#F0F4F8', border: `1px solid ${creneau === d ? '#0A8F58' : 'rgba(255,255,255,.1)'}`, borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }}>
                              {fmtDate(d)}
                            </button>
                          ))}
                        </div>
                    }
                  </div>
                )}
              </div>
            ))}
            {medecin && creneau && (
              <button onClick={() => setStep(3)} style={{ width: '100%', background: 'linear-gradient(135deg,#0A8F58,#0D9488)', color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 8, boxShadow: '0 8px 24px rgba(10,143,88,.3)' }}>
                Confirmer ce médecin et ce créneau →
              </button>
            )}
          </div>
        )}

        {/* STEP 3 — Créneau récapitulatif */}
        {step === 3 && (
          <div>
            <button onClick={() => setStep(2)} style={{ background: 'none', border: 'none', color: '#8BA0B5', cursor: 'pointer', fontSize: 13, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 6 }}>← Retour</button>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, color: '#F0F4F8', marginBottom: 6, fontWeight: 400 }}>Votre sélection</h2>
            <div style={{ background: '#141E2B', border: '1px solid #1E2F42', borderRadius: 14, padding: 22, marginBottom: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {[['🏥 Établissement', clinique?.nom], ['📍 Adresse', clinique?.adresse || clinique?.quartier || clinique?.ville], ['👨‍⚕️ Médecin', `Dr. ${medecin?.prenom} ${medecin?.nom}`], ['🩺 Spécialité', specialite], ['📅 Date & Heure', fmtDate(creneau)], ['💰 Tarif', `${fmt(medecin?.tarif)} FCFA`]].map(([k,v]) => (
                  <div key={k} style={{ background: '#1A2535', borderRadius: 8, padding: '10px 14px' }}>
                    <div style={{ fontSize: 10, color: '#4E657A', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>{k}</div>
                    <div style={{ fontSize: 13, color: '#F0F4F8', fontWeight: 600 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#8BA0B5', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>Motif de la consultation (optionnel)</label>
              <textarea value={patient.motif} onChange={e => setPatient(p => ({ ...p, motif: e.target.value }))} rows={3} placeholder="Décrivez votre motif de consultation…"
                style={{ width: '100%', background: '#1A2535', border: '1.5px solid #1E2F42', borderRadius: 10, padding: '12px', color: '#F0F4F8', fontSize: 14, resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = '#0A8F58'} onBlur={e => e.target.style.borderColor = '#1E2F42'} />
            </div>
            <button onClick={() => setStep(4)} style={{ width: '100%', background: 'linear-gradient(135deg,#0A8F58,#0D9488)', color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              Continuer → Mes informations
            </button>
          </div>
        )}

        {/* STEP 4 — Informations patient */}
        {step === 4 && (
          <div>
            <button onClick={() => setStep(3)} style={{ background: 'none', border: 'none', color: '#8BA0B5', cursor: 'pointer', fontSize: 13, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 6 }}>← Retour</button>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, color: '#F0F4F8', marginBottom: 6, fontWeight: 400 }}>Vos informations</h2>
            <p style={{ color: '#8BA0B5', marginBottom: 22, fontSize: 13 }}>Ces informations sont nécessaires pour confirmer votre rendez-vous</p>

            {/* Statut */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#8BA0B5', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>Vous prenez ce RDV en tant que *</label>
              <div style={{ display: 'flex', gap: 12 }}>
                {['patient','accompagnant'].map(s => (
                  <button key={s} onClick={() => setStatut(s)} style={{ flex: 1, background: statut === s ? 'rgba(10,143,88,.12)' : '#141E2B', border: `2px solid ${statut === s ? '#0A8F58' : '#1E2F42'}`, borderRadius: 12, padding: '14px 12px', cursor: 'pointer', textAlign: 'center', transition: 'all .15s' }}>
                    <div style={{ fontSize: 22, marginBottom: 5 }}>{s === 'patient' ? '👤' : '👥'}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: statut === s ? '#0A8F58' : '#F0F4F8' }}>{s === 'patient' ? 'Le patient' : 'Un accompagnant'}</div>
                    <div style={{ fontSize: 11, color: '#8BA0B5', marginTop: 3 }}>{s === 'patient' ? 'Je consulte pour moi' : 'Je consulte pour un proche'}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Accompagnant */}
            {statut === 'accompagnant' && (
              <div style={{ background: 'rgba(217,119,6,.06)', border: '1px solid rgba(217,119,6,.2)', borderRadius: 12, padding: 18, marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#D97706', marginBottom: 14 }}>👥 Vos coordonnées (l'accompagnant)</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {inp('Votre prénom *', 'prenom', accomp, setAccomp, { placeholder: 'Votre prénom' })}
                  {inp('Votre nom *', 'nom', accomp, setAccomp, { placeholder: 'Votre nom' })}
                  {inp('Votre téléphone *', 'telephone', accomp, setAccomp, { placeholder: '+225 07 00 00 00 00', type: 'tel' })}
                  {sel('Votre relation avec le patient', accomp.relation, v => setAccomp(p => ({ ...p, relation: v })), RELATIONS)}
                </div>
              </div>
            )}

            {/* Patient */}
            <div style={{ background: '#141E2B', border: '1px solid #1E2F42', borderRadius: 12, padding: 18, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0A8F58', marginBottom: 14 }}>
                {statut === 'patient' ? '👤 Vos informations' : '👤 Informations du patient'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {inp('Prénom *', 'prenom', patient, setPatient, { placeholder: 'Prénom du patient' })}
                {inp('Nom *', 'nom', patient, setPatient, { placeholder: 'Nom du patient' })}
                {inp('Téléphone *', 'telephone', patient, setPatient, { placeholder: '+225 07 00 00 00 00', type: 'tel' })}
                {inp('Email', 'email', patient, setPatient, { placeholder: 'email@exemple.com', type: 'email' })}
                {sel('Ville de résidence', patient.ville_residence, v => setPatient(p => ({ ...p, ville_residence: v })), VILLES)}
                {sel('Assurance santé', patient.assurance, v => setPatient(p => ({ ...p, assurance: v })), ASSURANCES)}
              </div>
              {patient.assurance !== 'Aucune' && inp('N° Police / Matricule assuré', 'numero_police', patient, setPatient, { placeholder: 'POL-2024-XXXXX' })}
            </div>

            <div style={{ background: 'rgba(10,143,88,.05)', border: '1px solid rgba(10,143,88,.12)', borderRadius: 10, padding: '12px 16px', marginBottom: 18, fontSize: 12, color: '#8BA0B5', lineHeight: 1.6 }}>
              🔒 Vos données sont protégées et utilisées uniquement pour ce rendez-vous, conformément à la politique de confidentialité de MediConnect.
            </div>

            <button onClick={() => { if (!patient.prenom || !patient.nom || !patient.telephone) { toast.error('Prénom, nom et téléphone requis'); return; } setStep(5); }}
              style={{ width: '100%', background: 'linear-gradient(135deg,#0A8F58,#0D9488)', color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              Vérifier et confirmer →
            </button>
          </div>
        )}

        {/* STEP 5 — Récapitulatif */}
        {step === 5 && (
          <div>
            <button onClick={() => setStep(4)} style={{ background: 'none', border: 'none', color: '#8BA0B5', cursor: 'pointer', fontSize: 13, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 6 }}>← Modifier</button>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, color: '#F0F4F8', marginBottom: 6, fontWeight: 400 }}>Récapitulatif final</h2>
            <p style={{ color: '#8BA0B5', marginBottom: 22, fontSize: 13 }}>Vérifiez avant de confirmer</p>

            <div style={{ background: '#141E2B', border: '1px solid #1E2F42', borderRadius: 14, padding: 20, marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0A8F58', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 14 }}>📅 Rendez-vous</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[['Établissement', clinique?.nom], ['Adresse', clinique?.adresse || clinique?.quartier || clinique?.ville], ['Médecin', `Dr. ${medecin?.prenom} ${medecin?.nom}`], ['Spécialité', specialite], ['Date & Heure', fmtDate(creneau)], ['Tarif', `${fmt(medecin?.tarif)} FCFA`]].map(([k,v]) => (
                  <div key={k} style={{ background: '#1A2535', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: 10, color: '#4E657A', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>{k}</div>
                    <div style={{ fontSize: 13, color: '#F0F4F8', fontWeight: 600 }}>{v}</div>
                  </div>
                ))}
              </div>
              {patient.motif && <div style={{ marginTop: 10, background: '#1A2535', borderRadius: 8, padding: '10px 12px' }}><div style={{ fontSize: 10, color: '#4E657A', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Motif</div><div style={{ fontSize: 13, color: '#F0F4F8' }}>{patient.motif}</div></div>}
            </div>

            <div style={{ background: '#141E2B', border: '1px solid #1E2F42', borderRadius: 14, padding: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0A8F58', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 14 }}>👤 Patient</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[['Nom complet', `${patient.prenom} ${patient.nom}`], ['Téléphone', patient.telephone], ['Email', patient.email || '—'], ['Ville', patient.ville_residence], ['Statut', statut === 'patient' ? 'Patient direct' : `Via accompagnant : ${accomp.prenom} ${accomp.nom} (${accomp.relation})`], ['Assurance', patient.assurance + (patient.numero_police ? ` · ${patient.numero_police}` : '')]].map(([k,v]) => (
                  <div key={k} style={{ background: '#1A2535', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: 10, color: '#4E657A', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>{k}</div>
                    <div style={{ fontSize: 13, color: '#F0F4F8', fontWeight: 600 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={submitRDV} disabled={saving}
              style={{ width: '100%', background: saving ? '#1A2535' : 'linear-gradient(135deg,#0A8F58,#0D9488)', color: saving ? '#8BA0B5' : '#fff', border: 'none', borderRadius: 12, padding: 16, fontSize: 16, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: saving ? 'none' : '0 8px 32px rgba(10,143,88,.35)', transition: 'all .15s', marginBottom: 12 }}>
              {saving ? '⏳ Confirmation en cours…' : '✅ Confirmer mon rendez-vous'}
            </button>
            <div style={{ textAlign: 'center', fontSize: 12, color: '#4E657A' }}>
              Confirmation par SMS et email · Annulation gratuite 24h avant
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
