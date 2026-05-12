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

// ── Créer le profil automatiquement après inscription ─────────────
const createProfile = async (role, userId, prenom, nom, email, telephone, ville) => {
  try {
    switch (role) {
      case 'clinique':
        await query(
          `INSERT INTO cliniques (id,user_id,nom,type,email,telephone,ville,is_active)
           VALUES ($1,$2,$3,'Clinique',$4,$5,$6,true)
           ON CONFLICT (user_id) DO NOTHING`,
          [uuid(), userId, `${prenom} ${nom}`.trim(), email, telephone || null, ville || null]
        );
        break;

      case 'patient': {
        const code = 'MC-' + (prenom[0] + nom[0]).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000);
        await query(
          `INSERT INTO patients (id,user_id,code_secret,telephone,ville,is_active)
           VALUES ($1,$2,$3,$4,$5,true)
           ON CONFLICT DO NOTHING`,
          [uuid(), userId, code, telephone || null, ville || null]
        ).catch(() => {
          // code_secret peut avoir un conflit, réessayer avec un nouveau code
          const code2 = 'MC-' + (prenom[0] + nom[0]).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000);
          return query(
            `INSERT INTO patients (id,user_id,code_secret,telephone,ville)
             VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
            [uuid(), userId, code2, telephone || null, ville || null]
          );
        });
        break;
      }

      case 'medecin_independant':
        await query(
          `INSERT INTO medecins_independants
             (id,user_id,prenom,nom,email,telephone,ville,statut,is_active)
           VALUES ($1,$2,$3,$4,$5,$6,$7,'Disponible',true)
           ON CONFLICT DO NOTHING`,
          [uuid(), userId, prenom, nom, email, telephone || null, ville || null]
        );
        break;

      case 'pharmacie':
        await query(
          `INSERT INTO pharmacies (id,user_id,nom,email,telephone,ville,is_active)
           VALUES ($1,$2,$3,$4,$5,$6,true)
           ON CONFLICT DO NOTHING`,
          [uuid(), userId, `${prenom} ${nom}`.trim(), email, telephone || null, ville || null]
        );
        break;

      case 'livreur':
        await query(
          `INSERT INTO livreurs (id,user_id,telephone,ville,statut)
           VALUES ($1,$2,$3,$4,'disponible')
           ON CONFLICT DO NOTHING`,
          [uuid(), userId, telephone || null, ville || null]
        );
        break;

      case 'assureur':
        await query(
          `INSERT INTO assureurs (id,user_id,nom,email,telephone,ville,is_active)
           VALUES ($1,$2,$3,$4,$5,$6,true)
           ON CONFLICT DO NOTHING`,
          [uuid(), userId, `${prenom} ${nom}`.trim(), email, telephone || null, ville || null]
        );
        break;

      case 'laboratoire':
        await query(
          `INSERT INTO laboratoires (id,user_id,nom,email,telephone,ville,is_active)
           VALUES ($1,$2,$3,$4,$5,$6,true)
           ON CONFLICT DO NOTHING`,
          [uuid(), userId, `${prenom} ${nom}`.trim(), email, telephone || null, ville || null]
        );
        break;

      case 'imagerie':
        await query(
          `INSERT INTO imageries (id,user_id,nom,email,telephone,ville,is_active)
           VALUES ($1,$2,$3,$4,$5,$6,true)
           ON CONFLICT DO NOTHING`,
          [uuid(), userId, `${prenom} ${nom}`.trim(), email, telephone || null, ville || null]
        );
        break;

      default:
        break;
    }
  } catch (e) {
    // Ne pas bloquer l'inscription si le profil échoue
    console.error(`[auth] Erreur création profil ${role}:`, e.message);
  }
};

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ success: false, message: 'Email et mot de passe requis' });
  try {
    const r = await query(
      'SELECT * FROM utilisateurs WHERE email=$1 AND is_active=true LIMIT 1',
      [email]
    );
    if (!r.rows.length)
      return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' });

    const user = r.rows[0];
    if (!await bcrypt.compare(password, user.password))
      return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' });

    // Récupérer l'id du profil
    let profileId = null;
    if (PROFILE_TABLES[user.role]) {
      const p = await query(
        `SELECT id FROM ${PROFILE_TABLES[user.role]} WHERE user_id=$1 LIMIT 1`,
        [user.id]
      ).catch(() => ({ rows: [] }));
      profileId = p.rows[0]?.id || null;

      // Si le profil n'existe pas encore, le créer automatiquement
      if (!profileId) {
        await createProfile(user.role, user.id, user.prenom, user.nom, user.email, user.telephone, user.ville);
        const p2 = await query(
          `SELECT id FROM ${PROFILE_TABLES[user.role]} WHERE user_id=$1 LIMIT 1`,
          [user.id]
        ).catch(() => ({ rows: [] }));
        profileId = p2.rows[0]?.id || null;
      }
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

    // Créer le profil automatiquement
    await createProfile(role || 'patient', userId, prenom || '', nom || '', email, telephone, ville);

    // Récupérer le profile_id créé
    let profileId = null;
    if (PROFILE_TABLES[role]) {
      const p = await query(
        `SELECT id FROM ${PROFILE_TABLES[role]} WHERE user_id=$1 LIMIT 1`,
        [userId]
      ).catch(() => ({ rows: [] }));
      profileId = p.rows[0]?.id || null;
    }

    const token = jwt.sign(
      { id: userId, role: role || 'patient', profile_id: profileId },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    const { password: _, ...u } = r.rows[0];
    res.status(201).json({ success: true, token, user: { ...u, profile_id: profileId } });
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
