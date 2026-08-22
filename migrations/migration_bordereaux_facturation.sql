-- ============================================================
-- MIGRATION — Module Facturation Assurance / Bordereaux
-- MediConnect Africa — Gestion Financière v2
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS compagnies_assurance (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(150) NOT NULL,
  contact_nom VARCHAR(150),
  contact_telephone VARCHAR(30),
  contact_email VARCHAR(150),
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS formules_assurance (
  id SERIAL PRIMARY KEY,
  compagnie_id INTEGER REFERENCES compagnies_assurance(id) ON DELETE CASCADE,
  nom VARCHAR(150) NOT NULL,
  taux_prise_charge NUMERIC(5,2) DEFAULT 100,
  actif BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS bordereaux_facturation (
  id SERIAL PRIMARY KEY,
  clinique_id INTEGER NOT NULL REFERENCES cliniques(id),
  compagnie_id INTEGER NOT NULL REFERENCES compagnies_assurance(id),
  reference VARCHAR(40) UNIQUE,
  periode_debut DATE NOT NULL,
  periode_fin DATE NOT NULL,
  statut VARCHAR(30) NOT NULL DEFAULT 'brouillon',
  montant_total NUMERIC(12,2) DEFAULT 0,
  montant_valide NUMERIC(12,2) DEFAULT 0,
  montant_rejete NUMERIC(12,2) DEFAULT 0,
  date_depot TIMESTAMP,
  date_reponse_compagnie TIMESTAMP,
  date_paiement TIMESTAMP,
  responsable_id INTEGER REFERENCES utilisateurs(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  CONSTRAINT chk_statut_bordereau CHECK (statut IN (
    'brouillon','en_collecte','controle','pret_depot','depose',
    'valide_compagnie','rejet_partiel','rejet_total','litige','paye'
  ))
);

CREATE INDEX IF NOT EXISTS idx_bordereaux_clinique ON bordereaux_facturation(clinique_id);
CREATE INDEX IF NOT EXISTS idx_bordereaux_compagnie ON bordereaux_facturation(compagnie_id);
CREATE INDEX IF NOT EXISTS idx_bordereaux_statut ON bordereaux_facturation(statut);

CREATE TABLE IF NOT EXISTS bordereau_lignes (
  id SERIAL PRIMARY KEY,
  bordereau_id INTEGER NOT NULL REFERENCES bordereaux_facturation(id) ON DELETE CASCADE,
  facture_id INTEGER NOT NULL REFERENCES factures(id),
  montant_facture NUMERIC(12,2) NOT NULL DEFAULT 0,
  montant_contractuel NUMERIC(12,2),
  statut_ligne VARCHAR(20) NOT NULL DEFAULT 'en_attente',
  motif_rejet TEXT,
  created_at TIMESTAMP DEFAULT now(),
  CONSTRAINT chk_statut_ligne CHECK (statut_ligne IN (
    'en_attente','valide','rejete','litige','avoir','refacture'
  )),
  UNIQUE (bordereau_id, facture_id)
);

CREATE INDEX IF NOT EXISTS idx_bordereau_lignes_bordereau ON bordereau_lignes(bordereau_id);
CREATE INDEX IF NOT EXISTS idx_bordereau_lignes_facture ON bordereau_lignes(facture_id);

CREATE TABLE IF NOT EXISTS grilles_tarifaires (
  id SERIAL PRIMARY KEY,
  clinique_id INTEGER NOT NULL REFERENCES cliniques(id),
  compagnie_id INTEGER NOT NULL REFERENCES compagnies_assurance(id),
  formule_id INTEGER REFERENCES formules_assurance(id),
  acte_id INTEGER,
  libelle_acte VARCHAR(200),
  tarif_convention NUMERIC(12,2) NOT NULL,
  date_debut_validite DATE NOT NULL DEFAULT CURRENT_DATE,
  date_fin_validite DATE,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_grilles_compagnie ON grilles_tarifaires(compagnie_id, formule_id);

CREATE TABLE IF NOT EXISTS litiges_facturation (
  id SERIAL PRIMARY KEY,
  bordereau_ligne_id INTEGER NOT NULL REFERENCES bordereau_lignes(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL DEFAULT 'litige',
  motif TEXT,
  montant NUMERIC(12,2),
  statut VARCHAR(20) NOT NULL DEFAULT 'ouvert',
  ouvert_par INTEGER REFERENCES utilisateurs(id),
  resolu_le TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT now(),
  CONSTRAINT chk_type_litige CHECK (type IN ('litige','avoir','refacturation')),
  CONSTRAINT chk_statut_litige CHECK (statut IN ('ouvert','en_cours','resolu','abandonne'))
);

CREATE INDEX IF NOT EXISTS idx_litiges_ligne ON litiges_facturation(bordereau_ligne_id);
CREATE INDEX IF NOT EXISTS idx_litiges_statut ON litiges_facturation(statut);

CREATE TABLE IF NOT EXISTS compagnie_echanges (
  id SERIAL PRIMARY KEY,
  compagnie_id INTEGER NOT NULL REFERENCES compagnies_assurance(id),
  bordereau_id INTEGER REFERENCES bordereaux_facturation(id),
  type VARCHAR(20) NOT NULL DEFAULT 'email',
  resume TEXT NOT NULL,
  auteur_id INTEGER REFERENCES utilisateurs(id),
  created_at TIMESTAMP DEFAULT now(),
  CONSTRAINT chk_type_echange CHECK (type IN ('appel','email','reunion','courrier'))
);

CREATE INDEX IF NOT EXISTS idx_echanges_compagnie ON compagnie_echanges(compagnie_id);

COMMIT;
