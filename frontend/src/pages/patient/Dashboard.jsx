import React, { useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import useAuthStore from "../../context/authStore";
import api from "../../services/api";

const C = {
  green:"#0A8F58",teal:"#0D9488",amber:"#D97706",red:"#E11D48",
  blue:"#2563EB",purple:"#7C3AED",
  bg:"#060C12",card:"#0E1620",input:"#141E2B",
  hover:"#1A2535",border:"#1E2F42",
  text:"#F0F4F8",muted:"#8BA0B5",dim:"#4E657A",
};
const fmt=(n)=>Number(n||0).toLocaleString("fr-CI");
const fmtDate=(d)=>d?new Date(d).toLocaleDateString("fr-CI",{day:"numeric",month:"long",year:"numeric"}):"—";
const today=()=>new Date().toISOString().split("T")[0];
const TARIFS={ abonnement_standard:300, abonnement_suivi:500 };

const pAPI = {
  rdvs:    ()    => api.get("/rendez-vous"),
  addRdv:  (d)   => api.post("/rendez-vous", d),
  cancelRdv:(id) => api.put(`/rendez-vous/${id}`,{statut:"annule"}),
  ords:    ()    => api.get("/ordonnances"),
  consults:()    => api.get("/consultations"),
  cliniques:()   => api.get("/public/cliniques"),
  medecins:(cid) => api.get("/public/medecins",{params:cid?{clinique_id:cid}:{}}),
  factures:()    => api.get("/factures/patient").catch(()=>api.get("/factures")),
};

// ── UI ────────────────────────────────────────────────────────────
const Card=({label,value,icon,color=C.green,sub,onClick})=>(
  <div onClick={onClick} style={{background:C.input,border:`1.5px solid ${C.border}`,borderRadius:14,padding:"18px 16px",cursor:onClick?"pointer":"default",transition:"border-color .15s"}}
    onMouseOver={e=>onClick&&(e.currentTarget.style.borderColor=color)} onMouseOut={e=>onClick&&(e.currentTarget.style.borderColor=C.border)}>
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
      {icon&&<span style={{fontSize:18}}>{icon}</span>}
      <span style={{fontSize:11,textTransform:"uppercase",letterSpacing:".5px",color:C.dim,fontWeight:700}}>{label}</span>
    </div>
    <div style={{fontSize:26,fontWeight:900,color}}>{value}</div>
    {sub&&<div style={{fontSize:12,color:C.muted,marginTop:3}}>{sub}</div>}
  </div>
);

const Panel=({title,children,actions,accent,style:s={}})=>(
  <div style={{background:C.input,border:`1.5px solid ${accent||C.border}`,borderRadius:14,padding:20,...s}}>
    {(title||actions)&&(
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        {title&&<h3 style={{fontSize:14,fontWeight:700,color:C.text,margin:0}}>{title}</h3>}
        {actions&&<div style={{display:"flex",gap:8}}>{actions}</div>}
      </div>
    )}
    {children}
  </div>
);

const Badge=({children,color="gray"})=>{
  const m={green:[C.green,"rgba(10,143,88,.15)"],teal:[C.teal,"rgba(13,148,136,.15)"],
    amber:[C.amber,"rgba(217,119,6,.15)"],red:[C.red,"rgba(225,29,72,.15)"],
    blue:[C.blue,"rgba(37,99,235,.15)"],purple:[C.purple,"rgba(124,58,237,.15)"],
    gray:[C.muted,"rgba(255,255,255,.08)"]};
  const [text,bg]=m[color]||m.gray;
  return <span style={{background:bg,color:text,fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20}}>{children}</span>;
};

const Btn=({children,onClick,variant="primary",loading,disabled,style:s={},type="button"})=>{
  const v={
    primary:{background:`linear-gradient(135deg,${C.green},${C.teal})`,color:"#fff",border:"none"},
    outline:{background:"transparent",color:C.muted,border:`1.5px solid ${C.border}`},
    danger:{background:"rgba(225,29,72,.1)",color:C.red,border:`1.5px solid rgba(225,29,72,.25)`},
    amber:{background:C.amber,color:"#fff",border:"none"},
  };
  return(
    <button type={type} onClick={onClick} disabled={loading||disabled}
      style={{borderRadius:9,padding:"9px 18px",fontSize:13,fontWeight:700,cursor:(loading||disabled)?"not-allowed":"pointer",opacity:(loading||disabled)?.65:1,fontFamily:"inherit",...v[variant]||v.primary,...s}}>
      {loading?"⏳…":children}
    </button>
  );
};

const Inp=({label,value,onChange,type="text",placeholder,required,style:s={}})=>(
  <div style={{marginBottom:14,...s}}>
    {label&&<label style={{display:"block",fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".5px",marginBottom:5}}>{label}{required&&" *"}</label>}
    <input type={type} value={value||""} onChange={onChange} placeholder={placeholder} required={required}
      style={{width:"100%",background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:9,padding:"10px 14px",color:C.text,fontSize:14,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}
      onFocus={e=>e.target.style.borderColor=C.green} onBlur={e=>e.target.style.borderColor=C.border}/>
  </div>
);

const Sel=({label,value,onChange,options=[],required,style:s={}})=>(
  <div style={{marginBottom:14,...s}}>
    {label&&<label style={{display:"block",fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".5px",marginBottom:5}}>{label}{required&&" *"}</label>}
    <select value={value||""} onChange={onChange} required={required}
      style={{width:"100%",background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:9,padding:"10px 14px",color:C.text,fontSize:14,outline:"none",fontFamily:"inherit"}}>
      {options.map(o=>typeof o==="string"?<option key={o} value={o}>{o}</option>:<option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  </div>
);

const Modal=({open,onClose,title,children,width=520})=>{
  if(!open)return null;
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:28,width,maxWidth:"95vw",maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <h2 style={{fontSize:17,fontWeight:700,color:C.text,margin:0}}>{title}</h2>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:20}}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
};

const Loader=()=><div style={{textAlign:"center",padding:48,color:C.dim}}>⏳ Chargement…</div>;
const Empty=({icon,title,subtitle})=>(
  <div style={{textAlign:"center",padding:"36px 20px",color:C.dim}}>
    <div style={{fontSize:38,marginBottom:10}}>{icon}</div>
    {title&&<div style={{fontSize:15,fontWeight:700,color:C.muted,marginBottom:4}}>{title}</div>}
    {subtitle&&<div style={{fontSize:13}}>{subtitle}</div>}
  </div>
);
const Grid=({cols=2,gap=16,children,style:s={}})=>(
  <div style={{display:"grid",gridTemplateColumns:`repeat(${cols},1fr)`,gap,...s}}>{children}</div>
);
const PageHeader=({title,subtitle,actions})=>(
  <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:24}}>
    <div>
      <h1 style={{fontSize:22,fontWeight:800,color:C.text,margin:"0 0 4px"}}>{title}</h1>
      {subtitle&&<p style={{fontSize:13,color:C.muted,margin:0}}>{subtitle}</p>}
    </div>
    {actions&&<div style={{display:"flex",gap:10}}>{actions}</div>}
  </div>
);
const Avatar=({prenom,nom,size=48,fontSize=18})=>(
  <div style={{width:size,height:size,borderRadius:"50%",background:`linear-gradient(135deg,${C.green},${C.teal})`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,color:"#fff",fontSize,flexShrink:0}}>
    {(prenom||"?")[0]}{(nom||"")[0]}
  </div>
);
const statusColor={confirme:"green",en_attente:"amber",annule:"red",en_cours:"teal",termine:"gray"};

// ════════════════════════════════════════════════════════════════════
//  PRISE DE RDV — FORMULAIRE 3 ÉTAPES
//  Étape 1: Sélection clinique
//  Étape 2: Sélection médecin lié à la clinique
//  Étape 3: Date/heure + aperçu des 2 types de factures
// ════════════════════════════════════════════════════════════════════
function FormPriseRdv({onClose,onSuccess,medecinPreselect=null}){
  const {user}=useAuthStore();
  const qc=useQueryClient();
  const [step,setStep]=useState(medecinPreselect?3:1);
  const [cliniqueId,setCliniqueId]=useState(medecinPreselect?.clinique_id||"");
  const [cliniqueNom,setCliniqueNom]=useState("");
  const [medecin,setMedecin]=useState(medecinPreselect||null);
  const [dateRdv,setDateRdv]=useState(today());
  const [heureRdv,setHeureRdv]=useState("09:00");
  const [motif,setMotif]=useState("");
  const [assurance,setAssurance]=useState("");

  const {data:cliniquesData,isLoading:ldCl}=useQuery({queryKey:["pub-cliniques"],queryFn:()=>pAPI.cliniques().then(r=>r.data.data||[])});
  const {data:medecinsData,isLoading:ldMed}=useQuery({queryKey:["pub-medecins",cliniqueId],queryFn:()=>pAPI.medecins(cliniqueId).then(r=>r.data.data||[]),enabled:step>=2});

  const cliniques=cliniquesData||[];
  const medecins=medecinsData||[];

  const addMut=useMutation({
    mutationFn:d=>pAPI.addRdv(d),
    onSuccess:()=>{toast.success("✅ RDV confirmé !");qc.invalidateQueries(["pat-rdvs"]);onSuccess&&onSuccess();onClose&&onClose();},
    onError:e=>toast.error("Erreur : "+(e?.response?.data?.message||"Réessayez")),
  });

  const patientNom=`${user?.prenom||""} ${user?.nom||""}`.trim();
  const fraisService=TARIFS.abonnement_standard;
  const fraisMedecin=medecin?.tarif?Number(medecin.tarif):0;
  const total=fraisService+fraisMedecin;

  // ÉTAPE 1 : Clinique
  if(step===1) return(
    <div>
      <div style={{fontSize:13,color:C.muted,marginBottom:16,lineHeight:1.6}}>Sélectionnez la clinique où vous souhaitez consulter.</div>
      {ldCl?<Loader/>:cliniques.length===0?<Empty icon="🏥" title="Aucune clinique" subtitle="Revenez bientôt"/>:(
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
          {cliniques.map(cl=>(
            <button key={cl.id} onClick={()=>{setCliniqueId(cl.id);setCliniqueNom(cl.nom||"Clinique");setStep(2);}}
              style={{background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:12,padding:"14px 16px",cursor:"pointer",textAlign:"left",fontFamily:"inherit",transition:"all .15s"}}
              onMouseOver={e=>e.currentTarget.style.borderColor=C.green} onMouseOut={e=>e.currentTarget.style.borderColor=C.border}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <span style={{fontSize:24}}>🏥</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:700,color:C.text}}>{cl.nom||"Clinique"}</div>
                  <div style={{fontSize:12,color:C.muted}}>{cl.ville||cl.adresse||"—"}</div>
                  {cl.telephone&&<div style={{fontSize:11,color:C.dim}}>📞 {cl.telephone}</div>}
                </div>
                <span style={{color:C.green,fontSize:18}}>→</span>
              </div>
            </button>
          ))}
        </div>
      )}
      <Btn variant="outline" style={{width:"100%"}} onClick={onClose}>Annuler</Btn>
    </div>
  );

  // ÉTAPE 2 : Médecin de la clinique
  if(step===2) return(
    <div>
      {/* Clinique sélectionnée */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,padding:"10px 14px",background:C.hover,borderRadius:10}}>
        <span style={{fontSize:20}}>🏥</span>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:700,color:C.text}}>{cliniqueNom}</div>
          <button onClick={()=>setStep(1)} style={{background:"none",border:"none",color:C.teal,cursor:"pointer",fontSize:11,padding:0,fontFamily:"inherit"}}>← Changer de clinique</button>
        </div>
      </div>
      <div style={{fontSize:12,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".5px",marginBottom:10}}>Médecins disponibles</div>
      {ldMed?<Loader/>:medecins.length===0
        ?<Empty icon="👨‍⚕️" title="Aucun médecin pour cette clinique" subtitle="Essayez une autre clinique"/>
        :(
          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
            {medecins.map(m=>(
              <button key={m.id} onClick={()=>{setMedecin(m);setStep(3);}}
                style={{background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:12,padding:"12px 14px",cursor:"pointer",textAlign:"left",fontFamily:"inherit",transition:"all .15s"}}
                onMouseOver={e=>e.currentTarget.style.borderColor=C.teal} onMouseOut={e=>e.currentTarget.style.borderColor=C.border}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:40,height:40,borderRadius:"50%",background:`linear-gradient(135deg,${C.purple},${C.teal})`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,color:"#fff",fontSize:14,flexShrink:0}}>
                    {m.prenom?.[0]}{m.nom?.[0]}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:700,color:C.text}}>Dr. {m.prenom} {m.nom}</div>
                    <div style={{fontSize:11,color:C.teal}}>{m.specialite||"Médecin"}</div>
                    {m.jours_travail&&<div style={{fontSize:10,color:C.dim,marginTop:2}}>📅 {m.jours_travail}</div>}
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    {m.tarif&&<><div style={{fontSize:14,fontWeight:800,color:C.green}}>{fmt(m.tarif)} F</div><div style={{fontSize:10,color:C.dim}}>consult.</div></>}
                    <div style={{marginTop:4}}><Badge color={{Disponible:"green","En consultation":"amber",Absent:"red"}[m.statut]||"gray"}>{m.statut||"—"}</Badge></div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )
      }
      <div style={{display:"flex",gap:10}}>
        <Btn variant="outline" style={{flex:1}} onClick={()=>setStep(1)}>← Retour</Btn>
        <Btn variant="outline" style={{flex:1}} onClick={onClose}>Annuler</Btn>
      </div>
    </div>
  );

  // ÉTAPE 3 : Date / heure / factures
  return(
    <div>
      {/* Médecin sélectionné */}
      <div style={{background:`rgba(13,148,136,.08)`,border:`1px solid rgba(13,148,136,.2)`,borderRadius:12,padding:"12px 16px",marginBottom:18,display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:40,height:40,borderRadius:"50%",background:`linear-gradient(135deg,${C.purple},${C.teal})`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,color:"#fff",fontSize:15,flexShrink:0}}>
          {medecin?.prenom?.[0]}{medecin?.nom?.[0]}
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:14,fontWeight:700,color:C.text}}>Dr. {medecin?.prenom} {medecin?.nom}</div>
          <div style={{fontSize:12,color:C.teal}}>{medecin?.specialite} {cliniqueNom&&`· ${cliniqueNom}`}</div>
        </div>
        {!medecinPreselect&&<button onClick={()=>setStep(2)} style={{background:"none",border:"none",color:C.teal,cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>Changer</button>}
      </div>

      <Grid cols={2} gap={12}>
        <Inp label="Date *" type="date" required value={dateRdv} onChange={e=>setDateRdv(e.target.value)}/>
        <Inp label="Heure *" type="time" required value={heureRdv} onChange={e=>setHeureRdv(e.target.value)}/>
      </Grid>
      <Inp label="Motif" value={motif} onChange={e=>setMotif(e.target.value)} placeholder="Consultation, suivi, douleurs…"/>
      <Sel label="Assurance" value={assurance} onChange={e=>setAssurance(e.target.value)}
        options={[{v:"",l:"Sans assurance"},{v:"NSIA",l:"NSIA Assurances"},{v:"Allianz CI",l:"Allianz CI"},{v:"AXA CI",l:"AXA CI"},{v:"CNAM (CMU)",l:"CNAM (CMU)"},{v:"Saham",l:"Saham"}]}/>

      {/* Aperçu des 2 types de factures */}
      <div style={{background:"rgba(10,143,88,.06)",border:"1px solid rgba(10,143,88,.2)",borderRadius:12,padding:16,marginBottom:14}}>
        <div style={{fontSize:12,fontWeight:700,color:C.green,textTransform:"uppercase",letterSpacing:".5px",marginBottom:12}}>💰 Aperçu des frais</div>

        {/* Facture 1 — MediConnect */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
          <div>
            <div style={{fontSize:13,fontWeight:600,color:C.text}}>Facture MediConnect</div>
            <div style={{fontSize:11,color:C.dim}}>Abonnement mensuel — dossier + prise de RDV</div>
          </div>
          <div style={{fontSize:15,fontWeight:800,color:C.teal}}>{fmt(TARIFS.abonnement_standard)} F</div>
        </div>

        {/* Facture 2 — Médecin indépendant */}
        {fraisMedecin>0&&(
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:C.text}}>Frais d'assistance médicale</div>
              <div style={{fontSize:11,color:C.dim}}>Dr. {medecin?.prenom} {medecin?.nom} — consultation</div>
            </div>
            <div style={{fontSize:15,fontWeight:800,color:C.amber}}>{fmt(fraisMedecin)} F</div>
          </div>
        )}

        {/* Total */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:10}}>
          <span style={{fontSize:14,fontWeight:700,color:C.text}}>Total estimé</span>
          <span style={{fontSize:18,fontWeight:900,color:C.green}}>{fmt(total)} FCFA</span>
        </div>

        <div style={{fontSize:11,color:C.dim,marginTop:8,lineHeight:1.5}}>
          {fraisMedecin>0
            ?"⭐ Médecin indépendant — 2 factures distinctes : MediConnect + médecin."
            :"ℹ️ Les frais de consultation de la clinique sont facturés séparément sur place."}
        </div>
      </div>

      {user?.code_secret&&(
        <div style={{fontSize:12,color:C.muted,padding:"7px 12px",background:C.hover,borderRadius:8,marginBottom:14}}>
          Code à l'accueil : <strong style={{color:C.green,fontFamily:"monospace",letterSpacing:2}}>{user.code_secret}</strong>
        </div>
      )}

      <div style={{display:"flex",gap:10}}>
        {!medecinPreselect&&<Btn variant="outline" style={{flex:1}} onClick={()=>setStep(2)}>← Retour</Btn>}
        {medecinPreselect&&<Btn variant="outline" style={{flex:1}} onClick={onClose}>Annuler</Btn>}
        <Btn style={{flex:2}} loading={addMut.isPending} onClick={()=>{
          if(!dateRdv||!heureRdv){toast.error("Date et heure requises");return;}
          if(!medecin){toast.error("Sélectionnez un médecin");return;}
          addMut.mutate({patient_nom:patientNom,medecin_id:medecin.id,medecin_nom:`Dr. ${medecin.prenom} ${medecin.nom}`,clinique_id:cliniqueId||null,date_rdv:dateRdv,heure_rdv:heureRdv,motif:motif||null,assurance:assurance||null,source:"patient"});
        }}>✅ Confirmer — {fmt(total)} FCFA</Btn>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  HOME
// ════════════════════════════════════════════════════════════════════
function PageHome(){
  const {user}=useAuthStore(); const nav=useNavigate();
  const [showRdv,setShowRdv]=useState(false);
  const {data:rdvData}=useQuery({queryKey:["pat-rdvs"],queryFn:()=>pAPI.rdvs().then(r=>r.data.data||[]),retry:1});
  const {data:ordData}=useQuery({queryKey:["pat-ords"],queryFn:()=>pAPI.ords().then(r=>r.data.data||[]),retry:1});
  const {data:factData}=useQuery({queryKey:["pat-facts"],queryFn:()=>pAPI.factures().then(r=>r.data.data||[]),retry:1});
  const rdvs=rdvData||[]; const ords=ordData||[]; const factures=factData||[];
  const rdvsActifs=rdvs.filter(r=>!["annule","termine"].includes(r.statut));
  const ordsActives=ords.filter(o=>o.statut==="active");
  const facImpayees=factures.filter(f=>f.statut==="en_attente");
  const prochainRdv=rdvs.filter(r=>r.date_rdv>=today()&&r.statut!=="annule").sort((a,b)=>a.date_rdv>b.date_rdv?1:-1)[0];

  const modules=[
    {icon:"📋",label:"Mon dossier",path:"dossier",color:C.teal,desc:"Infos & historique"},
    {icon:"📅",label:"Mes RDV",path:"rdvs",color:C.blue,desc:`${rdvsActifs.length} actif(s)`},
    {icon:"💊",label:"Ordonnances",path:"ordonnances",color:C.green,desc:`${ordsActives.length} active(s)`},
    {icon:"🩺",label:"Consultations",path:"consultations",color:C.purple,desc:"Historique"},
    {icon:"💰",label:"Mes factures",path:"factures",color:C.amber,desc:`${facImpayees.length} impayée(s)`},
    {icon:"🔍",label:"Trouver médecin",path:"recherche",color:C.teal,desc:"Cliniques & médecins"},
    {icon:"⭐",label:"Feedback",path:"feedback",color:C.amber,desc:"Évaluer mes soins"},
  ];

  return(
    <div>
      {/* En-tête */}
      <div style={{background:"linear-gradient(135deg,rgba(10,143,88,.12),rgba(13,148,136,.06))",border:"1px solid rgba(10,143,88,.2)",borderRadius:16,padding:24,marginBottom:24,display:"flex",alignItems:"center",gap:20,flexWrap:"wrap"}}>
        <Avatar prenom={user?.prenom} nom={user?.nom} size={64} fontSize={24}/>
        <div style={{flex:1,minWidth:200}}>
          <div style={{fontSize:22,fontWeight:800,color:C.text,marginBottom:4}}>Bonjour, {user?.prenom} ! 👋</div>
          <div style={{fontSize:13,color:C.muted}}>Votre espace santé MediConnect Africa</div>
          {user?.code_secret&&(
            <div style={{marginTop:8,display:"inline-flex",alignItems:"center",gap:8,background:"rgba(255,255,255,.06)",borderRadius:8,padding:"5px 12px"}}>
              <span style={{fontSize:11,color:C.dim}}>Code patient</span>
              <span style={{fontFamily:"monospace",fontSize:14,fontWeight:700,color:C.green,letterSpacing:2}}>{user.code_secret}</span>
            </div>
          )}
        </div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
          {prochainRdv&&(
            <div style={{background:"rgba(37,99,235,.1)",border:"1px solid rgba(37,99,235,.25)",borderRadius:12,padding:"12px 16px",textAlign:"center"}}>
              <div style={{fontSize:10,color:C.blue,fontWeight:700,textTransform:"uppercase",marginBottom:3}}>Prochain RDV</div>
              <div style={{fontSize:15,fontWeight:800,color:C.text}}>{fmtDate(prochainRdv.date_rdv)}</div>
              <div style={{fontSize:12,color:C.muted}}>{prochainRdv.heure_rdv?.slice(0,5)} · {prochainRdv.medecin_nom||"—"}</div>
            </div>
          )}
          <Btn onClick={()=>setShowRdv(true)}>+ Prendre RDV</Btn>
        </div>
      </div>

      {/* KPIs */}
      <Grid cols={4} gap={14} style={{marginBottom:24}}>
        <Card label="RDV actifs" value={rdvsActifs.length} icon="📅" color={C.blue} sub="À venir" onClick={()=>nav("rdvs")}/>
        <Card label="Ordonnances" value={ordsActives.length} icon="💊" color={C.green} sub="Actives" onClick={()=>nav("ordonnances")}/>
        <Card label="Factures dues" value={facImpayees.length>0?`${fmt(facImpayees.reduce((s,f)=>s+(+f.montant||0),0))} F`:"À jour"} icon="💰" color={facImpayees.length>0?C.amber:C.green} sub={`${facImpayees.length} impayée(s)`} onClick={()=>nav("factures")}/>
        <Card label="Abonnement" value={`${fmt(TARIFS.abonnement_standard)} F/mois`} icon="💳" color={C.teal} sub="MediConnect"/>
      </Grid>

      {/* Modules */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",gap:14,marginBottom:24}}>
        {modules.map(m=>(
          <button key={m.path} onClick={()=>nav(m.path)}
            style={{background:C.input,border:`1.5px solid ${C.border}`,borderRadius:14,padding:18,cursor:"pointer",textAlign:"left",fontFamily:"inherit",transition:"all .15s"}}
            onMouseOver={e=>{e.currentTarget.style.borderColor=m.color;e.currentTarget.style.transform="translateY(-2px)";}}
            onMouseOut={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.transform="none";}}>
            <div style={{fontSize:28,marginBottom:10}}>{m.icon}</div>
            <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:3}}>{m.label}</div>
            <div style={{fontSize:11,color:C.dim}}>{m.desc}</div>
          </button>
        ))}
      </div>

      {/* RDV + ordonnances */}
      <Grid cols={2} gap={20}>
        <Panel title="📅 Prochains RDV" actions={<Btn style={{padding:"6px 14px",fontSize:12}} onClick={()=>nav("rdvs")}>Tout voir →</Btn>}>
          {rdvsActifs.length===0?<Empty icon="📅" title="Aucun RDV à venir" subtitle="Prenez un rendez-vous !"/>
            :rdvsActifs.slice(0,4).map(r=>(
              <div key={r.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
                <div style={{textAlign:"center",minWidth:50,background:C.hover,borderRadius:10,padding:"6px 8px"}}>
                  <div style={{fontSize:13,fontWeight:800,color:C.text}}>{r.heure_rdv?.slice(0,5)||"—"}</div>
                  <div style={{fontSize:10,color:C.dim}}>{r.date_rdv?new Date(r.date_rdv).toLocaleDateString("fr-CI",{day:"numeric",month:"short"}):"—"}</div>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.text}}>{r.medecin_nom||"Médecin"}</div>
                  <div style={{fontSize:11,color:C.muted}}>{r.motif||"Consultation"}</div>
                </div>
                <Badge color={statusColor[r.statut]||"gray"}>{r.statut}</Badge>
              </div>
            ))
          }
        </Panel>
        <Panel title="💊 Ordonnances récentes" actions={<Btn style={{padding:"6px 14px",fontSize:12}} onClick={()=>nav("ordonnances")}>Tout voir →</Btn>}>
          {ords.length===0?<Empty icon="💊" title="Aucune ordonnance"/>
            :ords.slice(0,4).map(o=>(
              <div key={o.id} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
                <div style={{width:3,background:o.statut==="active"?C.green:C.dim,borderRadius:2,alignSelf:"stretch",flexShrink:0}}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.text}}>{o.medicaments?.slice(0,45)||"—"}</div>
                  <div style={{fontSize:11,color:C.muted}}>{o.duree||"—"} · {fmtDate(o.created_at)}</div>
                </div>
                <Badge color={o.statut==="active"?"green":"gray"}>{o.statut}</Badge>
              </div>
            ))
          }
        </Panel>
      </Grid>

      <Modal open={showRdv} onClose={()=>setShowRdv(false)} title="📅 Prendre un rendez-vous" width={560}>
        <FormPriseRdv onClose={()=>setShowRdv(false)} onSuccess={()=>setShowRdv(false)}/>
      </Modal>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  FACTURES — 2 TYPES
// ════════════════════════════════════════════════════════════════════
function PageFactures(){
  const {data,isLoading}=useQuery({queryKey:["pat-facts"],queryFn:()=>pAPI.factures().then(r=>r.data.data||[])});
  const factures=data||[];
  const impayees=factures.filter(f=>f.statut==="en_attente");
  const payees=factures.filter(f=>f.statut==="payee");
  const totalDu=impayees.reduce((s,f)=>s+(+f.montant||0),0);
  // Factures démo si vide
  const displayed=factures.length===0?[
    {id:"d1",reference:"MC-2026-001",description:"Abonnement MediConnect — Mai 2026",montant:300,statut:"payee",created_at:new Date().toISOString(),type_f:"mediconnect"},
    {id:"d2",reference:"MC-2026-002",description:"Abonnement MediConnect — Juin 2026",montant:300,statut:"en_attente",created_at:new Date().toISOString(),type_f:"mediconnect"},
    {id:"d3",reference:"ASS-2026-001",description:"Frais consultation — Dr. Koné Amadou (Cardiologue)",montant:15000,statut:"en_attente",created_at:new Date().toISOString(),type_f:"medecin"},
  ]:factures;

  return(
    <div>
      <PageHeader title="💰 Mes factures" subtitle="Frais MediConnect + Frais médicaux"/>
      <Grid cols={3} gap={14} style={{marginBottom:20}}>
        <Card label="À régler" value={`${fmt(totalDu)} F`} icon="⚠️" color={totalDu>0?C.amber:C.green} sub={`${impayees.length} facture(s)`}/>
        <Card label="Payé" value={`${fmt(payees.reduce((s,f)=>s+(+f.montant||0),0))} F`} icon="✅" color={C.green} sub={`${payees.length} facture(s)`}/>
        <Card label="Abonnement" value={`${fmt(TARIFS.abonnement_standard)} F/mois`} icon="💳" color={C.teal} sub="MediConnect"/>
      </Grid>

      {/* Explication 2 types */}
      <div style={{background:"rgba(13,148,136,.06)",border:"1px solid rgba(13,148,136,.2)",borderRadius:12,padding:16,marginBottom:20}}>
        <div style={{fontSize:13,fontWeight:700,color:C.teal,marginBottom:10}}>📋 Vos deux types de factures</div>
        <Grid cols={2} gap={14}>
          <div style={{background:C.hover,borderRadius:10,padding:14}}>
            <div style={{fontSize:12,fontWeight:700,color:C.teal,marginBottom:6}}>💳 Facture MediConnect</div>
            <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}><strong style={{color:C.text}}>{fmt(TARIFS.abonnement_standard)} FCFA/mois</strong> — Abonnement pour l'accès à votre dossier médical électronique et la prise de RDV en ligne.</div>
          </div>
          <div style={{background:C.hover,borderRadius:10,padding:14}}>
            <div style={{fontSize:12,fontWeight:700,color:C.amber,marginBottom:6}}>🩺 Frais d'assistance médicale</div>
            <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>Facturé uniquement si vous avez consulté un <strong style={{color:C.text}}>médecin indépendant</strong> via MediConnect. Tarif selon le médecin.</div>
          </div>
        </Grid>
      </div>

      {isLoading?<Loader/>:displayed.map(f=>{
        const isMC=f.type_f==="mediconnect"||f.description?.toLowerCase().includes("mediconnect")||f.montant<=500;
        return(
          <div key={f.id} style={{background:C.input,border:`1.5px solid ${f.statut==="en_attente"?C.amber:C.border}`,borderRadius:14,padding:20,marginBottom:14}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:14}}>
              <div style={{width:44,height:44,borderRadius:12,background:isMC?"rgba(13,148,136,.15)":"rgba(217,119,6,.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>
                {isMC?"💳":"🩺"}
              </div>
              <div style={{flex:1}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:C.text}}>{f.description||(isMC?"Abonnement MediConnect":"Frais consultation")}</div>
                    <div style={{display:"flex",gap:8,marginTop:4,flexWrap:"wrap"}}>
                      <Badge color={isMC?"teal":"amber"}>{isMC?"MediConnect":"Médecin indépendant"}</Badge>
                      <Badge color={f.statut==="payee"?"green":"amber"}>{f.statut==="payee"?"Payée":"À régler"}</Badge>
                    </div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:20,fontWeight:900,color:f.statut==="en_attente"?C.amber:C.green}}>{fmt(f.montant)} F</div>
                    <div style={{fontSize:11,color:C.dim}}>{fmtDate(f.created_at)}</div>
                  </div>
                </div>
                {f.reference&&<div style={{fontSize:11,color:C.dim,fontFamily:"monospace"}}>Réf: {f.reference}</div>}
              </div>
            </div>
            {f.statut==="en_attente"&&(
              <div style={{display:"flex",gap:10,marginTop:14,borderTop:`1px solid ${C.border}`,paddingTop:12}}>
                <Btn style={{flex:2,padding:"8px"}} onClick={()=>toast.success("Paiement Mobile Money initié !")}>💳 Payer — Wave / Orange Money</Btn>
                <Btn variant="outline" style={{flex:1,padding:"8px",fontSize:12}} onClick={()=>toast.success("PDF téléchargé !")}>📄 PDF</Btn>
              </div>
            )}
            {f.statut==="payee"&&(
              <div style={{marginTop:12,borderTop:`1px solid ${C.border}`,paddingTop:10}}>
                <Btn variant="outline" style={{padding:"7px 14px",fontSize:12}} onClick={()=>toast.success("Reçu téléchargé !")}>📄 Télécharger le reçu</Btn>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  RENDEZ-VOUS
// ════════════════════════════════════════════════════════════════════
function PageRdvs(){
  const [showAdd,setShowAdd]=useState(false); const [tab,setTab]=useState("upcoming");
  const qc=useQueryClient();
  const {data,isLoading}=useQuery({queryKey:["pat-rdvs"],queryFn:()=>pAPI.rdvs().then(r=>r.data.data||[])});
  const rdvs=data||[];
  const upcoming=rdvs.filter(r=>r.date_rdv>=today()&&r.statut!=="annule").sort((a,b)=>a.date_rdv>b.date_rdv?1:-1);
  const past=rdvs.filter(r=>r.date_rdv<today()||r.statut==="termine"||r.statut==="annule").sort((a,b)=>a.date_rdv<b.date_rdv?1:-1);
  const displayed=tab==="upcoming"?upcoming:past;
  const cancelMut=useMutation({mutationFn:id=>pAPI.cancelRdv(id),onSuccess:()=>{toast.success("RDV annulé");qc.invalidateQueries(["pat-rdvs"]);},});

  return(
    <div>
      <PageHeader title="📅 Mes rendez-vous" subtitle={`${upcoming.length} à venir`} actions={<Btn onClick={()=>setShowAdd(true)}>+ Nouveau RDV</Btn>}/>
      <div style={{display:"flex",gap:4,background:C.input,borderRadius:10,padding:4,marginBottom:20}}>
        {[["upcoming",`À venir (${upcoming.length})`],["past",`Passés (${past.length})`]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{flex:1,background:tab===k?C.hover:"transparent",border:"none",borderRadius:8,padding:"9px",cursor:"pointer",fontFamily:"inherit",color:tab===k?C.text:C.muted,fontSize:13,fontWeight:tab===k?700:400}}>{l}</button>
        ))}
      </div>
      {isLoading?<Loader/>:displayed.length===0
        ?<Empty icon="📅" title={tab==="upcoming"?"Aucun RDV à venir":"Aucun RDV passé"} subtitle={tab==="upcoming"?"Cliquez sur + Nouveau RDV":""}/>
        :displayed.map(r=>(
          <div key={r.id} style={{background:C.input,border:`1.5px solid ${C.border}`,borderRadius:14,padding:20,marginBottom:14}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:16,marginBottom:tab==="upcoming"&&r.statut!=="annule"?14:0}}>
              <div style={{background:C.hover,borderRadius:12,padding:"10px 14px",textAlign:"center",flexShrink:0}}>
                <div style={{fontSize:22,fontWeight:900,color:C.text}}>{r.date_rdv?new Date(r.date_rdv).getDate():"—"}</div>
                <div style={{fontSize:10,color:C.muted,textTransform:"uppercase"}}>{r.date_rdv?new Date(r.date_rdv).toLocaleDateString("fr-CI",{month:"short"}):"—"}</div>
                <div style={{fontSize:14,fontWeight:700,color:C.blue,marginTop:4}}>{r.heure_rdv?.slice(0,5)||"—"}</div>
              </div>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                  <h3 style={{fontSize:15,fontWeight:700,color:C.text,margin:0}}>{r.medecin_nom||"Médecin"}</h3>
                  <Badge color={statusColor[r.statut]||"gray"}>{r.statut||"—"}</Badge>
                </div>
                {r.motif&&<div style={{fontSize:13,color:C.muted,marginBottom:3}}>📋 {r.motif}</div>}
                {r.assurance&&<div style={{fontSize:12,color:C.dim}}>🛡️ {r.assurance}</div>}
              </div>
            </div>
            {tab==="upcoming"&&r.statut!=="annule"&&(
              <div style={{display:"flex",gap:10,borderTop:`1px solid ${C.border}`,paddingTop:12}}>
                <Btn variant="outline" style={{flex:1,padding:"7px",fontSize:12}} onClick={()=>toast.success("Rappel activé ! 📲")}>🔔 Rappel SMS</Btn>
                <Btn variant="danger" style={{flex:1,padding:"7px",fontSize:12}} loading={cancelMut.isPending} onClick={()=>window.confirm("Annuler ce RDV ?")&&cancelMut.mutate(r.id)}>✕ Annuler</Btn>
              </div>
            )}
          </div>
        ))
      }
      <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="📅 Nouveau rendez-vous" width={560}>
        <FormPriseRdv onClose={()=>setShowAdd(false)} onSuccess={()=>setShowAdd(false)}/>
      </Modal>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  RECHERCHE MÉDECIN
// ════════════════════════════════════════════════════════════════════
function PageRecherche(){
  const [search,setSearch]=useState(""); const [cliniqueFilter,setCliFilter]=useState(""); const [specFilter,setSpecFilter]=useState(""); const [selectedMed,setSelectedMed]=useState(null);
  const {data:cliniquesData}=useQuery({queryKey:["pub-cliniques"],queryFn:()=>pAPI.cliniques().then(r=>r.data.data||[])});
  const {data:medecinsData,isLoading}=useQuery({queryKey:["pub-medecins",cliniqueFilter],queryFn:()=>pAPI.medecins(cliniqueFilter).then(r=>r.data.data||[])});
  const cliniques=cliniquesData||[];
  const specs=[...new Set((medecinsData||[]).map(m=>m.specialite).filter(Boolean))];
  const medecins=(medecinsData||[]).filter(m=>(!search||`${m.prenom} ${m.nom} ${m.specialite||""}`.toLowerCase().includes(search.toLowerCase()))&&(!specFilter||m.specialite===specFilter));

  return(
    <div>
      <PageHeader title="🔍 Trouver un médecin" subtitle="Filtrez par clinique ou spécialité"/>
      {/* Filtres */}
      <Grid cols={2} gap={12} style={{marginBottom:16}}>
        <Inp value={search} onChange={e=>setSearch(e.target.value)} placeholder="Dr. Koné, Cardiologue…" label="Nom ou spécialité"/>
        <Sel label="Spécialité" value={specFilter} onChange={e=>setSpecFilter(e.target.value)} options={[{v:"",l:"Toutes"}, ...specs.map(s=>({v:s,l:s}))]}/>
      </Grid>
      {/* Chips cliniques */}
      <div style={{marginBottom:20}}>
        <div style={{fontSize:12,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".5px",marginBottom:10}}>🏥 Filtrer par clinique</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button onClick={()=>setCliFilter("")} style={{background:!cliniqueFilter?"rgba(10,143,88,.15)":C.input,border:`1.5px solid ${!cliniqueFilter?C.green:C.border}`,borderRadius:20,padding:"6px 16px",cursor:"pointer",fontSize:12,fontWeight:!cliniqueFilter?700:400,color:!cliniqueFilter?C.green:C.muted,fontFamily:"inherit"}}>Toutes</button>
          {cliniques.map(cl=>(
            <button key={cl.id} onClick={()=>setCliFilter(cliniqueFilter===cl.id?"":cl.id)} style={{background:cliniqueFilter===cl.id?"rgba(10,143,88,.15)":C.input,border:`1.5px solid ${cliniqueFilter===cl.id?C.green:C.border}`,borderRadius:20,padding:"6px 16px",cursor:"pointer",fontSize:12,fontWeight:cliniqueFilter===cl.id?700:400,color:cliniqueFilter===cl.id?C.green:C.muted,fontFamily:"inherit"}}>
              {cl.nom||"Clinique"}
            </button>
          ))}
        </div>
      </div>
      {/* Liste médecins */}
      {isLoading?<Loader/>:medecins.length===0?<Empty icon="👨‍⚕️" title="Aucun médecin trouvé" subtitle="Essayez d'autres filtres"/>
        :medecins.map(m=>(
          <div key={m.id} style={{background:C.input,border:`1.5px solid ${C.border}`,borderRadius:14,padding:20,marginBottom:14,transition:"all .15s"}}
            onMouseOver={e=>{e.currentTarget.style.borderColor=C.green;e.currentTarget.style.transform="translateY(-1px)";}}
            onMouseOut={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.transform="none";}}>
            <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:12}}>
              <div style={{width:52,height:52,background:`linear-gradient(135deg,${C.purple},${C.teal})`,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,color:"#fff",fontSize:18,flexShrink:0}}>
                {m.prenom?.[0]}{m.nom?.[0]}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:15,fontWeight:700,color:C.text}}>Dr. {m.prenom} {m.nom}</div>
                <div style={{fontSize:13,color:C.teal,fontWeight:600}}>{m.specialite||"Médecin"}</div>
                {m.jours_travail&&<div style={{fontSize:11,color:C.dim,marginTop:2}}>📅 {m.jours_travail} · {m.horaires_debut?.slice(0,5)||"08:00"}–{m.horaires_fin?.slice(0,5)||"17:00"}</div>}
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                {m.tarif&&<><div style={{fontSize:16,fontWeight:800,color:C.green}}>{fmt(m.tarif)} F</div><div style={{fontSize:10,color:C.dim}}>consult.</div></>}
                <div style={{marginTop:4}}><Badge color={{Disponible:"green","En consultation":"amber",Absent:"red"}[m.statut]||"gray"}>{m.statut||"—"}</Badge></div>
              </div>
            </div>
            <div style={{background:C.hover,borderRadius:8,padding:"8px 12px",marginBottom:12,fontSize:12,color:C.muted}}>
              💰 Frais estimés : <strong style={{color:C.text}}>{fmt(TARIFS.abonnement_standard)} F</strong> (MediConnect) {m.tarif&&`+ `}<strong style={{color:m.tarif?C.amber:C.dim}}>{m.tarif?`${fmt(m.tarif)} F`:"tarif sur place"}</strong> {m.tarif&&"(consultation)"}
            </div>
            <Btn style={{width:"100%"}} onClick={()=>setSelectedMed(m)} disabled={m.statut==="Absent"}>
              {m.statut==="Absent"?"❌ Absent — indisponible":"📅 Prendre rendez-vous"}
            </Btn>
          </div>
        ))
      }
      <Modal open={!!selectedMed} onClose={()=>setSelectedMed(null)} title={`📅 RDV — Dr. ${selectedMed?.prenom} ${selectedMed?.nom}`} width={560}>
        <FormPriseRdv medecinPreselect={selectedMed} onClose={()=>setSelectedMed(null)} onSuccess={()=>setSelectedMed(null)}/>
      </Modal>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  DOSSIER MÉDICAL
// ════════════════════════════════════════════════════════════════════
function PageDossier(){
  const {user}=useAuthStore();
  const {data:consData}=useQuery({queryKey:["pat-consult"],queryFn:()=>pAPI.consults().then(r=>r.data.data||[]),retry:1});
  const consults=consData||[];
  const infos=[["Prénom",user?.prenom],["Nom",user?.nom],["Téléphone",user?.telephone],["Email",user?.email],["Groupe sanguin",user?.groupe_sanguin],["Ville",user?.ville],["Assurance",user?.assurance]];
  return(
    <div>
      <PageHeader title="📋 Mon dossier médical" subtitle="Informations de santé"/>
      <Grid cols={2} gap={20} style={{marginBottom:20}}>
        <Panel title="👤 Informations">
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:14,paddingBottom:14,borderBottom:`1px solid ${C.border}`}}>
            <Avatar prenom={user?.prenom} nom={user?.nom} size={52} fontSize={18}/>
            <div>
              <div style={{fontSize:17,fontWeight:800,color:C.text}}>{user?.prenom} {user?.nom}</div>
              {user?.code_secret&&<div style={{fontFamily:"monospace",fontSize:13,color:C.green,fontWeight:700,letterSpacing:2,marginTop:4}}>{user.code_secret}</div>}
            </div>
          </div>
          <Grid cols={2} gap={10}>
            {infos.map(([k,v])=>(
              <div key={k} style={{background:C.hover,borderRadius:8,padding:"9px 12px"}}>
                <div style={{fontSize:10,color:C.dim,fontWeight:700,textTransform:"uppercase",marginBottom:2}}>{k}</div>
                <div style={{fontSize:13,color:C.text,fontWeight:600}}>{v||"—"}</div>
              </div>
            ))}
          </Grid>
        </Panel>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {user?.groupe_sanguin&&<div style={{background:"rgba(225,29,72,.08)",border:"1px solid rgba(225,29,72,.2)",borderRadius:12,padding:16}}><div style={{fontSize:11,fontWeight:700,color:C.red,textTransform:"uppercase",marginBottom:6}}>🩸 Groupe sanguin</div><div style={{fontSize:36,fontWeight:900,color:C.red}}>{user.groupe_sanguin}</div></div>}
          {user?.allergies&&<div style={{background:"rgba(217,119,6,.08)",border:"1px solid rgba(217,119,6,.2)",borderRadius:12,padding:14}}><div style={{fontSize:11,fontWeight:700,color:C.amber,textTransform:"uppercase",marginBottom:6}}>⚠️ Allergies</div><div style={{fontSize:13,color:C.text}}>{user.allergies}</div></div>}
          {user?.antecedents&&<div style={{background:"rgba(37,99,235,.08)",border:"1px solid rgba(37,99,235,.2)",borderRadius:12,padding:14}}><div style={{fontSize:11,fontWeight:700,color:C.blue,textTransform:"uppercase",marginBottom:6}}>📋 Antécédents</div><div style={{fontSize:13,color:C.text}}>{user.antecedents}</div></div>}
          {!user?.groupe_sanguin&&!user?.allergies&&!user?.antecedents&&<Empty icon="📋" title="Infos médicales incomplètes" subtitle="Contactez votre clinique"/>}
        </div>
      </Grid>
      <Panel title="🩺 Consultations">
        {consults.length===0?<Empty icon="🩺" title="Aucune consultation" subtitle="Votre historique apparaîtra ici"/>
          :consults.map(c=>(
            <div key={c.id} style={{background:C.hover,borderRadius:10,padding:14,marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:13,fontWeight:700,color:C.teal}}>{fmtDate(c.created_at)}</span><span style={{fontSize:12,color:C.muted}}>{c.medecin_nom||"—"}</span></div>
              <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:4}}>Diagnostic : {c.diagnostic||"—"}</div>
              {c.traitement&&<div style={{fontSize:12,color:C.muted}}>Traitement : {c.traitement}</div>}
            </div>
          ))
        }
      </Panel>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  ORDONNANCES
// ════════════════════════════════════════════════════════════════════
function PageOrdonnances(){
  const {data,isLoading}=useQuery({queryKey:["pat-ords"],queryFn:()=>pAPI.ords().then(r=>r.data.data||[])});
  const ords=data||[];
  return(
    <div>
      <PageHeader title="💊 Mes ordonnances" subtitle={`${ords.filter(o=>o.statut==="active").length} active(s)`}/>
      <Grid cols={2} gap={14} style={{marginBottom:20}}>
        <Card label="Actives" value={ords.filter(o=>o.statut==="active").length} icon="✅" color={C.green}/>
        <Card label="Terminées" value={ords.filter(o=>o.statut!=="active").length} icon="📋" color={C.muted}/>
      </Grid>
      {isLoading?<Loader/>:ords.length===0?<Empty icon="💊" title="Aucune ordonnance" subtitle="Vos prescriptions apparaîtront ici"/>
        :ords.map(o=>(
          <div key={o.id} style={{background:C.input,border:`1.5px solid ${o.statut==="active"?"rgba(10,143,88,.3)":C.border}`,borderRadius:14,padding:20,marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:12,paddingBottom:10,borderBottom:`1px solid ${C.border}`}}>
              <div><div style={{fontSize:12,color:C.dim}}>{fmtDate(o.created_at)}</div><div style={{fontSize:12,color:C.muted}}>Dr. {o.medecin_nom||"—"}</div></div>
              <Badge color={o.statut==="active"?"green":"gray"}>{o.statut==="active"?"Active":"Terminée"}</Badge>
            </div>
            <div style={{background:C.hover,borderRadius:10,padding:14,marginBottom:12}}>
              <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:6}}>{o.medicaments||"—"}</div>
              {o.posologie&&<div style={{fontSize:12,color:C.muted,marginBottom:3}}>📋 {o.posologie}</div>}
              {o.duree&&<div style={{fontSize:12,color:C.muted}}>⏱️ {o.duree}</div>}
            </div>
            <div style={{display:"flex",gap:10}}>
              <Btn variant="outline" style={{flex:1,padding:"7px",fontSize:12}} onClick={()=>toast.success("Envoyée à la pharmacie !")}>💊 Pharmacie</Btn>
              <Btn variant="outline" style={{flex:1,padding:"7px",fontSize:12}} onClick={()=>toast.success("PDF généré !")}>📄 PDF</Btn>
            </div>
          </div>
        ))
      }
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  CONSULTATIONS
// ════════════════════════════════════════════════════════════════════
function PageConsultations(){
  const {data,isLoading}=useQuery({queryKey:["pat-consult"],queryFn:()=>pAPI.consults().then(r=>r.data.data||[])});
  const consults=data||[];
  return(
    <div>
      <PageHeader title="🩺 Mes consultations" subtitle={`${consults.length} consultation(s)`}/>
      {isLoading?<Loader/>:consults.length===0?<Empty icon="🩺" title="Aucune consultation" subtitle="Votre historique médical apparaîtra ici"/>
        :consults.map(c=>(
          <div key={c.id} style={{background:C.input,border:`1.5px solid ${C.border}`,borderRadius:14,padding:20,marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
              <div><div style={{fontSize:15,fontWeight:700,color:C.text}}>Consultation du {fmtDate(c.created_at)}</div><div style={{fontSize:12,color:C.muted}}>Dr. {c.medecin_nom||"—"}</div></div>
              <Badge color="teal">Complétée</Badge>
            </div>
            <div style={{background:C.hover,borderRadius:10,padding:14,marginBottom:10}}><div style={{fontSize:11,fontWeight:700,color:C.dim,textTransform:"uppercase",marginBottom:6}}>Diagnostic</div><div style={{fontSize:14,color:C.text,fontWeight:600}}>{c.diagnostic||"—"}</div></div>
            {c.traitement&&<div style={{background:"rgba(10,143,88,.06)",borderRadius:10,padding:14,marginBottom:10}}><div style={{fontSize:11,fontWeight:700,color:C.dim,textTransform:"uppercase",marginBottom:6}}>Traitement</div><div style={{fontSize:13,color:C.text}}>{c.traitement}</div></div>}
            {(c.tension_arterielle||c.temperature||c.poids||c.taille)&&(
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {[["TA",c.tension_arterielle,C.teal],["T°",c.temperature?`${c.temperature}°C`:null,C.amber],["Poids",c.poids?`${c.poids}kg`:null,C.blue],["Taille",c.taille?`${c.taille}cm`:null,C.purple]].filter(([,v])=>v).map(([k,v,color])=>(
                  <div key={k} style={{background:C.hover,borderRadius:8,padding:"5px 12px",fontSize:12}}><span style={{color:C.dim}}>{k}: </span><span style={{color,fontWeight:700}}>{v}</span></div>
                ))}
              </div>
            )}
          </div>
        ))
      }
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  FEEDBACK
// ════════════════════════════════════════════════════════════════════
function PageFeedback(){
  const {data:rdvData}=useQuery({queryKey:["pat-rdvs"],queryFn:()=>pAPI.rdvs().then(r=>r.data.data||[])});
  const rdvsTermines=(rdvData||[]).filter(r=>r.statut==="termine");
  const [notes,setNotes]=useState({}); const [submitted,setSubmitted]=useState({});
  const CRITERES=["Qualité des soins","Temps d'attente","Accueil","Communication médecin","Propreté","Prise de RDV"];
  const [gNotes,setGNotes]=useState(CRITERES.reduce((a,c)=>({...a,[c]:0}),{}));
  const Stars=({value,onChange})=>(
    <div style={{display:"flex",gap:4}}>
      {[1,2,3,4,5].map(i=><button key={i} onClick={()=>onChange(i)} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:i<=value?C.amber:"#1E2F42",padding:"2px"}}>★</button>)}
    </div>
  );
  return(
    <div>
      <PageHeader title="⭐ Feedback & Satisfaction" subtitle="Aidez-nous à améliorer nos services"/>
      <Grid cols={2} gap={20}>
        <Panel title="📊 Évaluation globale">
          {CRITERES.map(c=>(
            <div key={c} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
              <span style={{fontSize:13,color:C.muted}}>{c}</span>
              <Stars value={gNotes[c]} onChange={v=>setGNotes(p=>({...p,[c]:v}))}/>
            </div>
          ))}
          <Btn style={{width:"100%",marginTop:16}} onClick={()=>toast.success("✅ Merci pour votre évaluation !")}>Envoyer</Btn>
        </Panel>
        <Panel title="🩺 Évaluer mes consultations">
          {rdvsTermines.length===0?<Empty icon="⭐" title="Aucune consultation à évaluer" subtitle="Après vos RDV terminés vous pourrez les noter"/>
            :rdvsTermines.slice(0,5).map(r=>(
              <div key={r.id} style={{background:C.hover,borderRadius:12,padding:14,marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                  <div><div style={{fontSize:13,fontWeight:700,color:C.text}}>{r.medecin_nom||"Médecin"}</div><div style={{fontSize:11,color:C.muted}}>{fmtDate(r.date_rdv)}</div></div>
                  {submitted[r.id]&&<Badge color="green">✓ Noté</Badge>}
                </div>
                {!submitted[r.id]
                  ?<><Stars value={notes[r.id]||0} onChange={v=>setNotes(p=>({...p,[r.id]:v}))}/><Btn style={{width:"100%",marginTop:10,padding:"7px",fontSize:12}} onClick={()=>{if(!notes[r.id]){toast.error("Donnez une note");return;}setSubmitted(p=>({...p,[r.id]:true}));toast.success("✅ Merci !");}}>Soumettre</Btn></>
                  :<div style={{fontSize:14,color:C.amber}}>{"★".repeat(notes[r.id]||0)}{"☆".repeat(5-(notes[r.id]||0))}</div>
                }
              </div>
            ))
          }
        </Panel>
      </Grid>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  ROUTER
// ════════════════════════════════════════════════════════════════════
export default function Dashboard(){
  return(
    <Routes>
      <Route index                element={<PageHome/>}/>
      <Route path="dossier"       element={<PageDossier/>}/>
      <Route path="rdvs"          element={<PageRdvs/>}/>
      <Route path="ordonnances"   element={<PageOrdonnances/>}/>
      <Route path="consultations" element={<PageConsultations/>}/>
      <Route path="factures"      element={<PageFactures/>}/>
      <Route path="recherche"     element={<PageRecherche/>}/>
      <Route path="feedback"      element={<PageFeedback/>}/>
      <Route path="*"             element={<PageHome/>}/>
    </Routes>
  );
}
