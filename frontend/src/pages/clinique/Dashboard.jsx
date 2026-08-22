import React, { useState, useCallback, useEffect } from "react";
import ConsultationWorkflow from "../shared/ConsultationWorkflow";
import { Routes, Route, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import useAuthStore from "../../context/authStore";
import useThemeStore from "../../context/themeStore";
import api from "../../services/api";

function CreationBordereauModal({ onClose, onCreated }) {
  const [compagnies, setCompagnies] = useState([]);
  const [compagnieId, setCompagnieId] = useState("");
  const [periodeDebut, setPeriodeDebut] = useState("");
  const [periodeFin, setPeriodeFin] = useState("");
  const [eligibles, setEligibles] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/compagnies-assurance").then(r => setCompagnies(r.data || [])).catch(() => {});
  }, []);

  const fetchEligibles = async () => {
    const r = await api.get("/bordereaux/eligibles/liste", {
      params: { compagnie_id: compagnieId, periode_debut: periodeDebut, periode_fin: periodeFin },
    });
    setEligibles(r.data || []);
    setSelectedIds((r.data || []).map(f => f.id));
    setStep(2);
  };

  const create = async () => {
    setSaving(true);
    try {
      await api.post("/bordereaux", {
        compagnie_id: compagnieId, periode_debut: periodeDebut, periode_fin: periodeFin,
        facture_ids: selectedIds,
      });
      onCreated();
    } catch (e) {
      alert("Erreur lors de la création du bordereau.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1001 }}>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:24, width:"90%", maxWidth:560, maxHeight:"85vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <h3 style={{ margin:0, color:C.text }}>Nouveau bordereau</h3>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:20, color:C.muted, cursor:"pointer" }}>✕</button>
        </div>

        {step === 1 && (
          <div style={{ display:"flex", flexDirection:"column", gap:12, marginTop:16 }}>
            <label style={{ color:C.muted, fontSize:14, fontWeight:700, textTransform:"uppercase", letterSpacing:".5px" }}>
              Compagnie d'assurance
              <select value={compagnieId} onChange={e=>setCompagnieId(e.target.value)}
                style={{ display:"block", width:"100%", marginTop:4, padding:"8px 10px", borderRadius:8, border:`1px solid ${C.border}`, background:C.input, color:C.text, fontFamily:"inherit", fontSize:15, fontWeight:400, textTransform:"none" }}>
                <option value="">— Choisir —</option>
                {compagnies.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </label>
            <label style={{ color:C.muted, fontSize:14, fontWeight:700, textTransform:"uppercase", letterSpacing:".5px" }}>
              Période — début
              <input type="date" value={periodeDebut} onChange={e=>setPeriodeDebut(e.target.value)}
                style={{ display:"block", width:"100%", marginTop:4, padding:"8px 10px", borderRadius:8, border:`1px solid ${C.border}`, background:C.input, color:C.text, fontFamily:"inherit", fontSize:15, fontWeight:400, textTransform:"none" }} />
            </label>
            <label style={{ color:C.muted, fontSize:14, fontWeight:700, textTransform:"uppercase", letterSpacing:".5px" }}>
              Période — fin
              <input type="date" value={periodeFin} onChange={e=>setPeriodeFin(e.target.value)}
                style={{ display:"block", width:"100%", marginTop:4, padding:"8px 10px", borderRadius:8, border:`1px solid ${C.border}`, background:C.input, color:C.text, fontFamily:"inherit", fontSize:15, fontWeight:400, textTransform:"none" }} />
            </label>
            <button disabled={!compagnieId || !periodeDebut || !periodeFin} onClick={fetchEligibles}
              style={{ background:C.green, color:"#fff", border:"none", borderRadius:8, padding:"10px 16px", fontWeight:700, fontFamily:"inherit", fontSize:15, cursor:"pointer", marginTop:8, opacity:(!compagnieId || !periodeDebut || !periodeFin)?.5:1 }}>
              Voir les factures éligibles
            </button>
          </div>
        )}

        {step === 2 && (
          <div style={{ marginTop:16 }}>
            <p style={{ color:C.muted, fontSize:14 }}>
              {eligibles.length} facture(s) trouvée(s) pour cette compagnie sur la période.
            </p>
            <div style={{ maxHeight:260, overflowY:"auto", border:`1px solid ${C.border}`, borderRadius:8 }}>
              {eligibles.length === 0 ? (
                <div style={{ padding:16, color:C.dim, fontSize:14, textAlign:"center" }}>Aucune facture éligible sur cette période.</div>
              ) : eligibles.map(f => (
                <label key={f.id} style={{ display:"flex", gap:10, alignItems:"center", padding:"8px 12px", borderBottom:`1px solid ${C.border}`, color:C.text }}>
                  <input type="checkbox" checked={selectedIds.includes(f.id)}
                    onChange={e => setSelectedIds(prev => e.target.checked ? [...prev, f.id] : prev.filter(id => id !== f.id))} />
                  <span style={{ flex:1 }}>{f.patient_nom || `Facture #${f.id}`}</span>
                  <span style={{ fontWeight:700, color:C.green }}>{f.montant_total ?? f.montant} F</span>
                </label>
              ))}
            </div>
            <button disabled={saving} onClick={create}
              style={{ background:C.green, color:"#fff", border:"none", borderRadius:8, padding:"10px 16px", fontWeight:700, fontFamily:"inherit", fontSize:15, cursor:"pointer", width:"100%", marginTop:16, opacity:saving?.6:1 }}>
              {saving ? "Création…" : `Créer le bordereau (${selectedIds.length} facture(s))`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Palette & helpers ─────────────────────────────────────────────
/* TAILLES_POLICE_AUGMENTEES_30_POURCENT */
const PALETTE_DARK = {
  green:"#0A8F58", teal:"#0D9488", amber:"#D97706", red:"#E11D48",
  blue:"#2563EB", purple:"#7C3AED", bg:"#060C12", card:"#0E1620",
  input:"#141E2B", hover:"#1A2535", border:"#1E2F42",
  text:"#F0F4F8", muted:"#8BA0B5", dim:"#4E657A",
};
const PALETTE_LIGHT = {
  green:"#0A8F58", teal:"#0D9488", amber:"#B45309", red:"#DC2626",
  blue:"#2563EB", purple:"#7C3AED", bg:"#F5F7FA", card:"#FFFFFF",
  input:"#FFFFFF", hover:"#F0F3F6", border:"#DCE3EA",
  // Texte assombri de 15% (demande du medecin : "la couleur est faible").
  // Uniquement le theme clair -- en sombre le texte est deja quasi-blanc
  // sur fond quasi-noir, l'assombrir reduirait le contraste au lieu de
  // l'ameliorer. Valeurs d'origine : text #101B26, muted #5B6B7A, dim #8A97A3.
  text:"#0E1720", muted:"#4D5B68", dim:"#75808B",
};
// Objet mutable partagé par tous les composants "Page*" de ce fichier.
// AppLayout force le remontage complet (key={mode}) quand le thème change,
// donc chaque composant relit ces valeurs à jour dès son prochain rendu.
// eslint-disable-next-line prefer-const
let C = { ...PALETTE_DARK };
const fmt = (n) => Number(n||0).toLocaleString("fr-CI");
const UNITES_MEDICAMENT = ["boite","flacon","sachet","ampoule","comprimé","litre","pièce","carton"];
const today = () => new Date().toISOString().split("T")[0];
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("fr-CI",{day:"numeric",month:"short",year:"numeric"}) : "—";

// Regroupe les lignes d'une facture par type d'acte (categorie_nom),
// avec un titre de section sur fond colore. TODO : la couleur est
// actuellement fixe (vert de marque) -- a remplacer par la couleur du
// logo de la clinique une fois l'outil de gestion des couleurs
// d'impression construit.
const genererLignesFactureHtml = (lignes, couleur = "#0A8F58") => {
  if (!lignes || !lignes.length) return `<tr><td colspan="4" style="padding:12px 0;color:#8BA0B5;text-align:center;">Détail non disponible pour cette facture</td></tr>`;
  const groupes = {};
  const ordreGroupes = [];
  lignes.forEach(l => {
    const cat = l.categorie_nom || "Autres";
    if (!groupes[cat]) { groupes[cat] = []; ordreGroupes.push(cat); }
    groupes[cat].push(l);
  });
  return ordreGroupes.map(cat => `
    <tr><td colspan="4" style="padding:8px 10px;background:${couleur};color:#fff;font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:.5px;">${cat}</td></tr>
    ${groupes[cat].map(l => `
      <tr>
        <td style="padding:8px 0 8px 10px;border-bottom:1px solid #e5e7eb;">${l.libelle_acte||'—'}</td>
        <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:center;">${l.quantite}</td>
        <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:right;">${Number(l.prix_unitaire).toLocaleString('fr-CI')} F</td>
        <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:right;">${Number(l.part_patient||0).toLocaleString('fr-CI')} F</td>
      </tr>`).join('')}
  `).join('');
};

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
  updateOrdonnance:(id,d) => api.put(`/ordonnances/${id}`, d),
  patientParCode:(code) => api.get(`/patients/by-code/${encodeURIComponent(code)}`),
  demanderExamen:(d) => api.post("/bulletins", d),
  // Stock
  stock:        () => api.get("/stock"),
  addStock:     (d) => api.post("/stock", d),
  updateStock:  (id,d) => api.put(`/stock/${id}`, d),
  // Médecins & RH
  medecins:     () => api.get("/medecins"),
  updatePatient: (id,d) => api.put(`/patients/${id}`, d),
  affecterMedecinPassage: (passageId,medecinId) => api.put(`/passages/${passageId}/medecin`, { medecin_id:medecinId }),
  assureursListe:  () => api.get("/assureurs"),
  conventions:     () => api.get("/conventions"),
  addConvention:   (d) => api.post("/conventions", d),
  updateConvention:(id,d) => api.put(`/conventions/${id}`, d),
  tarifsConvention:(conventionId) => api.get(`/conventions/${conventionId}/tarifs-actes`),
  setTarifNegocie: (conventionId,acteId,tarif_negocie) => api.put(`/conventions/${conventionId}/tarifs-actes/${acteId}`, { tarif_negocie }),
  retirerTarifNegocie:(conventionId,acteId) => api.delete(`/conventions/${conventionId}/tarifs-actes/${acteId}`),
  tarifsMedicamentsConvention:(conventionId) => api.get(`/conventions/${conventionId}/tarifs-medicaments`),
  setTarifNegocieMedicament: (conventionId,stockId,tarif_negocie) => api.put(`/conventions/${conventionId}/tarifs-medicaments/${stockId}`, { tarif_negocie }),
  retirerTarifNegocieMedicament:(conventionId,stockId) => api.delete(`/conventions/${conventionId}/tarifs-medicaments/${stockId}`),
  formulesParAssureur: (assureurId) => api.get("/formules-assurance", { params:{ assureur_id:assureurId } }),
  contactsUrgence:       (patientId) => api.get(`/patients/${patientId}/contacts-urgence`),
  ajouterContactUrgence: (patientId,d) => api.post(`/patients/${patientId}/contacts-urgence`, d),
  modifierContactUrgence:(id,d) => api.put(`/contacts-urgence/${id}`, d),
  supprimerContactUrgence:(id) => api.delete(`/contacts-urgence/${id}`),
  addMedecin:   (d) => api.post("/medecins", d),
  updateMedecin:(id,d) => api.put(`/medecins/${id}`, d),
  deleteMedecin:(id) => api.delete(`/medecins/${id}`),
  personnel:    () => api.get("/clinique/personnel"),
  addPersonnel: (d) => api.post("/clinique/personnel", d),
  updPersonnel: (id,d) => api.put(`/clinique/personnel/${id}`, d),
  deletePersonnel: (id) => api.delete(`/clinique/personnel/${id}`),
  resetPasswordPersonnel: (id,d) => api.put(`/clinique/personnel/${id}/mot-de-passe`, d),
  // Finance
  factures:      () => api.get("/factures"),
  updateFacture: (id,d) => api.put(`/factures/${id}`, d),
  facturesParStatut: (statut) => api.get("/factures", { params: { statut } }),
  chargesAPayer:   () => api.get("/charges-a-payer"),
  addChargeAPayer: (d) => api.post("/charges-a-payer", d),
  supprimerChargeAPayer: (id) => api.delete(`/charges-a-payer/${id}`),
  payerFacture:    (d) => api.post("/caisse/payer-facture", d),
  payerCharge:     (d) => api.post("/caisse/payer-charge", d),
  facturesPatient: (patientId) => api.get("/factures", { params: { patient_id: patientId } }),
  caisse:        (caisseId) => api.get("/caisse", { params: caisseId ? { caisse_id: caisseId } : {} }),
  actesCatalogue:  () => api.get("/actes"),
  specialites:       () => api.get("/specialites-clinique"),
  addSpecialite:     (d) => api.post("/specialites-clinique", d),
  updateSpecialite:  (id,d) => api.put(`/specialites-clinique/${id}`, d),
  deleteSpecialite:  (id) => api.delete(`/specialites-clinique/${id}`),
  passageActif:    (patientId) => api.get(`/passages/patient/${patientId}/actif`),
  ouvrirPassage:   (d) => api.post("/passages", d),
  passageDetail:   (id) => api.get(`/passages/${id}`),
  ajouterActe:     (passageId,d) => api.post(`/passages/${passageId}/actes`, d),
  ajouterMedicament:(passageId,d) => api.post(`/passages/${passageId}/medicament`, d),
  pausePassage:    (id) => api.put(`/passages/${id}/pause`),
  reprendrePassage:(id) => api.put(`/passages/${id}/reprendre`),
  validerPassage:  (id) => api.post(`/passages/${id}/valider`),
  caisses:       () => api.get("/caisses"),
  addCaisse:     (d) => api.post("/caisses", d),
  ouvrirCaisse:  (caisseId) => api.post("/caisse/ouvrir", { caisse_id: caisseId }),
  encaisser:     (caisseId, d) => api.post("/caisse/encaisser", { ...d, caisse_id: caisseId }),
  decaisser:     (caisseId, d) => api.post("/caisse/decaisser", { ...d, caisse_id: caisseId }),
  facturesImpayees: () => api.get("/caisse/factures-impayees"),
  historiqueCaisse: (caisseId) => api.get(`/caisse/${caisseId}/historique`),
  cloturerCaisse:(caisseId) => api.post("/caisse/cloturer", { caisse_id: caisseId }),
  // Assurances
  dossiers:     () => api.get("/assurances"),
  addDossier:   (d) => api.post("/assurances", d),
  updateDossier:(id,d) => api.put(`/assurances/${id}`, d),
  deleteDossier:(id) => api.delete(`/assurances/${id}`),
  // Etablissements labo/imagerie (destinataire d'une demande d'examen)
  laboratoiresListe: () => api.get("/public/laboratoires"),
  imageriesListe:    () => api.get("/public/imageries"),
};

// ── UI Components ─────────────────────────────────────────────────
const Card = ({ label, value, icon, color=C.green, sub, onClick }) => (
  <div onClick={onClick} style={{ background:C.input, border:`1.5px solid ${C.border}`, borderRadius:14, padding:"18px 16px", cursor:onClick?"pointer":"default", transition:"border-color .15s" }}
    onMouseOver={e=>onClick&&(e.currentTarget.style.borderColor=color)} onMouseOut={e=>onClick&&(e.currentTarget.style.borderColor=C.border)}>
    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
      {icon && <span style={{ fontSize:23 }}>{icon}</span>}
      <span style={{ fontSize:14, textTransform:"uppercase", letterSpacing:".5px", color:C.dim, fontWeight:700 }}>{label}</span>
    </div>
    <div style={{ fontSize:34, fontWeight:900, color, marginBottom:sub?3:0 }}>{value}</div>
    {sub && <div style={{ fontSize:16, color:C.muted }}>{sub}</div>}
  </div>
);

const Panel = ({ title, children, actions, accent, style:s={} }) => (
  <div style={{ background:C.input, border:`1.5px solid ${accent||C.border}`, borderRadius:14, padding:20, ...s }}>
    {(title||actions) && (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
        {title && <h3 style={{ fontSize:18, fontWeight:700, color:C.text, margin:0 }}>{title}</h3>}
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
  return <span style={{ background:bg, color:text, fontSize:14, fontWeight:700, padding:"3px 10px", borderRadius:20 }}>{children}</span>;
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
      style={{ borderRadius:9, padding:"9px 18px", fontSize:17, fontWeight:700, cursor:loading?"not-allowed":"pointer", opacity:loading?.65:1, fontFamily:"inherit", transition:"opacity .15s", ...v[variant]||v.primary, ...s }}>
      {loading ? "⏳…" : children}
    </button>
  );
};

const Inp = ({ label, value, onChange, type="text", placeholder, required, list, style:s={} }) => (
  <div style={{ marginBottom:14, ...s }}>
    <label style={{ display:"block", fontSize:14, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:".5px", marginBottom:5 }}>{label}{required&&" *"}</label>
    <input type={type} value={value||""} onChange={onChange} placeholder={placeholder} required={required} list={list}
      style={{ width:"100%", background:C.hover, border:`1.5px solid ${C.border}`, borderRadius:9, padding:"10px 14px", color:C.text, fontSize:18, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }}
      onFocus={e=>e.target.style.borderColor=C.green} onBlur={e=>e.target.style.borderColor=C.border} />
  </div>
);

const Sel = ({ label, value, onChange, options=[], required, style:s={} }) => (
  <div style={{ marginBottom:14, ...s }}>
    <label style={{ display:"block", fontSize:14, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:".5px", marginBottom:5 }}>{label}{required&&" *"}</label>
    <select value={value||""} onChange={onChange} required={required}
      style={{ width:"100%", background:C.hover, border:`1.5px solid ${C.border}`, borderRadius:9, padding:"10px 14px", color:C.text, fontSize:18, outline:"none", fontFamily:"inherit" }}>
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
          <h2 style={{ fontSize:22, fontWeight:700, color:C.text, margin:0 }}>{title}</h2>
          <button onClick={onClose} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:26, lineHeight:1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
};

const Loader = () => <div style={{ textAlign:"center", padding:48, color:C.dim }}>⏳ Chargement…</div>;
const Empty = ({ icon, title, subtitle }) => (
  <div style={{ textAlign:"center", padding:"40px 20px", color:C.dim }}>
    <div style={{ fontSize:47, marginBottom:10 }}>{icon}</div>
    {title && <div style={{ fontSize:20, fontWeight:700, color:C.muted, marginBottom:4 }}>{title}</div>}
    {subtitle && <div style={{ fontSize:17 }}>{subtitle}</div>}
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
      <h1 style={{ fontSize:29, fontWeight:800, color:C.text, margin:"0 0 4px" }}>{title}</h1>
      {subtitle && <p style={{ fontSize:17, color:C.muted, margin:0 }}>{subtitle}</p>}
    </div>
    {actions && <div style={{ display:"flex", gap:10 }}>{actions}</div>}
  </div>
);

const Table = ({ columns, rows, emptyMsg="Aucune donnée" }) => (
  <div style={{ overflowX:"auto" }}>
    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:17 }}>
      <thead>
        <tr style={{ borderBottom:`1px solid ${C.border}` }}>
          {columns.map(c=><th key={c.key+c.label} style={{ textAlign:"left", padding:"8px 12px", fontSize:13, fontWeight:700, textTransform:"uppercase", letterSpacing:".5px", color:C.dim, whiteSpace:"nowrap" }}>{c.label}</th>)}
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
  const { data: stats } = useQuery({ queryKey:["cl-stats"], queryFn:()=>cAPI.stats().then(r=>r.data||{}), retry:1 });
  // Compteur du dashboard : total des RDV actifs a venir (en_attente ou
  // confirme, a partir d'aujourd'hui), pas seulement ceux de la date du
  // jour precis -- un RDV pris pour demain doit deja apparaitre ici.
  const { data: rdvsData } = useQuery({ queryKey:["cl-rdvs-today"], queryFn:()=>cAPI.rdvs({}).then(r=>{
    const tous = r.data.data||[];
    const auj = today();
    return tous.filter(x => String(x.date_rdv).slice(0,10) >= auj && (x.statut==='en_attente' || x.statut==='confirme'));
  }), retry:1 });
  const { data: stockData } = useQuery({ queryKey:["cl-stock-alerts"], queryFn:()=>cAPI.stock().then(r=>r.data||[]), retry:1 });

  const rdvs = rdvsData||[]; const stock = stockData||[];
  const alertesStock = stock.filter(s=>s.quantite<=s.seuil_alerte);
  const rdvAujourdhui = rdvs.length;
  const rdvConfirmes = rdvs.filter(r=>r.statut==="confirme").length;

  const modulesTous = [
    { icon:"📅", label:"Planning & RDV",    path:"planning",    color:C.teal,   stat:`${rdvAujourdhui} RDV à venir` },
    { icon:"👤", label:"Dossiers patients", path:"dossiers",    color:C.blue,   stat:"DME complets" },
    { icon:"🩺", label:"Consultation",      path:"consultation",color:C.green,  stat:"En cours" },
    { icon:"💰", label:"Caisse",            path:"caisse",      color:C.amber,  stat:"Ouverte" },
    { icon:"📄", label:"Gestion financière", path:"facturation", color:C.purple, stat:"États financiers" },
    { icon:"👨‍⚕️", label:"Médecins & RH",   path:"medecins",    color:"#0891B2", stat:"Personnel" },
    { icon:"💊", label:"Stock",             path:"stock",       color:alertesStock.length>0?C.red:C.green, stat:alertesStock.length>0?`${alertesStock.length} alertes`:stock.length+" produits" },
    { icon:"🛡️", label:"Assurances",        path:"assurance",   color:C.teal,   stat:"Tiers-payant" },
    { icon:"📋", label:"Qualité & Docs",    path:"qualite",     color:C.purple, stat:"Politiques" },
    { icon:"📊", label:"Statistiques",      path:"stats",       color:C.green,  stat:"Rapports" },
    { icon:"🚶", label:"File d'attente",     path:"file-attente",color:C.teal,   stat:"Accueil patients" },
    { icon:"👁️", label:"Vue Propriétaire",   path:"proprietaire", color:C.amber,  stat:"Surveillance financière" },
    { icon:"🏥", label:"Profil & Logo",       path:"profil-logo",  color:C.purple, stat:"Identité visuelle" },
    { icon:"🩺", label:"Ma file (Médecin)",  path:"file-medecin", color:C.green,  stat:"Mes patients" },
    { icon:"🔬", label:"Résultats d'examens", path:"resultats-examens", color:C.teal, stat:"Recherche par code" },
  ];
  // Grille de raccourcis de la page d'accueil clinique : meme regle de
  // visibilite que la barre laterale (AppLayout.jsx), dupliquee ici car
  // c'est un tableau JSX local, distinct de NAV.clinique. sous_role absent
  // = compte historique/proprietaire = grille complete.
  const MODULES_VISIBLES_PAR_SOUS_ROLE = {
    bureau_entrees: ["planning", "dossiers", "caisse", "facturation", "stock", "file-attente", "resultats-examens"],
    medecin:        ["planning", "dossiers", "consultation", "stock", "stats", "file-medecin", "resultats-examens"],
    finance:        ["caisse", "facturation", "assurance", "stats", "proprietaire"],
    rh:             ["medecins", "qualite"],
    laboratoire:    ["resultats-examens"],
    radiologie:     ["resultats-examens"],
  };
  const modules = (user?.sous_role && MODULES_VISIBLES_PAR_SOUS_ROLE[user.sous_role])
    ? modulesTous.filter(m => MODULES_VISIBLES_PAR_SOUS_ROLE[user.sous_role].includes(m.path))
    : modulesTous;
  // Les compteurs generaux (RDV, stock, medecins, patients) et les
  // panneaux RDV du jour / Alertes stock exposent des donnees
  // operationnelles de toute la clinique, sans rapport avec certains
  // metiers (laboratoire, radiologie, RH) -- moindre privilege.
  const SOUS_ROLES_SANS_STATS_GENERALES = ['laboratoire', 'radiologie', 'rh'];
  const afficherStatsGenerales = !user?.sous_role || !SOUS_ROLES_SANS_STATS_GENERALES.includes(user.sous_role);

  return (
    <div>
      <PageHeader title={`🏥 Bienvenue, ${user?.nom||"Clinique"}`} subtitle={`${new Date().toLocaleDateString("fr-CI",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}`} />

      {afficherStatsGenerales && (
      <Grid cols={4} gap={14} style={{ marginBottom:20 }}>
        <Card label="RDV à venir"   value={rdvAujourdhui}                    icon="📅" color={C.teal}   sub={`${rdvConfirmes} confirmés`} onClick={()=>nav("planning")} />
        <Card label="Alertes stock"     value={alertesStock.length}              icon="⚠️" color={alertesStock.length>0?C.red:C.green} sub="Ruptures proches" onClick={()=>nav("stock")} />
        <Card label="Médecins actifs"   value={stats?.medecins_actifs||"—"}      icon="👨‍⚕️" color={C.blue}  sub="Disponibles" onClick={()=>nav("medecins")} />
        <Card label="Patients ce mois"  value={stats?.patients_mois||"—"}        icon="👤" color={C.purple} sub="Consultations" onClick={()=>nav("dossiers")} />
      </Grid>
      )}

      {/* Modules grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:14, marginBottom:24 }}>
        {modules.map(m=>(
          <button key={m.path} onClick={()=>nav(m.path)}
            style={{ background:C.input, border:`1.5px solid ${C.border}`, borderRadius:14, padding:20, cursor:"pointer", textAlign:"left", fontFamily:"inherit", transition:"all .15s" }}
            onMouseOver={e=>{e.currentTarget.style.borderColor=m.color;e.currentTarget.style.transform="translateY(-2px)";}}
            onMouseOut={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.transform="none";}}>
            <div style={{ fontSize:36, marginBottom:10 }}>{m.icon}</div>
            <div style={{ fontSize:17, fontWeight:700, color:C.text, marginBottom:4 }}>{m.label}</div>
            <div style={{ fontSize:14, color:C.dim }}>{m.stat}</div>
          </button>
        ))}
      </div>

      {/* RDV du jour + Alertes */}
      {afficherStatsGenerales && (
      <Grid cols={2} gap={20}>
        <Panel title="📅 RDV du jour" actions={<Btn style={{padding:"6px 14px",fontSize:16}} onClick={()=>nav("planning")}>Tout voir →</Btn>}>
          {rdvs.length===0
            ? <Empty icon="📅" title="Aucun RDV à venir" />
            : rdvs.slice(0,5).map(r=>(
              <div key={r.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>
                <div style={{ textAlign:"center", minWidth:48, background:C.hover, borderRadius:8, padding:"4px 8px" }}>
                  <div style={{ fontSize:18, fontWeight:800, color:C.text }}>{r.heure_rdv?.slice(0,5)||"—"}</div>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:17, fontWeight:700, color:C.text }}>{r.patient_nom||"Patient"}</div>
                  <div style={{ fontSize:14, color:C.muted }}>{r.medecin_nom||"—"} · {r.motif||"Consultation"}</div>
                </div>
                <Badge color={{ confirme:"green", en_attente:"amber", annule:"red" }[r.statut]||"gray"}>{r.statut||"—"}</Badge>
              </div>
            ))
          }
        </Panel>

        <Panel title="⚠️ Alertes stock" actions={<Btn style={{padding:"6px 14px",fontSize:16}} onClick={()=>nav("stock")}>Gérer →</Btn>}>
          {alertesStock.length===0
            ? <Empty icon="✅" title="Stock OK" subtitle="Aucune alerte en cours" />
            : alertesStock.slice(0,5).map(s=>(
              <div key={s.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>
                <span style={{ fontSize:29 }}>💊</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:17, fontWeight:700, color:C.text }}>{s.nom}</div>
                  <div style={{ fontSize:14, color:C.muted }}>Stock : {s.quantite} / Seuil : {s.seuil_alerte}</div>
                  <ProgressBar value={s.quantite} max={s.seuil_alerte*2} color={s.quantite===0?C.red:C.amber} />
                </div>
                <Badge color={s.quantite===0?"red":"amber"}>{s.quantite===0?"Rupture":"Alerte"}</Badge>
              </div>
            ))
          }
        </Panel>
      </Grid>
      )}
    </div>
  );
}

// ── Recherche patient reutilisable (nom, prenom, telephone ou code
// secret) -- remplace la saisie manuelle partout ou une action
// concerne un patient existant. Selectionner un resultat renseigne
// a la fois patient_id (jamais de doublon) et patient_nom (affichage).
function RecherchePatient({ value, onSelect, placeholder }) {
  const [saisie, setSaisie] = useState(value || "");
  const [ouvert, setOuvert] = useState(false);
  const [showCreer, setShowCreer] = useState(false);
  const [creerForm, setCreerForm] = useState({ prenom:"", nom:"", telephone:"", email:"" });
  const qc = useQueryClient();
  useEffect(() => { setSaisie(value || ""); }, [value]);

  const { data } = useQuery({
    queryKey: ["recherche-patient-globale", saisie],
    queryFn: () => api.get(`/patients?q=${encodeURIComponent(saisie)}`).then(r => r.data || []),
    enabled: saisie.trim().length >= 2 && ouvert,
  });

  // Patient introuvable dans MediConnect : creation directe (compte
  // VigieCard + code secret generes automatiquement par le backend),
  // au lieu de laisser saisie comme simple texte libre sans patient_id.
  const creerMut = useMutation({
    mutationFn: () => api.post("/patients", creerForm),
    onSuccess: (r) => {
      const p = r.data.data;
      toast.success(`Patient créé — code secret ${p.code_secret}`);
      qc.invalidateQueries(["recherche-patient-globale"]);
      onSelect(p);
      setSaisie(`${p.prenom} ${p.nom}`);
      setShowCreer(false); setOuvert(false);
    },
    onError: e => toast.error(e?.response?.data?.message || "Erreur lors de la création"),
  });

  const ouvrirCreation = () => {
    const mots = saisie.trim().split(/\s+/);
    setCreerForm({ prenom: mots[0]||"", nom: mots.slice(1).join(" ")||"", telephone:"", email:"" });
    setShowCreer(true);
  };

  return (
    <div style={{ position:"relative" }}>
      <Inp label="Patient *" required value={saisie}
        onChange={e => { setSaisie(e.target.value); setOuvert(true); }}
        onFocus={() => setOuvert(true)}
        placeholder={placeholder || "Nom, téléphone ou code secret…"} />
      {ouvert && saisie.trim().length >= 2 && !showCreer && (
        <div style={{ position:"absolute", top:"100%", left:0, right:0, zIndex:20, background:C.input, border:`1.5px solid ${C.border}`, borderRadius:10, marginTop:4, maxHeight:260, overflowY:"auto", boxShadow:"0 8px 24px rgba(0,0,0,.25)" }}>
          {!data ? (
            <div style={{ padding:12, fontSize:14, color:C.dim }}>Recherche…</div>
          ) : data.length === 0 ? (
            <div style={{ padding:12 }}>
              <div style={{ fontSize:14, color:C.dim, marginBottom:8 }}>Aucun patient MediConnect trouvé</div>
              <button onClick={ouvrirCreation} onMouseDown={e=>e.preventDefault()}
                style={{ width:"100%", padding:"8px 12px", background:"rgba(10,143,88,.12)", border:`1px solid ${C.green}`, borderRadius:7, color:C.green, fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                + Créer "{saisie}" comme nouveau patient
              </button>
            </div>
          ) : data.slice(0,8).map(p => (
            <div key={p.id} onClick={() => { onSelect(p); setSaisie(`${p.prenom} ${p.nom}`); setOuvert(false); }}
              style={{ padding:"10px 14px", cursor:"pointer", borderBottom:`1px solid ${C.border}` }}
              onMouseDown={e=>e.preventDefault()}>
              <div style={{ fontSize:15, fontWeight:700, color:C.text }}>{p.prenom} {p.nom}</div>
              <div style={{ fontSize:13, color:C.dim }}>{p.telephone||"—"} {p.code_secret?`· ${p.code_secret}`:""}</div>
            </div>
          ))}
        </div>
      )}
      {showCreer && (
        <div style={{ position:"absolute", top:"100%", left:0, right:0, zIndex:20, background:C.input, border:`1.5px solid ${C.green}`, borderRadius:10, marginTop:4, padding:14, boxShadow:"0 8px 24px rgba(0,0,0,.25)" }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.green, marginBottom:10 }}>🆕 Nouveau patient MediConnect</div>
          <Grid cols={2} gap={8}>
            <Inp label="Prénom *" required value={creerForm.prenom} onChange={e=>setCreerForm(f=>({...f,prenom:e.target.value}))} />
            <Inp label="Nom *" required value={creerForm.nom} onChange={e=>setCreerForm(f=>({...f,nom:e.target.value}))} />
          </Grid>
          <Inp label="Téléphone" value={creerForm.telephone} onChange={e=>setCreerForm(f=>({...f,telephone:e.target.value}))} placeholder="+225 07 00 00 00 00" style={{marginTop:8}} />
          <Inp label="Email" value={creerForm.email} onChange={e=>setCreerForm(f=>({...f,email:e.target.value}))} placeholder="patient@exemple.com" style={{marginTop:8}} />
          <div style={{ display:"flex", gap:8, marginTop:10 }}>
            <Btn variant="outline" style={{flex:1}} onClick={()=>setShowCreer(false)}>Annuler</Btn>
            <Btn style={{flex:2}} loading={creerMut.isPending} onClick={()=>{
              if (!creerForm.prenom.trim()||!creerForm.nom.trim()) { toast.error("Prénom et nom requis"); return; }
              creerMut.mutate();
            }}>Créer et sélectionner</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  2. PAGE PLANNING & RDV
// ════════════════════════════════════════════════════════════════════
function PagePlanning() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedDate, setSelectedDate] = useState(today());
  const [form, setForm] = useState({ patient_nom:"", medecin_nom:"", date_rdv:today(), heure_rdv:"09:00", motif:"", assurance:"", statut:"en_attente" });
  const [showWorkflow, setShowWorkflow] = useState(false);
  const [workflowRdv, setWorkflowRdv] = useState(null);

  const { data, isLoading } = useQuery({ queryKey:["cl-rdvs",selectedDate], queryFn:()=>cAPI.rdvs({ date:selectedDate }).then(r=>r.data.data||[]) });
  const rdvs = data||[];

  const addMut = useMutation({ mutationFn:d=>cAPI.addRdv(d), onSuccess:()=>{ toast.success("RDV ajouté !"); qc.invalidateQueries(["cl-rdvs"]); setShowAdd(false); }, onError:()=>toast.error("Erreur") });
  const updMut = useMutation({ mutationFn:({id,statut})=>cAPI.updateRdv(id,{statut}), onSuccess:()=>{ toast.success("RDV mis à jour"); qc.invalidateQueries(["cl-rdvs"]); qc.invalidateQueries(["cl-rdvs-today"]); }, onError:()=>toast.error("Erreur") });
  const confirmerMut = useMutation({ mutationFn:id=>cAPI.confirmerRdv(id), onSuccess:()=>{ toast.success("✅ RDV confirmé !"); qc.invalidateQueries(["cl-rdvs"]); qc.invalidateQueries(["cl-rdvs-today"]); }, onError:()=>toast.error("Erreur confirmation") });
  const delMut = useMutation({ mutationFn:id=>cAPI.deleteRdv(id), onSuccess:()=>{ toast.success("RDV supprimé"); qc.invalidateQueries(["cl-rdvs"]); }, onError:()=>toast.error("Erreur") });

  const f = (k) => e => setForm(p=>({...p,[k]:e.target.value}));

  const statuts = ["en_attente","confirme","en_cours","termine","annule"];
  const statutColor = { en_attente:"amber", confirme:"green", en_cours:"teal", termine:"gray", annule:"red" };

  return (
    <div>
      <PageHeader title="📅 Planning & Rendez-vous" subtitle={`${rdvs.length} RDV pour le ${fmtDate(selectedDate)}`}
        actions={<><Btn onClick={()=>{ setForm(prev=>({...prev, date_rdv:selectedDate})); setShowAdd(true); }}>+ Nouveau RDV</Btn></>} />

      {/* Sélecteur de date */}
      <div style={{ background:C.input, border:`1px solid ${C.border}`, borderRadius:12, padding:"14px 18px", marginBottom:20, display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
        <label style={{ fontSize:16, fontWeight:700, color:C.muted, textTransform:"uppercase" }}>Date</label>
        <input type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)}
          style={{ background:C.hover, border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 12px", color:C.text, fontSize:18, outline:"none", fontFamily:"inherit" }} />
        <div style={{ display:"flex", gap:8 }}>
          {["Hier","Aujourd'hui","Demain"].map((l,i)=>{
            const d = new Date(); d.setDate(d.getDate()+(i-1));
            const ds = d.toISOString().split("T")[0];
            return <Btn key={l} variant={selectedDate===ds?"primary":"outline"} style={{padding:"7px 14px",fontSize:16}} onClick={()=>setSelectedDate(ds)}>{l}</Btn>;
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
                { key:"patient_nom", label:"Patient", render:(v,r)=><><div style={{fontWeight:700}}>{v||"—"}</div><div style={{fontSize:14,color:C.muted}}>{r.assurance||"Sans assurance"}</div></> },
                { key:"medecin_nom", label:"Médecin", render:v=>v||"—" },
                { key:"motif", label:"Motif", render:v=><span style={{color:C.muted,fontSize:16}}>{v?.slice(0,40)||"—"}</span> },
                { key:"statut", label:"Statut", render:v=><Badge color={statutColor[v]||"gray"}>{v||"—"}</Badge> },
                { key:"id", label:"Actions", render:(id,row)=>(
                  <div style={{display:"flex",gap:6}}>
                    {row.statut==="en_attente" && <Btn variant="outline" style={{padding:"4px 10px",fontSize:14,color:C.green}} onClick={()=>confirmerMut.mutate(id)}>Confirmer</Btn>}
                    {row.statut==="confirme" && <Btn variant="outline" style={{padding:"4px 10px",fontSize:14,color:C.teal}} onClick={()=>updMut.mutate({id,statut:"en_cours"})}>Démarrer</Btn>}
                    {row.statut==="en_cours" && <Btn style={{padding:"4px 10px",fontSize:14}} onClick={()=>{
                      // Bureau des entrees : ouvre Carte patient (infos, carte,
                      // factures, rapports) avec le patient preselectionne, PAS
                      // le workflow de consultation medical, strictement reserve
                      // au medecin.
                      if (user?.sous_role === "bureau_entrees") {
                        navigate(`/clinique/dossiers?patient_id=${row.patient_id||''}`);
                      } else {
                        setWorkflowRdv(row); setShowWorkflow(true);
                      }
                    }}>{user?.sous_role === "bureau_entrees" ? "🗂️ Carte patient" : "🩺 Consulter"}</Btn>}
                    {row.statut==="en_cours" && <Btn variant="outline" style={{padding:"4px 10px",fontSize:14,color:C.muted}} onClick={()=>updMut.mutate({id,statut:"termine"})}>Terminer</Btn>}
                    <Btn variant="outline" style={{padding:"4px 10px",fontSize:14,color:C.red}} onClick={()=>window.confirm("Supprimer ce RDV ?")&&delMut.mutate(id)}>✕</Btn>
                  </div>
                )},
              ]} rows={rdvs} />
          }
        </Panel>
      )}

      <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="📅 Nouveau rendez-vous" width={640}>
        <Grid cols={2} gap={12}>
          <RecherchePatient value={form.patient_nom} onSelect={p=>setForm(prev=>({...prev, patient_id:p.id, patient_nom:`${p.prenom} ${p.nom}`}))} />
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

    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  3. PAGE DME — DOSSIERS MÉDICAUX ÉLECTRONIQUES
// ════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════
//  CARTE PATIENT (passage multi-services) -- bureau des entrees ouvre
//  une carte, ajoute des actes au fil du parcours du patient dans
//  plusieurs services (menu deroulant, catalogue actes_medicaux), peut
//  la mettre en pause et la reprendre, puis la valide definitivement --
//  ce qui genere automatiquement la facture correspondante.
// ══════════════════════════════════════════════════════════════════
const ASSUREURS_LISTE = ["NSIA Vie CI","NSIA IARDT","Allianz CI","AXA CI","Saham Assurance CI","Sunu Assurances","CNAM (CMU)","Mutuelles CGRAE","Mutuelles MUGEFCI","AMI Assurances","Colina","Prima Assurance","Gras Savoye","SIA (Société Ivoirienne d'Assurance)","Autre"];

function PanelCartePatient({ patient }) {
  const qc = useQueryClient();
  const [acteChoisi, setActeChoisi] = useState("");
  const [typeActeChoisi, setTypeActeChoisi] = useState("");
  const [ongletCarte, setOngletCarte] = useState("consultation");
  const [chambreChoisie, setChambreChoisie] = useState("");
  const [ligneEnEdition, setLigneEnEdition] = useState(null);
  // Par defaut, coherent avec le statut d'assurance ACTUEL du patient --
  // le bureau des entrees peut toujours decocher pour un acte precis.
  const [estAssure, setEstAssure] = useState(!!patient?.assurance);
  const [quantiteActe, setQuantiteActe] = useState("1");
  const [editAssurance, setEditAssurance] = useState(false);
  const [assuranceForm, setAssuranceForm] = useState({ est_assure: !!patient?.assurance, assurance: patient?.assurance||"", numero_police: patient?.numero_police||"", assureur_id: patient?.assureur_id||"", formule_assurance_id: patient?.formule_assurance_id||"" });

  const { data: medecinsListe } = useQuery({
    queryKey: ["cl-medecins-carte"],
    queryFn: () => cAPI.medecins().then(r => r.data||[]),
  });

  const { data: passageActif, isLoading: chargementActif } = useQuery({
    queryKey: ["cl-passage-actif", patient?.id],
    queryFn: () => cAPI.passageActif(patient.id).then(r => r.data || null),
    enabled: !!patient?.id,
  });

  const { data: passageDetail } = useQuery({
    queryKey: ["cl-passage-detail", passageActif?.id],
    queryFn: () => cAPI.passageDetail(passageActif.id).then(r => r.data),
    enabled: !!passageActif?.id,
  });

  const { data: catalogue } = useQuery({
    queryKey: ["cl-actes-catalogue"],
    queryFn: () => cAPI.actesCatalogue().then(r => r.data || []),
  });
  const { data: categoriesActes } = useQuery({
    queryKey: ["cl-categories-actes-carte"],
    queryFn: () => api.get("/categories-actes").then(r => r.data || []),
  });
  const { data: stockDisponible } = useQuery({
    queryKey: ["cl-stock-carte"],
    queryFn: () => cAPI.stock().then(r => r.data || []),
  });
  const { data: chambresDisponibles } = useQuery({
    queryKey: ["cl-chambres-carte"],
    queryFn: () => api.get("/categories-chambres").then(r => r.data || []),
  });
  const [medicamentChoisi, setMedicamentChoisi] = useState("");
  const [lignesMedicaments, setLignesMedicaments] = useState([{id:1, medicament:"", qte:"1"}]);
  const [quantiteMedicament, setQuantiteMedicament] = useState("1");

  const ouvrirMut = useMutation({
    mutationFn: () => cAPI.ouvrirPassage({ patient_id: patient.id }),
    onSuccess: () => { toast.success("Carte ouverte !"); qc.invalidateQueries(["cl-passage-actif", patient.id]); },
    onError: e => toast.error(e?.response?.data?.message || "Erreur à l'ouverture"),
  });
  const ajouterMut = useMutation({
    mutationFn: () => {
      if (ongletCarte==="hospitalisation") {
        const chambre = (chambresDisponibles||[]).find(c=>c.id===chambreChoisie);
        const acte = (catalogue||[]).find(a=>a.id===acteChoisi);
        return cAPI.ajouterActe(passageActif.id, {
          acte_id: acteChoisi, est_assure: estAssure, quantite: parseInt(quantiteActe)||1,
          prix_unitaire: chambre?.tarif_journalier,
          libelle_override: `${acte?.libelle||"Hospitalisation"} — Chambre ${chambre?.nom||""}`,
        });
      }
      return cAPI.ajouterActe(passageActif.id, { acte_id: acteChoisi, est_assure: estAssure, quantite: parseInt(quantiteActe)||1 });
    },
    onSuccess: () => {
      toast.success("Acte ajouté !");
      qc.invalidateQueries(["cl-passage-detail", passageActif.id]);
      qc.invalidateQueries(["cl-passage-actif", patient.id]);
      setActeChoisi("");
      setQuantiteActe("1");
      setChambreChoisie("");
    },
    onError: e => toast.error(e?.response?.data?.message || "Erreur lors de l'ajout"),
  });
  const ajouterMedicamentMut = useMutation({
    mutationFn: (vars) => cAPI.ajouterMedicament(passageActif.id, vars || { stock_id: medicamentChoisi, quantite: parseInt(quantiteMedicament)||1, est_assure: estAssure }),
    onSuccess: () => {
      toast.success("Médicament facturé !");
      qc.invalidateQueries(["cl-passage-detail", passageActif.id]);
      qc.invalidateQueries(["cl-passage-actif", patient.id]);
      qc.invalidateQueries(["cl-stock-carte"]);
      setMedicamentChoisi("");
      setQuantiteMedicament("1");
    },
    onError: e => toast.error(e?.response?.data?.message || "Erreur lors de l'ajout"),
  });
  const pauseMut = useMutation({
    mutationFn: () => cAPI.pausePassage(passageActif.id),
    onSuccess: () => { toast.success("Carte mise en pause"); qc.invalidateQueries(["cl-passage-actif", patient.id]); },
    onError: () => toast.error("Erreur"),
  });
  const reprendreMut = useMutation({
    mutationFn: () => cAPI.reprendrePassage(passageActif.id),
    onSuccess: () => { toast.success("Carte reprise"); qc.invalidateQueries(["cl-passage-actif", patient.id]); },
    onError: () => toast.error("Erreur"),
  });
  const validerMut = useMutation({
    mutationFn: () => cAPI.validerPassage(passageActif.id),
    onSuccess: (r) => {
      toast.success(`Facture générée : ${r?.data?.reference || ""}`);
      qc.invalidateQueries(["cl-passage-actif", patient.id]);
      qc.invalidateQueries(["cl-factures"]);
    },
    onError: e => toast.error(e?.response?.data?.message || "Erreur lors de la validation"),
  });
  const modifierLigneMut = useMutation({
    mutationFn: ({ligneId, ...d}) => api.put(`/passages/${passageActif.id}/actes/${ligneId}`, d),
    onSuccess: () => {
      toast.success("Acte modifié");
      qc.invalidateQueries(["cl-passage-detail", passageActif.id]);
      qc.invalidateQueries(["cl-passage-actif", patient.id]);
      setLigneEnEdition(null);
    },
    onError: e => toast.error(e?.response?.data?.message || "Erreur lors de la modification"),
  });
  const supprimerLigneMut = useMutation({
    mutationFn: (ligneId) => api.delete(`/passages/${passageActif.id}/actes/${ligneId}`),
    onSuccess: () => {
      toast.success("Acte retiré");
      qc.invalidateQueries(["cl-passage-detail", passageActif.id]);
      qc.invalidateQueries(["cl-passage-actif", patient.id]);
    },
    onError: e => toast.error(e?.response?.data?.message || "Erreur lors de la suppression"),
  });
  const assuranceMut = useMutation({
    mutationFn: () => cAPI.updatePatient(patient.id, {
      assurance: assuranceForm.est_assure ? (assuranceForm.assurance||"") : "",
      numero_police: assuranceForm.est_assure ? (assuranceForm.numero_police||"") : "",
      assureur_id: assuranceForm.est_assure ? (assuranceForm.assureur_id||"") : "",
      formule_assurance_id: assuranceForm.est_assure ? (assuranceForm.formule_assurance_id||"") : "",
    }),
    onSuccess: () => {
      toast.success("Statut d'assurance mis à jour");
      qc.invalidateQueries(["cl-patients"]);
      setEditAssurance(false);
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });
  const medecinMut = useMutation({
    mutationFn: (medecin_id) => cAPI.affecterMedecinPassage(passageActif.id, medecin_id),
    onSuccess: () => { toast.success("Médecin affecté"); qc.invalidateQueries(["cl-passage-actif", patient.id]); },
    onError: () => toast.error("Erreur lors de l'affectation"),
  });

  const ONGLETS_CARTE = [
    { key:"consultation", label:"Consultation", icon:"🩺", categorieNom:"Consultation" },
    { key:"examens", label:"Examens", icon:"🔬", categorieNom:"Examens" },
    { key:"imagerie", label:"Imagerie", icon:"🩻", categorieNom:"Radiologie" },
    { key:"chirurgie", label:"Chirurgie", icon:"🔪", categorieNom:"Chirurgie" },
    { key:"hospitalisation", label:"Hospitalisation", icon:"🏥", categorieNom:"Hospitalisation" },
    { key:"pharmacie", label:"Pharmacie", icon:"💊", categorieNom:null },
    { key:"autres", label:"Autres", icon:"📋", categorieNom:null },
  ];
  const NOMS_ONGLETS_DEDIES = ["Consultation","Examens","Radiologie","Chirurgie","Hospitalisation"];
  const ongletActif = ONGLETS_CARTE.find(o=>o.key===ongletCarte);
  const nomCategorie = (a) => (categoriesActes||[]).find(c=>c.id===a.categorie_id)?.nom;
  const actesDuOnglet = ongletCarte==="autres"
    ? (catalogue||[]).filter(a => !NOMS_ONGLETS_DEDIES.includes(nomCategorie(a)))
    : (catalogue||[]).filter(a => nomCategorie(a) === ongletActif?.categorieNom);

  if (chargementActif) return <Panel title="🗂️ Carte patient"><div style={{textAlign:"center",padding:30,color:C.muted}}>Chargement…</div></Panel>;

  if (!passageActif) {
    return (
      <Panel title="🗂️ Carte patient">
        <div style={{marginBottom:16,padding:"10px 14px",background:C.hover,borderRadius:9,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:14,color:C.muted}}>Statut d'assurance : <strong style={{color:patient?.assurance?C.green:C.red}}>{patient?.assurance ? `Assuré (${patient.assurance})` : "Non assuré"}</strong></span>
        </div>
        <Empty icon="🗂️" title="Aucune carte ouverte" subtitle="Ouvrez une carte pour commencer à ajouter des actes durant le parcours du patient." />
        <Btn style={{width:"100%",marginTop:14}} loading={ouvrirMut.isPending} onClick={()=>ouvrirMut.mutate()}>+ Ouvrir une carte</Btn>
      </Panel>
    );
  }

  const enPause = passageActif.statut === "ferme_temporaire";
  const actes = passageDetail?.actes || [];
  const total = passageDetail?.total || 0;

  return (
    <Panel title="🗂️ Carte patient"
      actions={<Badge color={enPause ? "amber" : "green"}>{enPause ? "En pause" : "Ouverte"}</Badge>}>

      <div style={{marginBottom:14,padding:"10px 14px",background:C.hover,borderRadius:9}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:14,color:C.muted}}>Assurance : <strong style={{color:patient?.assurance?C.green:C.red}}>{patient?.assurance ? patient.assurance : "Non assuré"}</strong></span>
          <button onClick={()=>{ setAssuranceForm({ est_assure:!!patient?.assurance, assurance:patient?.assurance||"", numero_police:patient?.numero_police||"", assureur_id:patient?.assureur_id||"", formule_assurance_id:patient?.formule_assurance_id||"" }); setEditAssurance(v=>!v); }}
            style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:7,padding:"4px 10px",color:C.muted,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
            ✏️ Modifier
          </button>
        </div>
        {editAssurance && (
          <div style={{marginTop:12}}>
            <div style={{display:"flex",gap:8,marginBottom:10}}>
              {[{val:false,label:"🚫 Non assuré"},{val:true,label:"🛡️ Assuré"}].map(opt=>(
                <button key={String(opt.val)} onClick={()=>setAssuranceForm(f=>({...f,est_assure:opt.val}))}
                  style={{flex:1,padding:"8px",borderRadius:8,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",
                    background:assuranceForm.est_assure===opt.val?(opt.val?"rgba(10,143,88,.15)":"rgba(239,68,68,.1)"):"transparent",
                    border:`1.5px solid ${assuranceForm.est_assure===opt.val?(opt.val?C.green:"#EF4444"):C.border}`,
                    color:assuranceForm.est_assure===opt.val?(opt.val?C.green:"#EF4444"):C.muted}}>
                  {opt.label}
                </button>
              ))}
            </div>
            {assuranceForm.est_assure && <WidgetAssuranceCascade pForm={assuranceForm} setPForm={setAssuranceForm} />}
            <Btn style={{width:"100%"}} loading={assuranceMut.isPending} onClick={()=>assuranceMut.mutate()}>Enregistrer</Btn>
          </div>
        )}
      </div>

      <Sel label="Médecin affecté" value={passageActif.medecin_id||""} onChange={e=>medecinMut.mutate(e.target.value||null)}
        options={[{v:"",l:"— Aucun médecin affecté —"}, ...(medecinsListe||[]).map(m=>({v:m.id, l:`Dr ${m.prenom} ${m.nom}${m.specialite?' — '+m.specialite:''}`}))]}
        style={{marginBottom:16}} />

      {/* Parcours de soin -- chaque onglet ne montre que les actes de
          sa categorie, sans avoir a chercher dans un menu deroulant
          unique melangeant tout. Hospitalisation et Pharmacie ont leur
          propre logique de saisie (chambre×jours, stock). */}
      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
        {ONGLETS_CARTE.map(o=>(
          <button key={o.key} onClick={()=>{ setOngletCarte(o.key); setActeChoisi(""); setChambreChoisie(""); }}
            style={{padding:"7px 12px",borderRadius:8,border:`1.5px solid ${ongletCarte===o.key?C.green:C.border}`,
              background:ongletCarte===o.key?"rgba(10,143,88,.12)":"transparent",
              color:ongletCarte===o.key?C.green:C.muted,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
            {o.icon} {o.label}
          </button>
        ))}
      </div>

      {ongletCarte==="hospitalisation" ? (
        <div style={{ display:"grid", gridTemplateColumns:"1.2fr 1.2fr 0.7fr 1fr auto", gap:10, marginBottom:16, alignItems:"end" }}>
          <Sel label="Acte" value={acteChoisi} onChange={e=>setActeChoisi(e.target.value)}
            options={[{v:"",l:"— Choisir —"}, ...actesDuOnglet.map(a=>({v:a.id, l:a.libelle}))]} />
          <Sel label="Chambre" value={chambreChoisie} onChange={e=>setChambreChoisie(e.target.value)}
            options={[{v:"",l:"— Choisir une chambre —"}, ...(chambresDisponibles||[]).map(c=>({v:c.id, l:`${c.nom} — ${fmt(c.tarif_journalier)} F/jour`}))]} />
          <Inp label="Nb jours" type="number" min="1" value={quantiteActe} onChange={e=>setQuantiteActe(e.target.value)} />
          <label style={{display:"flex",alignItems:"center",gap:6,fontSize:14,color:C.muted,marginBottom:10}}>
            <input type="checkbox" checked={estAssure} onChange={e=>setEstAssure(e.target.checked)} /> Assuré
          </label>
          <Btn loading={ajouterMut.isPending} disabled={!acteChoisi||!chambreChoisie} onClick={()=>ajouterMut.mutate()}>+ Ajouter</Btn>
        </div>
      ) : ongletCarte==="pharmacie" ? (
        <>
          {lignesMedicaments.map((ligne,i)=>(
            <div key={ligne.id} style={{ display:"grid", gridTemplateColumns:"2fr 0.6fr auto", gap:10, marginBottom:10, alignItems:"end" }}>
              <Sel label={i===0?"Médicament (depuis le stock)":undefined} value={ligne.medicament||""}
                onChange={e=>{ const val=e.target.value; setLignesMedicaments(prev=>prev.map(l=>l.id===ligne.id?{...l,medicament:val}:l)); }}
                options={[{v:"",l:"— Choisir un médicament —"}, ...(stockDisponible||[]).filter(s=>s.categorie==="Médicament"&&s.quantite>0).map(s=>({v:s.id, l:`${s.nom} — ${fmt(s.prix_unitaire)} F (${s.quantite} ${s.unite} dispo.)`}))]} />
              <Inp label={i===0?`Qté${ligne.medicament?" ("+((stockDisponible||[]).find(s=>s.id===ligne.medicament)?.unite||"")+")":""}`:undefined}
                type="number" min="1" value={ligne.qte||""}
                onChange={e=>{ const val=e.target.value; setLignesMedicaments(prev=>prev.map(l=>l.id===ligne.id?{...l,qte:val}:l)); }} />
              {i===0 ? (
                <Btn variant="outline" onClick={()=>setLignesMedicaments(prev=>[...prev, {id:Date.now(), medicament:"", qte:"1"}])}>+</Btn>
              ) : (
                <Btn variant="outline" style={{color:C.red}} onClick={()=>setLignesMedicaments(prev=>prev.filter(l=>l.id!==ligne.id))}>✕</Btn>
              )}
            </div>
          ))}
          <Btn style={{width:"100%",marginBottom:16}} loading={ajouterMedicamentMut.isPending} onClick={async ()=>{
              const lignes = lignesMedicaments.filter(l=>l.medicament);
              if (!lignes.length) { toast.error("Choisissez au moins un médicament"); return; }
              for (const l of lignes) {
                await ajouterMedicamentMut.mutateAsync({ stock_id: l.medicament, quantite: parseInt(l.qte)||1, est_assure: estAssure });
              }
              setLignesMedicaments([{id:Date.now(), medicament:"", qte:"1"}]);
            }}>+ Facturer{lignesMedicaments.filter(l=>l.medicament).length > 1 ? ` (${lignesMedicaments.filter(l=>l.medicament).length} médicaments)` : ''}</Btn>
        </>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"2fr 0.7fr 1fr auto", gap:10, marginBottom:16, alignItems:"end" }}>
          <Sel label="Acte" value={acteChoisi} onChange={e=>setActeChoisi(e.target.value)}
            options={[{v:"",l:actesDuOnglet.length?"— Choisir un acte —":"Aucun acte dans cette catégorie"}, ...actesDuOnglet.map(a=>({v:a.id, l:`${a.libelle} — ${fmt(a.tarif_base)} F`}))]} />
          <Inp label={(catalogue||[]).find(a=>a.id===acteChoisi)?.libelle?.toLowerCase().includes("suture") ? "Nb points" : "Quantité"}
            type="number" min="1" value={quantiteActe} onChange={e=>setQuantiteActe(e.target.value)} />
          <label style={{display:"flex",alignItems:"center",gap:6,fontSize:14,color:C.muted,marginBottom:10}}>
            <input type="checkbox" checked={estAssure} onChange={e=>setEstAssure(e.target.checked)} /> Assuré
          </label>
          <Btn loading={ajouterMut.isPending} disabled={!acteChoisi} onClick={()=>ajouterMut.mutate()}>+ Ajouter</Btn>
        </div>
      )}

      {actes.length===0
        ? <Empty icon="📋" title="Aucun acte ajouté encore" />
        : actes.map(a=>{
          const enEditionLigne = ligneEnEdition===a.id;
          return (
          <div key={a.id} style={{background:C.hover,borderRadius:9,padding:"10px 14px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
            <div style={{flex:1}}>
              <div style={{fontSize:15,fontWeight:600,color:C.text}}>{a.libelle_acte}</div>
              {enEditionLigne ? (
                <div style={{display:"flex",gap:8,marginTop:6,alignItems:"center",flexWrap:"wrap"}}>
                  <span style={{fontSize:13,color:C.dim}}>{a.code_acte} ·</span>
                  <input type="number" min="1" defaultValue={a.quantite} id={`qte-ligne-${a.id}`} style={{width:60,padding:"4px 6px",background:C.input,border:`1px solid ${C.border}`,borderRadius:6,color:C.text,fontSize:13}} />
                  <span style={{fontSize:13,color:C.dim}}>×</span>
                  <input type="number" min="0" defaultValue={a.prix_unitaire} id={`pu-ligne-${a.id}`} style={{width:100,padding:"4px 6px",background:C.input,border:`1px solid ${C.border}`,borderRadius:6,color:C.text,fontSize:13}} />
                  <span style={{fontSize:13,color:C.dim}}>F</span>
                </div>
              ) : (
                <div style={{fontSize:13,color:C.dim}}>{a.code_acte} · {a.quantite} × {fmt(a.prix_unitaire)} F</div>
              )}
            </div>
            {enEditionLigne ? (
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>{
                  const qte = parseInt(document.getElementById(`qte-ligne-${a.id}`).value)||1;
                  const pu = parseFloat(document.getElementById(`pu-ligne-${a.id}`).value)||0;
                  modifierLigneMut.mutate({ ligneId:a.id, quantite:qte, prix_unitaire:pu });
                }} style={{background:C.green,border:"none",borderRadius:6,padding:"6px 10px",color:"#fff",cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>✓</button>
                <button onClick={()=>setLigneEnEdition(null)} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:6,padding:"6px 10px",color:C.muted,cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>✕</button>
              </div>
            ) : (
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{fontWeight:800,color:C.green}}>{fmt(a.prix_unitaire*a.quantite)} F</div>
                <button onClick={()=>setLigneEnEdition(a.id)} style={{background:"transparent",border:"none",color:C.blue,cursor:"pointer",fontSize:15}}>✏️</button>
                <button onClick={()=>{ if(window.confirm("Retirer cet acte de la carte ?")) supprimerLigneMut.mutate(a.id); }} style={{background:"transparent",border:"none",color:C.red,cursor:"pointer",fontSize:15}}>✕</button>
              </div>
            )}
          </div>
          );
        })
      }

      {actes.length>0 && (
        <div style={{display:"flex",justifyContent:"space-between",padding:"12px 0",borderTop:`1px solid ${C.border}`,marginTop:6,marginBottom:16}}>
          <span style={{color:C.muted,fontWeight:700}}>Total</span>
          <span style={{fontSize:20,fontWeight:900,color:C.text}}>{fmt(total)} F</span>
        </div>
      )}

      <div style={{display:"flex",gap:10}}>
        {enPause
          ? <Btn style={{flex:1}} loading={reprendreMut.isPending} onClick={()=>reprendreMut.mutate()}>▶️ Reprendre</Btn>
          : <Btn variant="outline" style={{flex:1}} loading={pauseMut.isPending} onClick={()=>pauseMut.mutate()}>⏸️ Mettre en pause</Btn>
        }
        <Btn variant="danger" style={{flex:1}} disabled={actes.length===0} loading={validerMut.isPending}
          onClick={()=>{ if(window.confirm("Valider définitivement cette carte et générer la facture ?")) validerMut.mutate(); }}>
          ✅ Valider & facturer
        </Btn>
      </div>
    </Panel>
  );
}

function WidgetAssuranceCascade({ pForm, setPForm }) {
  const { data: assureurs } = useQuery({ queryKey:["cl-assureurs-liste"], queryFn:()=>cAPI.assureursListe().then(r=>r.data||[]) });
  const { data: formules } = useQuery({
    queryKey:["cl-formules", pForm.assureur_id],
    queryFn:()=>cAPI.formulesParAssureur(pForm.assureur_id).then(r=>r.data||[]),
    enabled: !!pForm.assureur_id,
  });
  return (
    <Grid cols={2} gap={10}>
      <div>
        <label style={{fontSize:14,fontWeight:700,color:C.muted,display:"block",marginBottom:5}}>COMPAGNIE D'ASSURANCE</label>
        <select value={pForm.assureur_id} onChange={e=>{
            const id = e.target.value;
            const nom = (assureurs||[]).find(a=>a.id===id)?.nom || "";
            setPForm(p=>({...p, assureur_id:id, assurance:nom, formule_assurance_id:""}));
          }}
          style={{width:"100%",padding:"9px 12px",background:C.hover,border:`1px solid ${C.border}`,borderRadius:8,color:pForm.assureur_id?C.text:C.muted,fontSize:17,outline:"none"}}>
          <option value="">-- Sélectionner --</option>
          {(assureurs||[]).map(a=>(<option key={a.id} value={a.id}>{a.nom}</option>))}
        </select>
      </div>
      <div>
        <label style={{fontSize:14,fontWeight:700,color:C.muted,display:"block",marginBottom:5}}>FORMULE</label>
        <select value={pForm.formule_assurance_id} disabled={!pForm.assureur_id} onChange={e=>setPForm(p=>({...p,formule_assurance_id:e.target.value}))}
          style={{width:"100%",padding:"9px 12px",background:C.hover,border:`1px solid ${C.border}`,borderRadius:8,color:pForm.formule_assurance_id?C.text:C.muted,fontSize:17,outline:"none",opacity:pForm.assureur_id?1:.5}}>
          <option value="">{pForm.assureur_id ? "-- Sélectionner --" : "Choisir une compagnie d'abord"}</option>
          {(formules||[]).map(f=>(<option key={f.id} value={f.id}>{f.nom} — {f.taux_couverture}%{f.prime_mensuelle?` (${fmt(f.prime_mensuelle)} F/mois)`:""}</option>))}
        </select>
      </div>
      <Inp label="N° Police / Matricule" value={pForm.numero_police} onChange={e=>setPForm(p=>({...p,numero_police:e.target.value}))} placeholder="Ex: 2024-NSIA-000123"/>
    </Grid>
  );
}

// ══════════════════════════════════════════════════════════════════
//  CONTACTS D'URGENCE -- accessibles au bureau des entrees et au
//  medecin, jusqu'a 10 par patient. Visibles dans l'onglet Infos.
// ══════════════════════════════════════════════════════════════════
function PanelContactsUrgence({ patient }) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editant, setEditant] = useState(null);
  const [form, setForm] = useState({ prenom:"", nom:"", telephone:"", telephone_2:"", relation:"", est_principal:false });

  const { data: contacts, isLoading } = useQuery({
    queryKey:["cl-contacts-urgence", patient?.id],
    queryFn:()=>cAPI.contactsUrgence(patient.id).then(r=>r.data||[]),
    enabled: !!patient?.id,
  });

  const reset = () => { setForm({ prenom:"", nom:"", telephone:"", telephone_2:"", relation:"", est_principal:false }); setShowAdd(false); setEditant(null); };

  const ajouterMut = useMutation({
    mutationFn: () => cAPI.ajouterContactUrgence(patient.id, form),
    onSuccess: () => { toast.success("Contact ajouté !"); qc.invalidateQueries(["cl-contacts-urgence", patient.id]); reset(); },
    onError: e => toast.error(e?.response?.data?.message || "Erreur lors de l'ajout"),
  });
  const modifierMut = useMutation({
    mutationFn: () => cAPI.modifierContactUrgence(editant, form),
    onSuccess: () => { toast.success("Contact mis à jour"); qc.invalidateQueries(["cl-contacts-urgence", patient.id]); reset(); },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });
  const supprimerMut = useMutation({
    mutationFn: (id) => cAPI.supprimerContactUrgence(id),
    onSuccess: () => { toast.success("Contact retiré"); qc.invalidateQueries(["cl-contacts-urgence", patient.id]); },
    onError: () => toast.error("Erreur"),
  });

  const liste = contacts||[];
  const ouvrirEdition = (c) => { setForm({ prenom:c.prenom||"", nom:c.nom||"", telephone:c.telephone||"", telephone_2:c.telephone_2||"", relation:c.relation||"", est_principal:!!c.est_principal }); setEditant(c.id); setShowAdd(true); };

  return (
    <Panel title="🆘 Contacts d'urgence"
      actions={<Btn style={{padding:"6px 14px",fontSize:16}} disabled={liste.length>=10} onClick={()=>{ reset(); setShowAdd(true); }}>+ Ajouter {liste.length}/10</Btn>}>
      {isLoading ? <div style={{color:C.muted,textAlign:"center",padding:20}}>Chargement…</div>
        : liste.length===0
        ? <Empty icon="🆘" title="Aucun contact d'urgence" subtitle="Essentiel en cas d'urgence médicale — visible via le scan du QR code de la carte du patient." />
        : liste.map(c=>(
          <div key={c.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:C.hover,borderRadius:9,marginBottom:8,border:c.est_principal?`1px solid ${C.green}`:"none"}}>
            <div style={{flex:1}}>
              <div style={{fontSize:15,fontWeight:700,color:C.text}}>{c.prenom} {c.nom} {c.est_principal&&<span style={{color:C.green,fontSize:12}}>(Principal)</span>}</div>
              <div style={{fontSize:13,color:C.dim}}>{c.relation||"Contact"} · {c.telephone}{c.telephone_2?" / "+c.telephone_2:""}</div>
            </div>
            <button onClick={()=>ouvrirEdition(c)} style={{background:"transparent",border:"none",color:C.blue,cursor:"pointer",fontSize:15}}>✏️</button>
            <button onClick={()=>window.confirm("Retirer ce contact d'urgence ?")&&supprimerMut.mutate(c.id)} style={{background:"transparent",border:"none",color:C.red,cursor:"pointer",fontSize:15}}>✕</button>
          </div>
        ))
      }

      <Modal open={showAdd} onClose={reset} title={editant?"✏️ Modifier le contact":"🆘 Nouveau contact d'urgence"}>
        <Grid cols={2} gap={10}>
          <Inp label="Prénom *" required value={form.prenom} onChange={e=>setForm(f=>({...f,prenom:e.target.value}))} />
          <Inp label="Nom" value={form.nom} onChange={e=>setForm(f=>({...f,nom:e.target.value}))} />
        </Grid>
        <Inp label="Relation" value={form.relation} onChange={e=>setForm(f=>({...f,relation:e.target.value}))} placeholder="Ex: Époux/se, Fils, Fille, Ami…" />
        <Grid cols={2} gap={10}>
          <Inp label="Téléphone *" required value={form.telephone} onChange={e=>setForm(f=>({...f,telephone:e.target.value}))} placeholder="+225 07 00 00 00 00" />
          <Inp label="Téléphone secondaire" value={form.telephone_2} onChange={e=>setForm(f=>({...f,telephone_2:e.target.value}))} />
        </Grid>
        <label style={{display:"flex",alignItems:"center",gap:8,fontSize:14,color:C.muted,marginBottom:14}}>
          <input type="checkbox" checked={form.est_principal} onChange={e=>setForm(f=>({...f,est_principal:e.target.checked}))} /> Contact principal
        </label>
        <Btn style={{width:"100%"}} loading={ajouterMut.isPending||modifierMut.isPending} onClick={()=>{
          if(!form.prenom||!form.telephone){toast.error("Prénom et téléphone requis");return;}
          editant ? modifierMut.mutate() : ajouterMut.mutate();
        }}>{editant?"Enregistrer":"Ajouter"}</Btn>
      </Modal>
    </Panel>
  );
}

// ══════════════════════════════════════════════════════════════════
//  INFORMATIONS VITALES -- antecedents critiques et traitements
//  sensibles, distincts des antecedents generaux : visibles sur la
//  fiche d'urgence publique (scan QR), lisibles en quelques secondes.
// ══════════════════════════════════════════════════════════════════
function PanelInfosVitales({ patient }) {
  const qc = useQueryClient();
  const [edition, setEdition] = useState(false);
  const [form, setForm] = useState({ antecedents_critiques: patient?.antecedents_critiques||"", traitements_sensibles: patient?.traitements_sensibles||"" });
  // Affichage suivi localement, mis a jour directement a la reussite de
  // l'enregistrement -- invalider la liste des patients ne rafraichit
  // pas automatiquement l'objet "selected" deja capture par le parent.
  const [donnees, setDonnees] = useState({ antecedents_critiques: patient?.antecedents_critiques||"", traitements_sensibles: patient?.traitements_sensibles||"" });

  const enregistrerMut = useMutation({
    mutationFn: () => cAPI.updatePatient(patient.id, form),
    onSuccess: () => { toast.success("Informations vitales mises à jour"); setDonnees({...form}); qc.invalidateQueries(["cl-patients"]); setEdition(false); },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });

  const ouvrirEdition = () => {
    setForm({ antecedents_critiques: donnees.antecedents_critiques||"", traitements_sensibles: donnees.traitements_sensibles||"" });
    setEdition(true);
  };

  return (
    <Panel title="⚡ Informations vitales"
      actions={!edition && (
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>window.open(`https://manager.mediconnect4africa.cloud/card/scan/${patient?.code_secret}`,"_blank")}
            style={{background:"rgba(220,38,38,.1)",border:"1px solid rgba(220,38,38,.3)",borderRadius:7,padding:"4px 10px",color:"#DC2626",fontSize:13,cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>
            👁️ Aperçu fiche d'urgence
          </button>
          <button onClick={ouvrirEdition} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:7,padding:"4px 10px",color:C.muted,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>✏️ Modifier</button>
        </div>
      )}>
      <div style={{fontSize:12,color:C.dim,marginBottom:12}}>Visibles sur la fiche d'urgence publique (scan du QR code) — à remplir uniquement si critique pour les premiers secours.</div>
      {!edition ? (
        <>
          <div style={{marginBottom:10}}>
            <div style={{fontSize:12,color:C.dim,fontWeight:700,textTransform:"uppercase",marginBottom:3}}>Antécédents critiques</div>
            <div style={{fontSize:15,color:C.text}}>{donnees.antecedents_critiques||"—"}</div>
          </div>
          <div>
            <div style={{fontSize:12,color:C.dim,fontWeight:700,textTransform:"uppercase",marginBottom:3}}>Traitements sensibles en cours</div>
            <div style={{fontSize:15,color:C.text}}>{donnees.traitements_sensibles||"—"}</div>
          </div>
        </>
      ) : (
        <>
          <Inp label="Antécédents critiques" value={form.antecedents_critiques} onChange={e=>setForm(f=>({...f,antecedents_critiques:e.target.value}))} placeholder="Ex: Diabète type 1, Épilepsie, Cardiopathie…" />
          <Inp label="Traitements sensibles en cours" value={form.traitements_sensibles} onChange={e=>setForm(f=>({...f,traitements_sensibles:e.target.value}))} placeholder="Ex: Anticoagulant, Insuline…" />
          <div style={{display:"flex",gap:10,marginTop:10}}>
            <button onClick={()=>setEdition(false)} style={{flex:1,background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,padding:10,color:C.muted,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Annuler</button>
            <Btn style={{flex:2}} loading={enregistrerMut.isPending} onClick={()=>enregistrerMut.mutate()}>Enregistrer</Btn>
          </div>
        </>
      )}
    </Panel>
  );
}

function PageDossiers() {
  // Certains medecin_nom contiennent deja "Dr." (saisie historique
  // incoherente) -- on ne prefixe que si absent, pour eviter "Dr Dr. X".
  const nomMedecin = (nom) => nom ? (/^dr\.?\s/i.test(nom) ? nom : `Dr ${nom}`) : '';
  const { token, user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState("infos");
  const { data: facturesPatientData } = useQuery({
    queryKey: ["cl-factures-patient", selected?.id],
    queryFn: () => cAPI.facturesPatient(selected.id).then(r => r.data || []),
    enabled: !!selected,
  });
  const facturesPatient = facturesPatientData || [];
  const [showAdd, setShowAdd] = useState(false);
  const [showConsult, setShowConsult] = useState(false);
  const [newPatient, setNewPatient] = useState(null); // patient créé avec son code
  const [showOrd, setShowOrd] = useState(false);
  const [showEditPatient, setShowEditPatient] = useState(false);
  const [showRapportHosp, setShowRapportHosp] = useState(false);
  const [rapportHospForm, setRapportHospForm] = useState({
    medecin_traitant:'', numero_facture:'', date_entree:'', date_sortie:'',
    adherent:'', beneficiaire:'', societe_assurance:'',
    motif:'', examen_clinique:'', bilan_paraclinique:'', traitement:'', evolution:'',
  });
  const { data: medecinsListeRapport } = useQuery({
    queryKey: ["cl-medecins-rapport"],
    queryFn: () => cAPI.medecins().then(r => r.data||[]),
  });
  const [numeroEntreeRecherche, setNumeroEntreeRecherche] = useState('');

  // Recherche par numero d'entree (reference PSG-XXXXX de la Carte
  // patient) -- rassemble en un seul appel assurance/police/taux de
  // couverture/dates/derniere consultation liee, pour eviter la
  // saisie manuelle repetee de donnees deja connues du systeme.
  const rechercherParReferenceMut = useMutation({
    mutationFn: () => api.get(`/passages/reference/${encodeURIComponent(numeroEntreeRecherche.trim())}`),
    onSuccess: (r) => {
      const d = r.data.data;
      if (!d) { toast.error("Aucun passage trouvé pour ce numéro d'entrée"); return; }
      const c = d.consultation || {};
      setRapportHospForm(f => ({
        ...f,
        medecin_traitant: c.medecin_nom ? (/^dr\.?\s/i.test(c.medecin_nom) ? c.medecin_nom : `Dr ${c.medecin_nom}`) : f.medecin_traitant,
        date_entree: d.created_at ? d.created_at.slice(0,10) : f.date_entree,
        date_sortie: d.closed_at ? d.closed_at.slice(0,10) : f.date_sortie,
        adherent: `${d.prenom||''} ${d.nom||''}`.trim() || f.adherent,
        societe_assurance: d.assurance ? `${d.assurance}${d.numero_police?' — Police '+d.numero_police:''}${d.taux_couverture?' — '+d.taux_couverture+'% couverture':''}` : f.societe_assurance,
        motif: c.motif || f.motif,
        examen_clinique: c.examen_clinique || f.examen_clinique,
        traitement: c.traitement || f.traitement,
      }));
      toast.success("Informations pré-remplies depuis le dossier");
    },
    onError: () => toast.error("Numéro d'entrée introuvable"),
  });
  const [editPatientForm, setEditPatientForm] = useState({});
  const editPatientMut = useMutation({
    mutationFn: () => api.put(`/patients/${selected.id}`, editPatientForm),
    onSuccess: () => {
      toast.success("Patient mis à jour !");
      qc.invalidateQueries(["cl-patients"]);
      qc.invalidateQueries(["cl-patient-select", selected?.id]);
      setShowEditPatient(false);
    },
    onError: e => toast.error(e?.response?.data?.message || "Erreur lors de la mise à jour"),
  });
  const ouvrirEditionPatient = () => {
    setEditPatientForm({
      prenom: selected.prenom||"", nom: selected.nom||"", telephone: selected.telephone||"",
      email: selected.email||"", groupe_sanguin: selected.groupe_sanguin||"",
      allergies: selected.allergies||"", antecedents: selected.antecedents||"",
    });
    setShowEditPatient(true);
  };
  const [showEnvoiOrd, setShowEnvoiOrd] = useState(false);
  const [ordonnanceAEnvoyer, setOrdonnanceAEnvoyer] = useState(null);
  const [destinationChoisie, setDestinationChoisie] = useState("interne");
  const [pharmacieExterneChoisie, setPharmacieExterneChoisie] = useState("");
  const { data: pharmaciesExternes } = useQuery({ queryKey:["cl-pharmacies-externes"], queryFn:()=>api.get("/public/pharmacies").then(r=>r.data||[]), enabled: showEnvoiOrd });
  const envoyerOrdMut = useMutation({
    mutationFn: () => api.put(`/ordonnances/${ordonnanceAEnvoyer.id}/envoyer`, { destination: destinationChoisie, pharmacie_id: destinationChoisie==="externe" ? pharmacieExterneChoisie : undefined }),
    onSuccess: () => {
      toast.success("Ordonnance envoyée !");
      qc.invalidateQueries(["cl-ords", selected?.id]);
      setShowEnvoiOrd(false); setOrdonnanceAEnvoyer(null); setPharmacieExterneChoisie("");
    },
    onError: e => toast.error(e?.response?.data?.message || "Erreur lors de l'envoi"),
  });
  const partagerConsultMut = useMutation({
    mutationFn: ({id,partage}) => api.put(`/consultations/${id}/partager`, { partage }),
    onSuccess: () => { toast.success("Statut de partage mis à jour"); qc.invalidateQueries(["cl-consults", selected?.id]); },
    onError: e => toast.error(e?.response?.data?.message || "Erreur"),
  });
  const partagerOrdMut = useMutation({
    mutationFn: ({id,partage}) => api.put(`/ordonnances/${id}/partager`, { partage }),
    onSuccess: () => { toast.success("Statut de partage mis à jour"); qc.invalidateQueries(["cl-ords", selected?.id]); },
    onError: e => toast.error(e?.response?.data?.message || "Erreur"),
  });
  const partagerBulletinMut = useMutation({
    mutationFn: ({id,partage}) => api.put(`/bulletins/${id}/partager`, { partage }),
    onSuccess: () => { toast.success("Statut de partage mis à jour"); qc.invalidateQueries(["cl-examens", selected?.id]); },
    onError: e => toast.error(e?.response?.data?.message || "Erreur"),
  });
  const [showExamen, setShowExamen] = useState(false);
  const [codeRecherche, setCodeRecherche] = useState("");
  const [patientCible, setPatientCible] = useState(null); // patient trouve par code (peut differer de `selected`)
  const [groupeActif, setGroupeActif] = useState(null); // lot d'examens affiche dans le modal de detail
  const [rechercheEnCours, setRechercheEnCours] = useState(false);
  const [erreurRecherche, setErreurRecherche] = useState("");
  const [examenForm, setExamenForm] = useState({ categorie:"laboratoire", types:["NFS"], destinataire_id:"", notes:"" });
  const [fichierPrescription, setFichierPrescription] = useState(null);
  const [uploadPrescriptionEnCours, setUploadPrescriptionEnCours] = useState(false);
  const [envoiMultipleEnCours, setEnvoiMultipleEnCours] = useState(false);
  const [pForm, setPForm] = useState({ prenom:"", nom:"", telephone:"", date_naissance:"", groupe_sanguin:"", allergies:"", antecedents:"", email:"", assurance:"", numero_police:"", est_assure:false, assureur_id:"", formule_assurance_id:"" });
  const [cForm, setCForm] = useState({ diagnostic:"", traitement:"", notes:"", tension_arterielle:"", temperature:"", poids:"", taille:"" });
  const [oForm, setOForm] = useState({ medicaments:"", duree:"", posologie:"", notes_ord:"" });
  // Plusieurs medicaments par ordonnance, chacun avec sa propre
  // posologie/duree -- meme mecanisme que le formulaire d'ordonnance de
  // PageConsultation (le formulaire a un seul champ etait incomplet pour
  // une vraie prescription a plusieurs medicaments).
  const [lignesOrd, setLignesOrd] = useState([{nom:"",qte:"",unite:"",posologie:"",duree:""}]);
  const addLigneOrd = ()=>setLignesOrd(l=>[...l,{nom:"",qte:"",unite:"",posologie:"",duree:""}]);
  const delLigneOrd = (i)=>setLignesOrd(l=>l.filter((_,j)=>j!==i));
  const updLigneOrd = (i,k,v)=>setLignesOrd(l=>l.map((row,j)=>j===i?{...row,[k]:v}:row));
  // Consultation ciblee par l'ordonnance en cours de creation (null =
  // ordonnance generique, non liee a une consultation precise).
  const [consultationPourOrdonnance, setConsultationPourOrdonnance] = useState(null);
  const [showEditOrd, setShowEditOrd] = useState(false);
  const [ordonnanceEnEdition, setOrdonnanceEnEdition] = useState(null);
  const [editOrdForm, setEditOrdForm] = useState({ medicaments:"", posologie:"", duree:"", notes_ord:"" });
  const feOrd = k => e => setEditOrdForm(p=>({...p,[k]:e.target.value}));
  const ouvrirEditionOrd = (o) => {
    setOrdonnanceEnEdition(o);
    setEditOrdForm({ medicaments:o.medicaments||"", posologie:o.posologie||"", duree:o.duree||"", notes_ord:o.notes_ord||"" });
    setShowEditOrd(true);
  };
  const [showEditConsult, setShowEditConsult] = useState(false);
  const [consultationEnEdition, setConsultationEnEdition] = useState(null);
  // Tous les champs du vrai formulaire de consultation (memes champs qu'a
  // la creation) -- une modification ne doit jamais etre plus limitee que
  // la creation initiale, sinon des informations deja saisies seraient
  // impossibles a corriger.
  const EDIT_FORM_VIDE = {
    motif:"", hdm_antecedents:"", examen_clinique:"",
    tension_arterielle:"", temperature:"", pouls:"", poids:"", taille:"", pc:"", fr:"", tso2:"", pb:"", pcui:"",
    diagnostic:"", diagnostic_predefini:"", hypotheses_diagnostiques:"", code_cim10:"", pathologie:"", gravite:"", categorie_maladie:"",
    traitement:"", traitement_predefini:"",
    biologie_predefinis:"", biologie_texte:"", imagerie_texte:"", autres_examens:"",
    notes:"", note_finale:"", date_controle:"",
  };
  const [editForm, setEditForm] = useState(EDIT_FORM_VIDE);
  const fe = k => e => setEditForm(p=>({...p,[k]:e.target.value}));
  const [showDossierMedical, setShowDossierMedical] = useState(false);
  const [consultationEnLecture, setConsultationEnLecture] = useState(null);
  // Bascule entre l'affichage en cartes (existant, inchange) et le
  // tableau par date/rubrique. Les deux cohabitent : rien n'est retire
  // si le tableau ne convient pas a l'usage.
  const [vueHistorique, setVueHistorique] = useState("cartes");
  // Regroupement partage entre la lecture et l'edition, pour que les deux
  // vues restent visuellement coherentes entre elles.
  const RUBRIQUES_CONSULTATION = [
    { titre:"Motif & antécédents", champs:[["motif","Motif"],["hdm_antecedents","Antécédents"]] },
    { titre:"Constantes médicales", champs:[["tension_arterielle","Tension artérielle"],["temperature","Température (°C)"],["pouls","Pouls"],["poids","Poids (kg)"],["taille","Taille (cm)"],["pc","Périmètre crânien"],["fr","Fréquence respiratoire"],["tso2","SpO2"],["pb","Périmètre brachial"],["pcui","PC utile"]] },
    { titre:"Examen clinique", champs:[["examen_clinique","Examen clinique"]] },
    { titre:"Diagnostic", champs:[["diagnostic","Diagnostic"],["diagnostic_predefini","Diagnostic (CIM-10)"],["hypotheses_diagnostiques","Hypothèses diagnostiques"],["code_cim10","Code CIM-10"],["pathologie","Pathologie"],["gravite","Gravité"],["categorie_maladie","Catégorie de maladie"]] },
    { titre:"Traitement", champs:[["traitement","Traitement"],["traitement_predefini","Traitement type"]] },
    { titre:"Examens complémentaires", champs:[["biologie_predefinis","Biologie (examens)"],["biologie_texte","Biologie (notes)"],["imagerie_texte","Imagerie"],["autres_examens","Autres examens"]] },
    { titre:"Suivi", champs:[["notes","Notes / évolution"],["note_finale","Note finale"],["date_controle","Date de contrôle"]] },
  ];
  const [actesSel, setActesSel] = useState([]);
  const [searchActe, setSearchActe] = useState("");
  const [searchCim, setSearchCim] = useState("");
  const [codeCim, setCodeCim] = useState("");

  const { data: catalogue } = useQuery({ queryKey:["cl-actes"], queryFn:async()=>{
    const r = await fetch(`https://mediconnect-backend-v2.vercel.app/api/actes`,{headers:{Authorization:`Bearer ${token}`}});
    const d = await r.json(); return d.data||[];
  }});
  const { data: affections } = useQuery({ queryKey:["cl-cim10"], queryFn:async()=>{
    const r = await fetch(`https://mediconnect-backend-v2.vercel.app/api/affections`);
    const d = await r.json(); return d.data||[];
  }});
  const { data: laboratoiresDisponibles } = useQuery({ queryKey:["cl-laboratoires"], queryFn:()=>cAPI.laboratoiresListe().then(r=>r.data||[]) });
  const { data: imageriesDisponibles } = useQuery({ queryKey:["cl-imageries"], queryFn:()=>cAPI.imageriesListe().then(r=>r.data||[]) });
  const { data: pec } = useQuery({ queryKey:["cl-pec",selected?.id], queryFn:async()=>{
    if(!selected) return {data:[],totaux:{total:0,part_assurance:0,part_patient:0}};
    const r = await fetch(`https://mediconnect-backend-v2.vercel.app/api/prise-en-charge/${selected.id}`,{headers:{Authorization:`Bearer ${token}`}});
    return await r.json();
  }, enabled:!!selected });

  const toggleActe = (a) => setActesSel(prev => {
    const ex = prev.find(x=>x.code===a.code);
    if(ex) return prev.filter(x=>x.code!==a.code);
    return [...prev,{acte_id:a.id,code:a.code,libelle:a.libelle,prix_unitaire:Number(a.tarif_base),taux_assurance:a.taux_assurance,quantite:1}];
  });
  const totalActes = actesSel.reduce((s,a)=>s+a.prix_unitaire*a.quantite,0);
  const tauxDefaut = pForm.est_assure?70:0;
  const partAss = Math.round(totalActes*tauxDefaut/100);
  const fmtF = n => Number(n||0).toLocaleString("fr-CI");

  const { data, isLoading } = useQuery({ queryKey:["cl-patients"], queryFn:()=>cAPI.patients().then(r=>r.data.data||[]) });

  // Preselection depuis Planning & RDV : le bouton "Carte patient" du
  // bureau des entrees redirige ici avec ?patient_id=XXX -- des que la
  // liste est chargee, on selectionne automatiquement ce patient.
  React.useEffect(() => {
    const pid = searchParams.get('patient_id');
    if (pid && data && !selected) {
      const p = data.find(x => x.id === pid);
      if (p) setSelected(p);
    }
  }, [searchParams, data, selected]);
  const { data: consults } = useQuery({ queryKey:["cl-consults",selected?.id], queryFn:async()=>{
    if(!selected) return [];
    const r = await fetch(`https://mediconnect-backend-v2.vercel.app/api/consultations?patient_id=${selected.id}`,{headers:{Authorization:`Bearer ${token}`}});
    const d = await r.json(); return d.data||[];
  }, enabled:!!selected });
  const { data: ords } = useQuery({ queryKey:["cl-ords",selected?.id], queryFn:async()=>{
    if(!selected) return [];
    const r = await fetch(`https://mediconnect-backend-v2.vercel.app/api/ordonnances?patient_id=${selected.id}`,{headers:{Authorization:`Bearer ${token}`}});
    const d = await r.json();
    return d.data||[];
  }, enabled:!!selected });
  const { data: stockMedicaments } = useQuery({ queryKey:["cl-stock-ordonnance"], queryFn:()=>cAPI.stock().then(r=>r.data||[]) });
  const { data: examens } = useQuery({ queryKey:["cl-examens",selected?.id], queryFn:async()=>{
    if(!selected) return [];
    const r = await fetch(`https://mediconnect-backend-v2.vercel.app/api/examens?patient_id=${selected.id}`,{headers:{Authorization:`Bearer ${token}`}});
    const d = await r.json(); return d.data||[];
  }, enabled:!!selected });
  // Regroupe les examens partageant un meme groupe_id (envoyes ensemble)
  // en une seule entree -- affichee comme une carte au lieu d'une ligne
  // par examen, pour ne pas saturer l'espace quand plusieurs types sont
  // demandes en un seul lot (ex: NFS + Goutte epaisse).
  const groupesExamens = (() => {
    const groupes = new Map();
    const isoles = [];
    (examens||[]).forEach(e => {
      if (e.groupe_id) {
        if (!groupes.has(e.groupe_id)) groupes.set(e.groupe_id, []);
        groupes.get(e.groupe_id).push(e);
      } else {
        isoles.push(e);
      }
    });
    const groupesArr = Array.from(groupes.entries()).map(([id, items]) => ({
      id: `groupe-${id}`, groupe_id: id, items,
      created_at: items[0]?.created_at,
      type_source: items[0]?.type_source,
    }));
    return [...isoles, ...groupesArr].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  })();

  const patients = (data||[]).filter(p => {
    const q = search.toLowerCase();
    return !q || `${p.prenom} ${p.nom} ${p.telephone||""}`.toLowerCase().includes(q);
  });

  const addPat = useMutation({ mutationFn:d=>cAPI.addPatient(d), onSuccess:async(data)=>{
    const np = data?.data?.data||data?.data||data;
    if(actesSel.length>0&&np?.id){
      await fetch(`https://mediconnect-backend-v2.vercel.app/api/prise-en-charge`,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},
        body:JSON.stringify({patient_id:np.id,actes:actesSel,est_assure:pForm.est_assure,taux_couverture:pForm.est_assure?70:0})}).catch(()=>{});
    }
    toast.success("✅ Patient créé !"); qc.invalidateQueries(["cl-patients"]); setShowAdd(false); setNewPatient(np); setActesSel([]);
  }, onError:()=>toast.error("Erreur") });
  const addCons = useMutation({ mutationFn:d=>cAPI.addConsult({...d,code_cim10:codeCim||null}), onSuccess:()=>{ toast.success("Consultation enregistrée !"); qc.invalidateQueries(["cl-consults",selected?.id]); setShowConsult(false); }, onError:()=>toast.error("Erreur") });
  const addOrd = useMutation({ mutationFn:d=>cAPI.addOrdonnance(d), onSuccess:()=>{ toast.success("Ordonnance créée !"); qc.invalidateQueries(["cl-ords",selected?.id]); setShowOrd(false); setConsultationPourOrdonnance(null); }, onError:()=>toast.error("Erreur") });
  const editOrdMut = useMutation({
    mutationFn: d => cAPI.updateOrdonnance(ordonnanceEnEdition.id, d),
    onSuccess: () => { toast.success("Ordonnance modifiée !"); qc.invalidateQueries(["cl-ords",selected?.id]); setShowEditOrd(false); setOrdonnanceEnEdition(null); },
    onError: e => toast.error(e?.response?.data?.message || "Erreur lors de la modification"),
  });
  const updConsultMut = useMutation({
    mutationFn: d => api.put(`/consultations/${consultationEnEdition.id}`, d),
    onSuccess: (r) => {
      const nb = (r?.champs_modifies||[]).length;
      toast.success(nb>0 ? `Consultation mise à jour (${nb} champ${nb>1?'s':''})` : "Aucun changement détecté");
      qc.invalidateQueries(["cl-consults",selected?.id]);
      setShowEditConsult(false); setConsultationEnEdition(null);
    },
    onError: e => toast.error(e?.response?.data?.message || "Erreur lors de la mise à jour"),
  });

  const demanderExamen = useMutation({
    mutationFn: d => cAPI.demanderExamen(d),
  });

  // Recherche par code dossier EXACT (ex: MC-KT-5069). Independante de
  // `selected` : la clinique peut demander un examen pour un patient sans
  // avoir a naviguer jusqu'a sa fiche dans la liste.
  const rechercherParCode = async () => {
    const code = codeRecherche.trim();
    if (!code) { setErreurRecherche("Entrez un code dossier"); return; }
    setRechercheEnCours(true); setErreurRecherche(""); setPatientCible(null);
    try {
      const r = await cAPI.patientParCode(code);
      const p = r?.data;
      if (p?.id) { setPatientCible(p); }
      else { setErreurRecherche("Aucun patient avec ce code"); }
    } catch(e) {
      setErreurRecherche(e?.response?.data?.message || "Aucun patient avec ce code");
    }
    setRechercheEnCours(false);
  };

  const TYPES_EXAMEN = {
    laboratoire: ['NFS','Glycémie','Bilan lipidique','Bilan hépatique','Bilan rénal','Sérologie','Hémoculture','Ionogramme','HbA1c','Urine ECBU','Frottis','PCR','Groupe sanguin','Autre'],
    imagerie: ['Radiologie','IRM','Scanner','Échographie','Mammographie','Scintigraphie'],
  };
  const toggleTypeExamen = (t) => setExamenForm(p => ({
    ...p,
    types: p.types.includes(t) ? p.types.filter(x=>x!==t) : [...p.types, t],
  }));

  // Upload direct vers Cloudinary (preset non signe, cote client), meme
  // mecanisme que labo/imagerie/dossier patient. Sert ici a joindre la
  // prescription du medecin (colonnes fichier_prescription_*, distinctes
  // du resultat que le labo uploade plus tard).
  const uploadPrescriptionVersCloudinary = async (fichier) => {
    const formats = ['application/pdf','image/jpeg','image/jpg','image/png'];
    if (!formats.includes(fichier.type)) throw new Error('Format non autorise. Utilisez PDF, JPG ou PNG.');
    if (fichier.size > 10*1024*1024) throw new Error('Fichier trop volumineux (10 Mo maximum).');
    const form = new FormData();
    form.append('file', fichier);
    form.append('upload_preset', 'mediconnect_upload');
    const resourceType = fichier.type === 'application/pdf' ? 'raw' : 'image';
    const r = await fetch(`https://api.cloudinary.com/v1_1/xau4buvq/${resourceType}/upload`, { method:'POST', body:form });
    const d = await r.json();
    if (!r.ok || !d.secure_url) throw new Error(d?.error?.message || "Echec de l'envoi du fichier");
    return d.secure_url;
  };

  const imprimerFactureEmise = async (f) => {
    const win = window.open('', '_blank');
    win.document.write('<p style="font-family:Arial,sans-serif;padding:30px;">Chargement de la facture…</p>');
    let lignes = [];
    let cl = null;
    try { const r = await api.get(`/factures/${f.id}/detail`); lignes = r.data?.lignes || []; } catch(e) { /* impression sans detail si echec */ }
    try { const rp = await api.get('/clinique/profil'); cl = rp.data || null; } catch(e) { /* impression sans en-tete si echec */ }
    const lignesHtml = genererLignesFactureHtml(lignes, cl?.couleur_primaire || "#0A8F58");
    win.document.open();
    win.document.write(`
      <html><head><title>Facture ${f.reference||''}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:30px;color:#1a2e25;max-width:600px;margin:0 auto;}
        .header{display:flex;align-items:center;gap:14px;border-bottom:2px solid ${cl?.couleur_primaire||'#0A8F58'};padding-bottom:12px;margin-bottom:18px;}
        .logo{height:58px;object-fit:contain;}
        h2{color:${cl?.couleur_primaire||'#0A8F58'};font-size:16px;margin:0 0 16px;text-align:center;text-transform:uppercase;letter-spacing:1px;}
        .champ{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e5e7eb;font-size:14px;}
        .label{color:#8BA0B5;}
        .valeur{font-weight:700;}
        table{width:100%;border-collapse:collapse;margin-top:20px;font-size:13px;}
        th{text-align:left;color:#8BA0B5;font-size:11px;text-transform:uppercase;padding-bottom:6px;border-bottom:2px solid #1a2e25;}
        .total{font-size:20px;color:${cl?.couleur_primaire||'#0A8F58'};font-weight:900;text-align:right;margin-top:10px;}
        .footer{margin-top:30px;border-top:1px solid #e5e7eb;padding-top:14px;font-size:10px;color:#8BA0B5;display:flex;justify-content:space-between;}
        @media print{button{display:none;}}
      </style></head><body>
      <div class="header">
        ${cl?.logo?`<img src="${cl.logo}" class="logo"/>`:''}
        <div>
          <div style="font-size:16px;font-weight:700;color:${cl?.couleur_primaire||'#065F3C'};">${cl?.nom||'MediConnect Africa'}</div>
          <div style="font-size:11px;color:#5A7A94;">${cl?.adresse_complete||cl?.adresse||''} ${cl?.ville?'· '+cl.ville:''}</div>
          <div style="font-size:11px;color:#5A7A94;">${cl?.telephone||''} ${cl?.email?'· '+cl.email:''}</div>
        </div>
      </div>
      <h2>📄 Facture</h2>
      <div class="champ"><span class="label">Référence</span><span class="valeur">${f.reference||'—'}</span></div>
      <div class="champ"><span class="label">Patient</span><span class="valeur">${f.patient_nom||'—'}</span></div>
      <div class="champ"><span class="label">Date</span><span class="valeur">${new Date(f.created_at).toLocaleDateString('fr-CI',{day:'numeric',month:'long',year:'numeric'})}</span></div>
      <div class="champ"><span class="label">Statut</span><span class="valeur">${f.statut||'—'}</span></div>
      <table>
        <thead><tr><th>Acte</th><th style="text-align:center;">Qté</th><th style="text-align:right;">Prix unit.</th><th style="text-align:right;">À charge patient</th></tr></thead>
        <tbody>${lignesHtml}</tbody>
      </table>
      <div class="total">Total : ${Number(f.montant_total||0).toLocaleString('fr-CI')} F</div>
      <div class="footer">
        <div>${cl?.nom||'MediConnect Africa'}${cl?.site_web?' · '+cl.site_web:''}</div>
        <div style="text-align:right;">Cachet & signature<br/><br/><br/>_________________</div>
      </div>
      </body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(()=>win.print(), 300);
  };

  const imprimerFacture = async (arg) => {
    // onClick transmet un SyntheticEvent en premier argument : on ne retient
    // que les identifiants reels, sinon on prend la consultation la plus
    // recente du patient selectionne.
    const cid = (typeof arg === 'string' && arg) ? arg : (consults?.[0]?.id || null);
    const H = { Authorization:`Bearer ${token}` };

    let ref = null, lignes = [], t = null, proforma = false;

    // Source de verite : la facture emise et persistee. Montants figes au
    // moment de l'emission, bornes a UNE consultation.
    if (cid) {
      try {
        const r = await fetch(`https://mediconnect-backend-v2.vercel.app/api/consultations/${cid}/facture`,{headers:H});
        const d = await r.json();
        if (d?.success && d?.data) {
          ref = d.data.reference;
          t = {
            total: Number(d.data.montant_total||0),
            part_assurance: Number(d.data.montant_assur||0),
            part_patient: Number(d.data.ticket_moder||0),
          };
          lignes = (d.lignes||[]).map(l=>({
            code: l.code||'—',
            libelle: l.libelle||'—',
            quantite: Number(l.quantite||1),
            pu: Number(l.tarif||0),
            montant: Number(l.montant|| Number(l.tarif||0)*Number(l.quantite||1) ||0),
            assur: Number(l.montant_assur||0),
            patient: Number(l.ticket_moder||0),
          }));
        }
      } catch(_) { /* repli ci-dessous */ }
    }

    // Repli proforma : consultations anterieures a la facturation
    // automatique, ou aucune facture emise. Le document est explicitement
    // marque PROFORMA pour qu'il ne soit pas confondu avec une facture.
    if (!ref || !lignes.length) {
      const src = pec?.data||[];
      if (!src.length) { toast.error("Aucun acte à facturer"); return; }
      const tp = pec?.totaux||{total:0,part_assurance:0,part_patient:0};
      proforma = true;
      ref = "PROFORMA-"+new Date().getFullYear()+"-"+String(Date.now()).slice(-6);
      t = {
        total: Number(tp.total||0),
        part_assurance: Number(tp.part_assurance||0),
        part_patient: Number(tp.part_patient||0),
      };
      lignes = src.map(l=>({
        code: l.code_acte||'—',
        libelle: l.libelle_acte||'—',
        quantite: Number(l.quantite||1),
        pu: Number(l.prix_unitaire||0),
        montant: Number(l.prix_unitaire||0)*Number(l.quantite||1),
        assur: Number(l.part_assurance||0),
        patient: Number(l.part_patient||0),
      }));
    }

    const clR = await fetch(`https://mediconnect-backend-v2.vercel.app/api/clinique/profil`,{headers:H}).then(r=>r.json()).catch(()=>({data:null}));
    const cl = clR.data;
    const n = v => Number(v||0).toLocaleString('fr-CI');

    // La categorie vit sur actes_medicaux, pas sur prise_en_charge_actes
    // (qui ne garde qu'un instantane code/libelle/prix) -- on la
    // retrouve par correspondance de code, pour regrouper l'affichage.
    const catalogueR = await fetch(`https://mediconnect-backend-v2.vercel.app/api/actes`,{headers:H}).then(r=>r.json()).catch(()=>({data:[]}));
    const codeVersCategorie = new Map((catalogueR?.data||[]).map(a=>[a.code, a.categorie||'Autres actes']));
    lignes.forEach(l=>{ l.categorie = codeVersCategorie.get(l.code) || 'Autres actes'; });

    const groupes = new Map();
    for (const l of lignes) {
      if (!groupes.has(l.categorie)) groupes.set(l.categorie, { lignes:[], montant:0, assur:0, patient:0 });
      const g = groupes.get(l.categorie);
      g.lignes.push(l); g.montant += l.montant; g.assur += l.assur; g.patient += l.patient;
    }
    const tauxCouverture = t.total > 0 ? Math.round(t.part_assurance / t.total * 100) : 0;

    const win = window.open('','_blank');
    win.document.write(`
      <html><head><title>${proforma?'Proforma':'Facture'} ${ref}</title><style>
        body{font-family:Arial,sans-serif;padding:30px;color:#1a2e25;max-width:700px;margin:0 auto;}
        .header{display:flex;align-items:center;gap:16px;padding-bottom:12px;border-bottom:3px solid ${cl?.couleur_primaire||'#0A8F58'};margin-bottom:18px;}
        .logo{height:58px;object-fit:contain;}
        .cn{font-size:18px;font-weight:700;color:${cl?.couleur_primaire||'#065F3C'};}
        .ci{font-size:11px;color:#5A7A94;}
        h2{color:${cl?.couleur_primaire||'#0A8F58'};font-size:16px;margin:0 0 14px;text-align:center;text-transform:uppercase;letter-spacing:1px;}
        .warn{background:#FEF3C7;border:1px solid #F59E0B;color:#92400E;border-radius:8px;padding:8px 12px;font-size:11px;text-align:center;margin-bottom:14px;}
        .meta{display:flex;justify-content:space-between;gap:16px;margin-bottom:16px;}
        .box{background:#E8F8F1;border-radius:8px;padding:12px;flex:1;}
        .lbl{font-size:10px;color:#8BA0B5;font-weight:700;text-transform:uppercase;letter-spacing:.5px;}
        table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:12px;}
        th{background:${cl?.couleur_primaire||'#065F3C'};color:#fff;padding:8px;text-align:left;font-size:11px;text-transform:uppercase;}
        td{padding:8px;border-bottom:1px solid #e5e7eb;}
        .r{text-align:right;}
        .tot{background:#f8f9fa;font-weight:700;}
        .final{background:${cl?.couleur_primaire||'#0A8F58'};color:#fff;font-size:15px;font-weight:800;}
        .footer{margin-top:30px;border-top:1px solid #e5e7eb;padding-top:14px;font-size:10px;color:#8BA0B5;display:flex;justify-content:space-between;}
        @media print{button{display:none;}}
      </style></head><body>
      <div class="header">
        ${cl?.logo?`<img src="${cl.logo}" class="logo"/>`:''}
        <div>
          <div class="cn">${cl?.nom||'MediConnect Africa'}</div>
          <div class="ci">${cl?.adresse_complete||cl?.adresse||''} ${cl?.ville?'· '+cl.ville:''}</div>
          <div class="ci">${cl?.telephone||''} ${cl?.email?'· '+cl.email:''}</div>
        </div>
      </div>
      <h2>${proforma?'Devis proforma':'Facture de soins'} ${ref}</h2>
      ${proforma?`<div class="warn">Document non contractuel : aucune facture n'a encore été émise pour cette consultation. Les montants peuvent évoluer.</div>`:''}
      <div class="meta">
        <div class="box">
          <div class="lbl">Patient</div>
          <div style="font-size:14px;font-weight:700;">${selected?.prenom||''} ${selected?.nom||''}</div>
          <div class="ci">${selected?.telephone||''}</div>
          ${selected?.code_secret?`<div class="ci">Dossier : ${selected.code_secret}</div>`:''}
        </div>
        <div class="box">
          <div class="lbl">Couverture</div>
          <div style="font-size:14px;font-weight:700;">${selected?.assurance||'Patient non assuré'}</div>
          ${selected?.numero_police?`<div class="ci">Police : ${selected.numero_police}</div>`:''}
          ${t.part_assurance>0?`<div class="ci">Taux de couverture appliqué : ${tauxCouverture}%</div>`:''}
          <div class="ci">Date : ${new Date().toLocaleDateString('fr-CI')}</div>
        </div>
      </div>
      <table>
        <tr><th>Code</th><th>Acte / Prestation</th><th class="r">Qté</th><th class="r">P.U.</th><th class="r">Total</th><th class="r">Assurance</th><th class="r">Patient</th></tr>
        ${Array.from(groupes.entries()).map(([categorie,g])=>`
          <tr><td colspan="7" style="background:#E8F8F1;font-weight:700;color:#065F3C;text-transform:uppercase;font-size:11px;letter-spacing:.5px;">${categorie}</td></tr>
          ${g.lignes.map(l=>`<tr>
            <td><strong>${l.code}</strong></td>
            <td>${l.libelle}</td>
            <td class="r">${l.quantite}</td>
            <td class="r">${n(l.pu)}</td>
            <td class="r">${n(l.montant)}</td>
            <td class="r">${n(l.assur)}</td>
            <td class="r"><strong>${n(l.patient)}</strong></td>
          </tr>`).join('')}
          <tr style="background:#f8f9fa;"><td colspan="4" style="font-size:11px;color:#8BA0B5;">Sous-total ${categorie}</td>
            <td class="r" style="font-size:11px;color:#8BA0B5;">${n(g.montant)}</td>
            <td class="r" style="font-size:11px;color:#8BA0B5;">${n(g.assur)}</td>
            <td class="r" style="font-size:11px;color:#8BA0B5;">${n(g.patient)}</td></tr>
        `).join('')}
        <tr class="tot"><td colspan="4">TOTAL GÉNÉRAL</td>
          <td class="r">${n(t.total)}</td>
          <td class="r">${n(t.part_assurance)}</td>
          <td class="r">${n(t.part_patient)}</td></tr>
        <tr class="final"><td colspan="6">NET À PAYER PAR LE PATIENT</td><td class="r">${n(t.part_patient)} FCFA</td></tr>
      </table>
      <div class="footer">
        <div>MediConnect Africa · CSN<br/>${cl?.site_web||'manager.mediconnect4africa.cloud'}</div>
        <div style="text-align:right;">Cachet & signature<br/><br/><br/>_________________</div>
      </div>
      <div style="text-align:center;margin-top:18px;">
        <button onclick="window.print()" style="padding:10px 24px;background:#0A8F58;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer;">🖨️ Imprimer</button>
      </div>
      </body></html>`);
    win.document.close();
  };

  // Rapport medical de synthese : tout l'historique du patient, pas
  // seulement cette clinique -- l'identite patient est portable dans le
  // reseau, un rapport doit refleter les soins recus partout, utile pour
  // un transfert vers un autre medecin/etablissement.
  const imprimerRapportMedical = async () => {
    if (!selected) return;
    const H = { Authorization:`Bearer ${token}` };
    const clR = await fetch(`https://mediconnect-backend-v2.vercel.app/api/clinique/profil`,{headers:H}).then(r=>r.json()).catch(()=>({data:null}));
    const cl = clR.data;
    const liste = consults||[];
    const ordonnancesRecentes = (ords||[]).slice(0,5);

    const age = selected?.date_naissance
      ? Math.floor((Date.now() - new Date(selected.date_naissance).getTime()) / (365.25*24*3600*1000))
      : null;

    const win = window.open('','_blank');
    win.document.write(`
      <html><head><title>Rapport médical - ${selected?.prenom||''} ${selected?.nom||''}</title><style>
        body{font-family:Arial,sans-serif;padding:30px;color:#1a2e25;max-width:760px;margin:0 auto;}
        .header{display:flex;align-items:center;gap:16px;padding-bottom:12px;border-bottom:3px solid ${cl?.couleur_primaire||'#0A8F58'};margin-bottom:18px;}
        .logo{height:58px;object-fit:contain;}
        .cn{font-size:18px;font-weight:700;color:${cl?.couleur_primaire||'#065F3C'};}
        .ci{font-size:11px;color:#5A7A94;}
        h2{color:${cl?.couleur_primaire||'#0A8F58'};font-size:16px;margin:0 0 14px;text-align:center;text-transform:uppercase;letter-spacing:1px;}
        h3{color:${cl?.couleur_primaire||'#065F3C'};font-size:13px;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin:22px 0 10px;}
        .meta{display:flex;justify-content:space-between;gap:16px;margin-bottom:16px;}
        .box{background:#E8F8F1;border-radius:8px;padding:12px;flex:1;}
        .lbl{font-size:10px;color:#8BA0B5;font-weight:700;text-transform:uppercase;letter-spacing:.5px;}
        .warn{background:#FEF2F2;border:1px solid #FCA5A5;color:#991B1B;border-radius:8px;padding:10px 14px;font-size:13px;margin-bottom:14px;}
        .consult{border:1px solid #e5e7eb;border-radius:8px;padding:12px 14px;margin-bottom:10px;}
        .consult-date{font-size:12px;color:#8BA0B5;font-weight:700;}
        .consult-diag{font-size:14px;font-weight:700;color:#1a2e25;margin:4px 0;}
        .vitals{display:flex;gap:14px;font-size:11px;color:#5A7A94;margin-top:6px;}
        .footer{margin-top:30px;border-top:1px solid #e5e7eb;padding-top:14px;font-size:10px;color:#8BA0B5;display:flex;justify-content:space-between;}
        @media print{button{display:none;}}
      </style></head><body>
      <div class="header">
        ${cl?.logo?`<img src="${cl.logo}" class="logo"/>`:''}
        <div>
          <div class="cn">${cl?.nom||'MediConnect Africa'}</div>
          <div class="ci">${cl?.adresse_complete||cl?.adresse||''} ${cl?.ville?'· '+cl.ville:''}</div>
          <div class="ci">${cl?.telephone||''} ${cl?.email?'· '+cl.email:''}</div>
        </div>
      </div>
      <h2>Rapport médical de synthèse</h2>

      <div class="meta">
        <div class="box">
          <div class="lbl">Patient</div>
          <div style="font-size:14px;font-weight:700;">${selected?.prenom||''} ${selected?.nom||''}</div>
          <div class="ci">${age!=null?age+' ans · ':''}${selected?.groupe_sanguin||'Groupe sanguin inconnu'}</div>
          <div class="ci">${selected?.telephone||''}</div>
          ${selected?.code_secret?`<div class="ci">Dossier : ${selected.code_secret}</div>`:''}
        </div>
        <div class="box">
          <div class="lbl">Rapport généré le</div>
          <div style="font-size:14px;font-weight:700;">${new Date().toLocaleDateString('fr-CI',{day:'numeric',month:'long',year:'numeric'})}</div>
          <div class="ci">${liste.length} consultation${liste.length>1?'s':''} au dossier</div>
        </div>
      </div>

      ${(selected?.allergies||selected?.antecedents)?`
        <div class="warn">
          ${selected?.allergies?`<div>⚠️ <strong>Allergies :</strong> ${selected.allergies}</div>`:''}
          ${selected?.antecedents?`<div style="margin-top:4px;">📋 <strong>Antécédents :</strong> ${selected.antecedents}</div>`:''}
        </div>
      `:''}

      ${ordonnancesRecentes.length>0?`
        <h3>Traitements récents</h3>
        ${ordonnancesRecentes.map(o=>`
          <div class="consult">
            <div class="consult-date">${new Date(o.created_at).toLocaleDateString('fr-CI')}${o.medecin_nom?' · '+nomMedecin(o.medecin_nom):''}</div>
            <div>${(o.medicaments||'').split('\n').filter(Boolean).map(m=>`<div>• ${m}</div>`).join('')}</div>
          </div>
        `).join('')}
      `:''}

      <h3>Historique des consultations</h3>
      ${liste.length===0
        ? '<p style="color:#8BA0B5;font-size:13px;">Aucune consultation enregistrée.</p>'
        : liste.map(c=>`
          <div class="consult">
            <div class="consult-date">${new Date(c.created_at).toLocaleDateString('fr-CI',{day:'numeric',month:'long',year:'numeric'})}${c.medecin_nom?' · '+nomMedecin(c.medecin_nom):''}</div>
            <div class="consult-diag">${c.diagnostic||'—'}</div>
            ${c.traitement?`<div style="font-size:13px;">Traitement : ${c.traitement}</div>`:''}
            ${c.notes?`<div style="font-size:12px;color:#5A7A94;margin-top:4px;">${c.notes}</div>`:''}
            ${(c.tension_arterielle||c.temperature||c.poids||c.taille)?`
              <div class="vitals">
                ${c.tension_arterielle?`<span>TA: ${c.tension_arterielle}</span>`:''}
                ${c.temperature?`<span>T°: ${c.temperature}°C</span>`:''}
                ${c.poids?`<span>Poids: ${c.poids}kg</span>`:''}
                ${c.taille?`<span>Taille: ${c.taille}cm</span>`:''}
              </div>
            `:''}
          </div>
        `).join('')
      }

      <div class="footer">
        <div>MediConnect Africa · CSN<br/>${cl?.site_web||'manager.mediconnect4africa.cloud'}</div>
        <div style="text-align:right;">Cachet & signature<br/><br/><br/>_________________</div>
      </div>
      <div style="text-align:center;margin-top:18px;">
        <button onclick="window.print()" style="padding:10px 24px;background:#0A8F58;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer;">🖨️ Imprimer</button>
      </div>
      </body></html>`);
    win.document.close();
  };

  // Rapport DATE d'UNE consultation precise -- distinct de la synthese
  // complete : chaque consultation realisee genere son propre rapport,
  // remis au patient a la fin de sa visite.
  // Rapport medical d'hospitalisation, au format exact demande par les
  // compagnies d'assurance (modele physique fourni par une clinique
  // partenaire) -- redige pour chaque patient, hospitalise ou non.
  const imprimerRapportHospitalisation = () => {
    const f = rapportHospForm;
    const w = window.open('', '_blank');
    w.document.write(`
      <html><head><title>Rapport médical hospitalisation - ${selected?.prenom||''} ${selected?.nom||''}</title><style>
        body{font-family:Arial,sans-serif;padding:30px;color:#1a2e25;max-width:760px;margin:0 auto;font-size:13px;}
        .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:12px;border-bottom:2px solid #16211C;margin-bottom:16px;}
        .cn{font-size:16px;font-weight:800;}
        .ci{font-size:11px;color:#5A7A94;}
        .meta-box{border:1px solid #16211C;border-radius:6px;padding:10px 14px;font-size:12px;line-height:1.9;}
        h2{text-align:center;border:1.5px solid #16211C;border-radius:6px;padding:10px;font-size:15px;text-transform:uppercase;letter-spacing:1px;margin:18px 0;}
        h3{font-size:12px;text-transform:uppercase;text-decoration:underline;font-weight:700;margin:20px 0 8px;}
        .champ{margin-bottom:6px;}
        .lbl{font-weight:700;}
        .zone{min-height:50px;border-bottom:1px solid #e5e7eb;padding-bottom:8px;white-space:pre-wrap;}
        .footer{margin-top:36px;border-top:1px solid #e5e7eb;padding-top:10px;font-size:9px;color:#8BA0B5;}
        @media print{button{display:none;}}
      </style></head><body>
      <div class="header">
        <div>
          <div class="cn">${cl?.nom||'MediConnect Africa'}</div>
          <div class="ci">${cl?.adresse_complete||cl?.adresse||''} ${cl?.ville?'· '+cl.ville:''}</div>
          <div class="ci">Tél : ${cl?.telephone||''}</div>
        </div>
        <div class="meta-box">
          <div><span class="lbl">Médecin traitant :</span> ${f.medecin_traitant||'—'}</div>
          <div><span class="lbl">Numéro de facture :</span> ${f.numero_facture||'—'}</div>
          <div><span class="lbl">Date d'entrée :</span> ${f.date_entree||'—'}</div>
          <div><span class="lbl">Date de sortie :</span> ${f.date_sortie||'—'}</div>
        </div>
      </div>

      <h2>Rapport médical hospitalisation</h2>

      <h3>Identité du malade</h3>
      <div class="champ"><span class="lbl">Adhérent :</span> ${f.adherent||(selected?.prenom+' '+selected?.nom)||'—'}</div>
      <div class="champ"><span class="lbl">Bénéficiaire :</span> ${f.beneficiaire||'—'}</div>
      <div class="champ"><span class="lbl">Société Assurance :</span> ${f.societe_assurance||selected?.assurance||'—'}</div>

      <h3>Motif</h3>
      <div class="zone">${f.motif||'—'}</div>

      <h3>Examen clinique</h3>
      <div class="zone">${f.examen_clinique||'—'}</div>

      <h3>Bilan paraclinique</h3>
      <div class="zone">${f.bilan_paraclinique||'—'}</div>

      <h3>Traitement</h3>
      <div class="zone">${f.traitement||'—'}</div>

      <h3>Évolution</h3>
      <div class="zone">${f.evolution||'—'}</div>

      <div class="footer">Rapport généré le ${new Date().toLocaleDateString('fr-CI',{day:'numeric',month:'long',year:'numeric'})} — ${cl?.nom||'MediConnect Africa'}</div>
      <script>window.onload=()=>window.print();<\/script>
      </body></html>`);
    w.document.close();
  };

  const imprimerRapportConsultation = async (c) => {
    const H = { Authorization:`Bearer ${token}` };
    const clR = await fetch(`https://mediconnect-backend-v2.vercel.app/api/clinique/profil`,{headers:H}).then(r=>r.json()).catch(()=>({data:null}));
    const cl = clR.data;
    const win = window.open('','_blank');
    win.document.write(`
      <html><head><title>Rapport médical - ${new Date(c.created_at).toLocaleDateString('fr-CI')}</title><style>
        body{font-family:Arial,sans-serif;padding:30px;color:#1a2e25;max-width:700px;margin:0 auto;}
        .header{display:flex;align-items:center;gap:16px;padding-bottom:12px;border-bottom:3px solid ${cl?.couleur_primaire||'#0A8F58'};margin-bottom:18px;}
        .logo{height:58px;object-fit:contain;}
        .cn{font-size:18px;font-weight:700;color:${cl?.couleur_primaire||'#065F3C'};}
        .ci{font-size:11px;color:#5A7A94;}
        h2{color:${cl?.couleur_primaire||'#0A8F58'};font-size:16px;margin:0 0 14px;text-align:center;text-transform:uppercase;letter-spacing:1px;}
        .meta{display:flex;justify-content:space-between;gap:16px;margin-bottom:16px;}
        .box{background:#E8F8F1;border-radius:8px;padding:12px;flex:1;}
        .lbl{font-size:10px;color:#8BA0B5;font-weight:700;text-transform:uppercase;letter-spacing:.5px;}
        .warn{background:#FEF2F2;border:1px solid #FCA5A5;color:#991B1B;border-radius:8px;padding:10px 14px;font-size:13px;margin-bottom:14px;}
        .section{margin-bottom:16px;}
        .section-lbl{font-size:11px;color:#8BA0B5;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;}
        .section-val{font-size:14px;color:#1a2e25;}
        .vitals{display:flex;gap:16px;background:#f8f9fa;border-radius:8px;padding:10px 14px;font-size:13px;color:#5A7A94;}
        .footer{margin-top:30px;border-top:1px solid #e5e7eb;padding-top:14px;font-size:10px;color:#8BA0B5;display:flex;justify-content:space-between;}
        @media print{button{display:none;}}
      </style></head><body>
      <div class="header">
        ${cl?.logo?`<img src="${cl.logo}" class="logo"/>`:''}
        <div>
          <div class="cn">${cl?.nom||'MediConnect Africa'}</div>
          <div class="ci">${cl?.adresse_complete||cl?.adresse||''} ${cl?.ville?'· '+cl.ville:''}</div>
          <div class="ci">${cl?.telephone||''} ${cl?.email?'· '+cl.email:''}</div>
        </div>
      </div>
      <h2>Rapport médical</h2>

      <div class="meta">
        <div class="box">
          <div class="lbl">Patient</div>
          <div style="font-size:14px;font-weight:700;">${selected?.prenom||''} ${selected?.nom||''}</div>
          <div class="ci">${selected?.telephone||''}</div>
          ${selected?.code_secret?`<div class="ci">Dossier : ${selected.code_secret}</div>`:''}
        </div>
        <div class="box">
          <div class="lbl">Date de la consultation</div>
          <div style="font-size:14px;font-weight:700;">${new Date(c.created_at).toLocaleDateString('fr-CI',{day:'numeric',month:'long',year:'numeric'})}</div>
          ${c.medecin_nom?`<div class="ci">${nomMedecin(c.medecin_nom)}</div>`:''}
        </div>
      </div>

      ${(selected?.allergies||selected?.antecedents)?`
        <div class="warn">
          ${selected?.allergies?`<div>⚠️ <strong>Allergies :</strong> ${selected.allergies}</div>`:''}
          ${selected?.antecedents?`<div style="margin-top:4px;">📋 <strong>Antécédents :</strong> ${selected.antecedents}</div>`:''}
        </div>
      `:''}

      <div class="section">
        <div class="section-lbl">Diagnostic</div>
        <div class="section-val">${c.diagnostic||'—'}</div>
      </div>
      ${c.traitement?`
        <div class="section">
          <div class="section-lbl">Traitement</div>
          <div class="section-val">${c.traitement}</div>
        </div>
      `:''}
      ${c.notes?`
        <div class="section">
          <div class="section-lbl">Notes</div>
          <div class="section-val">${c.notes}</div>
        </div>
      `:''}
      ${(c.tension_arterielle||c.temperature||c.poids||c.taille)?`
        <div class="vitals">
          ${c.tension_arterielle?`<span>TA: ${c.tension_arterielle}</span>`:''}
          ${c.temperature?`<span>T°: ${c.temperature}°C</span>`:''}
          ${c.poids?`<span>Poids: ${c.poids}kg</span>`:''}
          ${c.taille?`<span>Taille: ${c.taille}cm</span>`:''}
        </div>
      `:''}

      <div class="footer">
        <div>MediConnect Africa · CSN<br/>${cl?.site_web||'manager.mediconnect4africa.cloud'}</div>
        <div style="text-align:right;">Cachet & signature<br/><br/><br/>_________________</div>
      </div>
      <div style="text-align:center;margin-top:18px;">
        <button onclick="window.print()" style="padding:10px 24px;background:#0A8F58;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer;">🖨️ Imprimer</button>
      </div>
      </body></html>`);
    win.document.close();
  };

  const imprimerOrdonnance = async (o) => {
    const logoR = await fetch(`https://mediconnect-backend-v2.vercel.app/api/clinique/profil`,{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.json()).catch(()=>({data:null}));
    const cl = logoR.data;
    const win = window.open('','_blank');
    win.document.write(`
      <html><head><title>Ordonnance</title>
      <style>
        body{font-family:Arial,sans-serif;padding:30px;color:#1a2e25;max-width:600px;margin:0 auto;}
        .header{display:flex;align-items:center;gap:16px;padding-bottom:12px;border-bottom:3px solid ${cl?.couleur_primaire||'#0A8F58'};margin-bottom:20px;}
        .logo{height:60px;object-fit:contain;}
        .clinique-nom{font-size:18px;font-weight:700;color:${cl?.couleur_primaire||'#065F3C'};}
        .clinique-info{font-size:11px;color:#5A7A94;}
        h2{color:${cl?.couleur_primaire||'#0A8F58'};font-size:16px;margin:0 0 16px;text-align:center;text-transform:uppercase;letter-spacing:1px;}
        .section{margin-bottom:14px;}
        .label{font-size:11px;color:#8BA0B5;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px;}
        .value{font-size:14px;color:#1a2e25;font-weight:500;}
        .patient{background:#E8F8F1;border-radius:8px;padding:12px;margin-bottom:16px;}
        .medicament{background:#f8f9fa;border-left:3px solid ${cl?.couleur_primaire||'#0A8F58'};padding:12px;border-radius:4px;margin-bottom:10px;}
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
          ${(o.medicaments||o.medicament||'—').split('\n').map(ligne=>`<div style="font-size:15px;font-weight:700;padding:5px 0;border-bottom:1px solid #e5e7eb;">${ligne}</div>`).join('')}
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

  // Bureau des entrees : identite + factures (droit metier accorde),
  // jamais le contenu medical (consultations, ordonnances, examens).
  // sous_role absent = compte historique/proprietaire = acces complet.
  const TABS_TOUTES = [
    { key:"infos", label:"Infos", icon:"👤" },
    { key:"carte", label:"Carte patient", icon:"🗂️" },
    { key:"consultations", label:"Consultations", icon:"🩺" },
    { key:"ordonnances", label:"Ordonnances", icon:"💊" },
    { key:"examens", label:"Examens", icon:"🔬" },
    { key:"factures", label:"Factures", icon:"📄" },
    { key:"rapports", label:"Rapports", icon:"🖨️" },
  ];
  // "Carte patient" (bureau des entrees) : infos, carte, factures, rapports.
  // Consultations/ordonnances/examens restent strictement reserves au medecin.
  // "examens" ajoute pour bureau_entrees : deja concu pour lui (acces
  // volontairement restreint aux SEULS bulletins, ni consultations ni
  // ordonnances), et remplace desormais l'ancienne entree de menu
  // "Resultats d'examens" retiree du menu principal.
  const TABS = user?.sous_role === "bureau_entrees"
    ? TABS_TOUTES.filter(t => t.key==="infos" || t.key==="carte" || t.key==="examens" || t.key==="factures" || t.key==="rapports")
    : TABS_TOUTES;

  const bloodGroups = ["A+","A-","B+","B-","AB+","AB-","O+","O-"];

  return (
    <div style={{ display:"flex", gap:20, height:"calc(100vh - 140px)" }}>
      {/* Liste patients */}
      <div style={{ width:280, flexShrink:0, display:"flex", flexDirection:"column", gap:12 }}>
        <div style={{ display:"flex", gap:10 }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un patient…"
            style={{ flex:1, background:C.input, border:`1px solid ${C.border}`, borderRadius:9, padding:"9px 12px", color:C.text, fontSize:17, outline:"none", fontFamily:"inherit" }} />
          <Btn style={{flexShrink:0,padding:"9px 12px"}} onClick={()=>setShowAdd(true)}>+</Btn>
        </div>
        <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:6 }}>
          {isLoading ? <Loader /> : patients.length===0
            ? <Empty icon="👤" title="Aucun patient" subtitle={search?"Aucun résultat":"Ajoutez un patient"} />
            : patients.map(p=>(
              <button key={p.id} onClick={()=>setSelected(p)}
                style={{ background:selected?.id===p.id?C.input:C.card, border:`1.5px solid ${selected?.id===p.id?C.green:C.border}`, borderRadius:12, padding:"12px 14px", cursor:"pointer", textAlign:"left", fontFamily:"inherit", transition:"all .15s" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:36, height:36, background:`linear-gradient(135deg,${C.green},${C.teal})`, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, color:"#fff", fontSize:18, flexShrink:0 }}>
                    {p.prenom?.[0]}{p.nom?.[0]}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:17, fontWeight:700, color:C.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{p.prenom} {p.nom}</div>
                    <div style={{ fontSize:14, color:C.muted }}>{p.telephone||p.email||p.code_secret||"—"}</div>
                  </div>
                  {p.groupe_sanguin && <span style={{ fontSize:13, fontWeight:700, color:C.red, background:"rgba(225,29,72,.1)", padding:"2px 6px", borderRadius:6 }}>{p.groupe_sanguin}</span>}
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
                <div style={{ width:56, height:56, background:`linear-gradient(135deg,${C.green},${C.teal})`, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, color:"#fff", fontSize:26 }}>
                  {selected.prenom?.[0]}{selected.nom?.[0]}
                </div>
                <div style={{ flex:1 }}>
                  <h2 style={{ margin:0, fontSize:23, fontWeight:800, color:C.text }}>{selected.prenom} {selected.nom}</h2>
                  <div style={{ fontSize:17, color:C.muted, marginTop:2 }}>
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
                <div style={{ background:"rgba(225,29,72,.08)", border:"1px solid rgba(225,29,72,.2)", borderRadius:8, padding:"8px 14px", fontSize:16, color:C.red, marginBottom:12 }}>
                  ⚠️ <strong>Allergies :</strong> {selected.allergies}
                </div>
              )}
              {selected.antecedents && (
                <div style={{ background:"rgba(37,99,235,.08)", border:"1px solid rgba(37,99,235,.2)", borderRadius:8, padding:"8px 14px", fontSize:16, color:C.blue }}>
                  📋 <strong>Antécédents :</strong> {selected.antecedents}
                </div>
              )}
            </Panel>

            {/* Tabs */}
            <div style={{ display:"flex", gap:4, background:C.input, borderRadius:10, padding:4 }}>
              {TABS.map(t=>(
                <button key={t.key} onClick={()=>setActiveTab(t.key)}
                  style={{ flex:1, background:activeTab===t.key?C.hover:"transparent", border:"none", borderRadius:8, padding:"8px 4px", cursor:"pointer", fontFamily:"inherit", color:activeTab===t.key?C.text:C.muted, fontSize:16, fontWeight:activeTab===t.key?700:400, transition:"all .15s" }}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* Tab: Infos */}
            {activeTab==="infos" && (
              <>
              <Panel title="Informations personnelles" actions={<div style={{display:"flex",gap:8}}>
                <button onClick={ouvrirEditionPatient} style={{padding:"6px 14px",background:"rgba(37,99,235,.12)",border:"1px solid rgba(37,99,235,.3)",borderRadius:8,color:"#2563EB",fontSize:16,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>✏️ Modifier patient</button>
                <Btn style={{padding:"6px 14px",fontSize:16}} onClick={imprimerRapportMedical}>🖨️ Rapport médical</Btn>
              </div>}>
                <Grid cols={2} gap={12}>
                  {[["Prénom",selected.prenom],["Nom",selected.nom],["Téléphone",selected.telephone],["Email",selected.email],["Date de naissance",fmtDate(selected.date_naissance)],["Groupe sanguin",selected.groupe_sanguin],["Code secret",selected.code_secret]].map(([k,v])=>(
                    <div key={k} style={{ background:C.hover, borderRadius:8, padding:"10px 14px" }}>
                      <div style={{ fontSize:13, color:C.dim, fontWeight:700, textTransform:"uppercase", marginBottom:2 }}>{k}</div>
                      <div style={{ fontSize:18, color:C.text, fontWeight:600 }}>{v||"—"}</div>
                    </div>
                  ))}
                </Grid>
              </Panel>
              <div style={{marginTop:16}}><PanelInfosVitales patient={selected} /></div>
              <div style={{marginTop:16}}><PanelContactsUrgence patient={selected} /></div>
              </>
            )}

            <Modal open={showEditPatient} onClose={()=>setShowEditPatient(false)} title="✏️ Modifier le patient" width={560}>
              <Grid cols={2} gap={12}>
                <Inp label="Prénom" value={editPatientForm.prenom} onChange={e=>setEditPatientForm(f=>({...f,prenom:e.target.value}))} />
                <Inp label="Nom" value={editPatientForm.nom} onChange={e=>setEditPatientForm(f=>({...f,nom:e.target.value}))} />
                <Inp label="Téléphone" value={editPatientForm.telephone} onChange={e=>setEditPatientForm(f=>({...f,telephone:e.target.value}))} />
                <Inp label="Email" value={editPatientForm.email} onChange={e=>setEditPatientForm(f=>({...f,email:e.target.value}))} />
                <Sel label="Groupe sanguin" value={editPatientForm.groupe_sanguin} onChange={e=>setEditPatientForm(f=>({...f,groupe_sanguin:e.target.value}))} options={["",...bloodGroups]} />
              </Grid>
              <Inp label="Allergies connues" value={editPatientForm.allergies} onChange={e=>setEditPatientForm(f=>({...f,allergies:e.target.value}))} placeholder="Pénicilline, Aspirine…" />
              <Inp label="Antécédents médicaux" value={editPatientForm.antecedents} onChange={e=>setEditPatientForm(f=>({...f,antecedents:e.target.value}))} placeholder="Diabète, HTA, Opération…" />
              <Btn style={{width:"100%",marginTop:8}} loading={editPatientMut.isPending} onClick={()=>editPatientMut.mutate()}>Enregistrer les modifications</Btn>
            </Modal>

            {/* Tab: Consultations */}
            {activeTab==="consultations" && (
              <Panel title="Historique des consultations"
                actions={<div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <div style={{display:"flex",gap:2,background:C.input,borderRadius:8,padding:2}}>
                    {[["cartes","🗂️"],["tableau","📊"]].map(([v,ic])=>(
                      <button key={v} onClick={()=>setVueHistorique(v)}
                        style={{padding:"5px 10px",borderRadius:6,border:"none",cursor:"pointer",fontSize:16,fontFamily:"inherit",background:vueHistorique===v?C.hover:"transparent",color:vueHistorique===v?C.text:C.muted}}>
                        {ic}
                      </button>
                    ))}
                  </div>
                  <Btn style={{padding:"6px 14px",fontSize:16}} onClick={()=>navigate('/clinique/consultation', { state: { patientPreselectionne: selected } })}>+ Consultation</Btn>
                </div>}>
                {(consults||[]).length===0 ? (
                  <Empty icon="🩺" title="Aucune consultation" subtitle="Ajoutez la première consultation" />
                ) : vueHistorique==="tableau" ? (
                  <div style={{overflowX:"auto"}}>
                    <div style={{display:"grid",gridTemplateColumns:`110px repeat(${RUBRIQUES_CONSULTATION.length},minmax(160px,1fr))`,gap:1,minWidth:900}}>
                      <div style={{padding:"8px 10px",fontSize:13,fontWeight:800,color:C.dim,textTransform:"uppercase",background:C.input}}>Date</div>
                      {RUBRIQUES_CONSULTATION.map(rub=>(
                        <div key={rub.titre} style={{padding:"8px 10px",fontSize:13,fontWeight:800,color:C.dim,textTransform:"uppercase",background:C.input}}>{rub.titre}</div>
                      ))}
                      {(consults||[]).map(c=>(
                        <React.Fragment key={c.id}>
                          <div style={{padding:"10px",fontSize:16,fontWeight:700,color:c.statut==="annulee"?C.dim:C.teal,background:C.hover,opacity:c.statut==="annulee"?.5:1}}>
                            {fmtDate(c.created_at)}
                            {c.statut==="annulee" && <div style={{fontSize:12,color:C.red}}>Annulée</div>}
                          </div>
                          {RUBRIQUES_CONSULTATION.map(rub=>{
                            const rempli = rub.champs.filter(([champ])=>c[champ]);
                            return (
                              <div key={rub.titre} style={{padding:"10px",fontSize:14,color:C.text,background:C.hover,opacity:c.statut==="annulee"?.5:1}}>
                                {rempli.length===0 ? <span style={{color:C.dim}}>—</span> : rempli.map(([champ,label])=>(
                                  <div key={champ} style={{marginBottom:4}}>
                                    <span style={{color:C.dim,fontSize:12,textTransform:"uppercase",display:"block"}}>{label}</span>
                                    {c[champ]}
                                  </div>
                                ))}
                              </div>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ) : (consults||[]).map(c=>(
                    <div key={c.id} style={{ background:C.hover, borderRadius:10, padding:14, marginBottom:10, opacity:c.statut==="annulee"?.5:1 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                        <span style={{ fontSize:16, fontWeight:700, color:C.teal }}>{fmtDate(c.created_at)}</span>
                        <span style={{ fontSize:16, color:C.muted }}>{c.medecin_nom||"—"}</span>
                      </div>
                      {c.statut==="annulee" && <Badge color="red">Annulée</Badge>}
                      <div style={{ fontSize:17, fontWeight:700, color:C.text, marginBottom:4, marginTop:c.statut==="annulee"?6:0 }}>Diagnostic : {c.diagnostic||"—"}</div>
                      {c.traitement && <div style={{ fontSize:16, color:C.muted, marginBottom:4 }}>Traitement : {c.traitement}</div>}
                      {c.notes && <div style={{ fontSize:16, color:C.muted, fontStyle:"italic" }}>{c.notes}</div>}
                      <div style={{ display:"flex", gap:12, marginTop:8, fontSize:14, color:C.dim }}>
                        {c.tension_arterielle && <span>TA: {c.tension_arterielle}</span>}
                        {c.temperature && <span>T°: {c.temperature}°C</span>}
                        {c.poids && <span>Poids: {c.poids}kg</span>}
                        {c.taille && <span>Taille: {c.taille}cm</span>}
                        {c.updated_at && c.updated_at!==c.created_at && <span>· modifiée le {fmtDate(c.updated_at)}</span>}
                      </div>
                      <div style={{ display:"flex", gap:8, marginTop:10, alignItems:"center" }}>
                        <button onClick={()=>partagerConsultMut.mutate({id:c.id, partage:!c.partage_reseau})}
                          style={{padding:"4px 10px",background:c.partage_reseau?"rgba(37,99,235,.12)":"rgba(255,255,255,.06)",border:c.partage_reseau?"1px solid rgba(37,99,235,.35)":`1px solid ${C.border}`,borderRadius:6,color:c.partage_reseau?"#2563EB":C.muted,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                          {c.partage_reseau?"🌐 Partagée":"🔒 Privée"}
                        </button>
                        <button onClick={()=>{ setConsultationEnLecture(c); setShowDossierMedical(true); }} style={{padding:"4px 10px",background:"rgba(255,255,255,.06)",border:`1px solid ${C.border}`,borderRadius:6,color:C.text,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>📄 Afficher</button>
                        {c.statut!=="annulee" && (<>
                          <button onClick={()=>{
                            setConsultationEnEdition(c);
                            const rempli = { ...EDIT_FORM_VIDE };
                            Object.keys(rempli).forEach(k => { rempli[k] = c[k] || ""; });
                            setEditForm(rempli);
                            setShowEditConsult(true);
                          }} style={{padding:"4px 10px",background:"rgba(37,99,235,.12)",border:"1px solid rgba(37,99,235,.3)",borderRadius:6,color:C.blue,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>✏️ Modifier</button>
                          <button onClick={()=>{ setConsultationPourOrdonnance(c); setShowOrd(true); }} style={{padding:"4px 10px",background:"rgba(10,143,88,.12)",border:"1px solid rgba(10,143,88,.3)",borderRadius:6,color:C.green,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>💊 Ordonnance</button>
                        </>)}
                      </div>
                    </div>
                  ))
                }
              </Panel>
            )}

            {/* Tab: Ordonnances */}
            {activeTab==="ordonnances" && (
              <Panel title="Ordonnances et prescriptions"
                actions={<Btn style={{padding:"6px 14px",fontSize:16}} onClick={()=>setShowOrd(true)}>+ Ordonnance</Btn>}>
                {(ords||[]).length===0
                  ? <Empty icon="💊" title="Aucune ordonnance" />
                  : (ords||[]).map(o=>{
                    const STATUT_ORD = {
                      active:{l:"Active",c:"green"}, envoyee:{l:"Envoyée",c:"blue"},
                      devis_pret:{l:"Devis prêt",c:"amber"}, dispensee:{l:"Dispensée",c:"green"},
                    };
                    const st = STATUT_ORD[o.statut] || STATUT_ORD.active;
                    return (
                    <div key={o.id} style={{ background:C.hover, borderRadius:10, padding:14, marginBottom:10, display:"flex", gap:14 }}>
                      <div style={{ width:3, background:C.green, borderRadius:2, flexShrink:0 }} />
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6, flexWrap:"wrap", gap:6 }}>
                          <span style={{ fontSize:16, fontWeight:700, color:C.green }}>Ordonnance du {fmtDate(o.created_at)}</span>
                          <div style={{display:"flex",gap:8,alignItems:"center"}}>
                            <Badge color={st.c}>{st.l}</Badge>
                            <button onClick={()=>partagerOrdMut.mutate({id:o.id, partage:!o.partage_reseau})}
                              style={{padding:"3px 10px",background:o.partage_reseau?"rgba(37,99,235,.12)":"rgba(255,255,255,.06)",border:o.partage_reseau?"1px solid rgba(37,99,235,.35)":`1px solid ${C.border}`,borderRadius:6,color:o.partage_reseau?"#2563EB":C.muted,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                              {o.partage_reseau?"🌐 Partagée":"🔒 Privée"}
                            </button>
                            {!o.destination && <button onClick={()=>{ setOrdonnanceAEnvoyer(o); setShowEnvoiOrd(true); }} style={{padding:"3px 10px",background:"rgba(37,99,235,.12)",border:"1px solid rgba(37,99,235,.3)",borderRadius:6,color:"#2563EB",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>📤 Envoyer</button>}
                            <button onClick={()=>ouvrirEditionOrd(o)} style={{padding:"3px 10px",background:"rgba(37,99,235,.12)",border:"1px solid rgba(37,99,235,.3)",borderRadius:6,color:C.blue,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>✏️ Modifier</button>
                            <button onClick={()=>imprimerOrdonnance(o)} style={{padding:"3px 10px",background:"rgba(10,143,88,.15)",border:"1px solid rgba(10,143,88,.3)",borderRadius:6,color:C.green,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>🖨️ Imprimer</button>
                          </div>
                        </div>
                        <div style={{ fontSize:17, color:C.text, marginBottom:4, fontWeight:600 }}>{o.medicaments||"—"}</div>
                        {o.posologie && <div style={{ fontSize:16, color:C.muted }}>Posologie : {o.posologie}</div>}
                        {o.duree && <div style={{ fontSize:16, color:C.muted }}>Durée : {o.duree}</div>}
                        {o.notes_ord && <div style={{ fontSize:16, color:C.dim, marginTop:4, fontStyle:"italic" }}>{o.notes_ord}</div>}
                        {o.destination && <div style={{ fontSize:14, color:C.dim, marginTop:6 }}>→ Envoyée vers pharmacie {o.destination==="interne"?"interne":"externe"}{o.devis_montant?` · Devis : ${fmt(o.devis_montant)} F`:""}</div>}
                      </div>
                    </div>
                    );
                  })
                }
              </Panel>
            )}

            {/* Tab: Examens */}
            {activeTab==="examens" && (
              <Panel title="Résultats d'examens et imagerie"
                actions={<Btn style={{padding:"6px 14px",fontSize:16}} onClick={()=>{ setShowExamen(true); setPatientCible(selected||null); if(selected) setCodeRecherche(selected.code_secret||""); }}>🔬 Demander un examen</Btn>}>
                {groupesExamens.length===0
                  ? <Empty icon="🔬" title="Aucun résultat" subtitle="Les résultats labo et imagerie apparaîtront ici dès leur saisie"/>
                  : groupesExamens.map(e=> e.items ? (
                    <div key={e.id} onClick={()=>setGroupeActif(e)} style={{background:C.hover,borderRadius:10,padding:14,marginBottom:10,display:"flex",gap:14,cursor:"pointer"}}>
                      <div style={{width:3,background:e.type_source==="labo"?C.purple:C.blue,borderRadius:2,flexShrink:0}}/>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                          <span style={{fontSize:16,fontWeight:700,color:e.type_source==="labo"?C.purple:C.blue}}>
                            {e.type_source==="labo"?"🔬 Labo":"🩻 Imagerie"} · {e.items.length} examens groupés
                          </span>
                          <Badge color={e.items.every(i=>i.statut==="valide")?"green":"amber"}>
                            {e.items.filter(i=>i.statut==="valide").length}/{e.items.length} traités
                          </Badge>
                        </div>
                        <div style={{fontSize:16,color:C.muted}}>{e.items.map(i=>i.type_analyse||i.type_examen).join(", ")}</div>
                        <div style={{fontSize:14,color:C.dim,marginTop:4}}>{fmtDate(e.created_at)} · cliquer pour voir le détail</div>
                      </div>
                    </div>
                  ) : (
                    <div key={e.id} style={{background:C.hover,borderRadius:10,padding:14,marginBottom:10,display:"flex",gap:14}}>
                      <div style={{width:3,background:e.type_source==="labo"?C.purple:C.blue,borderRadius:2,flexShrink:0}}/>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                          <span style={{fontSize:16,fontWeight:700,color:e.type_source==="labo"?C.purple:C.blue}}>
                            {e.type_source==="labo"?"🔬 Labo":"🩻 Imagerie"} · {e.type_analyse||e.type_examen||"—"}
                          </span>
                          <Badge color={e.statut==="valide"?"green":e.statut==="en_attente"?"amber":"gray"}>{e.statut||"—"}</Badge>
                        </div>
                        {e.interpretation && <div style={{fontSize:17,color:C.text,fontWeight:600,marginBottom:4}}>{e.interpretation}</div>}
                        {e.resultat && <div style={{fontSize:17,color:C.text,marginBottom:4}}>{e.resultat}</div>}
                        {e.observations && <div style={{fontSize:16,color:C.muted,fontStyle:"italic"}}>{e.observations}</div>}
                        {e.valeurs && <div style={{fontSize:16,color:C.muted}}>Valeurs : {typeof e.valeurs==="object"?Object.entries(e.valeurs).map(([k,v])=>`${k}:${v}`).join(", "):e.valeurs}</div>}
                        <div style={{fontSize:14,color:C.dim,marginTop:4}}>{fmtDate(e.created_at)}</div>
                      </div>
                    </div>
                  ))
                }
              </Panel>
            )}

            {/* Tab: Factures */}
            {activeTab==="carte" && <PanelCartePatient patient={selected} />}

            {activeTab==="factures" && (
              <>
              {facturesPatient.length>0 && (
                <Panel title="Factures émises" style={{marginBottom:16}}>
                  {facturesPatient.map(f=>(
                    <div key={f.id} style={{background:C.hover,borderRadius:9,padding:"11px 14px",marginBottom:8,display:"flex",alignItems:"center",gap:12}}>
                      <div style={{flex:1}}>
                        <div style={{fontSize:16,fontWeight:700,color:C.teal,fontFamily:"monospace"}}>{f.reference||"—"}</div>
                        <div style={{fontSize:13,color:C.dim}}>{fmtDate(f.created_at)} · <Badge color={{payee:"green",en_attente:"amber",annulee:"red"}[f.statut]||"gray"}>{f.statut}</Badge></div>
                      </div>
                      <div style={{fontSize:18,fontWeight:800,color:C.green}}>{fmt(f.montant_total)} F</div>
                      <Btn variant="outline" style={{padding:"6px 12px",fontSize:14}} onClick={()=>imprimerFactureEmise(f)}>🖨️ PDF</Btn>
                    </div>
                  ))}
                </Panel>
              )}
              <Panel title="Facturation des actes"
                actions={(pec?.data||[]).length>0?<Btn style={{padding:"6px 14px",fontSize:16}} onClick={imprimerFacture}>🖨️ Imprimer la facture</Btn>:null}>
                {(pec?.data||[]).length===0
                  ? <Empty icon="📄" title="Aucun acte facturable" subtitle="Les actes saisis lors de la prise en charge apparaîtront ici"/>
                  : <>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:14}}>
                        {[["Total actes",pec.totaux.total,C.text],["Part assurance",pec.totaux.part_assurance,C.teal],["Net patient",pec.totaux.part_patient,C.green]].map(([l,v,col])=>(
                          <div key={l} style={{background:C.input,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 14px"}}>
                            <div style={{fontSize:14,color:C.dim,marginBottom:4}}>{l}</div>
                            <div style={{fontSize:25,fontWeight:800,color:col}}>{fmtF(v)} F</div>
                          </div>
                        ))}
                      </div>
                      {(pec.data||[]).map(l=>(
                        <div key={l.id} style={{background:C.hover,borderRadius:9,padding:"11px 14px",marginBottom:8,display:"flex",alignItems:"center",gap:12}}>
                          <div style={{flex:1}}>
                            <div style={{fontSize:17,fontWeight:600,color:C.text}}>{l.libelle_acte}</div>
                            <div style={{fontSize:14,color:C.dim}}>{l.code_acte} · {l.quantite} × {fmtF(l.prix_unitaire)} F · PEC {l.taux_assurance}%</div>
                          </div>
                          <div style={{textAlign:"right"}}>
                            <div style={{fontSize:18,fontWeight:800,color:C.green}}>{fmtF(l.part_patient)} F</div>
                            {Number(l.part_assurance)>0&&<div style={{fontSize:13,color:C.teal}}>assurance {fmtF(l.part_assurance)} F</div>}
                          </div>
                        </div>
                      ))}
                    </>
                }
              </Panel>
              </>
            )}

            {activeTab==="rapports" && (
              <Panel title="Rapports médicaux"
                actions={<Btn style={{padding:"6px 14px",fontSize:14}} onClick={()=>setShowRapportHosp(true)}>🏥 Rapport d'hospitalisation</Btn>}>
                {(consults||[]).length===0
                  ? <Empty icon="🖨️" title="Aucun rapport" subtitle="Un rapport peut être généré pour chaque consultation réalisée." />
                  : (consults||[]).map(c=>(
                    <div key={c.id} style={{background:C.hover,borderRadius:9,padding:"12px 16px",marginBottom:8,display:"flex",alignItems:"center",gap:12}}>
                      <div style={{flex:1}}>
                        <div style={{fontSize:15,fontWeight:700,color:C.text}}>{fmtDate(c.created_at)}{c.medecin_nom?` · ${nomMedecin(c.medecin_nom)}`:""}</div>
                        <div style={{fontSize:14,color:C.dim}}>{c.diagnostic||"—"}</div>
                      </div>
                      <button onClick={()=>partagerConsultMut.mutate({id:c.id, partage:!c.partage_reseau})}
                        style={{padding:"5px 10px",background:c.partage_reseau?"rgba(37,99,235,.12)":"rgba(255,255,255,.06)",border:c.partage_reseau?"1px solid rgba(37,99,235,.35)":`1px solid ${C.border}`,borderRadius:6,color:c.partage_reseau?"#2563EB":C.muted,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                        {c.partage_reseau?"🌐 Partagé":"🔒 Privé"}
                      </button>
                      <Btn variant="outline" style={{padding:"6px 14px",fontSize:14}} onClick={()=>imprimerRapportConsultation(c)}>🖨️ Générer</Btn>
                    </div>
                  ))
                }
              </Panel>
            )}
          </>
        }
      </div>

      {/* Modal: Rapport medical hospitalisation -- meme structure que le
          modele physique fourni par une clinique partenaire, exige par
          les compagnies d'assurance. */}
      <Modal open={showRapportHosp} onClose={()=>setShowRapportHosp(false)} title="🏥 Rapport médical hospitalisation" width={640}>
        <div style={{display:"flex",gap:8,marginBottom:16,padding:12,background:C.hover,borderRadius:10}}>
          <Inp label="Numéro d'entrée (ex. PSG-XXXXX)" value={numeroEntreeRecherche} onChange={e=>setNumeroEntreeRecherche(e.target.value)}
            placeholder="Coller le numéro d'entrée du patient" style={{flex:1,marginBottom:0}} />
          <Btn style={{alignSelf:"flex-end"}} loading={rechercherParReferenceMut.isPending}
            disabled={!numeroEntreeRecherche.trim()}
            onClick={()=>rechercherParReferenceMut.mutate()}>🔎 Rechercher</Btn>
        </div>
        <Grid cols={2} gap={12}>
          <Sel label="Médecin traitant" value={rapportHospForm.medecin_traitant} onChange={e=>setRapportHospForm(f=>({...f,medecin_traitant:e.target.value}))}
            options={[{v:"",l:"— Choisir un médecin —"}, ...(medecinsListeRapport||[]).map(m=>({v:`Dr ${m.prenom} ${m.nom}${m.specialite?' — '+m.specialite:''}`, l:`Dr ${m.prenom} ${m.nom}${m.specialite?' — '+m.specialite:''}`}))]} />
          <Inp label="Numéro de facture" value={rapportHospForm.numero_facture} onChange={e=>setRapportHospForm(f=>({...f,numero_facture:e.target.value}))} />
          <Inp label="Date d'entrée" type="date" value={rapportHospForm.date_entree} onChange={e=>setRapportHospForm(f=>({...f,date_entree:e.target.value}))} />
          <Inp label="Date de sortie" type="date" value={rapportHospForm.date_sortie} onChange={e=>setRapportHospForm(f=>({...f,date_sortie:e.target.value}))} />
        </Grid>

        <div style={{fontSize:14,fontWeight:700,color:C.text,margin:"14px 0 6px",textTransform:"uppercase",letterSpacing:".5px"}}>Identité du malade</div>
        <Grid cols={2} gap={12}>
          <Inp label="Adhérent" value={rapportHospForm.adherent} onChange={e=>setRapportHospForm(f=>({...f,adherent:e.target.value}))} placeholder={selected?`${selected.prenom} ${selected.nom}`:""} />
          <Inp label="Bénéficiaire" value={rapportHospForm.beneficiaire} onChange={e=>setRapportHospForm(f=>({...f,beneficiaire:e.target.value}))} />
        </Grid>
        <Inp label="Société Assurance" value={rapportHospForm.societe_assurance} onChange={e=>setRapportHospForm(f=>({...f,societe_assurance:e.target.value}))} placeholder={selected?.assurance||""} />

        <div style={{fontSize:14,fontWeight:700,color:C.text,margin:"14px 0 6px",textTransform:"uppercase",letterSpacing:".5px"}}>Motif</div>
        <textarea value={rapportHospForm.motif} onChange={e=>setRapportHospForm(f=>({...f,motif:e.target.value}))} rows={2}
          style={{width:"100%",background:C.input,border:`1px solid ${C.border}`,borderRadius:9,padding:"10px 12px",color:C.text,fontSize:15,outline:"none",fontFamily:"inherit",resize:"vertical",marginBottom:12}} />

        <div style={{fontSize:14,fontWeight:700,color:C.text,margin:"0 0 6px",textTransform:"uppercase",letterSpacing:".5px"}}>Examen clinique</div>
        <textarea value={rapportHospForm.examen_clinique} onChange={e=>setRapportHospForm(f=>({...f,examen_clinique:e.target.value}))} rows={3}
          style={{width:"100%",background:C.input,border:`1px solid ${C.border}`,borderRadius:9,padding:"10px 12px",color:C.text,fontSize:15,outline:"none",fontFamily:"inherit",resize:"vertical",marginBottom:12}} />

        <div style={{fontSize:14,fontWeight:700,color:C.text,margin:"0 0 6px",textTransform:"uppercase",letterSpacing:".5px"}}>Bilan paraclinique</div>
        <textarea value={rapportHospForm.bilan_paraclinique} onChange={e=>setRapportHospForm(f=>({...f,bilan_paraclinique:e.target.value}))} rows={3}
          style={{width:"100%",background:C.input,border:`1px solid ${C.border}`,borderRadius:9,padding:"10px 12px",color:C.text,fontSize:15,outline:"none",fontFamily:"inherit",resize:"vertical",marginBottom:12}} />

        <div style={{fontSize:14,fontWeight:700,color:C.text,margin:"0 0 6px",textTransform:"uppercase",letterSpacing:".5px"}}>Traitement</div>
        <textarea value={rapportHospForm.traitement} onChange={e=>setRapportHospForm(f=>({...f,traitement:e.target.value}))} rows={3}
          style={{width:"100%",background:C.input,border:`1px solid ${C.border}`,borderRadius:9,padding:"10px 12px",color:C.text,fontSize:15,outline:"none",fontFamily:"inherit",resize:"vertical",marginBottom:12}} />

        <div style={{fontSize:14,fontWeight:700,color:C.text,margin:"0 0 6px",textTransform:"uppercase",letterSpacing:".5px"}}>Évolution</div>
        <textarea value={rapportHospForm.evolution} onChange={e=>setRapportHospForm(f=>({...f,evolution:e.target.value}))} rows={2}
          style={{width:"100%",background:C.input,border:`1px solid ${C.border}`,borderRadius:9,padding:"10px 12px",color:C.text,fontSize:15,outline:"none",fontFamily:"inherit",resize:"vertical",marginBottom:14}} />

        <div style={{display:"flex",gap:10}}>
          <Btn variant="outline" style={{flex:1}} onClick={()=>setShowRapportHosp(false)}>Annuler</Btn>
          <Btn style={{flex:2}} onClick={()=>{ imprimerRapportHospitalisation(); setShowRapportHosp(false); }}>🖨️ Générer et imprimer</Btn>
        </div>
      </Modal>

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
          <label style={{fontSize:14,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".5px",display:"block",marginBottom:8}}>Couverture Assurance</label>
          <div style={{display:"flex",gap:8,marginBottom:12}}>
            {[{val:false,label:"🚫 Non assuré"},{val:true,label:"🛡️ Assuré"}].map(opt=>(
              <button key={String(opt.val)} onClick={()=>setPForm(p=>({...p,est_assure:opt.val,assurance:opt.val?p.assurance:"",numero_police:opt.val?p.numero_police:""}))}
                style={{flex:1,padding:"10px",borderRadius:9,fontWeight:700,fontSize:17,cursor:"pointer",fontFamily:"inherit",
                  background:pForm.est_assure===opt.val?(opt.val?"rgba(10,143,88,.15)":"rgba(239,68,68,.1)"):"transparent",
                  border:`1.5px solid ${pForm.est_assure===opt.val?(opt.val?C.green:"#EF4444"):C.border}`,
                  color:pForm.est_assure===opt.val?(opt.val?C.green:"#EF4444"):C.muted}}>
                {opt.label}
              </button>
            ))}
          </div>
          {pForm.est_assure&&<WidgetAssuranceCascade pForm={pForm} setPForm={setPForm} />}
        </div>

        {/* Actes de la prise en charge */}
        <div style={{marginTop:14}}>
          <label style={{fontSize:14,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".5px",display:"block",marginBottom:8}}>Actes / Motif de venue</label>
          <input value={searchActe} onChange={e=>setSearchActe(e.target.value)} placeholder="Rechercher un acte (consultation, radio, NFS...)"
            style={{width:"100%",padding:"9px 12px",background:C.hover,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:17,outline:"none",marginBottom:8,boxSizing:"border-box"}}/>
          <div style={{maxHeight:150,overflowY:"auto",marginBottom:10}}>
            {(catalogue||[]).filter(a=>!searchActe||`${a.code} ${a.libelle} ${a.categorie||""}`.toLowerCase().includes(searchActe.toLowerCase())).map(a=>{
              const sel = actesSel.some(x=>x.code===a.code);
              return (
                <div key={a.id} onClick={()=>toggleActe(a)} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 10px",borderRadius:7,cursor:"pointer",marginBottom:4,
                  background:sel?"rgba(10,143,88,.12)":"transparent",border:`1px solid ${sel?C.green:"transparent"}`}}>
                  <span style={{fontSize:20,color:sel?C.green:C.dim}}>{sel?"☑":"☐"}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:16,fontWeight:600,color:C.text}}>{a.libelle}</div>
                    <div style={{fontSize:13,color:C.dim}}>{a.code} · {a.categorie} · prise en charge {a.taux_assurance}%</div>
                  </div>
                  <span style={{fontSize:16,fontWeight:800,color:C.green}}>{fmtF(a.tarif_base)} F</span>
                </div>
              );
            })}
          </div>
          {actesSel.length>0&&(
            <div style={{background:"rgba(10,143,88,.06)",border:"1px solid rgba(10,143,88,.2)",borderRadius:9,padding:12}}>
              {actesSel.map(a=>(
                <div key={a.code} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                  <span style={{flex:1,fontSize:16,color:C.text}}>{a.libelle}</span>
                  <input type="number" min={1} value={a.quantite} onChange={e=>setActesSel(p=>p.map(x=>x.code===a.code?{...x,quantite:Math.max(1,parseInt(e.target.value)||1)}:x))}
                    style={{width:48,padding:"3px 6px",background:C.hover,border:`1px solid ${C.border}`,borderRadius:5,color:C.text,fontSize:16,textAlign:"center"}}/>
                  <span style={{fontSize:16,fontWeight:700,color:C.green,minWidth:70,textAlign:"right"}}>{fmtF(a.prix_unitaire*a.quantite)} F</span>
                </div>
              ))}
              <div style={{borderTop:`1px solid ${C.border}`,marginTop:8,paddingTop:8,fontSize:16}}>
                <div style={{display:"flex",justifyContent:"space-between",color:C.muted}}><span>Total actes</span><strong style={{color:C.text}}>{fmtF(totalActes)} F</strong></div>
                {pForm.est_assure&&<div style={{display:"flex",justifyContent:"space-between",color:C.muted,marginTop:3}}><span>Part assurance ({tauxDefaut}%)</span><strong style={{color:C.teal}}>{fmtF(partAss)} F</strong></div>}
                <div style={{display:"flex",justifyContent:"space-between",marginTop:5,fontSize:18}}><strong style={{color:C.text}}>À payer par le patient</strong><strong style={{color:C.green,fontSize:21}}>{fmtF(totalActes-partAss)} F</strong></div>
              </div>
            </div>
          )}
        </div>

        <div style={{display:"flex",gap:10,marginTop:14}}>
          <Btn variant="outline" style={{flex:1}} onClick={()=>setShowAdd(false)}>Annuler</Btn>
          <Btn style={{flex:2}} loading={addPat.isPending} onClick={()=>{ if(!pForm.prenom||!pForm.nom){toast.error("Prénom et nom requis");return;} addPat.mutate(pForm); }}>Créer le dossier{actesSel.length>0?` — ${fmtF(totalActes-partAss)} F`:""}</Btn>
        </div>
      </Modal>

      {/* Modal: Code secret patient créé */}
      {newPatient&&(
        <div onClick={()=>setNewPatient(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#0E1620",border:"1px solid #1E2F42",borderRadius:18,padding:32,width:420,maxWidth:"95vw",textAlign:"center"}}>
            <div style={{width:64,height:64,background:"linear-gradient(135deg,#0A8F58,#0D9488)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,margin:"0 auto 16px"}}>✅</div>
            <div style={{fontSize:23,fontWeight:800,color:"#F0F4F8",marginBottom:4}}>
              {newPatient.prenom||"—"} {newPatient.nom||"—"}
            </div>
            <div style={{fontSize:17,color:"#8BA0B5",marginBottom:20}}>Dossier médical créé avec succès</div>
            <div style={{background:"#141E2B",border:"1px solid #1E2F42",borderRadius:12,padding:20,marginBottom:20}}>
              <div style={{fontSize:14,fontWeight:700,color:"#8BA0B5",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Code secret patient</div>
              <div style={{fontSize:47,fontWeight:900,color:"#0A8F58",letterSpacing:6,fontFamily:"monospace"}}>
                {newPatient.code_secret||"—"}
              </div>
              <div style={{fontSize:14,color:"#4E657A",marginTop:8}}>Remettez ce code au patient — il lui permettra d'accéder à ses soins</div>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setNewPatient(null)} style={{flex:1,padding:"10px",borderRadius:9,background:"transparent",border:"1.5px solid #1E2F42",color:"#8BA0B5",cursor:"pointer",fontSize:17,fontWeight:700,fontFamily:"inherit"}}>Fermer</button>
              <button onClick={()=>{
                if(navigator.clipboard) navigator.clipboard.writeText(newPatient.code_secret||"").then(()=>toast.success("Code copié !"));
              }} style={{flex:1,padding:"10px",borderRadius:9,background:"rgba(10,143,88,.15)",border:"1px solid rgba(10,143,88,.3)",color:"#0A8F58",cursor:"pointer",fontSize:17,fontWeight:700,fontFamily:"inherit"}}>📋 Copier</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nouvelle consultation */}
      <Modal open={showConsult} onClose={()=>setShowConsult(false)} title={`🩺 Consultation — ${selected?.prenom} ${selected?.nom}`} width={560}>
        <div style={{marginBottom:12}}>
          <label style={{fontSize:14,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".5px",display:"block",marginBottom:5}}>Affection (CIM-10)</label>
          <input value={searchCim} onChange={e=>setSearchCim(e.target.value)} placeholder="Rechercher : paludisme, HTA, diabète..."
            style={{width:"100%",padding:"9px 12px",background:C.hover,border:`1px solid ${codeCim?C.green:C.border}`,borderRadius:8,color:C.text,fontSize:17,outline:"none",boxSizing:"border-box"}}/>
          {searchCim&&!codeCim&&(
            <div style={{maxHeight:130,overflowY:"auto",marginTop:6,border:`1px solid ${C.border}`,borderRadius:8}}>
              {(affections||[]).filter(a=>`${a.code} ${a.libelle}`.toLowerCase().includes(searchCim.toLowerCase())).slice(0,20).map(a=>(
                <div key={a.code} onClick={()=>{setCodeCim(a.code);setSearchCim(`${a.code} — ${a.libelle}`);setCForm(p=>({...p,diagnostic:p.diagnostic||a.libelle}));}}
                  style={{padding:"7px 10px",cursor:"pointer",fontSize:16,color:C.text,borderBottom:`1px solid ${C.border}`}}>
                  <strong style={{color:C.green}}>{a.code}</strong> — {a.libelle}
                  <div style={{fontSize:13,color:C.dim}}>{a.chapitre}</div>
                </div>
              ))}
            </div>
          )}
          {codeCim&&<button onClick={()=>{setCodeCim("");setSearchCim("");}} style={{marginTop:5,background:"none",border:"none",color:C.teal,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>× Changer d'affection</button>}
        </div>
        <Inp label="Diagnostic *" required value={cForm.diagnostic} onChange={fc("diagnostic")} placeholder="Ex: Hypertension artérielle" />
        <Inp label="Traitement prescrit" value={cForm.traitement} onChange={fc("traitement")} placeholder="Ex: Amlodipine 5mg" />
        <Grid cols={4} gap={10}>
          <Inp label="T.A." value={cForm.tension_arterielle} onChange={fc("tension_arterielle")} placeholder="120/80" />
          <Inp label="Temp (°C)" value={cForm.temperature} onChange={fc("temperature")} placeholder="37.2" type="number" />
          <Inp label="Poids (kg)" value={cForm.poids} onChange={fc("poids")} placeholder="70" type="number" />
          <Inp label="Taille (cm)" value={cForm.taille} onChange={fc("taille")} placeholder="175" type="number" />
        </Grid>
        <div style={{marginBottom:14}}>
          <label style={{display:"block",fontSize:14,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".5px",marginBottom:5}}>Notes cliniques</label>
          <textarea value={cForm.notes} onChange={fc("notes")} rows={3} placeholder="Observations, recommandations…"
            style={{width:"100%",background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:9,padding:"10px 14px",color:C.text,fontSize:18,resize:"none",outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}
            onFocus={e=>e.target.style.borderColor=C.green} onBlur={e=>e.target.style.borderColor=C.border} />
        </div>
        <div style={{display:"flex",gap:10}}>
          <Btn variant="outline" style={{flex:1}} onClick={()=>setShowConsult(false)}>Annuler</Btn>
          <Btn style={{flex:2}} loading={addCons.isPending} onClick={()=>{ if(!cForm.diagnostic){toast.error("Diagnostic requis");return;} addCons.mutate({...cForm,patient_id:selected.id}); }}>Enregistrer</Btn>
        </div>
      </Modal>


      {/* Modal: Ordonnance — plusieurs medicaments, chacun avec sa propre ligne */}
      <Modal open={showOrd} onClose={()=>{ setShowOrd(false); setLignesOrd([{nom:"",qte:"",unite:"",posologie:"",duree:""}]); }} title={`💊 Ordonnance — ${selected?.prenom} ${selected?.nom}`} width={520}>
        <div style={{marginBottom:14}}>
          {lignesOrd.map((ligne,i)=>(
            <div key={i} style={{display:"grid",gridTemplateColumns:"1.8fr 0.7fr 0.9fr 0.9fr 0.9fr auto",gap:8,marginBottom:8,alignItems:"end"}}>
              <Inp label={i===0?"Médicament *":""} value={ligne.nom} onChange={e=>updLigneOrd(i,"nom",e.target.value)} placeholder="Amoxicilline 500mg" list="liste-medicaments-stock" />
              <Inp label={i===0?"Qté":""} value={ligne.qte} onChange={e=>updLigneOrd(i,"qte",e.target.value)} placeholder="1" />
              <Sel label={i===0?"Unité":""} value={ligne.unite} onChange={e=>updLigneOrd(i,"unite",e.target.value)} options={[{v:"",l:"—"}, ...UNITES_MEDICAMENT.map(u=>({v:u,l:u}))]} />
              <Inp label={i===0?"Posologie":""} value={ligne.posologie} onChange={e=>updLigneOrd(i,"posologie",e.target.value)} placeholder="2x/jour" />
              <Inp label={i===0?"Durée":""} value={ligne.duree} onChange={e=>updLigneOrd(i,"duree",e.target.value)} placeholder="7 jours" />
              <button onClick={()=>delLigneOrd(i)} disabled={lignesOrd.length<=1} style={{padding:"11px 10px",borderRadius:8,background:"transparent",border:`1.5px solid ${C.border}`,color:lignesOrd.length<=1?C.dim:C.red,cursor:lignesOrd.length<=1?"not-allowed":"pointer",fontSize:17,fontWeight:700,fontFamily:"inherit"}}>
                {lignesOrd.length>1?"✕":"—"}
              </button>
            </div>
          ))}
          <button onClick={addLigneOrd} style={{width:"100%",marginTop:4,padding:"8px",borderRadius:8,background:"transparent",border:`1.5px dashed ${C.border}`,color:C.muted,cursor:"pointer",fontSize:16,fontWeight:700,fontFamily:"inherit"}}>+ Nouvelle ligne</button>
          <datalist id="liste-medicaments-stock">
            {(stockMedicaments||[]).filter(s=>s.categorie==="Médicament").map(s=><option key={s.id} value={s.nom} />)}
          </datalist>
        </div>
        <Inp label="Notes / Instructions" value={oForm.notes_ord} onChange={fo("notes_ord")} placeholder="À prendre pendant les repas…" />
        <div style={{display:"flex",gap:10,marginTop:4}}>
          <Btn variant="outline" style={{flex:1}} onClick={()=>{ setShowOrd(false); setLignesOrd([{nom:"",qte:"",unite:"",posologie:"",duree:""}]); }}>Annuler</Btn>
          <Btn style={{flex:2}} loading={addOrd.isPending} onClick={()=>{
            const valides = lignesOrd.filter(l=>l.nom.trim());
            if(!valides.length){toast.error("Au moins un médicament requis");return;}
            const medicaments = valides.map(l=>`${l.nom}${l.qte?' '+l.qte:''}${l.unite?' '+l.unite:''}${l.posologie?' — '+l.posologie:''}${l.duree?' ('+l.duree+')':''}`).join('\n');
            const posologie = valides.map(l=>l.posologie).filter(Boolean).join(' | ');
            const duree = valides.map(l=>l.duree).filter(Boolean).join(' | ');
            addOrd.mutate({ medicaments, posologie, duree, notes_ord:oForm.notes_ord, patient_id:selected.id, consultation_id:consultationPourOrdonnance?.id||null });
            setLignesOrd([{nom:"",qte:"",unite:"",posologie:"",duree:""}]);
          }}>Créer l'ordonnance</Btn>
        </div>
      </Modal>

      {/* Modal: Modifier ordonnance */}
      <Modal open={showEditOrd} onClose={()=>{ setShowEditOrd(false); setOrdonnanceEnEdition(null); }} title="✏️ Modifier l'ordonnance" width={520}>
        <div style={{marginBottom:12}}>
          <label style={{fontSize:14,fontWeight:700,color:C.muted,display:"block",marginBottom:6}}>Médicaments *</label>
          <textarea value={editOrdForm.medicaments} onChange={feOrd("medicaments")} rows={4}
            style={{width:"100%",background:C.input,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",color:C.text,fontSize:15,fontFamily:"inherit",resize:"vertical"}} />
        </div>
        <Inp label="Posologie" value={editOrdForm.posologie} onChange={feOrd("posologie")} placeholder="2x/jour" />
        <Inp label="Durée" value={editOrdForm.duree} onChange={feOrd("duree")} placeholder="7 jours" />
        <Inp label="Notes / Instructions" value={editOrdForm.notes_ord} onChange={feOrd("notes_ord")} placeholder="À prendre pendant les repas…" />
        <div style={{display:"flex",gap:10,marginTop:14}}>
          <Btn variant="outline" style={{flex:1}} onClick={()=>{ setShowEditOrd(false); setOrdonnanceEnEdition(null); }}>Annuler</Btn>
          <Btn style={{flex:2}} loading={editOrdMut.isPending} onClick={()=>{
            if(!editOrdForm.medicaments.trim()){toast.error("Au moins un médicament requis");return;}
            editOrdMut.mutate(editOrdForm);
          }}>Enregistrer les modifications</Btn>
        </div>
      </Modal>

      <Modal open={showEnvoiOrd} onClose={()=>{ setShowEnvoiOrd(false); setOrdonnanceAEnvoyer(null); }} title="📤 Envoyer l'ordonnance">
        <div style={{fontSize:15,color:C.muted,marginBottom:16}}>{ordonnanceAEnvoyer?.medicaments}</div>
        <div style={{display:"flex",gap:10,marginBottom:16}}>
          <button onClick={()=>setDestinationChoisie("interne")} style={{flex:1,padding:14,borderRadius:10,cursor:"pointer",fontFamily:"inherit",fontWeight:700,fontSize:15,
            background:destinationChoisie==="interne"?"rgba(10,143,88,.12)":C.hover, border:destinationChoisie==="interne"?`1.5px solid ${C.green}`:`1.5px solid ${C.border}`, color:destinationChoisie==="interne"?C.green:C.muted}}>
            🏥 Pharmacie interne
          </button>
          <button onClick={()=>setDestinationChoisie("externe")} style={{flex:1,padding:14,borderRadius:10,cursor:"pointer",fontFamily:"inherit",fontWeight:700,fontSize:15,
            background:destinationChoisie==="externe"?"rgba(37,99,235,.12)":C.hover, border:destinationChoisie==="externe"?"1.5px solid #2563EB":`1.5px solid ${C.border}`, color:destinationChoisie==="externe"?"#2563EB":C.muted}}>
            🏪 Pharmacie externe
          </button>
        </div>
        {destinationChoisie==="externe" && (
          <Sel label="Choisir la pharmacie" value={pharmacieExterneChoisie} onChange={e=>setPharmacieExterneChoisie(e.target.value)}
            options={[{v:"",l:"— Choisir —"}, ...(pharmaciesExternes||[]).map(p=>({v:p.id,l:p.nom}))]} />
        )}
        <Btn style={{width:"100%",marginTop:8}} loading={envoyerOrdMut.isPending} disabled={destinationChoisie==="externe" && !pharmacieExterneChoisie} onClick={()=>envoyerOrdMut.mutate()}>
          Envoyer la demande de devis
        </Btn>
      </Modal>

      <Modal open={showEditConsult} onClose={()=>{ setShowEditConsult(false); setConsultationEnEdition(null); }} title="✏️ Modifier la consultation" width={640}>
        <div style={{background:"rgba(37,99,235,.07)",border:"1px solid rgba(37,99,235,.2)",borderRadius:9,padding:"10px 14px",marginBottom:16,fontSize:16,color:C.muted}}>
          Chaque champ modifié est journalisé avec la date, l'heure et la seconde exactes.
        </div>
        <div style={{maxHeight:"60vh",overflowY:"auto",paddingRight:4}}>
          {RUBRIQUES_CONSULTATION.map(rub => (
            <div key={rub.titre} style={{marginBottom:18}}>
              <div style={{fontSize:14,fontWeight:800,color:C.teal,textTransform:"uppercase",letterSpacing:".5px",marginBottom:8}}>{rub.titre}</div>
              <Grid cols={2} gap={12}>
                {rub.champs.map(([champ,label]) => (
                  <Inp key={champ} label={label} value={editForm[champ]} onChange={fe(champ)} />
                ))}
              </Grid>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:10,marginTop:14}}>
          <Btn variant="outline" style={{flex:1}} onClick={()=>{ setShowEditConsult(false); setConsultationEnEdition(null); }}>Annuler</Btn>
          <Btn style={{flex:2}} loading={updConsultMut.isPending} onClick={()=>updConsultMut.mutate(editForm)}>Enregistrer les modifications</Btn>
        </div>
      </Modal>

      <Modal open={showDossierMedical} onClose={()=>{ setShowDossierMedical(false); setConsultationEnLecture(null); }} title={`📄 Consultation du ${consultationEnLecture?fmtDate(consultationEnLecture.created_at):""}`} width={640}>
        {consultationEnLecture && (
          <div style={{maxHeight:"65vh",overflowY:"auto",paddingRight:4}}>
            <div style={{fontSize:16,color:C.muted,marginBottom:16}}>Médecin : {consultationEnLecture.medecin_nom||"—"}</div>
            {RUBRIQUES_CONSULTATION.map(rub => {
              const rempli = rub.champs.filter(([champ]) => consultationEnLecture[champ]);
              if (!rempli.length) return null;
              return (
                <div key={rub.titre} style={{marginBottom:18}}>
                  <div style={{fontSize:14,fontWeight:800,color:C.teal,textTransform:"uppercase",letterSpacing:".5px",marginBottom:8}}>{rub.titre}</div>
                  {rempli.map(([champ,label]) => (
                    <div key={champ} style={{marginBottom:8,background:C.hover,borderRadius:8,padding:"8px 12px"}}>
                      <div style={{fontSize:13,color:C.dim,fontWeight:700,textTransform:"uppercase",marginBottom:2}}>{label}</div>
                      <div style={{fontSize:17,color:C.text}}>{consultationEnLecture[champ]}</div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
        <div style={{display:"flex",gap:10,marginTop:14}}>
          <Btn variant="outline" style={{flex:1}} onClick={()=>{ setShowDossierMedical(false); setConsultationEnLecture(null); }}>Fermer</Btn>
        </div>
      </Modal>

      <Modal open={showExamen} onClose={()=>{ setShowExamen(false); setPatientCible(null); setErreurRecherche(""); }} title="🔬 Demander un examen" width={520}>
        {!patientCible ? (
          <div>
            <Inp label="Code dossier du patient *" value={codeRecherche}
              onChange={e=>{ setCodeRecherche(e.target.value); setErreurRecherche(""); }}
              placeholder="MC-XX-0000" />
            {erreurRecherche && <div style={{fontSize:16,color:C.red,marginBottom:10}}>{erreurRecherche}</div>}
            <div style={{display:"flex",gap:10,marginTop:4}}>
              <Btn variant="outline" style={{flex:1}} onClick={()=>setShowExamen(false)}>Annuler</Btn>
              <Btn style={{flex:2}} loading={rechercheEnCours} onClick={rechercherParCode}>🔎 Rechercher</Btn>
            </div>
          </div>
        ) : (
          <div>
            <div style={{background:"rgba(10,143,88,.1)",border:"1px solid rgba(10,143,88,.3)",borderRadius:9,padding:"10px 14px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:17,fontWeight:700,color:C.text}}>✓ {patientCible.prenom} {patientCible.nom}</div>
                <div style={{fontSize:14,color:C.muted}}>Dossier : {patientCible.code_secret||"—"}</div>
              </div>
              {patientCible.id!==selected?.id && (
                <button type="button" onClick={()=>{ setPatientCible(null); setCodeRecherche(""); }}
                  style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:17}}>✕</button>
              )}
            </div>
            <Sel label="Catégorie" value={examenForm.categorie}
              onChange={e=>setExamenForm(p=>({...p,categorie:e.target.value,types:[TYPES_EXAMEN[e.target.value][0]],destinataire_id:""}))}
              options={[{v:"laboratoire",l:"🧪 Laboratoire"},{v:"imagerie",l:"🩻 Imagerie médicale"}]} />
            <div style={{marginBottom:14}}>
              <label style={{display:"block",fontSize:14,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".5px",marginBottom:8}}>
                Types d'examen * ({examenForm.types.length} sélectionné{examenForm.types.length>1?"s":""})
              </label>
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                {TYPES_EXAMEN[examenForm.categorie].map(t=>{
                  const actif = examenForm.types.includes(t);
                  return (
                    <button key={t} type="button" onClick={()=>toggleTypeExamen(t)}
                      style={{
                        border:`1.5px solid ${actif?C.teal:C.border}`,
                        background: actif?"rgba(13,148,136,.15)":"transparent",
                        color: actif?C.teal:C.muted,
                        borderRadius:20, padding:"6px 14px", fontSize:14, fontWeight:700,
                        cursor:"pointer", fontFamily:"inherit",
                      }}>
                      {actif?"✓ ":""}{t}
                    </button>
                  );
                })}
              </div>
            </div>
            <Sel label={examenForm.categorie==="laboratoire"?"Laboratoire destinataire *":"Service d'imagerie destinataire *"}
              value={examenForm.destinataire_id}
              onChange={e=>setExamenForm(p=>({...p,destinataire_id:e.target.value}))}
              options={[{v:"",l:"— Sélectionner —"}, ...((examenForm.categorie==="laboratoire"?laboratoiresDisponibles:imageriesDisponibles)||[]).map(e=>({v:e.id,l:e.nom}))]} />
            <Inp label="Notes pour le service (optionnel)" value={examenForm.notes}
              onChange={e=>setExamenForm(p=>({...p,notes:e.target.value}))}
              placeholder="Contexte clinique, urgence, elements a rechercher…" rows={3} />
            <div style={{marginBottom:14}}>
              <label style={{display:"block",fontSize:14,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".5px",marginBottom:5}}>Prescription (optionnel)</label>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e=>setFichierPrescription(e.target.files?.[0]||null)}
                style={{fontSize:16,color:C.muted}} />
              {fichierPrescription && <div style={{fontSize:14,color:C.green,marginTop:4}}>📎 {fichierPrescription.name}</div>}
            </div>
            <div style={{display:"flex",gap:10,marginTop:4}}>
              <Btn variant="outline" style={{flex:1}} onClick={()=>{ setShowExamen(false); setPatientCible(null); setFichierPrescription(null); }}>Annuler</Btn>
              <Btn style={{flex:2}} loading={envoiMultipleEnCours||uploadPrescriptionEnCours} onClick={async ()=>{
                if (examenForm.types.length===0) { toast.error("Sélectionnez au moins un type d'examen"); return; }
                if (!examenForm.destinataire_id) { toast.error(examenForm.categorie==="laboratoire"?"Sélectionnez un laboratoire destinataire":"Sélectionnez un service d'imagerie destinataire"); return; }
                let prescriptionUrl = null, prescriptionNom = null;
                if (fichierPrescription) {
                  try {
                    setUploadPrescriptionEnCours(true);
                    prescriptionUrl = await uploadPrescriptionVersCloudinary(fichierPrescription);
                    prescriptionNom = fichierPrescription.name;
                  } catch(err) {
                    toast.error(err.message || "Echec de l'envoi du fichier");
                    setUploadPrescriptionEnCours(false);
                    return;
                  }
                  setUploadPrescriptionEnCours(false);
                }
                // Un bulletin par type d'examen selectionne -- chaque type
                // suit son propre statut/rapport cote labo (une NFS peut
                // etre traitee avant une glycemie), donc une ligne par type
                // plutot qu'un seul bulletin fourre-tout.
                setEnvoiMultipleEnCours(true);
                try {
                  // Identifiant de lot partage entre tous les examens de cet
                  // envoi -- permet de les regrouper visuellement (une seule
                  // carte au lieu d'une ligne par examen). Un envoi a un seul
                  // type reste isole (pas de groupe_id), comportement inchange.
                  const groupeId = examenForm.types.length > 1
                    ? (crypto?.randomUUID ? crypto.randomUUID() : `grp-${Date.now()}-${Math.random().toString(36).slice(2,8)}`)
                    : undefined;
                  await Promise.all(examenForm.types.map(t => demanderExamen.mutateAsync({
                    type: t,
                    categorie: examenForm.categorie,
                    patient_id: patientCible.id,
                    patient_nom: `${patientCible.prenom} ${patientCible.nom}`,
                    emetteur_nom: selected ? `Dr. clinique` : undefined,
                    notes: examenForm.notes || null,
                    labo_id: examenForm.categorie==="laboratoire" ? examenForm.destinataire_id : undefined,
                    imagerie_id: examenForm.categorie==="imagerie" ? examenForm.destinataire_id : undefined,
                    groupe_id: groupeId,
                    fichier_prescription_url: prescriptionUrl,
                    fichier_prescription_nom: prescriptionNom,
                  })));
                  const n = examenForm.types.length;
                  toast.success(`${n} demande${n>1?"s":""} envoyée${n>1?"s":""} au service`);
                  qc.invalidateQueries(["cl-examens",selected?.id]);
                  setShowExamen(false); setPatientCible(null); setCodeRecherche("");
                  setExamenForm({ categorie:"laboratoire", types:["NFS"], destinataire_id:"", notes:"" });
                } catch(err) {
                  toast.error("Erreur lors de l'envoi d'une des demandes");
                } finally {
                  setEnvoiMultipleEnCours(false);
                }
                setFichierPrescription(null);
              }}>{uploadPrescriptionEnCours?'📎 Envoi du fichier…':envoiMultipleEnCours?'📤 Envoi en cours…':`📤 Envoyer ${examenForm.types.length>1?`(${examenForm.types.length})`:"la demande"}`}</Btn>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!groupeActif} onClose={()=>setGroupeActif(null)} title="🔬 Détail des examens du lot" width={640}>
        {groupeActif && (
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr style={{textAlign:"left",fontSize:12,color:C.muted,textTransform:"uppercase"}}>
                <th style={{padding:"6px 8px"}}>Examen</th>
                <th style={{padding:"6px 8px"}}>Statut</th>
                <th style={{padding:"6px 8px"}}>Résultat</th>
                <th style={{padding:"6px 8px"}}>Norme</th>
                <th style={{padding:"6px 8px"}}>Partage</th>
              </tr>
            </thead>
            <tbody>
              {groupeActif.items.map(i=>(
                <tr key={i.id} style={{borderTop:`1px solid ${C.border}`}}>
                  <td style={{padding:"8px",fontWeight:700,color:C.text}}>{i.type_analyse||i.type_examen}</td>
                  <td style={{padding:"8px"}}><Badge color={i.statut==="valide"?"green":i.statut==="en_attente"?"amber":"gray"}>{i.statut||"—"}</Badge></td>
                  <td style={{padding:"8px",color:C.text}}>{i.interpretation||i.resultat||"—"}</td>
                  <td style={{padding:"8px",color:C.muted}}>{i.norme||"—"}</td>
                  <td style={{padding:"8px"}}>
                    <button onClick={()=>partagerBulletinMut.mutate({id:i.id, partage:!i.partage_reseau})}
                      style={{padding:"3px 8px",background:i.partage_reseau?"rgba(37,99,235,.12)":"rgba(255,255,255,.06)",border:i.partage_reseau?"1px solid rgba(37,99,235,.35)":`1px solid ${C.border}`,borderRadius:6,color:i.partage_reseau?"#2563EB":C.muted,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                      {i.partage_reseau?"🌐":"🔒"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
  const [form, setForm] = useState({ prenom:"", nom:"", specialite:"", telephone:"", email:"", password:"", tarif:"", experience_ans:"", statut:"Disponible", jours_travail:"Lun,Mar,Mer,Jeu,Ven", horaires_debut:"08:00", horaires_fin:"17:00" });
  const [pForm, setPForm] = useState({ nom:"", poste:"", contrat:"CDI", salaire:"", date_embauche:"", statut:"Actif" });
  const [compteForm, setCompteForm] = useState({ prenom:"", nom:"", email:"", password:"", telephone:"", sous_role:"bureau_entrees" });
  const [showEdit, setShowEdit] = useState(false);
  const [medecinEdit, setMedecinEdit] = useState(null);
  const [editForm, setEditForm] = useState({ prenom:"", nom:"", specialite:"", telephone:"", email:"", tarif:"", experience_ans:"", jours_travail:"", horaires_debut:"", horaires_fin:"" });
  const [showEditPersonnel, setShowEditPersonnel] = useState(false);
  const [personnelEdit, setPersonnelEdit] = useState(null);
  const [editCompteForm, setEditCompteForm] = useState({ prenom:"", nom:"", email:"", telephone:"", sous_role:"bureau_entrees" });
  const [showResetPwd, setShowResetPwd] = useState(false);
  const [personnelResetPwd, setPersonnelResetPwd] = useState(null);
  const [newPwdForm, setNewPwdForm] = useState({ nouveau_mot_de_passe:"", confirmation:"" });

  const { data, isLoading } = useQuery({ queryKey:["cl-medecins"], queryFn:()=>cAPI.medecins().then(r=>r.data||[]) });
  const medecins = data||[];

  const addMut = useMutation({ mutationFn:d=>cAPI.addMedecin(d), onSuccess:()=>{ toast.success("Médecin ajouté !"); qc.invalidateQueries(["cl-medecins"]); setShowAdd(false); }, onError:()=>toast.error("Erreur") });
  const updMut = useMutation({ mutationFn:({id,...d})=>cAPI.updateMedecin(id,d), onSuccess:()=>{ toast.success("Statut mis à jour"); qc.invalidateQueries(["cl-medecins"]); }, onError:()=>toast.error("Erreur") });
  const editMut = useMutation({ mutationFn:({id,...d})=>cAPI.updateMedecin(id,d), onSuccess:()=>{ toast.success("Médecin modifié !"); qc.invalidateQueries(["cl-medecins"]); setShowEdit(false); setMedecinEdit(null); }, onError:()=>toast.error("Erreur lors de la modification") });
  const deleteMut = useMutation({ mutationFn:id=>cAPI.deleteMedecin(id), onSuccess:()=>{ toast.success("Médecin supprimé"); qc.invalidateQueries(["cl-medecins"]); }, onError:()=>toast.error("Erreur lors de la suppression") });

  const { data: personnelData, isLoading: chargementPersonnel } = useQuery({
    queryKey:["cl-personnel"], queryFn:()=>cAPI.personnel().then(r=>r.data||[]),
  });
  const personnel = personnelData||[];
  const addCompteMut = useMutation({
    mutationFn: d => cAPI.addPersonnel(d),
    onSuccess: () => { toast.success("Compte créé !"); qc.invalidateQueries(["cl-personnel"]); setShowPersonnel(false); setCompteForm({ prenom:"", nom:"", email:"", password:"", telephone:"", sous_role:"bureau_entrees" }); },
    onError: e => toast.error(e?.response?.data?.message || "Erreur lors de la création du compte"),
  });
  const toggleCompteMut = useMutation({
    mutationFn: ({id,is_active}) => cAPI.updPersonnel(id,{is_active}),
    onSuccess: () => { toast.success("Statut mis à jour"); qc.invalidateQueries(["cl-personnel"]); },
    onError: () => toast.error("Erreur"),
  });
  const editPersonnelMut = useMutation({
    mutationFn: ({id,...d}) => cAPI.updPersonnel(id,d),
    onSuccess: () => { toast.success("Compte modifié !"); qc.invalidateQueries(["cl-personnel"]); setShowEditPersonnel(false); setPersonnelEdit(null); },
    onError: e => toast.error(e?.response?.data?.message || "Erreur lors de la modification"),
  });
  const deletePersonnelMut = useMutation({
    mutationFn: id => cAPI.deletePersonnel(id),
    onSuccess: () => { toast.success("Compte supprimé"); qc.invalidateQueries(["cl-personnel"]); },
    onError: e => toast.error(e?.response?.data?.message || "Erreur lors de la suppression"),
  });
  const resetPwdMut = useMutation({
    mutationFn: d => cAPI.resetPasswordPersonnel(personnelResetPwd.id, d),
    onSuccess: () => { toast.success("Mot de passe réinitialisé !"); setShowResetPwd(false); setPersonnelResetPwd(null); setNewPwdForm({ nouveau_mot_de_passe:"", confirmation:"" }); },
    onError: e => toast.error(e?.response?.data?.message || "Erreur lors de la réinitialisation"),
  });
  const LABEL_SOUS_ROLE = { bureau_entrees:"Bureau des entrées", medecin:"Médecin", finance:"Finance / Caisse", rh:"RH / Administration", pharmacien:"Pharmacien", laboratoire:"Laboratoire", radiologie:"Radiologie" };
  const COULEUR_SOUS_ROLE = { bureau_entrees:"blue", medecin:"green", finance:"amber", rh:"purple", pharmacien:"teal", laboratoire:"purple", radiologie:"blue" };

  const f = k => e => setForm(p=>({...p,[k]:e.target.value}));
  const fp = k => e => setPForm(p=>({...p,[k]:e.target.value}));
  const fe = k => e => setEditForm(p=>({...p,[k]:e.target.value}));
  const ouvrirEdition = (m) => {
    setMedecinEdit(m);
    setEditForm({ prenom:m.prenom||"", nom:m.nom||"", specialite:m.specialite||"", telephone:m.telephone||"", email:m.email||"", tarif:m.tarif||"", experience_ans:m.experience_ans||"", jours_travail:m.jours_travail||"Lun,Mar,Mer,Jeu,Ven", horaires_debut:m.horaires_debut||"08:00", horaires_fin:m.horaires_fin||"17:00" });
    setShowEdit(true);
  };
  const fep = k => e => setEditCompteForm(p=>({...p,[k]:e.target.value}));
  const ouvrirEditionPersonnel = (p) => {
    setPersonnelEdit(p);
    setEditCompteForm({ prenom:p.prenom||"", nom:p.nom||"", email:p.email||"", telephone:p.telephone||"", sous_role:p.sous_role||"bureau_entrees" });
    setShowEditPersonnel(true);
  };
  const ouvrirResetPwd = (p) => {
    setPersonnelResetPwd(p);
    setNewPwdForm({ nouveau_mot_de_passe:"", confirmation:"" });
    setShowResetPwd(true);
  };

  const SPECS = ["Médecine générale","Cardiologie","Pédiatrie","Gynécologie","Neurologie","Dermatologie","ORL","Ophtalmologie","Orthopédie","Psychiatrie","Radiologie","Chirurgie"];
  const CONTRATS = ["CDI","CDD","Vacation","Libéral","Stage"];
  const POSTES = ["Médecin","Infirmier(e)","Sage-femme","Technicien labo","Aide-soignant","Administratif","Comptable","Agent sécurité"];

  const RH_TABS = [
    { key:"medecins", label:"Médecins" },
    { key:"personnel", label:"Personnel RH" },
    { key:"conges", label:"Congés" },
    { key:"evaluations", label:"Évaluations" },
    { key:"formations", label:"Formations" },
    { key:"profil", label:"Profil & Logo" },
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
            style={{ flex:1, background:tab===t.key?C.hover:"transparent", border:"none", borderRadius:8, padding:"9px 4px", cursor:"pointer", fontFamily:"inherit", color:tab===t.key?C.text:C.muted, fontSize:16, fontWeight:tab===t.key?700:400 }}>
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
                    <div style={{ width:48, height:48, background:`linear-gradient(135deg,#7C3AED,#0D9488)`, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, color:"#fff", fontSize:21 }}>
                      {m.prenom?.[0]}{m.nom?.[0]}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:18, fontWeight:700, color:C.text }}>Dr. {m.prenom} {m.nom}</div>
                      <div style={{ fontSize:16, color:C.muted }}>{m.specialite||"—"}</div>
                    </div>
                    <Badge color={{ Disponible:"green", "En consultation":"teal", Absent:"red" }[m.statut]||"gray"}>{m.statut}</Badge>
                    <Badge color={m.compte_id ? (m.compte_actif ? "green" : "amber") : "gray"} style={{marginLeft:6}}>
                      {m.compte_id ? (m.compte_actif ? "🔑 Compte actif" : "🔒 Compte désactivé") : "❌ Pas de compte"}
                    </Badge>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12, fontSize:16 }}>
                    {[["💰 Tarif",`${fmt(m.tarif)} F`],["⏱️ Expérience",`${m.experience_ans||"—"} ans`],["📞 Tel",m.telephone||"—"],["🕐 Horaires",`${m.horaires_debut||"—"}–${m.horaires_fin||"—"}`]].map(([k,v])=>(
                      <div key={k} style={{ background:C.hover, borderRadius:7, padding:"7px 10px" }}>
                        <div style={{ fontSize:13, color:C.dim, marginBottom:2 }}>{k}</div>
                        <div style={{ color:C.text, fontWeight:600 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {m.jours_travail && <div style={{ fontSize:14, color:C.muted, marginBottom:12 }}>Jours : {m.jours_travail}</div>}
                  <div style={{ display:"flex", gap:8 }}>
                    <Btn variant="outline" style={{flex:1,padding:"6px",fontSize:14,color:C.green}} onClick={()=>updMut.mutate({id:m.id,statut:"Disponible"})}>✓ Disponible</Btn>
                    <Btn variant="outline" style={{flex:1,padding:"6px",fontSize:14,color:C.amber}} onClick={()=>updMut.mutate({id:m.id,statut:"En consultation"})}>🩺 Consult.</Btn>
                    <Btn variant="outline" style={{flex:1,padding:"6px",fontSize:14,color:C.red}} onClick={()=>updMut.mutate({id:m.id,statut:"Absent"})}>Absent</Btn>
                  </div>
                  <div style={{ display:"flex", gap:8, marginTop:8 }}>
                    <Btn variant="outline" style={{flex:1,padding:"6px",fontSize:14}} onClick={()=>ouvrirEdition(m)}>✏️ Modifier</Btn>
                    <Btn variant="outline" style={{flex:1,padding:"6px",fontSize:14,color:C.red}} loading={deleteMut.isPending} onClick={()=>{
                      if(window.confirm(`Supprimer Dr. ${m.prenom} ${m.nom} ? Cette action est irréversible.`)) deleteMut.mutate(m.id);
                    }}>🗑️ Supprimer</Btn>
                  </div>
                </Panel>
              ))}
            </div>
          }
        </>
      )}

      {/* Tab: Personnel RH */}
      {tab==="personnel" && (
        <Panel title="Comptes du personnel et rôles">
          <Grid cols={4} gap={14} style={{marginBottom:20}}>
            <Card label="Comptes créés" value={personnel.length} icon="👥" color={C.blue} />
            {Object.entries(LABEL_SOUS_ROLE).map(([k,l])=>(
              <Card key={k} label={l} value={personnel.filter(p=>p.sous_role===k).length} icon="🔑" color={C.teal} />
            ))}
          </Grid>
          {chargementPersonnel ? <Loader/> : personnel.length===0
            ? <Empty icon="👥" title="Aucun compte de personnel" subtitle="Créez un compte pour le bureau des entrées, un médecin, la finance ou la RH."/>
            : <Table columns={[
                { key:"prenom", label:"Nom", render:(v,row)=>(
                  <div>
                    <span style={{fontWeight:700}}>{row.prenom} {row.nom}</span>
                    {row.medecin_id && <div style={{fontSize:12,color:C.dim}}>🩺 {row.medecin_specialite||"—"}{row.medecin_tarif?` · ${fmt(row.medecin_tarif)} F`:""}</div>}
                  </div>
                ) },
                { key:"email", label:"Email" },
                { key:"sous_role", label:"Rôle", render:v=><Badge color={COULEUR_SOUS_ROLE[v]||"gray"}>{LABEL_SOUS_ROLE[v]||v}</Badge> },
                { key:"is_active", label:"Statut", render:v=><Badge color={v?"green":"red"}>{v?"Actif":"Désactivé"}</Badge> },
                { key:"id", label:"Actions", render:(v,row)=>(
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    <Btn variant="outline" style={{padding:"4px 10px",fontSize:14}}
                      onClick={()=>toggleCompteMut.mutate({id:row.id, is_active:!row.is_active})}>
                      {row.is_active?"Désactiver":"Activer"}
                    </Btn>
                    <Btn variant="outline" style={{padding:"4px 10px",fontSize:14}} onClick={()=>ouvrirEditionPersonnel(row)}>✏️ Modifier</Btn>
                    <Btn variant="outline" style={{padding:"4px 10px",fontSize:14,color:C.amber}} onClick={()=>ouvrirResetPwd(row)}>🔑 Mot de passe</Btn>
                    <Btn variant="outline" style={{padding:"4px 10px",fontSize:14,color:C.red}} loading={deletePersonnelMut.isPending} onClick={()=>{
                      if(window.confirm(`Supprimer le compte de ${row.prenom} ${row.nom} ? Cette action est irréversible.`)) deletePersonnelMut.mutate(row.id);
                    }}>🗑️ Supprimer</Btn>
                  </div>
                )},
              ]} rows={personnel} />
          }
        </Panel>
      )}

      {/* Tab: Congés */}
      {tab==="conges" && (
        <Panel title="Demandes de congé" actions={<Btn style={{padding:"6px 14px",fontSize:16}}>+ Demande</Btn>}>
          <Table columns={[
            { key:"employe", label:"Employé", render:v=><span style={{fontWeight:700}}>{v}</span> },
            { key:"type", label:"Type de congé" },
            { key:"debut", label:"Début", render:v=>fmtDate(v) },
            { key:"fin", label:"Fin", render:v=>fmtDate(v) },
            { key:"jours", label:"Durée", render:v=>`${v} j` },
            { key:"statut", label:"Statut", render:v=><Badge color={{ approuve:"green", en_attente:"amber", refuse:"red" }[v]||"gray"}>{v}</Badge> },
            { key:"id", label:"Actions", render:()=>(
              <div style={{display:"flex",gap:6}}>
                <Btn variant="outline" style={{padding:"4px 10px",fontSize:14,color:C.green}} onClick={()=>toast.success("Approuvé !")}>✓</Btn>
                <Btn variant="outline" style={{padding:"4px 10px",fontSize:14,color:C.red}} onClick={()=>toast.error("Refusé")}>✕</Btn>
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

      {/* Tab: Profil & Logo (identite visuelle + mon mot de passe) */}
      {tab==="profil" && <PageProfilLogo />}

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
        <div style={{background:C.hover,borderRadius:10,padding:12,marginTop:8}}>
          <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:8}}>🔐 Compte de connexion (facultatif)</div>
          <div style={{fontSize:12,color:C.muted,marginBottom:8}}>Si renseigné, le médecin pourra se connecter à l'application avec cet email.</div>
          <Inp label="Mot de passe temporaire" type="password" value={form.password} onChange={f("password")} placeholder="Min. 6 caractères — laisser vide pour ne pas créer de compte" />
        </div>
        <div style={{display:"flex",gap:10,marginTop:4}}>
          <Btn variant="outline" style={{flex:1}} onClick={()=>setShowAdd(false)}>Annuler</Btn>
          <Btn style={{flex:2}} loading={addMut.isPending} onClick={()=>{
            if(!form.prenom||!form.nom||!form.specialite){toast.error("Champs requis manquants");return;}
            if(form.password && form.password.length<6){toast.error("Mot de passe : 6 caractères minimum, ou laissez le champ vide");return;}
            if(form.password && !form.email){toast.error("Un email est requis pour créer le compte de connexion");return;}
            addMut.mutate(form);
          }}>Ajouter le médecin</Btn>
        </div>
      </Modal>

      {/* Modal: Modifier médecin */}
      <Modal open={showEdit} onClose={()=>{ setShowEdit(false); setMedecinEdit(null); }} title={`✏️ Modifier — Dr. ${medecinEdit?.prenom||""} ${medecinEdit?.nom||""}`} width={560}>
        <Grid cols={2} gap={12}>
          <Inp label="Prénom *" required value={editForm.prenom} onChange={fe("prenom")} placeholder="Amadou" />
          <Inp label="Nom *" required value={editForm.nom} onChange={fe("nom")} placeholder="Koné" />
        </Grid>
        <Sel label="Spécialité *" required value={editForm.specialite} onChange={fe("specialite")} options={["",...SPECS]} />
        <Grid cols={2} gap={12}>
          <Inp label="Téléphone" value={editForm.telephone} onChange={fe("telephone")} placeholder="+225 07 00 00 00 00" type="tel" />
          <Inp label="Email" value={editForm.email} onChange={fe("email")} placeholder="dr@exemple.com" type="email" />
          <Inp label="Tarif consultation (FCFA)" value={editForm.tarif} onChange={fe("tarif")} placeholder="15000" type="number" />
          <Inp label="Années d'expérience" value={editForm.experience_ans} onChange={fe("experience_ans")} placeholder="10" type="number" />
          <Inp label="Heure début" value={editForm.horaires_debut} onChange={fe("horaires_debut")} type="time" />
          <Inp label="Heure fin" value={editForm.horaires_fin} onChange={fe("horaires_fin")} type="time" />
        </Grid>
        <Inp label="Jours de travail" value={editForm.jours_travail} onChange={fe("jours_travail")} placeholder="Lun,Mar,Mer,Jeu,Ven" />
        <div style={{display:"flex",gap:10,marginTop:14}}>
          <Btn variant="outline" style={{flex:1}} onClick={()=>{ setShowEdit(false); setMedecinEdit(null); }}>Annuler</Btn>
          <Btn style={{flex:2}} loading={editMut.isPending} onClick={()=>{
            if(!editForm.prenom||!editForm.nom||!editForm.specialite){toast.error("Champs requis manquants");return;}
            editMut.mutate({ id:medecinEdit.id, ...editForm });
          }}>Enregistrer les modifications</Btn>
        </div>
      </Modal>

      {/* Modal: Nouveau personnel */}
      <Modal open={showPersonnel} onClose={()=>setShowPersonnel(false)} title="👥 Nouveau compte du personnel" width={520}>
        <Grid cols={2} gap={12}>
          <Inp label="Prénom *" required value={compteForm.prenom} onChange={e=>setCompteForm(p=>({...p,prenom:e.target.value}))} placeholder="Adjoua" />
          <Inp label="Nom *" required value={compteForm.nom} onChange={e=>setCompteForm(p=>({...p,nom:e.target.value}))} placeholder="Koné" />
        </Grid>
        <Inp label="Email de connexion *" required type="email" value={compteForm.email} onChange={e=>setCompteForm(p=>({...p,email:e.target.value}))} placeholder="adjoua.kone@clinique.ci" />
        <Grid cols={2} gap={12}>
          <Inp label="Mot de passe temporaire *" required type="password" value={compteForm.password} onChange={e=>setCompteForm(p=>({...p,password:e.target.value}))} placeholder="Min. 6 caractères" />
          <Inp label="Téléphone" value={compteForm.telephone} onChange={e=>setCompteForm(p=>({...p,telephone:e.target.value}))} placeholder="+225 07 00 00 00" />
        </Grid>
        <Sel label="Rôle dans la clinique *" value={compteForm.sous_role} onChange={e=>setCompteForm(p=>({...p,sous_role:e.target.value}))}
          options={[
            {v:"bureau_entrees", l:"🚶 Bureau des entrées — RDV, dossiers, caisse, facturation"},
            {v:"medecin",        l:"🩺 Médecin — dossier médical complet"},
            {v:"finance",        l:"💰 Finance — caisse, facturation, assurances"},
            {v:"rh",             l:"👔 RH / Administration — personnel, contrats"},
          ]} />
        <div style={{display:"flex",gap:10,marginTop:4}}>
          <Btn variant="outline" style={{flex:1}} onClick={()=>setShowPersonnel(false)}>Annuler</Btn>
          <Btn style={{flex:2}} loading={addCompteMut.isPending} onClick={()=>{
            if(!compteForm.prenom||!compteForm.nom||!compteForm.email||!compteForm.password){ toast.error("Prénom, nom, email et mot de passe requis"); return; }
            if(compteForm.password.length<6){ toast.error("Mot de passe : 6 caractères minimum"); return; }
            addCompteMut.mutate(compteForm);
          }}>Créer le compte</Btn>
        </div>
      </Modal>

      {/* Modal: Modifier personnel */}
      <Modal open={showEditPersonnel} onClose={()=>{ setShowEditPersonnel(false); setPersonnelEdit(null); }} title={`✏️ Modifier — ${personnelEdit?.prenom||""} ${personnelEdit?.nom||""}`} width={520}>
        <Grid cols={2} gap={12}>
          <Inp label="Prénom *" required value={editCompteForm.prenom} onChange={fep("prenom")} placeholder="Adjoua" />
          <Inp label="Nom *" required value={editCompteForm.nom} onChange={fep("nom")} placeholder="Koné" />
        </Grid>
        <Inp label="Email de connexion *" required type="email" value={editCompteForm.email} onChange={fep("email")} placeholder="adjoua.kone@clinique.ci" />
        <Inp label="Téléphone" value={editCompteForm.telephone} onChange={fep("telephone")} placeholder="+225 07 00 00 00" />
        <Sel label="Rôle dans la clinique *" value={editCompteForm.sous_role} onChange={fep("sous_role")}
          options={[
            {v:"bureau_entrees", l:"🚶 Bureau des entrées — RDV, dossiers, caisse, facturation"},
            {v:"medecin",        l:"🩺 Médecin — dossier médical complet"},
            {v:"finance",        l:"💰 Finance — caisse, facturation, assurances"},
            {v:"rh",             l:"👔 RH / Administration — personnel, contrats"},
          ]} />
        <div style={{display:"flex",gap:10,marginTop:14}}>
          <Btn variant="outline" style={{flex:1}} onClick={()=>{ setShowEditPersonnel(false); setPersonnelEdit(null); }}>Annuler</Btn>
          <Btn style={{flex:2}} loading={editPersonnelMut.isPending} onClick={()=>{
            if(!editCompteForm.prenom||!editCompteForm.nom||!editCompteForm.email){toast.error("Prénom, nom et email requis");return;}
            editPersonnelMut.mutate({ id:personnelEdit.id, ...editCompteForm });
          }}>Enregistrer les modifications</Btn>
        </div>
      </Modal>

      {/* Modal: Réinitialiser mot de passe (admin, sans ancien mdp) */}
      <Modal open={showResetPwd} onClose={()=>{ setShowResetPwd(false); setPersonnelResetPwd(null); }} title={`🔑 Réinitialiser le mot de passe — ${personnelResetPwd?.prenom||""} ${personnelResetPwd?.nom||""}`} width={480}>
        <div style={{background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.25)",borderRadius:9,padding:"10px 14px",marginBottom:16,fontSize:15,color:C.muted}}>
          Le nouveau mot de passe prend effet immédiatement. Communiquez-le à la personne concernée en toute sécurité.
        </div>
        <Inp label="Nouveau mot de passe *" type="password" value={newPwdForm.nouveau_mot_de_passe} onChange={e=>setNewPwdForm(p=>({...p,nouveau_mot_de_passe:e.target.value}))} placeholder="Min. 6 caractères" />
        <Inp label="Confirmer le mot de passe *" type="password" value={newPwdForm.confirmation} onChange={e=>setNewPwdForm(p=>({...p,confirmation:e.target.value}))} placeholder="Retaper le mot de passe" />
        <div style={{display:"flex",gap:10,marginTop:14}}>
          <Btn variant="outline" style={{flex:1}} onClick={()=>{ setShowResetPwd(false); setPersonnelResetPwd(null); }}>Annuler</Btn>
          <Btn style={{flex:2}} loading={resetPwdMut.isPending} onClick={()=>{
            if(!newPwdForm.nouveau_mot_de_passe||newPwdForm.nouveau_mot_de_passe.length<6){toast.error("Mot de passe : 6 caractères minimum");return;}
            if(newPwdForm.nouveau_mot_de_passe!==newPwdForm.confirmation){toast.error("Les deux mots de passe ne correspondent pas");return;}
            resetPwdMut.mutate({ nouveau_mot_de_passe:newPwdForm.nouveau_mot_de_passe });
          }}>Réinitialiser</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  5. PAGE STOCK — FOURNITURES MÉDICALES
// ════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════
//  PHARMACIE INTERNE -- ordonnances recues, devis chiffre depuis le
//  vrai stock, dispensation (seul moment ou le stock est decremente).
// ══════════════════════════════════════════════════════════════════
function PagePharmacieInterne() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("ordonnances");
  const [ordonnanceActive, setOrdonnanceActive] = useState(null);
  const [lignesDevis, setLignesDevis] = useState([]);

  const { data: ordonnances, isLoading } = useQuery({
    queryKey: ["cl-pharma-interne-ords"],
    queryFn: () => api.get("/pharmacie-interne/ordonnances").then(r => r.data || []),
  });
  const { data: stockDispo } = useQuery({
    queryKey: ["cl-pharma-interne-stock"],
    queryFn: () => cAPI.stock().then(r => r.data || []),
  });

  const devisMut = useMutation({
    mutationFn: () => api.post(`/ordonnances/${ordonnanceActive.id}/devis`, { lignes: lignesDevis.filter(l=>l.stock_id) }),
    onSuccess: () => { toast.success("Devis préparé !"); qc.invalidateQueries(["cl-pharma-interne-ords"]); setOrdonnanceActive(null); setLignesDevis([]); },
    onError: e => toast.error(e?.response?.data?.message || "Erreur"),
  });
  const dispenserMut = useMutation({
    mutationFn: (id) => api.post(`/ordonnances/${id}/dispenser`),
    onSuccess: () => { toast.success("Ordonnance dispensée, stock mis à jour !"); qc.invalidateQueries(["cl-pharma-interne-ords"]); qc.invalidateQueries(["cl-pharma-interne-stock"]); },
    onError: e => toast.error(e?.response?.data?.message || "Erreur lors de la dispensation"),
  });

  const ouvrirDevis = (o) => { setOrdonnanceActive(o); setLignesDevis([{ stock_id:"", quantite:1 }]); };
  const ajouterLigne = () => setLignesDevis(l => [...l, { stock_id:"", quantite:1 }]);
  const majLigne = (i, k, v) => setLignesDevis(l => l.map((row,j) => j===i ? {...row,[k]:v} : row));
  const retirerLigne = (i) => setLignesDevis(l => l.filter((_,j) => j!==i));

  const STATUT_ORD = {
    envoyee:{l:"En attente de devis",c:"amber"}, devis_pret:{l:"Devis prêt",c:"blue"}, dispensee:{l:"Dispensée",c:"green"},
  };

  return (
    <div>
      <PageHeader title="💊 Pharmacie interne" subtitle="Ordonnances reçues, devis, dispensation et stock" />
      <div style={{ display:"flex", gap:4, background:C.input, borderRadius:10, padding:4, marginBottom:20 }}>
        {[["ordonnances","Ordonnances"],["stock","Stock"]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)}
            style={{ flex:1, background:tab===k?C.hover:"transparent", border:"none", borderRadius:8, padding:"9px 4px", cursor:"pointer", fontFamily:"inherit", color:tab===k?C.text:C.muted, fontSize:16, fontWeight:tab===k?700:400 }}>
            {l}
          </button>
        ))}
      </div>
      {tab==="stock" ? <PageStock /> : (
      <>
      <Panel>
        {isLoading ? <Loader/> : (ordonnances||[]).length===0
          ? <Empty icon="💊" title="Aucune ordonnance reçue" subtitle="Les ordonnances envoyées vers la pharmacie interne apparaîtront ici." />
          : (ordonnances||[]).map(o => {
            const st = STATUT_ORD[o.statut] || {l:o.statut,c:"muted"};
            return (
              <div key={o.id} style={{background:C.hover,borderRadius:10,padding:16,marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8,flexWrap:"wrap",gap:8}}>
                  <div>
                    <div style={{fontSize:16,fontWeight:700,color:C.text}}>{o.patient_prenom} {o.patient_nom}</div>
                    <div style={{fontSize:13,color:C.muted}}>{o.patient_telephone} · {fmtDate(o.created_at)}</div>
                  </div>
                  <Badge color={st.c}>{st.l}</Badge>
                </div>
                <div style={{fontSize:15,color:C.text,marginBottom:4,fontWeight:600}}>{o.medicaments}</div>
                {o.posologie && <div style={{fontSize:13,color:C.muted}}>Posologie : {o.posologie}</div>}
                {o.devis_montant && <div style={{fontSize:15,color:C.green,fontWeight:700,marginTop:8}}>Devis : {fmt(o.devis_montant)} F</div>}
                <div style={{display:"flex",gap:8,marginTop:10}}>
                  {o.statut==="envoyee" && <Btn style={{padding:"6px 14px",fontSize:14}} onClick={()=>ouvrirDevis(o)}>📋 Préparer le devis</Btn>}
                  {o.statut==="devis_pret" && <Btn style={{padding:"6px 14px",fontSize:14}} loading={dispenserMut.isPending} onClick={()=>dispenserMut.mutate(o.id)}>✅ Dispenser</Btn>}
                </div>
              </div>
            );
          })
        }
      </Panel>

      <Modal open={!!ordonnanceActive} onClose={()=>{ setOrdonnanceActive(null); setLignesDevis([]); }} title="📋 Préparer le devis" width={560}>
        <div style={{fontSize:14,color:C.muted,marginBottom:16}}>{ordonnanceActive?.medicaments}</div>
        {lignesDevis.map((ligne,i) => (
          <div key={i} style={{display:"grid",gridTemplateColumns:"2fr 0.7fr auto",gap:8,marginBottom:8,alignItems:"end"}}>
            <Sel label={i===0?"Médicament":""} value={ligne.stock_id} onChange={e=>majLigne(i,"stock_id",e.target.value)}
              options={[{v:"",l:"— Choisir —"}, ...(stockDispo||[]).filter(s=>s.categorie==="Médicament").map(s=>({v:s.id,l:`${s.nom} — ${fmt(s.prix_unitaire)} F`}))]} />
            <Inp label={i===0?"Qté":""} type="number" min="1" value={ligne.quantite} onChange={e=>majLigne(i,"quantite",e.target.value)} />
            <button onClick={()=>retirerLigne(i)} disabled={lignesDevis.length<=1} style={{padding:"11px 10px",borderRadius:8,background:"transparent",border:`1.5px solid ${C.border}`,color:lignesDevis.length<=1?C.dim:C.red,cursor:lignesDevis.length<=1?"not-allowed":"pointer",fontSize:16}}>✕</button>
          </div>
        ))}
        <button onClick={ajouterLigne} style={{width:"100%",marginTop:4,marginBottom:16,padding:8,borderRadius:8,background:"transparent",border:`1.5px dashed ${C.border}`,color:C.muted,cursor:"pointer",fontSize:15,fontWeight:700,fontFamily:"inherit"}}>+ Ajouter une ligne</button>
        <Btn style={{width:"100%"}} loading={devisMut.isPending} onClick={()=>devisMut.mutate()}>Valider le devis</Btn>
      </Modal>
      </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  SPECIALITES DE LA CLINIQUE -- CRUD complet, avec tarif de
//  consultation propre a chaque specialite.
// ════════════════════════════════════════════════════════════════════
function PageSpecialites() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editante, setEditante] = useState(null);
  const [form, setForm] = useState({ nom:"", description:"", tarif_consultation:"" });

  const { data, isLoading } = useQuery({ queryKey:["cl-specialites"], queryFn:()=>cAPI.specialites().then(r=>r.data||[]) });
  const specialites = data||[];

  const addMut = useMutation({
    mutationFn: () => cAPI.addSpecialite({ ...form, tarif_consultation: form.tarif_consultation?parseInt(form.tarif_consultation):null }),
    onSuccess: () => { toast.success("Spécialité ajoutée !"); qc.invalidateQueries(["cl-specialites"]); setShowAdd(false); setForm({ nom:"", description:"", tarif_consultation:"" }); },
    onError: e => toast.error(e?.response?.data?.message || "Erreur"),
  });
  const editMut = useMutation({
    mutationFn: ({id,d}) => cAPI.updateSpecialite(id,d),
    onSuccess: () => { toast.success("Spécialité mise à jour"); qc.invalidateQueries(["cl-specialites"]); setEditante(null); },
    onError: e => toast.error(e?.response?.data?.message || "Erreur"),
  });
  const toggleMut = useMutation({
    mutationFn: ({id,disponible}) => cAPI.updateSpecialite(id,{disponible}),
    onSuccess: () => { toast.success("Statut mis à jour"); qc.invalidateQueries(["cl-specialites"]); },
    onError: () => toast.error("Erreur"),
  });
  const supprimerMut = useMutation({
    mutationFn: (id) => cAPI.deleteSpecialite(id),
    onSuccess: () => { toast.success("Spécialité retirée"); qc.invalidateQueries(["cl-specialites"]); },
    onError: e => toast.error(e?.response?.data?.message || "Erreur"),
  });

  const ouvrirEdition = (s) => { setEditante(s.id); setForm({ nom:s.nom||"", description:s.description||"", tarif_consultation:s.tarif_consultation||"" }); };

  return (
    <div>
      <PageHeader title="🩺 Spécialités" subtitle="Spécialités proposées par la clinique et tarif de consultation"
        actions={<Btn onClick={()=>{ setForm({ nom:"", description:"", tarif_consultation:"" }); setShowAdd(true); }}>+ Nouvelle spécialité</Btn>} />

      <Panel>
        {isLoading ? <Loader/> : specialites.length===0
          ? <Empty icon="🩺" title="Aucune spécialité" subtitle="Ajoutez les spécialités proposées par votre clinique, avec leur tarif de consultation." />
          : specialites.map(s=>{
            const enEdition = editante===s.id;
            return (
              <div key={s.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:`1px solid ${C.border}`}}>
                {enEdition ? (
                  <>
                    <div style={{flex:1,display:"grid",gridTemplateColumns:"1.3fr 1.7fr 1fr",gap:8}}>
                      <Inp label="" value={form.nom} onChange={e=>setForm(f=>({...f,nom:e.target.value}))} placeholder="Nom" />
                      <Inp label="" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Description (facultatif)" />
                      <Inp label="" type="number" value={form.tarif_consultation} onChange={e=>setForm(f=>({...f,tarif_consultation:e.target.value}))} placeholder="Tarif consultation" />
                    </div>
                    <button onClick={()=>editMut.mutate({ id:s.id, d:{ nom:form.nom, description:form.description, tarif_consultation:form.tarif_consultation?parseInt(form.tarif_consultation):null } })}
                      style={{background:C.green,border:"none",borderRadius:6,padding:"6px 10px",color:"#fff",cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>✓</button>
                    <button onClick={()=>setEditante(null)} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:6,padding:"6px 10px",color:C.muted,cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>✕</button>
                  </>
                ) : (
                  <>
                    <div style={{flex:1}}>
                      <div style={{fontSize:17,fontWeight:700,color:C.text}}>{s.nom}</div>
                      {s.description && <div style={{fontSize:14,color:C.muted}}>{s.description}</div>}
                    </div>
                    <div style={{fontWeight:800,color:C.green,minWidth:100,textAlign:"right"}}>{s.tarif_consultation?`${fmt(s.tarif_consultation)} F`:"—"}</div>
                    <Badge color={s.disponible?"green":"gray"}>{s.disponible?"Disponible":"Indisponible"}</Badge>
                    <button onClick={()=>toggleMut.mutate({id:s.id, disponible:!s.disponible})}
                      style={{padding:"4px 10px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:6,color:C.muted,cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>
                      {s.disponible?"Désactiver":"Activer"}
                    </button>
                    <button onClick={()=>ouvrirEdition(s)} style={{background:"transparent",border:"none",color:C.blue,cursor:"pointer",fontSize:15}}>✏️</button>
                    <button onClick={()=>{ if(window.confirm(`Supprimer la spécialité "${s.nom}" ?`)) supprimerMut.mutate(s.id); }} style={{background:"transparent",border:"none",color:C.red,cursor:"pointer",fontSize:15}}>✕</button>
                  </>
                )}
              </div>
            );
          })
        }
      </Panel>

      <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="🩺 Nouvelle spécialité">
        <Inp label="Nom *" required value={form.nom} onChange={e=>setForm(f=>({...f,nom:e.target.value}))} placeholder="Ex: Cardiologie" />
        <Inp label="Description" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Facultatif" />
        <Inp label="Tarif de consultation (FCFA)" type="number" value={form.tarif_consultation} onChange={e=>setForm(f=>({...f,tarif_consultation:e.target.value}))} placeholder="15000" />
        <div style={{display:"flex",gap:10,marginTop:4}}>
          <Btn variant="outline" style={{flex:1}} onClick={()=>setShowAdd(false)}>Annuler</Btn>
          <Btn style={{flex:2}} loading={addMut.isPending} onClick={()=>{
            if(!form.nom){toast.error("Nom requis");return;}
            addMut.mutate();
          }}>Créer</Btn>
        </div>
      </Modal>
    </div>
  );
}

// PARAMETRAGE - TYPE DE CHARGES
function PanelTypeCharges() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [nom, setNom] = useState("");
  const { data, isLoading } = useQuery({ queryKey:["cl-categories-charges"], queryFn:()=>api.get("/categories-charges").then(r=>r.data||[]) });
  const categories = data||[];
  const addMut = useMutation({
    mutationFn: () => api.post("/categories-charges", { nom }),
    onSuccess: () => { toast.success("Type de charge ajoute !"); qc.invalidateQueries(["cl-categories-charges"]); setShowAdd(false); setNom(""); },
    onError: e => toast.error(e?.response?.data?.message || "Erreur"),
  });
  const supprimerMut = useMutation({
    mutationFn: (id) => api.delete(`/categories-charges/${id}`),
    onSuccess: () => { toast.success("Type de charge retire"); qc.invalidateQueries(["cl-categories-charges"]); },
    onError: e => toast.error(e?.response?.data?.message || "Erreur"),
  });
  return (
    <div>
      <Panel title="Types de charges (depenses en caisse)" actions={<Btn style={{padding:"6px 14px",fontSize:16}} onClick={()=>setShowAdd(true)}>+ Nouveau type</Btn>}>
        {isLoading ? <Loader/> : categories.length===0
          ? <Empty icon="💸" title="Aucun type de charge" subtitle="Ajoutez les categories de depenses (loyer, salaires, fournitures...) utilisees lors des decaissements en caisse." />
          : categories.map(c=>(
            <div key={c.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
              <span style={{fontSize:16,color:C.text,fontWeight:600}}>{c.nom}</span>
              <button onClick={()=>{ if(window.confirm(`Retirer "${c.nom}" ?`)) supprimerMut.mutate(c.id); }} style={{background:"transparent",border:"none",color:C.red,cursor:"pointer",fontSize:16}}>✕</button>
            </div>
          ))
        }
      </Panel>
      <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="💸 Nouveau type de charge">
        <Inp label="Nom *" required value={nom} onChange={e=>setNom(e.target.value)} placeholder="Ex: Loyer" />
        <Btn style={{width:"100%"}} loading={addMut.isPending} onClick={()=>{ if(!nom){toast.error("Nom requis");return;} addMut.mutate(); }}>Creer</Btn>
      </Modal>
    </div>
  );
}

// PARAMETRAGE - TYPE D'ACTES
function PanelTypeActes() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [nom, setNom] = useState("");
  const { data, isLoading } = useQuery({ queryKey:["cl-categories-actes-param"], queryFn:()=>api.get("/categories-actes").then(r=>r.data||[]) });
  const categories = data||[];
  const addMut = useMutation({
    mutationFn: () => api.post("/categories-actes", { nom }),
    onSuccess: () => { toast.success("Type d'acte ajoute !"); qc.invalidateQueries(["cl-categories-actes-param"]); setShowAdd(false); setNom(""); },
    onError: e => toast.error(e?.response?.data?.message || "Erreur"),
  });
  const supprimerMut = useMutation({
    mutationFn: (id) => api.delete(`/categories-actes/${id}`),
    onSuccess: () => { toast.success("Type d'acte retire"); qc.invalidateQueries(["cl-categories-actes-param"]); },
    onError: e => toast.error(e?.response?.data?.message || "Erreur"),
  });
  return (
    <div>
      <Panel title="Types d'actes (categories du catalogue)" actions={<Btn style={{padding:"6px 14px",fontSize:16}} onClick={()=>setShowAdd(true)}>+ Nouveau type</Btn>}>
        {isLoading ? <Loader/> : categories.length===0
          ? <Empty icon="🩺" title="Aucun type d'acte" />
          : categories.map(c=>(
            <div key={c.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
              <span style={{fontSize:16,color:C.text,fontWeight:600}}>{c.nom}</span>
              <button onClick={()=>{ if(window.confirm(`Retirer "${c.nom}" ? Les actes de ce type resteront, mais sans categorie.`)) supprimerMut.mutate(c.id); }} style={{background:"transparent",border:"none",color:C.red,cursor:"pointer",fontSize:16}}>✕</button>
            </div>
          ))
        }
      </Panel>
      <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="🩺 Nouveau type d'acte">
        <Inp label="Nom *" required value={nom} onChange={e=>setNom(e.target.value)} placeholder="Ex: Kinesitherapie" />
        <Btn style={{width:"100%"}} loading={addMut.isPending} onClick={()=>{ if(!nom){toast.error("Nom requis");return;} addMut.mutate(); }}>Creer</Btn>
      </Modal>
    </div>
  );
}

// PARAMETRAGE - PAGE PRINCIPALE (5 onglets)
function PageParametrage() {
  const [tab, setTab] = useState("assurance");
  const PARAM_TABS = [
    { key:"assurance", label:"🛡️ Assurance" },
    { key:"actes-tarifs", label:"🩺 Actes & tarifs" },
    { key:"type-charges", label:"💸 Type de charges" },
    { key:"type-actes", label:"📋 Type d'actes" },
    { key:"specialites", label:"⚕️ Specialites" },
  ];
  return (
    <div>
      <PageHeader title="⚙️ Parametrage" subtitle="Assurance . Actes & tarifs . Charges . Specialites" />
      <div style={{ display:"flex", gap:4, background:C.input, borderRadius:10, padding:4, marginBottom:20, flexWrap:"wrap" }}>
        {PARAM_TABS.map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)}
            style={{ flex:1, minWidth:120, background:tab===t.key?C.hover:"transparent", border:"none", borderRadius:8, padding:"9px 4px", cursor:"pointer", fontFamily:"inherit", color:tab===t.key?C.text:C.muted, fontSize:14, fontWeight:tab===t.key?700:400 }}>
            {t.label}
          </button>
        ))}
      </div>
      {tab==="assurance" && <PageAssurance />}
      {tab==="actes-tarifs" && <PanelGestionActes />}
      {tab==="type-charges" && <PanelTypeCharges />}
      {tab==="type-actes" && <PanelTypeActes />}
      {tab==="specialites" && <PageSpecialites />}
    </div>
  );
}

function PageStock() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [tab, setTab] = useState("inventaire");
  const [form, setForm] = useState({ nom:"", categorie:"Médicament", quantite:"", unite:"boite", seuil_alerte:"", prix_unitaire:"", prix_subventionne:"", fournisseur:"", date_expiration:"" });

  const { data, isLoading } = useQuery({ queryKey:["cl-stock"], queryFn:()=>cAPI.stock().then(r=>r.data||[]) });
  const stock = data||[];
  const alertes = stock.filter(s=>s.quantite<=s.seuil_alerte);
  const totalValeur = stock.reduce((s,p)=>(s+(+p.quantite*(+p.prix_unitaire||0))),0);

  const addMut = useMutation({ mutationFn:d=>cAPI.addStock(d), onSuccess:()=>{ toast.success("Produit ajouté !"); qc.invalidateQueries(["cl-stock"]); setShowAdd(false); }, onError:()=>toast.error("Erreur") });
  const [editantStock, setEditantStock] = useState(null);
  const [showAddFournisseur, setShowAddFournisseur] = useState(false);
  const [formFournisseur, setFormFournisseur] = useState({ nom:"", contact:"", produits:"" });

  const { data: fournisseursData } = useQuery({ queryKey:["cl-fournisseurs"], queryFn:()=>api.get("/fournisseurs-stock").then(r=>r.data||[]) });
  const FOURNISSEURS = fournisseursData||[];

  const editStockMut = useMutation({ mutationFn:({id,d})=>api.put(`/stock/${id}`,d), onSuccess:()=>{ toast.success("Produit mis à jour"); qc.invalidateQueries(["cl-stock"]); setEditantStock(null); }, onError:()=>toast.error("Erreur") });
  const supprimerStockMut = useMutation({ mutationFn:id=>api.delete(`/stock/${id}`), onSuccess:()=>{ toast.success("Produit retiré"); qc.invalidateQueries(["cl-stock"]); }, onError:()=>toast.error("Erreur") });
  const addFournisseurMut = useMutation({
    mutationFn: () => api.post("/fournisseurs-stock", formFournisseur),
    onSuccess: () => { toast.success("Fournisseur ajouté !"); qc.invalidateQueries(["cl-fournisseurs"]); setShowAddFournisseur(false); setFormFournisseur({ nom:"", contact:"", produits:"" }); },
    onError: () => toast.error("Erreur"),
  });

  const f = k => e => setForm(p=>({...p,[k]:e.target.value}));
  const CATS = ["Médicament","Consommable","Équipement","Désinfectant","Dispositif médical"];
  const UNITES = ["boite","flacon","sachet","ampoule","comprimé","litre","pièce","carton"];

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
            style={{ flex:1, background:tab===t.key?C.hover:"transparent", border:"none", borderRadius:8, padding:"9px 4px", cursor:"pointer", fontFamily:"inherit", color:tab===t.key?C.text:C.muted, fontSize:16, fontWeight:tab===t.key?700:400 }}>
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
                  { key:"nom", label:"Produit", render:(v,r)=><><div style={{fontWeight:700}}>{v}</div><div style={{fontSize:14,color:C.muted}}>{r.categorie}</div></> },
                  { key:"quantite", label:"Qté", render:(v,r)=>(
                    <div>
                      <span style={{ fontWeight:700, color:v===0?C.red:v<=r.seuil_alerte?C.amber:C.green, fontSize:20 }}>{v}</span>
                      <span style={{ fontSize:14, color:C.dim }}> {r.unite}</span>
                    </div>
                  )},
                  { key:"seuil_alerte", label:"Seuil", render:v=><span style={{color:C.muted}}>{v||"—"}</span> },
                  { key:"prix_unitaire", label:"Prix unit.", render:v=>v?`${fmt(v)} F`:"—" },
                  { key:"date_expiration", label:"Expiration", render:v=>v?<span style={{color:new Date(v)<new Date()?C.red:C.muted}}>{fmtDate(v)}</span>:"—" },
                  { key:"fournisseur", label:"Fournisseur", render:v=><span style={{fontSize:16,color:C.muted}}>{v||"—"}</span> },
                  { key:"quantite", label:"Statut", render:(v,r)=>(
                    <Badge color={v===0?"red":v<=r.seuil_alerte?"amber":"green"}>
                      {v===0?"Rupture":v<=r.seuil_alerte?"Alerte":"OK"}
                    </Badge>
                  )},
                  { key:"id", label:"", render:(id,r)=>(
                    editantStock===id ? (
                      <div style={{display:"flex",gap:6,alignItems:"center"}}>
                        <input type="number" defaultValue={r.prix_unitaire} id={`px-${id}`} placeholder="Non assuré" style={{width:75,padding:"5px 7px",background:C.input,border:`1px solid ${C.border}`,borderRadius:6,color:C.text,fontSize:13}} />
                        <input type="number" defaultValue={r.prix_subventionne||""} id={`pxsub-${id}`} placeholder="Subventionné" style={{width:80,padding:"5px 7px",background:C.input,border:`1px solid ${C.border}`,borderRadius:6,color:C.text,fontSize:13}} />
                        <button onClick={()=>{
                          const prix_unitaire = parseFloat(document.getElementById(`px-${id}`).value);
                          const subvBrut = document.getElementById(`pxsub-${id}`).value;
                          const prix_subventionne = subvBrut ? parseFloat(subvBrut) : null;
                          editStockMut.mutate({ id, d:{ prix_unitaire, prix_subventionne } });
                        }} style={{background:C.green,border:"none",borderRadius:6,padding:"5px 9px",color:"#fff",cursor:"pointer",fontSize:12}}>✓</button>
                      </div>
                    ) : (
                      <div style={{display:"flex",gap:6}}>
                        <button onClick={()=>setEditantStock(id)} style={{background:"transparent",border:"none",color:C.blue,cursor:"pointer",fontSize:15}}>✏️</button>
                        <button onClick={()=>window.confirm("Retirer ce produit du stock ?")&&supprimerStockMut.mutate(id)} style={{background:"transparent",border:"none",color:C.red,cursor:"pointer",fontSize:15}}>✕</button>
                      </div>
                    )
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
                <span style={{ fontSize:29 }}>💊</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:18, fontWeight:700, color:C.text }}>{s.nom}</div>
                  <div style={{ fontSize:16, color:C.muted, marginBottom:6 }}>Stock : <strong style={{color:s.quantite===0?C.red:C.amber}}>{s.quantite}</strong> / Seuil : {s.seuil_alerte} {s.unite}</div>
                  <ProgressBar value={s.quantite} max={s.seuil_alerte*2} color={s.quantite===0?C.red:C.amber} />
                </div>
                <Btn variant="amber" style={{padding:"7px 14px",fontSize:16}} onClick={()=>toast.success("Commande créée !")}>Commander</Btn>
              </div>
            ))
          }
        </Panel>
      )}

      {tab==="fournisseurs" && (
        <Panel title="Fournisseurs et contacts" actions={<Btn style={{padding:"6px 14px",fontSize:16}} onClick={()=>setShowAddFournisseur(true)}>+ Fournisseur</Btn>}>
          {FOURNISSEURS.length===0
            ? <Empty icon="🚚" title="Aucun fournisseur" subtitle="Ajoutez vos fournisseurs pour les retrouver lors de l'ajout d'un produit." />
            : <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:14 }}>
                {FOURNISSEURS.map(f=>(
                  <div key={f.id} style={{ background:C.hover, borderRadius:12, padding:16 }}>
                    <div style={{ fontSize:18, fontWeight:700, color:C.text, marginBottom:6 }}>{f.nom}</div>
                    <div style={{ fontSize:16, color:C.muted, marginBottom:4 }}>📞 {f.contact||"—"}</div>
                    <div style={{ fontSize:16, color:C.muted, marginBottom:12 }}>📦 {f.produits||"—"}</div>
                    <Btn variant="outline" style={{width:"100%",padding:"7px",fontSize:16}} onClick={()=>toast.success("Commande envoyée !")}>Passer commande</Btn>
                  </div>
                ))}
              </div>
          }
          <Modal open={showAddFournisseur} onClose={()=>setShowAddFournisseur(false)} title="🚚 Nouveau fournisseur">
            <Inp label="Nom *" required value={formFournisseur.nom} onChange={e=>setFormFournisseur(p=>({...p,nom:e.target.value}))} placeholder="Pharma Ivoire SARL" />
            <Inp label="Contact" value={formFournisseur.contact} onChange={e=>setFormFournisseur(p=>({...p,contact:e.target.value}))} placeholder="+225 27 00 00 00" />
            <Inp label="Produits fournis" value={formFournisseur.produits} onChange={e=>setFormFournisseur(p=>({...p,produits:e.target.value}))} placeholder="Médicaments généraux" />
            <Btn style={{width:"100%"}} loading={addFournisseurMut.isPending} onClick={()=>{
              if(!formFournisseur.nom){toast.error("Nom requis");return;}
              addFournisseurMut.mutate();
            }}>Créer</Btn>
          </Modal>
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
          <Inp label="Prix non assuré (FCFA)" value={form.prix_unitaire} onChange={f("prix_unitaire")} type="number" placeholder="500" />
          <Inp label="Prix subventionné (FCFA)" value={form.prix_subventionne} onChange={f("prix_subventionne")} type="number" placeholder="Facultatif" />
          <Inp label="Date d'expiration" value={form.date_expiration} onChange={f("date_expiration")} type="date" />
        </Grid>
        <Sel label="Fournisseur" value={form.fournisseur_id||""} onChange={e=>{
            const id = e.target.value;
            const nom = FOURNISSEURS.find(x=>x.id===id)?.nom || "";
            setForm(p=>({...p, fournisseur_id:id, fournisseur:nom}));
          }}
          options={[{v:"",l:"-- Aucun --"}, ...FOURNISSEURS.map(x=>({v:x.id,l:x.nom}))]} />
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
function PanelGestionActes() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editant, setEditant] = useState(null);
  const [form, setForm] = useState({ code:"", libelle:"", categorie_id:"", tarif_base:"", taux_assurance:"70", prix_subventionne:"" });

  const { data: actes, isLoading } = useQuery({ queryKey:["cl-actes-gestion"], queryFn:()=>cAPI.actesCatalogue().then(r=>r.data||[]) });
  const { data: categories } = useQuery({ queryKey:["cl-categories-actes"], queryFn:()=>api.get("/categories-actes").then(r=>r.data||[]) });
  const { user } = useAuthStore();
  const mesActes = (actes||[]).filter(a=>a.clinique_id);
  const actesGlobaux = (actes||[]).filter(a=>!a.clinique_id);

  const addMut = useMutation({
    mutationFn: () => api.post("/actes", { ...form, tarif_base:parseInt(form.tarif_base)||0, taux_assurance:parseInt(form.taux_assurance)||70, prix_subventionne:form.prix_subventionne?parseInt(form.prix_subventionne):null }),
    onSuccess: () => { toast.success("Acte créé !"); qc.invalidateQueries(["cl-actes-gestion"]); setShowAdd(false); setForm({ code:"", libelle:"", categorie_id:"", tarif_base:"", taux_assurance:"70" }); },
    onError: e => toast.error(e?.response?.data?.message || "Erreur"),
  });
  const editMut = useMutation({
    mutationFn: ({id,d}) => api.put(`/actes/${id}`, d),
    onSuccess: () => { toast.success("Acte mis à jour"); qc.invalidateQueries(["cl-actes-gestion"]); setEditant(null); },
    onError: e => toast.error(e?.response?.data?.message || "Erreur"),
  });
  const supprimerMut = useMutation({
    mutationFn: (id) => api.delete(`/actes/${id}`),
    onSuccess: () => { toast.success("Acte retiré"); qc.invalidateQueries(["cl-actes-gestion"]); },
    onError: e => toast.error(e?.response?.data?.message || "Erreur"),
  });
  const personnaliserMut = useMutation({
    mutationFn: (d) => api.post("/actes", d),
    onSuccess: () => { toast.success("Tarif personnalisé !"); qc.invalidateQueries(["cl-actes-gestion"]); setPersonnaliserCible(null); },
    onError: e => toast.error(e?.response?.data?.message || "Erreur"),
  });
  const [personnaliserCible, setPersonnaliserCible] = useState(null);
  const [personnaliserForm, setPersonnaliserForm] = useState({ tarif_base:"", prix_subventionne:"", taux_assurance:70 });

  // ── Conventions (clinique + assureur) et tarifs negocies par acte ──
  const [showAddConvention, setShowAddConvention] = useState(false);
  const [conventionForm, setConventionForm] = useState({ assureur_id:"", taux:"70", plafond_acte:"" });
  const [conventionOuverte, setConventionOuverte] = useState(null);
  const [rechercheActeConv, setRechercheActeConv] = useState("");

  const { data: conventionsData } = useQuery({ queryKey:["cl-conventions"], queryFn:()=>cAPI.conventions().then(r=>r.data||[]) });
  const conventions = conventionsData||[];
  const { data: assureursConv } = useQuery({ queryKey:["cl-assureurs-conv"], queryFn:()=>cAPI.assureursListe().then(r=>r.data||[]) });
  const { data: tarifsConventionData } = useQuery({
    queryKey:["cl-tarifs-convention", conventionOuverte],
    queryFn:()=>cAPI.tarifsConvention(conventionOuverte).then(r=>r.data||[]),
    enabled: !!conventionOuverte,
  });
  const tarifsNegocies = tarifsConventionData||[];

  const addConventionMut = useMutation({
    mutationFn: () => cAPI.addConvention({ assureur_id:conventionForm.assureur_id, taux:parseInt(conventionForm.taux)||0, plafond_acte:conventionForm.plafond_acte?parseInt(conventionForm.plafond_acte):null }),
    onSuccess: () => { toast.success("Convention créée !"); qc.invalidateQueries(["cl-conventions"]); setShowAddConvention(false); setConventionForm({ assureur_id:"", taux:"70", plafond_acte:"" }); },
    onError: e => toast.error(e?.response?.data?.message || "Erreur"),
  });
  const toggleConventionMut = useMutation({
    mutationFn: ({id,is_active}) => cAPI.updateConvention(id,{is_active}),
    onSuccess: () => { toast.success("Statut mis à jour"); qc.invalidateQueries(["cl-conventions"]); },
    onError: () => toast.error("Erreur"),
  });
  const setTarifNegocieMut = useMutation({
    mutationFn: ({acteId, tarif}) => cAPI.setTarifNegocie(conventionOuverte, acteId, tarif),
    onSuccess: () => { toast.success("Tarif négocié enregistré"); qc.invalidateQueries(["cl-tarifs-convention", conventionOuverte]); },
    onError: e => toast.error(e?.response?.data?.message || "Erreur"),
  });
  const retirerTarifNegocieMut = useMutation({
    mutationFn: (acteId) => cAPI.retirerTarifNegocie(conventionOuverte, acteId),
    onSuccess: () => { toast.success("Tarif négocié retiré"); qc.invalidateQueries(["cl-tarifs-convention", conventionOuverte]); },
    onError: () => toast.error("Erreur"),
  });
  const [sousOngletConvention, setSousOngletConvention] = useState("actes");
  const { data: stockConvData } = useQuery({
    queryKey:["cl-stock-conv"],
    queryFn:()=>cAPI.stock().then(r=>(r.data||[]).filter(s=>s.categorie==="Médicament")),
  });
  const stockConv = stockConvData||[];
  const { data: tarifsMedicamentsData } = useQuery({
    queryKey:["cl-tarifs-medicaments-convention", conventionOuverte],
    queryFn:()=>cAPI.tarifsMedicamentsConvention(conventionOuverte).then(r=>r.data||[]),
    enabled: !!conventionOuverte,
  });
  const tarifsMedicamentsNegocies = tarifsMedicamentsData||[];
  const setTarifNegocieMedicamentMut = useMutation({
    mutationFn: ({stockId, tarif}) => cAPI.setTarifNegocieMedicament(conventionOuverte, stockId, tarif),
    onSuccess: () => { toast.success("Tarif négocié enregistré"); qc.invalidateQueries(["cl-tarifs-medicaments-convention", conventionOuverte]); },
    onError: e => toast.error(e?.response?.data?.message || "Erreur"),
  });
  const retirerTarifNegocieMedicamentMut = useMutation({
    mutationFn: (stockId) => cAPI.retirerTarifNegocieMedicament(conventionOuverte, stockId),
    onSuccess: () => { toast.success("Tarif négocié retiré"); qc.invalidateQueries(["cl-tarifs-medicaments-convention", conventionOuverte]); },
    onError: () => toast.error("Erreur"),
  });

  const LigneActe = ({ a, modifiable }) => {
    const enEdition = editant===a.id;
    return (
      <div style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
        <div style={{flex:1}}>
          <div style={{fontSize:15,fontWeight:600,color:C.text}}>{a.libelle}</div>
          <div style={{fontSize:13,color:C.muted}}>{a.code} · {a.categorie_nom||"—"}</div>
        </div>
        {enEdition ? (
          <>
            <input defaultValue={a.libelle} id={`libelle-${a.id}`} placeholder="Libellé" style={{width:150,padding:"6px 8px",background:C.input,border:`1px solid ${C.border}`,borderRadius:6,color:C.text,fontSize:14}} />
            <input type="number" defaultValue={a.tarif_base} id={`tarif-${a.id}`} placeholder="Non assuré" style={{width:80,padding:"6px 8px",background:C.input,border:`1px solid ${C.border}`,borderRadius:6,color:C.text,fontSize:14}} />
            <input type="number" defaultValue={a.prix_subventionne||""} id={`subv-${a.id}`} placeholder="Subventionné" style={{width:80,padding:"6px 8px",background:C.input,border:`1px solid ${C.border}`,borderRadius:6,color:C.text,fontSize:14}} />
            <input type="number" defaultValue={a.taux_assurance} id={`taux-${a.id}`} placeholder="Taux %" style={{width:55,padding:"6px 8px",background:C.input,border:`1px solid ${C.border}`,borderRadius:6,color:C.text,fontSize:14}} />
            <button onClick={()=>{
              const libelle = document.getElementById(`libelle-${a.id}`).value;
              const tarif_base = parseInt(document.getElementById(`tarif-${a.id}`).value);
              const subvBrut = document.getElementById(`subv-${a.id}`).value;
              const prix_subventionne = subvBrut ? parseInt(subvBrut) : null;
              const taux_assurance = parseInt(document.getElementById(`taux-${a.id}`).value);
              editMut.mutate({ id:a.id, d:{ libelle, tarif_base, taux_assurance, prix_subventionne } });
            }} style={{background:C.green,border:"none",borderRadius:6,padding:"6px 10px",color:"#fff",cursor:"pointer",fontSize:13}}>✓</button>
          </>
        ) : (
          <>
            <span style={{fontWeight:800,color:C.green,minWidth:90,textAlign:"right"}}>{fmt(a.tarif_base)} F</span>
            {a.prix_subventionne!=null && <span style={{fontSize:13,color:C.teal,minWidth:80,textAlign:"right"}}>Subv. {fmt(a.prix_subventionne)} F</span>}
            <span style={{fontSize:13,color:C.muted,minWidth:40}}>{a.taux_assurance}%</span>
            {modifiable ? (
              <>
                <button onClick={()=>setEditant(a.id)} style={{background:"transparent",border:"none",color:C.blue,cursor:"pointer",fontSize:15}}>✏️</button>
                <button onClick={()=>window.confirm("Retirer cet acte de votre catalogue ?")&&supprimerMut.mutate(a.id)} style={{background:"transparent",border:"none",color:C.red,cursor:"pointer",fontSize:15}}>✕</button>
              </>
            ) : (
              <button onClick={()=>{
                setPersonnaliserCible(a);
                setPersonnaliserForm({ tarif_base:a.tarif_base||"", prix_subventionne:a.prix_subventionne||"", taux_assurance:a.taux_assurance||70 });
              }} style={{background:"rgba(10,143,88,.12)",border:`1px solid ${C.green}`,borderRadius:6,padding:"5px 10px",color:C.green,cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>✏️ Personnaliser</button>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div>
      <Panel title="Mes tarifs personnalisés" actions={<Btn style={{padding:"6px 14px",fontSize:16}} onClick={()=>setShowAdd(true)}>+ Nouvel acte</Btn>}>
        {isLoading ? <Loader/> : mesActes.length===0
          ? <Empty icon="🩺" title="Aucun tarif personnalisé" subtitle="Ajoutez vos propres actes avec vos tarifs, ou ajustez ceux du catalogue global ci-dessous." />
          : mesActes.map(a=><LigneActe key={a.id} a={a} modifiable={true} />)
        }
      </Panel>
      <Panel title="Catalogue global (lecture seule)" style={{marginTop:16}}>
        {actesGlobaux.map(a=><LigneActe key={a.id} a={a} modifiable={false} />)}
      </Panel>

      <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="🩺 Nouvel acte">
        <Grid cols={2} gap={10}>
          <Inp label="Code *" required value={form.code} onChange={e=>setForm(f=>({...f,code:e.target.value}))} placeholder="Ex: C1" />
          <Sel label="Catégorie" value={form.categorie_id} onChange={e=>setForm(f=>({...f,categorie_id:e.target.value}))}
            options={[{v:"",l:"-- Choisir --"}, ...(categories||[]).map(c=>({v:c.id,l:c.nom}))]} />
        </Grid>
        <Inp label="Libellé *" required value={form.libelle} onChange={e=>setForm(f=>({...f,libelle:e.target.value}))} placeholder="Ex: Consultation généraliste" />
        <Grid cols={2} gap={10}>
          <Inp label="Tarif non assuré (FCFA) *" required type="number" value={form.tarif_base} onChange={e=>setForm(f=>({...f,tarif_base:e.target.value}))} />
          <Inp label="Tarif subventionné (FCFA)" type="number" value={form.prix_subventionne} onChange={e=>setForm(f=>({...f,prix_subventionne:e.target.value}))} placeholder="Facultatif" />
        </Grid>
        <Inp label="Taux assurance par défaut (%)" type="number" value={form.taux_assurance} onChange={e=>setForm(f=>({...f,taux_assurance:e.target.value}))} />
        <div style={{fontSize:13,color:C.dim,marginBottom:12}}>Le tarif négocié par assureur se paramètre ensuite dans "Conventions & tarifs négociés".</div>
        <Btn style={{width:"100%"}} loading={addMut.isPending} onClick={()=>{
          if(!form.code||!form.libelle||!form.tarif_base){toast.error("Code, libellé et tarif requis");return;}
          addMut.mutate();
        }}>Créer</Btn>
      </Modal>

      {/* Modal: Personnaliser un tarif du catalogue global */}
      <Modal open={!!personnaliserCible} onClose={()=>setPersonnaliserCible(null)} title={`✏️ Personnaliser — ${personnaliserCible?.libelle||""}`} width={480}>
        <Grid cols={2} gap={10}>
          <Inp label="Tarif non assuré (FCFA) *" required type="number" value={personnaliserForm.tarif_base} onChange={e=>setPersonnaliserForm(p=>({...p,tarif_base:e.target.value}))} />
          <Inp label="Tarif subventionné (FCFA)" type="number" value={personnaliserForm.prix_subventionne} onChange={e=>setPersonnaliserForm(p=>({...p,prix_subventionne:e.target.value}))} placeholder="Facultatif" />
        </Grid>
        <Inp label="Taux assurance par défaut (%)" type="number" value={personnaliserForm.taux_assurance} onChange={e=>setPersonnaliserForm(p=>({...p,taux_assurance:e.target.value}))} />
        <Btn style={{width:"100%"}} loading={personnaliserMut.isPending} onClick={()=>{
          const tarif_base = parseInt(personnaliserForm.tarif_base);
          if(!tarif_base||tarif_base<0){toast.error("Tarif invalide");return;}
          personnaliserMut.mutate({
            code:personnaliserCible.code, libelle:personnaliserCible.libelle, categorie_id:personnaliserCible.categorie_id,
            tarif_base, taux_assurance:parseInt(personnaliserForm.taux_assurance)||70,
            prix_subventionne:personnaliserForm.prix_subventionne?parseInt(personnaliserForm.prix_subventionne):null,
          });
        }}>Enregistrer</Btn>
      </Modal>

      {/* Conventions & tarifs négociés par assureur */}
      <Panel title="Conventions & tarifs négociés" style={{marginTop:16}}
        actions={<Btn style={{padding:"6px 14px",fontSize:16}} onClick={()=>setShowAddConvention(true)}>+ Nouvelle convention</Btn>}>
        {conventions.length===0
          ? <Empty icon="🤝" title="Aucune convention" subtitle="Créez une convention par assureur pour négocier un taux, un plafond et des tarifs par acte." />
          : conventions.map(c=>(
            <div key={c.id} style={{marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:`1px solid ${C.border}`,cursor:"pointer"}}
                onClick={()=>setConventionOuverte(conventionOuverte===c.id?null:c.id)}>
                <div style={{flex:1}}>
                  <div style={{fontSize:16,fontWeight:700,color:C.text}}>{c.assureur_nom}</div>
                  <div style={{fontSize:13,color:C.muted}}>Taux général {c.taux}%{c.plafond_acte?` · Plafond ${fmt(c.plafond_acte)} F/acte`:""}</div>
                </div>
                <Badge color={c.is_active?"green":"gray"}>{c.is_active?"Active":"Inactive"}</Badge>
                <button onClick={(e)=>{ e.stopPropagation(); toggleConventionMut.mutate({id:c.id, is_active:!c.is_active}); }}
                  style={{padding:"4px 10px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:6,color:C.muted,cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>
                  {c.is_active?"Désactiver":"Activer"}
                </button>
                <span style={{fontSize:13,color:C.dim}}>{conventionOuverte===c.id?"▲":"▼"}</span>
              </div>
              {conventionOuverte===c.id && (
                <div style={{background:C.hover,borderRadius:10,padding:14,marginTop:8}}>
                  <div style={{display:"flex",gap:4,background:C.input,borderRadius:8,padding:3,marginBottom:12}}>
                    {[["actes","🩺 Actes"],["medicaments","💊 Médicaments"]].map(([v,l])=>(
                      <button key={v} onClick={()=>setSousOngletConvention(v)}
                        style={{flex:1,padding:"6px 10px",borderRadius:6,border:"none",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit",
                          background:sousOngletConvention===v?C.hover:"transparent",color:sousOngletConvention===v?C.text:C.muted}}>
                        {l}
                      </button>
                    ))}
                  </div>
                  {sousOngletConvention==="actes" ? (
                    <>
                      <Inp label="" value={rechercheActeConv} onChange={e=>setRechercheActeConv(e.target.value)} placeholder="🔎 Rechercher un acte…" />
                      <div style={{maxHeight:320,overflowY:"auto",marginTop:10}}>
                        {(actes||[]).filter(a=>!rechercheActeConv||a.libelle.toLowerCase().includes(rechercheActeConv.toLowerCase())).map(a=>{
                          const existant = tarifsNegocies.find(t=>t.acte_id===a.id);
                          return (
                            <div key={a.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
                              <div style={{flex:1,fontSize:14,color:C.text}}>{a.libelle} <span style={{color:C.dim,fontSize:12}}>({fmt(a.tarif_base)} F non assuré)</span></div>
                              <input type="number" defaultValue={existant?.tarif_negocie||""} id={`negocie-${c.id}-${a.id}`} placeholder="Tarif négocié"
                                style={{width:110,padding:"6px 8px",background:C.input,border:`1px solid ${C.border}`,borderRadius:6,color:C.text,fontSize:14}} />
                              <button onClick={()=>{
                                const v = document.getElementById(`negocie-${c.id}-${a.id}`).value;
                                const tarif = parseInt(v);
                                if(!v||!tarif||tarif<0){toast.error("Tarif invalide");return;}
                                setTarifNegocieMut.mutate({ acteId:a.id, tarif });
                              }} style={{background:C.green,border:"none",borderRadius:6,padding:"6px 10px",color:"#fff",cursor:"pointer",fontSize:13}}>✓</button>
                              {existant && <button onClick={()=>retirerTarifNegocieMut.mutate(a.id)} style={{background:"transparent",border:"none",color:C.red,cursor:"pointer",fontSize:15}}>✕</button>}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <>
                      <Inp label="" value={rechercheActeConv} onChange={e=>setRechercheActeConv(e.target.value)} placeholder="🔎 Rechercher un médicament…" />
                      <div style={{maxHeight:320,overflowY:"auto",marginTop:10}}>
                        {stockConv.filter(s=>!rechercheActeConv||s.nom.toLowerCase().includes(rechercheActeConv.toLowerCase())).map(s=>{
                          const existant = tarifsMedicamentsNegocies.find(t=>t.stock_id===s.id);
                          return (
                            <div key={s.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
                              <div style={{flex:1,fontSize:14,color:C.text}}>{s.nom} <span style={{color:C.dim,fontSize:12}}>({fmt(s.prix_unitaire)} F non assuré)</span></div>
                              <input type="number" defaultValue={existant?.tarif_negocie||""} id={`negocie-med-${c.id}-${s.id}`} placeholder="Tarif négocié"
                                style={{width:110,padding:"6px 8px",background:C.input,border:`1px solid ${C.border}`,borderRadius:6,color:C.text,fontSize:14}} />
                              <button onClick={()=>{
                                const v = document.getElementById(`negocie-med-${c.id}-${s.id}`).value;
                                const tarif = parseInt(v);
                                if(!v||!tarif||tarif<0){toast.error("Tarif invalide");return;}
                                setTarifNegocieMedicamentMut.mutate({ stockId:s.id, tarif });
                              }} style={{background:C.green,border:"none",borderRadius:6,padding:"6px 10px",color:"#fff",cursor:"pointer",fontSize:13}}>✓</button>
                              {existant && <button onClick={()=>retirerTarifNegocieMedicamentMut.mutate(s.id)} style={{background:"transparent",border:"none",color:C.red,cursor:"pointer",fontSize:15}}>✕</button>}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))
        }
      </Panel>

      <Modal open={showAddConvention} onClose={()=>setShowAddConvention(false)} title="🤝 Nouvelle convention">
        <Sel label="Compagnie d'assurance *" required value={conventionForm.assureur_id} onChange={e=>setConventionForm(f=>({...f,assureur_id:e.target.value}))}
          options={[{v:"",l:"-- Choisir --"}, ...(assureursConv||[]).map(a=>({v:a.id,l:a.nom}))]} />
        <Grid cols={2} gap={10}>
          <Inp label="Taux de couverture général (%) *" required type="number" value={conventionForm.taux} onChange={e=>setConventionForm(f=>({...f,taux:e.target.value}))} />
          <Inp label="Plafond par acte (FCFA)" type="number" value={conventionForm.plafond_acte} onChange={e=>setConventionForm(f=>({...f,plafond_acte:e.target.value}))} placeholder="Facultatif" />
        </Grid>
        <div style={{fontSize:13,color:C.dim,marginBottom:12}}>Ce taux s'applique par défaut à tous les actes ; des tarifs négociés spécifiques peuvent ensuite être définis acte par acte.</div>
        <Btn style={{width:"100%"}} loading={addConventionMut.isPending} onClick={()=>{
          if(!conventionForm.assureur_id||!conventionForm.taux){toast.error("Compagnie et taux requis");return;}
          addConventionMut.mutate();
        }}>Créer la convention</Btn>
      </Modal>

      <PanelGestionChambres />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  HOSPITALISATION -- categories de chambres et leur tarif journalier
//  (VIP, Individuelle, Double, Reanimation, Box...). Meme principe que
//  la gestion des actes juste au-dessus.
// ══════════════════════════════════════════════════════════════════
function PanelGestionChambres() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ nom:"", tarif_journalier:"", description:"" });

  const { data: chambres, isLoading } = useQuery({ queryKey:["cl-categories-chambres"], queryFn:()=>api.get("/categories-chambres").then(r=>r.data||[]) });

  const addMut = useMutation({
    mutationFn: () => api.post("/categories-chambres", { ...form, tarif_journalier:parseInt(form.tarif_journalier)||0 }),
    onSuccess: () => { toast.success("Catégorie de chambre créée !"); qc.invalidateQueries(["cl-categories-chambres"]); setShowAdd(false); setForm({ nom:"", tarif_journalier:"", description:"" }); },
    onError: e => toast.error(e?.response?.data?.message || "Erreur"),
  });

  return (
    <div style={{marginTop:24}}>
      <Panel title="🏨 Hospitalisation — Catégories de chambres"
        actions={<Btn style={{padding:"6px 14px",fontSize:16}} onClick={()=>setShowAdd(true)}>+ Nouvelle catégorie</Btn>}>
        {isLoading ? <Loader/> : (chambres||[]).length===0
          ? <Empty icon="🏨" title="Aucune catégorie de chambre" />
          : (chambres||[]).map(c => (
            <div key={c.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
              <div style={{flex:1}}>
                <div style={{fontSize:15,fontWeight:600,color:C.text}}>{c.nom}</div>
                {c.description && <div style={{fontSize:13,color:C.muted}}>{c.description}</div>}
              </div>
              <span style={{fontWeight:800,color:C.green,minWidth:110,textAlign:"right"}}>{fmt(c.tarif_journalier)} F/jour</span>
            </div>
          ))
        }
      </Panel>

      <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="🏨 Nouvelle catégorie de chambre">
        <Inp label="Nom *" required value={form.nom} onChange={e=>setForm(f=>({...f,nom:e.target.value}))} placeholder="Ex: Suite VIP" />
        <Inp label="Tarif journalier (FCFA) *" required type="number" value={form.tarif_journalier} onChange={e=>setForm(f=>({...f,tarif_journalier:e.target.value}))} />
        <Inp label="Description" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Ex: Chambre individuelle, climatisée…" />
        <Btn style={{width:"100%"}} loading={addMut.isPending} onClick={()=>{
          if(!form.nom||!form.tarif_journalier){toast.error("Nom et tarif journalier requis");return;}
          addMut.mutate();
        }}>Créer</Btn>
      </Modal>
    </div>
  );
}

function PageFacturation() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("tableau-bord");

  // Impression avec le vrai detail ligne par ligne, recupere via
  // /api/factures/:id/detail (jointure sur passage_id). La fenetre est
  // ouverte immediatement (evite le blocage popup des navigateurs sur
  // un appel asynchrone), puis remplie une fois les donnees recues.
  const imprimerFactureResume = async (f) => {
    const win = window.open('', '_blank');
    win.document.write('<p style="font-family:Arial,sans-serif;padding:30px;">Chargement de la facture…</p>');
    let lignes = [];
    let cl = null;
    try {
      const r = await api.get(`/factures/${f.id}/detail`);
      lignes = r.data?.lignes || [];
    } catch(e) { /* fallback : impression sans detail si la requete echoue */ }
    try { const rp = await api.get('/clinique/profil'); cl = rp.data || null; } catch(e) { /* impression sans en-tete si echec */ }

    const lignesHtml = genererLignesFactureHtml(lignes, cl?.couleur_primaire || "#0A8F58");

    win.document.open();
    win.document.write(`
      <html><head><title>Facture ${f.reference||''}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:30px;color:#1a2e25;max-width:600px;margin:0 auto;}
        h2{color:${cl?.couleur_primaire||'#0A8F58'};font-size:16px;margin:0 0 16px;text-align:center;text-transform:uppercase;letter-spacing:1px;}
        .champ{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e5e7eb;font-size:14px;}
        .label{color:#8BA0B5;}
        .valeur{font-weight:700;}
        table{width:100%;border-collapse:collapse;margin-top:20px;font-size:13px;}
        th{text-align:left;color:#8BA0B5;font-size:11px;text-transform:uppercase;padding-bottom:6px;border-bottom:2px solid #1a2e25;}
        .totaux{margin-top:16px;}
        .totaux .champ{font-size:15px;}
        .total{font-size:20px;color:${cl?.couleur_primaire||'#0A8F58'};font-weight:900;text-align:right;margin-top:10px;}
        @media print{button{display:none;}}
      </style></head><body>
      <div class="header" style="display:flex;align-items:center;gap:14px;border-bottom:2px solid ${cl?.couleur_primaire||'#0A8F58'};padding-bottom:12px;margin-bottom:18px;">
        ${cl?.logo?`<img src="${cl.logo}" style="height:58px;object-fit:contain;"/>`:''}
        <div>
          <div style="font-size:16px;font-weight:700;color:${cl?.couleur_primaire||'#065F3C'};">${cl?.nom||'MediConnect Africa'}</div>
          <div style="font-size:11px;color:#5A7A94;">${cl?.adresse_complete||cl?.adresse||''} ${cl?.ville?'· '+cl.ville:''}</div>
          <div style="font-size:11px;color:#5A7A94;">${cl?.telephone||''} ${cl?.email?'· '+cl.email:''}</div>
        </div>
      </div>
      <h2>📄 Facture</h2>
      <div class="champ"><span class="label">Référence</span><span class="valeur">${f.reference||'—'}</span></div>
      <div class="champ"><span class="label">Patient</span><span class="valeur">${f.patient_nom||'—'}</span></div>
      <div class="champ"><span class="label">Date</span><span class="valeur">${new Date(f.created_at).toLocaleDateString('fr-CI',{day:'numeric',month:'long',year:'numeric'})}</span></div>
      <div class="champ"><span class="label">Statut</span><span class="valeur">${f.statut||'—'}</span></div>
      <table>
        <thead><tr><th>Acte</th><th style="text-align:center;">Qté</th><th style="text-align:right;">Prix unit.</th><th style="text-align:right;">À charge patient</th></tr></thead>
        <tbody>${lignesHtml}</tbody>
      </table>
      <div class="totaux">
        <div class="champ"><span class="label">Part assurance</span><span class="valeur">${Number(f.montant_assur||0).toLocaleString('fr-CI')} F</span></div>
        <div class="champ"><span class="label">Ticket modérateur (patient)</span><span class="valeur">${Number(f.ticket_moder||0).toLocaleString('fr-CI')} F</span></div>
      </div>
      <div class="total">Total : ${Number(f.montant_total||0).toLocaleString('fr-CI')} F</div>
      <div style="margin-top:30px;border-top:1px solid #e5e7eb;padding-top:14px;font-size:10px;color:#8BA0B5;display:flex;justify-content:space-between;">
        <div>${cl?.nom||'MediConnect Africa'}${cl?.site_web?' · '+cl.site_web:''}</div>
        <div style="text-align:right;">Cachet & signature<br/><br/><br/>_________________</div>
      </div>
      </body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(()=>win.print(), 300);
  };
  const { data: factData } = useQuery({ queryKey:["cl-factures"], queryFn:()=>cAPI.factures().then(r=>r.data||[]) });
  const factures = factData||[];
  const totalEncaisse = factures.filter(f=>f.statut==="payee").reduce((s,f)=>s+(+f.montant_total||0),0);
  const totalAttente  = factures.filter(f=>f.statut==="en_attente").reduce((s,f)=>s+(+f.montant_total||0),0);
  const [showEditFacture, setShowEditFacture] = useState(false);
  const [factureEnEdition, setFactureEnEdition] = useState(null);
  const [editFactureForm, setEditFactureForm] = useState({ montant_total:"", statut:"en_attente", mode_paiement:"" });
  const feFact = k => e => setEditFactureForm(p=>({...p,[k]:e.target.value}));
  const ouvrirEditionFacture = (f) => {
    setFactureEnEdition(f);
    setEditFactureForm({ montant_total:f.montant_total||"", statut:f.statut||"en_attente", mode_paiement:f.mode_paiement||"" });
    setShowEditFacture(true);
  };
  const editFactureMut = useMutation({
    mutationFn: d => cAPI.updateFacture(factureEnEdition.id, d),
    onSuccess: () => { toast.success("Facture modifiée !"); qc.invalidateQueries(["cl-factures"]); setShowEditFacture(false); setFactureEnEdition(null); },
    onError: e => toast.error(e?.response?.data?.message || "Erreur lors de la modification"),
  });

  // ===== Bordereaux de facturation assurance =====
  const [filtreBordereauStatut, setFiltreBordereauStatut] = useState("");
  const [bordereauSelectionne, setBordereauSelectionne] = useState(null);
  const [showCreationBordereau, setShowCreationBordereau] = useState(false);

  const { data: bordereaux = [], isLoading: loadingBordereaux } = useQuery({
    queryKey: ["cl-bordereaux", filtreBordereauStatut],
    queryFn: async () => {
      const r = await api.get("/bordereaux", { params: filtreBordereauStatut ? { statut: filtreBordereauStatut } : {} });
      return r.data;
    },
  });

  // Impression recapitulative du bordereau (PDF via impression navigateur),
  // meme patron que imprimerFactureResume : fenetre ouverte immediatement,
  // remplie une fois les donnees en-tete clinique recuperees.
  const imprimerBordereau = async (b) => {
    const win = window.open('', '_blank');
    win.document.write('<p style="font-family:Arial,sans-serif;padding:30px;">Chargement du bordereau…</p>');
    let cl = null;
    try { const rp = await api.get('/clinique/profil'); cl = rp.data || null; } catch(e) { /* impression sans en-tete si echec */ }

    const couleur = cl?.couleur_primaire || "#0A8F58";
    const lignesHtml = (b.lignes||[]).map(l => `
      <tr>
        <td>${(`${l.patient_prenom||''} ${l.patient_nom||''}`.trim()) || l.facture_reference || '—'}</td>
        <td style="text-align:right;">${fmt(l.montant_facture)} F</td>
        <td style="text-align:right;">${l.montant_contractuel!=null ? fmt(l.montant_contractuel)+' F' : '—'}</td>
        <td style="text-align:right;">${l.montant_contractuel!=null ? fmt(l.montant_facture-l.montant_contractuel)+' F' : '—'}</td>
        <td style="text-align:right;">${l.part_assurance!=null ? fmt(l.part_assurance)+' F' : '—'}</td>
        <td style="text-align:right;">${l.part_patient!=null ? fmt(l.part_patient)+' F' : '—'}</td>
        <td>${l.statut_ligne}</td>
      </tr>`).join('');

    win.document.open();
    win.document.write(`
      <html><head><title>Bordereau ${b.reference||''}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:30px;color:#1a2e25;max-width:760px;margin:0 auto;}
        h2{color:${couleur};font-size:16px;margin:0 0 16px;text-align:center;text-transform:uppercase;letter-spacing:1px;}
        .champ{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e5e7eb;font-size:14px;}
        .label{color:#8BA0B5;}
        .valeur{font-weight:700;}
        table{width:100%;border-collapse:collapse;margin-top:20px;font-size:13px;}
        th{text-align:left;color:#8BA0B5;font-size:11px;text-transform:uppercase;padding-bottom:6px;border-bottom:2px solid #1a2e25;}
        td{padding:8px 4px;border-bottom:1px solid #e5e7eb;}
        .totaux{margin-top:16px;}
        .totaux .champ{font-size:15px;}
        .total{font-size:20px;color:${couleur};font-weight:900;text-align:right;margin-top:10px;}
        @media print{button{display:none;}}
      </style></head><body>
      <div class="header" style="display:flex;align-items:center;gap:14px;border-bottom:2px solid ${couleur};padding-bottom:12px;margin-bottom:18px;">
        ${cl?.logo?`<img src="${cl.logo}" style="height:58px;object-fit:contain;"/>`:''}
        <div>
          <div style="font-size:16px;font-weight:700;color:${couleur};">${cl?.nom||'MediConnect Africa'}</div>
          <div style="font-size:11px;color:#5A7A94;">${cl?.adresse_complete||cl?.adresse||''} ${cl?.ville?'· '+cl.ville:''}</div>
        </div>
      </div>
      <h2>Bordereau de facturation assurance</h2>
      <div class="champ"><span class="label">Référence</span><span class="valeur">${b.reference||'—'}</span></div>
      <div class="champ"><span class="label">Compagnie</span><span class="valeur">${b.compagnie_nom||'—'}</span></div>
      <div class="champ"><span class="label">Période</span><span class="valeur">${fmtDate(b.periode_debut)} → ${fmtDate(b.periode_fin)}</span></div>
      <div class="champ"><span class="label">Statut</span><span class="valeur">${b.statut||'—'}</span></div>
      <table>
        <thead><tr><th>Facture</th><th style="text-align:right;">Facturé</th><th style="text-align:right;">Contractuel</th><th style="text-align:right;">Écart</th><th style="text-align:right;">Part assurance</th><th style="text-align:right;">Part patient</th><th>Statut</th></tr></thead>
        <tbody>${lignesHtml || '<tr><td colspan="7" style="text-align:center;padding:16px;color:#8BA0B5;">Aucune ligne</td></tr>'}</tbody>
      </table>
      <div class="totaux">
        <div class="champ"><span class="label">Montant validé</span><span class="valeur">${fmt(b.montant_valide)} F</span></div>
        <div class="champ"><span class="label">Montant rejeté</span><span class="valeur">${fmt(b.montant_rejete)} F</span></div>
      </div>
      <div class="total">Total : ${fmt(b.montant_total)} F</div>
      <script>window.onload=()=>window.print();<\/script>
      </body></html>`);
    win.document.close();
  };

  const ouvrirBordereau = async (id) => {
    try {
      const r = await api.get(`/bordereaux/${id}`);
      setBordereauSelectionne(r.data);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Impossible d'ouvrir ce bordereau");
    }
  };

  const transitionBordereauMut = useMutation({
    mutationFn: ({ id, statut }) => api.patch(`/bordereaux/${id}/statut`, { statut }),
    onSuccess: (_, variables) => {
      toast.success("Statut mis à jour");
      qc.invalidateQueries(["cl-bordereaux"]);
      if (bordereauSelectionne?.id === variables.id) ouvrirBordereau(variables.id);
    },
    onError: e => toast.error(e?.response?.data?.message || "Transition impossible"),
  });

  const BORDEREAU_STATUT_STYLE = {
    brouillon: "gray", en_collecte: "green", controle: "amber", pret_depot: "green",
    depose: "blue", valide_compagnie: "green", rejet_partiel: "amber",
    rejet_total: "red", litige: "red", paye: "green",
  };
  const BORDEREAU_STATUT_LABEL = {
    brouillon: "Brouillon", en_collecte: "En collecte", controle: "Contrôle",
    pret_depot: "Prêt à déposer", depose: "Déposé", valide_compagnie: "Validé",
    rejet_partiel: "Rejet partiel", rejet_total: "Rejet total", litige: "Litige", paye: "Payé",
  };
  const BORDEREAU_ACTIONS = {
    brouillon: [["en_collecte", "Démarrer la collecte"]],
    en_collecte: [["controle", "Envoyer au contrôle"]],
    controle: [["pret_depot", "Marquer prêt à déposer"], ["en_collecte", "Renvoyer en collecte"]],
    pret_depot: [["depose", "Confirmer le dépôt"]],
    rejet_partiel: [["litige", "Ouvrir en litige"], ["paye", "Solder"]],
    rejet_total: [["litige", "Ouvrir en litige"]],
    litige: [["depose", "Redéposer"], ["paye", "Solder"]],
    valide_compagnie: [["paye", "Marquer payé"]],
  };

  const FINANCE_TABS = [
    { key:"tableau-bord", label:"Tableau de bord" },
    { key:"factures", label:"Factures" },
    { key:"actes", label:"Actes & tarifs" },
    { key:"budget", label:"Budget" },
    { key:"assurances", label:"Remboursements" },
    { key:"bordereaux", label:"Bordereaux" },
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
            style={{ flex:1, background:tab===t.key?C.hover:"transparent", border:"none", borderRadius:8, padding:"9px 4px", cursor:"pointer", fontFamily:"inherit", color:tab===t.key?C.text:C.muted, fontSize:16, fontWeight:tab===t.key?700:400 }}>
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
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:5,fontSize:17}}>
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
                      <div style={{fontSize:17,fontWeight:700,color:C.text}}>{f.patient_nom||"Patient"}</div>
                      <div style={{fontSize:14,color:C.muted}}>{fmtDate(f.created_at)}</div>
                    </div>
                    <span style={{fontWeight:800,color:C.text}}>{fmt(f.montant_total)} F</span>
                    <Badge color={{payee:"green",en_attente:"amber",annulee:"red"}[f.statut]||"gray"}>{f.statut}</Badge>
                  </div>
                ))
              }
            </Panel>
          </Grid>
        </>
      )}

      {tab==="factures" && (
        <Panel title="Toutes les factures" actions={<Btn style={{padding:"6px 14px",fontSize:16}} onClick={()=>navigate("/clinique/dossiers")}>+ Facture (via Dossiers patients)</Btn>}>
          {factures.length===0
            ? <Empty icon="📄" title="Aucune facture" subtitle="Les factures générées depuis la caisse apparaîtront ici" />
            : <Table columns={[
                { key:"reference", label:"Référence", render:v=><span style={{fontFamily:"monospace",fontSize:16,color:C.teal}}>{v||"—"}</span> },
                { key:"patient_nom", label:"Patient", render:v=><span style={{fontWeight:700}}>{v||"—"}</span> },
                { key:"montant_total", label:"Montant", render:v=><span style={{fontWeight:800,color:C.green}}>{fmt(v)} F</span> },
                { key:"statut", label:"Statut", render:v=><Badge color={{payee:"green",en_attente:"amber",annulee:"red"}[v]||"gray"}>{v}</Badge> },
                { key:"created_at", label:"Date", render:v=>fmtDate(v) },
                { key:"id", label:"", render:(_,f)=>(
                  <div style={{display:"flex",gap:6}}>
                    <Btn variant="outline" style={{padding:"4px 10px",fontSize:14}} onClick={()=>imprimerFactureResume(f)}>PDF</Btn>
                    <Btn variant="outline" style={{padding:"4px 10px",fontSize:14}} onClick={()=>ouvrirEditionFacture(f)}>✏️ Modifier</Btn>
                  </div>
                ) },
              ]} rows={factures} />
          }
        </Panel>
      )}

      {tab==="budget" && (
        <Panel title="Budget mensuel et annuel">
          <div style={{ background:"rgba(10,143,88,.06)", border:"1px solid rgba(10,143,88,.2)", borderRadius:12, padding:16, marginBottom:20 }}>
            <Grid cols={3} gap={14}>
              <div style={{textAlign:"center"}}><div style={{fontSize:16,color:C.dim,marginBottom:4}}>Budget mensuel</div><div style={{fontSize:29,fontWeight:900,color:C.text}}>{fmt(totalBudget)} F</div></div>
              <div style={{textAlign:"center"}}><div style={{fontSize:16,color:C.dim,marginBottom:4}}>Réalisé</div><div style={{fontSize:29,fontWeight:900,color:totalRealise>totalBudget?C.red:C.green}}>{fmt(totalRealise)} F</div></div>
              <div style={{textAlign:"center"}}><div style={{fontSize:16,color:C.dim,marginBottom:4}}>Solde</div><div style={{fontSize:29,fontWeight:900,color:totalBudget-totalRealise>=0?C.green:C.red}}>{fmt(Math.abs(totalBudget-totalRealise))} F</div></div>
            </Grid>
          </div>
          {BUDGET_ITEMS.map(b=>(
            <div key={b.categorie} style={{ background:C.hover, borderRadius:10, padding:14, marginBottom:10 }}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <span style={{fontSize:18,fontWeight:700,color:C.text}}>{b.categorie}</span>
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

      {tab==="bordereaux" && (
        <>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <select value={filtreBordereauStatut} onChange={e=>setFiltreBordereauStatut(e.target.value)}
              style={{ background:C.input, border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 12px", color:C.text, fontFamily:"inherit" }}>
              <option value="">Tous les statuts</option>
              {Object.entries(BORDEREAU_STATUT_LABEL).map(([k,l])=>(<option key={k} value={k}>{l}</option>))}
            </select>
            <Btn onClick={()=>setShowCreationBordereau(true)}>+ Nouveau bordereau</Btn>
          </div>

          <Panel title="Bordereaux de facturation assurance">
            {loadingBordereaux
              ? <Empty icon="⏳" title="Chargement…" />
              : bordereaux.length===0
                ? <Empty icon="📑" title="Aucun bordereau" subtitle="Créez un bordereau pour grouper vos factures par compagnie d'assurance" />
                : <Table columns={[
                    { key:"reference", label:"Référence", render:v=><span style={{fontFamily:"monospace",fontSize:16,color:C.teal}}>{v}</span> },
                    { key:"compagnie_nom", label:"Compagnie" },
                    { key:"periode_debut", label:"Période", render:(_,b)=><span>{fmtDate(b.periode_debut)} → {fmtDate(b.periode_fin)}</span> },
                    { key:"nb_lignes", label:"Lignes" },
                    { key:"montant_total", label:"Montant", render:v=><span style={{fontWeight:800,color:C.green}}>{fmt(v)} F</span> },
                    { key:"statut", label:"Statut", render:v=><Badge color={BORDEREAU_STATUT_STYLE[v]||"gray"}>{BORDEREAU_STATUT_LABEL[v]||v}</Badge> },
                    { key:"id", label:"", render:(_,b)=><Btn variant="outline" style={{padding:"4px 10px",fontSize:14}} onClick={()=>ouvrirBordereau(b.id)}>Ouvrir</Btn> },
                  ]} rows={bordereaux} />
            }
          </Panel>

          {bordereauSelectionne && (
            <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
              <div style={{ background:C.bg, borderRadius:16, padding:24, width:"90%", maxWidth:780, maxHeight:"85vh", overflowY:"auto" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div>
                    <h3 style={{ margin:0, color:C.text }}>{bordereauSelectionne.reference}</h3>
                    <p style={{ margin:"4px 0", color:C.muted }}>{bordereauSelectionne.compagnie_nom}</p>
                  </div>
                  <Btn variant="outline" style={{padding:"4px 10px"}} onClick={()=>setBordereauSelectionne(null)}>✕</Btn>
                </div>

                <div style={{ margin:"12px 0" }}>
                  <Badge color={BORDEREAU_STATUT_STYLE[bordereauSelectionne.statut]||"gray"}>
                    {BORDEREAU_STATUT_LABEL[bordereauSelectionne.statut]||bordereauSelectionne.statut}
                  </Badge>
                </div>

                <Grid cols={3} gap={12} style={{ marginBottom:16 }}>
                  <Card label="Montant total" value={`${fmt(bordereauSelectionne.montant_total)} F`} icon="💰" color={C.blue} />
                  <Card label="Validé" value={`${fmt(bordereauSelectionne.montant_valide)} F`} icon="✅" color={C.green} />
                  <Card label="Rejeté" value={`${fmt(bordereauSelectionne.montant_rejete)} F`} icon="⚠️" color={C.red} />
                </Grid>

                {(bordereauSelectionne.lignes||[]).length>0 && (
                  <Table columns={[
                    { key:"patient_nom", label:"Patient", render:(v,l)=>`${l.patient_prenom||''} ${v||''}`.trim() || l.facture_reference || "—" },
                    { key:"montant_facture", label:"Facturé", render:v=>`${fmt(v)} F` },
                    { key:"montant_contractuel", label:"Tarif contractuel", render:v=>v!=null?`${fmt(v)} F`:"—" },
                    { key:"id", label:"Écart", render:(_,l)=>{
                        if (l.montant_contractuel==null) return "—";
                        const ecart = l.montant_facture - l.montant_contractuel;
                        return <span style={{ color: ecart===0?C.green:Math.abs(ecart)<1000?C.amber:C.red, fontWeight:700 }}>
                          {ecart>0?"+":""}{fmt(ecart)} F
                        </span>;
                      } },
                    { key:"part_assurance", label:"Part assurance", render:v=>v!=null?`${fmt(v)} F`:"—" },
                    { key:"part_patient", label:"Part patient", render:v=>v!=null?`${fmt(v)} F`:"—" },
                    { key:"statut_ligne", label:"Statut ligne" },
                  ]} rows={bordereauSelectionne.lignes} />
                )}

                <Btn variant="outline" style={{marginBottom:14}} onClick={()=>imprimerBordereau(bordereauSelectionne)}>🖨️ Imprimer</Btn>

                {(BORDEREAU_ACTIONS[bordereauSelectionne.statut]||[]).length>0 && (
                  <div style={{ display:"flex", gap:10, marginTop:20, flexWrap:"wrap" }}>
                    {BORDEREAU_ACTIONS[bordereauSelectionne.statut].map(([to,label])=>(
                      <Btn key={to} onClick={()=>transitionBordereauMut.mutate({ id:bordereauSelectionne.id, statut:to })}>
                        {label}
                      </Btn>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {showCreationBordereau && (
            <CreationBordereauModal
              onClose={()=>setShowCreationBordereau(false)}
              onCreated={()=>{ setShowCreationBordereau(false); qc.invalidateQueries(["cl-bordereaux"]); }}
            />
          )}
        </>
      )}

      {tab==="rapports" && (
        <Panel title="Rapports financiers">
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:14 }}>
            {[["📊","Bilan mensuel","Résultats du mois en cours"],["📈","Compte de résultat","Pertes et profits annuels"],["📋","Déclaration impôts","Formulaires fiscaux"],["💹","Taux de recouvrement","Suivi des paiements"],["🏦","Trésorerie","Flux de trésorerie"],["📉","Analyse des coûts","Répartition des charges"]].map(([icon,titre,desc])=>(
              <button key={titre} onClick={()=>toast.success(`Rapport "${titre}" en cours de génération…`)}
                style={{ background:C.hover, border:`1px solid ${C.border}`, borderRadius:12, padding:18, cursor:"pointer", textAlign:"left", fontFamily:"inherit", transition:"border-color .15s" }}
                onMouseOver={e=>e.currentTarget.style.borderColor=C.green} onMouseOut={e=>e.currentTarget.style.borderColor=C.border}>
                <div style={{fontSize:36,marginBottom:10}}>{icon}</div>
                <div style={{fontSize:17,fontWeight:700,color:C.text,marginBottom:4}}>{titre}</div>
                <div style={{fontSize:14,color:C.dim}}>{desc}</div>
              </button>
            ))}
          </div>
        </Panel>
      )}

      {tab==="actes" && <PanelGestionActes />}

      {/* Modal: Modifier facture */}
      <Modal open={showEditFacture} onClose={()=>{ setShowEditFacture(false); setFactureEnEdition(null); }} title={`✏️ Modifier — Facture ${factureEnEdition?.reference||""}`} width={520}>
        <div style={{background:C.hover,borderRadius:8,padding:"10px 12px",marginBottom:14,fontSize:15,color:C.muted}}>
          Patient : <strong style={{color:C.text}}>{factureEnEdition?.patient_nom||"—"}</strong>
        </div>
        <Grid cols={2} gap={12}>
          <Inp label="Montant total (FCFA)" value={editFactureForm.montant_total} onChange={feFact("montant_total")} type="number" placeholder="15000" />
          <Inp label="Mode de paiement" value={editFactureForm.mode_paiement} onChange={feFact("mode_paiement")} placeholder="Espèces" />
        </Grid>
        <Sel label="Statut" value={editFactureForm.statut} onChange={feFact("statut")}
          options={[{v:"en_attente",l:"En attente"},{v:"payee",l:"Payée"},{v:"annulee",l:"Annulée"}]} />
        <div style={{display:"flex",gap:10,marginTop:14}}>
          <Btn variant="outline" style={{flex:1}} onClick={()=>{ setShowEditFacture(false); setFactureEnEdition(null); }}>Annuler</Btn>
          <Btn style={{flex:2}} loading={editFactureMut.isPending} onClick={()=>editFactureMut.mutate(editFactureForm)}>Enregistrer les modifications</Btn>
        </div>
      </Modal>
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
            style={{ flex:1, background:tab===t.key?C.hover:"transparent", border:"none", borderRadius:8, padding:"9px 4px", cursor:"pointer", fontFamily:"inherit", color:tab===t.key?C.text:C.muted, fontSize:16, fontWeight:tab===t.key?700:400 }}>
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
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:5,fontSize:17}}>
                    <span style={{color:C.muted}}>{k.l}</span>
                    <span style={{fontWeight:700,color:k.c}}>{k.v}%</span>
                  </div>
                  <ProgressBar value={k.v} max={100} color={k.c} />
                </div>
              ))}
            </Panel>
            <Panel title="🔄 Amélioration continue" actions={<Btn style={{padding:"6px 14px",fontSize:16}}>+ Action</Btn>}>
              {[{icon:"✅",l:"Réduction temps d'attente",s:"En cours",c:C.amber},{icon:"✅",l:"Formation hygiène mains",s:"Complété",c:C.green},{icon:"🔄",l:"Audit qualité Q2 2026",s:"Planifié",c:C.blue},{icon:"📋",l:"Révision protocoles urgence",s:"En cours",c:C.amber}].map((a,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
                  <span style={{fontSize:23}}>{a.icon}</span>
                  <div style={{flex:1,fontSize:17,color:C.text}}>{a.l}</div>
                  <Badge color={{Complété:"green","En cours":"amber",Planifié:"blue"}[a.s]||"gray"}>{a.s}</Badge>
                </div>
              ))}
            </Panel>
          </Grid>
        </>
      )}

      {tab==="incidents" && (
        <Panel title="Rapports d'incidents" actions={<Btn style={{padding:"6px 14px",fontSize:16}}>+ Incident</Btn>}>
          <Table columns={[
            { key:"type", label:"Type d'incident", render:v=><span style={{fontWeight:700}}>{v}</span> },
            { key:"date", label:"Date", render:v=>fmtDate(v) },
            { key:"gravite", label:"Gravité", render:v=><Badge color={{Grave:"red",Modérée:"amber",Mineure:"gray"}[v]||"gray"}>{v}</Badge> },
            { key:"responsable", label:"Responsable" },
            { key:"statut", label:"Statut", render:v=><Badge color={{résolu:"green",en_cours:"amber"}[v]||"gray"}>{v}</Badge> },
            { key:"id", label:"", render:()=><Btn variant="outline" style={{padding:"4px 10px",fontSize:14}}>Voir</Btn> },
          ]} rows={INCIDENTS_DEMO} />
        </Panel>
      )}

      {tab==="politiques" && (
        <Panel title="Politiques et procédures" actions={<Btn style={{padding:"6px 14px",fontSize:16}}>+ Document</Btn>}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))", gap:14 }}>
            {POLITIQUES_DEMO.map(p=>(
              <div key={p.id} style={{ background:C.hover, borderRadius:12, padding:16, cursor:"pointer", transition:"border-color .15s" }}
                onClick={()=>toast.success(`Ouverture : ${p.titre}`)}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                  <Badge color="blue">{p.categorie}</Badge>
                  <span style={{fontSize:14,color:C.dim}}>{p.version}</span>
                </div>
                <div style={{fontSize:18,fontWeight:700,color:C.text,marginBottom:4}}>{p.titre}</div>
                <div style={{fontSize:14,color:C.dim}}>Mis à jour : {fmtDate(p.date)}</div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {tab==="urgences" && (
        <Panel title="Procédures d'urgence et contacts">
          <div style={{ background:"rgba(225,29,72,.08)", border:"1px solid rgba(225,29,72,.2)", borderRadius:12, padding:16, marginBottom:20 }}>
            <div style={{fontSize:18,fontWeight:700,color:C.red,marginBottom:12}}>🚨 Contacts d'urgence</div>
            <Grid cols={2} gap={12}>
              {[["SAMU","15"],["Pompiers","18"],["Police","17"],["Croix-Rouge","+225 27 00 00 00"],["Hôpital CHU","+225 27 11 22 33"],["Directeur médical","+225 07 00 00 00"]].map(([k,v])=>(
                <div key={k} style={{background:C.input,borderRadius:8,padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:17,color:C.text}}>{k}</span>
                  <span style={{fontSize:18,fontWeight:800,color:C.red}}>{v}</span>
                </div>
              ))}
            </Grid>
          </div>
          <Grid cols={2} gap={14}>
            {[["🏃","Plan d'évacuation","Voies de sortie et points de rassemblement"],["💊","Urgence médicale","Protocole RCP et défibrillateur"],["🔥","Incendie","Extincteurs et procédures d'évacuation"],["⚡","Panne électrique","Groupe électrogène et procédures"]].map(([icon,titre,desc])=>(
              <div key={titre} style={{background:C.hover,borderRadius:12,padding:16,cursor:"pointer"}} onClick={()=>toast.success(`Procédure : ${titre}`)}>
                <div style={{fontSize:36,marginBottom:8}}>{icon}</div>
                <div style={{fontSize:18,fontWeight:700,color:C.text,marginBottom:4}}>{titre}</div>
                <div style={{fontSize:16,color:C.dim}}>{desc}</div>
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
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5,fontSize:17}}>
                  <span style={{color:C.text,fontWeight:500}}>{s.critere}</span>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:14,color:C.dim}}>{s.reponses} rép.</span>
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
function PanelCompagniesFormules() {
  const qc = useQueryClient();
  const [compagnieOuverte, setCompagnieOuverte] = useState(null);
  const [showAddCompagnie, setShowAddCompagnie] = useState(false);
  const [showAddFormule, setShowAddFormule] = useState(false);
  const [nouvelleCompagnie, setNouvelleCompagnie] = useState({ nom:"", email:"", telephone:"", numero_agrement:"" });
  const [formulesInitiales, setFormulesInitiales] = useState([{ nom:"", taux_couverture:"", prime_mensuelle:"" }]);
  const [nouvelleFormule, setNouvelleFormule] = useState({ nom:"", prime_mensuelle:"", taux_couverture:"" });

  const { data: compagnies, isLoading } = useQuery({ queryKey:["cl-assureurs-liste"], queryFn:()=>cAPI.assureursListe().then(r=>r.data||[]) });
  const { data: formules } = useQuery({
    queryKey:["cl-formules", compagnieOuverte],
    queryFn:()=>cAPI.formulesParAssureur(compagnieOuverte).then(r=>r.data||[]),
    enabled: !!compagnieOuverte,
  });

  const addCompagnieMut = useMutation({
    mutationFn: async () => {
      const r = await api.post("/assureurs", nouvelleCompagnie);
      const compagnie = r.data;
      const formulesValides = formulesInitiales.filter(f=>f.nom.trim() && f.taux_couverture!=="");
      for (const f of formulesValides) {
        await api.post("/formules-assurance", {
          assureur_id: compagnie.id, nom: f.nom,
          taux_couverture: parseInt(f.taux_couverture),
          prime_mensuelle: f.prime_mensuelle ? parseInt(f.prime_mensuelle) : null,
        });
      }
      return { compagnie, nbFormules: formulesValides.length };
    },
    onSuccess: ({ nbFormules }) => {
      toast.success(nbFormules>0 ? `Compagnie ajoutée avec ${nbFormules} formule${nbFormules>1?'s':''} !` : "Compagnie ajoutée !");
      qc.invalidateQueries(["cl-assureurs-liste"]);
      setShowAddCompagnie(false);
      setNouvelleCompagnie({ nom:"", email:"", telephone:"", numero_agrement:"" });
      setFormulesInitiales([{ nom:"", taux_couverture:"", prime_mensuelle:"" }]);
    },
    onError: () => toast.error("Erreur"),
  });
  const ajouterLigneFormuleInitiale = () => setFormulesInitiales(l => [...l, { nom:"", taux_couverture:"", prime_mensuelle:"" }]);
  const majLigneFormuleInitiale = (i, k, v) => setFormulesInitiales(l => l.map((row,j) => j===i ? {...row,[k]:v} : row));
  const retirerLigneFormuleInitiale = (i) => setFormulesInitiales(l => l.filter((_,j) => j!==i));
  const addFormuleMut = useMutation({
    mutationFn: () => api.post("/formules-assurance", { ...nouvelleFormule, assureur_id: compagnieOuverte }),
    onSuccess: () => { toast.success("Formule ajoutée !"); qc.invalidateQueries(["cl-formules", compagnieOuverte]); setShowAddFormule(false); setNouvelleFormule({ nom:"", prime_mensuelle:"", taux_couverture:"" }); },
    onError: () => toast.error("Erreur"),
  });
  const editFormuleMut = useMutation({
    mutationFn: ({id,taux_couverture}) => api.put(`/formules-assurance/${id}`, { taux_couverture }),
    onSuccess: () => { toast.success("Taux mis à jour"); qc.invalidateQueries(["cl-formules", compagnieOuverte]); },
    onError: () => toast.error("Erreur"),
  });
  const supprimerFormuleMut = useMutation({
    mutationFn: (id) => api.delete(`/formules-assurance/${id}`),
    onSuccess: () => { toast.success("Formule retirée"); qc.invalidateQueries(["cl-formules", compagnieOuverte]); },
    onError: () => toast.error("Erreur"),
  });

  return (
    <div>
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:14}}>
        <Btn style={{padding:"6px 14px",fontSize:16}} onClick={()=>setShowAddCompagnie(true)}>+ Nouvelle compagnie</Btn>
      </div>
      {isLoading ? <Loader/> : (compagnies||[]).map(c=>(
        <Panel key={c.id} style={{marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}}
            onClick={()=>setCompagnieOuverte(o=>o===c.id?null:c.id)}>
            <div>
              <div style={{fontSize:18,fontWeight:700,color:C.text}}>{c.nom}</div>
              <div style={{fontSize:13,color:C.muted}}>{c.numero_agrement?`Agrément ${c.numero_agrement}`:"—"}</div>
            </div>
            <span style={{color:C.muted,fontSize:18}}>{compagnieOuverte===c.id?"▲":"▼"}</span>
          </div>
          {compagnieOuverte===c.id && (
            <div style={{marginTop:14,paddingTop:14,borderTop:`1px solid ${C.border}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <span style={{fontSize:14,fontWeight:700,color:C.dim,textTransform:"uppercase"}}>Formules</span>
                <Btn style={{padding:"4px 10px",fontSize:14}} onClick={()=>setShowAddFormule(true)}>+ Formule</Btn>
              </div>
              {(formules||[]).length===0
                ? <Empty icon="📋" title="Aucune formule" />
                : (formules||[]).map(f=>(
                  <div key={f.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:15,fontWeight:600,color:C.text}}>{f.nom}</div>
                      {f.prime_mensuelle && <div style={{fontSize:13,color:C.muted}}>{fmt(f.prime_mensuelle)} F/mois</div>}
                    </div>
                    <input type="number" defaultValue={f.taux_couverture} style={{width:70,padding:"6px 8px",background:C.input,border:`1px solid ${C.border}`,borderRadius:6,color:C.text,fontSize:14,textAlign:"center"}}
                      onBlur={e=>{ const v=parseInt(e.target.value); if(v!==f.taux_couverture && !isNaN(v)) editFormuleMut.mutate({id:f.id,taux_couverture:v}); }} />
                    <span style={{fontSize:13,color:C.muted}}>%</span>
                    <button onClick={()=>window.confirm("Retirer cette formule ?")&&supprimerFormuleMut.mutate(f.id)}
                      style={{background:"transparent",border:"none",color:C.red,cursor:"pointer",fontSize:16}}>✕</button>
                  </div>
                ))
              }
            </div>
          )}
        </Panel>
      ))}

      <Modal open={showAddCompagnie} onClose={()=>setShowAddCompagnie(false)} title="🏢 Nouvelle compagnie">
        <Inp label="Nom *" required value={nouvelleCompagnie.nom} onChange={e=>setNouvelleCompagnie(f=>({...f,nom:e.target.value}))} />
        <Inp label="N° Agrément" value={nouvelleCompagnie.numero_agrement} onChange={e=>setNouvelleCompagnie(f=>({...f,numero_agrement:e.target.value}))} />
        <Grid cols={2} gap={10}>
          <Inp label="Email" value={nouvelleCompagnie.email} onChange={e=>setNouvelleCompagnie(f=>({...f,email:e.target.value}))} />
          <Inp label="Téléphone" value={nouvelleCompagnie.telephone} onChange={e=>setNouvelleCompagnie(f=>({...f,telephone:e.target.value}))} />
        </Grid>
        <div style={{marginTop:6,marginBottom:4,fontSize:14,fontWeight:700,color:C.dim,textTransform:"uppercase"}}>Formules & taux de couverture</div>
        <div style={{fontSize:13,color:C.dim,marginBottom:10}}>Optionnel — les taux autorisés par cette compagnie. Vous pourrez en ajouter d'autres plus tard.</div>
        {formulesInitiales.map((f,i)=>(
          <div key={i} style={{display:"grid",gridTemplateColumns:"1.6fr 0.9fr 1fr auto",gap:8,marginBottom:8,alignItems:"end"}}>
            <Inp label={i===0?"Nom de la formule":""} value={f.nom} onChange={e=>majLigneFormuleInitiale(i,"nom",e.target.value)} placeholder="Ex: Essentielle" />
            <Inp label={i===0?"Taux (%)":""} type="number" min="0" max="100" value={f.taux_couverture} onChange={e=>majLigneFormuleInitiale(i,"taux_couverture",e.target.value)} placeholder="70" />
            <Inp label={i===0?"Prime/mois (FCFA)":""} type="number" value={f.prime_mensuelle} onChange={e=>majLigneFormuleInitiale(i,"prime_mensuelle",e.target.value)} placeholder="Facultatif" />
            <button onClick={()=>retirerLigneFormuleInitiale(i)} disabled={formulesInitiales.length<=1}
              style={{padding:"11px 10px",borderRadius:8,background:"transparent",border:`1.5px solid ${C.border}`,color:formulesInitiales.length<=1?C.dim:C.red,cursor:formulesInitiales.length<=1?"not-allowed":"pointer",fontSize:17,fontWeight:700,fontFamily:"inherit"}}>
              {formulesInitiales.length>1?"✕":"—"}
            </button>
          </div>
        ))}
        <button onClick={ajouterLigneFormuleInitiale} style={{width:"100%",marginBottom:14,padding:"8px",borderRadius:8,background:"transparent",border:`1.5px dashed ${C.border}`,color:C.muted,cursor:"pointer",fontSize:16,fontWeight:700,fontFamily:"inherit"}}>+ Nouvelle formule</button>
        <Btn style={{width:"100%"}} loading={addCompagnieMut.isPending} onClick={()=>{
          if(!nouvelleCompagnie.nom){toast.error("Nom requis");return;}
          const incomplet = formulesInitiales.some(f=>(f.nom.trim() && f.taux_couverture==="") || (!f.nom.trim() && f.taux_couverture!==""));
          if(incomplet){toast.error("Chaque formule doit avoir un nom ET un taux, ou être laissée vide");return;}
          addCompagnieMut.mutate();
        }}>Créer</Btn>
      </Modal>

      <Modal open={showAddFormule} onClose={()=>setShowAddFormule(false)} title="📋 Nouvelle formule">
        <Inp label="Nom de la formule *" required value={nouvelleFormule.nom} onChange={e=>setNouvelleFormule(f=>({...f,nom:e.target.value}))} placeholder="Ex: Essentielle, Premium…" />
        <Grid cols={2} gap={10}>
          <Inp label="Prime mensuelle (FCFA)" type="number" value={nouvelleFormule.prime_mensuelle} onChange={e=>setNouvelleFormule(f=>({...f,prime_mensuelle:e.target.value}))} />
          <Inp label="Taux de couverture (%) *" required type="number" min="0" max="100" value={nouvelleFormule.taux_couverture} onChange={e=>setNouvelleFormule(f=>({...f,taux_couverture:e.target.value}))} />
        </Grid>
        <Btn style={{width:"100%"}} loading={addFormuleMut.isPending} onClick={()=>{
          if(!nouvelleFormule.nom||nouvelleFormule.taux_couverture===""){toast.error("Nom et taux requis");return;}
          addFormuleMut.mutate();
        }}>Créer</Btn>
      </Modal>
    </div>
  );
}

function PageAssurance() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("dossiers");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ patient_nom:"", compagnie:"", numero_police:"", taux_couverture:80, montant_plafond:500000 });
  const { data, isLoading } = useQuery({ queryKey:["cl-dossiers"], queryFn:()=>cAPI.dossiers().then(r=>r.data||[]) });
  // Liste reelle (16 compagnies), plus la liste fictive a 7 noms
  // deconnectee de la vraie table assureurs.
  const { data: assureursData } = useQuery({ queryKey:["cl-assureurs-liste"], queryFn:()=>cAPI.assureursListe().then(r=>r.data||[]) });
  const updMut = useMutation({ mutationFn:({id,statut})=>cAPI.updateDossier(id,{statut}), onSuccess:()=>{ toast.success("Dossier mis à jour"); qc.invalidateQueries(["cl-dossiers"]); } });
  const addMut = useMutation({ mutationFn:d=>cAPI.addDossier(d), onSuccess:()=>{ toast.success("Dossier soumis !"); qc.invalidateQueries(["cl-dossiers"]); setShowAdd(false); } });
  const delMut = useMutation({ mutationFn:id=>cAPI.deleteDossier(id), onSuccess:()=>{ toast.success("Supprimé"); qc.invalidateQueries(["cl-dossiers"]); } });

  const f = k => e => setForm(p=>({...p,[k]:e.target.value}));
  const dossiers = data||[];
  const COMPAGNIES = (assureursData||[]).map(a=>a.nom);
  const scol = { soumis:"blue", en_attente:"amber", valide:"green", rejete:"red" };
  const fmt_money = v => <span style={{fontWeight:700,color:C.green}}>{fmt(v)} F</span>;

  return (
    <div>
      <PageHeader title="🛡️ Assurances Tiers-Payant" subtitle="Dossiers remboursement · Conventions assurance"
        actions={tab==="dossiers"?<Btn onClick={()=>setShowAdd(true)}>+ Nouveau dossier</Btn>:null} />

      <div style={{display:"flex",gap:4,background:C.input,borderRadius:10,padding:4,marginBottom:20}}>
        {[["dossiers","📁 Dossiers"],["compagnies","🏢 Compagnies & formules"]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)}
            style={{flex:1,background:tab===k?C.hover:"transparent",border:"none",borderRadius:8,padding:"9px 4px",cursor:"pointer",fontFamily:"inherit",color:tab===k?C.text:C.muted,fontSize:16,fontWeight:tab===k?700:400}}>
            {l}
          </button>
        ))}
      </div>

      {tab==="compagnies" && <PanelCompagniesFormules />}

      {tab==="dossiers" && (<>
      <Grid cols={4} gap={14} style={{marginBottom:20}}>
        <Card label="Total dossiers" value={dossiers.length} icon="📁" />
        <Card label="Validés" value={dossiers.filter(d=>d.statut==="valide").length} icon="✅" color={C.green} />
        <Card label="En attente" value={dossiers.filter(d=>["en_attente","soumis"].includes(d.statut)).length} icon="⏳" color={C.amber} />
        <Card label="À récupérer" value={`${fmt(dossiers.filter(d=>d.statut==="valide").reduce((s,d)=>s+(+d.montant_assur||0),0))} F`} icon="💰" color={C.green} />
      </Grid>
      {isLoading ? <Loader /> : (
        <Panel>
          <Table emptyMsg="Aucun dossier assurance" columns={[
            { key:"patient_nom", label:"Patient", render:(v,r)=><><div style={{fontWeight:700}}>{v||r.patient_id||"—"}</div><div style={{fontSize:14,color:C.muted}}>{r.numero_police}</div></> },
            { key:"compagnie", label:"Compagnie" },
            { key:"montant_total", label:"Total", render:v=>fmt_money(v) },
            { key:"montant_assur", label:"Part ass.", render:v=>fmt_money(v) },
            { key:"ticket_moder", label:"Ticket mod.", render:v=><span style={{fontWeight:700,color:C.amber}}>{fmt(v)} F</span> },
            { key:"statut", label:"Statut", render:v=><Badge color={scol[v]||"gray"}>{v}</Badge> },
            { key:"id", label:"Actions", render:(id,row)=>(
              <div style={{display:"flex",gap:5}}>
                {row.statut==="soumis"&&<Btn variant="outline" style={{padding:"4px 9px",fontSize:14,color:C.teal}} onClick={()=>updMut.mutate({id,statut:"en_attente"})}>→</Btn>}
                {row.statut==="en_attente"&&<Btn variant="outline" style={{padding:"4px 9px",fontSize:14,color:C.green}} onClick={()=>updMut.mutate({id,statut:"valide"})}>✓</Btn>}
                <Btn variant="outline" style={{padding:"4px 9px",fontSize:14,color:C.red}} onClick={()=>window.confirm("Supprimer ?")&&delMut.mutate(id)}>✕</Btn>
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
        <div style={{background:"rgba(10,143,88,.07)",border:"1px solid rgba(10,143,88,.2)",borderRadius:8,padding:12,marginBottom:14,fontSize:17}}>
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
      </>)}
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
                  <div style={{fontSize:12,color:C.green,fontWeight:700}}>{PATIENTS[i]}</div>
                  <div style={{width:"100%",height:`${h}%`,background:i===4?`linear-gradient(to top,${C.green},${C.teal})`:`rgba(10,143,88,.3)`,borderRadius:"3px 3px 0 0"}} />
                  <div style={{fontSize:10,color:C.dim}}>{m}</div>
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
                  <div style={{fontSize:12,color:C.amber,fontWeight:700}}>{Math.round(REVENUS[i]/1000)}</div>
                  <div style={{width:"100%",height:`${h}%`,background:i===4?`linear-gradient(to top,${C.amber},${C.green})`:`rgba(217,119,6,.3)`,borderRadius:"3px 3px 0 0"}} />
                  <div style={{fontSize:10,color:C.dim}}>{m}</div>
                </div>
              );
            })}
          </div>
        </Panel>
        <Panel title="🩺 Répartition par spécialité">
          {[{l:"Médecine générale",v:42,c:C.green},{l:"Pédiatrie",v:18,c:C.blue},{l:"Gynécologie",v:15,c:C.purple},{l:"Cardiologie",v:12,c:C.red},{l:"Autres",v:13,c:C.muted}].map(k=>(
            <div key={k.l} style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:17}}>
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
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:17}}>
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
  const { token } = useAuthStore();
  const location = useLocation();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  // Patient deja choisi depuis "Dossiers patients" : on saute directement
  // la recherche par code, unifiant les deux formulaires de consultation
  // qui existaient jusqu'ici separement (l'un complet ici, l'autre
  // tronque dans Dossiers) en un seul et meme formulaire reel.
  const [patient, setPatient] = useState(() => location.state?.patientPreselectionne || null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    motif:"", diagnostic:"", traitement:"", ta:"", temperature:"", poids:"", taille:"", notes:"",
    pouls:"", pc:"", fr:"", tso2:"", pb:"", pcui:"",
    hdm_antecedents:"", examen_clinique:"", hypotheses_diagnostiques:"",
    biologie_texte:"", imagerie_texte:"", autres_examens:"",
    diagnostic_predefini:"", traitement_predefini:"", date_controle:"",
  });
  const [bioSel, setBioSel] = useState([]); // examens de biologie prédéfinis sélectionnés
  const [searchDiag, setSearchDiag] = useState("");
  const [searchTrait, setSearchTrait] = useState("");
  const [lastConsult, setLastConsult] = useState(null);
  const [showOrd, setShowOrd] = useState(false);
  const [lignes, setLignes] = useState([{nom:"",qte:"",unite:"",posologie:"",duree:""}]);
  const addLigne = ()=>setLignes(l=>[...l,{nom:"",qte:"",unite:"",posologie:"",duree:""}]);
  const delLigne = (i)=>setLignes(l=>l.filter((_,j)=>j!==i));
  const updLigne = (i,k,v)=>setLignes(l=>l.map((row,j)=>j===i?{...row,[k]:v}:row));

  // Catalogues réutilisés depuis le module Dossiers (même clés = même cache)
  const { data: catalogue } = useQuery({ queryKey:["cl-actes"], queryFn:async()=>{
    const r = await fetch(`https://mediconnect-backend-v2.vercel.app/api/actes`,{headers:{Authorization:`Bearer ${token}`}});
    const d = await r.json(); return d.data||[];
  }});
  const actesBio = (catalogue||[]).filter(a=>a.categorie==="Laboratoire");
  const { data: affections } = useQuery({ queryKey:["cl-cim10"], queryFn:async()=>{
    const r = await fetch(`https://mediconnect-backend-v2.vercel.app/api/affections`);
    const d = await r.json(); return d.data||[];
  }});
  const diagResults = searchDiag.length>1 ? (affections||[]).filter(a=>`${a.code} ${a.libelle}`.toLowerCase().includes(searchDiag.toLowerCase())).slice(0,15) : [];
  const { data: medicaments } = useQuery({ queryKey:["cons-medicaments", searchTrait], queryFn:async()=>{
    if (searchTrait.length<2) return [];
    const r = await api.get(`/patients/medicaments?search=${encodeURIComponent(searchTrait)}`);
    return r.data||[];
  }});
  // File d'attente du medecin -- remplace la simple recherche par code
  // comme point d'entree principal : le medecin voit ses patients du
  // jour et clique pour ouvrir directement leur consultation.
  const { data: fileAttente, isLoading: chargementFile } = useQuery({
    queryKey: ["cons-file-attente"],
    queryFn: () => api.get(`/file-attente/liste`).then(r => r.data||[]),
    enabled: !patient,
    refetchInterval: !patient ? 15000 : false,
  });
  const attente = (fileAttente||[]).filter(e=>['en_attente','appele','en_consultation'].includes(e.statut));
  const appellerPatientMut = useMutation({
    mutationFn: ({id,action}) => api.put(`/file-attente/${id}/${action}`),
    onSuccess: () => qc.invalidateQueries(["cons-file-attente"]),
  });
  const selectionnerDepuisFile = async (e) => {
    if (!e.patient_id) { toast.error("Ce patient n'a pas de dossier MediConnect lié"); return; }
    try {
      const r = await api.get(`/patients/${e.patient_id}`);
      setPatient(r.data.data);
      if (e.statut !== 'en_consultation') appellerPatientMut.mutate({ id:e.id, action:'consultation' });
    } catch { toast.error("Erreur lors du chargement du dossier patient"); }
  };
  // Carte patient (passage) active -- meme logique que ConsultationWorkflow.jsx,
  // pour que le rapport d'hospitalisation puisse retrouver cette consultation.
  const { data: passageActifConsult } = useQuery({
    queryKey: ["consult-page-passage-actif", patient?.id],
    queryFn: () => api.get(`/passages/patient/${patient.id}/actif`).then(r => r.data || null),
    enabled: !!patient?.id,
  });
  const toggleBio = (a) => setBioSel(prev => prev.find(x=>x.code===a.code) ? prev.filter(x=>x.code!==a.code) : [...prev,a]);
  const imcAuto = (form.poids && form.taille) ? (parseFloat(form.poids) / Math.pow(parseFloat(form.taille)/100, 2)).toFixed(1) : "";

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
    onSuccess: (data)=>{
      toast.success("✅ Consultation enregistrée !");setShowForm(false);setLastConsult(data?.data||data);setShowOrd(true);
      setForm({motif:"",diagnostic:"",traitement:"",ta:"",temperature:"",poids:"",taille:"",notes:"",pouls:"",pc:"",fr:"",tso2:"",pb:"",pcui:"",hdm_antecedents:"",examen_clinique:"",hypotheses_diagnostiques:"",biologie_texte:"",imagerie_texte:"",autres_examens:"",diagnostic_predefini:"",traitement_predefini:"",date_controle:""});
      setBioSel([]);setSearchDiag("");setSearchTrait("");
      qc.invalidateQueries(["cl-stats"]);
    },
    onError: ()=>toast.error("Erreur enregistrement"),
  });

  const addOrd = useMutation({
    mutationFn: d => api.post('/ordonnances',d),
    onSuccess: ()=>{ toast.success("💊 Ordonnance créée !"); setShowOrd(false); setLignes([{nom:"",qte:"",unite:"",posologie:"",duree:""}]); },
    onError: ()=>toast.error("Erreur ordonnance"),
  });

  return (
    <div>
      <PageHeader title="🩺 Consultation" subtitle="Vos patients du jour" />
      {!patient && (
        <Panel style={{maxWidth:640,margin:"0 auto 20px"}} title="🚶 Salle d'attente">
          {chargementFile ? <Loader/> : attente.length===0 ? (
            <Empty icon="✅" title="Aucun patient en attente" subtitle="Les patients affectés depuis le bureau des entrées apparaîtront ici." />
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {attente.map(e=>(
                <div key={e.id} onClick={()=>selectionnerDepuisFile(e)}
                  style={{background:C.hover,border:`1.5px solid ${e.statut==='appele'?"#3B82F6":C.border}`,borderRadius:10,padding:"12px 14px",display:"flex",alignItems:"center",gap:12,cursor:"pointer"}}>
                  <div style={{width:36,height:36,borderRadius:9,background:"rgba(13,148,136,.15)",border:`1.5px solid ${C.teal}`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,color:C.teal,flexShrink:0}}>{e.rang}</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:16,color:C.text}}>{e.patient_nom}</div>
                    {e.motif && <div style={{fontSize:13,color:C.muted}}>💬 {e.motif}</div>}
                  </div>
                  <Badge color={e.statut==='appele'?"blue":e.statut==='en_consultation'?"green":"amber"}>
                    {e.statut==='appele'?"Appelé":e.statut==='en_consultation'?"En consultation":"En attente"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}
      <Panel style={{maxWidth:540,margin:"0 auto 20px"}}>
        <div style={{fontSize:14,fontWeight:700,color:C.muted,marginBottom:10,textTransform:"uppercase",letterSpacing:".5px"}}>Ou recherche directe par code</div>
        <div style={{marginBottom:18}}>
          <label style={{display:"block",fontSize:14,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".5px",marginBottom:8}}>Code secret patient</label>
          <div style={{display:"flex",gap:10}}>
            <input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} onKeyDown={e=>e.key==="Enter"&&chercher()} placeholder="MC-KJ-0001"
              style={{flex:1,background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:9,padding:"11px 14px",color:C.text,fontSize:21,outline:"none",fontFamily:"monospace",letterSpacing:2}}
              onFocus={e=>e.target.style.borderColor=C.green} onBlur={e=>e.target.style.borderColor=C.border}/>
            <Btn loading={loading} onClick={chercher}>Rechercher</Btn>
          </div>
          <div style={{fontSize:14,color:C.dim,marginTop:6}}>Code visible sur la carte MediConnect du patient (ex: MC-KJ-0001)</div>
        </div>
        {patient&&(
          <div style={{background:"rgba(10,143,88,.08)",border:"1px solid rgba(10,143,88,.2)",borderRadius:12,padding:16}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
              <div style={{width:44,height:44,background:`linear-gradient(135deg,${C.green},${C.teal})`,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,color:"#fff",fontSize:23}}>{patient.prenom?.[0]||"P"}</div>
              <div>
                <div style={{fontSize:20,fontWeight:800,color:C.text}}>{patient.prenom||"—"} {patient.nom||"—"}</div>
                <div style={{fontSize:16,color:C.muted}}>Code: {patient.code_secret} · {patient.groupe_sanguin||"—"} · {patient.telephone||"—"}</div>
              </div>
            </div>
            {patient.allergies&&<div style={{fontSize:16,color:C.amber,marginBottom:8}}>⚠️ Allergies: {patient.allergies}</div>}
            {patient.antecedents&&<div style={{fontSize:16,color:C.muted,marginBottom:8}}>📋 Antécédents: {patient.antecedents}</div>}
            <Btn style={{width:"100%",marginTop:4}} onClick={()=>setShowForm(true)}>🩺 Démarrer la consultation</Btn>
          </div>
        )}
      </Panel>

      {showForm&&patient&&(
        <div onClick={()=>setShowForm(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}>
          <div onClick={e=>e.stopPropagation()} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:28,width:900,maxWidth:"96vw",maxHeight:"92vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <h2 style={{fontSize:22,fontWeight:700,color:C.text,margin:0}}>🩺 {patient.prenom} {patient.nom}</h2>
              <button onClick={()=>setShowForm(false)} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:26}}>✕</button>
            </div>

            {/* ── Constantes médicales ─────────────────────────── */}
            <div style={{fontSize:14,fontWeight:800,color:C.teal,textTransform:"uppercase",letterSpacing:".5px",marginBottom:8}}>Constantes médicales</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:6}}>
              {[["T° (°C)","temperature","37"],["TA (mmHg)","ta","120/80"],["Pouls (bpm)","pouls","72"],["Poids (kg)","poids","70"]].map(([label,key,ph])=>(
                <div key={key}>
                  <label style={{display:"block",fontSize:13,fontWeight:700,color:C.muted,textTransform:"uppercase",marginBottom:4}}>{label}</label>
                  <input value={form[key]||""} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} placeholder={ph}
                    style={{width:"100%",background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:9,padding:"8px 10px",color:C.text,fontSize:16,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
                </div>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
              <div>
                <label style={{display:"block",fontSize:13,fontWeight:700,color:C.muted,textTransform:"uppercase",marginBottom:4}}>Taille (cm)</label>
                <input value={form.taille||""} onChange={e=>setForm(f=>({...f,taille:e.target.value}))} placeholder="175"
                  style={{width:"100%",background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:9,padding:"8px 10px",color:C.text,fontSize:16,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
              </div>
              <div>
                <label style={{display:"block",fontSize:13,fontWeight:700,color:C.muted,textTransform:"uppercase",marginBottom:4}}>IMC (calculé)</label>
                <input value={imcAuto} readOnly placeholder="—"
                  style={{width:"100%",background:C.card,border:`1.5px solid ${C.border}`,borderRadius:9,padding:"8px 10px",color:C.dim,fontSize:16,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
              </div>
              {[["PC (cm)","pc"],["FR (cycles/min)","fr"]].map(([label,key])=>(
                <div key={key}>
                  <label style={{display:"block",fontSize:13,fontWeight:700,color:C.muted,textTransform:"uppercase",marginBottom:4}}>{label}</label>
                  <input value={form[key]||""} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}
                    style={{width:"100%",background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:9,padding:"8px 10px",color:C.text,fontSize:16,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
                </div>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:20}}>
              {[["TSO2 (%)","tso2"],["PB (cm)","pb"],["PCui (cm)","pcui"]].map(([label,key])=>(
                <div key={key}>
                  <label style={{display:"block",fontSize:13,fontWeight:700,color:C.muted,textTransform:"uppercase",marginBottom:4}}>{label}</label>
                  <input value={form[key]||""} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}
                    style={{width:"100%",background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:9,padding:"8px 10px",color:C.text,fontSize:16,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
                </div>
              ))}
            </div>

            {/* ── Examen clinique & diagnostic ─────────────────── */}
            <div style={{fontSize:14,fontWeight:800,color:C.teal,textTransform:"uppercase",letterSpacing:".5px",marginBottom:8}}>Examen clinique</div>
            {[["Motif de la consultation *","motif","Raison de la consultation…",5],["H.D.M / Antécédents","hdm_antecedents","Histoire de la maladie, antécédents…",4],["Examen clinique","examen_clinique","Constatations à l'examen…",5],["Hypothèses diagnostiques","hypotheses_diagnostiques","Hypothèses envisagées…",4]].map(([label,key,ph,rows])=>(
              <div key={key} style={{marginBottom:12}}>
                <label style={{display:"block",fontSize:14,fontWeight:700,color:C.muted,textTransform:"uppercase",marginBottom:4}}>{label}</label>
                <textarea value={form[key]||""} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} rows={rows} placeholder={ph}
                  style={{width:"100%",background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:9,padding:"10px 14px",color:C.text,fontSize:17,resize:"none",outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
              </div>
            ))}

            {/* ── Examens para-cliniques ────────────────────────── */}
            <div style={{fontSize:14,fontWeight:800,color:C.teal,textTransform:"uppercase",letterSpacing:".5px",margin:"16px 0 8px"}}>Examens para-cliniques</div>
            <div style={{marginBottom:12}}>
              <label style={{display:"block",fontSize:14,fontWeight:700,color:C.muted,textTransform:"uppercase",marginBottom:6}}>1 — Biologie</label>
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
                {actesBio.length===0
                  ? <span style={{fontSize:14,color:C.dim}}>Aucun examen de biologie dans le catalogue</span>
                  : actesBio.map(a=>{
                    const sel = bioSel.some(x=>x.code===a.code);
                    return (
                      <button key={a.code} type="button" onClick={()=>toggleBio(a)}
                        style={{padding:"5px 10px",borderRadius:20,border:`1.5px solid ${sel?C.teal:C.border}`,background:sel?"rgba(13,148,136,.15)":"transparent",color:sel?C.teal:C.muted,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                        {sel?"✓ ":""}{a.libelle}
                      </button>
                    );
                  })
                }
              </div>
              <textarea value={form.biologie_texte} onChange={e=>setForm(f=>({...f,biologie_texte:e.target.value}))} rows={3} placeholder="Précisions complémentaires (biologie)…"
                style={{width:"100%",background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:9,padding:"10px 14px",color:C.text,fontSize:17,resize:"none",outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
            </div>
            <div style={{marginBottom:12}}>
              <label style={{display:"block",fontSize:14,fontWeight:700,color:C.muted,textTransform:"uppercase",marginBottom:4}}>2 — Imagerie médicale</label>
              <textarea value={form.imagerie_texte} onChange={e=>setForm(f=>({...f,imagerie_texte:e.target.value}))} rows={3} placeholder="Radiographie, échographie…"
                style={{width:"100%",background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:9,padding:"10px 14px",color:C.text,fontSize:17,resize:"none",outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
            </div>
            <div style={{marginBottom:16}}>
              <label style={{display:"block",fontSize:14,fontWeight:700,color:C.muted,textTransform:"uppercase",marginBottom:4}}>3 — Autres</label>
              <textarea value={form.autres_examens} onChange={e=>setForm(f=>({...f,autres_examens:e.target.value}))} rows={3} placeholder="Autres examens…"
                style={{width:"100%",background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:9,padding:"10px 14px",color:C.text,fontSize:17,resize:"none",outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
            </div>

            {/* ── Diagnostic retenu & traitement ───────────────────── */}
            <div style={{fontSize:14,fontWeight:800,color:C.teal,textTransform:"uppercase",letterSpacing:".5px",margin:"16px 0 8px"}}>Diagnostic retenu & traitement</div>
            <div style={{marginBottom:6,position:"relative"}}>
              <label style={{display:"block",fontSize:14,fontWeight:700,color:C.muted,textTransform:"uppercase",marginBottom:4}}>Rechercher (CIM-10)</label>
              <input value={searchDiag} onChange={e=>setSearchDiag(e.target.value)} placeholder="paludisme, HTA, diabète…"
                style={{width:"100%",background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:9,padding:"12px 14px",color:C.text,fontSize:17,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
              {searchDiag.length>1 && diagResults.length>0 && (
                <div style={{position:"absolute",zIndex:10,left:0,right:0,background:C.card,border:`1.5px solid ${C.border}`,borderRadius:9,marginTop:4,maxHeight:160,overflowY:"auto"}}>
                  {diagResults.map(a=>(
                    <div key={a.code} onClick={()=>{
                      setForm(f=>({...f,diagnostic_predefini:`${a.code} - ${a.libelle}`,diagnostic:f.diagnostic?f.diagnostic:a.libelle}));
                      setSearchDiag("");
                    }} style={{padding:"8px 12px",fontSize:16,color:C.text,cursor:"pointer",borderBottom:`1px solid ${C.border}`}}>
                      <span style={{color:C.teal,fontFamily:"monospace",marginRight:6}}>{a.code}</span>{a.libelle}
                    </div>
                  ))}
                </div>
              )}
              {form.diagnostic_predefini && (
                <div style={{marginTop:6}}>
                  <span style={{display:"inline-flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:20,background:"rgba(13,148,136,.15)",color:C.teal,fontSize:14,fontWeight:700}}>
                    {form.diagnostic_predefini}
                    <span onClick={()=>setForm(f=>({...f,diagnostic_predefini:""}))} style={{cursor:"pointer"}}>✕</span>
                  </span>
                </div>
              )}
            </div>
            <div style={{marginBottom:16}}>
              <label style={{display:"block",fontSize:14,fontWeight:700,color:C.muted,textTransform:"uppercase",marginBottom:4}}>Diagnostic retenu *</label>
              <textarea value={form.diagnostic} onChange={e=>setForm(f=>({...f,diagnostic:e.target.value}))} rows={3} placeholder="Hypertension artérielle…"
                style={{width:"100%",background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:9,padding:"10px 14px",color:C.text,fontSize:18,resize:"none",outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
            </div>

            <div style={{marginBottom:6,position:"relative"}}>
              <label style={{display:"block",fontSize:14,fontWeight:700,color:C.muted,textTransform:"uppercase",marginBottom:4}}>Rechercher un traitement</label>
              <input value={searchTrait} onChange={e=>setSearchTrait(e.target.value)} placeholder="Amlodipine, paracétamol…"
                style={{width:"100%",background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:9,padding:"12px 14px",color:C.text,fontSize:17,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
              {searchTrait.length>1 && (medicaments||[]).length>0 && (
                <div style={{position:"absolute",zIndex:10,left:0,right:0,background:C.card,border:`1.5px solid ${C.border}`,borderRadius:9,marginTop:4,maxHeight:160,overflowY:"auto"}}>
                  {(medicaments||[]).slice(0,15).map(m=>(
                    <div key={m.id||m.nom} onClick={()=>{
                      setForm(f=>({...f,traitement_predefini:m.nom,traitement:f.traitement?`${f.traitement}, ${m.nom}`:m.nom}));
                      setSearchTrait("");
                    }} style={{padding:"8px 12px",fontSize:16,color:C.text,cursor:"pointer",borderBottom:`1px solid ${C.border}`}}>
                      {m.nom}{m.dci?<span style={{color:C.muted}}> — {m.dci}</span>:null}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{marginBottom:16}}>
              <label style={{display:"block",fontSize:14,fontWeight:700,color:C.muted,textTransform:"uppercase",marginBottom:4}}>Traitement (ordonnance)</label>
              <textarea value={form.traitement} onChange={e=>setForm(f=>({...f,traitement:e.target.value}))} rows={3} placeholder="Amlodipine 5mg, 1cp/jour…"
                style={{width:"100%",background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:9,padding:"10px 14px",color:C.text,fontSize:17,resize:"none",outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
              <div>
                <label style={{display:"block",fontSize:14,fontWeight:700,color:C.muted,textTransform:"uppercase",marginBottom:4}}>Date de contrôle</label>
                <input type="date" value={form.date_controle} onChange={e=>setForm(f=>({...f,date_controle:e.target.value}))}
                  style={{width:"100%",background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:9,padding:"9px 12px",color:C.text,fontSize:17,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
              </div>
              <div>
                <label style={{display:"block",fontSize:14,fontWeight:700,color:C.muted,textTransform:"uppercase",marginBottom:4}}>Notes</label>
                <input value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Observations…"
                  style={{width:"100%",background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:9,padding:"9px 12px",color:C.text,fontSize:17,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
              </div>
            </div>

            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setShowForm(false)} style={{flex:1,padding:"10px",borderRadius:9,background:"transparent",border:`1.5px solid ${C.border}`,color:C.muted,cursor:"pointer",fontSize:17,fontWeight:700,fontFamily:"inherit"}}>Annuler</button>
              <button disabled={addMut.isPending} onClick={()=>{
                if(!form.motif||!form.diagnostic){toast.error("Motif et diagnostic requis");return;}
                addMut.mutate({
                  patient_id:patient.id, passage_id: passageActifConsult?.id || null, ...form, tension_arterielle:form.ta,
                  biologie_predefinis: bioSel.map(a=>a.libelle).join(", ")||null,
                });
              }} style={{flex:2,padding:"10px",borderRadius:9,background:`linear-gradient(135deg,${C.green},${C.teal})`,border:"none",color:"#fff",cursor:addMut.isPending?"not-allowed":"pointer",fontSize:17,fontWeight:700,fontFamily:"inherit",opacity:addMut.isPending?.65:1}}>
                {addMut.isPending?"⏳…":"✅ Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
      {showOrd&&patient&&(
        <div onClick={()=>setShowOrd(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}>
          <div onClick={e=>e.stopPropagation()} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:28,width:640,maxWidth:"96vw",maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <h2 style={{fontSize:21,fontWeight:700,color:C.text,margin:0}}>💊 Ordonnance — {patient.prenom} {patient.nom}</h2>
              <button onClick={()=>setShowOrd(false)} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:26}}>✕</button>
            </div>
            <div style={{background:"rgba(124,58,237,.08)",border:"1px solid rgba(124,58,237,.2)",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:16,color:C.muted}}>
              Consultation enregistrée ✅ — Voulez-vous ajouter une ordonnance ?
            </div>
            <div style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <label style={{fontSize:14,fontWeight:700,color:C.muted,textTransform:"uppercase"}}>Médicaments *</label>
                <button onClick={addLigne} style={{background:"rgba(124,58,237,.15)",border:"1px solid rgba(124,58,237,.3)",borderRadius:6,padding:"5px 12px",color:"#7C3AED",cursor:"pointer",fontSize:16,fontWeight:700,fontFamily:"inherit"}}>+ Ajouter une ligne</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1.8fr 0.8fr 0.7fr 0.9fr 1.6fr 0.9fr auto",gap:6,marginBottom:6,padding:"0 2px"}}>
                {["Nom du médicament","Dosage","Qté","Unité","Posologie","Durée",""].map((h,i)=><div key={i} style={{fontSize:13,color:C.dim,fontWeight:700,textTransform:"uppercase"}}>{h}</div>)}
              </div>
              {lignes.map((l,i)=>(
                <div key={i} style={{display:"grid",gridTemplateColumns:"1.8fr 0.8fr 0.7fr 0.9fr 1.6fr 0.9fr auto",gap:6,marginBottom:8,alignItems:"center"}}>
                  <input value={l.nom} onChange={e=>updLigne(i,"nom",e.target.value)} placeholder={i===0?"Paracétamol":"Médicament..."}
                    style={{background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:8,padding:"9px 10px",color:C.text,fontSize:17,outline:"none",fontFamily:"inherit",boxSizing:"border-box",width:"100%"}}/>
                  <input value={l.qte} onChange={e=>updLigne(i,"qte",e.target.value)} placeholder="500mg"
                    style={{background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:8,padding:"9px 10px",color:C.text,fontSize:17,outline:"none",fontFamily:"inherit",boxSizing:"border-box",width:"100%"}}/>
                  <input value={l.quantite_boites} onChange={e=>updLigne(i,"quantite_boites",e.target.value)} placeholder="1"
                    style={{background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:8,padding:"9px 10px",color:C.text,fontSize:17,outline:"none",fontFamily:"inherit",boxSizing:"border-box",width:"100%"}}/>
                  <select value={l.unite} onChange={e=>updLigne(i,"unite",e.target.value)}
                    style={{background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:8,padding:"9px 6px",color:C.text,fontSize:16,outline:"none",fontFamily:"inherit",boxSizing:"border-box",width:"100%"}}>
                    <option value="">—</option>
                    {UNITES_MEDICAMENT.map(u=><option key={u} value={u}>{u}</option>)}
                  </select>
                  <input value={l.posologie} onChange={e=>updLigne(i,"posologie",e.target.value)} placeholder="1 cp matin/soir"
                    style={{background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:8,padding:"9px 10px",color:C.text,fontSize:17,outline:"none",fontFamily:"inherit",boxSizing:"border-box",width:"100%"}}/>
                  <input value={l.duree} onChange={e=>updLigne(i,"duree",e.target.value)} placeholder="7 jours"
                    style={{background:C.hover,border:`1.5px solid ${C.border}`,borderRadius:8,padding:"9px 10px",color:C.text,fontSize:17,outline:"none",fontFamily:"inherit",boxSizing:"border-box",width:"100%"}}/>
                  <button onClick={()=>delLigne(i)} style={{background:lignes.length>1?"rgba(225,29,72,.1)":"transparent",border:lignes.length>1?"1px solid rgba(225,29,72,.2)":"none",borderRadius:6,padding:"7px 9px",color:lignes.length>1?"#E11D48":C.dim,cursor:lignes.length>1?"pointer":"default",fontSize:18,fontFamily:"inherit"}}>
                    {lignes.length>1?"✕":"—"}
                  </button>
                </div>
              ))}
              <button onClick={addLigne} style={{width:"100%",marginTop:4,padding:"8px",borderRadius:8,background:"transparent",border:`1.5px dashed ${C.border}`,color:C.muted,cursor:"pointer",fontSize:16,fontWeight:700,fontFamily:"inherit"}}>+ Nouvelle ligne</button>
            </div>
            <div style={{display:"flex",gap:10,marginTop:8}}>
              <button onClick={()=>setShowOrd(false)} style={{flex:1,padding:"10px",borderRadius:9,background:"transparent",border:`1.5px solid ${C.border}`,color:C.muted,cursor:"pointer",fontSize:17,fontWeight:700,fontFamily:"inherit"}}>Passer</button>
              <button disabled={addOrd.isPending} onClick={()=>{
                const valides = lignes.filter(l=>l.nom.trim());
                if(!valides.length){toast.error("Au moins un médicament requis");return;}
                const medicament = valides.map(l=>`${l.nom}${l.qte?' '+l.qte:''}${l.quantite_boites?' — '+l.quantite_boites+(l.unite?' '+l.unite:''):''}${l.posologie?' — '+l.posologie:''}${l.duree?' ('+l.duree+')':''}`).join('\n');
                const posologie = valides.map(l=>l.posologie).filter(Boolean).join(' | ');
                const duree = valides.map(l=>l.duree).filter(Boolean).join(' | ');
                addOrd.mutate({patient_id:patient.id,consultation_id:lastConsult?.id,medicaments:medicament,posologie,duree});
              }} style={{flex:2,padding:"10px",borderRadius:9,background:"linear-gradient(135deg,#7C3AED,#0D9488)",border:"none",color:"#fff",cursor:addOrd.isPending?"not-allowed":"pointer",fontSize:17,fontWeight:700,fontFamily:"inherit",opacity:addOrd.isPending?.65:1}}>
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
  const qc = useQueryClient();
  const [caisseId, setCaisseId] = useState(null);
  const [showNouvelleCaisse, setShowNouvelleCaisse] = useState(false);
  const [nomNouvelleCaisse, setNomNouvelleCaisse] = useState("");
  const [montantEncaisse, setMontantEncaisse] = useState("");
  const [modePaiement, setModePaiement] = useState("Espèces");
  const [referenceEncaisse, setReferenceEncaisse] = useState("");
  const [montantDecaisse, setMontantDecaisse] = useState("");
  const [motifDecaisse, setMotifDecaisse] = useState("");
  const [showHistorique, setShowHistorique] = useState(false);
  const [showPayerFacture, setShowPayerFacture] = useState(null);
  const [reductionType, setReductionType] = useState("pourcentage");
  const [reductionValue, setReductionValue] = useState("");
  const [modePaiementFacture, setModePaiementFacture] = useState("Espèces");
  const [showPayerCharge, setShowPayerCharge] = useState(null);
  const [modePaiementCharge, setModePaiementCharge] = useState("Espèces");
  const [showAddCharge, setShowAddCharge] = useState(false);
  const [chargeForm, setChargeForm] = useState({ categorie_charge_id:"", libelle:"", montant:"", date_echeance:"" });

  const { data: caissesData, isLoading: chargementCaisses } = useQuery({
    queryKey: ["cl-caisses"], queryFn: () => cAPI.caisses().then(r => r.data || []),
  });
  const caisses = caissesData || [];

  // Selectionne automatiquement la premiere caisse disponible, une fois
  // chargee, si aucune n'est encore choisie.
  React.useEffect(() => {
    if (!caisseId && caisses.length > 0) setCaisseId(caisses[0].id);
  }, [caisses, caisseId]);

  const caisseActive = caisses.find(c => c.id === caisseId) || null;
  const sessionOuverte = caisseActive?.statut_session === "ouverte";

  const { data: historiqueData } = useQuery({
    queryKey: ["cl-caisse-historique", caisseId],
    queryFn: () => cAPI.historiqueCaisse(caisseId).then(r => r.data || []),
    enabled: !!caisseId && showHistorique,
  });
  const historique = historiqueData || [];

  const imprimerHistorique = async () => {
    const w = window.open('', '_blank');
    w.document.write('<p style="font-family:Arial,sans-serif;padding:30px;">Chargement…</p>');
    let cl = null;
    try { const r = await api.get('/clinique/profil'); cl = r.data || null; } catch(e) { /* impression sans en-tete si echec */ }
    const lignes = historique.map(m => `
      <tr>
        <td>${new Date(m.created_at).toLocaleTimeString('fr-CI',{hour:'2-digit',minute:'2-digit'})}</td>
        <td>${m.type === 'encaissement' ? '📥 Encaissement' : '📤 Décaissement'}</td>
        <td>${m.reference || '—'}</td>
        <td>${m.mode_paiement || '—'}</td>
        <td style="text-align:right;color:${m.type==='encaissement'?'#0A8F58':'#D97706'}">${m.type==='encaissement'?'+':'-'}${fmt(m.montant)} F</td>
      </tr>`).join('');
    w.document.open();
    w.document.write(`
      <html><head><title>Historique caisse</title>
      <style>
        body{font-family:sans-serif;padding:32px;color:#16211C}
        .header{display:flex;align-items:center;gap:14px;border-bottom:2px solid ${cl?.couleur_primaire||'#0A8F58'};padding-bottom:12px;margin-bottom:18px;}
        .logo{height:58px;object-fit:contain;}
        .cn{font-size:18px;font-weight:700;color:${cl?.couleur_primaire||'#065F3C'};}
        .ci{font-size:11px;color:#5A7A94;}
        h1{font-size:20px;margin-bottom:4px} p{color:#5B6B78;margin-top:0}
        table{width:100%;border-collapse:collapse;margin-top:20px}
        th{text-align:left;padding:8px;border-bottom:2px solid #16211C;font-size:12px;text-transform:uppercase}
        td{padding:8px;border-bottom:1px solid #E1E7EC;font-size:13px}
        .footer{margin-top:30px;border-top:1px solid #e5e7eb;padding-top:14px;font-size:10px;color:#8BA0B5;display:flex;justify-content:space-between;}
        @media print{button{display:none;}}
      </style></head><body>
      <div class="header">
        ${cl?.logo?`<img src="${cl.logo}" class="logo"/>`:''}
        <div>
          <div class="cn">${cl?.nom||'MediConnect Africa'}</div>
          <div class="ci">${cl?.adresse_complete||cl?.adresse||''} ${cl?.ville?'· '+cl.ville:''}</div>
          <div class="ci">${cl?.telephone||''} ${cl?.email?'· '+cl.email:''}</div>
        </div>
      </div>
      <h1>💰 ${caisseActive?.nom || 'Caisse'} — Historique</h1>
      <p>${new Date().toLocaleDateString('fr-CI',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p>
      <table><thead><tr><th>Heure</th><th>Type</th><th>Réf. / Motif</th><th>Mode</th><th>Montant</th></tr></thead>
      <tbody>${lignes || '<tr><td colspan="5" style="text-align:center;padding:24px">Aucun mouvement</td></tr>'}</tbody></table>
      <div class="footer">
        <div>${cl?.nom||'MediConnect Africa'}${cl?.site_web?' · '+cl.site_web:''}</div>
        <div style="text-align:right;">Cachet & signature<br/><br/><br/>_________________</div>
      </div>
      </body></html>`);
    w.document.close(); w.print();
  };

  // Recu individuel d'un mouvement (encaissement ou decaissement),
  // format ticket etroit (80mm, compatible imprimante thermique) mais
  // qui s'imprime tout aussi bien centre sur une feuille A4 standard
  // pour les cliniques sans imprimante dediee. QR code genere dans la
  // fenetre d'impression elle-meme (script charge par balise <script>,
  // execute dans l'ordre juste apres son chargement).
  const imprimerRecuMouvement = async (m) => {
    const w = window.open('', '_blank');
    w.document.write('<p style="font-family:Arial,sans-serif;padding:30px;">Chargement…</p>');
    let cl = null;
    try { const r = await api.get('/clinique/profil'); cl = r.data || null; } catch(e) { /* recu sans en-tete si echec */ }

    const estEncaissement = m.type === 'encaissement';
    const dateStr = new Date(m.created_at).toLocaleString('fr-CI',{dateStyle:'medium',timeStyle:'short'});
    const objet = m.objet || m.reference || (estEncaissement?'Encaissement':'Décaissement');
    const nomPatient = `${m.patient_prenom||''} ${m.patient_nom||''}`.trim();
    const refTicket = (m.id||'').toString().slice(0,8).toUpperCase();
    const qrTexte = `MediConnect ${estEncaissement?'Reçu':'Pièce de caisse'} ${refTicket} | Montant: ${fmt(m.montant)} FCFA | Date: ${dateStr} | Objet: ${objet}`;
    const qrTexteJs = JSON.stringify(qrTexte);

    w.document.open();
    w.document.write(`
      <html><head><title>${estEncaissement?'Reçu de paiement':'Pièce de caisse'}</title>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>
      <style>
        @page { size: 80mm auto; margin: 0; }
        body{font-family:'Courier New',monospace;color:#16211C;width:80mm;margin:0 auto;padding:10px 8px;font-size:12px;}
        .center{text-align:center;}
        .cn{font-size:14px;font-weight:700;}
        .ci{font-size:10px;color:#444;}
        .sep{border-top:1px dashed #16211C;margin:8px 0;}
        .champ{display:flex;justify-content:space-between;padding:3px 0;font-size:12px;}
        .label{color:#555;}
        .valeur{font-weight:700;text-align:right;}
        .titre{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:8px 0 4px;}
        .total{font-size:18px;font-weight:900;text-align:center;margin:10px 0;color:${estEncaissement?'#0A8F58':'#B45309'};}
        #qr{display:flex;justify-content:center;margin:12px 0;}
        .footer{font-size:9px;color:#666;margin-top:10px;}
        @media print{ @page { size: 80mm auto; margin: 0; } body{width:80mm;} }
      </style></head><body>
      <div class="center">
        ${cl?.logo?`<img src="${cl.logo}" style="height:40px;object-fit:contain;margin-bottom:4px;"/>`:''}
        <div class="cn">${cl?.nom||'MediConnect Africa'}</div>
        <div class="ci">${cl?.adresse_complete||cl?.adresse||''}</div>
        <div class="ci">${cl?.telephone?'Tél : '+cl.telephone:''}</div>
      </div>
      <div class="sep"></div>
      <div class="center titre">${estEncaissement?'Reçu de paiement':'Pièce de caisse'}</div>
      <div class="center ci">N° ${refTicket}</div>
      <div class="sep"></div>
      <div class="champ"><span class="label">Date</span><span class="valeur">${dateStr}</span></div>
      ${nomPatient ? `<div class="champ"><span class="label">Patient</span><span class="valeur">${nomPatient}</span></div>` : ''}
      ${m.facture_reference ? `<div class="champ"><span class="label">Facture</span><span class="valeur">${m.facture_reference}</span></div>` : ''}
      <div class="champ"><span class="label">Objet</span><span class="valeur">${objet}</span></div>
      ${m.mode_paiement ? `<div class="champ"><span class="label">Mode</span><span class="valeur">${m.mode_paiement}</span></div>` : ''}
      ${m.utilisateur_nom ? `<div class="champ"><span class="label">Caissier</span><span class="valeur">${m.utilisateur_nom}</span></div>` : ''}
      <div class="sep"></div>
      <div class="total">${estEncaissement?'+':'-'}${fmt(m.montant)} FCFA</div>
      <div class="sep"></div>
      <div id="qr"></div>
      <div class="footer center">${cl?.nom||'MediConnect Africa'} — Généré via MediConnect</div>
      <script>
        try {
          new QRCode(document.getElementById('qr'), { text: ${qrTexteJs}, width: 110, height: 110, correctLevel: QRCode.CorrectLevel.M });
        } catch(e) { /* impression sans QR si la librairie n'a pas charge */ }
        window.onload = () => window.print();
      <\/script>
      </body></html>`);
    w.document.close();
  };

  const addCaisseMut = useMutation({
    mutationFn: d => cAPI.addCaisse(d),
    onSuccess: (r) => {
      toast.success("Caisse créée !");
      qc.invalidateQueries(["cl-caisses"]);
      setShowNouvelleCaisse(false); setNomNouvelleCaisse("");
      if (r?.data?.id) setCaisseId(r.data.id);
    },
    onError: e => toast.error(e?.response?.data?.message || "Erreur lors de la création"),
  });

  const ouvrirMut = useMutation({
    mutationFn: () => cAPI.ouvrirCaisse(caisseId),
    onSuccess: () => { toast.success("Caisse ouverte !"); qc.invalidateQueries(["cl-caisses"]); },
    onError: e => toast.error(e?.response?.data?.message || "Erreur à l'ouverture"),
  });

  // Selecteur factures impayees, au lieu d'une saisie libre --
  // selectionner une facture reelle la marque payee automatiquement
  // cote backend. Pour les charges, reutilise chargesAPayer deja
  // charge plus bas dans ce meme composant (meme route existante).
  const { data: facturesImpayeesData } = useQuery({
    queryKey: ["cl-factures-impayees"],
    queryFn: () => cAPI.facturesImpayees().then(r => r.data||[]),
  });
  const facturesImpayees = facturesImpayeesData||[];
  const [objetEncaisse, setObjetEncaisse] = useState("");
  const [factureChoisieId, setFactureChoisieId] = useState("");
  const [objetDecaisse, setObjetDecaisse] = useState("");
  const [chargeChoisieId, setChargeChoisieId] = useState("");

  const encaisserMut = useMutation({
    mutationFn: () => cAPI.encaisser(caisseId, { montant: Number(montantEncaisse), mode: modePaiement, reference: referenceEncaisse || null, objet: objetEncaisse || null, facture_id: factureChoisieId || null }),
    onSuccess: () => {
      toast.success("Encaissement enregistré !");
      qc.invalidateQueries(["cl-caisses"]);
      qc.invalidateQueries(["cl-caisse-historique", caisseId]);
      qc.invalidateQueries(["cl-factures-impayees"]);
      setMontantEncaisse(""); setReferenceEncaisse(""); setObjetEncaisse(""); setFactureChoisieId("");
    },
    onError: e => toast.error(e?.response?.data?.message || "Erreur lors de l'encaissement"),
  });

  const decaisserMut = useMutation({
    mutationFn: () => cAPI.decaisser(caisseId, { montant: Number(montantDecaisse), motif: motifDecaisse || null, objet: objetDecaisse || null, charge_id: chargeChoisieId || null }),
    onSuccess: () => {
      toast.success("Décaissement enregistré !");
      qc.invalidateQueries(["cl-caisses"]);
      qc.invalidateQueries(["cl-caisse-historique", caisseId]);
      qc.invalidateQueries(["cl-charges-a-payer"]);
      setMontantDecaisse(""); setMotifDecaisse(""); setObjetDecaisse(""); setChargeChoisieId("");
    },
    onError: e => toast.error(e?.response?.data?.message || "Erreur lors du décaissement"),
  });

  const cloturerMut = useMutation({
    mutationFn: () => cAPI.cloturerCaisse(caisseId),
    onSuccess: () => { toast.success("Caisse clôturée !"); qc.invalidateQueries(["cl-caisses"]); },
    onError: e => toast.error(e?.response?.data?.message || "Erreur à la clôture"),
  });

  const { data: facturesEnAttenteData } = useQuery({
    queryKey: ["cl-factures-en-attente"],
    queryFn: () => cAPI.facturesParStatut("en_attente").then(r => r.data || []),
  });
  const facturesEnAttente = facturesEnAttenteData || [];

  const { data: chargesAPayerData } = useQuery({
    queryKey: ["cl-charges-a-payer"],
    queryFn: () => cAPI.chargesAPayer().then(r => r.data || []),
  });
  const chargesAPayer = chargesAPayerData || [];

  const { data: categoriesChargesData } = useQuery({
    queryKey: ["cl-categories-charges-caisse"],
    queryFn: () => api.get("/categories-charges").then(r => r.data || []),
  });
  const categoriesCharges = categoriesChargesData || [];

  const payerFactureMut = useMutation({
    mutationFn: () => cAPI.payerFacture({
      facture_id: showPayerFacture.id, caisse_id: caisseId, mode_paiement: modePaiementFacture,
      reduction_pourcentage: reductionType==="pourcentage" && reductionValue ? Number(reductionValue) : undefined,
      reduction_montant_fixe: reductionType==="montant" && reductionValue ? Number(reductionValue) : undefined,
    }),
    onSuccess: (r) => {
      const reduc = r?.reduction_appliquee;
      toast.success(reduc>0 ? `Facture encaissée ! Réduction : ${fmt(reduc)} F` : "Facture encaissée !");
      qc.invalidateQueries(["cl-factures-en-attente"]);
      qc.invalidateQueries(["cl-caisses"]);
      qc.invalidateQueries(["cl-caisse-historique", caisseId]);
      setShowPayerFacture(null); setReductionValue(""); setReductionType("pourcentage");
    },
    onError: e => toast.error(e?.response?.data?.message || "Erreur lors de l'encaissement"),
  });

  const payerChargeMut = useMutation({
    mutationFn: () => cAPI.payerCharge({ charge_id: showPayerCharge.id, caisse_id: caisseId, mode_paiement: modePaiementCharge }),
    onSuccess: () => {
      toast.success("Charge payée !");
      qc.invalidateQueries(["cl-charges-a-payer"]);
      qc.invalidateQueries(["cl-caisses"]);
      qc.invalidateQueries(["cl-caisse-historique", caisseId]);
      setShowPayerCharge(null);
    },
    onError: e => toast.error(e?.response?.data?.message || "Erreur lors du paiement"),
  });

  const addChargeMut = useMutation({
    mutationFn: () => cAPI.addChargeAPayer(chargeForm),
    onSuccess: () => {
      toast.success("Charge à payer ajoutée !");
      qc.invalidateQueries(["cl-charges-a-payer"]);
      setShowAddCharge(false); setChargeForm({ categorie_charge_id:"", libelle:"", montant:"", date_echeance:"" });
    },
    onError: e => toast.error(e?.response?.data?.message || "Erreur"),
  });

  return (
    <div>
      <PageHeader title="💰 Caisse" subtitle="Sessions d'encaissement et décaissements, par caisse"
        actions={<Btn onClick={()=>setShowNouvelleCaisse(true)}>+ Nouvelle caisse</Btn>} />

      {chargementCaisses ? <Loader/> : caisses.length === 0 ? (
        <Empty icon="💰" title="Aucune caisse" subtitle="Créez votre première caisse (Caisse générale, Caisse pharmacie…) pour commencer."/>
      ) : (
        <>
          {/* Selecteur de caisse, si plusieurs existent */}
          {caisses.length > 1 && (
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:18}}>
              {caisses.map(c => (
                <button key={c.id} onClick={()=>setCaisseId(c.id)}
                  style={{
                    padding:"9px 16px",borderRadius:24,fontSize:17,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
                    border:`1.5px solid ${caisseId===c.id?C.green:C.border}`,
                    background:caisseId===c.id?"rgba(10,143,88,.15)":"transparent",
                    color:caisseId===c.id?C.green:C.muted,
                  }}>
                  {c.nom} {c.statut_session==="ouverte" ? "🟢" : "⚪"}
                </button>
              ))}
            </div>
          )}

          {!sessionOuverte ? (
            <Panel style={{maxWidth:400,margin:"0 auto",textAlign:"center",padding:48}}>
              <div style={{fontSize:62,marginBottom:16}}>🔒</div>
              <div style={{fontSize:21,fontWeight:700,color:C.text,marginBottom:8}}>{caisseActive?.nom} fermée</div>
              <div style={{fontSize:17,color:C.muted,marginBottom:24}}>Ouvrez la caisse pour commencer les encaissements du jour</div>
              <Btn style={{width:"100%"}} loading={ouvrirMut.isPending} onClick={()=>ouvrirMut.mutate()}>Ouvrir la caisse</Btn>
            </Panel>
          ) : (
            <>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:20}}>
                <div style={{background:"linear-gradient(135deg,rgba(10,143,88,.14),rgba(10,143,88,.04))",border:`1px solid ${C.green}40`,borderRadius:16,padding:20,boxShadow:"0 4px 16px rgba(10,143,88,.08)"}}>
                  <div style={{fontSize:26,marginBottom:6}}>✅</div>
                  <div style={{fontSize:24,fontWeight:800,color:C.green}}>{fmt(caisseActive.total_encaisse||0)} F</div>
                  <div style={{fontSize:13,color:C.muted,marginTop:2}}>Encaissements du jour</div>
                </div>
                <div style={{background:"linear-gradient(135deg,rgba(217,119,6,.14),rgba(217,119,6,.04))",border:`1px solid ${C.amber}40`,borderRadius:16,padding:20,boxShadow:"0 4px 16px rgba(217,119,6,.08)"}}>
                  <div style={{fontSize:26,marginBottom:6}}>📤</div>
                  <div style={{fontSize:24,fontWeight:800,color:C.amber}}>{fmt(caisseActive.total_decaisse||0)} F</div>
                  <div style={{fontSize:13,color:C.muted,marginTop:2}}>Décaissements du jour</div>
                </div>
                <div style={{background:"linear-gradient(135deg,rgba(13,148,136,.18),rgba(13,148,136,.05))",border:`1.5px solid ${C.teal}`,borderRadius:16,padding:20,boxShadow:"0 6px 20px rgba(13,148,136,.15)"}}>
                  <div style={{fontSize:26,marginBottom:6}}>💰</div>
                  <div style={{fontSize:26,fontWeight:800,color:C.teal}}>{fmt((Number(caisseActive.total_encaisse)||0)-(Number(caisseActive.total_decaisse)||0))} F</div>
                  <div style={{fontSize:13,color:C.muted,marginTop:2}}>Solde en caisse</div>
                </div>
              </div>

              <div style={{marginBottom:20}}>
                <Btn variant="outline" onClick={()=>setShowHistorique(v=>!v)}>
                  {showHistorique ? "▲ Masquer l'historique" : "▼ Voir l'historique du jour"}
                </Btn>
                {showHistorique && (
                  <Panel style={{marginTop:12}} title="🧾 Mouvements du jour"
                    actions={<Btn variant="outline" small onClick={imprimerHistorique}>🖨️ Imprimer</Btn>}>
                    {historique.length === 0
                      ? <p style={{color:C.dim,textAlign:"center",padding:20}}>Aucun mouvement enregistré aujourd'hui</p>
                      : (
                        <div style={{maxHeight:320,overflowY:"auto"}}>
                          {historique.map(m => (
                            <div key={m.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
                              <div>
                                <div style={{fontSize:13,fontWeight:600,color:C.text}}>
                                  {m.type==="encaissement" ? "📥" : "📤"} {m.reference || (m.type==="encaissement"?"Encaissement":"Décaissement")}
                                </div>
                                <div style={{fontSize:11,color:C.dim}}>
                                  {new Date(m.created_at).toLocaleTimeString('fr-CI',{hour:'2-digit',minute:'2-digit'})}
                                  {m.mode_paiement && ` · ${m.mode_paiement}`}
                                  {m.utilisateur_nom && ` · ${m.utilisateur_nom}`}
                                </div>
                              </div>
                              <div style={{display:"flex",alignItems:"center",gap:10}}>
                                <div style={{fontSize:15,fontWeight:800,color:m.type==="encaissement"?C.green:C.amber}}>
                                  {m.type==="encaissement"?"+":"-"}{fmt(m.montant)} F
                                </div>
                                <button onClick={()=>imprimerRecuMouvement(m)} title="Imprimer le reçu"
                                  style={{background:"none",border:`1px solid ${C.border}`,borderRadius:6,padding:"4px 7px",cursor:"pointer",fontSize:13}}>🖨️</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                  </Panel>
                )}
              </div>
              <div style={{marginBottom:20}}>
                <Panel title="📋 Demandes de paiement"
                  actions={<Btn variant="outline" small onClick={()=>setShowAddCharge(true)}>+ Charge à payer</Btn>}>
                  <div style={{fontSize:14,fontWeight:700,color:C.dim,textTransform:"uppercase",marginBottom:8}}>Factures en attente ({facturesEnAttente.length})</div>
                  {facturesEnAttente.length===0
                    ? <p style={{color:C.dim,fontSize:14,marginBottom:16}}>Aucune facture en attente</p>
                    : facturesEnAttente.map(f=>(
                      <div key={f.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
                        <div>
                          <div style={{fontSize:14,fontWeight:700,color:C.teal,fontFamily:"monospace"}}>{f.reference||"—"}</div>
                          <div style={{fontSize:13,color:C.muted}}>{f.patient_nom||"—"}</div>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:10}}>
                          <span style={{fontSize:16,fontWeight:800,color:C.green}}>{fmt(f.montant_total)} F</span>
                          <Btn style={{padding:"6px 12px",fontSize:14}} onClick={()=>{ setShowPayerFacture(f); setReductionValue(""); setReductionType("pourcentage"); }}>💰 Encaisser</Btn>
                        </div>
                      </div>
                    ))
                  }
                  <div style={{fontSize:14,fontWeight:700,color:C.dim,textTransform:"uppercase",marginTop:18,marginBottom:8}}>Charges à payer ({chargesAPayer.length})</div>
                  {chargesAPayer.length===0
                    ? <p style={{color:C.dim,fontSize:14}}>Aucune charge en attente</p>
                    : chargesAPayer.map(c=>(
                      <div key={c.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
                        <div>
                          <div style={{fontSize:14,fontWeight:700,color:C.text}}>{c.libelle}</div>
                          <div style={{fontSize:13,color:C.muted}}>{c.categorie_nom||"—"}</div>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:10}}>
                          <span style={{fontSize:16,fontWeight:800,color:C.amber}}>{fmt(c.montant)} F</span>
                          <Btn variant="outline" style={{padding:"6px 12px",fontSize:14}} onClick={()=>setShowPayerCharge(c)}>💳 Payer</Btn>
                        </div>
                      </div>
                    ))
                  }
                </Panel>
              </div>

              <Grid cols={2} gap={20}>
                <Panel title="📥 Encaissement">
                  <Sel label="Facture à payer (optionnel)" value={factureChoisieId} onChange={e=>{
                      const id = e.target.value; setFactureChoisieId(id);
                      const f = facturesImpayees.find(x=>x.id===id);
                      if (f) { setMontantEncaisse(String(f.montant_total)); setReferenceEncaisse(f.reference || ''); }
                    }}
                    options={[{v:"",l:"— Saisie libre —"}, ...facturesImpayees.map(f=>({v:f.id, l:`${f.reference} — ${f.prenom||''} ${f.nom||''} — ${fmt(f.montant_total)} F`}))]}
                    style={{marginBottom:10}} />
                  <Inp label="Montant (FCFA)" type="number" placeholder="5000" value={montantEncaisse} onChange={e=>setMontantEncaisse(e.target.value)} style={{marginBottom:10}} />
                  <Sel label="Mode de paiement" value={modePaiement} onChange={e=>setModePaiement(e.target.value)} options={["Espèces","Mobile Money","Carte bancaire","Chèque"]} style={{marginBottom:10}} />
                  <Inp label="Référence / Patient" placeholder="Nom du patient ou référence" value={referenceEncaisse} onChange={e=>setReferenceEncaisse(e.target.value)} style={{marginBottom:10}} />
                  <Inp label="Objet" placeholder="Consultation, ordonnance, acte…" value={objetEncaisse} onChange={e=>setObjetEncaisse(e.target.value)} style={{marginBottom:14}} />
                  <Btn style={{width:"100%"}} loading={encaisserMut.isPending} onClick={()=>{
                    if(!montantEncaisse||Number(montantEncaisse)<=0){toast.error("Montant invalide");return;}
                    encaisserMut.mutate();
                  }}>Encaisser</Btn>
                </Panel>
                <Panel title="📤 Décaissement">
                  <Sel label="Charge à payer (optionnel)" value={chargeChoisieId} onChange={e=>{
                      const id = e.target.value; setChargeChoisieId(id);
                      const c = chargesAPayer.find(x=>x.id===id);
                      if (c) { setMontantDecaisse(String(c.montant)); setMotifDecaisse(c.libelle); }
                    }}
                    options={[{v:"",l:"— Saisie libre —"}, ...chargesAPayer.map(c=>({v:c.id, l:`${c.libelle} — ${fmt(c.montant)} F`}))]}
                    style={{marginBottom:10}} />
                  <Inp label="Montant (FCFA)" type="number" placeholder="2000" value={montantDecaisse} onChange={e=>setMontantDecaisse(e.target.value)} style={{marginBottom:10}} />
                  <Inp label="Motif" placeholder="Achat fournitures, remboursement…" value={motifDecaisse} onChange={e=>setMotifDecaisse(e.target.value)} style={{marginBottom:10}} />
                  <Inp label="Objet" placeholder="Fournitures bureau, entretien…" value={objetDecaisse} onChange={e=>setObjetDecaisse(e.target.value)} style={{marginBottom:14}} />
                  <Btn variant="amber" style={{width:"100%"}} loading={decaisserMut.isPending} onClick={()=>{
                    if(!montantDecaisse||Number(montantDecaisse)<=0){toast.error("Montant invalide");return;}
                    decaisserMut.mutate();
                  }}>Décaisser</Btn>
                  <Btn variant="danger" style={{width:"100%",marginTop:10}} loading={cloturerMut.isPending} onClick={()=>cloturerMut.mutate()}>Clôturer la caisse</Btn>
                </Panel>
              </Grid>
            </>
          )}
        </>
      )}

      <Modal open={showNouvelleCaisse} onClose={()=>setShowNouvelleCaisse(false)} title="💰 Nouvelle caisse">
        <Inp label="Nom de la caisse *" required value={nomNouvelleCaisse} onChange={e=>setNomNouvelleCaisse(e.target.value)} placeholder="Caisse générale, Caisse pharmacie…" />
        <div style={{display:"flex",gap:10,marginTop:14}}>
          <Btn variant="outline" style={{flex:1}} onClick={()=>setShowNouvelleCaisse(false)}>Annuler</Btn>
          <Btn style={{flex:2}} loading={addCaisseMut.isPending} onClick={()=>{
            if(!nomNouvelleCaisse.trim()){toast.error("Nom requis");return;}
            addCaisseMut.mutate({ nom: nomNouvelleCaisse.trim() });
          }}>Créer la caisse</Btn>
        </div>
      </Modal>

      {/* Modal: Encaisser une facture avec réduction */}
      <Modal open={!!showPayerFacture} onClose={()=>setShowPayerFacture(null)} title={`💰 Encaisser — ${showPayerFacture?.reference||""}`} width={480}>
        <div style={{background:C.hover,borderRadius:8,padding:"10px 12px",marginBottom:14}}>
          <div style={{fontSize:14,color:C.muted}}>Patient : <strong style={{color:C.text}}>{showPayerFacture?.patient_nom||"—"}</strong></div>
          <div style={{fontSize:20,fontWeight:800,color:C.green,marginTop:4}}>{fmt(showPayerFacture?.montant_total)} F</div>
        </div>
        <div style={{display:"flex",gap:4,background:C.input,borderRadius:8,padding:3,marginBottom:12}}>
          {[["pourcentage","% Pourcentage"],["montant","FCFA Montant fixe"]].map(([v,l])=>(
            <button key={v} onClick={()=>{ setReductionType(v); setReductionValue(""); }}
              style={{flex:1,padding:"7px 10px",borderRadius:6,border:"none",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit",
                background:reductionType===v?C.hover:"transparent",color:reductionType===v?C.text:C.muted}}>
              {l}
            </button>
          ))}
        </div>
        <Inp label={reductionType==="pourcentage" ? "Réduction (%)" : "Réduction (FCFA)"} type="number" min="0"
          max={reductionType==="pourcentage" ? "100" : undefined}
          value={reductionValue} onChange={e=>setReductionValue(e.target.value)} placeholder="0" />
        {reductionValue>0 && showPayerFacture && (
          <div style={{fontSize:14,color:C.dim,marginBottom:10}}>
            Net à encaisser : <strong style={{color:C.green}}>
              {fmt(Math.max(0, Number(showPayerFacture.montant_total) - (reductionType==="pourcentage"
                ? Math.round(Number(showPayerFacture.montant_total)*Number(reductionValue)/100)
                : Number(reductionValue))))} F
            </strong>
          </div>
        )}
        <Sel label="Mode de paiement" value={modePaiementFacture} onChange={e=>setModePaiementFacture(e.target.value)} options={["Espèces","Mobile Money","Carte bancaire","Chèque"]} />
        <div style={{display:"flex",gap:10,marginTop:14}}>
          <Btn variant="outline" style={{flex:1}} onClick={()=>setShowPayerFacture(null)}>Annuler</Btn>
          <Btn style={{flex:2}} loading={payerFactureMut.isPending} onClick={()=>payerFactureMut.mutate()}>Encaisser</Btn>
        </div>
      </Modal>

      {/* Modal: Payer une charge */}
      <Modal open={!!showPayerCharge} onClose={()=>setShowPayerCharge(null)} title={`💳 Payer — ${showPayerCharge?.libelle||""}`} width={420}>
        <div style={{background:C.hover,borderRadius:8,padding:"10px 12px",marginBottom:14}}>
          <div style={{fontSize:14,color:C.muted}}>{showPayerCharge?.categorie_nom||"—"}</div>
          <div style={{fontSize:20,fontWeight:800,color:C.amber,marginTop:4}}>{fmt(showPayerCharge?.montant)} F</div>
        </div>
        <Sel label="Mode de paiement" value={modePaiementCharge} onChange={e=>setModePaiementCharge(e.target.value)} options={["Espèces","Mobile Money","Carte bancaire","Chèque"]} />
        <div style={{display:"flex",gap:10,marginTop:14}}>
          <Btn variant="outline" style={{flex:1}} onClick={()=>setShowPayerCharge(null)}>Annuler</Btn>
          <Btn variant="amber" style={{flex:2}} loading={payerChargeMut.isPending} onClick={()=>payerChargeMut.mutate()}>Payer</Btn>
        </div>
      </Modal>

      {/* Modal: Nouvelle charge à payer */}
      <Modal open={showAddCharge} onClose={()=>setShowAddCharge(false)} title="💸 Nouvelle charge à payer">
        <Sel label="Type de charge" value={chargeForm.categorie_charge_id} onChange={e=>setChargeForm(f=>({...f,categorie_charge_id:e.target.value}))}
          options={[{v:"",l:"-- Choisir (facultatif) --"}, ...categoriesCharges.map(c=>({v:c.id,l:c.nom}))]} />
        <Inp label="Libellé *" required value={chargeForm.libelle} onChange={e=>setChargeForm(f=>({...f,libelle:e.target.value}))} placeholder="Ex: Loyer janvier" />
        <Grid cols={2} gap={10}>
          <Inp label="Montant (FCFA) *" required type="number" value={chargeForm.montant} onChange={e=>setChargeForm(f=>({...f,montant:e.target.value}))} placeholder="150000" />
          <Inp label="Échéance" type="date" value={chargeForm.date_echeance} onChange={e=>setChargeForm(f=>({...f,date_echeance:e.target.value}))} />
        </Grid>
        <div style={{display:"flex",gap:10,marginTop:4}}>
          <Btn variant="outline" style={{flex:1}} onClick={()=>setShowAddCharge(false)}>Annuler</Btn>
          <Btn style={{flex:2}} loading={addChargeMut.isPending} onClick={()=>{
            if(!chargeForm.libelle||!chargeForm.montant){toast.error("Libellé et montant requis");return;}
            addChargeMut.mutate();
          }}>Ajouter</Btn>
        </div>
      </Modal>
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

  const { data: medecinsData } = useQuery({
    queryKey: ['file-attente-medecins'],
    queryFn: async () => {
      const r = await fetch(`https://mediconnect-backend-v2.vercel.app/api/medecins`, { headers });
      const d = await r.json();
      return d.data || [];
    },
  });
  const medecinsListe = medecinsData || [];

  const updateStatut = async (id, action) => {
    await fetch(`https://mediconnect-backend-v2.vercel.app/api/file-attente/${id}/${action}`, { method: 'PUT', headers });
    queryClient.invalidateQueries(['file-attente']);
    queryClient.invalidateQueries(['file-attente-stats']);
  };

  const affecterMedecin = async (id, medecinId) => {
    if (!medecinId) return;
    await fetch(`https://mediconnect-backend-v2.vercel.app/api/file-attente/${id}/affecter`, {
      method: 'PUT', headers, body: JSON.stringify({ medecin_id: medecinId }),
    });
    queryClient.invalidateQueries(['file-attente']);
    toast.success('Patient affecté au médecin');
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
          <h2 style={{fontSize:26,fontWeight:700,color:C.text}}>🚶 File d'attente</h2>
          <p style={{fontSize:17,color:C.muted,marginTop:2}}>Mise à jour automatique toutes les 10 secondes</p>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>refetch()} style={{padding:'8px 16px',background:'transparent',border:`1px solid ${C.border}`,borderRadius:8,color:C.muted,fontSize:17,cursor:'pointer',fontFamily:'inherit'}}>↻ Actualiser</button>
          <button onClick={()=>setShowQR(true)} style={{padding:'8px 16px',background:C.teal,border:'none',borderRadius:8,color:'#fff',fontSize:17,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>📱 QR Code accueil</button>
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
            <div style={{fontSize:31,fontWeight:700,color:s.color}}>{s.val}</div>
            <div style={{fontSize:16,color:C.muted,marginTop:2}}>{s.label}</div>
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
            padding:'7px 16px',borderRadius:20,fontSize:17,fontWeight:tab===t.key?700:400,
            border:`1px solid ${tab===t.key?C.teal:C.border}`,
            background:tab===t.key?'rgba(13,148,136,.15)':'transparent',
            color:tab===t.key?C.teal:C.muted,cursor:'pointer',fontFamily:'inherit'
          }}>{t.label}</button>
        ))}
      </div>

      {/* Liste */}
      {isLoading ? <Loader/> : liste.length===0 ? (
        <div style={{textAlign:'center',padding:'3rem',color:C.muted}}>
          <div style={{fontSize:52,marginBottom:12}}>🚶</div>
          <div style={{fontSize:20,fontWeight:600,marginBottom:6}}>File d'attente vide</div>
          <div style={{fontSize:17}}>Les patients apparaîtront ici après avoir scanné le QR Code d'accueil</div>
        </div>
      ) : (
        <div style={{background:C.input,border:`1px solid ${C.border}`,borderRadius:14,overflow:'hidden'}}>
          {/* Header tableau */}
          <div style={{display:'grid',gridTemplateColumns:'60px 1fr 1fr 1fr 120px 200px',gap:8,padding:'10px 16px',borderBottom:`1px solid ${C.border}`,fontSize:14,fontWeight:700,color:C.dim,textTransform:'uppercase',letterSpacing:'.5px'}}>
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
              <div style={{width:36,height:36,borderRadius:8,background:'rgba(13,148,136,.15)',border:`1px solid ${C.teal}`,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:21,color:C.teal}}>{e.rang}</div>
              <div>
                <div style={{fontWeight:600,fontSize:18,color:C.text}}>{e.patient_nom}</div>
                {e.patient_telephone&&<div style={{fontSize:14,color:C.dim,marginTop:2}}>{e.patient_telephone}</div>}
              </div>
              <div>
                <select
                  value={e.medecin_id||''}
                  onChange={ev=>affecterMedecin(e.id, ev.target.value)}
                  disabled={e.statut==='termine'||e.statut==='annule'}
                  style={{
                    width:'100%', fontSize:16, padding:'6px 8px', borderRadius:7,
                    background:e.medecin_id?'rgba(13,148,136,.08)':'rgba(245,158,11,.08)',
                    border:`1px solid ${e.medecin_id?'rgba(13,148,136,.3)':'rgba(245,158,11,.3)'}`,
                    color:e.medecin_id?C.text:'#F59E0B', fontFamily:'inherit',
                    cursor:(e.statut==='termine'||e.statut==='annule')?'not-allowed':'pointer',
                  }}>
                  <option value="">Non assigné</option>
                  {medecinsListe.map(m=>(
                    <option key={m.id} value={m.id}>Dr. {m.prenom} {m.nom}{m.specialite?` — ${m.specialite}`:''}</option>
                  ))}
                </select>
              </div>
              <div style={{fontSize:16,color:C.dim}}>
                {e.heure_scan ? new Date(e.heure_scan).toLocaleTimeString('fr-CI',{hour:'2-digit',minute:'2-digit'}) : '—'}
              </div>
              <div>
                <span style={{fontSize:14,fontWeight:700,padding:'3px 8px',borderRadius:20,
                  background:STATUT_COLOR[e.statut]?.bg,color:STATUT_COLOR[e.statut]?.color}}>
                  {STATUT_COLOR[e.statut]?.label||e.statut}
                </span>
              </div>
              <div style={{display:'flex',gap:6}}>
                {e.statut==='en_attente'&&(
                  <button onClick={()=>updateStatut(e.id,'appeler')} style={{flex:1,padding:'6px 0',background:'rgba(59,130,246,.15)',border:'1px solid rgba(59,130,246,.3)',borderRadius:7,color:'#3B82F6',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                    📣 Appeler
                  </button>
                )}
                {e.statut==='appele'&&(
                  <button onClick={()=>updateStatut(e.id,'consultation')} style={{flex:1,padding:'6px 0',background:'rgba(10,143,88,.15)',border:`1px solid rgba(10,143,88,.3)`,borderRadius:7,color:C.green,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                    🩺 Entré
                  </button>
                )}
                {e.statut==='en_consultation'&&(
                  <button onClick={()=>updateStatut(e.id,'terminer')} style={{flex:1,padding:'6px 0',background:'rgba(107,114,128,.15)',border:'1px solid rgba(107,114,128,.3)',borderRadius:7,color:C.muted,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
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
            <p style={{fontSize:17,color:C.muted,marginBottom:20,lineHeight:1.7}}>
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
              <div style={{fontSize:14,color:C.muted,marginBottom:4}}>URL de scan :</div>
              <div style={{fontSize:16,color:C.text,fontFamily:'monospace',wordBreak:'break-all'}}>{scanUrl}</div>
            </div>
            <button onClick={()=>window.print()} style={{padding:'10px 24px',background:C.green,border:'none',borderRadius:8,color:'#fff',fontWeight:700,fontSize:18,cursor:'pointer',fontFamily:'inherit'}}>
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
          <h2 style={{fontSize:26,fontWeight:700,color:C.text}}>🩺 Mes patients en attente</h2>
          <p style={{fontSize:17,color:C.muted,marginTop:2}}>Mise à jour automatique toutes les 10 secondes</p>
        </div>
        <button onClick={fetchListe} style={{padding:'8px 16px',background:'transparent',border:`1px solid ${C.border}`,borderRadius:8,color:C.muted,fontSize:17,cursor:'pointer',fontFamily:'inherit'}}>↻ Actualiser</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:12,marginBottom:20}}>
        {[{label:'En attente',val:stats.en_attente||0,color:'#F59E0B'},{label:'En consultation',val:stats.en_consultation||0,color:C.green},{label:'Terminés',val:stats.termine||0,color:C.muted},{label:'Total jour',val:stats.total||0,color:C.text}].map(s=>(
          <div key={s.label} style={{background:C.input,border:`1px solid ${C.border}`,borderRadius:12,padding:'14px 16px'}}>
            <div style={{fontSize:31,fontWeight:700,color:s.color}}>{s.val}</div>
            <div style={{fontSize:16,color:C.muted,marginTop:2}}>{s.label}</div>
          </div>
        ))}
      </div>
      {loading ? <Loader/> : actifs.length===0 ? (
        <div style={{textAlign:'center',padding:'3rem',background:C.input,border:`1px solid ${C.border}`,borderRadius:14}}>
          <div style={{fontSize:52,marginBottom:12}}>✅</div>
          <div style={{fontSize:20,fontWeight:600,color:C.text}}>Aucun patient en attente</div>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {actifs.map(e=>(
            <div key={e.id} style={{background:C.input,border:`1.5px solid ${e.statut==='appele'?'#3B82F6':C.border}`,borderRadius:12,padding:'14px 16px',display:'flex',alignItems:'center',gap:14,flexWrap:'wrap'}}>
              <div style={{width:44,height:44,borderRadius:10,background:'rgba(13,148,136,.15)',border:`1.5px solid ${C.teal}`,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:26,color:C.teal,flexShrink:0}}>{e.rang}</div>
              <div style={{flex:1,minWidth:160}}>
                <div style={{fontWeight:700,fontSize:18,color:C.text}}>{e.patient_nom}</div>
                {e.patient_telephone&&<div style={{fontSize:16,color:C.dim,marginTop:2}}>📞 {e.patient_telephone}</div>}
                {e.motif&&<div style={{fontSize:16,color:C.muted,marginTop:2}}>💬 {e.motif}</div>}
              </div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
                <span style={{fontSize:14,fontWeight:700,padding:'3px 10px',borderRadius:20,background:STATUT[e.statut]?.bg,color:STATUT[e.statut]?.color}}>{STATUT[e.statut]?.label}</span>
                {e.statut==='en_attente'&&<button onClick={()=>updateStatut(e.id,'appeler')} style={{padding:'7px 14px',background:'rgba(59,130,246,.15)',border:'1px solid rgba(59,130,246,.3)',borderRadius:8,color:'#3B82F6',fontSize:16,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>📣 Appeler</button>}
                {e.statut==='appele'&&<button onClick={()=>updateStatut(e.id,'consultation')} style={{padding:'7px 14px',background:'rgba(10,143,88,.15)',border:`1px solid rgba(10,143,88,.3)`,borderRadius:8,color:C.green,fontSize:16,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>🩺 Entrer</button>}
                {e.statut==='en_consultation'&&<button onClick={()=>updateStatut(e.id,'terminer')} style={{padding:'7px 14px',background:'rgba(107,114,128,.15)',border:'1px solid rgba(107,114,128,.3)',borderRadius:8,color:C.muted,fontSize:16,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>✓ Terminé</button>}
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
          <h2 style={{fontSize:26,fontWeight:700,color:C.text}}>👁️ Vue Propriétaire</h2>
          <p style={{fontSize:17,color:C.muted,marginTop:2}}>{data.clinique?.nom} · Actualisation auto 30s</p>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <span style={{fontSize:14,padding:'4px 10px',borderRadius:20,background:data.caisse_statut?.statut==='ouverte'?'rgba(10,143,88,.15)':'rgba(239,68,68,.15)',color:data.caisse_statut?.statut==='ouverte'?C.green:C.red,fontWeight:700}}>
            {data.caisse_statut?.statut==='ouverte'?'🟢 Caisse ouverte':'🔴 Caisse fermée'}
          </span>
          <button onClick={fetchDashboard} style={{padding:'7px 14px',background:'transparent',border:`1px solid ${C.border}`,borderRadius:8,color:C.muted,fontSize:17,cursor:'pointer',fontFamily:'inherit'}}>↻</button>
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
              <span style={{fontSize:23}}>{k.icon}</span>
              <span style={{fontSize:14,color:C.dim,fontWeight:700,textTransform:'uppercase',letterSpacing:'.5px'}}>{k.label}</span>
            </div>
            <div style={{fontSize:29,fontWeight:800,color:k.color}}>{k.val}</div>
            <div style={{fontSize:14,color:C.muted,marginTop:3}}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
        {[{key:'jour',label:"Aujourd'hui"},{key:'mois',label:'Ce mois'},{key:'evolution',label:'7 jours'},{key:'journal',label:'Journal'},{key:'analyse',label:'Analyse'}].map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)} style={{padding:'7px 16px',borderRadius:20,fontSize:17,fontWeight:tab===t.key?700:400,border:`1px solid ${tab===t.key?C.amber:C.border}`,background:tab===t.key?'rgba(217,119,6,.12)':'transparent',color:tab===t.key?C.amber:C.muted,cursor:'pointer',fontFamily:'inherit'}}>{t.label}</button>
        ))}
      </div>

      {tab==='jour'&&<div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
          <div style={{background:'rgba(10,143,88,.06)',border:'1px solid rgba(10,143,88,.2)',borderRadius:12,padding:20}}>
            <div style={{fontSize:14,color:C.muted,marginBottom:6,fontWeight:700}}>TOTAL ENTRÉES</div>
            <div style={{fontSize:42,fontWeight:800,color:C.green}}>{fmt(data.jour?.entrees)} F</div>
          </div>
          <div style={{background:'rgba(239,68,68,.06)',border:'1px solid rgba(239,68,68,.2)',borderRadius:12,padding:20}}>
            <div style={{fontSize:14,color:C.muted,marginBottom:6,fontWeight:700}}>TOTAL SORTIES</div>
            <div style={{fontSize:42,fontWeight:800,color:C.red}}>{fmt(data.jour?.sorties)} F</div>
          </div>
        </div>
        <div style={{background:solde_jour>=0?'rgba(10,143,88,.08)':'rgba(239,68,68,.08)',border:`1px solid ${solde_jour>=0?'rgba(10,143,88,.25)':'rgba(239,68,68,.25)'}`,borderRadius:12,padding:20,textAlign:'center',marginBottom:14}}>
          <div style={{fontSize:14,color:C.muted,marginBottom:6,fontWeight:700}}>SOLDE NET DU JOUR</div>
          <div style={{fontSize:52,fontWeight:900,color:solde_jour>=0?C.green:C.red}}>{solde_jour>=0?'+':''}{fmt(solde_jour)} F</div>
        </div>
        <div style={{fontSize:17,fontWeight:700,color:C.muted,marginBottom:10}}>10 DERNIERS MOUVEMENTS</div>
        {(data.derniers_mouvements||[]).length===0 ? <Empty icon="💰" title="Aucun mouvement" subtitle="Aucune opération aujourd'hui"/> : (data.derniers_mouvements||[]).map(m=>(
          <div key={m.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:`1px solid ${C.border}`}}>
            <span style={{fontSize:23}}>{m.type==='entree'?'📈':'📉'}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:17,fontWeight:600,color:C.text}}>{m.description||m.categorie}</div>
              <div style={{fontSize:14,color:C.dim,marginTop:2}}>{new Date(m.created_at).toLocaleTimeString('fr-CI',{hour:'2-digit',minute:'2-digit'})}</div>
            </div>
            <div style={{fontWeight:700,color:m.type==='entree'?C.green:C.red,fontSize:18}}>{m.type==='entree'?'+':'-'}{fmt(m.montant)} F</div>
          </div>
        ))}
      </div>}

      {tab==='mois'&&<div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12}}>
          {[{label:'Entrées mois',val:fmt(data.mois?.entrees)+' F',color:C.green},{label:'Sorties mois',val:fmt(data.mois?.sorties)+' F',color:C.red},{label:'Solde net',val:fmt(solde_mois)+' F',color:solde_mois>=0?C.green:C.red},{label:'Jours actifs',val:data.mois?.jours_actifs||0,color:C.teal},{label:'Consultations',val:data.consultations?.mois?.nb||0,color:C.teal},{label:'Revenu consul.',val:fmt(data.consultations?.mois?.revenu||0)+' F',color:C.green}].map(k=>(
            <div key={k.label} style={{background:C.input,border:`1px solid ${C.border}`,borderRadius:12,padding:'14px 16px'}}>
              <div style={{fontSize:14,color:C.dim,marginBottom:4}}>{k.label}</div>
              <div style={{fontSize:26,fontWeight:700,color:k.color}}>{k.val}</div>
            </div>
          ))}
        </div>
      </div>}

      {tab==='evolution'&&<div>
        {(data.evolution_7j||[]).length===0 ? <Empty icon="📊" title="Pas de données" subtitle="Aucun mouvement sur 7 jours"/> : (data.evolution_7j||[]).map((j,i)=>{
          const net=(parseFloat(j.entrees)||0)-(parseFloat(j.sorties)||0);
          return <div key={i} style={{background:C.input,border:`1px solid ${C.border}`,borderRadius:10,padding:'12px 16px',marginBottom:8}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
              <span style={{fontSize:17,fontWeight:600,color:C.text}}>{new Date(j.jour).toLocaleDateString('fr-CI',{weekday:'short',day:'numeric',month:'short'})}</span>
              <span style={{fontWeight:700,color:net>=0?C.green:C.red,fontSize:17}}>{net>=0?'+':''}{fmt(net)} F</span>
            </div>
            <div style={{display:'flex',gap:16}}>
              <span style={{fontSize:16,color:C.green}}>📈 {fmt(j.entrees)} F</span>
              <span style={{fontSize:16,color:C.red}}>📉 {fmt(j.sorties)} F</span>
            </div>
          </div>;
        })}
      </div>}

      {tab==='journal'&&<div>
        {journal.length===0 ? <Empty icon="📋" title="Journal vide" subtitle="Aucune opération"/> : (
          <div style={{background:C.input,border:`1px solid ${C.border}`,borderRadius:14,overflow:'hidden'}}>
            <div style={{display:'grid',gridTemplateColumns:'80px 1fr 100px 120px',gap:8,padding:'10px 16px',borderBottom:`1px solid ${C.border}`,fontSize:14,fontWeight:700,color:C.dim,textTransform:'uppercase'}}>
              <span>Heure</span><span>Description</span><span>Mode</span><span style={{textAlign:'right'}}>Montant</span>
            </div>
            {journal.map((m,i)=>(
              <div key={m.id} style={{display:'grid',gridTemplateColumns:'80px 1fr 100px 120px',gap:8,padding:'10px 16px',borderBottom:i<journal.length-1?`1px solid ${C.border}`:'none',alignItems:'center',background:i%2===0?'transparent':'rgba(255,255,255,.01)'}}>
                <span style={{fontSize:16,color:C.dim}}>{new Date(m.created_at).toLocaleTimeString('fr-CI',{hour:'2-digit',minute:'2-digit'})}</span>
                <div>
                  <div style={{fontSize:17,fontWeight:600,color:C.text}}>{m.description||m.categorie}</div>
                  {m.patient_nom&&<div style={{fontSize:14,color:C.dim}}>👤 {m.patient_nom}</div>}
                </div>
                <span style={{fontSize:14,color:C.dim}}>{m.mode_paiement}</span>
                <span style={{fontWeight:700,color:m.type==='entree'?C.green:C.red,fontSize:18,textAlign:'right'}}>{m.type==='entree'?'+':'-'}{fmt(m.montant)} F</span>
              </div>
            ))}
          </div>
        )}
      </div>}

      {tab==='analyse'&&<div>
        <div style={{fontSize:17,fontWeight:700,color:C.muted,marginBottom:14}}>RÉPARTITION DES DÉPENSES DU MOIS</div>
        {(data.top_depenses||[]).length===0 ? <Empty icon="📊" title="Aucune dépense" subtitle="Aucune dépense ce mois"/> : (()=>{
          const total=data.top_depenses.reduce((s,x)=>s+parseFloat(x.total),0);
          return data.top_depenses.map((d,i)=>{
            const pct=total>0?Math.round(parseFloat(d.total)/total*100):0;
            return <div key={i} style={{marginBottom:14}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                <span style={{fontSize:17,color:C.text,fontWeight:600,textTransform:'capitalize'}}>{d.categorie}</span>
                <span style={{fontSize:17,color:C.red,fontWeight:700}}>{fmt(d.total)} F ({pct}%)</span>
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
  const [form, setForm] = React.useState({ slogan:'', adresse_complete:'', horaires:'', site_web:'', telephone:'', adresse:'', ville:'', couleur_primaire:'#0A8F58' });
  const [logo, setLogo] = React.useState(null);
  const [preview, setPreview] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState('');
  const [pwdForm, setPwdForm] = React.useState({ ancien_mot_de_passe:'', nouveau_mot_de_passe:'', confirmation:'' });
  const [pwdSaving, setPwdSaving] = React.useState(false);
  const [pwdMsg, setPwdMsg] = React.useState('');
  const handleChangePwd = async () => {
    setPwdMsg('');
    if (!pwdForm.ancien_mot_de_passe || !pwdForm.nouveau_mot_de_passe) { setPwdMsg('Ancien et nouveau mot de passe requis'); return; }
    if (pwdForm.nouveau_mot_de_passe.length < 6) { setPwdMsg('Nouveau mot de passe : 6 caractères minimum'); return; }
    if (pwdForm.nouveau_mot_de_passe !== pwdForm.confirmation) { setPwdMsg('Les deux mots de passe ne correspondent pas'); return; }
    setPwdSaving(true);
    try {
      const r = await fetch('https://mediconnect-backend-v2.vercel.app/api/mon-compte/mot-de-passe', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ancien_mot_de_passe: pwdForm.ancien_mot_de_passe, nouveau_mot_de_passe: pwdForm.nouveau_mot_de_passe })
      });
      const d = await r.json();
      setPwdMsg(d.message || (d.success ? 'Mot de passe mis à jour' : 'Erreur'));
      if (d.success) setPwdForm({ ancien_mot_de_passe:'', nouveau_mot_de_passe:'', confirmation:'' });
    } catch(e) { setPwdMsg('Erreur réseau'); }
    setPwdSaving(false);
  };

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
      setForm({ slogan:d.slogan||'', adresse_complete:d.adresse_complete||'', horaires:d.horaires||'', site_web:d.site_web||'', telephone:d.telephone||'', adresse:d.adresse||'', ville:d.ville||'', couleur_primaire:d.couleur_primaire||'#0A8F58' });
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
        body: JSON.stringify({ logo: logo||null, ...form })
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
              <h3 style={{fontSize:20,fontWeight:700,color:C.text,marginBottom:16}}>Logo de la clinique</h3>
              <div style={{width:'100%',height:160,borderRadius:10,border:`2px dashed ${preview?C.green:C.border}`,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:16,overflow:'hidden'}}>
                {preview ? <img src={preview} alt="Logo" style={{maxHeight:140,maxWidth:'100%',objectFit:'contain'}}/> : <div style={{textAlign:'center'}}><div style={{fontSize:47}}>🏥</div><div style={{fontSize:17,color:C.muted}}>Aucun logo</div></div>}
              </div>
              <label style={{display:'block',padding:'10px 16px',background:C.green,borderRadius:8,color:'#fff',fontWeight:700,fontSize:17,cursor:'pointer',textAlign:'center'}}>
                Choisir un logo (JPG/PNG max 2MB)
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} style={{display:'none'}}/>
              </label>
            </div>
            <div style={{background:C.input,border:`1.5px solid ${C.border}`,borderRadius:14,padding:20}}>
              <h3 style={{fontSize:18,fontWeight:700,color:C.text,marginBottom:12}}>Apercu en-tete impression</h3>
              <div style={{background:'#fff',borderRadius:8,padding:14}}>
                <div style={{display:'flex',alignItems:'center',gap:10,paddingBottom:8,borderBottom:`2px solid ${form.couleur_primaire}`}}>
                  {preview ? <img src={preview} alt="Logo" style={{height:44,objectFit:'contain'}}/> : <div style={{width:44,height:44,background:'#e5e7eb',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center'}}>🏥</div>}
                  <div>
                    <div style={{fontSize:18,fontWeight:700,color:'#1A2E25'}}>{profil?.nom||'Nom de la clinique'}</div>
                    {form.slogan&&<div style={{fontSize:14,color:'#5A7A94',fontStyle:'italic'}}>{form.slogan}</div>}
                    <div style={{fontSize:14,color:'#5A7A94'}}>{form.adresse_complete||profil?.adresse||'Adresse'} · {profil?.ville}</div>
                    <div style={{fontSize:14,color:'#5A7A94'}}>{profil?.telephone}{profil?.email?' · '+profil.email:''}</div>
                  </div>
                </div>
                <div style={{marginTop:6,fontSize:13,color:'#9CA3AF',textAlign:'center'}}>{form.horaires} {form.site_web?' · '+form.site_web:''}</div>
              </div>
            </div>
          </div>
          <div style={{background:C.input,border:`1.5px solid ${C.border}`,borderRadius:14,padding:24}}>
            <h3 style={{fontSize:20,fontWeight:700,color:C.text,marginBottom:16}}>Informations affichees</h3>
            <div style={{marginBottom:14}}>
              <label style={{fontSize:14,color:C.muted,display:'block',marginBottom:5,fontWeight:700}}>COULEUR DE MARQUE (IMPRIMABLES)</label>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <input type="color" value={form.couleur_primaire} onChange={e=>setForm(p=>({...p,couleur_primaire:e.target.value}))}
                  style={{width:56,height:40,padding:0,border:`1px solid ${C.border}`,borderRadius:8,cursor:'pointer',background:'transparent'}}/>
                <span style={{fontSize:15,color:C.dim,fontFamily:'monospace'}}>{form.couleur_primaire}</span>
              </div>
              <div style={{fontSize:12,color:C.dim,marginTop:6}}>Utilisée pour les titres de section et l'en-tête des factures, reçus, rapports et ordonnances imprimés.</div>
            </div>
            {[
              {label:'Téléphone',key:'telephone',ph:'Ex: 27 22 47 55 57'},
              {label:'Ville',key:'ville',ph:'Ex: Abidjan'},
              {label:'Adresse (courte)',key:'adresse',ph:'Ex: Cocody Riviera 2'},
              {label:'Slogan',key:'slogan',ph:'Ex: Votre sante, notre priorite'},
              {label:'Adresse complete',key:'adresse_complete',ph:'Ex: Cocody Riviera 2, 09 BP 2640 Abidjan 09'},
              {label:'Horaires',key:'horaires',ph:'Ex: Lun-Sam 7h-20h'},
              {label:'Site web',key:'site_web',ph:'https://www.maclinique.ci'},
            ].map(f=>(
              <div key={f.key} style={{marginBottom:14}}>
                <label style={{fontSize:14,color:C.muted,display:'block',marginBottom:5,fontWeight:700}}>{f.label.toUpperCase()}</label>
                <input value={form[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} placeholder={f.ph}
                  style={{width:'100%',padding:'10px 12px',background:'rgba(255,255,255,.04)',border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:17,outline:'none',boxSizing:'border-box'}}/>
              </div>
            ))}
            {msg&&<div style={{padding:'10px 14px',borderRadius:8,background:'rgba(10,143,88,.1)',color:C.green,fontSize:17,marginBottom:14}}>{msg}</div>}
            <button onClick={handleSave} disabled={saving} style={{width:'100%',padding:'12px',background:C.green,border:'none',borderRadius:10,color:'#fff',fontWeight:700,fontSize:18,cursor:'pointer',fontFamily:'inherit'}}>
              {saving?'Enregistrement...':'Enregistrer le profil'}
            </button>
          </div>
          <div style={{background:C.input,border:`1.5px solid ${C.border}`,borderRadius:14,padding:24,gridColumn:'1 / -1',maxWidth:480}}>
            <h3 style={{fontSize:20,fontWeight:700,color:C.text,marginBottom:16}}>🔑 Changer mon mot de passe</h3>
            <div style={{marginBottom:14}}>
              <label style={{fontSize:14,color:C.muted,display:'block',marginBottom:5,fontWeight:700}}>ANCIEN MOT DE PASSE</label>
              <input type="password" value={pwdForm.ancien_mot_de_passe} onChange={e=>setPwdForm(p=>({...p,ancien_mot_de_passe:e.target.value}))}
                style={{width:'100%',padding:'10px 12px',background:'rgba(255,255,255,.04)',border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:17,outline:'none',boxSizing:'border-box'}}/>
            </div>
            <div style={{marginBottom:14}}>
              <label style={{fontSize:14,color:C.muted,display:'block',marginBottom:5,fontWeight:700}}>NOUVEAU MOT DE PASSE</label>
              <input type="password" value={pwdForm.nouveau_mot_de_passe} onChange={e=>setPwdForm(p=>({...p,nouveau_mot_de_passe:e.target.value}))} placeholder="Min. 6 caractères"
                style={{width:'100%',padding:'10px 12px',background:'rgba(255,255,255,.04)',border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:17,outline:'none',boxSizing:'border-box'}}/>
            </div>
            <div style={{marginBottom:14}}>
              <label style={{fontSize:14,color:C.muted,display:'block',marginBottom:5,fontWeight:700}}>CONFIRMER LE NOUVEAU MOT DE PASSE</label>
              <input type="password" value={pwdForm.confirmation} onChange={e=>setPwdForm(p=>({...p,confirmation:e.target.value}))}
                style={{width:'100%',padding:'10px 12px',background:'rgba(255,255,255,.04)',border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:17,outline:'none',boxSizing:'border-box'}}/>
            </div>
            {pwdMsg&&<div style={{padding:'10px 14px',borderRadius:8,background:'rgba(37,99,235,.1)',color:C.blue,fontSize:17,marginBottom:14}}>{pwdMsg}</div>}
            <button onClick={handleChangePwd} disabled={pwdSaving} style={{width:'100%',padding:'12px',background:C.blue||'#2563EB',border:'none',borderRadius:10,color:'#fff',fontWeight:700,fontSize:18,cursor:'pointer',fontFamily:'inherit'}}>
              {pwdSaving?'Mise à jour...':'Changer le mot de passe'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  RESULTATS D'EXAMENS PAR CODE — medecin + bureau des entrees
// ════════════════════════════════════════════════════════════════════
// Acces volontairement restreint aux SEULS bulletins d'examens (type,
// statut, rapport, fichiers) : ni consultations, ni ordonnances, ni
// aucune autre donnee du dossier medical. C'est ce qui permet au bureau
// des entrees d'y acceder sans violer le cloisonnement medical du RBAC.
function PageResultatsExamens() {
  const { token } = useAuthStore();
  const [code, setCode] = useState("");
  const [patient, setPatient] = useState(null);
  const [recherche, setRecherche] = useState(false);
  const [erreur, setErreur] = useState("");
  const headers = { Authorization: `Bearer ${token}` };

  const { data: bulletinsData, isLoading: chargement, refetch } = useQuery({
    queryKey: ["resultats-examens-code", patient?.id],
    queryFn: async () => {
      if (!patient) return [];
      const r = await fetch(`https://mediconnect-backend-v2.vercel.app/api/bulletins?patient_id=${patient.id}`, { headers });
      const d = await r.json();
      return d.data || [];
    },
    enabled: !!patient,
  });
  const bulletins = bulletinsData || [];

  const rechercherPatient = async () => {
    const c = code.trim();
    if (!c) { setErreur("Entrez un code dossier"); return; }
    setRecherche(true); setErreur(""); setPatient(null);
    try {
      const r = await fetch(`https://mediconnect-backend-v2.vercel.app/api/patients/by-code/${encodeURIComponent(c)}`, { headers });
      const d = await r.json();
      if (d?.success && d?.data?.id) setPatient(d.data);
      else setErreur(d?.message || "Aucun patient avec ce code");
    } catch(e) {
      setErreur("Erreur de recherche");
    }
    setRecherche(false);
  };

  return (
    <div>
      <PageHeader title="🔬 Résultats d'examens" subtitle="Recherche par code dossier — laboratoire et imagerie uniquement" />

      <Panel>
        <div style={{display:"flex",gap:8,marginBottom:patient?16:0}}>
          <Inp label="Code dossier du patient" value={code}
            onChange={e=>{ setCode(e.target.value); setErreur(""); }}
            placeholder="MC-XX-0000" style={{flex:1}} />
          <Btn style={{alignSelf:"flex-end",padding:"11px 20px"}} loading={recherche} onClick={rechercherPatient}>🔎 Rechercher</Btn>
        </div>
        {erreur && <div style={{fontSize:16,color:C.red,marginTop:6}}>{erreur}</div>}

        {patient && (
          <>
            <div style={{background:"rgba(10,143,88,.1)",border:"1px solid rgba(10,143,88,.3)",borderRadius:9,padding:"10px 14px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:18,fontWeight:700,color:C.text}}>{patient.prenom} {patient.nom}</div>
                <div style={{fontSize:14,color:C.muted}}>Dossier : {patient.code_secret||"—"}</div>
              </div>
              <button type="button" onClick={()=>{ setPatient(null); setCode(""); }}
                style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:17}}>✕ Nouvelle recherche</button>
            </div>

            {chargement ? <Loader/> : bulletins.length===0
              ? <Empty icon="🔬" title="Aucun examen" subtitle="Aucune demande d'analyse ou d'imagerie pour ce patient."/>
              : bulletins.map((b,i)=>(
                <div key={b.id||i} style={{display:"flex",alignItems:"flex-start",gap:14,padding:"12px 0",borderBottom:i<bulletins.length-1?`1px solid ${C.border}`:"none"}}>
                  <span style={{fontSize:29}}>{b.categorie==="imagerie"?"🩻":"🧪"}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:17,fontWeight:700,color:C.text}}>{b.type||"Examen"}</div>
                    <div style={{fontSize:14,color:C.muted}}>{fmtDate ? fmtDate(b.created_at) : new Date(b.created_at).toLocaleDateString("fr-CI")}</div>
                    {b.rapport && <div style={{fontSize:16,color:C.teal,marginTop:4}}>{b.rapport}</div>}
                    {b.fichier_url && (
                      <a href={b.fichier_url} target="_blank" rel="noopener noreferrer"
                        style={{display:"inline-block",fontSize:14,color:C.blue,marginTop:4,textDecoration:"none",fontWeight:700}}>
                        📎 Voir le résultat ↗
                      </a>
                    )}
                  </div>
                  <Badge color={b.statut==="nouveau"?"blue":"green"}>{b.statut==="nouveau"?"En attente":"Traité"}</Badge>
                </div>
              ))
            }
          </>
        )}
      </Panel>
    </div>
  );
}

function PageAdministration() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ prenom:'', nom:'', email:'', password:'', telephone:'', sous_role:'bureau_entrees' });

  const SOUS_ROLES_LOCALES = [
    { v:'bureau_entrees', l:'Bureau des entrées', desc:'Accueil, caisse et facturation' },
    { v:'medecin',        l:'Médecin',            desc:'Consultations, ordonnances, dossiers medicaux' },
    { v:'finance',        l:'Finance',            desc:'Caisse, facturation, comptabilite' },
    { v:'rh',              l:'RH',                 desc:'Gestion du personnel' },
    { v:'pharmacien',     l:'Pharmacien',         desc:'Stock, ordonnances recues, dispensation' },
    { v:'laboratoire',    l:'Laboratoire',        desc:'Consultation et saisie des bulletins labo' },
    { v:'radiologie',     l:'Radiologie',         desc:'Consultation et saisie des bulletins imagerie' },
  ];

  const { data, isLoading } = useQuery({ queryKey:['cl-personnel-admin'], queryFn:()=>cAPI.personnel().then(r=>r.data||[]) });
  const personnel = data || [];

  const addMut = useMutation({
    mutationFn: d => cAPI.addPersonnel(d),
    onSuccess: () => {
      toast.success('Compte créé !');
      qc.invalidateQueries(['cl-personnel-admin']);
      setShowAdd(false);
      setForm({ prenom:'', nom:'', email:'', password:'', telephone:'', sous_role:'bureau_entrees' });
    },
    onError: e => toast.error(e?.response?.data?.message || 'Erreur lors de la création'),
  });
  const toggleMut = useMutation({
    mutationFn: ({id,is_active}) => cAPI.updPersonnel(id,{is_active}),
    onSuccess: () => { toast.success('Statut mis à jour'); qc.invalidateQueries(['cl-personnel-admin']); },
    onError: () => toast.error('Erreur'),
  });

  return (
    <div style={{ padding:24 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <div style={{ fontSize:20, fontWeight:800, color:C.text }}>👤 Administration</div>
          <div style={{ fontSize:13, color:C.muted }}>Comptes du personnel de votre clinique</div>
        </div>
        <button onClick={()=>setShowAdd(true)} style={{ background:`linear-gradient(135deg,${C.teal},${C.green})`, border:'none', borderRadius:10, padding:'10px 18px', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>+ Nouveau compte</button>
      </div>

      {isLoading ? (
        <div style={{ color:C.muted, textAlign:'center', padding:40 }}>Chargement…</div>
      ) : personnel.length === 0 ? (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:40, textAlign:'center' }}>
          <div style={{ fontSize:32, marginBottom:10 }}>👤</div>
          <div style={{ color:C.muted }}>Aucun compte de personnel pour l'instant.</div>
        </div>
      ) : (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden' }}>
          {personnel.map(p => (
            <div key={p.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:16, borderBottom:`1px solid ${C.border}` }}>
              <div>
                <div style={{ fontWeight:700, color:C.text, fontSize:14 }}>{p.prenom} {p.nom}</div>
                <div style={{ fontSize:12, color:C.muted }}>{p.email} · {SOUS_ROLES_LOCALES.find(s=>s.v===p.sous_role)?.l || p.sous_role}</div>
              </div>
              <button onClick={()=>toggleMut.mutate({ id:p.id, is_active: !p.is_active })}
                style={{ background: p.is_active ? 'rgba(10,143,88,.12)' : 'rgba(225,29,72,.12)', border:`1px solid ${p.is_active ? C.green : C.red}`, borderRadius:8, padding:'6px 12px', color: p.is_active ? C.green : C.red, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                {p.is_active ? 'Actif' : 'Désactivé'}
              </button>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 }} onClick={()=>setShowAdd(false)}>
          <div onClick={e=>e.stopPropagation()} style={{ background:C.card, borderRadius:14, padding:24, width:480, maxWidth:'90vw' }}>
            <div style={{ fontSize:16, fontWeight:800, color:C.text, marginBottom:16 }}>Nouveau compte</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
              <input placeholder="Prénom *" value={form.prenom} onChange={e=>setForm(f=>({...f,prenom:e.target.value}))} style={{ background:C.input, border:`1px solid ${C.border}`, borderRadius:8, padding:10, color:C.text, fontSize:13 }} />
              <input placeholder="Nom *" value={form.nom} onChange={e=>setForm(f=>({...f,nom:e.target.value}))} style={{ background:C.input, border:`1px solid ${C.border}`, borderRadius:8, padding:10, color:C.text, fontSize:13 }} />
            </div>
            <input placeholder="Email *" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} style={{ width:'100%', boxSizing:'border-box', background:C.input, border:`1px solid ${C.border}`, borderRadius:8, padding:10, color:C.text, fontSize:13, marginBottom:10 }} />
            <input placeholder="Mot de passe *" type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} style={{ width:'100%', boxSizing:'border-box', background:C.input, border:`1px solid ${C.border}`, borderRadius:8, padding:10, color:C.text, fontSize:13, marginBottom:10 }} />
            <input placeholder="Téléphone" value={form.telephone} onChange={e=>setForm(f=>({...f,telephone:e.target.value}))} style={{ width:'100%', boxSizing:'border-box', background:C.input, border:`1px solid ${C.border}`, borderRadius:8, padding:10, color:C.text, fontSize:13, marginBottom:14 }} />
            <div style={{ fontSize:11, fontWeight:700, color:C.dim, textTransform:'uppercase', marginBottom:8 }}>Rôle</div>
            {SOUS_ROLES_LOCALES.map(s => (
              <div key={s.v} onClick={()=>setForm(f=>({...f,sous_role:s.v}))}
                style={{ display:'flex', gap:10, alignItems:'center', padding:10, borderRadius:8, marginBottom:6, cursor:'pointer', background: form.sous_role===s.v ? 'rgba(13,148,136,.1)' : 'transparent', border:`1px solid ${form.sous_role===s.v ? C.teal : C.border}` }}>
                <div style={{ width:16, height:16, borderRadius:'50%', border:`2px solid ${form.sous_role===s.v?C.teal:C.border}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {form.sous_role===s.v && <div style={{ width:8, height:8, borderRadius:'50%', background:C.teal }} />}
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{s.l}</div>
                  <div style={{ fontSize:11, color:C.muted }}>{s.desc}</div>
                </div>
              </div>
            ))}
            <div style={{ display:'flex', gap:10, marginTop:16 }}>
              <button onClick={()=>setShowAdd(false)} style={{ flex:1, background:'transparent', border:`1px solid ${C.border}`, borderRadius:8, padding:10, color:C.muted, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Annuler</button>
              <button disabled={addMut.isPending} onClick={()=>{
                if (!form.prenom||!form.nom||!form.email||!form.password) { toast.error('Champs obligatoires manquants'); return; }
                addMut.mutate(form);
              }} style={{ flex:2, background:`linear-gradient(135deg,${C.teal},${C.green})`, border:'none', borderRadius:8, padding:10, color:'#fff', fontWeight:700, cursor:addMut.isPending?'not-allowed':'pointer', fontFamily:'inherit', opacity:addMut.isPending?.7:1 }}>
                {addMut.isPending ? 'Création…' : 'Créer le compte'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const mode = useThemeStore(s => s.mode);
  Object.assign(C, mode === 'light' ? PALETTE_LIGHT : PALETTE_DARK);
  return (
    <Routes>
      <Route index               element={<PageHome />} />
      <Route path="planning"     element={<PagePlanning />} />
      <Route path="dossiers"     element={<PageDossiers />} />
      <Route path="consultation" element={<PageConsultation />} />
      <Route path="caisse"       element={<PageCaisse />} />
      <Route path="facturation"  element={<PageFacturation />} />
      <Route path="specialites" element={<PageSpecialites />} />
      <Route path="parametrage" element={<PageParametrage />} />
      <Route path="stock"        element={<PageStock />} />
      <Route path="assurance"    element={<PageAssurance />} />
      <Route path="dossiers-ass" element={<PageAssurance />} />
      <Route path="file-attente"  element={<PageFileAttente />} />
      <Route path="file-medecin"  element={<PageFileAttenteMedecinClinique />} />
      <Route path="resultats-examens" element={<PageResultatsExamens />} />
      <Route path="proprietaire"  element={<PageProprietaire />} />
      <Route path="profil-logo"   element={<PageProfilLogo />} />
      <Route path="qualite"      element={<PageQualite />} />
      <Route path="stats"        element={<PageStats />} />
      <Route path="administration" element={<PageMedecins />} />
      <Route path="actes-tarifs" element={<PanelGestionActes />} />
      <Route path="pharmacie-interne" element={<PagePharmacieInterne />} />
      <Route path="*"            element={<PageHome />} />
    </Routes>
  );
}
