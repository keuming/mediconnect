import React, { useState, useMemo } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "../../services/api";

const T={livraison_total:1500,livraison_livreur:1000,livraison_plateforme:500,clinique_mise_en_service:100000,clinique_mensuel:3000,patient_standard:300,patient_suivi:500,medecin_independant:500,mise_en_relation:1000};
const fmt=n=>Number(n||0).toLocaleString("fr-CI");
const fmtDate=d=>d?new Date(d).toLocaleDateString("fr-CI",{day:"numeric",month:"short",year:"numeric"}):"—";
const MOIS=["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
const C={green:"#0A8F58",teal:"#0D9488",amber:"#D97706",red:"#E11D48",blue:"#2563EB",purple:"#7C3AED",bg:"#060C12",card:"#0E1620",input:"#141E2B",hover:"#1A2535",border:"#1E2F42",text:"#F0F4F8",muted:"#8BA0B5",dim:"#4E657A"};

const aAPI={
  users:()=>api.get("/utilisateurs"),
  addUser:d=>api.post("/auth/register",d),
  toggleUser:(id,v)=>api.put(`/utilisateurs/${id}`,{is_active:v}),
  updateCredentials:(id,d)=>api.put(`/utilisateurs/${id}/credentials`,d),
  cliniques:()=>api.get("/cliniques"),
  patients:()=>api.get("/patients"),
  commandes:()=>api.get("/commandes"),
  medecins:()=>api.get("/medecins"),
  assurances:()=>api.get("/assurances").catch(()=>({data:{data:[]}})),
};

const ROLE_META={
  patient:{color:"blue",icon:"👤",label:"Patient"},
  clinique:{color:"green",icon:"🏥",label:"Clinique"},
  medecin:{color:"teal",icon:"🩺",label:"Médecin employé"},
  medecin_independant:{color:"purple",icon:"⭐",label:"Médecin indép."},
  pharmacie:{color:"teal",icon:"💊",label:"Pharmacie"},
  livreur:{color:"amber",icon:"🛵",label:"Livreur"},
  assureur:{color:"blue",icon:"🛡️",label:"Assureur"},
  admin:{color:"gray",icon:"⚙️",label:"Admin"},
};

// ── UI ────────────────────────────────────────────────────────────
const Card=({label,value,icon,color=C.green,sub,trend,onClick})=>(
  <div onClick={onClick} style={{background:C.input,border:`1.5px solid ${C.border}`,borderRadius:14,padding:"18px 16px",cursor:onClick?"pointer":"default",transition:"border-color .15s"}} onMouseOver={e=>onClick&&(e.currentTarget.style.borderColor=color)} onMouseOut={e=>onClick&&(e.currentTarget.style.borderColor=C.border)}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>{icon&&<span style={{fontSize:18}}>{icon}</span>}<span style={{fontSize:11,textTransform:"uppercase",letterSpacing:".5px",color:C.dim,fontWeight:700}}>{label}</span></div>
      {trend!=null&&<span style={{fontSize:11,fontWeight:700,color:trend>=0?C.green:C.red}}>{trend>=0?"+":""}{trend}%</span>}
    </div>
    <div style={{fontSize:26,fontWeight:900,color}}>{value}</div>
    {sub&&<div style={{fontSize:12,color:C.muted,marginTop:3}}>{sub}</div>}
  </div>
);
const Panel=({title,children,actions,accent,style:s={}})=>(
  <div style={{background:C.input,border:`1.5px solid ${accent||C.border}`,borderRadius:14,padding:20,...s}}>
    {(title||actions)&&<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>{title&&<h3 style={{fontSize:14,fontWeight:700,color:C.text,margin:0}}>{title}</h3>}{actions&&<div style={{display:"flex",gap:8}}>{actions}</div>}</div>}
    {children}
  </div>
);
const Badge=({children,color="gray"})=>{
  const m={green:[C.green,"rgba(10,143,88,.15)"],teal:[C.teal,"rgba(13,148,136,.15)"],amber:[C.amber,"rgba(217,119,6,.15)"],red:[C.red,"rgba(225,29,72,.15)"],blue:[C.blue,"rgba(37,99,235,.15)"],purple:[C.purple,"rgba(124,58,237,.15)"],gray:[C.muted,"rgba(255,255,255,.08)"]};
  const[text,bg]=m[color]||m.gray;
  return <span style={{background:bg,color:text,fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20}}>{children}</span>;
};
const Btn=({children,onClick,variant="primary",loading,disabled,style:s={},type="button"})=>{
  const v={primary:{background:`linear-gradient(135deg,${C.green},${C.teal})`,color:"#fff",border:"none"},outline:{background:"transparent",color:C.muted,border:`1.5px solid ${C.border}`},danger:{background:"rgba(225,29,72,.1)",color:C.red,border:"1.5px solid rgba(225,29,72,.25)"},amber:{background:C.amber,color:"#fff",border:"none"},blue:{background:C.blue,color:"#fff",border:"none"}};
  return <button type={type} onClick={onClick} disabled={loading||disabled} style={{borderRadius:9,padding:"9px 18px",fontSize:13,fontWeight:700,cursor:(loading||disabled)?"not-allowed":"pointer",opacity:(loading||disabled)?.65:1,fontFamily:"inherit",...v[variant]||v.primary,...s}}>{loading?"⏳…":children}</button>;
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
const Modal=({open,onClose,title,children,width=520})=>{
  if(!open)return null;
  return <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}><div onClick={e=>e.stopPropagation()} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:28,width,maxWidth:"95vw",maxHeight:"90vh",overflowY:"auto"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}><h2 style={{fontSize:17,fontWeight:700,color:C.text,margin:0}}>{title}</h2><button onClick={onClose} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:20}}>✕</button></div>{children}</div></div>;
};
const Grid=({cols=2,gap=16,children,style:s={}})=><div style={{display:"grid",gridTemplateColumns:`repeat(${cols},1fr)`,gap,...s}}>{children}</div>;
const Loader=()=><div style={{textAlign:"center",padding:48,color:C.dim}}>⏳ Chargement…</div>;
const Empty=({icon,title,subtitle})=><div style={{textAlign:"center",padding:"36px 20px",color:C.dim}}><div style={{fontSize:38,marginBottom:10}}>{icon}</div>{title&&<div style={{fontSize:15,fontWeight:700,color:C.muted,marginBottom:4}}>{title}</div>}{subtitle&&<div style={{fontSize:13}}>{subtitle}</div>}</div>;
const PageHeader=({title,subtitle,actions})=>(
  <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:24}}>
    <div><h1 style={{fontSize:22,fontWeight:800,color:C.text,margin:"0 0 4px"}}>{title}</h1>{subtitle&&<p style={{fontSize:13,color:C.muted,margin:0}}>{subtitle}</p>}</div>
    {actions&&<div style={{display:"flex",gap:10}}>{actions}</div>}
  </div>
);
const ProgressBar=({value,max=100,color=C.green})=>(
  <div style={{background:C.hover,borderRadius:4,height:5}}><div style={{width:`${Math.min(100,Math.round(value/Math.max(max,1)*100))}%`,height:"100%",background:color,borderRadius:4,transition:"width .4s"}}/></div>
);
const THead=({cols})=>(
  <thead><tr style={{borderBottom:`1px solid ${C.border}`}}>
    {cols.map(h=><th key={h} style={{textAlign:"left",padding:"8px 12px",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".5px",color:C.dim,whiteSpace:"nowrap"}}>{h}</th>)}
  </tr></thead>
);

// ════════════════════════════════════════════════════════════════════
// HOME ADMIN
// ════════════════════════════════════════════════════════════════════
function PageHome(){
  const nav=useNavigate();
  const {data:users}=useQuery({queryKey:["adm-users"],queryFn:()=>aAPI.users().then(r=>r.data.data||[]),retry:1});
  const {data:cmds}=useQuery({queryKey:["adm-cmds"],queryFn:()=>aAPI.commandes().then(r=>r.data.data||[]),retry:1});
  const {data:clin}=useQuery({queryKey:["adm-clin"],queryFn:()=>aAPI.cliniques().then(r=>r.data.data||[]),retry:1});
  const {data:pats}=useQuery({queryKey:["adm-pats"],queryFn:()=>aAPI.patients().then(r=>r.data.data||[]),retry:1});
  const U=users||[];const CMD=cmds||[];const CL=clin||[];const PT=pats||[];
  const livrees=CMD.filter(c=>c.statut==="livree").length;
  const nMI=U.filter(u=>u.role==="medecin_independant").length;
  const revL=livrees*T.livraison_plateforme;
  const revC=CL.length*T.clinique_mensuel;
  const revP=PT.length*T.patient_standard;
  const revMI=nMI*T.medecin_independant;
  const revT=revL+revC+revP+revMI;
  const byRole=U.reduce((a,u)=>({...a,[u.role]:(a[u.role]||0)+1}),{});
  const MODULES=[
    {icon:"💰",label:"Monétisation",path:"monetisation",color:C.green,stat:`${fmt(revT)} F/mois`},
    {icon:"👥",label:"Utilisateurs",path:"utilisateurs",color:C.blue,stat:`${U.length} comptes`},
    {icon:"🏥",label:"Cliniques",path:"cliniques",color:C.teal,stat:`${CL.length} actives`},
    {icon:"🩺",label:"Médecins",path:"medecins",color:C.purple,stat:"Employés + Indép."},
    {icon:"⭐",label:"Médecins indép.",path:"medecins-independants",color:C.purple,stat:`${nMI} abonnés · ${fmt(nMI*T.medecin_independant)} F`},
    {icon:"🛡️",label:"Compagnies assur.",path:"compagnies-assurance",color:C.blue,stat:"Partenaires & contrats"},
    {icon:"💸",label:"Factures",path:"factures",color:C.amber,stat:"Facturation globale"},
    {icon:"🏦",label:"Caisse",path:"caisse",color:C.green,stat:"Encaissements cliniques"},
    {icon:"💳",label:"Paiements reçus",path:"paiements",color:C.green,stat:"Wave · Orange · MTN"},
    {icon:"🛵",label:"Livreurs",path:"livreurs",color:C.amber,stat:`${livrees} livraisons`},
    {icon:"📊",label:"Statistiques",path:"statistiques",color:C.green,stat:"Rapports & analyses"},
    {icon:"🛡️",label:"Assurances (DME)",path:"assurances",color:C.blue,stat:"Tiers-payant cliniques"},
    {icon:"⚙️",label:"Configuration",path:"configuration",color:C.muted,stat:"Paramètres"},
  ];
  return(
    <div>
      <PageHeader title="🏛️ Administration MediConnect Africa" subtitle={`Supervision générale · ${new Date().toLocaleDateString("fr-CI",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}`}/>
      <Grid cols={4} gap={14} style={{marginBottom:20}}>
        <Card label="Utilisateurs" value={U.length} icon="👥" color={C.blue} sub={`${U.filter(u=>u.is_active).length} actifs`} trend={12} onClick={()=>nav("utilisateurs")}/>
        <Card label="Revenus plateforme" value={`${fmt(revT)} F`} icon="💰" color={C.green} sub="Ce mois (estimé)" trend={8} onClick={()=>nav("monetisation")}/>
        <Card label="Cliniques actives" value={CL.length} icon="🏥" color={C.teal} sub={`${fmt(CL.length*T.clinique_mensuel)} F/mois`} onClick={()=>nav("cliniques")}/>
        <Card label="Livraisons OK" value={livrees} icon="🛵" color={C.amber} sub={`${fmt(livrees*T.livraison_plateforme)} F comm.`} onClick={()=>nav("livreurs")}/>
      </Grid>
      <div style={{background:"linear-gradient(135deg,rgba(10,143,88,.12),rgba(13,148,136,.06))",border:"1px solid rgba(10,143,88,.25)",borderRadius:16,padding:24,marginBottom:20}}>
        <div style={{fontSize:13,fontWeight:700,color:C.green,textTransform:"uppercase",letterSpacing:".5px",marginBottom:16}}>💰 Revenus MediConnect Africa — Ce mois</div>
        <Grid cols={4} gap={14}>
          {[{l:"Commissions livraisons",v:revL,d:`${livrees} × ${fmt(T.livraison_plateforme)} F`,icon:"🛵"},{l:"Abonnements cliniques",v:revC,d:`${CL.length} × ${fmt(T.clinique_mensuel)} F/mois`,icon:"🏥"},{l:"Abonnements patients",v:revP,d:`${PT.length} × ${fmt(T.patient_standard)} F/mois`,icon:"👤"},{l:"TOTAL PLATEFORME",v:revT,d:"Revenus consolidés MediConnect",icon:"💰"}].map((item,i)=>(
            <div key={i} style={{background:i===3?"rgba(10,143,88,.15)":"rgba(255,255,255,.04)",border:`1px solid ${i===3?"rgba(10,143,88,.3)":"rgba(255,255,255,.06)"}`,borderRadius:12,padding:16,textAlign:"center"}}>
              <div style={{fontSize:24,marginBottom:8}}>{item.icon}</div>
              <div style={{fontSize:10,color:C.dim,fontWeight:700,textTransform:"uppercase",letterSpacing:".5px",marginBottom:6}}>{item.l}</div>
              <div style={{fontSize:i===3?22:18,fontWeight:900,color:i===3?C.green:C.text,marginBottom:4}}>{fmt(item.v)} F</div>
              <div style={{fontSize:10,color:C.dim,lineHeight:1.4}}>{item.d}</div>
            </div>
          ))}
        </Grid>
      </div>
      <Grid cols={2} gap={20} style={{marginBottom:20}}>
        <Panel title="📊 Répartition revenus">
          {[{l:"🛵 Livraisons",v:revL,c:C.teal},{l:"🏥 Cliniques",v:revC,c:C.green},{l:"👤 Patients",v:revP,c:C.blue},{l:"⭐ Médecins indép.",v:revMI,c:C.purple}].map(item=>(
            <div key={item.l} style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:5,fontSize:13}}>
                <span style={{color:C.muted}}>{item.l}</span>
                <span style={{fontWeight:700,color:item.c}}>{fmt(item.v)} F ({revT>0?Math.round(item.v/revT*100):0}%)</span>
              </div>
              <ProgressBar value={item.v} max={Math.max(revT,1)} color={item.c}/>
            </div>
          ))}
          <div style={{borderTop:`1px solid ${C.border}`,paddingTop:12,display:"flex",justifyContent:"space-between",marginTop:4}}>
            <span style={{fontWeight:700,color:C.text}}>Total</span>
            <span style={{fontSize:20,fontWeight:900,color:C.green}}>{fmt(revT)} F</span>
          </div>
        </Panel>
        <Panel title="👥 Répartition par rôle">
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
            {Object.entries(ROLE_META).map(([role,meta])=>(
              <div key={role} style={{background:C.hover,borderRadius:10,padding:"10px 8px",textAlign:"center",cursor:"pointer"}} onClick={()=>nav("utilisateurs")}>
                <div style={{fontSize:20,marginBottom:4}}>{meta.icon}</div>
                <div style={{fontSize:18,fontWeight:900,color:C[meta.color]||C.muted}}>{byRole[role]||0}</div>
                <div style={{fontSize:9,color:C.dim,marginTop:2,lineHeight:1.3}}>{meta.label}</div>
              </div>
            ))}
          </div>
        </Panel>
      </Grid>
      <Panel title="⚡ Modules d'administration">
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",gap:12}}>
          {MODULES.map(m=>(
            <button key={m.path} onClick={()=>nav(m.path)} style={{background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:12,padding:16,cursor:"pointer",textAlign:"left",fontFamily:"inherit",transition:"all .15s"}}
              onMouseOver={e=>{e.currentTarget.style.borderColor=m.color;e.currentTarget.style.transform="translateY(-2px)";}}
              onMouseOut={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.transform="none";}}>
              <div style={{fontSize:26,marginBottom:8}}>{m.icon}</div>
              <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:3}}>{m.label}</div>
              <div style={{fontSize:11,color:C.dim}}>{m.stat}</div>
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// MONÉTISATION
// ════════════════════════════════════════════════════════════════════
function PageMonetisation(){
  const {data:clin}=useQuery({queryKey:["adm-clin"],queryFn:()=>aAPI.cliniques().then(r=>r.data.data||[])});
  const {data:pats}=useQuery({queryKey:["adm-pats"],queryFn:()=>aAPI.patients().then(r=>r.data.data||[])});
  const {data:cmds}=useQuery({queryKey:["adm-cmds"],queryFn:()=>aAPI.commandes().then(r=>r.data.data||[])});
  const {data:users}=useQuery({queryKey:["adm-users"],queryFn:()=>aAPI.users().then(r=>r.data.data||[])});
  const nc=clin?.length||0; const np=pats?.length||0;
  const livrees=(cmds||[]).filter(c=>c.statut==="livree").length;
  const nMI=(users||[]).filter(u=>u.role==="medecin_independant").length;
  const revL=livrees*T.livraison_plateforme,revC=nc*T.clinique_mensuel,revP=np*T.patient_standard,revMI=nMI*T.medecin_independant,revT=revL+revC+revP+revMI;
  const GRILLE=[
    {title:"🛵 Livraison — Zone UEMOA + CEMAC",color:C.teal,border:"rgba(13,148,136,.2)",bg:"rgba(13,148,136,.05)",items:[["Frais client (tarif unique)",`${fmt(T.livraison_total)} FCFA`,"Tarif fixe toute zone UEMOA+CEMAC"],["Part du livreur",`${fmt(T.livraison_livreur)} FCFA`,"Versé au livreur par livraison"],["Commission MediConnect",`${fmt(T.livraison_plateforme)} FCFA`,`${livrees} livraisons = ${fmt(livrees*T.livraison_plateforme)} F`]]},
    {title:"🏥 Cliniques & Établissements",color:C.green,border:"rgba(10,143,88,.2)",bg:"rgba(10,143,88,.05)",items:[["Mise en service (unique)",`${fmt(T.clinique_mise_en_service)} FCFA`,"Installation + formation initiale"],["Abonnement mensuel",`${fmt(T.clinique_mensuel)} FCFA/mois`,"Hébergement + support technique"],["Revenus actuels",`${fmt(revC)} FCFA/mois`,`${nc} clinique(s) × ${fmt(T.clinique_mensuel)} F`]]},
    {title:"👤 Patients",color:C.blue,border:"rgba(37,99,235,.2)",bg:"rgba(37,99,235,.05)",items:[["Abonnement standard",`${fmt(T.patient_standard)} FCFA/mois`,"Dossier médical + prise de RDV"],["Avec suivi médecin privé",`${fmt(T.patient_suivi)} FCFA/mois`,"Tout inclus + suivi médecin indép."],["Revenus actuels",`${fmt(revP)} FCFA/mois`,`${np} patient(s) abonné(s)`]]},
    {title:"⭐ Médecins indépendants",color:C.purple,border:"rgba(124,58,237,.2)",bg:"rgba(124,58,237,.05)",items:[["Abonnement mensuel",`${fmt(T.medecin_independant)} FCFA/mois`,"Accès plateforme + visibilité publique"],["Frais mise en relation",`${fmt(T.mise_en_relation)} FCFA`,"Par demande patient acceptée"],["Revenus actuels",`${fmt(revMI)} FCFA/mois`,`${nMI} médecin(s) indépendant(s)`]]},
  ];
  return(
    <div>
      <PageHeader title="💰 Monétisation MediConnect Africa" subtitle="Tarification complète · Revenus · Abonnements · Commissions"/>
      <Panel title="📋 Grille tarifaire officielle" style={{marginBottom:20}}>
        {GRILLE.map(section=>(
          <div key={section.title} style={{background:section.bg,border:`1px solid ${section.border}`,borderRadius:12,padding:16,marginBottom:14}}>
            <div style={{fontSize:14,fontWeight:800,color:section.color,marginBottom:10}}>{section.title}</div>
            <Grid cols={3} gap={10}>
              {section.items.map(([k,v,d])=>(
                <div key={k} style={{background:C.input,borderRadius:8,padding:12}}>
                  <div style={{fontSize:10,color:C.dim,fontWeight:700,textTransform:"uppercase",marginBottom:4}}>{k}</div>
                  <div style={{fontSize:17,fontWeight:900,color:section.color,marginBottom:3}}>{v}</div>
                  <div style={{fontSize:11,color:C.dim}}>{d}</div>
                </div>
              ))}
            </Grid>
          </div>
        ))}
      </Panel>
      <Panel title="📊 Revenus consolidés ce mois" accent="rgba(10,143,88,.3)">
        <Grid cols={2} gap={20}>
          <div>
            {[{l:"🛵 Commissions livraisons",v:revL,d:`${livrees} × ${fmt(T.livraison_plateforme)} F`},{l:"🏥 Abonnements cliniques",v:revC,d:`${nc} × ${fmt(T.clinique_mensuel)} F/mois`},{l:"👤 Abonnements patients",v:revP,d:`${np} × ${fmt(T.patient_standard)} F/mois`},{l:"⭐ Médecins indépendants",v:revMI,d:`${nMI} × ${fmt(T.medecin_independant)} F/mois`}].map((item,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:`1px solid ${C.border}`}}>
                <div><div style={{fontSize:13,color:C.text,fontWeight:600}}>{item.l}</div><div style={{fontSize:11,color:C.dim}}>{item.d}</div></div>
                <span style={{fontSize:16,fontWeight:800,color:C.green}}>{fmt(item.v)} F</span>
              </div>
            ))}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:14}}>
              <span style={{fontSize:15,fontWeight:700,color:C.text}}>TOTAL MENSUEL</span>
              <span style={{fontSize:24,fontWeight:900,color:C.green}}>{fmt(revT)} FCFA</span>
            </div>
          </div>
          <div>
            <div style={{fontSize:12,fontWeight:700,color:C.muted,textTransform:"uppercase",marginBottom:14}}>Répartition</div>
            {[{l:"Livraisons",v:revL,c:C.teal},{l:"Cliniques",v:revC,c:C.green},{l:"Patients",v:revP,c:C.blue},{l:"Médecins indép.",v:revMI,c:C.purple}].map(item=>(
              <div key={item.l} style={{marginBottom:16}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5,fontSize:13}}><span style={{color:C.muted}}>{item.l}</span><span style={{fontWeight:700,color:item.c}}>{revT>0?Math.round(item.v/revT*100):0}%</span></div>
                <ProgressBar value={item.v} max={Math.max(revT,1)} color={item.c}/>
              </div>
            ))}
          </div>
        </Grid>
      </Panel>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// GESTION UTILISATEURS — avec modification identifiants 🔑
// ════════════════════════════════════════════════════════════════════
function PageUtilisateurs(){
  const qc=useQueryClient();
  const [search,setSearch]=useState("");
  const [roleFilter,setRoleFilter]=useState("");
  const [statutFilter,setStatut]=useState("");
  const [showAdd,setShowAdd]=useState(false);
  const [showDetail,setShowDetail]=useState(null);
  const [showCreds,setShowCreds]=useState(null); // ← nouveau : modal identifiants
  const [credForm,setCredForm]=useState({email:"",password:""});
  const [credLoading,setCredLoading]=useState(false);
  const [form,setForm]=useState({prenom:"",nom:"",email:"",password:"",role:"patient",telephone:"",ville:""});

  const {data,isLoading}=useQuery({queryKey:["adm-users"],queryFn:()=>aAPI.users().then(r=>r.data.data||[])});
  const toggleMut=useMutation({mutationFn:({id,v})=>aAPI.toggleUser(id,v),onSuccess:()=>{toast.success("Statut mis à jour");qc.invalidateQueries(["adm-users"]);},onError:()=>toast.error("Erreur")});
  const addMut=useMutation({mutationFn:d=>aAPI.addUser(d),onSuccess:()=>{toast.success("✅ Utilisateur créé !");qc.invalidateQueries(["adm-users"]);setShowAdd(false);setForm({prenom:"",nom:"",email:"",password:"",role:"patient",telephone:"",ville:""});},onError:e=>toast.error(e?.response?.data?.message||"Erreur création")});

  const users=useMemo(()=>(data||[]).filter(u=>{
    const q=search.toLowerCase();
    const mQ=!q||`${u.prenom||""} ${u.nom||""} ${u.email||""} ${u.telephone||""}`.toLowerCase().includes(q);
    const mR=!roleFilter||u.role===roleFilter;
    const mS=!statutFilter||(statutFilter==="actif"?u.is_active:!u.is_active);
    return mQ&&mR&&mS;
  }),[data,search,roleFilter,statutFilter]);

  const byRole=(data||[]).reduce((a,u)=>({...a,[u.role]:(a[u.role]||0)+1}),{});
  const f=k=>e=>setForm(p=>({...p,[k]:e.target.value}));

  // Ouvrir modal identifiants
  const openCreds=(u)=>{setShowCreds(u);setCredForm({email:"",password:""}); setShowDetail(null);};

  // Soumettre modification identifiants
  const submitCreds=async()=>{
    if(!credForm.email&&!credForm.password){toast.error("Renseignez au moins un champ");return;}
    setCredLoading(true);
    try{
      await aAPI.updateCredentials(showCreds.id,{
        email:credForm.email||undefined,
        password:credForm.password||undefined,
      });
      toast.success("✅ Identifiants mis à jour !");
      qc.invalidateQueries(["adm-users"]);
      setShowCreds(null);
      setCredForm({email:"",password:""});
    }catch(e){
      toast.error(e?.response?.data?.message||"Erreur lors de la mise à jour");
    }finally{
      setCredLoading(false);
    }
  };

  return(
    <div>
      <PageHeader title="👥 Gestion des utilisateurs" subtitle={`${users.length} / ${(data||[]).length} utilisateurs`} actions={<Btn onClick={()=>setShowAdd(true)}>+ Créer utilisateur</Btn>}/>

      {/* Stats par rôle */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(8,1fr)",gap:10,marginBottom:20}}>
        {Object.entries(ROLE_META).map(([role,meta])=>(
          <button key={role} onClick={()=>setRoleFilter(roleFilter===role?"":role)}
            style={{background:roleFilter===role?`rgba(10,143,88,.15)`:C.input,border:`1.5px solid ${roleFilter===role?C.green:C.border}`,borderRadius:12,padding:"10px 6px",textAlign:"center",cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}>
            <div style={{fontSize:18,marginBottom:4}}>{meta.icon}</div>
            <div style={{fontSize:16,fontWeight:900,color:C[meta.color]||C.muted}}>{byRole[role]||0}</div>
            <div style={{fontSize:9,color:C.dim,lineHeight:1.3}}>{meta.label}</div>
          </button>
        ))}
      </div>

      {/* Filtres */}
      <div style={{display:"flex",gap:12,marginBottom:16,flexWrap:"wrap"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Nom, email, téléphone…"
          style={{flex:1,minWidth:200,background:C.input,border:`1px solid ${C.border}`,borderRadius:9,padding:"9px 14px",color:C.text,fontSize:13,outline:"none",fontFamily:"inherit"}}
          onFocus={e=>e.target.style.borderColor=C.green} onBlur={e=>e.target.style.borderColor=C.border}/>
        <select value={roleFilter} onChange={e=>setRoleFilter(e.target.value)} style={{background:C.input,border:`1px solid ${C.border}`,borderRadius:9,padding:"9px 14px",color:C.text,fontSize:13,outline:"none",fontFamily:"inherit"}}>
          <option value="">Tous les rôles</option>
          {Object.entries(ROLE_META).map(([role,m])=><option key={role} value={role}>{m.icon} {m.label}</option>)}
        </select>
        <select value={statutFilter} onChange={e=>setStatut(e.target.value)} style={{background:C.input,border:`1px solid ${C.border}`,borderRadius:9,padding:"9px 14px",color:C.text,fontSize:13,outline:"none",fontFamily:"inherit"}}>
          <option value="">Tous statuts</option>
          <option value="actif">✅ Actifs</option>
          <option value="inactif">❌ Inactifs</option>
        </select>
        {(search||roleFilter||statutFilter)&&<Btn variant="outline" style={{padding:"9px 14px",fontSize:12}} onClick={()=>{setSearch("");setRoleFilter("");setStatut("");}}>✕ Réinitialiser</Btn>}
      </div>

      {isLoading?<Loader/>:(
        <Panel>
          {users.length===0?<Empty icon="👥" title="Aucun utilisateur trouvé" subtitle="Modifiez vos filtres"/>:(
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <THead cols={["Utilisateur","Rôle","Téléphone","Ville","Inscription","Statut","Actions"]}/>
                <tbody>
                  {users.map(u=>{
                    const meta=ROLE_META[u.role]||{icon:"👤",color:"gray",label:u.role};
                    return(
                      <tr key={u.id} style={{borderBottom:`1px solid ${C.border}`}} onMouseOver={e=>e.currentTarget.style.background=C.hover} onMouseOut={e=>e.currentTarget.style.background="transparent"}>
                        <td style={{padding:"10px 12px"}}><div style={{fontWeight:700,color:C.text}}>{u.prenom||""} {u.nom||""}</div><div style={{fontSize:11,color:C.muted}}>{u.email}</div></td>
                        <td style={{padding:"10px 12px"}}><Badge color={meta.color}>{meta.icon} {meta.label}</Badge></td>
                        <td style={{padding:"10px 12px",color:C.muted,fontSize:12}}>{u.telephone||"—"}</td>
                        <td style={{padding:"10px 12px",color:C.muted,fontSize:12}}>{u.ville||"—"}</td>
                        <td style={{padding:"10px 12px",color:C.dim,fontSize:11}}>{fmtDate(u.created_at)}</td>
                        <td style={{padding:"10px 12px"}}><Badge color={u.is_active?"green":"red"}>{u.is_active?"Actif":"Inactif"}</Badge></td>
                        <td style={{padding:"10px 12px"}}>
                          <div style={{display:"flex",gap:6}}>
                            <Btn variant="outline" style={{padding:"4px 10px",fontSize:11}} onClick={()=>setShowDetail(u)}>Voir</Btn>
                            {/* ── Bouton modifier identifiants ── */}
                            <Btn variant="outline" style={{padding:"4px 10px",fontSize:11,color:C.amber,borderColor:"rgba(217,119,6,.4)"}} onClick={()=>openCreds(u)}>🔑</Btn>
                            <Btn variant={u.is_active?"danger":"outline"} style={{padding:"4px 10px",fontSize:11,color:u.is_active?C.red:C.green}} loading={toggleMut.isPending} onClick={()=>toggleMut.mutate({id:u.id,v:!u.is_active})}>
                              {u.is_active?"Suspendre":"Activer"}
                            </Btn>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {/* ── Modal : Créer utilisateur ── */}
      <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="👤 Créer un utilisateur" width={560}>
        <Grid cols={2} gap={12}>
          <Inp label="Prénom *" required value={form.prenom} onChange={f("prenom")} placeholder="Adjoua"/>
          <Inp label="Nom *" required value={form.nom} onChange={f("nom")} placeholder="Koné"/>
          <Inp label="Email *" required value={form.email} onChange={f("email")} type="email" placeholder="user@exemple.com"/>
          <Inp label="Mot de passe *" required value={form.password} onChange={f("password")} type="password" placeholder="••••••••"/>
          <Inp label="Téléphone" value={form.telephone} onChange={f("telephone")} type="tel" placeholder="+225 07 00 00 00 00"/>
          <Inp label="Ville" value={form.ville} onChange={f("ville")} placeholder="Abidjan"/>
        </Grid>
        <Sel label="Rôle *" required value={form.role} onChange={f("role")} options={Object.entries(ROLE_META).map(([role,m])=>({v:role,l:`${m.icon} ${m.label}`}))}/>
        <div style={{display:"flex",gap:10}}>
          <Btn variant="outline" style={{flex:1}} onClick={()=>setShowAdd(false)}>Annuler</Btn>
          <Btn style={{flex:2}} loading={addMut.isPending} onClick={()=>{if(!form.prenom||!form.nom||!form.email||!form.password){toast.error("Champs requis manquants");return;}addMut.mutate(form);}}>Créer l'utilisateur</Btn>
        </div>
      </Modal>

      {/* ── Modal : Détail utilisateur ── */}
      <Modal open={!!showDetail} onClose={()=>setShowDetail(null)} title={`👤 ${showDetail?.prenom} ${showDetail?.nom}`}>
        {showDetail&&(
          <div>
            <div style={{background:C.hover,borderRadius:12,padding:16,marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:12}}>
                <div style={{width:52,height:52,borderRadius:"50%",background:`linear-gradient(135deg,${C.green},${C.teal})`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,color:"#fff",fontSize:18}}>{showDetail.prenom?.[0]}{showDetail.nom?.[0]}</div>
                <div>
                  <div style={{fontSize:17,fontWeight:800,color:C.text}}>{showDetail.prenom} {showDetail.nom}</div>
                  <Badge color={ROLE_META[showDetail.role]?.color||"gray"}>{ROLE_META[showDetail.role]?.icon} {ROLE_META[showDetail.role]?.label||showDetail.role}</Badge>
                </div>
              </div>
              <Grid cols={2} gap={10}>
                {[["Email",showDetail.email],["Téléphone",showDetail.telephone||"—"],["Ville",showDetail.ville||"—"],["Inscription",fmtDate(showDetail.created_at)],["ID",showDetail.id?.slice(0,16)+"…"],["Statut",showDetail.is_active?"Actif":"Inactif"]].map(([k,v])=>(
                  <div key={k} style={{background:C.input,borderRadius:8,padding:"9px 12px"}}>
                    <div style={{fontSize:10,color:C.dim,fontWeight:700,textTransform:"uppercase",marginBottom:2}}>{k}</div>
                    <div style={{fontSize:13,color:C.text,fontWeight:600}}>{v}</div>
                  </div>
                ))}
              </Grid>
            </div>
            <div style={{display:"flex",gap:10}}>
              <Btn variant={showDetail.is_active?"danger":"primary"} style={{flex:1}} loading={toggleMut.isPending} onClick={()=>{toggleMut.mutate({id:showDetail.id,v:!showDetail.is_active});setShowDetail(null);}}>
                {showDetail.is_active?"❌ Suspendre":"✅ Activer"}
              </Btn>
              <Btn variant="outline" style={{flex:1,color:C.amber,borderColor:"rgba(217,119,6,.4)"}} onClick={()=>openCreds(showDetail)}>🔑 Changer identifiants</Btn>
              <Btn variant="outline" style={{flex:1}} onClick={()=>setShowDetail(null)}>Fermer</Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal : Modifier identifiants ── */}
      <Modal open={!!showCreds} onClose={()=>{setShowCreds(null);setCredForm({email:"",password:""}); }} title="🔑 Modifier les identifiants" width={460}>
        {showCreds&&(
          <div>
            {/* Info utilisateur */}
            <div style={{background:"rgba(217,119,6,.08)",border:"1px solid rgba(217,119,6,.25)",borderRadius:10,padding:"12px 16px",marginBottom:20,display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:40,height:40,borderRadius:"50%",background:`linear-gradient(135deg,${C.amber},${C.green})`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,color:"#fff",fontSize:16,flexShrink:0}}>{showCreds.prenom?.[0]}{showCreds.nom?.[0]}</div>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:C.text}}>{showCreds.prenom} {showCreds.nom}</div>
                <div style={{fontSize:12,color:C.muted}}>{showCreds.email}</div>
                <Badge color={ROLE_META[showCreds.role]?.color||"gray"}>{ROLE_META[showCreds.role]?.icon} {ROLE_META[showCreds.role]?.label||showCreds.role}</Badge>
              </div>
            </div>

            {/* Avertissement */}
            <div style={{background:"rgba(225,29,72,.07)",border:"1px solid rgba(225,29,72,.2)",borderRadius:8,padding:"10px 14px",marginBottom:20,fontSize:12,color:C.red}}>
              ⚠️ Ces modifications sont immédiates et irréversibles. L'utilisateur devra utiliser les nouveaux identifiants à sa prochaine connexion.
            </div>

            <Inp
              label="Nouvel email (laisser vide pour ne pas modifier)"
              type="email"
              placeholder={showCreds.email}
              value={credForm.email}
              onChange={e=>setCredForm(p=>({...p,email:e.target.value}))}
            />
            <Inp
              label="Nouveau mot de passe (laisser vide pour ne pas modifier)"
              type="password"
              placeholder="6 caractères minimum"
              value={credForm.password}
              onChange={e=>setCredForm(p=>({...p,password:e.target.value}))}
            />

            <div style={{display:"flex",gap:10,marginTop:4}}>
              <Btn variant="outline" style={{flex:1}} onClick={()=>{setShowCreds(null);setCredForm({email:"",password:""});}}>Annuler</Btn>
              <Btn style={{flex:2,background:C.amber,border:"none"}} loading={credLoading} onClick={submitCreds}>🔑 Enregistrer les identifiants</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// CLINIQUES
// ════════════════════════════════════════════════════════════════════
function PageCliniques(){
  const {data,isLoading}=useQuery({queryKey:["adm-clin"],queryFn:()=>aAPI.cliniques().then(r=>r.data.data||[])});
  const cl=data||[];
  return(
    <div>
      <PageHeader title="🏥 Gestion des Cliniques" subtitle={`${cl.length} cliniques · ${fmt(cl.length*T.clinique_mensuel)} FCFA/mois`}/>
      <Grid cols={3} gap={14} style={{marginBottom:20}}>
        <Card label="Cliniques actives" value={cl.length} icon="🏥" color={C.green}/>
        <Card label="Revenus mensuels" value={`${fmt(cl.length*T.clinique_mensuel)} F`} icon="💰" color={C.green} sub={`${fmt(T.clinique_mensuel)} F × ${cl.length}`}/>
        <Card label="Mises en service cumulées" value={`${fmt(cl.length*T.clinique_mise_en_service)} F`} icon="🎓" color={C.teal}/>
      </Grid>
      {isLoading?<Loader/>:(
        <Panel>
          {cl.length===0?<Empty icon="🏥" title="Aucune clinique"/>:(
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <THead cols={["Clinique","Type","Ville","Mise en service","Mensuel","Statut"]}/>
                <tbody>
                  {cl.map(c=>(
                    <tr key={c.id} style={{borderBottom:`1px solid ${C.border}`}} onMouseOver={e=>e.currentTarget.style.background=C.hover} onMouseOut={e=>e.currentTarget.style.background="transparent"}>
                      <td style={{padding:"10px 12px"}}><div style={{fontWeight:700,color:C.text}}>{c.nom||"—"}</div><div style={{fontSize:11,color:C.muted}}>{c.email||"—"}</div></td>
                      <td style={{padding:"10px 12px"}}><Badge color="green">{c.type||"Clinique"}</Badge></td>
                      <td style={{padding:"10px 12px",color:C.muted,fontSize:12}}>{c.ville||"—"}</td>
                      <td style={{padding:"10px 12px",fontWeight:700,color:C.green}}>{fmt(T.clinique_mise_en_service)} F</td>
                      <td style={{padding:"10px 12px",fontWeight:700,color:C.teal}}>{fmt(T.clinique_mensuel)} F/mois</td>
                      <td style={{padding:"10px 12px"}}><Badge color={c.is_active?"green":"red"}>{c.is_active?"Actif":"Inactif"}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// MÉDECINS
// ════════════════════════════════════════════════════════════════════
function PageMedecins(){
  const {data,isLoading}=useQuery({queryKey:["adm-med"],queryFn:()=>aAPI.medecins().then(r=>r.data.data||[])});
  const {data:users}=useQuery({queryKey:["adm-users"],queryFn:()=>aAPI.users().then(r=>r.data.data||[])});
  const md=data||[]; const nMI=(users||[]).filter(u=>u.role==="medecin_independant").length;
  return(
    <div>
      <PageHeader title="🩺 Gestion des Médecins" subtitle={`${md.length} médecins employés · ${nMI} médecins indépendants`}/>
      <Grid cols={3} gap={14} style={{marginBottom:20}}>
        <Card label="Médecins employés" value={md.length} icon="🩺" color={C.teal}/>
        <Card label="Médecins indép." value={nMI} icon="⭐" color={C.purple} sub={`${fmt(nMI*T.medecin_independant)} F/mois`}/>
        <Card label="Disponibles" value={md.filter(m=>m.statut==="Disponible").length} icon="✅" color={C.green}/>
      </Grid>
      {isLoading?<Loader/>:(
        <Panel>
          {md.length===0?<Empty icon="🩺" title="Aucun médecin enregistré"/>:(
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <THead cols={["Médecin","Spécialité","Clinique","Tarif","Statut","Jours"]}/>
                <tbody>
                  {md.map(m=>(
                    <tr key={m.id} style={{borderBottom:`1px solid ${C.border}`}} onMouseOver={e=>e.currentTarget.style.background=C.hover} onMouseOut={e=>e.currentTarget.style.background="transparent"}>
                      <td style={{padding:"10px 12px"}}><div style={{fontWeight:700,color:C.text}}>Dr. {m.prenom} {m.nom}</div><div style={{fontSize:11,color:C.muted}}>{m.email||"—"}</div></td>
                      <td style={{padding:"10px 12px"}}><Badge color="teal">{m.specialite||"—"}</Badge></td>
                      <td style={{padding:"10px 12px",fontSize:12,color:C.muted}}>{m.clinique_id?"Clinique affiliée":"Indépendant"}</td>
                      <td style={{padding:"10px 12px",fontWeight:700,color:C.green}}>{m.tarif?`${fmt(m.tarif)} F`:"—"}</td>
                      <td style={{padding:"10px 12px"}}><Badge color={{Disponible:"green","En consultation":"teal",Absent:"red"}[m.statut]||"gray"}>{m.statut||"—"}</Badge></td>
                      <td style={{padding:"10px 12px",fontSize:11,color:C.dim}}>{Array.isArray(m.jours_travail)?m.jours_travail.join(", "):m.jours_travail||"—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// MÉDECINS INDÉPENDANTS
// ════════════════════════════════════════════════════════════════════
function PageMedecinsIndependants(){
  const [search,setSearch]=useState("");
  const [showDetail,setShowDetail]=useState(null);
  const [activeTab,setActiveTab]=useState("liste");
  const {data:users,isLoading}=useQuery({queryKey:["adm-users"],queryFn:()=>aAPI.users().then(r=>r.data.data||[])});
  const {data:medecins}=useQuery({queryKey:["adm-med"],queryFn:()=>aAPI.medecins().then(r=>r.data.data||[])});
  const miUsers=(users||[]).filter(u=>u.role==="medecin_independant");
  const miMedecins=medecins||[];
  const miComplets=miUsers.map(u=>{const m=miMedecins.find(med=>med.user_id===u.id)||{};return{...u,...m,user_id:u.id};});
  const filtered=miComplets.filter(m=>!search||`${m.prenom||""} ${m.nom||""} ${m.email||""} ${m.specialite||""}`.toLowerCase().includes(search.toLowerCase()));
  const totalRevenu=miComplets.length*T.medecin_independant;
  const actifs=miComplets.filter(m=>m.is_active).length;
  const disponibles=miComplets.filter(m=>m.statut==="Disponible").length;
  const TABS=[{key:"liste",label:"Liste"},{key:"abonnements",label:"Abonnements"},{key:"demandes",label:"Mises en relation"}];
  return(
    <div>
      <PageHeader title="⭐ Médecins Indépendants" subtitle={`${miComplets.length} médecins indépendants · ${fmt(totalRevenu)} FCFA/mois`}/>
      <Grid cols={4} gap={14} style={{marginBottom:20}}>
        <Card label="Total inscrits" value={miComplets.length} icon="⭐" color={C.purple}/>
        <Card label="Comptes actifs" value={actifs} icon="✅" color={C.green}/>
        <Card label="Disponibles" value={disponibles} icon="🟢" color={C.teal}/>
        <Card label="Rev. abonnements" value={`${fmt(totalRevenu)} F`} icon="💰" color={C.green} sub={`${miComplets.length} × ${fmt(T.medecin_independant)} F/mois`}/>
      </Grid>
      <div style={{background:"rgba(124,58,237,.07)",border:"1px solid rgba(124,58,237,.2)",borderRadius:12,padding:16,marginBottom:20,fontSize:13,color:C.muted,display:"flex",gap:20,flexWrap:"wrap"}}>
        <div><div style={{fontSize:11,fontWeight:700,color:C.purple,textTransform:"uppercase",marginBottom:4}}>Abonnement mensuel</div><div style={{fontSize:20,fontWeight:900,color:C.purple}}>{fmt(T.medecin_independant)} FCFA</div></div>
        <div style={{width:1,background:C.border,flexShrink:0}}/>
        <div><div style={{fontSize:11,fontWeight:700,color:C.amber,textTransform:"uppercase",marginBottom:4}}>Frais mise en relation</div><div style={{fontSize:20,fontWeight:900,color:C.amber}}>{fmt(T.mise_en_relation)} FCFA</div><div style={{fontSize:11,color:C.dim}}>par demande patient acceptée</div></div>
        <div style={{width:1,background:C.border,flexShrink:0}}/>
        <div style={{flex:1}}><div style={{fontSize:11,fontWeight:700,color:C.green,textTransform:"uppercase",marginBottom:4}}>Revenus mensuels totaux</div><div style={{fontSize:20,fontWeight:900,color:C.green}}>{fmt(totalRevenu)} FCFA</div><div style={{fontSize:11,color:C.dim}}>{miComplets.length} médecins abonnés</div></div>
      </div>
      <div style={{display:"flex",gap:4,background:C.input,borderRadius:10,padding:4,marginBottom:16}}>
        {TABS.map(t=><button key={t.key} onClick={()=>setActiveTab(t.key)} style={{flex:1,background:activeTab===t.key?C.hover:"transparent",border:"none",borderRadius:8,padding:"9px",cursor:"pointer",fontFamily:"inherit",color:activeTab===t.key?C.text:C.muted,fontSize:13,fontWeight:activeTab===t.key?700:400}}>{t.label}</button>)}
      </div>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Nom, email, spécialité…"
        style={{width:"100%",background:C.input,border:`1px solid ${C.border}`,borderRadius:9,padding:"9px 14px",color:C.text,fontSize:13,outline:"none",fontFamily:"inherit",boxSizing:"border-box",marginBottom:16}}
        onFocus={e=>e.target.style.borderColor=C.purple} onBlur={e=>e.target.style.borderColor=C.border}/>
      {activeTab==="liste"&&(isLoading?<Loader/>:(
        <Panel>
          {filtered.length===0?<Empty icon="⭐" title="Aucun médecin indépendant" subtitle="Ils apparaîtront après inscription"/>:(
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <THead cols={["Médecin","Spécialité","Ville","Tarif consult.","Abonnement","Statut","Actions"]}/>
                <tbody>
                  {filtered.map(m=>(
                    <tr key={m.user_id||m.id} style={{borderBottom:`1px solid ${C.border}`}} onMouseOver={e=>e.currentTarget.style.background=C.hover} onMouseOut={e=>e.currentTarget.style.background="transparent"}>
                      <td style={{padding:"10px 12px"}}><div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:34,height:34,borderRadius:"50%",background:`linear-gradient(135deg,${C.purple},${C.blue})`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,color:"#fff",fontSize:12,flexShrink:0}}>{(m.prenom||"?")[0]}{(m.nom||"")[0]}</div><div><div style={{fontWeight:700,color:C.text}}>Dr. {m.prenom||""} {m.nom||""}</div><div style={{fontSize:11,color:C.muted}}>{m.email}</div></div></div></td>
                      <td style={{padding:"10px 12px"}}>{m.specialite?<Badge color="purple">{m.specialite}</Badge>:<span style={{color:C.dim}}>—</span>}</td>
                      <td style={{padding:"10px 12px",color:C.muted,fontSize:12}}>{m.ville||"—"}</td>
                      <td style={{padding:"10px 12px",fontWeight:700,color:m.tarif?C.green:C.dim}}>{m.tarif?`${fmt(m.tarif)} F`:"Non défini"}</td>
                      <td style={{padding:"10px 12px"}}><Badge color="purple">{fmt(T.medecin_independant)} F/mois</Badge></td>
                      <td style={{padding:"10px 12px"}}><Badge color={m.is_active?"green":"red"}>{m.is_active?"Actif":"Inactif"}</Badge></td>
                      <td style={{padding:"10px 12px"}}><Btn variant="outline" style={{padding:"4px 10px",fontSize:11}} onClick={()=>setShowDetail(m)}>Détail</Btn></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      ))}
      {activeTab==="abonnements"&&(
        <Panel title={`💳 Abonnements mensuels — ${fmt(T.medecin_independant)} FCFA/mois`}>
          <div style={{background:"rgba(124,58,237,.06)",border:"1px solid rgba(124,58,237,.2)",borderRadius:10,padding:16,marginBottom:16}}>
            <Grid cols={3} gap={14}>
              {[["Total abonnés",miComplets.length,C.purple],["Abonnements actifs",actifs,C.green],["Revenus ce mois",`${fmt(totalRevenu)} F`,C.green]].map(([l,v,c])=>(
                <div key={l} style={{textAlign:"center"}}><div style={{fontSize:22,fontWeight:900,color:c,marginBottom:4}}>{v}</div><div style={{fontSize:11,color:C.dim}}>{l}</div></div>
              ))}
            </Grid>
          </div>
          {filtered.map(m=>(
            <div key={m.user_id||m.id} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 0",borderBottom:`1px solid ${C.border}`}}>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:C.text}}>Dr. {m.prenom} {m.nom}</div><div style={{fontSize:11,color:C.muted}}>{m.specialite||"Médecin"} · {m.email}</div></div>
              <div style={{textAlign:"right"}}><div style={{fontSize:15,fontWeight:800,color:C.purple}}>{fmt(T.medecin_independant)} FCFA</div><div style={{fontSize:11,color:C.dim}}>mensuel</div></div>
              <Badge color={m.is_active?"green":"red"}>{m.is_active?"Payé":"En attente"}</Badge>
            </div>
          ))}
          <div style={{borderTop:`1px solid ${C.border}`,paddingTop:14,display:"flex",justifyContent:"space-between",marginTop:8}}>
            <span style={{fontWeight:700,color:C.text}}>Total mensuel</span>
            <span style={{fontSize:20,fontWeight:900,color:C.purple}}>{fmt(totalRevenu)} FCFA</span>
          </div>
        </Panel>
      )}
      {activeTab==="demandes"&&(
        <Panel title={`🤝 Mises en relation — ${fmt(T.mise_en_relation)} FCFA par demande`}>
          <div style={{background:"rgba(217,119,6,.07)",border:"1px solid rgba(217,119,6,.2)",borderRadius:10,padding:14,marginBottom:16,fontSize:13,color:C.muted}}>
            💡 Chaque fois qu'un patient demande un suivi privé auprès d'un médecin indépendant et paye les <strong style={{color:C.amber}}>{fmt(T.mise_en_relation)} FCFA</strong> de frais de mise en relation, MediConnect encaisse ce montant.
          </div>
          <Empty icon="🤝" title="Données de mise en relation" subtitle="Connectez l'API de suivi des demandes pour afficher les statistiques en temps réel"/>
        </Panel>
      )}
      <Modal open={!!showDetail} onClose={()=>setShowDetail(null)} title={`⭐ Dr. ${showDetail?.prenom} ${showDetail?.nom}`}>
        {showDetail&&(
          <div>
            <div style={{background:`linear-gradient(135deg,rgba(124,58,237,.15),rgba(37,99,235,.1))`,border:"1px solid rgba(124,58,237,.25)",borderRadius:12,padding:16,marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:12}}>
                <div style={{width:52,height:52,borderRadius:"50%",background:`linear-gradient(135deg,${C.purple},${C.blue})`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,color:"#fff",fontSize:18}}>{showDetail.prenom?.[0]}{showDetail.nom?.[0]}</div>
                <div><div style={{fontSize:17,fontWeight:800,color:C.text}}>Dr. {showDetail.prenom} {showDetail.nom}</div>{showDetail.specialite&&<Badge color="purple">{showDetail.specialite}</Badge>}</div>
              </div>
              <Grid cols={2} gap={10}>
                {[["Email",showDetail.email],["Téléphone",showDetail.telephone||"—"],["Ville",showDetail.ville||"—"],["Tarif consult.",showDetail.tarif?`${fmt(showDetail.tarif)} FCFA`:"Non défini"],["Abonnement MediConnect",`${fmt(T.medecin_independant)} FCFA/mois`],["Statut",showDetail.is_active?"Actif":"Inactif"]].map(([k,v])=>(
                  <div key={k} style={{background:C.input,borderRadius:8,padding:"9px 12px"}}><div style={{fontSize:10,color:C.dim,fontWeight:700,textTransform:"uppercase",marginBottom:2}}>{k}</div><div style={{fontSize:13,color:C.text,fontWeight:600}}>{v}</div></div>
                ))}
              </Grid>
            </div>
            <div style={{display:"flex",gap:10}}>
              <Btn variant="outline" style={{flex:1}} onClick={()=>setShowDetail(null)}>Fermer</Btn>
              <Btn variant="outline" style={{flex:1,color:C.amber}} onClick={()=>toast.success("Email de rappel envoyé !")}>📧 Rappel abonnement</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// COMPAGNIES D'ASSURANCE
// ════════════════════════════════════════════════════════════════════
function PageCompagniesAssurance(){
  const [showAdd,setShowAdd]=useState(false);
  const [form,setForm]=useState({nom:"",type:"",contact:"",email:"",taux_couverture:80,zones:""});
  const {data,isLoading}=useQuery({queryKey:["adm-ass"],queryFn:()=>aAPI.assurances().then(r=>r.data.data||[])});
  const dossiers=data||[];
  const COMPAGNIES_CONNUES=[
    {nom:"NSIA Assurances",type:"Privée",pays:"Côte d'Ivoire",taux:80,dossiers:dossiers.filter(d=>d.compagnie==="NSIA").length,statut:"Partenaire"},
    {nom:"Allianz CI",type:"Privée",pays:"Côte d'Ivoire",taux:75,dossiers:dossiers.filter(d=>d.compagnie?.includes("Allianz")).length,statut:"Partenaire"},
    {nom:"AXA CI",type:"Privée",pays:"Côte d'Ivoire",taux:80,dossiers:dossiers.filter(d=>d.compagnie?.includes("AXA")).length,statut:"Partenaire"},
    {nom:"CNAM (CMU)",type:"Publique",pays:"Côte d'Ivoire",taux:70,dossiers:dossiers.filter(d=>d.compagnie?.includes("CNAM")).length,statut:"Partenaire"},
    {nom:"Saham Assurances",type:"Privée",pays:"Maroc / CI",taux:75,dossiers:dossiers.filter(d=>d.compagnie?.includes("Saham")).length,statut:"Partenaire"},
    {nom:"SUNU Assurances",type:"Privée",pays:"UEMOA",taux:70,dossiers:0,statut:"En négociation"},
    {nom:"GNB Assurances",type:"Privée",pays:"Guinée",taux:65,dossiers:0,statut:"En négociation"},
    {nom:"ACTIVA",type:"Privée",pays:"Cameroun",taux:75,dossiers:0,statut:"Contacté"},
  ];
  const totalPartenaires=COMPAGNIES_CONNUES.filter(c=>c.statut==="Partenaire").length;
  const totalDossiers=dossiers.length;
  const montantTotal=dossiers.reduce((s,d)=>s+(+d.montant_assur||0),0);
  const f=k=>e=>setForm(p=>({...p,[k]:e.target.value}));
  return(
    <div>
      <PageHeader title="🛡️ Compagnies d'Assurance" subtitle="Partenaires · Contrats tiers-payant · Remboursements" actions={<Btn onClick={()=>setShowAdd(true)}>+ Ajouter compagnie</Btn>}/>
      <Grid cols={4} gap={14} style={{marginBottom:20}}>
        <Card label="Partenaires actifs" value={totalPartenaires} icon="🤝" color={C.green}/>
        <Card label="En négociation" value={COMPAGNIES_CONNUES.filter(c=>c.statut==="En négociation").length} icon="💬" color={C.amber}/>
        <Card label="Dossiers soumis" value={totalDossiers} icon="📁" color={C.blue}/>
        <Card label="Montant remboursé" value={`${fmt(montantTotal)} F`} icon="💰" color={C.green}/>
      </Grid>
      <Panel title="🏢 Compagnies partenaires & prospects">
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14}}>
          {COMPAGNIES_CONNUES.map((c,i)=>(
            <div key={i} style={{background:C.hover,border:`1.5px solid ${c.statut==="Partenaire"?"rgba(10,143,88,.3)":c.statut==="En négociation"?"rgba(217,119,6,.25)":"rgba(37,99,235,.2)"}`,borderRadius:12,padding:18}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                <div><div style={{fontSize:15,fontWeight:800,color:C.text,marginBottom:4}}>{c.nom}</div><div style={{fontSize:12,color:C.muted}}>{c.type} · {c.pays}</div></div>
                <Badge color={c.statut==="Partenaire"?"green":c.statut==="En négociation"?"amber":"blue"}>{c.statut}</Badge>
              </div>
              <Grid cols={3} gap={8}>
                {[["Taux couv.",`${c.taux}%`,C.teal],["Dossiers",c.dossiers,C.blue],["Statut",c.statut==="Partenaire"?"✅":"⏳",c.statut==="Partenaire"?C.green:C.amber]].map(([l,v,col])=>(
                  <div key={l} style={{background:C.input,borderRadius:8,padding:"8px",textAlign:"center"}}><div style={{fontSize:14,fontWeight:800,color:col}}>{v}</div><div style={{fontSize:9,color:C.dim,marginTop:2}}>{l}</div></div>
                ))}
              </Grid>
              {c.statut==="Partenaire"&&<div style={{marginTop:12,display:"flex",gap:8}}><Btn variant="outline" style={{flex:1,padding:"6px",fontSize:11}} onClick={()=>toast.success(`Rapport ${c.nom} exporté !`)}>📊 Rapport</Btn><Btn variant="outline" style={{flex:1,padding:"6px",fontSize:11}} onClick={()=>toast.success(`Contact ${c.nom} initié !`)}>📧 Contact</Btn></div>}
              {c.statut!=="Partenaire"&&<Btn variant="outline" style={{width:"100%",padding:"6px",fontSize:11,marginTop:10,color:C.amber}} onClick={()=>toast.success(`Dossier partenariat ${c.nom} créé !`)}>🤝 Initier partenariat</Btn>}
            </div>
          ))}
        </div>
      </Panel>
      {dossiers.length>0&&(
        <Panel title="📁 Dossiers tiers-payant récents" style={{marginTop:20}}>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <THead cols={["Référence","Patient","Compagnie","Montant total","Part assur.","Ticket modér.","Statut"]}/>
              <tbody>
                {dossiers.slice(0,20).map(d=>(
                  <tr key={d.id} style={{borderBottom:`1px solid ${C.border}`}} onMouseOver={e=>e.currentTarget.style.background=C.hover} onMouseOut={e=>e.currentTarget.style.background="transparent"}>
                    <td style={{padding:"10px 12px",fontFamily:"monospace",fontSize:12,color:C.teal}}>{d.reference||"—"}</td>
                    <td style={{padding:"10px 12px",fontWeight:700,color:C.text}}>{d.patient_nom||"—"}</td>
                    <td style={{padding:"10px 12px",color:C.muted}}>{d.compagnie||"—"}</td>
                    <td style={{padding:"10px 12px",fontWeight:700,color:C.text}}>{fmt(d.montant_total)} F</td>
                    <td style={{padding:"10px 12px",fontWeight:700,color:C.green}}>{fmt(d.montant_assur)} F</td>
                    <td style={{padding:"10px 12px",color:C.amber}}>{fmt(d.ticket_moder)} F</td>
                    <td style={{padding:"10px 12px"}}><Badge color={{valide:"green",en_attente:"amber",soumis:"blue",rejete:"red"}[d.statut]||"gray"}>{d.statut}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
      <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="🛡️ Ajouter une compagnie d'assurance">
        <Inp label="Nom de la compagnie *" required value={form.nom} onChange={f("nom")} placeholder="NSIA Assurances"/>
        <Grid cols={2} gap={12}>
          <Sel label="Type" value={form.type} onChange={f("type")} options={["Privée","Publique","Mutuelle","Internationale"]}/>
          <Inp label="Taux de couverture (%)" type="number" value={form.taux_couverture} onChange={f("taux_couverture")} placeholder="80"/>
        </Grid>
        <Inp label="Contact principal" value={form.contact} onChange={f("contact")} placeholder="Nom du responsable partenariats"/>
        <Inp label="Email" type="email" value={form.email} onChange={f("email")} placeholder="partenariats@compagnie.ci"/>
        <Inp label="Zones couvertes" value={form.zones} onChange={f("zones")} placeholder="Côte d'Ivoire, Sénégal, Mali…"/>
        <div style={{display:"flex",gap:10}}>
          <Btn variant="outline" style={{flex:1}} onClick={()=>setShowAdd(false)}>Annuler</Btn>
          <Btn style={{flex:2}} onClick={()=>{if(!form.nom){toast.error("Nom requis");return;}toast.success(`Compagnie ${form.nom} ajoutée !`);setShowAdd(false);}}>Ajouter la compagnie</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// FACTURES GLOBALES
// ════════════════════════════════════════════════════════════════════
function PageFactures(){
  const [filter,setFilter]=useState("");
  const {data,isLoading}=useQuery({queryKey:["adm-factures"],queryFn:()=>api.get("/factures").then(r=>r.data.data||[]).catch(()=>[])});
  const factures=data||[];
  const payees=factures.filter(f=>f.statut==="payee");
  const impayees=factures.filter(f=>f.statut==="en_attente");
  const totalPaye=payees.reduce((s,f)=>s+(+f.montant_total||0),0);
  const totalImpaye=impayees.reduce((s,f)=>s+(+f.montant_total||0),0);
  const filtered=factures.filter(f=>!filter||f.statut===filter);
  return(
    <div>
      <PageHeader title="💸 Gestion des Factures" subtitle="Toutes les factures de la plateforme"/>
      <Grid cols={4} gap={14} style={{marginBottom:20}}>
        <Card label="Total factures" value={factures.length} icon="📄" color={C.blue}/>
        <Card label="Montant payé" value={`${fmt(totalPaye)} F`} icon="✅" color={C.green} sub={`${payees.length} factures`}/>
        <Card label="Impayées" value={`${fmt(totalImpaye)} F`} icon="⚠️" color={C.amber} sub={`${impayees.length} factures`}/>
        <Card label="Taux règlement" value={`${factures.length>0?Math.round(payees.length/factures.length*100):0}%`} icon="📊" color={C.green}/>
      </Grid>
      <div style={{display:"flex",gap:10,marginBottom:14}}>
        {[["","Toutes"],["payee","Payées ✅"],["en_attente","Impayées ⚠️"]].map(([v,l])=>(
          <button key={v} onClick={()=>setFilter(v)} style={{background:filter===v?C.input:C.hover,border:`1.5px solid ${filter===v?C.green:C.border}`,borderRadius:8,padding:"7px 16px",cursor:"pointer",fontSize:12,fontWeight:filter===v?700:400,color:filter===v?C.text:C.muted,fontFamily:"inherit"}}>{l}</button>
        ))}
      </div>
      {isLoading?<Loader/>:(
        <Panel>
          {filtered.length===0?<Empty icon="💸" title="Aucune facture"/>:(
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <THead cols={["Référence","Montant total","Part assur.","Ticket modér.","Mode paiement","Statut","Date"]}/>
                <tbody>
                  {filtered.slice(0,50).map(f=>(
                    <tr key={f.id} style={{borderBottom:`1px solid ${C.border}`}} onMouseOver={e=>e.currentTarget.style.background=C.hover} onMouseOut={e=>e.currentTarget.style.background="transparent"}>
                      <td style={{padding:"10px 12px",fontFamily:"monospace",fontSize:12,color:C.teal}}>{f.reference||f.id?.slice(-8).toUpperCase()||"—"}</td>
                      <td style={{padding:"10px 12px",fontWeight:800,color:C.text}}>{fmt(f.montant_total)} F</td>
                      <td style={{padding:"10px 12px",color:C.green}}>{fmt(f.montant_assur||0)} F</td>
                      <td style={{padding:"10px 12px",color:C.amber}}>{fmt(f.ticket_moder||f.montant_total)} F</td>
                      <td style={{padding:"10px 12px",color:C.muted,fontSize:12}}>{f.mode_paiement||"—"}</td>
                      <td style={{padding:"10px 12px"}}><Badge color={f.statut==="payee"?"green":"amber"}>{f.statut==="payee"?"Payée":"Impayée"}</Badge></td>
                      <td style={{padding:"10px 12px",color:C.dim,fontSize:11}}>{fmtDate(f.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// CAISSE
// ════════════════════════════════════════════════════════════════════
function PageCaisse(){
  const {data:cliniques}=useQuery({queryKey:["adm-clin"],queryFn:()=>aAPI.cliniques().then(r=>r.data.data||[])});
  const CL=cliniques||[];
  const SESSIONS_DEMO=CL.map((c,i)=>({id:c.id,clinique:c.nom||"Clinique",date:new Date().toISOString().split("T")[0],statut:i%3===0?"fermee":"ouverte",total_encaisse:Math.floor(150000+Math.random()*500000),total_decaisse:Math.floor(20000+Math.random()*80000),nb_transactions:Math.floor(5+Math.random()*30)}));
  const totalEncaisse=SESSIONS_DEMO.reduce((s,c)=>s+c.total_encaisse,0);
  const totalDecaisse=SESSIONS_DEMO.reduce((s,c)=>s+c.total_decaisse,0);
  const net=totalEncaisse-totalDecaisse;
  return(
    <div>
      <PageHeader title="🏦 Gestion de la Caisse" subtitle="Sessions de caisse · Encaissements · Soldes par clinique"/>
      <Grid cols={4} gap={14} style={{marginBottom:20}}>
        <Card label="Cliniques avec caisse" value={CL.length} icon="🏥" color={C.teal}/>
        <Card label="Total encaissé" value={`${fmt(totalEncaisse)} F`} icon="💰" color={C.green}/>
        <Card label="Total décaissé" value={`${fmt(totalDecaisse)} F`} icon="💸" color={C.amber}/>
        <Card label="Solde net" value={`${fmt(net)} F`} icon="📊" color={net>0?C.green:C.red}/>
      </Grid>
      <Panel title="📋 Sessions de caisse du jour">
        {CL.length===0?<Empty icon="🏦" title="Aucune clinique"/>:(
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <THead cols={["Clinique","Date","Statut","Encaissé","Décaissé","Solde net","Transactions"]}/>
              <tbody>
                {SESSIONS_DEMO.map(s=>{const solde=s.total_encaisse-s.total_decaisse;return(
                  <tr key={s.id} style={{borderBottom:`1px solid ${C.border}`}} onMouseOver={e=>e.currentTarget.style.background=C.hover} onMouseOut={e=>e.currentTarget.style.background="transparent"}>
                    <td style={{padding:"10px 12px",fontWeight:700,color:C.text}}>{s.clinique}</td>
                    <td style={{padding:"10px 12px",color:C.dim,fontSize:12}}>{fmtDate(s.date)}</td>
                    <td style={{padding:"10px 12px"}}><Badge color={s.statut==="ouverte"?"green":"gray"}>{s.statut==="ouverte"?"🟢 Ouverte":"⬜ Fermée"}</Badge></td>
                    <td style={{padding:"10px 12px",fontWeight:700,color:C.green}}>{fmt(s.total_encaisse)} F</td>
                    <td style={{padding:"10px 12px",color:C.amber}}>{fmt(s.total_decaisse)} F</td>
                    <td style={{padding:"10px 12px",fontWeight:800,color:solde>0?C.green:C.red}}>{fmt(solde)} F</td>
                    <td style={{padding:"10px 12px",color:C.muted}}>{s.nb_transactions} opér.</td>
                  </tr>
                );})}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// LIVREURS
// ════════════════════════════════════════════════════════════════════
function PageLivreurs(){
  const {data,isLoading}=useQuery({queryKey:["adm-cmds"],queryFn:()=>aAPI.commandes().then(r=>r.data.data||[])});
  const {data:users}=useQuery({queryKey:["adm-users"],queryFn:()=>aAPI.users().then(r=>r.data.data||[])});
  const cmds=data||[]; const livrees=cmds.filter(c=>c.statut==="livree"); const livreurs=(users||[]).filter(u=>u.role==="livreur");
  return(
    <div>
      <PageHeader title="🛵 Supervision Livreurs" subtitle="Commandes · Revenus · Commissions MediConnect"/>
      <Grid cols={4} gap={14} style={{marginBottom:20}}>
        <Card label="Livreurs inscrits" value={livreurs.length} icon="🛵" color={C.amber}/>
        <Card label="Livraisons totales" value={cmds.length} icon="📦" color={C.blue}/>
        <Card label="Livrées" value={livrees.length} icon="✅" color={C.green}/>
        <Card label="Commission platef." value={`${fmt(livrees.length*T.livraison_plateforme)} F`} icon="💰" color={C.green} sub={`${livrees.length} × ${fmt(T.livraison_plateforme)} F`}/>
      </Grid>
      {isLoading?<Loader/>:(
        <Panel title={`📋 Toutes les commandes (${cmds.length})`}>
          {cmds.length===0?<Empty icon="📦" title="Aucune commande"/>:(
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <THead cols={["Référence","Adresse","Statut","Client","Livreur","Plateforme"]}/>
                <tbody>
                  {cmds.slice(0,50).map(c=>(
                    <tr key={c.id} style={{borderBottom:`1px solid ${C.border}`}} onMouseOver={e=>e.currentTarget.style.background=C.hover} onMouseOut={e=>e.currentTarget.style.background="transparent"}>
                      <td style={{padding:"10px 12px",fontFamily:"monospace",fontSize:12,color:C.green}}>#{c.id?.slice(-8).toUpperCase()}</td>
                      <td style={{padding:"10px 12px",color:C.muted,fontSize:12}}>{c.adresse_livr||"—"}</td>
                      <td style={{padding:"10px 12px"}}><Badge color={{livre:"green",en_livraison:"teal",remis_livreur:"amber",annule:"red"}[c.statut]||"gray"}>{c.statut}</Badge></td>
                      <td style={{padding:"10px 12px",fontWeight:700,color:C.text}}>{fmt(T.livraison_total)} F</td>
                      <td style={{padding:"10px 12px",color:C.amber,fontWeight:700}}>{fmt(T.livraison_livreur)} F</td>
                      <td style={{padding:"10px 12px",fontWeight:700,color:C.green}}>{fmt(T.livraison_plateforme)} F</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// ASSURANCES
// ════════════════════════════════════════════════════════════════════
function PageAssurances(){
  const {data,isLoading}=useQuery({queryKey:["adm-ass"],queryFn:()=>aAPI.assurances().then(r=>r.data.data||[])});
  const d=data||[];
  return(
    <div>
      <PageHeader title="🛡️ Assurances & Tiers-payant" subtitle="Supervision des dossiers de remboursement"/>
      <Grid cols={4} gap={14} style={{marginBottom:20}}>
        <Card label="Total dossiers" value={d.length} icon="📁"/>
        <Card label="Validés" value={d.filter(x=>x.statut==="valide").length} icon="✅" color={C.green}/>
        <Card label="En attente" value={d.filter(x=>["soumis","en_attente"].includes(x.statut)).length} icon="⏳" color={C.amber}/>
        <Card label="Montant validé" value={`${fmt(d.filter(x=>x.statut==="valide").reduce((s,x)=>s+(+x.montant_assur||0),0))} F`} icon="💰" color={C.green}/>
      </Grid>
      {isLoading?<Loader/>:(
        <Panel>
          {d.length===0?<Empty icon="🛡️" title="Aucun dossier assurance"/>:(
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <THead cols={["Référence","Patient","Compagnie","Montant total","Part assur.","Statut"]}/>
                <tbody>
                  {d.map(x=>(
                    <tr key={x.id} style={{borderBottom:`1px solid ${C.border}`}} onMouseOver={e=>e.currentTarget.style.background=C.hover} onMouseOut={e=>e.currentTarget.style.background="transparent"}>
                      <td style={{padding:"10px 12px",fontFamily:"monospace",fontSize:12,color:C.teal}}>{x.reference||"—"}</td>
                      <td style={{padding:"10px 12px",fontWeight:700,color:C.text}}>{x.patient_nom||"—"}</td>
                      <td style={{padding:"10px 12px",color:C.muted}}>{x.compagnie||"—"}</td>
                      <td style={{padding:"10px 12px",fontWeight:700,color:C.text}}>{fmt(x.montant_total)} F</td>
                      <td style={{padding:"10px 12px",fontWeight:700,color:C.green}}>{fmt(x.montant_assur)} F</td>
                      <td style={{padding:"10px 12px"}}><Badge color={{valide:"green",en_attente:"amber",soumis:"blue",rejete:"red"}[x.statut]||"gray"}>{x.statut}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// STATISTIQUES
// ════════════════════════════════════════════════════════════════════
function PageStatistiques(){
  const {data:users}=useQuery({queryKey:["adm-users"],queryFn:()=>aAPI.users().then(r=>r.data.data||[])});
  const {data:clin}=useQuery({queryKey:["adm-clin"],queryFn:()=>aAPI.cliniques().then(r=>r.data.data||[])});
  const {data:cmds}=useQuery({queryKey:["adm-cmds"],queryFn:()=>aAPI.commandes().then(r=>r.data.data||[])});
  const {data:pats}=useQuery({queryKey:["adm-pats"],queryFn:()=>aAPI.patients().then(r=>r.data.data||[])});
  const U=users||[];const CL=clin||[];const CMD=cmds||[];const PT=pats||[];
  const livrees=CMD.filter(c=>c.statut==="livree").length;
  const revT=livrees*T.livraison_plateforme+CL.length*T.clinique_mensuel+PT.length*T.patient_standard;
  const BASE_REV=[42000,65000,58000,89000,112000,98000,134000,145000,167000,189000,201000,Math.max(revT,220000)];
  const BASE_USR=[12,18,24,31,38,45,54,63,72,82,91,Math.max(U.length,100)];
  const maxRev=Math.max(...BASE_REV); const maxUsr=Math.max(...BASE_USR);
  const byRole=U.reduce((a,u)=>({...a,[u.role]:(a[u.role]||0)+1}),{});
  const tauxLiv=CMD.length>0?Math.round(livrees/CMD.length*100):0;
  return(
    <div>
      <PageHeader title="📊 Statistiques globales" subtitle="Vue d'ensemble de la plateforme MediConnect Africa"/>
      <Grid cols={4} gap={14} style={{marginBottom:24}}>
        <Card label="Utilisateurs" value={U.length} icon="👥" color={C.blue} trend={12}/>
        <Card label="Cliniques" value={CL.length} icon="🏥" color={C.teal} trend={5}/>
        <Card label="Livraisons OK" value={livrees} icon="🛵" color={C.amber} trend={18}/>
        <Card label="Rev. mensuel est." value={`${fmt(revT)} F`} icon="💰" color={C.green} trend={8}/>
      </Grid>
      <Grid cols={2} gap={20} style={{marginBottom:20}}>
        <Panel title="📈 Revenus mensuels (12 mois)">
          <div style={{display:"flex",alignItems:"flex-end",gap:5,height:150,paddingTop:16}}>
            {BASE_REV.map((v,i)=>{const h=Math.round((v/maxRev)*100),isL=i===11;return(<div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>{isL&&<div style={{fontSize:9,color:C.green,fontWeight:700}}>{Math.round(v/1000)}k</div>}<div style={{width:"100%",height:`${h}%`,background:isL?`linear-gradient(to top,${C.green},${C.teal})`:"rgba(10,143,88,.25)",borderRadius:"3px 3px 0 0"}}/><div style={{fontSize:8,color:C.dim}}>{MOIS[i]}</div></div>);})}
          </div>
        </Panel>
        <Panel title="📈 Croissance utilisateurs (12 mois)">
          <div style={{display:"flex",alignItems:"flex-end",gap:5,height:150,paddingTop:16}}>
            {BASE_USR.map((v,i)=>{const h=Math.round((v/maxUsr)*100),isL=i===11;return(<div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>{isL&&<div style={{fontSize:9,color:C.blue,fontWeight:700}}>{v}</div>}<div style={{width:"100%",height:`${h}%`,background:isL?`linear-gradient(to top,${C.blue},${C.purple})`:"rgba(37,99,235,.25)",borderRadius:"3px 3px 0 0"}}/><div style={{fontSize:8,color:C.dim}}>{MOIS[i]}</div></div>);})}
          </div>
        </Panel>
        <Panel title="🎯 Indicateurs clés de performance">
          {[{l:"Taux de livraison réussie",v:tauxLiv,c:tauxLiv>=70?C.green:C.amber},{l:"Cliniques / objectif 50",v:Math.round(CL.length/50*100),c:C.teal,s:`${CL.length}/50`},{l:"Patients / objectif 1 000",v:Math.round(PT.length/1000*100),c:C.blue,s:`${PT.length}/1000`},{l:"Rev. / objectif 500 000 F/mois",v:Math.min(100,Math.round(revT/5000)),c:C.green,s:`${fmt(revT)}/500k`}].map(k=>(
            <div key={k.l} style={{marginBottom:16}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:5,fontSize:13}}><span style={{color:C.muted}}>{k.l}</span><span style={{fontWeight:700,color:k.c}}>{k.s||`${k.v}%`}</span></div><ProgressBar value={k.v} max={100} color={k.c}/></div>
          ))}
        </Panel>
        <Panel title="👥 Répartition des utilisateurs">
          {Object.entries(ROLE_META).map(([role,meta])=>{const count=byRole[role]||0,pct=U.length>0?Math.round(count/U.length*100):0;return(<div key={role} style={{marginBottom:14}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:5,fontSize:13}}><span style={{color:C.muted}}>{meta.icon} {meta.label}</span><span style={{fontWeight:700,color:C[meta.color]||C.muted}}>{count} ({pct}%)</span></div><ProgressBar value={count} max={Math.max(U.length,1)} color={C[meta.color]||C.muted}/></div>);})}
        </Panel>
      </Grid>
      <Panel title="📄 Rapports & Exports">
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:12}}>
          {[["📊","Rapport mensuel","Synthèse revenus & KPIs"],["📈","Bilan trimestriel","Performances Q1-Q4"],["👥","Export utilisateurs","CSV complet"],["🏥","Rapport cliniques","Abonnements & facturation"],["🛵","Rapport livraisons","Commissions détaillées"],["💰","États financiers","Comptabilité plateforme"]].map(([icon,titre,desc])=>(
            <button key={titre} onClick={()=>toast.success(`Rapport "${titre}" en cours de génération…`)} style={{background:C.hover,border:`1px solid ${C.border}`,borderRadius:12,padding:16,cursor:"pointer",textAlign:"left",fontFamily:"inherit",transition:"border-color .15s"}} onMouseOver={e=>e.currentTarget.style.borderColor=C.green} onMouseOut={e=>e.currentTarget.style.borderColor=C.border}>
              <div style={{fontSize:26,marginBottom:8}}>{icon}</div>
              <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:3}}>{titre}</div>
              <div style={{fontSize:11,color:C.dim}}>{desc}</div>
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// PAIEMENTS
// ════════════════════════════════════════════════════════════════════
function PagePaiements(){
  const [modeFilter,setModeFilter]=useState("");
  const [typeFilter,setTypeFilter]=useState("");
  const {data}=useQuery({queryKey:["adm-factures"],queryFn:()=>api.get("/factures").then(r=>r.data.data||[]).catch(()=>[])});
  const factures=(data||[]).filter(f=>f.statut==="payee");
  const parMode={};
  factures.forEach(f=>{const mode=f.mode_paiement||"Espèces";if(!parMode[mode])parMode[mode]={count:0,total:0};parMode[mode].count++;parMode[mode].total+=+f.montant_total||0;});
  const PAIEMENTS_DEMO=[
    {id:"PAY001",type:"Abonnement patient",partenaire:"Koné Adjoua",mode:"Wave",montant:300,statut:"confirmé",date:new Date().toISOString(),ref:"WAVE-2026-001"},
    {id:"PAY002",type:"Mise en relation",partenaire:"Bamba Moussa",mode:"Orange Money",montant:1000,statut:"confirmé",date:new Date().toISOString(),ref:"OM-2026-002"},
    {id:"PAY003",type:"Abonnement médecin indép.",partenaire:"Dr. Konan Adjoua",mode:"Wave",montant:500,statut:"confirmé",date:new Date().toISOString(),ref:"WAVE-2026-003"},
    {id:"PAY004",type:"Abonnement clinique",partenaire:"Clinique Sainte Marie",mode:"Virement",montant:3000,statut:"confirmé",date:new Date().toISOString(),ref:"VIR-2026-004"},
    {id:"PAY005",type:"Commission livraison",partenaire:"Livreur Diallo",mode:"Wave",montant:500,statut:"en_attente",date:new Date().toISOString(),ref:"WAVE-2026-005"},
  ];
  const totalRecu=[...factures,...PAIEMENTS_DEMO].reduce((s,p)=>s+(+p.montant||+p.montant_total||0),0);
  const modeStats=[
    {mode:"Wave",icon:"🌊",color:"#1DA6F2",total:(parMode["Wave"]?.total||0)+PAIEMENTS_DEMO.filter(p=>p.mode==="Wave").reduce((s,p)=>s+p.montant,0),count:(parMode["Wave"]?.count||0)+PAIEMENTS_DEMO.filter(p=>p.mode==="Wave").length},
    {mode:"Orange Money",icon:"🟠",color:"#FF6600",total:parMode["Orange Money"]?.total||0,count:parMode["Orange Money"]?.count||0},
    {mode:"MTN MoMo",icon:"🟡",color:"#FFCC00",total:parMode["MTN MoMo"]?.total||0,count:parMode["MTN MoMo"]?.count||0},
    {mode:"Moov Money",icon:"🔵",color:"#0066CC",total:parMode["Moov Money"]?.total||0,count:parMode["Moov Money"]?.count||0},
    {mode:"Espèces",icon:"💵",color:C.green,total:parMode["Espèces"]?.total||0,count:parMode["Espèces"]?.count||0},
    {mode:"Virement",icon:"🏦",color:C.teal,total:parMode["Virement"]?.total||0,count:parMode["Virement"]?.count||0},
  ];
  const allPaiements=[...PAIEMENTS_DEMO,...factures.slice(0,20).map(f=>({id:f.id,type:"Facture",partenaire:"—",mode:f.mode_paiement||"Espèces",montant:f.montant_total,statut:f.statut==="payee"?"confirmé":"en_attente",date:f.created_at,ref:f.reference||"—"}))].filter(p=>(!modeFilter||p.mode===modeFilter)&&(!typeFilter||p.type===typeFilter));
  return(
    <div>
      <PageHeader title="💳 Paiements reçus" subtitle="Mobile Money · Espèces · Virements · Tous les flux entrants MediConnect"/>
      <Grid cols={4} gap={14} style={{marginBottom:20}}>
        <Card label="Total reçu ce mois" value={`${fmt(totalRecu)} F`} icon="💰" color={C.green}/>
        <Card label="Transactions" value={allPaiements.length} icon="📊" color={C.blue}/>
        <Card label="Via Mobile Money" value={`${fmt(modeStats.filter(m=>["Wave","Orange Money","MTN MoMo","Moov Money"].includes(m.mode)).reduce((s,m)=>s+m.total,0))} F`} icon="📱" color={C.teal}/>
        <Card label="En attente confirm." value={allPaiements.filter(p=>p.statut==="en_attente").length} icon="⏳" color={C.amber}/>
      </Grid>
      <Panel title="📱 Canaux de paiement" style={{marginBottom:20}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
          {modeStats.map(m=>(
            <div key={m.mode} style={{background:`${m.color}10`,border:`1.5px solid ${m.color}30`,borderRadius:12,padding:16,display:"flex",alignItems:"center",gap:14}}>
              <span style={{fontSize:28}}>{m.icon}</span>
              <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700,color:m.color,marginBottom:4}}>{m.mode}</div><div style={{fontSize:20,fontWeight:900,color:C.text}}>{fmt(m.total)} F</div><div style={{fontSize:11,color:C.dim}}>{m.count} transaction(s)</div></div>
            </div>
          ))}
        </div>
      </Panel>
      <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
        <select value={modeFilter} onChange={e=>setModeFilter(e.target.value)} style={{background:C.input,border:`1px solid ${C.border}`,borderRadius:9,padding:"8px 14px",color:C.text,fontSize:13,outline:"none",fontFamily:"inherit"}}>
          <option value="">Tous les modes</option>
          {["Wave","Orange Money","MTN MoMo","Moov Money","Espèces","Virement"].map(m=><option key={m}>{m}</option>)}
        </select>
        <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} style={{background:C.input,border:`1px solid ${C.border}`,borderRadius:9,padding:"8px 14px",color:C.text,fontSize:13,outline:"none",fontFamily:"inherit"}}>
          <option value="">Tous les types</option>
          {["Abonnement patient","Abonnement médecin indép.","Abonnement clinique","Commission livraison","Facture"].map(t=><option key={t}>{t}</option>)}
        </select>
        {(modeFilter||typeFilter)&&<Btn variant="outline" style={{padding:"8px 14px",fontSize:12}} onClick={()=>{setModeFilter("");setTypeFilter("");}}>✕ Réinitialiser</Btn>}
      </div>
      <Panel title={`📋 Journal des paiements (${allPaiements.length})`}>
        {allPaiements.length===0?<Empty icon="💳" title="Aucun paiement"/>:(
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <THead cols={["Référence","Type","Partenaire","Mode","Montant","Statut","Date"]}/>
              <tbody>
                {allPaiements.map((p,i)=>(
                  <tr key={p.id||i} style={{borderBottom:`1px solid ${C.border}`}} onMouseOver={e=>e.currentTarget.style.background=C.hover} onMouseOut={e=>e.currentTarget.style.background="transparent"}>
                    <td style={{padding:"10px 12px",fontFamily:"monospace",fontSize:12,color:C.teal}}>{p.ref||p.id?.slice(-8)||"—"}</td>
                    <td style={{padding:"10px 12px",fontSize:12,color:C.muted}}>{p.type}</td>
                    <td style={{padding:"10px 12px",fontWeight:700,color:C.text}}>{p.partenaire}</td>
                    <td style={{padding:"10px 12px"}}><span style={{fontSize:12,color:C.text}}>{p.mode}</span></td>
                    <td style={{padding:"10px 12px",fontWeight:800,color:C.green}}>{fmt(p.montant||p.montant_total)} F</td>
                    <td style={{padding:"10px 12px"}}><Badge color={p.statut==="confirmé"?"green":"amber"}>{p.statut==="confirmé"?"✅ Confirmé":"⏳ En attente"}</Badge></td>
                    <td style={{padding:"10px 12px",color:C.dim,fontSize:11}}>{fmtDate(p.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ════════════════════════════════════════════════════════════════════
function PageConfiguration(){
  const [tarifs,setTarifs]=useState({...T});
  const tf=k=>e=>setTarifs(p=>({...p,[k]:+e.target.value}));
  return(
    <div>
      <PageHeader title="⚙️ Configuration plateforme" subtitle="Tarification · Paramètres · Variables système"/>
      <Grid cols={2} gap={20}>
        <Panel title="💰 Tarification (paramètres actifs)" accent="rgba(10,143,88,.25)">
          <div style={{background:"rgba(225,29,72,.08)",border:"1px solid rgba(225,29,72,.2)",borderRadius:8,padding:12,marginBottom:16,fontSize:12,color:C.red}}>⚠️ Toute modification affecte l'ensemble de la plateforme.</div>
          {[["livraison_total","Frais livraison (client)"],["livraison_livreur","Part livreur"],["livraison_plateforme","Commission livraison MediConnect"],["clinique_mise_en_service","Frais mise en service clinique"],["clinique_mensuel","Abonnement mensuel clinique"],["patient_standard","Abonnement mensuel patient standard"],["patient_suivi","Abonnement mensuel patient (suivi privé)"],["medecin_independant","Abonnement mensuel médecin indép."],["mise_en_relation","Frais mise en relation patient/médecin"]].map(([key,label])=>(
            <div key={key} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
              <span style={{fontSize:13,color:C.muted,flex:1}}>{label}</span>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <input type="number" value={tarifs[key]||0} onChange={tf(key)} style={{width:100,background:C.hover,border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 10px",color:C.text,fontSize:13,outline:"none",fontFamily:"inherit",textAlign:"right"}}/>
                <span style={{fontSize:12,color:C.dim,minWidth:30}}>FCFA</span>
              </div>
            </div>
          ))}
          <Btn style={{width:"100%",marginTop:16}} onClick={()=>toast.success("✅ Tarification sauvegardée !")}>Sauvegarder la tarification</Btn>
        </Panel>
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <Panel title="🌍 Zones de couverture">
            <div style={{marginBottom:12}}><div style={{fontSize:12,fontWeight:700,color:C.green,marginBottom:8}}>✅ UEMOA (8 pays)</div><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{["Côte d'Ivoire","Sénégal","Burkina Faso","Mali","Togo","Bénin","Guinée-Bissau","Niger"].map(p=><span key={p} style={{background:"rgba(10,143,88,.1)",color:C.green,fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:20}}>{p}</span>)}</div></div>
            <div><div style={{fontSize:12,fontWeight:700,color:C.teal,marginBottom:8}}>✅ CEMAC (6 pays)</div><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{["Cameroun","Gabon","Congo","Tchad","RCA","Guinée Équatoriale"].map(p=><span key={p} style={{background:"rgba(13,148,136,.1)",color:C.teal,fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:20}}>{p}</span>)}</div></div>
          </Panel>
          <Panel title="🔧 Informations système">
            {[["Version","MediConnect v2.0"],["Backend","Vercel Serverless (Node.js)"],["Base de données","Neon PostgreSQL"],["Frontend","mediconnect4africa.cloud"],["Admin","admin.mediconnect4africa.cloud"],["API Backend","mediconnect-fed6.vercel.app"]].map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${C.border}`,fontSize:13}}>
                <span style={{color:C.muted}}>{k}</span>
                <span style={{fontWeight:600,color:C.text,fontSize:12}}>{v}</span>
              </div>
            ))}
          </Panel>
          <Panel title="💳 Modes de paiement">
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {[{label:"Wave",icon:"🌊",color:"#1DA6F2",actif:true},{label:"Orange Money",icon:"🟠",color:"#FF6600",actif:true},{label:"Moov Money",icon:"🔵",color:"#0066CC",actif:true},{label:"MTN MoMo",icon:"🟡",color:"#FFCC00",actif:false},{label:"Espèces",icon:"💵",color:C.green,actif:true},{label:"Carte bancaire",icon:"💳",color:C.purple,actif:false}].map(m=>(
                <div key={m.label} style={{background:m.color+"10",border:`1px solid ${m.color}30`,borderRadius:10,padding:"10px 12px",display:"flex",alignItems:"center",gap:8,justifyContent:"space-between"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:18}}>{m.icon}</span><span style={{fontSize:12,fontWeight:700,color:m.color}}>{m.label}</span></div>
                  <Badge color={m.actif?"green":"gray"}>{m.actif?"Actif":"Bientôt"}</Badge>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </Grid>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// ROUTER ADMIN
// ════════════════════════════════════════════════════════════════════
export default function Dashboard(){
  return(
    <Routes>
      <Route index                          element={<PageHome/>}/>
      <Route path="monetisation"            element={<PageMonetisation/>}/>
      <Route path="utilisateurs"            element={<PageUtilisateurs/>}/>
      <Route path="cliniques"               element={<PageCliniques/>}/>
      <Route path="medecins"                element={<PageMedecins/>}/>
      <Route path="medecins-independants"   element={<PageMedecinsIndependants/>}/>
      <Route path="compagnies-assurance"    element={<PageCompagniesAssurance/>}/>
      <Route path="factures"                element={<PageFactures/>}/>
      <Route path="caisse"                  element={<PageCaisse/>}/>
      <Route path="paiements"               element={<PagePaiements/>}/>
      <Route path="livreurs"                element={<PageLivreurs/>}/>
      <Route path="assurances"              element={<PageAssurances/>}/>
      <Route path="statistiques"            element={<PageStatistiques/>}/>
      <Route path="configuration"           element={<PageConfiguration/>}/>
      <Route path="patients"                element={<PageCliniques/>}/>
      <Route path="*"                       element={<PageHome/>}/>
    </Routes>
  );
}
