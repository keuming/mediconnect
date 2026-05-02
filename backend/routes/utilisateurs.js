const router = require('express').Router();
const { query } = require('../config/db');
const { auth, authorize } = require('../middleware/auth');

// GET /api/utilisateurs — liste tous les utilisateurs (admin)
router.get('/', auth, authorize('admin'), async (req, res) => {
  try {
    const result = await query(
      `SELECT id, email, role, prenom, nom, telephone, ville, pays_code, is_active, created_at
       FROM utilisateurs ORDER BY created_at DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Erreur utilisateurs:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/utilisateurs/:id
router.get('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const result = await query(
      `SELECT id, email, role, prenom, nom, telephone, ville, pays_code, is_active, created_at
       FROM utilisateurs WHERE id=$1`, [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// PUT /api/utilisateurs/:id/toggle — activer/désactiver
router.put('/:id/toggle', auth, authorize('admin'), async (req, res) => {
  try {
    const result = await query(
      `UPDATE utilisateurs SET is_active = NOT is_active WHERE id=$1 RETURNING id, is_active`,
      [req.params.id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

module.exports = router;
