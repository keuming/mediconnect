const router = require('express').Router();
const { db } = require('../config/db');
const { auth, can } = require('../middleware/auth');

const isOptique = (req) => ['optique','admin'].includes(req.user?.role);

// ── CABINET INFO ──────────────────────────────────────────────────
router.get('/info', auth, async (req, res) => {
  try {
    const r = await db('SELECT * FROM cabinets_optiques WHERE user_id=$1 LIMIT 1', [req.user.id]);
    res.json({ success: true, data: r.rows[0] || null });
  } catch(e) { res.json({ success: true, data: null }); }
});

// ── DASHBOARD STATS ───────────────────────────────────────────────
router.get('/stats', auth, async (req, res) => {
  try {
    const cid = req.user?.cabinet_optique_id || req.user?.id;
    const today = new Date().toISOString().split('T')[0];
    const [ca_jour, ca_mois, ventes_mois, stock_alerte, patients_mois, attente] = await Promise.all([
      db(`SELECT COALESCE(SUM(montant_net),0) ca FROM ventes_optiques WHERE cabinet_id=$1 AND DATE(created_at)=$2 AND statut!='annule'`, [cid, today]).catch(()=>({rows:[{ca:0}]})),
      db(`SELECT COALESCE(SUM(montant_net),0) ca FROM ventes_optiques WHERE cabinet_id=$1 AND date_trunc('month',created_at)=date_trunc('month',NOW()) AND statut!='annule'`, [cid]).catch(()=>({rows:[{ca:0}]})),
      db(`SELECT COUNT(*) c FROM ventes_optiques WHERE cabinet_id=$1 AND date_trunc('month',created_at)=date_trunc('month',NOW())`, [cid]).catch(()=>({rows:[{c:0}]})),
      db(`SELECT COUNT(*) c FROM (
        SELECT id FROM stock_montures WHERE cabinet_id=$1 AND quantite<=seuil_alerte AND is_active=true
        UNION ALL
        SELECT id FROM stock_verres WHERE cabinet_id=$1 AND quantite<=seuil_alerte AND is_active=true
        UNION ALL
        SELECT id FROM stock_accessoires_optiques WHERE cabinet_id=$1 AND quantite<=seuil_alerte AND is_active=true
      ) s`, [cid]).catch(()=>({rows:[{c:0}]})),
      db(`SELECT COUNT(*) c FROM patients_optiques WHERE cabinet_id=$1 AND date_trunc('month',created_at)=date_trunc('month',NOW())`, [cid]).catch(()=>({rows:[{c:0}]})),
      db(`SELECT COUNT(*) c FROM ventes_optiques WHERE cabinet_id=$1 AND statut='en_cours'`, [cid]).catch(()=>({rows:[{c:0}]})),
    ]);
    res.json({ success: true, data: {
      ca_aujourd_hui:    +ca_jour.rows[0]?.ca || 0,
      ca_ce_mois:        +ca_mois.rows[0]?.ca || 0,
      ventes_ce_mois:    +ventes_mois.rows[0]?.c || 0,
      alertes_stock:     +stock_alerte.rows[0]?.c || 0,
      nouveaux_patients: +patients_mois.rows[0]?.c || 0,
      commandes_en_cours:+attente.rows[0]?.c || 0,
    }});
  } catch(e) { res.json({ success: true, data: {} }); }
});

// ── PATIENTS OPTIQUES ─────────────────────────────────────────────
router.get('/patients', auth, async (req, res) => {
  try {
    const { q } = req.query;
    const cid = req.user?.cabinet_optique_id || req.user?.id;
    let sql = 'SELECT * FROM patients_optiques WHERE cabinet_id=$1';
    const p = [cid];
    if (q) { p.push(`%${q}%`); sql += ` AND (prenom ILIKE $${p.length} OR nom ILIKE $${p.length} OR telephone ILIKE $${p.length})`; }
    sql += ' ORDER BY nom, prenom LIMIT 200';
    const r = await db(sql, p);
    res.json({ success: true, data: r.rows });
  } catch(e) { res.json({ success: true, data: [] }); }
});

router.get('/patients/:id', auth, async (req, res) => {
  try {
    const r = await db('SELECT * FROM patients_optiques WHERE id=$1', [req.params.id]);
    const ord = await db('SELECT * FROM ordonnances_optiques WHERE patient_id=$1 ORDER BY created_at DESC LIMIT 10', [req.params.id]);
    const ventes = await db('SELECT * FROM ventes_optiques WHERE patient_id=$1 ORDER BY created_at DESC LIMIT 10', [req.params.id]);
    res.json({ success: true, data: { ...r.rows[0], ordonnances: ord.rows, ventes: ventes.rows } });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/patients', auth, async (req, res) => {
  const { prenom, nom, date_naissance, telephone, email, adresse, ville,
          assurance, numero_police, taux_prise_en_charge,
          od_sphere, od_cylindre, od_axe, og_sphere, og_cylindre, og_axe,
          addition, ecart_pupillaire, notes } = req.body;
  if (!prenom || !nom) return res.status(400).json({ success: false, message: 'Prénom et nom requis' });
  try {
    const cid = req.user?.cabinet_optique_id || req.user?.id;
    const r = await db(`
      INSERT INTO patients_optiques
        (cabinet_id,prenom,nom,date_naissance,telephone,email,adresse,ville,
         assurance,numero_police,taux_prise_en_charge,
         od_sphere,od_cylindre,od_axe,og_sphere,og_cylindre,og_axe,
         addition,ecart_pupillaire,notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
      RETURNING *`,
      [cid,prenom,nom,date_naissance||null,telephone||null,email||null,adresse||null,ville||null,
       assurance||null,numero_police||null,taux_prise_en_charge||0,
       od_sphere||null,od_cylindre||null,od_axe||null,og_sphere||null,og_cylindre||null,og_axe||null,
       addition||null,ecart_pupillaire||null,notes||null]
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/patients/:id', auth, async (req, res) => {
  const { prenom, nom, telephone, email, assurance, numero_police, taux_prise_en_charge,
          od_sphere, od_cylindre, od_axe, og_sphere, og_cylindre, og_axe,
          addition, ecart_pupillaire, notes } = req.body;
  try {
    const r = await db(`
      UPDATE patients_optiques SET
        prenom=COALESCE($1,prenom), nom=COALESCE($2,nom), telephone=COALESCE($3,telephone),
        email=COALESCE($4,email), assurance=COALESCE($5,assurance),
        numero_police=COALESCE($6,numero_police), taux_prise_en_charge=COALESCE($7,taux_prise_en_charge),
        od_sphere=COALESCE($8,od_sphere), od_cylindre=COALESCE($9,od_cylindre), od_axe=COALESCE($10,od_axe),
        og_sphere=COALESCE($11,og_sphere), og_cylindre=COALESCE($12,og_cylindre), og_axe=COALESCE($13,og_axe),
        addition=COALESCE($14,addition), ecart_pupillaire=COALESCE($15,ecart_pupillaire),
        notes=COALESCE($16,notes), updated_at=NOW()
      WHERE id=$17 RETURNING *`,
      [prenom,nom,telephone,email,assurance,numero_police,taux_prise_en_charge,
       od_sphere,od_cylindre,od_axe,og_sphere,og_cylindre,og_axe,addition,ecart_pupillaire,notes,req.params.id]
    );
    res.json({ success: true, data: r.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── ORDONNANCES OPTIQUES ──────────────────────────────────────────
router.get('/ordonnances', auth, async (req, res) => {
  try {
    const cid = req.user?.cabinet_optique_id || req.user?.id;
    const r = await db('SELECT * FROM ordonnances_optiques WHERE cabinet_id=$1 ORDER BY created_at DESC LIMIT 100', [cid]);
    res.json({ success: true, data: r.rows });
  } catch(e) { res.json({ success: true, data: [] }); }
});

router.post('/ordonnances', auth, async (req, res) => {
  const { patient_id, patient_nom, medecin_prescripteur, date_prescription, date_validite,
          od_sphere, od_cylindre, od_axe, od_addition, og_sphere, og_cylindre, og_axe, og_addition,
          ecart_pupillaire_vl, ecart_pupillaire_vp, type_correction,
          diagnostic_ophtalmologique, notes } = req.body;
  try {
    const cid = req.user?.cabinet_optique_id || req.user?.id;
    const r = await db(`
      INSERT INTO ordonnances_optiques
        (cabinet_id,patient_id,patient_nom,medecin_prescripteur,date_prescription,date_validite,
         od_sphere,od_cylindre,od_axe,od_addition,og_sphere,og_cylindre,og_axe,og_addition,
         ecart_pupillaire_vl,ecart_pupillaire_vp,type_correction,diagnostic_ophtalmologique,notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
      RETURNING *`,
      [cid,patient_id||null,patient_nom||null,medecin_prescripteur||null,
       date_prescription||new Date().toISOString().split('T')[0],date_validite||null,
       od_sphere||null,od_cylindre||null,od_axe||null,od_addition||null,
       og_sphere||null,og_cylindre||null,og_axe||null,og_addition||null,
       ecart_pupillaire_vl||null,ecart_pupillaire_vp||null,
       type_correction||'unifocal',diagnostic_ophtalmologique||null,notes||null]
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── STOCK MONTURES ────────────────────────────────────────────────
router.get('/stock/montures', auth, async (req, res) => {
  try {
    const cid = req.user?.cabinet_optique_id || req.user?.id;
    const { alerte } = req.query;
    let sql = 'SELECT * FROM stock_montures WHERE cabinet_id=$1 AND is_active=true';
    const p = [cid];
    if (alerte === 'true') sql += ' AND quantite<=seuil_alerte';
    sql += ' ORDER BY marque, modele';
    const r = await db(sql, p);
    res.json({ success: true, data: r.rows });
  } catch(e) { res.json({ success: true, data: [] }); }
});

router.post('/stock/montures', auth, async (req, res) => {
  const { reference, marque, modele, couleur, taille, materiau, genre,
          quantite, seuil_alerte, prix_achat, prix_vente, fournisseur } = req.body;
  if (!marque || !prix_vente) return res.status(400).json({ success: false, message: 'Marque et prix de vente requis' });
  try {
    const cid = req.user?.cabinet_optique_id || req.user?.id;
    const r = await db(`
      INSERT INTO stock_montures
        (cabinet_id,reference,marque,modele,couleur,taille,materiau,genre,
         quantite,seuil_alerte,prix_achat,prix_vente,fournisseur)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [cid,reference||null,marque,modele||null,couleur||null,taille||null,
       materiau||null,genre||'mixte',quantite||0,seuil_alerte||2,
       prix_achat||null,prix_vente,fournisseur||null]
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/stock/montures/:id', auth, async (req, res) => {
  const { marque, modele, couleur, quantite, seuil_alerte, prix_vente, prix_achat } = req.body;
  try {
    const r = await db(`
      UPDATE stock_montures SET
        marque=COALESCE($1,marque), modele=COALESCE($2,modele), couleur=COALESCE($3,couleur),
        quantite=COALESCE($4,quantite), seuil_alerte=COALESCE($5,seuil_alerte),
        prix_vente=COALESCE($6,prix_vente), prix_achat=COALESCE($7,prix_achat), updated_at=NOW()
      WHERE id=$8 RETURNING *`,
      [marque,modele,couleur,quantite,seuil_alerte,prix_vente,prix_achat,req.params.id]
    );
    res.json({ success: true, data: r.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/stock/montures/:id', auth, async (req, res) => {
  try {
    await db('UPDATE stock_montures SET is_active=false WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── STOCK VERRES ──────────────────────────────────────────────────
router.get('/stock/verres', auth, async (req, res) => {
  try {
    const cid = req.user?.cabinet_optique_id || req.user?.id;
    const r = await db('SELECT * FROM stock_verres WHERE cabinet_id=$1 AND is_active=true ORDER BY marque, type_verre', [cid]);
    res.json({ success: true, data: r.rows });
  } catch(e) { res.json({ success: true, data: [] }); }
});

router.post('/stock/verres', auth, async (req, res) => {
  const { reference, marque, type_verre, indice, traitement, teinte,
          gamme_sphere_min, gamme_sphere_max, gamme_cylindre_max,
          quantite, seuil_alerte, prix_achat, prix_vente_paire, fournisseur } = req.body;
  if (!marque || !type_verre || !prix_vente_paire) return res.status(400).json({ success: false, message: 'Marque, type et prix requis' });
  try {
    const cid = req.user?.cabinet_optique_id || req.user?.id;
    const r = await db(`
      INSERT INTO stock_verres
        (cabinet_id,reference,marque,type_verre,indice,traitement,teinte,
         gamme_sphere_min,gamme_sphere_max,gamme_cylindre_max,
         quantite,seuil_alerte,prix_achat,prix_vente_paire,fournisseur)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [cid,reference||null,marque,type_verre,indice||1.50,traitement||null,teinte||null,
       gamme_sphere_min||null,gamme_sphere_max||null,gamme_cylindre_max||null,
       quantite||0,seuil_alerte||2,prix_achat||null,prix_vente_paire,fournisseur||null]
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/stock/verres/:id', auth, async (req, res) => {
  const { quantite, seuil_alerte, prix_vente_paire, traitement } = req.body;
  try {
    const r = await db(`
      UPDATE stock_verres SET
        quantite=COALESCE($1,quantite), seuil_alerte=COALESCE($2,seuil_alerte),
        prix_vente_paire=COALESCE($3,prix_vente_paire), traitement=COALESCE($4,traitement), updated_at=NOW()
      WHERE id=$5 RETURNING *`,
      [quantite,seuil_alerte,prix_vente_paire,traitement,req.params.id]
    );
    res.json({ success: true, data: r.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── STOCK ACCESSOIRES ─────────────────────────────────────────────
router.get('/stock/accessoires', auth, async (req, res) => {
  try {
    const cid = req.user?.cabinet_optique_id || req.user?.id;
    const r = await db('SELECT * FROM stock_accessoires_optiques WHERE cabinet_id=$1 AND is_active=true ORDER BY nom', [cid]);
    res.json({ success: true, data: r.rows });
  } catch(e) { res.json({ success: true, data: [] }); }
});

router.post('/stock/accessoires', auth, async (req, res) => {
  const { nom, categorie, quantite, seuil_alerte, prix_achat, prix_vente, fournisseur } = req.body;
  if (!nom || !prix_vente) return res.status(400).json({ success: false, message: 'Nom et prix requis' });
  try {
    const cid = req.user?.cabinet_optique_id || req.user?.id;
    const r = await db(`
      INSERT INTO stock_accessoires_optiques (cabinet_id,nom,categorie,quantite,seuil_alerte,prix_achat,prix_vente,fournisseur)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [cid,nom,categorie||'autre',quantite||0,seuil_alerte||5,prix_achat||null,prix_vente,fournisseur||null]
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── VENTES ────────────────────────────────────────────────────────
router.get('/ventes', auth, async (req, res) => {
  try {
    const cid = req.user?.cabinet_optique_id || req.user?.id;
    const { statut, est_assure } = req.query;
    let sql = 'SELECT * FROM ventes_optiques WHERE cabinet_id=$1';
    const p = [cid];
    if (statut)     { p.push(statut);    sql += ` AND statut=$${p.length}`; }
    if (est_assure !== undefined) { p.push(est_assure==='true'); sql += ` AND est_assure=$${p.length}`; }
    sql += ' ORDER BY created_at DESC LIMIT 200';
    const r = await db(sql, p);
    res.json({ success: true, data: r.rows });
  } catch(e) { res.json({ success: true, data: [] }); }
});

router.get('/ventes/:id', auth, async (req, res) => {
  try {
    const r = await db('SELECT * FROM ventes_optiques WHERE id=$1', [req.params.id]);
    res.json({ success: true, data: r.rows[0] || null });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/ventes', auth, async (req, res) => {
  const { patient_nom, patient_id, ordonnance_id, monture_id, monture_desc, monture_prix,
          verre_od_id, verre_og_id, verres_desc, verres_prix, pose_prix, accessoires_json,
          montant_total, remise_montant, est_assure, assurance, numero_police,
          taux_prise_en_charge, montant_assurance, montant_patient,
          mode_paiement, acompte_verse, date_livraison_prevue, notes } = req.body;
  if (!patient_nom) return res.status(400).json({ success: false, message: 'Nom patient requis' });
  try {
    const cid = req.user?.cabinet_optique_id || req.user?.id;
    const ref = 'OPT-' + Date.now().toString(36).toUpperCase();
    const net = (montant_total || 0) - (remise_montant || 0);
    const solde = net - (acompte_verse || 0) - (montant_assurance || 0);
    const statut_paiement = solde <= 0 ? 'solde' : (acompte_verse > 0 ? 'partiel' : 'en_attente');

    const r = await db(`
      INSERT INTO ventes_optiques
        (reference,cabinet_id,patient_nom,patient_id,ordonnance_id,
         monture_id,monture_desc,monture_prix,verre_od_id,verre_og_id,
         verres_desc,verres_prix,pose_prix,accessoires_json,
         montant_total,remise_montant,montant_net,
         est_assure,assurance,numero_police,taux_prise_en_charge,
         montant_assurance,montant_patient,mode_paiement,
         acompte_verse,solde_restant,statut_paiement,date_livraison_prevue,notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29)
      RETURNING *`,
      [ref,cid,patient_nom,patient_id||null,ordonnance_id||null,
       monture_id||null,monture_desc||null,monture_prix||0,
       verre_od_id||null,verre_og_id||null,verres_desc||null,verres_prix||0,
       pose_prix||0,JSON.stringify(accessoires_json||[]),
       montant_total||0,remise_montant||0,net,
       est_assure||false,assurance||null,numero_police||null,taux_prise_en_charge||0,
       montant_assurance||0,montant_patient||net,
       mode_paiement||'Espèces',acompte_verse||0,solde,statut_paiement,
       date_livraison_prevue||null,notes||null]
    );

    // Décrémenter stock monture
    if (monture_id) {
      await db('UPDATE stock_montures SET quantite=GREATEST(0,quantite-1),updated_at=NOW() WHERE id=$1', [monture_id]).catch(()=>{});
    }

    // Créer facture automatiquement
    const facRef = 'FAC-OPT-' + Date.now().toString(36).toUpperCase();
    await db(`
      INSERT INTO factures_optiques (reference,cabinet_id,vente_id,patient_nom,patient_id,
        montant_total,montant_assurance,montant_patient,montant_paye,statut,mode_paiement)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [facRef,cid,r.rows[0].id,patient_nom,patient_id||null,
       net,montant_assurance||0,montant_patient||net,acompte_verse||0,
       statut_paiement==='solde'?'payee':'emise',mode_paiement||'Espèces']
    ).catch(()=>{});

    res.status(201).json({ success: true, data: r.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/ventes/:id', auth, async (req, res) => {
  const { statut, statut_paiement, acompte_verse, date_livraison_effective, notes } = req.body;
  try {
    const r = await db(`
      UPDATE ventes_optiques SET
        statut=COALESCE($1,statut),
        statut_paiement=COALESCE($2,statut_paiement),
        acompte_verse=COALESCE($3,acompte_verse),
        date_livraison_effective=COALESCE($4,date_livraison_effective),
        notes=COALESCE($5,notes), updated_at=NOW()
      WHERE id=$6 RETURNING *`,
      [statut,statut_paiement,acompte_verse,date_livraison_effective||null,notes,req.params.id]
    );
    res.json({ success: true, data: r.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── FACTURES ─────────────────────────────────────────────────────
router.get('/factures', auth, async (req, res) => {
  try {
    const cid = req.user?.cabinet_optique_id || req.user?.id;
    const r = await db('SELECT f.*,v.reference AS vente_ref FROM factures_optiques f LEFT JOIN ventes_optiques v ON v.id=f.vente_id WHERE f.cabinet_id=$1 ORDER BY f.created_at DESC LIMIT 200', [cid]);
    res.json({ success: true, data: r.rows });
  } catch(e) { res.json({ success: true, data: [] }); }
});

router.put('/factures/:id', auth, async (req, res) => {
  const { statut, montant_paye, mode_paiement } = req.body;
  try {
    const r = await db(`
      UPDATE factures_optiques SET
        statut=COALESCE($1,statut), montant_paye=COALESCE($2,montant_paye),
        mode_paiement=COALESCE($3,mode_paiement), updated_at=NOW()
      WHERE id=$4 RETURNING *`,
      [statut,montant_paye,mode_paiement,req.params.id]
    );
    res.json({ success: true, data: r.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── ASSURANCES OPTIQUES ───────────────────────────────────────────
router.get('/assurances', auth, async (req, res) => {
  try {
    const cid = req.user?.cabinet_optique_id || req.user?.id;
    const r = await db('SELECT * FROM assurances_optiques WHERE cabinet_id=$1 ORDER BY created_at DESC', [cid]);
    res.json({ success: true, data: r.rows });
  } catch(e) { res.json({ success: true, data: [] }); }
});

router.post('/assurances', auth, async (req, res) => {
  const { vente_id, patient_nom, patient_id, compagnie, numero_police,
          plafond_monture, plafond_verres, montant_monture, montant_verres } = req.body;
  if (!compagnie || !patient_nom) return res.status(400).json({ success: false, message: 'Compagnie et patient requis' });
  try {
    const cid = req.user?.cabinet_optique_id || req.user?.id;
    const ref = 'ASS-OPT-' + Date.now().toString(36).toUpperCase();
    const total = (montant_monture || 0) + (montant_verres || 0);
    const pec = Math.min(total, (plafond_monture || 0) + (plafond_verres || 0));
    const ticket = total - pec;
    const r = await db(`
      INSERT INTO assurances_optiques
        (reference,cabinet_id,vente_id,patient_nom,patient_id,compagnie,numero_police,
         plafond_monture,plafond_verres,montant_monture,montant_verres,
         montant_total_soumis,montant_pris_en_charge,ticket_moderateur)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [ref,cid,vente_id||null,patient_nom,patient_id||null,compagnie,numero_police||null,
       plafond_monture||null,plafond_verres||null,montant_monture||0,montant_verres||0,
       total,pec,ticket]
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/assurances/:id', auth, async (req, res) => {
  const { statut, motif_rejet, date_reponse } = req.body;
  try {
    const r = await db(`
      UPDATE assurances_optiques SET statut=COALESCE($1,statut),
        motif_rejet=COALESCE($2,motif_rejet), date_reponse=COALESCE($3,date_reponse), updated_at=NOW()
      WHERE id=$4 RETURNING *`,
      [statut,motif_rejet||null,date_reponse||null,req.params.id]
    );
    res.json({ success: true, data: r.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── FOURNISSEURS ──────────────────────────────────────────────────
router.get('/fournisseurs', auth, async (req, res) => {
  try {
    const cid = req.user?.cabinet_optique_id || req.user?.id;
    const r = await db('SELECT * FROM fournisseurs_optiques WHERE cabinet_id=$1 AND is_active=true ORDER BY nom', [cid]);
    res.json({ success: true, data: r.rows });
  } catch(e) { res.json({ success: true, data: [] }); }
});

router.post('/fournisseurs', auth, async (req, res) => {
  const { nom, contact, telephone, email, adresse, categorie, delai_livraison_jours } = req.body;
  if (!nom) return res.status(400).json({ success: false, message: 'Nom requis' });
  try {
    const cid = req.user?.cabinet_optique_id || req.user?.id;
    const r = await db(`
      INSERT INTO fournisseurs_optiques (cabinet_id,nom,contact,telephone,email,adresse,categorie,delai_livraison_jours)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [cid,nom,contact||null,telephone||null,email||null,adresse||null,categorie||'tout',delai_livraison_jours||7]
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── PATIENTS ASSURÉS ──────────────────────────────────────────────
router.get('/patients-assures', auth, async (req, res) => {
  try {
    const cid = req.user?.cabinet_optique_id || req.user?.id;
    const r = await db(`
      SELECT p.*, COUNT(v.id) AS nb_ventes,
             COALESCE(SUM(v.montant_assurance),0) AS total_assurance
      FROM patients_optiques p
      LEFT JOIN ventes_optiques v ON v.patient_id=p.id AND v.est_assure=true
      WHERE p.cabinet_id=$1 AND p.assurance IS NOT NULL AND p.assurance != ''
      GROUP BY p.id ORDER BY p.nom, p.prenom`,
      [cid]
    );
    res.json({ success: true, data: r.rows });
  } catch(e) { res.json({ success: true, data: [] }); }
});

// ── STATISTIQUES ──────────────────────────────────────────────────
router.get('/statistiques', auth, async (req, res) => {
  try {
    const cid = req.user?.cabinet_optique_id || req.user?.id;
    const { annee } = req.query;
    const a = annee || new Date().getFullYear();

    const [ca_mensuel, top_montures, repartition_assurance, corrections] = await Promise.all([
      db(`SELECT EXTRACT(MONTH FROM created_at) AS mois,
               TO_CHAR(created_at,'Mon') AS mois_label,
               COUNT(*) AS nb_ventes, COALESCE(SUM(montant_net),0) AS ca
          FROM ventes_optiques WHERE cabinet_id=$1 AND EXTRACT(YEAR FROM created_at)=$2 AND statut!='annule'
          GROUP BY mois, mois_label ORDER BY mois`, [cid, a]).catch(()=>({rows:[]})),

      db(`SELECT monture_desc, COUNT(*) AS nb, COALESCE(SUM(monture_prix),0) AS ca
          FROM ventes_optiques WHERE cabinet_id=$1 AND monture_desc IS NOT NULL AND statut!='annule'
          GROUP BY monture_desc ORDER BY nb DESC LIMIT 10`, [cid]).catch(()=>({rows:[]})),

      db(`SELECT est_assure, COUNT(*) AS nb, COALESCE(SUM(montant_net),0) AS ca
          FROM ventes_optiques WHERE cabinet_id=$1 AND EXTRACT(YEAR FROM created_at)=$2
          GROUP BY est_assure`, [cid, a]).catch(()=>({rows:[]})),

      db(`SELECT type_correction, COUNT(*) AS nb
          FROM ordonnances_optiques WHERE cabinet_id=$1 AND EXTRACT(YEAR FROM created_at)=$2
          GROUP BY type_correction ORDER BY nb DESC`, [cid, a]).catch(()=>({rows:[]})),
    ]);

    res.json({ success: true, data: {
      ca_mensuel:           ca_mensuel.rows,
      top_montures:         top_montures.rows,
      repartition_assurance:repartition_assurance.rows,
      corrections:          corrections.rows,
    }});
  } catch(e) { res.json({ success: true, data: {} }); }
});

// ── DONNÉES POUR LE MINISTÈRE SANTÉ ──────────────────────────────
router.get('/ministere/troubles-visuels', auth, can('admin','ministere'), async (req, res) => {
  try {
    const { annee } = req.query;
    const a = annee || new Date().getFullYear();
    const r = await db(`
      SELECT
        type_correction,
        COUNT(*) AS cas,
        COUNT(CASE WHEN od_sphere < -0.5 OR og_sphere < -0.5 THEN 1 END) AS myopie,
        COUNT(CASE WHEN od_sphere > 0.5 OR og_sphere > 0.5 THEN 1 END) AS hypermétropie,
        COUNT(CASE WHEN od_cylindre IS NOT NULL OR og_cylindre IS NOT NULL THEN 1 END) AS astigmatisme,
        COUNT(CASE WHEN addition IS NOT NULL THEN 1 END) AS presbytie,
        ROUND(AVG(od_sphere),2) AS correction_moyenne_od,
        ROUND(AVG(og_sphere),2) AS correction_moyenne_og
      FROM ordonnances_optiques
      WHERE EXTRACT(YEAR FROM created_at)=$1
      GROUP BY type_correction ORDER BY cas DESC
    `, [a]);
    res.json({ success: true, data: r.rows, annee: a });
  } catch(e) { res.json({ success: true, data: [] }); }
});

module.exports = router;
