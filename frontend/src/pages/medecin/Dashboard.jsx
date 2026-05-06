import React, { useState, useMemo } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import useAuthStore from "../../context/authStore";
import api from "../../services/api";

const C={green:"#0A8F58",teal:"#0D9488",amber:"#D97706",red:"#E11D48",blue:"#2563EB",purple:"#7C3AED",bg:"#060C12",card:"#0E1620",input:"#141E2B",hover:"#1A2535",border:"#1E2F42",text:"#F0F4F8",muted:"#8BA0B5",dim:"#4E657A"};
const fmt=n=>Number(n||0).toLocaleString("fr-CI");
const fmtDate=d=>d?new Date(d).toLocaleDateString("fr-CI",{day:"numeric",month:"long",year:"numeric"}):"—";
const today=()=>new Date().toISOString().split("T")[0];
const MOIS_FR=["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const JOURS_FR=["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];

const mAPI={
  stats:()=>api.get("/planning/stats"),
  dispos:p=>api.get("/planning/disponibilites",{params:p}),
  addDispo:d=>api.post("/planning/disponibilites",d),
  delDispo:id=>api.delete(`/planning/disponibilites/${id}`),
  cliniques:()=>api.get("/planning/mes-cliniques"),
  patients:()=>api.get("/planning/mes-patients"),
  rdvs:p=>api.get("/planning/rdvs",{params:p}),
  consultations:()=>api.get("/consultations"),
  addConsult:d=>api.post("/consultations/depuis-rdv",d),
  addOrd:d=>api.post("/ordonnances",d),
  updRdv:(id,d)=>api.put(`/rendez-vous/${id}`,d),
};

const Btn=({children,onClick,variant="primary",loading,disabled,style:s={},type="button"})=>{
  const v={primary:{background:`linear-gradient(135deg,${C.green},${C.teal})`,color:"#fff",border:"none"},outline:{background:"transparent",color:C.muted,border:`1.5px solid ${C.border}`},danger:{background:"rgba(225,29,72,.1)",color:C.red,border:"1.5px solid rgba(225,29,72,.25)"},amber:{background:C.amber,color:"#fff",border:"none"},teal:{background:C.teal,color:"#fff",border:"none"}};
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
const Card=({label,value,icon,color=C.green,sub,onClick})=>(
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
    <input type={type} value={value||""} onChange={onChange} placeholder={placeholder} required={required} style={{width:"100%",background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:9,padding:"10px 14px",color:C.text,fontSize:14,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}} onFocus={e=>e.target.style.borderColor=C.green} onBlur={e=>e.target.style.borderColor=C.border}/>
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
  <div style={{width:size,height:size,borderRadius:"50%",background:`linear-gradient(135deg,${C.purple},${C.teal})`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,color:"#fff",fontSize,flexShrink:0}}>
    {(prenom||"?")[0]}{(nom||"")[0]}
  </div>
);
const ProgressBar=({value,max=100,color=C.green})=>(
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
          const isToday=ds===todayStr,isSel=ds===selectedDay,isPast=ds<todayStr;
          const dd=disposByDate[ds]||[],dr=rdvsByDate[ds]||[];
          return(
            <button key={day} onClick={()=>onDayClick(ds)}
              style={{aspectRatio:"1",background:isSel?C.green:isToday?"rgba(10,143,88,.2)":dd.length?"rgba(13,148,136,.1)":C.hover,border:`2px solid ${isSel?C.green:isToday?C.green:dd.length?C.teal:C.border}`,borderRadius:10,cursor:"pointer",fontFamily:"inherit",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,padding:2,opacity:isPast?.6:1,transition:"all .15s"}}
              onMouseOver={e=>{if(!isSel)e.currentTarget.style.borderColor=C.green;}}
              onMouseOut={e=>{if(!isSel)e.currentTarget.style.borderColor=isToday?C.green:dd.length?C.teal:C.border;}}>
              <span style={{fontSize:13,fontWeight:isToday||isSel?800:500,color:isSel?"#fff":isToday?C.green:C.text}}>{day}</span>
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
        <span style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:8,height:8,borderRadius:"50%",background:C.green}}/> Aujourd'hui</span>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// HOME MÉDECIN
// ════════════════════════════════════════════════════════════════════
function PageHome(){
  const {user}=useAuthStore(); const nav=useNavigate();
  const {data:statsData}=useQuery({queryKey:["med-stats"],queryFn:()=>mAPI.stats().then(r=>r.data.data||{}),retry:1});
  const {data:rdvData}=useQuery({queryKey:["med-rdvs-today"],queryFn:()=>mAPI.rdvs({date:today()}).then(r=>r.data.data||[]),retry:1});
  const {data:clinData}=useQuery({queryKey:["med-cliniques"],queryFn:()=>mAPI.cliniques().then(r=>r.data.data||[]),retry:1});
  const stats=statsData||{}; const rdvs=rdvData||[]; const cliniques=clinData||[];
  const modules=[
    {icon:"📅",label:"Mon planning",path:"planning",color:C.teal,desc:`${stats.creneaux_disponibles||0} créneaux libres`},
    {icon:"👤",label:"Mes patients",path:"patients",color:C.blue,desc:"Dossiers médicaux"},
    {icon:"🩺",label:"Consultations",path:"consultations",color:C.green,desc:`${stats.consultations_total||0} au total`},
    {icon:"💊",label:"Ordonnances",path:"ordonnances",color:C.purple,desc:"Prescriptions"},
    {icon:"📊",label:"Statistiques",path:"stats",color:C.amber,desc:"Performance & analyses"},
  ];
  return(
    <div>
      <div style={{background:"linear-gradient(135deg,rgba(124,58,237,.12),rgba(13,148,136,.08))",border:"1px solid rgba(124,58,237,.2)",borderRadius:16,padding:24,marginBottom:24,display:"flex",alignItems:"center",gap:20,flexWrap:"wrap"}}>
        <Avatar prenom={user?.prenom} nom={user?.nom} size={64} fontSize={24}/>
        <div style={{flex:1,minWidth:200}}>
          <div style={{fontSize:22,fontWeight:800,color:C.text,marginBottom:4}}>Dr. {user?.prenom} {user?.nom}</div>
          <div style={{fontSize:14,color:C.teal,fontWeight:600,marginBottom:6}}>{user?.specialite||"Médecin"}</div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            {cliniques.map(cl=><span key={cl.id} style={{fontSize:12,color:C.muted,background:C.hover,borderRadius:8,padding:"3px 10px"}}>🏥 {cl.nom}</span>)}
            {cliniques.length===0&&<span style={{fontSize:12,color:C.dim}}>Aucune clinique affiliée</span>}
          </div>
        </div>
        <div style={{display:"flex",gap:10}}>
          <Btn onClick={()=>nav("planning")}>📅 Mon planning</Btn>
          <Btn variant="teal" onClick={()=>nav("patients")}>👤 Mes patients</Btn>
        </div>
      </div>
      <Grid cols={4} gap={14} style={{marginBottom:24}}>
        <Card label="RDV aujourd'hui" value={stats.rdv_aujourd_hui||0} icon="📅" color={C.teal} sub={`${rdvs.filter(r=>r.statut==="en_attente").length} en attente`} onClick={()=>nav("planning")}/>
        <Card label="RDV ce mois" value={stats.rdv_ce_mois||0} icon="📆" color={C.blue}/>
        <Card label="Consultations" value={stats.consultations_total||0} icon="🩺" color={C.green} onClick={()=>nav("consultations")}/>
        <Card label="Créneaux libres" value={stats.creneaux_disponibles||0} icon="✅" color={C.green} onClick={()=>nav("planning")}/>
      </Grid>
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
      <Panel title={`📅 RDV du jour — ${fmtDate(today())}`} actions={<Btn style={{padding:"6px 14px",fontSize:12}} onClick={()=>nav("planning")}>Planning →</Btn>}>
        {rdvs.length===0?<Empty icon="📅" title="Aucun RDV aujourd'hui" subtitle="Profitez-en pour gérer votre planning !"/>
          :rdvs.map(r=>(
            <div key={r.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:`1px solid ${C.border}`}}>
              <div style={{textAlign:"center",minWidth:52,background:C.hover,borderRadius:10,padding:"6px 8px"}}>
                <div style={{fontSize:14,fontWeight:800,color:C.text}}>{r.heure_rdv?.slice(0,5)||"—"}</div>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:700,color:C.text}}>{r.patient_nom||"Patient"}</div>
                <div style={{fontSize:11,color:C.muted}}>{r.motif||"Consultation"}</div>
              </div>
              <Badge color={{confirme:"green",en_attente:"amber",en_cours:"teal",termine:"gray",annule:"red"}[r.statut]||"gray"}>{r.statut}</Badge>
            </div>
          ))
        }
      </Panel>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// PLANNING — CALENDRIER DE DISPONIBILITÉS
// ════════════════════════════════════════════════════════════════════
function PagePlanning(){
  const qc=useQueryClient();
  const now=new Date();
  const [mois,setMois]=useState(now.getMonth()+1);
  const [annee,setAnnee]=useState(now.getFullYear());
  const [cliniqueId,setCliniqueId]=useState("");
  const [selectedDay,setSelectedDay]=useState(today());
  const [showAddDispo,setShowAddDispo]=useState(false);
  const [showConsult,setShowConsult]=useState(false);
  const [selectedRdv,setSelectedRdv]=useState(null);
  const [newDispo,setNewDispo]=useState({heure_debut:"08:00",heure_fin:"09:00",clinique_id:""});
  const [cForm,setCForm]=useState({diagnostic:"",traitement:"",notes:"",tension_arterielle:"",temperature:"",poids:"",taille:"",ord_medicaments:"",ord_posologie:"",ord_duree:""});

  const {data:clinData}=useQuery({queryKey:["med-cliniques"],queryFn:()=>mAPI.cliniques().then(r=>r.data.data||[])});
  const {data:dispoData,isLoading:ldD}=useQuery({queryKey:["med-dispos",mois,annee,cliniqueId],queryFn:()=>mAPI.dispos({mois,annee,clinique_id:cliniqueId||undefined}).then(r=>r.data.data||[])});
  const {data:rdvData}=useQuery({queryKey:["med-rdvs-m"],queryFn:()=>mAPI.rdvs({}).then(r=>r.data.data||[])});

  const cliniques=clinData||[]; const dispos=dispoData||[]; const rdvs=rdvData||[];
  const dayDispos=dispos.filter(d=>d.date===selectedDay);
  const dayRdvs=rdvs.filter(r=>r.date_rdv===selectedDay&&r.statut!=="annule");

  const addDispoMut=useMutation({mutationFn:d=>mAPI.addDispo(d),onSuccess:()=>{toast.success("✅ Créneau publié !");qc.invalidateQueries(["med-dispos"]);qc.invalidateQueries(["med-stats"]);setShowAddDispo(false);},onError:e=>toast.error(e?.response?.data?.message||"Erreur")});
  const delDispoMut=useMutation({mutationFn:id=>mAPI.delDispo(id),onSuccess:()=>{toast.success("Créneau supprimé");qc.invalidateQueries(["med-dispos"]);}});
  const addConsMut=useMutation({mutationFn:d=>mAPI.addConsult(d),onSuccess:()=>{toast.success("✅ Consultation enregistrée !");qc.invalidateQueries(["med-rdvs-m"]);qc.invalidateQueries(["med-stats"]);setShowConsult(false);setSelectedRdv(null);},onError:()=>toast.error("Erreur")});
  const updRdvMut=useMutation({mutationFn:({id,...d})=>mAPI.updRdv(id,d),onSuccess:()=>{toast.success("RDV mis à jour");qc.invalidateQueries(["med-rdvs-m"]);}});

  const navigMois=delta=>{let nm=mois+delta,na=annee;if(nm>12){nm=1;na++;}if(nm<1){nm=12;na--;}setMois(nm);setAnnee(na);};
  const HEURES=["08:00","09:00","10:00","11:00","14:00","15:00","16:00","17:00"];
  const cf=k=>e=>setCForm(p=>({...p,[k]:e.target.value}));
  const nd=k=>e=>setNewDispo(p=>({...p,[k]:e.target.value}));

  return(
    <div>
      <PageHeader title="📅 Mon planning & disponibilités" subtitle={`${dispos.filter(d=>d.statut==="disponible").length} créneaux disponibles · Sync temps réel`} actions={<Btn onClick={()=>setShowAddDispo(true)}>+ Ajouter créneau</Btn>}/>
      <div style={{background:"rgba(10,143,88,.07)",border:"1px solid rgba(10,143,88,.2)",borderRadius:10,padding:"10px 16px",marginBottom:20,fontSize:13,color:C.muted,display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:18}}>🔄</span>
        <span>Vos disponibilités sont <strong style={{color:C.green}}>synchronisées automatiquement</strong> sur le dashboard clinique, le dashboard patient et la plateforme <strong style={{color:C.teal}}>rdv.mediconnect4africa.cloud</strong>.</span>
      </div>
      <Grid cols={2} gap={20}>
        {/* Calendrier */}
        <div>
          {cliniques.length>0&&(
            <div style={{marginBottom:14}}>
              <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",marginBottom:8}}>Clinique</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <button onClick={()=>setCliniqueId("")} style={{background:!cliniqueId?"rgba(10,143,88,.15)":C.hover,border:`1.5px solid ${!cliniqueId?C.green:C.border}`,borderRadius:20,padding:"5px 14px",cursor:"pointer",fontSize:12,fontWeight:!cliniqueId?700:400,color:!cliniqueId?C.green:C.muted,fontFamily:"inherit"}}>Toutes</button>
                {cliniques.map(cl=><button key={cl.id} onClick={()=>setCliniqueId(cliniqueId===cl.id?"":cl.id)} style={{background:cliniqueId===cl.id?"rgba(10,143,88,.15)":C.hover,border:`1.5px solid ${cliniqueId===cl.id?C.green:C.border}`,borderRadius:20,padding:"5px 14px",cursor:"pointer",fontSize:12,fontWeight:cliniqueId===cl.id?700:400,color:cliniqueId===cl.id?C.green:C.muted,fontFamily:"inherit"}}>🏥 {cl.nom}</button>)}
              </div>
            </div>
          )}
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
              {[["Libres",dispos.filter(d=>d.statut==="disponible").length,C.green],["Confirmés",rdvs.filter(r=>r.statut==="confirme").length,C.teal],["En attente",rdvs.filter(r=>r.statut==="en_attente").length,C.amber]].map(([l,v,c])=>(
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
          <Panel title={`📋 ${fmtDate(selectedDay)}`} actions={<Btn style={{padding:"6px 14px",fontSize:12}} onClick={()=>setShowAddDispo(true)}>+ Créneau</Btn>}>
            {dayDispos.length===0&&dayRdvs.length===0&&<Empty icon="📅" title="Aucun créneau" subtitle="Ajoutez des disponibilités pour ce jour"/>}
            {dayDispos.length>0&&(
              <div style={{marginBottom:16}}>
                <div style={{fontSize:11,fontWeight:700,color:C.dim,textTransform:"uppercase",letterSpacing:".5px",marginBottom:10}}>Créneaux — {dayDispos.length} plage(s)</div>
                {dayDispos.map(d=>{
                  const rdvLie=rdvs.find(r=>r.date_rdv===d.date&&r.heure_rdv?.slice(0,5)===d.heure_debut?.slice(0,5)&&r.statut!=="annule");
                  return(
                    <div key={d.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:rdvLie?"rgba(217,119,6,.08)":"rgba(13,148,136,.06)",border:`1px solid ${rdvLie?"rgba(217,119,6,.25)":"rgba(13,148,136,.2)"}`,borderRadius:10,marginBottom:8}}>
                      <div style={{flex:1}}>
                        <div style={{fontSize:14,fontWeight:700,color:C.text}}>{d.heure_debut?.slice(0,5)} – {d.heure_fin?.slice(0,5)}</div>
                        {rdvLie?<div style={{fontSize:12,color:C.amber}}>👤 {rdvLie.patient_nom||"Patient"} · {rdvLie.motif||"RDV"}</div>:<div style={{fontSize:12,color:C.teal}}>✅ Disponible — visible sur la plateforme</div>}
                      </div>
                      <Badge color={rdvLie?"amber":"green"}>{rdvLie?"RDV":"Libre"}</Badge>
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
                  <div key={r.id} style={{background:C.hover,borderRadius:12,padding:14,marginBottom:10,border:`1.5px solid ${C.border}`,transition:"border-color .15s"}} onMouseOver={e=>e.currentTarget.style.borderColor=C.teal} onMouseOut={e=>e.currentTarget.style.borderColor=C.border}>
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
                      {["confirme","en_attente"].includes(r.statut)&&<Btn variant="teal" style={{flex:2,padding:"6px",fontSize:11}} onClick={()=>{setSelectedRdv(r);setShowConsult(true);}}>🩺 Consultation</Btn>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
          {/* Ajout rapide */}
          <Panel title="⚡ Ajout rapide — créneaux d'1h" style={{marginTop:14}}>
            <div style={{fontSize:12,color:C.muted,marginBottom:12}}>Le <strong style={{color:C.text}}>{fmtDate(selectedDay)}</strong> :</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
              {HEURES.map(h=>{
                const dejaExiste=dayDispos.some(d=>d.heure_debut?.slice(0,5)===h);
                const hFin=`${String(+h.split(":")[0]+1).padStart(2,"0")}:00`;
                return(
                  <button key={h} onClick={()=>{if(dejaExiste){toast.error("Déjà existant");return;}addDispoMut.mutate({clinique_id:cliniqueId||null,date:selectedDay,heure_debut:h,heure_fin:hFin});}}
                    style={{background:dejaExiste?"rgba(13,148,136,.2)":C.hover,border:`1px solid ${dejaExiste?C.teal:C.border}`,borderRadius:9,padding:"8px",cursor:dejaExiste?"not-allowed":"pointer",fontSize:12,fontWeight:700,color:dejaExiste?C.teal:C.text,fontFamily:"inherit"}}>
                    {dejaExiste?"✓":""} {h}
                  </button>
                );
              })}
            </div>
          </Panel>
        </div>
      </Grid>

      {/* Modal: Nouveau créneau */}
      <Modal open={showAddDispo} onClose={()=>setShowAddDispo(false)} title="📅 Nouveau créneau de disponibilité">
        <div style={{background:C.hover,borderRadius:10,padding:14,marginBottom:16,fontSize:13,color:C.muted}}>Date : <strong style={{color:C.text}}>{fmtDate(selectedDay)}</strong></div>
        {cliniques.length>0&&<Sel label="Clinique" value={newDispo.clinique_id} onChange={nd("clinique_id")} options={[{v:"",l:"Toutes mes cliniques"},...cliniques.map(c=>({v:c.id,l:c.nom}))]}/>}
        <Grid cols={2} gap={12}>
          <Inp label="Heure début *" type="time" required value={newDispo.heure_debut} onChange={nd("heure_debut")}/>
          <Inp label="Heure fin *" type="time" required value={newDispo.heure_fin} onChange={nd("heure_fin")}/>
        </Grid>
        <div style={{background:"rgba(10,143,88,.07)",border:"1px solid rgba(10,143,88,.15)",borderRadius:8,padding:12,marginBottom:16,fontSize:12,color:C.muted,lineHeight:1.6}}>
          💡 Ce créneau sera visible sur le <strong style={{color:C.text}}>dashboard clinique</strong>, <strong style={{color:C.text}}>dashboard patient</strong> et <strong style={{color:C.teal}}>rdv.mediconnect4africa.cloud</strong>.
        </div>
        <div style={{display:"flex",gap:10}}>
          <Btn variant="outline" style={{flex:1}} onClick={()=>setShowAddDispo(false)}>Annuler</Btn>
          <Btn style={{flex:2}} loading={addDispoMut.isPending} onClick={()=>addDispoMut.mutate({...newDispo,date:selectedDay,clinique_id:newDispo.clinique_id||cliniqueId||null})}>Publier le créneau</Btn>
        </div>
      </Modal>

      {/* Modal: Consultation */}
      <Modal open={showConsult} onClose={()=>{setShowConsult(false);setSelectedRdv(null);}} title={`🩺 Consultation — ${selectedRdv?.patient_nom||"Patient"}`} width={560}>
        {selectedRdv&&<div style={{background:C.hover,borderRadius:10,padding:12,marginBottom:16,fontSize:13}}><span style={{color:C.muted}}>RDV : </span><strong style={{color:C.text}}>{fmtDate(selectedRdv.date_rdv)}</strong> à <strong style={{color:C.teal}}>{selectedRdv.heure_rdv?.slice(0,5)}</strong>{selectedRdv.motif&&<> · <span style={{color:C.muted}}>{selectedRdv.motif}</span></>}</div>}
        <Inp label="Diagnostic *" required value={cForm.diagnostic} onChange={cf("diagnostic")} placeholder="Ex: HTA stade 1, grippe…"/>
        <Inp label="Traitement prescrit" value={cForm.traitement} onChange={cf("traitement")} placeholder="Amlodipine 5mg, Paracétamol 1g…"/>
        <Grid cols={4} gap={10}>
          <Inp label="T.A." value={cForm.tension_arterielle} onChange={cf("tension_arterielle")} placeholder="120/80"/>
          <Inp label="Temp °C" type="number" value={cForm.temperature} onChange={cf("temperature")} placeholder="37.2"/>
          <Inp label="Poids kg" type="number" value={cForm.poids} onChange={cf("poids")} placeholder="70"/>
          <Inp label="Taille cm" type="number" value={cForm.taille} onChange={cf("taille")} placeholder="175"/>
        </Grid>
        <div style={{marginBottom:14}}>
          <label style={{display:"block",fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",marginBottom:5}}>Notes cliniques</label>
          <textarea value={cForm.notes} onChange={cf("notes")} rows={2} placeholder="Observations…" style={{width:"100%",background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:9,padding:"10px 14px",color:C.text,fontSize:14,resize:"none",outline:"none",fontFamily:"inherit",boxSizing:"border-box"}} onFocus={e=>e.target.style.borderColor=C.green} onBlur={e=>e.target.style.borderColor=C.border}/>
        </div>
        <div style={{background:"rgba(10,143,88,.06)",border:"1px solid rgba(10,143,88,.15)",borderRadius:10,padding:14,marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:700,color:C.green,marginBottom:10}}>💊 Ordonnance (optionnel)</div>
          <Inp label="Médicaments" value={cForm.ord_medicaments} onChange={cf("ord_medicaments")} placeholder="Amoxicilline 500mg…"/>
          <Grid cols={2} gap={12}>
            <Inp label="Posologie" value={cForm.ord_posologie} onChange={cf("ord_posologie")} placeholder="2 cp/jour"/>
            <Inp label="Durée" value={cForm.ord_duree} onChange={cf("ord_duree")} placeholder="7 jours"/>
          </Grid>
        </div>
        <div style={{display:"flex",gap:10}}>
          <Btn variant="outline" style={{flex:1}} onClick={()=>{setShowConsult(false);setSelectedRdv(null);}}>Annuler</Btn>
          <Btn style={{flex:2}} loading={addConsMut.isPending} onClick={()=>{
            if(!cForm.diagnostic){toast.error("Diagnostic requis");return;}
            addConsMut.mutate({rdv_id:selectedRdv?.id,patient_id:selectedRdv?.patient_id,diagnostic:cForm.diagnostic,traitement:cForm.traitement||null,notes:cForm.notes||null,tension_arterielle:cForm.tension_arterielle||null,temperature:cForm.temperature||null,poids:cForm.poids||null,taille:cForm.taille||null,ordonnance:cForm.ord_medicaments?{medicaments:cForm.ord_medicaments,posologie:cForm.ord_posologie||null,duree:cForm.ord_duree||null}:null});
          }}>✅ Enregistrer la consultation</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// MES PATIENTS
// ════════════════════════════════════════════════════════════════════
function PagePatients(){
  const [search,setSearch]=useState(""); const [selected,setSelected]=useState(null); const [activeTab,setActiveTab]=useState("infos");
  const qc=useQueryClient();
  const [showOrd,setShowOrd]=useState(false); const [showConsult,setShowConsult]=useState(false);
  const [ordForm,setOrdForm]=useState({medicaments:"",posologie:"",duree:"",notes_ord:""});
  const [cForm,setCForm]=useState({diagnostic:"",traitement:"",notes:""});
  const {data,isLoading}=useQuery({queryKey:["med-patients"],queryFn:()=>mAPI.patients().then(r=>r.data.data||[])});
  const {data:consData}=useQuery({queryKey:["med-consults-pat",selected?.id],queryFn:()=>selected?api.get(`/consultations?patient_id=${selected.id}`).then(r=>r.data.data||[]):[],enabled:!!selected});
  const {data:ordsData}=useQuery({queryKey:["med-ords-pat",selected?.id],queryFn:()=>selected?api.get(`/ordonnances?patient_id=${selected.id}`).then(r=>r.data.data||[]):[],enabled:!!selected});
  const patients=(data||[]).filter(p=>!search||`${p.prenom} ${p.nom} ${p.telephone||""}`.toLowerCase().includes(search.toLowerCase()));
  const addOrdMut=useMutation({mutationFn:d=>mAPI.addOrd(d),onSuccess:()=>{toast.success("Ordonnance créée !");qc.invalidateQueries(["med-ords-pat",selected?.id]);setShowOrd(false);}});
  const addConsMut=useMutation({mutationFn:d=>mAPI.addConsult(d),onSuccess:()=>{toast.success("Consultation enregistrée !");qc.invalidateQueries(["med-consults-pat",selected?.id]);setShowConsult(false);}});
  const TABS=[{key:"infos",label:"Infos",icon:"👤"},{key:"consultations",label:"Consultations",icon:"🩺"},{key:"ordonnances",label:"Ordonnances",icon:"💊"}];
  return(
    <div style={{display:"flex",gap:20,height:"calc(100vh - 140px)"}}>
      <div style={{width:280,flexShrink:0,display:"flex",flexDirection:"column",gap:10}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un patient…" style={{background:C.input,border:`1px solid ${C.border}`,borderRadius:9,padding:"9px 12px",color:C.text,fontSize:13,outline:"none",fontFamily:"inherit"}} onFocus={e=>e.target.style.borderColor=C.green} onBlur={e=>e.target.style.borderColor=C.border}/>
        <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:6}}>
          {isLoading?<Loader/>:patients.length===0?<Empty icon="👤" title="Aucun patient" subtitle="Vos patients apparaîtront après les consultations"/>
            :patients.map(p=>(
              <button key={p.id} onClick={()=>{setSelected(p);setActiveTab("infos");}} style={{background:selected?.id===p.id?C.input:C.card,border:`1.5px solid ${selected?.id===p.id?C.green:C.border}`,borderRadius:12,padding:"12px 14px",cursor:"pointer",textAlign:"left",fontFamily:"inherit",transition:"all .15s"}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <Avatar prenom={p.prenom} nom={p.nom} size={36} fontSize={13}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:700,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.prenom} {p.nom}</div>
                    <div style={{fontSize:11,color:C.muted}}>{p.telephone||p.code_secret||"—"}</div>
                  </div>
                  {p.groupe_sanguin&&<span style={{fontSize:10,fontWeight:700,color:C.red,background:"rgba(225,29,72,.1)",padding:"2px 6px",borderRadius:6}}>{p.groupe_sanguin}</span>}
                </div>
              </button>
            ))
          }
        </div>
      </div>
      <div style={{flex:1,display:"flex",flexDirection:"column",gap:14,overflowY:"auto"}}>
        {!selected?<Empty icon="👤" title="Sélectionnez un patient" subtitle="Cliquez sur un patient pour voir son dossier"/>
          :<>
            <Panel>
              <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:14}}>
                <Avatar prenom={selected.prenom} nom={selected.nom} size={52} fontSize={18}/>
                <div style={{flex:1}}>
                  <h2 style={{margin:0,fontSize:18,fontWeight:800,color:C.text}}>{selected.prenom} {selected.nom}</h2>
                  <div style={{fontSize:12,color:C.muted,marginTop:2}}>{selected.telephone||""} {selected.email&&`· ${selected.email}`}</div>
                </div>
                {selected.groupe_sanguin&&<Badge color="red">{selected.groupe_sanguin}</Badge>}
              </div>
              {selected.allergies&&<div style={{background:"rgba(225,29,72,.08)",border:"1px solid rgba(225,29,72,.2)",borderRadius:8,padding:"8px 14px",fontSize:12,color:C.red,marginBottom:8}}>⚠️ <strong>Allergies :</strong> {selected.allergies}</div>}
              {selected.antecedents&&<div style={{background:"rgba(37,99,235,.08)",border:"1px solid rgba(37,99,235,.2)",borderRadius:8,padding:"8px 14px",fontSize:12,color:C.blue}}>📋 <strong>Antécédents :</strong> {selected.antecedents}</div>}
              <div style={{display:"flex",gap:10,marginTop:14}}>
                <Btn style={{flex:1,padding:"8px",fontSize:12}} onClick={()=>setShowConsult(true)}>🩺 Consultation</Btn>
                <Btn variant="outline" style={{flex:1,padding:"8px",fontSize:12}} onClick={()=>setShowOrd(true)}>💊 Ordonnance</Btn>
              </div>
            </Panel>
            <div style={{display:"flex",gap:4,background:C.input,borderRadius:10,padding:4}}>
              {TABS.map(t=><button key={t.key} onClick={()=>setActiveTab(t.key)} style={{flex:1,background:activeTab===t.key?C.hover:"transparent",border:"none",borderRadius:8,padding:"8px",cursor:"pointer",fontFamily:"inherit",color:activeTab===t.key?C.text:C.muted,fontSize:12,fontWeight:activeTab===t.key?700:400}}>{t.icon} {t.label}</button>)}
            </div>
            {activeTab==="infos"&&(
              <Panel title="Informations">
                <Grid cols={2} gap={10}>
                  {[["Prénom",selected.prenom],["Nom",selected.nom],["Téléphone",selected.telephone],["Email",selected.email],["Naissance",fmtDate(selected.date_naissance)],["Groupe sanguin",selected.groupe_sanguin],["Code secret",selected.code_secret],["Assurance",selected.assurance]].map(([k,v])=>(
                    <div key={k} style={{background:C.hover,borderRadius:8,padding:"9px 12px"}}>
                      <div style={{fontSize:10,color:C.dim,fontWeight:700,textTransform:"uppercase",marginBottom:2}}>{k}</div>
                      <div style={{fontSize:13,color:C.text,fontWeight:600}}>{v||"—"}</div>
                    </div>
                  ))}
                </Grid>
              </Panel>
            )}
            {activeTab==="consultations"&&(
              <Panel title="Consultations" actions={<Btn style={{padding:"6px 14px",fontSize:12}} onClick={()=>setShowConsult(true)}>+ Consultation</Btn>}>
                {(consData||[]).length===0?<Empty icon="🩺" title="Aucune consultation"/>
                  :(consData||[]).map(c=>(
                    <div key={c.id} style={{background:C.hover,borderRadius:10,padding:14,marginBottom:10}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:12,fontWeight:700,color:C.teal}}>{fmtDate(c.created_at)}</span><Badge color="teal">Complétée</Badge></div>
                      <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:4}}>Diagnostic : {c.diagnostic||"—"}</div>
                      {c.traitement&&<div style={{fontSize:12,color:C.muted,marginBottom:4}}>Traitement : {c.traitement}</div>}
                      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:6,fontSize:11}}>
                        {c.tension_arterielle&&<span style={{color:C.teal}}>TA: {c.tension_arterielle}</span>}
                        {c.temperature&&<span style={{color:C.amber}}>T°: {c.temperature}°C</span>}
                        {c.poids&&<span style={{color:C.blue}}>Poids: {c.poids}kg</span>}
                      </div>
                    </div>
                  ))
                }
              </Panel>
            )}
            {activeTab==="ordonnances"&&(
              <Panel title="Ordonnances" actions={<Btn style={{padding:"6px 14px",fontSize:12}} onClick={()=>setShowOrd(true)}>+ Ordonnance</Btn>}>
                {(ordsData||[]).length===0?<Empty icon="💊" title="Aucune ordonnance"/>
                  :(ordsData||[]).map(o=>(
                    <div key={o.id} style={{background:C.hover,borderRadius:10,padding:14,marginBottom:10,display:"flex",gap:14}}>
                      <div style={{width:3,background:o.statut==="active"?C.green:C.dim,borderRadius:2,flexShrink:0}}/>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:12,color:C.teal}}>{fmtDate(o.created_at)}</span><Badge color={o.statut==="active"?"green":"gray"}>{o.statut==="active"?"Active":"Terminée"}</Badge></div>
                        <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:4}}>{o.medicaments||"—"}</div>
                        {o.posologie&&<div style={{fontSize:12,color:C.muted}}>Posologie : {o.posologie}</div>}
                        {o.duree&&<div style={{fontSize:12,color:C.muted}}>Durée : {o.duree}</div>}
                      </div>
                    </div>
                  ))
                }
              </Panel>
            )}
          </>
        }
      </div>
      <Modal open={showOrd} onClose={()=>setShowOrd(false)} title={`💊 Ordonnance — ${selected?.prenom} ${selected?.nom}`}>
        <Inp label="Médicaments *" required value={ordForm.medicaments} onChange={e=>setOrdForm(p=>({...p,medicaments:e.target.value}))} placeholder="Amoxicilline 500mg…"/>
        <Grid cols={2} gap={12}>
          <Inp label="Posologie" value={ordForm.posologie} onChange={e=>setOrdForm(p=>({...p,posologie:e.target.value}))} placeholder="2 cp/jour"/>
          <Inp label="Durée" value={ordForm.duree} onChange={e=>setOrdForm(p=>({...p,duree:e.target.value}))} placeholder="7 jours"/>
        </Grid>
        <Inp label="Notes" value={ordForm.notes_ord} onChange={e=>setOrdForm(p=>({...p,notes_ord:e.target.value}))} placeholder="À prendre pendant les repas…"/>
        <div style={{display:"flex",gap:10}}>
          <Btn variant="outline" style={{flex:1}} onClick={()=>setShowOrd(false)}>Annuler</Btn>
          <Btn style={{flex:2}} loading={addOrdMut.isPending} onClick={()=>{if(!ordForm.medicaments){toast.error("Médicaments requis");return;}addOrdMut.mutate({...ordForm,patient_id:selected?.id});}}>Créer l'ordonnance</Btn>
        </div>
      </Modal>
      <Modal open={showConsult} onClose={()=>setShowConsult(false)} title={`🩺 Consultation — ${selected?.prenom} ${selected?.nom}`}>
        <Inp label="Diagnostic *" required value={cForm.diagnostic} onChange={e=>setCForm(p=>({...p,diagnostic:e.target.value}))} placeholder="HTA, grippe…"/>
        <Inp label="Traitement" value={cForm.traitement} onChange={e=>setCForm(p=>({...p,traitement:e.target.value}))} placeholder="Amlodipine 5mg…"/>
        <Inp label="Notes" value={cForm.notes} onChange={e=>setCForm(p=>({...p,notes:e.target.value}))} placeholder="Observations…"/>
        <div style={{display:"flex",gap:10}}>
          <Btn variant="outline" style={{flex:1}} onClick={()=>setShowConsult(false)}>Annuler</Btn>
          <Btn style={{flex:2}} loading={addConsMut.isPending} onClick={()=>{if(!cForm.diagnostic){toast.error("Diagnostic requis");return;}addConsMut.mutate({...cForm,patient_id:selected?.id});}}>Enregistrer</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// STATISTIQUES
// ════════════════════════════════════════════════════════════════════
function PageStats(){
  const {data:statsData}=useQuery({queryKey:["med-stats"],queryFn:()=>mAPI.stats().then(r=>r.data.data||{}),retry:1});
  const {data:consData}=useQuery({queryKey:["med-consults"],queryFn:()=>mAPI.consultations().then(r=>r.data.data||[])});
  const {data:rdvData}=useQuery({queryKey:["med-all-rdvs"],queryFn:()=>mAPI.rdvs({}).then(r=>r.data.data||[])});
  const stats=statsData||{}; const consults=consData||[]; const rdvs=rdvData||[];
  const rdvStatut={confirme:rdvs.filter(r=>r.statut==="confirme").length,termine:rdvs.filter(r=>r.statut==="termine").length,annule:rdvs.filter(r=>r.statut==="annule").length,en_attente:rdvs.filter(r=>r.statut==="en_attente").length};
  const tauxH=rdvs.length>0?Math.round(rdvStatut.termine/rdvs.length*100):0;
  const MOIS=MOIS_FR.map(m=>m.slice(0,3));
  const statsM=MOIS.map((_,i)=>consults.filter(c=>{const d=new Date(c.created_at);return d.getMonth()===i&&d.getFullYear()===new Date().getFullYear();}).length);
  const maxC=Math.max(...statsM,1);
  return(
    <div>
      <PageHeader title="📊 Mes statistiques" subtitle="Performance & analyses de mon activité"/>
      <Grid cols={4} gap={14} style={{marginBottom:24}}>
        <Card label="RDV aujourd'hui" value={stats.rdv_aujourd_hui||0} icon="📅" color={C.teal}/>
        <Card label="RDV ce mois" value={stats.rdv_ce_mois||0} icon="📆" color={C.blue}/>
        <Card label="Consultations" value={stats.consultations_total||0} icon="🩺" color={C.green}/>
        <Card label="Taux de présence" value={`${tauxH}%`} icon="✅" color={tauxH>=70?C.green:C.amber} sub="RDV honorés"/>
      </Grid>
      <Grid cols={2} gap={20}>
        <Panel title="📈 Consultations par mois">
          <div style={{display:"flex",alignItems:"flex-end",gap:5,height:140,paddingTop:10}}>
            {statsM.map((v,i)=>{
              const h=Math.round((v/maxC)*100),isCur=i===new Date().getMonth();
              return(
                <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                  {v>0&&<div style={{fontSize:9,color:isCur?C.green:C.dim,fontWeight:700}}>{v}</div>}
                  <div style={{width:"100%",height:`${Math.max(h,4)}%`,background:isCur?`linear-gradient(to top,${C.green},${C.teal})`:"rgba(10,143,88,.25)",borderRadius:"3px 3px 0 0"}}/>
                  <div style={{fontSize:8,color:C.dim}}>{MOIS[i]}</div>
                </div>
              );
            })}
          </div>
        </Panel>
        <Panel title="🎯 Indicateurs clés">
          {[{l:"RDV honorés",v:tauxH,c:tauxH>=70?C.green:C.amber},{l:"RDV annulés",v:rdvs.length>0?Math.round(rdvStatut.annule/rdvs.length*100):0,c:C.muted},{l:"Taux occupation",v:rdvs.length>0?Math.round((rdvStatut.termine+rdvStatut.confirme)/Math.max(rdvs.length,1)*100):0,c:C.teal}].map(k=>(
            <div key={k.l} style={{marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:5,fontSize:13}}><span style={{color:C.muted}}>{k.l}</span><span style={{fontWeight:700,color:k.c}}>{k.v}%</span></div>
              <ProgressBar value={k.v} max={100} color={k.c}/>
            </div>
          ))}
          <div style={{borderTop:`1px solid ${C.border}`,paddingTop:14,marginTop:4}}>
            <div style={{fontSize:11,fontWeight:700,color:C.dim,textTransform:"uppercase",marginBottom:10}}>Répartition RDV</div>
            <Grid cols={2} gap={8}>
              {[["Confirmés",rdvStatut.confirme,C.green],["Terminés",rdvStatut.termine,C.teal],["En attente",rdvStatut.en_attente,C.amber],["Annulés",rdvStatut.annule,C.red]].map(([l,v,c])=>(
                <div key={l} style={{background:C.hover,borderRadius:8,padding:"8px 12px"}}>
                  <div style={{fontSize:10,color:C.dim,marginBottom:2}}>{l}</div>
                  <div style={{fontSize:18,fontWeight:900,color:c}}>{v}</div>
                </div>
              ))}
            </Grid>
          </div>
        </Panel>
        <Panel title="📋 Activité récente" style={{gridColumn:"1/-1"}}>
          {consults.length===0?<Empty icon="📋" title="Aucune activité récente"/>
            :consults.slice(0,5).map(c=>(
              <div key={c.id} style={{display:"flex",alignItems:"center",gap:14,padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:C.teal,flexShrink:0}}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:C.text}}>Consultation — {c.diagnostic?.slice(0,50)||"—"}</div>
                  <div style={{fontSize:11,color:C.muted}}>{fmtDate(c.created_at)}</div>
                </div>
                <Badge color="teal">Complétée</Badge>
              </div>
            ))
          }
        </Panel>
      </Grid>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// CONSULTATIONS & ORDONNANCES (pages simples)
// ════════════════════════════════════════════════════════════════════
function PageConsultations(){
  const {data,isLoading}=useQuery({queryKey:["med-consults"],queryFn:()=>mAPI.consultations().then(r=>r.data.data||[])});
  const consults=data||[];
  return(
    <div>
      <PageHeader title="🩺 Mes consultations" subtitle={`${consults.length} consultation(s)`}/>
      <Grid cols={2} gap={14} style={{marginBottom:20}}>
        <Card label="Total" value={consults.length} icon="🩺" color={C.green}/>
        <Card label="Ce mois" value={consults.filter(c=>{const d=new Date(c.created_at),n=new Date();return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear();}).length} icon="📆" color={C.teal}/>
      </Grid>
      {isLoading?<Loader/>:consults.length===0?<Empty icon="🩺" title="Aucune consultation" subtitle="Vos consultations apparaîtront ici"/>
        :consults.map(c=>(
          <div key={c.id} style={{background:C.input,border:`1.5px solid ${C.border}`,borderRadius:14,padding:20,marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><div><div style={{fontSize:15,fontWeight:700,color:C.text}}>Consultation du {fmtDate(c.created_at)}</div></div><Badge color="teal">Complétée</Badge></div>
            <div style={{background:C.hover,borderRadius:10,padding:14,marginBottom:10}}><div style={{fontSize:11,fontWeight:700,color:C.dim,textTransform:"uppercase",marginBottom:6}}>Diagnostic</div><div style={{fontSize:14,color:C.text,fontWeight:600}}>{c.diagnostic||"—"}</div></div>
            {c.traitement&&<div style={{fontSize:13,color:C.muted,marginBottom:8}}>Traitement : {c.traitement}</div>}
            {(c.tension_arterielle||c.temperature||c.poids)&&(
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {[["TA",c.tension_arterielle,C.teal],["T°",c.temperature?`${c.temperature}°C`:null,C.amber],["Poids",c.poids?`${c.poids}kg`:null,C.blue]].filter(([,v])=>v).map(([k,v,color])=>(
                  <span key={k} style={{fontSize:11,background:C.hover,borderRadius:8,padding:"4px 12px"}}><span style={{color:C.dim}}>{k}: </span><span style={{color,fontWeight:700}}>{v}</span></span>
                ))}
              </div>
            )}
          </div>
        ))
      }
    </div>
  );
}
function PageOrdonnances(){
  const {data,isLoading}=useQuery({queryKey:["med-ords"],queryFn:()=>api.get("/ordonnances").then(r=>r.data.data||[])});
  const ords=data||[];
  return(
    <div>
      <PageHeader title="💊 Mes ordonnances" subtitle={`${ords.filter(o=>o.statut==="active").length} active(s)`}/>
      <Grid cols={2} gap={14} style={{marginBottom:20}}>
        <Card label="Actives" value={ords.filter(o=>o.statut==="active").length} icon="✅" color={C.green}/>
        <Card label="Total émises" value={ords.length} icon="📋" color={C.muted}/>
      </Grid>
      {isLoading?<Loader/>:ords.length===0?<Empty icon="💊" title="Aucune ordonnance" subtitle="Créez des ordonnances depuis la fiche patient"/>
        :ords.map(o=>(
          <div key={o.id} style={{background:C.input,border:`1.5px solid ${o.statut==="active"?"rgba(10,143,88,.3)":C.border}`,borderRadius:14,padding:20,marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:12,paddingBottom:10,borderBottom:`1px solid ${C.border}`}}><div style={{fontSize:12,color:C.dim}}>{fmtDate(o.created_at)}</div><Badge color={o.statut==="active"?"green":"gray"}>{o.statut==="active"?"Active":"Terminée"}</Badge></div>
            <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:6}}>{o.medicaments||"—"}</div>
            {o.posologie&&<div style={{fontSize:12,color:C.muted,marginBottom:3}}>📋 {o.posologie}</div>}
            {o.duree&&<div style={{fontSize:12,color:C.muted}}>⏱️ {o.duree}</div>}
          </div>
        ))
      }
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// ROUTER MÉDECIN
// ════════════════════════════════════════════════════════════════════
export default function Dashboard(){
  return(
    <Routes>
      <Route index                element={<PageHome/>}/>
      <Route path="planning"      element={<PagePlanning/>}/>
      <Route path="patients"      element={<PagePatients/>}/>
      <Route path="consultations" element={<PageConsultations/>}/>
      <Route path="ordonnances"   element={<PageOrdonnances/>}/>
      <Route path="stats"         element={<PageStats/>}/>
      <Route path="*"             element={<PageHome/>}/>
    </Routes>
  );
}
