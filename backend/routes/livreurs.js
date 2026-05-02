const router = require('express').Router();
const { query } = require('../config/db');
const { auth, authorize } = require('../middleware/auth');

// GET /api/livreurs — liste tous les livreurs (admin)
router.get('/', auth, async (req, res) => {
  try {
    const result = await query(
      `SELECT l.id, l.type_vehicule, l.numero_permis, l.zones, l.statut,
              u.email, u.prenom, u.nom, u.telephone, u.ville, u.created_at, u.is_active
       FROM livreurs l
       JOIN utilisateurs u ON u.id = l.user_id
       ORDER BY u.created_at DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Erreur livreurs:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/livreurs/missions — missions du livreur connecté
router.get('/missions', auth, authorize('livreur'), async (req, res) => {
  try {
    const result = await query(
      `SELECT co.*, p.prenom as patient_prenom, p.nom as patient_nom,
              ph.nom as pharmacie_nom
       FROM commandes co
       LEFT JOIN patients pa ON pa.id = co.patient_id
       LEFT JOIN utilisateurs p ON p.id = pa.user_id
       LEFT JOIN pharmacies ph ON ph.id = co.pharmacie_id
       WHERE co.livreur_id = (SELECT id FROM livreurs WHERE user_id=$1)
       ORDER BY co.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) { res.status(500).json({ success: false, message: 'Erreur' }); }
});

module.exports = router;
