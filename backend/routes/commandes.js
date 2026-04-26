const router = require('express').Router();
const { query } = require('../config/db');
const { auth } = require('../middleware/auth');
const { v4: uuid } = require('uuid');

router.get('/', auth, async (req, res) => {
  try {
    let r;
    if (req.user.role === 'patient') {
      const p = await query('SELECT id FROM patients WHERE user_id=$1', [req.user.id]);
      r = await query('SELECT * FROM commandes WHERE patient_id=$1 ORDER BY created_at DESC', [p.rows[0]?.id]);
    } else if (req.user.role === 'pharmacie') {
      const ph = await query('SELECT id FROM pharmacies WHERE user_id=$1', [req.user.id]);
      r = await query('SELECT * FROM commandes WHERE pharmacie_id=$1 ORDER BY created_at DESC', [ph.rows[0]?.id]);
    } else {
      r = await query('SELECT * FROM commandes ORDER BY created_at DESC LIMIT 100');
    }
    res.json({ success: true, data: r?.rows || [] });
  } catch (err) { res.status(500).json({ success: false, message: 'Erreur' }); }
});

router.get('/mes-commandes', auth, async (req, res) => {
  try {
    const p = await query('SELECT id FROM patients WHERE user_id=$1', [req.user.id]);
    const r = await query('SELECT * FROM commandes WHERE patient_id=$1 ORDER BY created_at DESC', [p.rows[0]?.id]);
    res.json({ success: true, data: r.rows });
  } catch (err) { res.status(500).json({ success: false, message: 'Erreur' }); }
});

router.put('/:id', auth, async (req, res) => {
  const { statut, livreur_id } = req.body;
  try {
    await query('UPDATE commandes SET statut=$1, livreur_id=$2, updated_at=NOW() WHERE id=$3', [statut, livreur_id||null, req.params.id]);
    res.json({ success: true, message: 'Commande mise à jour.' });
  } catch (err) { res.status(500).json({ success: false, message: 'Erreur' }); }
});

module.exports = router;
