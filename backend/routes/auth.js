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
    // Jointures pour resoudre l'etablissement des comptes
    // laboratoire/imagerie/pharmacie/optique/assureur via leur user_id
    // (lien inverse) -- utilisateurs n'a pas encore ses propres colonnes
    // pour ces types (Phase 2 a venir), donc on les retrouve ici.
    const r = await db(
      `SELECT u.*, l.id AS laboratoire_id, im.id AS imagerie_id,
              ph.id AS pharmacie_id, a.id AS assureur_id, co.id AS optique_id
         FROM utilisateurs u
         LEFT JOIN laboratoires l ON l.user_id = u.id
         LEFT JOIN imageries im ON im.user_id = u.id
         LEFT JOIN pharmacies ph ON ph.user_id = u.id
         LEFT JOIN assureurs a ON a.user_id = u.id
         LEFT JOIN cabinets_optiques co ON co.user_id = u.id
        WHERE u.email=$1 AND u.is_active IS NOT false LIMIT 1`,
      [email]
    );
    if (!r.rows.length)
      return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' });
    const user = r.rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok)
      return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' });
    // Avant ce correctif, seul clinique_id etait transmis -- les comptes
    // laboratoire/imagerie/pharmacie/optique/assureur ne recevaient
    // jamais leur propre identifiant d'etablissement dans le token.
    const token = jwt.sign(
      { id: user.id, role: user.role, clinique_id: user.clinique_id,
        patient_id: user.patient_id, medecin_id: user.medecin_id,
        sous_role: user.sous_role || null,
        laboratoire_id: user.laboratoire_id, imagerie_id: user.imagerie_id,
        pharmacie_id: user.pharmacie_id, assureur_id: user.assureur_id,
        optique_id: user.optique_id },
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
  const { email, password, prenom, nom, role, telephone, pays_code, ville,
          // Champs spécifiques clinique
          nom_clinique, adresse, specialites, nombre_lits,
          // Rattachement a une clinique deja existante en base (evite les
          // doublons quand plusieurs comptes appartiennent a la meme
          // structure : secretaire, gerant, medecins...)
          clinique_id_existante,
          // Position GPS optionnelle (geolocalisation navigateur a
          // l'inscription), utilisee par la recherche par rayon de
          // rdv.mediconnect4africa.cloud.
          latitude, longitude } = req.body;
  if (!email || !password)
    return res.status(400).json({ success: false, message: 'Email et mot de passe requis' });
  try {
    const exists = await db('SELECT id FROM utilisateurs WHERE email=$1', [email]);
    if (exists.rows.length)
      return res.status(409).json({ success: false, message: 'Email déjà utilisé' });
    const hash = await bcrypt.hash(password, 10);
    const userId = uuid();
    const roleVal = role || 'patient';

    // 1. Créer l'utilisateur
    const r = await db(
      'INSERT INTO utilisateurs (id,email,password,prenom,nom,role,telephone,pays_code,ville) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [userId, email, hash, prenom||'', nom||'', roleVal, telephone||null, pays_code||'CI', ville||null]
    );

    let clinique_id = null;
    let pharmacie_id = null;
    let labo_id = null;
    let imagerie_id = null;
    let optique_id = null;
    let assureur_id = null;

    // 2. Créer l'entrée dans la table métier selon le rôle
    // Patient : quel que soit le formulaire d'inscription (site vitrine,
    // application, mobile), un compte patient cree ici genere TOUJOURS un
    // dossier patient + une demande de VigieCard avec numero auto-genere
    // -- meme logique que /register-patient, meme table de destination,
    // pour ne jamais avoir deux chemins d'inscription divergents.
    if (roleVal === 'patient') {
      const patientId = uuid();
      await db(
        `INSERT INTO patients (id, user_id, prenom, nom, telephone, email, ville)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [patientId, userId, prenom||'', nom||'', telephone||null, email||null, ville||null]
      );
      await db('UPDATE utilisateurs SET patient_id=$1 WHERE id=$2', [patientId, userId]);

      const codeDossier = 'MC-' + ((prenom||'X')[0]+(nom||'X')[0]).toUpperCase() + '-' + Math.floor(1000+Math.random()*9000);
      await db('UPDATE patients SET code_secret=$1 WHERE id=$2', [codeDossier, patientId]);

      const pc = pays_code || 'CI';
      let numeroCarte, attempts = 0;
      while (attempts < 10) {
        const count = await db('SELECT COUNT(*) FROM mediconnect_card_requests');
        const seq = String(parseInt(count.rows[0].count) + 1 + attempts).padStart(6, '0');
        const candidate = `MC-${pc}-${new Date().getFullYear()}-${seq}`;
        const existsCarte = await db('SELECT id FROM mediconnect_card_requests WHERE numero_carte=$1', [candidate]);
        if (!existsCarte.rows.length) { numeroCarte = candidate; break; }
        attempts++;
      }
      if (!numeroCarte) {
        numeroCarte = `MC-${pc}-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
      }

      await db(
        `INSERT INTO mediconnect_card_requests
         (id, numero_carte, prenom, nom, email, telephone, ville, pays_code, statut)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'en_attente')`,
        [uuid(), numeroCarte, prenom||'', nom||'', email||null, telephone||null, ville||null, pc]
      );
    } else if (roleVal === 'clinique') {
      if (clinique_id_existante) {
        // Rattachement : on verifie que la clinique existe reellement avant
        // de lier, pour ne jamais laisser un utilisateur avec un
        // clinique_id qui pointe sur rien.
        const check = await db('SELECT id FROM cliniques WHERE id=$1', [clinique_id_existante]);
        if (!check.rows.length) {
          return res.status(400).json({ success:false, message:'Clinique introuvable, rafraichissez la recherche' });
        }
        await db('UPDATE utilisateurs SET clinique_id=$1 WHERE id=$2', [clinique_id_existante, userId]);
        clinique_id = clinique_id_existante;
      } else {
        if (!nom_clinique) {
          return res.status(400).json({ success:false, message:'Nom de la clinique requis' });
        }
        const cid = uuid();
        // Coordonnees GPS optionnelles, capturees via geolocalisation
        // navigateur au moment de l'inscription (rdv.mediconnect4africa.cloud
        // recherche par rayon en depend). Absentes = NULL, pas d'erreur :
        // la clinique reste utilisable, seulement invisible dans une
        // recherche par distance tant que la position n'est pas connue.
        const lat = (latitude !== undefined && latitude !== null && latitude !== '') ? parseFloat(latitude) : null;
        const lng = (longitude !== undefined && longitude !== null && longitude !== '') ? parseFloat(longitude) : null;
        await db(
          `INSERT INTO cliniques (id, nom, adresse, ville, telephone, email, user_id, latitude, longitude)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           ON CONFLICT DO NOTHING`,
          [cid, nom_clinique, adresse||null, ville||null,
           telephone||null, email, userId, lat, lng]
        );
        await db('UPDATE utilisateurs SET clinique_id=$1 WHERE id=$2', [cid, userId]);
        clinique_id = cid;
      }

    } else if (roleVal === 'pharmacie') {
      const pid = uuid();
      await db(
        `INSERT INTO pharmacies (id, nom, adresse, ville, telephone, email, user_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
        [pid, nom||prenom||'Pharmacie', adresse||null, ville||null, telephone||null, email, userId]
      );
      pharmacie_id = pid;

    } else if (roleVal === 'laboratoire') {
      const lid = uuid();
      await db(
        `INSERT INTO laboratoires (id, nom, adresse, ville, telephone, email, user_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
        [lid, nom||prenom||'Laboratoire', adresse||null, ville||null, telephone||null, email, userId]
      );
      labo_id = lid;

    } else if (roleVal === 'imagerie') {
      const iid = uuid();
      await db(
        `INSERT INTO imageries (id, nom, adresse, ville, telephone, email, user_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
        [iid, nom||prenom||'Imagerie', adresse||null, ville||null, telephone||null, email, userId]
      );
      imagerie_id = iid;

    } else if (roleVal === 'optique') {
      const oid = uuid();
      await db(
        `INSERT INTO cabinets_optiques (id, nom, adresse, ville, telephone, email, user_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
        [oid, nom||prenom||'Cabinet Optique', adresse||null, ville||null, telephone||null, email, userId]
      );
      optique_id = oid;

    } else if (roleVal === 'assureur') {
      const aid = uuid();
      await db(
        `INSERT INTO assureurs (id, nom, adresse, ville, telephone, email, user_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
        [aid, nom||prenom||'Assureur', adresse||null, ville||null, telephone||null, email, userId]
      );
      assureur_id = aid;
    }

    // 3. Générer le token avec l'identifiant de l'etablissement selon le
    // role -- avant ce correctif, seul clinique_id etait transmis ; les
    // comptes laboratoire/imagerie/pharmacie/optique/assureur ne
    // recevaient jamais leur propre identifiant dans le token, les
    // empechant de fonctionner comme la clinique le fait deja.
    const tokenPayload = {
      id: userId, role: roleVal, clinique_id, pharmacie_id,
      laboratoire_id: labo_id, imagerie_id, optique_id, assureur_id,
    };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

    const { password: _, ...u } = r.rows[0];
    res.status(201).json({
      success: true,
      token,
      user: { ...u, clinique_id },
      message: `Compte ${roleVal} créé avec succès`
    });
  } catch(e) {
    console.error('register error:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
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

    // Code dossier lisible (le PIN reste hashe pour l'auth)
    const codeDossier = 'MC-' + ((prenom||'X')[0]+(nom||'X')[0]).toUpperCase() + '-' + Math.floor(1000+Math.random()*9000);
    await client.query('UPDATE patients SET code_secret=$1 WHERE id=$2', [codeDossier, patientId]);

    // ── 3. Générer numéro de carte unique (collision-proof) ───────
    let numeroCarte, attempts = 0;
    while (attempts < 10) {
      const count = await client.query('SELECT COUNT(*) FROM mediconnect_card_requests');
      const seq = String(parseInt(count.rows[0].count) + 1 + attempts).padStart(6, '0');
      const candidate = `MC-${pc}-${new Date().getFullYear()}-${seq}`;
      const exists = await client.query('SELECT id FROM mediconnect_card_requests WHERE numero_carte=$1', [candidate]);
      if (!exists.rows.length) { numeroCarte = candidate; break; }
      attempts++;
    }
    if (!numeroCarte) {
      numeroCarte = `MC-${pc}-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    }

    // ── 4. Créer demande MediConnect Card ─────────────────────────
    await client.query(
      `INSERT INTO mediconnect_card_requests
       (id, numero_carte, prenom, nom, date_naissance, groupe_sanguin, allergies,
        contact_urgence, telephone_urgence, email, telephone, ville, pays_code,
        contact_parent, telephone_parent, taille, poids,
        contact_urgence_2, telephone_urgence_2,
        contact_urgence_3, telephone_urgence_3,
        contact_urgence_4, telephone_urgence_4,
        contact_urgence_5, telephone_urgence_5,
        statut)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,'en_attente')`,
      [uuid(), numeroCarte, prenom, nom, date_naissance||null, groupe_sanguin||null,
       allergies||null, contact_urgence_1||null, telephone_urgence_1||null, email||null, telephone,
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
