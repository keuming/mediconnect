const router = require('express').Router();
const { query } = require('../config/db');
const { auth, authorize } = require('../middleware/auth');

const init = async () => {
  await query(`CREATE TABLE IF NOT EXISTS utilisateurs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(200) UNIQUE NOT NULL,
    password VARCHAR(200) NOT NULL,
    role VARCHAR(30) DEFAULT 'patient',
    prenom VARCHAR(100), nom VARCHAR(100),
    telephone VARCHAR(30), ville VARCHAR(100),
    adresse TEXT, clinique_id UUID, patient_id UUID,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`).catch(e => console.error('Table utilisateurs:', e.message));
};
init();

router.get('/', auth, authorize('admin'), async (req, res) => {
  try {
    const r = await query('SELECT id,email,role,prenom,nom,telephone,ville,is_active,created_at FROM utilisateurs ORDER BY created_at DESC LIMIT 500');
    res.json({ success: true, data: r.rows });
  } catch(err) { res.json({ success: true, data: [] }); }
});

router.get('/me', auth, async (req, res) => {
  try {
    const r = await query('SELECT id,email,role,prenom,nom,telephone,ville,clinique_id,patient_id FROM utilisateurs WHERE id=$1', [req.user.id]);
    if (!r.rows.length) return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
    res.json({ success: true, data: r.rows[0] });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
