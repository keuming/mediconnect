const router     = require('express').Router();
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const { query }  = require('../config/db');
const { auth }   = require('../middleware/auth');
const { v4: uuid } = require('uuid');

// ── Génération token JWT ──────────────────────────────────────────
const genToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// ── Génération code secret patient ───────────────────────────────
const genCodePatient = (prenom, nom) => {
  const initials = (prenom[0] + nom[0]).toUpperCase();
  const num = Math.floor(1000 + Math.random() * 9000);
  return `MC-${initials}-${num}`;
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password, role, prenom, nom, telephone, pays_code, ville, quartier, adresse, ...extra } = req.body;
  try {
    // Vérif email unique
    const exists = await query('SELECT id FROM utilisateurs WHERE email=$1', [email]);
    if (exists.rows.length)
      return res.status(400).json({ success: false, message: 'Cette adresse email est déjà utilisée.' });

    // Hachage mot de passe
    const hash = await bcrypt.hash(password, 12);
    const userId = uuid();

    // Créer utilisateur
    await query(
      `INSERT INTO utilisateurs (id,email,password,role,prenom,nom,telephone,pays_code,ville,quartier,adresse)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [userId, email, hash, role, prenom, nom, telephone, pays_code || 'CI', ville, quartier, adresse]
    );

    // Créer profil spécifique selon le rôle
    if (role === 'patient') {
      const code = genCodePatient(prenom, nom);
      await query(
        `INSERT INTO patients (user_id, date_naissance, sexe, groupe_sanguin, allergies, code_secret)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [userId, extra.date_naissance || null, extra.sexe || null, extra.groupe_sanguin || null,
         extra.allergies ? [extra.allergies] : [], code]
      );
    } else if (role === 'clinique') {
      await query(
        `INSERT INTO cliniques (user_id, nom, type, numero_agrement, assurances)
         VALUES ($1,$2,$3,$4,$5)`,
        [userId, extra.nom_etab || (prenom + ' ' + nom), extra.type_etab || 'Clinique',
         extra.agrement || null, extra.assurances || []]
      );
    } else if (role === 'pharmacie') {
      await query(
        `INSERT INTO pharmacies (user_id, nom, numero_autorisation, zone_livraison_km)
         VALUES ($1,$2,$3,$4)`,
        [userId, extra.nom_ph || (prenom + ' ' + nom), extra.num_auto || null, extra.zone || 10]
      );
    } else if (role === 'livreur') {
      await query(
        `INSERT INTO livreurs (user_id, type_vehicule, numero_permis, zones)
         VALUES ($1,$2,$3,$4)`,
        [userId, extra.vehicule || 'Moto', extra.permis || null, extra.zones || []]
      );
    } else if (role === 'assureur') {
      await query(
        `INSERT INTO assureurs (user_id, nom, type_connexion, numero_agrement)
         VALUES ($1,$2,$3,$4)`,
        [userId, extra.nom_ass || nom, extra.type_conn || 'manuel', extra.cima || null]
      );
    }

    const token = genToken(userId);
    const user = await query('SELECT id,email,role,prenom,nom FROM utilisateurs WHERE id=$1', [userId]);

    res.status(201).json({ success: true, token, user: user.rows[0], message: 'Compte créé avec succès !' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Erreur lors de la création du compte.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ success: false, message: 'Email et mot de passe requis.' });
  try {
    const result = await query('SELECT * FROM utilisateurs WHERE email=$1 AND is_active=true', [email]);
    if (!result.rows.length)
      return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect.' });

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect.' });

    const token = genToken(user.id);
    const { password: _, ...safeUser } = user;
    res.json({ success: true, token, user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Erreur lors de la connexion.' });
  }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  try {
    const result = await query(
      'SELECT id,email,role,prenom,nom,telephone,ville,pays_code,avatar_url FROM utilisateurs WHERE id=$1',
      [req.user.id]
    );
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur' });
  }
});

// PUT /api/auth/password
router.put('/password', auth, async (req, res) => {
  const { current_password, new_password } = req.body;
  try {
    const result = await query('SELECT password FROM utilisateurs WHERE id=$1', [req.user.id]);
    const match = await bcrypt.compare(current_password, result.rows[0].password);
    if (!match)
      return res.status(400).json({ success: false, message: 'Mot de passe actuel incorrect.' });
    const hash = await bcrypt.hash(new_password, 12);
    await query('UPDATE utilisateurs SET password=$1, updated_at=NOW() WHERE id=$2', [hash, req.user.id]);
    res.json({ success: true, message: 'Mot de passe modifié avec succès.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur' });
  }
});

module.exports = router;
