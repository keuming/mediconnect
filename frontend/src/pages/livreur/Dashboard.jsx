import React, { useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import useAuthStore from "../../context/authStore";
import api from "../../services/api";
import { Card, Panel, ListItem, Grid, PageHeader, Badge, Loader, Empty, Btn } from "../../components/common/UI";

// ── Tarification livraison ────────────────────────────────────────
const TARIF = {
  LIVRAISON_TOTAL:      1500,   // FCFA — zone UEMOA & CEMAC
  LIVRAISON_LIVREUR:    1000,   // Part livreur
  LIVRAISON_MEDICONN:   500,    // Part MediConnect for Africa
};

const fmt = (n) => Number(n || 0).toLocaleString("fr-CI");
const livreurAPI = {
  commandes: () => api.get("/commandes"),
  updateCmd: (id, d) => api.put(`/commandes/${id}`, d),
  position:  (d) => api.put("/livreurs/position", d),
};

// ════════════════════════════════════════════════════════════════════
//  HOME
// ════════════════════════════════════════════════════════════════════
function DashboardHome() {
  const { user } = useAuthStore();
  const nav = useNavigate();
  const { data } = useQuery({ queryKey: ["liv-cmds"], queryFn: () => livreurAPI.commandes().then(r => r.data.data || []) });
  const cmds      = data || [];
  const enCours   = cmds.filter(c => c.statut === "en_cours");
  const enAttente = cmds.filter(c => ["confirmee","pret","en_attente"].includes(c.statut));
  const livrees   = cmds.filter(c => c.statut === "livree");
  const gainsJour = livrees.filter(c => new Date(c.updated_at).toDateString() === new Date().toDateString()).length * TARIF.LIVRAISON_LIVREUR;
  const gainsMois = livrees.length * TARIF.LIVRAISON_LIVREUR;

  return (
    <div>
      <PageHeader title={"\uD83D\uDEF5 Bonjour, " + user?.prenom + " !"} subtitle="Tableau de bord livreur — Zone UEMOA & CEMAC" />

      {/* Tarif info */}
      <div style={{ background:"rgba(10,143,88,.06)",border:"1px solid rgba(10,143,88,.2)",borderRadius:12,padding:"12px 18px",marginBottom:20,display:"flex",alignItems:"center",gap:12,fontSize:13 }}>
        <span style={{ fontSize:20 }}>ℹ️</span>
        <div>
          <span style={{ color:"#F0F4F8",fontWeight:700 }}>Tarif livraison fixe : {fmt(TARIF.LIVRAISON_TOTAL)} FCFA</span>
          <span style={{ color:"#8BA0B5",marginLeft:12 }}>Votre part : <strong style={{ color:"#0A8F58" }}>{fmt(TARIF.LIVRAISON_LIVREUR)} FCFA</strong> · MediConnect : {fmt(TARIF.LIVRAISON_MEDICONN)} FCFA</span>
        </div>
      </div>

      <Grid cols={4} gap={14} style={{ marginBottom:24 }}>
        <Card label="Missions dispo" value={enAttente.length} icon="📦" color="#D97706" sub="À accepter" />
        <Card label="En cours" value={enCours.length} icon="🛵" color="#0D9488" sub="Livraisons actives" />
        <Card label="Gains aujourd'hui" value={fmt(gainsJour)+" F"} icon="💵" color="#0A8F58" sub={"× "+fmt(TARIF.LIVRAISON_LIVREUR)+" F/livraison"} />
        <Card label="Gains ce mois" value={fmt(gainsMois)+" F"} icon="💰" color="#0A8F58" sub={livrees.length+" livraison(s)"} />
      </Grid>

      <Grid cols={2} gap={20}>
        <Panel title="📦 Missions disponibles" actions={<Btn variant="outline" style={{padding:"6px 14px",fontSize:12}} onClick={()=>nav("missions")}>Voir tout →</Btn>}>
          {enAttente.length === 0
            ? <Empty icon="📦" title="Aucune mission" subtitle="Revenez bientôt" />
            : enAttente.slice(0,4).map(c => (
              <ListItem key={c.id}
                left={<span style={{fontSize:22}}>📦</span>}
                center={<><div style={{fontSize:13,fontWeight:700,color:"#F0F4F8"}}>Cmd #{c.id?.slice(-6).toUpperCase()}</div><div style={{fontSize:11,color:"#8BA0B5"}}>📍 {c.adresse_livraison||"Adresse à confirmer"}</div></>}
                right={<><span style={{fontSize:13,fontWeight:800,color:"#0A8F58"}}>{fmt(TARIF.LIVRAISON_LIVREUR)} F</span><Badge color="amber">Dispo</Badge></>}
              />
            ))}
        </Panel>
        <Panel title="⚡ Accès rapide" accent="green">
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
            {[["📦","Missions","missions","#D97706"],["🛵","En cours","en-cours","#0D9488"],["📋","Historique","historique","#8BA0B5"],["💰","Mes gains","gains","#0A8F58"]].map(([icon,label,path,color]) => (
              <button key={path} onClick={()=>nav(path)} style={{background:"#1A2535",border:"1px solid #1E2F42",borderRadius:10,padding:"14px",cursor:"pointer",textAlign:"center",transition:"all .15s",fontFamily:"inherit"}}
                onMouseOver={e=>{e.currentTarget.style.borderColor=color;}} onMouseOut={e=>{e.currentTarget.style.borderColor="#1E2F42";}}>
                <div style={{fontSize:26,marginBottom:5}}>{icon}</div>
                <div style={{fontSize:12,color:"#F0F4F8",fontWeight:600}}>{label}</div>
              </button>
            ))}
          </div>
        </Panel>
        <Panel title="📍 Ma position GPS" accent="teal"><PositionGPS /></Panel>
        <Panel title="💳 Répartition des gains">
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12 }}>
            {[
              ["Votre part (67%)",fmt(TARIF.LIVRAISON_LIVREUR)+" F","#0A8F58"],
              ["MediConnect (33%)",fmt(TARIF.LIVRAISON_MEDICONN)+" F","#8BA0B5"],
            ].map(([l,v,c]) => (
              <div key={l} style={{background:"#1A2535",borderRadius:10,padding:"14px",textAlign:"center"}}>
                <div style={{fontSize:11,color:"#4E657A",marginBottom:6}}>{l}</div>
                <div style={{fontSize:20,fontWeight:800,color:c}}>{v}</div>
                <div style={{fontSize:10,color:"#4E657A",marginTop:3}}>par livraison</div>
              </div>
            ))}
          </div>
          <div style={{background:"rgba(10,143,88,.06)",border:"1px solid rgba(10,143,88,.15)",borderRadius:8,padding:"10px 14px",fontSize:12,color:"#8BA0B5"}}>
            Prix total livraison : <strong style={{color:"#F0F4F8"}}>{fmt(TARIF.LIVRAISON_TOTAL)} FCFA</strong> — Zone UEMOA & CEMAC
          </div>
        </Panel>
      </Grid>
    </div>
  );
}

function PositionGPS() {
  const [pos, setPos] = useState(null);
  const [loading, setLoading] = useState(false);
  const partager = () => {
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (gps) => { const {latitude,longitude} = gps.coords; setPos({latitude,longitude}); livreurAPI.position({latitude,longitude}).then(()=>toast.success("Position partagée !")).catch(()=>toast.error("Erreur GPS")).finally(()=>setLoading(false)); },
      () => { toast.error("GPS non disponible"); setLoading(false); }
    );
  };
  return (
    <div>
      <div style={{fontSize:13,color:"#8BA0B5",marginBottom:14,lineHeight:1.6}}>Partagez votre position pour que les clients suivent vos livraisons en temps réel.</div>
      {pos && <div style={{background:"rgba(13,148,136,.1)",border:"1px solid rgba(13,148,136,.25)",borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:12}}><div style={{color:"#0D9488",fontWeight:700,marginBottom:4}}>✅ Position active</div><div style={{color:"#8BA0B5"}}>Lat: {pos.latitude.toFixed(4)} · Lng: {pos.longitude.toFixed(4)}</div></div>}
      <Btn onClick={partager} loading={loading} variant="teal" style={{width:"100%"}}>{pos?"🔄 Actualiser":"📍 Partager ma position"}</Btn>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  MISSIONS
// ════════════════════════════════════════════════════════════════════
function PageMissions() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const { data, isLoading } = useQuery({ queryKey:["liv-cmds"], queryFn:()=>livreurAPI.commandes().then(r=>r.data.data||[]) });
  const acceptMut = useMutation({
    mutationFn: (id) => livreurAPI.updateCmd(id, {statut:"en_cours",livreur_id:user?.id}),
    onSuccess: () => { toast.success("Mission acceptée ! Bonne livraison 🛵"); qc.invalidateQueries(["liv-cmds"]); },
    onError: () => toast.error("Erreur"),
  });
  const cmds = (data||[]).filter(c=>["confirmee","pret","en_attente"].includes(c.statut));
  return (
    <div>
      <PageHeader title="📦 Missions disponibles" subtitle={cmds.length+" mission(s) · "+fmt(TARIF.LIVRAISON_LIVREUR)+" FCFA chacune"} />
      {isLoading ? <Loader /> : cmds.length === 0 ? <Empty icon="📦" title="Aucune mission disponible" subtitle="Revenez dans quelques instants" /> :
        cmds.map(c => (
          <div key={c.id} style={{background:"#141E2B",border:"1.5px solid #1E2F42",borderRadius:14,padding:20,marginBottom:14,transition:"border-color .15s"}}
            onMouseOver={e=>e.currentTarget.style.borderColor="#D97706"} onMouseOut={e=>e.currentTarget.style.borderColor="#1E2F42"}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16,marginBottom:14}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                  <span style={{fontSize:28}}>📦</span>
                  <div><div style={{fontSize:15,fontWeight:800,color:"#F0F4F8"}}>Cmd #{c.id?.slice(-8).toUpperCase()}</div><Badge color="amber">{c.statut==="pret"?"Prête à récupérer":"Disponible"}</Badge></div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:12}}>
                  {[["📍 Adresse",c.adresse_livraison||"À confirmer"],["💊 Articles",`${c.nombre_articles||1} article(s)`],["⏱️ Délai estimé","30-45 min"],["🌍 Zone","UEMOA & CEMAC"]].map(([k,v])=>(
                    <div key={k} style={{background:"#1A2535",borderRadius:8,padding:"8px 12px"}}><div style={{fontSize:10,color:"#4E657A",fontWeight:700,marginBottom:2}}>{k}</div><div style={{color:"#F0F4F8",fontWeight:600}}>{v}</div></div>
                  ))}
                </div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontSize:22,fontWeight:900,color:"#0A8F58",marginBottom:2}}>{fmt(TARIF.LIVRAISON_LIVREUR)} F</div>
                <div style={{fontSize:11,color:"#4E657A"}}>votre part</div>
                <div style={{fontSize:11,color:"#4E657A",marginTop:2}}>Total client : {fmt(TARIF.LIVRAISON_TOTAL)} F</div>
              </div>
            </div>
            <div style={{display:"flex",gap:10}}>
              <Btn variant="amber" style={{flex:2}} loading={acceptMut.isPending} onClick={()=>acceptMut.mutate(c.id)}>🛵 Accepter cette mission</Btn>
              <Btn variant="outline" style={{flex:1}}>📍 Voir sur la carte</Btn>
            </div>
          </div>
        ))
      }
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  EN COURS
// ════════════════════════════════════════════════════════════════════
function PageEnCours() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey:["liv-cmds"], queryFn:()=>livreurAPI.commandes().then(r=>r.data.data||[]) });
  const liverMut = useMutation({
    mutationFn: (id) => livreurAPI.updateCmd(id, {statut:"livree"}),
    onSuccess: () => { toast.success("✅ Livraison confirmée ! +"+fmt(TARIF.LIVRAISON_LIVREUR)+" FCFA"); qc.invalidateQueries(["liv-cmds"]); },
    onError: () => toast.error("Erreur"),
  });
  const cmds = (data||[]).filter(c=>c.statut==="en_cours");
  return (
    <div>
      <PageHeader title="🛵 Livraisons en cours" subtitle={cmds.length+" livraison(s) active(s)"} />
      {isLoading ? <Loader /> : cmds.length === 0 ? <Empty icon="🛵" title="Aucune livraison en cours" subtitle="Acceptez une mission depuis l'onglet Missions" /> :
        cmds.map(c => (
          <div key={c.id} style={{background:"#141E2B",border:"2px solid rgba(13,148,136,.4)",borderRadius:14,padding:22,marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
              <span style={{fontSize:30}}>🛵</span>
              <div style={{flex:1}}><div style={{fontSize:16,fontWeight:800,color:"#F0F4F8"}}>Cmd #{c.id?.slice(-8).toUpperCase()}</div><Badge color="teal">En cours de livraison</Badge></div>
              <div style={{textAlign:"right"}}><div style={{fontSize:18,fontWeight:900,color:"#0A8F58"}}>{fmt(TARIF.LIVRAISON_LIVREUR)} F</div><div style={{fontSize:10,color:"#4E657A"}}>votre gain</div></div>
            </div>
            <div style={{background:"#1A2535",borderRadius:10,padding:16,marginBottom:14}}>
              <div style={{fontSize:11,fontWeight:700,color:"#0D9488",textTransform:"uppercase",letterSpacing:".5px",marginBottom:12}}>Étapes de livraison</div>
              {[{icon:"✅",label:"Mission acceptée",done:true},{icon:"🏪",label:"Récupération à la pharmacie",done:true},{icon:"🛵",label:"En route vers le client",done:true,active:true},{icon:"📦",label:"Livraison au client",done:false}].map((e,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
                  <div style={{width:30,height:30,borderRadius:"50%",background:e.done?"rgba(13,148,136,.2)":"rgba(255,255,255,.05)",border:`2px solid ${e.done?"#0D9488":"#1E2F42"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>{e.icon}</div>
                  <div style={{fontSize:13,color:e.active?"#0D9488":e.done?"#F0F4F8":"#4E657A",fontWeight:e.active?700:400}}>{e.label}</div>
                  {e.active&&<span style={{background:"rgba(13,148,136,.15)",color:"#0D9488",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:10}}>EN COURS</span>}
                </div>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
              <div style={{background:"#1A2535",borderRadius:8,padding:"10px 14px"}}><div style={{fontSize:10,color:"#4E657A",fontWeight:700,marginBottom:2}}>📍 Adresse</div><div style={{fontSize:13,color:"#F0F4F8"}}>{c.adresse_livraison||"À confirmer"}</div></div>
              <div style={{background:"#1A2535",borderRadius:8,padding:"10px 14px"}}><div style={{fontSize:10,color:"#4E657A",fontWeight:700,marginBottom:2}}>💰 Votre gain</div><div style={{fontSize:15,color:"#0A8F58",fontWeight:900}}>{fmt(TARIF.LIVRAISON_LIVREUR)} FCFA</div></div>
            </div>
            <div style={{display:"flex",gap:10}}>
              <Btn style={{flex:2,background:"linear-gradient(135deg,#0A8F58,#0D9488)"}} loading={liverMut.isPending} onClick={()=>liverMut.mutate(c.id)}>✅ Confirmer la livraison (+{fmt(TARIF.LIVRAISON_LIVREUR)} F)</Btn>
              <Btn variant="outline" style={{flex:1}} onClick={()=>toast.success("SMS envoyé au client !")}>📞 Client</Btn>
            </div>
          </div>
        ))
      }
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  HISTORIQUE
// ════════════════════════════════════════════════════════════════════
function PageHistorique() {
  const { data, isLoading } = useQuery({ queryKey:["liv-cmds"], queryFn:()=>livreurAPI.commandes().then(r=>r.data.data||[]) });
  const cmds    = (data||[]).filter(c=>["livree","annulee"].includes(c.statut));
  const livrees = cmds.filter(c=>c.statut==="livree");
  const gains   = livrees.length * TARIF.LIVRAISON_LIVREUR;
  return (
    <div>
      <PageHeader title="📋 Historique des livraisons" subtitle={cmds.length+" livraison(s) effectuée(s)"} />
      <Grid cols={3} gap={14} style={{marginBottom:20}}>
        <Card label="Livraisons réussies" value={livrees.length} icon="✅" color="#0A8F58" />
        <Card label="Gains perçus" value={fmt(gains)+" F"} icon="💰" color="#0A8F58" sub={"×"+fmt(TARIF.LIVRAISON_LIVREUR)+" F"} />
        <Card label="Taux de succès" value={cmds.length>0?Math.round(livrees.length/cmds.length*100)+"%":"—"} icon="📊" color="#0D9488" />
      </Grid>
      {isLoading ? <Loader /> : (
        <Panel title="Toutes les livraisons">
          {cmds.length === 0 ? <Empty icon="📋" title="Aucune livraison dans l'historique" /> :
            cmds.map(c=>(
              <ListItem key={c.id}
                left={<span style={{fontSize:22}}>{c.statut==="livree"?"✅":"❌"}</span>}
                center={<><div style={{fontSize:13,fontWeight:700,color:"#F0F4F8"}}>Cmd #{c.id?.slice(-8).toUpperCase()}</div><div style={{fontSize:11,color:"#8BA0B5"}}>📍 {c.adresse_livraison||"—"} · {c.updated_at?new Date(c.updated_at).toLocaleDateString("fr-CI"):"—"}</div></>}
                right={<><span style={{fontSize:14,fontWeight:800,color:c.statut==="livree"?"#0A8F58":"#E11D48"}}>{c.statut==="livree"?"+"+fmt(TARIF.LIVRAISON_LIVREUR)+" F":"0 F"}</span><Badge color={c.statut==="livree"?"green":"red"}>{c.statut==="livree"?"Livrée":"Annulée"}</Badge></>}
              />
            ))}
        </Panel>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  GAINS
// ════════════════════════════════════════════════════════════════════
function PageGains() {
  const { data } = useQuery({ queryKey:["liv-cmds"], queryFn:()=>livreurAPI.commandes().then(r=>r.data.data||[]) });
  const livrees = (data||[]).filter(c=>c.statut==="livree");
  const now     = new Date();
  const gainsJour    = livrees.filter(c=>new Date(c.updated_at).toDateString()===now.toDateString()).length * TARIF.LIVRAISON_LIVREUR;
  const gainsSemaine = livrees.filter(c=>(now-new Date(c.updated_at))<7*864e5).length * TARIF.LIVRAISON_LIVREUR;
  const gainsMois    = livrees.length * TARIF.LIVRAISON_LIVREUR;
  const jours = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
  const vals  = [3,4,2,5,7,4,1].map(n=>n*TARIF.LIVRAISON_LIVREUR);
  const max   = Math.max(...vals);
  return (
    <div>
      <PageHeader title="💰 Mes gains" subtitle={"Tarif : "+fmt(TARIF.LIVRAISON_LIVREUR)+" FCFA / livraison — Zone UEMOA & CEMAC"} />

      {/* Grille tarifaire */}
      <div style={{background:"rgba(10,143,88,.06)",border:"1px solid rgba(10,143,88,.2)",borderRadius:12,padding:18,marginBottom:20}}>
        <div style={{fontSize:13,fontWeight:700,color:"#F0F4F8",marginBottom:12}}>📋 Grille tarifaire MediConnect</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
          {[
            ["Prix total client",fmt(TARIF.LIVRAISON_TOTAL)+" FCFA","#F0F4F8","Zone UEMOA & CEMAC"],
            ["Votre part (67%)",fmt(TARIF.LIVRAISON_LIVREUR)+" FCFA","#0A8F58","Par livraison réussie"],
            ["Part MediConnect (33%)",fmt(TARIF.LIVRAISON_MEDICONN)+" FCFA","#8BA0B5","Frais de plateforme"],
          ].map(([l,v,c,sub])=>(
            <div key={l} style={{background:"#1A2535",borderRadius:10,padding:"14px",textAlign:"center"}}>
              <div style={{fontSize:11,color:"#4E657A",marginBottom:6}}>{l}</div>
              <div style={{fontSize:20,fontWeight:900,color:c,marginBottom:2}}>{v}</div>
              <div style={{fontSize:10,color:"#4E657A"}}>{sub}</div>
            </div>
          ))}
        </div>
      </div>

      <Grid cols={3} gap={14} style={{marginBottom:20}}>
        <Card label="Gains aujourd'hui"  value={fmt(gainsJour)+" F"}    icon="📅" color="#0A8F58" />
        <Card label="Gains cette semaine" value={fmt(gainsSemaine)+" F"} icon="📊" color="#0D9488" />
        <Card label="Gains ce mois"       value={fmt(gainsMois)+" F"}    icon="💰" color="#0A8F58" sub={livrees.length+" livraison(s)"} />
      </Grid>

      <Panel title="📊 Performance de la semaine" style={{marginBottom:20}}>
        <div style={{display:"flex",alignItems:"flex-end",gap:10,height:140,paddingTop:20}}>
          {jours.map((j,i)=>{
            const h=Math.round((vals[i]/max)*100);
            return (
              <div key={j} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
                <div style={{fontSize:9,color:"#0A8F58",fontWeight:700}}>{fmt(vals[i])}</div>
                <div style={{width:"100%",height:`${h}%`,background:i===4?"linear-gradient(to top,#0A8F58,#0D9488)":"rgba(10,143,88,.3)",borderRadius:"4px 4px 0 0"}} />
                <div style={{fontSize:10,color:"#4E657A"}}>{j}</div>
              </div>
            );
          })}
        </div>
        <div style={{fontSize:11,color:"#4E657A",marginTop:10,textAlign:"center"}}>Données illustratives — basées sur {fmt(TARIF.LIVRAISON_LIVREUR)} FCFA par livraison</div>
      </Panel>

      <Panel title="💳 Informations de paiement" accent="green">
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          {[["Frais/livraison",fmt(TARIF.LIVRAISON_LIVREUR)+" FCFA"],["Livraisons complétées",livrees.length+""],["Prochain virement","Chaque vendredi"],["Mode de paiement","Wave · Orange Money"]].map(([k,v])=>(
            <div key={k} style={{background:"#1A2535",borderRadius:8,padding:"12px 14px"}}><div style={{fontSize:10,color:"#4E657A",fontWeight:700,textTransform:"uppercase",marginBottom:3}}>{k}</div><div style={{fontSize:13,color:"#F0F4F8",fontWeight:700}}>{v}</div></div>
          ))}
        </div>
        <div style={{background:"rgba(10,143,88,.07)",border:"1px solid rgba(10,143,88,.2)",borderRadius:10,padding:14,fontSize:13,color:"#8BA0B5"}}>
          💡 Vos <strong style={{color:"#F0F4F8"}}>{fmt(TARIF.LIVRAISON_LIVREUR)} FCFA</strong> par livraison sont virés chaque vendredi sur Wave ou Orange Money.
        </div>
      </Panel>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Routes>
      <Route index             element={<DashboardHome />} />
      <Route path="missions"   element={<PageMissions />} />
      <Route path="en-cours"   element={<PageEnCours />} />
      <Route path="historique" element={<PageHistorique />} />
      <Route path="gains"      element={<PageGains />} />
      <Route path="*"          element={<DashboardHome />} />
    </Routes>
  );
}
