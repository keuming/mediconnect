const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { query } = require('../config/db');
const { auth } = require('../middleware/auth');

// GET /api/ordonnances
router.get('/', auth, async (req, res) => {
  try {
    const { patient_id } = req.query;
    let sql = 'SELECT * FROM ordonnances WHERE 1=1';
    const p = [];
    if (patient_id) { p.push(patient_id); sql += ` AND patient_id=$${p.length}`; }
    sql += ' ORDER BY created_at DESC LIMIT 100';
    const r = await query(sql, p);
    res.json({ success: true, data: r.rows });
  } catch (e) { res.json({ success: true, data: [] }); }
});

// POST /api/ordonnances
router.post('/', auth, async (req, res) => {
  const { patient_id, medecin_id, medecin_independant_id,
          consultation_id, medicament, posologie, duree, renouvellements } = req.body;
  if (!patient_id || !medicament)
    return res.status(400).json({ success: false, message: 'Patient et médicament requis' });
  try {
    const r = await query(
      `INSERT INTO ordonnances
         (id,patient_id,medecin_id,medecin_independant_id,consultation_id,
          medicament,posologie,duree,renouvellements)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [uuid(), patient_id, medecin_id || null, medecin_independant_id || null,
       consultation_id || null, medicament, posologie || null,
       duree || '30 jours', renouvellements || 0]
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
