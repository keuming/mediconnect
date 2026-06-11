/**
 * PageOrdonnancesPharmacie.jsx — À intégrer dans Dashboard pharmacie
 * Permet à la pharmacie de voir les ordonnances reçues et renseigner les prix
 */

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "../../services/api";

const C = {
  green:"#0A8F58", teal:"#0D9488", amber:"#D97706", red:"#E11D48",
  blue:"#2563EB", card:"#0E1620", input:"#141E2B", hover:"#1A2535",
  border:"#1E2F42", text:"#F0F4F8", muted:"#8BA0B5", dim:"#4E657A",
};
const fmt = n => Number(n||0).toLocaleString("fr-CI");

const STATUT = {
  en_attente:     { color:C.amber, label:"Nouvelle" },
  devis_envoye:   { color:C.blue,  label:"Devis envoyé" },
  paiement_initie:{ color:"#7C3AED", label:"Paiement en cours" },
  paye:           { color:C.green, label:"Payé" },
  en_preparation: { color:C.teal,  label:"En préparation" },
  pret:           { color:C.green, label:"Prêt" },
  livre:          { color:C.green, label:"Livré" },
  annule:         { color:C.red,   label:"Annulé" },
};

export default function PageOrdonnancesPharmacie() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [tabStatut, setTabStatut] = useState("en_attente");
  const [lignesEdit, setLignesEdit] = useState([]);
  const [notesPharma, setNotesPharma] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["pharma-commandes", tabStatut],
    queryFn: () => api.get(`/pharmacie/commandes?statut=${tabStatut}`).then(r => r.data || []),
    staleTime: 0,
  });
  const commandes = data || [];

  const devisMut = useMutation({
    mutationFn: ({ id, lignes, notes }) => api.post(`/pharmacie/commandes/${id}/devis`, { lignes, notes_pharmacie: notes }),
    onSuccess: () => {
      toast.success("✅ Devis envoyé au patient !");
      qc.invalidateQueries(["pharma-commandes"]);
      setSelected(null);
    },
    onError: () => toast.error("Erreur envoi devis"),
  });

  const statutMut = useMutation({
    mutationFn: ({ id, statut }) => api.patch(`/pharmacie/commandes/${id}/statut`, { statut }),
    onSuccess: () => { toast.success("Statut mis à jour"); qc.invalidateQueries(["pharma-commandes"]); },
  });

  const openDevis = (cmd) => {
    setSelected(cmd);
    setNotesPharma(cmd.notes_pharmacie || "");
    setLignesEdit((cmd.lignes || []).map(l => ({
      ...l,
      prix_unitaire: l.prix_unitaire || "",
      quantite: l.quantite || 1,
      disponible: l.disponible !== false,
    })));
  };

  const total = lignesEdit.reduce((sum,l) => sum + (Number(l.prix_unitaire||0) * Number(l.quantite||1)), 0);

  const TABS = [
    { k:"en_attente", label:"🔔 Nouvelles" },
    { k:"devis_envoye", label:"📋 Devis envoyés" },
    { k:"paye", label:"💳 Payées" },
    { k:"en_preparation", label:"⚗️ En préparation" },
    { k:"pret", label:"✅ Prêtes" },
  ];

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div>
          <h2 style={{ fontSize:18, fontWeight:800, color:C.text, margin:0 }}>
            💊 Ordonnances reçues
          </h2>
          <div style={{ fontSize:12, color:C.muted, marginTop:3 }}>
            {commandes.length} commande(s) · {STATUT[tabStatut]?.label}
          </div>
        </div>
        <button onClick={refetch} style={{ padding:"7px 14px", borderRadius:9,
          background:C.hover, border:`1.5px solid ${C.border}`, color:C.muted,
          cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>🔄</button>
      </div>

      {/* Onglets statut */}
      <div style={{ display:"flex", gap:6, marginBottom:20, flexWrap:"wrap" }}>
        {TABS.map(t => (
          <button key={t.k} onClick={() => setTabStatut(t.k)}
            style={{ padding:"7px 14px", borderRadius:99, fontSize:12, fontWeight:700,
              cursor:"pointer", border:"none", fontFamily:"inherit",
              background: tabStatut===t.k ? `linear-gradient(135deg,${C.green},${C.teal})` : C.hover,
              color: tabStatut===t.k ? "#fff" : C.muted }}>
            {t.label}
          </button>
        ))}
      </div>

      {isLoading && <div style={{ textAlign:"center", padding:32, color:C.dim }}>⏳ Chargement…</div>}

      {!isLoading && commandes.length === 0 && (
        <div style={{ textAlign:"center", padding:"48px 20px" }}>
          <div style={{ fontSize:48, marginBottom:12 }}>📋</div>
          <div style={{ fontSize:15, fontWeight:700, color:C.muted }}>
            Aucune commande — {STATUT[tabStatut]?.label}
          </div>
        </div>
      )}

      {commandes.map(cmd => {
        const st = STATUT[cmd.statut] || STATUT.en_attente;
        return (
          <div key={cmd.id} style={{ background:C.input, border:`1.5px solid ${C.border}`,
            borderRadius:14, padding:18, marginBottom:12 }}>
            {/* Header */}
            <div style={{ display:"flex", justifyContent:"space-between",
              alignItems:"flex-start", marginBottom:12 }}>
              <div>
                <div style={{ fontSize:14, fontWeight:800, color:C.text }}>
                  👤 {cmd.patient_nom || "Patient"}
                </div>
                <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>
                  📋 {cmd.reference} · {new Date(cmd.created_at).toLocaleDateString("fr-CI",{day:"numeric",month:"short"})}
                  {cmd.contact && ` · 📞 ${cmd.contact}`}
                </div>
              </div>
              <span style={{ background:st.color+"20", color:st.color,
                fontSize:11, fontWeight:700, padding:"4px 12px", borderRadius:20 }}>
                {st.label}
              </span>
            </div>

            {/* Médicaments demandés */}
            <div style={{ marginBottom:12 }}>
              {(cmd.lignes||[]).map((l,i) => (
                <div key={i} style={{ fontSize:12, color:C.muted, padding:"3px 0",
                  borderBottom: i<cmd.lignes.length-1?`1px solid ${C.border}`:"none" }}>
                  {i+1}. {l.medicament}
                  {l.prix_unitaire ? <span style={{ color:C.green }}>
                    {" "}→ {fmt(l.prix_unitaire)} F × {l.quantite} = {fmt(l.prix_total||0)} F
                  </span> : <span style={{ color:C.amber }}> (prix à renseigner)</span>}
                </div>
              ))}
            </div>

            {/* Notes patient */}
            {cmd.notes_patient && (
              <div style={{ padding:"8px 10px", background:"rgba(37,99,235,.07)",
                borderRadius:8, fontSize:12, color:C.muted, marginBottom:12 }}>
                💬 Note patient : {cmd.notes_patient}
              </div>
            )}

            {/* Actions */}
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {cmd.statut === "en_attente" && (
                <button onClick={() => openDevis(cmd)}
                  style={{ padding:"8px 16px", borderRadius:9,
                    background:`linear-gradient(135deg,${C.green},${C.teal})`,
                    border:"none", color:"#fff", cursor:"pointer",
                    fontSize:12, fontWeight:700, fontFamily:"inherit" }}>
                  💰 Renseigner les prix
                </button>
              )}
              {cmd.statut === "paye" && (
                <button onClick={() => statutMut.mutate({ id:cmd.id, statut:"en_preparation" })}
                  style={{ padding:"8px 16px", borderRadius:9,
                    background:`rgba(13,148,136,.15)`, border:`1px solid ${C.teal}`,
                    color:C.teal, cursor:"pointer", fontSize:12, fontWeight:700, fontFamily:"inherit" }}>
                  ⚗️ Mettre en préparation
                </button>
              )}
              {cmd.statut === "en_preparation" && (
                <button onClick={() => statutMut.mutate({ id:cmd.id, statut:"pret" })}
                  style={{ padding:"8px 16px", borderRadius:9,
                    background:`rgba(10,143,88,.15)`, border:`1px solid ${C.green}`,
                    color:C.green, cursor:"pointer", fontSize:12, fontWeight:700, fontFamily:"inherit" }}>
                  ✅ Marquer prêt
                </button>
              )}
              {cmd.statut === "pret" && (
                <button onClick={() => statutMut.mutate({ id:cmd.id, statut:"livre" })}
                  style={{ padding:"8px 16px", borderRadius:9,
                    background:`rgba(10,143,88,.15)`, border:`1px solid ${C.green}`,
                    color:C.green, cursor:"pointer", fontSize:12, fontWeight:700, fontFamily:"inherit" }}>
                  🚚 Marquer livré
                </button>
              )}
              {["en_attente","devis_envoye"].includes(cmd.statut) && (
                <button onClick={() => statutMut.mutate({ id:cmd.id, statut:"annule" })}
                  style={{ padding:"8px 14px", borderRadius:9,
                    background:"rgba(225,29,72,.08)", border:"1px solid rgba(225,29,72,.2)",
                    color:C.red, cursor:"pointer", fontSize:12, fontWeight:700, fontFamily:"inherit" }}>
                  ✕ Annuler
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* Modal renseigner prix */}
      {selected && (
        <div onClick={() => setSelected(null)} style={{ position:"fixed", inset:0,
          background:"rgba(0,0,0,.8)", display:"flex", alignItems:"center",
          justifyContent:"center", zIndex:1000, padding:16 }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:C.card,
            border:`1px solid ${C.border}`, borderRadius:18, width:620,
            maxWidth:"95vw", maxHeight:"90vh", overflowY:"auto" }}>

            <div style={{ background:`linear-gradient(135deg,${C.green},${C.teal})`,
              borderRadius:"18px 18px 0 0", padding:"18px 24px",
              display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,.7)" }}>
                  💰 Devis — {selected.reference}
                </div>
                <div style={{ fontSize:17, fontWeight:800, color:"#fff" }}>
                  {selected.patient_nom}
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background:"rgba(255,255,255,.2)",
                border:"none", borderRadius:"50%", width:32, height:32,
                color:"#fff", cursor:"pointer", fontSize:18 }}>✕</button>
            </div>

            <div style={{ padding:24 }}>
              {/* Tableau prix */}
              <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:12 }}>
                Renseigner les prix
              </div>

              {/* En-tête */}
              <div style={{ display:"grid", gridTemplateColumns:"3fr 1fr 1fr auto",
                gap:8, marginBottom:6 }}>
                {["Médicament","Qté","Prix unit. (F)","Dispo"].map(h => (
                  <div key={h} style={{ fontSize:10, fontWeight:700, color:C.dim,
                    textTransform:"uppercase" }}>{h}</div>
                ))}
              </div>

              {lignesEdit.map((l,i) => (
                <div key={i} style={{ display:"grid",
                  gridTemplateColumns:"3fr 1fr 1fr auto",
                  gap:8, marginBottom:8, alignItems:"center" }}>
                  <div style={{ fontSize:12, color:C.text, padding:"8px 4px" }}>
                    {l.medicament?.slice(0,40)}
                  </div>
                  <input type="number" min={1} value={l.quantite}
                    onChange={e=>setLignesEdit(ls=>ls.map((x,j)=>j===i?{...x,quantite:Number(e.target.value)||1}:x))}
                    style={{ background:C.hover, border:`1.5px solid ${C.border}`,
                      borderRadius:8, padding:"8px 10px", color:C.text, fontSize:13,
                      outline:"none", fontFamily:"inherit", boxSizing:"border-box",
                      textAlign:"center" }}/>
                  <input type="number" min={0} value={l.prix_unitaire}
                    onChange={e=>setLignesEdit(ls=>ls.map((x,j)=>j===i?{...x,prix_unitaire:e.target.value}:x))}
                    placeholder="0"
                    style={{ background:C.hover, border:`1.5px solid ${C.border}`,
                      borderRadius:8, padding:"8px 10px", color:C.green, fontSize:13,
                      fontWeight:700, outline:"none", fontFamily:"inherit",
                      boxSizing:"border-box" }}/>
                  <input type="checkbox" checked={l.disponible}
                    onChange={e=>setLignesEdit(ls=>ls.map((x,j)=>j===i?{...x,disponible:e.target.checked}:x))}
                    style={{ width:18, height:18, cursor:"pointer" }}/>
                </div>
              ))}

              {/* Total */}
              <div style={{ display:"flex", justifyContent:"flex-end",
                padding:"12px 0", borderTop:`1px solid ${C.border}`,
                marginTop:8, marginBottom:16 }}>
                <div style={{ fontSize:18, fontWeight:900, color:C.green }}>
                  Total : {fmt(total)} FCFA
                </div>
              </div>

              {/* Notes pharmacie */}
              <div style={{ marginBottom:20 }}>
                <label style={{ display:"block", fontSize:11, fontWeight:700,
                  color:C.muted, textTransform:"uppercase", marginBottom:6 }}>
                  Note pour le patient
                </label>
                <textarea value={notesPharma} onChange={e=>setNotesPharma(e.target.value)}
                  placeholder="Ex: Médicament X non disponible, substitut proposé..."
                  rows={2} style={{ width:"100%", background:C.hover,
                    border:`1.5px solid ${C.border}`, borderRadius:9, padding:"10px 14px",
                    color:C.text, fontSize:14, resize:"none", outline:"none",
                    fontFamily:"inherit", boxSizing:"border-box" }}/>
              </div>

              <div style={{ display:"flex", gap:10 }}>
                <button onClick={() => setSelected(null)}
                  style={{ flex:1, padding:"11px", borderRadius:9, background:"transparent",
                    border:`1.5px solid ${C.border}`, color:C.muted, cursor:"pointer",
                    fontSize:13, fontWeight:700, fontFamily:"inherit" }}>
                  Annuler
                </button>
                <button disabled={devisMut.isPending || total === 0}
                  onClick={() => devisMut.mutate({
                    id: selected.id,
                    lignes: lignesEdit.map(l=>({...l, prix_unitaire:Number(l.prix_unitaire||0)})),
                    notes: notesPharma,
                  })}
                  style={{ flex:2, padding:"11px", borderRadius:9,
                    background: total>0 ? `linear-gradient(135deg,${C.green},${C.teal})` : C.hover,
                    border:"none", color:"#fff",
                    cursor:(devisMut.isPending||total===0)?"not-allowed":"pointer",
                    fontSize:13, fontWeight:700, fontFamily:"inherit",
                    opacity:(devisMut.isPending||total===0)?.65:1 }}>
                  {devisMut.isPending ? "⏳ Envoi…" : `✅ Envoyer devis — ${fmt(total)} FCFA`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
