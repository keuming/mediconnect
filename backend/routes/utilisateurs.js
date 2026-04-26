const router = require('express').Router();
const { query } = require('../config/db');
const { auth, authorize } = require('../middleware/auth');

router.get('/', auth, authorize('admin'), async (req, res) => {
  try {
    const r = await query('SELECT id,email,role,prenom,nom,telephone,ville,pays_code,is_active,created_at FROM utilisateurs ORDER BY created_at DESC');
    res.json({ success: true, data: r.rows });
  } catch (err) { res.status(500).json({ success: false, message: 'Erreur' }); }
});

router.put('/:id', auth, async (req, res) => {
  const { prenom, nom, telephone, ville } = req.body;
  try {
    await query('UPDATE utilisateurs SET prenom=$1,nom=$2,telephone=$3,ville=$4,updated_at=NOW() WHERE id=$5',
      [prenom, nom, telephone, ville, req.params.id]);
    res.json({ success: true, message: 'Profil mis à jour.' });
  } catch (err) { res.status(500).json({ success: false, message: 'Erreur' }); }
});

module.exports = router;