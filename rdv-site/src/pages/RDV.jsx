import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { V, hexToRgba } from '../theme';

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

// ── Flux autonome laboratoire / imagerie ────────────────────────────
// Compose separement du flux clinique (qui garde son propre etat par
// etapes numerotees 1-5) pour eviter tout risque de regression sur un
// parcours deja fonctionnel : ce composant ne touche a aucune ligne du
// flux clinique existant. Il n'y a pas de "medecin" a choisir pour un
// laboratoire ou un centre d'imagerie -- juste un creneau direct.
function FluxLaboImagerie({ preselection }) {
  const navigate = useNavigate();
  const [etapeLI, setEtapeLI] = useState(1); // 1: creneau, 2: infos patient, 3: envoi
  const [chargementDispos, setChargementDispos] = useState(true);
  const [dispos, setDispos] = useState([]);
  const [creneau, setCreneau] = useState('');
  const [saving, setSaving] = useState(false);
  const [patient, setPatient] = useState({ prenom: '', nom: '', telephone: '', email: '', motif: '' });

  useEffect(() => {
    setChargementDispos(true);
    fetch(`${API}/public/etablissements/${preselection.type}/${preselection.id}/disponibilites`)
      .then(r => r.json())
      .then(d => setDispos(d.data || []))
      .catch(() => setDispos([]))
      .finally(() => setChargementDispos(false));
    // eslint-disable-next-line
  }, []);

  const soumettre = async () => {
    if (!patient.prenom || !patient.nom || !patient.telephone) {
      toast.error('Prénom, nom et téléphone obligatoires');
      return;
    }
    setSaving(true);
    try {
      const body = {
        prestataire_type: preselection.type,
        prestataire_id: preselection.id,
        date_rdv: creneau.split(' ')[0],
        heure_rdv: creneau.split(' ')[1],
        motif: patient.motif,
        patient_prenom: patient.prenom,
        patient_nom: patient.nom,
        patient_telephone: patient.telephone,
        patient_email: patient.email,
      };
      const resp = await fetch(`${API}/public/rdv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await resp.json();
      if (!data.success) throw new Error(data.message);
      toast.success('RDV confirmé !');
      navigate('/confirmation', {
        state: {
          clinique: { nom: preselection.nom, ville: preselection.ville },
          medecin: null,
          creneau, patient,
          specialite: preselection.type === 'laboratoire' ? 'Analyse de laboratoire' : 'Examen d\'imagerie',
          reference: data.data.reference,
          code_secret: data.data.code_secret,
        },
      });
    } catch (err) {
      toast.error(err.message || 'Erreur. Réessayez.');
    } finally {
      setSaving(false);
    }
  };

  const icone = preselection.type === 'laboratoire' ? '🧪' : '🩻';
  const libelleType = preselection.type === 'laboratoire' ? 'Laboratoire' : "Centre d'imagerie";

  return (
    <div style={{ minHeight: '100vh', background: V.bg, padding: '32px 5%', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <span style={{ fontSize: 32 }}>{icone}</span>
          <div>
            <div style={{ fontSize: 11, color: V.teal, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px' }}>{libelleType}</div>
            <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: V.text, fontWeight: 400 }}>{preselection.nom}</h1>
          </div>
        </div>

        {etapeLI === 1 && (
          <div>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: V.text, marginBottom: 14, fontWeight: 400 }}>Choisissez un créneau</h2>
            {chargementDispos ? (
              <div style={{ textAlign: 'center', padding: 40, color: V.dim }}>⏳ Chargement des disponibilités…</div>
            ) : dispos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, background: V.card, border: `1px solid ${V.border}`, borderRadius: 16, color: V.dim }}>
                Aucun créneau disponible pour le moment. Contactez directement l'établissement.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 8, maxHeight: 360, overflowY: 'auto', marginBottom: 20 }}>
                {dispos.map(c => (
                  <button key={c} onClick={() => setCreneau(c)}
                    style={{
                      padding: '10px 8px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                      border: `1.5px solid ${creneau === c ? V.green : V.border}`,
                      background: creneau === c ? hexToRgba(V.green, .15) : V.input,
                      color: creneau === c ? V.green : V.muted,
                    }}>
                    {fmtDate(c)}
                  </button>
                ))}
              </div>
            )}
            <button disabled={!creneau} onClick={() => setEtapeLI(2)}
              style={{ width: '100%', background: creneau ? `linear-gradient(135deg,${V.green},${V.teal})` : V.hover, color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontSize: 15, fontWeight: 700, cursor: creneau ? 'pointer' : 'not-allowed' }}>
              Continuer → Mes informations
            </button>
          </div>
        )}

        {etapeLI === 2 && (
          <div>
            <button onClick={() => setEtapeLI(1)} style={{ background: 'none', border: 'none', color: V.muted, cursor: 'pointer', fontSize: 13, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 6 }}>← Retour</button>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: V.text, marginBottom: 6, fontWeight: 400 }}>Vos informations</h2>
            <div style={{ background: V.input, border: `1px solid ${V.border}`, borderRadius: 12, padding: '10px 14px', marginBottom: 18, fontSize: 13, color: V.muted }}>
              📅 {fmtDate(creneau)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: V.muted, textTransform: 'uppercase', marginBottom: 5 }}>Prénom *</label>
                <input value={patient.prenom} onChange={e => setPatient(p => ({ ...p, prenom: e.target.value }))}
                  style={{ width: '100%', background: V.hover, border: `1.5px solid ${V.border}`, borderRadius: 10, padding: 12, color: V.text, fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: V.muted, textTransform: 'uppercase', marginBottom: 5 }}>Nom *</label>
                <input value={patient.nom} onChange={e => setPatient(p => ({ ...p, nom: e.target.value }))}
                  style={{ width: '100%', background: V.hover, border: `1.5px solid ${V.border}`, borderRadius: 10, padding: 12, color: V.text, fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: V.muted, textTransform: 'uppercase', marginBottom: 5 }}>Téléphone *</label>
              <input value={patient.telephone} onChange={e => setPatient(p => ({ ...p, telephone: e.target.value }))} placeholder="+225 07 00 00 00"
                style={{ width: '100%', background: V.hover, border: `1.5px solid ${V.border}`, borderRadius: 10, padding: 12, color: V.text, fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: V.muted, textTransform: 'uppercase', marginBottom: 5 }}>Email (optionnel)</label>
              <input value={patient.email} onChange={e => setPatient(p => ({ ...p, email: e.target.value }))}
                style={{ width: '100%', background: V.hover, border: `1.5px solid ${V.border}`, borderRadius: 10, padding: 12, color: V.text, fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: V.muted, textTransform: 'uppercase', marginBottom: 5 }}>Motif (optionnel)</label>
              <textarea value={patient.motif} onChange={e => setPatient(p => ({ ...p, motif: e.target.value }))} rows={3}
                placeholder={preselection.type === 'laboratoire' ? 'Ex: bilan sanguin prescrit par mon médecin…' : 'Ex: radiographie du genou droit…'}
                style={{ width: '100%', background: V.hover, border: `1.5px solid ${V.border}`, borderRadius: 10, padding: 12, color: V.text, fontSize: 14, resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>
            <button onClick={soumettre} disabled={saving}
              style={{ width: '100%', background: `linear-gradient(135deg,${V.green},${V.teal})`, color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontSize: 15, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? .7 : 1 }}>
              {saving ? '⏳ Confirmation en cours…' : 'Confirmer le rendez-vous'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RDV() {
  const navigate = useNavigate();
  const location = useLocation();
  const preselectionBrute = location.state?.etablissementPreselectionne || null;
  if (preselectionBrute && preselectionBrute.type !== 'clinique') {
    return <FluxLaboImagerie preselection={preselectionBrute} />;
  }
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
  const [chargementDispos, setChargementDispos] = useState(false);
  const [rechercheValeur, setRechercheValeur] = useState('');
  const [rechercheEnCours, setRechercheEnCours] = useState(false);
  useEffect(() => {
    if (!medecin) return;
    if (medecin.id.startsWith('md-')) {
      setDispos(genDispo());
      return;
    }
    setChargementDispos(true);
    fetch(`${API}/public/medecins/${medecin.id}/disponibilites`)
      .then(r => r.json())
      .then(d => setDispos((d.data && d.data.length) ? d.data : []))
      .catch(() => setDispos([]))
      .finally(() => setChargementDispos(false));
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
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: V.muted, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>{label}</label>
      <input value={obj[key]} onChange={e => setObj(p => ({ ...p, [key]: e.target.value }))} {...props}
        style={{ width: '100%', background: V.hover, border: `1.5px solid ${V.border}`, borderRadius: 10, padding: '11px 14px', color: V.text, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', ...props.style }}
        onFocus={e => e.target.style.borderColor = V.green} onBlur={e => e.target.style.borderColor = V.border} />
    </div>
  );

  const sel = (label, val, setVal, options) => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: V.muted, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>{label}</label>
      <select value={val} onChange={e => setVal(e.target.value)}
        style={{ width: '100%', background: V.hover, border: `1.5px solid ${V.border}`, borderRadius: 10, padding: '11px 14px', color: V.text, fontSize: 14, outline: 'none', fontFamily: 'inherit' }}>
        {options.map(o => typeof o === 'string' ? <option key={o}>{o}</option> : <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );

  const STEPS = ['Établissement','Médecin','Créneau','Informations','Confirmation'];

  return (
    <div style={{ background: V.bg, minHeight: '100vh', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Header */}
      <div style={{ background: hexToRgba(V.card, .97), borderBottom: `1px solid ${hexToRgba(V.text, .06)}`, padding: '0 5%', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <button onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer' }}>
          <span style={{ fontSize: 15, color: V.muted }}>←</span>
          <div style={{ width: 32, height: 32, background: V.green, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: 16 }}>+</div>
          <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16, color: V.text }}>MediConnect <span style={{ color: V.green }}>RDV</span></span>
        </button>
        <div style={{ fontSize: 12, color: V.dim }}>Gratuit · Sans inscription · Confirmé en 60s</div>
      </div>

      {/* Stepper */}
      <div style={{ background: V.card, borderBottom: `1px solid ${V.border}`, padding: '14px 5%' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', gap: 4, alignItems: 'center' }}>
          {STEPS.map((l, i) => (
            <React.Fragment key={l}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: step > i+1 ? V.green : step === i+1 ? V.green : V.hover, border: `2px solid ${step >= i+1 ? V.green : V.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: step >= i+1 ? '#fff' : V.dim, marginBottom: 3, transition: 'all .3s' }}>
                  {step > i+1 ? '✓' : i+1}
                </div>
                <div style={{ fontSize: 9, color: step === i+1 ? V.green : step > i+1 ? V.muted : V.dim, fontWeight: step === i+1 ? 700 : 400, whiteSpace: 'nowrap' }}>{l}</div>
              </div>
              {i < STEPS.length - 1 && <div style={{ height: 2, flex: 2, background: step > i+1 ? V.green : V.border, marginBottom: 16, transition: 'background .3s', borderRadius: 1 }} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 5% 80px' }}>

        {/* STEP 1 — Établissement */}
        {step === 1 && (
          <div>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, color: V.text, marginBottom: 6, fontWeight: 400 }}>Choisissez un établissement</h2>
            <p style={{ color: V.muted, marginBottom: 24, fontSize: 13 }}>Filtrez par ville et spécialité</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, background: V.input, border: `1px solid ${V.border}`, borderRadius: 12, padding: 18, marginBottom: 20 }}>
              {sel('Pays', pays, code => { setPays(code); const p = PAYS.find(x=>x.code===code); if (p) setVille(p.ville); }, PAYS.map(p=>p.code))}
              {sel('Ville', ville, setVille, VILLES)}
              {sel('Spécialité', specialite, setSpecialite, [{ v: '', l: 'Toutes les spécialités' }, ...SPECIALITES.map(s => ({ v: s, l: s }))])}
            </div>
            {loading && <div style={{ textAlign: 'center', padding: 32, color: V.dim }}>⏳ Chargement des établissements…</div>}
            {!loading && <>
              <div style={{ fontSize: 12, color: V.dim, marginBottom: 14 }}>{cliniques.length} établissement(s) — données {cliniques[0]?.id?.startsWith('demo-') ? 'de démonstration' : 'en temps réel'}</div>
              {cliniques.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: V.dim }}><div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div><div>Aucun établissement pour ces critères.</div></div>}
              {cliniques.map(c => (
                <div key={c.id} onClick={() => { setClinique(c); setMedecin(null); setCreneau(''); setStep(2); }}
                  style={{ background: V.input, border: `1.5px solid ${clinique?.id === c.id ? V.green : V.border}`, borderRadius: 14, padding: 18, marginBottom: 10, cursor: 'pointer', transition: 'all .15s' }}
                  onMouseOver={e => e.currentTarget.style.borderColor = V.green}
                  onMouseOut={e => e.currentTarget.style.borderColor = clinique?.id === c.id ? V.green : V.border}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <span style={{ fontSize: 22 }}>🏥</span>
                        <div style={{ fontSize: 15, fontWeight: 700, color: V.text }}>{c.nom}</div>
                      </div>
                      <div style={{ fontSize: 12, color: V.muted, marginBottom: 8 }}>📍 {c.adresse || c.quartier} · 📞 {c.telephone}</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {(c.specialites || []).filter(Boolean).map(s => (
                          <span key={s} style={{ background: specialite === s ? hexToRgba(V.green, .2) : hexToRgba(V.text, .06), color: specialite === s ? V.green : V.muted, fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 500 }}>{s}</span>
                        ))}
                      </div>
                    </div>
                    <div style={{ flexShrink: 0, textAlign: 'right' }}>
                      <div style={{ background: hexToRgba(V.green, .1), border: `1px solid ${hexToRgba(V.green, .2)}`, borderRadius: 8, padding: '5px 12px', fontSize: 11, color: V.green, fontWeight: 700, marginBottom: 4 }}>
                        {c.nb_medecins} médecin(s)
                      </div>
                      <div style={{ fontSize: 11, color: V.dim }}>Sélectionner →</div>
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
            <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: V.muted, cursor: 'pointer', fontSize: 13, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 6 }}>← Retour</button>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, color: V.text, marginBottom: 6, fontWeight: 400 }}>Choisissez un médecin</h2>
            <div style={{ background: hexToRgba(V.green, .07), border: `1px solid ${hexToRgba(V.green, .2)}`, borderRadius: 10, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: V.muted }}>
              🏥 <strong style={{ color: V.text }}>{clinique?.nom}</strong> · {clinique?.ville || clinique?.adresse}
            </div>
            {sel('Spécialité', specialite, v => { setSpecialite(v); setMedecin(null); setCreneau(''); }, [{ v: '', l: '— Choisir une spécialité —' }, ...SPECIALITES.map(s => ({ v: s, l: s }))])}
            {!specialite && <div style={{ textAlign: 'center', padding: 32, color: V.dim, fontSize: 13 }}>Sélectionnez une spécialité pour voir les médecins disponibles.</div>}
            {specialite && medecins.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: V.dim }}><div style={{ fontSize: 32, marginBottom: 10 }}>👨‍⚕️</div>Aucun médecin disponible pour cette spécialité.</div>}
            {medecins.map(m => (
              <div key={m.id} style={{ background: V.input, border: `1.5px solid ${medecin?.id === m.id ? V.green : V.border}`, borderRadius: 14, padding: 18, marginBottom: 10, cursor: 'pointer', transition: 'all .15s' }}
                onMouseOver={e => e.currentTarget.style.borderColor = V.green}
                onMouseOut={e => e.currentTarget.style.borderColor = medecin?.id === m.id ? V.green : V.border}
                onClick={() => { setMedecin(m); setCreneau(''); }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: medecin?.id === m.id ? 12 : 0 }}>
                  <div style={{ width: 44, height: 44, background: `linear-gradient(135deg,${V.green},${V.teal})`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: 15, flexShrink: 0 }}>
                    {m.prenom[0]}{m.nom[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: V.text }}>Dr. {m.prenom} {m.nom}</div>
                    <div style={{ fontSize: 12, color: V.muted }}>{m.specialite} · {m.experience_ans} ans d'expérience</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: V.green }}>{fmt(m.tarif)} F</div>
                    <div style={{ fontSize: 10, color: V.dim }}>consultation</div>
                  </div>
                </div>

                {medecin?.id === m.id && (
                  <div style={{ background: hexToRgba(V.green, .06), borderRadius: 10, padding: 14, marginTop: 4 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: V.green, marginBottom: 10 }}>📅 Créneaux disponibles</div>
                    {chargementDispos
                      ? <div style={{ color: V.dim, fontSize: 12 }}>⏳ Chargement des disponibilités…</div>
                      : dispos.length === 0
                      ? <div style={{ color: V.dim, fontSize: 12 }}>Aucun créneau disponible actuellement pour ce médecin — contactez directement la clinique.</div>
                      : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {dispos.slice(0, 16).map(d => (
                            <button key={d} onClick={e => { e.stopPropagation(); setCreneau(d); }}
                              style={{ background: creneau === d ? V.green : hexToRgba(V.text, .06), color: creneau === d ? '#fff' : V.text, border: `1px solid ${creneau === d ? V.green : hexToRgba(V.text, .1)}`, borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }}>
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
              <button onClick={() => setStep(3)} style={{ width: '100%', background: `linear-gradient(135deg,${V.green},${V.teal})`, color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 8, boxShadow: '0 8px 24px rgba(10,143,88,.3)' }}>
                Confirmer ce médecin et ce créneau →
              </button>
            )}
          </div>
        )}

        {/* STEP 3 — Créneau récapitulatif */}
        {step === 3 && (
          <div>
            <button onClick={() => setStep(2)} style={{ background: 'none', border: 'none', color: V.muted, cursor: 'pointer', fontSize: 13, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 6 }}>← Retour</button>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, color: V.text, marginBottom: 6, fontWeight: 400 }}>Votre sélection</h2>
            <div style={{ background: V.input, border: `1px solid ${V.border}`, borderRadius: 14, padding: 22, marginBottom: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {[['🏥 Établissement', clinique?.nom], ['📍 Adresse', clinique?.adresse || clinique?.quartier || clinique?.ville], ['👨‍⚕️ Médecin', `Dr. ${medecin?.prenom} ${medecin?.nom}`], ['🩺 Spécialité', specialite], ['📅 Date & Heure', fmtDate(creneau)], ['💰 Tarif', `${fmt(medecin?.tarif)} FCFA`]].map(([k,v]) => (
                  <div key={k} style={{ background: V.hover, borderRadius: 8, padding: '10px 14px' }}>
                    <div style={{ fontSize: 10, color: V.dim, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>{k}</div>
                    <div style={{ fontSize: 13, color: V.text, fontWeight: 600 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: V.muted, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>Motif de la consultation (optionnel)</label>
              <textarea value={patient.motif} onChange={e => setPatient(p => ({ ...p, motif: e.target.value }))} rows={3} placeholder="Décrivez votre motif de consultation…"
                style={{ width: '100%', background: V.hover, border: `1.5px solid ${V.border}`, borderRadius: 10, padding: '12px', color: V.text, fontSize: 14, resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = V.green} onBlur={e => e.target.style.borderColor = V.border} />
            </div>
            <button onClick={() => setStep(4)} style={{ width: '100%', background: `linear-gradient(135deg,${V.green},${V.teal})`, color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              Continuer → Mes informations
            </button>
          </div>
        )}

        {/* STEP 4 — Informations patient */}
        {step === 4 && (
          <div>
            <button onClick={() => setStep(3)} style={{ background: 'none', border: 'none', color: V.muted, cursor: 'pointer', fontSize: 13, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 6 }}>← Retour</button>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, color: V.text, marginBottom: 6, fontWeight: 400 }}>Vos informations</h2>
            <p style={{ color: V.muted, marginBottom: 22, fontSize: 13 }}>Ces informations sont nécessaires pour confirmer votre rendez-vous</p>

            {/* Statut */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: V.muted, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>Vous prenez ce RDV en tant que *</label>
              <div style={{ display: 'flex', gap: 12 }}>
                {['patient','accompagnant'].map(s => (
                  <button key={s} onClick={() => setStatut(s)} style={{ flex: 1, background: statut === s ? hexToRgba(V.green, .12) : V.input, border: `2px solid ${statut === s ? V.green : V.border}`, borderRadius: 12, padding: '14px 12px', cursor: 'pointer', textAlign: 'center', transition: 'all .15s' }}>
                    <div style={{ fontSize: 22, marginBottom: 5 }}>{s === 'patient' ? '👤' : '👥'}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: statut === s ? V.green : V.text }}>{s === 'patient' ? 'Le patient' : 'Un accompagnant'}</div>
                    <div style={{ fontSize: 11, color: V.muted, marginTop: 3 }}>{s === 'patient' ? 'Je consulte pour moi' : 'Je consulte pour un proche'}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Accompagnant */}
            {statut === 'accompagnant' && (
              <div style={{ background: hexToRgba(V.amber, .06), border: `1px solid ${hexToRgba(V.amber, .2)}`, borderRadius: 12, padding: 18, marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: V.amber, marginBottom: 14 }}>👥 Vos coordonnées (l'accompagnant)</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {inp('Votre prénom *', 'prenom', accomp, setAccomp, { placeholder: 'Votre prénom' })}
                  {inp('Votre nom *', 'nom', accomp, setAccomp, { placeholder: 'Votre nom' })}
                  {inp('Votre téléphone *', 'telephone', accomp, setAccomp, { placeholder: '+225 07 00 00 00 00', type: 'tel' })}
                  {sel('Votre relation avec le patient', accomp.relation, v => setAccomp(p => ({ ...p, relation: v })), RELATIONS)}
                </div>
              </div>
            )}

            {/* Patient */}
            <div style={{ background: V.input, border: `1px solid ${V.border}`, borderRadius: 12, padding: 18, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: V.green, marginBottom: 14 }}>
                {statut === 'patient' ? '👤 Vos informations' : '👤 Informations du patient'}
              </div>

              <div style={{ background: hexToRgba(V.text, .03), border: `1px solid ${V.border}`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: V.text, marginBottom: 8 }}>Déjà patient MediConnect ?</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input value={rechercheValeur} onChange={e => setRechercheValeur(e.target.value)}
                    placeholder="Téléphone ou code secret (ex: MC-KT-5069)"
                    style={{ flex: 1, minWidth: 200, padding: '9px 12px', background: V.input, border: `1px solid ${V.border}`, borderRadius: 8, color: V.text, fontSize: 13, outline: 'none' }} />
                  <button onClick={async () => {
                      if (!rechercheValeur.trim()) return;
                      setRechercheEnCours(true);
                      try {
                        const estCode = /^MC-/i.test(rechercheValeur.trim());
                        const param = estCode ? `code_secret=${encodeURIComponent(rechercheValeur.trim())}` : `telephone=${encodeURIComponent(rechercheValeur.trim())}`;
                        const r = await fetch(`${API}/public/patients/recherche-telephone?${param}`);
                        const d = await r.json();
                        if (d.data) {
                          setPatient(p => ({ ...p, prenom: d.data.prenom || '', nom: d.data.nom || '', telephone: d.data.telephone || '', email: d.data.email || '', ville_residence: d.data.ville || p.ville_residence }));
                          toast.success('Vos informations ont été retrouvées !');
                        } else {
                          toast.error('Aucun patient trouvé — remplissez le formulaire manuellement');
                        }
                      } catch (e) { toast.error('Erreur de recherche'); }
                      setRechercheEnCours(false);
                    }}
                    disabled={rechercheEnCours}
                    style={{ padding: '9px 16px', background: V.green, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    {rechercheEnCours ? 'Recherche…' : '🔎 Me retrouver'}
                  </button>
                </div>
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

            <div style={{ background: hexToRgba(V.green, .05), border: `1px solid ${hexToRgba(V.green, .12)}`, borderRadius: 10, padding: '12px 16px', marginBottom: 18, fontSize: 12, color: V.muted, lineHeight: 1.6 }}>
              🔒 Vos données sont protégées et utilisées uniquement pour ce rendez-vous, conformément à la politique de confidentialité de MediConnect.
            </div>

            <button onClick={() => { if (!patient.prenom || !patient.nom || !patient.telephone) { toast.error('Prénom, nom et téléphone requis'); return; } setStep(5); }}
              style={{ width: '100%', background: `linear-gradient(135deg,${V.green},${V.teal})`, color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              Vérifier et confirmer →
            </button>
          </div>
        )}

        {/* STEP 5 — Récapitulatif */}
        {step === 5 && (
          <div>
            <button onClick={() => setStep(4)} style={{ background: 'none', border: 'none', color: V.muted, cursor: 'pointer', fontSize: 13, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 6 }}>← Modifier</button>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, color: V.text, marginBottom: 6, fontWeight: 400 }}>Récapitulatif final</h2>
            <p style={{ color: V.muted, marginBottom: 22, fontSize: 13 }}>Vérifiez avant de confirmer</p>

            <div style={{ background: V.input, border: `1px solid ${V.border}`, borderRadius: 14, padding: 20, marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: V.green, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 14 }}>📅 Rendez-vous</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[['Établissement', clinique?.nom], ['Adresse', clinique?.adresse || clinique?.quartier || clinique?.ville], ['Médecin', `Dr. ${medecin?.prenom} ${medecin?.nom}`], ['Spécialité', specialite], ['Date & Heure', fmtDate(creneau)], ['Tarif', `${fmt(medecin?.tarif)} FCFA`]].map(([k,v]) => (
                  <div key={k} style={{ background: V.hover, borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: 10, color: V.dim, fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>{k}</div>
                    <div style={{ fontSize: 13, color: V.text, fontWeight: 600 }}>{v}</div>
                  </div>
                ))}
              </div>
              {patient.motif && <div style={{ marginTop: 10, background: V.hover, borderRadius: 8, padding: '10px 12px' }}><div style={{ fontSize: 10, color: V.dim, fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Motif</div><div style={{ fontSize: 13, color: V.text }}>{patient.motif}</div></div>}
            </div>

            <div style={{ background: V.input, border: `1px solid ${V.border}`, borderRadius: 14, padding: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: V.green, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 14 }}>👤 Patient</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[['Nom complet', `${patient.prenom} ${patient.nom}`], ['Téléphone', patient.telephone], ['Email', patient.email || '—'], ['Ville', patient.ville_residence], ['Statut', statut === 'patient' ? 'Patient direct' : `Via accompagnant : ${accomp.prenom} ${accomp.nom} (${accomp.relation})`], ['Assurance', patient.assurance + (patient.numero_police ? ` · ${patient.numero_police}` : '')]].map(([k,v]) => (
                  <div key={k} style={{ background: V.hover, borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: 10, color: V.dim, fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>{k}</div>
                    <div style={{ fontSize: 13, color: V.text, fontWeight: 600 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={submitRDV} disabled={saving}
              style={{ width: '100%', background: saving ? V.hover : `linear-gradient(135deg,${V.green},${V.teal})`, color: saving ? V.muted : '#fff', border: 'none', borderRadius: 12, padding: 16, fontSize: 16, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: saving ? 'none' : '0 8px 32px rgba(10,143,88,.35)', transition: 'all .15s', marginBottom: 12 }}>
              {saving ? '⏳ Confirmation en cours…' : '✅ Confirmer mon rendez-vous'}
            </button>
            <div style={{ textAlign: 'center', fontSize: 12, color: V.dim }}>
              Confirmation par SMS et email · Annulation gratuite 24h avant
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
