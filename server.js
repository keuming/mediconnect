require('dotenv').config();
const express    = require('express');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
const { Pool }   = require('pg');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const path       = require('path');

const isProd = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET || 'mediconnect_dev_secret_2024';

// ── DB Pool ───────────────────────────────────────────────────────
const cleanUrl = (u) => u ? u.replace(/[?&]channel_binding=[^&]*/g, '') : u;
const pool = new Pool({
  connectionString: cleanUrl(process.env.DATABASE_URL),
  ssl: { rejectUnauthorized: false },
  max: 3,
  idleTimeoutMillis: 20000,
  connectionTimeoutMillis: 8000,
});
const db = async (text, params) => {
  const c = await pool.connect();
  try { return await c.query(text, params); } finally { c.release(); }
};

// ── Auth middleware ────────────────────────────────────────────────
const auth = (req, res, next) => {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return res.status(401).json({ success:false, message:'Token manquant' });
  try {
    req.user = jwt.verify(h.slice(7), JWT_SECRET);
    next();
  } catch { return res.status(401).json({ success:false, message:'Token invalide' }); }
};

// MODIFICATION : can prend en charge l'héritage admin globalement et renvoie un vrai 403
const can = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ success:false, message:'Non authentifié' });
  if (req.user.role === 'admin' || roles.includes(req.user.role)) {
    return next();
  }
  return res.status(403).json({ success:false, message:`Accès refusé pour le rôle: ${req.user.role}` });
};

// ── Auto-init tables ──────────────────────────────────────────────
const initTables = async () => {
  const tables = [
    `CREATE TABLE IF NOT EXISTS utilisateurs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(200) UNIQUE NOT NULL, password VARCHAR(200) NOT NULL,
      role VARCHAR(30) DEFAULT 'patient', prenom VARCHAR(100), nom VARCHAR(100),
      telephone VARCHAR(30), ville VARCHAR(100), adresse TEXT,
      clinique_id UUID, patient_id UUID, medecin_id UUID,
      is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS cliniques (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID, nom VARCHAR(200), type VARCHAR(100) DEFAULT 'Clinique',
      adresse TEXT, ville VARCHAR(100), telephone VARCHAR(30),
      email VARCHAR(200), is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS medecins (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID, clinique_id UUID, prenom VARCHAR(100), nom VARCHAR(100),
      specialite VARCHAR(100), telephone VARCHAR(30), email VARCHAR(200),
      tarif DECIMAL(10,2), experience_ans INTEGER, statut VARCHAR(30) DEFAULT 'Disponible',
      jours_travail VARCHAR(200) DEFAULT 'Lun,Mar,Mer,Jeu,Ven',
      horaires_debut TIME DEFAULT '08:00', horaires_fin TIME DEFAULT '17:00',
      note_moyenne DECIMAL(3,2), created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS patients (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID, clinique_id UUID, code_secret VARCHAR(30),
      prenom VARCHAR(100), nom VARCHAR(100), telephone VARCHAR(30),
      email VARCHAR(200), date_naissance DATE, groupe_sanguin VARCHAR(10),
      allergies TEXT, antecedents TEXT, ville VARCHAR(100),
      assurance VARCHAR(100), numero_police VARCHAR(100),
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
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
      patient_id UUID, clinique_id UUID, medecin_id UUID, medecin_nom VARCHAR(200),
      rdv_id UUID, diagnostic TEXT, traitement TEXT, notes TEXT,
      tension_arterielle VARCHAR(20), temperature VARCHAR(10), poids VARCHAR(10), taille VARCHAR(10),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS ordonnances (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id UUID, clinique_id UUID, medecin_id UUID, consultation_id UUID,
      medicaments TEXT, posologie TEXT, duree VARCHAR(100), notes_ord TEXT,
      statut VARCHAR(20) DEFAULT 'active', created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS stock (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      clinique_id UUID, nom VARCHAR(200) NOT NULL,
      categorie VARCHAR(100) DEFAULT 'Médicament', quantite INTEGER DEFAULT 0,
      unite VARCHAR(50) DEFAULT 'boite', seuil_alerte INTEGER DEFAULT 10,
      prix_unitaire DECIMAL(12,2), fournisseur VARCHAR(200),
      date_expiration DATE, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS factures (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      reference VARCHAR(50), clinique_id UUID, patient_id UUID,
      patient_nom VARCHAR(200), montant DECIMAL(12,2) DEFAULT 0,
      mode_paiement VARCHAR(50) DEFAULT 'Espèces',
      statut VARCHAR(30) DEFAULT 'en_attente', assurance VARCHAR(100),
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS caisse_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      clinique_id UUID, date DATE DEFAULT CURRENT_DATE,
      statut VARCHAR(20) DEFAULT 'ouverte',
      total_encaisse DECIMAL(12,2) DEFAULT 0, total_decaisse DECIMAL(12,2) DEFAULT 0,
      opened_at TIMESTAMPTZ DEFAULT NOW(), closed_at TIMESTAMPTZ
    )`,
    `CREATE TABLE IF NOT EXISTS dossiers_assurance (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      reference VARCHAR(50), clinique_id UUID, patient_id UUID,
      patient_nom VARCHAR(200), compagnie VARCHAR(100), numero_police VARCHAR(100),
      montant_total DECIMAL(12,2) DEFAULT 0, montant_assur DECIMAL(12,2) DEFAULT 0,
      ticket_moder DECIMAL(12,2) DEFAULT 0, taux_couverture INTEGER DEFAULT 80,
      diagnostic TEXT, statut VARCHAR(30) DEFAULT 'soumis', motif_rejet TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS commandes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id UUID, pharmacie_id UUID, livreur_id UUID,
      adresse_livraison TEXT, nombre_articles INTEGER DEFAULT 1,
      frais_livraison DECIMAL(10,2) DEFAULT 1500,
      statut VARCHAR(30) DEFAULT 'en_attente',
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS disponibilites (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      medecin_id UUID NOT NULL, clinique_id UUID,
      date DATE NOT NULL, heure_debut TIME NOT NULL, heure_fin TIME NOT NULL,
      statut VARCHAR(20) DEFAULT 'disponible', recurrent BOOLEAN DEFAULT false,
      motif_absence TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS bulletins (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      type VARCHAR(50) NOT NULL, categorie VARCHAR(30) DEFAULT 'imagerie',
      patient_nom VARCHAR(200), patient_id UUID, emetteur_nom VARCHAR(200),
      clinique_id UUID, rapport TEXT, notes TEXT,
      statut VARCHAR(20) DEFAULT 'nouveau',
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS specialites_clinique (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      clinique_id UUID NOT NULL, nom VARCHAR(200) NOT NULL,
      description TEXT, tarif_consultation DECIMAL(10,2),
      disponible BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
  ];
  for (const sql of tables) {
    await db(sql).catch(e => console.error('[INIT TABLE]', e.message));
  }
  
  const alterations = [
    "ALTER TABLE rendez_vous ADD COLUMN IF NOT EXISTS patient_nom VARCHAR(200)",
    "ALTER TABLE rendez_vous ADD COLUMN IF NOT EXISTS medecin_nom VARCHAR(200)",
    "ALTER TABLE rendez_vous ADD COLUMN IF NOT EXISTS reference VARCHAR(50)",
    "ALTER TABLE rendez_vous ADD COLUMN IF NOT EXISTS assurance VARCHAR(100)",
    "ALTER TABLE rendez_vous ADD COLUMN IF NOT EXISTS source VARCHAR(30) DEFAULT 'dashboard'",
    "ALTER TABLE rendez_vous ADD COLUMN IF NOT EXISTS notes TEXT",
    "ALTER TABLE rendez_vous ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS code_secret VARCHAR(30)",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS allergies TEXT",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS antecedents TEXT",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS groupe_sanguin VARCHAR(10)",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS assurance VARCHAR(100)",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS numero_police VARCHAR(100)",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()",
    "ALTER TABLE medecins ADD COLUMN IF NOT EXISTS horaires_debut TIME DEFAULT '08:00'",
    "ALTER TABLE medecins ADD COLUMN IF NOT EXISTS horaires_fin TIME DEFAULT '17:00'",
    "ALTER TABLE medecins ADD COLUMN IF NOT EXISTS note_moyenne DECIMAL(3,2)",
    "ALTER TABLE medecins ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()",
    "ALTER TABLE rendez_vous ALTER COLUMN patient_id DROP NOT NULL",
    "ALTER TABLE rendez_vous ALTER COLUMN clinique_id DROP NOT NULL",
  ];
  for (const sql of alterations) {
    await db(sql).catch(() => {});
  }
  console.log('[DB] Tables vérifiées et migrées');
};

// ── App Express ───────────────────────────────────────────────────
const app = express();
app.set('trust proxy', 1);

// CORS EN PREMIER
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

// Rate limiting
app.use('/api/auth', rateLimit({ windowMs:15*60*1000, max:50, skip:r=>r.method==='OPTIONS' }));
app.use('/api/', rateLimit({ windowMs:60*1000, max:500, skip:r=>r.method==='OPTIONS' }));

// ── HEALTH ────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    await db('SELECT 1');
    res.json({ success:true, status:'ok', db:'connected', env: process.env.NODE_ENV||'unknown', ts:new Date().toISOString() });
  } catch(e) {
    res.status(503).json({ success:false, db:'error', error:e.message });
  }
});
app.get('/', (req, res) => res.json({ success:true, message:'MediConnect API v2', health:'/api/health' }));


// =================================================================
// ── PRIORITY ROUTES (BULLETINS & PLANNING) ───────────────────────
// =================================================================

// ── BULLETINS ROUTES (Supporte avec et sans le préfixe /api) ──────
const getBulletins = async (req, res) => {
  try {
    const cid = req.user?.clinique_id;
    const r = cid 
      ? await db('SELECT * FROM bulletins WHERE clinique_id=$1 ORDER BY created_at DESC', [cid])
      : await db('SELECT * FROM bulletins ORDER BY created_at DESC');
    res.json({ success: true, data: r.rows });
  } catch(e) { res.json({ success: false, message: e.message, data: [] }); }
};
app.get('/api/bulletins', auth, getBulletins);
app.get('/bulletins', auth, getBulletins); // <-- Sécurité Vercel

const postBulletins = async (req, res) => {
  const { type, categorie, patient_nom, patient_id, emetteur_nom, rapport, notes } = req.body;
  if (!type) return res.status(400).json({ success: false, message: 'Le type est requis' });
  try {
    const r = await db(
      'INSERT INTO bulletins (id, type, categorie, patient_nom, patient_id, emetteur_nom, clinique_id, rapport, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [uuid(), type, categorie||'imagerie', patient_nom, patient_id||null, emetteur_nom, req.user?.clinique_id, rapport, notes]
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
};
app.post('/api/bulletins', auth, postBulletins);
app.post('/bulletins', auth, postBulletins); // <-- Sécurité Vercel

// ── PLANNING / DISPONIBILITÉS ROUTES ──────────────────────────────
const getPlanningStats = async (req, res) => {
  try {
    const cid = req.user?.clinique_id;
    const mid = req.user?.medecin_id;
    let total_rdv = 0, en_attente = 0, confirmes = 0;
    
    if (mid) {
      const r = await db("SELECT count(*) t, count(case when statut='en_attente' then 1 end) w, count(case when statut='confirme' then 1 end) c FROM rendez_vous WHERE medecin_id=$1", [mid]);
      total_rdv = r.rows[0]?.t || 0; en_attente = r.rows[0]?.w || 0; confirmes = r.rows[0]?.c || 0;
    } else if (cid) {
      const r = await db("SELECT count(*) t, count(case when statut='en_attente' then 1 end) w, count(case when statut='confirme' then 1 end) c FROM rendez_vous WHERE clinique_id=$1", [cid]);
      total_rdv = r.rows[0]?.t || 0; en_attente = r.rows[0]?.w || 0; confirmes = r.rows[0]?.c || 0;
    }
    res.json({ success: true, data: { total_rdv: parseInt(total_rdv), en_attente: parseInt(en_attente), confirmes: parseInt(confirmes) } });
  } catch(e) { res.json({ success: false, message: e.message }); }
};
app.get('/api/planning/stats', auth, getPlanningStats);
app.get('/planning/stats', auth, getPlanningStats); // <-- Sécurité Vercel

// =================================================================
// ── STANDARD SECURED API ROUTES ──────────────────────────────────
// =================================================================

// ── AUTH ──────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success:false, message:'Email et mot de passe requis' });
  try {
    const r = await db('SELECT * FROM utilisateurs WHERE email=$1 AND is_active IS NOT false LIMIT 1', [email]);
    if (!r.rows.length) return res.status(401).json({ success:false, message:'Email ou mot de passe incorrect' });
    const user = r.rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ success:false, message:'Email ou mot de passe incorrect' });
    const token = jwt.sign({ id:user.id, role:user.role, clinique_id:user.clinique_id, patient_id:user.patient_id, medecin_id:user.medecin_id }, JWT_SECRET, { expiresIn:'7d' });
    const { password:_, ...u } = user;
    res.json({ success:true, token, user:u });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

app.post('/api/auth/register', async (req, res) => {
  const { email, password, prenom, nom, role, telephone } = req.body;
  if (!email || !password) return res.status(400).json({ success:false, message:'Email et mot de passe requis' });
  try {
    const exists = await db('SELECT id FROM utilisateurs WHERE email=$1', [email]);
    if (exists.rows.length) return res.status(409).json({ success:false, message:'Email déjà utilisé' });
    const hash = await bcrypt.hash(password, 10);
    const id = uuid();
    const r = await db('INSERT INTO utilisateurs (id,email,password,prenom,nom,role,telephone) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [id, email, hash, prenom||'', nom||'', role||'patient', telephone||null]);
    const token = jwt.sign({ id, role:role||'patient' }, JWT_SECRET, { expiresIn:'7d' });
    const { password:_, ...u } = r.rows[0];
    res.status(201).json({ success:true, token, user:u });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ── UTILISATEURS ──────────────────────────────────────────────────
app.get('/api/utilisateurs', auth, can('admin'), async (req, res) => {
  try {
    const r = await db('SELECT id,email,role,prenom,nom,telephone,ville,is_active,created_at FROM utilisateurs ORDER BY created_at DESC LIMIT 500');
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.get('/api/utilisateurs/me', auth, async (req, res) => {
  try {
    const r = await db('SELECT id,email,role,prenom,nom,telephone,ville,clinique_id,patient_id FROM utilisateurs WHERE id=$1', [req.user.id]);
    res.json({ success:true, data:r.rows[0]||{} });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ── CLINIQUES ─────────────────────────────────────────────────────
app.get('/api/cliniques', async (req, res) => {
  try { const r = await db('SELECT * FROM cliniques ORDER BY nom'); res.json({ success:true, data:r.rows }); }
  catch(e) { res.json({ success:true, data:[] }); }
});
app.get('/api/cliniques/stats', auth, async (req, res) => {
  try {
    const cid = req.user?.clinique_id;
    if (!cid) return res.json({ success:true, data:{ medecins_actifs:0, rdv_ce_mois:0, patients_mois:0 } });
    const [m,r,p] = await Promise.all([
      db("SELECT COUNT(*) c FROM medecins WHERE clinique_id=$1 AND statut='Disponible'", [cid]).catch(()=>({rows:[{c:0}]})),
      db("SELECT COUNT(*) c FROM rendez_vous WHERE clinique_id=$1 AND date_rdv>=date_trunc('month',CURRENT_DATE)", [cid]).catch(()=>({rows:[{c:0}]})),
      db("SELECT COUNT(*) c FROM patients WHERE clinique_id=$1 AND created_at>=date_trunc('month',CURRENT_DATE)", [cid]).catch(()=>({rows:[{c:0}]})),
    ]);
    res.json({ success:true, data:{ medecins_actifs:m.rows[0]?.c||0, rdv_ce_mois:r.rows[0]?.c||0, patients_mois:p.rows[0]?.c||0 } });
  } catch(e) { res.json({ success:true, data:{ medecins_actifs:0, rdv_ce_mois:0, patients_mois:0 } }); }
});

// ── MÉDECINS ──────────────────────────────────────────────────────
const medecinRouter = (method, path, ...handlers) => app[method]('/api/medecins' + path, ...handlers);
medecinRouter('get', '/', auth, async (req, res) => {
  try {
    const cid = req.query.clinique_id || req.user?.clinique_id;
    const r = cid
      ? await db('SELECT * FROM medecins WHERE clinique_id=$1 ORDER BY nom,prenom', [cid])
      : await db('SELECT * FROM medecins ORDER BY nom,prenom');
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});

app.get('/api/public/medecins', async (req, res) => {
  try {
    const { clinique_id, specialite } = req.query;
    let sql = 'SELECT * FROM medecins WHERE 1=1'; const p = [];
    if (clinique_id) { p.push(clinique_id); sql += ` AND clinique_id=$${p.length}`; }
    if (specialite)  { p.push(specialite);  sql += ` AND specialite=$${p.length}`; }
    sql += ' ORDER BY nom,prenom';
    const r = await db(sql, p);
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
medecinRouter('post', '/', auth, async (req, res) => {
  const { prenom, nom, specialite, telephone, email, tarif, experience_ans, jours_travail, horaires_debut, horaires_fin } = req.body;
  if (!prenom||!nom||!specialite) return res.status(400).json({ success:false, message:'Prénom, nom et spécialité requis' });
  try {
    const r = await db('INSERT INTO medecins (id,clinique_id,prenom,nom,specialite,telephone,email,tarif,experience_ans,jours_travail,horaires_debut,horaires_fin) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *',
      [uuid(), req.user?.clinique_id, prenom, nom, specialite, telephone||null, email||null, tarif||null, experience_ans||null, jours_travail||'Lun,Mar,Mer,Jeu,Ven', horaires_debut||'08:00', horaires_fin||'17:00']);
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
medecinRouter('put', '/:id', auth, async (req, res) => {
  const { prenom, nom, specialite, statut, tarif, telephone, experience_ans, jours_travail, horaires_debut, horaires_fin } = req.body;
  try {
    const r = await db('UPDATE medecins SET prenom=COALESCE($1,prenom),nom=COALESCE($2,nom),specialite=COALESCE($3,specialite),statut=COALESCE($4,statut),tarif=COALESCE($5,tarif),telephone=COALESCE($6,telephone),experience_ans=COALESCE($7,experience_ans),jours_travail=COALESCE($8,jours_travail),horaires_debut=COALESCE($9,horaires_debut),horaires_fin=COALESCE($10,horaires_fin),updated_at=NOW() WHERE id=$11 RETURNING *',
      [prenom,nom,specialite,statut,tarif,telephone,experience_ans,jours_travail,horaires_debut,horaires_fin,req.params.id]);
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
medecinRouter('delete', '/:id', auth, async (req, res) => {
  try { await db('DELETE FROM medecins WHERE id=$1', [req.params.id]); res.json({ success:true }); }
  catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ── PATIENTS ──────────────────────────────────────────────────────
const vd = d => d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
app.get('/api/patients', auth, async (req, res) => {
  try {
    const cid = req.user?.clinique_id;
    const r = cid ? await db('SELECT * FROM patients WHERE clinique_id=$1 ORDER BY nom,prenom LIMIT 500', [cid]) : await db('SELECT * FROM patients ORDER BY nom LIMIT 500');
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.get('/api/patients/:id', auth, async (req, res) => {
  try { const r = await db('SELECT * FROM patients WHERE id=$1', [req.params.id]); res.json({ success:true, data:r.rows[0]||null }); }
  catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.post('/api/patients', auth, async (req, res) => {
  const { prenom, nom, telephone, email, date_naissance, groupe_sanguin, allergies, antecedents, ville, assurance, numero_police } = req.body;
  if (!prenom||!nom) return res.status(400).json({ success:false, message:'Prénom et nom requis' });
  try {
    const code = 'MC-'+(prenom[0]+nom[0]).toUpperCase()+'-'+Math.floor(1000+Math.random()*9000);
    const r = await db('INSERT INTO patients (id,clinique_id,code_secret,prenom,nom,telephone,email,date_naissance,groupe_sanguin,allergies,antecedents,ville,assurance,numero_police) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *',
      [uuid(), req.user?.clinique_id, code, prenom, nom, telephone||null, email||null, vd(date_naissance), groupe_sanguin||null, allergies||null, antecedents||null, ville||null, assurance||null, numero_police||null]);
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.put('/api/patients/:id', auth, async (req, res) => {
  const { prenom, nom, telephone, email, groupe_sanguin, allergies, antecedents, assurance } = req.body;
  try {
    const r = await db('UPDATE patients SET prenom=COALESCE($1,prenom),nom=COALESCE($2,nom),telephone=COALESCE($3,telephone),email=COALESCE($4,email),groupe_sanguin=COALESCE($5,groupe_sanguin),allergies=COALESCE($6,allergies),antecedents=COALESCE($7,antecedents),assurance=COALESCE($8,assurance),updated_at=NOW() WHERE id=$9 RETURNING *',
      [prenom,nom,telephone,email,groupe_sanguin,allergies,antecedents,assurance,req.params.id]);
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ── RENDEZ-VOUS ───────────────────────────────────────────────────
app.get('/api/rendez-vous', auth, async (req, res) => {
  try {
    const { date, statut, medecin_id } = req.query;
    const cid = req.user?.clinique_id;
    let sql = 'SELECT * FROM rendez_vous WHERE 1=1'; const p = [];
    if (cid) { p.push(cid); sql+=` AND clinique_id=$${p.length}`; }
    if (date) { p.push(date); sql+=` AND date_rdv=$${p.length}`; }
    if (statut) { p.push(statut); sql+=` AND statut=$${p.length}`; }
    if (medecin_id) { p.push(medecin_id); sql+=` AND medecin_id=$${p.length}`; }
    sql+=' ORDER BY date_rdv,heure_rdv LIMIT 200';
    const r = await db(sql, p); res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.post('/api/rendez-vous', auth, async (req, res) => {
  const { patient_nom, patient_id, medecin_nom, medecin_id, date_rdv, heure_rdv, motif, statut, assurance, notes } = req.body;
  if (!date_rdv||!heure_rdv) return res.status(400).json({ success:false, message:'Date et heure requises' });
  try {
    const ref = 'RDV-'+Date.now().toString(36).toUpperCase();
    const r = await db('INSERT INTO rendez_vous (id,reference,clinique_id,patient_id,patient_nom,medecin_id,medecin_nom,date_rdv,heure_rdv,motif,statut,assurance,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *',
      [uuid(),ref,req.user?.clinique_id,patient_id||null,patient_nom||null,medecin_id||null,medecin_nom||null,date_rdv,heure_rdv,motif||null,statut||'en_attente',assurance||null,notes||null]);
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.put('/api/rendez-vous/:id', auth, async (req, res) => {
  const { statut, motif, heure_rdv, date_rdv, medecin_nom, patient_nom, notes } = req.body;
  try {
    const r = await db('UPDATE rendez_vous SET statut=COALESCE($1,statut),motif=COALESCE($2,motif),heure_rdv=COALESCE($3,heure_rdv),date_rdv=COALESCE($4,date_rdv),medecin_nom=COALESCE($5,medecin_nom),patient_nom=COALESCE($6,patient_nom),notes=COALESCE($7,notes),updated_at=NOW() WHERE id=$8 RETURNING *',
      [statut,motif,heure_rdv,date_rdv,medecin_nom,patient_nom,notes,req.params.id]);
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.delete('/api/rendez-vous/:id', auth, async (req, res) => {
  try { await db('DELETE FROM rendez_vous WHERE id=$1', [req.params.id]); res.json({ success:true }); }
  catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ── CONSULTATIONS ─────────────────────────────────────────────────
app.get('/api/consultations', auth, async (req, res) => {
  try {
    const { patient_id } = req.query; const cid = req.user?.clinique_id;
    let sql='SELECT * FROM consultations WHERE 1=1'; const p=[];
    if (patient_id) { p.push(patient_id); sql+=` AND patient_id=$${p.length}`; }
    else if (cid) { p.push(cid); sql+=` AND clinique_id=$${p.length}`; }
    sql+=' ORDER BY created_at DESC LIMIT 100';
    const r = await db(sql,p); res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.post('/api/consultations', auth, async (req, res) => {
  const { patient_id, diagnostic, traitement, notes, tension_arterielle, temperature, poids, taille, rdv_id } = req.body;
  if (!patient_id||!diagnostic) return res.status(400).json({ success:false, message:'Patient et diagnostic requis' });
  try {
    const r = await db('INSERT INTO consultations (id,patient_id,clinique_id,diagnostic,traitement,notes,tension_arterielle,temperature,poids,taille,rdv_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *',
      [uuid(),patient_id,req.user?.clinique_id,diagnostic,traitement||null,notes||null,tension_arterielle||null,temperature||null,poids||null,taille||null,rdv_id||null]);
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ── ORDONNANCES ───────────────────────────────────────────────────
app.get('/api/ordonnances', auth, async (req, res) => {
  try {
    const { patient_id } = req.query; const cid = req.user?.clinique_id;
    let sql='SELECT * FROM ordonnances WHERE 1=1'; const p=[];
    if (patient_id) { p.push(patient_id); sql+=` AND patient_id=$${p.length}`; }
    else if (cid) { p.push(cid); sql+=` AND clinique_id=$${p.length}`; }
    sql+=' ORDER BY created_at DESC LIMIT 100';
    const r = await db(sql,p); res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.post('/api/ordonnances', auth, async (req, res) => {
  const { patient_id, medicaments, posologie, duree, notes_ord, consultation_id } = req.body;
  if (!patient_id||!medicaments) return res.status(400).json({ success:false, message:'Patient et médicaments requis' });
  try {
    const r = await db('INSERT INTO ordonnances (id,patient_id,clinique_id,medicaments,posologie,duree,notes_ord,consultation_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [uuid(),patient_id,req.user?.clinique_id,medicaments,posologie||null,duree||null,notes_ord||null,consultation_id||null]);
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ── STOCK ─────────────────────────────────────────────────────────
const stockHandler = async (req, res, extra={}) => {
  const cid = req.user?.clinique_id;
  let sql='SELECT * FROM stock WHERE 1=1'; const p=[];
  if (cid) { p.push(cid); sql+=` AND clinique_id=$${p.length}`; }
  sql+=' ORDER BY nom';
  try { const r=await db(sql,p); res.json({ success:true, data:r.rows, ...extra }); }
  catch(e) { res.json({ success:true, data:[] }); }
};
app.get('/api/stock', auth, (req,res)=>stockHandler(req,res));
app.get('/api/stock/clinique', auth, (req,res)=>stockHandler(req,res));
app.post('/api/stock', auth, async (req, res) => {
  const { nom, categorie, quantite, unite, seuil_alerte, prix_unitaire, fournisseur, date_expiration } = req.body;
  if (!nom) return res.status(400).json({ success:false, message:'Nom requis' });
  try {
    const r = await db('INSERT INTO stock (id,clinique_id,nom,categorie,quantite,unite,seuil_alerte,prix_unitaire,fournisseur,date_expiration) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
      [uuid(),req.user?.clinique_id,nom,categorie||'Médicament',quantite||0,unite||'boite',seuil_alerte||10,prix_unitaire||null,fournisseur||null,vd(date_expiration)]);
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.post('/api/stock/clinique', auth, async (req, res) => {
  const { nom, categorie, quantite, unite, seuil_alerte, prix_unitaire, fournisseur, date_expiration } = req.body;
  if (!nom) return res.status(400).json({ success:false, message:'Nom requis' });
  try {
    const r = await db('INSERT INTO stock (id,clinique_id,nom,categorie,quantite,unite,seuil_alerte,prix_unitaire,fournisseur,date_expiration) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
      [uuid(),req.user?.clinique_id,nom,categorie||'Médicament',quantite||0,unite||'boite',seuil_alerte||10,prix_unitaire||null,fournisseur||null,vd(date_expiration)]);
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.put('/api/stock/:id', auth, async (req, res) => {
  const { nom, categorie, quantite, unite, seuil_alerte, prix_unitaire, fournisseur, date_expiration } = req.body;
  try {
    const r = await db('UPDATE stock SET nom=COALESCE($1,nom),categorie=COALESCE($2,categorie),quantite=COALESCE($3,quantite),unite=COALESCE($4,unite),seuil_alerte=COALESCE($5,seuil_alerte),prix_unitaire=COALESCE($6,prix_unitaire),fournisseur=COALESCE($7,fournisseur),date_expiration=COALESCE($8,date_expiration),updated_at=NOW() WHERE id=$9 RETURNING *',
      [nom,categorie,quantite,unite,seuil_alerte,prix_unitaire,fournisseur,vd(date_expiration),req.params.id]);
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.delete('/api/stock/:id', auth, async (req, res) => {
  try { await db('DELETE FROM stock WHERE id=$1', [req.params.id]); res.json({ success:true }); }
  catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ── FACTURES ──────────────────────────────────────────────────────
app.get('/api/factures', auth, async (req, res) => {
  try {
    const cid=req.user?.clinique_id; const pid=req.user?.patient_id;
    let sql='SELECT * FROM factures WHERE 1=1'; const p=[];
    if (cid) { p.push(cid); sql+=` AND clinique_id=$${p.length}`; }
    if (pid&&!cid) { p.push(pid); sql+=` AND patient_id=$${p.length}`; }
    sql+=' ORDER BY created_at DESC LIMIT 100';
    const r=await db(sql,p); res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.get('/api/factures/clinique', auth, async (req, res) => {
  try {
    const cid=req.user?.clinique_id;
    const r=cid ? await db('SELECT * FROM factures WHERE clinique_id=$1 ORDER BY created_at DESC LIMIT 100',[cid]) : await db('SELECT * FROM factures ORDER BY created_at DESC LIMIT 100');
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.post('/api/factures', auth, async (req, res) => {
  const { patient_nom, patient_id, montant, mode_paiement, statut, assurance, notes } = req.body;
  try {
    const ref='FAC-'+Date.now().toString(36).toUpperCase();
    const r=await db('INSERT INTO factures (id,reference,clinique_id,patient_id,patient_nom,montant,mode_paiement,statut,assurance,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
      [uuid(),ref,req.user?.clinique_id,patient_id||null,patient_nom||null,montant||0,mode_paiement||'Espèces',statut||'en_attente',assurance||null,notes||null]);
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.put('/api/factures/:id', auth, async (req, res) => {
  const { statut, mode_paiement } = req.body;
  try {
    const r=await db('UPDATE factures SET statut=COALESCE($1,statut),mode_paiement=COALESCE($2,mode_paiement),updated_at=NOW() WHERE id=$3 RETURNING *',[statut,mode_paiement,req.params.id]);
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ── ASSURANCE DOSSIERS ────────────────────────────────────────────
app.get('/api/assurance/dossiers', auth, async (req, res) => {
  try {
    const cid=req.user?.clinique_id;
    const r=cid ? await db('SELECT * FROM dossiers_assurance WHERE clinique_id=$1 ORDER BY created_at DESC LIMIT 100',[cid]) : await db('SELECT * FROM dossiers_assurance ORDER BY created_at DESC LIMIT 100');
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.post('/api/assurance/dossiers', auth, async (req, res) => {
  const { patient_nom, patient_id, compagnie, numero_police, montant_total, montant_assur, ticket_moder, taux_couverture, diagnostic } = req.body;
  try {
    const ref='ASS-'+Date.now().toString(36).toUpperCase();
    const r=await db('INSERT INTO dossiers_assurance (id,reference,clinique_id,patient_id,patient_nom,compagnie,numero_police,montant_total,montant_assur,ticket_moder,taux_couverture,diagnostic) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *',
      [uuid(),ref,req.user?.clinique_id,patient_id||null,patient_nom||null,compagnie,numero_police,montant_total||0,montant_assur||0,ticket_moder||0,taux_couverture||80,diagnostic||null]);
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ── CAISSE SESSIONS ───────────────────────────────────────────────
app.get('/api/caisse/sessions/active', auth, async (req, res) => {
  try {
    const cid=req.user?.clinique_id; if(!cid) return res.json({ success:true, data:null });
    const r=await db("SELECT * FROM caisse_sessions WHERE clinique_id=$1 AND statut='ouverte' LIMIT 1",[cid]);
    res.json({ success:true, data:r.rows[0]||null });
  } catch(e) { res.json({ success:true, data:null }); }
});
app.post('/api/caisse/sessions/ouvrir', auth, async (req, res) => {
  const cid=req.user?.clinique_id; if(!cid) return res.status(400).json({ success:false, message:'Clinique id manquant' });
  try {
    const active=await db("SELECT id FROM caisse_sessions WHERE clinique_id=$1 AND statut='ouverte' LIMIT 1",[cid]);
    if (active.rows.length) return res.status(400).json({ success:false, message:'Une session est déjà ouverte' });
    const r=await db("INSERT INTO caisse_sessions (id,clinique_id,statut,opened_at) VALUES ($1,$2,'ouverte',NOW()) RETURNING *",[uuid(),cid]);
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.post('/api/caisse/sessions/fermer', auth, async (req, res) => {
  const cid=req.user?.clinique_id;
  try {
    const r=await db("UPDATE caisse_sessions SET statut='fermee', closed_at=NOW() WHERE clinique_id=$1 AND statut='ouverte' RETURNING *",[cid]);
    res.json({ success:true, data:r.rows[0]||null });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ── STATS MINISTÈRE (ADMINS OU ROLES MINISTÈRE) ─────────────────────
app.get('/api/ministere/stats-globales', auth, can('admin'), async (req, res) => {
  try {
    const [c,m,p,v] = await Promise.all([
      db('SELECT COUNT(*) c FROM cliniques'), db('SELECT COUNT(*) c FROM medecins'),
      db('SELECT COUNT(*) c FROM patients'), db('SELECT COUNT(*) c FROM rendez_vous')
    ]);
    res.json({ success:true, data:{ cliniques:parseInt(c.rows[0].c), medecins:parseInt(m.rows[0].c), patients:parseInt(p.rows[0].c), consultations:parseInt(v.rows[0].c) } });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.get('/api/ministere/demographie', auth, can('admin'), async (req, res) => {
  try {
    const a = req.query.annee || new Date().getFullYear();
    const r = await db(`
      SELECT 
        CASE WHEN age_patient < 15 THEN '0-14 ans' WHEN age_patient < 40 THEN '15-39 ans' WHEN age_patient < 60 THEN '40-59 ans' ELSE '60 ans et +' END AS tranche_age,
        COUNT(*) AS total, COUNT(CASE WHEN sexe_patient='Masculin' THEN 1 END) AS hommes, COUNT(CASE Harrison WHEN 'Féminin' THEN 1 END) AS femmes
      FROM consultations WHERE EXTRACT(YEAR FROM created_at)=$1 AND age_patient IS NOT NULL GROUP BY tranche_age ORDER BY MIN(age_patient)
    `, [a]);
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.get('/api/ministere/geo-morbidite', auth, can('admin'), async (req, res) => {
  try {
    const a = req.query.annee || new Date().getFullYear();
    const r = await db(`
      SELECT COALESCE(c.ville, cl.ville, 'Non précisé') AS ville, COUNT(*) AS cas, COUNT(DISTINCT c.patient_id) AS patients
      FROM consultations c LEFT JOIN cliniques cl ON cl.id=c.clinique_id WHERE EXTRACT(YEAR FROM c.created_at)=$1 AND COALESCE(c.ville, cl.ville) IS NOT NULL GROUP BY ville ORDER BY cas DESC LIMIT 15
    `, [a]);
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});

// ── GESTIONNAIRE DE ROUTE INTROUVABLE EN DERNIER ──────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route introuvable: ${req.method} ${req.url}` });
});

// ── INITIALISATION DU SERVEUR ──────────────────────────────────────
const PORT = process.env.PORT || 5001;
initTables().then(() => {
  if (!process.env.VERCEL) {
    app.listen(PORT, () => console.log(`[SERVEUR] Actif sur le port ${PORT}`));
  }
});

module.exports = app;