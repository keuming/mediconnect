// ============================================================
// MediConnect Africa — routes/business_developer.js
// Scope : Dashboard BD, commissions, recrutements
// Auth  : verifyToken (middleware JWT existant)
// ============================================================

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken } = require('../middleware/auth');


// ============================================================
// MIDDLEWARE — Vérification rôle business_developer ou admin
// ============================================================

function requireBD(req, res, next) {
  if (req.user.role !== 'business_developer' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès réservé aux Business Developers' });
  }
  next();
}


// ============================================================
// GET /api/business-developer/dashboard
// Stats globales du BD connecté
// ============================================================

router.get('/dashboard', verifyToken, requireBD, async (req, res) => {
  const bdId = req.user.id;

  try {
    const [prestataires, commissions, patients] = await Promise.all([

      // Prestataires recrutés actifs
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE is_active = true) AS total_actifs,
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', NOW())) AS ce_mois
        FROM utilisateurs
        WHERE recrute_par = $1
      `, [bdId]),

      // Commissions
      pool.query(`
        SELECT
          SUM(montant) FILTER (WHERE statut = 'payee') AS total_percu,
          SUM(montant) FILTER (WHERE statut = 'en_attente') AS en_attente,
          SUM(montant) FILTER (WHERE statut = 'validee') AS a_percevoir,
          COUNT(*) AS total_transactions
        FROM commissions_bd
        WHERE bd_id = $1
      `, [bdId]),

      // Patients via réseau BD
      pool.query(`
        SELECT COUNT(*) AS total_patients
        FROM commissions_bd
        WHERE bd_id = $1 AND type_commission = 'patient'
      `, [bdId])
    ]);

    res.json({
      success: true,
      dashboard: {
        prestataires: prestataires.rows[0],
        commissions: commissions.rows[0],
        patients: patients.rows[0]
      }
    });
  } catch (err) {
    console.error('[GET /dashboard]', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});


// ============================================================
// GET /api/business-developer/prestataires
// Liste des prestataires recrutés par ce BD
// ============================================================

router.get('/prestataires', verifyToken, requireBD, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        u.id,
        u.prenom,
        u.nom,
        u.email,
        u.telephone,
        u.role,
        u.ville,
        u.pays_code,
        u.is_active,
        u.created_at,
        COALESCE(SUM(c.montant) FILTER (WHERE c.statut = 'payee'), 0) AS commissions_generees
      FROM utilisateurs u
      LEFT JOIN commissions_bd c ON c.prestataire_id = u.id AND c.bd_id = $1
      WHERE u.recrute_par = $1
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `, [req.user.id]);

    res.json({ success: true, prestataires: rows });
  } catch (err) {
    console.error('[GET /prestataires]', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});


// ============================================================
// GET /api/business-developer/commissions
// Historique complet des commissions
// ============================================================

router.get('/commissions', verifyToken, requireBD, async (req, res) => {
  const { statut, type_commission, mois } = req.query;

  try {
    let query = `
      SELECT
        c.*,
        u.prenom || ' ' || u.nom AS prestataire_nom,
        u.role AS prestataire_role,
        u.email AS prestataire_email
      FROM commissions_bd c
      LEFT JOIN utilisateurs u ON u.id = c.prestataire_id
      WHERE c.bd_id = $1
    `;
    const params = [req.user.id];
    let idx = 2;

    if (statut) { query += ` AND c.statut = $${idx++}`; params.push(statut); }
    if (type_commission) { query += ` AND c.type_commission = $${idx++}`; params.push(type_commission); }
    if (mois) { query += ` AND DATE_TRUNC('month', c.created_at) = DATE_TRUNC('month', $${idx++}::date)`; params.push(mois); }

    query += ` ORDER BY c.created_at DESC`;

    const { rows } = await pool.query(query, params);
    res.json({ success: true, commissions: rows });
  } catch (err) {
    console.error('[GET /commissions]', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});


// ============================================================
// GET /api/business-developer/commissions/resume
// Résumé mensuel des commissions
// ============================================================

router.get('/commissions/resume', verifyToken, requireBD, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        DATE_TRUNC('month', created_at) AS mois,
        type_commission,
        COUNT(*) AS nb,
        SUM(montant) AS total_fcfa,
        SUM(montant) FILTER (WHERE statut = 'payee') AS percu,
        SUM(montant) FILTER (WHERE statut = 'en_attente') AS en_attente
      FROM commissions_bd
      WHERE bd_id = $1
      GROUP BY DATE_TRUNC('month', created_at), type_commission
      ORDER BY mois DESC, type_commission
    `, [req.user.id]);

    res.json({ success: true, resume: rows });
  } catch (err) {
    console.error('[GET /commissions/resume]', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});


// ============================================================
// POST /api/business-developer/recruter
// Enregistrer le recrutement d'un prestataire existant
// Body: { prestataire_id }
// ============================================================

router.post('/recruter', verifyToken, requireBD, async (req, res) => {
  const { prestataire_id } = req.body;
  const bdId = req.user.id;

  if (!prestataire_id) {
    return res.status(400).json({ error: 'prestataire_id requis' });
  }

  try {
    // Vérifier que le prestataire existe et n'est pas déjà rattaché
    const prestataire = await pool.query(
      'SELECT id, prenom, nom, role, recrute_par FROM utilisateurs WHERE id = $1',
      [prestataire_id]
    );
    if (!prestataire.rows.length) {
      return res.status(404).json({ error: 'Prestataire introuvable' });
    }
    if (prestataire.rows[0].recrute_par) {
      return res.status(409).json({ error: 'Ce prestataire est déjà rattaché à un Business Developer' });
    }
    if (prestataire.rows[0].role === 'patient' || prestataire.rows[0].role === 'admin') {
      return res.status(400).json({ error: 'Un patient ou admin ne peut pas être recruté' });
    }

    // Rattacher le prestataire au BD
    await pool.query(
      'UPDATE utilisateurs SET recrute_par = $1 WHERE id = $2',
      [bdId, prestataire_id]
    );

    // Créer la commission de recrutement (25 000 FCFA)
    const { rows } = await pool.query(`
      INSERT INTO commissions_bd (bd_id, prestataire_id, type_commission, montant, statut)
      VALUES ($1, $2, 'recrutement', 25000, 'en_attente')
      RETURNING *
    `, [bdId, prestataire_id]);

    // Notification BD
    await pool.query(`
      INSERT INTO notifications (user_id, type, titre, contenu, reference)
      VALUES ($1, 'in_app', 'Nouveau recrutement validé', $2, $3)
    `, [
      bdId,
      `${prestataire.rows[0].prenom} ${prestataire.rows[0].nom} a été rattaché à votre réseau. Commission de 25 000 FCFA en attente.`,
      rows[0].id
    ]);

    res.status(201).json({
      success: true,
      message: 'Prestataire recruté avec succès',
      commission: rows[0]
    });
  } catch (err) {
    console.error('[POST /recruter]', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});


// ============================================================
// GET /api/business-developer/notifications
// Notifications du BD connecté
// ============================================================

router.get('/notifications', verifyToken, requireBD, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `, [req.user.id]);

    res.json({ success: true, notifications: rows });
  } catch (err) {
    console.error('[GET /notifications]', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});


// ============================================================
// ADMIN — POST /api/business-developer/commissions/valider/:id
// Valider et marquer une commission comme payée
// ============================================================

router.patch('/commissions/valider/:id', verifyToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès réservé aux admins' });
  }

  const { statut, reference_paiement } = req.body;
  const statutsValides = ['validee', 'payee', 'annulee'];
  if (!statutsValides.includes(statut)) {
    return res.status(400).json({ error: `Statut invalide. Valeurs : ${statutsValides.join(', ')}` });
  }

  try {
    const { rows } = await pool.query(`
      UPDATE commissions_bd SET
        statut = $1,
        reference_paiement = COALESCE($2, reference_paiement)
      WHERE id = $3
      RETURNING *
    `, [statut, reference_paiement || null, req.params.id]);

    if (!rows.length) return res.status(404).json({ error: 'Commission introuvable' });

    // Notifier le BD
    if (statut === 'payee') {
      await pool.query(`
        INSERT INTO notifications (user_id, type, titre, contenu, reference)
        VALUES ($1, 'in_app', 'Commission payée', $2, $3)
      `, [
        rows[0].bd_id,
        `Votre commission de ${rows[0].montant} FCFA a été payée. Référence : ${reference_paiement || 'N/A'}`,
        rows[0].id
      ]);
    }

    res.json({ success: true, commission: rows[0] });
  } catch (err) {
    console.error('[PATCH /commissions/valider/:id]', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});


module.exports = router;
