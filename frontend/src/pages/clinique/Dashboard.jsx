import React, { useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { cliniqueAPI, consultationAPI, caisseAPI } from '../../services/api';
import { Card, Modal, Input, Textarea, Select, Btn, Badge, Table, Panel, ListItem, Avatar, Grid, PageHeader, SectionLabel, Loader, Empty, ProgressBar } from '../../components/common/UI';

const fmt = (n) => Number(n || 0).toLocaleString('fr-CI');
const today = () => new Date().toISOString().split('T')[0];
const stBadge = (st) => ({ confirme:'green', en_cours:'teal', en_attente:'amber', termine:'gray', annule:'red', Disponible:'green', 'En consultation':'teal', Congé:'amber' })[st] || 'gray';

// ── DASHBOARD HOME ────────────────────────────────────────────────
function DashboardHome() {
  const nav = useNavigate();
  const { data: stats, isLoading } = useQuery({ queryKey: ['cl-stats'], queryFn: () => cliniqueAPI.stats().then(r => r.data.data) });
  const { data: rdvsData } = useQuery({ queryKey: ['cl-rdvs'], queryFn: () => cliniqueAPI.rdvs({ date: today() }).then(r => r.data.data || []) });
  if (isLoading) return <Loader />;
  const s = stats || {};
  const rdvs = rdvsData || [];
  return (
    <div>
      <PageHeader title="Dashboard Clinique" subtitle={new Date().toLocaleDateString("fr-CI", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} />

      {/* Rappel tarifaire */}
      <div style={{ background:"rgba(13,148,136,.05)",border:"1px solid rgba(13,148,136,.15)",borderRadius:10,padding:"10px 18px",marginBottom:20,display:"flex",alignItems:"center",gap:12,fontSize:12 }}>
        <span style={{fontSize:18}}>ℹ️</span>
        <span style={{color:"#8BA0B5"}}>
          Votre abonnement MediConnect : <strong style={{color:"#0D9488"}}>3 000 FCFA/mois</strong> · Mise en service : <strong style={{color:"#F0F4F8"}}>100 000 FCFA</strong> (one-time) ·
          Patients : <strong style={{color:"#0A8F58"}}>300 FCFA/mois</strong> standard · <strong style={{color:"#0A8F58"}}>500 FCFA/mois</strong> avec suivi privé
        </span>
      </div>

      <Grid cols={4} gap={14} style={{ marginBottom: 24 }}>
        <Card label="RDV aujourd'hui" value={s.rdv_today ?? 0} icon="📅" color="#0A8F58" sub="Rendez-vous" />
        <Card label="Médecins actifs" value={s.medecins_actifs ?? 0} icon="👨‍⚕️" color="#0D9488" sub="Disponibles" />
        <Card label="Alertes stock" value={s.stock_alertes ?? 0} icon="⚠️" color="#E11D48" sub="À réapprovisionner" />
        <Card label="Dossiers rejetés" value={s.dossiers_rejetes ?? 0} icon="🛡️" color="#D97706" sub="Par les assureurs" />
      </Grid>
      <Grid cols={2} gap={20}>
        <Panel title="📅 RDV du jour" actions={<Btn variant="outline" style={{ padding: "6px 14px", fontSize: 12 }} onClick={() => nav("planning")}>Voir tout →</Btn>}>
          {rdvs.length === 0 ? <Empty icon="📅" title="Aucun RDV aujourd'hui" /> : rdvs.slice(0, 5).map(r => (
            <ListItem key={r.id}
              left={<div style={{ width: 44, fontSize: 11, fontFamily: "monospace", color: "#4E657A" }}>{r.heure_rdv?.slice(0,5)}</div>}
              center={<><div style={{ fontSize: 13, fontWeight: 700, color: "#F0F4F8" }}>{r.patient_nom}</div><div style={{ fontSize: 11, color: "#8BA0B5" }}>{r.medecin_nom} · {r.motif}</div></>}
              right={<Badge color={stBadge(r.statut)}>{r.statut}</Badge>}
            />
          ))}
        </Panel>
        <Panel title="⚡ Accès rapide" accent="green">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[["🩺","Consultation","consultation"],["💰","Caisse","caisse"],["📅","Planning","planning"],["🧾","Facturation","facturation"],["👤","Patients","emr"],["💊","Stock","stock"]].map(([icon,label,path]) => (
              <button key={path} onClick={() => nav(path)} style={{ background: "#1A2535", border: "1px solid #1E2F42", borderRadius: 10, padding: "12px", cursor: "pointer", textAlign: "center" }}
                onMouseOver={e => e.currentTarget.style.borderColor = "#0A8F58"} onMouseOut={e => e.currentTarget.style.borderColor = "#1E2F42"}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
                <div style={{ fontSize: 12, color: "#F0F4F8", fontWeight: 600 }}>{label}</div>
              </button>
            ))}
          </div>
        </Panel>
      </Grid>
    </div>
  );
}

// ── PLANNING ──────────────────────────────────────────────────────
function PagePlanning() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ patient_nom: "", medecin_nom: "", date_rdv: today(), heure_rdv: "09:00", motif: "", assurance: "" });
  const { data } = useQuery({ queryKey: ["cl-rdvs-all"], queryFn: () => cliniqueAPI.rdvs({}).then(r => r.data.data || []) });
  const { data: medsData } = useQuery({ queryKey: ["cl-medecins"], queryFn: () => cliniqueAPI.medecins().then(r => r.data.data || []) });
  const addMut = useMutation({ mutationFn: d => cliniqueAPI.addRdv(d), onSuccess: () => { toast.success("RDV créé !"); qc.invalidateQueries(["cl-rdvs-all"]); setShowAdd(false); }, onError: e => toast.error(e.response?.data?.message || "Erreur") });
  const delMut = useMutation({ mutationFn: id => cliniqueAPI.deleteRdv(id), onSuccess: () => { toast.success("RDV annulé"); qc.invalidateQueries(["cl-rdvs-all"]); } });
  const updMut = useMutation({ mutationFn: ({ id, statut }) => cliniqueAPI.updateRdv(id, { statut }), onSuccess: () => { toast.success("Statut mis à jour"); qc.invalidateQueries(["cl-rdvs-all"]); } });
  const rdvs = data || []; const meds = medsData || [];
  return (
    <div>
      <PageHeader title="📅 Planning & Rendez-vous" subtitle={`${rdvs.length} rendez-vous`} actions={<Btn onClick={() => setShowAdd(true)}>+ Nouveau RDV</Btn>} />
      <Panel>
        <Table emptyMessage="Aucun rendez-vous" columns={[
          { key: "heure_rdv", label: "Heure", render: v => <span style={{ fontFamily: "monospace", color: "#0A8F58" }}>{v?.slice(0,5)}</span> },
          { key: "date_rdv", label: "Date" },
          { key: "patient_nom", label: "Patient", render: (v,r) => <><div style={{ fontWeight: 700 }}>{v || r.patient_id}</div><div style={{ fontSize: 11, color: "#8BA0B5" }}>{r.motif}</div></> },
          { key: "medecin_nom", label: "Médecin" },
          { key: "assurance", label: "Assurance", render: v => v || "—" },
          { key: "statut", label: "Statut", render: v => <Badge color={stBadge(v)}>{v}</Badge> },
          { key: "id", label: "Actions", render: (id, row) => (
            <div style={{ display: "flex", gap: 6 }}>
              {row.statut === "en_attente" && <Btn variant="teal" style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => updMut.mutate({ id, statut: "confirme" })}>✓ Confirmer</Btn>}
              {row.statut === "confirme" && <Btn variant="ghost" style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => updMut.mutate({ id, statut: "en_cours" })}>▶ Démarrer</Btn>}
              {row.statut === "en_cours" && <Btn variant="outline" style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => updMut.mutate({ id, statut: "termine" })}>✓ Terminer</Btn>}
              <Btn variant="outline" style={{ padding: "5px 10px", fontSize: 11, color: "#E11D48" }} onClick={() => window.confirm("Annuler ce RDV ?") && delMut.mutate(id)}>✕</Btn>
            </div>
          )},
        ]} rows={rdvs} />
      </Panel>
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nouveau rendez-vous">
        <Grid cols={2} gap={12}>
          <Input label="Patient *" required value={form.patient_nom} onChange={e => setForm(p => ({ ...p, patient_nom: e.target.value }))} placeholder="Konan Jean" />
          <Select label="Médecin" value={form.medecin_nom} onChange={e => setForm(p => ({ ...p, medecin_nom: e.target.value }))} options={[{ value: "", label: "— Sélectionner —" }, ...meds.map(m => ({ value: `${m.prenom} ${m.nom}`, label: `Dr. ${m.prenom} ${m.nom} — ${m.specialite}` }))]} />
        </Grid>
        <Grid cols={2} gap={12}>
          <Input label="Date *" required type="date" value={form.date_rdv} onChange={e => setForm(p => ({ ...p, date_rdv: e.target.value }))} />
          <Select label="Heure" value={form.heure_rdv} onChange={e => setForm(p => ({ ...p, heure_rdv: e.target.value }))} options={["08:00","08:30","09:00","09:30","10:00","10:30","11:00","14:00","14:30","15:00","15:30","16:00"]} />
        </Grid>
        <Input label="Motif" value={form.motif} onChange={e => setForm(p => ({ ...p, motif: e.target.value }))} placeholder="Ex: Suivi HTA" />
        <Select label="Assurance" value={form.assurance} onChange={e => setForm(p => ({ ...p, assurance: e.target.value }))} options={[{ value: "", label: "Aucune" }, "NSIA Assurances", "Allianz CI", "AXA CI", "CNAM (CMU)"]} />
        <div style={{ display: "flex", gap: 10 }}>
          <Btn variant="outline" style={{ flex: 1 }} onClick={() => setShowAdd(false)}>Annuler</Btn>
          <Btn style={{ flex: 2 }} loading={addMut.isPending} onClick={() => { if (!form.patient_nom) { toast.error("Patient requis"); return; } addMut.mutate(form); }}>Créer le RDV</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ── MÉDECINS ──────────────────────────────────────────────────────
function PageMedecins() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ prenom: "", nom: "", specialite: "Cardiologie", tarif: 20000, experience_ans: 5, numero_ordre: "", horaires_debut: "08:00", horaires_fin: "17:00" });
  const { data, isLoading } = useQuery({ queryKey: ["cl-medecins"], queryFn: () => cliniqueAPI.medecins().then(r => r.data.data || []) });
  const addMut = useMutation({ mutationFn: d => cliniqueAPI.addMedecin(d), onSuccess: () => { toast.success("Médecin ajouté !"); qc.invalidateQueries(["cl-medecins"]); setShowAdd(false); }, onError: e => toast.error(e.response?.data?.message || "Erreur") });
  const delMut = useMutation({ mutationFn: id => cliniqueAPI.deleteMedecin(id), onSuccess: () => { toast.success("Médecin retiré"); qc.invalidateQueries(["cl-medecins"]); } });
  const updMut = useMutation({ mutationFn: ({ id, statut }) => cliniqueAPI.updateMedecin(id, { statut }), onSuccess: () => { toast.success("Statut mis à jour"); qc.invalidateQueries(["cl-medecins"]); } });
  const meds = data || [];
  const specs = ["Cardiologie","Pédiatrie","Gynécologie","Dermatologie","Neurologie","Médecine générale","Chirurgie","Ophtalmologie","ORL"];
  return (
    <div>
      <PageHeader title="👨‍⚕️ Médecins & RH" subtitle={`${meds.length} médecins`} actions={<Btn onClick={() => setShowAdd(true)}>+ Ajouter</Btn>} />
      {isLoading ? <Loader /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {meds.length === 0 && <div style={{ gridColumn: "1/-1" }}><Empty icon="👨‍⚕️" title="Aucun médecin" subtitle="Ajoutez votre premier médecin" /></div>}
          {meds.map(m => (
            <Panel key={m.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <Avatar text={`${m.prenom[0]}${m.nom[0]}`} size={44} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#F0F4F8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Dr. {m.prenom} {m.nom}</div>
                  <div style={{ fontSize: 12, color: "#8BA0B5" }}>{m.specialite}</div>
                </div>
                <Badge color={stBadge(m.statut)}>{m.statut}</Badge>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, fontSize: 12, marginBottom: 12 }}>
                {[["Expérience", `${m.experience_ans} ans`], ["Tarif", `${fmt(m.tarif)} F`], ["Horaires", `${m.horaires_debut?.slice(0,5)}–${m.horaires_fin?.slice(0,5)}`]].map(([k, v]) => (
                  <div key={k}><span style={{ color: "#4E657A" }}>{k} : </span><span style={{ fontWeight: 600 }}>{v}</span></div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn variant="outline" style={{ flex: 1, padding: "7px", fontSize: 12 }} onClick={() => updMut.mutate({ id: m.id, statut: m.statut === "Congé" ? "Disponible" : "Congé" })}>{m.statut === "Congé" ? "✓ Réactiver" : "☀ Congé"}</Btn>
                <Btn variant="outline" style={{ padding: "7px 12px", fontSize: 12, color: "#E11D48" }} onClick={() => window.confirm(`Retirer Dr. ${m.nom} ?`) && delMut.mutate(m.id)}>✕</Btn>
              </div>
            </Panel>
          ))}
        </div>
      )}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Ajouter un médecin">
        <Grid cols={2} gap={12}><Input label="Prénom *" required value={form.prenom} onChange={e => setForm(p => ({ ...p, prenom: e.target.value }))} /><Input label="Nom *" required value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} /></Grid>
        <Select label="Spécialité *" required value={form.specialite} onChange={e => setForm(p => ({ ...p, specialite: e.target.value }))} options={specs} />
        <Grid cols={2} gap={12}><Input label="Tarif (FCFA)" type="number" value={form.tarif} onChange={e => setForm(p => ({ ...p, tarif: +e.target.value }))} /><Input label="Expérience (ans)" type="number" value={form.experience_ans} onChange={e => setForm(p => ({ ...p, experience_ans: +e.target.value }))} /></Grid>
        <Grid cols={2} gap={12}><Input label="Heure début" type="time" value={form.horaires_debut} onChange={e => setForm(p => ({ ...p, horaires_debut: e.target.value }))} /><Input label="Heure fin" type="time" value={form.horaires_fin} onChange={e => setForm(p => ({ ...p, horaires_fin: e.target.value }))} /></Grid>
        <Input label="N° Ordre médical" value={form.numero_ordre} onChange={e => setForm(p => ({ ...p, numero_ordre: e.target.value }))} placeholder="OM-2020-XXXXX" />
        <div style={{ display: "flex", gap: 10 }}><Btn variant="outline" style={{ flex: 1 }} onClick={() => setShowAdd(false)}>Annuler</Btn><Btn style={{ flex: 2 }} loading={addMut.isPending} onClick={() => { if (!form.prenom || !form.nom) { toast.error("Prénom et nom requis"); return; } addMut.mutate(form); }}>Ajouter</Btn></div>
      </Modal>
    </div>
  );
}

// ── EMR ───────────────────────────────────────────────────────────
function PageEMR() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ prenom: "", nom: "", date_naissance: "", sexe: "M", groupe_sanguin: "O+", telephone: "", allergies: "" });
  const { data, isLoading } = useQuery({ queryKey: ["cl-patients"], queryFn: () => cliniqueAPI.patients().then(r => r.data.data || []) });
  const addMut = useMutation({ mutationFn: d => cliniqueAPI.addPatient(d), onSuccess: () => { toast.success("Dossier créé !"); qc.invalidateQueries(["cl-patients"]); setShowAdd(false); }, onError: e => toast.error(e.response?.data?.message || "Erreur") });
  const delMut = useMutation({ mutationFn: id => cliniqueAPI.deletePatient(id), onSuccess: () => { toast.success("Dossier archivé"); qc.invalidateQueries(["cl-patients"]); } });
  const patients = (data || []).filter(p => !search || (p.user_nom || "").toLowerCase().includes(search.toLowerCase()) || (p.code_secret || "").includes(search.toUpperCase()));
  return (
    <div>
      <PageHeader title="👤 Dossiers Patients — EMR" subtitle={`${(data||[]).length} patients`} actions={<Btn onClick={() => setShowAdd(true)}>+ Nouveau dossier</Btn>} />
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Nom ou code secret (MC-XX-XXXX)…" style={{ width: "100%", background: "#141E2B", border: "1.5px solid #1E2F42", borderRadius: 10, padding: "10px 14px", color: "#F0F4F8", fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 16 }} />
      {isLoading ? <Loader /> : (
        <Panel>{patients.length === 0 ? <Empty icon="👤" title="Aucun patient" /> : patients.map(p => (
          <ListItem key={p.id}
            left={<Avatar text={(p.user_nom || "PA").slice(0, 2)} />}
            center={<><div style={{ fontSize: 13, fontWeight: 700, color: "#F0F4F8" }}>{p.user_nom || "—"}</div><div style={{ fontSize: 11, color: "#8BA0B5" }}>🩸 {p.groupe_sanguin} · ⚠️ {p.allergies?.join(", ") || "Aucune allergie"}</div></>}
            right={<>
              <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 800, color: "#0A8F58", background: "rgba(10,143,88,.12)", padding: "4px 12px", borderRadius: 8, letterSpacing: 2 }}>{p.code_secret}</span>
              <Btn variant="outline" style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => { navigator.clipboard.writeText(p.code_secret); toast.success("Code copié !"); }}>📋</Btn>
              <Btn variant="outline" style={{ padding: "5px 10px", fontSize: 11, color: "#E11D48" }} onClick={() => window.confirm("Archiver ce dossier ?") && delMut.mutate(p.id)}>✕</Btn>
            </>}
          />
        ))}</Panel>
      )}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nouveau dossier patient">
        <Grid cols={2} gap={12}><Input label="Prénom *" required value={form.prenom} onChange={e => setForm(p => ({ ...p, prenom: e.target.value }))} /><Input label="Nom *" required value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} /></Grid>
        <Grid cols={2} gap={12}><Input label="Date naissance" type="date" value={form.date_naissance} onChange={e => setForm(p => ({ ...p, date_naissance: e.target.value }))} /><Select label="Sexe" value={form.sexe} onChange={e => setForm(p => ({ ...p, sexe: e.target.value }))} options={[{ value: "M", label: "Masculin" }, { value: "F", label: "Féminin" }]} /></Grid>
        <Grid cols={2} gap={12}><Select label="Groupe sanguin" value={form.groupe_sanguin} onChange={e => setForm(p => ({ ...p, groupe_sanguin: e.target.value }))} options={["O+","O-","A+","A-","B+","B-","AB+","AB-"]} /><Input label="Téléphone" value={form.telephone} onChange={e => setForm(p => ({ ...p, telephone: e.target.value }))} placeholder="+225 07 00 00 00 00" /></Grid>
        <Input label="Allergies (virgule pour séparer)" value={form.allergies} onChange={e => setForm(p => ({ ...p, allergies: e.target.value }))} placeholder="Pénicilline, Aspirine…" />
        <div style={{ display: "flex", gap: 10 }}><Btn variant="outline" style={{ flex: 1 }} onClick={() => setShowAdd(false)}>Annuler</Btn><Btn style={{ flex: 2 }} loading={addMut.isPending} onClick={() => { if (!form.prenom || !form.nom) { toast.error("Prénom et nom requis"); return; } addMut.mutate({ ...form, allergies: form.allergies ? form.allergies.split(",").map(a => a.trim()) : [] }); }}>Créer le dossier</Btn></div>
      </Modal>
    </div>
  );
}

// ── STOCK ─────────────────────────────────────────────────────────
function PageStock() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ nom: "", categorie: "Antibiotique", fournisseur: "", quantite: 100, seuil_alerte: 50, prix_unitaire: 500, numero_lot: "", date_expiration: "" });
  const { data, isLoading } = useQuery({ queryKey: ["cl-stock"], queryFn: () => cliniqueAPI.stock().then(r => r.data.data || []) });
  const addMut = useMutation({ mutationFn: d => cliniqueAPI.addStock(d), onSuccess: () => { toast.success("Article ajouté !"); qc.invalidateQueries(["cl-stock"]); setShowAdd(false); }, onError: e => toast.error(e.response?.data?.message || "Erreur") });
  const delMut = useMutation({ mutationFn: id => cliniqueAPI.deleteStock(id), onSuccess: () => { toast.success("Supprimé"); qc.invalidateQueries(["cl-stock"]); } });
  const updMut = useMutation({ mutationFn: ({ id, quantite }) => cliniqueAPI.updateStock(id, { quantite }), onSuccess: () => { toast.success("Stock mis à jour"); qc.invalidateQueries(["cl-stock"]); } });
  const stock = (data || []).filter(s => !search || s.nom.toLowerCase().includes(search.toLowerCase()));
  const cats = ["Antibiotique","Antidouleur","Anti-inflammatoire","Vitamines","Perfusion","Antiseptique","Consommable","Autre"];
  return (
    <div>
      <PageHeader title="💊 Gestion du Stock" subtitle={`${(data||[]).length} références · ${stock.filter(s => s.quantite < s.seuil_alerte).length} en alerte`} actions={<Btn onClick={() => setShowAdd(true)}>+ Ajouter article</Btn>} />
      <Grid cols={4} gap={14} style={{ marginBottom: 20 }}>
        <Card label="Références" value={(data||[]).length} icon="📦" />
        <Card label="Valeur totale" value={`${fmt((data||[]).reduce((s,a) => s+(+a.quantite)*(+a.prix_unitaire),0)/1000)}k F`} icon="💰" color="#0D9488" />
        <Card label="Alertes" value={stock.filter(s => s.quantite < s.seuil_alerte).length} icon="⚠️" color="#E11D48" />
        <Card label="Valeur alertes" value={`${fmt(stock.filter(s => s.quantite < s.seuil_alerte).reduce((s,a) => s+(+a.seuil_alerte)*(+a.prix_unitaire),0)/1000)}k F`} icon="📋" color="#D97706" />
      </Grid>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Rechercher…" style={{ width: "100%", background: "#141E2B", border: "1.5px solid #1E2F42", borderRadius: 10, padding: "10px 14px", color: "#F0F4F8", fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 16 }} />
      {isLoading ? <Loader /> : (
        <Panel>{stock.length === 0 ? <Empty icon="💊" title="Aucun article en stock" /> : stock.map(s => {
          const pct = Math.min(100, Math.round((s.quantite / (s.seuil_alerte || 1)) * 100));
          const col = pct < 30 ? "#E11D48" : pct < 70 ? "#D97706" : "#0A8F58";
          return (
            <ListItem key={s.id}
              left={<span style={{ fontSize: 24 }}>💊</span>}
              center={<><div style={{ fontSize: 13, fontWeight: 700, color: "#F0F4F8" }}>{s.nom}</div><div style={{ fontSize: 11, color: "#8BA0B5" }}>{s.categorie} · {s.fournisseur || "—"} · PU : {fmt(s.prix_unitaire)} F</div><ProgressBar value={s.quantite} max={Math.max(s.seuil_alerte * 2, s.quantite)} color={col} /></>}
              right={<>
                <div style={{ textAlign: "center", minWidth: 70 }}><div style={{ fontSize: 18, fontWeight: 800, color: col }}>{s.quantite}</div><div style={{ fontSize: 10, color: "#4E657A" }}>/ min {s.seuil_alerte}</div></div>
                <Btn variant="outline" style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => { const q = window.prompt(`Quantité pour "${s.nom}" (actuel: ${s.quantite}):`, s.quantite); if (q && !isNaN(+q)) updMut.mutate({ id: s.id, quantite: +q }); }}>✏️</Btn>
                {s.quantite < s.seuil_alerte && <Btn variant="amber" style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => toast.success(`Commande envoyée à ${s.fournisseur || "fournisseur"} !`)}>Commander</Btn>}
                <Btn variant="outline" style={{ padding: "5px 10px", fontSize: 11, color: "#E11D48" }} onClick={() => window.confirm(`Supprimer "${s.nom}" ?`) && delMut.mutate(s.id)}>✕</Btn>
              </>}
            />
          );
        })}</Panel>
      )}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Ajouter un article">
        <Input label="Nom *" required value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} placeholder="Ex: Amoxicilline 500mg" />
        <Grid cols={2} gap={12}><Select label="Catégorie" value={form.categorie} onChange={e => setForm(p => ({ ...p, categorie: e.target.value }))} options={cats} /><Input label="Fournisseur" value={form.fournisseur} onChange={e => setForm(p => ({ ...p, fournisseur: e.target.value }))} placeholder="LABOREX CI" /></Grid>
        <Grid cols={2} gap={12}><Input label="Quantité initiale *" required type="number" value={form.quantite} onChange={e => setForm(p => ({ ...p, quantite: +e.target.value }))} /><Input label="Seuil alerte *" required type="number" value={form.seuil_alerte} onChange={e => setForm(p => ({ ...p, seuil_alerte: +e.target.value }))} /></Grid>
        <Grid cols={2} gap={12}><Input label="Prix unitaire (FCFA)" type="number" value={form.prix_unitaire} onChange={e => setForm(p => ({ ...p, prix_unitaire: +e.target.value }))} /><Input label="Date expiration" type="month" value={form.date_expiration} onChange={e => setForm(p => ({ ...p, date_expiration: e.target.value }))} /></Grid>
        <Input label="N° de lot" value={form.numero_lot} onChange={e => setForm(p => ({ ...p, numero_lot: e.target.value }))} placeholder="LOT-2025-XXX" />
        <div style={{ display: "flex", gap: 10 }}><Btn variant="outline" style={{ flex: 1 }} onClick={() => setShowAdd(false)}>Annuler</Btn><Btn style={{ flex: 2 }} loading={addMut.isPending} onClick={() => { if (!form.nom) { toast.error("Nom obligatoire"); return; } addMut.mutate(form); }}>Ajouter</Btn></div>
      </Modal>
    </div>
  );
}

// ── FACTURATION ───────────────────────────────────────────────────
function PageFacturation() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ patient_nom: "", montant_total: 25000, mode_paiement: "Espèces" });
  const { data, isLoading } = useQuery({ queryKey: ["cl-factures"], queryFn: () => cliniqueAPI.factures().then(r => r.data.data || []) });
  const addMut = useMutation({ mutationFn: d => cliniqueAPI.addFacture(d), onSuccess: () => { toast.success("Facture créée !"); qc.invalidateQueries(["cl-factures"]); setShowAdd(false); }, onError: e => toast.error(e.response?.data?.message || "Erreur") });
  const updMut = useMutation({ mutationFn: ({ id, statut }) => cliniqueAPI.updateFacture(id, { statut }), onSuccess: () => { toast.success("Mis à jour"); qc.invalidateQueries(["cl-factures"]); } });
  const delMut = useMutation({ mutationFn: id => cliniqueAPI.deleteFacture(id), onSuccess: () => { toast.success("Supprimée"); qc.invalidateQueries(["cl-factures"]); } });
  const factures = data || [];
  return (
    <div>
      <PageHeader title="🧾 Facturation" subtitle="CA · Tiers-payant · Créances" actions={<Btn onClick={() => setShowAdd(true)}>+ Nouvelle facture</Btn>} />
      <Grid cols={4} gap={14} style={{ marginBottom: 20 }}>
        <Card label="CA total" value={`${fmt(factures.reduce((s,f) => s+(+f.montant_total||0),0))} F`} icon="💰" color="#0A8F58" />
        <Card label="Factures payées" value={factures.filter(f => f.statut === "payee").length} icon="✅" color="#0D9488" />
        <Card label="En attente" value={factures.filter(f => f.statut === "en_attente").length} icon="⏳" color="#D97706" />
        <Card label="Montant en attente" value={`${fmt(factures.filter(f => f.statut === "en_attente").reduce((s,f) => s+(+f.montant_total||0),0))} F`} icon="📋" color="#D97706" />
      </Grid>
      {isLoading ? <Loader /> : (
        <Panel><Table emptyMessage="Aucune facture" columns={[
          { key: "reference", label: "Réf.", render: v => <span style={{ fontFamily: "monospace", fontSize: 12, color: "#0A8F58" }}>{v || "—"}</span> },
          { key: "patient_nom", label: "Patient", render: (v, r) => <><div style={{ fontWeight: 700 }}>{v || r.patient_id}</div><div style={{ fontSize: 11, color: "#8BA0B5" }}>{r.mode_paiement}</div></> },
          { key: "montant_total", label: "Total", render: v => <span style={{ fontWeight: 700, color: "#0A8F58" }}>{fmt(v)} F</span> },
          { key: "montant_assur", label: "Ass.", render: v => <span style={{ color: "#0D9488" }}>{fmt(v)} F</span> },
          { key: "ticket_moder", label: "Patient", render: v => <span style={{ color: "#D97706" }}>{fmt(v)} F</span> },
          { key: "statut", label: "Statut", render: v => <Badge color={v === "payee" ? "green" : v === "annulee" ? "red" : "amber"}>{v === "payee" ? "Payée" : v === "annulee" ? "Annulée" : "En attente"}</Badge> },
          { key: "id", label: "Actions", render: (id, row) => (
            <div style={{ display: "flex", gap: 6 }}>
              {row.statut === "en_attente" && <Btn variant="teal" style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => updMut.mutate({ id, statut: "payee" })}>✓ Réglée</Btn>}
              <Btn variant="outline" style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => toast.success("PDF en génération…")}>📄</Btn>
              <Btn variant="outline" style={{ padding: "5px 10px", fontSize: 11, color: "#E11D48" }} onClick={() => window.confirm("Supprimer ?") && delMut.mutate(id)}>✕</Btn>
            </div>
          )},
        ]} rows={factures} /></Panel>
      )}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nouvelle facture">
        <Input label="Patient *" required value={form.patient_nom} onChange={e => setForm(p => ({ ...p, patient_nom: e.target.value }))} placeholder="Nom du patient" />
        <Grid cols={2} gap={12}><Input label="Montant total (FCFA) *" required type="number" value={form.montant_total} onChange={e => setForm(p => ({ ...p, montant_total: +e.target.value }))} /><Select label="Mode de paiement" value={form.mode_paiement} onChange={e => setForm(p => ({ ...p, mode_paiement: e.target.value }))} options={["Espèces","Wave","Orange Money","Tiers-payant NSIA","Tiers-payant Allianz","Tiers-payant AXA","Chèque"]} /></Grid>
        <div style={{ display: "flex", gap: 10 }}><Btn variant="outline" style={{ flex: 1 }} onClick={() => setShowAdd(false)}>Annuler</Btn><Btn style={{ flex: 2 }} loading={addMut.isPending} onClick={() => { if (!form.patient_nom || !form.montant_total) { toast.error("Patient et montant requis"); return; } const isTiers = form.mode_paiement.startsWith("Tiers"); addMut.mutate({ ...form, montant_assur: isTiers ? Math.round(form.montant_total*.8) : 0, ticket_moder: isTiers ? Math.round(form.montant_total*.2) : form.montant_total }); }}>Créer</Btn></div>
      </Modal>
    </div>
  );
}

// ── CONSULTATION ──────────────────────────────────────────────────
function PageConsultation() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [codeSearch, setCodeSearch] = useState("");
  const [codeResult, setCodeResult] = useState(null);
  const [prescs, setPrescs] = useState([]);
  const [ordo, setOrdo] = useState([]);
  const [form, setForm] = useState({ patient_id: "", medecin_id: "", motif: "", date_consult: today(), ta: "", fc: "", spo2: "", temperature: "", poids: "", taille: "", examen_clinique: "", diagnostic: "", code_cim10: "", note_finale: "", statut: "finalisee" });
  const { data: cons } = useQuery({ queryKey: ["cl-cons"], queryFn: () => consultationAPI.liste().then(r => r.data.data || []) });
  const { data: pats } = useQuery({ queryKey: ["cl-patients"], queryFn: () => cliniqueAPI.patients().then(r => r.data.data || []) });
  const { data: meds } = useQuery({ queryKey: ["cl-medecins"], queryFn: () => cliniqueAPI.medecins().then(r => r.data.data || []) });
  const creerMut = useMutation({ mutationFn: d => consultationAPI.creer(d), onSuccess: () => { toast.success("Consultation signée !"); qc.invalidateQueries(["cl-cons"]); setShowAdd(false); setPrescs([]); setOrdo([]); setForm({ patient_id:"",medecin_id:"",motif:"",date_consult:today(),ta:"",fc:"",spo2:"",temperature:"",poids:"",taille:"",examen_clinique:"",diagnostic:"",code_cim10:"",note_finale:"",statut:"finalisee" }); }, onError: e => toast.error(e.response?.data?.message || "Erreur") });
  const searchCode = async () => { if (!codeSearch.trim()) return; try { const { data } = await consultationAPI.parCode(codeSearch.trim().toUpperCase()); setCodeResult(data); } catch { toast.error("Code non reconnu."); setCodeResult(null); } };
  const addPresc = (type) => setPrescs(p => [...p, { id: Date.now(), type, label: "" }]);
  const addMed = () => setOrdo(o => [...o, { id: Date.now(), med: "", posologie: "", duree: "30 jours" }]);
  return (
    <div>
      <PageHeader title="🩺 Consultation médicale" subtitle="Diagnostic · Prescriptions · Ordonnance · Code patient" actions={<Btn onClick={() => setShowAdd(true)}>+ Nouvelle consultation</Btn>} />
      <Panel title="🔑 Accès par code secret patient" accent="green" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
          <input value={codeSearch} onChange={e => setCodeSearch(e.target.value.toUpperCase())} onKeyDown={e => e.key === "Enter" && searchCode()} placeholder="Ex: MC-KJ-4782" style={{ flex: 1, background: "#1A2535", border: "1.5px solid #1E2F42", borderRadius: 9, padding: "10px 14px", color: "#F0F4F8", fontSize: 15, fontFamily: "monospace", letterSpacing: 2, outline: "none" }} />
          <Btn onClick={searchCode}>Accéder →</Btn>
        </div>
        {codeResult && (
          <div style={{ background: "rgba(10,143,88,.07)", border: "1px solid rgba(10,143,88,.25)", borderRadius: 10, padding: 14 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#F0F4F8", marginBottom: 6 }}>{codeResult.patient.prenom} {codeResult.patient.nom} <span style={{ marginLeft: 8, background: "#0A8F58", color: "#fff", fontSize: 11, padding: "2px 10px", borderRadius: 12 }}>✓ Autorisé</span></div>
            <div style={{ fontSize: 12, color: "#8BA0B5", marginBottom: 10 }}>{codeResult.consultations.length} consultation(s)</div>
            {codeResult.consultations.slice(0, 2).map(c => (
              <div key={c.id} style={{ background: "#1A2535", borderRadius: 8, padding: 10, marginBottom: 6, borderLeft: "3px solid #0A8F58" }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{c.date_consult} — {c.medecin_nom}</div>
                <div style={{ color: "#8BA0B5", fontSize: 12 }}>📋 {c.diagnostic?.slice(0, 80)}</div>
                {c.ordonnance?.length > 0 && <div style={{ color: "#0A8F58", fontSize: 12 }}>💊 {c.ordonnance.map(o => o.medicament).join(" · ")}</div>}
              </div>
            ))}
          </div>
        )}
      </Panel>
      <Grid cols={2} gap={20}>
        <Panel title="🔑 Codes secrets des patients">
          {(pats||[]).length === 0 ? <Empty icon="👤" title="Aucun patient" /> : (pats||[]).map(p => (
            <ListItem key={p.id} left={<Avatar text={(p.user_nom||"PA").slice(0,2)} size={34} />}
              center={<div style={{ fontSize: 13, fontWeight: 600, color: "#F0F4F8" }}>{p.user_nom || "—"}</div>}
              right={<><span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 800, color: "#0A8F58", background: "rgba(10,143,88,.12)", padding: "3px 10px", borderRadius: 8, letterSpacing: 2 }}>{p.code_secret}</span><Btn variant="outline" style={{ padding: "4px 8px", fontSize: 11 }} onClick={() => { navigator.clipboard.writeText(p.code_secret); toast.success("Copié !"); }}>📋</Btn></>}
            />
          ))}
        </Panel>
        <Panel title={`Consultations récentes (${(cons||[]).length})`}>
          {(cons||[]).length === 0 ? <Empty icon="🩺" title="Aucune consultation" /> : (cons||[]).slice(0,8).map(c => (
            <div key={c.id} style={{ padding: "10px 0", borderBottom: "1px solid #0E1620" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{c.patient_nom || c.patient_id}</span>
                <Badge color={c.statut === "finalisee" ? "green" : "amber"}>{c.statut === "finalisee" ? "Finalisée" : "Brouillon"}</Badge>
              </div>
              <div style={{ fontSize: 11, color: "#8BA0B5" }}>{c.date_consult} · {c.medecin_nom || "—"}</div>
              <div style={{ fontSize: 11, color: "#4E657A" }}>📋 {c.diagnostic?.slice(0, 60)}…</div>
            </div>
          ))}
        </Panel>
      </Grid>
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="🩺 Nouvelle consultation" width={680}>
        <Grid cols={2} gap={12}>
          <Select label="Patient *" required value={form.patient_id} onChange={e => setForm(p => ({ ...p, patient_id: e.target.value }))} options={[{ value: "", label: "— Sélectionner —" }, ...(pats||[]).map(p => ({ value: p.id, label: `${p.user_nom} · ${p.code_secret}` }))]} />
          <Select label="Médecin *" required value={form.medecin_id} onChange={e => setForm(p => ({ ...p, medecin_id: e.target.value }))} options={[{ value: "", label: "— Sélectionner —" }, ...(meds||[]).map(m => ({ value: m.id, label: `Dr. ${m.prenom} ${m.nom} — ${m.specialite}` }))]} />
        </Grid>
        <Input label="Motif *" required value={form.motif} onChange={e => setForm(p => ({ ...p, motif: e.target.value }))} placeholder="Ex: Suivi HTA" />
        <SectionLabel color="#0D9488" borderColor="#0D9488">📊 Constantes vitales</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 14 }}>
          {[["ta","TA (mmHg)","120/80"],["fc","FC (bpm)","72"],["spo2","SpO2","98%"],["temperature","Temp.","37.0°C"],["poids","Poids (kg)","70"],["taille","Taille (cm)","170"]].map(([k,l,ph]) => (
            <div key={k}><label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#4E657A", marginBottom: 4 }}>{l}</label><input value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} placeholder={ph} style={{ width: "100%", background: "#1A2535", border: "1px solid #1E2F42", borderRadius: 8, padding: "8px", color: "#F0F4F8", fontSize: 12, fontFamily: "monospace", outline: "none", boxSizing: "border-box" }} /></div>
          ))}
        </div>
        <Textarea label="Examen clinique" value={form.examen_clinique} onChange={e => setForm(p => ({ ...p, examen_clinique: e.target.value }))} placeholder="Auscultation, état général…" />
        <SectionLabel color="#D97706" borderColor="#D97706">📋 Diagnostic *</SectionLabel>
        <Grid cols={3} gap={10}><div style={{ gridColumn: "1/3" }}><Textarea rows={2} value={form.diagnostic} onChange={e => setForm(p => ({ ...p, diagnostic: e.target.value }))} placeholder="Ex: Hypertension artérielle…" /></div><Input label="CIM-10" value={form.code_cim10} onChange={e => setForm(p => ({ ...p, code_cim10: e.target.value }))} placeholder="I10" style={{ fontFamily: "monospace" }} /></Grid>
        <SectionLabel color="#0D9488" borderColor="#0D9488">📎 Prescriptions</SectionLabel>
        <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          {[["bio","🧪 Biologique"],["radio","🔬 Imagerie"],["fonc","📋 Fonctionnel"],["autre","📌 Autre"]].map(([t,l]) => <Btn key={t} variant="outline" style={{ padding: "6px 10px", fontSize: 11 }} onClick={() => addPresc(t)}>{l}</Btn>)}
        </div>
        {prescs.map((p, i) => (
          <div key={p.id} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "center" }}>
            <span>{p.type === "bio" ? "🧪" : p.type === "radio" ? "🔬" : "📋"}</span>
            <input value={p.label} onChange={e => setPrescs(ps => ps.map((x,j) => j===i ? {...x,label:e.target.value} : x))} placeholder="Description…" style={{ flex: 1, background: "#1A2535", border: "1px solid #1E2F42", borderRadius: 8, padding: "8px", color: "#F0F4F8", fontSize: 12, outline: "none" }} />
            <button onClick={() => setPrescs(ps => ps.filter((_,j) => j!==i))} style={{ background: "none", border: "none", color: "#E11D48", cursor: "pointer", fontSize: 16 }}>✕</button>
          </div>
        ))}
        <SectionLabel color="#0A8F58" borderColor="#0A8F58">💊 Ordonnance</SectionLabel>
        {ordo.map((o, i) => (
          <div key={o.id} style={{ background: "#1A2535", borderRadius: 8, padding: 10, marginBottom: 8, borderLeft: "3px solid #0A8F58" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr auto", gap: 8 }}>
              <input value={o.med} onChange={e => setOrdo(os => os.map((x,j) => j===i ? {...x,med:e.target.value} : x))} placeholder="Médicament" style={{ background: "#141E2B", border: "1px solid #1E2F42", borderRadius: 6, padding: "7px", color: "#F0F4F8", fontSize: 12, outline: "none" }} />
              <input value={o.posologie} onChange={e => setOrdo(os => os.map((x,j) => j===i ? {...x,posologie:e.target.value} : x))} placeholder="Posologie" style={{ background: "#141E2B", border: "1px solid #1E2F42", borderRadius: 6, padding: "7px", color: "#F0F4F8", fontSize: 12, outline: "none" }} />
              <select value={o.duree} onChange={e => setOrdo(os => os.map((x,j) => j===i ? {...x,duree:e.target.value} : x))} style={{ background: "#141E2B", border: "1px solid #1E2F42", borderRadius: 6, padding: "7px", color: "#F0F4F8", fontSize: 12, outline: "none" }}>
                {["5 jours","7 jours","10 jours","14 jours","30 jours","2 mois","3 mois","6 mois","1 an","À vie"].map(d => <option key={d}>{d}</option>)}
              </select>
              <button onClick={() => setOrdo(os => os.filter((_,j) => j!==i))} style={{ background: "none", border: "none", color: "#E11D48", cursor: "pointer", fontSize: 16 }}>✕</button>
            </div>
          </div>
        ))}
        <Btn variant="outline" style={{ width: "100%", marginBottom: 14 }} onClick={addMed}>+ Ajouter un médicament</Btn>
        <Textarea label="Note finale" value={form.note_finale} onChange={e => setForm(p => ({ ...p, note_finale: e.target.value }))} rows={2} placeholder="Recommandations, prochain RDV…" />
        <div style={{ display: "flex", gap: 10 }}>
          <Btn variant="outline" style={{ flex: 1 }} onClick={() => setShowAdd(false)}>Annuler</Btn>
          <Btn style={{ flex: 2 }} loading={creerMut.isPending} onClick={() => { if (!form.patient_id) { toast.error("Sélectionnez un patient"); return; } if (!form.motif) { toast.error("Motif obligatoire"); return; } if (!form.diagnostic) { toast.error("Diagnostic obligatoire"); return; } creerMut.mutate({ ...form, prescriptions: prescs.filter(p => p.label), ordonnance: ordo.filter(o => o.med && o.posologie) }); }}>✓ Finaliser et signer</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ── CAISSE ────────────────────────────────────────────────────────
function PageCaisse() {
  const qc = useQueryClient();
  const [mOuv, setMOuv] = useState(false);
  const [mEnc, setMEnc] = useState(false);
  const [mDec, setMDec] = useState(false);
  const [mClt, setMClt] = useState(false);
  const [fOuv, setFOuv] = useState({ nom: "Caisse principale", solde_ouverture: 50000, operateur: "" });
  const [fEnc, setFEnc] = useState({ label: "", montant: "", mode: "Espèces", reference: "" });
  const [fDec, setFDec] = useState({ label: "", montant: "", motif: "" });
  const { data, isLoading } = useQuery({ queryKey: ["caisse"], queryFn: () => caisseAPI.active().then(r => r.data), refetchInterval: 30000 });
  const mOuvrir = useMutation({ mutationFn: () => caisseAPI.ouvrir(fOuv), onSuccess: r => { toast.success(r.data.message); qc.invalidateQueries(["caisse"]); setMOuv(false); }, onError: e => toast.error(e.response?.data?.message || "Erreur") });
  const mEncaisser = useMutation({ mutationFn: () => caisseAPI.encaisser(fEnc), onSuccess: r => { toast.success(r.data.message); qc.invalidateQueries(["caisse"]); setMEnc(false); setFEnc({ label:"",montant:"",mode:"Espèces",reference:"" }); }, onError: e => toast.error(e.response?.data?.message || "Erreur") });
  const mDecaisser = useMutation({ mutationFn: () => caisseAPI.decaisser(fDec), onSuccess: r => { toast.success(r.data.message); qc.invalidateQueries(["caisse"]); setMDec(false); setFDec({ label:"",montant:"",motif:"" }); }, onError: e => toast.error(e.response?.data?.message || "Erreur") });
  const mCloturer = useMutation({ mutationFn: () => caisseAPI.cloturer(), onSuccess: r => { toast.success(r.data.message); qc.invalidateQueries(["caisse"]); setMClt(false); }, onError: e => toast.error(e.response?.data?.message || "Erreur") });
  if (isLoading) return <Loader />;
  const caisse = data?.data; const hist = data?.historique || []; const statut = data?.statut || "fermee";
  const txs = caisse?.transactions || [];
  const enc = txs.filter(t => t.type === "encaissement").reduce((s,t) => s + +t.montant, 0);
  const dec = txs.filter(t => t.type === "decaissement").reduce((s,t) => s + +t.montant, 0);
  const solde = (+caisse?.solde_ouverture || 0) + enc - dec;
  return (
    <div>
      <PageHeader title="💰 Gestion de Caisse" subtitle="Encaissements · Décaissements · Clôture · Historique"
        actions={statut === "ouverte" ? <Btn variant="danger" onClick={() => setMClt(true)}>🔒 Clôturer</Btn> : <Btn onClick={() => setMOuv(true)}>🔓 Ouvrir la caisse</Btn>} />
      <div style={{ background: statut === "ouverte" ? "rgba(10,143,88,.08)" : "rgba(225,29,72,.06)", border: `1.5px solid ${statut === "ouverte" ? "rgba(10,143,88,.3)" : "rgba(225,29,72,.25)"}`, borderRadius: 14, padding: "20px 24px", marginBottom: 20, display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ fontSize: 44 }}>{statut === "ouverte" ? "🟢" : "🔴"}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#F0F4F8" }}>{statut === "ouverte" ? `Caisse ouverte${caisse?.nom ? " — " + caisse.nom : ""}` : "Caisse fermée"}</div>
          {statut === "ouverte" && <div style={{ fontSize: 12, color: "#8BA0B5", marginTop: 3 }}>Ouverte le <strong>{caisse.date_ouverture}</strong> · Opérateur : <strong>{caisse.operateur}</strong> · Fonds de départ : <strong>{fmt(caisse.solde_ouverture)} FCFA</strong></div>}
          {statut !== "ouverte" && <div style={{ fontSize: 12, color: "#8BA0B5", marginTop: 3 }}>Ouvrez une caisse pour commencer à enregistrer les transactions</div>}
        </div>
        {statut === "ouverte" && <div style={{ textAlign: "right" }}><div style={{ fontSize: 34, fontWeight: 900, color: "#0A8F58" }}>{fmt(solde)}</div><div style={{ fontSize: 11, color: "#4E657A", textTransform: "uppercase" }}>FCFA · Solde courant</div></div>}
      </div>
      {statut === "ouverte" && (<>
        <Grid cols={4} gap={14} style={{ marginBottom: 20 }}>
          <Card label="Fonds ouverture" value={`${fmt(caisse.solde_ouverture)} F`} color="#F0F4F8" />
          <Card label="Encaissé" value={`+${fmt(enc)} F`} color="#0A8F58" />
          <Card label="Décaissé" value={`-${fmt(dec)} F`} color="#E11D48" />
          <Card label="Solde courant" value={`${fmt(solde)} F`} color="#0A8F58" />
        </Grid>
        <Grid cols={5} gap={20}>
          <div style={{ gridColumn: "1/3" }}>
            <Panel title="⚡ Actions rapides">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <button onClick={() => setMEnc(true)} style={{ background: "#0A8F58", border: "none", borderRadius: 12, padding: 20, cursor: "pointer", textAlign: "center" }}>
                  <div style={{ fontSize: 30, marginBottom: 6 }}>💵</div><div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>Encaisser</div><div style={{ fontSize: 11, color: "rgba(255,255,255,.7)" }}>Paiement reçu</div>
                </button>
                <button onClick={() => setMDec(true)} style={{ background: "transparent", border: "1.5px solid rgba(225,29,72,.4)", borderRadius: 12, padding: 20, cursor: "pointer", textAlign: "center" }}>
                  <div style={{ fontSize: 30, marginBottom: 6 }}>💸</div><div style={{ fontSize: 14, fontWeight: 700, color: "#E11D48" }}>Décaisser</div><div style={{ fontSize: 11, color: "#4E657A" }}>Sortie de fonds</div>
                </button>
              </div>
            </Panel>
          </div>
          <div style={{ gridColumn: "3/6" }}>
            <Panel title={`📋 Journal du jour (${txs.length} op.)`}>
              {txs.length === 0 ? <Empty icon="💳" title="Aucune transaction" subtitle="Utilisez les boutons pour commencer" /> :
                [...txs].reverse().map(t => (
                  <ListItem key={t.id}
                    left={<span style={{ fontSize: 20 }}>{t.type === "encaissement" ? "💵" : "💸"}</span>}
                    center={<><div style={{ fontSize: 13, fontWeight: 600, color: "#F0F4F8" }}>{t.label}</div><div style={{ fontSize: 11, color: "#8BA0B5" }}>{t.heure?.slice(0,5)} · {t.mode} · {t.caissier}</div></>}
                    right={<span style={{ fontSize: 15, fontWeight: 800, color: t.type === "encaissement" ? "#0A8F58" : "#E11D48" }}>{t.type === "encaissement" ? "+" : "-"}{fmt(t.montant)} F</span>}
                  />
                ))}
              {txs.length > 0 && <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 12, marginTop: 6, borderTop: "2px solid #1E2F42" }}><span style={{ fontWeight: 700 }}>Solde estimé</span><span style={{ fontSize: 18, fontWeight: 800, color: "#0A8F58" }}>{fmt(solde)} FCFA</span></div>}
            </Panel>
          </div>
        </Grid>
      </>)}
      {hist.length > 0 && <Panel title={`🗓️ Historique (${hist.length})`} style={{ marginTop: 20 }}><Table columns={[{ key: "date_ouverture", label: "Date", render: v => <span style={{ fontFamily: "monospace", fontSize: 12 }}>{v}</span> },{ key: "nom", label: "Nom", render: v => v || "Caisse principale" },{ key: "solde_ouverture", label: "Ouverture", render: v => `${fmt(v)} F` },{ key: "encaissements", label: "Encaissé", render: v => <span style={{ color: "#0A8F58", fontWeight: 700 }}>+{fmt(v)} F</span> },{ key: "decaissements", label: "Décaissé", render: v => <span style={{ color: "#E11D48", fontWeight: 700 }}>-{fmt(v)} F</span> },{ key: "solde_cloture", label: "Solde final", render: v => <span style={{ fontWeight: 800, color: "#0A8F58" }}>{fmt(v)} F</span> }]} rows={hist} /></Panel>}
      <Modal open={mOuv} onClose={() => setMOuv(false)} title="🔓 Ouvrir la caisse">
        <Input label="Nom de la caisse" value={fOuv.nom} onChange={e => setFOuv(p => ({ ...p, nom: e.target.value }))} />
        <Input label="Solde d'ouverture (FCFA) *" required type="number" value={fOuv.solde_ouverture} onChange={e => setFOuv(p => ({ ...p, solde_ouverture: +e.target.value }))} />
        <Input label="Opérateur / Caissier" value={fOuv.operateur} onChange={e => setFOuv(p => ({ ...p, operateur: e.target.value }))} placeholder="Nom du caissier" />
        <div style={{ display: "flex", gap: 10 }}><Btn variant="outline" style={{ flex: 1 }} onClick={() => setMOuv(false)}>Annuler</Btn><Btn style={{ flex: 2 }} loading={mOuvrir.isPending} onClick={() => mOuvrir.mutate()}>Ouvrir la caisse</Btn></div>
      </Modal>
      <Modal open={mEnc} onClose={() => setMEnc(false)} title="➕ Encaisser">
        <Input label="Libellé *" required value={fEnc.label} onChange={e => setFEnc(p => ({ ...p, label: e.target.value }))} placeholder="Ex: Consultation Dr. Kouamé" />
        <Input label="Montant (FCFA) *" required type="number" value={fEnc.montant} onChange={e => setFEnc(p => ({ ...p, montant: e.target.value }))} placeholder="25000" />
        <Grid cols={2} gap={12}><Select label="Mode" value={fEnc.mode} onChange={e => setFEnc(p => ({ ...p, mode: e.target.value }))} options={["Espèces","Wave","Orange Money","MTN MoMo","Carte bancaire","Chèque","Virement"]} /><Input label="Réf. facture" value={fEnc.reference} onChange={e => setFEnc(p => ({ ...p, reference: e.target.value }))} placeholder="#FAC-0856" /></Grid>
        <div style={{ display: "flex", gap: 10 }}><Btn variant="outline" style={{ flex: 1 }} onClick={() => setMEnc(false)}>Annuler</Btn><Btn style={{ flex: 2 }} loading={mEncaisser.isPending} onClick={() => { if (!fEnc.label || !fEnc.montant) { toast.error("Libellé et montant requis"); return; } mEncaisser.mutate(); }}>Encaisser</Btn></div>
      </Modal>
      <Modal open={mDec} onClose={() => setMDec(false)} title="➖ Décaisser">
        <Input label="Libellé *" required value={fDec.label} onChange={e => setFDec(p => ({ ...p, label: e.target.value }))} placeholder="Ex: Achat consommables" />
        <Input label="Montant (FCFA) *" required type="number" value={fDec.montant} onChange={e => setFDec(p => ({ ...p, montant: e.target.value }))} />
        <Input label="Motif / Approbation" value={fDec.motif} onChange={e => setFDec(p => ({ ...p, motif: e.target.value }))} placeholder="Approuvé par…" />
        <div style={{ background: "rgba(225,29,72,.07)", borderRadius: 8, padding: 10, fontSize: 12, color: "#8BA0B5", marginBottom: 14 }}>⚠️ Tout décaissement est tracé avec horodatage.</div>
        <div style={{ display: "flex", gap: 10 }}><Btn variant="outline" style={{ flex: 1 }} onClick={() => setMDec(false)}>Annuler</Btn><Btn variant="danger" style={{ flex: 2 }} loading={mDecaisser.isPending} onClick={() => { if (!fDec.label || !fDec.montant) { toast.error("Libellé et montant requis"); return; } mDecaisser.mutate(); }}>Valider</Btn></div>
      </Modal>
      <Modal open={mClt} onClose={() => setMClt(false)} title="🔒 Clôturer la caisse">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          {[["Solde ouverture", fmt(caisse?.solde_ouverture||0)+" F","#F0F4F8","#1A2535"],["Encaissé","+"+fmt(enc)+" F","#0A8F58","rgba(10,143,88,.1)"],["Décaissé","-"+fmt(dec)+" F","#E11D48","rgba(225,29,72,.08)"],["Solde final",fmt(solde)+" F","#2563EB","rgba(37,99,235,.08)"]].map(([l,v,col,bg]) => (
            <div key={l} style={{ background: bg, borderRadius: 10, padding: 14, textAlign: "center" }}><div style={{ fontSize: 11, color: "#4E657A", marginBottom: 5 }}>{l}</div><div style={{ fontSize: 20, fontWeight: 800, color: col }}>{v}</div></div>
          ))}
        </div>
        <div style={{ background: "rgba(225,29,72,.07)", borderRadius: 8, padding: 10, fontSize: 12, color: "#8BA0B5", marginBottom: 14 }}>⚠️ La clôture est irréversible. Le journal sera archivé.</div>
        <div style={{ display: "flex", gap: 10 }}><Btn variant="outline" style={{ flex: 1 }} onClick={() => setMClt(false)}>Annuler</Btn><Btn variant="danger" style={{ flex: 2 }} loading={mCloturer.isPending} onClick={() => mCloturer.mutate()}>Clôturer et archiver</Btn></div>
      </Modal>
    </div>
  );
}

// ── STATS ─────────────────────────────────────────────────────────
function PageStats() {
  return (
    <div>
      <PageHeader title="📈 Statistiques" subtitle="Performance — Tableau de bord analytique" />
      <Grid cols={2} gap={20}>
        <Panel title="RDV par semaine" accent="green">
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 150, paddingTop: 20 }}>
            {[{ h: 45, l: "S1", v: 18 },{ h: 65, l: "S2", v: 26 },{ h: 80, l: "S3", v: 32 },{ h: 100, l: "S4", v: 40 }].map(b => (
              <div key={b.l} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#0A8F58" }}>{b.v}</div>
                <div style={{ width: "100%", height: `${b.h}%`, background: "linear-gradient(to top, #0A8F58, #0D9488)", borderRadius: "4px 4px 0 0" }} />
                <div style={{ fontSize: 11, color: "#4E657A" }}>{b.l}</div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Indicateurs clés" accent="teal">
          {[{ l: "Taux d'occupation", v: "82%", p: 82, c: "#0A8F58" },{ l: "Taux tiers-payant", v: "67%", p: 67, c: "#0D9488" },{ l: "Dossiers ass. validés", v: "86%", p: 86, c: "#0A8F58" },{ l: "Taux no-show", v: "14%", p: 14, c: "#D97706" }].map(k => (
            <div key={k.l} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 13 }}>
                <span style={{ color: "#8BA0B5" }}>{k.l}</span><span style={{ fontWeight: 700, color: k.c }}>{k.v}</span>
              </div>
              <ProgressBar value={k.p} color={k.c} />
            </div>
          ))}
        </Panel>
      </Grid>
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════
//  PAGE ASSURANCES v2
// ════════════════════════════════════════════════════════════════════
function PageAssurance() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ patient_nom: "", compagnie: "NSIA Assurances", numero_police: "", taux_couverture: 80, montant_plafond: 500000 });
  const { data, isLoading } = useQuery({ queryKey: ["cl-dossiers"], queryFn: () => cliniqueAPI.dossiers().then(r => r.data.data || []) });
  const addMut = useMutation({
    mutationFn: d => cliniqueAPI.addDossier(d),
    onSuccess: () => { toast.success("Dossier soumis à l'assureur !"); qc.invalidateQueries(["cl-dossiers"]); setShowAdd(false); },
    onError: e => toast.error(e.response?.data?.message || "Erreur"),
  });
  const updMut = useMutation({
    mutationFn: ({ id, statut }) => cliniqueAPI.updateDossier(id, { statut }),
    onSuccess: () => { toast.success("Dossier mis à jour"); qc.invalidateQueries(["cl-dossiers"]); },
  });
  const delMut = useMutation({
    mutationFn: id => cliniqueAPI.deleteDossier(id),
    onSuccess: () => { toast.success("Dossier supprimé"); qc.invalidateQueries(["cl-dossiers"]); },
  });

  const dossiers = data || [];
  const compagnies = ["NSIA Assurances", "Allianz CI", "AXA CI", "CNAM (CMU)", "SANLAM", "Saham Assurances", "Atlantique Assurances"];
  const statutColor = { soumis: "blue", en_attente: "amber", valide: "green", rejete: "red" };

  return (
    <div>
      <PageHeader title="🛡️ Assurances v2 — Tiers-Payant" subtitle="Gestion des dossiers de remboursement et conventions"
        actions={<Btn onClick={() => setShowAdd(true)}>+ Nouveau dossier</Btn>} />

      <Grid cols={4} gap={14} style={{ marginBottom: 20 }}>
        <Card label="Total dossiers" value={dossiers.length} icon="📁" />
        <Card label="Validés" value={dossiers.filter(d => d.statut === "valide").length} icon="✅" color="#0A8F58" />
        <Card label="En attente" value={dossiers.filter(d => d.statut === "en_attente" || d.statut === "soumis").length} icon="⏳" color="#D97706" />
        <Card label="Rejetés" value={dossiers.filter(d => d.statut === "rejete").length} icon="❌" color="#E11D48" />
      </Grid>

      <Grid cols={3} gap={14} style={{ marginBottom: 20 }}>
        {compagnies.map(c => {
          const count = dossiers.filter(d => d.compagnie === c).length;
          const valides = dossiers.filter(d => d.compagnie === c && d.statut === "valide").length;
          return (
            <Panel key={c}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <span style={{ fontSize: 28 }}>🛡️</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#F0F4F8" }}>{c}</div>
                  <div style={{ fontSize: 11, color: "#8BA0B5" }}>{count} dossier(s) · {valides} validé(s)</div>
                </div>
              </div>
              <ProgressBar value={valides} max={Math.max(count, 1)} color="#0A8F58" />
              <div style={{ fontSize: 11, color: "#4E657A", marginTop: 6 }}>
                Taux validation : {count > 0 ? Math.round(valides/count*100) : 0}%
              </div>
            </Panel>
          );
        })}
      </Grid>

      {isLoading ? <Loader /> : (
        <Panel title={`📁 Dossiers de remboursement (${dossiers.length})`}>
          <Table emptyMessage="Aucun dossier soumis" columns={[
            { key: "reference", label: "Référence", render: v => <span style={{ fontFamily: "monospace", fontSize: 12, color: "#0A8F58" }}>{v || "—"}</span> },
            { key: "patient_nom", label: "Patient", render: (v, r) => <><div style={{ fontWeight: 700 }}>{v || r.patient_id || "—"}</div><div style={{ fontSize: 11, color: "#8BA0B5" }}>{r.numero_police}</div></> },
            { key: "compagnie", label: "Compagnie" },
            { key: "diagnostic", label: "Diagnostic", render: v => <span style={{ fontSize: 12, color: "#8BA0B5" }}>{v?.slice(0, 40) || "—"}</span> },
            { key: "montant_total", label: "Total", render: v => <span style={{ fontWeight: 700 }}>{Number(v||0).toLocaleString()} F</span> },
            { key: "montant_assur", label: "Part ass.", render: v => <span style={{ color: "#0A8F58" }}>{Number(v||0).toLocaleString()} F</span> },
            { key: "ticket_moder", label: "Ticket mod.", render: v => <span style={{ color: "#D97706" }}>{Number(v||0).toLocaleString()} F</span> },
            { key: "statut", label: "Statut", render: v => <Badge color={statutColor[v] || "gray"}>{v}</Badge> },
            { key: "id", label: "Actions", render: (id, row) => (
              <div style={{ display: "flex", gap: 6 }}>
                {row.statut === "soumis" && <Btn variant="teal" style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => updMut.mutate({ id, statut: "en_attente" })}>→ Soumettre</Btn>}
                {row.statut === "en_attente" && <Btn variant="outline" style={{ padding: "5px 10px", fontSize: 11, color: "#0A8F58" }} onClick={() => updMut.mutate({ id, statut: "valide" })}>✓ Valider</Btn>}
                <Btn variant="outline" style={{ padding: "5px 10px", fontSize: 11, color: "#E11D48" }} onClick={() => window.confirm("Supprimer ce dossier ?") && delMut.mutate(id)}>✕</Btn>
              </div>
            )},
          ]} rows={dossiers} />
        </Panel>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="🛡️ Nouveau dossier assurance">
        <Input label="Patient *" required value={form.patient_nom} onChange={e => setForm(p => ({ ...p, patient_nom: e.target.value }))} placeholder="Nom du patient" />
        <Grid cols={2} gap={12}>
          <Select label="Compagnie d'assurance *" required value={form.compagnie} onChange={e => setForm(p => ({ ...p, compagnie: e.target.value }))} options={compagnies} />
          <Input label="N° Police / Matricule *" required value={form.numero_police} onChange={e => setForm(p => ({ ...p, numero_police: e.target.value }))} placeholder="POL-2024-XXXXX" />
        </Grid>
        <Grid cols={2} gap={12}>
          <Input label="Taux de couverture (%)" type="number" min="0" max="100" value={form.taux_couverture} onChange={e => setForm(p => ({ ...p, taux_couverture: +e.target.value }))} />
          <Input label="Montant total actes (FCFA) *" required type="number" value={form.montant_plafond} onChange={e => setForm(p => ({ ...p, montant_plafond: +e.target.value }))} />
        </Grid>
        <div style={{ background: "rgba(10,143,88,.07)", border: "1px solid rgba(10,143,88,.2)", borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 13 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ color: "#8BA0B5" }}>Part assureur ({form.taux_couverture}%)</span>
            <span style={{ color: "#0A8F58", fontWeight: 700 }}>{Math.round(form.montant_plafond * form.taux_couverture / 100).toLocaleString()} FCFA</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#8BA0B5" }}>Ticket modérateur ({100 - form.taux_couverture}%)</span>
            <span style={{ color: "#D97706", fontWeight: 700 }}>{Math.round(form.montant_plafond * (100 - form.taux_couverture) / 100).toLocaleString()} FCFA</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn variant="outline" style={{ flex: 1 }} onClick={() => setShowAdd(false)}>Annuler</Btn>
          <Btn style={{ flex: 2 }} loading={addMut.isPending} onClick={() => {
            if (!form.patient_nom || !form.numero_police || !form.montant_plafond) { toast.error("Patient, n° police et montant requis"); return; }
            addMut.mutate({ ...form, montant_total: form.montant_plafond, montant_assur: Math.round(form.montant_plafond * form.taux_couverture / 100), ticket_moder: Math.round(form.montant_plafond * (100 - form.taux_couverture) / 100), compagnie: form.compagnie, diagnostic: "Actes médicaux" });
          }}>Soumettre le dossier</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  PAGE DOSSIERS ASSURANCE
// ════════════════════════════════════════════════════════════════════
function PageDossiersAss() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["cl-dossiers"], queryFn: () => cliniqueAPI.dossiers().then(r => r.data.data || []) });
  const updMut = useMutation({
    mutationFn: ({ id, statut, motif_rejet }) => cliniqueAPI.updateDossier(id, { statut, motif_rejet }),
    onSuccess: () => { toast.success("Statut mis à jour"); qc.invalidateQueries(["cl-dossiers"]); },
  });
  const delMut = useMutation({
    mutationFn: id => cliniqueAPI.deleteDossier(id),
    onSuccess: () => { toast.success("Dossier supprimé"); qc.invalidateQueries(["cl-dossiers"]); },
  });

  const dossiers = data || [];
  const enAttente = dossiers.filter(d => d.statut === "soumis" || d.statut === "en_attente");
  const valides = dossiers.filter(d => d.statut === "valide");
  const rejetes = dossiers.filter(d => d.statut === "rejete");
  const totalARecup = valides.reduce((s, d) => s + (+d.montant_assur || 0), 0);

  return (
    <div>
      <PageHeader title="📁 Dossiers Assurance" subtitle="Suivi des remboursements tiers-payant" />

      <Grid cols={4} gap={14} style={{ marginBottom: 20 }}>
        <Card label="En attente" value={enAttente.length} icon="⏳" color="#D97706" sub="À traiter" />
        <Card label="Validés" value={valides.length} icon="✅" color="#0A8F58" sub="Remboursements OK" />
        <Card label="Rejetés" value={rejetes.length} icon="❌" color="#E11D48" sub="À contester" />
        <Card label="À récupérer" value={`${(totalARecup/1000).toFixed(0)}k F`} icon="💰" color="#0A8F58" sub="Part assureur validée" />
      </Grid>

      {enAttente.length > 0 && (
        <Panel title={`⏳ En attente de traitement (${enAttente.length})`} accent="amber" style={{ marginBottom: 16 }}>
          <Table emptyMessage="Aucun dossier en attente" columns={[
            { key: "reference", label: "Réf.", render: v => <span style={{ fontFamily: "monospace", color: "#D97706" }}>{v}</span> },
            { key: "patient_nom", label: "Patient", render: (v, r) => v || r.patient_id || "—" },
            { key: "compagnie", label: "Compagnie" },
            { key: "montant_total", label: "Montant", render: v => `${Number(v||0).toLocaleString()} F` },
            { key: "montant_assur", label: "Part ass.", render: v => <span style={{ color: "#0A8F58", fontWeight: 700 }}>{Number(v||0).toLocaleString()} F</span> },
            { key: "statut", label: "Statut", render: v => <Badge color="amber">{v}</Badge> },
            { key: "id", label: "Actions", render: (id) => (
              <div style={{ display: "flex", gap: 6 }}>
                <Btn variant="teal" style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => updMut.mutate({ id, statut: "valide" })}>✓ Valider</Btn>
                <Btn variant="outline" style={{ padding: "5px 10px", fontSize: 11, color: "#E11D48" }} onClick={() => { const m = window.prompt("Motif du rejet :"); if (m !== null) updMut.mutate({ id, statut: "rejete", motif_rejet: m }); }}>✕ Rejeter</Btn>
              </div>
            )},
          ]} rows={enAttente} />
        </Panel>
      )}

      {isLoading ? <Loader /> : (
        <Panel title={`📋 Historique complet (${dossiers.length})`}>
          <Table emptyMessage="Aucun dossier" columns={[
            { key: "reference", label: "Réf.", render: v => <span style={{ fontFamily: "monospace", fontSize: 12, color: "#0A8F58" }}>{v || "—"}</span> },
            { key: "patient_nom", label: "Patient", render: (v, r) => v || r.patient_id || "—" },
            { key: "compagnie", label: "Compagnie" },
            { key: "montant_total", label: "Total", render: v => `${Number(v||0).toLocaleString()} F` },
            { key: "montant_assur", label: "Part ass.", render: v => <span style={{ color: "#0A8F58" }}>{Number(v||0).toLocaleString()} F</span> },
            { key: "ticket_moder", label: "Ticket", render: v => <span style={{ color: "#D97706" }}>{Number(v||0).toLocaleString()} F</span> },
            { key: "statut", label: "Statut", render: v => <Badge color={{ soumis:"blue", en_attente:"amber", valide:"green", rejete:"red" }[v] || "gray"}>{v}</Badge> },
            { key: "motif_rejet", label: "Motif rejet", render: v => v ? <span style={{ color: "#E11D48", fontSize: 11 }}>{v}</span> : "—" },
            { key: "id", label: "", render: (id) => <Btn variant="outline" style={{ padding: "5px 10px", fontSize: 11, color: "#E11D48" }} onClick={() => window.confirm("Supprimer ?") && delMut.mutate(id)}>✕</Btn> },
          ]} rows={dossiers} />
        </Panel>
      )}
    </div>
  );
}

// ── ROUTER ────────────────────────────────────────────────────────
export default function DashboardClinique() {
  return (
    <Routes>
      <Route index element={<DashboardHome />} />
      <Route path="planning"     element={<PagePlanning />} />
      <Route path="emr"          element={<PageEMR />} />
      <Route path="medecins"     element={<PageMedecins />} />
      <Route path="stock"        element={<PageStock />} />
      <Route path="facturation"  element={<PageFacturation />} />
      <Route path="consultation" element={<PageConsultation />} />
      <Route path="caisse"       element={<PageCaisse />} />
      <Route path="stats"        element={<PageStats />} />
      <Route path="assurance"    element={<PageAssurance />} />
      <Route path="dossiers-ass" element={<PageDossiersAss />} />
      <Route path="*" element={<div style={{ textAlign: "center", padding: 60, color: "#4E657A" }}><div style={{ fontSize: 40, marginBottom: 12 }}>🚧</div><div>Section en développement</div></div>} />
    </Routes>
  );
}
