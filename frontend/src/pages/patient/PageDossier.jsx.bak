import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import useAuthStore from '../../context/authStore';
import api from '../../services/api';

// ── Palette ───────────────────────────────────────────────────────
const C = {
  green:'#0A8F58', teal:'#0D9488', amber:'#D97706', red:'#E11D48',
  blue:'#2563EB',  purple:'#7C3AED', orange:'#EA580C',
  card:'#0E1620',  input:'#141E2B', hover:'#1A2535', border:'#1E2F42',
  text:'#F0F4F8',  muted:'#8BA0B5', dim:'#4E657A',
};
const fmt     = n  => Number(n||0).toLocaleString('fr-CI');
const fmtDate = d  => d ? new Date(d).toLocaleDateString('fr-CI',{day:'numeric',month:'long',year:'numeric'}) : '—';
const fmtShort= d  => d ? new Date(d).toLocaleDateString('fr-CI',{day:'numeric',month:'short',year:'numeric'}) : '—';
const BACKEND = 'https://mediconnect-backend-v2.vercel.app';
const getToken = () => { try { const r=JSON.parse(localStorage.getItem('mediconnect-auth')||'{}'); return r?.state?.token||r?.token||''; } catch{ return ''; } };
const fetchAuth = async (path, opts={}) => {
  const r = await fetch(`${BACKEND}/api${path}`, { ...opts, headers:{'Content-Type':'application/json','Authorization':`Bearer ${getToken()}`,...(opts.headers||{})} });
  return r.json();
};

// ── UI Components ─────────────────────────────────────────────────
const Badge = ({children,color='gray'}) => {
  const m={green:[C.green,'rgba(10,143,88,.15)'],teal:[C.teal,'rgba(13,148,136,.15)'],amber:[C.amber,'rgba(217,119,6,.15)'],red:[C.red,'rgba(225,29,72,.15)'],blue:[C.blue,'rgba(37,99,235,.15)'],purple:[C.purple,'rgba(124,58,237,.15)'],orange:[C.orange,'rgba(234,88,12,.15)'],gray:[C.muted,'rgba(255,255,255,.08)']};
  const [text,bg]=m[color]||m.gray;
  return <span style={{background:bg,color:text,fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:20,whiteSpace:'nowrap'}}>{children}</span>;
};
const Btn = ({children,onClick,variant='primary',loading,disabled,style:s={},type='button'}) => {
  const v={primary:{background:`linear-gradient(135deg,${C.green},${C.teal})`,color:'#fff',border:'none'},outline:{background:'transparent',color:C.muted,border:`1.5px solid ${C.border}`},danger:{background:'rgba(225,29,72,.1)',color:C.red,border:'1.5px solid rgba(225,29,72,.25)'},amber:{background:C.amber,color:'#fff',border:'none'},blue:{background:C.blue,color:'#fff',border:'none'},purple:{background:C.purple,color:'#fff',border:'none'}};
  return <button type={type} onClick={onClick} disabled={loading||disabled} style={{borderRadius:9,padding:'9px 18px',fontSize:13,fontWeight:700,cursor:(loading||disabled)?'not-allowed':'pointer',opacity:(loading||disabled)?.65:1,fontFamily:'inherit',...v[variant]||v.primary,...s}}>{loading?'⏳…':children}</button>;
};
const Inp = ({label,value,onChange,type='text',placeholder,required,style:s={},rows}) => (
  <div style={{marginBottom:14,...s}}>
    {label&&<label style={{display:'block',fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:'.5px',marginBottom:5}}>{label}{required&&' *'}</label>}
    {rows
      ? <textarea value={value||''} onChange={onChange} placeholder={placeholder} rows={rows} required={required}
          style={{width:'100%',background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:9,padding:'10px 14px',color:C.text,fontSize:13,resize:'vertical',outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}
          onFocus={e=>e.target.style.borderColor=C.green} onBlur={e=>e.target.style.borderColor=C.border}/>
      : <input type={type} value={value||''} onChange={onChange} placeholder={placeholder} required={required}
          style={{width:'100%',background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:9,padding:'10px 14px',color:C.text,fontSize:14,outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}
          onFocus={e=>e.target.style.borderColor=C.green} onBlur={e=>e.target.style.borderColor=C.border}/>
    }
  </div>
);
const Sel = ({label,value,onChange,options=[],required,style:s={}}) => (
  <div style={{marginBottom:14,...s}}>
    {label&&<label style={{display:'block',fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:'.5px',marginBottom:5}}>{label}{required&&' *'}</label>}
    <select value={value||''} onChange={onChange} required={required}
      style={{width:'100%',background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:9,padding:'10px 14px',color:C.text,fontSize:13,outline:'none',fontFamily:'inherit'}}
      onFocus={e=>e.target.style.borderColor=C.green} onBlur={e=>e.target.style.borderColor=C.border}>
      {options.map(o=>typeof o==='string'?<option key={o} value={o}>{o}</option>:<option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  </div>
);
const Modal = ({open,onClose,title,children,width=560}) => {
  if(!open) return null;
  return <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.8)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16,overflowY:'auto'}}>
    <div onClick={e=>e.stopPropagation()} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:28,width,maxWidth:'95vw',maxHeight:'90vh',overflowY:'auto',margin:'auto'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <h2 style={{fontSize:17,fontWeight:700,color:C.text,margin:0}}>{title}</h2>
        <button onClick={onClose} style={{background:'none',border:'none',color:C.muted,cursor:'pointer',fontSize:20,lineHeight:1}}>✕</button>
      </div>
      {children}
    </div>
  </div>;
};
const Grid = ({cols=2,gap=14,children,style:s={}}) => <div style={{display:'grid',gridTemplateColumns:`repeat(${cols},1fr)`,gap,...s}}>{children}</div>;
const Loader = () => <div style={{textAlign:'center',padding:48,color:C.dim,fontSize:14}}>⏳ Chargement…</div>;
const Empty = ({icon,title,subtitle}) => <div style={{textAlign:'center',padding:'32px 16px',color:C.dim}}>
  <div style={{fontSize:36,marginBottom:10}}>{icon}</div>
  {title&&<div style={{fontSize:14,fontWeight:700,color:C.muted,marginBottom:4}}>{title}</div>}
  {subtitle&&<div style={{fontSize:12,lineHeight:1.5}}>{subtitle}</div>}
</div>;
const InfoCell = ({label,value,color}) => (
  <div style={{background:C.hover,borderRadius:8,padding:'10px 12px'}}>
    <div style={{fontSize:10,color:C.dim,fontWeight:700,textTransform:'uppercase',letterSpacing:'.5px',marginBottom:3}}>{label}</div>
    <div style={{fontSize:13,color:color||C.text,fontWeight:600}}>{value||'—'}</div>
  </div>
);
const SectionTitle = ({icon,title,color=C.green}) => (
  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14,paddingBottom:8,borderBottom:`2px solid ${color}20`}}>
    <span style={{fontSize:18}}>{icon}</span>
    <h3 style={{fontSize:15,fontWeight:800,color,margin:0}}>{title}</h3>
  </div>
);

// ── Constantes médicales ──────────────────────────────────────────
const GROUPES_SANGUINS = ['—','A+','A-','B+','B-','AB+','AB-','O+','O-'];
const SEXES = ['—','Masculin','Féminin','Autre'];
const ASSURANCES = [{v:'',l:'Sans assurance'},{v:'NSIA',l:'NSIA Assurances'},{v:'Allianz CI',l:'Allianz CI'},{v:'AXA CI',l:'AXA CI'},{v:'CNAM (CMU)',l:'CNAM (CMU)'},{v:'Saham',l:'Saham Assurances'},{v:'SUNU',l:'SUNU Assurances'},{v:'Autre',l:'Autre'}];
const PAYS = [{v:'CI',l:"🇨🇮 Côte d'Ivoire"},{v:'SN',l:'🇸🇳 Sénégal'},{v:'BF',l:'🇧🇫 Burkina Faso'},{v:'ML',l:'🇲🇱 Mali'},{v:'TG',l:'🇹🇬 Togo'},{v:'BJ',l:'🇧🇯 Bénin'},{v:'GN',l:'🇬🇳 Guinée'},{v:'CM',l:'🇨🇲 Cameroun'},{v:'GA',l:'🇬🇦 Gabon'},{v:'Autre',l:'Autre pays'}];
const PATHOLOGIES_COMMUNES = ['Hypertension artérielle (HTA)','Diabète type 2','Diabète type 1','Paludisme','Asthme','Insuffisance cardiaque','Ulcère gastrique','Drépanocytose','Tuberculose','VIH/SIDA','Hépatite B','Hépatite C','Insuffisance rénale chronique','Épilepsie','Dépression','Autre'];

// ── API DME ───────────────────────────────────────────────────────
const dmeAPI = {
  getMe:       ()  => fetchAuth('/patients/me'),
  create:      (d) => fetchAuth('/patients', {method:'POST',body:JSON.stringify(d)}),
  update:      (id,d) => fetchAuth(`/patients/${id}`, {method:'PUT',body:JSON.stringify(d)}),
  consults:    ()  => fetchAuth('/consultations'),
  ordonnances: ()  => fetchAuth('/ordonnances'),
  bulletins:   ()  => fetchAuth('/bulletins'),
  factures:    ()  => fetchAuth('/factures/patient'),
};

// ════════════════════════════════════════════════════════════════════
//  FORMULAIRE CRÉATION DOSSIER PATIENT
// ════════════════════════════════════════════════════════════════════
function FormCreationDossier({onSuccess,onClose}) {
  const {user} = useAuthStore();
  const qc = useQueryClient();
  const [form,setForm] = useState({
    prenom: user?.prenom||'', nom: user?.nom||'',
    telephone: user?.telephone||'', email: user?.email||'',
    date_naissance:'', sexe:'', ville: user?.ville||'',
    pays_code:'CI', groupe_sanguin:'',
    allergies:'', antecedents:'', assurance:'',
    numero_police:'',
    medecin_traitant:'', contact_urgence:'',
    maladies_chroniques:'', chirurgies:'', traitements_en_cours:'',
    vaccinations:'',
  });
  const f = k => e => setForm(p=>({...p,[k]:e.target.value}));

  const createMut = useMutation({
    mutationFn: d => dmeAPI.create(d),
    onSuccess: (r) => {
      if(r.success) {
        toast.success('🎉 Dossier médical créé avec succès !');
        qc.invalidateQueries(['dme-patient']);
        onSuccess&&onSuccess(r.data);
      } else {
        toast.error(r.message||'Erreur création');
      }
    },
    onError: () => toast.error('Erreur lors de la création du dossier'),
  });

  const handleSubmit = () => {
    if(!form.prenom||!form.nom) { toast.error('Prénom et nom requis'); return; }
    createMut.mutate(form);
  };

  return (
    <div>
      {/* Header */}
      <div style={{background:'linear-gradient(135deg,rgba(10,143,88,.12),rgba(13,148,136,.06))',border:'1px solid rgba(10,143,88,.2)',borderRadius:12,padding:16,marginBottom:20}}>
        <div style={{fontSize:14,fontWeight:700,color:C.green,marginBottom:4}}>📋 Création de votre Dossier Médical Électronique</div>
        <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>
          Votre DME est confidentiel et sécurisé. Il sera accessible uniquement par vous et les médecins que vous autorisez. Remplissez les informations avec précision pour une meilleure prise en charge.
        </div>
      </div>

      {/* Section 1: Identité */}
      <SectionTitle icon="👤" title="Identité du patient"/>
      <Grid cols={2} gap={12}>
        <Inp label="Prénom *" required value={form.prenom} onChange={f('prenom')} placeholder="Adjoua"/>
        <Inp label="Nom *" required value={form.nom} onChange={f('nom')} placeholder="Koné"/>
        <Inp label="Date de naissance" type="date" value={form.date_naissance} onChange={f('date_naissance')}/>
        <Sel label="Sexe" value={form.sexe} onChange={f('sexe')} options={SEXES.map(s=>({v:s,l:s}))}/>
        <Inp label="Téléphone" type="tel" value={form.telephone} onChange={f('telephone')} placeholder="+225 07 00 00 00 00"/>
        <Inp label="Email" type="email" value={form.email} onChange={f('email')} placeholder="votre@email.com"/>
        <Inp label="Ville de résidence" value={form.ville} onChange={f('ville')} placeholder="Abidjan"/>
        <Sel label="Pays" value={form.pays_code} onChange={f('pays_code')} options={PAYS}/>
      </Grid>
      <Inp label="Contact en cas d'urgence (nom + téléphone)" value={form.contact_urgence} onChange={f('contact_urgence')} placeholder="Koffi Jean — +225 05 00 00 00 00"/>

      {/* Section 2: Informations médicales */}
      <SectionTitle icon="🩺" title="Informations médicales" color={C.teal}/>
      <Grid cols={2} gap={12}>
        <Sel label="Groupe sanguin" value={form.groupe_sanguin} onChange={f('groupe_sanguin')} options={GROUPES_SANGUINS.map(g=>({v:g,l:g}))}/>
        <Inp label="Médecin traitant habituel" value={form.medecin_traitant} onChange={f('medecin_traitant')} placeholder="Dr. Konan Alice"/>
      </Grid>
      <Inp label="Allergies (médicaments, aliments, autres)" value={form.allergies} onChange={f('allergies')} placeholder="Pénicilline, Aspirine, fruits de mer…" rows={2}/>
      <Inp label="Antécédents médicaux familiaux" value={form.antecedents} onChange={f('antecedents')} placeholder="Diabète (père), HTA (mère), cancer du sein (tante)…" rows={2}/>

      {/* Section 3: Pathologies et traitements */}
      <SectionTitle icon="💊" title="Pathologies chroniques & Traitements" color={C.amber}/>
      <div style={{marginBottom:14}}>
        <label style={{display:'block',fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:'.5px',marginBottom:8}}>Maladies chroniques connues</label>
        <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:10}}>
          {PATHOLOGIES_COMMUNES.map(p=>(
            <button key={p} type="button"
              onClick={()=>{
                const current = form.maladies_chroniques.split(',').map(x=>x.trim()).filter(Boolean);
                const idx = current.indexOf(p);
                const updated = idx>=0 ? current.filter(x=>x!==p) : [...current,p];
                setForm(prev=>({...prev,maladies_chroniques:updated.join(', ')}));
              }}
              style={{background:form.maladies_chroniques.includes(p)?'rgba(217,119,6,.2)':C.hover,border:`1.5px solid ${form.maladies_chroniques.includes(p)?C.amber:C.border}`,borderRadius:20,padding:'5px 12px',fontSize:11,fontWeight:600,color:form.maladies_chroniques.includes(p)?C.amber:C.muted,cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}}>
              {form.maladies_chroniques.includes(p)?'✓ ':''}{p}
            </button>
          ))}
        </div>
        <Inp label="Autres maladies chroniques" value={form.maladies_chroniques} onChange={f('maladies_chroniques')} placeholder="Saisie manuelle ou sélection ci-dessus"/>
      </div>
      <Inp label="Chirurgies et hospitalisations passées" value={form.chirurgies} onChange={f('chirurgies')} placeholder="Appendicectomie 2018, Césarienne 2021…" rows={2}/>
      <Inp label="Traitements en cours (médicaments + posologie)" value={form.traitements_en_cours} onChange={f('traitements_en_cours')} placeholder="Amlodipine 5mg 1x/jour, Metformine 500mg 2x/jour…" rows={2}/>
      <Inp label="Vaccinations (avec dates si connues)" value={form.vaccinations} onChange={f('vaccinations')} placeholder="Covid-19 (2022), Hépatite B (2020), Fièvre jaune (2019)…" rows={2}/>

      {/* Section 4: Assurance */}
      <SectionTitle icon="🛡️" title="Couverture assurance" color={C.blue}/>
      <Grid cols={2} gap={12}>
        <Sel label="Compagnie d'assurance" value={form.assurance} onChange={f('assurance')} options={ASSURANCES}/>
        <Inp label="Numéro de police / adhérent" value={form.numero_police} onChange={f('numero_police')} placeholder="ASS-2024-000123"/>
      </Grid>

      {/* Boutons */}
      <div style={{display:'flex',gap:10,marginTop:20}}>
        {onClose&&<Btn variant="outline" style={{flex:1}} onClick={onClose}>Annuler</Btn>}
        <Btn style={{flex:2}} loading={createMut.isPending} onClick={handleSubmit}>
          🎉 Créer mon dossier médical
        </Btn>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  FORMULAIRE MODIFICATION DOSSIER
// ════════════════════════════════════════════════════════════════════
function FormModifDossier({patient, onClose}) {
  const qc = useQueryClient();
  const [form,setForm] = useState({...patient});
  const f = k => e => setForm(p=>({...p,[k]:e.target.value}));

  const updMut = useMutation({
    mutationFn: d => dmeAPI.update(patient.id, d),
    onSuccess: (r) => {
      if(r.success) { toast.success('✅ Dossier mis à jour'); qc.invalidateQueries(['dme-patient']); onClose(); }
      else toast.error(r.message||'Erreur');
    },
  });

  return (
    <div>
      <Grid cols={2} gap={12}>
        <Inp label="Prénom" value={form.prenom} onChange={f('prenom')}/>
        <Inp label="Nom" value={form.nom} onChange={f('nom')}/>
        <Inp label="Téléphone" type="tel" value={form.telephone} onChange={f('telephone')}/>
        <Sel label="Groupe sanguin" value={form.groupe_sanguin} onChange={f('groupe_sanguin')} options={GROUPES_SANGUINS.map(g=>({v:g,l:g}))}/>
        <Inp label="Date de naissance" type="date" value={form.date_naissance?.split('T')[0]||''} onChange={f('date_naissance')}/>
        <Sel label="Sexe" value={form.sexe} onChange={f('sexe')} options={SEXES.map(s=>({v:s,l:s}))}/>
      </Grid>
      <Inp label="Allergies" value={form.allergies} onChange={f('allergies')} rows={2}/>
      <Inp label="Antécédents familiaux" value={form.antecedents} onChange={f('antecedents')} rows={2}/>
      <Inp label="Maladies chroniques" value={form.maladies_chroniques} onChange={f('maladies_chroniques')} rows={2}/>
      <Inp label="Traitements en cours" value={form.traitements_en_cours} onChange={f('traitements_en_cours')} rows={2}/>
      <Inp label="Contact urgence" value={form.contact_urgence} onChange={f('contact_urgence')}/>
      <Grid cols={2} gap={12}>
        <Sel label="Assurance" value={form.assurance} onChange={f('assurance')} options={ASSURANCES}/>
        <Inp label="N° police" value={form.numero_police} onChange={f('numero_police')}/>
      </Grid>
      <div style={{display:'flex',gap:10,marginTop:16}}>
        <Btn variant="outline" style={{flex:1}} onClick={onClose}>Annuler</Btn>
        <Btn style={{flex:2}} loading={updMut.isPending} onClick={()=>updMut.mutate(form)}>💾 Sauvegarder</Btn>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  FORMULAIRE AJOUT CONSULTATION (patient peut ajouter une note)
// ════════════════════════════════════════════════════════════════════
function FormAddConsultation({patientId, onClose}) {
  const qc = useQueryClient();
  const [form,setForm] = useState({diagnostic:'',traitement:'',notes:'',tension_arterielle:'',temperature:'',poids:'',taille:'',medecin_nom:'',date_consult:new Date().toISOString().split('T')[0]});
  const f = k => e => setForm(p=>({...p,[k]:e.target.value}));

  const addMut = useMutation({
    mutationFn: d => fetchAuth('/consultations', {method:'POST',body:JSON.stringify(d)}),
    onSuccess: r => {
      if(r.success) { toast.success('✅ Consultation ajoutée au dossier'); qc.invalidateQueries(['dme-consults']); onClose(); }
      else toast.error(r.message||'Erreur');
    },
    onError: () => toast.error('Erreur lors de l\'ajout'),
  });

  return (
    <div>
      <div style={{background:'rgba(13,148,136,.07)',border:'1px solid rgba(13,148,136,.2)',borderRadius:10,padding:12,marginBottom:16,fontSize:12,color:C.muted}}>
        💡 Ajoutez ici les informations d'une consultation passée pour compléter votre historique médical.
      </div>
      <Grid cols={2} gap={12}>
        <Inp label="Médecin consulté" value={form.medecin_nom} onChange={f('medecin_nom')} placeholder="Dr. Kouamé Alice"/>
        <Inp label="Date de consultation" type="date" value={form.date_consult} onChange={f('date_consult')}/>
      </Grid>
      <Inp label="Diagnostic *" required value={form.diagnostic} onChange={f('diagnostic')} placeholder="Hypertension artérielle stade 2, Grippe saisonnière…" rows={2}/>
      <Inp label="Traitement prescrit" value={form.traitement} onChange={f('traitement')} placeholder="Amlodipine 5mg 1x/jour pendant 30 jours…" rows={2}/>
      <Grid cols={4} gap={10}>
        <Inp label="Tension (mmHg)" value={form.tension_arterielle} onChange={f('tension_arterielle')} placeholder="120/80"/>
        <Inp label="Temp. (°C)" type="number" value={form.temperature} onChange={f('temperature')} placeholder="37.2"/>
        <Inp label="Poids (kg)" type="number" value={form.poids} onChange={f('poids')} placeholder="70"/>
        <Inp label="Taille (cm)" type="number" value={form.taille} onChange={f('taille')} placeholder="175"/>
      </Grid>
      <Inp label="Notes / Observations du médecin" value={form.notes} onChange={f('notes')} placeholder="Patient bien tolérant le traitement. Contrôle dans 1 mois. Régime hyposodé recommandé…" rows={3}/>
      <div style={{display:'flex',gap:10,marginTop:4}}>
        <Btn variant="outline" style={{flex:1}} onClick={onClose}>Annuler</Btn>
        <Btn style={{flex:2}} loading={addMut.isPending} onClick={()=>{
          if(!form.diagnostic) { toast.error('Diagnostic requis'); return; }
          addMut.mutate({...form, patient_id:patientId||undefined});
        }}>📋 Ajouter au dossier</Btn>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  FORMULAIRE AJOUT BULLETIN (imagerie, labo, autre)
// ════════════════════════════════════════════════════════════════════
function FormAddBulletin({onClose}) {
  const qc = useQueryClient();
  const fileRef = useRef();
  const [fichier,setFichier] = useState(null);
  const [preview,setPreview] = useState(null);
  const [form,setForm] = useState({type:'Radiologie',categorie:'imagerie',patient_nom:'',notes:'',rapport:''});
  const f = k => e => setForm(p=>({...p,[k]:e.target.value}));
  const TYPES = {
    imagerie:['Radiologie','IRM','Scanner','Échographie','Mammographie','Scintigraphie','Autre imagerie'],
    laboratoire:['NFS','Glycémie','Bilan lipidique','Bilan hépatique','Bilan rénal','HbA1c','Sérologie','ECBU','Hémoculture','PCR','Ionogramme','Groupe sanguin','Bilan thyroïdien','Autre analyse'],
    autre:['Certificat médical','Compte-rendu chirurgie','Note de consultation','Courrier médecin','Autre document'],
  };

  const addMut = useMutation({
    mutationFn: d => fetchAuth('/bulletins', {method:'POST',body:JSON.stringify(d)}),
    onSuccess: r => {
      if(r.success) { toast.success('✅ Document archivé dans votre dossier'); qc.invalidateQueries(['dme-bulletins']); onClose(); }
      else toast.error(r.message||'Erreur');
    },
    onError: () => toast.error('Erreur lors de l\'archivage'),
  });

  const handleFile = e => {
    const file = e.target.files[0]; if(!file) return;
    setFichier(file);
    if(file.type.startsWith('image/')) { const r=new FileReader(); r.onload=ev=>setPreview(ev.target.result); r.readAsDataURL(file); }
    else setPreview(null);
  };

  return (
    <div>
      <Grid cols={2} gap={12}>
        <Sel label="Catégorie" value={form.categorie} onChange={e=>{setForm(p=>({...p,categorie:e.target.value,type:TYPES[e.target.value]?.[0]||''}));}} options={[{v:'imagerie',l:'🩻 Imagerie médicale'},{v:'laboratoire',l:'🧪 Laboratoire'},{v:'autre',l:'📄 Autre document'}]}/>
        <Sel label="Type de document *" value={form.type} onChange={f('type')} options={(TYPES[form.categorie]||TYPES.autre).map(t=>({v:t,l:t}))}/>
      </Grid>
      <Inp label="Nom du patient (si différent)" value={form.patient_nom} onChange={f('patient_nom')} placeholder="Laissez vide pour vous-même"/>

      {/* Zone upload */}
      <div style={{marginBottom:14}}>
        <label style={{display:'block',fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:'.5px',marginBottom:8}}>Fichier (photo, scan, PDF)</label>
        <div onClick={()=>fileRef.current?.click()}
          style={{border:`2px dashed ${fichier?C.green:C.border}`,borderRadius:12,padding:24,textAlign:'center',cursor:'pointer',background:fichier?'rgba(10,143,88,.05)':'transparent',transition:'all .15s'}}
          onMouseOver={e=>e.currentTarget.style.borderColor=C.green} onMouseOut={e=>e.currentTarget.style.borderColor=fichier?C.green:C.border}>
          <input ref={fileRef} type="file" accept="image/*,.pdf,.doc,.docx" onChange={handleFile} style={{display:'none'}}/>
          {preview ? <img src={preview} alt="Aperçu" style={{maxHeight:160,maxWidth:'100%',borderRadius:8,marginBottom:8}}/> :
            fichier ? <div><div style={{fontSize:28,marginBottom:8}}>📄</div><div style={{color:C.green,fontWeight:700,fontSize:13}}>{fichier.name}</div></div> :
            <div><div style={{fontSize:32,marginBottom:8}}>📎</div><div style={{fontSize:13,color:C.muted}}>Cliquez pour joindre un fichier</div><div style={{fontSize:11,color:C.dim,marginTop:4}}>JPG, PNG, PDF, DOC</div></div>
          }
        </div>
      </div>

      <Inp label="Description / Interprétation" value={form.rapport} onChange={f('rapport')} placeholder="Compte-rendu du médecin, résultats, interprétation…" rows={3}/>
      <Inp label="Notes personnelles" value={form.notes} onChange={f('notes')} placeholder="Contexte, date de la consultation, médecin référent…" rows={2}/>
      <div style={{display:'flex',gap:10,marginTop:4}}>
        <Btn variant="outline" style={{flex:1}} onClick={onClose}>Annuler</Btn>
        <Btn style={{flex:2}} loading={addMut.isPending} onClick={()=>{
          if(!form.type) { toast.error('Type requis'); return; }
          addMut.mutate({type:form.type,categorie:form.categorie,patient_nom:form.patient_nom||undefined,fichier_nom:fichier?.name||null,rapport:form.rapport||null,notes:form.notes||null});
        }}>📁 Archiver dans le dossier</Btn>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  PAGE DOSSIER PATIENT — MODULE PRINCIPAL
// ════════════════════════════════════════════════════════════════════
export default function PageDossier() {
  const {user} = useAuthStore();
  const qc = useQueryClient();
  const [activeTab,setActiveTab] = useState('profil');
  const [showEdit,setShowEdit] = useState(false);
  const [showAddConsult,setShowAddConsult] = useState(false);
  const [showAddBulletin,setShowAddBulletin] = useState(false);
  const [expandedConsult,setExpandedConsult] = useState(null);

  // ── Data Fetching ─────────────────────────────────────────────
  const {data:patientData,isLoading:ldPat} = useQuery({
    queryKey:['dme-patient'],
    queryFn: () => dmeAPI.getMe().then(r=>r.data||null),
    retry:2,
  });
  const {data:consultsData,isLoading:ldCons} = useQuery({
    queryKey:['dme-consults'],
    queryFn: () => dmeAPI.consults().then(r=>r.data||[]),
    retry:1,
  });
  const {data:ordsData,isLoading:ldOrds} = useQuery({
    queryKey:['dme-ords'],
    queryFn: () => dmeAPI.ordonnances().then(r=>r.data||[]),
    retry:1,
  });
  const {data:bulletinsData,isLoading:ldBul} = useQuery({
    queryKey:['dme-bulletins'],
    queryFn: () => dmeAPI.bulletins().then(r=>r.data||[]),
    retry:1,
  });
  const {data:facturesData} = useQuery({
    queryKey:['dme-factures'],
    queryFn: () => dmeAPI.factures().then(r=>r.data||[]),
    retry:1,
  });

  const patient = patientData;
  const consults = consultsData||[];
  const ords = ordsData||[];
  const bulletins = bulletinsData||[];
  const factures = facturesData||[];

  const TABS = [
    {key:'profil',      icon:'👤', label:'Mon profil'},
    {key:'antecedents', icon:'📋', label:'Antécédents'},
    {key:'consultations',icon:'🩺',label:`Consultations (${consults.length})`},
    {key:'ordonnances', icon:'💊', label:`Ordonnances (${ords.filter(o=>o.statut==='active').length} actives)`},
    {key:'bulletins',   icon:'📁', label:`Documents (${bulletins.length})`},
    {key:'factures',    icon:'🧾', label:`Factures (${factures.length})`},
  ];

  // ── Si pas de dossier : formulaire de création ────────────────
  if(ldPat) return <Loader/>;

  if(!patient) return (
    <div>
      <div style={{textAlign:'center',padding:'32px 0 24px'}}>
        <div style={{fontSize:48,marginBottom:12}}>📋</div>
        <h1 style={{fontSize:22,fontWeight:800,color:C.text,marginBottom:8}}>Créer votre Dossier Médical</h1>
        <p style={{fontSize:14,color:C.muted,maxWidth:480,margin:'0 auto 24px',lineHeight:1.6}}>
          Vous n'avez pas encore de dossier médical électronique. Créez-le en quelques minutes pour bénéficier du suivi médical complet MediConnect.
        </p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12,maxWidth:600,margin:'0 auto 32px'}}>
          {[['🔒','Sécurisé & confidentiel'],['📱','Accessible partout'],['🩺','Partageable avec votre médecin'],['📊','Historique complet']].map(([icon,label])=>(
            <div key={label} style={{background:C.input,border:`1px solid ${C.border}`,borderRadius:12,padding:'14px 10px',textAlign:'center'}}>
              <div style={{fontSize:24,marginBottom:6}}>{icon}</div>
              <div style={{fontSize:11,color:C.muted,fontWeight:600,lineHeight:1.3}}>{label}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{maxWidth:700,margin:'0 auto'}}>
        <FormCreationDossier onSuccess={()=>qc.invalidateQueries(['dme-patient'])}/>
      </div>
    </div>
  );

  // ── Calcul âge ────────────────────────────────────────────────
  const age = patient.date_naissance
    ? Math.floor((new Date()-new Date(patient.date_naissance))/(365.25*24*3600*1000))
    : null;

  return (
    <div>
      {/* ── En-tête dossier ─────────────────────────────────── */}
      <div style={{background:`linear-gradient(135deg,rgba(10,143,88,.12),rgba(13,148,136,.06))`,border:'1px solid rgba(10,143,88,.25)',borderRadius:16,padding:24,marginBottom:20}}>
        <div style={{display:'flex',alignItems:'flex-start',gap:18,flexWrap:'wrap'}}>
          {/* Avatar */}
          <div style={{width:64,height:64,borderRadius:'50%',background:`linear-gradient(135deg,${C.green},${C.teal})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,fontWeight:900,color:'#fff',flexShrink:0}}>
            {patient.prenom?.[0]}{patient.nom?.[0]}
          </div>
          {/* Infos principales */}
          <div style={{flex:1,minWidth:200}}>
            <div style={{fontSize:22,fontWeight:800,color:C.text,marginBottom:4}}>{patient.prenom} {patient.nom}</div>
            <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:8}}>
              {age&&<Badge color="teal">{age} ans</Badge>}
              {patient.sexe&&patient.sexe!=='—'&&<Badge color="blue">{patient.sexe}</Badge>}
              {patient.groupe_sanguin&&patient.groupe_sanguin!=='—'&&<Badge color="red">🩸 {patient.groupe_sanguin}</Badge>}
              {patient.code_secret&&<Badge color="green">🔑 {patient.code_secret}</Badge>}
            </div>
            <div style={{fontSize:12,color:C.muted}}>
              {patient.telephone&&<span>📞 {patient.telephone}  </span>}
              {patient.ville&&<span>📍 {patient.ville}</span>}
            </div>
          </div>
          {/* Alertes médicales */}
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {patient.allergies&&(
              <div style={{background:'rgba(225,29,72,.1)',border:'1px solid rgba(225,29,72,.25)',borderRadius:10,padding:'8px 14px',fontSize:12}}>
                <span style={{color:C.red,fontWeight:700}}>⚠️ Allergies : </span>
                <span style={{color:C.text}}>{patient.allergies.slice(0,60)}{patient.allergies.length>60?'…':''}</span>
              </div>
            )}
            {patient.assurance&&patient.assurance!==''&&(
              <div style={{background:'rgba(37,99,235,.08)',border:'1px solid rgba(37,99,235,.2)',borderRadius:10,padding:'8px 14px',fontSize:12}}>
                <span style={{color:C.blue,fontWeight:700}}>🛡️ {patient.assurance} </span>
                {patient.numero_police&&<span style={{color:C.muted}}>· {patient.numero_police}</span>}
              </div>
            )}
          </div>
          {/* Bouton modifier */}
          <Btn variant="outline" style={{padding:'8px 14px',fontSize:12}} onClick={()=>setShowEdit(true)}>✏️ Modifier</Btn>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────── */}
      <div style={{display:'flex',gap:2,background:C.input,borderRadius:12,padding:4,marginBottom:20,overflowX:'auto',flexWrap:'nowrap'}}>
        {TABS.map(t=>(
          <button key={t.key} onClick={()=>setActiveTab(t.key)}
            style={{flex:'0 0 auto',background:activeTab===t.key?C.hover:'transparent',border:'none',borderRadius:8,padding:'8px 14px',cursor:'pointer',fontFamily:'inherit',color:activeTab===t.key?C.text:C.muted,fontSize:12,fontWeight:activeTab===t.key?700:400,whiteSpace:'nowrap',transition:'all .15s'}}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ══ TAB : PROFIL ══════════════════════════════════════ */}
      {activeTab==='profil'&&(
        <div>
          <SectionTitle icon="👤" title="Identité & Coordonnées"/>
          <Grid cols={3} gap={10} style={{marginBottom:20}}>
            <InfoCell label="Prénom" value={patient.prenom}/>
            <InfoCell label="Nom" value={patient.nom}/>
            <InfoCell label="Date de naissance" value={fmtDate(patient.date_naissance)}/>
            <InfoCell label="Sexe" value={patient.sexe}/>
            <InfoCell label="Groupe sanguin" value={patient.groupe_sanguin} color={C.red}/>
            <InfoCell label="Âge" value={age?`${age} ans`:'—'}/>
            <InfoCell label="Téléphone" value={patient.telephone}/>
            <InfoCell label="Email" value={patient.email}/>
            <InfoCell label="Ville" value={patient.ville}/>
          </Grid>
          {patient.contact_urgence&&(
            <div style={{background:'rgba(217,119,6,.07)',border:'1px solid rgba(217,119,6,.2)',borderRadius:10,padding:14,marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:700,color:C.amber,marginBottom:4}}>🚨 Contact d'urgence</div>
              <div style={{fontSize:13,color:C.text}}>{patient.contact_urgence}</div>
            </div>
          )}
          <SectionTitle icon="🛡️" title="Assurance maladie" color={C.blue}/>
          <Grid cols={2} gap={10}>
            <InfoCell label="Compagnie d'assurance" value={patient.assurance||'Non renseigné'}/>
            <InfoCell label="N° police / adhérent" value={patient.numero_police}/>
          </Grid>
          <SectionTitle icon="🩺" title="Médecin traitant" color={C.teal}/>
          <InfoCell label="Médecin traitant habituel" value={patient.medecin_traitant||'Non renseigné'}/>
        </div>
      )}

      {/* ══ TAB : ANTÉCÉDENTS ════════════════════════════════ */}
      {activeTab==='antecedents'&&(
        <div>
          {/* Alertes critiques */}
          {patient.allergies&&patient.allergies!==''&&(
            <div style={{background:'rgba(225,29,72,.1)',border:'2px solid rgba(225,29,72,.3)',borderRadius:12,padding:16,marginBottom:16}}>
              <div style={{fontSize:13,fontWeight:700,color:C.red,marginBottom:6}}>⚠️ ALLERGIES — À signaler à tout soignant</div>
              <div style={{fontSize:14,color:C.text,fontWeight:600}}>{patient.allergies}</div>
            </div>
          )}
          <Grid cols={1} gap={14}>
            {[
              {icon:'🏥',title:'Maladies chroniques',value:patient.maladies_chroniques,color:C.amber},
              {icon:'🧬',title:'Antécédents familiaux',value:patient.antecedents,color:C.purple},
              {icon:'🔪',title:'Chirurgies & Hospitalisations',value:patient.chirurgies,color:C.blue},
              {icon:'💊',title:'Traitements en cours',value:patient.traitements_en_cours,color:C.green},
              {icon:'💉',title:'Vaccinations',value:patient.vaccinations,color:C.teal},
            ].map(item=>(
              <div key={item.title} style={{background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:12,padding:16}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                  <span style={{fontSize:18}}>{item.icon}</span>
                  <span style={{fontSize:13,fontWeight:700,color:item.color}}>{item.title}</span>
                </div>
                {item.value
                  ? <div style={{fontSize:13,color:C.text,lineHeight:1.7,whiteSpace:'pre-wrap'}}>{item.value}</div>
                  : <div style={{fontSize:12,color:C.dim,fontStyle:'italic'}}>Non renseigné — <button onClick={()=>setShowEdit(true)} style={{background:'none',border:'none',color:C.green,cursor:'pointer',fontSize:12,fontFamily:'inherit',textDecoration:'underline'}}>Compléter le dossier</button></div>
                }
              </div>
            ))}
          </Grid>
        </div>
      )}

      {/* ══ TAB : CONSULTATIONS ══════════════════════════════ */}
      {activeTab==='consultations'&&(
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:700,color:C.text}}>{consults.length} consultation(s) enregistrée(s)</div>
            <Btn style={{padding:'8px 14px',fontSize:12}} onClick={()=>setShowAddConsult(true)}>+ Ajouter consultation</Btn>
          </div>
          {ldCons?<Loader/>:consults.length===0
            ?<Empty icon="🩺" title="Aucune consultation" subtitle="Vos consultations apparaîtront ici après chaque visite chez un médecin MediConnect."/>
            :consults.map(c=>(
              <div key={c.id} style={{background:C.input,border:`1.5px solid ${C.border}`,borderRadius:14,marginBottom:14,overflow:'hidden',transition:'border-color .15s'}}
                onMouseOver={e=>e.currentTarget.style.borderColor=C.teal} onMouseOut={e=>e.currentTarget.style.borderColor=C.border}>
                {/* En-tête consultation */}
                <div style={{display:'flex',alignItems:'center',gap:14,padding:'14px 16px',cursor:'pointer'}}
                  onClick={()=>setExpandedConsult(expandedConsult===c.id?null:c.id)}>
                  <div style={{width:40,height:40,borderRadius:'50%',background:`linear-gradient(135deg,${C.teal},${C.green})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>🩺</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:2}}>
                      {c.diagnostic?.split(',')[0]?.slice(0,50)||'Consultation'}
                    </div>
                    <div style={{fontSize:11,color:C.muted}}>
                      {fmtShort(c.created_at)} {(c.med_prenom||c.medecin_nom)&&`· Dr. ${c.med_prenom||''} ${c.med_nom||c.medecin_nom||''}`}
                    </div>
                  </div>
                  <Badge color="teal">Complétée</Badge>
                  <span style={{color:C.dim,fontSize:16}}>{expandedConsult===c.id?'▲':'▼'}</span>
                </div>

                {/* Détails consultation (expandable) */}
                {expandedConsult===c.id&&(
                  <div style={{borderTop:`1px solid ${C.border}`,padding:16}}>
                    <Grid cols={2} gap={14} style={{marginBottom:14}}>
                      <div>
                        <div style={{fontSize:11,color:C.dim,fontWeight:700,textTransform:'uppercase',marginBottom:6}}>Diagnostic</div>
                        <div style={{fontSize:13,color:C.text,lineHeight:1.6}}>{c.diagnostic||'—'}</div>
                      </div>
                      <div>
                        <div style={{fontSize:11,color:C.dim,fontWeight:700,textTransform:'uppercase',marginBottom:6}}>Traitement</div>
                        <div style={{fontSize:13,color:C.text,lineHeight:1.6}}>{c.traitement||'—'}</div>
                      </div>
                    </Grid>
                    {/* Constantes */}
                    {(c.tension_arterielle||c.temperature||c.poids||c.taille)&&(
                      <div style={{background:C.hover,borderRadius:10,padding:12,marginBottom:12}}>
                        <div style={{fontSize:11,color:C.dim,fontWeight:700,textTransform:'uppercase',marginBottom:8}}>Constantes vitales</div>
                        <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
                          {c.tension_arterielle&&<div><span style={{color:C.dim,fontSize:11}}>T.A. </span><strong style={{color:C.text}}>{c.tension_arterielle}</strong></div>}
                          {c.temperature&&<div><span style={{color:C.dim,fontSize:11}}>Temp. </span><strong style={{color:C.text}}>{c.temperature}°C</strong></div>}
                          {c.poids&&<div><span style={{color:C.dim,fontSize:11}}>Poids </span><strong style={{color:C.text}}>{c.poids} kg</strong></div>}
                          {c.taille&&<div><span style={{color:C.dim,fontSize:11}}>Taille </span><strong style={{color:C.text}}>{c.taille} cm</strong></div>}
                        </div>
                      </div>
                    )}
                    {c.notes&&(
                      <div style={{background:'rgba(37,99,235,.07)',border:'1px solid rgba(37,99,235,.15)',borderRadius:10,padding:12}}>
                        <div style={{fontSize:11,color:C.blue,fontWeight:700,textTransform:'uppercase',marginBottom:6}}>Notes du médecin</div>
                        <div style={{fontSize:13,color:C.text,lineHeight:1.7,whiteSpace:'pre-wrap'}}>{c.notes}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          }
        </div>
      )}

      {/* ══ TAB : ORDONNANCES ════════════════════════════════ */}
      {activeTab==='ordonnances'&&(
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:700,color:C.text}}>{ords.length} ordonnance(s)</div>
          </div>
          {ldOrds?<Loader/>:ords.length===0
            ?<Empty icon="💊" title="Aucune ordonnance" subtitle="Vos prescriptions médicales apparaîtront ici."/>
            :ords.map(o=>(
              <div key={o.id} style={{background:C.input,border:`1.5px solid ${o.statut==='active'?'rgba(10,143,88,.3)':C.border}`,borderRadius:14,padding:20,marginBottom:14}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:12,paddingBottom:10,borderBottom:`1px solid ${C.border}`}}>
                  <div>
                    <div style={{fontSize:12,color:C.dim,marginBottom:2}}>{fmtDate(o.created_at)}</div>
                    <div style={{fontSize:12,color:C.muted}}>Dr. {o.medecin_nom||o.med_prenom&&`${o.med_prenom} ${o.med_nom}`||'—'}</div>
                  </div>
                  <Badge color={o.statut==='active'?'green':'gray'}>{o.statut==='active'?'✅ Active':'Terminée'}</Badge>
                </div>
                <div style={{background:C.hover,borderRadius:10,padding:14,marginBottom:12}}>
                  <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:6}}>{o.medicaments||'—'}</div>
                  {o.posologie&&<div style={{fontSize:12,color:C.muted,marginBottom:3}}>📋 Posologie : {o.posologie}</div>}
                  {o.duree&&<div style={{fontSize:12,color:C.muted}}>⏱️ Durée : {o.duree}</div>}
                  {o.notes_ord&&<div style={{fontSize:12,color:C.dim,marginTop:8,fontStyle:'italic'}}>{o.notes_ord}</div>}
                </div>
                <div style={{display:'flex',gap:8}}>
                  <Btn style={{flex:2,padding:'7px',fontSize:11}} onClick={()=>{
                    const u = useAuthStore.getState().user;
                    const sep = '='.repeat(30);
                    const txt = 'ORDONNANCE MÉDICALE\n'+sep+'\nPatient : '+(u?.prenom||'')+' '+(u?.nom||'')+'\nDate    : '+new Date(o.created_at).toLocaleDateString('fr-CI')+'\nMédecin : Dr. '+(o.medecin_nom||'—')+'\n\nPRESCRIPTION :\n'+(o.medicaments||'—')+'\n\nPosologie : '+(o.posologie||'—')+'\nDurée     : '+(o.duree||'—')+'\n'+(o.notes_ord?'Notes : '+o.notes_ord+'\n':'')+'\nMediConnect Africa — Document médical officiel';
                    const blob = new Blob([txt],{type:'text/plain'});
                    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `ordonnance_${o.id?.slice(-6)||'mc'}.txt`; a.click();
                    toast.success('📥 Ordonnance téléchargée !');
                  }}>📥 Télécharger</Btn>
                  <Btn variant="outline" style={{flex:1,padding:'7px',fontSize:11}} onClick={()=>toast.success('Envoyée à la pharmacie ! 💊')}>💊 Pharmacie</Btn>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* ══ TAB : DOCUMENTS (BULLETINS) ══════════════════════ */}
      {activeTab==='bulletins'&&(
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:700,color:C.text}}>{bulletins.length} document(s) archivé(s)</div>
            <Btn style={{padding:'8px 14px',fontSize:12}} onClick={()=>setShowAddBulletin(true)}>+ Archiver un document</Btn>
          </div>
          {ldBul?<Loader/>:bulletins.length===0
            ?<Empty icon="📁" title="Aucun document" subtitle="Archivez vos résultats d'analyses, radios, comptes-rendus et tous vos documents médicaux."/>
            :<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14}}>
              {bulletins.map(b=>{
                const CAT_COLOR={imagerie:C.purple,laboratoire:C.teal,autre:C.blue};
                const CAT_ICON={imagerie:'🩻',laboratoire:'🧪',autre:'📄'};
                return (
                  <div key={b.id} style={{background:C.input,border:`1.5px solid ${b.statut==='nouveau'?'rgba(37,99,235,.25)':C.border}`,borderRadius:14,padding:16,transition:'border-color .15s'}}
                    onMouseOver={e=>e.currentTarget.style.borderColor=CAT_COLOR[b.categorie]||C.green}
                    onMouseOut={e=>e.currentTarget.style.borderColor=b.statut==='nouveau'?'rgba(37,99,235,.25)':C.border}>
                    <div style={{display:'flex',alignItems:'flex-start',gap:12,marginBottom:10}}>
                      <div style={{width:40,height:40,borderRadius:10,background:`rgba(${b.categorie==='imagerie'?'124,58,237':b.categorie==='laboratoire'?'13,148,136':'37,99,235'},.15)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>{CAT_ICON[b.categorie]||'📄'}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:2}}>{b.type||'Document'}</div>
                        <div style={{fontSize:10,color:CAT_COLOR[b.categorie]||C.muted,fontWeight:700,textTransform:'uppercase'}}>{b.categorie}</div>
                      </div>
                      <Badge color={b.statut==='nouveau'?'blue':'green'}>{b.statut==='nouveau'?'Nouveau':'Traité'}</Badge>
                    </div>
                    <div style={{fontSize:11,color:C.dim,marginBottom:8}}>{fmtShort(b.created_at)}</div>
                    {b.fichier_nom&&<div style={{fontSize:11,color:C.muted,marginBottom:8,background:C.hover,borderRadius:6,padding:'4px 8px'}}>📎 {b.fichier_nom}</div>}
                    {b.rapport&&<div style={{fontSize:12,color:C.muted,lineHeight:1.5,marginBottom:8}}>{b.rapport.slice(0,100)}{b.rapport.length>100?'…':''}</div>}
                    {b.notes&&<div style={{fontSize:11,color:C.dim,fontStyle:'italic'}}>{b.notes.slice(0,60)}</div>}
                  </div>
                );
              })}
            </div>
          }
        </div>
      )}

      {/* ══ TAB : FACTURES ═══════════════════════════════════ */}
      {activeTab==='factures'&&(
        <div>
          {/* Récap */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:20}}>
            {[
              {l:'Total factures',v:factures.length,c:C.blue},
              {l:'Montant payé',v:`${fmt(factures.filter(f=>f.statut==='payee').reduce((s,f)=>s+(+f.montant||0),0))} F`,c:C.green},
              {l:'En attente',v:`${fmt(factures.filter(f=>f.statut==='en_attente').reduce((s,f)=>s+(+f.montant||0),0))} F`,c:C.amber},
            ].map(item=>(
              <div key={item.l} style={{background:C.input,border:`1.5px solid ${C.border}`,borderRadius:12,padding:'14px 12px',textAlign:'center'}}>
                <div style={{fontSize:20,fontWeight:900,color:item.c,marginBottom:4}}>{item.v}</div>
                <div style={{fontSize:11,color:C.dim}}>{item.l}</div>
              </div>
            ))}
          </div>
          {factures.length===0
            ?<Empty icon="🧾" title="Aucune facture" subtitle="Vos factures apparaîtront ici après chaque consultation."/>
            :factures.map(f=>(
              <div key={f.id} style={{display:'flex',alignItems:'center',gap:14,padding:'12px 16px',background:C.input,border:`1.5px solid ${C.border}`,borderRadius:12,marginBottom:10}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.text}}>{f.description||f.type_facture||'Facture médicale'}</div>
                  <div style={{fontSize:11,color:C.muted}}>{fmtShort(f.created_at)} · {f.reference||'—'}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:16,fontWeight:800,color:f.statut==='payee'?C.green:C.amber}}>{fmt(f.montant)} F</div>
                  <Badge color={f.statut==='payee'?'green':'amber'}>{f.statut==='payee'?'Payée':'Impayée'}</Badge>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* ══ MODALS ════════════════════════════════════════════ */}
      <Modal open={showEdit} onClose={()=>setShowEdit(false)} title="✏️ Modifier mon dossier médical" width={600}>
        {patient&&<FormModifDossier patient={patient} onClose={()=>setShowEdit(false)}/>}
      </Modal>

      <Modal open={showAddConsult} onClose={()=>setShowAddConsult(false)} title="🩺 Ajouter une consultation" width={580}>
        <FormAddConsultation patientId={patient?.id} onClose={()=>setShowAddConsult(false)}/>
      </Modal>

      <Modal open={showAddBulletin} onClose={()=>setShowAddBulletin(false)} title="📁 Archiver un document médical" width={560}>
        <FormAddBulletin onClose={()=>setShowAddBulletin(false)}/>
      </Modal>
    </div>
  );
}
