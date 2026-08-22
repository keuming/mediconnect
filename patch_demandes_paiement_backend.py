#!/usr/bin/env python3
"""
Demandes de paiement dans Caisse.
Fichier : backend/server.js
"""
import shutil
import sys
import os

PATH = "backend/server.js"

def patch(path):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    backup = path + ".bak58"
    shutil.copy2(path, backup)
    print(f"Sauvegarde : {backup}")

    old1 = """    `CREATE TABLE IF NOT EXISTS categories_charges (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      clinique_id UUID, nom VARCHAR(200) NOT NULL,
      is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
  ];"""
    new1 = """    `CREATE TABLE IF NOT EXISTS categories_charges (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      clinique_id UUID, nom VARCHAR(200) NOT NULL,
      is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS charges_a_payer (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      clinique_id UUID NOT NULL, categorie_charge_id UUID,
      libelle VARCHAR(300) NOT NULL, montant DECIMAL(12,2) NOT NULL,
      statut VARCHAR(20) DEFAULT 'a_payer', date_echeance DATE,
      created_at TIMESTAMPTZ DEFAULT NOW(), paye_at TIMESTAMPTZ
    )`,
  ];"""
    n1 = content.count(old1)
    if n1 != 1:
        print(f"ÉCHEC - ancre 'table charges_a_payer' trouvée {n1} fois (attendu: 1)")
        sys.exit(1)
    content = content.replace(old1, new1)
    print("Patché : table charges_a_payer")

    old2 = "    await db(`ALTER TABLE cliniques ADD COLUMN IF NOT EXISTS couleur_primaire VARCHAR(7) DEFAULT '#0A8F58'`);"
    new2 = ("    await db(`ALTER TABLE cliniques ADD COLUMN IF NOT EXISTS couleur_primaire VARCHAR(7) DEFAULT '#0A8F58'`);\n"
            "    await db(`ALTER TABLE factures ADD COLUMN IF NOT EXISTS reduction_montant DECIMAL(12,2) DEFAULT 0`);")
    n2 = content.count(old2)
    if n2 != 1:
        print(f"ÉCHEC - ancre 'colonne reduction_montant' trouvée {n2} fois (attendu: 1)")
        sys.exit(1)
    content = content.replace(old2, new2)
    print("Patché : colonne factures.reduction_montant")

    old3 = """app.get('/api/factures', auth, requireSousRole('finance', 'bureau_entrees'), async (req, res) => {
  try {
    const cid=req.user?.clinique_id; const pid=req.user?.patient_id;
    const { patient_id } = req.query;
    // factures n'a pas de colonne patient_nom propre -- recupere via
    // jointure sur patients, a partir de patient_id.
    let sql=`SELECT f.*, TRIM(CONCAT(p.prenom,' ',p.nom)) AS patient_nom
               FROM factures f LEFT JOIN patients p ON p.id=f.patient_id WHERE 1=1`;
    const p=[];
    if (cid) { p.push(cid); sql+=` AND f.clinique_id=$${p.length}`; }
    if (pid&&!cid) { p.push(pid); sql+=` AND f.patient_id=$${p.length}`; }
    // Filtre explicite par patient (dossier patient cote clinique) --
    // s'ajoute au scope clinique_id deja applique ci-dessus, jamais un
    // substitut : un compte clinique ne peut voir que SES patients.
    if (patient_id) { p.push(patient_id); sql+=` AND f.patient_id=$${p.length}`; }
    sql+=' ORDER BY f.created_at DESC LIMIT 100';
    const r=await db(sql,p); res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});"""

    new3 = """app.get('/api/factures', auth, requireSousRole('finance', 'bureau_entrees'), async (req, res) => {
  try {
    const cid=req.user?.clinique_id; const pid=req.user?.patient_id;
    const { patient_id, statut } = req.query;
    let sql=`SELECT f.*, TRIM(CONCAT(p.prenom,' ',p.nom)) AS patient_nom
               FROM factures f LEFT JOIN patients p ON p.id=f.patient_id WHERE 1=1`;
    const p=[];
    if (cid) { p.push(cid); sql+=` AND f.clinique_id=$${p.length}`; }
    if (pid&&!cid) { p.push(pid); sql+=` AND f.patient_id=$${p.length}`; }
    if (patient_id) { p.push(patient_id); sql+=` AND f.patient_id=$${p.length}`; }
    if (statut) { p.push(statut); sql+=` AND f.statut=$${p.length}`; }
    sql+=' ORDER BY f.created_at DESC LIMIT 100';
    const r=await db(sql,p); res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});"""
    n3 = content.count(old3)
    if n3 != 1:
        print(f"ÉCHEC - ancre 'GET factures' trouvée {n3} fois (attendu: 1)")
        sys.exit(1)
    content = content.replace(old3, new3)
    print("Patché : GET /api/factures + filtre statut")

    anchor = "app.post('/api/caisse/cloturer', auth, requireSousRole('finance', 'bureau_entrees'), async (req, res) => {"
    n_anchor = content.count(anchor)
    if n_anchor != 1:
        print(f"ÉCHEC - ancre 'cloturer' trouvée {n_anchor} fois (attendu: 1)")
        sys.exit(1)

    nouvelles_routes = """app.get('/api/charges-a-payer', auth, requireSousRole('finance', 'bureau_entrees'), async (req, res) => {
  const cid = req.user?.clinique_id;
  const { statut } = req.query;
  try {
    let sql = `SELECT c.*, cc.nom AS categorie_nom FROM charges_a_payer c
                 LEFT JOIN categories_charges cc ON cc.id = c.categorie_charge_id
                WHERE c.clinique_id=$1`;
    const p = [cid];
    p.push(statut||'a_payer'); sql += ` AND c.statut=$${p.length}`;
    sql += ' ORDER BY c.created_at DESC';
    const r = await db(sql, p);
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.post('/api/charges-a-payer', auth, requireSousRole('finance', 'bureau_entrees'), async (req, res) => {
  const { categorie_charge_id, libelle, montant, date_echeance } = req.body;
  if (!libelle || !montant) return res.status(400).json({ success:false, message:'Libellé et montant requis' });
  const cid = req.user?.clinique_id;
  if (!cid) return res.status(400).json({ success:false, message:'Compte non rattaché à une clinique' });
  try {
    const r = await db(
      `INSERT INTO charges_a_payer (id,clinique_id,categorie_charge_id,libelle,montant,date_echeance)
       VALUES (gen_random_uuid(),$1,$2,$3,$4,$5) RETURNING *`,
      [cid, categorie_charge_id||null, libelle, montant, date_echeance||null]
    );
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.delete('/api/charges-a-payer/:id', auth, requireSousRole('finance', 'bureau_entrees'), async (req, res) => {
  const cid = req.user?.clinique_id;
  try {
    const r = await db("DELETE FROM charges_a_payer WHERE id=$1 AND clinique_id=$2 AND statut='a_payer' RETURNING id", [req.params.id, cid]);
    if (!r.rows.length) return res.status(404).json({ success:false, message:'Charge introuvable ou déjà payée' });
    res.json({ success:true });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

app.post('/api/caisse/payer-facture', auth, requireSousRole('finance', 'bureau_entrees'), async (req, res) => {
  const { facture_id, caisse_id, mode_paiement, reduction_pourcentage, reduction_montant_fixe } = req.body;
  if (!facture_id || !caisse_id) return res.status(400).json({ success:false, message:'facture_id et caisse_id requis' });
  const cid = req.user?.clinique_id;
  try {
    const session = await db("SELECT id FROM caisse_sessions WHERE clinique_id=$1 AND caisse_id=$2 AND date=CURRENT_DATE AND statut='ouverte'", [cid, caisse_id]);
    if (!session.rows.length) return res.status(400).json({ success:false, message:"Aucune session ouverte pour cette caisse aujourd'hui" });

    const facR = await db('SELECT * FROM factures WHERE id=$1 AND clinique_id=$2', [facture_id, cid]);
    if (!facR.rows.length) return res.status(404).json({ success:false, message:'Facture introuvable dans votre clinique' });
    const facture = facR.rows[0];
    if (facture.statut === 'payee') return res.status(400).json({ success:false, message:'Facture déjà payée' });

    const montantActuel = parseFloat(facture.montant_total || 0);
    let reduction = 0;
    if (reduction_pourcentage) reduction = Math.round(montantActuel * parseFloat(reduction_pourcentage) / 100);
    else if (reduction_montant_fixe) reduction = parseFloat(reduction_montant_fixe);
    reduction = Math.max(0, Math.min(reduction, montantActuel));
    const montantFinal = montantActuel - reduction;

    const r = await db(
      `UPDATE factures SET montant_total=$1, statut='payee', mode_paiement=COALESCE($2,mode_paiement),
         reduction_montant=COALESCE(reduction_montant,0)+$3, updated_at=NOW()
       WHERE id=$4 RETURNING *`,
      [montantFinal, mode_paiement||null, reduction, facture_id]
    );

    await db(
      `INSERT INTO mouvements_caisse (id,caisse_id,clinique_id,type,montant,mode_paiement,reference,utilisateur_id,utilisateur_nom)
       VALUES (gen_random_uuid(),$1,$2,'encaissement',$3,$4,$5,$6,$7)`,
      [caisse_id, cid, montantFinal, mode_paiement||null, facture.reference, req.user?.id||null, `${req.user?.prenom||''} ${req.user?.nom||''}`.trim()||null]
    );
    await db("UPDATE caisse_sessions SET total_encaisse=total_encaisse+$1 WHERE clinique_id=$2 AND caisse_id=$3 AND date=CURRENT_DATE AND statut='ouverte'", [montantFinal, cid, caisse_id]);

    res.json({ success:true, data:r.rows[0], reduction_appliquee:reduction });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

app.post('/api/caisse/payer-charge', auth, requireSousRole('finance', 'bureau_entrees'), async (req, res) => {
  const { charge_id, caisse_id, mode_paiement } = req.body;
  if (!charge_id || !caisse_id) return res.status(400).json({ success:false, message:'charge_id et caisse_id requis' });
  const cid = req.user?.clinique_id;
  try {
    const session = await db("SELECT id FROM caisse_sessions WHERE clinique_id=$1 AND caisse_id=$2 AND date=CURRENT_DATE AND statut='ouverte'", [cid, caisse_id]);
    if (!session.rows.length) return res.status(400).json({ success:false, message:"Aucune session ouverte pour cette caisse aujourd'hui" });

    const chargeR = await db('SELECT * FROM charges_a_payer WHERE id=$1 AND clinique_id=$2', [charge_id, cid]);
    if (!chargeR.rows.length) return res.status(404).json({ success:false, message:'Charge introuvable dans votre clinique' });
    const charge = chargeR.rows[0];
    if (charge.statut === 'payee') return res.status(400).json({ success:false, message:'Charge déjà payée' });

    const r = await db("UPDATE charges_a_payer SET statut='payee', paye_at=NOW() WHERE id=$1 RETURNING *", [charge_id]);

    await db(
      `INSERT INTO mouvements_caisse (id,caisse_id,clinique_id,type,montant,reference,utilisateur_id,utilisateur_nom)
       VALUES (gen_random_uuid(),$1,$2,'decaissement',$3,$4,$5,$6)`,
      [caisse_id, cid, charge.montant, charge.libelle, req.user?.id||null, `${req.user?.prenom||''} ${req.user?.nom||''}`.trim()||null]
    );
    await db("UPDATE caisse_sessions SET total_decaisse=total_decaisse+$1 WHERE clinique_id=$2 AND caisse_id=$3 AND date=CURRENT_DATE AND statut='ouverte'", [charge.montant, cid, caisse_id]);

    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

"""
    content = content.replace(anchor, nouvelles_routes + anchor)
    print("Patché : nouvelles routes demandes de paiement")

    tmp_path = path + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        f.write(content)
    os.replace(tmp_path, path)

    print(f"\nTous les patches appliqués avec succès sur {path}")

if __name__ == "__main__":
    patch(PATH)
