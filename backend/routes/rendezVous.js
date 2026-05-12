const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { query } = require('../config/db');
const { auth } = require('../middleware/auth');

const vd = d => d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;

// GET /api/rendez-vous
router.get('/', auth, async (req, res) => {
  try {
    const { date, statut, medecin_id } = req.query;
    let sql = 'SELECT rv.* FROM rendez_vous rv WHERE 1=1';
    const p = [];
    if (req.user.role === 'clinique' && req.user.profile_id) {
      p.push(req.user.profile_id); sql += ` AND rv.clinique_id=$${p.length}`;
    }
    if (req.user.role === 'patient' && req.user.profile_id) {
      p.push(req.user.profile_id); sql += ` AND rv.patient_id=$${p.length}`;
    }
    if (date)       { p.push(date);       sql += ` AND rv.date_rdv=$${p.length}`; }
    if (statut)     { p.push(statut);     sql += ` AND rv.statut=$${p.length}`; }
    if (medecin_id) { p.push(medecin_id); sql += ` AND rv.medecin_id=$${p.length}`; }
    sql += ' ORDER BY rv.date_rdv,rv.heure_rdv LIMIT 200';
    const r = await query(sql, p);
    res.json({ success: true, data: r.rows });
  } catch (e) { res.json({ success: true, data: [] }); }
});

// POST /api/rendez-vous
router.post('/', auth, async (req, res) => {
  const { patient_id, clinique_id, medecin_id, medecin_independant_id,
          date_rdv, heure_rdv, motif, assurance, numero_police, notes } = req.body;
  if (!date_rdv || !heure_rdv)
    return res.status(400).json({ success: false, message: 'Date et heure requises' });
  if (!clinique_id && !medecin_independant_id)
    return res.status(400).json({ success: false, message: 'Clinique ou médecin indépendant requis' });
  try {
    const r = await query(
      `INSERT INTO rendez_vous
         (id,patient_id,clinique_id,medecin_id,medecin_independant_id,
          date_rdv,heure_rdv,motif,assurance,numero_police,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [uuid(), patient_id || null, clinique_id || null, medecin_id || null,
       medecin_independant_id || null, date_rdv, heure_rdv,
       motif || null, assurance || null, numero_police || null, notes || null]
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// PUT /api/rendez-vous/:id
router.put('/:id', auth, async (req, res) => {
  const { statut, motif, heure_rdv, date_rdv, notes } = req.body;
  try {
    const r = await query(
      `UPDATE rendez_vous
       SET statut=COALESCE($1,statut), motif=COALESCE($2,motif),
           heure_rdv=COALESCE($3,heure_rdv), date_rdv=COALESCE($4,date_rdv),
           notes=COALESCE($5,notes)
       WHERE id=$6 RETURNING *`,
      [statut, motif, heure_rdv, vd(date_rdv), notes, req.params.id]
    );
    res.json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// DELETE /api/rendez-vous/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await query('DELETE FROM rendez_vous WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
