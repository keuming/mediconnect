import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '../context/authStore';
import { PAYS_OPTIONS, getVillesByPays } from '../utils/geoAfrique';

const ROLES = [
  { value: 'patient',             label: 'Patient',              icon: '👤', desc: 'Prendre des RDV, gérer mes ordonnances' },
  { value: 'clinique',            label: 'Clinique / Hôpital',   icon: '🏥', desc: 'Gérer planning, EMR, facturation' },
  { value: 'pharmacie',           label: 'Pharmacie',            icon: '💊', desc: 'Ordonnances, commandes, livraisons' },
  { value: 'livreur',             label: 'Livreur',              icon: '🛵', desc: 'Gérer mes missions de livraison' },
  { value: 'assureur',            label: 'Assureur',             icon: '🛡️', desc: 'Traiter les dossiers tiers-payant' },
  { value: 'medecin_independant', label: 'Médecin Conseil',      icon: '⭐', desc: 'Médecin de famille · Suivi privé · 500 F/mois' },
  { value: 'imagerie',            label: 'Imagerie Médicale',    icon: '🩻', desc: 'Radiologie, IRM, Scanner' },
  { value: 'laboratoire',         label: 'Laboratoire',          icon: '🧪', desc: 'Analyses biologiques' },
  { value: 'optique',             label: 'Cabinet Optique',       icon: '🔭', desc: 'Gestion stock, ventes, ordonnances optiques' },
  { value: 'ministere',           label: 'Ministère de la Santé', icon: '🏛️', desc: 'Dashboard épidémiologique national' },
];

const C = {
  bg:'#060C12', card:'#0E1620', input:'#141E2B',
  border:'#1E2F42', text:'#F0F4F8', muted:'#8BA0B5', dim:'#4E657A',
  green:'#0A8F58',
};

export default function Register() {
  const [step, setStep]   = useState(1);
  const [role, setRole]   = useState('');
  const [pays, setPays]   = useState('CI');
  const [ville, setVille] = useState('');
  const [form, setForm]   = useState({
    prenom:'', nom:'', email:'', telephone:'',
    ville:'Abidjan', pays_code:'CI', password:'', confirm:''
  });
  const [extraForm, setExtra] = useState({
    nom_etab:'', type_etab:'Clinique', agrement:'',
    nom_ph:'', vehicule:'Moto', nom_ass:''
  });
  const [show, setShow]   = useState(false);
  const [cliniqueQuery, setCliniqueQuery]   = useState('');
  const [cliniquesList, setCliniquesList]   = useState([]);
  const [cliniqueSel, setCliniqueSel]       = useState(null); // {id, nom, ville} ou null
  const [cliniquesLoaded, setCliniquesLoaded] = useState(false);
  const { register, loading } = useAuthStore();

  const chargerCliniques = async () => {
    if (cliniquesLoaded) return;
    try {
      const r = await fetch('https://mediconnect-backend-v2.vercel.app/api/cliniques');
      const d = await r.json();
      setCliniquesList(d.data || []);
      // Marquee "charge" uniquement en cas de succes : un echec reseau
      // (cold start Vercel, coupure) ne doit pas bloquer la recherche
      // pour le reste de la session sans recharger toute la page.
      setCliniquesLoaded(true);
    } catch { setCliniquesList([]); }
  };

  const cliniquesFiltrees = cliniqueQuery.trim().length < 2 ? [] :
    cliniquesList.filter(c =>
      (c.nom||'').toLowerCase().includes(cliniqueQuery.toLowerCase())
    ).slice(0, 8);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!role) { toast.error('Choisissez un rôle'); return; }
    if (form.password !== form.confirm) { toast.error('Les mots de passe ne correspondent pas.'); return; }
    if (form.password.length < 6) { toast.error('Mot de passe minimum 6 caractères.'); return; }
    if (!form.email || !form.prenom || !form.nom) { toast.error('Prénom, nom et email requis.'); return; }

    if (role === 'clinique' && !cliniqueSel && !extraForm.nom_etab.trim()) {
      toast.error("Recherchez votre clinique ou saisissez son nom si elle n'existe pas encore.");
      return;
    }

    const payload = {
      ...form,
      role,
      pays_code: pays,
      ville: ville,
      ...extraForm,
      // nom_etab est le nom du champ de saisie libre ; le backend attend
      // nom_clinique. Sans ce mapping le champ tape par l'utilisateur
      // n'atteint jamais la base et la clinique se cree sous son
      // prenom/nom a la place (bug source des doublons "Dr X").
      nom_clinique: role === 'clinique' ? (cliniqueSel?.nom || extraForm.nom_etab) : undefined,
      clinique_id_existante: role === 'clinique' ? (cliniqueSel?.id || undefined) : undefined,
    };
    delete payload.confirm;

    const res = await register(payload);
    if (res.success) {
      toast.success('Compte créé avec succès ! Bienvenue 🎉');
      navigate('/app');
    } else {
      toast.error(res.message || 'Erreur lors de la création du compte');
    }
  };

  const inp = (label, key, props = {}) => (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:'block', fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'.5px', marginBottom:5 }}>{label}</label>
      <input
        value={form[key]||''}
        onChange={e => setForm({ ...form, [key]:e.target.value })}
        {...props}
        style={{ width:'100%', background:C.input, border:`1.5px solid ${C.border}`, borderRadius:9, padding:'10px 14px', color:C.text, fontSize:13, outline:'none', boxSizing:'border-box' }}
        onFocus={e=>e.target.style.borderColor=C.green}
        onBlur={e=>e.target.style.borderColor=C.border}
      />
    </div>
  );

  const extraInp = (label, key, props = {}) => (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:'block', fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'.5px', marginBottom:5 }}>{label}</label>
      <input
        value={extraForm[key]||''}
        onChange={e => setExtra({ ...extraForm, [key]:e.target.value })}
        {...props}
        style={{ width:'100%', background:C.input, border:`1.5px solid ${C.border}`, borderRadius:9, padding:'10px 14px', color:C.text, fontSize:13, outline:'none', boxSizing:'border-box' }}
        onFocus={e=>e.target.style.borderColor=C.green}
        onBlur={e=>e.target.style.borderColor=C.border}
      />
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ width:'100%', maxWidth:580, background:C.card, borderRadius:20, padding:36, border:`1px solid ${C.border}` }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:28 }}>
          <div style={{ width:40, height:40, background:C.green, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:800, color:'#fff' }}>+</div>
          <span style={{ fontSize:20, fontWeight:800, color:C.text }}>Medi<span style={{ color:C.green }}>Connect</span></span>
          <span style={{ marginLeft:'auto', fontSize:12, color:C.muted }}>Étape {step}/3</span>
        </div>

        {/* Barre de progression */}
        <div style={{ display:'flex', gap:4, marginBottom:28 }}>
          {[1,2,3].map(s=>(
            <div key={s} style={{ flex:1, height:3, borderRadius:2, background:step>=s?C.green:'#1E2F42', transition:'background .2s' }}/>
          ))}
        </div>

        {/* ÉTAPE 1 : Choisir un rôle */}
        {step===1 && (
          <div>
            <h2 style={{ fontSize:22, fontWeight:800, color:C.text, marginBottom:6 }}>Quel est votre profil ?</h2>
            <p style={{ color:C.muted, marginBottom:20, fontSize:13 }}>Choisissez le type de compte qui correspond à votre activité.</p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:24 }}>
              {ROLES.map(r => (
                <button key={r.value}
                  onClick={() => setRole(r.value)}
                  style={{
                    background: role===r.value ? 'rgba(10,143,88,.12)' : C.input,
                    border: `2px solid ${role===r.value ? C.green : C.border}`,
                    borderRadius:12, padding:'14px 12px', cursor:'pointer',
                    textAlign:'left', fontFamily:'inherit', transition:'all .15s'
                  }}
                  onMouseOver={e=>e.currentTarget.style.borderColor=C.green}
                  onMouseOut={e=>e.currentTarget.style.borderColor=role===r.value?C.green:C.border}
                >
                  <div style={{ fontSize:22, marginBottom:6 }}>{r.icon}</div>
                  <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:3 }}>{r.label}</div>
                  <div style={{ fontSize:11, color:C.muted, lineHeight:1.4 }}>{r.desc}</div>
                </button>
              ))}
            </div>
            <button
              disabled={!role}
              onClick={() => setStep(2)}
              style={{ width:'100%', background:role?C.green:'#1E2F42', border:'none', borderRadius:12, padding:14, color:'#fff', fontSize:15, fontWeight:700, cursor:role?'pointer':'not-allowed', transition:'background .2s' }}
            >
              Continuer →
            </button>
            <p style={{ textAlign:'center', marginTop:16, fontSize:13, color:C.muted }}>
              Déjà un compte ? <Link to="/login" style={{ color:C.green, fontWeight:700, textDecoration:'none' }}>Se connecter</Link>
            </p>
          </div>
        )}

        {/* ÉTAPE 2 : Infos personnelles */}
        {step===2 && (
          <div>
            <h2 style={{ fontSize:22, fontWeight:800, color:C.text, marginBottom:6 }}>Informations personnelles</h2>
            <p style={{ color:C.muted, marginBottom:20, fontSize:13 }}>
              Profil : <strong style={{ color:ROLES.find(r=>r.value===role)?.color||C.green }}>{ROLES.find(r=>r.value===role)?.icon} {ROLES.find(r=>r.value===role)?.label}</strong>
            </p>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              {inp('Prénom *', 'prenom', { placeholder:'Adjoua' })}
              {inp('Nom *', 'nom', { placeholder:'Koné' })}
            </div>
            {inp('Email *', 'email', { type:'email', placeholder:'votre@email.com' })}
            {inp('Téléphone', 'telephone', { type:'tel', placeholder:'+225 07 00 00 00 00' })}

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div style={{ marginBottom:14 }}>
                <label style={{ display:'block', fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:.5, marginBottom:6 }}>Pays *</label>
                <select value={pays} onChange={e=>{setPays(e.target.value);setVille('');}}
                  style={{ width:'100%', background:C.input, border:`1.5px solid ${C.border}`, borderRadius:9, padding:'10px 12px', color:C.text, fontSize:13, outline:'none' }}>
                  <option value="">Sélectionner un pays...</option>
                  {PAYS_OPTIONS.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div style={{ marginBottom:14 }}>
                <label style={{ display:'block', fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:.5, marginBottom:6 }}>Ville / Commune *</label>
                <select value={ville} onChange={e=>setVille(e.target.value)}
                  style={{ width:'100%', background:C.input, border:`1.5px solid ${C.border}`, borderRadius:9, padding:'10px 12px', color:ville?C.text:C.dim, fontSize:13, outline:'none' }}>
                  <option value="">Sélectionner une ville...</option>
                  {getVillesByPays(pays).map(v=><option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'.5px', marginBottom:5 }}>Mot de passe *</label>
              <div style={{ position:'relative' }}>
                <input
                  type={show?'text':'password'}
                  value={form.password}
                  onChange={e=>setForm({...form,password:e.target.value})}
                  placeholder="Minimum 6 caractères"
                  style={{ width:'100%', background:C.input, border:`1.5px solid ${C.border}`, borderRadius:9, padding:'10px 44px 10px 14px', color:C.text, fontSize:13, outline:'none', boxSizing:'border-box' }}
                  onFocus={e=>e.target.style.borderColor=C.green}
                  onBlur={e=>e.target.style.borderColor=C.border}
                />
                <button type="button" onClick={()=>setShow(!show)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:C.dim }}>
                  {show?'🙈':'👁'}
                </button>
              </div>
            </div>
            {inp('Confirmer le mot de passe *', 'confirm', { type:'password', placeholder:'••••••••' })}

            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>setStep(1)} style={{ flex:1, background:'none', border:`1.5px solid ${C.border}`, borderRadius:12, padding:12, color:C.muted, cursor:'pointer', fontFamily:'inherit' }}>← Retour</button>
              <button onClick={()=>setStep(3)} style={{ flex:2, background:C.green, border:'none', borderRadius:12, padding:12, color:'#fff', fontWeight:700, cursor:'pointer' }}>Continuer →</button>
            </div>
          </div>
        )}

        {/* ÉTAPE 3 : Infos spécifiques au rôle */}
        {step===3 && (
          <div>
            <h2 style={{ fontSize:22, fontWeight:800, color:C.text, marginBottom:6 }}>Finaliser l'inscription</h2>
            <p style={{ color:C.muted, marginBottom:20, fontSize:13 }}>Informations complémentaires pour votre profil.</p>

            {role==='clinique' && (
              <>
                <div style={{ marginBottom:14 }}>
                  <label style={{ display:'block', fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'.5px', marginBottom:5 }}>
                    Votre clinique existe-t-elle déjà dans MediConnect ?
                  </label>
                  <input
                    value={cliniqueQuery}
                    onFocus={chargerCliniques}
                    onChange={e=>{ setCliniqueQuery(e.target.value); setCliniqueSel(null); }}
                    placeholder="Tapez le nom pour rechercher..."
                    style={{ width:'100%', background:C.input, border:`1.5px solid ${C.border}`, borderRadius:9, padding:'10px 14px', color:C.text, fontSize:13, outline:'none' }}
                  />
                  {cliniquesFiltrees.length>0 && !cliniqueSel && (
                    <div style={{ marginTop:6, border:`1.5px solid ${C.border}`, borderRadius:9, overflow:'hidden' }}>
                      {cliniquesFiltrees.map(c=>(
                        <div key={c.id} onClick={()=>{ setCliniqueSel(c); setCliniqueQuery(c.nom); }}
                          style={{ padding:'10px 14px', cursor:'pointer', borderBottom:`1px solid ${C.border}`, fontSize:13, color:C.text }}
                          onMouseEnter={e=>e.currentTarget.style.background=C.input}
                          onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                          <div style={{ fontWeight:700 }}>{c.nom}</div>
                          <div style={{ fontSize:11, color:C.muted }}>{c.ville||'Ville non renseignée'}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {cliniqueSel && (
                    <div style={{ marginTop:8, background:'rgba(10,143,88,.1)', border:'1px solid rgba(10,143,88,.3)', borderRadius:9, padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div>
                        <div style={{ fontSize:13, fontWeight:700, color:C.text }}>✓ {cliniqueSel.nom}</div>
                        <div style={{ fontSize:11, color:C.muted }}>Vous serez rattaché à cette clinique existante</div>
                      </div>
                      <button type="button" onClick={()=>{ setCliniqueSel(null); setCliniqueQuery(''); }}
                        style={{ background:'none', border:'none', color:C.muted, cursor:'pointer', fontSize:13 }}>✕</button>
                    </div>
                  )}
                  <p style={{ fontSize:11, color:C.dim, marginTop:6 }}>
                    Aucun résultat ? Renseignez le nom complet ci-dessous pour créer votre établissement.
                  </p>
                </div>
                {!cliniqueSel && extraInp("Nom de l'établissement *", 'nom_etab', { placeholder:'Clinique Sainte Marie' })}
                <div style={{ marginBottom:14 }}>
                  <label style={{ display:'block', fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'.5px', marginBottom:5 }}>Type d'établissement</label>
                  <select value={extraForm.type_etab} onChange={e=>setExtra({...extraForm,type_etab:e.target.value})}
                    style={{ width:'100%', background:C.input, border:`1.5px solid ${C.border}`, borderRadius:9, padding:'10px 14px', color:C.text, fontSize:13, outline:'none' }}>
                    {['Clinique','Hôpital','Polyclinique','Centre de santé','Cabinet médical'].map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                {extraInp("N° d'agrément", 'agrement', { placeholder:'AGR-2024-001' })}
              </>
            )}
            {role==='pharmacie' && extraInp('Nom de la pharmacie *', 'nom_ph', { placeholder:'Pharmacie Centrale du Plateau' })}
            {role==='livreur' && (
              <div style={{ marginBottom:14 }}>
                <label style={{ display:'block', fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'.5px', marginBottom:5 }}>Type de véhicule</label>
                <select value={extraForm.vehicule} onChange={e=>setExtra({...extraForm,vehicule:e.target.value})}
                  style={{ width:'100%', background:C.input, border:`1.5px solid ${C.border}`, borderRadius:9, padding:'10px 14px', color:C.text, fontSize:13, outline:'none' }}>
                  {['Moto','Voiture','Vélo','Tricycle'].map(v=><option key={v}>{v}</option>)}
                </select>
              </div>
            )}
            {role==='assureur' && extraInp("Nom de la compagnie *", 'nom_ass', { placeholder:'NSIA Assurances CI' })}
            {role==='medecin_independant' && (
              <div style={{ background:'rgba(10,143,88,.07)', border:'1px solid rgba(10,143,88,.2)', borderRadius:12, padding:16, marginBottom:16 }}>
                <div style={{ fontSize:13, fontWeight:700, color:C.green, marginBottom:8 }}>⭐ Médecin Conseil — MediConnect Africa</div>
                <div style={{ fontSize:12, color:C.muted, lineHeight:1.6 }}>
                  En tant que Médecin Conseil, votre profil sera visible publiquement sur la plateforme. Vos patients peuvent vous trouver, prendre RDV et demander un suivi médical privé.<br/>
                  Vous gérez votre planning, vos consultations, vos ordonnances et votre facturation depuis votre tableau de bord.<br/>
                  <strong style={{ color:C.text }}>Abonnement : 500 FCFA/mois</strong>
                </div>
              </div>
            )}
            {role==='optique' && extraInp("Nom du cabinet optique *", 'nom_optique', { placeholder:'Vision Plus Optique...' })}
      {role==='ministere' && (
        <div style={{ background:'rgba(10,143,88,.08)', borderRadius:10, padding:14, marginBottom:16, fontSize:13, color:C.muted }}>
          ⚠️ L'accès Ministère de la Santé est réservé aux agents officiels. Votre compte sera validé par l'administrateur avant activation.
        </div>
      )}
      {(role==='imagerie'||role==='laboratoire') && extraInp(`Nom de l'établissement`, 'nom_etab', { placeholder:role==='imagerie'?'Centre d\'imagerie du Plateau':'Laboratoire Biomédical' })}
            {(role==='patient') && (
              <div style={{ background:C.input, borderRadius:12, padding:16, marginBottom:16, fontSize:13, color:C.muted }}>
                👤 Votre dossier médical électronique sera créé automatiquement. Vous pourrez le compléter depuis votre tableau de bord.
                <br/><strong style={{ color:C.text }}>Abonnement MediConnect : 300 FCFA/mois</strong>
              </div>
            )}

            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>setStep(2)} style={{ flex:1, background:'none', border:`1.5px solid ${C.border}`, borderRadius:12, padding:12, color:C.muted, cursor:'pointer', fontFamily:'inherit' }}>← Retour</button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                style={{ flex:2, background:loading?'#1E2F42':C.green, border:'none', borderRadius:12, padding:12, color:'#fff', fontWeight:700, cursor:loading?'not-allowed':'pointer' }}
              >
                {loading?'Création du compte…':'✅ Créer mon compte'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
