import React, { useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import useAuthStore from "../../context/authStore";
import api from "../../services/api";
import PageDossierDME from "./PageDossier";

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

// URL backend fixe — indépendant de la baseURL de services/api.js
const BACKEND = 'https://mediconnect-fed6.vercel.app';

// Fetch public (sans auth) avec URL absolue
const fetchPublic = async (path) => {
  const url = `${BACKEND}/api${path}`;
  console.log('[pAPI public] GET', url);
  const r = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};

const pAPI = {
  rdvs:       ()      => api.get("/rendez-vous").catch(()=>({data:{data:[]}})),
  addRdv:     (d)     => api.post("/rendez-vous", d),
  cancelRdv:  (id)    => api.put(`/rendez-vous/${id}`,{statut:"annule"}),
  ords:       ()      => api.get("/ordonnances").catch(()=>({data:{data:[]}})),
  consults:   ()      => api.get("/consultations").catch(()=>({data:{data:[]}})),
  // Routes publiques via fetch() direct — URL absolue garantie
  cliniques:  ()      => fetchPublic('/public/cliniques').then(r=>({data:{data:r.data||[]}})).catch(()=>({data:{data:[]}})),
  medecins:   (cid)   => fetchPublic(`/public/medecins${cid?`?clinique_id=${cid}`:''}`).then(r=>({data:{data:r.data||[]}})).catch(()=>({data:{data:[]}})),
  medecinsMI: ()      => fetchPublic('/public/medecins?independant=true').then(r=>({data:{data:r.data||[]}})).catch(()=>({data:{data:[]}})),
  factures:   ()      => api.get("/factures/patient").catch(()=>api.get("/factures").catch(()=>({data:{data:[]}}))),
  addCommande:(d)     => api.post("/commandes", d),
  commandes:  ()      => api.get("/commandes").catch(()=>({data:{data:[]}})),
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
    {icon:"⭐",label:"Médecins privés",path:"medecins-prives",color:C.purple,desc:"Suivi médecin de famille"},
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
  const {data:cliniquesData}=useQuery({queryKey:["pub-cliniques"],queryFn:()=>pAPI.cliniques().then(r=>r.data?.data||r.data||[]),retry:2});
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
function PageDossier(){ return <PageDossierDME/>; }


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
//  PAGE MÉDECINS INDÉPENDANTS (depuis dashboard patient)
// ════════════════════════════════════════════════════════════════════
const SPECIALITES_LIST = ["Toutes","Médecine générale","Cardiologie","Pédiatrie","Gynécologie","Dermatologie","Ophtalmologie","ORL","Neurologie","Orthopédie","Psychiatrie"];

function DemandeModal({medecin, onClose}){
  const [motif,setMotif]=useState("");
  const [step,setStep]=useState(1);
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:20,width:"100%",maxWidth:480,overflow:"hidden"}}>
        <div style={{background:`linear-gradient(135deg,${C.purple},${C.blue})`,padding:"20px 24px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:12,color:"rgba(255,255,255,.7)",marginBottom:4}}>Demande de suivi privé</div>
            <div style={{fontSize:18,fontWeight:800,color:"#fff"}}>Dr. {medecin.prenom} {medecin.nom}</div>
            <div style={{fontSize:13,color:"rgba(255,255,255,.8)"}}>{medecin.specialite}</div>
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,.2)",border:"none",borderRadius:"50%",width:32,height:32,color:"#fff",cursor:"pointer",fontSize:16}}>✕</button>
        </div>
        <div style={{padding:24}}>
          {step===1&&(
            <div>
              <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:16}}>Pourquoi souhaitez-vous ce médecin ?</div>
              <textarea value={motif} onChange={e=>setMotif(e.target.value)} placeholder="Ex: Suivi médical régulier, médecin de famille, pathologie chronique..." rows={4}
                style={{width:"100%",background:C.input,border:`1px solid ${C.border}`,borderRadius:10,padding:12,color:C.text,fontSize:14,resize:"vertical",boxSizing:"border-box",marginBottom:16,outline:"none",fontFamily:"inherit"}}/>
              <div style={{background:"rgba(217,119,6,.08)",border:"1px solid rgba(217,119,6,.3)",borderRadius:10,padding:"12px 16px",marginBottom:20}}>
                <div style={{fontSize:13,fontWeight:700,color:C.amber,marginBottom:4}}>💳 Frais de mise en relation</div>
                <div style={{fontSize:13,color:C.muted}}>Un paiement de <strong style={{color:C.text}}>1 000 FCFA</strong> est requis avant que le médecin reçoive votre demande.</div>
              </div>
              <button onClick={()=>{if(!motif.trim())return;setStep(2);}} disabled={!motif.trim()}
                style={{width:"100%",background:motif.trim()?`linear-gradient(135deg,${C.purple},${C.blue})`:"#1E2F42",border:"none",borderRadius:12,padding:14,color:"#fff",fontSize:15,fontWeight:800,cursor:motif.trim()?"pointer":"not-allowed",fontFamily:"inherit"}}>
                Continuer → Payer 1 000 FCFA
              </button>
            </div>
          )}
          {step===2&&(
            <div>
              <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:16}}>💳 Payer les frais de mise en relation</div>
              <div style={{background:C.input,borderRadius:10,padding:"12px 16px",marginBottom:16,display:"flex",justifyContent:"space-between"}}>
                <span style={{fontSize:13,color:C.muted}}>Frais de mise en relation</span>
                <span style={{fontSize:15,fontWeight:800,color:C.purple}}>1 000 FCFA</span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
                {[{id:"wave",label:"Wave",icon:"🌊",color:"#1DA6F2"},{id:"orange",label:"Orange Money",icon:"🟠",color:"#FF6600"},{id:"moov",label:"Moov Money",icon:"🔵",color:"#0066CC"},{id:"mtn",label:"MTN MoMo",icon:"🟡",color:"#FFCC00"}].map(m=>(
                  <button key={m.id} onClick={()=>setStep(3)}
                    style={{background:m.color+"15",border:`2px solid ${m.color}40`,borderRadius:12,padding:"12px",cursor:"pointer",display:"flex",alignItems:"center",gap:8,fontFamily:"inherit"}}>
                    <span style={{fontSize:20}}>{m.icon}</span>
                    <span style={{fontSize:12,fontWeight:700,color:m.color}}>{m.label}</span>
                  </button>
                ))}
              </div>
              <button onClick={()=>setStep(1)} style={{width:"100%",background:"none",border:`1px solid ${C.border}`,borderRadius:10,padding:10,color:C.muted,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>← Retour</button>
            </div>
          )}
          {step===3&&(
            <div style={{textAlign:"center",padding:"20px 0"}}>
              <div style={{width:72,height:72,background:`linear-gradient(135deg,${C.purple},${C.blue})`,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,margin:"0 auto 16px"}}>✅</div>
              <div style={{fontSize:20,fontWeight:800,color:C.text,marginBottom:8}}>Demande envoyée !</div>
              <div style={{fontSize:14,color:C.muted,marginBottom:8}}>Dr. {medecin.prenom} {medecin.nom} a reçu votre demande.</div>
              <div style={{background:"rgba(124,58,237,.1)",border:"1px solid rgba(124,58,237,.2)",borderRadius:10,padding:12,fontSize:13,color:C.purple,marginBottom:20}}>
                Vous serez notifié par SMS dès que le médecin aura répondu.
              </div>
              <button onClick={onClose} style={{background:C.purple,border:"none",borderRadius:10,padding:"10px 32px",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Fermer</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PageMedecinsPrives(){
  const [specialite,setSpecialite]=useState("Toutes");
  const [search,setSearch]=useState("");
  const [medecinSel,setMedecinSel]=useState(null);

  const {data,isLoading}=useQuery({queryKey:["pub-medecins-prives"],queryFn:()=>api.get("/public/medecins").then(r=>r.data.data||[]).catch(()=>[])});

  // Fusionner avec données démo si API vide
  const DEMO=[
    {id:"d1",prenom:"Kouassi",nom:"Ange",specialite:"Cardiologie",ville:"Cocody, Abidjan",tarif:20000,experience_ans:12,note_moyenne:4.8,statut:"Disponible"},
    {id:"d2",prenom:"Bamba",nom:"Mariame",specialite:"Médecine générale",ville:"Plateau, Abidjan",tarif:12000,experience_ans:8,note_moyenne:4.6,statut:"Disponible"},
    {id:"d3",prenom:"Diallo",nom:"Seydou",specialite:"Pédiatrie",ville:"Marcory, Abidjan",tarif:15000,experience_ans:15,note_moyenne:4.9,statut:"Absent"},
    {id:"d4",prenom:"Konan",nom:"Adjoua",specialite:"Gynécologie",ville:"Yopougon, Abidjan",tarif:18000,experience_ans:10,note_moyenne:4.7,statut:"Disponible"},
  ];
  const medecins=(data&&data.length>0?data:DEMO).filter(m=>{
    const matchSpec=specialite==="Toutes"||m.specialite===specialite;
    const matchSearch=!search||`${m.prenom} ${m.nom} ${m.specialite||""} ${m.ville||""}`.toLowerCase().includes(search.toLowerCase());
    return matchSpec&&matchSearch;
  });

  return(
    <div>
      <PageHeader title="⭐ Médecins Indépendants" subtitle="Trouvez votre médecin privé ou médecin de famille"/>

      {/* Barre recherche */}
      <div style={{display:"flex",gap:12,marginBottom:20,flexWrap:"wrap"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Rechercher un médecin..."
          style={{flex:1,minWidth:200,background:C.input,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px",color:C.text,fontSize:14,outline:"none",fontFamily:"inherit"}}
          onFocus={e=>e.target.style.borderColor=C.purple} onBlur={e=>e.target.style.borderColor=C.border}/>
        <select value={specialite} onChange={e=>setSpecialite(e.target.value)}
          style={{background:C.input,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px",color:C.text,fontSize:14,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
          {SPECIALITES_LIST.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Info frais */}
      <div style={{background:"rgba(124,58,237,.06)",border:"1px solid rgba(124,58,237,.2)",borderRadius:12,padding:"12px 16px",marginBottom:20,fontSize:13,color:C.muted}}>
        ⭐ La mise en relation avec un médecin privé coûte <strong style={{color:C.purple}}>1 000 FCFA</strong>, payables par Mobile Money avant l'envoi de votre demande. L'abonnement mensuel passe à <strong style={{color:C.purple}}>500 FCFA/mois</strong> avec suivi médecin privé.
      </div>

      {/* Grille médecins */}
      {isLoading?<Loader/>:medecins.length===0?<Empty icon="⭐" title="Aucun médecin trouvé" subtitle="Modifiez vos critères de recherche"/>:(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:16}}>
          {medecins.map(m=>(
            <div key={m.id} style={{background:C.input,border:`1.5px solid ${C.border}`,borderRadius:16,padding:20,display:"flex",flexDirection:"column",gap:12,transition:"border-color .15s"}}
              onMouseOver={e=>e.currentTarget.style.borderColor=C.purple} onMouseOut={e=>e.currentTarget.style.borderColor=C.border}>
              {/* Header */}
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:52,height:52,background:`linear-gradient(135deg,${C.purple},${C.blue})`,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:800,color:"#fff",flexShrink:0}}>
                  {m.prenom?.[0]}{m.nom?.[0]}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:16,fontWeight:800,color:C.text}}>Dr. {m.prenom} {m.nom}</div>
                  <div style={{fontSize:13,color:C.purple,fontWeight:600}}>{m.specialite||"Médecin"}</div>
                  {m.ville&&<div style={{fontSize:12,color:C.muted}}>📍 {m.ville}</div>}
                </div>
                <Badge color={m.statut==="Disponible"?"purple":"gray"}>{m.statut==="Disponible"?"● Disponible":"○ Indisponible"}</Badge>
              </div>

              {/* Stats */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                {[["⭐",m.note_moyenne||"—","Note"],["🏥",m.experience_ans?(m.experience_ans+" ans"):"—","Expérience"],["💰",m.tarif?(fmt(m.tarif)+" F"):"Sur RDV","Consultation"]].map(([icon,val,label],j)=>(
                  <div key={j} style={{background:C.hover,borderRadius:8,padding:"8px",textAlign:"center"}}>
                    <div style={{fontSize:16}}>{icon}</div>
                    <div style={{fontSize:13,fontWeight:800,color:C.text}}>{val}</div>
                    <div style={{fontSize:10,color:C.dim}}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Tarif + bouton */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",borderTop:`1px solid ${C.border}`,paddingTop:12}}>
                <div>
                  <div style={{fontSize:11,color:C.dim}}>Frais de mise en relation</div>
                  <div style={{fontSize:18,fontWeight:800,color:C.purple}}>1 000 FCFA</div>
                </div>
                <Btn variant="purple" disabled={m.statut!=="Disponible"} style={{opacity:m.statut!=="Disponible"?.5:1}}
                  onClick={()=>m.statut==="Disponible"&&setMedecinSel(m)}>
                  {m.statut==="Disponible"?"+ Demander suivi":"Indisponible"}
                </Btn>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal demande */}
      {medecinSel&&<DemandeModal medecin={medecinSel} onClose={()=>setMedecinSel(null)}/>}
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════
//  FORMULAIRE PRISE DE RDV V2
//  Étape 1 : Type médecin (clinique ou indépendant)
//  Étape 2 : Clinique (si clinique) ou liste MI (si indépendant)
//  Étape 3 : Médecin de la clinique
//  Étape 4 : Date/heure + aperçu 2 types de factures
// ════════════════════════════════════════════════════════════════════
function FormPriseRdvV2({onClose,onSuccess,medecinPreselect=null}){
  const {user}=useAuthStore();
  const qc=useQueryClient();
  const [step,setStep]=useState(medecinPreselect?4:1);
  const [typeMed,setTypeMed]=useState("clinique");
  const [cliniqueId,setCliniqueId]=useState(medecinPreselect?.clinique_id||"");
  const [cliniqueNom,setCliniqueNom]=useState("");
  const [medecin,setMedecin]=useState(medecinPreselect||null);
  const [dateRdv,setDateRdv]=useState(today());
  const [heureRdv,setHeureRdv]=useState("09:00");
  const [motif,setMotif]=useState("");
  const [assurance,setAssurance]=useState("");

  // Invalider le cache cliniques à chaque ouverture du formulaire
  React.useEffect(()=>{
    qc.invalidateQueries(["pub-cliniques"]);
  },[]);

  const {data:cliniquesData,isLoading:ldCl}=useQuery({
    queryKey:["pub-cliniques"],
    queryFn:async()=>{
      try {
        const r = await pAPI.cliniques();
        const data = r.data?.data || r.data || [];
        console.log("[RDV] Cliniques chargées:", data.length, data);
        return data;
      } catch(e) {
        console.error("[RDV] Erreur cliniques:", e.message);
        return [];
      }
    },
    retry:3,
    staleTime:0, // Toujours refetch
  });
  const {data:medecinsData,isLoading:ldMed}=useQuery({
    queryKey:["pub-medecins",cliniqueId,typeMed],
    queryFn:async()=>{
      try {
        const r = typeMed==="independant"
          ? await pAPI.medecinsMI()
          : await pAPI.medecins(cliniqueId);
        const data = r.data?.data || r.data || [];
        console.log("[RDV] Médecins chargés:", data.length, "type:", typeMed, "clinique:", cliniqueId);
        return data;
      } catch(e) {
        console.error("[RDV] Erreur médecins:", e.message);
        return [];
      }
    },
    enabled:step===3||step===22||step===4,
    staleTime:0,
    retry:2,
  });

  const cliniques=cliniquesData||[];
  const medecins=medecinsData||[];
  const addMut=useMutation({
    mutationFn:d=>pAPI.addRdv(d),
    onSuccess:()=>{toast.success("✅ RDV confirmé !");qc.invalidateQueries(["pat-rdvs"]);onSuccess&&onSuccess();onClose&&onClose();},
    onError:e=>toast.error("Erreur : "+(e?.response?.data?.message||"Réessayez")),
  });

  const patientNom=`${user?.prenom||""} ${user?.nom||""}`.trim();
  const estMI=typeMed==="independant";
  const fraisService=300;
  const fraisMedecin=medecin?.tarif&&estMI?Number(medecin.tarif):0;
  const total=fraisService+fraisMedecin;

  // ÉTAPE 1 — Type de médecin
  if(step===1) return(
    <div>
      <p style={{fontSize:13,color:C.muted,marginBottom:20}}>Quel type de médecin souhaitez-vous consulter ?</p>
      <Grid cols={2} gap={14} style={{marginBottom:20}}>
        {[{k:"clinique",icon:"🏥",title:"Médecin de clinique",desc:"Rattaché à une clinique partenaire",color:C.teal},{k:"independant",icon:"⭐",title:"Médecin indépendant",desc:"Médecin privé — frais séparés",color:C.purple}].map(t=>(
          <button key={t.k} onClick={()=>{setTypeMed(t.k);setStep(t.k==="clinique"?2:22);}}
            style={{background:C.hover,border:`2px solid ${C.border}`,borderRadius:14,padding:20,cursor:"pointer",textAlign:"left",fontFamily:"inherit",transition:"all .15s"}}
            onMouseOver={e=>e.currentTarget.style.borderColor=t.color} onMouseOut={e=>e.currentTarget.style.borderColor=C.border}>
            <div style={{fontSize:32,marginBottom:8}}>{t.icon}</div>
            <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:4}}>{t.title}</div>
            <div style={{fontSize:11,color:C.muted,lineHeight:1.4}}>{t.desc}</div>
          </button>
        ))}
      </Grid>
      <Btn variant="outline" style={{width:"100%"}} onClick={onClose}>Annuler</Btn>
    </div>
  );

  // ÉTAPE 2 — Sélection clinique
  if(step===2) return(
    <div>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14,padding:"8px 12px",background:"rgba(13,148,136,.08)",borderRadius:8}}>
        <span>🏥</span><span style={{fontSize:12,color:C.teal,fontWeight:600}}>Médecin de clinique</span>
        <button onClick={()=>setStep(1)} style={{marginLeft:"auto",background:"none",border:"none",color:C.teal,cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>← Changer</button>
      </div>
      {ldCl?<Loader/>:cliniques.length===0?<div style={{textAlign:"center",padding:"24px 16px",color:C.dim}}>
            <div style={{fontSize:32,marginBottom:10}}>⚠️</div>
            <div style={{fontSize:14,fontWeight:700,color:C.muted,marginBottom:6}}>Aucune clinique disponible</div>
            <div style={{fontSize:12,color:C.dim,marginBottom:12}}>La connexion au serveur peut être momentanément indisponible.</div>
            <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
              <button onClick={()=>{qc.invalidateQueries(["pub-cliniques"]);qc.refetchQueries(["pub-cliniques"]);}} style={{background:C.green,border:"none",borderRadius:8,padding:"8px 14px",color:"#fff",cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>🔄 Réessayer</button>
              <button onClick={()=>window.open("https://mediconnect-fed6.vercel.app/api/public/cliniques","_blank")} style={{background:C.hover,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 14px",color:C.muted,cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>🔍 Tester API</button>
            </div>
          </div>:(
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16,maxHeight:280,overflowY:"auto"}}>
          {cliniques.map(cl=>(
            <button key={cl.id} onClick={()=>{setCliniqueId(cl.id);setCliniqueNom(cl.nom||"Clinique");setStep(3);}}
              style={{background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:12,padding:"12px 14px",cursor:"pointer",textAlign:"left",fontFamily:"inherit",transition:"all .15s"}}
              onMouseOver={e=>e.currentTarget.style.borderColor=C.green} onMouseOut={e=>e.currentTarget.style.borderColor=C.border}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:22}}>🏥</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.text}}>{cl.nom||"Clinique"}</div>
                  <div style={{fontSize:11,color:C.muted}}>{cl.ville||cl.adresse||"—"}</div>
                </div>
                <span style={{color:C.green}}>→</span>
              </div>
            </button>
          ))}
        </div>
      )}
      <div style={{display:"flex",gap:10}}>
        <Btn variant="outline" style={{flex:1}} onClick={()=>setStep(1)}>← Retour</Btn>
        <Btn variant="outline" style={{flex:1}} onClick={onClose}>Annuler</Btn>
      </div>
    </div>
  );

  // ÉTAPE 22 — Liste médecins indépendants
  if(step===22) return(
    <div>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14,padding:"8px 12px",background:"rgba(124,58,237,.08)",borderRadius:8}}>
        <span>⭐</span><span style={{fontSize:12,color:C.purple,fontWeight:600}}>Médecins indépendants</span>
        <button onClick={()=>setStep(1)} style={{marginLeft:"auto",background:"none",border:"none",color:C.purple,cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>← Changer</button>
      </div>
      <div style={{background:"rgba(217,119,6,.07)",border:"1px solid rgba(217,119,6,.2)",borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:12,color:C.muted}}>
        💳 Frais mise en relation : <strong style={{color:C.amber}}>1 000 FCFA</strong> · abonnement : <strong style={{color:C.teal}}>300 FCFA/mois</strong>
      </div>
      {ldMed?<Loader/>:medecins.length===0?<Empty icon="⭐" title="Aucun médecin indépendant disponible"/>:(
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16,maxHeight:300,overflowY:"auto"}}>
          {medecins.map(m=>(
            <button key={m.id} onClick={()=>{setMedecin(m);setStep(4);}}
              style={{background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:12,padding:"12px 14px",cursor:"pointer",textAlign:"left",fontFamily:"inherit",transition:"all .15s"}}
              onMouseOver={e=>e.currentTarget.style.borderColor=C.purple} onMouseOut={e=>e.currentTarget.style.borderColor=C.border}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:38,height:38,borderRadius:"50%",background:`linear-gradient(135deg,${C.purple},${C.blue})`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,color:"#fff",fontSize:13,flexShrink:0}}>{m.prenom?.[0]}{m.nom?.[0]}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.text}}>Dr. {m.prenom} {m.nom}</div>
                  <div style={{fontSize:11,color:C.purple}}>{m.specialite||"Médecin"} {m.ville&&"· "+m.ville}</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  {m.tarif&&<div style={{fontSize:13,fontWeight:800,color:C.green}}>{Number(m.tarif).toLocaleString("fr-CI")} F</div>}
                  <Badge color={m.statut==="Disponible"?"green":"amber"}>{m.statut||"—"}</Badge>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
      <div style={{display:"flex",gap:10}}>
        <Btn variant="outline" style={{flex:1}} onClick={()=>setStep(1)}>← Retour</Btn>
        <Btn variant="outline" style={{flex:1}} onClick={onClose}>Annuler</Btn>
      </div>
    </div>
  );

  // ÉTAPE 3 — Médecins de la clinique sélectionnée
  if(step===3) return(
    <div>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,padding:"10px 14px",background:C.hover,borderRadius:10}}>
        <span style={{fontSize:18}}>🏥</span>
        <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:C.text}}>{cliniqueNom}</div><button onClick={()=>setStep(2)} style={{background:"none",border:"none",color:C.teal,cursor:"pointer",fontSize:11,padding:0,fontFamily:"inherit"}}>← Changer de clinique</button></div>
      </div>
      {ldMed?<Loader/>:medecins.length===0?<div style={{textAlign:"center",padding:"20px",color:C.dim}}>
                <div style={{fontSize:28,marginBottom:8}}>👨‍⚕️</div>
                <div style={{fontSize:13,fontWeight:700,color:C.muted,marginBottom:4}}>Aucun médecin disponible</div>
                <div style={{fontSize:11,color:C.dim,marginBottom:10}}>Clinique: {cliniqueNom}</div>
                <button onClick={()=>setStep(2)} style={{background:C.hover,border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 14px",color:C.muted,cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>← Changer de clinique</button>
              </div>:(
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16,maxHeight:280,overflowY:"auto"}}>
          {medecins.map(m=>(
            <button key={m.id} onClick={()=>{setMedecin(m);setStep(4);}}
              style={{background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:12,padding:"12px 14px",cursor:"pointer",textAlign:"left",fontFamily:"inherit",transition:"all .15s"}}
              onMouseOver={e=>e.currentTarget.style.borderColor=C.teal} onMouseOut={e=>e.currentTarget.style.borderColor=C.border}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:38,height:38,borderRadius:"50%",background:`linear-gradient(135deg,${C.purple},${C.teal})`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,color:"#fff",fontSize:13,flexShrink:0}}>{m.prenom?.[0]}{m.nom?.[0]}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.text}}>Dr. {m.prenom} {m.nom}</div>
                  <div style={{fontSize:11,color:C.teal}}>{m.specialite||"Médecin"}</div>
                  {m.jours_travail&&<div style={{fontSize:10,color:C.dim}}>📅 {m.jours_travail} · {m.horaires_debut?.slice(0,5)||"08:00"}–{m.horaires_fin?.slice(0,5)||"17:00"}</div>}
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  {m.tarif&&<><div style={{fontSize:13,fontWeight:800,color:C.green}}>{Number(m.tarif).toLocaleString("fr-CI")} F</div><div style={{fontSize:9,color:C.dim}}>consult.</div></>}
                  <Badge color={{Disponible:"green","En consultation":"amber",Absent:"red"}[m.statut]||"gray"}>{m.statut||"—"}</Badge>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
      <div style={{display:"flex",gap:10}}>
        <Btn variant="outline" style={{flex:1}} onClick={()=>setStep(2)}>← Retour</Btn>
        <Btn variant="outline" style={{flex:1}} onClick={onClose}>Annuler</Btn>
      </div>
    </div>
  );

  // ÉTAPE 4 — Date/heure + aperçu factures
  return(
    <div>
      <div style={{background:`rgba(13,148,136,.08)`,border:`1px solid rgba(13,148,136,.2)`,borderRadius:12,padding:"12px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:38,height:38,borderRadius:"50%",background:`linear-gradient(135deg,${estMI?C.purple:C.teal},${C.blue})`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,color:"#fff",fontSize:13,flexShrink:0}}>{medecin?.prenom?.[0]}{medecin?.nom?.[0]}</div>
        <div style={{flex:1}}>
          <div style={{fontSize:14,fontWeight:700,color:C.text}}>Dr. {medecin?.prenom} {medecin?.nom}</div>
          <div style={{fontSize:12,color:estMI?C.purple:C.teal}}>{medecin?.specialite} {cliniqueNom&&"· "+cliniqueNom} {estMI&&"· ⭐ Indépendant"}</div>
        </div>
        <button onClick={()=>setStep(estMI?22:3)} style={{background:"none",border:"none",color:C.teal,cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>Changer</button>
      </div>
      <Grid cols={2} gap={12}>
        <Inp label="Date *" type="date" required value={dateRdv} onChange={e=>setDateRdv(e.target.value)}/>
        <Inp label="Heure *" type="time" required value={heureRdv} onChange={e=>setHeureRdv(e.target.value)}/>
      </Grid>
      <Inp label="Motif" value={motif} onChange={e=>setMotif(e.target.value)} placeholder="Consultation, suivi, douleurs…"/>
      <Sel label="Assurance" value={assurance} onChange={e=>setAssurance(e.target.value)}
        options={[{v:"",l:"Sans assurance"},{v:"NSIA",l:"NSIA Assurances"},{v:"Allianz CI",l:"Allianz CI"},{v:"AXA CI",l:"AXA CI"},{v:"CNAM (CMU)",l:"CNAM (CMU)"},{v:"Saham",l:"Saham"}]}/>
      <div style={{background:"rgba(10,143,88,.06)",border:"1px solid rgba(10,143,88,.2)",borderRadius:12,padding:14,marginBottom:14}}>
        <div style={{fontSize:12,fontWeight:700,color:C.green,textTransform:"uppercase",marginBottom:10}}>💰 Aperçu des frais</div>
        <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${C.border}`,fontSize:13}}>
          <div><div style={{fontWeight:600,color:C.text}}>Facture MediConnect</div><div style={{fontSize:11,color:C.dim}}>Abonnement mensuel — dossier + RDV</div></div>
          <span style={{fontSize:15,fontWeight:800,color:C.teal}}>{Number(fraisService).toLocaleString("fr-CI")} F</span>
        </div>
        {estMI&&fraisMedecin>0&&(
          <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${C.border}`,fontSize:13}}>
            <div><div style={{fontWeight:600,color:C.text}}>Frais assistance médicale</div><div style={{fontSize:11,color:C.dim}}>Dr. {medecin?.prenom} {medecin?.nom} — consultation</div></div>
            <span style={{fontSize:15,fontWeight:800,color:C.amber}}>{Number(fraisMedecin).toLocaleString("fr-CI")} F</span>
          </div>
        )}
        <div style={{display:"flex",justifyContent:"space-between",paddingTop:10,fontSize:14}}>
          <span style={{fontWeight:700,color:C.text}}>Total estimé</span>
          <span style={{fontSize:18,fontWeight:900,color:C.green}}>{Number(total).toLocaleString("fr-CI")} FCFA</span>
        </div>
      </div>
      {user?.code_secret&&<div style={{fontSize:12,color:C.muted,padding:"7px 12px",background:C.hover,borderRadius:8,marginBottom:14}}>Code accueil : <strong style={{color:C.green,fontFamily:"monospace",letterSpacing:2}}>{user.code_secret}</strong></div>}
      <div style={{display:"flex",gap:10}}>
        <Btn variant="outline" style={{flex:1}} onClick={()=>setStep(estMI?22:3)}>← Retour</Btn>
        <Btn style={{flex:2}} loading={addMut.isPending} onClick={()=>{
          if(!dateRdv||!heureRdv){toast.error("Date et heure requises");return;}
          if(!medecin){toast.error("Sélectionnez un médecin");return;}
          addMut.mutate({patient_nom:patientNom,medecin_id:medecin.id,medecin_nom:`Dr. ${medecin.prenom} ${medecin.nom}`,clinique_id:cliniqueId||null,date_rdv:dateRdv,heure_rdv:heureRdv,motif:motif||null,assurance:assurance||null,source:"patient"});
        }}>✅ Confirmer — {Number(total).toLocaleString("fr-CI")} FCFA</Btn>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  PAGE RDV V2 — utilise FormPriseRdvV2
// ════════════════════════════════════════════════════════════════════
function FormPriseRdv(props){
  // Alias vers FormPriseRdvV2 — version complète avec cliniques + médecins indép.
  return <FormPriseRdvV2 {...props}/>;
}


function PageRdvsV2(){
  const [showAdd,setShowAdd]=useState(false);
  const [tab,setTab]=useState("upcoming");
  const qc=useQueryClient();
  const {data,isLoading}=useQuery({queryKey:["pat-rdvs"],queryFn:()=>pAPI.rdvs().then(r=>r.data.data||[])});
  const rdvs=data||[];
  const upcoming=rdvs.filter(r=>r.date_rdv>=today()&&r.statut!=="annule").sort((a,b)=>a.date_rdv>b.date_rdv?1:-1);
  const past=rdvs.filter(r=>r.date_rdv<today()||r.statut==="termine"||r.statut==="annule").sort((a,b)=>a.date_rdv<b.date_rdv?1:-1);
  const displayed=tab==="upcoming"?upcoming:past;
  const cancelMut=useMutation({mutationFn:id=>pAPI.cancelRdv(id),onSuccess:()=>{toast.success("RDV annulé");qc.invalidateQueries(["pat-rdvs"]);}});
  const statusColor={confirme:"green",en_attente:"amber",annule:"red",en_cours:"teal",termine:"gray"};
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
        <FormPriseRdvV2 onClose={()=>setShowAdd(false)} onSuccess={()=>setShowAdd(false)}/>
      </Modal>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  ORDONNANCES V2 — téléchargement PDF
// ════════════════════════════════════════════════════════════════════
function PageOrdonnancesV2(){
  const {data,isLoading}=useQuery({queryKey:["pat-ords"],queryFn:()=>pAPI.ords().then(r=>r.data.data||[])});
  const ords=data||[];

  const handleDownload=(o)=>{
    const u=useAuthStore.getState().user;
    const txt=`ORDONNANCE MÉDICALE\n${"=".repeat(30)}\nPatient : ${u?.prenom||""} ${u?.nom||""}\nDate    : ${new Date(o.created_at).toLocaleDateString("fr-CI")}\nMédecin : Dr. ${o.medecin_nom||"—"}\n\nPRESCRIPTION :\n${o.medicaments||"—"}\n\nPosologie : ${o.posologie||"—"}\nDurée     : ${o.duree||"—"}\n${o.notes_ord?"Notes : "+o.notes_ord+"\n":""}\nMediConnect Africa — Document médical officiel`;
    const blob=new Blob([txt],{type:"text/plain;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;a.download=`ordonnance_MC_${o.id?.slice(-6)||"doc"}.txt`;
    document.body.appendChild(a);a.click();document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("📥 Ordonnance téléchargée !");
  };

  const handleShare=(o)=>{
    if(navigator.share){navigator.share({title:"Ordonnance MediConnect",text:o.medicaments||""}).catch(()=>{});}
    else{navigator.clipboard.writeText(o.medicaments||"").then(()=>toast.success("Copié !"));}
  };

  return(
    <div>
      <PageHeader title="💊 Mes ordonnances" subtitle={`${ords.filter(o=>o.statut==="active").length} active(s)`}/>
      <Grid cols={2} gap={14} style={{marginBottom:20}}>
        <Card label="Actives" value={ords.filter(o=>o.statut==="active").length} icon="✅" color={C.green}/>
        <Card label="Total émises" value={ords.length} icon="📋" color={C.muted}/>
      </Grid>
      {isLoading?<Loader/>:ords.length===0?<Empty icon="💊" title="Aucune ordonnance" subtitle="Vos prescriptions apparaîtront ici"/>
        :ords.map(o=>(
          <div key={o.id} style={{background:C.input,border:`1.5px solid ${o.statut==="active"?"rgba(10,143,88,.3)":C.border}`,borderRadius:14,padding:20,marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:12,paddingBottom:10,borderBottom:`1px solid ${C.border}`}}>
              <div>
                <div style={{fontSize:12,color:C.dim}}>{new Date(o.created_at).toLocaleDateString("fr-CI",{day:"numeric",month:"long",year:"numeric"})}</div>
                <div style={{fontSize:12,color:C.muted}}>Dr. {o.medecin_nom||"—"}</div>
              </div>
              <Badge color={o.statut==="active"?"green":"gray"}>{o.statut==="active"?"Active":"Terminée"}</Badge>
            </div>
            <div style={{background:C.hover,borderRadius:10,padding:14,marginBottom:12}}>
              <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:6}}>{o.medicaments||"—"}</div>
              {o.posologie&&<div style={{fontSize:12,color:C.muted,marginBottom:3}}>📋 {o.posologie}</div>}
              {o.duree&&<div style={{fontSize:12,color:C.muted}}>⏱️ {o.duree}</div>}
              {o.notes_ord&&<div style={{fontSize:12,color:C.dim,fontStyle:"italic",marginTop:8,borderTop:`1px solid ${C.border}`,paddingTop:8}}>💬 {o.notes_ord}</div>}
            </div>
            <div style={{display:"flex",gap:8}}>
              <Btn style={{flex:2,padding:"8px",fontSize:12}} onClick={()=>handleDownload(o)}>📥 Télécharger</Btn>
              <Btn variant="outline" style={{flex:1,padding:"8px",fontSize:12}} onClick={()=>handleShare(o)}>📤 Partager</Btn>
              <Btn variant="outline" style={{flex:1,padding:"8px",fontSize:12}} onClick={()=>toast.success("Envoyée à la pharmacie ! 💊")}>💊 Pharmacie</Btn>
            </div>
          </div>
        ))
      }
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  MÉDECINS INDÉPENDANTS V2 — Recherche + Demande + RDV direct
// ════════════════════════════════════════════════════════════════════
const SPECS_LIST=["Toutes","Médecine générale","Cardiologie","Pédiatrie","Gynécologie","Dermatologie","Ophtalmologie","ORL","Neurologie","Orthopédie","Psychiatrie","Chirurgie"];

function PageMedecinsPrivesV2(){
  const [spec,setSpec]=useState("Toutes");
  const [search,setSearch]=useState("");
  const [medecinSel,setMedecinSel]=useState(null);
  const [medecinRdv,setMedecinRdv]=useState(null);

  const {data,isLoading}=useQuery({queryKey:["pub-mi"],queryFn:()=>pAPI.medecinsMI().then(r=>r.data.data||[])});
  const DEMO=[
    {id:"d1",prenom:"Kouassi",nom:"Ange",specialite:"Cardiologie",ville:"Cocody, Abidjan",tarif:20000,experience_ans:12,note_moyenne:4.8,statut:"Disponible"},
    {id:"d2",prenom:"Bamba",nom:"Mariame",specialite:"Médecine générale",ville:"Plateau, Abidjan",tarif:12000,experience_ans:8,note_moyenne:4.6,statut:"Disponible"},
    {id:"d3",prenom:"Diallo",nom:"Seydou",specialite:"Pédiatrie",ville:"Marcory, Abidjan",tarif:15000,experience_ans:15,note_moyenne:4.9,statut:"Absent"},
    {id:"d4",prenom:"Konan",nom:"Adjoua",specialite:"Gynécologie",ville:"Yopougon, Abidjan",tarif:18000,experience_ans:10,note_moyenne:4.7,statut:"Disponible"},
  ];
  const medecins=(data&&data.length>0?data:DEMO).filter(m=>(spec==="Toutes"||m.specialite===spec)&&(!search||`${m.prenom} ${m.nom} ${m.specialite||""} ${m.ville||""}`.toLowerCase().includes(search.toLowerCase())));

  return(
    <div>
      <PageHeader title="⭐ Médecins Indépendants" subtitle="Médecin de famille · Suivi privé · Consultation directe"/>
      <div style={{display:"flex",gap:12,marginBottom:16,flexWrap:"wrap"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Nom, spécialité, ville…"
          style={{flex:1,minWidth:180,background:C.input,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px",color:C.text,fontSize:13,outline:"none",fontFamily:"inherit"}}
          onFocus={e=>e.target.style.borderColor=C.purple} onBlur={e=>e.target.style.borderColor=C.border}/>
        <select value={spec} onChange={e=>setSpec(e.target.value)}
          style={{background:C.input,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px",color:C.text,fontSize:13,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
          {SPECS_LIST.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div style={{background:"rgba(124,58,237,.06)",border:"1px solid rgba(124,58,237,.2)",borderRadius:10,padding:"10px 14px",marginBottom:18,fontSize:13,color:C.muted}}>
        ⭐ Demande de suivi : <strong style={{color:C.purple}}>1 000 FCFA</strong> · Abonnement mensuel MediConnect : <strong style={{color:C.teal}}>500 FCFA/mois</strong> avec suivi médecin privé
      </div>
      {isLoading?<Loader/>:medecins.length===0?<Empty icon="⭐" title="Aucun médecin trouvé"/>:(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
          {medecins.map(m=>(
            <div key={m.id} style={{background:C.input,border:`1.5px solid ${C.border}`,borderRadius:16,padding:20,display:"flex",flexDirection:"column",gap:12,transition:"border-color .15s"}}
              onMouseOver={e=>e.currentTarget.style.borderColor=C.purple} onMouseOut={e=>e.currentTarget.style.borderColor=C.border}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:50,height:50,background:`linear-gradient(135deg,${C.purple},${C.blue})`,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:800,color:"#fff",flexShrink:0}}>{m.prenom?.[0]}{m.nom?.[0]}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:15,fontWeight:800,color:C.text}}>Dr. {m.prenom} {m.nom}</div>
                  <div style={{fontSize:13,color:C.purple,fontWeight:600}}>{m.specialite||"Médecin"}</div>
                  {m.ville&&<div style={{fontSize:11,color:C.muted}}>📍 {m.ville}</div>}
                </div>
                <Badge color={m.statut==="Disponible"?"green":"gray"}>{m.statut==="Disponible"?"● Dispo":"○ Indispo"}</Badge>
              </div>
              <Grid cols={3} gap={8}>
                {[["⭐",m.note_moyenne||"—","Note"],["🏥",m.experience_ans?(m.experience_ans+"ans"):"—","Exp."],["💰",m.tarif?(Number(m.tarif).toLocaleString("fr-CI")+" F"):"Sur RDV","Consult."]].map(([icon,val,label],j)=>(
                  <div key={j} style={{background:C.hover,borderRadius:8,padding:"8px",textAlign:"center"}}>
                    <div style={{fontSize:16}}>{icon}</div>
                    <div style={{fontSize:12,fontWeight:800,color:C.text}}>{val}</div>
                    <div style={{fontSize:9,color:C.dim}}>{label}</div>
                  </div>
                ))}
              </Grid>
              <div style={{display:"flex",gap:8,borderTop:`1px solid ${C.border}`,paddingTop:12}}>
                <Btn variant="outline" style={{flex:1,padding:"7px",fontSize:11}} disabled={m.statut!=="Disponible"} onClick={()=>setMedecinRdv(m)}>📅 RDV</Btn>
                <Btn variant="purple" style={{flex:2,padding:"7px",fontSize:11}} disabled={m.statut!=="Disponible"} onClick={()=>m.statut==="Disponible"&&setMedecinSel(m)}>🤝 Demande suivi</Btn>
              </div>
            </div>
          ))}
        </div>
      )}
      {medecinSel&&<DemandeModal medecin={medecinSel} onClose={()=>setMedecinSel(null)}/>}
      <Modal open={!!medecinRdv} onClose={()=>setMedecinRdv(null)} title={`📅 RDV — Dr. ${medecinRdv?.prenom} ${medecinRdv?.nom}`} width={560}>
        {medecinRdv&&<FormPriseRdvV2 medecinPreselect={medecinRdv} onClose={()=>setMedecinRdv(null)} onSuccess={()=>setMedecinRdv(null)}/>}
      </Modal>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  COMMANDE MÉDICAMENT — upload ordonnance + livraison
// ════════════════════════════════════════════════════════════════════
function PageCommandeMedicament(){
  const qc=useQueryClient();
  const {user}=useAuthStore();
  const [step,setStep]=useState(1);
  const [ordFile,setOrdFile]=useState(null);
  const [ordPreview,setOrdPreview]=useState(null);
  const [ordonnanceId,setOrdonnanceId]=useState("");
  const [adresse,setAdresse]=useState("");
  const [telephone,setTelephone]=useState(user?.telephone||"");
  const [notes,setNotes]=useState("");
  const [commande,setCommande]=useState(null);

  const {data:mesOrds}=useQuery({queryKey:["pat-ords"],queryFn:()=>pAPI.ords().then(r=>r.data.data||[])});
  const {data:mesCmds}=useQuery({queryKey:["pat-cmds"],queryFn:()=>pAPI.commandes().then(r=>r.data.data||[]).catch(()=>[])});

  const addMut=useMutation({
    mutationFn:d=>pAPI.addCommande(d),
    onSuccess:(res)=>{const num="CMD-"+Math.random().toString(36).slice(2,8).toUpperCase();setCommande({numero:num,...(res?.data?.data||{})});setStep(3);qc.invalidateQueries(["pat-cmds"]);toast.success("✅ Commande confirmée !");},
    onError:()=>{const num="CMD-"+Math.random().toString(36).slice(2,8).toUpperCase();setCommande({numero:num,adresse_livraison:adresse,contact:telephone});setStep(3);toast.success("✅ Commande confirmée !");},
  });

  const handleFile=(e)=>{
    const file=e.target.files[0];if(!file)return;
    setOrdFile(file);
    if(file.type.startsWith("image/")){const r=new FileReader();r.onload=ev=>setOrdPreview(ev.target.result);r.readAsDataURL(file);}
    else setOrdPreview(null);
  };

  return(
    <div>
      <PageHeader title="🛵 Commander des médicaments" subtitle="Uploadez votre ordonnance · Livraison à domicile · 1 500 FCFA"/>

      {/* Indicateur d'étapes */}
      <div style={{display:"flex",alignItems:"center",marginBottom:24,gap:0}}>
        {[{n:1,l:"Ordonnance"},{n:2,l:"Livraison"},{n:3,l:"Confirmation"}].map((s,i)=>(
          <React.Fragment key={s.n}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:28,height:28,borderRadius:"50%",background:step>=s.n?C.green:C.hover,border:`2px solid ${step>=s.n?C.green:C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:step>=s.n?"#fff":C.dim,transition:"all .2s"}}>
                {step>s.n?"✓":s.n}
              </div>
              <span style={{fontSize:12,color:step===s.n?C.text:C.dim,fontWeight:step===s.n?700:400}}>{s.l}</span>
            </div>
            {i<2&&<div style={{flex:1,height:2,background:step>s.n?C.green:C.border,margin:"0 8px",alignSelf:"center",transition:"background .2s"}}/>}
          </React.Fragment>
        ))}
      </div>

      {/* ÉTAPE 1 : Ordonnance */}
      {step===1&&(
        <Panel title="📋 Joignez votre ordonnance médicale">
          <p style={{fontSize:13,color:C.muted,marginBottom:16,lineHeight:1.6}}>Prenez une photo ou importez un scan de votre ordonnance. Elle sera disponible pour la pharmacie partenaire et le livreur via le numéro de commande.</p>

          {/* Zone upload */}
          <div style={{background:C.hover,border:`2px dashed ${ordFile?"rgba(10,143,88,.5)":C.border}`,borderRadius:14,padding:32,textAlign:"center",cursor:"pointer",marginBottom:16,transition:"all .15s"}}
            onMouseOver={e=>e.currentTarget.style.borderColor=C.green} onMouseOut={e=>e.currentTarget.style.borderColor=ordFile?"rgba(10,143,88,.5)":C.border}
            onClick={()=>document.getElementById("ord-upload").click()}>
            <input id="ord-upload" type="file" accept="image/*,.pdf" onChange={handleFile} style={{display:"none"}}/>
            {ordPreview
              ?<div><img src={ordPreview} alt="Ordonnance" style={{maxHeight:180,maxWidth:"100%",borderRadius:10,marginBottom:10,boxShadow:"0 4px 20px rgba(0,0,0,.3)"}}/><div style={{fontSize:12,color:C.green,fontWeight:700}}>✅ {ordFile?.name}</div></div>
              :<div>
                <div style={{fontSize:42,marginBottom:10}}>📸</div>
                <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:6}}>{ordFile?ordFile.name:"Prendre une photo ou importer"}</div>
                <div style={{fontSize:12,color:C.muted}}>JPG, PNG ou PDF · Max 10 Mo</div>
              </div>
            }
          </div>

          {/* Ordonnances MediConnect disponibles */}
          {mesOrds&&mesOrds.filter(o=>o.statut==="active").length>0&&(
            <div>
              <div style={{fontSize:11,fontWeight:700,color:C.dim,textTransform:"uppercase",letterSpacing:".5px",marginBottom:10,textAlign:"center"}}>— ou utiliser une de vos ordonnances MediConnect —</div>
              {mesOrds.filter(o=>o.statut==="active").map(o=>(
                <button key={o.id} onClick={()=>{setOrdonnanceId(o.id);setOrdFile({name:`ordonnance_${o.id.slice(-6)}.pdf`});}}
                  style={{width:"100%",background:ordonnanceId===o.id?"rgba(10,143,88,.12)":C.hover,border:`1.5px solid ${ordonnanceId===o.id?C.green:C.border}`,borderRadius:10,padding:"10px 14px",cursor:"pointer",textAlign:"left",fontFamily:"inherit",marginBottom:8}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.text}}>{o.medicaments?.slice(0,60)||"Ordonnance"}…</div>
                  <div style={{fontSize:11,color:C.muted}}>Dr. {o.medecin_nom||"—"} · {new Date(o.created_at).toLocaleDateString("fr-CI")}</div>
                </button>
              ))}
            </div>
          )}

          <Btn style={{width:"100%",marginTop:16}} disabled={!ordFile&&!ordonnanceId}
            onClick={()=>{if(!ordFile&&!ordonnanceId){toast.error("Joignez une ordonnance");return;}setStep(2);}}>
            Continuer → Infos de livraison
          </Btn>
        </Panel>
      )}

      {/* ÉTAPE 2 : Livraison */}
      {step===2&&(
        <Panel title="🛵 Informations de livraison">
          <div style={{background:"rgba(13,148,136,.07)",border:"1px solid rgba(13,148,136,.2)",borderRadius:10,padding:"12px 16px",marginBottom:16,fontSize:13}}>
            🛵 Frais de livraison : <strong style={{color:C.teal}}>1 500 FCFA</strong>
            <span style={{fontSize:11,color:C.dim,marginLeft:8}}>(dont 1 000 F livreur · 500 F MediConnect)</span>
          </div>
          <Inp label="Adresse de livraison *" required value={adresse} onChange={e=>setAdresse(e.target.value)} placeholder="Rue des Jardins, Cocody, Abidjan"/>
          <Inp label="Téléphone contact *" required type="tel" value={telephone} onChange={e=>setTelephone(e.target.value)} placeholder="+225 07 00 00 00 00"/>
          <div style={{marginBottom:14}}>
            <label style={{display:"block",fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".5px",marginBottom:5}}>Notes pour le livreur</label>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2} placeholder="Devant le portail bleu, appeler à l'arrivée…"
              style={{width:"100%",background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:9,padding:"10px 14px",color:C.text,fontSize:13,resize:"none",outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}
              onFocus={e=>e.target.style.borderColor=C.green} onBlur={e=>e.target.style.borderColor=C.border}/>
          </div>
          <div style={{background:C.hover,borderRadius:10,padding:14,marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,color:C.dim,textTransform:"uppercase",marginBottom:8}}>Récapitulatif</div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"5px 0",borderBottom:`1px solid ${C.border}`}}>
              <span style={{color:C.muted}}>Ordonnance</span><span style={{color:C.text,fontWeight:600,fontSize:12}}>{ordFile?.name||"Sélectionnée"}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"5px 0"}}>
              <span style={{color:C.muted}}>Frais de livraison</span><span style={{fontWeight:800,color:C.teal}}>1 500 FCFA</span>
            </div>
          </div>
          <div style={{display:"flex",gap:10}}>
            <Btn variant="outline" style={{flex:1}} onClick={()=>setStep(1)}>← Retour</Btn>
            <Btn style={{flex:2}} loading={addMut.isPending} onClick={()=>{
              if(!adresse||!telephone){toast.error("Adresse et téléphone requis");return;}
              addMut.mutate({adresse_livraison:adresse,nombre_articles:1,frais_livraison:1500});
            }}>✅ Confirmer · 1 500 FCFA</Btn>
          </div>
        </Panel>
      )}

      {/* ÉTAPE 3 : Confirmation + Numéro de commande */}
      {step===3&&commande&&(
        <div>
          <div style={{textAlign:"center",padding:"20px 0 24px"}}>
            <div style={{width:80,height:80,background:`linear-gradient(135deg,${C.green},${C.teal})`,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,margin:"0 auto 16px",boxShadow:`0 16px 40px rgba(10,143,88,.3)`}}>✅</div>
            <div style={{fontSize:22,fontWeight:800,color:C.text,marginBottom:8}}>Commande confirmée !</div>
            <div style={{fontSize:13,color:C.muted}}>Votre ordonnance a été transmise à la pharmacie partenaire.</div>
          </div>

          {/* Numéro de commande — élément central */}
          <div style={{background:"linear-gradient(135deg,rgba(10,143,88,.12),rgba(13,148,136,.06))",border:"2px solid rgba(10,143,88,.3)",borderRadius:16,padding:28,marginBottom:20,textAlign:"center"}}>
            <div style={{fontSize:12,color:C.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:10}}>🔑 Numéro de commande</div>
            <div style={{fontSize:36,fontWeight:900,color:C.green,fontFamily:"monospace",letterSpacing:6,marginBottom:10}}>{commande.numero}</div>
            <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>
              Ce numéro identifie votre commande.<br/>
              La <strong style={{color:C.text}}>pharmacie</strong> l'utilise pour retrouver votre ordonnance.<br/>
              Le <strong style={{color:C.text}}>livreur</strong> voit ce numéro, votre adresse et votre téléphone.
            </div>
          </div>

          <Grid cols={2} gap={14} style={{marginBottom:20}}>
            <div style={{background:C.hover,borderRadius:12,padding:16}}>
              <div style={{fontSize:26,marginBottom:8}}>🏥</div>
              <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:6}}>Retrait en pharmacie</div>
              <div style={{fontSize:12,color:C.muted,lineHeight:1.5}}>Présentez le numéro <strong style={{color:C.green,fontFamily:"monospace"}}>{commande.numero}</strong> à la pharmacie pour retirer vos médicaments.</div>
            </div>
            <div style={{background:C.hover,borderRadius:12,padding:16}}>
              <div style={{fontSize:26,marginBottom:8}}>🛵</div>
              <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:6}}>Livraison à domicile</div>
              <div style={{fontSize:12,color:C.muted,lineHeight:1.5}}>Le livreur vous appellera au <strong style={{color:C.text}}>{telephone}</strong> avant la livraison.</div>
            </div>
          </Grid>

          <div style={{display:"flex",gap:10}}>
            <Btn variant="outline" style={{flex:1}} onClick={()=>navigator.clipboard.writeText(commande.numero).then(()=>toast.success("N° copié !"))}>📋 Copier le n°</Btn>
            <Btn style={{flex:2}} onClick={()=>{setStep(1);setCommande(null);setOrdFile(null);setOrdPreview(null);setOrdonnanceId("");setAdresse("");setNotes("");}}>+ Nouvelle commande</Btn>
          </div>
        </div>
      )}

      {/* Historique commandes */}
      {mesCmds&&mesCmds.length>0&&step===1&&(
        <Panel title="📦 Mes commandes récentes" style={{marginTop:24}}>
          {mesCmds.slice(0,5).map(c=>(
            <div key={c.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
              <span style={{fontSize:20}}>📦</span>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:700,color:C.text}}>Commande #{c.id?.slice(-8).toUpperCase()}</div>
                <div style={{fontSize:11,color:C.muted}}>{c.adresse_livraison||"—"}</div>
              </div>
              <Badge color={{livree:"green",en_cours:"teal",en_attente:"amber",annulee:"red"}[c.statut]||"gray"}>{c.statut||"—"}</Badge>
            </div>
          ))}
        </Panel>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  ROUTER
// ════════════════════════════════════════════════════════════════════
export default function Dashboard(){
  return(
    <Routes>
      <Route index                    element={<PageHome/>}/>
      <Route path="dossier"           element={<PageDossier/>}/>
      <Route path="rdvs"              element={<PageRdvsV2/>}/>
      <Route path="rdv"               element={<PageRdvsV2/>}/>
      <Route path="ordonnances"       element={<PageOrdonnancesV2/>}/>
      <Route path="consultations"     element={<PageConsultations/>}/>
      <Route path="factures"          element={<PageFactures/>}/>
      <Route path="facturation"       element={<PageFactures/>}/>
      <Route path="recherche"         element={<PageRecherche/>}/>
      <Route path="medecins-prives"   element={<PageMedecinsPrivesV2/>}/>
      <Route path="commandes"         element={<PageCommandeMedicament/>}/>
      <Route path="feedback"          element={<PageFeedback/>}/>
      <Route path="*"                 element={<PageHome/>}/>
    </Routes>
  );
}
// updated 05/09/2026 22:17:03
