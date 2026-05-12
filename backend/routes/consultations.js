const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { query } = require('../config/db');
const { auth } = require('../middleware/auth');

// GET /api/consultations
router.get('/', auth, async (req, res) => {
  try {
    const { patient_id } = req.query;
    let sql = 'SELECT * FROM consultations WHERE 1=1';
    const p = [];
    if (patient_id) { p.push(patient_id); sql += ` AND patient_id=$${p.length}`; }
    else if (req.user.role === 'clinique' && req.user.profile_id) {
      p.push(req.user.profile_id); sql += ` AND clinique_id=$${p.length}`;
    }
    sql += ' ORDER BY created_at DESC LIMIT 100';
    const r = await query(sql, p);
    res.json({ success: true, data: r.rows });
  } catch (e) { res.json({ success: true, data: [] }); }
});

// POST /api/consultations
router.post('/', auth, async (req, res) => {
  const { patient_id, medecin_id, medecin_independant_id, rdv_id,
          motif, diagnostic, ta, fc, spo2, temperature,
          poids, taille, examen_clinique, note_finale } = req.body;
  if (!patient_id || !diagnostic || !motif)
    return res.status(400).json({ success: false, message: 'Patient, motif et diagnostic requis' });
  try {
    const cr = req.user.role === 'clinique'
      ? await query('SELECT id FROM cliniques WHERE user_id=$1 LIMIT 1', [req.user.id])
      : { rows: [] };
    const r = await query(
      `INSERT INTO consultations
         (id,patient_id,clinique_id,medecin_id,medecin_independant_id,rdv_id,
          motif,diagnostic,ta,fc,spo2,temperature,poids,taille,examen_clinique,note_finale,statut)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'brouillon') RETURNING *`,
      [uuid(), patient_id, cr.rows[0]?.id || null,
       medecin_id || null, medecin_independant_id || null, rdv_id || null,
       motif, diagnostic, ta || null, fc || null, spo2 || null,
       temperature || null, poids || null, taille || null,
       examen_clinique || null, note_finale || null]
    );
    if (rdv_id)
      await query("UPDATE rendez_vous SET statut='en_cours' WHERE id=$1", [rdv_id]).catch(() => {});
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// PUT /api/consultations/:id/finaliser
router.put('/:id/finaliser', auth, async (req, res) => {
  try {
    const r = await query(
      "UPDATE consultations SET statut='finalisee' WHERE id=$1 RETURNING *",
      [req.params.id]
    );
    res.json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
