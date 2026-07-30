'use strict';

/**
 * routes/factures-auto.js — MediConnect Africa / CSN
 *
 * Montage dans server.js :
 *   const facturesAuto = require('./routes/factures-auto');
 *   app.use('/api', facturesAuto(pool, authMiddleware));
 *
 * Routes :
 *   POST /api/consultations/:id/facture      -> genere (idempotent)
 *   GET  /api/consultations/:id/facture      -> recupere facture + lignes
 *   POST /api/consultations/:id/facture?force=1 -> regenere
 */

const express = require('express');
const { withTransaction, resolveTable, pickColumn } = require('../helpers/dbIntrospect');
const { genererFactureConsultation } = require('../services/factureAuto');

module.exports = function facturesAutoRoutes(pool, auth) {
  const router = express.Router();

  // Si le middleware d'auth passe undefined (mauvais nom de variable au
  // montage), Express leve au chargement et TOUT le backend tombe. On
  // isole la panne sur ces deux routes : le reste de l'API survit et le
  // log Vercel dit exactement quoi corriger.
  if (typeof auth !== 'function') {
    console.error(
      '[facture-auto] MONTAGE INVALIDE : le 2e argument doit etre le middleware ' +
      "d'authentification, recu : " + typeof auth + '. Routes desactivees.'
    );
    auth = (req, res) => res.status(500).json({
      success: false,
      code: 'AUTH_MIDDLEWARE_MANQUANT',
      message: "Routes facturation mal montees dans server.js : middleware d'auth absent",
    });
  }

  router.post('/consultations/:id/facture', auth, async (req, res) => {
    try {
      const resultat = await withTransaction(pool, (client) =>
        genererFactureConsultation(client, {
          consultationId: req.params.id,
          cliniqueId: req.user?.clinique_id || req.body.clinique_id,
          utilisateurId: req.user?.id,
          actes: req.body.actes,
          taux: req.body.taux,
          force: req.query.force === '1' || req.body.force === true,
        })
      );
      return res.status(resultat.deja_existante ? 200 : 201).json({
        success: true,
        deja_existante: resultat.deja_existante,
        data: resultat.facture,
        lignes: resultat.lignes,
        totaux: resultat.totaux,
      });
    } catch (e) {
      const status = e.status || (e.code === 'SCHEMA_MISMATCH' ? 500 : 400);
      console.error('[facture-auto]', e.code || '', e.message, e.missing || '');
      return res.status(status).json({
        success: false,
        code: e.code || 'ERREUR',
        message: e.message,
        colonnes_manquantes: e.missing,
      });
    }
  });

  router.get('/consultations/:id/facture', auth, async (req, res) => {
    const client = await pool.connect();
    try {
      const metaF = await resolveTable(client, ['factures', 'facture']);
      if (!metaF) {
        return res.status(500).json({ success: false, message: 'Table factures introuvable' });
      }
      const colConsult = pickColumn(metaF, ['consultation_id']);
      const { rows } = await client.query(
        `SELECT * FROM "${metaF.name}" WHERE "${colConsult}" = $1 LIMIT 1`,
        [req.params.id]
      );
      if (!rows[0]) {
        return res.status(404).json({ success: false, message: 'Aucune facture pour cette consultation' });
      }

      let lignes = [];
      const metaL = await resolveTable(client, [
        'facture_lignes', 'factures_lignes', 'lignes_facture', 'facture_details',
      ]);
      if (metaL) {
        const r = await client.query(
          `SELECT * FROM "${metaL.name}" WHERE "facture_id" = $1`,
          [rows[0].id]
        );
        lignes = r.rows;
      }
      return res.json({ success: true, data: rows[0], lignes });
    } catch (e) {
      console.error('[facture-auto GET]', e.message);
      return res.status(500).json({ success: false, message: e.message });
    } finally {
      client.release();
    }
  });

  return router;
};

/* ==================================================================
   HOOK — a coller dans la route qui cloture la consultation.
   La facture est generee DANS la meme transaction : si l'insert
   echoue, la cloture est annulee. Aucune consultation terminee ne
   reste sans facture.

   Exemple (routes/consultations.js) :

   const { genererFactureConsultation } = require('../services/factureAuto');
   const { withTransaction } = require('../helpers/dbIntrospect');

   router.put('/consultations/:id/terminer', auth, async (req, res) => {
     try {
       const out = await withTransaction(pool, async (client) => {
         await client.query(
           `UPDATE consultations SET statut = 'terminee' WHERE id = $1`,
           [req.params.id]
         );
         let facture = null, avertissement = null;
         try {
           const r = await genererFactureConsultation(client, {
             consultationId: req.params.id,
             cliniqueId: req.user?.clinique_id,
             utilisateurId: req.user?.id,
           });
           facture = r.facture;
         } catch (e) {
           // AUCUN_ACTE ne doit pas bloquer la cloture : consultation
           // sans acte chiffre = pas de facture, mais la cloture passe.
           if (e.code !== 'AUCUN_ACTE') throw e;
           avertissement = e.message;
         }
         return { facture, avertissement };
       });
       return res.json({ success: true, ...out });
     } catch (e) {
       return res.status(e.status || 500).json({ success: false, message: e.message });
     }
   });
   ================================================================== */
