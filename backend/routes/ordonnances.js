const router = require('express').Router();
const { query } = require('../config/db');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    let r;
    if (req.user.role === 'patient') {
      const p = await query('SELECT id FROM patients WHERE user_id=$1', [req.user.id]);
      if (!p.rows.length) return res.json({ success: true, data: [] });
      r = await query(`SELECT o.*, m.prenom||' '||m.nom AS medecin_nom
        FROM ordonnances o LEFT JOIN medecins m ON m.id=o.medecin_id
        WHERE o.patient_id=$1 ORDER BY o.created_at DESC`, [p.rows[0].id]);
    } else {
      r = await query('SELECT * FROM ordonnances ORDER BY created_at DESC LIMIT 50', []);
    }
    res.json({ success: true, data: r.rows });
  } catch (err) { res.status(500).json({ success: false, message: 'Erreur' }); }
});

router.get('/mes-ordonnances', auth, async (req, res) => {
  try {
    const p = await query('SELECT id FROM patients WHERE user_id=$1', [req.user.id]);
    if (!p.rows.length) return res.json({ success: true, data: [] });
    const r = await query(`SELECT o.*, m.prenom||' '||m.nom AS medecin_nom
      FROM ordonnances o LEFT JOIN medecins m ON m.id=o.medecin_id
      WHERE o.patient_id=$1 AND o.statut='active' ORDER BY o.created_at DESC`, [p.rows[0].id]);
    res.json({ success: true, data: r.rows });
  } catch (err) { res.status(500).json({ success: false, message: 'Erreur' }); }
});

module.exports = router;