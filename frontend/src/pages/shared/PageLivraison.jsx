/**
 * PageLivraison.jsx — Composants partagés workflow livraison médicaments
 * 
 * Exports:
 *  - PageSuiviLivraison     → patient (suivi commande + confirmation)
 *  - PageMissionsLivreur    → livreur (voir missions + accepter + gérer)
 *  - PageLivraisonPharmacie → pharmacie (publier mission + suivi)
 */

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "../../services/api";

const C = {
  green:"#0A8F58", teal:"#0D9488", amber:"#D97706", red:"#E11D48",
  blue:"#2563EB", purple:"#7C3AED", card:"#0E1620", input:"#141E2B",
  hover:"#1A2535", border:"#1E2F42", text:"#F0F4F8", muted:"#8BA0B5", dim:"#4E657A",
};
const fmt = n => Number(n||0).toLocaleString("fr-CI");

const STATUT_CONFIG = {
  publiee:          { label:"En recherche de livreur", color:C.amber,   icon:"🔍", step:1 },
  acceptee:         { label:"Livreur assigné",         color:C.blue,    icon:"🛵", step:2 },
  retrait_confirme: { label:"Colis retiré",            color:C.purple,  icon:"📦", step:3 },
  en_route:         { label:"En livraison",            color:C.teal,    icon:"🚀", step:4 },
  livree:           { label:"Livré ✅",               color:C.green,   icon:"✅", step:5 },
  echouee:          { label:"Échec",                  color:C.red,     icon:"❌", step:0 },
  annulee:          { label:"Annulée",                color:C.dim,     icon:"✕",  step:0 },
};

// ── Barre de progression ─────────────────────────────────────────────────────
function ProgressBar({ statut }) {
  const steps = [
    { s:"publiee",          label:"Mission publiée",  icon:"📢" },
    { s:"acceptee",         label:"Livreur assigné",  icon:"🛵" },
    { s:"retrait_confirme", label:"Colis retiré",     icon:"📦" },
    { s:"en_route",         label:"En livraison",     icon:"🚀" },
    { s:"livree",           label:"Livré",            icon:"✅" },
  ];
  const currentStep = STATUT_CONFIG[statut]?.step || 0;
  return (
    <div style={{ padding:"16px 0", marginBottom:16 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        {steps.map((s,i) => (
          <React.Fragment key={s.s}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", flex:1 }}>
              <div style={{
                width:36, height:36, borderRadius:"50%", display:"flex",
                alignItems:"center", justifyContent:"center", fontSize:16,
                background: currentStep >= i+1 ? C.green : C.hover,
                border: `2px solid ${currentStep >= i+1 ? C.green : C.border}`,
                transition:"all .3s"
              }}>{currentStep >= i+1 ? s.icon : <span style={{color:C.dim,fontSize:12}}>{i+1}</span>}</div>
              <div style={{ fontSize:9, color: currentStep >= i+1 ? C.green : C.dim,
                marginTop:4, textAlign:"center", fontWeight:700, textTransform:"uppercase",
                letterSpacing:".3px", maxWidth:60 }}>{s.label}</div>
            </div>
            {i < steps.length-1 && (
              <div style={{ height:2, flex:1, maxWidth:30,
                background: currentStep > i+1 ? C.green : C.border,
                transition:"background .3s", marginBottom:20 }}/>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// PAGE PATIENT — Suivi livraison
// ════════════════════════════════════════════════════════════════════
export function PageSuiviLivraison() {
  const [codeInput, setCodeInput] = useState("");
  const [selectedMission, setSelectedMission] = useState(null);
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["patient-livraisons"],
    queryFn: () => api.get("/livraison/missions").then(r => r.data || []),
    staleTime: 0,
    refetchInterval: 30000, // polling 30s
  });

  const { data: notifs } = useQuery({
    queryKey: ["patient-notifs"],
    queryFn: () => api.get("/livraison/notifications").then(r => r.data || []),
    staleTime: 0,
    refetchInterval: 15000,
  });

  const confirmerMut = useMutation({
    mutationFn: ({ id, code }) => api.post(`/livraison/missions/${id}/confirmer-livraison`, { code }),
    onSuccess: () => { toast.success("✅ Livraison confirmée ! Bon rétablissement 🌿"); qc.invalidateQueries(["patient-livraisons"]); setSelectedMission(null); setCodeInput(""); },
    onError: () => toast.error("Code incorrect — réessayez"),
  });

  const missions = data || [];
  const notifsList = notifs || [];

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div>
          <h2 style={{ fontSize:18, fontWeight:800, color:C.text, margin:0 }}>🛵 Mes livraisons</h2>
          <div style={{ fontSize:12, color:C.muted, marginTop:3 }}>{missions.length} livraison(s)</div>
        </div>
        <button onClick={refetch} style={{ padding:"7px 14px", borderRadius:9,
          background:C.hover, border:`1.5px solid ${C.border}`, color:C.muted,
          cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>🔄 Actualiser</button>
      </div>

      {/* Notifications non lues */}
      {notifsList.length > 0 && (
        <div style={{ marginBottom:16 }}>
          {notifsList.slice(0,3).map(n => (
            <div key={n.id} style={{ background:"rgba(10,143,88,.08)", border:"1px solid rgba(10,143,88,.2)",
              borderRadius:10, padding:"10px 14px", marginBottom:8, fontSize:13, color:C.text }}>
              {n.message}
              <span style={{ fontSize:10, color:C.dim, marginLeft:8 }}>
                {new Date(n.created_at).toLocaleTimeString("fr-CI",{hour:"2-digit",minute:"2-digit"})}
              </span>
            </div>
          ))}
        </div>
      )}

      {isLoading && <div style={{ textAlign:"center", padding:32, color:C.dim }}>⏳ Chargement…</div>}
      {!isLoading && missions.length === 0 && (
        <div style={{ textAlign:"center", padding:"48px 20px" }}>
          <div style={{ fontSize:48, marginBottom:12 }}>🛵</div>
          <div style={{ fontSize:15, fontWeight:700, color:C.muted }}>Aucune livraison en cours</div>
          <div style={{ fontSize:12, color:C.dim, marginTop:6 }}>
            Commandez des médicaments depuis vos ordonnances pour démarrer une livraison
          </div>
        </div>
      )}

      {missions.map(m => {
        const st = STATUT_CONFIG[m.statut] || STATUT_CONFIG.publiee;
        return (
          <div key={m.id} style={{ background:C.input, border:`1.5px solid ${C.border}`,
            borderRadius:14, padding:20, marginBottom:14 }}>
            {/* Header */}
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
              <div>
                <div style={{ fontSize:14, fontWeight:800, color:C.text }}>{m.reference}</div>
                <div style={{ fontSize:11, color:C.muted }}>
                  {new Date(m.created_at).toLocaleDateString("fr-CI",{day:"numeric",month:"short",year:"numeric"})}
                </div>
              </div>
              <span style={{ background:st.color+"20", color:st.color,
                fontSize:12, fontWeight:700, padding:"5px 14px", borderRadius:20 }}>
                {st.icon} {st.label}
              </span>
            </div>

            {/* Barre de progression */}
            <ProgressBar statut={m.statut} />

            {/* Infos livraison */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
              <div style={{ background:C.hover, borderRadius:8, padding:"8px 12px" }}>
                <div style={{ fontSize:10, color:C.dim, fontWeight:700, textTransform:"uppercase", marginBottom:3 }}>Pharmacie</div>
                <div style={{ fontSize:12, color:C.text }}>{m.pharmacie_nom || "—"}</div>
              </div>
              <div style={{ background:C.hover, borderRadius:8, padding:"8px 12px" }}>
                <div style={{ fontSize:10, color:C.dim, fontWeight:700, textTransform:"uppercase", marginBottom:3 }}>Livreur</div>
                <div style={{ fontSize:12, color:C.text }}>
                  {m.livreur_prenom ? `${m.livreur_prenom} ${m.livreur_nom}` : "En attente…"}
                </div>
                {m.livreur_tel && <div style={{ fontSize:11, color:C.green }}>📞 {m.livreur_tel}</div>}
              </div>
              <div style={{ background:C.hover, borderRadius:8, padding:"8px 12px" }}>
                <div style={{ fontSize:10, color:C.dim, fontWeight:700, textTransform:"uppercase", marginBottom:3 }}>Frais livraison</div>
                <div style={{ fontSize:14, fontWeight:800, color:C.amber }}>{fmt(m.frais_livraison)} FCFA</div>
              </div>
              <div style={{ background:C.hover, borderRadius:8, padding:"8px 12px" }}>
                <div style={{ fontSize:10, color:C.dim, fontWeight:700, textTransform:"uppercase", marginBottom:3 }}>Délai estimé</div>
                <div style={{ fontSize:12, color:C.text }}>~{m.delai_estime} min</div>
              </div>
            </div>

            {/* Contact livreur si en route */}
            {['acceptee','retrait_confirme','en_route'].includes(m.statut) && m.livreur_tel && (
              <a href={`tel:${m.livreur_tel}`} style={{ display:"flex", alignItems:"center", gap:8,
                padding:"9px 14px", background:"rgba(10,143,88,.08)",
                border:"1px solid rgba(10,143,88,.2)", borderRadius:9,
                color:C.green, textDecoration:"none", fontSize:13, fontWeight:700, marginBottom:12 }}>
                📞 Appeler le livreur — {m.livreur_prenom}
              </a>
            )}

            {/* Confirmer livraison avec code */}
            {m.statut === 'en_route' && (
              <div style={{ background:"rgba(10,143,88,.06)", border:"1px solid rgba(10,143,88,.15)",
                borderRadius:10, padding:14 }}>
                <div style={{ fontSize:12, fontWeight:700, color:C.text, marginBottom:8 }}>
                  🔑 Confirmer la livraison
                </div>
                <div style={{ fontSize:11, color:C.muted, marginBottom:10 }}>
                  Entrez le code à 6 chiffres que le livreur vous donne
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <input value={codeInput} onChange={e=>setCodeInput(e.target.value)}
                    placeholder="123456" maxLength={6}
                    style={{ flex:1, background:C.hover, border:`1.5px solid ${C.border}`,
                      borderRadius:9, padding:"10px 14px", color:C.text, fontSize:18,
                      fontFamily:"monospace", letterSpacing:4, outline:"none",
                      boxSizing:"border-box", textAlign:"center" }}/>
                  <button disabled={codeInput.length!==6 || confirmerMut.isPending}
                    onClick={() => confirmerMut.mutate({ id:m.id, code:codeInput })}
                    style={{ padding:"10px 20px", borderRadius:9,
                      background:codeInput.length===6?`linear-gradient(135deg,${C.green},${C.teal})`:C.hover,
                      border:"none", color:"#fff", cursor:codeInput.length===6?"pointer":"not-allowed",
                      fontSize:13, fontWeight:700, fontFamily:"inherit" }}>
                    ✅ Confirmer
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// PAGE LIVREUR — Missions disponibles + gestion
// ════════════════════════════════════════════════════════════════════
export function PageMissionsLivreur() {
  const [tab, setTab] = useState("disponibles");
  const qc = useQueryClient();

  const { data: disponibles, isLoading: loadDisp, refetch: refetchDisp } = useQuery({
    queryKey: ["livreur-missions-dispo"],
    queryFn: () => api.get("/livraison/missions?statut=publiee").then(r => r.data || []),
    staleTime: 0,
    refetchInterval: 20000,
  });

  const { data: mesMissions, isLoading: loadMes, refetch: refetchMes } = useQuery({
    queryKey: ["livreur-mes-missions"],
    queryFn: () => api.get("/livraison/missions").then(r => r.data || []),
    staleTime: 0,
  });

  const accepterMut = useMutation({
    mutationFn: id => api.post(`/livraison/missions/${id}/accepter`, {}),
    onSuccess: () => { toast.success("✅ Mission acceptée ! Allez récupérer le colis."); qc.invalidateQueries(["livreur-missions-dispo"]); qc.invalidateQueries(["livreur-mes-missions"]); setTab("mes-missions"); },
    onError: e => toast.error(e?.message || "Mission déjà prise"),
  });

  const statutMut = useMutation({
    mutationFn: ({ id, statut, notes }) => api.patch(`/livraison/missions/${id}/statut`, { statut, notes }),
    onSuccess: () => { toast.success("Statut mis à jour !"); qc.invalidateQueries(["livreur-mes-missions"]); },
    onError: () => toast.error("Erreur"),
  });

  const NEXT_STATUT = {
    acceptee:         { next:"retrait_confirme", label:"📦 Confirmer retrait colis",   color:C.purple },
    retrait_confirme: { next:"en_route",         label:"🚀 Démarrer la livraison",     color:C.teal   },
    en_route:         { next:"livree",           label:"✅ Confirmer livraison",        color:C.green  },
  };

  const TABS = [
    { k:"disponibles",  label:`🔍 Disponibles (${(disponibles||[]).length})` },
    { k:"mes-missions", label:`🛵 Mes missions (${(mesMissions||[]).length})` },
  ];

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <h2 style={{ fontSize:18, fontWeight:800, color:C.text, margin:0 }}>🛵 Missions livraison</h2>
        <button onClick={()=>{ refetchDisp(); refetchMes(); }}
          style={{ padding:"7px 14px", borderRadius:9, background:C.hover,
            border:`1.5px solid ${C.border}`, color:C.muted, cursor:"pointer",
            fontSize:12, fontFamily:"inherit" }}>🔄</button>
      </div>

      {/* Stats livreur */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:20 }}>
        {[
          { label:"Disponibles", value:(disponibles||[]).length, icon:"🔍", color:C.amber },
          { label:"En cours",    value:(mesMissions||[]).filter(m=>['acceptee','retrait_confirme','en_route'].includes(m.statut)).length, icon:"🛵", color:C.teal },
          { label:"Livrées",     value:(mesMissions||[]).filter(m=>m.statut==='livree').length, icon:"✅", color:C.green },
        ].map(s => (
          <div key={s.label} style={{ background:C.input, border:`1px solid ${C.border}`,
            borderRadius:12, padding:"14px", textAlign:"center" }}>
            <div style={{ fontSize:24, marginBottom:4 }}>{s.icon}</div>
            <div style={{ fontSize:22, fontWeight:900, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:11, color:C.muted }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Revenus */}
      <div style={{ background:`linear-gradient(135deg,${C.green},${C.teal})`,
        borderRadius:12, padding:"14px 20px", marginBottom:20,
        display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ color:"rgba(255,255,255,.8)", fontSize:13 }}>💰 Revenus potentiels</div>
        <div style={{ fontSize:20, fontWeight:900, color:"#fff" }}>
          {fmt((mesMissions||[]).filter(m=>m.statut==='livree').length * 1500)} FCFA
        </div>
      </div>

      {/* Onglets */}
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        {TABS.map(t => (
          <button key={t.k} onClick={()=>setTab(t.k)}
            style={{ padding:"8px 16px", borderRadius:99, fontSize:12, fontWeight:700,
              cursor:"pointer", border:"none", fontFamily:"inherit",
              background: tab===t.k ? `linear-gradient(135deg,${C.green},${C.teal})` : C.hover,
              color: tab===t.k ? "#fff" : C.muted }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Missions disponibles */}
      {tab === "disponibles" && (
        <div>
          {loadDisp && <div style={{ textAlign:"center", padding:32, color:C.dim }}>⏳</div>}
          {!loadDisp && (disponibles||[]).length === 0 && (
            <div style={{ textAlign:"center", padding:"32px 20px" }}>
              <div style={{ fontSize:40, marginBottom:8 }}>🔍</div>
              <div style={{ color:C.muted }}>Aucune mission disponible</div>
              <div style={{ fontSize:12, color:C.dim, marginTop:4 }}>Revenez dans quelques minutes</div>
            </div>
          )}
          {(disponibles||[]).map(m => (
            <div key={m.id} style={{ background:C.input, border:`2px solid ${C.amber}30`,
              borderRadius:14, padding:18, marginBottom:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:800, color:C.text }}>{m.reference}</div>
                  <div style={{ fontSize:11, color:C.muted }}>
                    {new Date(m.created_at).toLocaleTimeString("fr-CI",{hour:"2-digit",minute:"2-digit"})}
                  </div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:18, fontWeight:900, color:C.green }}>1 500 FCFA</div>
                  <div style={{ fontSize:10, color:C.dim }}>votre part</div>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
                <div style={{ background:C.hover, borderRadius:8, padding:"8px 10px" }}>
                  <div style={{ fontSize:10, color:C.dim, fontWeight:700, textTransform:"uppercase", marginBottom:2 }}>📍 Retrait</div>
                  <div style={{ fontSize:12, color:C.text }}>{m.pharmacie_nom||"Pharmacie"}</div>
                  <div style={{ fontSize:11, color:C.muted }}>{m.adresse_retrait||m.ville||"—"}</div>
                </div>
                <div style={{ background:C.hover, borderRadius:8, padding:"8px 10px" }}>
                  <div style={{ fontSize:10, color:C.dim, fontWeight:700, textTransform:"uppercase", marginBottom:2 }}>🏠 Livraison</div>
                  <div style={{ fontSize:12, color:C.text }}>{m.quartier||m.ville||"—"}</div>
                  <div style={{ fontSize:11, color:C.muted }}>{m.adresse_livraison||"—"}</div>
                </div>
              </div>
              <button disabled={accepterMut.isPending}
                onClick={() => accepterMut.mutate(m.id)}
                style={{ width:"100%", padding:"12px", borderRadius:10,
                  background:`linear-gradient(135deg,${C.green},${C.teal})`,
                  border:"none", color:"#fff", cursor:accepterMut.isPending?"not-allowed":"pointer",
                  fontSize:14, fontWeight:800, fontFamily:"inherit",
                  opacity:accepterMut.isPending?.65:1,
                  boxShadow:"0 4px 16px rgba(10,143,88,.3)" }}>
                {accepterMut.isPending ? "⏳…" : "🛵 Accepter cette mission — 1 500 FCFA"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Mes missions en cours */}
      {tab === "mes-missions" && (
        <div>
          {loadMes && <div style={{ textAlign:"center", padding:32, color:C.dim }}>⏳</div>}
          {(mesMissions||[]).map(m => {
            const st = STATUT_CONFIG[m.statut] || STATUT_CONFIG.publiee;
            const next = NEXT_STATUT[m.statut];
            return (
              <div key={m.id} style={{ background:C.input, border:`1.5px solid ${C.border}`,
                borderRadius:14, padding:18, marginBottom:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:800, color:C.text }}>{m.reference}</div>
                    <div style={{ fontSize:11, color:C.muted }}>
                      Patient: {m.patient_prenom} {m.patient_nom}
                    </div>
                  </div>
                  <span style={{ background:st.color+"20", color:st.color,
                    fontSize:11, fontWeight:700, padding:"4px 12px", borderRadius:20 }}>
                    {st.icon} {st.label}
                  </span>
                </div>

                <ProgressBar statut={m.statut} />

                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
                  <div style={{ background:C.hover, borderRadius:8, padding:"8px 10px" }}>
                    <div style={{ fontSize:10, color:C.dim, fontWeight:700, textTransform:"uppercase" }}>📍 Pharmacie</div>
                    <div style={{ fontSize:12, color:C.text }}>{m.pharmacie_nom||"—"}</div>
                    {m.pharmacie_tel&&<a href={`tel:${m.pharmacie_tel}`} style={{ fontSize:11, color:C.green, textDecoration:"none" }}>📞 {m.pharmacie_tel}</a>}
                  </div>
                  <div style={{ background:C.hover, borderRadius:8, padding:"8px 10px" }}>
                    <div style={{ fontSize:10, color:C.dim, fontWeight:700, textTransform:"uppercase" }}>🏠 Patient</div>
                    <div style={{ fontSize:12, color:C.text }}>{m.adresse_livraison||"—"}</div>
                    {m.patient_tel&&<a href={`tel:${m.patient_tel}`} style={{ fontSize:11, color:C.green, textDecoration:"none" }}>📞 {m.patient_tel}</a>}
                  </div>
                </div>

                {/* Code confirmation à donner au patient */}
                {m.statut === 'en_route' && m.code_confirmation && (
                  <div style={{ background:"rgba(124,58,237,.08)", border:"1px solid rgba(124,58,237,.2)",
                    borderRadius:10, padding:"12px 16px", marginBottom:12, textAlign:"center" }}>
                    <div style={{ fontSize:11, color:C.muted, marginBottom:6 }}>🔑 Code à donner au patient</div>
                    <div style={{ fontSize:28, fontWeight:900, color:C.purple, letterSpacing:6 }}>
                      {m.code_confirmation}
                    </div>
                  </div>
                )}

                {next && (
                  <button onClick={() => statutMut.mutate({ id:m.id, statut:next.next })}
                    disabled={statutMut.isPending}
                    style={{ width:"100%", padding:"11px", borderRadius:10,
                      background:`linear-gradient(135deg,${next.color},${next.color}CC)`,
                      border:"none", color:"#fff", cursor:"pointer",
                      fontSize:13, fontWeight:700, fontFamily:"inherit" }}>
                    {next.label}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// PAGE PHARMACIE — Publier mission + suivi livreurs
// ════════════════════════════════════════════════════════════════════
export function PageLivraisonPharmacie() {
  const [showPublier, setShowPublier] = useState(null); // commande_id
  const [adresseLiv, setAdresseLiv] = useState("");
  const [quartier, setQuartier] = useState("");
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["pharmacie-missions"],
    queryFn: () => api.get("/livraison/missions").then(r => r.data || []),
    staleTime: 0,
  });

  // Commandes payées sans mission de livraison
  const { data: cmdPayees } = useQuery({
    queryKey: ["pharmacie-cmds-payees"],
    queryFn: () => api.get("/pharmacie/commandes?statut=paye").then(r => r.data || []),
    staleTime: 0,
  });

  const publierMut = useMutation({
    mutationFn: d => api.post("/livraison/publier", d),
    onSuccess: () => {
      toast.success("🛵 Mission publiée — Livreurs notifiés !");
      qc.invalidateQueries(["pharmacie-missions"]);
      qc.invalidateQueries(["pharmacie-cmds-payees"]);
      setShowPublier(null);
    },
    onError: e => toast.error(e?.message || "Erreur"),
  });

  const missions = data || [];

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div>
          <h2 style={{ fontSize:18, fontWeight:800, color:C.text, margin:0 }}>🚚 Livraisons</h2>
          <div style={{ fontSize:12, color:C.muted, marginTop:3 }}>{missions.length} mission(s)</div>
        </div>
        <button onClick={refetch} style={{ padding:"7px 14px", borderRadius:9, background:C.hover,
          border:`1.5px solid ${C.border}`, color:C.muted, cursor:"pointer",
          fontSize:12, fontFamily:"inherit" }}>🔄</button>
      </div>

      {/* Commandes payées à expédier */}
      {(cmdPayees||[]).length > 0 && (
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.amber, marginBottom:10 }}>
            ⚠️ {cmdPayees.length} commande(s) payée(s) en attente d'expédition
          </div>
          {(cmdPayees||[]).map(cmd => (
            <div key={cmd.id} style={{ background:"rgba(217,119,6,.07)", border:"1px solid rgba(217,119,6,.2)",
              borderRadius:12, padding:14, marginBottom:8,
              display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{cmd.reference}</div>
                <div style={{ fontSize:11, color:C.muted }}>{cmd.patient_nom} · {fmt(cmd.montant_total)} FCFA</div>
              </div>
              <button onClick={() => setShowPublier(cmd.id)}
                style={{ padding:"8px 16px", borderRadius:9,
                  background:`linear-gradient(135deg,${C.green},${C.teal})`,
                  border:"none", color:"#fff", cursor:"pointer",
                  fontSize:12, fontWeight:700, fontFamily:"inherit" }}>
                🛵 Publier mission
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Liste missions */}
      {isLoading && <div style={{ textAlign:"center", padding:24, color:C.dim }}>⏳</div>}
      {missions.map(m => {
        const st = STATUT_CONFIG[m.statut] || STATUT_CONFIG.publiee;
        return (
          <div key={m.id} style={{ background:C.input, border:`1.5px solid ${C.border}`,
            borderRadius:12, padding:16, marginBottom:10 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
              <div>
                <div style={{ fontSize:13, fontWeight:800, color:C.text }}>{m.reference}</div>
                <div style={{ fontSize:11, color:C.muted }}>
                  {m.patient_prenom} {m.patient_nom}
                </div>
              </div>
              <span style={{ background:st.color+"20", color:st.color,
                fontSize:11, fontWeight:700, padding:"4px 10px", borderRadius:20 }}>
                {st.icon} {st.label}
              </span>
            </div>
            {m.livreur_prenom && (
              <div style={{ fontSize:12, color:C.muted }}>
                🛵 {m.livreur_prenom} {m.livreur_nom}
                {m.livreur_tel && <a href={`tel:${m.livreur_tel}`} style={{ color:C.green, marginLeft:8, textDecoration:"none" }}>📞</a>}
              </div>
            )}
          </div>
        );
      })}

      {/* Modal publier mission */}
      {showPublier && (
        <div onClick={()=>setShowPublier(null)} style={{ position:"fixed", inset:0,
          background:"rgba(0,0,0,.8)", display:"flex", alignItems:"center",
          justifyContent:"center", zIndex:1000, padding:16 }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:C.card,
            border:`1px solid ${C.border}`, borderRadius:18, width:480, maxWidth:"95vw", padding:28 }}>
            <h3 style={{ fontSize:16, fontWeight:800, color:C.text, marginBottom:16 }}>
              🛵 Publier une mission de livraison
            </h3>
            <div style={{ background:"rgba(10,143,88,.08)", border:"1px solid rgba(10,143,88,.2)",
              borderRadius:8, padding:"10px 14px", marginBottom:16, fontSize:12, color:C.muted }}>
              Frais de livraison : <strong style={{color:C.text}}>2 000 FCFA</strong>
              (1 500 livreur + 500 MediConnect) — à payer par le patient
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:700, color:C.muted,
                textTransform:"uppercase", marginBottom:6 }}>Adresse de livraison patient</label>
              <input value={adresseLiv} onChange={e=>setAdresseLiv(e.target.value)}
                placeholder="Ex: Cocody, Angré 8ème tranche…"
                style={{ width:"100%", background:C.hover, border:`1.5px solid ${C.border}`,
                  borderRadius:9, padding:"10px 14px", color:C.text, fontSize:14,
                  outline:"none", fontFamily:"inherit", boxSizing:"border-box" }}/>
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:700, color:C.muted,
                textTransform:"uppercase", marginBottom:6 }}>Quartier</label>
              <input value={quartier} onChange={e=>setQuartier(e.target.value)}
                placeholder="Ex: Cocody, Yopougon, Plateau…"
                style={{ width:"100%", background:C.hover, border:`1.5px solid ${C.border}`,
                  borderRadius:9, padding:"10px 14px", color:C.text, fontSize:14,
                  outline:"none", fontFamily:"inherit", boxSizing:"border-box" }}/>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>setShowPublier(null)}
                style={{ flex:1, padding:"11px", borderRadius:9, background:"transparent",
                  border:`1.5px solid ${C.border}`, color:C.muted, cursor:"pointer",
                  fontSize:13, fontWeight:700, fontFamily:"inherit" }}>Annuler</button>
              <button disabled={publierMut.isPending}
                onClick={() => publierMut.mutate({
                  commande_id: showPublier,
                  adresse_retrait: "Pharmacie partenaire MediConnect",
                  adresse_livraison: adresseLiv,
                  ville: "Abidjan",
                  quartier: quartier,
                })}
                style={{ flex:2, padding:"11px", borderRadius:9,
                  background:`linear-gradient(135deg,${C.green},${C.teal})`,
                  border:"none", color:"#fff", cursor:"pointer",
                  fontSize:13, fontWeight:700, fontFamily:"inherit",
                  opacity:publierMut.isPending?.65:1 }}>
                {publierMut.isPending ? "⏳…" : "🛵 Publier — Notifier les livreurs"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
