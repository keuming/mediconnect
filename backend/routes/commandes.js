const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { query } = require('../config/db');
const { auth, can } = require('../middleware/auth');

const ref = px => px + '-' + Date.now().toString(36).toUpperCase();

// GET /api/commandes
router.get('/', auth, async (req, res) => {
  try {
    let sql = 'SELECT * FROM commandes WHERE 1=1';
    const p = [];
    if (req.user.role === 'patient' && req.user.profile_id) {
      p.push(req.user.profile_id); sql += ` AND patient_id=$${p.length}`;
    }
    if (req.user.role === 'livreur' && req.user.profile_id) {
      p.push(req.user.profile_id); sql += ` AND livreur_id=$${p.length}`;
    }
    sql += ' ORDER BY created_at DESC LIMIT 100';
    const r = await query(sql, p);
    res.json({ success: true, data: r.rows });
  } catch (e) { res.json({ success: true, data: [] }); }
});

// POST /api/commandes
router.post('/', auth, can('patient'), async (req, res) => {
  const { pharmacie_id, montant_total, adresse_livr, instructions, mode_paiement } = req.body;
  if (!pharmacie_id || !montant_total)
    return res.status(400).json({ success: false, message: 'Pharmacie et montant requis' });
  try {
    const r = await query(
      `INSERT INTO commandes
         (id,reference,patient_id,pharmacie_id,montant_total,adresse_livr,instructions,mode_paiement)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [uuid(), ref('CMD'), req.user.profile_id, pharmacie_id,
       montant_total, adresse_livr || null, instructions || null, mode_paiement || 'cash']
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// PUT /api/commandes/:id
router.put('/:id', auth, async (req, res) => {
  const { statut, livreur_id } = req.body;
  try {
    const r = await query(
      'UPDATE commandes SET statut=COALESCE($1,statut),livreur_id=COALESCE($2,livreur_id),updated_at=NOW() WHERE id=$3 RETURNING *',
      [statut, livreur_id || null, req.params.id]
    );
    res.json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
