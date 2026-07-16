import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import useAuthStore from '../context/authStore';

const BACKEND = 'https://mediconnect-backend-v2.vercel.app';

const C = {
  bg:'#060C12',card:'#0E1620',border:'#1E2F42',
  text:'#F0F4F8',muted:'#8BA0B5',dim:'#4E657A',
  green:'#0A8F58',greenL:'#34D399',
};

export default function ScanAccueil() {
  const [params] = useSearchParams();
  const cliniqueId = params.get('clinique_id');
  const { user, token } = useAuthStore();

  const [step, setStep] = useState('loading'); // loading | confirm | success | error
  const [clinique, setClinique] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [medecins, setMedecins] = useState([]);
  const [selectedMedecin, setSelectedMedecin] = useState('');
  const [motif, setMotif] = useState('');
  const [loading, setLoading] = useState(false);

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
    setLoading(true);
    try {
      const body = {
        clinique_id: cliniqueId,
        motif: motif || null,
        medecin_id: selectedMedecin || null,
      };
      if (user && token) {
        body.patient_id = user.patient_id || user.id;
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

  if (step === 'loading') return (
    <div style={{minHeight:'100vh',background:C.bg,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{color:C.muted,fontSize:15}}>Chargement...</div>
    </div>
  );

  if (step === 'error') return (
    <div style={{minHeight:'100vh',background:C.bg,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:'2rem',maxWidth:400,width:'100%',textAlign:'center'}}>
        <div style={{fontSize:40,marginBottom:12}}>❌</div>
        <h2 style={{color:C.text,marginBottom:8}}>QR Code invalide</h2>
        <p style={{color:C.muted,fontSize:14}}>Ce QR Code n'est pas reconnu. Contactez l'accueil de la clinique.</p>
      </div>
    </div>
  );

  if (step === 'success') return (
    <div style={{minHeight:'100vh',background:C.bg,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}>
      <div style={{background:C.card,border:`1px solid rgba(10,143,88,.3)`,borderRadius:16,padding:'2rem',maxWidth:400,width:'100%',textAlign:'center'}}>
        <div style={{width:80,height:80,borderRadius:'50%',background:'rgba(10,143,88,.15)',border:`2px solid ${C.green}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:36,margin:'0 auto 16px'}}>✓</div>
        <h2 style={{color:C.greenL,fontSize:22,fontWeight:800,marginBottom:6}}>Vous êtes dans la file !</h2>
        <p style={{color:C.muted,fontSize:14,marginBottom:20,lineHeight:1.7}}>{ticket?.message}</p>

        <div style={{background:'rgba(10,143,88,.08)',border:`1px solid rgba(10,143,88,.2)`,borderRadius:12,padding:'16px',marginBottom:20}}>
          <div style={{fontSize:48,fontWeight:900,color:C.greenL,lineHeight:1}}>{ticket?.rang}</div>
          <div style={{fontSize:13,color:C.muted,marginTop:4}}>Votre numéro de rang</div>
        </div>

        <div style={{fontSize:13,color:C.dim,marginBottom:16}}>
          <strong style={{color:C.muted}}>Clinique :</strong> {ticket?.clinique_nom}<br/>
          {ticket?.medecin_nom && <><strong style={{color:C.muted}}>Médecin :</strong> {ticket?.medecin_nom}<br/></>}
          <strong style={{color:C.muted}}>Patients devant vous :</strong> {ticket?.patients_devant}
        </div>

        <p style={{fontSize:12,color:C.dim,lineHeight:1.6}}>
          Restez à proximité. Vous serez appelé par voix à l'accueil.<br/>
          Consultez votre rang en temps réel dans l'application MediConnect.
        </p>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:'100vh',background:C.bg,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:'2rem',maxWidth:420,width:'100%'}}>
        {/* Header */}
        <div style={{textAlign:'center',marginBottom:24}}>
          <div style={{width:56,height:56,borderRadius:12,background:'rgba(10,143,88,.15)',border:`1.5px solid ${C.green}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,margin:'0 auto 12px'}}>🏥</div>
          <h2 style={{color:C.text,fontSize:18,fontWeight:700,marginBottom:4}}>{clinique?.nom}</h2>
          <p style={{color:C.muted,fontSize:13}}>Rejoindre la file d'attente</p>
        </div>

        {!user && (
          <div style={{background:'rgba(245,158,11,.08)',border:'1px solid rgba(245,158,11,.2)',borderRadius:8,padding:'10px 14px',marginBottom:16}}>
            <p style={{fontSize:12,color:'#F59E0B',lineHeight:1.6}}>
              💡 Connectez-vous à MediConnect pour un meilleur suivi de votre rang en temps réel.
            </p>
          </div>
        )}

        <div style={{marginBottom:14}}>
          <label style={{fontSize:12,color:C.muted,display:'block',marginBottom:6}}>MOTIF DE VISITE (optionnel)</label>
          <input
            value={motif}
            onChange={e=>setMotif(e.target.value)}
            placeholder="Ex: Consultation générale, Renouvellement ordonnance..."
            style={{width:'100%',padding:'10px 12px',background:'rgba(255,255,255,.04)',border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:13,outline:'none',boxSizing:'border-box'}}
          />
        </div>

        {medecins.length > 0 && (
          <div style={{marginBottom:20}}>
            <label style={{fontSize:12,color:C.muted,display:'block',marginBottom:6}}>MÉDECIN (optionnel)</label>
            <select
              value={selectedMedecin}
              onChange={e=>setSelectedMedecin(e.target.value)}
              style={{width:'100%',padding:'10px 12px',background:'rgba(255,255,255,.04)',border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:13,outline:'none',boxSizing:'border-box'}}
            >
              <option value="">— Premier médecin disponible —</option>
              {medecins.map(m=>(
                <option key={m.id} value={m.id}>Dr. {m.prenom} {m.nom} {m.specialite?`— ${m.specialite}`:''}</option>
              ))}
            </select>
          </div>
        )}

        <button
          onClick={handleScan}
          disabled={loading}
          style={{width:'100%',padding:'14px',background:C.green,border:'none',borderRadius:10,color:'#fff',fontWeight:700,fontSize:15,cursor:'pointer',opacity:loading?.7:1}}
        >
          {loading ? 'Enregistrement...' : '✓ Rejoindre la file d\'attente →'}
        </button>
      </div>
    </div>
  );
}
