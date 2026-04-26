require('dotenv').config();
const { pool } = require('../config/db');

const migrate = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('🔄 Migration en cours...');

    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      -- ════════════════════════════════════════
      --  UTILISATEURS
      -- ════════════════════════════════════════
      CREATE TABLE IF NOT EXISTS utilisateurs (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email       VARCHAR(255) UNIQUE NOT NULL,
        password    VARCHAR(255) NOT NULL,
        role        VARCHAR(20) NOT NULL CHECK (role IN ('patient','clinique','pharmacie','livreur','admin','assureur')),
        prenom      VARCHAR(100) NOT NULL,
        nom         VARCHAR(100) NOT NULL,
        telephone   VARCHAR(20),
        pays_code   VARCHAR(5) DEFAULT 'CI',
        ville       VARCHAR(100),
        quartier    VARCHAR(100),
        adresse     TEXT,
        avatar_url  TEXT,
        is_active   BOOLEAN DEFAULT true,
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW()
      );

      -- ════════════════════════════════════════
      --  CLINIQUES
      -- ════════════════════════════════════════
      CREATE TABLE IF NOT EXISTS cliniques (
        id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id           UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
        nom               VARCHAR(200) NOT NULL,
        type              VARCHAR(50) DEFAULT 'Clinique',
        numero_agrement   VARCHAR(50),
        assurances        TEXT[],
        latitude          DECIMAL(10,8),
        longitude         DECIMAL(11,8),
        logo_url          TEXT,
        is_verified       BOOLEAN DEFAULT false,
        created_at        TIMESTAMPTZ DEFAULT NOW()
      );

      -- ════════════════════════════════════════
      --  PHARMACIES
      -- ════════════════════════════════════════
      CREATE TABLE IF NOT EXISTS pharmacies (
        id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id             UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
        nom                 VARCHAR(200) NOT NULL,
        numero_autorisation VARCHAR(50),
        zone_livraison_km   INTEGER DEFAULT 10,
        latitude            DECIMAL(10,8),
        longitude           DECIMAL(11,8),
        is_verified         BOOLEAN DEFAULT false,
        created_at          TIMESTAMPTZ DEFAULT NOW()
      );

      -- ════════════════════════════════════════
      --  LIVREURS
      -- ════════════════════════════════════════
      CREATE TABLE IF NOT EXISTS livreurs (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id         UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
        type_vehicule   VARCHAR(30) DEFAULT 'Moto',
        numero_permis   VARCHAR(50),
        zones           TEXT[],
        statut          VARCHAR(20) DEFAULT 'disponible',
        latitude        DECIMAL(10,8),
        longitude       DECIMAL(11,8),
        note_moyenne    DECIMAL(3,2) DEFAULT 0,
        created_at      TIMESTAMPTZ DEFAULT NOW()
      );

      -- ════════════════════════════════════════
      --  ASSUREURS
      -- ════════════════════════════════════════
      CREATE TABLE IF NOT EXISTS assureurs (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id         UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
        nom             VARCHAR(200) NOT NULL,
        type_connexion  VARCHAR(20) DEFAULT 'manuel',
        api_url         TEXT,
        api_key_hash    TEXT,
        numero_agrement VARCHAR(50),
        taux_defaut     INTEGER DEFAULT 80,
        created_at      TIMESTAMPTZ DEFAULT NOW()
      );

      -- ════════════════════════════════════════
      --  PATIENTS (profils)
      -- ════════════════════════════════════════
      CREATE TABLE IF NOT EXISTS patients (
        id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id       UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
        date_naissance DATE,
        sexe          VARCHAR(1) CHECK (sexe IN ('M','F')),
        groupe_sanguin VARCHAR(5),
        poids         DECIMAL(5,2),
        taille        INTEGER,
        allergies     TEXT[],
        antecedents   TEXT,
        code_secret   VARCHAR(20) UNIQUE NOT NULL,
        created_at    TIMESTAMPTZ DEFAULT NOW()
      );

      -- ════════════════════════════════════════
      --  MÉDECINS
      -- ════════════════════════════════════════
      CREATE TABLE IF NOT EXISTS medecins (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        clinique_id     UUID NOT NULL REFERENCES cliniques(id) ON DELETE CASCADE,
        prenom          VARCHAR(100) NOT NULL,
        nom             VARCHAR(100) NOT NULL,
        specialite      VARCHAR(100) NOT NULL,
        numero_ordre    VARCHAR(50),
        experience_ans  INTEGER DEFAULT 0,
        tarif           INTEGER DEFAULT 15000,
        horaires_debut  TIME DEFAULT '08:00',
        horaires_fin    TIME DEFAULT '17:00',
        jours_travail   TEXT[],
        note_moyenne    DECIMAL(3,2) DEFAULT 0,
        statut          VARCHAR(30) DEFAULT 'Disponible',
        created_at      TIMESTAMPTZ DEFAULT NOW()
      );

      -- ════════════════════════════════════════
      --  RENDEZ-VOUS
      -- ════════════════════════════════════════
      CREATE TABLE IF NOT EXISTS rendez_vous (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        clinique_id     UUID NOT NULL REFERENCES cliniques(id),
        medecin_id      UUID REFERENCES medecins(id),
        date_rdv        DATE NOT NULL,
        heure_rdv       TIME NOT NULL,
        motif           TEXT,
        assurance       VARCHAR(100),
        numero_police   VARCHAR(50),
        statut          VARCHAR(30) DEFAULT 'en_attente'
                        CHECK (statut IN ('en_attente','confirme','en_cours','termine','annule')),
        notes           TEXT,
        created_at      TIMESTAMPTZ DEFAULT NOW()
      );

      -- ════════════════════════════════════════
      --  CONSULTATIONS
      -- ════════════════════════════════════════
      CREATE TABLE IF NOT EXISTS consultations (
        id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        patient_id        UUID NOT NULL REFERENCES patients(id),
        clinique_id       UUID NOT NULL REFERENCES cliniques(id),
        medecin_id        UUID REFERENCES medecins(id),
        rdv_id            UUID REFERENCES rendez_vous(id),
        date_consult      DATE NOT NULL DEFAULT CURRENT_DATE,
        motif             TEXT NOT NULL,
        ta                VARCHAR(30),
        fc                VARCHAR(30),
        spo2              VARCHAR(20),
        temperature       VARCHAR(20),
        poids             DECIMAL(5,2),
        taille            INTEGER,
        examen_clinique   TEXT,
        diagnostic        TEXT NOT NULL,
        code_cim10        VARCHAR(20),
        note_finale       TEXT,
        statut            VARCHAR(20) DEFAULT 'brouillon'
                          CHECK (statut IN ('brouillon','finalisee')),
        created_at        TIMESTAMPTZ DEFAULT NOW()
      );

      -- ════════════════════════════════════════
      --  PRESCRIPTIONS
      -- ════════════════════════════════════════
      CREATE TABLE IF NOT EXISTS prescriptions (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
        type            VARCHAR(20) NOT NULL CHECK (type IN ('bio','radio','fonc','autre')),
        label           TEXT NOT NULL,
        urgent          BOOLEAN DEFAULT false,
        note            TEXT,
        created_at      TIMESTAMPTZ DEFAULT NOW()
      );

      -- ════════════════════════════════════════
      --  ORDONNANCES
      -- ════════════════════════════════════════
      CREATE TABLE IF NOT EXISTS ordonnances (
        id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        consultation_id   UUID REFERENCES consultations(id) ON DELETE CASCADE,
        patient_id        UUID NOT NULL REFERENCES patients(id),
        medecin_id        UUID REFERENCES medecins(id),
        medicament        VARCHAR(200) NOT NULL,
        posologie         TEXT NOT NULL,
        duree             VARCHAR(50) DEFAULT '30 jours',
        renouvellements   INTEGER DEFAULT 0,
        statut            VARCHAR(20) DEFAULT 'active'
                          CHECK (statut IN ('active','delivree','expiree')),
        created_at        TIMESTAMPTZ DEFAULT NOW()
      );

      -- ════════════════════════════════════════
      --  ASSURANCES PATIENTS
      -- ════════════════════════════════════════
      CREATE TABLE IF NOT EXISTS assurances_patients (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        assureur_id     UUID REFERENCES assureurs(id),
        compagnie       VARCHAR(200) NOT NULL,
        numero_police   VARCHAR(100) NOT NULL,
        taux_couverture INTEGER DEFAULT 80,
        date_debut      DATE,
        date_fin        DATE,
        is_active       BOOLEAN DEFAULT true,
        created_at      TIMESTAMPTZ DEFAULT NOW()
      );

      -- ════════════════════════════════════════
      --  DOSSIERS ASSURANCE (tiers-payant)
      -- ════════════════════════════════════════
      CREATE TABLE IF NOT EXISTS dossiers_assurance (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        reference       VARCHAR(30) UNIQUE NOT NULL,
        patient_id      UUID NOT NULL REFERENCES patients(id),
        clinique_id     UUID NOT NULL REFERENCES cliniques(id),
        consultation_id UUID REFERENCES consultations(id),
        assureur_id     UUID REFERENCES assureurs(id),
        compagnie       VARCHAR(200) NOT NULL,
        numero_police   VARCHAR(100),
        diagnostic      TEXT,
        actes           TEXT[],
        montant_total   INTEGER NOT NULL,
        montant_assur   INTEGER NOT NULL,
        ticket_moder    INTEGER NOT NULL,
        statut          VARCHAR(20) DEFAULT 'soumis'
                        CHECK (statut IN ('soumis','en_attente','valide','rejete')),
        motif_rejet     TEXT,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW()
      );

      -- ════════════════════════════════════════
      --  FACTURES
      -- ════════════════════════════════════════
      CREATE TABLE IF NOT EXISTS factures (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        reference       VARCHAR(30) UNIQUE NOT NULL,
        clinique_id     UUID NOT NULL REFERENCES cliniques(id),
        patient_id      UUID NOT NULL REFERENCES patients(id),
        consultation_id UUID REFERENCES consultations(id),
        montant_total   INTEGER NOT NULL,
        montant_assur   INTEGER DEFAULT 0,
        ticket_moder    INTEGER NOT NULL,
        mode_paiement   VARCHAR(50) DEFAULT 'Espèces',
        statut          VARCHAR(20) DEFAULT 'en_attente'
                        CHECK (statut IN ('en_attente','payee','annulee')),
        created_at      TIMESTAMPTZ DEFAULT NOW()
      );

      -- ════════════════════════════════════════
      --  STOCK CLINIQUE
      -- ════════════════════════════════════════
      CREATE TABLE IF NOT EXISTS stock_clinique (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        clinique_id     UUID NOT NULL REFERENCES cliniques(id) ON DELETE CASCADE,
        nom             VARCHAR(200) NOT NULL,
        categorie       VARCHAR(100),
        fournisseur     VARCHAR(200),
        quantite        INTEGER DEFAULT 0,
        seuil_alerte    INTEGER DEFAULT 50,
        prix_unitaire   INTEGER DEFAULT 0,
        numero_lot      VARCHAR(50),
        date_expiration DATE,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW()
      );

      -- ════════════════════════════════════════
      --  STOCK PHARMACIE
      -- ════════════════════════════════════════
      CREATE TABLE IF NOT EXISTS stock_pharmacie (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        pharmacie_id    UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
        nom             VARCHAR(200) NOT NULL,
        categorie       VARCHAR(100),
        fournisseur     VARCHAR(200),
        quantite        INTEGER DEFAULT 0,
        seuil_alerte    INTEGER DEFAULT 50,
        prix_unitaire   INTEGER DEFAULT 0,
        numero_lot      VARCHAR(50),
        date_expiration DATE,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW()
      );

      -- ════════════════════════════════════════
      --  COMMANDES MÉDICAMENTS
      -- ════════════════════════════════════════
      CREATE TABLE IF NOT EXISTS commandes (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        reference       VARCHAR(30) UNIQUE NOT NULL,
        patient_id      UUID NOT NULL REFERENCES patients(id),
        pharmacie_id    UUID NOT NULL REFERENCES pharmacies(id),
        livreur_id      UUID REFERENCES livreurs(id),
        montant_total   INTEGER NOT NULL,
        adresse_livr    TEXT,
        instructions    TEXT,
        mode_paiement   VARCHAR(50) DEFAULT 'cash',
        statut          VARCHAR(30) DEFAULT 'en_preparation'
                        CHECK (statut IN ('en_preparation','remis_livreur','en_livraison','livre','annule')),
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW()
      );

      -- ════════════════════════════════════════
      --  CAISSE
      -- ════════════════════════════════════════
      CREATE TABLE IF NOT EXISTS caisses (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        clinique_id     UUID NOT NULL REFERENCES cliniques(id) ON DELETE CASCADE,
        nom             VARCHAR(100) DEFAULT 'Caisse principale',
        operateur       VARCHAR(200),
        date_ouverture  DATE NOT NULL,
        heure_ouverture TIME,
        solde_ouverture INTEGER DEFAULT 0,
        solde_cloture   INTEGER,
        statut          VARCHAR(20) DEFAULT 'ouverte'
                        CHECK (statut IN ('ouverte','fermee','cloturee')),
        created_at      TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS transactions_caisse (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        caisse_id   UUID NOT NULL REFERENCES caisses(id) ON DELETE CASCADE,
        type        VARCHAR(20) NOT NULL CHECK (type IN ('encaissement','decaissement')),
        label       TEXT NOT NULL,
        montant     INTEGER NOT NULL,
        mode        VARCHAR(50) DEFAULT 'Espèces',
        reference   VARCHAR(100),
        caissier    VARCHAR(200),
        heure       TIME DEFAULT CURRENT_TIME,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );

      -- ════════════════════════════════════════
      --  TÉLÉCONSULTATIONS
      -- ════════════════════════════════════════
      CREATE TABLE IF NOT EXISTS teleconsultations (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        patient_id      UUID NOT NULL REFERENCES patients(id),
        medecin_id      UUID NOT NULL REFERENCES medecins(id),
        clinique_id     UUID REFERENCES cliniques(id),
        date_heure      TIMESTAMPTZ NOT NULL,
        duree_minutes   INTEGER,
        statut          VARCHAR(20) DEFAULT 'planifiee'
                        CHECK (statut IN ('planifiee','en_cours','terminee','annulee')),
        compte_rendu    TEXT,
        created_at      TIMESTAMPTZ DEFAULT NOW()
      );

      -- ════════════════════════════════════════
      --  NOTIFICATIONS
      -- ════════════════════════════════════════
      CREATE TABLE IF NOT EXISTS notifications (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id     UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
        type        VARCHAR(50) NOT NULL,
        titre       TEXT NOT NULL,
        message     TEXT,
        lu          BOOLEAN DEFAULT false,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );

      -- ════════════════════════════════════════
      --  CONVENTIONS ASSUREUR/CLINIQUE
      -- ════════════════════════════════════════
      CREATE TABLE IF NOT EXISTS conventions (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        assureur_id     UUID NOT NULL REFERENCES assureurs(id),
        clinique_id     UUID NOT NULL REFERENCES cliniques(id),
        taux            INTEGER DEFAULT 80,
        plafond_acte    INTEGER,
        prestations     TEXT[],
        date_debut      DATE NOT NULL,
        date_fin        DATE,
        is_active       BOOLEAN DEFAULT true,
        created_at      TIMESTAMPTZ DEFAULT NOW()
      );

      -- ════════════════════════════════════════
      --  INDEX POUR PERFORMANCES
      -- ════════════════════════════════════════
      CREATE INDEX IF NOT EXISTS idx_rdv_patient     ON rendez_vous(patient_id);
      CREATE INDEX IF NOT EXISTS idx_rdv_clinique    ON rendez_vous(clinique_id);
      CREATE INDEX IF NOT EXISTS idx_rdv_date        ON rendez_vous(date_rdv);
      CREATE INDEX IF NOT EXISTS idx_consult_patient ON consultations(patient_id);
      CREATE INDEX IF NOT EXISTS idx_notif_user      ON notifications(user_id, lu);
      CREATE INDEX IF NOT EXISTS idx_patient_code    ON patients(code_secret);
      CREATE INDEX IF NOT EXISTS idx_commande_statut ON commandes(statut);
      CREATE INDEX IF NOT EXISTS idx_facture_statut  ON factures(statut);
    `);

    await client.query('COMMIT');
    console.log('✅ Migration terminée — toutes les tables créées');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur migration:', err.message);
    throw err;
  } finally {
    client.release();
    pool.end();
  }
};

migrate();
