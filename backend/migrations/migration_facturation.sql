-- ==================================================================
-- MediConnect Africa / CSN — migration facturation automatique
-- A executer dans la console Neon. Idempotent : rejouable sans risque.
-- Conventions reprises de la table factures existante :
--   uuid + uuid_generate_v4(), montants en integer (FCFA),
--   timestamptz + now(), nommage abrege montant_assur / ticket_moder.
-- ==================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Lignes de facture -----------------------------------------------
CREATE TABLE IF NOT EXISTS facture_lignes (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  facture_id     uuid NOT NULL REFERENCES factures(id) ON DELETE CASCADE,
  code           varchar(20),
  libelle        varchar(255) NOT NULL,
  tarif          integer NOT NULL,
  quantite       integer NOT NULL DEFAULT 1,
  montant        integer NOT NULL,
  taux           integer DEFAULT 0,
  montant_assur  integer DEFAULT 0,
  ticket_moder   integer NOT NULL DEFAULT 0,
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_facture_lignes_facture
  ON facture_lignes (facture_id);

-- 2. Garde-fou d'idempotence ----------------------------------------
-- Une consultation ne peut porter qu'une seule facture. Le controle
-- applicatif existe deja ; cet index le rend infalsifiable, meme en
-- cas de double clic ou de requetes concurrentes.
-- Verifier d'abord l'absence de doublons :
--   SELECT consultation_id, COUNT(*) FROM factures
--    WHERE consultation_id IS NOT NULL
--    GROUP BY consultation_id HAVING COUNT(*) > 1;
CREATE UNIQUE INDEX IF NOT EXISTS uq_factures_consultation
  ON factures (consultation_id)
  WHERE consultation_id IS NOT NULL;

-- 3. Unicite de la reference ----------------------------------------
-- Verifier d'abord :
--   SELECT reference, COUNT(*) FROM factures
--    GROUP BY reference HAVING COUNT(*) > 1;
CREATE UNIQUE INDEX IF NOT EXISTS uq_factures_reference
  ON factures (reference);

-- 4. Recherche par clinique -----------------------------------------
CREATE INDEX IF NOT EXISTS idx_factures_clinique_date
  ON factures (clinique_id, created_at DESC);

-- Verification
SELECT table_name, column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'facture_lignes'
 ORDER BY ordinal_position;
