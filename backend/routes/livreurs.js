const router = require('express').Router();
const { query } = require('../config/db');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const r = await query('SELECT l.*, u.prenom, u.nom, u.telephone FROM livreurs l JOIN utilisateurs u ON u.id=l.user_id WHERE u.is_active=true ORDER BY u.nom');
    res.json({ success: true, data: r.rows });
  } catch (err) { res.status(500).json({ success: false, message: 'Erreur' }); }
});

router.put('/position', auth, async (req, res) => {
  const { latitude, longitude } = req.body;
  try {
    await query('UPDATE livreurs SET latitude=$1, longitude=$2 WHERE user_id=$3', [latitude, longitude, req.user.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: 'Erreur' }); }
});

module.exports = router;
