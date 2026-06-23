/**
 * PagePharmacie.jsx — Page pharmacie pour le dashboard patient
 * 
 * Workflow :
 * 1. Patient clique "💊 Pharmacie" sur une ordonnance
 * 2. Sélectionne une pharmacie
 * 3. Envoie la commande
 * 4. Reçoit le devis avec prix
 * 5. Paie via AdjeminPay (Orange/MTN/Wave/Carte)
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

const STATUT_COLORS = {
  en_attente:     { color:C.amber,  bg:"rgba(217,119,6,.15)",   label:"En attente" },
  devis_envoye:   { color:C.blue,   bg:"rgba(37,99,235,.15)",   label:"Devis reçu" },
  paiement_initie:{ color:C.purple, bg:"rgba(124,58,237,.15)",  label:"Paiement en cours" },
  paye:           { color:C.green,  bg:"rgba(10,143,88,.15)",   label:"Payé" },
  en_preparation: { color:C.teal,   bg:"rgba(13,148,136,.15)",  label:"En préparation" },
  pret:           { color:C.green,  bg:"rgba(10,143,88,.15)",   label:"Prêt à retirer" },
  livre:          { color:C.green,  bg:"rgba(10,143,88,.15)",   label:"Livré" },
  annule:         { color:C.red,    bg:"rgba(225,29,72,.15)",   label:"Annulé" },
};

// ── Modal envoi ordonnance à pharmacie ──────────────────────────────────────
export function ModalEnvoiPharmacie({ ordonnance, onClose, onSuccess }) {
  const [step, setStep] = useState(1); // 1=sélection pharmacie, 2=confirmation
  const [pharmacieId, setPharmacieId] = useState(null);
  const [pharmacieNom, setPharmacieNom] = useState("");
  const [notes, setNotes] = useState("");
  const [gps, setGps] = useState(null); // {lat, lng, adresse}
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState("");

  const demanderGPS = () => {
    if (!navigator.geolocation) { setGpsError("Géolocalisation non supportée"); return; }
    setGpsLoading(true); setGpsError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude, lng = pos.coords.longitude;
        // Reverse geocoding via nominatim (gratuit)
        let adresse = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
          const d = await r.json();
          adresse = d.display_name?.split(",").slice(0,3).join(",") || adresse;
        } catch(e) {}
        setGps({ lat, lng, adresse });
        setGpsLoading(false);
      },
      (err) => { setGpsError("Position refusée — entrez l'adresse manuellement"); setGpsLoading(false); },
      { timeout:10000, maximumAge:60000 }
    );
  };
  const qc = useQueryClient();

  const { data: pharmacies, isLoading } = useQuery({
    queryKey: ["pharmacies-liste"],
    queryFn: () => api.get("/pharmacie/liste").then(r => r.data || []),
  });

  const envoyerMut = useMutation({
    mutationFn: d => api.post("/pharmacie/commander", d),
    onSuccess: (data) => {
      toast.success(`✅ Commande ${data.data?.reference} envoyée !`);
      qc.invalidateQueries(["mes-commandes-pharmacie"]);
      onSuccess && onSuccess(data.data);
      onClose();
    },
    onError: e => toast.error("Erreur: " + (e?.message||"Réessayez")),
  });

  const meds = ordonnance?.medicament?.split("\n").filter(m=>m.trim()) || [];

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.8)",
      display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:C.card,
        border:`1px solid ${C.border}`, borderRadius:18, width:520, maxWidth:"95vw",
        maxHeight:"90vh", overflowY:"auto" }}>

        {/* Header */}
        <div style={{ background:`linear-gradient(135deg,${C.green},${C.teal})`,
          borderRadius:"18px 18px 0 0", padding:"20px 24px",
          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,.7)", marginBottom:3 }}>
              💊 Commande médicaments
            </div>
            <div style={{ fontSize:18, fontWeight:800, color:"#fff" }}>
              {meds.length} médicament{meds.length>1?"s":""} à commander
            </div>
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,.2)",
            border:"none", borderRadius:"50%", width:32, height:32,
            color:"#fff", cursor:"pointer", fontSize:18 }}>✕</button>
        </div>

        <div style={{ padding:24 }}>
          {/* Récap ordonnance */}
          <div style={{ background:C.input, border:`1px solid ${C.border}`,
            borderRadius:12, padding:14, marginBottom:20 }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.muted,
              textTransform:"uppercase", marginBottom:10 }}>Médicaments de l'ordonnance</div>
            {meds.map((m,i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:8,
                padding:"6px 0", borderBottom: i<meds.length-1?`1px solid ${C.border}`:"none" }}>
                <span style={{ background:C.green, color:"#fff", borderRadius:"50%",
                  width:20, height:20, display:"flex", alignItems:"center",
                  justifyContent:"center", fontSize:11, fontWeight:700, flexShrink:0 }}>
                  {i+1}
                </span>
                <span style={{ fontSize:13, color:C.text }}>{m}</span>
              </div>
            ))}
          </div>

          {step === 1 && (
            <>
              <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:12 }}>
                Sélectionnez une pharmacie partenaire
              </div>
              {isLoading ? (
                <div style={{ textAlign:"center", padding:20, color:C.dim }}>⏳ Chargement…</div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:16 }}>
                  {(pharmacies||[]).length === 0 ? (
                    <div style={{ textAlign:"center", padding:20, color:C.dim }}>
                      <div style={{ fontSize:32, marginBottom:8 }}>🏥</div>
                      <div>Aucune pharmacie partenaire disponible</div>
                    </div>
                  ) : (pharmacies||[]).map(ph => (
                    <button key={ph.id} onClick={() => { setPharmacieId(ph.id); setPharmacieNom(ph.nom); }}
                      style={{ background: pharmacieId===ph.id ? "rgba(10,143,88,.1)" : C.hover,
                        border:`2px solid ${pharmacieId===ph.id ? C.green : C.border}`,
                        borderRadius:12, padding:"12px 14px", cursor:"pointer",
                        textAlign:"left", fontFamily:"inherit", transition:"all .15s" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <span style={{ fontSize:24 }}>💊</span>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{ph.nom}</div>
                          <div style={{ fontSize:11, color:C.muted }}>
                            📍 {ph.ville||"—"} · 📞 {ph.telephone||"—"}
                          </div>
                        </div>
                        {pharmacieId===ph.id && <span style={{ color:C.green }}>✓</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Géolocalisation */}
              <div style={{ marginBottom:16 }}>
                <label style={{ display:"block", fontSize:11, fontWeight:700, color:C.muted,
                  textTransform:"uppercase", marginBottom:8 }}>📍 Votre position de livraison</label>
                {!gps ? (
                  <div>
                    <button onClick={demanderGPS} disabled={gpsLoading}
                      style={{ width:"100%", padding:"11px", borderRadius:10,
                        background:gpsLoading?"rgba(13,148,136,.1)":`linear-gradient(135deg,${C.teal},${C.blue})`,
                        border:`1.5px solid ${C.teal}`, color:gpsLoading?C.muted:"#fff",
                        cursor:gpsLoading?"not-allowed":"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit" }}>
                      {gpsLoading ? "⏳ Localisation en cours…" : "📍 Partager ma position GPS"}
                    </button>
                    {gpsError && <div style={{ fontSize:11, color:C.amber, marginTop:6 }}>{gpsError}</div>}
                    <div style={{ fontSize:10, color:C.dim, marginTop:4 }}>
                      Permet au livreur de vous retrouver facilement
                    </div>
                  </div>
                ) : (
                  <div style={{ background:"rgba(13,148,136,.08)", border:"1px solid rgba(13,148,136,.2)",
                    borderRadius:9, padding:"10px 14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color:C.teal }}>✅ Position partagée</div>
                      <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{gps.adresse}</div>
                    </div>
                    <button onClick={()=>setGps(null)} style={{ background:"none", border:"none",
                      color:C.dim, cursor:"pointer", fontSize:16 }}>✕</button>
                  </div>
                )}
              </div>

              <div style={{ marginBottom:16 }}>
                <label style={{ display:"block", fontSize:11, fontWeight:700, color:C.muted,
                  textTransform:"uppercase", marginBottom:6 }}>Notes pour la pharmacie</label>
                <textarea value={notes} onChange={e=>setNotes(e.target.value)}
                  placeholder="Ex: Médicaments génériques acceptés, livraison souhaitée…"
                  rows={2} style={{ width:"100%", background:C.hover,
                    border:`1.5px solid ${C.border}`, borderRadius:9, padding:"10px 14px",
                    color:C.text, fontSize:14, resize:"none", outline:"none",
                    fontFamily:"inherit", boxSizing:"border-box" }}/>
              </div>

              <div style={{ display:"flex", gap:10 }}>
                <button onClick={onClose} style={{ flex:1, padding:"11px", borderRadius:9,
                  background:"transparent", border:`1.5px solid ${C.border}`, color:C.muted,
                  cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit" }}>
                  Annuler
                </button>
                <button disabled={!pharmacieId} onClick={() => setStep(2)}
                  style={{ flex:2, padding:"11px", borderRadius:9,
                    background: pharmacieId ? `linear-gradient(135deg,${C.green},${C.teal})` : C.hover,
                    border:"none", color:"#fff", cursor:pharmacieId?"pointer":"not-allowed",
                    fontSize:13, fontWeight:700, fontFamily:"inherit", opacity:pharmacieId?1:.5 }}>
                  Continuer → Pharmacie {pharmacieNom}
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div style={{ background:"rgba(10,143,88,.08)", border:"1px solid rgba(10,143,88,.2)",
                borderRadius:10, padding:"12px 16px", marginBottom:20, fontSize:13 }}>
                <div style={{ fontWeight:700, color:C.text, marginBottom:4 }}>
                  📍 Pharmacie sélectionnée : {pharmacieNom}
                </div>
                <div style={{ color:C.muted, fontSize:12 }}>
                  La pharmacie recevra votre ordonnance et vous enverra un devis avec les prix avant que vous payiez.
                </div>
              </div>

              <div style={{ background:"rgba(217,119,6,.07)", border:"1px solid rgba(217,119,6,.2)",
                borderRadius:8, padding:"10px 14px", marginBottom:20, fontSize:12, color:C.muted }}>
                ⚠️ Vous ne serez débité qu'après réception et validation du devis.
              </div>

              <div style={{ display:"flex", gap:10 }}>
                <button onClick={() => setStep(1)} style={{ flex:1, padding:"11px", borderRadius:9,
                  background:"transparent", border:`1.5px solid ${C.border}`, color:C.muted,
                  cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit" }}>
                  ← Retour
                </button>
                <button disabled={envoyerMut.isPending} onClick={() => envoyerMut.mutate({
                  ordonnance_id: ordonnance.id,
                  pharmacie_id: pharmacieId,
                  notes_patient: notes || null,
                  lat_patient: gps?.lat || null,
                  lng_patient: gps?.lng || null,
                  adresse_patient: gps?.adresse || null,
                })} style={{ flex:2, padding:"11px", borderRadius:9,
                  background:`linear-gradient(135deg,${C.green},${C.teal})`,
                  border:"none", color:"#fff", cursor:envoyerMut.isPending?"not-allowed":"pointer",
                  fontSize:13, fontWeight:700, fontFamily:"inherit",
                  opacity:envoyerMut.isPending?.65:1 }}>
                  {envoyerMut.isPending ? "⏳ Envoi…" : "✅ Confirmer la commande"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Modal paiement MobilePay CI ─────────────────────────────────────────────
// MobilePay CI : https://www.mobilepay-ci.com/ — AdjeminPay intégré
const MOBILEPAY_URL = "https://www.mobilepay-ci.com/pay"; // URL page paiement

export function ModalPaiement({ commande, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();

  const initierPaiement = async () => {
    setLoading(true);
    try {
      // Enregistrer le paiement côté MediConnect
      const r = await api.post(`/pharmacie/commandes/${commande.id}/payer`, {
        methode: "mobilepay_ci",
      });
      if (r.success) {
        qc.invalidateQueries(["mes-commandes-pharmacie"]);
        // Construire l'URL MobilePay CI avec les paramètres de la commande
        const params = new URLSearchParams({
          amount:      commande.montant_total,
          currency:    "XOF",
          reference:   commande.reference,
          description: `Commande médicaments MediConnect — ${commande.reference}`,
          callback_url: `https://mediconnect-backend-v2.vercel.app/api/pharmacie/webhook`,
          return_url:   `https://mediconnect4africa.cloud/patient/pharmacie`,
          customer_name: commande.patient_nom || "Patient",
        });
        // Ouvrir MobilePay CI dans un nouvel onglet
        window.open(`${MOBILEPAY_URL}?${params.toString()}`, '_blank');
        toast.success("✅ Redirection vers MobilePay CI...");
        onSuccess && onSuccess();
        onClose();
      }
    } catch(e) {
      toast.error("Erreur initialisation paiement");
    }
    setLoading(false);
  };

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.85)",
      display:"flex", alignItems:"center", justifyContent:"center", zIndex:1001, padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:C.card,
        border:`1px solid ${C.border}`, borderRadius:18, width:440, maxWidth:"95vw" }}>

        {/* Header */}
        <div style={{ background:"linear-gradient(135deg,#0A8F58,#0D9488)",
          borderRadius:"18px 18px 0 0", padding:"20px 24px",
          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,.7)", marginBottom:3 }}>
              💳 Paiement sécurisé via MobilePay CI
            </div>
            <div style={{ fontSize:24, fontWeight:900, color:"#fff" }}>
              {fmt(commande.montant_total)} FCFA
            </div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,.6)" }}>
              Commande {commande.reference}
            </div>
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,.2)",
            border:"none", borderRadius:"50%", width:32, height:32,
            color:"#fff", cursor:"pointer", fontSize:18 }}>✕</button>
        </div>

        <div style={{ padding:24 }}>
          {/* Logo MobilePay + moyens de paiement */}
          <div style={{ textAlign:"center", marginBottom:20 }}>
            <div style={{ fontSize:22, fontWeight:900, color:C.text, marginBottom:4 }}>
              Mobile<span style={{ color:C.green }}>Pay</span> CI
            </div>
            <div style={{ fontSize:12, color:C.muted, marginBottom:16 }}>
              Plateforme de paiement sécurisée pour l'Afrique de l'Ouest
            </div>
            {/* Icônes moyens de paiement */}
            <div style={{ display:"flex", justifyContent:"center", gap:10, flexWrap:"wrap" }}>
              {[
                { label:"Orange Money", color:"#FF6600", icon:"🟠" },
                { label:"MTN MoMo",    color:"#FFCC00", icon:"🟡" },
                { label:"Wave",        color:"#1DA6F2", icon:"🌊" },
                { label:"Moov",        color:"#0066CC", icon:"🔵" },
                { label:"Visa",        color:"#1A1F71", icon:"💳" },
                { label:"Mastercard",  color:"#EB001B", icon:"💳" },
              ].map(m => (
                <div key={m.label} style={{ padding:"6px 10px", borderRadius:8,
                  background:m.color+"15", border:`1px solid ${m.color}30`,
                  fontSize:11, color:m.color, fontWeight:700 }}>
                  {m.icon} {m.label}
                </div>
              ))}
            </div>
          </div>

          {/* Détail commande */}
          <div style={{ background:C.input, border:`1px solid ${C.border}`,
            borderRadius:10, padding:14, marginBottom:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between",
              marginBottom:8, fontSize:12 }}>
              <span style={{ color:C.muted }}>Référence</span>
              <span style={{ color:C.text, fontWeight:700 }}>{commande.reference}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between",
              marginBottom:8, fontSize:12 }}>
              <span style={{ color:C.muted }}>Pharmacie</span>
              <span style={{ color:C.text }}>{commande.pharmacie_nom||"—"}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between",
              paddingTop:8, borderTop:`1px solid ${C.border}`, fontSize:15 }}>
              <span style={{ color:C.muted, fontWeight:700 }}>TOTAL</span>
              <span style={{ color:C.green, fontWeight:900 }}>{fmt(commande.montant_total)} FCFA</span>
            </div>
          </div>

          {/* Sécurité */}
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:20,
            padding:"8px 12px", background:"rgba(10,143,88,.06)",
            border:"1px solid rgba(10,143,88,.15)", borderRadius:8 }}>
            <span>🔒</span>
            <span style={{ fontSize:11, color:C.muted }}>
              Paiement sécurisé — Données cryptées — Aucune information bancaire stockée
            </span>
          </div>

          {/* Bouton payer */}
          <button disabled={loading} onClick={initierPaiement}
            style={{ width:"100%", padding:"14px", borderRadius:12,
              background:`linear-gradient(135deg,${C.green},${C.teal})`,
              border:"none", color:"#fff",
              cursor:loading?"not-allowed":"pointer",
              fontSize:15, fontWeight:800, fontFamily:"inherit",
              opacity:loading?.65:1, boxShadow:"0 8px 24px rgba(10,143,88,.3)" }}>
            {loading ? "⏳ Initialisation…" : `💳 Payer via MobilePay CI — ${fmt(commande.montant_total)} FCFA`}
          </button>

          <div style={{ textAlign:"center", marginTop:12, fontSize:11, color:C.dim }}>
            Vous serez redirigé vers <strong>mobilepay-ci.com</strong> pour finaliser le paiement
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page Mes commandes pharmacie (dans dashboard patient) ───────────────────
export function PageMesCommandesPharmacie() {
  const [selected, setSelected] = useState(null);
  const [showPaiement, setShowPaiement] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["mes-commandes-pharmacie"],
    queryFn: () => api.get("/pharmacie/mes-commandes").then(r => r.data || []),
    staleTime: 0,
  });

  const commandes = data || [];

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div>
          <h2 style={{ fontSize:18, fontWeight:800, color:C.text, margin:0 }}>💊 Mes commandes pharmacie</h2>
          <div style={{ fontSize:12, color:C.muted, marginTop:3 }}>{commandes.length} commande(s)</div>
        </div>
        <button onClick={refetch} style={{ padding:"7px 14px", borderRadius:9,
          background:C.hover, border:`1.5px solid ${C.border}`, color:C.muted,
          cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>🔄 Actualiser</button>
      </div>

      {isLoading && <div style={{ textAlign:"center", padding:32, color:C.dim }}>⏳ Chargement…</div>}

      {!isLoading && commandes.length === 0 && (
        <div style={{ textAlign:"center", padding:"48px 20px" }}>
          <div style={{ fontSize:48, marginBottom:12 }}>💊</div>
          <div style={{ fontSize:16, fontWeight:700, color:C.muted, marginBottom:6 }}>
            Aucune commande en cours
          </div>
          <div style={{ fontSize:13, color:C.dim }}>
            Cliquez sur "💊 Pharmacie" sur une ordonnance pour commander vos médicaments
          </div>
        </div>
      )}

      {commandes.map(cmd => {
        const st = STATUT_COLORS[cmd.statut] || STATUT_COLORS.en_attente;
        return (
          <div key={cmd.id} style={{ background:C.input, border:`1.5px solid ${C.border}`,
            borderRadius:14, padding:18, marginBottom:12, cursor:"pointer",
            transition:"border-color .15s" }}
            onClick={() => setSelected(selected?.id===cmd.id ? null : cmd)}
            onMouseOver={e=>e.currentTarget.style.borderColor=C.green}
            onMouseOut={e=>e.currentTarget.style.borderColor=C.border}>

            {/* Header commande */}
            <div style={{ display:"flex", justifyContent:"space-between",
              alignItems:"flex-start", marginBottom:10 }}>
              <div>
                <div style={{ fontSize:14, fontWeight:800, color:C.text }}>
                  {cmd.pharmacie_nom || "Pharmacie"} 💊
                </div>
                <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>
                  📋 {cmd.reference} · {new Date(cmd.created_at).toLocaleDateString("fr-CI",{day:"numeric",month:"short",year:"numeric"})}
                </div>
              </div>
              <span style={{ background:st.bg, color:st.color,
                fontSize:11, fontWeight:700, padding:"4px 12px", borderRadius:20 }}>
                {st.label}
              </span>
            </div>

            {/* Médicaments */}
            <div style={{ marginBottom:10 }}>
              {(cmd.lignes||[]).slice(0,3).map((l,i) => (
                <div key={i} style={{ fontSize:12, color:C.muted, marginBottom:2 }}>
                  • {l.medicament?.slice(0,50)}
                  {l.prix_unitaire ? <span style={{ color:C.green, fontWeight:700 }}>
                    {" "}— {fmt(l.prix_unitaire)} F
                  </span> : null}
                </div>
              ))}
              {(cmd.lignes||[]).length > 3 && (
                <div style={{ fontSize:11, color:C.dim }}>
                  +{cmd.lignes.length-3} autre(s)…
                </div>
              )}
            </div>

            {/* Total + actions */}
            {cmd.montant_total && (
              <div style={{ display:"flex", justifyContent:"space-between",
                alignItems:"center", paddingTop:10,
                borderTop:`1px solid ${C.border}` }}>
                <div style={{ fontSize:18, fontWeight:900, color:C.green }}>
                  {fmt(cmd.montant_total)} FCFA
                </div>
                {cmd.statut === "devis_envoye" && (
                  <button onClick={e => { e.stopPropagation(); setSelected(cmd); setShowPaiement(true); }}
                    style={{ padding:"9px 20px", borderRadius:9,
                      background:"linear-gradient(135deg,#1E1B4B,#4F46E5)",
                      border:"none", color:"#fff", cursor:"pointer",
                      fontSize:13, fontWeight:700, fontFamily:"inherit" }}>
                    💳 Payer maintenant
                  </button>
                )}
              </div>
            )}

            {/* Détail dévis */}
            {selected?.id === cmd.id && cmd.statut === "devis_envoye" && (
              <div style={{ marginTop:14, padding:14,
                background:C.hover, borderRadius:10,
                border:`1px solid ${C.border}` }} onClick={e=>e.stopPropagation()}>
                <div style={{ fontSize:12, fontWeight:700, color:C.text, marginBottom:10 }}>
                  📋 Détail du devis
                </div>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                  <thead>
                    <tr style={{ borderBottom:`1px solid ${C.border}` }}>
                      {["Médicament","Qté","Prix unit.","Total"].map(h => (
                        <th key={h} style={{ textAlign:"left", padding:"4px 8px",
                          color:C.dim, fontWeight:700, fontSize:10,
                          textTransform:"uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(cmd.lignes||[]).map((l,i) => (
                      <tr key={i} style={{ borderBottom:`1px solid ${C.border}` }}>
                        <td style={{ padding:"6px 8px", color:C.text }}>{l.medicament?.slice(0,35)}</td>
                        <td style={{ padding:"6px 8px", color:C.muted }}>{l.quantite}</td>
                        <td style={{ padding:"6px 8px", color:C.muted }}>{fmt(l.prix_unitaire||0)} F</td>
                        <td style={{ padding:"6px 8px", color:C.green, fontWeight:700 }}>{fmt(l.prix_total||0)} F</td>
                      </tr>
                    ))}
                    <tr style={{ background:"rgba(10,143,88,.08)" }}>
                      <td colSpan={3} style={{ padding:"8px", fontWeight:700, color:C.text }}>TOTAL</td>
                      <td style={{ padding:"8px", fontWeight:900, color:C.green, fontSize:15 }}>
                        {fmt(cmd.montant_total)} F
                      </td>
                    </tr>
                  </tbody>
                </table>
                {cmd.notes_pharmacie && (
                  <div style={{ marginTop:10, padding:"8px 10px",
                    background:"rgba(217,119,6,.07)", borderRadius:8,
                    fontSize:12, color:C.muted }}>
                    💬 Note pharmacie : {cmd.notes_pharmacie}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {showPaiement && selected && (
        <ModalPaiement
          commande={selected}
          onClose={() => setShowPaiement(false)}
          onSuccess={() => { setShowPaiement(false); setSelected(null); refetch(); }}
        />
      )}
    </div>
  );
}
