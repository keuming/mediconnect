// ============================================================
// MediConnect Africa — routes/assurance.js
// Scope : Offres, souscriptions, tiers-payant
// Auth  : verifyToken (middleware JWT existant)
// ============================================================

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken } = require('../middleware/auth');


// ============================================================
// UTILITAIRE — log audit
// ============================================================

async function logAudit(userId, action, tableName, recordId, changes, req) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id, changes, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId || null,
        action,
        tableName || null,
        recordId || null,
        changes ? JSON.stringify(changes) : null,
        req?.ip || null,
        req?.headers?.['user-agent'] || null
      ]
    );
  } catch (e) {
    console.error('[audit_log error]', e.message);
  }
}


// ============================================================
// PUBLIC — GET /api/assurance/offres
// Liste toutes les offres actives (sans auth)
// ============================================================

router.get('/offres', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        o.id,
        o.nom,
        o.description,
        o.prix_mensuel,
        o.couverture_details,
        o.franchise,
        o.plafond_annuel,
        o.delai_remboursement,
        u.prenom || ' ' || u.nom AS assureur_nom
      FROM offres_assurance o
      JOIN utilisateurs u ON u.id = o.assureur_id
      WHERE o.actif = true
      ORDER BY o.prix_mensuel ASC
    `);
    res.json({ success: true, offres: rows });
  } catch (err) {
    console.error('[GET /offres]', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});


// ============================================================
// PUBLIC — GET /api/assurance/offres/:id
// Détail d'une offre
// ============================================================

router.get('/offres/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        o.*,
        u.prenom || ' ' || u.nom AS assureur_nom,
        u.telephone AS assureur_tel,
        u.email AS assureur_email
      FROM offres_assurance o
      JOIN utilisateurs u ON u.id = o.assureur_id
      WHERE o.id = $1 AND o.actif = true
    `, [req.params.id]);

    if (!rows.length) return res.status(404).json({ error: 'Offre introuvable' });
    res.json({ success: true, offre: rows[0] });
  } catch (err) {
    console.error('[GET /offres/:id]', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});


// ============================================================
// PATIENT — POST /api/assurance/souscrire
// Souscrire à une offre
// ============================================================

router.post('/souscrire', verifyToken, async (req, res) => {
  const { offre_id } = req.body;
  const patientId = req.user.id;

  if (!offre_id) return res.status(400).json({ error: 'offre_id requis' });

  try {
    // Vérifier que l'offre existe et est active
    const offre = await pool.query(
      'SELECT * FROM offres_assurance WHERE id = $1 AND actif = true',
      [offre_id]
    );
    if (!offre.rows.length) return res.status(404).json({ error: 'Offre introuvable ou inactive' });

    // Vérifier pas déjà souscrit et actif
    const existing = await pool.query(
      `SELECT id FROM souscriptions_assurance
       WHERE patient_id = $1 AND offre_id = $2 AND statut IN ('en_attente','active')`,
      [patientId, offre_id]
    );
    if (existing.rows.length) {
      return res.status(409).json({ error: 'Vous avez déjà une souscription active pour cette offre' });
    }

    const { rows } = await pool.query(`
      INSERT INTO souscriptions_assurance (patient_id, offre_id, statut, date_debut)
      VALUES ($1, $2, 'en_attente', CURRENT_DATE)
      RETURNING *
    `, [patientId, offre_id]);

    await logAudit(patientId, 'SOUSCRIPTION_ASSURANCE', 'souscriptions_assurance', rows[0].id, { offre_id }, req);

    // Notification in-app
    await pool.query(`
      INSERT INTO notifications (user_id, type, titre, contenu, reference)
      VALUES ($1, 'in_app', 'Souscription en cours', $2, $3)
    `, [
      patientId,
      `Votre souscription à "${offre.rows[0].nom}" est en cours de traitement.`,
      rows[0].id
    ]);

    res.status(201).json({ success: true, souscription: rows[0] });
  } catch (err) {
    console.error('[POST /souscrire]', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});


// ============================================================
// PATIENT — GET /api/assurance/mes-souscriptions
// Liste des souscriptions du patient connecté
// ============================================================

router.get('/mes-souscriptions', verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        s.id,
        s.statut,
        s.date_debut,
        s.date_fin,
        s.numero_police,
        s.created_at,
        o.nom AS offre_nom,
        o.prix_mensuel,
        o.couverture_details,
        o.plafond_annuel,
        u.prenom || ' ' || u.nom AS assureur_nom
      FROM souscriptions_assurance s
      JOIN offres_assurance o ON o.id = s.offre_id
      JOIN utilisateurs u ON u.id = o.assureur_id
      WHERE s.patient_id = $1
      ORDER BY s.created_at DESC
    `, [req.user.id]);

    res.json({ success: true, souscriptions: rows });
  } catch (err) {
    console.error('[GET /mes-souscriptions]', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});


// ============================================================
// PATIENT — POST /api/assurance/tiers-payant
// Soumettre un dossier tiers-payant
// ============================================================

router.post('/tiers-payant', verifyToken, async (req, res) => {
  const { consultation_id, assureur_id, souscription_id, montant_total, clinique_id } = req.body;
  const patientId = req.user.id;

  if (!assureur_id || !montant_total) {
    return res.status(400).json({ error: 'assureur_id et montant_total requis' });
  }

  try {
    const { rows } = await pool.query(`
      INSERT INTO dossiers_tiers_payant
        (patient_id, clinique_id, assureur_id, consultation_id, souscription_id, montant_total, statut)
      VALUES ($1, $2, $3, $4, $5, $6, 'soumis')
      RETURNING *
    `, [patientId, clinique_id || null, assureur_id, consultation_id || null, souscription_id || null, montant_total]);

    await logAudit(patientId, 'SOUMISSION_TIERS_PAYANT', 'dossiers_tiers_payant', rows[0].id, req.body, req);

    // Notification assureur
    await pool.query(`
      INSERT INTO notifications (user_id, type, titre, contenu, reference)
      VALUES ($1, 'in_app', 'Nouveau dossier tiers-payant', $2, $3)
    `, [
      assureur_id,
      `Nouveau dossier TP reçu — Référence : ${rows[0].reference} — Montant : ${montant_total} FCFA`,
      rows[0].id
    ]);

    res.status(201).json({ success: true, dossier: rows[0] });
  } catch (err) {
    console.error('[POST /tiers-payant]', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});


// ============================================================
// PATIENT — GET /api/assurance/mes-dossiers-tp
// Historique tiers-payant du patient
// ============================================================

router.get('/mes-dossiers-tp', verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        d.*,
        u.prenom || ' ' || u.nom AS assureur_nom
      FROM dossiers_tiers_payant d
      JOIN utilisateurs u ON u.id = d.assureur_id
      WHERE d.patient_id = $1
      ORDER BY d.created_at DESC
    `, [req.user.id]);

    res.json({ success: true, dossiers: rows });
  } catch (err) {
    console.error('[GET /mes-dossiers-tp]', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});


// ============================================================
// ASSUREUR — GET /api/assurance/dossiers-tp
// Liste des dossiers reçus par l'assureur connecté
// ============================================================

router.get('/dossiers-tp', verifyToken, async (req, res) => {
  if (req.user.role !== 'assureur' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès réservé aux assureurs' });
  }

  const { statut } = req.query;

  try {
    let query = `
      SELECT
        d.*,
        u.prenom || ' ' || u.nom AS patient_nom,
        u.telephone AS patient_tel,
        u.email AS patient_email
      FROM dossiers_tiers_payant d
      JOIN utilisateurs u ON u.id = d.patient_id
      WHERE d.assureur_id = $1
    `;
    const params = [req.user.id];

    if (statut) {
      query += ` AND d.statut = $2`;
      params.push(statut);
    }

    query += ` ORDER BY d.created_at DESC`;

    const { rows } = await pool.query(query, params);
    res.json({ success: true, dossiers: rows });
  } catch (err) {
    console.error('[GET /dossiers-tp assureur]', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});


// ============================================================
// ASSUREUR — PATCH /api/assurance/dossiers-tp/:id
// Traiter un dossier (valider / rembourser / rejeter)
// ============================================================

router.patch('/dossiers-tp/:id', verifyToken, async (req, res) => {
  if (req.user.role !== 'assureur' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès réservé aux assureurs' });
  }

  const { statut, montant_pris_en_charge, motif_rejet } = req.body;
  const dossierId = req.params.id;

  const statutsValides = ['en_cours', 'valide', 'rembourse', 'rejete', 'litige'];
  if (!statutsValides.includes(statut)) {
    return res.status(400).json({ error: `Statut invalide. Valeurs : ${statutsValides.join(', ')}` });
  }

  try {
    // Vérifier que le dossier appartient à cet assureur
    const dossier = await pool.query(
      'SELECT * FROM dossiers_tiers_payant WHERE id = $1 AND assureur_id = $2',
      [dossierId, req.user.id]
    );
    if (!dossier.rows.length) return res.status(404).json({ error: 'Dossier introuvable' });

    const montantPatient = montant_pris_en_charge
      ? dossier.rows[0].montant_total - montant_pris_en_charge
      : null;

    const { rows } = await pool.query(`
      UPDATE dossiers_tiers_payant SET
        statut = $1,
        montant_pris_en_charge = COALESCE($2, montant_pris_en_charge),
        montant_patient = COALESCE($3, montant_patient),
        motif_rejet = COALESCE($4, motif_rejet),
        date_validation = CASE WHEN $1 = 'valide' THEN NOW() ELSE date_validation END,
        date_remboursement = CASE WHEN $1 = 'rembourse' THEN NOW() ELSE date_remboursement END
      WHERE id = $5
      RETURNING *
    `, [statut, montant_pris_en_charge || null, montantPatient, motif_rejet || null, dossierId]);

    await logAudit(req.user.id, 'TRAITEMENT_TIERS_PAYANT', 'dossiers_tiers_payant', dossierId, { statut, montant_pris_en_charge }, req);

    // Notification patient
    const messages = {
      valide: `Votre dossier TP ${rows[0].reference} a été validé.`,
      rembourse: `Remboursement de ${montant_pris_en_charge} FCFA effectué pour le dossier ${rows[0].reference}.`,
      rejete: `Votre dossier TP ${rows[0].reference} a été rejeté. Motif : ${motif_rejet || 'Non précisé'}`,
    };

    if (messages[statut]) {
      await pool.query(`
        INSERT INTO notifications (user_id, type, titre, contenu, reference)
        VALUES ($1, 'in_app', 'Mise à jour dossier tiers-payant', $2, $3)
      `, [dossier.rows[0].patient_id, messages[statut], dossierId]);
    }

    res.json({ success: true, dossier: rows[0] });
  } catch (err) {
    console.error('[PATCH /dossiers-tp/:id]', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});


// ============================================================
// ASSUREUR — GET /api/assurance/mes-offres
// Offres publiées par l'assureur connecté
// ============================================================

router.get('/mes-offres', verifyToken, async (req, res) => {
  if (req.user.role !== 'assureur' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès réservé aux assureurs' });
  }

  try {
    const { rows } = await pool.query(`
      SELECT o.*,
        COUNT(s.id) AS nb_souscriptions
      FROM offres_assurance o
      LEFT JOIN souscriptions_assurance s ON s.offre_id = o.id
      WHERE o.assureur_id = $1
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `, [req.user.id]);

    res.json({ success: true, offres: rows });
  } catch (err) {
    console.error('[GET /mes-offres]', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});


// ============================================================
// ASSUREUR — POST /api/assurance/offres
// Créer une nouvelle offre
// ============================================================

router.post('/offres', verifyToken, async (req, res) => {
  if (req.user.role !== 'assureur' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès réservé aux assureurs' });
  }

  const { nom, description, prix_mensuel, couverture_details, franchise, plafond_annuel } = req.body;

  if (!nom || !prix_mensuel) {
    return res.status(400).json({ error: 'nom et prix_mensuel requis' });
  }

  try {
    const { rows } = await pool.query(`
      INSERT INTO offres_assurance
        (assureur_id, nom, description, prix_mensuel, couverture_details, franchise, plafond_annuel)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      req.user.id, nom, description || null, prix_mensuel,
      couverture_details || {}, franchise || 0, plafond_annuel || null
    ]);

    await logAudit(req.user.id, 'CREATE_OFFRE_ASSURANCE', 'offres_assurance', rows[0].id, { nom, prix_mensuel }, req);

    res.status(201).json({ success: true, offre: rows[0] });
  } catch (err) {
    console.error('[POST /offres]', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});


// ============================================================
// ASSUREUR — PATCH /api/assurance/offres/:id
// Modifier ou désactiver une offre
// ============================================================

router.patch('/offres/:id', verifyToken, async (req, res) => {
  if (req.user.role !== 'assureur' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès réservé aux assureurs' });
  }

  const { nom, description, prix_mensuel, couverture_details, franchise, plafond_annuel, actif } = req.body;

  try {
    const { rows } = await pool.query(`
      UPDATE offres_assurance SET
        nom = COALESCE($1, nom),
        description = COALESCE($2, description),
        prix_mensuel = COALESCE($3, prix_mensuel),
        couverture_details = COALESCE($4, couverture_details),
        franchise = COALESCE($5, franchise),
        plafond_annuel = COALESCE($6, plafond_annuel),
        actif = COALESCE($7, actif)
      WHERE id = $8 AND assureur_id = $9
      RETURNING *
    `, [nom, description, prix_mensuel, couverture_details, franchise, plafond_annuel, actif, req.params.id, req.user.id]);

    if (!rows.length) return res.status(404).json({ error: 'Offre introuvable' });

    res.json({ success: true, offre: rows[0] });
  } catch (err) {
    console.error('[PATCH /offres/:id]', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});


// ============================================================
// ASSUREUR — PATCH /api/assurance/souscriptions/:id
// Valider ou suspendre une souscription patient
// ============================================================

router.patch('/souscriptions/:id', verifyToken, async (req, res) => {
  if (req.user.role !== 'assureur' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès réservé aux assureurs' });
  }

  const { statut, date_fin } = req.body;
  const statutsValides = ['active', 'suspendue', 'resiliee'];
  if (!statutsValides.includes(statut)) {
    return res.status(400).json({ error: `Statut invalide. Valeurs : ${statutsValides.join(', ')}` });
  }

  try {
    const { rows } = await pool.query(`
      UPDATE souscriptions_assurance SET
        statut = $1,
        date_fin = COALESCE($2, date_fin),
        date_debut = CASE WHEN $1 = 'active' AND date_debut IS NULL THEN CURRENT_DATE ELSE date_debut END
      WHERE id = $3
      RETURNING *
    `, [statut, date_fin || null, req.params.id]);

    if (!rows.length) return res.status(404).json({ error: 'Souscription introuvable' });

    await logAudit(req.user.id, 'UPDATE_SOUSCRIPTION', 'souscriptions_assurance', rows[0].id, { statut }, req);

    // Notification patient
    const msg = statut === 'active'
      ? `Votre assurance ${rows[0].numero_police} est maintenant active.`
      : statut === 'suspendue'
      ? `Votre assurance ${rows[0].numero_police} a été suspendue.`
      : `Votre assurance ${rows[0].numero_police} a été résiliée.`;

    await pool.query(`
      INSERT INTO notifications (user_id, type, titre, contenu, reference)
      VALUES ($1, 'in_app', 'Mise à jour assurance', $2, $3)
    `, [rows[0].patient_id, msg, rows[0].id]);

    res.json({ success: true, souscription: rows[0] });
  } catch (err) {
    console.error('[PATCH /souscriptions/:id]', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});


module.exports = router;
