import React, { useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "../../services/api";
import { Card, Panel, ListItem, Avatar, Grid, PageHeader, Badge, Loader, Empty, Btn, Table, ProgressBar } from "../../components/common/UI";

// ══════════════════════════════════════════════════════════════════
//  PLAN TARIFAIRE MEDICONNECT FOR AFRICA
// ══════════════════════════════════════════════════════════════════
const TARIFS = {
  // Livraison médicaments
  LIVRAISON_TOTAL:        1500,   // Prix client — zone UEMOA & CEMAC
  LIVRAISON_LIVREUR:      1000,   // Part livreur
  LIVRAISON_MEDICONNECT:   500,   // Part MediConnect

  // Clinique / Établissement
  CLINIQUE_SETUP:       100000,   // Mise en service (one-time)
  CLINIQUE_MENSUEL:       3000,   // Abonnement mensuel hébergement

  // Patient
  PATIENT_MENSUEL_STD:     300,   // Abonnement mensuel standard
  PATIENT_MENSUEL_PRO:     500,   // Avec suivi médecin privé
};

const fmt = (n) => Number(n || 0).toLocaleString("fr-CI");

const adminAPI = {
  users:     () => api.get("/utilisateurs"),
  cliniques: () => api.get("/cliniques"),
  commandes: () => api.get("/commandes"),
  patients:  () => api.get("/patients"),
  rdvs:      () => api.get("/rdv"),
};

// ════════════════════════════════════════════════════════════════════
//  HOME — Dashboard général avec KPIs financiers
// ════════════════════════════════════════════════════════════════════
function DashboardHome() {
  const nav = useNavigate();
  const { data: usersData }    = useQuery({ queryKey:["adm-users"],    queryFn:()=>adminAPI.users().then(r=>r.data.data||[])    });
  const { data: cliniquesData } = useQuery({ queryKey:["adm-cliniq"],  queryFn:()=>adminAPI.cliniques().then(r=>r.data.data||[]) });
  const { data: commandesData } = useQuery({ queryKey:["adm-cmds"],    queryFn:()=>adminAPI.commandes().then(r=>r.data.data||[]) });
  const { data: patientsData }  = useQuery({ queryKey:["adm-patients"],queryFn:()=>adminAPI.patients().then(r=>r.data.data||[])  });
  const { data: rdvsData }      = useQuery({ queryKey:["adm-rdvs"],    queryFn:()=>adminAPI.rdvs().then(r=>r.data.data||[])      });

  const users    = usersData    || [];
  const cliniques = cliniquesData || [];
  const commandes = commandesData || [];
  const patients  = patientsData  || [];
  const rdvs      = rdvsData      || [];

  // Calculs financiers
  const livraisonsReussies = commandes.filter(c=>c.statut==="livree");
  const revenuLivraisons   = livraisonsReussies.length * TARIFS.LIVRAISON_MEDICONNECT;
  const revenuCliniques    = cliniques.length * TARIFS.CLINIQUE_MENSUEL;
  const revenuSetup        = cliniques.length * TARIFS.CLINIQUE_SETUP;
  const revenuPatients     = patients.length * TARIFS.PATIENT_MENSUEL_STD;
  const revenuTotalMensuel = revenuLivraisons + revenuCliniques + revenuPatients;

  const livreurs  = users.filter(u=>u.role==="livreur");
  const nbPatients = users.filter(u=>u.role==="patient").length;

  return (
    <div>
      <PageHeader title="⚙️ Administration MediConnect" subtitle="Tableau de bord général — Revenus · Utilisateurs · Opérations" />

      {/* KPIs principaux */}
      <Grid cols={4} gap={14} style={{marginBottom:20}}>
        <Card label="Établissements" value={cliniques.length} icon="🏥" color="#0D9488" sub="Cliniques actives" />
        <Card label="Patients" value={nbPatients} icon="👤" color="#0A8F58" sub="Dossiers créés" />
        <Card label="Livreurs" value={livreurs.length} icon="🛵" color="#D97706" sub="Actifs" />
        <Card label="Livraisons" value={livraisonsReussies.length} icon="✅" color="#0A8F58" sub="Réussies" />
      </Grid>

      {/* KPIs RDV MediConnect */}
      <div style={{background:"rgba(37,99,235,.06)",border:"1px solid rgba(37,99,235,.2)",borderRadius:14,padding:20,marginBottom:20}}>
        <div style={{fontSize:14,fontWeight:800,color:"#F0F4F8",marginBottom:16}}>📅 RDV pris via MediConnect RDV</div>
        <Grid cols={4} gap={12}>
          {[
            ["Total RDV", rdvs.length, "Tous statuts confondus", "#2563EB"],
            ["RDV validés", rdvs.filter(r=>r.statut==="confirme"||r.statut==="confirmed").length, "Confirmés par les cliniques", "#0A8F58"],
            ["RDV en attente", rdvs.filter(r=>r.statut==="en_attente"||r.statut==="pending").length, "En attente de confirmation", "#F59E0B"],
            ["RDV annulés", rdvs.filter(r=>r.statut==="annule"||r.statut==="cancelled").length, "Annulés", "#E11D48"],
          ].map(([l,v,sub,c])=>(
            <div key={l} style={{background:"#141E2B",borderRadius:10,padding:"14px",textAlign:"center",border:`1px solid #1E2F42`}}>
              <div style={{fontSize:11,color:"#4E657A",marginBottom:6}}>{l}</div>
              <div style={{fontSize:28,fontWeight:900,color:c,marginBottom:4}}>{v}</div>
              <div style={{fontSize:10,color:"#4E657A"}}>{sub}</div>
            </div>
          ))}
        </Grid>
      </div>

      {/* KPIs financiers */}
      <div style={{background:"rgba(10,143,88,.06)",border:"1px solid rgba(10,143,88,.2)",borderRadius:14,padding:20,marginBottom:20}}>
        <div style={{fontSize:14,fontWeight:800,color:"#F0F4F8",marginBottom:16}}>💰 Revenus MediConnect For Africa</div>
        <Grid cols={4} gap={12}>
          {[
            ["Livraisons (mensuel)",fmt(revenuLivraisons)+" F",fmt(TARIFS.LIVRAISON_MEDICONNECT)+" F × "+livraisonsReussies.length,"#0A8F58"],
            ["Abonnements cliniques",fmt(revenuCliniques)+" F",fmt(TARIFS.CLINIQUE_MENSUEL)+" F × "+cliniques.length+" /mois","#0D9488"],
            ["Abonnements patients",fmt(revenuPatients)+" F",fmt(TARIFS.PATIENT_MENSUEL_STD)+" F × "+patients.length+" /mois","#0A8F58"],
            ["TOTAL MENSUEL ESTIMÉ",fmt(revenuTotalMensuel)+" F","Récurrent + livraisons","#0A8F58"],
          ].map(([l,v,sub,c])=>(
            <div key={l} style={{background:"#141E2B",borderRadius:10,padding:"14px",textAlign:"center",border:`1px solid ${l.includes("TOTAL")?"rgba(10,143,88,.4)":"#1E2F42"}`}}>
              <div style={{fontSize:11,color:"#4E657A",marginBottom:6}}>{l}</div>
              <div style={{fontSize:18,fontWeight:900,color:c,marginBottom:4}}>{v}</div>
              <div style={{fontSize:10,color:"#4E657A"}}>{sub}</div>
            </div>
          ))}
        </Grid>
      </div>

      <Grid cols={2} gap={20}>
        {/* Accès rapide */}
        <Panel title="⚡ Accès rapide" accent="green">
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[["🏥","Établissements","etablissements","#0D9488"],["👤","Patients","patients","#0A8F58"],["🛵","Livreurs","livreurs","#D97706"],["📅","Gestion RDV","rdv-patients","#2563EB"],["📈","Rapports","rapports","#0A8F58"],["🛡️","Assureurs","assureurs","#2563EB"]].map(([icon,label,path,color])=>(
              <button key={path+label} onClick={()=>nav(path)} style={{background:"#1A2535",border:"1px solid #1E2F42",borderRadius:10,padding:"12px",cursor:"pointer",textAlign:"center",transition:"all .15s",fontFamily:"inherit"}}
                onMouseOver={e=>{e.currentTarget.style.borderColor=color;}} onMouseOut={e=>{e.currentTarget.style.borderColor="#1E2F42";}}>
                <div style={{fontSize:22,marginBottom:4}}>{icon}</div>
                <div style={{fontSize:11,color:"#F0F4F8",fontWeight:600}}>{label}</div>
              </button>
            ))}
          </div>
        </Panel>

        {/* Répartition revenus */}
        <Panel title="📊 Répartition des revenus">
          {[
            ["🛵 Livraisons",revenuLivraisons,revenuTotalMensuel,"#0A8F58"],
            ["🏥 Abonnements cliniques",revenuCliniques,revenuTotalMensuel,"#0D9488"],
            ["👤 Abonnements patients",revenuPatients,revenuTotalMensuel,"#2563EB"],
          ].map(([l,v,total,c])=>(
            <div key={l} style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:5}}>
                <span style={{color:"#8BA0B5"}}>{l}</span>
                <span style={{fontWeight:700,color:c}}>{fmt(v)} F ({total>0?Math.round(v/total*100):0}%)</span>
              </div>
              <ProgressBar value={v} max={Math.max(revenuTotalMensuel,1)} color={c} />
            </div>
          ))}
          <div style={{borderTop:"1px solid #1E2F42",paddingTop:12,marginTop:4,display:"flex",justifyContent:"space-between",fontSize:14}}>
            <span style={{fontWeight:700,color:"#F0F4F8"}}>Total mensuel estimé</span>
            <span style={{fontWeight:900,color:"#0A8F58"}}>{fmt(revenuTotalMensuel)} FCFA</span>
          </div>
        </Panel>
      </Grid>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  PAGE ÉTABLISSEMENTS
// ════════════════════════════════════════════════════════════════════
function PageEtablissements() {
  const { data, isLoading } = useQuery({ queryKey:["adm-cliniq"], queryFn:()=>adminAPI.cliniques().then(r=>r.data.data||[]) });
  const { data: rdvsData }  = useQuery({ queryKey:["adm-rdvs"],   queryFn:()=>adminAPI.rdvs().then(r=>r.data.data||[])      });
  const cliniques    = data    || [];
  const rdvs         = rdvsData || [];
  const revenuMensuel = cliniques.length * TARIFS.CLINIQUE_MENSUEL;
  const revenuSetup   = cliniques.length * TARIFS.CLINIQUE_SETUP;

  const [cliniqueSelectee, setCliniqueSelectee] = useState(null);

  // RDV validés par clinique
  const rdvsParClinique = (cliniqueId) =>
    rdvs.filter(r => String(r.clinique_id) === String(cliniqueId));
  const rdvsValidesParClinique = (cliniqueId) =>
    rdvsParClinique(cliniqueId).filter(r => r.statut === "confirme" || r.statut === "confirmed");

  return (
    <div>
      <PageHeader title="🏥 Établissements partenaires" subtitle={`${cliniques.length} établissement(s) · Revenus mensuels : ${fmt(revenuMensuel)} FCFA`} />

      <Grid cols={3} gap={14} style={{marginBottom:20}}>
        <Card label="Cliniques actives" value={cliniques.length} icon="🏥" color="#0D9488" />
        <Card label="Frais mise en service total" value={fmt(revenuSetup)+" F"} icon="💳" color="#0A8F58" sub={fmt(TARIFS.CLINIQUE_SETUP)+" F × "+cliniques.length} />
        <Card label="Abonnements mensuels" value={fmt(revenuMensuel)+" F"} icon="📅" color="#0A8F58" sub={fmt(TARIFS.CLINIQUE_MENSUEL)+" F × "+cliniques.length+" /mois"} />
      </Grid>

      {/* KPI RDV par clinique */}
      <div style={{background:"rgba(37,99,235,.06)",border:"1px solid rgba(37,99,235,.2)",borderRadius:12,padding:18,marginBottom:20}}>
        <div style={{fontSize:13,fontWeight:800,color:"#F0F4F8",marginBottom:14}}>📅 RDV par établissement</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10}}>
          {cliniques.map(c=>{
            const total   = rdvsParClinique(c.id).length;
            const valides = rdvsValidesParClinique(c.id).length;
            return (
              <div key={c.id}
                onClick={()=>setCliniqueSelectee(cliniqueSelectee?.id===c.id ? null : c)}
                style={{background:"#141E2B",border:`1px solid ${cliniqueSelectee?.id===c.id?"#2563EB":"#1E2F42"}`,borderRadius:10,padding:"12px",cursor:"pointer",transition:"all .15s"}}>
                <div style={{fontSize:13,fontWeight:700,color:"#F0F4F8",marginBottom:6,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.nom||"Clinique"}</div>
                <div style={{display:"flex",gap:8}}>
                  <span style={{fontSize:11,background:"rgba(37,99,235,.15)",color:"#2563EB",borderRadius:20,padding:"2px 8px"}}>{total} RDV total</span>
                  <span style={{fontSize:11,background:"rgba(10,143,88,.15)",color:"#0A8F58",borderRadius:20,padding:"2px 8px"}}>{valides} validés</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Liste RDV de la clinique sélectionnée */}
      {cliniqueSelectee && (
        <div style={{background:"#141E2B",border:"1px solid #1E2F42",borderRadius:14,padding:20,marginBottom:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontSize:14,fontWeight:800,color:"#F0F4F8"}}>
              📋 RDV — {cliniqueSelectee.nom}
              <span style={{fontSize:12,color:"#4E657A",fontWeight:400,marginLeft:10}}>({rdvsParClinique(cliniqueSelectee.id).length} au total)</span>
            </div>
            <button onClick={()=>setCliniqueSelectee(null)} style={{background:"none",border:"1px solid #1E2F42",color:"#8BA0B5",borderRadius:8,padding:"4px 10px",cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>✕ Fermer</button>
          </div>
          {rdvsParClinique(cliniqueSelectee.id).length === 0 ? (
            <div style={{textAlign:"center",padding:"30px 0",color:"#4E657A",fontSize:14}}>
              <div style={{fontSize:32,marginBottom:8}}>📅</div>
              Aucun RDV pour cet établissement
            </div>
          ) : (
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr style={{borderBottom:"1px solid #1E2F42"}}>
                  {["N° RDV","Médecin","Date","Statut"].map(h=>(
                    <th key={h} style={{textAlign:"left",padding:"8px 10px",fontSize:11,color:"#4E657A",fontWeight:700,textTransform:"uppercase",letterSpacing:".5px"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rdvsParClinique(cliniqueSelectee.id).map((rdv,i)=>{
                  const statutColor = rdv.statut==="confirme"||rdv.statut==="confirmed" ? "#0A8F58"
                    : rdv.statut==="annule"||rdv.statut==="cancelled" ? "#E11D48" : "#F59E0B";
                  const statutLabel = rdv.statut==="confirme"||rdv.statut==="confirmed" ? "Validé"
                    : rdv.statut==="annule"||rdv.statut==="cancelled" ? "Annulé" : "En attente";
                  return (
                    <tr key={rdv.id||i} style={{borderBottom:"1px solid #0E1620"}}>
                      <td style={{padding:"10px",fontSize:13,fontWeight:700,color:"#2563EB",fontFamily:"monospace"}}>
                        #{rdv.reference || rdv.id || `RDV-${String(i+1).padStart(4,"0")}`}
                      </td>
                      <td style={{padding:"10px",fontSize:13,color:"#F0F4F8"}}>
                        Dr. {rdv.medecin_prenom||""} {rdv.medecin_nom||rdv.medecin||"—"}
                      </td>
                      <td style={{padding:"10px",fontSize:13,color:"#8BA0B5"}}>
                        {rdv.creneau ? new Date(rdv.creneau.split(" ")[0]).toLocaleDateString("fr-CI",{day:"numeric",month:"short",year:"numeric"}) + " " + (rdv.creneau.split(" ")[1]||"") : rdv.date||"—"}
                      </td>
                      <td style={{padding:"10px"}}>
                        <span style={{fontSize:11,background:statutColor+"20",color:statutColor,borderRadius:20,padding:"3px 10px",fontWeight:700}}>
                          {statutLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Grille tarifaire clinique */}
      <div style={{background:"rgba(13,148,136,.06)",border:"1px solid rgba(13,148,136,.2)",borderRadius:12,padding:18,marginBottom:20}}>
        <div style={{fontSize:13,fontWeight:700,color:"#0D9488",marginBottom:12}}>📋 Grille tarifaire — Établissements</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12}}>
          {[
            ["🔧 Mise en service",fmt(TARIFS.CLINIQUE_SETUP)+" FCFA","Frais unique · Formation incluse"],
            ["📅 Abonnement mensuel",fmt(TARIFS.CLINIQUE_MENSUEL)+" FCFA","Hébergement · Maintenance · Support"],
          ].map(([l,v,sub])=>(
            <div key={l} style={{background:"#141E2B",borderRadius:10,padding:"14px"}}>
              <div style={{fontSize:12,fontWeight:700,color:"#F0F4F8",marginBottom:4}}>{l}</div>
              <div style={{fontSize:20,fontWeight:900,color:"#0D9488",marginBottom:4}}>{v}</div>
              <div style={{fontSize:11,color:"#4E657A"}}>{sub}</div>
            </div>
          ))}
        </div>
      </div>

      {isLoading ? <Loader /> : (
        <Panel title={`Liste des établissements (${cliniques.length})`}>
          {cliniques.length === 0 ? <Empty icon="🏥" title="Aucun établissement enregistré" /> :
            <Table
              columns={[
                {key:"nom",label:"Établissement",render:(v,r)=><><div style={{fontWeight:700}}>{v||r.user_id}</div><div style={{fontSize:11,color:"#8BA0B5"}}>{r.type||"Clinique"}</div></>},
                {key:"email",label:"Email",render:v=><span style={{fontSize:12}}>{v||"—"}</span>},
                {key:"ville",label:"Ville"},
                {key:"id",label:"RDV validés",render:(v)=><span style={{color:"#0A8F58",fontWeight:700}}>{rdvsValidesParClinique(v).length} ✓</span>},
                {key:"id",label:"RDV total",render:(v)=><span style={{color:"#2563EB",fontWeight:700}}>{rdvsParClinique(v).length}</span>},
                {key:"id",label:"Statut",render:()=><Badge color="green">Actif</Badge>},
              ]}
              rows={cliniques}
            />
          }
        </Panel>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  PAGE PATIENTS
// ════════════════════════════════════════════════════════════════════
function PagePatients() {
  const { data, isLoading } = useQuery({ queryKey:["adm-patients"], queryFn:()=>adminAPI.patients().then(r=>r.data.data||[]) });
  const patients = data || [];
  const std  = patients.length;
  const pro  = Math.floor(patients.length * 0.2); // Estimation 20% avec suivi privé
  const revMensuel = (std - pro) * TARIFS.PATIENT_MENSUEL_STD + pro * TARIFS.PATIENT_MENSUEL_PRO;

  return (
    <div>
      <PageHeader title="👤 Patients" subtitle={`${patients.length} dossiers · Revenus mensuels estimés : ${fmt(revMensuel)} FCFA`} />

      <Grid cols={4} gap={14} style={{marginBottom:20}}>
        <Card label="Total patients" value={patients.length} icon="👤" color="#0A8F58" />
        <Card label="Abonnement standard" value={fmt(TARIFS.PATIENT_MENSUEL_STD)+" F/mois"} icon="📋" color="#8BA0B5" sub="Dossier + RDV" />
        <Card label="Abonnement suivi privé" value={fmt(TARIFS.PATIENT_MENSUEL_PRO)+" F/mois"} icon="🩺" color="#0D9488" sub="Avec médecin privé" />
        <Card label="Revenus mensuels estimés" value={fmt(revMensuel)+" F"} icon="💰" color="#0A8F58" />
      </Grid>

      {/* Grille tarifaire patient */}
      <div style={{background:"rgba(10,143,88,.06)",border:"1px solid rgba(10,143,88,.2)",borderRadius:12,padding:18,marginBottom:20}}>
        <div style={{fontSize:13,fontWeight:700,color:"#0A8F58",marginBottom:12}}>📋 Grille tarifaire — Patients</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12}}>
          {[
            ["📋 Abonnement Standard",fmt(TARIFS.PATIENT_MENSUEL_STD)+" FCFA/mois","Dossier médical + Prise de RDV en ligne"],
            ["🩺 Abonnement Suivi Privé",fmt(TARIFS.PATIENT_MENSUEL_PRO)+" FCFA/mois","Standard + Suivi par un médecin privé"],
          ].map(([l,v,sub])=>(
            <div key={l} style={{background:"#141E2B",borderRadius:10,padding:"14px"}}>
              <div style={{fontSize:12,fontWeight:700,color:"#F0F4F8",marginBottom:4}}>{l}</div>
              <div style={{fontSize:20,fontWeight:900,color:"#0A8F58",marginBottom:4}}>{v}</div>
              <div style={{fontSize:11,color:"#4E657A"}}>{sub}</div>
            </div>
          ))}
        </div>
      </div>

      {isLoading ? <Loader /> : (
        <Panel title={`Dossiers patients (${patients.length})`}>
          {patients.length === 0 ? <Empty icon="👤" title="Aucun patient enregistré" /> :
            <Table
              columns={[
                {key:"user_nom",label:"Patient",render:(v,r)=><><div style={{fontWeight:700}}>{v||"—"}</div><div style={{fontSize:11,color:"#8BA0B5"}}>{r.code_secret}</div></>},
                {key:"groupe_sanguin",label:"Groupe sanguin"},
                {key:"id",label:"Abonnement",render:()=><Badge color="green">Standard — {fmt(TARIFS.PATIENT_MENSUEL_STD)} F/mois</Badge>},
                {key:"created_at",label:"Inscription",render:v=>v?new Date(v).toLocaleDateString("fr-CI"):"—"},
                {key:"id",label:"Statut",render:()=><Badge color="green">Actif</Badge>},
              ]}
              rows={patients}
            />
          }
        </Panel>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  PAGE LIVREURS
// ════════════════════════════════════════════════════════════════════
function PageLivreurs() {
  const { data: usersData }     = useQuery({ queryKey:["adm-users"],queryFn:()=>adminAPI.users().then(r=>r.data.data||[]) });
  const { data: commandesData } = useQuery({ queryKey:["adm-cmds"], queryFn:()=>adminAPI.commandes().then(r=>r.data.data||[]) });
  const livreurs  = (usersData||[]).filter(u=>u.role==="livreur");
  const commandes = commandesData || [];
  const livrees   = commandes.filter(c=>c.statut==="livree");
  const revenuMediconn = livrees.length * TARIFS.LIVRAISON_MEDICONNECT;
  const revenuLivreurs = livrees.length * TARIFS.LIVRAISON_LIVREUR;

  return (
    <div>
      <PageHeader title="🛵 Livreurs" subtitle={`${livreurs.length} livreur(s) actif(s) · ${livrees.length} livraison(s) réussie(s)`} />

      <Grid cols={4} gap={14} style={{marginBottom:20}}>
        <Card label="Livreurs actifs" value={livreurs.length} icon="🛵" color="#D97706" />
        <Card label="Livraisons réussies" value={livrees.length} icon="✅" color="#0A8F58" />
        <Card label="Revenus MediConnect" value={fmt(revenuMediconn)+" F"} icon="💰" color="#0A8F58" sub={fmt(TARIFS.LIVRAISON_MEDICONNECT)+" F × "+livrees.length} />
        <Card label="Versements livreurs" value={fmt(revenuLivreurs)+" F"} icon="💳" color="#8BA0B5" sub={fmt(TARIFS.LIVRAISON_LIVREUR)+" F × "+livrees.length} />
      </Grid>

      {/* Grille tarifaire livraison */}
      <div style={{background:"rgba(217,119,6,.06)",border:"1px solid rgba(217,119,6,.2)",borderRadius:12,padding:18,marginBottom:20}}>
        <div style={{fontSize:13,fontWeight:700,color:"#D97706",marginBottom:12}}>📋 Grille tarifaire — Livraisons</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
          {[
            ["💳 Prix client",fmt(TARIFS.LIVRAISON_TOTAL)+" FCFA","Zone UEMOA & CEMAC (fixe)","#F0F4F8"],
            ["🛵 Part livreur (67%)",fmt(TARIFS.LIVRAISON_LIVREUR)+" FCFA","Versé chaque vendredi","#D97706"],
            ["🏢 Part MediConnect (33%)",fmt(TARIFS.LIVRAISON_MEDICONNECT)+" FCFA","Frais de plateforme","#0A8F58"],
          ].map(([l,v,sub,c])=>(
            <div key={l} style={{background:"#141E2B",borderRadius:10,padding:"14px",textAlign:"center"}}>
              <div style={{fontSize:11,color:"#4E657A",marginBottom:6}}>{l}</div>
              <div style={{fontSize:20,fontWeight:900,color:c,marginBottom:4}}>{v}</div>
              <div style={{fontSize:10,color:"#4E657A"}}>{sub}</div>
            </div>
          ))}
        </div>
      </div>

      <Panel title={`Liste des livreurs (${livreurs.length})`}>
        {livreurs.length === 0 ? <Empty icon="🛵" title="Aucun livreur enregistré" /> :
          <Table
            columns={[
              {key:"prenom",label:"Livreur",render:(v,r)=><><div style={{fontWeight:700}}>{v} {r.nom}</div><div style={{fontSize:11,color:"#8BA0B5"}}>{r.email}</div></>},
              {key:"telephone",label:"Téléphone"},
              {key:"ville",label:"Ville"},
              {key:"id",label:"Gains/livraison",render:()=><span style={{color:"#D97706",fontWeight:700}}>{fmt(TARIFS.LIVRAISON_LIVREUR)} F</span>},
              {key:"is_active",label:"Statut",render:v=><Badge color={v?"green":"red"}>{v?"Actif":"Inactif"}</Badge>},
            ]}
            rows={livreurs}
          />
        }
      </Panel>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  PAGE RAPPORTS FINANCIERS
// ════════════════════════════════════════════════════════════════════
function PageRapports() {
  const { data: cliniquesData } = useQuery({ queryKey:["adm-cliniq"],   queryFn:()=>adminAPI.cliniques().then(r=>r.data.data||[]) });
  const { data: commandesData } = useQuery({ queryKey:["adm-cmds"],     queryFn:()=>adminAPI.commandes().then(r=>r.data.data||[]) });
  const { data: patientsData }  = useQuery({ queryKey:["adm-patients"], queryFn:()=>adminAPI.patients().then(r=>r.data.data||[])  });

  const cliniques = cliniquesData || [];
  const commandes = commandesData || [];
  const patients  = patientsData  || [];
  const livrees   = commandes.filter(c=>c.statut==="livree");

  // Revenus détaillés
  const R = {
    setupCliniques:   cliniques.length * TARIFS.CLINIQUE_SETUP,
    abonnCliniques:   cliniques.length * TARIFS.CLINIQUE_MENSUEL,
    abonnPatients:    patients.length  * TARIFS.PATIENT_MENSUEL_STD,
    livraisons:       livrees.length   * TARIFS.LIVRAISON_MEDICONNECT,
  };
  R.totalMensuel = R.abonnCliniques + R.abonnPatients + R.livraisons;
  R.totalGlobal  = R.setupCliniques + R.totalMensuel;

  return (
    <div>
      <PageHeader title="📈 Rapports financiers" subtitle="Revenus · Abonnements · Livraisons — MediConnect For Africa" />

      {/* Vue globale */}
      <div style={{background:"linear-gradient(135deg,rgba(10,143,88,.1),rgba(13,148,136,.08))",border:"1px solid rgba(10,143,88,.25)",borderRadius:16,padding:24,marginBottom:24}}>
        <div style={{fontSize:13,fontWeight:700,color:"#0A8F58",textTransform:"uppercase",letterSpacing:".5px",marginBottom:16}}>💰 Revenus consolidés MediConnect For Africa</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14}}>
          {[
            ["Mise en service (one-time)",R.setupCliniques,"#F0F4F8",`${cliniques.length} clinique(s)`],
            ["Abonnements mensuels",R.totalMensuel,"#0A8F58","Récurrent"],
            ["Dont livraisons",R.livraisons,"#D97706",`${livrees.length} livraison(s)`],
            ["TOTAL GLOBAL",R.totalGlobal,"#0A8F58","Cumulé"],
          ].map(([l,v,c,sub])=>(
            <div key={l} style={{background:"rgba(14,22,32,.7)",borderRadius:12,padding:"16px",textAlign:"center"}}>
              <div style={{fontSize:11,color:"#4E657A",marginBottom:8}}>{l}</div>
              <div style={{fontSize:22,fontWeight:900,color:c,marginBottom:4}}>{fmt(v)} F</div>
              <div style={{fontSize:10,color:"#4E657A"}}>{sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Détail par ligne de revenus */}
      <Grid cols={2} gap={20}>
        <Panel title="📋 Détail par source de revenus">
          {[
            {icon:"🔧",label:"Mise en service cliniques",montant:R.setupCliniques,detail:`${cliniques.length} × ${fmt(TARIFS.CLINIQUE_SETUP)} F`,type:"One-time",color:"#0D9488"},
            {icon:"🏥",label:"Abonnements cliniques",montant:R.abonnCliniques,detail:`${cliniques.length} × ${fmt(TARIFS.CLINIQUE_MENSUEL)} F/mois`,type:"Mensuel",color:"#0D9488"},
            {icon:"👤",label:"Abonnements patients standard",montant:R.abonnPatients,detail:`${patients.length} × ${fmt(TARIFS.PATIENT_MENSUEL_STD)} F/mois`,type:"Mensuel",color:"#0A8F58"},
            {icon:"🛵",label:"Commission livraisons",montant:R.livraisons,detail:`${livrees.length} × ${fmt(TARIFS.LIVRAISON_MEDICONNECT)} F`,type:"Variable",color:"#D97706"},
          ].map(s=>(
            <div key={s.label} style={{padding:"12px 0",borderBottom:"1px solid #0E1620"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:18}}>{s.icon}</span><span style={{fontSize:13,fontWeight:600,color:"#F0F4F8"}}>{s.label}</span></div>
                <span style={{fontSize:15,fontWeight:800,color:s.color}}>{fmt(s.montant)} F</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{fontSize:11,color:"#4E657A",marginLeft:26}}>{s.detail}</span>
                <Badge color={s.type==="Mensuel"?"green":s.type==="One-time"?"teal":"amber"}>{s.type}</Badge>
              </div>
            </div>
          ))}
          <div style={{display:"flex",justifyContent:"space-between",paddingTop:12,marginTop:4,borderTop:"2px solid #1E2F42"}}>
            <span style={{fontWeight:700,color:"#F0F4F8",fontSize:14}}>Total mensuel récurrent</span>
            <span style={{fontWeight:900,color:"#0A8F58",fontSize:16}}>{fmt(R.totalMensuel)} FCFA</span>
          </div>
        </Panel>

        <Panel title="📊 Projections de croissance">
          {[
            {label:"Objectif 50 cliniques",mensuel:50*TARIFS.CLINIQUE_MENSUEL+patients.length*TARIFS.PATIENT_MENSUEL_STD},
            {label:"Objectif 100 cliniques",mensuel:100*TARIFS.CLINIQUE_MENSUEL+patients.length*TARIFS.PATIENT_MENSUEL_STD},
            {label:"Objectif 500 patients actifs",mensuel:cliniques.length*TARIFS.CLINIQUE_MENSUEL+500*TARIFS.PATIENT_MENSUEL_STD},
            {label:"Objectif 1000 livraisons/mois",mensuel:cliniques.length*TARIFS.CLINIQUE_MENSUEL+patients.length*TARIFS.PATIENT_MENSUEL_STD+1000*TARIFS.LIVRAISON_MEDICONNECT},
          ].map((p,i)=>(
            <div key={i} style={{marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:5}}>
                <span style={{color:"#8BA0B5"}}>{p.label}</span>
                <span style={{fontWeight:700,color:"#0A8F58"}}>{fmt(p.mensuel)} F/mois</span>
              </div>
              <ProgressBar value={R.totalMensuel} max={p.mensuel} color="#0A8F58" />
              <div style={{fontSize:10,color:"#4E657A",marginTop:3,textAlign:"right"}}>{R.totalMensuel>0?Math.min(100,Math.round(R.totalMensuel/p.mensuel*100)):0}% atteint</div>
            </div>
          ))}
        </Panel>
      </Grid>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  PAGE GESTION RDV PATIENT
// ════════════════════════════════════════════════════════════════════
function PageGestionRDV() {
  const { data: rdvsData, isLoading }    = useQuery({ queryKey:["adm-rdvs"],   queryFn:()=>adminAPI.rdvs().then(r=>r.data.data||[])      });
  const { data: cliniquesData }          = useQuery({ queryKey:["adm-cliniq"], queryFn:()=>adminAPI.cliniques().then(r=>r.data.data||[]) });
  const rdvs     = rdvsData     || [];
  const cliniques = cliniquesData || [];

  const [cliniqueFiltre, setCliniqueFiltre] = useState("all");
  const [statutFiltre,   setStatutFiltre]   = useState("all");

  // Calculs globaux
  const total    = rdvs.length;
  const tenus    = rdvs.filter(r=>r.statut==="confirme"||r.statut==="confirmed"||r.statut==="termine").length;
  const annules  = rdvs.filter(r=>r.statut==="annule"||r.statut==="cancelled").length;
  const enCours  = rdvs.filter(r=>r.statut==="en_attente"||r.statut==="pending").length;

  // RDV filtrés
  const rdvsFiltres = rdvs.filter(r => {
    const okClinique = cliniqueFiltre === "all" || String(r.clinique_id) === String(cliniqueFiltre);
    const okStatut   = statutFiltre   === "all" || r.statut === statutFiltre;
    return okClinique && okStatut;
  });

  // Stats par clinique
  const statsByClinique = cliniques.map(c => {
    const rdvsCli = rdvs.filter(r => String(r.clinique_id) === String(c.id));
    return {
      ...c,
      total:   rdvsCli.length,
      tenus:   rdvsCli.filter(r=>r.statut==="confirme"||r.statut==="confirmed"||r.statut==="termine").length,
      annules: rdvsCli.filter(r=>r.statut==="annule"||r.statut==="cancelled").length,
      enCours: rdvsCli.filter(r=>r.statut==="en_attente"||r.statut==="pending").length,
    };
  });

  const statutColor = (s) => s==="confirme"||s==="confirmed"||s==="termine" ? "#0A8F58" : s==="annule"||s==="cancelled" ? "#E11D48" : "#F59E0B";
  const statutLabel = (s) => s==="confirme"||s==="confirmed" ? "Tenu" : s==="termine" ? "Terminé" : s==="annule"||s==="cancelled" ? "Annulé" : "En attente";

  return (
    <div>
      <PageHeader title="📅 Gestion RDV Patient" subtitle="Suivi des rendez-vous pris via MediConnect RDV" />

      {/* KPIs globaux */}
      <Grid cols={4} gap={14} style={{marginBottom:24}}>
        {[
          ["Total RDV",    total,   "📅", "#2563EB", "Tous statuts confondus"],
          ["RDV Tenus",    tenus,   "✅", "#0A8F58", "Confirmés & terminés"],
          ["RDV Annulés",  annules, "❌", "#E11D48", "Annulés par patient/clinique"],
          ["En attente",   enCours, "⏳", "#F59E0B", "En cours de traitement"],
        ].map(([l,v,icon,c,sub])=>(
          <div key={l} style={{background:"#141E2B",border:`2px solid ${c}30`,borderRadius:14,padding:"20px 16px",textAlign:"center"}}>
            <div style={{fontSize:28,marginBottom:8}}>{icon}</div>
            <div style={{fontSize:36,fontWeight:900,color:c,marginBottom:4}}>{v}</div>
            <div style={{fontSize:13,fontWeight:700,color:"#F0F4F8",marginBottom:4}}>{l}</div>
            <div style={{fontSize:11,color:"#4E657A"}}>{sub}</div>
          </div>
        ))}
      </Grid>

      {/* Stats par clinique */}
      <div style={{background:"#141E2B",border:"1px solid #1E2F42",borderRadius:14,padding:20,marginBottom:24}}>
        <div style={{fontSize:14,fontWeight:800,color:"#F0F4F8",marginBottom:16}}>🏥 RDV par clinique</div>
        {statsByClinique.length === 0 ? (
          <div style={{textAlign:"center",color:"#4E657A",padding:"20px 0"}}>Aucune clinique enregistrée</div>
        ) : (
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr style={{borderBottom:"1px solid #1E2F42"}}>
                {["Clinique","Total","Tenus","Annulés","En attente","Taux tenu"].map(h=>(
                  <th key={h} style={{textAlign:"left",padding:"8px 12px",fontSize:11,color:"#4E657A",fontWeight:700,textTransform:"uppercase",letterSpacing:".5px"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {statsByClinique.map((c,i)=>(
                <tr key={c.id||i} style={{borderBottom:"1px solid #0E1620",cursor:"pointer"}}
                  onMouseOver={e=>e.currentTarget.style.background="#1A2535"}
                  onMouseOut={e=>e.currentTarget.style.background="transparent"}
                  onClick={()=>setCliniqueFiltre(String(c.id)===cliniqueFiltre?"all":String(c.id))}>
                  <td style={{padding:"12px",fontSize:14,fontWeight:700,color:"#F0F4F8"}}>{c.nom||"Clinique"}</td>
                  <td style={{padding:"12px",fontSize:14,fontWeight:700,color:"#2563EB"}}>{c.total}</td>
                  <td style={{padding:"12px",fontSize:14,fontWeight:700,color:"#0A8F58"}}>{c.tenus}</td>
                  <td style={{padding:"12px",fontSize:14,fontWeight:700,color:"#E11D48"}}>{c.annules}</td>
                  <td style={{padding:"12px",fontSize:14,fontWeight:700,color:"#F59E0B"}}>{c.enCours}</td>
                  <td style={{padding:"12px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{flex:1,height:6,background:"#1E2F42",borderRadius:3,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${c.total>0?Math.round(c.tenus/c.total*100):0}%`,background:"#0A8F58",borderRadius:3,transition:"width .3s"}}/>
                      </div>
                      <span style={{fontSize:12,color:"#0A8F58",fontWeight:700,minWidth:36}}>{c.total>0?Math.round(c.tenus/c.total*100):0}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Filtres */}
      <div style={{display:"flex",gap:12,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
        <span style={{fontSize:13,color:"#8BA0B5",fontWeight:600}}>Filtrer :</span>
        <select value={cliniqueFiltre} onChange={e=>setCliniqueFiltre(e.target.value)}
          style={{background:"#141E2B",border:"1px solid #1E2F42",color:"#F0F4F8",borderRadius:8,padding:"6px 12px",fontSize:13,fontFamily:"inherit",cursor:"pointer"}}>
          <option value="all">Toutes les cliniques</option>
          {cliniques.map(c=><option key={c.id} value={c.id}>{c.nom||"Clinique"}</option>)}
        </select>
        <select value={statutFiltre} onChange={e=>setStatutFiltre(e.target.value)}
          style={{background:"#141E2B",border:"1px solid #1E2F42",color:"#F0F4F8",borderRadius:8,padding:"6px 12px",fontSize:13,fontFamily:"inherit",cursor:"pointer"}}>
          <option value="all">Tous les statuts</option>
          <option value="confirme">Tenus</option>
          <option value="en_attente">En attente</option>
          <option value="annule">Annulés</option>
        </select>
        {(cliniqueFiltre!=="all"||statutFiltre!=="all") && (
          <button onClick={()=>{setCliniqueFiltre("all");setStatutFiltre("all");}}
            style={{background:"none",border:"1px solid #1E2F42",color:"#8BA0B5",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>
            ✕ Réinitialiser
          </button>
        )}
        <span style={{fontSize:12,color:"#4E657A",marginLeft:"auto"}}>{rdvsFiltres.length} résultat(s)</span>
      </div>

      {/* Liste RDV filtrée */}
      <div style={{background:"#141E2B",border:"1px solid #1E2F42",borderRadius:14,padding:20}}>
        <div style={{fontSize:14,fontWeight:800,color:"#F0F4F8",marginBottom:14}}>
          📋 Liste des RDV
          {cliniqueFiltre!=="all" && <span style={{fontSize:12,color:"#2563EB",fontWeight:400,marginLeft:8}}>— {cliniques.find(c=>String(c.id)===cliniqueFiltre)?.nom}</span>}
        </div>
        {isLoading ? <Loader /> : rdvsFiltres.length === 0 ? (
          <div style={{textAlign:"center",padding:"40px 0",color:"#4E657A"}}>
            <div style={{fontSize:40,marginBottom:12}}>📅</div>
            <div>Aucun RDV trouvé</div>
          </div>
        ) : (
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr style={{borderBottom:"1px solid #1E2F42"}}>
                {["N° RDV","Médecin","Clinique","Date","Statut"].map(h=>(
                  <th key={h} style={{textAlign:"left",padding:"8px 12px",fontSize:11,color:"#4E657A",fontWeight:700,textTransform:"uppercase",letterSpacing:".5px"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rdvsFiltres.map((rdv,i)=>{
                const sc = statutColor(rdv.statut);
                const sl = statutLabel(rdv.statut);
                const clinique = cliniques.find(c=>String(c.id)===String(rdv.clinique_id));
                return (
                  <tr key={rdv.id||i} style={{borderBottom:"1px solid #0E1620"}}>
                    <td style={{padding:"10px 12px",fontSize:13,fontWeight:700,color:"#2563EB",fontFamily:"monospace"}}>
                      #{rdv.reference||rdv.id||`RDV-${String(i+1).padStart(4,"0")}`}
                    </td>
                    <td style={{padding:"10px 12px",fontSize:13,color:"#F0F4F8"}}>
                      Dr. {rdv.medecin_prenom||""} {rdv.medecin_nom||rdv.medecin||"—"}
                    </td>
                    <td style={{padding:"10px 12px",fontSize:12,color:"#8BA0B5"}}>
                      {clinique?.nom||rdv.clinique_nom||"—"}
                    </td>
                    <td style={{padding:"10px 12px",fontSize:12,color:"#8BA0B5"}}>
                      {rdv.creneau ? new Date(rdv.creneau.split(" ")[0]).toLocaleDateString("fr-CI",{day:"numeric",month:"short",year:"numeric"})+" "+(rdv.creneau.split(" ")[1]||"") : rdv.date||"—"}
                    </td>
                    <td style={{padding:"10px 12px"}}>
                      <span style={{fontSize:11,background:sc+"20",color:sc,borderRadius:20,padding:"3px 10px",fontWeight:700}}>{sl}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  PAGE GESTION RDV PATIENTS
// ════════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════
//  PAGE ASSUREURS
// ════════════════════════════════════════════════════════════════════
function PageAssureurs() {
  const { data: usersData } = useQuery({ queryKey:["adm-users"], queryFn:()=>adminAPI.users().then(r=>r.data.data||[]) });
  const assureurs = (usersData||[]).filter(u=>u.role==="assureur");
  return (
    <div>
      <PageHeader title="🛡️ Assureurs API" subtitle={`${assureurs.length} assureur(s) connecté(s)`} />
      <Panel title="Compagnies d'assurance partenaires">
        {assureurs.length === 0
          ? <Empty icon="🛡️" title="Aucun assureur enregistré" subtitle="Les assureurs se connectent via leur espace dédié" />
          : <Table
              columns={[
                {key:"prenom",label:"Assureur",render:(v,r)=><><div style={{fontWeight:700}}>{v} {r.nom}</div><div style={{fontSize:11,color:"#8BA0B5"}}>{r.email}</div></>},
                {key:"telephone",label:"Téléphone"},
                {key:"ville",label:"Ville"},
                {key:"is_active",label:"Statut",render:v=><Badge color={v?"green":"red"}>{v?"Actif":"Inactif"}</Badge>},
              ]}
              rows={assureurs}
            />
        }
      </Panel>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  ROUTER
// ════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  return (
    <Routes>
      <Route index                    element={<DashboardHome />} />
      <Route path="etablissements"    element={<PageEtablissements />} />
      <Route path="patients"          element={<PagePatients />} />
      <Route path="livreurs"          element={<PageLivreurs />} />
      <Route path="rdv-patients"      element={<PageGestionRDV />} />
      <Route path="rapports"          element={<PageRapports />} />
      <Route path="assureurs"         element={<PageAssureurs />} />
      <Route path="*"                 element={<DashboardHome />} />
    </Routes>
  );
}
