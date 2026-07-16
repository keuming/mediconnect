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
app.use("/api/patients", require("./routes/patients_mobile"));
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
    const { clinique_id, medecin_id, role } = payload;

    let where = 'WHERE fa.date_scan=CURRENT_DATE';
    const params = [];
    let idx = 1;

    if (clinique_id) { where += ` AND fa.clinique_id=$${idx++}`; params.push(clinique_id); }
    if (medecin_id && role === 'medecin') { where += ` AND fa.medecin_id=$${idx++}`; params.push(medecin_id); }

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
app.get('/api/patients/:patient_id/contacts-urgence', async (req, res) => {
  const auth = req.headers['authorization']?.replace('Bearer ','');
  if (!auth) return res.status(401).json({ success: false, message: 'Token requis' });
  try {
    const jwt = require('jsonwebtoken');
    const payload = jwt.verify(auth, process.env.JWT_SECRET || 'mediconnect_dev_secret_2024');
    if (!['medecin','medecin_independant','clinique','admin'].includes(payload.role))
      return res.status(403).json({ success: false, message: 'Accès non autorisé' });

    const r = await db(
      `SELECT p.prenom, p.nom, p.telephone,
        p.contact_urgence_1, p.telephone_urgence_1,
        p.contact_urgence_2, p.telephone_urgence_2,
        p.contact_urgence_3, p.telephone_urgence_3,
        p.contact_urgence_4, p.telephone_urgence_4,
        p.contact_urgence_5, p.telephone_urgence_5,
        p.groupe_sanguin, p.allergies
       FROM patients p WHERE p.id=$1 OR p.user_id=$1 LIMIT 1`,
      [req.params.patient_id]
    );

    if (!r.rows[0]) return res.status(404).json({ success: false, message: 'Patient non trouvé' });
    res.json({ success: true, data: r.rows[0] });
  } catch(e) {
    res.status(500).json({ success: false, message: e.message });
  }
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
app.post('/api/caisse/mouvement', auth, async (req, res) => {
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
app.get('/api/caisse/journal', auth, async (req, res) => {
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
