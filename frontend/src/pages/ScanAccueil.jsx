import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import useAuthStore from '../context/authStore';

const BACKEND = 'https://mediconnect-backend-v2.vercel.app';

// ── Palette claire — surface patient (scan QR / file d'attente) ──────
// Redemandee par les patients (ancien theme sombre #060C12 juge trop
// froid pour une salle d'attente). Fond blanc/quasi-blanc, vert de
// marque MediConnect conserve comme seul accent fort, typographie
// Plus Jakarta Sans deja utilisee sur rdv.mediconnect4africa.cloud
// pour une identite coherente entre les deux surfaces patient.
const C = {
  bg: '#F5F8F6',
  card: '#FFFFFF',
  border: '#E3E9E6',
  borderStrong: '#CFDAD5',
  text: '#122420',
  muted: '#5B6E67',
  dim: '#94A6A0',
  green: '#0A8F58',
  greenDark: '#087349',
  greenSoft: '#E7F5EE',
  amber: '#B45309',
  amberSoft: '#FDF3E7',
};
const FONT = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif";
const SHADOW = '0 24px 48px -24px rgba(18,36,32,.20)';

// Injecte les keyframes une seule fois -- necessaire car ce projet
// n'utilise que des styles inline (pas de fichier CSS par page), et
// les animations ne peuvent pas s'exprimer en objet style JS.
function StyleAnim() {
  return (
    <style>{`
      @keyframes mcFadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
      @keyframes mcPop { 0% { transform:scale(.6); opacity:0; } 60% { transform:scale(1.06); opacity:1; } 100% { transform:scale(1); } }
      @keyframes mcPulse { 0%,100% { box-shadow:0 0 0 0 rgba(10,143,88,.18); } 50% { box-shadow:0 0 0 10px rgba(10,143,88,0); } }
    `}</style>
  );
}

export default function ScanAccueil() {
  const [params] = useSearchParams();

  // Persiste le dernier clinique_id vu -- indispensable pour le PWA :
  // une fois installee sur l'ecran d'accueil, l'app se relance sur
  // start_url="/scan-accueil" SANS le parametre d'origine (celui-ci
  // venait du QR code scanne au tout premier lancement). Sans ce
  // repli, relancer l'app installee retomberait toujours en erreur
  // "QR Code invalide".
  const [cliniqueId] = useState(() => {
    const depuisUrl = params.get('clinique_id');
    try {
      if (depuisUrl) { localStorage.setItem('mc_dernier_clinique_id', depuisUrl); return depuisUrl; }
      return localStorage.getItem('mc_dernier_clinique_id') || null;
    } catch { return depuisUrl; }
  });

  const { user, token } = useAuthStore();

  const [step, setStep] = useState('loading'); // loading | confirm | success | error
  const [clinique, setClinique] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [medecins, setMedecins] = useState([]);
  const [selectedMedecin, setSelectedMedecin] = useState('');
  const [motif, setMotif] = useState('');
  const [loading, setLoading] = useState(false);

  // Recherche unifiee (nom, telephone OU code secret) pour un patient
  // deja enregistre mais non connecte sur ce telephone -- evite que le
  // bureau des entrees doive le ressaisir alors que son dossier existe
  // deja dans MediConnect. Si la recherche echoue, patientNom/patientTel
  // permettent de creer reellement le dossier au lieu de rediriger le
  // patient hors du parcours (voir bloc JSX plus bas).
  const [termeRecherche, setTermeRecherche] = useState('');
  const [resultatsRecherche, setResultatsRecherche] = useState([]);
  const [patientTrouve, setPatientTrouve] = useState(null);
  const [patientNom, setPatientNom] = useState('');
  const [patientTel, setPatientTel] = useState('');
  const [erreurValidation, setErreurValidation] = useState('');

  // ── PWA : manifest dedie a cette interface + banniere d'installation
  // (meme mecanisme "beforeinstallprompt" que rdv.mediconnect4africa.cloud).
  // Le manifest de l'app clinique (sombre, usage staff) n'est pas touche --
  // celui-ci est propre a la page patient, avec sa propre icone/couleur.
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installMasque, setInstallMasque] = useState(false);
  useEffect(() => {
    const lien = document.querySelector('link[rel="manifest"]');
    const original = lien?.getAttribute('href');
    if (lien) lien.setAttribute('href', '/manifest-accueil.json');
    return () => { if (lien && original) lien.setAttribute('href', original); };
  }, []);
  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);
  const installer = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  const rechercherPatient = (valeur) => {
    setTermeRecherche(valeur);
    setPatientTrouve(null);
    if (valeur.trim().length < 2) { setResultatsRecherche([]); return; }
    fetch(`${BACKEND}/api/public/patients/recherche?q=${encodeURIComponent(valeur.trim())}`)
      .then(r => r.json())
      .then(d => setResultatsRecherche(d?.data || []))
      .catch(() => setResultatsRecherche([]));
  };

  useEffect(() => {
    if (!cliniqueId) { setStep('error'); return; }
    // Récupérer infos clinique
    fetch(`${BACKEND}/api/public/cliniques`)
      .then(r => r.json())
      .then(d => {
        const cl = (d.data||[]).find(c => c.id === cliniqueId);
        if (cl) { setClinique(cl); setStep('confirm'); }
        else setStep('error');
      })
      .catch(() => setStep('error'));

    // Récupérer médecins de la clinique
    fetch(`${BACKEND}/api/public/medecins?clinique_id=${cliniqueId}`)
      .then(r => r.json())
      .then(d => setMedecins(d.data || []))
      .catch(() => {});
  }, [cliniqueId]);

  const handleScan = async () => {
    setErreurValidation('');
    if (!user && !patientTrouve && (!patientNom.trim() || !patientTel.trim())) {
      setErreurValidation('Merci de renseigner votre nom et votre téléphone pour rejoindre la file.');
      return;
    }
    setLoading(true);
    try {
      const body = {
        clinique_id: cliniqueId,
        motif: motif || null,
        medecin_id: selectedMedecin || null,
      };
      if (user && token) {
        body.patient_id = user.patient_id || user.id;
      } else if (patientTrouve) {
        body.patient_id = patientTrouve.id;
      } else if (patientNom.trim() && patientTel.trim()) {
        // BUG CORRIGE : avant, aucune de ces informations n'etait envoyee
        // si la recherche echouait -- la file recevait une entree
        // "Patient anonyme" sans telephone. Desormais le backend
        // retrouve ou cree reellement la fiche patient a partir de ces
        // deux champs (voir POST /api/file-attente/scan).
        body.patient_nom = patientNom.trim();
        body.patient_telephone = patientTel.trim();
      }
      const r = await fetch(`${BACKEND}/api/file-attente/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const d = await r.json();
      if (d.success) {
        setTicket(d.data);
        localStorage.setItem('mc_ticket_id', d.data.id);
        setStep('success');
      } else {
        setStep('error');
      }
    } catch { setStep('error'); }
    setLoading(false);
  };

  const inputStyle = {
    width:'100%', padding:'12px 14px', background:C.bg, border:`1.5px solid ${C.border}`,
    borderRadius:10, color:C.text, fontSize:14, outline:'none', boxSizing:'border-box',
    fontFamily:FONT, transition:'border-color .15s, box-shadow .15s',
  };
  const onFocusIn = e => { e.target.style.borderColor = C.green; e.target.style.boxShadow = `0 0 0 3px ${C.greenSoft}`; };
  const onFocusOut = e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; };

  const InstallBandeau = () => (
    !installPrompt || installMasque ? null : (
      <div style={{display:'flex',alignItems:'center',gap:10,background:C.greenSoft,border:`1px solid ${C.green}22`,borderRadius:12,padding:'10px 12px',marginBottom:18,animation:'mcFadeUp .3s ease'}}>
        <div style={{width:34,height:34,borderRadius:9,background:C.green,display:'flex',alignItems:'center',justifyContent:'center',fontSize:17,flexShrink:0,color:'#fff'}}>+</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:12.5,fontWeight:700,color:C.text}}>Installer sur l'écran d'accueil</div>
          <div style={{fontSize:11,color:C.muted}}>Retrouvez votre file d'attente en un tap</div>
        </div>
        <button onClick={installer} style={{background:C.green,color:'#fff',border:'none',borderRadius:8,padding:'7px 12px',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:FONT,whiteSpace:'nowrap'}}>Installer</button>
        <button onClick={()=>setInstallMasque(true)} style={{background:'none',border:'none',color:C.dim,cursor:'pointer',fontSize:16,padding:2}}>✕</button>
      </div>
    )
  );

  if (step === 'loading') return (
    <div style={{minHeight:'100vh',background:C.bg,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:FONT}}>
      <StyleAnim/>
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:14}}>
        <div style={{width:44,height:44,borderRadius:12,background:C.green,animation:'mcPulse 1.6s ease-in-out infinite'}}/>
        <div style={{color:C.muted,fontSize:14,fontWeight:500}}>Chargement…</div>
      </div>
    </div>
  );

  if (step === 'error') return (
    <div style={{minHeight:'100vh',background:C.bg,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem',fontFamily:FONT}}>
      <StyleAnim/>
      <div style={{background:C.card,border:`1px solid ${C.border}`,boxShadow:SHADOW,borderRadius:20,padding:'2.25rem 2rem',maxWidth:400,width:'100%',textAlign:'center',animation:'mcFadeUp .35s ease'}}>
        <div style={{width:64,height:64,borderRadius:'50%',background:C.amberSoft,display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,margin:'0 auto 16px'}}>⚠️</div>
        <h2 style={{color:C.text,marginBottom:8,fontSize:19,fontWeight:800}}>QR Code invalide</h2>
        <p style={{color:C.muted,fontSize:14,lineHeight:1.6}}>Ce QR Code n'est pas reconnu. Contactez l'accueil de la clinique.</p>
      </div>
    </div>
  );

  if (step === 'success') return (
    <div style={{minHeight:'100vh',background:C.bg,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem',fontFamily:FONT}}>
      <StyleAnim/>
      <div style={{background:C.card,border:`1px solid ${C.border}`,boxShadow:SHADOW,borderRadius:20,padding:'2.25rem 2rem',maxWidth:400,width:'100%',textAlign:'center',animation:'mcFadeUp .35s ease'}}>
        <div style={{width:76,height:76,borderRadius:'50%',background:C.greenSoft,border:`2px solid ${C.green}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:32,margin:'0 auto 18px',color:C.green,animation:'mcPop .45s ease'}}>✓</div>
        <h2 style={{color:C.text,fontSize:21,fontWeight:800,marginBottom:6}}>Vous êtes dans la file !</h2>
        <p style={{color:C.muted,fontSize:14,marginBottom:22,lineHeight:1.7}}>{ticket?.message}</p>

        <div style={{background:C.greenSoft,borderRadius:14,padding:'18px',marginBottom:20}}>
          <div style={{fontSize:46,fontWeight:900,color:C.green,lineHeight:1}}>{ticket?.rang}</div>
          <div style={{fontSize:12.5,color:C.muted,marginTop:5,fontWeight:600}}>Votre numéro de rang</div>
        </div>

        <div style={{fontSize:13,color:C.muted,marginBottom:18,textAlign:'left',background:C.bg,borderRadius:12,padding:'14px 16px',lineHeight:1.9}}>
          <div><strong style={{color:C.text}}>Clinique</strong> · {ticket?.clinique_nom}</div>
          {ticket?.medecin_nom && <div><strong style={{color:C.text}}>Médecin</strong> · {ticket?.medecin_nom}</div>}
          <div><strong style={{color:C.text}}>Patients devant vous</strong> · {ticket?.patients_devant}</div>
        </div>

        <InstallBandeau/>

        <p style={{fontSize:12,color:C.dim,lineHeight:1.6}}>
          Restez à proximité. Vous serez appelé par voix à l'accueil.<br/>
          Consultez votre rang en temps réel dans l'application MediConnect.
        </p>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:'100vh',background:C.bg,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem',fontFamily:FONT}}>
      <StyleAnim/>
      <div style={{background:C.card,border:`1px solid ${C.border}`,boxShadow:SHADOW,borderRadius:20,padding:'2rem',maxWidth:420,width:'100%',animation:'mcFadeUp .35s ease'}}>
        {/* Header */}
        <div style={{textAlign:'center',marginBottom:22}}>
          <div style={{width:60,height:60,borderRadius:16,background:C.greenSoft,border:`1.5px solid ${C.green}33`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,margin:'0 auto 14px'}}>🏥</div>
          <h2 style={{color:C.text,fontSize:19,fontWeight:800,marginBottom:4}}>{clinique?.nom}</h2>
          <p style={{color:C.muted,fontSize:13,fontWeight:500}}>Rejoindre la file d'attente</p>
        </div>

        <InstallBandeau/>

        {!user && (
          <div style={{background:C.amberSoft,border:`1px solid ${C.amber}22`,borderRadius:10,padding:'10px 14px',marginBottom:16}}>
            <p style={{fontSize:12,color:C.amber,lineHeight:1.6,fontWeight:500}}>
              💡 Connectez-vous à MediConnect pour un meilleur suivi de votre rang en temps réel.
            </p>
          </div>
        )}

        {!user && (
          <div style={{marginBottom:14}}>
            <label style={{fontSize:11.5,color:C.muted,display:'block',marginBottom:6,fontWeight:700,textTransform:'uppercase',letterSpacing:'.3px'}}>Déjà enregistré ? Recherchez votre nom (optionnel)</label>
            <input
              value={termeRecherche}
              onChange={e=>rechercherPatient(e.target.value)}
              placeholder="Tapez votre nom et prénom"
              style={inputStyle}
              onFocus={onFocusIn} onBlur={onFocusOut}
            />
            {resultatsRecherche.length > 0 && (
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,marginTop:6,overflow:'hidden',boxShadow:'0 4px 16px rgba(18,36,32,.06)'}}>
                {resultatsRecherche.map(p => (
                  <div key={p.id} onClick={() => { setPatientTrouve(p); setTermeRecherche(`${p.prenom} ${p.nom}`); setResultatsRecherche([]); }}
                    style={{padding:'10px 12px',cursor:'pointer',borderBottom:`1px solid ${C.border}`,fontSize:13}}>
                    <div style={{color:C.text,fontWeight:700}}>{p.prenom} {p.nom}</div>
                    {p.telephone && <div style={{color:C.dim,fontSize:11}}>{p.telephone}</div>}
                  </div>
                ))}
              </div>
            )}
            {patientTrouve && (
              <div style={{marginTop:8,fontSize:12,color:C.green,fontWeight:600,display:'flex',alignItems:'center',gap:5}}>
                ✓ Dossier trouvé : {patientTrouve.prenom} {patientTrouve.nom}
              </div>
            )}
            {termeRecherche.trim().length >= 2 && resultatsRecherche.length === 0 && !patientTrouve && (
              <div style={{marginTop:10,background:C.greenSoft,border:`1px solid ${C.green}22`,borderRadius:12,padding:'14px'}}>
                <p style={{fontSize:12,color:C.muted,margin:'0 0 10px',lineHeight:1.6}}>
                  🆕 Aucun dossier existant trouvé. Renseignez votre nom et votre téléphone pour créer votre dossier et rejoindre la file — pas besoin de repasser par l'accueil.
                </p>
                <input
                  value={patientNom || termeRecherche}
                  onChange={e=>setPatientNom(e.target.value)}
                  placeholder="Nom et prénom"
                  style={{...inputStyle, background:C.card, marginBottom:8}}
                  onFocus={onFocusIn} onBlur={onFocusOut}
                />
                <input
                  value={patientTel}
                  onChange={e=>setPatientTel(e.target.value)}
                  placeholder="Téléphone (ex: 07 00 00 00 00)"
                  type="tel"
                  style={{...inputStyle, background:C.card}}
                  onFocus={onFocusIn} onBlur={onFocusOut}
                />
              </div>
            )}
          </div>
        )}

        <div style={{marginBottom:14}}>
          <label style={{fontSize:11.5,color:C.muted,display:'block',marginBottom:6,fontWeight:700,textTransform:'uppercase',letterSpacing:'.3px'}}>Motif de visite (optionnel)</label>
          <input
            value={motif}
            onChange={e=>setMotif(e.target.value)}
            placeholder="Ex: Consultation générale, Renouvellement ordonnance..."
            style={inputStyle}
            onFocus={onFocusIn} onBlur={onFocusOut}
          />
        </div>

        {medecins.length > 0 && (
          <div style={{marginBottom:22}}>
            <label style={{fontSize:11.5,color:C.muted,display:'block',marginBottom:6,fontWeight:700,textTransform:'uppercase',letterSpacing:'.3px'}}>Médecin (optionnel)</label>
            <select
              value={selectedMedecin}
              onChange={e=>setSelectedMedecin(e.target.value)}
              style={inputStyle}
              onFocus={onFocusIn} onBlur={onFocusOut}
            >
              <option value="">— Premier médecin disponible —</option>
              {medecins.map(m=>(
                <option key={m.id} value={m.id}>Dr. {m.prenom} {m.nom} {m.specialite?`— ${m.specialite}`:''}</option>
              ))}
            </select>
          </div>
        )}

        {erreurValidation && (
          <div style={{marginBottom:10,fontSize:12,color:C.amber,textAlign:'center',fontWeight:600}}>{erreurValidation}</div>
        )}
        <button
          onClick={handleScan}
          disabled={loading}
          style={{width:'100%',padding:'15px',background:loading?C.greenDark:C.green,border:'none',borderRadius:12,color:'#fff',fontWeight:700,fontSize:15,cursor:loading?'default':'pointer',opacity:loading?.85:1,fontFamily:FONT,boxShadow:'0 8px 20px -6px rgba(10,143,88,.45)',transition:'transform .12s, box-shadow .12s'}}
          onMouseDown={e=>{if(!loading)e.currentTarget.style.transform='scale(.98)';}}
          onMouseUp={e=>{e.currentTarget.style.transform='scale(1)';}}
        >
          {loading ? 'Enregistrement...' : "✓ Rejoindre la file d'attente →"}
        </button>
      </div>
    </div>
  );
}
