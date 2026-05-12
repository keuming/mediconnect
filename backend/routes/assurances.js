const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { query } = require('../config/db');
const { auth } = require('../middleware/auth');

const ref = px => px + '-' + Date.now().toString(36).toUpperCase();

// GET /api/assurances
router.get('/', auth, async (req, res) => {
  try {
    let sql = 'SELECT * FROM dossiers_assurance WHERE 1=1';
    const p = [];
    if (req.user.role === 'clinique' && req.user.profile_id) {
      p.push(req.user.profile_id); sql += ` AND clinique_id=$${p.length}`;
    }
    sql += ' ORDER BY created_at DESC LIMIT 100';
    const r = await query(sql, p);
    res.json({ success: true, data: r.rows });
  } catch (e) { res.json({ success: true, data: [] }); }
});

// POST /api/assurances
router.post('/', auth, async (req, res) => {
  const { patient_id, assureur_id, compagnie, numero_police,
          diagnostic, actes, montant_total, montant_assur, ticket_moder } = req.body;
  if (!patient_id || !compagnie || !montant_total)
    return res.status(400).json({ success: false, message: 'Patient, compagnie et montant requis' });
  try {
    const cr = await query('SELECT id FROM cliniques WHERE user_id=$1 LIMIT 1', [req.user.id]);
    const r = await query(
      `INSERT INTO dossiers_assurance
         (id,reference,patient_id,clinique_id,assureur_id,compagnie,numero_police,
          diagnostic,actes,montant_total,montant_assur,ticket_moder)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [uuid(), ref('ASS'), patient_id, cr.rows[0]?.id || null, assureur_id || null,
       compagnie, numero_police || null, diagnostic || null,
       actes || null, montant_total, montant_assur || 0, ticket_moder || montant_total]
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// PUT /api/assurances/:id
router.put('/:id', auth, async (req, res) => {
  const { statut, motif_rejet } = req.body;
  try {
    const r = await query(
      'UPDATE dossiers_assurance SET statut=COALESCE($1,statut),motif_rejet=COALESCE($2,motif_rejet),updated_at=NOW() WHERE id=$3 RETURNING *',
      [statut, motif_rejet || null, req.params.id]
    );
    res.json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
