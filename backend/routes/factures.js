const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { query } = require('../config/db');
const { auth, can } = require('../middleware/auth');

const ref = px => px + '-' + Date.now().toString(36).toUpperCase();

// GET /api/factures
router.get('/', auth, async (req, res) => {
  try {
    let sql = 'SELECT * FROM factures WHERE 1=1';
    const p = [];
    if (req.user.role === 'clinique' && req.user.profile_id) {
      p.push(req.user.profile_id); sql += ` AND clinique_id=$${p.length}`;
    }
    if (req.user.role === 'patient' && req.user.profile_id) {
      p.push(req.user.profile_id); sql += ` AND patient_id=$${p.length}`;
    }
    sql += ' ORDER BY created_at DESC LIMIT 100';
    const r = await query(sql, p);
    res.json({ success: true, data: r.rows });
  } catch (e) { res.json({ success: true, data: [] }); }
});

// POST /api/factures
router.post('/', auth, can('clinique', 'admin', 'medecin_independant'), async (req, res) => {
  const { patient_id, consultation_id, montant_total, montant_assur, ticket_moder, mode_paiement } = req.body;
  if (!patient_id || !montant_total)
    return res.status(400).json({ success: false, message: 'Patient et montant requis' });
  try {
    const cliniqueRes = req.user.role === 'clinique'
      ? await query('SELECT id FROM cliniques WHERE user_id=$1 LIMIT 1', [req.user.id])
      : { rows: [] };
    const medIndepRes = req.user.role === 'medecin_independant'
      ? await query('SELECT id FROM medecins_independants WHERE user_id=$1 LIMIT 1', [req.user.id])
      : { rows: [] };
    const r = await query(
      `INSERT INTO factures
         (id,reference,clinique_id,medecin_independant_id,patient_id,consultation_id,
          montant_total,montant_assur,ticket_moder,mode_paiement)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [uuid(), ref('FAC'), cliniqueRes.rows[0]?.id || null,
       medIndepRes.rows[0]?.id || null, patient_id, consultation_id || null,
       montant_total, montant_assur || 0, ticket_moder || montant_total,
       mode_paiement || 'Especes']
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// PUT /api/factures/:id
router.put('/:id', auth, async (req, res) => {
  const { statut, mode_paiement } = req.body;
  try {
    const r = await query(
      'UPDATE factures SET statut=COALESCE($1,statut),mode_paiement=COALESCE($2,mode_paiement) WHERE id=$3 RETURNING *',
      [statut, mode_paiement, req.params.id]
    );
    res.json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
