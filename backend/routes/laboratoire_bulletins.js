// backend/routes/laboratoire_bulletins.js
// Dashboard laboratoire : dépôt de bulletins retrouvés par code_secret patient.
// Le labo saisit un résultat déjà pret -> statut 'traite' directement,
// pas de notion de "demande en attente de traitement" a ce stade.
const router = require('express').Router();
const { db }  = require('../config/db');
const { auth } = require('../middleware/auth');

function requireLaboratoire(req, res, next) {
  if (!req.user?.laboratoire_id) {
    return res.status(403).json({ success: false, message: 'Compte non rattaché à un laboratoire' });
  }
  next();
}

// GET /api/laboratoire/dashboard — compteurs pour le tableau de bord
router.get('/dashboard', auth, requireLaboratoire, async (req, res) => {
  const lid = req.user.laboratoire_id;
  try {
    const r = await db(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE statut = 'en_attente') AS en_attente,
         COUNT(*) FILTER (WHERE statut = 'traite')     AS traites
       FROM resultats_labo WHERE labo_id = $1`,
      [lid]
    );
    const row = r.rows[0] || {};
    res.json({ success: true, data: {
      bulletins_recus: +row.total     || 0,
      en_attente:      +row.en_attente || 0,
      traites:         +row.traites    || 0,
    }});
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET /api/laboratoire/bulletins — historique des envois de CE labo
// (remplace l'ancien menu "Demandes reçues" : plus de file d'attente,
// juste ce que ce labo a lui-meme depose).
router.get('/bulletins', auth, requireLaboratoire, async (req, res) => {
  const lid = req.user.laboratoire_id;
  try {
    const r = await db(
      `SELECT rl.*, p.prenom, p.nom, p.code_secret
         FROM resultats_labo rl
         LEFT JOIN patients p ON p.id = rl.patient_id
        WHERE rl.labo_id = $1
        ORDER BY rl.created_at DESC LIMIT 100`,
      [lid]
    );
    res.json({ success: true, data: r.rows });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST /api/laboratoire/bulletins — dépôt d'un bulletin.
// Le patient est retrouvé par son code_secret (pas de "demande" a
// resoudre au prealable) -- correspondance exacte, jamais approximative.
router.post('/bulletins', auth, requireLaboratoire, async (req, res) => {
  const { code_patient, type_analyse, valeurs, interpretation, fichier_url, date_prelevement } = req.body;
  if (!code_patient || !type_analyse) {
    return res.status(400).json({ success: false, message: "Code patient et type d'analyse requis" });
  }
  try {
    const patient = await db(
      'SELECT id, prenom, nom FROM patients WHERE UPPER(code_secret) = UPPER($1) LIMIT 1',
      [code_patient.trim()]
    );
    if (!patient.rows.length) {
      return res.status(404).json({ success: false, message: 'Aucun patient avec ce code' });
    }
    const p = patient.rows[0];

    const r = await db(
      `INSERT INTO resultats_labo
         (id, patient_id, labo_id, type_analyse, valeurs, interpretation, fichier_url, date_prelevement, statut)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, COALESCE($7, CURRENT_DATE), 'traite')
       RETURNING *`,
      [p.id, req.user.laboratoire_id, type_analyse,
       valeurs ? JSON.stringify(valeurs) : null,
       interpretation || null, fichier_url || null, date_prelevement || null]
    );

    res.status(201).json({
      success: true,
      data: { ...r.rows[0], patient: { prenom: p.prenom, nom: p.nom } },
      message: `Bulletin enregistré pour ${p.prenom} ${p.nom}`,
    });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
