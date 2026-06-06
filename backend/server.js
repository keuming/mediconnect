require('dotenv').config();
const express    = require('express');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const { v4: uuid } = require('uuid');

const { db }       = require('./config/db');
const { auth, can} = require('./middleware/auth');

const isProd     = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET || 'mediconnect_dev_secret_2024';
const vd = d => d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;

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
      adresse TEXT, ville VARCHAR(100), telephone VARCHAR(30), email VARCHAR(200),
      is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT NOW()
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
      prenom VARCHAR(100), nom VARCHAR(100), telephone VARCHAR(30), email VARCHAR(200),
      date_naissance DATE, groupe_sanguin VARCHAR(10), allergies TEXT, antecedents TEXT,
      ville VARCHAR(100), assurance VARCHAR(100), numero_police VARCHAR(100),
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
      pathologie VARCHAR(200), code_cim10 VARCHAR(20), pays_code VARCHAR(5) DEFAULT 'CI',
      ville VARCHAR(100), age_patient INTEGER, sexe_patient VARCHAR(10),
      gravite VARCHAR(20) DEFAULT 'modere', created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS ordonnances (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id UUID, clinique_id UUID, medecin_id UUID, consultation_id UUID,
      medicaments TEXT, posologie TEXT, duree VARCHAR(100), notes_ord TEXT,
      pays_code VARCHAR(5) DEFAULT 'CI', statut VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW()
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
      clinique_id UUID, date DATE DEFAULT CURRENT_DATE, statut VARCHAR(20) DEFAULT 'ouverte',
      total_encaisse DECIMAL(12,2) DEFAULT 0, total_decaisse DECIMAL(12,2) DEFAULT 0,
      opened_at TIMESTAMPTZ DEFAULT NOW(), closed_at TIMESTAMPTZ
    )`,
    `CREATE TABLE IF NOT EXISTS dossiers_assurance (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      reference VARCHAR(50), clinique_id UUID, patient_id UUID, patient_nom VARCHAR(200),
      compagnie VARCHAR(100), numero_police VARCHAR(100),
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
  const alters = [
    "ALTER TABLE rendez_vous ADD COLUMN IF NOT EXISTS patient_nom VARCHAR(200)",
    "ALTER TABLE rendez_vous ADD COLUMN IF NOT EXISTS medecin_nom VARCHAR(200)",
    "ALTER TABLE rendez_vous ADD COLUMN IF NOT EXISTS reference VARCHAR(50)",
    "ALTER TABLE rendez_vous ADD COLUMN IF NOT EXISTS source VARCHAR(30) DEFAULT 'dashboard'",
    "ALTER TABLE rendez_vous ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()",
    "ALTER TABLE rendez_vous ALTER COLUMN patient_id DROP NOT NULL",
    "ALTER TABLE rendez_vous ALTER COLUMN clinique_id DROP NOT NULL",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS code_secret VARCHAR(30)",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS allergies TEXT",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS antecedents TEXT",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()",
    "ALTER TABLE medecins ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()",
    "ALTER TABLE consultations ADD COLUMN IF NOT EXISTS pathologie VARCHAR(200)",
    "ALTER TABLE consultations ADD COLUMN IF NOT EXISTS pays_code VARCHAR(5) DEFAULT 'CI'",
    "ALTER TABLE consultations ADD COLUMN IF NOT EXISTS age_patient INTEGER",
    "ALTER TABLE consultations ADD COLUMN IF NOT EXISTS sexe_patient VARCHAR(10)",
    "ALTER TABLE consultations ADD COLUMN IF NOT EXISTS gravite VARCHAR(20) DEFAULT 'modere'",
    "ALTER TABLE consultations ADD COLUMN IF NOT EXISTS medecin_id UUID",
    "ALTER TABLE ordonnances ADD COLUMN IF NOT EXISTS medecin_id UUID",
    "UPDATE cliniques SET is_active=true WHERE is_active IS NULL",
    "UPDATE utilisateurs SET is_active=true WHERE is_active IS NULL",
  ];
  for (const sql of alters) { await db(sql).catch(()=>{}); }
  // Tables MediConnect Card
  const cardTables = [
    `CREATE TABLE IF NOT EXISTS mediconnect_cards (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), numero_carte VARCHAR(20) UNIQUE NOT NULL, qr_code_data TEXT, statut VARCHAR(20) DEFAULT 'non_liee', solde DECIMAL(12,2) DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS mediconnect_accounts (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID, numero_compte VARCHAR(20) UNIQUE NOT NULL, carte_id UUID, numero_carte VARCHAR(20), prenom VARCHAR(100) NOT NULL, nom VARCHAR(100) NOT NULL, telephone VARCHAR(30), email VARCHAR(200), adresse TEXT, ville VARCHAR(100), pays_code VARCHAR(5) DEFAULT 'CI', date_naissance DATE, photo_url TEXT, groupe_sanguin VARCHAR(10), allergies TEXT, statut VARCHAR(20) DEFAULT 'actif', niveau VARCHAR(20) DEFAULT 'standard', solde DECIMAL(12,2) DEFAULT 0, points_fidelite INTEGER DEFAULT 0, date_linkage TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS contacts_urgence (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), account_id UUID, ordre INTEGER DEFAULT 1, prenom VARCHAR(100) NOT NULL, nom VARCHAR(100) NOT NULL, telephone VARCHAR(30) NOT NULL, relation VARCHAR(50), telephone_2 VARCHAR(30), email VARCHAR(200), est_principal BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS recharges_card (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), account_id UUID, carte_id UUID, montant DECIMAL(12,2) NOT NULL, mode_paiement VARCHAR(50) DEFAULT 'Wave', reference_paiement VARCHAR(100), statut VARCHAR(20) DEFAULT 'success', solde_avant DECIMAL(12,2) DEFAULT 0, solde_apres DECIMAL(12,2) DEFAULT 0, notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS transactions_card (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), account_id UUID, carte_id UUID, type VARCHAR(30) NOT NULL, montant DECIMAL(12,2) NOT NULL, sens VARCHAR(10) DEFAULT 'debit', solde_avant DECIMAL(12,2) DEFAULT 0, solde_apres DECIMAL(12,2) DEFAULT 0, prestataire_id UUID, prestataire_nom VARCHAR(200), prestataire_type VARCHAR(50), description TEXT, reference VARCHAR(100), created_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS scans_qr_card (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), carte_id UUID, account_id UUID, scanner_ip VARCHAR(50), scanner_info TEXT, localisation TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`,
    `INSERT INTO mediconnect_cards (numero_carte, statut, solde) VALUES ('MC-CI-2024-000001','non_liee',0),('MC-CI-2024-000002','non_liee',0),('MC-CI-2024-000003','non_liee',0) ON CONFLICT DO NOTHING`,
  ];
  for (const sql of cardTables) { await db(sql).catch(e => console.error('[INIT CARD]', e.message)); }

  // Tables Cabinet Optique
  const optiqueTables = [
    `CREATE TABLE IF NOT EXISTS cabinets_optiques (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID, nom VARCHAR(200) NOT NULL, adresse TEXT, ville VARCHAR(100), telephone VARCHAR(30), email VARCHAR(200), numero_registre VARCHAR(100), is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS patients_optiques (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), cabinet_id UUID, prenom VARCHAR(100) NOT NULL, nom VARCHAR(100) NOT NULL, date_naissance DATE, telephone VARCHAR(30), email VARCHAR(200), adresse TEXT, ville VARCHAR(100), assurance VARCHAR(100), numero_police VARCHAR(100), taux_prise_en_charge INTEGER DEFAULT 0, od_sphere DECIMAL(5,2), od_cylindre DECIMAL(5,2), od_axe INTEGER, og_sphere DECIMAL(5,2), og_cylindre DECIMAL(5,2), og_axe INTEGER, addition DECIMAL(4,2), ecart_pupillaire DECIMAL(5,1), notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS ordonnances_optiques (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), cabinet_id UUID, patient_id UUID, patient_nom VARCHAR(200), medecin_prescripteur VARCHAR(200), date_prescription DATE DEFAULT CURRENT_DATE, date_validite DATE, od_sphere DECIMAL(5,2), od_cylindre DECIMAL(5,2), od_axe INTEGER, od_addition DECIMAL(4,2), od_prisme DECIMAL(4,2), og_sphere DECIMAL(5,2), og_cylindre DECIMAL(5,2), og_axe INTEGER, og_addition DECIMAL(4,2), og_prisme DECIMAL(4,2), ecart_pupillaire_vl DECIMAL(5,1), ecart_pupillaire_vp DECIMAL(5,1), type_correction VARCHAR(50) DEFAULT 'unifocal', diagnostic_ophtalmologique TEXT, notes TEXT, statut VARCHAR(20) DEFAULT 'active', created_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS stock_montures (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), cabinet_id UUID, reference VARCHAR(100), marque VARCHAR(100) NOT NULL, modele VARCHAR(100), couleur VARCHAR(50), taille VARCHAR(20), materiau VARCHAR(50), genre VARCHAR(20) DEFAULT 'mixte', quantite INTEGER DEFAULT 0, seuil_alerte INTEGER DEFAULT 2, prix_achat DECIMAL(10,2), prix_vente DECIMAL(10,2) NOT NULL, fournisseur VARCHAR(200), is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS stock_verres (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), cabinet_id UUID, reference VARCHAR(100), marque VARCHAR(100) NOT NULL, type_verre VARCHAR(50) NOT NULL, indice DECIMAL(4,2), traitement VARCHAR(200), teinte VARCHAR(50), gamme_sphere_min DECIMAL(5,2), gamme_sphere_max DECIMAL(5,2), gamme_cylindre_max DECIMAL(5,2), quantite INTEGER DEFAULT 0, seuil_alerte INTEGER DEFAULT 2, prix_achat DECIMAL(10,2), prix_vente_paire DECIMAL(10,2) NOT NULL, fournisseur VARCHAR(200), is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS stock_accessoires_optiques (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), cabinet_id UUID, nom VARCHAR(200) NOT NULL, categorie VARCHAR(100), reference VARCHAR(100), quantite INTEGER DEFAULT 0, seuil_alerte INTEGER DEFAULT 5, prix_achat DECIMAL(10,2), prix_vente DECIMAL(10,2) NOT NULL, fournisseur VARCHAR(200), is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS ventes_optiques (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), reference VARCHAR(50) UNIQUE NOT NULL, cabinet_id UUID, patient_id UUID, patient_nom VARCHAR(200) NOT NULL, ordonnance_id UUID, monture_id UUID, monture_desc VARCHAR(200), monture_prix DECIMAL(10,2) DEFAULT 0, verre_od_id UUID, verre_og_id UUID, verres_desc VARCHAR(200), verres_prix DECIMAL(10,2) DEFAULT 0, pose_prix DECIMAL(10,2) DEFAULT 0, accessoires_json JSONB DEFAULT '[]', montant_total DECIMAL(12,2) DEFAULT 0, remise_montant DECIMAL(10,2) DEFAULT 0, montant_net DECIMAL(12,2) DEFAULT 0, est_assure BOOLEAN DEFAULT false, assurance VARCHAR(100), numero_police VARCHAR(100), taux_prise_en_charge INTEGER DEFAULT 0, montant_assurance DECIMAL(10,2) DEFAULT 0, montant_patient DECIMAL(10,2) DEFAULT 0, mode_paiement VARCHAR(50) DEFAULT 'Espèces', acompte_verse DECIMAL(10,2) DEFAULT 0, solde_restant DECIMAL(10,2) DEFAULT 0, statut_paiement VARCHAR(30) DEFAULT 'en_attente', statut VARCHAR(30) DEFAULT 'en_cours', date_livraison_prevue DATE, date_livraison_effective DATE, notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS factures_optiques (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), reference VARCHAR(50) UNIQUE NOT NULL, cabinet_id UUID, vente_id UUID, patient_nom VARCHAR(200) NOT NULL, patient_id UUID, montant_total DECIMAL(12,2) DEFAULT 0, montant_assurance DECIMAL(10,2) DEFAULT 0, montant_patient DECIMAL(10,2) DEFAULT 0, montant_paye DECIMAL(12,2) DEFAULT 0, lignes_json JSONB DEFAULT '[]', statut VARCHAR(30) DEFAULT 'emise', mode_paiement VARCHAR(50) DEFAULT 'Espèces', date_echeance DATE, notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS assurances_optiques (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), reference VARCHAR(50) UNIQUE NOT NULL, cabinet_id UUID, vente_id UUID, patient_nom VARCHAR(200) NOT NULL, patient_id UUID, compagnie VARCHAR(100) NOT NULL, numero_police VARCHAR(100), plafond_monture DECIMAL(10,2), plafond_verres DECIMAL(10,2), montant_monture DECIMAL(10,2) DEFAULT 0, montant_verres DECIMAL(10,2) DEFAULT 0, montant_total_soumis DECIMAL(10,2) DEFAULT 0, montant_pris_en_charge DECIMAL(10,2) DEFAULT 0, ticket_moderateur DECIMAL(10,2) DEFAULT 0, statut VARCHAR(30) DEFAULT 'soumis', motif_rejet TEXT, date_soumission DATE DEFAULT CURRENT_DATE, date_reponse DATE, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS fournisseurs_optiques (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), cabinet_id UUID, nom VARCHAR(200) NOT NULL, contact VARCHAR(100), telephone VARCHAR(30), email VARCHAR(200), adresse TEXT, pays VARCHAR(100) DEFAULT 'Côte d''Ivoire', categorie VARCHAR(50), delai_livraison_jours INTEGER DEFAULT 7, notes TEXT, is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT NOW())`,
  ];
  for (const sql of optiqueTables) { await db(sql).catch(e => console.error('[INIT OPTIQUE]', e.message)); }

  // Créer compte optique démo si inexistant
  const existsOptique = await db("SELECT id FROM utilisateurs WHERE email='optique@demo.ci'").catch(()=>({rows:[]}));
  if (!existsOptique.rows.length) {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('demo1234', 10);
    await db(
      "INSERT INTO utilisateurs (id,email,password,role,prenom,nom,telephone,is_active) VALUES (gen_random_uuid(),$1,$2,'optique','Cabinet','Optique Demo','+225 07 00 00 10',true)",
      ['optique@demo.ci', hash]
    ).catch(e => console.error('[INIT] Compte optique:', e.message));
    console.log('[DB] Compte optique@demo.ci créé');
  }

  // Supprimer contrainte role si elle existe et la recréer avec ministere
  await db(`ALTER TABLE utilisateurs DROP CONSTRAINT IF EXISTS utilisateurs_role_check`).catch(()=>{});
  await db(`ALTER TABLE utilisateurs ADD CONSTRAINT utilisateurs_role_check CHECK (role IN ('patient','clinique','medecin','medecin_independant','medecin_conseil','medecin_prive','pharmacie','livreur','admin','assureur','imagerie','laboratoire','ministere','ministere_sante','optique'))`).catch(()=>{});

  // Créer compte Ministère de la Santé si inexistant
  const bcrypt = require('bcryptjs');
  const existsMinist = await db("SELECT id FROM utilisateurs WHERE email='ministere@sante.ci'").catch(()=>({rows:[]}));
  if (!existsMinist.rows.length) {
    const hash = await bcrypt.hash('MinistereCI2024', 10);
    await db(
      "INSERT INTO utilisateurs (id,email,password,role,prenom,nom,telephone,is_active) VALUES (gen_random_uuid(),$1,$2,'ministere','Ministère','Santé CI','+225 27 20 00 00 00',true)",
      ['ministere@sante.ci', hash]
    ).catch(e => console.error('[INIT] Compte ministere:', e.message));
    console.log('[DB] Compte ministere@sante.ci créé');
  }

  console.log('[DB] Tables initialisées');
};

// ── App Express ───────────────────────────────────────────────────
const app = express();
app.set('trust proxy', 1);

// CORS
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
app.use('/api/',     rateLimit({ windowMs:60*1000,     max:500, skip:r=>r.method==='OPTIONS' }));

// ── Routes modulaires ─────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/planning',  require('./routes/planning'));
app.use('/api/ministere', require('./routes/ministere'));
app.use('/api',           require('./routes/extra'));
app.use('/api/optique',   require('./routes/optique'));
app.use('/api/card',      require('./routes/card'));

// ── HEALTH & ROOT ─────────────────────────────────────────────────
// Route de migration forcée (admin seulement)
app.post('/api/admin/migrate', async (req, res) => {
  const key = req.headers['x-admin-key'];
  if (key !== (process.env.JWT_SECRET || 'mediconnect_dev_secret_2024')) {
    return res.status(403).json({ success: false, message: 'Clé invalide' });
  }
  try {
    await db(`ALTER TABLE utilisateurs DROP CONSTRAINT IF EXISTS utilisateurs_role_check`);
    await db(`ALTER TABLE utilisateurs ADD CONSTRAINT utilisateurs_role_check CHECK (role IN ('patient','clinique','medecin','medecin_independant','medecin_conseil','medecin_prive','pharmacie','livreur','admin','assureur','imagerie','laboratoire','ministere','ministere_sante','optique'))`);
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('demo1234', 10);
    await db(`INSERT INTO utilisateurs (id,email,password,role,prenom,nom,is_active) VALUES (gen_random_uuid(),'optique@demo.ci',$1,'optique','Cabinet','Optique Demo',true) ON CONFLICT (email) DO UPDATE SET role='optique'`, [hash]);
    res.json({ success: true, message: 'Migration OK — compte optique@demo.ci créé' });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

app.get('/api/health', async (req, res) => {
  try {
    await db('SELECT 1');
    res.json({ success:true, status:'ok', db:'connected', env:process.env.NODE_ENV||'unknown', ts:new Date().toISOString() });
  } catch(e) { res.status(503).json({ success:false, db:'error', error:e.message }); }
});
app.get('/api/version', (req, res) => res.json({ version:'3.0-CLEAN', routes:'modulaire', status:'ok' }));
app.get('/', (req, res) => res.json({ success:true, message:'MediConnect API v3', health:'/api/health' }));

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
    res.json({ success:true, data:{ medecins_actifs:+m.rows[0]?.c||0, rdv_ce_mois:+r.rows[0]?.c||0, patients_mois:+p.rows[0]?.c||0 } });
  } catch(e) { res.json({ success:true, data:{} }); }
});

// ── MÉDECINS ──────────────────────────────────────────────────────
app.get('/api/medecins', auth, async (req, res) => {
  try {
    const cid = req.query.clinique_id || req.user?.clinique_id;
    const r = cid
      ? await db('SELECT * FROM medecins WHERE clinique_id=$1 ORDER BY nom,prenom', [cid])
      : await db('SELECT * FROM medecins ORDER BY nom,prenom LIMIT 200');
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.get('/api/public/medecins', async (req, res) => {
  try {
    const { clinique_id, independant, specialite } = req.query;
    let sql = 'SELECT m.*,c.nom AS clinique_nom FROM medecins m LEFT JOIN cliniques c ON c.id=m.clinique_id WHERE 1=1';
    const params = [];
    if (clinique_id)        { params.push(clinique_id); sql += ` AND m.clinique_id=$${params.length}`; }
    else if (independant==='true') { sql += ` AND (m.clinique_id IS NULL OR m.type_contrat='independant')`; }
    if (specialite)         { params.push(specialite); sql += ` AND m.specialite=$${params.length}`; }
    sql += ' ORDER BY m.nom,m.prenom LIMIT 100';
    const r = await db(sql, params);
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

// ── PATIENTS ──────────────────────────────────────────────────────
app.get('/api/patients', auth, async (req, res) => {
  try {
    const cid = req.user?.clinique_id;
    const r = cid
      ? await db('SELECT * FROM patients WHERE clinique_id=$1 ORDER BY nom,prenom LIMIT 500', [cid])
      : await db('SELECT * FROM patients ORDER BY nom LIMIT 500');
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
    const r = await db(
      'INSERT INTO patients (id,clinique_id,code_secret,prenom,nom,telephone,email,date_naissance,groupe_sanguin,allergies,antecedents,ville,assurance,numero_police) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *',
      [uuid(), req.user?.clinique_id, code, prenom, nom, telephone||null, email||null, vd(date_naissance), groupe_sanguin||null, allergies||null, antecedents||null, ville||null, assurance||null, numero_police||null]
    );
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.put('/api/patients/:id', auth, async (req, res) => {
  const { prenom, nom, telephone, email, groupe_sanguin, allergies, antecedents, assurance } = req.body;
  try {
    const r = await db(
      'UPDATE patients SET prenom=COALESCE($1,prenom),nom=COALESCE($2,nom),telephone=COALESCE($3,telephone),email=COALESCE($4,email),groupe_sanguin=COALESCE($5,groupe_sanguin),allergies=COALESCE($6,allergies),antecedents=COALESCE($7,antecedents),assurance=COALESCE($8,assurance),updated_at=NOW() WHERE id=$9 RETURNING *',
      [prenom,nom,telephone,email,groupe_sanguin,allergies,antecedents,assurance,req.params.id]
    );
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ── RENDEZ-VOUS ───────────────────────────────────────────────────
app.get('/api/rendez-vous', auth, async (req, res) => {
  try {
    const { date, statut, medecin_id } = req.query; const cid = req.user?.clinique_id;
    let sql = 'SELECT * FROM rendez_vous WHERE 1=1'; const p = [];
    if (cid)       { p.push(cid);       sql+=` AND clinique_id=$${p.length}`; }
    if (date)      { p.push(date);      sql+=` AND date_rdv=$${p.length}`; }
    if (statut)    { p.push(statut);    sql+=` AND statut=$${p.length}`; }
    if (medecin_id){ p.push(medecin_id);sql+=` AND medecin_id=$${p.length}`; }
    sql+=' ORDER BY date_rdv,heure_rdv LIMIT 200';
    const r = await db(sql, p); res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.post('/api/rendez-vous', auth, async (req, res) => {
  const { patient_nom, patient_id, medecin_nom, medecin_id, date_rdv, heure_rdv, motif, statut, assurance, notes } = req.body;
  if (!date_rdv||!heure_rdv) return res.status(400).json({ success:false, message:'Date et heure requises' });
  try {
    const ref = 'RDV-'+Date.now().toString(36).toUpperCase();
    const r = await db(
      'INSERT INTO rendez_vous (id,reference,clinique_id,patient_id,patient_nom,medecin_id,medecin_nom,date_rdv,heure_rdv,motif,statut,assurance,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *',
      [uuid(),ref,req.user?.clinique_id,patient_id||null,patient_nom||null,medecin_id||null,medecin_nom||null,date_rdv,heure_rdv,motif||null,statut||'en_attente',assurance||null,notes||null]
    );
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.put('/api/rendez-vous/:id', auth, async (req, res) => {
  const { statut, motif, heure_rdv, date_rdv, medecin_nom, patient_nom, notes } = req.body;
  try {
    const r = await db(
      'UPDATE rendez_vous SET statut=COALESCE($1,statut),motif=COALESCE($2,motif),heure_rdv=COALESCE($3,heure_rdv),date_rdv=COALESCE($4,date_rdv),medecin_nom=COALESCE($5,medecin_nom),patient_nom=COALESCE($6,patient_nom),notes=COALESCE($7,notes),updated_at=NOW() WHERE id=$8 RETURNING *',
      [statut,motif,heure_rdv,date_rdv,medecin_nom,patient_nom,notes,req.params.id]
    );
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
    else if (cid)   { p.push(cid);        sql+=` AND clinique_id=$${p.length}`; }
    sql+=' ORDER BY created_at DESC LIMIT 100';
    const r = await db(sql,p); res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.post('/api/consultations', auth, async (req, res) => {
  const { patient_id, diagnostic, traitement, notes, tension_arterielle, temperature, poids, taille, rdv_id, pathologie, age_patient, sexe_patient, gravite } = req.body;
  if (!patient_id||!diagnostic) return res.status(400).json({ success:false, message:'Patient et diagnostic requis' });
  try {
    const mid = req.user?.medecin_id || req.user?.id;
    const r = await db(
      'INSERT INTO consultations (id,patient_id,clinique_id,medecin_id,diagnostic,traitement,notes,tension_arterielle,temperature,poids,taille,rdv_id,pathologie,age_patient,sexe_patient,gravite,pays_code) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *',
      [uuid(),patient_id,req.user?.clinique_id,mid,diagnostic,traitement||null,notes||null,tension_arterielle||null,temperature||null,poids||null,taille||null,rdv_id||null,pathologie||null,age_patient||null,sexe_patient||null,gravite||'modere','CI']
    );
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ── ORDONNANCES ───────────────────────────────────────────────────
app.get('/api/ordonnances', auth, async (req, res) => {
  try {
    const { patient_id } = req.query; const cid = req.user?.clinique_id;
    let sql='SELECT * FROM ordonnances WHERE 1=1'; const p=[];
    if (patient_id) { p.push(patient_id); sql+=` AND patient_id=$${p.length}`; }
    else if (cid)   { p.push(cid);        sql+=` AND clinique_id=$${p.length}`; }
    sql+=' ORDER BY created_at DESC LIMIT 100';
    const r = await db(sql,p); res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.post('/api/ordonnances', auth, async (req, res) => {
  const { patient_id, medicaments, posologie, duree, notes_ord, consultation_id } = req.body;
  if (!patient_id||!medicaments) return res.status(400).json({ success:false, message:'Patient et médicaments requis' });
  try {
    const r = await db(
      'INSERT INTO ordonnances (id,patient_id,clinique_id,medicaments,posologie,duree,notes_ord,consultation_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [uuid(),patient_id,req.user?.clinique_id,medicaments,posologie||null,duree||null,notes_ord||null,consultation_id||null]
    );
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.put('/api/ordonnances/:id', auth, async (req, res) => {
  const { statut } = req.body;
  try {
    const r = await db('UPDATE ordonnances SET statut=COALESCE($1,statut) WHERE id=$2 RETURNING *', [statut, req.params.id]);
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ── STOCK ─────────────────────────────────────────────────────────
app.get('/api/stock', auth, async (req, res) => {
  try {
    const cid = req.user?.clinique_id;
    let sql='SELECT * FROM stock WHERE 1=1'; const p=[];
    if (cid) { p.push(cid); sql+=` AND clinique_id=$${p.length}`; }
    sql+=' ORDER BY nom';
    const r = await db(sql,p); res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.get('/api/stock/clinique', auth, async (req, res) => {
  try {
    const cid = req.user?.clinique_id;
    const r = cid ? await db('SELECT * FROM stock WHERE clinique_id=$1 ORDER BY nom', [cid]) : await db('SELECT * FROM stock ORDER BY nom');
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.post('/api/stock', auth, async (req, res) => {
  const { nom, categorie, quantite, unite, seuil_alerte, prix_unitaire, fournisseur, date_expiration } = req.body;
  if (!nom) return res.status(400).json({ success:false, message:'Nom requis' });
  try {
    const r = await db(
      'INSERT INTO stock (id,clinique_id,nom,categorie,quantite,unite,seuil_alerte,prix_unitaire,fournisseur,date_expiration) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
      [uuid(),req.user?.clinique_id,nom,categorie||'Médicament',quantite||0,unite||'boite',seuil_alerte||10,prix_unitaire||null,fournisseur||null,vd(date_expiration)]
    );
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.put('/api/stock/:id', auth, async (req, res) => {
  const { nom, categorie, quantite, unite, seuil_alerte, prix_unitaire, fournisseur, date_expiration } = req.body;
  try {
    const r = await db(
      'UPDATE stock SET nom=COALESCE($1,nom),categorie=COALESCE($2,categorie),quantite=COALESCE($3,quantite),unite=COALESCE($4,unite),seuil_alerte=COALESCE($5,seuil_alerte),prix_unitaire=COALESCE($6,prix_unitaire),fournisseur=COALESCE($7,fournisseur),date_expiration=COALESCE($8,date_expiration),updated_at=NOW() WHERE id=$9 RETURNING *',
      [nom,categorie,quantite,unite,seuil_alerte,prix_unitaire,fournisseur,vd(date_expiration),req.params.id]
    );
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
app.get('/api/factures/patient', auth, async (req, res) => {
  try {
    const pid = req.user?.patient_id || req.user?.id;
    const r = await db('SELECT * FROM factures WHERE patient_id=$1 ORDER BY created_at DESC LIMIT 50', [pid]);
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.post('/api/factures', auth, async (req, res) => {
  const { patient_nom, patient_id, montant, mode_paiement, statut, assurance } = req.body;
  try {
    const ref='FAC-'+Date.now().toString(36).toUpperCase();
    const r=await db(
      'INSERT INTO factures (id,reference,clinique_id,patient_id,patient_nom,montant,mode_paiement,statut,assurance) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [uuid(),ref,req.user?.clinique_id,patient_id||null,patient_nom||null,montant||0,mode_paiement||'Espèces',statut||'en_attente',assurance||null]
    );
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
    if (!cid) return res.json({ success:true, data:{ statut:'fermee', total_encaisse:0 } });
    const r=await db("SELECT * FROM caisse_sessions WHERE clinique_id=$1 AND date=CURRENT_DATE AND statut='ouverte' LIMIT 1",[cid]);
    res.json({ success:true, data:r.rows[0]||{ statut:'fermee', total_encaisse:0 } });
  } catch(e) { res.json({ success:true, data:{ statut:'fermee', total_encaisse:0 } }); }
});
app.post('/api/caisse/ouvrir', auth, async (req, res) => {
  try {
    const r=await db('INSERT INTO caisse_sessions (id,clinique_id) VALUES ($1,$2) RETURNING *',[uuid(),req.user?.clinique_id]);
    res.status(201).json({ success:true, data:r.rows[0], message:'Caisse ouverte !' });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.post('/api/caisse/encaisser', auth, async (req, res) => {
  const { montant } = req.body;
  if (!montant||montant<=0) return res.status(400).json({ success:false, message:'Montant invalide' });
  try {
    await db("UPDATE caisse_sessions SET total_encaisse=total_encaisse+$1 WHERE clinique_id=$2 AND date=CURRENT_DATE AND statut='ouverte'",[montant,req.user?.clinique_id]);
    res.json({ success:true, message:`${Number(montant).toLocaleString('fr-CI')} FCFA encaissés` });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.post('/api/caisse/decaisser', auth, async (req, res) => {
  const { montant } = req.body;
  if (!montant||montant<=0) return res.status(400).json({ success:false, message:'Montant invalide' });
  try {
    await db("UPDATE caisse_sessions SET total_decaisse=total_decaisse+$1 WHERE clinique_id=$2 AND date=CURRENT_DATE AND statut='ouverte'",[montant,req.user?.clinique_id]);
    res.json({ success:true, message:'Décaissement enregistré' });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.post('/api/caisse/cloturer', auth, async (req, res) => {
  try {
    const r=await db("UPDATE caisse_sessions SET statut='fermee',closed_at=NOW() WHERE clinique_id=$1 AND date=CURRENT_DATE AND statut='ouverte' RETURNING *",[req.user?.clinique_id]);
    res.json({ success:true, data:r.rows[0], message:'Caisse clôturée' });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
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
    const r=await db(
      'INSERT INTO dossiers_assurance (id,reference,clinique_id,patient_id,patient_nom,compagnie,numero_police,montant_total,montant_assur,ticket_moder,taux_couverture,diagnostic) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *',
      [uuid(),ref,req.user?.clinique_id,patient_id||null,patient_nom,compagnie,numero_police||null,montant_total||0,montant_assur||0,ticket_moder||0,taux_couverture||80,diagnostic||null]
    );
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

// ── COMMANDES ─────────────────────────────────────────────────────
app.get('/api/commandes', auth, async (req, res) => {
  try {
    const r=await db('SELECT * FROM commandes ORDER BY created_at DESC LIMIT 200');
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.post('/api/commandes', auth, async (req, res) => {
  const { adresse_livraison, nombre_articles, frais_livraison } = req.body;
  try {
    const r=await db(
      'INSERT INTO commandes (id,patient_id,adresse_livraison,nombre_articles,frais_livraison) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [uuid(),req.user?.patient_id||req.user?.id,adresse_livraison||null,nombre_articles||1,frais_livraison||1500]
    );
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

// ── PUBLIC RDV ────────────────────────────────────────────────────
app.get('/api/public/cliniques', async (req, res) => {
  try {
    const r = await db('SELECT c.*,COALESCE(c.ville,u.ville) AS ville,COALESCE(c.telephone,u.telephone) AS telephone FROM cliniques c LEFT JOIN utilisateurs u ON u.id=c.user_id WHERE c.is_active IS NOT false ORDER BY c.nom');
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.post('/api/public/rdv', async (req, res) => {
  const { patient_nom, clinique_id, medecin_id, date_rdv, heure_rdv, motif } = req.body;
  if (!date_rdv||!heure_rdv) return res.status(400).json({ success:false, message:'Date et heure requises' });
  try {
    const ref='MC-RDV-'+Math.random().toString(36).slice(2,8).toUpperCase();
    const r=await db(
      'INSERT INTO rendez_vous (id,reference,clinique_id,medecin_id,patient_nom,date_rdv,heure_rdv,motif,source) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [uuid(),ref,clinique_id||null,medecin_id||null,patient_nom||null,date_rdv,heure_rdv,motif||null,'public_rdv']
    );
    res.status(201).json({ success:true, data:{ reference:ref, rdv_id:r.rows[0].id }, message:'RDV confirmé !' });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ── ERREURS (TOUJOURS EN DERNIER) ────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status||500).json({ success:false, message: isProd && (!err.status || err.status>=500) ? 'Erreur interne' : err.message });
});
app.use((req, res) => {
  res.status(404).json({ success:false, message:`Route introuvable: ${req.method} ${req.originalUrl}` });
});

// ── DÉMARRAGE ─────────────────────────────────────────────────────
initTables().catch(console.error);

if (!process.env.VERCEL) {
  const PORT = parseInt(process.env.PORT||'5000', 10);
  app.listen(PORT, () => console.log(`\n🚀 MediConnect API v3 — http://localhost:${PORT}/api/health`));
}

module.exports = app;
// card tables Sam  6 jui 2026 16:22:21 GMT
