#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
patch_bordereaux.py — MediConnect Africa / CSN

Ajoute le module "Bordereaux de facturation assurance" :
  - migrations/migration_bordereaux_facturation.sql   (nouveau fichier)
  - backend/routes/bordereaux.js                      (nouveau fichier)
  - backend/server.js                                 (patch : montage de la route)
  - frontend/src/pages/clinique/Dashboard.jsx          (patch : onglet + rendu + hooks)

Usage :
    cd "$REPO"
    python3 patch_bordereaux.py

Le script :
  - sauvegarde chaque fichier modifié avant patch (style .bakNN, comme
    tes autres patch_*.py) ;
  - vérifie count==1 avant chaque remplacement — si l'ancre n'est pas
    trouvée EXACTEMENT une fois, il s'arrête sans rien casser ;
  - est idempotent : si relancé après un premier passage réussi, il
    détecte que le patch est déjà appliqué et le saute proprement.

Après exécution, il reste à lancer la migration SQL manuellement
(affiché à la fin du script) — ce script ne touche jamais la base.
"""

import os
import re
import shutil
import sys

REPO = os.getcwd()

BACKEND_SERVER = os.path.join(REPO, "backend", "server.js")
BACKEND_ROUTE_NEW = os.path.join(REPO, "backend", "routes", "bordereaux.js")
DASHBOARD = os.path.join(REPO, "frontend", "src", "pages", "clinique", "Dashboard.jsx")
MIGRATIONS_DIR = os.path.join(REPO, "migrations")
MIGRATION_NEW = os.path.join(MIGRATIONS_DIR, "migration_bordereaux_facturation.sql")


def fail(msg):
    print(f"\n❌ {msg}")
    sys.exit(1)


def next_backup_path(path):
    """Reproduit la convention .bakNN déjà utilisée dans ce repo."""
    d, base = os.path.split(path)
    n = 1
    existing = [f for f in os.listdir(d) if f.startswith(base + ".bak")]
    nums = []
    for f in existing:
        m = re.match(re.escape(base) + r"\.bak(\d+)$", f)
        if m:
            nums.append(int(m.group(1)))
    if nums:
        n = max(nums) + 1
    return os.path.join(d, f"{base}.bak{n}")


def backup(path):
    if not os.path.exists(path):
        return None
    bak = next_backup_path(path)
    shutil.copy2(path, bak)
    print(f"  💾 backup -> {os.path.relpath(bak, REPO)}")
    return bak


def patch_str_replace(path, old, new, label, already_applied_marker=None):
    """
    Remplace `old` par `new` dans `path`, avec assertion count==1.
    Si `already_applied_marker` est trouvé dans le fichier, on considère
    le patch déjà appliqué et on saute (idempotence).
    """
    if not os.path.exists(path):
        fail(f"Fichier introuvable : {path}")

    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    if already_applied_marker and already_applied_marker in content:
        print(f"  ⏭️  {label} : déjà appliqué, ignoré")
        return

    count = content.count(old)
    if count == 0:
        fail(
            f"{label} : ancre introuvable dans {os.path.relpath(path, REPO)}.\n"
            f"   Le fichier a probablement changé depuis la génération de ce patch.\n"
            f"   Ancre recherchée (début) : {old[:80]!r}"
        )
    if count > 1:
        fail(
            f"{label} : ancre trouvée {count} fois dans {os.path.relpath(path, REPO)} "
            f"(attendu 1 fois). Patch annulé par sécurité."
        )

    backup(path)
    content = content.replace(old, new, 1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"  ✅ {label}")


def write_new_file(path, content, label):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            existing = f.read()
        if existing == content:
            print(f"  ⏭️  {label} : fichier déjà identique, ignoré")
            return
        backup(path)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"  ✅ {label} -> {os.path.relpath(path, REPO)}")


# ============================================================
# 1. Migration SQL
# ============================================================
MIGRATION_SQL = r"""-- ============================================================
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
"""

# ============================================================
# 2. backend/routes/bordereaux.js  (nouveau fichier, style factures-auto.js)
# ============================================================
BORDEREAUX_JS = r"""'use strict';

/**
 * routes/bordereaux.js — MediConnect Africa / CSN
 * Module Facturation Assurance — Bordereaux (Phase 1+2+3)
 *
 * Montage dans server.js :
 *   const bordereauxRoutes = require('./routes/bordereaux');
 *   app.use('/api', bordereauxRoutes(dbPool, auth));
 *
 * Toute la portee clinique est deduite de req.user.clinique_id (token JWT) --
 * jamais d'un parametre client, pour eviter qu'une clinique lise les
 * bordereaux d'une autre.
 *
 * Format de reponse aligne sur le reste de l'API : { success, data|message }.
 */

const express = require('express');
const { withTransaction, resolveTable, pickColumn } = require('../helpers/dbIntrospect');

const STATUTS_VALIDES = [
  'brouillon', 'en_collecte', 'controle', 'pret_depot', 'depose',
  'valide_compagnie', 'rejet_partiel', 'rejet_total', 'litige', 'paye',
];

const TRANSITIONS = {
  brouillon: ['en_collecte'],
  en_collecte: ['controle'],
  controle: ['pret_depot', 'en_collecte'],
  pret_depot: ['depose'],
  depose: ['valide_compagnie', 'rejet_partiel', 'rejet_total'],
  valide_compagnie: ['paye'],
  rejet_partiel: ['litige', 'paye'],
  rejet_total: ['litige'],
  litige: ['depose', 'paye'],
  paye: [],
};

module.exports = function bordereauxRoutes(pool, auth) {
  const router = express.Router();

  if (typeof auth !== 'function') {
    console.error(
      '[bordereaux] MONTAGE INVALIDE : le 2e argument doit etre le middleware ' +
      "d'authentification, recu : " + typeof auth + '. Routes desactivees.'
    );
    auth = (req, res) => res.status(500).json({
      success: false,
      code: 'AUTH_MIDDLEWARE_MANQUANT',
      message: "Routes bordereaux mal montees dans server.js : middleware d'auth absent",
    });
  }

  async function genererReference(client, cliniqueId) {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const { rows } = await client.query(
      `SELECT COUNT(*)::int AS n FROM bordereaux_facturation
       WHERE clinique_id = $1 AND EXTRACT(YEAR FROM created_at) = $2 AND EXTRACT(MONTH FROM created_at) = $3`,
      [cliniqueId, yyyy, now.getMonth() + 1]
    );
    const seq = String((rows[0]?.n || 0) + 1).padStart(4, '0');
    return `BDX-${yyyy}${mm}-${seq}`;
  }

  async function recalculerMontants(client, bordereauId) {
    await client.query(
      `UPDATE bordereaux_facturation b SET
         montant_total = COALESCE((SELECT SUM(montant_facture) FROM bordereau_lignes WHERE bordereau_id=b.id), 0),
         montant_valide = COALESCE((SELECT SUM(montant_facture) FROM bordereau_lignes WHERE bordereau_id=b.id AND statut_ligne='valide'), 0),
         montant_rejete = COALESCE((SELECT SUM(montant_facture) FROM bordereau_lignes WHERE bordereau_id=b.id AND statut_ligne='rejete'), 0),
         updated_at = now()
       WHERE b.id = $1`,
      [bordereauId]
    );
  }

  async function ajouterLignes(client, bordereauId, factureIds, compagnieId) {
    const metaF = await resolveTable(client, ['factures', 'facture']);
    if (!metaF) throw Object.assign(new Error('Table factures introuvable'), { status: 500 });
    const colMontant = pickColumn(metaF, ['montant_total', 'montant']);

    for (const factureId of factureIds) {
      const { rows } = await client.query(`SELECT * FROM "${metaF.name}" WHERE id = $1`, [factureId]);
      if (!rows.length) continue;
      const facture = rows[0];
      const montantFacture = facture[colMontant] || 0;

      const gRes = await client.query(
        `SELECT tarif_convention FROM grilles_tarifaires
         WHERE compagnie_id = $1
           AND date_debut_validite <= CURRENT_DATE
           AND (date_fin_validite IS NULL OR date_fin_validite >= CURRENT_DATE)
         ORDER BY date_debut_validite DESC LIMIT 1`,
        [compagnieId]
      );
      const montantContractuel = gRes.rows.length ? gRes.rows[0].tarif_convention : null;

      await client.query(
        `INSERT INTO bordereau_lignes (bordereau_id, facture_id, montant_facture, montant_contractuel)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (bordereau_id, facture_id) DO NOTHING`,
        [bordereauId, factureId, montantFacture, montantContractuel]
      );
    }
  }

  router.get('/compagnies-assurance', auth, async (req, res) => {
    try {
      const { rows } = await pool.query(`SELECT * FROM compagnies_assurance WHERE actif = true ORDER BY nom`);
      res.json({ success: true, data: rows });
    } catch (e) {
      console.error('[bordereaux GET /compagnies-assurance]', e.message);
      res.status(500).json({ success: false, message: e.message });
    }
  });

  router.get('/bordereaux', auth, async (req, res) => {
    try {
      const cliniqueId = req.user?.clinique_id;
      const { statut, compagnie_id } = req.query;
      const clauses = ['b.clinique_id = $1'];
      const params = [cliniqueId];
      if (statut) { params.push(statut); clauses.push(`b.statut = $${params.length}`); }
      if (compagnie_id) { params.push(compagnie_id); clauses.push(`b.compagnie_id = $${params.length}`); }

      const { rows } = await pool.query(
        `SELECT b.*, c.nom AS compagnie_nom,
                (SELECT COUNT(*) FROM bordereau_lignes l WHERE l.bordereau_id = b.id) AS nb_lignes
         FROM bordereaux_facturation b
         JOIN compagnies_assurance c ON c.id = b.compagnie_id
         WHERE ${clauses.join(' AND ')}
         ORDER BY b.created_at DESC`,
        params
      );
      res.json({ success: true, data: rows });
    } catch (e) {
      console.error('[bordereaux GET /bordereaux]', e.message);
      res.status(500).json({ success: false, message: e.message });
    }
  });

  router.get('/bordereaux/eligibles/liste', auth, async (req, res) => {
    const client = await pool.connect();
    try {
      const cliniqueId = req.user?.clinique_id;
      const { compagnie_id, periode_debut, periode_fin } = req.query;
      if (!compagnie_id || !periode_debut || !periode_fin) {
        return res.status(400).json({ success: false, message: 'compagnie_id, periode_debut, periode_fin requis' });
      }
      const metaF = await resolveTable(client, ['factures', 'facture']);
      if (!metaF) return res.status(500).json({ success: false, message: 'Table factures introuvable' });
      const colDate = pickColumn(metaF, ['created_at', 'date_emission']);

      const { rows } = await client.query(
        `SELECT * FROM "${metaF.name}" f
         WHERE f.clinique_id = $1
           AND f.compagnie_id = $2
           AND f."${colDate}" BETWEEN $3 AND $4
           AND NOT EXISTS (SELECT 1 FROM bordereau_lignes l WHERE l.facture_id = f.id)
         ORDER BY f."${colDate}" ASC`,
        [cliniqueId, compagnie_id, periode_debut, periode_fin]
      );
      res.json({ success: true, data: rows });
    } catch (e) {
      console.error('[bordereaux GET /eligibles]', e.message);
      res.status(500).json({ success: false, message: e.message });
    } finally {
      client.release();
    }
  });

  router.post('/bordereaux', auth, async (req, res) => {
    try {
      const cliniqueId = req.user?.clinique_id;
      const { compagnie_id, periode_debut, periode_fin, facture_ids = [] } = req.body;
      if (!compagnie_id || !periode_debut || !periode_fin) {
        return res.status(400).json({ success: false, message: 'compagnie_id, periode_debut, periode_fin requis' });
      }

      const out = await withTransaction(pool, async (client) => {
        const reference = await genererReference(client, cliniqueId);
        const bRes = await client.query(
          `INSERT INTO bordereaux_facturation
            (clinique_id, compagnie_id, reference, periode_debut, periode_fin, statut, responsable_id)
           VALUES ($1,$2,$3,$4,$5,'brouillon',$6)
           RETURNING *`,
          [cliniqueId, compagnie_id, reference, periode_debut, periode_fin, req.user?.id]
        );
        const bordereau = bRes.rows[0];
        if (facture_ids.length) {
          await ajouterLignes(client, bordereau.id, facture_ids, compagnie_id);
          await recalculerMontants(client, bordereau.id);
        }
        return bordereau;
      });

      res.status(201).json({ success: true, data: out });
    } catch (e) {
      console.error('[bordereaux POST /bordereaux]', e.message);
      res.status(e.status || 500).json({ success: false, message: e.message });
    }
  });

  router.get('/bordereaux/:id', auth, async (req, res) => {
    try {
      const cliniqueId = req.user?.clinique_id;
      const bRes = await pool.query(
        `SELECT b.*, c.nom AS compagnie_nom
         FROM bordereaux_facturation b
         JOIN compagnies_assurance c ON c.id = b.compagnie_id
         WHERE b.id = $1 AND b.clinique_id = $2`,
        [req.params.id, cliniqueId]
      );
      if (!bRes.rows.length) return res.status(404).json({ success: false, message: 'Bordereau introuvable' });

      const lignesRes = await pool.query(
        `SELECT l.* FROM bordereau_lignes l WHERE l.bordereau_id = $1 ORDER BY l.created_at ASC`,
        [req.params.id]
      );
      res.json({ success: true, data: { ...bRes.rows[0], lignes: lignesRes.rows } });
    } catch (e) {
      console.error('[bordereaux GET /:id]', e.message);
      res.status(500).json({ success: false, message: e.message });
    }
  });

  router.post('/bordereaux/:id/lignes', auth, async (req, res) => {
    try {
      const { facture_ids = [] } = req.body;
      if (!facture_ids.length) return res.status(400).json({ success: false, message: 'facture_ids requis' });

      const bRes = await pool.query(
        'SELECT * FROM bordereaux_facturation WHERE id=$1 AND clinique_id=$2',
        [req.params.id, req.user?.clinique_id]
      );
      if (!bRes.rows.length) return res.status(404).json({ success: false, message: 'Bordereau introuvable' });
      const bordereau = bRes.rows[0];
      if (!['brouillon', 'en_collecte'].includes(bordereau.statut)) {
        return res.status(409).json({ success: false, message: `Ajout de ligne impossible en statut ${bordereau.statut}` });
      }

      await withTransaction(pool, async (client) => {
        await ajouterLignes(client, req.params.id, facture_ids, bordereau.compagnie_id);
        await recalculerMontants(client, req.params.id);
      });

      res.json({ success: true });
    } catch (e) {
      console.error('[bordereaux POST /:id/lignes]', e.message);
      res.status(500).json({ success: false, message: e.message });
    }
  });

  router.delete('/bordereaux/:id/lignes/:ligneId', auth, async (req, res) => {
    try {
      await pool.query('DELETE FROM bordereau_lignes WHERE id=$1 AND bordereau_id=$2', [req.params.ligneId, req.params.id]);
      await withTransaction(pool, (client) => recalculerMontants(client, req.params.id));
      res.json({ success: true });
    } catch (e) {
      console.error('[bordereaux DELETE ligne]', e.message);
      res.status(500).json({ success: false, message: e.message });
    }
  });

  router.patch('/bordereaux/:id/statut', auth, async (req, res) => {
    try {
      const { statut } = req.body;
      if (!STATUTS_VALIDES.includes(statut)) {
        return res.status(400).json({ success: false, message: 'Statut invalide' });
      }
      const bRes = await pool.query(
        'SELECT * FROM bordereaux_facturation WHERE id=$1 AND clinique_id=$2',
        [req.params.id, req.user?.clinique_id]
      );
      if (!bRes.rows.length) return res.status(404).json({ success: false, message: 'Bordereau introuvable' });
      const bordereau = bRes.rows[0];

      const autorises = TRANSITIONS[bordereau.statut] || [];
      if (!autorises.includes(statut)) {
        return res.status(409).json({
          success: false,
          message: `Transition ${bordereau.statut} vers ${statut} non autorisee`,
          transitions_autorisees: autorises,
        });
      }

      if (statut === 'pret_depot') {
        const ecarts = await pool.query(
          `SELECT COUNT(*)::int AS n FROM bordereau_lignes
           WHERE bordereau_id = $1 AND montant_contractuel IS NOT NULL
             AND montant_facture <> montant_contractuel AND statut_ligne = 'en_attente'`,
          [req.params.id]
        );
        if (ecarts.rows[0].n > 0) {
          return res.status(409).json({ success: false, message: `${ecarts.rows[0].n} ligne(s) presentent un ecart tarifaire non resolu` });
        }
      }

      const sets = ['statut = $1', 'updated_at = now()'];
      if (statut === 'depose') sets.push('date_depot = now()');
      if (['valide_compagnie', 'rejet_partiel', 'rejet_total'].includes(statut)) sets.push('date_reponse_compagnie = now()');
      if (statut === 'paye') sets.push('date_paiement = now()');

      await pool.query(`UPDATE bordereaux_facturation SET ${sets.join(', ')} WHERE id=$2`, [statut, req.params.id]);
      res.json({ success: true, statut });
    } catch (e) {
      console.error('[bordereaux PATCH /:id/statut]', e.message);
      res.status(500).json({ success: false, message: e.message });
    }
  });

  router.post('/bordereaux/:id/reponse-compagnie', auth, async (req, res) => {
    try {
      const { lignes = [] } = req.body;
      const nouveauStatut = await withTransaction(pool, async (client) => {
        for (const l of lignes) {
          await client.query(
            `UPDATE bordereau_lignes SET statut_ligne=$1, motif_rejet=$2 WHERE id=$3 AND bordereau_id=$4`,
            [l.statut_ligne, l.motif_rejet || null, l.ligne_id, req.params.id]
          );
          if (l.statut_ligne === 'rejete') {
            await client.query(
              `INSERT INTO litiges_facturation (bordereau_ligne_id, type, motif, ouvert_par)
               VALUES ($1,'litige',$2,$3)`,
              [l.ligne_id, l.motif_rejet || 'Rejete par la compagnie', req.user?.id]
            );
          }
        }
        await recalculerMontants(client, req.params.id);

        const stats = await client.query(
          `SELECT
             COUNT(*) FILTER (WHERE statut_ligne='rejete')::int AS n_rejet,
             COUNT(*) FILTER (WHERE statut_ligne='valide')::int AS n_valide
           FROM bordereau_lignes WHERE bordereau_id=$1`,
          [req.params.id]
        );
        const { n_rejet, n_valide } = stats.rows[0];
        let statut = 'valide_compagnie';
        if (n_rejet > 0 && n_valide > 0) statut = 'rejet_partiel';
        else if (n_rejet > 0 && n_valide === 0) statut = 'rejet_total';

        await client.query(
          `UPDATE bordereaux_facturation SET statut=$1, date_reponse_compagnie=now(), updated_at=now() WHERE id=$2`,
          [statut, req.params.id]
        );
        return statut;
      });

      res.json({ success: true, statut: nouveauStatut });
    } catch (e) {
      console.error('[bordereaux POST /:id/reponse-compagnie]', e.message);
      res.status(500).json({ success: false, message: e.message });
    }
  });

  router.get('/bordereaux/kpi/resume', auth, async (req, res) => {
    try {
      const cliniqueId = req.user?.clinique_id;
      const { rows } = await pool.query(
        `SELECT
           COUNT(*)::int AS total_bordereaux,
           COALESCE(SUM(montant_total),0) AS montant_total,
           COALESCE(SUM(montant_valide),0) AS montant_valide,
           COALESCE(SUM(montant_rejete),0) AS montant_rejete,
           COALESCE(AVG(EXTRACT(EPOCH FROM (date_reponse_compagnie - date_depot)) / 86400)
             FILTER (WHERE date_reponse_compagnie IS NOT NULL AND date_depot IS NOT NULL), 0) AS delai_moyen_jours,
           COUNT(*) FILTER (WHERE statut IN ('litige','rejet_partiel','rejet_total'))::int AS bordereaux_en_litige
         FROM bordereaux_facturation WHERE clinique_id = $1`,
        [cliniqueId]
      );
      const litiges = await pool.query(
        `SELECT COUNT(*)::int AS n FROM litiges_facturation lf
         JOIN bordereau_lignes bl ON bl.id = lf.bordereau_ligne_id
         JOIN bordereaux_facturation b ON b.id = bl.bordereau_id
         WHERE b.clinique_id = $1 AND lf.statut IN ('ouvert','en_cours')`,
        [cliniqueId]
      );
      res.json({ success: true, data: { ...rows[0], litiges_ouverts: litiges.rows[0].n } });
    } catch (e) {
      console.error('[bordereaux GET /kpi/resume]', e.message);
      res.status(500).json({ success: false, message: e.message });
    }
  });

  return router;
};
"""

# ============================================================
# 3. Patch backend/server.js — montage de la route
# ============================================================
SERVER_OLD = "app.use('/api', facturesAuto(dbPool, auth));"
SERVER_NEW = (
    "app.use('/api', facturesAuto(dbPool, auth));\n\n"
    "const bordereauxRoutes = require('./routes/bordereaux');\n"
    "app.use('/api', bordereauxRoutes(dbPool, auth));"
)

# ============================================================
# 4. Patch frontend Dashboard.jsx — 3 insertions
# ============================================================

# 4a. Onglet dans FINANCE_TABS
TABS_OLD = '''    { key:"assurances", label:"Remboursements" },
    { key:"rapports", label:"Rapports" },'''
TABS_NEW = '''    { key:"assurances", label:"Remboursements" },
    { key:"bordereaux", label:"Bordereaux" },
    { key:"rapports", label:"Rapports" },'''

# 4b. Hooks / state, insérés juste avant la déclaration de FINANCE_TABS
HOOKS_OLD = "  const FINANCE_TABS = ["
HOOKS_NEW = '''  // ===== Bordereaux de facturation assurance =====
  const [filtreBordereauStatut, setFiltreBordereauStatut] = useState("");
  const [bordereauSelectionne, setBordereauSelectionne] = useState(null);
  const [showCreationBordereau, setShowCreationBordereau] = useState(false);

  const { data: bordereaux = [], isLoading: loadingBordereaux } = useQuery({
    queryKey: ["cl-bordereaux", filtreBordereauStatut],
    queryFn: async () => {
      const r = await api.get("/bordereaux", { params: filtreBordereauStatut ? { statut: filtreBordereauStatut } : {} });
      return r.data;
    },
  });

  const ouvrirBordereau = async (id) => {
    try {
      const r = await api.get(`/bordereaux/${id}`);
      setBordereauSelectionne(r.data);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Impossible d'ouvrir ce bordereau");
    }
  };

  const transitionBordereauMut = useMutation({
    mutationFn: ({ id, statut }) => api.patch(`/bordereaux/${id}/statut`, { statut }),
    onSuccess: (_, variables) => {
      toast.success("Statut mis à jour");
      qc.invalidateQueries(["cl-bordereaux"]);
      if (bordereauSelectionne?.id === variables.id) ouvrirBordereau(variables.id);
    },
    onError: e => toast.error(e?.response?.data?.message || "Transition impossible"),
  });

  const BORDEREAU_STATUT_STYLE = {
    brouillon: "gray", en_collecte: "green", controle: "amber", pret_depot: "green",
    depose: "blue", valide_compagnie: "green", rejet_partiel: "amber",
    rejet_total: "red", litige: "red", paye: "green",
  };
  const BORDEREAU_STATUT_LABEL = {
    brouillon: "Brouillon", en_collecte: "En collecte", controle: "Contrôle",
    pret_depot: "Prêt à déposer", depose: "Déposé", valide_compagnie: "Validé",
    rejet_partiel: "Rejet partiel", rejet_total: "Rejet total", litige: "Litige", paye: "Payé",
  };
  const BORDEREAU_ACTIONS = {
    brouillon: [["en_collecte", "Démarrer la collecte"]],
    en_collecte: [["controle", "Envoyer au contrôle"]],
    controle: [["pret_depot", "Marquer prêt à déposer"], ["en_collecte", "Renvoyer en collecte"]],
    pret_depot: [["depose", "Confirmer le dépôt"]],
    rejet_partiel: [["litige", "Ouvrir en litige"], ["paye", "Solder"]],
    rejet_total: [["litige", "Ouvrir en litige"]],
    litige: [["depose", "Redéposer"], ["paye", "Solder"]],
    valide_compagnie: [["paye", "Marquer payé"]],
  };

  const FINANCE_TABS = ['''

# 4c. Bloc de rendu, inséré entre l'onglet "assurances" et "rapports"
RENDER_OLD = '''      {tab==="assurances" && (
        <Panel title="Demandes de remboursement assurance">
          <Empty icon="🛡️" title="Remboursements assurance" subtitle="Gérez ici les demandes de remboursement tiers-payant — intégration module assurance" />
        </Panel>
      )}

      {tab==="rapports" && ('''
RENDER_NEW = '''      {tab==="assurances" && (
        <Panel title="Demandes de remboursement assurance">
          <Empty icon="🛡️" title="Remboursements assurance" subtitle="Gérez ici les demandes de remboursement tiers-payant — intégration module assurance" />
        </Panel>
      )}

      {tab==="bordereaux" && (
        <>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <select value={filtreBordereauStatut} onChange={e=>setFiltreBordereauStatut(e.target.value)}
              style={{ background:C.input, border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 12px", color:C.text, fontFamily:"inherit" }}>
              <option value="">Tous les statuts</option>
              {Object.entries(BORDEREAU_STATUT_LABEL).map(([k,l])=>(<option key={k} value={k}>{l}</option>))}
            </select>
            <Btn onClick={()=>setShowCreationBordereau(true)}>+ Nouveau bordereau</Btn>
          </div>

          <Panel title="Bordereaux de facturation assurance">
            {loadingBordereaux
              ? <Empty icon="⏳" title="Chargement…" />
              : bordereaux.length===0
                ? <Empty icon="📑" title="Aucun bordereau" subtitle="Créez un bordereau pour grouper vos factures par compagnie d'assurance" />
                : <Table columns={[
                    { key:"reference", label:"Référence", render:v=><span style={{fontFamily:"monospace",fontSize:16,color:C.teal}}>{v}</span> },
                    { key:"compagnie_nom", label:"Compagnie" },
                    { key:"periode_debut", label:"Période", render:(_,b)=><span>{fmtDate(b.periode_debut)} → {fmtDate(b.periode_fin)}</span> },
                    { key:"nb_lignes", label:"Lignes" },
                    { key:"montant_total", label:"Montant", render:v=><span style={{fontWeight:800,color:C.green}}>{fmt(v)} F</span> },
                    { key:"statut", label:"Statut", render:v=><Badge color={BORDEREAU_STATUT_STYLE[v]||"gray"}>{BORDEREAU_STATUT_LABEL[v]||v}</Badge> },
                    { key:"id", label:"", render:(_,b)=><Btn variant="outline" style={{padding:"4px 10px",fontSize:14}} onClick={()=>ouvrirBordereau(b.id)}>Ouvrir</Btn> },
                  ]} rows={bordereaux} />
            }
          </Panel>

          {bordereauSelectionne && (
            <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
              <div style={{ background:C.bg, borderRadius:16, padding:24, width:"90%", maxWidth:780, maxHeight:"85vh", overflowY:"auto" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div>
                    <h3 style={{ margin:0, color:C.text }}>{bordereauSelectionne.reference}</h3>
                    <p style={{ margin:"4px 0", color:C.muted }}>{bordereauSelectionne.compagnie_nom}</p>
                  </div>
                  <Btn variant="outline" style={{padding:"4px 10px"}} onClick={()=>setBordereauSelectionne(null)}>✕</Btn>
                </div>

                <div style={{ margin:"12px 0" }}>
                  <Badge color={BORDEREAU_STATUT_STYLE[bordereauSelectionne.statut]||"gray"}>
                    {BORDEREAU_STATUT_LABEL[bordereauSelectionne.statut]||bordereauSelectionne.statut}
                  </Badge>
                </div>

                <Grid cols={3} gap={12} style={{ marginBottom:16 }}>
                  <Card label="Montant total" value={`${fmt(bordereauSelectionne.montant_total)} F`} icon="💰" color={C.blue} />
                  <Card label="Validé" value={`${fmt(bordereauSelectionne.montant_valide)} F`} icon="✅" color={C.green} />
                  <Card label="Rejeté" value={`${fmt(bordereauSelectionne.montant_rejete)} F`} icon="⚠️" color={C.red} />
                </Grid>

                {(bordereauSelectionne.lignes||[]).length>0 && (
                  <Table columns={[
                    { key:"montant_facture", label:"Facturé", render:v=>`${fmt(v)} F` },
                    { key:"montant_contractuel", label:"Tarif contractuel", render:v=>v!=null?`${fmt(v)} F`:"—" },
                    { key:"id", label:"Écart", render:(_,l)=>{
                        if (l.montant_contractuel==null) return "—";
                        const ecart = l.montant_facture - l.montant_contractuel;
                        return <span style={{ color: ecart===0?C.green:Math.abs(ecart)<1000?C.amber:C.red, fontWeight:700 }}>
                          {ecart>0?"+":""}{fmt(ecart)} F
                        </span>;
                      } },
                    { key:"statut_ligne", label:"Statut ligne" },
                  ]} rows={bordereauSelectionne.lignes} />
                )}

                {(BORDEREAU_ACTIONS[bordereauSelectionne.statut]||[]).length>0 && (
                  <div style={{ display:"flex", gap:10, marginTop:20, flexWrap:"wrap" }}>
                    {BORDEREAU_ACTIONS[bordereauSelectionne.statut].map(([to,label])=>(
                      <Btn key={to} onClick={()=>transitionBordereauMut.mutate({ id:bordereauSelectionne.id, statut:to })}>
                        {label}
                      </Btn>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {showCreationBordereau && (
            <CreationBordereauModal
              onClose={()=>setShowCreationBordereau(false)}
              onCreated={()=>{ setShowCreationBordereau(false); qc.invalidateQueries(["cl-bordereaux"]); }}
            />
          )}
        </>
      )}

      {tab==="rapports" && ('''

# 4d. Composant modal de création — inséré juste avant l'export du composant
# Dashboard (ancre : dernière ligne de la fonction ClinqueDashboard n'étant
# pas fiable a deviner ; on l'ajoute donc en tête de fichier, juste après
# les imports, comme un composant local autonome).
MODAL_MARKER = "function CreationBordereauModal("
MODAL_ANCHOR_OLD = 'import api from "../../services/api";'
MODAL_ANCHOR_NEW = '''import api from "../../services/api";

function CreationBordereauModal({ onClose, onCreated }) {
  const [compagnies, setCompagnies] = useState([]);
  const [compagnieId, setCompagnieId] = useState("");
  const [periodeDebut, setPeriodeDebut] = useState("");
  const [periodeFin, setPeriodeFin] = useState("");
  const [eligibles, setEligibles] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/compagnies-assurance").then(r => setCompagnies(r.data || [])).catch(() => {});
  }, []);

  const fetchEligibles = async () => {
    const r = await api.get("/bordereaux/eligibles/liste", {
      params: { compagnie_id: compagnieId, periode_debut: periodeDebut, periode_fin: periodeFin },
    });
    setEligibles(r.data || []);
    setSelectedIds((r.data || []).map(f => f.id));
    setStep(2);
  };

  const create = async () => {
    setSaving(true);
    try {
      await api.post("/bordereaux", {
        compagnie_id: compagnieId, periode_debut: periodeDebut, periode_fin: periodeFin,
        facture_ids: selectedIds,
      });
      onCreated();
    } catch (e) {
      alert("Erreur lors de la création du bordereau.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1001 }}>
      <div style={{ background:"#fff", borderRadius:16, padding:24, width:"90%", maxWidth:560, maxHeight:"85vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between" }}>
          <h3 style={{ margin:0 }}>Nouveau bordereau</h3>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer" }}>✕</button>
        </div>

        {step === 1 && (
          <div style={{ display:"flex", flexDirection:"column", gap:12, marginTop:16 }}>
            <label>
              Compagnie d'assurance
              <select value={compagnieId} onChange={e=>setCompagnieId(e.target.value)}
                style={{ display:"block", width:"100%", marginTop:4, padding:"8px 10px", borderRadius:8, border:"1px solid #ddd" }}>
                <option value="">— Choisir —</option>
                {compagnies.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </label>
            <label>
              Période — début
              <input type="date" value={periodeDebut} onChange={e=>setPeriodeDebut(e.target.value)}
                style={{ display:"block", width:"100%", marginTop:4, padding:"8px 10px", borderRadius:8, border:"1px solid #ddd" }} />
            </label>
            <label>
              Période — fin
              <input type="date" value={periodeFin} onChange={e=>setPeriodeFin(e.target.value)}
                style={{ display:"block", width:"100%", marginTop:4, padding:"8px 10px", borderRadius:8, border:"1px solid #ddd" }} />
            </label>
            <button disabled={!compagnieId || !periodeDebut || !periodeFin} onClick={fetchEligibles}
              style={{ background:"#0a8f58", color:"#fff", border:"none", borderRadius:8, padding:"10px 16px", fontWeight:700, cursor:"pointer", marginTop:8 }}>
              Voir les factures éligibles
            </button>
          </div>
        )}

        {step === 2 && (
          <div style={{ marginTop:16 }}>
            <p style={{ color:"#8a8f89", fontSize:14 }}>
              {eligibles.length} facture(s) trouvée(s) pour cette compagnie sur la période.
            </p>
            <div style={{ maxHeight:260, overflowY:"auto", border:"1px solid #eee", borderRadius:8 }}>
              {eligibles.map(f => (
                <label key={f.id} style={{ display:"flex", gap:10, alignItems:"center", padding:"8px 12px", borderBottom:"1px solid #f2f2f2" }}>
                  <input type="checkbox" checked={selectedIds.includes(f.id)}
                    onChange={e => setSelectedIds(prev => e.target.checked ? [...prev, f.id] : prev.filter(id => id !== f.id))} />
                  <span style={{ flex:1 }}>{f.patient_nom || `Facture #${f.id}`}</span>
                  <span>{f.montant_total ?? f.montant} F</span>
                </label>
              ))}
            </div>
            <button disabled={saving} onClick={create}
              style={{ background:"#0a8f58", color:"#fff", border:"none", borderRadius:8, padding:"10px 16px", fontWeight:700, cursor:"pointer", width:"100%", marginTop:16 }}>
              {saving ? "Création…" : `Créer le bordereau (${selectedIds.length} facture(s))`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}'''

# ============================================================
# EXÉCUTION
# ============================================================
def main():
    print(f"📂 Repo : {REPO}\n")

    print("1. Migration SQL")
    write_new_file(MIGRATION_NEW, MIGRATION_SQL, "migration bordereaux")

    print("\n2. Backend — nouvelle route")
    write_new_file(BACKEND_ROUTE_NEW, BORDEREAUX_JS, "backend/routes/bordereaux.js")

    print("\n3. Backend — montage dans server.js")
    patch_str_replace(
        BACKEND_SERVER, SERVER_OLD, SERVER_NEW,
        "montage route bordereaux",
        already_applied_marker="require('./routes/bordereaux')",
    )

    print("\n4. Frontend — Dashboard.jsx")
    patch_str_replace(
        DASHBOARD, MODAL_ANCHOR_OLD, MODAL_ANCHOR_NEW,
        "composant CreationBordereauModal",
        already_applied_marker=MODAL_MARKER,
    )
    patch_str_replace(
        DASHBOARD, HOOKS_OLD, HOOKS_NEW,
        "hooks bordereaux",
        already_applied_marker="cl-bordereaux",
    )
    patch_str_replace(
        DASHBOARD, TABS_OLD, TABS_NEW,
        "onglet FINANCE_TABS",
        already_applied_marker='key:"bordereaux", label:"Bordereaux"',
    )
    patch_str_replace(
        DASHBOARD, RENDER_OLD, RENDER_NEW,
        "bloc de rendu onglet bordereaux",
        already_applied_marker='tab==="bordereaux" &&',
    )

    print("\n✅ Patch terminé.\n")
    print("Étapes restantes (manuelles) :")
    print(f'  1. Exécuter la migration :\n     psql "$DATABASE_URL" -f migrations/migration_bordereaux_facturation.sql')
    print("  2. Insérer au moins une compagnie de test :")
    print("     INSERT INTO compagnies_assurance (nom) VALUES ('NSIA Assurances');")
    print("  3. Redémarrer/redéployer le backend (Vercel Deploy Hook si prod).")
    print("  4. git diff pour relire les 2 fichiers patchés avant commit.")


if __name__ == "__main__":
    main()
