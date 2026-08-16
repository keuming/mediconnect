const router = require('express').Router();
const { db } = require('../config/db');
const { auth } = require('../middleware/auth');

// ── CABINET INFO ──────────────────────────────────────────────────
router.get('/info', auth, async (req, res) => {
  try {
    const r = await db('SELECT * FROM cabinets_dentaires WHERE user_id=$1 LIMIT 1', [req.user.id]);
    res.json({ success: true, data: r.rows[0] || null });
  } catch(e) { res.json({ success: true, data: null }); }
});

// ── DASHBOARD STATS ───────────────────────────────────────────────
router.get('/stats', auth, async (req, res) => {
  try {
    const cid = req.user?.dentaire_id;
    const [patients, actes_mois, ca_mois, factures_attente] = await Promise.all([
      db(`SELECT COUNT(*) c FROM patients_dentaires WHERE cabinet_id=$1`, [cid]).catch(()=>({rows:[{c:0}]})),
      db(`SELECT COUNT(*) c FROM actes_dentaires WHERE cabinet_id=$1 AND date_trunc('month',date_acte)=date_trunc('month',NOW())`, [cid]).catch(()=>({rows:[{c:0}]})),
      db(`SELECT COALESCE(SUM(montant_total),0) ca FROM factures_dentaires WHERE cabinet_id=$1 AND date_trunc('month',date_facture)=date_trunc('month',NOW())`, [cid]).catch(()=>({rows:[{ca:0}]})),
      db(`SELECT COUNT(*) c FROM factures_dentaires WHERE cabinet_id=$1 AND statut='en_attente'`, [cid]).catch(()=>({rows:[{c:0}]})),
    ]);
    res.json({ success: true, data: {
      total_patients:     +patients.rows[0]?.c || 0,
      actes_ce_mois:      +actes_mois.rows[0]?.c || 0,
      ca_ce_mois:         +ca_mois.rows[0]?.ca || 0,
      factures_en_attente:+factures_attente.rows[0]?.c || 0,
    }});
  } catch(e) { res.json({ success: true, data: {} }); }
});

// ── PATIENTS ──────────────────────────────────────────────────────
router.get('/patients', auth, async (req, res) => {
  try {
    const { q } = req.query;
    const cid = req.user?.dentaire_id;
    let sql = 'SELECT * FROM patients_dentaires WHERE cabinet_id=$1';
    const params = [cid];
    if (q) {
      params.push('%' + q.toLowerCase() + '%');
      sql += ` AND (LOWER(prenom) LIKE $${params.length} OR LOWER(nom) LIKE $${params.length} OR telephone LIKE $${params.length})`;
    }
    sql += ' ORDER BY nom, prenom LIMIT 200';
    const r = await db(sql, params);
    res.json({ success: true, data: r.rows });
  } catch(e) { res.json({ success: true, data: [] }); }
});

router.post('/patients', auth, async (req, res) => {
  const { prenom, nom, date_naissance, telephone, email, adresse, ville, assurance, numero_police, taux_prise_en_charge, allergies, antecedents_medicaux, notes } = req.body;
  if (!prenom || !nom) return res.status(400).json({ success:false, message:'Prénom et nom requis' });
  try {
    const cid = req.user?.dentaire_id;
    const r = await db(
      `INSERT INTO patients_dentaires (id, cabinet_id, prenom, nom, date_naissance, telephone, email, adresse, ville, assurance, numero_police, taux_prise_en_charge, allergies, antecedents_medicaux, notes)
       VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [cid, prenom, nom, date_naissance||null, telephone||null, email||null, adresse||null, ville||null, assurance||null, numero_police||null, taux_prise_en_charge||null, allergies||null, antecedents_medicaux||null, notes||null]
    );
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

router.put('/patients/:id', auth, async (req, res) => {
  const { prenom, nom, telephone, email, adresse, ville, assurance, numero_police, allergies, antecedents_medicaux, notes } = req.body;
  try {
    const r = await db(
      `UPDATE patients_dentaires SET prenom=COALESCE($1,prenom), nom=COALESCE($2,nom), telephone=COALESCE($3,telephone),
         email=COALESCE($4,email), adresse=COALESCE($5,adresse), ville=COALESCE($6,ville), assurance=COALESCE($7,assurance),
         numero_police=COALESCE($8,numero_police), allergies=COALESCE($9,allergies), antecedents_medicaux=COALESCE($10,antecedents_medicaux),
         notes=COALESCE($11,notes), updated_at=NOW()
       WHERE id=$12 RETURNING *`,
      [prenom, nom, telephone, email, adresse, ville, assurance, numero_police, allergies, antecedents_medicaux, notes, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ success:false, message:'Patient introuvable' });
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

module.exports = router;
