const router = require('express').Router();
const { query } = require('../config/db');
const { auth, authorize } = require('../middleware/auth');

// GET /api/patients — liste tous les patients (admin)
router.get('/', auth, async (req, res) => {
  try {
    const result = await query(
      `SELECT p.id, p.code_secret, p.groupe_sanguin, p.sexe, p.date_naissance,
              u.email, u.prenom, u.nom, u.telephone, u.ville, u.created_at, u.is_active
       FROM patients p
       JOIN utilisateurs u ON u.id = p.user_id
       ORDER BY u.created_at DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Erreur patients:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/patients/profil — profil du patient connecté
router.get('/profil', auth, authorize('patient'), async (req, res) => {
  try {
    const result = await query(
      `SELECT p.*, u.email, u.prenom, u.nom, u.telephone, u.ville, u.pays_code
       FROM patients p JOIN utilisateurs u ON u.id=p.user_id WHERE p.user_id=$1`,
      [req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Profil introuvable' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { res.status(500).json({ success: false, message: 'Erreur' }); }
});

// GET /api/patients/rdvs — RDV du patient connecté
router.get('/rdvs', auth, authorize('patient'), async (req, res) => {
  try {
    const result = await query(
      `SELECT r.*, c.nom as clinique_nom, m.prenom as medecin_prenom, m.nom as medecin_nom
       FROM rendez_vous r
       LEFT JOIN cliniques c ON c.id = r.clinique_id
       LEFT JOIN medecins m ON m.id = r.medecin_id
       WHERE r.patient_id = (SELECT id FROM patients WHERE user_id=$1)
       ORDER BY r.date_rdv DESC, r.heure_rdv DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) { res.status(500).json({ success: false, message: 'Erreur' }); }
});

// GET /api/patients/ordonnances
router.get('/ordonnances', auth, authorize('patient'), async (req, res) => {
  try {
    const result = await query(
      `SELECT o.*, m.prenom as medecin_prenom, m.nom as medecin_nom
       FROM ordonnances o
       LEFT JOIN medecins m ON m.id = o.medecin_id
       WHERE o.patient_id = (SELECT id FROM patients WHERE user_id=$1)
       ORDER BY o.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) { res.status(500).json({ success: false, message: 'Erreur' }); }
});

// GET /api/patients/consultations
router.get('/consultations', auth, authorize('patient'), async (req, res) => {
  try {
    const result = await query(
      `SELECT c.*, m.prenom as medecin_prenom, m.nom as medecin_nom, cl.nom as clinique_nom
       FROM consultations c
       LEFT JOIN medecins m ON m.id = c.medecin_id
       LEFT JOIN cliniques cl ON cl.id = c.clinique_id
       WHERE c.patient_id = (SELECT id FROM patients WHERE user_id=$1)
       ORDER BY c.date_consult DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) { res.status(500).json({ success: false, message: 'Erreur' }); }
});

module.exports = router;
