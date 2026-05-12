const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const { query } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'mediconnect_dev_secret_2024';

const PROFILE_TABLES = {
  clinique:            'cliniques',
  patient:             'patients',
  medecin_independant: 'medecins_independants',
  pharmacie:           'pharmacies',
  livreur:             'livreurs',
  assureur:            'assureurs',
  laboratoire:         'laboratoires',
  imagerie:            'imageries',
};

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ success: false, message: 'Email et mot de passe requis' });
  try {
    const r = await query('SELECT * FROM utilisateurs WHERE email=$1 AND is_active=true LIMIT 1', [email]);
    if (!r.rows.length)
      return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' });

    const user = r.rows[0];
    if (!await bcrypt.compare(password, user.password))
      return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' });

    let profileId = null;
    if (PROFILE_TABLES[user.role]) {
      const p = await query(
        `SELECT id FROM ${PROFILE_TABLES[user.role]} WHERE user_id=$1 LIMIT 1`,
        [user.id]
      ).catch(() => ({ rows: [] }));
      profileId = p.rows[0]?.id || null;
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, profile_id: profileId },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    const { password: _, ...u } = user;
    res.json({ success: true, token, user: { ...u, profile_id: profileId } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password, prenom, nom, role, telephone, ville } = req.body;
  if (!email || !password)
    return res.status(400).json({ success: false, message: 'Email et mot de passe requis' });

  const rolesValides = [
    'patient','clinique','pharmacie','livreur',
    'admin','assureur','laboratoire','imagerie','medecin_independant',
  ];
  if (role && !rolesValides.includes(role))
    return res.status(400).json({ success: false, message: 'Rôle invalide' });

  try {
    const exists = await query('SELECT id FROM utilisateurs WHERE email=$1', [email]);
    if (exists.rows.length)
      return res.status(409).json({ success: false, message: 'Email déjà utilisé' });

    const hash   = await bcrypt.hash(password, 10);
    const userId = uuid();
    const r = await query(
      `INSERT INTO utilisateurs (id,email,password,prenom,nom,role,telephone,ville,is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true) RETURNING *`,
      [userId, email, hash, prenom || '', nom || '', role || 'patient', telephone || null, ville || null]
    );
    const token = jwt.sign({ id: userId, role: role || 'patient' }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...u } = r.rows[0];
    res.status(201).json({ success: true, token, user: u });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth').auth, async (req, res) => {
  try {
    const r = await query(
      'SELECT id,email,role,prenom,nom,telephone,ville,quartier,adresse,avatar_url,is_active,created_at FROM utilisateurs WHERE id=$1',
      [req.user.id]
    );
    res.json({ success: true, data: r.rows[0] || null });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
