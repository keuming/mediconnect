const router = require('express').Router();
const { query } = require('../config/db');
const { auth } = require('../middleware/auth');
const { v4: uuid } = require('uuid');

const init = async () => {
  await query(`CREATE TABLE IF NOT EXISTS consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID, clinique_id UUID, medecin_id UUID,
    medecin_nom VARCHAR(200), rdv_id UUID,
    diagnostic TEXT, traitement TEXT, notes TEXT,
    tension_arterielle VARCHAR(20), temperature VARCHAR(10),
    poids VARCHAR(10), taille VARCHAR(10),
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`).catch(e => console.error('Table consultations:', e.message));
};
init();

router.get('/', auth, async (req, res) => {
  try {
    const { patient_id } = req.query;
    const cliniqueId = req.user?.clinique_id;
    let sql = 'SELECT * FROM consultations WHERE 1=1';
    const params = [];
    if (patient_id) { params.push(patient_id); sql += ` AND patient_id=$${params.length}`; }
    if (cliniqueId && !patient_id) { params.push(cliniqueId); sql += ` AND clinique_id=$${params.length}`; }
    sql += ' ORDER BY created_at DESC LIMIT 100';
    const r = await query(sql, params);
    res.json({ success: true, data: r.rows });
  } catch(err) { res.json({ success: true, data: [] }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { patient_id, diagnostic, traitement, notes, tension_arterielle, temperature, poids, taille, rdv_id } = req.body;
    if (!patient_id || !diagnostic) return res.status(400).json({ success: false, message: 'Patient et diagnostic requis' });
    const cliniqueId = req.user?.clinique_id;
    const r = await query(
      `INSERT INTO consultations (id,patient_id,clinique_id,diagnostic,traitement,notes,tension_arterielle,temperature,poids,taille,rdv_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [uuid(),patient_id,cliniqueId,diagnostic,traitement||null,notes||null,tension_arterielle||null,temperature||null,poids||null,taille||null,rdv_id||null]
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
