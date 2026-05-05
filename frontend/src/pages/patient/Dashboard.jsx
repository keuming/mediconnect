import React, { useState } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import useAuthStore from "../../context/authStore";
import api from "../../services/api";

// ── Palette ───────────────────────────────────────────────────────
const C = {
  green:"#0A8F58", teal:"#0D9488", amber:"#D97706", red:"#E11D48",
  blue:"#2563EB", purple:"#7C3AED",
  bg:"#060C12", card:"#0E1620", input:"#141E2B",
  hover:"#1A2535", border:"#1E2F42",
  text:"#F0F4F8", muted:"#8BA0B5", dim:"#4E657A",
};
const fmt     = (n) => Number(n||0).toLocaleString("fr-CI");
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("fr-CI",{day:"numeric",month:"long",year:"numeric"}) : "—";
const today   = () => new Date().toISOString().split("T")[0];
const age     = (dob) => { if(!dob) return "—"; const d=new Date(dob); return Math.floor((Date.now()-d)/31557600000)+" ans"; };

// ── API ───────────────────────────────────────────────────────────
const pAPI = {
  me:          () => api.get("/patients/me").catch(()=>api.get("/utilisateurs/me")),
  rdvs:        () => api.get("/rendez-vous"),
  addRdv:      (d) => api.post("/rendez-vous", d),
  cancelRdv:   (id) => api.put(`/rendez-vous/${id}`, { statut:"annule" }),
  ords:        () => api.get("/ordonnances"),
  consults:    () => api.get("/consultations"),
  cliniques:   () => api.get("/public/cliniques"),
  medecins:    () => api.get("/medecins"),
};

// ── UI Components ─────────────────────────────────────────────────
const Card = ({ label, value, icon, color=C.green, sub, onClick }) => (
  <div onClick={onClick} style={{ background:C.input, border:`1.5px solid ${C.border}`, borderRadius:14, padding:"18px 16px", cursor:onClick?"pointer":"default", transition:"border-color .15s" }}
    onMouseOver={e=>onClick&&(e.currentTarget.style.borderColor=color)} onMouseOut={e=>onClick&&(e.currentTarget.style.borderColor=C.border)}>
    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
      {icon && <span style={{ fontSize:18 }}>{icon}</span>}
      <span style={{ fontSize:11, textTransform:"uppercase", letterSpacing:".5px", color:C.dim, fontWeight:700 }}>{label}</span>
    </div>
    <div style={{ fontSize:26, fontWeight:900, color }}>{value}</div>
    {sub && <div style={{ fontSize:12, color:C.muted, marginTop:3 }}>{sub}</div>}
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
    blue:   { background:C.blue, color:"#fff", border:"none" },
  };
  return (
    <button type={type} onClick={onClick} disabled={loading}
      style={{ borderRadius:9, padding:"9px 18px", fontSize:13, fontWeight:700, cursor:loading?"not-allowed":"pointer", opacity:loading?.65:1, fontFamily:"inherit", ...v[variant]||v.primary, ...s }}>
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
      {options.map(o => typeof o==="string" ? <option key={o} value={o}>{o}</option> : <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  </div>
);

const Modal = ({ open, onClose, title, children, width=500 }) => {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:28, width, maxWidth:"95vw", maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <h2 style={{ fontSize:17, fontWeight:700, color:C.text, margin:0 }}>{title}</h2>
          <button onClick={onClose} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:20 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
};

const Loader  = () => <div style={{ textAlign:"center", padding:48, color:C.dim }}>⏳ Chargement…</div>;
const Empty   = ({ icon, title, subtitle }) => (
  <div style={{ textAlign:"center", padding:"40px 20px", color:C.dim }}>
    <div style={{ fontSize:40, marginBottom:10 }}>{icon}</div>
    {title && <div style={{ fontSize:15, fontWeight:700, color:C.muted, marginBottom:4 }}>{title}</div>}
    {subtitle && <div style={{ fontSize:13 }}>{subtitle}</div>}
  </div>
);
const Grid = ({ cols=2, gap=16, children, style:s={} }) => (
  <div style={{ display:"grid", gridTemplateColumns:`repeat(${cols},1fr)`, gap, ...s }}>{children}</div>
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

// ── Initiales avatar ──────────────────────────────────────────────
const Avatar = ({ prenom, nom, size=48, fontSize=18 }) => (
  <div style={{ width:size, height:size, borderRadius:"50%", background:`linear-gradient(135deg,${C.green},${C.teal})`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, color:"#fff", fontSize, flexShrink:0 }}>
    {prenom?.[0]}{nom?.[0]}
  </div>
);

// ════════════════════════════════════════════════════════════════════
//  1. HOME PATIENT
// ════════════════════════════════════════════════════════════════════
function PageHome() {
  const { user } = useAuthStore();
  const nav = useNavigate();
  const { data: rdvData }  = useQuery({ queryKey:["pat-rdvs"],   queryFn:()=>pAPI.rdvs().then(r=>r.data.data||[]),    retry:1 });
  const { data: ordData }  = useQuery({ queryKey:["pat-ords"],   queryFn:()=>pAPI.ords().then(r=>r.data.data||[]),    retry:1 });
  const { data: consData } = useQuery({ queryKey:["pat-consult"],queryFn:()=>pAPI.consults().then(r=>r.data.data||[]),retry:1 });

  const rdvs    = rdvData||[];
  const ords    = ordData||[];
  const consults= consData||[];

  const prochainRdv = rdvs.filter(r=>r.date_rdv>=today()&&r.statut!=="annule").sort((a,b)=>a.date_rdv>b.date_rdv?1:-1)[0];
  const rdvsActifs  = rdvs.filter(r=>r.statut!=="annule"&&r.statut!=="termine");
  const ordsActives = ords.filter(o=>o.statut==="active");

  const modules = [
    { icon:"📋", label:"Mon dossier médical", path:"dossier",     color:C.teal,   desc:"Informations & historique" },
    { icon:"📅", label:"Mes rendez-vous",      path:"rdvs",        color:C.blue,   desc:`${rdvsActifs.length} RDV actif(s)` },
    { icon:"💊", label:"Mes ordonnances",       path:"ordonnances", color:C.green,  desc:`${ordsActives.length} prescription(s)` },
    { icon:"🩺", label:"Consultations",         path:"consultations",color:C.purple,desc:`${consults.length} consultation(s)` },
    { icon:"🔍", label:"Rechercher un médecin", path:"recherche",   color:C.amber,  desc:"Trouver & prendre RDV" },
    { icon:"⭐", label:"Feedback & satisfaction",path:"feedback",   color:C.amber,  desc:"Évaluer mes soins" },
  ];

  return (
    <div>
      {/* En-tête personnalisé */}
      <div style={{ background:"linear-gradient(135deg,rgba(10,143,88,.12),rgba(13,148,136,.06))", border:`1px solid rgba(10,143,88,.2)`, borderRadius:16, padding:24, marginBottom:24, display:"flex", alignItems:"center", gap:20 }}>
        <Avatar prenom={user?.prenom} nom={user?.nom} size={64} fontSize={24} />
        <div style={{ flex:1 }}>
          <div style={{ fontSize:22, fontWeight:800, color:C.text, marginBottom:4 }}>Bonjour, {user?.prenom} ! 👋</div>
          <div style={{ fontSize:13, color:C.muted }}>Bienvenue sur votre espace santé MediConnect</div>
          {user?.code_secret && <div style={{ marginTop:8, display:"inline-flex", alignItems:"center", gap:8, background:"rgba(255,255,255,.06)", borderRadius:8, padding:"5px 12px" }}>
            <span style={{ fontSize:11, color:C.dim }}>Code patient</span>
            <span style={{ fontFamily:"monospace", fontSize:14, fontWeight:700, color:C.green, letterSpacing:2 }}>{user.code_secret}</span>
          </div>}
        </div>
        {prochainRdv && (
          <div style={{ background:"rgba(37,99,235,.1)", border:"1px solid rgba(37,99,235,.25)", borderRadius:12, padding:"14px 18px", textAlign:"center", flexShrink:0 }}>
            <div style={{ fontSize:11, color:C.blue, fontWeight:700, textTransform:"uppercase", marginBottom:4 }}>Prochain RDV</div>
            <div style={{ fontSize:16, fontWeight:800, color:C.text }}>{fmtDate(prochainRdv.date_rdv)}</div>
            <div style={{ fontSize:13, color:C.muted }}>{prochainRdv.heure_rdv?.slice(0,5)} · {prochainRdv.medecin_nom||"Médecin"}</div>
          </div>
        )}
      </div>

      {/* KPIs */}
      <Grid cols={4} gap={14} style={{ marginBottom:24 }}>
        <Card label="RDV actifs"       value={rdvsActifs.length}   icon="📅" color={C.blue}   sub="Confirmés ou en attente" onClick={()=>nav("rdvs")} />
        <Card label="Ordonnances"      value={ordsActives.length}  icon="💊" color={C.green}  sub="Prescriptions actives"   onClick={()=>nav("ordonnances")} />
        <Card label="Consultations"    value={consults.length}     icon="🩺" color={C.purple}  sub="Total enregistrées"      onClick={()=>nav("consultations")} />
        <Card label="Abonnement"       value="300 F/mois"          icon="💳" color={C.teal}   sub="Dossier + RDV en ligne" />
      </Grid>

      {/* Modules */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:14, marginBottom:24 }}>
        {modules.map(m => (
          <button key={m.path} onClick={()=>nav(m.path)}
            style={{ background:C.input, border:`1.5px solid ${C.border}`, borderRadius:14, padding:20, cursor:"pointer", textAlign:"left", fontFamily:"inherit", transition:"all .15s" }}
            onMouseOver={e=>{ e.currentTarget.style.borderColor=m.color; e.currentTarget.style.transform="translateY(-2px)"; }}
            onMouseOut={e=>{ e.currentTarget.style.borderColor=C.border; e.currentTarget.style.transform="none"; }}>
            <div style={{ fontSize:30, marginBottom:10 }}>{m.icon}</div>
            <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:4 }}>{m.label}</div>
            <div style={{ fontSize:11, color:C.dim }}>{m.desc}</div>
          </button>
        ))}
      </div>

      {/* Prochain RDV + Ordonnances récentes */}
      <Grid cols={2} gap={20}>
        <Panel title="📅 Mes prochains RDV" actions={<Btn style={{padding:"6px 14px",fontSize:12}} onClick={()=>nav("rdvs")}>Voir tout →</Btn>}>
          {rdvsActifs.length===0
            ? <Empty icon="📅" title="Aucun RDV prévu" subtitle="Prenez rendez-vous avec un médecin" />
            : rdvsActifs.slice(0,4).map(r=>(
              <div key={r.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>
                <div style={{ textAlign:"center", minWidth:52, background:C.hover, borderRadius:10, padding:"6px 8px" }}>
                  <div style={{ fontSize:13, fontWeight:800, color:C.text }}>{r.heure_rdv?.slice(0,5)||"—"}</div>
                  <div style={{ fontSize:10, color:C.dim }}>{r.date_rdv?new Date(r.date_rdv).toLocaleDateString("fr-CI",{day:"numeric",month:"short"}):"—"}</div>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{r.medecin_nom||"Médecin"}</div>
                  <div style={{ fontSize:11, color:C.muted }}>{r.motif||"Consultation"}</div>
                </div>
                <Badge color={{ confirme:"green", en_attente:"amber", annule:"red", en_cours:"teal" }[r.statut]||"gray"}>{r.statut}</Badge>
              </div>
            ))
          }
        </Panel>

        <Panel title="💊 Ordonnances récentes" actions={<Btn style={{padding:"6px 14px",fontSize:12}} onClick={()=>nav("ordonnances")}>Voir tout →</Btn>}>
          {ords.length===0
            ? <Empty icon="💊" title="Aucune ordonnance" subtitle="Vos prescriptions apparaîtront ici" />
            : ords.slice(0,4).map(o=>(
              <div key={o.id} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>
                <div style={{ width:3, background:C.green, borderRadius:2, alignSelf:"stretch", flexShrink:0, marginTop:2 }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:2 }}>{o.medicaments?.slice(0,50)||"—"}</div>
                  <div style={{ fontSize:11, color:C.muted }}>{o.duree||"—"} · {fmtDate(o.created_at)}</div>
                </div>
                <Badge color={o.statut==="active"?"green":"gray"}>{o.statut||"—"}</Badge>
              </div>
            ))
          }
        </Panel>
      </Grid>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  2. DOSSIER MÉDICAL
// ════════════════════════════════════════════════════════════════════
function PageDossier() {
  const { user } = useAuthStore();
  const { data: consData } = useQuery({ queryKey:["pat-consult"],queryFn:()=>pAPI.consults().then(r=>r.data.data||[]),retry:1 });
  const consults = consData||[];

  const infos = [
    ["Prénom", user?.prenom], ["Nom", user?.nom],
    ["Téléphone", user?.telephone], ["Email", user?.email],
    ["Date de naissance", fmtDate(user?.date_naissance)], ["Âge", age(user?.date_naissance)],
    ["Groupe sanguin", user?.groupe_sanguin], ["Ville", user?.ville],
    ["Assurance", user?.assurance], ["N° Police", user?.numero_police],
  ];

  return (
    <div>
      <PageHeader title="📋 Mon dossier médical" subtitle="Vos informations de santé personnelles" />

      <Grid cols={2} gap={20} style={{ marginBottom:20 }}>
        {/* Infos personnelles */}
        <Panel title="👤 Informations personnelles">
          <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:20, paddingBottom:16, borderBottom:`1px solid ${C.border}` }}>
            <Avatar prenom={user?.prenom} nom={user?.nom} size={56} fontSize={20} />
            <div>
              <div style={{ fontSize:18, fontWeight:800, color:C.text }}>{user?.prenom} {user?.nom}</div>
              <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>{user?.email||"—"}</div>
              {user?.code_secret && <div style={{ marginTop:6, fontFamily:"monospace", fontSize:13, color:C.green, fontWeight:700, letterSpacing:2 }}>{user.code_secret}</div>}
            </div>
          </div>
          <Grid cols={2} gap={10}>
            {infos.map(([k,v])=>(
              <div key={k} style={{ background:C.hover, borderRadius:8, padding:"10px 12px" }}>
                <div style={{ fontSize:10, color:C.dim, fontWeight:700, textTransform:"uppercase", marginBottom:2 }}>{k}</div>
                <div style={{ fontSize:13, color:C.text, fontWeight:600 }}>{v||"—"}</div>
              </div>
            ))}
          </Grid>
        </Panel>

        {/* Infos médicales critiques */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {user?.groupe_sanguin && (
            <div style={{ background:"rgba(225,29,72,.08)", border:"1px solid rgba(225,29,72,.2)", borderRadius:12, padding:16 }}>
              <div style={{ fontSize:12, fontWeight:700, color:C.red, textTransform:"uppercase", marginBottom:8 }}>🩸 Groupe sanguin</div>
              <div style={{ fontSize:36, fontWeight:900, color:C.red }}>{user.groupe_sanguin}</div>
            </div>
          )}
          {user?.allergies && (
            <div style={{ background:"rgba(217,119,6,.08)", border:"1px solid rgba(217,119,6,.2)", borderRadius:12, padding:16 }}>
              <div style={{ fontSize:12, fontWeight:700, color:C.amber, textTransform:"uppercase", marginBottom:8 }}>⚠️ Allergies connues</div>
              <div style={{ fontSize:14, color:C.text, lineHeight:1.6 }}>{user.allergies}</div>
            </div>
          )}
          {user?.antecedents && (
            <div style={{ background:"rgba(37,99,235,.08)", border:"1px solid rgba(37,99,235,.2)", borderRadius:12, padding:16 }}>
              <div style={{ fontSize:12, fontWeight:700, color:C.blue, textTransform:"uppercase", marginBottom:8 }}>📋 Antécédents médicaux</div>
              <div style={{ fontSize:14, color:C.text, lineHeight:1.6 }}>{user.antecedents}</div>
            </div>
          )}
          {!user?.groupe_sanguin && !user?.allergies && !user?.antecedents && (
            <Panel>
              <Empty icon="📋" title="Informations médicales incomplètes" subtitle="Contactez votre clinique pour compléter votre dossier" />
            </Panel>
          )}
        </div>
      </Grid>

      {/* Historique consultations */}
      <Panel title="🩺 Historique des consultations">
        {consults.length===0
          ? <Empty icon="🩺" title="Aucune consultation enregistrée" subtitle="Vos consultations apparaîtront ici après votre premier passage" />
          : consults.map(c=>(
            <div key={c.id} style={{ background:C.hover, borderRadius:10, padding:16, marginBottom:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                <div style={{ fontSize:13, fontWeight:700, color:C.teal }}>{fmtDate(c.created_at)}</div>
                <div style={{ fontSize:12, color:C.muted }}>{c.medecin_nom||"—"}</div>
              </div>
              <div style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:6 }}>Diagnostic : {c.diagnostic||"—"}</div>
              {c.traitement && <div style={{ fontSize:13, color:C.muted, marginBottom:4 }}>Traitement : {c.traitement}</div>}
              {c.notes && <div style={{ fontSize:12, color:C.dim, fontStyle:"italic", marginBottom:8 }}>{c.notes}</div>}
              {(c.tension_arterielle||c.temperature||c.poids) && (
                <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                  {c.tension_arterielle && <span style={{ fontSize:11, background:"rgba(13,148,136,.12)", color:C.teal, padding:"3px 10px", borderRadius:8 }}>TA: {c.tension_arterielle}</span>}
                  {c.temperature && <span style={{ fontSize:11, background:"rgba(217,119,6,.12)", color:C.amber, padding:"3px 10px", borderRadius:8 }}>T°: {c.temperature}°C</span>}
                  {c.poids && <span style={{ fontSize:11, background:"rgba(37,99,235,.12)", color:C.blue, padding:"3px 10px", borderRadius:8 }}>Poids: {c.poids}kg</span>}
                  {c.taille && <span style={{ fontSize:11, background:"rgba(124,58,237,.12)", color:C.purple, padding:"3px 10px", borderRadius:8 }}>Taille: {c.taille}cm</span>}
                </div>
              )}
            </div>
          ))
        }
      </Panel>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  3. RENDEZ-VOUS
// ════════════════════════════════════════════════════════════════════
function PageRdvs() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [tab, setTab] = useState("upcoming");
  const [form, setForm] = useState({ medecin_nom:"", clinique_nom:"", date_rdv:today(), heure_rdv:"09:00", motif:"", assurance:"" });

  const { data, isLoading } = useQuery({ queryKey:["pat-rdvs"], queryFn:()=>pAPI.rdvs().then(r=>r.data.data||[]) });
  const { data: medecinsData } = useQuery({ queryKey:["pub-medecins"], queryFn:()=>pAPI.medecins().then(r=>r.data.data||[]) });

  const rdvs = data||[];
  const medecins = medecinsData||[];
  const upcoming = rdvs.filter(r=>r.date_rdv>=today()&&r.statut!=="annule").sort((a,b)=>a.date_rdv>b.date_rdv?1:-1);
  const past     = rdvs.filter(r=>r.date_rdv<today()||r.statut==="termine"||r.statut==="annule").sort((a,b)=>a.date_rdv<b.date_rdv?1:-1);
  const displayed = tab==="upcoming" ? upcoming : past;

  const addMut = useMutation({
    mutationFn: d => pAPI.addRdv(d),
    onSuccess: () => { toast.success("✅ RDV confirmé !"); qc.invalidateQueries(["pat-rdvs"]); setShowAdd(false); },
    onError: () => toast.error("Erreur lors de la prise de RDV"),
  });
  const cancelMut = useMutation({
    mutationFn: id => pAPI.cancelRdv(id),
    onSuccess: () => { toast.success("RDV annulé"); qc.invalidateQueries(["pat-rdvs"]); },
    onError: () => toast.error("Erreur"),
  });

  const f = k => e => setForm(p=>({...p,[k]:e.target.value}));
  const statusColor = { confirme:"green", en_attente:"amber", annule:"red", en_cours:"teal", termine:"gray" };

  return (
    <div>
      <PageHeader title="📅 Mes rendez-vous" subtitle={`${upcoming.length} RDV à venir`}
        actions={<Btn onClick={()=>setShowAdd(true)}>+ Prendre RDV</Btn>} />

      <div style={{ display:"flex", gap:4, background:C.input, borderRadius:10, padding:4, marginBottom:20 }}>
        {[["upcoming","À venir",upcoming.length],["past","Passés",past.length]].map(([k,l,n])=>(
          <button key={k} onClick={()=>setTab(k)}
            style={{ flex:1, background:tab===k?C.hover:"transparent", border:"none", borderRadius:8, padding:"9px", cursor:"pointer", fontFamily:"inherit", color:tab===k?C.text:C.muted, fontSize:13, fontWeight:tab===k?700:400 }}>
            {l} <span style={{ fontSize:11, opacity:.7 }}>({n})</span>
          </button>
        ))}
      </div>

      {isLoading ? <Loader /> : displayed.length===0
        ? <Empty icon="📅" title={tab==="upcoming"?"Aucun RDV à venir":"Aucun RDV passé"} subtitle={tab==="upcoming"?"Prenez rendez-vous avec un médecin":""} />
        : displayed.map(r=>(
          <div key={r.id} style={{ background:C.input, border:`1.5px solid ${C.border}`, borderRadius:14, padding:20, marginBottom:14, transition:"border-color .15s" }}
            onMouseOver={e=>e.currentTarget.style.borderColor=C.blue} onMouseOut={e=>e.currentTarget.style.borderColor=C.border}>
            <div style={{ display:"flex", alignItems:"flex-start", gap:16, marginBottom:14 }}>
              {/* Date bloc */}
              <div style={{ background:C.hover, borderRadius:12, padding:"10px 14px", textAlign:"center", flexShrink:0 }}>
                <div style={{ fontSize:22, fontWeight:900, color:C.text }}>{r.date_rdv?new Date(r.date_rdv).getDate():"—"}</div>
                <div style={{ fontSize:11, color:C.muted, textTransform:"uppercase" }}>{r.date_rdv?new Date(r.date_rdv).toLocaleDateString("fr-CI",{month:"short"}):"—"}</div>
                <div style={{ fontSize:14, fontWeight:700, color:C.blue, marginTop:4 }}>{r.heure_rdv?.slice(0,5)||"—"}</div>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                  <h3 style={{ fontSize:15, fontWeight:700, color:C.text, margin:0 }}>{r.medecin_nom||"Médecin"}</h3>
                  <Badge color={statusColor[r.statut]||"gray"}>{r.statut||"—"}</Badge>
                </div>
                {r.motif && <div style={{ fontSize:13, color:C.muted, marginBottom:4 }}>📋 {r.motif}</div>}
                {r.assurance && <div style={{ fontSize:12, color:C.dim }}>🛡️ {r.assurance}</div>}
                {r.notes && <div style={{ fontSize:12, color:C.dim, marginTop:4, fontStyle:"italic" }}>{r.notes}</div>}
              </div>
            </div>
            {tab==="upcoming" && r.statut!=="annule" && (
              <div style={{ display:"flex", gap:10, borderTop:`1px solid ${C.border}`, paddingTop:12 }}>
                <Btn variant="outline" style={{ flex:1, padding:"7px", fontSize:12 }} onClick={()=>toast.success("Rappel activé ! 📲")}>🔔 Rappel</Btn>
                <Btn variant="danger" style={{ flex:1, padding:"7px", fontSize:12 }} loading={cancelMut.isPending} onClick={()=>window.confirm("Annuler ce RDV ?")&&cancelMut.mutate(r.id)}>✕ Annuler</Btn>
              </div>
            )}
          </div>
        ))
      }

      {/* Modal: Prendre RDV */}
      <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="📅 Prendre un rendez-vous">
        {medecins.length > 0 && (
          <Sel label="Médecin" value={form.medecin_nom} onChange={f("medecin_nom")}
            options={[{v:"",l:"Choisir un médecin…"}, ...medecins.map(m=>({v:`Dr. ${m.prenom} ${m.nom}`,l:`Dr. ${m.prenom} ${m.nom} — ${m.specialite||""}`}))]} />
        )}
        {medecins.length===0 && <Inp label="Nom du médecin" value={form.medecin_nom} onChange={f("medecin_nom")} placeholder="Dr. Koné Amadou" />}
        <Inp label="Clinique" value={form.clinique_nom} onChange={f("clinique_nom")} placeholder="Clinique Sainte Marie" />
        <Grid cols={2} gap={12}>
          <Inp label="Date *" type="date" required value={form.date_rdv} onChange={f("date_rdv")} />
          <Inp label="Heure *" type="time" required value={form.heure_rdv} onChange={f("heure_rdv")} />
        </Grid>
        <Inp label="Motif de consultation" value={form.motif} onChange={f("motif")} placeholder="Consultation générale, suivi, douleurs…" />
        <Sel label="Assurance" value={form.assurance} onChange={f("assurance")} options={["","NSIA","Allianz CI","AXA CI","CNAM (CMU)","Saham","Aucune"]} />
        <div style={{ background:"rgba(13,148,136,.06)", border:"1px solid rgba(13,148,136,.15)", borderRadius:8, padding:12, marginBottom:14, fontSize:12, color:C.muted, lineHeight:1.6 }}>
          💡 Votre code patient sera requis à l'accueil : <strong style={{ color:C.green, fontFamily:"monospace", letterSpacing:1 }}>{useAuthStore.getState().user?.code_secret||"—"}</strong>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <Btn variant="outline" style={{ flex:1 }} onClick={()=>setShowAdd(false)}>Annuler</Btn>
          <Btn style={{ flex:2 }} loading={addMut.isPending} onClick={()=>{
            if(!form.date_rdv||!form.heure_rdv){toast.error("Date et heure requises");return;}
            addMut.mutate({ ...form, patient_nom:`${useAuthStore.getState().user?.prenom||""} ${useAuthStore.getState().user?.nom||""}`.trim(), source:"patient" });
          }}>Confirmer le RDV</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  4. ORDONNANCES
// ════════════════════════════════════════════════════════════════════
function PageOrdonnances() {
  const { data, isLoading } = useQuery({ queryKey:["pat-ords"], queryFn:()=>pAPI.ords().then(r=>r.data.data||[]) });
  const ords = data||[];
  const actives   = ords.filter(o=>o.statut==="active");
  const terminees = ords.filter(o=>o.statut!=="active");

  return (
    <div>
      <PageHeader title="💊 Mes ordonnances" subtitle={`${actives.length} prescription(s) active(s)`} />
      <Grid cols={2} gap={14} style={{ marginBottom:20 }}>
        <Card label="Actives" value={actives.length} icon="✅" color={C.green} />
        <Card label="Terminées" value={terminees.length} icon="📋" color={C.muted} />
      </Grid>

      {isLoading ? <Loader /> : ords.length===0
        ? <Empty icon="💊" title="Aucune ordonnance" subtitle="Vos prescriptions médicales apparaîtront ici" />
        : ords.map(o=>(
          <div key={o.id} style={{ background:C.input, border:`1.5px solid ${o.statut==="active"?"rgba(10,143,88,.3)":C.border}`, borderRadius:14, padding:20, marginBottom:14 }}>
            {/* En-tête ordonnance */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, paddingBottom:12, borderBottom:`1px solid ${C.border}` }}>
              <div>
                <div style={{ fontSize:12, color:C.dim, marginBottom:2 }}>Ordonnance du {fmtDate(o.created_at)}</div>
                <div style={{ fontSize:13, color:C.muted }}>Dr. {o.medecin_nom||"—"}</div>
              </div>
              <Badge color={o.statut==="active"?"green":"gray"}>{o.statut==="active"?"Active":"Terminée"}</Badge>
            </div>

            {/* Médicaments */}
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.dim, textTransform:"uppercase", marginBottom:8 }}>Médicaments prescrits</div>
              <div style={{ background:C.hover, borderRadius:10, padding:14 }}>
                <div style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:6 }}>{o.medicaments||"—"}</div>
                {o.posologie && <div style={{ fontSize:13, color:C.muted, marginBottom:4 }}>📋 Posologie : {o.posologie}</div>}
                {o.duree && <div style={{ fontSize:13, color:C.muted }}>⏱️ Durée : {o.duree}</div>}
              </div>
            </div>

            {o.notes_ord && (
              <div style={{ background:"rgba(13,148,136,.06)", border:"1px solid rgba(13,148,136,.15)", borderRadius:8, padding:12, fontSize:12, color:C.muted, lineHeight:1.6 }}>
                💬 {o.notes_ord}
              </div>
            )}

            <div style={{ display:"flex", gap:10, marginTop:14 }}>
              <Btn variant="outline" style={{ flex:1, padding:"7px", fontSize:12 }} onClick={()=>toast.success("Ordonnance envoyée à la pharmacie !")}>💊 Envoyer pharmacie</Btn>
              <Btn variant="outline" style={{ flex:1, padding:"7px", fontSize:12 }} onClick={()=>toast.success("PDF généré !")}>📄 Télécharger PDF</Btn>
            </div>
          </div>
        ))
      }
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  5. CONSULTATIONS
// ════════════════════════════════════════════════════════════════════
function PageConsultations() {
  const { data, isLoading } = useQuery({ queryKey:["pat-consult"], queryFn:()=>pAPI.consults().then(r=>r.data.data||[]) });
  const consults = data||[];

  return (
    <div>
      <PageHeader title="🩺 Mes consultations" subtitle={`${consults.length} consultation(s) enregistrée(s)`} />
      {isLoading ? <Loader /> : consults.length===0
        ? <Empty icon="🩺" title="Aucune consultation" subtitle="Votre historique médical apparaîtra ici après vos consultations" />
        : consults.map(c=>(
          <div key={c.id} style={{ background:C.input, border:`1.5px solid ${C.border}`, borderRadius:14, padding:20, marginBottom:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
              <div>
                <div style={{ fontSize:15, fontWeight:700, color:C.text, marginBottom:4 }}>Consultation du {fmtDate(c.created_at)}</div>
                <div style={{ fontSize:13, color:C.muted }}>Dr. {c.medecin_nom||"—"}</div>
              </div>
              <Badge color="teal">Complétée</Badge>
            </div>

            <div style={{ background:C.hover, borderRadius:10, padding:14, marginBottom:12 }}>
              <div style={{ fontSize:12, fontWeight:700, color:C.dim, textTransform:"uppercase", marginBottom:8 }}>Diagnostic</div>
              <div style={{ fontSize:14, color:C.text, fontWeight:600 }}>{c.diagnostic||"—"}</div>
            </div>

            {c.traitement && (
              <div style={{ background:"rgba(10,143,88,.06)", borderRadius:10, padding:14, marginBottom:12 }}>
                <div style={{ fontSize:12, fontWeight:700, color:C.dim, textTransform:"uppercase", marginBottom:6 }}>Traitement</div>
                <div style={{ fontSize:13, color:C.text }}>{c.traitement}</div>
              </div>
            )}

            {c.notes && (
              <div style={{ fontSize:12, color:C.muted, fontStyle:"italic", padding:"0 4px", marginBottom:12 }}>{c.notes}</div>
            )}

            {(c.tension_arterielle||c.temperature||c.poids||c.taille) && (
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                {[["TA",c.tension_arterielle,C.teal],["T°",c.temperature?""+c.temperature+"°C":null,C.amber],["Poids",c.poids?c.poids+"kg":null,C.blue],["Taille",c.taille?c.taille+"cm":null,C.purple]].filter(([,v])=>v).map(([k,v,color])=>(
                  <div key={k} style={{ background:C.hover, borderRadius:8, padding:"6px 14px", fontSize:12 }}>
                    <span style={{ color:C.dim, marginRight:4 }}>{k}:</span>
                    <span style={{ color, fontWeight:700 }}>{v}</span>
                  </div>
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
//  6. RECHERCHE MÉDECIN & PRISE DE RDV
// ════════════════════════════════════════════════════════════════════
function PageRecherche() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [spec, setSpec] = useState("");
  const [selected, setSelected] = useState(null);
  const [rdvForm, setRdvForm] = useState({ date_rdv:today(), heure_rdv:"09:00", motif:"" });

  const { data, isLoading } = useQuery({ queryKey:["pub-medecins"], queryFn:()=>pAPI.medecins().then(r=>r.data.data||[]) });
  const medecins = (data||[]).filter(m=>{
    const q = search.toLowerCase();
    const matchText = !q || `${m.prenom} ${m.nom} ${m.specialite}`.toLowerCase().includes(q);
    const matchSpec = !spec || m.specialite===spec;
    return matchText && matchSpec;
  });

  const specs = [...new Set((data||[]).map(m=>m.specialite).filter(Boolean))];
  const addMut = useMutation({
    mutationFn: d => pAPI.addRdv(d),
    onSuccess: () => { toast.success("✅ RDV confirmé !"); qc.invalidateQueries(["pat-rdvs"]); setSelected(null); },
    onError: () => toast.error("Erreur"),
  });

  const rf = k => e => setRdvForm(p=>({...p,[k]:e.target.value}));
  const { user } = useAuthStore();

  return (
    <div>
      <PageHeader title="🔍 Trouver un médecin" subtitle="Recherchez et prenez rendez-vous en ligne" />

      {/* Barre de recherche */}
      <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Nom du médecin, spécialité…"
          style={{ flex:1, minWidth:200, background:C.input, border:`1.5px solid ${C.border}`, borderRadius:10, padding:"11px 16px", color:C.text, fontSize:14, outline:"none", fontFamily:"inherit" }}
          onFocus={e=>e.target.style.borderColor=C.green} onBlur={e=>e.target.style.borderColor=C.border} />
        <select value={spec} onChange={e=>setSpec(e.target.value)}
          style={{ background:C.input, border:`1.5px solid ${C.border}`, borderRadius:10, padding:"11px 16px", color:C.text, fontSize:14, outline:"none", fontFamily:"inherit" }}>
          <option value="">Toutes spécialités</option>
          {specs.map(s=><option key={s}>{s}</option>)}
        </select>
      </div>

      {isLoading ? <Loader /> : medecins.length===0
        ? <Empty icon="🔍" title="Aucun médecin trouvé" subtitle="Essayez un autre terme de recherche" />
        : medecins.map(m=>(
          <div key={m.id} style={{ background:C.input, border:`1.5px solid ${C.border}`, borderRadius:14, padding:20, marginBottom:14, transition:"all .15s", cursor:"pointer" }}
            onMouseOver={e=>{ e.currentTarget.style.borderColor=C.green; e.currentTarget.style.transform="translateY(-1px)"; }}
            onMouseOut={e=>{ e.currentTarget.style.borderColor=C.border; e.currentTarget.style.transform="none"; }}>
            <div style={{ display:"flex", alignItems:"center", gap:14 }}>
              <div style={{ width:52, height:52, background:`linear-gradient(135deg,${C.purple},${C.teal})`, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, color:"#fff", fontSize:18, flexShrink:0 }}>
                {m.prenom?.[0]}{m.nom?.[0]}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:15, fontWeight:700, color:C.text }}>Dr. {m.prenom} {m.nom}</div>
                <div style={{ fontSize:13, color:C.teal, fontWeight:600 }}>{m.specialite||"Médecin"}</div>
                {m.jours_travail && <div style={{ fontSize:11, color:C.dim, marginTop:3 }}>📅 {m.jours_travail} · {m.horaires_debut?.slice(0,5)||"08:00"}–{m.horaires_fin?.slice(0,5)||"17:00"}</div>}
              </div>
              <div style={{ textAlign:"right", flexShrink:0 }}>
                {m.tarif && <div style={{ fontSize:16, fontWeight:800, color:C.green }}>{fmt(m.tarif)} F</div>}
                {m.tarif && <div style={{ fontSize:11, color:C.dim }}>consultation</div>}
                <Badge color={{ Disponible:"green", "En consultation":"amber", Absent:"red" }[m.statut]||"gray"}>{m.statut||"—"}</Badge>
              </div>
            </div>
            <div style={{ marginTop:14, display:"flex", gap:10 }}>
              <Btn style={{ flex:2 }} onClick={()=>setSelected(m)}>📅 Prendre RDV</Btn>
              <Btn variant="outline" style={{ flex:1 }} onClick={()=>toast.success("Profil complet — bientôt disponible")}>Voir profil</Btn>
            </div>
          </div>
        ))
      }

      {/* Modal RDV avec ce médecin */}
      <Modal open={!!selected} onClose={()=>setSelected(null)} title={`📅 RDV avec Dr. ${selected?.prenom} ${selected?.nom}`}>
        <div style={{ background:C.hover, borderRadius:10, padding:14, marginBottom:16 }}>
          <div style={{ fontSize:14, fontWeight:700, color:C.text }}>{selected?.specialite}</div>
          {selected?.tarif && <div style={{ fontSize:13, color:C.green, fontWeight:700, marginTop:4 }}>Tarif : {fmt(selected?.tarif)} FCFA</div>}
          {selected?.jours_travail && <div style={{ fontSize:12, color:C.muted, marginTop:4 }}>Disponible : {selected?.jours_travail}</div>}
        </div>
        <Grid cols={2} gap={12}>
          <Inp label="Date *" type="date" required value={rdvForm.date_rdv} onChange={rf("date_rdv")} />
          <Inp label="Heure *" type="time" required value={rdvForm.heure_rdv} onChange={rf("heure_rdv")} />
        </Grid>
        <Inp label="Motif de consultation" value={rdvForm.motif} onChange={rf("motif")} placeholder="Consultation générale, suivi, bilan…" />
        <div style={{ display:"flex", gap:10 }}>
          <Btn variant="outline" style={{ flex:1 }} onClick={()=>setSelected(null)}>Annuler</Btn>
          <Btn style={{ flex:2 }} loading={addMut.isPending} onClick={()=>{
            if(!rdvForm.date_rdv||!rdvForm.heure_rdv){toast.error("Date et heure requises");return;}
            addMut.mutate({ ...rdvForm, medecin_id:selected.id, medecin_nom:`Dr. ${selected.prenom} ${selected.nom}`, patient_nom:`${user?.prenom||""} ${user?.nom||""}`.trim(), source:"patient" });
          }}>Confirmer le RDV</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  7. FEEDBACK & SATISFACTION
// ════════════════════════════════════════════════════════════════════
function PageFeedback() {
  const { data: rdvData } = useQuery({ queryKey:["pat-rdvs"], queryFn:()=>pAPI.rdvs().then(r=>r.data.data||[]) });
  const rdvsTermines = (rdvData||[]).filter(r=>r.statut==="termine");

  const [notes, setNotes] = useState({});
  const [commentaires, setCommentaires] = useState({});
  const [submitted, setSubmitted] = useState({});

  const CRITERES = ["Qualité des soins","Temps d'attente","Accueil","Communication médecin","Propreté","Facilité de RDV"];
  const [generalNotes, setGeneralNotes] = useState(CRITERES.reduce((a,c)=>({...a,[c]:0}),{}));

  const StarRating = ({ value, onChange, label }) => (
    <div style={{ marginBottom:16 }}>
      {label && <div style={{ fontSize:13, color:C.muted, marginBottom:6 }}>{label}</div>}
      <div style={{ display:"flex", gap:6 }}>
        {[1,2,3,4,5].map(i=>(
          <button key={i} onClick={()=>onChange(i)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:24, color:i<=value?C.amber:"#1E2F42", transition:"color .1s", padding:"2px 4px" }}>
            ★
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader title="⭐ Feedback & Satisfaction" subtitle="Évaluez vos soins et aidez-nous à nous améliorer" />

      <Grid cols={2} gap={20}>
        {/* Évaluation globale */}
        <Panel title="📊 Évaluation globale de la clinique">
          {CRITERES.map(c=>(
            <div key={c} style={{ borderBottom:`1px solid ${C.border}`, paddingBottom:12, marginBottom:12 }}>
              <StarRating label={c} value={generalNotes[c]} onChange={v=>setGeneralNotes(p=>({...p,[c]:v}))} />
            </div>
          ))}
          <div style={{ marginTop:4 }}>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", marginBottom:6 }}>Commentaire général</label>
            <textarea rows={3} placeholder="Partagez votre expérience…"
              style={{ width:"100%", background:C.hover, border:`1.5px solid ${C.border}`, borderRadius:9, padding:"10px 14px", color:C.text, fontSize:13, resize:"none", outline:"none", fontFamily:"inherit", boxSizing:"border-box" }}
              onFocus={e=>e.target.style.borderColor=C.green} onBlur={e=>e.target.style.borderColor=C.border} />
          </div>
          <Btn style={{ width:"100%", marginTop:14 }} onClick={()=>toast.success("✅ Merci pour votre évaluation !")}>Envoyer mon évaluation</Btn>
        </Panel>

        {/* Évaluation par RDV */}
        <Panel title="🩺 Évaluer mes consultations">
          {rdvsTermines.length===0
            ? <Empty icon="⭐" title="Aucune consultation à évaluer" subtitle="Vous pourrez évaluer vos consultations après vos RDV" />
            : rdvsTermines.slice(0,5).map(r=>(
              <div key={r.id} style={{ background:C.hover, borderRadius:12, padding:16, marginBottom:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{r.medecin_nom||"Médecin"}</div>
                    <div style={{ fontSize:11, color:C.muted }}>{fmtDate(r.date_rdv)}</div>
                  </div>
                  {submitted[r.id] && <Badge color="green">✓ Évalué</Badge>}
                </div>
                {!submitted[r.id] ? (
                  <>
                    <StarRating value={notes[r.id]||0} onChange={v=>setNotes(p=>({...p,[r.id]:v}))} />
                    <textarea rows={2} value={commentaires[r.id]||""} onChange={e=>setCommentaires(p=>({...p,[r.id]:e.target.value}))} placeholder="Votre avis sur cette consultation…"
                      style={{ width:"100%", background:C.input, border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 12px", color:C.text, fontSize:12, resize:"none", outline:"none", fontFamily:"inherit", boxSizing:"border-box", marginBottom:10 }} />
                    <Btn style={{ width:"100%", padding:"8px", fontSize:12 }}
                      onClick={()=>{ if(!notes[r.id]){toast.error("Donnez une note"); return;} setSubmitted(p=>({...p,[r.id]:true})); toast.success("✅ Évaluation envoyée !"); }}>
                      Soumettre
                    </Btn>
                  </>
                ) : (
                  <div style={{ fontSize:13, color:C.green }}>
                    {"★".repeat(notes[r.id]||0)}{"☆".repeat(5-(notes[r.id]||0))} · Merci !
                  </div>
                )}
              </div>
            ))
          }
          <div style={{ marginTop:16, padding:14, background:"rgba(13,148,136,.06)", borderRadius:10, fontSize:12, color:C.muted, lineHeight:1.6 }}>
            💡 Vos évaluations nous aident à améliorer la qualité des soins. Elles sont anonymes et transmises à la direction médicale.
          </div>
        </Panel>
      </Grid>

      {/* Enquête satisfaction */}
      <Panel title="📋 Enquête de satisfaction rapide" style={{ marginTop:20 }}>
        <Grid cols={3} gap={14}>
          {[
            ["😊", "Recommanderiez-vous MediConnect ?"],
            ["⏱️", "Les délais d'attente sont-ils raisonnables ?"],
            ["💊", "Avez-vous pu obtenir vos médicaments facilement ?"],
          ].map(([icon, q]) => (
            <div key={q} style={{ background:C.hover, borderRadius:12, padding:16, textAlign:"center" }}>
              <div style={{ fontSize:28, marginBottom:10 }}>{icon}</div>
              <div style={{ fontSize:12, color:C.muted, marginBottom:12, lineHeight:1.5 }}>{q}</div>
              <div style={{ display:"flex", gap:8, justifyContent:"center" }}>
                {["Oui 👍","Non 👎","Parfois 🤔"].map(l=>(
                  <button key={l} onClick={()=>toast.success("Réponse enregistrée !")}
                    style={{ background:C.input, border:`1px solid ${C.border}`, borderRadius:8, padding:"6px 12px", cursor:"pointer", fontSize:11, color:C.muted, fontFamily:"inherit" }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </Grid>
      </Panel>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  ROUTER PATIENT
// ════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  return (
    <Routes>
      <Route index              element={<PageHome />} />
      <Route path="dossier"     element={<PageDossier />} />
      <Route path="rdvs"        element={<PageRdvs />} />
      <Route path="ordonnances" element={<PageOrdonnances />} />
      <Route path="consultations" element={<PageConsultations />} />
      <Route path="recherche"   element={<PageRecherche />} />
      <Route path="feedback"    element={<PageFeedback />} />
      <Route path="*"           element={<PageHome />} />
    </Routes>
  );
}
