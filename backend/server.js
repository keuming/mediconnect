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
const can = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ success:false, message:'Non authentifié' });
  if (!roles.includes(req.user.role)) return res.status(403).json({ success:false, message:'Accès refusé' });
  next();
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
  ];
  for (const sql of tables) {
    await db(sql).catch(e => console.error('[INIT TABLE]', e.message));
  }
  // Ajouter colonnes manquantes si la table existe déjà (migration douce)
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
    // Rendre patient_id nullable (ancienne contrainte NOT NULL)
    "ALTER TABLE rendez_vous ALTER COLUMN patient_id DROP NOT NULL",
    "UPDATE cliniques SET is_active=true WHERE is_active IS NULL",
    "UPDATE utilisateurs SET is_active=true WHERE is_active IS NULL",
    "ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS pays_code VARCHAR(5) DEFAULT 'CI'",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS sexe VARCHAR(10)",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS date_naissance DATE",
    "ALTER TABLE medecins ADD COLUMN IF NOT EXISTS user_id UUID",
    "ALTER TABLE rendez_vous ALTER COLUMN clinique_id DROP NOT NULL",
  ];
  for (const sql of alterations) {
    await db(sql).catch(() => {});
  }
  console.log('[DB] Tables vérifiées et migrées');
};

// ── App Express ───────────────────────────────────────────────────
const app = express();

// Trust proxy Vercel (obligatoire pour express-rate-limit)
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

// ── AUTH ──────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success:false, message:'Email et mot de passe requis' });
  try {
    const r = await db('SELECT * FROM utilisateurs WHERE email=$1 AND is_active=true LIMIT 1', [email]);
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
  const { email, password, prenom, nom, telephone, ville } = req.body;
  // Normaliser le rôle: medecin_prive → medecin_independant
  let role = req.body.role || 'patient';
  if (role === 'medecin_prive') role = 'medecin_independant';

  if (!email || !password) return res.status(400).json({ success:false, message:'Email et mot de passe requis' });
  if (password.length < 6) return res.status(400).json({ success:false, message:'Mot de passe minimum 6 caractères' });
  try {
    const exists = await db('SELECT id FROM utilisateurs WHERE email=$1', [email]);
    if (exists.rows.length) return res.status(409).json({ success:false, message:'Email déjà utilisé' });
    const hash = await bcrypt.hash(password, 10);
    const id = uuid();
    const r = await db(
      'INSERT INTO utilisateurs (id,email,password,prenom,nom,role,telephone,ville) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [id, email, hash, prenom||'', nom||'', role, telephone||null, ville||null]
    );
    const token = jwt.sign({ id, role }, JWT_SECRET, { expiresIn:'7d' });
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
app.put('/api/utilisateurs/:id', auth, can('admin'), async (req, res) => {
  try {
    const { is_active, role, prenom, nom, telephone, ville } = req.body;
    const r = await db(
      'UPDATE utilisateurs SET is_active=COALESCE($1,is_active),role=COALESCE($2,role),prenom=COALESCE($3,prenom),nom=COALESCE($4,nom),telephone=COALESCE($5,telephone),ville=COALESCE($6,ville) WHERE id=$7 RETURNING id,email,role,prenom,nom,is_active',
      [is_active??null, role||null, prenom||null, nom||null, telephone||null, ville||null, req.params.id]
    );
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
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

// Route publique médecins (sans auth) — pour le dashboard patient
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

// ── CAISSE ────────────────────────────────────────────────────────
app.get('/api/caisse', auth, async (req, res) => {
  try {
    const cid=req.user?.clinique_id;
    if (!cid) return res.json({ success:true, data:{ statut:'fermee', total_encaisse:0, total_decaisse:0 } });
    const r=await db("SELECT * FROM caisse_sessions WHERE clinique_id=$1 AND date=CURRENT_DATE AND statut='ouverte' ORDER BY opened_at DESC LIMIT 1",[cid]);
    res.json({ success:true, data:r.rows[0]||{ statut:'fermee', total_encaisse:0, total_decaisse:0 } });
  } catch(e) { res.json({ success:true, data:{ statut:'fermee', total_encaisse:0, total_decaisse:0 } }); }
});
app.get('/api/caisse/clinique', auth, async (req, res) => {
  try {
    const cid=req.user?.clinique_id;
    if (!cid) return res.json({ success:true, data:{ statut:'fermee', total_encaisse:0, total_decaisse:0 } });
    const r=await db("SELECT * FROM caisse_sessions WHERE clinique_id=$1 AND date=CURRENT_DATE AND statut='ouverte' LIMIT 1",[cid]);
    res.json({ success:true, data:r.rows[0]||{ statut:'fermee', total_encaisse:0, total_decaisse:0 } });
  } catch(e) { res.json({ success:true, data:{ statut:'fermee', total_encaisse:0, total_decaisse:0 } }); }
});
app.post('/api/caisse/ouvrir', auth, async (req, res) => {
  try {
    const cid=req.user?.clinique_id;
    const r=await db('INSERT INTO caisse_sessions (id,clinique_id) VALUES ($1,$2) RETURNING *',[uuid(),cid]);
    res.status(201).json({ success:true, data:r.rows[0], message:'Caisse ouverte !' });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.post('/api/caisse/encaisser', auth, async (req, res) => {
  const { montant, mode_paiement, patient_nom } = req.body;
  if (!montant||montant<=0) return res.status(400).json({ success:false, message:'Montant invalide' });
  try {
    const cid=req.user?.clinique_id;
    await db("UPDATE caisse_sessions SET total_encaisse=total_encaisse+$1 WHERE clinique_id=$2 AND date=CURRENT_DATE AND statut='ouverte'",[montant,cid]);
    res.json({ success:true, message:`${Number(montant).toLocaleString('fr-CI')} FCFA encaissés` });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.post('/api/caisse/decaisser', auth, async (req, res) => {
  const { montant } = req.body;
  if (!montant||montant<=0) return res.status(400).json({ success:false, message:'Montant invalide' });
  try {
    const cid=req.user?.clinique_id;
    await db("UPDATE caisse_sessions SET total_decaisse=total_decaisse+$1 WHERE clinique_id=$2 AND date=CURRENT_DATE AND statut='ouverte'",[montant,cid]);
    res.json({ success:true, message:'Décaissement enregistré' });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.post('/api/caisse/cloturer', auth, async (req, res) => {
  try {
    const cid=req.user?.clinique_id;
    const r=await db("UPDATE caisse_sessions SET statut='fermee',closed_at=NOW() WHERE clinique_id=$1 AND date=CURRENT_DATE AND statut='ouverte' RETURNING *",[cid]);
    res.json({ success:true, data:r.rows[0], message:'Caisse clôturée' });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// Route factures patient (les deux types)
app.get('/api/factures/patient', auth, async (req, res) => {
  try {
    const pid = req.user?.patient_id || req.user?.id;
    const r = await db(
      'SELECT * FROM factures WHERE patient_id=$1 ORDER BY created_at DESC LIMIT 50',
      [pid]
    );
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});

// ── ASSURANCES ────────────────────────────────────────────────────
app.get('/api/assurances', auth, async (req, res) => {
  try {
    const cid=req.user?.clinique_id;
    const r=cid ? await db('SELECT * FROM dossiers_assurance WHERE clinique_id=$1 ORDER BY created_at DESC',[cid]) : await db('SELECT * FROM dossiers_assurance ORDER BY created_at DESC');
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.post('/api/assurances', auth, async (req, res) => {
  const { patient_nom, patient_id, compagnie, numero_police, montant_total, montant_assur, ticket_moder, taux_couverture, diagnostic } = req.body;
  if (!patient_nom||!compagnie) return res.status(400).json({ success:false, message:'Patient et compagnie requis' });
  try {
    const ref='ASS-'+Date.now().toString(36).toUpperCase();
    const r=await db('INSERT INTO dossiers_assurance (id,reference,clinique_id,patient_id,patient_nom,compagnie,numero_police,montant_total,montant_assur,ticket_moder,taux_couverture,diagnostic) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *',
      [uuid(),ref,req.user?.clinique_id,patient_id||null,patient_nom,compagnie,numero_police||null,montant_total||0,montant_assur||0,ticket_moder||0,taux_couverture||80,diagnostic||null]);
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.put('/api/assurances/:id', auth, async (req, res) => {
  const { statut, motif_rejet } = req.body;
  try {
    const r=await db('UPDATE dossiers_assurance SET statut=COALESCE($1,statut),motif_rejet=COALESCE($2,motif_rejet),updated_at=NOW() WHERE id=$3 RETURNING *',[statut,motif_rejet||null,req.params.id]);
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

app.put('/api/assurances/:id/valider', auth, async (req, res) => {
  try {
    const r = await db("UPDATE dossiers_assurance SET statut='valide',updated_at=NOW() WHERE id=$1 RETURNING *", [req.params.id]);
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.put('/api/assurances/:id/rejeter', auth, async (req, res) => {
  const { motif_rejet } = req.body;
  try {
    const r = await db("UPDATE dossiers_assurance SET statut='rejete',motif_rejet=$1,updated_at=NOW() WHERE id=$2 RETURNING *",
      [motif_rejet||'Dossier incomplet', req.params.id]);
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.delete('/api/assurances/:id', auth, async (req, res) => {
  try { await db('DELETE FROM dossiers_assurance WHERE id=$1',[req.params.id]); res.json({ success:true }); }
  catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ── COMMANDES (livraison) ─────────────────────────────────────────
app.get('/api/commandes', auth, async (req, res) => {
  try {
    const r=await db('SELECT * FROM commandes ORDER BY created_at DESC LIMIT 200');
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.post('/api/commandes', auth, async (req, res) => {
  const { adresse_livraison, nombre_articles, frais_livraison } = req.body;
  try {
    const r=await db('INSERT INTO commandes (id,patient_id,adresse_livraison,nombre_articles,frais_livraison) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [uuid(),req.user?.patient_id,adresse_livraison||null,nombre_articles||1,frais_livraison||1500]);
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.put('/api/commandes/:id', auth, async (req, res) => {
  const { statut, livreur_id } = req.body;
  try {
    const r=await db('UPDATE commandes SET statut=COALESCE($1,statut),livreur_id=COALESCE($2,livreur_id),updated_at=NOW() WHERE id=$3 RETURNING *',[statut,livreur_id||null,req.params.id]);
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ── LIVREURS position ─────────────────────────────────────────────
app.put('/api/livreurs/position', auth, async (req, res) => {
  res.json({ success:true, message:'Position enregistrée' });
});

// ── PUBLIC RDV (sans auth) ────────────────────────────────────────
app.get('/api/public/cliniques', async (req, res) => {
  try { const r=await db('SELECT * FROM cliniques WHERE is_active=true ORDER BY nom'); res.json({ success:true, data:r.rows }); }
  catch(e) { res.json({ success:true, data:[] }); }
});
app.get('/api/public/medecins/:id/disponibilites', async (req, res) => {
  res.json({ success:true, data:[] });
});
app.post('/api/public/rdv', async (req, res) => {
  const { patient_nom, patient_telephone, clinique_id, medecin_id, date_rdv, heure_rdv, motif } = req.body;
  if (!date_rdv||!heure_rdv) return res.status(400).json({ success:false, message:'Date et heure requises' });
  try {
    const ref='MC-RDV-'+Math.random().toString(36).slice(2,8).toUpperCase();
    const r=await db('INSERT INTO rendez_vous (id,reference,clinique_id,medecin_id,patient_nom,date_rdv,heure_rdv,motif,source) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [uuid(),ref,clinique_id||null,medecin_id||null,patient_nom||null,date_rdv,heure_rdv,motif||null,'public_rdv']);
    res.status(201).json({ success:true, data:{ reference:ref, rdv_id:r.rows[0].id }, message:'RDV confirmé !' });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});


// ── PHARMACIE ─────────────────────────────────────────────────────
// Commandes avec ordonnance disponibles pour la pharmacie
app.get('/api/pharmacie/commandes', auth, can('pharmacie','admin'), async (req, res) => {
  try {
    const r = await db("SELECT c.*,u.prenom||' '||u.nom AS patient_nom,u.telephone AS patient_tel FROM commandes c LEFT JOIN utilisateurs u ON u.id=c.patient_id ORDER BY c.created_at DESC LIMIT 100");
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.put('/api/pharmacie/commandes/:id', auth, can('pharmacie','admin'), async (req, res) => {
  const { statut, notes } = req.body;
  try {
    const r = await db("UPDATE commandes SET statut=COALESCE($1,statut),updated_at=NOW() WHERE id=$2 RETURNING *", [statut, req.params.id]);
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.get('/api/pharmacie/stock', auth, can('pharmacie','admin'), async (req, res) => {
  try {
    const pid = req.user?.id;
    const r = await db('SELECT * FROM stock WHERE user_id=$1 OR clinique_id IS NULL ORDER BY nom', [pid]);
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});


// ── BULLETINS (Imagerie + Laboratoire) ───────────────────────────
// Table créée dynamiquement
db(`CREATE TABLE IF NOT EXISTS bulletins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(30) NOT NULL,
  categorie VARCHAR(30) DEFAULT 'imagerie',
  patient_nom VARCHAR(200),
  patient_id UUID,
  emetteur_nom VARCHAR(200),
  emetteur_type VARCHAR(50),
  clinique_id UUID,
  fichier_nom VARCHAR(300),
  rapport TEXT,
  notes TEXT,
  statut VARCHAR(20) DEFAULT 'nouveau',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)`).catch(()=>{});

app.get('/api/bulletins', auth, async (req, res) => {
  try {
    const { categorie, statut } = req.query;
    const role = req.user?.role;
    let sql = 'SELECT * FROM bulletins WHERE 1=1'; const p = [];
    if (categorie) { p.push(categorie); sql+=` AND categorie=$${p.length}`; }
    if (statut)    { p.push(statut);    sql+=` AND statut=$${p.length}`; }
    if (req.user?.clinique_id) { p.push(req.user.clinique_id); sql+=` AND clinique_id=$${p.length}`; }
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
      [type, categorie||'imagerie', patient_nom||null, patient_id||null, emetteur_nom||null, req.user?.clinique_id||null, fichier_nom||null, rapport||null, notes||null]
    );
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.put('/api/bulletins/:id', auth, async (req, res) => {
  const { statut, rapport, notes } = req.body;
  try {
    const r = await db('UPDATE bulletins SET statut=COALESCE($1,statut),rapport=COALESCE($2,rapport),notes=COALESCE($3,notes),updated_at=NOW() WHERE id=$4 RETURNING *',
      [statut, rapport||null, notes||null, req.params.id]);
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});


// Vérification table disponibilites
db(`CREATE TABLE IF NOT EXISTS disponibilites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medecin_id UUID NOT NULL, clinique_id UUID, date DATE NOT NULL,
  heure_debut TIME NOT NULL, heure_fin TIME NOT NULL,
  statut VARCHAR(20) DEFAULT 'disponible', recurrent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
)`).catch(()=>{});

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
    const r = await db('INSERT INTO disponibilites (id,medecin_id,clinique_id,date,heure_debut,heure_fin,recurrent) VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6) RETURNING *',
      [mid, clinique_id||null, date, heure_debut, heure_fin, recurrent||false]);
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.delete('/api/planning/disponibilites/:id', auth, async (req, res) => {
  try { await db('DELETE FROM disponibilites WHERE id=$1', [req.params.id]); res.json({ success:true }); }
  catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.get('/api/planning/mes-patients', auth, async (req, res) => {
  try {
    const mid = req.user?.medecin_id || req.user?.id;
    const r = await db("SELECT DISTINCT p.* FROM patients p WHERE p.id IN (SELECT DISTINCT c.patient_id FROM consultations c WHERE c.medecin_id=$1 UNION SELECT DISTINCT r.patient_id FROM rendez_vous r WHERE r.medecin_id=$1 AND r.patient_id IS NOT NULL) ORDER BY p.nom,p.prenom", [mid]);
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.get('/api/planning/stats', auth, async (req, res) => {
  try {
    const mid = req.user?.medecin_id || req.user?.id;
    const today = new Date().toISOString().split('T')[0];
    const [rdvJ, rdvM, cons, dispo] = await Promise.all([
      db("SELECT COUNT(*) c FROM rendez_vous WHERE medecin_id=$1 AND date_rdv=$2 AND statut NOT IN ('annule')", [mid,today]).catch(()=>({rows:[{c:0}]})),
      db("SELECT COUNT(*) c FROM rendez_vous WHERE medecin_id=$1 AND date_rdv>=date_trunc('month',CURRENT_DATE) AND statut NOT IN ('annule')", [mid]).catch(()=>({rows:[{c:0}]})),
      db("SELECT COUNT(*) c FROM consultations WHERE medecin_id=$1", [mid]).catch(()=>({rows:[{c:0}]})),
      db("SELECT COUNT(*) c FROM disponibilites WHERE medecin_id=$1 AND statut='disponible' AND date>=CURRENT_DATE", [mid]).catch(()=>({rows:[{c:0}]})),
    ]);
    res.json({ success:true, data:{ rdv_aujourd_hui:rdvJ.rows[0]?.c||0, rdv_ce_mois:rdvM.rows[0]?.c||0, consultations_total:cons.rows[0]?.c||0, creneaux_disponibles:dispo.rows[0]?.c||0 }});
  } catch(e) { res.json({ success:true, data:{rdv_aujourd_hui:0,rdv_ce_mois:0,consultations_total:0,creneaux_disponibles:0} }); }
});
app.get('/api/planning/rdvs', auth, async (req, res) => {
  try {
    const { date } = req.query;
    const mid = req.user?.medecin_id || req.user?.id;
    let sql='SELECT * FROM rendez_vous WHERE medecin_id=$1'; const p=[mid];
    if (date) { p.push(date); sql+=` AND date_rdv=$${p.length}`; }
    sql+=' ORDER BY date_rdv,heure_rdv LIMIT 100';
    const r=await db(sql,p); res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.post('/api/consultations/depuis-rdv', auth, async (req, res) => {
  const { rdv_id, patient_id, diagnostic, traitement, notes, tension_arterielle, temperature, poids, taille, ordonnance } = req.body;
  if (!diagnostic) return res.status(400).json({ success:false, message:'Diagnostic requis' });
  const mid = req.user?.medecin_id || req.user?.id;
  try {
    const cons = await db('INSERT INTO consultations (id,patient_id,medecin_id,rdv_id,diagnostic,traitement,notes,tension_arterielle,temperature,poids,taille) VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
      [patient_id||null, mid, rdv_id||null, diagnostic, traitement||null, notes||null, tension_arterielle||null, temperature||null, poids||null, taille||null]);
    if (ordonnance?.medicaments) {
      await db('INSERT INTO ordonnances (id,patient_id,medecin_id,consultation_id,medicaments,posologie,duree,notes_ord) VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7)',
        [patient_id||null, mid, cons.rows[0].id, ordonnance.medicaments, ordonnance.posologie||null, ordonnance.duree||null, ordonnance.notes||null]).catch(()=>{});
    }
    if (rdv_id) await db("UPDATE rendez_vous SET statut='termine' WHERE id=$1", [rdv_id]).catch(()=>{});
    res.status(201).json({ success:true, data:cons.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.get('/api/planning/mes-cliniques', auth, async (req, res) => {
  try {
    const mid = req.user?.medecin_id || req.user?.id;
    const r = await db('SELECT c.* FROM cliniques c JOIN medecins m ON m.clinique_id=c.id WHERE m.id=$1 OR m.user_id=$2', [mid,req.user?.id]).catch(async()=>await db('SELECT * FROM cliniques LIMIT 10'));
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
// ── ERREURS ───────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status||500).json({ success:false, message:isProd&&err.status>=500?'Erreur interne':err.message });
});
app.use((req, res) => {
  res.status(404).json({ success:false, message:`Route introuvable: ${req.method} ${req.originalUrl}` });
});

// ── DÉMARRAGE ─────────────────────────────────────────────────────
initTables().catch(console.error);

if (!process.env.VERCEL) {
  const PORT = parseInt(process.env.PORT||'5000', 10);
  app.listen(PORT, () => console.log(`\n🚀 MediConnect — http://localhost:${PORT}/api/health`));
}

module.exports = app;
