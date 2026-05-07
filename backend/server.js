require('dotenv').config();
const express    = require('express');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
const { Pool }   = require('pg');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const { v4: uuid } = require('uuid');

const isProd = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET || 'mediconnect_dev_secret_2024';

// ── DB Pool ───────────────────────────────────────────────────────
const cleanUrl = (u) => {
  if (!u) return u;
  return u.replace(/[?&]channel_binding=[^&]*/g, '')
          .replace(/[?&]sslmode=prefer/g, '')
          .replace(/[?&]sslmode=require/g, '');
};
const pool = new Pool({
  connectionString: cleanUrl(process.env.DATABASE_URL),
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});
pool.on('error', (err) => { console.error('[Pool]', err.message); });
const db = async (text, params) => {
  const c = await pool.connect();
  try { return await c.query(text, params); } finally { c.release(); }
};

// ── Auth middleware ────────────────────────────────────────────────
const auth = (req, res, next) => {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return res.status(401).json({ success:false, message:'Token manquant' });
  try { req.user = jwt.verify(h.slice(7), JWT_SECRET); next(); }
  catch { return res.status(401).json({ success:false, message:'Token invalide ou expiré' }); }
};
const can = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ success:false, message:'Non authentifié' });
  if (!roles.includes(req.user.role)) return res.status(403).json({ success:false, message:'Accès refusé' });
  next();
};
const vd = d => d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;

// ── Tables & Migrations ───────────────────────────────────────────
const initTables = async () => {
  const tables = [
    `CREATE TABLE IF NOT EXISTS utilisateurs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(200) UNIQUE NOT NULL, password VARCHAR(200) NOT NULL,
      role VARCHAR(30) DEFAULT 'patient', prenom VARCHAR(100), nom VARCHAR(100),
      telephone VARCHAR(30), ville VARCHAR(100), pays_code VARCHAR(5) DEFAULT 'CI',
      adresse TEXT, clinique_id UUID, patient_id UUID, medecin_id UUID,
      is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS cliniques (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID, nom VARCHAR(200), type VARCHAR(100) DEFAULT 'Clinique',
      adresse TEXT, ville VARCHAR(100), telephone VARCHAR(30),
      email VARCHAR(200), agrement VARCHAR(100),
      is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS medecins (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID, clinique_id UUID, prenom VARCHAR(100), nom VARCHAR(100),
      specialite VARCHAR(100), telephone VARCHAR(30), email VARCHAR(200),
      tarif DECIMAL(10,2), experience_ans INTEGER,
      statut VARCHAR(30) DEFAULT 'Disponible', ville VARCHAR(100),
      jours_travail VARCHAR(200) DEFAULT 'Lun,Mar,Mer,Jeu,Ven',
      horaires_debut TIME DEFAULT '08:00', horaires_fin TIME DEFAULT '17:00',
      note_moyenne DECIMAL(3,2), type_contrat VARCHAR(30) DEFAULT 'employe',
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS patients (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID, clinique_id UUID, code_secret VARCHAR(30),
      prenom VARCHAR(100), nom VARCHAR(100), telephone VARCHAR(30),
      email VARCHAR(200), date_naissance DATE, sexe VARCHAR(10),
      groupe_sanguin VARCHAR(10), allergies TEXT, antecedents TEXT,
      ville VARCHAR(100), assurance VARCHAR(100), numero_police VARCHAR(100),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS disponibilites (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      medecin_id UUID NOT NULL, clinique_id UUID,
      date DATE NOT NULL, heure_debut TIME NOT NULL, heure_fin TIME NOT NULL,
      statut VARCHAR(20) DEFAULT 'disponible', recurrent BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS rendez_vous (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      reference VARCHAR(50), clinique_id UUID, patient_id UUID,
      patient_nom VARCHAR(200), medecin_id UUID, medecin_nom VARCHAR(200),
      date_rdv DATE NOT NULL, heure_rdv TIME NOT NULL,
      motif TEXT, statut VARCHAR(30) DEFAULT 'en_attente',
      assurance VARCHAR(100), source VARCHAR(30) DEFAULT 'dashboard',
      notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS consultations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id UUID, clinique_id UUID, medecin_id UUID,
      medecin_nom VARCHAR(200), rdv_id UUID,
      diagnostic TEXT NOT NULL, traitement TEXT, notes TEXT,
      tension_arterielle VARCHAR(20), temperature VARCHAR(10),
      poids VARCHAR(10), taille VARCHAR(10),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS ordonnances (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id UUID, clinique_id UUID, medecin_id UUID,
      medecin_nom VARCHAR(200), consultation_id UUID,
      medicaments TEXT NOT NULL, posologie TEXT, duree VARCHAR(100),
      notes_ord TEXT, statut VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS stock (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      clinique_id UUID, user_id UUID,
      nom VARCHAR(200) NOT NULL, categorie VARCHAR(100) DEFAULT 'Médicament',
      quantite INTEGER DEFAULT 0, unite VARCHAR(50) DEFAULT 'boite',
      seuil_alerte INTEGER DEFAULT 10, prix_unitaire DECIMAL(12,2),
      fournisseur VARCHAR(200), date_expiration DATE,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS factures (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      reference VARCHAR(50), clinique_id UUID, patient_id UUID,
      patient_nom VARCHAR(200), montant DECIMAL(12,2) DEFAULT 0,
      description TEXT, type_facture VARCHAR(30) DEFAULT 'clinique',
      mode_paiement VARCHAR(50) DEFAULT 'Espèces',
      statut VARCHAR(30) DEFAULT 'en_attente',
      assurance VARCHAR(100), notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS caisse_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      clinique_id UUID, date DATE DEFAULT CURRENT_DATE,
      statut VARCHAR(20) DEFAULT 'ouverte',
      total_encaisse DECIMAL(12,2) DEFAULT 0,
      total_decaisse DECIMAL(12,2) DEFAULT 0,
      nb_transactions INTEGER DEFAULT 0,
      opened_at TIMESTAMPTZ DEFAULT NOW(), closed_at TIMESTAMPTZ
    )`,
    `CREATE TABLE IF NOT EXISTS dossiers_assurance (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      reference VARCHAR(50), clinique_id UUID, patient_id UUID,
      patient_nom VARCHAR(200), compagnie VARCHAR(100),
      numero_police VARCHAR(100), montant_total DECIMAL(12,2) DEFAULT 0,
      montant_assur DECIMAL(12,2) DEFAULT 0, ticket_moder DECIMAL(12,2) DEFAULT 0,
      taux_couverture INTEGER DEFAULT 80, diagnostic TEXT,
      statut VARCHAR(30) DEFAULT 'soumis', motif_rejet TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS commandes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id UUID, pharmacie_id UUID, livreur_id UUID,
      patient_nom VARCHAR(200), contact VARCHAR(50),
      adresse_livraison TEXT, ordonnance_id UUID,
      notes TEXT, nombre_articles INTEGER DEFAULT 1,
      frais_livraison DECIMAL(10,2) DEFAULT 1500,
      statut VARCHAR(30) DEFAULT 'en_attente',
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS bulletins (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      type VARCHAR(50) NOT NULL, categorie VARCHAR(30) DEFAULT 'imagerie',
      patient_nom VARCHAR(200), patient_id UUID,
      emetteur_nom VARCHAR(200), emetteur_type VARCHAR(50),
      clinique_id UUID, fichier_nom VARCHAR(300),
      rapport TEXT, notes TEXT,
      statut VARCHAR(20) DEFAULT 'nouveau',
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
  ];

  for (const sql of tables) {
    await db(sql).catch(e => console.error('[INIT TABLE]', e.message));
  }

  // Migrations douces
  const alterations = [
    // rendez_vous
    "ALTER TABLE rendez_vous ADD COLUMN IF NOT EXISTS patient_nom VARCHAR(200)",
    "ALTER TABLE rendez_vous ADD COLUMN IF NOT EXISTS medecin_nom VARCHAR(200)",
    "ALTER TABLE rendez_vous ADD COLUMN IF NOT EXISTS reference VARCHAR(50)",
    "ALTER TABLE rendez_vous ADD COLUMN IF NOT EXISTS assurance VARCHAR(100)",
    "ALTER TABLE rendez_vous ADD COLUMN IF NOT EXISTS source VARCHAR(30) DEFAULT 'dashboard'",
    "ALTER TABLE rendez_vous ADD COLUMN IF NOT EXISTS notes TEXT",
    "ALTER TABLE rendez_vous ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()",
    "ALTER TABLE rendez_vous ALTER COLUMN patient_id DROP NOT NULL",
    "ALTER TABLE rendez_vous ALTER COLUMN clinique_id DROP NOT NULL",
    // patients
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS code_secret VARCHAR(30)",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS allergies TEXT",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS antecedents TEXT",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS groupe_sanguin VARCHAR(10)",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS sexe VARCHAR(10)",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS assurance VARCHAR(100)",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS numero_police VARCHAR(100)",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()",
    // medecins
    "ALTER TABLE medecins ADD COLUMN IF NOT EXISTS horaires_debut TIME DEFAULT '08:00'",
    "ALTER TABLE medecins ADD COLUMN IF NOT EXISTS horaires_fin TIME DEFAULT '17:00'",
    "ALTER TABLE medecins ADD COLUMN IF NOT EXISTS note_moyenne DECIMAL(3,2)",
    "ALTER TABLE medecins ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()",
    "ALTER TABLE medecins ADD COLUMN IF NOT EXISTS type_contrat VARCHAR(30) DEFAULT 'employe'",
    "ALTER TABLE medecins ADD COLUMN IF NOT EXISTS ville VARCHAR(100)",
    "ALTER TABLE medecins ADD COLUMN IF NOT EXISTS user_id UUID",
    // utilisateurs
    "ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS pays_code VARCHAR(5) DEFAULT 'CI'",
    // factures
    "ALTER TABLE factures ADD COLUMN IF NOT EXISTS description TEXT",
    "ALTER TABLE factures ADD COLUMN IF NOT EXISTS type_facture VARCHAR(30) DEFAULT 'clinique'",
    "ALTER TABLE factures ADD COLUMN IF NOT EXISTS notes TEXT",
    "ALTER TABLE factures ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()",
    // commandes
    "ALTER TABLE commandes ADD COLUMN IF NOT EXISTS patient_nom VARCHAR(200)",
    "ALTER TABLE commandes ADD COLUMN IF NOT EXISTS contact VARCHAR(50)",
    "ALTER TABLE commandes ADD COLUMN IF NOT EXISTS notes TEXT",
    "ALTER TABLE commandes ADD COLUMN IF NOT EXISTS ordonnance_id UUID",
    // caisse
    "ALTER TABLE caisse_sessions ADD COLUMN IF NOT EXISTS nb_transactions INTEGER DEFAULT 0",
    // stock
    "ALTER TABLE stock ADD COLUMN IF NOT EXISTS user_id UUID",
    // cliniques
    "ALTER TABLE cliniques ADD COLUMN IF NOT EXISTS agrement VARCHAR(100)",
    // Activer les enregistrements avec NULL
    "UPDATE cliniques SET is_active=true WHERE is_active IS NULL",
    "UPDATE utilisateurs SET is_active=true WHERE is_active IS NULL",
    "UPDATE patients SET is_active=true WHERE is_active IS NULL",
  ];

  for (const sql of alterations) {
    await db(sql).catch(() => {});
  }
  console.log('[DB] Tables initialisées et migrées');
};

// ── Express App ───────────────────────────────────────────────────
const app = express();
app.set('trust proxy', 1);

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin,X-Requested-With,Content-Type,Accept,Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  next();
});
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(morgan(isProd ? 'tiny' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api/auth', rateLimit({ windowMs:15*60*1000, max:50, skip:r=>r.method==='OPTIONS' }));
app.use('/api/', rateLimit({ windowMs:60*1000, max:500, skip:r=>r.method==='OPTIONS' }));

// ═══════════════════════════════════════════════════════════════════
// HEALTH & ROOT
// ═══════════════════════════════════════════════════════════════════
app.get('/', (req, res) => res.json({ success:true, message:'MediConnect API v2', health:'/api/health' }));
app.get('/api/health', async (req, res) => {
  try {
    const r = await db('SELECT NOW() as time, current_database() as db');
    res.json({ success:true, status:'ok', db:r.rows[0].db, time:r.rows[0].time });
  } catch(e) {
    console.error('[health]', e.message);
    res.status(500).json({ success:false, status:'db_error', message:e.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════════
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success:false, message:'Email et mot de passe requis' });
  try {
    const r = await db('SELECT * FROM utilisateurs WHERE email=$1 LIMIT 1', [email.toLowerCase().trim()]);
    if (!r.rows.length) return res.status(401).json({ success:false, message:'Email ou mot de passe incorrect' });
    const user = r.rows[0];
    if (user.is_active === false) return res.status(403).json({ success:false, message:'Compte suspendu' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ success:false, message:'Email ou mot de passe incorrect' });
    const token = jwt.sign(
      { id:user.id, role:user.role, clinique_id:user.clinique_id, patient_id:user.patient_id, medecin_id:user.medecin_id },
      JWT_SECRET, { expiresIn:'7d' }
    );
    const { password:_, ...u } = user;
    res.json({ success:true, token, user:u });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

app.post('/api/auth/register', async (req, res) => {
  const { email, password, prenom, nom, telephone, ville, pays_code } = req.body;
  // Normaliser le rôle (medecin_prive → medecin_independant)
  let role = req.body.role || 'patient';
  if (role === 'medecin_prive') role = 'medecin_independant';
  if (!email || !password) return res.status(400).json({ success:false, message:'Email et mot de passe requis' });
  if (password.length < 6) return res.status(400).json({ success:false, message:'Mot de passe minimum 6 caractères' });
  try {
    const exists = await db('SELECT id FROM utilisateurs WHERE email=$1', [email.toLowerCase().trim()]);
    if (exists.rows.length) return res.status(409).json({ success:false, message:'Email déjà utilisé' });
    const hash = await bcrypt.hash(password, 10);
    const id = uuid();
    const r = await db(
      'INSERT INTO utilisateurs (id,email,password,prenom,nom,role,telephone,ville,pays_code) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [id, email.toLowerCase().trim(), hash, prenom||'', nom||'', role, telephone||null, ville||null, pays_code||'CI']
    );
    const token = jwt.sign({ id, role }, JWT_SECRET, { expiresIn:'7d' });
    const { password:_, ...u } = r.rows[0];
    res.status(201).json({ success:true, token, user:u });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// UTILISATEURS
// ═══════════════════════════════════════════════════════════════════
app.get('/api/utilisateurs', auth, can('admin'), async (req, res) => {
  try {
    const r = await db('SELECT id,email,role,prenom,nom,telephone,ville,is_active,created_at FROM utilisateurs ORDER BY created_at DESC LIMIT 500');
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.get('/api/utilisateurs/me', auth, async (req, res) => {
  try {
    const r = await db('SELECT id,email,role,prenom,nom,telephone,ville,clinique_id,patient_id,medecin_id,pays_code FROM utilisateurs WHERE id=$1', [req.user.id]);
    res.json({ success:true, data:r.rows[0]||{} });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
// FIX : PUT utilisateur (admin toggle actif/suspendu + mise à jour profil)
app.put('/api/utilisateurs/me', auth, async (req, res) => {
  const { prenom, nom, telephone, ville, pays_code } = req.body;
  try {
    const r = await db(
      'UPDATE utilisateurs SET prenom=COALESCE($1,prenom),nom=COALESCE($2,nom),telephone=COALESCE($3,telephone),ville=COALESCE($4,ville),pays_code=COALESCE($5,pays_code) WHERE id=$6 RETURNING id,email,role,prenom,nom,telephone,ville',
      [prenom||null, nom||null, telephone||null, ville||null, pays_code||null, req.user.id]
    );
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.put('/api/utilisateurs/:id', auth, can('admin'), async (req, res) => {
  const { is_active, role, prenom, nom, telephone, ville } = req.body;
  try {
    const r = await db(
      'UPDATE utilisateurs SET is_active=COALESCE($1,is_active),role=COALESCE($2,role),prenom=COALESCE($3,prenom),nom=COALESCE($4,nom),telephone=COALESCE($5,telephone),ville=COALESCE($6,ville) WHERE id=$7 RETURNING id,email,role,prenom,nom,is_active',
      [is_active??null, role||null, prenom||null, nom||null, telephone||null, ville||null, req.params.id]
    );
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.delete('/api/utilisateurs/:id', auth, can('admin'), async (req, res) => {
  try {
    await db('UPDATE utilisateurs SET is_active=false WHERE id=$1', [req.params.id]);
    res.json({ success:true, message:'Utilisateur désactivé' });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// CLINIQUES
// ═══════════════════════════════════════════════════════════════════
app.get('/api/cliniques', auth, async (req, res) => {
  try {
    const r = await db("SELECT * FROM cliniques WHERE is_active IS NOT false ORDER BY nom");
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.get('/api/cliniques/stats', auth, async (req, res) => {
  try {
    const cid = req.user?.clinique_id;
    if (!cid) return res.json({ success:true, data:{ medecins_actifs:0, rdv_ce_mois:0, patients_mois:0, consultations_mois:0 } });
    const [m, r, p, c] = await Promise.all([
      db("SELECT COUNT(*) c FROM medecins WHERE clinique_id=$1 AND statut='Disponible'", [cid]).catch(()=>({rows:[{c:0}]})),
      db("SELECT COUNT(*) c FROM rendez_vous WHERE clinique_id=$1 AND date_rdv>=date_trunc('month',CURRENT_DATE)", [cid]).catch(()=>({rows:[{c:0}]})),
      db("SELECT COUNT(*) c FROM patients WHERE clinique_id=$1 AND created_at>=date_trunc('month',CURRENT_DATE)", [cid]).catch(()=>({rows:[{c:0}]})),
      db("SELECT COUNT(*) c FROM consultations WHERE clinique_id=$1 AND created_at>=date_trunc('month',CURRENT_DATE)", [cid]).catch(()=>({rows:[{c:0}]})),
    ]);
    res.json({ success:true, data:{ medecins_actifs:+m.rows[0]?.c||0, rdv_ce_mois:+r.rows[0]?.c||0, patients_mois:+p.rows[0]?.c||0, consultations_mois:+c.rows[0]?.c||0 }});
  } catch(e) { res.json({ success:true, data:{ medecins_actifs:0, rdv_ce_mois:0, patients_mois:0 } }); }
});
app.get('/api/cliniques/:id', auth, async (req, res) => {
  try {
    const r = await db('SELECT * FROM cliniques WHERE id=$1', [req.params.id]);
    res.json({ success:true, data:r.rows[0]||null });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.post('/api/cliniques', auth, can('admin'), async (req, res) => {
  const { nom, type, adresse, ville, telephone, email, agrement } = req.body;
  if (!nom) return res.status(400).json({ success:false, message:'Nom requis' });
  try {
    const r = await db(
      'INSERT INTO cliniques (id,nom,type,adresse,ville,telephone,email,agrement) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [uuid(), nom, type||'Clinique', adresse||null, ville||null, telephone||null, email||null, agrement||null]
    );
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.put('/api/cliniques/:id', auth, async (req, res) => {
  const { nom, type, adresse, ville, telephone, email, is_active } = req.body;
  try {
    const r = await db(
      'UPDATE cliniques SET nom=COALESCE($1,nom),type=COALESCE($2,type),adresse=COALESCE($3,adresse),ville=COALESCE($4,ville),telephone=COALESCE($5,telephone),email=COALESCE($6,email),is_active=COALESCE($7,is_active) WHERE id=$8 RETURNING *',
      [nom||null, type||null, adresse||null, ville||null, telephone||null, email||null, is_active??null, req.params.id]
    );
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.delete('/api/cliniques/:id', auth, can('admin'), async (req, res) => {
  try {
    await db('UPDATE cliniques SET is_active=false WHERE id=$1', [req.params.id]);
    res.json({ success:true, message:'Clinique désactivée' });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// MÉDECINS
// ═══════════════════════════════════════════════════════════════════
app.get('/api/medecins', auth, async (req, res) => {
  try {
    const cid = req.query.clinique_id || req.user?.clinique_id;
    const r = cid
      ? await db('SELECT * FROM medecins WHERE clinique_id=$1 ORDER BY nom,prenom', [cid])
      : await db('SELECT * FROM medecins ORDER BY nom,prenom');
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.post('/api/medecins', auth, async (req, res) => {
  const { prenom, nom, specialite, telephone, email, tarif, experience_ans, jours_travail, horaires_debut, horaires_fin, type_contrat } = req.body;
  if (!prenom||!nom||!specialite) return res.status(400).json({ success:false, message:'Prénom, nom et spécialité requis' });
  try {
    const r = await db(
      'INSERT INTO medecins (id,clinique_id,prenom,nom,specialite,telephone,email,tarif,experience_ans,jours_travail,horaires_debut,horaires_fin,type_contrat) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *',
      [uuid(), req.user?.clinique_id||null, prenom, nom, specialite, telephone||null, email||null, tarif||null, experience_ans||null, jours_travail||'Lun,Mar,Mer,Jeu,Ven', horaires_debut||'08:00', horaires_fin||'17:00', type_contrat||'employe']
    );
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.put('/api/medecins/:id', auth, async (req, res) => {
  const { prenom, nom, specialite, statut, tarif, telephone, experience_ans, jours_travail, horaires_debut, horaires_fin } = req.body;
  try {
    const r = await db(
      'UPDATE medecins SET prenom=COALESCE($1,prenom),nom=COALESCE($2,nom),specialite=COALESCE($3,specialite),statut=COALESCE($4,statut),tarif=COALESCE($5::DECIMAL,tarif),telephone=COALESCE($6,telephone),experience_ans=COALESCE($7::INTEGER,experience_ans),jours_travail=COALESCE($8,jours_travail),horaires_debut=COALESCE($9::TIME,horaires_debut),horaires_fin=COALESCE($10::TIME,horaires_fin),updated_at=NOW() WHERE id=$11 RETURNING *',
      [prenom||null,nom||null,specialite||null,statut||null,tarif||null,telephone||null,experience_ans||null,jours_travail||null,horaires_debut||null,horaires_fin||null,req.params.id]
    );
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.delete('/api/medecins/:id', auth, async (req, res) => {
  try { await db('DELETE FROM medecins WHERE id=$1', [req.params.id]); res.json({ success:true }); }
  catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// PATIENTS
// ═══════════════════════════════════════════════════════════════════
app.get('/api/patients', auth, async (req, res) => {
  try {
    const role = req.user?.role;
    const cid = req.user?.clinique_id;
    let sql = 'SELECT * FROM patients WHERE is_active IS NOT false'; const p = [];
    // Clinique voit ses patients, médecin aussi, admin voit tous
    if (cid && role !== 'admin') { p.push(cid); sql += ` AND clinique_id=$${p.length}`; }
    sql += ' ORDER BY nom,prenom LIMIT 500';
    const r = await db(sql, p);
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
// FIX : dossier patient de l'utilisateur connecté
app.get('/api/patients/me', auth, async (req, res) => {
  try {
    const r = await db('SELECT * FROM patients WHERE user_id=$1 LIMIT 1', [req.user.id]);
    if (!r.rows.length) return res.json({ success:true, data:null, message:'Aucun dossier patient trouvé' });
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.get('/api/patients/:id', auth, async (req, res) => {
  try {
    const r = await db('SELECT * FROM patients WHERE id=$1', [req.params.id]);
    res.json({ success:true, data:r.rows[0]||null });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.post('/api/patients', auth, async (req, res) => {
  const { prenom, nom, telephone, email, date_naissance, sexe, groupe_sanguin, allergies, antecedents, ville, assurance, numero_police } = req.body;
  if (!prenom||!nom) return res.status(400).json({ success:false, message:'Prénom et nom requis' });
  try {
    const code = 'MC-' + (prenom[0]+nom[0]).toUpperCase() + '-' + Math.floor(1000+Math.random()*9000);
    const r = await db(
      'INSERT INTO patients (id,user_id,clinique_id,code_secret,prenom,nom,telephone,email,date_naissance,sexe,groupe_sanguin,allergies,antecedents,ville,assurance,numero_police) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *',
      [uuid(), req.user?.id||null, req.user?.clinique_id||null, code, prenom, nom, telephone||null, email||null, vd(date_naissance), sexe||null, groupe_sanguin||null, allergies||null, antecedents||null, ville||null, assurance||null, numero_police||null]
    );
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.put('/api/patients/:id', auth, async (req, res) => {
  const { prenom, nom, telephone, email, sexe, groupe_sanguin, allergies, antecedents, assurance, numero_police, ville } = req.body;
  try {
    const r = await db(
      'UPDATE patients SET prenom=COALESCE($1,prenom),nom=COALESCE($2,nom),telephone=COALESCE($3,telephone),email=COALESCE($4,email),sexe=COALESCE($5,sexe),groupe_sanguin=COALESCE($6,groupe_sanguin),allergies=COALESCE($7,allergies),antecedents=COALESCE($8,antecedents),assurance=COALESCE($9,assurance),numero_police=COALESCE($10,numero_police),ville=COALESCE($11,ville),updated_at=NOW() WHERE id=$12 RETURNING *',
      [prenom||null,nom||null,telephone||null,email||null,sexe||null,groupe_sanguin||null,allergies||null,antecedents||null,assurance||null,numero_police||null,ville||null,req.params.id]
    );
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.delete('/api/patients/:id', auth, can('admin','clinique'), async (req, res) => {
  try {
    await db('UPDATE patients SET is_active=false WHERE id=$1', [req.params.id]);
    res.json({ success:true });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// PLANNING — DISPONIBILITÉS MÉDECIN
// ═══════════════════════════════════════════════════════════════════
db(`CREATE TABLE IF NOT EXISTS disponibilites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medecin_id UUID NOT NULL, clinique_id UUID,
  date DATE NOT NULL, heure_debut TIME NOT NULL, heure_fin TIME NOT NULL,
  statut VARCHAR(20) DEFAULT 'disponible', recurrent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
)`).catch(()=>{});

app.get('/api/planning/stats', auth, async (req, res) => {
  try {
    const mid = req.user?.medecin_id || req.user?.id;
    const today = new Date().toISOString().split('T')[0];
    const [rdvJ, rdvM, cons, dispo] = await Promise.all([
      db("SELECT COUNT(*) c FROM rendez_vous WHERE medecin_id=$1 AND date_rdv=$2 AND statut NOT IN ('annule')", [mid, today]).catch(()=>({rows:[{c:0}]})),
      db("SELECT COUNT(*) c FROM rendez_vous WHERE medecin_id=$1 AND date_rdv>=date_trunc('month',CURRENT_DATE) AND statut NOT IN ('annule')", [mid]).catch(()=>({rows:[{c:0}]})),
      db("SELECT COUNT(*) c FROM consultations WHERE medecin_id=$1", [mid]).catch(()=>({rows:[{c:0}]})),
      db("SELECT COUNT(*) c FROM disponibilites WHERE medecin_id=$1 AND statut='disponible' AND date>=CURRENT_DATE", [mid]).catch(()=>({rows:[{c:0}]})),
    ]);
    res.json({ success:true, data:{ rdv_aujourd_hui:+rdvJ.rows[0]?.c||0, rdv_ce_mois:+rdvM.rows[0]?.c||0, consultations_total:+cons.rows[0]?.c||0, creneaux_disponibles:+dispo.rows[0]?.c||0 }});
  } catch(e) { res.json({ success:true, data:{ rdv_aujourd_hui:0, rdv_ce_mois:0, consultations_total:0, creneaux_disponibles:0 } }); }
});
app.get('/api/planning/disponibilites', auth, async (req, res) => {
  try {
    const { mois, annee } = req.query;
    const mid = req.user?.medecin_id || req.user?.id;
    const m = mois || new Date().getMonth()+1;
    const a = annee || new Date().getFullYear();
    const r = await db(
      "SELECT d.*,rdv.patient_nom,rdv.motif AS rdv_motif,rdv.statut AS rdv_statut FROM disponibilites d LEFT JOIN rendez_vous rdv ON rdv.medecin_id=d.medecin_id AND rdv.date_rdv=d.date AND rdv.heure_rdv=d.heure_debut AND rdv.statut NOT IN ('annule') WHERE d.medecin_id=$1 AND EXTRACT(MONTH FROM d.date)=$2 AND EXTRACT(YEAR FROM d.date)=$3 ORDER BY d.date,d.heure_debut",
      [mid, m, a]
    );
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.post('/api/planning/disponibilites', auth, async (req, res) => {
  const { clinique_id, date, heure_debut, heure_fin, recurrent } = req.body;
  if (!date||!heure_debut||!heure_fin) return res.status(400).json({ success:false, message:'Date et heures requises' });
  const mid = req.user?.medecin_id || req.user?.id;
  try {
    const r = await db(
      'INSERT INTO disponibilites (id,medecin_id,clinique_id,date,heure_debut,heure_fin,recurrent) VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6) RETURNING *',
      [mid, clinique_id||req.user?.clinique_id||null, date, heure_debut, heure_fin, recurrent||false]
    );
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.delete('/api/planning/disponibilites/:id', auth, async (req, res) => {
  try { await db('DELETE FROM disponibilites WHERE id=$1', [req.params.id]); res.json({ success:true }); }
  catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.get('/api/planning/rdvs', auth, async (req, res) => {
  try {
    const { date, statut } = req.query;
    const mid = req.user?.medecin_id || req.user?.id;
    let sql = 'SELECT * FROM rendez_vous WHERE medecin_id=$1'; const p = [mid];
    if (date)   { p.push(date);   sql += ` AND date_rdv=$${p.length}`; }
    if (statut) { p.push(statut); sql += ` AND statut=$${p.length}`; }
    sql += ' ORDER BY date_rdv,heure_rdv LIMIT 100';
    const r = await db(sql, p);
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.get('/api/planning/mes-patients', auth, async (req, res) => {
  try {
    const mid = req.user?.medecin_id || req.user?.id;
    const r = await db(
      "SELECT DISTINCT p.* FROM patients p WHERE p.id IN (SELECT DISTINCT c.patient_id FROM consultations c WHERE c.medecin_id=$1 AND c.patient_id IS NOT NULL UNION SELECT DISTINCT r.patient_id FROM rendez_vous r WHERE r.medecin_id=$1 AND r.patient_id IS NOT NULL) ORDER BY p.nom,p.prenom",
      [mid]
    );
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.get('/api/planning/mes-cliniques', auth, async (req, res) => {
  try {
    const mid = req.user?.medecin_id || req.user?.id;
    const r = await db(
      'SELECT c.* FROM cliniques c JOIN medecins m ON m.clinique_id=c.id WHERE m.id=$1 OR m.user_id=$2',
      [mid, req.user?.id]
    ).catch(async () => await db('SELECT * FROM cliniques WHERE is_active IS NOT false LIMIT 20'));
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});

// ═══════════════════════════════════════════════════════════════════
// RENDEZ-VOUS
// ═══════════════════════════════════════════════════════════════════
app.get('/api/rendez-vous', auth, async (req, res) => {
  try {
    const { date, statut, medecin_id } = req.query;
    const role = req.user?.role;
    const cid = req.user?.clinique_id;
    const pid = req.user?.patient_id;
    const mid = req.user?.medecin_id;
    let sql = 'SELECT * FROM rendez_vous WHERE 1=1'; const p = [];
    // Filtrer par rôle
    if (role === 'patient' && pid) { p.push(pid); sql += ` AND patient_id=$${p.length}`; }
    else if (role === 'medecin' && mid) { p.push(mid); sql += ` AND medecin_id=$${p.length}`; }
    else if (cid && role !== 'admin') { p.push(cid); sql += ` AND clinique_id=$${p.length}`; }
    // Filtres additionnels
    if (date)      { p.push(date);       sql += ` AND date_rdv=$${p.length}`; }
    if (statut)    { p.push(statut);     sql += ` AND statut=$${p.length}`; }
    if (medecin_id){ p.push(medecin_id); sql += ` AND medecin_id=$${p.length}`; }
    sql += ' ORDER BY date_rdv,heure_rdv LIMIT 200';
    const r = await db(sql, p);
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.get('/api/rendez-vous/:id', auth, async (req, res) => {
  try {
    const r = await db('SELECT * FROM rendez_vous WHERE id=$1', [req.params.id]);
    res.json({ success:true, data:r.rows[0]||null });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.post('/api/rendez-vous', auth, async (req, res) => {
  const { patient_nom, patient_id, medecin_nom, medecin_id, date_rdv, heure_rdv, motif, statut, assurance, notes, source } = req.body;
  if (!date_rdv||!heure_rdv) return res.status(400).json({ success:false, message:'Date et heure requises' });
  try {
    const ref = 'RDV-' + Date.now().toString(36).toUpperCase();
    const r = await db(
      'INSERT INTO rendez_vous (id,reference,clinique_id,patient_id,patient_nom,medecin_id,medecin_nom,date_rdv,heure_rdv,motif,statut,assurance,notes,source) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *',
      [uuid(), ref, req.user?.clinique_id||null, patient_id||null, patient_nom||null, medecin_id||null, medecin_nom||null, date_rdv, heure_rdv, motif||null, statut||'en_attente', assurance||null, notes||null, source||'dashboard']
    );
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.put('/api/rendez-vous/:id', auth, async (req, res) => {
  const { statut, motif, heure_rdv, date_rdv, medecin_nom, patient_nom, notes } = req.body;
  try {
    const r = await db(
      'UPDATE rendez_vous SET statut=COALESCE($1,statut),motif=COALESCE($2,motif),heure_rdv=COALESCE($3::TIME,heure_rdv),date_rdv=COALESCE($4::DATE,date_rdv),medecin_nom=COALESCE($5,medecin_nom),patient_nom=COALESCE($6,patient_nom),notes=COALESCE($7,notes),updated_at=NOW() WHERE id=$8 RETURNING *',
      [statut||null,motif||null,heure_rdv||null,date_rdv||null,medecin_nom||null,patient_nom||null,notes||null,req.params.id]
    );
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.delete('/api/rendez-vous/:id', auth, async (req, res) => {
  try { await db("UPDATE rendez_vous SET statut='annule' WHERE id=$1", [req.params.id]); res.json({ success:true }); }
  catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// CONSULTATIONS
// ═══════════════════════════════════════════════════════════════════
app.get('/api/consultations', auth, async (req, res) => {
  try {
    const { patient_id } = req.query;
    const role = req.user?.role;
    const cid  = req.user?.clinique_id;
    const mid  = req.user?.medecin_id || (role==='medecin'||role==='medecin_independant' ? req.user?.id : null);
    const pid  = patient_id || (role==='patient' ? req.user?.patient_id : null);
    let sql = 'SELECT c.*,m.prenom AS med_prenom,m.nom AS med_nom FROM consultations c LEFT JOIN medecins m ON m.id=c.medecin_id WHERE 1=1';
    const p = [];
    if (pid)       { p.push(pid); sql += ` AND c.patient_id=$${p.length}`; }
    else if (mid)  { p.push(mid); sql += ` AND c.medecin_id=$${p.length}`; }
    else if (cid && role!=='admin') { p.push(cid); sql += ` AND c.clinique_id=$${p.length}`; }
    sql += ' ORDER BY c.created_at DESC LIMIT 100';
    const r = await db(sql, p);
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.get('/api/consultations/:id', auth, async (req, res) => {
  try {
    const r = await db('SELECT * FROM consultations WHERE id=$1', [req.params.id]);
    res.json({ success:true, data:r.rows[0]||null });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.post('/api/consultations', auth, async (req, res) => {
  const { patient_id, diagnostic, traitement, notes, tension_arterielle, temperature, poids, taille, rdv_id, medecin_id } = req.body;
  if (!diagnostic) return res.status(400).json({ success:false, message:'Diagnostic requis' });
  const mid = medecin_id || req.user?.medecin_id || (req.user?.role==='medecin'||req.user?.role==='medecin_independant' ? req.user?.id : null);
  try {
    const r = await db(
      'INSERT INTO consultations (id,patient_id,clinique_id,medecin_id,diagnostic,traitement,notes,tension_arterielle,temperature,poids,taille,rdv_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *',
      [uuid(), patient_id||null, req.user?.clinique_id||null, mid, diagnostic, traitement||null, notes||null, tension_arterielle||null, temperature||null, poids||null, taille||null, rdv_id||null]
    );
    // Mettre à jour le statut du RDV associé
    if (rdv_id) await db("UPDATE rendez_vous SET statut='termine',updated_at=NOW() WHERE id=$1", [rdv_id]).catch(()=>{});
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
// FIX : Consultation depuis un RDV (crée consultation + ordonnance en une requête)
app.post('/api/consultations/depuis-rdv', auth, async (req, res) => {
  const { rdv_id, patient_id, diagnostic, traitement, notes, tension_arterielle, temperature, poids, taille, ordonnance } = req.body;
  if (!diagnostic) return res.status(400).json({ success:false, message:'Diagnostic requis' });
  const mid = req.user?.medecin_id || req.user?.id;
  try {
    const cons = await db(
      'INSERT INTO consultations (id,patient_id,clinique_id,medecin_id,rdv_id,diagnostic,traitement,notes,tension_arterielle,temperature,poids,taille) VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *',
      [patient_id||null, req.user?.clinique_id||null, mid, rdv_id||null, diagnostic, traitement||null, notes||null, tension_arterielle||null, temperature||null, poids||null, taille||null]
    );
    // Créer l'ordonnance si médicaments fournis
    if (ordonnance?.medicaments) {
      await db(
        'INSERT INTO ordonnances (id,patient_id,clinique_id,medecin_id,consultation_id,medicaments,posologie,duree,notes_ord) VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8)',
        [patient_id||null, req.user?.clinique_id||null, mid, cons.rows[0].id, ordonnance.medicaments, ordonnance.posologie||null, ordonnance.duree||null, ordonnance.notes||null]
      ).catch(()=>{});
    }
    // Clore le RDV
    if (rdv_id) await db("UPDATE rendez_vous SET statut='termine',updated_at=NOW() WHERE id=$1", [rdv_id]).catch(()=>{});
    res.status(201).json({ success:true, data:cons.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.put('/api/consultations/:id', auth, async (req, res) => {
  const { diagnostic, traitement, notes, tension_arterielle, temperature, poids, taille } = req.body;
  try {
    const r = await db(
      'UPDATE consultations SET diagnostic=COALESCE($1,diagnostic),traitement=COALESCE($2,traitement),notes=COALESCE($3,notes),tension_arterielle=COALESCE($4,tension_arterielle),temperature=COALESCE($5,temperature),poids=COALESCE($6,poids),taille=COALESCE($7,taille) WHERE id=$8 RETURNING *',
      [diagnostic||null,traitement||null,notes||null,tension_arterielle||null,temperature||null,poids||null,taille||null,req.params.id]
    );
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// ORDONNANCES
// ═══════════════════════════════════════════════════════════════════
app.get('/api/ordonnances', auth, async (req, res) => {
  try {
    const { patient_id, statut } = req.query;
    const role = req.user?.role;
    const cid  = req.user?.clinique_id;
    const mid  = req.user?.medecin_id || (role==='medecin'||role==='medecin_independant' ? req.user?.id : null);
    const pid  = patient_id || (role==='patient' ? req.user?.patient_id : null);
    // Jointure pour avoir medecin_nom
    let sql = `SELECT o.*,
      CONCAT(m.prenom,' ',m.nom) AS medecin_nom,
      CONCAT(p.prenom,' ',p.nom) AS patient_nom_full
      FROM ordonnances o
      LEFT JOIN medecins m ON m.id=o.medecin_id
      LEFT JOIN patients p ON p.id=o.patient_id
      WHERE 1=1`;
    const params = [];
    if (pid)    { params.push(pid); sql += ` AND o.patient_id=$${params.length}`; }
    else if (mid){ params.push(mid); sql += ` AND o.medecin_id=$${params.length}`; }
    else if (cid && role!=='admin') { params.push(cid); sql += ` AND o.clinique_id=$${params.length}`; }
    if (statut) { params.push(statut); sql += ` AND o.statut=$${params.length}`; }
    sql += ' ORDER BY o.created_at DESC LIMIT 100';
    const r = await db(sql, params);
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.get('/api/ordonnances/:id', auth, async (req, res) => {
  try {
    const r = await db(
      "SELECT o.*,CONCAT(m.prenom,' ',m.nom) AS medecin_nom FROM ordonnances o LEFT JOIN medecins m ON m.id=o.medecin_id WHERE o.id=$1",
      [req.params.id]
    );
    res.json({ success:true, data:r.rows[0]||null });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.post('/api/ordonnances', auth, async (req, res) => {
  const { patient_id, medicaments, posologie, duree, notes_ord, consultation_id } = req.body;
  if (!medicaments) return res.status(400).json({ success:false, message:'Médicaments requis' });
  const mid = req.user?.medecin_id || req.user?.id;
  try {
    const r = await db(
      'INSERT INTO ordonnances (id,patient_id,clinique_id,medecin_id,medicaments,posologie,duree,notes_ord,consultation_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [uuid(), patient_id||null, req.user?.clinique_id||null, mid, medicaments, posologie||null, duree||null, notes_ord||null, consultation_id||null]
    );
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.put('/api/ordonnances/:id', auth, async (req, res) => {
  const { statut, medicaments, posologie, duree, notes_ord } = req.body;
  try {
    const r = await db(
      'UPDATE ordonnances SET statut=COALESCE($1,statut),medicaments=COALESCE($2,medicaments),posologie=COALESCE($3,posologie),duree=COALESCE($4,duree),notes_ord=COALESCE($5,notes_ord),updated_at=NOW() WHERE id=$6 RETURNING *',
      [statut||null,medicaments||null,posologie||null,duree||null,notes_ord||null,req.params.id]
    );
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.delete('/api/ordonnances/:id', auth, async (req, res) => {
  try {
    await db("UPDATE ordonnances SET statut='annulee',updated_at=NOW() WHERE id=$1", [req.params.id]);
    res.json({ success:true });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// STOCK
// ═══════════════════════════════════════════════════════════════════
const getStock = async (req, res) => {
  try {
    const cid = req.user?.clinique_id;
    const uid = req.user?.id;
    let sql = 'SELECT * FROM stock WHERE 1=1'; const p = [];
    if (cid) { p.push(cid); sql += ` AND clinique_id=$${p.length}`; }
    else { p.push(uid); sql += ` AND (user_id=$${p.length} OR clinique_id IS NULL)`; }
    sql += ' ORDER BY nom';
    const r = await db(sql, p);
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
};
app.get('/api/stock', auth, getStock);
app.get('/api/stock/clinique', auth, getStock);
app.get('/api/pharmacie/stock', auth, can('pharmacie','admin'), getStock);
app.post('/api/stock', auth, async (req, res) => {
  const { nom, categorie, quantite, unite, seuil_alerte, prix_unitaire, fournisseur, date_expiration } = req.body;
  if (!nom) return res.status(400).json({ success:false, message:'Nom requis' });
  try {
    const r = await db(
      'INSERT INTO stock (id,clinique_id,user_id,nom,categorie,quantite,unite,seuil_alerte,prix_unitaire,fournisseur,date_expiration) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *',
      [uuid(), req.user?.clinique_id||null, req.user?.id, nom, categorie||'Médicament', quantite||0, unite||'boite', seuil_alerte||10, prix_unitaire||null, fournisseur||null, vd(date_expiration)]
    );
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.post('/api/stock/clinique', auth, async (req, res) => { req.body; res.redirect(307, '/api/stock'); });
app.put('/api/stock/:id', auth, async (req, res) => {
  const { nom, categorie, quantite, unite, seuil_alerte, prix_unitaire, fournisseur, date_expiration } = req.body;
  try {
    const r = await db(
      'UPDATE stock SET nom=COALESCE($1,nom),categorie=COALESCE($2,categorie),quantite=COALESCE($3::INTEGER,quantite),unite=COALESCE($4,unite),seuil_alerte=COALESCE($5::INTEGER,seuil_alerte),prix_unitaire=COALESCE($6::DECIMAL,prix_unitaire),fournisseur=COALESCE($7,fournisseur),date_expiration=COALESCE($8::DATE,date_expiration),updated_at=NOW() WHERE id=$9 RETURNING *',
      [nom||null,categorie||null,quantite||null,unite||null,seuil_alerte||null,prix_unitaire||null,fournisseur||null,vd(date_expiration),req.params.id]
    );
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.delete('/api/stock/:id', auth, async (req, res) => {
  try { await db('DELETE FROM stock WHERE id=$1', [req.params.id]); res.json({ success:true }); }
  catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// FACTURES
// ═══════════════════════════════════════════════════════════════════
app.get('/api/factures', auth, async (req, res) => {
  try {
    const role = req.user?.role;
    const cid  = req.user?.clinique_id;
    const pid  = req.user?.patient_id || (role==='patient' ? req.user?.id : null);
    let sql = 'SELECT * FROM factures WHERE 1=1'; const p = [];
    if (role==='patient' && pid) { p.push(pid); sql += ` AND patient_id=$${p.length}`; }
    else if (cid && role!=='admin') { p.push(cid); sql += ` AND clinique_id=$${p.length}`; }
    sql += ' ORDER BY created_at DESC LIMIT 100';
    const r = await db(sql, p);
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.get('/api/factures/patient', auth, async (req, res) => {
  try {
    // Chercher par patient_id ou par user_id (via la table patients)
    const uid = req.user?.id;
    const pid = req.user?.patient_id;
    const r = await db(
      'SELECT f.* FROM factures f WHERE f.patient_id=$1 OR f.patient_id IN (SELECT id FROM patients WHERE user_id=$2) ORDER BY f.created_at DESC LIMIT 50',
      [pid||uid, uid]
    );
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.get('/api/factures/clinique', auth, async (req, res) => {
  try {
    const cid = req.user?.clinique_id;
    const r = cid
      ? await db('SELECT * FROM factures WHERE clinique_id=$1 ORDER BY created_at DESC LIMIT 100', [cid])
      : await db('SELECT * FROM factures ORDER BY created_at DESC LIMIT 100');
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.get('/api/factures/:id', auth, async (req, res) => {
  try {
    const r = await db('SELECT * FROM factures WHERE id=$1', [req.params.id]);
    res.json({ success:true, data:r.rows[0]||null });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.post('/api/factures', auth, async (req, res) => {
  const { patient_nom, patient_id, montant, description, type_facture, mode_paiement, statut, assurance, notes } = req.body;
  try {
    const ref = 'FAC-' + Date.now().toString(36).toUpperCase();
    const r = await db(
      'INSERT INTO factures (id,reference,clinique_id,patient_id,patient_nom,montant,description,type_facture,mode_paiement,statut,assurance,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *',
      [uuid(), ref, req.user?.clinique_id||null, patient_id||null, patient_nom||null, montant||0, description||null, type_facture||'clinique', mode_paiement||'Espèces', statut||'en_attente', assurance||null, notes||null]
    );
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.put('/api/factures/:id', auth, async (req, res) => {
  const { statut, mode_paiement, notes } = req.body;
  try {
    const r = await db(
      'UPDATE factures SET statut=COALESCE($1,statut),mode_paiement=COALESCE($2,mode_paiement),notes=COALESCE($3,notes),updated_at=NOW() WHERE id=$4 RETURNING *',
      [statut||null, mode_paiement||null, notes||null, req.params.id]
    );
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.delete('/api/factures/:id', auth, can('admin','clinique'), async (req, res) => {
  try {
    await db("UPDATE factures SET statut='annulee' WHERE id=$1", [req.params.id]);
    res.json({ success:true });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// CAISSE
// ═══════════════════════════════════════════════════════════════════
const getCaisseActive = async (cid) => {
  const r = await db("SELECT * FROM caisse_sessions WHERE clinique_id=$1 AND date=CURRENT_DATE AND statut='ouverte' ORDER BY opened_at DESC LIMIT 1", [cid]);
  return r.rows[0]||null;
};
app.get('/api/caisse', auth, async (req, res) => {
  try {
    const cid = req.user?.clinique_id;
    if (!cid) return res.json({ success:true, data:{ statut:'fermee', total_encaisse:0, total_decaisse:0 } });
    const s = await getCaisseActive(cid);
    res.json({ success:true, data:s||{ statut:'fermee', total_encaisse:0, total_decaisse:0 } });
  } catch(e) { res.json({ success:true, data:{ statut:'fermee', total_encaisse:0, total_decaisse:0 } }); }
});
app.get('/api/caisse/clinique', auth, async (req, res) => {
  try {
    const cid = req.user?.clinique_id;
    if (!cid) return res.json({ success:true, data:{ statut:'fermee', total_encaisse:0, total_decaisse:0 } });
    const r = await db("SELECT * FROM caisse_sessions WHERE clinique_id=$1 ORDER BY opened_at DESC LIMIT 30", [cid]);
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.post('/api/caisse/ouvrir', auth, async (req, res) => {
  try {
    const cid = req.user?.clinique_id;
    if (!cid) return res.status(400).json({ success:false, message:'Clinique requise' });
    const existing = await getCaisseActive(cid);
    if (existing) return res.json({ success:true, data:existing, message:'Caisse déjà ouverte' });
    const r = await db('INSERT INTO caisse_sessions (id,clinique_id) VALUES ($1,$2) RETURNING *', [uuid(), cid]);
    res.status(201).json({ success:true, data:r.rows[0], message:'Caisse ouverte !' });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.post('/api/caisse/encaisser', auth, async (req, res) => {
  const { montant, mode_paiement, patient_nom } = req.body;
  if (!montant||+montant<=0) return res.status(400).json({ success:false, message:'Montant invalide' });
  try {
    const cid = req.user?.clinique_id;
    await db("UPDATE caisse_sessions SET total_encaisse=total_encaisse+$1,nb_transactions=nb_transactions+1 WHERE clinique_id=$2 AND date=CURRENT_DATE AND statut='ouverte'", [montant, cid]);
    res.json({ success:true, message:`${Number(montant).toLocaleString('fr-CI')} FCFA encaissés` });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.post('/api/caisse/decaisser', auth, async (req, res) => {
  const { montant } = req.body;
  if (!montant||+montant<=0) return res.status(400).json({ success:false, message:'Montant invalide' });
  try {
    const cid = req.user?.clinique_id;
    await db("UPDATE caisse_sessions SET total_decaisse=total_decaisse+$1,nb_transactions=nb_transactions+1 WHERE clinique_id=$2 AND date=CURRENT_DATE AND statut='ouverte'", [montant, cid]);
    res.json({ success:true, message:'Décaissement enregistré' });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.post('/api/caisse/cloturer', auth, async (req, res) => {
  try {
    const cid = req.user?.clinique_id;
    const r = await db("UPDATE caisse_sessions SET statut='fermee',closed_at=NOW() WHERE clinique_id=$1 AND date=CURRENT_DATE AND statut='ouverte' RETURNING *", [cid]);
    res.json({ success:true, data:r.rows[0]||null, message:'Caisse clôturée' });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// ASSURANCES (tiers-payant)
// ═══════════════════════════════════════════════════════════════════
app.get('/api/assurances', auth, async (req, res) => {
  try {
    const role = req.user?.role;
    const cid  = req.user?.clinique_id;
    let sql = 'SELECT * FROM dossiers_assurance WHERE 1=1'; const p = [];
    if (cid && role!=='admin' && role!=='assureur') { p.push(cid); sql += ` AND clinique_id=$${p.length}`; }
    sql += ' ORDER BY created_at DESC LIMIT 200';
    const r = await db(sql, p);
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.get('/api/assurances/:id', auth, async (req, res) => {
  try {
    const r = await db('SELECT * FROM dossiers_assurance WHERE id=$1', [req.params.id]);
    res.json({ success:true, data:r.rows[0]||null });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.post('/api/assurances', auth, async (req, res) => {
  const { patient_nom, patient_id, compagnie, numero_police, montant_total, montant_assur, ticket_moder, taux_couverture, diagnostic } = req.body;
  if (!patient_nom||!compagnie) return res.status(400).json({ success:false, message:'Patient et compagnie requis' });
  try {
    const ref = 'ASS-' + Date.now().toString(36).toUpperCase();
    const r = await db(
      'INSERT INTO dossiers_assurance (id,reference,clinique_id,patient_id,patient_nom,compagnie,numero_police,montant_total,montant_assur,ticket_moder,taux_couverture,diagnostic) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *',
      [uuid(), ref, req.user?.clinique_id||null, patient_id||null, patient_nom, compagnie, numero_police||null, montant_total||0, montant_assur||0, ticket_moder||0, taux_couverture||80, diagnostic||null]
    );
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.put('/api/assurances/:id', auth, async (req, res) => {
  const { statut, motif_rejet, montant_assur } = req.body;
  try {
    const r = await db(
      'UPDATE dossiers_assurance SET statut=COALESCE($1,statut),motif_rejet=COALESCE($2,motif_rejet),montant_assur=COALESCE($3::DECIMAL,montant_assur),updated_at=NOW() WHERE id=$4 RETURNING *',
      [statut||null, motif_rejet||null, montant_assur||null, req.params.id]
    );
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
// FIX : routes valider/rejeter distinctes
app.put('/api/assurances/:id/valider', auth, can('assureur','admin'), async (req, res) => {
  try {
    const r = await db("UPDATE dossiers_assurance SET statut='valide',updated_at=NOW() WHERE id=$1 RETURNING *", [req.params.id]);
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.put('/api/assurances/:id/rejeter', auth, can('assureur','admin'), async (req, res) => {
  const { motif_rejet } = req.body;
  try {
    const r = await db("UPDATE dossiers_assurance SET statut='rejete',motif_rejet=$1,updated_at=NOW() WHERE id=$2 RETURNING *", [motif_rejet||'Dossier incomplet', req.params.id]);
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.delete('/api/assurances/:id', auth, can('admin'), async (req, res) => {
  try { await db('DELETE FROM dossiers_assurance WHERE id=$1', [req.params.id]); res.json({ success:true }); }
  catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// COMMANDES (livraison médicaments)
// ═══════════════════════════════════════════════════════════════════
app.get('/api/commandes', auth, async (req, res) => {
  try {
    const { statut } = req.query;
    const role = req.user?.role;
    const uid  = req.user?.id;
    let sql = "SELECT c.*,u.prenom||' '||u.nom AS patient_nom_full,u.telephone AS patient_tel FROM commandes c LEFT JOIN utilisateurs u ON u.id=c.patient_id WHERE 1=1";
    const p = [];
    // Filtrage par rôle
    if (role==='patient')  { p.push(uid); sql += ` AND c.patient_id=$${p.length}`; }
    if (role==='livreur')  { p.push(uid); sql += ` AND (c.livreur_id=$${p.length} OR c.livreur_id IS NULL)`; }
    if (statut) { p.push(statut); sql += ` AND c.statut=$${p.length}`; }
    sql += ' ORDER BY c.created_at DESC LIMIT 100';
    const r = await db(sql, p);
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.get('/api/pharmacie/commandes', auth, can('pharmacie','admin'), async (req, res) => {
  try {
    const { statut } = req.query;
    let sql = "SELECT c.*,u.prenom||' '||u.nom AS patient_nom,u.telephone AS patient_tel FROM commandes c LEFT JOIN utilisateurs u ON u.id=c.patient_id WHERE 1=1";
    const p = [];
    if (statut) { p.push(statut); sql += ` AND c.statut=$${p.length}`; }
    sql += ' ORDER BY c.created_at DESC LIMIT 100';
    const r = await db(sql, p);
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.get('/api/livreurs/commandes', auth, can('livreur','admin'), async (req, res) => {
  try {
    const lid = req.user?.id;
    // Commandes assignées à ce livreur + commandes en attente d'assignation
    const r = await db(
      "SELECT c.*,u.prenom||' '||u.nom AS patient_nom,u.telephone AS patient_tel FROM commandes c LEFT JOIN utilisateurs u ON u.id=c.patient_id WHERE (c.livreur_id=$1 OR (c.livreur_id IS NULL AND c.statut='confirmee')) ORDER BY c.created_at DESC LIMIT 50",
      [lid]
    );
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.get('/api/commandes/:id', auth, async (req, res) => {
  try {
    const r = await db('SELECT * FROM commandes WHERE id=$1', [req.params.id]);
    res.json({ success:true, data:r.rows[0]||null });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.post('/api/commandes', auth, async (req, res) => {
  const { adresse_livraison, nombre_articles, frais_livraison, notes, contact } = req.body;
  try {
    const r = await db(
      'INSERT INTO commandes (id,patient_id,adresse_livraison,nombre_articles,frais_livraison,notes,contact) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [uuid(), req.user?.patient_id||req.user?.id, adresse_livraison||null, nombre_articles||1, frais_livraison||1500, notes||null, contact||null]
    );
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.put('/api/commandes/:id', auth, async (req, res) => {
  const { statut, livreur_id } = req.body;
  try {
    const r = await db(
      'UPDATE commandes SET statut=COALESCE($1,statut),livreur_id=COALESCE($2,livreur_id),updated_at=NOW() WHERE id=$3 RETURNING *',
      [statut||null, livreur_id||null, req.params.id]
    );
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.put('/api/commandes/:id/assigner', auth, can('admin','pharmacie'), async (req, res) => {
  const { livreur_id } = req.body;
  if (!livreur_id) return res.status(400).json({ success:false, message:'livreur_id requis' });
  try {
    const r = await db(
      "UPDATE commandes SET livreur_id=$1,statut='en_cours',updated_at=NOW() WHERE id=$2 RETURNING *",
      [livreur_id, req.params.id]
    );
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// LIVREURS
// ═══════════════════════════════════════════════════════════════════
app.put('/api/livreurs/position', auth, can('livreur'), async (req, res) => {
  res.json({ success:true, message:'Position enregistrée' });
});

// ═══════════════════════════════════════════════════════════════════
// BULLETINS (Imagerie + Laboratoire)
// ═══════════════════════════════════════════════════════════════════
app.get('/api/bulletins', auth, async (req, res) => {
  try {
    const { categorie, statut } = req.query;
    const cid = req.user?.clinique_id;
    let sql = 'SELECT * FROM bulletins WHERE 1=1'; const p = [];
    if (categorie) { p.push(categorie); sql += ` AND categorie=$${p.length}`; }
    if (statut)    { p.push(statut);    sql += ` AND statut=$${p.length}`; }
    if (cid)       { p.push(cid);       sql += ` AND (clinique_id=$${p.length} OR clinique_id IS NULL)`; }
    sql += ' ORDER BY created_at DESC LIMIT 100';
    const r = await db(sql, p);
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.post('/api/bulletins', auth, async (req, res) => {
  const { type, categorie, patient_nom, patient_id, emetteur_nom, fichier_nom, rapport, notes } = req.body;
  if (!type) return res.status(400).json({ success:false, message:'Type requis' });
  try {
    const r = await db(
      'INSERT INTO bulletins (id,type,categorie,patient_nom,patient_id,emetteur_nom,clinique_id,fichier_nom,rapport,notes) VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [type, categorie||'imagerie', patient_nom||null, patient_id||null, emetteur_nom||req.user?.prenom+' '+req.user?.nom||null, req.user?.clinique_id||null, fichier_nom||null, rapport||null, notes||null]
    );
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.put('/api/bulletins/:id', auth, async (req, res) => {
  const { statut, rapport, notes } = req.body;
  try {
    const r = await db(
      "UPDATE bulletins SET statut=COALESCE($1,statut),rapport=COALESCE($2,rapport),notes=COALESCE($3,notes),updated_at=NOW() WHERE id=$4 RETURNING *",
      [statut||null, rapport||null, notes||null, req.params.id]
    );
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// PUBLIC (sans auth)
// ═══════════════════════════════════════════════════════════════════
app.get('/api/public/cliniques', async (req, res) => {
  try {
    const r = await db("SELECT id,nom,type,ville,adresse,telephone,email FROM cliniques WHERE is_active IS NOT false ORDER BY nom");
    console.log(`[public/cliniques] ${r.rows.length} retournées`);
    res.json({ success:true, data:r.rows });
  } catch(e) {
    console.error('[public/cliniques]', e.message);
    // Dernier recours sans filtre
    try {
      const r2 = await db('SELECT id,nom,type,ville,adresse,telephone FROM cliniques ORDER BY nom LIMIT 50');
      res.json({ success:true, data:r2.rows });
    } catch(e2) { res.json({ success:true, data:[] }); }
  }
});
app.get('/api/public/medecins', async (req, res) => {
  try {
    const { clinique_id, independant, specialite } = req.query;
    let sql, params = [];
    if (clinique_id) {
      sql = "SELECT m.*,c.nom AS clinique_nom FROM medecins m LEFT JOIN cliniques c ON c.id=m.clinique_id WHERE m.clinique_id=$1 ORDER BY m.prenom,m.nom";
      params = [clinique_id];
    } else if (independant === 'true') {
      sql = "SELECT m.* FROM medecins m WHERE (m.clinique_id IS NULL OR m.type_contrat='independant') ORDER BY m.prenom,m.nom";
    } else {
      sql = "SELECT m.*,c.nom AS clinique_nom FROM medecins m LEFT JOIN cliniques c ON c.id=m.clinique_id ORDER BY m.prenom,m.nom LIMIT 100";
    }
    const r = await db(sql, params);
    console.log(`[public/medecins] ${r.rows.length} retournés, clinique_id=${clinique_id||'all'}`);
    res.json({ success:true, data:r.rows });
  } catch(e) {
    console.error('[public/medecins]', e.message);
    res.json({ success:true, data:[] });
  }
});
app.get('/api/public/medecins/:id/disponibilites', async (req, res) => {
  try {
    const r = await db("SELECT * FROM disponibilites WHERE medecin_id=$1 AND statut='disponible' AND date>=CURRENT_DATE ORDER BY date,heure_debut LIMIT 30", [req.params.id]);
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.post('/api/public/rdv', async (req, res) => {
  const { patient_nom, clinique_id, medecin_id, date_rdv, heure_rdv, motif } = req.body;
  if (!date_rdv||!heure_rdv) return res.status(400).json({ success:false, message:'Date et heure requises' });
  try {
    const ref = 'MC-RDV-' + Math.random().toString(36).slice(2,8).toUpperCase();
    const r = await db(
      'INSERT INTO rendez_vous (id,reference,clinique_id,medecin_id,patient_nom,date_rdv,heure_rdv,motif,source) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [uuid(), ref, clinique_id||null, medecin_id||null, patient_nom||null, date_rdv, heure_rdv, motif||null, 'public_rdv']
    );
    res.status(201).json({ success:true, data:{ reference:ref, rdv_id:r.rows[0].id }, message:'RDV confirmé !' });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// ERREURS
// ═══════════════════════════════════════════════════════════════════
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status||500).json({ success:false, message: isProd && (!err.status||err.status>=500) ? 'Erreur interne' : err.message });
});
app.use((req, res) => {
  res.status(404).json({ success:false, message:`Route introuvable: ${req.method} ${req.originalUrl}` });
});

// ═══════════════════════════════════════════════════════════════════
// DÉMARRAGE
// ═══════════════════════════════════════════════════════════════════
initTables().catch(console.error);

if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => console.log(`[MediConnect] Backend démarré sur http://localhost:${PORT}`));
}

module.exports = app;
