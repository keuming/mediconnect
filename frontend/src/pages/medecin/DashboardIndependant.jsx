import React, { useState, useMemo } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import useAuthStore from "../../context/authStore";
import api from "../../services/api";

// ── Palette ───────────────────────────────────────────────────────
const C={green:"#0A8F58",teal:"#0D9488",amber:"#D97706",red:"#E11D48",blue:"#2563EB",purple:"#7C3AED",bg:"#060C12",card:"#0E1620",input:"#141E2B",hover:"#1A2535",border:"#1E2F42",text:"#F0F4F8",muted:"#8BA0B5",dim:"#4E657A"};
const fmt=n=>Number(n||0).toLocaleString("fr-CI");
const fmtDate=d=>d?new Date(d).toLocaleDateString("fr-CI",{day:"numeric",month:"long",year:"numeric"}):"—";
const today=()=>new Date().toISOString().split("T")[0];
const MOIS_FR=["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const JOURS_FR=["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];

// Tarifs MediConnect pour médecin indépendant
const TARIF_ABONNEMENT = 500; // FCFA/mois (suivi médical privé)

const mAPI={
  stats:      ()=>api.get("/planning/stats").then(r=>({data:{data:r.data||{}}})),
  dispos:     p =>api.get("/planning/disponibilites",{params:p}).then(r=>({data:{data:r.data||[]}})),
  addDispo:   d =>api.post("/planning/disponibilites",d),
  delDispo:   id=>api.delete(`/planning/disponibilites/${id}`),
  patients:   ()=>api.get("/planning/mes-patients").then(r=>({data:{data:r.data||[]}})),
  rdvs:       p =>api.get("/planning/rdvs",{params:p}).then(r=>({data:{data:r.data||[]}})),
  consultations:()=>api.get("/consultations").then(r=>({data:{data:r.data||[]}})),
  addConsult: d =>api.post("/consultations/depuis-rdv",d),
  addOrd:     d =>api.post("/ordonnances",d),
  updRdv:     (id,d)=>api.put(`/rendez-vous/${id}`,d),
  factures:   ()=>api.get("/factures").then(r=>({data:{data:r.data||[]}})),
  addFacture: d =>api.post("/factures",d),
  updFacture: (id,d)=>api.put(`/factures/${id}`,d),
  addPatient: d =>api.post("/patients",d),
};

// ── UI ────────────────────────────────────────────────────────────
const Btn=({children,onClick,variant="primary",loading,disabled,style:s={},type="button"})=>{
  const v={primary:{background:`linear-gradient(135deg,${C.purple},${C.teal})`,color:"#fff",border:"none"},outline:{background:"transparent",color:C.muted,border:`1.5px solid ${C.border}`},danger:{background:"rgba(225,29,72,.1)",color:C.red,border:"1.5px solid rgba(225,29,72,.25)"},amber:{background:C.amber,color:"#fff",border:"none"},teal:{background:C.teal,color:"#fff",border:"none"},purple:{background:C.purple,color:"#fff",border:"none"}};
  return <button type={type} onClick={onClick} disabled={loading||disabled} style={{borderRadius:9,padding:"9px 18px",fontSize:13,fontWeight:700,cursor:(loading||disabled)?"not-allowed":"pointer",opacity:(loading||disabled)?.65:1,fontFamily:"inherit",...v[variant]||v.primary,...s}}>{loading?"⏳…":children}</button>;
};
const Badge=({children,color="gray"})=>{
  const m={green:[C.green,"rgba(10,143,88,.15)"],teal:[C.teal,"rgba(13,148,136,.15)"],amber:[C.amber,"rgba(217,119,6,.15)"],red:[C.red,"rgba(225,29,72,.15)"],blue:[C.blue,"rgba(37,99,235,.15)"],purple:[C.purple,"rgba(124,58,237,.15)"],gray:[C.muted,"rgba(255,255,255,.08)"]};
  const [text,bg]=m[color]||m.gray;
  return <span style={{background:bg,color:text,fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20}}>{children}</span>;
};
const Panel=({title,children,actions,accent,style:s={}})=>(
  <div style={{background:C.input,border:`1.5px solid ${accent||C.border}`,borderRadius:14,padding:20,...s}}>
    {(title||actions)&&<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>{title&&<h3 style={{fontSize:14,fontWeight:700,color:C.text,margin:0}}>{title}</h3>}{actions&&<div style={{display:"flex",gap:8}}>{actions}</div>}</div>}
    {children}
  </div>
);
const Card=({label,value,icon,color=C.purple,sub,onClick})=>(
  <div onClick={onClick} style={{background:C.input,border:`1.5px solid ${C.border}`,borderRadius:14,padding:"18px 16px",cursor:onClick?"pointer":"default",transition:"border-color .15s"}} onMouseOver={e=>onClick&&(e.currentTarget.style.borderColor=color)} onMouseOut={e=>onClick&&(e.currentTarget.style.borderColor=C.border)}>
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>{icon&&<span style={{fontSize:18}}>{icon}</span>}<span style={{fontSize:11,textTransform:"uppercase",letterSpacing:".5px",color:C.dim,fontWeight:700}}>{label}</span></div>
    <div style={{fontSize:26,fontWeight:900,color}}>{value}</div>
    {sub&&<div style={{fontSize:12,color:C.muted,marginTop:3}}>{sub}</div>}
  </div>
);
const Modal=({open,onClose,title,children,width=520})=>{
  if(!open)return null;
  return <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}><div onClick={e=>e.stopPropagation()} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:28,width,maxWidth:"95vw",maxHeight:"90vh",overflowY:"auto"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}><h2 style={{fontSize:17,fontWeight:700,color:C.text,margin:0}}>{title}</h2><button onClick={onClose} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:20}}>✕</button></div>{children}</div></div>;
};
const Inp=({label,value,onChange,type="text",placeholder,required,style:s={}})=>(
  <div style={{marginBottom:14,...s}}>
    {label&&<label style={{display:"block",fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".5px",marginBottom:5}}>{label}{required&&" *"}</label>}
    <input type={type} value={value||""} onChange={onChange} placeholder={placeholder} required={required} style={{width:"100%",background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:9,padding:"10px 14px",color:C.text,fontSize:14,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}} onFocus={e=>e.target.style.borderColor=C.purple} onBlur={e=>e.target.style.borderColor=C.border}/>
  </div>
);
const Sel=({label,value,onChange,options=[],required,style:s={}})=>(
  <div style={{marginBottom:14,...s}}>
    {label&&<label style={{display:"block",fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".5px",marginBottom:5}}>{label}{required&&" *"}</label>}
    <select value={value||""} onChange={onChange} required={required} style={{width:"100%",background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:9,padding:"10px 14px",color:C.text,fontSize:14,outline:"none",fontFamily:"inherit"}}>
      {options.map(o=>typeof o==="string"?<option key={o} value={o}>{o}</option>:<option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  </div>
);
const Grid=({cols=2,gap=16,children,style:s={}})=><div style={{display:"grid",gridTemplateColumns:`repeat(${cols},1fr)`,gap,...s}}>{children}</div>;
const Loader=()=><div style={{textAlign:"center",padding:48,color:C.dim}}>⏳ Chargement…</div>;
const Empty=({icon,title,subtitle})=>(
  <div style={{textAlign:"center",padding:"36px 20px",color:C.dim}}>
    <div style={{fontSize:38,marginBottom:10}}>{icon}</div>
    {title&&<div style={{fontSize:15,fontWeight:700,color:C.muted,marginBottom:4}}>{title}</div>}
    {subtitle&&<div style={{fontSize:13}}>{subtitle}</div>}
  </div>
);
const PageHeader=({title,subtitle,actions})=>(
  <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:24}}>
    <div><h1 style={{fontSize:22,fontWeight:800,color:C.text,margin:"0 0 4px"}}>{title}</h1>{subtitle&&<p style={{fontSize:13,color:C.muted,margin:0}}>{subtitle}</p>}</div>
    {actions&&<div style={{display:"flex",gap:10}}>{actions}</div>}
  </div>
);
const Avatar=({prenom,nom,size=48,fontSize=18})=>(
  <div style={{width:size,height:size,borderRadius:"50%",background:`linear-gradient(135deg,${C.purple},${C.blue})`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,color:"#fff",fontSize,flexShrink:0}}>
    {(prenom||"?")[0]}{(nom||"")[0]}
  </div>
);
const ProgressBar=({value,max=100,color=C.purple})=>(
  <div style={{background:C.hover,borderRadius:4,height:5}}><div style={{width:`${Math.min(100,Math.round(value/Math.max(max,1)*100))}%`,height:"100%",background:color,borderRadius:4,transition:"width .4s"}}/></div>
);

// ════════════════════════════════════════════════════════════════════
// CALENDRIER INTERACTIF
// ════════════════════════════════════════════════════════════════════
function Calendrier({mois,annee,dispos,rdvs,onDayClick,selectedDay}){
  const firstDay=new Date(annee,mois-1,1).getDay();
  const daysInMonth=new Date(annee,mois,0).getDate();
  const todayStr=today();
  const disposByDate=useMemo(()=>{const idx={};dispos.forEach(d=>{if(!idx[d.date])idx[d.date]=[];idx[d.date].push(d);});return idx;},[dispos]);
  const rdvsByDate=useMemo(()=>{const idx={};rdvs.forEach(r=>{if(!idx[r.date_rdv])idx[r.date_rdv]=[];idx[r.date_rdv].push(r);});return idx;},[rdvs]);
  const cells=[];
  for(let i=0;i<firstDay;i++)cells.push(null);
  for(let d=1;d<=daysInMonth;d++)cells.push(d);
  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:4}}>
        {JOURS_FR.map(j=><div key={j} style={{textAlign:"center",fontSize:10,fontWeight:700,color:C.dim,padding:"4px 0",textTransform:"uppercase"}}>{j}</div>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
        {cells.map((day,i)=>{
          if(!day)return <div key={`e${i}`}/>;
          const ds=`${annee}-${String(mois).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const isSel=ds===selectedDay,isToday=ds===todayStr,isPast=ds<todayStr;
          const dd=disposByDate[ds]||[],dr=rdvsByDate[ds]||[];
          return(
            <button key={day} onClick={()=>onDayClick(ds)}
              style={{aspectRatio:"1",background:isSel?C.purple:isToday?"rgba(124,58,237,.2)":dd.length?"rgba(13,148,136,.1)":C.hover,border:`2px solid ${isSel?C.purple:isToday?C.purple:dd.length?C.teal:C.border}`,borderRadius:10,cursor:"pointer",fontFamily:"inherit",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,padding:2,opacity:isPast?.6:1,transition:"all .15s"}}
              onMouseOver={e=>{if(!isSel)e.currentTarget.style.borderColor=C.purple;}}
              onMouseOut={e=>{if(!isSel)e.currentTarget.style.borderColor=isToday?C.purple:dd.length?C.teal:C.border;}}>
              <span style={{fontSize:13,fontWeight:isSel||isToday?800:500,color:isSel?"#fff":isToday?C.purple:C.text}}>{day}</span>
              <div style={{display:"flex",gap:2}}>
                {dd.length>0&&<div style={{width:5,height:5,borderRadius:"50%",background:isSel?"rgba(255,255,255,.8)":C.teal}}/>}
                {dr.length>0&&<div style={{width:5,height:5,borderRadius:"50%",background:isSel?"rgba(255,255,255,.8)":C.amber}}/>}
              </div>
            </button>
          );
        })}
      </div>
      <div style={{display:"flex",gap:16,marginTop:12,fontSize:11,color:C.dim}}>
        <span style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:8,height:8,borderRadius:"50%",background:C.teal}}/> Disponible</span>
        <span style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:8,height:8,borderRadius:"50%",background:C.amber}}/> RDV</span>
        <span style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:8,height:8,borderRadius:"50%",background:C.purple}}/> Aujourd'hui</span>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// HOME — MÉDECIN INDÉPENDANT
// ════════════════════════════════════════════════════════════════════
function PageHome(){
  const {user}=useAuthStore(); const nav=useNavigate();
  const {data:statsData}=useQuery({queryKey:["mi-stats"],queryFn:()=>mAPI.stats().then(r=>r.data.data||{}),retry:1});
  const {data:rdvData}=useQuery({queryKey:["mi-rdvs-today"],queryFn:()=>mAPI.rdvs({date:today()}).then(r=>r.data.data||[]),retry:1});
  const {data:factData}=useQuery({queryKey:["mi-factures"],queryFn:()=>mAPI.factures().then(r=>r.data.data||[]),retry:1});
  const stats=statsData||{}; const rdvs=rdvData||[]; const factures=factData||[];
  const revenusMois=factures.filter(f=>{const d=new Date(f.created_at),n=new Date();return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear()&&f.statut==="payee";}).reduce((s,f)=>s+(+f.montant||0),0);
  const factImpayees=factures.filter(f=>f.statut==="en_attente");

  const modules=[
    {icon:"📅",label:"Mon planning",path:"planning",color:C.teal,desc:`${stats.creneaux_disponibles||0} créneaux libres`},
    {icon:"👤",label:"Mes patients",path:"patients",color:C.blue,desc:"Clientèle privée"},
    {icon:"💰",label:"Facturation",path:"facturation",color:C.amber,desc:`${factImpayees.length} impayée(s)`},
    {icon:"🩺",label:"Consultations",path:"consultations",color:C.green,desc:`${stats.consultations_total||0} au total`},
    {icon:"💊",label:"Ordonnances",path:"ordonnances",color:C.purple,desc:"Prescriptions"},
    {icon:"📊",label:"Statistiques",path:"stats",color:C.purple,desc:"Revenus & activité"},
  ];

  return(
    <div>
      {/* Header indépendant — badge distinctif */}
      <div style={{background:"linear-gradient(135deg,rgba(124,58,237,.14),rgba(37,99,235,.08))",border:"1px solid rgba(124,58,237,.25)",borderRadius:16,padding:24,marginBottom:24,display:"flex",alignItems:"center",gap:20,flexWrap:"wrap"}}>
        <Avatar prenom={user?.prenom} nom={user?.nom} size={64} fontSize={24}/>
        <div style={{flex:1,minWidth:200}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
            <div style={{fontSize:22,fontWeight:800,color:C.text}}>Dr. {user?.prenom} {user?.nom}</div>
            <span style={{background:"rgba(124,58,237,.2)",color:C.purple,fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20}}>⭐ Indépendant</span>
          </div>
          <div style={{fontSize:14,color:C.teal,fontWeight:600,marginBottom:8}}>{user?.specialite||"Médecin"}</div>
          {/* Abonnement MediConnect */}
          <div style={{display:"flex",alignItems:"center",gap:8,background:"rgba(10,143,88,.08)",borderRadius:10,padding:"6px 12px",width:"fit-content"}}>
            <span style={{fontSize:12,color:C.green,fontWeight:700}}>💳 Abonnement MediConnect : {fmt(TARIF_ABONNEMENT)} FCFA/mois</span>
          </div>
        </div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          <div style={{background:"rgba(10,143,88,.1)",border:"1px solid rgba(10,143,88,.2)",borderRadius:12,padding:"12px 16px",textAlign:"center"}}>
            <div style={{fontSize:10,color:C.green,fontWeight:700,textTransform:"uppercase",marginBottom:3}}>Revenus ce mois</div>
            <div style={{fontSize:18,fontWeight:900,color:C.green}}>{fmt(revenusMois)} F</div>
          </div>
          <Btn variant="purple" onClick={()=>nav("planning")}>📅 Mon planning</Btn>
        </div>
      </div>

      {/* KPIs */}
      <Grid cols={4} gap={14} style={{marginBottom:24}}>
        <Card label="RDV aujourd'hui" value={stats.rdv_aujourd_hui||0} icon="📅" color={C.teal} sub={`${rdvs.filter(r=>r.statut==="en_attente").length} en attente`} onClick={()=>nav("planning")}/>
        <Card label="Revenus ce mois" value={`${fmt(revenusMois)} F`} icon="💰" color={C.green} sub="Consultations facturées" onClick={()=>nav("facturation")}/>
        <Card label="Factures impayées" value={factImpayees.length} icon="⚠️" color={factImpayees.length>0?C.amber:C.green} sub={`${fmt(factImpayees.reduce((s,f)=>s+(+f.montant||0),0))} F à récupérer`} onClick={()=>nav("facturation")}/>
        <Card label="Consultations" value={stats.consultations_total||0} icon="🩺" color={C.purple} onClick={()=>nav("consultations")}/>
      </Grid>

      {/* Info abonnement MediConnect */}
      <div style={{background:"rgba(124,58,237,.06)",border:"1px solid rgba(124,58,237,.2)",borderRadius:12,padding:14,marginBottom:20,fontSize:13,color:C.muted,display:"flex",alignItems:"center",gap:12}}>
        <span style={{fontSize:24}}>⭐</span>
        <div>
          <strong style={{color:C.text}}>Médecin indépendant — abonnement {fmt(TARIF_ABONNEMENT)} FCFA/mois</strong><br/>
          Vous bénéficiez du suivi médical privé via MediConnect. Vos créneaux de disponibilité sont visibles sur <strong style={{color:C.teal}}>rdv.mediconnect4africa.cloud</strong>. Vos patients paient directement votre tarif de consultation + {fmt(TARIF_ABONNEMENT)} F à MediConnect.
        </div>
      </div>

      {/* Modules */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:14,marginBottom:24}}>
        {modules.map(m=>(
          <button key={m.path} onClick={()=>nav(m.path)} style={{background:C.input,border:`1.5px solid ${C.border}`,borderRadius:14,padding:20,cursor:"pointer",textAlign:"left",fontFamily:"inherit",transition:"all .15s"}}
            onMouseOver={e=>{e.currentTarget.style.borderColor=m.color;e.currentTarget.style.transform="translateY(-2px)";}}
            onMouseOut={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.transform="none";}}>
            <div style={{fontSize:28,marginBottom:10}}>{m.icon}</div>
            <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:3}}>{m.label}</div>
            <div style={{fontSize:11,color:C.dim}}>{m.desc}</div>
          </button>
        ))}
      </div>

      {/* RDV + factures récentes */}
      <Grid cols={2} gap={20}>
        <Panel title="📅 RDV du jour" actions={<Btn style={{padding:"6px 14px",fontSize:12}} onClick={()=>nav("planning")}>Planning →</Btn>}>
          {rdvs.length===0?<Empty icon="📅" title="Aucun RDV aujourd'hui" subtitle="Gérez votre planning pour ajouter des créneaux"/>
            :rdvs.map(r=>(
              <div key={r.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:`1px solid ${C.border}`}}>
                <div style={{textAlign:"center",minWidth:52,background:C.hover,borderRadius:10,padding:"6px 8px"}}>
                  <div style={{fontSize:14,fontWeight:800,color:C.text}}>{r.heure_rdv?.slice(0,5)||"—"}</div>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.text}}>{r.patient_nom||"Patient"}</div>
                  <div style={{fontSize:11,color:C.muted}}>{r.motif||"Consultation"}</div>
                </div>
                <Badge color={{confirme:"green",en_attente:"amber",en_cours:"teal",termine:"gray"}[r.statut]||"gray"}>{r.statut}</Badge>
              </div>
            ))
          }
        </Panel>
        <Panel title="💰 Factures récentes" actions={<Btn style={{padding:"6px 14px",fontSize:12}} onClick={()=>nav("facturation")}>Tout voir →</Btn>}>
          {factures.length===0?<Empty icon="💰" title="Aucune facture" subtitle="Créez des factures depuis vos consultations"/>
            :factures.slice(0,5).map(f=>(
              <div key={f.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.text}}>{f.patient_nom||"Patient"}</div>
                  <div style={{fontSize:11,color:C.muted}}>{fmtDate(f.created_at)}</div>
                </div>
                <span style={{fontSize:14,fontWeight:800,color:f.statut==="payee"?C.green:C.amber}}>{fmt(f.montant)} F</span>
                <Badge color={f.statut==="payee"?"green":"amber"}>{f.statut==="payee"?"Payée":"Impayée"}</Badge>
              </div>
            ))
          }
        </Panel>
      </Grid>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// PLANNING — MÉDECIN INDÉPENDANT (sans filtre clinique)
// ════════════════════════════════════════════════════════════════════
function PagePlanning(){
  const qc=useQueryClient();
  const now=new Date();
  const [mois,setMois]=useState(now.getMonth()+1);
  const [annee,setAnnee]=useState(now.getFullYear());
  const [selectedDay,setSelectedDay]=useState(today());
  const [showAddDispo,setShowAddDispo]=useState(false);
  const [showConsult,setShowConsult]=useState(false);
  const [selectedRdv,setSelectedRdv]=useState(null);
  const [showAddRdv,setShowAddRdv]=useState(false);
  const [newDispo,setNewDispo]=useState({heure_debut:"08:00",heure_fin:"09:00"});
  const [cForm,setCForm]=useState({diagnostic:"",traitement:"",notes:"",tension_arterielle:"",temperature:"",poids:"",taille:"",ord_medicaments:"",ord_posologie:"",ord_duree:""});
  const [rdvForm,setRdvForm]=useState({patient_nom:"",heure_rdv:"09:00",motif:"",assurance:""});

  const {data:dispoData,isLoading:ldD}=useQuery({queryKey:["mi-dispos",mois,annee],queryFn:()=>mAPI.dispos({mois,annee}).then(r=>r.data.data||[])});
  const {data:rdvData}=useQuery({queryKey:["mi-rdvs-m"],queryFn:()=>mAPI.rdvs({}).then(r=>r.data.data||[])});
  const dispos=dispoData||[]; const rdvs=rdvData||[];
  const dayDispos=dispos.filter(d=>d.date===selectedDay);
  const dayRdvs=rdvs.filter(r=>r.date_rdv?.slice(0,10)===selectedDay&&r.statut!=="annule");

  const addDispoMut=useMutation({mutationFn:d=>mAPI.addDispo(d),onSuccess:()=>{toast.success("✅ Créneau publié sur rdv.mediconnect4africa.cloud !");qc.invalidateQueries(["mi-dispos"]);setShowAddDispo(false);},onError:e=>toast.error(e?.response?.data?.message||"Erreur")});
  const delDispoMut=useMutation({mutationFn:id=>mAPI.delDispo(id),onSuccess:()=>{toast.success("Créneau supprimé");qc.invalidateQueries(["mi-dispos"]);}});
  const addConsMut=useMutation({mutationFn:d=>mAPI.addConsult(d),onSuccess:()=>{toast.success("✅ Consultation enregistrée !");qc.invalidateQueries(["mi-rdvs-m"]);qc.invalidateQueries(["mi-stats"]);setShowConsult(false);setSelectedRdv(null);},onError:()=>toast.error("Erreur")});
  const updRdvMut=useMutation({mutationFn:({id,...d})=>mAPI.updRdv(id,d),onSuccess:()=>{toast.success("RDV mis à jour");qc.invalidateQueries(["mi-rdvs-m"]);}});
  const addRdvMut=useMutation({mutationFn:d=>api.post("/rendez-vous",d),onSuccess:()=>{toast.success("RDV ajouté !");qc.invalidateQueries(["mi-rdvs-m"]);setShowAddRdv(false);},onError:()=>toast.error("Erreur")});

  const navigMois=delta=>{let nm=mois+delta,na=annee;if(nm>12){nm=1;na++;}if(nm<1){nm=12;na--;}setMois(nm);setAnnee(na);};
  const HEURES=["07:00","08:00","09:00","10:00","11:00","14:00","15:00","16:00","17:00","18:00"];
  const cf=k=>e=>setCForm(p=>({...p,[k]:e.target.value}));

  return(
    <div>
      <PageHeader title="📅 Mon planning de disponibilités" subtitle={`${dispos.filter(d=>d.statut==="disponible").length} créneaux visibles sur rdv.mediconnect4africa.cloud`}
        actions={<><Btn onClick={()=>setShowAddDispo(true)}>+ Créneau dispo</Btn><Btn variant="outline" onClick={()=>setShowAddRdv(true)}>+ RDV direct</Btn></>}/>

      <div style={{background:"rgba(124,58,237,.07)",border:"1px solid rgba(124,58,237,.2)",borderRadius:10,padding:"10px 16px",marginBottom:20,fontSize:13,color:C.muted,display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:18}}>⭐</span>
        <span>En tant que médecin indépendant, vos créneaux sont visibles directement sur <strong style={{color:C.teal}}>rdv.mediconnect4africa.cloud</strong>. Les patients peuvent vous contacter et réserver sans passer par une clinique.</span>
      </div>

      <Grid cols={2} gap={20}>
        {/* Calendrier */}
        <div>
          <Panel>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
              <button onClick={()=>navigMois(-1)} style={{background:C.hover,border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 12px",cursor:"pointer",color:C.muted,fontFamily:"inherit",fontSize:16}}>‹</button>
              <div style={{fontSize:16,fontWeight:700,color:C.text}}>{MOIS_FR[mois-1]} {annee}</div>
              <button onClick={()=>navigMois(1)} style={{background:C.hover,border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 12px",cursor:"pointer",color:C.muted,fontFamily:"inherit",fontSize:16}}>›</button>
            </div>
            {ldD?<Loader/>:<Calendrier mois={mois} annee={annee} dispos={dispos} rdvs={rdvs} onDayClick={setSelectedDay} selectedDay={selectedDay}/>}
          </Panel>
          <Panel style={{marginTop:14}}>
            <Grid cols={3} gap={10}>
              {[["Libres",dispos.filter(d=>d.statut==="disponible").length,C.purple],["RDV prévus",rdvs.filter(r=>!["annule","termine"].includes(r.statut)).length,C.teal],["Terminés",rdvs.filter(r=>r.statut==="termine").length,C.green]].map(([l,v,c])=>(
                <div key={l} style={{textAlign:"center",padding:"10px 8px",background:C.hover,borderRadius:10}}>
                  <div style={{fontSize:22,fontWeight:900,color:c}}>{v}</div>
                  <div style={{fontSize:10,color:C.dim,marginTop:3}}>{l}</div>
                </div>
              ))}
            </Grid>
          </Panel>
        </div>

        {/* Créneaux du jour */}
        <div>
          <Panel title={`📋 ${new Date(selectedDay).toLocaleDateString("fr-CI",{weekday:"long",day:"numeric",month:"long"})}`}
            actions={<Btn style={{padding:"6px 14px",fontSize:12}} onClick={()=>setShowAddDispo(true)}>+ Créneau</Btn>}>
            {dayDispos.length===0&&dayRdvs.length===0&&<Empty icon="📅" title="Aucun créneau" subtitle="Cliquez sur + Créneau dispo pour publier vos disponibilités"/>}
            {dayDispos.length>0&&(
              <div style={{marginBottom:16}}>
                <div style={{fontSize:11,fontWeight:700,color:C.dim,textTransform:"uppercase",letterSpacing:".5px",marginBottom:10}}>Créneaux publiés — {dayDispos.length}</div>
                {dayDispos.map(d=>{
                  const rdvLie=rdvs.find(r=>r.date_rdv===d.date&&r.heure_rdv?.slice(0,5)===d.heure_debut?.slice(0,5)&&r.statut!=="annule");
                  return(
                    <div key={d.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:rdvLie?"rgba(217,119,6,.08)":"rgba(124,58,237,.06)",border:`1px solid ${rdvLie?"rgba(217,119,6,.25)":"rgba(124,58,237,.2)"}`,borderRadius:10,marginBottom:8}}>
                      <div style={{flex:1}}>
                        <div style={{fontSize:14,fontWeight:700,color:C.text}}>{d.heure_debut?.slice(0,5)} – {d.heure_fin?.slice(0,5)}</div>
                        {rdvLie?<div style={{fontSize:12,color:C.amber}}>👤 {rdvLie.patient_nom||"Patient"} · {rdvLie.motif||"RDV"}</div>:<div style={{fontSize:12,color:C.purple}}>✅ Visible sur rdv.mediconnect4africa.cloud</div>}
                      </div>
                      <Badge color={rdvLie?"amber":"purple"}>{rdvLie?"RDV":"Libre"}</Badge>
                      {!rdvLie&&<button onClick={()=>window.confirm("Supprimer ?")&&delDispoMut.mutate(d.id)} style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:16,padding:"2px 6px"}}>✕</button>}
                    </div>
                  );
                })}
              </div>
            )}
            {dayRdvs.length>0&&(
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.dim,textTransform:"uppercase",letterSpacing:".5px",marginBottom:10}}>RDV — {dayRdvs.length} patient(s)</div>
                {dayRdvs.map(r=>(
                  <div key={r.id} style={{background:C.hover,borderRadius:12,padding:14,marginBottom:10,border:`1.5px solid ${C.border}`,transition:"border-color .15s"}} onMouseOver={e=>e.currentTarget.style.borderColor=C.purple} onMouseOut={e=>e.currentTarget.style.borderColor=C.border}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                      <div style={{textAlign:"center",minWidth:48,background:C.input,borderRadius:8,padding:"5px 8px"}}>
                        <div style={{fontSize:14,fontWeight:800,color:C.text}}>{r.heure_rdv?.slice(0,5)||"—"}</div>
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:700,color:C.text}}>{r.patient_nom||"Patient"}</div>
                        <div style={{fontSize:11,color:C.muted}}>{r.motif||"Consultation"} {r.assurance&&`· 🛡️ ${r.assurance}`}</div>
                      </div>
                      <Badge color={{confirme:"green",en_attente:"amber",en_cours:"teal",termine:"gray"}[r.statut]||"gray"}>{r.statut}</Badge>
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      {r.statut==="en_attente"&&<Btn variant="outline" style={{flex:1,padding:"6px",fontSize:11,color:C.green}} onClick={()=>updRdvMut.mutate({id:r.id,statut:"confirme"})}>✓ Confirmer</Btn>}
                      {["confirme","en_attente","en_cours"].includes(r.statut)&&<Btn variant="purple" style={{flex:2,padding:"6px",fontSize:11}} onClick={()=>{setSelectedRdv(r);setShowConsult(true);}}>🩺 Consulter + Facturer</Btn>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* Ajout rapide */}
          <Panel title="⚡ Ajout rapide disponibilités" style={{marginTop:14}}>
            <div style={{fontSize:12,color:C.muted,marginBottom:12}}>Publiez sur rdv.mediconnect4africa.cloud pour le <strong style={{color:C.text}}>{new Date(selectedDay).toLocaleDateString("fr-CI",{day:"numeric",month:"short"})}</strong> :</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8}}>
              {HEURES.map(h=>{
                const exists=dayDispos.some(d=>d.heure_debut?.slice(0,5)===h);
                const hFin=`${String(+h.split(":")[0]+1).padStart(2,"0")}:00`;
                return(
                  <button key={h} onClick={()=>{if(exists){toast.error("Déjà existant");return;}addDispoMut.mutate({date:selectedDay,heure_debut:h,heure_fin:hFin,clinique_id:null});}}
                    style={{background:exists?"rgba(124,58,237,.2)":C.hover,border:`1px solid ${exists?C.purple:C.border}`,borderRadius:9,padding:"7px",cursor:exists?"not-allowed":"pointer",fontSize:11,fontWeight:700,color:exists?C.purple:C.text,fontFamily:"inherit"}}>
                    {exists?"✓":""} {h}
                  </button>
                );
              })}
            </div>
          </Panel>
        </div>
      </Grid>

      {/* Modal: Nouveau créneau */}
      <Modal open={showAddDispo} onClose={()=>setShowAddDispo(false)} title="📅 Publier un créneau de disponibilité">
        <div style={{background:"rgba(124,58,237,.07)",border:"1px solid rgba(124,58,237,.15)",borderRadius:10,padding:14,marginBottom:16,fontSize:13,color:C.muted}}>
          Date : <strong style={{color:C.text}}>{fmtDate(selectedDay)}</strong><br/>
          <span style={{fontSize:12}}>Ce créneau sera immédiatement visible sur <strong style={{color:C.teal}}>rdv.mediconnect4africa.cloud</strong></span>
        </div>
        <Grid cols={2} gap={12}>
          <Inp label="Heure début *" type="time" required value={newDispo.heure_debut} onChange={e=>setNewDispo(p=>({...p,heure_debut:e.target.value}))}/>
          <Inp label="Heure fin *" type="time" required value={newDispo.heure_fin} onChange={e=>setNewDispo(p=>({...p,heure_fin:e.target.value}))}/>
        </Grid>
        <div style={{display:"flex",gap:10}}>
          <Btn variant="outline" style={{flex:1}} onClick={()=>setShowAddDispo(false)}>Annuler</Btn>
          <Btn variant="purple" style={{flex:2}} loading={addDispoMut.isPending} onClick={()=>addDispoMut.mutate({...newDispo,date:selectedDay,clinique_id:null})}>Publier le créneau</Btn>
        </div>
      </Modal>

      {/* Modal: RDV direct (sans créneau publié) */}
      <Modal open={showAddRdv} onClose={()=>setShowAddRdv(false)} title="📅 Ajouter un RDV direct">
        <div style={{fontSize:13,color:C.muted,marginBottom:14}}>Date : <strong style={{color:C.text}}>{fmtDate(selectedDay)}</strong></div>
        <Inp label="Nom du patient *" required value={rdvForm.patient_nom} onChange={e=>setRdvForm(p=>({...p,patient_nom:e.target.value}))} placeholder="Koné Adjoua"/>
        <Grid cols={2} gap={12}>
          <Inp label="Heure *" type="time" required value={rdvForm.heure_rdv} onChange={e=>setRdvForm(p=>({...p,heure_rdv:e.target.value}))}/>
          <Inp label="Motif" value={rdvForm.motif} onChange={e=>setRdvForm(p=>({...p,motif:e.target.value}))} placeholder="Consultation, suivi…"/>
        </Grid>
        <div style={{display:"flex",gap:10}}>
          <Btn variant="outline" style={{flex:1}} onClick={()=>setShowAddRdv(false)}>Annuler</Btn>
          <Btn variant="purple" style={{flex:2}} loading={addRdvMut.isPending} onClick={()=>{if(!rdvForm.patient_nom){toast.error("Nom requis");return;}addRdvMut.mutate({...rdvForm,date_rdv:selectedDay,source:"medecin"});}}>Ajouter le RDV</Btn>
        </div>
      </Modal>

      {/* Modal: Consultation + Facturation */}
      <Modal open={showConsult} onClose={()=>{setShowConsult(false);setSelectedRdv(null);}} title={`🩺 Consultation & Facturation — ${selectedRdv?.patient_nom||"Patient"}`} width={580}>
        {selectedRdv&&<div style={{background:C.hover,borderRadius:10,padding:12,marginBottom:16,fontSize:13}}><span style={{color:C.muted}}>RDV : </span><strong style={{color:C.text}}>{fmtDate(selectedRdv.date_rdv)}</strong> à <strong style={{color:C.teal}}>{selectedRdv.heure_rdv?.slice(0,5)}</strong></div>}
        <Inp label="Diagnostic *" required value={cForm.diagnostic} onChange={cf("diagnostic")} placeholder="Ex: HTA, grippe, diabète…"/>
        <Inp label="Traitement" value={cForm.traitement} onChange={cf("traitement")} placeholder="Amlodipine 5mg…"/>
        <Grid cols={4} gap={10}>
          <Inp label="T.A." value={cForm.tension_arterielle} onChange={cf("tension_arterielle")} placeholder="120/80"/>
          <Inp label="Temp °C" type="number" value={cForm.temperature} onChange={cf("temperature")} placeholder="37.2"/>
          <Inp label="Poids kg" type="number" value={cForm.poids} onChange={cf("poids")} placeholder="70"/>
          <Inp label="Taille cm" type="number" value={cForm.taille} onChange={cf("taille")} placeholder="175"/>
        </Grid>
        <div style={{marginBottom:14}}>
          <label style={{display:"block",fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",marginBottom:5}}>Notes cliniques</label>
          <textarea value={cForm.notes} onChange={cf("notes")} rows={2} placeholder="Observations…" style={{width:"100%",background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:9,padding:"10px 14px",color:C.text,fontSize:14,resize:"none",outline:"none",fontFamily:"inherit",boxSizing:"border-box"}} onFocus={e=>e.target.style.borderColor=C.purple} onBlur={e=>e.target.style.borderColor=C.border}/>
        </div>
        <div style={{background:"rgba(10,143,88,.06)",border:"1px solid rgba(10,143,88,.15)",borderRadius:10,padding:14,marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:700,color:C.green,marginBottom:10}}>💊 Ordonnance (optionnel)</div>
          <Inp label="Médicaments" value={cForm.ord_medicaments} onChange={cf("ord_medicaments")} placeholder="Amoxicilline 500mg…"/>
          <Grid cols={2} gap={12}>
            <Inp label="Posologie" value={cForm.ord_posologie} onChange={cf("ord_posologie")} placeholder="2 cp/jour"/>
            <Inp label="Durée" value={cForm.ord_duree} onChange={cf("ord_duree")} placeholder="7 jours"/>
          </Grid>
        </div>
        {/* Facturation intégrée */}
        <div style={{background:"rgba(217,119,6,.06)",border:"1px solid rgba(217,119,6,.2)",borderRadius:10,padding:14,marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:700,color:C.amber,marginBottom:10}}>💰 Facturation — Médecin indépendant</div>
          <Inp label="Montant de la consultation (FCFA) *" required value={cForm.montant_consult} onChange={cf("montant_consult")} type="number" placeholder="15000"/>
          <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderTop:`1px solid ${C.border}`,marginTop:8,fontSize:13}}>
            <span style={{color:C.muted}}>Votre consultation</span>
            <strong style={{color:C.amber}}>{fmt(cForm.montant_consult||0)} F</strong>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:13}}>
            <span style={{color:C.muted}}>Part MediConnect (abonnement patient)</span>
            <span style={{color:C.green}}>{fmt(TARIF_ABONNEMENT)} F</span>
          </div>
        </div>
        <div style={{display:"flex",gap:10}}>
          <Btn variant="outline" style={{flex:1}} onClick={()=>{setShowConsult(false);setSelectedRdv(null);}}>Annuler</Btn>
          <Btn variant="purple" style={{flex:2}} loading={addConsMut.isPending} onClick={()=>{
            if(!cForm.diagnostic){toast.error("Diagnostic requis");return;}
            addConsMut.mutate({rdv_id:selectedRdv?.id,patient_id:selectedRdv?.patient_id,diagnostic:cForm.diagnostic,traitement:cForm.traitement||null,notes:cForm.notes||null,tension_arterielle:cForm.tension_arterielle||null,temperature:cForm.temperature||null,poids:cForm.poids||null,taille:cForm.taille||null,ordonnance:cForm.ord_medicaments?{medicaments:cForm.ord_medicaments,posologie:cForm.ord_posologie||null,duree:cForm.ord_duree||null}:null});
            if(cForm.montant_consult){
              mAPI.addFacture({patient_nom:selectedRdv?.patient_nom,patient_id:selectedRdv?.patient_id,montant:cForm.montant_consult,description:`Consultation — ${cForm.diagnostic}`,type_facture:"medecin",statut:"en_attente"}).catch(()=>{});
            }
          }}>✅ Enregistrer + Créer facture</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// FACTURATION — SPÉCIFIQUE MÉDECIN INDÉPENDANT
// ════════════════════════════════════════════════════════════════════
function PageFacturation(){
  const qc=useQueryClient();
  const [showAdd,setShowAdd]=useState(false);
  const [form,setForm]=useState({patient_nom:"",montant:"",motif:"",assurance:"",statut:"en_attente"});
  const {data,isLoading}=useQuery({queryKey:["mi-factures"],queryFn:()=>mAPI.factures().then(r=>r.data.data||[])});
  const factures=data||[];
  const payees=factures.filter(f=>f.statut==="payee");
  const impayees=factures.filter(f=>f.statut==="en_attente");
  const totalMois=payees.filter(f=>{const d=new Date(f.created_at),n=new Date();return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear();}).reduce((s,f)=>s+(+f.montant||0),0);
  const totalImpaye=impayees.reduce((s,f)=>s+(+f.montant||0),0);

  const addMut=useMutation({mutationFn:d=>mAPI.addFacture(d),onSuccess:()=>{toast.success("Facture créée !");qc.invalidateQueries(["mi-factures"]);setShowAdd(false);},onError:()=>toast.error("Erreur")});
  const updMut=useMutation({mutationFn:({id,statut})=>mAPI.updFacture(id,{statut}),onSuccess:()=>{toast.success("Facture mise à jour");qc.invalidateQueries(["mi-factures"]);}});

  const f=k=>e=>setForm(p=>({...p,[k]:e.target.value}));

  return(
    <div>
      <PageHeader title="💰 Ma facturation" subtitle="Revenus consultations · Médecin indépendant"
        actions={<Btn variant="amber" onClick={()=>setShowAdd(true)}>+ Créer facture</Btn>}/>

      <Grid cols={4} gap={14} style={{marginBottom:24}}>
        <Card label="Revenus ce mois" value={`${fmt(totalMois)} F`} icon="✅" color={C.green} sub={`${payees.length} payée(s)`}/>
        <Card label="À encaisser" value={`${fmt(totalImpaye)} F`} icon="⚠️" color={totalImpaye>0?C.amber:C.green} sub={`${impayees.length} impayée(s)`}/>
        <Card label="Total factures" value={factures.length} icon="📄" color={C.purple}/>
        <Card label="Abonnement MediConnect" value={`${fmt(TARIF_ABONNEMENT)} F/mois`} icon="💳" color={C.teal} sub="Déduit automatiquement"/>
      </Grid>

      {/* Info modèle économique */}
      <div style={{background:"rgba(217,119,6,.06)",border:"1px solid rgba(217,119,6,.2)",borderRadius:12,padding:16,marginBottom:20}}>
        <div style={{fontSize:13,fontWeight:700,color:C.amber,marginBottom:10}}>💡 Modèle de facturation médecin indépendant</div>
        <Grid cols={2} gap={14}>
          <div style={{background:C.hover,borderRadius:10,padding:14}}>
            <div style={{fontSize:12,fontWeight:700,color:C.amber,marginBottom:6}}>🩺 Votre facture consultation</div>
            <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>Vous fixez librement votre tarif. Envoyé directement au patient à chaque consultation. Payable en espèces, Wave ou Orange Money.</div>
          </div>
          <div style={{background:C.hover,borderRadius:10,padding:14}}>
            <div style={{fontSize:12,fontWeight:700,color:C.teal,marginBottom:6}}>💳 Facture MediConnect ({fmt(TARIF_ABONNEMENT)} F/mois)</div>
            <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>Frais d'abonnement mensuel facturés au patient par MediConnect pour l'accès au dossier médical et la prise de RDV.</div>
          </div>
        </Grid>
      </div>

      {isLoading?<Loader/>:(
        <Panel title={`Toutes les factures (${factures.length})`}>
          {factures.length===0?<Empty icon="💰" title="Aucune facture" subtitle="Créez votre première facture après une consultation"/>
            :factures.map(f=>(
              <div key={f.id} style={{display:"flex",alignItems:"flex-start",gap:14,padding:"14px 0",borderBottom:`1px solid ${C.border}`}}>
                <div style={{width:44,height:44,borderRadius:12,background:"rgba(217,119,6,.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>🩺</div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <div>
                      <div style={{fontSize:14,fontWeight:700,color:C.text}}>{f.patient_nom||"Patient"}</div>
                      <div style={{fontSize:11,color:C.muted}}>{fmtDate(f.created_at)} {f.reference&&`· ${f.reference}`}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:18,fontWeight:900,color:f.statut==="payee"?C.green:C.amber}}>{fmt(f.montant)} F</div>
                      <Badge color={f.statut==="payee"?"green":"amber"}>{f.statut==="payee"?"Payée":"Impayée"}</Badge>
                    </div>
                  </div>
                  {f.statut==="en_attente"&&(
                    <div style={{display:"flex",gap:8,marginTop:8}}>
                      <Btn variant="amber" style={{padding:"6px 14px",fontSize:12}} onClick={()=>updMut.mutate({id:f.id,statut:"payee"})}>✓ Marquer payée</Btn>
                      <Btn variant="outline" style={{padding:"6px 14px",fontSize:12}} onClick={()=>toast.success("PDF envoyé au patient !")}>📄 Envoyer PDF</Btn>
                    </div>
                  )}
                  {f.statut==="payee"&&<Btn variant="outline" style={{padding:"5px 12px",fontSize:11,marginTop:6}} onClick={()=>toast.success("Reçu téléchargé !")}>📄 Reçu</Btn>}
                </div>
              </div>
            ))
          }
        </Panel>
      )}

      <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="💰 Nouvelle facture">
        <Inp label="Nom du patient *" required value={form.patient_nom} onChange={f("patient_nom")} placeholder="Koné Adjoua"/>
        <Inp label="Montant (FCFA) *" required type="number" value={form.montant} onChange={f("montant")} placeholder="15000"/>
        <Inp label="Motif / Prestation" value={form.motif} onChange={f("motif")} placeholder="Consultation générale, suivi HTA…"/>
        <Sel label="Assurance" value={form.assurance} onChange={f("assurance")} options={[{v:"",l:"Sans assurance"},{v:"NSIA",l:"NSIA"},{v:"Allianz CI",l:"Allianz CI"},{v:"CNAM",l:"CNAM (CMU)"}]}/>
        <div style={{background:"rgba(217,119,6,.07)",border:"1px solid rgba(217,119,6,.15)",borderRadius:8,padding:12,marginBottom:14,fontSize:13}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{color:C.muted}}>Votre consultation</span><strong style={{color:C.amber}}>{fmt(form.montant||0)} FCFA</strong></div>
          <div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:C.muted}}>Abonnement MediConnect (patient)</span><span style={{color:C.green}}>{fmt(TARIF_ABONNEMENT)} FCFA</span></div>
        </div>
        <div style={{display:"flex",gap:10}}>
          <Btn variant="outline" style={{flex:1}} onClick={()=>setShowAdd(false)}>Annuler</Btn>
          <Btn variant="amber" style={{flex:2}} loading={addMut.isPending} onClick={()=>{if(!form.patient_nom||!form.montant){toast.error("Patient et montant requis");return;}addMut.mutate({...form,type_facture:"medecin"});}}>Créer la facture</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// MES PATIENTS — CLIENTÈLE PRIVÉE
// ════════════════════════════════════════════════════════════════════
function PagePatients(){
  const qc=useQueryClient();
  const [search,setSearch]=useState(""); const [selected,setSelected]=useState(null); const [activeTab,setActiveTab]=useState("infos");
  const [showAdd,setShowAdd]=useState(false); const [showOrd,setShowOrd]=useState(false);
  const [addForm,setAddForm]=useState({prenom:"",nom:"",telephone:"",email:"",groupe_sanguin:"",allergies:"",antecedents:""});
  const [ordForm,setOrdForm]=useState({medicaments:"",posologie:"",duree:"",notes_ord:""});

  const {data,isLoading}=useQuery({queryKey:["mi-patients"],queryFn:()=>mAPI.patients().then(r=>r.data.data||[])});
  const {data:consData}=useQuery({queryKey:["mi-consults-pat",selected?.id],queryFn:()=>selected?api.get(`/consultations?patient_id=${selected.id}`).then(r=>r.data.data||[]):[],enabled:!!selected});
  const {data:ordsData}=useQuery({queryKey:["mi-ords-pat",selected?.id],queryFn:()=>selected?api.get(`/ordonnances?patient_id=${selected.id}`).then(r=>r.data.data||[]):[],enabled:!!selected});
  const {data:factData}=useQuery({queryKey:["mi-facts-pat",selected?.id],queryFn:()=>selected?api.get(`/factures?patient_id=${selected.id}`).then(r=>r.data.data||[]):[],enabled:!!selected});

  const patients=(data||[]).filter(p=>!search||`${p.prenom} ${p.nom} ${p.telephone||""}`.toLowerCase().includes(search.toLowerCase()));

  const addPatMut=useMutation({mutationFn:d=>mAPI.addPatient(d),onSuccess:()=>{toast.success("Patient ajouté !");qc.invalidateQueries(["mi-patients"]);setShowAdd(false);}});
  const addOrdMut=useMutation({mutationFn:d=>mAPI.addOrd(d),onSuccess:()=>{toast.success("Ordonnance créée !");qc.invalidateQueries(["mi-ords-pat",selected?.id]);setShowOrd(false);}});

  const TABS=[{key:"infos",label:"Infos",icon:"👤"},{key:"consultations",label:"Consultations",icon:"🩺"},{key:"ordonnances",label:"Ordonnances",icon:"💊"},{key:"factures",label:"Factures",icon:"💰"}];
  const af=k=>e=>setAddForm(p=>({...p,[k]:e.target.value}));

  return(
    <div style={{display:"flex",gap:20,height:"calc(100vh - 140px)"}}>
      <div style={{width:280,flexShrink:0,display:"flex",flexDirection:"column",gap:10}}>
        <div style={{display:"flex",gap:8}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher…" style={{flex:1,background:C.input,border:`1px solid ${C.border}`,borderRadius:9,padding:"9px 12px",color:C.text,fontSize:13,outline:"none",fontFamily:"inherit"}} onFocus={e=>e.target.style.borderColor=C.purple} onBlur={e=>e.target.style.borderColor=C.border}/>
          <Btn variant="purple" style={{padding:"9px 12px",flexShrink:0}} onClick={()=>setShowAdd(true)}>+</Btn>
        </div>
        <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:6}}>
          {isLoading?<Loader/>:patients.length===0
            ?<Empty icon="👤" title="Aucun patient" subtitle="Ajoutez votre clientèle privée"/>
            :patients.map(p=>(
              <button key={p.id} onClick={()=>{setSelected(p);setActiveTab("infos");}} style={{background:selected?.id===p.id?C.input:C.card,border:`1.5px solid ${selected?.id===p.id?C.purple:C.border}`,borderRadius:12,padding:"12px 14px",cursor:"pointer",textAlign:"left",fontFamily:"inherit",transition:"all .15s"}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <Avatar prenom={p.prenom} nom={p.nom} size={36} fontSize={13}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:700,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.prenom} {p.nom}</div>
                    <div style={{fontSize:11,color:C.muted}}>{p.telephone||"—"}</div>
                  </div>
                  {p.groupe_sanguin&&<span style={{fontSize:10,fontWeight:700,color:C.red,background:"rgba(225,29,72,.1)",padding:"2px 6px",borderRadius:6}}>{p.groupe_sanguin}</span>}
                </div>
              </button>
            ))
          }
        </div>
      </div>

      <div style={{flex:1,display:"flex",flexDirection:"column",gap:14,overflowY:"auto"}}>
        {!selected?<Empty icon="👤" title="Sélectionnez un patient" subtitle="Votre clientèle privée"/>
          :<>
            <Panel>
              <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:14}}>
                <Avatar prenom={selected.prenom} nom={selected.nom} size={52} fontSize={18}/>
                <div style={{flex:1}}>
                  <h2 style={{margin:0,fontSize:17,fontWeight:800,color:C.text}}>{selected.prenom} {selected.nom}</h2>
                  <div style={{fontSize:12,color:C.muted}}>{selected.telephone||""} {selected.email&&`· ${selected.email}`}</div>
                </div>
                {selected.groupe_sanguin&&<Badge color="red">{selected.groupe_sanguin}</Badge>}
              </div>
              {selected.allergies&&<div style={{background:"rgba(225,29,72,.08)",border:"1px solid rgba(225,29,72,.2)",borderRadius:8,padding:"7px 12px",fontSize:12,color:C.red,marginBottom:8}}>⚠️ {selected.allergies}</div>}
              {selected.antecedents&&<div style={{background:"rgba(37,99,235,.08)",border:"1px solid rgba(37,99,235,.2)",borderRadius:8,padding:"7px 12px",fontSize:12,color:C.blue}}>📋 {selected.antecedents}</div>}
              <div style={{display:"flex",gap:10,marginTop:12}}>
                <Btn variant="purple" style={{flex:1,padding:"8px",fontSize:12}} onClick={()=>nav?.("planning")}>🩺 RDV + Consult.</Btn>
                <Btn variant="outline" style={{flex:1,padding:"8px",fontSize:12}} onClick={()=>setShowOrd(true)}>💊 Ordonnance</Btn>
              </div>
            </Panel>
            <div style={{display:"flex",gap:4,background:C.input,borderRadius:10,padding:4}}>
              {TABS.map(t=><button key={t.key} onClick={()=>setActiveTab(t.key)} style={{flex:1,background:activeTab===t.key?C.hover:"transparent",border:"none",borderRadius:8,padding:"8px",cursor:"pointer",fontFamily:"inherit",color:activeTab===t.key?C.text:C.muted,fontSize:12,fontWeight:activeTab===t.key?700:400}}>{t.icon} {t.label}</button>)}
            </div>
            {activeTab==="infos"&&(
              <Panel title="Informations">
                <Grid cols={2} gap={10}>
                  {[["Prénom",selected.prenom],["Nom",selected.nom],["Téléphone",selected.telephone],["Email",selected.email],["Groupe sanguin",selected.groupe_sanguin],["Allergies",selected.allergies],["Antécédents",selected.antecedents]].map(([k,v])=>(
                    <div key={k} style={{background:C.hover,borderRadius:8,padding:"9px 12px"}}>
                      <div style={{fontSize:10,color:C.dim,fontWeight:700,textTransform:"uppercase",marginBottom:2}}>{k}</div>
                      <div style={{fontSize:13,color:C.text,fontWeight:600}}>{v||"—"}</div>
                    </div>
                  ))}
                </Grid>
              </Panel>
            )}
            {activeTab==="consultations"&&(
              <Panel title="Historique consultations">
                {(consData||[]).length===0?<Empty icon="🩺" title="Aucune consultation"/>
                  :(consData||[]).map(c=>(
                    <div key={c.id} style={{background:C.hover,borderRadius:10,padding:14,marginBottom:10}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:12,fontWeight:700,color:C.teal}}>{fmtDate(c.created_at)}</span><Badge color="teal">Complétée</Badge></div>
                      <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:4}}>Diagnostic : {c.diagnostic||"—"}</div>
                      {c.traitement&&<div style={{fontSize:12,color:C.muted}}>Traitement : {c.traitement}</div>}
                    </div>
                  ))
                }
              </Panel>
            )}
            {activeTab==="ordonnances"&&(
              <Panel title="Ordonnances" actions={<Btn style={{padding:"6px 14px",fontSize:12}} onClick={()=>setShowOrd(true)}>+ Ordonnance</Btn>}>
                {(ordsData||[]).length===0?<Empty icon="💊" title="Aucune ordonnance"/>
                  :(ordsData||[]).map(o=>(
                    <div key={o.id} style={{background:C.hover,borderRadius:10,padding:14,marginBottom:10}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:12,color:C.teal}}>{fmtDate(o.created_at)}</span><Badge color={o.statut==="active"?"green":"gray"}>{o.statut==="active"?"Active":"Terminée"}</Badge></div>
                      <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:4}}>{o.medicaments||"—"}</div>
                      {o.posologie&&<div style={{fontSize:12,color:C.muted}}>Posologie : {o.posologie}</div>}
                      {o.duree&&<div style={{fontSize:12,color:C.muted}}>Durée : {o.duree}</div>}
                    </div>
                  ))
                }
              </Panel>
            )}
            {activeTab==="factures"&&(
              <Panel title="Factures de ce patient">
                {(factData||[]).length===0?<Empty icon="💰" title="Aucune facture"/>
                  :(factData||[]).map(f=>(
                    <div key={f.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
                      <div><div style={{fontSize:13,fontWeight:700,color:C.text}}>{fmtDate(f.created_at)}</div><div style={{fontSize:11,color:C.muted}}>{f.motif||"Consultation"}</div></div>
                      <div style={{textAlign:"right"}}><div style={{fontSize:15,fontWeight:800,color:f.statut==="payee"?C.green:C.amber}}>{fmt(f.montant)} F</div><Badge color={f.statut==="payee"?"green":"amber"}>{f.statut==="payee"?"Payée":"Impayée"}</Badge></div>
                    </div>
                  ))
                }
              </Panel>
            )}
          </>
        }
      </div>

      {/* Modal: Nouveau patient */}
      <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="👤 Ajouter un patient à ma clientèle">
        <Grid cols={2} gap={12}>
          <Inp label="Prénom *" required value={addForm.prenom} onChange={af("prenom")} placeholder="Adjoua"/>
          <Inp label="Nom *" required value={addForm.nom} onChange={af("nom")} placeholder="Koné"/>
          <Inp label="Téléphone" value={addForm.telephone} onChange={af("telephone")} placeholder="+225 07 00 00 00 00" type="tel"/>
          <Sel label="Groupe sanguin" value={addForm.groupe_sanguin} onChange={af("groupe_sanguin")} options={["","A+","A-","B+","B-","AB+","AB-","O+","O-"]}/>
        </Grid>
        <Inp label="Allergies" value={addForm.allergies} onChange={af("allergies")} placeholder="Pénicilline, Aspirine…"/>
        <Inp label="Antécédents" value={addForm.antecedents} onChange={af("antecedents")} placeholder="Diabète, HTA…"/>
        <div style={{display:"flex",gap:10}}>
          <Btn variant="outline" style={{flex:1}} onClick={()=>setShowAdd(false)}>Annuler</Btn>
          <Btn variant="purple" style={{flex:2}} loading={addPatMut.isPending} onClick={()=>{if(!addForm.prenom||!addForm.nom){toast.error("Prénom et nom requis");return;}addPatMut.mutate(addForm);}}>Ajouter le patient</Btn>
        </div>
      </Modal>

      {/* Modal: Ordonnance */}
      <Modal open={showOrd} onClose={()=>setShowOrd(false)} title={`💊 Ordonnance — ${selected?.prenom} ${selected?.nom}`}>
        <Inp label="Médicaments *" required value={ordForm.medicaments} onChange={e=>setOrdForm(p=>({...p,medicaments:e.target.value}))} placeholder="Amoxicilline 500mg…"/>
        <Grid cols={2} gap={12}>
          <Inp label="Posologie" value={ordForm.posologie} onChange={e=>setOrdForm(p=>({...p,posologie:e.target.value}))} placeholder="2 cp/jour"/>
          <Inp label="Durée" value={ordForm.duree} onChange={e=>setOrdForm(p=>({...p,duree:e.target.value}))} placeholder="7 jours"/>
        </Grid>
        <Inp label="Notes" value={ordForm.notes_ord} onChange={e=>setOrdForm(p=>({...p,notes_ord:e.target.value}))} placeholder="À prendre pendant les repas…"/>
        <div style={{display:"flex",gap:10}}>
          <Btn variant="outline" style={{flex:1}} onClick={()=>setShowOrd(false)}>Annuler</Btn>
          <Btn variant="purple" style={{flex:2}} loading={addOrdMut.isPending} onClick={()=>{if(!ordForm.medicaments){toast.error("Médicaments requis");return;}addOrdMut.mutate({...ordForm,patient_id:selected?.id});}}>Créer l'ordonnance</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// STATISTIQUES — REVENUS + ACTIVITÉ
// ════════════════════════════════════════════════════════════════════
function PageStats(){
  const {data:statsData}=useQuery({queryKey:["mi-stats"],queryFn:()=>mAPI.stats().then(r=>r.data.data||{}),retry:1});
  const {data:consData}=useQuery({queryKey:["mi-consults"],queryFn:()=>mAPI.consultations().then(r=>r.data.data||[])});
  const {data:factData}=useQuery({queryKey:["mi-factures"],queryFn:()=>mAPI.factures().then(r=>r.data.data||[])});
  const {data:rdvData}=useQuery({queryKey:["mi-all-rdvs"],queryFn:()=>mAPI.rdvs({}).then(r=>r.data.data||[])});

  const stats=statsData||{}; const consults=consData||[]; const factures=factData||[]; const rdvs=rdvData||[];
  const MOIS=MOIS_FR.map(m=>m.slice(0,3));

  const revenusParMois=MOIS.map((_,i)=>factures.filter(f=>{const d=new Date(f.created_at);return d.getMonth()===i&&d.getFullYear()===new Date().getFullYear()&&f.statut==="payee";}).reduce((s,f)=>s+(+f.montant||0),0));
  const maxRev=Math.max(...revenusParMois,1);

  const consParMois=MOIS.map((_,i)=>consults.filter(c=>{const d=new Date(c.created_at);return d.getMonth()===i&&d.getFullYear()===new Date().getFullYear();}).length);

  const totalAnnee=revenusParMois.reduce((s,v)=>s+v,0);
  const tauxRecouvrement=factures.length>0?Math.round(factures.filter(f=>f.statut==="payee").length/factures.length*100):0;
  const tauxHonore=rdvs.length>0?Math.round(rdvs.filter(r=>r.statut==="termine").length/rdvs.length*100):0;

  const ProgressBar=({value,max=100,color=C.purple})=>(
    <div style={{background:C.hover,borderRadius:4,height:5}}><div style={{width:`${Math.min(100,Math.round(value/Math.max(max,1)*100))}%`,height:"100%",background:color,borderRadius:4,transition:"width .4s"}}/></div>
  );

  return(
    <div>
      <PageHeader title="📊 Statistiques & Revenus" subtitle="Performance activité libérale"/>
      <Grid cols={4} gap={14} style={{marginBottom:24}}>
        <Card label="RDV aujourd'hui" value={stats.rdv_aujourd_hui||0} icon="📅" color={C.teal}/>
        <Card label="Revenus année" value={`${fmt(totalAnnee)} F`} icon="💰" color={C.green}/>
        <Card label="Taux recouvrement" value={`${tauxRecouvrement}%`} icon="✅" color={tauxRecouvrement>=80?C.green:C.amber}/>
        <Card label="Consultations" value={stats.consultations_total||0} icon="🩺" color={C.purple}/>
      </Grid>
      <Grid cols={2} gap={20}>
        {/* Revenus par mois */}
        <Panel title="💰 Revenus mensuels (année en cours)">
          <div style={{display:"flex",alignItems:"flex-end",gap:5,height:140,paddingTop:10}}>
            {revenusParMois.map((v,i)=>{
              const h=Math.round((v/maxRev)*100),isCur=i===new Date().getMonth();
              return(
                <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                  {v>0&&<div style={{fontSize:9,color:isCur?C.green:C.dim,fontWeight:700}}>{Math.round(v/1000)}k</div>}
                  <div style={{width:"100%",height:`${Math.max(h,4)}%`,background:isCur?`linear-gradient(to top,${C.purple},${C.blue})`:"rgba(124,58,237,.25)",borderRadius:"3px 3px 0 0"}}/>
                  <div style={{fontSize:8,color:C.dim}}>{MOIS[i]}</div>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* KPIs libéral */}
        <Panel title="🎯 Indicateurs activité libérale">
          {[{l:"RDV honorés",v:tauxHonore,c:tauxHonore>=70?C.green:C.amber},{l:"Factures recouvrées",v:tauxRecouvrement,c:tauxRecouvrement>=80?C.green:C.amber},{l:"Créneaux utilisés",v:rdvs.length>0?Math.round(rdvs.filter(r=>r.statut!=="annule").length/Math.max(rdvs.length,1)*100):0,c:C.teal}].map(k=>(
            <div key={k.l} style={{marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:5,fontSize:13}}><span style={{color:C.muted}}>{k.l}</span><span style={{fontWeight:700,color:k.c}}>{k.v}%</span></div>
              <ProgressBar value={k.v} max={100} color={k.c}/>
            </div>
          ))}
          <div style={{borderTop:`1px solid ${C.border}`,paddingTop:14,marginTop:4}}>
            <div style={{fontSize:11,fontWeight:700,color:C.dim,textTransform:"uppercase",marginBottom:10}}>Finances</div>
            {[["Abonnement MediConnect/mois",`${fmt(TARIF_ABONNEMENT)} F`,C.teal],["Revenus ce mois",`${fmt(revenusParMois[new Date().getMonth()])} F`,C.green],["Total année",`${fmt(totalAnnee)} F`,C.purple]].map(([l,v,c])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${C.border}`,fontSize:13}}>
                <span style={{color:C.muted}}>{l}</span>
                <strong style={{color:c}}>{v}</strong>
              </div>
            ))}
          </div>
        </Panel>

        {/* Activité récente */}
        <Panel title="📋 Activité récente" style={{gridColumn:"1/-1"}}>
          {consults.length===0?<Empty icon="📋" title="Aucune activité récente"/>
            :consults.slice(0,6).map(c=>(
              <div key={c.id} style={{display:"flex",alignItems:"center",gap:14,padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:C.purple,flexShrink:0}}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:C.text}}>Consultation — {c.diagnostic?.slice(0,50)||"—"}</div>
                  <div style={{fontSize:11,color:C.muted}}>{fmtDate(c.created_at)}</div>
                </div>
                <Badge color="purple">Complétée</Badge>
              </div>
            ))
          }
        </Panel>
      </Grid>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// ROUTER MÉDECIN INDÉPENDANT
// ════════════════════════════════════════════════════════════════════
export default function Dashboard(){
  return(
    <Routes>
      <Route index                element={<PageHome/>}/>
      <Route path="planning"      element={<PagePlanning/>}/>
      <Route path="rdvs"          element={<PageRdvPatients/>}/>
      <Route path="patients"      element={<PagePatients/>}/>
      <Route path="facturation"   element={<PageFacturation/>}/>
      <Route path="consultations" element={<PageConsultations/>}/>
      <Route path="ordonnances"   element={<PageOrdonnances/>}/>
      <Route path="stats"         element={<PageStats/>}/>
      <Route path="*"             element={<PageHome/>}/>
    </Routes>
  );
}

// ── Stubs pour les pages simples ──────────────────────────────────
function PageConsultations(){
  const {data,isLoading}=useQuery({queryKey:["mi-consults"],queryFn:()=>mAPI.consultations().then(r=>r.data.data||[])});
  const consults=data||[];
  return(
    <div>
      <PageHeader title="🩺 Mes consultations" subtitle={`${consults.length} consultation(s)`}/>
      {isLoading?<Loader/>:consults.length===0?<Empty icon="🩺" title="Aucune consultation" subtitle="Vos consultations apparaîtront ici"/>
        :consults.map(c=>(
          <div key={c.id} style={{background:C.input,border:`1.5px solid ${C.border}`,borderRadius:14,padding:20,marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><div><div style={{fontSize:15,fontWeight:700,color:C.text}}>Consultation du {fmtDate(c.created_at)}</div></div><Badge color="purple">Complétée</Badge></div>
            <div style={{background:C.hover,borderRadius:10,padding:14,marginBottom:10}}><div style={{fontSize:11,fontWeight:700,color:C.dim,textTransform:"uppercase",marginBottom:6}}>Diagnostic</div><div style={{fontSize:14,color:C.text,fontWeight:600}}>{c.diagnostic||"—"}</div></div>
            {c.traitement&&<div style={{fontSize:13,color:C.muted}}>Traitement : {c.traitement}</div>}
          </div>
        ))
      }
    </div>
  );
}
function PageOrdonnances(){
  const {data,isLoading}=useQuery({queryKey:["mi-ords"],queryFn:()=>api.get("/ordonnances").then(r=>({data:{data:r.data||[]}})).then(r=>r.data.data||[])});
  const ords=data||[];
  return(
    <div>
      <PageHeader title="💊 Mes ordonnances" subtitle={`${ords.filter(o=>o.statut==="active").length} active(s)`}/>
      {isLoading?<Loader/>:ords.length===0?<Empty icon="💊" title="Aucune ordonnance" subtitle="Créez des ordonnances depuis la fiche patient"/>
        :ords.map(o=>(
          <div key={o.id} style={{background:C.input,border:`1.5px solid ${o.statut==="active"?"rgba(124,58,237,.3)":C.border}`,borderRadius:14,padding:20,marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:10,paddingBottom:10,borderBottom:`1px solid ${C.border}`}}><div style={{fontSize:12,color:C.dim}}>{fmtDate(o.created_at)}</div><Badge color={o.statut==="active"?"purple":"gray"}>{o.statut==="active"?"Active":"Terminée"}</Badge></div>
            <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:6}}>{o.medicaments||"—"}</div>
            {o.posologie&&<div style={{fontSize:12,color:C.muted,marginBottom:3}}>📋 {o.posologie}</div>}
            {o.duree&&<div style={{fontSize:12,color:C.muted}}>⏱️ {o.duree}</div>}
          </div>
        ))
      }
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PAGE RDV PATIENTS — Liste complète des RDV reçus
// ═══════════════════════════════════════════════════════════════════
function PageRdvPatients(){
  const qc = useQueryClient();
  const [tab, setTab] = useState('upcoming');
  const [selected, setSelected] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['mi-all-rdvs-page'],
    queryFn: () => mAPI.rdvs({}).then(r => r.data.data || []),
    staleTime: 0,
  });
  const rdvs = data || [];

  const today = () => new Date().toISOString().split('T')[0];
  const upcoming = rdvs.filter(r => r.date_rdv?.slice(0,10) >= today() && r.statut !== 'annule').sort((a,b)=>a.date_rdv>b.date_rdv?1:-1);
  const past     = rdvs.filter(r => r.date_rdv?.slice(0,10) < today() || r.statut === 'termine' || r.statut === 'annule').sort((a,b)=>a.date_rdv<b.date_rdv?1:-1);

  const updMut = useMutation({
    mutationFn: ({id, statut}) => mAPI.updRdv(id, {statut}),
    onSuccess: () => { toast.success('✅ Statut mis à jour'); qc.invalidateQueries(['mi-all-rdvs-page']); qc.invalidateQueries(['mi-rdvs-m']); setSelected(null); },
    onError: () => toast.error('Erreur'),
  });

  const statutColor = s => ({ en_attente:'amber', confirme:'teal', en_cours:'blue', termine:'green', annule:'red' }[s] || 'gray');
  const statutLabel = s => ({ en_attente:'En attente', confirme:'Confirmé', en_cours:'En cours', termine:'Terminé', annule:'Annulé' }[s] || s);

  const RdvCard = ({ r }) => (
    <div onClick={() => setSelected(r)}
      style={{ background:C.input, border:`1.5px solid ${C.border}`, borderRadius:12, padding:16, cursor:'pointer', marginBottom:10, transition:'border-color .15s' }}
      onMouseOver={e=>e.currentTarget.style.borderColor=C.purple}
      onMouseOut={e=>e.currentTarget.style.borderColor=C.border}>
      <div style={{ display:'flex', alignItems:'center', gap:14 }}>
        {/* Date */}
        <div style={{ background:`linear-gradient(135deg,${C.purple},${C.teal})`, borderRadius:10, padding:'8px 12px', textAlign:'center', minWidth:52, flexShrink:0 }}>
          <div style={{ fontSize:20, fontWeight:900, color:'#fff', lineHeight:1 }}>{new Date(r.date_rdv).getDate()}</div>
          <div style={{ fontSize:9, color:'rgba(255,255,255,.8)', textTransform:'uppercase' }}>{new Date(r.date_rdv).toLocaleDateString('fr-CI',{month:'short'})}</div>
        </div>
        {/* Info */}
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
            <span style={{ fontSize:14, fontWeight:700, color:C.text }}>{r.patient_nom || r.patient_nom_complet || 'Patient'}</span>
            <Badge color={statutColor(r.statut)}>{statutLabel(r.statut)}</Badge>
          </div>
          <div style={{ fontSize:12, color:C.muted }}>
            🕐 {r.heure_rdv?.slice(0,5)} · {r.motif || '—'}
            {r.assurance && <span style={{ color:C.teal }}> · 🛡️ {r.assurance}</span>}
          </div>
          {r.patient_tel && <div style={{ fontSize:11, color:C.dim, marginTop:2 }}>📞 {r.patient_tel}</div>}
        </div>
        <span style={{ color:C.dim, fontSize:18 }}>→</span>
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader title="📅 Mes RDV Patients" subtitle={`${upcoming.length} à venir · ${past.length} passés`}/>

      {/* Résumé stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        {[
          ['Total',rdvs.length,C.purple],
          ['En attente',rdvs.filter(r=>r.statut==='en_attente').length,C.amber],
          ['Confirmés',rdvs.filter(r=>r.statut==='confirme').length,C.teal],
          ['Terminés',rdvs.filter(r=>r.statut==='termine').length,C.green],
        ].map(([label,val,color])=>(
          <div key={label} style={{ background:C.input, border:`1.5px solid ${C.border}`, borderRadius:12, padding:'14px 12px', textAlign:'center' }}>
            <div style={{ fontSize:24, fontWeight:900, color }}>{val}</div>
            <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Onglets */}
      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        {[['upcoming','📅 À venir',upcoming.length],['past','📋 Passés',past.length]].map(([key,label,count])=>(
          <button key={key} onClick={()=>setTab(key)}
            style={{ padding:'8px 18px', borderRadius:99, fontSize:13, fontWeight:700, cursor:'pointer', border:'none',
              background: tab===key ? `linear-gradient(135deg,${C.purple},${C.teal})` : 'rgba(255,255,255,.06)',
              color: tab===key ? '#fff' : C.muted }}>
            {label} ({count})
          </button>
        ))}
      </div>

      {isLoading ? <Loader/> :
        (tab === 'upcoming' ? upcoming : past).length === 0 ?
          <Empty icon="📅" title={tab==='upcoming'?'Aucun RDV à venir':'Aucun RDV passé'} subtitle="Les RDV pris par les patients apparaîtront ici"/> :
          (tab === 'upcoming' ? upcoming : past).map(r => <RdvCard key={r.id} r={r}/>)
      }

      {/* Modal détail + actions */}
      {selected && (
        <div onClick={()=>setSelected(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:28, width:500, maxWidth:'95vw', maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h2 style={{ fontSize:17, fontWeight:700, color:C.text, margin:0 }}>📅 RDV — {selected.reference}</h2>
              <button onClick={()=>setSelected(null)} style={{ background:'none', border:'none', color:C.muted, cursor:'pointer', fontSize:20 }}>✕</button>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
              {[
                ['Patient', selected.patient_nom || selected.patient_nom_complet || '—'],
                ['Téléphone', selected.patient_tel || '—'],
                ['Date', new Date(selected.date_rdv).toLocaleDateString('fr-CI',{weekday:'long',day:'numeric',month:'long'})],
                ['Heure', selected.heure_rdv?.slice(0,5) || '—'],
                ['Motif', selected.motif || '—'],
                ['Statut', statutLabel(selected.statut)],
                ['Assurance', selected.assurance || 'Sans assurance'],
                ['Source', selected.source || '—'],
              ].map(([k,v])=>(
                <div key={k} style={{ background:C.hover, borderRadius:8, padding:'9px 12px' }}>
                  <div style={{ fontSize:10, color:C.dim, fontWeight:700, textTransform:'uppercase', marginBottom:2 }}>{k}</div>
                  <div style={{ fontSize:13, color:C.text, fontWeight:600 }}>{v}</div>
                </div>
              ))}
            </div>

            {/* Actions */}
            {selected.statut === 'en_attente' && (
              <div style={{ display:'flex', gap:10, marginTop:8 }}>
                <button onClick={()=>setSelected(null)} style={{ flex:1, padding:'9px', borderRadius:9, background:'transparent', border:`1.5px solid ${C.border}`, color:C.muted, cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:'inherit' }}>Fermer</button>
                <button onClick={()=>updMut.mutate({id:selected.id, statut:'confirme'})}
                  style={{ flex:2, padding:'9px', borderRadius:9, background:`linear-gradient(135deg,${C.green},${C.teal})`, border:'none', color:'#fff', cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:'inherit' }}>
                  ✅ Confirmer le RDV
                </button>
                <button onClick={()=>updMut.mutate({id:selected.id, statut:'annule'})}
                  style={{ flex:1, padding:'9px', borderRadius:9, background:'rgba(225,29,72,.1)', border:'1.5px solid rgba(225,29,72,.25)', color:C.red, cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:'inherit' }}>
                  ✕ Annuler
                </button>
              </div>
            )}
            {selected.statut === 'confirme' && (
              <div style={{ display:'flex', gap:10, marginTop:8 }}>
                <button onClick={()=>setSelected(null)} style={{ flex:1, padding:'9px', borderRadius:9, background:'transparent', border:`1.5px solid ${C.border}`, color:C.muted, cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:'inherit' }}>Fermer</button>
                <button onClick={()=>updMut.mutate({id:selected.id, statut:'en_cours'})}
                  style={{ flex:2, padding:'9px', borderRadius:9, background:`linear-gradient(135deg,${C.blue},${C.teal})`, border:'none', color:'#fff', cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:'inherit' }}>
                  🩺 Démarrer consultation
                </button>
              </div>
            )}
            {!['en_attente','confirme'].includes(selected.statut) && (
              <button onClick={()=>setSelected(null)} style={{ width:'100%', padding:'9px', borderRadius:9, background:'transparent', border:`1.5px solid ${C.border}`, color:C.muted, cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:'inherit', marginTop:8 }}>Fermer</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
