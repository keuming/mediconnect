/**
 * ConsultationWorkflow.jsx
 * Composant partagé — Clinique ET Médecin Indépendant
 * 
 * Usage:
 *   <ConsultationWorkflow
 *     open={boolean}
 *     onClose={fn}
 *     rdv={rdvObject}          // RDV lié (optionnel)
 *     patient={patientObject}  // Patient direct (optionnel)
 *     role="clinique"|"medecin_independant"
 *     onSuccess={fn}           // appelé avec {consultation, ordonnance}
 *   />
 */

import React, { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "../../services/api";

// ─── Palette ────────────────────────────────────────────────────────────────
const C = {
  green:"#0A8F58", teal:"#0D9488", amber:"#D97706", red:"#E11D48",
  blue:"#2563EB", purple:"#7C3AED", bg:"#060C12", card:"#0E1620",
  input:"#141E2B", hover:"#1A2535", border:"#1E2F42",
  text:"#F0F4F8", muted:"#8BA0B5", dim:"#4E657A",
};

// CIM-10 courants en Afrique de l'Ouest
const CIM10 = [
  { code:"J06.9", label:"Infection respiratoire haute" },
  { code:"A09",   label:"Diarrhée infectieuse" },
  { code:"B54",   label:"Paludisme non spécifié" },
  { code:"I10",   label:"Hypertension artérielle" },
  { code:"E11",   label:"Diabète type 2" },
  { code:"J18",   label:"Pneumonie" },
  { code:"K29",   label:"Gastrite" },
  { code:"N39.0", label:"Infection urinaire" },
  { code:"L30.9", label:"Dermatite" },
  { code:"M54.5", label:"Lombalgie" },
  { code:"R50.9", label:"Fièvre non spécifiée" },
  { code:"R05",   label:"Toux" },
  { code:"K35",   label:"Appendicite" },
  { code:"J45",   label:"Asthme" },
  { code:"B20",   label:"VIH/SIDA" },
  { code:"A15",   label:"Tuberculose" },
  { code:"O80",   label:"Accouchement normal" },
  { code:"Z00",   label:"Examen médical général" },
];

const GRAVITES = [
  { v:"leger",   label:"Léger",   color:C.green  },
  { v:"modere",  label:"Modéré",  color:C.amber  },
  { v:"grave",   label:"Grave",   color:C.red    },
  { v:"critique",label:"Critique",color:"#7C3AED"},
];

const ORIENTATIONS = [
  "Traitement ambulatoire",
  "Hospitalisation",
  "Référence spécialiste",
  "Pharmacie",
  "Laboratoire",
  "Imagerie",
  "Urgences",
];

const fmt = n => Number(n||0).toLocaleString("fr-CI");

// ─── Composants UI internes ─────────────────────────────────────────────────
const Inp = ({ label, value, onChange, placeholder, type="text", required, style:s={} }) => (
  <div style={{ marginBottom:12, ...s }}>
    {label && (
      <label style={{ display:"block", fontSize:11, fontWeight:700, color:C.muted,
        textTransform:"uppercase", letterSpacing:".5px", marginBottom:5 }}>
        {label}{required && <span style={{ color:C.red }}> *</span>}
      </label>
    )}
    <input type={type} value={value} onChange={onChange} placeholder={placeholder}
      style={{ width:"100%", background:C.hover, border:`1.5px solid ${C.border}`,
        borderRadius:9, padding:"10px 14px", color:C.text, fontSize:14,
        outline:"none", fontFamily:"inherit", boxSizing:"border-box" }}
      onFocus={e=>e.target.style.borderColor=C.green}
      onBlur={e=>e.target.style.borderColor=C.border}
    />
  </div>
);

const Textarea = ({ label, value, onChange, placeholder, rows=3 }) => (
  <div style={{ marginBottom:12 }}>
    {label && (
      <label style={{ display:"block", fontSize:11, fontWeight:700, color:C.muted,
        textTransform:"uppercase", letterSpacing:".5px", marginBottom:5 }}>{label}</label>
    )}
    <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows}
      style={{ width:"100%", background:C.hover, border:`1.5px solid ${C.border}`,
        borderRadius:9, padding:"10px 14px", color:C.text, fontSize:14,
        resize:"vertical", outline:"none", fontFamily:"inherit", boxSizing:"border-box" }}
      onFocus={e=>e.target.style.borderColor=C.green}
      onBlur={e=>e.target.style.borderColor=C.border}
    />
  </div>
);

const SectionTitle = ({ icon, title, subtitle }) => (
  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16,
    padding:"10px 14px", background:"rgba(10,143,88,.06)",
    border:"1px solid rgba(10,143,88,.15)", borderRadius:10 }}>
    <span style={{ fontSize:20 }}>{icon}</span>
    <div>
      <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{title}</div>
      {subtitle && <div style={{ fontSize:11, color:C.muted }}>{subtitle}</div>}
    </div>
  </div>
);

// ─── Composant principal ────────────────────────────────────────────────────
export default function ConsultationWorkflow({ open, onClose, rdv, patient, role="clinique", onSuccess }) {
  const qc = useQueryClient();
  const [step, setStep] = useState(1); // 1=consultation, 2=ordonnance, 3=résumé
  const [consult, setConsult] = useState(null); // consultation créée

  // ── Formulaire consultation ──────────────────────────────────────
  const [form, setForm] = useState({
    // Anamnèse
    motif:"", anamnese:"",
    // Constantes vitales
    ta:"", fc:"", spo2:"", temperature:"", glycemie:"", poids:"", taille:"",
    // Examen clinique
    examen_clinique:"",
    // Diagnostic
    diagnostic:"", code_cim10:"", cim10_label:"",
    // Traitement
    traitement:"",
    // Notes
    note_finale:"",
    // Gravité & orientation
    gravite:"modere", orientation:"Traitement ambulatoire",
    // Pathologie
    pathologie:"",
  });

  // ── Formulaire ordonnance avec lignes dynamiques ─────────────────
  const [lignes, setLignes] = useState([{ nom:"", dosage:"", forme:"", posologie:"", duree:"", renouvellements:0 }]);
  const addLigne = () => setLignes(l => [...l, { nom:"", dosage:"", forme:"", posologie:"", duree:"", renouvellements:0 }]);
  const delLigne = i => setLignes(l => l.filter((_,j) => j!==i));
  const updLigne = (i,k,v) => setLignes(l => l.map((row,j) => j===i ? {...row,[k]:v} : row));

  const fc = useCallback((key) => e => setForm(f => ({...f, [key]:e.target.value})), []);

  // IMC calculé automatiquement
  const imc = form.poids && form.taille
    ? (Number(form.poids) / Math.pow(Number(form.taille)/100, 2)).toFixed(1)
    : null;

  // ── Mutation consultation ────────────────────────────────────────
  const consultMut = useMutation({
    mutationFn: d => api.post("/consultations/depuis-rdv", d),
    onSuccess: (data) => {
      const c = data?.data || data;
      setConsult(c);
      toast.success("✅ Consultation enregistrée !");
      setStep(2);
      qc.invalidateQueries(["mi-rdvs-m"]);
      qc.invalidateQueries(["cl-rdvs"]);
      qc.invalidateQueries(["cl-rdvs-today"]);
      qc.invalidateQueries(["mi-stats"]);
    },
    onError: e => toast.error("Erreur: " + (e?.message||"Réessayez")),
  });

  // ── Mutation ordonnance ─────────────────────────────────────────
  const ordMut = useMutation({
    mutationFn: d => api.post("/ordonnances", d),
    onSuccess: (data) => {
      const ord = data?.data || data;
      toast.success("💊 Ordonnance créée !");
      setStep(3);
      qc.invalidateQueries(["mi-ords"]);
      qc.invalidateQueries(["cl-ords"]);
      if(onSuccess) onSuccess({ consultation: consult, ordonnance: ord });
    },
    onError: () => toast.error("Erreur ordonnance"),
  });

  const patientNom = rdv?.patient_nom || patient?.prenom && `${patient.prenom} ${patient.nom}` || "Patient";
  const patientId  = rdv?.patient_id || patient?.id;

  const handleSubmitConsult = () => {
    if (!form.motif) { toast.error("Motif requis"); return; }
    if (!form.diagnostic) { toast.error("Diagnostic requis"); return; }
    consultMut.mutate({
      rdv_id:         rdv?.id || null,
      patient_id:     patientId,
      motif:          form.motif,
      diagnostic:     form.diagnostic,
      code_cim10:     form.code_cim10 || null,
      examen_clinique:form.examen_clinique || null,
      note_finale:    form.note_finale || null,
      traitement:     form.traitement || null,
      ta:             form.ta || null,
      fc:             form.fc || null,
      spo2:           form.spo2 || null,
      temperature:    form.temperature || null,
      poids:          form.poids || null,
      taille:         form.taille || null,
      pathologie:     form.pathologie || null,
      gravite:        form.gravite,
    });
  };

  const handleSubmitOrd = () => {
    const valides = lignes.filter(l => l.nom.trim());
    if (!valides.length) { toast.error("Au moins un médicament requis"); return; }
    const medicament = valides.map(l =>
      `${l.nom}${l.dosage?' '+l.dosage:''}${l.forme?' ('+l.forme+')':''}${l.posologie?' — '+l.posologie:''}${l.duree?' — '+l.duree:''}`
    ).join("\n");
    ordMut.mutate({
      patient_id:      patientId,
      consultation_id: consult?.id || null,
      medicament,
      posologie:       valides[0]?.posologie || "",
      duree:           valides[0]?.duree || "",
    });
  };

  const handleSkipOrd = () => {
    setStep(3);
    if(onSuccess) onSuccess({ consultation: consult, ordonnance: null });
  };

  const handleClose = () => {
    setStep(1);
    setConsult(null);
    setForm({ motif:"", anamnese:"", ta:"", fc:"", spo2:"", temperature:"", glycemie:"",
      poids:"", taille:"", examen_clinique:"", diagnostic:"", code_cim10:"", cim10_label:"",
      traitement:"", note_finale:"", gravite:"modere", orientation:"Traitement ambulatoire", pathologie:"" });
    setLignes([{ nom:"", dosage:"", forme:"", posologie:"", duree:"", renouvellements:0 }]);
    onClose && onClose();
  };

  if (!open) return null;

  return (
    <div onClick={handleClose} style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,.8)",
      display:"flex", alignItems:"flex-start", justifyContent:"center",
      zIndex:1000, padding:"16px", overflowY:"auto"
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:C.card, border:`1px solid ${C.border}`, borderRadius:18,
        width:"100%", maxWidth:680, marginTop:20, marginBottom:20,
      }}>
        {/* Header */}
        <div style={{ background:`linear-gradient(135deg,${C.green},${C.teal})`,
          borderRadius:"18px 18px 0 0", padding:"20px 24px",
          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,.7)", marginBottom:3 }}>
              {step===1?"📋 Consultation"  : step===2?"💊 Ordonnance" : "✅ Terminé"}
              {rdv && ` — RDV du ${new Date(rdv.date_rdv).toLocaleDateString("fr-CI",{day:"numeric",month:"long"})}`}
            </div>
            <div style={{ fontSize:20, fontWeight:800, color:"#fff" }}>{patientNom}</div>
            {rdv?.motif && <div style={{ fontSize:12, color:"rgba(255,255,255,.8)" }}>Motif : {rdv.motif}</div>}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            {/* Indicateur d'étapes */}
            <div style={{ display:"flex", gap:6 }}>
              {[1,2,3].map(s=>(
                <div key={s} style={{
                  width:28, height:28, borderRadius:"50%", display:"flex",
                  alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700,
                  background: s<=step ? "#fff" : "rgba(255,255,255,.2)",
                  color: s<=step ? C.green : "#fff",
                }}>{s}</div>
              ))}
            </div>
            <button onClick={handleClose} style={{
              background:"rgba(255,255,255,.2)", border:"none", borderRadius:"50%",
              width:32, height:32, color:"#fff", cursor:"pointer", fontSize:18 }}>✕</button>
          </div>
        </div>

        <div style={{ padding:24 }}>

          {/* ═══ ÉTAPE 1 — CONSULTATION ═══════════════════════════════════════ */}
          {step===1 && (
            <div>
              {/* Anamnèse */}
              <SectionTitle icon="🗣️" title="Motif & Anamnèse" subtitle="Raison de la visite et histoire de la maladie"/>
              <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:0 }}>
                <Inp label="Motif de consultation *" value={form.motif} onChange={fc("motif")} placeholder="Ex: Fièvre depuis 3 jours, douleur thoracique…" required/>
                <Textarea label="Anamnèse" value={form.anamnese} onChange={fc("anamnese")} placeholder="Histoire de la maladie, évolution, traitements déjà pris…" rows={2}/>
              </div>

              {/* Constantes vitales */}
              <SectionTitle icon="📊" title="Constantes vitales" subtitle="Mesures objectives"/>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:12 }}>
                {[
                  ["T.A. (mmHg)","ta","120/80"],
                  ["FC (bpm)","fc","75"],
                  ["SpO2 (%)","spo2","98"],
                  ["Temp. (°C)","temperature","37.0"],
                  ["Glycémie (g/L)","glycemie","0.9"],
                  ["Poids (kg)","poids","70"],
                  ["Taille (cm)","taille","175"],
                  imc ? null : null,
                ].filter(Boolean).map(([label,key,ph])=>(
                  <div key={key}>
                    <label style={{ display:"block", fontSize:10, fontWeight:700,
                      color:C.muted, textTransform:"uppercase", marginBottom:4 }}>{label}</label>
                    <input value={form[key]} onChange={fc(key)} placeholder={ph} type={key==="ta"||key==="spo2"?"text":"number"}
                      style={{ width:"100%", background:C.hover, border:`1.5px solid ${C.border}`,
                        borderRadius:9, padding:"8px 10px", color:C.text, fontSize:13,
                        outline:"none", fontFamily:"inherit", boxSizing:"border-box" }}
                      onFocus={e=>e.target.style.borderColor=C.teal}
                      onBlur={e=>e.target.style.borderColor=C.border}
                    />
                  </div>
                ))}
                {imc && (
                  <div>
                    <label style={{ display:"block", fontSize:10, fontWeight:700,
                      color:C.muted, textTransform:"uppercase", marginBottom:4 }}>IMC (auto)</label>
                    <div style={{ background:C.hover, border:`1.5px solid ${C.border}`,
                      borderRadius:9, padding:"8px 10px", color:
                        Number(imc)<18.5 ? C.blue : Number(imc)<25 ? C.green : Number(imc)<30 ? C.amber : C.red,
                      fontSize:13, fontWeight:700 }}>
                      {imc} kg/m²
                    </div>
                  </div>
                )}
              </div>

              {/* Examen clinique */}
              <SectionTitle icon="🩺" title="Examen clinique & Diagnostic"/>
              <Textarea label="Examen clinique" value={form.examen_clinique} onChange={fc("examen_clinique")}
                placeholder="Examen général, auscultation, palpation, signes spécifiques…" rows={3}/>
              <Inp label="Diagnostic *" value={form.diagnostic} onChange={fc("diagnostic")}
                placeholder="Ex: Paludisme simple, HTA grade 2, Grippe…" required/>

              {/* Code CIM-10 */}
              <div style={{ marginBottom:12 }}>
                <label style={{ display:"block", fontSize:11, fontWeight:700,
                  color:C.muted, textTransform:"uppercase", marginBottom:5 }}>Code CIM-10</label>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:8 }}>
                  {CIM10.map(c=>(
                    <button key={c.code} onClick={()=>setForm(f=>({...f,code_cim10:c.code,cim10_label:c.label}))}
                      style={{ padding:"4px 10px", borderRadius:20, fontSize:11, cursor:"pointer",
                        border:`1.5px solid ${form.code_cim10===c.code?C.teal:C.border}`,
                        background: form.code_cim10===c.code ? "rgba(13,148,136,.15)" : C.hover,
                        color: form.code_cim10===c.code ? C.teal : C.muted, fontFamily:"inherit" }}>
                      {c.code} {c.label}
                    </button>
                  ))}
                </div>
                {form.code_cim10 && (
                  <div style={{ fontSize:11, color:C.teal }}>✓ Sélectionné : {form.code_cim10} — {form.cim10_label}</div>
                )}
              </div>

              <Textarea label="Traitement prescrit (résumé)" value={form.traitement} onChange={fc("traitement")}
                placeholder="Ex: Amlodipine 5mg 1x/jour, Paracétamol 500mg si fièvre…" rows={2}/>

              {/* Gravité */}
              <div style={{ marginBottom:12 }}>
                <label style={{ display:"block", fontSize:11, fontWeight:700,
                  color:C.muted, textTransform:"uppercase", marginBottom:8 }}>Gravité</label>
                <div style={{ display:"flex", gap:8 }}>
                  {GRAVITES.map(g=>(
                    <button key={g.v} onClick={()=>setForm(f=>({...f,gravite:g.v}))}
                      style={{ flex:1, padding:"8px", borderRadius:9, cursor:"pointer",
                        border:`2px solid ${form.gravite===g.v?g.color:C.border}`,
                        background: form.gravite===g.v ? g.color+"20" : C.hover,
                        color: form.gravite===g.v ? g.color : C.muted,
                        fontSize:12, fontWeight:700, fontFamily:"inherit" }}>
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Orientation */}
              <div style={{ marginBottom:16 }}>
                <label style={{ display:"block", fontSize:11, fontWeight:700,
                  color:C.muted, textTransform:"uppercase", marginBottom:8 }}>Orientation du patient</label>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {ORIENTATIONS.map(o=>(
                    <button key={o} onClick={()=>setForm(f=>({...f,orientation:o}))}
                      style={{ padding:"6px 12px", borderRadius:20, fontSize:11, cursor:"pointer",
                        border:`1.5px solid ${form.orientation===o?C.purple:C.border}`,
                        background: form.orientation===o ? "rgba(124,58,237,.15)" : C.hover,
                        color: form.orientation===o ? C.purple : C.muted, fontFamily:"inherit" }}>
                      {o}
                    </button>
                  ))}
                </div>
              </div>

              <Textarea label="Notes cliniques" value={form.note_finale} onChange={fc("note_finale")}
                placeholder="Observations, recommandations, suivi…" rows={2}/>

              <div style={{ display:"flex", gap:10, marginTop:8 }}>
                <button onClick={handleClose} style={{ flex:1, padding:"11px", borderRadius:9,
                  background:"transparent", border:`1.5px solid ${C.border}`, color:C.muted,
                  cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit" }}>Annuler</button>
                <button disabled={consultMut.isPending} onClick={handleSubmitConsult}
                  style={{ flex:3, padding:"11px", borderRadius:9,
                    background:`linear-gradient(135deg,${C.green},${C.teal})`,
                    border:"none", color:"#fff", cursor:consultMut.isPending?"not-allowed":"pointer",
                    fontSize:13, fontWeight:700, fontFamily:"inherit",
                    opacity:consultMut.isPending?.65:1 }}>
                  {consultMut.isPending ? "⏳ Enregistrement…" : "✅ Valider la consultation →"}
                </button>
              </div>
            </div>
          )}

          {/* ═══ ÉTAPE 2 — ORDONNANCE ═══════════════════════════════════════ */}
          {step===2 && (
            <div>
              <div style={{ background:"rgba(10,143,88,.08)", border:"1px solid rgba(10,143,88,.2)",
                borderRadius:10, padding:"12px 16px", marginBottom:20, fontSize:13, color:C.muted }}>
                ✅ Consultation enregistrée — Diagnostic : <strong style={{ color:C.text }}>{form.diagnostic}</strong>
              </div>

              <SectionTitle icon="💊" title="Prescription médicamenteuse"
                subtitle="Ajoutez un médicament par ligne"/>

              {/* En-tête colonnes */}
              <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 2fr 1fr auto",
                gap:6, marginBottom:6, padding:"0 4px" }}>
                {["Médicament","Dosage","Forme","Posologie","Durée",""].map((h,i)=>(
                  <div key={i} style={{ fontSize:10, fontWeight:700, color:C.dim,
                    textTransform:"uppercase" }}>{h}</div>
                ))}
              </div>

              {lignes.map((l,i)=>(
                <div key={i} style={{ display:"grid",
                  gridTemplateColumns:"2fr 1fr 1fr 2fr 1fr auto",
                  gap:6, marginBottom:8, alignItems:"center" }}>
                  <input value={l.nom} onChange={e=>updLigne(i,"nom",e.target.value)}
                    placeholder="Amoxicilline"
                    style={{ background:C.hover, border:`1.5px solid ${C.border}`,
                      borderRadius:8, padding:"8px 10px", color:C.text, fontSize:12,
                      outline:"none", fontFamily:"inherit", boxSizing:"border-box" }}/>
                  <input value={l.dosage} onChange={e=>updLigne(i,"dosage",e.target.value)}
                    placeholder="500mg"
                    style={{ background:C.hover, border:`1.5px solid ${C.border}`,
                      borderRadius:8, padding:"8px 10px", color:C.text, fontSize:12,
                      outline:"none", fontFamily:"inherit", boxSizing:"border-box" }}/>
                  <select value={l.forme} onChange={e=>updLigne(i,"forme",e.target.value)}
                    style={{ background:C.hover, border:`1.5px solid ${C.border}`,
                      borderRadius:8, padding:"8px 6px", color:l.forme?C.text:C.dim,
                      fontSize:11, outline:"none", fontFamily:"inherit" }}>
                    <option value="">Forme</option>
                    {["Comprimé","Gélule","Sirop","Injection","Crème","Gouttes","Suppositoire","Sachet"].map(f=>(
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                  <input value={l.posologie} onChange={e=>updLigne(i,"posologie",e.target.value)}
                    placeholder="1cp matin/soir"
                    style={{ background:C.hover, border:`1.5px solid ${C.border}`,
                      borderRadius:8, padding:"8px 10px", color:C.text, fontSize:12,
                      outline:"none", fontFamily:"inherit", boxSizing:"border-box" }}/>
                  <input value={l.duree} onChange={e=>updLigne(i,"duree",e.target.value)}
                    placeholder="5 jours"
                    style={{ background:C.hover, border:`1.5px solid ${C.border}`,
                      borderRadius:8, padding:"8px 10px", color:C.text, fontSize:12,
                      outline:"none", fontFamily:"inherit", boxSizing:"border-box" }}/>
                  <button onClick={()=>delLigne(i)}
                    style={{ background: lignes.length>1?"rgba(225,29,72,.1)":"transparent",
                      border: lignes.length>1?"1px solid rgba(225,29,72,.2)":"none",
                      borderRadius:6, padding:"7px 9px",
                      color: lignes.length>1?C.red:C.dim,
                      cursor: lignes.length>1?"pointer":"default",
                      fontSize:13, fontFamily:"inherit" }}>
                    {lignes.length>1?"✕":"—"}
                  </button>
                </div>
              ))}

              <button onClick={addLigne} style={{
                background:"rgba(124,58,237,.1)", border:"1px dashed rgba(124,58,237,.3)",
                borderRadius:9, padding:"8px 16px", color:C.purple,
                cursor:"pointer", fontSize:12, fontWeight:700,
                fontFamily:"inherit", width:"100%", marginBottom:20 }}>
                + Ajouter un médicament
              </button>

              {/* Instructions générales */}
              <Textarea label="Instructions au patient" value={form.traitement} onChange={fc("traitement")}
                placeholder="Prendre les médicaments après les repas. Éviter l'alcool. Revenir si fièvre persiste…"
                rows={2}/>

              <div style={{ display:"flex", gap:10 }}>
                <button onClick={handleSkipOrd} style={{ flex:1, padding:"11px", borderRadius:9,
                  background:"transparent", border:`1.5px solid ${C.border}`, color:C.muted,
                  cursor:"pointer", fontSize:12, fontWeight:700, fontFamily:"inherit" }}>
                  Passer →
                </button>
                <button disabled={ordMut.isPending} onClick={handleSubmitOrd}
                  style={{ flex:3, padding:"11px", borderRadius:9,
                    background:`linear-gradient(135deg,${C.purple},${C.teal})`,
                    border:"none", color:"#fff",
                    cursor:ordMut.isPending?"not-allowed":"pointer",
                    fontSize:13, fontWeight:700, fontFamily:"inherit",
                    opacity:ordMut.isPending?.65:1 }}>
                  {ordMut.isPending ? "⏳ Création…" : "💊 Créer l'ordonnance →"}
                </button>
              </div>
            </div>
          )}

          {/* ═══ ÉTAPE 3 — RÉSUMÉ ═══════════════════════════════════════════ */}
          {step===3 && (
            <div style={{ textAlign:"center", padding:"20px 0" }}>
              <div style={{ width:72, height:72,
                background:`linear-gradient(135deg,${C.green},${C.teal})`,
                borderRadius:"50%", display:"flex", alignItems:"center",
                justifyContent:"center", fontSize:32, margin:"0 auto 16px",
                boxShadow:`0 16px 40px rgba(10,143,88,.4)` }}>✅</div>
              <div style={{ fontSize:20, fontWeight:800, color:C.text, marginBottom:8 }}>
                Consultation complète
              </div>
              <div style={{ fontSize:14, color:C.muted, marginBottom:20 }}>
                {patientNom} — {new Date().toLocaleDateString("fr-CI", { day:"numeric", month:"long", year:"numeric" })}
              </div>

              {/* Résumé */}
              <div style={{ background:C.input, border:`1px solid ${C.border}`,
                borderRadius:12, padding:16, textAlign:"left", marginBottom:20 }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  {[
                    ["Motif", form.motif],
                    ["Diagnostic", form.diagnostic],
                    ["Code CIM-10", form.code_cim10||"—"],
                    ["Gravité", form.gravite],
                    ["Orientation", form.orientation],
                    ["TA", form.ta||"—"],
                    ["Temp.", form.temperature ? form.temperature+"°C" : "—"],
                    ["Poids", form.poids ? form.poids+"kg" : "—"],
                  ].map(([k,v])=>(
                    <div key={k} style={{ background:C.hover, borderRadius:8, padding:"8px 12px" }}>
                      <div style={{ fontSize:10, color:C.dim, fontWeight:700,
                        textTransform:"uppercase", marginBottom:2 }}>{k}</div>
                      <div style={{ fontSize:13, color:C.text, fontWeight:600 }}>{v||"—"}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
                <button onClick={handleClose} style={{
                  padding:"11px 24px", borderRadius:9,
                  background:`linear-gradient(135deg,${C.green},${C.teal})`,
                  border:"none", color:"#fff", cursor:"pointer",
                  fontSize:13, fontWeight:700, fontFamily:"inherit" }}>
                  ✓ Terminer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
