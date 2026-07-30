import React, { useState, useCallback } from "react";
import ConsultationWorkflow from "../shared/ConsultationWorkflow";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import useAuthStore from "../../context/authStore";
import api from "../../services/api";

// ── Palette & helpers ─────────────────────────────────────────────
const C = {
  green:"#0A8F58", teal:"#0D9488", amber:"#D97706", red:"#E11D48",
  blue:"#2563EB", purple:"#7C3AED", bg:"#060C12", card:"#0E1620",
  input:"#141E2B", hover:"#1A2535", border:"#1E2F42",
  text:"#F0F4F8", muted:"#8BA0B5", dim:"#4E657A",
};
const fmt = (n) => Number(n||0).toLocaleString("fr-CI");
const today = () => new Date().toISOString().split("T")[0];
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("fr-CI",{day:"numeric",month:"short",year:"numeric"}) : "—";

// ── API calls ─────────────────────────────────────────────────────
const cAPI = {
  // Dashboard
  stats:        () => api.get("/cliniques/stats"),
  // RDV & Planning
  rdvs:         (p) => api.get("/rendez-vous", { params: p }).then(r=>({data:{data:r.data||[]}})).catch(()=>({data:{data:[]}})),
  addRdv:       (d) => api.post("/rendez-vous", d),
  updateRdv:    (id,d) => api.put(`/rendez-vous/${id}`, d),
  confirmerRdv:(id)    => api.patch(`/rendez-vous/${id}/confirmer`,{}),
  statutRdv:  (id,s)  => api.patch(`/rendez-vous/${id}/statut`,{statut:s}),
  deleteRdv:    (id) => api.delete(`/rendez-vous/${id}`),
  // DME - Dossiers patients
  patients:     () => api.get("/patients").then(r=>({data:{data:r.data||[]}})).catch(()=>({data:{data:[]}})),
  addPatient:   (d) => api.post("/patients", d),
  consultations:(pid) => api.get(`/consultations?patient_id=${pid}`).then(r=>({data:{data:r.data||[]}})).catch(()=>({data:{data:[]}})),
  addConsult:   (d) => api.post("/consultations", d),
  ordonnances:  (pid) => api.get(`/ordonnances?patient_id=${pid}`),
  addOrdonnance:(d) => api.post("/ordonnances", d),
  // Stock
  stock:        () => api.get("/stock"),
  addStock:     (d) => api.post("/stock", d),
  updateStock:  (id,d) => api.put(`/stock/${id}`, d),
  // Médecins & RH
  medecins:     () => api.get("/medecins"),
  addMedecin:   (d) => api.post("/medecins", d),
  updateMedecin:(id,d) => api.put(`/medecins/${id}`, d),
  // Finance
  factures:     () => api.get("/factures"),
  caisse:       () => api.get("/caisse"),
  // Assurances
  dossiers:     () => api.get("/assurances"),
  addDossier:   (d) => api.post("/assurances", d),
  updateDossier:(id,d) => api.put(`/assurances/${id}`, d),
  deleteDossier:(id) => api.delete(`/assurances/${id}`),
};

// ── UI Components ─────────────────────────────────────────────────
const Card = ({ label, value, icon, color=C.green, sub, onClick }) => (
  <div onClick={onClick} style={{ background:C.input, border:`1.5px solid ${C.border}`, borderRadius:14, padding:"18px 16px", cursor:onClick?"pointer":"default", transition:"border-color .15s" }}
    onMouseOver={e=>onClick&&(e.currentTarget.style.borderColor=color)} onMouseOut={e=>onClick&&(e.currentTarget.style.borderColor=C.border)}>
    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
      {icon && <span style={{ fontSize:18 }}>{icon}</span>}
      <span style={{ fontSize:11, textTransform:"uppercase", letterSpacing:".5px", color:C.dim, fontWeight:700 }}>{label}</span>
    </div>
    <div style={{ fontSize:26, fontWeight:900, color, marginBottom:sub?3:0 }}>{value}</div>
    {sub && <div style={{ fontSize:12, color:C.muted }}>{sub}</div>}
  </div>
);

const Panel = ({ title, children, actions, accent, style:s={} }) => (
  <div style={{ background:C.input, border:`1.5px solid ${accent||C.border}`, borderRadius:14, padding:20, ...s }}>
    {(title||actions) && (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
        {title && <h3 style={{ fontSize:14, fontWeight:700, color:C.text, margin:0 }}>{title}</h3>}
        {actions && <div style={{ display:"flex", gap:8 }}>{actions}</div>}
      </div>
    )}
    {children}
  </div>
);

const Badge = ({ children, color="gray" }) => {
  const m = { green:[C.green,"rgba(10,143,88,.15)"], teal:[C.teal,"rgba(13,148,136,.15)"],
    amber:[C.amber,"rgba(217,119,6,.15)"], red:[C.red,"rgba(225,29,72,.15)"],
    blue:[C.blue,"rgba(37,99,235,.15)"], purple:[C.purple,"rgba(124,58,237,.15)"],
    gray:[C.muted,"rgba(255,255,255,.08)"] };
  const [text,bg] = m[color]||m.gray;
  return <span style={{ background:bg, color:text, fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:20 }}>{children}</span>;
};

const Btn = ({ children, onClick, variant="primary", loading, style:s={}, type="button" }) => {
  const v = {
    primary:{ background:`linear-gradient(135deg,${C.green},${C.teal})`, color:"#fff", border:"none" },
    outline:{ background:"transparent", color:C.muted, border:`1.5px solid ${C.border}` },
    danger: { background:"rgba(225,29,72,.1)", color:C.red, border:`1.5px solid rgba(225,29,72,.25)` },
    amber:  { background:C.amber, color:"#fff", border:"none" },
    blue:   { background:C.blue, color:"#fff", border:"none" },
    purple: { background:C.purple, color:"#fff", border:"none" },
  };
  return (
    <button type={type} onClick={onClick} disabled={loading}
      style={{ borderRadius:9, padding:"9px 18px", fontSize:13, fontWeight:700, cursor:loading?"not-allowed":"pointer", opacity:loading?.65:1, fontFamily:"inherit", transition:"opacity .15s", ...v[variant]||v.primary, ...s }}>
      {loading ? "⏳…" : children}
    </button>
  );
};

const Inp = ({ label, value, onChange, type="text", placeholder, required, style:s={} }) => (
  <div style={{ marginBottom:14, ...s }}>
    <label style={{ display:"block", fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:".5px", marginBottom:5 }}>{label}{required&&" *"}</label>
    <input type={type} value={value||""} onChange={onChange} placeholder={placeholder} required={required}
      style={{ width:"100%", background:C.hover, border:`1.5px solid ${C.border}`, borderRadius:9, padding:"10px 14px", color:C.text, fontSize:14, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }}
      onFocus={e=>e.target.style.borderColor=C.green} onBlur={e=>e.target.style.borderColor=C.border} />
  </div>
);

const Sel = ({ label, value, onChange, options=[], required, style:s={} }) => (
  <div style={{ marginBottom:14, ...s }}>
    <label style={{ display:"block", fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:".5px", marginBottom:5 }}>{label}{required&&" *"}</label>
    <select value={value||""} onChange={onChange} required={required}
      style={{ width:"100%", background:C.hover, border:`1.5px solid ${C.border}`, borderRadius:9, padding:"10px 14px", color:C.text, fontSize:14, outline:"none", fontFamily:"inherit" }}>
      {options.map(o => typeof o==="string" ? <option key={o}>{o}</option> : <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  </div>
);

const Modal = ({ open, onClose, title, children, width=520 }) => {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:28, width, maxWidth:"95vw", maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <h2 style={{ fontSize:17, fontWeight:700, color:C.text, margin:0 }}>{title}</h2>
          <button onClick={onClose} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:20, lineHeight:1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
};

const Loader = () => <div style={{ textAlign:"center", padding:48, color:C.dim }}>⏳ Chargement…</div>;
const Empty = ({ icon, title, subtitle }) => (
  <div style={{ textAlign:"center", padding:"40px 20px", color:C.dim }}>
    <div style={{ fontSize:36, marginBottom:10 }}>{icon}</div>
    {title && <div style={{ fontSize:15, fontWeight:700, color:C.muted, marginBottom:4 }}>{title}</div>}
    {subtitle && <div style={{ fontSize:13 }}>{subtitle}</div>}
  </div>
);
const Grid = ({ cols=2, gap=16, children, style:s={} }) => (
  <div style={{ display:"grid", gridTemplateColumns:`repeat(${cols},1fr)`, gap, ...s }}>{children}</div>
);
const ProgressBar = ({ value, max=100, color=C.green }) => (
  <div style={{ background:C.hover, borderRadius:4, height:5 }}>
    <div style={{ width:`${Math.min(100,Math.round(value/Math.max(max,1)*100))}%`, height:"100%", background:color, borderRadius:4, transition:"width .4s" }} />
  </div>
);

const PageHeader = ({ title, subtitle, actions }) => (
  <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:24 }}>
    <div>
      <h1 style={{ fontSize:22, fontWeight:800, color:C.text, margin:"0 0 4px" }}>{title}</h1>
      {subtitle && <p style={{ fontSize:13, color:C.muted, margin:0 }}>{subtitle}</p>}
    </div>
    {actions && <div style={{ display:"flex", gap:10 }}>{actions}</div>}
  </div>
);

const Table = ({ columns, rows, emptyMsg="Aucune donnée" }) => (
  <div style={{ overflowX:"auto" }}>
    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
      <thead>
        <tr style={{ borderBottom:`1px solid ${C.border}` }}>
          {columns.map(c=><th key={c.key+c.label} style={{ textAlign:"left", padding:"8px 12px", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:".5px", color:C.dim, whiteSpace:"nowrap" }}>{c.label}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.length===0
          ? <tr><td colSpan={columns.length} style={{ textAlign:"center", padding:32, color:C.dim }}>{emptyMsg}</td></tr>
          : rows.map((row,i)=>(
            <tr key={i} style={{ borderBottom:`1px solid ${C.border}` }}
              onMouseOver={e=>e.currentTarget.style.background=C.hover}
              onMouseOut={e=>e.currentTarget.style.background="transparent"}>
              {columns.map(c=><td key={c.key+c.label} style={{ padding:"10px 12px", color:C.text, verticalAlign:"middle" }}>{c.render?c.render(row[c.key],row):row[c.key]??"—"}</td>)}
            </tr>
          ))
        }
      </tbody>
    </table>
  </div>
);

// ════════════════════════════════════════════════════════════════════
//  1. PAGE DASHBOARD HOME
// ════════════════════════════════════════════════════════════════════
function PageHome() {
  const { user } = useAuthStore();
  const nav = useNavigate();
  const { data: stats } = useQuery({ queryKey:["cl-stats"], queryFn:()=>cAPI.stats().then(r=>r.data.data||{}), retry:1 });
  const { data: rdvsData } = useQuery({ queryKey:["cl-rdvs-today"], queryFn:()=>cAPI.rdvs({ date:today() }).then(r=>r.data.data||[]), retry:1 });
  const { data: stockData } = useQuery({ queryKey:["cl-stock-alerts"], queryFn:()=>cAPI.stock().then(r=>r.data.data||[]), retry:1 });

  const rdvs = rdvsData||[]; const stock = stockData||[];
  const alertesStock = stock.filter(s=>s.quantite<=s.seuil_alerte);
  const rdvAujourdhui = rdvs.length;
  const rdvConfirmes = rdvs.filter(r=>r.statut==="confirme").length;

  const modules = [
    { icon:"📅", label:"Planning & RDV",    path:"planning",    color:C.teal,   stat:`${rdvAujourdhui} RDV aujourd'hui` },
    { icon:"👤", label:"Dossiers patients", path:"dossiers",    color:C.blue,   stat:"DME complets" },
    { icon:"🩺", label:"Consultation",      path:"consultation",color:C.green,  stat:"En cours" },
    { icon:"💰", label:"Caisse",            path:"caisse",      color:C.amber,  stat:"Ouverte" },
    { icon:"📄", label:"Facturation",       path:"facturation", color:C.purple, stat:"États financiers" },
    { icon:"👨‍⚕️", label:"Médecins & RH",   path:"medecins",    color:"#0891B2", stat:"Personnel" },
    { icon:"💊", label:"Stock",             path:"stock",       color:alertesStock.length>0?C.red:C.green, stat:alertesStock.length>0?`${alertesStock.length} alertes`:stock.length+" produits" },
    { icon:"🛡️", label:"Assurances",        path:"assurance",   color:C.teal,   stat:"Tiers-payant" },
    { icon:"📋", label:"Qualité & Docs",    path:"qualite",     color:C.purple, stat:"Politiques" },
    { icon:"📊", label:"Statistiques",      path:"stats",       color:C.green,  stat:"Rapports" },
    { icon:"🚶", label:"File d'attente",     path:"file-attente",color:C.teal,   stat:"Accueil patients" },
    { icon:"👁️", label:"Vue Propriétaire",   path:"proprietaire", color:C.amber,  stat:"Surveillance financière" },
    { icon:"🏥", label:"Profil & Logo",       path:"profil-logo",  color:C.purple, stat:"Identité visuelle" },
    { icon:"🩺", label:"Ma file (Médecin)",  path:"file-medecin", color:C.green,  stat:"Mes patients" },
  ];

  return (
    <div>
      <PageHeader title={`🏥 Bienvenue, ${user?.nom||"Clinique"}`} subtitle={`${new Date().toLocaleDateString("fr-CI",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}`} />

      <Grid cols={4} gap={14} style={{ marginBottom:20 }}>
        <Card label="RDV aujourd'hui"   value={rdvAujourdhui}                    icon="📅" color={C.teal}   sub={`${rdvConfirmes} confirmés`} onClick={()=>nav("planning")} />
        <Card label="Alertes stock"     value={alertesStock.length}              icon="⚠️" color={alertesStock.length>0?C.red:C.green} sub="Ruptures proches" onClick={()=>nav("stock")} />
        <Card label="Médecins actifs"   value={stats?.medecins_actifs||"—"}      icon="👨‍⚕️" color={C.blue}  sub="Disponibles" onClick={()=>nav("medecins")} />
        <Card label="Patients ce mois"  value={stats?.patients_mois||"—"}        icon="👤" color={C.purple} sub="Consultations" onClick={()=>nav("dossiers")} />
      </Grid>

      {/* Modules grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:14, marginBottom:24 }}>
        {modules.map(m=>(
          <button key={m.path} onClick={()=>nav(m.path)}
            style={{ background:C.input, border:`1.5px solid ${C.border}`, borderRadius:14, padding:20, cursor:"pointer", textAlign:"left", fontFamily:"inherit", transition:"all .15s" }}
            onMouseOver={e=>{e.currentTarget.style.borderColor=m.color;e.currentTarget.style.transform="translateY(-2px)";}}
            onMouseOut={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.transform="none";}}>
            <div style={{ fontSize:28, marginBottom:10 }}>{m.icon}</div>
            <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:4 }}>{m.label}</div>
            <div style={{ fontSize:11, color:C.dim }}>{m.stat}</div>
          </button>
        ))}
      </div>

      {/* RDV du jour + Alertes */}
      <Grid cols={2} gap={20}>
        <Panel title="📅 RDV du jour" actions={<Btn style={{padding:"6px 14px",fontSize:12}} onClick={()=>nav("planning")}>Tout voir →</Btn>}>
          {rdvs.length===0
            ? <Empty icon="📅" title="Aucun RDV aujourd'hui" />
            : rdvs.slice(0,5).map(r=>(
              <div key={r.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>
                <div style={{ textAlign:"center", minWidth:48, background:C.hover, borderRadius:8, padding:"4px 8px" }}>
                  <div style={{ fontSize:14, fontWeight:800, color:C.text }}>{r.heure_rdv?.slice(0,5)||"—"}</div>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{r.patient_nom||"Patient"}</div>
                  <div style={{ fontSize:11, color:C.muted }}>{r.medecin_nom||"—"} · {r.motif||"Consultation"}</div>
                </div>
                <Badge color={{ confirme:"green", en_attente:"amber", annule:"red" }[r.statut]||"gray"}>{r.statut||"—"}</Badge>
              </div>
            ))
          }
        </Panel>

        <Panel title="⚠️ Alertes stock" actions={<Btn style={{padding:"6px 14px",fontSize:12}} onClick={()=>nav("stock")}>Gérer →</Btn>}>
          {alertesStock.length===0
            ? <Empty icon="✅" title="Stock OK" subtitle="Aucune alerte en cours" />
            : alertesStock.slice(0,5).map(s=>(
              <div key={s.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>
                <span style={{ fontSize:22 }}>💊</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{s.nom}</div>
                  <div style={{ fontSize:11, color:C.muted }}>Stock : {s.quantite} / Seuil : {s.seuil_alerte}</div>
                  <ProgressBar value={s.quantite} max={s.seuil_alerte*2} color={s.quantite===0?C.red:C.amber} />
                </div>
                <Badge color={s.quantite===0?"red":"amber"}>{s.quantite===0?"Rupture":"Alerte"}</Badge>
              </div>
            ))
          }
        </Panel>
      </Grid>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  2. PAGE PLANNING & RDV
// ════════════════════════════════════════════════════════════════════
function PagePlanning() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedDate, setSelectedDate] = useState(today());
  const [form, setForm] = useState({ patient_nom:"", medecin_nom:"", date_rdv:today(), heure_rdv:"09:00", motif:"", assurance:"", statut:"en_attente" });
  const [rdvConsult, setRdvConsult] = useState(null);
  const [rdvCForm, setRdvCForm] = useState({diagnostic:'',traitement:'',tension_arterielle:'',temperature:'',poids:'',taille:'',notes:''});
  const [showWorkflow, setShowWorkflow] = useState(false);
  const [workflowRdv, setWorkflowRdv] = useState(null);

  const { data, isLoading } = useQuery({ queryKey:["cl-rdvs",selectedDate], queryFn:()=>cAPI.rdvs({ date:selectedDate }).then(r=>r.data.data||[]) });
  const rdvs = data||[];

  const addMut = useMutation({ mutationFn:d=>cAPI.addRdv(d), onSuccess:()=>{ toast.success("RDV ajouté !"); qc.invalidateQueries(["cl-rdvs"]); setShowAdd(false); }, onError:()=>toast.error("Erreur") });
  const updMut = useMutation({ mutationFn:({id,statut})=>cAPI.updateRdv(id,{statut}), onSuccess:()=>{ toast.success("RDV mis à jour"); qc.invalidateQueries(["cl-rdvs"]); qc.invalidateQueries(["cl-rdvs-today"]); }, onError:()=>toast.error("Erreur") });
  const confirmerMut = useMutation({ mutationFn:id=>cAPI.confirmerRdv(id), onSuccess:()=>{ toast.success("✅ RDV confirmé !"); qc.invalidateQueries(["cl-rdvs"]); qc.invalidateQueries(["cl-rdvs-today"]); }, onError:()=>toast.error("Erreur confirmation") });
  const addConsRdv = useMutation({ mutationFn:d=>api.post('/consultations/depuis-rdv',d), onSuccess:()=>{ toast.success("✅ Consultation enregistrée !"); qc.invalidateQueries(["cl-rdvs"]); qc.invalidateQueries(["cl-rdvs-today"]); setRdvConsult(null); }, onError:()=>toast.error("Erreur consultation") });
  const delMut = useMutation({ mutationFn:id=>cAPI.deleteRdv(id), onSuccess:()=>{ toast.success("RDV supprimé"); qc.invalidateQueries(["cl-rdvs"]); }, onError:()=>toast.error("Erreur") });

  const f = (k) => e => setForm(p=>({...p,[k]:e.target.value}));

  const statuts = ["en_attente","confirme","en_cours","termine","annule"];
  const statutColor = { en_attente:"amber", confirme:"green", en_cours:"teal", termine:"gray", annule:"red" };

  return (
    <div>
      <PageHeader title="📅 Planning & Rendez-vous" subtitle={`${rdvs.length} RDV pour le ${fmtDate(selectedDate)}`}
        actions={<><Btn onClick={()=>setShowAdd(true)}>+ Nouveau RDV</Btn></>} />

      {/* Sélecteur de date */}
      <div style={{ background:C.input, border:`1px solid ${C.border}`, borderRadius:12, padding:"14px 18px", marginBottom:20, display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
        <label style={{ fontSize:12, fontWeight:700, color:C.muted, textTransform:"uppercase" }}>Date</label>
        <input type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)}
          style={{ background:C.hover, border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 12px", color:C.text, fontSize:14, outline:"none", fontFamily:"inherit" }} />
        <div style={{ display:"flex", gap:8 }}>
          {["Hier","Aujourd'hui","Demain"].map((l,i)=>{
            const d = new Date(); d.setDate(d.getDate()+(i-1));
            const ds = d.toISOString().split("T")[0];
            return <Btn key={l} variant={selectedDate===ds?"primary":"outline"} style={{padding:"7px 14px",fontSize:12}} onClick={()=>setSelectedDate(ds)}>{l}</Btn>;
          })}
        </div>
        <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
          {statuts.map(s => <Badge key={s} color={statutColor[s]}>{rdvs.filter(r=>r.statut===s).length} {s}</Badge>)}
        </div>
      </div>

      {isLoading ? <Loader /> : (
        <Panel>
          {rdvs.length===0
            ? <Empty icon="📅" title="Aucun RDV ce jour" subtitle="Cliquez sur + Nouveau RDV pour en ajouter" />
            : <Table columns={[
                { key:"heure_rdv", label:"Heure", render:v=><span style={{fontFamily:"monospace",fontWeight:700,color:C.teal}}>{v?.slice(0,5)||"—"}</span> },
                { key:"patient_nom", label:"Patient", render:(v,r)=><><div style={{fontWeight:700}}>{v||"—"}</div><div style={{fontSize:11,color:C.muted}}>{r.assurance||"Sans assurance"}</div></> },
                { key:"medecin_nom", label:"Médecin", render:v=>v||"—" },
                { key:"motif", label:"Motif", render:v=><span style={{color:C.muted,fontSize:12}}>{v?.slice(0,40)||"—"}</span> },
                { key:"statut", label:"Statut", render:v=><Badge color={statutColor[v]||"gray"}>{v||"—"}</Badge> },
                { key:"id", label:"Actions", render:(id,row)=>(
                  <div style={{display:"flex",gap:6}}>
                    {row.statut==="en_attente" && <Btn variant="outline" style={{padding:"4px 10px",fontSize:11,color:C.green}} onClick={()=>confirmerMut.mutate(id)}>Confirmer</Btn>}
                    {row.statut==="confirme" && <Btn variant="outline" style={{padding:"4px 10px",fontSize:11,color:C.teal}} onClick={()=>updMut.mutate({id,statut:"en_cours"})}>Démarrer</Btn>}
                    {row.statut==="en_cours" && <Btn style={{padding:"4px 10px",fontSize:11}} onClick={()=>{ setWorkflowRdv(row); setShowWorkflow(true); }}>🩺 Consulter</Btn>}
                    {row.statut==="en_cours" && <Btn variant="outline" style={{padding:"4px 10px",fontSize:11,color:C.muted}} onClick={()=>updMut.mutate({id,statut:"termine"})}>Terminer</Btn>}
                    <Btn variant="outline" style={{padding:"4px 10px",fontSize:11,color:C.red}} onClick={()=>window.confirm("Supprimer ce RDV ?")&&delMut.mutate(id)}>✕</Btn>
                  </div>
                )},
              ]} rows={rdvs} />
          }
        </Panel>
      )}

      <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="📅 Nouveau rendez-vous">
        <Grid cols={2} gap={12}>
          <Inp label="Nom du patient" required value={form.patient_nom} onChange={f("patient_nom")} placeholder="Koné Adjoua" />
          <Inp label="Médecin" value={form.medecin_nom} onChange={f("medecin_nom")} placeholder="Dr. Traoré" />
          <Inp label="Date" type="date" required value={form.date_rdv} onChange={f("date_rdv")} />
          <Inp label="Heure" type="time" required value={form.heure_rdv} onChange={f("heure_rdv")} />
        </Grid>
        <Inp label="Motif" value={form.motif} onChange={f("motif")} placeholder="Consultation générale, suivi…" />
        <Grid cols={2} gap={12}>
          <Sel label="Assurance" value={form.assurance} onChange={f("assurance")} options={["","NSIA","Allianz CI","AXA CI","CNAM (CMU)","Saham","Aucune"]} />
          <Sel label="Statut" value={form.statut} onChange={f("statut")} options={statuts} />
        </Grid>
        <div style={{display:"flex",gap:10}}>
          <Btn variant="outline" style={{flex:1}} onClick={()=>setShowAdd(false)}>Annuler</Btn>
          <Btn style={{flex:2}} loading={addMut.isPending} onClick={()=>addMut.mutate(form)}>Enregistrer le RDV</Btn>
        </div>
      </Modal>

      {/* ConsultationWorkflow partagé */}
      <ConsultationWorkflow
        open={showWorkflow}
        onClose={()=>{ setShowWorkflow(false); setWorkflowRdv(null); }}
        rdv={workflowRdv}
        role="clinique"
        onSuccess={()=>{ qc.invalidateQueries(["cl-rdvs"]); qc.invalidateQueries(["cl-rdvs-today"]); setShowWorkflow(false); setWorkflowRdv(null); }}
      />

      {/* Modal consultation depuis RDV (ancien — gardé pour compatibilité) */}
      {rdvConsult&&(
        <div onClick={()=>setRdvConsult(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'#0E1620',border:'1px solid #1E2F42',borderRadius:16,padding:28,width:540,maxWidth:'95vw',maxHeight:'90vh',overflowY:'auto'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <h2 style={{fontSize:17,fontWeight:700,color:'#F0F4F8',margin:0}}>🩺 {rdvConsult.patient_nom}</h2>
              <button onClick={()=>setRdvConsult(null)} style={{background:'none',border:'none',color:'#8BA0B5',cursor:'pointer',fontSize:20}}>✕</button>
            </div>
            <div style={{background:'rgba(10,143,88,.08)',border:'1px solid rgba(10,143,88,.2)',borderRadius:8,padding:'10px 14px',marginBottom:16,fontSize:12,color:'#8BA0B5'}}>
              {new Date(rdvConsult.date_rdv).toLocaleDateString('fr-CI',{day:'numeric',month:'long'})} · {rdvConsult.heure_rdv?.slice(0,5)} · {rdvConsult.motif||'—'}
            </div>
            {[['Diagnostic *','diagnostic','Hypertension artérielle…'],['Traitement','traitement','Amlodipine 5mg…']].map(([label,key,ph])=>(
              <div key={key} style={{marginBottom:12}}>
                <label style={{display:'block',fontSize:11,fontWeight:700,color:'#8BA0B5',textTransform:'uppercase',marginBottom:4}}>{label}</label>
                <input value={rdvCForm[key]||''} onChange={e=>setRdvCForm(f=>({...f,[key]:e.target.value}))} placeholder={ph}
                  style={{width:'100%',background:'#1A2535',border:'1.5px solid #1E2F42',borderRadius:9,padding:'10px 14px',color:'#F0F4F8',fontSize:14,outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}/>
              </div>
            ))}
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:12}}>
              {[['T.A.','tension_arterielle','120/80'],['Temp °C','temperature','37'],['Poids','poids','70'],['Taille','taille','175']].map(([label,key,ph])=>(
                <div key={key}>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#8BA0B5',textTransform:'uppercase',marginBottom:4}}>{label}</label>
                  <input value={rdvCForm[key]||''} onChange={e=>setRdvCForm(f=>({...f,[key]:e.target.value}))} placeholder={ph}
                    style={{width:'100%',background:'#1A2535',border:'1.5px solid #1E2F42',borderRadius:9,padding:'8px 10px',color:'#F0F4F8',fontSize:12,outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}/>
                </div>
              ))}
            </div>
            <div style={{marginBottom:16}}>
              <label style={{display:'block',fontSize:11,fontWeight:700,color:'#8BA0B5',textTransform:'uppercase',marginBottom:4}}>Notes</label>
              <textarea value={rdvCForm.notes||''} onChange={e=>setRdvCForm(f=>({...f,notes:e.target.value}))} rows={3} placeholder="Observations…"
                style={{width:'100%',background:'#1A2535',border:'1.5px solid #1E2F42',borderRadius:9,padding:'10px 14px',color:'#F0F4F8',fontSize:14,resize:'none',outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}/>
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setRdvConsult(null)} style={{flex:1,padding:'10px',borderRadius:9,background:'transparent',border:'1.5px solid #1E2F42',color:'#8BA0B5',cursor:'pointer',fontSize:13,fontWeight:700,fontFamily:'inherit'}}>Annuler</button>
              <button disabled={addConsRdv.isPending} onClick={()=>{
                if(!rdvCForm.diagnostic){toast.error('Diagnostic requis');return;}
                addConsRdv.mutate({rdv_id:rdvConsult.id,patient_id:rdvConsult.patient_id,motif:rdvConsult.motif||rdvCForm.diagnostic,...rdvCForm});
              }} style={{flex:2,padding:'10px',borderRadius:9,background:'linear-gradient(135deg,#0A8F58,#0D9488)',border:'none',color:'#fff',cursor:addConsRdv.isPending?'not-allowed':'pointer',fontSize:13,fontWeight:700,fontFamily:'inherit',opacity:addConsRdv.isPending?.65:1}}>
                {addConsRdv.isPending?'⏳…':'✅ Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  3. PAGE DME — DOSSIERS MÉDICAUX ÉLECTRONIQUES
// ════════════════════════════════════════════════════════════════════
function PageDossiers() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState("infos");
  const [showAdd, setShowAdd] = useState(false);
  const [showConsult, setShowConsult] = useState(false);
  const [newPatient, setNewPatient] = useState(null); // patient créé avec son code
  const [rdvConsult, setRdvConsult] = useState(null); // RDV depuis lequel on ouvre une consultation
  const [rdvCForm, setRdvCForm] = useState({diagnostic:'',traitement:'',tension_arterielle:'',temperature:'',poids:'',taille:'',notes:''});
  const [showOrd, setShowOrd] = useState(false);
  const [pForm, setPForm] = useState({ prenom:"", nom:"", telephone:"", date_naissance:"", groupe_sanguin:"", allergies:"", antecedents:"", email:"", assurance:"", numero_police:"", est_assure:false });
  const [cForm, setCForm] = useState({ diagnostic:"", traitement:"", notes:"", tension_arterielle:"", temperature:"", poids:"", taille:"" });
  const [oForm, setOForm] = useState({ medicaments:"", duree:"", posologie:"", notes_ord:"" });

  const { data, isLoading } = useQuery({ queryKey:["cl-patients"], queryFn:()=>cAPI.patients().then(r=>r.data.data||[]) });
  const { data: consults } = useQuery({ queryKey:["cl-consults",selected?.id], queryFn:()=>selected?cAPI.consultations(selected.id).then(r=>r.data.data||[]):[], enabled:!!selected });
  const { data: ords } = useQuery({ queryKey:["cl-ords",selected?.id], queryFn:async()=>{
    if(!selected) return [];
    const r = await fetch(`https://mediconnect-backend-v2.vercel.app/api/ordonnances?patient_id=${selected.id}`,{headers:{Authorization:`Bearer ${token}`}});
    const d = await r.json();
    return d.data||[];
  }, enabled:!!selected });
  const { data: examens } = useQuery({ queryKey:["cl-examens",selected?.id], queryFn:async()=>{
    if(!selected) return [];
    const r = await fetch(`https://mediconnect-backend-v2.vercel.app/api/examens?patient_id=${selected.id}`,{headers:{Authorization:`Bearer ${token}`}});
    const d = await r.json(); return d.data||[];
  }, enabled:!!selected });

  const patients = (data||[]).filter(p => {
    const q = search.toLowerCase();
    return !q || `${p.prenom} ${p.nom} ${p.telephone||""}`.toLowerCase().includes(q);
  });

  const addPat = useMutation({ mutationFn:d=>cAPI.addPatient(d), onSuccess:(data)=>{ toast.success("✅ Patient créé !"); qc.invalidateQueries(["cl-patients"]); setShowAdd(false); setNewPatient(data?.data?.data||data?.data||data); }, onError:()=>toast.error("Erreur") });
  const addCons = useMutation({ mutationFn:d=>cAPI.addConsult(d), onSuccess:()=>{ toast.success("Consultation enregistrée !"); qc.invalidateQueries(["cl-consults",selected?.id]); setShowConsult(false); }, onError:()=>toast.error("Erreur") });
  const addConsRdv = useMutation({
    mutationFn: d => api.post('/consultations/depuis-rdv', d),
    onSuccess: () => { toast.success("✅ Consultation enregistrée !"); qc.invalidateQueries(["cl-rdvs"]); qc.invalidateQueries(["cl-rdvs-today"]); setRdvConsult(null); },
    onError: e => toast.error("Erreur: "+(e?.message||"Réessayez")),
  });
  const addOrd = useMutation({ mutationFn:d=>cAPI.addOrdonnance(d), onSuccess:()=>{ toast.success("Ordonnance créée !"); qc.invalidateQueries(["cl-ords",selected?.id]); setShowOrd(false); }, onError:()=>toast.error("Erreur") });

  const imprimerOrdonnance = async (o) => {
    const logoR = await fetch(`https://mediconnect-backend-v2.vercel.app/api/clinique/profil`,{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.json()).catch(()=>({data:null}));
    const cl = logoR.data;
    const win = window.open('','_blank');
    win.document.write(`
      <html><head><title>Ordonnance</title>
      <style>
        body{font-family:Arial,sans-serif;padding:30px;color:#1a2e25;max-width:600px;margin:0 auto;}
        .header{display:flex;align-items:center;gap:16px;padding-bottom:12px;border-bottom:3px solid #0A8F58;margin-bottom:20px;}
        .logo{height:60px;object-fit:contain;}
        .clinique-nom{font-size:18px;font-weight:700;color:#065F3C;}
        .clinique-info{font-size:11px;color:#5A7A94;}
        h2{color:#0A8F58;font-size:16px;margin:0 0 16px;text-align:center;text-transform:uppercase;letter-spacing:1px;}
        .section{margin-bottom:14px;}
        .label{font-size:11px;color:#8BA0B5;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px;}
        .value{font-size:14px;color:#1a2e25;font-weight:500;}
        .patient{background:#E8F8F1;border-radius:8px;padding:12px;margin-bottom:16px;}
        .medicament{background:#f8f9fa;border-left:3px solid #0A8F58;padding:12px;border-radius:4px;margin-bottom:10px;}
        .footer{margin-top:40px;border-top:1px solid #e5e7eb;padding-top:16px;display:flex;justify-content:space-between;font-size:11px;color:#8BA0B5;}
        .signature{text-align:right;}
        @media print{button{display:none;}}
      </style></head><body>
      <div class="header">
        ${cl?.logo?`<img src="${cl.logo}" class="logo" alt="Logo"/>`:''}
        <div>
          <div class="clinique-nom">${cl?.nom||'MediConnect Africa'}</div>
          <div class="clinique-info">${cl?.adresse_complete||cl?.adresse||''} ${cl?.ville?'· '+cl.ville:''}</div>
          <div class="clinique-info">${cl?.telephone||''} ${cl?.email?'· '+cl.email:''}</div>
          ${cl?.horaires?`<div class="clinique-info">${cl.horaires}</div>`:''}
        </div>
      </div>
      <h2>📋 Ordonnance Médicale</h2>
      <div class="patient">
        <div class="label">Patient</div>
        <div class="value" style="font-size:16px;font-weight:700;">${selected?.prenom||''} ${selected?.nom||''}</div>
        ${selected?.date_naissance?`<div class="clinique-info">Né(e) le ${new Date(selected.date_naissance).toLocaleDateString('fr-CI')}</div>`:''}
        ${selected?.groupe_sanguin?`<div class="clinique-info">Groupe sanguin : ${selected.groupe_sanguin}</div>`:''}
      </div>
      <div class="section">
        <div class="label">Date</div>
        <div class="value">${new Date(o.created_at).toLocaleDateString('fr-CI',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>
      </div>
      <div class="section">
        <div class="label">Prescription</div>
        <div class="medicament">
          <div style="font-size:15px;font-weight:700;margin-bottom:6px;">${o.medicaments||o.medicament||'—'}</div>
          ${o.posologie?`<div style="font-size:13px;color:#5A7A94;">Posologie : ${o.posologie}</div>`:''}
          ${o.duree?`<div style="font-size:13px;color:#5A7A94;">Durée : ${o.duree}</div>`:''}
          ${o.notes_ord?`<div style="font-size:12px;color:#8BA0B5;margin-top:6px;font-style:italic;">${o.notes_ord}</div>`:''}
        </div>
      </div>
      <div class="footer">
        <div>MediConnect Africa · ${cl?.site_web||'manager.mediconnect4africa.cloud'}</div>
        <div class="signature">
          <div style="margin-bottom:40px;">Signature du médecin</div>
          <div style="font-weight:700;">${o.medecin_nom||cl?.nom||''}</div>
        </div>
      </div>
      <div style="text-align:center;margin-top:20px;">
        <button onclick="window.print()" style="padding:10px 24px;background:#0A8F58;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer;">🖨️ Imprimer</button>
      </div>
      </body></html>
    `);
    win.document.close();
  };


  const fp = k => e => setPForm(p=>({...p,[k]:e.target.value}));
  const fc = k => e => setCForm(p=>({...p,[k]:e.target.value}));
  const fo = k => e => setOForm(p=>({...p,[k]:e.target.value}));

  const TABS = [
    { key:"infos", label:"Infos", icon:"👤" },
    { key:"consultations", label:"Consultations", icon:"🩺" },
    { key:"ordonnances", label:"Ordonnances", icon:"💊" },
    { key:"examens", label:"Examens", icon:"🔬" },
    { key:"factures", label:"Factures", icon:"📄" },
  ];

  const bloodGroups = ["A+","A-","B+","B-","AB+","AB-","O+","O-"];

  return (
    <div style={{ display:"flex", gap:20, height:"calc(100vh - 140px)" }}>
      {/* Liste patients */}
      <div style={{ width:280, flexShrink:0, display:"flex", flexDirection:"column", gap:12 }}>
        <div style={{ display:"flex", gap:10 }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un patient…"
            style={{ flex:1, background:C.input, border:`1px solid ${C.border}`, borderRadius:9, padding:"9px 12px", color:C.text, fontSize:13, outline:"none", fontFamily:"inherit" }} />
          <Btn style={{flexShrink:0,padding:"9px 12px"}} onClick={()=>setShowAdd(true)}>+</Btn>
        </div>
        <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:6 }}>
          {isLoading ? <Loader /> : patients.length===0
            ? <Empty icon="👤" title="Aucun patient" subtitle={search?"Aucun résultat":"Ajoutez un patient"} />
            : patients.map(p=>(
              <button key={p.id} onClick={()=>setSelected(p)}
                style={{ background:selected?.id===p.id?C.input:C.card, border:`1.5px solid ${selected?.id===p.id?C.green:C.border}`, borderRadius:12, padding:"12px 14px", cursor:"pointer", textAlign:"left", fontFamily:"inherit", transition:"all .15s" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:36, height:36, background:`linear-gradient(135deg,${C.green},${C.teal})`, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, color:"#fff", fontSize:14, flexShrink:0 }}>
                    {p.prenom?.[0]}{p.nom?.[0]}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:C.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{p.prenom} {p.nom}</div>
                    <div style={{ fontSize:11, color:C.muted }}>{p.telephone||p.email||p.code_secret||"—"}</div>
                  </div>
                  {p.groupe_sanguin && <span style={{ fontSize:10, fontWeight:700, color:C.red, background:"rgba(225,29,72,.1)", padding:"2px 6px", borderRadius:6 }}>{p.groupe_sanguin}</span>}
                </div>
              </button>
            ))
          }
        </div>
      </div>

      {/* Dossier patient */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", gap:16, overflowY:"auto" }}>
        {!selected
          ? <Empty icon="👤" title="Sélectionnez un patient" subtitle="Cliquez sur un patient pour voir son dossier médical" />
          : <>
            {/* En-tête patient */}
            <Panel>
              <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:16 }}>
                <div style={{ width:56, height:56, background:`linear-gradient(135deg,${C.green},${C.teal})`, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, color:"#fff", fontSize:20 }}>
                  {selected.prenom?.[0]}{selected.nom?.[0]}
                </div>
                <div style={{ flex:1 }}>
                  <h2 style={{ margin:0, fontSize:18, fontWeight:800, color:C.text }}>{selected.prenom} {selected.nom}</h2>
                  <div style={{ fontSize:13, color:C.muted, marginTop:2 }}>
                    {selected.date_naissance && `Né(e) le ${fmtDate(selected.date_naissance)} · `}
                    {selected.telephone||""} {selected.email&&`· ${selected.email}`}
                  </div>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  {selected.groupe_sanguin && <Badge color="red">{selected.groupe_sanguin}</Badge>}
                  <Badge color="green">Dossier actif</Badge>
                </div>
              </div>
              {selected.allergies && (
                <div style={{ background:"rgba(225,29,72,.08)", border:"1px solid rgba(225,29,72,.2)", borderRadius:8, padding:"8px 14px", fontSize:12, color:C.red, marginBottom:12 }}>
                  ⚠️ <strong>Allergies :</strong> {selected.allergies}
                </div>
              )}
              {selected.antecedents && (
                <div style={{ background:"rgba(37,99,235,.08)", border:"1px solid rgba(37,99,235,.2)", borderRadius:8, padding:"8px 14px", fontSize:12, color:C.blue }}>
                  📋 <strong>Antécédents :</strong> {selected.antecedents}
                </div>
              )}
            </Panel>

            {/* Tabs */}
            <div style={{ display:"flex", gap:4, background:C.input, borderRadius:10, padding:4 }}>
              {TABS.map(t=>(
                <button key={t.key} onClick={()=>setActiveTab(t.key)}
                  style={{ flex:1, background:activeTab===t.key?C.hover:"transparent", border:"none", borderRadius:8, padding:"8px 4px", cursor:"pointer", fontFamily:"inherit", color:activeTab===t.key?C.text:C.muted, fontSize:12, fontWeight:activeTab===t.key?700:400, transition:"all .15s" }}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* Tab: Infos */}
            {activeTab==="infos" && (
              <Panel title="Informations personnelles">
                <Grid cols={2} gap={12}>
                  {[["Prénom",selected.prenom],["Nom",selected.nom],["Téléphone",selected.telephone],["Email",selected.email],["Date de naissance",fmtDate(selected.date_naissance)],["Groupe sanguin",selected.groupe_sanguin],["Code secret",selected.code_secret]].map(([k,v])=>(
                    <div key={k} style={{ background:C.hover, borderRadius:8, padding:"10px 14px" }}>
                      <div style={{ fontSize:10, color:C.dim, fontWeight:700, textTransform:"uppercase", marginBottom:2 }}>{k}</div>
                      <div style={{ fontSize:14, color:C.text, fontWeight:600 }}>{v||"—"}</div>
                    </div>
                  ))}
                </Grid>
              </Panel>
            )}

            {/* Tab: Consultations */}
            {activeTab==="consultations" && (
              <Panel title="Historique des consultations"
                actions={<Btn style={{padding:"6px 14px",fontSize:12}} onClick={()=>setShowConsult(true)}>+ Consultation</Btn>}>
                {(consults||[]).length===0
                  ? <Empty icon="🩺" title="Aucune consultation" subtitle="Ajoutez la première consultation" />
                  : (consults||[]).map(c=>(
                    <div key={c.id} style={{ background:C.hover, borderRadius:10, padding:14, marginBottom:10 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                        <span style={{ fontSize:12, fontWeight:700, color:C.teal }}>{fmtDate(c.created_at)}</span>
                        <span style={{ fontSize:12, color:C.muted }}>{c.medecin_nom||"—"}</span>
                      </div>
                      <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:4 }}>Diagnostic : {c.diagnostic||"—"}</div>
                      {c.traitement && <div style={{ fontSize:12, color:C.muted, marginBottom:4 }}>Traitement : {c.traitement}</div>}
                      {c.notes && <div style={{ fontSize:12, color:C.muted, fontStyle:"italic" }}>{c.notes}</div>}
                      <div style={{ display:"flex", gap:12, marginTop:8, fontSize:11, color:C.dim }}>
                        {c.tension_arterielle && <span>TA: {c.tension_arterielle}</span>}
                        {c.temperature && <span>T°: {c.temperature}°C</span>}
                        {c.poids && <span>Poids: {c.poids}kg</span>}
                        {c.taille && <span>Taille: {c.taille}cm</span>}
                      </div>
                    </div>
                  ))
                }
              </Panel>
            )}

            {/* Tab: Ordonnances */}
            {activeTab==="ordonnances" && (
              <Panel title="Ordonnances et prescriptions"
                actions={<Btn style={{padding:"6px 14px",fontSize:12}} onClick={()=>setShowOrd(true)}>+ Ordonnance</Btn>}>
                {(ords||[]).length===0
                  ? <Empty icon="💊" title="Aucune ordonnance" />
                  : (ords||[]).map(o=>(
                    <div key={o.id} style={{ background:C.hover, borderRadius:10, padding:14, marginBottom:10, display:"flex", gap:14 }}>
                      <div style={{ width:3, background:C.green, borderRadius:2, flexShrink:0 }} />
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                          <span style={{ fontSize:12, fontWeight:700, color:C.green }}>Ordonnance du {fmtDate(o.created_at)}</span>
                          <div style={{display:"flex",gap:8,alignItems:"center"}}>
                            <Badge color="green">Active</Badge>
                            <button onClick={()=>imprimerOrdonnance(o)} style={{padding:"3px 10px",background:"rgba(10,143,88,.15)",border:"1px solid rgba(10,143,88,.3)",borderRadius:6,color:C.green,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>🖨️ Imprimer</button>
                          </div>
                        </div>
                        <div style={{ fontSize:13, color:C.text, marginBottom:4, fontWeight:600 }}>{o.medicaments||"—"}</div>
                        {o.posologie && <div style={{ fontSize:12, color:C.muted }}>Posologie : {o.posologie}</div>}
                        {o.duree && <div style={{ fontSize:12, color:C.muted }}>Durée : {o.duree}</div>}
                        {o.notes_ord && <div style={{ fontSize:12, color:C.dim, marginTop:4, fontStyle:"italic" }}>{o.notes_ord}</div>}
                      </div>
                    </div>
                  ))
                }
              </Panel>
            )}

            {/* Tab: Examens */}
            {activeTab==="examens" && (
              <Panel title="Résultats d'examens et imagerie">
                {(examens||[]).length===0
                  ? <Empty icon="🔬" title="Aucun résultat" subtitle="Les résultats labo et imagerie apparaîtront ici dès leur saisie"/>
                  : (examens||[]).map(e=>(
                    <div key={e.id} style={{background:C.hover,borderRadius:10,padding:14,marginBottom:10,display:"flex",gap:14}}>
                      <div style={{width:3,background:e.type_source==="labo"?C.purple:C.blue,borderRadius:2,flexShrink:0}}/>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                          <span style={{fontSize:12,fontWeight:700,color:e.type_source==="labo"?C.purple:C.blue}}>
                            {e.type_source==="labo"?"🔬 Labo":"🩻 Imagerie"} · {e.type_analyse||e.type_examen||"—"}
                          </span>
                          <Badge color={e.statut==="valide"?"green":e.statut==="en_attente"?"amber":"gray"}>{e.statut||"—"}</Badge>
                        </div>
                        {e.interpretation && <div style={{fontSize:13,color:C.text,fontWeight:600,marginBottom:4}}>{e.interpretation}</div>}
                        {e.resultat && <div style={{fontSize:13,color:C.text,marginBottom:4}}>{e.resultat}</div>}
                        {e.observations && <div style={{fontSize:12,color:C.muted,fontStyle:"italic"}}>{e.observations}</div>}
                        {e.valeurs && <div style={{fontSize:12,color:C.muted}}>Valeurs : {typeof e.valeurs==="object"?Object.entries(e.valeurs).map(([k,v])=>`${k}:${v}`).join(", "):e.valeurs}</div>}
                        <div style={{fontSize:11,color:C.dim,marginTop:4}}>{fmtDate(e.created_at)}</div>
                      </div>
                    </div>
                  ))
                }
              </Panel>
            )}

            {/* Tab: Factures */}
            {activeTab==="factures" && (
              <Panel title="Factures et paiements">
                <Empty icon="📄" title="Historique financier patient" subtitle="Toutes les factures de ce patient apparaîtront ici" />
              </Panel>
            )}
          </>
        }
      </div>

      {/* Modal: Nouveau patient */}
      <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="👤 Nouveau dossier patient" width={580}>
        <Grid cols={2} gap={12}>
          <Inp label="Prénom *" required value={pForm.prenom} onChange={fp("prenom")} placeholder="Adjoua" />
          <Inp label="Nom *" required value={pForm.nom} onChange={fp("nom")} placeholder="Koné" />
          <Inp label="Téléphone" value={pForm.telephone} onChange={fp("telephone")} placeholder="+225 07 00 00 00 00" type="tel" />
          <Inp label="Email" value={pForm.email} onChange={fp("email")} placeholder="patient@exemple.com" type="email" />
          <Inp label="Date de naissance" value={pForm.date_naissance} onChange={fp("date_naissance")} type="date" />
          <Sel label="Groupe sanguin" value={pForm.groupe_sanguin} onChange={fp("groupe_sanguin")} options={["",...bloodGroups]} />
        </Grid>
        <Inp label="Allergies connues" value={pForm.allergies} onChange={fp("allergies")} placeholder="Pénicilline, Aspirine…" />
        <Inp label="Antécédents médicaux" value={pForm.antecedents} onChange={fp("antecedents")} placeholder="Diabète, HTA, Opération…" />

        {/* Couverture assurance */}
        <div style={{marginTop:8}}>
          <label style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".5px",display:"block",marginBottom:8}}>Couverture Assurance</label>
          <div style={{display:"flex",gap:8,marginBottom:12}}>
            {[{val:false,label:"🚫 Non assuré"},{val:true,label:"🛡️ Assuré"}].map(opt=>(
              <button key={String(opt.val)} onClick={()=>setPForm(p=>({...p,est_assure:opt.val,assurance:opt.val?p.assurance:"",numero_police:opt.val?p.numero_police:""}))}
                style={{flex:1,padding:"10px",borderRadius:9,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",
                  background:pForm.est_assure===opt.val?(opt.val?"rgba(10,143,88,.15)":"rgba(239,68,68,.1)"):"transparent",
                  border:`1.5px solid ${pForm.est_assure===opt.val?(opt.val?C.green:"#EF4444"):C.border}`,
                  color:pForm.est_assure===opt.val?(opt.val?C.green:"#EF4444"):C.muted}}>
                {opt.label}
              </button>
            ))}
          </div>
          {pForm.est_assure&&(
            <Grid cols={2} gap={10}>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:C.muted,display:"block",marginBottom:5}}>COMPAGNIE D'ASSURANCE</label>
                <select value={pForm.assurance} onChange={e=>setPForm(p=>({...p,assurance:e.target.value}))}
                  style={{width:"100%",padding:"9px 12px",background:C.hover,border:`1px solid ${C.border}`,borderRadius:8,color:pForm.assurance?C.text:C.muted,fontSize:13,outline:"none"}}>
                  <option value="">-- Sélectionner --</option>
                  {["NSIA Vie CI","NSIA IARDT","Allianz CI","AXA CI","Saham Assurance CI","Sunu Assurances","CNAM (CMU)","Mutuelles CGRAE","Mutuelles MUGEFCI","AMI Assurances","Colina","Prima Assurance","Gras Savoye","SIA (Société Ivoirienne d'Assurance)","Autre"].map(a=>(
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
              <Inp label="N° Police / Matricule" value={pForm.numero_police} onChange={fp("numero_police")} placeholder="Ex: 2024-NSIA-000123"/>
            </Grid>
          )}
        </div>

        <div style={{display:"flex",gap:10,marginTop:4}}>
          <Btn variant="outline" style={{flex:1}} onClick={()=>setShowAdd(false)}>Annuler</Btn>
          <Btn style={{flex:2}} loading={addPat.isPending} onClick={()=>{ if(!pForm.prenom||!pForm.nom){toast.error("Prénom et nom requis");return;} addPat.mutate(pForm); }}>Créer le dossier</Btn>
        </div>
      </Modal>

      {/* Modal: Code secret patient créé */}
      {newPatient&&(
        <div onClick={()=>setNewPatient(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#0E1620",border:"1px solid #1E2F42",borderRadius:18,padding:32,width:420,maxWidth:"95vw",textAlign:"center"}}>
            <div style={{width:64,height:64,background:"linear-gradient(135deg,#0A8F58,#0D9488)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,margin:"0 auto 16px"}}>✅</div>
            <div style={{fontSize:18,fontWeight:800,color:"#F0F4F8",marginBottom:4}}>
              {newPatient.prenom||"—"} {newPatient.nom||"—"}
            </div>
            <div style={{fontSize:13,color:"#8BA0B5",marginBottom:20}}>Dossier médical créé avec succès</div>
            <div style={{background:"#141E2B",border:"1px solid #1E2F42",borderRadius:12,padding:20,marginBottom:20}}>
              <div style={{fontSize:11,fontWeight:700,color:"#8BA0B5",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Code secret patient</div>
              <div style={{fontSize:36,fontWeight:900,color:"#0A8F58",letterSpacing:6,fontFamily:"monospace"}}>
                {newPatient.code_secret||"—"}
              </div>
              <div style={{fontSize:11,color:"#4E657A",marginTop:8}}>Remettez ce code au patient — il lui permettra d'accéder à ses soins</div>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setNewPatient(null)} style={{flex:1,padding:"10px",borderRadius:9,background:"transparent",border:"1.5px solid #1E2F42",color:"#8BA0B5",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>Fermer</button>
              <button onClick={()=>{
                if(navigator.clipboard) navigator.clipboard.writeText(newPatient.code_secret||"").then(()=>toast.success("Code copié !"));
              }} style={{flex:1,padding:"10px",borderRadius:9,background:"rgba(10,143,88,.15)",border:"1px solid rgba(10,143,88,.3)",color:"#0A8F58",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>📋 Copier</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nouvelle consultation */}
      <Modal open={showConsult} onClose={()=>setShowConsult(false)} title={`🩺 Consultation — ${selected?.prenom} ${selected?.nom}`} width={560}>
        <Inp label="Diagnostic *" required value={cForm.diagnostic} onChange={fc("diagnostic")} placeholder="Ex: Hypertension artérielle" />
        <Inp label="Traitement prescrit" value={cForm.traitement} onChange={fc("traitement")} placeholder="Ex: Amlodipine 5mg" />
        <Grid cols={4} gap={10}>
          <Inp label="T.A." value={cForm.tension_arterielle} onChange={fc("tension_arterielle")} placeholder="120/80" />
          <Inp label="Temp (°C)" value={cForm.temperature} onChange={fc("temperature")} placeholder="37.2" type="number" />
          <Inp label="Poids (kg)" value={cForm.poids} onChange={fc("poids")} placeholder="70" type="number" />
          <Inp label="Taille (cm)" value={cForm.taille} onChange={fc("taille")} placeholder="175" type="number" />
        </Grid>
        <div style={{marginBottom:14}}>
          <label style={{display:"block",fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".5px",marginBottom:5}}>Notes cliniques</label>
          <textarea value={cForm.notes} onChange={fc("notes")} rows={3} placeholder="Observations, recommandations…"
            style={{width:"100%",background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:9,padding:"10px 14px",color:C.text,fontSize:14,resize:"none",outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}
            onFocus={e=>e.target.style.borderColor=C.green} onBlur={e=>e.target.style.borderColor=C.border} />
        </div>
        <div style={{display:"flex",gap:10}}>
          <Btn variant="outline" style={{flex:1}} onClick={()=>setShowConsult(false)}>Annuler</Btn>
          <Btn style={{flex:2}} loading={addCons.isPending} onClick={()=>{ if(!cForm.diagnostic){toast.error("Diagnostic requis");return;} addCons.mutate({...cForm,patient_id:selected.id}); }}>Enregistrer</Btn>
        </div>
      </Modal>

      {/* Modal: Consultation depuis RDV */}
      {rdvConsult&&(
        <div onClick={()=>setRdvConsult(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'#0E1620',border:'1px solid #1E2F42',borderRadius:16,padding:28,width:540,maxWidth:'95vw',maxHeight:'90vh',overflowY:'auto'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <h2 style={{fontSize:17,fontWeight:700,color:'#F0F4F8',margin:0}}>🩺 Consultation — {rdvConsult.patient_nom}</h2>
              <button onClick={()=>setRdvConsult(null)} style={{background:'none',border:'none',color:'#8BA0B5',cursor:'pointer',fontSize:20}}>✕</button>
            </div>
            <div style={{background:'rgba(10,143,88,.08)',border:'1px solid rgba(10,143,88,.2)',borderRadius:8,padding:'10px 14px',marginBottom:16,fontSize:12,color:'#8BA0B5'}}>
              RDV du {new Date(rdvConsult.date_rdv).toLocaleDateString('fr-CI',{day:'numeric',month:'long'})} · {rdvConsult.heure_rdv?.slice(0,5)} · {rdvConsult.motif||'—'}
            </div>
            {[['Diagnostic *','diagnostic','Ex: Hypertension artérielle'],['Traitement prescrit','traitement','Ex: Amlodipine 5mg'],['Notes cliniques','notes','Observations…']].map(([label,key,ph])=>(
              <div key={key} style={{marginBottom:12}}>
                <label style={{display:'block',fontSize:11,fontWeight:700,color:'#8BA0B5',textTransform:'uppercase',marginBottom:4}}>{label}</label>
                {key==='notes'
                  ? <textarea value={rdvCForm[key]} onChange={e=>setRdvCForm(f=>({...f,[key]:e.target.value}))} rows={3} placeholder={ph} style={{width:'100%',background:'#1A2535',border:'1.5px solid #1E2F42',borderRadius:9,padding:'10px 14px',color:'#F0F4F8',fontSize:14,resize:'none',outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}/>
                  : <input value={rdvCForm[key]} onChange={e=>setRdvCForm(f=>({...f,[key]:e.target.value}))} placeholder={ph} style={{width:'100%',background:'#1A2535',border:'1.5px solid #1E2F42',borderRadius:9,padding:'10px 14px',color:'#F0F4F8',fontSize:14,outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}/>
                }
              </div>
            ))}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:10,marginBottom:16}}>
              {[['T.A.','tension_arterielle','120/80'],['Temp °C','temperature','37'],['Poids kg','poids','70'],['Taille cm','taille','175']].map(([label,key,ph])=>(
                <div key={key}>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#8BA0B5',textTransform:'uppercase',marginBottom:4}}>{label}</label>
                  <input value={rdvCForm[key]||''} onChange={e=>setRdvCForm(f=>({...f,[key]:e.target.value}))} placeholder={ph} style={{width:'100%',background:'#1A2535',border:'1.5px solid #1E2F42',borderRadius:9,padding:'8px 10px',color:'#F0F4F8',fontSize:13,outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}/>
                </div>
              ))}
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setRdvConsult(null)} style={{flex:1,padding:'10px',borderRadius:9,background:'transparent',border:'1.5px solid #1E2F42',color:'#8BA0B5',cursor:'pointer',fontSize:13,fontWeight:700,fontFamily:'inherit'}}>Annuler</button>
              <button disabled={addConsRdv.isPending} onClick={()=>{
                if(!rdvCForm.diagnostic){toast.error('Diagnostic requis');return;}
                addConsRdv.mutate({rdv_id:rdvConsult.id,patient_id:rdvConsult.patient_id,motif:rdvConsult.motif||rdvCForm.diagnostic,...rdvCForm});
              }} style={{flex:2,padding:'10px',borderRadius:9,background:'linear-gradient(135deg,#0A8F58,#0D9488)',border:'none',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:700,fontFamily:'inherit',opacity:addConsRdv.isPending?.65:1}}>
                {addConsRdv.isPending?'⏳…':'✅ Enregistrer consultation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Ordonnance */}
      <Modal open={showOrd} onClose={()=>setShowOrd(false)} title={`💊 Ordonnance — ${selected?.prenom} ${selected?.nom}`}>
        <Inp label="Médicaments *" required value={oForm.medicaments} onChange={fo("medicaments")} placeholder="Amoxicilline 500mg, Paracétamol 1g…" />
        <Grid cols={2} gap={12}>
          <Inp label="Posologie" value={oForm.posologie} onChange={fo("posologie")} placeholder="2 cp/jour matin et soir" />
          <Inp label="Durée du traitement" value={oForm.duree} onChange={fo("duree")} placeholder="7 jours" />
        </Grid>
        <Inp label="Notes / Instructions" value={oForm.notes_ord} onChange={fo("notes_ord")} placeholder="À prendre pendant les repas…" />
        <div style={{display:"flex",gap:10,marginTop:4}}>
          <Btn variant="outline" style={{flex:1}} onClick={()=>setShowOrd(false)}>Annuler</Btn>
          <Btn style={{flex:2}} loading={addOrd.isPending} onClick={()=>{ if(!oForm.medicaments){toast.error("Médicaments requis");return;} addOrd.mutate({...oForm,patient_id:selected.id}); }}>Créer l'ordonnance</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  4. PAGE MÉDECINS & RH
// ════════════════════════════════════════════════════════════════════
function PageMedecins() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("medecins");
  const [showAdd, setShowAdd] = useState(false);
  const [showPersonnel, setShowPersonnel] = useState(false);
  const [form, setForm] = useState({ prenom:"", nom:"", specialite:"", telephone:"", email:"", tarif:"", experience_ans:"", statut:"Disponible", jours_travail:"Lun,Mar,Mer,Jeu,Ven", horaires_debut:"08:00", horaires_fin:"17:00" });
  const [pForm, setPForm] = useState({ nom:"", poste:"", contrat:"CDI", salaire:"", date_embauche:"", statut:"Actif" });

  const { data, isLoading } = useQuery({ queryKey:["cl-medecins"], queryFn:()=>cAPI.medecins().then(r=>r.data.data||[]) });
  const medecins = data||[];

  const addMut = useMutation({ mutationFn:d=>cAPI.addMedecin(d), onSuccess:()=>{ toast.success("Médecin ajouté !"); qc.invalidateQueries(["cl-medecins"]); setShowAdd(false); }, onError:()=>toast.error("Erreur") });
  const updMut = useMutation({ mutationFn:({id,...d})=>cAPI.updateMedecin(id,d), onSuccess:()=>{ toast.success("Statut mis à jour"); qc.invalidateQueries(["cl-medecins"]); }, onError:()=>toast.error("Erreur") });

  const f = k => e => setForm(p=>({...p,[k]:e.target.value}));
  const fp = k => e => setPForm(p=>({...p,[k]:e.target.value}));

  const SPECS = ["Médecine générale","Cardiologie","Pédiatrie","Gynécologie","Neurologie","Dermatologie","ORL","Ophtalmologie","Orthopédie","Psychiatrie","Radiologie","Chirurgie"];
  const CONTRATS = ["CDI","CDD","Vacation","Libéral","Stage"];
  const POSTES = ["Médecin","Infirmier(e)","Sage-femme","Technicien labo","Aide-soignant","Administratif","Comptable","Agent sécurité"];

  const RH_TABS = [
    { key:"medecins", label:"Médecins" },
    { key:"personnel", label:"Personnel RH" },
    { key:"conges", label:"Congés" },
    { key:"evaluations", label:"Évaluations" },
    { key:"formations", label:"Formations" },
  ];

  // Données RH simulées
  const PERSONNEL_DEMO = [
    { id:1, nom:"Kouamé Akissi", poste:"Infirmière", contrat:"CDI", salaire:180000, statut:"Actif", date_embauche:"2022-01-15" },
    { id:2, nom:"Traoré Moussa", poste:"Technicien labo", contrat:"CDI", salaire:150000, statut:"Actif", date_embauche:"2021-06-01" },
    { id:3, nom:"Bamba Fanta", poste:"Sage-femme", contrat:"CDD", salaire:200000, statut:"Actif", date_embauche:"2023-03-10" },
    { id:4, nom:"N'Guessan Kra", poste:"Aide-soignant", contrat:"Vacation", salaire:80000, statut:"Actif", date_embauche:"2024-01-01" },
  ];

  const CONGES_DEMO = [
    { id:1, employe:"Kouamé Akissi", type:"Congé annuel", debut:"2026-06-01", fin:"2026-06-15", jours:14, statut:"approuve" },
    { id:2, employe:"Traoré Moussa", type:"Maladie", debut:"2026-05-10", fin:"2026-05-12", jours:2, statut:"en_attente" },
    { id:3, employe:"Bamba Fanta", type:"Maternité", debut:"2026-07-01", fin:"2026-09-30", jours:91, statut:"approuve" },
  ];

  return (
    <div>
      <PageHeader title="👨‍⚕️ Médecins & Ressources Humaines" subtitle="Personnel · Contrats · Plannings · Évaluations"
        actions={<><Btn onClick={()=>setShowAdd(true)}>+ Médecin</Btn><Btn variant="outline" onClick={()=>setShowPersonnel(true)}>+ Personnel</Btn></>} />

      {/* Tabs RH */}
      <div style={{ display:"flex", gap:4, background:C.input, borderRadius:10, padding:4, marginBottom:20 }}>
        {RH_TABS.map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)}
            style={{ flex:1, background:tab===t.key?C.hover:"transparent", border:"none", borderRadius:8, padding:"9px 4px", cursor:"pointer", fontFamily:"inherit", color:tab===t.key?C.text:C.muted, fontSize:12, fontWeight:tab===t.key?700:400 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Médecins */}
      {tab==="medecins" && (
        <>
          <Grid cols={4} gap={14} style={{marginBottom:20}}>
            <Card label="Médecins total" value={medecins.length} icon="👨‍⚕️" color={C.blue} />
            <Card label="Disponibles" value={medecins.filter(m=>m.statut==="Disponible").length} icon="✅" color={C.green} />
            <Card label="En consultation" value={medecins.filter(m=>m.statut==="En consultation").length} icon="🩺" color={C.amber} />
            <Card label="Absents" value={medecins.filter(m=>m.statut==="Absent").length} icon="❌" color={C.red} />
          </Grid>
          {isLoading ? <Loader /> : medecins.length===0
            ? <Empty icon="👨‍⚕️" title="Aucun médecin" subtitle="Ajoutez un médecin à votre clinique" />
            : <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:14 }}>
              {medecins.map(m=>(
                <Panel key={m.id}>
                  <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
                    <div style={{ width:48, height:48, background:`linear-gradient(135deg,#7C3AED,#0D9488)`, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, color:"#fff", fontSize:16 }}>
                      {m.prenom?.[0]}{m.nom?.[0]}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14, fontWeight:700, color:C.text }}>Dr. {m.prenom} {m.nom}</div>
                      <div style={{ fontSize:12, color:C.muted }}>{m.specialite||"—"}</div>
                    </div>
                    <Badge color={{ Disponible:"green", "En consultation":"teal", Absent:"red" }[m.statut]||"gray"}>{m.statut}</Badge>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12, fontSize:12 }}>
                    {[["💰 Tarif",`${fmt(m.tarif)} F`],["⏱️ Expérience",`${m.experience_ans||"—"} ans`],["📞 Tel",m.telephone||"—"],["🕐 Horaires",`${m.horaires_debut||"—"}–${m.horaires_fin||"—"}`]].map(([k,v])=>(
                      <div key={k} style={{ background:C.hover, borderRadius:7, padding:"7px 10px" }}>
                        <div style={{ fontSize:10, color:C.dim, marginBottom:2 }}>{k}</div>
                        <div style={{ color:C.text, fontWeight:600 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {m.jours_travail && <div style={{ fontSize:11, color:C.muted, marginBottom:12 }}>Jours : {m.jours_travail}</div>}
                  <div style={{ display:"flex", gap:8 }}>
                    <Btn variant="outline" style={{flex:1,padding:"6px",fontSize:11,color:C.green}} onClick={()=>updMut.mutate({id:m.id,statut:"Disponible"})}>✓ Disponible</Btn>
                    <Btn variant="outline" style={{flex:1,padding:"6px",fontSize:11,color:C.amber}} onClick={()=>updMut.mutate({id:m.id,statut:"En consultation"})}>🩺 Consult.</Btn>
                    <Btn variant="outline" style={{flex:1,padding:"6px",fontSize:11,color:C.red}} onClick={()=>updMut.mutate({id:m.id,statut:"Absent"})}>Absent</Btn>
                  </div>
                </Panel>
              ))}
            </div>
          }
        </>
      )}

      {/* Tab: Personnel RH */}
      {tab==="personnel" && (
        <Panel title="Personnel administratif et médical">
          <Grid cols={3} gap={14} style={{marginBottom:20}}>
            <Card label="Total personnel" value={PERSONNEL_DEMO.length} icon="👥" color={C.blue} />
            <Card label="Masse salariale" value={`${fmt(PERSONNEL_DEMO.reduce((s,p)=>s+p.salaire,0))} F`} icon="💰" color={C.green} sub="Mensuelle" />
            <Card label="CDI" value={PERSONNEL_DEMO.filter(p=>p.contrat==="CDI").length} icon="📄" color={C.teal} />
          </Grid>
          <Table columns={[
            { key:"nom", label:"Nom", render:v=><span style={{fontWeight:700}}>{v}</span> },
            { key:"poste", label:"Poste" },
            { key:"contrat", label:"Contrat", render:v=><Badge color="blue">{v}</Badge> },
            { key:"salaire", label:"Salaire", render:v=><span style={{fontWeight:700,color:C.green}}>{fmt(v)} F</span> },
            { key:"date_embauche", label:"Embauche", render:v=>fmtDate(v) },
            { key:"statut", label:"Statut", render:v=><Badge color="green">{v}</Badge> },
          ]} rows={PERSONNEL_DEMO} />
        </Panel>
      )}

      {/* Tab: Congés */}
      {tab==="conges" && (
        <Panel title="Demandes de congé" actions={<Btn style={{padding:"6px 14px",fontSize:12}}>+ Demande</Btn>}>
          <Table columns={[
            { key:"employe", label:"Employé", render:v=><span style={{fontWeight:700}}>{v}</span> },
            { key:"type", label:"Type de congé" },
            { key:"debut", label:"Début", render:v=>fmtDate(v) },
            { key:"fin", label:"Fin", render:v=>fmtDate(v) },
            { key:"jours", label:"Durée", render:v=>`${v} j` },
            { key:"statut", label:"Statut", render:v=><Badge color={{ approuve:"green", en_attente:"amber", refuse:"red" }[v]||"gray"}>{v}</Badge> },
            { key:"id", label:"Actions", render:()=>(
              <div style={{display:"flex",gap:6}}>
                <Btn variant="outline" style={{padding:"4px 10px",fontSize:11,color:C.green}} onClick={()=>toast.success("Approuvé !")}>✓</Btn>
                <Btn variant="outline" style={{padding:"4px 10px",fontSize:11,color:C.red}} onClick={()=>toast.error("Refusé")}>✕</Btn>
              </div>
            )},
          ]} rows={CONGES_DEMO} />
        </Panel>
      )}

      {/* Tab: Évaluations */}
      {tab==="evaluations" && (
        <Panel title="Évaluations de performance">
          <Empty icon="📊" title="Module évaluations" subtitle="Grilles d'évaluation et rapports de performance — en cours d'implémentation" />
        </Panel>
      )}

      {/* Tab: Formations */}
      {tab==="formations" && (
        <Panel title="Formation et développement du personnel">
          <Empty icon="🎓" title="Module formation" subtitle="Programmes, suivi et certifications — en cours d'implémentation" />
        </Panel>
      )}

      {/* Modal: Nouveau médecin */}
      <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="👨‍⚕️ Nouveau médecin" width={560}>
        <Grid cols={2} gap={12}>
          <Inp label="Prénom *" required value={form.prenom} onChange={f("prenom")} placeholder="Amadou" />
          <Inp label="Nom *" required value={form.nom} onChange={f("nom")} placeholder="Koné" />
        </Grid>
        <Sel label="Spécialité *" required value={form.specialite} onChange={f("specialite")} options={["",...SPECS]} />
        <Grid cols={2} gap={12}>
          <Inp label="Téléphone" value={form.telephone} onChange={f("telephone")} placeholder="+225 07 00 00 00 00" type="tel" />
          <Inp label="Email" value={form.email} onChange={f("email")} placeholder="dr@exemple.com" type="email" />
          <Inp label="Tarif consultation (FCFA)" value={form.tarif} onChange={f("tarif")} placeholder="15000" type="number" />
          <Inp label="Années d'expérience" value={form.experience_ans} onChange={f("experience_ans")} placeholder="10" type="number" />
          <Inp label="Heure début" value={form.horaires_debut} onChange={f("horaires_debut")} type="time" />
          <Inp label="Heure fin" value={form.horaires_fin} onChange={f("horaires_fin")} type="time" />
        </Grid>
        <Inp label="Jours de travail" value={form.jours_travail} onChange={f("jours_travail")} placeholder="Lun,Mar,Mer,Jeu,Ven" />
        <div style={{display:"flex",gap:10,marginTop:4}}>
          <Btn variant="outline" style={{flex:1}} onClick={()=>setShowAdd(false)}>Annuler</Btn>
          <Btn style={{flex:2}} loading={addMut.isPending} onClick={()=>{ if(!form.prenom||!form.nom||!form.specialite){toast.error("Champs requis manquants");return;} addMut.mutate(form); }}>Ajouter le médecin</Btn>
        </div>
      </Modal>

      {/* Modal: Nouveau personnel */}
      <Modal open={showPersonnel} onClose={()=>setShowPersonnel(false)} title="👥 Nouveau membre du personnel">
        <Inp label="Nom complet *" required value={pForm.nom} onChange={fp("nom")} placeholder="Koné Adjoua" />
        <Grid cols={2} gap={12}>
          <Sel label="Poste" value={pForm.poste} onChange={fp("poste")} options={["",...POSTES]} />
          <Sel label="Type de contrat" value={pForm.contrat} onChange={fp("contrat")} options={CONTRATS} />
          <Inp label="Salaire mensuel (FCFA)" value={pForm.salaire} onChange={fp("salaire")} placeholder="150000" type="number" />
          <Inp label="Date d'embauche" value={pForm.date_embauche} onChange={fp("date_embauche")} type="date" />
        </Grid>
        <div style={{display:"flex",gap:10,marginTop:4}}>
          <Btn variant="outline" style={{flex:1}} onClick={()=>setShowPersonnel(false)}>Annuler</Btn>
          <Btn style={{flex:2}} onClick={()=>{ toast.success("Personnel ajouté !"); setShowPersonnel(false); }}>Ajouter</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  5. PAGE STOCK — FOURNITURES MÉDICALES
// ════════════════════════════════════════════════════════════════════
function PageStock() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [tab, setTab] = useState("inventaire");
  const [form, setForm] = useState({ nom:"", categorie:"Médicament", quantite:"", unite:"boite", seuil_alerte:"", prix_unitaire:"", fournisseur:"", date_expiration:"" });

  const { data, isLoading } = useQuery({ queryKey:["cl-stock"], queryFn:()=>cAPI.stock().then(r=>r.data.data||[]) });
  const stock = data||[];
  const alertes = stock.filter(s=>s.quantite<=s.seuil_alerte);
  const totalValeur = stock.reduce((s,p)=>(s+(+p.quantite*(+p.prix_unitaire||0))),0);

  const addMut = useMutation({ mutationFn:d=>cAPI.addStock(d), onSuccess:()=>{ toast.success("Produit ajouté !"); qc.invalidateQueries(["cl-stock"]); setShowAdd(false); }, onError:()=>toast.error("Erreur") });

  const f = k => e => setForm(p=>({...p,[k]:e.target.value}));
  const CATS = ["Médicament","Consommable","Équipement","Désinfectant","Dispositif médical"];
  const UNITES = ["boite","flacon","sachet","ampoule","comprimé","litre","pièce","carton"];

  // Fournisseurs démo
  const FOURNISSEURS = [
    { id:1, nom:"Pharma Ivoire SARL", contact:"+225 27 00 00 00", produits:"Médicaments généraux" },
    { id:2, nom:"MediSupply CI", contact:"+225 27 11 11 11", produits:"Consommables médicaux" },
    { id:3, nom:"BioLab Diagnostics", contact:"+225 27 22 22 22", produits:"Réactifs, équipements labo" },
  ];

  const STOCK_TABS = [
    { key:"inventaire", label:"Inventaire" },
    { key:"alertes", label:`Alertes (${alertes.length})` },
    { key:"fournisseurs", label:"Fournisseurs" },
    { key:"commandes", label:"Commandes" },
  ];

  return (
    <div>
      <PageHeader title="💊 Gestion du Stock" subtitle="Médicaments · Consommables · Équipements"
        actions={<><Btn onClick={()=>setShowAdd(true)}>+ Ajouter</Btn><Btn variant="outline">Commande →</Btn></>} />

      <Grid cols={4} gap={14} style={{marginBottom:20}}>
        <Card label="Produits total" value={stock.length} icon="📦" color={C.blue} />
        <Card label="Alertes stock" value={alertes.length} icon="⚠️" color={alertes.length>0?C.red:C.green} sub="Sous le seuil" />
        <Card label="Valeur inventaire" value={`${fmt(totalValeur)} F`} icon="💰" color={C.green} />
        <Card label="Ruptures" value={stock.filter(s=>s.quantite===0).length} icon="🚫" color={C.red} />
      </Grid>

      {/* Tabs */}
      <div style={{ display:"flex", gap:4, background:C.input, borderRadius:10, padding:4, marginBottom:20 }}>
        {STOCK_TABS.map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)}
            style={{ flex:1, background:tab===t.key?C.hover:"transparent", border:"none", borderRadius:8, padding:"9px 4px", cursor:"pointer", fontFamily:"inherit", color:tab===t.key?C.text:C.muted, fontSize:12, fontWeight:tab===t.key?700:400 }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab==="inventaire" && (
        isLoading ? <Loader /> : (
          <Panel>
            {stock.length===0
              ? <Empty icon="💊" title="Stock vide" subtitle="Ajoutez votre premier produit" />
              : <Table columns={[
                  { key:"nom", label:"Produit", render:(v,r)=><><div style={{fontWeight:700}}>{v}</div><div style={{fontSize:11,color:C.muted}}>{r.categorie}</div></> },
                  { key:"quantite", label:"Qté", render:(v,r)=>(
                    <div>
                      <span style={{ fontWeight:700, color:v===0?C.red:v<=r.seuil_alerte?C.amber:C.green, fontSize:15 }}>{v}</span>
                      <span style={{ fontSize:11, color:C.dim }}> {r.unite}</span>
                    </div>
                  )},
                  { key:"seuil_alerte", label:"Seuil", render:v=><span style={{color:C.muted}}>{v||"—"}</span> },
                  { key:"prix_unitaire", label:"Prix unit.", render:v=>v?`${fmt(v)} F`:"—" },
                  { key:"date_expiration", label:"Expiration", render:v=>v?<span style={{color:new Date(v)<new Date()?C.red:C.muted}}>{fmtDate(v)}</span>:"—" },
                  { key:"fournisseur", label:"Fournisseur", render:v=><span style={{fontSize:12,color:C.muted}}>{v||"—"}</span> },
                  { key:"quantite", label:"Statut", render:(v,r)=>(
                    <Badge color={v===0?"red":v<=r.seuil_alerte?"amber":"green"}>
                      {v===0?"Rupture":v<=r.seuil_alerte?"Alerte":"OK"}
                    </Badge>
                  )},
                ]} rows={stock} />
            }
          </Panel>
        )
      )}

      {tab==="alertes" && (
        <Panel title={`⚠️ Produits sous le seuil (${alertes.length})`} accent={alertes.length>0?"rgba(225,29,72,.3)":undefined}>
          {alertes.length===0
            ? <Empty icon="✅" title="Aucune alerte" subtitle="Tous les stocks sont au-dessus du seuil" />
            : alertes.map(s=>(
              <div key={s.id} style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 0", borderBottom:`1px solid ${C.border}` }}>
                <span style={{ fontSize:22 }}>💊</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:C.text }}>{s.nom}</div>
                  <div style={{ fontSize:12, color:C.muted, marginBottom:6 }}>Stock : <strong style={{color:s.quantite===0?C.red:C.amber}}>{s.quantite}</strong> / Seuil : {s.seuil_alerte} {s.unite}</div>
                  <ProgressBar value={s.quantite} max={s.seuil_alerte*2} color={s.quantite===0?C.red:C.amber} />
                </div>
                <Btn variant="amber" style={{padding:"7px 14px",fontSize:12}} onClick={()=>toast.success("Commande créée !")}>Commander</Btn>
              </div>
            ))
          }
        </Panel>
      )}

      {tab==="fournisseurs" && (
        <Panel title="Fournisseurs et contacts" actions={<Btn style={{padding:"6px 14px",fontSize:12}}>+ Fournisseur</Btn>}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:14 }}>
            {FOURNISSEURS.map(f=>(
              <div key={f.id} style={{ background:C.hover, borderRadius:12, padding:16 }}>
                <div style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:6 }}>{f.nom}</div>
                <div style={{ fontSize:12, color:C.muted, marginBottom:4 }}>📞 {f.contact}</div>
                <div style={{ fontSize:12, color:C.muted, marginBottom:12 }}>📦 {f.produits}</div>
                <Btn variant="outline" style={{width:"100%",padding:"7px",fontSize:12}} onClick={()=>toast.success("Commande envoyée !")}>Passer commande</Btn>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {tab==="commandes" && (
        <Panel title="Historique des commandes et réceptions">
          <Empty icon="📦" title="Commandes et réceptions" subtitle="L'historique des commandes fournisseurs apparaîtra ici" />
        </Panel>
      )}

      {/* Modal: Ajouter produit */}
      <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="📦 Ajouter un produit au stock">
        <Inp label="Nom du produit *" required value={form.nom} onChange={f("nom")} placeholder="Amoxicilline 500mg" />
        <Grid cols={2} gap={12}>
          <Sel label="Catégorie" value={form.categorie} onChange={f("categorie")} options={CATS} />
          <Sel label="Unité" value={form.unite} onChange={f("unite")} options={UNITES} />
          <Inp label="Quantité *" required value={form.quantite} onChange={f("quantite")} type="number" placeholder="100" />
          <Inp label="Seuil d'alerte" value={form.seuil_alerte} onChange={f("seuil_alerte")} type="number" placeholder="20" />
          <Inp label="Prix unitaire (FCFA)" value={form.prix_unitaire} onChange={f("prix_unitaire")} type="number" placeholder="500" />
          <Inp label="Date d'expiration" value={form.date_expiration} onChange={f("date_expiration")} type="date" />
        </Grid>
        <Inp label="Fournisseur" value={form.fournisseur} onChange={f("fournisseur")} placeholder="Pharma Ivoire SARL" />
        <div style={{display:"flex",gap:10,marginTop:4}}>
          <Btn variant="outline" style={{flex:1}} onClick={()=>setShowAdd(false)}>Annuler</Btn>
          <Btn style={{flex:2}} loading={addMut.isPending} onClick={()=>{ if(!form.nom||!form.quantite){toast.error("Nom et quantité requis");return;} addMut.mutate(form); }}>Ajouter au stock</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  6. PAGE FINANCE
// ════════════════════════════════════════════════════════════════════
function PageFacturation() {
  const [tab, setTab] = useState("tableau-bord");
  const { data: factData } = useQuery({ queryKey:["cl-factures"], queryFn:()=>cAPI.factures().then(r=>r.data.data||[]) });
  const factures = factData||[];
  const totalEncaisse = factures.filter(f=>f.statut==="payee").reduce((s,f)=>s+(+f.montant||0),0);
  const totalAttente  = factures.filter(f=>f.statut==="en_attente").reduce((s,f)=>s+(+f.montant||0),0);

  const FINANCE_TABS = [
    { key:"tableau-bord", label:"Tableau de bord" },
    { key:"factures", label:"Factures" },
    { key:"budget", label:"Budget" },
    { key:"assurances", label:"Remboursements" },
    { key:"rapports", label:"Rapports" },
  ];

  // Données budget démo
  const BUDGET_ITEMS = [
    { categorie:"Salaires", budget:2500000, realise:2450000, couleur:C.blue },
    { categorie:"Médicaments & Stock", budget:800000, realise:920000, couleur:C.amber },
    { categorie:"Loyer & charges", budget:400000, realise:400000, couleur:C.teal },
    { categorie:"Équipements", budget:300000, realise:120000, couleur:C.purple },
    { categorie:"Marketing", budget:150000, realise:80000, couleur:C.green },
  ];
  const totalBudget = BUDGET_ITEMS.reduce((s,b)=>s+b.budget,0);
  const totalRealise = BUDGET_ITEMS.reduce((s,b)=>s+b.realise,0);

  return (
    <div>
      <PageHeader title="💰 Gestion Financière" subtitle="Budget · Facturation · États financiers · Remboursements" />

      <div style={{ display:"flex", gap:4, background:C.input, borderRadius:10, padding:4, marginBottom:20 }}>
        {FINANCE_TABS.map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)}
            style={{ flex:1, background:tab===t.key?C.hover:"transparent", border:"none", borderRadius:8, padding:"9px 4px", cursor:"pointer", fontFamily:"inherit", color:tab===t.key?C.text:C.muted, fontSize:12, fontWeight:tab===t.key?700:400 }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab==="tableau-bord" && (
        <>
          <Grid cols={4} gap={14} style={{marginBottom:20}}>
            <Card label="Encaissé ce mois" value={`${fmt(totalEncaisse)} F`} icon="✅" color={C.green} sub="Factures payées" />
            <Card label="En attente" value={`${fmt(totalAttente)} F`} icon="⏳" color={C.amber} sub="À encaisser" />
            <Card label="Total factures" value={factures.length} icon="📄" color={C.blue} />
            <Card label="Taux recouvrement" value={factures.length>0?`${Math.round(factures.filter(f=>f.statut==="payee").length/factures.length*100)}%`:"—"} icon="📊" color={C.teal} />
          </Grid>
          <Grid cols={2} gap={20}>
            <Panel title="📊 Budget vs Réalisé — Ce mois">
              {BUDGET_ITEMS.map(b=>(
                <div key={b.categorie} style={{marginBottom:16}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:5,fontSize:13}}>
                    <span style={{color:C.muted}}>{b.categorie}</span>
                    <span style={{color:b.realise>b.budget?C.red:C.green,fontWeight:700}}>{fmt(b.realise)} / {fmt(b.budget)} F</span>
                  </div>
                  <ProgressBar value={b.realise} max={b.budget} color={b.realise>b.budget?C.red:b.couleur} />
                </div>
              ))}
              <div style={{borderTop:`1px solid ${C.border}`,paddingTop:14,marginTop:4,display:"flex",justifyContent:"space-between"}}>
                <span style={{color:C.muted}}>Total</span>
                <span style={{fontWeight:800,color:totalRealise>totalBudget?C.red:C.green}}>{fmt(totalRealise)} / {fmt(totalBudget)} F</span>
              </div>
            </Panel>
            <Panel title="📋 Dernières factures">
              {factures.length===0
                ? <Empty icon="📄" title="Aucune facture" />
                : factures.slice(0,6).map(f=>(
                  <div key={f.id} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:700,color:C.text}}>{f.patient_nom||"Patient"}</div>
                      <div style={{fontSize:11,color:C.muted}}>{fmtDate(f.created_at)}</div>
                    </div>
                    <span style={{fontWeight:800,color:C.text}}>{fmt(f.montant)} F</span>
                    <Badge color={{payee:"green",en_attente:"amber",annulee:"red"}[f.statut]||"gray"}>{f.statut}</Badge>
                  </div>
                ))
              }
            </Panel>
          </Grid>
        </>
      )}

      {tab==="factures" && (
        <Panel title="Toutes les factures" actions={<Btn style={{padding:"6px 14px",fontSize:12}}>+ Facture</Btn>}>
          {factures.length===0
            ? <Empty icon="📄" title="Aucune facture" subtitle="Les factures générées depuis la caisse apparaîtront ici" />
            : <Table columns={[
                { key:"reference", label:"Référence", render:v=><span style={{fontFamily:"monospace",fontSize:12,color:C.teal}}>{v||"—"}</span> },
                { key:"patient_nom", label:"Patient", render:v=><span style={{fontWeight:700}}>{v||"—"}</span> },
                { key:"montant", label:"Montant", render:v=><span style={{fontWeight:800,color:C.green}}>{fmt(v)} F</span> },
                { key:"statut", label:"Statut", render:v=><Badge color={{payee:"green",en_attente:"amber",annulee:"red"}[v]||"gray"}>{v}</Badge> },
                { key:"created_at", label:"Date", render:v=>fmtDate(v) },
                { key:"id", label:"", render:()=><Btn variant="outline" style={{padding:"4px 10px",fontSize:11}} onClick={()=>toast.success("Facture téléchargée !")}>PDF</Btn> },
              ]} rows={factures} />
          }
        </Panel>
      )}

      {tab==="budget" && (
        <Panel title="Budget mensuel et annuel">
          <div style={{ background:"rgba(10,143,88,.06)", border:"1px solid rgba(10,143,88,.2)", borderRadius:12, padding:16, marginBottom:20 }}>
            <Grid cols={3} gap={14}>
              <div style={{textAlign:"center"}}><div style={{fontSize:12,color:C.dim,marginBottom:4}}>Budget mensuel</div><div style={{fontSize:22,fontWeight:900,color:C.text}}>{fmt(totalBudget)} F</div></div>
              <div style={{textAlign:"center"}}><div style={{fontSize:12,color:C.dim,marginBottom:4}}>Réalisé</div><div style={{fontSize:22,fontWeight:900,color:totalRealise>totalBudget?C.red:C.green}}>{fmt(totalRealise)} F</div></div>
              <div style={{textAlign:"center"}}><div style={{fontSize:12,color:C.dim,marginBottom:4}}>Solde</div><div style={{fontSize:22,fontWeight:900,color:totalBudget-totalRealise>=0?C.green:C.red}}>{fmt(Math.abs(totalBudget-totalRealise))} F</div></div>
            </Grid>
          </div>
          {BUDGET_ITEMS.map(b=>(
            <div key={b.categorie} style={{ background:C.hover, borderRadius:10, padding:14, marginBottom:10 }}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <span style={{fontSize:14,fontWeight:700,color:C.text}}>{b.categorie}</span>
                <div style={{display:"flex",gap:8}}>
                  <Badge color="gray">Budget: {fmt(b.budget)} F</Badge>
                  <Badge color={b.realise>b.budget?"red":"green"}>Réel: {fmt(b.realise)} F</Badge>
                </div>
              </div>
              <ProgressBar value={b.realise} max={b.budget*1.2} color={b.realise>b.budget?C.red:b.couleur} />
            </div>
          ))}
        </Panel>
      )}

      {tab==="assurances" && (
        <Panel title="Demandes de remboursement assurance">
          <Empty icon="🛡️" title="Remboursements assurance" subtitle="Gérez ici les demandes de remboursement tiers-payant — intégration module assurance" />
        </Panel>
      )}

      {tab==="rapports" && (
        <Panel title="Rapports financiers">
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:14 }}>
            {[["📊","Bilan mensuel","Résultats du mois en cours"],["📈","Compte de résultat","Pertes et profits annuels"],["📋","Déclaration impôts","Formulaires fiscaux"],["💹","Taux de recouvrement","Suivi des paiements"],["🏦","Trésorerie","Flux de trésorerie"],["📉","Analyse des coûts","Répartition des charges"]].map(([icon,titre,desc])=>(
              <button key={titre} onClick={()=>toast.success(`Rapport "${titre}" en cours de génération…`)}
                style={{ background:C.hover, border:`1px solid ${C.border}`, borderRadius:12, padding:18, cursor:"pointer", textAlign:"left", fontFamily:"inherit", transition:"border-color .15s" }}
                onMouseOver={e=>e.currentTarget.style.borderColor=C.green} onMouseOut={e=>e.currentTarget.style.borderColor=C.border}>
                <div style={{fontSize:28,marginBottom:10}}>{icon}</div>
                <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:4}}>{titre}</div>
                <div style={{fontSize:11,color:C.dim}}>{desc}</div>
              </button>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  7. PAGE QUALITÉ & DOCUMENTS
// ════════════════════════════════════════════════════════════════════
function PageQualite() {
  const [tab, setTab] = useState("qualite");

  const QUAL_TABS = [
    { key:"qualite", label:"Contrôle qualité" },
    { key:"incidents", label:"Incidents" },
    { key:"politiques", label:"Politiques" },
    { key:"urgences", label:"Urgences" },
    { key:"satisfaction", label:"Satisfaction" },
  ];

  const INCIDENTS_DEMO = [
    { id:1, type:"Chute patient", date:"2026-05-01", gravite:"Modérée", statut:"résolu", responsable:"Dr. Koné" },
    { id:2, type:"Erreur médicament", date:"2026-04-28", gravite:"Grave", statut:"en_cours", responsable:"Infirmerie" },
    { id:3, type:"Panne équipement", date:"2026-04-20", gravite:"Mineure", statut:"résolu", responsable:"Technique" },
  ];

  const POLITIQUES_DEMO = [
    { id:1, titre:"Manuel de politique interne", categorie:"Gouvernance", version:"v3.2", date:"2026-01-01" },
    { id:2, titre:"Procédures d'urgence médicale", categorie:"Urgences", version:"v2.0", date:"2025-12-01" },
    { id:3, titre:"Politique de confidentialité des données", categorie:"RGPD", version:"v1.5", date:"2025-11-15" },
    { id:4, titre:"Normes d'hygiène et stérilisation", categorie:"Hygiène", version:"v4.1", date:"2026-02-01" },
    { id:5, titre:"Protocole de recrutement", categorie:"RH", version:"v2.3", date:"2025-10-01" },
  ];

  const SATISFACTION_DEMO = [
    { critere:"Accueil et orientation", note:4.5, reponses:124 },
    { critere:"Qualité des soins", note:4.7, reponses:118 },
    { critere:"Temps d'attente", note:3.8, reponses:130 },
    { critere:"Propreté des locaux", note:4.6, reponses:126 },
    { critere:"Communication médecin", note:4.4, reponses:115 },
    { critere:"Facilité de prise de RDV", note:4.2, reponses:119 },
  ];

  return (
    <div>
      <PageHeader title="📋 Qualité & Documentation" subtitle="Contrôle qualité · Incidents · Politiques · Satisfaction patients" />

      <div style={{ display:"flex", gap:4, background:C.input, borderRadius:10, padding:4, marginBottom:20 }}>
        {QUAL_TABS.map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)}
            style={{ flex:1, background:tab===t.key?C.hover:"transparent", border:"none", borderRadius:8, padding:"9px 4px", cursor:"pointer", fontFamily:"inherit", color:tab===t.key?C.text:C.muted, fontSize:12, fontWeight:tab===t.key?700:400 }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab==="qualite" && (
        <>
          <Grid cols={4} gap={14} style={{marginBottom:20}}>
            <Card label="Score qualité global" value="92%" icon="⭐" color={C.green} sub="Excellent" />
            <Card label="Incidents ce mois" value={INCIDENTS_DEMO.length} icon="⚠️" color={C.amber} />
            <Card label="Audits réalisés" value={3} icon="✅" color={C.teal} sub="Ce trimestre" />
            <Card label="Protocoles actifs" value={POLITIQUES_DEMO.length} icon="📋" color={C.blue} />
          </Grid>
          <Grid cols={2} gap={20}>
            <Panel title="📊 Indicateurs de performance">
              {[{l:"Taux de satisfaction patients",v:91,c:C.green},{l:"Taux de ponctualité RDV",v:78,c:C.teal},{l:"Conformité hygiène",v:95,c:C.green},{l:"Respect protocoles",v:88,c:C.blue}].map(k=>(
                <div key={k.l} style={{marginBottom:16}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:5,fontSize:13}}>
                    <span style={{color:C.muted}}>{k.l}</span>
                    <span style={{fontWeight:700,color:k.c}}>{k.v}%</span>
                  </div>
                  <ProgressBar value={k.v} max={100} color={k.c} />
                </div>
              ))}
            </Panel>
            <Panel title="🔄 Amélioration continue" actions={<Btn style={{padding:"6px 14px",fontSize:12}}>+ Action</Btn>}>
              {[{icon:"✅",l:"Réduction temps d'attente",s:"En cours",c:C.amber},{icon:"✅",l:"Formation hygiène mains",s:"Complété",c:C.green},{icon:"🔄",l:"Audit qualité Q2 2026",s:"Planifié",c:C.blue},{icon:"📋",l:"Révision protocoles urgence",s:"En cours",c:C.amber}].map((a,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
                  <span style={{fontSize:18}}>{a.icon}</span>
                  <div style={{flex:1,fontSize:13,color:C.text}}>{a.l}</div>
                  <Badge color={{Complété:"green","En cours":"amber",Planifié:"blue"}[a.s]||"gray"}>{a.s}</Badge>
                </div>
              ))}
            </Panel>
          </Grid>
        </>
      )}

      {tab==="incidents" && (
        <Panel title="Rapports d'incidents" actions={<Btn style={{padding:"6px 14px",fontSize:12}}>+ Incident</Btn>}>
          <Table columns={[
            { key:"type", label:"Type d'incident", render:v=><span style={{fontWeight:700}}>{v}</span> },
            { key:"date", label:"Date", render:v=>fmtDate(v) },
            { key:"gravite", label:"Gravité", render:v=><Badge color={{Grave:"red",Modérée:"amber",Mineure:"gray"}[v]||"gray"}>{v}</Badge> },
            { key:"responsable", label:"Responsable" },
            { key:"statut", label:"Statut", render:v=><Badge color={{résolu:"green",en_cours:"amber"}[v]||"gray"}>{v}</Badge> },
            { key:"id", label:"", render:()=><Btn variant="outline" style={{padding:"4px 10px",fontSize:11}}>Voir</Btn> },
          ]} rows={INCIDENTS_DEMO} />
        </Panel>
      )}

      {tab==="politiques" && (
        <Panel title="Politiques et procédures" actions={<Btn style={{padding:"6px 14px",fontSize:12}}>+ Document</Btn>}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))", gap:14 }}>
            {POLITIQUES_DEMO.map(p=>(
              <div key={p.id} style={{ background:C.hover, borderRadius:12, padding:16, cursor:"pointer", transition:"border-color .15s" }}
                onClick={()=>toast.success(`Ouverture : ${p.titre}`)}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                  <Badge color="blue">{p.categorie}</Badge>
                  <span style={{fontSize:11,color:C.dim}}>{p.version}</span>
                </div>
                <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:4}}>{p.titre}</div>
                <div style={{fontSize:11,color:C.dim}}>Mis à jour : {fmtDate(p.date)}</div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {tab==="urgences" && (
        <Panel title="Procédures d'urgence et contacts">
          <div style={{ background:"rgba(225,29,72,.08)", border:"1px solid rgba(225,29,72,.2)", borderRadius:12, padding:16, marginBottom:20 }}>
            <div style={{fontSize:14,fontWeight:700,color:C.red,marginBottom:12}}>🚨 Contacts d'urgence</div>
            <Grid cols={2} gap={12}>
              {[["SAMU","15"],["Pompiers","18"],["Police","17"],["Croix-Rouge","+225 27 00 00 00"],["Hôpital CHU","+225 27 11 22 33"],["Directeur médical","+225 07 00 00 00"]].map(([k,v])=>(
                <div key={k} style={{background:C.input,borderRadius:8,padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:13,color:C.text}}>{k}</span>
                  <span style={{fontSize:14,fontWeight:800,color:C.red}}>{v}</span>
                </div>
              ))}
            </Grid>
          </div>
          <Grid cols={2} gap={14}>
            {[["🏃","Plan d'évacuation","Voies de sortie et points de rassemblement"],["💊","Urgence médicale","Protocole RCP et défibrillateur"],["🔥","Incendie","Extincteurs et procédures d'évacuation"],["⚡","Panne électrique","Groupe électrogène et procédures"]].map(([icon,titre,desc])=>(
              <div key={titre} style={{background:C.hover,borderRadius:12,padding:16,cursor:"pointer"}} onClick={()=>toast.success(`Procédure : ${titre}`)}>
                <div style={{fontSize:28,marginBottom:8}}>{icon}</div>
                <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:4}}>{titre}</div>
                <div style={{fontSize:12,color:C.dim}}>{desc}</div>
              </div>
            ))}
          </Grid>
        </Panel>
      )}

      {tab==="satisfaction" && (
        <>
          <Grid cols={3} gap={14} style={{marginBottom:20}}>
            <Card label="Note globale" value="4.4 / 5" icon="⭐" color={C.amber} sub="Excellent" />
            <Card label="Réponses collectées" value={SATISFACTION_DEMO.reduce((s,r)=>s+r.reponses,0)} icon="📊" color={C.blue} />
            <Card label="Taux de recommandation" value="89%" icon="👍" color={C.green} />
          </Grid>
          <Panel title="Satisfaction par critère">
            {SATISFACTION_DEMO.map(s=>(
              <div key={s.critere} style={{marginBottom:16}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5,fontSize:13}}>
                  <span style={{color:C.text,fontWeight:500}}>{s.critere}</span>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:11,color:C.dim}}>{s.reponses} rép.</span>
                    <span style={{fontWeight:800,color:s.note>=4.5?C.green:s.note>=4?C.teal:s.note>=3?C.amber:C.red}}>{s.note}/5</span>
                  </div>
                </div>
                <ProgressBar value={s.note} max={5} color={s.note>=4.5?C.green:s.note>=4?C.teal:s.note>=3?C.amber:C.red} />
              </div>
            ))}
          </Panel>
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  8. PAGE ASSURANCES (existante, améliorée)
// ════════════════════════════════════════════════════════════════════
function PageAssurance() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ patient_nom:"", compagnie:"NSIA Assurances", numero_police:"", taux_couverture:80, montant_plafond:500000 });
  const { data, isLoading } = useQuery({ queryKey:["cl-dossiers"], queryFn:()=>cAPI.dossiers().then(r=>r.data.data||[]) });
  const updMut = useMutation({ mutationFn:({id,statut})=>cAPI.updateDossier(id,{statut}), onSuccess:()=>{ toast.success("Dossier mis à jour"); qc.invalidateQueries(["cl-dossiers"]); } });
  const addMut = useMutation({ mutationFn:d=>cAPI.addDossier(d), onSuccess:()=>{ toast.success("Dossier soumis !"); qc.invalidateQueries(["cl-dossiers"]); setShowAdd(false); } });
  const delMut = useMutation({ mutationFn:id=>cAPI.deleteDossier(id), onSuccess:()=>{ toast.success("Supprimé"); qc.invalidateQueries(["cl-dossiers"]); } });

  const f = k => e => setForm(p=>({...p,[k]:e.target.value}));
  const dossiers = data||[];
  const COMPAGNIES = ["NSIA Assurances","Allianz CI","AXA CI","CNAM (CMU)","SANLAM","Saham Assurances","Atlantique Assurances"];
  const scol = { soumis:"blue", en_attente:"amber", valide:"green", rejete:"red" };
  const fmt_money = v => <span style={{fontWeight:700,color:C.green}}>{fmt(v)} F</span>;

  return (
    <div>
      <PageHeader title="🛡️ Assurances Tiers-Payant" subtitle="Dossiers remboursement · Conventions assurance"
        actions={<Btn onClick={()=>setShowAdd(true)}>+ Nouveau dossier</Btn>} />
      <Grid cols={4} gap={14} style={{marginBottom:20}}>
        <Card label="Total dossiers" value={dossiers.length} icon="📁" />
        <Card label="Validés" value={dossiers.filter(d=>d.statut==="valide").length} icon="✅" color={C.green} />
        <Card label="En attente" value={dossiers.filter(d=>["en_attente","soumis"].includes(d.statut)).length} icon="⏳" color={C.amber} />
        <Card label="À récupérer" value={`${fmt(dossiers.filter(d=>d.statut==="valide").reduce((s,d)=>s+(+d.montant_assur||0),0))} F`} icon="💰" color={C.green} />
      </Grid>
      {isLoading ? <Loader /> : (
        <Panel>
          <Table emptyMsg="Aucun dossier assurance" columns={[
            { key:"patient_nom", label:"Patient", render:(v,r)=><><div style={{fontWeight:700}}>{v||r.patient_id||"—"}</div><div style={{fontSize:11,color:C.muted}}>{r.numero_police}</div></> },
            { key:"compagnie", label:"Compagnie" },
            { key:"montant_total", label:"Total", render:v=>fmt_money(v) },
            { key:"montant_assur", label:"Part ass.", render:v=>fmt_money(v) },
            { key:"ticket_moder", label:"Ticket mod.", render:v=><span style={{fontWeight:700,color:C.amber}}>{fmt(v)} F</span> },
            { key:"statut", label:"Statut", render:v=><Badge color={scol[v]||"gray"}>{v}</Badge> },
            { key:"id", label:"Actions", render:(id,row)=>(
              <div style={{display:"flex",gap:5}}>
                {row.statut==="soumis"&&<Btn variant="outline" style={{padding:"4px 9px",fontSize:11,color:C.teal}} onClick={()=>updMut.mutate({id,statut:"en_attente"})}>→</Btn>}
                {row.statut==="en_attente"&&<Btn variant="outline" style={{padding:"4px 9px",fontSize:11,color:C.green}} onClick={()=>updMut.mutate({id,statut:"valide"})}>✓</Btn>}
                <Btn variant="outline" style={{padding:"4px 9px",fontSize:11,color:C.red}} onClick={()=>window.confirm("Supprimer ?")&&delMut.mutate(id)}>✕</Btn>
              </div>
            )},
          ]} rows={dossiers} />
        </Panel>
      )}
      <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="🛡️ Nouveau dossier assurance">
        <Inp label="Patient *" required value={form.patient_nom} onChange={f("patient_nom")} placeholder="Nom du patient" />
        <Grid cols={2} gap={12}>
          <Sel label="Compagnie *" required value={form.compagnie} onChange={f("compagnie")} options={COMPAGNIES} />
          <Inp label="N° Police *" required value={form.numero_police} onChange={f("numero_police")} placeholder="POL-2024-XXXXX" />
          <Inp label="Taux couverture (%)" type="number" min="0" max="100" value={form.taux_couverture} onChange={f("taux_couverture")} />
          <Inp label="Montant actes (FCFA)" type="number" required value={form.montant_plafond} onChange={f("montant_plafond")} />
        </Grid>
        <div style={{background:"rgba(10,143,88,.07)",border:"1px solid rgba(10,143,88,.2)",borderRadius:8,padding:12,marginBottom:14,fontSize:13}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <span style={{color:C.muted}}>Part assureur ({form.taux_couverture}%)</span>
            <span style={{color:C.green,fontWeight:700}}>{fmt(Math.round(form.montant_plafond*form.taux_couverture/100))} FCFA</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between"}}>
            <span style={{color:C.muted}}>Ticket modérateur ({100-form.taux_couverture}%)</span>
            <span style={{color:C.amber,fontWeight:700}}>{fmt(Math.round(form.montant_plafond*(100-form.taux_couverture)/100))} FCFA</span>
          </div>
        </div>
        <div style={{display:"flex",gap:10}}>
          <Btn variant="outline" style={{flex:1}} onClick={()=>setShowAdd(false)}>Annuler</Btn>
          <Btn style={{flex:2}} loading={addMut.isPending} onClick={()=>{
            if(!form.patient_nom||!form.numero_police){toast.error("Patient et N° police requis");return;}
            addMut.mutate({...form,montant_total:form.montant_plafond,montant_assur:Math.round(form.montant_plafond*form.taux_couverture/100),ticket_moder:Math.round(form.montant_plafond*(100-form.taux_couverture)/100),diagnostic:"Actes médicaux"});
          }}>Soumettre</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  9. PAGE STATISTIQUES
// ════════════════════════════════════════════════════════════════════
function PageStats() {
  const MOIS = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
  const PATIENTS = [45,62,58,71,83,76,91,88,95,102,87,110];
  const REVENUS  = [820000,1150000,980000,1320000,1490000,1380000,1670000,1580000,1820000,1950000,1740000,2100000];
  const MAX_P = Math.max(...PATIENTS); const MAX_R = Math.max(...REVENUS);

  return (
    <div>
      <PageHeader title="📊 Statistiques & Rapports" subtitle="Analyses · Performance · Tendances" />
      <Grid cols={4} gap={14} style={{marginBottom:24}}>
        <Card label="Patients ce mois" value={PATIENTS[4]} icon="👤" color={C.blue} sub="+12% vs mois dernier" />
        <Card label="Revenus ce mois" value={`${fmt(REVENUS[4])} F`} icon="💰" color={C.green} sub="+8% vs mois dernier" />
        <Card label="Taux satisfaction" value="91%" icon="⭐" color={C.amber} sub="Enquête mensuelle" />
        <Card label="RDV honorés" value="94%" icon="📅" color={C.teal} sub="Taux de présence" />
      </Grid>
      <Grid cols={2} gap={20}>
        <Panel title="📈 Patients par mois">
          <div style={{display:"flex",alignItems:"flex-end",gap:5,height:140,paddingTop:10}}>
            {MOIS.map((m,i)=>{
              const h = Math.round((PATIENTS[i]/MAX_P)*100);
              return (
                <div key={m} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                  <div style={{fontSize:9,color:C.green,fontWeight:700}}>{PATIENTS[i]}</div>
                  <div style={{width:"100%",height:`${h}%`,background:i===4?`linear-gradient(to top,${C.green},${C.teal})`:`rgba(10,143,88,.3)`,borderRadius:"3px 3px 0 0"}} />
                  <div style={{fontSize:8,color:C.dim}}>{m}</div>
                </div>
              );
            })}
          </div>
        </Panel>
        <Panel title="💰 Revenus par mois (kFCFA)">
          <div style={{display:"flex",alignItems:"flex-end",gap:5,height:140,paddingTop:10}}>
            {MOIS.map((m,i)=>{
              const h = Math.round((REVENUS[i]/MAX_R)*100);
              return (
                <div key={m} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                  <div style={{fontSize:9,color:C.amber,fontWeight:700}}>{Math.round(REVENUS[i]/1000)}</div>
                  <div style={{width:"100%",height:`${h}%`,background:i===4?`linear-gradient(to top,${C.amber},${C.green})`:`rgba(217,119,6,.3)`,borderRadius:"3px 3px 0 0"}} />
                  <div style={{fontSize:8,color:C.dim}}>{m}</div>
                </div>
              );
            })}
          </div>
        </Panel>
        <Panel title="🩺 Répartition par spécialité">
          {[{l:"Médecine générale",v:42,c:C.green},{l:"Pédiatrie",v:18,c:C.blue},{l:"Gynécologie",v:15,c:C.purple},{l:"Cardiologie",v:12,c:C.red},{l:"Autres",v:13,c:C.muted}].map(k=>(
            <div key={k.l} style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:13}}>
                <span style={{color:C.muted}}>{k.l}</span>
                <span style={{fontWeight:700,color:k.c}}>{k.v}%</span>
              </div>
              <ProgressBar value={k.v} max={100} color={k.c} />
            </div>
          ))}
        </Panel>
        <Panel title="📊 Indicateurs clés">
          {[{l:"Taux occupation médecins",v:78,c:C.teal},{l:"RDV annulés",v:6,c:C.red},{l:"Patients fidélisés",v:67,c:C.green},{l:"Nouveaux patients",v:33,c:C.blue},{l:"Paiement assurance",v:42,c:C.purple}].map(k=>(
            <div key={k.l} style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:13}}>
                <span style={{color:C.muted}}>{k.l}</span>
                <span style={{fontWeight:700,color:k.c}}>{k.v}%</span>
              </div>
              <ProgressBar value={k.v} max={100} color={k.c} />
            </div>
          ))}
        </Panel>
      </Grid>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  PAGE CONSULTATION (simplifiée ici, complète dans le vrai fichier)
// ════════════════════════════════════════════════════════════════════
function PageConsultation() {
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [patient, setPatient] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({motif:"",diagnostic:"",traitement:"",ta:"",temperature:"",poids:"",taille:"",notes:""});
  const [lastConsult, setLastConsult] = useState(null);
  const [showOrd, setShowOrd] = useState(false);
  const [lignes, setLignes] = useState([{nom:"",qte:"",posologie:""}]);
  const addLigne = ()=>setLignes(l=>[...l,{nom:"",qte:"",posologie:""}]);
  const delLigne = (i)=>setLignes(l=>l.filter((_,j)=>j!==i));
  const updLigne = (i,k,v)=>setLignes(l=>l.map((row,j)=>j===i?{...row,[k]:v}:row));

  const chercher = async () => {
    if(code.length<3){toast.error("Code invalide");return;}
    setLoading(true);
    try {
      const r = await api.get(`/patients/recherche?code=${encodeURIComponent(code.toUpperCase())}`);
      if(r.success&&r.data){setPatient(r.data);toast.success("Patient trouvé !");}
      else toast.error("Patient introuvable");
    } catch(e){toast.error("Erreur de recherche");}
    setLoading(false);
  };

  const addMut = useMutation({
    mutationFn: d=>api.post('/consultations',d),
    onSuccess: (data)=>{toast.success("✅ Consultation enregistrée !");setShowForm(false);setLastConsult(data?.data||data);setShowOrd(true);setForm({motif:"",diagnostic:"",traitement:"",ta:"",temperature:"",poids:"",taille:"",notes:""});qc.invalidateQueries(["cl-stats"]);},
    onError: ()=>toast.error("Erreur enregistrement"),
  });

  const addOrd = useMutation({
    mutationFn: d => api.post('/ordonnances',d),
    onSuccess: ()=>{ toast.success("💊 Ordonnance créée !"); setShowOrd(false); setLignes([{nom:"",qte:"",posologie:""}]); },
    onError: ()=>toast.error("Erreur ordonnance"),
  });

  return (
    <div>
      <PageHeader title="🩺 Consultation" subtitle="Accès par code patient" />
      <Panel style={{maxWidth:540,margin:"0 auto 20px"}}>
        <div style={{marginBottom:18}}>
          <label style={{display:"block",fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".5px",marginBottom:8}}>Code secret patient</label>
          <div style={{display:"flex",gap:10}}>
            <input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} onKeyDown={e=>e.key==="Enter"&&chercher()} placeholder="MC-KJ-0001"
              style={{flex:1,background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:9,padding:"11px 14px",color:C.text,fontSize:16,outline:"none",fontFamily:"monospace",letterSpacing:2}}
              onFocus={e=>e.target.style.borderColor=C.green} onBlur={e=>e.target.style.borderColor=C.border}/>
            <Btn loading={loading} onClick={chercher}>Rechercher</Btn>
          </div>
          <div style={{fontSize:11,color:C.dim,marginTop:6}}>Code visible sur la carte MediConnect du patient (ex: MC-KJ-0001)</div>
        </div>
        {patient&&(
          <div style={{background:"rgba(10,143,88,.08)",border:"1px solid rgba(10,143,88,.2)",borderRadius:12,padding:16}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
              <div style={{width:44,height:44,background:`linear-gradient(135deg,${C.green},${C.teal})`,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,color:"#fff",fontSize:18}}>{patient.prenom?.[0]||"P"}</div>
              <div>
                <div style={{fontSize:15,fontWeight:800,color:C.text}}>{patient.prenom||"—"} {patient.nom||"—"}</div>
                <div style={{fontSize:12,color:C.muted}}>Code: {patient.code_secret} · {patient.groupe_sanguin||"—"} · {patient.telephone||"—"}</div>
              </div>
            </div>
            {patient.allergies&&<div style={{fontSize:12,color:C.amber,marginBottom:8}}>⚠️ Allergies: {patient.allergies}</div>}
            {patient.antecedents&&<div style={{fontSize:12,color:C.muted,marginBottom:8}}>📋 Antécédents: {patient.antecedents}</div>}
            <Btn style={{width:"100%",marginTop:4}} onClick={()=>setShowForm(true)}>🩺 Démarrer la consultation</Btn>
          </div>
        )}
      </Panel>

      {showForm&&patient&&(
        <div onClick={()=>setShowForm(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}>
          <div onClick={e=>e.stopPropagation()} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:28,width:560,maxWidth:"95vw",maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <h2 style={{fontSize:17,fontWeight:700,color:C.text,margin:0}}>🩺 {patient.prenom} {patient.nom}</h2>
              <button onClick={()=>setShowForm(false)} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:20}}>✕</button>
            </div>
            {[["Motif *","motif","Raison de la consultation"],["Diagnostic *","diagnostic","Hypertension artérielle…"],["Traitement","traitement","Amlodipine 5mg…"]].map(([label,key,ph])=>(
              <div key={key} style={{marginBottom:12}}>
                <label style={{display:"block",fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",marginBottom:4}}>{label}</label>
                <input value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} placeholder={ph}
                  style={{width:"100%",background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:9,padding:"10px 14px",color:C.text,fontSize:14,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
              </div>
            ))}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:12}}>
              {[["T.A.","ta","120/80"],["Temp","temperature","37"],["Poids","poids","70"],["Taille","taille","175"]].map(([label,key,ph])=>(
                <div key={key}>
                  <label style={{display:"block",fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",marginBottom:4}}>{label}</label>
                  <input value={form[key]||""} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} placeholder={ph}
                    style={{width:"100%",background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:9,padding:"8px 10px",color:C.text,fontSize:12,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
                </div>
              ))}
            </div>
            <div style={{marginBottom:16}}>
              <label style={{display:"block",fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",marginBottom:4}}>Notes</label>
              <textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={3} placeholder="Observations…"
                style={{width:"100%",background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:9,padding:"10px 14px",color:C.text,fontSize:14,resize:"none",outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setShowForm(false)} style={{flex:1,padding:"10px",borderRadius:9,background:"transparent",border:`1.5px solid ${C.border}`,color:C.muted,cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>Annuler</button>
              <button disabled={addMut.isPending} onClick={()=>{
                if(!form.motif||!form.diagnostic){toast.error("Motif et diagnostic requis");return;}
                addMut.mutate({patient_id:patient.id,...form,tension_arterielle:form.ta});
              }} style={{flex:2,padding:"10px",borderRadius:9,background:`linear-gradient(135deg,${C.green},${C.teal})`,border:"none",color:"#fff",cursor:addMut.isPending?"not-allowed":"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit",opacity:addMut.isPending?.65:1}}>
                {addMut.isPending?"⏳…":"✅ Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
      {showOrd&&patient&&(
        <div onClick={()=>setShowOrd(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#0E1620",border:"1px solid #1E2F42",borderRadius:16,padding:28,width:480,maxWidth:"95vw"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <h2 style={{fontSize:16,fontWeight:700,color:"#F0F4F8",margin:0}}>💊 Ordonnance — {patient.prenom} {patient.nom}</h2>
              <button onClick={()=>setShowOrd(false)} style={{background:"none",border:"none",color:"#8BA0B5",cursor:"pointer",fontSize:20}}>✕</button>
            </div>
            <div style={{background:"rgba(124,58,237,.08)",border:"1px solid rgba(124,58,237,.2)",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:12,color:"#8BA0B5"}}>
              Consultation enregistrée ✅ — Voulez-vous ajouter une ordonnance ?
            </div>
            <div style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <label style={{fontSize:11,fontWeight:700,color:"#8BA0B5",textTransform:"uppercase"}}>Médicaments *</label>
                <button onClick={addLigne} style={{background:"rgba(124,58,237,.15)",border:"1px solid rgba(124,58,237,.3)",borderRadius:6,padding:"4px 10px",color:"#A78BFA",cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"inherit"}}>+ Ajouter un médicament</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 2fr auto",gap:6,marginBottom:6}}>
                {["Nom","Dosage","Posologie",""].map((h,i)=><div key={i} style={{fontSize:10,color:"#4E657A",fontWeight:700,textTransform:"uppercase"}}>{h}</div>)}
              </div>
              {lignes.map((l,i)=>(
                <div key={i} style={{display:"grid",gridTemplateColumns:"2fr 1fr 2fr auto",gap:6,marginBottom:8,alignItems:"center"}}>
                  <input value={l.nom} onChange={e=>updLigne(i,"nom",e.target.value)} placeholder={i===0?"Paracétamol":"Médicament..."}
                    style={{background:"#1A2535",border:"1.5px solid #1E2F42",borderRadius:8,padding:"8px 10px",color:"#F0F4F8",fontSize:13,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
                  <input value={l.qte} onChange={e=>updLigne(i,"qte",e.target.value)} placeholder="500mg"
                    style={{background:"#1A2535",border:"1.5px solid #1E2F42",borderRadius:8,padding:"8px 10px",color:"#F0F4F8",fontSize:13,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
                  <input value={l.posologie} onChange={e=>updLigne(i,"posologie",e.target.value)} placeholder="1 cp matin/soir"
                    style={{background:"#1A2535",border:"1.5px solid #1E2F42",borderRadius:8,padding:"8px 10px",color:"#F0F4F8",fontSize:13,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
                  <button onClick={()=>delLigne(i)} style={{background:lignes.length>1?"rgba(225,29,72,.1)":"transparent",border:lignes.length>1?"1px solid rgba(225,29,72,.2)":"none",borderRadius:6,padding:"6px 8px",color:lignes.length>1?"#E11D48":"#4E657A",cursor:lignes.length>1?"pointer":"default",fontSize:14,fontFamily:"inherit"}}>
                    {lignes.length>1?"✕":"—"}
                  </button>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:10,marginTop:8}}>
              <button onClick={()=>setShowOrd(false)} style={{flex:1,padding:"10px",borderRadius:9,background:"transparent",border:"1.5px solid #1E2F42",color:"#8BA0B5",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>Passer</button>
              <button disabled={addOrd.isPending} onClick={()=>{
                const valides = lignes.filter(l=>l.nom.trim());
                if(!valides.length){toast.error("Au moins un médicament requis");return;}
                const medicament = valides.map(l=>`${l.nom}${l.qte?' '+l.qte:''}${l.posologie?' — '+l.posologie:''}`).join('\n');
                addOrd.mutate({patient_id:patient.id,consultation_id:lastConsult?.id,medicament,posologie:valides[0]?.posologie||"",duree:""});
              }} style={{flex:2,padding:"10px",borderRadius:9,background:"linear-gradient(135deg,#7C3AED,#0D9488)",border:"none",color:"#fff",cursor:addOrd.isPending?"not-allowed":"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit",opacity:addOrd.isPending?.65:1}}>
                {addOrd.isPending?"⏳…":"💊 Créer l'ordonnance"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  PAGE CAISSE (simplifiée)
// ════════════════════════════════════════════════════════════════════
function PageCaisse() {
  const [open, setOpen] = useState(false);
  const { data } = useQuery({ queryKey:["cl-caisse"], queryFn:()=>cAPI.caisse().then(r=>r.data.data||{}), retry:1 });
  const session = data||{};
  return (
    <div>
      <PageHeader title="💰 Caisse" subtitle="Sessions d'encaissement et décaissements"
        actions={!open&&<Btn onClick={()=>{setOpen(true);toast.success("Caisse ouverte !");}}>Ouvrir la caisse</Btn>} />
      {!open
        ? <Panel style={{maxWidth:400,margin:"0 auto",textAlign:"center",padding:48}}>
            <div style={{fontSize:48,marginBottom:16}}>🔒</div>
            <div style={{fontSize:16,fontWeight:700,color:C.text,marginBottom:8}}>Caisse fermée</div>
            <div style={{fontSize:13,color:C.muted,marginBottom:24}}>Ouvrez la caisse pour commencer les encaissements</div>
            <Btn style={{width:"100%"}} onClick={()=>{setOpen(true);toast.success("Caisse ouverte !");}}>Ouvrir la caisse</Btn>
          </Panel>
        : <>
            <Grid cols={3} gap={14} style={{marginBottom:20}}>
              <Card label="Encaissements" value={`${fmt(session.total_encaisse||0)} F`} icon="✅" color={C.green} />
              <Card label="Décaissements" value={`${fmt(session.total_decaisse||0)} F`} icon="📤" color={C.amber} />
              <Card label="Solde caisse" value={`${fmt((session.total_encaisse||0)-(session.total_decaisse||0))} F`} icon="💰" color={C.teal} />
            </Grid>
            <Grid cols={2} gap={20}>
              <Panel title="📥 Encaissement">
                <Inp label="Montant (FCFA)" type="number" placeholder="5000" style={{marginBottom:10}} />
                <Sel label="Mode de paiement" options={["Espèces","Mobile Money","Carte bancaire","Chèque"]} style={{marginBottom:10}} />
                <Inp label="Référence / Patient" placeholder="Nom du patient ou référence" style={{marginBottom:14}} />
                <Btn style={{width:"100%"}} onClick={()=>toast.success("Encaissement enregistré !")}>Encaisser</Btn>
              </Panel>
              <Panel title="📤 Décaissement">
                <Inp label="Montant (FCFA)" type="number" placeholder="2000" style={{marginBottom:10}} />
                <Inp label="Motif" placeholder="Achat fournitures, remboursement…" style={{marginBottom:14}} />
                <Btn variant="amber" style={{width:"100%"}} onClick={()=>toast.success("Décaissement enregistré !")}>Décaisser</Btn>
                <Btn variant="danger" style={{width:"100%",marginTop:10}} onClick={()=>{setOpen(false);toast.success("Caisse clôturée !");}}>Clôturer la caisse</Btn>
              </Panel>
            </Grid>
          </>
      }
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  ROUTER PRINCIPAL
// ════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════
//  FILE D'ATTENTE DIGITALISÉE
// ══════════════════════════════════════════════════════════════════
function PageFileAttente(){
  const { user, token } = useAuthStore();
  const queryClient = useQueryClient();
  const [tab, setTab] = React.useState('en_attente');
  const [showQR, setShowQR] = React.useState(false);
  const cliniqueId = user?.clinique_id;

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['file-attente', tab],
    queryFn: async () => {
      const r = await fetch(
        `https://mediconnect-backend-v2.vercel.app/api/file-attente/liste?statut=${tab === 'tous' ? '' : tab}`,
        { headers }
      );
      return r.json();
    },
    refetchInterval: 10000, // Auto-refresh toutes les 10 secondes
  });

  const { data: statsData } = useQuery({
    queryKey: ['file-attente-stats'],
    queryFn: async () => {
      const r = await fetch(`https://mediconnect-backend-v2.vercel.app/api/file-attente/stats-jour`, { headers });
      return r.json();
    },
    refetchInterval: 10000,
  });

  const updateStatut = async (id, action) => {
    await fetch(`https://mediconnect-backend-v2.vercel.app/api/file-attente/${id}/${action}`, { method: 'PUT', headers });
    queryClient.invalidateQueries(['file-attente']);
    queryClient.invalidateQueries(['file-attente-stats']);
  };

  const liste = data?.data || [];
  const stats = statsData?.data || {};
  const scanUrl = `https://manager.mediconnect4africa.cloud/scan-accueil?clinique_id=${cliniqueId}`;

  const STATUT_COLOR = {
    en_attente: { bg: 'rgba(245,158,11,.15)', color: '#F59E0B', label: 'En attente' },
    appele:     { bg: 'rgba(59,130,246,.15)',  color: '#3B82F6', label: 'Appelé' },
    en_consultation: { bg: 'rgba(10,143,88,.15)', color: C.green, label: 'En consultation' },
    termine:    { bg: 'rgba(107,114,128,.15)', color: C.muted, label: 'Terminé' },
    annule:     { bg: 'rgba(239,68,68,.15)',   color: C.red,   label: 'Annulé' },
  };

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:12}}>
        <div>
          <h2 style={{fontSize:20,fontWeight:700,color:C.text}}>🚶 File d'attente</h2>
          <p style={{fontSize:13,color:C.muted,marginTop:2}}>Mise à jour automatique toutes les 10 secondes</p>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>refetch()} style={{padding:'8px 16px',background:'transparent',border:`1px solid ${C.border}`,borderRadius:8,color:C.muted,fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>↻ Actualiser</button>
          <button onClick={()=>setShowQR(true)} style={{padding:'8px 16px',background:C.teal,border:'none',borderRadius:8,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>📱 QR Code accueil</button>
        </div>
      </div>

      {/* Stats du jour */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:12,marginBottom:20}}>
        {[
          { label:'En attente', val:stats.en_attente||0, color:'#F59E0B' },
          { label:'Appelés',    val:stats.appele||0,     color:'#3B82F6' },
          { label:'En consul.', val:stats.en_consultation||0, color:C.green },
          { label:'Terminés',   val:stats.termine||0,    color:C.muted },
          { label:'Total',      val:stats.total||0,      color:C.text },
        ].map(s=>(
          <div key={s.label} style={{background:C.input,border:`1px solid ${C.border}`,borderRadius:12,padding:'14px 16px'}}>
            <div style={{fontSize:24,fontWeight:700,color:s.color}}>{s.val}</div>
            <div style={{fontSize:12,color:C.muted,marginTop:2}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Onglets */}
      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
        {[
          {key:'en_attente',label:'En attente'},
          {key:'appele',label:'Appelés'},
          {key:'en_consultation',label:'En consultation'},
          {key:'termine',label:'Terminés'},
          {key:'tous',label:'Tous'},
        ].map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)} style={{
            padding:'7px 16px',borderRadius:20,fontSize:13,fontWeight:tab===t.key?700:400,
            border:`1px solid ${tab===t.key?C.teal:C.border}`,
            background:tab===t.key?'rgba(13,148,136,.15)':'transparent',
            color:tab===t.key?C.teal:C.muted,cursor:'pointer',fontFamily:'inherit'
          }}>{t.label}</button>
        ))}
      </div>

      {/* Liste */}
      {isLoading ? <Loader/> : liste.length===0 ? (
        <div style={{textAlign:'center',padding:'3rem',color:C.muted}}>
          <div style={{fontSize:40,marginBottom:12}}>🚶</div>
          <div style={{fontSize:15,fontWeight:600,marginBottom:6}}>File d'attente vide</div>
          <div style={{fontSize:13}}>Les patients apparaîtront ici après avoir scanné le QR Code d'accueil</div>
        </div>
      ) : (
        <div style={{background:C.input,border:`1px solid ${C.border}`,borderRadius:14,overflow:'hidden'}}>
          {/* Header tableau */}
          <div style={{display:'grid',gridTemplateColumns:'60px 1fr 1fr 1fr 120px 200px',gap:8,padding:'10px 16px',borderBottom:`1px solid ${C.border}`,fontSize:11,fontWeight:700,color:C.dim,textTransform:'uppercase',letterSpacing:'.5px'}}>
            <span>Rang</span><span>Patient</span><span>Médecin</span><span>Heure scan</span><span>Statut</span><span>Actions</span>
          </div>
          {liste.map((e,i)=>(
            <div key={e.id} style={{
              display:'grid',gridTemplateColumns:'60px 1fr 1fr 1fr 120px 200px',
              gap:8,padding:'12px 16px',
              borderBottom:i<liste.length-1?`1px solid ${C.border}`:'none',
              alignItems:'center',
              background:i%2===0?'transparent':'rgba(255,255,255,.01)'
            }}>
              <div style={{width:36,height:36,borderRadius:8,background:'rgba(13,148,136,.15)',border:`1px solid ${C.teal}`,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:16,color:C.teal}}>{e.rang}</div>
              <div>
                <div style={{fontWeight:600,fontSize:14,color:C.text}}>{e.patient_nom}</div>
                {e.patient_telephone&&<div style={{fontSize:11,color:C.dim,marginTop:2}}>{e.patient_telephone}</div>}
              </div>
              <div style={{fontSize:13,color:C.muted}}>{e.medecin_nom||'Non assigné'}</div>
              <div style={{fontSize:12,color:C.dim}}>
                {e.heure_scan ? new Date(e.heure_scan).toLocaleTimeString('fr-CI',{hour:'2-digit',minute:'2-digit'}) : '—'}
              </div>
              <div>
                <span style={{fontSize:11,fontWeight:700,padding:'3px 8px',borderRadius:20,
                  background:STATUT_COLOR[e.statut]?.bg,color:STATUT_COLOR[e.statut]?.color}}>
                  {STATUT_COLOR[e.statut]?.label||e.statut}
                </span>
              </div>
              <div style={{display:'flex',gap:6}}>
                {e.statut==='en_attente'&&(
                  <button onClick={()=>updateStatut(e.id,'appeler')} style={{flex:1,padding:'6px 0',background:'rgba(59,130,246,.15)',border:'1px solid rgba(59,130,246,.3)',borderRadius:7,color:'#3B82F6',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                    📣 Appeler
                  </button>
                )}
                {e.statut==='appele'&&(
                  <button onClick={()=>updateStatut(e.id,'consultation')} style={{flex:1,padding:'6px 0',background:'rgba(10,143,88,.15)',border:`1px solid rgba(10,143,88,.3)`,borderRadius:7,color:C.green,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                    🩺 Entré
                  </button>
                )}
                {e.statut==='en_consultation'&&(
                  <button onClick={()=>updateStatut(e.id,'terminer')} style={{flex:1,padding:'6px 0',background:'rgba(107,114,128,.15)',border:'1px solid rgba(107,114,128,.3)',borderRadius:7,color:C.muted,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                    ✓ Terminé
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal QR Code */}
      {showQR&&(
        <Modal open={showQR} onClose={()=>setShowQR(false)} title="QR Code d'accueil — À imprimer et afficher">
          <div style={{textAlign:'center',padding:'1rem'}}>
            <p style={{fontSize:13,color:C.muted,marginBottom:20,lineHeight:1.7}}>
              Imprimez et affichez ce QR Code à l'accueil de votre clinique.<br/>
              Les patients le scannent avec leur application MediConnect pour rejoindre la file d'attente.
            </p>
            <div style={{background:'#fff',borderRadius:12,padding:20,display:'inline-block',marginBottom:16}}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(scanUrl)}&color=065F3C&bgcolor=ffffff`}
                alt="QR Code file attente"
                style={{width:200,height:200,display:'block'}}
              />
            </div>
            <div style={{background:C.input,borderRadius:8,padding:'10px 14px',marginBottom:16}}>
              <div style={{fontSize:11,color:C.muted,marginBottom:4}}>URL de scan :</div>
              <div style={{fontSize:12,color:C.text,fontFamily:'monospace',wordBreak:'break-all'}}>{scanUrl}</div>
            </div>
            <button onClick={()=>window.print()} style={{padding:'10px 24px',background:C.green,border:'none',borderRadius:8,color:'#fff',fontWeight:700,fontSize:14,cursor:'pointer',fontFamily:'inherit'}}>
              🖨️ Imprimer le QR Code
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}


function PageFileAttenteMedecinClinique(){
  const { token } = useAuthStore();
  const [liste, setListe] = React.useState([]);
  const [stats, setStats] = React.useState({});
  const [loading, setLoading] = React.useState(true);
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchListe = async () => {
    try {
      const r = await fetch(`https://mediconnect-backend-v2.vercel.app/api/file-attente/liste`, { headers });
      const d = await r.json();
      if (d.success) { setListe(d.data||[]); setStats(d.stats||{}); }
    } catch(e) {}
    setLoading(false);
  };

  React.useEffect(() => {
    fetchListe();
    const iv = setInterval(fetchListe, 10000);
    return () => clearInterval(iv);
  }, []);

  const updateStatut = async (id, action) => {
    await fetch(`https://mediconnect-backend-v2.vercel.app/api/file-attente/${id}/${action}`, { method:'PUT', headers });
    fetchListe();
  };

  const STATUT = {
    en_attente:      { bg:'rgba(245,158,11,.15)', color:'#F59E0B', label:'En attente' },
    appele:          { bg:'rgba(59,130,246,.15)',  color:'#3B82F6', label:'Appelé' },
    en_consultation: { bg:'rgba(10,143,88,.15)',   color:C.green,   label:'En consultation' },
    termine:         { bg:'rgba(107,114,128,.15)', color:C.muted,   label:'Terminé' },
  };

  const actifs = liste.filter(e=>['en_attente','appele','en_consultation'].includes(e.statut));

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
        <div>
          <h2 style={{fontSize:20,fontWeight:700,color:C.text}}>🩺 Mes patients en attente</h2>
          <p style={{fontSize:13,color:C.muted,marginTop:2}}>Mise à jour automatique toutes les 10 secondes</p>
        </div>
        <button onClick={fetchListe} style={{padding:'8px 16px',background:'transparent',border:`1px solid ${C.border}`,borderRadius:8,color:C.muted,fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>↻ Actualiser</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:12,marginBottom:20}}>
        {[{label:'En attente',val:stats.en_attente||0,color:'#F59E0B'},{label:'En consultation',val:stats.en_consultation||0,color:C.green},{label:'Terminés',val:stats.termine||0,color:C.muted},{label:'Total jour',val:stats.total||0,color:C.text}].map(s=>(
          <div key={s.label} style={{background:C.input,border:`1px solid ${C.border}`,borderRadius:12,padding:'14px 16px'}}>
            <div style={{fontSize:24,fontWeight:700,color:s.color}}>{s.val}</div>
            <div style={{fontSize:12,color:C.muted,marginTop:2}}>{s.label}</div>
          </div>
        ))}
      </div>
      {loading ? <Loader/> : actifs.length===0 ? (
        <div style={{textAlign:'center',padding:'3rem',background:C.input,border:`1px solid ${C.border}`,borderRadius:14}}>
          <div style={{fontSize:40,marginBottom:12}}>✅</div>
          <div style={{fontSize:15,fontWeight:600,color:C.text}}>Aucun patient en attente</div>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {actifs.map(e=>(
            <div key={e.id} style={{background:C.input,border:`1.5px solid ${e.statut==='appele'?'#3B82F6':C.border}`,borderRadius:12,padding:'14px 16px',display:'flex',alignItems:'center',gap:14,flexWrap:'wrap'}}>
              <div style={{width:44,height:44,borderRadius:10,background:'rgba(13,148,136,.15)',border:`1.5px solid ${C.teal}`,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:20,color:C.teal,flexShrink:0}}>{e.rang}</div>
              <div style={{flex:1,minWidth:160}}>
                <div style={{fontWeight:700,fontSize:14,color:C.text}}>{e.patient_nom}</div>
                {e.patient_telephone&&<div style={{fontSize:12,color:C.dim,marginTop:2}}>📞 {e.patient_telephone}</div>}
                {e.motif&&<div style={{fontSize:12,color:C.muted,marginTop:2}}>💬 {e.motif}</div>}
              </div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
                <span style={{fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:20,background:STATUT[e.statut]?.bg,color:STATUT[e.statut]?.color}}>{STATUT[e.statut]?.label}</span>
                {e.statut==='en_attente'&&<button onClick={()=>updateStatut(e.id,'appeler')} style={{padding:'7px 14px',background:'rgba(59,130,246,.15)',border:'1px solid rgba(59,130,246,.3)',borderRadius:8,color:'#3B82F6',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>📣 Appeler</button>}
                {e.statut==='appele'&&<button onClick={()=>updateStatut(e.id,'consultation')} style={{padding:'7px 14px',background:'rgba(10,143,88,.15)',border:`1px solid rgba(10,143,88,.3)`,borderRadius:8,color:C.green,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>🩺 Entrer</button>}
                {e.statut==='en_consultation'&&<button onClick={()=>updateStatut(e.id,'terminer')} style={{padding:'7px 14px',background:'rgba(107,114,128,.15)',border:'1px solid rgba(107,114,128,.3)',borderRadius:8,color:C.muted,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>✓ Terminé</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PageProprietaire(){
  const { token } = useAuthStore();
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState('jour');
  const [journal, setJournal] = React.useState([]);
  const fmt = (n) => Number(n||0).toLocaleString('fr-CI');

  const fetchDashboard = async () => {
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const r = await fetch(`https://mediconnect-backend-v2.vercel.app/api/proprietaire/dashboard`, { headers });
      const d = await r.json();
      if (d.success) setData(d.data);
      else console.error('proprietaire dashboard error:', d.message);
    } catch(e) { console.error('fetch error:', e); }
    setLoading(false);
  };

  const fetchJournal = async () => {
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const r = await fetch(`https://mediconnect-backend-v2.vercel.app/api/caisse/journal`, { headers });
      const d = await r.json();
      if (d.success) setJournal(d.data);
    } catch(e) {}
  };

  React.useEffect(() => { fetchDashboard(); const iv=setInterval(fetchDashboard,30000); return ()=>clearInterval(iv); }, []);
  React.useEffect(() => { if(tab==='journal') fetchJournal(); }, [tab]);

  if (loading) return <Loader/>;
  if (!data) return <Empty icon="👁️" title="Données non disponibles" subtitle="Aucune donnée financière disponible"/>;

  const solde_jour = (data.jour?.entrees||0) - (data.jour?.sorties||0);
  const solde_mois = (data.mois?.entrees||0) - (data.mois?.sorties||0);

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:12}}>
        <div>
          <h2 style={{fontSize:20,fontWeight:700,color:C.text}}>👁️ Vue Propriétaire</h2>
          <p style={{fontSize:13,color:C.muted,marginTop:2}}>{data.clinique?.nom} · Actualisation auto 30s</p>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <span style={{fontSize:11,padding:'4px 10px',borderRadius:20,background:data.caisse_statut?.statut==='ouverte'?'rgba(10,143,88,.15)':'rgba(239,68,68,.15)',color:data.caisse_statut?.statut==='ouverte'?C.green:C.red,fontWeight:700}}>
            {data.caisse_statut?.statut==='ouverte'?'🟢 Caisse ouverte':'🔴 Caisse fermée'}
          </span>
          <button onClick={fetchDashboard} style={{padding:'7px 14px',background:'transparent',border:`1px solid ${C.border}`,borderRadius:8,color:C.muted,fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>↻</button>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:12,marginBottom:20}}>
        {[
          {label:'Entrées du jour',val:fmt(data.jour?.entrees)+' F',color:C.green,icon:'📈',sub:`${data.jour?.nb_entrees||0} opérations`},
          {label:'Sorties du jour',val:fmt(data.jour?.sorties)+' F',color:C.red,icon:'📉',sub:`${data.jour?.nb_sorties||0} opérations`},
          {label:'Solde net jour',val:fmt(solde_jour)+' F',color:solde_jour>=0?C.green:C.red,icon:'💰',sub:solde_jour>=0?'Positif':'Déficit'},
          {label:'Consultations',val:data.consultations?.jour?.nb||0,color:C.teal,icon:'🩺',sub:fmt(data.consultations?.jour?.revenu||0)+' F'},
        ].map(k=>(
          <div key={k.label} style={{background:C.input,border:`1.5px solid ${C.border}`,borderRadius:14,padding:'16px 18px'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
              <span style={{fontSize:18}}>{k.icon}</span>
              <span style={{fontSize:11,color:C.dim,fontWeight:700,textTransform:'uppercase',letterSpacing:'.5px'}}>{k.label}</span>
            </div>
            <div style={{fontSize:22,fontWeight:800,color:k.color}}>{k.val}</div>
            <div style={{fontSize:11,color:C.muted,marginTop:3}}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
        {[{key:'jour',label:"Aujourd'hui"},{key:'mois',label:'Ce mois'},{key:'evolution',label:'7 jours'},{key:'journal',label:'Journal'},{key:'analyse',label:'Analyse'}].map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)} style={{padding:'7px 16px',borderRadius:20,fontSize:13,fontWeight:tab===t.key?700:400,border:`1px solid ${tab===t.key?C.amber:C.border}`,background:tab===t.key?'rgba(217,119,6,.12)':'transparent',color:tab===t.key?C.amber:C.muted,cursor:'pointer',fontFamily:'inherit'}}>{t.label}</button>
        ))}
      </div>

      {tab==='jour'&&<div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
          <div style={{background:'rgba(10,143,88,.06)',border:'1px solid rgba(10,143,88,.2)',borderRadius:12,padding:20}}>
            <div style={{fontSize:11,color:C.muted,marginBottom:6,fontWeight:700}}>TOTAL ENTRÉES</div>
            <div style={{fontSize:32,fontWeight:800,color:C.green}}>{fmt(data.jour?.entrees)} F</div>
          </div>
          <div style={{background:'rgba(239,68,68,.06)',border:'1px solid rgba(239,68,68,.2)',borderRadius:12,padding:20}}>
            <div style={{fontSize:11,color:C.muted,marginBottom:6,fontWeight:700}}>TOTAL SORTIES</div>
            <div style={{fontSize:32,fontWeight:800,color:C.red}}>{fmt(data.jour?.sorties)} F</div>
          </div>
        </div>
        <div style={{background:solde_jour>=0?'rgba(10,143,88,.08)':'rgba(239,68,68,.08)',border:`1px solid ${solde_jour>=0?'rgba(10,143,88,.25)':'rgba(239,68,68,.25)'}`,borderRadius:12,padding:20,textAlign:'center',marginBottom:14}}>
          <div style={{fontSize:11,color:C.muted,marginBottom:6,fontWeight:700}}>SOLDE NET DU JOUR</div>
          <div style={{fontSize:40,fontWeight:900,color:solde_jour>=0?C.green:C.red}}>{solde_jour>=0?'+':''}{fmt(solde_jour)} F</div>
        </div>
        <div style={{fontSize:13,fontWeight:700,color:C.muted,marginBottom:10}}>10 DERNIERS MOUVEMENTS</div>
        {(data.derniers_mouvements||[]).length===0 ? <Empty icon="💰" title="Aucun mouvement" subtitle="Aucune opération aujourd'hui"/> : (data.derniers_mouvements||[]).map(m=>(
          <div key={m.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:`1px solid ${C.border}`}}>
            <span style={{fontSize:18}}>{m.type==='entree'?'📈':'📉'}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:600,color:C.text}}>{m.description||m.categorie}</div>
              <div style={{fontSize:11,color:C.dim,marginTop:2}}>{new Date(m.created_at).toLocaleTimeString('fr-CI',{hour:'2-digit',minute:'2-digit'})}</div>
            </div>
            <div style={{fontWeight:700,color:m.type==='entree'?C.green:C.red,fontSize:14}}>{m.type==='entree'?'+':'-'}{fmt(m.montant)} F</div>
          </div>
        ))}
      </div>}

      {tab==='mois'&&<div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12}}>
          {[{label:'Entrées mois',val:fmt(data.mois?.entrees)+' F',color:C.green},{label:'Sorties mois',val:fmt(data.mois?.sorties)+' F',color:C.red},{label:'Solde net',val:fmt(solde_mois)+' F',color:solde_mois>=0?C.green:C.red},{label:'Jours actifs',val:data.mois?.jours_actifs||0,color:C.teal},{label:'Consultations',val:data.consultations?.mois?.nb||0,color:C.teal},{label:'Revenu consul.',val:fmt(data.consultations?.mois?.revenu||0)+' F',color:C.green}].map(k=>(
            <div key={k.label} style={{background:C.input,border:`1px solid ${C.border}`,borderRadius:12,padding:'14px 16px'}}>
              <div style={{fontSize:11,color:C.dim,marginBottom:4}}>{k.label}</div>
              <div style={{fontSize:20,fontWeight:700,color:k.color}}>{k.val}</div>
            </div>
          ))}
        </div>
      </div>}

      {tab==='evolution'&&<div>
        {(data.evolution_7j||[]).length===0 ? <Empty icon="📊" title="Pas de données" subtitle="Aucun mouvement sur 7 jours"/> : (data.evolution_7j||[]).map((j,i)=>{
          const net=(parseFloat(j.entrees)||0)-(parseFloat(j.sorties)||0);
          return <div key={i} style={{background:C.input,border:`1px solid ${C.border}`,borderRadius:10,padding:'12px 16px',marginBottom:8}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
              <span style={{fontSize:13,fontWeight:600,color:C.text}}>{new Date(j.jour).toLocaleDateString('fr-CI',{weekday:'short',day:'numeric',month:'short'})}</span>
              <span style={{fontWeight:700,color:net>=0?C.green:C.red,fontSize:13}}>{net>=0?'+':''}{fmt(net)} F</span>
            </div>
            <div style={{display:'flex',gap:16}}>
              <span style={{fontSize:12,color:C.green}}>📈 {fmt(j.entrees)} F</span>
              <span style={{fontSize:12,color:C.red}}>📉 {fmt(j.sorties)} F</span>
            </div>
          </div>;
        })}
      </div>}

      {tab==='journal'&&<div>
        {journal.length===0 ? <Empty icon="📋" title="Journal vide" subtitle="Aucune opération"/> : (
          <div style={{background:C.input,border:`1px solid ${C.border}`,borderRadius:14,overflow:'hidden'}}>
            <div style={{display:'grid',gridTemplateColumns:'80px 1fr 100px 120px',gap:8,padding:'10px 16px',borderBottom:`1px solid ${C.border}`,fontSize:11,fontWeight:700,color:C.dim,textTransform:'uppercase'}}>
              <span>Heure</span><span>Description</span><span>Mode</span><span style={{textAlign:'right'}}>Montant</span>
            </div>
            {journal.map((m,i)=>(
              <div key={m.id} style={{display:'grid',gridTemplateColumns:'80px 1fr 100px 120px',gap:8,padding:'10px 16px',borderBottom:i<journal.length-1?`1px solid ${C.border}`:'none',alignItems:'center',background:i%2===0?'transparent':'rgba(255,255,255,.01)'}}>
                <span style={{fontSize:12,color:C.dim}}>{new Date(m.created_at).toLocaleTimeString('fr-CI',{hour:'2-digit',minute:'2-digit'})}</span>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:C.text}}>{m.description||m.categorie}</div>
                  {m.patient_nom&&<div style={{fontSize:11,color:C.dim}}>👤 {m.patient_nom}</div>}
                </div>
                <span style={{fontSize:11,color:C.dim}}>{m.mode_paiement}</span>
                <span style={{fontWeight:700,color:m.type==='entree'?C.green:C.red,fontSize:14,textAlign:'right'}}>{m.type==='entree'?'+':'-'}{fmt(m.montant)} F</span>
              </div>
            ))}
          </div>
        )}
      </div>}

      {tab==='analyse'&&<div>
        <div style={{fontSize:13,fontWeight:700,color:C.muted,marginBottom:14}}>RÉPARTITION DES DÉPENSES DU MOIS</div>
        {(data.top_depenses||[]).length===0 ? <Empty icon="📊" title="Aucune dépense" subtitle="Aucune dépense ce mois"/> : (()=>{
          const total=data.top_depenses.reduce((s,x)=>s+parseFloat(x.total),0);
          return data.top_depenses.map((d,i)=>{
            const pct=total>0?Math.round(parseFloat(d.total)/total*100):0;
            return <div key={i} style={{marginBottom:14}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                <span style={{fontSize:13,color:C.text,fontWeight:600,textTransform:'capitalize'}}>{d.categorie}</span>
                <span style={{fontSize:13,color:C.red,fontWeight:700}}>{fmt(d.total)} F ({pct}%)</span>
              </div>
              <div style={{background:C.border,borderRadius:4,height:6}}>
                <div style={{background:C.amber,borderRadius:4,height:6,width:`${pct}%`}}/>
              </div>
            </div>;
          });
        })()}
      </div>}
    </div>
  );
}


function PageProfilLogo(){
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  const [form, setForm] = React.useState({ slogan:'', adresse_complete:'', horaires:'', site_web:'' });
  const [logo, setLogo] = React.useState(null);
  const [preview, setPreview] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['clinique-profil'],
    queryFn: async () => {
      const r = await fetch('https://mediconnect-backend-v2.vercel.app/api/clinique/profil', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return r.json();
    }
  });

  React.useEffect(() => {
    if (data?.data) {
      const d = data.data;
      setForm({ slogan:d.slogan||'', adresse_complete:d.adresse_complete||'', horaires:d.horaires||'', site_web:d.site_web||'' });
      if (d.logo) setPreview(d.logo);
    }
  }, [data]);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2*1024*1024) { setMsg('Logo trop volumineux (max 2MB)'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => { setLogo(ev.target.result); setPreview(ev.target.result); };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true); setMsg('');
    try {
      const r = await fetch('https://mediconnect-backend-v2.vercel.app/api/clinique/logo', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ logo: logo||preview, ...form })
      });
      const d = await r.json();
      setMsg(d.success ? 'Profil mis a jour avec succes' : d.message);
      if (d.success) queryClient.invalidateQueries(['clinique-profil']);
    } catch(e) { setMsg('Erreur reseau'); }
    setSaving(false);
  };

  const profil = data?.data;

  return (
    <div>
      <PageHeader title="Profil & Logo" subtitle="Identite visuelle — En-tete et pied de page des impressions"/>
      {isLoading ? <Loader/> : (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,alignItems:'start'}}>
          <div>
            <div style={{background:C.input,border:`1.5px solid ${C.border}`,borderRadius:14,padding:24,marginBottom:16}}>
              <h3 style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:16}}>Logo de la clinique</h3>
              <div style={{width:'100%',height:160,borderRadius:10,border:`2px dashed ${preview?C.green:C.border}`,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:16,overflow:'hidden'}}>
                {preview ? <img src={preview} alt="Logo" style={{maxHeight:140,maxWidth:'100%',objectFit:'contain'}}/> : <div style={{textAlign:'center'}}><div style={{fontSize:36}}>🏥</div><div style={{fontSize:13,color:C.muted}}>Aucun logo</div></div>}
              </div>
              <label style={{display:'block',padding:'10px 16px',background:C.green,borderRadius:8,color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer',textAlign:'center'}}>
                Choisir un logo (JPG/PNG max 2MB)
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} style={{display:'none'}}/>
              </label>
            </div>
            <div style={{background:C.input,border:`1.5px solid ${C.border}`,borderRadius:14,padding:20}}>
              <h3 style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:12}}>Apercu en-tete impression</h3>
              <div style={{background:'#fff',borderRadius:8,padding:14}}>
                <div style={{display:'flex',alignItems:'center',gap:10,paddingBottom:8,borderBottom:'2px solid #0A8F58'}}>
                  {preview ? <img src={preview} alt="Logo" style={{height:44,objectFit:'contain'}}/> : <div style={{width:44,height:44,background:'#e5e7eb',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center'}}>🏥</div>}
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:'#1A2E25'}}>{profil?.nom||'Nom de la clinique'}</div>
                    {form.slogan&&<div style={{fontSize:11,color:'#5A7A94',fontStyle:'italic'}}>{form.slogan}</div>}
                    <div style={{fontSize:11,color:'#5A7A94'}}>{form.adresse_complete||profil?.adresse||'Adresse'} · {profil?.ville}</div>
                    <div style={{fontSize:11,color:'#5A7A94'}}>{profil?.telephone}{profil?.email?' · '+profil.email:''}</div>
                  </div>
                </div>
                <div style={{marginTop:6,fontSize:10,color:'#9CA3AF',textAlign:'center'}}>{form.horaires} {form.site_web?' · '+form.site_web:''}</div>
              </div>
            </div>
          </div>
          <div style={{background:C.input,border:`1.5px solid ${C.border}`,borderRadius:14,padding:24}}>
            <h3 style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:16}}>Informations affichees</h3>
            {[
              {label:'Slogan',key:'slogan',ph:'Ex: Votre sante, notre priorite'},
              {label:'Adresse complete',key:'adresse_complete',ph:'Ex: Cocody Riviera 2'},
              {label:'Horaires',key:'horaires',ph:'Ex: Lun-Sam 7h-20h'},
              {label:'Site web',key:'site_web',ph:'https://www.maclinique.ci'},
            ].map(f=>(
              <div key={f.key} style={{marginBottom:14}}>
                <label style={{fontSize:11,color:C.muted,display:'block',marginBottom:5,fontWeight:700}}>{f.label.toUpperCase()}</label>
                <input value={form[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} placeholder={f.ph}
                  style={{width:'100%',padding:'10px 12px',background:'rgba(255,255,255,.04)',border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:13,outline:'none',boxSizing:'border-box'}}/>
              </div>
            ))}
            {msg&&<div style={{padding:'10px 14px',borderRadius:8,background:'rgba(10,143,88,.1)',color:C.green,fontSize:13,marginBottom:14}}>{msg}</div>}
            <button onClick={handleSave} disabled={saving} style={{width:'100%',padding:'12px',background:C.green,border:'none',borderRadius:10,color:'#fff',fontWeight:700,fontSize:14,cursor:'pointer',fontFamily:'inherit'}}>
              {saving?'Enregistrement...':'Enregistrer le profil'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  return (
    <Routes>
      <Route index               element={<PageHome />} />
      <Route path="planning"     element={<PagePlanning />} />
      <Route path="dossiers"     element={<PageDossiers />} />
      <Route path="consultation" element={<PageConsultation />} />
      <Route path="caisse"       element={<PageCaisse />} />
      <Route path="facturation"  element={<PageFacturation />} />
      <Route path="medecins"     element={<PageMedecins />} />
      <Route path="stock"        element={<PageStock />} />
      <Route path="assurance"    element={<PageAssurance />} />
      <Route path="dossiers-ass" element={<PageAssurance />} />
      <Route path="file-attente"  element={<PageFileAttente />} />
      <Route path="file-medecin"  element={<PageFileAttenteMedecinClinique />} />
      <Route path="proprietaire"  element={<PageProprietaire />} />
      <Route path="profil-logo"   element={<PageProfilLogo />} />
      <Route path="qualite"      element={<PageQualite />} />
      <Route path="stats"        element={<PageStats />} />
      <Route path="*"            element={<PageHome />} />
    </Routes>
  );
}
