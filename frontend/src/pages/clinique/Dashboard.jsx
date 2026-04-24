import React, { useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { cliniqueAPI, consultationAPI, caisseAPI } from '../../services/api';

// ── Composants réutilisables ──────────────────────────────────────
const Card = ({ label, value, sub, color = '#0A8F58' }) => (
  <div style={{ background: '#141E2B', border: '1.5px solid #1E2F42', borderRadius: 14, padding: '20px', textAlign: 'center' }}>
    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.5px', color: '#4E657A', marginBottom: 8 }}>{label}</div>
    <div style={{ fontSize: 28, fontWeight: 900, color }}>{value}</div>
    {sub && <div style={{ fontSize: 12, color: '#8BA0B5', marginTop: 4 }}>{sub}</div>}
  </div>
);

const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#141E2B', border: '1px solid #1E2F42', borderRadius: 16, padding: 28, width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: '#8BA0B5', cursor: 'pointer', fontSize: 20 }}>✕</button>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: '#F0F4F8', marginBottom: 20 }}>{title}</h2>
        {children}
      </div>
    </div>
  );
};

const Input = ({ label, ...props }) => (
  <div style={{ marginBottom: 14 }}>
    {label && <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#8BA0B5', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>{label}</label>}
    <input {...props} style={{ width: '100%', background: '#1A2535', border: '1.5px solid #1E2F42', borderRadius: 9, padding: '10px 12px', color: '#F0F4F8', fontSize: 13, outline: 'none', boxSizing: 'border-box', ...props.style }} />
  </div>
);

const Btn = ({ children, variant = 'primary', ...props }) => {
  const styles = {
    primary: { background: '#0A8F58', color: '#fff', border: 'none' },
    outline:  { background: 'transparent', color: '#8BA0B5', border: '1.5px solid #1E2F42' },
    danger:   { background: 'transparent', color: '#E11D48', border: '1.5px solid rgba(225,29,72,.3)' },
  };
  return (
    <button {...props} style={{ borderRadius: 9, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', ...styles[variant], ...props.style }}>
      {children}
    </button>
  );
};

// ════════════════════════════════════════════
//  PAGE CONSULTATION
// ════════════════════════════════════════════
function PageConsultation() {
  const qc = useQueryClient();
  const { data: consData } = useQuery({ queryKey: ['consultations'], queryFn: () => consultationAPI.liste().then(r => r.data.data) });
  const { data: patsData }  = useQuery({ queryKey: ['patients'],      queryFn: () => cliniqueAPI.patients().then(r => r.data.data) });
  const { data: medsData }  = useQuery({ queryKey: ['medecins'],      queryFn: () => cliniqueAPI.medecins().then(r => r.data.data) });

  const [showForm, setShowForm]   = useState(false);
  const [codeSearch, setCodeSearch] = useState('');
  const [codeResult, setCodeResult] = useState(null);
  const [prescriptions, setPrescs] = useState([]);
  const [ordonnance, setOrdo]       = useState([]);
  const [form, setForm] = useState({
    patient_id: '', medecin_id: '', motif: '', date_consult: new Date().toISOString().split('T')[0],
    ta: '', fc: '', spo2: '', temperature: '', poids: '', taille: '',
    examen_clinique: '', diagnostic: '', code_cim10: '', note_finale: '', statut: 'finalisee'
  });

  const creerMutation = useMutation({
    mutationFn: (data) => consultationAPI.creer(data),
    onSuccess: () => {
      toast.success('Consultation enregistrée !');
      qc.invalidateQueries(['consultations']);
      setShowForm(false);
      setPrescs([]); setOrdo([]);
      setForm({ patient_id:'', medecin_id:'', motif:'', date_consult: new Date().toISOString().split('T')[0], ta:'', fc:'', spo2:'', temperature:'', poids:'', taille:'', examen_clinique:'', diagnostic:'', code_cim10:'', note_finale:'', statut:'finalisee' });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Erreur'),
  });

  const searchCode = async () => {
    if (!codeSearch.trim()) return;
    try {
      const { data } = await consultationAPI.parCode(codeSearch.trim().toUpperCase());
      setCodeResult(data);
    } catch (err) {
      toast.error('Code patient non reconnu.');
      setCodeResult(null);
    }
  };

  const addPresc = (type) => setPrescs(p => [...p, { id: Date.now(), type, label: '', urgent: false, note: '' }]);
  const addMed   = () => setOrdo(o => [...o, { id: Date.now(), med: '', posologie: '', duree: '30 jours', renouvellements: 0 }]);

  const submitConsult = () => {
    if (!form.patient_id) { toast.error('Sélectionnez un patient'); return; }
    if (!form.motif)      { toast.error('Motif obligatoire'); return; }
    if (!form.diagnostic) { toast.error('Diagnostic obligatoire'); return; }
    creerMutation.mutate({ ...form, prescriptions: prescriptions.filter(p => p.label), ordonnance: ordonnance.filter(o => o.med && o.posologie) });
  };

  const cons = consData || [];
  const pats = patsData || [];
  const meds = medsData || [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#F0F4F8', margin: 0 }}>🩺 Consultation médicale</h1>
          <p style={{ color: '#8BA0B5', fontSize: 13, margin: '4px 0 0' }}>Diagnostic · Prescriptions · Ordonnance · Code patient</p>
        </div>
        <Btn onClick={() => setShowForm(true)}>+ Nouvelle consultation</Btn>
      </div>

      {/* Accès par code */}
      <div style={{ background: '#141E2B', border: '1px solid #1E2F42', borderRadius: 14, padding: 20, marginBottom: 20 }}>
        <h3 style={{ color: '#0A8F58', fontWeight: 700, fontSize: 14, margin: '0 0 12px' }}>🔑 Accès dossier par code secret patient</h3>
        <div style={{ display: 'flex', gap: 10 }}>
          <input value={codeSearch} onChange={e => setCodeSearch(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && searchCode()}
            placeholder="Ex: MC-KJ-4782" style={{ flex: 1, background: '#1A2535', border: '1.5px solid #1E2F42', borderRadius: 9, padding: '10px 12px', color: '#F0F4F8', fontSize: 14, fontFamily: 'monospace', letterSpacing: 2, outline: 'none' }} />
          <Btn onClick={searchCode}>Accéder →</Btn>
        </div>
        {codeResult && (
          <div style={{ marginTop: 14, background: 'rgba(10,143,88,.07)', border: '1px solid rgba(10,143,88,.25)', borderRadius: 10, padding: 16 }}>
            <div style={{ fontWeight: 800, color: '#F0F4F8', fontSize: 15, marginBottom: 4 }}>
              {codeResult.patient.prenom} {codeResult.patient.nom}
              <span style={{ marginLeft: 10, background: '#0A8F58', color: '#fff', fontSize: 11, padding: '2px 10px', borderRadius: 12, fontFamily: 'monospace' }}>✓ Accès autorisé</span>
            </div>
            <div style={{ color: '#8BA0B5', fontSize: 12, marginBottom: 10 }}>
              {codeResult.consultations.length} consultation(s) enregistrée(s)
            </div>
            {codeResult.consultations.slice(0, 3).map(c => (
              <div key={c.id} style={{ background: '#1A2535', borderRadius: 8, padding: 10, marginBottom: 6, borderLeft: '3px solid #0A8F58' }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{c.date_consult} — {c.medecin_nom}</div>
                <div style={{ color: '#8BA0B5', fontSize: 12 }}>📋 {c.diagnostic?.slice(0, 80)}…</div>
                {c.ordonnance?.length > 0 && <div style={{ color: '#0A8F58', fontSize: 12 }}>💊 {c.ordonnance.map(o => o.medicament).join(' · ')}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Codes patients */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={{ background: '#141E2B', border: '1px solid #1E2F42', borderRadius: 14, padding: 20 }}>
          <h3 style={{ color: '#F0F4F8', fontWeight: 700, fontSize: 14, margin: '0 0 14px' }}>🔑 Codes secrets des patients</h3>
          {pats.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #1E2F42' }}>
              <div style={{ flex: 1, fontSize: 13, color: '#F0F4F8', fontWeight: 600 }}>{p.user_nom || p.prenom}</div>
              <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 800, color: '#0A8F58', background: 'rgba(10,143,88,.12)', padding: '3px 10px', borderRadius: 8, letterSpacing: 2 }}>{p.code_secret}</span>
              <Btn variant="outline" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => { navigator.clipboard.writeText(p.code_secret); toast.success('Code copié !'); }}>📋</Btn>
            </div>
          ))}
        </div>

        <div style={{ background: '#141E2B', border: '1px solid #1E2F42', borderRadius: 14, padding: 20 }}>
          <h3 style={{ color: '#F0F4F8', fontWeight: 700, fontSize: 14, margin: '0 0 14px' }}>
            Consultations récentes ({cons.length})
          </h3>
          {cons.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#4E657A', padding: 30 }}>Aucune consultation enregistrée</div>
          ) : cons.slice(0, 8).map(c => (
            <div key={c.id} style={{ padding: '10px 0', borderBottom: '1px solid #1E2F42' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: '#F0F4F8' }}>{c.patient_nom}</span>
                <span style={{ fontSize: 11, background: c.statut === 'finalisee' ? 'rgba(10,143,88,.15)' : 'rgba(217,119,6,.15)', color: c.statut === 'finalisee' ? '#0A8F58' : '#D97706', padding: '2px 8px', borderRadius: 10 }}>
                  {c.statut === 'finalisee' ? 'Finalisée' : 'Brouillon'}
                </span>
              </div>
              <div style={{ fontSize: 11, color: '#8BA0B5' }}>{c.date_consult} · {c.medecin_nom} · {c.motif}</div>
              <div style={{ fontSize: 11, color: '#4E657A', marginTop: 2 }}>📋 {c.diagnostic?.slice(0, 60)}…</div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Nouvelle Consultation */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="🩺 Nouvelle consultation médicale">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#8BA0B5', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>Patient *</label>
            <select value={form.patient_id} onChange={e => setForm({ ...form, patient_id: e.target.value })}
              style={{ width: '100%', background: '#1A2535', border: '1.5px solid #1E2F42', borderRadius: 9, padding: '10px 12px', color: '#F0F4F8', fontSize: 13, outline: 'none' }}>
              <option value="">Sélectionner…</option>
              {pats.map(p => <option key={p.id} value={p.id}>{p.user_nom} · {p.code_secret}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#8BA0B5', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>Médecin *</label>
            <select value={form.medecin_id} onChange={e => setForm({ ...form, medecin_id: e.target.value })}
              style={{ width: '100%', background: '#1A2535', border: '1.5px solid #1E2F42', borderRadius: 9, padding: '10px 12px', color: '#F0F4F8', fontSize: 13, outline: 'none' }}>
              <option value="">Sélectionner…</option>
              {meds.map(m => <option key={m.id} value={m.id}>{m.prenom} {m.nom} — {m.specialite}</option>)}
            </select>
          </div>
        </div>
        <Input label="Motif *" value={form.motif} onChange={e => setForm({ ...form, motif: e.target.value })} placeholder="Ex: Suivi HTA, douleurs thoraciques…" />
        <div style={{ fontSize: 11, fontWeight: 700, color: '#0D9488', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid #0D9488' }}>📊 Constantes vitales</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
          {[['ta','TA (mmHg)','120/80'],['fc','FC (bpm)','72'],['spo2','SpO2','98%'],['temperature','Température','37.0°C'],['poids','Poids (kg)','70'],['taille','Taille (cm)','170']].map(([k,l,p]) => (
            <div key={k}><label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#4E657A', marginBottom: 4 }}>{l}</label>
            <input value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} placeholder={p} style={{ width: '100%', background: '#1A2535', border: '1px solid #1E2F42', borderRadius: 8, padding: '8px', color: '#F0F4F8', fontSize: 12, fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' }} /></div>
          ))}
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid #7C3AED' }}>🔬 Examen clinique</div>
        <textarea value={form.examen_clinique} onChange={e => setForm({ ...form, examen_clinique: e.target.value })} rows={2} placeholder="Observations cliniques…" style={{ width: '100%', background: '#1A2535', border: '1.5px solid #1E2F42', borderRadius: 9, padding: '10px', color: '#F0F4F8', fontSize: 13, resize: 'none', outline: 'none', boxSizing: 'border-box', marginBottom: 14 }} />
        <div style={{ fontSize: 11, fontWeight: 700, color: '#D97706', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid #D97706' }}>📋 Diagnostic *</div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginBottom: 14 }}>
          <textarea value={form.diagnostic} onChange={e => setForm({ ...form, diagnostic: e.target.value })} rows={2} placeholder="Ex: Hypertension artérielle essentielle non contrôlée…" style={{ background: '#1A2535', border: '1.5px solid #1E2F42', borderRadius: 9, padding: '10px', color: '#F0F4F8', fontSize: 13, resize: 'none', outline: 'none' }} />
          <input value={form.code_cim10} onChange={e => setForm({ ...form, code_cim10: e.target.value })} placeholder="CIM-10 (ex: I10)" style={{ background: '#1A2535', border: '1.5px solid #1E2F42', borderRadius: 9, padding: '10px', color: '#F0F4F8', fontSize: 13, outline: 'none', fontFamily: 'monospace' }} />
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          {[['bio','🧪 Exam. biologique'],['radio','🔬 Imagerie/Radio'],['fonc','📋 Exam. fonctionnel'],['autre','📌 Autre']].map(([t,l]) => (
            <Btn key={t} variant="outline" style={{ padding: '6px 10px', fontSize: 11 }} onClick={() => addPresc(t)}>{l}</Btn>
          ))}
        </div>
        {prescriptions.map((p, i) => (
          <div key={p.id} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
            <input value={p.label} onChange={e => setPrescs(ps => ps.map((x,j) => j===i ? {...x, label: e.target.value} : x))} placeholder={`${p.type === 'bio' ? 'Examen biologique' : p.type === 'radio' ? 'Imagerie' : 'Prescription'}…`} style={{ flex: 1, background: '#1A2535', border: '1px solid #1E2F42', borderRadius: 8, padding: '8px', color: '#F0F4F8', fontSize: 12, outline: 'none' }} />
            <button onClick={() => setPrescs(ps => ps.filter((_,j) => j!==i))} style={{ background: 'none', border: 'none', color: '#E11D48', cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>
        ))}
        <div style={{ fontSize: 11, fontWeight: 700, color: '#0A8F58', textTransform: 'uppercase', letterSpacing: '.5px', margin: '14px 0 8px', paddingBottom: 6, borderBottom: '1px solid #0A8F58' }}>💊 Ordonnance</div>
        {ordonnance.map((o, i) => (
          <div key={o.id} style={{ background: '#1A2535', borderRadius: 8, padding: 10, marginBottom: 8, borderLeft: '3px solid #0A8F58' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr', gap: 8 }}>
              <input value={o.med} onChange={e => setOrdo(os => os.map((x,j) => j===i ? {...x, med: e.target.value} : x))} placeholder="Médicament" style={{ background: '#141E2B', border: '1px solid #1E2F42', borderRadius: 6, padding: '7px', color: '#F0F4F8', fontSize: 12, outline: 'none' }} />
              <input value={o.posologie} onChange={e => setOrdo(os => os.map((x,j) => j===i ? {...x, posologie: e.target.value} : x))} placeholder="Posologie" style={{ background: '#141E2B', border: '1px solid #1E2F42', borderRadius: 6, padding: '7px', color: '#F0F4F8', fontSize: 12, outline: 'none' }} />
              <button onClick={() => setOrdo(os => os.filter((_,j) => j!==i))} style={{ background: 'none', border: 'none', color: '#E11D48', cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>
          </div>
        ))}
        <Btn variant="outline" style={{ width: '100%', marginBottom: 14 }} onClick={addMed}>+ Ajouter un médicament</Btn>
        <textarea value={form.note_finale} onChange={e => setForm({ ...form, note_finale: e.target.value })} rows={2} placeholder="Note finale, recommandations, prochain RDV…" style={{ width: '100%', background: '#1A2535', border: '1.5px solid #1E2F42', borderRadius: 9, padding: '10px', color: '#F0F4F8', fontSize: 13, resize: 'none', outline: 'none', boxSizing: 'border-box', marginBottom: 16 }} />
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn variant="outline" style={{ flex: 1 }} onClick={() => setShowForm(false)}>Annuler</Btn>
          <Btn style={{ flex: 2 }} onClick={submitConsult} disabled={creerMutation.isPending}>
            {creerMutation.isPending ? 'Enregistrement…' : '✓ Finaliser et signer'}
          </Btn>
        </div>
      </Modal>
    </div>
  );
}

// ════════════════════════════════════════════
//  PAGE CAISSE
// ════════════════════════════════════════════
function PageCaisse() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['caisse'], queryFn: () => caisseAPI.active().then(r => r.data) });

  const [modalOuv, setModalOuv]   = useState(false);
  const [modalEnc, setModalEnc]   = useState(false);
  const [modalDec, setModalDec]   = useState(false);
  const [modalClt, setModalClt]   = useState(false);
  const [formOuv, setFormOuv] = useState({ nom: 'Caisse principale', solde_ouverture: 50000, operateur: '' });
  const [formEnc, setFormEnc] = useState({ label: '', montant: '', mode: 'Espèces', reference: '' });
  const [formDec, setFormDec] = useState({ label: '', montant: '', motif: '' });

  const mutOuvrir    = useMutation({ mutationFn: () => caisseAPI.ouvrir(formOuv), onSuccess: (r) => { toast.success(r.data.message); qc.invalidateQueries(['caisse']); setModalOuv(false); }, onError: (e) => toast.error(e.response?.data?.message || 'Erreur') });
  const mutEncaisser = useMutation({ mutationFn: () => caisseAPI.encaisser(formEnc), onSuccess: (r) => { toast.success(r.data.message); qc.invalidateQueries(['caisse']); setModalEnc(false); setFormEnc({ label:'', montant:'', mode:'Espèces', reference:'' }); }, onError: (e) => toast.error(e.response?.data?.message || 'Erreur') });
  const mutDecaisser = useMutation({ mutationFn: () => caisseAPI.decaisser(formDec), onSuccess: (r) => { toast.success(r.data.message); qc.invalidateQueries(['caisse']); setModalDec(false); setFormDec({ label:'', montant:'', motif:'' }); }, onError: (e) => toast.error(e.response?.data?.message || 'Erreur') });
  const mutCloturer  = useMutation({ mutationFn: () => caisseAPI.cloturer(), onSuccess: (r) => { toast.success(r.data.message); qc.invalidateQueries(['caisse']); setModalClt(false); }, onError: (e) => toast.error(e.response?.data?.message || 'Erreur') });

  if (isLoading) return <div style={{ color: '#8BA0B5', padding: 40, textAlign: 'center' }}>Chargement…</div>;

  const caisse    = data?.data;
  const historique = data?.historique || [];
  const statut    = data?.statut || 'fermee';
  const enc = caisse?.transactions?.filter(t => t.type === 'encaissement').reduce((s, t) => s + +t.montant, 0) || 0;
  const dec = caisse?.transactions?.filter(t => t.type === 'decaissement').reduce((s, t) => s + +t.montant, 0) || 0;
  const solde = (+caisse?.solde_ouverture || 0) + enc - dec;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#F0F4F8', margin: 0 }}>💰 Gestion de Caisse</h1>
          <p style={{ color: '#8BA0B5', fontSize: 13, margin: '4px 0 0' }}>Encaissements · Décaissements · Clôture · Historique</p>
        </div>
        {statut === 'fermee'
          ? <Btn onClick={() => setModalOuv(true)}>🔓 Ouvrir la caisse</Btn>
          : <Btn variant="danger" onClick={() => setModalClt(true)}>🔒 Clôturer</Btn>}
      </div>

      {/* Statut banner */}
      <div style={{ background: statut === 'ouverte' ? 'rgba(10,143,88,.08)' : 'rgba(225,29,72,.06)', border: `1.5px solid ${statut === 'ouverte' ? 'rgba(10,143,88,.3)' : 'rgba(225,29,72,.25)'}`, borderRadius: 14, padding: '20px 24px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 44 }}>{statut === 'ouverte' ? '🟢' : '🔴'}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#F0F4F8' }}>{statut === 'ouverte' ? `Caisse ouverte — ${caisse?.nom || 'Caisse principale'}` : 'Caisse fermée'}</div>
          {statut === 'ouverte' && caisse && (
            <div style={{ fontSize: 12, color: '#8BA0B5', marginTop: 4 }}>
              Ouverte le <strong>{caisse.date_ouverture}</strong> à <strong>{caisse.heure_ouverture}</strong> par <strong>{caisse.operateur}</strong> · Fonds de départ : <strong>{(+caisse.solde_ouverture).toLocaleString()} FCFA</strong>
            </div>
          )}
          {statut === 'fermee' && <div style={{ fontSize: 12, color: '#8BA0B5', marginTop: 4 }}>Aucune caisse active — Ouvrez une caisse pour commencer</div>}
        </div>
        {statut === 'ouverte' && <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 32, fontWeight: 900, color: '#0A8F58' }}>{solde.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: '#4E657A', textTransform: 'uppercase' }}>FCFA · Solde courant</div>
        </div>}
      </div>

      {statut === 'ouverte' && (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
            <Card label="Fonds ouverture" value={(+caisse.solde_ouverture).toLocaleString()} color="#F0F4F8" />
            <Card label="Total encaissé"  value={'+'+enc.toLocaleString()}  color="#0A8F58" />
            <Card label="Total décaissé"  value={'-'+dec.toLocaleString()}  color="#E11D48" />
            <Card label="Solde courant"   value={solde.toLocaleString()}    color="#0A8F58" />
          </div>

          {/* Actions + Journal */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20 }}>
            <div>
              <div style={{ background: '#141E2B', border: '1px solid #1E2F42', borderRadius: 14, padding: 20, marginBottom: 14 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#F0F4F8', margin: '0 0 16px' }}>⚡ Actions rapides</h3>
                <button onClick={() => setModalEnc(true)} style={{ width: '100%', background: '#0A8F58', border: 'none', borderRadius: 10, padding: '16px', marginBottom: 10, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 28 }}>💵</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Encaisser</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,.7)' }}>Enregistrer un paiement</span>
                </button>
                <button onClick={() => setModalDec(true)} style={{ width: '100%', background: 'transparent', border: '1.5px solid rgba(225,29,72,.4)', borderRadius: 10, padding: '16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 28 }}>💸</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#E11D48' }}>Décaisser</span>
                  <span style={{ fontSize: 11, color: '#4E657A' }}>Sortie de caisse</span>
                </button>
              </div>
            </div>
            <div style={{ background: '#141E2B', border: '1px solid #1E2F42', borderRadius: 14, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#F0F4F8', margin: '0 0 14px' }}>📋 Journal du jour ({caisse.transactions?.length || 0} transactions)</h3>
              {(!caisse.transactions || caisse.transactions.length === 0)
                ? <div style={{ textAlign: 'center', color: '#4E657A', padding: 24 }}>Aucune transaction pour l'instant</div>
                : caisse.transactions.slice().reverse().map(t => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #1E2F42' }}>
                    <span style={{ fontSize: 20 }}>{t.type === 'encaissement' ? '💵' : '💸'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#F0F4F8' }}>{t.label}</div>
                      <div style={{ fontSize: 11, color: '#8BA0B5' }}>{t.heure?.slice(0,5)} · {t.mode} · {t.caissier}</div>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: t.type === 'encaissement' ? '#0A8F58' : '#E11D48', flexShrink: 0 }}>
                      {t.type === 'encaissement' ? '+' : '-'}{Number(t.montant).toLocaleString()} F
                    </div>
                  </div>
                ))}
              {caisse.transactions?.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, marginTop: 6, borderTop: '2px solid #1E2F42' }}>
                  <span style={{ fontWeight: 700, color: '#F0F4F8' }}>Solde estimé</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: '#0A8F58' }}>{solde.toLocaleString()} FCFA</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Historique */}
      {historique.length > 0 && (
        <div style={{ background: '#141E2B', border: '1px solid #1E2F42', borderRadius: 14, padding: 20, marginTop: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#F0F4F8', margin: '0 0 14px' }}>🗓️ Historique des caisses clôturées ({historique.length})</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr style={{ borderBottom: '1px solid #1E2F42' }}>
              {['Date','Nom','Ouverture','Encaissé','Décaissé','Solde final'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '6px 10px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#4E657A' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {historique.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid #1A2535' }}>
                  <td style={{ padding: '10px', fontFamily: 'monospace', fontSize: 12 }}>{c.date_ouverture}</td>
                  <td style={{ padding: '10px', color: '#8BA0B5' }}>{c.nom}</td>
                  <td style={{ padding: '10px' }}>{(+c.solde_ouverture).toLocaleString()}</td>
                  <td style={{ padding: '10px', color: '#0A8F58', fontWeight: 700 }}>+{(+c.encaissements||0).toLocaleString()}</td>
                  <td style={{ padding: '10px', color: '#E11D48', fontWeight: 700 }}>-{(+c.decaissements||0).toLocaleString()}</td>
                  <td style={{ padding: '10px', fontWeight: 800, color: '#0A8F58' }}>{(+c.solde_cloture||0).toLocaleString()} F</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODALES */}
      <Modal open={modalOuv} onClose={() => setModalOuv(false)} title="🔓 Ouvrir la caisse">
        <Input label="Nom de la caisse" value={formOuv.nom} onChange={e => setFormOuv({ ...formOuv, nom: e.target.value })} />
        <Input label="Solde d'ouverture (FCFA) *" type="number" value={formOuv.solde_ouverture} onChange={e => setFormOuv({ ...formOuv, solde_ouverture: +e.target.value })} />
        <Input label="Opérateur / Caissier" value={formOuv.operateur} onChange={e => setFormOuv({ ...formOuv, operateur: e.target.value })} placeholder="Nom du caissier" />
        <div style={{ display: 'flex', gap: 10 }}><Btn variant="outline" style={{ flex: 1 }} onClick={() => setModalOuv(false)}>Annuler</Btn><Btn style={{ flex: 2 }} onClick={() => mutOuvrir.mutate()} disabled={mutOuvrir.isPending}>{mutOuvrir.isPending ? 'Ouverture…' : 'Ouvrir la caisse'}</Btn></div>
      </Modal>

      <Modal open={modalEnc} onClose={() => setModalEnc(false)} title="➕ Encaisser">
        <Input label="Libellé *" value={formEnc.label} onChange={e => setFormEnc({ ...formEnc, label: e.target.value })} placeholder="Ex: Consultation Dr. Kouamé — Konan Jean" />
        <Input label="Montant (FCFA) *" type="number" value={formEnc.montant} onChange={e => setFormEnc({ ...formEnc, montant: e.target.value })} placeholder="Ex: 25000" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#8BA0B5', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>Mode de paiement</label>
          <select value={formEnc.mode} onChange={e => setFormEnc({ ...formEnc, mode: e.target.value })} style={{ width: '100%', background: '#1A2535', border: '1.5px solid #1E2F42', borderRadius: 9, padding: '10px', color: '#F0F4F8', fontSize: 13, outline: 'none' }}>
            {['Espèces','Wave','Orange Money','MTN MoMo','Carte bancaire','Chèque','Virement'].map(m => <option key={m}>{m}</option>)}
          </select></div>
          <Input label="Référence / N° facture" value={formEnc.reference} onChange={e => setFormEnc({ ...formEnc, reference: e.target.value })} placeholder="#FAC-0856" />
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}><Btn variant="outline" style={{ flex: 1 }} onClick={() => setModalEnc(false)}>Annuler</Btn><Btn style={{ flex: 2 }} onClick={() => mutEncaisser.mutate()} disabled={mutEncaisser.isPending}>{mutEncaisser.isPending ? 'Enregistrement…' : 'Encaisser'}</Btn></div>
      </Modal>

      <Modal open={modalDec} onClose={() => setModalDec(false)} title="➖ Décaisser">
        <Input label="Libellé *" value={formDec.label} onChange={e => setFormDec({ ...formDec, label: e.target.value })} placeholder="Ex: Achat consommables médicaux" />
        <Input label="Montant (FCFA) *" type="number" value={formDec.montant} onChange={e => setFormDec({ ...formDec, montant: e.target.value })} />
        <Input label="Motif / Approbation" value={formDec.motif} onChange={e => setFormDec({ ...formDec, motif: e.target.value })} placeholder="Ex: Approuvé par Dr. Kouamé" />
        <div style={{ background: 'rgba(225,29,72,.07)', borderRadius: 8, padding: 10, fontSize: 12, color: '#8BA0B5', marginBottom: 14 }}>⚠️ Tout décaissement est tracé avec l'heure et l'opérateur.</div>
        <div style={{ display: 'flex', gap: 10 }}><Btn variant="outline" style={{ flex: 1 }} onClick={() => setModalDec(false)}>Annuler</Btn><Btn variant="danger" style={{ flex: 2, background: '#E11D48', color: '#fff', border: 'none' }} onClick={() => mutDecaisser.mutate()} disabled={mutDecaisser.isPending}>{mutDecaisser.isPending ? 'Enregistrement…' : 'Valider le décaissement'}</Btn></div>
      </Modal>

      <Modal open={modalClt} onClose={() => setModalClt(false)} title="🔒 Clôturer la caisse">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          {[["Solde d'ouverture", (+caisse?.solde_ouverture||0).toLocaleString(), '#F0F4F8', '#1A2535'],["Encaissé", '+'+enc.toLocaleString(),'#0A8F58','rgba(10,143,88,.1)'],["Décaissé", '-'+dec.toLocaleString(),'#E11D48','rgba(225,29,72,.08)'],["Solde final", solde.toLocaleString()+' F', '#2563EB','rgba(37,99,235,.08)']].map(([l,v,col,bg]) => (
            <div key={l} style={{ background: bg, borderRadius: 10, padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#4E657A', marginBottom: 5 }}>{l}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: col }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ background: 'rgba(225,29,72,.07)', borderRadius: 8, padding: 10, fontSize: 12, color: '#8BA0B5', marginBottom: 14 }}>⚠️ La clôture est irréversible. Un rapport sera généré.</div>
        <div style={{ display: 'flex', gap: 10 }}><Btn variant="outline" style={{ flex: 1 }} onClick={() => setModalClt(false)}>Annuler</Btn><Btn variant="danger" style={{ flex: 2, background: '#E11D48', color: '#fff', border: 'none' }} onClick={() => mutCloturer.mutate()} disabled={mutCloturer.isPending}>{mutCloturer.isPending ? 'Clôture…' : 'Clôturer et générer le rapport'}</Btn></div>
      </Modal>
    </div>
  );
}

// ════════════════════════════════════════════
//  DASHBOARD CLINIQUE (router principal)
// ════════════════════════════════════════════
function DashboardHome() {
  const { data: stats } = useQuery({ queryKey: ['cliniqueStats'], queryFn: () => cliniqueAPI.stats().then(r => r.data.data) });
  const s = stats || {};
  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#F0F4F8', marginBottom: 4 }}>Dashboard Clinique</h1>
      <p style={{ color: '#8BA0B5', fontSize: 13, marginBottom: 24 }}>Vue d'ensemble de votre établissement</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <Card label="RDV aujourd'hui"     value={s.rdv_today || 0}           color="#0A8F58" />
        <Card label="Médecins actifs"     value={s.medecins_actifs || 0}     color="#0D9488" />
        <Card label="Alertes stock"       value={s.stock_alertes || 0}       color="#E11D48" />
        <Card label="Dossiers rejetés"    value={s.dossiers_rejetes || 0}    color="#D97706" />
      </div>
      <div style={{ background: '#141E2B', border: '1px solid #1E2F42', borderRadius: 14, padding: 24, textAlign: 'center', color: '#4E657A' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🏥</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#8BA0B5' }}>Bienvenue sur votre tableau de bord</div>
        <div style={{ fontSize: 13, marginTop: 6 }}>Utilisez la navigation à gauche pour accéder aux différentes sections.</div>
      </div>
    </div>
  );
}

export default function DashboardClinique() {
  return (
    <Routes>
      <Route index element={<DashboardHome />} />
      <Route path="consultation" element={<PageConsultation />} />
      <Route path="caisse" element={<PageCaisse />} />
      <Route path="*" element={<div style={{ color: '#8BA0B5', padding: 40, textAlign: 'center' }}><div style={{ fontSize: 40, marginBottom: 12 }}>🚧</div><div style={{ fontSize: 16 }}>Section en cours de développement</div></div>} />
    </Routes>
  );
}
