#!/usr/bin/env python3
"""
Section "Demandes de paiement" dans PageCaisse.
Fichier : frontend/src/pages/clinique/Dashboard.jsx
"""
import shutil
import sys
import os

PATH = "frontend/src/pages/clinique/Dashboard.jsx"

def patch(path):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    backup = path + ".bak59"
    shutil.copy2(path, backup)
    print(f"Sauvegarde : {backup}")

    replacements = []

    old1 = "  updateFacture: (id,d) => api.put(`/factures/${id}`, d),\n"
    new1 = old1 + (
        '  facturesParStatut: (statut) => api.get("/factures", { params: { statut } }),\n'
        '  chargesAPayer:   () => api.get("/charges-a-payer"),\n'
        '  addChargeAPayer: (d) => api.post("/charges-a-payer", d),\n'
        '  supprimerChargeAPayer: (id) => api.delete(`/charges-a-payer/${id}`),\n'
        '  payerFacture:    (d) => api.post("/caisse/payer-facture", d),\n'
        '  payerCharge:     (d) => api.post("/caisse/payer-charge", d),\n'
    )
    n1 = content.count(old1)
    if n1 != 1:
        print(f"ÉCHEC - ancre 'cAPI' trouvée {n1} fois (attendu: 1)")
        sys.exit(1)
    content = content.replace(old1, new1)
    print("Patché : cAPI demandes de paiement")

    old2 = '  const [showHistorique, setShowHistorique] = useState(false);\n'
    new2 = old2 + (
        '  const [showPayerFacture, setShowPayerFacture] = useState(null);\n'
        '  const [reductionType, setReductionType] = useState("pourcentage");\n'
        '  const [reductionValue, setReductionValue] = useState("");\n'
        '  const [modePaiementFacture, setModePaiementFacture] = useState("Espèces");\n'
        '  const [showPayerCharge, setShowPayerCharge] = useState(null);\n'
        '  const [modePaiementCharge, setModePaiementCharge] = useState("Espèces");\n'
        '  const [showAddCharge, setShowAddCharge] = useState(false);\n'
        '  const [chargeForm, setChargeForm] = useState({ categorie_charge_id:"", libelle:"", montant:"", date_echeance:"" });\n'
    )
    n2 = content.count(old2)
    if n2 != 1:
        print(f"ÉCHEC - ancre 'états' trouvée {n2} fois (attendu: 1)")
        sys.exit(1)
    content = content.replace(old2, new2)
    print("Patché : états demandes de paiement")

    old3 = """  const cloturerMut = useMutation({
    mutationFn: () => cAPI.cloturerCaisse(caisseId),
    onSuccess: () => { toast.success("Caisse clôturée !"); qc.invalidateQueries(["cl-caisses"]); },
    onError: e => toast.error(e?.response?.data?.message || "Erreur à la clôture"),
  });"""
    new3 = old3 + """

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
  });"""
    n3 = content.count(old3)
    if n3 != 1:
        print(f"ÉCHEC - ancre 'mutations' trouvée {n3} fois (attendu: 1)")
        sys.exit(1)
    content = content.replace(old3, new3)
    print("Patché : requêtes + mutations demandes de paiement")

    old4 = """              <Grid cols={2} gap={20}>
                <Panel title="📥 Encaissement">"""
    new4 = """              <div style={{marginBottom:20}}>
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
                <Panel title="📥 Encaissement">"""
    n4 = content.count(old4)
    if n4 != 1:
        print(f"ÉCHEC - ancre 'section liste' trouvée {n4} fois (attendu: 1)")
        sys.exit(1)
    content = content.replace(old4, new4)
    print("Patché : section Demandes de paiement")

    old5 = """      <Modal open={showNouvelleCaisse} onClose={()=>setShowNouvelleCaisse(false)} title="💰 Nouvelle caisse">
        <Inp label="Nom de la caisse *" required value={nomNouvelleCaisse} onChange={e=>setNomNouvelleCaisse(e.target.value)} placeholder="Caisse générale, Caisse pharmacie…" />
        <div style={{display:"flex",gap:10,marginTop:14}}>
          <Btn variant="outline" style={{flex:1}} onClick={()=>setShowNouvelleCaisse(false)}>Annuler</Btn>
          <Btn style={{flex:2}} loading={addCaisseMut.isPending} onClick={()=>{
            if(!nomNouvelleCaisse.trim()){toast.error("Nom requis");return;}
            addCaisseMut.mutate({ nom: nomNouvelleCaisse.trim() });
          }}>Créer la caisse</Btn>
        </div>
      </Modal>
    </div>
  );
}"""
    new5 = """      <Modal open={showNouvelleCaisse} onClose={()=>setShowNouvelleCaisse(false)} title="💰 Nouvelle caisse">
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
}"""
    n5 = content.count(old5)
    if n5 != 1:
        print(f"ÉCHEC - ancre 'modals' trouvée {n5} fois (attendu: 1)")
        sys.exit(1)
    content = content.replace(old5, new5)
    print("Patché : modals demandes de paiement")

    tmp_path = path + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        f.write(content)
    os.replace(tmp_path, path)

    print(f"\nTous les patches appliqués avec succès sur {path}")

if __name__ == "__main__":
    patch(PATH)
