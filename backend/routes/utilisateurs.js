const router = require('express').Router();
const { query } = require('../config/db');
const { auth, can } = require('../middleware/auth');

// GET /api/utilisateurs
router.get('/', auth, can('admin'), async (req, res) => {
  try {
    const r = await query(
      'SELECT id,email,role,prenom,nom,telephone,ville,is_active,created_at FROM utilisateurs ORDER BY created_at DESC LIMIT 500'
    );
    res.json({ success: true, data: r.rows });
  } catch (e) { res.json({ success: true, data: [] }); }
});

// PUT /api/utilisateurs/me
router.put('/me', auth, async (req, res) => {
  const { prenom, nom, telephone, ville, quartier, adresse } = req.body;
  try {
    const r = await query(
      `UPDATE utilisateurs
       SET prenom=COALESCE($1,prenom), nom=COALESCE($2,nom),
           telephone=COALESCE($3,telephone), ville=COALESCE($4,ville),
           quartier=COALESCE($5,quartier), adresse=COALESCE($6,adresse),
           updated_at=NOW()
       WHERE id=$7 RETURNING id,email,role,prenom,nom,telephone,ville,quartier,adresse`,
      [prenom, nom, telephone, ville, quartier, adresse, req.user.id]
    );
    res.json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
