'use strict';

/**
 * routes/bordereaux.js — MediConnect Africa / CSN
 * Module Facturation Assurance — Bordereaux (Phase 1+2+3)
 *
 * VERSION CORRIGEE : la version precedente referencait une table
 * compagnies_assurance (SERIAL/INTEGER) qui n'existe pas et fait
 * doublon avec la table assureurs deja existante dans MediConnect
 * (uuid). Toutes les requetes utilisent desormais assureurs. La route
 * eligibles/liste cherchait aussi f.compagnie_id, colonne inexistante
 * sur factures -- le lien assureur passe par patients.assureur_id,
 * corrige via une jointure.
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

  async function ajouterLignes(client, bordereauId, factureIds, assureurId) {
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
         WHERE assureur_id = $1
           AND date_debut_validite <= CURRENT_DATE
           AND (date_fin_validite IS NULL OR date_fin_validite >= CURRENT_DATE)
         ORDER BY date_debut_validite DESC LIMIT 1`,
        [assureurId]
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

  // Nom d'endpoint inchange (le frontend deja deploye l'appelle tel
  // quel) -- seule la table interrogee change : assureurs, pas
  // compagnies_assurance.
  router.get('/compagnies-assurance', auth, async (req, res) => {
    try {
      const { rows } = await pool.query(`SELECT id, nom, telephone, email FROM assureurs WHERE is_active = true ORDER BY nom`);
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
      if (compagnie_id) { params.push(compagnie_id); clauses.push(`b.assureur_id = $${params.length}`); }

      const { rows } = await pool.query(
        `SELECT b.*, a.nom AS compagnie_nom,
                (SELECT COUNT(*) FROM bordereau_lignes l WHERE l.bordereau_id = b.id) AS nb_lignes
         FROM bordereaux_facturation b
         JOIN assureurs a ON a.id = b.assureur_id
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

  // Une facture n'a pas de lien direct vers un assureur -- le lien
  // passe par le patient (patients.assureur_id). Jointure ajoutee.
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
        `SELECT f.*, p.prenom AS patient_prenom, p.nom AS patient_nom_reel
         FROM "${metaF.name}" f
         JOIN patients p ON p.id = f.patient_id
         WHERE f.clinique_id = $1
           AND p.assureur_id = $2
           AND f."${colDate}" BETWEEN $3 AND $4
           AND NOT EXISTS (SELECT 1 FROM bordereau_lignes l WHERE l.facture_id = f.id)
         ORDER BY f."${colDate}" ASC`,
        [cliniqueId, compagnie_id, periode_debut, periode_fin]
      );
      rows.forEach(r => { r.patient_nom = `${r.patient_prenom||''} ${r.patient_nom_reel||''}`.trim() || null; });
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
            (clinique_id, assureur_id, reference, periode_debut, periode_fin, statut, responsable_id)
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
        `SELECT b.*, a.nom AS compagnie_nom
         FROM bordereaux_facturation b
         JOIN assureurs a ON a.id = b.assureur_id
         WHERE b.id = $1 AND b.clinique_id = $2`,
        [req.params.id, cliniqueId]
      );
      if (!bRes.rows.length) return res.status(404).json({ success: false, message: 'Bordereau introuvable' });

      const lignesRes = await pool.query(
        `SELECT l.*, f.reference AS facture_reference, p.prenom AS patient_prenom, p.nom AS patient_nom
         FROM bordereau_lignes l
         JOIN factures f ON f.id = l.facture_id
         JOIN patients p ON p.id = f.patient_id
         WHERE l.bordereau_id = $1 ORDER BY l.created_at ASC`,
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
        await ajouterLignes(client, req.params.id, facture_ids, bordereau.assureur_id);
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
