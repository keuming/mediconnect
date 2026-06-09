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
    // clinique_id dans le token OU user.id si le compte EST la clinique
    const cid = req.user?.clinique_id || (req.user?.role === 'clinique' ? req.user?.id : null);
    if (!cid) return res.json({ success:true, data:{ medecins_actifs:0, rdv_ce_mois:0, patients_mois:0, rdv_aujourd_hui:0 } });

    const today = new Date().toISOString().split('T')[0];

    // Chercher aussi dans cliniques par user_id
    const clRow = await db('SELECT id FROM cliniques WHERE user_id=$1 OR id=$1 LIMIT 1', [cid]).catch(()=>({rows:[]}));
    const effectiveCid = clRow.rows[0]?.id || cid;

    const [m, r, p, rj] = await Promise.all([
      db("SELECT COUNT(*) c FROM medecins WHERE clinique_id=$1 AND statut='Disponible'", [effectiveCid]).catch(()=>({rows:[{c:0}]})),
      db(`SELECT COUNT(*) c FROM rendez_vous WHERE (clinique_id=$1) AND date_rdv>=date_trunc('month',CURRENT_DATE) AND statut NOT IN ('annule')`, [effectiveCid]).catch(()=>({rows:[{c:0}]})),
      db("SELECT COUNT(*) c FROM patients WHERE clinique_id=$1 AND created_at>=date_trunc('month',CURRENT_DATE)", [effectiveCid]).catch(()=>({rows:[{c:0}]})),
      db(`SELECT COUNT(*) c FROM rendez_vous WHERE (clinique_id=$1) AND date_rdv=$2 AND statut NOT IN ('annule')`, [effectiveCid, today]).catch(()=>({rows:[{c:0}]})),
    ]);
    res.json({ success:true, data:{
      medecins_actifs: +m.rows[0]?.c||0,
      rdv_ce_mois:     +r.rows[0]?.c||0,
      patients_mois:   +p.rows[0]?.c||0,
      rdv_aujourd_hui: +rj.rows[0]?.c||0,
    }});
  } catch(e) { res.json({ success:true, data:{ medecins_actifs:0, rdv_ce_mois:0, patients_mois:0, rdv_aujourd_hui:0 } }); }
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
// GET /api/patients/rdvs — RDV du patient connecté
app.get('/api/patients/rdvs', auth, async (req, res) => {
  try {
    const { statut, upcoming } = req.query;
    const pRow = await db('SELECT id FROM patients WHERE user_id=$1 LIMIT 1', [req.user.id]).catch(()=>({rows:[]}));
    const patientId = pRow.rows[0]?.id;
    if (!patientId) return res.json({ success:true, data:[] });
    let sql = `
      SELECT r.*,
             m.prenom||' '||m.nom AS medecin_nom_complet,
             m.specialite AS medecin_specialite,
             cl.nom AS clinique_nom, cl.adresse AS clinique_adresse, cl.telephone AS clinique_tel
      FROM rendez_vous r
      LEFT JOIN medecins m ON m.id=r.medecin_id
      LEFT JOIN cliniques cl ON cl.id=r.clinique_id
      WHERE r.patient_id=$1
    `;
    const p = [patientId];
    if (statut) { p.push(statut); sql += ` AND r.statut=$${p.length}`; }
    if (upcoming === '1') sql += ` AND r.date_rdv >= CURRENT_DATE`;
    sql += ' ORDER BY r.date_rdv DESC, r.heure_rdv DESC LIMIT 100';
    const r = await db(sql, p);
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});


app.get('/api/patients/me', auth, async (req, res) => {
  try {
    const r = await db('SELECT * FROM patients WHERE user_id=$1 LIMIT 1', [req.user.id]);
    res.json({ success:true, data:r.rows[0]||null });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
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
    const role = req.user?.role;
    const uid  = req.user?.id;
    const cid  = req.user?.clinique_id;

    let sql = `
      SELECT r.*,
             u.prenom||' '||u.nom AS patient_nom_complet,
             u.telephone AS patient_tel,
             m.prenom||' '||m.nom AS medecin_nom_complet,
             m.specialite AS medecin_specialite,
             cl.nom AS clinique_nom
      FROM rendez_vous r
      LEFT JOIN utilisateurs u ON u.id=r.patient_id
      LEFT JOIN medecins m ON m.id=r.medecin_id
      LEFT JOIN cliniques cl ON cl.id=r.clinique_id
      WHERE 1=1
    `;
    const p = [];

    // Filtrage selon le rôle
    if (role === 'clinique') {
      // clinique_id du token OU user.id si le compte EST la clinique
      const effectiveCid = cid || uid;
      // Chercher aussi via table cliniques (user_id)
      const clRow = await db('SELECT id FROM cliniques WHERE user_id=$1 OR id=$1 LIMIT 1', [effectiveCid]).catch(()=>({rows:[]}));
      const realCid = clRow.rows[0]?.id || effectiveCid;
      p.push(realCid);
      sql += ` AND (r.clinique_id=$${p.length} OR m.clinique_id=$${p.length})`;
    } else if (role === 'medecin' || role === 'medecin_independant') {
      // Médecin : voit ses propres RDV
      p.push(uid);
      sql += ` AND r.medecin_id=$${p.length}`;
    } else if (role === 'patient') {
      const pRow = await db('SELECT id FROM patients WHERE user_id=$1 LIMIT 1', [uid]).catch(()=>({rows:[]}));
      const patId = pRow.rows[0]?.id;
      if (!patId) return res.json({ success:true, data:[] });
      p.push(patId);
      sql += ` AND r.patient_id=${p.length}`;
    }
    // admin voit tout

    if (date)       { p.push(date);       sql += ` AND r.date_rdv=$${p.length}`; }
    if (statut)     { p.push(statut);     sql += ` AND r.statut=$${p.length}`; }
    if (medecin_id) { p.push(medecin_id); sql += ` AND r.medecin_id=$${p.length}`; }

    sql += ' ORDER BY r.date_rdv, r.heure_rdv LIMIT 200';
    const r = await db(sql, p);
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.post('/api/rendez-vous', auth, async (req, res) => {
  const { patient_nom, patient_id, medecin_nom, medecin_id, clinique_id, date_rdv, heure_rdv, motif, statut, assurance, notes, source } = req.body;
  if (!date_rdv||!heure_rdv) return res.status(400).json({ success:false, message:'Date et heure requises' });
  try {
    const ref = 'RDV-'+Date.now().toString(36).toUpperCase();
    // patient_id : résoudre depuis table patients via user_id
    let finalPatientId = patient_id || null;
    if (!finalPatientId && req.user?.role === 'patient') {
      const pRow = await db('SELECT id FROM patients WHERE user_id=$1 LIMIT 1', [req.user.id]).catch(()=>({rows:[]}));
      finalPatientId = pRow.rows[0]?.id || null;
    }
    // clinique_id : priorité au body → token → user.id si rôle clinique
    let finalCliniqueId = clinique_id || req.user?.clinique_id || null;
    if (!finalCliniqueId && req.user?.role === 'clinique') {
      // Chercher l'id réel dans la table cliniques
      const clRow = await db('SELECT id FROM cliniques WHERE user_id=$1 LIMIT 1', [req.user.id]).catch(()=>({rows:[]}));
      finalCliniqueId = clRow.rows[0]?.id || req.user.id;
    }

    // Récupérer le nom du patient si non fourni
    let finalPatientNom = patient_nom;
    if (!finalPatientNom && finalPatientId) {
      const u = await db('SELECT prenom, nom FROM utilisateurs WHERE id=$1', [finalPatientId]);
      if (u.rows[0]) finalPatientNom = `${u.rows[0].prenom||''} ${u.rows[0].nom||''}`.trim();
    }

    // Déterminer si medecin_id est un utilisateur indépendant
    let finalMedecinId = medecin_id || null;
    let finalMedecinIndepId = null;
    if (medecin_id) {
      const roleCheck = await db('SELECT role FROM utilisateurs WHERE id=$1', [medecin_id]).catch(()=>({rows:[]}));
      if (roleCheck.rows[0]?.role === 'medecin_independant') {
        // Résoudre le vrai id dans medecins_independants
        const miRow = await db('SELECT id FROM medecins_independants WHERE user_id=$1 LIMIT 1', [medecin_id]).catch(()=>({rows:[]}));
        finalMedecinIndepId = miRow.rows[0]?.id || null;
        finalMedecinId = null; // pas dans table medecins
      }
    }

    const r = await db(
      'INSERT INTO rendez_vous (id,reference,clinique_id,patient_id,patient_nom,medecin_id,medecin_independant_id,medecin_nom,date_rdv,heure_rdv,motif,statut,assurance,notes,source) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *',
      [uuid(), ref, finalCliniqueId, finalPatientId, finalPatientNom||null, finalMedecinId, finalMedecinIndepId, medecin_nom||null, date_rdv, heure_rdv, motif||null, statut||'en_attente', assurance||null, notes||null, source||'dashboard']
    );
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
// GET /api/public/medecins/:id/disponibilites — créneaux disponibles réels
app.get('/api/public/medecins/:id/disponibilites', async (req, res) => {
  try {
    const { date_debut, date_fin } = req.query;
    const debut = date_debut || new Date().toISOString().split('T')[0];
    const fin   = date_fin   || new Date(Date.now()+14*24*3600*1000).toISOString().split('T')[0];
    const r = await db(`
      SELECT d.*, m.prenom||' '||m.nom AS medecin_nom, m.specialite, m.tarif
      FROM disponibilites d
      LEFT JOIN medecins m ON m.id=d.medecin_id
      WHERE d.medecin_id=$1 AND d.statut='disponible'
        AND d.date >= $2 AND d.date <= $3
      ORDER BY d.date, d.heure_debut
    `, [req.params.id, debut, fin]);
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});

// GET /api/public/cliniques/:id/medecins — médecins d'une clinique
app.get('/api/public/cliniques/:id/medecins', async (req, res) => {
  try {
    const r = await db(`
      SELECT m.*,
        (SELECT COUNT(*) FROM disponibilites d
         WHERE d.medecin_id=m.id AND d.statut='disponible' AND d.date>=CURRENT_DATE) AS creneaux_dispo
      FROM medecins m WHERE m.clinique_id=$1 AND m.statut='Disponible'
      ORDER BY m.specialite, m.nom
    `, [req.params.id]);
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});

// GET /api/public/medecins-independants — médecins conseils publics
app.get('/api/public/medecins-independants', async (req, res) => {
  try {
    const { specialite } = req.query;
    let sql = `
      SELECT u.id, u.prenom, u.nom, u.telephone, u.ville, u.pays_code,
             mi.specialite, mi.tarif_consultation, mi.experience_ans, mi.bio, mi.note_moyenne,
             (SELECT COUNT(*) FROM disponibilites d
              WHERE d.medecin_id=u.id AND d.statut='disponible' AND d.date>=CURRENT_DATE) AS creneaux_dispo
      FROM utilisateurs u
      LEFT JOIN medecins_independants mi ON mi.user_id=u.id
      WHERE u.role='medecin_independant' AND u.is_active=true
    `;
    const p = [];
    if (specialite) { p.push(specialite); sql += ` AND mi.specialite=$${p.length}`; }
    sql += ' ORDER BY mi.note_moyenne DESC NULLS LAST, u.nom';
    const r = await db(sql, p);
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});

// POST /api/patients/rdv — Patient prend un RDV (authentifié)
app.post('/api/patients/rdv', auth, async (req, res) => {
  const { medecin_id, clinique_id, disponibilite_id, date_rdv, heure_rdv, motif, type_rdv } = req.body;
  if (!date_rdv || !heure_rdv) return res.status(400).json({ success:false, message:'Date et heure requises' });
  try {
    // Récupérer infos patient
    const userRow = await db('SELECT prenom, nom, telephone FROM utilisateurs WHERE id=$1', [req.user.id]);
    const u = userRow.rows[0] || {};
    const patient_nom = `${u.prenom||''} ${u.nom||''}`.trim() || 'Patient';

    // Récupérer nom médecin si fourni
    let medecin_nom = null;
    if (medecin_id) {
      const mRow = await db('SELECT prenom, nom FROM medecins WHERE id=$1', [medecin_id]);
      if (mRow.rows[0]) medecin_nom = `Dr. ${mRow.rows[0].prenom} ${mRow.rows[0].nom}`;
      else {
        // Médecin indépendant
        const uRow = await db('SELECT prenom, nom FROM utilisateurs WHERE id=$1', [medecin_id]);
        if (uRow.rows[0]) medecin_nom = `Dr. ${uRow.rows[0].prenom} ${uRow.rows[0].nom}`;
      }
    }

    const ref = 'MC-RDV-' + Math.random().toString(36).slice(2,8).toUpperCase();
    const r = await db(`
      INSERT INTO rendez_vous
        (id,reference,patient_id,patient_nom,medecin_id,medecin_nom,clinique_id,date_rdv,heure_rdv,motif,statut,source)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'en_attente','patient_app')
      RETURNING *
    `, [uuid(), ref, req.user.id, patient_nom, medecin_id||null, medecin_nom, clinique_id||null, date_rdv, heure_rdv, motif||null]);

    // Marquer la disponibilité comme réservée si fournie
    if (disponibilite_id) {
      await db("UPDATE disponibilites SET statut='reserve' WHERE id=$1", [disponibilite_id]).catch(()=>{});
    }

    res.status(201).json({ success:true, data:{ reference:ref, rdv:r.rows[0] }, message:`RDV confirmé pour le ${date_rdv} à ${heure_rdv}` });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// DELETE /api/patients/rdv/:id — Annuler un RDV
app.delete('/api/patients/rdv/:id', auth, async (req, res) => {
  try {
    const rdv = await db('SELECT * FROM rendez_vous WHERE id=$1 AND patient_id=$2', [req.params.id, req.user.id]);
    if (!rdv.rows.length) return res.status(404).json({ success:false, message:'RDV introuvable' });
    if (rdv.rows[0].statut === 'termine') return res.status(400).json({ success:false, message:'Impossible d annuler un RDV terminé' });
    await db("UPDATE rendez_vous SET statut='annule', updated_at=NOW() WHERE id=$1", [req.params.id]);
    res.json({ success:true, message:'RDV annulé' });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// GET /api/patients/cliniques — Cliniques disponibles pour RDV avec leurs spécialités
app.get('/api/patients/cliniques', auth, async (req, res) => {
  try {
    const { pays_code, ville, specialite } = req.query;
    let sql = `
      SELECT cl.*,
        (SELECT COUNT(*) FROM medecins m WHERE m.clinique_id=cl.id AND m.statut='Disponible') AS nb_medecins,
        (SELECT COUNT(*) FROM disponibilites d
         JOIN medecins m ON m.id=d.medecin_id
         WHERE m.clinique_id=cl.id AND d.statut='disponible' AND d.date>=CURRENT_DATE) AS creneaux_dispo
      FROM cliniques cl
      WHERE cl.is_active IS NOT false
    `;
    const p = [];
    if (pays_code) { p.push(pays_code); sql += ` AND cl.pays_code=$${p.length}`; }
    if (ville)     { p.push(ville);     sql += ` AND cl.ville ILIKE $${p.length}`; }
    sql += ' ORDER BY cl.nom LIMIT 100';
    const r = await db(sql, p);
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
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

// ── ERREURS ───────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status||500).json({ success:false, message:isProd&&err.status>=500?'Erreur interne':err.message });
});


// ════════════════════════════════════════════════════════════════════
// ROUTES MANQUANTES — Planning, Bulletins, Spécialités, Ministère
// ════════════════════════════════════════════════════════════════════

// ── PATIENTS /me ─────────────────────────────────────────────────


// ── LIVREURS commandes ────────────────────────────────────────────
app.get('/api/livreurs/commandes', auth, async (req, res) => {
  try {
    const lid = req.user?.id;
    const r = await db(
      `SELECT c.*, u.prenom||' '||u.nom AS patient_nom, u.telephone AS contact
       FROM commandes c
       LEFT JOIN utilisateurs u ON u.id=c.patient_id
       WHERE (c.livreur_id=$1 OR (c.livreur_id IS NULL AND c.statut='confirmee'))
       ORDER BY c.created_at DESC LIMIT 50`,
      [lid]
    );
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});

// ── PHARMACIE commandes ───────────────────────────────────────────
app.get('/api/pharmacie/commandes', auth, async (req, res) => {
  try {
    const { statut } = req.query;
    let sql = `SELECT c.*, u.prenom||' '||u.nom AS patient_nom, u.telephone AS contact
               FROM commandes c
               LEFT JOIN utilisateurs u ON u.id=c.patient_id
               WHERE 1=1`;
    const p = [];
    if (statut) { p.push(statut); sql += ` AND c.statut=$${p.length}`; }
    sql += ' ORDER BY c.created_at DESC LIMIT 100';
    const r = await db(sql, p);
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});

// ── MÉDECINS (route admin sans filtre) ───────────────────────────
app.get('/api/medecins', auth, async (req, res) => {
  try {
    const cid = req.query.clinique_id || req.user?.clinique_id;
    const r = cid
      ? await db('SELECT * FROM medecins WHERE clinique_id=$1 ORDER BY nom,prenom', [cid])
      : await db('SELECT * FROM medecins ORDER BY nom,prenom LIMIT 200');
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.post('/api/medecins', auth, async (req, res) => {
  const { prenom, nom, specialite, telephone, email, tarif, experience_ans, jours_travail, horaires_debut, horaires_fin } = req.body;
  if (!prenom||!nom||!specialite) return res.status(400).json({ success:false, message:'Prénom, nom et spécialité requis' });
  try {
    const r = await db(
      'INSERT INTO medecins (id,clinique_id,prenom,nom,specialite,telephone,email,tarif,experience_ans,jours_travail,horaires_debut,horaires_fin) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *',
      [uuid(), req.user?.clinique_id, prenom, nom, specialite, telephone||null, email||null, tarif||null, experience_ans||null, jours_travail||'Lun,Mar,Mer,Jeu,Ven', horaires_debut||'08:00', horaires_fin||'17:00']
    );
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.put('/api/medecins/:id', auth, async (req, res) => {
  const { prenom, nom, specialite, statut, tarif, telephone, experience_ans, jours_travail, horaires_debut, horaires_fin } = req.body;
  try {
    const r = await db(
      'UPDATE medecins SET prenom=COALESCE($1,prenom),nom=COALESCE($2,nom),specialite=COALESCE($3,specialite),statut=COALESCE($4,statut),tarif=COALESCE($5,tarif),telephone=COALESCE($6,telephone),experience_ans=COALESCE($7,experience_ans),jours_travail=COALESCE($8,jours_travail),horaires_debut=COALESCE($9,horaires_debut),horaires_fin=COALESCE($10,horaires_fin),updated_at=NOW() WHERE id=$11 RETURNING *',
      [prenom,nom,specialite,statut,tarif,telephone,experience_ans,jours_travail,horaires_debut,horaires_fin,req.params.id]
    );
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.delete('/api/medecins/:id', auth, async (req, res) => {
  try { await db('DELETE FROM medecins WHERE id=$1', [req.params.id]); res.json({ success:true }); }
  catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ── BULLETINS (imagerie + laboratoire) ───────────────────────────
app.get('/api/bulletins', auth, async (req, res) => {
  try {
    const { categorie, statut } = req.query;
    let sql = 'SELECT * FROM bulletins WHERE 1=1'; const p = [];
    if (categorie) { p.push(categorie); sql += ` AND categorie=$${p.length}`; }
    if (statut)    { p.push(statut);    sql += ` AND statut=$${p.length}`; }
    sql += ' ORDER BY created_at DESC LIMIT 100';
    const r = await db(sql, p);
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.post('/api/bulletins', auth, async (req, res) => {
  const { type, categorie, patient_nom, patient_id, emetteur_nom, notes } = req.body;
  if (!type) return res.status(400).json({ success:false, message:'Type requis' });
  try {
    const r = await db(
      'INSERT INTO bulletins (id,type,categorie,patient_nom,patient_id,emetteur_nom,clinique_id,notes) VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [type, categorie||'imagerie', patient_nom||null, patient_id||null, emetteur_nom||null, req.user?.clinique_id||null, notes||null]
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

// ── SPÉCIALITÉS CLINIQUE ──────────────────────────────────────────
app.get('/api/public/cliniques/:id/specialites', async (req, res) => {
  try {
    const r = await db(
      'SELECT * FROM specialites_clinique WHERE clinique_id=$1 AND disponible=true ORDER BY nom',
      [req.params.id]
    );
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.get('/api/public/specialites', async (req, res) => {
  try {
    const r = await db(`
      SELECT s.nom, COUNT(DISTINCT s.clinique_id) AS nb_cliniques,
             json_agg(DISTINCT jsonb_build_object('id',c.id,'nom',c.nom,'ville',c.ville)) FILTER (WHERE c.id IS NOT NULL) AS cliniques
      FROM specialites_clinique s
      LEFT JOIN cliniques c ON c.id=s.clinique_id AND c.is_active IS NOT false
      WHERE s.disponible=true
      GROUP BY s.nom ORDER BY nb_cliniques DESC, s.nom
    `);
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.get('/api/cliniques/specialites', auth, async (req, res) => {
  try {
    const r = await db('SELECT * FROM specialites_clinique WHERE clinique_id=$1 ORDER BY nom', [req.user?.clinique_id]);
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.post('/api/cliniques/specialites', auth, async (req, res) => {
  const { nom, description, tarif_consultation } = req.body;
  if (!nom) return res.status(400).json({ success:false, message:'Nom requis' });
  try {
    const cid = req.user?.clinique_id;
    const exists = await db('SELECT id FROM specialites_clinique WHERE clinique_id=$1 AND nom=$2', [cid, nom]);
    if (exists.rows.length) return res.status(409).json({ success:false, message:'Spécialité déjà existante' });
    const r = await db(
      'INSERT INTO specialites_clinique (id,clinique_id,nom,description,tarif_consultation) VALUES (gen_random_uuid(),$1,$2,$3,$4) RETURNING *',
      [cid, nom, description||null, tarif_consultation||null]
    );
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.put('/api/cliniques/specialites/:id', auth, async (req, res) => {
  const { nom, description, tarif_consultation, disponible } = req.body;
  try {
    const r = await db(
      'UPDATE specialites_clinique SET nom=COALESCE($1,nom),description=COALESCE($2,description),tarif_consultation=COALESCE($3::DECIMAL,tarif_consultation),disponible=COALESCE($4,disponible) WHERE id=$5 AND clinique_id=$6 RETURNING *',
      [nom||null, description||null, tarif_consultation||null, disponible??null, req.params.id, req.user?.clinique_id]
    );
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.delete('/api/cliniques/specialites/:id', auth, async (req, res) => {
  try {
    await db('UPDATE specialites_clinique SET disponible=false WHERE id=$1 AND clinique_id=$2', [req.params.id, req.user?.clinique_id]);
    res.json({ success:true });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ════════════════════════════════════════════════════════════════════
// PLANNING MÉDECIN CONSEIL — Disponibilités & RDVs
// ════════════════════════════════════════════════════════════════════

// GET /api/planning/stats
app.get('/api/planning/stats', auth, async (req, res) => {
  try {
    const uid   = req.user?.id;
    const mid   = req.user?.medecin_id || uid;
    const role  = req.user?.role;
    const today = new Date().toISOString().split('T')[0];

    // Pour médecin indépendant : résoudre le vrai id dans medecins_independants
    let rdvFilter, rdvId, rdvId2;
    if (role === 'medecin_independant') {
      const miRow = await db('SELECT id FROM medecins_independants WHERE user_id=$1 LIMIT 1', [uid]).catch(()=>({rows:[]}));
      const miId = miRow.rows[0]?.id || uid;
      rdvFilter = `(medecin_independant_id=$1 OR medecin_id=$2)`;
      rdvId  = miId;
      rdvId2 = uid;
    } else {
      rdvFilter = `medecin_id=$1`;
      rdvId  = mid || uid;
      rdvId2 = mid || uid;
    }

    const [rdvJ, rdvM, cons, dispo] = await Promise.all([
      db(`SELECT COUNT(*) c FROM rendez_vous WHERE ${rdvFilter} AND date_rdv=$3 AND statut NOT IN ('annule')`, role==='medecin_independant'?[rdvId,rdvId2,today]:[rdvId,today]).catch(()=>({rows:[{c:0}]})),
      db(`SELECT COUNT(*) c FROM rendez_vous WHERE ${rdvFilter} AND date_rdv>=date_trunc('month',CURRENT_DATE) AND statut NOT IN ('annule')`, role==='medecin_independant'?[rdvId,rdvId2]:[rdvId]).catch(()=>({rows:[{c:0}]})),
      db("SELECT COUNT(*) c FROM consultations WHERE medecin_id=$1", [uid]).catch(()=>({rows:[{c:0}]})),
      db("SELECT COUNT(*) c FROM disponibilites WHERE medecin_id=$1 AND statut='disponible' AND date>=CURRENT_DATE", [uid]).catch(()=>({rows:[{c:0}]})),
    ]);
    res.json({ success:true, data:{
      rdv_aujourd_hui:     +rdvJ.rows[0]?.c || 0,
      rdv_ce_mois:         +rdvM.rows[0]?.c || 0,
      consultations_total: +cons.rows[0]?.c || 0,
      creneaux_disponibles:+dispo.rows[0]?.c|| 0,
    }});
  } catch(e) { res.json({ success:true, data:{ rdv_aujourd_hui:0, rdv_ce_mois:0, consultations_total:0, creneaux_disponibles:0 } }); }
});

// GET /api/planning/rdvs
app.get('/api/planning/rdvs', auth, async (req, res) => {
  try {
    const { date, statut } = req.query;
    const uid = req.user?.id;
    const mid = req.user?.medecin_id;
    const role = req.user?.role;

    // Pour médecin indépendant : chercher par user_id OU medecin_id (table medecins)
    // Pour médecin clinique : chercher par medecin_id (table medecins)
    let sql, p;
    if (role === 'medecin_independant') {
      // Résoudre le vrai id dans medecins_independants
      const miRow = await db('SELECT id FROM medecins_independants WHERE user_id=$1 LIMIT 1', [uid]).catch(()=>({rows:[]}));
      const miId = miRow.rows[0]?.id;
      sql = `
        SELECT r.*,
               pat.prenom||' '||pat.nom AS patient_nom_complet,
               pat.telephone AS patient_tel
        FROM rendez_vous r
        LEFT JOIN patients pat ON pat.id=r.patient_id
        WHERE (r.medecin_independant_id=$1 OR r.medecin_id=$2)
      `;
      p = [miId||uid, uid];
    } else {
      // Médecin rattaché clinique
      const effectiveMid = mid || uid;
      sql = `
        SELECT r.*,
               u.prenom||' '||u.nom AS patient_nom_complet,
               u.telephone AS patient_tel
        FROM rendez_vous r
        LEFT JOIN utilisateurs u ON u.id=r.patient_id
        WHERE r.medecin_id=$1
      `;
      p = [effectiveMid];
    }

    if (date)   { p.push(date);   sql += ` AND r.date_rdv=$${p.length}`; }
    if (statut) { p.push(statut); sql += ` AND r.statut=$${p.length}`; }
    sql += ' ORDER BY r.date_rdv, r.heure_rdv LIMIT 100';
    const r = await db(sql, p);
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});

// GET /api/planning/disponibilites
app.get('/api/planning/disponibilites', auth, async (req, res) => {
  try {
    const { mois, annee } = req.query;
    const mid = req.user?.medecin_id || req.user?.id;
    const m = mois  || new Date().getMonth() + 1;
    const a = annee || new Date().getFullYear();
    const r = await db(`
      SELECT d.*, rdv.patient_nom, rdv.motif AS rdv_motif, rdv.statut AS rdv_statut, rdv.id AS rdv_id
      FROM disponibilites d
      LEFT JOIN rendez_vous rdv
        ON rdv.medecin_id=d.medecin_id AND rdv.date_rdv=d.date AND rdv.heure_rdv=d.heure_debut
        AND rdv.statut NOT IN ('annule')
      WHERE d.medecin_id=$1
        AND EXTRACT(MONTH FROM d.date)=$2
        AND EXTRACT(YEAR FROM d.date)=$3
      ORDER BY d.date, d.heure_debut
    `, [mid, m, a]);
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});

// POST /api/planning/disponibilites
app.post('/api/planning/disponibilites', auth, async (req, res) => {
  try {
    const { date, heure_debut, heure_fin, clinique_id, recurrent } = req.body;
    if (!date || !heure_debut || !heure_fin)
      return res.status(400).json({ success:false, message:'date, heure_debut et heure_fin requis' });
    const mid = req.user?.medecin_id || req.user?.id;
    const exists = await db(
      'SELECT id FROM disponibilites WHERE medecin_id=$1 AND date=$2 AND heure_debut=$3',
      [mid, date, heure_debut]
    );
    if (exists.rows.length)
      return res.status(409).json({ success:false, message:'Créneau déjà existant pour ce médecin' });
    const r = await db(
      'INSERT INTO disponibilites (id,medecin_id,clinique_id,date,heure_debut,heure_fin,recurrent) VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6) RETURNING *',
      [mid, clinique_id||null, date, heure_debut, heure_fin, recurrent||false]
    );
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// DELETE /api/planning/disponibilites/:id
app.delete('/api/planning/disponibilites/:id', auth, async (req, res) => {
  try {
    await db('DELETE FROM disponibilites WHERE id=$1', [req.params.id]);
    res.json({ success:true });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// GET /api/planning/mes-patients
app.get('/api/planning/mes-patients', auth, async (req, res) => {
  try {
    const mid = req.user?.medecin_id || req.user?.id;
    const r = await db(`
      SELECT DISTINCT p.*
      FROM patients p
      WHERE p.id IN (
        SELECT DISTINCT c.patient_id FROM consultations c WHERE c.medecin_id=$1 AND c.patient_id IS NOT NULL
        UNION
        SELECT DISTINCT r.patient_id FROM rendez_vous r WHERE r.medecin_id=$1 AND r.patient_id IS NOT NULL
      )
      ORDER BY p.nom, p.prenom
    `, [mid]);
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});

// GET /api/planning/mes-cliniques
app.get('/api/planning/mes-cliniques', auth, async (req, res) => {
  try {
    const r = await db('SELECT id, nom, ville, telephone FROM cliniques WHERE is_active IS NOT false ORDER BY nom LIMIT 20');
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});

// POST /api/consultations/depuis-rdv
app.post('/api/consultations/depuis-rdv', auth, async (req, res) => {
  try {
    const { rdv_id, patient_id, diagnostic, traitement, notes,
            tension_arterielle, temperature, poids, taille,
            pathologie, age_patient, sexe_patient, gravite, ordonnance } = req.body;
    if (!diagnostic) return res.status(400).json({ success:false, message:'Diagnostic requis' });
    const mid = req.user?.medecin_id || req.user?.id;
    const r = await db(
      `INSERT INTO consultations
         (id,patient_id,medecin_id,rdv_id,diagnostic,traitement,notes,
          tension_arterielle,temperature,poids,taille,pathologie,
          age_patient,sexe_patient,gravite,pays_code)
       VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'CI')
       RETURNING *`,
      [patient_id||null, mid, rdv_id||null, diagnostic,
       traitement||null, notes||null, tension_arterielle||null,
       temperature||null, poids||null, taille||null,
       pathologie||null, age_patient||null, sexe_patient||null, gravite||'modere']
    );
    if (ordonnance?.medicaments) {
      await db(
        'INSERT INTO ordonnances (id,patient_id,medecin_id,consultation_id,medicaments,posologie,duree) VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6)',
        [patient_id||null, mid, r.rows[0].id, ordonnance.medicaments, ordonnance.posologie||null, ordonnance.duree||null]
      ).catch(()=>{});
    }
    if (rdv_id) await db("UPDATE rendez_vous SET statut='termine' WHERE id=$1", [rdv_id]).catch(()=>{});
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ════════════════════════════════════════════════════════════════════
// DASHBOARD MINISTÈRE DE LA SANTÉ
// ════════════════════════════════════════════════════════════════════

app.get('/api/ministere/overview', auth, can('admin'), async (req, res) => {
  try {
    const a = req.query.annee || new Date().getFullYear();
    const [totC, totP, totO, totCl] = await Promise.all([
      db(`SELECT COUNT(*) c FROM consultations WHERE EXTRACT(YEAR FROM created_at)=$1`, [a]).catch(()=>({rows:[{c:0}]})),
      db(`SELECT COUNT(DISTINCT patient_id) c FROM consultations WHERE EXTRACT(YEAR FROM created_at)=$1`, [a]).catch(()=>({rows:[{c:0}]})),
      db(`SELECT COUNT(*) c FROM ordonnances WHERE EXTRACT(YEAR FROM created_at)=$1`, [a]).catch(()=>({rows:[{c:0}]})),
      db("SELECT COUNT(*) c FROM cliniques WHERE is_active IS NOT false").catch(()=>({rows:[{c:0}]})),
    ]);
    res.json({ success:true, data:{ total_consultations:+totC.rows[0]?.c||0, patients_uniques:+totP.rows[0]?.c||0, total_ordonnances:+totO.rows[0]?.c||0, cliniques_actives:+totCl.rows[0]?.c||0, annee:a }});
  } catch(e) { res.json({ success:true, data:{} }); }
});

app.get('/api/ministere/pathologies', auth, can('admin'), async (req, res) => {
  try {
    const { annee, mois, top = 20 } = req.query;
    const a = annee || new Date().getFullYear();
    const params = [a];
    let moisFilter = '';
    if (mois) { moisFilter = `AND EXTRACT(MONTH FROM created_at)=$2`; params.push(+mois); }
    params.push(+top);
    const r = await db(`
      SELECT
        COALESCE(NULLIF(TRIM(pathologie),''),
          CASE
            WHEN diagnostic ~* 'paludisme|malaria' THEN 'Paludisme'
            WHEN diagnostic ~* 'hypertension|HTA'  THEN 'Hypertension artérielle'
            WHEN diagnostic ~* 'diabète|diabete'   THEN 'Diabète'
            WHEN diagnostic ~* 'typhoïde|typhoide' THEN 'Fièvre typhoïde'
            WHEN diagnostic ~* 'pneumonie'          THEN 'Pneumonie'
            WHEN diagnostic ~* 'diarrhée|diarrhee' THEN 'Diarrhée'
            WHEN diagnostic ~* 'tuberculose'        THEN 'Tuberculose'
            WHEN diagnostic ~* 'VIH|HIV|SIDA'       THEN 'VIH/SIDA'
            WHEN diagnostic ~* 'hépatite|hepatite' THEN 'Hépatite'
            WHEN diagnostic ~* 'asthme'             THEN 'Asthme'
            WHEN diagnostic ~* 'anémie|anemie'     THEN 'Anémie'
            WHEN diagnostic ~* 'grippe|influenza'   THEN 'Grippe / IRA'
            ELSE TRIM(SPLIT_PART(diagnostic, ',', 1))
          END
        ) AS affection,
        COUNT(*) AS cas,
        COUNT(CASE WHEN sexe_patient='Masculin' THEN 1 END) AS cas_hommes,
        COUNT(CASE WHEN sexe_patient='Féminin'  THEN 1 END) AS cas_femmes,
        ROUND(AVG(age_patient)) AS age_moyen,
        EXTRACT(MONTH FROM created_at) AS mois_num
      FROM consultations
      WHERE EXTRACT(YEAR FROM created_at)=$1
        AND (diagnostic IS NOT NULL AND diagnostic != '')
        ${moisFilter}
      GROUP BY affection, mois_num
      HAVING COALESCE(NULLIF(TRIM(pathologie),''), TRIM(SPLIT_PART(diagnostic,',',1))) IS NOT NULL
      ORDER BY cas DESC
      LIMIT $${params.length}
    `, params);
    res.json({ success:true, data:r.rows });
  } catch(e) {
    console.error('[ministere/pathologies]', e.message);
    res.json({ success:true, data:[] });
  }
});

app.get('/api/ministere/pathologies/evolution', auth, can('admin'), async (req, res) => {
  try {
    const { annee, affection } = req.query;
    const a = annee || new Date().getFullYear();
    const r = await db(`
      SELECT EXTRACT(MONTH FROM created_at) AS mois,
             TO_CHAR(DATE_TRUNC('month',created_at),'Mon YYYY') AS mois_label,
             COUNT(*) AS cas
      FROM consultations
      WHERE EXTRACT(YEAR FROM created_at)=$1
        AND (pathologie=$2 OR diagnostic ILIKE '%'||$2||'%')
      GROUP BY mois, mois_label ORDER BY mois
    `, [a, affection]);
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});

app.get('/api/ministere/medicaments', auth, can('admin'), async (req, res) => {
  try {
    const { annee, mois, top = 20 } = req.query;
    const a = annee || new Date().getFullYear();
    const params = [a];
    let moisFilter = '';
    if (mois) { moisFilter = `AND EXTRACT(MONTH FROM created_at)=$2`; params.push(+mois); }
    params.push(+top);
    // Parsing simplifié : prendre le premier mot de chaque entrée séparée par virgule
    const r = await db(`
      SELECT
        TRIM(LOWER(SPLIT_PART(TRIM(med_item), ' ', 1))) AS medicament,
        COUNT(*) AS prescriptions
      FROM (
        SELECT UNNEST(STRING_TO_ARRAY(medicaments, ',')) AS med_item
        FROM ordonnances
        WHERE EXTRACT(YEAR FROM created_at)=$1
          AND medicaments IS NOT NULL AND medicaments != ''
          ${moisFilter}
      ) sub
      WHERE LENGTH(TRIM(med_item)) > 2
      GROUP BY medicament
      ORDER BY prescriptions DESC
      LIMIT $${params.length}
    `, params);
    res.json({ success:true, data:r.rows });
  } catch(e) {
    console.error('[ministere/medicaments]', e.message);
    res.json({ success:true, data:[] });
  }
});

app.get('/api/ministere/epidemio-mensuelle', auth, can('admin'), async (req, res) => {
  try {
    const a = req.query.annee || new Date().getFullYear();
    const r = await db(`
      SELECT
        EXTRACT(MONTH FROM created_at) AS mois,
        COUNT(*) AS total_consultations,
        COUNT(DISTINCT patient_id) AS patients_uniques,
        COUNT(CASE WHEN gravite='grave' THEN 1 END) AS cas_graves
      FROM consultations
      WHERE EXTRACT(YEAR FROM created_at)=$1
        AND diagnostic IS NOT NULL
      GROUP BY mois ORDER BY mois
    `, [a]);
    const moisFr = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    const result = Array.from({length:12}, (_, i) => {
      const found = r.rows.find(row => +row.mois === i+1);
      return { mois:i+1, mois_label:moisFr[i], total_consultations:+(found?.total_consultations||0), patients_uniques:+(found?.patients_uniques||0), cas_graves:+(found?.cas_graves||0) };
    });
    res.json({ success:true, data:result });
  } catch(e) { res.json({ success:true, data:[] }); }
});

app.get('/api/ministere/demographics', auth, can('admin'), async (req, res) => {
  try {
    const a = req.query.annee || new Date().getFullYear();
    const r = await db(`
      SELECT
        CASE WHEN age_patient < 5 THEN '0-4 ans' WHEN age_patient < 15 THEN '5-14 ans'
             WHEN age_patient < 25 THEN '15-24 ans' WHEN age_patient < 40 THEN '25-39 ans'
             WHEN age_patient < 60 THEN '40-59 ans' ELSE '60 ans et +' END AS tranche_age,
        COUNT(*) AS total,
        COUNT(CASE WHEN sexe_patient='Masculin' THEN 1 END) AS hommes,
        COUNT(CASE WHEN sexe_patient='Féminin' THEN 1 END) AS femmes
      FROM consultations
      WHERE EXTRACT(YEAR FROM created_at)=$1 AND age_patient IS NOT NULL
      GROUP BY tranche_age ORDER BY MIN(age_patient)
    `, [a]);
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});

app.get('/api/ministere/geo-morbidite', auth, can('admin'), async (req, res) => {
  try {
    const a = req.query.annee || new Date().getFullYear();
    const r = await db(`
      SELECT COALESCE(c.ville, cl.ville, 'Non précisé') AS ville,
             COUNT(*) AS cas, COUNT(DISTINCT c.patient_id) AS patients
      FROM consultations c LEFT JOIN cliniques cl ON cl.id=c.clinique_id
      WHERE EXTRACT(YEAR FROM c.created_at)=$1
        AND COALESCE(c.ville, cl.ville) IS NOT NULL
      GROUP BY ville ORDER BY cas DESC LIMIT 15
    `, [a]);
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});

// ══════════════════════════════════════════════════════════════════
// ASSURANCE — offres, souscriptions, tiers-payant
// ══════════════════════════════════════════════════════════════════

const logAudit = async (userId, action, tableName, recordId, changes, req) => {
  try {
    await db(
      `INSERT INTO audit_logs (user_id,action,table_name,record_id,changes,ip_address,user_agent)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [userId||null, action, tableName||null, recordId||null,
       changes ? JSON.stringify(changes) : null,
       req?.ip||null, req?.headers?.['user-agent']||null]
    );
  } catch(e) { console.error('[audit_log]', e.message); }
};

app.get('/api/assurance/offres', async (req, res) => {
  try {
    const r = await db(`
      SELECT o.id, o.nom, o.description, o.prix_mensuel, o.couverture_details,
             o.franchise, o.plafond_annuel, o.delai_remboursement,
             u.prenom||' '||u.nom AS assureur_nom
      FROM offres_assurance o JOIN utilisateurs u ON u.id=o.assureur_id
      WHERE o.actif=true ORDER BY o.prix_mensuel ASC
    `);
    res.json({ success:true, offres:r.rows });
  } catch(e) { console.error('[GET /assurance/offres]', e.message); res.status(500).json({ error:'Erreur serveur' }); }
});

app.get('/api/assurance/offres/:id', async (req, res) => {
  try {
    const r = await db(`
      SELECT o.*, u.prenom||' '||u.nom AS assureur_nom, u.telephone AS assureur_tel
      FROM offres_assurance o JOIN utilisateurs u ON u.id=o.assureur_id
      WHERE o.id=$1 AND o.actif=true
    `, [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error:'Offre introuvable' });
    res.json({ success:true, offre:r.rows[0] });
  } catch(e) { res.status(500).json({ error:'Erreur serveur' }); }
});

app.post('/api/assurance/souscrire', auth, async (req, res) => {
  const { offre_id } = req.body;
  if (!offre_id) return res.status(400).json({ error:'offre_id requis' });
  try {
    const offre = await db('SELECT * FROM offres_assurance WHERE id=$1 AND actif=true', [offre_id]);
    if (!offre.rows.length) return res.status(404).json({ error:'Offre introuvable' });
    const existing = await db(
      `SELECT id FROM souscriptions_assurance WHERE patient_id=$1 AND offre_id=$2 AND statut IN ('en_attente','active')`,
      [req.user.id, offre_id]
    );
    if (existing.rows.length) return res.status(409).json({ error:'Souscription déjà active pour cette offre' });
    const r = await db(
      `INSERT INTO souscriptions_assurance (patient_id,offre_id,statut,date_debut) VALUES ($1,$2,'en_attente',CURRENT_DATE) RETURNING *`,
      [req.user.id, offre_id]
    );
    await logAudit(req.user.id, 'SOUSCRIPTION_ASSURANCE', 'souscriptions_assurance', r.rows[0].id, {offre_id}, req);
    await db(`INSERT INTO notifications (user_id,type,titre,contenu,reference) VALUES ($1,'in_app','Souscription en cours',$2,$3)`,
      [req.user.id, `Votre souscription à "${offre.rows[0].nom}" est en cours de traitement.`, r.rows[0].id]);
    res.status(201).json({ success:true, souscription:r.rows[0] });
  } catch(e) { console.error('[POST /assurance/souscrire]', e.message); res.status(500).json({ error:'Erreur serveur' }); }
});

app.get('/api/assurance/mes-souscriptions', auth, async (req, res) => {
  try {
    const r = await db(`
      SELECT s.*, o.nom AS offre_nom, o.prix_mensuel, o.couverture_details, o.plafond_annuel,
             u.prenom||' '||u.nom AS assureur_nom
      FROM souscriptions_assurance s
      JOIN offres_assurance o ON o.id=s.offre_id
      JOIN utilisateurs u ON u.id=o.assureur_id
      WHERE s.patient_id=$1 ORDER BY s.created_at DESC
    `, [req.user.id]);
    res.json({ success:true, souscriptions:r.rows });
  } catch(e) { res.status(500).json({ error:'Erreur serveur' }); }
});

app.post('/api/assurance/tiers-payant', auth, async (req, res) => {
  const { consultation_id, assureur_id, souscription_id, montant_total, clinique_id } = req.body;
  if (!assureur_id || !montant_total) return res.status(400).json({ error:'assureur_id et montant_total requis' });
  try {
    const r = await db(`
      INSERT INTO dossiers_tiers_payant (patient_id,clinique_id,assureur_id,consultation_id,souscription_id,montant_total,statut)
      VALUES ($1,$2,$3,$4,$5,$6,'soumis') RETURNING *
    `, [req.user.id, clinique_id||null, assureur_id, consultation_id||null, souscription_id||null, montant_total]);
    await logAudit(req.user.id, 'SOUMISSION_TIERS_PAYANT', 'dossiers_tiers_payant', r.rows[0].id, req.body, req);
    await db(`INSERT INTO notifications (user_id,type,titre,contenu,reference) VALUES ($1,'in_app','Nouveau dossier TP',$2,$3)`,
      [assureur_id, `Nouveau dossier TP — Réf: ${r.rows[0].reference} — ${montant_total} FCFA`, r.rows[0].id]);
    res.status(201).json({ success:true, dossier:r.rows[0] });
  } catch(e) { console.error('[POST /assurance/tiers-payant]', e.message); res.status(500).json({ error:'Erreur serveur' }); }
});

app.get('/api/assurance/mes-dossiers-tp', auth, async (req, res) => {
  try {
    const r = await db(`
      SELECT d.*, u.prenom||' '||u.nom AS assureur_nom
      FROM dossiers_tiers_payant d JOIN utilisateurs u ON u.id=d.assureur_id
      WHERE d.patient_id=$1 ORDER BY d.created_at DESC
    `, [req.user.id]);
    res.json({ success:true, dossiers:r.rows });
  } catch(e) { res.status(500).json({ error:'Erreur serveur' }); }
});

app.get('/api/assurance/dossiers-tp', auth, can('assureur','admin'), async (req, res) => {
  try {
    const params = [req.user.id];
    let q = `SELECT d.*, u.prenom||' '||u.nom AS patient_nom, u.telephone AS patient_tel
             FROM dossiers_tiers_payant d JOIN utilisateurs u ON u.id=d.patient_id
             WHERE d.assureur_id=$1`;
    if (req.query.statut) { q += ` AND d.statut=$2`; params.push(req.query.statut); }
    q += ` ORDER BY d.created_at DESC`;
    const r = await db(q, params);
    res.json({ success:true, dossiers:r.rows });
  } catch(e) { res.status(500).json({ error:'Erreur serveur' }); }
});

app.patch('/api/assurance/dossiers-tp/:id', auth, can('assureur','admin'), async (req, res) => {
  const { statut, montant_pris_en_charge, motif_rejet } = req.body;
  if (!['en_cours','valide','rembourse','rejete','litige'].includes(statut)) return res.status(400).json({ error:'Statut invalide' });
  try {
    const dossier = await db('SELECT * FROM dossiers_tiers_payant WHERE id=$1 AND assureur_id=$2', [req.params.id, req.user.id]);
    if (!dossier.rows.length) return res.status(404).json({ error:'Dossier introuvable' });
    const montantPatient = montant_pris_en_charge ? dossier.rows[0].montant_total - montant_pris_en_charge : null;
    const r = await db(`
      UPDATE dossiers_tiers_payant SET statut=$1,
        montant_pris_en_charge=COALESCE($2,montant_pris_en_charge),
        montant_patient=COALESCE($3,montant_patient),
        motif_rejet=COALESCE($4,motif_rejet),
        date_validation=CASE WHEN $1='valide' THEN NOW() ELSE date_validation END,
        date_remboursement=CASE WHEN $1='rembourse' THEN NOW() ELSE date_remboursement END
      WHERE id=$5 RETURNING *
    `, [statut, montant_pris_en_charge||null, montantPatient, motif_rejet||null, req.params.id]);
    await logAudit(req.user.id, 'TRAITEMENT_TIERS_PAYANT', 'dossiers_tiers_payant', req.params.id, {statut}, req);
    const msgs = {
      valide:`Dossier TP ${r.rows[0].reference} validé.`,
      rembourse:`Remboursement de ${montant_pris_en_charge} FCFA — Réf: ${r.rows[0].reference}`,
      rejete:`Dossier TP ${r.rows[0].reference} rejeté. Motif: ${motif_rejet||'Non précisé'}`
    };
    if (msgs[statut]) await db(
      `INSERT INTO notifications (user_id,type,titre,contenu,reference) VALUES ($1,'in_app','Mise à jour dossier TP',$2,$3)`,
      [dossier.rows[0].patient_id, msgs[statut], req.params.id]
    );
    res.json({ success:true, dossier:r.rows[0] });
  } catch(e) { console.error('[PATCH /assurance/dossiers-tp]', e.message); res.status(500).json({ error:'Erreur serveur' }); }
});

app.get('/api/assurance/mes-offres', auth, can('assureur','admin'), async (req, res) => {
  try {
    const r = await db(`
      SELECT o.*, COUNT(s.id) AS nb_souscriptions
      FROM offres_assurance o LEFT JOIN souscriptions_assurance s ON s.offre_id=o.id
      WHERE o.assureur_id=$1 GROUP BY o.id ORDER BY o.created_at DESC
    `, [req.user.id]);
    res.json({ success:true, offres:r.rows });
  } catch(e) { res.status(500).json({ error:'Erreur serveur' }); }
});

app.post('/api/assurance/offres', auth, can('assureur','admin'), async (req, res) => {
  const { nom, description, prix_mensuel, couverture_details, franchise, plafond_annuel } = req.body;
  if (!nom || !prix_mensuel) return res.status(400).json({ error:'nom et prix_mensuel requis' });
  try {
    const r = await db(`
      INSERT INTO offres_assurance (assureur_id,nom,description,prix_mensuel,couverture_details,franchise,plafond_annuel)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
    `, [req.user.id, nom, description||null, prix_mensuel, couverture_details||{}, franchise||0, plafond_annuel||null]);
    res.status(201).json({ success:true, offre:r.rows[0] });
  } catch(e) { res.status(500).json({ error:'Erreur serveur' }); }
});

app.patch('/api/assurance/offres/:id', auth, can('assureur','admin'), async (req, res) => {
  const { nom, description, prix_mensuel, couverture_details, franchise, plafond_annuel, actif } = req.body;
  try {
    const r = await db(`
      UPDATE offres_assurance SET
        nom=COALESCE($1,nom), description=COALESCE($2,description),
        prix_mensuel=COALESCE($3,prix_mensuel), couverture_details=COALESCE($4,couverture_details),
        franchise=COALESCE($5,franchise), plafond_annuel=COALESCE($6,plafond_annuel), actif=COALESCE($7,actif)
      WHERE id=$8 AND assureur_id=$9 RETURNING *
    `, [nom, description, prix_mensuel, couverture_details, franchise, plafond_annuel, actif, req.params.id, req.user.id]);
    if (!r.rows.length) return res.status(404).json({ error:'Offre introuvable' });
    res.json({ success:true, offre:r.rows[0] });
  } catch(e) { res.status(500).json({ error:'Erreur serveur' }); }
});

app.patch('/api/assurance/souscriptions/:id', auth, can('assureur','admin'), async (req, res) => {
  const { statut, date_fin } = req.body;
  if (!['active','suspendue','resiliee'].includes(statut)) return res.status(400).json({ error:'Statut invalide' });
  try {
    const r = await db(`
      UPDATE souscriptions_assurance SET statut=$1,
        date_fin=COALESCE($2,date_fin),
        date_debut=CASE WHEN $1='active' AND date_debut IS NULL THEN CURRENT_DATE ELSE date_debut END
      WHERE id=$3 RETURNING *
    `, [statut, date_fin||null, req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error:'Souscription introuvable' });
    const msg = statut==='active' ? `Votre assurance ${r.rows[0].numero_police} est active.`
               : statut==='suspendue' ? `Votre assurance a été suspendue.`
               : `Votre assurance a été résiliée.`;
    await db(`INSERT INTO notifications (user_id,type,titre,contenu,reference) VALUES ($1,'in_app','Mise à jour assurance',$2,$3)`,
      [r.rows[0].patient_id, msg, r.rows[0].id]);
    res.json({ success:true, souscription:r.rows[0] });
  } catch(e) { res.status(500).json({ error:'Erreur serveur' }); }
});


// ══════════════════════════════════════════════════════════════════
// BUSINESS DEVELOPER — dashboard, recrutements, commissions
// ══════════════════════════════════════════════════════════════════

app.get('/api/business-developer/dashboard', auth, can('business_developer','admin'), async (req, res) => {
  const bdId = req.user.id;
  try {
    const [prest, comm, pat] = await Promise.all([
      db(`SELECT COUNT(*) FILTER (WHERE is_active=true) AS total_actifs, COUNT(*) AS total,
                 COUNT(*) FILTER (WHERE created_at>=DATE_TRUNC('month',NOW())) AS ce_mois
          FROM utilisateurs WHERE recrute_par=$1`, [bdId]),
      db(`SELECT SUM(montant) FILTER (WHERE statut='payee') AS total_percu,
                 SUM(montant) FILTER (WHERE statut='en_attente') AS en_attente,
                 SUM(montant) FILTER (WHERE statut='validee') AS a_percevoir,
                 COUNT(*) AS total_transactions
          FROM commissions_bd WHERE bd_id=$1`, [bdId]),
      db(`SELECT COUNT(*) AS total_patients FROM commissions_bd WHERE bd_id=$1 AND type_commission='patient'`, [bdId])
    ]);
    res.json({ success:true, dashboard:{ prestataires:prest.rows[0], commissions:comm.rows[0], patients:pat.rows[0] } });
  } catch(e) { console.error('[BD /dashboard]', e.message); res.status(500).json({ error:'Erreur serveur' }); }
});

app.get('/api/business-developer/prestataires', auth, can('business_developer','admin'), async (req, res) => {
  try {
    const r = await db(`
      SELECT u.id, u.prenom, u.nom, u.email, u.telephone, u.role, u.ville, u.pays_code, u.is_active, u.created_at,
             COALESCE(SUM(c.montant) FILTER (WHERE c.statut='payee'),0) AS commissions_generees
      FROM utilisateurs u
      LEFT JOIN commissions_bd c ON c.prestataire_id=u.id AND c.bd_id=$1
      WHERE u.recrute_par=$1 GROUP BY u.id ORDER BY u.created_at DESC
    `, [req.user.id]);
    res.json({ success:true, prestataires:r.rows });
  } catch(e) { res.status(500).json({ error:'Erreur serveur' }); }
});

app.get('/api/business-developer/commissions', auth, can('business_developer','admin'), async (req, res) => {
  const { statut, type_commission } = req.query;
  const params = [req.user.id];
  let q = `SELECT c.*, u.prenom||' '||u.nom AS prestataire_nom, u.role AS prestataire_role
           FROM commissions_bd c LEFT JOIN utilisateurs u ON u.id=c.prestataire_id
           WHERE c.bd_id=$1`;
  if (statut) { q += ` AND c.statut=$${params.push(statut)}`; }
  if (type_commission) { q += ` AND c.type_commission=$${params.push(type_commission)}`; }
  q += ` ORDER BY c.created_at DESC`;
  try {
    const r = await db(q, params);
    res.json({ success:true, commissions:r.rows });
  } catch(e) { res.status(500).json({ error:'Erreur serveur' }); }
});

app.get('/api/business-developer/commissions/resume', auth, can('business_developer','admin'), async (req, res) => {
  try {
    const r = await db(`
      SELECT DATE_TRUNC('month',created_at) AS mois, type_commission,
             COUNT(*) AS nb, SUM(montant) AS total_fcfa,
             SUM(montant) FILTER (WHERE statut='payee') AS percu,
             SUM(montant) FILTER (WHERE statut='en_attente') AS en_attente
      FROM commissions_bd WHERE bd_id=$1
      GROUP BY DATE_TRUNC('month',created_at), type_commission ORDER BY mois DESC
    `, [req.user.id]);
    res.json({ success:true, resume:r.rows });
  } catch(e) { res.status(500).json({ error:'Erreur serveur' }); }
});

app.post('/api/business-developer/recruter', auth, can('business_developer','admin'), async (req, res) => {
  const { prestataire_id } = req.body;
  if (!prestataire_id) return res.status(400).json({ error:'prestataire_id requis' });
  try {
    const p = await db('SELECT id,prenom,nom,role,recrute_par FROM utilisateurs WHERE id=$1', [prestataire_id]);
    if (!p.rows.length) return res.status(404).json({ error:'Prestataire introuvable' });
    if (p.rows[0].recrute_par) return res.status(409).json({ error:'Déjà rattaché à un Business Developer' });
    if (['patient','admin'].includes(p.rows[0].role)) return res.status(400).json({ error:'Ce profil ne peut pas être recruté' });
    await db('UPDATE utilisateurs SET recrute_par=$1 WHERE id=$2', [req.user.id, prestataire_id]);
    const r = await db(`
      INSERT INTO commissions_bd (bd_id,prestataire_id,type_commission,montant,statut)
      VALUES ($1,$2,'recrutement',25000,'en_attente') RETURNING *
    `, [req.user.id, prestataire_id]);
    await db(`INSERT INTO notifications (user_id,type,titre,contenu,reference) VALUES ($1,'in_app','Nouveau recrutement',$2,$3)`,
      [req.user.id, `${p.rows[0].prenom} ${p.rows[0].nom} recruté. Commission 25 000 FCFA en attente.`, r.rows[0].id]);
    res.status(201).json({ success:true, message:'Prestataire recruté', commission:r.rows[0] });
  } catch(e) { console.error('[BD /recruter]', e.message); res.status(500).json({ error:'Erreur serveur' }); }
});

app.get('/api/business-developer/notifications', auth, can('business_developer','admin'), async (req, res) => {
  try {
    const r = await db(`SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50`, [req.user.id]);
    res.json({ success:true, notifications:r.rows });
  } catch(e) { res.status(500).json({ error:'Erreur serveur' }); }
});

app.patch('/api/business-developer/commissions/valider/:id', auth, can('admin'), async (req, res) => {
  const { statut, reference_paiement } = req.body;
  if (!['validee','payee','annulee'].includes(statut)) return res.status(400).json({ error:'Statut invalide' });
  try {
    const r = await db(
      `UPDATE commissions_bd SET statut=$1, reference_paiement=COALESCE($2,reference_paiement) WHERE id=$3 RETURNING *`,
      [statut, reference_paiement||null, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error:'Commission introuvable' });
    if (statut==='payee') await db(
      `INSERT INTO notifications (user_id,type,titre,contenu,reference) VALUES ($1,'in_app','Commission payée',$2,$3)`,
      [r.rows[0].bd_id, `Commission de ${r.rows[0].montant} FCFA payée. Réf: ${reference_paiement||'N/A'}`, r.rows[0].id]
    );
    res.json({ success:true, commission:r.rows[0] });
  } catch(e) { res.status(500).json({ error:'Erreur serveur' }); }
});


// ── CATCH-ALL 404 — doit rester en toute dernière position ────────
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
