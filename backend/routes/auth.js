const router = require('express').Router();
const { query } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuid } = require('uuid');

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email et mot de passe requis' });
    const r = await query('SELECT * FROM utilisateurs WHERE email=$1 AND is_active=true LIMIT 1', [email]);
    if (!r.rows.length) return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' });
    const user = r.rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' });
    const secret = process.env.JWT_SECRET || 'mediconnect_secret';
    const token = jwt.sign({ id: user.id, role: user.role, clinique_id: user.clinique_id, patient_id: user.patient_id }, secret, { expiresIn: '7d' });
    const { password: _, ...safeUser } = user;
    res.json({ success: true, token, user: safeUser });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { email, password, prenom, nom, role, telephone } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email et mot de passe requis' });
    const exists = await query('SELECT id FROM utilisateurs WHERE email=$1', [email]);
    if (exists.rows.length) return res.status(409).json({ success: false, message: 'Email déjà utilisé' });
    const hash = await bcrypt.hash(password, 10);
    const id = uuid();
    const r = await query(
      'INSERT INTO utilisateurs (id,email,password,prenom,nom,role,telephone) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [id, email, hash, prenom||'', nom||'', role||'patient', telephone||null]
    );
    const secret = process.env.JWT_SECRET || 'mediconnect_secret';
    const token = jwt.sign({ id, role: role||'patient' }, secret, { expiresIn: '7d' });
    const { password: _, ...safeUser } = r.rows[0];
    res.status(201).json({ success: true, token, user: safeUser });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
