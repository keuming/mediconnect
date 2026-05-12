const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { query } = require('../config/db');
const { auth, can } = require('../middleware/auth');

const vd = d => d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;

// GET /api/patients
router.get('/', auth, async (req, res) => {
  try {
    let r;
    if (req.user.role === 'clinique' && req.user.profile_id) {
      r = await query(
        `SELECT DISTINCT p.* FROM patients p
         JOIN rendez_vous rv ON rv.patient_id=p.id AND rv.clinique_id=$1
         ORDER BY p.created_at DESC LIMIT 500`,
        [req.user.profile_id]
      );
    } else if (req.user.role === 'admin') {
      r = await query('SELECT * FROM patients ORDER BY created_at DESC LIMIT 500');
    } else {
      r = await query('SELECT * FROM patients WHERE user_id=$1 LIMIT 1', [req.user.id]);
    }
    res.json({ success: true, data: r.rows });
  } catch (e) { res.json({ success: true, data: [] }); }
});

// GET /api/patients/mon-profil
router.get('/mon-profil', auth, can('patient'), async (req, res) => {
  try {
    const r = await query('SELECT * FROM patients WHERE user_id=$1 LIMIT 1', [req.user.id]);
    res.json({ success: true, data: r.rows[0] || null });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET /api/patients/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const r = await query('SELECT * FROM patients WHERE id=$1', [req.params.id]);
    res.json({ success: true, data: r.rows[0] || null });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST /api/patients
router.post('/', auth, can('clinique', 'admin'), async (req, res) => {
  const { prenom, nom, telephone, date_naissance, sexe, groupe_sanguin, allergies, antecedents, ville, adresse } = req.body;
  if (!prenom || !nom)
    return res.status(400).json({ success: false, message: 'Prénom et nom requis' });
  try {
    const code = 'MC-' + (prenom[0] + nom[0]).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000);
    const r = await query(
      `INSERT INTO patients
         (id,user_id,code_secret,date_naissance,sexe,groupe_sanguin,telephone,allergies,antecedents,ville,adresse)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [uuid(), null, code, vd(date_naissance), sexe || null, groupe_sanguin || null,
       telephone || null, allergies ? [allergies] : null,
       antecedents || null, ville || null, adresse || null]
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// PUT /api/patients/:id
router.put('/:id', auth, async (req, res) => {
  const { telephone, groupe_sanguin, allergies, antecedents, adresse, ville, quartier, poids, taille } = req.body;
  try {
    const r = await query(
      `UPDATE patients
       SET telephone=COALESCE($1,telephone), groupe_sanguin=COALESCE($2,groupe_sanguin),
           allergies=COALESCE($3,allergies), antecedents=COALESCE($4,antecedents),
           adresse=COALESCE($5,adresse), ville=COALESCE($6,ville),
           quartier=COALESCE($7,quartier), poids=COALESCE($8,poids), taille=COALESCE($9,taille)
       WHERE id=$10 RETURNING *`,
      [telephone, groupe_sanguin,
       allergies ? (Array.isArray(allergies) ? allergies : [allergies]) : null,
       antecedents, adresse, ville, quartier, poids, taille, req.params.id]
    );
    res.json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
