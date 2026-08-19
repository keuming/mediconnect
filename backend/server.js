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
      patient_nom VARCHAR(200), patient_telephone VARCHAR(30), medecin_id UUID, medecin_nom VARCHAR(200),
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
    "ALTER TABLE rendez_vous ADD COLUMN IF NOT EXISTS patient_telephone VARCHAR(30)",
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
  res.setHeader('Access-Control-Allow-Headers', 'Origin,X-Requested-With,Content-Type,Accept,Authorization,x-card-token');
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
app.use('/api/dentaire',  require('./routes/dentaire'));
app.use('/api/card',      require('./routes/card'));

// ── HEALTH & ROOT ─────────────────────────────────────────────────
// Route de migration forcée (admin seulement)
app.post('/api/admin/migrate', async (req, res) => {
  const key = req.headers['x-admin-key'];
  if (key !== (process.env.JWT_SECRET || 'mediconnect_dev_secret_2024')) {
    return res.status(403).json({ success: false, message: 'Clé invalide' });
  }
  const results = [];
  try {
    // 1. Contrainte roles
    await db(`ALTER TABLE utilisateurs DROP CONSTRAINT IF EXISTS utilisateurs_role_check`);
    await db(`ALTER TABLE utilisateurs ADD CONSTRAINT utilisateurs_role_check CHECK (role IN ('patient','clinique','medecin','medecin_independant','medecin_conseil','medecin_prive','pharmacie','livreur','admin','assureur','imagerie','laboratoire','ministere','ministere_sante','optique'))`);
    results.push('✅ Contrainte roles mise à jour');

    // 2. Compte optique
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('demo1234', 10);
    await db(`INSERT INTO utilisateurs (id,email,password,role,prenom,nom,is_active) VALUES (gen_random_uuid(),'optique@demo.ci',$1,'optique','Cabinet','Optique Demo',true) ON CONFLICT (email) DO UPDATE SET role='optique'`, [hash]);
    results.push('✅ Compte optique@demo.ci');

    // 3. Tables MediConnect Card
    const cardTables = [
      `CREATE TABLE IF NOT EXISTS mediconnect_cards (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), numero_carte VARCHAR(20) UNIQUE NOT NULL, qr_code_data TEXT, statut VARCHAR(20) DEFAULT 'non_liee', solde DECIMAL(12,2) DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS mediconnect_accounts (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID, numero_compte VARCHAR(20) UNIQUE NOT NULL, carte_id UUID, numero_carte VARCHAR(20), prenom VARCHAR(100) NOT NULL, nom VARCHAR(100) NOT NULL, telephone VARCHAR(30), email VARCHAR(200), adresse TEXT, ville VARCHAR(100), pays_code VARCHAR(5) DEFAULT 'CI', date_naissance DATE, photo_url TEXT, groupe_sanguin VARCHAR(10), allergies TEXT, statut VARCHAR(20) DEFAULT 'actif', niveau VARCHAR(20) DEFAULT 'standard', solde DECIMAL(12,2) DEFAULT 0, points_fidelite INTEGER DEFAULT 0, date_linkage TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS contacts_urgence (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), account_id UUID, ordre INTEGER DEFAULT 1, prenom VARCHAR(100) NOT NULL, nom VARCHAR(100) NOT NULL, telephone VARCHAR(30) NOT NULL, relation VARCHAR(50), telephone_2 VARCHAR(30), email VARCHAR(200), est_principal BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS recharges_card (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), account_id UUID, carte_id UUID, montant DECIMAL(12,2) NOT NULL, mode_paiement VARCHAR(50) DEFAULT 'Wave', reference_paiement VARCHAR(100), statut VARCHAR(20) DEFAULT 'success', solde_avant DECIMAL(12,2) DEFAULT 0, solde_apres DECIMAL(12,2) DEFAULT 0, notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS transactions_card (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), account_id UUID, carte_id UUID, type VARCHAR(30) NOT NULL, montant DECIMAL(12,2) NOT NULL, sens VARCHAR(10) DEFAULT 'debit', solde_avant DECIMAL(12,2) DEFAULT 0, solde_apres DECIMAL(12,2) DEFAULT 0, prestataire_id UUID, prestataire_nom VARCHAR(200), prestataire_type VARCHAR(50), description TEXT, reference VARCHAR(100), created_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS scans_qr_card (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), carte_id UUID, account_id UUID, scanner_ip VARCHAR(50), scanner_info TEXT, localisation TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`,
      `INSERT INTO mediconnect_cards (numero_carte,statut,solde) VALUES ('MC-CI-2024-000001','non_liee',0),('MC-CI-2024-000002','non_liee',0),('MC-CI-2024-000003','non_liee',0),('MC-CI-2024-000004','non_liee',0),('MC-CI-2024-000005','non_liee',0) ON CONFLICT DO NOTHING`,
    ];
    for (const sql of cardTables) { await db(sql); }
    results.push('✅ Tables MediConnect Card créées');

    // 4. Tables Optique
    const optTables = [
      `CREATE TABLE IF NOT EXISTS cabinets_optiques (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID, nom VARCHAR(200) NOT NULL, adresse TEXT, ville VARCHAR(100), telephone VARCHAR(30), email VARCHAR(200), is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS patients_optiques (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), cabinet_id UUID, prenom VARCHAR(100) NOT NULL, nom VARCHAR(100) NOT NULL, date_naissance DATE, telephone VARCHAR(30), email VARCHAR(200), adresse TEXT, ville VARCHAR(100), assurance VARCHAR(100), numero_police VARCHAR(100), taux_prise_en_charge INTEGER DEFAULT 0, od_sphere DECIMAL(5,2), od_cylindre DECIMAL(5,2), od_axe INTEGER, og_sphere DECIMAL(5,2), og_cylindre DECIMAL(5,2), og_axe INTEGER, addition DECIMAL(4,2), ecart_pupillaire DECIMAL(5,1), notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS ordonnances_optiques (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), cabinet_id UUID, patient_id UUID, patient_nom VARCHAR(200), medecin_prescripteur VARCHAR(200), date_prescription DATE DEFAULT CURRENT_DATE, date_validite DATE, od_sphere DECIMAL(5,2), od_cylindre DECIMAL(5,2), od_axe INTEGER, od_addition DECIMAL(4,2), og_sphere DECIMAL(5,2), og_cylindre DECIMAL(5,2), og_axe INTEGER, og_addition DECIMAL(4,2), ecart_pupillaire_vl DECIMAL(5,1), ecart_pupillaire_vp DECIMAL(5,1), type_correction VARCHAR(50) DEFAULT 'unifocal', diagnostic_ophtalmologique TEXT, notes TEXT, statut VARCHAR(20) DEFAULT 'active', created_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS stock_montures (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), cabinet_id UUID, reference VARCHAR(100), marque VARCHAR(100) NOT NULL, modele VARCHAR(100), couleur VARCHAR(50), taille VARCHAR(20), materiau VARCHAR(50), genre VARCHAR(20) DEFAULT 'mixte', quantite INTEGER DEFAULT 0, seuil_alerte INTEGER DEFAULT 2, prix_achat DECIMAL(10,2), prix_vente DECIMAL(10,2) NOT NULL, fournisseur VARCHAR(200), is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS stock_verres (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), cabinet_id UUID, reference VARCHAR(100), marque VARCHAR(100) NOT NULL, type_verre VARCHAR(50) NOT NULL, indice DECIMAL(4,2), traitement VARCHAR(200), teinte VARCHAR(50), quantite INTEGER DEFAULT 0, seuil_alerte INTEGER DEFAULT 2, prix_achat DECIMAL(10,2), prix_vente_paire DECIMAL(10,2) NOT NULL, fournisseur VARCHAR(200), is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS stock_accessoires_optiques (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), cabinet_id UUID, nom VARCHAR(200) NOT NULL, categorie VARCHAR(100), quantite INTEGER DEFAULT 0, seuil_alerte INTEGER DEFAULT 5, prix_achat DECIMAL(10,2), prix_vente DECIMAL(10,2) NOT NULL, fournisseur VARCHAR(200), is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS ventes_optiques (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), reference VARCHAR(50) UNIQUE NOT NULL, cabinet_id UUID, patient_id UUID, patient_nom VARCHAR(200) NOT NULL, montant_total DECIMAL(12,2) DEFAULT 0, montant_net DECIMAL(12,2) DEFAULT 0, est_assure BOOLEAN DEFAULT false, assurance VARCHAR(100), montant_assurance DECIMAL(10,2) DEFAULT 0, montant_patient DECIMAL(10,2) DEFAULT 0, mode_paiement VARCHAR(50) DEFAULT 'Espèces', acompte_verse DECIMAL(10,2) DEFAULT 0, solde_restant DECIMAL(10,2) DEFAULT 0, statut_paiement VARCHAR(30) DEFAULT 'en_attente', statut VARCHAR(30) DEFAULT 'en_cours', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS factures_optiques (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), reference VARCHAR(50) UNIQUE NOT NULL, cabinet_id UUID, vente_id UUID, patient_nom VARCHAR(200) NOT NULL, montant_total DECIMAL(12,2) DEFAULT 0, montant_assurance DECIMAL(10,2) DEFAULT 0, montant_patient DECIMAL(10,2) DEFAULT 0, montant_paye DECIMAL(12,2) DEFAULT 0, statut VARCHAR(30) DEFAULT 'emise', mode_paiement VARCHAR(50) DEFAULT 'Espèces', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS assurances_optiques (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), reference VARCHAR(50) UNIQUE NOT NULL, cabinet_id UUID, patient_nom VARCHAR(200) NOT NULL, compagnie VARCHAR(100) NOT NULL, montant_total_soumis DECIMAL(10,2) DEFAULT 0, montant_pris_en_charge DECIMAL(10,2) DEFAULT 0, ticket_moderateur DECIMAL(10,2) DEFAULT 0, statut VARCHAR(30) DEFAULT 'soumis', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS fournisseurs_optiques (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), cabinet_id UUID, nom VARCHAR(200) NOT NULL, telephone VARCHAR(30), email VARCHAR(200), categorie VARCHAR(50), is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS specialites_clinique (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), clinique_id UUID NOT NULL, nom VARCHAR(200) NOT NULL, description TEXT, tarif_consultation DECIMAL(10,2), disponible BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT NOW())`,
    ];
    for (const sql of optTables) { await db(sql).catch(()=>{}); }
    results.push('✅ Tables Optique créées');

    // Créer compte medecin résident démo
    const hashM2 = await bcrypt.hash('demo1234', 10);
    await db(`INSERT INTO utilisateurs (id,email,password,role,prenom,nom,is_active) VALUES (gen_random_uuid(),'medecin@demo.ci',$1,'medecin','Dr. Kofi','Asante',true) ON CONFLICT (email) DO UPDATE SET role='medecin'`, [hashM2]);
    results.push('✅ Compte medecin@demo.ci (Médecin Résident)');

    res.json({ success: true, results, message: 'Migration complète' });
  } catch(e) { res.status(500).json({ success: false, message: e.message, results }); }
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
  // La fiche medecins n'a ni colonne telephone ni email -- son contact
  // est cense etre porte par un compte utilisateurs lie. Ce compte
  // n'etait auparavant JAMAIS cree : le formulaire "Nouveau medecin"
  // remplissait la fiche mais le medecin ne pouvait jamais se
  // connecter. Corrige : si un mot de passe est fourni, le compte de
  // connexion (sous_role='medecin') est cree dans la meme requete.
  const { prenom, nom, specialite, tarif, experience_ans, jours_travail, horaires_debut, horaires_fin, email, password, telephone } = req.body;
  if (!prenom||!nom||!specialite) return res.status(400).json({ success:false, message:'Prénom, nom et spécialité requis' });
  try {
    const joursArray = Array.isArray(jours_travail)
      ? jours_travail
      : (jours_travail || 'Lun,Mar,Mer,Jeu,Ven').split(',').map(s => s.trim()).filter(Boolean);
    const r = await db(
      'INSERT INTO medecins (id,clinique_id,prenom,nom,specialite,tarif,experience_ans,jours_travail,horaires_debut,horaires_fin) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
      [uuid(), req.user?.clinique_id, prenom, nom, specialite, tarif||null, experience_ans||null, joursArray, horaires_debut||'08:00', horaires_fin||'17:00']
    );
    const medecin = r.rows[0];

    // Disponibilites generees immediatement, a partir des horaires deja
    // saisis dans ce meme formulaire -- le medecin est reservable des sa
    // creation, sans etape manuelle supplementaire.
    genererDisponibilitesMedecin(medecin).catch(() => {});

    let compteCree = false, compteMessage = null;
    if (email && password) {
      const exists = await db('SELECT id FROM utilisateurs WHERE email=$1', [email]);
      if (exists.rows.length) {
        compteMessage = 'Fiche médecin créée, mais cet email a déjà un compte — compte de connexion non recréé.';
      } else if (password.length < 6) {
        compteMessage = 'Fiche médecin créée, mais le mot de passe doit faire au moins 6 caractères — compte de connexion non créé.';
      } else {
        const bcrypt = require('bcryptjs');
        const hash = await bcrypt.hash(password, 10);
        await db(
          `INSERT INTO utilisateurs (id,email,password,prenom,nom,role,telephone,clinique_id,sous_role,is_active)
           VALUES (gen_random_uuid(),$1,$2,$3,$4,'clinique',$5,$6,'medecin',true)`,
          [email, hash, prenom, nom, telephone||null, req.user?.clinique_id]
        );
        compteCree = true;
      }
    }

    res.status(201).json({ success:true, data: medecin, compteCree, compteMessage });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.put('/api/medecins/:id', auth, async (req, res) => {
  const { prenom, nom, specialite, statut, tarif, experience_ans, jours_travail, horaires_debut, horaires_fin } = req.body;
  try {
    // Meme correction que POST : convertir en tableau JS uniquement si une
    // valeur est fournie, sinon null pour laisser COALESCE garder l'ancienne.
    const joursArrayMaj = jours_travail == null ? null
      : (Array.isArray(jours_travail) ? jours_travail : jours_travail.split(',').map(s => s.trim()).filter(Boolean));
    const r = await db(
      'UPDATE medecins SET prenom=COALESCE($1,prenom),nom=COALESCE($2,nom),specialite=COALESCE($3,specialite),statut=COALESCE($4,statut),tarif=COALESCE($5,tarif),experience_ans=COALESCE($6,experience_ans),jours_travail=COALESCE($7,jours_travail),horaires_debut=COALESCE($8,horaires_debut),horaires_fin=COALESCE($9,horaires_fin),updated_at=NOW() WHERE id=$10 RETURNING *',
      [prenom,nom,specialite,statut,tarif,experience_ans,joursArrayMaj,horaires_debut,horaires_fin,req.params.id]
    );
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.delete('/api/medecins/:id', auth, async (req, res) => {
  try { await db('DELETE FROM medecins WHERE id=$1', [req.params.id]); res.json({ success:true }); }
  catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ── PATIENTS ──────────────────────────────────────────────────────
app.use("/api/patients", require("./routes/patients_mobile"));
app.get('/api/patients', auth, async (req, res) => {
  try {
    const cid = req.user?.clinique_id;
    const { q } = req.query;
    // FAILLE CONFIDENTIALITE CORRIGEE (historique) : toute clinique
    // voyait TOUS les patients de TOUTES les cliniques.
    // ELARGI ENSUITE : l'identite patient est PORTABLE dans le reseau
    // (carte MediConnect utilisable dans n'importe quelle clinique, pas
    // seulement celle d'origine) -- un patient devient visible ici dès
    // qu'il a ete reellement traite par cette clinique (consultation,
    // rendez-vous ou facture existante), meme si son clinique_id
    // d'origine est different. Une clinique qui n'a jamais eu de
    // contact avec un patient ne peut toujours pas le parcourir.
    let sql, params = [];
    if (q) {
      params.push('%'+q.toLowerCase()+'%');
      sql = `SELECT * FROM patients WHERE (LOWER(prenom) LIKE $1 OR LOWER(nom) LIKE $1 OR telephone LIKE $1 OR LOWER(code_secret) LIKE $1)`;
      if (cid) {
        params.push(cid);
        const n = params.length;
        sql += ` AND (clinique_id=$${n} OR clinique_id IS NULL
          OR EXISTS (SELECT 1 FROM consultations c WHERE c.patient_id=patients.id AND c.clinique_id=$${n})
          OR EXISTS (SELECT 1 FROM rendez_vous rv WHERE rv.patient_id=patients.id AND rv.clinique_id=$${n})
          OR EXISTS (SELECT 1 FROM factures f WHERE f.patient_id=patients.id AND f.clinique_id=$${n}))`;
      }
      sql += ' ORDER BY nom,prenom LIMIT 100';
    } else {
      sql = 'SELECT * FROM patients WHERE 1=1';
      if (cid) {
        params.push(cid);
        const n = params.length;
        sql += ` AND (clinique_id=$${n} OR clinique_id IS NULL
          OR EXISTS (SELECT 1 FROM consultations c WHERE c.patient_id=patients.id AND c.clinique_id=$${n})
          OR EXISTS (SELECT 1 FROM rendez_vous rv WHERE rv.patient_id=patients.id AND rv.clinique_id=$${n})
          OR EXISTS (SELECT 1 FROM factures f WHERE f.patient_id=patients.id AND f.clinique_id=$${n}))`;
      }
      sql += ' ORDER BY created_at DESC NULLS LAST, nom, prenom LIMIT 1000';
    }
    const r = await db(sql, params);
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.get('/api/patients/recherche', auth, async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).json({ success:false, message:'Code requis' });
    const r = await db('SELECT * FROM patients WHERE UPPER(code_secret)=UPPER($1) LIMIT 1', [code]);
    res.json({ success:true, data:r.rows[0]||null });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.get('/api/patients/:id', auth, async (req, res) => {
  try { const r = await db('SELECT * FROM patients WHERE id=$1', [req.params.id]); res.json({ success:true, data:r.rows[0]||null }); }
  catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
// Recherche par code dossier EXACT (ex: MC-KT-5069) — utilisee par le
// personnel labo/imagerie/clinique pour identifier un patient sans
// naviguer dans une liste. Correspondance exacte uniquement (pas de LIKE) :
// un labo doit connaitre le code precis, pas le deviner par tatonnement,
// comme presenter une carte physique plutot que la decrire.
app.get('/api/patients/by-code/:code', auth, async (req, res) => {
  try {
    const code = (req.params.code || '').trim().toUpperCase();
    if (!code) return res.status(400).json({ success:false, message:'Code requis' });
    const r = await db('SELECT * FROM patients WHERE UPPER(code_secret)=$1 LIMIT 1', [code]);
    if (!r.rows.length) return res.status(404).json({ success:false, message:'Aucun patient avec ce code' });
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.post('/api/patients', auth, async (req, res) => {
  const { prenom, nom, telephone, email, date_naissance, groupe_sanguin, allergies, antecedents, ville, assurance, numero_police, assureur_id, formule_assurance_id } = req.body;
  if (!prenom||!nom) return res.status(400).json({ success:false, message:'Prénom et nom requis' });
  try {
    const code = 'MC-'+(prenom[0]+nom[0]).toUpperCase()+'-'+Math.floor(1000+Math.random()*9000);
    const patientId = uuid();
    // BUG CRITIQUE CORRIGE : la table patients n'a pas de colonne clinique_id
    // (le patient est un dossier partage entre cliniques, rattache via
    // consultations/factures/rendez_vous, pas directement). L'INSERT
    // precedent la visait quand meme -> "column clinique_id does not
    // exist" -> AUCUNE creation de patient ne fonctionnait, pour aucune
    // clinique, depuis l'origine.
    const r = await db(
      'INSERT INTO patients (id,code_secret,prenom,nom,telephone,email,date_naissance,groupe_sanguin,allergies,antecedents,ville,assurance,numero_police,clinique_id,assureur_id,formule_assurance_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *',
      [patientId, code, prenom, nom, telephone||null, email||null, vd(date_naissance), groupe_sanguin||null, allergies||null, antecedents||null, ville||null, assurance||null, numero_police||null, req.user?.clinique_id||null, assureur_id||null, formule_assurance_id||null]
    );

    // Liaison automatique : si ce numero correspond a un compte de
    // connexion (app patient / rdv-site) encore orphelin, on le relie
    // desormais a ce dossier -- comparaison sur les 8 derniers chiffres
    // pour absorber les differences d'indicatif +225 / zero initial.
    if (telephone) {
      db(
        `UPDATE utilisateurs SET patient_id=$1
          WHERE role='patient' AND patient_id IS NULL
            AND RIGHT(regexp_replace(telephone, '[^0-9]', '', 'g'), 8) = RIGHT(regexp_replace($2, '[^0-9]', '', 'g'), 8)`,
        [patientId, telephone]
      ).catch(() => {});
    }

    // Retourner explicitement le code_secret pour affichage
    res.status(201).json({ success:true, data:{ ...r.rows[0], code_secret:code } });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ══════════════════════════════════════════════════════════════════
//  RBAC PERSONNEL CLINIQUE
// ══════════════════════════════════════════════════════════════════
// sous_role : NULL = acces complet (compte historique/proprietaire).
// Valeurs possibles : bureau_entrees, medecin, finance, rh.
// Le compte personnel recoit le MEME clinique_id que le proprietaire
// (pas proprietaire_clinique_id, reserve a la vue financiere du
// proprietaire) : ainsi les 39+ routes existantes qui filtrent par
// req.user.clinique_id fonctionnent sans modification.
const SOUS_ROLES_VALIDES = ['bureau_entrees', 'medecin', 'finance', 'rh', 'pharmacien', 'laboratoire', 'radiologie'];

// ── FAILLE CRITIQUE CORRIGEE : "if (!sr) return next()" laissait
// passer N'IMPORTE QUEL compte sans sous_role -- pense pour les
// proprietaires de clinique (role='clinique', sous_role NULL = acces
// complet), mais un PATIENT n'a JAMAIS de sous_role non plus. Un
// patient passait donc cette verification exactement comme un
// proprietaire, sur TOUTES les routes protegees par requireSousRole
// (ordonnances, consultations, prise-en-charge...) -- fuite totale
// des donnees medicales de tous les patients vers tous les patients.
// Corrige : le bypass "compte complet" ne s'applique desormais qu'aux
// vrais comptes clinique (role==='clinique'), jamais aux patients ni
// a aucun autre role sans sous_role.
function requireSousRole(...autorises) {
  return (req, res, next) => {
    const role = req.user?.role;
    const sr = req.user?.sous_role;
    if (role === 'clinique' && !sr) return next(); // proprietaire clinique, acces complet
    if (sr && autorises.includes(sr)) return next();
    return res.status(403).json({ success:false, message:"Accès refusé pour votre rôle" });
  };
}

app.post('/api/admin/init-rbac-clinique', async (req, res) => {
  if (req.headers['x-admin-key'] !== 'mediconnect_dev_secret_2024')
    return res.status(403).json({ success:false });
  try {
    await db("ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS sous_role VARCHAR(30)");
    res.json({ success:true, message:'Colonne sous_role prête' });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// Creation d'un compte de personnel, reserve aux comptes a acces complet
// (sous_role NULL) : un bureau_entrees ne peut pas creer d'autres comptes.
app.post('/api/clinique/personnel', auth, requireSousRole(), async (req, res) => {
  const { prenom, nom, email, password, telephone, sous_role } = req.body;
  if (!prenom || !nom || !email || !password) {
    return res.status(400).json({ success:false, message:'Prénom, nom, email et mot de passe requis' });
  }
  if (!SOUS_ROLES_VALIDES.includes(sous_role)) {
    return res.status(400).json({ success:false, message:`sous_role doit être l'un de : ${SOUS_ROLES_VALIDES.join(', ')}` });
  }
  const cid = req.user?.clinique_id;
  if (!cid) return res.status(400).json({ success:false, message:'Compte non rattaché à une clinique' });
  try {
    const exists = await db('SELECT id FROM utilisateurs WHERE email=$1', [email]);
    if (exists.rows.length) return res.status(409).json({ success:false, message:'Email déjà utilisé' });
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash(password, 10);
    const r = await db(
      `INSERT INTO utilisateurs (id,email,password,prenom,nom,role,telephone,clinique_id,sous_role,is_active)
       VALUES (gen_random_uuid(),$1,$2,$3,$4,'clinique',$5,$6,$7,true) RETURNING id,email,prenom,nom,sous_role,clinique_id`,
      [email, hash, prenom, nom, telephone||null, cid, sous_role]
    );
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// Liste du personnel de la clinique (comptes lies au meme clinique_id,
// sous_role non nul)
app.get('/api/clinique/personnel', auth, requireSousRole(), async (req, res) => {
  const cid = req.user?.clinique_id;
  if (!cid) return res.json({ success:true, data:[] });
  try {
    const r = await db(
      `SELECT id,email,prenom,nom,telephone,sous_role,is_active,created_at
         FROM utilisateurs WHERE clinique_id=$1 AND sous_role IS NOT NULL
        ORDER BY created_at DESC`,
      [cid]
    );
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});

app.put('/api/clinique/personnel/:id', auth, requireSousRole(), async (req, res) => {
  const { prenom, nom, email, telephone, sous_role, is_active } = req.body;
  if (sous_role && !SOUS_ROLES_VALIDES.includes(sous_role)) {
    return res.status(400).json({ success:false, message:`sous_role doit être l'un de : ${SOUS_ROLES_VALIDES.join(', ')}` });
  }
  const cid = req.user?.clinique_id;
  try {
    if (email) {
      const exists = await db('SELECT id FROM utilisateurs WHERE email=$1 AND id<>$2', [email, req.params.id]);
      if (exists.rows.length) return res.status(409).json({ success:false, message:'Email déjà utilisé par un autre compte' });
    }
    // On ne modifie jamais un compte d'une AUTRE clinique, meme avec l'id exact.
    const r = await db(
      `UPDATE utilisateurs SET
         prenom=COALESCE($1,prenom), nom=COALESCE($2,nom), email=COALESCE($3,email),
         telephone=COALESCE($4,telephone), sous_role=COALESCE($5,sous_role), is_active=COALESCE($6,is_active)
        WHERE id=$7 AND clinique_id=$8 AND sous_role IS NOT NULL
        RETURNING id,email,prenom,nom,telephone,sous_role,is_active`,
      [prenom||null, nom||null, email||null, telephone||null, sous_role||null, is_active===undefined?null:is_active, req.params.id, cid]
    );
    if (!r.rows.length) return res.status(404).json({ success:false, message:'Compte introuvable dans votre clinique' });
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// Suppression definitive d'un compte de personnel de la clinique
// (jamais un compte d'une AUTRE clinique, meme avec l'id exact).
app.delete('/api/clinique/personnel/:id', auth, requireSousRole(), async (req, res) => {
  const cid = req.user?.clinique_id;
  try {
    const r = await db(
      `DELETE FROM utilisateurs WHERE id=$1 AND clinique_id=$2 AND sous_role IS NOT NULL RETURNING id`,
      [req.params.id, cid]
    );
    if (!r.rows.length) return res.status(404).json({ success:false, message:'Compte introuvable dans votre clinique' });
    res.json({ success:true });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// Reinitialisation du mot de passe d'un membre du personnel par
// l'administrateur de la clinique (proprietaire, sous_role NULL) --
// n'exige PAS l'ancien mot de passe, mais reste scope a SA clinique.
app.put('/api/clinique/personnel/:id/mot-de-passe', auth, requireSousRole(), async (req, res) => {
  const { nouveau_mot_de_passe } = req.body;
  if (!nouveau_mot_de_passe || nouveau_mot_de_passe.length < 6) {
    return res.status(400).json({ success:false, message:'Mot de passe : 6 caractères minimum' });
  }
  const cid = req.user?.clinique_id;
  try {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash(nouveau_mot_de_passe, 10);
    const r = await db(
      `UPDATE utilisateurs SET password=$1
        WHERE id=$2 AND clinique_id=$3 AND sous_role IS NOT NULL
        RETURNING id,email,prenom,nom`,
      [hash, req.params.id, cid]
    );
    if (!r.rows.length) return res.status(404).json({ success:false, message:'Compte introuvable dans votre clinique' });
    res.json({ success:true, data:r.rows[0], message:'Mot de passe réinitialisé' });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// Changement du mot de passe par l'utilisateur connecte lui-meme --
// exige l'ancien mot de passe (verifie par bcrypt.compare), pour tous
// profils confondus (clinique, medecin, bureau_entrees, etc.).
app.put('/api/mon-compte/mot-de-passe', auth, async (req, res) => {
  const { ancien_mot_de_passe, nouveau_mot_de_passe } = req.body;
  if (!ancien_mot_de_passe || !nouveau_mot_de_passe) {
    return res.status(400).json({ success:false, message:'Ancien et nouveau mot de passe requis' });
  }
  if (nouveau_mot_de_passe.length < 6) {
    return res.status(400).json({ success:false, message:'Nouveau mot de passe : 6 caractères minimum' });
  }
  try {
    const bcrypt = require('bcryptjs');
    const r = await db('SELECT password FROM utilisateurs WHERE id=$1', [req.user.id]);
    if (!r.rows.length) return res.status(404).json({ success:false, message:'Compte introuvable' });
    const ok = await bcrypt.compare(ancien_mot_de_passe, r.rows[0].password);
    if (!ok) return res.status(401).json({ success:false, message:'Ancien mot de passe incorrect' });
    const hash = await bcrypt.hash(nouveau_mot_de_passe, 10);
    await db('UPDATE utilisateurs SET password=$1 WHERE id=$2', [hash, req.user.id]);
    res.json({ success:true, message:'Mot de passe mis à jour' });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ══════════════════════════════════════════════════════════════════
//  ADMINISTRATION LABORATOIRE (Phase 3) -- meme schema que clinique,
//  scope sur laboratoire_id (Phase 2) au lieu de clinique_id.
//  requireSousRole() est generique (ne verifie que sous_role, jamais
//  l'etablissement) : reutilisable ici sans modification.
// ══════════════════════════════════════════════════════════════════
const SOUS_ROLES_VALIDES_LABORATOIRE = ['technicien', 'reception', 'biologiste'];

app.post('/api/laboratoire/personnel', auth, requireSousRole(), async (req, res) => {
  const { prenom, nom, email, password, telephone, sous_role } = req.body;
  const lid = req.user?.laboratoire_id;
  if (!lid) return res.status(400).json({ success:false, message:'Compte non rattaché à un laboratoire' });
  if (!prenom||!nom||!email||!password) return res.status(400).json({ success:false, message:'Prénom, nom, email et mot de passe requis' });
  if (!SOUS_ROLES_VALIDES_LABORATOIRE.includes(sous_role)) {
    return res.status(400).json({ success:false, message:`sous_role doit être l'un de : ${SOUS_ROLES_VALIDES_LABORATOIRE.join(', ')}` });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const r = await db(
      `INSERT INTO utilisateurs (id,email,password,prenom,nom,role,telephone,laboratoire_id,sous_role,is_active)
       VALUES (gen_random_uuid(),$1,$2,$3,$4,'laboratoire',$5,$6,$7,true) RETURNING id,email,prenom,nom,sous_role,laboratoire_id`,
      [email, hash, prenom, nom, telephone||null, lid, sous_role]
    );
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) {
    if (e.code === '23505') return res.status(409).json({ success:false, message:'Cet email est déjà utilisé' });
    res.status(500).json({ success:false, message:e.message });
  }
});
app.get('/api/laboratoire/personnel', auth, requireSousRole(), async (req, res) => {
  const lid = req.user?.laboratoire_id;
  try {
    const r = await db(
      `SELECT id,email,prenom,nom,telephone,sous_role,is_active,created_at
         FROM utilisateurs WHERE laboratoire_id=$1 AND sous_role IS NOT NULL
        ORDER BY created_at DESC`,
      [lid]
    );
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.put('/api/laboratoire/personnel/:id', auth, requireSousRole(), async (req, res) => {
  const { sous_role, is_active } = req.body;
  if (sous_role && !SOUS_ROLES_VALIDES_LABORATOIRE.includes(sous_role)) {
    return res.status(400).json({ success:false, message:`sous_role doit être l'un de : ${SOUS_ROLES_VALIDES_LABORATOIRE.join(', ')}` });
  }
  const lid = req.user?.laboratoire_id;
  try {
    const r = await db(
      `UPDATE utilisateurs SET sous_role=COALESCE($1,sous_role), is_active=COALESCE($2,is_active)
        WHERE id=$3 AND laboratoire_id=$4 AND sous_role IS NOT NULL RETURNING id,email,sous_role,is_active`,
      [sous_role||null, is_active===undefined?null:is_active, req.params.id, lid]
    );
    if (!r.rows.length) return res.status(404).json({ success:false, message:'Compte introuvable dans votre laboratoire' });
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ══════════════════════════════════════════════════════════════════
//  ADMINISTRATION IMAGERIE / PHARMACIE / ASSUREUR (Phase 4) -- meme
//  schema que laboratoire, seuls le champ FK et les sous-roles changent.
// ══════════════════════════════════════════════════════════════════
const SOUS_ROLES_VALIDES_IMAGERIE = ['technicien', 'reception', 'radiologue'];
const SOUS_ROLES_VALIDES_PHARMACIE = ['preparateur', 'caissier', 'pharmacien'];
const SOUS_ROLES_VALIDES_ASSUREUR = ['gestionnaire', 'agent', 'comptable'];

function routesPersonnel(prefixe, champFk, sousRolesValides) {
  app.post(`/api/${prefixe}/personnel`, auth, requireSousRole(), async (req, res) => {
    const { prenom, nom, email, password, telephone, sous_role } = req.body;
    const eid = req.user?.[champFk];
    if (!eid) return res.status(400).json({ success:false, message:`Compte non rattaché à un(e) ${prefixe}` });
    if (!prenom||!nom||!email||!password) return res.status(400).json({ success:false, message:'Prénom, nom, email et mot de passe requis' });
    if (!sousRolesValides.includes(sous_role)) {
      return res.status(400).json({ success:false, message:`sous_role doit être l'un de : ${sousRolesValides.join(', ')}` });
    }
    try {
      const hash = await bcrypt.hash(password, 10);
      const r = await db(
        `INSERT INTO utilisateurs (id,email,password,prenom,nom,role,telephone,${champFk},sous_role,is_active)
         VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,true) RETURNING id,email,prenom,nom,sous_role,${champFk}`,
        [email, hash, prenom, nom, prefixe, telephone||null, eid, sous_role]
      );
      res.status(201).json({ success:true, data:r.rows[0] });
    } catch(e) {
      if (e.code === '23505') return res.status(409).json({ success:false, message:'Cet email est déjà utilisé' });
      res.status(500).json({ success:false, message:e.message });
    }
  });
  app.get(`/api/${prefixe}/personnel`, auth, requireSousRole(), async (req, res) => {
    const eid = req.user?.[champFk];
    try {
      const r = await db(
        `SELECT id,email,prenom,nom,telephone,sous_role,is_active,created_at
           FROM utilisateurs WHERE ${champFk}=$1 AND sous_role IS NOT NULL
          ORDER BY created_at DESC`,
        [eid]
      );
      res.json({ success:true, data:r.rows });
    } catch(e) { res.json({ success:true, data:[] }); }
  });
  app.put(`/api/${prefixe}/personnel/:id`, auth, requireSousRole(), async (req, res) => {
    const { sous_role, is_active } = req.body;
    if (sous_role && !sousRolesValides.includes(sous_role)) {
      return res.status(400).json({ success:false, message:`sous_role doit être l'un de : ${sousRolesValides.join(', ')}` });
    }
    const eid = req.user?.[champFk];
    try {
      const r = await db(
        `UPDATE utilisateurs SET sous_role=COALESCE($1,sous_role), is_active=COALESCE($2,is_active)
          WHERE id=$3 AND ${champFk}=$4 AND sous_role IS NOT NULL RETURNING id,email,sous_role,is_active`,
        [sous_role||null, is_active===undefined?null:is_active, req.params.id, eid]
      );
      if (!r.rows.length) return res.status(404).json({ success:false, message:`Compte introuvable dans votre ${prefixe}` });
      res.json({ success:true, data:r.rows[0] });
    } catch(e) { res.status(500).json({ success:false, message:e.message }); }
  });
}
routesPersonnel('imagerie', 'imagerie_id', SOUS_ROLES_VALIDES_IMAGERIE);
routesPersonnel('pharmacie', 'pharmacie_id', SOUS_ROLES_VALIDES_PHARMACIE);
routesPersonnel('assureur', 'assureur_id', SOUS_ROLES_VALIDES_ASSUREUR);

// ══════════════════════════════════════════════════════════════════
//  COMPAGNIES D'ASSURANCE (liste de reference) + CONVENTIONS
//  (taux de couverture negocie par la clinique avec chaque compagnie)
// ══════════════════════════════════════════════════════════════════

// Liste de reference, ouverte a tous les comptes authentifies (utile
// pour peupler des menus deroulants patient/carte).
app.get('/api/assureurs-liste', auth, async (req, res) => {
  try {
    const r = await db("SELECT id,nom,taux_defaut FROM assureurs WHERE is_active IS NOT false ORDER BY nom");
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});

// Conventions de la clinique connectee : une ligne par assureur avec
// son taux negocie, plafond eventuel, periode de validite.
app.get('/api/conventions', auth, requireSousRole('bureau_entrees', 'finance', 'medecin'), async (req, res) => {
  const cid = req.user?.clinique_id;
  try {
    const r = await db(
      `SELECT c.*, a.nom AS assureur_nom
         FROM conventions c JOIN assureurs a ON a.id = c.assureur_id
        WHERE c.clinique_id=$1
        ORDER BY a.nom`,
      [cid]
    );
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});

app.post('/api/conventions', auth, requireSousRole('finance'), async (req, res) => {
  const { assureur_id, taux, plafond_acte, date_debut, date_fin } = req.body;
  const cid = req.user?.clinique_id;
  if (!assureur_id || taux === undefined) return res.status(400).json({ success:false, message:'assureur_id et taux requis' });
  if (!cid) return res.status(400).json({ success:false, message:'Compte non rattaché à une clinique' });
  try {
    const r = await db(
      `INSERT INTO conventions (id,assureur_id,clinique_id,taux,plafond_acte,date_debut,date_fin,is_active)
       VALUES (gen_random_uuid(),$1,$2,$3,$4,COALESCE($5,CURRENT_DATE),$6,true) RETURNING *`,
      [assureur_id, cid, parseInt(taux), plafond_acte||null, date_debut||null, date_fin||null]
    );
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) {
    if (e.code === '23505') return res.status(409).json({ success:false, message:'Une convention existe déjà pour cet assureur' });
    res.status(500).json({ success:false, message:e.message });
  }
});

app.put('/api/conventions/:id', auth, requireSousRole('finance'), async (req, res) => {
  const { taux, plafond_acte, date_debut, date_fin, is_active } = req.body;
  const cid = req.user?.clinique_id;
  try {
    const r = await db(
      `UPDATE conventions SET
         taux=COALESCE($1,taux), plafond_acte=COALESCE($2,plafond_acte),
         date_debut=COALESCE($3,date_debut), date_fin=COALESCE($4,date_fin),
         is_active=COALESCE($5,is_active)
       WHERE id=$6 AND clinique_id=$7 RETURNING *`,
      [taux??null, plafond_acte??null, date_debut||null, date_fin||null, is_active===undefined?null:is_active, req.params.id, cid]
    );
    if (!r.rows.length) return res.status(404).json({ success:false, message:'Convention introuvable dans votre clinique' });
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ══════════════════════════════════════════════════════════════════
//  COMPAGNIES D'ASSURANCE + FORMULES (taux reel = celui de la formule
//  personnelle du patient, independant de la clinique qui facture)
// ══════════════════════════════════════════════════════════════════

// CRUD compagnies -- ouvert a tout compte authentifie (donnee de
// reference partagee, pas propre a une clinique).
app.get('/api/assureurs', auth, async (req, res) => {
  try {
    const r = await db("SELECT * FROM assureurs WHERE is_active IS NOT false ORDER BY nom");
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.post('/api/assureurs', auth, async (req, res) => {
  const { nom, email, telephone, numero_agrement } = req.body;
  if (!nom) return res.status(400).json({ success:false, message:'nom requis' });
  try {
    const r = await db(
      "INSERT INTO assureurs (id,nom,email,telephone,numero_agrement,pays_code,is_active) VALUES (gen_random_uuid(),$1,$2,$3,$4,'CI',true) RETURNING *",
      [nom, email||null, telephone||null, numero_agrement||null]
    );
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.put('/api/assureurs/:id', auth, async (req, res) => {
  const { nom, email, telephone, numero_agrement, is_active } = req.body;
  try {
    const r = await db(
      `UPDATE assureurs SET nom=COALESCE($1,nom), email=COALESCE($2,email),
         telephone=COALESCE($3,telephone), numero_agrement=COALESCE($4,numero_agrement),
         is_active=COALESCE($5,is_active)
       WHERE id=$6 RETURNING *`,
      [nom||null, email||null, telephone||null, numero_agrement||null, is_active===undefined?null:is_active, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ success:false, message:'Compagnie introuvable' });
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// CRUD formules, groupees par compagnie -- le taux qui compte vraiment.
app.get('/api/formules-assurance', auth, async (req, res) => {
  const { assureur_id } = req.query;
  try {
    const r = assureur_id
      ? await db("SELECT * FROM formules_assurance WHERE assureur_id=$1 AND is_active IS NOT false ORDER BY taux_couverture", [assureur_id])
      : await db(
          `SELECT f.*, a.nom AS assureur_nom FROM formules_assurance f
             JOIN assureurs a ON a.id = f.assureur_id
            WHERE f.is_active IS NOT false ORDER BY a.nom, f.taux_couverture`
        );
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.post('/api/formules-assurance', auth, async (req, res) => {
  const { assureur_id, nom, prime_mensuelle, taux_couverture, plafond_annuel } = req.body;
  if (!assureur_id || !nom || taux_couverture===undefined) return res.status(400).json({ success:false, message:'assureur_id, nom et taux_couverture requis' });
  try {
    const r = await db(
      "INSERT INTO formules_assurance (id,assureur_id,nom,prime_mensuelle,taux_couverture,plafond_annuel,is_active) VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,true) RETURNING *",
      [assureur_id, nom, prime_mensuelle||null, parseInt(taux_couverture), plafond_annuel||null]
    );
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.put('/api/formules-assurance/:id', auth, async (req, res) => {
  const { nom, prime_mensuelle, taux_couverture, plafond_annuel, is_active } = req.body;
  try {
    const r = await db(
      `UPDATE formules_assurance SET nom=COALESCE($1,nom), prime_mensuelle=COALESCE($2,prime_mensuelle),
         taux_couverture=COALESCE($3,taux_couverture), plafond_annuel=COALESCE($4,plafond_annuel),
         is_active=COALESCE($5,is_active)
       WHERE id=$6 RETURNING *`,
      [nom||null, prime_mensuelle??null, taux_couverture??null, plafond_annuel??null, is_active===undefined?null:is_active, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ success:false, message:'Formule introuvable' });
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.delete('/api/formules-assurance/:id', auth, async (req, res) => {
  try {
    const r = await db("UPDATE formules_assurance SET is_active=false WHERE id=$1 RETURNING *", [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ success:false, message:'Formule introuvable' });
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.put('/api/patients/:id', auth, async (req, res) => {
  const { prenom, nom, telephone, email, groupe_sanguin, allergies, antecedents, assurance, numero_police, assureur_id, formule_assurance_id, antecedents_critiques, traitements_sensibles } = req.body;
  try {
    // Le taux reel vient de formule_assurance_id (la formule PRECISE du
    // patient, prime + taux correspondant) -- assureur_id/assurance
    // restent pour l'affichage rapide (quelle compagnie) sans devoir
    // toujours joindre la formule. "" retire (non-assure), distinct de
    // undefined qui laisse la valeur actuelle inchangee.
    // antecedents_critiques/traitements_sensibles : champs DEDIES a la
    // fiche d'urgence publique, distincts d'antecedents (historique
    // general, pas adapte a un affichage rapide par un inconnu).
    const r = await db(
      `UPDATE patients SET prenom=COALESCE($1,prenom),nom=COALESCE($2,nom),telephone=COALESCE($3,telephone),
         email=COALESCE($4,email),groupe_sanguin=COALESCE($5,groupe_sanguin),allergies=COALESCE($6,allergies),
         antecedents=COALESCE($7,antecedents),assurance=COALESCE($8,assurance),numero_police=COALESCE($9,numero_police),
         assureur_id=CASE WHEN $10::text IS NULL THEN assureur_id WHEN $10='' THEN NULL ELSE $10::uuid END,
         formule_assurance_id=CASE WHEN $11::text IS NULL THEN formule_assurance_id WHEN $11='' THEN NULL ELSE $11::uuid END,
         antecedents_critiques=COALESCE($12,antecedents_critiques),
         traitements_sensibles=COALESCE($13,traitements_sensibles),
         updated_at=NOW() WHERE id=$14 RETURNING *`,
      [prenom,nom,telephone,email,groupe_sanguin,allergies,antecedents,assurance,numero_police,
       assureur_id===undefined?null:assureur_id, formule_assurance_id===undefined?null:formule_assurance_id,
       antecedents_critiques, traitements_sensibles, req.params.id]
    );
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ── RENDEZ-VOUS ───────────────────────────────────────────────────
// ── FAILLE CRITIQUE CORRIGEE : cette route ne filtrait que par
// clinique_id. Pour un PATIENT (clinique_id toujours null), la
// condition "if (cid)" etait fausse et AUCUN filtre n'etait applique
// -- la requete devenait "SELECT * FROM rendez_vous ... LIMIT 200" et
// retournait les RDV de TOUS les patients de TOUTES les cliniques.
// Corrige : filtre desormais par patient_id quand l'utilisateur est
// un patient, et refuse l'acces par defaut (tableau vide) si ni
// clinique_id ni patient_id ne sont disponibles -- jamais d'acces
// total implicite.
app.get('/api/rendez-vous', auth, async (req, res) => {
  try {
    const { date, statut, medecin_id } = req.query;
    const cid = req.user?.clinique_id;
    const pid = req.user?.patient_id;
    if (!cid && !pid) return res.json({ success:true, data:[] });

    let sql = 'SELECT * FROM rendez_vous WHERE 1=1'; const p = [];
    if (cid)       { p.push(cid);       sql+=` AND clinique_id=$${p.length}`; }
    if (pid)       { p.push(pid);       sql+=` AND patient_id=$${p.length}`; }
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
app.get('/api/consultations', auth, requireSousRole('medecin'), async (req, res) => {
  try {
    const { patient_id } = req.query; const cid = req.user?.clinique_id;
    let sql='SELECT * FROM consultations WHERE 1=1'; const p=[];
    if (patient_id) {
      p.push(patient_id); sql+=` AND patient_id=$${p.length}`;
      // Confidentialite : une consultation n'est visible pour une AUTRE
      // clinique que si elle a ete explicitement partagee. La clinique
      // qui l'a creee voit toujours tout, sans restriction.
      p.push(cid||null); sql+=` AND (clinique_id=$${p.length} OR partage_reseau=true)`;
    }
    else if (cid)   { p.push(cid);        sql+=` AND clinique_id=$${p.length}`; }
    sql+=' ORDER BY created_at DESC LIMIT 100';
    const r = await db(sql,p); res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.post('/api/consultations', auth, requireSousRole('medecin'), async (req, res) => {
  const {
    patient_id, diagnostic, traitement, notes, tension_arterielle, temperature, poids, taille,
    rdv_id, pathologie, age_patient, sexe_patient, gravite, medecin_nom, code_cim10, passage_id,
    motif, hdm_antecedents, examen_clinique, hypotheses_diagnostiques,
    pouls, imc, pc, fr, tso2, pb, pcui,
    biologie_predefinis, biologie_texte, imagerie_texte, autres_examens,
    diagnostic_predefini, traitement_predefini, date_controle,
  } = req.body;
  if (!patient_id||!diagnostic) return res.status(400).json({ success:false, message:'Patient et diagnostic requis' });
  try {
    const mid = req.user?.medecin_id || null;
    const imcCalc = imc || ((poids && taille) ? (parseFloat(poids) / Math.pow(parseFloat(taille) / 100, 2)).toFixed(1) : null);
    const r = await db(
      `INSERT INTO consultations (
        id,patient_id,clinique_id,medecin_id,diagnostic,traitement,notes,note_finale,
        tension_arterielle,ta,temperature,poids,taille,rdv_id,pathologie,age_patient,sexe_patient,
        gravite,pays_code,date_consult,date_consultation,medecin_nom,code_cim10,
        motif,hdm_antecedents,examen_clinique,hypotheses_diagnostiques,
        pouls,imc,pc,fr,tso2,pb,pcui,
        biologie_predefinis,biologie_texte,imagerie_texte,autres_examens,
        diagnostic_predefini,traitement_predefini,date_controle,passage_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,$42)
      RETURNING *`,
      [
        uuid(),patient_id,req.user?.clinique_id,mid,diagnostic,traitement||null,notes||null,notes||null,
        tension_arterielle||null,tension_arterielle||null,temperature||null,poids?parseFloat(poids):null,taille?parseInt(taille):null,
        rdv_id||null,pathologie||null,age_patient?parseInt(age_patient):null,sexe_patient||null,
        gravite||'modere','CI',new Date().toISOString().split('T')[0],new Date().toISOString().split('T')[0],medecin_nom||null,code_cim10||null,
        motif||null,hdm_antecedents||null,examen_clinique||null,hypotheses_diagnostiques||null,
        pouls||null,imcCalc,pc||null,fr||null,tso2||null,pb||null,pcui||null,
        biologie_predefinis||null,biologie_texte||null,imagerie_texte||null,autres_examens||null,
        diagnostic_predefini||null,traitement_predefini||null,date_controle||null,passage_id||null,
      ]
    );
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// Champs cliniques modifiables apres coup. Volontairement exclus :
// id, patient_id, clinique_id, medecin_id, created_at, statut (ce dernier
// change via /annuler, pas via une modification de champ classique) --
// on ne veut jamais qu'une modification de routine puisse deplacer un
// dossier vers un autre patient ou effacer discretement son statut.
const CHAMPS_MODIFIABLES_CONSULTATION = [
  'motif','ta','fc','spo2','temperature','poids','taille','examen_clinique',
  'diagnostic','code_cim10','note_finale','pathologie','categorie_maladie',
  'gravite','traitement','notes','tension_arterielle','hdm_antecedents',
  'hypotheses_diagnostiques','pouls','imc','pc','fr','tso2','pb','pcui',
  'biologie_predefinis','biologie_texte','imagerie_texte','autres_examens',
  'diagnostic_predefini','traitement_predefini','date_controle',
];

// ── Modifier une consultation existante : jamais silencieux. Chaque
// champ reellement change est compare a l'ancienne valeur et journalise
// avec un horodatage a la seconde (TIMESTAMPTZ) dans
// consultations_historique, avant que la mise a jour ne soit appliquee.
app.put('/api/consultations/:id', auth, requireSousRole('medecin', 'bureau_entrees'), async (req, res) => {
  try {
    const ancienne = await db('SELECT * FROM consultations WHERE id=$1', [req.params.id]);
    if (!ancienne.rows.length) return res.status(404).json({ success:false, message:'Consultation introuvable' });
    const avant = ancienne.rows[0];

    const champsModifies = {};
    const setClauses = [];
    const params = [];
    let idx = 1;
    for (const champ of CHAMPS_MODIFIABLES_CONSULTATION) {
      if (!(champ in req.body)) continue;
      const nouvelleValeur = req.body[champ];
      const ancienneValeur = avant[champ];
      // Comparaison en string pour eviter les faux positifs numeriques
      // (ex: 70 vs "70") qui journaliseraient un "changement" fictif.
      if (String(ancienneValeur ?? '') === String(nouvelleValeur ?? '')) continue;
      champsModifies[champ] = { avant: ancienneValeur, apres: nouvelleValeur };
      setClauses.push(`${champ}=$${idx++}`);
      params.push(nouvelleValeur === '' ? null : nouvelleValeur);
    }

    if (!Object.keys(champsModifies).length) {
      return res.json({ success:true, data:avant, message:'Aucun changement détecté' });
    }

    setClauses.push('updated_at=NOW()');
    params.push(req.params.id);
    const r = await db(
      `UPDATE consultations SET ${setClauses.join(',')} WHERE id=$${idx} RETURNING *`,
      params
    );

    await db(
      `INSERT INTO consultations_historique (consultation_id,medecin_id,medecin_nom,type_action,champs_modifies)
       VALUES ($1,$2,$3,'modification',$4)`,
      [req.params.id, req.user?.medecin_id||null, req.body.medecin_nom||null, JSON.stringify(champsModifies)]
    );

    res.json({ success:true, data:r.rows[0], champs_modifies:Object.keys(champsModifies) });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ── Historique des modifications d'une consultation, le plus recent
// d'abord. Chaque entree est datee a la seconde.
app.get('/api/consultations/:id/historique', auth, requireSousRole('medecin'), async (req, res) => {
  try {
    const r = await db(
      `SELECT * FROM consultations_historique WHERE consultation_id=$1 ORDER BY modifie_le DESC`,
      [req.params.id]
    );
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});

// ── Annulation douce : jamais de suppression physique d'un dossier
// medical. La consultation reste visible dans l'historique, marquee
// annulee, avec la raison journalisee comme toute autre modification.
app.post('/api/consultations/:id/annuler', auth, requireSousRole('medecin'), async (req, res) => {
  const { raison } = req.body;
  try {
    const r = await db(
      `UPDATE consultations SET statut='annulee', updated_at=NOW() WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ success:false, message:'Consultation introuvable' });
    await db(
      `INSERT INTO consultations_historique (consultation_id,medecin_id,medecin_nom,type_action,champs_modifies)
       VALUES ($1,$2,$3,'annulation',$4)`,
      [req.params.id, req.user?.medecin_id||null, req.body.medecin_nom||null, JSON.stringify({ raison: raison||null })]
    );
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ── ORDONNANCES ───────────────────────────────────────────────────
app.get('/api/ordonnances', auth, requireSousRole('medecin'), async (req, res) => {
  try {
    const { patient_id } = req.query; const cid = req.user?.clinique_id;
    let sql='SELECT *, medicament AS medicaments FROM ordonnances WHERE 1=1'; const p=[];
    if (patient_id) {
      p.push(patient_id); sql+=` AND patient_id=$${p.length}`;
      // Confidentialite : une ordonnance n'est visible pour une AUTRE
      // clinique que si explicitement partagee. Meme regle que consultations.
      p.push(cid||null); sql+=` AND (clinique_id=$${p.length} OR partage_reseau=true)`;
    }
    else if (cid)   { p.push(cid);        sql+=` AND clinique_id=$${p.length}`; }
    sql+=' ORDER BY created_at DESC LIMIT 100';
    const r = await db(sql,p); res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
// ── BUG CORRIGE : clinique_id n'etait jamais enregistre a la creation
// d'une ordonnance. La route de liste (GET /api/ordonnances) filtre
// par clinique_id -- une ligne avec clinique_id=NULL ne matche jamais
// ce filtre et restait invisible pour toujours, meme pour la clinique
// qui venait de la creer.
app.post('/api/ordonnances', auth, requireSousRole('medecin'), async (req, res) => {
  const { patient_id, medicaments, posologie, duree, notes_ord, consultation_id, medecin_nom } = req.body;
  if (!patient_id||!medicaments) return res.status(400).json({ success:false, message:'Patient et médicaments requis' });
  if (!posologie) return res.status(400).json({ success:false, message:'Posologie requise' });
  try {
    const r = await db(
      'INSERT INTO ordonnances (id,patient_id,clinique_id,medicament,posologie,duree,notes_ord,consultation_id,medecin_id,medecin_nom,pays_code) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *',
      [uuid(),patient_id,req.user?.clinique_id||null,medicaments,posologie,duree||null,notes_ord||null,consultation_id||null,req.user?.medecin_id||null,medecin_nom||null,'CI']
    );
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
// ── Partage explicite avec le reseau -- seul geste qui rend un
// rapport visible par une AUTRE clinique via le code secret du
// patient. Prive par defaut, jamais l'inverse. Seule la clinique
// proprietaire peut partager son propre rapport.
app.put('/api/consultations/:id/partager', auth, requireSousRole('medecin', 'bureau_entrees'), async (req, res) => {
  const { partage } = req.body;
  try {
    const cid = req.user?.clinique_id;
    const r = await db('UPDATE consultations SET partage_reseau=$1 WHERE id=$2 AND clinique_id=$3 RETURNING *', [!!partage, req.params.id, cid]);
    if (!r.rows.length) return res.status(404).json({ success:false, message:'Consultation introuvable dans votre clinique' });
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.put('/api/bulletins/:id/partager', auth, requireSousRole('medecin', 'bureau_entrees', 'pharmacien'), async (req, res) => {
  const { partage } = req.body;
  try {
    const cid = req.user?.clinique_id;
    const r = await db('UPDATE bulletins SET partage_reseau=$1 WHERE id=$2 AND clinique_id=$3 RETURNING *', [!!partage, req.params.id, cid]);
    if (!r.rows.length) return res.status(404).json({ success:false, message:'Bulletin introuvable dans votre clinique' });
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.put('/api/ordonnances/:id/partager', auth, requireSousRole('medecin', 'bureau_entrees', 'pharmacien'), async (req, res) => {
  const { partage } = req.body;
  try {
    const cid = req.user?.clinique_id;
    const r = await db('UPDATE ordonnances SET partage_reseau=$1 WHERE id=$2 AND clinique_id=$3 RETURNING *', [!!partage, req.params.id, cid]);
    if (!r.rows.length) return res.status(404).json({ success:false, message:'Ordonnance introuvable dans votre clinique' });
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

app.put('/api/ordonnances/:id', auth, async (req, res) => {
  const { statut, medicaments, posologie, duree, notes_ord } = req.body;
  // Le contenu medical (medicaments/posologie/duree/notes) est reserve au
  // medecin et au bureau des entrees. Un simple changement de statut
  // (ex: dispensation mobile pharmacien) reste libre comme avant.
  const contenuModifie = medicaments!==undefined || posologie!==undefined || duree!==undefined || notes_ord!==undefined;
  if (contenuModifie) {
    const role = req.user?.role;
    const sr = req.user?.sous_role;
    const autorise = (role==='clinique' && !sr) || (sr && ['medecin','bureau_entrees'].includes(sr));
    if (!autorise) return res.status(403).json({ success:false, message:"Accès refusé pour votre rôle" });
  }
  try {
    const r = await db(
      `UPDATE ordonnances SET
         statut=COALESCE($1,statut), medicament=COALESCE($2,medicament),
         posologie=COALESCE($3,posologie), duree=COALESCE($4,duree), notes_ord=COALESCE($5,notes_ord)
       WHERE id=$6 RETURNING *`,
      [statut||null, medicaments||null, posologie||null, duree||null, notes_ord||null, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ success:false, message:'Ordonnance introuvable' });
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ── Envoi d'une ordonnance vers une pharmacie (interne ou externe) ──
// Interne : traitee par le pharmacien de LA MEME clinique, stock reel.
// Externe : reprend la logique deja existante cote patient (pharmacie
// partenaire), desormais aussi declenchable par le bureau des entrees.
app.put('/api/ordonnances/:id/envoyer', auth, requireSousRole('bureau_entrees', 'medecin', 'pharmacien'), async (req, res) => {
  const { destination, pharmacie_id } = req.body;
  if (!['interne', 'externe'].includes(destination)) {
    return res.status(400).json({ success:false, message:"destination doit etre 'interne' ou 'externe'" });
  }
  if (destination === 'externe' && !pharmacie_id) {
    return res.status(400).json({ success:false, message:'pharmacie_id requis pour une pharmacie externe' });
  }
  try {
    const cid = req.user?.clinique_id;
    const r = await db(
      `UPDATE ordonnances SET destination=$1, clinique_id=$2, pharmacie_id=$3, statut='envoyee' WHERE id=$4 RETURNING *`,
      [destination, destination==='interne' ? cid : null, destination==='externe' ? pharmacie_id : null, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ success:false, message:'Ordonnance introuvable' });
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ── Pharmacie interne : ordonnances recues, en attente de devis ─────
app.get('/api/pharmacie-interne/ordonnances', auth, requireSousRole('pharmacien', 'bureau_entrees', 'finance'), async (req, res) => {
  try {
    const cid = req.user?.clinique_id;
    const r = await db(
      `SELECT o.*, p.prenom AS patient_prenom, p.nom AS patient_nom, p.telephone AS patient_telephone
         FROM ordonnances o LEFT JOIN patients p ON p.id = o.patient_id
        WHERE o.destination='interne' AND o.clinique_id=$1
        ORDER BY o.created_at DESC LIMIT 100`,
      [cid]
    );
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});

// ── Preparer un devis chiffre a partir du vrai stock ─────────────────
app.post('/api/ordonnances/:id/devis', auth, requireSousRole('pharmacien'), async (req, res) => {
  const { lignes } = req.body; // [{ stock_id, quantite }]
  if (!Array.isArray(lignes) || !lignes.length) {
    return res.status(400).json({ success:false, message:'Au moins une ligne requise' });
  }
  try {
    const cid = req.user?.clinique_id;
    const ord = await db("SELECT * FROM ordonnances WHERE id=$1 AND destination='interne' AND clinique_id=$2", [req.params.id, cid]);
    if (!ord.rows.length) return res.status(404).json({ success:false, message:'Ordonnance introuvable dans votre pharmacie' });

    await db('DELETE FROM ordonnance_devis_lignes WHERE ordonnance_id=$1', [req.params.id]);

    let total = 0;
    for (const l of lignes) {
      const produit = await db('SELECT * FROM stock WHERE id=$1 AND clinique_id=$2', [l.stock_id, cid]);
      if (!produit.rows.length) continue;
      const p = produit.rows[0];
      const qte = parseInt(l.quantite) || 1;
      const sousTotal = qte * parseFloat(p.prix_unitaire || 0);
      total += sousTotal;
      await db(
        `INSERT INTO ordonnance_devis_lignes (id, ordonnance_id, stock_id, libelle, quantite, prix_unitaire)
         VALUES (gen_random_uuid(),$1,$2,$3,$4,$5)`,
        [req.params.id, p.id, p.nom, qte, p.prix_unitaire || 0]
      );
    }

    const r = await db(
      `UPDATE ordonnances SET devis_montant=$1, devis_prepare_at=NOW(), statut='devis_pret' WHERE id=$2 RETURNING *`,
      [total, req.params.id]
    );
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ── Dispenser : decremente le stock reel, transactionnel avec verrou
// anti-survente (meme motif que la vente de medicament depuis la
// carte patient) -- c'est ICI, et seulement ici, que le stock bouge.
app.post('/api/ordonnances/:id/dispenser', auth, requireSousRole('pharmacien'), async (req, res) => {
  try {
    const cid = req.user?.clinique_id;
    const { pool: dbPool } = require('./config/db');
    const { withTransaction } = require('./helpers/dbIntrospect');
    const out = await withTransaction(dbPool, async (client) => {
      const ordR = await client.query("SELECT * FROM ordonnances WHERE id=$1 AND destination='interne' AND clinique_id=$2 AND statut='devis_pret'", [req.params.id, cid]);
      if (!ordR.rows.length) throw new Error('Ordonnance introuvable ou devis non pret');

      const lignesR = await client.query('SELECT * FROM ordonnance_devis_lignes WHERE ordonnance_id=$1', [req.params.id]);
      for (const ligne of lignesR.rows) {
        if (!ligne.stock_id) continue;
        const stockR = await client.query('SELECT * FROM stock WHERE id=$1 AND clinique_id=$2 FOR UPDATE', [ligne.stock_id, cid]);
        if (!stockR.rows.length) throw new Error(`Produit "${ligne.libelle}" introuvable dans le stock`);
        const produit = stockR.rows[0];
        if (produit.quantite < ligne.quantite) throw new Error(`Stock insuffisant pour "${ligne.libelle}" : ${produit.quantite} ${produit.unite} disponible(s)`);
        await client.query('UPDATE stock SET quantite = quantite - $1, updated_at = NOW() WHERE id=$2', [ligne.quantite, ligne.stock_id]);
      }

      const r = await client.query(
        `UPDATE ordonnances SET statut='dispensee', dispensee_at=NOW(), dispensee_par=$1 WHERE id=$2 RETURNING *`,
        [req.user.id, req.params.id]
      );
      return r.rows[0];
    });
    res.json({ success:true, data:out });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ── Lignes de devis d'une ordonnance (lecture) ───────────────────────
app.get('/api/ordonnances/:id/devis', auth, async (req, res) => {
  try {
    const r = await db('SELECT * FROM ordonnance_devis_lignes WHERE ordonnance_id=$1 ORDER BY created_at', [req.params.id]);
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});

// ══════════════════════════════════════════════════════════════════
//  HOSPITALISATION -- categories de chambres avec tarif journalier
//  (VIP, Individuelle, Double, Reanimation, Box...). Meme principe que
//  categories_actes : entrees globales (clinique_id NULL) + entrees
//  propres a chaque clinique, deduplication par nom en lecture.
// ══════════════════════════════════════════════════════════════════
app.get('/api/categories-chambres', auth, async (req, res) => {
  try {
    const cid = req.user?.clinique_id;
    const r = await db(
      `SELECT DISTINCT ON (nom) * FROM categories_chambres
        WHERE is_active IS NOT false AND (clinique_id IS NULL OR clinique_id=$1)
        ORDER BY nom, (clinique_id=$1) DESC NULLS LAST`,
      [cid||null]
    );
    r.rows.sort((a,b) => parseFloat(a.tarif_journalier) - parseFloat(b.tarif_journalier));
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});

app.post('/api/categories-chambres', auth, requireSousRole('bureau_entrees', 'finance'), async (req, res) => {
  const { nom, tarif_journalier, description } = req.body;
  if (!nom || tarif_journalier===undefined) return res.status(400).json({ success:false, message:'Nom et tarif journalier requis' });
  try {
    const r = await db(
      `INSERT INTO categories_chambres (id, clinique_id, nom, tarif_journalier, description)
       VALUES (gen_random_uuid(), $1, $2, $3, $4) RETURNING *`,
      [req.user?.clinique_id||null, nom, parseFloat(tarif_journalier), description||null]
    );
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

app.put('/api/categories-chambres/:id', auth, requireSousRole('bureau_entrees', 'finance'), async (req, res) => {
  const { nom, tarif_journalier, description, is_active } = req.body;
  try {
    const r = await db(
      `UPDATE categories_chambres SET nom=COALESCE($1,nom), tarif_journalier=COALESCE($2,tarif_journalier),
         description=COALESCE($3,description), is_active=COALESCE($4,is_active)
       WHERE id=$5 RETURNING *`,
      [nom, tarif_journalier!==undefined?parseFloat(tarif_journalier):null, description, is_active, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ success:false, message:'Catégorie introuvable' });
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ── STOCK ─────────────────────────────────────────────────────────
app.get('/api/stock', auth, async (req, res) => {
  try {
    const cid = req.user?.clinique_id;
    let sql='SELECT * FROM stock WHERE is_active IS NOT false'; const p=[];
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
// ── Fournisseurs de stock -- remplace la liste demo codee en dur ──
app.get('/api/fournisseurs-stock', auth, async (req, res) => {
  try {
    const cid = req.user?.clinique_id;
    const r = await db(
      'SELECT * FROM fournisseurs_stock WHERE is_active IS NOT false AND (clinique_id=$1 OR clinique_id IS NULL) ORDER BY nom',
      [cid||null]
    );
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.post('/api/fournisseurs-stock', auth, async (req, res) => {
  const { nom, contact, produits } = req.body;
  if (!nom) return res.status(400).json({ success:false, message:'Nom requis' });
  try {
    const r = await db(
      'INSERT INTO fournisseurs_stock (id,clinique_id,nom,contact,produits) VALUES (gen_random_uuid(),$1,$2,$3,$4) RETURNING *',
      [req.user?.clinique_id||null, nom, contact||null, produits||null]
    );
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.put('/api/fournisseurs-stock/:id', auth, async (req, res) => {
  const { nom, contact, produits, is_active } = req.body;
  const cid = req.user?.clinique_id;
  try {
    const r = await db(
      `UPDATE fournisseurs_stock SET nom=COALESCE($1,nom), contact=COALESCE($2,contact),
         produits=COALESCE($3,produits), is_active=COALESCE($4,is_active)
       WHERE id=$5 AND clinique_id=$6 RETURNING *`,
      [nom||null, contact||null, produits||null, is_active===undefined?null:is_active, req.params.id, cid]
    );
    if (!r.rows.length) return res.status(404).json({ success:false, message:'Fournisseur introuvable dans votre clinique' });
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

app.post('/api/stock', auth, async (req, res) => {
  const { nom, categorie, quantite, unite, seuil_alerte, prix_unitaire, fournisseur, fournisseur_id, date_expiration } = req.body;
  if (!nom) return res.status(400).json({ success:false, message:'Nom requis' });
  try {
    const r = await db(
      'INSERT INTO stock (id,clinique_id,nom,categorie,quantite,unite,seuil_alerte,prix_unitaire,fournisseur,fournisseur_id,date_expiration) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *',
      [uuid(),req.user?.clinique_id,nom,categorie||'Médicament',quantite||0,unite||'boite',seuil_alerte||10,prix_unitaire||null,fournisseur||null,fournisseur_id||null,vd(date_expiration)]
    );
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.put('/api/stock/:id', auth, async (req, res) => {
  const { nom, categorie, quantite, unite, seuil_alerte, prix_unitaire, fournisseur, fournisseur_id, date_expiration } = req.body;
  try {
    const r = await db(
      `UPDATE stock SET nom=COALESCE($1,nom),categorie=COALESCE($2,categorie),quantite=COALESCE($3,quantite),
         unite=COALESCE($4,unite),seuil_alerte=COALESCE($5,seuil_alerte),prix_unitaire=COALESCE($6,prix_unitaire),
         fournisseur=COALESCE($7,fournisseur),
         fournisseur_id=CASE WHEN $8::text IS NULL THEN fournisseur_id WHEN $8='' THEN NULL ELSE $8::uuid END,
         date_expiration=COALESCE($9,date_expiration),updated_at=NOW() WHERE id=$10 RETURNING *`,
      [nom,categorie,quantite,unite,seuil_alerte,prix_unitaire,fournisseur,fournisseur_id===undefined?null:fournisseur_id,vd(date_expiration),req.params.id]
    );
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
// FAILLE CORRIGEE : aucune verification de clinique proprietaire --
// n'importe quel compte connecte pouvait supprimer le stock de
// n'importe quelle autre clinique en devinant/recuperant un id.
// Desactivation douce plutot que suppression definitive : un produit
// deja utilise dans des ventes passees (prise_en_charge_actes.stock_id)
// ne doit jamais disparaitre de l'historique.
app.delete('/api/stock/:id', auth, async (req, res) => {
  const cid = req.user?.clinique_id;
  try {
    const r = await db('UPDATE stock SET is_active=false, updated_at=NOW() WHERE id=$1 AND clinique_id=$2 RETURNING *', [req.params.id, cid]);
    if (!r.rows.length) return res.status(404).json({ success:false, message:'Produit introuvable dans votre stock' });
    res.json({ success:true, data:r.rows[0] });
  }
  catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ── FACTURES ──────────────────────────────────────────────────────
app.get('/api/factures', auth, requireSousRole('finance', 'bureau_entrees'), async (req, res) => {
  try {
    const cid=req.user?.clinique_id; const pid=req.user?.patient_id;
    const { patient_id } = req.query;
    // factures n'a pas de colonne patient_nom propre -- recupere via
    // jointure sur patients, a partir de patient_id.
    let sql=`SELECT f.*, TRIM(CONCAT(p.prenom,' ',p.nom)) AS patient_nom
               FROM factures f LEFT JOIN patients p ON p.id=f.patient_id WHERE 1=1`;
    const p=[];
    if (cid) { p.push(cid); sql+=` AND f.clinique_id=$${p.length}`; }
    if (pid&&!cid) { p.push(pid); sql+=` AND f.patient_id=$${p.length}`; }
    // Filtre explicite par patient (dossier patient cote clinique) --
    // s'ajoute au scope clinique_id deja applique ci-dessus, jamais un
    // substitut : un compte clinique ne peut voir que SES patients.
    if (patient_id) { p.push(patient_id); sql+=` AND f.patient_id=$${p.length}`; }
    sql+=' ORDER BY f.created_at DESC LIMIT 100';
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
app.post('/api/factures', auth, requireSousRole('finance', 'bureau_entrees'), async (req, res) => {
  const { patient_id, montant_total, montant_assur, ticket_moder, mode_paiement, statut } = req.body;
  try {
    const ref='FAC-'+Date.now().toString(36).toUpperCase();
    const total = montant_total||0;
    const assur = montant_assur||0;
    const r=await db(
      'INSERT INTO factures (id,reference,clinique_id,patient_id,montant_total,montant_assur,ticket_moder,mode_paiement,statut) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [uuid(),ref,req.user?.clinique_id,patient_id||null,total,assur,ticket_moder!=null?ticket_moder:(total-assur),mode_paiement||'Espèces',statut||'en_attente']
    );
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.put('/api/factures/:id', auth, async (req, res) => {
  const { statut, mode_paiement, montant_total, montant_assur, ticket_moder } = req.body;
  // Montants reserves au medecin et au bureau des entrees. Un changement
  // de statut/mode_paiement seul (medecin independant, etc.) reste libre
  // comme avant.
  const contenuModifie = montant_total!==undefined || montant_assur!==undefined || ticket_moder!==undefined;
  if (contenuModifie) {
    const role = req.user?.role;
    const sr = req.user?.sous_role;
    const autorise = (role==='clinique' && !sr) || (sr && ['medecin','bureau_entrees'].includes(sr));
    if (!autorise) return res.status(403).json({ success:false, message:"Accès refusé pour votre rôle" });
  }
  try {
    const r=await db(
      `UPDATE factures SET
         statut=COALESCE($1,statut), mode_paiement=COALESCE($2,mode_paiement),
         montant_total=COALESCE($3,montant_total), montant_assur=COALESCE($4,montant_assur),
         ticket_moder=COALESCE($5,ticket_moder)
       WHERE id=$6 RETURNING *`,
      [statut||null, mode_paiement||null,
       montant_total!==undefined?montant_total:null, montant_assur!==undefined?montant_assur:null,
       ticket_moder!==undefined?ticket_moder:null, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ success:false, message:'Facture introuvable' });
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ── CAISSE ────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════
//  CAISSES MULTIPLES (caisse generale, caisse pharmacie...)
// ══════════════════════════════════════════════════════════════════
// Gestion des caisses elles-memes -- creation reservee aux comptes a
// acces complet et finance, PAS bureau_entrees (qui les UTILISE mais ne
// doit pas pouvoir en creer de nouvelles a volonte).
app.get('/api/caisses', auth, requireSousRole('finance', 'bureau_entrees'), async (req, res) => {
  try {
    const cid = req.user?.clinique_id;
    if (!cid) return res.json({ success:true, data:[] });
    const r = await db(
      `SELECT c.*, cs.statut AS statut_session, cs.total_encaisse, cs.total_decaisse, cs.opened_at
         FROM caisses c
         LEFT JOIN caisse_sessions cs ON cs.caisse_id=c.id AND cs.date=CURRENT_DATE AND cs.statut='ouverte'
        WHERE c.clinique_id=$1
        ORDER BY c.created_at`,
      [cid]
    );
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.post('/api/caisses', auth, requireSousRole('finance', 'bureau_entrees'), async (req, res) => {
  const { nom, operateur } = req.body;
  if (!nom) return res.status(400).json({ success:false, message:'Nom de la caisse requis' });
  const cid = req.user?.clinique_id;
  if (!cid) return res.status(400).json({ success:false, message:'Compte non rattaché à une clinique' });
  try {
    // date_ouverture est NOT NULL sans defaut sur cette table -- sans elle,
    // l'INSERT echoue systematiquement ("null value ... violates not-null
    // constraint"). Une caisse est consideree ouverte (creee) le jour de
    // sa creation.
    const r = await db(
      'INSERT INTO caisses (id,clinique_id,nom,operateur,date_ouverture) VALUES ($1,$2,$3,$4,CURRENT_DATE) RETURNING *',
      [uuid(), cid, nom, operateur||null]
    );
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ── Sessions de caisse : desormais scopees par caisse_id, plusieurs
// caisses peuvent etre ouvertes simultanement le meme jour. caisse_id
// est obligatoire sur ouvrir/encaisser/decaisser/cloturer -- l'ancien
// comportement "une seule caisse implicite par clinique" est retire
// pour eviter qu'un encaissement atterrisse dans la mauvaise caisse.
app.get('/api/caisse', auth, requireSousRole('finance', 'bureau_entrees'), async (req, res) => {
  try {
    const cid=req.user?.clinique_id;
    const { caisse_id } = req.query;
    if (!cid || !caisse_id) return res.json({ success:true, data:{ statut:'fermee', total_encaisse:0, total_decaisse:0 } });
    const r=await db("SELECT * FROM caisse_sessions WHERE clinique_id=$1 AND caisse_id=$2 AND date=CURRENT_DATE AND statut='ouverte' ORDER BY opened_at DESC LIMIT 1",[cid,caisse_id]);
    res.json({ success:true, data:r.rows[0]||{ statut:'fermee', total_encaisse:0, total_decaisse:0 } });
  } catch(e) { res.json({ success:true, data:{ statut:'fermee', total_encaisse:0, total_decaisse:0 } }); }
});
app.get('/api/caisse/clinique', auth, requireSousRole('finance', 'bureau_entrees'), async (req, res) => {
  try {
    const cid=req.user?.clinique_id;
    if (!cid) return res.json({ success:true, data:[] });
    const r=await db("SELECT * FROM caisse_sessions WHERE clinique_id=$1 AND date=CURRENT_DATE AND statut='ouverte'",[cid]);
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.post('/api/caisse/ouvrir', auth, requireSousRole('finance', 'bureau_entrees'), async (req, res) => {
  const { caisse_id } = req.body;
  if (!caisse_id) return res.status(400).json({ success:false, message:'caisse_id requis' });
  try {
    const caisse = await db('SELECT id FROM caisses WHERE id=$1 AND clinique_id=$2', [caisse_id, req.user?.clinique_id]);
    if (!caisse.rows.length) return res.status(404).json({ success:false, message:'Caisse introuvable' });
    const r=await db('INSERT INTO caisse_sessions (id,clinique_id,caisse_id) VALUES ($1,$2,$3) RETURNING *',[uuid(),req.user?.clinique_id,caisse_id]);
    res.status(201).json({ success:true, data:r.rows[0], message:'Caisse ouverte !' });
  } catch(e) {
    // Contrainte unique violee = caisse deja ouverte aujourd'hui (double
    // clic, requetes concurrentes) -- message clair plutot qu'une 500 brute.
    if (e.code === '23505') return res.status(409).json({ success:false, message:'Cette caisse est déjà ouverte aujourd\'hui' });
    res.status(500).json({ success:false, message:e.message });
  }
});
// ── BUG COMBLE : encaisser/decaisser ne mettaient a jour qu'un
// compteur agrege, sans jamais garder trace individuelle de chaque
// transaction. Chaque mouvement est desormais aussi insere dans
// mouvements_caisse, ce qui rend un vrai historique possible.
app.post('/api/caisse/encaisser', auth, requireSousRole('finance', 'bureau_entrees'), async (req, res) => {
  const { montant, caisse_id, mode, reference } = req.body;
  if (!montant||montant<=0) return res.status(400).json({ success:false, message:'Montant invalide' });
  if (!caisse_id) return res.status(400).json({ success:false, message:'caisse_id requis' });
  try {
    const r = await db("UPDATE caisse_sessions SET total_encaisse=total_encaisse+$1 WHERE clinique_id=$2 AND caisse_id=$3 AND date=CURRENT_DATE AND statut='ouverte' RETURNING id",[montant,req.user?.clinique_id,caisse_id]);
    if (!r.rows.length) return res.status(400).json({ success:false, message:'Aucune session ouverte pour cette caisse aujourd\'hui' });
    await db(
      `INSERT INTO mouvements_caisse (id,caisse_id,clinique_id,type,montant,mode_paiement,reference,utilisateur_id,utilisateur_nom)
       VALUES (gen_random_uuid(),$1,$2,'encaissement',$3,$4,$5,$6,$7)`,
      [caisse_id, req.user?.clinique_id, montant, mode||null, reference||null, req.user?.id||null, `${req.user?.prenom||''} ${req.user?.nom||''}`.trim()||null]
    );
    res.json({ success:true, message:`${Number(montant).toLocaleString('fr-CI')} FCFA encaissés` });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.post('/api/caisse/decaisser', auth, requireSousRole('finance', 'bureau_entrees'), async (req, res) => {
  const { montant, caisse_id, motif } = req.body;
  if (!montant||montant<=0) return res.status(400).json({ success:false, message:'Montant invalide' });
  if (!caisse_id) return res.status(400).json({ success:false, message:'caisse_id requis' });
  try {
    const r = await db("UPDATE caisse_sessions SET total_decaisse=total_decaisse+$1 WHERE clinique_id=$2 AND caisse_id=$3 AND date=CURRENT_DATE AND statut='ouverte' RETURNING id",[montant,req.user?.clinique_id,caisse_id]);
    if (!r.rows.length) return res.status(400).json({ success:false, message:'Aucune session ouverte pour cette caisse aujourd\'hui' });
    await db(
      `INSERT INTO mouvements_caisse (id,caisse_id,clinique_id,type,montant,reference,utilisateur_id,utilisateur_nom)
       VALUES (gen_random_uuid(),$1,$2,'decaissement',$3,$4,$5,$6)`,
      [caisse_id, req.user?.clinique_id, montant, motif||null, req.user?.id||null, `${req.user?.prenom||''} ${req.user?.nom||''}`.trim()||null]
    );
    res.json({ success:true, message:'Décaissement enregistré' });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
// Historique detaille des mouvements d'une caisse -- consultation et
// base de l'impression du recapitulatif de session.
app.get('/api/caisse/:caisseId/historique', auth, requireSousRole('finance', 'bureau_entrees'), async (req, res) => {
  try {
    const cid = req.user?.clinique_id;
    const { date } = req.query;
    let sql = 'SELECT * FROM mouvements_caisse WHERE caisse_id=$1 AND clinique_id=$2';
    const p = [req.params.caisseId, cid];
    if (date) { p.push(date); sql += ` AND DATE(created_at)=$${p.length}`; }
    else { sql += ' AND DATE(created_at)=CURRENT_DATE'; }
    sql += ' ORDER BY created_at DESC LIMIT 500';
    const r = await db(sql, p);
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.post('/api/caisse/cloturer', auth, requireSousRole('finance', 'bureau_entrees'), async (req, res) => {
  const { caisse_id } = req.body;
  if (!caisse_id) return res.status(400).json({ success:false, message:'caisse_id requis' });
  try {
    const r=await db("UPDATE caisse_sessions SET statut='fermee',closed_at=NOW() WHERE clinique_id=$1 AND caisse_id=$2 AND date=CURRENT_DATE AND statut='ouverte' RETURNING *",[req.user?.clinique_id,caisse_id]);
    if (!r.rows.length) return res.status(400).json({ success:false, message:'Aucune session ouverte pour cette caisse aujourd\'hui' });
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
    const { q, ville, type } = req.query;
    // Fusionner cliniques MediConnect + établissements annuaire
    let sql = `
      SELECT
        c.id, c.nom, c.ville, c.adresse,
        COALESCE(c.telephone, u.telephone) AS telephone,
        COALESCE(c.email, u.email) AS email,
        c.logo, c.slogan, c.horaires, c.site_web,
        'mediconnect' AS source,
        true AS est_membre
      FROM cliniques c
      LEFT JOIN utilisateurs u ON u.id = c.user_id
      WHERE (c.is_active IS NOT false OR c.is_active IS NULL)
      UNION ALL
      SELECT
        id, nom, ville, adresse, telephone, NULL AS email,
        NULL AS logo, NULL AS slogan, NULL AS horaires, NULL AS site_web,
        'annuaire' AS source,
        false AS est_membre
      FROM etablissements_sante
      WHERE NOT EXISTS (
        SELECT 1 FROM cliniques c2 WHERE LOWER(c2.nom) = LOWER(etablissements_sante.nom)
      )
    `;
    const params = [];
    // Appliquer filtres sur la UNION via sous-requête
    let finalSql = `SELECT * FROM (${sql}) t WHERE 1=1`;
    if (q) { params.push('%'+q.toLowerCase()+'%'); finalSql += ` AND (LOWER(t.nom) LIKE $${params.length} OR LOWER(t.ville) LIKE $${params.length})`; }
    if (ville) { params.push('%'+ville.toLowerCase()+'%'); finalSql += ` AND LOWER(t.ville) LIKE $${params.length}`; }
    finalSql += ' ORDER BY est_membre DESC, nom ASC LIMIT 500';
    const r = await db(finalSql, params);
    res.json({ success:true, data:r.rows, total:r.rows.length });
  } catch(e) { console.error('public/cliniques:', e.message); res.json({ success:true, data:[] }); }
});
// ── Details d'une clinique par id (pour le flux public de prise de RDV) ──
// rdv-site/src/pages/RDV.jsx appelait deja GET /api/public/cliniques/:id
// pour recuperer l'adresse complete d'un etablissement preselectionne
// depuis la recherche -- cette route n'a jamais existe cote backend,
// d'ou un 404 systematique (attrape par un .catch() qui se contentait
// des infos minimales id/nom/ville deja connues, donc pas bloquant mais
// incomplet). Meme logique de fusion cliniques + annuaire que la liste
// ci-dessus, filtree sur un seul id.
// ── Historique des RDV via le code secret -- accessible publiquement
// sans connexion (le code lui-meme fait office de cle d'acces, meme
// convention que "Resultats d'examens" cote clinique). Retourne le
// patient (identite minimale) et tous ses rendez-vous, tries du plus
// recent au plus ancien -- le frontend separe passe/a venir sur la date.
app.get('/api/public/rdv-par-code/:code', async (req, res) => {
  try {
    const p = await db(
      "SELECT id, prenom, nom, telephone, code_secret FROM patients WHERE UPPER(code_secret)=UPPER($1) LIMIT 1",
      [req.params.code]
    );
    if (!p.rows.length) return res.status(404).json({ success:false, message:'Code introuvable' });
    const patient = p.rows[0];

    const rdvs = await db(
      `SELECT rv.id, rv.reference, rv.date_rdv, rv.heure_rdv, rv.statut, rv.motif,
              rv.medecin_nom, rv.etablissement_externe, rv.prestataire_type,
              c.nom AS clinique_nom
         FROM rendez_vous rv
         LEFT JOIN cliniques c ON c.id = rv.clinique_id
        WHERE rv.patient_id=$1
        ORDER BY rv.date_rdv DESC, rv.heure_rdv DESC
        LIMIT 100`,
      [patient.id]
    );

    res.json({
      success:true,
      data:{
        patient:{ prenom:patient.prenom, nom:patient.nom, telephone:patient.telephone },
        rendez_vous: rdvs.rows,
      }
    });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

app.get('/api/public/cliniques/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const sql = `
      SELECT * FROM (
        SELECT
          c.id, c.nom, c.ville, c.adresse,
          COALESCE(c.telephone, u.telephone) AS telephone,
          COALESCE(c.email, u.email) AS email,
          c.logo, c.slogan, c.horaires, c.site_web,
          'mediconnect' AS source, true AS est_membre
        FROM cliniques c
        LEFT JOIN utilisateurs u ON u.id = c.user_id
        WHERE (c.is_active IS NOT false OR c.is_active IS NULL)
        UNION ALL
        SELECT
          id, nom, ville, adresse, telephone, NULL AS email,
          NULL AS logo, NULL AS slogan, NULL AS horaires, NULL AS site_web,
          'annuaire' AS source, false AS est_membre
        FROM etablissements_sante
        WHERE NOT EXISTS (
          SELECT 1 FROM cliniques c2 WHERE LOWER(c2.nom) = LOWER(etablissements_sante.nom)
        )
      ) t
      WHERE t.id = $1
      LIMIT 1
    `;
    const r = await db(sql, [id]);
    if (!r.rows.length) return res.status(404).json({ success: false, message: 'Etablissement introuvable' });
    res.json({ success: true, data: r.rows[0] });
  } catch (e) {
    console.error('public/cliniques/:id:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── Medecins d'une clinique (pour le flux public de prise de RDV) ──
// rdv-site/src/pages/RDV.jsx appelait deja cette route ; elle n'a jamais
// existe cote backend -> toute clinique reelle (non demo) tombait
// silencieusement sur une liste vide.
app.get('/api/public/cliniques/:id/medecins', async (req, res) => {
  try {
    const { specialite } = req.query;
    let sql = `SELECT id, prenom, nom, specialite, tarif, experience_ans, statut
                 FROM medecins WHERE clinique_id=$1 AND statut IS DISTINCT FROM 'Indisponible'`;
    const params = [req.params.id];
    if (specialite) { params.push(specialite); sql += ` AND specialite=$${params.length}`; }
    sql += ' ORDER BY nom';
    const r = await db(sql, params);
    res.json({ success: true, data: r.rows });
  } catch(e) { res.json({ success: true, data: [] }); }
});

// ── Generation automatique des disponibilites d'un medecin, a partir
// des champs deja renseignes sur sa fiche (horaires_debut, horaires_fin,
// jours_travail) -- ces informations existent pour la quasi-totalite du
// reseau, mais n'avaient jamais ete transformees en vraies plages
// reservables dans "disponibilites". Fenetre de 30 jours, coherente avec
// celle deja utilisee par la lecture publique.
const JOURS_INDEX = { 'dim':0, 'lun':1, 'mar':2, 'mer':3, 'jeu':4, 'ven':5, 'sam':6 };
async function genererDisponibilitesMedecin(medecin) {
  if (!medecin.horaires_debut || !medecin.horaires_fin || !medecin.jours_travail) return 0;
  // jours_travail est un ARRAY Postgres natif cote driver (pas une
  // chaine "Lun,Mar,..."), mais on gere aussi le cas chaine par securite.
  const listeJours = Array.isArray(medecin.jours_travail)
    ? medecin.jours_travail
    : String(medecin.jours_travail).split(',');
  const joursActifs = listeJours.map(j => JOURS_INDEX[String(j).trim().toLowerCase().slice(0,3)]).filter(j => j !== undefined);
  if (!joursActifs.length) return 0;

  let cree = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    if (!joursActifs.includes(d.getDay())) continue;
    const dateStr = d.toISOString().split('T')[0];
    const existe = await db('SELECT id FROM disponibilites WHERE medecin_id=$1 AND date=$2', [medecin.id, dateStr]);
    if (existe.rows.length) continue;
    await db(
      `INSERT INTO disponibilites (id, medecin_id, clinique_id, date, heure_debut, heure_fin, statut, recurrent)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'disponible', true)`,
      [medecin.id, medecin.clinique_id, dateStr, medecin.horaires_debut, medecin.horaires_fin]
    );
    cree++;
  }
  return cree;
}

// Generation en masse, reservee a l'administrateur -- a executer une
// fois pour peupler tout le reseau existant, puis reutilisable si
// besoin (idempotent : ne recree jamais une ligne deja existante pour
// une date donnee).
app.post('/api/admin/generer-disponibilites', async (req, res) => {
  if (req.headers['x-admin-key'] !== 'mediconnect_dev_secret_2024')
    return res.status(403).json({ success:false });
  try {
    const medecins = await db("SELECT * FROM medecins WHERE statut IS DISTINCT FROM 'Indisponible'");
    let totalCree = 0, medecinsTraites = 0;
    for (const m of medecins.rows) {
      const n = await genererDisponibilitesMedecin(m);
      if (n > 0) medecinsTraites++;
      totalCree += n;
    }
    res.json({ success:true, message:`${totalCree} créneaux créés pour ${medecinsTraites} médecins`, totalCree, medecinsTraites });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ── Recherche patient publique, par TELEPHONE EXACT uniquement -- pas
// de recherche par nom (exposerait des informations sur n'importe qui
// a n'importe quel visiteur anonyme du site). Seul quelqu'un qui
// connait deja le numero de telephone du patient peut le retrouver.
// Champs retournes limites au strict necessaire pour pre-remplir le
// formulaire de RDV, jamais le code_secret ni le dossier medical.
app.get('/api/public/patients/recherche-telephone', async (req, res) => {
  const { telephone, code_secret } = req.query;
  try {
    // Code secret : identifiant dedie (VigieCard), exact et sans
    // ambiguite -- priorite sur le telephone si les deux sont fournis.
    if (code_secret && code_secret.trim().length >= 4) {
      const r = await db(
        `SELECT prenom, nom, telephone, email, ville FROM patients WHERE UPPER(code_secret)=UPPER($1) LIMIT 1`,
        [code_secret.trim()]
      );
      return res.json({ success: true, data: r.rows[0] || null });
    }
    if (!telephone || telephone.trim().length < 8) {
      return res.json({ success: true, data: null });
    }
    const norm = telephone.replace(/[^0-9]/g, '').slice(-8);
    const r = await db(
      `SELECT prenom, nom, telephone, email, ville
         FROM patients
        WHERE RIGHT(REGEXP_REPLACE(telephone, '[^0-9]', '', 'g'), 8) = $1
        LIMIT 1`,
      [norm]
    );
    res.json({ success: true, data: r.rows[0] || null });
  } catch(e) { res.json({ success: true, data: null }); }
});

// ── Creneaux disponibles d'un medecin (pour le flux public de RDV) ──
// Genere des creneaux de 30 min a partir de la table disponibilites
// (creee de longue date mais jamais exploitee par aucune route), en
// excluant ceux deja pris dans rendez_vous. Fenetre : aujourd'hui a
// J+30, pour rester utile sans devenir une liste infinie.
app.get('/api/public/medecins/:id/disponibilites', async (req, res) => {
  try {
    const medecinId = req.params.id;
    const dispos = await db(
      `SELECT date, heure_debut, heure_fin FROM disponibilites
        WHERE medecin_id=$1 AND statut='disponible'
          AND date >= CURRENT_DATE AND date <= CURRENT_DATE + INTERVAL '30 days'
        ORDER BY date, heure_debut`,
      [medecinId]
    );
    const pris = await db(
      `SELECT date_rdv, heure_rdv FROM rendez_vous
        WHERE medecin_id=$1 AND date_rdv >= CURRENT_DATE
          AND statut IS DISTINCT FROM 'annule'`,
      [medecinId]
    );
    const occupes = new Set(pris.rows.map(p => {
      const d = new Date(p.date_rdv).toISOString().split('T')[0];
      return `${d} ${String(p.heure_rdv).slice(0,5)}`;
    }));

    const creneaux = [];
    for (const d of dispos.rows) {
      const jour = new Date(d.date).toISOString().split('T')[0];
      let [h, m] = d.heure_debut.split(':').map(Number);
      const [hFin, mFin] = d.heure_fin.split(':').map(Number);
      while (h < hFin || (h === hFin && m < mFin)) {
        const heureStr = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
        const cle = `${jour} ${heureStr}`;
        if (!occupes.has(cle)) creneaux.push(cle);
        m += 30;
        if (m >= 60) { m -= 60; h += 1; }
      }
    }
    res.json({ success: true, data: creneaux.slice(0, 60) });
  } catch(e) { res.json({ success: true, data: [] }); }
});

// ── Creneaux disponibles pour laboratoire/imagerie (pas de "medecin"
// individuel a ces etablissements, donc pas de table disponibilites
// applicable). Genere des creneaux standards 8h-17h par 30 min sur les
// 14 prochains jours ouvres, en excluant ce qui est deja reserve dans
// rendez_vous pour ce prestataire precis -- pas de double reservation
// meme sans plage horaire saisie manuellement par l'etablissement.
app.get('/api/public/etablissements/:type/:id/disponibilites', async (req, res) => {
  try {
    const { type, id } = req.params;
    if (!['laboratoire', 'imagerie'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Type invalide' });
    }
    const pris = await db(
      `SELECT date_rdv, heure_rdv FROM rendez_vous
        WHERE prestataire_type=$1 AND prestataire_id=$2 AND date_rdv >= CURRENT_DATE
          AND statut IS DISTINCT FROM 'annule'`,
      [type, id]
    );
    const occupes = new Set(pris.rows.map(p => {
      const d = new Date(p.date_rdv).toISOString().split('T')[0];
      return `${d} ${String(p.heure_rdv).slice(0,5)}`;
    }));

    const creneaux = [];
    const aujourdhui = new Date();
    for (let jourOffset = 1; creneaux.length < 60 && jourOffset <= 21; jourOffset++) {
      const jour = new Date(aujourdhui);
      jour.setDate(jour.getDate() + jourOffset);
      if ([0, 6].includes(jour.getDay())) continue; // week-end exclu
      const jourStr = jour.toISOString().split('T')[0];
      for (let h = 8; h < 17; h++) {
        for (const m of [0, 30]) {
          const heureStr = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
          const cle = `${jourStr} ${heureStr}`;
          if (!occupes.has(cle)) creneaux.push(cle);
        }
      }
    }
    res.json({ success: true, data: creneaux.slice(0, 60) });
  } catch(e) { res.json({ success: true, data: [] }); }
});

app.post('/api/public/rdv', async (req, res) => {
  const { patient_nom, patient_telephone, clinique_id, medecin_id, etablissement_externe, prestataire_type, prestataire_id, date_rdv, heure_rdv, motif } = req.body;
  if (!date_rdv||!heure_rdv) return res.status(400).json({ success:false, message:'Date et heure requises' });
  if (!patient_nom||!patient_telephone) return res.status(400).json({ success:false, message:'Nom et téléphone requis' });

  // clinique_id / hopital utilisent la colonne clinique_id existante (dashboard clinique)
  // les autres types (laboratoire, imagerie, assurance, pharmacie) utilisent prestataire_type/prestataire_id
  let finalCliniqueId = clinique_id || null;
  let finalPrestataireType = prestataire_type || null;
  let finalPrestataireId = prestataire_id || null;
  if ((prestataire_type === 'clinique' || prestataire_type === 'hopital') && prestataire_id) {
    finalCliniqueId = prestataire_id;
    finalPrestataireType = null;
    finalPrestataireId = null;
  }

  if (!finalCliniqueId && !medecin_id && !etablissement_externe && !finalPrestataireId)
    return res.status(400).json({ success:false, message:'Etablissement requis' });

  try {
    const ref='MC-RDV-'+Math.random().toString(36).slice(2,8).toUpperCase();
    const r=await db(
      'INSERT INTO rendez_vous (id,reference,clinique_id,medecin_id,etablissement_externe,prestataire_type,prestataire_id,patient_nom,patient_telephone,date_rdv,heure_rdv,motif,source) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *',
      [uuid(),ref,finalCliniqueId,medecin_id||null,etablissement_externe||null,finalPrestataireType,finalPrestataireId,patient_nom,patient_telephone,date_rdv,heure_rdv,motif||null,'public_rdv']
    );
    res.status(201).json({ success:true, data:{ reference:ref, rdv_id:r.rows[0].id }, message:'RDV confirmé !' });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ── CHATBOT
app.use("/api/chatbot", require("./routes/chatbot"));
app.use("/api/cards-admin", require("./routes/cards_admin"));


// ── PATCH PATIENT WORKFLOW ────────────────────────────────────────
// Modifier une ligne d'acte deja ajoutee a un passage, avant validation
// (jamais une ligne deja facturee -- statut='a_facturer' uniquement).
// Le taux et la ventilation assurance/patient sont recalcules comme a
// l'ajout initial (formule du patient, repli sur le taux de l'acte).
app.put('/api/passages/:id/actes/:ligneId', auth, requireSousRole('bureau_entrees', 'medecin', 'finance'), async (req, res) => {
  const { quantite, prix_unitaire: prixSurcharge, est_assure } = req.body;
  try {
    const passage = await db("SELECT * FROM passages_patient WHERE id=$1 AND statut IN ('ouvert','ferme_temporaire')", [req.params.id]);
    if (!passage.rows.length) return res.status(404).json({ success:false, message:'Passage introuvable ou déjà validé' });
    const ligneR = await db("SELECT * FROM prise_en_charge_actes WHERE id=$1 AND passage_id=$2 AND statut='a_facturer'", [req.params.ligneId, req.params.id]);
    if (!ligneR.rows.length) return res.status(404).json({ success:false, message:'Ligne introuvable ou déjà facturée' });
    const l = ligneR.rows[0];
    const qte = quantite!=null ? parseInt(quantite) : l.quantite;
    const pu = prixSurcharge!=null ? parseFloat(prixSurcharge) : parseFloat(l.prix_unitaire);
    const assure = est_assure!=null ? !!est_assure : (parseInt(l.taux_assurance)>0);
    const total = qte * pu;
    let taux = 0;
    if (assure) {
      const patientRow = await db('SELECT formule_assurance_id FROM patients WHERE id=$1', [passage.rows[0].patient_id]);
      const formuleId = patientRow.rows[0]?.formule_assurance_id;
      let formule = null;
      if (formuleId) {
        const f = await db('SELECT taux_couverture FROM formules_assurance WHERE id=$1 AND is_active IS NOT false', [formuleId]);
        formule = f.rows[0] || null;
      }
      const acteRow = await db('SELECT taux_assurance FROM actes_medicaux WHERE id=$1', [l.acte_id]);
      taux = formule ? formule.taux_couverture : parseInt(acteRow.rows[0]?.taux_assurance ?? 70);
    }
    const partAss = Math.round(total * taux / 100);
    const partPat = total - partAss;
    const r = await db(
      `UPDATE prise_en_charge_actes SET quantite=$1, prix_unitaire=$2, taux_assurance=$3, part_assurance=$4, part_patient=$5
       WHERE id=$6 RETURNING *`,
      [qte, pu, taux, partAss, partPat, req.params.ligneId]
    );
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// Retirer une ligne d'acte d'un passage, avant validation.
app.delete('/api/passages/:id/actes/:ligneId', auth, requireSousRole('bureau_entrees', 'medecin', 'finance'), async (req, res) => {
  try {
    const passage = await db("SELECT id FROM passages_patient WHERE id=$1 AND statut IN ('ouvert','ferme_temporaire')", [req.params.id]);
    if (!passage.rows.length) return res.status(404).json({ success:false, message:'Passage introuvable ou déjà validé' });
    const r = await db("DELETE FROM prise_en_charge_actes WHERE id=$1 AND passage_id=$2 AND statut='a_facturer' RETURNING id", [req.params.ligneId, req.params.id]);
    if (!r.rows.length) return res.status(404).json({ success:false, message:'Ligne introuvable ou déjà facturée' });
    res.json({ success:true });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

app.post('/api/admin/patch-patient', async (req, res) => {
  const key = req.headers['x-admin-key'];
  if (key !== 'mediconnect_dev_secret_2024')
    return res.status(403).json({ success: false, message: 'Non autorise' });
  const results = [];
  const ops = [
    "ALTER TABLE utilisateurs DROP CONSTRAINT IF EXISTS utilisateurs_role_check",
    "ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS patient_id UUID",
    "ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS pays_code VARCHAR(5) DEFAULT 'CI'",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS prenom VARCHAR(100)",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS nom VARCHAR(100)",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS telephone VARCHAR(30)",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS email VARCHAR(200)",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS ville VARCHAR(100)",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS taille VARCHAR(10)",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS poids VARCHAR(10)",
    "ALTER TABLE patients ALTER COLUMN code_secret DROP NOT NULL",
    "ALTER TABLE patients ALTER COLUMN user_id DROP NOT NULL",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS contact_urgence_1 VARCHAR(100)",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS telephone_urgence_1 VARCHAR(30)",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS contact_urgence_2 VARCHAR(100)",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS telephone_urgence_2 VARCHAR(30)",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS contact_urgence_3 VARCHAR(100)",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS telephone_urgence_3 VARCHAR(30)",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS contact_urgence_4 VARCHAR(100)",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS telephone_urgence_4 VARCHAR(30)",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS contact_urgence_5 VARCHAR(100)",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS telephone_urgence_5 VARCHAR(30)",
    "ALTER TABLE mediconnect_card_requests ADD COLUMN IF NOT EXISTS contact_urgence_2 VARCHAR(100)",
    "ALTER TABLE mediconnect_card_requests ADD COLUMN IF NOT EXISTS telephone_urgence_2 VARCHAR(30)",
    "ALTER TABLE mediconnect_card_requests ADD COLUMN IF NOT EXISTS contact_urgence_3 VARCHAR(100)",
    "ALTER TABLE mediconnect_card_requests ADD COLUMN IF NOT EXISTS telephone_urgence_3 VARCHAR(30)",
    "ALTER TABLE mediconnect_card_requests ADD COLUMN IF NOT EXISTS contact_urgence_4 VARCHAR(100)",
    "ALTER TABLE mediconnect_card_requests ADD COLUMN IF NOT EXISTS telephone_urgence_4 VARCHAR(30)",
    "ALTER TABLE mediconnect_card_requests ADD COLUMN IF NOT EXISTS contact_urgence_5 VARCHAR(100)",
    "ALTER TABLE mediconnect_card_requests ADD COLUMN IF NOT EXISTS telephone_urgence_5 VARCHAR(30)",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS contact_urgence_1 VARCHAR(100)",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS telephone_urgence_1 VARCHAR(30)",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS contact_urgence_2 VARCHAR(100)",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS telephone_urgence_2 VARCHAR(30)",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS contact_urgence_3 VARCHAR(100)",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS telephone_urgence_3 VARCHAR(30)",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS contact_urgence_4 VARCHAR(100)",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS telephone_urgence_4 VARCHAR(30)",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS contact_urgence_5 VARCHAR(100)",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS telephone_urgence_5 VARCHAR(30)",
    "ALTER TABLE mediconnect_card_requests ADD COLUMN IF NOT EXISTS contact_urgence_2 VARCHAR(100)",
    "ALTER TABLE mediconnect_card_requests ADD COLUMN IF NOT EXISTS telephone_urgence_2 VARCHAR(30)",
    "ALTER TABLE mediconnect_card_requests ADD COLUMN IF NOT EXISTS contact_urgence_3 VARCHAR(100)",
    "ALTER TABLE mediconnect_card_requests ADD COLUMN IF NOT EXISTS telephone_urgence_3 VARCHAR(30)",
    "ALTER TABLE mediconnect_card_requests ADD COLUMN IF NOT EXISTS contact_urgence_4 VARCHAR(100)",
    "ALTER TABLE mediconnect_card_requests ADD COLUMN IF NOT EXISTS telephone_urgence_4 VARCHAR(30)",
    "ALTER TABLE mediconnect_card_requests ADD COLUMN IF NOT EXISTS contact_urgence_5 VARCHAR(100)",
    "ALTER TABLE mediconnect_card_requests ADD COLUMN IF NOT EXISTS telephone_urgence_5 VARCHAR(30)",
  ];
  for (const op of ops) {
    try {
      await db(op);
      results.push({ ok: true, op });
    } catch(e) {
      results.push({ ok: false, op, err: e.message });
    }
  }
  res.json({ success: true, results });
});


// ── ROUTES PUBLIQUES ETABLISSEMENTS ──────────────────────────────
app.get('/api/public/pharmacies', async (req, res) => {
  try {
    const r = await db(`SELECT p.id, p.nom, p.adresse, p.ville, p.telephone, p.email,
      u.is_active FROM pharmacies p LEFT JOIN utilisateurs u ON u.id=p.user_id
      WHERE u.is_active IS NOT false ORDER BY p.nom`);
    res.json({ success: true, data: r.rows });
  } catch(e) { res.json({ success: true, data: [] }); }
});

app.get('/api/public/assureurs', async (req, res) => {
  try {
    const r = await db(`SELECT a.id, a.nom, a.adresse, a.ville, a.telephone, a.email
      FROM assureurs a LEFT JOIN utilisateurs u ON u.id=a.user_id
      WHERE u.is_active IS NOT false ORDER BY a.nom`);
    res.json({ success: true, data: r.rows });
  } catch(e) { res.json({ success: true, data: [] }); }
});

app.get('/api/public/laboratoires', async (req, res) => {
  try {
    const r = await db(`SELECT l.id, l.nom, l.adresse, l.ville, l.telephone, l.email
      FROM laboratoires l LEFT JOIN utilisateurs u ON u.id=l.user_id
      WHERE u.is_active IS NOT false ORDER BY l.nom`);
    res.json({ success: true, data: r.rows });
  } catch(e) { res.json({ success: true, data: [] }); }
});

app.get('/api/public/imageries', async (req, res) => {
  try {
    const r = await db(`SELECT i.id, i.nom, i.adresse, i.ville, i.telephone, i.email
      FROM imageries i LEFT JOIN utilisateurs u ON u.id=i.user_id
      WHERE u.is_active IS NOT false ORDER BY i.nom`);
    res.json({ success: true, data: r.rows });
  } catch(e) { res.json({ success: true, data: [] }); }
});

app.get('/api/public/optiques', async (req, res) => {
  try {
    const r = await db(`SELECT c.id, c.nom, c.adresse, c.ville, c.telephone, c.email
      FROM cabinets_optiques c LEFT JOIN utilisateurs u ON u.id=c.user_id
      WHERE u.is_active IS NOT false ORDER BY c.nom`);
    res.json({ success: true, data: r.rows });
  } catch(e) { res.json({ success: true, data: [] }); }
});

app.get('/api/public/medecins-independants', async (req, res) => {
  try {
    const r = await db(`SELECT m.id, m.prenom, m.nom, m.specialite, m.telephone,
      m.email, m.ville, m.tarif, m.experience_ans, m.statut
      FROM medecins m LEFT JOIN utilisateurs u ON u.id=m.user_id
      WHERE u.role IN ('medecin_independant','medecin_conseil','medecin_prive')
      AND u.is_active IS NOT false ORDER BY m.nom`);
    res.json({ success: true, data: r.rows });
  } catch(e) { res.json({ success: true, data: [] }); }
});

// ══════════════════════════════════════════════════════════════════
//  RECHERCHE UNIFIEE — rdv.mediconnect4africa.cloud (Phase 2)
// ══════════════════════════════════════════════════════════════════
// Fusionne cliniques + laboratoires + imageries en une seule liste, avec
// un champ 'type' commun pour les distinguer cote client. Le calcul de
// distance (Haversine) est fait en SQL pur : aucune cle Google requise
// pour cette etape, seulement pour l'affichage carte cote frontend.
// lat/lng absents en base (clinique jamais geolocalisee) -> distance_km
// vaut NULL et la clinique reste trouvable par ville/pays/nom, juste
// exclue si un filtre "rayon" est explicitement demande.
// Metropoles ouest-africaines dont les etablissements sont enregistres
// par commune plutot que par le nom de l'agglomeration elle-meme.
// A completer au fil des besoins (Dakar, Ouagadougou...).
const AGGLOMERATIONS = {
  'abidjan': ['ABIDJAN','COCODY','YOPOUGON','ABOBO','ADJAME','PLATEAU','TREICHVILLE',
    'MARCORY','KOUMASSI','PORT-BOUET','ATTECOUBE','BINGERVILLE','ANYAMA','SONGON'],
};

app.get('/api/public/recherche-etablissements', async (req, res) => {
  try {
    const { type, q, pays, ville, specialite, lat, lng, rayon_km } = req.query;

    const typesDemandes = type
      ? type.split(',').map(t => t.trim()).filter(Boolean)
      : ['clinique', 'laboratoire', 'imagerie'];

    const hasGeo = lat && lng;
    const latNum = hasGeo ? parseFloat(lat) : null;
    const lngNum = hasGeo ? parseFloat(lng) : null;
    const rayonNum = rayon_km ? parseFloat(rayon_km) : null;

    // Formule de Haversine : distance en km entre deux points GPS.
    // Retourne NULL si l'etablissement n'a pas de coordonnees -- on ne
    // fait jamais semblant de connaitre une distance qu'on ignore.
    const distanceExpr = hasGeo
      ? `CASE WHEN t.latitude IS NOT NULL AND t.longitude IS NOT NULL THEN
           6371 * acos(LEAST(1, GREATEST(-1,
             cos(radians(${latNum})) * cos(radians(t.latitude)) *
             cos(radians(t.longitude) - radians(${lngNum})) +
             sin(radians(${latNum})) * sin(radians(t.latitude))
           )))
         ELSE NULL END`
      : 'NULL';

    const blocs = [];
    const params = [];
    let idx = 1;

    if (typesDemandes.includes('clinique')) {
      blocs.push(`
        SELECT c.id, c.nom, c.ville, c.pays_code, c.adresse, c.telephone, c.email,
               c.latitude, c.longitude, 'clinique' AS type,
               array_remove(array_agg(DISTINCT sc.nom) || array_agg(DISTINCT m.specialite), NULL) AS specialites,
               NULL::text[] AS analyses, NULL::text[] AS equipements
          FROM cliniques c
          LEFT JOIN specialites_clinique sc ON sc.clinique_id = c.id AND sc.disponible IS NOT false
          LEFT JOIN medecins m ON m.clinique_id = c.id AND m.statut IS DISTINCT FROM 'Indisponible'
         WHERE (c.is_active IS NOT false)
         GROUP BY c.id
      `);
    }
    if (typesDemandes.includes('laboratoire')) {
      blocs.push(`
        SELECT l.id, l.nom, l.ville, l.pays_code, l.adresse, l.telephone, l.email,
               l.latitude, l.longitude, 'laboratoire' AS type,
               NULL::text[] AS specialites, l.analyses, NULL::text[] AS equipements
          FROM laboratoires l
         WHERE (l.is_active IS NOT false)
      `);
    }
    if (typesDemandes.includes('imagerie')) {
      blocs.push(`
        SELECT i.id, i.nom, i.ville, i.pays_code, i.adresse, i.telephone, i.email,
               i.latitude, i.longitude, 'imagerie' AS type,
               NULL::text[] AS specialites, NULL::text[] AS analyses, i.equipements
          FROM imageries i
         WHERE (i.is_active IS NOT false)
      `);
    }

    if (!blocs.length) return res.json({ success: true, data: [] });

    let sql = `SELECT t.*, ${distanceExpr} AS distance_km FROM (${blocs.join(' UNION ALL ')}) t WHERE 1=1`;

    if (q) {
      // Avant : un seul LIKE '%phrase entiere%' -- "polyclinique abidjan
      // sud" ne matchait jamais "Polyclinique du Sud" car les mots ne se
      // suivent pas dans cet ordre dans le nom reel. On decoupe en mots
      // et on exige que CHACUN apparaisse quelque part dans le nom,
      // independamment de l'ordre -- comportement attendu d'une recherche.
      const motsQ = q.trim().split(/\s+/).filter(Boolean);
      motsQ.forEach(mot => {
        params.push('%' + mot.toLowerCase() + '%');
        sql += ` AND LOWER(t.nom) LIKE $${idx++}`;
      });
    }
    if (pays) { params.push(pays); sql += ` AND t.pays_code = $${idx++}`; }
    if (ville) {
      // Les cliniques importees en masse sont enregistrees par COMMUNE
      // (Cocody, Yopougon, Abobo...), pas par la metropole qui les
      // englobe. Chercher "Abidjan" ne matchait donc presque rien alors
      // que la grande majorite des cliniques y sont bel et bien situees.
      // AGGLOMERATIONS mappe une metropole vers ses communes connues ;
      // on elargit la recherche uniquement quand la ville demandee est
      // une metropole reconnue, sinon comportement inchange (LIKE simple).
      const communes = AGGLOMERATIONS[ville.trim().toLowerCase()];
      if (communes) {
        const placeholders = communes.map(c => { params.push(c.toLowerCase()); return `$${idx++}`; });
        sql += ` AND LOWER(t.ville) IN (${placeholders.join(',')})`;
      } else {
        params.push('%' + ville.toLowerCase() + '%');
        sql += ` AND LOWER(t.ville) LIKE $${idx++}`;
      }
    }
    if (specialite) {
      // Meme decoupage en mots-cles independants que pour 'q' ci-dessus,
      // mais chaque mot doit matcher AU MOINS UN des 4 champs (nom OU
      // specialite OU analyse OU equipement) -- et TOUS les mots doivent
      // etre satisfaits (AND entre mots, OR entre champs pour un meme mot).
      const motsSpe = specialite.trim().split(/\s+/).filter(Boolean);
      motsSpe.forEach(mot => {
        params.push('%' + mot.toLowerCase() + '%');
        sql += ` AND (
          LOWER(t.nom) LIKE $${idx}
          OR EXISTS (SELECT 1 FROM unnest(t.specialites) s WHERE LOWER(s) LIKE $${idx})
          OR EXISTS (SELECT 1 FROM unnest(t.analyses) a WHERE LOWER(a) LIKE $${idx})
          OR EXISTS (SELECT 1 FROM unnest(t.equipements) e WHERE LOWER(e) LIKE $${idx})
        )`;
        idx++;
      });
    }

    // Tri : par nom en SQL dans tous les cas -- trier par distance_km en
    // SQL echoue ("column distance_km does not exist") des que l'alias
    // est mele a une autre expression dans le meme ORDER BY. Le tri par
    // distance se fait donc en JS ci-dessous, sur un resultat deja borne
    // a 200 lignes : negligeable en cout, et evite le piege Postgres.
    sql += ' ORDER BY t.nom ASC LIMIT 500';

    const r = await db(sql, params);
    let rows = r.rows;

    // Filtre par rayon, PUIS tri par proximite si une position a ete
    // fournie. Fait en JS pour la meme raison que ci-dessus : plus simple
    // et tout aussi correct que de re-ecrire la requete avec une
    // sous-requete juste pour satisfaire Postgres sur cet alias.
    if (hasGeo) {
      if (rayonNum) {
        // AVANT : row.distance_km !== null && ... excluait TOUT
        // etablissement sans coordonnees GPS -- or la quasi-totalite des
        // 277+ etablissements importes en masse n'ont jamais eu de GPS
        // saisi (seules les nouvelles inscriptions cliniques le
        // capturent). Resultat : "Pres de moi" retournait 0 resultat
        // presque systematiquement, meme avec un grand rayon. On ne peut
        // pas savoir si un etablissement sans coordonnees est dans le
        // rayon ou non -- on choisit de ne PAS le cacher plutot que de
        // masquer la quasi-totalite de la base par prudence excessive.
        rows = rows.filter(row => row.distance_km === null || row.distance_km <= rayonNum);
      }
      rows = rows.slice().sort((a, b) => {
        if (a.distance_km === null && b.distance_km === null) return 0;
        if (a.distance_km === null) return 1;
        if (b.distance_km === null) return -1;
        return a.distance_km - b.distance_km;
      });
    }

    res.json({ success: true, data: rows, total: rows.length });
  } catch(e) {
    console.error('recherche-etablissements:', e.message);
    res.status(500).json({ success: false, message: e.message, data: [] });
  }
});


// ── TABLE ETABLISSEMENTS SANTE ────────────────────────────────────
app.post('/api/admin/init-etablissements', async (req, res) => {
  const key = req.headers['x-admin-key'];
  if (key !== 'mediconnect_dev_secret_2024')
    return res.status(403).json({ success: false, message: 'Non autorise' });
  try {
    await db(`CREATE TABLE IF NOT EXISTS etablissements_sante (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(20) UNIQUE NOT NULL,
      nom VARCHAR(300) NOT NULL,
      responsable VARCHAR(200),
      email VARCHAR(200),
      telephone VARCHAR(100),
      ville VARCHAR(100),
      adresse TEXT,
      specialites TEXT,
      type VARCHAR(50) DEFAULT 'clinique',
      secteur VARCHAR(100),
      membre_mediconnect BOOLEAN DEFAULT false,
      user_id UUID,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await db('CREATE INDEX IF NOT EXISTS idx_etab_ville ON etablissements_sante(ville)');
    await db('CREATE INDEX IF NOT EXISTS idx_etab_type ON etablissements_sante(type)');
    await db('CREATE INDEX IF NOT EXISTS idx_etab_membre ON etablissements_sante(membre_mediconnect)');
    res.json({ success: true, message: 'Table etablissements_sante creee' });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

app.post('/api/admin/import-etablissements', async (req, res) => {
  const key = req.headers['x-admin-key'];
  if (key !== 'mediconnect_dev_secret_2024')
    return res.status(403).json({ success: false, message: 'Non autorise' });
  const { etablissements } = req.body;
  if (!etablissements || !Array.isArray(etablissements))
    return res.status(400).json({ success: false, message: 'Donnees invalides' });
  let inserted = 0; let errors = 0;
  for (const e of etablissements) {
    try {
      await db(
        `INSERT INTO etablissements_sante (code, nom, responsable, email, telephone, ville, adresse, specialites, type, secteur, membre_mediconnect)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,false)
         ON CONFLICT (code) DO UPDATE SET nom=EXCLUDED.nom, telephone=EXCLUDED.telephone, ville=EXCLUDED.ville`,
        [e.code, e.nom, e.responsable||'', e.email||'', e.telephone||'', e.ville||'', e.adresse||'', e.specialites||'', e.type||'clinique', e.secteur||'']
      );
      inserted++;
    } catch(err) { errors++; }
  }
  res.json({ success: true, inserted, errors });
});

app.get('/api/public/etablissements', async (req, res) => {
  try {
    const { q, ville, type, limite } = req.query;
    let where = []; let params = []; let idx = 1;
    if (q) { where.push(`(UPPER(nom) LIKE UPPER($${idx}) OR UPPER(ville) LIKE UPPER($${idx}) OR UPPER(specialites) LIKE UPPER($${idx}))`); params.push('%'+q+'%'); idx++; }
    if (ville) { where.push(`UPPER(ville) LIKE UPPER($${idx})`); params.push('%'+ville+'%'); idx++; }
    if (type) { where.push(`type = $${idx}`); params.push(type); idx++; }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const lim = Math.min(parseInt(limite)||100, 500);
    const r = await db(
      `SELECT id, code, nom, responsable, email, telephone, ville, adresse, specialites, type, membre_mediconnect
       FROM etablissements_sante ${whereClause}
       ORDER BY membre_mediconnect DESC, nom ASC LIMIT ${lim}`,
      params
    );
    res.json({ success: true, data: r.rows, total: r.rows.length });
  } catch(e) { res.status(500).json({ success: false, message: e.message, data: [] }); }
});

app.put('/api/admin/etablissements/:code/membre', async (req, res) => {
  const key = req.headers['x-admin-key'];
  if (key !== 'mediconnect_dev_secret_2024')
    return res.status(403).json({ success: false, message: 'Non autorise' });
  try {
    const r = await db('UPDATE etablissements_sante SET membre_mediconnect=true WHERE code=$1 RETURNING *', [req.params.code]);
    res.json({ success: true, data: r.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});


// ══════════════════════════════════════════════════════════════════
//  FILE D'ATTENTE DIGITALISEE — MEDICONNECT AFRICA
// ══════════════════════════════════════════════════════════════════

// ── Init table ────────────────────────────────────────────────────
app.post('/api/admin/init-file-attente', async (req, res) => {
  const key = req.headers['x-admin-key'];
  if (key !== 'mediconnect_dev_secret_2024')
    return res.status(403).json({ success: false, message: 'Non autorisé' });
  try {
    await db(`CREATE TABLE IF NOT EXISTS file_attente (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      clinique_id UUID NOT NULL,
      patient_id UUID,
      patient_nom VARCHAR(200),
      patient_telephone VARCHAR(30),
      medecin_id UUID,
      medecin_nom VARCHAR(200),
      rang INTEGER NOT NULL,
      statut VARCHAR(30) DEFAULT 'en_attente',
      date_scan DATE DEFAULT CURRENT_DATE,
      heure_scan TIMESTAMPTZ DEFAULT NOW(),
      heure_appel TIMESTAMPTZ,
      heure_entree TIMESTAMPTZ,
      heure_sortie TIMESTAMPTZ,
      motif VARCHAR(200),
      rdv_id UUID,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await db('CREATE INDEX IF NOT EXISTS idx_fa_clinique ON file_attente(clinique_id, date_scan, statut)');
    await db('CREATE INDEX IF NOT EXISTS idx_fa_patient ON file_attente(patient_id)');
    res.json({ success: true, message: 'Table file_attente créée' });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── QR Code clinique — générer le QR d'une clinique ──────────────
// Le QR code contient l'URL : /api/file-attente/scan?clinique_id=XXX
app.get('/api/file-attente/qr/:clinique_id', async (req, res) => {
  try {
    const r = await db('SELECT id, nom, ville FROM cliniques WHERE id=$1', [req.params.clinique_id]);
    if (!r.rows[0]) return res.status(404).json({ success: false, message: 'Clinique non trouvée' });
    const clinique = r.rows[0];
    const scanUrl = `https://manager.mediconnect4africa.cloud/scan-accueil?clinique_id=${clinique.id}`;
    res.json({ success: true, clinique, scan_url: scanUrl });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Scanner le QR — patient rejoint la file ───────────────────────
app.post('/api/file-attente/scan', async (req, res) => {
  const { clinique_id, patient_id, medecin_id, motif } = req.body;
  if (!clinique_id) return res.status(400).json({ success: false, message: 'clinique_id requis' });
  try {
    // Vérifier que la clinique existe
    const cl = await db('SELECT id, nom FROM cliniques WHERE id=$1', [clinique_id]);
    if (!cl.rows[0]) return res.status(404).json({ success: false, message: 'Clinique non trouvée' });

    // Récupérer le dernier rang du jour pour cette clinique
    const last = await db(
      `SELECT MAX(rang) as max_rang FROM file_attente
       WHERE clinique_id=$1 AND date_scan=CURRENT_DATE`,
      [clinique_id]
    );
    const rang = (last.rows[0].max_rang || 0) + 1;

    // Récupérer les infos patient si connecté
    let patient_nom = 'Patient anonyme', patient_telephone = null, medecin_nom = null;
    if (patient_id) {
      const pat = await db(
        'SELECT prenom, nom, telephone FROM patients WHERE id=$1 OR user_id=$1 LIMIT 1',
        [patient_id]
      );
      if (pat.rows[0]) {
        patient_nom = `${pat.rows[0].prenom} ${pat.rows[0].nom}`;
        patient_telephone = pat.rows[0].telephone;
      }
    }

    if (medecin_id) {
      const med = await db('SELECT prenom, nom FROM medecins WHERE id=$1 LIMIT 1', [medecin_id]);
      if (med.rows[0]) medecin_nom = `Dr. ${med.rows[0].prenom} ${med.rows[0].nom}`;
    }

    // Calculer les patients déjà en attente devant ce patient
    const devant = await db(
      `SELECT COUNT(*) FROM file_attente
       WHERE clinique_id=$1 AND date_scan=CURRENT_DATE
       AND statut IN ('en_attente','appele')`,
      [clinique_id]
    );
    const patients_devant = parseInt(devant.rows[0].count);

    const r = await db(
      `INSERT INTO file_attente
       (clinique_id, patient_id, patient_nom, patient_telephone, medecin_id, medecin_nom, rang, motif)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [clinique_id, patient_id||null, patient_nom, patient_telephone,
       medecin_id||null, medecin_nom, rang, motif||null]
    );

    res.status(201).json({
      success: true,
      data: {
        ...r.rows[0],
        patients_devant,
        clinique_nom: cl.rows[0].nom,
        message: patients_devant === 0
          ? "C'est votre tour ! Présentez-vous à l'accueil."
          : `Vous êtes le numéro ${rang}. ${patients_devant} patient(s) devant vous.`
      }
    });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Mon rang — patient consulte sa position en temps réel ─────────
app.get('/api/file-attente/mon-rang/:ticket_id', async (req, res) => {
  try {
    const t = await db(
      'SELECT * FROM file_attente WHERE id=$1',
      [req.params.ticket_id]
    );
    if (!t.rows[0]) return res.status(404).json({ success: false, message: 'Ticket non trouvé' });
    const ticket = t.rows[0];

    const devant = await db(
      `SELECT COUNT(*) FROM file_attente
       WHERE clinique_id=$1 AND date_scan=$2
       AND rang < $3 AND statut IN ('en_attente','appele')`,
      [ticket.clinique_id, ticket.date_scan, ticket.rang]
    );
    const patients_devant = parseInt(devant.rows[0].count);

    res.json({
      success: true,
      data: {
        ...ticket,
        patients_devant,
        message: ticket.statut === 'appele'
          ? "C'est votre tour ! Entrez chez le médecin."
          : ticket.statut === 'en_consultation'
          ? "Vous êtes en consultation."
          : ticket.statut === 'termine'
          ? "Votre consultation est terminée."
          : patients_devant === 0
          ? "Vous êtes le prochain ! Tenez-vous prêt."
          : `${patients_devant} patient(s) devant vous. Patientez.`
      }
    });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Liste file d'attente — dashboard clinique + médecin ───────────
app.get('/api/file-attente/liste', async (req, res) => {
  const auth = req.headers['authorization']?.replace('Bearer ','');
  if (!auth) return res.status(401).json({ success: false, message: 'Token requis' });
  try {
    const jwt = require('jsonwebtoken');
    const payload = jwt.verify(auth, process.env.JWT_SECRET || 'mediconnect_dev_secret_2024');
    const { clinique_id, medecin_id, role, sous_role } = payload;

    let where = 'WHERE fa.date_scan=CURRENT_DATE';
    const params = [];
    let idx = 1;

    if (clinique_id) { where += ` AND fa.clinique_id=$${idx++}`; params.push(clinique_id); }
    // BUG CORRIGE : role vaut TOUJOURS 'clinique' pour un compte personnel
    // (medecin salarie, sous_role='medecin'), jamais 'medecin' -- ce filtre
    // ne s'appliquait donc jamais pour ces comptes, qui voyaient toute la
    // file d'attente de la clinique au lieu de leurs seuls patients.
    if (medecin_id && (role === 'medecin' || sous_role === 'medecin')) { where += ` AND fa.medecin_id=$${idx++}`; params.push(medecin_id); }

    const { statut } = req.query;
    if (statut) { where += ` AND fa.statut=$${idx++}`; params.push(statut); }

    const r = await db(
      `SELECT fa.*, c.nom as clinique_nom
       FROM file_attente fa
       LEFT JOIN cliniques c ON c.id=fa.clinique_id
       ${where}
       ORDER BY fa.rang ASC`,
      params
    );

    const stats = {
      en_attente: r.rows.filter(x=>x.statut==='en_attente').length,
      appele: r.rows.filter(x=>x.statut==='appele').length,
      en_consultation: r.rows.filter(x=>x.statut==='en_consultation').length,
      termine: r.rows.filter(x=>x.statut==='termine').length,
    };

    res.json({ success: true, data: r.rows, stats });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Affecter / reaffecter un medecin au ticket (bureau des entrees) ─
app.put('/api/file-attente/:id/affecter', auth, async (req, res) => {
  const { medecin_id } = req.body;
  if (!medecin_id) return res.status(400).json({ success:false, message:'medecin_id requis' });
  try {
    const med = await db('SELECT prenom, nom FROM medecins WHERE id=$1', [medecin_id]);
    if (!med.rows.length) return res.status(404).json({ success:false, message:'Médecin introuvable' });
    const medecin_nom = `Dr. ${med.rows[0].prenom} ${med.rows[0].nom}`;
    const r = await db(
      `UPDATE file_attente SET medecin_id=$1, medecin_nom=$2 WHERE id=$3 RETURNING *`,
      [medecin_id, medecin_nom, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ success:false, message:'Ticket introuvable' });
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ── Appeler le patient suivant ─────────────────────────────────────
app.put('/api/file-attente/:id/appeler', async (req, res) => {
  const auth = req.headers['authorization']?.replace('Bearer ','');
  if (!auth) return res.status(401).json({ success: false, message: 'Token requis' });
  try {
    const r = await db(
      `UPDATE file_attente SET statut='appele', heure_appel=NOW()
       WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    res.json({ success: true, data: r.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Marquer en consultation ───────────────────────────────────────
app.put('/api/file-attente/:id/consultation', async (req, res) => {
  try {
    const r = await db(
      `UPDATE file_attente SET statut='en_consultation', heure_entree=NOW()
       WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    res.json({ success: true, data: r.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Terminer consultation ──────────────────────────────────────────
app.put('/api/file-attente/:id/terminer', async (req, res) => {
  try {
    const r = await db(
      `UPDATE file_attente SET statut='termine', heure_sortie=NOW()
       WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    res.json({ success: true, data: r.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Réinitialiser la file (fin de journée) ────────────────────────
app.delete('/api/file-attente/reset', async (req, res) => {
  const auth = req.headers['authorization']?.replace('Bearer ','');
  if (!auth) return res.status(401).json({ success: false, message: 'Token requis' });
  try {
    const jwt = require('jsonwebtoken');
    const payload = jwt.verify(auth, process.env.JWT_SECRET || 'mediconnect_dev_secret_2024');
    await db(
      `UPDATE file_attente SET statut='annule'
       WHERE clinique_id=$1 AND date_scan=CURRENT_DATE AND statut='en_attente'`,
      [payload.clinique_id]
    );
    res.json({ success: true, message: 'File réinitialisée' });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Stats du jour ──────────────────────────────────────────────────
app.get('/api/file-attente/stats-jour', async (req, res) => {
  const auth = req.headers['authorization']?.replace('Bearer ','');
  if (!auth) return res.status(401).json({ success: false, message: 'Token requis' });
  try {
    const jwt = require('jsonwebtoken');
    const payload = jwt.verify(auth, process.env.JWT_SECRET || 'mediconnect_dev_secret_2024');
    const r = await db(
      `SELECT
        COUNT(*) FILTER (WHERE statut='en_attente') as en_attente,
        COUNT(*) FILTER (WHERE statut='appele') as appele,
        COUNT(*) FILTER (WHERE statut='en_consultation') as en_consultation,
        COUNT(*) FILTER (WHERE statut='termine') as termine,
        COUNT(*) as total,
        AVG(EXTRACT(EPOCH FROM (heure_sortie - heure_entree))/60) FILTER (WHERE heure_sortie IS NOT NULL) as duree_moy_min
       FROM file_attente
       WHERE clinique_id=$1 AND date_scan=CURRENT_DATE`,
      [payload.clinique_id]
    );
    res.json({ success: true, data: r.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});


// ── ACCÈS DOSSIER PATIENT PAR MÉDECIN (téléphone + code secret) ──
app.post('/api/patients/dossier-acces', async (req, res) => {
  const auth = req.headers['authorization']?.replace('Bearer ','');
  if (!auth) return res.status(401).json({ success: false, message: 'Token requis' });
  try {
    const jwt = require('jsonwebtoken');
    const payload = jwt.verify(auth, process.env.JWT_SECRET || 'mediconnect_dev_secret_2024');
    // Seuls les médecins et la clinique peuvent accéder
    if (!['medecin','medecin_independant','medecin_conseil','clinique','admin'].includes(payload.role))
      return res.status(403).json({ success: false, message: 'Accès non autorisé' });

    const { telephone, code_secret } = req.body;
    if (!telephone) return res.status(400).json({ success: false, message: 'Téléphone requis' });

    // Chercher le patient par téléphone
    const u = await db(
      `SELECT u.*, p.id as pid, p.groupe_sanguin, p.allergies, p.antecedents,
        p.taille, p.poids, p.date_naissance, p.ville,
        p.contact_urgence_1, p.telephone_urgence_1,
        p.contact_urgence_2, p.telephone_urgence_2,
        p.contact_urgence_3, p.telephone_urgence_3,
        p.contact_urgence_4, p.telephone_urgence_4,
        p.contact_urgence_5, p.telephone_urgence_5,
        p.code_secret
       FROM utilisateurs u
       LEFT JOIN patients p ON p.user_id = u.id
       WHERE u.telephone=$1 AND u.role='patient' LIMIT 1`,
      [telephone]
    );

    if (!u.rows[0])
      return res.status(404).json({ success: false, message: 'Patient non trouvé' });

    const patient = u.rows[0];

    // Vérifier le code secret si fourni
    if (code_secret) {
      const bcrypt = require('bcryptjs');
      const ok = await bcrypt.compare(code_secret, patient.password);
      if (!ok && patient.code_secret !== code_secret)
        return res.status(401).json({ success: false, message: 'Code secret incorrect' });
    }

    // Récupérer les ordonnances récentes
    const ords = await db(
      `SELECT id, medicaments, posologie, created_at FROM ordonnances
       WHERE patient_id=$1 ORDER BY created_at DESC LIMIT 5`,
      [patient.pid || patient.patient_id]
    ).catch(() => ({ rows: [] }));

    // Récupérer les consultations récentes
    const consults = await db(
      `SELECT id, diagnostic, date_consultation, medecin_nom FROM consultations
       WHERE patient_id=$1 ORDER BY date_consultation DESC LIMIT 5`,
      [patient.pid || patient.patient_id]
    ).catch(() => ({ rows: [] }));

    const { password, code_secret: cs, ...safe } = patient;

    res.json({
      success: true,
      data: {
        ...safe,
        id: patient.pid || patient.patient_id,
        ordonnances: ords.rows,
        consultations: consults.rows,
      }
    });
  } catch(e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── ACCÈS CONTACTS URGENCE PAR CLINIQUE ───────────────────────────
// CORRIGE : lisait patients.contact_urgence_1..5 (colonnes a plat,
// systeme abandonne) au lieu de la table contacts_urgence -- Express
// executant toujours la PREMIERE route definie pour un chemin donne,
// cette ancienne implementation prenait le pas sur la nouvelle
// (definie plus bas dans ce fichier) et la rendait totalement inerte.
app.get('/api/patients/:patient_id/contacts-urgence', auth, async (req, res) => {
  // Donnee critique en situation d'urgence, ne doit JAMAIS etre servie
  // depuis un cache (navigateur ou intermediaire) -- un ETag perime a
  // deja fait croire a une liste vide alors que des contacts existaient
  // reellement en base.
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  try {
    const r = await db(
      'SELECT * FROM contacts_urgence WHERE patient_id=$1 ORDER BY ordre, created_at',
      [req.params.patient_id]
    );
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});


// ══════════════════════════════════════════════════════════════════
//  TABLEAU DE BORD PROPRIÉTAIRE — SURVEILLANCE FINANCIÈRE
// ══════════════════════════════════════════════════════════════════

// ── Init table mouvements caisse ──────────────────────────────────
app.post('/api/admin/init-caisse-mouvements', async (req, res) => {
  const key = req.headers['x-admin-key'];
  if (key !== 'mediconnect_dev_secret_2024')
    return res.status(403).json({ success: false, message: 'Non autorisé' });
  try {
    await db(`CREATE TABLE IF NOT EXISTS caisse_mouvements (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      clinique_id UUID NOT NULL,
      session_id UUID,
      type VARCHAR(20) NOT NULL CHECK (type IN ('entree','sortie')),
      categorie VARCHAR(50) DEFAULT 'consultation',
      montant DECIMAL(12,2) NOT NULL,
      description TEXT,
      reference VARCHAR(100),
      patient_nom VARCHAR(200),
      medecin_nom VARCHAR(200),
      mode_paiement VARCHAR(30) DEFAULT 'especes',
      saisi_par VARCHAR(200),
      valide BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await db('CREATE INDEX IF NOT EXISTS idx_cm_clinique ON caisse_mouvements(clinique_id, created_at)');
    await db('CREATE INDEX IF NOT EXISTS idx_cm_type ON caisse_mouvements(type, clinique_id)');
    // Ajouter colonne role proprietaire dans utilisateurs
    await db("ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS est_proprietaire BOOLEAN DEFAULT false");
    await db("ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS proprietaire_clinique_id UUID");
    res.json({ success: true, message: 'Table caisse_mouvements + colonnes propriétaire créées' });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Enregistrer un mouvement de caisse ───────────────────────────
app.post('/api/caisse/mouvement', auth, requireSousRole('finance', 'bureau_entrees'), async (req, res) => {
  const { type, montant, description, categorie, patient_nom, medecin_nom, mode_paiement, reference } = req.body;
  if (!type || !montant) return res.status(400).json({ success: false, message: 'type et montant requis' });
  try {
    const cid = req.user?.clinique_id;
    if (!cid) return res.status(400).json({ success: false, message: 'clinique_id requis' });
    // Récupérer session ouverte
    const sess = await db(
      "SELECT id FROM caisse_sessions WHERE clinique_id=$1 AND date=CURRENT_DATE AND statut='ouverte' LIMIT 1",
      [cid]
    );
    const r = await db(
      `INSERT INTO caisse_mouvements
       (clinique_id, session_id, type, categorie, montant, description, patient_nom, medecin_nom, mode_paiement, reference, saisi_par)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [cid, sess.rows[0]?.id||null, type, categorie||'consultation', parseFloat(montant),
       description||null, patient_nom||null, medecin_nom||null,
       mode_paiement||'especes', reference||null,
       req.user?.prenom ? `${req.user.prenom} ${req.user.nom||''}`.trim() : 'Système']
    );
    // Mettre à jour les totaux de la session
    if (sess.rows[0]) {
      if (type === 'entree') {
        await db("UPDATE caisse_sessions SET total_encaisse=total_encaisse+$1 WHERE id=$2", [montant, sess.rows[0].id]);
      } else {
        await db("UPDATE caisse_sessions SET total_decaisse=total_decaisse+$1 WHERE id=$2", [montant, sess.rows[0].id]);
      }
    }
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Journal des mouvements (clinique + propriétaire) ─────────────
app.get('/api/caisse/journal', auth, requireSousRole('finance', 'bureau_entrees'), async (req, res) => {
  try {
    const { debut, fin, type, categorie } = req.query;
    let cid = req.user?.clinique_id || req.user?.proprietaire_clinique_id;
    if (!cid) return res.status(400).json({ success: false, message: 'clinique_id requis' });
    let where = 'WHERE clinique_id=$1';
    const params = [cid];
    let idx = 2;
    if (debut) { where += ` AND created_at >= $${idx++}`; params.push(debut); }
    if (fin) { where += ` AND created_at <= $${idx++}`; params.push(fin + ' 23:59:59'); }
    if (type) { where += ` AND type = $${idx++}`; params.push(type); }
    if (categorie) { where += ` AND categorie = $${idx++}`; params.push(categorie); }
    const r = await db(
      `SELECT * FROM caisse_mouvements ${where} ORDER BY created_at DESC LIMIT 200`,
      params
    );
    const totaux = await db(
      `SELECT
        SUM(montant) FILTER (WHERE type='entree') as total_entrees,
        SUM(montant) FILTER (WHERE type='sortie') as total_sorties,
        COUNT(*) FILTER (WHERE type='entree') as nb_entrees,
        COUNT(*) FILTER (WHERE type='sortie') as nb_sorties
       FROM caisse_mouvements ${where}`,
      params
    );
    res.json({ success: true, data: r.rows, totaux: totaux.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Tableau de bord propriétaire ─────────────────────────────────
app.get('/api/proprietaire/dashboard', auth, async (req, res) => {
  try {
    const cid = req.user?.clinique_id || req.user?.proprietaire_clinique_id;
    if (!cid) return res.status(400).json({ success: false, message: 'clinique_id requis' });

    // Infos clinique
    const cl = await db('SELECT id, nom, ville, telephone FROM cliniques WHERE id=$1', [cid]);

    // Caisse du jour
    const caisse_jour = await db(
      `SELECT
        COALESCE(SUM(montant) FILTER (WHERE type='entree'), 0) as entrees_jour,
        COALESCE(SUM(montant) FILTER (WHERE type='sortie'), 0) as sorties_jour,
        COUNT(*) FILTER (WHERE type='entree') as nb_entrees,
        COUNT(*) FILTER (WHERE type='sortie') as nb_sorties
       FROM caisse_mouvements WHERE clinique_id=$1 AND DATE(created_at)=CURRENT_DATE`,
      [cid]
    );

    // Caisse du mois
    const caisse_mois = await db(
      `SELECT
        COALESCE(SUM(montant) FILTER (WHERE type='entree'), 0) as entrees_mois,
        COALESCE(SUM(montant) FILTER (WHERE type='sortie'), 0) as sorties_mois,
        COUNT(DISTINCT DATE(created_at)) as jours_actifs
       FROM caisse_mouvements
       WHERE clinique_id=$1 AND DATE_TRUNC('month', created_at)=DATE_TRUNC('month', CURRENT_DATE)`,
      [cid]
    );

    // Évolution 7 derniers jours
    const evolution = await db(
      `SELECT
        DATE(created_at) as jour,
        SUM(montant) FILTER (WHERE type='entree') as entrees,
        SUM(montant) FILTER (WHERE type='sortie') as sorties
       FROM caisse_mouvements
       WHERE clinique_id=$1 AND created_at >= CURRENT_DATE - INTERVAL '7 days'
       GROUP BY DATE(created_at) ORDER BY jour ASC`,
      [cid]
    );

    // Consultations du jour
    const consult_jour = await db(
      `SELECT COUNT(*) as nb, COALESCE(SUM(montant_total),0) as revenu
       FROM consultations WHERE clinique_id=$1 AND DATE(date_consultation)=CURRENT_DATE`,
      [cid]
    ).catch(() => ({ rows: [{ nb: 0, revenu: 0 }] }));

    // Consultations du mois
    const consult_mois = await db(
      `SELECT COUNT(*) as nb, COALESCE(SUM(montant_total),0) as revenu
       FROM consultations WHERE clinique_id=$1
       AND DATE_TRUNC('month', date_consultation)=DATE_TRUNC('month', CURRENT_DATE)`,
      [cid]
    ).catch(() => ({ rows: [{ nb: 0, revenu: 0 }] }));

    // Top catégories dépenses du mois
    const top_depenses = await db(
      `SELECT categorie, SUM(montant) as total, COUNT(*) as nb
       FROM caisse_mouvements
       WHERE clinique_id=$1 AND type='sortie'
       AND DATE_TRUNC('month', created_at)=DATE_TRUNC('month', CURRENT_DATE)
       GROUP BY categorie ORDER BY total DESC LIMIT 5`,
      [cid]
    );

    // Top médecins par revenu du mois
    const top_medecins = await db(
      `SELECT medecin_nom, SUM(montant) as total, COUNT(*) as nb_actes
       FROM caisse_mouvements
       WHERE clinique_id=$1 AND type='entree' AND medecin_nom IS NOT NULL
       AND DATE_TRUNC('month', created_at)=DATE_TRUNC('month', CURRENT_DATE)
       GROUP BY medecin_nom ORDER BY total DESC LIMIT 5`,
      [cid]
    );

    // Statut caisse actuelle
    const caisse_statut = await db(
      "SELECT * FROM caisse_sessions WHERE clinique_id=$1 AND date=CURRENT_DATE ORDER BY opened_at DESC LIMIT 1",
      [cid]
    );

    // 10 derniers mouvements
    const derniers = await db(
      `SELECT * FROM caisse_mouvements WHERE clinique_id=$1 ORDER BY created_at DESC LIMIT 10`,
      [cid]
    );

    const cj = caisse_jour.rows[0];
    const cm = caisse_mois.rows[0];

    res.json({
      success: true,
      data: {
        clinique: cl.rows[0],
        jour: {
          entrees: parseFloat(cj.entrees_jour) || 0,
          sorties: parseFloat(cj.sorties_jour) || 0,
          solde: (parseFloat(cj.entrees_jour) || 0) - (parseFloat(cj.sorties_jour) || 0),
          nb_entrees: parseInt(cj.nb_entrees) || 0,
          nb_sorties: parseInt(cj.nb_sorties) || 0,
        },
        mois: {
          entrees: parseFloat(cm.entrees_mois) || 0,
          sorties: parseFloat(cm.sorties_mois) || 0,
          solde: (parseFloat(cm.entrees_mois) || 0) - (parseFloat(cm.sorties_mois) || 0),
          jours_actifs: parseInt(cm.jours_actifs) || 0,
        },
        consultations: {
          jour: { nb: parseInt(consult_jour.rows[0].nb), revenu: parseFloat(consult_jour.rows[0].revenu) },
          mois: { nb: parseInt(consult_mois.rows[0].nb), revenu: parseFloat(consult_mois.rows[0].revenu) },
        },
        evolution_7j: evolution.rows,
        top_depenses: top_depenses.rows,
        top_medecins: top_medecins.rows,
        caisse_statut: caisse_statut.rows[0] || { statut: 'fermee' },
        derniers_mouvements: derniers.rows,
      }
    });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Résumé mensuel par email (pour les propriétaires absents) ─────
app.get('/api/proprietaire/resume-mensuel', auth, async (req, res) => {
  try {
    const cid = req.user?.clinique_id || req.user?.proprietaire_clinique_id;
    const { mois, annee } = req.query;
    const m = mois || new Date().getMonth() + 1;
    const a = annee || new Date().getFullYear();

    const r = await db(
      `SELECT
        SUM(montant) FILTER (WHERE type='entree') as total_entrees,
        SUM(montant) FILTER (WHERE type='sortie') as total_sorties,
        COUNT(*) FILTER (WHERE type='entree') as nb_entrees,
        COUNT(*) FILTER (WHERE type='sortie') as nb_sorties,
        MAX(montant) FILTER (WHERE type='entree') as plus_grosse_entree,
        MAX(montant) FILTER (WHERE type='sortie') as plus_grosse_sortie,
        COUNT(DISTINCT DATE(created_at)) as jours_actifs
       FROM caisse_mouvements
       WHERE clinique_id=$1
       AND EXTRACT(MONTH FROM created_at)=$2
       AND EXTRACT(YEAR FROM created_at)=$3`,
      [cid, m, a]
    );

    const par_categorie = await db(
      `SELECT categorie, type,
        SUM(montant) as total, COUNT(*) as nb
       FROM caisse_mouvements
       WHERE clinique_id=$1
       AND EXTRACT(MONTH FROM created_at)=$2
       AND EXTRACT(YEAR FROM created_at)=$3
       GROUP BY categorie, type ORDER BY total DESC`,
      [cid, m, a]
    );

    const par_semaine = await db(
      `SELECT
        EXTRACT(WEEK FROM created_at) as semaine,
        SUM(montant) FILTER (WHERE type='entree') as entrees,
        SUM(montant) FILTER (WHERE type='sortie') as sorties
       FROM caisse_mouvements
       WHERE clinique_id=$1
       AND EXTRACT(MONTH FROM created_at)=$2
       AND EXTRACT(YEAR FROM created_at)=$3
       GROUP BY semaine ORDER BY semaine`,
      [cid, m, a]
    );

    const totaux = r.rows[0];
    res.json({
      success: true,
      data: {
        periode: { mois: m, annee: a },
        totaux: {
          entrees: parseFloat(totaux.total_entrees) || 0,
          sorties: parseFloat(totaux.total_sorties) || 0,
          solde_net: (parseFloat(totaux.total_entrees) || 0) - (parseFloat(totaux.total_sorties) || 0),
          nb_entrees: parseInt(totaux.nb_entrees) || 0,
          nb_sorties: parseInt(totaux.nb_sorties) || 0,
          jours_actifs: parseInt(totaux.jours_actifs) || 0,
        },
        par_categorie: par_categorie.rows,
        par_semaine: par_semaine.rows,
      }
    });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});


// ══════════════════════════════════════════════════════════════════
//  LOGO CLINIQUE — UPLOAD ET RÉCUPÉRATION
// ══════════════════════════════════════════════════════════════════

// ── Init colonne logo ─────────────────────────────────────────────
app.post('/api/admin/init-logo-clinique', async (req, res) => {
  const key = req.headers['x-admin-key'];
  if (key !== 'mediconnect_dev_secret_2024')
    return res.status(403).json({ success: false, message: 'Non autorisé' });
  try {
    await db('ALTER TABLE cliniques ADD COLUMN IF NOT EXISTS logo TEXT');
    await db('ALTER TABLE cliniques ADD COLUMN IF NOT EXISTS adresse_complete TEXT');
    await db('ALTER TABLE cliniques ADD COLUMN IF NOT EXISTS slogan VARCHAR(300)');
    await db('ALTER TABLE cliniques ADD COLUMN IF NOT EXISTS horaires VARCHAR(200)');
    await db('ALTER TABLE cliniques ADD COLUMN IF NOT EXISTS site_web VARCHAR(200)');
    res.json({ success: true, message: 'Colonnes logo et infos clinique ajoutées' });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Upload logo clinique (base64) ─────────────────────────────────
app.post('/api/clinique/logo', auth, async (req, res) => {
  try {
    const { logo, slogan, adresse_complete, horaires, site_web, telephone, adresse, ville } = req.body;
    const cid = req.user?.clinique_id;
    if (!cid) return res.status(400).json({ success: false, message: 'clinique_id requis' });

    // Le logo est desormais optionnel a la sauvegarde : si absent, on
    // conserve celui deja enregistre (permet de mettre a jour les
    // coordonnees seules, sans re-uploader une image a chaque fois).
    if (logo && logo.length > 3000000)
      return res.status(400).json({ success: false, message: 'Logo trop volumineux (max 2MB)' });

    const r = await db(
      `UPDATE cliniques SET
         logo=COALESCE($1,logo), slogan=COALESCE($2,slogan),
         adresse_complete=COALESCE($3,adresse_complete), horaires=COALESCE($4,horaires),
         site_web=COALESCE($5,site_web), telephone=COALESCE($6,telephone),
         adresse=COALESCE($7,adresse), ville=COALESCE($8,ville)
       WHERE id=$9
       RETURNING id, nom, logo, slogan, adresse_complete, horaires, site_web, telephone, adresse, ville`,
      [logo||null, slogan||null, adresse_complete||null, horaires||null, site_web||null,
       telephone||null, adresse||null, ville||null, cid]
    );
    res.json({ success: true, data: r.rows[0], message: 'Profil mis à jour avec succès' });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Récupérer infos + logo clinique ──────────────────────────────
app.get('/api/clinique/profil', auth, async (req, res) => {
  try {
    const cid = req.user?.clinique_id;
    if (!cid) return res.status(400).json({ success: false, message: 'clinique_id requis' });
    const r = await db(
      `SELECT id, nom, adresse, adresse_complete, ville, telephone, email,
              logo, slogan, horaires, site_web, created_at
       FROM cliniques WHERE id=$1`, [cid]
    );
    res.json({ success: true, data: r.rows[0] || null });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Logo public par clinique_id (pour les impressions) ───────────
app.get('/api/public/clinique/:id/logo', async (req, res) => {
  try {
    const r = await db(
      'SELECT nom, logo, slogan, adresse_complete, ville, telephone, email, horaires, site_web FROM cliniques WHERE id=$1',
      [req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ success: false, message: 'Clinique non trouvée' });
    res.json({ success: true, data: r.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});


// ── PATCH /api/rendez-vous/:id/confirmer ─────────────────────────
app.patch('/api/rendez-vous/:id/confirmer', auth, async (req, res) => {
  try {
    const r = await db(
      "UPDATE rendez_vous SET statut='confirme', updated_at=NOW() WHERE id=$1 RETURNING *",
      [req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ success:false, message:'RDV non trouvé' });
    res.json({ success:true, data:r.rows[0], message:'RDV confirmé' });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ── PATCH /api/rendez-vous/:id/statut ────────────────────────────
app.patch('/api/rendez-vous/:id/statut', auth, async (req, res) => {
  const { statut } = req.body;
  const STATUTS = ['en_attente','confirme','annule','termine','reporte'];
  if (!statut || !STATUTS.includes(statut))
    return res.status(400).json({ success:false, message:'Statut invalide. Valeurs: '+STATUTS.join(', ') });
  try {
    const r = await db(
      'UPDATE rendez_vous SET statut=$1, updated_at=NOW() WHERE id=$2 RETURNING *',
      [statut, req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ success:false, message:'RDV non trouvé' });
    res.json({ success:true, data:r.rows[0], message:`Statut mis à jour: ${statut}` });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ── GET /api/rendez-vous/patient/:patient_id ──────────────────────
app.get('/api/rendez-vous/patient/:patient_id', auth, async (req, res) => {
  try {
    const r = await db(
      `SELECT * FROM rendez_vous WHERE patient_id=$1 ORDER BY date_rdv DESC, heure_rdv DESC LIMIT 50`,
      [req.params.patient_id]
    );
    res.json({ success:true, data:r.rows });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ── GET /api/rendez-vous/stats ────────────────────────────────────
app.get('/api/rendez-vous/stats', auth, async (req, res) => {
  try {
    const cid = req.user?.clinique_id;
    if (!cid) return res.status(400).json({ success:false, message:'clinique_id requis' });
    const r = await db(
      `SELECT
        COUNT(*) FILTER (WHERE date_rdv = CURRENT_DATE) as rdv_aujourd_hui,
        COUNT(*) FILTER (WHERE date_rdv = CURRENT_DATE AND statut='confirme') as confirmes_aujourd_hui,
        COUNT(*) FILTER (WHERE date_rdv = CURRENT_DATE AND statut='en_attente') as en_attente_aujourd_hui,
        COUNT(*) FILTER (WHERE date_rdv >= DATE_TRUNC('month', CURRENT_DATE)) as rdv_ce_mois,
        COUNT(*) FILTER (WHERE statut='annule' AND date_rdv >= CURRENT_DATE - INTERVAL '30 days') as annules_30j,
        COUNT(*) FILTER (WHERE date_rdv > CURRENT_DATE) as rdv_futurs
       FROM rendez_vous WHERE clinique_id=$1`,
      [cid]
    );
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});


// ── PATCH CONSULTATIONS & ORDONNANCES ────────────────────────────
app.post('/api/admin/patch-consultations', async (req, res) => {
  const key = req.headers['x-admin-key'];
  if (key !== 'mediconnect_dev_secret_2024')
    return res.status(403).json({ success: false });
  const sqls = [
    "ALTER TABLE consultations ADD COLUMN IF NOT EXISTS traitement TEXT",
    "ALTER TABLE consultations ADD COLUMN IF NOT EXISTS notes TEXT",
    "ALTER TABLE consultations ADD COLUMN IF NOT EXISTS tension_arterielle VARCHAR(20)",
    "ALTER TABLE consultations ADD COLUMN IF NOT EXISTS temperature VARCHAR(10)",
    "ALTER TABLE consultations ADD COLUMN IF NOT EXISTS poids VARCHAR(10)",
    "ALTER TABLE consultations ADD COLUMN IF NOT EXISTS taille VARCHAR(10)",
    "ALTER TABLE consultations ADD COLUMN IF NOT EXISTS rdv_id UUID",
    "ALTER TABLE consultations ADD COLUMN IF NOT EXISTS pathologie VARCHAR(200)",
    "ALTER TABLE consultations ADD COLUMN IF NOT EXISTS age_patient VARCHAR(10)",
    "ALTER TABLE consultations ADD COLUMN IF NOT EXISTS sexe_patient VARCHAR(20)",
    "ALTER TABLE consultations ADD COLUMN IF NOT EXISTS gravite VARCHAR(20) DEFAULT 'modere'",
    "ALTER TABLE consultations ADD COLUMN IF NOT EXISTS pays_code VARCHAR(5) DEFAULT 'CI'",
    "ALTER TABLE consultations ADD COLUMN IF NOT EXISTS montant_total DECIMAL(12,2)",
    "ALTER TABLE consultations ADD COLUMN IF NOT EXISTS statut VARCHAR(20) DEFAULT 'terminee'",
    "ALTER TABLE consultations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()",
    "ALTER TABLE ordonnances ADD COLUMN IF NOT EXISTS consultation_id UUID",
    "ALTER TABLE ordonnances ADD COLUMN IF NOT EXISTS notes_ord TEXT",
    "ALTER TABLE ordonnances ADD COLUMN IF NOT EXISTS duree VARCHAR(50)",
    "ALTER TABLE ordonnances ADD COLUMN IF NOT EXISTS posologie TEXT",
    "ALTER TABLE ordonnances ADD COLUMN IF NOT EXISTS medecin_id UUID",
    "ALTER TABLE ordonnances ADD COLUMN IF NOT EXISTS medecin_nom VARCHAR(200)",
    "ALTER TABLE ordonnances ADD COLUMN IF NOT EXISTS statut VARCHAR(20) DEFAULT 'active'",
    "ALTER TABLE consultations ADD COLUMN IF NOT EXISTS motif TEXT",
    "ALTER TABLE consultations ADD COLUMN IF NOT EXISTS hdm_antecedents TEXT",
    "ALTER TABLE consultations ADD COLUMN IF NOT EXISTS examen_clinique TEXT",
    "ALTER TABLE consultations ADD COLUMN IF NOT EXISTS hypotheses_diagnostiques TEXT",
    "ALTER TABLE consultations ADD COLUMN IF NOT EXISTS pouls VARCHAR(10)",
    "ALTER TABLE consultations ADD COLUMN IF NOT EXISTS imc VARCHAR(10)",
    "ALTER TABLE consultations ADD COLUMN IF NOT EXISTS pc VARCHAR(10)",
    "ALTER TABLE consultations ADD COLUMN IF NOT EXISTS fr VARCHAR(10)",
    "ALTER TABLE consultations ADD COLUMN IF NOT EXISTS tso2 VARCHAR(10)",
    "ALTER TABLE consultations ADD COLUMN IF NOT EXISTS pb VARCHAR(10)",
    "ALTER TABLE consultations ADD COLUMN IF NOT EXISTS pcui VARCHAR(10)",
    "ALTER TABLE consultations ADD COLUMN IF NOT EXISTS biologie_predefinis TEXT",
    "ALTER TABLE consultations ADD COLUMN IF NOT EXISTS biologie_texte TEXT",
    "ALTER TABLE consultations ADD COLUMN IF NOT EXISTS imagerie_texte TEXT",
    "ALTER TABLE consultations ADD COLUMN IF NOT EXISTS autres_examens TEXT",
    "ALTER TABLE consultations ADD COLUMN IF NOT EXISTS diagnostic_predefini VARCHAR(200)",
    "ALTER TABLE consultations ADD COLUMN IF NOT EXISTS traitement_predefini TEXT",
    "ALTER TABLE consultations ADD COLUMN IF NOT EXISTS date_controle DATE",
    "ALTER TABLE consultations ALTER COLUMN motif DROP NOT NULL",
    "ALTER TABLE consultations ALTER COLUMN diagnostic SET DEFAULT ''",
    "ALTER TABLE consultations ADD COLUMN IF NOT EXISTS date_consultation DATE DEFAULT CURRENT_DATE",
    "ALTER TABLE consultations ADD COLUMN IF NOT EXISTS medecin_nom VARCHAR(200)",
    "ALTER TABLE consultations DROP CONSTRAINT IF EXISTS consultations_medecin_id_fkey",
    "ALTER TABLE consultations DROP CONSTRAINT IF EXISTS fk_consultations_medecin",
  ];
  const results = [];
  for (const sql of sqls) {
    try { await db(sql); results.push({ ok:true, sql:sql.slice(0,60) }); }
    catch(e) { results.push({ ok:false, sql:sql.slice(0,60), err:e.message }); }
  }
  res.json({ success:true, results });
});


// ══════════════════════════════════════════════════════════════════
//  IMAGERIE / RADIOLOGIE
// ══════════════════════════════════════════════════════════════════
app.get('/api/imagerie', auth, requireSousRole('medecin'), async (req, res) => {
  try {
    const { patient_id } = req.query;
    const cid = req.user?.clinique_id;
    let sql = 'SELECT * FROM examens_imagerie WHERE 1=1';
    const p = [];
    if (patient_id) { p.push(patient_id); sql += ` AND patient_id=$${p.length}`; }
    else if (cid)   { p.push(cid);        sql += ` AND clinique_id=$${p.length}`; }
    sql += ' ORDER BY created_at DESC LIMIT 100';
    const r = await db(sql, p).catch(async () => {
      // Table inexistante — créer et retourner vide
      await db(`CREATE TABLE IF NOT EXISTS examens_imagerie (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_id UUID, clinique_id UUID, medecin_id UUID,
        type_examen VARCHAR(100), resultat TEXT, observations TEXT,
        fichier_url TEXT, date_examen DATE DEFAULT CURRENT_DATE,
        statut VARCHAR(30) DEFAULT 'en_attente',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`).catch(()=>{});
      return { rows: [] };
    });
    res.json({ success: true, data: r.rows });
  } catch(e) { res.json({ success: true, data: [] }); }
});

app.post('/api/imagerie', auth, requireSousRole('medecin'), async (req, res) => {
  const { patient_id, type_examen, resultat, observations, date_examen, fichier_url } = req.body;
  if (!patient_id || !type_examen) return res.status(400).json({ success: false, message: 'Patient et type examen requis' });
  try {
    const r = await db(
      `INSERT INTO examens_imagerie (id,patient_id,clinique_id,medecin_id,type_examen,resultat,observations,fichier_url,date_examen)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [uuid(),patient_id,req.user?.clinique_id||null,req.user?.medecin_id||null,
       type_examen,resultat||null,observations||null,fichier_url||null,
       date_examen||new Date().toISOString().split('T')[0]]
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════════════════════════════════════════════════════════════
//  RÉSULTATS LABORATOIRE
// ══════════════════════════════════════════════════════════════════
app.get('/api/resultats-labo', auth, requireSousRole('medecin'), async (req, res) => {
  try {
    const { patient_id } = req.query;
    const cid = req.user?.clinique_id;
    let sql = 'SELECT * FROM resultats_labo WHERE 1=1';
    const p = [];
    if (patient_id) { p.push(patient_id); sql += ` AND patient_id=$${p.length}`; }
    else if (cid)   { p.push(cid);        sql += ` AND clinique_id=$${p.length}`; }
    sql += ' ORDER BY created_at DESC LIMIT 100';
    const r = await db(sql, p).catch(async () => {
      await db(`CREATE TABLE IF NOT EXISTS resultats_labo (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_id UUID, clinique_id UUID, labo_id UUID,
        type_analyse VARCHAR(200), valeurs JSONB, interpretation TEXT,
        fichier_url TEXT, date_prelevement DATE DEFAULT CURRENT_DATE,
        statut VARCHAR(30) DEFAULT 'en_attente',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`).catch(()=>{});
      return { rows: [] };
    });
    res.json({ success: true, data: r.rows });
  } catch(e) { res.json({ success: true, data: [] }); }
});

app.post('/api/resultats-labo', auth, requireSousRole('medecin'), async (req, res) => {
  const { patient_id, type_analyse, valeurs, interpretation, date_prelevement, fichier_url } = req.body;
  if (!patient_id || !type_analyse) return res.status(400).json({ success: false, message: 'Patient et type analyse requis' });
  try {
    const r = await db(
      `INSERT INTO resultats_labo (id,patient_id,clinique_id,type_analyse,valeurs,interpretation,fichier_url,date_prelevement)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [uuid(),patient_id,req.user?.clinique_id||null,type_analyse,
       valeurs?JSON.stringify(valeurs):null,interpretation||null,fichier_url||null,
       date_prelevement||new Date().toISOString().split('T')[0]]
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════════════════════════════════════════════════════════════
//  EXAMENS (bulletins d'analyse + radio combinés)
// ══════════════════════════════════════════════════════════════════
app.get('/api/examens', auth, requireSousRole('medecin'), async (req, res) => {
  try {
    const { patient_id } = req.query;
    const cid = req.user?.clinique_id;
    const p = [];
    let where = 'WHERE 1=1';
    if (patient_id) {
      p.push(patient_id); where += ` AND patient_id=$${p.length}`;
      // Confidentialite : un examen/bulletin n'est visible pour une AUTRE
      // clinique que si explicitement partage. Meme regle que consultations.
      p.push(cid||null); where += ` AND (clinique_id=$${p.length} OR partage_reseau=true)`;
    }
    else if (cid)   { p.push(cid);        where += ` AND clinique_id=$${p.length}`; }

    const [imagerie, labo, bulletinsR] = await Promise.all([
      db(`SELECT *,'imagerie' AS type_source FROM examens_imagerie ${where} ORDER BY created_at DESC LIMIT 50`, p).catch(()=>({rows:[]})),
      db(`SELECT *,'labo' AS type_source FROM resultats_labo ${where} ORDER BY created_at DESC LIMIT 50`, p).catch(()=>({rows:[]})),
      db(`SELECT * FROM bulletins ${where} ORDER BY created_at DESC LIMIT 50`, p).catch(()=>({rows:[]})),
    ]);
    // Bulletins (systeme demandes/reponses labo+imagerie) adaptes au meme
    // format d'affichage que les deux tables historiques -- sans ca, une
    // demande envoyee via 'Demander un examen' restait invisible ici
    // malgre un succes d'envoi confirme (bug reel constate en test).
    const bulletinsAdaptes = bulletinsR.rows.map(b => ({
      ...b,
      type_source: b.categorie === 'laboratoire' ? 'labo' : 'imagerie',
      type_analyse: b.type,
      type_examen: b.type,
      statut: b.statut === 'nouveau' ? 'en_attente' : (b.statut === 'traite' ? 'valide' : b.statut),
      interpretation: b.rapport,
      observations: b.notes,
    }));
    const data = [...imagerie.rows, ...labo.rows, ...bulletinsAdaptes].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
    res.json({ success: true, data });
  } catch(e) { res.json({ success: true, data: [] }); }
});

// ── Init tables examens ───────────────────────────────────────────
app.post('/api/admin/init-examens', async (req, res) => {
  const key = req.headers['x-admin-key'];
  if (key !== 'mediconnect_dev_secret_2024') return res.status(403).json({ success: false });
  try {
    await db(`CREATE TABLE IF NOT EXISTS examens_imagerie (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id UUID, clinique_id UUID, medecin_id UUID, consultation_id UUID,
      type_examen VARCHAR(100) NOT NULL, resultat TEXT, observations TEXT,
      fichier_url TEXT, date_examen DATE DEFAULT CURRENT_DATE,
      statut VARCHAR(30) DEFAULT 'en_attente', created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await db(`CREATE TABLE IF NOT EXISTS resultats_labo (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id UUID, clinique_id UUID, labo_id UUID, consultation_id UUID,
      type_analyse VARCHAR(200) NOT NULL, valeurs JSONB, interpretation TEXT,
      fichier_url TEXT, date_prelevement DATE DEFAULT CURRENT_DATE,
      statut VARCHAR(30) DEFAULT 'en_attente', created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await db('CREATE INDEX IF NOT EXISTS idx_imagerie_patient ON examens_imagerie(patient_id)');
    await db('CREATE INDEX IF NOT EXISTS idx_labo_patient ON resultats_labo(patient_id)');
    res.json({ success: true, message: 'Tables examens_imagerie et resultats_labo créées' });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});


// ══════════════════════════════════════════════════════════════════
//  NOMENCLATURE : ACTES MEDICAUX + AFFECTIONS CIM-10
// ══════════════════════════════════════════════════════════════════

app.post('/api/admin/init-nomenclature', async (req, res) => {
  if (req.headers['x-admin-key'] !== 'mediconnect_dev_secret_2024')
    return res.status(403).json({ success:false });
  try {
    await db(`CREATE TABLE IF NOT EXISTS actes_medicaux (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      clinique_id UUID,
      code VARCHAR(20) NOT NULL,
      libelle VARCHAR(300) NOT NULL,
      categorie VARCHAR(60),
      tarif_base DECIMAL(12,2) DEFAULT 0,
      taux_assurance INTEGER DEFAULT 70,
      actif BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    // tarif_base sert de prix "non assuré" (deja scope par clinique_id) --
    // prix_subventionne est le 2e niveau de tarification par acte.
    await db(`ALTER TABLE actes_medicaux ADD COLUMN IF NOT EXISTS prix_subventionne DECIMAL(12,2)`);
    // Tarif negocie par acte, propre a CHAQUE convention (clinique +
    // assureur) : le 3e niveau ("assure"), variable selon l'assureur.
    // Repli sur le taux de la convention/formule si aucune ligne ici.
    await db(`CREATE TABLE IF NOT EXISTS actes_tarifs_convention (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      convention_id UUID NOT NULL REFERENCES conventions(id) ON DELETE CASCADE,
      acte_id UUID NOT NULL REFERENCES actes_medicaux(id) ON DELETE CASCADE,
      tarif_negocie DECIMAL(12,2) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(convention_id, acte_id)
    )`);
    await db(`CREATE TABLE IF NOT EXISTS affections_cim10 (
      code VARCHAR(10) PRIMARY KEY,
      libelle VARCHAR(300) NOT NULL,
      chapitre VARCHAR(120)
    )`);
    await db(`CREATE TABLE IF NOT EXISTS prise_en_charge_actes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id UUID NOT NULL,
      clinique_id UUID,
      consultation_id UUID,
      rdv_id UUID,
      acte_id UUID,
      code_acte VARCHAR(20),
      libelle_acte VARCHAR(300),
      quantite INTEGER DEFAULT 1,
      prix_unitaire DECIMAL(12,2) DEFAULT 0,
      taux_assurance INTEGER DEFAULT 0,
      part_assurance DECIMAL(12,2) DEFAULT 0,
      part_patient DECIMAL(12,2) DEFAULT 0,
      statut VARCHAR(20) DEFAULT 'a_facturer',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await db("CREATE INDEX IF NOT EXISTS idx_pec_patient ON prise_en_charge_actes(patient_id)");
    await db("ALTER TABLE consultations ADD COLUMN IF NOT EXISTS code_cim10 VARCHAR(10)");

    // Actes de base (nomenclature CI — tarifs indicatifs FCFA)
    const actes = [
      ['C1','Consultation generaliste','Consultation',10000,70],
      ['C2','Consultation specialiste','Consultation',20000,70],
      ['C3','Consultation urgence','Consultation',25000,80],
      ['CS1','Consultation de suivi','Consultation',7000,70],
      ['K10','Pansement simple','Soins infirmiers',3000,70],
      ['K20','Injection IM / IV','Soins infirmiers',2500,70],
      ['K30','Perfusion','Soins infirmiers',8000,70],
      ['K40','Suture plaie simple','Petite chirurgie',15000,70],
      ['B10','Prise de sang / prelevement','Laboratoire',2000,70],
      ['B20','NFS - Numeration formule sanguine','Laboratoire',6000,70],
      ['B30','Glycemie a jeun','Laboratoire',3000,70],
      ['B40','Test paludisme (TDR)','Laboratoire',2500,80],
      ['B50','Serologie / CRP','Laboratoire',8000,70],
      ['R10','Radiographie thorax','Imagerie',15000,70],
      ['R20','Radiographie membre','Imagerie',12000,70],
      ['E10','Echographie abdominale','Imagerie',20000,70],
      ['E20','Echographie obstetricale','Imagerie',18000,70],
      ['ECG','Electrocardiogramme','Explorations',12000,70],
      ['H1','Hospitalisation jour','Hospitalisation',25000,80],
      ['ACC','Frais de dossier / accueil','Administratif',2000,0],
    ];
    for (const [code,lib,cat,tarif,taux] of actes) {
      await db(`INSERT INTO actes_medicaux (code,libelle,categorie,tarif_base,taux_assurance)
                SELECT $1::varchar,$2::varchar,$3::varchar,$4::decimal,$5::integer
                WHERE NOT EXISTS (SELECT 1 FROM actes_medicaux WHERE code=$1::varchar AND clinique_id IS NULL)`,
                [code,lib,cat,tarif,taux]);
    }

    // Affections CIM-10 les plus courantes en Afrique de l'Ouest
    const cim = [
      ['B54','Paludisme non precise','Maladies infectieuses'],
      ['B50','Paludisme a Plasmodium falciparum','Maladies infectieuses'],
      ['A09','Diarrhee et gastro-enterite infectieuse','Maladies infectieuses'],
      ['A01','Fievre typhoide','Maladies infectieuses'],
      ['J06','Infection respiratoire haute aigue','Appareil respiratoire'],
      ['J18','Pneumopathie','Appareil respiratoire'],
      ['J45','Asthme','Appareil respiratoire'],
      ['I10','Hypertension arterielle essentielle','Appareil circulatoire'],
      ['I50','Insuffisance cardiaque','Appareil circulatoire'],
      ['E11','Diabete de type 2','Endocrinien / metabolique'],
      ['E44','Malnutrition proteino-energetique','Endocrinien / metabolique'],
      ['D50','Anemie par carence en fer','Sang'],
      ['K29','Gastrite et duodenite','Appareil digestif'],
      ['K59','Constipation / trouble fonctionnel intestinal','Appareil digestif'],
      ['N39','Infection urinaire','Appareil genito-urinaire'],
      ['O26','Suivi de grossesse','Grossesse et accouchement'],
      ['M54','Lombalgie / dorsalgie','Osteo-articulaire'],
      ['M79','Douleurs musculaires diffuses','Osteo-articulaire'],
      ['G43','Migraine','Systeme nerveux'],
      ['H10','Conjonctivite','Oeil'],
      ['H66','Otite moyenne','Oreille'],
      ['L23','Dermatite allergique de contact','Peau'],
      ['R50','Fievre non precisee','Symptomes / signes'],
      ['R51','Cephalees','Symptomes / signes'],
      ['Z00','Examen medical general / bilan','Facteurs de recours'],
    ];
    for (const [code,lib,ch] of cim) {
      await db('INSERT INTO affections_cim10 (code,libelle,chapitre) VALUES ($1,$2,$3) ON CONFLICT (code) DO NOTHING',[code,lib,ch]);
    }
    res.json({ success:true, message:`Nomenclature initialisee : ${actes.length} actes, ${cim.length} affections CIM-10` });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ── Liste des actes (clinique + catalogue global) ─────────────────
// ══════════════════════════════════════════════════════════════════
//  CONTACTS D'URGENCE (dossier patient) -- accessibles au bureau des
//  entrees et au medecin, jusqu'a 10 par patient. Evenement reel ayant
//  motive cette fonctionnalite : patient decede en salle d'attente,
//  famille injoignable pendant plusieurs heures.
// ══════════════════════════════════════════════════════════════════
app.post('/api/patients/:id/contacts-urgence', auth, requireSousRole('bureau_entrees', 'medecin', 'finance', 'rh'), async (req, res) => {
  const { prenom, nom, telephone, telephone_2, relation, est_principal } = req.body;
  if (!prenom || !telephone) return res.status(400).json({ success:false, message:'Prénom et téléphone requis' });
  try {
    const compte = await db('SELECT COUNT(*) c FROM contacts_urgence WHERE patient_id=$1', [req.params.id]);
    if (parseInt(compte.rows[0].c) >= 10) {
      return res.status(400).json({ success:false, message:'Maximum 10 contacts d\'urgence par patient' });
    }
    const ordreR = await db('SELECT COALESCE(MAX(ordre),0)+1 AS n FROM contacts_urgence WHERE patient_id=$1', [req.params.id]);
    const r = await db(
      `INSERT INTO contacts_urgence (id,patient_id,ordre,prenom,nom,telephone,telephone_2,relation,est_principal)
       VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.params.id, ordreR.rows[0].n, prenom, nom||null, telephone, telephone_2||null, relation||null, !!est_principal]
    );
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

app.put('/api/contacts-urgence/:id', auth, requireSousRole('bureau_entrees', 'medecin', 'finance', 'rh'), async (req, res) => {
  const { prenom, nom, telephone, telephone_2, relation, est_principal } = req.body;
  try {
    const r = await db(
      `UPDATE contacts_urgence SET prenom=COALESCE($1,prenom), nom=COALESCE($2,nom),
         telephone=COALESCE($3,telephone), telephone_2=COALESCE($4,telephone_2),
         relation=COALESCE($5,relation), est_principal=COALESCE($6,est_principal)
       WHERE id=$7 AND patient_id IS NOT NULL RETURNING *`,
      [prenom||null, nom||null, telephone||null, telephone_2||null, relation||null, est_principal===undefined?null:est_principal, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ success:false, message:'Contact introuvable' });
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

app.delete('/api/contacts-urgence/:id', auth, requireSousRole('bureau_entrees', 'medecin', 'finance', 'rh'), async (req, res) => {
  try {
    const r = await db('DELETE FROM contacts_urgence WHERE id=$1 AND patient_id IS NOT NULL RETURNING *', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ success:false, message:'Contact introuvable' });
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ── Categories d'actes -- liste fermee (menu deroulant), plus
// souple qu'une simple enumeration cote code : une clinique peut en
// ajouter une nouvelle si vraiment besoin ("et bien d'autres").
app.get('/api/categories-actes', auth, async (req, res) => {
  try {
    const r = await db("SELECT * FROM categories_actes WHERE is_active IS NOT false ORDER BY ordre, nom");
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});
app.post('/api/categories-actes', auth, async (req, res) => {
  const { nom } = req.body;
  if (!nom) return res.status(400).json({ success:false, message:'nom requis' });
  try {
    const r = await db(
      "INSERT INTO categories_actes (id,nom,ordre) VALUES (gen_random_uuid(),$1,(SELECT COALESCE(MAX(ordre),0)+1 FROM categories_actes)) RETURNING *",
      [nom]
    );
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) {
    if (e.code === '23505') return res.status(409).json({ success:false, message:'Cette catégorie existe déjà' });
    res.status(500).json({ success:false, message:e.message });
  }
});

app.get('/api/actes', auth, async (req, res) => {
  try {
    const cid = req.user?.clinique_id;
    // Si la clinique a personnalise un acte (meme code), sa version
    // remplace celle du catalogue global dans l'affichage -- jamais les
    // deux en double. DISTINCT ON (code) + tri secondaire qui prefere
    // la version de la clinique quand les deux existent.
    const r = await db(
      `WITH dedup AS (
         SELECT DISTINCT ON (a.code) a.*, c.nom AS categorie_nom, COALESCE(c.ordre,999) AS cat_ordre
           FROM actes_medicaux a
           LEFT JOIN categories_actes c ON c.id = a.categorie_id
          WHERE a.actif IS NOT false AND (a.clinique_id IS NULL OR a.clinique_id=$1)
          ORDER BY a.code, (a.clinique_id = $1) DESC NULLS LAST
       )
       SELECT * FROM dedup ORDER BY cat_ordre, code`, [cid||null]
    );
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});

// ── Personnaliser un tarif pour sa clinique ──────────────────────
app.post('/api/actes', auth, async (req, res) => {
  const { code, libelle, categorie_id, tarif_base, taux_assurance } = req.body;
  if (!code || !libelle) return res.status(400).json({ success:false, message:'code et libelle requis' });
  try {
    const r = await db(
      `INSERT INTO actes_medicaux (clinique_id,code,libelle,categorie_id,tarif_base,taux_assurance)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.user?.clinique_id||null, code, libelle, categorie_id||null, tarif_base||0, taux_assurance??70]
    );
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ── Modifier / desactiver un acte -- JAMAIS les actes globaux
// (clinique_id IS NULL) ni ceux d'une autre clinique : WHERE porte
// systematiquement sur clinique_id=$X, pas seulement sur id.
app.put('/api/actes/:id', auth, async (req, res) => {
  const { libelle, categorie_id, tarif_base, taux_assurance, actif, prix_subventionne } = req.body;
  const cid = req.user?.clinique_id;
  if (!cid) return res.status(400).json({ success:false, message:'Compte non rattaché à une clinique' });
  try {
    const r = await db(
      `UPDATE actes_medicaux SET
         libelle=COALESCE($1,libelle),
         categorie_id=CASE WHEN $2::text IS NULL THEN categorie_id ELSE $2::uuid END,
         tarif_base=COALESCE($3,tarif_base), taux_assurance=COALESCE($4,taux_assurance),
         actif=COALESCE($5,actif), prix_subventionne=COALESCE($6,prix_subventionne)
       WHERE id=$7 AND clinique_id=$8 RETURNING *`,
      [libelle||null, categorie_id===undefined?null:categorie_id, tarif_base??null, taux_assurance??null, actif===undefined?null:actif, prix_subventionne??null, req.params.id, cid]
    );
    if (!r.rows.length) return res.status(404).json({ success:false, message:'Acte introuvable dans votre catalogue (les actes globaux ne sont pas modifiables)' });
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ══════════════════════════════════════════════════════════════════
//  TARIFS NEGOCIES PAR CONVENTION (clinique + assureur) -- 3e niveau
//  de tarification par acte, au-dela de tarif_base (non assure) et
//  prix_subventionne. Repli sur le taux de la convention si absent.
// ══════════════════════════════════════════════════════════════════
app.get('/api/conventions/:id/tarifs-actes', auth, requireSousRole('finance', 'bureau_entrees'), async (req, res) => {
  const cid = req.user?.clinique_id;
  try {
    // Verifie que la convention appartient bien a la clinique connectee.
    const conv = await db('SELECT id FROM conventions WHERE id=$1 AND clinique_id=$2', [req.params.id, cid]);
    if (!conv.rows.length) return res.status(404).json({ success:false, message:'Convention introuvable dans votre clinique' });
    const r = await db(
      `SELECT t.*, a.code, a.libelle, a.tarif_base, a.prix_subventionne
         FROM actes_tarifs_convention t
         JOIN actes_medicaux a ON a.id = t.acte_id
        WHERE t.convention_id=$1
        ORDER BY a.libelle`,
      [req.params.id]
    );
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});

app.put('/api/conventions/:id/tarifs-actes/:acteId', auth, requireSousRole('finance'), async (req, res) => {
  const { tarif_negocie } = req.body;
  const cid = req.user?.clinique_id;
  if (tarif_negocie===undefined || tarif_negocie===null) return res.status(400).json({ success:false, message:'tarif_negocie requis' });
  try {
    const conv = await db('SELECT id FROM conventions WHERE id=$1 AND clinique_id=$2', [req.params.id, cid]);
    if (!conv.rows.length) return res.status(404).json({ success:false, message:'Convention introuvable dans votre clinique' });
    const r = await db(
      `INSERT INTO actes_tarifs_convention (convention_id, acte_id, tarif_negocie)
       VALUES ($1,$2,$3)
       ON CONFLICT (convention_id, acte_id)
       DO UPDATE SET tarif_negocie=$3, updated_at=NOW()
       RETURNING *`,
      [req.params.id, req.params.acteId, tarif_negocie]
    );
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

app.delete('/api/conventions/:id/tarifs-actes/:acteId', auth, requireSousRole('finance'), async (req, res) => {
  const cid = req.user?.clinique_id;
  try {
    const conv = await db('SELECT id FROM conventions WHERE id=$1 AND clinique_id=$2', [req.params.id, cid]);
    if (!conv.rows.length) return res.status(404).json({ success:false, message:'Convention introuvable dans votre clinique' });
    await db('DELETE FROM actes_tarifs_convention WHERE convention_id=$1 AND acte_id=$2', [req.params.id, req.params.acteId]);
    res.json({ success:true, message:'Tarif négocié retiré (repli sur le taux général de la convention)' });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.delete('/api/actes/:id', auth, async (req, res) => {
  const cid = req.user?.clinique_id;
  try {
    // Desactivation douce : un acte deja utilise dans des factures
    // passees ne doit jamais disparaitre de l'historique.
    const r = await db(
      "UPDATE actes_medicaux SET actif=false WHERE id=$1 AND clinique_id=$2 RETURNING *",
      [req.params.id, cid]
    );
    if (!r.rows.length) return res.status(404).json({ success:false, message:'Acte introuvable dans votre catalogue' });
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ── Affecter / reaffecter le medecin d'un passage en cours ────────
app.put('/api/passages/:id/medecin', auth, requireSousRole('bureau_entrees', 'medecin', 'finance'), async (req, res) => {
  const { medecin_id } = req.body;
  try {
    const r = await db(
      "UPDATE passages_patient SET medecin_id=$1, updated_at=NOW() WHERE id=$2 AND statut IN ('ouvert','ferme_temporaire') RETURNING *",
      [medecin_id||null, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ success:false, message:'Passage introuvable ou déjà validé' });
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ── Affections CIM-10 (recherche) ────────────────────────────────
app.get('/api/affections', async (req, res) => {
  try {
    const { q } = req.query;
    const r = q
      ? await db(`SELECT * FROM affections_cim10
                  WHERE LOWER(libelle) LIKE $1 OR LOWER(code) LIKE $1
                  ORDER BY code LIMIT 50`, ['%'+q.toLowerCase()+'%'])
      : await db('SELECT * FROM affections_cim10 ORDER BY chapitre, code LIMIT 300');
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});

// ── Enregistrer les actes d'une prise en charge ───────────────────
app.post('/api/prise-en-charge', auth, requireSousRole('medecin', 'finance'), async (req, res) => {
  const { patient_id, actes, consultation_id, rdv_id, est_assure, taux_couverture } = req.body;
  if (!patient_id || !Array.isArray(actes) || !actes.length)
    return res.status(400).json({ success:false, message:'patient_id et actes requis' });
  try {
    const lignes = [];
    for (const a of actes) {
      const qte = parseInt(a.quantite||1);
      const pu = parseFloat(a.prix_unitaire||0);
      const total = qte * pu;
      const taux = est_assure ? parseInt(taux_couverture ?? a.taux_assurance ?? 70) : 0;
      const partAss = Math.round(total * taux / 100);
      const partPat = total - partAss;
      const r = await db(
        `INSERT INTO prise_en_charge_actes
         (patient_id,clinique_id,consultation_id,rdv_id,acte_id,code_acte,libelle_acte,
          quantite,prix_unitaire,taux_assurance,part_assurance,part_patient)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
        [patient_id, req.user?.clinique_id||null, consultation_id||null, rdv_id||null,
         a.acte_id||null, a.code||null, a.libelle||null, qte, pu, taux, partAss, partPat]
      );
      lignes.push(r.rows[0]);
    }
    const totaux = lignes.reduce((acc,l)=>({
      total: acc.total + parseFloat(l.prix_unitaire)*l.quantite,
      part_assurance: acc.part_assurance + parseFloat(l.part_assurance),
      part_patient: acc.part_patient + parseFloat(l.part_patient),
    }), {total:0, part_assurance:0, part_patient:0});
    let facture = null;
    let facture_avertissement = null;
    if (consultation_id) {
      try {
        const { pool: dbPool } = require('./config/db');
        const { withTransaction } = require('./helpers/dbIntrospect');
        const { genererFactureConsultation } = require('./services/factureAuto');
        const out = await withTransaction(dbPool, (c) =>
          genererFactureConsultation(c, {
            consultationId: consultation_id,
            cliniqueId: req.user?.clinique_id,
            utilisateurId: req.user?.id,
          })
        );
        facture = out.facture;
        if (out.deja_existante) {
          facture_avertissement = 'Facture deja emise : les nouveaux actes restent a facturer';
        }
      } catch (e) {
        console.error('[facture-auto hook]', e.code || '', e.message);
        facture_avertissement = e.message;
      }
    } else {
      facture_avertissement = 'Aucun consultation_id transmis : facture non generee';
    }
    res.status(201).json({ success:true, data:lignes, totaux, facture, facture_avertissement });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ── Actes d'un patient (pour facturation) ────────────────────────
// ── Detail ligne par ligne d'UNE facture precise (pas tout l'historique
// du patient) -- passe par passage_id, commun aux deux tables. Ouverte
// au bureau des entrees pour l'impression depuis le menu lateral.
app.get('/api/factures/:id/detail', auth, requireSousRole('medecin', 'finance', 'bureau_entrees'), async (req, res) => {
  try {
    const facR = await db('SELECT * FROM factures WHERE id=$1', [req.params.id]);
    if (!facR.rows.length) return res.status(404).json({ success:false, message:'Facture introuvable' });
    const facture = facR.rows[0];

    let lignes = [];
    if (facture.passage_id) {
      // Jointure jusqu'a categories_actes pour regrouper les lignes par
      // type d'acte a l'impression (Consultation, Examens, Imagerie...).
      const r = await db(
        `SELECT p.*, c.nom AS categorie_nom, COALESCE(c.ordre,999) AS categorie_ordre
           FROM prise_en_charge_actes p
           LEFT JOIN actes_medicaux a ON a.id = p.acte_id
           LEFT JOIN categories_actes c ON c.id = a.categorie_id
          WHERE p.passage_id=$1
          ORDER BY categorie_ordre, p.created_at`,
        [facture.passage_id]
      );
      lignes = r.rows;
    }
    res.json({ success:true, data: { facture, lignes } });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

app.get('/api/prise-en-charge/:patient_id', auth, requireSousRole('medecin', 'finance'), async (req, res) => {
  try {
    const r = await db(
      `SELECT * FROM prise_en_charge_actes WHERE patient_id=$1
       ORDER BY created_at DESC LIMIT 200`, [req.params.patient_id]
    );
    const totaux = r.rows.reduce((acc,l)=>({
      total: acc.total + parseFloat(l.prix_unitaire)*l.quantite,
      part_assurance: acc.part_assurance + parseFloat(l.part_assurance||0),
      part_patient: acc.part_patient + parseFloat(l.part_patient||0),
    }), {total:0, part_assurance:0, part_patient:0});
    res.json({ success:true, data:r.rows, totaux });
  } catch(e) { res.json({ success:true, data:[], totaux:{total:0,part_assurance:0,part_patient:0} }); }
});

// ══════════════════════════════════════════════════════════════════
//  CARTE PATIENT / PASSAGE MULTI-SERVICES
// ══════════════════════════════════════════════════════════════════
// Ouverte au bureau des entrees, accumule des actes au fil du parcours
// du patient dans plusieurs services, peut etre mise en pause et
// reprise, puis validee definitivement (facture generee automatiquement).

// Trouve le passage ouvert OU en pause du patient dans cette clinique,
// s'il existe -- pour savoir s'il faut en creer un nouveau ou reprendre
// celui deja en cours.
app.get('/api/passages/patient/:patient_id/actif', auth, async (req, res) => {
  const cid = req.user?.clinique_id;
  try {
    const r = await db(
      `SELECT * FROM passages_patient
        WHERE patient_id=$1 AND clinique_id=$2 AND statut IN ('ouvert','ferme_temporaire')
        ORDER BY created_at DESC LIMIT 1`,
      [req.params.patient_id, cid]
    );
    res.json({ success:true, data:r.rows[0]||null });
  } catch(e) { res.json({ success:true, data:null }); }
});

// Recherche d'un passage (numero d'entree, ex. PSG-XXXXX) pour le
// rapport medical hospitalisation -- rassemble en un seul appel le
// patient, son assurance/police/taux de couverture, les dates
// d'entree/sortie, et la derniere consultation liee (motif, examen
// clinique, traitement) pour prerempiler le formulaire.
app.get('/api/passages/reference/:reference', auth, async (req, res) => {
  const cid = req.user?.clinique_id;
  try {
    const p = await db(
      `SELECT pp.*, pt.prenom, pt.nom, pt.assurance, pt.numero_police,
              fa.taux_couverture, fa.nom AS formule_nom
         FROM passages_patient pp
         JOIN patients pt ON pt.id = pp.patient_id
         LEFT JOIN formules_assurance fa ON fa.id = pt.formule_assurance_id
        WHERE pp.reference ILIKE $1 AND pp.clinique_id=$2
        LIMIT 1`,
      [req.params.reference, cid]
    );
    if (!p.rows.length) return res.json({ success:true, data:null });
    const passage = p.rows[0];
    const c = await db(
      `SELECT motif, examen_clinique, diagnostic, traitement, medecin_id, medecin_nom
         FROM consultations WHERE passage_id=$1 ORDER BY created_at DESC LIMIT 1`,
      [passage.id]
    );
    res.json({ success:true, data:{ ...passage, consultation: c.rows[0]||null } });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

app.post('/api/passages', auth, requireSousRole('bureau_entrees', 'medecin', 'finance'), async (req, res) => {
  const { patient_id, medecin_id } = req.body;
  const cid = req.user?.clinique_id;
  if (!patient_id) return res.status(400).json({ success:false, message:'patient_id requis' });
  try {
    const ref = 'PSG-'+Date.now().toString(36).toUpperCase();
    const r = await db(
      `INSERT INTO passages_patient (id,reference,patient_id,clinique_id,medecin_id,statut)
       VALUES (gen_random_uuid(),$1,$2,$3,$4,'ouvert') RETURNING *`,
      [ref, patient_id, cid, medecin_id||null]
    );
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) {
    // Un seul passage ouvert par patient/clinique -- l'index unique
    // rejette une deuxieme ouverture, message clair plutot qu'une 500 brute.
    if (e.code === '23505') return res.status(409).json({ success:false, message:'Une carte est déjà ouverte pour ce patient' });
    res.status(500).json({ success:false, message:e.message });
  }
});

app.get('/api/passages/:id', auth, async (req, res) => {
  try {
    const p = await db('SELECT * FROM passages_patient WHERE id=$1', [req.params.id]);
    if (!p.rows.length) return res.status(404).json({ success:false, message:'Passage introuvable' });
    const actes = await db(
      `SELECT * FROM prise_en_charge_actes WHERE passage_id=$1 ORDER BY created_at ASC`,
      [req.params.id]
    );
    const total = actes.rows.reduce((s,a)=>s+parseFloat(a.prix_unitaire)*a.quantite, 0);
    res.json({ success:true, data:{ ...p.rows[0], actes:actes.rows, total } });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// Ajoute un acte (choisi dans le catalogue actes_medicaux) au passage
// ouvert -- reprend le tarif et le taux d'assurance du catalogue, sauf
// surcharge explicite.
app.post('/api/passages/:id/actes', auth, requireSousRole('bureau_entrees', 'medecin', 'finance'), async (req, res) => {
  const { acte_id, quantite, est_assure, prix_unitaire: prixSurcharge, libelle_override } = req.body;
  if (!acte_id) return res.status(400).json({ success:false, message:'acte_id requis' });
  try {
    const passage = await db("SELECT * FROM passages_patient WHERE id=$1 AND statut IN ('ouvert','ferme_temporaire')", [req.params.id]);
    if (!passage.rows.length) return res.status(404).json({ success:false, message:'Passage introuvable ou déjà validé' });
    const acte = await db('SELECT * FROM actes_medicaux WHERE id=$1', [acte_id]);
    if (!acte.rows.length) return res.status(404).json({ success:false, message:'Acte introuvable dans le catalogue' });
    const a = acte.rows[0];
    const qte = parseInt(quantite||1);

    // Tarif negocie par convention (clinique + assureur du patient) --
    // remplace le tarif de base si une ligne existe pour cet acte dans
    // la convention active. Le taux de couverture reste celui de la
    // formule personnelle du patient, independant du tarif negocie.
    let puEffectif = parseFloat(a.tarif_base||0);
    if (est_assure) {
      const patientAssurance = await db('SELECT assureur_id FROM patients WHERE id=$1', [passage.rows[0].patient_id]);
      const assureurId = patientAssurance.rows[0]?.assureur_id;
      if (assureurId) {
        const conv = await db(
          `SELECT id FROM conventions WHERE clinique_id=$1 AND assureur_id=$2 AND is_active IS NOT false
             AND (date_fin IS NULL OR date_fin >= CURRENT_DATE) ORDER BY date_debut DESC LIMIT 1`,
          [passage.rows[0].clinique_id, assureurId]
        );
        if (conv.rows.length) {
          const tn = await db('SELECT tarif_negocie FROM actes_tarifs_convention WHERE convention_id=$1 AND acte_id=$2', [conv.rows[0].id, acte_id]);
          if (tn.rows.length) puEffectif = parseFloat(tn.rows[0].tarif_negocie);
        }
      }
    }
    const pu = prixSurcharge != null ? parseFloat(prixSurcharge) : puEffectif;
    const total = qte * pu;

    // Taux reellement negocie avec l'assureur du patient (table
    // conventions), pas le taux par defaut de l'acte -- deux compagnies
    // different generalement l'une de l'autre. Repli sur le taux de
    // l'acte si aucune convention active n'existe pour cet assureur.
    // Le taux reel vient de la formule PERSONNELLE du patient (prime
    // payee chez son assureur) -- pas d'un accord par clinique. Repli
    // sur le taux par defaut de l'acte si le patient n'a aucune formule
    // renseignee (assure sans formule precise encore saisie).
    let taux = 0;
    if (est_assure) {
      const patientRow = await db('SELECT formule_assurance_id FROM patients WHERE id=$1', [passage.rows[0].patient_id]);
      const formuleId = patientRow.rows[0]?.formule_assurance_id;
      let formule = null;
      if (formuleId) {
        const f = await db('SELECT taux_couverture FROM formules_assurance WHERE id=$1 AND is_active IS NOT false', [formuleId]);
        formule = f.rows[0] || null;
      }
      taux = formule ? formule.taux_couverture : parseInt(a.taux_assurance ?? 70);
    }
    const partAss = Math.round(total * taux / 100);
    const partPat = total - partAss;
    const r = await db(
      `INSERT INTO prise_en_charge_actes
       (patient_id,clinique_id,passage_id,acte_id,code_acte,libelle_acte,
        quantite,prix_unitaire,taux_assurance,part_assurance,part_patient,statut)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'a_facturer') RETURNING *`,
      [passage.rows[0].patient_id, passage.rows[0].clinique_id, req.params.id,
       acte_id, a.code, libelle_override||a.libelle, qte, pu, taux, partAss, partPat]
    );
    // Ajouter un acte reactive automatiquement une carte en pause.
    await db("UPDATE passages_patient SET statut='ouvert', updated_at=NOW() WHERE id=$1 AND statut='ferme_temporaire'", [req.params.id]);
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// Vente d'un medicament du stock, facturee dans le meme passage --
// ex: chirurgie ou soins infirmiers consommant des medicaments. Verifie
// la disponibilite et decremente le stock dans la MEME transaction que
// la creation de la ligne facturable, pour eviter toute survente en cas
// d'acces simultane par deux membres du personnel.
app.post('/api/passages/:id/medicament', auth, requireSousRole('bureau_entrees', 'medecin', 'finance'), async (req, res) => {
  const { stock_id, quantite, est_assure } = req.body;
  if (!stock_id) return res.status(400).json({ success:false, message:'stock_id requis' });
  try {
    const { pool: dbPool } = require('./config/db');
    const { withTransaction } = require('./helpers/dbIntrospect');
    const out = await withTransaction(dbPool, async (client) => {
      const passageR = await client.query("SELECT * FROM passages_patient WHERE id=$1 AND statut IN ('ouvert','ferme_temporaire')", [req.params.id]);
      if (!passageR.rows.length) throw new Error('Passage introuvable ou déjà validé');
      const passage = passageR.rows[0];

      // Verrou pendant la transaction : deux ventes simultanees sur le
      // meme produit ne peuvent pas toutes les deux passer si le stock
      // devient insuffisant entre-temps.
      const stockR = await client.query('SELECT * FROM stock WHERE id=$1 AND clinique_id=$2 FOR UPDATE', [stock_id, passage.clinique_id]);
      if (!stockR.rows.length) throw new Error('Produit introuvable dans le stock de votre clinique');
      const produit = stockR.rows[0];
      const qte = parseInt(quantite || 1);
      if (produit.quantite < qte) throw new Error(`Stock insuffisant : ${produit.quantite} ${produit.unite} disponible(s)`);

      await client.query('UPDATE stock SET quantite = quantite - $1, updated_at = NOW() WHERE id=$2', [qte, stock_id]);

      const pu = parseFloat(produit.prix_unitaire || 0);
      const total = qte * pu;
      let taux = 0;
      if (est_assure) {
        const patientR = await client.query('SELECT formule_assurance_id FROM patients WHERE id=$1', [passage.patient_id]);
        const formuleId = patientR.rows[0]?.formule_assurance_id;
        if (formuleId) {
          const f = await client.query('SELECT taux_couverture FROM formules_assurance WHERE id=$1 AND is_active IS NOT false', [formuleId]);
          taux = f.rows[0]?.taux_couverture ?? 0;
        }
      }
      const partAss = Math.round(total * taux / 100);
      const partPat = total - partAss;

      const r = await client.query(
        `INSERT INTO prise_en_charge_actes
         (patient_id,clinique_id,passage_id,stock_id,code_acte,libelle_acte,
          quantite,prix_unitaire,taux_assurance,part_assurance,part_patient,statut)
         VALUES ($1,$2,$3,$4,'MED',$5,$6,$7,$8,$9,$10,'a_facturer') RETURNING *`,
        [passage.patient_id, passage.clinique_id, req.params.id, stock_id, produit.nom, qte, pu, taux, partAss, partPat]
      );
      await client.query("UPDATE passages_patient SET statut='ouvert', updated_at=NOW() WHERE id=$1 AND statut='ferme_temporaire'", [req.params.id]);
      return r.rows[0];
    });
    res.status(201).json({ success:true, data:out });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

app.put('/api/passages/:id/pause', auth, requireSousRole('bureau_entrees', 'medecin', 'finance'), async (req, res) => {
  try {
    const r = await db("UPDATE passages_patient SET statut='ferme_temporaire', updated_at=NOW() WHERE id=$1 AND statut='ouvert' RETURNING *", [req.params.id]);
    if (!r.rows.length) return res.status(400).json({ success:false, message:'Passage introuvable ou déjà validé/en pause' });
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

app.put('/api/passages/:id/reprendre', auth, requireSousRole('bureau_entrees', 'medecin', 'finance'), async (req, res) => {
  try {
    const r = await db("UPDATE passages_patient SET statut='ouvert', updated_at=NOW() WHERE id=$1 AND statut='ferme_temporaire' RETURNING *", [req.params.id]);
    if (!r.rows.length) return res.status(400).json({ success:false, message:'Passage introuvable ou pas en pause' });
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// Validation definitive : cloture le passage et genere la facture
// correspondant a tous les actes accumules, en une seule transaction.
app.post('/api/passages/:id/valider', auth, requireSousRole('bureau_entrees', 'medecin', 'finance'), async (req, res) => {
  try {
    const { pool: dbPool } = require('./config/db');
    const { withTransaction } = require('./helpers/dbIntrospect');
    const { genererFacturePassage } = require('./services/factureAuto');
    const out = await withTransaction(dbPool, async (client) => {
      const p = await client.query("UPDATE passages_patient SET statut='valide', closed_at=NOW(), updated_at=NOW() WHERE id=$1 AND statut IN ('ouvert','ferme_temporaire') RETURNING *", [req.params.id]);
      if (!p.rows.length) throw new Error('Passage introuvable ou déjà validé');
      return genererFacturePassage(client, { passageId: req.params.id, utilisateurId: req.user?.id });
    });
    res.json({ success:true, data:out.facture, deja_existante:out.deja_existante||false, totaux:out.totaux });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});


// ── Backfill + generation code dossier patient ────────────────────
app.post('/api/admin/backfill-codes-patients', async (req, res) => {
  if (req.headers['x-admin-key'] !== 'mediconnect_dev_secret_2024')
    return res.status(403).json({ success:false });
  try {
    const manquants = await db("SELECT id,prenom,nom FROM patients WHERE code_secret IS NULL OR code_secret=''");
    let n = 0;
    for (const p of manquants.rows) {
      const ini = ((p.prenom||'X')[0] + (p.nom||'X')[0]).toUpperCase();
      const code = 'MC-' + ini + '-' + Math.floor(1000 + Math.random()*9000);
      await db('UPDATE patients SET code_secret=$1 WHERE id=$2', [code, p.id]);
      n++;
    }
    res.json({ success:true, message:`${n} code(s) dossier generes` });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ── ERREURS (TOUJOURS EN DERNIER) ────────────────────────────────

const { pool: dbPool } = require('./config/db');
const facturesAuto = require('./routes/factures-auto');
app.use('/api', facturesAuto(dbPool, auth));

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
