const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const { db }  = require('../config/db');
const JWT_SECRET = process.env.JWT_SECRET || 'mediconnect_dev_secret_2024';

// ── POST /api/auth/login (tous profils par email) ─────────────────
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

// ── POST /api/auth/login-patient (telephone + PIN 4 chiffres) ─────
router.post('/login-patient', async (req, res) => {
  const { telephone, pin } = req.body;
  if (!telephone || !pin)
    return res.status(400).json({ success: false, message: 'Téléphone et PIN requis' });
  if (!/^\d{4}$/.test(pin))
    return res.status(400).json({ success: false, message: 'PIN doit être 4 chiffres' });
  try {
    const r = await db(
      `SELECT u.*, p.id as pid, p.groupe_sanguin, p.allergies, p.date_naissance
       FROM utilisateurs u
       LEFT JOIN patients p ON p.user_id = u.id
       WHERE u.telephone=$1 AND u.role='patient' AND u.is_active IS NOT false LIMIT 1`,
      [telephone]
    );
    if (!r.rows.length)
      return res.status(401).json({ success: false, message: 'Numéro de téléphone non trouvé' });
    const user = r.rows[0];
    const ok = await bcrypt.compare(pin, user.password);
    if (!ok)
      return res.status(401).json({ success: false, message: 'PIN incorrect' });
    const token = jwt.sign(
      { id: user.id, role: 'patient', patient_id: user.patient_id || user.pid },
      JWT_SECRET, { expiresIn: '30d' }
    );
    const { password: _, ...u } = user;
    res.json({ success: true, token, user: u });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── POST /api/auth/register (tous profils) ────────────────────────
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

// ── POST /api/auth/register-patient ──────────────────────────────
// Login : telephone + PIN 4 chiffres
// Crée : utilisateurs + patients + mediconnect_card_requests
// Transaction atomique : si une etape echoue, tout est annule (pas de compte orphelin)
router.post('/register-patient', async (req, res) => {
  const {
    prenom, nom, telephone, pin,
    date_naissance, groupe_sanguin, allergies,
    email, ville, pays_code,
    taille, poids,
    contact_parent, telephone_parent,
    contact_urgence_1, telephone_urgence_1,
    contact_urgence_2, telephone_urgence_2,
    contact_urgence_3, telephone_urgence_3,
    contact_urgence_4, telephone_urgence_4,
    contact_urgence_5, telephone_urgence_5,
  } = req.body;

  // Validations
  if (!prenom || !nom || !telephone || !pin)
    return res.status(400).json({ success: false, message: 'Prénom, nom, téléphone et PIN requis' });
  if (!/^\d{4}$/.test(pin))
    return res.status(400).json({ success: false, message: 'Le PIN doit être exactement 4 chiffres' });

  const { pool } = require('../config/db');
  const client = await pool.connect();

  try {
    // Vérifier si téléphone déjà utilisé
    const existsTel = await client.query(
      'SELECT id FROM utilisateurs WHERE telephone=$1 AND role=$2',
      [telephone, 'patient']
    );
    if (existsTel.rows.length) {
      client.release();
      return res.status(409).json({ success: false, message: 'Ce numéro de téléphone est déjà utilisé' });
    }

    // Vérifier email seulement si fourni et non vide
    if (email && email.trim()) {
      const existsEmail = await client.query('SELECT id FROM utilisateurs WHERE email=$1 AND role=\'patient\'', [email.trim()]);
      if (existsEmail.rows.length) {
        client.release();
        return res.status(409).json({ success: false, message: 'Cet email est déjà utilisé. Connectez-vous plutôt.' });
      }
    }

    const hash = await bcrypt.hash(pin, 10);
    const userId = uuid();
    const patientId = uuid();
    const pc = pays_code || 'CI';
    const emailFinal = email || `${telephone.replace(/[^0-9]/g,'')}_${Date.now()}@mediconnect.patient`;

    await client.query('BEGIN');

    // ── 1. Créer utilisateur ──────────────────────────────────────
    await client.query(
      `INSERT INTO utilisateurs
       (id, email, password, prenom, nom, role, telephone, pays_code, ville, patient_id)
       VALUES ($1,$2,$3,$4,$5,'patient',$6,$7,$8,$9)`,
      [userId, emailFinal, hash, prenom, nom, telephone, pc, ville||null, patientId]
    );

    // ── 2. Créer profil patient ───────────────────────────────────
    await client.query(
      `INSERT INTO patients
       (id, user_id, prenom, nom, telephone, email, date_naissance,
        groupe_sanguin, allergies, ville,
        contact_urgence_1, telephone_urgence_1,
        contact_urgence_2, telephone_urgence_2,
        contact_urgence_3, telephone_urgence_3,
        contact_urgence_4, telephone_urgence_4,
        contact_urgence_5, telephone_urgence_5)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
      [patientId, userId, prenom, nom, telephone, email||null,
       date_naissance||null, groupe_sanguin||null, allergies||null, ville||null,
       contact_urgence_1||null, telephone_urgence_1||null,
       contact_urgence_2||null, telephone_urgence_2||null,
       contact_urgence_3||null, telephone_urgence_3||null,
       contact_urgence_4||null, telephone_urgence_4||null,
       contact_urgence_5||null, telephone_urgence_5||null]
    );

    // ── 3. Générer numéro de carte unique ─────────────────────────
    const count = await client.query('SELECT COUNT(*) FROM mediconnect_card_requests');
    const seq = String(parseInt(count.rows[0].count) + 1).padStart(6, '0');
    const numeroCarte = `MC-${pc}-${new Date().getFullYear()}-${seq}`;

    // ── 4. Créer demande MediConnect Card ─────────────────────────
    await client.query(
      `INSERT INTO mediconnect_card_requests
       (id, numero_carte, prenom, nom, date_naissance, groupe_sanguin, allergies,
        contact_urgence, email, telephone, ville, pays_code,
        contact_parent, telephone_parent, taille, poids,
        contact_urgence_2, telephone_urgence_2,
        contact_urgence_3, telephone_urgence_3,
        contact_urgence_4, telephone_urgence_4,
        contact_urgence_5, telephone_urgence_5,
        statut)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,'en_attente')`,
      [uuid(), numeroCarte, prenom, nom, date_naissance||null, groupe_sanguin||null,
       allergies||null, contact_urgence_1||null, email||null, telephone,
       ville||null, pc, contact_parent||null, telephone_parent||null,
       taille||null, poids||null,
       contact_urgence_2||null, telephone_urgence_2||null,
       contact_urgence_3||null, telephone_urgence_3||null,
       contact_urgence_4||null, telephone_urgence_4||null,
       contact_urgence_5||null, telephone_urgence_5||null]
    );

    await client.query('COMMIT');
    client.release();

    // ── 5. Générer token JWT ──────────────────────────────────────
    const token = jwt.sign(
      { id: userId, role: 'patient', patient_id: patientId },
      JWT_SECRET, { expiresIn: '30d' }
    );

    res.status(201).json({
      success: true,
      token,
      message: 'Compte patient créé avec succès',
      data: {
        user_id: userId,
        patient_id: patientId,
        numero_carte: numeroCarte,
        prenom, nom, telephone
      }
    });

  } catch(e) {
    try { await client.query('ROLLBACK'); } catch(_) {}
    client.release();
    console.error('register-patient error:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
