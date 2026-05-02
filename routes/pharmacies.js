const router = require('express').Router();
const { query } = require('../config/db');
const { auth, authorize } = require('../middleware/auth');

// GET /api/pharmacies — liste toutes les pharmacies (admin)
router.get('/', auth, async (req, res) => {
  try {
    const result = await query(
      `SELECT ph.id, ph.nom, ph.numero_autorisation, ph.zone_livraison_km,
              u.email, u.telephone, u.ville, u.prenom, u.nom as nom_contact,
              u.created_at, u.is_active
       FROM pharmacies ph
       JOIN utilisateurs u ON u.id = ph.user_id
       ORDER BY u.created_at DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Erreur pharmacies:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/pharmacies/moi
router.get('/moi', auth, authorize('pharmacie'), async (req, res) => {
  try {
    const result = await query(
      `SELECT ph.*, u.email, u.telephone, u.ville FROM pharmacies ph
       JOIN utilisateurs u ON u.id=ph.user_id WHERE ph.user_id=$1`,
      [req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Pharmacie introuvable' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { res.status(500).json({ success: false, message: 'Erreur' }); }
});

module.exports = router;
