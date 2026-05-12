const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { query } = require('../config/db');
const { auth, can } = require('../middleware/auth');

// GET /api/caisse
router.get('/', auth, can('clinique', 'admin'), async (req, res) => {
  try {
    const cr = await query('SELECT id FROM cliniques WHERE user_id=$1 LIMIT 1', [req.user.id]);
    const cid = cr.rows[0]?.id;
    if (!cid) return res.json({ success: true, data: null });
    const r = await query(
      "SELECT * FROM caisses WHERE clinique_id=$1 AND statut='ouverte' ORDER BY created_at DESC LIMIT 1",
      [cid]
    );
    res.json({ success: true, data: r.rows[0] || null });
  } catch (e) { res.json({ success: true, data: null }); }
});

// POST /api/caisse/ouvrir
router.post('/ouvrir', auth, can('clinique', 'admin'), async (req, res) => {
  const { nom, operateur, solde_ouverture } = req.body;
  try {
    const cr = await query('SELECT id FROM cliniques WHERE user_id=$1 LIMIT 1', [req.user.id]);
    const r = await query(
      `INSERT INTO caisses (id,clinique_id,nom,operateur,date_ouverture,heure_ouverture,solde_ouverture,statut)
       VALUES ($1,$2,$3,$4,CURRENT_DATE,CURRENT_TIME,$5,'ouverte') RETURNING *`,
      [uuid(), cr.rows[0]?.id, nom || 'Caisse principale', operateur || null, solde_ouverture || 0]
    );
    res.status(201).json({ success: true, data: r.rows[0], message: 'Caisse ouverte' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST /api/caisse/transaction
router.post('/transaction', auth, can('clinique', 'admin'), async (req, res) => {
  const { caisse_id, type, label, montant, mode, reference, caissier } = req.body;
  if (!caisse_id || !type || !label || !montant)
    return res.status(400).json({ success: false, message: 'caisse_id, type, label et montant requis' });
  try {
    const r = await query(
      'INSERT INTO transactions_caisse (id,caisse_id,type,label,montant,mode,reference,caissier) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [uuid(), caisse_id, type, label, montant, mode || 'Especes', reference || null, caissier || null]
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST /api/caisse/cloturer
router.post('/cloturer', auth, can('clinique', 'admin'), async (req, res) => {
  const { caisse_id, solde_cloture } = req.body;
  try {
    const r = await query(
      "UPDATE caisses SET statut='cloturee',solde_cloture=$1 WHERE id=$2 RETURNING *",
      [solde_cloture || 0, caisse_id]
    );
    res.json({ success: true, data: r.rows[0], message: 'Caisse clôturée' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
