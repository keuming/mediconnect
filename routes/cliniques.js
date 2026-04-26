// ── routes/cliniques.js ──────────────────────────────────────────
const router = require('express').Router();
const { query } = require('../config/db');
const { auth, authorize } = require('../middleware/auth');
const { v4: uuid } = require('uuid');

// GET /api/cliniques/moi — dashboard de la clinique connectée
router.get('/moi', auth, authorize('clinique'), async (req, res) => {
  try {
    const cl = await query(
      'SELECT c.*, u.telephone, u.ville, u.quartier, u.adresse, u.email FROM cliniques c JOIN utilisateurs u ON u.id=c.user_id WHERE c.user_id=$1',
      [req.user.id]
    );
    if (!cl.rows.length) return res.status(404).json({ success: false, message: 'Clinique introuvable' });
    res.json({ success: true, data: cl.rows[0] });
  } catch (err) { res.status(500).json({ success: false, message: 'Erreur' }); }
});

// GET /api/cliniques/stats
router.get('/stats', auth, authorize('clinique'), async (req, res) => {
  try {
    const cl = await query('SELECT id FROM cliniques WHERE user_id=$1', [req.user.id]);
    if (!cl.rows.length) return res.json({ success: true, data: {} });
    const cid = cl.rows[0].id;

    const [rdvCount, medecinCount, stockAlerts, dossierRejetes] = await Promise.all([
      query("SELECT COUNT(*) FROM rendez_vous WHERE clinique_id=$1 AND date_rdv=CURRENT_DATE", [cid]),
      query("SELECT COUNT(*) FROM medecins WHERE clinique_id=$1 AND statut!='Congé'", [cid]),
      query("SELECT COUNT(*) FROM stock_clinique WHERE clinique_id=$1 AND quantite<seuil_alerte", [cid]),
      query("SELECT COUNT(*) FROM dossiers_assurance WHERE clinique_id=$1 AND statut='rejete'", [cid]),
    ]);

    res.json({ success: true, data: {
      rdv_today:      +rdvCount.rows[0].count,
      medecins_actifs: +medecinCount.rows[0].count,
      stock_alertes:  +stockAlerts.rows[0].count,
      dossiers_rejetes: +dossierRejetes.rows[0].count,
    }});
  } catch (err) { res.status(500).json({ success: false, message: 'Erreur' }); }
});

module.exports = router;
