const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const { db }  = require('../config/db');
const JWT_SECRET = process.env.JWT_SECRET || 'mediconnect_dev_secret_2024';

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ success: false, message: 'Email et mot de passe requis' });
  try {
    const r = await db(
      'SELECT * FROM utilisateurs WHERE email=$1 AND is_active IS NOT false LIMIT 1',
      [email]
    );
    if (!r.rows.length)
      return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' });
    const user = r.rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok)
      return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' });
    const token = jwt.sign(
      { id: user.id, role: user.role, clinique_id: user.clinique_id,
        patient_id: user.patient_id, medecin_id: user.medecin_id },
      JWT_SECRET, { expiresIn: '7d' }
    );
    const { password: _, ...u } = user;
    res.json({ success: true, token, user: u });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password, prenom, nom, role, telephone, pays_code, ville } = req.body;
  if (!email || !password)
    return res.status(400).json({ success: false, message: 'Email et mot de passe requis' });
  try {
    const exists = await db('SELECT id FROM utilisateurs WHERE email=$1', [email]);
    if (exists.rows.length)
      return res.status(409).json({ success: false, message: 'Email déjà utilisé' });
    const hash = await bcrypt.hash(password, 10);
    const id = uuid();
    const r = await db(
      'INSERT INTO utilisateurs (id,email,password,prenom,nom,role,telephone,pays_code,ville) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [id, email, hash, prenom||'', nom||'', role||'patient', telephone||null, pays_code||'CI', ville||null]
    );
    const token = jwt.sign({ id, role: role||'patient' }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...u } = r.rows[0];
    res.status(201).json({ success: true, token, user: u });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
